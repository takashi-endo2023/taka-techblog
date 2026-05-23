---
title: "React×Next.jsの選択基準を実務から考える —SPA・SSR・SSGをどう使い分けるか"
emoji: "⚛️"
type: "tech"
topics: ["React", "Next.js", "TypeScript"]
published: false
---

:::message
この記事は [taka-techblog](https://taka-techblog.com/blog/react-nextjs-selection?utm_source=zenn&utm_medium=referral) にも掲載しています。
:::

## はじめに

フロントエンドの技術選定で「Next.js使います」と即答するエンジニアは多いですが、**なぜNext.jsなのか、どのレンダリング方式を使うのか**まで答えられる人は意外と少ない気がします。

私は現在、医療系スタートアップの治験CRM（React SPA）とこのブログ（Astro SSG）の2つのフロントエンドを運用しています。まったく異なる技術選定をした背景を整理しながら、判断基準を言語化してみます。

## 治験CRMでReact SPAを選んだ理由

治験CRMは医師・CRC（臨床研究コーディネーター）が日常的に使う業務システムです。この性質から以下の判断をしました。

**認証必須のプライベートアプリ**。ほぼすべての画面がログイン後にしか見えないため、SEOは不要です。SSRでサーバーサイドでHTMLを生成するメリットが薄い。

**インタラクティブな操作が多い**。フォーム入力、リアルタイムバリデーション、モーダル、ドラッグ&ドロップ。これらはクライアントサイドのstate管理が本質であり、SPAの得意領域です。

**APIはNestJS（別オリジン）で管理済み**。すでにバックエンドのAPIサーバーが存在するため、Next.jsのAPI Routesは不要です。

```typescript
// CRMのようなSPAでは、クライアント側のキャッシュとstate管理が核心
const { data: trials, isLoading } = useQuery({
  queryKey: ["trials", filters],
  queryFn: () => fetchTrials(filters),
  staleTime: 1000 * 60 * 5, // 5分キャッシュ
});
```

## このブログでAstro SSGを選んだ理由

ブログは治験CRMとは正反対の特性を持ちます。

- **コンテンツは静的**: 記事を書いたら内容は変わらない
- **SEOが重要**: 検索流入を増やしたい
- **インタラクティブ性は最小限**: 記事を読むだけ

この条件に「ビルド時にすべてHTMLを生成するSSG」がぴったりはまりました。Astroを選んだのはNext.jsよりもさらに「静的サイト特化」で、デフォルトでJavaScriptを一切クライアントに送らない設計だからです。

パフォーマンスとコストの両面でも、S3 + CloudFrontで静的ファイルを配信するシンプルな構成が最適解でした。

## App Router vs Pages Routerの使い分け判断

Next.jsを使うと決めた場合のApp Router vs Pages Routerの判断基準です。

**App Routerを選ぶとき**:
- React Server Componentsを積極的に使いたい
- ネストされたレイアウトを複数定義したい
- データフェッチをコンポーネント単位で管理したい
- 新規プロジェクトで長期的に保守する

**Pages Routerを選ぶとき**:
- 既存のPages Routerプロジェクトのメンテナンス
- チームがApp Routerに不慣れで学習コストを払えない
- `getServerSideProps`/`getStaticProps`で運用が安定している

個人的にはApp Routerの`use server`/`use client`の使い分けがチーム全員に浸透するまでに時間がかかると感じているので、**チームの習熟度が判断の最大要素**だと思っています。

## CSR / SSR / SSG / ISRのユースケース

| 方式 | タイミング | 向いているケース |
|------|-----------|-----------------|
| CSR | ブラウザ | 認証後の業務画面、ダッシュボード |
| SSR | リクエスト時 | ECのカート画面、ユーザー固有データを含むページ |
| SSG | ビルド時 | ブログ、ドキュメント、マーケティングLP |
| ISR | ビルド後に再生成 | ニュース、頻繁に更新されるが全ページSSGは重い場合 |

ISRは「SSGの速さとSSRの鮮度のいいとこ取り」ですが、revalidateの設定ミスでキャッシュが古いまま残るリスクがあるため、キャッシュ戦略の設計に注意が必要です。

```typescript
// App RouterでのISR設定例
export const revalidate = 3600; // 1時間ごとに再生成

// または動的に設定
export async function generateStaticParams() {
  const posts = await fetchAllPosts();
  return posts.map((post) => ({ slug: post.slug }));
}
```

## 実務での判断基準チェックリスト

技術選定時に自分が使っているチェックリストです。

**CSR（SPA）でいい条件**
- [ ] SEOが不要（認証後のみアクセス可能）
- [ ]インタラクティブな操作が多い
- [ ]バックエンドAPIが別途存在する
- [ ]リアルタイム更新が必要

**SSGが最適な条件**
- [ ]コンテンツが頻繁に変わらない
- [ ] SEOが重要
- [ ]インタラクティブ性が低い
- [ ] CDNで静的配信したい

**SSRを選ぶ条件**
- [ ]ユーザーごとに異なるデータを表示する
- [ ] SEOが必要かつデータが動的
- [ ]リクエスト時の認証状態を見てページを出し分けたい

## まとめ

「とりあえずNext.js」ではなく、プロダクトの性質を見て技術を選ぶことが大切です。

- **業務システム（認証済み・インタラクティブ）** →React SPA
- **ブログ・ドキュメント（静的・SEO重視）** →SSG（Astro or Next.js）
- **ECサイト・ニュース（動的・SEO重視）** →SSR or ISR

判断軸は「SEOが必要か」「データは静的か動的か」「リアルタイム性が必要か」の3点に尽きます。この軸を持っているだけで、技術選定の説明責任を果たせるようになります。

---

他の記事も読む → [taka-techblog.com](https://taka-techblog.com?utm_source=zenn&utm_medium=referral)
X でも発信中 → [@taka_tech1988](https://x.com/taka_tech1988)
