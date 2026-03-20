---
summary: "Cron jobs + wakeups for the Gateway scheduler"
read_when:
  - 排程背景工作或喚醒
  - 連接應與心跳一起或隨著心跳一起執行的自動化
  - 在排程任務時選擇心跳或 cron
title: "Cron Jobs"
---

# Cron jobs (Gateway scheduler)

> **Cron vs Heartbeat?** 請參閱 [Cron vs Heartbeat](/zh-Hant/automation/cron-vs-heartbeat) 以獲得關於何時使用哪個的指引。

Cron 是 Gateway 內建的排程器。它會保存工作、在正確的時間喚醒代理，並可選擇將輸出傳遞回聊天。

如果您想要 _「每天早上執行這個」_ 或 _「在 20 分鐘後提醒代理」_，
cron 就是這個機制。

故障排除：[/automation/troubleshooting](/zh-Hant/automation/troubleshooting)

## TL;DR

- Cron 在 **Gateway 內部** 執行（而非在模型內部）。
- 工作保存在 `~/.openclaw/cron/` 下，因此重啟不會丟失排程。
- 兩種執行樣式：
  - **Main session**：將系統事件加入佇列，然後在下一次心跳時執行。
  - **Isolated**：在 `cron:<jobId>` 或自訂階段中執行專用的代理回合，並進行傳遞（預設為公告或不進行）。
  - **Current session**：綁定到建立 cron 的階段 (`sessionTarget: "current"`)。
  - **Custom session**：在持續的具名階段中執行 (`sessionTarget: "session:custom-id"`)。
- 喚醒是第一類公民：工作可以請求「立即喚醒」或「下一次心跳」。
- Webhook 張貼是透過 `delivery.mode = "webhook"` + `delivery.to = "<url>"` 針對每個工作進行的。
- 當設定了 `cron.webhook` 時，針對具有 `notify: true` 的已儲存工作，仍保留舊版回退，請將這些工作遷移至 webhook 傳遞模式。
- 對於升級，`openclaw doctor --fix` 可以在排程器接觸舊版 cron 儲存欄位之前將其正規化。

## Quick start (actionable)

建立一次性提醒，驗證其存在，並立即執行它：

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

排程具有傳遞功能的週期性獨立工作：

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

