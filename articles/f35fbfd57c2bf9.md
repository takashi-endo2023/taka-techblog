---
title: "治験データが増えるにつれてシステムが遅くなった——パフォーマンス改善の実記録"
emoji: "⚡"
type: "tech"
topics: ["NestJS", "TypeORM", "データベース", "パフォーマンス"]
published: true
published_at: "2025-07-28 09:00"
canonical_url: "https://taka-techblog.com/blog/clinical-trial-system-performance"
---

:::message
この記事は [taka-techblog](https://taka-techblog.com/blog/clinical-trial-system-performance?utm_source=zenn&utm_medium=referral) にも掲載しています。
:::

サービスインから1年半が過ぎた頃、治験システムの被験者一覧画面とレポート出力機能が「重い」と言われ始めた。

最初は「データが増えたから多少は仕方ない」という空気もあった。だが被験者数が300件を超えたあたりから、一覧表示に5秒以上かかるケースが出てきた。治験モニタリング担当者が毎日使う画面で5秒は明らかに許容範囲外だ。本腰を入れて調査することにした。

## 問題の特定：スロークエリログとの格闘

まずやったのはPostgreSQLのスロークエリログの有効化だ。閾値を1秒に設定して一日放置すると、同じクエリが大量に記録されていた。

```sql
-- スロークエリログに大量に記録されていたクエリ（抜粋）
SELECT * FROM visit_records WHERE subject_id = 1;  -- 実行時間: 0.8s
SELECT * FROM visit_records WHERE subject_id = 2;  -- 実行時間: 0.8s
SELECT * FROM visit_records WHERE subject_id = 3;  -- 実行時間: 0.8s
-- ...（被験者数分だけ繰り返し）
```

一覧取得のAPIを追うと、原因はすぐわかった。N+1問題だ。被験者一覧を取得するクエリを1回発行した後、各被験者の最新来院記録を個別に取得するクエリを被験者数分だけ追加発行していた。被験者が300件いれば、301回のクエリが走る。

NestJSのコードを確認すると、こんな実装になっていた。

```typescript
// 改善前：N+1が発生していた実装
async getSubjects(): Promise<SubjectWithLatestVisit[]> {
  const subjects = await this.subjectRepository.find({
    where: { active: true },
  });

  // 被験者ごとに個別クエリが走る（N+1）
  const result = await Promise.all(
    subjects.map(async (subject) => {
      const latestVisit = await this.visitRecordRepository.findOne({
        where: { subjectId: subject.id },
        order: { visitDate: 'DESC' },
      });
      return { ...subject, latestVisit };
    })
  );

  return result;
}
```

## 改善1：N+1をJOINで解消する

TypeORMの `relations` オプションや `leftJoinAndSelect` を使ってクエリを1本にまとめた。

```typescript
// 改善後：JOINで1クエリに集約
async getSubjects(): Promise<SubjectWithLatestVisit[]> {
  return this.subjectRepository
    .createQueryBuilder('subject')
    .leftJoinAndMapOne(
      'subject.latestVisit',
      (qb) =>
        qb
          .select('vr.*')
          .addSelect('ROW_NUMBER() OVER (PARTITION BY vr.subject_id ORDER BY vr.visit_date DESC)', 'rn')
          .from('visit_records', 'vr'),
      'latestVisit',
      'latestVisit.subject_id = subject.id AND latestVisit.rn = 1'
    )
    .where('subject.active = :active', { active: true })
    .getMany();
}
```

単純な `relations: ['visitRecords']` ではなく、「最新1件だけ」という条件がついていたため、サブクエリとウィンドウ関数を組み合わせる必要があった。このクエリ1本に変わっただけで、300件取得の実行時間が5秒から0.8秒に改善した。

## 改善2：インデックスを追加する

スロークエリログにはもう1種類の遅いクエリがあった。来院記録のフィルタリングクエリだ。

```sql
-- 遅かったクエリ
SELECT * FROM visit_records 
WHERE subject_id = ? AND visit_date BETWEEN ? AND ?
ORDER BY visit_date DESC;
```

`EXPLAIN` で実行計画を確認すると、`visit_records` テーブルへのフルスキャンが発生していた。来院記録は累計で数万件規模になっており、件数が増えるにつれて線形に遅くなっていた。

```sql
-- 追加したインデックス
CREATE INDEX idx_visit_records_subject_date 
ON visit_records (subject_id, visit_date DESC);
```

複合インデックスを追加した結果、同クエリの実行時間が0.6秒から0.02秒に短縮した。インデックスの効果がこれほど明確に出ると、改めて「なぜ最初から設計しなかったのか」と反省する。

## 改善3：ページネーションを導入する

一覧APIが件数無制限だったことも問題だった。被験者が増えるにつれて取得・転送・描画のすべてが重くなる。

```typescript
// ページネーション対応のクエリ
async getSubjects(page: number, perPage: number) {
  const [subjects, total] = await this.subjectRepository.findAndCount({
    where: { active: true },
    order: { subjectCode: 'ASC' },
    skip: (page - 1) * perPage,
    take: perPage,
  });

  return {
    data: subjects,
    meta: {
      total,
      page,
      perPage,
      totalPages: Math.ceil(total / perPage),
    },
  };
}
```

フロントエンド側でページネーションUIを追加する必要があったため、この改善は一番コストがかかったが、体感速度への影響は最も大きかった。

## 計測→改善→再計測のサイクル

改善は「なんとなく速くなったはず」では終わらせなかった。各改善の前後でAPIのレスポンスタイムをk6で計測し、数値として記録した。

| 改善内容 | 改善前 | 改善後 |
|---|---|---|
| N+1解消（JOIN化） | 5,200ms | 820ms |
| インデックス追加 | 820ms | 180ms |
| ページネーション導入 | 180ms | 45ms |

計測値があると、改善効果をチームや関係者に説明しやすくなる。特に医療系プロジェクトは変更の根拠を記録に残す文化があるため、「計測した、改善した、また計測した」というサイクルは相性が良い。

## 治験システム特有の難しさ：データを消せない

一般的なWebサービスなら「古いデータをアーカイブする」「論理削除済みレコードを別テーブルに移す」という選択肢がある。しかし治験システムはそれができない。

規制上の要件として、治験データは監査証跡（Audit Trail）を含めて一定期間保持しなければならない。データの物理削除はもちろん、見かけ上のアーカイブであっても検索対象から完全に外すことは許されない場合がある。

これは「データを捨てて軽くする」という逃げ道がないということだ。必然的にインデックス設計・クエリ最適化・ページネーションといった「増え続けるデータとうまく付き合う」アプローチが重要になる。

現在はパーティショニング戦略も検討中だ。来院日を基準にレンジパーティションを設定し、直近1年の来院記録と過去分を別パーティションに分けることで、よく使われる範囲のクエリを速くする方向性を試している。

## まとめ

パフォーマンス問題の原因は「N+1・インデックス不足・件数無制限」という古典的な組み合わせだった。だが「古典的」であることは「気づきにくい」とは別の話で、実際にサービスインしてデータが増えるまで表面化しなかった。

設計段階でパフォーマンスを考慮するためには、「データが10倍・100倍になったときにこのクエリはどうなるか」を問う習慣が必要だと学んだ。治験システムのように長期運用前提でデータが積み上がるシステムでは、この問いをより早い段階で持つべきだったと思っている。

---

他の記事も読む → [taka-techblog.com](https://taka-techblog.com?utm_source=zenn&utm_medium=referral)
X でも発信中 → [@taka_tech1988](https://x.com/taka_tech1988)
