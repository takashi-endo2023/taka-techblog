---
title: "AIで議事録を構造化する：LLMに「使える議事録」を作らせるプロンプト設計"
description: "会議の録音・文字起こしをLLMで構造化議事録に変換する実践。単なる要約ではなく「決定事項・アクションアイテム・未解決課題」を分けて出力させるプロンプト設計と、NestJSでのAPI実装例。"
pubDate: "2026-01-05"
tags: ["AI開発", "LangChain", "LLM", "業務効率化", "NestJS"]
---

## 「議事録が残らない」問題

医療系スタートアップでは、毎日のように会議があります。プロダクト定例・経営報告・採用面談・取引先MTG——それぞれに議事録が必要ですが、書く時間と質にばらつきがある。

「この前の会議で何が決まったっけ？」「あのアクションアイテム、誰が担当だっけ？」という問いに毎回時間を取られていました。

LLMで議事録を構造化する仕組みを作ったことで、この問題がほぼ解決しました。

## 「要約」ではなく「構造化」が大事

最初に試したのは「この会議の要約をしてください」というシンプルなプロンプトでした。出力された要約はそれなりに読めますが、**議事録として使えない**のです。

議事録に必要なのは：
- **決定事項**: この会議で決まったこと（誰も覆せない合意）
- **アクションアイテム**: 誰が・何を・いつまでに
- **未解決課題**: 持ち越しになった論点
- **次回アジェンダ候補**: 次に話すべきこと

この4つが明確に分かれていることで初めて「使える議事録」になります。

## プロンプト設計

```typescript
const MEETING_NOTES_PROMPT = `
あなたは会議ファシリテーターです。以下の会議記録から、構造化された議事録を作成してください。

## 出力形式（JSON）
{
  "meeting_summary": "会議全体の1〜2文の概要",
  "decisions": [
    {
      "content": "決定内容",
      "context": "なぜその決定に至ったかの簡潔な背景"
    }
  ],
  "action_items": [
    {
      "assignee": "担当者名",
      "task": "タスク内容",
      "due_date": "期限（言及があれば）",
      "priority": "high/medium/low"
    }
  ],
  "open_issues": [
    {
      "issue": "未解決の論点",
      "context": "どんな意見が出たか"
    }
  ],
  "next_agenda_candidates": ["次回話すべきトピック"]
}

## 注意事項
- decisionsは「全員が合意した事項」のみ含める
- 議論中の意見や提案はopen_issuesに含める
- action_itemsの担当者が不明な場合は"TBD"とする
- 期限の言及がない場合はdue_dateを空文字にする

## 会議記録
{transcript}
`;
```

JSON形式で出力させることで、後段での処理（DB保存・Slack通知など）がやりやすくなります。

## NestJSでの実装

```typescript
// meeting-notes.service.ts
@Injectable()
export class MeetingNotesService {
  constructor(
    @Inject('LLM_CLIENT') private readonly llm: ChatOpenAI,
  ) {}

  async structureMeetingNotes(transcript: string): Promise<StructuredMeetingNotes> {
    const prompt = ChatPromptTemplate.fromMessages([
      ['system', MEETING_NOTES_PROMPT],
      ['human', '{transcript}'],
    ]);

    const chain = prompt
      | this.llm.bind({ response_format: { type: 'json_object' } })
      | new JsonOutputParser<StructuredMeetingNotes>();

    const result = await chain.invoke({ transcript });
    return result;
  }
}
```

`response_format: { type: 'json_object' }` を指定することで、GPT-4oがJSONとして出力することを保証します（モデルによって異なる）。

## 文字起こしとの連携

会議録音からの自動化フローはこのようになっています：

```
録音ファイル（MP3/M4A）
    ↓
Whisper API（音声→テキスト）
    ↓
前処理（話者ラベルの整理、ノイズ除去）
    ↓
GPT-4o（テキスト→構造化JSON）
    ↓
DB保存 + Slack通知
```

Whisper APIの出力は話者の区別がないため、「発言者Aが言ったこと」と「発言者Bが言ったこと」が混在したテキストになります。前処理でどう整理するかがプロンプト設計と同じくらい重要です。

## 実際の出力例

入力：30分の製品定例の文字起こし（約5,000文字）

出力（抜粋）：
```json
{
  "meeting_summary": "CRMの顧客管理機能のフェーズ2仕様確認と、Q2のリリーススケジュール調整を行った",
  "decisions": [
    {
      "content": "顧客インポート機能のバリデーション仕様はバックエンドチームの案を採用する",
      "context": "フロント実装コストとエラーUXのトレードオフを検討した結果"
    }
  ],
  "action_items": [
    {
      "assignee": "田中",
      "task": "CSVインポートAPIの仕様書を作成する",
      "due_date": "2025-01-15",
      "priority": "high"
    }
  ],
  "open_issues": [
    {
      "issue": "エラー通知の方法（メール vs Slack）が未決定",
      "context": "メール派とSlack派で意見が分かれており、次回確認予定"
    }
  ]
}
```

これをそのままDBに保存し、週次のサマリーとしてSlackに流す仕組みにしています。

## 精度を上げるためにやったこと

1. **Few-shot例をプロンプトに含める**: 良い出力の例を1〜2件プロンプトに含めることで一貫性が上がった
2. **会議の種類でプロンプトを分ける**: 経営会議・技術定例・採用面談では重視するポイントが違う
3. **出力のバリデーション**: ZodでJSONスキーマを定義し、壊れた出力を検出してリトライ
4. **温度パラメータを低く**: `temperature: 0` で決定論的な出力を優先

## まとめ

- 「要約」ではなく「構造化」することで使える議事録になる
- JSON出力形式指定で後処理が楽になる
- Few-shot例と会議種別ごとのプロンプトで精度向上
- Whisperとの連携で録音→議事録を自動化
- Zodでバリデーションしてリトライ機構を持つ
