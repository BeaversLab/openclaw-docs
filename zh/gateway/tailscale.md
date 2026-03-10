---
summary: "为 Gateway 仪表板集成 Tailscale Serve/Funnel"
read_when:
  - "Exposing the Gateway Control UI outside localhost"
  - "Automating tailnet or public dashboard access"
title: "Tailscale"
---

# Tailscale (Gateway 仪表板)

OpenClaw 可以为 Gateway 仪表板和 WebSocket 端口自动配置 Tailscale **Serve**（tailnet）或 **Funnel**（公共）。这使得 Gateway 保持绑定到环回接口，
而 Tailscale 提供 HTTPS、路由和（对于 Serve）身份标头。

## 模式

- `serve`：通过 `tailscale serve` 仅限 Tailnet 的 Serve。Gateway 保持在 `127.0.0.1` 上。
- `funnel`：通过 `tailscale funnel` 提供公共 HTTPS。OpenClaw 需要共享密码。
- `off`：默认（无 Tailscale 自动化）。

## 认证

设置 `gateway.auth.mode` 以控制握手：

- `token`（设置 `OPENCLAW_GATEWAY_TOKEN` 时的默认值）
- `password`（通过 `OPENCLAW_GATEWAY_PASSWORD` 或配置的共享密钥）

当 `tailscale.mode = "serve"` 并且 `gateway.auth.allowTailscale` 为 `true` 时，
有效的 Serve 代理请求可以通过 Tailscale 身份标头
（`tailscale-user-login`）进行身份验证，而无需提供令牌/密码。OpenClaw 通过本地 Tailscale
守护进程（`tailscale whois`）解析 `x-forwarded-for` 地址并将其与标头匹配来验证
身份，然后接受它。
OpenClaw 仅当请求来自环回接口并带有 Tailscale 的
`x-forwarded-for`、`x-forwarded-proto` 和 `x-forwarded-host` 标头
时，才将其视为 Serve 请求。
要要求显式凭据，请设置 `gateway.auth.allowTailscale: false` 或
强制 `gateway.auth.mode: "password"`。

## 配置示例

### 仅 Tailnet（Serve）

```json5
{
  gateway: {
    bind: "loopback",
    tailscale: { mode: "serve" },
  },
}
```

打开：`https://<magicdns>/`（或您配置的 `gateway.controlUi.basePath`）

### 仅 Tailnet（绑定到 Tailnet IP）

当您希望 Gateway 直接监听 Tailnet IP（无 Serve/Funnel）时使用此选项。

```json5
{
  gateway: {
    bind: "tailnet",
    auth: { mode: "token", token: "your-token" },
  },
}
```

从另一个 Tailnet 设备连接：

- Control UI：`http://<tailscale-ip>:18789/`
- WebSocket：`ws://<tailscale-ip>:18789`

注意：环回（`http://127.0.0.1:18789`）在此模式下将**无法**工作。

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

优先使用 `OPENCLAW_GATEWAY_PASSWORD` 而不是将密码提交到磁盘。

## CLI 示例

```bash
openclaw gateway --tailscale serve
openclaw gateway --tailscale funnel --auth password
```

## 注意事项

- Tailscale Serve/Funnel 需要安装并登录 `tailscale` CLI。
- 除非认证模式为 `password`，否则 `tailscale.mode: "funnel"` 拒绝启动以避免公开暴露。
- 如果您希望 OpenClaw 在关闭时撤消 `tailscale serve`
  或 `tailscale funnel` 配置，请设置 `gateway.tailscale.resetOnExit`。
- `gateway.bind: "tailnet"` 是直接的 Tailnet 绑定（无 HTTPS，无 Serve/Funnel）。
- `gateway.bind: "auto"` 优先使用环回；如果您只想使用 Tailnet，请使用 `tailnet`。
- Serve/Funnel 仅暴露 **Gateway control UI + WS**。节点通过
  相同的 Gateway WS 端点连接，因此 Serve 可以用于节点访问。

## 浏览器控制（远程 Gateway + 本地浏览器）

如果您在一台机器上运行 Gateway 但想在另一台机器上驱动浏览器，
请在浏览器机器上运行**节点主机**，并使两者保持在同一个 tailnet 上。
Gateway 将浏览器操作代理到节点；不需要单独的控制服务器或 Serve URL。

避免使用 Funnel 进行浏览器控制；将节点配对视为操作员访问。

## Tailscale 前置条件 + 限制

- Serve 要求为您的 tailnet 启用 HTTPS；如果缺少，CLI 会提示。
- Serve 注入 Tailscale 身份标头；Funnel 不注入。
- Funnel 需要 Tailscale v1.38.3+、MagicDNS、启用 HTTPS 和 funnel 节点属性。
- Funnel 仅通过 TLS 支持端口 `443`、`8443` 和 `10000`。
- macOS 上的 Funnel 需要开源 Tailscale 应用变体。

## 了解更多

- Tailscale Serve 概述：https://tailscale.com/kb/1312/serve
- `tailscale serve` 命令：https://tailscale.com/kb/1242/tailscale-serve
- Tailscale Funnel 概述：https://tailscale.com/kb/1223/tailscale-funnel
- `tailscale funnel` 命令：https://tailscale.com/kb/1311/tailscale-funnel
