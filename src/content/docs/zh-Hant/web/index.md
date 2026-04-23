---
summary: "Gateway web 介面：控制 UI、綁定模式與安全性"
read_when:
  - You want to access the Gateway over Tailscale
  - You want the browser Control UI and config editing
title: "Web"
---

# Web (Gateway)

Gateway 會透過與 Gateway WebSocket 相同的連接埠，提供一個小型的 **瀏覽器控制 UI** (Vite + Lit)：

- default: `http://<host>:18789/`
- optional prefix: set `gateway.controlUi.basePath` (e.g. `/openclaw`)

功能位於 [Control UI](/zh-Hant/web/control-ui)。
此頁面主要介紹綁定模式、安全性以及面向網路的介面。

## Webhooks

當 `hooks.enabled=true` 時，Gateway 也會在同一個 HTTP 伺服器上公開一個小型 webhook 端點。
請參閱 [Gateway configuration](/zh-Hant/gateway/configuration) → `hooks` 以取得驗證與負載的相關資訊。

## Config (default-on)

當資源存在時 (`dist/control-ui`)，控制 UI **預設為啟用**。
您可以透過設定檔來控制它：

```json5
{
  gateway: {
    controlUi: { enabled: true, basePath: "/openclaw" }, // basePath optional
  },
}
```

## Tailscale access

### Integrated Serve (recommended)

將 Gateway 保持在 loopback，並讓 Tailscale Serve 將其代理：

```json5
{
  gateway: {
    bind: "loopback",
    tailscale: { mode: "serve" },
  },
}
```

然後啟動 gateway：

```bash
openclaw gateway
```

開啟：

- `https://<magicdns>/` (或您設定的 `gateway.controlUi.basePath`)

### Tailnet bind + token

```json5
{
  gateway: {
    bind: "tailnet",
    controlUi: { enabled: true },
    auth: { mode: "token", token: "your-token" },
  },
}
```

然後啟動 gateway（這個非 loopback 範例使用 shared-secret token
驗證）：

```bash
openclaw gateway
```

開啟：

- `http://<tailscale-ip>:18789/` (或您設定的 `gateway.controlUi.basePath`)

### Public internet (Funnel)

```json5
{
  gateway: {
    bind: "loopback",
    tailscale: { mode: "funnel" },
    auth: { mode: "password" }, // or OPENCLAW_GATEWAY_PASSWORD
  },
}
```

## Security notes

- 預設情況下需要 Gateway 驗證（token、密碼、trusted-proxy，或在啟用時的 Tailscale Serve 身分標頭）。
- 非 loopback 綁定仍然**需要** gateway 驗證。實務上這意味著 token/password 驗證，或具有 `gateway.auth.mode: "trusted-proxy"` 的身分感知反向代理伺服器。
- 精靈預設會建立 shared-secret 驗證，且通常會產生一個
  gateway token（即使在 loopback 上）。
- 在 shared-secret 模式下，UI 會傳送 `connect.params.auth.token` 或
  `connect.params.auth.password`。
- 在 Tailscale Serve 或 `trusted-proxy` 等承載身分的模式中，
  WebSocket 驗證檢查則改為由請求標頭滿足。
- 對於非 loopback 的 Control UI 部署，請明確設定 `gateway.controlUi.allowedOrigins`
  （完整的來源）。若未設定，預設會拒絕 gateway 啟動。
- `gateway.controlUi.dangerouslyAllowHostHeaderOriginFallback=true` 啟用
  Host 標頭來源後援模式，但這是具危險性的安全性降級。
- 使用 Serve 時，當 `gateway.auth.allowTailscale` 為 `true`（不需要 token/password），
  Tailscale 身分標頭可以滿足 Control UI/WebSocket 驗證。
  HTTP API 端點不使用那些 Tailscale 身分標頭；它們改為遵循
  gateway 的標準 HTTP 驗證模式。設定
  `gateway.auth.allowTailscale: false` 以要求明確的憑證。請參閱
  [Tailscale](/zh-Hant/gateway/tailscale) 和 [Security](/zh-Hant/gateway/security)。此
  無 token 流程假設 gateway 主機是受信任的。
- `gateway.tailscale.mode: "funnel"` 需要 `gateway.auth.mode: "password"`（共用密碼）。

## 建置 UI

Gateway 從 `dist/control-ui` 提供靜態檔案。使用以下方式建置：

```bash
pnpm ui:build
```
