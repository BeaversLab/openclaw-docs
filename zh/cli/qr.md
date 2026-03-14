---
summary: "`openclaw qr`（生成 iOS 配对二维码和设置代码）的 CLI 参考"
read_when:
  - You want to pair the iOS app with a gateway quickly
  - You need setup-code output for remote/manual sharing
title: "qr"
---

# `openclaw qr`

根据当前的 Gateway 网关 配置生成 iOS 配对二维码和设置代码。

## 用法

```bash
openclaw qr
openclaw qr --setup-code-only
openclaw qr --json
openclaw qr --remote
openclaw qr --url wss://gateway.example/ws
```

## 选项

- `--remote`：使用配置中的 `gateway.remote.url` 以及远程令牌/密码
- `--url <url>`：覆盖有效负载中使用的网关 URL
- `--public-url <url>`：覆盖有效负载中使用的公开 URL
- `--token <token>`：覆盖引导流程进行身份验证所依据的网关令牌
- `--password <password>`：覆盖引导流程进行身份验证所依据的网关密码
- `--setup-code-only`：仅打印设置代码
- `--no-ascii`：跳过 ASCII 二维码渲染
- `--json`：输出 JSON（`setupCode`、`gatewayUrl`、`auth`、`urlSource`）

## 注意事项

- `--token` 和 `--password` 互斥。
- 设置代码本身现在携带一个不透明的短期 `bootstrapToken`，而不是共享的网关令牌/密码。
- 使用 `--remote` 时，如果有效活动的远程凭据被配置为 SecretRefs 且您未传递 `--token` 或 `--password`，该命令将从活动的网关快照中解析它们。如果网关不可用，该命令将快速失败。
- 在不使用 `--remote` 的情况下，当未传递 CLI 身份验证覆盖时，将解析本地网关身份验证 SecretRefs：
  - 当令牌身份验证可以获胜时（显式 `gateway.auth.mode="token"` 或没有密码源获胜的推断模式），`gateway.auth.token` 解析。
  - 当密码身份验证可以获胜时（显式 `gateway.auth.mode="password"` 或来自 auth/env 没有获胜令牌的推断模式），`gateway.auth.password` 解析。
- 如果同时配置了 `gateway.auth.token` 和 `gateway.auth.password`（包括 SecretRefs）且未设置 `gateway.auth.mode`，则在显式设置模式之前，设置代码解析将失败。
- Gateway(网关) 版本偏差说明：此命令路径需要支持 `secrets.resolve` 的 Gateway(网关)；较旧的 Gateway(网关) 返回 unknown-method 错误。
- 扫描后，使用以下命令批准设备配对：
  - `openclaw devices list`
  - `openclaw devices approve <requestId>`

import zh from '/components/footer/zh.mdx';

<zh />
