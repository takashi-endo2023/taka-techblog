---
title: "TypeScriptで型安全なLangChainアプリを作る — LangChain.jsの型定義と実装パターン"
description: "LangChain.jsの型定義の扱い方からストリーミングレスポンスの型安全な実装、カスタムChainの設計まで、医療系スタートアップのNestJS実務で得た知見をまとめました。"
pubDate: "2026-01-28"
tags: ["TypeScript", "LangChain", "AI", "型安全"]
---

## はじめに

治験CRMのAI機能をNestJS + LangChain.jsで実装して半年以上が経ちます。最初の頃はPython版のドキュメントを参考にしながら書いていたのですが、LangChain.jsはPython版と型システムの思想が異なる部分が多く、何度か型エラーに悩まされました。

今回は実務で積み上げた「LangChain.jsを型安全に扱う」ためのパターンをまとめます。

## Python版との型定義の差異

Python版のLangChainは動的型付けを前提とした設計が多く、`Any`型が随所に登場します。一方、LangChain.jsはTypeScriptファーストで設計されており、インターフェースが整備されています。

たとえばチェーンの入出力を定義する際、Python版では辞書の型を気にせず書けますが、JS版では`BaseChain`の型パラメータを意識する必要があります。

```typescript
import { BaseChain, ChainInputs } from "langchain/chains";
import { ChainValues } from "langchain/schema";

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

治験データの検索結果をAIで要約するとき、レスポンスが長くなるのでストリーミングは必須です。NestJS + Server-Sent Events で以下のように実装しています。

```typescript
import { ChatOpenAI } from "langchain/chat_models/openai";
import { HumanMessage } from "langchain/schema";

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
import { RunnableSequence } from "langchain/schema/runnable";
import { StringOutputParser } from "langchain/schema/output_parser";
import { PromptTemplate } from "langchain/prompts";

// 入力の型を明示
interface ClinicalSummaryInput {
  patientId: string;
  trialPhase: "I" | "II" | "III";
  symptoms: string[];
}

const summaryChain = RunnableSequence.from<ClinicalSummaryInput, string>([
  (input) => ({
    patient_id: input.patientId,
    phase: input.trialPhase,
    symptoms_text: input.symptoms.join("、"),
  }),
  PromptTemplate.fromTemplate(
    "患者{patient_id}の{phase}相試験における症状: {symptoms_text}\n要約してください。"
  ),
  new ChatOpenAI({ modelName: "gpt-4" }),
  new StringOutputParser(),
]);

// 型付きで呼び出せる
const result: string = await summaryChain.invoke({
  patientId: "P-001",
  trialPhase: "II",
  symptoms: ["頭痛", "倦怠感"],
});
```

## エラー型の整理

LangChainのエラーは`LangChainError`を基底クラスとして複数の派生型があります。実務では以下のように分岐して処理しています。

```typescript
import {
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

1. **LCEL + ジェネリクス**: 入出力の型を明示してチェーンを組む
2. **Zodでスキーマ検証**: `StructuredOutputParser`とZodを組み合わせてLLMの出力を型安全にパース
3. **エラー境界の明確化**: LangChainエラーはサービス層でキャッチしてアプリ独自のエラーに変換
4. **ストリーミングはObservable**: NestJSとの組み合わせでは`Observable`に変換してSSEで流す

## まとめ

LangChain.jsはバージョンアップが頻繁で型定義が変わることもありますが、基本的な考え方は「入出力をジェネリクスで明示する」「エラー型を把握してレイヤーごとに変換する」の2点に集約されます。PythonのドキュメントをそのままJSに適用しようとするとハマるので、TypeScript用のAPIリファレンスを読む習慣が大切です。

医療系では特にエラーハンドリングが重要で、AIの出力が予期しない形式になったときでもアプリが壊れないよう型の堅牢性には引き続き投資していくつもりです。
