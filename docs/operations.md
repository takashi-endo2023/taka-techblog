# 週次運用ガイド

最終更新: 2026-05-24

---

## 全体フロー（週単位）

```
新記事を書く週
  └─ ブログ記事（src/content/blog/）作成
  └─ Zenn記事（articles/）作成
  └─ 既存記事1本の本文中に今書いた記事へのリンクを貼る（SEO内部リンク）
  └─ git push → GitHub Actions 自動デプロイ・Zenn自動公開
  └─ X告知（ブログURL・スレッド形式）
  └─ Search Consoleで記事URLをインデックス申請

記事を書かない週
  └─ 出稿キュー（下記）の次の行を処理
       1. Zennが未公開なら articles/<hash>.md の published: false → true に変更 → git push
       2. X告知（下記フォーマット）
       3. 出稿キューのチェックボックスを [x] にする
  └─ Search Consoleで記事URLをインデックス申請
```

---

## 記事公開チェックリスト（新記事）

### ブログ記事（src/content/blog/）

```yaml
---
title: ""
description: ""   # 120文字前後・具体的に
pubDate: "YYYY-MM-DD"
tags: []          # 2〜5個・既存タグと表記を合わせる
---
```

- [ ] frontmatter 全フィールド入力済み
- [ ] 既存記事の本文中に今書いた記事へのリンクを1本追加

### Zenn記事（articles/）

```bash
npx zenn-cli new:article
```

```yaml
---
title: ""
emoji: ""
type: "tech"
topics: []
published: true
canonical_url: "https://www.taka-techblog.com/blog/<slug>"
---
```

本文冒頭:
```
:::message
この記事は [taka-techblog](https://www.taka-techblog.com/blog/<slug>?utm_source=zenn&utm_medium=referral) にも掲載しています。
:::
```

本文末尾:
```
---

他の記事も読む → [taka-techblog.com](https://www.taka-techblog.com?utm_source=zenn&utm_medium=referral)
X でも発信中 → [@_taka_tech](https://x.com/_taka_tech)
```

---

## X 投稿フォーマット

```
【フック：読む理由を1行で】

① 要点1
② 要点2
③ 要点3

記事はこちら → https://www.taka-techblog.com/blog/<slug>

#タグ1個
```

**フックの書き方**
- 「何をしたか」ではなく「何が起きたか・何に気づいたか」で書く
- 悪い例: 「Claude Codeについて書きました」
- 良い例: 「Claude Codeを入れて一番変わったのはレビュー工数じゃなかった」

**ルール**
- ハッシュタグは1〜2個まで
- ZennのURLは貼らない（ブログURLのみ）
- 自己紹介ポストはプロフィールに固定したまま維持

**一言投稿のネタ例**（週1〜2本・記事告知とは別に投稿）

```
「今日のレビューで久々にN+1踏んだ」
「未経験エンジニアに仕様を書かせたら最初は箇条書きすらできなかった」
「テックリードと係長を兼任すると、1日の会議が5本になる日がある」
「Claude Codeに設計相談したら自分が考えてなかった観点を出してきた」
「医療系スタートアップのリリースは製薬会社の承認が必要なので、バグ修正に3ヶ月かかることがある」
```

---

## 出稿キュー（Zenn × X）

**週1本ペース**。Zenn出稿とX告知は同タイミングで行う。

### ルール

- Zenn出稿済み・X未投稿の記事はX告知だけ行う（pushは不要）
- 書評記事は対応するスピンオフが先にZennに出ていることを確認してから出す（下表参照）
- 新記事を書いた週は新記事を優先し、既存記事の出稿は翌週にずらす
- 同じ系統の記事は連続させない（キャリア→AI→キャリア→技術のように散らす）
- 内容が近い記事（#30と#33）は間に別ジャンルを挟む

#### 書評スピンオフ対応表

