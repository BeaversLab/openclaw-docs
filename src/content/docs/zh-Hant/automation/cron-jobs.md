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

# See run history
openclaw cron runs --id <job-id>
```

## Cron 運作方式

- Cron 在 **Gateway 進程內運行**（而非在模型內）。
- 工作會保存在 `~/.openclaw/cron/jobs.json`，因此重新啟動不會遺失排程。
- 所有 cron 執行都會建立 [背景任務](/zh-Hant/automation/tasks) 記錄。
- 單次工作 (`--at`) 預設在成功後會自動刪除。
- 隔離的 cron 執行會在執行完成時，盡力關閉其 `cron:<jobId>` 階段追蹤的瀏覽器分頁/程序，因此分離的瀏覽器自動化不會留下孤兒程序。
- 隔離的 cron 執行也會防止過時的確認回覆。如果
  第一個結果只是臨時狀態更新 (`on it`、`pulling everything
together` 和類似提示)，並且沒有後代子代理程式執行仍對
  最終答案負責，OpenClaw 會在傳送前重新提示一次以取得實際
  結果。

<a id="maintenance"></a>

Cron 的任務對帳由執行時期擁有：只要
cron 執行時期仍追蹤該工作正在執行，作用中的 cron 任務就會保持活躍，即使舊的子階段資料列仍然存在。
一旦執行時期停止擁有該工作且 5 分鐘的寬限期間到期，維護程序即可
將任務標記為 `lost`。

## 排程類型

| 種類    | CLI 標誌  | 描述                                           |
| ------- | --------- | ---------------------------------------------- |
| `at`    | `--at`    | 單次時間戳記 (ISO 8601 或相對時間，如 `20m`)   |
| `every` | `--every` | 固定間隔                                       |
| `cron`  | `--cron`  | 5 欄位或 6 欄位 cron 表達式，可選擇搭配 `--tz` |

不帶時區的時間戳記會被視為 UTC。加入 `--tz America/New_York` 以進行本地牆上時鐘排程。

週期性的整點表達式會自動錯開最多 5 分鐘，以減少負載尖峰。使用 `--exact` 強制精確時間，或使用 `--stagger 30s` 指定明確的視窗。

### 日期中的星期與星期幾使用 OR 邏輯

Cron 表達式由 [croner](https://github.com/Hexagon/croner) 解析。當「月份中的日期」和「星期」欄位皆非萬用字元時，只要 **任一** 欄位相符，croner 即會匹配，而非兩者皆須相符。這是標準 Vixie cron 行為。

```
# Intended: "9 AM on the 15th, only if it's a Monday"
# Actual:   "9 AM on every 15th, AND 9 AM on every Monday"
0 9 15 * 1
```

這使得其每月觸發約 5–6 次，而非每月 0–1 次。OpenClaw 在此使用 Croner 的預設 OR 行為。若要求兩條件同時滿足，請使用 Croner 的 `+` 星期修飾符 (`0 9 15 * +1`)，或在單一欄位排程，並在工作的提示詞或指令中防護另一欄位。

## 執行樣式

| 樣式     | `--session` 值      | 執行於              | 最適用於             |
| -------- | ------------------- | ------------------- | -------------------- |
| 主會話   | `main`              | 下一次心跳週期      | 提醒、系統事件       |
| 獨立     | `isolated`          | 專用 `cron:<jobId>` | 報告、背景雜務       |
| 目前會話 | `current`           | 於建立時綁定        | 感知情境的週期性工作 |
| 自訂會話 | `session:custom-id` | 具名的持久會話      | 基於歷史的工作流程   |

**Main session**（主會話）工作會將系統事件加入佇列，並選擇性地喚醒心跳 (`--wake now` 或 `--wake next-heartbeat`)。**Isolated**（獨立）工作會以全新會話執行專用的代理程式週期。**Custom sessions**（自訂會話）(`session:xxx`) 會在執行間保留情境，從而啟用基於先前摘要的每日站立會議等工作流程。

對於獨立工作，執行階段終結現包含針對該 cron 會話的盡力清理瀏覽器動作。清理失敗會被忽略，以免影響實際的 cron 結果。

當獨立 cron 執行協調子代理程式時，傳遞也會偏好最終後代輸出，而非過時的父代暫存文字。若後代仍在執行，OpenClaw 將隱藏該部分父代更新，而不發布通知。

### 獨立工作的 Payload 選項

- `--message`：提示詞文字（獨立工作必填）
- `--model` / `--thinking`：模型與思考等級覆寫
- `--light-context`：跳過工作區引導檔案注入
- `--tools exec,read`：限制工作可使用的工具

`--model` 使用為該任務選定的允許模型。如果請求的模型
不被允許，cron 會記錄警告並回退到任務的代理/預設
模型選擇。設定的回退鏈仍然適用，但沒有明確的
單一任務回退列表的純模型覆蓋不再將
代理主要模型添加為隱藏的額外重試目標。

隔離任務的模型選擇優先順序為：

1. Gmail hook 模型覆蓋（當執行來自 Gmail 且該覆蓋被允許時）
2. 單一任務 payload `model`
3. 已儲存的 cron 會話模型覆蓋
4. 代理/預設模型選擇

快速模式也遵循解析後的即時選擇。如果選定的模型配置
具有 `params.fastMode`，隔離 cron 預設使用該模式。已儲存的會話
`fastMode` 覆蓋仍然優先於任一方向的配置。

如果隔離執行遇到即時模型切換交接，cron 會使用
切換後的提供者/模型重試，並在重試前保存該即時選擇。當
切換也帶有新的認證設定檔時，cron 也會保存該認證設定檔
覆蓋。重試是有界的：在初始嘗試加上 2 次切換
重試後，cron 會中止而不是無限循環。

## 傳遞與輸出

| 模式       | 發生情況                             |
| ---------- | ------------------------------------ |
| `announce` | 將摘要傳遞到目標頻道（隔離的預設值） |
| `webhook`  | 將完成的事件 payload POST 到 URL     |
| `none`     | 僅限內部，不進行傳遞                 |

請使用 `--announce --channel telegram --to "-1001234567890"` 進行頻道傳遞。對於 Telegram 論壇主題，請使用 `-1001234567890:topic:123`。Slack/Discord/Mattermost 目標應使用明確的前綴 (`channel:<id>`, `user:<id>`)。

對於 cron 擁有的隔離任務，執行器擁有最終的傳遞路徑。
代理被提示返回純文字摘要，然後該摘要通過
`announce`、`webhook` 發送，或對於 `none` 保持在內部。`--no-deliver`
不會將傳遞交還給代理；它將執行保持在內部。

如果原始任務明確指出要傳送訊息給某個外部接收者，
代理應該在輸出中標記該訊息的接收者/位置，而不是
嘗試直接發送。

失敗通知遵循獨立的目標路徑：

- `cron.failureDestination` 設定了失敗通知的全域預設值。
- `job.delivery.failureDestination` 會針對每個工作覆寫該設定。
- 如果兩者都未設定，且工作已透過 `announce` 傳送，失敗通知現在將會回退到該主要公告目標。
- `delivery.failureDestination` 僅在 `sessionTarget="isolated"` 工作上受支援，除非主要傳送模式是 `webhook`。

## CLI 範例

一次性提醒 (主工作階段)：

```bash
openclaw cron add \
  --name "Calendar check" \
  --at "20m" \
  --session main \
  --system-event "Next heartbeat: check calendar." \
  --wake now
