---
summary: "CLI 参考文档，用于 `openclaw qr`（生成移动端配对二维码和设置代码）"
read_when:
  - You want to pair a mobile node app with a gateway quickly
  - You need setup-code output for remote/manual sharing
title: "QR"
---

# `openclaw qr`

根据您当前的 Gateway(网关) 配置生成移动端配对二维码和设置代码。

## 用法

```bash
openclaw qr
openclaw qr --setup-code-only
openclaw qr --json
openclaw qr --remote
openclaw qr --url wss://gateway.example/ws
```

## 选项

- `--remote`: 优先使用 `gateway.remote.url`；如果未设置，`gateway.tailscale.mode=serve|funnel` 仍然可以提供远程公共 URL
- `--url <url>`: 覆盖有效载荷中使用的 Gateway(网关) URL
- `--public-url <url>`: 覆盖有效载荷中使用的公共 URL
- `--token <token>`: 覆盖引导流程用于身份验证的 Gateway(网关) 令牌
- `--password <password>`: 覆盖引导流程用于身份验证的 Gateway(网关) 密码
- `--setup-code-only`: 仅打印设置代码
- `--no-ascii`: 跳过 ASCII 二维码渲染
- `--json`: 输出 JSON (`setupCode`, `gatewayUrl`, `auth`, `urlSource`)

## 注意事项

- `--token` 和 `--password` 互斥。
- 设置代码本身现在携带一个不透明的短期 `bootstrapToken`，而不是共享的 Gateway(网关) 令牌/密码。
- 内置设置代码引导仅适用于节点。批准后，主节点令牌将位于 `scopes: []`。
- 内置设置代码流程不返回已移交的操作员令牌；操作员访问需要单独的已批准操作员配对或令牌流程。
- 对于 Tailscale/公用 Tailscale`ws://` Gateway URL，移动配对会以失败关闭。专用 LAN 地址和 `.local`Bonjour Bonjour 主机仍通过 `ws://`TailscaleTailscale 受支持，但 Tailscale/公用移动路由应使用 Tailscale Serve/Funnel 或 `wss://` Gateway URL。
- 使用 `--remote`OpenClaw 时，OpenClaw 需要 `gateway.remote.url` 或
  `gateway.tailscale.mode=serve|funnel`。
- 使用 `--remote` 时，如果有效活动的远程凭据配置为 SecretRefs 并且您未传递 `--token` 或 `--password`，该命令将从活动的 Gateway 快照解析它们。如果 Gateway 不可用，该命令将快速失败。
- 如果不使用 `--remote`CLI，则在未传递 CLI 身份验证覆盖时，会解析本地 Gateway 身份验证 SecretRefs：
  - 当令牌身份验证可以获胜时（显式 `gateway.auth.mode="token"` 或未获胜的密码源推断模式），`gateway.auth.token` 会被解析。
  - 当密码身份验证可以获胜时（显式 `gateway.auth.mode="password"` 或来自 auth/env 的无获胜令牌的推断模式），`gateway.auth.password` 会被解析。
- 如果 `gateway.auth.token` 和 `gateway.auth.password` 均已配置（包括 SecretRefs）并且 `gateway.auth.mode` 未设置，则在显式设置模式之前，设置代码解析将失败。
- Gateway 版本偏差说明：此命令路径需要支持 Gateway(网关)`secrets.resolve` 的 Gateway；较旧的 Gateway 会返回未知方法错误。
- 扫描后，使用以下命令批准设备配对：
  - `openclaw devices list`
  - `openclaw devices approve <requestId>`

## 相关

- [CLI 参考](CLI/en/cli)
- [配对](/zh/cli/pairing)
