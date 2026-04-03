---
summary: "Gateway(网关) 网关 WebSocket 协议：握手、帧、版本控制"
read_when:
  - Implementing or updating gateway WS clients
  - Debugging protocol mismatches or connect failures
  - Regenerating protocol schema/models
title: "Gateway(网关) 网关 协议"
---

# Gateway(网关) 网关 协议 (WebSocket)

Gateway(网关) 网关 WS 协议是 OpenClaw 的**单一控制平面 + 节点传输**。
所有客户端（CLI、Web UI、macOS 应用、iOS/Android 节点、无头节点）
均通过 WebSocket 连接，并在握手时声明其**角色** + **作用域**。

## 传输

- WebSocket，带有 JSON 载荷的文本帧。
- 第一帧 **必须** 是 `connect` 请求。

## 握手 (连接)

Gateway(网关) 网关 → 客户端 (连接前挑战)：

```json
{
  "type": "event",
  "event": "connect.challenge",
  "payload": { "nonce": "…", "ts": 1737264000000 }
}
```

客户端 → Gateway(网关) 网关：

```json
{
  "type": "req",
  "id": "…",
  "method": "connect",
  "params": {
    "minProtocol": 3,
    "maxProtocol": 3,
    "client": {
      "id": "cli",
      "version": "1.2.3",
      "platform": "macos",
      "mode": "operator"
    },
    "role": "operator",
    "scopes": ["operator.read", "operator.write"],
    "caps": [],
    "commands": [],
    "permissions": {},
    "auth": { "token": "…" },
    "locale": "en-US",
    "userAgent": "openclaw-cli/1.2.3",
    "device": {
      "id": "device_fingerprint",
      "publicKey": "…",
      "signature": "…",
      "signedAt": 1737264000000,
      "nonce": "…"
    }
  }
}
```

Gateway(网关) 网关 → 客户端：

```json
{
  "type": "res",
  "id": "…",
  "ok": true,
  "payload": { "type": "hello-ok", "protocol": 3, "policy": { "tickIntervalMs": 15000 } }
}
```

当颁发设备令牌时，`hello-ok` 还包括：

```json
{
  "auth": {
    "deviceToken": "…",
    "role": "operator",
    "scopes": ["operator.read", "operator.write"]
  }
}
```

### 节点示例

```json
{
  "type": "req",
  "id": "…",
  "method": "connect",
  "params": {
    "minProtocol": 3,
    "maxProtocol": 3,
    "client": {
      "id": "ios-node",
      "version": "1.2.3",
      "platform": "ios",
      "mode": "node"
    },
    "role": "node",
    "scopes": [],
    "caps": ["camera", "canvas", "screen", "location", "voice"],
    "commands": ["camera.snap", "canvas.navigate", "screen.record", "location.get"],
    "permissions": { "camera.capture": true, "screen.record": false },
    "auth": { "token": "…" },
    "locale": "en-US",
    "userAgent": "openclaw-ios/1.2.3",
    "device": {
      "id": "device_fingerprint",
      "publicKey": "…",
      "signature": "…",
      "signedAt": 1737264000000,
      "nonce": "…"
    }
  }
}
```

## 帧

- **请求**：`{type:"req", id, method, params}`
- **响应**：`{type:"res", id, ok, payload|error}`
- **事件**：`{type:"event", event, payload, seq?, stateVersion?}`

有副作用的方法需要**幂等键** (idempotency keys)（参见架构）。

## 角色 + 作用域

### 角色

- `operator` = 控制平面客户端 (CLI/UI/automation)。
- `node` = 能力主机 (camera/screen/canvas/system.run)。

### 作用域 (operator)

通用作用域：

- `operator.read`
- `operator.write`
- `operator.admin`
- `operator.approvals`
- `operator.pairing`

Method scope 只是第一道关卡。通过 `chat.send` 访问的某些斜杠命令在此基础上应用了更严格的命令级检查。例如，持久化 `/config set` 和 `/config unset` 写入需要 `operator.admin`。

### 功能/命令/权限 (node)

节点在连接时声明功能声明：

- `caps`: 高层级能力类别。
- `commands`: 用于调用的命令允许列表。
- `permissions`: 细粒度开关 (例如 `screen.record`, `camera.capture`)。

Gateway(网关) 网关 将这些视为**声明** 并执行服务端允许列表。

## 在线状态

- `system-presence` 返回按设备身份键入的条目。
- Presence 条目包含 `deviceId`、`roles` 和 `scopes`，因此 UI 即使在设备同时作为 **operator** 和 **node** 连接时，也能为每个设备显示单行。

### Node 辅助方法

- Nodes 可以调用 `skills.bins` 来获取当前的可执行技能列表，以进行自动允许检查。

### Operator 辅助方法

- Operators 可以调用 `tools.catalog` (`operator.read`) 来获取代理的运行时工具目录。响应包括分组的工具和来源元数据：
  - `source`：`core` 或 `plugin`
  - `pluginId`：当 `source="plugin"` 时的插件所有者
  - `optional`：插件工具是否可选
- 操作员可以调用 `tools.effective` (`operator.read`) 来获取会话的运行时有效工具清单。
  - `sessionKey` 是必需的。
  - 网关从服务端的会话派生可信的运行时上下文，而不是接受调用者提供的身份验证或传递上下文。
  - 响应是会话范围的，反映了当前活动对话可以使用的内容，包括核心、插件和渠道工具。

## 执行审批

