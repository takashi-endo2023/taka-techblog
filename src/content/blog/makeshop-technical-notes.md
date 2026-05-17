---
title: "MakeShopでECサイトを立ち上げた技術的な話 — ノーコードの限界とJavaScript注入"
description: "エンジニアがノーコードECプラットフォームのMakeShopを使ってみて気づいた、カスタマイズの限界とJavaScript注入による突破口。GA4連携や動的コンテンツの実例を交えて整理する。"
pubDate: "2026-05-05"
tags: ["MakeShop", "EC", "ノーコード", "JavaScript"]
---

副業でECサイトの立ち上げを手伝う機会があり、MakeShopを使うことになった。普段はTypeScriptやNext.jsを書いているので「ノーコードツールなんて簡単だろう」と高を括っていたが、実際には独特の制約との格闘だった。

## MakeShopとは

MakeShopはGMOメイクショップが提供するノーコードECプラットフォームで、月額料金で使えるSaaSタイプのサービスだ。ShopifyやBASEと同じカテゴリだが、国内の決済やコンビニ払い対応の充実度が強みとされている。

管理画面でテンプレートを選んで商品を登録するだけで、数時間でECサイトが動き始める。エンジニアでない人が運用することを前提に設計されており、コードを書かずに完結できる。

## カスタマイズできること・できないこと

MakeShopで触れる範囲を整理するとこうなる。

**できること**
- テンプレートのHTMLとCSSを直接編集（管理画面のテンプレートエディタから）
- `<head>`タグ内へのカスタムスクリプト・スタイルの追加
- 独自のLiquidライクな変数（MakeShop独自タグ）を使ったテンプレート記述

**できないこと**
- サーバーサイドのロジック変更（バックエンドは完全にMakeShop管理）
- 決済フローのUI変更
- データベースへの直接アクセス

最初にこの境界線を把握しておかないと、「これもできるはずだ」と無駄な時間を使う。

## JavaScript注入で実現できること

HTMLテンプレートにJavaScriptを直接書けるため、フロントエンドの自由度はそれなりにある。

### GA4連携

```html
<!-- 管理画面の<head>タグ設定に追加 -->
<script async src="https://www.googletagmanager.com/gtag/js?id=G-XXXXXXXXXX"></script>
<script>
  window.dataLayer = window.dataLayer || [];
  function gtag(){dataLayer.push(arguments);}
  gtag('js', new Date());
  gtag('config', 'G-XXXXXXXXXX');
</script>
```

購入完了ページには`{{order_id}}`などのMakeShop独自変数が使えるため、コンバージョンタグに注文IDを渡すこともできる。

### 動的コンテンツの差し込み

バナーをAPIから取得して差し込む処理も、`DOMContentLoaded`を使えば実現できる。

```javascript
document.addEventListener('DOMContentLoaded', () => {
  fetch('https://example.com/api/banners')
    .then(res => res.json())
    .then(data => {
      const container = document.getElementById('js-banner');
      if (container) {
        container.innerHTML = data.html;
      }
    });
});
```

ただし、MakeShopがレンダリングするHTMLはCSPヘッダーの制御外なので、外部ドメインへのリクエストは自己責任で管理する。

## テンプレートHTMLを直接編集するときの注意点

MakeShopのテンプレートには独自タグが散在している。たとえば商品詳細ページでは`{{item_name}}`や`{{item_price}}`が値を埋め込む。これらを誤って削除すると、その情報が表示されなくなる。

テンプレート編集前に必ずHTMLをローカルにコピーしておくこと。管理画面にバージョン管理機能はないため、ミスをしたときに戻れない。Gitで管理するなら、手動でエクスポートして別リポジトリに保存する運用が現実的だ。

CSSはクラス名が衝突しやすいため、独自スタイルは`my-`などのプレフィックスを付ける命名規則を最初に決めておくと後悔しない。

## 「エンジニアがノーコードを使う」ことの学び

正直なところ、最初はノーコードツールを低く見ていた。しかし使ってみると、制約の中でどう解決するかを考える力が試される。

「サーバーサイドが触れないならフロントで解決する」「APIが叩けないなら静的なHTMLに動的な動きを足す」という発想の転換が必要だった。

普段の開発では自由に設計できるぶん、制約の強いツールに乗る経験は視野を広げてくれる。何でも自前実装が最善ではないと、改めて気づいた。

## まとめ

- MakeShopはサーバーサイドには触れないが、HTMLテンプレートとJavaScript注入でフロントエンドはかなり自由に動かせる
- GA4連携やAPIからの動的コンテンツ差し込みは普通に実現できる
- テンプレート編集前は必ずHTMLをバックアップする
- 制約の多いツールを使う経験は、エンジニアとしての問題解決力を磨く良い機会になった
