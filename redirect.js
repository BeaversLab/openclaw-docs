(function () {
  var path = window.location.pathname;
  // 如果已经有前缀，或者是静态资源，则不重定向
  if (
    path.startsWith('/en/') ||
    path.startsWith('/zh/') ||
    path === '/en' ||
    path === '/zh' ||
    path.startsWith('/assets/') ||
    path.startsWith('/license') ||
    path.indexOf('.') !== -1
  ) {
    return;
  }

  var saved = null;
  try {
    saved = localStorage.getItem('preferredLang');
  } catch (e) {}

  var isZh = false;
  if (saved === 'zh') {
    isZh = true;
  } else if (saved === 'en') {
    isZh = false;
  } else {
    var langs = navigator.languages || [navigator.language || ''];
    for (var i = 0; i < langs.length; i++) {
      if ((langs[i] || '').toLowerCase().startsWith('zh')) {
        isZh = true;
        break;
      }
    }
  }

  var prefix = isZh ? '/zh' : '/en';
  // 避免根目录出现双斜杠 //
  var newPath = prefix + (path === '/' ? '/' : path);
  
  if (newPath !== path) {
    window.location.replace(newPath);
  }
})();
