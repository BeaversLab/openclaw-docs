---
summary: "以 TypeBox schemas 作为 Gateway 协议的单一事实来源"
read_when:
  - 更新协议 schema 或代码生成
title: "TypeBox"
---

# TypeBox 作为协议真相源

最后更新：2026-01-10

TypeBox 是 TypeScript 优先的 schema 库。我们用它定义 **Gateway WebSocket 协议**（握手、请求/响应、服务器事件）。这些 schemas 驱动**运行时校验**、**JSON Schema 导出**以及 macOS app 的 **Swift 代码生成**。单一事实来源，其它都由它生成。

如需更高层协议背景，先看
[Gateway architecture](/zh/concepts/architecture)。

## 心智模型（30 秒）

每条 Gateway WS 消息都是三种 frame 之一：

- **Request**：`{ type: "req", id, method, params }`
- **Response**：`{ type: "res", id, ok, payload | error }`
- **Event**：`{ type: "event", event, payload, seq?, stateVersion? }`

首帧**必须**是 `connect` 请求。之后客户端可调用方法（如 `health`、`send`、`chat.send`）并订阅事件（如 `presence`、`tick`、`agent`）。

连接流程（最小）：

```
Client                    Gateway
  |---- req:connect -------->|
  |<---- res:hello-ok --------|
  |<---- event:tick ----------|
  |---- req:health ---------->|
  |<---- res:health ----------|
```

常见方法 + 事件：

| Category  | Examples                                                  | Notes               |
| --------- | --------------------------------------------------------- | -------------------- |
| Core      | `connect`, `health`, `status`                             | `connect` 必须是第一条 |
| Messaging | `send`, `poll`, `agent`, `agent.wait`                     | 有副作用需要 `idempotencyKey` |
| Chat      | `chat.history`, `chat.send`, `chat.abort`, `chat.inject`  | WebChat 使用          |
| Sessions  | `sessions.list`, `sessions.patch`, `sessions.delete`      | 会话管理             |
| Nodes     | `node.list`, `node.invoke`, `node.pair.*`                 | Gateway WS + node 操作  |
| Events    | `tick`, `presence`, `agent`, `chat`, `health`, `shutdown` | 服务器推送           |

权威列表在 `src/gateway/server.ts`（`METHODS`, `EVENTS`）。

## Schemas 位置

- Source：`src/gateway/protocol/schema.ts`
- Runtime validators（AJV）：`src/gateway/protocol/index.ts`
- Server 握手 + 方法分发：`src/gateway/server.ts`
- Node client：`src/gateway/client.ts`
- 生成的 JSON Schema：`dist/protocol.schema.json`
- 生成的 Swift models：`apps/macos/Sources/OpenClawProtocol/GatewayModels.swift`

## 当前流水线

- `pnpm protocol:gen`
  - 写入 JSON Schema（draft‑07）到 `dist/protocol.schema.json`
- `pnpm protocol:gen:swift`
  - 生成 Swift gateway models
- `pnpm protocol:check`
  - 运行两者并验证输出已提交

## 运行时如何使用 schemas

- **Server 侧**：每个入站 frame 都用 AJV 校验。握手只接受 params 匹配 `ConnectParams` 的 `connect` 请求。
- **Client 侧**：JS client 在使用前校验事件与响应 frame。
- **方法面**：Gateway 在 `hello-ok` 中公布支持的 `methods` 与 `events`。

## 示例 frames

Connect（第一条消息）：

```json
{
  "type": "req",
  "id": "c1",
  "method": "connect",
  "params": {
    "minProtocol": 2,
    "maxProtocol": 2,
    "client": {
      "id": "openclaw-macos",
      "displayName": "macos",
      "version": "1.0.0",
      "platform": "macos 15.1",
      "mode": "ui",
      "instanceId": "A1B2"
    }
  }
}
```

Hello-ok 响应：

```json
{
  "type": "res",
  "id": "c1",
  "ok": true,
  "payload": {
    "type": "hello-ok",
    "protocol": 2,
    "server": { "version": "dev", "connId": "ws-1" },
    "features": { "methods": ["health"], "events": ["tick"] },
    "snapshot": {
      "presence": [],
      "health": {},
      "stateVersion": { "presence": 0, "health": 0 },
      "uptimeMs": 0
    },
    "policy": { "maxPayload": 1048576, "maxBufferedBytes": 1048576, "tickIntervalMs": 30000 }
  }
}
```

