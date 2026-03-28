---
summary: "Cron jobs + wakeups for the Gateway scheduler"
read_when:
  - Scheduling background jobs or wakeups
  - Wiring automation that should run with or alongside heartbeats
  - Deciding between heartbeat and cron for scheduled tasks
title: "Cron Jobs"
---

# Cron jobs (Gateway scheduler)

> **Cron vs Heartbeat?** See [Cron vs Heartbeat](/zh-Hant/automation/cron-vs-heartbeat) for guidance on when to use each.

Cron is the Gateway’s built-in scheduler. It persists jobs, wakes the agent at
the right time, and can optionally deliver output back to a chat.

If you want _“run this every morning”_ or _“poke the agent in 20 minutes”_,
cron is the mechanism.

Troubleshooting: [/automation/troubleshooting](/zh-Hant/automation/troubleshooting)

## TL;DR

- Cron runs **inside the Gateway** (not inside the model).
- Jobs persist under `~/.openclaw/cron/` so restarts don’t lose schedules.
- Two execution styles:
  - **Main session**: enqueue a system event, then run on the next heartbeat.
  - **Isolated**: run a dedicated agent turn in `cron:<jobId>` or a custom session, with delivery (announce by default or none).
  - **Current session**: bind to the session where the cron is created (`sessionTarget: "current"`).
  - **Custom session**: run in a persistent named session (`sessionTarget: "session:custom-id"`).
- Wakeups are first-class: a job can request “wake now” vs “next heartbeat”.
- Webhook posting is per job via `delivery.mode = "webhook"` + `delivery.to = "<url>"`.
- Legacy fallback remains for stored jobs with `notify: true` when `cron.webhook` is set, migrate those jobs to webhook delivery mode.
- For upgrades, `openclaw doctor --fix` can normalize legacy cron store fields before the scheduler touches them.

## Quick start (actionable)

Create a one-shot reminder, verify it exists, and run it immediately:

```exec
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

Schedule a recurring isolated job with delivery:

```exec
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

