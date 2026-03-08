---
summary: "网关 Web 界面：控制界面、绑定模式和安全"
read_when:
  - "您想通过 Tailscale 访问网关"
  - "您想要浏览器控制界面和配置编辑"
title: "Web"
---

# Web（网关）

网关从与网关 WebSocket 相同的端口提供一个小的**浏览器控制界面**（Vite + Lit）：

- 默认：`http://<host>:18789/`
- 可选前缀：设置 `gateway.controlUi.basePath`（例如 `/openclaw`）

功能位于[控制界面](/zh/web/control-ui)。
此页面专注于绑定模式、安全和面向 Web 的界面。

## Webhooks

当 `hooks.enabled=true` 时，网关还在同一 HTTP 服务器上公开一个小的 webhook 端点。参阅[网关配置](/zh/gateway/configuration) → `hooks` 了解身份验证 + 负载。

## 配置（默认开启）

当资产存在时（`dist/control-ui`），控制界面**默认启用**。您可以通过配置控制它：

```json5
{
  gateway: {
    controlUi: { enabled: true, basePath: "/openclaw" }, // basePath optional
  },
}
```

## Tailscale 访问

### 集成 Serve（推荐）

将网关保持在环回上，让 Tailscale Serve 代理它：

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

然后启动网关（非环回绑定需要令牌）：

```bash
openclaw gateway
```

打开：

- `http://<tailscale-ip>:18789/`（或您配置的 `gateway.controlUi.basePath`）

### 公共互联网（Funnel）

```json5
{
  gateway: {
    bind: "loopback",
    tailscale: { mode: "funnel" },
    auth: { mode: "password" }, // or OPENCLAW_GATEWAY_PASSWORD
  },
}
```

## 安全备注

- 默认需要网关身份验证（令牌/密码或 Tailscale 身份头）。
- 非环回绑定仍然**需要**共享令牌/密码（`gateway.auth` 或环境变量）。
- 向导默认生成网关令牌（即使在环回上）。
- UI 发送 `connect.params.auth.token` 或 `connect.params.auth.password`。
- 控制界面发送反点击劫持头，并且除非设置了 `gateway.controlUi.allowedOrigins`，否则仅接受同源浏览器 websocket 连接。
- 使用 Serve 时，当 `gateway.auth.allowTailscale` 为 `true` 时，Tailscale 身份头可以满足身份验证（不需要令牌/密码）。设置 `gateway.auth.allowTailscale: false` 以需要显式凭证。参阅[Tailscale](/zh/gateway/tailscale) 和[安全](/zh/gateway/security)。
- `gateway.tailscale.mode: "funnel"` 需要 `gateway.auth.mode: "password"`（共享密码）。

## 构建 UI

网关从 `dist/control-ui` 提供静态文件。使用以下命令构建它们：

```bash
pnpm ui:build # auto-installs UI deps on first run
```
