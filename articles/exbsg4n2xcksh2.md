---
title: "S3 + CloudFrontで静的サイトを本番運用する——このブログを構築して学んだこと"
emoji: "🌐"
type: "tech"
topics: ["AWS", "DevOps"]
published: false
published_at: "2025-12-30 09:00"
canonical_url: "https://www.taka-techblog.com/blog/aws-s3-cloudfront-static-site"
---

:::message
この記事は [taka-techblog](https://www.taka-techblog.com/blog/aws-s3-cloudfront-static-site?utm_source=zenn&utm_medium=referral) にも掲載しています。
:::

このブログはAstro（SSG）でビルドし、生成した静的ファイルをS3に置いてCloudFront経由で配信している。構成自体はシンプルだが、実際に本番運用してみると「なるほど、ここで詰まるのか」という落とし穴がいくつかあった。本記事では、S3 + CloudFrontによる静的サイトホスティングの設定方法と、私が実際にハマったポイントを整理する。

## 全体構成

```
ブラウザ
  └→ CloudFront（エッジキャッシュ・HTTPS・カスタムドメイン）
       └→ S3バケット（オリジン・パブリックアクセス禁止）
```

CloudFrontをフロントに置くことで、エッジロケーションからの高速配信・HTTPS終端・ACM証明書によるカスタムドメインを一括で実現できる。S3バケットは直接公開せず、CloudFront経由のみアクセスを受け付ける構成にする。

## S3バケットの設定

### パブリックアクセスブロックを必ず有効にする

S3バケットを作成したら、最初にパブリックアクセスブロックをすべて有効にする。CloudFront経由でのみアクセスさせるため、バケットを直接公開する必要はない。

CDKでは次のように設定する。

```typescript
import * as s3 from 'aws-cdk-lib/aws-s3';
import * as cloudfront from 'aws-cdk-lib/aws-cloudfront';
import * as origins from 'aws-cdk-lib/aws-cloudfront-origins';

const bucket = new s3.Bucket(this, 'BlogBucket', {
  bucketName: 'taka-techblog',
  blockPublicAccess: s3.BlockPublicAccess.BLOCK_ALL,
  removalPolicy: cdk.RemovalPolicy.RETAIN,
});
```

`BLOCK_ALL`を指定することで、ACLやバケットポリシー経由でも直接アクセスできなくなる。

### バケットポリシーはOACを使って設定する

CloudFrontからS3にアクセスするための認証方式は、旧来のOAI（Origin Access Identity）から**OAC（Origin Access Control）**への移行が推奨されている。OACはSigV4署名をサポートし、よりセキュアだ。

CDKでOACを設定すると、バケットポリシーは自動的に追加される。

```typescript
const distribution = new cloudfront.Distribution(this, 'BlogDistribution', {
  defaultBehavior: {
    origin: origins.S3BucketOrigin.withOriginAccessControl(bucket),
    viewerProtocolPolicy: cloudfront.ViewerProtocolPolicy.REDIRECT_TO_HTTPS,
    cachePolicy: cloudfront.CachePolicy.CACHING_OPTIMIZED,
  },
  defaultRootObject: 'index.html',
  domainNames: ['taka.example.com'],
  certificate: certificate,
});
```

## CloudFrontディストリビューションの設定

### キャッシュポリシー

静的サイトには`CACHING_OPTIMIZED`ポリシーが適している。デフォルトTTLが86400秒（24時間）、最大TTLが31536000秒（1年）に設定されており、ヘッダーやクエリ文字列もキャッシュキーに含まれないためキャッシュヒット率が高くなる。

ただし、このポリシーを使う場合は**デプロイのたびにInvalidationが必要**になる（後述）。

### カスタムドメインとACM証明書

CloudFrontにカスタムドメインを設定するには、ACM（AWS Certificate Manager）で発行した証明書が必要だ。重要な点として、**CloudFrontに使う証明書はus-east-1リージョンで発行しなければならない**。

```typescript
// us-east-1リージョンのスタックで証明書を発行する必要がある
const certificate = new acm.Certificate(this, 'BlogCertificate', {
  domainName: 'taka.example.com',
  validation: acm.CertificateValidation.fromDns(hostedZone),
});
```

私はこれを知らず、東京リージョンで証明書を作ろうとして「なぜか選択肢に出てこない」と30分悩んだ。

### カスタムエラーレスポンス

SPAやAstroのdynamic routingを使っている場合、存在しないパスへのアクセス時にS3から403が返ることがある。`index.html`を返すようにカスタムエラーレスポンスを設定しておくと良い。

```typescript
errorResponses: [
  {
    httpStatus: 403,
    responseHttpStatus: 200,
    responsePagePath: '/index.html',
    ttl: cdk.Duration.seconds(0),
  },
  {
    httpStatus: 404,
    responseHttpStatus: 404,
    responsePagePath: '/404.html',
  },
],
```

## AWS CDKでインフラをコード化する

このブログのインフラはすべてAWS CDKで管理している。理由は「設定がコードとして残り、変更履歴がgitで追える」からだ。AWSコンソールでポチポチ設定すると「なぜこうなっているのかわからない」状態になりやすい。

CDKのスタックが一つのファイルに整理されていると、S3バケット・CloudFrontディストリビューション・IAMロール・Route53レコードの関係が一目でわかる。新しいメンバーがインフラを理解するコストも大きく下がる。

デプロイは次のコマンドで行う。

```bash
cd infra
npx cdk deploy --require-approval never
```

## CloudFront Invalidationが必要な理由

ここが私が最初に一番詰まったポイントだ。

S3にファイルをアップロードしても、**CloudFrontは以前キャッシュしたファイルをキャッシュTTLが切れるまで返し続ける**。つまり、デプロイしたのにブラウザには古いページが表示される。

解決策はCloudFront Invalidation（キャッシュの無効化）だ。デプロイ後に次のコマンドを実行することで、エッジのキャッシュを強制的に削除する。

```bash
aws s3 sync ./dist s3://taka-techblog --delete

aws cloudfront create-invalidation \
  --distribution-id E1XXXXXXXXXX \
  --paths "/*"
```

`/*`はすべてのファイルを対象にする指定だ。特定のファイルだけ更新した場合はパスを絞れるが、静的サイトの全体デプロイなら`/*`で問題ない。

### 実際に詰まったこと

記事を書いて`git push`したあと、ブラウザで確認しても変更が反映されていない。「S3には最新ファイルがある、CloudFrontの設定も問題ない、なぜ？」と原因不明のまま15分ほど悩んだ。

原因はGitHub ActionsのワークフローでInvalidationのステップを書き忘れていたことだった。`sync`コマンドの後ろにInvalidationを追加して解決。今ではデプロイとInvalidationはセットで必ず実行するようにしている。

## まとめ

S3 + CloudFrontによる静的サイトホスティングのポイントをまとめる。

- **S3バケットはパブリックアクセスブロックをONにして直接公開しない**
- **CloudFrontとS3の接続にはOACを使う**（OAIは非推奨）
- **ACM証明書はus-east-1で発行する**——これは忘れがち
- **デプロイ後は必ずCloudFront Invalidationを実行する**
- **インフラはCDKでコード化して変更履歴を残す**

静的サイトは「シンプル」と思われがちだが、CloudFrontのキャッシュ制御を理解していないと本番で困る。特にInvalidationを忘れると古いファイルが表示され続けるため、デプロイフローに組み込んでおくのは必須だ。


📚 **[AWSの基本・仕組み・重要用語が全部わかる教科書](https://www.amazon.co.jp/dp/4815607850)** — 川畑光平 著 ／SBクリエイティブ — 図解でAWSの全体像をつかむ入門書

---

他の記事も読む → [taka-techblog.com](https://www.taka-techblog.com?utm_source=zenn&utm_medium=referral)
X でも発信中 → [@_taka_tech](https://x.com/_taka_tech)
