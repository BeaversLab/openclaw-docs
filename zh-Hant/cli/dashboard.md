---
summary: "CLI 參考資料，用於 `openclaw dashboard` (開啟控制 UI)"
read_when:
  - You want to open the Control UI with your current token
  - You want to print the URL without launching a browser
title: "dashboard"
---

# `openclaw dashboard`

使用您目前的認證開啟控制 UI。

```bash
openclaw dashboard
openclaw dashboard --no-open
```

備註：

- `dashboard` 會在可能時解析已設定的 `gateway.auth.token` SecretRefs。
- 針對 SecretRef 管理的權杖（已解析或未解析），`dashboard` 會列印/複製/開啟非權杖化的 URL，以避免在終端機輸出、剪貼簿歷程或瀏覽器啟動引數中暴露外部密碼。
- 如果 `gateway.auth.token` 是由 SecretRef 管理，但在此指令路徑中未解析，該指令會列印非權杖化的 URL 和明確的修復指引，而不是嵌入無效的權杖預留位置。

import footerZhHant from "/components/footer/zh-Hant.mdx";

<footerZhHant />
