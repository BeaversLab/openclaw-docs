---
summary: "`openclaw qr` （生成 iOS 配對 QR 碼和設置代碼）的 CLI 參考"
read_when:
  - You want to pair the iOS app with a gateway quickly
  - You need setup-code output for remote/manual sharing
title: "qr"
---

# `openclaw qr`

根據您目前的 Gateway 配置生成 iOS 配對 QR 碼和設置代碼。

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
- `--url <url>`：覆寫負載中使用的 gateway URL
- `--public-url <url>`：覆寫負載中使用的公用 URL
- `--token <token>`：覆寫啟動流程對其進行驗證的 gateway token
- `--password <password>`：覆寫啟動流程對其進行驗證的 gateway 密碼
- `--setup-code-only`：僅列印設置代碼
- `--no-ascii`: 跳過 ASCII QR 碼呈現
- `--json`: 輸出 JSON (`setupCode`, `gatewayUrl`, `auth`, `urlSource`)

## 注意事項

- `--token` 和 `--password` 互斥。
- 設定碼本身現在攜帶一個不透明的短期 `bootstrapToken`，而非共用的閘道 Token/密碼。
- 使用 `--remote` 時，若實際啟用的遠端憑證設定為 SecretRefs 且未傳遞 `--token` 或 `--password`，指令會從啟用的閘道快照中解析這些憑證。若閘道無法使用，指令會快速失敗。
- 若未使用 `--remote`，且未傳遞 CLI 認證覆蓋時，本機閘道認證 SecretRefs 將被解析：
  - 當令牌驗證可以勝出時（明確的 `gateway.auth.mode="token"` 或沒有密碼來源勝出的推斷模式），`gateway.auth.token` 會進行解析。
  - 當密碼驗證可以勝出時（明確的 `gateway.auth.mode="password"` 或沒有來自 auth/env 的獲勝令牌的推斷模式），`gateway.auth.password` 會進行解析。
- 如果同時配置了 `gateway.auth.token` 和 `gateway.auth.password`（包括 SecretRefs）且未設定 `gateway.auth.mode`，則設置程式碼解析將會失敗，直到明確設定模式。
- 關於 Gateway 版本偏差的說明：此指令路徑需要支援 `secrets.resolve` 的 gateway；較舊的 gateway 將會傳回 unknown-method 錯誤。
- 掃描後，請使用以下指令批准裝置配對：
  - `openclaw devices list`
  - `openclaw devices approve <requestId>`

import footerZhHant from "/components/footer/zh-Hant.mdx";

<footerZhHant />
