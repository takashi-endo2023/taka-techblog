---
title: "RAGをやめてツールベースに切り替えた話——LangChain.jsとCRMの相性"
emoji: "🔀"
type: "tech"
topics: ["AI","LLM","NestJS","LangChain"]
published: false
published_at: "2026-11-19 09:00"
canonical_url: "https://www.taka-techblog.com/blog/langchain-nestjs-ai-integration"
---

:::message
この記事は [taka-techblog](https://www.taka-techblog.com/blog/langchain-nestjs-ai-integration?utm_source=zenn&utm_medium=referral) にも掲載しています。
:::


治験CRMにAIを乗せようとしたとき、最初にやったのはRAGだった。結果的に、それをやめてツールベースの実装に切り替えた。その判断の経緯を書いておく。

## 最初にRAGを試みた理由

CRMには被験者データと治験記録が蓄積されている。「自然言語で呼び出せたら便利だろう」と思った。「来月来院予定の被験者を教えて」とか「このプロトコルに該当する被験者は？」という問いに答えられれば、現場の操作コストが下がるはずだった。

LangChain.jsのRAG実装を試した。被験者テーブルや来院スケジュールのデータをベクトル化して、質問に近いレコードを引っ張ってくる構成だ。

## RAGをやめた理由

動かしてみて、根本的な問題に気がついた。

**CRMは「記録システム」だ。**

記録システムで怖いのは「もっともらしい嘘」だ。RAGは類似ドキュメントを参照して回答を生成するが、完全一致を保証しない。「来月来院予定の被験者」を聞いたとき、近い日付のレコードをいくつか参照して「それらしい」回答を返すことがある。

治験の現場で「それらしい」は困る。来院管理のミスは被験者への影響に直結する。精度が90%というのは、10件に1件は間違えるということだ。

加えて、患者識別情報を外部LLMに送らない原則がある。RAGのクエリを安全に設計しようとすると、匿名化の処理が複雑になり、そこにも誤りが入り込むリスクがある。

「自然言語で呼び出せたら便利」という目的より、「間違えた記録が残る」リスクのほうが重かった。

## ツールベースのRe-Actエージェントに切り替えた

方針を転換した。RAGで「それらしい回答」を生成するのではなく、**確定したSQLクエリをツールとして定義して、エージェントに選ばせる**構成にした。

LangChain.jsのRe-Actエージェントを使っている。エージェントは受け取った指示を分解し、定義されたツールを組み合わせて実行する。

```typescript
// tools/visit-schedule.tool.ts
const getUpcomingVisitsTool = tool(
  async ({ subjectId, days }: { subjectId: string; days: number }) => {
    return visitScheduleService.getUpcoming(subjectId, days);
  },
  {
    name: 'get_upcoming_visits',
    description: '指定した被験者の直近の来院予定を取得する',
    schema: z.object({
      subjectId: z.string(),
      days: z.number().describe('今日から何日先まで取得するか'),
    }),
  }
);
```

ツールの中身はNestJSのサービスを呼ぶだけだ。SQLは変わらない。エージェントが「どのツールを・どの順番で・どんな引数で呼ぶか」を判断する部分だけAIが担う。

これで「AIが間違える」リスクはツール選択の部分に限定できる。ツールが実行されれば、結果は確定したデータだ。

## プロンプトのチューニングに時間を溶かす

Re-Actエージェントで一番時間を使うのは、ここだ。

エージェントに何をさせるか、どこまでツールで処理してどこでLLMに判断させるか、ツールの `description` をどう書くか——このあたりの調整で丸一日溶けることはザラにある。

たとえばツールの description がざっくりしすぎると、エージェントが似たツールを混同する。逆に細かく書きすぎると、エッジケースに対応できない。「LLMがどう読むか」を意識しながら自然言語を調整するのは、コードのデバッグとは別種の疲労感がある。

```typescript
// 曖昧すぎる description の例（改善前）
description: '被験者情報を取得する'

// もう少し絞った description（改善後）
description: '被験者IDを指定して、その被験者の基本情報（氏名・生年月日・有効フラグ）を取得する。来院スケジュールや検査結果は別ツールを使うこと'
```

プロンプトを変えては試し、変えては試す。自動テストでカバーしにくい部分でもある。

## LangChain.jsのバージョン変化について

本筋ではないが、書いておく。

LangChain.jsは `langchain` と `@langchain/core`、`@langchain/openai` などのパッケージが分離してから、APIの変化が速い。

実装途中でインポートパスが変わって動かなくなる、ということが何度かあった。`package.json` でバージョンを厳密に固定して、上げるときは変更履歴を確認してから上げる習慣をつけた。

## RAGが向かない領域がある

「AIといえばRAG」という先入観があった。確かに、ドキュメント検索や社内wiki的なユースケースではRAGは強い。

ただ、記録システムやトランザクションデータを扱う領域では、「正確なデータを正確に返す」ことの優先度がRAGの柔軟性より上になる。

ツールベースにしたことで、「AIが何をしたか」のトレーサビリティも上がった。どのツールをどんな引数で呼んだかがログに残る。規制対象のシステムで監査に備えるなら、これは副次的なメリットだった。

プロンプトのチューニングは今も続いている。正解がないぶん、終わりも見えない作業だが、少しずつ精度が上がっていくのは実感できている。

AI機能を載せる前提となるCRM自体の設計については、[NestJSの治験CRMを引き継いで学んだバックエンド設計](/blog/nestjs-crm-design)で詳しく書いている。

---

他の記事も読む → [taka-techblog.com](https://www.taka-techblog.com?utm_source=zenn&utm_medium=referral)
X でも発信中 → [@_taka_tech](https://x.com/_taka_tech)
