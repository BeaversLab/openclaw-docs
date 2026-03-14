---
summary: "TypeBox schemas as the single source of truth for the gateway protocol"
read_when:
  - Updating protocol schemas or codegen
title: "TypeBox"
---

# TypeBox 作为协议的事实来源

最后更新：2026-01-10

TypeBox 是一个优先考虑 TypeScript 的模式库。我们使用它来定义 **Gateway 网关
WebSocket 协议**（握手、请求/响应、服务器事件）。这些模式驱动了 **运行时验证**、
**JSON Schema 导出**以及 macOS 应用的 **Swift 代码生成**。唯一的事实来源；其他一切都是生成的。

如果您希望了解更高层的协议上下文，请从
[Gateway(网关) 架构](/zh/concepts/architecture) 开始。

## 思维模型（30 秒）

每个 Gateway 网关 WS 消息都是以下三种帧之一：

- **请求**：`{ type: "req", id, method, params }`
- **响应**：`{ type: "res", id, ok, payload | error }`
- **事件**：`{ type: "event", event, payload, seq?, stateVersion? }`

第一个帧**必须**是一个 `connect` 请求。之后，客户端可以调用方法（例如 `health`、`send`、`chat.send`）并订阅事件（例如
`presence`、`tick`、`agent`）。

连接流程（最简版）：

```
Client                    Gateway
  |---- req:connect -------->|
  |<---- res:hello-ok --------|
  |<---- event:tick ----------|
  |---- req:health ---------->|
  |<---- res:health ----------|
```

常用方法 + 事件：

| 类别     | 示例                                                      | 备注                        |
| -------- | --------------------------------------------------------- | --------------------------- |
| 核心     | `connect`、`health`、`status`                             | `connect` 必须是第一个      |
| 消息传递 | `send`、`poll`、`agent`、`agent.wait`                     | 副作用需要 `idempotencyKey` |
| 聊天     | `chat.history`、`chat.send`、`chat.abort`、`chat.inject`  | WebChat 使用这些            |
| 会话     | `sessions.list`、`sessions.patch`、`sessions.delete`      | 会话管理                    |
| 节点     | `node.list`、`node.invoke`、`node.pair.*`                 | Gateway(网关) WS + 节点操作 |
| 事件     | `tick`、`presence`、`agent`、`chat`、`health`、`shutdown` | 服务器推送                  |

权威列表位于 `src/gateway/server.ts`（`METHODS`、`EVENTS`）中。

## 模式所在的位置

- 源代码：`src/gateway/protocol/schema.ts`
- 运行时验证器 (AJV)：`src/gateway/protocol/index.ts`
- 服务器握手 + 方法分发：`src/gateway/server.ts`
- 节点客户端：`src/gateway/client.ts`
- 生成的 JSON Schema：`dist/protocol.schema.json`
- 生成的 Swift 模型：`apps/macos/Sources/OpenClawProtocol/GatewayModels.swift`

## 当前流程

- `pnpm protocol:gen`
  - 将 JSON Schema (draft‑07) 写入 `dist/protocol.schema.json`
- `pnpm protocol:gen:swift`
  - 生成 Swift 网关模型
- `pnpm protocol:check`
  - 运行这两个生成器并验证输出是否已提交

## 模式如何在运行时使用

- **服务器端**：每个入站帧都通过 AJV 进行验证。握手仅接受参数与 `ConnectParams` 匹配的 `connect` 请求。
- **客户端**：JS 客户端在使用事件和响应帧之前会对其进行验证。
- **Method surface**：Gateway(网关) 在 `hello-ok` 中通告支持的 `methods` 和 `events`。

## 示例帧

连接（第一条消息）：

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

## Minimal client (Node.js)

最小可用流程：连接 + 健康检查。

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

## 演练示例：端到端添加方法

示例：添加一个新的 `system.echo` 请求，该请求返回 `{ ok: true, text }`。

1. **模式（单一真实源）**

添加到 `src/gateway/protocol/schema.ts`：

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

将两者添加到 `ProtocolSchemas` 并导出类型：

```ts
  SystemEchoParams: SystemEchoParamsSchema,
  SystemEchoResult: SystemEchoResultSchema,
```

```ts
export type SystemEchoParams = Static<typeof SystemEchoParamsSchema>;
export type SystemEchoResult = Static<typeof SystemEchoResultSchema>;
```

2. **验证**

在 `src/gateway/protocol/index.ts` 中，导出一个 AJV 验证器：

```ts
export const validateSystemEchoParams = ajv.compile<SystemEchoParams>(SystemEchoParamsSchema);
```

3. **服务器行为**

在 `src/gateway/server-methods/system.ts` 中添加一个处理程序：

```ts
export const systemHandlers: GatewayRequestHandlers = {
  "system.echo": ({ params, respond }) => {
    const text = String(params.text ?? "");
    respond(true, { ok: true, text });
  },
};
```

在 `src/gateway/server-methods.ts` 中注册它（已合并 `systemHandlers`），
然后在 `src/gateway/server.ts` 中将 `"system.echo"` 添加到 `METHODS`。

4. **重新生成**

```bash
pnpm protocol:check
```

5. **测试 + 文档**

在 `src/gateway/server.*.test.ts` 中添加服务器测试，并在文档中注明该方法。

## Swift 代码生成行为

Swift 生成器生成：

- 带有 `req`、`res`、`event` 和 `unknown` case 的 `GatewayFrame` 枚举
- 强类型负载结构体/枚举
- `ErrorCode` 值和 `GATEWAY_PROTOCOL_VERSION`

未知帧类型作为原始负载保留，以确保前向兼容性。

## 版本控制 + 兼容性

- `PROTOCOL_VERSION` 位于 `src/gateway/protocol/schema.ts` 中。
- 客户端发送 `minProtocol` + `maxProtocol`；服务器拒绝不匹配的情况。
- Swift 模型保留未知的帧类型，以避免破坏旧版客户端。

## Schema 模式和约定

- 大多数对象对严格的有效负载使用 `additionalProperties: false`。
- `NonEmptyString` 是 ID 和方法/事件名称的默认值。
- 顶层 `GatewayFrame` 在 `type` 上使用**鉴别器 (discriminator)**。
- 具有副作用的方法通常在参数中需要一个 `idempotencyKey`
  （例如：`send`、`poll`、`agent`、`chat.send`）。
- `agent` 接受可选的 `internalEvents` 用于运行时生成的编排上下文
  （例如子代理/定时任务完成切换）；将此视为内部 API 接口。

## 实时 Schema JSON

生成的 JSON Schema 位于仓库的 `dist/protocol.schema.json` 中。
发布的原始文件通常位于：

- [https://raw.githubusercontent.com/openclaw/openclaw/main/dist/protocol.schema.json](https://raw.githubusercontent.com/openclaw/openclaw/main/dist/protocol.schema.json)

## 更改 Schema 时

1. 更新 TypeBox schemas。
2. 运行 `pnpm protocol:check`。
3. 提交重新生成的 Schema + Swift 模型。

import zh from '/components/footer/zh.mdx';

<zh />
