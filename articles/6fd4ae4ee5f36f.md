---
title: "TypeScriptとReact/Next.js実践本を読んでテックリードになった後も使い続けている理由"
emoji: "📗"
type: "tech"
topics: ["TypeScript", "React", "nextjs"]
published: false
canonical_url: "https://www.taka-techblog.com/blog/typescript-react-nextjs-book-review"
---

:::message
この記事は [taka-techblog](https://www.taka-techblog.com/blog/typescript-react-nextjs-book-review?utm_source=zenn&utm_medium=referral) にも掲載しています。
:::

実務でReact/TypeScriptを使うことになったとき、私にはほぼゼロの状態から始まった。

独学でHTMLとJavaScriptは触っていたが、TypeScriptもReactも「名前は知っている」程度。そのタイミングで手に取ったのがこの一冊だ。

https://www.amazon.co.jp/dp/4297129167

## この本を買った理由

当時の状況はこうだ。

- エンジニア転職したばかりで実務経験ほぼゼロ
- 独学でJavaScriptは書いたことがある程度
- 職場でNext.js + TypeScriptのプロジェクトに入ることが決まっていた

「とにかく動けるようにならなければ」というプレッシャーの中で選んだ本だった。タイトルに「実践」とあったのと、TypeScript・React・Next.jsが1冊でまとまっていた点が決め手だった。

## 構成の全体像

1. **Next.jsとTypeScriptによるモダン開発** — 全体像と思想
2. **TypeScriptの基礎** — 型定義・Utility Types・設定まで
3. **React/Next.jsの基礎** — コンポーネント・Hooks・レンダリング手法
4. **コンポーネント開発** — Atomic Design・styled-components・Storybook・テスト
5. **アプリケーション開発1〜3** — 設計から実装・デプロイ・SEO・アクセシビリティまで
6. **Appendix** — Stripe・StoryShots・AWS Amplify・i18n

## 章ごとの正直な評価

### 2章：TypeScriptの基礎

Utility Types（`Partial`・`Pick`・`Omit`・`ReturnType`など）まで一通り扱っている。入門として必要なものは揃っているが、実務パターンは本書の範囲を超えてくるため別途深掘りが必要だ。

### 3章：React/Next.jsの基礎

Next.jsのSSG・SSR・ISRの比較は本書の白眉のひとつで、「どれをいつ使うか」の判断軸が整理されている。

### 4章：コンポーネント開発

Atomic Design・styled-components・Storybook・ユニットテストを一気通貫で扱う章で、実用度が高い。

### 5章以降

設計から実装・デプロイ・SEO・アクセシビリティまで体験できる。

## どんな人に向いているか

| 読者タイプ | おすすめ度 |
|---|---|
| React・TypeScript・Next.jsを初めて触る | ★★★★★ |
| 独学でJSは書けるが実務経験がない | ★★★★★ |
| 実務経験はあるが体系的に学び直したい | ★★★★☆ |
| ジュニアエンジニアへの推薦本を探している | ★★★★★ |
| すでにNext.jsを業務で使い慣れている | ★★☆☆☆ |

テックリードになってから、新しくReact/TypeScriptに入ってくるジュニアエンジニアに最初に渡す本として今も使っている。

## 正直に言うと

Next.js App Router登場以降は本書の内容（Pages Router前提）と実際のプロジェクトの乖離が出てきている。基本思想は変わらないが、コードパターンは現行のドキュメントと併用して読むことを勧める。

## まとめ

3つの技術をバラバラに学ぶより、この本で全体像をつかんでから深掘りする方が遠回りにならない。独学エンジニアが実務に入るときのお守りとして、手元に置いておく価値はある。

https://www.amazon.co.jp/dp/4297129167

---

他の記事も読む → [taka-techblog.com](https://www.taka-techblog.com?utm_source=zenn&utm_medium=referral)
X でも発信中 → [@_taka_tech](https://x.com/_taka_tech)
