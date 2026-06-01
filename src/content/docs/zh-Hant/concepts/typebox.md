---
summary: "TypeBox 結構描述作為 Gateway 協議的單一真實來源"
read_when:
  - Updating protocol schemas or codegen
title: "TypeBox"
---

TypeBox 是一個以 TypeScript 為優先的 Schema 函式庫。我們使用它來定義 **Gateway
WebSocket 協定**（handshake、請求/回應、伺服器事件）。這些 schemas 驅動 macOS 應用程式的**執行時期驗證**、**JSON Schema 匯出**以及 **Swift 程式碼產生**。單一真實來源；其他一切都由此產生。

如果您需要更高層級的協議背景，請從
[Gateway architecture](/zh-Hant/concepts/architecture) 開始。

## 心智模型（30 秒）

每個 Gateway WS 訊息都是以下三種框架之一：

- **請求**：`{ type: "req", id, method, params }`
- **回應**：`{ type: "res", id, ok, payload | error }`
- **事件**：`{ type: "event", event, payload, seq?, stateVersion? }`

第一個框架**必須**是一個 `connect` 請求。之後，用戶端可以呼叫方法（例如 `health`、`send`、`chat.send`）並訂閱事件（例如
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

| 類別     | 範例                                                       | 備註                        |
| -------- | ---------------------------------------------------------- | --------------------------- |
| 核心     | `connect`、`health`、`status`                              | `connect` 必須是第一個      |
| 訊息傳遞 | `send`、`agent`、`agent.wait`、`system-event`、`logs.tail` | 副作用需要 `idempotencyKey` |
| 聊天     | `chat.history`、`chat.send`、`chat.abort`                  | WebChat 使用這些            |
| 工作階段 | `sessions.list`、`sessions.patch`、`sessions.delete`       | 工作階段管理                |
| 自動化   | `wake`、`cron.list`、`cron.run`、`cron.runs`               | 喚醒 + cron 控制            |
| 節點     | `node.list`、`node.invoke`、`node.pair.*`                  | Gateway WS + 節點動作       |
| 事件     | `tick`、`presence`、`agent`、`chat`、`health`、`shutdown`  | 伺服器推送                  |

權威的公告**探索**清單位於
`src/gateway/server-methods-list.ts` (`listGatewayMethods`, `GATEWAY_EVENTS`)。

## Schema 存放位置

- 來源：`packages/gateway-protocol/src/schema.ts`
- 執行時期驗證器 (AJV)：`packages/gateway-protocol/src/index.ts`
- 公告的功能/探索註冊表：`src/gateway/server-methods-list.ts`
- 伺服器握手 + 方法分派：`src/gateway/server.impl.ts`
- Node 客戶端：`src/gateway/client.ts`
- 生成的 JSON Schema：`dist/protocol.schema.json`
- 生成的 Swift 模型：`apps/macos/Sources/OpenClawProtocol/GatewayModels.swift`

## 目前管線

- `pnpm protocol:gen`
  - 將 JSON Schema (draft-07) 寫入 `dist/protocol.schema.json`
- `pnpm protocol:gen:swift`
  - 生成 Gateway Swift 模型
- `pnpm protocol:check`
  - 執行這兩個生成器並驗證輸出已提交

## Schema 在執行時期的使用方式

- **伺服器端**：每個傳入框架都會使用 AJV 進行驗證。握手僅
  接受參數符合 `ConnectParams` 的 `connect` 請求。
- **客戶端**：JS 客戶端會在使用事件和回應框架之前對其進行驗證。
- **功能探索**：Gateway 會在 `hello-ok` 中從 `listGatewayMethods()` 和
  `GATEWAY_EVENTS` 發送保守的 `features.methods`
  和 `features.events` 清單。
- 該探索清單並非 `coreGatewayHandlers` 中每個可呼叫輔助程式的生成傾印；
  某些輔助 RPC 是在 `src/gateway/server-methods/*.ts` 中實作的，
  而未列在公告的功能清單中。

## 範例框架

連線 (第一則訊息)：

