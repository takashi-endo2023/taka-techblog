---
title: "ES6+の新構文を実務でどう使うか——JavaScript本格入門で整理した基礎知識"
emoji: "✨"
type: "tech"
topics: ["JavaScript","TypeScript"]
published: false
published_at: "2023-07-10 09:00"
canonical_url: "https://www.taka-techblog.com/blog/javascript-es6-modern-syntax"
---

:::message
この記事は [taka-techblog](https://www.taka-techblog.com/blog/javascript-es6-modern-syntax?utm_source=zenn&utm_medium=referral) にも掲載しています。
:::



業務でJavaScriptを書いてきた年数だけは積み上がっていたが、ある日チームメンバーに「なぜここではスプレッド構文を使わないんですか？」と聞かれて詰まった。

動くコードは書けている。でも「なぜこう書くのか」を言語化できていなかった。テックリードとしてその状態はまずいと感じて、「JavaScript本格入門（モダンスタイルによる）山田祥寛 著 技術評論社」を手に取った。

## アロー関数は「短く書ける構文」じゃない

最初に整理できてよかったのがアロー関数だ。

`function`キーワードを省略できる便利な記法、くらいの認識でずっと使ってきた。しかし本を読んで改めて確認すると、アロー関数には`this`を持たないという本質的な違いがある。

```typescript
const obj = {
  name: "taka",
  // 通常の関数：thisはobjを指す
  greetNormal: function () {
    console.log(`Hello, ${this.name}`);
  },
  // アロー関数：thisは外側のスコープを引き継ぐ
  greetArrow: () => {
    console.log(`Hello, ${this.name}`); // undefinedになる
  },
};

obj.greetNormal(); // Hello, taka
obj.greetArrow();  // Hello, undefined
```

実務でReactのクラスコンポーネントを触っていたころ、イベントハンドラのbindを忘れてバグを出したことがある。あのとき「なぜアロー関数で書けば解決するのか」を体感はしていたが、`this`を持たないという仕様として整理できていなかった。本でそこを押さえたことで、いまのコードレビューで「ここはアロー関数でなくて意図的ですか？」と聞けるようになった。

## 分割代入は「読みやすさ」への投資

分割代入は使っていたが、ネストが深いときに書き方を迷っていた。

```typescript
// API レスポンスを受け取る例
type UserResponse = {
  user: {
    id: number;
    profile: {
      name: string;
      age: number;
    };
  };
};

// 分割代入なし
const handleUser = (response: UserResponse) => {
  const name = response.user.profile.name;
  const age = response.user.profile.age;
  console.log(`${name} (${age}歳)`);
};

// 分割代入あり（デフォルト値も設定できる）
const handleUserV2 = ({ user: { profile: { name, age = 0 } } }: UserResponse) => {
  console.log(`${name} (${age}歳)`);
};
```

本で学び直して気づいたのは、デフォルト値の設定ができること、配列にも使えること、そして関数の引数に直接書けることの組み合わせで使い方の幅がかなり広がるという点だ。

チーム内のコードレビューで「関数の引数はオブジェクトで受け取り、分割代入で展開する」というスタイルを提案できたのも、ここを体系的に整理したからだった。

## スプレッド構文でイミュータブルな更新を習慣づける

最初に「なぜここではスプレッド構文を使わないんですか？」と聞かれた件に戻る。

Reactの状態管理でオブジェクトを直接ミューテートしていた箇所があった。動いていたが、スプレッド構文でコピーして更新する書き方に統一すべきだという指摘だった。

```typescript
type Cart = {
  items: string[];
  total: number;
};

// NG：直接ミューテートしている
const addItemBad = (cart: Cart, item: string) => {
  cart.items.push(item); // 元のオブジェクトを変更してしまう
  return cart;
};

// OK：スプレッドで新しいオブジェクトを生成
const addItemGood = (cart: Cart, item: string): Cart => ({
  ...cart,
  items: [...cart.items, item],
});
```

本書ではスプレッド構文の章でイミュータブルな操作の重要性まで踏み込んでいる。「そういうもの」として使っていたパターンに理由がついた感覚があった。

## テンプレートリテラルは文字列操作の認識を変える

文字列の連結を`+`でつなぐ書き方をすっかりやめたのはいつからだったか、正確には覚えていない。しかしテンプレートリテラルが持つ表現力は、改行を含む文字列やタグ付きテンプレートの話になると、まだ自分の中に整理が不足していた。

```typescript
// 複数行の文字列も自然に書ける
const message = `
  Dear ${userName},

  ${itemCount}件の注文を確認しました。
  合計金額: ¥${totalPrice.toLocaleString()}
`;

// タグ付きテンプレート（SQLエスケープなどに使われる）
const sql = (strings: TemplateStringsArray, ...values: unknown[]) => {
  return strings.reduce((acc, str, i) => {
    const value = values[i - 1];
    return acc + (typeof value === "string" ? `'${value}'` : value) + str;
  });
};
```

タグ付きテンプレートはORMの内部実装などで使われていたが、「魔法の構文」として避けていた。本書で仕組みを理解してからは、コードレビューで「これはタグ付きテンプレートを使うと意図が明確になりますよ」と伝えられるようになった。

## 記号を見て「なぜ」を答えられるか

ES6+の構文は、動くコードを書くだけなら雰囲気でも使える。しかしチームの中で「なぜこう書くか」を説明しなければならない立場になったとき、体系的な理解の有無が露わになる。

本書を読んでよかったのは、知らなかった構文を覚えたことよりも、知っていたつもりの構文に「なぜ」をつけられたことだ。独学→実務という経路だと知識が点在しがちで、こういう「地図を描き直す」機会が定期的に必要だと感じる。

## まとめ

ES6+の構文はドキュメントを調べれば使い方はわかる。しかし「なぜそう書くのか」「他の書き方とどう違うのか」を言語化できるかどうかは別の話だ。

テックリードとしてコードレビューでコメントするたびに、自分の言語化能力の精度が試される。本書はその精度を上げるための良い機会になった。構文を覚えるための本ではなく、書き方の意図を整理するための本として使うと、経験者にも価値がある。ES6+の構文を整理した次のステップとして、スコープやクロージャ、`this`の挙動まで踏み込むと理解がさらに深まる——[JavaScriptのスコープとthisで詰まったこと——本格入門で理解が深まった概念](/blog/javascript-scope-closure)でその整理をまとめている。

---

他の記事も読む → [taka-techblog.com](https://www.taka-techblog.com?utm_source=zenn&utm_medium=referral)
X でも発信中 → [@_taka_tech](https://x.com/_taka_tech)
