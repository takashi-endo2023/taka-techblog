---
title: "LangChain.js 2025年の現状：実務で使って感じたこと"
emoji: "⛓️"
type: "tech"
topics: ["AI", "LLM", "LangChain", "TypeScript"]
published: true
published_at: "2025-07-15 09:00"
canonical_url: "https://taka-techblog.com/blog/langchain-js-2025"
---

:::message
この記事は [taka-techblog](https://taka-techblog.com/blog/langchain-js-2025?utm_source=zenn&utm_medium=referral) にも掲載しています。
:::

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

## RAGを試みてやめた話

治験CRMに対して、最初にRAGを試みました。被験者データを自然言語で呼び出せれば現場の操作が楽になるという発想でした。

動かしてみてやめることにしました。CRMは記録システムなので、「それらしい回答」が返ってくるリスクが許容できなかった。来院予定を間違えて返すことは被験者への影響に直結します。

代わりに、確定したクエリをツールとして定義してRe-Actエージェントに選ばせる構成にしました。ツールの中身はDBクエリなので、「AIが判断する部分」はツール選択と引数にだけ限定できます。

LangChainのRAB実装そのものは、非医療系のドキュメント検索やFAQシステムなら使える場面は多いと思っています。`createRetrievalChain` と `createStuffDocumentsChain` の組み合わせはシンプルで、VectorStoreの差し替えも容易です。ユースケースに合わない場合があるという話であって、RAGの実装品質の問題ではありません。

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

---

他の記事も読む → [taka-techblog.com](https://taka-techblog.com?utm_source=zenn&utm_medium=referral)
X でも発信中 → [@taka_tech1988](https://x.com/taka_tech1988)
