#!/usr/bin/env node
// ブログ記事を Zenn 記事に同期するスクリプト
// ブログ記事の frontmatter に zennHash が設定されている記事を対象とする
//
// 使い方: npm run sync:zenn

import { readFileSync, writeFileSync, existsSync, readdirSync } from 'node:fs';
import { join, basename } from 'node:path';

const BLOG_DIR   = 'src/content/blog';
const ARTICLES_DIR = 'articles';
const BLOG_URL   = 'https://www.taka-techblog.com/blog';
const SITE_URL   = 'https://www.taka-techblog.com';

// frontmatter と body を分離する
function parseFile(content) {
  if (!content.startsWith('---\n')) return { data: {}, body: content };
  const end = content.indexOf('\n---\n', 4);
  if (end === -1) return { data: {}, body: content };
  const raw  = content.slice(4, end);
  const body = content.slice(end + 5);
  return { data: parseYaml(raw), body };
}

function parseYaml(raw) {
  const data = {};
  for (const line of raw.split('\n')) {
    const colon = line.indexOf(':');
    if (colon === -1 || line.trimStart().startsWith('#')) continue;
    const key = line.slice(0, colon).trim();
    const val = line.slice(colon + 1).trim();
    if (val === 'true')        data[key] = true;
    else if (val === 'false')  data[key] = false;
    else if (val.startsWith('[')) {
      try { data[key] = JSON.parse(val.replace(/'/g, '"')); } catch { data[key] = []; }
    } else {
      data[key] = val.replace(/^["']|["']$/g, '');
    }
  }
  return data;
}

// ブログ固有の要素を除去する
function stripBlogSpecific(body) {
  return body
    // Astro コンポーネントの import 文を除去
    .replace(/^import .+\n/gm, '')
    // AmazonCard コンポーネントを除去（複数行対応）
    .replace(/<AmazonCard[\s\S]*?\/>/g, '')
    // GeeklyAffiliate コンポーネントを除去（A8 アフィリエイトは Zenn には掲載しない）
    .replace(/<GeeklyAffiliate[\s\S]*?\/>/g, '')
    // アフィリエイト訴求セクションを除去（lookahead で 関連記事 区切りは残す）
    .replace(/\n---\n\n## この記事を読んだ方へ[\s\S]*?(?=\n---\n)/, '')
    // 関連記事セクション（末尾）を除去
    .replace(/\n---\n\n\*\*関連記事\*\*[：:]\n[\s\S]*$/, '')
    .replace(/\n---\n\n\*\*関連記事\*\*\n[\s\S]*$/, '')
    // 連続する空行を最大2行に圧縮
    .replace(/\n{3,}/g, '\n\n')
    .trimEnd();
}

// Zenn ファイルの内容を生成する
function buildZennFile({ title, zennEmoji, zennType, zennTopics, zennHash }, cleanBody, existingData, slug) {
  const published    = existingData?.published    ?? false;
  const publishedAt  = existingData?.published_at ?? null;

  const fm = [
    '---',
    `title: "${title}"`,
    `emoji: "${zennEmoji}"`,
    `type: "${zennType || 'tech'}"`,
    `topics: ${JSON.stringify(zennTopics ?? [])}`,
    `published: ${published}`,
    publishedAt ? `published_at: "${publishedAt}"` : null,
    `canonical_url: "${BLOG_URL}/${slug}"`,
    '---',
  ].filter(Boolean).join('\n');

  const message = [
    ':::message',
    `この記事は [taka-techblog](${BLOG_URL}/${slug}?utm_source=zenn&utm_medium=referral) にも掲載しています。`,
    ':::',
  ].join('\n');

  const footer = [
    '---',
    '',
    `他の記事も読む → [taka-techblog.com](${SITE_URL}?utm_source=zenn&utm_medium=referral)`,
    'X でも発信中 → [@_taka_tech](https://x.com/_taka_tech)',
  ].join('\n');

  return `${fm}\n\n${message}\n\n${cleanBody}\n\n${footer}\n`;
}

// メイン処理
const blogFiles = readdirSync(BLOG_DIR)
  .filter(f => f.endsWith('.md') || f.endsWith('.mdx'))
  .sort();

let updated = 0;
let skipped = 0;
const errors = [];

for (const filename of blogFiles) {
  const blogPath = join(BLOG_DIR, filename);
  const { data: blogData, body } = parseFile(readFileSync(blogPath, 'utf-8'));

  if (!blogData.zennHash) {
    skipped++;
    continue;
  }

  const slug     = basename(filename).replace(/\.mdx?$/, '');
  const zennPath = join(ARTICLES_DIR, `${blogData.zennHash}.md`);

  // 既存 Zenn ファイルから公開状態を取得
  let existingData = null;
  if (existsSync(zennPath)) {
    existingData = parseFile(readFileSync(zennPath, 'utf-8')).data;
  }

  try {
    const cleanBody  = stripBlogSpecific(body);
    const newContent = buildZennFile(blogData, cleanBody, existingData, slug);
    writeFileSync(zennPath, newContent, 'utf-8');
    console.log(`✔  ${slug}`);
    updated++;
  } catch (err) {
    console.error(`✗  ${slug}: ${err.message}`);
    errors.push(slug);
  }
}

console.log(`\n完了: ${updated}件更新, ${skipped}件スキップ（zennHashなし）`);
if (errors.length) console.error(`エラー: ${errors.join(', ')}`);
