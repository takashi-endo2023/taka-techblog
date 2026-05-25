#!/usr/bin/env node
// GEEKLYアフィリエイトブロックを対象記事に一括挿入する
//
// 動作:
// 1. .md → .mdx にリネーム（既に .mdx ならそのまま）
// 2. frontmatter 直後に import 文を追加
// 3. 末尾 or 関連記事セクションの直前に PR ブロックを挿入
// 4. 既に GeeklyAffiliate が含まれる記事はスキップ
//
// 使い方: node scripts/add-geekly-affiliate.js

import { readFileSync, writeFileSync, existsSync, unlinkSync } from 'node:fs';
import { join } from 'node:path';

const BLOG_DIR = 'src/content/blog';

const TARGETS = [
  // テックリード/組織
  'naisei-kansei',
  'techLead-first-90-days',
  'playing-manager-reality',
  'communicating-it-value-to-executives',
  'technical-debt-strategy',
  'engineer-hiring-lessons',
  'techlead-mask-3years',
  'small-elite-team-design',
  'code-review-culture',
  // フロントエンド/TypeScript実務
  'react-nextjs-selection',
  'nextjs-rendering-deep-dive',
  'typescript-utility-types-practical',
  'frontend-testing-practical-approach',
  'nextjs-seo-implementation',
];

const IMPORT_LINE = `import GeeklyAffiliate from '../../components/GeeklyAffiliate.astro';`;

const AFFILIATE_BLOCK = `---

## この記事を読んだ方へ

> **PR** 似た領域で実務に関わる方へ

似た領域で実務に関わる方は、定期的に外の市場感を把握しておくと判断軸が増える。今すぐ動く動かないは別として、自分のスキルがどう評価されるかを知っておく価値はある。

IT/WEB/ゲーム業界専門のエージェントなら<GeeklyAffiliate variant="inline" />が分かりやすい。エンジニアに特化しているので、年収レンジを掴む目的だけでも使える。

<GeeklyAffiliate variant="banner" />`;

let updated = 0;
let skipped = 0;
const notFound = [];

for (const slug of TARGETS) {
  // .md か .mdx かを判定
  let srcPath = join(BLOG_DIR, `${slug}.md`);
  let wasMd = true;
  if (!existsSync(srcPath)) {
    srcPath = join(BLOG_DIR, `${slug}.mdx`);
    wasMd = false;
  }
  if (!existsSync(srcPath)) {
    notFound.push(slug);
    continue;
  }

  const content = readFileSync(srcPath, 'utf-8');

  if (content.includes('GeeklyAffiliate')) {
    console.log(`SKIP (already has affiliate): ${slug}`);
    skipped++;
    continue;
  }

  // frontmatter と body を分離
  if (!content.startsWith('---\n')) {
    console.error(`SKIP (no frontmatter): ${slug}`);
    skipped++;
    continue;
  }
  const fmEnd = content.indexOf('\n---\n', 4);
  const frontmatter = content.slice(0, fmEnd + 5); // 末尾の \n---\n を含む
  let body = content.slice(fmEnd + 5).replace(/^\n+/, '');

  // 関連記事セクションを探す
  const relatedMatch = body.match(/\n---\n\n\*\*関連記事\*\*/);

  let newBody;
  if (relatedMatch) {
    const idx = relatedMatch.index;
    // 関連記事の前に挿入（改行調整）
    newBody = body.slice(0, idx).trimEnd() + '\n\n' + AFFILIATE_BLOCK + '\n' + body.slice(idx);
  } else {
    // 末尾に追加
    newBody = body.trimEnd() + '\n\n' + AFFILIATE_BLOCK + '\n';
  }

  // import を frontmatter 直後に挿入
  const newContent = `${frontmatter}\n${IMPORT_LINE}\n\n${newBody}`;

  // .mdx パスに書き出し
  const dstPath = join(BLOG_DIR, `${slug}.mdx`);
  writeFileSync(dstPath, newContent, 'utf-8');

  // 元が .md なら削除
  if (wasMd) {
    unlinkSync(srcPath);
  }

  console.log(`✓ ${slug}${wasMd ? ' (renamed .md → .mdx)' : ''}`);
  updated++;
}

console.log(`\n完了: ${updated}件更新, ${skipped}件スキップ`);
if (notFound.length) {
  console.error(`見つからず: ${notFound.join(', ')}`);
}
