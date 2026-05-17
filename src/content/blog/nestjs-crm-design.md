---
title: "NestJSで治験CRMのバックエンドを設計した — モジュール設計からエラーハンドリングまで"
description: "治験CRMのバックエンドをNestJSで設計・実装した実録。Expressとの比較、ドメイン駆動モジュール設計、Repositoryパターン、DTOバリデーション、グローバルエラーハンドリングまで解説します。"
pubDate: "2026-01-20"
tags: ["NestJS", "TypeScript", "バックエンド設計", "アーキテクチャ"]
---

治験CRMの内製化を進めるにあたって、バックエンドをフルスクラッチで設計し直した。フレームワークにNestJSを選び、約半年かけてプロダクション運用まで持っていった経験を書いておく。

## なぜNestJSを選んだか

最初の選択肢はExpressとNestJSの2択だった。

**Express**はシンプルで自由度が高い。ただ「自由」は裏を返せば「設計をすべて自分で決める必要がある」ということだ。チームに未経験エンジニアがいる状況で、ルーティング・ミドルウェア・エラーハンドリングの規約を自分たちで作り上げるのはリスクが高いと判断した。

**NestJS**はAngular的な思想でDI（依存性注入）・モジュール・デコレーターが最初から整備されている。「どう書くか」の選択肢が絞られることで、チームのコードが一定の品質に揃いやすい。TypeScriptとの相性も抜群だ。

治験CRMは業務システムである。「自由に作る」より「きちんと型がはまる」設計を優先した結果、NestJSを選んだ。

## モジュール設計の方針（ドメイン駆動で考える）

NestJSのモジュールはDDDのBounded Contextに近い単位で分割した。

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

モジュール間の依存は `imports` で明示的に制御する。横断的な関心事（認証・ロギング）は `common` に集約した。

## Repositoryパターンの実装例

TypeORMのRepositoryをそのまま使うと、サービス層がORMに強依存してしまう。テスト可能性と交換可能性のためにRepositoryパターンで抽象化した。

```typescript
// patients/repositories/patient.repository.interface.ts
export interface IPatientRepository {
  findById(id: string): Promise<Patient | null>;
  findAll(filters: PatientFilters): Promise<Patient[]>;
  save(patient: Patient): Promise<Patient>;
  delete(id: string): Promise<void>;
}

// patients/repositories/patient.repository.ts
@Injectable()
export class PatientRepository implements IPatientRepository {
  constructor(
    @InjectRepository(PatientEntity)
    private readonly repo: Repository<PatientEntity>,
  ) {}

  async findById(id: string): Promise<Patient | null> {
    const entity = await this.repo.findOne({ where: { id } });
    return entity ? PatientMapper.toDomain(entity) : null;
  }

  async save(patient: Patient): Promise<Patient> {
    const entity = PatientMapper.toEntity(patient);
    const saved = await this.repo.save(entity);
    return PatientMapper.toDomain(saved);
  }
}
```

DIコンテナで `IPatientRepository` を注入することで、テスト時にモックに差し替えられる。

## DTOバリデーション（class-validatorの活用）

入力値バリデーションは `class-validator` と `class-transformer` で一元管理した。

```typescript
// patients/dto/create-patient.dto.ts
import { IsString, IsDate, IsEnum, IsNotEmpty, Length } from 'class-validator';
import { Type } from 'class-transformer';

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
// main.ts
app.useGlobalPipes(
  new ValidationPipe({
    whitelist: true,        // DTOにないプロパティを除去
    forbidNonWhitelisted: true, // 未知プロパティはエラー
    transform: true,        // 型変換を有効化
  }),
);
```

## グローバルエラーハンドリングの統一

業務システムでは「エラーレスポンスの形式が一定」であることが重要だ。フロントエンドとのI/F設計を安定させるために、例外フィルターで統一した。

```typescript
// common/filters/http-exception.filter.ts
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

これにより、どのエンドポイントでも同じ形式のエラーレスポンスが返る。

## 業務システム設計の判断まとめ

半年設計・実装してきた中での気づきをまとめる。

- **型を徹底する**: TypeScriptのstrictモードを有効にして、`any` を使わない。業務システムは長く使われるので、型の厳密さは後で必ず返ってくる
- **ドメインとインフラを分離する**: DBのテーブル構造に引きずられた設計はいつか壊れる。ドメインモデルを中心に設計して、DBはあくまで永続化の手段と割り切る
- **エラーは早期に明示的に**: 暗黙のエラーを握りつぶさない。Guardで弾けるものはGuardで弾き、Serviceでは業務例外を `throw` する

## まとめ

NestJSは「思想を押し付けてくる」フレームワークだが、その押し付けが業務システム開発では心強い。

設計で迷ったら「この機能がどのドメインに属するか」を問い直すことで、モジュールの置き場所が決まる。型・バリデーション・エラーハンドリングを最初に統一しておくことで、開発が進んでも品質が崩れにくい。

治験CRMという規制が厳しい業界のシステムを作る上で、NestJSの「型と構造の強制」はむしろ安心感につながっている。
