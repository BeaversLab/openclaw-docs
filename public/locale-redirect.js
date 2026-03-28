(function () {
  if (window.location.pathname !== '/') return;

  var fallback = '/en/';
  var localeMap = [
    ['zh-hant', '/zh-Hant/'],
    ['zh-tw', '/zh-Hant/'],
    ['zh-hk', '/zh-Hant/'],
    ['zh-mo', '/zh-Hant/'],
    ['zh', '/zh/'],
    ['fr', '/fr/'],
    ['es', '/es/'],
    ['en', '/en/'],
  ];

  var languages = Array.isArray(navigator.languages) && navigator.languages.length
    ? navigator.languages
    : [navigator.language];

  var target = fallback;

  outer:
  for (var i = 0; i < languages.length; i += 1) {
    var normalized = String(languages[i] || '').toLowerCase();
    if (!normalized) continue;

    for (var j = 0; j < localeMap.length; j += 1) {
      var prefix = localeMap[j][0];
      var localeTarget = localeMap[j][1];
      if (normalized === prefix || normalized.indexOf(prefix + '-') === 0) {
        target = localeTarget;
        break outer;
      }
    }
  }

  if (window.location.pathname !== target) {
    window.location.replace(target);
  }
})();
