# operations.md — 記事を作って出す実務ハンドブック

最終更新: 2026-06-30

> 「何を書くか・どう出すか・どこにアフィリを置くか」を見るときの1冊（＝手順）。
> 方針・戦略・キャリアは `strategy.md`、機械向けルールは `CLAUDE.md`。

---

## 0. 今のコンテンツ方針（最優先・2026-06改修）

> ⚠️ **生産ではなく流通がボトルネック**。在庫66本が12/1まで自動公開される。新規長文の量産はしない。

- **書くなら「医療IT × AI × 規制 × 組織」のニッチだけ**。汎用チュートリアル（JS/React/AWS入門）は紅海＝**書き足さない**
- 浮いた時間は **Xの絡み** と **看板記事（鉱脈体験談）の磨き込み** に回す
- 優先度：**体験談（鉱脈） > ニッチ技術 > 汎用（書かない）**

---

## 1. 記事を書く/出す手順

機械的な手順（frontmatter 全フィールド・`sync:zenn`・`content-plan.js`）は **`CLAUDE.md`「記事を書くとき」が正**。ここは要点だけ：

1. ブログ記事を `src/content/blog/<slug>.md(x)` に作成（pubDate は `node scripts/content-plan.js --next`）
2. 新記事は本文に既存記事への内部リンクを1つ／記事タイプに応じてアフィリ配置（§6）
3. `npm run sync:zenn` → push
4. **書評・体験談だけ X 告知**（技術記事は告知せず検索流入に任せる）

---

## 2. Zenn 公開（自前の安全版Actionで予約公開）

> 経緯：純正の「published_at 自動公開」は当リポジトリで当日発火せず公開漏れの実害（2026-06）。自前Actionに移行。

- 在庫は `published: true` ＋ `published_at: "YYYY-MM-DD HH:MM"`（未来）で寝かせる
- 毎日 cron（09:10 / 15:00 JST）で `scripts/zenn-publish-due.js` が「公開日が過去になった記事から `published_at` を外して push」→ Zenn が即公開（過去5日窓で既公開記事は触らない）
- 手動リカバリ：GitHub Actions → `Zenn publish due` を Run workflow、または該当記事の `published_at` を外して push
- ⚠️ **`published: false` ＋ `published_at` は禁止**（デプロイ中断）。公開漏れ対応は「`published_at` を外すだけ・`published: false` にしない」

---

## 3. X 投稿フォーマット

```
【フック：読む理由を1行で】

① 要点1
② 要点2
③ 要点3

記事はこちら → https://www.taka-techblog.com/blog/<slug>

#タグ1個
```

- **フック**は「何をしたか」でなく「何が起きたか・気づいたか」（悪: 「Claude Codeについて書きました」／良: 「Claude Codeを入れて一番変わったのはレビュー工数じゃなかった」）
- ハッシュタグ1〜2個・**ZennのURLは貼らない**（ブログURLのみ）・自己紹介ポストは固定維持
- 一言投稿ネタ例：「今日のレビューで久々にN+1踏んだ」「未経験に仕様を書かせたら箇条書きすらできなかった」「医療系のリリースは製薬会社承認でバグ修正に3ヶ月かかることがある」

### X 告知スケジュール（書評・体験談のZenn公開日に告知。技術記事は告知不要）
公開状況は `node scripts/content-plan.js`。リンクは**ブログURL**。6/30以降の残り：

| 告知日 | 記事 | slug |
|---|---|---|
| 6/30 | プレイングマネージャーの現実 | `playing-manager-reality` |
| 7/02 | 3人で回すということ | `small-elite-team-design` |
| 7/05 | コードレビューを3年一人で | `code-review-culture` |
| 7/07 | 誰も採用をやらないから | `engineer-hiring-lessons` |
| 7/09 | コードより先に要件を言語化 | `junior-engineer-spec-before-code` |
| 7/12 | 未経験2名をコーチング | `coaching-junior-engineers` |
| 7/14 | 技術的負債と向き合う3年間 | `technical-debt-strategy` |
| 7/16 | 内製化で480万円削減 | `naisei-kansei` |
| 7/19 | システム監査に技術者として対応 | `system-audit-experience` |
| 7/21 | AI議事録で会議が変わった | `ai-meeting-notes-structured` |
| 7/23 | 仮面を被ったテックリード3年 | `techlead-mask-3years` |
| 7/26 | 本部長がモンスターになった | `ai-team-adoption-monster` |
| 7/28 | AIがなかったら死んでた | `solo-techlead-ai-survival` |

