---
title: "AstroサイトのS3+CloudFrontキャッシュ戦略：静的サイトを最速にする"
description: "AstroのビルドアーティファクトをS3+CloudFrontで配信するときのキャッシュ設計。immutableキャッシュとno-cacheの使い分け・デプロイ後の即時反映・CloudFront Invalidationのコスト管理まで。"
pubDate: "2026-03-10"
tags: ["Astro", "AWS", "CloudFront", "パフォーマンス", "DevOps"]
---

## 静的サイトのキャッシュ設計は意外と奥が深い

Astro SSGで生成した静的サイトをS3 + CloudFrontで配信するとき、キャッシュの設定を間違えると「デプロイしたのに古いページが表示され続ける」という問題が発生します。

逆に「デプロイのたびに全キャッシュを消す」設定だと、CDNのメリットをほとんど受けられません。

このブログを構築したときに試行錯誤したキャッシュ戦略をまとめます。

## Astroのビルドアーティファクトの特徴

Astroでビルドすると `dist/` に以下が生成されます：

```
dist/
├── index.html
├── about/
│   └── index.html
├── blog/
│   ├── index.html
│   └── first-post/
│       └── index.html
└── _astro/
    ├── main.Bx7k2qWe.css    ← ハッシュ付きファイル名
    └── hoisted.CdZ1rBzP.js  ← ハッシュ付きファイル名
```

`_astro/` 以下のJS・CSSファイルは**コンテンツハッシュがファイル名に含まれます**。ファイルの中身が変わればファイル名が変わる。つまり、同名のファイルは必ず同じ内容を指します。

HTMLファイルはそうではありません。`index.html` は記事を更新しても同じ名前のまま内容が変わります。

この違いがキャッシュ戦略の核心です。

## キャッシュ設計

| ファイル種別 | Cache-Control | 理由 |
|---|---|---|
| `_astro/*`（JS・CSS） | `max-age=31536000, immutable` | ハッシュ付きファイル名のため1年キャッシュしても安全 |
| `*.html` | `max-age=0, no-cache` | デプロイ後に即時反映が必要 |
| `robots.txt`, `sitemap.xml` | `max-age=86400` | 1日キャッシュで十分 |
| `*.svg`, `*.png`（OGP画像など） | `max-age=604800` | 1週間キャッシュ |

`immutable` は「このURLのリソースは永遠に変わらない」を示すディレクティブです。ブラウザはこれを見ると再検証リクエストすら送りません。ハッシュ付きファイル名と組み合わせることで、最大限のキャッシュ効率を実現できます。

## GitHub Actionsでの実装

```yaml
- name: Deploy _astro/ (JS/CSS - immutable cache)
  run: |
    aws s3 sync dist/_astro/ s3://${{ secrets.S3_BUCKET }}/_astro/ \
      --cache-control "max-age=31536000,immutable" \
      --delete

- name: Deploy HTML (no-cache)
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

`_astro/` を先にデプロイし、その後にHTMLをデプロイすることで、HTMLが更新されたときには参照先のJS/CSSが既に存在している状態を保ちます。

## CloudFront Invalidationのコストと最適化

CloudFront Invalidationは月1,000パスまで無料、それ以上は1,000パスごとに0.005ドルかかります。

`"/*"` のワイルドカード指定は「1パス」としてカウントされるので、記事が何百あっても1回のデプロイで1パス消費で済みます。これは効率的な設定です。

ただし、HTMLを `no-cache` にしていればブラウザは必ずサーバーに問い合わせます。CloudFront側のキャッシュも短命（TTL=0）になるため、Invalidationしなくても即時反映されます。

私の設定では念のため `/*` のInvalidationを実行していますが、HTML側の `no-cache` 設定がしっかりしていれば理論上不要です。

## CloudFrontのキャッシュポリシー設定

CloudFront側では`CachingDisabled`マネージドポリシーとカスタムポリシーを使い分けています。

```typescript
// AWS CDKでの設定例
import * as cloudfront from 'aws-cdk-lib/aws-cloudfront';

const distribution = new cloudfront.Distribution(this, 'BlogDistribution', {
  defaultBehavior: {
    origin: S3BucketOrigin.withOriginAccessControl(bucket),
    // デフォルトはno-cache（HTML用）
    cachePolicy: cloudfront.CachePolicy.CACHING_DISABLED,
    viewerProtocolPolicy: cloudfront.ViewerProtocolPolicy.REDIRECT_TO_HTTPS,
    compress: true,
  },
  additionalBehaviors: {
    // _astro/ は1年キャッシュ
    '_astro/*': {
      origin: S3BucketOrigin.withOriginAccessControl(bucket),
      cachePolicy: cloudfront.CachePolicy.CACHING_OPTIMIZED,
      viewerProtocolPolicy: cloudfront.ViewerProtocolPolicy.REDIRECT_TO_HTTPS,
      compress: true,
    },
  },
});
```

S3に設定したCache-Controlヘッダーをそのままオリジンレスポンスヘッダーとして返すよう設定することで、CloudFrontもブラウザも一貫したキャッシュ戦略で動作します。

## Core Web Vitalsへの影響

正しいキャッシュ設定によって、2回目以降のページ読み込みが劇的に速くなります。

- JS/CSSがimmutableキャッシュされることで、再訪問時のネットワークリクエストがゼロ
- CloudFront CDNにより日本国内のTTFB（Time to First Byte）が数十ms以内
- HTMLはno-cacheでも、サーバーから304（Not Modified）が返れば転送コストは小さい

このブログでもLighthouseスコアはほぼ100を維持できています。

## まとめ

- `_astro/*`（ハッシュ付きファイル）: `max-age=31536000, immutable` で1年キャッシュ
- HTMLは `max-age=0, no-cache` で即時反映
- S3へのデプロイ順序: `_astro/` → HTML の順で
- CloudFront Invalidationの `/*` 指定は1パスカウント
- CDKでキャッシュポリシーをコード管理するとパスごとに細かく設定できる
