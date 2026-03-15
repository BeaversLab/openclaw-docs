(function () {
  var path = window.location.pathname;
  var search = window.location.search || '';
  var hash = window.location.hash || '';
  var localeMatch = path.match(/^\/(en|zh|fr)(\/.*)?$/);
  var aliasMap = {
    '/wizard': '/start/wizard',
    '/onboarding': '/start/onboarding',
    '/start/wizard-cli-flow': '/start/wizard-cli-reference',
    '/start/wizard-cli-auth': '/start/wizard-cli-reference',
    '/start/wizard-cli-outputs': '/start/wizard-cli-reference'
  };

  function isStaticPath(pathname) {
    return (
      pathname.startsWith('/assets/') ||
      pathname.startsWith('/license') ||
      pathname.indexOf('.') !== -1
    );
  }

  function detectPreferredLocale() {
    var saved = null;
    try {
      saved = localStorage.getItem('preferredLang');
    } catch (e) {}

    if (saved === 'zh') return 'zh';
    if (saved === 'en') return 'en';
    if (saved === 'fr') return 'fr';

    var langs = navigator.languages || [navigator.language || ''];
    for (var i = 0; i < langs.length; i++) {
      var l = (langs[i] || '').toLowerCase();
      if (l.startsWith('zh')) return 'zh';
      if (l.startsWith('fr')) return 'fr';
    }
    return 'en';
  }

  function applyAlias(locale, suffix) {
    var canonicalSuffix = suffix || '';
    if (canonicalSuffix === '') return '/' + locale;
    return '/' + locale + (aliasMap[canonicalSuffix] || canonicalSuffix);
  }

  if (localeMatch) {
    var locale = localeMatch[1];
    var suffix = localeMatch[2] || '';
    var localizedTarget = applyAlias(locale, suffix);
    if (localizedTarget !== path) {
      window.location.replace(localizedTarget + search + hash);
    }
    return;
  }

  if (isStaticPath(path)) {
    return;
  }

  var locale = detectPreferredLocale();
  var suffix = path === '/' ? '' : path;
  var targetPath = applyAlias(locale, suffix);

  if (targetPath !== path) {
    window.location.replace(targetPath + search + hash);
  }
})();
