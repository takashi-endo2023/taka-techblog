# 運営 TODO

最終更新: 2026-05-21

---

## 🔴 未対応（要対応）

### Google AdSense 申請
- プライバシーポリシーは `/privacy` に設置済み
- 申請URL: https://www.google.com/adsense/

### AWS Budget アラートのメールアドレス設定
- `infra/cdk.json` の `alertEmail` が `"your-email@example.com"` のまま（未設定）
- 変更後は `npx cdk deploy --all` で反映する

---

## 🟢 記事・コンテンツ

### 次に書く記事（優先度順）

**AI系（最優先）**
1. `ai-business-process-consulting.md` — AI×業務フロー効率化の社内コンサル的アプローチ
2. `integration-test-automation.md` — 結合試験をボタン1つで完結させるCI自動化
3. `pr-quality-gate-automation.md` — PRマージ時の品質ゲート自動化
4. `claude-code-team-adoption.md` — Claude Codeをチームへ広げるとき
5. `ai-code-review-assistant.md` — AIを使ったコードレビュー支援

**医療IT系（優先）**
6. `csv-documentation-reality.md` — CSVドキュメントを1から作った実体験（作業の大変さ）
7. `cro-audit-tech-response.md` — PPD・CROの品質監査に技術者として対応した話
8. `system-freeze-change-control.md` — 製薬会社からのシステム解凍・変更管理の現実
9. `21cfr-part11-tech-guide.md` — 21 CFR Part 11と電子署名をエンジニア目線で整理

> 記事の詳細・全記事一覧は `docs/article-plan.md` を参照

### 記事メンテナンス
- [ ] AmazonCardのASIN・説明文を定期確認（品切れ・改版チェック）
- [ ] AmazonCardを使いたい `.md` 記事は必要に応じて `.mdx` に変換
  - アフィリエイトID: `takashi084-22`
  - コンポーネント: `src/components/AmazonCard.astro`

### ポートフォリオ
- [x] 各ポートフォリオカードにスクリーンショットを追加（2026-05-21）

---

## ✅ 完了済み

### インフラ・デプロイ
- [x] ドメイン移管完了（さくら → Route 53）
- [x] CDK デプロイ（TakaBlogCertStack + TakaBlogStack）
- [x] GitHub Secrets 設定（全リポジトリ）
- [x] 全サービス自動デプロイ確認済み

### サイト構築
- [x] Astroプロジェクト初期構築（SSG + MDX対応）
- [x] AWS CDK インフラ設計（CertStack + BlogStack）
- [x] ACM ワイルドカード証明書（`*.taka-techblog.com`）
- [x] CloudFront OAC + S3プライベート配信
- [x] GitHub Actions OIDC認証（IAMロール1つで全リポジトリ対応）
- [x] utagoe_club サブドメイン（`utagoe.taka-techblog.com`）インフラ追加
- [x] ec サブドメイン（`ec.taka-techblog.com`）インフラ追加
- [x] ec の deploy.yml 作成（`VITE_DEMO_MODE=true` でビルド）
- [x] AWS Budget アラート設定
- [x] OGP画像自動生成（`@resvg/resvg-js` + `satori`）
- [x] サイトマップ自動生成
- [x] 読了時間表示
- [x] プライバシーポリシーページ
- [x] ページネーション（12件/ページ、`/blog/[page]`）
- [x] サイト内検索（Pagefind、`/search`）
- [x] タグナビ改善（上位15件 + `/blog/tags` 全タグ一覧）
- [x] 猫ロゴ統合（ヘッダー・About・ファビコン）
- [x] ブランド統一（`taka-techblog` 小文字ハイフン）
- [x] X 連携（シェアボタン・About・フッター）
- [x] X プロフィール整備（アイコン正方形化・自己紹介文）
- [x] Contactページ（Googleフォーム埋め込み、副業・取材・採用を受付）
- [x] ポートフォリオページ刷新（スクショスペース・4件構成）
- [x] ai-ads-dashboard インフラ追加（S3+CF+Lambda+APIGW）
- [x] ai-ads-dashboard GitHub Actions deploy.yml 作成
- [x] game-site インフラ追加（S3+CloudFront、`game.taka-techblog.com`）
- [x] game-site コンテンツ更新（プレースホルダー→実情報）
- [x] game-site GitHub Actions deploy.yml 作成

### 記事コンテンツ
- [x] 記事61本執筆（2023〜2026年の時系列で分散）
- [x] 書評ベース記事への「自分だけの切り口」追加（医療IT・治験実体験）
- [x] 箇条書きスペース問題（`-テキスト` → `- テキスト`）修正
- [x] AmazonCardコンポーネントの画像URL修正
- [x] Amazonアソシエイト登録（ID: `takashi084-22`）