> 7/30以降は技術記事（〜12/1）でX告知なし。**鉱脈ネタ**（同僚が部下に／480万削減／本部長モンスター／30歳転身）は「開いた型」で最強時間帯（土22時等）に。

---

## 4. 記事ネタ（未執筆バックログ）

> 執筆したら削除（執筆済みは実ファイル / `content-plan.js` が正）。**ニッチ＞体験談を優先、汎用は書かない**。
> ⚠️ 医療IT系は共通の守秘ルール：会社・治験・取引先・医療機関・投薬は出さない。「ある規制産業で」「機密データ」と抽象化し、語るのは技術判断だけ。

### 🏥 医療IT・治験・規制（最優先・鉱脈）
- **機密データはAIに渡せない→Bedrockで「閉じた箱」**（`bedrock-closed-ai-for-confidential-data`）★最高・鉱脈。外部API不可→Bedrockで閉じる技術判断が核。**対比の切り口**（取込=AI要る/出力=AI不要ClaudeCode爆速）で「AIをどこに使い・使わないか」に昇華。アフィリなし
- **CSVドキュメントを1から作った話**（`csv-documentation-reality`）URS/FRS/IQ-OQ-PQを手探りで作った工数・限界
- **製薬会社からのシステム解凍——変更管理と凍結**（`system-freeze-change-control`）機能追加1つに3ヶ月。スピードと安全のトレードオフ
- **21 CFR Part 11 と電子署名**（`21cfr-part11-tech-guide`）監査証跡・改ざん防止をエンジニア目線で
- **広告費→最終成果を1DBで計測（マーケ×データ×AI）**（`ad-attribution-crm-analytics`）優先度高・大型実績。"事業全体を見る視点"の証明＝考課の宿題の実例。`lp-architecture-unification`の実装編。アフィリなし
- **LPを量産するな、アーキを統一しろ**（`lp-architecture-unification`）現在進行形・組織編。「正しい提案が理解されない」黄金パターン×CRA/CRP計測。アフィリなし

### 🤖 社内AI展開・AI駆動開発フロー
- **非エンジニアにAIをどう教えるか**（`teaching-ai-to-non-engineers`）翻訳力・計画段階でも書ける
- **個人情報をAIに入れていいか——医療でAI展開の難しさ**（`medical-ai-adoption-barriers`）医療×AIの独自性
- **AI駆動開発フロー標準化シリーズ**（独自メソッド・Zennで強い）：3層全体設計（`review-standardization-3layers`）／層1 CLAUDE.mdに禁止事項前倒し／層2 AIレビューの実際／層3 hooks+CI機械ゲート／段階移行Phase0-5。`code-review-culture` の実装編

### 🔧 CI/CD・ブランチ
- **結合試験をCIで自動化（規制の証跡テスト）**（`gitlab-ci-integration-test-impl`）
- **ブランチ戦略を作り直した話**（`git-branch-strategy-redesign`）`git-chaos` の後日談

### 🏢 グループ会社・横断（引き継ぎ / 0→1）
> 特定されない加工を徹底。コーポサイトは2つ（サプリ新規0→1＝ムームー/ロリポップ ／ 自社本体刷新＝エックスサーバー）。混同しない
- **Flutter介護アプリを未経験言語で保守**（`flutter-handover-care-app`）3度目の引き継ぎ・ヘルスケア地続き
- **会社の立ち上げをIT丸ごと（ドメイン→EC）**（`company-launch-it-zero-to-one`）アフィリ：ムームー/ロリポップ
- **会社のIT基盤に必要だったもの（実務ガイド）**（`startup-it-foundation-checklist`）SEO狙い
- **HTML直置きをWordPressで刷新**（`corporate-site-renewal`）アフィリ：エックスサーバー
- **「やっといて」では動けない——タスク設計**（`task-design-for-junior-engineers`）
- **委譲を恐れていた3年間**（`why-techlead-cant-delegate`）

### ⚙️ AI活用・設計（優先度中）
- **このブログのCLAUDE.mdをどう設計したか**（`claude-md-design-philosophy`）
- **URI設計から始めるAPI設計**（`api-design-doc-template`）／**ステージング環境の設計**（`staging-environment-design`）

