---
summary: "Gateway web 介面：控制 UI、綁定模式與安全性"
read_when:
  - You want to access the Gateway over Tailscale
  - You want the browser Control UI and config editing
title: "Web"
---

Gateway 從與 Gateway WebSocket 相同的埠提供一個小型的 **瀏覽器控制 UI**（Vite + Lit）：

- 預設值：`http://<host>:18789/`
- 帶 `gateway.tls.enabled: true`： `https://<host>:18789/`
- 可選前綴：設定 `gateway.controlUi.basePath`（例如 `/openclaw`）

功能位於 [Control UI](/zh-Hant/web/control-ui)。本頁其餘部分側重於綁定模式、安全性和 Web 介面。

## Webhooks

當 `hooks.enabled=true` 時，Gateway 也會在同一個 HTTP 伺服器上公開一個小型 Webhook 端點。
請參閱 [Gateway configuration](/zh-Hant/gateway/configuration) → `hooks` 以了解認證與 Payload。

## Admin HTTP RPC

Admin HTTP RPC 在 `POST /api/v1/admin/rpc` 公開選定的 Gateway 控制平面方法。
它預設為關閉，僅在啟用 `admin-http-rpc` 外掛程式時註冊。
請參閱 [Admin HTTP RPC](/zh-Hant/plugins/admin-http-rpc) 以了解認證模型、允許的方法以及 WebSocket 比較。

## Config (default-on)

當資源存在時 (`dist/control-ui`)，Control UI **預設為啟用**。
您可以透過配置來控制它：

```json5
{
  gateway: {
    controlUi: { enabled: true, basePath: "/openclaw" }, // basePath optional
  },
}
```

## Tailscale access

### Integrated Serve (recommended)

將 Gateway 保留在 loopback 上，並讓 Tailscale Serve 對其進行代理：

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

然後啟動 gateway (此非 loopback 範例使用共享金鑰 token
認證)：

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

- Gateway 認證預設為必需 (token、密碼、trusted-proxy，或在啟用時的 Tailscale Serve 身份標頭)。
- 非 loopback 綁定仍然**需要** gateway 認證。實務上，這意味著 token/密碼認證，或是具備 `gateway.auth.mode: "trusted-proxy"` 的身分感知反向代理。
- 精靈預設會建立共享金鑰認證，並通常會產生一個
  gateway token (即使在 loopback 上)。
- 在共享金鑰模式下，UI 會傳送 `connect.params.auth.token` 或
  `connect.params.auth.password`。
- 當 `gateway.tls.enabled: true` 時，本地儀表板和狀態輔助工具會呈現
  `https://` 儀表板 URL 和 `wss://` WebSocket URL。
- 在 Tailscale Serve 或 `trusted-proxy` 等承載身分的模式下，
  WebSocket 認證檢查則改由請求標頭滿足。
- 對於公開的非回環控制 UI 部署，請明確設定 `gateway.controlUi.allowedOrigins`（完整來源）。回環、RFC1918/link-local、`.local`、`.ts.net` 和 Tailscale CGNAT 主機接受私有的同來源 LAN/Tailnet 載入。
- `gateway.controlUi.dangerouslyAllowHostHeaderOriginFallback=true` 啟用 Host 標頭來源後援模式，但這是一項危險的安全性降級。
- 使用 Serve 時，當 `gateway.auth.allowTailscale` 為 `true` 時（不需要權杖/密碼），Tailscale 身份標頭可以滿足控制 UI/WebSocket 驗證。HTTP API 端點不使用那些 Tailscale 身份標頭；它們改為遵循閘道的正常 HTTP 驗證模式。設定 `gateway.auth.allowTailscale: false` 以要求明確的憑證。請參閱 [Tailscale](/zh-Hant/gateway/tailscale) 和 [Security](/zh-Hant/gateway/security)。此無權杖流程假設閘道主機受信任。
- `gateway.tailscale.mode: "funnel"` 需要 `gateway.auth.mode: "password"`（共用密碼）。

## 建置 UI

閘道從 `dist/control-ui` 提供靜態檔案。使用以下指令建置：

```bash
pnpm ui:build
```