| 書評 | 先にZennに出すスピンオフ |
|------|----------------------|
| #49 サーバ/インフラを支える技術 | #72（フロントエンドエンジニアがサーバを学んで） |
| #50 Webを支える技術 | #46（WebアーキテクチャとREST）・#75（REST API設計）・#76（望ましいURIとは） |
| #51 JavaScript本格入門 | #58（非同期処理）・#61（Array高階関数）・#64（クラスとモジュール）・#67（スコープとthis）・#70（ES6+） |
| #52 TypeScript×React×Next.js | #68（SSR・SSG・ISR）・#69（React×Next.js選択基準）・#71（Next.jsでSEO） |

---

### キャリア・AI・チーム・医療IT系（高優先度）

| # | タイトル | Zennファイル | Zenn | X |
|---|---------|------------|------|---|
| 1 | 島流しの先にエンジニアがあった——30歳からの転身の現実 | `e4d8874f0c25b0.md` | [x] | [ ] |
| 2 | テックリード就任最初の90日でやったこと | `c456bbb0adeb5d.md` | [x] | [ ] |
| 3 | mainブランチを捨てた——リリース1時間前のgit修羅場 | `4yshjgf1hghg6y.md` | [ ] | [ ] |
| 4 | AIを社内に広めたら、本部長がモンスターになった話 | `5tnkntl5zu16g8.md` | [ ] | [ ] |
| 5 | 外部ベンダーから内製化した3年間——年間480万円の固定費をゼロにするまで | `46a0ca17e07591.md` | [ ] | [ ] |
| 6 | AIがなかったら死んでた——一人で全部背負うテックリードの現実 | `bza7y402pjd6vf.md` | [ ] | [ ] |
| 7 | みんなの安定のために仮面を被った——テックリード3年間の全記録 | `1ctkpuxzu93b5z.md` | [ ] | [ ] |
| 8 | Claude Codeを実務導入して開発フローが変わった話 | `ed32a95b5e4802.md` | [ ] | [ ] |
| 9 | Cursor実務レビュー2025：Claude Codeと使い分けて気づいたこと | `5137l1okz0o0z7.md` | [ ] | [ ] |
| 10 | Claude Codeを設計の壁打ち相手として使う | `pl5avffh5822vx.md` | [ ] | [ ] |
| 11 | フロントエンドのテスト戦略——「全部書く」をやめてから品質が上がった話 | `i6ku6o5ybx42nq.md` | [ ] | [ ] |
| 12 | 目標は私が暇になること——コードレビューを3年一人でやってきた話 | `tzdy9xycv9enn3.md` | [ ] | [ ] |
| 13 | テックリードと係長を兼任するプレイングマネージャーの現実 | `m6hv75alqp5nex.md` | [ ] | [ ] |
| 14 | StorybookをReactチームに導入して見えてきたこと | `kvflkjtgoifgbu.md` | [ ] | [ ] |
| 15 | 誰も採用をやらないから、自分でやることにした | `h9rsspjmuru38j.md` | [ ] | [ ] |
| 16 | グループ会社のIT環境をゼロから整備した話——MakeShopとGA4と諸々 | `yv2vibdwa2jq4z.md` | [ ] | [ ] |
| 17 | Atomic Designを実務で使って気づいたこと——設計の共通言語はチームを助ける | `rqvg1li6z2s154.md` | [ ] | [ ] |
| 18 | 未経験エンジニア2名をコーチング型で育てた方法 | `n98llcuymohyie.md` | [ ] | [ ] |
| 19 | コードより先に要件を言語化させる——会話が成立しない部下への対処 | `0yh2itbqgsc0et.md` | [ ] | [ ] |
| 20 | 「理屈が通れば動く人」との3年——経営層への技術翻訳の実際 | `2vrbzlg894c017.md` | [ ] | [ ] |
| 21 | 3人で回すということ——少人数チームを機能させるための工夫 | `6ct9fn4dtmi8a4.md` | [ ] | [ ] |
| 22 | 直したいのに直せない——技術的負債と向き合う3年間 | `bxbuu3zypx5k2i.md` | [ ] | [ ] |
| 23 | 治験データが増えるにつれてシステムが遅くなった | `f35fbfd57c2bf9.md` | [ ] | [ ] |
| 24 | 製薬メーカーのシステム監査に技術者として対応した話 | `80gsybo71sanbn.md` | [ ] | [ ] |
| 25 | CSV（コンピュータ化システムバリデーション）とは何か——医療ITエンジニア目線で解説 | `0ojtx3rb4ppf91.md` | [ ] | [ ] |
| 26 | 医療系CRMにLangChain×NestJSでAI連携を実装した話 | `01p9p3ef1ioouy.md` | [ ] | [ ] |
| 27 | AIで議事録を構造化する | `d9df9kag6qxx9s.md` | [ ] | [ ] |
| 28 | NestJS + LangChainで治験CRMにAI機能を追加した構成メモ | `9brfxkct0afcsg.md` | [ ] | [ ] |
| 29 | NestJSの治験CRMを引き継いで学んだバックエンド設計 | `2rq66b1w1t1rp4.md` | [ ] | [ ] |
| 30 | GitHub ActionsとAWS OIDCでキーレスデプロイを実現する | `t4n0ltv5ya47hr.md` | [ ] | [ ] |
| 31 | GitLab CI/CDを実務で運用するときの設計パターン | `dnrvjkvr3lbykv.md` | [ ] | [ ] |
| 32 | Docker開発環境を標準化してチームの「動かない」を減らす | `3b3k0kxr0bvqfz.md` | [ ] | [ ] |
| 33 | GitHub Actions + AWSでCI/CDを構築する——OIDCでアクセスキーなしの安全なデプロイ | `dwhllpuryowgdo.md` | [ ] | [ ] |
| 34 | 引き継いだリリースフローが、監査で初めて意味を持った | `kfsbi9rdmo6u7z.md` | [ ] | [ ] |