### 🗂️ ポートフォリオ作品（`/portfolios`・余力で）
- 優先高：LangChain×NestJS AI連携デモ／Claude Code・AI開発フロー紹介
- 優先中：NestJS+TS REST API／AWS CDKインフラ解説。ブログ（`langchain-nestjs-ai-integration`, `aws-cdk-first-pitfalls`）と連携

---

## 5. 資格・タグ

### 資格計画（補助。本命は実務AI実践＋発信。取るなら勉強過程を記事化）
- **必須ルート**：AWS **CLF**（入口）→ **SAA**（本命・市場価値最大・実務直結）→ **AIF**（AI×AWSの看板・LangChain/Claude Codeと接続）
- **息抜き枠**：簿記3級・2級（経営・数字の視点。投資と親和。記事化可）
- **優先度低**：基本情報（急がない）
- **やらない**：AWS ML系（方向違い・AIFでカバー）／応用情報（ROI低）／PMP等（マネジメントは資格でなく実践＋発信で資産化）

### タグ一覧（現在24・主題に合うものだけ2〜5個。`医療IT`は医療ITが主題の記事だけ）
```
技術: TypeScript, JavaScript, React, Next.js, NestJS, AWS, DevOps, インフラ,
      GitHub Actions, LangChain, Claude Code, AI開発, アーキテクチャ,
      パフォーマンス, データベース, セキュリティ
チーム: チーム開発, テックリード, 組織設計, マネジメント
医療IT: 医療IT, 品質管理   /   キャリア: キャリア, 書評
```

---

## 6. アフィリエイト配置

> 原則：**「自信を持って勧められる」ものだけ貼る**。記事末尾のみ・1記事最大2プログラム・`rel="nofollow sponsored"` 必須・**PR表記必須**（景表法）。Zennには載らない（sync-zennが「## この記事を読んだ方へ」を自動除去）。

### 登録済みプログラム
| プログラム | ASP | 用途 |
|---|---|---|
| Amazon アソシエイト（`takashi084-22`） | 直接 | 書評・技術書（AmazonCard） |
| GEEKLY | A8 | テックリード・キャリア記事（GeeklyAffiliate） |
| Udemy | impact.com | 学習・未経験向け（手書きリンク・USD建て） |
| Audible / ムームー / ロリポップ / エックスサーバー | A8 | 書評の「耳で聴く」／会社IT立ち上げ・刷新記事（実際に使ったもの＝テキストリンク） |

⚠️ **レバテック（キャリア/FL）は A8 で消滅・当面利用不可**。代替ASPはフォロワー100超フェーズで検討（今は探さない）。

### 新記事のアフィリ選定（機械判定）
| 記事タイプ | 第1候補 | 第2候補 |
|---|---|---|
| 技術解説（JS/TS/React/AWS等） | Amazon（関連技術書） | — |
| 書評 | Amazon（その本） | Udemy（同テーマ講座） |
| テックリード/組織/マネジメント | GEEKLY | —（IT転職は当面GEEKLYのみ） |
| フロント/TS実務 | GEEKLY | Amazon |
| AWS/DevOps/インフラ実務 | Amazon（関連書） | —（IT転職アフィリ保留） |
| 学習・キャリア（未経験向け） | Udemy | — |
| 純粋な体験談・物語 | **なし**（物語性優先） | — |
| 医療IT/治験/規制 | なし（ニッチ・教材と乖離） | — |

- **未経験・学習中→Udemy**（GEEKLYは未経験NG）／**経験者・転職検討→GEEKLY**／**技術を深める→Amazon関連書**
- 体験談の線引き：キャリア判断に繋がる体験談（テックリード/組織/採用）→GEEKLY可。感情・失敗が主題の純粋な物語（git-chaos/本部長モンスター）→アフィリなし

---

## 7. 月次チェック（軽く）
- GA4：チャネル別セッション・人気記事TOP10（Organic Search が伸びているか）
- Search Console：インデックス数・上位クエリ（新ドメインは育成中・自動）
- Zenn：いいね/コメント → 反応が多い記事はブログへの内部リンク強化
- A8/Amazon：成果数（100超フェーズまでは軽く確認するだけ）
- **AdSense は放置**（不承認＝index未成熟。登録100超で再申請。期待値小）

## 関連ドキュメント
- `strategy.md` — 方針＝北極星・X運用・マネタイズ・長期キャリア
- `CLAUDE.md` — 開発・記事の機械向けルール（frontmatter/sync:zenn/公開スケジュール）
