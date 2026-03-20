---
summary: "集成了用于 Tailscale 仪表板的 Gateway(网关) Serve/Funnel"
read_when:
  - 在本地主机之外暴露 Gateway(网关) 控制用户界面
  - 自动化 tailnet 或公共仪表板访问
title: "Tailscale"
---

# Tailscale (Gateway(网关) 仪表板)

OpenClaw 可以自动配置 Tailscale **Serve** (tailnet) 或 **Funnel** (public) 用于 Gateway(网关) 仪表板和 WebSocket 端口。这使 Gateway(网关) 保持绑定到回环地址，同时由 Tailscale 提供 HTTPS、路由和（对于 Serve）身份标头。

## 模式

- `serve`: 仅限 Tailnet 的 Serve，通过 `tailscale serve`。网关保持在 `127.0.0.1` 上。
- `funnel`: 通过 `tailscale funnel` 实现公共 HTTPS。OpenClaw 需要共享密码。
- `off`: 默认（无 Tailscale 自动化）。

## 身份验证

设置 `gateway.auth.mode` 以控制握手：

- `token`（设置 `OPENCLAW_GATEWAY_TOKEN` 时的默认值）
- `password`（通过 `OPENCLAW_GATEWAY_PASSWORD` 或配置进行共享密钥）

当 `tailscale.mode = "serve"` 且 `gateway.auth.allowTailscale` 为 `true` 时，
控制 UI/WebSocket 身份验证可以使用 Tailscale 身份标头
(`tailscale-user-login`)，而无需提供令牌/密码。OpenClaw 通过本地 Tailscale 守护进程 (`tailscale whois`) 解析 `x-forwarded-for` 地址，并在接受请求之前将其与标头进行匹配来验证身份。
OpenClaw 仅当请求来自回环地址并带有 Tailscale 的 `x-forwarded-for`、`x-forwarded-proto` 和 `x-forwarded-host`
标头时，才会将其视为 Serve 请求。
HTTP API 端点（例如 `/v1/*`、`/tools/invoke` 和 `/api/channels/*`）
仍然需要令牌/密码身份验证。
此无令牌流程假定网关主机是受信任的。如果不受信任的本地代码
可能运行在同一主机上，请禁用 `gateway.auth.allowTailscale` 并改为要求
令牌/密码身份验证。
若要求提供显式凭据，请设置 `gateway.auth.allowTailscale: false` 或
强制 `gateway.auth.mode: "password"`。

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

打开：`https://<magicdns>/`（或您配置的 `gateway.controlUi.basePath`）

### 仅限 Tailnet（绑定到 Tailnet IP）

当您希望 Gateway(网关) 直接监听 Tailnet IP（不使用 Serve/Funnel）时，请使用此选项。

```json5
{
  gateway: {
    bind: "tailnet",
    auth: { mode: "token", token: "your-token" },
  },
}
```

从另一个 Tailnet 设备连接：

- 控制 UI：`http://<tailscale-ip>:18789/`
- WebSocket：`ws://<tailscale-ip>:18789`

注意：在此模式下，回环（`http://127.0.0.1:18789`）将**无法**工作。

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

优先使用 `OPENCLAW_GATEWAY_PASSWORD` 而非将密码写入磁盘。

## CLI 示例

```bash
openclaw gateway --tailscale serve
openclaw gateway --tailscale funnel --auth password
```

## 注意事项

- Tailscale Serve/Funnel 需要安装并登录 `tailscale` CLI。
- 为了避免公开暴露，除非认证模式为 `password`，否则 `tailscale.mode: "funnel"` 将拒绝启动。
- 如果您希望 OpenClaw 在关闭时撤消 `tailscale serve`
  或 `tailscale funnel` 配置，请设置 `gateway.tailscale.resetOnExit`。
- `gateway.bind: "tailnet"` 是直接的 Tailnet 绑定（无 HTTPS，无 Serve/Funnel）。
- `gateway.bind: "auto"` 优先使用回环；如果您希望仅限 Tailnet，请使用 `tailnet`。
- Serve/Funnel 仅暴露 **Gateway(网关) 控制 UI + WS**。节点通过
  同一个 Gateway(网关) WS 端点连接，因此 Serve 可以用于节点访问。

## 浏览器控制（远程 Gateway(网关) + 本地浏览器）

如果您在一台机器上运行 Gateway(网关) 但希望在另一台机器上驱动浏览器，
请在浏览器机器上运行一个 **节点主机**，并将两者保持在同一个 tailnet 中。
Gateway(网关) 会将浏览器操作代理到节点；不需要单独的控制服务器或 Serve URL。

避免对浏览器控制使用 Funnel；将节点配对视为操作员访问。

## Tailscale 先决条件 + 限制

- Serve 需要为您的 tailnet 启用 HTTPS；如果缺少，CLI 会提示。
- Serve 注入 Tailscale 身份标头；Funnel 则不会。
- Funnel 需要 Tailscale v1.38.3+、MagicDNS、启用 HTTPS 以及一个 funnel 节点属性。
- Funnel 在 TLS 上仅支持端口 `443`、`8443` 和 `10000`。
- 在 macOS 上使用 Funnel 需要开源版本的 Tailscale 应用。

## 了解更多

- Tailscale Serve 概述：[https://tailscale.com/kb/1312/serve](https://tailscale.com/kb/1312/serve)
- `tailscale serve` 命令：[https://tailscale.com/kb/1242/tailscale-serve](https://tailscale.com/kb/1242/tailscale-serve)
- Tailscale Funnel 概述：[https://tailscale.com/kb/1223/tailscale-funnel](https://tailscale.com/kb/1223/tailscale-funnel)
- `tailscale funnel` 命令：[https://tailscale.com/kb/1311/tailscale-funnel](https://tailscale.com/kb/1311/tailscale-funnel)

import en from "/components/footer/en.mdx";

<en />