### 技術・チュートリアル系

| # | タイトル | Zennファイル | Zenn | X |
|---|---------|------------|------|---|
| 35 | MySQLレプリケーション設計——障害復旧・読み取り分散・RDS Multi-AZとの比較 | `79279979f9fe68.md` | [ ] | [ ] |
| 36 | Linuxロードアベレージを正確に理解する——sar・vmstat・psで障害の原因を特定する | `08428d8bf20838.md` | [ ] | [ ] |
| 37 | HTTPキャッシュを正しく設計する——Cache-Control・ETag・CDN連携 | `721c49e186f713.md` | [ ] | [ ] |
| 38 | リバースプロキシの役割と設計——Nginx・CDN・キャッシュ戦略 | `7ee61b358adca8.md` | [ ] | [ ] |
| 39 | TypeScriptのユーティリティ型を実務で使いこなす | `945f46c541fbdb.md` | [ ] | [ ] |
| 40 | REST APIの書き込み設計——冪等性・トランザクション・楽観的ロックの実装パターン | `d850972b4a7b49.md` | [ ] | [ ] |
| 41 | JavaScript Fetch APIの実践パターン——エラーハンドリング・リトライ・タイムアウト | `28fac32146d7b9.md` | [ ] | [ ] |
| 42 | Next.jsのデプロイ戦略——Vercel・AWS Amplify・セルフホスト比較 | `103c1c4d7b0a43.md` | [ ] | [ ] |
| 43 | JavaScriptのMapとSetを使いこなす——Objectとの使い分けと実践パターン | `f38804b70d22be.md` | [ ] | [ ] |
| 44 | JavaScriptの正規表現を実務で使う——メールバリデーション・URL解析・テンプレート置換 | `60fa04f1663c92.md` | [ ] | [ ] |
| 45 | CSS-in-JSとCSS Modules——styled-componentsからCSS Modulesへ移行した理由 | `d3ce068b762988.md` | [ ] | [ ] |
| 46 | WebアーキテクチャとRESTの歴史——HTTPとURIが生まれた背景 | `c6c4de13a0cdb2.md` | [ ] | [ ] |
| 47 | フロントエンドのアクセシビリティ入門——WAI-ARIA・キーボード操作・スクリーンリーダー対応 | `d5e66fde2ad28d.md` | [ ] | [ ] |
| 48 | Next.js × Stripeで決済機能を実装する——Checkout・Webhook・定期課金 | `657f7c4b4cebfd.md` | [ ] | [ ] |
| 49 | サーバ/インフラを支える技術——書評 ※#72を先に出す | `47dc7ddfc7c40f.md` | [ ] | [ ] |
| 50 | Webを支える技術——書評 ※#46・#75・#76を先に出す | `0d3f099034a005.md` | [ ] | [ ] |
| 51 | JavaScript本格入門——書評 ※#58・#61・#64・#67・#70を先に出す | `ec31073bda0f55.md` | [ ] | [ ] |
| 52 | TypeScriptとReact/Next.js実践本——書評（テックリード視点）※#68・#69・#71を先に出す | `6fd4ae4ee5f36f.md` | [ ] | [ ] |
| 53 | TypeScriptとReact/Next.js実践本——書評（未経験エンジニア視点） | `q8x3hfvup5y9oq.md` | [ ] | [ ] |

