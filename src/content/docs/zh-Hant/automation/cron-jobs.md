---
summary: "Gateway 排程器的 Cron 任務 + 喚醒"
read_when:
  - Scheduling background jobs or wakeups
  - Wiring automation that should run with or alongside heartbeats
  - Deciding between heartbeat and cron for scheduled tasks
title: "Cron 任務"
---

# Cron jobs (Gateway scheduler)

> **Cron 與 Heartbeat？** 請參閱 [Cron vs Heartbeat](/en/automation/cron-vs-heartbeat) 以獲取關於何時使用何者的指導。

Cron is the Gateway’s built-in scheduler. It persists jobs, wakes the agent at
the right time, and can optionally deliver output back to a chat.

所有 cron 執行都會建立 [背景任務](/en/automation/tasks) 記錄。主要的差異在於可見性：

- `sessionTarget: "main"` 會建立一個具有 `silent` 通知原則的任務 — 它會為主會話和 heartbeat 流程排定一個系統事件，但不會產生通知。
- `sessionTarget: "isolated"` 或 `sessionTarget: "session:..."` 會建立一個可見的任務，該任務會顯示在 `openclaw tasks` 中並附帶遞送通知。

如果您想要「每天早上執行這個」或「在 20 分鐘後提示 agent」，
cron 就是您要的機制。

疑難排解：[/automation/troubleshooting](/en/automation/troubleshooting)

## 總結 (TL;DR)

- Cron 執行 **於 Gateway 內部**（而非模型內部）。
- 任務會保存在 `~/.openclaw/cron/` 之下，因此重啟不會遺失排程。
- 兩種執行樣式：
  - **主會話**：將一個系統事件加入佇列，然後在下一次 heartbeat 時執行。
  - **獨立**：在 `cron:<jobId>` 或自訂會話中執行專用的 agent 輪次，並附帶遞送功能（預設為公告或無）。
  - **目前會話**：綁定到建立 cron 的會話 (`sessionTarget: "current"`)。
  - **自訂會話**：在持續存在的具名會話中執行 (`sessionTarget: "session:custom-id"`)。
- 喚醒是一等公民：任務可以要求「立即喚醒」相對於「下一次 heartbeat」。
- Webhook 張貼是透過 `delivery.mode = "webhook"` + `delivery.to = "<url>"` 按任務進行的。
- 當設定了 `cron.webhook` 時，針對具有 `notify: true` 的儲存任務，仍保留舊版回退機制，請將這些任務遷移至 webhook 遞送模式。
- 對於升級，`openclaw doctor --fix` 可以正規化舊版 cron 儲存欄位，包括舊的頂層遞送提示，例如 `threadId`。

## 快速開始（可執行）

建立一個一次性提醒，驗證其存在，並立即執行它：

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

排定一個週期性的獨立任務並附帶遞送功能：

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

## 工具呼叫等效項（Gateway cron 工具）

