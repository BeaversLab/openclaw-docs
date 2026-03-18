---
summary: "Cron jobs + wakeups for the Gateway scheduler"
read_when:
  - Scheduling background jobs or wakeups
  - Wiring automation that should run with or alongside heartbeats
  - Deciding between heartbeat and cron for scheduled tasks
title: "Cron Jobs"
---

# Cron jobs (Gateway scheduler)

> **Cron vs Heartbeat?** 如需了解何時使用何者的指引，請參閱 [Cron vs Heartbeat](/zh-Hant/automation/cron-vs-heartbeat)。

Cron 是 Gateway 的內建排程器。它會持久化工作，在適當的時間喚醒代理程式，並可選擇將輸出傳送回聊天。

如果您想要 _「每天早上執行這個」_ 或 _「20 分鐘後提醒代理程式」_，
cron 就是您需要的機制。

疑難排解：[/automation/troubleshooting](/zh-Hant/automation/troubleshooting)

## TL;DR

- Cron 執行 **於 Gateway 內部**（而非模型內部）。
- 工作會持久化在 `~/.openclaw/cron/` 之下，因此重啟不會遺失排程。
- 兩種執行風格：
  - **主要會話 (Main session)**：將系統事件加入佇列，然後在下次心跳時執行。
  - **隔離**：在 `cron:<jobId>` 或自訂會話中執行專用的代理程式回合，並進行傳送（預設為公告或無）。
  - **目前會話**：繫結至建立 cron 的會話 (`sessionTarget: "current"`)。
  - **自訂會話**：在持久化的具名會話中執行 (`sessionTarget: "session:custom-id"`)。
- 喚醒是一等公民：工作可以請求「立即喚醒」或「下次心跳」。
- Webhook 張貼是透過 `delivery.mode = "webhook"` + `delivery.to = "<url>"` 針對每個工作進行的。
- 當設定了 `cron.webhook` 時，針對具有 `notify: true` 的已儲存工作，會保留舊版回退機制，請將這些工作遷移至 webhook 傳送模式。
- 對於升級，`openclaw doctor --fix` 可以在排程器接觸舊版 cron 商店欄位之前將其正規化。

## Quick start (actionable)

建立一次性提醒，驗證其存在，並立即執行：

```bash
openclaw cron add \
  --name "Reminder" \
  --at "2026-02-01T16:00:00Z" \
  --session main \
  --system-event "Reminder: check the cron docs draft" \
  --wake now \
  --delete-after-run

openclaw cron list
openclaw cron run <job-id>
openclaw cron runs --id <job-id>
```

排程具有傳送功能的週期性隔離工作：

```bash
openclaw cron add \
  --name "Morning brief" \
  --cron "0 7 * * *" \
  --tz "America/Los_Angeles" \
  --session isolated \
  --message "Summarize overnight updates." \
  --announce \
  --channel slack \
  --to "channel:C1234567890"
```

## Tool-call equivalents (Gateway cron tool)

