# 運営 TODO

最終更新: 2026-05-24

---

## 🟡 進行中

### Google AdSense 審査待ち
- 申請済み・審査待ち
- 通過後: `src/layouts/BaseLayout.astro` の `<head>` にAdSenseタグを1行追加するだけ

---

## 🟢 記事・コンテンツ

### 新規執筆（優先度順）

**AI系**
1. `ai-business-process-consulting.md` — AI×業務フロー効率化の社内コンサル的アプローチ
2. `integration-test-automation.md` — 結合試験をボタン1つで完結させるCI自動化
3. `pr-quality-gate-automation.md` — PRマージ時の品質ゲート自動化
4. `claude-code-team-adoption.md` — Claude Codeをチームへ広げるとき
5. `ai-code-review-assistant.md` — AIを使ったコードレビュー支援

**医療IT系**
6. `csv-documentation-reality.md` — CSVドキュメントを1から作った実体験
7. `cro-audit-tech-response.md` — PPD・CROの品質監査に技術者として対応した話
8. `system-freeze-change-control.md` — 製薬会社からのシステム解凍・変更管理の現実
9. `21cfr-part11-tech-guide.md` — 21 CFR Part 11と電子署名をエンジニア目線で整理

> 全記事計画は `docs/article-plan.md` を参照

### 既存記事のメンテナンス
- [ ] 薄い記事（4〜5KB）のリライト
  - 優先: `code-review-culture` / `small-elite-team-design` / `git-chaos-1hour-before-release` / `ai-meeting-notes-structured`
- [ ] AmazonCard の定期確認（品切れ・改版チェック）
  - アフィリエイトID: `takashi084-22` / コンポーネント: `src/components/AmazonCard.astro`
- [ ] AmazonCardを使いたい `.md` 記事は必要に応じて `.mdx` に変換

---

## ✅ 完了済み（2026-05-24 時点）

### SEO・マネタイズ
- [x] Zenn 全62記事に `canonical_url` 追加（taka-techblog.comへの正規化）
- [x] Zenn 全62記事を `published: true` + `published_at`（ブログ pubDate 準拠）に設定
- [x] `twitter:site` / `twitter:creator: @taka_tech1988` タグ追加（BaseLayout）
- [x] タグページ description を動的化（タグ名・件数入り）
- [x] updatedDate を8記事に追加（git履歴ベース、JSON-LD dateModified に反映）
- [x] Amazonアソシエイト登録（ID: `takashi084-22`）

### UI・UX
- [x] BlogCard タグを `span[role=link]` → 本物の `<a>` タグに変更（stretched-link パターン）
- [x] サイドバー固定TOC（1100px以上でグリッドレイアウト・スクロール連動ハイライト）
- [x] View Transitions 有効化（Astro 6: `ClientRouter`）
- [x] ホームトップ「最近の記事」3件 → 6件に増加
- [x] ホームトップ「カテゴリ別おすすめ」セクション追加（AI・テックリード・インフラ・医療IT）
- [x] Contact をヘッダーナビに追加
- [x] タグ表記ゆれ統一（AI駆動開発→AI開発 / AI連携→AI開発 / 組織→組織設計）
- [x] ポートフォリオ ↔ 関連記事の相互リンク追加
- [x] ポートフォリオ スクリーンショット全5件出揃い（年収トラッカー追加）

### インフラ・サイト構築
- [x] ドメイン移管（さくら → Route 53）
- [x] CDK デプロイ（CertStack + BlogStack）
- [x] GitHub Actions OIDC認証（全リポジトリ対応）
- [x] CloudFront OAC + S3プライベート配信
- [x] OGP画像自動生成（satori + @resvg/resvg-js）
- [x] サイトマップ・RSS自動生成
- [x] 全文検索（Pagefind）
- [x] ページネーション（12件/ページ）— ブログ一覧・タグページ両対応
- [x] タグを 104個 → 24個に整理（類似タグ統合・1件タグ削除）
- [x] サイト内検索・タグ一覧・プライバシーポリシー・Contactページ
- [x] 各サブドメインインフラ追加（utagoe / ec / ai-ads / game / salary）
