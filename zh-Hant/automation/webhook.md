---
summary: "用於喚醒和獨立代理程式執行的 Webhook 進入"
read_when:
  - 新增或變更 webhook 端點
  - 將外部系統連線至 OpenClaw
title: "Webhooks"
---

# Webhooks

Gateway 可以公開一個小型的 HTTP webhook 端點供外部觸發使用。

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

注意：

- 啟用 `hooks.token` 時需要 `hooks.enabled=true`。
- `hooks.path` 預設為 `/hooks`。

## 驗證

每個請求都必須包含 hook token。建議使用標頭：

- `Authorization: Bearer <token>` (建議)
- `x-openclaw-token: <token>`
- 查詢字串 token 會被拒絕 (`?token=...` 會傳回 `400`)。
- 將 `hooks.token` 持有者視為該 gateway 上 hook 進入層面的完全信任呼叫者。Hook 載荷內容仍然不可信，但這不是一個獨立的非擁有者驗證邊界。

## 端點

### `POST /hooks/wake`

載荷：

```json
{ "text": "System line", "mode": "now" }
```

- `text` **必要** (字串)：事件的描述 (例如 "收到新電子郵件")。
- `mode` 選填 (`now` | `next-heartbeat`)：是否立即觸發心跳 (預設 `now`) 或等待下一次定期檢查。

效果：

- 將系統事件加入 **主** 工作階段的佇列
- 如果 `mode=now`，則立即觸發心跳

### `POST /hooks/agent`

載荷：

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

- `message` **必要** (字串)：代理程式要處理的提示詞或訊息。
- `name` 選填 (字串)：人類可閱讀的 hook 名稱 (例如 "GitHub")，用作工作階段摘要的前綴。
- `agentId` 選填 (字串)：將此 hook 路由至特定代理程式。未知的 ID 會回退至預設代理程式。設定後，hook 會使用解析出的代理程式工作區和設定執行。
- `sessionKey` 選填 (字串)：用於識別代理程式工作階段的金鑰。預設情況下，除非 `hooks.allowRequestSessionKey=true`，否則會拒絕此欄位。
- `wakeMode` 可選（`now` | `next-heartbeat`）：是否觸發立即心跳（預設為 `now`）或等待下一次定期檢查。
- `deliver` 可選（布林值）：如果為 `true`，代理程式的回應將被傳送到訊息頻道。預設為 `true`。僅包含心跳確認的回應會自動略過。
- `channel` 可選（字串）：用於傳送的訊息頻道。可以是：`last`、`whatsapp`、`telegram`、`discord`、`slack`、`mattermost` (外掛程式)、`signal`、`imessage`、`msteams`。預設為 `last`。
- `to` 可選（字串）：該頻道的收件人識別碼（例如，WhatsApp/Signal 的電話號碼、Telegram 的聊天 ID、Discord/Slack/Mattermost (外掛程式) 的頻道 ID、MS Teams 的對話 ID）。預設為主要工作階段中的最後一個收件人。
- `model` 可選（字串）：模型覆寫（例如 `anthropic/claude-3-5-sonnet` 或別名）。如果有限制，必須位於允許的模型清單中。
- `thinking` 可選（字串）：思考層級覆寫（例如 `low`、`medium`、`high`）。
- `timeoutSeconds` 可選（數字）：代理程式執行的最大持續時間（秒）。

效果：

- 執行**獨立**的代理程式輪次（有自己的工作階段金鑰）
- 總是將摘要發布到**主要**工作階段
- 如果為 `wakeMode=now`，則觸發立即心跳

## 工作階段金鑰原則（重大變更）

`/hooks/agent` 載荷 `sessionKey` 覆寫預設為停用。

- 建議：設定固定的 `hooks.defaultSessionKey` 並保持請求覆寫為關閉。
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

