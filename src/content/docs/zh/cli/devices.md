---
summary: "`openclaw devices` 的 CLI 参考（设备配对 + 令牌轮换/撤销）"
read_when:
  - You are approving device pairing requests
  - You need to rotate or revoke device tokens
title: "设备"
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

当设备已配对时，待处理的请求输出会在设备当前已批准的访问权限旁边显示请求的访问权限。这使得作用域/角色升级变得明确，而不是看起来像配对丢失了。

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

通过准确的 `requestId` 批准待处理的设备配对请求。如果 `requestId`
被省略或传递了 `--latest`，OpenClaw 仅打印选定的待处理
请求并退出；在验证详细信息后，使用准确的请求 ID 重新运行批准命令。

<Note>如果设备使用更改的身份验证详细信息（角色、范围或公钥）重试配对，OpenClaw 将取代之前的待处理条目并颁发新的 `requestId`。请在批准之前立即运行 `openclaw devices list` 以使用当前 ID。</Note>

如果设备已配对并请求更广泛的作用域或更广泛的角色，OpenClaw 将保留现有的批准，并创建一个新的待处理升级请求。在 `openclaw devices list` 中查看 `Requested` 与 `Approved` 列，或在批准之前使用 `openclaw devices approve --latest` 预览确切的升级。

如果 Gateway(网关) 使用
`gateway.nodes.pairing.autoApproveCidrs` 进行显式配置，则来自匹配客户端 IP 的首次 `role: node` 请求可以在它们出现在此列表中之前获得批准。该策略默认处于禁用状态，并且绝不适用于操作员/浏览器客户端或升级请求。

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

轮换特定角色的设备令牌（可选择更新范围）。目标角色必须已存在于该设备的已批准配对合约中；轮换无法铸造新的未批准角色。如果您省略 `--scope`，则稍后使用存储的轮换令牌重新连接时将重用该令牌的缓存已批准范围。如果您传递显式 `--scope` 值，这些值将成为未来缓存令牌重新连接的存储范围集。非管理员配对设备调用者只能轮换其**自己的**设备令牌。目标令牌范围集必须保持在调用者会话自己的操作员范围内；轮换无法铸造或保留比调用者已有的更广泛的操作员令牌。

```
openclaw devices rotate --device <deviceId> --role operator --scope operator.read --scope operator.write
```

以 JSON 形式返回轮换元数据。如果调用者在通过该设备令牌进行身份验证的同时轮换自己的令牌，则响应还包括替换令牌，以便客户端可以在重新连接之前保留该令牌。共享/管理员轮换不会回显持有者令牌。

### `openclaw devices revoke --device <id> --role <role>`

撤销特定角色的设备令牌。

非管理员配对设备调用者只能撤销其**自己的**设备令牌。撤销其他设备的令牌需要 `operator.admin`。目标令牌范围集也必须适合调用者会话自己的操作员范围；仅配对的调用者无法撤销管理员/写入操作员令牌。

```
openclaw devices revoke --device <deviceId> --role node
```

以 JSON 形式返回撤销结果。

## 常用选项

- `--url <url>`：Gateway WebSocket URL（配置后默认为 `gateway.remote.url`）。
- `--token <token>`：Gateway 令牌（如果需要）。
- `--password <password>`：Gateway 密码（密码认证）。
- `--timeout <ms>`：RPC 超时。
- `--json`：JSON 输出（推荐用于脚本）。

<Warning>当您设置 `--url` 时，CLI 不会回退到配置或环境凭据。请显式传递 `--token` 或 `--password`。缺少显式凭据将报错。</Warning>

## 注意

- 令牌轮换会返回一个新的令牌（敏感）。请将其视为密钥处理。
- 这些命令需要 `operator.pairing`（或 `operator.admin`）作用域。某些
  审批还要求调用者持有目标设备将生成或继承的操作员作用域；请参阅 [操作员作用域](/zh/gateway/operator-scopes)。
- `gateway.nodes.pairing.autoApproveCidrs` 是一项可选的 Gateway 策略，
  仅适用于新节点设备配对；它不会更改 CLI 批准权限。
- 令牌轮换和撤销保留在该设备的已批准配对角色集和
  已批准作用域基线内。孤立的缓存令牌条目不会
  授予令牌管理目标。
- 对于已配对设备的令牌会话，跨设备管理仅限管理员：
  `remove`、`rotate` 和 `revoke` 仅对自己有效，除非调用者拥有
  `operator.admin`。
- 令牌变更也受限于调用者作用域：仅配对的会话无法
  轮换或撤销当前携带 `operator.admin` 或
  `operator.write` 的令牌。
- `devices clear` 故意受到 `--yes` 的限制。
- 如果本地环回上无法使用配对作用域（且未传递显式的 `--url`），列表/批准可以使用本地配对回退机制。
- `devices approve` 在铸造令牌之前需要显式的请求 ID；省略 `requestId` 或传递 `--latest` 仅预览最新的待处理请求。

## 令牌漂移恢复检查清单

当 Control UI 或其他客户端持续因 `AUTH_TOKEN_MISMATCH`、`AUTH_DEVICE_TOKEN_MISMATCH` 或 `AUTH_SCOPE_MISMATCH` 而失败时，请使用此选项。

1. 确认当前 Gateway 令牌来源：

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

4. 如果轮换不够，请移除过期的配对并再次批准：

```bash
openclaw devices remove <deviceId>
openclaw devices list
openclaw devices approve <requestId>
```

5. 使用当前共享令牌/密码重试客户端连接。

注意：

- 正常的重新连接身份验证优先级首先是显式共享令牌/密码，其次是显式 `deviceToken`，然后是存储的设备令牌，最后是引导令牌。
- 受信任的 `AUTH_TOKEN_MISMATCH` 恢复可以针对一次有界重试临时同时发送共享令牌和存储的设备令牌。
- `AUTH_SCOPE_MISMATCH` 表示设备令牌已被识别，但不携带请求的作用域集；在更改共享网关身份验证之前，请修复配对/作用域审批约定。

相关：

- [Dashboard 身份验证故障排除](/zh/web/dashboard#if-you-see-unauthorized-1008)
- [Gateway(网关) 故障排除](<Gateway(网关)/en/gateway/troubleshooting#dashboard-control-ui-connectivity>)

## 相关

- [CLI 参考](CLI/en/cli)
- [节点](/zh/nodes)
