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

**週次運用の詳細手順 → `docs/operations.md`**

**ブログ記事が唯一の正解。Zenn記事はスクリプトで自動生成する。**

> `articles/<hash>.md` を直接編集しない。ブログ記事を編集したあと必ず `npm run sync:zenn` を実行する。

### 記事作成・更新のフロー

**既存記事を更新するとき:**
```bash
# 1. ブログ記事を編集
# 2. Zennに同期
npm run sync:zenn
# 3. push
```

**新記事を作るとき:**
```bash
# 1. ブログ記事を作成（src/content/blog/<slug>.md）
# 2. pubDate を「次の公開枠」に自動算出（最新記事 + cadence日数）
node scripts/content-plan.js --next   # → 使うべき pubDate を出力
# 3. Zennのハッシュを取得（1回だけ）
npx zenn-cli new:article
# 4. 生成されたハッシュをブログ frontmatter に追加
#    zennHash: "<hash>"
#    zennEmoji: "📝"
#    zennType: "tech"   # tech（技術） or idea（体験・考察）
#    zennTopics: ["topic1", "topic2"]
# 5. Zennに同期
npm run sync:zenn
# 6. push
```

### 公開スケジュール・時系列のルール（自動）

記事の `pubDate` が「ブログ公開日」を兼ねる。**未来日 = 予約公開**（一覧ページが `pubDate <= now` でフィルタ。日次 cron ビルドでその日が来たら自動公開される）。

- **新記事の pubDate は必ず「最新記事 + cadence日数」に揃える**（`node scripts/content-plan.js --next` で算出）。バラバラな日付・同日クラスターにしない
- cadence は現在 **7日（週1）**。`scripts/content-plan.js` の `CADENCE_DAYS` 1箇所で変更可。ネタ詰まり時は 14（隔週）や 30（月1）に落とす
- **既存記事の pubDate は書き換えない**（時系列は構築済み。SEOリスク回避）
- Zenn の `published_at` と X 告知も、その記事の pubDate に揃える（同じ日に公開・告知）
- 出稿の優先度は **書評・体験談 > 技術記事**（技術記事は Zenn では埋もれやすく、ブログSEO流入に任せる）
- 公開計画の確認は `node scripts/content-plan.js`（cadence違反検出・予約キュー・Zenn未公開キュー・在庫週数を表示）

### ブログ記事の frontmatter（全フィールド必須）

```yaml
---
title: ""
description: ""   # 80〜120文字。日本語はPC表示で120文字・モバイルで60文字が上限。200文字以上は検索結果で途切れる
pubDate: "YYYY-MM-DD"
tags: []           # 2〜5個。既存タグと表記を合わせる
zennHash: ""       # articles/<hash>.md のハッシュ部分
zennEmoji: ""      # 記事の内容に合った絵文字1つ
zennType: "tech"   # tech: 技術記事 / idea: アイデア・考察
zennTopics: []     # 最大5つ、Zennの既存トピック名に合わせる
---
```

- `updatedDate` は既存記事を更新したときのみ追加（例: `updatedDate: "2026-05-25"`）
- `.mdx` は AmazonCard コンポーネントを使う記事のみ。通常は `.md`
- **新記事を書いたら、既存記事の本文中に今書いた記事へのリンクを1つ貼る**（SEO内部リンク強化。ウィジェットではなく本文中に自然な文脈で）

### sync:zenn スクリプトの動作

`npm run sync:zenn`（`scripts/sync-zenn.js`）は以下を自動で行う：
- ブログ記事の本文をそのまま Zenn 記事に反映
- `:::message` ブロックとフッターを自動で付与
- `import` 文・`<AmazonCard/>` コンポーネント・末尾の関連記事セクションを除去
- Zenn 側の `published` / `published_at` は変更しない（公開状態は保持）

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
--color-accent-btn: #5f52d4    /* ボタン背景（WCAG AA準拠） */
--color-code-bg: #1e2130       /* コードブロック背景 */
--font-sans: 'Inter Variable', 'Inter', 'Hiragino Kaku Gothic ProN', ...
--font-mono: 'JetBrains Mono Variable', 'JetBrains Mono', 'Fira Code', ...
--radius: 8px
--max-width: 860px
--header-height: 60px
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
  lib/
    db.ts             ← IndexedDB CRUD ユーティリティ（idb使用・ポートフォリオページで使用）
  data/
    mock-projects.json ← ポートフォリオのモックデータ（デモ環境用）
  pages/
    blog/             ← 一覧（ページネーション）・記事詳細・タグ・RSS
    portfolios/       ← 実績一覧
    og/               ← OGP画像自動生成（satori + @resvg/resvg-js）
    about.astro       ← プロフィール
    uses.astro        ← 使用ツール・環境紹介
    contact.astro     ← お問い合わせ（Googleフォーム埋め込み）
    search.astro      ← 全文検索（Pagefind）
    privacy.astro     ← プライバシーポリシー
    404.astro         ← 404エラーページ
  styles/global.css   ← グローバルスタイル・CSS変数
articles/             ← Zenn記事（push で自動公開）
books/                ← Zenn本（現在未使用）
infra/                ← AWS CDK
docs/                 ← 運営ドキュメント（operations.md, article-plan.md, affiliate-strategy.md, growth-strategy.md, note-strategy.md）
public/
  scripts/
    menu.js           ← ハンバーガーメニュー（CSP対応・Header.astroから読込）
    ui.js             ← バックトゥトップボタン（BaseLayout.astroから読込）
    blog.js           ← 記事ページ制御（進捗バー・コードコピー・TOC）
    ga.js             ← Google Analytics 初期化
  images/portfolio/   ← ポートフォリオのスクリーンショット（PNG + WebP）
  logo.png            ← 猫ロゴ（OGP・アバターに使用）
  logo-small.png      ← ヘッダー用小サイズロゴ
  logo-small.webp     ← ヘッダー用小サイズロゴ（WebP版）
  favicon.svg         ← ファビコン
  og-default.svg      ← OGPデフォルト画像（SVG）
