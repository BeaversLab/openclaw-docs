---
summary: "Gateway(网关) 网关 web 界面：控制 UI、绑定模式和安全"
read_when:
  - You want to access the Gateway over Tailscale
  - You want the browser Control UI and config editing
title: "Web"
---

# Web (Gateway(网关) 网关)

Gateway(网关) 网关 在与 Gateway(网关) 网关 WebSocket 相同的端口上提供一个小的 **browser Control UI**（基于 Vite + Lit）：

- 默认：`http://<host>:18789/`
- 可选前缀：设置 `gateway.controlUi.basePath`（例如 `/openclaw`）

功能位于[控制 UI](/zh/web/control-ui)中。
此页面重点介绍绑定模式、安全性和面向 Web 的表面。

## Webhooks

当 `hooks.enabled=true` 时，Gateway(网关) 也会在同一 HTTP 服务器上公开一个小型 webhook 端点。
请参阅 [Gateway(网关) 配置](/zh/gateway/configuration) → `hooks` 了解认证 + 负载。

## Config (default-on)

当存在资源文件（`dist/control-ui`）时，控制 UI **默认启用**。
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

将 Gateway(网关) 网关 保持在环回地址上，并让 Tailscale Serve 对其进行代理：

```json5
{
  gateway: {
    bind: "loopback",
    tailscale: { mode: "serve" },
  },
}
```

然后启动 gateway：

```bash
openclaw gateway
```

打开：

- `https://<magicdns>/`（或您配置的 `gateway.controlUi.basePath`）

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

然后启动网关（此非环回示例使用共享密钥令牌
认证）：

```bash
openclaw gateway
```

打开：

- `http://<tailscale-ip>:18789/`（或您配置的 `gateway.controlUi.basePath`）

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

- 默认情况下需要 Gateway(网关) 认证（令牌、密码、受信任代理，或启用时的 Tailscale Serve 身份标头）。
- 非环回绑定仍然**需要**网关认证。实际上，这意味着令牌/密码认证，或具有 `gateway.auth.mode: "trusted-proxy"` 的支持身份识别的反向代理。
- 向导默认创建共享密钥认证，并且通常会生成一个
  网关令牌（即使在环回上）。
- 在共享密钥模式下，UI 发送 `connect.params.auth.token` 或
  `connect.params.auth.password`。
- 在携带身份的模式下，例如 Tailscale Serve 或 `trusted-proxy`，
  WebSocket 认证检查改为从请求标头中获得满足。
- 对于非环回控制 UI 部署，请显式设置 `gateway.controlUi.allowedOrigins`
  （完整的源）。如果没有它，默认情况下会拒绝网关启动。
- `gateway.controlUi.dangerouslyAllowHostHeaderOriginFallback=true` 启用
  Host-header 源回退模式，但这是一个危险的安全降级。
- 使用 Serve 时，如果 `gateway.auth.allowTailscale` 为 `true`，Tailscale 身份标头可以满足控制 UI/WebSocket 认证
  （不需要令牌/密码）。
  HTTP API 端点不使用这些 Tailscale 身份标头；它们改为遵循
  网关的正常 HTTP 认证模式。设置
  `gateway.auth.allowTailscale: false` 以要求显式凭据。请参阅
  [Tailscale](/zh/gateway/tailscale) 和[安全性](/zh/gateway/security)。此
  无令牌流程假设网关主机是受信任的。
- `gateway.tailscale.mode: "funnel"` 需要 `gateway.auth.mode: "password"` （共享密码）。

## 构建 UI

Gateway(网关) 从 `dist/control-ui` 提供静态文件。使用以下命令构建它们：

```bash
pnpm ui:build # auto-installs UI deps on first run
```
