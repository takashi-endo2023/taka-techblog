---
title: "GitLab CI-CDを実務で運用するときの設計パターン"
emoji: "🏗️"
type: "tech"
topics: ["GitLab","DevOps","CI/CD"]
published: true
published_at: "2026-10-29 09:00"
canonical_url: "https://www.taka-techblog.com/blog/gitlab-cicd-patterns"
---

:::message
この記事は [taka-techblog](https://www.taka-techblog.com/blog/gitlab-cicd-patterns?utm_source=zenn&utm_medium=referral) にも掲載しています。
:::


本番デプロイは、最後に人間が判断する。

事故が起きたからそうしたわけではない。事故を起こさないためにそうしている。医療系スタートアップで規制対象のシステムを扱う以上、「自動で本番に上がる」という状態は選ばなかった。

これが自分のCI-CDの基本方針だ。

## 環境構成と承認フロー

治験CRM（NestJS + React）での環境構成はこうなっている。

```yaml
stages:
  - install
  - lint
  - test
  - build
  - deploy

variables:
  NODE_VERSION: "20"
```

| ブランチ | デプロイ先 | トリガー |
|---|---|---|
| develop | 開発環境 | push で自動 |
| main | ステージング | マージで自動 |
| main | 本番 | **手動承認** |

ステージングまでは自動で上がる。本番は必ず人間が実行ボタンを押す。

## 環境別デプロイの設定

```yaml
.deploy_template: &deploy_template
  stage: deploy
  image: node:20-alpine
  before_script:
    - aws configure set region ap-northeast-1

# 開発環境: 自動
deploy:dev:
  <<: *deploy_template
  variables:
    APP_ENV: development
  rules:
    - if: $CI_COMMIT_BRANCH == "develop"

# ステージング: 自動
deploy:stg:
  <<: *deploy_template
  variables:
    APP_ENV: staging
  rules:
    - if: $CI_COMMIT_BRANCH == "main"

# 本番: 手動承認
deploy:prod:
  <<: *deploy_template
  variables:
    APP_ENV: production
  when: manual
  rules:
    - if: $CI_COMMIT_BRANCH == "main"
```

`when: manual` を指定するだけで手動実行ジョブになる。GitLabの保護環境（Protected Environments）設定と組み合わせることで、実行できるロールを制限できる。

## 手動承認を入れる理由

「自動化できるなら自動化すべき」という考え方は正しいが、限界もある。

本番デプロイの前には確認したいことがある。「このタイミングで上げて問題ないか」「ステージングで見ておくべき挙動はないか」「業務担当者への連絡は済んでいるか」——これらはコードでは判断できない。

規制産業のシステムでは特にそう思っている。変更管理ドキュメントを書いて、確認して、実行する。その順序を守るために、手動ゲートは外さない。

## キャッシュ戦略

`node_modules`のキャッシュは未設定だとジョブのたびにインストールが走る。

```yaml
.node_cache: &node_cache
  cache:
    key:
      files:
        - package-lock.json
    paths:
      - .npm/
      - node_modules/
    policy: pull-push

install:
  stage: install
  <<: *node_cache
  script:
    - npm ci --cache .npm --prefer-offline
  artifacts:
    paths:
      - node_modules/
    expire_in: 1 hour

test:unit:
  stage: test
  dependencies:
    - install
  cache:
    policy: pull  # テストジョブはキャッシュを書かない
  script:
    - npm test
```

`policy: pull` を使うことで、テストジョブがキャッシュを上書きしてしまう問題を防げる。キャッシュの書き込みはinstallジョブのみに限定するのが基本だ。

## 「誰でも読めるyaml」が長く使える

CI-CDはチーム全員が日常的に触るものだ。

設定を複雑にしすぎると、「CIが壊れたときに直せる人間が限られる」という状態になる。小さいチームでは特に問題だ。変更の意図がコメントに書いてある、ステージの流れが自明、これくらいシンプルに保つのが長期運用のコツだと思っている。

---

他の記事も読む → [taka-techblog.com](https://www.taka-techblog.com?utm_source=zenn&utm_medium=referral)
X でも発信中 → [@_taka_tech](https://x.com/_taka_tech)
