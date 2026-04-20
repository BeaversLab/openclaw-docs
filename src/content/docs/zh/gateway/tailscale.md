---
summary: "集成用于 Gateway(网关) 网关 仪表板的 Tailscale Serve/Funnel"
read_when:
  - Exposing the Gateway Control UI outside localhost
  - Automating tailnet or public dashboard access
title: "Tailscale"
---

# Tailscale (Gateway(网关) 网关 仪表板)

OpenClaw 可以为 Gateway(网关) 网关 仪表板和 WebSocket 端口自动配置 Tailscale **Serve** (tailnet) 或 **Funnel** (公网)。这使得 Gateway(网关) 网关 保持绑定到 loopback，同时由 Tailscale 提供 HTTPS、路由以及（对于 Serve）身份标头。

## 模式

- `serve`：仅限 Tailnet 的 Serve，通过 `tailscale serve`。网关保持在 `127.0.0.1`。
- `funnel`：通过 `tailscale funnel` 提供的公共 HTTPS。OpenClaw 需要一个共享密码。
- `off`：默认值（无 Tailscale 自动化）。

## 认证

设置 `gateway.auth.mode` 以控制握手：

- `none` (仅私有入口)
- `token` (设置 `OPENCLAW_GATEWAY_TOKEN` 时的默认值)
- `password` (通过 `OPENCLAW_GATEWAY_PASSWORD` 或配置共享密钥)
- `trusted-proxy` (具有身份感知的反向代理；请参阅 [Trusted Proxy Auth](/zh/gateway/trusted-proxy-auth))

当 `tailscale.mode = "serve"` 且 `gateway.auth.allowTailscale` 为 `true` 时，
控制 UI/WebSocket 认证可以使用 Tailscale 身份标头
(`tailscale-user-login`)，而无需提供令牌/密码。OpenClaw 通过本地 Tailscale
守护进程 (`tailscale whois`) 解析 `x-forwarded-for` 地址，并在接受该地址之前将其与标头进行匹配，以此验证身份。
仅当请求来自回环地址并带有 Tailscale 的 `x-forwarded-for`、`x-forwarded-proto` 和 `x-forwarded-host`
标头时，OpenClaw 才会将该请求视为 Serve 请求。
HTTP API 端点（例如 `/v1/*`、`/tools/invoke` 和 `/api/channels/*`）
**不**使用 Tailscale 身份标头认证。它们仍遵循网关的
标准 HTTP 认证模式：默认为共享密钥认证，或者是故意
配置的 trusted-proxy / private-ingress `none` 设置。
此无令牌流程假定网关主机是受信任的。如果不受信任的本地代码
可能在同一主机上运行，请禁用 `gateway.auth.allowTailscale` 并改为要求
令牌/密码认证。
若要求显式的共享密钥凭据，请设置 `gateway.auth.allowTailscale: false`
并使用 `gateway.auth.mode: "token"` 或 `"password"`。

## 配置示例

### 仅 Tailnet (Serve)

```json5
{
  gateway: {
    bind: "loopback",
    tailscale: { mode: "serve" },
  },
}
```

打开：`https://<magicdns>/` (或您配置的 `gateway.controlUi.basePath`)

### 仅 Tailnet (绑定到 Tailnet IP)

当您希望 Gateway(网关) 直接监听 Tailnet IP（不使用 Serve/Funnel）时，请使用此方式。

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

注意：回环地址 (`http://127.0.0.1:18789`) 在此模式下将**无法**使用。

### 公共互联网 (Funnel + 共享密码)

```json5
{
  gateway: {
    bind: "loopback",
    tailscale: { mode: "funnel" },
    auth: { mode: "password", password: "replace-me" },
  },
}
```

建议优先使用 `OPENCLAW_GATEWAY_PASSWORD`，而不要将密码提交到磁盘。

## CLI 示例

```bash
openclaw gateway --tailscale serve
openclaw gateway --tailscale funnel --auth password
```

## 注意事项

- Tailscale Serve/Funnel 需要安装并登录 `tailscale` CLI。
- `tailscale.mode: "funnel"` 拒绝启动，除非身份验证模式为 `password`，以避免公开暴露。
- 如果您希望 OpenClaw 在关闭时撤消 `tailscale serve` 或 `tailscale funnel` 配置，请设置 `gateway.tailscale.resetOnExit`。
- `gateway.bind: "tailnet"` 是直接绑定到 Tailnet（无 HTTPS，不使用 Serve/Funnel）。
- `gateway.bind: "auto"` 优先使用环回地址；如果您仅限 Tailnet，请使用 `tailnet`。
- Serve/Funnel 仅公开 **Gateway(网关) 控制 UI + WS**。节点通过同一个 Gateway(网关) WS 端点连接，因此 Serve 可用于节点访问。

## 浏览器控制（远程 Gateway(网关) + 本地浏览器）

如果您在一台机器上运行 Gateway(网关)，但想在另一台机器上驱动浏览器，请在浏览器机器上运行 **节点主机**，并将两者保持在同一个 tailnet 中。Gateway(网关) 会将浏览器操作代理到节点；不需要单独的控制服务器或 Serve URL。

避免在浏览器控制中使用 Funnel；将节点配对视为操作员访问。

## Tailscale 先决条件和限制

- Serve 需要为您的 tailnet 启用 HTTPS；如果缺少该功能，CLI 会发出提示。
- Serve 注入 Tailscale 身份标头；而 Funnel 不会。
- Funnel 需要 Tailscale v1.38.3+、MagicDNS、启用 HTTPS 以及一个 funnel 节点属性。
- 通过 TLS，Funnel 仅支持端口 `443`、`8443` 和 `10000`。
- 在 macOS 上使用 Funnel 需要开源版本的 Tailscale 应用变体。

## 了解更多

- Tailscale Serve 概述：[https://tailscale.com/kb/1312/serve](https://tailscale.com/kb/1312/serve)
- `tailscale serve` 命令：[https://tailscale.com/kb/1242/tailscale-serve](https://tailscale.com/kb/1242/tailscale-serve)
- Tailscale Funnel 概述：[https://tailscale.com/kb/1223/tailscale-funnel](https://tailscale.com/kb/1223/tailscale-funnel)
- `tailscale funnel` 命令：[https://tailscale.com/kb/1311/tailscale-funnel](https://tailscale.com/kb/1311/tailscale-funnel)