如需標準的 JSON 形狀和範例，請參閱 [JSON schema for tool calls](/zh-Hant/automation/cron-jobs#json-schema-for-tool-calls)。

## Where cron jobs are stored

Cron jobs 預設會持續化在 Gateway 主機的 `~/.openclaw/cron/jobs.json`。
Gateway 會將檔案載入記憶體並在變更時寫回，因此只有在 Gateway 停止時手動編輯
才是安全的。建議優先使用 `openclaw cron add/edit` 或 cron
tool call API 進行變更。

## 適合初學者的概述

可以將 cron job 視為：**何時**執行 + **做什麼**。

1. **選擇排程**
   - 一次性提醒 → `schedule.kind = "at"` (CLI: `--at`)
   - 重複性工作 → `schedule.kind = "every"` 或 `schedule.kind = "cron"`
   - 如果您的 ISO 時間戳省略了時區，將被視為 **UTC**。

2. **選擇執行位置**
   - `sessionTarget: "main"` → 在下一次心跳期間以主要內容執行。
   - `sessionTarget: "isolated"` → 在 `cron:<jobId>` 中執行專用的 agent 週期。
   - `sessionTarget: "current"` → 繫結到目前工作階段 (在建立時解析為 `session:<sessionKey>`)。
   - `sessionTarget: "session:custom-id"` → 在持續性的命名工作階段中執行，該工作階段會在執行之間維護內容。

   預設行為 (不變)：
   - `systemEvent` payload 預設為 `main`
   - `agentTurn` payload 預設為 `isolated`

   若要使用目前工作階段繫結，請明確設定 `sessionTarget: "current"`。

3. **選擇 Payload**
   - 主要工作階段 → `payload.kind = "systemEvent"`
   - 隔離工作階段 → `payload.kind = "agentTurn"`

選用：一次性工作 (`schedule.kind = "at"`) 預設會在成功後刪除。設定
`deleteAfterRun: false` 以保留它們 (它們會在成功後停用)。

## 概念

### 工作

Cron job 是一個包含以下內容的儲存紀錄：

- 一個 **排程** (何時應該執行)，
- 一個 **payload** (應該做什麼)，
- 選用的 **傳遞模式** (`announce`、`webhook` 或 `none`)。
- 選用的 **agent 繫結** (`agentId`)：在特定 agent 下執行工作；如果
  缺少或未知，gateway 會退回到預設 agent。

工作由穩定的 `jobId` 識別（由 CLI/Gateway API 使用）。
在代理工具呼叫中，`jobId` 是標準的；為了相容性，舊版 `id` 也被接受。
一次性工作預設在成功後自動刪除；設定 `deleteAfterRun: false` 以保留它們。

### 排程

Cron 支援三種排程類型：

- `at`：透過 `schedule.at` (ISO 8601) 指定的一次性時間戳記。
- `every`：固定間隔 (毫秒)。
- `cron`：5 欄位 cron 表達式（或 6 欄位含秒），可選帶 IANA 時區。

Cron 表達式使用 `croner`。如果省略時區，則使用 Gateway 主機的
本地時區。

為了減少許多 Gateway 在每小時尖峰的負載激增，OpenClaw 對循環的
整點表達式（例如 `0 * * * *`、`0 */2 * * *`）套用長達 5 分鐘的
決定性每個工作交錯視窗。固定小時表達式（例如 `0 7 * * *`）保持精確。

對於任何 cron 排程，您可以使用 `schedule.staggerMs` 設定明確的交錯視窗
（`0` 保持精確計時）。CLI 快捷方式：

- `--stagger 30s`（或 `1m`、`5m`）以設定明確的交錯視窗。
- `--exact` 以強制 `staggerMs = 0`。

### 主執行與隔離執行

#### 主階段作業（系統事件）

主作業將系統事件排入佇列，並可選喚醒心跳執行器。
它們必須使用 `payload.kind = "systemEvent"`。

- `wakeMode: "now"`（預設）：事件觸發立即心跳執行。
- `wakeMode: "next-heartbeat"`：事件等待下一次排程心跳。

當您想要正常心跳提示 + 主階段上下文時，這是最好的選擇。
請參閱 [Heartbeat](/zh-Hant/gateway/heartbeat)。

#### 隔離作業（專用 cron 階段）

隔離作業在階段 `cron:<jobId>` 或自訂階段中執行專用的代理輪次。

關鍵行為：

- 提示詞前綴為 `[cron:<jobId> <job name>]` 以便於追蹤。
- 每次執行都會啟動一個**全新的 session id**（不會延續先前的對話），除非使用自訂 session。
- 自訂 session (`session:xxx`) 會在多次執行之間保留上下文，進而實現諸如基於先前摘要的每日站立會議等工作流程。
- 預設行為：如果省略 `delivery`，隔離任務會發布摘要 (`delivery.mode = "announce"`)。
- `delivery.mode` 決定接下來的動作：
  - `announce`：將摘要傳送至目標頻道，並將簡短摘要發布至主 session。
  - `webhook`：當完成事件包含摘要時，將完成事件 payload POST 到 `delivery.to`。
  - `none`：僅供內部使用（不進行傳送，也不會有主 session 摘要）。
- `wakeMode` 控制主 session 摘要的發布時機：
  - `now`：立即進行 heartbeat。
  - `next-heartbeat`：等待下一次排程的 heartbeat。

請將隔離任務用於那些吵雜、頻繁或屬於「背景雜務」且不應充斥您的主聊天記錄的工作。

### Payload 形狀（執行內容）

支援兩種 payload 類型：

- `systemEvent`：僅限主 session，透過 heartbeat 提示詞進行路由。
- `agentTurn`：僅限隔離 session，執行專屬的 agent 週期。

常見的 `agentTurn` 欄位：

- `message`：必要的文字提示詞。
- `model` / `thinking`：選用覆寫（見下文）。
- `timeoutSeconds`：選用的逾時覆寫。
- `lightContext`：針對不需要注入工作區啟動檔案之任務的選用輕量級啟動模式。

傳送設定：

- `delivery.mode`：`none` | `announce` | `webhook`。
- `delivery.channel`：`last` 或特定頻道。
- `delivery.to`：特定頻道的目標（announce）或 webhook URL（webhook 模式）。
- `delivery.bestEffort`：避免因 announce 傳送失敗而導致任務失敗。

公告傳遞會抑制該次執行的訊息工具傳送；請改用 `delivery.channel`/`delivery.to`
來指定目標聊天。當 `delivery.mode = "none"` 時，不會將摘要發布到主會話。

如果獨立作業省略了 `delivery`，OpenClaw 預設為 `announce`。

#### 公告傳遞流程

當 `delivery.mode = "announce"` 時，cron 會直接透過輸出通道配接器傳遞。
主代理不會被啟動來建立或轉發訊息。

行為詳情：

- 內容：傳遞使用獨立執行的輸出負載（文字/媒體），並搭配正常的分塊和
  通道格式。
- 僅限心跳的回應（沒有真實內容的 `HEARTBEAT_OK`）不會被傳遞。
- 如果獨立執行已透過訊息工具傳送訊息至相同目標，將會
  跳過傳遞以避免重複。
- 遺失或無效的傳遞目標會導致作業失敗，除非 `delivery.bestEffort = true`。
- 僅當 `delivery.mode = "announce"` 時，才會將簡短摘要發布至主會話。
- 主會話摘要會遵循 `wakeMode`：`now` 會觸發立即心跳，
  而 `next-heartbeat` 則會等待下一次排定的心跳。

#### Webhook 傳遞流程

當 `delivery.mode = "webhook"` 時，如果完成事件包含摘要，cron 會將完成事件負載發布至 `delivery.to`。

行為詳情：

- 端點必須是有效的 HTTP(S) URL。
- 在 webhook 模式下不會嘗試通道傳遞。
- 在 webhook 模式下不會發布主會話摘要。
- 如果設定了 `cron.webhookToken`，則 auth 標頭為 `Authorization: Bearer <cron.webhookToken>`。
- 已棄用的後備方案：具有 `notify: true` 的儲存舊版作業仍會發布至 `cron.webhook`（若已設定），並附上警告以便您遷移至 `delivery.mode = "webhook"`。

### 模型與思考覆寫

獨立作業（`agentTurn`）可以覆寫模型與思考層級：

- `model`：供應商/模型字串（例如 `anthropic/claude-sonnet-4-20250514`）或別名（例如 `opus`）
- `thinking`：思考層級（`off`、`minimal`、`low`、`medium`、`high`、`xhigh`；僅限 GPT-5.2 + Codex 模型）

注意：您也可以在主工作階段作業上設定 `model`，但這會變更共用的主工作階段模型。我們建議僅對隔離作業使用模型覆寫，以避免非預期的語境變化。

解析優先順序：

1. 作業 Payload 覆寫（最高優先）
2. Hook 特定的預設值（例如 `hooks.gmail.model`）
3. Agent 設定預設值

### 輕量級啟動語境

隔離作業（`agentTurn`）可以設定 `lightContext: true` 以使用輕量級啟動語境執行。

- 將此用於不需要工作區啟動檔案注入的排程雜務。
- 實務上，嵌入式執行環境會以 `bootstrapContextMode: "lightweight"` 執行，這會刻意將 cron 啟動語境保持為空白。
- CLI 對等指令：`openclaw cron add --light-context ...` 和 `openclaw cron edit --light-context`。

### 傳遞（管道 + 目標）

隔離作業可以透過頂層 `delivery` 設定將輸出傳遞至管道：

- `delivery.mode`：`announce`（管道傳遞）、`webhook`（HTTP POST）或 `none`。
- `delivery.channel`：`whatsapp` / `telegram` / `discord` / `slack` / `mattermost`（外掛） / `signal` / `imessage` / `last`。
- `delivery.to`：管道特定的收件者目標。

`announce` 傳遞僅對隔離作業（`sessionTarget: "isolated"`）有效。
`webhook` 傳遞對主作業和隔離作業均有效。

如果省略 `delivery.channel` 或 `delivery.to`，cron 可以回退到主工作階段的「最後路徑」（Agent 最後回覆的地方）。

目標格式提醒：

- Slack/Discord/Mattermost (plugin) 目標應使用顯式前綴 (例如 `channel:<id>`、`user:<id>`) 以避免歧義。
  Mattermost 純 26 字元 ID 的解析優先順序為 **user-first** (如果使用者存在則為 DM，否則為頻道) — 請使用 `user:<id>` 或 `channel:<id>` 以進行確定性路由。
- Telegram 主題應使用 `:topic:` 格式 (見下文)。

#### Telegram 傳送目標 (主題 / 論壇主題串)

Telegram 透過 `message_thread_id` 支援論壇主題。對於 cron 傳送，您可以將主題/主題串編碼到 `to` 欄位中：

- `-1001234567890` (僅含聊天 ID)
- `-1001234567890:topic:123` (建議：顯式主題標記)
- `-1001234567890:123` (簡寫：數字後綴)

帶前綴的目標，例如 `telegram:...` / `telegram:group:...` 也是可接受的：

- `telegram:group:-1001234567890:topic:123`

## 工具呼叫的 JSON 結構描述

直接呼叫 Gateway `cron.*` 工具 (agent 工具呼叫或 RPC) 時，請使用這些格式。
CLI 旗標接受人類可讀的持續時間，例如 `20m`，但工具呼叫應使用 ISO 8601 字串表示 `schedule.at`，並使用毫秒表示 `schedule.everyMs`。

### cron.add 參數

單次、主要階段作業 (系統事件)：

```json
{
  "name": "Reminder",
  "schedule": { "kind": "at", "at": "2026-02-01T16:00:00Z" },
  "sessionTarget": "main",
  "wakeMode": "now",
  "payload": { "kind": "systemEvent", "text": "Reminder text" },
  "deleteAfterRun": true
}
```

具有傳送功能的週期性獨立作業：

```json
{
  "name": "Morning brief",
  "schedule": { "kind": "cron", "expr": "0 7 * * *", "tz": "America/Los_Angeles" },
  "sessionTarget": "isolated",
  "wakeMode": "next-heartbeat",
  "payload": {
    "kind": "agentTurn",
    "message": "Summarize overnight updates.",
    "lightContext": true
  },
  "delivery": {
    "mode": "announce",
    "channel": "slack",
    "to": "channel:C1234567890",
    "bestEffort": true
  }
}
```

綁定至目前階段的週期性作業 (建立時自動解析)：

```json
{
  "name": "Daily standup",
  "schedule": { "kind": "cron", "expr": "0 9 * * *" },
  "sessionTarget": "current",
  "payload": {
    "kind": "agentTurn",
    "message": "Summarize yesterday's progress."
  }
}
```

自訂持久階段中的週期性作業：

```json
{
  "name": "Project monitor",
  "schedule": { "kind": "every", "everyMs": 300000 },
  "sessionTarget": "session:project-alpha-monitor",
  "payload": {
    "kind": "agentTurn",
    "message": "Check project status and update the running log."
  }
}
```

備註：

- `schedule.kind`：`at` (`at`)、`every` (`everyMs`) 或 `cron` (`expr`，可選 `tz`)。
- `schedule.at` 接受 ISO 8601 格式 (時區為可選；若省略則視為 UTC)。
- `everyMs` 為毫秒。
- `sessionTarget`：`"main"`、`"isolated"`、`"current"` 或 `"session:<custom-id>"`。
- `"current"` 在建立時解析為 `"session:<sessionKey>"`。
- 自訂會話 (`session:xxx`) 在多次執行之間維持持續性的內容。
- 選用欄位：`agentId`、`description`、`enabled`、`deleteAfterRun` (針對 `at` 預設為 true)、
  `delivery`。
- 省略時，`wakeMode` 預設為 `"now"`。

### cron.update 參數

```json
{
  "jobId": "job-123",
  "patch": {
    "enabled": false,
    "schedule": { "kind": "every", "everyMs": 3600000 }
  }
}
```

備註：

- `jobId` 為標準形式；為了相容性，接受 `id`。
- 在修補中使用 `agentId: null` 以清除代理程式綁定。

### cron.run 和 cron.remove 參數

```json
{ "jobId": "job-123", "mode": "force" }
```

```json
{ "jobId": "job-123" }
```

## 儲存與歷史

- 工作儲存：`~/.openclaw/cron/jobs.json` (由 Gateway 管理的 JSON)。
- 執行歷史：`~/.openclaw/cron/runs/<jobId>.jsonl` (JSONL，依大小和行數自動修剪)。
- `sessions.json` 中的隔離 cron 執行會話會由 `cron.sessionRetention` 修剪 (預設 `24h`；設定 `false` 以停用)。
- 覆寫儲存路徑：設定中的 `cron.store`。

## 重試原則

當工作失敗時，OpenClaw 會將錯誤分類為 **暫時性** (可重試) 或 **永久性** (立即停用)。

### 暫時性錯誤 (將重試)

- 速率限制 (429, 要求過多, 資源耗盡)
- 供應商過載 (例如 Anthropic `529 overloaded_error`, 過載回退摘要)
- 網路錯誤 (逾時, ECONNRESET, 擷取失敗, socket)
- 伺服器錯誤 (5xx)
- 與 Cloudflare 相關的錯誤

### 永久性錯誤 (不重試)

- 驗證失敗 (無效的 API 金鑰, 未授權)
- 設定或驗證錯誤
- 其他非暫時性錯誤

### 預設行為 (無設定)

**一次性工作 (`schedule.kind: "at"`):**

- 發生暫時性錯誤時：以指數退避重試最多 3 次 (30秒 → 1分鐘 → 5分鐘)。
- 發生永久性錯誤時：立即停用。
- 成功或跳過時：停用 (若為 `deleteAfterRun: true` 則刪除)。

**週期性工作 (`cron` / `every`):**

- 任何錯誤：在下次排程運行前套用指數退避（30s → 1m → 5m → 15m → 60m）。
- 工作保持啟用狀態；退避在下次成功運行後重置。

設定 `cron.retry` 以覆蓋這些預設值（請參閱 [Configuration](/zh-Hant/automation/cron-jobs#configuration)）。

## 設定

```json5
{
  cron: {
    enabled: true, // default true
    store: "~/.openclaw/cron/jobs.json",
    maxConcurrentRuns: 1, // default 1
    // Optional: override retry policy for one-shot jobs
    retry: {
      maxAttempts: 3,
      backoffMs: [60000, 120000, 300000],
      retryOn: ["rate_limit", "overloaded", "network", "server_error"],
    },
    webhook: "https://example.invalid/legacy", // deprecated fallback for stored notify:true jobs
    webhookToken: "replace-with-dedicated-webhook-token", // optional bearer token for webhook mode
    sessionRetention: "24h", // duration string or false
    runLog: {
      maxBytes: "2mb", // default 2_000_000 bytes
      keepLines: 2000, // default 2000
    },
  },
}
```

執行日誌修剪行為：

- `cron.runLog.maxBytes`：修剪前的最大執行日誌檔案大小。
- `cron.runLog.keepLines`：修剪時，僅保留最新的 N 行。
- 兩者皆適用於 `cron/runs/<jobId>.jsonl` 檔案。

Webhook 行為：

- 建議做法：針對每個工作，使用 `delivery.to: "https://..."` 設定 `delivery.mode: "webhook"`。
- Webhook URL 必須是有效的 `http://` 或 `https://` URL。
- 發佈時，負載為 cron 完成事件的 JSON。
- 如果設定了 `cron.webhookToken`，則驗證標頭為 `Authorization: Bearer <cron.webhookToken>`。
- 如果未設定 `cron.webhookToken`，則不傳送 `Authorization` 標頭。
- 已棄用的後備方案：儲存具有 `notify: true` 的舊版工作，若存在該設定，仍會使用 `cron.webhook`。

完全停用 cron：

- `cron.enabled: false` (設定)
- `OPENCLAW_SKIP_CRON=1` (環境變數)

## 維護

Cron 有兩個內建的維護途徑：隔離的執行階段保留和執行日誌修剪。

### 預設值

- `cron.sessionRetention`：`24h`（設定 `false` 以停用執行階段修剪）
- `cron.runLog.maxBytes`：`2_000_000` 位元組
- `cron.runLog.keepLines`：`2000`

### 運作方式

- 隔離執行會建立階段項目（`...:cron:<jobId>:run:<uuid>`）和文字紀錄檔案。
- 收割者會移除比 `cron.sessionRetention` 更舊的過期執行階段項目。
- 對於不再被階段儲存參照的已移除執行階段，OpenClaw 會將文字紀錄檔案封存，並在同一個保留視窗內清除舊的已刪除封存。
- 在每次附加執行後，會檢查 `cron/runs/<jobId>.jsonl` 的大小：
  - 如果檔案大小超過 `runLog.maxBytes`，則會修剪至最新的 `runLog.keepLines` 行。

### 高頻排程器的效能注意事項

高頻率的 cron 設定可能會產生大量的執行階段和執行日誌佔用空間。雖然已內建維護機制，但寬鬆的限制仍可能造成不必要的 I/O 和清理工作。

注意事項：

- 長時間的 `cron.sessionRetention` 視窗伴隨許多獨立執行
- 高 `cron.runLog.keepLines` 結合大的 `runLog.maxBytes`
- 許多嘈雜的週期性工作寫入同一個 `cron/runs/<jobId>.jsonl`

建議做法：

- 在您的除錯/稽核需求允許的範圍內，盡可能縮短 `cron.sessionRetention`
- 使用適度的 `runLog.maxBytes` 和 `runLog.keepLines` 來限制執行日誌
- 將嘈雜的背景工作移至獨立模式，並使用可避免不必要的頻繁通知的傳遞規則
- 定期使用 `openclaw cron runs` 檢視增長情況，並在日誌變大之前調整保留設定

### 自訂範例

保留執行階段一週並允許較大的執行日誌：

```json5
{
  cron: {
    sessionRetention: "7d",
    runLog: {
      maxBytes: "10mb",
      keepLines: 5000,
    },
  },
}
```

停用獨立執行階段的修剪，但保留執行日誌的修剪：

```json5
{
  cron: {
    sessionRetention: false,
    runLog: {
      maxBytes: "5mb",
      keepLines: 3000,
    },
  },
}
```

針對高負載 cron 使用進行調整（範例）：

```json5
{
  cron: {
    sessionRetention: "12h",
    runLog: {
      maxBytes: "3mb",
      keepLines: 1500,
    },
  },
}
```

## CLI 快速入門

一次性提醒 (UTC ISO，成功後自動刪除)：

```bash
openclaw cron add \
  --name "Send reminder" \
  --at "2026-01-12T18:00:00Z" \
  --session main \
  --system-event "Reminder: submit expense report." \
  --wake now \
  --delete-after-run
```

一次性提醒 (主要階段，立即喚醒)：

```bash
openclaw cron add \
  --name "Calendar check" \
  --at "20m" \
  --session main \
  --system-event "Next heartbeat: check calendar." \
  --wake now
```

週期性獨立工作 (發布至 WhatsApp)：

```bash
openclaw cron add \
  --name "Morning status" \
  --cron "0 7 * * *" \
  --tz "America/Los_Angeles" \
  --session isolated \
  --message "Summarize inbox + calendar for today." \
  --announce \
  --channel whatsapp \
  --to "+15551234567"
```

週期性 cron 工作，指定 30 秒錯開時間：

```bash
openclaw cron add \
  --name "Minute watcher" \
  --cron "0 * * * * *" \
  --tz "UTC" \
  --stagger 30s \
  --session isolated \
  --message "Run minute watcher checks." \
  --announce
```

週期性獨立工作 (傳遞至 Telegram 主題)：

```bash
openclaw cron add \
  --name "Nightly summary (topic)" \
  --cron "0 22 * * *" \
  --tz "America/Los_Angeles" \
  --session isolated \
  --message "Summarize today; send to the nightly topic." \
  --announce \
  --channel telegram \
  --to "-1001234567890:topic:123"
```

帶有模型和思考覆寫的獨立工作：

```bash
openclaw cron add \
  --name "Deep analysis" \
  --cron "0 6 * * 1" \
  --tz "America/Los_Angeles" \
  --session isolated \
  --message "Weekly deep analysis of project progress." \
  --model "opus" \
  --thinking high \
  --announce \
  --channel whatsapp \
  --to "+15551234567"
```

Agent 選擇 (多重 Agent 設定)：

```bash
# Pin a job to agent "ops" (falls back to default if that agent is missing)
openclaw cron add --name "Ops sweep" --cron "0 6 * * *" --session isolated --message "Check ops queue" --agent ops

# Switch or clear the agent on an existing job
openclaw cron edit <jobId> --agent ops
openclaw cron edit <jobId> --clear-agent
```

手動執行 (force 是預設值，使用 `--due` 僅在到期時執行)：

```bash
openclaw cron run <jobId>
openclaw cron run <jobId> --due
```

`cron.run` 現在會在手動執行排入佇列後立即回應，而不是在工作完成之後。成功的佇列回應看起來像 `{ ok: true, enqueued: true, runId }`。如果工作已在執行中，或者 `--due` 發現沒有到期的工作，回應將保持 `{ ok: true, ran: false, reason }`。請使用 `openclaw cron runs --id <jobId>` 或 `cron.runs` gateway 方法來檢視最終完成的項目。

編輯現有工作 (修補欄位)：

```bash
openclaw cron edit <jobId> \
  --message "Updated prompt" \
  --model "opus" \
  --thinking low
```

強制現有的 cron 工作確切按排程執行 (無錯開)：

```bash
openclaw cron edit <jobId> --exact
```

執行記錄：

```bash
openclaw cron runs --id <jobId> --limit 50
```

立即發生的系統事件而不建立工作：

```bash
openclaw system event --mode now --text "Next heartbeat: check battery."
```

## Gateway API 介面

- `cron.list`, `cron.status`, `cron.add`, `cron.update`, `cron.remove`
- `cron.run` (force 或 due), `cron.runs`
  若需在沒有工作的情況下立即觸發系統事件，請使用 [`openclaw system event`](/zh-Hant/cli/system)。

## 疑難排解

### 「沒有任何東西在執行」

- 檢查 cron 是否已啟用：`cron.enabled` 和 `OPENCLAW_SKIP_CRON`。
- 請檢查 Gateway 是否持續在執行中（cron 在 Gateway 程序內部執行）。
- 對於 `cron` 排程：請確認時區 (`--tz`) 與主機時區是否一致。

### 週期性工作在失敗後持續延遲

- OpenClaw 會在週期性工作連續出錯後套用指數退避重試機制：
  30 秒、1 分鐘、5 分鐘、15 分鐘，之後重試間隔為 60 分鐘。
- 退避機制會在下一次成功執行後自動重置。
- 一次性 (`at`) 工作會使用退避機制重試暫時性錯誤（速率限制、過載、網路、server_error）最多 3 次；永久性錯誤則會立即停用。請參閱 [重試政策](/zh-Hant/automation/cron-jobs#retry-policy)。

### Telegram 傳送到錯誤的地方

- 對於論壇主題，請使用 `-100…:topic:<id>` 以確保明確且無歧義。
- 如果您在日誌或儲存的「最後路由」目標中看到 `telegram:...` 前綴，這是正常的；
  cron 傳遞會接受它們，並且仍能正確解析主題 ID。

### Subagent 公告傳遞重試

- 當子代理 執行完成時，閘道會將結果公告給請求者階段。
- 如果公告流程返回 `false`（例如請求者階段忙碌中），閘道會透過 `announceRetryCount` 追蹤並重試最多 3 次。
- 超過 `endedAt` 5 分鐘以上的公告將被強制過期，以防止過期條目無限循環。
- 如果您在日誌中看到重複的公告傳遞，請檢查子代理註冊表中 `announceRetryCount` 值較高的條目。

import footerZhHant from "/components/footer/zh-Hant.mdx";

<footerZhHant />
