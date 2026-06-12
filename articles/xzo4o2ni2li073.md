---
title: "RDSとDynamoDBの使い分け——データ構造とアクセスパターンで選ぶ基準"
emoji: "🗄️"
type: "tech"
topics: ["AWS","データベース"]
published: false
published_at: "2026-09-10 09:00"
canonical_url: "https://www.taka-techblog.com/blog/aws-rds-dynamodb-choice"
---

:::message
この記事は [taka-techblog](https://www.taka-techblog.com/blog/aws-rds-dynamodb-choice?utm_source=zenn&utm_medium=referral) にも掲載しています。
:::



データベースの選択は、システムの性能・コスト・スケール特性を長期にわたって左右する意思決定だ。にもかかわらず「とりあえずRDS（MySQL/PostgreSQL）でいいか」という理由で選ばれることが多い。

テックリードとして複数のシステム設計に関わってきた経験から言えば、RDSとDynamoDBの使い分けは「慣れているかどうか」ではなく、**データ構造とアクセスパターン**から逆算して決めるべきだ。

## RDSとDynamoDBの特性比較

| 比較項目 | RDS（MySQL/PostgreSQL） | DynamoDB |
|---|---|---|
| データモデル | リレーショナル（テーブル・行・列） | キーバリュー /ドキュメント |
| クエリの柔軟性 | 高い（JOINやサブクエリが使える） | 低い（主キーとインデックスに限定） |
| スケールアウト | 難しい（リードレプリカで読み取り拡張） | 容易（フルマネージドで自動スケール） |
| 書き込みスケール | 垂直スケール中心 | 水平スケール（パーティション分散） |
| スキーマ | 固定（変更にマイグレーションが必要） | 柔軟（カラム追加が容易） |
| レイテンシ | ms〜数十ms | 一桁ms（SLAで保証） |
| トランザクション | ACID準拠（完全） | サポートあり（制限付き） |
| コスト特性 | インスタンス稼働時間 | リクエスト数＋ストレージ |
| 管理コスト | パッチ・バックアップ（RDSが自動化） | ほぼゼロ（フルマネージド） |

## 「RDSでいい場合」の判断軸

RDSが適しているのは次のような条件だ。

### 複雑なJOINやトランザクションが必要

注文・在庫・ユーザー・商品など複数のエンティティがリレーションで結びついている業務システムは、RDSが自然な選択だ。SQLのJOINで柔軟に集計・結合できる利点は大きい。

```sql
-- 注文と顧客・商品を結合する例（RDSで簡単に書ける）
SELECT
  o.order_id,
  u.name AS customer_name,
  p.product_name,
  oi.quantity,
  oi.unit_price * oi.quantity AS subtotal
FROM orders o
JOIN users u ON o.user_id = u.id
JOIN order_items oi ON o.order_id = oi.order_id
JOIN products p ON oi.product_id = p.id
WHERE o.created_at >= '2026-01-01'
ORDER BY o.created_at DESC;
```

同等の処理をDynamoDBで実現しようとすると、アプリケーション側で複数のGetItemを組み合わせる必要があり、複雑さが増す。

### ACID準拠のトランザクションが必須

金融系の残高更新・在庫引き当てなど、「複数テーブルへの書き込みが全て成功するか全て失敗するか」が保証されなければならない処理はRDSの得意領域だ。

### アクセスパターンが設計時点で確定できない

「どんな条件で絞り込むかわからない」「将来的にレポート機能を追加するかもしれない」というケースでは、後からSQLで自由にクエリできるRDSの方が安全だ。DynamoDBはアクセスパターンを先に設計することが大前提になる。

## 「DynamoDBが向いている場合」の判断軸

### アクセスパターンが明確で、高スループット・低レイテンシが必要

ゲームのスコアランキング、IoTデバイスのセンサーデータ、ユーザーセッション管理など、「特定のキーで高速に取得・書き込みする」処理はDynamoDBが圧倒的に強い。

一桁ミリ秒のレイテンシをSLAで保証してくれるのはDynamoDB特有の強みだ。

### 書き込みが爆発的にスケールする可能性がある

RDSは書き込みのスケールアウトが難しい。マスターインスタンスの垂直スケールに頼ることになり、限界がある。DynamoDBはパーティション分散で自動的にスケールするため、急激なトラフィック増にも対応できる。

### スキーマが頻繁に変わる、または柔軟性が必要

DynamoDBはスキーマレスのため、新しい属性を追加しても既存アイテムに影響しない。マイグレーションコストがかからない点は、スタートアップや仕様変更が多いプロダクト初期で有利だ。

## DynamoDBのパーティションキー設計の重要性

DynamoDBを選ぶ際に最も重要なのが**パーティションキーの設計**だ。パーティションキーはデータの分散方式を決定するため、設計ミスがパフォーマンスの致命的なボトルネックになる。

### ホットパーティション問題

特定のパーティションキーに書き込みが集中すると、そのパーティションのスループット上限に引っかかる「ホットパーティション」問題が発生する。

悪い例: ステータス（`"active"` / `"inactive"`）をパーティションキーにする。ほとんどのアクセスが`"active"`に集中する。

良い例: ユーザーID（UUID）をパーティションキーにする。UUIDは一様に分散するため、書き込みが均等に分散する。

### アクセスパターン先行で設計する

DynamoDBのテーブル設計は「アクセスパターンを先に洗い出し、それに合わせてキー設計を行う」のが鉄則だ。RDBのように後からインデックスを追加すれば解決、とはいかない。

```
アクセスパターン例:
  1. userIdでユーザー情報を取得
  2. userIdで注文一覧を取得（日付降順）
  3. orderIdで注文詳細を取得

テーブル設計:
  PK: userId
  SK: METADATA（ユーザー情報）または ORDER#2026-05-18#orderId（注文）
```

## 実務での選択ケース

### RDSを選んだケース

社内の受注管理システムの設計時、受注・顧客・商品・在庫の4テーブルが複雑なリレーションで結びついており、営業担当者がアドホックな条件でCSV出力する要件があった。アクセスパターンが多様で事前に確定できなかったため、PostgreSQL（RDS）を選択した。

### DynamoDBを選んだケース

ユーザーのアクション履歴をリアルタイムで記録・参照するシステムで、「特定ユーザーの直近100件を取得する」という単一のアクセスパターンが明確だった。書き込みスループットも高く、スキーマが変わる可能性があったため、DynamoDBを選択した。

```javascript
// DynamoDB: ユーザーの最新アクションを取得する例
const { DynamoDBClient, QueryCommand } = require('@aws-sdk/client-dynamodb');
const client = new DynamoDBClient({ region: 'ap-northeast-1' });

// GetItem: 特定アイテムを取得
const getParams = {
  TableName: 'UserActions',
  Key: {
    userId: { S: 'user-123' },
    actionId: { S: 'action-456' },
  },
};

// PutItem: アクションを記録
const putParams = {
  TableName: 'UserActions',
  Item: {
    userId: { S: 'user-123' },
    actionId: { S: `${Date.now()}-abc` },
    type: { S: 'page_view' },
    path: { S: '/blog/aws-intro' },
    timestamp: { N: String(Date.now()) },
  },
};

// Query: 特定ユーザーの最新100件
const queryParams = {
  TableName: 'UserActions',
  KeyConditionExpression: 'userId = :uid',
  ExpressionAttributeValues: { ':uid': { S: 'user-123' } },
  ScanIndexForward: false, // 降順
  Limit: 100,
};
```

## 治験システムで「DynamoDBにしなくてよかった」と思った話

治験管理システムを設計したとき、一時期DynamoDBを検討した。「スケールするし、サーバーレスで管理不要だし」という理由からだ。

しかし治験データの構造を整理してみると、DynamoDBには向かないことがすぐわかった。

治験システムのデータは「被験者（Subject）」「来院記録（Visit）」「検査結果（Assessment）」「有害事象（Adverse Event）」が複雑に関連している。「この被験者の、この来院時点での、この検査の結果を取得して、同時期の有害事象と照合する」というクエリが日常的に必要で、これをDynamoDBの単純なキーアクセスで実現しようとすると設計が破綻する。

加えて、規制要件の観点からACIDトランザクションが必要なケースが多かった。「被験者の同意取得と初回来院記録を同時に作成する」という処理で、片方だけ成功した中途半端な状態は規制上許されない。RDS（PostgreSQL）のトランザクションで原子性を保証することが、システムの信頼性の基盤になった。

DynamoDBを選んだのは「操作ログの記録」だ。「誰がいつどのデータを閲覧・変更したか」という監査証跡は、アクセスパターンが「ユーザーIDで最新100件を取得する」という単純なものに限られ、書き込みが頻繁で読み取りが少ない。この特性がDynamoDBのパーティションキー設計とぴったり合った。

「なんとなくRDS」も「なんとなくDynamoDB」も失敗の元だ。アクセスパターンとトランザクション要件を先に洗い出す、という判断軸はこの経験で体に染み込んだ。

## まとめ

RDSとDynamoDBの選択基準をまとめる。

- **RDSを選ぶ場合**: 複雑なJOIN・ACIDトランザクション・アクセスパターンが多様で確定できない
- **DynamoDBを選ぶ場合**: 単純なキーアクセス・高スループット・低レイテンシ・自動スケール・スキーマ柔軟性

「なんとなくRDS」は今すぐやめよう。まず**アクセスパターンを洗い出し**、次に**スケール・レイテンシ要件を確認**する。その結果から逆算してDBを選ぶことが、後悔しないデータベース設計の第一歩だ。

DBを選んだあとに考えるのが可用性設計だ。RDSのMulti-AZ構成やフェイルオーバーの仕組みを含め、「止まらないサービス」を作るための考え方は[高可用性設計の基本——SPOF排除とフェイルオーバーで「止まらないサービス」を作る](/blog/high-availability-design-spof)でまとめている。

---

他の記事も読む → [taka-techblog.com](https://www.taka-techblog.com?utm_source=zenn&utm_medium=referral)
X でも発信中 → [@_taka_tech](https://x.com/_taka_tech)
