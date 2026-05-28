# アフィリエイト戦略ドキュメント

最終更新: 2026-05-27

---

## 登録済みプログラム一覧

| プログラム | ASP | 状態 | 用途 |
|---|---|---|---|
| Amazon アソシエイト | 直接（affiliate.amazon.co.jp） | ✅ 稼働中 | 書評記事・AmazonCard コンポーネント |
| レバテックキャリア | A8.net | ⏳ 審査中 | テックリード・キャリア記事 |
| レバテックフリーランス | A8.net | ⏳ 審査中 | AWS/DevOps・フリーランス記事 |
| GEEKLY（ギークリー） | A8.net | ✅ 稼働中（2026/05/25承認） | テックリード・キャリア記事 |

> 承認されたら上記の「審査中」を「✅ 稼働中」に更新し、URLを追記する。

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
**→ GEEKLY 配置済み（レバテックキャリア承認待ち）**

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
**→ GEEKLY 配置済み（レバテックキャリア承認待ち）**

GEEKLY 配置済み（5記事）:
- ✅ `react-nextjs-selection.mdx` React×Next.js選択基準
- ✅ `nextjs-rendering-deep-dive.mdx` SSR/SSG/ISR
- ✅ `typescript-utility-types-practical.mdx` TypeScript Utility Types
- ✅ `frontend-testing-practical-approach.mdx` フロントテスト戦略
- ✅ `nextjs-seo-implementation.mdx` Next.js SEO

---

### AWS/DevOps/インフラ実務（保留）
**→ レバテックフリーランス承認待ち**

GEEKLY は正社員のみ・フリーランスNGなので、AWS/インフラ系のフリーランス志向読者層には不適。
レバテックフリーランス承認後に配置予定。

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

## 実装ルール

### PR 表示について（景品表示法対応・2023年10月〜義務）
- アフィリエイトリンクを含む記事には **必ず「PR」または「広告」を明記**
- 記事末尾のリンクブロック冒頭に `> **PR**` を付ける
- AmazonCard は `.affiliate-label` で「PR」ラベルを自動表示済み

### 配置ルール
- 記事**末尾**のみ（本文中への埋め込みは行わない）
- 1記事につき **最大2プログラム**
- 自然な文脈でつながる記事にのみ貼る

### nofollow 属性
- アフィリエイトリンクには必ず `rel="nofollow sponsored"` を付ける
- AmazonCard は対応済み

---

## 今後のアクション

- [ ] レバテックキャリア承認 → テックリード/組織記事に GEEKLY と並列配置
- [ ] レバテックフリーランス承認 → AWS/DevOps 記事に配置開始
- [ ] Findy が A8.net で申請可能になったら追加検討
- [ ] A8 管理画面で各掲載URL登録（成果計測のため必須）
- [ ] 月次でクリック率・成果数を確認、配置文言を磨く
