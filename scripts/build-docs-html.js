#!/usr/bin/env node
/**
 * 運営ドキュメント（docs/*.md）を1つの閲覧用HTMLにまとめる。
 *   実行: npm run docs:html  → docs/index.html を生成
 *   docs/index.html はダブルクリックでブラウザ閲覧可（外部依存なし・file://で動く）。
 *   ドキュメントを更新したら再実行して作り直す。
 */
import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { join, resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { marked } from 'marked';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, '..');
const DOCS = join(ROOT, 'docs');

// 表示順とタイトル
const FILES = [
  { file: 'operations.md',         title: '週次運用',     emoji: '🗓' },
  { file: 'growth-strategy.md',    title: 'グロース戦略', emoji: '📈' },
  { file: 'affiliate-strategy.md', title: 'アフィリ戦略', emoji: '💰' },
  { file: 'article-plan.md',       title: '記事計画',     emoji: '📝' },
  { file: 'note-strategy.md',      title: 'note戦略',     emoji: '🔖' },
  { file: '../CLAUDE.md',          title: '開発ルール',   emoji: '⚙️' },
];

marked.setOptions({ headerIds: true, mangle: false });

function esc(s) { return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;'); }

const sections = FILES.map((d, i) => {
  const full = join(DOCS, d.file);
  if (!existsSync(full)) return null;
  const md = readFileSync(full, 'utf8');
  const updated = (md.match(/最終更新:\s*([0-9-]+)/) || [])[1] || '';
  const html = marked.parse(md);
  return { ...d, id: `doc${i}`, html, updated };
}).filter(Boolean);

const buildTime = new Date().toLocaleString('ja-JP', { timeZone: 'Asia/Tokyo' });

const nav = sections.map((s, i) =>
  `<button class="nav-item${i === 0 ? ' active' : ''}" data-target="${s.id}">
     <span class="nav-emoji">${s.emoji}</span>
     <span class="nav-text">${esc(s.title)}</span>
     ${s.updated ? `<span class="nav-date">${s.updated}</span>` : ''}
   </button>`
).join('\n');

const articles = sections.map((s, i) =>
  `<article id="${s.id}" class="doc${i === 0 ? ' active' : ''}">${s.html}</article>`
).join('\n');

const html = `<!DOCTYPE html>
<html lang="ja">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>taka-techblog 運営ドキュメント</title>
<style>
:root{
  --bg:#0f1117; --surface:#1a1d27; --border:#2a2d3a; --text:#e2e8f0;
  --muted:#8892a4; --accent:#7c6af7; --accent-hover:#9d8ffa; --code-bg:#1e2130;
}
*{box-sizing:border-box}
body{margin:0;background:var(--bg);color:var(--text);
  font-family:'Inter','Hiragino Kaku Gothic ProN','Noto Sans JP',sans-serif;
  line-height:1.75;font-size:15px;display:flex;min-height:100vh}
#sidebar{width:230px;flex-shrink:0;background:var(--surface);border-right:1px solid var(--border);
  padding:20px 12px;position:sticky;top:0;height:100vh;overflow-y:auto}
#sidebar h1{font-size:15px;margin:0 8px 4px;color:var(--text)}
#sidebar .sub{font-size:11px;color:var(--muted);margin:0 8px 16px}
.nav-item{display:flex;align-items:center;gap:8px;width:100%;text-align:left;
  background:none;border:none;color:var(--muted);padding:10px 10px;border-radius:8px;
  cursor:pointer;font-size:14px;margin-bottom:2px;font-family:inherit}
.nav-item:hover{background:rgba(124,106,247,.1);color:var(--text)}
.nav-item.active{background:var(--accent);color:#fff}
.nav-emoji{font-size:16px}
.nav-text{flex:1}
.nav-date{font-size:10px;opacity:.7}
#sidebar .build{font-size:10px;color:var(--muted);margin:18px 8px 0;border-top:1px solid var(--border);padding-top:12px}
#main{flex:1;max-width:900px;margin:0 auto;padding:40px 48px 120px}
.doc{display:none}
.doc.active{display:block;animation:fade .25s ease}
@keyframes fade{from{opacity:0;transform:translateY(6px)}to{opacity:1;transform:none}}
.doc h1{font-size:28px;border-bottom:2px solid var(--border);padding-bottom:12px;margin-top:0}
.doc h2{font-size:22px;margin-top:40px;border-bottom:1px solid var(--border);padding-bottom:8px}
.doc h3{font-size:18px;margin-top:28px;color:var(--accent-hover)}
.doc h4{font-size:15px;margin-top:20px;color:var(--text)}
.doc a{color:var(--accent-hover)}
.doc code{background:var(--code-bg);padding:2px 6px;border-radius:4px;font-size:13px;
  font-family:'JetBrains Mono','Fira Code',monospace}
.doc pre{background:var(--code-bg);padding:16px;border-radius:8px;overflow-x:auto;border:1px solid var(--border)}
.doc pre code{background:none;padding:0}
.doc table{border-collapse:collapse;width:100%;margin:16px 0;font-size:13.5px}
.doc th,.doc td{border:1px solid var(--border);padding:8px 12px;text-align:left}
.doc th{background:var(--code-bg)}
.doc tr:nth-child(even){background:rgba(255,255,255,.02)}
.doc blockquote{border-left:3px solid var(--accent);margin:16px 0;padding:8px 16px;
  background:rgba(124,106,247,.06);color:var(--muted);border-radius:0 8px 8px 0}
.doc blockquote p{margin:6px 0}
.doc ul,.doc ol{padding-left:24px}
.doc li{margin:4px 0}
.doc hr{border:none;border-top:1px solid var(--border);margin:32px 0}
#search{width:100%;background:var(--code-bg);border:1px solid var(--border);color:var(--text);
  border-radius:8px;padding:8px 10px;font-size:13px;margin:0 0 14px;font-family:inherit}
mark{background:var(--accent);color:#fff;border-radius:2px}
@media(max-width:720px){
  body{flex-direction:column}
  #sidebar{width:100%;height:auto;position:static;display:flex;flex-wrap:wrap;gap:4px}
  #sidebar h1,#sidebar .sub,#sidebar .build{width:100%}
  .nav-item{width:auto}
  #main{padding:24px 18px 80px}
}
</style>
</head>
<body>
<nav id="sidebar">
  <h1>📚 運営ドキュメント</h1>
  <div class="sub">taka-techblog</div>
  <input id="search" type="text" placeholder="このページ内を検索…">
  ${nav}
  <div class="build">生成: ${buildTime}<br>更新は <code>npm run docs:html</code></div>
</nav>
<main id="main">
  ${articles}
</main>
<script>
const items=document.querySelectorAll('.nav-item');
const docs=document.querySelectorAll('.doc');
items.forEach(btn=>btn.addEventListener('click',()=>{
  const id=btn.dataset.target;
  items.forEach(b=>b.classList.toggle('active',b===btn));
  docs.forEach(d=>d.classList.toggle('active',d.id===id));
  window.scrollTo(0,0);
  clearMarks();
}));
const search=document.getElementById('search');
function clearMarks(){
  document.querySelectorAll('.doc mark').forEach(m=>{
    const t=document.createTextNode(m.textContent);m.replaceWith(t);
  });
}
let timer;
search.addEventListener('input',()=>{
  clearTimeout(timer);
  timer=setTimeout(()=>{
    clearMarks();
    const q=search.value.trim();
    if(q.length<2)return;
    const active=document.querySelector('.doc.active');
    highlight(active,q);
    const first=active.querySelector('mark');
    if(first)first.scrollIntoView({block:'center',behavior:'smooth'});
  },200);
});
function highlight(root,q){
  const rx=new RegExp(q.replace(/[.*+?^\${}()|[\\]\\\\]/g,'\\\\$&'),'gi');
  const walk=document.createTreeWalker(root,NodeFilter.SHOW_TEXT,{
    acceptNode:n=>n.parentNode.closest('pre,code,script,style')?NodeFilter.FILTER_REJECT
      :(rx.test(n.textContent)?NodeFilter.FILTER_ACCEPT:NodeFilter.FILTER_REJECT)
  });
  const nodes=[];let n;while(n=walk.nextNode())nodes.push(n);
  nodes.forEach(node=>{
    const span=document.createElement('span');
    span.innerHTML=node.textContent.replace(rx,m=>'<mark>'+m+'</mark>');
    node.replaceWith(span);
  });
}
</script>
</body>
</html>`;

const out = join(DOCS, 'index.html');
writeFileSync(out, html);
console.log(`✓ ${out} を生成（${sections.length}ドキュメント）`);
