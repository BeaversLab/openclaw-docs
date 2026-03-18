---
summary: "Gateway web surfaces: Control UI, bind modes, and security"
read_when:
  - You want to access the Gateway over Tailscale
  - You want the browser Control UI and config editing
title: "Web"
---

# Web (Gateway)

The Gateway serves a small **browser Control UI** (Vite + Lit) from the same port as the Gateway WebSocket:

- default: `http://<host>:18789/`
- optional prefix: set `gateway.controlUi.basePath` (e.g. `/openclaw`)

Capabilities live in [Control UI](/zh-Hant/web/control-ui).
This page focuses on bind modes, security, and web-facing surfaces.

## Webhooks

When `hooks.enabled=true`, the Gateway also exposes a small webhook endpoint on the same HTTP server.
See [Gateway configuration](/zh-Hant/gateway/configuration) → `hooks` for auth + payloads.

## Config (default-on)

The Control UI is **enabled by default** when assets are present (`dist/control-ui`).
You can control it via config:

```json5
{
  gateway: {
    controlUi: { enabled: true, basePath: "/openclaw" }, // basePath optional
  },
}
```

## Tailscale access

### Integrated Serve (recommended)

Keep the Gateway on loopback and let Tailscale Serve proxy it:

```json5
{
  gateway: {
    bind: "loopback",
    tailscale: { mode: "serve" },
  },
}
```

Then start the gateway:

```bash
openclaw gateway
```

Open:

- `https://<magicdns>/` (or your configured `gateway.controlUi.basePath`)

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

Then start the gateway (token required for non-loopback binds):

```bash
openclaw gateway
```

Open:

- `http://<tailscale-ip>:18789/` (or your configured `gateway.controlUi.basePath`)

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

- Gateway auth is required by default (token/password or Tailscale identity headers).
- Non-loopback binds still **require** a shared token/password (`gateway.auth` or env).
- The wizard generates a gateway token by default (even on loopback).
- The UI sends `connect.params.auth.token` or `connect.params.auth.password`.
- For non-loopback Control UI deployments, set `gateway.controlUi.allowedOrigins`
  explicitly (full origins). Without it, gateway startup is refused by default.
- `gateway.controlUi.dangerouslyAllowHostHeaderOriginFallback=true` enables
  Host-header origin fallback mode, but is a dangerous security downgrade.
- 使用 Serve 時，當 `gateway.auth.allowTailscale` 為 `true` 時，Tailscale 身份標頭可以滿足控制 UI/WebSocket 身份驗證
  （無需令牌/密碼）。
  HTTP API 端點仍需令牌/密碼。設定
  `gateway.auth.allowTailscale: false` 以要求明確的憑證。請參閱
  [Tailscale](/zh-Hant/gateway/tailscale) 和 [安全性](/zh-Hant/gateway/security)。此
  無令牌流程假設閘道主機是受信任的。
- `gateway.tailscale.mode: "funnel"` 需要 `gateway.auth.mode: "password"`（共用密碼）。

## 建置 UI

閘道從 `dist/control-ui` 提供靜態檔案。請使用以下方式建置：

```bash
pnpm ui:build # auto-installs UI deps on first run
```

import footerZhHant from "/components/footer/zh-Hant.mdx";

<footerZhHant />
