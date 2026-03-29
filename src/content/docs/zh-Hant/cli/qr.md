---
summary: "`openclaw qr`（產生 iOS 配對 QR code + 設定代碼）的 CLI 參考資料"
read_when:
  - You want to pair the iOS app with a gateway quickly
  - You need setup-code output for remote/manual sharing
title: "qr"
---

# `openclaw qr`

根據您目前的 Gateway 設定產生 iOS 配對 QR code 和設定代碼。

## 用法

```bash
openclaw qr
openclaw qr --setup-code-only
openclaw qr --json
openclaw qr --remote
openclaw qr --url wss://gateway.example/ws
```

## 選項

- `--remote`：使用 `gateway.remote.url` 加上設定中的遠端 token/密碼
- `--url <url>`：覆寫 payload 中使用的 Gateway URL
- `--public-url <url>`：覆寫 payload 中使用的公開 URL
- `--token <token>`：覆寫啟動流程驗證時使用的 Gateway token
- `--password <password>`：覆寫啟動流程驗證時使用的 Gateway 密碼
- `--setup-code-only`：僅列印設定代碼
- `--no-ascii`：跳過 ASCII QR 碼渲染
- `--json`：輸出 JSON (`setupCode`, `gatewayUrl`, `auth`, `urlSource`)

## 備註

- `--token` 和 `--password` 互斥。
- 設定代碼本身現在攜帶不透明的短期 `bootstrapToken`，而非共用的 Gateway token/密碼。
- 使用 `--remote` 時，如果有效作用的遠端憑證設定為 SecretRefs，且您未傳遞 `--token` 或 `--password`，該指令會從有效的 Gateway 快照中解析它們。如果 Gateway 無法使用，該指令會快速失敗。
- 若不使用 `--remote`，當未傳遞 CLI 驗證覆寫時，會解析本機 Gateway 驗證 SecretRefs：
  - 當 token 驗證可勝出時（明確的 `gateway.auth.mode="token"` 或推斷模式，即沒有密碼來源勝出），會解析 `gateway.auth.token`。
  - 當密碼驗證可勝出時（明確的 `gateway.auth.mode="password"` 或推斷模式，即 auth/env 中沒有勝出的 token），會解析 `gateway.auth.password`。
- 如果同時設定了 `gateway.auth.token` 和 `gateway.auth.password`（包括 SecretRefs）且未設定 `gateway.auth.mode`，則 setup-code 解析會失敗，直到明確設定模式為止。
- Gateway 版本偏差注意事項：此指令路徑需要支援 `secrets.resolve` 的 gateway；較舊的 gateway 會傳回 unknown-method 錯誤。
- 掃描後，請使用以下方式批准裝置配對：
  - `openclaw devices list`
  - `openclaw devices approve <requestId>`
