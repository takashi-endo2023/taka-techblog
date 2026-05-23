---
title: "JavaScriptのArray高階関数を実務で使いこなす——map・filter・reduceの使い分け"
emoji: "📦"
type: "tech"
topics: ["JavaScript", "TypeScript"]
published: true
published_at: "2023-09-12 09:00"
canonical_url: "https://taka-techblog.com/blog/javascript-array-methods"
---

:::message
この記事は [taka-techblog](https://taka-techblog.com/blog/javascript-array-methods?utm_source=zenn&utm_medium=referral) にも掲載しています。
:::

実務でコードレビューをしていると、「このforループ、Array高階関数で書き換えられるな」と感じる場面が今でも頻繁にある。

自分自身も転職直後はforループを多用していた。動くからいい、と思っていたのだが、チームでコードを読み合うようになってから「高階関数で書いたほうが意図が伝わりやすい」という感覚を強く持つようになった。

「改訂3版JavaScript本格入門」でArray高階関数を体系的に学び直したことで、使い分けの基準がはっきりした。この記事ではその整理を共有する。

## なぜforループから高階関数に移行するのか

`for` ループの問題は「何をしているか」より「どうやっているか」が目立つことにある。

```js
// forループ版
const prices = [100, 200, 300, 400, 500];
const result = [];
for (let i = 0; i < prices.length; i++) {
  if (prices[i] >= 200) {
    result.push(prices[i] * 1.1);
  }
}
```

このコードは動くが、「200以上のものを1.1倍した配列を作りたい」という意図を読み取るには1行ずつ追う必要がある。さらに `result` という変数を途中で変更しているため、純粋関数とは言いにくい。

高階関数を使うと意図が名前で表現される。

```js
// 高階関数版
const result = prices
  .filter(price => price >= 200)
  .map(price => price * 1.1);
```

`filter` が「絞り込む」、`map` が「変換する」という操作を名前で宣言しているので、読む側はコードの構造ではなく意図に集中できる。また元の `prices` を書き換えないイミュータブルな操作になる点も、Reactのstate管理との相性が良い。

## map・filter・reduceの基本と違い

### map——各要素を変換する

`map` は配列の各要素を変換し、同じ長さの新しい配列を返す。「変換」が仕事なので、要素数は変わらない。

```tsx
// TypeScriptでの型付き例
type Product = { id: number; name: string; price: number };

const products: Product[] = [
  { id: 1, name: "A", price: 1000 },
  { id: 2, name: "B", price: 2000 },
];

// price に税率を掛けた新しい配列
const withTax: Product[] = products.map(p => ({
  ...p,
  price: Math.floor(p.price * 1.1),
}));

// Reactでのリスト描画もmapが定番
const list = products.map(p => <li key={p.id}>{p.name}: ¥{p.price}</li>);
```

### filter——条件に合う要素だけを残す

`filter` は条件を満たす要素だけを抽出する。返る配列の長さは元以下になる。

TypeScriptでは型ガードを使うと型を絞り込める。

```ts
type Item = { name: string; stock: number | null };

const items: Item[] = [
  { name: "A", stock: 5 },
  { name: "B", stock: null },
  { name: "C", stock: 0 },
];

// stockがnullでなく、かつ1以上のものだけ取り出す
const inStock = items.filter(
  (item): item is Item & { stock: number } =>
    item.stock !== null && item.stock > 0
);
// inStockの各要素のstockはnumberに絞られる
```

### reduce——配列をひとつの値に集約する

`reduce` は最も汎用的で、最も乱用されやすい。「集計」が主な用途だ。

```ts
const cart: { name: string; price: number; qty: number }[] = [
  { name: "A", price: 1000, qty: 2 },
  { name: "B", price: 500, qty: 3 },
];

// 合計金額を計算
const total = cart.reduce((acc, item) => acc + item.price * item.qty, 0);
// total: 3500

// オブジェクトに変換（idをキーにしたマップを作る）
type User = { id: number; name: string };
const users: User[] = [{ id: 1, name: "Alice" }, { id: 2, name: "Bob" }];
const userMap = users.reduce<Record<number, User>>((acc, user) => {
  acc[user.id] = user;
  return acc;
}, {});
```

## チェーンでつなぐパターン

`filter` → `map` → `reduce` のようにメソッドチェーンで処理を組み合わせるのは実務でよく使う。

```ts
const orders: { status: string; amount: number; discount: number }[] = [
  { status: "completed", amount: 3000, discount: 300 },
  { status: "pending",   amount: 1500, discount: 0   },
  { status: "completed", amount: 2000, discount: 200 },
];

const completedRevenue = orders
  .filter(o => o.status === "completed")      // 完了済みのみ
  .map(o => o.amount - o.discount)             // 割引後の金額に変換
  .reduce((sum, amount) => sum + amount, 0);   // 合計
// completedRevenue: 4500
```

各ステップが1行で明確に分かれているので、「どこで何をしているか」がすぐわかる。

## find・some・everyの使い分け

「配列の中から特定の要素を探したい」「条件を満たすものが1つでもあるか知りたい」といった場面では、`map`・`filter` より適切なメソッドがある。

| メソッド | 返り値 | 用途 |
|---|---|---|
| `find` | 最初の一致要素or `undefined` | 特定の要素を1つ取得 |
| `findIndex` | 最初の一致インデックスor `-1` | インデックスが必要なとき |
| `some` | `true` / `false` | 1つでも条件を満たすか |
| `every` | `true` / `false` | 全要素が条件を満たすか |

```ts
const users = [
  { id: 1, name: "Alice", role: "admin" },
  { id: 2, name: "Bob",   role: "user"  },
];

// find: 管理者を1人取得（存在しないかもしれないのでundefinedチェックが必要）
const admin = users.find(u => u.role === "admin");
if (admin) console.log(admin.name); // Alice

// some: 管理者が1人でもいるか
const hasAdmin = users.some(u => u.role === "admin"); // true

// every: 全員がuserロールか
const allUsers = users.every(u => u.role === "user"); // false
```

フォームのバリデーションで「1つでもエラーがあるか」を `some` で判定するのはReactアプリでの定番パターンだ。

## flat・flatMapの活用

ネストした配列を扱うときは `flat` と `flatMap` が役立つ。

`flat` は配列をフラットにする。`flatMap` は `map` してから `flat(1)` する。

```ts
// flat: ネストを解消する
const nested = [[1, 2], [3, 4], [5]];
const flat = nested.flat(); // [1, 2, 3, 4, 5]

// flatMap: 1要素を複数要素に展開したいとき
const sentences = ["hello world", "foo bar baz"];
const words = sentences.flatMap(s => s.split(" "));
// ["hello", "world", "foo", "bar", "baz"]

// mapだとネストしてしまう
const nested2 = sentences.map(s => s.split(" "));
// [["hello", "world"], ["foo", "bar", "baz"]] ← これは困る
```

タグのついた記事一覧から全タグを重複なしで取得する、といった場面で `flatMap` + `Set` の組み合わせがよく使われる。

## 実務でよく見る失敗例

### reduceを使いすぎる

`reduce` は万能だが、読むのに認知コストがかかる。`map` や `filter` で書けるものを `reduce` で書いてもコードが複雑になるだけだ。

```ts
// NG: reduceで無理やり書いている
const doubled = [1, 2, 3].reduce<number[]>((acc, n) => {
  acc.push(n * 2);
  return acc;
}, []);

// OK: これはmapで十分
const doubled2 = [1, 2, 3].map(n => n * 2);
```

自分のルールとして「集計・集約（数値1つやオブジェクト1つを作る）なら `reduce`、それ以外は `map`・`filter` を先に検討する」としている。

### 副作用を持たせてしまう

高階関数のコールバック内で外部の変数を変更するのは避けるべきだ。

```ts
// NG: 外部のcountを変えている
let count = 0;
const result = items.map(item => {
  if (item.active) count++; // 副作用
  return item.name;
});

// OK: 処理を分ける
const activeCount = items.filter(item => item.active).length;
const names = items.map(item => item.name);
```

副作用を持つと、テストが難しくなり、予期しないバグの原因になる。

## 治験システムでのArray高階関数の実際の使い方

治験システムのフロントエンドを実装する中で、被験者データの一覧処理に `map`・`filter`・`reduce` を多用する場面があった。

典型的なユースケースを挙げると次のようなものだ。来院記録の一覧から「未来の来院予定のみを抽出する」には `filter`、「被験者ごとの来院回数を集計する」には `reduce`、「APIレスポンスを画面表示用のフォーマットに変換する」には `map` を使った。

TypeScriptの型を丁寧につけることが、医療データ処理で特に重要だった。治験データのフィールドは「まだ確定していない情報」があり、`visitDate` や `subjectCode` が `null` になりうるケースがある。型でそれを表現しておくと、コンパイル時に「nullの可能性があるまま計算に使おうとしている」というミスを検知できる。

```typescript
type VisitRecord = {
  id: number;
  subjectCode: string;
  visitDate: string | null;   // 来院予定日（未確定ならnull）
  visitCount: number;
  status: 'scheduled' | 'completed' | 'cancelled';
};

const visitRecords: VisitRecord[] = [...]; // APIレスポンス想定

// 未来の来院予定のみ抽出（visitDateがnullのものは除外、型ガードで絞り込む）
const today = new Date().toISOString().split('T')[0];
const upcomingVisits = visitRecords.filter(
  (v): v is VisitRecord & { visitDate: string } =>
    v.visitDate !== null &&
    v.visitDate >= today &&
    v.status === 'scheduled'
);

// 被験者ごとの来院完了回数を集計
const completedCountBySubject = visitRecords
  .filter(v => v.status === 'completed')
  .reduce<Record<string, number>>((acc, v) => {
    acc[v.subjectCode] = (acc[v.subjectCode] ?? 0) + 1;
    return acc;
  }, {});

// 画面表示用にフォーマット変換
const displayItems = upcomingVisits.map(v => ({
  label: `${v.subjectCode} — ${v.visitDate}`,
  visitId: v.id,
  completedCount: completedCountBySubject[v.subjectCode] ?? 0,
}));
```

型ガード付きの `filter` でnullを除外した後は、後続の `map` や `reduce` 内で `v.visitDate` を `string` として安全に扱える。`?? 0` のようなnullish coalescing演算子と組み合わせることで、医療データ特有の「入力されていない可能性があるフィールド」を安全に扱うパターンが自然に書けるようになった。

## まとめ

Array高階関数を使いこなすと、コードの意図が名前で伝わるようになる。最初は意識して使う必要があるが、慣れると `for` ループには戻れなくなる。

- **map**: 変換（要素数変わらず）
- **filter**: 絞り込み（要素数が減る可能性あり）
- **reduce**: 集約（別の型・形に変える）
- **find/some/every**: 検索・判定
- **flat/flatMap**: ネスト解消・展開

TypeScriptと組み合わせることで、型の絞り込みや返り値の型推論も効くようになり、実務でさらに威力を発揮する。

---

「改訂3版JavaScript本格入門」では配列メソッドだけでなく、クロージャや非同期処理など、実務でよく使うJavaScriptの仕組みが体系的に整理されている。「なんとなく動く」から「なぜ動くかわかる」レベルに上げたい人に特におすすめだ。


📚 **[改訂3版JavaScript本格入門 ～モダンスタイルによる基礎から現場での応用まで](https://www.amazon.co.jp/dp/4297132885)** — 山田祥寛 著 ／ 技術評論社 —ES6+・非同期処理・クロージャ・クラスまで体系的に学べる決定版

---

他の記事も読む → [taka-techblog.com](https://taka-techblog.com?utm_source=zenn&utm_medium=referral)
X でも発信中 → [@taka_tech1988](https://x.com/taka_tech1988)
