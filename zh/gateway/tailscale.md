---
summary: "为 Gateway 控制台集成 Tailscale Serve/Funnel"
read_when:
  - 在 localhost 之外暴露 Gateway Control UI
  - 自动化 tailnet 或公开 dashboard 访问
title: "Tailscale"
---

# Tailscale（Gateway 控制台）

OpenClaw 可为 Gateway 控制台与 WebSocket 端口自动配置 Tailscale **Serve**（tailnet）或 **Funnel**（公开）。这样 Gateway 仍绑定在 loopback，由 Tailscale 提供 HTTPS、路由与（Serve 时的）身份头。

## 模式

- `serve`：仅 tailnet，通过 `tailscale serve`。gateway 保持在 `127.0.0.1`。
- `funnel`：通过 `tailscale funnel` 提供公开 HTTPS。OpenClaw 要求共享密码。
- `off`：默认（不做 Tailscale 自动化）。

## 认证

通过 `gateway.auth.mode` 控制握手：

- `token`（当设置了 `OPENCLAW_GATEWAY_TOKEN` 时默认）
- `password`（共享密码，来自 `OPENCLAW_GATEWAY_PASSWORD` 或配置）

当 `tailscale.mode = "serve"` 且 `gateway.auth.allowTailscale` 为 `true` 时，合法的 Serve 代理请求可通过 Tailscale 身份头（`tailscale-user-login`）认证，无需 token/密码。OpenClaw 会通过本地 Tailscale daemon（`tailscale whois`）解析 `x-forwarded-for` 并与头匹配后接受请求。OpenClaw 仅在请求来自 loopback 且包含 Tailscale 的 `x-forwarded-for`、`x-forwarded-proto`、`x-forwarded-host` 时才认定为 Serve。
若需显式凭证，请设 `gateway.auth.allowTailscale: false` 或强制 `gateway.auth.mode: "password"`。

## 配置示例

### 仅 tailnet（Serve）

```json5
{
  gateway: {
    bind: "loopback",
    tailscale: { mode: "serve" },
  },
}
```

访问：`https://<magicdns>/`（或你的 `gateway.controlUi.basePath`）

### 仅 tailnet（绑定 Tailnet IP）

当你想让 Gateway 直接监听 Tailnet IP（不使用 Serve/Funnel）时：

```json5
{
  gateway: {
    bind: "tailnet",
    auth: { mode: "token", token: "your-token" },
  },
}
```

从另一台 Tailnet 设备连接：

- Control UI：`http://<tailscale-ip>:18789/`
- WebSocket：`ws://<tailscale-ip>:18789`

注意：loopback（`http://127.0.0.1:18789`）在此模式下 **不可用**。

### 公网（Funnel + 共享密码）

```json5
{
  gateway: {
    bind: "loopback",
    tailscale: { mode: "funnel" },
    auth: { mode: "password", password: "replace-me" },
  },
}
```

优先使用 `OPENCLAW_GATEWAY_PASSWORD`，不要把密码提交到磁盘。

## CLI 示例

```bash
openclaw gateway --tailscale serve
openclaw gateway --tailscale funnel --auth password
```

## 说明

- Tailscale Serve/Funnel 需要安装并登录 `tailscale` CLI。
- `tailscale.mode: "funnel"` 若认证模式不是 `password` 会拒绝启动，以避免公开暴露。
- 若希望 OpenClaw 在退出时撤销 `tailscale serve` 或 `tailscale funnel` 配置，设置 `gateway.tailscale.resetOnExit`。
- `gateway.bind: "tailnet"` 是直接绑定 Tailnet（无 HTTPS、无 Serve/Funnel）。
- `gateway.bind: "auto"` 优先 loopback；若想仅 Tailnet，请使用 `tailnet`。
- Serve/Funnel 仅暴露 **Gateway 控制 UI + WS**。节点通过同一 WS 端点连接，因此 Serve 也可用于节点访问。

## 浏览器控制（远程 Gateway + 本地浏览器）

若 Gateway 在一台机器上，但你想驱动另一台机器的浏览器，请在浏览器机器上运行 **node host**，并确保两者在同一 tailnet。Gateway 会代理浏览器动作；无需单独的控制服务器或 Serve URL。

避免用 Funnel 进行浏览器控制；将节点配对视为操作者访问。

## Tailscale 前置条件 + 限制

- Serve 需要为 tailnet 启用 HTTPS；若缺失 CLI 会提示。
- Serve 会注入 Tailscale 身份头；Funnel 不会。
- Funnel 需要 Tailscale v1.38.3+、MagicDNS、HTTPS 启用，以及 funnel 节点属性。
- Funnel 仅支持 TLS 端口 `443`、`8443` 与 `10000`。
- macOS 上的 Funnel 需要开源版 Tailscale app。

## 了解更多

- Tailscale Serve 概览：https://tailscale.com/kb/1312/serve
- `tailscale serve` 命令：https://tailscale.com/kb/1242/tailscale-serve
- Tailscale Funnel 概览：https://tailscale.com/kb/1223/tailscale-funnel
- `tailscale funnel` 命令：https://tailscale.com/kb/1311/tailscale-funnel
