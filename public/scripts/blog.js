// Blog article page scripts
// Extracted from BlogLayout.astro to comply with CSP (script-src 'self' blocks inline scripts)

function initBlogPage() {
  // Progress bar
  const bar = document.getElementById('progress-bar');
  const article = document.querySelector('.post-body');

  if (bar && article) {
    window.addEventListener('scroll', () => {
      const rect = article.getBoundingClientRect();
      const articleHeight = article.offsetHeight;
      const scrolled = -rect.top;
      const progress = Math.min(1, Math.max(0, scrolled / (articleHeight - window.innerHeight)));
      bar.style.transform = `scaleX(${progress})`;
    }, { passive: true });
  }

  // Code block copy buttons
  document.querySelectorAll('.post-body pre').forEach((pre) => {
    // 既存のコピーボタンがあれば追加しない
    if (pre.querySelector('.copy-btn')) return;
    const btn = document.createElement('button');
    btn.className = 'copy-btn';
    btn.setAttribute('aria-label', 'コードをコピー');
    btn.textContent = 'Copy';
    pre.appendChild(btn);

    btn.addEventListener('click', async () => {
      const code = pre.querySelector('code');
      const text = code?.innerText ?? pre.innerText;
      try {
        await navigator.clipboard.writeText(text);
        btn.textContent = 'Copied!';
        btn.classList.add('copied');
        setTimeout(() => {
          btn.textContent = 'Copy';
          btn.classList.remove('copied');
        }, 2000);
      } catch {
        btn.textContent = 'Failed';
        setTimeout(() => { btn.textContent = 'Copy'; }, 2000);
      }
    });
  });

  // Sidebar TOC: active link highlight on scroll
  const tocLinks = document.querySelectorAll('[data-toc-link]');
  if (tocLinks.length > 0) {
    const headings = Array.from(tocLinks)
      .map((a) => {
        const id = a.getAttribute('href')?.slice(1);
        return id ? document.getElementById(id) : null;
      })
      .filter(Boolean);

    const onScroll = () => {
      const offset = 120;
      let active = headings[0];
      for (const h of headings) {
        if (h.getBoundingClientRect().top <= offset) active = h;
      }
      tocLinks.forEach((a) => {
        a.classList.toggle('active', a.getAttribute('href') === `#${active?.id}`);
      });
    };
    window.addEventListener('scroll', onScroll, { passive: true });
    onScroll();
  }
}

document.addEventListener('astro:page-load', initBlogPage);
initBlogPage();
