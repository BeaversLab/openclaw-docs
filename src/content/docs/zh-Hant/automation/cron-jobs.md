---
summary: "適用於 Gateway 排程器的排程工作、webhook 和 Gmail PubSub 觸發器"
read_when:
  - Scheduling background jobs or wakeups
  - Wiring external triggers (webhooks, Gmail) into OpenClaw
  - Deciding between heartbeat and cron for scheduled tasks
title: "排程任務"
---

# 排程工作 (Cron)

Cron 是 Gateway 的內建排程器。它會持久化工作，在正確的時間喚醒代理，並可以將輸出傳遞回聊天頻道或 webhook 端點。

## 快速入門

```bash
# Add a one-shot reminder
openclaw cron add \
  --name "Reminder" \
  --at "2026-02-01T16:00:00Z" \
  --session main \
  --system-event "Reminder: check the cron docs draft" \
  --wake now \
  --delete-after-run

# Check your jobs
openclaw cron list
openclaw cron show <job-id>

# See run history
openclaw cron runs --id <job-id>
```

## Cron 運作方式

- Cron 在 **Gateway 進程內運行**（而非在模型內）。
- 作業定義會持久保存在 `~/.openclaw/cron/jobs.json` 中，因此重啟不會導致排程遺失。
- 執行時執行狀態會持久保存在其旁邊的 `~/.openclaw/cron/jobs-state.json` 中。如果您在 git 中追蹤 cron 定義，請追蹤 `jobs.json` 並將 `jobs-state.json` 加入 gitignore。
- 拆分後，較舊的 OpenClaw 版本可以讀取 `jobs.json`，但可能會將作業視為全新的，因為執行時欄位現在位於 `jobs-state.json` 中。
- 所有 cron 執行都會建立 [背景任務](/zh-Hant/automation/tasks) 記錄。
- 一次性作業 (`--at`) 預設會在成功後自動刪除。
- 隔離的 cron 執行會在執行完成時盡力關閉為其 `cron:<jobId>` 會話追蹤的瀏覽器分頁/程序，因此分離的瀏覽器自動化不會留下孤兒程序。
- 隔離的 cron 執行也能防止過時的確認回覆。如果第一個結果只是臨時狀態更新 (`on it`、`pulling everything
together` 和類似提示)，並且沒有後代子代理程式執行仍對最終答案負責，OpenClaw 會在交付前重新提示一次以獲得實際結果。

<a id="maintenance"></a>

Cron 的任務協調由執行時擁有：只要 cron 執行時仍追蹤該作業正在運行，活躍的 cron 任務就會保持運作狀態，即使舊的子會話列仍然存在。一旦執行時停止擁有該作業且 5 分鐘的寬限期過期，維護程序可以將任務標記為 `lost`。

## 排程類型

| 種類    | CLI 標誌  | 描述                                             |
| ------- | --------- | ------------------------------------------------ |
| `at`    | `--at`    | 一次性時間戳記 (ISO 8601 或相對時間，例如 `20m`) |
| `every` | `--every` | 固定間隔                                         |
| `cron`  | `--cron`  | 5 欄位或 6 欄位 cron 表達式，可選擇性使用 `--tz` |

沒有時區的時間戳記會被視為 UTC。加入 `--tz America/New_York` 以進行本地牆時鐘排程。

週期性的整點表達式會自動錯開最多 5 分鐘，以減少負載尖峰。請使用 `--exact` 來強制精確時間，或使用 `--stagger 30s` 來指定明確的時間範圍。

### 日期和星期使用 OR 邏輯

