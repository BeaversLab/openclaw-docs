---
summary: "CLICLI参考，用于`openclaw devices`（设备配对 + 令牌轮换/撤销）"
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

当您使用已配对的设备令牌进行身份验证时，非管理员调用者只能删除**他们自己的**设备条目。删除其他设备需要 `operator.admin`。

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

通过确切的 `requestId` 批准待处理的设备配对请求。如果省略 `requestId` 或传递 `--latest`OpenClaw，OpenClaw 仅打印所选的待处理请求并退出；在验证详细信息后，使用确切的请求 ID 重新运行批准命令。

<Note>如果设备使用更改的身份验证详细信息（角色、范围或公钥）重试配对，OpenClaw 将取代先前的待处理条目并发出新的 OpenClaw`requestId`。在批准之前立即运行 `openclaw devices list` 以使用当前 ID。</Note>

如果设备已配对并请求更广泛的范围或更广泛的角色，OpenClaw 将保留现有的批准，并创建一个新的待处理升级请求。查看 `openclaw devices list` 中的 OpenClaw`Requested` 与 `Approved` 列，或使用 `openclaw devices approve --latest` 在批准之前预览确切的升级内容。

如果 Gateway(网关) 明确配置了 Gateway(网关)`gateway.nodes.pairing.autoApproveCidrs`，则来自匹配客户端 IP 的首次 `role: node` 请求可以在它们出现在此列表中之前获得批准。该策略默认处于禁用状态，并且绝不适用于操作员/浏览器客户端或升级请求。

```
openclaw devices approve
openclaw devices approve <requestId>
openclaw devices approve --latest
```

## Paperclip / `openclaw_gateway` 首次运行批准

当新的 Paperclip 代理首次通过 `openclaw_gateway`Gateway(网关) 适配器连接时，Gateway(网关) 可能需要一次性设备配对批准才能成功运行。如果 Paperclip 报告 `openclaw_gateway_pairing_required`，请批准待处理的设备并重试。

对于本地网关，预览最新的待处理请求：

```bash
openclaw devices approve --latest
```

预览会打印确切的 `openclaw devices approve <requestId>` 命令。验证请求详细信息，然后使用请求 ID 重新运行该命令以批准它。

对于远程网关或显式凭据，在预览和批准时传递相同的选项：

```bash
openclaw devices approve --latest --url <gateway-ws-url> --token <gateway-token>
```

为了避免重启后重新批准，请在 Paperclip 适配器配置中保留持久设备密钥，而不是每次运行都生成新的临时身份：

```json
{
  "adapterConfig": {
    "devicePrivateKeyPem": "<ed25519-private-key-pkcs8-pem>"
  }
}
```

如果批准一直失败，请先运行 `openclaw devices list` 以确认存在待处理的请求。

### `openclaw devices reject <requestId>`

拒绝待处理的设备配对请求。

```
openclaw devices reject <requestId>
```

### `openclaw devices rotate --device <id> --role <role> [--scope <scope...>]`

轮换特定角色的设备令牌（可选择更新范围）。
目标角色必须已存在于该设备的已批准配对合约中；
轮换无法创建新的未批准角色。
如果省略 `--scope`，稍后使用存储的轮换令牌重新连接时，将重用
该令牌缓存的已批准范围。如果传递显式的 `--scope` 值，这些值
将成为未来缓存令牌重新连接的存储范围集。
非管理员配对设备调用者只能轮换其**自己的**设备令牌。
目标令牌范围集必须保持在调用者会话自己的操作员
范围内；轮换无法创建或保留比调用者
已有的更广泛的操作员令牌。

```
openclaw devices rotate --device <deviceId> --role operator --scope operator.read --scope operator.write
```

以 JSON 形式返回轮换元数据。如果调用者在使用该设备令牌进行身份验证的同时
轮换自己的令牌，则响应还包括替换令牌，
以便客户端可以在重新连接之前保留该令牌。共享/管理员轮换
不会回显不记名令牌。

### `openclaw devices revoke --device <id> --role <role>`

