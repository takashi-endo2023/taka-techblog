// UI utilities (back-to-top button, etc.)
// Extracted from BaseLayout.astro to comply with CSP (script-src 'self' blocks inline scripts)

function initBackToTop() {
  const btn = document.getElementById('back-to-top');
  if (!btn) return;
  window.addEventListener('scroll', () => {
    btn.classList.toggle('visible', window.scrollY > 400);
  }, { passive: true });
}

document.addEventListener('astro:page-load', initBackToTop);
initBackToTop();