```

具有傳遞功能的遞迴隔離工作：

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
  --announce
```

## Webhooks

Gateway 可以公開 HTTP webhook 端點供外部觸發使用。在設定中啟用：

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

- `Authorization: Bearer <token>` (推薦)
- `x-openclaw-token: <token>`

查詢字串 tokens 會被拒絕。

### POST /hooks/wake

為主工作階段加入系統事件佇列：

```bash
curl -X POST http://127.0.0.1:18789/hooks/wake \
  -H 'Authorization: Bearer SECRET' \
  -H 'Content-Type: application/json' \
  -d '{"text":"New email received","mode":"now"}'
```

- `text` (必填)：事件描述
- `mode` (選填)：`now` (預設) 或 `next-heartbeat`

### POST /hooks/agent

執行隔離的代理回合：

```bash
curl -X POST http://127.0.0.1:18789/hooks/agent \
  -H 'Authorization: Bearer SECRET' \
  -H 'Content-Type: application/json' \
  -d '{"message":"Summarize inbox","name":"Email","model":"openai/gpt-5.4-mini"}'
```

欄位：`message` (必填)、`name`、`agentId`、`wakeMode`、`deliver`、`channel`、`to`、`model`、`thinking`、`timeoutSeconds`。

### 對應的 hooks (POST /hooks/\<name\>)

自訂 hook 名稱透過設定中的 `hooks.mappings` 解析。對應關係可以透過範本或程式碼轉換，將任意 payload 轉換為 `wake` 或 `agent` 動作。

### 安全性

