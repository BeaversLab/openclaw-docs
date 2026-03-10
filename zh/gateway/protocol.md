---
summary: "Gateway WebSocket 协议：握手、帧、版本控制"
read_when:
  - "Implementing or updating gateway WS clients"
  - "Debugging protocol mismatches or connect failures"
  - "Regenerating protocol schema/models"
title: "Gateway 协议"
---

# Gateway 协议（WebSocket）

Gateway WS 协议是 OpenClaw 的**单一控制平面 + 节点传输**。所有客户端（CLI、Web UI、macOS 应用、iOS/Android 节点、无头节点）都通过 WebSocket 连接，并在握手时声明其**角色** + **作用域**。

## 传输

- WebSocket，带有 JSON 载荷的文本帧。
- 第一帧**必须**是 `connect` 请求。

## 握手（连接）

Gateway → 客户端（连接前挑战）：

```json
{
  "type": "event",
  "event": "connect.challenge",
  "payload": { "nonce": "…", "ts": 1737264000000 }
}
```

客户端 → Gateway：

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

Gateway → 客户端：

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

## 帧格式

- **请求**：`{type:"req", id, method, params}`
- **响应**：`{type:"res", id, ok, payload|error}`
- **事件**：`{type:"event", event, payload, seq?, stateVersion?}`

有副作用的操作需要**幂等性密钥**（参见架构）。

## 角色和作用域

### 角色

- `operator` = 控制平面客户端（CLI/UI/自动化）。
- `node` = 功能主机（camera/screen/canvas/system.run）。

### 作用域（operator）

通用作用域：

- `operator.read`
- `operator.write`
- `operator.admin`
- `operator.approvals`
- `operator.pairing`

### 功能/命令/权限（node）

节点在连接时声明功能声明：

- `caps`：高级功能类别。
- `commands`：invoke 的命令允许列表。
- `permissions`：细粒度开关（例如 `screen.record`、`camera.capture`）。

Gateway 将这些视为**声明**并强制执行服务端允许列表。

## 在线状态

- `system-presence` 返回按设备身份键入的条目。
- 在线状态条目包括 `deviceId`、`roles` 和 `scopes`，因此即使设备同时以 **operator** 和 **node** 身份连接，UI 也可以为每个设备显示单行。

### 节点辅助方法

- 节点可以调用 `skills.bins` 来获取当前技能可执行文件列表，以进行自动允许检查。

## 执行批准

- 当执行请求需要批准时，gateway 会广播 `exec.approval.requested`。
- Operator 客户端通过调用 `exec.approval.resolve` 来解决（需要 `operator.approvals` 作用域）。

## 版本控制

- `PROTOCOL_VERSION` 位于 `src/gateway/protocol/schema.ts` 中。
- 客户端发送 `minProtocol` + `maxProtocol`；服务器会拒绝不匹配的版本。
- 架构和模型从 TypeBox 定义生成：
  - `pnpm protocol:gen`
  - `pnpm protocol:gen:swift`
  - `pnpm protocol:check`

## 身份验证

- 如果设置了 `OPENCLAW_GATEWAY_TOKEN`（或 `--token`），`connect.params.auth.token` 必须匹配，否则 socket 将关闭。
- 配对后，Gateway 会颁发一个**设备令牌**，其作用域限于连接角色 + 作用域。它在 `hello-ok.auth.deviceToken` 中返回，客户端应持久保存该令牌以供将来连接使用。
- 设备令牌可以通过 `device.token.rotate` 和 `device.token.revoke` 轮换/撤销（需要 `operator.pairing` 作用域）。

## 设备身份和配对

- 节点应包括从密钥对指纹派生的稳定设备身份（`device.id`）。
- Gateway 会为每个设备 + 角色颁发令牌。
- 除非启用了本地自动批准，否则新设备 ID 需要配对批准。
- **本地**连接包括环回地址和 gateway 主机自己的 tailnet 地址（因此同主机 tailnet 绑定仍然可以自动批准）。
- 所有 WS 客户端必须在 `connect` 期间包括 `device` 身份（operator + node）。只有当启用了 `gateway.controlUi.allowInsecureAuth`（或用于紧急访问的 `gateway.controlUi.dangerouslyDisableDeviceAuth`）时，控制 UI 才能省略它。
- 非本地连接必须签名服务器提供的 `connect.challenge` nonce。

## TLS 和证书锁定

- WS 连接支持 TLS。
- 客户端可以选择锁定 gateway 证书指纹（参见 `gateway.tls` 配置以及 `gateway.remote.tlsFingerprint` 或 CLI `--tls-fingerprint`）。

## 范围

此协议暴露**完整的 gateway API**（状态、频道、模型、聊天、代理、会话、节点、批准等）。确切的接口由 `src/gateway/protocol/schema.ts` 中的 TypeBox 架构定义。
