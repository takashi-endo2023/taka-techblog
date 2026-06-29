# アフィリエイト戦略ドキュメント

最終更新: 2026-06-30

---

## 登録済みプログラム一覧

| プログラム | ASP | 状態 | 用途 |
|---|---|---|---|
| Amazon アソシエイト | 直接（affiliate.amazon.co.jp） | ✅ 稼働中 | 書評記事・AmazonCard コンポーネント |
| レバテック（キャリア/FL） | A8.net | ✕ A8で利用不可（2026-06消滅）| 代替は100超フェーズで検討 |
| GEEKLY（ギークリー） | A8.net | ✅ 稼働中（2026/05/25承認） | テックリード・キャリア記事 |
| Udemy | impact.com | ✅ 稼働中（サイト認証・W-8BEN提出済） | 学習・書評・技術系記事 |
| Audible | A8.net | ✅ 提携済 | 書評記事に「耳で聴く選択肢」をテキストで |
| ムームードメイン | A8.net | ✅ 提携済 | サプリ会社立ち上げ記事（ドメイン・**実際に使った**） |
| ロリポップ | A8.net | ✅ 提携済 | サプリ会社立ち上げ記事（コーポのサーバー・**実際に使った**） |
| エックスサーバー | A8.net | ✅ 提携済 | 自社コーポ刷新記事（WordPress運用・**実際に使った**） |

> 承認されたら上記の「審査中」を「✅ 稼働中」に更新し、URLを追記する。
> Udemy(impact) は報酬USD建て。受取(Payoneer等)は初回支払い前までに設定。詳細は `growth-strategy.md`。

---

## カテゴリ別アフィリエイト配置戦略

### AI/Claude Code/テックリード体験（7本）
**→ アフィリエイト対象外**

Anthropic・Claude Code・Cursor はアフィリエイトプログラム未提供。
これらはブログのブランド構築・認知獲得に徹する記事として扱う。

---

### NestJS/LangChain/医療IT技術（9本）
**→ アフィリエイト対象外**

技術ニッチすぎてマッチするプログラムなし。
書籍紹介がある場合のみ Amazon アソシエイトで対応。

---

### テックリード/組織/マネジメント
**→ GEEKLY 配置済み**（レバテックは A8 で消滅・当面利用不可）

GEEKLY 配置済み（10記事）:
- ✅ `solo-techlead-ai-survival.mdx` AIがなかったら死んでた
- ✅ `naisei-kansei.mdx` 外部ベンダーから内製化した3年間
- ✅ `techLead-first-90-days.mdx` テックリード就任最初の90日
- ✅ `playing-manager-reality.mdx` プレイングマネージャーの現実
- ✅ `communicating-it-value-to-executives.mdx` 経営層への技術翻訳
- ✅ `technical-debt-strategy.mdx` 技術的負債戦略
- ✅ `engineer-hiring-lessons.mdx` 採用で学んだこと
- ✅ `techlead-mask-3years.mdx` 仮面テックリード3年間
- ✅ `small-elite-team-design.mdx` 3人で回すということ
- ✅ `code-review-culture.mdx` コードレビューを3年一人でやった話

---

### React/Next.js/TypeScript実務
**→ GEEKLY 配置済み**（レバテックは A8 で消滅・当面利用不可）

GEEKLY 配置済み（5記事）:
- ✅ `react-nextjs-selection.mdx` React×Next.js選択基準
- ✅ `nextjs-rendering-deep-dive.mdx` SSR/SSG/ISR
- ✅ `typescript-utility-types-practical.mdx` TypeScript Utility Types
- ✅ `frontend-testing-practical-approach.mdx` フロントテスト戦略
- ✅ `nextjs-seo-implementation.mdx` Next.js SEO

---

### AWS/DevOps/インフラ実務（保留）
**→ IT転職アフィリは当面保留**（レバテックは A8 で消滅。代替ASPはフォロワー100超フェーズで検討）

GEEKLY は正社員のみ・フリーランスNGなので、AWS/インフラ系のフリーランス志向読者層には不適。
レバテック消滅により当面なし（AWS/DevOps記事のIT転職アフィリは保留）。

候補記事:
- `astro-aws-cdk-cloudfront-blog.md`
- `github-actions-oidc-aws.md`
- `astro-s3-cache-strategy.md`
- `aws-devops-github-actions.mdx`
- `gitlab-cicd-patterns.md`
- `aws-iam-least-privilege.mdx`
- `aws-vpc-subnet-design.mdx`
- `high-availability-design-spof.mdx`
- `web-performance-tuning-basics.mdx`

