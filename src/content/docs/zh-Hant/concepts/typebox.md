---
summary: "TypeBox 結構作為 Gateway 協定的唯一真實來源"
read_when:
  - Updating protocol schemas or codegen
title: "TypeBox"
---

# TypeBox 作為協定的真實來源

Last updated: 2026-01-10

TypeBox 是一個以 TypeScript 為優先的結構描述庫。我們使用它來定義 **Gateway WebSocket 協定**（handshake、request/response、server events）。這些結構描述驅動了 **執行時期驗證**、**JSON Schema 匯出**，以及 macOS 應用程式的 **Swift 程式碼生成**。一個真實來源；其他一切都是生成的。

如果您想要更高階的協定背景，請從 [Gateway architecture](/zh-Hant/concepts/architecture) 開始。

## 心智模型（30 秒）

每個 Gateway WS 訊息都是以下三種幀之一：

- **Request**：`{ type: "req", id, method, params }`
- **Response**：`{ type: "res", id, ok, payload | error }`
- **Event**：`{ type: "event", event, payload, seq?, stateVersion? }`

第一個幀 **必須** 是 `connect` 請求。在此之後，客戶端可以呼叫方法（例如 `health`、`send`、`chat.send`）並訂閱事件（例如 `presence`、`tick`、`agent`）。

連線流程（最小化）：

```
Client                    Gateway
  |---- req:connect -------->|
  |<---- res:hello-ok --------|
  |<---- event:tick ----------|
  |---- req:health ---------->|
  |<---- res:health ----------|
```

常見方法 + 事件：

| 類別     | 範例                                                      | 備註                        |
| -------- | --------------------------------------------------------- | --------------------------- |
| 核心     | `connect`、`health`、`status`                             | `connect` 必須是第一個      |
| 訊息     | `send`、`poll`、`agent`、`agent.wait`                     | 副作用需要 `idempotencyKey` |
| 聊天     | `chat.history`、`chat.send`、`chat.abort`、`chat.inject`  | WebChat 使用這些            |
| 工作階段 | `sessions.list`、`sessions.patch`、`sessions.delete`      | 工作階段管理                |
| 節點     | `node.list`、`node.invoke`、`node.pair.*`                 | Gateway WS + 節點動作       |
| 事件     | `tick`、`presence`、`agent`、`chat`、`health`、`shutdown` | 伺服器推送                  |

權威清單位於 `src/gateway/server.ts`（`METHODS`、`EVENTS`）。

## Schema 的存放位置

- 來源：`src/gateway/protocol/schema.ts`
- Runtime validators (AJV): `src/gateway/protocol/index.ts`
- Server handshake + method dispatch: `src/gateway/server.ts`
- Node client: `src/gateway/client.ts`
- Generated JSON Schema: `dist/protocol.schema.json`
- Generated Swift models: `apps/macos/Sources/OpenClawProtocol/GatewayModels.swift`

## Current pipeline

- `pnpm protocol:gen`
  - writes JSON Schema (draft‑07) to `dist/protocol.schema.json`
- `pnpm protocol:gen:swift`
  - generates Swift gateway models
- `pnpm protocol:check`
  - runs both generators and verifies the output is committed

## How the schemas are used at runtime

- **Server side**: every inbound frame is validated with AJV. The handshake only
  accepts a `connect` request whose params match `ConnectParams`.
- **Client side**: the JS client validates event and response frames before
  using them.
- **方法介面**：Gateway 會在 `hello-ok` 中公告支援的 `methods` 和
  `events`。

## 範例幀

連線（第一則訊息）：

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

## 最小化客戶端 (Node.js)

最小可用的流程：連線 + 健康檢查。

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

範例：新增一個會回傳 `{ ok: true, text }` 的 `system.echo` 請求。

1. **Schema（單一真實來源）**

新增至 `src/gateway/protocol/schema.ts`：

```ts
export const SystemEchoParamsSchema = Type.Object({ text: NonEmptyString }, { additionalProperties: false });

export const SystemEchoResultSchema = Type.Object({ ok: Type.Boolean(), text: NonEmptyString }, { additionalProperties: false });
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

在 `src/gateway/server-methods/system.ts` 中新增處理常式：

```ts
export const systemHandlers: GatewayRequestHandlers = {
  "system.echo": ({ params, respond }) => {
    const text = String(params.text ?? "");
    respond(true, { ok: true, text });
  },
};
```

在 `src/gateway/server-methods.ts` 中註冊它（已合併 `systemHandlers`），
然後將 `"system.echo"` 新增到 `src/gateway/server.ts` 中的 `METHODS`。

4. **重新生成**

```exec
pnpm protocol:check
```

5. **測試 + 文件**

在 `src/gateway/server.*.test.ts` 中新增伺服器測試，並在文件中記錄該方法。

## Swift 程式碼生成行為

Swift 生成器會輸出：

- 帶有 `req`、`res`、`event` 和 `unknown` 案例的 `GatewayFrame` 枚舉
- 強型別 payload 結構體/枚舉
- `ErrorCode` 值和 `GATEWAY_PROTOCOL_VERSION`

未知的框架類型會以原始 payload 形式保留，以實現前向相容性。

## 版本控制 + 相容性

- `PROTOCOL_VERSION` 位於 `src/gateway/protocol/schema.ts` 中。
- 客戶端發送 `minProtocol` + `maxProtocol`；伺服器會拒絕不匹配的請求。
- Swift 模型會保留未知的幀類型，以避免破壞舊版客戶端。

## Schema 模式與慣例

- 大多數物件使用 `additionalProperties: false` 來定義嚴格的承載。
- `NonEmptyString` 是 ID 和方法/事件名稱的預設值。
- 頂層 `GatewayFrame` 在 `type` 上使用 **判別器 (discriminator)**。
- 具有副作用的函式通常需要在參數中包含 `idempotencyKey`
  （例如：`send`、`poll`、`agent`、`chat.send`）。
- `agent` 接受可選的 `internalEvents` 以用於執行時生成的編排上下文
  （例如子代理/cron 任務完成交接）；將此視為內部 API 介面。

## 即時 Schema JSON

生成的 JSON Schema 位於 repo 中的 `dist/protocol.schema.json`。已
發佈的原始檔案通常可於以下位置取得：

- [https://raw.githubusercontent.com/openclaw/openclaw/main/dist/protocol.schema.json](https://raw.githubusercontent.com/openclaw/openclaw/main/dist/protocol.schema.json)

## 當您變更 Schema 時

1. 更新 TypeBox Schema。
2. 執行 `pnpm protocol:check`。
3. 提交重新生成的 Schema 與 Swift 模型。