自訂 Hook 名稱透過 `hooks.mappings` 解析（請參閱設定）。對應可將任意承載轉換為 `wake` 或 `agent` 動作，並選擇性地搭配範本或程式碼轉換。

對應選項（摘要）：

- `hooks.presets: ["gmail"]` 啟用內建的 Gmail 對應。
- `hooks.mappings` 可讓您在設定中定義 `match`、`action` 和範本。
- `hooks.transformsDir` + `transform.module` 載入 JS/TS 模組以用於自訂邏輯。
  - `hooks.transformsDir`（若設定）必須位於 OpenClaw 設定目錄下的轉換根目錄內（通常為 `~/.openclaw/hooks/transforms`）。
  - `transform.module` 必須在有效轉換目錄內解析（拒絕周遊/逸出路徑）。
- 使用 `match.source` 來保留通用接收端點（承載驅動路由）。
- TS 轉換需要在執行時期搭配 TS 載入器（例如 `bun` 或 `tsx`）或預先編譯的 `.js`。
- 在對應上設定 `deliver: true` + `channel`/`to`，將回覆路由至聊天介面
  (`channel` 預設為 `last` 並退回至 WhatsApp)。
- `agentId` 將 Hook 路由至特定代理程式；未知的 ID 會退回至預設代理程式。
- `hooks.allowedAgentIds` 限制明確的 `agentId` 路由。省略它（或包含 `*`）以允許任何代理程式。設定 `[]` 以拒絕明確的 `agentId` 路由。
- `hooks.defaultSessionKey` 在未提供明確金鑰時，設定 Hook 代理程式執行的預設工作階段。
- `hooks.allowRequestSessionKey` 控制是否允許 `/hooks/agent` 設定 `sessionKey` (預設： `false`)。
- `hooks.allowedSessionKeyPrefixes` 選擇性地限制來自請求負載和映射的明確 `sessionKey` 值。
- `allowUnsafeExternalContent: true` 停用該 hook 的外部內容安全包裝器
  （危險；僅限於受信任的內部來源）。
- `openclaw webhooks gmail setup` 寫入 `hooks.gmail` 配置給 `openclaw webhooks gmail run`。
  請參閱 [Gmail Pub/Sub](/zh-Hant/automation/gmail-pubsub) 以了解完整的 Gmail 監看流程。

## 回應

- `200` 針對 `/hooks/wake`
- `200` 針對 `/hooks/agent` (已接受非同步執行)
- 驗證失敗時回傳 `401`
- 來自相同用戶端的多次驗證失敗後回傳 `429` (請檢查 `Retry-After`)
- 無效負載時回傳 `400`
- 負載過大時回傳 `413`

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

將 `model` 新增至代理程式負載 (或映射) 以覆寫該次執行的模型：

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

- 將 hook 端點保留在 loopback、tailnet 或受信任的 reverse proxy 後方。
- 使用專用的 hook 權杖；請勿重複使用 gateway 驗證權杖。
- 建議使用具有嚴格 `tools.profile` 和沙盒機制的專用 hook 代理程式，以便縮小 hook 入口的影響範圍。
- 對於重複的驗證失敗，系統會根據用戶端位址進行速率限制，以減緩暴力嘗試的速度。
- 如果您使用多代理程式路由，請設定 `hooks.allowedAgentIds` 以限制明確的 `agentId` 選擇。
- 請保留 `hooks.allowRequestSessionKey=false`，除非您需要由呼叫者選擇工作階段。
- 如果您啟用請求 `sessionKey`，請限制 `hooks.allowedSessionKeyPrefixes` (例如 `["hook:"]`)。
- 避免在 webhook 記錄中包含敏感的原始負載。
- Hook 負載預設被視為不受信任，並使用安全邊界進行包裝。
  如果您必須針對特定 hook 停用此功能，請在該 hook 的映射中設定 `allowUnsafeExternalContent: true`
  (危險)。

import en from "/components/footer/en.mdx";

<en />
