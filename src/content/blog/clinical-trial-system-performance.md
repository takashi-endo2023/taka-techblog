---
title: "治験データが増えるにつれてシステムが遅くなった——パフォーマンス改善の実記録"
description: "治験システムの被験者管理・来院記録が蓄積されるにつれて発生したパフォーマンス問題。N+1解消・インデックス追加・ページネーション導入の改善プロセスを記録する。"
pubDate: "2025-01-06"
updatedDate: "2026-05-21"
tags: ["パフォーマンス", "データベース", "NestJS", "医療IT"]
---

「システムが重い」という声が来た。最初は、全くわからなかった。

ベンダーから引き継いだコードは、表面的なタスクをこなすには十分だった。でもコアな技術——クエリの設計、インデックスの仕組み、マテリアライズドビューの概念——は触れてこなかった領域だった。

しばらくの間、現場からの「重い」という声に対して、心の中でこう思っていた。**「ベンダーが作ったものだから」**。

口には出さなかったが、言い訳にしていた。悔しかった。歯痒かった。でも向き合う技術が、まだなかった。

## 愛着が、向き合う力になった

変わったのは、自然にだった。

長く触り続けると、コードに愛着が湧いてくる。「ベンダーが作ったもの」という感覚が薄れて、「自分たちが管理するもの」という自覚に変わっていく。2年ほどかけて、ようやくマテリアライズドビューの概念が理解できるようになった頃、「もうちゃんと向き合おう」という気持ちになっていた。

きっかけは特定の出来事ではない。長く触り続けた結果として、自然にそうなった。

## 問題の特定：スロークエリログとの格闘

腰を据えて調査することにした。まずPostgreSQLのスロークエリログを有効化し、閾値を1秒に設定して一日放置した。

記録されていたのは、同じクエリが被験者の数だけ繰り返される光景だった。

```sql
SELECT * FROM visit_records WHERE subject_id = 1;  -- 実行時間: 0.8s
SELECT * FROM visit_records WHERE subject_id = 2;  -- 実行時間: 0.8s
SELECT * FROM visit_records WHERE subject_id = 3;  -- 実行時間: 0.8s
-- ...（被験者数分だけ繰り返し）
```

N+1問題だった。被験者一覧を1クエリで取得した後、各被験者の最新来院記録を個別に取得するクエリが被験者の数だけ走っていた。300件いれば301回のクエリが走る。

NestJSのコードを見ると、こうなっていた。

```typescript
// 改善前：N+1が発生していた実装
async getSubjects(): Promise<SubjectWithLatestVisit[]> {
  const subjects = await this.subjectRepository.find({
    where: { active: true },
  });

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

TypeORMの `createQueryBuilder` を使い、「最新1件だけ」という条件をサブクエリとウィンドウ関数で表現して1本のクエリにまとめた。

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

これだけで300件取得が5秒から0.8秒に改善した。

## 改善2：インデックスを追加する

スロークエリログにはもう1種類あった。来院記録のフィルタリングクエリだ。`EXPLAIN` で確認するとフルスキャンが起きていた。

```sql
CREATE INDEX idx_visit_records_subject_date
ON visit_records (subject_id, visit_date DESC);
```

複合インデックスを1本追加しただけで、0.6秒から0.02秒になった。

## 改善3：ページネーションを導入する

一覧APIが件数無制限だったことも問題だった。

```typescript
async getSubjects(page: number, perPage: number) {
  const [subjects, total] = await this.subjectRepository.findAndCount({
    where: { active: true },
    order: { subjectCode: 'ASC' },
    skip: (page - 1) * perPage,
    take: perPage,
  });

  return {
    data: subjects,
    meta: { total, page, perPage, totalPages: Math.ceil(total / perPage) },
  };
}
```

フロントエンド側の対応も必要で一番コストがかかったが、体感速度への影響は最も大きかった。

## 計測結果

| 改善内容 | 改善前 | 改善後 |
|---|---|---|
| N+1解消（JOIN化） | 5,200ms | 820ms |
| インデックス追加 | 820ms | 180ms |
| ページネーション導入 | 180ms | 45ms |

## 直し終わって思ったこと

gitカオスを1時間で食い止めたとき、「自分かっこいい」と思えた。

このパフォーマンス改善が終わったとき、そういう気持ちにはならなかった。

深い反省と、より慎重な自分になった感覚だった。「重い」という声を何度も聞きながら、ずっと向き合えずにいた。技術的負債は、誰かが作ったものであっても、引き継いだ瞬間から自分のものになる。他に頼る人間がいない中でコードを管理し、技術を管理していかないといけない——その現実と、この仕事を通じて本当の意味で向き合えた気がした。

---

治験システム特有の難しさとして、データを物理削除できないという制約がある。規制上の要件として治験データは監査証跡を含めて一定期間保持しなければならない。「データを捨てて軽くする」という選択肢がない分、インデックス設計・クエリ最適化・ページネーションといった「増え続けるデータとうまく付き合う」アプローチが重要になる。

「データが10倍・100倍になったときにこのクエリはどうなるか」——この問いを、もっと早い段階で持つべきだった。