- 將 hook 端點置於 loopback、tailnet 或受信任的反向代理之後。
- 使用專屬的 hook token；切勿重複使用 gateway 驗證 token。
- 請將 `hooks.path` 保留在專用的子路徑上；`/` 會被拒絕。
- 設定 `hooks.allowedAgentIds` 以限制明確的 `agentId` 路由。
- 除非您需要由呼叫者選擇的工作階段，否則請保持 `hooks.allowRequestSessionKey=false` 開啟。
- 如果您啟用 `hooks.allowRequestSessionKey`，也請設定 `hooks.allowedSessionKeyPrefixes` 以限制允許的工作階段金鑰形狀。
- Hook 的載入預設會以安全邊界包裝。

## Gmail PubSub 整合

透過 Google PubSub 將 Gmail 收件匣觸發程序連線至 OpenClaw。

**先決條件**：`gcloud` CLI、`gog` (gogcli)、已啟用 OpenClaw hooks、用於公開 HTTPS 端點的 Tailscale。

### 精靈設定（推薦）

```bash
openclaw webhooks gmail setup --account openclaw@gmail.com
```

這會寫入 `hooks.gmail` 設定，啟用 Gmail 預設集，並使用 Tailscale Funnel 作為推播端點。

### Gateway 自動啟動

當設定 `hooks.enabled=true` 和 `hooks.gmail.account` 時，Gateway 會在開機時啟動 `gog gmail watch serve` 並自動續訂監視。設定 `OPENCLAW_SKIP_GMAIL_WATCHER=1` 以選擇退出。

### 手動一次性設定

1. 選擇擁有 `gog` 使用的 OAuth 用戶端的 GCP 專案：

```bash
gcloud auth login
gcloud config set project <project-id>
gcloud services enable gmail.googleapis.com pubsub.googleapis.com
```

2. 建立主題並授予 Gmail 推播存取權限：

```bash
gcloud pubsub topics create gog-gmail-watch
gcloud pubsub topics add-iam-policy-binding gog-gmail-watch \
  --member=serviceAccount:gmail-api-push@system.gserviceaccount.com \
  --role=roles/pubsub.publisher
```

3. 開始監視：

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

- `openclaw cron add|edit --model ...` 會變更工作選取的模型。
- 如果模型是允許的，該確切的提供者/模型會傳遞至隔離的
  代理程式執行。
- 如果不被允許，cron 會發出警告並回退至工作的代理程式/預設
  模型選擇。
- 設定的回退鏈仍然適用，但純粹的 `--model` 覆寫且
  沒有明確的每個工作回退清單，將不再回退到代理程式
  主要模型作為無聲的額外重試目標。

## 組態

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

**單次重試**：暫時性錯誤（速率限制、過載、網路、伺服器錯誤）會以指數退避重試最多 3 次。永久性錯誤會立即停用。

**週期性重試**：重試之間採用指數退避（30 秒到 60 分鐘）。退避會在下一次成功執行後重設。

**維護**：`cron.sessionRetention`（預設 `24h`）會修剪獨立執行階段的項目。`cron.runLog.maxBytes` / `cron.runLog.keepLines` 會自動修剪執行記錄檔。

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
- 確認 Gateway 持續在執行中。
- 對於 `cron` 排程，請驗證時區 (`--tz`) 與主機時區。
- 執行輸出中的 `reason: not-due` 表示已使用 `openclaw cron run <jobId> --due` 檢查手動執行，且作業尚未到期。

### Cron 已觸發但無傳送

- 傳送模式為 `none` 表示不預期會有外部訊息。
- 傳送目標遺失/無效 (`channel`/`to`) 表示已跳過傳出。
- 頻道驗證錯誤 (`unauthorized`、`Forbidden`) 表示傳送被憑證阻擋。
- 如果獨立執行僅傳回靜默權杖 (`NO_REPLY` / `no_reply`)，
  OpenClaw 會抑制直接傳出傳送，並抑制備用
  排佇摘要路徑，因此不會將任何內容張貼回聊天。
- 對於 cron 擁有的獨立作業，請勿預期代理程式會將訊息工具
  作為備用使用。執行器擁有最終傳送權；`--no-deliver` 會將其
  保持在內部，而不允許直接傳送。

### 時區注意事項

- 沒有 `--tz` 的 Cron 使用 gateway 主機時區。
- 沒有時區的 `at` 排程會被視為 UTC。
- Heartbeat `activeHours` 使用設定的時區解析。

## 相關

- [自動化與任務](/zh-Hant/automation) — 所有自動化機制一覽
- [背景任務](/zh-Hant/automation/tasks) — cron 執行的任務分類帳
- [Heartbeat](/zh-Hant/gateway/heartbeat) — 週期性主會話輪次
- [時區](/zh-Hant/concepts/timezone) — 時區設定
