---
title: "フロントエンドエンジニアが最低限知っておくべきアクセシビリティ入門"
emoji: "♿"
type: "tech"
topics: ["React", "nextjs", "TypeScript"]
published: false
canonical_url: "https://www.taka-techblog.com/blog/frontend-accessibility-intro"
---

:::message
この記事は [taka-techblog](https://www.taka-techblog.com/blog/frontend-accessibility-intro?utm_source=zenn&utm_medium=referral) にも掲載しています。
:::

アクセシビリティはコードを書き始めると後回しにしやすい。医療系システムの開発に携わっていると、法的要件や患者安全の観点からも無視できない。基本的な実装パターンを身につけておくと、普段のフロントエンド開発全体のコード品質が上がる。

## 1. セマンティックHTMLを使う

```tsx
// ❌ divだらけのマークアップ
<div onClick={handleNav}>
  <div class="nav-item">Home</div>
</div>

// ✅ セマンティックなマークアップ
<nav aria-label="メインナビゲーション">
  <a href="/">Home</a>
</nav>
```

`<button>`と`<a>`の使い分けが特に重要。**URLが変わる**なら`<a>`、**アクションが起きる**なら`<button>`。

## 2. ARIA属性を正しく使う

```tsx
// アイコンボタンにはテキストラベルがないため aria-label が必須
<button aria-label="メニューを閉じる">
  <CloseIcon />
</button>

// 開閉状態を伝える
<button aria-expanded={isOpen} aria-controls="dropdown-menu">
  メニュー
</button>

// 動的な変化をスクリーンリーダーに通知する
<div aria-live="polite">
  {errorMessage && <p role="alert">{errorMessage}</p>}
</div>
```

## 3. キーボード操作に対応する

```tsx
// Enter・Spaceキーでの操作（ただしbuttonを使う方が確実）
<div
  role="button"
  tabIndex={0}
  onKeyDown={(e) => {
    if (e.key === 'Enter' || e.key === ' ') handleClick();
  }}
>
  カスタムボタン
</div>
```

モーダルが開いているときはフォーカストラップも必要。実務では`@radix-ui/react-dialog`などのアクセシブルなコンポーネントライブラリを使うと安全だ。

## 4. カラーコントラストを確保する

| テキストサイズ | 必要なコントラスト比（WCAG 2.1 AA） |
|---|---|
| 通常テキスト（〜18px） | 4.5:1 以上 |
| 大きなテキスト（18px以上） | 3:1 以上 |

確認ツール: [WebAIM Contrast Checker](https://webaim.org/resources/contrastchecker/)

## 5. 画像にはalt属性を必ず入れる

```tsx
// 意味のある画像
<img src="/profile.jpg" alt="山田太郎のプロフィール写真" />

// 装飾的な画像はスキップさせる
<img src="/decoration.svg" alt="" aria-hidden="true" />
```

## まずやるべき5つ

1. `<div onClick>` を `<button>` に置き換える
2. `<img>` に `alt` を入れる
3. `<nav>` に `aria-label` をつける
4. フォームのエラーメッセージに `aria-live="polite"` をつける
5. Lighthouseでスコアを確認する習慣をつける

このトピックは以下の書籍の7章で扱われている。

https://www.amazon.co.jp/dp/4297129167

---

他の記事も読む → [taka-techblog.com](https://www.taka-techblog.com?utm_source=zenn&utm_medium=referral)
X でも発信中 → [@_taka_tech](https://x.com/_taka_tech)
