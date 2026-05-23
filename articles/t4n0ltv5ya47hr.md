---
title: "GitHub ActionsとAWS OIDCでキーレスデプロイを実現する"
emoji: "🔑"
type: "tech"
topics: ["GitHubActions", "AWS", "セキュリティ"]
published: false
---

:::message
この記事は [taka-techblog](https://taka-techblog.com/blog/github-actions-oidc-aws?utm_source=zenn&utm_medium=referral) にも掲載しています。
:::

## アクセスキーをSecretsに入れるのは怖い

このブログのデプロイ（GitHub Actions→S3→CloudFront）を実装するとき、最初に直面した問題が「どうやってAWS認証するか」でした。

一般的な方法は `AWS_ACCESS_KEY_ID` と `AWS_SECRET_ACCESS_KEY` をGitHub Secretsに保存することです。でも、これにはいくつかのリスクがあります：

- リポジトリの設定が漏洩した場合、長期的な認証情報が流出する
- キーのローテーション管理が必要
- 誰がどのキーを使っているか管理が煩雑

OIDC（OpenID Connect）認証を使えば、**長期的なアクセスキーが不要**になります。

## OIDCの仕組み

```
GitHub Actions → GitHubのOIDCプロバイダー → IDトークン発行
                                                    ↓
                                             AWS STS（一時認証情報）
                                                    ↓
                                             IAMロールを一時取得
                                                    ↓
                                             S3/CloudFrontへの操作
```

GitHubが発行した一時的なIDトークンをAWS STSに渡し、事前に設定したIAMロールを取得します。この一時的な認証情報は短命（デフォルト1時間）なので、漏洩しても影響が限定的です。

## AWS側の設定

### 1. IDプロバイダーの登録

AWSコンソールの「IAM→IDプロバイダー」から、GitHubのOIDCプロバイダーを追加します。

```
プロバイダーのURL: https://token.actions.githubusercontent.com
対象者: sts.amazonaws.com
```

### 2. IAMロールの作成

信頼ポリシーに「どのGitHubリポジトリからのリクエストを許可するか」を設定します。

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Principal": {
        "Federated": "arn:aws:iam::123456789012:oidc-provider/token.actions.githubusercontent.com"
      },
      "Action": "sts:AssumeRoleWithWebIdentity",
      "Condition": {
        "StringEquals": {
          "token.actions.githubusercontent.com:aud": "sts.amazonaws.com"
        },
        "StringLike": {
          "token.actions.githubusercontent.com:sub": "repo:takashi-endo/taka-techblog:*"
        }
      }
    }
  ]
}
```

`StringLike` の `sub` を `repo:オーナー名/リポジトリ名:*` にすることで、指定リポジトリのみに制限できます。特定ブランチ（`ref:refs/heads/main`）や環境に絞ることも可能です。

### 3.必要なポリシーをアタッチ

このブログではS3 + CloudFrontが必要なので、最小権限の原則で絞ります：

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Action": [
        "s3:PutObject",
        "s3:DeleteObject",
        "s3:ListBucket"
      ],
      "Resource": [
        "arn:aws:s3:::my-blog-bucket",
        "arn:aws:s3:::my-blog-bucket/*"
      ]
    },
    {
      "Effect": "Allow",
      "Action": [
        "cloudfront:CreateInvalidation"
      ],
      "Resource": "arn:aws:cloudfront::123456789012:distribution/DISTRIBUTION_ID"
    }
  ]
}
```

## GitHub Actions側の設定

### ワークフローファイル

```yaml
name: Deploy to AWS

on:
  push:
    branches: [main]

permissions:
  id-token: write   # OIDCトークンの発行に必要
  contents: read

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - name: Configure AWS credentials via OIDC
        uses: aws-actions/configure-aws-credentials@v4
        with:
          role-to-assume: ${{ secrets.AWS_ROLE_ARN }}
          aws-region: ap-northeast-1

      - name: Install dependencies
        run: npm ci

      - name: Build
        run: npm run build

      - name: Deploy to S3 (JS/CSS with immutable cache)
        run: |
          aws s3 sync dist/_astro s3://${{ secrets.S3_BUCKET }}/_astro \
            --cache-control "max-age=31536000,immutable" \
            --delete

      - name: Deploy to S3 (HTML with no-cache)
        run: |
          aws s3 sync dist/ s3://${{ secrets.S3_BUCKET }}/ \
            --cache-control "max-age=0,no-cache" \
            --exclude "_astro/*" \
            --delete

      - name: Invalidate CloudFront cache
        run: |
          aws cloudfront create-invalidation \
            --distribution-id ${{ secrets.CLOUDFRONT_DISTRIBUTION_ID }} \
            --paths "/*"
```

`id-token: write` のpermissions設定が必要な点がハマりポイントです。これがないとOIDCトークンが発行されず、認証エラーになります。

## AWS CDKでIDプロバイダーとロールを管理する

このブログのインフラはAWS CDKで管理しています。OIDCの設定もコードで書けます：

```typescript
import * as iam from 'aws-cdk-lib/aws-iam';

// GitHubのOIDCプロバイダー
const githubProvider = new iam.OpenIdConnectProvider(this, 'GithubOidcProvider', {
  url: 'https://token.actions.githubusercontent.com',
  clientIds: ['sts.amazonaws.com'],
});

// デプロイ用IAMロール
const deployRole = new iam.Role(this, 'GithubActionsDeployRole', {
  assumedBy: new iam.WebIdentityPrincipal(
    githubProvider.openIdConnectProviderArn,
    {
      StringLike: {
        'token.actions.githubusercontent.com:sub':
          'repo:takashi-endo/taka-techblog:*',
      },
      StringEquals: {
        'token.actions.githubusercontent.com:aud': 'sts.amazonaws.com',
      },
    }
  ),
});

// 必要な権限だけ付与
bucket.grantReadWrite(deployRole);
distribution.grantCreateInvalidation(deployRole);
```

インフラがコードで管理されているので、IAMロールの変更も `cdk deploy` で完結します。

## 設定して気づいたポイント

1. **`permissions: id-token: write` を忘れない** — ワークフローレベルでないとジョブレベルでも動かないことがある
2. **`sub` の条件は厳しくする** — ワイルドカードを広げすぎると他リポジトリからの利用を許してしまう
3. **ロールの最大セッション時間** — デフォルト1時間。長いデプロイは調整が必要
4. **リージョンの一致** —IAMはグローバルだが `aws-region` の設定が必要

## まとめ

OIDCを使ったキーレスデプロイは、一度設定してしまえば管理コストがほぼゼロになります。アクセスキーのローテーション作業がなくなり、「キーが漏れていないか」という心理的な不安もなくなりました。

新規プロジェクトではOIDC認証を最初から選ぶことをお勧めします。

- `permissions: id-token: write` が必要
- IAMロールの信頼ポリシーでリポジトリを指定
- 付与する権限は最小限に
- CDKでもコード管理できる

---

他の記事も読む → [taka-techblog.com](https://taka-techblog.com?utm_source=zenn&utm_medium=referral)
X でも発信中 → [@taka_tech1988](https://x.com/taka_tech1988)
