---
summary: "`openclaw devices` CLI 参考（设备配对 + 令牌轮换/撤销）"
read_when:
  - "您正在批准设备配对请求"
  - "您需要轮换或撤销设备令牌"
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

### `openclaw devices approve <requestId>`

批准待处理的设备配对请求。

```
openclaw devices approve <requestId>
```

### `openclaw devices reject <requestId>`

拒绝待处理的设备配对请求。

```
openclaw devices reject <requestId>
```

### `openclaw devices rotate --device <id> --role <role> [--scope <scope...>]`

轮换特定角色的设备令牌（可选择更新范围）。

```
openclaw devices rotate --device <deviceId> --role operator --scope operator.read --scope operator.write
```

### `openclaw devices revoke --device <id> --role <role>`

撤销特定角色的设备令牌。

```
openclaw devices revoke --device <deviceId> --role node
```

## 通用选项

- `--url <url>`：Gateway WebSocket URL（配置时默认为 `gateway.remote.url`）。
- `--token <token>`：Gateway令牌（如果需要）。
- `--password <password>`：Gateway密码（密码认证）。
- `--timeout <ms>`：RPC 超时时间。
- `--json`：JSON 输出（推荐用于脚本）。

注意：当您设置 `--url` 时，CLI 不会回退到配置或环境凭据。
请显式传递 `--token` 或 `--password`。缺少显式凭据是错误。

## 说明

- 令牌轮换会返回一个新令牌（敏感信息）。请将其视为机密处理。
- 这些命令需要 `operator.pairing`（或 `operator.admin`）范围。
