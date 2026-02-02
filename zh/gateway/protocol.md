---
summary: "Gateway WebSocket 协议：握手、帧与版本"
read_when:
  - 实现或更新 gateway WS 客户端
  - 排查协议不匹配或连接失败
  - 重新生成协议 schema/models
title: "网关协议（WebSocket）"
---

# 网关协议（WebSocket）

Gateway WS 协议是 OpenClaw 的**单一控制平面 + node 传输**。
所有客户端（CLI、web UI、macOS app、iOS/Android nodes、headless
nodes）都通过 WebSocket 连接，并在握手时声明其**role** + **scope**。

## 传输

- WebSocket，文本帧承载 JSON。
- 首帧**必须**是 `connect` 请求。

## 握手（connect）

Gateway → Client（预连接 challenge）：

```json
{
  "type": "event",
  "event": "connect.challenge",
  "payload": { "nonce": "…", "ts": 1737264000000 }
}
```

Client → Gateway：

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

Gateway → Client：

```json
{
  "type": "res",
  "id": "…",
  "ok": true,
  "payload": { "type": "hello-ok", "protocol": 3, "policy": { "tickIntervalMs": 15000 } }
}
```

当发放 device token 时，`hello-ok` 还包含：

```json
{
  "auth": {
    "deviceToken": "…",
    "role": "operator",
    "scopes": ["operator.read", "operator.write"]
  }
}
```

### Node 示例

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

- **Request**：`{type:"req", id, method, params}`  
- **Response**：`{type:"res", id, ok, payload|error}`  
- **Event**：`{type:"event", event, payload, seq?, stateVersion?}`

有副作用的方法需要**幂等键**（参见 schema）。

## Roles + scopes

### Roles
- `operator` = 控制平面客户端（CLI/UI/automation）。
- `node` = 能力宿主（camera/screen/canvas/system.run）。

### Scopes（operator）
常见 scopes：
- `operator.read`
- `operator.write`
- `operator.admin`
- `operator.approvals`
- `operator.pairing`

### Caps/commands/permissions（node）
Nodes 在 connect 时声明能力：
- `caps`：高层能力分类。
- `commands`：可 invoke 的命令 allowlist。
- `permissions`：细粒度开关（如 `screen.record`、`camera.capture`）。

Gateway 将这些视为**声明**并在服务端执行 allowlist。

## Presence

- `system-presence` 返回按设备身份分组的条目。
- Presence 条目包含 `deviceId`、`roles` 与 `scopes`，使 UI 能在设备同时以 **operator** 与 **node** 连接时显示单行。

### Node helper methods

- Nodes 可调用 `skills.bins` 以获取当前 skill 可执行文件列表，用于自动 allow 检查。

## Exec approvals

- 当 exec 请求需要审批时，gateway 会广播 `exec.approval.requested`。
- Operator 客户端通过 `exec.approval.resolve` 处理（需要 `operator.approvals` scope）。

## 版本

- `PROTOCOL_VERSION` 位于 `src/gateway/protocol/schema.ts`。
- 客户端发送 `minProtocol` + `maxProtocol`；服务端拒绝不匹配。
- Schemas + models 从 TypeBox 定义生成：
  - `pnpm protocol:gen`
  - `pnpm protocol:gen:swift`
  - `pnpm protocol:check`

## Auth

- 若设置 `OPENCLAW_GATEWAY_TOKEN`（或 `--token`），`connect.params.auth.token`
  必须匹配，否则 socket 会关闭。
- 配对后，Gateway 发放**device token**，与连接 role + scopes 绑定。它会在 `hello-ok.auth.deviceToken` 返回，客户端应持久化以便后续连接使用。
- 可通过 `device.token.rotate` 与 `device.token.revoke` 轮换/吊销 device tokens（需 `operator.pairing` scope）。

## 设备身份 + 配对

- Nodes 应包含稳定的设备身份（`device.id`），源自 keypair 指纹。
- Gateway 为每个设备 + role 发放 tokens。
- 新 device ID 需配对审批，除非启用本地自动审批。
- **本地**连接包括 loopback 与 gateway 主机自身的 tailnet 地址（因此同机 tailnet bind 仍可自动审批）。
- 所有 WS 客户端在 `connect` 时必须包含 `device` 身份（operator + node）。
  仅当启用 `gateway.controlUi.allowInsecureAuth`
  （或 `gateway.controlUi.dangerouslyDisableDeviceAuth` 用于紧急场景）时，Control UI 可省略。
- 非本地连接必须对服务器提供的 `connect.challenge` nonce 进行签名。

## TLS + pinning

- 支持 WS 的 TLS。
- 客户端可选固定 gateway 证书指纹（见 `gateway.tls` 配置与 `gateway.remote.tlsFingerprint` 或 CLI `--tls-fingerprint`）。

## 作用域

该协议暴露**完整 gateway API**（status、channels、models、chat、agent、sessions、nodes、approvals 等）。确切面由 `src/gateway/protocol/schema.ts` 中的 TypeBox schemas 定义。
