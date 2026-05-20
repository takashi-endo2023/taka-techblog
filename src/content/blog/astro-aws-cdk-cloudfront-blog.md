---
title: "AstroとAWS CDK + CloudFrontで技術ブログを構築した話"
description: "WordPressからモダンなSSGアーキテクチャへ移行し、月額コストを約600円→120円に削減。AWS CDKによるIaC・OIDC認証・CloudFrontキャッシュ戦略まで一貫して自前実装した記録。"
pubDate: "2025-10-28"
tags: ["Astro", "AWS", "AWS CDK", "DevOps", "GitHub Actions"]
---

## なぜWordPressをやめたのか

さくらのレンタルサーバーで運用していたWordPressブログには、いくつかの課題がありました。

- **固定費**: DBサーバーを含む費用が月額約600円
- **パフォーマンス**: PHPのサーバーサイドレンダリングによるTTFTの遅さ
- **メンテナンスコスト**: WordPressコア・プラグインの更新管理
- **DevOpsスキルのアピール不足**: インフラをコードで管理していない

これらを一気に解決するため、**Astro SSG + AWS S3 + CloudFront + AWS CDK** の構成へ移行しました。AstroもAWS CDKも今回が初挑戦です。

## アーキテクチャの全体像

```
GitHub → GitHub Actions → S3 → CloudFront → ユーザー
             ↑ OIDC認証（キーレス）
```

コードをmainブランチにpushするだけで、自動ビルドからデプロイまで完結します。

## AWS CDKでインフラをコード管理する

最大のこだわりは**インフラをAWS CDK（TypeScript）で完全管理すること**です。HCL（Terraform）ではなくTypeScriptで書けるので、普段の開発言語と統一できる点が気に入っています。

```typescript
// lib/blog-stack.ts
const bucket = new s3.Bucket(this, 'BlogBucket', {
  blockPublicAccess: s3.BlockPublicAccess.BLOCK_ALL,
  removalPolicy: cdk.RemovalPolicy.RETAIN,
});

const distribution = new cloudfront.Distribution(this, 'BlogDistribution', {
  defaultBehavior: {
    origin: origins.S3BucketOrigin.withOriginAccessControl(bucket),
    viewerProtocolPolicy: cloudfront.ViewerProtocolPolicy.REDIRECT_TO_HTTPS,
    compress: true,
  },
  domainNames: [process.env.DOMAIN_NAME!],
  certificate,
  defaultRootObject: 'index.html',
});
```

S3バケットは**完全プライベート**に設定し、CloudFront OAC（Origin Access Control）経由でのみアクセスを許可します。S3のURLを直接叩いてもアクセスできない安全な構成です。

CDKを初めて使ってみて最初に詰まったのは `cdk bootstrap` の存在を知らなかったことと、ACM証明書を `us-east-1` で作らないといけないというCloudFrontの制約です。この辺は別記事で詳しく書きます。

## OIDC認証でキーレスデプロイを実現

従来のGitHub Actionsでは、AWSアクセスキーをSecretsに保存する必要がありました。しかしこのアプローチには問題があります：

- リポジトリが漏洩した際の認証情報流出リスク
- キーのローテーション管理が必要

**OIDC（OpenID Connect）認証**を使えば、これらの問題をゼロにできます。

```yaml
- name: Configure AWS credentials via OIDC
  uses: aws-actions/configure-aws-credentials@v4
  with:
    role-to-assume: ${{ secrets.AWS_ROLE_ARN }}
    aws-region: ap-northeast-1
```

GitHubが発行した一時的なIDトークンをAWS STSと交換することで、**長期的なアクセスキーなし**でデプロイが可能です。

## CloudFrontキャッシュ戦略

Astroのビルド成果物は2種類に分けてキャッシュ設定します：

| ファイル | Cache-Control | 理由 |
|---|---|---|
| `_astro/*`（JS・CSS） | `max-age=31536000,immutable` | ハッシュ付きファイル名のため1年キャッシュしても安全 |
| `*.html` | `max-age=0,no-cache` | デプロイ後即時反映のため |

```bash
# JS/CSS は immutable キャッシュ
aws s3 sync dist/_astro s3://$BUCKET/_astro \
  --cache-control "max-age=31536000,immutable"

# HTML は no-cache
aws s3 sync dist/ s3://$BUCKET/ \
  --cache-control "max-age=0,no-cache" \
  --exclude "_astro/*"
```

## コスト比較

| 項目 | WordPress（さくら） | Astro（AWS） |
|---|---|---|
| サーバー | ~500円/月 | S3: ~10円/月 |
| CDN | なし | CloudFront: ~20〜50円/月 |
| ドメイン | ~100円/月 | Route 53: ~60円/月 |
| **合計** | **~600円/月** | **~90〜120円/月** |

## まとめ

Astro + AWS CDKの構成に移行したことで、以下を一挙に実現できました：

1. **固定費の削減**: 月600円 → 約120円（約80%削減）
2. **パフォーマンス向上**: Astro SSG + CloudFront CDNでCore Web Vitalsが大幅改善
3. **DevOpsスキルの可視化**: CDKのTypeScriptコードがそのままポートフォリオになるIaC管理
4. **セキュリティ強化**: S3パブリック非公開・OIDC認証・OAC配信

AstroもCDKも初挑戦でしたが、どちらもTypeScriptで書けるため思った以上にスムーズでした。「なぜこの技術を選んだか」を言語化できる設計判断こそが、エンジニアとしての市場価値につながると考えています。