如需標準的 JSON 形狀和範例，請參閱 [工具呼叫的 JSON 結構描述](/en/automation/cron-jobs#json-schema-for-tool-calls)。

## Cron 工作的儲存位置

Cron 工作預設會持久化儲存在 Gateway 主機的 `~/.openclaw/cron/jobs.json`。
Gateway 會將檔案載入記憶體並在變更時寫回，因此只有在 Gateway 停止時手動編輯才是安全的。建議優先使用 `openclaw cron add/edit` 或 cron 工具呼叫 API 進行變更。

## 適合初學者的概覽

您可以將 cron 工作想像為：**何時**執行 + **做什麼**。

1. **選擇排程**
   - 一次性提醒 → `schedule.kind = "at"` (CLI：`--at`)
   - 重複性工作 → `schedule.kind = "every"` 或 `schedule.kind = "cron"`
   - 如果您的 ISO 時間戳記省略了時區，將被視為 **UTC**。

2. **選擇執行位置**
   - `sessionTarget: "main"` → 在下一次心跳期間以主要內容執行。
   - `sessionTarget: "isolated"` → 在 `cron:<jobId>` 中執行專屬的代理程式回合。
   - `sessionTarget: "current"` → 繫結至目前的工作階段（在建立時解析為 `session:<sessionKey>`）。
   - `sessionTarget: "session:custom-id"` → 在持久化的具名工作階段中執行，該工作階段會在多次執行間維護內容。

   預設行為（維持不變）：
   - `systemEvent` Payload 預設為 `main`
   - `agentTurn` Payload 預設為 `isolated`

   若要使用目前的工作階段繫結，請明確設定 `sessionTarget: "current"`。

3. **選擇 Payload**
   - 主要工作階段 → `payload.kind = "systemEvent"`
   - 隔離工作階段 → `payload.kind = "agentTurn"`

選用：一次性工作 (`schedule.kind = "at"`) 預設在成功後會刪除。設定
`deleteAfterRun: false` 以保留它們（它們會在成功後停用）。

## 概念

### 工作

Cron 工作是一項儲存的記錄，包含：

- 一個 **排程**（何時應執行），
- 一個 **Payload**（應做什麼），
- 選用的 **傳遞模式**（`announce`、`webhook` 或 `none`）。
- 選用的 **代理程式繫結** (`agentId`)：在特定代理程式下執行工作；如果
  遺漏或未知，Gateway 將會退回至預設代理程式。

工作由穩定的 `jobId` 識別（由 CLI/Gateway API 使用）。
在代理工具呼叫中，`jobId` 是標準的；為了相容性，接受舊版 `id`。
一次性工作預設在成功後自動刪除；設定 `deleteAfterRun: false` 以保留它們。

### 排程

Cron 支援三種排程類型：

- `at`：透過 `schedule.at` (ISO 8601) 設定一次性時間戳記。
- `every`：固定間隔 (毫秒)。
- `cron`：5 欄位 cron 表達式（或 6 欄位含秒），可選 IANA 時區。

Cron 表達式使用 `croner`。如果省略時區，則使用 Gateway 主機的
本機時區。

為了減少許多 Gateway 在整點時的負載尖峰，OpenClaw 對週期性的
整點表達式（例如 `0 * * * *`、`0 */2 * * *`）套用
決定性、每個工作最多 5 分鐘的交錯視窗。固定小時
表達式（如 `0 7 * * *`）則保持精確。

對於任何 cron 排程，你可以使用 `schedule.staggerMs` 設定明確的交錯視窗
（`0` 保持精確時間）。CLI 快捷方式：

- `--stagger 30s` (或 `1m`、`5m`) 來設定明確的交錯視窗。
- `--exact` 強制執行 `staggerMs = 0`。

### 主執行階段與隔離執行

#### 主階段工作 (系統事件)

主要工作將一個系統事件加入佇列，並可選地喚醒心跳執行器。
它們必須使用 `payload.kind = "systemEvent"`。

- `wakeMode: "now"` (預設)：事件觸發立即心跳執行。
- `wakeMode: "next-heartbeat"`：事件等待下一次排程的心跳。

當你想要正常的心跳提示 + 主階段上下文時，這是最適合的選擇。
參閱 [Heartbeat](/en/gateway/heartbeat)。

主階段 cron 工作會建立具有 `silent` 通知原則的 [背景任務](/en/automation/tasks) 記錄（預設無通知）。它們會出現在 `openclaw tasks list` 中，但不會產生傳送訊息。

#### 隔離式工作（專用的 cron 會話）

隔離式工作在會話 `cron:<jobId>` 中執行專用的 agent 輪次，或是執行自訂會話。

主要行為：

- 為了可追溯性，提示詞會加上 `[cron:<jobId> <job name>]` 前綴。
- 每次執行都會啟動一個**新的會話 ID**（不保留先前的對話內容），除非使用自訂會話。
- 自訂會話（`session:xxx`）會在多次執行之間保留上下文，啟用像是基於先前摘要的每日站立會議等工作流程。
- 預設行為：如果省略 `delivery`，隔離式工作會發布摘要（`delivery.mode = "announce"`）。
- `delivery.mode` 決定接下來發生什麼：
  - `announce`：將摘要傳遞至目標頻道，並將簡短摘要張貼到主會話。
  - `webhook`：當完成事件包含摘要時，將完成事件 payload POST 到 `delivery.to`。
  - `none`：僅限內部（不進行傳遞，不會有主會話摘要）。
- `wakeMode` 控制主會話摘要何時張貼：
  - `now`：立即的心跳。
  - `next-heartbeat`：等待下一次排定的心跳。

將隔離式工作用於不應干擾您主要聊天記錄的嘈雜、頻繁或「背景雜務」。

這些分離的執行會建立可在 `openclaw tasks` 中看到的 [背景任務](/en/automation/tasks) 記錄，並接受任務稽核與維護。

### Payload 形狀（執行內容）

支援兩種 payload 類型：

- `systemEvent`：僅限主會話，透過心跳提示詞路由。
- `agentTurn`：僅限隔離會話，執行專用的 agent 輪次。

常見的 `agentTurn` 欄位：

- `message`：必要的文字提示詞。
- `model` / `thinking`：可選的覆寫設定（見下文）。
- `timeoutSeconds`：可選的逾時覆寫。
- `lightContext`：可選的輕量級啟動模式，適用於不需要工作區啟動檔案注入的工作。
- `toolsAllow`：選用的工具名稱陣列，用於限制該工作可使用的工具（例如 `["exec", "read", "write"]`）。

傳遞設定：

- `delivery.mode`: `none` | `announce` | `webhook`。
- `delivery.channel`: `last` 或特定頻道。
- `delivery.to`：特定頻道的目標（公告）或 Webhook URL（webhook 模式）。
- `delivery.threadId`：當目標頻道支援執行緒傳遞時，選用的明確執行緒或主題 ID。
- `delivery.bestEffort`：若公告傳遞失敗，避免導致工作失敗。

公告傳遞會抑制該執行的訊息工具發送；請改用 `delivery.channel`/`delivery.to`
來指定目標聊天。當 `delivery.mode = "none"` 時，不會將摘要發布至主工作階段。

若對於隔離的工作省略 `delivery`，OpenClaw 會預設為 `announce`。

#### 公告傳遞流程

當 `delivery.mode = "announce"` 時，cron 會直接透過輸出頻道配接器進行傳遞。
不會啟動主要代理程式來製作或轉傳訊息。

行為細節：

- 內容：傳遞使用隔離執行的輸出內容（文字/媒體），並依正常分塊與
  頻道格式化處理。
- 僅有心跳的回應（`HEARTBEAT_OK` 且無實際內容）將不會被傳遞。
- 若隔離執行已透過訊息工具向同一目標發送訊息，則會
  跳過傳遞以避免重複。
- 遺失或無效的傳遞目標會導致工作失敗，除非 `delivery.bestEffort = true`。
- 僅當 `delivery.mode = "announce"` 時，才會將簡短摘要發布至主工作階段。
- 主工作階段摘要會遵守 `wakeMode`：`now` 會觸發立即心跳，
  而 `next-heartbeat` 會等待下一次排程的心跳。

#### Webhook 傳遞流程

當 `delivery.mode = "webhook"` 時，若完成事件包含摘要，cron 會將完成事件內容發布至 `delivery.to`。

行為細節：

- 端點必須是有效的 HTTP(S) URL。
- 在 webhook 模式下不會嘗試進行頻道發送。
- 在 webhook 模式下不會發布主工作階段摘要。
- 如果設定了 `cron.webhookToken`，則標頭為 `Authorization: Bearer <cron.webhookToken>`。
- 已棄用的後備方案：儲存具有 `notify: true` 的舊版工作仍會發布到 `cron.webhook`（如果已設定），並會顯示警告以便您遷移至 `delivery.mode = "webhook"`。

### 模型與思維覆寫

隔離工作 (`agentTurn`) 可以覆寫模型與思維層級：

- `model`：供應商/模型字串 (例如 `anthropic/claude-sonnet-4-20250514`) 或別名 (例如 `opus`)
- `thinking`：思維層級 (`off`、`minimal`、`low`、`medium`、`high`、`xhigh`；僅限 GPT-5.2 + Codex 模型)

注意：您也可以在主工作階段工作上設定 `model`，但這會改變共享的主工作階段模型。我們建議僅對隔離工作使用模型覆寫，以避免非預期的上下文轉移。

解析優先順序：

1. 工作載荷覆寫（最高）
2. 掛鉤特定預設值（例如 `hooks.gmail.model`）
3. 代理程式設定預設值

### 輕量級啟動上下文

隔離工作 (`agentTurn`) 可以設定 `lightContext: true` 以使用輕量級啟動上下文執行。

- 請將此用於不需要工作區啟動檔案注入的定期雜務。
- 實際上，嵌入式執行時期是以 `bootstrapContextMode: "lightweight"` 執行，這會刻意保持 cron 啟動上下文為空。
- CLI 對應項：`openclaw cron add --light-context ...` 和 `openclaw cron edit --light-context`。

### 發送（頻道 + 目標）

隔離工作可以透過頂層 `delivery` 設定將輸出發送到頻道：

- `delivery.mode`：`announce`（頻道發送）、`webhook`（HTTP POST）或 `none`。
- `delivery.channel`: `last` 或任何可傳遞的頻道 ID，例如 `discord`、`matrix`、`telegram` 或 `whatsapp`。
- `delivery.to`：特定頻道的接收目標。
- `delivery.threadId`：針對 Telegram、Slack、Discord 或 Matrix 等頻道的可選主題/討論串覆寫，當您想要特定主題而不將其編碼進 `delivery.to` 時使用。

`announce` 傳遞僅對獨立任務 (`sessionTarget: "isolated"`) 有效。
`webhook` 傳遞對主要和獨立任務均有效。

如果省略了 `delivery.channel` 或 `delivery.to`，cron 可以回退到主要會話的「最後路由」(agent 最後回覆的地方)。

目標格式提醒：

- Slack/Discord/Mattermost (外掛) 目標應使用明確的前綴 (例如 `channel:<id>`、`user:<id>`) 以避免歧義。
  Mattermost 純 26 字元 ID 會被以「使用者優先」解析 (如果使用者存在則為 DM，否則為頻道) — 請使用 `user:<id>` 或 `channel:<id>` 進行確定性路由。
- Telegram 主題應使用 `:topic:` 格式 (見下文)。

#### Telegram 傳遞目標 (主題 / 論壇討論串)

Telegram 透過 `message_thread_id` 支援論壇主題。對於 cron 傳遞，您可以將主題/討論串編碼到 `to` 欄位中：

- `-1001234567890` (僅含聊天 ID)
- `-1001234567890:topic:123` (建議：明確的主題標記)
- `-1001234567890:123` (簡寫：數字後綴)

像 `telegram:...` / `telegram:group:...` 這樣的前綴目標也是可接受的：

- `telegram:group:-1001234567890:topic:123`

## 工具呼叫的 JSON 架構

直接呼叫 Gateway `cron.*` 工具（agent 工具呼叫或 RPC）時，請使用這些格式。
CLI 標誌接受諸如 `20m` 的人類可讀時長，但工具呼叫應對 `schedule.at` 使用 ISO 8601 字串，並對 `schedule.everyMs` 使用毫秒。

### cron.add 參數

一次性、主要 session 工作（系統事件）：

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

具有遞送功能的循環獨立工作：

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

繫結至目前 session 的循環工作（建立時自動解析）：

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

自訂永久 session 中的循環工作：

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
- `schedule.at` 接受 ISO 8601。未含時區的 Tool/API 數值將被視為 UTC；CLI 也接受 `openclaw cron add|edit --at "<offset-less-iso>" --tz <iana>` 用於本地牆鐘一次性工作。
- `everyMs` 為毫秒。
- `sessionTarget`：`"main"`、`"isolated"`、`"current"` 或 `"session:<custom-id>"`。
- `"current"` 會在建立時解析為 `"session:<sessionKey>"`。
- 自訂 session (`session:xxx`) 會在執行之間維護永久語境。
- 可選欄位：`agentId`、`description`、`enabled`、`deleteAfterRun` (針對 `at` 預設為 true)、
  `delivery`、`toolsAllow`。
- `toolsAllow`：可選的工具名稱陣列，用於限制工作可使用的工具 (例如 `["exec", "read"]`)。省略或設定為 `null` 以使用所有工具。
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

- `jobId` 為標準形式；為了相容性，亦接受 `id`。
- 在修補程式 (patch) 中使用 `agentId: null` 以清除代理程式繫結。

### cron.run 和 cron.remove 參數

```json
{ "jobId": "job-123", "mode": "force" }
```

```json
{ "jobId": "job-123" }
```

## 儲存與歷史記錄

- 工作儲存：`~/.openclaw/cron/jobs.json` (Gateway 管理的 JSON)。
- 執行歷史：`~/.openclaw/cron/runs/<jobId>.jsonl` (JSONL，會根據大小和行數自動修剪)。
- `sessions.json` 中的隔離 cron 執行工作階段會由 `cron.sessionRetention` 修剪 (預設為 `24h`；設定 `false` 以停用)。
- 覆寫儲存路徑：設定中的 `cron.store`。

## 重試原則

當工作失敗時，OpenClaw 會將錯誤分類為**暫時性** (可重試) 或**永久性** (立即停用)。

### 暫時性錯誤 (可重試)

- 速率限制 (429, 請求過多, 資源耗盡)
- 提供者過載 (例如 Anthropic `529 overloaded_error`, 過載回退摘要)
- 網路錯誤 (逾時, ECONNRESET, fetch 失敗, socket)
- 伺服器錯誤 (5xx)
- 與 Cloudflare 相關的錯誤

### 永久性錯誤 (不重試)

- 驗證失敗 (無效的 API 金鑰, 未授權)
- 設定或驗證錯誤
- 其他非暫時性錯誤

### 預設行為 (無設定)

**單次工作 (`schedule.kind: "at"`)：**

- 發生暫時性錯誤時：以指數退避重試最多 3 次 (30秒 → 1分鐘 → 5分鐘)。
- 發生永久性錯誤時：立即停用。
- 成功或跳過時：停用 (若 `deleteAfterRun: true` 則刪除)。

**循環工作 (`cron` / `every`)：**

- 發生任何錯誤時：在下次排定的執行前套用指數退避 (30秒 → 1分鐘 → 5分鐘 → 15分鐘 → 60分鐘)。
- 工作保持啟用狀態；退避計時器在下一次成功執行後重置。

設定 `cron.retry` 以覆寫這些預設值 (請參閱 [Configuration](/en/automation/cron-jobs#configuration))。

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

- 建議做法：針對每個工作，設定帶有 `delivery.to: "https://..."` 的 `delivery.mode: "webhook"`。
- Webhook URL 必須是有效的 `http://` 或 `https://` URL。
- 當發布時，payload 是 cron 完成事件 JSON。
- 如果設定了 `cron.webhookToken`，auth header 會是 `Authorization: Bearer <cron.webhookToken>`。
- 如果未設定 `cron.webhookToken`，則不會發送 `Authorization` header。
- 已棄用的後備方案：具有 `notify: true` 的已儲存舊版作業在存在時仍會使用 `cron.webhook`。

完全停用 cron：

- `cron.enabled: false` (config)
- `OPENCLAW_SKIP_CRON=1` (env)

## 維護

Cron 有兩個內建的維護途徑：隔離執行階段保留與執行日誌修剪。

### 預設值

- `cron.sessionRetention`: `24h` (將 `false` 設定為停用執行階段修剪)
- `cron.runLog.maxBytes`: `2_000_000` 位元組
- `cron.runLog.keepLines`: `2000`

### 運作方式

- 隔離執行會建立階段條目 (`...:cron:<jobId>:run:<uuid>`) 和文字記錄檔案。
- Reaper 會移除超過 `cron.sessionRetention` 的過期執行階段條目。
- 對於階段儲存不再參照的已移除執行階段，OpenClaw 會將文字記錄檔案封存，並在相同的保留視窗中清除舊的已刪除封存。
- 在每次執行附加之後，會檢查 `cron/runs/<jobId>.jsonl` 的大小：
  - 如果檔案大小超過 `runLog.maxBytes`，它將被修剪至最新的 `runLog.keepLines` 行。

### 高頻率排程器的效能注意事項

高頻率的 cron 設定可能會產生大量的執行階段和執行日誌佔用空間。雖然已內建維護機制，但寬鬆的限制仍可能造成可避免的 IO 和清理工作。

注意事項：

- 包含許多隔離執行的長 `cron.sessionRetention` 視窗
- 高 `cron.runLog.keepLines` 結合大的 `runLog.maxBytes`
- 許多寫入同一 `cron/runs/<jobId>.jsonl` 的干擾性遞迴作業

建議做法：

- 將 `cron.sessionRetention` 保持在您的除錯/稽核需求允許的範圍內盡可能短
- 使用適中的 `runLog.maxBytes` 和 `runLog.keepLines` 限制執行日誌的大小
- 將干擾性的背景作業移至隔離模式，並使用避免不必要通訊的傳遞規則
- 定期使用 `openclaw cron runs` 檢查增長情況，並在日誌變大之前調整保留設定

### 自訂範例

將執行階段保留一週並允許更大的執行日誌：

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

停用獨立執行階段的清理，但保留執行日誌的清理：

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

針對高頻率 cron 使用進行調整（範例）：

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

一次性提醒（UTC ISO，成功後自動刪除）：

```bash
openclaw cron add \
  --name "Send reminder" \
  --at "2026-01-12T18:00:00Z" \
  --session main \
  --system-event "Reminder: submit expense report." \
  --wake now \
  --delete-after-run
```

一次性提醒（主階段，立即喚醒）：

```bash
openclaw cron add \
  --name "Calendar check" \
  --at "20m" \
  --session main \
  --system-event "Next heartbeat: check calendar." \
  --wake now
```

循環獨立工作（發布到 WhatsApp）：

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

具有明確 30 秒交錯的循環 cron 工作：

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

循環獨立工作（傳送到 Telegram 主題）：

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

具有模型和思考覆寫的獨立工作：

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

代理選擇（多代理設定）：

```bash
# Pin a job to agent "ops" (falls back to default if that agent is missing)
openclaw cron add --name "Ops sweep" --cron "0 6 * * *" --session isolated --message "Check ops queue" --agent ops

# Switch or clear the agent on an existing job
openclaw cron edit <jobId> --agent ops
openclaw cron edit <jobId> --clear-agent
```

工具允許清單（限制工作可使用的工具）：

```bash
# Only allow exec and read tools for this job
openclaw cron add --name "Scoped job" --cron "0 8 * * *" --session isolated --message "Run scoped checks" --tools exec,read

# Update an existing job's tool allowlist
openclaw cron edit <jobId> --tools exec,read,write

# Remove a tool allowlist (use all tools)
openclaw cron edit <jobId> --clear-tools
```

手動執行（預設為強制，使用 `--due` 僅在到期時執行）：

```bash
openclaw cron run <jobId>
openclaw cron run <jobId> --due
```

`cron.run` 現在會在排入手動執行後立即確認，而不是在工作完成後。成功的佇列回應看起來像 `{ ok: true, enqueued: true, runId }`。如果工作正在執行或 `--due` 發現沒有到期的工作，回應將保持 `{ ok: true, ran: false, reason }`。使用 `openclaw cron runs --id <jobId>` 或 `cron.runs` gateway 方法來檢查最終完成的項目。

編輯現有工作（修補欄位）：

```bash
openclaw cron edit <jobId> \
  --message "Updated prompt" \
  --model "opus" \
  --thinking low
```

強制現有的 cron 工作完全按時程執行（無交錯）：

```bash
openclaw cron edit <jobId> --exact
```

執行歷史：

```bash
openclaw cron runs --id <jobId> --limit 50
```

在不建立工作的情況下立即觸發系統事件：

```bash
openclaw system event --mode now --text "Next heartbeat: check battery."
```

## Gateway API 表面

- `cron.list`, `cron.status`, `cron.add`, `cron.update`, `cron.remove`
- `cron.run` (force 或 due), `cron.runs`
  若要不建立工作而立即觸發系統事件，請使用 [`openclaw system event`](/en/cli/system)。

## 疑難排解

### "沒有任何東西在執行"

- 檢查 cron 是否已啟用：`cron.enabled` 和 `OPENCLAW_SKIP_CRON`。
- 檢查 Gateway 是否持續在執行（cron 在 Gateway 程序內部執行）。
- 對於 `cron` 排程：確認時區 (`--tz`) 與主機時區是否一致。

### 循環工作在失敗後持續延遲

- OpenClaw 會在週期性作業連續出錯後套用指數退避重試機制：
  30s、1m、5m、15m，之後每次重試間隔為 60m。
- 在下次成功執行後，退避機制會自動重置。
- 一次性 (`at`) 作業會重試暫時性錯誤 (rate limit、overloaded、network、server_error) 最多 3 次，並採用退避機制；永久性錯誤則會立即停用。請參閱 [重試策略](/en/automation/cron-jobs#retry-policy)。

### Telegram 傳送至錯誤的位置

- 對於論壇主題，請使用 `-100…:topic:<id>` 以確保明確且無歧義。
- 如果您在日誌或儲存的「上次路由」目標中看到 `telegram:...` 前綴，這是正常的；
  cron 傳送功能接受它們，且仍能正確解析主題 ID。

### 子代理公告傳送重試

- 當子代理執行完成時，閘道會將結果公告給請求者工作階段。
- 如果公告流程傳回 `false` (例如請求者工作階段忙碌)，閘道會重試最多 3 次，並透過 `announceRetryCount` 追蹤。
- 超過 `endedAt` 5 分鐘的公告將被強制過期，以防止過時條目無限期循環。
- 如果您在日誌中看到重複的公告傳送，請檢查子代理登錄表中 `announceRetryCount` 值過高的條目。

## 相關

- [自動化總覽](/en/automation) — 快速了解所有自動化機制
- [Cron 與 Heartbeat](/en/automation/cron-vs-heartbeat) — 何時使用何者
- [背景任務](/en/automation/tasks) — cron 執行的任務帳本
- [Heartbeat](/en/gateway/heartbeat) — 週期性主工作階段輪次
- [疑難排解](/en/automation/troubleshooting) — 除錯自動化問題