---

### 実装済みの配置パターン（GEEKLY）

記事末尾に挿入。`GeeklyAffiliate.astro` コンポーネントで実装。

```mdx
---

## この記事を読んだ方へ

> **PR** 似た領域で実務に関わる方へ

似た領域で実務に関わる方は、定期的に外の市場感を把握しておくと判断軸が増える。今すぐ動く動かないは別として、自分のスキルがどう評価されるかを知っておく価値はある。

IT/WEB/ゲーム業界専門のエージェントなら<GeeklyAffiliate variant="inline" />が分かりやすい。エンジニアに特化しているので、年収レンジを掴む目的だけでも使える。

<GeeklyAffiliate variant="banner" />
```

コンポーネントは banner / cta / inline の3バリアント。素材ID:016（300×250、CTR 3.58%）・001（テキストCTA）・040（テキストインライン）を内蔵。

---

### 書評（18本）
**→ Amazon アソシエイト（AmazonCard コンポーネント）**

`.mdx` ファイルで AmazonCard コンポーネントを使用。
アソシエイトID `takashi084-22` が自動適用済み。

```astro
<AmazonCard
  asin="XXXXXXXXXX"
  title="本のタイトル"
  description="一言コメント"
/>
```

---

### Udemy（impact.com）— 学習・スキルアップ系

**位置づけ**: 「独学で学べる」ブランドと完全一致（スクール否定・独学派）。
GEEKLY（転職＝経験者向け）が置けない**未経験・学習中の読者**にも刺せるのが強み。
「自分はスクールではなくこういう教材で学んだ」という文脈で authentic に置ける。

**配置対象（優先順）**:
- `career-change-to-engineer.md` 30歳転身 — ★最有力。GEEKLYは未経験NGで置けなかったがUdemyは置ける。「独学で這い上がった、その手段の一つ」として
- 書評記事（javascript-honkaku-nyumon-review 等）— 「本＋動画講座」の補完として
- `cursor-review-2025.md` / `claude-code-workflow.md` — AI開発の学習講座
- AWS系（aws-handover / aws-operation-introduction-review 等）— 「AWS Skill Builder と併せてUdemy講座でも」
- JavaScript/TypeScript チュートリアル系 — 体系学習の導線

**配置しない**:
- 体験談・組織論（学習文脈と無関係）
- 医療IT/規制（学習教材と乖離）

**配置パターン（記事末尾・本文中どちらも可）**:
```markdown
> **PR** この分野を体系的に学びたい方へ

自分は書籍と[Udemyの講座](アフィリリンク)で独学した。
体系立てて手を動かしながら学べるので、断片的な検索より定着が早い。
セール時（定額1,200円〜）を狙うとコスパがいい。
```

**注意**:
- Udemyは**頻繁にセール**（通常1,200〜2,000円台）。「セール時が狙い目」と添えると誠実かつCV上がる
- 「独学派」のブランドと矛盾しないトーンで（スクール勧誘にはしない）
- impact のリンク形式・Cookie期間は管理画面で確認して使う

**コンポーネント化（将来）**: GeeklyAffiliate と同様に `UdemyCard.astro` を作る案あり。
当面はテキストリンクで運用し、配置記事が増えたらコンポーネント化を検討。

---

### Audible（A8.net）— 耳で聴く学習（✅提携済）

**数字**: 報酬1,500円・確定率70%・EPC47（無料体験登録+再生で確定＝優良案件）。

**形式**: **テキストリンク**（バナーは使わない）。書評記事は AmazonCard が主役なので、
バナーを足すと末尾が広告だらけになりブランドを毀損する。文中／末尾に1行さりげなく。

**位置づけ**: ただし自分は「無料体験を試した」程度で愛用中ではない。
**「愛用中」とは書かない**（嘘になる）。「無料体験で試した」と正直に＋「学習法の選択肢」として紹介。

**配置対象**:
- 書評記事に「耳で聴く選択肢」として一言（メイン）
- 「本を読む時間がない人にはオーディオブックも。30日無料で試せる」程度

**配置しない**:
- uses（「使ってる」が主旨。試した程度なので合わない）
- 大々的な推し・バナー（関わりが浅い）
- Udemy と両方は重い → 記事ごとにどちらか1つ（1記事1〜2アフィリまで）

