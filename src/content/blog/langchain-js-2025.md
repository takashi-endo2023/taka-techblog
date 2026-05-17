---
title: "LangChain.js 2025年の現状：実務で使って感じたこと"
description: "NestJSプロジェクトでLangChain.jsを実務投入して1年。バージョン変遷の激しさ・LCEL構文への移行・RAG実装・OpenAI SDKとの使い分けまで正直にレビュー。"
pubDate: "2026-01-20"
tags: ["LangChain", "AI開発", "NestJS", "TypeScript", "LLM"]
---

## LangChain.jsを実務で使い続けた1年

社内CRMにAI機能を組み込むにあたり、LangChain.jsを選択してから約1年が経ちました。

この1年でLangChain自体も大きく変わり、「使いやすくなった部分」と「振り回された部分」の両方があります。同じスタックで検討している人の参考になればと思い、正直なレビューを書きます。

## LangChain.jsの変遷とアップデートの激しさ

LangChain.jsはバージョンアップが非常に速い。

2023年後半に使い始めたときは `LLMChain` が基本的な書き方でしたが、2024年にかけて **LCEL（LangChain Expression Language）** が推奨になりました。記述方法がほぼ別物に変わったため、既存コードの書き換えが必要になります。

```typescript
// 旧来の書き方（LLMChain）
const chain = new LLMChain({
  llm: new ChatOpenAI({ modelName: 'gpt-4o' }),
  prompt: PromptTemplate.fromTemplate('{input}'),
});
const result = await chain.call({ input: '...' });

// LCEL（現在の推奨）
const chain = prompt | llm | new StringOutputParser();
const result = await chain.invoke({ input: '...' });
```

`|` でチェーンをつなぐパイプライン記法は直感的ですが、型の扱いが少し難解で慣れが必要でした。

## 実際に実装したRAG（検索拡張生成）

患者情報や過去の問い合わせを検索して回答を生成するRAGシステムを実装しました。

```typescript
import { ChatOpenAI } from '@langchain/openai';
import { MemoryVectorStore } from 'langchain/vectorstores/memory';
import { OpenAIEmbeddings } from '@langchain/openai';
import { createRetrievalChain } from 'langchain/chains/retrieval';
import { createStuffDocumentsChain } from 'langchain/chains/combine_documents';

// ベクトルストアのセットアップ
const vectorStore = await MemoryVectorStore.fromDocuments(
  documents,
  new OpenAIEmbeddings()
);

// RAGチェーンの構築
const llm = new ChatOpenAI({ modelName: 'gpt-4o', temperature: 0 });
const combineDocsChain = await createStuffDocumentsChain({ llm, prompt });
const retrievalChain = await createRetrievalChain({
  retriever: vectorStore.asRetriever(),
  combineDocsChain,
});

const result = await retrievalChain.invoke({ input: userQuery });
```

本番ではインメモリではなくPgVector（PostgreSQL拡張）を使っています。LangChainのVectorStoreインターフェースが抽象化されているため、ストア実装の差し替えは比較的簡単でした。

## NestJSとの統合パターン

NestJSのDIコンテナとLangChainを組み合わせる場合、Providerとして登録するパターンが使いやすいです。

```typescript
// ai.module.ts
@Module({
  providers: [
    {
      provide: 'LLM_CLIENT',
      useFactory: () => new ChatOpenAI({
        modelName: 'gpt-4o',
        temperature: 0.2,
      }),
    },
    AiService,
  ],
  exports: [AiService],
})
export class AiModule {}

// ai.service.ts
@Injectable()
export class AiService {
  constructor(
    @Inject('LLM_CLIENT') private readonly llm: ChatOpenAI
  ) {}
}
```

テスト時にモックに差し替えやすくなる点でこのパターンはおすすめです。

## LangChain vs OpenAI SDK直接使用

正直に言うと、シンプルな用途ではOpenAI SDKを直接使う方が楽なケースもあります。

| 用途 | 推奨 |
|---|---|
| シンプルなテキスト生成 | OpenAI SDK直接 |
| RAG（検索拡張生成） | LangChain |
| 複数LLMの切り替え | LangChain |
| ツール呼び出し（Function Calling） | OpenAI SDK or LangChain |
| エージェント（複数ステップ） | LangChain |
| ストリーミングレスポンス | どちらでも可 |

RAGや複数ステップのエージェントを組む場合はLangChainの抽象化が活きます。「とりあえずGPTに聞く」だけなら直接SDKを使う方がシンプルです。

## 2025年時点での正直な評価

**良い点：**
- ベクトルストア・LLM・プロンプトの抽象化が揃っている
- RAG実装のサンプルが豊富
- ベンダー（OpenAI/Anthropic/Gemini）の切り替えが容易

**課題点：**
- バージョン間の破壊的変更が多い
- ドキュメントとコードが乖離することがある
- エラーメッセージが抽象化されすぎてデバッグが難しいことがある
- TypeScriptの型定義が複雑

「枯れたライブラリ」ではなく「進化途中のライブラリ」という認識が大事です。変化についていくコストを払う覚悟があるなら、RAGや複雑なAIワークフローに対して強力なツールです。

## まとめ

- LCEL構文への移行が2024年の大きな変化
- RAG実装の抽象化は実務で十分使えるレベル
- NestJSとの統合はProviderパターンが相性良い
- シンプルな用途はOpenAI SDK直接の方が楽
- バージョンアップの激しさを受け入れた上で使う
