---
summary: " `openclaw qr`（產生行動裝置配對 QR 與設定碼）的 CLI 參考資料"
read_when:
  - You want to pair a mobile node app with a gateway quickly
  - You need setup-code output for remote/manual sharing
title: "QR"
---

# `openclaw qr`

根據您目前的 Gateway 組態產生行動裝置配對 QR 碼和設定碼。

## 用法

```bash
openclaw qr
openclaw qr --setup-code-only
openclaw qr --json
openclaw qr --remote
openclaw qr --url wss://gateway.example/ws
```

## 選項

- `--remote`：偏好使用 `gateway.remote.url`；若未設定，`gateway.tailscale.mode=serve|funnel` 仍可提供遠端公開 URL
- `--url <url>`：覆寫 payload 中使用的 Gateway URL
- `--public-url <url>`：覆寫 payload 中使用的公開 URL
- `--token <token>`：覆寫啟動流程認證所依據的 Gateway 權杖
- `--password <password>`：覆寫啟動流程認證所依據的 Gateway 密碼
- `--setup-code-only`：僅列印設定碼
- `--no-ascii`：略過 ASCII QR 碼繪製
- `--json`：輸出 JSON（`setupCode`、`gatewayUrl`、`auth`、`urlSource`）

## 備註

- `--token` 和 `--password` 互斥。
- 設定碼本身現在攜帶的是不透明的短期 `bootstrapToken`，而非共用的 Gateway 權杖/密碼。
- 內建 setup-code 引導程序僅適用於節點。批准後，主要節點令牌會放置於 `scopes: []`。
- 內建的 setup-code 流程不會返回移交的操作員令牌；操作員存取需要單獨的已批准操作員配對或令牌流程。
- 對於 Tailscale/公開 `ws://` 閘道 URL，行動裝置配對會因安全限制而失敗。透過 `ws://` 仍支援私人 LAN 位址和 `.local` Bonjour 主機，但 Tailscale/公開行動路由應使用 Tailscale Serve/Funnel 或 `wss://` 閘道 URL。
- 使用 `--remote` 時，OpenClaw 需要 `gateway.remote.url` 或
  `gateway.tailscale.mode=serve|funnel`。
- 使用 `--remote` 時，如果有效啟用的遠端憑證被設定為 SecretRefs 且您未傳遞 `--token` 或 `--password`，該指令會從啟用的閘道快照中解析它們。如果閘道無法使用，該指令會快速失敗。
- 若未使用 `--remote`，當未傳遞 CLI 驗證覆寫時，會解析本地閘道驗證 SecretRefs：
  - 當令牌驗證可以勝出時（明確的 `gateway.auth.mode="token"` 或推斷模式，即沒有密碼來源勝出），會解析 `gateway.auth.token`。
  - 當密碼驗證可以勝出時（明確的 `gateway.auth.mode="password"` 或推斷模式，且來自 auth/env 的令牌未勝出），會解析 `gateway.auth.password`。
- 如果同時設定了 `gateway.auth.token` 和 `gateway.auth.password`（包括 SecretRefs）且未設定 `gateway.auth.mode`，則 setup-code 解析將會失敗，直到明確設定模式為止。
- 閘道版本差異說明：此指令路徑需要支援 `secrets.resolve` 的閘道；較舊的閘道會返回 unknown-method 錯誤。
- 掃描後，使用以下方式批准裝置配對：
  - `openclaw devices list`
  - `openclaw devices approve <requestId>`

## 相關

- [CLI 參考](/zh-Hant/cli)
- [配對](/zh-Hant/cli/pairing)
