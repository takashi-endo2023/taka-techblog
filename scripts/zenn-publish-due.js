// scripts/zenn-publish-due.js
//
// 公開予定日が到来した Zenn 記事を published:false → true に反転して公開するスクリプト。
// 公開予定日は scripts/zenn-schedule.json（hash → "YYYY-MM-DD HH:MM"）で管理する。
//
// なぜこの方式か（2026-07 の設計変更・実害を受けての作り直し）:
//   旧方式は在庫を「published:true + 未来の published_at」で寝かせていた。しかし Zenn は
//   デプロイのたびに「未作成の published:true 記事」を"すべて"作りにいくため、在庫が増えると
//   毎回「24時間に5本」の投稿レート制限を即座に超過する。その巻き添えで、その日公開すべき
//   記事まで丸ごとブロックされ、12日間ゼロ本という実害が出た（2026-07）。
//   → 在庫は published:false（下書き・published_at は書かない）で寝かせる。Zenn が毎回
//     作りにいく対象が「公開日が来た数本」だけになり、レート制限に触れなくなる。
//
// 安全設計（最重要）:
//   - published_at を一切書かない ＝「published:false + published_at」の禁止コンボを
//     構造的に作れない（過去に Zenn のデプロイを中断させた組み合わせ）。
//   - 1回の実行で反転するのは MAX_PER_RUN 本まで。CI が数日落ちて予定が溜まっても、
//     一度に大量公開してレート制限を踏み抜かない。
//   - 冪等：既に published:true の記事には触らない。複数回実行しても安全。
//
// 実行: node scripts/zenn-publish-due.js （CI から毎日呼ばれる）

import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const articlesDir = join(__dirname, '..', 'articles');
const schedulePath = join(__dirname, 'zenn-schedule.json');

// Zenn の投稿レート制限（直近24時間に5本以上でブロック）を絶対に踏まないための安全弁。
// cron は1日2回なので、2 なら最大 4本/日 に収まる。
const MAX_PER_RUN = 2;

// 現在時刻を JST の壁時計文字列 "YYYY-MM-DD HH:MM" にする。
// schedule.json も同じ固定長フォーマットなので、文字列の辞書順比較で日時比較が成立する
// （タイムゾーン計算のバグを避けるため、あえて文字列比較にしている）。
function jstStr() {
  const now = new Date(Date.now() + 9 * 3600 * 1000); // UTC → JST
  const p = (n) => String(n).padStart(2, '0');
  return (
    `${now.getUTCFullYear()}-${p(now.getUTCMonth() + 1)}-${p(now.getUTCDate())} ` +
    `${p(now.getUTCHours())}:${p(now.getUTCMinutes())}`
  );
}

const nowStr = jstStr();
const schedule = JSON.parse(readFileSync(schedulePath, 'utf8'));

// 公開日が到来しているものを、予定が古い順に消化する
const due = Object.entries(schedule)
  .filter(([, at]) => at <= nowStr)
  .sort((a, b) => a[1].localeCompare(b[1]));

const published = [];
const deferred = [];

for (const [hash, at] of due) {
  const path = join(articlesDir, `${hash}.md`);
  if (!existsSync(path)) {
    console.warn(`WARN: articles/${hash}.md が見つからない（schedule の記載ミス?）`);
    continue;
  }
  const raw = readFileSync(path, 'utf8');

  // 既に published:true＝公開済み。触らない（冪等）
  if (!/^published:\s*false\s*$/m.test(raw)) continue;

  // レート制限の安全弁：1回の実行で MAX_PER_RUN 本まで。残りは次回以降に持ち越す
  if (published.length >= MAX_PER_RUN) {
    deferred.push(`${hash} (${at})`);
    continue;
  }

  writeFileSync(path, raw.replace(/^published:\s*false\s*$/m, 'published: true'));
  published.push(`${hash} (予定: ${at})`);
}

if (published.length) {
  console.log(`PUBLISHED (${nowStr} JST 時点で公開日到来):`);
  for (const c of published) console.log('  - ' + c);
} else {
  console.log(`No due articles at ${nowStr} JST.`);
}

if (deferred.length) {
  console.log(
    `次回以降に持ち越し（1回 ${MAX_PER_RUN} 本まで / Zennのレート制限対策）: ${deferred.length} 本`
  );
  for (const c of deferred) console.log('  - ' + c);
}
