# taka-techblog 開発ルール

## 記事を書くとき（必須）

ブログ記事を新規作成・更新するときは、**必ず以下の2ファイルをセットで作成・更新する**。

### 1. ブログ記事（taka-techblog.com）
- パス: `src/content/blog/<slug>.md`
- frontmatter フォーマット:
  ```yaml
  ---
  title: ""
  description: ""
  pubDate: "YYYY-MM-DD"
  tags: []
  ---
  ```

### 2. Zenn記事（zenn.dev）
- パス: `articles/<hash>.md`（`npx zenn-cli new:article` でファイル名を生成、または既存ファイルを使用）
- frontmatter フォーマット:
  ```yaml
  ---
  title: ""
  emoji: ""      # 記事の内容に合った絵文字1つ
  type: "tech"   # tech: 技術記事 / idea: アイデア・考察
  topics: []     # 最大5つ、Zennの既存トピックに合わせる
  published: true
  ---
  ```
- 本文冒頭に以下のメッセージブロックを追加:
  ```
  :::message
  この記事は [taka-techblog](https://taka-techblog.com/blog/<slug>?utm_source=zenn&utm_medium=referral) にも掲載しています。
  :::
  ```
- 本文末尾に以下のフッターを追加:
  ```
  ---

  他の記事も読む → [taka-techblog.com](https://taka-techblog.com?utm_source=zenn&utm_medium=referral)
  X でも発信中 → [@taka_tech1988](https://x.com/taka_tech1988)
  ```

### Zenn記事作成の手順
```bash
# 新規記事の場合：ファイル名を生成
npx zenn-cli new:article
# → articles/<hash>.md が生成されるので、中身をブログ記事から移植・変換する
```

### 注意事項
- ブログ記事の frontmatter（`description`, `pubDate`, `tags`）はZennでは使えないので変換する
- Zennの `topics` はブログの `tags` をZenn既存トピックに寄せて設定する（例: "TypeScript", "AWS", "NestJS" など）
- `published: true` にするとpush時に即公開される。下書きにしたい場合は `false` のまま

## インフラ

- CDK: `infra/` ディレクトリ
- デプロイ: GitHub Actions（mainブランチpushで自動）
- 詳細な手順: `docs/todo.md` を参照
