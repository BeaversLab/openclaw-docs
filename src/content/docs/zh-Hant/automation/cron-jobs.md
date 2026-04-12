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
- 工作持久化保存在 `~/.openclaw/cron/jobs.json`，因此重啟不會導致排程遺失。
- 所有 cron 執行都會建立 [背景工作](/en/automation/tasks) 記錄。
- 一次性工作 (`--at`) 預設會在成功後自動刪除。
- 隔離的 cron 會在執行完成時，盡最大努力關閉其 `cron:<jobId>` 階段追蹤的瀏覽器分頁/行程，因此分離的瀏覽器自動化不會留下孤兒行程。
- 隔離的 cron 執行也能防止過時的確認回覆。如果第一個結果只是臨時狀態更新 (`on it`、`pulling everything
together` 和類似提示)，並且沒有後代子代理程式執行仍在負責最終答案，OpenClaw 會在交付前重新提示一次以獲取實際結果。

<a id="maintenance"></a>

Cron 的工作協調由執行時期擁有：當 cron 執行時期仍將該工作追蹤為執行中時，即使舊的子階段記錄仍然存在，使用中的 cron 工作仍會保持運作。一旦執行時期停止擁有該工作且 5 分鐘寬限期過期，維護程序可以將工作標記為 `lost`。

## 排程類型

| 種類    | CLI 標誌  | 描述                                             |
| ------- | --------- | ------------------------------------------------ |
| `at`    | `--at`    | 一次性時間戳記 (ISO 8601 或相對時間，如 `20m`)   |
| `every` | `--every` | 固定間隔                                         |
| `cron`  | `--cron`  | 5 欄位或 6 欄位 cron 表達式，可選擇性加上 `--tz` |

沒有時區的時間戳記會被視為 UTC。請加上 `--tz America/New_York` 以進行本地時鐘排程。

循環的整點表達式會自動錯開最多 5 分鐘，以減少負載尖峰。請使用 `--exact` 強制精確時間，或使用 `--stagger 30s` 指定明確視窗。

## 執行風格

| 風格         | `--session` 值      | 執行於                | 最適用於                 |
| ------------ | ------------------- | --------------------- | ------------------------ |
| 主階段       | `main`              | 下一次心跳週期        | 提醒、系統事件           |
| 隔離         | `isolated`          | 專用的 `cron:<jobId>` | 報告、背景雜務           |
| 目前階段     | `current`           | 建立時綁定            | 具備情境感知的週期性工作 |
| 自訂工作階段 | `session:custom-id` | 持久化命名工作階段    | 基於歷史記錄的工作流程   |

**主要工作階段** 工作會將系統事件加入佇列，並選擇性地喚醒心跳 (`--wake now` 或 `--wake next-heartbeat`)。**獨立** 工作會使用新工作階段執行專屬的代理轉場。**自訂工作階段** (`session:xxx`) 會在執行之間保留情境，啟用諸如基於先前摘要的每日站立會議等工作流程。

對於獨立工作，執行階段拆解現已包含針對該 cron 工作階段的最佳努力瀏覽器清理。系統會忽略清理失敗，因此實際的 cron 結果依然會生效。

當獨立 cron 執行編排子代理時，傳送也會偏好最終的子代輸出而非過時的父代中繼文字。如果子代仍在執行中，OpenClaw 會抑制該部分父代更新，而不會進行公告。

### 獨立工作的載荷選項

- `--message`: 提示文字 (獨立工作所需)
- `--model` / `--thinking`: 模型與思考層級覆寫
- `--light-context`: 略過工作區啟動檔案注入
- `--tools exec,read`: 限制工作可使用的工具

`--model` 會使用該工作所選取的允許模型。如果請求的模型不被允許，cron 會記錄警告，並改為回退至工作的代理/預設模型選擇。設定的回退鏈仍然適用，但如果單純的模型覆寫沒有明確的每工作回退清單，將不再會將代理主要模型附加為隱藏的額外重試目標。

獨立工作的模型選擇優先順序為：

1. Gmail 掛鉤模型覆寫 (當執行來自 Gmail 且允許該覆寫時)
2. 每工作載荷 `model`
3. 已儲存的 cron 工作階段模型覆寫
4. 代理/預設模型選擇

