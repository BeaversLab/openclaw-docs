---
summary: "TypeBox 結構描述作為 Gateway 協議的單一真實來源"
read_when:
  - Updating protocol schemas or codegen
title: "TypeBox"
---

# TypeBox 作為協議的真實來源

最後更新：2026-01-10

TypeBox 是一個以 TypeScript 為優先的結構描述庫。我們使用它來定義 **Gateway
WebSocket 協議**（交握、請求/回應、伺服器事件）。這些結構描述驅動 macOS 應用程式的**執行時期驗證**、**JSON Schema 匯出**以及 **Swift 程式碼生成**。單一真實來源；其他一切都由此產生。

如果您想要更高層級的協議背景，請從
[Gateway 架構](/en/concepts/architecture)開始。

## 心智模型（30 秒）

每個 Gateway WS 訊息都是以下三種框架之一：

- **請求**：`{ type: "req", id, method, params }`
- **回應**：`{ type: "res", id, ok, payload | error }`
- **事件**：`{ type: "event", event, payload, seq?, stateVersion? }`

第一個框架**必須**是 `connect` 請求。之後，用戶端可以呼叫方法（例如 `health`、`send`、`chat.send`）並訂閱事件（例如
`presence`、`tick`、`agent`）。

連線流程（最小）：

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
| 訊息傳遞 | `send`、`poll`、`agent`、`agent.wait`                     | 副作用需要 `idempotencyKey` |
| 聊天     | `chat.history`、`chat.send`、`chat.abort`、`chat.inject`  | WebChat 使用這些            |
| Sessions | `sessions.list`、`sessions.patch`、`sessions.delete`      | Session 管理                |
| 節點     | `node.list`、`node.invoke`、`node.pair.*`                 | Gateway WS + 節點操作       |
| 事件     | `tick`、`presence`、`agent`、`chat`、`health`、`shutdown` | 伺服器推送                  |

權威清單位於 `src/gateway/server.ts` (`METHODS`、`EVENTS`) 中。

## Schema 所在位置

- 來源：`src/gateway/protocol/schema.ts`
- 執行時期驗證器 (AJV)：`src/gateway/protocol/index.ts`
- 伺服器握手 + 方法分發：`src/gateway/server.ts`
- Node 客戶端：`src/gateway/client.ts`
- 生成的 JSON Schema：`dist/protocol.schema.json`
- 生成的 Swift 模型：`apps/macos/Sources/OpenClawProtocol/GatewayModels.swift`

## 目前流程

- `pnpm protocol:gen`
  - 將 JSON Schema (draft‑07) 寫入 `dist/protocol.schema.json`
- `pnpm protocol:gen:swift`
  - 生成 Swift gateway 模型
- `pnpm protocol:check`
  - 執行兩個生成器並驗證輸出是否已提交

## Schema 在執行時期的使用方式

- **伺服器端**：每個傳入框架都使用 AJV 進行驗證。握手僅接受參數符合 `ConnectParams` 的 `connect` 請求。
- **客戶端**：JS 客戶端會在使用事件和回應框架之前進行驗證。
- **方法介面**：Gateway 在 `hello-ok` 中通告支援的 `methods` 和 `events`。

## 範例框架

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

最小實用流程：連線 + 健康檢查。

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

## 實作範例：端到端新增方法

範例：新增一個傳回 `{ ok: true, text }` 的 `system.echo` 請求。

1. **Schema (單一真實來源)**

新增至 `src/gateway/protocol/schema.ts`：

```ts
export const SystemEchoParamsSchema = Type.Object({ text: NonEmptyString }, { additionalProperties: false });

export const SystemEchoResultSchema = Type.Object({ ok: Type.Boolean(), text: NonEmptyString }, { additionalProperties: false });
```

將兩者新增至 `ProtocolSchemas` 並匯出型別：

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

在 `src/gateway/server-methods/system.ts` 中新增處理器：

```ts
export const systemHandlers: GatewayRequestHandlers = {
  "system.echo": ({ params, respond }) => {
    const text = String(params.text ?? "");
    respond(true, { ok: true, text });
  },
};
```

在 `src/gateway/server-methods.ts` 中註冊（已合併 `systemHandlers`），
然後將 `"system.echo"` 加入 `METHODS` 中的 `src/gateway/server.ts`。

4. **重新生成**

```bash
pnpm protocol:check
```

5. **測試 + 文件**

在 `src/gateway/server.*.test.ts` 中新增伺服器測試，並在文件中註記該方法。

## Swift 程式碼生成行為

Swift 生成器會輸出：

- 包含 `req`、`res`、`event` 和 `unknown` case 的 `GatewayFrame` enum
- 強型別 payload structs/enums
- `ErrorCode` 值與 `GATEWAY_PROTOCOL_VERSION`

未知的 frame 類型會保留為原始 payload 以確保向後相容。

## 版本控制 + 相容性

- `PROTOCOL_VERSION` 位於 `src/gateway/protocol/schema.ts`。
- 用戶端會傳送 `minProtocol` + `maxProtocol`；伺服器會拒絕不匹配的請求。
- Swift 模型會保留未知的 frame 類型，以避免破壞舊版用戶端。

## Schema 模式與慣例

- 大多數物件使用 `additionalProperties: false` 來定義嚴格的 payload。
- `NonEmptyString` 是 ID 與方法/事件名稱的預設值。
- 頂層 `GatewayFrame` 使用 `type` 上的 **discriminator**。
- 具有副作用的方法通常在參數中需要一個 `idempotencyKey`
  （例如：`send`、`poll`、`agent`、`chat.send`）。
- `agent` 接受可選的 `internalEvents`，用於執行時期生成的編排上下文
  （例如子代理/cron 任務完成移交）；請將此視為內部 API 表面。

## 即時 Schema JSON

生成的 JSON Schema 位於 repo 的 `dist/protocol.schema.json`。發布的
原始檔案通常可在以下位置取得：

- [https://raw.githubusercontent.com/openclaw/openclaw/main/dist/protocol.schema.json](https://raw.githubusercontent.com/openclaw/openclaw/main/dist/protocol.schema.json)

## 當您變更 schema 時

1. 更新 TypeBox schema。
2. 執行 `pnpm protocol:check`。
3. 提交重新生成的 schema 與 Swift 模型。
