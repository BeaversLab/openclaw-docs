---
summary: "Gateway(网关) Web 界面：控制 UI、绑定模式和安全"
read_when:
  - 您希望通过 Gateway(网关) 访问 Tailscale
  - 您需要浏览器控制 UI 和配置编辑
title: "Web"
---

# Web (Gateway(网关))

Gateway(网关) 从与 Gateway(网关) WebSocket 相同的端口提供一个小型的**浏览器控制 UI** (Vite + Lit)：

- 默认值： `http://<host>:18789/`
- 可选前缀：设置 `gateway.controlUi.basePath` (例如 `/openclaw`)

功能位于 [控制 UI](/zh/web/control-ui) 中。
本页面重点关注绑定模式、安全性和面向 Web 的表面。

## Webhooks

当 `hooks.enabled=true` 时，Gateway(网关) 还会在同一 HTTP 服务器上公开一个小的 webhook 端点。
请参阅 [Gateway(网关) 配置](/zh/gateway/configuration) → `hooks` 以了解认证 + 载荷。

## 配置 (默认开启)

当资产存在时 (`dist/control-ui`)，控制 UI **默认处于启用状态**。
您可以通过配置进行控制：

```json5
{
  gateway: {
    controlUi: { enabled: true, basePath: "/openclaw" }, // basePath optional
  },
}
```

## Tailscale 访问

### 集成 Serve (推荐)

将 Gateway(网关) 保留在环回地址上，并让 Tailscale Serve 对其进行代理：

```json5
{
  gateway: {
    bind: "loopback",
    tailscale: { mode: "serve" },
  },
}
```

然后启动网关：

```bash
openclaw gateway
```

打开：

- `https://<magicdns>/` (或您配置的 `gateway.controlUi.basePath`)

### Tailnet 绑定 + Token

```json5
{
  gateway: {
    bind: "tailnet",
    controlUi: { enabled: true },
    auth: { mode: "token", token: "your-token" },
  },
}
```

然后启动网关 (非环回绑定需要 token)：

```bash
openclaw gateway
```

打开：

- `http://<tailscale-ip>:18789/` (或您配置的 `gateway.controlUi.basePath`)

### 公共互联网

```json5
{
  gateway: {
    bind: "loopback",
    tailscale: { mode: "funnel" },
    auth: { mode: "password" }, // or OPENCLAW_GATEWAY_PASSWORD
  },
}
```

## 安全说明

- 默认情况下需要 Gateway(网关) 认证 (token/密码或 Tailscale 身份标头)。
- 非环回绑定仍然 **需要** 共享的 token/密码 (`gateway.auth` 或环境变量)。
- 向导默认会生成网关 token (即使在环回地址上)。
- UI 发送 `connect.params.auth.token` 或 `connect.params.auth.password`。
- 对于非环回控制 UI 部署，请显式设置 `gateway.controlUi.allowedOrigins`
  (完整源)。如果不设置，默认情况下会拒绝网关启动。
- `gateway.controlUi.dangerouslyAllowHostHeaderOriginFallback=true` 启用
  Host 标头源回退模式，但这是一种危险的安全降级。
- 使用 Serve 时，当 `gateway.auth.allowTailscale` 为 `true` 时（无需令牌/密码），Tailscale 身份标头可以满足控制 UI/WebSocket 认证。HTTP API 端点仍需要令牌/密码。设置 `gateway.auth.allowTailscale: false` 以要求显式凭据。请参阅 [Tailscale](/zh/gateway/tailscale) 和 [安全性](/zh/gateway/security)。此无令牌流程假定网关主机是受信任的。
- `gateway.tailscale.mode: "funnel"` 需要 `gateway.auth.mode: "password"`（共享密码）。

## 构建 UI

Gateway(网关) 从 `dist/control-ui` 提供静态文件。使用以下命令构建它们：

```bash
pnpm ui:build # auto-installs UI deps on first run
```

import zh from "/components/footer/zh.mdx";

<zh />