**注意**: 優先度は低い。書評記事を書く/更新するときに1箇所さりげなく、で十分。

---

### ムームードメイン / ロリポップ（A8.net）— 会社IT立ち上げ系（✅提携済）

**前提**: 配置先の記事（`company-launch-it-zero-to-one` / `startup-it-foundation-checklist`）は
**まだ未執筆**（article-plan のグループ会社シリーズ）。記事を書くときに配置する。

**重要**: グループ会社の立ち上げで**実際に使ったのがムームードメイン＋ロリポップ**。
お名前.com/ConoHa ではない。**実体験のあるサービスを選ぶ**（authentic性最優先）。

**ムームードメイン（ドメイン）**:
- ドメイン取得100円 / Google Workspace新規2000円 / **確定率99.45%**（驚異的）
- 「会社立ち上げでムームーでドメインを取得した」実体験で書ける
- メール設定で Google Workspace を使ったなら、そちらの成果（2000円）も狙える

**ロリポップ（サーバー）**:
- ライト3000円〜ハイスピード5000円。10日間無料お試しあり
- 「サプリ会社のコーポレートサイトをロリポップ＋WordPressで新規作成した」実体験
  （ECは MakeShop。サーバーはロリポップ）
- ⚠️ 個人ブログはAWS(Astro)だが**文脈が違うので矛盾しない**：
  「サプリ会社はロリポップ、自社コーポはエックスサーバー、個人ブログはAWS」と
  それぞれ実体験。サービスを使い分けた経験として書ける

**形式**: **テキストリンク**（体験談の文中に「ドメインはムームー/サーバーはロリポップで」と
溶かす）。バナーは使わない（GEEKLYは末尾の独立PRブロックなのでバナー、こちらは本文中の
言及なのでテキスト、と使い分ける）。

**配置タイミング**: 会社IT立ち上げ記事の執筆時。提携は完了済み。リンク取得して記事執筆時に配置。

---

### エックスサーバー（A8.net）— コーポレートサイト刷新

**配置先記事**: `corporate-site-renewal`（自社コーポレート刷新の体験談・未執筆）。

**実体験**: **自社（治験募集の本体）**のコーポレートサイト。入社前から放置され、
HTMLファイルをエックスサーバー（昔から契約）に直置きする保守性最悪のカオスを、
WordPressで完全に作り直して本番運用中。
**実際に使い込んでいる**ので authentic に貼れる（個人ブログのAWSとは別案件・矛盾しない）。

**形式**: **テキストリンク**（体験談の文中に「自社は昔からエックスサーバー」と溶かす）。バナー不使用。

**配置タイミング**: コーポレート刷新記事の執筆時。提携完了済み。

---

### アフィリを貼る／貼らないの判断基準（重要）

> **アフィリを貼る = 「読者に自信を持って勧められる」もの。**
> 単に「使ったことがある」だけでは不十分。

| 状態 | アフィリ | 記事での言及 |
|---|---|---|
| 本格的に使い込んでいる/勧められる | ✅ 貼る | ✅ |
| 試した程度（Audible等） | △ 控えめに・正直に | ✅ |
| **中途半端に使った/やめた**（さくら等） | ❌ **貼らない** | ⭕ 名前を出すのはOK |
| 使っていない（お名前/ConoHa/スクール） | ❌ 貼らない | — |

**例: さくらインターネット**
- 移行前の個人ブログで中途半端に使用 → その後 AWS(Astro) に移行
- 「使ったことはある」が**中途半端＋やめた**ので**勧められない → アフィリ貼らない**
- ただし「さくらからAWSに移行した」という**移行ストーリー記事のネタ**としては価値あり。
  その記事では名前を出すが、リンクは貼らない

---

## 実装ルール

### PR 表示について（景品表示法対応・2023年10月〜義務）
- アフィリエイトリンクを含む記事には **必ず「PR」または「広告」を明記**
- 記事末尾のリンクブロック冒頭に `> **PR**` を付ける
- AmazonCard は `.affiliate-label` で「PR」ラベルを自動表示済み

### 配置ルール
- 記事**末尾**のみ（本文中への埋め込みは行わない）
- 1記事につき **最大2プログラム**（書籍カード + 転職/学習 の組み合わせは可。同種は重ねない）
- 自然な文脈でつながる記事にのみ貼る
- **実体験・組織論の記事に書籍/転職を無理に入れない**（物語性を優先）

