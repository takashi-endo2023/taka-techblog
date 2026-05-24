---
title: "サーバ/インフラを支える技術——止まらないサービスを作るための設計思想を学んだ正直な評価"
emoji: "🖥️"
type: "tech"
topics: ["インフラ", "Linux", "AWS", "チーム開発"]
published: false
canonical_url: "https://www.taka-techblog.com/blog/server-infra-book-review"
---

:::message
この記事は [taka-techblog](https://www.taka-techblog.com/blog/server-infra-book-review?utm_source=zenn&utm_medium=referral) にも掲載しています。
:::

「止まらないサービスを作りたい」という意識はWebに携わるエンジニアに共通するものだ。

しかし「止まらない」を実現するための設計——冗長化・フェイルオーバー・負荷分散・パフォーマンスチューニング——を体系的に学ぼうとすると、どこから手をつければいいか迷う。この本はその体系化の起点になった一冊だ。

https://www.amazon.co.jp/dp/4774135666

## 本の全体構成

| 章 | 内容 |
|---|---|
| 1章 | 冗長化/負荷分散の基本——ヘルスチェック・フェイルオーバー・VRRP |
| 2章 | ワンランク上の構築——リバースプロキシ・キャッシュ・DBレプリケーション |
| 3章 | DNSサーバ・ストレージ・ネットワークの冗長化 |
| 4章 | パフォーマンスチューニング——Linux・Apache・MySQL |
| 5章 | 省力運用——監視・Puppet・daemontools・ログ管理 |
| 6章 | はてな・DSASの実際の構成事例 |

## 章ごとの評価

### 1章：冗長化/負荷分散の基本

「障害を想定する→予備機を用意する→切り替える」という冗長化の本質から入り、コールドスタンバイ・ホットスタンバイ・フェイルオーバー・VIPの仕組みまで説明している。

この考え方は今でも変わらない。AWSのMulti-AZ・ALB・Auto Scalingも、本書が説く冗長化の原則に沿っている。

### 2章：ワンランク上の構築

リバースプロキシの役割（バッファリング・Keep-Alive・URLルーティング）、Squid/memcachedによるキャッシュ、MySQLレプリケーションを扱う。

リバースプロキシとキャッシュ設計、DBレプリケーションはそれぞれ深掘り記事を書いた。

### 4章：パフォーマンスチューニング

本書で最も価値が高い章だと思っている。「推測するな、計測せよ」というアプローチで、ロードアベレージの正体・CPU/IOのボトルネックの見極め方・`sar`・`vmstat`・`ps`の使い方を体系的に解説している。

「ロードアベレージが高い＝CPUが重い」という誤解はここを読んで解消できた。

### 5章：省力運用

監視（Nagios）・設定管理（Puppet）・デーモン管理（daemontools）を扱っている。ツール自体は今は別のもの（Datadog・Ansible・systemd）に置き換わっているが、「なぜ監視が必要か」「設定管理を自動化する意義」という考え方は変わっていない。

## スピンオフ記事

| 記事 | 対応章 |
|---|---|
| [Linuxロードアベレージを正確に理解する](https://www.taka-techblog.com/blog/linux-load-average-deep-dive?utm_source=zenn&utm_medium=referral) | 4章 |
| [MySQLレプリケーション設計](https://www.taka-techblog.com/blog/mysql-replication-design?utm_source=zenn&utm_medium=referral) | 2章 |
| [リバースプロキシの役割と設計](https://www.taka-techblog.com/blog/reverse-proxy-cache-design?utm_source=zenn&utm_medium=referral) | 2章 |
| [高可用性設計の基本](https://www.taka-techblog.com/blog/high-availability-design-spof?utm_source=zenn&utm_medium=referral) | 1章 |

## どんな人に向いているか

| 読者タイプ | おすすめ度 |
|---|---|
| Webサービスの可用性設計を学びたい | ★★★★★ |
| AWSを使っているがオンプレ/Linux基礎が薄い | ★★★★★ |
| パフォーマンス問題の原因特定が苦手 | ★★★★★ |
| インフラ全体像をつかみたいアプリエンジニア | ★★★★☆ |

## 正直に言うと

2008年刊行のため、具体的なツール（Nagios・Puppet・IPVS・daemontools）は今の現場では別のものに置き換わっている。Nagios→Datadog、Puppet→Ansible/Terraform、IPVS→AWS ALBという読み替えが必要だ。

しかし「止まらないサービスをどう設計するか」という本質は変わっていない。特に4章のLinuxパフォーマンス分析の考え方は、今でもサーバのボトルネックを調査するときに直接使える。

---

他の記事も読む → [taka-techblog.com](https://www.taka-techblog.com?utm_source=zenn&utm_medium=referral)
X でも発信中 → [@_taka_tech](https://x.com/_taka_tech)
