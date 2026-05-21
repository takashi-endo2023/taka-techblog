# taka-techblog 開発ルール

## プロジェクト概要

- **サイト**: https://taka-techblog.com
- **フレームワーク**: Astro (SSG, `output: 'static'`)
- **ホスティング**: S3 + CloudFront (AWS)
- **インフラ**: AWS CDK (`infra/` ディレクトリ)
- **デプロイ**: GitHub Actions (main push で自動)
- **Zenn連携**: `articles/` ディレクトリ → push で自動公開

---

## 記事を書くとき（必須）

ブログ記事を新規作成・更新するときは、**必ず以下の2ファイルをセットで作成・更新する**。

### 1. ブログ記事（taka-techblog.com）

- パス: `src/content/blog/<slug>.md`
- slug はタイトルを英語ハイフン繋ぎで命名（例: `nestjs-lambda-deployment.md`）
- frontmatter フォーマット（全フィールド必須）:
  ```yaml
  ---
  title: ""
  description: ""   # 120文字前後、検索結果に表示されるので具体的に
  pubDate: "YYYY-MM-DD"
  tags: []           # 2〜5個。既存タグと表記を合わせる
  ---
  ```
- `updatedDate` は既存記事を更新したときのみ追加
- `.mdx` は AmazonCard コンポーネントを使う記事のみ。通常は `.md`

### 2. Zenn記事（zenn.dev）

- パス: `articles/<hash>.md`
- 新規作成時は `npx zenn-cli new:article` でファイル名を生成
- frontmatter フォーマット:
  ```yaml
  ---
  title: ""
  emoji: ""      # 記事の内容に合った絵文字1つ
  type: "tech"   # tech: 技術記事 / idea: アイデア・考察
  topics: []     # 最大5つ、Zennの既存トピック名に合わせる
  published: true
  ---
  ```
- 本文冒頭に必ずメッセージブロックを追加:
  ```
  :::message
  この記事は [taka-techblog](https://taka-techblog.com/blog/<slug>?utm_source=zenn&utm_medium=referral) にも掲載しています。
  :::
  ```
- 本文末尾に必ずフッターを追加:
  ```
  ---

  他の記事も読む → [taka-techblog.com](https://taka-techblog.com?utm_source=zenn&utm_medium=referral)
  X でも発信中 → [@taka_tech1988](https://x.com/taka_tech1988)
  ```

### よく使う Zenn topics 対応表

| ブログ tags | Zenn topics |
|---|---|
| TypeScript | TypeScript |
| React / Next.js | React, Next.js |
| NestJS | NestJS |
| AWS | AWS |
| Claude Code / LangChain | AI, LLM |
| チーム開発 | チーム開発 |
| キャリア | キャリア |

---

## デザイン・スタイルのルール

### CSS変数（変更しない）

```css
--color-bg: #0f1117
--color-surface: #1a1d27
--color-border: #2a2d3a
--color-text: #e2e8f0
--color-text-muted: #8892a4
--color-accent: #7c6af7        /* メインアクセント（紫） */
--color-accent-hover: #9d8ffa
--font-sans: 'Inter', 'Hiragino Kaku Gothic ProN', ...
--font-mono: 'JetBrains Mono', 'Fira Code', ...
--radius: 8px
--max-width: 860px
```

### UIコンポーネントのパターン

- カード: `background: var(--color-surface); border: 1px solid var(--color-border); border-radius: var(--radius);`
- ホバー時ボーダー: `border-color: var(--color-accent);`
- ボタン: `.btn-primary`（紫塗り）/ `.btn-outline`（枠線）のグローバルクラスを使う
- タグ/バッジ: `.tag` グローバルクラスを使う
- アニメーション: `animate-fade-in-up`（フェードイン） / `delay-1`〜`delay-3`（遅延クラス）

### 新しいページを追加するとき

`BaseLayout.astro` を使う。`BlogLayout.astro` はブログ記事専用。

```astro
---
import BaseLayout from '../layouts/BaseLayout.astro';
---
<BaseLayout title="ページ名 | taka-techblog" description="説明文">
  <div class="container page-content">
    <!-- コンテンツ -->
  </div>
</BaseLayout>
```

---

## ファイル構成

```
src/
  content/blog/       ← ブログ記事（.md / .mdx）
  components/         ← 共通コンポーネント（BlogCard, AmazonCard, Header, Footer, Pagination）
  layouts/            ← BaseLayout, BlogLayout
  pages/
    blog/             ← 一覧（ページネーション）・記事詳細・タグ・RSS
    portfolios/       ← 実績一覧
    og/               ← OGP画像自動生成（satori + @resvg/resvg-js）
    about.astro       ← プロフィール
    uses.astro        ← 使用ツール・環境紹介
    contact.astro     ← お問い合わせ（Googleフォーム埋め込み）
    search.astro      ← 全文検索（Pagefind）
    privacy.astro     ← プライバシーポリシー
  styles/global.css   ← グローバルスタイル・CSS変数
articles/             ← Zenn記事（push で自動公開）
books/                ← Zenn本（現在未使用）
infra/                ← AWS CDK
docs/                 ← 運営ドキュメント（todo.md, article-plan.md など）
public/
  images/portfolio/   ← ポートフォリオのスクリーンショット置き場
  logo.png            ← 猫ロゴ（ファビコン・アバターに使用）
```

---

## インフラ変更のルール

- インフラ変更は必ず `infra/` 以下の CDK コードを修正する
- 新しいサブドメイン/サービスを追加するときは `infra/cdk.json` にコンテキスト値を追加し、`infra/lib/blog-stack.ts` で参照する
- CDK デプロイ前に `npx tsc --noEmit` でタイプチェックを通す
- Lambda のコードは CI/CD でデプロイするため、CDK では `Code.fromInline` のプレースホルダーを使う
- デプロイ後の Output 値は `docs/todo.md` の表に記録する

### 新しいサービスを追加するパターン（CDK）

1. `cdk.json` にコンテキスト追加（バケット名・サブドメイン・GitHubリポジトリ名）
2. `bin/app.ts` でコンテキストを読み取り BlogStack に渡す
3. `lib/blog-stack.ts` に S3 + CloudFront + Route53 A レコードを追加
4. `GithubActionsRole` の `StringLike` 条件に新リポジトリを追加
5. IAM ポリシーに S3/CloudFront 操作権限を追加
6. `CfnOutput` でバケット名・ディストリビューション ID を出力

---

## ブランド・表記のルール

- サイト名: `taka-techblog`（小文字ハイフン繋ぎ、スペースなし）
- X アカウント: `@taka_tech1988`
- GitHub: `takashi-endo2023`
- ページタイトル形式: `ページ名 | taka-techblog`
- 絵文字はコードには書かない（ユーザーから明示的に求められた場合のみ）

---

## やってはいけないこと

- `node_modules/` を git に追加しない
- `.env` や API キーをコードにハードコードしない（GitHub Secrets 経由で渡す）
- `git push --force` は使わない
- CDK デプロイを確認なしに実行しない（本番インフラに影響するため、実行前に確認する）
- `cdk destroy` は絶対に実行しない
