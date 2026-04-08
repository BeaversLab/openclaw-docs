---
summary: "排程工作、Webhook 和 Gmail PubSub 觸發器，適用於 Gateway 排程器"
read_when:
  - Scheduling background jobs or wakeups
  - Wiring external triggers (webhooks, Gmail) into OpenClaw
  - Deciding between heartbeat and cron for scheduled tasks
title: "排程工作"
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

# See run history
openclaw cron runs --id <job-id>
```

## Cron 運作方式

- Cron 在 **Gateway 進程內運行**（而非在模型內）。
- 工作會持久化於 `~/.openclaw/cron/jobs.json`，因此重啟不會遺失排程。
- 所有 cron 執行都會建立 [background task](/en/automation/tasks) 記錄。
- 一次性工作 (`--at`) 預設在成功後會自動刪除。
- 隔離的 cron 執行會在執行完成時，盡力關閉其 `cron:<jobId>` 工作階段追蹤的瀏覽器分頁/進程，因此分離的瀏覽器自動化不會留下遺留的進程。
- 隔離的 cron 執行也能防止過時的確認回覆。如果
  第一個結果只是暫時的狀態更新 (`on it`、`pulling everything
together` 和類似提示)，且沒有子代理執行仍然
  負責最終答案，OpenClaw 會在傳送前重新提示一次以取得實際
  結果。

Cron 的工作協調是由執行時期擁有的：只要
cron 執行時期仍將該工作追蹤為正在運行，活動的 cron 工作就會保持活躍，即使舊的子工作階段記錄仍然存在。
一旦執行時期停止擁有該工作且 5 分鐘的寬限期滿，維護程序就可以
將工作標記為 `lost`。

## 排程類型

| 類型    | CLI 標誌  | 描述                                               |
| ------- | --------- | -------------------------------------------------- |
| `at`    | `--at`    | 一次性時間戳記 (ISO 8601 或相對時間如 `20m`)       |
| `every` | `--every` | 固定間隔                                           |
| `cron`  | `--cron`  | 5 欄位或 6 欄位的 cron 表達式，可選擇性加入 `--tz` |

沒有時區的時間戳記會被視為 UTC。請加入 `--tz America/New_York` 以進行本地時鐘排程。

每小時遞回表達式會自動錯開最多 5 分鐘，以減少負載尖峰。使用 `--exact` 強制精確計時，或使用 `--stagger 30s` 指定明確的時間範圍。

## 執行樣式

| 樣式     | `--session` 數值    | 執行於              | 最適用於                     |
| -------- | ------------------- | ------------------- | ---------------------------- |
| 主要階段 | `main`              | 下一次心跳週期      | 提醒、系統事件               |
| 隔離     | `isolated`          | 專用 `cron:<jobId>` | 報告、背景雜務               |
| 目前階段 | `current`           | 於建立時綁定        | 具備情境感知的遞回工作       |
| 自訂階段 | `session:custom-id` | 具持久性的命名階段  | 建立在歷史紀錄之上的工作流程 |

**主要階段** 工作會將系統事件加入佇列，並選擇性地喚醒心跳 (`--wake now` 或 `--wake next-heartbeat`)。**隔離** 工作會以全新階段執行專用的代理程式週期。**自訂階段** (`session:xxx`) 會在執行之間保留情境，從而啟用諸如建立在先前摘要之上的每日站會等工作流程。

對於隔離工作，執行階段終止現在包含針對該 cron 階段的盡力瀏覽器清理。清理失敗會被忽略，以便實際的 cron 結果優先生效。

當隔離 cron 執行協調子代理程式時，傳遞也會優先使用最終後代輸出，而非過時的父項中間文字。如果後代仍在執行，OpenClaw 會隱藏該部分父項更新，而不發布通知。

### 隔離工作的 Payload 選項

- `--message`：提示文字 (隔離工作必填)
- `--model` / `--thinking`：模型與思考層級覆寫
- `--light-context`：跳過工作區啟動檔案注入
- `--tools exec,read`：限制工作可使用的工具

`--model` 會使用該工作選取的允許模型。如果請求的模型不被允許，cron 會記錄警告並改為回退至工作的代理程式/預設模型選擇。設定的回退鏈仍然適用，但沒有明確每工作回退清單的純模型覆寫，將不再附加代理程式主要模型作為隱藏的額外重試目標。

隔離作業的模型選擇優先順序為：

1. Gmail 掛鉤模型覆寫（當執行來自 Gmail 且允許該覆寫時）
2. 各個作業的 Payload `model`
3. 已儲存的 cron 會話模型覆寫
4. 代理程式/預設模型選擇

快速模式也遵循解析出的即時選擇。如果選取的模型設定
有 `params.fastMode`，隔離的 cron 預設會使用該設定。已儲存的會話
`fastMode` 覆寫在任一方向下仍優先於設定。

如果隔離執行遇到即時模型切換交機，cron 會使用切換後的
供應商/模型重試，並在重試前保存該即時選擇。當切換
同時包含新的認證設定檔時，cron 也會保存該認證設定檔
覆寫。重試是有次數限制的：在初始嘗試加上 2 次切換
重試後，cron 會中止執行，而不是無限循環。

## 傳遞與輸出

| 模式       | 發生情況                                 |
| ---------- | ---------------------------------------- |
| `announce` | 將摘要傳遞至目標頻道（隔離作業的預設值） |
| `webhook`  | 將已完成的事件 Payload POST 到 URL       |
| `none`     | 僅限內部，無傳遞                         |

請使用 `--announce --channel telegram --to "-1001234567890"` 進行頻道傳遞。對於 Telegram 論壇主題，請使用 `-1001234567890:topic:123`。Slack/Discord/Mattermost 目標應使用明確前綴（`channel:<id>`、`user:<id>`）。

對於 cron 擁有的隔離作業，執行器擁有最終傳遞路徑。會
提示代理程式返回純文字摘要，然後該摘要會透過
`announce`、`webhook` 發送，或針對 `none` 保留在內部。`--no-deliver`
不會將傳遞交還給代理程式；它會將執行保持在內部。

如果原始任務明確指示要傳送訊息給某個外部接收者，
代理程式應在其輸出中註明該訊息應發送給誰/何處，
而不是嘗試直接發送。

失敗通知遵循單獨的目的地路徑：

- `cron.failureDestination` 設定失敗通知的全域預設值。
- `job.delivery.failureDestination` 會針對每個作業覆寫該設定。
- 如果兩者都未設定，且工作已透過 `announce` 傳送，失敗通知現在會回退到該主要公告目標。
- 除非主要傳送模式是 `webhook`，否則 `delivery.failureDestination` 僅支援 `sessionTarget="isolated"` 工作。

## CLI 範例

一次性提醒（主要工作階段）：

```bash
openclaw cron add \
  --name "Calendar check" \
  --at "20m" \
  --session main \
  --system-event "Next heartbeat: check calendar." \
  --wake now
