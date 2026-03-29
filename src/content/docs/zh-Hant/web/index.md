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

功能位於 [Control UI](/en/web/control-ui) 中。
本頁面著重於綁定模式、安全性以及網頁介面。

## Webhooks

當 `hooks.enabled=true` 時，Gateway 也會在同一個 HTTP 伺服器上公開一個小型的 webhook 端點。
請參閱 [Gateway configuration](/en/gateway/configuration) → `hooks` 以了解認證與 Payload。

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

然後啟動 gateway (非 loopback 綁定需要 token)：

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

- 預設情況下需要 Gateway 認證 (token/密碼或 Tailscale 身分標頭)。
- 非 loopback 綁定仍然 **需要** 共用的 token/密碼 (`gateway.auth` 或環境變數)。
- 精靈預設會產生 gateway token (即使在 loopback 上)。
- UI 會發送 `connect.params.auth.token` 或 `connect.params.auth.password`。
- 對於非 loopback 的控制 UI 部署，請明確設定 `gateway.controlUi.allowedOrigins`
  (完整的來源)。如果沒有設定，預設會拒絕 gateway 啟動。
- `gateway.controlUi.dangerouslyAllowHostHeaderOriginFallback=true` 啟用
  Host-header origin 後援模式，但這會造成危險的安全性降級。
- 使用 Serve 時，當 `gateway.auth.allowTailscale` 為 `true`（無需 token/密碼），Tailscale 身分標頭即可滿足 Control UI/WebSocket 認證。
  HTTP API 端點仍需 token/密碼。設定
  `gateway.auth.allowTailscale: false` 以要求明確的憑證。請參閱
  [Tailscale](/en/gateway/tailscale) 和 [Security](/en/gateway/security)。此
  無 token 流程假設閘道主機是受信任的。
- `gateway.tailscale.mode: "funnel"` 需要 `gateway.auth.mode: "password"`（共享密碼）。

## 建構 UI

閘道從 `dist/control-ui` 提供靜態檔案。使用以下指令建構：

```bash
pnpm ui:build # auto-installs UI deps on first run
```
