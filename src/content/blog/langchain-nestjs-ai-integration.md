---
title: "医療系CRMにLangChain × NestJSでAI連携を実装した話"
description: "治験CRMにLangChain.jsとNestJSを使ったAI機能を実装した実録。Chain・Agent・RAGの選択判断から医療データのセキュリティ考慮、LangChainで詰まったポイントまで解説します。"
pubDate: "2026-02-10"
tags: ["LangChain", "NestJS", "TypeScript", "AI連携", "医療IT"]
---

治験CRMにAI機能を入れようと動き出したのは去年の秋だった。「LangChain × NestJS でやってみる」と宣言してから実装完了まで約3ヶ月。その経緯と詰まったポイントを記録しておく。

## なぜ医療系でAI機能が必要になったか

治験では大量のドキュメントと患者データを扱う。現場スタッフからよく出ていた声がこれだ。

- 「過去の症例メモを探すのに毎回時間がかかる」
- 「プロトコルの該当箇所をすぐ参照したい」
- 「訪問記録の要約を自動で作ってほしい」

これらは全部「社内に蓄積されたドキュメントを賢く検索・活用する」ユースケースだ。LangChain + RAGが向いている領域だと判断した。

## アーキテクチャ設計：Chain vs Agent vs RAG の選択

最初に悩んだのがどのアプローチを使うかだ。

| アプローチ | 向いているケース | 今回の判断 |
|-----------|----------------|-----------|
| Chain | 決まったフローの処理 | シンプルな要約タスクに使用 |
| Agent | ツールを組み合わせた推論 | 将来の拡張用に設計のみ |
| RAG | 社内ドキュメントへの質問応答 | メイン実装として採用 |

NestJSのモジュール構成はこうした：

```typescript
// ai.module.ts
@Module({
  imports: [VectorStoreModule, DocumentModule],
  providers: [
    AiService,
    RagChainService,
    EmbeddingService,
  ],
  exports: [AiService],
})
export class AiModule {}
```

RAGの核となる部分はこのように実装した：

```typescript
// rag-chain.service.ts
import { Injectable } from '@nestjs/common';
import { ChatOpenAI } from '@langchain/openai';
import { createRetrievalChain } from 'langchain/chains/retrieval';
import { createStuffDocumentsChain } from 'langchain/chains/combine_documents';

@Injectable()
export class RagChainService {
  private chain: ReturnType<typeof createRetrievalChain> extends Promise<infer T> ? T : never;

  async initialize(retriever: VectorStoreRetriever) {
    const llm = new ChatOpenAI({ modelName: 'gpt-4o', temperature: 0 });
    const documentChain = await createStuffDocumentsChain({ llm, prompt });
    this.chain = await createRetrievalChain({ retriever, combineDocsChain: documentChain });
  }

  async query(input: string): Promise<string> {
    const result = await this.chain.invoke({ input });
    return result.answer;
  }
}
```

## 医療データを扱う上でのセキュリティ・プライバシー考慮

医療系だからといって特別なことをするというより、当たり前のことを徹底する、という感覚が近い。

**やったこと：**
- 患者識別子（ID）を外部LLMに送らない設計（RAGのクエリには匿名化した情報のみ使用）
- ベクターストアへのアクセスは社内ネットワーク経由のみ
- LLMのプロンプトに個人情報が混入しないようDTOレベルでフィルタリング
- ログにはAIの入出力を記録するが、PIIは自動マスキング

```typescript
// ai-sanitizer.ts
export function sanitizeForLLM(text: string): string {
  // 患者IDパターンを除去（例: PT-XXXXX 形式）
  return text.replace(/PT-\d{5}/g, '[PATIENT_ID]');
}
```

## LangChain.jsで詰まったポイント

**1. バージョン変更が激しすぎる問題**

LangChain.jsは破壊的変更が多い。`langchain` と `@langchain/core`、`@langchain/openai` が分離されたタイミングでインポートパスが全部変わって半日溶かした。`package.json` で厳密にバージョン固定することをおすすめする。

**2. ストリーミングレスポンスをNestJSで返す方法**

LangChainのストリーミングをNestJSのSSEで返す際、`StreamableFile` と組み合わせる実装が公式ドキュメントに載っていなくて詰まった。

```typescript
@Get('stream')
async streamQuery(@Query('q') query: string, @Res() res: Response) {
  res.setHeader('Content-Type', 'text/event-stream');
  const stream = await this.ragChainService.streamQuery(query);
  for await (const chunk of stream) {
    res.write(`data: ${JSON.stringify({ text: chunk })}\n\n`);
  }
  res.end();
}
```

## 動かしてみた所感と次のステップ

ドキュメント検索の精度は想定より高く、現場スタッフからも「探す時間が減った」というフィードバックをもらえた。ただ、ハルシネーション（もっともらしい嘘）のリスクは依然あるため、「AIの回答には必ず元ドキュメントのソースを表示する」というUX設計が重要だと実感している。

次は Agent を使った複数ツール連携と、ファインチューニングへの挑戦を考えている。

## まとめ

LangChain × NestJSの組み合わせはTypeScriptで完結できる点が大きな強みだ。医療データを扱う際のポイントは「LLMに何を送らないか」を設計の中心に置くこと。

LangChainのバージョン変化には心理的に慣れるしかないが、RAGの実装体験としては非常に学びが多かった。AI機能を業務システムに組み込みたい人の参考になれば嬉しい。
