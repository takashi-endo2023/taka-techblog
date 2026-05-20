---
title: "CloudFormationからCDKへ移行した話——YAMLに疲れてTypeScriptで書くようになった"
description: "治験管理システムのインフラをCloudFormationからAWS CDKに移行した実体験。移行のきっかけ・つまずきポイント・移行後の開発体験の変化をまとめる。"
pubDate: "2025-04-15"
tags: ["AWS", "CDK", "CloudFormation", "IaC", "TypeScript"]
---

CloudFormationのYAMLが300行を超えたあたりで、限界を感じた。

「このリソースがどの環境用か」がわからなくなってきた。開発・ステージング・本番で少しずつ設定が違うため、コメントが増え続けた。変更するたびに「このYAMLのどこを直せばいいか」を探す時間が無視できなくなった。

AWS CDK（Cloud Development Kit）に移行したのは、「TypeScriptで書けるなら絶対わかりやすくなる」という確信があったからだ。移行から1年半が経ち、振り返ってみる。

## CloudFormationの何が辛かったか

移行前の状況を正直に書いておく。

治験管理システムのインフラはAWS上に構築していて、CloudFormationでYAMLベースのIaCを管理していた。最初はそれで十分だったが、システムが育つにつれて問題が出てきた。

**問題1：環境ごとの差異管理が辛い**

開発環境ではRDSのインスタンスタイプが `db.t3.micro`、本番では `db.r5.large`。開発ではMulti-AZなし、本番ではあり。これをParametersで管理しようとすると、条件分岐のネストが深くなり、読むのが辛くなる。

```yaml
# これが増えてくると地獄
Conditions:
  IsProd: !Equals [!Ref Environment, production]
  IsMultiAZ: !Equals [!Ref Environment, production]

Resources:
  Database:
    Type: AWS::RDS::DBInstance
    Properties:
      DBInstanceClass: !If [IsProd, db.r5.large, db.t3.micro]
      MultiAZ: !If [IsMultiAZ, true, false]
```

**問題2：コードの再利用ができない**

「ステージングと本番でほぼ同じ構成のVPCを作りたい」というとき、CloudFormationでは共通化の手段がない。`Mappings` や `Conditions` で対処しようとするが、やはり複雑になる。

**問題3：TypeScriptとの文脈切り替えが辛い**

アプリケーションコードはTypeScriptで書いているのに、インフラだけYAMLというのは、日本語で話している途中に突然英語に切り替えるような感覚がある。型補完がない世界でARNを手打ちするのは苦痛だった。

## CDKへの移行：何が変わったか

移行は段階的に行った。新規で追加するリソースはCDKで書き、既存のCloudFormationスタックはそのまま残す、というアプローチだ。CloudFormationとCDKは共存できる。

### 環境差異の管理がスッキリした

```typescript
interface StackProps extends cdk.StackProps {
  env: 'development' | 'staging' | 'production';
}

export class DatabaseStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props: StackProps) {
    super(scope, id, props);

    const isProd = props.env === 'production';

    new rds.DatabaseInstance(this, 'Database', {
      instanceType: isProd
        ? ec2.InstanceType.of(ec2.InstanceClass.R5, ec2.InstanceSize.LARGE)
        : ec2.InstanceType.of(ec2.InstanceClass.T3, ec2.InstanceSize.MICRO),
      multiAz: isProd,
      // ...
    });
  }
}
```

TypeScriptの条件分岐なので直感的に読める。型補完のおかげで `InstanceClass.R5` を手打ちする必要もない。

### コンストラクトで再利用できる

VPC+サブネット+セキュリティグループのセットを「VpcConstruct」として切り出し、開発・ステージング・本番で使い回せる。

```typescript
export class VpcConstruct extends Construct {
  public readonly vpc: ec2.Vpc;
  public readonly appSecurityGroup: ec2.SecurityGroup;
  
  constructor(scope: Construct, id: string, props: { env: string }) {
    super(scope, id);
    
    this.vpc = new ec2.Vpc(this, 'Vpc', {
      maxAzs: props.env === 'production' ? 3 : 2,
      // ...
    });
    // ...
  }
}
```

「このVPCはどうやって作るんだっけ」という確認作業がなくなった。コンストラクトを使うだけでいい。

### デプロイが怖くなくなった

CDKには `cdk diff` コマンドがある。デプロイ前に「現在のスタックと変更後の差分」を確認できる。

```bash
$ cdk diff --profile production

Stack ProductionStack
Resources
[+] AWS::EC2::SecurityGroup App/AppSg AppSg
[~] AWS::RDS::DBInstance App/Database Database
  └─ [~] DBInstanceClass
      ├─ [-] db.t3.micro
      └─ [+] db.r5.large
```

「本番に何が変わるか」が事前にわかることで、「デプロイしてみないとわからない」という怖さがなくなった。治験システムのような本番障害が許されない環境では、この安心感は大きい。

## 移行でつまずいた点

良いことばかりではなかった。

**L1コンストラクト（Cfnリソース）とL2コンストラクトの使い分け**

CDKにはL1（CloudFormationリソースの直接マッピング）とL2（高レベルの抽象化）がある。基本的にL2を使えばいいが、L2がないリソースや、細かい設定をしたいときはL1に降りる必要がある。最初はこの使い分けが混乱した。

**`cdk deploy` が遅い**

CloudFormationのデプロイは元々時間がかかるが、CDKはその前に `cdk synth`（CloudFormationテンプレートの生成）が走るため、さらに少し時間がかかる。CI/CDでデプロイするときは覚悟が必要だ。

**既存スタックのインポート**

既存のCloudFormationリソースをCDKで管理下に置く（`cdk import`）のは、ドキュメントが少なく苦労した。途中でリソースが削除・再作成されるリスクがあり、慎重に進める必要があった。

## 移行してよかったか

結論：移行してよかった。

YAMLとの格闘がなくなり、インフラのコードレビューが機能するようになった。「このセキュリティグループのインバウンドルールは適切か」をTypeScriptとして読めるので、アプリエンジニアもレビューに参加できる。インフラが「特定の人しか触れない魔法」から「チームで管理するコード」になった。

治験システムの監査対応で「インフラの変更履歴を示してください」と言われたとき、GitのコミットログとPR履歴を見せることができた。「誰が何を変更したか」がコードとして追跡できることは、規制産業では特に価値が高い。