快速模式也會跟隨解析後的即時選擇。如果選取的模型設定有 `params.fastMode`，獨立 cron 預設會使用該模式。無論方向為何，已儲存的工作階段 `fastMode` 覆寫仍然優先於設定。

如果獨立運行遇到即時模型切換交接，cron 會使用切換後的供應商/模型重試，並在重試之前保存該即時選擇。當切換也帶有新的身份驗證配置文件時，cron 也會保存該身份驗證配置文件的覆蓋設置。重試是有次數限制的：在初始嘗試加上 2 次切換重試後，cron 會中止而不是無限循環。

## 傳遞與輸出

| 模式       | 會發生什麼                               |
| ---------- | ---------------------------------------- |
| `announce` | 將摘要傳遞到目標頻道（獨立模式的預設值） |
| `webhook`  | 將完成事件負載 POST 到 URL               |
| `none`     | 僅限內部，不進行傳遞                     |

請使用 `--announce --channel telegram --to "-1001234567890"` 進行頻道傳遞。對於 Telegram 論壇主題，請使用 `-1001234567890:topic:123`。Slack/Discord/Mattermost 目標應使用顯式前綴（`channel:<id>`、`user:<id>`）。

對於 cron 擁有的獨立任務，運行器擁有最終的傳遞路徑。系統會提示代理返回純文本摘要，然後該摘要將通過 `announce`、`webhook` 發送，或在 `none` 的情況下保留在內部。`--no-deliver` 不會將傳遞權交還給代理；它會將運行保持在內部。

如果原始任務明確指示向某個外部收件人發送訊息，代理應該在輸出中註明該訊息的發送對象/位置，而不是嘗試直接發送。

失敗通知遵循一條獨立的目的地路徑：

- `cron.failureDestination` 設定失敗通知的全域預設值。
- `job.delivery.failureDestination` 會針對每個任務覆蓋該設定。
- 如果兩者均未設定，且任務已透過 `announce` 傳遞，則失敗通知現在會回退到該主要公告目標。
- 除非主要傳遞模式是 `webhook`，否則 `delivery.failureDestination` 僅支援 `sessionTarget="isolated"` 任務。

## CLI 範例

單次提醒（主會話）：

```bash
openclaw cron add \
  --name "Calendar check" \
  --at "20m" \
  --session main \
  --system-event "Next heartbeat: check calendar." \
  --wake now
```

具備傳遞功能的週期性獨立任務：

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

帶有模型和思考覆寫的獨立任務：

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

Gateway 可以公開 HTTP webhook 端點以供外部觸發。在配置中啟用：

```json5
{
  hooks: {
    enabled: true,
    token: "shared-secret",
    path: "/hooks",
  },
}
```

### 身份驗證

每個請求必須透過標頭包含 hook token：

- `Authorization: Bearer <token>`（建議）
- `x-openclaw-token: <token>`

查詢字串 token 會被拒絕。

### POST /hooks/wake

為主工作階段加入系統事件佇列：

```bash
curl -X POST http://127.0.0.1:18789/hooks/wake \
  -H 'Authorization: Bearer SECRET' \
  -H 'Content-Type: application/json' \
  -d '{"text":"New email received","mode":"now"}'
```

- `text`（必填）：事件描述
- `mode`（選填）：`now`（預設）或 `next-heartbeat`

### POST /hooks/agent

執行一個獨立的 agent 週期：

```bash
curl -X POST http://127.0.0.1:18789/hooks/agent \
  -H 'Authorization: Bearer SECRET' \
  -H 'Content-Type: application/json' \
  -d '{"message":"Summarize inbox","name":"Email","model":"openai/gpt-5.4-mini"}'
```

欄位：`message`（必填）、`name`、`agentId`、`wakeMode`、`deliver`、`channel`、`to`、`model`、`thinking`、`timeoutSeconds`。

### 對應的 hooks (POST /hooks/\<name\>)

自訂 hook 名稱會透過設定中的 `hooks.mappings` 解析。對應關係可以使用範本或程式碼轉換，將任意 payload 轉換為 `wake` 或 `agent` 動作。

### 安全性

