---
summary: "作为网关协议唯一事实来源的 TypeBox 模式"
read_when:
  - Updating protocol schemas or codegen
title: "TypeBox"
---

# TypeBox 作为协议的事实来源

最后更新：2026-01-10

TypeBox 是一个优先考虑 TypeScript 的模式库。我们使用它来定义 **Gateway
WebSocket 协议**（握手、请求/响应、服务器事件）。这些模式驱动了 **运行时验证**、
**JSON Schema 导出**以及 macOS 应用的 **Swift 代码生成**。唯一的事实来源；其他一切都是生成的。

如果您需要更高级别的协议上下文，请从
[Gateway 架构](/zh/en/concepts/architecture)开始。

## 思维模型（30 秒）

每个 Gateway WS 消息都是以下三种帧之一：

- **请求 (Request)**：`{ type: "req", id, method, params }`
- **响应 (Response)**：`{ type: "res", id, ok, payload | error }`
- **事件 (Event)**：`{ type: "event", event, payload, seq?, stateVersion? }`

第一个帧 **必须** 是 `connect` 请求。之后，客户端可以调用方法
（例如 `health`、`send`、`chat.send`）并订阅事件
（例如 `presence`、`tick`、`agent`）。

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

| 类别  | 示例                                                  | 备注                              |
| --------- | --------------------------------------------------------- | ---------------------------------- |
| 核心      | `connect`, `health`, `status`                             | `connect` 必须在第一位            |
| 消息传递 | `send`, `poll`, `agent`, `agent.wait`                     | 副作用需要 `idempotencyKey` |
| 聊天      | `chat.history`, `chat.send`, `chat.abort`, `chat.inject`  | WebChat 使用这些                 |
| 会话      | `sessions.list`, `sessions.patch`, `sessions.delete`      | 会话管理                      |
| 节点     | `node.list`, `node.invoke`, `node.pair.*`                 | Gateway WS + 节点操作          |
| 事件    | `tick`, `presence`, `agent`, `chat`, `health`, `shutdown` | 服务端推送                        |

权威列表位于 `src/gateway/server.ts` (`METHODS`, `EVENTS`)。

## Schema 的位置

- 源码：`src/gateway/protocol/schema.ts`
- 运行时验证器 (AJV)：`src/gateway/protocol/index.ts`
- 服务端握手 + 方法分发：`src/gateway/server.ts`
- Node 客户端：`src/gateway/client.ts`
- 生成的 JSON Schema：`dist/protocol.schema.json`
- 生成的 Swift 模型：`apps/macos/Sources/OpenClawProtocol/GatewayModels.swift`

## 当前流程

- `pnpm protocol:gen`
  - 将 JSON Schema (draft‑07) 写入 `dist/protocol.schema.json`
- `pnpm protocol:gen:swift`
  - 生成 Swift gateway 模型
- `pnpm protocol:check`
  - 运行这两个生成器并验证输出已提交

## Schema 在运行时如何使用

- **服务端**：每个入站帧都通过 AJV 进行验证。握手仅
  接受参数匹配 `ConnectParams` 的 `connect` 请求。
- **客户端**：JS 客户端在使用之前会验证事件和响应帧
  。
- **方法表面**：Gateway 宣告支持的 `methods` 和
  `events` 位于 `hello-ok`。

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

## 最小客户端

最小的可用流程：连接 + 健康检查。

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

## 实战示例：端到端添加一个方法

示例：添加一个新的 `system.echo` 请求，该请求返回 `{ ok: true, text }`。

1. **Schema（单一事实来源）**

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

将两者都添加到 `ProtocolSchemas` 并导出类型：

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
然后在 `src/gateway/server.ts` 中的 `METHODS` 添加 `"system.echo"`。

4. **重新生成**

```bash
pnpm protocol:check
```

5. **测试 + 文档**

在 `src/gateway/server.*.test.ts` 中添加服务器测试，并在文档中记录该方法。

## Swift 代码生成行为

Swift 生成器会生成：

- 带有 `req`、`res`、`event` 和 `unknown` case 的 `GatewayFrame` 枚举
- 强类型的 payload 结构体/枚举
- `ErrorCode` 值和 `GATEWAY_PROTOCOL_VERSION`

未知的帧类型被保留为原始 payload 以确保前向兼容性。

## 版本控制 + 兼容性

- `PROTOCOL_VERSION` 位于 `src/gateway/protocol/schema.ts`。
- 客户端发送 `minProtocol` + `maxProtocol`；服务器拒绝不匹配的请求。
- Swift 模型保留未知的帧类型以避免破坏旧版客户端。

## Schema 模式和约定

- 大多数对象使用 `additionalProperties: false` 来定义严格的 payload。
- `NonEmptyString` 是 ID 和方法/事件名称的默认类型。
- 顶层的 `GatewayFrame` 在 `type` 上使用**判别符 (discriminator)**。
- 具有副作用的操作通常需要在参数中包含 `idempotencyKey`
  （例如：`send`、`poll`、`agent`、`chat.send`）。
- `agent` 接受可选的 `internalEvents`，用于运行时生成的编排上下文
  （例如子代理/cron 任务完成交接）；请将其视为内部 API 表面。

## 实时模式 JSON

生成的 JSON Schema 位于仓库中的 `dist/protocol.schema.json`。
发布的原始文件通常可在以下位置获取：

- [https://raw.githubusercontent.com/openclaw/openclaw/main/dist/protocol.schema.json](https://raw.githubusercontent.com/openclaw/openclaw/main/dist/protocol.schema.json)

## 更改模式时

1. 更新 TypeBox 模式。
2. 运行 `pnpm protocol:check`。
3. 提交重新生成的模式和 Swift 模型。

import zh from '/components/footer/zh.mdx';

<zh />
