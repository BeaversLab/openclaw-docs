---
title: OpenClaw Docs
---

Redirecting...

<script
  dangerouslySetInnerHTML={{
    __html: `
(function () {
  try {
    var saved = localStorage.getItem('preferredLang');
    if (saved === 'zh') {
      window.location.replace('/zh/');
      return;
    }
    if (saved === 'en') {
      window.location.replace('/en/');
      return;
    }
  } catch (e) {}

  var langs = navigator.languages || [navigator.language || ''];
  var isZh = false;
  for (var i = 0; i < langs.length; i++) {
    if ((langs[i] || '').toLowerCase().startsWith('zh')) {
      isZh = true;
      break;
    }
  }
  window.location.replace(isZh ? '/zh/' : '/en/');
})();
`,
  }}
/>
