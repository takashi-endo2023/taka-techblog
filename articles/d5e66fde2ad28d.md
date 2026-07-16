---
title: "フロントエンドエンジニアが最低限知っておくべきアクセシビリティ入門"
emoji: "♿"
type: "tech"
topics: ["React","nextjs","TypeScript"]
published: false
canonical_url: "https://www.taka-techblog.com/blog/frontend-accessibility-intro"
---

:::message
この記事は [taka-techblog](https://www.taka-techblog.com/blog/frontend-accessibility-intro?utm_source=zenn&utm_medium=referral) にも掲載しています。
:::



アクセシビリティはコードを書き始めると後回しにしやすい。「動いているから」「デザインが決まってから」と先送りしているうちに、後から直そうとすると大改修になる。

医療系システムの開発に携わっていると、アクセシビリティは法的要件や患者安全の観点からも無視できない。基本的な実装パターンを身につけておくと、普段のフロントエンド開発全体のコード品質が上がる。

---

## なぜアクセシビリティが必要か

アクセシビリティが必要なのは「障害のあるユーザーのため」だけではない。

- **スクリーンリーダー**を使うユーザー（視覚障害）
- **キーボードのみ**で操作するユーザー（運動障害）
- **低視力**・色覚異常のユーザー
- **音声入力**でナビゲーションするユーザー
- そして**Googlebot**（SEOに直結する）

適切なセマンティックHTMLを書くことはSEOにも効果的だ。

---

## 1. セマンティックHTMLを使う

最も基本的かつ効果的な対応。`div`と`span`だけでUIを組まない。

```tsx
// ❌ divだらけのマークアップ
<div onClick={handleNav}>
  <div class="nav-item">Home</div>
  <div class="nav-item">About</div>
</div>

// ✅ セマンティックなマークアップ
<nav aria-label="メインナビゲーション">
  <a href="/">Home</a>
  <a href="/about">About</a>
</nav>
```

主要なセマンティック要素:

| 要素 | 用途 |
|---|---|
| `<main>` | ページのメインコンテンツ |
| `<nav>` | ナビゲーションリンク群 |
| `<header>` | ページ・セクションのヘッダー |
| `<footer>` | フッター情報 |
| `<article>` | 独立したコンテンツ（記事・投稿） |
| `<section>` | テーマでまとめたコンテンツのまとまり |
| `<button>` | クリックで何かが起きる操作 |
| `<a href>` | ページ遷移・URL移動 |

`<button>`と`<a>`の使い分けは特に重要だ。**URLが変わる**なら`<a>`、**アクションが起きる**なら`<button>`。`<div onClick>`でどちらも代替するのは避ける。

---

## 2. ARIA属性を正しく使う

ARIA（Accessible Rich Internet Applications）は、HTMLだけでは伝わらないUIの意味を補足する属性だ。

### `aria-label` — 要素に名前をつける

```tsx
// アイコンボタンにはテキストラベルがないため aria-label が必須
<button aria-label="メニューを閉じる">
  <CloseIcon />
</button>

// 同じページに複数のnavがある場合、区別できる名前をつける
<nav aria-label="パンくずリスト">...</nav>
<nav aria-label="ページネーション">...</nav>
```

### `aria-expanded` — 開閉状態を伝える

```tsx
const [isOpen, setIsOpen] = useState(false);

<button
  aria-expanded={isOpen}
  aria-controls="dropdown-menu"
  onClick={() => setIsOpen(!isOpen)}
>
  メニュー
</button>
<ul id="dropdown-menu" hidden={!isOpen}>
  ...
</ul>
```

### `aria-live` — 動的な変化をスクリーンリーダーに通知する

```tsx
// フォーム送信後のエラーメッセージなど
<div aria-live="polite" aria-atomic="true">
  {errorMessage && <p role="alert">{errorMessage}</p>}
</div>
```

`aria-live="polite"` は現在の読み上げが終わったあとに通知。`aria-live="assertive"` は即座に割り込む（エラー通知など）。

---

## 3. キーボード操作に対応する

マウスなしで全機能が使えることを確認する。

```tsx
// tabIndex={0} でフォーカス可能にする（div要素は元々フォーカス不可）
// ただし、button・input・a など元々フォーカス可能な要素を使う方が望ましい

// Enter・Spaceキーでの操作
<div
  role="button"
  tabIndex={0}
  onClick={handleClick}
  onKeyDown={(e) => {
    if (e.key === 'Enter' || e.key === ' ') {
      handleClick();
    }
  }}
>
  カスタムボタン
</div>
```

ただし、上記のように`div`に`role="button"`をつけるより、最初から`<button>`を使う方がシンプルで確実だ。

### フォーカストラップ（モーダル）

モーダルが開いているときは、フォーカスをモーダル内に閉じ込める必要がある。

```tsx
// フォーカストラップのシンプルな実装
useEffect(() => {
  if (!isOpen) return;
  const focusableElements = modalRef.current?.querySelectorAll(
    'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
  );
  const first = focusableElements?.[0] as HTMLElement;
  const last = focusableElements?.[focusableElements.length - 1] as HTMLElement;

  const handleKeyDown = (e: KeyboardEvent) => {
    if (e.key !== 'Tab') return;
    if (e.shiftKey) {
      if (document.activeElement === first) {
        e.preventDefault();
        last.focus();
      }
    } else {
      if (document.activeElement === last) {
        e.preventDefault();
        first.focus();
      }
    }
  };

  document.addEventListener('keydown', handleKeyDown);
  first?.focus();
  return () => document.removeEventListener('keydown', handleKeyDown);
}, [isOpen]);
```

実務では`@radix-ui/react-dialog`などのアクセシブルなコンポーネントライブラリを使うと、フォーカストラップやARIA属性が最初から組み込まれているため、自分で実装するより安全だ。

---

## 4. カラーコントラストを確保する

WCAG 2.1のAAレベルでは以下のコントラスト比が必要だ。

| テキストサイズ | 必要なコントラスト比 |
|---|---|
| 通常テキスト（〜18px） | 4.5:1 以上 |
| 大きなテキスト（18px以上 or 太字14px以上） | 3:1 以上 |
| UI部品・グラフィック | 3:1 以上 |

確認ツール: [WebAIM Contrast Checker](https://webaim.org/resources/contrastchecker/)

薄いグレーのプレースホルダーやサブテキストは要注意。デザインが決まった後でコントラスト不足が発覚すると、カラーパレットの見直しになる。開発初期にデザイナーと合わせて確認するのが効率的だ。

---

## 5. 画像にはalt属性を必ず入れる

```tsx
// ✅ 意味のある画像にはalt説明
<img src="/profile.jpg" alt="山田太郎のプロフィール写真" />

// ✅ 装飾的な画像はalt=""（スクリーンリーダーがスキップする）
<img src="/decoration.svg" alt="" aria-hidden="true" />

// ❌ alt属性なし（スクリーンリーダーがファイル名を読み上げる）
<img src="/profile.jpg" />
```

---

## テストツール

| ツール | 用途 |
|---|---|
| Axe DevTools（Chrome拡張） | ページの自動アクセシビリティ診断 |
| Lighthouse | Chrome DevToolsで診断（スコア付き） |
| NVDA（Windows） | 無料のスクリーンリーダー |
| VoiceOver（macOS） | macOS標準のスクリーンリーダー |

自動テストツールで検出できるのはアクセシビリティ問題全体の約30〜40%と言われている。残りは手動確認（キーボード操作・スクリーンリーダー）が必要だ。

---

## まとめ

最初から完璧にする必要はない。まずこの5つから始める。

1. `<div onClick>` を `<button>` に置き換える
2. `<img>` に `alt` を入れる
3. `<nav>` に `aria-label` をつける
4. フォームのエラーメッセージに `aria-live="polite"` をつける
5. Lighthouseでスコアを確認する習慣をつける

アクセシビリティの実践については[TypeScriptとReact/Next.js実践本](/blog/typescript-react-nextjs-book-review)の7章でも触れられている。医療系システムの開発でアクセシビリティが厳しく問われる環境に身を置いてから、本書の内容がより深く理解できるようになった。

---

他の記事も読む → [taka-techblog.com](https://www.taka-techblog.com?utm_source=zenn&utm_medium=referral)
X でも発信中 → [@_taka_tech](https://x.com/_taka_tech)
