---
summary: "TailscaleGateway(网关)为Gateway(网关)仪表板集成的Tailscale Serve/Funnel"
read_when:
  - Exposing the Gateway Control UI outside localhost
  - Automating tailnet or public dashboard access
title: "TailscaleTailscale"
---

OpenClaw 可以为 Gateway(网关) 仪表板和 WebSocket 端口自动配置 Tailscale **Serve** (tailnet) 或 **Funnel** (public)。这使得 Gateway(网关) 绑定在本地回环上，同时由 Tailscale 提供 HTTPS、路由和（对于 Serve）身份标头。

## 模式

- `serve`：仅限 Tailnet 的 Serve，通过 `tailscale serve`。网关保持在 `127.0.0.1` 上。
- `funnel`：通过 `tailscale funnel`OpenClaw 提供公共 HTTPS。OpenClaw 需要共享密码。
- `off`Tailscale：默认（无 Tailscale 自动化）。

状态和审计输出对这种 OpenClaw Serve/Funnel 模式使用 **Tailscale 暴露**。TailscaleOpenClaw`off`OpenClawTailscale 表示 OpenClaw 未管理 Serve 或 Funnel；这并不意味着本地 Tailscale 守护进程已停止或登出。

## 认证

设置 `gateway.auth.mode` 以控制握手：

- `none`（仅私有入口）
- `token`（设置 `OPENCLAW_GATEWAY_TOKEN` 时的默认值）
- `password`（通过 `OPENCLAW_GATEWAY_PASSWORD` 或配置的共享密钥）
- `trusted-proxy`（具有身份感知的反向代理；参见 [Trusted Proxy Auth](/zh/gateway/trusted-proxy-auth)）

当 `tailscale.mode = "serve"` 且 `gateway.auth.allowTailscale` 为 `true`Tailscale 时，
Control UI/WebSocket 认证可以使用 Tailscale 身份标头
(`tailscale-user-login`OpenClaw)，而无需提供令牌/密码。OpenClaw 通过本地 Tailscale
守护进程 (`tailscale whois`TailscaleOpenClaw) 解析 `x-forwarded-for`Tailscale 地址，并将其与标头匹配以在接受前验证身份。
OpenClaw 仅在请求来自环回地址且带有 Tailscale 的
`x-forwarded-for`、`x-forwarded-proto` 和 `x-forwarded-host`API
标头时，才将其视为 Serve 请求。
对于包含浏览器设备身份的 Control UI 操作员会话，此已验证的 Serve 路径还会跳过设备配对往返。它不会绕过
浏览器设备身份：无设备的客户端仍将被拒绝，且节点角色
或非 Control UI WebSocket 连接仍遵循正常的配对和
身份验证检查。
HTTP API 端点（例如 `/v1/*`、`/tools/invoke` 和 `/api/channels/*`Tailscale）
**不**使用 Tailscale 身份标头认证。它们仍遵循网关的
正常 HTTP 认证模式：默认为共享密钥认证，或特意
配置的可信代理/私有入口 `none` 设置。
此无令牌流程假设网关主机是受信任的。如果不受信任的本地代码
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

打开：`https://<magicdns>/`（或您配置的 `gateway.controlUi.basePath`）

要通过命名的 Tailscale Service 而不是
设备主机名暴露 Control UI，请将 Tailscale`gateway.tailscale.serviceName` 设置为 Service 名称：

```json5
{
  gateway: {
    bind: "loopback",
    tailscale: { mode: "serve", serviceName: "svc:openclaw" },
  },
}
```

使用上述示例时，启动时会将服务 URL 报告为
`https://openclaw.<tailnet-name>.ts.net/` 而不是设备主机名。
Tailscale 服务要求主机是 tailnet 中已批准的已标记节点。在启用
此选项之前，请在 Tailscale 中配置标签并批准服务，否则 `tailscale serve --service=...` 将在网关
启动期间失败。

### Tailnet-only (绑定到 Tailnet IP)

