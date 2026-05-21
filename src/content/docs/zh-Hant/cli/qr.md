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
- 內建的 setup-code 啟動程式會傳回主要 `node` token，其中包含 `scopes: []` 加上一個受信任的移動裝置入職用有限 `operator` 移交 token。
- 移交的操作員 token 僅限於 `operator.approvals`、`operator.read` 和 `operator.write`；`operator.admin`、`operator.pairing` 和 `operator.talk.secrets` 需要單獨的已核准操作員配對或 token 流程。
- 針對 Tailscale/公用 `ws://` gateway URL，移動裝置配對會以封閉式失敗。私用 LAN 位址和 `.local` Bonjour 主機在 `ws://` 上仍受支援，但 Tailscale/公用移動路由應使用 Tailscale Serve/Funnel 或 `wss://` gateway URL。
- 使用 `--remote` 時，OpenClaw 需要 `gateway.remote.url` 或
  `gateway.tailscale.mode=serve|funnel`。
- 使用 `--remote` 時，如果有效作用中的遠端憑證設定為 SecretRefs 且您未傳遞 `--token` 或 `--password`，指令會從作用中的 gateway 快照解析它們。如果 gateway 無法使用，指令會快速失敗。
- 若未使用 `--remote`，當未傳遞 CLI 認證覆寫時，會解析本機 gateway 認證 SecretRefs：
  - 當 token 認證可以勝出時（明確的 `gateway.auth.mode="token"` 或沒有密碼來源勝出的推斷模式），會解析 `gateway.auth.token`。
  - 當密碼認證可以勝出時（明確的 `gateway.auth.mode="password"` 或沒有來自 auth/env 的勝出 token 的推斷模式），會解析 `gateway.auth.password`。
- 如果同時設定了 `gateway.auth.token` 和 `gateway.auth.password`（包括 SecretRefs）且未設定 `gateway.auth.mode`，則 setup-code 解析會失敗，直到明確設定模式為止。
- Gateway 版本差異說明：此指令路徑需要支援 `secrets.resolve` 的 gateway；較舊的 gateway 會傳回 unknown-method 錯誤。
- 掃描後，使用以下方式批准裝置配對：
  - `openclaw devices list`
  - `openclaw devices approve <requestId>`

## 相關

- [CLI 參考](/zh-Hant/cli)
- [配對](/zh-Hant/cli/pairing)
