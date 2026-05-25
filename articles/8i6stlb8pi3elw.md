---
title: "Next.jsでSEOを実装するときに押さえるべきこと——メタデータからJSON-LDまで"
emoji: "🔍"
type: "tech"
topics: ["Next.js","React","SEO"]
published: false
published_at: "2024-05-14 09:00"
canonical_url: "https://www.taka-techblog.com/blog/nextjs-seo-implementation"
---

:::message
この記事は [taka-techblog](https://www.taka-techblog.com/blog/nextjs-seo-implementation?utm_source=zenn&utm_medium=referral) にも掲載しています。
:::



「Next.jsはSEOに強い」とよく言われる。確かにSSR・SSGでサーバーサイドレンダリングができるため、クライアントサイドのみのSPAより検索エンジンに有利だ。

ただ「Next.jsを使っているからSEOは大丈夫」は大きな誤解だ。適切な設定をしなければ、せっかくのSSR・SSGも活かしきれない。

このブログ（Astro製）の構築経験も踏まえながら、Next.jsでSEOを実装するときに押さえるべきポイントを整理する。

## SEOの基本：何を設定するか

Next.jsでSEO対策として設定すべき項目を優先度順に並べる。

| 項目 | 優先度 | 説明 |
|---|---|---|
| title / description | 必須 | 検索結果に表示されるタイトルと説明文 |
| OGP（og:titleなど） | 高 | SNSシェア時のプレビュー |
| canonical URL | 高 | 重複コンテンツを防ぐ |
| JSON-LD（構造化データ） | 中 | リッチスニペット表示に影響 |
| サイトマップ | 中 | クローラーへのページ案内 |
| robots.txt | 中 | クロール制御 |

## App Routerでの実装

Next.js 13以降のApp Routerでは、`metadata` オブジェクトでSEO設定を管理できる。

### 静的なメタデータ

```typescript
// app/about/page.tsx

export const metadata: Metadata = {
  title: 'About | My Blog',
  description: 'フルスタックエンジニアのブログです。',
  openGraph: {
    title: 'About | My Blog',
    description: 'フルスタックエンジニアのブログです。',
    url: 'https://example.com/about',
    siteName: 'My Blog',
    images: [
      {
        url: 'https://example.com/og-image.png',
        width: 1200,
        height: 630,
      },
    ],
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'About | My Blog',
    description: 'フルスタックエンジニアのブログです。',
    images: ['https://example.com/og-image.png'],
  },
};
```

### 動的なメタデータ（記事ページなど）

```typescript
// app/blog/[slug]/page.tsx

type Props = {
  params: { slug: string };
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const post = await getPost(params.slug);

  return {
    title: `${post.title} | My Blog`,
    description: post.description,
    openGraph: {
      title: post.title,
      description: post.description,
      type: 'article',
      publishedTime: post.pubDate.toISOString(),
      images: [`https://example.com/og/${params.slug}.png`],
    },
  };
}
```

## JSON-LD（構造化データ）の実装

Googleの検索結果でリッチスニペット（投稿日・著者名などの追加情報）を表示するには、JSON-LDの追加が必要だ。

```typescript
// app/blog/[slug]/page.tsx
export default async function BlogPost({ params }: Props) {
  const post = await getPost(params.slug);

  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'Article',
    headline: post.title,
    description: post.description,
    datePublished: post.pubDate.toISOString(),
    author: {
      '@type': 'Person',
      name: '著者名',
      url: 'https://example.com/about',
    },
    publisher: {
      '@type': 'Organization',
      name: 'My Blog',
      url: 'https://example.com',
    },
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <article>{/* ... */}</article>
    </>
  );
}
```

## サイトマップの自動生成

Next.js 13.3以降では `sitemap.ts` を作るだけで自動生成できる。

```typescript
// app/sitemap.ts

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const posts = await getAllPosts();

  const postUrls = posts.map((post) => ({
    url: `https://example.com/blog/${post.slug}`,
    lastModified: post.updatedDate ?? post.pubDate,
    changeFrequency: 'weekly' as const,
    priority: 0.8,
  }));

  return [
    {
      url: 'https://example.com',
      lastModified: new Date(),
      changeFrequency: 'daily',
      priority: 1,
    },
    {
      url: 'https://example.com/about',
      changeFrequency: 'monthly',
      priority: 0.5,
    },
    ...postUrls,
  ];
}
```

## 実務で気をつけていること

### titleは各ページで必ずユニークにする

全ページ同じtitleにしているサイトが実際にある。Googleは重複タイトルを低品質のシグナルとして扱う。`ページ名 | サイト名` の形式で各ページ固有にする。

### OGP画像はPNGで用意する

SVGはTwitter/Xで表示されない。OGP画像は 1200×630pxのPNGを用意する。記事ごとに動的生成するなら `satori` + `@resvg/resvg-js` の組み合わせがビルド時生成に使える。

### canonicalは自分自身を指すように設定する

Next.jsの `metadata` では以下で設定できる。

```typescript
export const metadata: Metadata = {
  alternates: {
    canonical: 'https://example.com/blog/this-post',
  },
};
```

クロスポスト（Zennなどにも同じ記事を掲載）する場合は、canonicalを元記事のURLに設定することで重複コンテンツと判断されるリスクを下げられる。

### descriptionは120文字以内を目安に

検索結果でのスニペット表示は約120文字。長すぎると省略されてしまう。キーワードを含みつつ、クリックしたくなる文章にすることが重要だ。

## まとめ

Next.jsのSEO対策は、フレームワークの機能を使えば実装自体は難しくない。

ただし「設定した」で終わりではなく、Google Search Consoleでインデックス状況とパフォーマンスを継続的に確認することが重要だ。SEOは設定ではなくコンテンツと継続の話なので、技術的な基盤を整えた上で記事を書き続けることが最終的な答えになる。SEO実装の前提となるレンダリング手法の選び方については、[Next.jsのSSR・SSG・ISRを実務でどう使い分けるか](/blog/nextjs-rendering-deep-dive)に判断基準をまとめている。

---

## この記事を読んだ方へ

> **PR** 似た領域で実務に関わる方へ

似た領域で実務に関わる方は、定期的に外の市場感を把握しておくと判断軸が増える。今すぐ動く動かないは別として、自分のスキルがどう評価されるかを知っておく価値はある。

IT/WEB/ゲーム業界専門のエージェントならが分かりやすい。エンジニアに特化しているので、年収レンジを掴む目的だけでも使える。

---

他の記事も読む → [taka-techblog.com](https://www.taka-techblog.com?utm_source=zenn&utm_medium=referral)
X でも発信中 → [@_taka_tech](https://x.com/_taka_tech)
