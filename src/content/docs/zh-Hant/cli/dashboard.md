---
summary: "`openclaw dashboard`（開啟控制 UI）的 CLI 參考"
read_when:
  - You want to open the Control UI with your current token
  - You want to print the URL without launching a browser
title: "儀表板"
---

# `openclaw dashboard`

使用您目前的認證開啟控制 UI。

```bash
openclaw dashboard
openclaw dashboard --no-open
```

備註：

- `dashboard` 會盡可能解析已設定的 `gateway.auth.token` SecretRefs。
- 針對 SecretRef 管理的 Token（已解析或未解析），`dashboard` 會列印/複製/開啟不包含 Token 的 URL，以避免在外部終端機輸出、剪貼簿歷程記錄或瀏覽器啟動引數中洩露外部秘密。
- 如果 `gateway.auth.token` 是由 SecretRef 管理但在該指令路徑中尚未解析，該指令會列印不包含 Token 的 URL 以及明確的修復指引，而不會嵌入無效的 Token 預留位置。