```

---

## JavaScript の追加・変更ルール（CSP対応）

本番環境は CloudFront の CSP ヘッダー `script-src 'self'` が設定されており、**インラインの `<script>` ブロックは動作しない**（ローカルでは動くが本番で無効になる）。

### ルール
- JavaScript は必ず `public/scripts/` に外部ファイルとして配置する
- Astro コンポーネントから読み込む際は `<script is:inline src="/scripts/xxx.js">` を使う
- `<script>` ブロックをコンポーネントに直接書かない

### 既存ファイルの担当範囲
| ファイル | 読み込み元 | 担当機能 |
|---|---|---|
| `menu.js` | `Header.astro` | ハンバーガーメニュー開閉・スクロールロック |
| `ui.js` | `BaseLayout.astro` | バックトゥトップボタンの表示制御 |
| `blog.js` | `BlogLayout.astro` | 進捗バー・コードコピーボタン・TOCハイライト |
| `ga.js` | `BaseLayout.astro` | Google Analytics（gtag）初期化 |

---

## astro.config.mjs の変更ルール

- インテグレーション（`@astrojs/mdx`, `@astrojs/sitemap` など）の追加・削除はここで行う
- `site` は `https://www.taka-techblog.com` で固定。変更しない
- `build.format: 'directory'` は URL末尾スラッシュ統一のため固定。変更しない
- 新しいインテグレーションを追加したら `package.json` の dependencies も確認する

---

## インフラ変更のルール

- インフラ変更は必ず `infra/` 以下の CDK コードを修正する
- 新しいサブドメイン/サービスを追加するときは `infra/cdk.json` にコンテキスト値を追加し、`infra/lib/blog-stack.ts` で参照する
- CDK デプロイ前に `npx tsc --noEmit` でタイプチェックを通す
- Lambda のコードは CI/CD でデプロイするため、CDK では `Code.fromInline` のプレースホルダーを使う
- デプロイ後の Output 値は `docs/operations.md` の進行中タスクに記録する

### 新しいサービスを追加するパターン（CDK）

1. `cdk.json` にコンテキスト追加（バケット名・サブドメイン・GitHubリポジトリ名）
2. `bin/app.ts` でコンテキストを読み取り BlogStack に渡す
3. `lib/blog-stack.ts` に S3 + CloudFront + Route53 A レコードを追加
4. `GithubActionsRole` の `StringLike` 条件に新リポジトリを追加
5. IAM ポリシーに S3/CloudFront 操作権限を追加
6. `CfnOutput` でバケット名・ディストリビューション ID を出力

---

## X（@_taka_tech）投稿

**詳細フォーマット・投稿順リスト → `docs/operations.md`**

- 記事公開時は必ずX告知する。リンクはブログURL（AdSense・アフィリエイト収益のため）
- ハッシュタグは1〜2個まで
- ZennのURLは貼らない（Zennは自然流入に任せる）
- 自己紹介ポストはプロフィールに固定したまま維持する

---

## ブランド・表記のルール

- サイト名: `taka-techblog`（小文字ハイフン繋ぎ、スペースなし）
- X アカウント: `@_taka_tech`
- GitHub: `takashi-endo2023`
- ページタイトル形式: `ページ名 | taka-techblog`
- 絵文字はコードには書かない（ユーザーから明示的に求められた場合のみ）

---

## 運営ドキュメントのルール（docs/）

運営系ドキュメントは役割を分離し、情報の重複を避ける。**1つの情報は1箇所にだけ書く**。

### 各ドキュメントの責務（single source of truth）

| ファイル | 責務（ここにしか書かない情報） | 見る頻度 |
|---|---|---|
| `operations.md` | 週次運用手順・出稿スケジュール・投稿ログ・出稿キュー・計測ガイド | 毎日〜毎週 |
| `article-plan.md` | 記事カタログ・未執筆アイデア・資格計画・タグ一覧 | 記事を書くとき |
| `growth-strategy.md` | **収益源ステータス・マネタイズ全体・KPI目標・X運用戦略・情報源** | 月次振り返り |
| `affiliate-strategy.md` | アフィリエイト個別の配置記事・配置パターン | アフィリ配置時 |
| `note-strategy.md` | note 有料コンテンツの刊行計画（着手は3ヶ月後目安） | note着手時 |
| `x-content-examples.html` | X投稿の実例（画像・スレッド）。アーカイブ参照用 | 必要時 |

### ルール

- **マネタイズ・収益源ステータス・KPIは `growth-strategy.md` が正**。他docは参照のみ（数値を二重に書かない）
- 同じ情報を複数docに書きたくなったら、片方に書いて他方からリンクする
- 各docの冒頭に `最終更新: YYYY-MM-DD` を置き、更新時に必ず直す
- 完了したタスク・使用済みのコピペ文は消す（履歴は投稿ログにのみ残す）
- 新しい運営docを増やす前に、既存docに追記できないか検討する（安易に増やさない）
- ステータス変更（承認・実装・公開など）は、関連する全docを同時に更新する

---

## やってはいけないこと

- `node_modules/` を git に追加しない
- `.env` や API キーをコードにハードコードしない（GitHub Secrets 経由で渡す）
- `git push --force` は使わない
- CDK デプロイを確認なしに実行しない（本番インフラに影響するため、実行前に確認する）
- `cdk destroy` は絶対に実行しない
