---
title: "AWS CDKを初めて使って詰まった5つのこと"
emoji: "🔧"
type: "tech"
topics: ["AWS", "TypeScript"]
published: false
published_at: "2025-11-18 09:00"
canonical_url: "https://www.taka-techblog.com/blog/aws-cdk-first-pitfalls"
---

:::message
この記事は [taka-techblog](https://www.taka-techblog.com/blog/aws-cdk-first-pitfalls?utm_source=zenn&utm_medium=referral) にも掲載しています。
:::

## なぜCDKを選んだのか

このブログのインフラはAWS CDKで構築しました。IaCはこのブログが初挑戦です。TerraformではなくCDKを選んだ理由は単純で、「普段書いているTypeScriptでインフラを書けるなら、その方が自分に合っている」という直感でした。

HCLを新たに覚えるより、型補完・リファクタリング・テストがTypeScriptのエコシステムでそのまま使える点がCDKの最大の強みです。一方で「インフラをコードで表現する」という抽象度が上がった分、最初の学習コストはやや高めでした。

## 詰まり1: L1/L2/L3コンストラクトの違いで混乱した

CDKのドキュメントを読み始めてすぐ「L1、L2、L3って何？」となりました。

- **L1（Cfn系）**: CloudFormationリソースを1:1でマッピングしたもの。`CfnBucket`など。細かく制御できるが記述量が多い
- **L2**: AWS推奨設定をデフォルトで持つ高レベル抽象。`Bucket`、`Distribution`など。普段はこれを使う
- **L3（Patterns）**: 複数のL2を組み合わせた典型的なアーキテクチャ。`ApplicationLoadBalancedFargateService`など

最初は「L1が基本でL3が応用」と思っていたのですが、逆で「普段はL2を使い、細かい設定が必要なときだけL1に降りる」が正しい理解です。

```typescript
import * as s3 from "aws-cdk-lib/aws-s3";

// L2コンストラクト（推奨）
const bucket = new s3.Bucket(this, "BlogBucket", {
  blockPublicAccess: s3.BlockPublicAccess.BLOCK_ALL,
  removalPolicy: cdk.RemovalPolicy.RETAIN,
});

// L1に降りて細かい設定を追加する場合
const cfnBucket = bucket.node.defaultChild as s3.CfnBucket;
cfnBucket.accelerateConfiguration = {
  accelerationStatus: "Enabled",
};
```

## 詰まり2: IAM権限が足りなくてデプロイが失敗し続けた

`cdk deploy`を実行するIAMユーザーの権限不足で何度もデプロイが止まりました。CloudFormationがリソースを作るために必要な権限と、自分のユーザーが持つ権限の2段階があるのを最初は理解していませんでした。

ローカル開発中は一時的に`AdministratorAccess`を付与して進め、動作確認が取れてからCI/CDで使うロールの権限を最小化するアプローチが現実的です。本番環境では以下のように権限を絞っています。

```typescript
// CDKデプロイ用のIAMロール
const deployRole = new iam.Role(this, "CdkDeployRole", {
  assumedBy: new iam.ServicePrincipal("cloudformation.amazonaws.com"),
  managedPolicies: [
    iam.ManagedPolicy.fromAwsManagedPolicyName("AWSCloudFormationFullAccess"),
  ],
  inlinePolicies: {
    CdkDeploy: new iam.PolicyDocument({
      statements: [
        new iam.PolicyStatement({
          actions: ["s3:*", "cloudfront:*", "acm:*"],
          resources: ["*"],
        }),
      ],
    }),
  },
});
```

## 詰まり3: `cdk bootstrap`を知らずに進んでエラーになった

ドキュメントに`cdk bootstrap`という手順があるのを読み飛ばしていて、最初のデプロイで詰まりました。

CDKは内部でS3バケットとIAMロールを使ってアセット（Lambdaのzipやカスタムリソース）を管理しています。`cdk bootstrap`はそのための専用スタック（`CDKToolkit`）を作成するコマンドです。

```bash
# 初回のみ実行が必要
cdk bootstrap aws://123456789012/ap-northeast-1

# マルチリージョン対応の場合
cdk bootstrap aws://123456789012/us-east-1
```

エラーメッセージに `"CDKToolkit" does not exist` と出たらまずこれを疑ってください。

## 詰まり4: ACM証明書はus-east-1で作らないとCloudFrontに使えない

CloudFrontにカスタムドメインとHTTPSを設定しようとして、東京リージョン（ap-northeast-1）でACM証明書を作成しました。ところが、CloudFrontのディストリビューションにアタッチしようとすると「us-east-1の証明書しか使えない」というエラーが出ます。

これはCloudFrontがグローバルサービスであり、証明書を米国東部リージョンからのみ参照できるというAWSの仕様です。CDKではクロスリージョンの証明書を以下のように扱います。

```typescript
import * as acm from "aws-cdk-lib/aws-certificatemanager";
import * as cloudfront from "aws-cdk-lib/aws-cloudfront";

// us-east-1 スタックで証明書を作成
const certStack = new CertificateStack(app, "CertStack", {
  env: { region: "us-east-1" }, // ここが重要
  crossRegionReferences: true,
});

// CloudFrontスタックで参照
const distribution = new cloudfront.Distribution(this, "Distribution", {
  certificate: certStack.certificate, // クロスリージョン参照
  domainNames: ["taka-techblog.com"],
  // ...
});
```

`crossRegionReferences: true`をスタックのpropsに指定することでSSMパラメータストア経由のクロスリージョン参照が有効になります。これを知らないと証明書を何度も作り直すはめになります。

## 詰まり5: スタック分割の考え方

最初はすべてのリソースを1つのスタックに書いていましたが、更新のたびに全リソースへの変更チェックが走って遅くなりました。

変更頻度と依存関係でスタックを分割するのが定石です。このブログでは以下のように3スタックに分けています。

```
CertStack (us-east-1)  ← 証明書（ほぼ変更なし）
  ↓
StorageStack (ap-northeast-1)  ← S3バケット（たまに変更）
  ↓
FrontendStack (ap-northeast-1)  ← CloudFront + Route53（デプロイのたびに変更）
```

スタック間の参照は`Stack.of(this).exportValue()`と`Fn.importValue()`で行いますが、クロスリージョンの場合はSSMパラメータストアを使う方が安定しています。

## まとめ

CDK初心者が最初にはまりやすいポイントを5つ挙げました。

1. **L1/L2/L3の使い分け**: 普段はL2、細かい設定が必要ならL1へ降りる
2. **IAM権限の2段階理解**: デプロイユーザーとCloudFormation実行ロールは別
3. **`cdk bootstrap`は初回必須**: エラーが出たらまずこれを確認
4. **ACM証明書はus-east-1**: CloudFront用は必ず米国東部で作成
5. **スタックは変更頻度で分割**: 更新速度とデプロイリスクのバランスを取る

IaC初挑戦でもCDKは型補完が強力で、TypeScriptに慣れていれば思った以上にスムーズに書けます。初期の学習コストを乗り越えた先には快適なインフラ開発が待っています。

---

他の記事も読む → [taka-techblog.com](https://www.taka-techblog.com?utm_source=zenn&utm_medium=referral)
X でも発信中 → [@_taka_tech](https://x.com/_taka_tech)
