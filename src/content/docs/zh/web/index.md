---
summary: "Gateway(网关) 网关 web 界面：控制 UI、绑定模式和安全"
read_when:
  - You want to access the Gateway over Tailscale
  - You want the browser Control UI and config editing
title: "Web"
---

Gateway(网关) 在与 Gateway(网关) WebSocket 相同的端口上提供一个小型的 **浏览器控制 UI** (Vite + Lit)：

- 默认值： `http://<host>:18789/`
- 使用 `gateway.tls.enabled: true` 时： `https://<host>:18789/`
- 可选前缀：设置 `gateway.controlUi.basePath` (例如 `/openclaw`)

功能位于 [Control UI](/zh/web/control-ui) 中。本页的其余部分重点介绍绑定模式、安全和面向 Web 的表面。

## Webhooks

当 `hooks.enabled=true`Gateway(网关)Gateway(网关) 时，Gateway(网关) 还会在同一 HTTP 服务器上公开一个小型的 Webhook 端点。
请参阅 [Gateway(网关) configuration](/zh/gateway/configuration) → `hooks` 以了解身份验证和有效负载。

## Admin HTTP RPC

Admin HTTP RPC 在 RPCGateway(网关)`POST /api/v1/admin/rpc` 公开选定的 Gateway(网关) 控制平面方法。
它默认处于关闭状态，仅在启用 `admin-http-rpc`RPC 插件时注册。
请参阅 [Admin HTTP RPC](/zh/plugins/admin-http-rpc) 以了解身份验证模型、允许的方法以及 WebSocket 比较。

## Config (default-on)

当资产存在时（`dist/control-ui`），Control UI **默认启用**。
您可以通过配置控制它：

```json5
{
  gateway: {
    controlUi: { enabled: true, basePath: "/openclaw" }, // basePath optional
  },
}
```

## Tailscale access

### Integrated Serve (recommended)

将 Gateway(网关) 保持在环回接口上，并让 Tailscale Serve 代理它：

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

Then start the gateway (this non-loopback example uses shared-secret token
auth):

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

- 默认情况下需要 Gateway(网关) 身份验证（令牌、密码、受信任代理，或启用时的 Tailscale Serve 标头）。
- 非环回绑定仍然 **需要** gateway 身份验证。实际上，这意味着令牌/密码身份验证或带有 `gateway.auth.mode: "trusted-proxy"` 的感知身份的反向代理。
- The wizard creates shared-secret auth by default and usually generates a
  gateway token (even on loopback).
- In shared-secret mode, the UI sends `connect.params.auth.token` or
  `connect.params.auth.password`.
- 当 `gateway.tls.enabled: true` 时，本地仪表盘和状态辅助程序会渲染
  `https://` 仪表盘 URL 和 `wss://` WebSocket URL。
- 在 Tailscale Serve 或 `trusted-proxy` 等带有身份的模式中，
  WebSocket 身份验证检查改为从请求头中获取满足。
- 对于非环回的公共控制 UI 部署，请显式设置 `gateway.controlUi.allowedOrigins`
  （完整源）。环回、RFC1918/link-local、`.local`、
  `.ts.net` 和 Tailscale CGNAT 主机的私有同源局域网/Tailnet 加载会被接受。
- `gateway.controlUi.dangerouslyAllowHostHeaderOriginFallback=true` 启用
  Host-header origin 回退模式，但这是一个危险的安全降级。
- 使用 Serve 时，当 `gateway.auth.allowTailscale` 为 `true` 时（不需要令牌/密码），
  Tailscale 身份标头可以满足控制 UI/WebSocket 身份验证。
  HTTP API 端点不使用那些 Tailscale 身份标头；它们改为遵循
  网关的正常 HTTP 身份验证模式。设置
  `gateway.auth.allowTailscale: false` 以要求显式凭证。请参阅
  [Tailscale](/zh/gateway/tailscale) 和 [安全](/zh/gateway/security)。此
  无令牌流程假定网关主机是受信任的。
- `gateway.tailscale.mode: "funnel"` 需要 `gateway.auth.mode: "password"`（共享密码）。

## 构建 UI

Gateway(网关) 从 `dist/control-ui` 提供静态文件。使用以下命令构建它们：

```bash
pnpm ui:build
```
