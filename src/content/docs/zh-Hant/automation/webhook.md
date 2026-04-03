---
summary: "喚醒與隔離代理執行的 Webhook 進入"
read_when:
  - Adding or changing webhook endpoints
  - Wiring external systems into OpenClaw
title: "Webhooks"
---

# Webhooks

Gateway 可以公開一個小型的 HTTP webhook 端點以供外部觸發。

## 啟用

```json5
{
  hooks: {
    enabled: true,
    token: "shared-secret",
    path: "/hooks",
    // Optional: restrict explicit `agentId` routing to this allowlist.
    // Omit or include "*" to allow any agent.
    // Set [] to deny all explicit `agentId` routing.
    allowedAgentIds: ["hooks", "main"],
  },
}
```

備註：

- 當 `hooks.enabled=true` 時，`hooks.token` 是必需的。
- `hooks.path` 預設為 `/hooks`。

## 驗證

每個請求必須包含 hook token。建議使用標頭：

- `Authorization: Bearer <token>` (推薦)
- `x-openclaw-token: <token>`
- 查詢字串 token 將被拒絕 (`?token=...` 回傳 `400`)。
- 將 `hooks.token` 持有者視為該 gateway 上 hook 進入層面的完全信任呼叫者。Hook payload 內容仍然是不受信任的，但這不是一個獨立的非擁有者驗證邊界。

## 端點

### `POST /hooks/wake`

Payload：

```json
{ "text": "System line", "mode": "now" }
```

- `text` **required** (string): 事件的描述 (例如 "收到新郵件")。
- `mode` optional (`now` | `next-heartbeat`): 是否立即觸發心跳 (預設 `now`) 或等待下一次定期檢查。

效果：

- 將系統事件加入 **主要** 會話的佇列
- 如果為 `mode=now`，則觸發立即心跳

### `POST /hooks/agent`

Payload：

```json
{
  "message": "Run this",
  "name": "Email",
  "agentId": "hooks",
  "sessionKey": "hook:email:msg-123",
  "wakeMode": "now",
  "deliver": true,
  "channel": "last",
  "to": "+15551234567",
  "model": "openai/gpt-5.2-mini",
  "thinking": "low",
  "timeoutSeconds": 120
}
```

- `message` **required** (string): 代理處理的提示詞或訊息。
- `name` optional (string): Hook 的人類可讀名稱 (例如 "GitHub")，用於會話摘要的前綴。
- `agentId` optional (string): 將此 hook 路由到特定的代理。未知的 ID 將回退到預設代理。設定後，hook 將使用解析的代理工作區和設定執行。
- `sessionKey` optional (string): 用於識別代理會話的金鑰。預設情況下，除非 `hooks.allowRequestSessionKey=true`，否則會拒絕此欄位。
- `wakeMode` 選填 (`now` | `next-heartbeat`)：是否立即觸發心跳（預設 `now`）或等待下一次定期檢查。
- `deliver` 選填 (boolean)：若為 `true`，代理程式的回應將傳送至訊息頻道。預設為 `true`。僅為心跳確認的回應會自動跳過。
- `channel` 選填（字串）：用於傳送的訊息管道。使用 `last` 或任何已設定的管道或外掛 ID，例如 `discord`、`matrix`、`telegram` 或 `whatsapp`。預設為 `last`。
- `to` 選填（字串）：管道的收件者識別碼（例如：WhatsApp/Signal 的電話號碼、Telegram 的聊天 ID、Discord/Slack/Mattermost (外掛) 的頻道 ID、Microsoft Teams 的對話 ID）。預設為主工作階段中的最後一個收件者。
- `model` 選填（字串）：模型覆寫（例如 `anthropic/claude-sonnet-4-6` 或別名）。若有限制，必須在允許的模型清單中。
- `thinking` 選填（字串）：思考層級覆寫（例如 `low`、`medium`、`high`）。
- `timeoutSeconds` 選填（數字）：代理程式執行的最大持續時間（秒）。

效果：

- 執行 **獨立** 的代理程式輪次（自有工作階段金鑰）
- 一律將摘要張貼至 **主** 工作階段
- 如果為 `wakeMode=now`，則觸發立即心跳

## 工作階段金鑰政策（重大變更）

`/hooks/agent` 載荷 `sessionKey` 覆寫功能預設為停用。

- 建議：設定固定的 `hooks.defaultSessionKey` 並保持請求覆寫關閉。
- 選用：僅在需要時允許請求覆寫，並限制前綴。

建議的配置：

```json5
{
  hooks: {
    enabled: true,
    token: "${OPENCLAW_HOOKS_TOKEN}",
    defaultSessionKey: "hook:ingress",
    allowRequestSessionKey: false,
    allowedSessionKeyPrefixes: ["hook:"],
  },
}
```

相容性配置（舊版行為）：

```json5
{
  hooks: {
    enabled: true,
    token: "${OPENCLAW_HOOKS_TOKEN}",
    allowRequestSessionKey: true,
    allowedSessionKeyPrefixes: ["hook:"], // strongly recommended
  },
}
```

### `POST /hooks/<name>`（已對應）

