---
summary: "`openclaw qr` 的 CLI 參考（生成 iOS 配對 QR 碼 + 設置代碼）"
read_when:
  - 您想要快速將 iOS 應用程式與閘道配對
  - 您需要用於遠端/手動共享的設置代碼輸出
title: "qr"
---

# `openclaw qr`

根據您目前的閘道配置生成 iOS 配對 QR 碼和設置代碼。

## 用法

```bash
openclaw qr
openclaw qr --setup-code-only
openclaw qr --json
openclaw qr --remote
openclaw qr --url wss://gateway.example/ws
```

## 選項

- `--remote`：使用 `gateway.remote.url` 加上配置中的遠端 token/密碼
- `--url <url>`：覆蓋負載中使用的閘道 URL
- `--public-url <url>`：覆蓋負載中使用的公用 URL
- `--token <token>`：覆蓋引導流程驗證所依據的閘道 token
- `--password <password>`：覆蓋引導流程驗證所依據的閘道密碼
- `--setup-code-only`：僅列印設置代碼
- `--no-ascii`: 跳過 ASCII QR 碼渲染
- `--json`: 輸出 JSON (`setupCode`, `gatewayUrl`, `auth`, `urlSource`)

## 注意事項

- `--token` 和 `--password` 是互斥的。
- 設置代碼本身現在攜帶一個不透明的短期 `bootstrapToken`，而不是共享的 gateway token/password。
- 使用 `--remote` 時，如果實際生效的遠端憑證配置為 SecretRefs 且您未傳遞 `--token` 或 `--password`，該指令會從有效的 gateway 快照中解析它們。如果 gateway 無法使用，該指令會快速失敗。
- 如果不使用 `--remote`，當未傳遞 CLI 認證覆寫時，將解析本地 gateway 認證 SecretRefs：
  - 當 token auth 可以獲勝時，`gateway.auth.token` 會解析（顯式 `gateway.auth.mode="token"` 或沒有密碼來源獲勝的推斷模式）。
  - 當 password auth 可以獲勝時，`gateway.auth.password` 會解析（顯式 `gateway.auth.mode="password"` 或沒有來自 auth/env 的獲勝 token 的推斷模式）。
- 如果同時配置了 `gateway.auth.token` 和 `gateway.auth.password`（包括 SecretRefs）並且未設定 `gateway.auth.mode`，則設置代碼解析將失敗，直到明確設定模式。
- 注意 Gateway 版本差異：此指令路徑需要支援 `secrets.resolve` 的 gateway；較舊的 gateway 會返回 unknown-method 錯誤。
- 掃描後，使用以下方式批准設備配對：
  - `openclaw devices list`
  - `openclaw devices approve <requestId>`

import en from "/components/footer/en.mdx";

<en />
