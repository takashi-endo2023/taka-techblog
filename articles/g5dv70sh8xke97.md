---
title: "AWSのIAM設計を正しく理解する——最小権限の原則と実務での落とし穴"
emoji: "🔐"
type: "tech"
topics: ["AWS","セキュリティ"]
published: true
published_at: "2026-09-17 09:00"
canonical_url: "https://www.taka-techblog.com/blog/aws-iam-least-privilege"
---

:::message
この記事は [taka-techblog](https://www.taka-techblog.com/blog/aws-iam-least-privilege?utm_source=zenn&utm_medium=referral) にも掲載しています。
:::



AWSの権限管理は「なんとなく動けばいい」で済ませると、後から必ず痛い目に遭う。私自身、テックリードとして複数のプロジェクトでIAM設計に関わってきたが、初期に雑に作った権限が数ヶ月後にセキュリティレビューで引っかかる、というケースを何度も目にした。

このブログ自体もAstro + S3 + CloudFrontで構築しており、GitHub ActionsからS3にデプロイするためのIAMロール設計は自分で行った。その実体験も交えながら、IAMの設計原則と実務での落とし穴を整理する。

## 最小権限の原則とは何か

IAMの基本思想は**最小権限の原則（Principle of Least Privilege）**だ。「必要な操作だけを、必要なリソースにのみ許可する」というシンプルな考え方だが、これを徹底するのは意外と難しい。

よくある間違いは「とりあえず`AdministratorAccess`をつけておく」パターンだ。開発初期の動作確認には楽だが、そのまま本番環境に持ち込まれると大惨事になる。

最小権限を実現するには次の問いを常に意識する。

- **誰が（Who）**: ユーザー・ロール・サービスのどれか
- **何を（What）**: どのアクション（`s3:PutObject`など）か
- **どこに（Where）**: 特定のリソースARNか、全体か

## IAMの3要素——ユーザー・グループ・ロールの使い分け

### IAMユーザー

実在する人間または長期的なアクセスキーが必要なシステムに使う。ただし、**アクセスキーの管理コストが高い**ため、可能な限り使用を避ける方向にシフトしている。

- コンソールログインするオペレーター向け
- レガシーシステムとの連携（ロールを使えない場合）

現在の主流は「ルートアカウントは封印、管理者もIAMユーザー+MFAで運用」だ。

### IAMグループ

IAMユーザーをまとめて管理するための仕組み。チームの役割（開発者・閲覧者・DBアドミンなど）ごとにグループを作り、ポリシーをグループに付与する。

```json
{
  "GroupName": "developers",
  "Policies": [
    "ReadOnlyAccess",
    "AmazonS3ReadOnlyAccess"
  ]
}
```

個人にポリシーを直接付けると「誰が何の権限を持っているか」が追いにくくなる。グループ経由で管理するだけで、権限の棚卸しが格段に楽になる。

### IAMロール

**AWSサービスやアプリケーション、フェデレーションユーザーが使う**もので、長期的なアクセスキーを発行しないのが最大の利点だ。

私がこのブログのデプロイで使ったのもこの方式だ。GitHub ActionsからOIDC（OpenID Connect）でAWSに認証し、一時的な認証情報でS3にアップロードする。アクセスキーをGitHub Secretsに置かなくて済むため、鍵の漏洩リスクがゼロになる。

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
          "token.actions.githubusercontent.com:sub": "repo:myorg/myrepo:*"
        }
      }
    }
  ]
}
```

## インラインポリシーvsマネージドポリシー

ポリシーには「インラインポリシー」と「マネージドポリシー」の2種類がある。

| 種類 | 特徴 | 向いているケース |
|---|---|---|
| AWSマネージドポリシー | AWSが管理・更新する | 汎用的な権限セット |
| カスタマーマネージドポリシー | 自分で作成・管理する | 細かい制御が必要な場合 |
| インラインポリシー | ロール/ユーザーに直接埋め込む | 特定エンティティ専用の権限 |

チームで運用するなら**カスタマーマネージドポリシーを中心に使う**のがベストプラクティスだ。再利用しやすく、変更履歴も追いやすい。インラインポリシーは「このロールだけに絶対に使わせたい」ときに限定する。

## 実務で踏んだ落とし穴

### 落とし穴1：リソースARNを`*`にしてしまう

S3バケットへの書き込みを許可するとき、急いでいると次のように書いてしまいがちだ。

```json
{
  "Effect": "Allow",
  "Action": "s3:PutObject",
  "Resource": "*"
}
```

これはアカウント内の**全バケット**への書き込みを許可してしまう。正しくは特定バケットのARNを指定する。

```json
{
  "Effect": "Allow",
  "Action": [
    "s3:PutObject",
    "s3:DeleteObject"
  ],
  "Resource": "arn:aws:s3:::my-blog-bucket/*"
}
```

### 落とし穴2：CloudFrontのInvalidation権限を忘れる

S3にアップロードする権限だけ付与して「なんでキャッシュが更新されないんだ」と15分悩んだことがある。CloudFrontのキャッシュ無効化には別途`cloudfront:CreateInvalidation`が必要だ。

```bash
# デプロイ後にキャッシュを無効化するCLIコマンド
aws cloudfront create-invalidation \
  --distribution-id EXXXXXXXXXX \
  --paths "/*"
