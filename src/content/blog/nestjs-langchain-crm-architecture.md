---
title: "NestJS + LangChainで治験CRMにAI機能を追加した構成メモ"
description: "ベンダーから引き継いだNestJS+React+PostgreSQLの治験CRMに、LangChain.jsのRe-Actエージェントを追加した際のモジュール設計と判断の記録。"
pubDate: "2026-02-18"
updatedDate: "2026-05-22"
tags: ["NestJS", "LangChain", "アーキテクチャ", "AI開発", "医療IT"]
zennHash: "9brfxkct0afcsg"
zennEmoji: "⚙️"
zennType: "tech"
zennTopics: ["NestJS","LangChain","AI"]
---

引き継いだ治験CRMにAI機能を追加したときの構成と判断を記録しておく。

システムのベースはベンダーが構築したものを引き継いでいる。バックエンドはNestJS、フロントエンドはReact、データベースはPostgreSQLという構成だ。そこにLangChain.jsを使ったAIモジュールを追加した。

## 既存システムの構成

```
フロントエンド（React）
      ↕ REST API
バックエンド（NestJS）
    ├── 通常のCRUD処理
    └── AI機能モジュール（LangChain）← 追加
      ↕
データベース（PostgreSQL）
```

モノリス構成をそのまま維持した。マイクロサービス化は少人数チームの運用コストに見合わないと判断している。AI機能はNestJSのモジュールとして既存システムに追加している。

## NestJSのモジュール構成

```
src/
├── modules/
│   ├── auth/           # 認証（JWT + Passport）
│   ├── subjects/       # 被験者管理
│   ├── visit-schedule/ # 来院スケジュール
│   ├── ai/             # AI機能（LangChain統合）← 追加
│   └── ...
├── common/
│   ├── decorators/
│   ├── guards/
│   ├── interceptors/
│   └── pipes/
└── config/
```

`ai/` モジュールが `subjects/` や `visit-schedule/` のサービスを呼び出す一方向の依存にしている。循環参照はバグと同じくらい厄介なので、設計段階で排除している。

## AIモジュールの設計

LangChainをNestJSのDIコンテナに統合するときはProviderとして登録するパターンが使いやすい。

```typescript
// ai.module.ts
@Module({
  imports: [SubjectsModule, VisitScheduleModule],
  providers: [
    {
      provide: 'CHAT_MODEL',
      useFactory: () => new ChatOpenAI({
        modelName: 'gpt-4o',
        temperature: 0,
      }),
    },
    AiService,
    AgentService,
  ],
  exports: [AiService],
})
export class AiModule {}
```

テスト時にモックに差し替えやすくなる点でこのパターンは重宝している。

## RAGではなくツールベースのRe-Actエージェントを選んだ理由

AI機能の設計で最初にRAGを検討した。被験者データを自然言語で呼び出せれば便利になるという発想だ。

試みたが、やめた。

CRMは「記録システム」だ。ハルシネーション（もっともらしい嘘）のリスクが致命的になる。来院予定を「それらしい」回答で返されると困る。治験管理で間違ったデータが表示されることは、被験者への影響に直結する。

代わりに、確定したクエリをツールとして定義して、エージェントに選ばせる構成にした。LangChain.jsのRe-Actエージェントを使っている。

```typescript
// tools/subject.tool.ts
const getSubjectTool = tool(
  async ({ subjectId }: { subjectId: string }) => {
    return subjectService.findById(subjectId);
  },
  {
    name: 'get_subject',
    description: '被験者IDを指定して、その被験者の基本情報（氏名・生年月日・有効フラグ）を取得する。来院スケジュールは別ツールを使うこと',
    schema: z.object({
      subjectId: z.string(),
    }),
  }
);
```

ツールの中身はNestJSのサービスを呼ぶだけだ。SQLは変わらない。エージェントが「どのツールをどんな引数で呼ぶか」を判断する部分だけAIが担う。

## 医療データの取り扱いで徹底していること

- **外部LLMへの個人識別情報の不送信**: ツールの引数・返り値にIDが渡ることはあるが、氏名・生年月日などのPIIはLLMに直接渡さない
- **監査ログ**: どのツールをいつ誰が呼んだかを記録する
- **DTO層でのバリデーション徹底**: AIのツール呼び出し経路に入ってくる値も、既存のパイプと同様にバリデーションを通す

```typescript
// class-validatorでのバリデーション例
export class QuerySubjectDto {
  @IsString()
  @IsNotEmpty()
  @Matches(/^[A-Z]{2}-\d{4}$/)  // IDフォーマットの検証
  subjectId: string;
}
```

## 型で守る

未経験から育てているメンバーがいるので、型の安全性は特に重要だ。

- `any` 禁止（ESLintで強制）
- マジックナンバー禁止（ENUMで定義）
- コントローラーはシン設計（ビジネスロジックはサービス層のみ）

AIモジュールも例外ではなく、ツールの入出力の型はzodで定義して、TypeScriptの型推論が効く状態を維持している。

## 現状

Re-Actエージェントは動いている。プロンプトとツールのdescriptionのチューニングに時間を溶かすことが多く、「プロンプトエンジニアリング」の地味さを実感している。

「エージェントに何をさせるか」の設計が一番難しく、コードより自然言語の調整で詰まることが多い。

AI機能を追加した後に顕在化したパフォーマンス問題とその改善プロセスは、[治験データが増えるにつれてシステムが遅くなった——パフォーマンス改善の実記録](/blog/clinical-trial-system-performance)に記録している。
