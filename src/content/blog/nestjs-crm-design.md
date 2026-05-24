---
title: "NestJSの治験CRMを引き継いで学んだバックエンド設計"
description: "ベンダーから引き継いだNestJS製治験CRMの保守・改修を通じて理解したモジュール設計、Repositoryパターン、DTOバリデーション、エラーハンドリングの実際。"
pubDate: "2025-12-25"
updatedDate: "2026-05-22"
tags: ["NestJS", "TypeScript", "アーキテクチャ"]
zennHash: "2rq66b1w1t1rp4"
zennEmoji: "🏥"
zennType: "tech"
zennTopics: ["NestJS","TypeScript"]
---

ベンダーから引き継いだ治験CRMのバックエンドはNestJSで書かれていた。

最初はコードを舐め回すように読んだ。NestJSの設計思想——DI、モジュール、デコレーター——をコードの中から逆に学んだ。設計した人間ではなく、引き継いだ人間として。

保守・改修を続けながら、このフレームワークの意図が少しずつわかってきた。

## なぜNestJSが選ばれていたか

後から考えると、NestJSは業務システムには合理的な選択だ。

Expressはシンプルで自由度が高い。でも「自由」は「設計をすべて自分で決める必要がある」ということでもある。チームに未経験エンジニアがいる環境では、ルーティング・ミドルウェア・エラーハンドリングの規約を自分たちで作り上げるのはリスクが高い。

NestJSはAngular的な思想で「どう書くか」の選択肢が絞られる。それがチームのコードを一定の品質に揃えやすくする。治験CRMという業務システムに「きちんと型がはまる」設計を選んだのは正しかったと思っている。

## モジュール設計の構造

コードを読んで把握したモジュール構成はこうなっていた。

```
src/
├── modules/
│   ├── patients/          # 患者管理
│   ├── trials/            # 治験管理
│   ├── visits/            # 訪問記録
│   ├── documents/         # ドキュメント管理
│   └── notifications/     # 通知
├── common/
│   ├── filters/           # グローバルエラーハンドリング
│   ├── interceptors/      # ロギング・レスポンス変換
│   └── decorators/        # カスタムデコレーター
└── infrastructure/
    ├── database/          # TypeORM設定
    └── storage/           # S3連携
```

DDDのBounded Contextに近い単位でモジュールが分かれている。モジュール間の依存は `imports` で明示的に制御され、横断的な関心事は `common` に集約されていた。

改修するたびにこの構造の意図が見えてくる。設計者の判断をコードから読み解く作業が、NestJSの学習になった。

## Repositoryパターンの意図

TypeORMのRepositoryをそのまま使うと、サービス層がORMに強依存する。引き継いだコードにはRepositoryパターンで抽象化された箇所があった。

```typescript
// patients/repositories/patient.repository.interface.ts
export interface IPatientRepository {
  findById(id: string): Promise<Patient | null>;
  findAll(filters: PatientFilters): Promise<Patient[]>;
  save(patient: Patient): Promise<Patient>;
  delete(id: string): Promise<void>;
}
```

インターフェースを通じてDIコンテナに注入することで、テスト時にモックに差し替えられる。「なぜこう書いてあるか」がわかったとき、設計の深さを感じた。

新規機能を追加するときは、このパターンに揃えるようにしている。

## DTOバリデーションの統一

入力値のバリデーションは `class-validator` と `class-transformer` で一元管理されていた。

```typescript
export class CreatePatientDto {
  @IsString()
  @IsNotEmpty()
  @Length(1, 100)
  name: string;

  @IsDate()
  @Type(() => Date)
  birthDate: Date;

  @IsEnum(PatientStatus)
  status: PatientStatus;
}
```

`ValidationPipe` をグローバルに設定することで、全エンドポイントで自動的にバリデーションが走る。

```typescript
app.useGlobalPipes(
  new ValidationPipe({
    whitelist: true,
    forbidNonWhitelisted: true,
    transform: true,
  }),
);
```

規制産業のシステムで入力値の整合性を保つには、このくらい統一されている方が安心できる。

## グローバルエラーハンドリング

業務システムはエラーレスポンスの形式が一定であることが重要だ。フロントエンドとのI/Fを安定させるために、例外フィルターで統一されていた。

```typescript
@Catch(HttpException)
export class HttpExceptionFilter implements ExceptionFilter {
  catch(exception: HttpException, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const status = exception.getStatus();
    const exceptionResponse = exception.getResponse();

    response.status(status).json({
      statusCode: status,
      message:
        typeof exceptionResponse === 'string'
          ? exceptionResponse
          : (exceptionResponse as any).message,
      timestamp: new Date().toISOString(),
      path: ctx.getRequest<Request>().url,
    });
  }
}
```

## 引き継いで保守する側が学ぶこと

設計した人間と引き継いだ人間では、コードの読み方が違う。

設計者は「なぜそうしたか」を知っている。引き継いだ側は「なぜそうなっているか」をコードから推理する。その推理の過程で、設計の意図と自分の理解の差が見える。

NestJSのような思想の強いフレームワークは、その推理がしやすい。「ここにこう書いてあるのはこういう理由のはずだ」という仮説を立てやすい。

治験CRMという規制が厳しいシステムを保守し続けながら、NestJSの設計思想が少しずつ自分のものになってきた。

---

**関連記事**:
- [ベンダーからシステムを引き継いで、内製化が完成するまで](/blog/naisei-kansei)
- [治験システムのパフォーマンス改善——マテリアライズドビューを理解するまで](/blog/clinical-trial-system-performance)