自訂 Hook 名稱透過 `hooks.mappings` 解析（請參閱設定）。對應可以將任意載荷轉換為 `wake` 或 `agent` 動作，並搭配選用的範本或程式碼轉換。

對應選項（摘要）：

- `hooks.presets: ["gmail"]` 啟用內建的 Gmail 對應。
- `hooks.mappings` 讓您可以在設定中定義 `match`、`action` 和範本。
- `hooks.transformsDir` + `transform.module` 載入用於自訂邏輯的 JS/TS 模組。
  - `hooks.transformsDir`（若已設定）必須位於您的 OpenClaw 設定目錄下的轉換根目錄內（通常為 `~/.openclaw/hooks/transforms`）。
  - `transform.module` 必須在有效的 transforms 目錄內解析（拒絕遍歷/逃逸路徑）。
- 使用 `match.source` 以保留通用的接收端點（由驅動的負載路由）。
- TS 變換需要 TS 載入器（例如 `bun` 或 `tsx`）或在執行時期預先編譯的 `.js`。
- 在映射上設定 `deliver: true` + `channel`/`to` 以將回覆路由至聊天介面
  （`channel` 預設為 `last` 並退回至 WhatsApp）。
- `agentId` 將 hook 路由至特定的代理程式；未知的 ID 會退回至預設代理程式。
- `hooks.allowedAgentIds` 限制明確的 `agentId` 路由。省略它（或包含 `*`）以允許任何代理程式。設定 `[]` 以拒絕明確的 `agentId` 路由。
- 當未提供明確金鑰時，`hooks.defaultSessionKey` 為 hook 代理程式執行設定預設階段。
- `hooks.allowRequestSessionKey` 控制 `/hooks/agent` 負載是否可以設定 `sessionKey`（預設：`false`）。
- `hooks.allowedSessionKeyPrefixes` 可選地限制來自請求負載和映射的明確 `sessionKey` 值。
- `allowUnsafeExternalContent: true` 停用該 hook 的外部內容安全包裝函式
  （危險；僅適用於受信任的內部來源）。
- `openclaw webhooks gmail setup` 寫入 `hooks.gmail` 設定給 `openclaw webhooks gmail run`。
  請參閱 [Gmail Pub/Sub](/en/automation/gmail-pubsub) 以了解完整的 Gmail watch 流程。

## 回應

- `200` 用於 `/hooks/wake`
- `200` 用於 `/hooks/agent`（已接受非同步執行）
- `401` 於驗證失敗時
- `429` 於來自同一個客戶端的重複驗證失敗後（檢查 `Retry-After`）
- `400` 於無效負載時
- `413` 超過負載大小限制時

## 範例

```bash
curl -X POST http://127.0.0.1:18789/hooks/wake \
  -H 'Authorization: Bearer SECRET' \
  -H 'Content-Type: application/json' \
  -d '{"text":"New email received","mode":"now"}'
```

```bash
curl -X POST http://127.0.0.1:18789/hooks/agent \
  -H 'x-openclaw-token: SECRET' \
  -H 'Content-Type: application/json' \
  -d '{"message":"Summarize inbox","name":"Email","wakeMode":"next-heartbeat"}'
```

### 使用不同的模型

將 `model` 新增至代理程式負載（或對映）以覆寫該次執行的模型：

```bash
curl -X POST http://127.0.0.1:18789/hooks/agent \
  -H 'x-openclaw-token: SECRET' \
  -H 'Content-Type: application/json' \
  -d '{"message":"Summarize inbox","name":"Email","model":"openai/gpt-5.2-mini"}'
```

如果您強制執行 `agents.defaults.models`，請確保該處包含覆寫模型。

```bash
curl -X POST http://127.0.0.1:18789/hooks/gmail \
  -H 'Authorization: Bearer SECRET' \
  -H 'Content-Type: application/json' \
  -d '{"source":"gmail","messages":[{"from":"Ada","subject":"Hello","snippet":"Hi"}]}'
```

## 安全性

- 將 hook 端點保持在 loopback、tailnet 或受信任的反向代理後面。
- 使用專用的 hook token；請勿重複使用 gateway 驗證 token。
- 優先使用具有嚴格 `tools.profile` 和沙箱機制的專用 Hook 代理程式，以便縮小 Hook 流入攻擊的影響範圍。
- 重複的驗證失敗會根據客戶端位址進行速率限制，以減緩暴力嘗試。
- 如果您使用多代理程式路由，請設定 `hooks.allowedAgentIds` 以限制明確的 `agentId` 選取。
- 除非您需要由呼叫者選取的工作階段，否則請保留 `hooks.allowRequestSessionKey=false`。
- 如果您啟用請求 `sessionKey`，請限制 `hooks.allowedSessionKeyPrefixes`（例如 `["hook:"]`）。
- 避免在 webhook 記錄中包含敏感的原始 payload。
- Hook 負載預設被視為不受信任，並以安全邊界包裝。
  如果您必須針對特定 Hook 停用此功能，請在該 Hook 的對映中設定 `allowUnsafeExternalContent: true`
  （危險）。