### その他技術系（JS記事は散らして配置）

| # | タイトル | Zennファイル | Zenn | X |
|---|---------|------------|------|---|
| 54 | LangChain.js 2025年の現状：実務で使って感じたこと | `sz3gex2rssvfzm.md` | [ ] | [ ] |
| 55 | TypeScriptで型安全なLangChainアプリを作る——LangChain.jsの型定義と実装パターン | `ifgf7vdg029g81.md` | [ ] | [ ] |
| 56 | Webサービスのパフォーマンスチューニング入門——計測・キャッシュ・DBが三本柱 | `h5o212dqrld831.md` | [ ] | [ ] |
| 57 | 高可用性設計の基本——SPOF排除とフェイルオーバーで「止まらないサービス」を作る | `2qcgmv2036l8f6.md` | [ ] | [ ] |
| 58 | JavaScriptの非同期処理を整理する——コールバック・Promise・async/awaitの使い分け | `3azb0d7pw0j2j7.md` | [ ] | [ ] |
| 59 | AWSのIAM設計を正しく理解する——最小権限の原則と実務での落とし穴 | `g5dv70sh8xke97.md` | [ ] | [ ] |
| 60 | AWS VPCのサブネット設計を理解する——パブリック・プライベートの分け方とセキュリティ設定 | `c099vkx1pyctk1.md` | [ ] | [ ] |
| 61 | JavaScriptのArray高階関数を実務で使いこなす——map・filter・reduceの使い分け | `cm7jxr07ym45sc.md` | [ ] | [ ] |
| 62 | EC2・Lambda・ECSをどう使い分けるか——AWSコンピューティングの選択基準 | `djngfh546mws59.md` | [ ] | [ ] |
| 63 | AWS CDKを初めて使って詰まった5つのこと | `nax4pimbscwtuv.md` | [ ] | [ ] |
| 64 | JavaScriptのクラスとモジュールを理解する——TypeScriptに活きるOOPの基礎 | `tlvoq3nbynkjsn.md` | [ ] | [ ] |
| 65 | RDSとDynamoDBの使い分け——データ構造とアクセスパターンで選ぶ基準 | `xzo4o2ni2li073.md` | [ ] | [ ] |
| 66 | CloudWatchでAWSを監視する——メトリクス・アラーム・ログの実務パターン | `zyt8o7jjngndev.md` | [ ] | [ ] |
| 67 | JavaScriptのスコープとthisで詰まったこと——本格入門で理解が深まった概念 | `f94ge9rimbbzhm.md` | [ ] | [ ] |
| 68 | Next.jsのSSR・SSG・ISRを実務でどう使い分けるか | `pgx1eyar7sz704.md` | [ ] | [ ] |
| 69 | React×Next.jsの選択基準を実務から考える——SPA・SSR・SSGをどう使い分けるか | `iaombk2zkki81l.md` | [ ] | [ ] |
| 70 | ES6+の新構文を実務でどう使うか——JavaScript本格入門で整理した基礎知識 | `xvqj79l8si2hjc.md` | [ ] | [ ] |
| 71 | Next.jsでSEOを実装するときに押さえるべきこと——メタデータからJSON-LDまで | `8i6stlb8pi3elw.md` | [ ] | [ ] |
| 72 | フロントエンドエンジニアがサーバ/インフラを学んで気づいたこと | `rmexysupjs9kbf.md` | [ ] | [ ] |
| 73 | ESLint・Jest・Viteを最初に整備する——JavaScriptプロジェクトの開発環境構築 | `docl9fhy5l5a0c.md` | [ ] | [ ] |
| 74 | HTTPを正しく理解する——メソッド・ステータスコード・ヘッダーの実務知識 | `7j8pifif6qo9e0.md` | [ ] | [ ] |
| 75 | REST APIの設計原則を学び直す——URLの考え方から冪等性まで | `ryo8mzr03y1riu.md` | [ ] | [ ] |
| 76 | 望ましいURIとは何か——Webを支える技術で学んだURL設計のベストプラクティス | `zckgo5nbv3y7k8.md` | [ ] | [ ] |
| 77 | Linux運用で最低限知るべきこと——ターミナル作業を怖くなくするための基礎知識 | `jljolfilkvew6s.md` | [ ] | [ ] |
| 78 | AstroとAWS CDK + CloudFrontで技術ブログを構築した話 | `1odauls9e91b4d.md` | [ ] | [ ] |
| 79 | S3 + CloudFrontで静的サイトを本番運用する——このブログを構築して学んだこと | `exbsg4n2xcksh2.md` | [ ] | [ ] |
| 80 | AstroサイトのS3+CloudFrontキャッシュ戦略：静的サイトを最速にする | `ub7xsifddzdvwm.md` | [ ] | [ ] |

