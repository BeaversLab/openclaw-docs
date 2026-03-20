---
summary: "`openclaw dashboard` 的 CLI 參考（開啟控制 UI）"
read_when:
  - 您想要使用目前的 token 開啟控制 UI
  - 您想要在不啟動瀏覽器的情況下列印 URL
title: "dashboard"
---

# `openclaw dashboard`

使用您目前的授權開啟控制 UI。

```bash
openclaw dashboard
openclaw dashboard --no-open
```

備註：

- `dashboard` 會盡可能解析已設定的 `gateway.auth.token` SecretRefs。
- 對於由 SecretRef 管理的 token（無論已解析或未解析），`dashboard` 會列印/複製/開啟未包含 token 的 URL，以避免在終端機輸出、剪貼簿歷程或瀏覽器啟動引數中洩露外部機密。
- 如果 `gateway.auth.token` 是由 SecretRef 管理但在此指令路徑中未解析，該指令會列印未包含 token 的 URL 並明確指出修復指引，而不會嵌入無效的 token 預留位置。

import en from "/components/footer/en.mdx";

<en />
