---
summary: "Gateway Web 界面：控制 UI、绑定模式和安全性"
read_when:
  - "您想通过 Tailscale 访问 Gateway"
  - "您需要浏览器控制 UI 和配置编辑"
title: "Web"
---

# Web (Gateway)"

Gateway 在与 Gateway WebSocket 相同的端口上提供一个小型的**浏览器控制 UI**（Vite + Lit）：

- 默认：`http://<host>:18789/`
- 可选前缀：设置 `gateway.controlUi.basePath`（例如 `/openclaw`）

功能位于[控制 UI](/zh/web/control-ui) 中。
本页面重点介绍绑定模式、安全性和 Web 面向的界面。

## Webhook

当 `hooks.enabled=true` 时，Gateway 还在同一 HTTP 服务器上暴露一个小的 webhook 端点。
请参阅 [Gateway 配置](/zh/gateway/configuration) → `hooks` 了解认证 + 负载。

## 配置（默认启用）

当资源存在时（`dist/control-ui`），控制 UI **默认启用**。
您可以通过配置控制它：

```json5
{
  gateway: {
    controlUi: { enabled: true, basePath: "/openclaw" }, // basePath optional
  },
}
```

## Tailscale 访问

### 集成 Serve（推荐）

将 Gateway 保持在回环地址上，让 Tailscale Serve 代理它：

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

### Tailnet 绑定 + 令牌

```json5
{
  gateway: {
    bind: "tailnet",
    controlUi: { enabled: true },
    auth: { mode: "token", token: "your-token" },
  },
}
```

然后启动 gateway（非回环绑定需要令牌）：

```bash
openclaw gateway
```

打开：

- `http://<tailscale-ip>:18789/` (or your configured `gateway.controlUi.basePath`)

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

- Gateway 认证默认是必需的（令牌/密码或 Tailscale 身份标头）。
- 非回环绑定仍然**需要**共享令牌/密码（`gateway.auth` 或环境变量）。
- 向导默认生成 gateway 令牌（即使在回环地址上）。
- UI 发送 `connect.params.auth.token` 或 `connect.params.auth.password`。
- 控制 UI 发送反点击劫持标头，并且除非设置了 `gateway.controlUi.allowedOrigins`，否则仅接受同源浏览器 WebSocket 连接。
- 使用 Serve 时，当 `gateway.auth.allowTailscale` 为 `true` 时，Tailscale 身份标头可以满足认证（不需要令牌/密码）。设置 `gateway.auth.allowTailscale: false` 以要求显式凭据。请参阅 [Tailscale](/zh/gateway/tailscale) 和 [安全性](/zh/gateway/security)。
- `gateway.tailscale.mode: "funnel"` 需要 `gateway.auth.mode: "password"`（共享密码）。

## 构建 UI

Gateway 从 `dist/control-ui` 提供静态文件。使用以下命令构建：

```bash
pnpm ui:build # auto-installs UI deps on first run
```