请求 + 响应：

```json
{ "type": "req", "id": "r1", "method": "health" }
```

```json
{ "type": "res", "id": "r1", "ok": true, "payload": { "ok": true } }
```

事件：

```json
{ "type": "event", "event": "tick", "payload": { "ts": 1730000000 }, "seq": 12 }
```

## 最小客户端（Node.js）

最小可用流程：connect + health。

```ts
import { WebSocket } from "ws";

const ws = new WebSocket("ws://127.0.0.1:18789");

ws.on("open", () => {
  ws.send(
    JSON.stringify({
      type: "req",
      id: "c1",
      method: "connect",
      params: {
        minProtocol: 3,
        maxProtocol: 3,
        client: {
          id: "cli",
          displayName: "example",
          version: "dev",
          platform: "node",
          mode: "cli",
        },
      },
    }),
  );
});

ws.on("message", (data) => {
  const msg = JSON.parse(String(data));
  if (msg.type === "res" && msg.id === "c1" && msg.ok) {
    ws.send(JSON.stringify({ type: "req", id: "h1", method: "health" }));
  }
  if (msg.type === "res" && msg.id === "h1") {
    console.log("health:", msg.payload);
    ws.close();
  }
});
```

## Worked example：端到端新增方法

示例：新增 `system.echo` 请求，返回 `{ ok: true, text }`。

1. **Schema（事实来源）**

在 `src/gateway/protocol/schema.ts` 中添加：

```ts
export const SystemEchoParamsSchema = Type.Object(
  { text: NonEmptyString },
  { additionalProperties: false },
);

export const SystemEchoResultSchema = Type.Object(
  { ok: Type.Boolean(), text: NonEmptyString },
  { additionalProperties: false },
);
```

将二者加入 `ProtocolSchemas` 并导出类型：

```ts
  SystemEchoParams: SystemEchoParamsSchema,
  SystemEchoResult: SystemEchoResultSchema,
```

```ts
export type SystemEchoParams = Static<typeof SystemEchoParamsSchema>;
export type SystemEchoResult = Static<typeof SystemEchoResultSchema>;
```

2. **Validation**

在 `src/gateway/protocol/index.ts` 中导出 AJV 校验器：

```ts
export const validateSystemEchoParams = ajv.compile<SystemEchoParams>(SystemEchoParamsSchema);
```

3. **Server 行为**

在 `src/gateway/server-methods/system.ts` 添加 handler：

```ts
export const systemHandlers: GatewayRequestHandlers = {
  "system.echo": ({ params, respond }) => {
    const text = String(params.text ?? "");
    respond(true, { ok: true, text });
  },
};
```

在 `src/gateway/server-methods.ts` 中注册（已合并 `systemHandlers`），然后在 `src/gateway/server.ts` 的 `METHODS` 中加入 `"system.echo"`。

4. **重新生成**

```bash
pnpm protocol:check
```

5. **Tests + docs**

在 `src/gateway/server.*.test.ts` 添加 server test，并在文档中注明该方法。

## Swift codegen 行为

Swift 生成器会输出：

- `GatewayFrame` enum，包含 `req`、`res`、`event` 与 `unknown` 分支
- 强类型 payload structs/enums
- `ErrorCode` 值与 `GATEWAY_PROTOCOL_VERSION`

未知 frame 类型会以原始 payload 保留，保证前向兼容。

## 版本与兼容

- `PROTOCOL_VERSION` 位于 `src/gateway/protocol/schema.ts`。
- 客户端发送 `minProtocol` + `maxProtocol`；服务端拒绝不匹配。
- Swift models 保留未知 frame 类型以避免破坏旧客户端。

## Schema 约定与模式

- 大多数对象使用 `additionalProperties: false` 保持严格 payload。
- `NonEmptyString` 用于 ID 与方法/事件名。
- 顶层 `GatewayFrame` 使用 `type` 作为**判别字段**。
- 有副作用的方法通常需要 params 中的 `idempotencyKey`
  （例如 `send`、`poll`、`agent`、`chat.send`）。

## Live schema JSON

生成的 JSON Schema 位于仓库 `dist/protocol.schema.json`。发布的原始文件通常可在以下地址获取：

- https://raw.githubusercontent.com/openclaw/openclaw/main/dist/protocol.schema.json

## 当你修改 schemas

1. 更新 TypeBox schemas。
2. 运行 `pnpm protocol:check`。
3. 提交重新生成的 schema + Swift models。
