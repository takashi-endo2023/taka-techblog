---
title: "TypeScriptで型安全なLangChainアプリを作る —LangChain.jsの型定義と実装パターン"
emoji: "🔷"
type: "tech"
topics: ["TypeScript","LangChain","AI"]
published: true
published_at: "2026-11-22 09:00"
canonical_url: "https://www.taka-techblog.com/blog/typescript-langchain-type-safe"
---

:::message
この記事は [taka-techblog](https://www.taka-techblog.com/blog/typescript-langchain-type-safe?utm_source=zenn&utm_medium=referral) にも掲載しています。
:::


## はじめに

治験CRMのAI機能をNestJS + LangChain.jsで実装して半年以上が経ちます。最初の頃はPython版のドキュメントを参考にしながら書いていたのですが、LangChain.jsはPython版と型システムの思想が異なる部分が多く、何度か型エラーに悩まされました。

今回は実務で積み上げた「LangChain.jsを型安全に扱う」ためのパターンをまとめます。

## Python版との型定義の差異

Python版のLangChainは動的型付けを前提とした設計が多く、`Any`型が随所に登場します。一方、LangChain.jsはTypeScriptファーストで設計されており、インターフェースが整備されています。

たとえばチェーンの入出力を定義する際、Python版では辞書の型を気にせず書けますが、JS版では`BaseChain`の型パラメータを意識する必要があります。

```typescript

interface MyChainInput extends ChainInputs {
  llm: BaseLLM;
  prompt: PromptTemplate;
}

class MyChain extends BaseChain {
  private llm: BaseLLM;
  private prompt: PromptTemplate;

  constructor(fields: MyChainInput) {
    super(fields);
    this.llm = fields.llm;
    this.prompt = fields.prompt;
  }

  get inputKeys(): string[] {
    return ["query"];
  }

  get outputKeys(): string[] {
    return ["result"];
  }

  async _call(values: ChainValues): Promise<ChainValues> {
    const query = values["query"] as string;
    // ...
    return { result: "..." };
  }

  _chainType(): string {
    return "my_chain";
  }
}
```

## ストリーミングレスポンスの型安全な実装

AIエージェントの応答が長くなるケースではストリーミングが必要です。NestJS + Server-Sent Eventsで以下のように実装しています。

```typescript

// ストリーミングコールバックの型
interface StreamingCallbackHandler {
  handleLLMNewToken(token: string): Promise<void>;
}

async function streamSummary(
  query: string,
  onToken: (token: string) => void
): Promise<void> {
  const streamingCallback: StreamingCallbackHandler = {
    async handleLLMNewToken(token: string) {
      onToken(token);
    },
  };

  const llm = new ChatOpenAI({
    modelName: "gpt-4",
    streaming: true,
    callbacks: [streamingCallback],
  });

  await llm.call([new HumanMessage(query)]);
}
```

NestJSのコントローラーでは`@Sse()`デコレータと組み合わせてSSEエンドポイントとして公開しています。型の恩恵を受けるために`Observable<MessageEvent>`をきちんと返すのがポイントです。

## カスタムChainの型設計

実務では`RunnableSequence`を使ったLCEL（LangChain Expression Language）スタイルが増えてきました。ここでは入出力の型をジェネリクスで明示的に指定できます。

```typescript

// 入力の型を明示
interface ReportSummaryInput {
  reportId: string;
  category: "monthly" | "quarterly" | "annual";
  items: string[];
}

const summaryChain = RunnableSequence.from<ReportSummaryInput, string>([
  (input) => ({
    report_id: input.reportId,
    category: input.category,
    items_text: input.items.join("、"),
  }),
  PromptTemplate.fromTemplate(
    "{category}レポート（{report_id}）の項目: {items_text}\n要点を3点にまとめてください。"
  ),
  new ChatOpenAI({ modelName: "gpt-4" }),
  new StringOutputParser(),
]);

// 型付きで呼び出せる
const result: string = await summaryChain.invoke({
  reportId: "R-2025-04",
  category: "monthly",
  items: ["売上前月比+12%", "新規契約3件", "解約1件"],
});
```

医療系システムでLLMに渡すのは匿名化・集計済みのデータだけで、個人識別情報は送らない。コード例はその点を意識して設計している。

## エラー型の整理

LangChainのエラーは`LangChainError`を基底クラスとして複数の派生型があります。実務では以下のように分岐して処理しています。

```typescript
  LangChainError,
  OutputParserException,
} from "langchain/schema/output_parser";

async function safeInvoke(input: ClinicalSummaryInput) {
  try {
    return await summaryChain.invoke(input);
  } catch (error) {
    if (error instanceof OutputParserException) {
      // パース失敗はリトライ対象
      console.error("Output parse failed:", error.llmOutput);
      throw new RetryableError(error.message);
    }
    if (error instanceof LangChainError) {
      // その他のLangChainエラー
      throw new AppError("AI処理に失敗しました", error);
    }
    throw error;
  }
}
```

レート制限エラー（`RateLimitError`）やコンテキスト長超過（`ContextLengthExceededError`）は別途ハンドリングが必要なので、エラーの種類を把握しておくことが重要です。

## 実務で使っているパターンまとめ

半年間の運用で定着したパターンを整理すると：

1. **LCEL +ジェネリクス**: 入出力の型を明示してチェーンを組む
2. **Zodでスキーマ検証**: `StructuredOutputParser`とZodを組み合わせてLLMの出力を型安全にパース
3. **エラー境界の明確化**: LangChainエラーはサービス層でキャッチしてアプリ独自のエラーに変換
4. **ストリーミングはObservable**: NestJSとの組み合わせでは`Observable`に変換してSSEで流す

## まとめ

LangChain.jsはバージョンアップが頻繁で型定義が変わることもありますが、基本的な考え方は「入出力をジェネリクスで明示する」「エラー型を把握してレイヤーごとに変換する」の2点に集約されます。PythonのドキュメントをそのままJSに適用しようとするとハマるので、TypeScript用のAPIリファレンスを読む習慣が大切です。

医療系では特にエラーハンドリングが重要で、AIの出力が予期しない形式になったときでもアプリが壊れないよう型の堅牢性には引き続き投資していくつもりです。

型安全な実装の先にある実務全体の評価は、[LangChain.js 2025年の現状：実務で使って感じたこと](/blog/langchain-js-2025)にまとめています。

---

他の記事も読む → [taka-techblog.com](https://www.taka-techblog.com?utm_source=zenn&utm_medium=referral)
X でも発信中 → [@_taka_tech](https://x.com/_taka_tech)
