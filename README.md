# taka-techblog

個人技術ブログ・ポートフォリオサイト。WordPress + さくらのレンタルサーバーから **Astro SSG + AWS** へ移行したモダン構成。

🌐 https://taka-techblog.com

---

## Tech Stack

| レイヤー | 技術 |
|---|---|
| フロントエンド | Astro (TypeScript) |
| コンテンツ管理 | Markdown / MDX |
| クライアント永続化 | IndexedDB（idb ライブラリ） |
| ホスティング | AWS S3 + CloudFront |
| IaC | AWS CDK (TypeScript) |
| CI/CD | GitHub Actions（OIDC 認証） |
| DNS | AWS Route 53 |
| SSL 証明書 | AWS ACM（無料） |

---

## ディレクトリ構成

```
taka-techblog/
├── src/
│   ├── components/       # 共通コンポーネント
│   ├── content/blog/     # ブログ記事（Markdown）
│   ├── data/             # 静的データ（JSON）
│   ├── layouts/          # ページレイアウト
│   ├── lib/db.ts         # IndexedDB CRUD リポジトリ
│   ├── pages/
│   │   ├── index.astro         # トップページ
│   │   ├── blog/               # ブログ一覧・記事詳細
│   │   ├── portfolios/         # 実績一覧
│   │   └── portfolio/          # IndexedDB CRUD ラボ
│   └── styles/
├── infra/                # AWS CDK（インフラをコード管理）
│   ├── bin/app.ts        # スタック定義
│   ├── lib/
│   │   ├── cert-stack.ts # ACM 証明書（us-east-1）
│   │   └── blog-stack.ts # S3・CloudFront・Route53・IAM
│   └── cdk.json          # コンテキスト変数
├── .github/workflows/
│   └── deploy.yml        # 自動デプロイ（OIDC 認証）
└── public/
```

---

## URL 構成

```
https://taka-techblog.com/            ← トップページ
https://taka-techblog.com/blog/       ← 技術記事一覧
https://taka-techblog.com/portfolios/ ← 実績一覧
https://taka-techblog.com/portfolio/  ← IndexedDB CRUD ラボ
https://portfolio.taka-techblog.com/  ← CRUD ラボ（サブドメイン）
```

---

## ローカル開発

```bash
npm install
npm run dev       # http://localhost:4321
npm run build     # 静的サイトビルド（dist/）
npm run check     # 型チェック
```

---

## インフラ構成（AWS CDK）

### アーキテクチャ

```
GitHub push
    ↓
GitHub Actions（OIDC 認証）
    ↓
S3 バケット（プライベート）
    ↓ OAC（Origin Access Control）
CloudFront CDN（HTTPS・キャッシュ）
    ↓
Route 53（taka-techblog.com）
```

### 主要コンポーネント

| リソース | 設定 |
|---|---|
| S3 | パブリックアクセス完全ブロック・OAC 経由のみ配信 |
| CloudFront | OAC 自動設定・PriceClass_200 |
| ACM | ワイルドカード証明書（us-east-1）・DNS 自動検証 |
| IAM | GitHub Actions OIDC ロール（長期キー不要） |

### CloudFront キャッシュ戦略

| ファイル | Cache-Control | 理由 |
|---|---|---|
| `_astro/*` | `max-age=31536000,immutable` | ハッシュ付きファイル名のため1年キャッシュ安全 |
| `*.html` | `max-age=0,no-cache` | デプロイ後即時反映 |
| `public/*` | `max-age=86400` | 画像・フォント類 |

### インフラのデプロイ（初回のみ手動）

```bash
cd infra
npm install
npx cdk bootstrap   # 初回1回だけ
npx cdk deploy --all
```

Outputs に表示された値を GitHub Secrets に設定する：

| Secret 名 | 対応する Output |
|---|---|
| `AWS_ROLE_ARN` | `GithubActionsRoleArn` |
| `S3_BUCKET` | `BucketName` |
| `CLOUDFRONT_DISTRIBUTION_ID` | `DistributionId` |

---

## CI/CD パイプライン

`main` ブランチへの push で自動実行：

```
型チェック → Astro ビルド → S3 デプロイ → CloudFront キャッシュ無効化
```

- **OIDC 認証**により、長期 IAM アクセスキーの管理が不要
- アセット別キャッシュ戦略で S3 sync を3段階に分けて実行

---

## 記事の書き方

`src/content/blog/` に Markdown ファイルを追加するだけ：

```markdown
---
title: "記事タイトル"
description: "記事の説明"
pubDate: "2026-05-17"
tags: ["AWS", "TypeScript"]
---

本文をここに書く
```

`main` に push すれば自動でビルド・デプロイされます。

---

## コスト

| サービス | 月額 |
|---|---|
| Route 53 | ~$0.51 |
| S3 | ~$0.01 |
| CloudFront | $0（無料枠内） |
| ACM | $0 |
| ドメイン | $1.25（$15/年） |
| **合計** | **~$1.77（約250円）** |

さくらのレンタルサーバー（約600円/月）から約350円/月削減。

---

## アーキテクチャのこだわり

- **サーバーレス完全移行** : DB・サーバー不要で維持費を最小化
- **IaC 管理** : CDK でインフラをコードとして Git 管理・再現可能
- **セキュリティ** : S3 パブリック非公開・OAC 配信・OIDC キーレスデプロイ
- **IndexedDB 採用** : LocalStorage より大容量・非同期・型安全な設計判断
