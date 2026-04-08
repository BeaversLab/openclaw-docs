---
summary: "`openclaw devices` 的 CLI 参考（设备配对 + 令牌轮换/撤销）"
read_when:
  - You are approving device pairing requests
  - You need to rotate or revoke device tokens
title: "devices"
---

# `openclaw devices`

管理设备配对请求和设备作用域令牌。

## 命令

### `openclaw devices list`

列出待处理的配对请求和已配对的设备。

```
openclaw devices list
openclaw devices list --json
```

待处理请求的输出包括请求的角色和作用域，以便在您批准之前审查批准。

### `openclaw devices remove <deviceId>`

移除一个已配对的设备条目。

当您使用已配对的设备令牌进行身份验证时，非管理员调用者只能
删除**他们自己的**设备条目。删除其他设备需要
`operator.admin`。

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

批准待处理的设备配对请求。如果省略 `requestId`，OpenClaw
将自动批准最新的待处理请求。

注意：如果设备在重试配对时更改了身份验证详细信息（角色/scopes/公
钥），OpenClaw 将取代之前的待处理条目并签发一个新的
`requestId`。请在批准之前立即运行 `openclaw devices list` 以使用
当前的 ID。

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

轮换特定角色的设备令牌（可选择更新 scopes）。
目标角色必须已存在于该设备的已批准配对合约中；
轮换无法创建新的未批准角色。
如果省略 `--scope`，随后使用存储的轮换令牌进行的重新连接将重用该
令牌缓存的已批准 scopes。如果传递显式的 `--scope` 值，这些
值将成为未来缓存令牌重新连接的存储 scope 集。
非管理员已配对设备调用者只能轮换**他们自己的**设备令牌。
此外，任何显式的 `--scope` 值必须保持在调用者会话自身的
操作者 scopes 范围内；轮换无法创建比调用者
当前拥有的更广泛的操作者令牌。

```
openclaw devices rotate --device <deviceId> --role operator --scope operator.read --scope operator.write
```

以 JSON 格式返回新令牌载荷。

### `openclaw devices revoke --device <id> --role <role>`

撤销特定角色的设备令牌。

非管理员已配对设备调用者只能撤销**他们自己的**设备令牌。
撤销其他设备的令牌需要 `operator.admin`。

```
openclaw devices revoke --device <deviceId> --role node
```

以 JSON 格式返回撤销结果。

## 通用选项

- `--url <url>`：Gateway(网关) WebSocket URL（配置时默认为 `gateway.remote.url`）。
- `--token <token>`：Gateway(网关) 令牌（如果需要）。
- `--password <password>`：Gateway(网关) 密码（密码身份验证）。
- `--timeout <ms>`：RPC 超时。
- `--json`：JSON 输出（建议用于脚本编写）。

注意：当您设置 `--url` 时，CLI 不会回退到配置或环境凭据。
请显式传递 `--token` 或 `--password`。缺少显式凭据将导致错误。

## 注意事项

- 令牌轮换会返回一个新的令牌（敏感）。请将其视为密钥处理。
- 这些命令需要 `operator.pairing`（或 `operator.admin`）作用域。
- 令牌轮换保持在该设备已批准的配对角色集和已批准的作用域
  基线之内。孤立的缓存令牌条目不会授予新的
  轮换目标。
- 对于已配对设备的令牌会话，跨设备管理仅限管理员执行：
  `remove`、`rotate` 和 `revoke` 仅限自身操作，除非调用者拥有
  `operator.admin`。
- `devices clear` 被有意地通过 `--yes` 进行限制。
- 如果在本地环回上配对作用域不可用（且未传递显式的 `--url`），列表/批准操作可以使用本地配对回退机制。
- 当您省略 `requestId` 或传递 `--latest` 时，`devices approve` 会自动选择最新的待处理请求。

## 令牌漂移恢复检查清单

当控制 UI (Control UI) 或其他客户端因 `AUTH_TOKEN_MISMATCH` 或 `AUTH_DEVICE_TOKEN_MISMATCH` 持续失败时，请使用此操作。

1. 确认当前网关令牌来源：

```bash
openclaw config get gateway.auth.token
```

2. 列出已配对的设备并识别受影响的设备 ID：

```bash
openclaw devices list
```

3. 轮换受影响设备的操作员令牌：

```bash
openclaw devices rotate --device <deviceId> --role operator
```

4. 如果轮换不足，请移除过时的配对并再次批准：

```bash
openclaw devices remove <deviceId>
openclaw devices list
openclaw devices approve <requestId>
```

5. 使用当前的共享令牌/密码重试客户端连接。

注意事项：

- 正常的重新连接身份验证优先级依次为：显式共享令牌/密码优先，然后是显式 `deviceToken`，接着是存储的设备令牌，最后是引导令牌 (bootstrap token)。
- 受信任的 `AUTH_TOKEN_MISMATCH` 恢复可以在一次有界的重试中临时同时发送共享令牌和存储的设备令牌。

相关内容：

- [Dashboard 身份验证故障排除](/en/web/dashboard#if-you-see-unauthorized-1008)
- [Gateway(网关) 故障排除](/en/gateway/troubleshooting#dashboard-control-ui-connectivity)
