---
summary: "CLI 参考文档，用于 `openclaw devices`（设备配对 + 令牌轮换/撤销）"
read_when:
  - 您正在批准设备配对请求
  - 您需要轮换或撤销设备令牌
title: "devices"
---

# `openclaw devices`

管理设备配对请求和设备范围的令牌。

## 命令

### `openclaw devices list`

列出待处理的配对请求和已配对的设备。

```
openclaw devices list
openclaw devices list --json
```

### `openclaw devices remove <deviceId>`

删除一个已配对的设备条目。

```
openclaw devices remove <deviceId>
openclaw devices remove <deviceId> --json
```

### `openclaw devices clear --yes [--pending]`

批量清除已配对的设备。

```
openclaw devices clear --yes
openclaw devices clear --yes --pending
openclaw devices clear --yes --pending --json
```

### `openclaw devices approve [requestId] [--latest]`

批准待处理的设备配对请求。如果省略了 `requestId`，OpenClaw
会自动批准最近的待处理请求。

```
openclaw devices approve
openclaw devices approve <requestId>
openclaw devices approve --latest
```

### `openclaw devices reject <requestId>`

拒绝待处理的设备配对请求。

```
openclaw devices reject <requestId>
```

### `openclaw devices rotate --device <id> --role <role> [--scope <scope...>]`

轮换特定角色的设备令牌（可选择更新作用域）。

```
openclaw devices rotate --device <deviceId> --role operator --scope operator.read --scope operator.write
```

### `openclaw devices revoke --device <id> --role <role>`

撤销特定角色的设备令牌。

```
openclaw devices revoke --device <deviceId> --role node
```

## 通用选项

- `--url <url>`：Gateway(网关) WebSocket URL（配置后默认为 `gateway.remote.url`）。
- `--token <token>`：Gateway(网关) 令牌（如果需要）。
- `--password <password>`：Gateway(网关) 密码（密码认证）。
- `--timeout <ms>`：RPC 超时。
- `--json`：JSON 输出（推荐用于脚本）。

注意：当您设置 `--url` 时，CLI 不会回退到配置或环境凭据。
请显式传递 `--token` 或 `--password`。缺少显式凭据将导致错误。

## 注意

- 令牌轮换会返回一个新令牌（敏感信息）。请将其视为机密处理。
- 这些命令需要 `operator.pairing`（或 `operator.admin`）作用域。
- `devices clear` 被有意地通过 `--yes` 限制访问。
- 如果在 local loopback 上无法使用配对作用域（且未传递显式的 `--url`），list/approve 可以使用本地配对回退机制。

## 令牌漂移恢复检查清单

当 Control UI 或其他客户端持续失败并显示 `AUTH_TOKEN_MISMATCH` 或 `AUTH_DEVICE_TOKEN_MISMATCH` 时，请使用此检查清单。

1. 确认当前网关令牌来源：

```bash
openclaw config get gateway.auth.token
```

2. 列出已配对的设备并确定受影响的设备 ID：

```bash
openclaw devices list
```

3. 为受影响的设备轮换操作员令牌：

```bash
openclaw devices rotate --device <deviceId> --role operator
```

4. 如果轮换不足，请移除过时的配对并再次批准：

```bash
openclaw devices remove <deviceId>
openclaw devices list
openclaw devices approve <requestId>
```

5. 使用当前共享的令牌/密码重试客户端连接。

相关内容：

- [Dashboard 认证故障排除](/zh/web/dashboard#if-you-see-unauthorized-1008)
- [Gateway(网关) 故障排除](/zh/gateway/troubleshooting#dashboard-control-ui-connectivity)

import zh from "/components/footer/zh.mdx";

<zh />