当您希望 Gateway(网关) 直接监听 Tailnet IP（不使用 Serve/Funnel）时，请使用此选项。

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

<Note>Loopback (`http://127.0.0.1:18789`) 在此模式下将**无法**工作。</Note>

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

相比将密码写入磁盘，首选 `OPENCLAW_GATEWAY_PASSWORD`。

## CLI 示例

```bash
openclaw gateway --tailscale serve
openclaw gateway --tailscale funnel --auth password
```

## 注意事项

- Tailscale Serve/Funnel 需要安装并登录 `tailscale` CLI。
- `tailscale.mode: "funnel"` 拒绝启动，除非 auth mode 为 `password` 以避免公开暴露。
- `gateway.tailscale.serviceName` 仅适用于 Serve 模式，并传递给
  `tailscale serve --service=<name>`。该值必须使用 Tailscale 的
  `svc:<dns-label>` 服务名称格式，例如 `svc:openclaw`。
  Tailscale 要求服务主机为已标记节点，并且服务可能需要
  在管理控制台中获得批准，Serve 才能发布它。
- 如果您希望 OpenClaw 在关闭时撤消 `tailscale serve`
  或 `tailscale funnel` 配置，请设置 `gateway.tailscale.resetOnExit`。
- 设置 `gateway.tailscale.preserveFunnel: true` 以在网关重启期间保持外部配置的
  `tailscale funnel` 路由有效。启用此功能且
  网关运行在 `mode: "serve"` 时，OpenClaw 会在重新应用 Serve 之前检查 `tailscale funnel status`
  ，如果 Funnel 路由已覆盖该网关端口，则跳过 Serve。OpenClaw 管理的仅 Funnel 密码策略保持不变。
- `gateway.bind: "tailnet"` 是直接绑定到 Tailnet（无 HTTPS，无 Serve/Funnel）。
- `gateway.bind: "auto"` 首选本地回环；如果您只需要 Tailnet 访问，请使用 `tailnet`。
- Serve/Funnel 仅暴露 **Gateway(网关) 控制 UI + WS**。节点通过同一个 Gateway(网关) WS 端点连接，因此 Serve 可用于节点访问。

## 浏览器控制（远程 Gateway(网关) + 本地浏览器）

如果您在一台机器上运行 Gateway(网关) 但想控制另一台机器上的浏览器，请在浏览器机器上运行一个 **节点主机** 并将两者保持在同一 tailnet 上。Gateway(网关) 会将浏览器操作代理到节点；无需单独的控制服务器或 Serve URL。

避免使用 Funnel 进行浏览器控制；将节点配对视为操作员访问。

## Tailscale 先决条件 + 限制

- Serve 需要为您的 tailnet 启用 HTTPS；如果缺少此项，CLI 会提示。
- Serve 会注入 Tailscale 身份标头；Funnel 则不会。
- Funnel 需要 Tailscale v1.38.3+、MagicDNS、启用 HTTPS 以及一个 funnel 节点属性。
- Funnel 在 TLS 上仅支持端口 `443`、`8443` 和 `10000`。
- 在 macOS 上使用 Funnel 需要开源版 Tailscale 应用程序变体。

## 了解更多

- Tailscale Serve 概述：[Tailscalehttps://tailscale.com/kb/1312/serve](https://tailscale.com/kb/1312/serve)
- `tailscale serve` 命令：[https://tailscale.com/kb/1242/tailscale-serve](https://tailscale.com/kb/1242/tailscale-serve)
- Tailscale Funnel 概述：[Tailscalehttps://tailscale.com/kb/1223/tailscale-funnel](https://tailscale.com/kb/1223/tailscale-funnel)
- `tailscale funnel` 命令：[https://tailscale.com/kb/1311/tailscale-funnel](https://tailscale.com/kb/1311/tailscale-funnel)

## 相关

- [远程访问](/zh/gateway/remote)
- [设备发现](/zh/gateway/discovery)
- [身份验证](/zh/gateway/authentication)
