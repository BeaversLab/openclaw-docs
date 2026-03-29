---
summary: "Cron jobs + wakeups for the Gateway scheduler"
read_when:
  - Scheduling background jobs or wakeups
  - Wiring automation that should run with or alongside heartbeats
  - Deciding between heartbeat and cron for scheduled tasks
title: "Cron Jobs"
---

# Cron jobs (Gateway scheduler)

> **Cron vs Heartbeat?** See [Cron vs Heartbeat](/en/automation/cron-vs-heartbeat) for guidance on when to use each.

Cron is the Gateway’s built-in scheduler. It persists jobs, wakes the agent at
the right time, and can optionally deliver output back to a chat.

If you want _“run this every morning”_ or _“poke the agent in 20 minutes”_,
cron is the mechanism.

Troubleshooting: [/automation/troubleshooting](/en/automation/troubleshooting)

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

Schedule a recurring isolated job with delivery:

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

For the canonical JSON shapes and examples, see [JSON schema for tool calls](/en/automation/cron-jobs#json-schema-for-tool-calls).

## Where cron jobs are stored

Cron 工作預設會持續儲存在 Gateway 主機的 `~/.openclaw/cron/jobs.json` 中。
Gateway 會將檔案載入記憶體，並在變更時寫回，因此只有在 Gateway 停止時手動編輯才是安全的。建議優先使用 `openclaw cron add/edit` 或 cron
工具呼叫 API 來進行變更。

## 適合初學者的概覽

您可以將 cron 工作視為：**何時**執行 + **做什麼**。

1. **選擇排程**
   - 一次性提醒 → `schedule.kind = "at"` (CLI: `--at`)
   - 重複執行的工作 → `schedule.kind = "every"` 或 `schedule.kind = "cron"`
   - 如果您的 ISO 時間戳記省略了時區，它將被視為 **UTC**。

2. **選擇執行位置**
   - `sessionTarget: "main"` → 在下一次心跳期間以主內容執行。
   - `sessionTarget: "isolated"` → 在 `cron:<jobId>` 中執行專用的 agent 輪次。
   - `sessionTarget: "current"` → 繫結到當前工作階段 (在建立時解析為 `session:<sessionKey>`)。
   - `sessionTarget: "session:custom-id"` → 在持續的命名工作階段中執行，該工作階段會在多次執行間維護內容。

   預設行為 (未改變)：
   - `systemEvent` payload 預設為 `main`
   - `agentTurn` payload 預設為 `isolated`

   若要使用當前工作階段繫結，請明確設定 `sessionTarget: "current"`。

3. **選擇 payload**
   - 主工作階段 → `payload.kind = "systemEvent"`
   - 獨立工作階段 → `payload.kind = "agentTurn"`

選用：一次性工作 (`schedule.kind = "at"`) 預設在成功後會刪除。設定
`deleteAfterRun: false` 可加以保留 (它們會在成功後停用)。

## 概念

### 工作

Cron 工作是一筆包含以下內容的儲存記錄：

- 一個 **排程** (何時應執行)，
- 一個 **payload** (應做什麼)，
- 選用的 **傳遞模式** (`announce`、`webhook` 或 `none`)。
- 選用的 **agent 繫結** (`agentId`)：在特定 agent 下執行工作；如果
  遺失或未知，gateway 將回退到預設 agent。

作業由穩定的 `jobId` 識別（由 CLI/Gateway API 使用）。
在代理工具呼叫中，`jobId` 是標準的；為了相容性，保留的 `id` 也被接受。
一次性作業預設在成功後自動刪除；設定 `deleteAfterRun: false` 以保留它們。

### 排程

Cron 支援三種排程類型：

- `at`：透過 `schedule.at`（ISO 8601）指定的一次性時間戳記。
- `every`：固定間隔（毫秒）。
- `cron`：5 欄位 cron 表達式（或 6 欄位含秒），可選擇搭配 IANA 時區。

Cron 表達式使用 `croner`。如果省略時區，則使用 Gateway 主機的
本機時區。

為了減少許多 Gateway 在整點時的負載尖峰，OpenClaw 針對週期性的
整點表達式（例如 `0 * * * *`、`0 */2 * * *`）會套用
最多 5 分鐘的確定性每作業錯開視窗。固定小時的
表達式（例如 `0 7 * * *`）則保持精確時間。

對於任何 cron 排程，您都可以使用 `schedule.staggerMs`
設定明確的錯開視窗
（`0` 保持精確時間）。CLI 快捷方式：

- `--stagger 30s`（或 `1m`、`5m`）用於設定明確的錯開視窗。
- `--exact` 用於強制設定 `staggerMs = 0`。

### 主執行與隔離執行

#### 主會話作業（系統事件）

主作業會將系統事件加入佇列，並可選擇喚醒心跳執行器。
它們必須使用 `payload.kind = "systemEvent"`。

- `wakeMode: "now"`（預設）：事件觸發立即的心跳執行。
- `wakeMode: "next-heartbeat"`：事件等待下一個排定的心跳。

當您需要正常的心跳提示和主會話內容時，這是最佳選擇。
參閱 [Heartbeat](/en/gateway/heartbeat)。

#### 隔離作業（專用 cron 會話）

隔離作業在會話 `cron:<jobId>` 或自訂會話中執行專用的代理回合。

關鍵行為：

- 提示字首會加上 `[cron:<jobId> <job name>]` 以便追蹤。
- 每次執行都會啟動一個**全新的 session id**（不會延續先前的對話），除非使用自訂 session。
- 自訂 session (`session:xxx`) 會在執行之間保留 context，讓像每日站會這樣能基於先前摘要的工作流程成為可能。
- 預設行為：如果省略了 `delivery`，隔離任務會公告一個摘要 (`delivery.mode = "announce"`)。
- `delivery.mode` 決定了接下來發生什麼：
  - `announce`：將摘要傳遞到目標頻道，並在主 session 發布簡短摘要。
  - `webhook`：當完成事件包含摘要時，將完成事件 payload POST 到 `delivery.to`。
  - `none`：僅限內部（無傳遞，無主 session 摘要）。
- `wakeMode` 控制主 session 摘要何時發布：
  - `now`：立即心跳。
  - `next-heartbeat`：等待下一次排定的心跳。

請對吵雜、頻繁或「背景雜務」使用隔離任務，以避免污染您的主要聊天紀錄。

### Payload 形式 (執行內容)

支援兩種 Payload 種類：

- `systemEvent`：僅限主 session，透過 heartbeat prompt 路由。
- `agentTurn`：僅限隔離 session，執行專用的 agent 輪次。

常見的 `agentTurn` 欄位：

- `message`：必要的文字 prompt。
- `model` / `thinking`：選用覆寫 (見下文)。
- `timeoutSeconds`：選用逾時覆寫。
- `lightContext`：針對不需要工作區 bootstrap 檔案注入的任務，提供選用的輕量級 bootstrap 模式。

傳遞設定：

- `delivery.mode`：`none` | `announce` | `webhook`。
- `delivery.channel`：`last` 或特定頻道。
- `delivery.to`：特定頻道的目標 (公告) 或 webhook URL (webhook 模式)。
- `delivery.bestEffort`：避免因公告傳遞失敗而導致任務失敗。

公告交付會抑制此次執行的訊息工具傳送；請改用 `delivery.channel`/`delivery.to` 來指定目標聊天。當 `delivery.mode = "none"` 時，不會將摘要發布到主會話。

如果針對獨立作業省略了 `delivery`，OpenClaw 預設為 `announce`。

#### 公告交付流程

當 `delivery.mode = "announce"` 時，cron 會透過輸出通道適配器直接進行交付。主代理不會啟動來製作或轉發訊息。

行為詳情：

- 內容：交付使用獨立執行的輸出載荷（文字/媒體），並配合正常分塊和通道格式化。
- 僅限心跳的回應（`HEARTBEAT_OK` 且沒有真實內容）不會被交付。
- 如果獨立執行已透過訊息工具向相同目標發送訊息，將跳過交付以避免重複。
- 除非設定 `delivery.bestEffort = true`，否則遺失或無效的交付目標會導致作業失敗。
- 僅當 `delivery.mode = "announce"` 時，才會將簡短摘要發布到主會話。
- 主會話摘要會遵照 `wakeMode`：`now` 會觸發立即心跳，而 `next-heartbeat` 會等待下一次排程的心跳。

#### Webhook 交付流程

當 `delivery.mode = "webhook"` 時，如果完成事件包含摘要，cron 會將完成事件載荷發布至 `delivery.to`。

行為詳情：

- 端點必須是有效的 HTTP(S) URL。
- 在 webhook 模式下不會嘗試通道交付。
- 在 webhook 模式下不會發布主會話摘要。
- 如果設定了 `cron.webhookToken`，則授權標頭為 `Authorization: Bearer <cron.webhookToken>`。
- 已棄用的後備方案：儲存具有 `notify: true` 的舊版作業仍會發布到 `cron.webhook`（如果已設定），並會顯示警告以便您遷移至 `delivery.mode = "webhook"`。

### 模型與思考覆寫

獨立作業（`agentTurn`）可以覆寫模型與思考等級：

- `model`：供應商/模型字串（例如 `anthropic/claude-sonnet-4-20250514`）或別名（例如 `opus`）
- `thinking`: 思維層級 (`off`, `minimal`, `low`, `medium`, `high`, `xhigh`; 僅限 GPT-5.2 + Codex 模型)

注意：您也可以在主會話作業 上設定 `model`，但這會變更共享的主會話模型。我們建議僅對隔離作業使用模型覆寫，以避免非預期的語境轉移。

解析優先順序：

1. 作業負載覆寫 (最高)
2. Hook 特定的預設值 (例如 `hooks.gmail.model`)
3. Agent 配置預設值

### 輕量級引導語境

隔離作業 (`agentTurn`) 可以設定 `lightContext: true` 以使用輕量級引導語境執行。

- 將此用於不需要工作區引導檔案注入的排程瑣碎任務。
- 實務上，嵌入式執行階段以 `bootstrapContextMode: "lightweight"` 執行，這會刻意保持 cron 引導語境為空。
- CLI 等效指令：`openclaw cron add --light-context ...` 和 `openclaw cron edit --light-context`。

### 傳遞

隔離作業可以透過頂層 `delivery` 配置將輸出傳遞至頻道：

- `delivery.mode`：`announce` (頻道傳遞)、`webhook` (HTTP POST) 或 `none`。
- `delivery.channel`：`whatsapp` / `telegram` / `discord` / `slack` / `signal` / `imessage` / `irc` / `googlechat` / `line` / `last`，以及擴充頻道如 `msteams` / `mattermost` (外掛程式)。
- `delivery.to`：頻道特定的接收者目標。

`announce` 傳遞僅對隔離作業 (`sessionTarget: "isolated"`) 有效。
`webhook` 傳遞對主作業和隔離作業均有效。

如果省略了 `delivery.channel` 或 `delivery.to`，cron 可以回退到主會話的「last route」（代理最後回覆的地方）。

目標格式提醒：

- Slack/Discord/Mattermost (外掛程式) 目標應使用顯式前綴（例如 `channel:<id>`、`user:<id>`）以避免歧義。
  Mattermost 的純 26 字元 ID 優先按 **user** 解析（如果使用者存在則為 DM，否則為頻道）——請使用 `user:<id>` 或 `channel:<id>` 進行確定性路由。
- Telegram 主題應使用 `:topic:` 格式（見下文）。

#### Telegram 傳送目標（主題 / 論壇討論串）

Telegram 透過 `message_thread_id` 支援論壇主題。對於 cron 傳送，您可以將主題/討論串編碼到 `to` 欄位中：

- `-1001234567890` (僅 chat id)
- `-1001234567890:topic:123` (建議：顯式主題標記)
- `-1001234567890:123` (簡寫：數字後綴)

像 `telegram:...` / `telegram:group:...` 這樣的前綴目標也可以被接受：

- `telegram:group:-1001234567890:topic:123`

## 工具呼叫的 JSON 架構

直接呼叫 Gateway `cron.*` 工具（代理工具呼叫或 RPC）時使用這些形狀。
CLI 標誌接受人類可讀的持續時間（如 `20m`），但工具呼叫應使用 ISO 8601 字串表示 `schedule.at`，並使用毫秒表示 `schedule.everyMs`。

### cron.add 參數

一次性、主會話工作（系統事件）：

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

具有傳送功能的遞歸、隔離工作：

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

綁定到當前會話的遞歸工作（建立時自動解析）：

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

自訂持久會話中的遞歸工作：

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

- `schedule.kind`：`at` (`at`)、`every` (`everyMs`) 或 `cron` (`expr`，可選的 `tz`)。
- `schedule.at` 接受 ISO 8601 格式。工具/API 值若沒有時區，會被視為 UTC；CLI 也接受 `openclaw cron add|edit --at "<offset-less-iso>" --tz <iana>` 用於本地牆上時鐘的一次性任務。
- `everyMs` 單位為毫秒。
- `sessionTarget`：`"main"`、`"isolated"`、`"current"` 或 `"session:<custom-id>"`。
- `"current"` 在建立時會解析為 `"session:<sessionKey>"`。
- 自訂工作階段 (`session:xxx`) 在多次執行間維持持續的上下文。
- 選用欄位：`agentId`、`description`、`enabled`、`deleteAfterRun` (針對 `at` 預設為 true)、
  `delivery`。
- `wakeMode` 若省略則預設為 `"now"`。

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

- `jobId` 為標準形式；`id` 為相容性而接受。
- 在補丁中使用 `agentId: null` 以清除代理程式綁定。

### cron.run 與 cron.remove 參數

```json
{ "jobId": "job-123", "mode": "force" }
```

```json
{ "jobId": "job-123" }
```

## 儲存與歷史

- 工作儲存庫：`~/.openclaw/cron/jobs.json` (Gateway 管理的 JSON)。
- 執行歷史：`~/.openclaw/cron/runs/<jobId>.jsonl` (JSONL，依大小與行數自動修剪)。
- `sessions.json` 中的隔離 cron 執行工作階段會依 `cron.sessionRetention` 修剪 (預設 `24h`；設定 `false` 以停用)。
- 覆寫儲存路徑：設定中的 `cron.store`。

## 重試政策

當工作失敗時，OpenClaw 會將錯誤分類為**暫時性** (可重試) 或**永久性** (立即停用)。

### 暫時性錯誤 (將重試)

- 速率限制 (429, 請求過多, 資源耗盡)
- 供應商過載 (例如 Anthropic `529 overloaded_error`，過載回退摘要)
- 網路錯誤 (逾時, ECONNRESET, 取得失敗, socket)
- 伺服器錯誤 (5xx)
- 與 Cloudflare 相關的錯誤

### 永久性錯誤 (不重試)

- 驗證失敗 (無效的 API 金鑰, 未授權)
- 設定或驗證錯誤
- 其他非暫時性錯誤

### 預設行為（無配置）

**一次性工作 (`schedule.kind: "at"`)：**

- 發生暫時性錯誤時：重試最多 3 次，並採用指數退避（30s → 1m → 5m）。
- 發生永久性錯誤時：立即停用。
- 成功或跳過時：停用（若 `deleteAfterRun: true` 則刪除）。

**循環工作 (`cron` / `every`)：**

- 發生任何錯誤時：在下次排定執行前應用指數退避（30s → 1m → 5m → 15m → 60m）。
- 工作保持啟用狀態；退避機制在下次成功執行後重置。

設定 `cron.retry` 以覆寫這些預設值（請參閱[配置](/en/automation/cron-jobs#configuration)）。

## 配置

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
- 發送時，Payload 為 cron 完成事件 JSON。
- 如果設定了 `cron.webhookToken`，認證標頭為 `Authorization: Bearer <cron.webhookToken>`。
- 如果未設定 `cron.webhookToken`，則不會發送 `Authorization` 標頭。
- 已淘汰的備用機制：存有 `notify: true` 的舊版儲存工作在存在時仍會使用 `cron.webhook`。

完全停用 cron：

- `cron.enabled: false` (配置)
- `OPENCLAW_SKIP_CRON=1` (環境變數)

## 維護

Cron 有兩個內建的維護途徑：隔離執行階段保留與執行日誌修剪。

### 預設值

- `cron.sessionRetention`：`24h`（設定 `false` 以停用執行階段修剪）
- `cron.runLog.maxBytes`：`2_000_000` 位元組
- `cron.runLog.keepLines`：`2000`

### 運作方式

- 隔離執行會建立階段項目 (`...:cron:<jobId>:run:<uuid>`) 和文字記錄檔案。
- 清理程式 (reaper) 會移除早於 `cron.sessionRetention` 的過期執行階段項目。
- 對於已移除且不再被會話儲存庫參照的執行會話，OpenClaw 會在相同的保留視窗內封存文字紀錄檔並清除舊的已刪除封存。
- 在每次執行附加後，會檢查 `cron/runs/<jobId>.jsonl` 的大小：
  - 如果檔案大小超過 `runLog.maxBytes`，它會被修剪為最新的 `runLog.keepLines` 行。

### 高流量排程器的效能注意事項

高頻率的 cron 設定會產生大量的執行會話和執行日誌佔用空間。雖然系統內建了維護功能，但寬鬆的限制仍可能造成可避免的 I/O 和清理工作。

注意事項：

- 較長的 `cron.sessionRetention` 視窗且包含許多獨立執行
- 較高的 `cron.runLog.keepLines` 加上較大的 `runLog.maxBytes`
- 許多嘈雜的循環工作寫入同一個 `cron/runs/<jobId>.jsonl`

建議作法：

- 在您的除錯/稽核需求允許的範圍內，盡量縮短 `cron.sessionRetention`
- 使用適中的 `runLog.maxBytes` 和 `runLog.keepLines` 來限制執行日誌的大小
- 將嘈雜的背景工作移至獨立模式，並使用能避免不必要訊息的傳遞規則
- 定期使用 `openclaw cron runs` 檢視增長情況，並在日誌變大之前調整保留設定

### 自訂範例

保留執行會話一週並允許較大的執行日誌：

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

停用獨立執行會話的修剪，但保留執行日誌的修剪：

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

針對高流量 cron 用量的調整（範例）：

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

一次性提醒 (主會話，立即喚醒)：

```bash
openclaw cron add \
  --name "Calendar check" \
  --at "20m" \
  --session main \
  --system-event "Next heartbeat: check calendar." \
  --wake now
```

循環獨立工作 (發布至 WhatsApp)：

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

具有明確 30 秒交錯時間的循環 cron 工作：

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

循環獨立工作 (傳遞至 Telegram 主題)：

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

代理程式選擇 (多代理程式設定)：

```bash
# Pin a job to agent "ops" (falls back to default if that agent is missing)
openclaw cron add --name "Ops sweep" --cron "0 6 * * *" --session isolated --message "Check ops queue" --agent ops

# Switch or clear the agent on an existing job
openclaw cron edit <jobId> --agent ops
openclaw cron edit <jobId> --clear-agent
```

手動執行 (force 為預設值，請使用 `--due` 以僅在到期時執行)：

```bash
openclaw cron run <jobId>
openclaw cron run <jobId> --due
```

`cron.run` 現在會在手動執行排入佇列後立即確認，而不是在工作完成後。成功的佇列回應類似 `{ ok: true, enqueued: true, runId }`。如果工作正在執行，或者 `--due` 發現沒有到期的工作，回應將保持 `{ ok: true, ran: false, reason }`。請使用 `openclaw cron runs --id <jobId>` 或 `cron.runs` gateway 方法來檢查最終完成的條目。

編輯現有工作（修補欄位）：

```bash
openclaw cron edit <jobId> \
  --message "Updated prompt" \
  --model "opus" \
  --thinking low
```

強制現有 cron 工作依確切時間表執行（無錯開）：

```bash
openclaw cron edit <jobId> --exact
```

執行歷史記錄：

```bash
openclaw cron runs --id <jobId> --limit 50
```

立即系統事件，不建立工作：

```bash
openclaw system event --mode now --text "Next heartbeat: check battery."
```

## Gateway API 表面

- `cron.list`, `cron.status`, `cron.add`, `cron.update`, `cron.remove`
- `cron.run` (force 或 due), `cron.runs`
  若無需工作即可立即觸發系統事件，請使用 [`openclaw system event`](/en/cli/system)。

## 疑難排解

### "沒有東西在執行"

- 檢查 cron 是否已啟用：`cron.enabled` 和 `OPENCLAW_SKIP_CRON`。
- 檢查 Gateway 是否持續執行中（cron 在 Gateway 程序內部執行）。
- 針對 `cron` 排程：確認時區 (`--tz`) 與主機時區是否相符。

### 週期性工作在失敗後持續延遲

- OpenClaw 會在週期性工作連續發生錯誤後套用指數退避重試：
  30秒、1分鐘、5分鐘、15分鐘，之後每次重試間隔 60 分鐘。
- 退避機制會在下一次成功執行後自動重置。
- 一次性 (`at`) 工作會重試暫時性錯誤（速率限制、過載、網路、server_error）最多 3 次，並採用退避機制；永久性錯誤則會立即停用。請參閱 [重試政策](/en/automation/cron-jobs#retry-policy)。

### Telegram 傳送到錯誤的地方

- 對於論壇主題，請使用 `-100…:topic:<id>` 以確保明確且無歧義。
- 如果您在日誌或儲存的「最後路由」目標中看到 `telegram:...` 前綴，這是正常的；
  cron 傳遞會接受這些前綴，並且仍然能正確解析主題 ID。

### Subagent 公告傳遞重試

- 當 subagent 執行完成時，gateway 會將結果公告給請求者 session。
- 如果 announce 流程返回 `false`（例如請求者會話忙碌），閘道器會重試最多 3 次，並透過 `announceRetryCount` 進行追蹤。
- 超過 `endedAt` 時間 5 分鐘以上的公告將被強制過期，以防止過時條目無限迴圈。
- 如果您在日誌中看到重複的公告傳遞，請檢查子代理程式登錄表中具有高 `announceRetryCount` 值的條目。
