---
summary: "Gateway web 表面：控制 UI、绑定模式和安全"
read_when:
  - You want to access the Gateway over Tailscale
  - You want the browser Control UI and config editing
title: "Web"
---

# Web (Gateway)

Gateway 在与 Gateway WebSocket 相同的端口上提供一个小的 **browser Control UI**（基于 Vite + Lit）：

- 默认值：`http://<host>:18789/`
- 可选前缀：设置 `gateway.controlUi.basePath`（例如 `/openclaw`）

功能位于 [Control UI](/zh/en/web/control-ui) 中。
本页面重点关注绑定模式、安全性和面向 web 的接口。

## Webhooks

当 `hooks.enabled=true` 时，Gateway 还会在同一个 HTTP 服务器上公开一个小的 webhook 端点。
请参阅 [Gateway configuration](/zh/en/gateway/configuration) → `hooks` 了解认证和负载。

## Config (default-on)

当资产存在时（`dist/control-ui`），Control UI **默认启用**。
您可以通过配置对其进行控制：

```json5
{
  gateway: {
    controlUi: { enabled: true, basePath: "/openclaw" }, // basePath optional
  },
}
```

## Tailscale access

### Integrated Serve (recommended)

将 Gateway 保持在环回地址上，并让 Tailscale Serve 对其进行代理：

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

然后启动 gateway（非环回绑定需要令牌）：

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

- 默认情况下需要 Gateway 认证（令牌/密码或 Tailscale 身份标头）。
- 非环回绑定仍然 **require** 共享令牌/密码（`gateway.auth` 或环境变量）。
- 向导默认会生成 gateway 令牌（即使在环回上）。
- UI 发送 `connect.params.auth.token` 或 `connect.params.auth.password`。
- 对于非环回 Control UI 部署，设置 `gateway.controlUi.allowedOrigins`
  显式设置（完整的源）。如果不设置，默认情况下会拒绝 gateway 启动。
- `gateway.controlUi.dangerouslyAllowHostHeaderOriginFallback=true` 启用
  Host-header 源回退模式，但这是一种危险的安全降级。
- 使用 Serve 时，Tailscale 身份标头可以满足 Control UI/WebSocket 认证
  当 `gateway.auth.allowTailscale` 为 `true` 时（无需令牌/密码）。
  HTTP API 端点仍需令牌/密码。设置
  `gateway.auth.allowTailscale: false` 以要求明确的凭据。请参阅
  [Tailscale](/zh/en/gateway/tailscale) 和 [Security](/zh/en/gateway/security)。此
  无令牌流程假定网关主机是受信任的。
- `gateway.tailscale.mode: "funnel"` 需要 `gateway.auth.mode: "password"`（共享密码）。

## 构建 UI

网关从 `dist/control-ui` 提供静态文件。使用以下命令构建：

```bash
pnpm ui:build # auto-installs UI deps on first run
```
