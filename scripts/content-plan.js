#!/usr/bin/env node
// 記事の公開計画と時系列を可視化・検証するスクリプト
//
// 機能:
// 1. 全ブログ記事の pubDate を時系列で表示し、cadence（公開間隔）違反を検出
// 2. 未来日 pubDate の記事＝予約公開キューを表示
// 3. Zenn 公開状態を読み、未公開記事の出稿提案（書評・体験談を優先）
// 4. 新記事に割り当てるべき「次の pubDate」を算出
//
// 使い方:
//   node scripts/content-plan.js            # 公開計画レポート
//   node scripts/content-plan.js --next     # 次に使う pubDate だけ出力
//
// cadence を変えたいとき（ペース調整）: 下の CADENCE_DAYS を変更する。
//   7  = 週1（デフォルト）
//   14 = 隔週
//   30 = 月1

import { readFileSync, readdirSync, existsSync } from 'node:fs';
import { join, basename } from 'node:path';

// ───────────────────────────────────────────────
// 設定: ネタ詰まりになったらこの数字を増やす（週1→隔週→月1）
const CADENCE_DAYS = 7;
// ───────────────────────────────────────────────

const BLOG_DIR = 'src/content/blog';
const ARTICLES_DIR = 'articles';

// 今日の日付（時刻は00:00に正規化）。テスト用に TODAY 環境変数で上書き可。
const TODAY = process.env.TODAY ? new Date(process.env.TODAY) : new Date();
TODAY.setHours(0, 0, 0, 0);