若要查看標準的 JSON 形狀和範例，請參閱 [JSON schema for tool calls](/zh-Hant/automation/cron-jobs#json-schema-for-tool-calls)。

## Where cron jobs are stored

Cron 任務預設會持久化在 Gateway 主機的 `~/.openclaw/cron/jobs.json` 上。
Gateway 會將檔案載入記憶體並在變更時寫回，因此只有在 Gateway 停止時手動編輯才安全。
建議優先使用 `openclaw cron add/edit` 或 cron 工具呼叫 API 進行變更。

## 適合初學者的概覽

將 cron 任務視為：**何時**執行 + **做什麼**。

1. **選擇排程**
   - 一次性提醒 → `schedule.kind = "at"` (CLI: `--at`)
   - 重複執行的任務 → `schedule.kind = "every"` 或 `schedule.kind = "cron"`
   - 如果您的 ISO 時間戳記省略了時區，將被視為 **UTC**。

2. **選擇執行位置**
   - `sessionTarget: "main"` → 在下一次心跳期間以主要內容執行。
   - `sessionTarget: "isolated"` → 在 `cron:<jobId>` 中執行專用的 agent 輪次。
   - `sessionTarget: "current"` → 繫結到當前會話（在建立時解析為 `session:<sessionKey>`）。
   - `sessionTarget: "session:custom-id"` → 在持久的命名會話中執行，該會話在多次執行之間維護內容。

   預設行為（未變更）：
   - `systemEvent` 載荷預設為 `main`
   - `agentTurn` 載荷預設為 `isolated`

   若要使用當前會話繫結，請明確設定 `sessionTarget: "current"`。

3. **選擇載荷**
   - 主要會話 → `payload.kind = "systemEvent"`
   - 獨立會話 → `payload.kind = "agentTurn"`

選用：一次性任務 (`schedule.kind = "at"`) 預設會在成功後刪除。設定
`deleteAfterRun: false` 以保留它們（它們會在成功後停用）。

## 概念

### 任務

Cron 任務是一個包含以下內容的儲存紀錄：

- 一個 **排程** (何時應執行)，
- 一個 **載荷** (應做什麼)，
- 選用的 **傳遞模式** (`announce`、`webhook` 或 `none`)。
- 選用的 **agent 繫結** (`agentId`)：在特定 agent 下執行任務；如果
缺失或未知，gateway 將回退到預設 agent。

作業由穩定的 `jobId` 識別（由 CLI/Gateway API 使用）。
在代理工具呼叫中，`jobId` 是標準形式；為了相容性，接受舊版的 `id`。
一次性作業預設在成功後自動刪除；設定 `deleteAfterRun: false` 以保留它們。

### 排程

Cron 支援三種排程類型：

- `at`：透過 `schedule.at`（ISO 8601）指定的一次性時間戳記。
- `every`：固定間隔（毫秒）。
- `cron`：5 欄位 cron 表達式（或 6 欄位含秒），可選擇搭配 IANA 時區。

Cron 表達式使用 `croner`。如果省略時區，將使用 Gateway 主機的
本機時區。

為了減少跨多個 Gateway 的整點負載尖峰，OpenClaw 會對週期性
整點表達式（例如 `0 * * * *`、`0 */2 * * *`）套用最長 5 分鐘的決定性每作業錯開視窗。固定小時
表達式（例如 `0 7 * * *`）則保持精確。

對於任何 cron 排程，您可以使用 `schedule.staggerMs` 設定明確的錯開視窗
（`0` 則保持精確計時）。CLI 快捷方式：

- `--stagger 30s`（或 `1m`、`5m`）以設定明確的錯開視窗。
- `--exact` 以強制 `staggerMs = 0`。

### 主要與隔離執行

#### 主要會話作業（系統事件）

主要作業會將系統事件加入佇列，並選擇性地喚醒心跳執行器。
它們必須使用 `payload.kind = "systemEvent"`。

- `wakeMode: "now"`（預設）：事件會觸發立即的心跳執行。
- `wakeMode: "next-heartbeat"`：事件會等待下一次排程的心跳。

當您需要正常的心跳提示加上主要會語境境時，這是最佳選擇。
請參閱 [Heartbeat](/zh-Hant/gateway/heartbeat)。

#### 隔離作業（專用 cron 會話）

隔離作業會在會話 `cron:<jobId>` 或自訂會話中執行專用的代理回合。

主要行為：

- 提示會加上 `[cron:<jobId> <job name>]` 前綴以便追蹤。
- 每次執行都會啟動一個**全新的 session id**（不保留先前的對話），除非使用自訂 session。
- 自訂 session (`session:xxx`) 會在執行之間保留上下文，讓像每日站會這樣的工作流程能建立在先前的摘要之上。
- 預設行為：如果省略 `delivery`，隔離作業會發布摘要 (`delivery.mode = "announce"`)。
- `delivery.mode` 決定發生什麼：
  - `announce`：將摘要傳送到目標頻道，並將簡短摘要發布到主 session。
  - `webhook`：當完成事件包含摘要時，將完成事件 payload POST 到 `delivery.to`。
  - `none`：僅限內部（無傳送，無主 session 摘要）。
- `wakeMode` 控制主 session 摘要何時發布：
  - `now`：立即 heartbeat。
  - `next-heartbeat`：等待下一次排程的 heartbeat。

將隔離作業用於喧鬧、頻繁或「背景雜務」，這些作業不應垃圾訊息充斥您的
主要聊天紀錄。

### Payload 形狀（執行內容）

支援兩種 payload 類型：

- `systemEvent`：僅限主 session，透過 heartbeat prompt 路由。
- `agentTurn`：僅限隔離 session，執行專用的 agent 回合。

常見 `agentTurn` 欄位：

- `message`：必要文字 prompt。
- `model` / `thinking`：可選覆寫（見下文）。
- `timeoutSeconds`：可選逾時覆寫。
- `lightContext`：可選輕量級啟動模式，適用於不需要工作區啟動檔案注入的作業。

傳送設定：

- `delivery.mode`：`none` | `announce` | `webhook`。
- `delivery.channel`：`last` 或特定頻道。
- `delivery.to`：特定頻道的目標（announce）或 webhook URL（webhook 模式）。
- `delivery.bestEffort`：如果 announce 傳送失敗，避免讓作業失敗。

公告傳遞會抑制該次執行的訊息工具傳送；請使用 `delivery.channel`/`delivery.to`
改以指定目標聊天。當 `delivery.mode = "none"` 時，不會將摘要發佈至主工作階段。

如果隔離作業省略了 `delivery`，OpenClaw 預設為 `announce`。

#### 公告傳遞流程

當 `delivery.mode = "announce"` 時，cron 會直接透過輸出通道配接器傳遞。
主要代理不會被啟動來建立或轉發訊息。

行為詳情：

- 內容：傳遞使用隔離執行的輸出負載（文字/媒體），並包含正常的分塊和
通道格式化。
- 僅心跳回應（`HEARTBEAT_OK` 且沒有實際內容）不會被傳遞。
- 如果隔離執行已透過訊息工具傳送訊息至相同目標，將會
跳過傳遞以避免重複。
- 遺失或無效的傳遞目標會導致作業失敗，除非設定了 `delivery.bestEffort = true`。
- 僅當 `delivery.mode = "announce"` 時，才會將簡短摘要發佈至主工作階段。
- 主工作階段摘要會遵循 `wakeMode`：`now` 會觸發立即心跳，
而 `next-heartbeat` 則等待下一次排程的心跳。

#### Webhook 傳遞流程

當 `delivery.mode = "webhook"` 時，如果完成事件包含摘要，cron 會將完成事件負載發佈至 `delivery.to`。

行為詳情：

- 端點必須是有效的 HTTP(S) URL。
- 在 webhook 模式下不會嘗試通道傳遞。
- 在 webhook 模式下不會發佈主工作階段摘要。
- 如果設定了 `cron.webhookToken`，則 auth 標頭為 `Authorization: Bearer <cron.webhookToken>`。
- 已棄用的後備方案：具有 `notify: true` 的儲存舊版作業仍會發佈至 `cron.webhook`（如果已設定），並附帶警告以便您遷移至 `delivery.mode = "webhook"`。

### 模型與思考覆寫

隔離作業（`agentTurn`）可以覆寫模型和思考層級：

- `model`：提供者/模型字串（例如 `anthropic/claude-sonnet-4-20250514`）或別名（例如 `opus`）
- `thinking`：思維層級 (`off`、`minimal`、`low`、`medium`、`high`、`xhigh`；僅限 GPT-5.2 + Codex 模型)

注意：您也可以在主會話作業 上設定 `model`，但這會改變共享的主會話模型。我們建議僅對獨立作業使用模型覆寫，以避免意外的情境轉變。

解析優先級：

1. 作業 Payload 覆寫 (最高)
2. Hook 特定預設值 (例如 `hooks.gmail.model`)
3. Agent 配置預設值

### 輕量級啟動情境

獨立作業 (`agentTurn`) 可以設定 `lightContext: true` 以使用輕量級啟動情境執行。

- 將此用於不需要工作區啟動檔案注入的排程雜務。
- 實際上，嵌入式執行時期會以 `bootstrapContextMode: "lightweight"` 執行，這會刻意讓 cron 啟動情境保持空白。
- CLI 對等項：`openclaw cron add --light-context ...` 和 `openclaw cron edit --light-context`。

### 傳遞 (頻道 + 目標)

獨立作業可以透過頂層 `delivery` 配置將輸出傳遞至頻道：

- `delivery.mode`：`announce` (頻道傳遞)、`webhook` (HTTP POST) 或 `none`。
- `delivery.channel`：`whatsapp` / `telegram` / `discord` / `slack` / `mattermost` (外掛程式) / `signal` / `imessage` / `last`。
- `delivery.to`：特定頻道的收件者目標。

`announce` 傳遞僅對獨立作業 (`sessionTarget: "isolated"`) 有效。
`webhook` 傳遞對主作業和獨立作業均有效。

如果省略 `delivery.channel` 或 `delivery.to`，cron 可以退回到主會話的「最後路由」(Agent 最後回覆的地方)。

目標格式提醒：

- Slack/Discord/Mattermost (外掛程式) 目標應使用顯式前綴（例如 `channel:<id>`、`user:<id>`）以避免歧義。
  Mattermost 純 26 字元 ID 的解析優先順序為「使用者優先」（若使用者存在則為私訊，否則為頻道）——請使用 `user:<id>` 或 `channel:<id>` 進行確定性路由。
- Telegram 主題應使用 `:topic:` 格式（見下文）。

#### Telegram 傳送目標（主題 / 論壇主題串）

Telegram 透過 `message_thread_id` 支援論壇主題。對於 cron 傳送，您可以將主題/主題串編碼到 `to` 欄位中：

- `-1001234567890`（僅聊天 ID）
- `-1001234567890:topic:123`（推薦：顯式主題標記）
- `-1001234567890:123`（簡寫：數字後綴）

也接受像 `telegram:...` / `telegram:group:...` 這樣帶前綴的目標：

- `telegram:group:-1001234567890:topic:123`

## 工具呼叫的 JSON 結構描述

直接呼叫 Gateway `cron.*` 工具（代理程式工具呼叫或 RPC）時，請使用這些格式。
  CLI 旗標接受人類可讀的時長，例如 `20m`，但工具呼叫應對 `schedule.at` 使用 ISO 8601 字串，並對 `schedule.everyMs` 使用毫秒。

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

具有傳送功能的循環、獨立作業：

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

綁定到目前階段的循環作業（建立時自動解析）：

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

自訂持久階段中的循環作業：

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

- `schedule.kind`：`at`（`at`）、`every`（`everyMs`）或 `cron`（`expr`，可選 `tz`）。
- `schedule.at` 接受 ISO 8601（時區可選；若省略則視為 UTC）。
- `everyMs` 為毫秒。
- `sessionTarget`：`"main"`、`"isolated"`、`"current"` 或 `"session:<custom-id>"`。
- `"current"` 會在建立時解析為 `"session:<sessionKey>"`。
- 自訂工作階段 (`session:xxx`) 會在多次執行之間維持持續性的上下文。
- 選填欄位：`agentId`、`description`、`enabled`、`deleteAfterRun` (對於 `at` 預設為 true)，
  `delivery`。
- 若省略 `wakeMode`，則預設為 `"now"`。

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

- `jobId` 為標準形式；為相容性亦接受 `id`。
- 在修補 (patch) 中使用 `agentId: null` 以清除代理程式綁定。

### cron.run 與 cron.remove 參數

```json
{ "jobId": "job-123", "mode": "force" }
```

```json
{ "jobId": "job-123" }
```

## 儲存與歷程

- 工作存放區：`~/.openclaw/cron/jobs.json` (由 Gateway 管理的 JSON)。
- 執行歷程：`~/.openclaw/cron/runs/<jobId>.jsonl` (JSONL，依大小與行數自動修剪)。
- `sessions.json` 中的隔離 cron 執行工作階段會由 `cron.sessionRetention` 修剪 (預設 `24h`；設為 `false` 可停用)。
- 覆寫存放區路徑：設定中的 `cron.store`。

## 重試政策

當工作失敗時，OpenClaw 會將錯誤分類為 **暫時性** (可重試) 或 **永久性** (立即停用)。

### 暫時性錯誤 (將重試)

- 速率限制 (429, 過多請求, 資源耗盡)
- 供應商過載 (例如 Anthropic `529 overloaded_error`、過載時的回退摘要)
- 網路錯誤 (逾時、ECONNRESET、擷取失敗、socket)
- 伺服器錯誤 (5xx)
- 與 Cloudflare 相關的錯誤

### 永久性錯誤 (不重試)

- 驗證失敗 (無效的 API 金鑰、未授權)
- 設定或驗證錯誤
- 其他非暫時性錯誤

### 預設行為 (無設定)

**單次工作 (`schedule.kind: "at"`)：**

- 發生暫時性錯誤時：以指數退避重試最多 3 次 (30s → 1m → 5m)。
- 發生永久性錯誤時：立即停用。
- 成功或跳過時：停用 (若為 `deleteAfterRun: true` 則刪除)。

**週期性工作 (`cron` / `every`)：**

- 發生任何錯誤時：在下一次排程執行前套用指數退避 (30s → 1m → 5m → 15m → 60m)。
- 工作保持啟用狀態；退避會在下一次成功執行後重置。

設定 `cron.retry` 以覆寫這些預設值（請參閱[設定](/zh-Hant/automation/cron-jobs#configuration)）。

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

- `cron.runLog.maxBytes`：修剪前執行日誌檔案的最大大小。
- `cron.runLog.keepLines`：修剪時，僅保留最新的 N 行。
- 這兩者都適用於 `cron/runs/<jobId>.jsonl` 檔案。

Webhook 行為：

- 建議做法：針對每個工作設定帶有 `delivery.to: "https://..."` 的 `delivery.mode: "webhook"`。
- Webhook URL 必須是有效的 `http://` 或 `https://` URL。
- 發佈時，payload 為 cron 完成事件 JSON。
- 如果設定了 `cron.webhookToken`，則 auth 標頭為 `Authorization: Bearer <cron.webhookToken>`。
- 如果未設定 `cron.webhookToken`，則不會發送 `Authorization` 標頭。
- 已淘汰的後備機制：儲存具有 `notify: true` 的舊版工作仍會在存在時使用 `cron.webhook`。

完全停用 cron：

- `cron.enabled: false` (設定)
- `OPENCLAW_SKIP_CRON=1` (環境變數)

## 維護

Cron 有兩個內建的維護途徑：隔離執行階段保留和執行日誌修剪。

### 預設值

- `cron.sessionRetention`： `24h` (設定 `false` 以停用執行階段修剪)
- `cron.runLog.maxBytes`： `2_000_000` 位元組
- `cron.runLog.keepLines`： `2000`

### 運作方式

- 隔離執行會建立階段項目 (`...:cron:<jobId>:run:<uuid>`) 和文字記錄檔案。
- 清除器會移除早於 `cron.sessionRetention` 的過期執行階段項目。
- 對於階段儲存中不再參照的已移除執行階段，OpenClaw 會將文字記錄檔案封存，並在同一保留視窗內清除舊的已刪除封存。
- 每次執行附加後，會檢查 `cron/runs/<jobId>.jsonl` 的大小：
  - 如果檔案大小超過 `runLog.maxBytes`，則會修剪至最新的 `runLog.keepLines` 行。

### 高用量排程器的效能須知

高頻率的 cron 設定會產生大量的執行階段和執行日誌佔用空間。雖然已內建維護機制，但寬鬆的限制仍可能造成可避免的 IO 和清理工作。

注意事項：

- 具有許多隔離執行的長 `cron.sessionRetention` 視窗
- 高 `cron.runLog.keepLines` 結合大的 `runLog.maxBytes`
- 許多寫入同一個 `cron/runs/<jobId>.jsonl` 的嘈雜週期性工作

解決方案：

- 在您的除錯/稽核需求允許範圍內，將 `cron.sessionRetention` 保持越短越好
- 使用適中的 `runLog.maxBytes` 和 `runLog.keepLines` 來限制執行日誌
- 將嘈雜的背景工作移至隔離模式，並使用能避免不必要閒聊的傳遞規則
- 定期使用 `openclaw cron runs` 檢視成長情況，並在日誌變大之前調整保留設定

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

停用隔離執行階段的修剪，但保留執行日誌的修剪：

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

針對大量 cron 使用進行調整（範例）：

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

一次性提醒（主會話，立即喚醒）：

```bash
openclaw cron add \
  --name "Calendar check" \
  --at "20m" \
  --session main \
  --system-event "Next heartbeat: check calendar." \
  --wake now
```

週期性隔離工作（廣播至 WhatsApp）：

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

具有明確 30 秒交錯的週期性 cron 工作：

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

週期性隔離工作（傳遞至 Telegram 主題）：

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

具有模型和思考覆寫的隔離工作：

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

手動執行（預設為強制，使用 `--due` 僅在到期時執行）：

```bash
openclaw cron run <jobId>
openclaw cron run <jobId> --due
```

`cron.run` 現在會在排入手動執行後立即回應，而非等待工作完成。成功的佇列回應看起來像 `{ ok: true, enqueued: true, runId }`。如果工作正在執行，或是 `--due` 發現沒有到期的工作，回應將維持 `{ ok: true, ran: false, reason }`。使用 `openclaw cron runs --id <jobId>` 或 `cron.runs` gateway 方法來檢查最終完成的項目。

編輯現有工作（修補欄位）：

```bash
openclaw cron edit <jobId> \
  --message "Updated prompt" \
  --model "opus" \
  --thinking low
```

強制現有的 cron 工作確切依照排程執行（無交錯）：

```bash
openclaw cron edit <jobId> --exact
```

執行歷史：

```bash
openclaw cron runs --id <jobId> --limit 50
```

不建立工作的即時系統事件：

```bash
openclaw system event --mode now --text "Next heartbeat: check battery."
```

## Gateway API 介面

- `cron.list`、`cron.status`、`cron.add`、`cron.update`、`cron.remove`
- `cron.run`（force 或 due）、`cron.runs`
  對於沒有作業的即時系統事件，請使用 [`openclaw system event`](/zh-Hant/cli/system)。

## 疑難排解

### "沒有任何東西在執行"

- 檢查 cron 是否已啟用：`cron.enabled` 和 `OPENCLAW_SKIP_CRON`。
- 檢查 Gateway 是否持續在執行（cron 在 Gateway 程序內執行）。
- 對於 `cron` 排程：確認時區 (`--tz`) 與主機時區是否一致。

### 週期性作業在失敗後持續延遲

- OpenClaw 在週期性作業連續出錯後會套用指數退避重試機制：
  30s、1m、5m、15m，然後重試間隔為 60m。
- 退避機制會在下一次成功執行後自動重置。
- 一次性 (`at`) 作業會對暫時性錯誤（速率限制、過載、網路、server_error）進行最多 3 次重試並套用退避；永久性錯誤則會立即停用。請參閱[重試政策](/zh-Hant/automation/cron-jobs#retry-policy)。

### Telegram 傳送到錯誤的位置

- 對於論壇主題，請使用 `-100…:topic:<id>` 以確保明確且無歧義。
- 如果您在日誌或儲存的「last route」目標中看到 `telegram:...` 前綴，這是正常的；
  cron 傳遞接受它們，並且仍然能正確解析主題 ID。

### Subagent 公告傳遞重試

- 當 subagent 執行完成時，gateway 會將結果公告給請求者 session。
- 如果公告流程傳回 `false`（例如請求者 session 正忙），gateway 會透過 `announceRetryCount` 追蹤最多重試 3 次。
- 超過 `endedAt` 5 分鐘的公告將被強制過期，以防止過期條目無限迴圈。
- 如果您在日誌中看到重複的公告傳遞，請檢查 subagent 註冊表中具有高 `announceRetryCount` 值的條目。

import en from "/components/footer/en.mdx";

<en />
