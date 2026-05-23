---
title: "AstroとAWS CDK + CloudFrontで技術ブログを構築した話"
description: "放置していたWordPressブログを、AIが面倒を減らしてくれたから再挑戦できた。Astro SSG + AWS CDK + CloudFrontで月120円、AstroもCDKも初挑戦で構築した記録。"
pubDate: "2025-10-28"
updatedDate: "2026-05-22"
tags: ["DevOps", "AWS", "GitHub Actions"]
---

さくらのレンタルサーバーでWordPressのブログを持っていた。更新もほとんどせず、放置気味になっていた。

再挑戦しようと思ったきっかけは、AIだ。

記事を書くという面倒な作業が、AIと壁打ちすることで圧倒的に楽になった。「書けない」より「書く場所が古い」という問題が残った。ならついでに作り直そう、という話になった。

AstroもAWS CDKも今回が初挑戦だった。

## なぜWordPressをやめたか

WordPressには不満があった。

- 月額約600円（DBサーバー込み）の固定費
- PHPのサーバーサイドレンダリングによる遅さ
- コア・プラグインの更新管理の手間
- 「インフラをコードで管理していない」という状態

最後の一点は、エンジニアとして気になっていた。業務でAWSを触っているのに、自分のサイトのインフラは手動管理という状態だった。

**Astro SSG + AWS S3 + CloudFront + AWS CDK** の構成に移行した。

## アーキテクチャの全体像

```
GitHub → GitHub Actions → S3 → CloudFront → ユーザー
             ↑ OIDC認証（キーレス）
```

mainブランチにpushするだけで、自動ビルドからデプロイまで完結する。

## AWS CDKでインフラをコード管理する

最大のこだわりはインフラをAWS CDK（TypeScript）で管理することだ。HCLではなくTypeScriptで書けるので、普段の開発言語と統一できる。

```typescript
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

S3バケットは完全プライベートに設定し、CloudFront OAC経由でのみアクセスを許可する。

CDKを初めて使って最初に詰まったのは `cdk bootstrap` の存在を知らなかったことと、ACM証明書を `us-east-1` で作らないといけないというCloudFrontの制約だった。

## OIDC認証でキーレスデプロイ

従来はAWSアクセスキーをGitHub Secretsに保存する必要があった。OIDC認証を使えば長期的なアクセスキーなしでデプロイできる。

```yaml
- name: Configure AWS credentials via OIDC
  uses: aws-actions/configure-aws-credentials@v4
  with:
    role-to-assume: ${{ secrets.AWS_ROLE_ARN }}
    aws-region: ap-northeast-1
```

GitHubが発行した一時的なIDトークンをAWS STSと交換する仕組みだ。

## CloudFrontキャッシュ戦略

Astroのビルド成果物は2種類に分けてキャッシュ設定する。

| ファイル | Cache-Control | 理由 |
|---|---|---|
| `_astro/*`（JS・CSS） | `max-age=31536000,immutable` | ハッシュ付きファイル名のため1年キャッシュ可 |
| `*.html` | `max-age=0,no-cache` | デプロイ後即時反映のため |

## コスト比較

| 項目 | WordPress（さくら） | Astro（AWS） |
|---|---|---|
| サーバー | ~500円/月 | S3: ~10円/月 |
| CDN | なし | CloudFront: ~20〜50円/月 |
| ドメイン | ~100円/月 | Route 53: ~60円/月 |
| **合計** | **~600円/月** | **~90〜120円/月** |

## AIがなかったら再挑戦していなかった

「またブログを始めよう」と思えたのは、書くことへのハードルが下がったからだ。

AIと壁打ちしながら書くと、体験のアウトプットが加速する。面倒だった記事作成の部分が軽くなった分、「どこに書くか」という問題が目立ちはじめた。

そのタイミングでインフラも作り直した。このブログ自体が、AIがあったから動き出したプロジェクトだ。

AstroもCDKも初挑戦だったが、どちらもTypeScriptで書けるため思った以上にスムーズだった。詰まった部分も、Claude Codeに相談しながら解決していった。

---

**関連記事**:
- [AIがなかったら死んでた——一人で全部背負うテックリードの現実](/blog/solo-techlead-ai-survival)
- [AWS CDKを初めて使ってハマったこと](/blog/aws-cdk-first-pitfalls)
- [ポートフォリオ: 年収トラッカー（同じS3+CloudFront構成）](/portfolios)