```

具傳送功能的週期性獨立工作：

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
  --announce
```

## Webhooks

Gateway 可以公開 HTTP webhook 端點以供外部觸發。在設定中啟用：

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

查詢字串 tokens 將被拒絕。

### POST /hooks/wake

將系統事件加入主要工作階段的佇列：

```bash
curl -X POST http://127.0.0.1:18789/hooks/wake \
  -H 'Authorization: Bearer SECRET' \
  -H 'Content-Type: application/json' \
  -d '{"text":"New email received","mode":"now"}'
```

- `text`（必填）：事件描述
- `mode`（選填）：`now`（預設）或 `next-heartbeat`

### POST /hooks/agent

執行獨立的代理程序回合：

```bash
curl -X POST http://127.0.0.1:18789/hooks/agent \
  -H 'Authorization: Bearer SECRET' \
  -H 'Content-Type: application/json' \
  -d '{"message":"Summarize inbox","name":"Email","model":"openai/gpt-5.4-mini"}'
```

欄位：`message`（必填）、`name`、`agentId`、`wakeMode`、`deliver`、`channel`、`to`、`model`、`thinking`、`timeoutSeconds`。

### 映射的 hooks（POST /hooks/\<name\>）

自訂 hook 名稱透過設定中的 `hooks.mappings` 解析。映射可以使用範本或程式碼轉換，將任意 payload 轉換為 `wake` 或 `agent` 動作。

### 安全性

