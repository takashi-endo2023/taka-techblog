---
title: "WebアーキテクチャとRESTが生まれた理由——設計思想を歴史から理解する"
emoji: "🏛️"
type: "tech"
topics: ["アーキテクチャ", "HTTP", "REST"]
published: false
canonical_url: "https://www.taka-techblog.com/blog/web-architecture-rest-history"
---

:::message
この記事は [taka-techblog](https://www.taka-techblog.com/blog/web-architecture-rest-history?utm_source=zenn&utm_medium=referral) にも掲載しています。
:::

「なぜRESTはステートレスでなければならないのか」——根拠を持って説明できるエンジニアは少ない。RESTはWebが爆発的に普及した理由に直結した設計思想だ。

## Web以前の分散システムが抱えていた問題

```
RPC → ネットワーク不安定性・プラットフォーム依存・密結合
CORBA/DCOM → 複雑な仕様・ベンダーロックイン
```

これらはインターネット規模になると破綻した。

## WebはHTTP・URI・HTMLの組み合わせで解決した

1. **HTTP** — シンプルで統一されたプロトコル
2. **URI** — すべてのリソースに一意のアドレスを付与
3. **HTML（ハイパーメディア）** — リンクでリソースをつなぐ

## RESTを構成する6つの制約

```
REST = ULCODC$SS
├── Uniform Interface（統一インターフェース）
├── Layered System（階層化システム）
├── Client/Server（クライアント/サーバ分離）
├── On-Demand Code（コードオンデマンド） ※省略可能
├── Stateless（ステートレスサーバ）
└── Cache（キャッシュ）
```

### ステートレスが重要な理由

サーバがセッションを保持しないことで：
- **どのサーバにリクエストを振っても同じ結果**→ 水平スケールが容易
- **サーバ障害時の切り替えが簡単**→ 可用性が上がる

### 統一インターフェースが重要な理由

GET・POST・PUT・DELETE・PATCHという少数のメソッドで全リソース操作を表現することで、APIの学習コストが下がり、中間キャッシュが効く。

## なぜSOAPは負けたか

```xml
<!-- SOAPリクエスト：すべてPOST + XML -->
<soap:Envelope>
  <soap:Body><getUserById><id>123</id></getUserById></soap:Body>
</soap:Envelope>
```

| 観点 | SOAP | REST |
|---|---|---|
| シンプルさ | 複雑 | シンプル |
| キャッシュ | 不可（全部POST） | GETはキャッシュ可 |
| ブラウザ対応 | 難しい | 簡単 |

SOAPはHTTPをトランスポート層として使っただけで、Webのアーキテクチャの利点を全部捨てた。

## 現場への応用

```
# ❌ RPCスタイル
POST /getUser
POST /deleteUser

# ✅ REST（HTTPメソッドが操作を表現）
GET    /users/123
DELETE /users/123
```

設計の根拠を持つことで、チーム内のAPIレビューが変わる。

https://www.amazon.co.jp/dp/4774142042

---

他の記事も読む → [taka-techblog.com](https://www.taka-techblog.com?utm_source=zenn&utm_medium=referral)
X でも発信中 → [@_taka_tech](https://x.com/_taka_tech)
