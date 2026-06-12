---
title: "CloudWatchでAWSを監視する——メトリクス・アラーム・ログの実務パターン"
emoji: "📊"
type: "tech"
topics: ["AWS","DevOps","インフラ"]
published: false
published_at: "2026-10-15 09:00"
canonical_url: "https://www.taka-techblog.com/blog/aws-cloudwatch-monitoring"
---

:::message
この記事は [taka-techblog](https://www.taka-techblog.com/blog/aws-cloudwatch-monitoring?utm_source=zenn&utm_medium=referral) にも掲載しています。
:::



「デプロイしたら終わり」ではなく「デプロイしてからが本番」だと思っている。どんなにコードの品質が高くても、本番環境で何が起きているか見えない状態では安心して運用できない。AWSにおける監視の中心はCloudWatchだ。

このブログもCloudFrontのアクセスログをCloudWatchに流しているが、業務システムではEC2・RDS・ECSなど複数のリソースを横断して監視する必要がある。実務で構築してきた監視の考え方と、具体的なCloudWatchの使い方を整理する。

## CloudWatchの構成要素を整理する

CloudWatchは複数の機能が統合されたモニタリングサービスだ。まず全体像を把握しておく。

| 機能 | 役割 |
|---|---|
| メトリクス | CPUやメモリなどの数値データの収集・可視化 |
| アラーム | メトリクスが閾値を超えたときの通知・自動アクション |
| Logs | アプリケーション・AWSサービスのログ収集 |
| Logs Insights | ログのクエリ・分析 |
| ダッシュボード | メトリクスの一覧表示 |
| Container Insights | ECS / EKS専用のメトリクス収集 |

最初に「メトリクスで数値を見る」「アラームで異常を検知する」「Logsで原因を調べる」という3段階の流れを頭に入れておくと、設計がシンプルになる。

## メトリクス——何を見るべきか

AWSサービスの多くはデフォルトでCloudWatchにメトリクスを送信している。ただし**デフォルトメトリクスだけでは不十分**なケースも多い。

### EC2の基本メトリクス

デフォルトでは5分間隔で以下が取得できる。

- `CPUUtilization`：CPU使用率
- `NetworkIn` / `NetworkOut`：ネットワーク転送量
- `DiskReadOps` / `DiskWriteOps`：ディスクI/O

**メモリ使用率はデフォルトでは取得できない。** これは初学者がよくハマるポイントだ。EC2の内部情報（メモリ・ディスク使用率）を取得するには**CloudWatch Agentのインストール**が必要だ。

```bash
# CloudWatch Agentのインストール（Amazon Linux 2の場合）
sudo yum install amazon-cloudwatch-agent

# 設定ウィザードの起動
sudo /opt/aws/amazon-cloudwatch-agent/bin/amazon-cloudwatch-agent-config-wizard
```

設定ファイルを手動で作る場合は以下のようなJSONを`/opt/aws/amazon-cloudwatch-agent/etc/amazon-cloudwatch-agent.json`に配置する。

```json
{
  "metrics": {
    "namespace": "CWAgent",
    "metrics_collected": {
      "mem": {
        "measurement": ["mem_used_percent"],
        "metrics_collection_interval": 60
      },
      "disk": {
        "measurement": ["disk_used_percent"],
        "resources": ["/"],
        "metrics_collection_interval": 60
      }
    }
  }
}
```

### RDSのメトリクス

RDSは以下を優先的に監視する。

- `CPUUtilization`：DB処理の負荷
- `FreeableMemory`：利用可能なメモリ量
- `DatabaseConnections`：接続数（上限に達するとエラーになる）
- `ReadLatency` / `WriteLatency`：クエリのレイテンシ

`DatabaseConnections`はアプリ側のコネクションプール設定ミスで急増することがある。アラームを設定して即座に気づける状態にしておきたい。

## アラーム——閾値の設計が肝

メトリクスを眺めているだけでは監視にならない。**異常が起きたときに自動で通知する仕組み**がアラームだ。

### 基本的なアラームの作成

```bash
# EC2のCPU使用率が80%を5分間超えたらSNSに通知するアラーム
aws cloudwatch put-metric-alarm \
  --alarm-name "high-cpu-utilization" \
  --alarm-description "CPU使用率が80%を超えました" \
  --metric-name CPUUtilization \
  --namespace AWS/EC2 \
  --statistic Average \
  --period 300 \
  --threshold 80 \
  --comparison-operator GreaterThanThreshold \
  --evaluation-periods 2 \
  --alarm-actions arn:aws:sns:ap-northeast-1:123456789012:alert-topic \
  --dimensions Name=InstanceId,Value=i-xxxxxxxxxx
```

`--evaluation-periods 2`は「連続2回（合計10分）閾値を超えたら発報」という設定だ。一瞬のスパイクで誤報が出ないよう、適切な評価期間を設定することが重要だ。

### 閾値の決め方

「CPU 80%超えたらアラート」のような数値の根拠を問われたとき、答えられるように設計したい。

- **最初は広めに設定**して運用しながら調整する
- **過去のメトリクスを見て正常な値の範囲**を把握してから閾値を決める
- **ALBの5xxエラー率**など、ビジネス影響に直結するメトリクスは特に優先する

Anomaly Detection（異常検出）機能を使うと、CloudWatchが過去データから正常範囲を自動学習してくれるため、固定閾値より賢いアラームを作れる。

## CloudWatch Logs——ログを活かす

### ロググループの設計

ログは**ロググループ**単位で管理する。サービスや環境ごとに分けると管理しやすい。

```
/aws/lambda/my-function
/aws/ecs/my-service
/app/my-service/production
/app/my-service/staging
```

**保持期間の設定を忘れがち**だ。デフォルトは無期限でコストが積み上がる。用途に応じて明示的に設定する。

```bash
# ロググループの保持期間を30日に設定
aws logs put-retention-policy \
  --log-group-name /app/my-service/production \
  --retention-in-days 30
```

### Logs Insightsでログを分析する

CloudWatch Logs Insightsは、大量のログに対してSQLライクなクエリを実行できる機能だ。障害調査やパフォーマンス分析で特に役立つ。

```
# エラーログを直近1時間で集計するクエリ
fields @timestamp, @message
| filter @message like /ERROR/
| stats count(*) as error_count by bin(5m)
| sort @timestamp desc
```

```
# レイテンシが500ms超えたリクエストを調べる
fields @timestamp, requestId, duration
| filter duration > 500
| sort duration desc
| limit 20
```

コンソールからクエリを直接実行できるため、障害対応中でも素早くログを絞り込める。

## 実務で気をつけていること

### CloudWatchコストのコントロール

CloudWatchは便利だが、設定を間違えるとコストが膨らむ。特に注意したいのは以下だ。

- **カスタムメトリクスは1メトリクスあたり課金される**——不要なものは作らない
- **高解像度メトリクス（1秒間隔）**はコストが高い——5分でも十分なら5分にする
- **ログの転送量と保存量**——Lambdaをよく使う環境ではログ量が想定外に増えやすい

### ダッシュボードで全体を一覧する

個別のアラームが発報してから確認するだけでなく、**ダッシュボードで日常的に全体を眺める**習慣をつけると、問題が顕在化する前の傾向に気づけるようになる。

重要なメトリクスをひとつのダッシュボードにまとめて、朝のスタンドアップ前に一度見る、というフローをチームで共有するだけでも運用品質が上がる。

### SNS + Slackで通知を統合する

アラームの通知先はSNSトピックに集約し、Lambda経由でSlackに送るパターンが現場でよく使われる。PagerDutyなどのインシデント管理ツールと連携するケースもある。

```bash
# SNSトピックの作成
aws sns create-topic --name alert-topic

# アラームをSNSに接続（前述のput-metric-alarmで指定済み）
# SNSのサブスクライバーにLambda（Slack通知）を追加
aws sns subscribe \
  --topic-arn arn:aws:sns:ap-northeast-1:123456789012:alert-topic \
  --protocol lambda \
  --notification-endpoint arn:aws:lambda:ap-northeast-1:123456789012:function:slack-notifier
```

## 治験システムの監視設計——「アラートの質」が運用の質を決める

医療系スタートアップで初めて本格的な監視設計をしたとき、最初に犯したミスは「アラートを細かく設定しすぎた」ことだ。

被験者データの重要性から「何かあったらすぐ気づきたい」という思いで、CPU 70%超、メモリ60%超、API レスポンス2秒超など、閾値を低めに設定したアラートを大量に作った。結果、夜中に何度もSlack通知が来るようになり、チーム全員が通知をミュートするようになった。

「アラートが多すぎると誰も信用しなくなる」——これはインシデント対応の原則として知ってはいたが、自分が設定した監視で実体験することになった。

改善したのは「アラートの優先度を3段階に分ける」ことだ。

- **P1（即対応）**：被験者データの書き込みエラー、認証APIの停止——深夜でもSlack通知
- **P2（営業時間内対応）**：レスポンスタイム劣化、ディスク使用率80%超——朝のSlack通知
- **P3（週次確認）**：CPU長期高負荷傾向、ログエラー頻度上昇——CloudWatchダッシュボードで確認

治験システム特有の観点として、**ビジネスメトリクスの監視**も重要だった。「被験者の同意記録が24時間以内に入力されているか」「有害事象報告が規定時間内に送信されているか」——これらは技術メトリクスではなく業務フローのメトリクスだが、カスタムメトリクスとしてCloudWatchに送ることで、技術チームが業務の遅延を早期に検知できるようにした。

Logs Insightsは障害調査で何度も助けられた。特定の被験者IDで処理が失敗するケースを「ログの全文検索ができない」状況で追いかけるのは、Linuxの `grep` 芸では限界がある。Logs InsightsのSQL的なクエリで「特定エラーが発生した被験者IDの一覧」を秒単位で出せるようになったのは、医療系システム特有の「なぜこの人だけエラーが出るのか」調査に特に効いた。

## まとめ

CloudWatchを実務で活かすポイントをまとめる。

- **EC2のメモリ・ディスク監視はCloudWatch Agentが必要**——デフォルトでは取得できない
- **アラームは連続評価期間を設定**して誤報を減らす
- **ログの保持期間を明示的に設定**してコストを管理する
- **Logs Insightsを使えばログの障害調査が格段に速くなる**
- **ダッシュボードで日常的に眺める**習慣をチームに根付かせる

監視は「何かあったとき用」ではなく「普段から状態を把握し続けるため」にある。設計と運用の両面でCloudWatchを使いこなすことが、安定したAWS運用の基盤になる。

監視を含むAWS運用全体の地図をつかみたい人には、[「AWS運用入門」を知識ゼロで引き継いだ自分が読んだ正直な評価](/blog/aws-operation-introduction-review)も参考になるはずだ。自分が運用を引き継いだときに最初に読んだ一冊をレビューしている。

監視と合わせて考えておきたいのが可用性設計だ。障害を検知するだけでなく、起きても止まらない仕組みを作るための考え方は[高可用性設計の基本——SPOF排除とフェイルオーバーで「止まらないサービス」を作る](/blog/high-availability-design-spof)で整理している。

---

他の記事も読む → [taka-techblog.com](https://www.taka-techblog.com?utm_source=zenn&utm_medium=referral)
X でも発信中 → [@_taka_tech](https://x.com/_taka_tech)