### nofollow 属性
- アフィリエイトリンクには必ず `rel="nofollow sponsored"` を付ける
- AmazonCard / GeeklyAffiliate は対応済み。手書きの `<a>` は `rel="nofollow sponsored noopener"` を明記

---

## 新記事作成時のアフィリ選定ルール（自動判定フロー）

新しい記事を書いたら、**記事のテーマと読者層**から下表で機械的に判定して配置する。
迷ったら「読者がその記事を読んだ後に自然に欲しくなるもの」を基準にする。

| 記事タイプ | 第1候補 | 第2候補 | 例 |
|---|---|---|---|
| 技術解説（JS/TS/React/AWS/HTTP等） | Amazon（関連技術書） | — | javascript-array-methods |
| 書評 | Amazon（その本） | Udemy（同テーマ講座） | javascript-honkaku-nyumon-review |
| テックリード/組織/マネジメント | GEEKLY（経験者転職） | —（IT転職は当面GEEKLYのみ） | code-review-culture |
| フロント/TS実務 | GEEKLY | Amazon（関連書） | react-nextjs-selection |
| AWS/DevOps/インフラ実務 | Amazon（関連書） | —（IT転職アフィリは当面保留） | github-actions-oidc-aws |
| 学習・キャリア（**未経験向け**） | **Udemy**（独学教材） | — | career-change-to-engineer |
| 体験談・ストーリー（純粋な物語） | **なし**（物語性優先） | — | git-chaos / 本部長モンスター |
| AI/Claude Code 体験 | なし or Udemy（AI講座） | — | solo-techlead-ai-survival は GEEKLY |
| 医療IT/治験/規制 | なし（ニッチ・教材と乖離） | — | cro-audit-tech-response |

### 判定の原則
- **未経験・学習中の読者 → Udemy**（GEEKLY は未経験NG規約。ここを Udemy で埋める）
- **経験者・転職検討 → GEEKLY**（レバテックは A8 消滅で当面利用不可）
- **技術を深めたい → Amazon の関連書**
- **体験談の線引き（曖昧だったので明文化）**:
  - **キャリア判断に繋がる体験談**（テックリード/組織/採用＝読者が「自分も動こうか」と考える）→ **GEEKLY可**（例: solo-techlead-ai-survival, naisei-kansei）
  - **感情・人間関係・失敗が主題の純粋な物語**（読者が「共感」で読み終える）→ **アフィリなし**（信頼の土台・読み物として残す。例: git-chaos, 本部長モンスター）
- 書籍(Amazon)と転職/学習(GEEKLY/Udemy)は**種類が違うので併存可**。ただし同種は重ねない

### 実装手段
- Amazon → `<AmazonCard asin=... />`（.mdx 必須）
- GEEKLY → `<GeeklyAffiliate variant="inline|banner" />`（.mdx 必須）
- Udemy → 手書き `<a rel="nofollow sponsored noopener">`（.md でも可）。将来 `UdemyCard.astro`
- **Zenn には載せない**: sync-zenn.js が AmazonCard/GeeklyAffiliate/「## この記事を読んだ方へ」セクションを自動除去。Udemy も同セクション内に置けば除去される

---

## 現状の配置実績（2026-06 時点・棚卸し済み）

| プログラム | 配置数 | 状態 |
|---|---|---|
| Amazon | 約45記事 + usesページ | 各記事に関連技術書1冊。適切 |
| GEEKLY | 15記事（テックリード/組織/フロント実務） | 適切 |
| Udemy | 1記事（career-change） | 1本目。反応を見て学習系へ横展開予定 |

> 監査結果: 詰め込み・規約違反なし。Geekly+Amazon併存4記事は「書籍＋転職」で種類が違うため許容範囲。

---

## 今後のアクション

- ~~レバテック承認~~ → **A8で消滅（2026-06）**。AWS/DevOps記事のIT転職アフィリは保留。代替ASP（Findy等）はフォロワー100超フェーズで検討（今は探さない＝X集中）
- [ ] Findy が A8.net で申請可能になったら追加検討
- [x] A8 に GEEKLY 15URL 登録済み（新規アフィリは記事配置時に都度登録）
- [ ] 月次でクリック率・成果数を確認、配置文言を磨く
