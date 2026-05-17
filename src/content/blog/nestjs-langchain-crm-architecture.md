---
title: "少数精鋭チームの技術的工夫：NestJS + LangChainで作るAI搭載CRM"
description: "エンジニア3名で医療系CRMを内製した技術的工夫の全貌。NestJS + LangChain + PostgreSQL + BullMQのアーキテクチャ設計、AI機能の組み込み方、少人数でスケールする開発体制まで。"
pubDate: "2026-04-01"
tags: ["NestJS", "LangChain", "アーキテクチャ", "チーム開発", "AI開発"]
---

## エンジニア3名で医療系CRMを内製した

医療系スタートアップで、外部委託していたCRMシステムの内製化を主導しました。エンジニア3名（うち2名は未経験から育成中）、期間約1年。

「少人数でも持続可能な開発体制を作ること」が最優先の制約でした。複雑なアーキテクチャは採用できない。でも、将来のAI機能拡張も見据えた設計が必要でした。

この記事では、その中で選んだ技術的な判断と工夫を記録します。

## アーキテクチャ全体像

```
フロントエンド（Next.js）
        ↕ REST API
バックエンド（NestJS）
    ├── 通常のCRUD処理
    ├── AI機能モジュール（LangChain）
    ├── バッチ処理（BullMQ + Redis）
    └── ファイル管理（S3）
        ↕
データベース（PostgreSQL + pgvector）
```

シンプルなモノリスを選択しました。マイクロサービスはチームの学習コストが高く、少人数では運用が重くなると判断。モノリス内でモジュール分割を徹底することで保守性を担保します。

## NestJSのモジュール設計

```
src/
├── modules/
│   ├── auth/           # 認証（JWT + Passport）
│   ├── users/          # ユーザー管理
│   ├── customers/      # 顧客管理（CRMのコア）
│   ├── ai/             # AI機能（LangChain統合）
│   ├── batch/          # バッチ処理（BullMQ）
│   └── files/          # ファイル管理（S3）
├── common/
│   ├── decorators/     # カスタムデコレータ
│   ├── guards/         # 認証ガード
│   ├── interceptors/   # ロギング・レスポンス変換
│   └── pipes/          # バリデーションパイプ
└── config/             # 環境変数管理
```

各モジュールは独立していて、`ai/` モジュールが `customers/` を参照する一方向の依存にしています。循環参照はCRUDバグと同じくらい怖いので、設計段階で排除します。

## AIモジュールの設計

LangChainをNestJSのDIコンテナに統合するパターンです。

```typescript
// ai.module.ts
@Module({
  imports: [CustomersModule],
  providers: [
    {
      provide: 'CHAT_MODEL',
      useFactory: () => new ChatOpenAI({
        modelName: 'gpt-4o',
        temperature: 0.2,
      }),
    },
    {
      provide: 'EMBEDDINGS',
      useFactory: () => new OpenAIEmbeddings({
        modelName: 'text-embedding-3-small',
      }),
    },
    AiService,
    RagService,
    SummaryService,
  ],
  exports: [AiService],
})
export class AiModule {}
```

```typescript
// rag.service.ts：顧客関連の情報をRAGで検索
@Injectable()
export class RagService {
  private vectorStore: PGVectorStore;

  constructor(
    @Inject('EMBEDDINGS') private readonly embeddings: OpenAIEmbeddings,
    @InjectDataSource() private readonly dataSource: DataSource,
  ) {}

  async onModuleInit() {
    this.vectorStore = await PGVectorStore.initialize(this.embeddings, {
      postgresConnectionOptions: this.dataSource.options as PoolConfig,
      tableName: 'customer_embeddings',
      columns: {
        idColumnName: 'id',
        vectorColumnName: 'embedding',
        contentColumnName: 'content',
        metadataColumnName: 'metadata',
      },
    });
  }

  async searchSimilarCustomers(query: string, limit = 5) {
    return this.vectorStore.similaritySearch(query, limit);
  }
}
```

pgvector（PostgreSQL拡張）をベクトルストアに使っています。別サービスを立てなくてもPostgreSQLに同居できるので、インフラが増えません。少人数チームには重要な判断でした。

## バッチ処理の設計（BullMQ）

月次CSVインポートとデータ同期はBullMQで非同期処理します。

```typescript
// batch.module.ts
@Module({
  imports: [
    BullModule.forRoot({
      connection: {
        host: process.env.REDIS_HOST,
        port: parseInt(process.env.REDIS_PORT),
      },
    }),
    BullModule.registerQueue({
      name: 'csv-import',
    }),
  ],
  providers: [BatchService, CsvImportProcessor],
})
export class BatchModule {}

// csv-import.processor.ts
@Processor('csv-import')
export class CsvImportProcessor {
  @Process('import')
  async handleImport(job: Job<{ fileKey: string; userId: string }>) {
    const { fileKey, userId } = job.data;
    
    // S3からファイルを取得
    // CSVパース・バリデーション
    // トランザクションでDB更新
    // 進捗をjob.updateProgress()で更新
    await job.updateProgress(50);
    
    // 完了通知をSlackに送信
    await job.updateProgress(100);
  }
}
```

バッチ処理の進捗をフロントエンドから確認できるよう、WebSocketでリアルタイム通知する仕組みも入れています。

## TypeScriptの型でAPIを守る

少人数チームで未経験者が触るコードは、型で守ることが特に重要です。

```typescript
// create-customer.dto.ts
export class CreateCustomerDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  name: string;

  @IsEmail()
  email: string;

  @IsOptional()
  @IsPhoneNumber('JP')
  phone?: string;

  @IsEnum(CustomerStatus)
  status: CustomerStatus;
}
```

class-validatorを使い、DTO層でバリデーションを徹底しています。「どんな値が入ってくるか分からない」状態でAI処理に渡すと予期しないエラーが起きやすいので、ここは手を抜きません。

## 医療情報の取り扱いで意識したこと

医療系スタートアップという制約から、データの扱いに特に注意しました：

1. **外部LLMへの個人情報送信の禁止**: RAGで取得した顧客情報の断片をそのままGPTに送らない。要約・匿名化してから送る
2. **監査ログ**: 誰がいつどのデータにアクセスしたか、全操作をログに残す
3. **API経由でのみアクセス**: DBへの直接アクセスはアプリサーバーからのみ

LangChainのチェーン内でのデータフローを設計段階から確認し、個人情報が外部に出ないことをコードレビューで確認しています。

## 少人数チームのための開発規約

未経験者がいるチームで安定した開発を続けるために決めた規約：

- **テストは `*.spec.ts` を必ず書く**（Jestでユニットテスト）
- **コントローラーはシン設計**（ビジネスロジックはサービス層のみ）
- **型の `any` 禁止**（ESLintで強制）
- **マジックナンバー禁止**（定数・ENUMで定義）
- **PRは300行以内**（大きすぎるPRはレビューの質が下がる）

「300行以内のPR」はときに窮屈ですが、未経験エンジニアのコードを毎回丁寧にレビューするためには必要な制約でした。

## まとめ

少数精鋭チームでのAI搭載システム開発は、「シンプルさ」と「拡張性」のバランスが肝です。

- モノリス + モジュール分割で少人数でも管理しやすく
- pgvectorでインフラを増やさずRAG実装
- BullMQで非同期バッチを安全に処理
- DTO + class-validatorで型の安全性を確保
- 医療データの外部送信には特別な注意を払う

「全部使いこなす」より「チームが扱える技術で確実に動くものを作る」が少数精鋭チームの原則だと思っています。