```

### 落とし穴3：権限の棚卸しをしない

プロジェクト初期に仮で付けた広めの権限が、リリース後もそのまま残るケースは多い。四半期に一度は**IAM Access Analyzerで未使用の権限を確認**する習慣をつけると良い。

```bash
# アクセスアナライザーでの未使用権限確認
aws accessanalyzer list-findings \
  --analyzer-arn arn:aws:access-analyzer:ap-northeast-1:123456789012:analyzer/my-analyzer
```

## 規制産業でのIAM設計——監査で「誰が何をできるか」を説明できるか

医療系スタートアップで外部の品質保証（QA）監査を受けたとき、IAMの設計について詳しく問われた経験がある。

「このIAMロールに付与されている権限の根拠を説明してください」

最初に監査員に聞かれたとき、正直に言うと即答できなかった。開発初期にとりあえず広めの権限を付けた箇所が残っていて、「なぜこの権限が必要か」の説明資料がなかった。

それ以来、IAMポリシーを変更するたびに「この権限が必要な理由」をCDKコードのコメントとして残す運用にした。

```typescript
// EDCからのデータ取り込みLambda用ロール
// S3バケットへの書き込みのみ許可（読み取り・削除は不要）
// RDSへの接続はSecretsManager経由のみ（直接認証情報の環境変数保存を禁止）
const importLambdaRole = new iam.Role(this, 'ImportLambdaRole', {
  assumedBy: new iam.ServicePrincipal('lambda.amazonaws.com'),
});
```

もうひとつ痛感したのが「人員退職時の権限剥奪」だ。モニタリング担当者が離職したにもかかわらず、IAMユーザーが3ヶ月後まで残っていたことがあった。外部監査で「不要なアクセス権が残存している」として是正指摘を受けた。

それ以来、IAM Access Analyzerの未使用アクセス検出を月次で確認し、退職者アカウントを即日削除するチェックリストを作った。セキュリティ上の問題であると同時に、規制対応（21 CFR Part 11相当）としても必須の運用だと理解した。

## まとめ

IAM設計のポイントをまとめると次のとおりだ。

- **人間はグループ経由で管理**し、ポリシーを個人に直接付けない
- **サービス間の連携はロール+OIDC**でアクセスキーを排除する
- **ResourceのARNは絶対に絞る**——`*`は一時的な調査用にとどめる
- **インラインポリシーより再利用可能なマネージドポリシー**を優先する
- **定期的にAccess Analyzerで棚卸し**する

IAMは「設計の質がそのままセキュリティリスクに直結する」レイヤーだ。面倒でも最初から正しく設計しておくほうが、後の修正コストより絶対に安い。

IAMと合わせて設計すべきなのがネットワーク層だ。どのリソースをどのサブネットに置くか、セキュリティグループをどう構成するかについては[AWS VPCのサブネット設計を理解する——パブリック・プライベートの分け方とセキュリティ設定](/blog/aws-vpc-subnet-design)で整理している。

---

他の記事も読む → [taka-techblog.com](https://www.taka-techblog.com?utm_source=zenn&utm_medium=referral)
X でも発信中 → [@_taka_tech](https://x.com/_taka_tech)
