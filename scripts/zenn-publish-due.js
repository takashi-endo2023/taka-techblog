// scripts/zenn-publish-due.js
//
// 公開日（published_at）が現在（JST）を過ぎた published:true の Zenn 記事から
// published_at の行を「外すだけ」のスクリプト。
//
// なぜ必要か:
//   Zenn の「純正予約（published:true + 未来の published_at）」は、このリポジトリでは
//   公開日当日に自動発火しない（過去に公開漏れが発生）。発火トリガーは push のため、
//   公開日が来た記事を毎日検出して published_at を外し push する＝ Zenn が即公開する。
//
// 安全設計（最重要）:
//   この処理は published_at を「削除」するだけ。published:false を絶対に作らない。
//   → 過去に Zenn のデプロイを中断させた「published:false + published_at」の不正な
//     組み合わせを、構造的に生成し得ない。
//
// 公開予定を「寝かせる」には published_at を未来日時にしておけばよい（このスクリプトは
// 当日が来るまで触らない）。
//
// 実行: node scripts/zenn-publish-due.js  （CI から毎日呼ばれる。冪等なので複数回実行OK）

import { readdirSync, readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const articlesDir = join(__dirname, '..', 'articles');

// 現在時刻を JST の壁時計文字列 "YYYY-MM-DD HH:MM" にする。
// published_at も同じ固定長フォーマットなので、文字列の辞書順比較で日時比較が成立する
// （タイムゾーン計算のバグを避けるため、あえて文字列比較にしている）。
function jstStr(offsetMs = 0) {
  const now = new Date(Date.now() + 9 * 3600 * 1000 + offsetMs); // UTC → JST(+任意オフセット)
  const p = (n) => String(n).padStart(2, '0');
  return (
    `${now.getUTCFullYear()}-${p(now.getUTCMonth() + 1)}-${p(now.getUTCDate())} ` +
    `${p(now.getUTCHours())}:${p(now.getUTCMinutes())}`
  );
}

// 対象は「公開日が過去 WINDOW_DAYS 日以内に到来した」記事だけ。
// これより古い published_at を持つ記事は「既に公開済み（published:true + 過去日 = 正常な公開状態）」
// とみなして触らない。既公開記事の表示日を動かす事故を防ぐためのガード。
// cron は毎日2回走るので、5日の窓があればCIが数日落ちても取りこぼさない。
const WINDOW_DAYS = 5;

const nowStr = jstStr();
const lowStr = jstStr(-WINDOW_DAYS * 24 * 3600 * 1000);
const changed = [];

for (const file of readdirSync(articlesDir)) {
  if (!file.endsWith('.md')) continue;
  const path = join(articlesDir, file);
  const raw = readFileSync(path, 'utf8');

  const pubMatch = raw.match(/^published:\s*(true|false)\s*$/m);
  const patMatch = raw.match(/^published_at:\s*["']?([^"'\n]+?)["']?\s*$/m);

  // published:true かつ published_at がある記事だけが対象
  if (!pubMatch || pubMatch[1] !== 'true') continue;
  if (!patMatch) continue;

  const patVal = patMatch[1].trim(); // 例: 2026-07-02 09:00

  // 公開日時がまだ未来なら何もしない（寝かせ続ける）
  if (patVal > nowStr) continue;
  // 窓より古い＝既に公開済みの記事とみなして触らない
  if (patVal <= lowStr) continue;

  // 公開日が到来 → published_at の行を丸ごと削除（published:true はそのまま＝即公開）
  const next = raw.replace(/^published_at:.*\r?\n/m, '');
  writeFileSync(path, next);
  changed.push(`${file} (published_at: ${patVal})`);
}

if (changed.length) {
  console.log(`PUBLISHED_DUE (${nowStr} JST 時点で公開日到来):`);
  for (const c of changed) console.log('  - ' + c);
} else {
  console.log(`No due articles at ${nowStr} JST.`);
}
