---
title: "Web"
summary: "Gateway Web 面：Control UI、绑定模式与安全"
read_when:
  - 你想通过 Tailscale 访问 Gateway
  - 你需要浏览器 Control UI 与配置编辑
---
# 网页（网关）

Gateway 在与 WebSocket 相同的端口提供一个小型 **浏览器 Control UI**（Vite + Lit）：

- 默认：`http://<host>:18789/`
- 可选前缀：设置 `gateway.controlUi.basePath`（如 `/openclaw`）

能力见 [Control UI](/zh/web/control-ui)。
本页重点是绑定模式、安全与 Web 暴露面。

## Webhooks

当 `hooks.enabled=true` 时，Gateway 也会在同一 HTTP 服务器上暴露 webhook 端点。
认证与 payload 见 [Gateway configuration](/zh/gateway/configuration) → `hooks`。

## Config（默认开启）

当 assets 存在（`dist/control-ui`）时，Control UI **默认启用**。
可通过配置控制：

```json5
{
  gateway: {
    controlUi: { enabled: true, basePath: "/openclaw" } // basePath optional
  }
}
```

## Tailscale 访问

### 集成 Serve（推荐）

保持 Gateway 在回环，让 Tailscale Serve 代理：

```json5
{
  gateway: {
    bind: "loopback",
    tailscale: { mode: "serve" }
  }
}
```

然后启动 gateway：

```bash
openclaw gateway
```

打开：
- `https://<magicdns>/`（或你配置的 `gateway.controlUi.basePath`）

### Tailnet 绑定 + token

```json5
{
  gateway: {
    bind: "tailnet",
    controlUi: { enabled: true },
    auth: { mode: "token", token: "your-token" }
  }
}
```

然后启动 gateway（非回环绑定需要 token）：

```bash
openclaw gateway
```

打开：
- `http://<tailscale-ip>:18789/`（或你配置的 `gateway.controlUi.basePath`）

### 公网（Funnel）

```json5
{
  gateway: {
    bind: "loopback",
    tailscale: { mode: "funnel" },
    auth: { mode: "password" } // or OPENCLAW_GATEWAY_PASSWORD
  }
}
```

## 安全说明

- Gateway 认证默认必需（token/password 或 Tailscale 身份头）。
- 非回环绑定仍 **需要** 共享 token/password（`gateway.auth` 或环境变量）。
- 向导默认生成 gateway token（即使在回环）。
- UI 发送 `connect.params.auth.token` 或 `connect.params.auth.password`。
- 在 Serve 模式下，若 `gateway.auth.allowTailscale` 为 `true`，Tailscale 身份头可满足认证（无需 token/password）。若要强制凭据，设 `gateway.auth.allowTailscale: false`。见 [Tailscale](/zh/gateway/tailscale) 与 [Security](/zh/gateway/security)。
- `gateway.tailscale.mode: "funnel"` 需要 `gateway.auth.mode: "password"`（共享密码）。

## 构建 UI

Gateway 从 `dist/control-ui` 提供静态文件。构建：

```bash
pnpm ui:build # auto-installs UI deps on first run
```
