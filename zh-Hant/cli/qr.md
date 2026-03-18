---
summary: "`openclaw qr`（生成 iOS 配對 QR 二維碼 + 設定碼）的 CLI 參考資料"
read_when:
  - You want to pair the iOS app with a gateway quickly
  - You need setup-code output for remote/manual sharing
title: "qr"
---

# `openclaw qr`

根據您目前的 Gateway 配置生成 iOS 配對 QR 二維碼和設定碼。

## 用法

```bash
openclaw qr
openclaw qr --setup-code-only
openclaw qr --json
openclaw qr --remote
openclaw qr --url wss://gateway.example/ws
```

## 選項

- `--remote`：使用 `gateway.remote.url` 加上配置中的遠端權杖/密碼
- `--url <url>`：覆寫承載中使用的 Gateway URL
- `--public-url <url>`：覆寫承載中使用的公開 URL
- `--token <token>`：覆寫引導流程針對哪個 Gateway 權杖進行驗證
- `--password <password>`：覆寫引導流程針對哪個 Gateway 密碼進行驗證
- `--setup-code-only`：僅列印設定碼
- `--no-ascii`：跳過 ASCII QR 渲染
- `--json`：輸出 JSON (`setupCode`、`gatewayUrl`、`auth`、`urlSource`)

## 注意事項

- `--token` 和 `--password` 互斥。
- 設定碼本身現在攜帶的是一個不透明的短期 `bootstrapToken`，而不是共享的 Gateway 權杖/密碼。
- 使用 `--remote` 時，如果實際生效的遠端憑證是設定為 SecretRefs，且您未傳遞 `--token` 或 `--password`，該指令會從有效的 Gateway 快照中解析它們。如果 Gateway 無法使用，該指令會快速失敗。
- 不使用 `--remote` 時，若未傳遞 CLI 驗證覆寫，則會解析本機 Gateway 驗證 SecretRefs：
  - 當權杖驗證優先時（明確的 `gateway.auth.mode="token"` 或沒有密碼來源優先的推斷模式），會解析 `gateway.auth.token`。
  - 當密碼驗證優先時（明確的 `gateway.auth.mode="password"` 或來自 auth/env 沒有優先權杖的推斷模式），會解析 `gateway.auth.password`。
- 如果同時設定了 `gateway.auth.token` 和 `gateway.auth.password`（包括 SecretRefs）且 `gateway.auth.mode` 未設定，則在明確設定模式之前，設置代碼解析將會失敗。
- 關於 Gateway 版本差異的說明：此指令路徑需要支援 `secrets.resolve` 的 gateway；較舊的 gateway 會返回 unknown-method 錯誤。
- 掃描後，請使用以下指令核准裝置配對：
  - `openclaw devices list`
  - `openclaw devices approve <requestId>`

import footerZhHant from "/components/footer/zh-Hant.mdx";

<footerZhHant />
