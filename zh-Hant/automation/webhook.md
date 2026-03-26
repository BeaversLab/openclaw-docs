---
summary: "Webhook ingress for wake and isolated agent runs"
read_when:
  - Adding or changing webhook endpoints
  - Wiring external systems into OpenClaw
title: "Webhooks"
---

# Webhooks

Gateway can expose a small HTTP webhook endpoint for external triggers.

## Enable

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

Notes:

- `hooks.token` is required when `hooks.enabled=true`.
- `hooks.path` defaults to `/hooks`.

## Auth

Every request must include the hook token. Prefer headers:

- `Authorization: Bearer <token>` (recommended)
- `x-openclaw-token: <token>`
- Query-string tokens are rejected (`?token=...` returns `400`).
- 將 `hooks.token` 持有者視為該網關上掛鈎進入表面的完全信任呼叫者。掛鈎承載內容仍然不受信任，但這不是一個單獨的非擁有者驗證邊界。

## 端點

### `POST /hooks/wake`

Payload：

```json
{ "text": "System line", "mode": "now" }
```

- `text` **required**（字串）：事件的描述（例如，「收到新郵件」）。
- `mode` optional（`now` | `next-heartbeat`）：是否觸發立即心跳（預設 `now`）或等待下一次定期檢查。

Effect：

- 為 **main** 會話將系統事件加入佇列
- 如果 `mode=now`，則觸發立即心跳

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

- `message` **required**（字串）：給代理處理的提示或訊息。
- `name` 選用 (字串)：此 Hook 的易讀名稱（例如 "GitHub"），用作會話摘要的前綴。
- `agentId` 選用 (字串)：將此 Hook 路由到特定代理程式。未知的 ID 會回退到預設代理程式。設定後，Hook 會使用解析出的代理程式的工作區和設定執行。
- `sessionKey` 選用 (字串)：用於識別代理程式會話的金鑰。除非 `hooks.allowRequestSessionKey=true`，否則預設會拒絕此欄位。
- `wakeMode` 選用 (`now` | `next-heartbeat`)：是否觸發立即心跳 (預設 `now`) 或等待下一次定期檢查。
- `deliver` 可選 (boolean): 如果為 `true`，代理的回應將傳送到訊息通道。預設為 `true`。僅包含心跳確認的回應會自動跳過。
- `channel` 可選 (string): 傳遞的訊息通道。以下之一：`last`、`whatsapp`、`telegram`、`discord`、`slack`、`mattermost` (plugin)、`signal`、`imessage`、`msteams`。預設為 `last`。
- `to` 可選（字串）：通道的收件者識別碼（例如：WhatsApp/Signal 的電話號碼、Telegram 的聊天 ID、Discord/Slack/Mattermost（外掛程式）的頻道 ID、Microsoft Teams 的對話 ID）。預設為主會話中的最後一個收件者。
- `model` 可選（字串）：模型覆寫（例如 `anthropic/claude-3-5-sonnet` 或別名）。如果受限，必須在允許的模型清單中。
- `thinking` 可選（字串）：思考層級覆寫（例如 `low`、`medium`、`high`）。
- `timeoutSeconds` 可選（數字）：代理程式執行的最長持續時間（以秒為單位）。

效果：

- 執行**獨立**的代理程式回合（擁有自己的會話金鑰）
- 總是將摘要發布到**主**會話中
- 如果 `wakeMode=now`，則立即觸發心跳

## Session key policy (breaking change)

預設情況下，停用 `/hooks/agent` payload `sessionKey` 覆寫。

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

### `POST /hooks/<name>` (mapped)

自訂 hook 名稱透過 `hooks.mappings` 解析（請參閱配置）。對應可以將任意 payload 轉換為 `wake` 或 `agent` 動作，並附帶選用的範本或程式碼轉換。

對應選項（摘要）：

- `hooks.presets: ["gmail"]` 可啟用內建 Gmail 對應。
- `hooks.mappings` 讓您可以在設定中定義 `match`、`action` 和範本。
- `hooks.transformsDir` + `transform.module` 會載入 JS/TS 模組以執行自訂邏輯。
  - `hooks.transformsDir` (如果已設定) 必須保留在 OpenClaw 設定目錄下的 transforms 根目錄中 (通常為 `~/.openclaw/hooks/transforms`)。
  - `transform.module` 必須解析於有效的 transforms 目錄內 (拒絕路徑遍歷/跳脫)。
- 使用 `match.source` 來保留通用的接收端點 (依據內容路由)。
- TS 轉換需要 TS 載入器 (例如 `bun` 或 `tsx`) 或在執行時期預先編譯的 `.js`。
- 在映射上設定 `deliver: true` + `channel`/`to` 以將回覆路由到聊天介面
  （`channel` 預設為 `last`，並回退至 WhatsApp）。
- `agentId` 將 hook 路由至特定代理；未知的 ID 會回退至預設代理。
- `hooks.allowedAgentIds` 限制明確的 `agentId` 路由。省略它（或包含 `*`）以允許任何代理。將 `[]` 設定為拒絕明確的 `agentId` 路由。
- 當未提供明確的金鑰時，`hooks.defaultSessionKey` 會設定 hook 代理執行的預設工作階段。
- `hooks.allowRequestSessionKey` 控制是否允許 `/hooks/agent` Payload 設定 `sessionKey`（預設值：`false`）。
- `hooks.allowedSessionKeyPrefixes` 選擇性地限制來自請求 Payload 和映射的明確 `sessionKey` 值。
- `allowUnsafeExternalContent: true` 停用該 Hook 的外部內容安全包裝器
  （危險；僅限於受信任的內部來源）。
- `openclaw webhooks gmail setup` 會寫入 `hooks.gmail` 設定給 `openclaw webhooks gmail run`。
  請參閱 [Gmail Pub/Sub](/zh-Hant/automation/gmail-pubsub) 以了解完整的 Gmail watch 流程。

## 回應

- `200` 用於 `/hooks/wake`
- `200` 用於 `/hooks/agent`（已接受非同步執行）
- `401` 在驗證失敗時
- `429` 在同一用戶端重複驗證失敗後（檢查 `Retry-After`）
- `400` 在無效的 payload 時
- `413` 在 payload 過大時

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

將 `model` 新增至 agent payload（或對應）以覆寫該次執行的模型：

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

- 將 hook 端點置於 loopback、tailnet 或受信任的 reverse proxy 之後。
- 使用專用的 hook token；切勿重複使用 gateway auth token。
- 最好使用具有嚴格 `tools.profile` 和沙盒隔離的專用 hook agent，這樣 hook 入侵的影響範圍會較小。
- 重複的驗證失敗會根據用戶端位址進行速率限制，以減慢暴力破解嘗試。
- 如果您使用多重代理路由，請設定 `hooks.allowedAgentIds` 以限制明確的 `agentId` 選取。
- 請保留 `hooks.allowRequestSessionKey=false`，除非您需要由呼叫者選取 session。
- 如果您啟用請求 `sessionKey`，請限制 `hooks.allowedSessionKeyPrefixes`（例如 `["hook:"]`）。
- 避免在 webhook 記錄中包含敏感的原始 payload。
- Hook payload 預設會被視為不受信任，並會用安全邊界包裹。
  如果您必須對特定 hook 停用此功能，請在該 hook 的對應中設定 `allowUnsafeExternalContent: true`
  （危險）。

import footerZhHant from "/components/footer/zh-Hant.mdx";

<footerZhHant />