- 当执行请求需要审批时，网关会广播 `exec.approval.requested`。
- 操作员客户端通过调用 `exec.approval.resolve` 来解决（需要 `operator.approvals` scope）。
- 对于 `host=node`，`exec.approval.request` 必须包含 `systemRunPlan`（规范化的 `argv`/`cwd`/`rawCommand`/会话元数据）。缺少 `systemRunPlan` 的请求将被拒绝。

## Agent 传送回退

- `agent` 请求可以包含 `deliver=true` 以请求出站传送。
- `bestEffortDeliver=false` 保持严格行为：未解析或仅限内部的传递目标返回 `INVALID_REQUEST`。
- 当无法解析外部可投递路由时（例如内部/网络聊天会话或模糊的多渠道配置），`bestEffortDeliver=true` 允许回退到仅会话执行。

## 版本控制

- `PROTOCOL_VERSION` 位于 `src/gateway/protocol/schema.ts`。
- 客户端发送 `minProtocol` + `maxProtocol`；服务器拒绝不匹配的连接。
- Schemas + 模型从 TypeBox 定义生成：
  - `pnpm protocol:gen`
  - `pnpm protocol:gen:swift`
  - `pnpm protocol:check`

## Auth

- 如果设置了 `OPENCLAW_GATEWAY_TOKEN` （或 `--token` ），则 `connect.params.auth.token` 必须匹配，否则套接字将关闭。
- 配对后，Gateway(网关) 会颁发一个限定于连接角色和范围的 **device token**。它在 `hello-ok.auth.deviceToken` 中返回，客户端应将其保存以用于未来的连接。
- 设备令牌可以通过 `device.token.rotate` 和 `device.token.revoke` 进行轮换/撤销（需要 `operator.pairing` 作用域）。
- 身份验证失败包括 `error.details.code` 以及恢复提示：
  - `error.details.canRetryWithDeviceToken`（布尔值）
  - `error.details.recommendedNextStep` (`retry_with_device_token`、`update_auth_configuration`、`update_auth_credentials`、`wait_then_retry`、`review_auth_configuration`)
- 针对 `AUTH_TOKEN_MISMATCH` 的客户端行为：
  - 受信任的客户端可以使用缓存的每设备令牌尝试一次有界的重试。
  - 如果重试失败，客户端应停止自动重连循环，并显示操作员操作指南。

## 设备身份 + 配对

- 节点应包含从密钥对指纹派生的稳定设备标识（`device.id`）。
- 网关会根据设备和角色颁发令牌。
- 除非启用了本地自动批准，否则新的设备 ID 需要配对批准。
- **本地** 连接包括回环地址和网关主机自身的 tailnet 地址
  （因此同主机 tailnet 绑定仍可以自动批准）。
- 所有 WS 客户端必须在 `device` 期间包含 `connect` 身份（operator + node）。
  控制 UI 仅在以下模式下可以省略它：
  - `gateway.controlUi.allowInsecureAuth=true` 用于仅限本地主机的不安全 HTTP 兼容性。
  - `gateway.controlUi.dangerouslyDisableDeviceAuth=true` （break-glass，严重的安全降级）。
- 所有连接必须对服务器提供的 `connect.challenge` nonce 进行签名。

### 设备身份迁移诊断

对于仍使用挑战前签名行为的旧版客户端，`connect` 现在返回
`error.details.code` 下的 `DEVICE_AUTH_*` 详细代码，并带有稳定的 `error.details.reason`。

常见迁移失败：

| 消息                        | details.code                     | details.reason           | 含义                                            |
| --------------------------- | -------------------------------- | ------------------------ | ----------------------------------------------- |
| `device nonce required`     | `DEVICE_AUTH_NONCE_REQUIRED`     | `device-nonce-missing`   | 客户端省略了 `device.nonce`（或发送了空白值）。 |
| `device nonce mismatch`     | `DEVICE_AUTH_NONCE_MISMATCH`     | `device-nonce-mismatch`  | 客户端使用了过期/错误的 nonce 进行签名。        |
| `device signature invalid`  | `DEVICE_AUTH_SIGNATURE_INVALID`  | `device-signature`       | 签名负载与 v2 负载不匹配。                      |
| `device signature expired`  | `DEVICE_AUTH_SIGNATURE_EXPIRED`  | `device-signature-stale` | 签名的时间戳超出了允许的偏差范围。              |
| `device identity mismatch`  | `DEVICE_AUTH_DEVICE_ID_MISMATCH` | `device-id-mismatch`     | `device.id` 与公钥指纹不匹配。                  |
| `device public key invalid` | `DEVICE_AUTH_PUBLIC_KEY_INVALID` | `device-public-key`      | 公钥格式/规范化失败。                           |

迁移目标：

- 始终等待 `connect.challenge`。
- 对包含服务器 nonce 的 v2 负载进行签名。
- 在 `connect.params.device.nonce` 中发送相同的 nonce。
- 首选签名负载是 `v3`，它除了 device/client/role/scopes/token/nonce 字段外，还绑定了 `platform` 和 `deviceFamily`。
- 为了兼容性，传统的 `v2` 签名仍然被接受，但在重新连接时，配对设备的元数据固定仍然控制着命令策略。

## TLS + 证书固定

- WS 连接支持 TLS。
- 客户端可以选择固定网关证书指纹（请参阅 `gateway.tls` 配置加上 `gateway.remote.tlsFingerprint` 或 CLI `--tls-fingerprint`）。

## 作用域

此协议暴露了**完整的网关 API**（状态、通道、模型、聊天、代理、会话、节点、批准等）。其确切的接口范围由 `src/gateway/protocol/schema.ts` 中的 TypeBox 模式定义。