```json
{
  "type": "req",
  "id": "c1",
  "method": "connect",
  "params": {
    "minProtocol": 3,
    "maxProtocol": 4,
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
    "protocol": 4,
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

## 最小客戶端 (Node.js)

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
        minProtocol: 4,
        maxProtocol: 4,
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

新增至 `packages/gateway-protocol/src/schema.ts`：

```ts
export const SystemEchoParamsSchema = Type.Object({ text: NonEmptyString }, { additionalProperties: false });

export const SystemEchoResultSchema = Type.Object({ ok: Type.Boolean(), text: NonEmptyString }, { additionalProperties: false });
```

同時新增到 `ProtocolSchemas` 並匯出型別：

```ts
  SystemEchoParams: SystemEchoParamsSchema,
  SystemEchoResult: SystemEchoResultSchema,
```

```ts
export type SystemEchoParams = Static<typeof SystemEchoParamsSchema>;
export type SystemEchoResult = Static<typeof SystemEchoResultSchema>;
```

2. **驗證**

在 `packages/gateway-protocol/src/index.ts` 中，匯出一個 AJV 驗證器：

```ts
export const validateSystemEchoParams = ajv.compile<SystemEchoParams>(SystemEchoParamsSchema);
```

3. **伺服器行為**

在 `src/gateway/server-methods/system.ts` 中新增處理程序：

```ts
export const systemHandlers: GatewayRequestHandlers = {
  "system.echo": ({ params, respond }) => {
    const text = String(params.text ?? "");
    respond(true, { ok: true, text });
  },
};
```

在 `src/gateway/server-methods.ts` 中註冊（已合併 `systemHandlers`），
然後將 `"system.echo"` 新增到 `src/gateway/server-methods-list.ts` 中的
`listGatewayMethods` 輸入。

如果該方法可由操作員或節點客戶端調用，請在 `src/gateway/method-scopes.ts` 中進行分類，
以便範圍強制執行和 `hello-ok` 功能廣告保持一致。

4. **重新生成**

```bash
pnpm protocol:check
```

5. **測試 + 文檔**

在 `src/gateway/server.*.test.ts` 中新增伺服器測試並在文檔中註明該方法。

## Swift 程式碼生成行為

Swift 生成器會發出：

- 帶有 `req`、`res`、`event` 和 `unknown` case 的 `GatewayFrame` enum
- 強類型 payload structs/enums
- `ErrorCode` 值、`GATEWAY_PROTOCOL_VERSION` 和 `GATEWAY_MIN_PROTOCOL_VERSION`

未知的幀類型會保留為原始 payload 以實現向前兼容。

## 版本控制 + 兼容性

- `PROTOCOL_VERSION` 位於 `packages/gateway-protocol/src/version.ts`。
- 客戶端發送 `minProtocol` + `maxProtocol`；伺服器會拒絕不包含其目前協議的範圍。
- Swift 模型會保留未知的幀類型，以避免破壞舊版客戶端。

## Schema 模式與慣例

- 大多數物件使用 `additionalProperties: false` 來處理嚴格的 Payload。
- `NonEmptyString` 是 ID 和方法/事件名稱的預設值。
- 頂層 `GatewayFrame` 在 `type` 上使用**鑑別器**。
- 具有副作用的方法通常在參數中需要一個 `idempotencyKey`
  (例如：`send`、`poll`、`agent`、`chat.send`)。
- `agent` 接受選用的 `internalEvents`，用於執行時生成的協調上下文
  (例如子代理/cron 任務完成的交接)；請將此視為內部 API 表面。

## 即時 Schema JSON

生成的 JSON Schema 位於倉庫的 `dist/protocol.schema.json`。
發布的原始檔案通常可在以下位置獲得：

- [https://raw.githubusercontent.com/openclaw/openclaw/main/dist/protocol.schema.json](https://raw.githubusercontent.com/openclaw/openclaw/main/dist/protocol.schema.json)

## 當您變更 Schema 時

1. 更新 TypeBox Schema。
2. 在 `src/gateway/server-methods-list.ts` 中註冊方法/事件。
3. 當新的 RPC 需要操作員或節點範圍分類時，更新 `src/gateway/method-scopes.ts`。
4. 執行 `pnpm protocol:check`。
5. 提交重新產生的 Schema 與 Swift 模型。

## 相關主題

- [Rich output protocol](/zh-Hant/reference/rich-output-protocol)
- [RPC adapters](/zh-Hant/reference/rpc)
