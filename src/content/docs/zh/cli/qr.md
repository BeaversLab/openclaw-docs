---
summary: "CLI 参考文档，用于 `openclaw qr`（生成移动端配对二维码和设置代码）"
read_when:
  - You want to pair a mobile node app with a gateway quickly
  - You need setup-code output for remote/manual sharing
title: "qr"
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
- 在内置的节点/操作员引导流程中，主节点令牌仍然由 `scopes: []` 接收。
- 如果引导交接还发放了操作员令牌，它将仅限于引导允许列表：`operator.approvals`, `operator.read`, `operator.talk.secrets`, `operator.write`。
- 引导范围检查带有角色前缀。该操作员允许列表仅满足操作员请求；非操作员角色仍需要在其自身角色前缀下的范围。
- 对于 Tailscale/公共 `ws://` Gateway(网关) URL，移动端配对将以“安全失败”的方式结束。私有 LAN `ws://` 仍然受支持，但 Tailscale/公共移动路由应使用 Tailscale Serve/Funnel 或 `wss://` Gateway(网关) URL。
- 使用 `--remote` 时，OpenClaw 需要 `gateway.remote.url` 或
  `gateway.tailscale.mode=serve|funnel`。
- 使用 `--remote` 时，如果有效的活动远程凭据被配置为 SecretRefs 且您未传递 `--token` 或 `--password`，该命令将从活动的 Gateway 快照中解析它们。如果 Gateway 不可用，该命令将快速失败。
- 如果不使用 `--remote`，当未传递 CLI 认证覆盖时，将解析本地 Gateway 认证 SecretRefs：
  - `gateway.auth.token` 在令牌认证可以胜出时解析（显式 `gateway.auth.mode="token"` 或没有密码源胜出的推断模式）。
  - `gateway.auth.password` 在密码认证可以胜出时解析（显式 `gateway.auth.mode="password"` 或来自 auth/env 的令牌未胜出的推断模式）。
- 如果同时配置了 `gateway.auth.token` 和 `gateway.auth.password`（包括 SecretRefs）且未设置 `gateway.auth.mode`，则在显式设置模式之前，设置代码解析将失败。
- Gateway 版本偏差说明：此命令路径需要支持 `secrets.resolve` 的 Gateway(网关)；较旧的 Gateway 返回 unknown-method 错误。
- 扫描后，使用以下命令批准设备配对：
  - `openclaw devices list`
  - `openclaw devices approve <requestId>`
