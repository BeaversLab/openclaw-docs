---
summary: "CLI 参考手册：`openclaw qr`（生成 iOS 配对二维码 + 设置代码）"
read_when:
  - 您希望将 iOS 应用与 Gateway(网关) 快速配对
  - 您需要用于远程/手动共享的设置代码输出
title: "qr"
---

# `openclaw qr`

根据您当前的 Gateway(网关) 配置，生成 iOS 配对二维码和设置代码。

## 用法

```bash
openclaw qr
openclaw qr --setup-code-only
openclaw qr --json
openclaw qr --remote
openclaw qr --url wss://gateway.example/ws
```

## 选项

- `--remote`：使用 `gateway.remote.url` 加上配置中的远程令牌/密码
- `--url <url>`：覆盖负载中使用的 Gateway(网关) URL
- `--public-url <url>`：覆盖负载中使用的公共 URL
- `--token <token>`：覆盖引导流程所认证的 Gateway(网关) 令牌
- `--password <password>`：覆盖引导流程所认证的 Gateway(网关) 密码
- `--setup-code-only`：仅打印设置代码
- `--no-ascii`：跳过 ASCII 二维码渲染
- `--json`：输出 JSON（`setupCode`、`gatewayUrl`、`auth`、`urlSource`）

## 注意

- `--token` 和 `--password` 互斥。
- 设置代码本身现在携带一个不透明的短期 `bootstrapToken`，而不是共享的 Gateway(网关) 令牌/密码。
- 使用 `--remote` 时，如果有效的活动远程凭证配置为 SecretRefs，并且您未传递 `--token` 或 `--password`，该命令将从活动 Gateway(网关) 快照解析它们。如果 Gateway(网关) 不可用，该命令将快速失败。
- 如果不使用 `--remote`，当未传递 CLI 认证覆盖时，将解析本地 Gateway(网关) 认证 SecretRefs：
  - `gateway.auth.token` 在令牌认证可胜出时解析（显式 `gateway.auth.mode="token"` 或无密码来源胜出的推断模式）。
  - `gateway.auth.password` 在密码认证可胜出时解析（显式 `gateway.auth.mode="password"` 或来自 auth/env 的无获胜令牌的推断模式）。
- 如果配置了 `gateway.auth.token` 和 `gateway.auth.password`（包括 SecretRefs）且未设置 `gateway.auth.mode`，则在显式设置 mode 之前，setup-code 解析将失败。
- Gateway(网关) 版本偏差说明：此命令路径需要支持 `secrets.resolve` 的网关；较旧的网关将返回未知方法错误。
- 扫描后，使用以下命令批准设备配对：
  - `openclaw devices list`
  - `openclaw devices approve <requestId>`

import en from "/components/footer/en.mdx";

<en />
