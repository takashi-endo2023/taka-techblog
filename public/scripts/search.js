// Pagefind 検索 UI の初期化。
// CSP (script-src 'self') 下で動かすため外部ファイルとして配置している
// （インライン script はブロックされる）。
// Astro の ClientRouter（View Transitions）でソフト遷移してきた場合も
// 初期化されるよう astro:page-load で発火させる。
(function () {
  function mountPagefind() {
    var el = document.getElementById('search');
    // 検索ページ以外、または既に初期化済みなら何もしない
    if (!el || el.getAttribute('data-pagefind-mounted') === '1') return;

    function init() {
      if (typeof window.PagefindUI !== 'function') return; // 開発環境（pagefind未生成）
      var note = document.getElementById('dev-note');
      if (note) note.style.display = 'none';
      el.setAttribute('data-pagefind-mounted', '1');
      new window.PagefindUI({
        element: '#search',
        showImages: false,
        showEmptyFilters: false,
        resetStyles: false,
        translations: {
          placeholder: 'キーワードを入力...',
          zero_results: '「[SEARCH_TERM]」に一致する記事はありません',
          many_results: '[COUNT] 件の記事が見つかりました',
          one_result: '1 件の記事が見つかりました',
          searching: '検索中...',
        },
      });
    }

    if (typeof window.PagefindUI === 'function') {
      init();
    } else {
      var script = document.createElement('script');
      script.src = '/pagefind/pagefind-ui.js';
      script.onload = init;
      document.head.appendChild(script);
    }
  }

  // 通常ロード時とソフト遷移時の両方で発火
  document.addEventListener('astro:page-load', mountPagefind);
  // フォールバック（ClientRouter 未適用時など）
  if (document.readyState !== 'loading') mountPagefind();
  else document.addEventListener('DOMContentLoaded', mountPagefind);
})();
