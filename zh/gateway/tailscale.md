---
summary: “用于 Gateway 仪表板的集成式 Tailscale Serve/Funnel”
read_when:
  - Exposing the Gateway Control UI outside localhost
  - Automating tailnet or public dashboard access
title: “Tailscale”
---

# Tailscale (Gateway 仪表板)

OpenClaw 可以为 Gateway 仪表板和 WebSocket 端口自动配置 Tailscale **Serve** (tailnet) 或 **Funnel** (公网)。这使得 Gateway 保持绑定到 loopback，同时由 Tailscale 提供 HTTPS、路由以及（对于 Serve）身份标头。

## 模式

- `serve`：通过 `tailscale serve` 仅限 Tailnet 的 Serve。网关保持在 `127.0.0.1` 上。
- `funnel`：通过 `tailscale funnel` 提供公网 HTTPS。OpenClaw 需要一个共享密码。
- `off`：默认（无 Tailscale 自动化）。

## 认证

设置 `gateway.auth.mode` 以控制握手：

- `token`（设置 `OPENCLAW_GATEWAY_TOKEN` 时的默认值）
- `password`（通过 `OPENCLAW_GATEWAY_PASSWORD` 或配置共享密钥）

当 `tailscale.mode = "serve"` 且 `gateway.auth.allowTailscale` 为 `true` 时，
控制 UI/WebSocket 认证可以使用 Tailscale 身份标头
(`tailscale-user-login`) 而无需提供令牌/密码。OpenClaw 通过
本地 Tailscale 守护进程 (`tailscale whois`) 解析 `x-forwarded-for` 地址并将其
与标头匹配来验证身份，然后接受请求。
只有当请求来自 loopback 且带有 Tailscale 的 `x-forwarded-for`、`x-forwarded-proto` 和 `x-forwarded-host`
标头时，OpenClaw 才会将该请求视为 Serve 请求。
HTTP API 端点（例如 `/v1/*`、`/tools/invoke` 和 `/api/channels/*`）
仍需要令牌/密码认证。
此无令牌流程假设网关主机是受信任的。如果不受信任的本地代码
可能在此主机上运行，请禁用 `gateway.auth.allowTailscale` 并改为要求
令牌/密码认证。
若要求显式凭据，请设置 `gateway.auth.allowTailscale: false` 或
强制 `gateway.auth.mode: "password"`。

## 配置示例

### 仅限 Tailnet (Serve)

```json5
{
  gateway: {
    bind: "loopback",
    tailscale: { mode: "serve" },
  },
}
```

打开：`https://<magicdns>/`（或您配置的 `gateway.controlUi.basePath`）

### 仅限 Tailnet (绑定到 Tailnet IP)

当您希望 Gateway 直接监听 Tailnet IP（不使用 Serve/Funnel）时，请使用此项。

```json5
{
  gateway: {
    bind: "tailnet",
    auth: { mode: "token", token: "your-token" },
  },
}
```

从另一台 Tailnet 设备连接：

- 控制 UI：`http://<tailscale-ip>:18789/`
- WebSocket：`ws://<tailscale-ip>:18789`

注意：环回地址 (`http://127.0.0.1:18789`) 在此模式下**不**起作用。

### 公共互联网（Funnel + 共享密码）

```json5
{
  gateway: {
    bind: "loopback",
    tailscale: { mode: "funnel" },
    auth: { mode: "password", password: "replace-me" },
  },
}
```

优先使用 `OPENCLAW_GATEWAY_PASSWORD`，而不是将密码提交到磁盘。

## CLI 示例

```bash
openclaw gateway --tailscale serve
openclaw gateway --tailscale funnel --auth password
```

## 注意事项

- Tailscale Serve/Funnel 需要安装并登录 `tailscale` CLI。
- 为避免公开暴露，除非 auth mode 为 `password`，否则 `tailscale.mode: "funnel"` 拒绝启动。
- 如果您希望 OpenClaw 在关闭时撤消 `tailscale serve`，请设置 `gateway.tailscale.resetOnExit`
  或 `tailscale funnel` 配置。
- `gateway.bind: "tailnet"` 是直接的 Tailnet 绑定（无 HTTPS，无 Serve/Funnel）。
- `gateway.bind: "auto"` 优先使用环回地址；如果您希望仅限 Tailnet，请使用 `tailnet`。
- Serve/Funnel 仅暴露 **Gateway 控制界面 + WS**。节点通过
  同一个 Gateway WS 端点连接，因此 Serve 可用于节点访问。

## 浏览器控制（远程 Gateway + 本地浏览器）

如果您在一台机器上运行 Gateway，但想在另一台机器上驱动浏览器，
请在浏览器机器上运行 **节点主机 (node host)** 并将两者保持在同一个 tailnet 中。
Gateway 将把浏览器操作代理到节点；不需要单独的控制服务器或 Serve URL。

避免在浏览器控制中使用 Funnel；将节点配对视为操作员访问。

## Tailscale 先决条件 + 限制

- Serve 需要为您的 tailnet 启用 HTTPS；如果缺失，CLI 会提示。
- Serve 注入 Tailscale 身份标头；Funnel 则不会。
- Funnel 需要 Tailscale v1.38.3+、MagicDNS、启用 HTTPS 以及一个 funnel 节点属性。
- 通过 TLS，Funnel 仅支持端口 `443`、`8443` 和 `10000`。
- 在 macOS 上使用 Funnel 需要开源版本的 Tailscale 应用程序。

## 了解更多

- Tailscale Serve 概述：[https://tailscale.com/kb/1312/serve](https://tailscale.com/kb/1312/serve)
- `tailscale serve` 命令：[https://tailscale.com/kb/1242/tailscale-serve](https://tailscale.com/kb/1242/tailscale-serve)
- Tailscale Funnel 概述：[https://tailscale.com/kb/1223/tailscale-funnel](https://tailscale.com/kb/1223/tailscale-funnel)
- `tailscale funnel` 命令：[https://tailscale.com/kb/1311/tailscale-funnel](https://tailscale.com/kb/1311/tailscale-funnel)