function parseFrontmatter(content) {
  if (!content.startsWith('---\n')) return {};
  const end = content.indexOf('\n---\n', 4);
  if (end === -1) return {};
  const data = {};
  for (const line of content.slice(4, end).split('\n')) {
    const colon = line.indexOf(':');
    if (colon === -1) continue;
    const key = line.slice(0, colon).trim();
    const val = line.slice(colon + 1).trim().replace(/^["']|["']$/g, '');
    data[key] = val;
  }
  return data;
}

function daysBetween(a, b) {
  return Math.round((b - a) / (1000 * 60 * 60 * 24));
}

function fmtDate(d) {
  // ローカル日付で YYYY-MM-DD（toISOString だと UTC 変換で1日ズレるため）
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

// 記事タイプを推定（出稿優先度に使う）
function classify(data, slug) {
  // 書評は frontmatter の tags に "書評" がある記事のみ（slug の review 誤判定を避ける）
  if (/"書評"|書評/.test(data.tags || '')) return '書評';
  if (data.zennType === 'idea') return '体験談';
  return '技術';
}

// ブログ記事を読み込む
const posts = readdirSync(BLOG_DIR)
  .filter((f) => f.endsWith('.md') || f.endsWith('.mdx'))
  .map((f) => {
    const data = parseFrontmatter(readFileSync(join(BLOG_DIR, f), 'utf-8'));
    // Astro の glob loader は id を小文字化する（github-slugger）。それに合わせる
    const slug = basename(f).replace(/\.mdx?$/, '').toLowerCase();
    return {
      slug,
      title: data.title || slug,
      pubDate: data.pubDate ? new Date(data.pubDate) : null,
      zennHash: data.zennHash || null,
      tags: data.tags || '',
      type: classify(data, slug),
    };
  })
  .filter((p) => p.pubDate)
  .sort((a, b) => a.pubDate - b.pubDate);

// Zenn 公開状態を読む
function zennPublished(hash) {
  if (!hash) return false;
  const p = join(ARTICLES_DIR, `${hash}.md`);
  if (!existsSync(p)) return false;
  return /^published:\s*true/m.test(readFileSync(p, 'utf-8'));
}

// 次に使う pubDate を算出（最新記事 + CADENCE_DAYS）
const latest = posts[posts.length - 1].pubDate;
const nextPubDate = new Date(latest);
nextPubDate.setDate(nextPubDate.getDate() + CADENCE_DAYS);

// --next モード: 次の日付だけ出力
if (process.argv.includes('--next')) {
  console.log(fmtDate(nextPubDate));
  process.exit(0);
}

// ───────── レポート出力 ─────────
console.log(`\n=== 公開計画レポート（cadence: ${CADENCE_DAYS}日 / 今日: ${fmtDate(TODAY)}）===\n`);

// 0. トップページ構成プレビュー＆検証（index.astro の おすすめ/最近/カテゴリ）
const visibleDesc = posts.filter((p) => p.pubDate <= TODAY).sort((a, b) => b.pubDate - a.pubDate);

console.log('■ トップページ「おすすめ」（src/data/featured.json）');
let featured = [];
try {
  featured = JSON.parse(readFileSync('src/data/featured.json', 'utf-8'));
} catch {
  console.log('  ⚠️ featured.json が読めない');
}
for (const slug of featured) {
  const p = posts.find((x) => x.slug === slug);
  if (!p) console.log(`  ⚠️ ${slug} — 記事が見つからない（typo?）`);
  else if (p.pubDate > TODAY) console.log(`  ⚠️ ${slug} — 未来日(${fmtDate(p.pubDate)})で未公開→トップに出ない`);
  else console.log(`  ✓ [${p.type}] ${p.title}`);
}

console.log('\n■ トップページ「最近」（自動・pubDate順・上位3）');
visibleDesc.slice(0, 3).forEach((p) => console.log(`  ${fmtDate(p.pubDate)}  ${p.slug}`));

// index.astro の categoryDefs と一致させること
const CATEGORIES = [
  { label: 'AI・Claude Code', tag: 'AI開発' },
  { label: 'テックリード・組織', tag: 'テックリード' },
  { label: 'インフラ・DevOps', tag: 'DevOps' },
  { label: '医療IT', tag: '医療IT' },
];
console.log('\n■ トップページ「カテゴリ」（タグ+新着・各3本）');
for (const c of CATEGORIES) {
  const m = visibleDesc.filter((p) => p.tags.includes(`"${c.tag}"`) || p.tags.includes(c.tag));
  console.log(`  [${c.label}] ${m.length}本`);
  m.slice(0, 3).forEach((p) => console.log(`     ${fmtDate(p.pubDate)}  ${p.slug}`));
}

// 1. cadence 違反検出（理想間隔から大きくズレてる箇所）
console.log('■ cadence チェック（直近10件の間隔）');
const recent = posts.slice(-11);
let warnings = 0;
for (let i = 1; i < recent.length; i++) {
  const gap = daysBetween(recent[i - 1].pubDate, recent[i].pubDate);
  const flag = gap < CADENCE_DAYS - 2 ? ' ⚠️ 詰まり' : gap > CADENCE_DAYS + 7 ? ' ⚠️ 空き' : '';
  if (flag) warnings++;
  console.log(`  ${fmtDate(recent[i].pubDate)}  (+${gap}日)${flag}  ${recent[i].slug}`);
}
console.log(warnings ? `  → ${warnings}件のcadence違反` : '  → cadence 正常');

// 2. 予約公開キュー（未来日）
const scheduled = posts.filter((p) => p.pubDate > TODAY);
console.log(`\n■ 予約公開キュー（未来日・cron で自動公開）: ${scheduled.length}件`);
for (const p of scheduled) {
  console.log(`  ${fmtDate(p.pubDate)}  [${p.type}]  ${p.title}`);
}

// 3. Zenn 未公開の出稿提案（公開済みブログ記事のうち Zenn 未公開を優先度順）
const live = posts.filter((p) => p.pubDate <= TODAY);
const zennPending = live.filter((p) => !zennPublished(p.zennHash));
const priority = { 書評: 0, 体験談: 1, 技術: 2 };
zennPending.sort((a, b) => priority[a.type] - priority[b.type]);
console.log(`\n■ Zenn 未公開キュー（出稿候補・書評/体験談を優先）: ${zennPending.length}件`);
for (const p of zennPending.slice(0, 10)) {
  console.log(`  [${p.type}]  ${p.title}`);
}
if (zennPending.length > 10) console.log(`  ...他 ${zennPending.length - 10}件`);

// 4. 次に新記事を書くときの pubDate
console.log(`\n■ 次の新記事に割り当てる pubDate: ${fmtDate(nextPubDate)}`);
console.log(`  （最新 ${fmtDate(latest)} + ${CADENCE_DAYS}日）\n`);

// 在庫の目安
const totalWeeks = Math.round((zennPending.length + scheduled.length) * CADENCE_DAYS / 7);
console.log(`■ 在庫の目安: 未公開 ${zennPending.length + scheduled.length}本 × ${CADENCE_DAYS}日 ≈ 約${totalWeeks}週分`);
console.log(`  ネタ詰まり時は scripts/content-plan.js の CADENCE_DAYS を 14 or 30 に変更\n`);