Cron 表達式由 [croner](https://github.com/Hexagon/croner) 解析。當日期（Day-of-month）和星期（Day-of-week）欄位皆非萬用字元時，croner 會在 **任一** 欄位匹配時觸發 —— 而非兩者同時匹配。這是標準的 Vixie cron 行為。

```
# Intended: "9 AM on the 15th, only if it's a Monday"
# Actual:   "9 AM on every 15th, AND 9 AM on every Monday"
0 9 15 * 1
```

這會導致每月觸發約 5-6 次，而非每月 0-1 次。OpenClaw 在此使用 Croner 的預設 OR 行為。若要要求兩個條件同時滿足，請使用 Croner 的 `+` 星期修飾符 (`0 9 15 * +1`)，或者在單一欄位排程並在您工作的提示或指令中守衛另一個條件。

## 執行樣式

| 樣式     | `--session` 值      | 執行於              | 最適用於                   |
| -------- | ------------------- | ------------------- | -------------------------- |
| 主要會話 | `main`              | 下一個心跳週期      | 提醒、系統事件             |
| 隔離     | `isolated`          | 專屬 `cron:<jobId>` | 報告、背景雜務             |
| 當前會話 | `current`           | 建立時綁定          | 具備情境感知的週期性工作   |
| 自訂會話 | `session:custom-id` | 具持續性的具名會話  | 基於歷史紀錄構建的工作流程 |

**主要會話** 工作會將系統事件加入佇列，並選擇性喚醒心跳 (`--wake now` 或 `--wake next-heartbeat`)。**隔離** 工作會以全新的會話執行專屬的代理週期。**自訂會話** (`session:xxx`) 會在各次執行間保留情境，啟用諸如每日站會等基於先前摘要的工作流程。

對於隔離工作，執行階段的銷毀現在包含針對該 cron 會話的盡力瀏覽器清理。清理失敗會被忽略，以確保實際的 cron 結果優先輸出。

當隔離 cron 執行協調子代理時，傳遞也會偏好最終的子代輸出而非過時的父代中間文字。如果子代仍在執行中，OpenClaw 會抑制該部分父代更新，而不是將其發布。

### 隔離工作的 Payload 選項

- `--message`：提示文字（隔離模式必填）
- `--model` / `--thinking`：模型和思考層級覆寫
- `--light-context`：跳過工作區引導文件注入
- `--tools exec,read`：限制工作可使用的工具

`--model` 會使用該工作選定的允許模型。如果請求的模型不被允許，cron 會記錄警告並改用回退到該工作的代理程式/預設模型選擇。設定的回退鏈仍然適用，但沒有明確的各工作回退列表的單純模型覆寫，將不再把代理程式主體附加為隱藏的額外重試目標。

獨立工作的模型選擇優先順序為：

1. Gmail hook 模型覆寫（當執行來自 Gmail 且允許該覆寫時）
2. 各工作 payload `model`
3. 儲存的 cron 會話模型覆寫
4. 代理程式/預設模型選擇

快速模式也遵循解析後的即時選擇。如果選定的模型設置有 `params.fastMode`，獨立 cron 預設會使用它。儲存的會話 `fastMode` 覆寫在任一方向上仍優先於設置。

如果獨立執行遇到即時模型切換交接，cron 會使用切換後的供應商/模型重試，並在重試前保存該即時選擇。當切換也帶有新的驗證設定檔時，cron 也會保存該驗證設定檔覆寫。重試是有限制的：在初始嘗試加上 2 次切換重試後，cron 會中止而不是無限循環。

## 傳遞與輸出

| 模式       | 發生情況                                       |
| ---------- | ---------------------------------------------- |
| `announce` | 如果代理程式未發送，則將最終文字回退傳遞至目標 |
| `webhook`  | 將完成事件 payload POST 到 URL                 |
| `none`     | 無執行器回退傳遞                               |

使用 `--announce --channel telegram --to "-1001234567890"` 進行頻道傳遞。對於 Telegram 論壇主題，請使用 `-1001234567890:topic:123`。Slack/Discord/Mattermost 目標應使用明確的前綴 (`channel:<id>`, `user:<id>`)。

對於隔離任務，聊天傳遞是共享的。如果聊天路由可用，即使任務使用 `--no-deliver`，代理也可以使用 `message` 工具。如果代理發送到已配置/當前的目標，OpenClaw 會跳過後備公告。否則 `announce`、`webhook` 和 `none` 僅控制代理回合後執行器對最終回覆的處理方式。

失敗通知遵循單獨的目的地路徑：

- `cron.failureDestination` 為失敗通知設置全域預設值。
- `job.delivery.failureDestination` 會針對每個任務覆蓋該設置。
- 如果兩者均未設置，且任務已透過 `announce` 進行傳遞，則失敗通知現在會回退到該主要公告目標。
- `delivery.failureDestination` 僅在主要傳遞模式為 `webhook` 時，才支援 `sessionTarget="isolated"` 任務。

## CLI 範例

一次性提醒（主會話）：

```bash
openclaw cron add \
  --name "Calendar check" \
  --at "20m" \
  --session main \
  --system-event "Next heartbeat: check calendar." \
  --wake now
```

具有傳遞功能的遞歸隔離任務：

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

帶有模型和思考覆寫的隔離任務：

```bash
openclaw cron add \
  --name "Deep analysis" \
  --cron "0 6 * * 1" \
  --tz "America/Los_Angeles" \
  --session isolated \
  --message "Weekly deep analysis of project progress." \
  --model "opus" \
  --thinking high \
  --announce
```

## Webhooks

Gateway 可以暴露 HTTP webhook 端點供外部觸發器使用。在配置中啟用：

```json5
{
  hooks: {
    enabled: true,
    token: "shared-secret",
    path: "/hooks",
  },
}
```

### 驗證

每個請求必須透過標頭包含 hook token：

- `Authorization: Bearer <token>`（推薦）
- `x-openclaw-token: <token>`

查詢字串 token 將被拒絕。

### POST /hooks/wake

為主會話加入系統事件佇列：

```bash
curl -X POST http://127.0.0.1:18789/hooks/wake \
  -H 'Authorization: Bearer SECRET' \
  -H 'Content-Type: application/json' \
  -d '{"text":"New email received","mode":"now"}'
```

- `text`（必填）：事件描述
- `mode`（選填）：`now`（預設）或 `next-heartbeat`

### POST /hooks/agent

執行隔離的代理回合：

```bash
curl -X POST http://127.0.0.1:18789/hooks/agent \
  -H 'Authorization: Bearer SECRET' \
  -H 'Content-Type: application/json' \
  -d '{"message":"Summarize inbox","name":"Email","model":"openai/gpt-5.4-mini"}'
```

欄位：`message`（必填）、`name`、`agentId`、`wakeMode`、`deliver`、`channel`、`to`、`model`、`thinking`、`timeoutSeconds`。

### 映射的 hooks (POST /hooks/\<name\>)

自訂掛接名稱透過設定中的 `hooks.mappings` 解析。對應可以使用範本或程式碼轉換，將任意承載轉換為 `wake` 或 `agent` 動作。

### 安全性

- 將掛接端點保留在 loopback、tailnet 或信任的 reverse proxy 後方。
- 使用專用的掛接 token；不要重複使用 gateway auth tokens。
- 將 `hooks.path` 保留在專用子路徑上；`/` 會被拒絕。
- 設定 `hooks.allowedAgentIds` 以限制明確的 `agentId` 路由。
- 保持 `hooks.allowRequestSessionKey=false`，除非您需要由呼叫者選擇的 sessions。
- 如果您啟用 `hooks.allowRequestSessionKey`，請同時設定 `hooks.allowedSessionKeyPrefixes` 以限制允許的 session key 格式。
- Hook 承載預設會以安全邊界包裝。

## Gmail PubSub 整合

透過 Google PubSub 將 Gmail 收件箱觸發程序連線至 OpenClaw。

**先決條件**：`gcloud` CLI、`gog` (gogcli)、已啟用 OpenClaw hooks、用於公開 HTTPS 端點的 Tailscale。

### 精靈設定 (推薦)

```bash
openclaw webhooks gmail setup --account openclaw@gmail.com
```

這會寫入 `hooks.gmail` 設定、啟用 Gmail 預設集，並使用 Tailscale Funnel 作為推送端點。

### Gateway 自動啟動

當設定 `hooks.enabled=true` 和 `hooks.gmail.account` 時，Gateway 會在開機時啟動 `gog gmail watch serve` 並自動更新監看。設定 `OPENCLAW_SKIP_GMAIL_WATCHER=1` 以退出。

### 手動一次性設定

1. 選擇擁有 `gog` 所使用 OAuth 用戶端的 GCP 專案：

```bash
gcloud auth login
gcloud config set project <project-id>
gcloud services enable gmail.googleapis.com pubsub.googleapis.com
```

2. 建立主題並授予 Gmail 推送存取權：

```bash
gcloud pubsub topics create gog-gmail-watch
gcloud pubsub topics add-iam-policy-binding gog-gmail-watch \
  --member=serviceAccount:gmail-api-push@system.gserviceaccount.com \
  --role=roles/pubsub.publisher
```

3. 開始監看：

```bash
gog gmail watch start \
  --account openclaw@gmail.com \
  --label INBOX \
  --topic projects/<project-id>/topics/gog-gmail-watch
```

### Gmail 模型覆寫

```json5
{
  hooks: {
    gmail: {
      model: "openrouter/meta-llama/llama-3.3-70b-instruct:free",
      thinking: "off",
    },
  },
}
```

## 管理工作

```bash
# List all jobs
openclaw cron list

# Show one job, including resolved delivery route
openclaw cron show <jobId>

# Edit a job
openclaw cron edit <jobId> --message "Updated prompt" --model "opus"

# Force run a job now
openclaw cron run <jobId>

# Run only if due
openclaw cron run <jobId> --due

# View run history
openclaw cron runs --id <jobId> --limit 50

# Delete a job
openclaw cron remove <jobId>

# Agent selection (multi-agent setups)
openclaw cron add --name "Ops sweep" --cron "0 6 * * *" --session isolated --message "Check ops queue" --agent ops
openclaw cron edit <jobId> --clear-agent
```

模型覆寫說明：

- `openclaw cron add|edit --model ...` 變更工作選取的模型。
- 如果允許該模型，則該特定的 provider/model 會到達獨立的 agent
  執行。
- 如果不允許，cron 會發出警告並回退至工作的 agent/預設
  模型選擇。
- 設定的回退鏈仍然適用，但單純的 `--model` 覆寫且
  沒有明確的個別工作回退清單，將不再作為無額外重試目標
  靜默回退至 agent 主要項目。

## 設定

```json5
{
  cron: {
    enabled: true,
    store: "~/.openclaw/cron/jobs.json",
    maxConcurrentRuns: 1,
    retry: {
      maxAttempts: 3,
      backoffMs: [60000, 120000, 300000],
      retryOn: ["rate_limit", "overloaded", "network", "server_error"],
    },
    webhookToken: "replace-with-dedicated-webhook-token",
    sessionRetention: "24h",
    runLog: { maxBytes: "2mb", keepLines: 2000 },
  },
}
```

執行時狀態 sidecar 源自 `cron.store`：例如 `~/clawd/cron/jobs.json` 這類 `.json` store 會使用 `~/clawd/cron/jobs-state.json`，而不帶 `.json` 後綴的 store 路徑則會附加 `-state.json`。

停用 cron：`cron.enabled: false` 或 `OPENCLAW_SKIP_CRON=1`。

**單次重試**：暫時性錯誤（速率限制、過載、網路、伺服器錯誤）會以指數退避重試最多 3 次。永久性錯誤會立即停用。

**週期性重試**：重試之間使用指數退避（30 秒到 60 分鐘）。退避會在下一次成功執行後重置。

**維護**：`cron.sessionRetention`（預設 `24h`）會修剪隔離執行階段條目。`cron.runLog.maxBytes` / `cron.runLog.keepLines` 會自動修剪執行日誌檔案。

## 疑難排解

### 指令階梯

```bash
openclaw status
openclaw gateway status
openclaw cron status
openclaw cron list
openclaw cron runs --id <jobId> --limit 20
openclaw system heartbeat last
openclaw logs --follow
openclaw doctor
```

### Cron 未觸發

- 檢查 `cron.enabled` 和 `OPENCLAW_SKIP_CRON` 環境變數。
- 確認 Gateway 正在持續執行。
- 對於 `cron` 排程，請驗證時區（`--tz`）與主機時區是否一致。
- 執行輸出中的 `reason: not-due` 表示已透過 `openclaw cron run <jobId> --due` 檢查手動執行，且作業尚未到期。

### Cron 已觸發但未傳遞

- 傳遞模式 `none` 表示不預期有 runner 備援傳送。當聊天路由可用時，代理程式仍可使用 `message` 工具直接傳送。
- 傳遞目標遺失/無效（`channel`/`to`）表示已跳過傳出。
- 頻道驗證錯誤（`unauthorized`、`Forbidden`）表示傳遞被憑證阻擋。
- 如果隔離執行僅回傳靜默令牌（`NO_REPLY` / `no_reply`），
  OpenClaw 會抑制直接傳出傳遞，也會抑制備援
  排隊摘要路徑，因此不會有任何內容張貼回聊天。
- 如果 agent 應該向使用者發送訊息，請檢查工作是否具有可用的
  路由（`channel: "last"` 配合先前的聊天，或明確的頻道/目標）。

### 時區注意事項

- 沒有 `--tz` 的 Cron 會使用 gateway 主機的時區。
- 沒有時區的 `at` 排程會被視為 UTC。
- Heartbeat `activeHours` 使用已配置的時區解析。

## 相關

- [Automation & Tasks](/zh-Hant/automation) — 所有自動化機制總覽
- [Background Tasks](/zh-Hant/automation/tasks) — cron 執行的任務分類帳
- [Heartbeat](/zh-Hant/gateway/heartbeat) — 週期性主會話輪次
- [Timezone](/zh-Hant/concepts/timezone) — 時區配置
