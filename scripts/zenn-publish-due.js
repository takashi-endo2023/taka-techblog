#!/usr/bin/env node
/**
 * Zenn 予約公開（自前実装）。
 *   published: false ＋ published_at が「現在以前」になった記事を published: true に切り替える。
 *   → GitHub Actions（.github/workflows/zenn-publish.yml）が毎朝実行し、変更があれば push。
 *   → Zenn が同期して確実に公開される（Zenn 純正の published_at 自動公開は不安定なため自前管理）。
 *
 * published_at は JST 表記（例: "2026-06-14 09:00"）として扱う。published_at は残す（公開日表示用）。
 * 既に published: true の記事には触らない。
 */
import { readFileSync, writeFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';

const ART = 'articles';
const now = new Date();
const published = [];

for (const f of readdirSync(ART)) {
  if (!f.endsWith('.md')) continue;
  const p = join(ART, f);
  let t = readFileSync(p, 'utf8');
  const pubM = t.match(/^published:\s*false\s*$/m);
  const atM = t.match(/^published_at:\s*"?([0-9]{4}-[0-9]{2}-[0-9]{2}[ T][0-9]{2}:[0-9]{2})/m);
  if (!pubM || !atM) continue;                       // 待機中（false）＋予約日ありのみ対象
  const at = new Date(atM[1].replace(' ', 'T') + ':00+09:00'); // JST として解釈
  if (at <= now) {
    t = t.replace(/^published:\s*false\s*$/m, 'published: true');
    writeFileSync(p, t);
    published.push(`${f} (${atM[1]})`);
  }
}

if (published.length) {
  console.log('PUBLISHED:\n  ' + published.join('\n  '));
} else {
  console.log('NO_CHANGES（本日公開する記事なし）');
}