For the canonical JSON shapes and examples, see [JSON schema for tool calls](/zh-Hant/automation/cron-jobs#json-schema-for-tool-calls).

## Where cron jobs are stored

Cron jobs 預設會持久化在 Gateway 主機的 `~/.openclaw/cron/jobs.json`。
Gateway 會將檔案載入記憶體並在變更時寫回，因此只有在 Gateway 停止時手動編輯才是安全的。建議優先使用 `openclaw cron add/edit` 或 cron 工具呼叫 API 進行變更。

## 新手友善概述

可以將 cron job 視為：**何時**執行 + **做什麼**。

1. **選擇排程**
   - 一次性提醒 → `schedule.kind = "at"` (CLI：`--at`)
   - 重複執行的工作 → `schedule.kind = "every"` 或 `schedule.kind = "cron"`
   - 如果您的 ISO 時間戳記省略了時區，它將被視為 **UTC**。

2. **選擇執行位置**
   - `sessionTarget: "main"` → 在下一次心跳期間以主要語境執行。
   - `sessionTarget: "isolated"` → 在 `cron:<jobId>` 中執行專屬的 agent 週期。
   - `sessionTarget: "current"` → 繫結至目前工作階段（於建立時解析為 `session:<sessionKey>`）。
   - `sessionTarget: "session:custom-id"` → 在持續存在的命名工作階段中執行，該工作階段會在各次執行之間維護上下文。

   預設行為（未變更）：
   - `systemEvent` Payload 預設為 `main`
   - `agentTurn` Payload 預設為 `isolated`

   若要使用目前工作階段繫結，請明確設定 `sessionTarget: "current"`。

3. **選擇 Payload**
   - 主要工作階段 → `payload.kind = "systemEvent"`
   - 隔離工作階段 → `payload.kind = "agentTurn"`

選用：一次性工作（`schedule.kind = "at"`）預設會在成功後刪除。設定
`deleteAfterRun: false` 以保留它們（它們會在成功後停用）。

## 概念

### 工作

Cron 工作是一個具有以下內容的已儲存記錄：

- 一個 **schedule**（何時執行），
- 一個 **payload**（做什麼），
- 可選的 **delivery mode**（`announce`、`webhook` 或 `none`）。
- 可選的 **agent binding**（`agentId`）：在特定代理下執行作業；如果
  遺失或未知，gateway 將回退為預設代理。

作業由穩定的 `jobId` 識別（供 CLI/Gateway API 使用）。
在代理工具呼叫中，`jobId` 是標準的；遺留的 `id` 為相容性而接受。
一次性作業預設在成功後自動刪除；設定 `deleteAfterRun: false` 以保留它們。

### 排程

Cron 支援三種排程類型：

- `at`：透過 `schedule.at`（ISO 8601）進行一次性時間戳記。
- `every`：固定間隔（毫秒）。
- `cron`：5 欄位 cron 運算式（或含秒的 6 欄位），可選 IANA 時區。

Cron 運算式使用 `croner`。若省略時區，則使用 Gateway 主機的本地時區。

為了減少跨多個 Gateway 的整點負載尖峰，OpenClaw 對循環的整點運算式（例如 `0 * * * *`、`0 */2 * * *`）套用長達 5 分鐘的確定性每任務錯開視窗。固定小時運算式（如 `0 7 * * *`）則保持精確。

對於任何 cron 排程，您都可以使用 `schedule.staggerMs` 設定明確的錯開視窗（`0` 可保持精確時間）。CLI 快捷方式：

- `--stagger 30s` (或 `1m`, `5m`) 以設定明確的交錯視窗。
- `--exact` 以強制 `staggerMs = 0`。

### 主工作階段與隔離執行

#### 主工作階段工作 (系統事件)

主工作會將系統事件加入佇列，並可選擇喚醒心跳執行器。
它們必須使用 `payload.kind = "systemEvent"`。

- `wakeMode: "now"` (預設): 事件會觸發立即執行一次心跳。
- `wakeMode: "next-heartbeat"`: 事件會等待下一次排定的心跳。

當您需要正常的心跳提示加上主工作階段上下文時，這是最合適的選擇。
請參閱 [Heartbeat](/zh-Hant/gateway/heartbeat)。

#### 隔離工作 (專用的 cron 工作階段)

隔離工作會在工作階段 `cron:<jobId>` 或自訂工作階段中執行專屬的代理程式回合。

關鍵行為：

- 提示詞以 `[cron:<jobId> <job name>]` 為前綴，以便於追蹤。
- 每次執行都會啟動一個**新的 session id**（不會帶入先前的對話內容），除非使用自訂 session。
- 自訂 session（`session:xxx`）會在執行之間保留上下文，從而啟用諸如基於先前摘要的每日站會等工作流程。
- 預設行為：如果省略 `delivery`，隔離任務會發布摘要（`delivery.mode = "announce"`）。
- `delivery.mode` 決定接下來發生什麼：
  - `announce`：將摘要傳送到目標頻道，並將簡短摘要發布到主 session。
  - `webhook`：當完成事件包含摘要時，將完成事件負載 POST 到 `delivery.to`。
  - `none`：僅限內部（無傳送，無主 session 摘要）。
- `wakeMode` 控制主階段摘要發布的時機：
  - `now`：立即心跳。
  - `next-heartbeat`：等待下一次排程的心跳。

請使用獨立作業來處理那些吵雜、頻繁或不應打擾您主要聊天記錄的「背景雜務」。

### Payload 形狀（執行內容）

支援兩種 Payload 類型：

- `systemEvent`：僅限主階段，透過心跳提示路由。
- `agentTurn`：僅限獨立階段，執行專屬的代理程式回合。

常見的 `agentTurn` 欄位：

- `message`：必要的文字提示。
- `model` / `thinking`：選用覆寫（見下文）。
- `timeoutSeconds`：選用逾時覆寫。
- `lightContext`：可選的輕量級引導模式，適用於不需要工作區引導檔案注入的任務。

傳遞配置：

- `delivery.mode`：`none` | `announce` | `webhook`。
- `delivery.channel`：`last` 或特定頻道。
- `delivery.to`：特定頻道的目標（公告）或 Webhook URL（webhook 模式）。
- `delivery.bestEffort`：如果公告傳遞失敗，避免讓任務失敗。

公告傳遞會抑制該次執行的訊息工具傳送；請改用 `delivery.channel`/`delivery.to`
來指定目標聊天。當 `delivery.mode = "none"` 時，不會將摘要發布到主會話。

如果對於隔離作業省略了 `delivery`，OpenClaw 預設為 `announce`。

#### 公告傳遞流程

當 `delivery.mode = "announce"` 時，cron 會直接透過輸出通道配接器傳遞。主代理程式不會被啟動來製作或轉發訊息。

行為詳情：

- 內容：傳遞使用隔離執行的輸出載荷（文字/媒體），並配合正常的分塊與通道格式化。
- 僅限心跳的回應（`HEARTBEAT_OK` 且無實際內容）將不會被傳遞。
- 如果隔離執行已透過訊息工具向相同目標發送了訊息，則會跳過傳遞以避免重複。
- 遺失或無效的傳遞目標會導致作業失敗，除非 `delivery.bestEffort = true`。
- 僅當 `delivery.mode = "announce"` 時，才會將簡短摘要發佈至主要工作階段。
- 主會話摘要會遵守 `wakeMode`：`now` 會立即觸發心跳，
  而 `next-heartbeat` 會等待下一次排程的心跳。

#### Webhook 傳送流程

當設定 `delivery.mode = "webhook"` 時，當完成事件包含摘要，cron 會將完成事件負載發佈到 `delivery.to`。

行為詳情：

- 端點必須是有效的 HTTP(S) URL。
- 在 webhook 模式下不會嘗試進行頻道傳送。
- 在 webhook 模式下不會張貼主會話摘要。
- 如果設定了 `cron.webhookToken`，認證標頭為 `Authorization: Bearer <cron.webhookToken>`。
- 已棄用的後備方案：儲存的具有 `notify: true` 的舊版作業仍會張貼到 `cron.webhook`（如果已設定），並會顯示警告，以便您遷移到 `delivery.mode = "webhook"`。

### 模型與思考覆寫

隔離任務 (`agentTurn`) 可以覆寫模型和思維層級：

- `model`：提供者/模型字串（例如 `anthropic/claude-sonnet-4-20250514`）或別名（例如 `opus`）
- `thinking`：思維層級（`off`、`minimal`、`low`、`medium`、`high`、`xhigh`；僅限 GPT-5.2 + Codex 模型）

注意：您也可以在主會話任務上設定 `model`，但這會改變共用的主會話模型。我們建議僅對隔離任務使用模型覆寫，以避免非預期的情境變更。

解析優先順序：

1. 任務 Payload 覆寫（最高優先）
2. Hook 特定預設值（例如 `hooks.gmail.model`）
3. Agent 設定預設值

### 輕量級啟動上下文

隔離作業 (`agentTurn`) 可以設定 `lightContext: true` 以使用輕量級啟動上下文執行。

- 將此用於不需要工作區啟動檔案注入的預定雜務。
- 實務上，嵌入式執行環境以 `bootstrapContextMode: "lightweight"` 執行，這會刻意讓 cron 啟動上下文保持空白。
- CLI 對等指令：`openclaw cron add --light-context ...` 和 `openclaw cron edit --light-context`。

### 傳送 (管道 + 目標)

隔離作業可以透過頂層 `delivery` 設定將輸出傳送至管道：

- `delivery.mode`：`announce` (管道傳送)、`webhook` (HTTP POST) 或 `none`。
- `delivery.channel`: `whatsapp` / `telegram` / `discord` / `slack` / `mattermost` (plugin) / `signal` / `imessage` / `last`。
- `delivery.to`：特定通道的接收者目標。

`announce` 傳送僅對隔離作業 (`sessionTarget: "isolated"`) 有效。
`webhook` 傳送對主作業和隔離作業均有效。

如果省略 `delivery.channel` 或 `delivery.to`，cron 可以回退到主會話的「最後路由」（agent 最後回覆的地方）。

目標格式提醒：

- Slack/Discord/Mattermost (外掛程式) 目標應使用明確的前綴（例如 `channel:<id>`、`user:<id>`）以避免歧義。
  Mattermost 純 26 字元 ID 的解析優先順序為「優先使用者」——即若使用者存在則為私訊，否則為頻道。請使用 `user:<id>` 或 `channel:<id>` 進行確定性路由。
- Telegram 主題應使用 `:topic:` 格式（見下文）。

#### Telegram 傳送目標（主題 / 論壇串）

Telegram 透過 `message_thread_id` 支援論壇主題。對於 cron 傳送，您可以將主題/串編碼到 `to` 欄位中：

- `-1001234567890`（僅含聊天 ID）
- `-1001234567890:topic:123`（建議：明確主題標記）
- `-1001234567890:123`（簡寫：數字後綴）

像 `telegram:...` / `telegram:group:...` 這樣加上前綴的目標也被接受：

- `telegram:group:-1001234567890:topic:123`

## 工具呼叫的 JSON 結構描述

直接呼叫 Gateway `cron.*` 工具（agent 工具呼叫或 RPC）時，請使用這些格式。
CLI 標誌接受像 `20m` 這樣的人類可讀時長，但工具呼叫應該使用 ISO 8601 字串
表示 `schedule.at`，並以毫秒表示 `schedule.everyMs`。

### cron.add 參數

單次、主階段作業（系統事件）：

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

具遞送功能的遞迴獨立作業：

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

綁定至目前階段的遞迴作業（建立時自動解析）：

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

位於自訂持久階段中的遞迴作業：

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

註記：

- `schedule.kind`： `at` (`at`)、`every` (`everyMs`) 或 `cron` (`expr`，選用 `tz`)。
- `schedule.at` 接受 ISO 8601 格式（時區為選用；若省略則視為 UTC）。
- `everyMs` 單位為毫秒。
- `sessionTarget`： `"main"`、`"isolated"`、`"current"` 或 `"session:<custom-id>"`。
- `"current"` 在建立時會解析為 `"session:<sessionKey>"`。
- 自訂工作階段 (`session:xxx`) 可在執行之間維持持續性語境。
- 選用欄位：`agentId`、`description`、`enabled`、`deleteAfterRun`（對於 `at` 預設為 true）、
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

注意：

- `jobId` 為標準格式；為了相容性，接受 `id`。
- 在修補程式中使用 `agentId: null` 以清除 agent 繫結。

### cron.run 和 cron.remove 參數

```json
{ "jobId": "job-123", "mode": "force" }
```

```json
{ "jobId": "job-123" }
```

## 儲存與歷程記錄

- 工作儲存庫：`~/.openclaw/cron/jobs.json`（Gateway 管理的 JSON）。
- 執行歷程記錄：`~/.openclaw/cron/runs/<jobId>.jsonl`（JSONL，依大小和行數自動修剪）。
- `sessions.json` 中的獨立 cron 執行階段會由 `cron.sessionRetention` 清理（預設為 `24h`；設定 `false` 以停用）。
- 覆寫儲存路徑：設定中的 `cron.store`。

## 重試政策

當工作失敗時，OpenClaw 會將錯誤分類為**暫時性**（可重試）或**永久性**（立即停用）。

### 暫時性錯誤（可重試）

- 速率限制（429、請求過多、資源耗盡）
- 提供者超載（例如 Anthropic `529 overloaded_error`、超載回退摘要）
- 網路錯誤（逾時、ECONNRESET、fetch 失敗、socket）
- 伺服器錯誤（5xx）
- Cloudflare 相關錯誤

### 永久性錯誤（不重試）

- 驗證失敗（無效的 API 金鑰、未授權）
- 設定或驗證錯誤
- 其他非暫時性錯誤

### 預設行為（無設定）

**單次工作 (`schedule.kind: "at"`):**

- 發生暫時性錯誤時：以指數退避重試最多 3 次 (30s → 1m → 5m)。
- 發生永久性錯誤時：立即停用。
- 成功或跳過時：停用 (如果 `deleteAfterRun: true` 則刪除)。

**循環工作 (`cron` / `every`):**

- 發生任何錯誤時：在下次排程執行前套用指數退避 (30s → 1m → 5m → 15m → 60m)。
- 工作保持啟用；退避機制在下次成功執行後重置。

設定 `cron.retry` 以覆寫這些預設值 (請參閱 [設定](/zh-Hant/automation/cron-jobs#configuration))。

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

- 建議：針對每個作業，使用 `delivery.to: "https://..."` 設定 `delivery.mode: "webhook"`。
- Webhook URL 必須是有效的 `http://` 或 `https://` URL。
- 發佈時，Payload 為 cron 完成事件 JSON。
- 如果設定了 `cron.webhookToken`，則 Auth 標頭為 `Authorization: Bearer <cron.webhookToken>`。
- 如果未設定 `cron.webhookToken`，則不會傳送任何 `Authorization` 標頭。
- 已棄用的後援：具有 `notify: true` 的儲存舊版作業，若存在則仍會使用 `cron.webhook`。

完全停用 cron：

- `cron.enabled: false` (組態)
- `OPENCLAW_SKIP_CRON=1` (環境變數)

## 維護

Cron 有兩個內建的維護途徑：隔離執行階段保留與執行記錄修剪。

### 預設值

- `cron.sessionRetention`：`24h`（設定 `false` 以停用 run-session 清理）
- `cron.runLog.maxBytes`：`2_000_000` 位元組
- `cron.runLog.keepLines`：`2000`

### 運作原理

- 隔離執行會建立 session 項目（`...:cron:<jobId>:run:<uuid>`）和逐字稿檔案。
- reaper 會移除早於 `cron.sessionRetention` 的過期 run-session 項目。
- 對於 session store 不再參照的已移除 run sessions，OpenClaw 會封存逐字稿檔案，並根據相同的保留期視窗清除舊的已刪除封存。
- 在每次執行附加後，會檢查 `cron/runs/<jobId>.jsonl` 的大小：
  - 如果檔案大小超過 `runLog.maxBytes`，會將其修剪至最新的 `runLog.keepLines` 行。

### 高用量排程器的效能注意事項

高頻率的 cron 設定可能會產生大量的執行階段和執行日誌佔用空間。雖然已內建維護機制，但寬鬆的限制仍可能造成可避免的 I/O 與清理工作。

注意事項：

- 具有許多獨立執行的長 `cron.sessionRetention` 時間視窗
- 高 `cron.runLog.keepLines` 結合大的 `runLog.maxBytes`
- 許多雜訊頻繁的循環作業寫入至同一個 `cron/runs/<jobId>.jsonl`

建議做法：

- 在您的除錯/審計需求允許的範圍內，盡量縮短 `cron.sessionRetention`
- 透過適度的 `runLog.maxBytes` 和 `runLog.keepLines` 來限制執行日誌
- 將雜訊頻繁的背景作業移至獨立模式，並使用遞送規則以避免不必要的通訊
- 定期使用 `openclaw cron runs` 檢視成長情況，並在日誌變大之前調整保留設定

### 自訂範例

將執行階段保留一週並允許較大的執行記錄：

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

停用獨立執行階段的修剪，但保留執行記錄的修剪：

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

單次提醒（UTC ISO，成功後自動刪除）：

```exec
openclaw cron add \
  --name "Send reminder" \
  --at "2026-01-12T18:00:00Z" \
  --session main \
  --system-event "Reminder: submit expense report." \
  --wake now \
  --delete-after-run
```

單次提醒（主要階段，立即喚醒）：

```exec
openclaw cron add \
  --name "Calendar check" \
  --at "20m" \
  --session main \
  --system-event "Next heartbeat: check calendar." \
  --wake now
```

週期性獨立任務（發送到 WhatsApp）：

```exec
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

具有明確 30 秒交錯的週期性 cron 任務：

```exec
openclaw cron add \
  --name "Minute watcher" \
  --cron "0 * * * * *" \
  --tz "UTC" \
  --stagger 30s \
  --session isolated \
  --message "Run minute watcher checks." \
  --announce
```

週期性獨立任務（發送到 Telegram 話題）：

```exec
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

具有模型和思考覆寫的獨立任務：

```exec
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

```exec
# Pin a job to agent "ops" (falls back to default if that agent is missing)
openclaw cron add --name "Ops sweep" --cron "0 6 * * *" --session isolated --message "Check ops queue" --agent ops

# Switch or clear the agent on an existing job
openclaw cron edit <jobId> --agent ops
openclaw cron edit <jobId> --clear-agent
```

手動執行（force 是預設值，使用 `--due` 僅在到期時執行）：

```exec
openclaw cron run <jobId>
openclaw cron run <jobId> --due
```

`cron.run` 現在在手動執行排入佇列後立即確認，而不是在作業完成之後。成功的佇列回應看起來像 `{ ok: true, enqueued: true, runId }`。如果作業正在執行，或者 `--due` 發現沒有到期作業，回應將保持 `{ ok: true, ran: false, reason }`。請使用 `openclaw cron runs --id <jobId>` 或 `cron.runs` gateway 方法來檢查最終完成的條目。

編輯現有作業（修補欄位）：

```exec
openclaw cron edit <jobId> \
  --message "Updated prompt" \
  --model "opus" \
  --thinking low
```

強制現有 cron 作業確切按排程執行（無錯開）：

```exec
openclaw cron edit <jobId> --exact
```

執行歷史：

```exec
openclaw cron runs --id <jobId> --limit 50
```

立即系統事件而不建立作業：

```exec
openclaw system event --mode now --text "Next heartbeat: check battery."
```

## Gateway API 介面

- `cron.list`, `cron.status`, `cron.add`, `cron.update`, `cron.remove`
- `cron.run` (force or due), `cron.runs`
  若無工作且需立即處理系統事件，請使用 [`openclaw system event`](/zh-Hant/cli/system)。

## 疑難排解

### "什麼都沒有執行"

- 檢查 cron 是否已啟用：`cron.enabled` 和 `OPENCLAW_SKIP_CRON`。
- 檢查 Gateway 是否持續在執行（cron 執行於 Gateway 程序內部）。
- 對於 `cron` 排程：請確認時區 (`--tz`) 與主機時區。

### 循環工作在失敗後持續延遲

- OpenClaw 在連續錯誤後會對循環工作套用指數退避重試：
  30秒、1分鐘、5分鐘、15分鐘，之後每次重試間隔為 60 分鐘。
- 退避會在下一次成功執行後自動重置。
- 一次性 (`at`) 任務會重試暫時性錯誤（速率限制、過載、網路、server_error）最多 3 次，並具有退避機制；永久錯誤則會立即停用。請參閱[重試政策](/zh-Hant/automation/cron-jobs#retry-policy)。

### Telegram 傳送到錯誤的位置

- 對於論壇主題，請使用 `-100…:topic:<id>`，如此一來便明確且無歧義。
- 如果您在日誌或儲存的「最後路由」目標中看到 `telegram:...` 前綴，這是正常的；
  cron 傳遞會接受它們，並仍能正確解析主題 ID。

### Subagent 公告傳遞重試

- 當 subagent 執行完成時，gateway 會將結果公告給請求者 session。
- 如果公告流程傳回 `false`（例如請求者 session 忙碌），gateway 會重試最多 3 次，並透過 `announceRetryCount` 進行追蹤。
- 超過 `endedAt` 超過 5 分鐘的公告會被強制過期，以防止過時條目無限循環。
- 如果您在日誌中看到重複的公告傳遞，請檢查子代理程式註冊表中具有高 `announceRetryCount` 值的條目。
