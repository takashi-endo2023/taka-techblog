---
title: "JavaScriptのスコープとthisで詰まったこと——本格入門で理解が深まった概念"
emoji: "🔭"
type: "tech"
topics: ["JavaScript","TypeScript"]
published: false
published_at: "2023-08-01 09:00"
canonical_url: "https://www.taka-techblog.com/blog/javascript-scope-closure"
---

:::message
この記事は [taka-techblog](https://www.taka-techblog.com/blog/javascript-scope-closure?utm_source=zenn&utm_medium=referral) にも掲載しています。
:::



JavaScriptで最初に「こんなはずじゃなかった」と思った経験は、だいたいスコープか`this`がらみだと思う。

私もそうだった。独学でコードを書いていたころ、`var`で宣言した変数がループの外で生きていたり、`this`がイベントハンドラの中で突然違うものを指したりして、何時間も悩んだことがある。

業務でJavaScriptを数年書いて「なんとなくわかった」状態になっていたが、テックリードとしてチームのコードを見るようになって「なぜこう書くのか」を言語化できない場面が出てきた。「JavaScript本格入門（山田祥寛 著 技術評論社）」を読んだのは、そこを整理したかったからだ。

## varの問題：関数スコープとホイスティング

現在のコードでは`var`を使う場面はほぼない。しかしレガシーコードのメンテナンスや、`var`の挙動を知らずに詰まっているメンバーのサポートをするために、理解は必要だ。

```javascript
// varはブロックスコープを持たない
for (var i = 0; i < 3; i++) {
  setTimeout(() => console.log(i), 100);
}
// 出力：3, 3, 3（期待は0, 1, 2）

// letはブロックスコープを持つ
for (let j = 0; j < 3; j++) {
  setTimeout(() => console.log(j), 100);
}
// 出力：0, 1, 2

// varはホイスティングされる
console.log(x); // undefinedが出力される（エラーにならない）
var x = 10;

// letはホイスティングされるが初期化前はアクセス不可
// console.log(y); // ReferenceError
let y = 10;
```

`var`のループ問題は独学時代に実際に踏んだバグだ。そのときは「なぜ3が三回出るのか」をしばらく理解できなかった。本書でホイスティングとスコープの関係を体系的に読んで、あのバグの原因が腑に落ちた。

## クロージャ：「捕まえた」変数が生き続ける仕組み

クロージャはJavaScriptの中で、知っていると知らないとでは書けるコードの幅が大きく変わる概念だ。

「関数が定義されたときのスコープの変数を参照し続ける関数」という定義は、説明として正しいが初見ではわかりにくい。実務でよく使うパターンと一緒に理解する方が腹落ちする。

```typescript
// カウンターのクロージャ
const createCounter = () => {
  let count = 0; // この変数を内側の関数が「捕まえる」

  return {
    increment: () => ++count,
    decrement: () => --count,
    getCount: () => count,
  };
};

const counter = createCounter();
counter.increment(); // 1
counter.increment(); // 2
counter.decrement(); // 1
console.log(counter.getCount()); // 1

// countには外部から直接アクセスできない
// console.log(counter.count); // undefined
```

`count`変数は`createCounter`の実行が終わっても生き続ける。それはreturnされた関数たちが`count`を参照しているからだ。

実務での使いどころとして、Reactの`useState`がクロージャの仕組みで動いていることを伝えるとチームメンバーの理解が早まった経験がある。フックの内部でコンポーネントの状態が保持される仕組みは、クロージャなしには説明できない。

## thisの迷宮：呼ばれ方で変わるthis

JavaScriptの`this`は、最初の難関だ。

他の言語では`this`（または`self`）はオブジェクト自身を指すのが一般的だが、JavaScriptでは「呼ばれ方」によって変わる。

```typescript
const user = {
  name: "Taka",
  greet() {
    console.log(`Hello, ${this.name}`);
  },
};

// メソッドとして呼ぶ：thisはuserを指す
user.greet(); // Hello, Taka

// 関数として呼ぶ：thisはundefined（strictモード）またはグローバル
const greet = user.greet;
greet(); // Hello, undefined（または TypeError）

// イベントハンドラ：thisはイベントが発生した要素を指す
document.getElementById("btn")?.addEventListener("click", user.greet);
// Hello, undefined（thisがボタン要素になるため）

// bindで固定する
const boundGreet = user.greet.bind(user);
boundGreet(); // Hello, Taka
```

Reactのクラスコンポーネントを書いていたころ、コンストラクタで`this.handleClick = this.handleClick.bind(this)`と書くパターンの意味がわかっていなかった。本書でメソッドの参照渡しと`this`のバインドの関係を整理してから、あのパターンの意図が明確になった。

## アロー関数とthisの関係

前述のコードでも触れたが、アロー関数は`this`を持たない。これはES6+の構文学習の文脈でも出てくるが、スコープとセットで理解するのが大切だ。

```typescript
class Timer {
  private count = 0;

  // 通常のメソッド：thisはインスタンスを指す
  start() {
    // コールバックをアロー関数にしないとthisがずれる
    setInterval(function () {
      this.count++; // thisはundefined（strictモード）
      console.log(this.count); // NaN
    }, 1000);
  }

  startFixed() {
    // アロー関数ならthisは外側のスコープ（Timerインスタンス）を参照
    setInterval(() => {
      this.count++;
      console.log(this.count); // 1, 2, 3...
    }, 1000);
  }
}
```

「アロー関数はthisを持たない」という事実が、なぜ有利に働くのかがここでわかる。外側のスコープの`this`を引き継ぐので、クラスメソッド内のコールバックとして使うと意図通りに動く。

## スコープチェーンを意識するとデバッグが速くなる

スコープチェーンは「変数を探す順番」を決めるルールだ。現在のスコープで見つからなければ外側のスコープを探し、最終的にグローバルスコープまで遡る。

```typescript
const globalVar = "global";

const outer = () => {
  const outerVar = "outer";

  const inner = () => {
    const innerVar = "inner";
    console.log(innerVar); // "inner"（自分のスコープ）
    console.log(outerVar); // "outer"（外側のスコープ）
    console.log(globalVar); // "global"（グローバルスコープ）
  };

  inner();
};

outer();
```

このスコープチェーンを理解していると、「なぜこの変数がここで使えるのか」「なぜundefinedになるのか」のデバッグが速くなる。チームで新しいメンバーが変数スコープ関連のバグで詰まっているとき、スコープチェーンの話をするだけで解決することがある。

## まとめ

スコープ・クロージャ・`this`は、JavaScriptの「なぜ動く/動かないか」の根幹にある概念だ。雰囲気で書いていても動くコードは書けるが、バグったときに原因を見つけられない、チームメンバーに説明できない、という場面で壁にぶつかる。

本書を通じて改めて整理したことで、「この書き方はなぜ問題なのか」をコードレビューで言語化できる精度が上がった。理解が足りない状態でも動くのがJavaScriptの怖さであり、だからこそ意識的に学び直す機会が必要だと感じる。スコープを理解した次は、非同期処理の仕組みを掴むと実務での詰まりが大幅に減る——[JavaScriptの非同期処理を整理する——コールバック・Promise・async/awaitの使い分け](/blog/javascript-async-promise)に続けて読むことをおすすめする。

---

他の記事も読む → [taka-techblog.com](https://www.taka-techblog.com?utm_source=zenn&utm_medium=referral)
X でも発信中 → [@_taka_tech](https://x.com/_taka_tech)