---

## 月次チェック

| 項目 | 確認内容 |
|------|---------|
| GA4 | トラフィック推移・人気記事TOP10 |
| Search Console | インデックス数・クリック数・表示回数が多い記事 |
| Zennいいね | 反応が多い記事はブログへの送客導線を強化 |
| AmazonCard | 品切れ・改版チェック（`src/components/AmazonCard.astro`、アフィリエイトID: `takashi084-22`） |

---

## 進行中タスク

### Google AdSense 審査待ち
- 申請済み・審査待ち
- 通過後: `src/layouts/BaseLayout.astro` の `<head>` にAdSenseタグを1行追加するだけ

### 既存記事のリライト（薄い記事）
- [ ] `code-review-culture` — 4KB台、書き込み不足
- [ ] `small-elite-team-design` — 4KB台
- [ ] `git-chaos-1hour-before-release` — 4KB台
- [ ] `ai-meeting-notes-structured` — 4KB台

### デプロイ待ち（今セッションの変更）
- [ ] `git push` で本番反映（astro.config.mjs のwww修正・About/Contact/Uses・Zenn記事のwww統一など）
- [ ] Search Console サイトマップを `https://www.taka-techblog.com/sitemap-index.xml` に更新

---

## マネタイズロードマップ

### 現在の収益源
- Amazon アフィリエイト（ID: `takashi084-22`）
- Google AdSense（申請済み・審査待ち）

### Phase 1 — 基盤（〜3ヶ月）目標: 月3,000PV
- 週1本記事継続 + Zenn × X 出稿ルーティン定着

### Phase 2 — 収益の芽（3〜6ヶ月）目標: 月10,000PV
- Zenn有料記事（候補: 「医療スタートアップ内製化ノウハウ」「NestJS×Lambda実践」3,000〜5,000円）
- アフィリエイト強化（技術書レビュー記事を増やす）

### Phase 3 — 収益の柱（6ヶ月〜）目標: 月30,000PV + 副業1件
- Contact経由で副業依頼を受ける（ブログが名刺代わり）
- Zenn有料記事シリーズ化

---

## Zenn topics 対応表

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

## 関連ドキュメント

| ファイル | 内容 |
|---------|------|
| `docs/article-plan.md` | 記事アイデア・執筆計画 |
| `CLAUDE.md` | 技術ルール・ファイル構成 |
