# アフィリエイト戦略ドキュメント

最終更新: 2026-05-25

---

## 登録済みプログラム一覧

| プログラム | ASP | 状態 | 用途 |
|---|---|---|---|
| Amazon アソシエイト | 直接（affiliate.amazon.co.jp） | ✅ 稼働中 | 書評記事・AmazonCard コンポーネント |
| レバテックキャリア | A8.net | ⏳ 審査中 | テックリード・キャリア記事 |
| レバテックフリーランス | A8.net | ⏳ 審査中 | AWS/DevOps・フリーランス記事 |
| GEEKLY（ギークリー） | A8.net | ⏳ 審査中 | テックリード・キャリア記事 |
| paiza | A8.net | ⏳ 審査中 | React/Next.js・インフラ記事 |
| TechAcademy | A8.net | ⏳ 審査中 | React/Next.js・転身記事 |

> 承認されたら上記の「審査中」を「✅ 稼働中」に更新し、URLを追記する。

---

## カテゴリ別アフィリエイト配置戦略

### AI/Claude Code/テックリード体験（7本）
**→ アフィリエイト対象外**

Anthropic・Claude Code・Cursor はアフィリエイトプログラム未提供。
これらはブログのブランド構築・認知獲得に徹する記事として扱う。

---

### NestJS/LangChain/医療IT技術（9本）
**→ アフィリエイト対象外（技術ニッチすぎてマッチするプログラムなし）**

書籍紹介がある場合のみ Amazon アソシエイトで対応。

---

### テックリード/組織/マネジメント（12本）
**→ レバテックキャリア ＋ GEEKLY**

対象記事（優先順）:
- `naisei-kansei.md` 外部ベンダーから内製化した3年間
- `techLead-first-90-days.md` テックリード就任最初の90日
- `playing-manager-reality.md` プレイングマネージャーの現実
- `communicating-it-value-to-executives.md` 経営層への技術翻訳
- `technical-debt-strategy.md` 技術的負債戦略
- `engineer-hiring-lessons.md` 採用で学んだこと

貼り方:
```markdown
---

> **PR** この記事が刺さった方へ
> エンジニア特化の転職エージェント [レバテックキャリア](URL) は
> 年収交渉・非公開求人など、テックリード層のキャリアに強みがあります。
> [GEEKLY](URL) はIT/Web業界に特化し、書類選考通過率が高め。
```

---

### AWS/DevOps/インフラ実務（9本）
**→ レバテックキャリア ＋ レバテックフリーランス**

対象記事（優先順）:
- `astro-aws-cdk-cloudfront-blog.md` このブログの構築
- `github-actions-oidc-aws.md` OIDCキーレスデプロイ
- `astro-s3-cache-strategy.md` S3キャッシュ戦略
- `aws-devops-github-actions.mdx` GitHub Actions CI/CD
- `gitlab-cicd-patterns.md` GitLab CI/CDパターン

貼り方:
```markdown
---

> **PR** 実務でAWS/DevOpsを扱うエンジニアへ
> フリーランス転向を考えている方は [レバテックフリーランス](URL) が
> 高単価案件に強く、専任エージェントが条件交渉まで対応してくれます。
```

---

### React/Next.js/TypeScript実務（13本）
**→ paiza ＋ TechAcademy**

対象記事（優先順）:
- `react-nextjs-selection.md` React×Next.js選択基準
- `nextjs-rendering-deep-dive.mdx` SSR/SSG/ISR
- `typescript-utility-types-practical.mdx` TypeScript Utility Types
- `frontend-testing-practical-approach.mdx` フロントテスト戦略
- `nextjs-seo-implementation.mdx` Next.js SEO

貼り方:
```markdown
---

> **PR** フロントエンドのスキルをさらに伸ばしたい方へ
> [paiza](URL) はコーディングテストで実力証明しながら転職できる
> エンジニア向けサービスです。
```

---

### AWS/インフラ知識系（12本）
**→ paiza**

対象記事（優先順）:
- `aws-iam-least-privilege.mdx` IAM最小権限
- `aws-vpc-subnet-design.mdx` VPCサブネット設計
- `high-availability-design-spof.mdx` 高可用性設計
- `web-performance-tuning-basics.mdx` パフォーマンスチューニング

貼り方:
```markdown
---

> **PR** インフラ・クラウドのスキルで転職・年収アップを目指す方へ
> [paiza](URL) はコーディングスキルを可視化して
> 上位企業からのスカウトを受け取れるサービスです。
```

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

- [ ] A8.net の各プログラム承認後、URLをこのドキュメントに追記
- [ ] 承認されたら対象記事に順次リンクを追加
- [ ] Findy が A8.net で申請可能になったら追加検討