- 將 hook 端點保持在 loopback、tailnet 或受信任的反向代理後面。
- 使用專用的 hook token；請勿重複使用 gateway auth tokens。
- 將 `hooks.path` 保留在專用的子路徑上；`/` 會被拒絕。
- 設定 `hooks.allowedAgentIds` 以限制明確的 `agentId` 路由。
- 除非您需要由呼叫者選擇的工作階段，否則請保持 `hooks.allowRequestSessionKey=false`。
- 如果您啟用 `hooks.allowRequestSessionKey`，請同時設定 `hooks.allowedSessionKeyPrefixes` 以限制允許的工作階段金鑰形狀。
- Hook payloads 預設會用安全邊界包裝。

## Gmail PubSub 整合

透過 Google PubSub 將 Gmail 收件箱觸發程序連線至 OpenClaw。

**先決條件**：`gcloud` CLI、`gog` (gogcli)、已啟用 OpenClaw hooks、用於公開 HTTPS 端點的 Tailscale。

### 精靈設定 (建議)

```bash
openclaw webhooks gmail setup --account openclaw@gmail.com
```

這會寫入 `hooks.gmail` 設定，啟用 Gmail 預設集，並使用 Tailscale Funnel 作為推送端點。

### Gateway 自動啟動

當設定 `hooks.enabled=true` 和 `hooks.gmail.account` 時，Gateway 會在開機時啟動 `gog gmail watch serve` 並自動續約監看。設定 `OPENCLAW_SKIP_GMAIL_WATCHER=1` 以退出。

### 手動一次性設定

1. 選取擁有 `gog` 使用的 OAuth 用戶端的 GCP 專案：

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

3. 啟動監看：

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

模型覆寫備註：

- `openclaw cron add|edit --model ...` 會變更工作的選取模型。
- 如果允許該模型，該確切的供應商/模型會抵達隔離的代理程式
  執行。
- 如果不允許，cron 會發出警告並退回至工作的代理程式/預設
  模型選擇。
- 設定的備援鏈仍然適用，但單純的 `--model` 覆寫且
  沒有明確的個別工作備援清單時，不再會透過至代理程式
  主要作為靜默的額外重試目標。

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

停用 cron：`cron.enabled: false` 或 `OPENCLAW_SKIP_CRON=1`。

**單次重試**：暫時性錯誤 (速率限制、過載、網路、伺服器錯誤) 會以指數退避重試最多 3 次。永久錯誤會立即停用。

**週期性重試**：重試之間的指數退避 (30 秒至 60 分鐘)。下一次成功執行後退避會重置。

**維護**：`cron.sessionRetention` (預設 `24h`) 會修剪隔離的執行階段項目。`cron.runLog.maxBytes` / `cron.runLog.keepLines` 會自動修剪執行記錄檔。

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
- 確認 Gateway 正持續執行。
- 對於 `cron` 排程，請驗證時區 (`--tz`) 與主機時區。
- 執行輸出中的 `reason: not-due` 表示已使用 `openclaw cron run <jobId> --due` 檢查手動執行，但該作業尚未到期。

### Cron 已觸發但無遞送

- 遞送模式為 `none` 表示不預期有外部訊息。
- 遞送目標遺失/無效 (`channel`/`to`) 表示已跳過出站傳輸。
- 頻道驗證錯誤 (`unauthorized`, `Forbidden`) 表示遞送被憑證阻擋。
- 如果隔離執行僅回傳靜默權杖 (`NO_REPLY` / `no_reply`)，
  OpenClaw 將抑制直接出站遞送，並也抑制備用
  的佇列摘要路徑，因此不會有任何內容回傳至聊天。
- 對於 cron 擁有的隔離作業，請勿預期代理會使用訊息工具
  作為備用方案。執行器擁有最終遞送權；`--no-deliver` 會將其
  保持在內部，而不允許直接發送。

### 時區注意事項

- 未指定 `--tz` 的 Cron 使用閘道主機時區。
- 未指定時區的 `at` 排程會被視為 UTC。
- Heartbeat `activeHours` 使用設定的時區解析方式。

## 相關

- [Automation & Tasks](/en/automation) — 所有自動化機制一覽
- [Background Tasks](/en/automation/tasks) — cron 執行的任務分類帳
- [Heartbeat](/en/gateway/heartbeat) — 週期性主工作階段輪次
- [Timezone](/en/concepts/timezone) — 時區設定
