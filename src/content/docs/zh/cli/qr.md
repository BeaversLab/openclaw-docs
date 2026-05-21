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
- 内置的 setup-code 引导程序返回一个带有 `scopes: []` 的主要 `node` 令牌，以及一个用于受信任移动设备新手引导的有界 `operator` 交接令牌。
- 交接的操作员令牌仅限于 `operator.approvals`、`operator.read` 和 `operator.write`；`operator.admin`、`operator.pairing` 和 `operator.talk.secrets` 需要单独的批准操作员配对或令牌流。
- 对于 Tailscale/公网 Tailscale`ws://` 网关 URL，移动配对默认失败（安全封闭）。私有 LAN 地址和 `.local`Bonjour Bonjour 主机仍通过 `ws://`TailscaleTailscale 支持，但 Tailscale/公网移动路由应使用 Tailscale Serve/Funnel 或 `wss://` 网关 URL。
- 使用 `--remote`OpenClaw 时，OpenClaw 需要 `gateway.remote.url` 或
  `gateway.tailscale.mode=serve|funnel` 之一。
- 使用 `--remote` 时，如果实际有效的远程凭据被配置为 SecretRefs 且您未传递 `--token` 或 `--password`，该命令将从活动的网关快照中解析它们。如果网关不可用，该命令将快速失败。
- 如果不使用 `--remote`CLI，当未传递 CLI 认证覆盖时，将解析本地网关认证 SecretRefs：
  - 当令牌认证可以胜出时（显式 `gateway.auth.mode="token"` 或无密码源胜出的推断模式），`gateway.auth.token` 会被解析。
  - 当密码认证可以胜出时（显式 `gateway.auth.mode="password"` 或来自 auth/env 的令牌未胜出的推断模式），`gateway.auth.password` 会被解析。
- 如果 `gateway.auth.token` 和 `gateway.auth.password` 均已配置（包括 SecretRefs）且 `gateway.auth.mode` 未设置，则在显式设置模式之前，setup-code 解析将失败。
- Gateway(网关)版本偏差说明：此命令路径需要支持 Gateway(网关)`secrets.resolve` 的Gateway(网关)；较旧的Gateway(网关)会返回 unknown-method 错误。
- 扫描后，使用以下命令批准设备配对：
  - `openclaw devices list`
  - `openclaw devices approve <requestId>`

## 相关

- [CLI 参考](CLI/en/cli)
- [配对](/zh/cli/pairing)
