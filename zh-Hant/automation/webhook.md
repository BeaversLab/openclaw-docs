---
summary: "Webhook ingress for wake and isolated agent runs"
read_when:
  - Adding or changing webhook endpoints
  - Wiring external systems into OpenClaw
title: "Webhooks"
---

# Webhooks

Gateway can expose a small HTTP webhook endpoint for external triggers.

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

- `hooks.token` is required when `hooks.enabled=true`.
- `hooks.path` defaults to `/hooks`.

## Auth

Every request must include the hook token. Prefer headers:

- `Authorization: Bearer <token>` (recommended) (建議)
- `x-openclaw-token: <token>`
- Query-string tokens are rejected (`?token=...` returns `400`).

## 端點

### `POST /hooks/wake`

Payload:

```json
{ "text": "System line", "mode": "now" }
```

- `text` **required** (字串)：事件的描述（例如，"收到新電子郵件"）。
- `mode` optional (`now` | `next-heartbeat`)：是否觸發立即心跳（預設為 `now`）或等待下一次定期檢查。

Effect:

- 將系統事件加入 **主要** 會話的佇列
- If `mode=now`, triggers an immediate heartbeat

### `POST /hooks/agent`

Payload:

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

- `message` **required** (字串)：代理程式處理的提示或訊息。
- `name` optional (字串)：人類可讀的 Hook 名稱（例如，"GitHub"），用作會話摘要的前綴。
- `agentId` optional (字串)：將此 Hook 路由到特定的代理程式。未知的 ID 將退回至預設代理程式。設定後，Hook 將使用解析出的代理程式工作區和設定來執行。
- `sessionKey` optional (字串)：用於識別代理程式會話的金鑰。預設情況下，除非 `hooks.allowRequestSessionKey=true`，否則會拒絕此欄位。
- `wakeMode` optional (`now` | `next-heartbeat`)：是否觸發立即心跳（預設為 `now`）或等待下一次定期檢查。
- `deliver` optional (boolean)：如果為 `true`，agent 的回應將會傳送到訊息頻道。預設為 `true`。僅為心跳確認的回應會自動略過。
- `channel` optional (string)：傳送的訊息頻道。可選擇：`last`、`whatsapp`、`telegram`、`discord`、`slack`、`mattermost` (plugin)、`signal`、`imessage`、`msteams`。預設為 `last`。
- `to` optional (string)：該頻道的收件者識別碼（例如：WhatsApp/Signal 的電話號碼、Telegram 的聊天 ID、Discord/Slack/Mattermost (plugin) 的頻道 ID、MS Teams 的對話 ID）。預設為主會話中最後的收件者。
- `model` optional (string)：模型覆寫（例如 `anthropic/claude-3-5-sonnet` 或別名）。若受限則必須在允許的模型清單中。
- `thinking` optional (string)：思考層級覆寫（例如 `low`、`medium`、`high`）。
- `timeoutSeconds` optional (number)：agent 執行的最大持續時間（秒）。

效果：

- 執行**隔離的** agent 回合（專屬會話金鑰）
- 總是將摘要張貼到**主**會話
- 如果 `wakeMode=now`，則觸發立即心跳

## 會話金鑰原則（重大變更）

`/hooks/agent` payload `sessionKey` 覆寫功能預設為停用。

- 建議：設定固定的 `hooks.defaultSessionKey` 並保持請求覆寫關閉。
- 選用：僅在需要時允許請求覆寫，並限制前綴。

建議設定：

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

相容性設定（舊版行為）：

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

### `POST /hooks/<name>` (mapped)

自訂掛鉤名稱透過 `hooks.mappings` 解析（請參閱組態）。對應可以將任意 Payload 轉換為 `wake` 或 `agent` 動作，並可選擇使用範本或程式碼轉換。

對應選項（摘要）：

- `hooks.presets: ["gmail"]` 啟用內建的 Gmail 對應。
- `hooks.mappings` 讓您可以在組態中定義 `match`、`action` 和範本。
- `hooks.transformsDir` + `transform.module` 載入 JS/TS 模組以進行自訂邏輯處理。
  - `hooks.transformsDir`（如果已設定）必須位於 OpenClaw 組態目錄下的 transforms 根目錄內（通常為 `~/.openclaw/hooks/transforms`）。
  - `transform.module` 必須解析至有效的 transforms 目錄內（拒絕遍歷/跳出路徑）。
- 使用 `match.source` 以保留通用接收端點（Payload 驅動的路由）。
- TS 轉換在執行時需要 TS 載入器（例如 `bun` 或 `tsx`）或預先編譯的 `.js`。
- 在對應上設定 `deliver: true` + `channel`/`to` 以將回覆路由至聊天介面
  （`channel` 預設為 `last`，並退回至 WhatsApp）。
- `agentId` 將掛鉤路由至特定的代理程式；未知的 ID 會退回至預設代理程式。
- `hooks.allowedAgentIds` 限制明確的 `agentId` 路由。省略它（或包含 `*`）以允許任何代理程式。設定 `[]` 以拒絕明確的 `agentId` 路由。
- `hooks.defaultSessionKey` 在未提供明確金鑰時，為掛鉤代理程式執行設定預設工作階段。
- `hooks.allowRequestSessionKey` 控制是否允許 `/hooks/agent` Payload 設定 `sessionKey`（預設值：`false`）。
- `hooks.allowedSessionKeyPrefixes` 可選擇性地限制來自請求 Payload 和對應中的明確 `sessionKey` 值。
- `allowUnsafeExternalContent: true` 停用該掛鉤的外部內容安全包裝器
  （危險；僅適用於受信任的內部來源）。
- `openclaw webhooks gmail setup` 會寫入 `hooks.gmail` 的 `openclaw webhooks gmail run` 設定。
  如需完整的 Gmail 監控流程，請參閱 [Gmail Pub/Sub](/zh-Hant/automation/gmail-pubsub)。

## 回應

- `200` 用於 `/hooks/wake`
- `200` 用於 `/hooks/agent` (非同步執行已接受)
- 驗證失敗時傳回 `401`
- 同一用戶端重複驗證失敗後傳回 `429` (請檢查 `Retry-After`)
- 無效負載時傳回 `400`
- 負載過大時傳回 `413`

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

將 `model` 新增至代理程式負載 (或對應) 以覆寫該次執行的模型：

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

- 請將掛鉤端點置於回環介面、tailnet 或受信任的反向代理之後。
- 使用專用的掛鉤權杖；請勿重複使用閘道驗證權杖。
- 重複的驗證失敗會依用戶端位址進行速率限制，以減緩暴力破解嘗試。
- 如果您使用多重代理程式路由，請設定 `hooks.allowedAgentIds` 以限制明確的 `agentId` 選取。
- 除非您需要由呼叫者選取的作業階段，否則請保持 `hooks.allowRequestSessionKey=false` 為啟用狀態。
- 如果您啟用要求 `sessionKey`，請限制 `hooks.allowedSessionKeyPrefixes` (例如，`["hook:"]`)。
- 避免在 webhook 記錄中包含敏感的原始負載。
- 掛鉤負載預設被視為不受信任，並會使用安全邊界進行包裝。
  如果您必須針對特定掛鉤停用此功能，請在該掛鉤的對應中設定 `allowUnsafeExternalContent: true`
  (危險)。

import footerZhHant from "/components/footer/zh-Hant.mdx";

<footerZhHant />
