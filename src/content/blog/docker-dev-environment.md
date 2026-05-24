---
title: "Docker開発環境を標準化してチームの「動かない」を減らす"
description: "「自分のPCでは動く」問題を撲滅するためにDocker開発環境を整備した話。docker-compose設計・.env管理・M1/M2 Macの罠・NestJS+PostgreSQL構成まで実践的にまとめます。"
pubDate: "2025-02-02"
tags: ["DevOps", "チーム開発", "NestJS"]
---

## 「自分のPCでは動く」が多発していた

内製化を進めて1年が経った頃、チームで繰り返し発生していた問題がありました。

「Aさんの環境では動くけど、BさんのMacでは起動しない」「Node.jsのバージョンが違ってエラーになる」「ローカルのPostgreSQLの設定が合わない」——こうしたトラブルが新しいメンバーが加わるたびに再現していました。

未経験から育てているエンジニアにとって、環境構築でつまずくのは特に辛いです。コードを書く前に心が折れる。それを防ぐためにDockerによる開発環境の標準化に踏み切りました。

## docker-composeの設計方針

CRM（NestJS + PostgreSQL）の構成を例に説明します。

```yaml
# docker-compose.yml
version: '3.9'

services:
  api:
    build:
      context: .
      dockerfile: Dockerfile.dev
    volumes:
      - .:/app
      - /app/node_modules
    ports:
      - '3000:3000'
    env_file:
      - .env
    depends_on:
      db:
        condition: service_healthy
    command: npm run start:dev

  db:
    image: postgres:15-alpine
    ports:
      - '5432:5432'
    environment:
      POSTGRES_USER: ${DB_USER}
      POSTGRES_PASSWORD: ${DB_PASSWORD}
      POSTGRES_DB: ${DB_NAME}
    volumes:
      - postgres_data:/var/lib/postgresql/data
    healthcheck:
      test: ['CMD-SHELL', 'pg_isready -U ${DB_USER}']
      interval: 5s
      timeout: 5s
      retries: 5

volumes:
  postgres_data:
```

ポイントは `depends_on` に `condition: service_healthy` を指定していること。DBが完全に起動する前にAPIが接続しようとして失敗するパターンを防げます。

## .env管理のルール

環境変数は `.env.example` をリポジトリに含め、実際の値が入った `.env` は `.gitignore` に追加します。

```bash
# .env.example（リポジトリに含める）
DB_USER=postgres
DB_PASSWORD=your_password_here
DB_NAME=crm_db
DB_PORT=5432
JWT_SECRET=your_jwt_secret_here
```

新メンバーへの初期セットアップ手順はたったこれだけにしました：

```bash
cp .env.example .env
# .envを編集してパスワードなどを設定
docker compose up -d
```

## M1/M2 Macで詰まったところ

Apple Siliconへの移行で特定のDockerイメージがarm64に対応していない問題が出ました。

```yaml
# platformを明示して解決
services:
  db:
    image: postgres:15-alpine
    platform: linux/amd64  # M1/M2 Macでの互換性確保
```

または `docker-compose.yml` のトップレベルに設定する方法もあります：

```yaml
version: '3.9'
x-common-variables: &common-variables
  platform: linux/amd64
```

チームにM1/M2ユーザーとIntelユーザーが混在するため、両方で動くことを確認してから `platform` 指定を入れるようにしました。

## ホットリロードの設定

`volumes` でソースコードをマウントすることでホットリロードが効きますが、NestJSのwatch modeでは `node_modules` のマウント除外が重要です。

```yaml
volumes:
  - .:/app
  - /app/node_modules  # ← これがないとホストのnode_modulesで上書きされる
```

Dockerfileも開発用と本番用を分けています：

```dockerfile
# Dockerfile.dev
FROM node:20-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci
# COPY . . はしない（volumesでマウントするため）
CMD ["npm", "run", "start:dev"]
```

## チームへの浸透で意識したこと

最初は「Dockerを覚えるコストが高い」という声もありました。そこで「コマンドの意味を理解しなくていい、まずこの3行を叩けば動く」という形で導入しました。

```bash
docker compose up -d    # 起動
docker compose logs -f  # ログ確認
docker compose down     # 停止
```

理解は後からついてきます。「動く体験」を先に作ることが大切でした。

## まとめ

Docker環境の標準化で得たものは以下の通りです：

- 新メンバーのセットアップ時間が**半日→30分**に短縮
- 「環境が違う」起因のバグ報告がほぼゼロに
- 「自分のPCで動いた」を言い訳にできない文化が定着

環境構築でメンバーの時間を奪わないことは、チームの生産性と心理的安全性の両方に効きます。

ローカル環境が整ったら次はCI/CDの整備です。パイプラインの設計パターンは[GitLab CI-CDを実務で運用するときの設計パターン](/blog/gitlab-cicd-patterns)にまとめています。
