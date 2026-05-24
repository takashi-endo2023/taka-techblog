#!/usr/bin/env node
// 一回限りのセットアップスクリプト
// articles/*.md を読んでブログ記事の frontmatter に zennHash 等を追加する

import { readFileSync, writeFileSync, readdirSync, existsSync } from 'node:fs';
import { join, basename } from 'node:path';

const ARTICLES_DIR = 'articles';
const BLOG_DIR = 'src/content/blog';

function getFrontmatterEnd(content) {
  if (!content.startsWith('---\n')) return -1;
  const idx = content.indexOf('\n---\n', 4);
  return idx; // index of the \n before ---
}

function getField(raw, key) {
  const m = raw.match(new RegExp(`^${key}:\\s*(.+)$`, 'm'));
  return m ? m[1].trim().replace(/^["']|["']$/g, '') : null;
}

function parseTopics(raw) {
  const m = raw.match(/^topics:\s*(\[.+\])/m);
  if (!m) return [];
  try {
    return JSON.parse(m[1].replace(/'/g, '"'));
  } catch {
    return [];
  }
}

// Zenn記事から slug → メタデータ のマッピングを構築
const mapping = {};

for (const filename of readdirSync(ARTICLES_DIR).filter(f => f.endsWith('.md'))) {
  const hash = basename(filename, '.md');
  const content = readFileSync(join(ARTICLES_DIR, filename), 'utf-8');
  const endIdx = getFrontmatterEnd(content);
  if (endIdx === -1) continue;

  const raw = content.slice(4, endIdx);
  const canonicalUrl = getField(raw, 'canonical_url');
  if (!canonicalUrl) continue;

  const slugMatch = canonicalUrl.match(/\/blog\/([^/]+)$/);
  if (!slugMatch) continue;
  const slug = slugMatch[1];

  mapping[slug] = {
    hash,
    emoji: getField(raw, 'emoji') || '📝',
    type: getField(raw, 'type') || 'tech',
    topics: parseTopics(raw),
  };
}

console.log(`Zenn記事から ${Object.keys(mapping).length} 件のマッピングを取得しました\n`);

// ブログ記事に zenn フィールドを追加
let updated = 0;
let skipped = 0;
let missing = 0;

for (const [slug, zennData] of Object.entries(mapping).sort()) {
  const mdPath  = join(BLOG_DIR, `${slug}.md`);
  const mdxPath = join(BLOG_DIR, `${slug}.mdx`);
  const blogPath = existsSync(mdPath) ? mdPath : existsSync(mdxPath) ? mdxPath : null;

  if (!blogPath) {
    console.warn(`⚠  ブログ記事なし: ${slug}`);
    missing++;
    continue;
  }

  const content = readFileSync(blogPath, 'utf-8');

  if (content.includes('zennHash:')) {
    skipped++;
    continue;
  }

  const topicsJson = JSON.stringify(zennData.topics);
  const fields = [
    `zennHash: "${zennData.hash}"`,
    `zennEmoji: "${zennData.emoji}"`,
    `zennType: "${zennData.type}"`,
    `zennTopics: ${topicsJson}`,
  ].join('\n');

  // frontmatter の閉じ --- の直前に挿入
  const updated_content = content.replace(/^(---\n[\s\S]*?)\n---\n/, `$1\n${fields}\n---\n`);

  if (updated_content === content) {
    console.warn(`⚠  frontmatter 末尾が見つかりません: ${slug}`);
    missing++;
    continue;
  }

  writeFileSync(blogPath, updated_content, 'utf-8');
  console.log(`✔  ${slug}`);
  updated++;
}

console.log(`\n完了: ${updated}件追加, ${skipped}件スキップ（設定済み）, ${missing}件見つからず`);
