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
- 在內建的 node/operator 啟動流程中，主要節點權杖仍然會存放在 `scopes: []` 中。
- 如果啟動交接也發出操作員權杖，它將保持受限於啟動允許清單：`operator.approvals`、`operator.read`、`operator.talk.secrets`、`operator.write`。
- 啟動範圍檢查會加上角色前綴。該操作員允許清單僅滿足操作員請求；非操作員角色仍需要在其自身角色前綴下的範圍。
- 針對 Tailscale/公開 `ws://` 閘道 URL，行動裝置配對會以封閉式失敗（fails closed）。私人 LAN 位址和 `.local` Bonjour 主機仍透過 `ws://` 支援，但 Tailscale/公開行動路由應使用 Tailscale Serve/Funnel 或 `wss://` 閘道 URL。
- 使用 `--remote` 時，OpenClaw 需要提供 `gateway.remote.url` 或
  `gateway.tailscale.mode=serve|funnel`。
- 使用 `--remote` 時，如果有效啟用的遠端憑證設定為 SecretRefs 且您未傳遞 `--token` 或 `--password`，該指令會從啟用的閘道快照中解析它們。如果閘道無法使用，該指令會快速失敗。
- 若未使用 `--remote`，當未傳遞 CLI 認證覆寫時，會解析本機閘道認證 SecretRefs：
  - 當權杖認證可以勝出時（顯式 `gateway.auth.mode="token"` 或沒有密碼來源勝出的推斷模式），`gateway.auth.token` 會被解析。
  - 當密碼認證可以勝出時（顯式 `gateway.auth.mode="password"` 或來自 auth/env 沒有勝出權杖的推斷模式），`gateway.auth.password` 會被解析。
- 如果同時設定了 `gateway.auth.token` 和 `gateway.auth.password`（包括 SecretRefs）且未設定 `gateway.auth.mode`，則設定碼解析將會失敗，直到明確設定模式為止。
- 閘道版本差異說明：此指令路徑需要支援 `secrets.resolve` 的閘道；舊版閘道會傳回未知方法錯誤。
- 掃描後，使用以下方式批准裝置配對：
  - `openclaw devices list`
  - `openclaw devices approve <requestId>`

## 相關

- [CLI 參考資料](/zh-Hant/cli)
- [配對](/zh-Hant/cli/pairing)
