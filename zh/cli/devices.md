---
summary: "`openclaw devices` 的 CLI 参考（设备配对 + token 轮换/撤销）"
title: "devices"
read_when:
  - 你在批准设备配对请求
  - 你需要轮换或撤销设备 token
---

# `openclaw devices`

管理设备配对请求与设备级 token。

## 命令

### `openclaw devices list`

列出待处理配对请求与已配对设备。

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

为指定角色轮换设备 token（可选更新 scope）。

```
openclaw devices rotate --device <deviceId> --role operator --scope operator.read --scope operator.write
```

### `openclaw devices revoke --device <id> --role <role>`

撤销指定角色的设备 token。

```
openclaw devices revoke --device <deviceId> --role node
```

## 常用选项

- `--url <url>`：Gateway WebSocket URL（若已配置则默认 `gateway.remote.url`）。
- `--token <token>`：Gateway token（如需）。
- `--password <password>`：Gateway password（密码认证）。
- `--timeout <ms>`：RPC 超时。
- `--json`：JSON 输出（推荐用于脚本）。

## 说明

- 轮换会返回新的 token（敏感信息），请视为密钥处理。
- 这些命令需要 `operator.pairing`（或 `operator.admin`）scope。
