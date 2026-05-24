// Hamburger menu initialization
// Extracted from Header.astro to comply with CSP (script-src 'self' blocks inline scripts)

let menuAbortCtrl = null;
let savedScrollY = 0;

function lockScroll() {
  savedScrollY = window.scrollY;
  document.documentElement.style.overflow = 'hidden';
}

function unlockScroll() {
  document.documentElement.style.overflow = '';
  window.scrollTo(0, savedScrollY);
}

function initMenu() {
  menuAbortCtrl?.abort();
  menuAbortCtrl = new AbortController();
  const { signal } = menuAbortCtrl;

  const toggle = document.getElementById('menu-toggle');
  const overlay = document.getElementById('mobile-overlay');
  if (!toggle || !overlay) return;

  const focusableEls = overlay.querySelectorAll('[tabindex]');

  function openMenu() {
    toggle.setAttribute('aria-expanded', 'true');
    toggle.setAttribute('aria-label', 'メニューを閉じる');
    toggle.classList.add('open');
    overlay.classList.add('open');
    overlay.setAttribute('aria-hidden', 'false');
    lockScroll();
    focusableEls.forEach(el => el.setAttribute('tabindex', '0'));
  }

  function closeMenu() {
    toggle.setAttribute('aria-expanded', 'false');
    toggle.setAttribute('aria-label', 'メニューを開く');
    toggle.classList.remove('open');
    overlay.classList.remove('open');
    overlay.setAttribute('aria-hidden', 'true');
    unlockScroll();
    focusableEls.forEach(el => el.setAttribute('tabindex', '-1'));
  }

  toggle.addEventListener('click', (e) => {
    e.stopPropagation();
    toggle.getAttribute('aria-expanded') === 'true' ? closeMenu() : openMenu();
  }, { signal });

  // リンクのタップで閉じる
  overlay.addEventListener('click', (e) => {
    if (e.target.closest('a')) closeMenu();
  }, { signal });

  // Escape キー
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && toggle.getAttribute('aria-expanded') === 'true') {
      closeMenu();
      toggle.focus();
    }
  }, { signal });

  // 外側タップで閉じる（iOS Safari 対策で touchend も使用）
  function handleOutside(e) {
    const t = document.getElementById('menu-toggle');
    const o = document.getElementById('mobile-overlay');
    if (!t || !o) return;
    if (t.getAttribute('aria-expanded') !== 'true') return;
    if (!t.contains(e.target) && !o.contains(e.target)) closeMenu();
  }
  document.addEventListener('click',    handleOutside, { signal });
  document.addEventListener('touchend', handleOutside, { signal, passive: true });
}

// View Transitions のページ遷移ごとに再登録
document.addEventListener('astro:page-load', initMenu);

// ページ遷移前にスクロールロックを解除
document.addEventListener('astro:before-preparation', () => {
  const toggle = document.getElementById('menu-toggle');
  const overlay = document.getElementById('mobile-overlay');
  if (!toggle || toggle.getAttribute('aria-expanded') !== 'true') return;
  toggle.setAttribute('aria-expanded', 'false');
  toggle.setAttribute('aria-label', 'メニューを開く');
  toggle.classList.remove('open');
  if (overlay) {
    overlay.classList.remove('open');
    overlay.setAttribute('aria-hidden', 'true');
  }
  unlockScroll();
});

// 初回ロード
initMenu();