撤销特定角色的设备令牌。

非管理员配对设备调用者只能吊销其**自己的**设备令牌。
吊销其他设备的令牌需要 `operator.admin`。
目标令牌作用域集也必须位于调用者会话自己的操作员作用域内；仅配对的调用者无法吊销管理员/写入操作员令牌。

```
openclaw devices revoke --device <deviceId> --role node
```

以 JSON 格式返回吊销结果。

## 通用选项

- `--url <url>`Gateway(网关)：Gateway(网关) WebSocket URL（配置时默认为 `gateway.remote.url`）。
- `--token <token>`Gateway(网关)：Gateway(网关) 令牌（如果需要）。
- `--password <password>`Gateway(网关)：Gateway(网关) 密码（密码认证）。
- `--timeout <ms>`RPC：RPC 超时。
- `--json`：JSON 输出（推荐用于脚本编写）。

<Warning>当您设置 `--url`CLI 时，CLI 不会回退到配置或环境凭据。请显式传递 `--token` 或 `--password`。缺少显式凭据则报错。</Warning>

## 注意

- 令牌轮换会返回一个新令牌（敏感）。请将其视为机密处理。
- 这些命令需要 `operator.pairing`（或 `operator.admin`）作用域。某些
  批准还要求调用者持有目标设备将铸造或继承的操作员作用域；请参阅 [Operator scopes](/zh/gateway/operator-scopes)。
- `gateway.nodes.pairing.autoApproveCidrs`Gateway(网关)CLI 是一个可选加入的 Gateway(网关) 策略，
  仅适用于全新的节点设备配对；它不会更改 CLI 批准权限。
- 令牌轮换和吊销保持在已批准的配对角色集和
  该设备的已批准作用域基线内。孤立的缓存令牌条目不
  会授予令牌管理目标。
- 对于配对设备令牌会话，跨设备管理仅限管理员使用：
  `remove`、`rotate` 和 `revoke` 仅限自身使用，除非调用者拥有
  `operator.admin`。
- Token mutation is also caller-scope contained: a pairing-only 会话 cannot
  rotate or revoke a token that currently carries `operator.admin` or
  `operator.write`.
- `devices clear` is intentionally gated by `--yes`.
- If pairing scope is unavailable on local loopback (and no explicit `--url` is passed), list/approve can use a local pairing fallback.
- `devices approve` requires an explicit request ID before minting tokens; omitting `requestId` or passing `--latest` only previews the newest pending request.

## Token drift recovery checklist

Use this when Control UI or other clients keep failing with `AUTH_TOKEN_MISMATCH`, `AUTH_DEVICE_TOKEN_MISMATCH`, or `AUTH_SCOPE_MISMATCH`.

1. Confirm current gateway token source:

```bash
openclaw config get gateway.auth.token
```

2. List paired devices and identify the affected device id:

```bash
openclaw devices list
```

3. Rotate operator token for the affected device:

```bash
openclaw devices rotate --device <deviceId> --role operator
```

4. If rotation is not enough, remove stale pairing and approve again:

```bash
openclaw devices remove <deviceId>
openclaw devices list
openclaw devices approve <requestId>
```

5. Retry client connection with the current shared token/password.

Notes:

- Normal reconnect auth precedence is explicit shared token/password first, then explicit `deviceToken`, then stored device token, then bootstrap token.
- Trusted `AUTH_TOKEN_MISMATCH` recovery can temporarily send both the shared token and the stored device token together for the one bounded retry.
- `AUTH_SCOPE_MISMATCH` means the device token was recognized but does not carry the requested scope set; fix the pairing/scope approval contract before changing shared gateway auth.

Related:

- [Dashboard auth 故障排除](/zh/web/dashboard#if-you-see-unauthorized-1008)
- [Gateway(网关) 故障排除](<Gateway(网关)/en/gateway/troubleshooting#dashboard-control-ui-connectivity>)

## Related

- [CLI reference](CLI/en/cli)
- [Nodes](/zh/nodes)