- 請將 hook 端點放在 loopback、tailnet 或受信任的反向代理後面。
- 使用專屬的 hook token；不要重複使用 gateway auth token。
- 將 `hooks.path` 保持在專屬的子路徑上；`/` 會被拒絕。
- 設定 `hooks.allowedAgentIds` 以限制明確的 `agentId` 路由。
- 除非您需要由呼叫者選擇的工作階段，否則請保持 `hooks.allowRequestSessionKey=false`。
- 如果您啟用 `hooks.allowRequestSessionKey`，也請設定 `hooks.allowedSessionKeyPrefixes` 以限制允許的工作階段金鑰格式。
- Hook 預設會包覆安全性邊界。

## Gmail PubSub 整合

透過 Google PubSub 將 Gmail 收件箱觸發程序連接到 OpenClaw。

**先決條件**：`gcloud` CLI、`gog` (gogcli)、已啟用 OpenClaw hooks、用於公開 HTTPS 端點的 Tailscale。

### 精靈設定（建議）

```bash
openclaw webhooks gmail setup --account openclaw@gmail.com
```

這會寫入 `hooks.gmail` 設定，啟用 Gmail 預設集，並使用 Tailscale Funnel 作為推送端點。

### Gateway 自動啟動

當設定了 `hooks.enabled=true` 和 `hooks.gmail.account` 時，Gateway 會在啟動時啟動 `gog gmail watch serve` 並自動續期監看。設定 `OPENCLAW_SKIP_GMAIL_WATCHER=1` 以退出。

### 手動一次性設定

1. 選擇擁有 `gog` 使用的 OAuth 用戶端的 GCP 專案：

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

- `openclaw cron add|edit --model ...` 會變更工作的所選模型。
- 如果允許使用該模型，該特定的提供者/模型會到達獨立的代理
  執行。
- 如果不允許使用，cron 會發出警告並回退至工作的代理/預設
  模型選擇。
- 設定的回退鏈仍然適用，但沒有明確每工作回退清單的單純 `--model` 覆寫，
  不再會將代理主要作為靜默的額外重試目標。

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

**單次重試**：暫時性錯誤（速率限制、過載、網路、伺服器錯誤）會以指數退避重試最多 3 次。永久錯誤會立即停用。

**循環重試**：重試之間使用指數退避（30 秒到 60 分鐘）。退避會在下一次成功執行後重置。

**維護**：`cron.sessionRetention`（預設 `24h`）會修剪獨立執行階段項目。`cron.runLog.maxBytes` / `cron.runLog.keepLines` 會自動修剪執行記錄檔。

## 疑難排解

### 指令階層

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
- 確認 Gateway 持續運作中。
- 對於 `cron` 排程，請驗證時區 (`--tz`) 與主機時區。
- 執行輸出中的 `reason: not-due` 表示使用 `openclaw cron run <jobId> --due` 檢查了手動執行，且工作尚未到期。

### Cron 已觸發但無遞送

- 遞送模式為 `none` 表示不預期有外部訊息。
- 遞送目標遺失/無效 (`channel`/`to`) 表示已跳過傳出。
- 頻道驗證錯誤 (`unauthorized`, `Forbidden`) 表示傳遞操作被憑證阻擋。
- 如果獨立執行僅返回靜默權杖 (`NO_REPLY` / `no_reply`)，
  OpenClaw 將會抑制直接向外的傳遞，並且抑制備用的
  排隊摘要路徑，因此不會有任何內容發送回聊天。
- 對於 cron 擁有的獨立任務，不要期望代理程式使用訊息工具
  作為備用方案。執行器擁有最終傳遞權；`--no-deliver` 將其
  保持在內部，而不允許直接發送。

### 時區注意事項

- 不含 `--tz` 的 Cron 使用閘道主機時區。
- 未指定時區的 `at` 排程將被視為 UTC。
- Heartbeat `activeHours` 使用設定的時區解析方式。

## 相關主題

- [Automation & Tasks](/en/automation) — 所有自動化機制一覽
- [Background Tasks](/en/automation/tasks) — cron 執行的任務分類帳
- [Heartbeat](/en/gateway/heartbeat) — 定期主會話輪次
- [Timezone](/en/concepts/timezone) — 時區設定
