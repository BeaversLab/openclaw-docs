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
- `channel` 選填 (string)：傳送用的訊息頻道。核心頻道：`last`、`whatsapp`、`telegram`、`discord`、`slack`、`signal`、`imessage`、`irc`、`googlechat`、`line`。擴充頻道 (plugins)：`msteams`、`mattermost` 等。預設為 `last`。
- `to` 選填 (string)：該頻道的收件者識別碼（例如：WhatsApp/Signal 的電話號碼、Telegram 的聊天 ID、Discord/Slack/Mattermost (plugin) 的頻道 ID、Microsoft Teams 的對話 ID）。預設為主工作階段中的最後一位收件者。
- `model` 選填 (string)：模型覆寫（例如 `anthropic/claude-sonnet-4-6` 或別名）。若有限制，必須位於允許的模型清單中。
- `thinking` 選填 (string)：思考層級覆寫（例如 `low`、`medium`、`high`）。
- `timeoutSeconds` 選填 (number)：代理程式執行的最大持續時間（秒）。

效果：

- 執行 **獨立** 的代理程式輪次（自有工作階段金鑰）
- 一律將摘要張貼至 **主** 工作階段
- 若 `wakeMode=now`，會立即觸發心跳

## 工作階段金鑰政策（重大變更）

`/hooks/agent` payload 的 `sessionKey` 覆寫預設為停用。

- 建議：設定固定的 `hooks.defaultSessionKey` 並關閉請求覆寫。
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

### `POST /hooks/<name>` (對應)

自訂掛鉤名稱透過 `hooks.mappings` 解析（請參閱配置）。對應可以將任意 Payload 轉換為 `wake` 或 `agent` 動作，並可選用範本或程式碼轉換。

對應選項（摘要）：

- `hooks.presets: ["gmail"]` 啟用內建的 Gmail 對應。
- `hooks.mappings` 讓您在設定中定義 `match`、`action` 和範本。
- `hooks.transformsDir` + `transform.module` 載入 JS/TS 模組以進行自訂邏輯處理。
  - `hooks.transformsDir`（若設定）必須位於您的 OpenClaw 配置目錄下的轉換根目錄中（通常是 `~/.openclaw/hooks/transforms`）。
  - `transform.module` 必須在有效的轉換目錄內解析（不接受遍歷/逃出路徑）。
- 使用 `match.source` 以保留通用接收端點（由 Payload 驅動的路由）。
- TS 轉換需要在執行時期搭配 TS 載入器（例如 `bun` 或 `tsx`）或預先編譯的 `.js`。
- 在對應上設定 `deliver: true` + `channel`/`to` 以將回覆路由至聊天介面
  (`channel` 預設為 `last`，並會後備使用 WhatsApp)。
- `agentId` 將掛鉤路由至特定的代理程式；未知的 ID 會後備至預設代理程式。
- `hooks.allowedAgentIds` 限制明確的 `agentId` 路由。省略它（或包含 `*`）以允許任何代理程式。設定 `[]` 以拒絕明確的 `agentId` 路由。
- 當未提供明確金鑰時，`hooks.defaultSessionKey` 會設定掛鉤代理程式執行的預設工作階段。
- `hooks.allowRequestSessionKey` 控制是否允許 `/hooks/agent` payload 設定 `sessionKey` (預設值：`false`)。
- `hooks.allowedSessionKeyPrefixes` 選擇性地限制來自請求 payload 和對映中的明確 `sessionKey` 值。
- `allowUnsafeExternalContent: true` 停用該 hook 的外部內容安全包裝器
  (危險；僅適用於受信任的內部來源)。
- `openclaw webhooks gmail setup` 寫入 `hooks.gmail` 設定給 `openclaw webhooks gmail run`。
  請參閱 [Gmail Pub/Sub](/en/automation/gmail-pubsub) 以了解完整的 Gmail watch 流程。

## 回應

- `200` 表示 `/hooks/wake`
- `200` 表示 `/hooks/agent` (已接受非同步執行)
- 當驗證失敗時回傳 `401`
- 當同一客戶端重複驗證失敗時回傳 `429` (請檢查 `Retry-After`)
- 當 payload 無效時回傳 `400`
- 當 payload 過大時回傳 `413`

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

將 `model` 新增至 agent payload (或對映) 中，以覆寫該次執行的模型：

```bash
curl -X POST http://127.0.0.1:18789/hooks/agent \
  -H 'x-openclaw-token: SECRET' \
  -H 'Content-Type: application/json' \
  -d '{"message":"Summarize inbox","name":"Email","model":"openai/gpt-5.2-mini"}'
```

如果您強制執行 `agents.defaults.models`，請確保覆寫的模型已包含在其中。

```bash
curl -X POST http://127.0.0.1:18789/hooks/gmail \
  -H 'Authorization: Bearer SECRET' \
  -H 'Content-Type: application/json' \
  -d '{"source":"gmail","messages":[{"from":"Ada","subject":"Hello","snippet":"Hi"}]}'
```

## 安全性

- 將 hook 端點保持在 loopback、tailnet 或受信任的反向代理後面。
- 使用專用的 hook token；請勿重複使用 gateway 驗證 token。
- 建議使用具有嚴格 `tools.profile` 和沙盒機制的專用 hook agent，以便縮小 hook 進入點的受影響範圍。
- 重複的驗證失敗會根據客戶端位址進行速率限制，以減緩暴力嘗試。
- 如果您使用多 agent 路由，請設定 `hooks.allowedAgentIds` 以限制明確的 `agentId` 選擇。
- 除非您需要由呼叫者選擇 session，否則請保持 `hooks.allowRequestSessionKey=false`。
- 如果您啟用請求 `sessionKey`，請限制 `hooks.allowedSessionKeyPrefixes` (例如，`["hook:"]`)。
- 避免在 webhook 記錄中包含敏感的原始 payload。
- Hook payloads are treated as untrusted and wrapped with safety boundaries by default.
  If you must disable this for a specific hook, set `allowUnsafeExternalContent: true`
  in that hook's mapping (dangerous).
