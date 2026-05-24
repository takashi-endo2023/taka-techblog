---
title: "Atomic Designを実務で使って気づいたこと——設計の共通言語はチームを助ける"
emoji: "🎨"
type: "tech"
topics: ["フロントエンド","React","設計"]
published: false
published_at: "2024-03-12 09:00"
canonical_url: "https://www.taka-techblog.com/blog/atomic-design-in-practice"
---

:::message
この記事は [taka-techblog](https://www.taka-techblog.com/blog/atomic-design-in-practice?utm_source=zenn&utm_medium=referral) にも掲載しています。
:::



コンポーネント設計の方法論としてAtomic Designの名前を聞いたことがある人は多いと思う。

ただ「名前は知っている」と「実際に現場で使える」は全く別の話だ。私がTypeScript + ReactのプロジェクトでAtomic Designを採用したときに気づいたことを、教科書的な説明ではなく実務視点で書いておく。

## Atomic Designとは何か（ざっくり）

Brad Frostが提唱したコンポーネント設計の考え方で、UIを5つの階層に分類する。

| 階層 | 概要 | 例 |
|---|---|---|
| Atoms | これ以上分割できない最小単位 | ボタン、テキスト、アイコン |
| Molecules | Atomsを組み合わせた小さな塊 | 検索フォーム、カード |
| Organisms | Moleculesを組み合わせた意味のある塊 | ヘッダー、商品一覧 |
| Templates | ページのレイアウト骨格 | 2カラムレイアウト |
| Pages | 実際のデータを流し込んだ完成形 | 商品詳細ページ |

これを聞いて「なるほど」となるのは最初だけで、実際に使い始めると「このコンポーネントはどの層？」という判断に日々悩むことになる。

## 採用してよかったこと

### コンポーネントの責務が明確になる

一番の恩恵はここだ。

Atomic Designを採用する前は「なんとなくコンポーネントに切り出す」スタイルだった。その結果、「このコンポーネントはAPIを叩いていいのか」「状態を持っていいのか」という判断がブレていた。

Atoms / Moleculesは純粋なUIコンポーネント（propsを受け取って表示するだけ）、状態管理やAPIコールはOrganisms以上で行う、というルールが自然に生まれる。責務が層によって分離されるのは設計として素直に良い。

### チームへの説明がしやすくなる

未経験エンジニアを育てる立場でも、Atomic Designは使いやすかった。

「このボタンはAtoms、この検索フォームはMolecules」という共通言語ができることで、コードレビューの指摘がしやすくなる。「このコンポーネントが大きすぎる」という曖昧な指摘ではなく、「これはOrganismの粒度になっているから分割しよう」と具体的に言える。

### Storybookとの相性が抜群

これは後述するが、Atomic Designで整理されたコンポーネントはStorybookでの管理と非常に相性がいい。階層ごとにストーリーを整理できるので、UIカタログとして機能する。

## 正直に言う：困ったこと

### 「どの層か」で議論が起きる

一番消耗したのがこれだ。

たとえば「日付つきのラベルコンポーネント」はAtomsかMoleculesか。チームで意見が割れる。実用上の影響は軽微でも、設計の一貫性を保つために毎回議論が必要になる。

最終的には「迷ったらMolecules」「分割コストが高いと判断したら一段上」という実用的なルールを設けることで収束させた。完璧な分類より、チームで合意した基準を守る方が重要だと学んだ。

### Templatesの概念が浮きやすい

PagesとTemplatesの区別が、実務では曖昧になりやすい。

Next.jsのApp Routerでは `layout.tsx` がテンプレートの役割を持つため、Atomic DesignのTemplates層と役割が重複する。プロジェクトの構成によってはTemplates層をスキップして、Organisms→Pagesとする方がシンプルになることもある。

## 実務での採用方針

試行錯誤の結果、以下の方針に落ち着いた。

**採用する**
- Atoms・Molecules・Organismsの3層は厳守
- Storybookの管理もこの3層に合わせる

**柔軟にする**
- TemplatesはNext.jsのレイアウト機能で代替
- PagesはNext.jsのページファイルそのもの

完全な5層より、実際のフレームワークと整合する形に調整した方が開発体験がよかった。

## まとめ

Atomic Designは「銀の弾丸」ではないが、チームで設計の共通言語を持つための道具として有効だ。

特に未経験エンジニアが混在するチームでは、設計方針を言語化してくれる点が大きい。完璧に運用しようとすると疲弊するので、プロジェクトに合わせてアレンジする前提で採用するのがいいと思っている。Atomic Designで整理したコンポーネントをカタログ化して管理する方法については、[StorybookをReactチームに導入して見えてきたこと——メリットと継続の難しさ](/blog/storybook-team-adoption)にまとめている。

---

他の記事も読む → [taka-techblog.com](https://www.taka-techblog.com?utm_source=zenn&utm_medium=referral)
X でも発信中 → [@_taka_tech](https://x.com/_taka_tech)
