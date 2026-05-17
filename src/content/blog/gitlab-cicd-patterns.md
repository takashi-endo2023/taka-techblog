---
title: "GitLab CI/CDを実務で運用するときの設計パターン"
description: "医療系スタートアップのNestJS+React構成でGitLab CI/CDを1年以上運用してわかった、環境別デプロイ・キャッシュ戦略・手動承認ゲートの設計パターンをまとめます。"
pubDate: "2025-12-01"
tags: ["GitLab", "CI/CD", "DevOps", "インフラ"]
---

## はじめに

GitLab CI/CDを使い始めて1年以上が経ちます。最初は「`.gitlab-ci.yml`に書けばいい」程度の理解でしたが、本番環境への誤デプロイやキャッシュの肥大化など様々な問題を経験しながら、徐々に設計パターンが固まってきました。

今回は治験CRM（NestJS + React）の実際の設定をベースに、GitLab CI/CDの設計ノウハウをまとめます。

## GitLab CIの基本構造

`.gitlab-ci.yml`はステージとジョブで構成されます。ステージは実行順序を定義し、同一ステージ内のジョブは並列実行されます。

```yaml
# .gitlab-ci.yml の基本構造
stages:
  - install
  - lint
  - test
  - build
  - deploy

variables:
  NODE_VERSION: "20"
  PNPM_VERSION: "8"
```

`stages`に書いた順番でジョブが実行されます。前のステージのジョブが1つでも失敗すると、以降のステージは実行されません（デフォルト動作）。

## 環境別（dev/stg/prod）のデプロイ設定パターン

環境別のデプロイで最も重要なのは「どのブランチのどの変更がどの環境に反映されるか」を明確にすることです。

```yaml
# 共通のデプロイジョブテンプレート
.deploy_template: &deploy_template
  stage: deploy
  image: node:20-alpine
  before_script:
    - npm install -g aws-cdk@latest
    - aws configure set region ap-northeast-1

# 開発環境: develop ブランチへのpushで自動デプロイ
deploy:dev:
  <<: *deploy_template
  environment:
    name: development
    url: https://dev.example.com
  variables:
    APP_ENV: development
  script:
    - cdk deploy --require-approval never
  rules:
    - if: $CI_COMMIT_BRANCH == "develop"

# ステージング: MRのマージで自動デプロイ
deploy:stg:
  <<: *deploy_template
  environment:
    name: staging
    url: https://stg.example.com
  variables:
    APP_ENV: staging
  script:
    - cdk deploy --require-approval never
  rules:
    - if: $CI_COMMIT_BRANCH == "main"

# 本番: 手動承認必須
deploy:prod:
  <<: *deploy_template
  environment:
    name: production
    url: https://example.com
  variables:
    APP_ENV: production
  script:
    - cdk deploy --require-approval never
  when: manual  # 手動承認
  rules:
    - if: $CI_COMMIT_BRANCH == "main"
```

## キャッシュ戦略（node_modulesのキャッシュ）

`node_modules`のキャッシュは効果が大きく、未設定だとジョブのたびにnpm installが走り時間とコストが無駄になります。

```yaml
# キャッシュ設定
.node_cache: &node_cache
  cache:
    key:
      files:
        - package-lock.json  # lock ファイルが変わったらキャッシュを無効化
    paths:
      - .npm/
      - node_modules/
    policy: pull-push  # デフォルト: pull-push（読み書き両方）

# install ジョブ
install:
  stage: install
  image: node:20-alpine
  <<: *node_cache
  script:
    - npm ci --cache .npm --prefer-offline
  artifacts:
    paths:
      - node_modules/
    expire_in: 1 hour  # 後続ジョブがアーティファクトで node_modules を受け取る

# テストジョブ（アーティファクトで node_modules を受け取る）
test:unit:
  stage: test
  image: node:20-alpine
  dependencies:
    - install
  cache:
    policy: pull  # テストジョブはキャッシュを書かない
  script:
    - npm test
```

`policy: pull`を使うことで、テストジョブがキャッシュを更新してしまう問題を防げます。キャッシュの書き込みはinstallジョブのみに限定するのが基本パターンです。

## 手動承認が必要なデプロイゲートの設定

本番デプロイには必ず手動承認を挟みます。GitLabでは`when: manual`を指定するだけで手動実行ジョブになります。さらに`environment.deployment_tier`と`protected_environments`を組み合わせることで、特定のロールしか本番デプロイを実行できないように制限できます。

```yaml
deploy:prod:
  stage: deploy
  when: manual
  allow_failure: false  # このジョブが実行されない限りパイプラインを止める
  environment:
    name: production
    deployment_tier: production
  script:
    - echo "本番デプロイ開始: $CI_COMMIT_SHA"
    - ./scripts/deploy-prod.sh
  rules:
    - if: $CI_COMMIT_BRANCH == "main"
      when: manual
```

GitLabの保護環境（Protected Environments）設定でDeployerロールを限定することで、誰でも本番デプロイボタンを押せないよう制限できます。これは医療系でコンプライアンス上も重要な設定です。

## GitHub Actionsとの違いで注意すること

GitHubから移行してくるエンジニアが最初に戸惑うポイントをまとめます。

**1. トリガーの書き方が違う**

```yaml
# GitHub Actions
on:
  push:
    branches: [main]

# GitLab CI
rules:
  - if: $CI_COMMIT_BRANCH == "main"
```

**2. シークレットの参照方法**

GitLab CIでは`$VARIABLE_NAME`の形式で参照します。GitLab UIの「Settings > CI/CD > Variables」で設定します。

**3. アーティファクトとキャッシュは別物**

GitLab CIでは`artifacts`（ジョブ間のファイル共有）と`cache`（ビルドの高速化）は明確に区別されています。GitHub Actionsの`actions/cache`はGitLab CIの`cache`に相当し、ジョブ間のファイル受け渡しには`artifacts`を使います。

## まとめ

GitLab CI/CDの設計で押さえておきたいポイントをまとめます。

1. **ステージとジョブの設計**: 並列実行できるジョブは同一ステージにまとめてパイプライン時間を短縮
2. **環境別デプロイ**: ブランチ戦略と連動させ、本番は`when: manual`で必ず手動承認
3. **キャッシュ**: `policy: pull`でwriteを限定し、lock fileをキャッシュキーにする
4. **保護環境**: 本番デプロイ実行者を制限してヒューマンエラーを防ぐ

CI/CDはチーム全員が日常的に使うものなので、設定を複雑にしすぎず「誰でも読める`.gitlab-ci.yml`」を目指すことが長期運用のコツだと感じています。
