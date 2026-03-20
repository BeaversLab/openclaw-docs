---
summary: "TypeBox schemas as the single source of truth for the gateway protocol"
read_when:
  - Updating protocol schemas or codegen
title: "TypeBox"
---

# TypeBox as protocol source of truth

Last updated: 2026-01-10

TypeBox is a TypeScript-first schema library. We use it to define the **Gateway
WebSocket protocol** (handshake, request/response, server events). Those schemas
drive **runtime validation**, **JSON Schema export**, and **Swift codegen** for
the macOS app. One source of truth; everything else is generated.

If you want the higher-level protocol context, start with
[Gateway architecture](/zh-Hant/concepts/architecture).

## Mental model (30 seconds)

Every Gateway WS message is one of three frames:

- **Request**: `{ type: "req", id, method, params }`
- **Response**: `{ type: "res", id, ok, payload | error }`
- **Event**: `{ type: "event", event, payload, seq?, stateVersion? }`

The first frame **must** be a `connect` request. After that, clients can call
methods (e.g. `health`, `send`, `chat.send`) and subscribe to events (e.g.
`presence`, `tick`, `agent`).

Connection flow (minimal):

```
Client                    Gateway
  |---- req:connect -------->|
  |<---- res:hello-ok --------|
  |<---- event:tick ----------|
  |---- req:health ---------->|
  |<---- res:health ----------|
```

Common methods + events:

| Category  | Examples                                                  | Notes                              |
| --------- | --------------------------------------------------------- | ---------------------------------- |
| Core      | `connect`, `health`, `status`                             | `connect` must be first            |
| Messaging | `send`, `poll`, `agent`, `agent.wait`                     | side-effects need `idempotencyKey` |
| Chat      | `chat.history`, `chat.send`, `chat.abort`, `chat.inject`  | WebChat uses these                 |
| Sessions  | `sessions.list`, `sessions.patch`, `sessions.delete`      | session admin                      |
| Nodes     | `node.list`, `node.invoke`, `node.pair.*`                 | Gateway WS + node actions          |
| Events    | `tick`, `presence`, `agent`, `chat`, `health`, `shutdown` | 伺服器推送                         |

Authoritative list lives in `src/gateway/server.ts` (`METHODS`, `EVENTS`).

## Schemas 所在位置

- Source: `src/gateway/protocol/schema.ts`
- Runtime validators (AJV): `src/gateway/protocol/index.ts`
- 伺服器握手 + 方法分派：`src/gateway/server.ts`
- Node 客戶端：`src/gateway/client.ts`
- 產生的 JSON Schema：`dist/protocol.schema.json`
- 產生的 Swift 模型：`apps/macos/Sources/OpenClawProtocol/GatewayModels.swift`

## 目前管線

- `pnpm protocol:gen`
  - 將 JSON Schema (draft‑07) 寫入 `dist/protocol.schema.json`
- `pnpm protocol:gen:swift`
  - 生成 Swift gateway 模型
- `pnpm protocol:check`
  - 執行這兩個生成器並驗證輸出已提交

## Schemas 如何在執行時期被使用

- **伺服器端**：每個傳入的幀都會經過 AJV 驗證。握手僅接受參數符合 `ConnectParams` 的 `connect` 請求。
- **客戶端**：JS 客戶端會在使用事件和回應幀之前對其進行驗證。
- **方法表面**：Gateway 在 `hello-ok` 中通告支援的 `methods` 和 `events`。

## 範例幀

連線 (第一則訊息)：

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

Hello-ok 回應：

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

請求 + 回應：

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

## 最簡客戶端 (Node.js)

最小可用流程：連線 + 健康檢查。

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

## 實作範例：端對端新增方法

範例：新增一個傳回 `{ ok: true, text }` 的新 `system.echo` 請求。

1. **Schema (唯一真實來源)**

新增至 `src/gateway/protocol/schema.ts`：

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

將兩者都新增至 `ProtocolSchemas` 並匯出型別：

```ts
  SystemEchoParams: SystemEchoParamsSchema,
  SystemEchoResult: SystemEchoResultSchema,
```

```ts
export type SystemEchoParams = Static<typeof SystemEchoParamsSchema>;
export type SystemEchoResult = Static<typeof SystemEchoResultSchema>;
```

2. **驗證**

在 `src/gateway/protocol/index.ts` 中，匯出一個 AJV 驗證器：

```ts
export const validateSystemEchoParams = ajv.compile<SystemEchoParams>(SystemEchoParamsSchema);
```

3. **伺服器行為**

在 `src/gateway/server-methods/system.ts` 中新增處理程式：

```ts
export const systemHandlers: GatewayRequestHandlers = {
  "system.echo": ({ params, respond }) => {
    const text = String(params.text ?? "");
    respond(true, { ok: true, text });
  },
};
```

在 `src/gateway/server-methods.ts` 中註冊 (已合併 `systemHandlers`)，
然後將 `"system.echo"` 新增至 `METHODS` 中的 `src/gateway/server.ts`。

4. **重新生成**

```bash
pnpm protocol:check
```

5. **測試 + 文件**

在 `src/gateway/server.*.test.ts` 中新增伺服器測試並在文件中註記該方法。

## Swift codegen 行為

Swift 生成器會輸出：

- 具有 `req`、`res`、`event` 和 `unknown` 案例 (cases) 的 `GatewayFrame` 列舉
- 強型別 payload structs/enums
- `ErrorCode` 值和 `GATEWAY_PROTOCOL_VERSION`

未知的 frame types 會保留為原始 payload 以維持向前相容性。

## 版本控制 + 相容性

- `PROTOCOL_VERSION` 位於 `src/gateway/protocol/schema.ts` 中。
- 客戶端發送 `minProtocol` + `maxProtocol`；伺服器會拒絕不相符的請求。
- Swift 模型會保留未知的 frame types，以避免破壞舊版客戶端。

## Schema 模式與慣例

- 大多數物件使用 `additionalProperties: false` 來處理嚴格的 payloads。
- `NonEmptyString` 是 ID 和方法/事件名稱的預設值。
- 頂層 `GatewayFrame` 在 `type` 上使用鑑別器 (**discriminator**)。
- 具有副作用的方法通常在參數中需要 `idempotencyKey`
  （例如：`send`、`poll`、`agent`、`chat.send`）。
- `agent` 接受可選的 `internalEvents` 用於運行時生成的編排上下文
  （例如子代理/ cron 任務完成移交）；請將其視為內部 API 表面。

## 即時 Schema JSON

生成的 JSON Schema 位於儲存庫的 `dist/protocol.schema.json`。已發布的
原始檔案通常可在以下位置取得：

- [https://raw.githubusercontent.com/openclaw/openclaw/main/dist/protocol.schema.json](https://raw.githubusercontent.com/openclaw/openclaw/main/dist/protocol.schema.json)

## 當您變更 schema 時

1. 更新 TypeBox schema。
2. 執行 `pnpm protocol:check`。
3. 提交重新生成的 schema 與 Swift 模型。

import footerZhHant from "/components/footer/zh-Hant.mdx";

<footerZhHant />
