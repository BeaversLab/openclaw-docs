---
summary: "`openclaw dashboard`（開啟控制 UI）的 CLI 參考"
read_when:
  - You want to open the Control UI with your current token
  - You want to print the URL without launching a browser
title: "Dashboard"
---

# `openclaw dashboard`

使用您目前的認證開啟控制 UI。

```bash
openclaw dashboard
openclaw dashboard --no-open
```

備註：

- `dashboard` 會盡可能解析已設定的 `gateway.auth.token` SecretRefs。
- `dashboard` 遵循 `gateway.tls.enabled`：啟用 TLS 的閘道會列印/開啟
  `https://` Control UI URL，並透過 `wss://` 進行連線。
- 對於由 SecretRef 管理的權杖（已解析或未解析），`dashboard` 會列印/複製/開啟未包含權杖的 URL，以避免在終端機輸出、剪貼簿歷史記錄或瀏覽器啟動引數中洩露外部機密。
- 如果 `gateway.auth.token` 是由 SecretRef 管理，但在此指令路徑中未解析，該指令會列印未包含權杖的 URL 以及明確的修復指引，而不會嵌入無效的權杖佔位符。

## 相關

- [CLI 參考資料](/zh-Hant/cli)
- [Dashboard](/zh-Hant/web/dashboard)
