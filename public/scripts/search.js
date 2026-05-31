// Pagefind 検索 UI の初期化。
// CSP (script-src 'self') 下で動かすため外部ファイルとして配置している
// （インライン script はブロックされる）。
// pagefind-ui.js はビルド後に /pagefind/ に生成される外部アセット。
(function () {
  function init() {
    var note = document.getElementById('dev-note');
    if (typeof window.PagefindUI !== 'function') {
      // pagefind 未生成（開発環境）の場合は dev-note を残す
      return;
    }
    if (note) note.style.display = 'none';
    new window.PagefindUI({
      element: '#search',
      showImages: false,
      showEmptyFilters: false,
      resetStyles: false,
      translations: {
        placeholder: 'キーワードを入力...',
        zero_results: '"[QUERY]" に一致する記事はありません',
        many_results: '[COUNT] 件の記事が見つかりました',
        one_result: '1 件の記事が見つかりました',
        searching: '検索中...',
      },
    });
  }

  var script = document.createElement('script');
  script.src = '/pagefind/pagefind-ui.js';
  script.onload = init;
  document.head.appendChild(script);
})();
