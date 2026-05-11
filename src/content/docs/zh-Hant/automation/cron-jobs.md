---
summary: "排程任務、Webhook 與 Gmail PubSub 觸發器，適用於 Gateway 排程器"
read_when:
  - Scheduling background jobs or wakeups
  - Wiring external triggers (webhooks, Gmail) into OpenClaw
  - Deciding between heartbeat and cron for scheduled tasks
title: "排程任務"
sidebarTitle: "排程任務"
---

Cron 是 Gateway 的內建排程器。它會持久化工作，在正確的時間喚醒代理，並可以將輸出傳遞回聊天頻道或 webhook 端點。

## 快速入門

<Steps>
  <Step title="新增單次提醒">
    ```bash
    openclaw cron add \
      --name "Reminder" \
      --at "2026-02-01T16:00:00Z" \
      --session main \
      --system-event "Reminder: check the cron docs draft" \
      --wake now \
      --delete-after-run
    ```
  </Step>
  <Step title="檢查您的工作">
    ```bash
    openclaw cron list
    openclaw cron show <job-id>
    ```
  </Step>
  <Step title="查看執行歷史">
    ```bash
    openclaw cron runs --id <job-id>
    ```
  </Step>
</Steps>

## Cron 的運作方式

- Cron 在 **Gateway 程序內部**執行（而非在模型內部）。
- 工作定義會持久儲存在 `~/.openclaw/cron/jobs.json`，因此重新啟動不會遺失排程。
- 執行時期的執行狀態會儲存在旁邊的 `~/.openclaw/cron/jobs-state.json`。如果您在 git 中追蹤 cron 定義，請追蹤 `jobs.json` 並將 `jobs-state.json` 加入 gitignore。
- 分割後，較舊的 OpenClaw 版本可以讀取 `jobs.json`，但可能會將工作視為全新的，因為執行時期欄位現在位於 `jobs-state.json` 中。
- 當 Gateway 正在執行或已停止時編輯 `jobs.json`，OpenClaw 會將變更的排程欄位與擱置中的執行時期插槽元數據進行比較，並清除過時的 `nextRunAtMs` 值。純格式化或僅變更金鑰順序的重新撰寫會保留擱置中的插槽。
- 所有 cron 執行都會建立 [背景任務](/zh-Hant/automation/tasks) 記錄。
- 單次執行的工作（`--at`）在成功後會依預設自動刪除。
- 獨立 cron 執行會在執行完成時，盡最大努力關閉針對其 `cron:<jobId>` 工作階段所追蹤的瀏覽器分頁/程序，因此分離的瀏覽器自動化不會留下孤兒程序。
- 獨立 cron 執行也會防範過時的確認回覆。如果第一個結果只是臨時狀態更新（`on it`、`pulling everything together` 和類似提示），且沒有後代子代理程式執行仍負責最終答案，OpenClaw 會在傳遞之前重新提示一次以取得實際結果。
- 獨立的 cron 執行優先使用來自內嵌執行的結構化執行拒絕元數據，然後回退到已知的最終摘要/輸出標記，例如 `SYSTEM_RUN_DENIED` 和 `INVALID_REQUEST`，因此被阻擋的指令不會被報告為成功（綠色）執行。
- 獨立的 cron 執行也會將執行級別的代理失敗視為任務錯誤，即使未產生回應負載，因此模型/提供者失敗會增加錯誤計數器並觸發失敗通知，而不是將任務清除為成功。

<a id="maintenance"></a>

<Note>
Cron 的任務協調首先由執行時期擁有，其次由持久化歷史記錄作為後援：只要 cron 執行時期仍將該任務追蹤為正在執行，活躍的 cron 任務就會保持運行，即使舊的子會話行仍然存在。一旦執行時期停止擁有該任務且 5 分鐘的寬限期過期，維護程序會檢查匹配 `cron:<jobId>:<startedAt>` 執行的持久化執行日誌和任務狀態。如果該持久化歷史記錄顯示終止結果，任務帳本將由此最終確定；否則，Gateway 擁有的維護程序可以將任務標記為 `lost`。離線 CLI 審計可以從持久化歷史記錄中恢復，但它不會將其自身為空的程序內活躍任務集視為 Gateway 擁有的 cron 執行已消失的證明。
</Note>

## 排程類型

| 類型    | CLI 標誌  | 說明                                          |
| ------- | --------- | --------------------------------------------- |
| `at`    | `--at`    | 一次性時間戳（ISO 8601 或相對時間，如 `20m`） |
| `every` | `--every` | 固定間隔                                      |
| `cron`  | `--cron`  | 5 欄位或 6 欄位 cron 表達式，可選帶有 `--tz`  |

沒有時區的時間戳被視為 UTC。新增 `--tz America/New_York` 以進行本地牆時鐘排程。

循環的整點表達式會自動錯開最多 5 分鐘，以減少負載尖峰。使用 `--exact` 強制精確計時，或使用 `--stagger 30s` 指定明確的時間視窗。

### 月中的日期和星期幾使用 OR 邏輯

Cron 表達式由 [croner](https://github.com/Hexagon/croner) 解析。當日期（月中的某天）和星期幾這兩個欄位皆非萬用字元時，croner 會在 **任一** 欄位符合時即匹配 —— 而非兩者皆須符合。這是標準的 Vixie cron 行為。

```
# Intended: "9 AM on the 15th, only if it's a Monday"
# Actual:   "9 AM on every 15th, AND 9 AM on every Monday"
0 9 15 * 1
```

這大約會在每月觸發 5–6 次，而非 0–1 次。OpenClaw 在此使用 Croner 的預設 OR 行為。若要同時滿足這兩個條件，請使用 Croner 的 `+` 星期幾修飾符（`0 9 15 * +1`），或者在某一個欄位進行排程，並在您工作的提示或指令中防護另一個欄位。

## 執行樣式

| 樣式         | `--session` 值      | 執行於               | 最適用於                   |
| ------------ | ------------------- | -------------------- | -------------------------- |
| 主工作階段   | `main`              | 下一次心跳週期       | 提醒、系統事件             |
| 隔離         | `isolated`          | 專用 `cron:<jobId>`  | 報告、背景雜務             |
| 目前工作階段 | `current`           | 在建立時綁定         | 具情境感知的週期性工作     |
| 自訂工作階段 | `session:custom-id` | 持久化的具名工作階段 | 基於歷史記錄構建的工作流程 |

<AccordionGroup>
  <Accordion title="Main session vs isolated vs custom">
    **Main session** 工作會將一個系統事件加入佇列，並選擇性地喚醒心跳（`--wake now` 或 `--wake next-heartbeat`）。這些系統事件不會延長目標工作階段的每日/閒置重置新鮮度。**Isolated** 工作會使用全新的工作階段執行專用的代理人週期。**Custom sessions**（`session:xxx`）會在多次執行之間保留情境，從而啟用像是能夠基於先前摘要的每日站立會議等工作流程。
  </Accordion>
  <Accordion title="「全新工作階段」對於隔離作業的意義">
    對於隔離作業，「全新工作階段」意味著每次執行都會有一個新的 transcipt/session id。OpenClaw 可能會攜帶安全的偏好設定，例如思考/快速/詳細設定、標籤，以及明確的使用者選取模型/驗證覆寫，但它不會繼承來自較舊 cron 記錄的環境對話內容：頻道/群組路由、傳送或佇列策略、提升、來源，或 ACP 執行時期繫結。當週期性作業應刻意建立在相同的對話內容時，請使用 `current` 或 `session:<id>`。
  </Accordion>
  <Accordion title="執行時期清理">
    對於隔離作業，執行時期拆解現在包括針對該 cron 工作階段的最佳努力瀏覽器清理。會忽略清理失敗，因此實際的 cron 結果仍然會優先。

    隔離的 cron 執行也會透過共用的執行時期清理路徑，釋放為該作業建立的任何配套 MCP 執行時期實例。這符合主工作階段和自訂工作階段 MCP 客戶端的拆解方式，因此隔離的 cron 作業不會在不同的執行之間洩漏 stdio 子行程或長期存活的 MCP 連線。

  </Accordion>
  <Accordion title="子代理程式和 Discord 傳遞">
    當隔離的 cron 執行協調子代理程式時，傳遞也會偏好最終的後代輸出，而不是過時的父系中間文字。如果後代仍在執行，OpenClaw 會抑制該部分父系更新，而不是發布它。

    對於純文字的 Discord 宣告目標，OpenClaw 會傳送標準的最終助理文字一次，而不是重新傳送串流/中間文字酬載和最終答案。媒體和結構化的 Discord 酬載仍然會作為單獨的酬載傳送，因此附件和元件不會被遺漏。

  </Accordion>
</AccordionGroup>

### 隔離作業的酬載選項

<ParamField path="--message" type="string" required>
  提示詞文字（isolated 模式必填）。
</ParamField>
<ParamField path="--model" type="string">
  模型覆寫；使用為該任務選定的允許模型。
</ParamField>
<ParamField path="--thinking" type="string">
  思維層級覆寫。
</ParamField>
<ParamField path="--light-context" type="boolean">
  跳過工作區引導文件注入。
</ParamField>
<ParamField path="--tools" type="string">
  限制任務可以使用的工具，例如 `--tools exec,read`。
</ParamField>

`--model` 使用為該任務選定的允許模型。如果請求的模型不被允許，cron 會記錄警告，並改回退到任務的 agent/預設模型選擇。設定的回退鏈仍然適用，但沒有明確的每任務回退列表的單純模型覆寫，不再將 agent 主要模型附加為隱藏的額外重試目標。

Isolated 任務的模型選擇優先順序為：

1. Gmail hook 模型覆寫（當執行來自 Gmail 且該覆寫被允許時）
2. 每任務負載 `model`
3. 使用者選定的已儲存 cron session 模型覆寫
4. Agent/預設模型選擇

快速模式也遵循解析後的即時選擇。如果選定的模型配置具有 `params.fastMode`，isolated cron 預設使用該模式。已儲存的 session `fastMode` 覆寫在任何情況下都優先於配置。

如果 isolated 執行遇到即時模型切換移交，cron 會使用切換後的提供者/模型重試，並在重試之前將該即時選擇保存給正在執行的任務。當切換也帶有新的授權設定檔時，cron 也會將該授權設定檔覆寫保存給正在執行的任務。重試是有次數限制的：在初始嘗試加上 2 次切換重試後，cron 會中止而不是無限迴圈。

## 傳送與輸出

| 模式       | 發生什麼事                                  |
| ---------- | ------------------------------------------- |
| `announce` | 如果 agent 未發送，則回退傳送最終文字至目標 |
| `webhook`  | POST 完成事件負載至 URL                     |
| `none`     | 無 runner 回退傳送                          |

使用 `--announce --channel telegram --to "-1001234567890"` 進行頻道傳送。對於 Telegram 論壇主題，請使用 `-1001234567890:topic:123`。Slack/Discord/Mattermost 目標應使用明確的前綴（`channel:<id>`、`user:<id>`）。Matrix 房間 ID 區分大小寫；請使用來自 Matrix 的確切房間 ID 或 `room:!room:server` 格式。

對於隔離作業，聊天傳送是共用的。如果聊天路由可用，即使作業使用 `--no-deliver`，代理程式仍可使用 `message` 工具。如果代理程式傳送到配置/目前的目標，OpenClaw 會跳過後備公告。否則，`announce`、`webhook` 和 `none` 僅控制執行器在代理程式輪次後對最終回覆所做的處理。

當代理程式從作用中的聊天建立隔離提醒時，OpenClaw 會將儲存的即時傳送目標用於後備公告路由。內部工作階段金鑰可能為小寫；當目前的聊天內容可用時，提供者傳送目標不會從這些金鑰重建。

失敗通知遵循單獨的目的地路徑：

- `cron.failureDestination` 設定失敗通知的全域預設值。
- `job.delivery.failureDestination` 針對每個作業覆寫該設定。
- 如果兩者皆未設定，且作業已透過 `announce` 傳送，失敗通知現在會退回至該主要公告目標。
- `delivery.failureDestination` 僅在 `sessionTarget="isolated"` 作業上支援，除非主要傳送模式為 `webhook`。
- `failureAlert.includeSkipped: true` 選擇讓作業或全域 cron 警報政策接收重複的跳過執行警報。跳過的執行會維護單獨的連續跳過計數器，因此不會影響執行錯誤的退避。

## CLI 範例

<Tabs>
  <Tab title="單次提醒">```bash openclaw cron add \ --name "Calendar check" \ --at "20m" \ --session main \ --system-event "Next heartbeat: check calendar." \ --wake now ```</Tab>
  <Tab title="週期性隔離作業">```bash openclaw cron add \ --name "Morning brief" \ --cron "0 7 * * *" \ --tz "America/Los_Angeles" \ --session isolated \ --message "Summarize overnight updates." \ --announce \ --channel slack \ --to "channel:C1234567890" ```</Tab>
  <Tab title="模型與思考覆寫">```bash openclaw cron add \ --name "Deep analysis" \ --cron "0 6 * * 1" \ --tz "America/Los_Angeles" \ --session isolated \ --message "Weekly deep analysis of project progress." \ --model "opus" \ --thinking high \ --announce ```</Tab>
</Tabs>

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

- `Authorization: Bearer <token>` (建議)
- `x-openclaw-token: <token>`

查詢字串 token 將被拒絕。

<AccordionGroup>
  <Accordion title="POST /hooks/wake">
    為主會話排入一個系統事件：

    ```bash
    curl -X POST http://127.0.0.1:18789/hooks/wake \
      -H 'Authorization: Bearer SECRET' \
      -H 'Content-Type: application/json' \
      -d '{"text":"New email received","mode":"now"}'
    ```

    <ParamField path="text" type="string" required>
      事件描述。
    </ParamField>
    <ParamField path="mode" type="string" default="now">
      `now` 或 `next-heartbeat`。
    </ParamField>

  </Accordion>
  <Accordion title="POST /hooks/agent">
    執行一個隔離的 agent 輪次：

    ```bash
    curl -X POST http://127.0.0.1:18789/hooks/agent \
      -H 'Authorization: Bearer SECRET' \
      -H 'Content-Type: application/json' \
      -d '{"message":"Summarize inbox","name":"Email","model":"openai/gpt-5.4"}'
    ```

    欄位：`message` (必要)、`name`、`agentId`、`wakeMode`、`deliver`、`channel`、`to`、`model`、`thinking`、`timeoutSeconds`。

  </Accordion>
  <Accordion title="Mapped hooks (POST /hooks/<name>)">
    自訂 hook 名稱透過設定中的 `hooks.mappings` 解析。對應可以使用範本或程式碼轉換，將任意 payload 轉換為 `wake` 或 `agent` 動作。
  </Accordion>
</AccordionGroup>

<Warning>
請將 hook 端點保留在 loopback、tailnet 或受信任的反向代理之後。

- 使用專用的 hook token；不要重複使用 gateway auth token。
- 將 `hooks.path` 保留在專用子路徑上；`/` 會被拒絕。
- 設定 `hooks.allowedAgentIds` 以限制明確的 `agentId` 路由。
- 保持 `hooks.allowRequestSessionKey=false` 開啟，除非您需要由呼叫者選擇的 session。
- 如果您啟用 `hooks.allowRequestSessionKey`，請同時設定 `hooks.allowedSessionKeyPrefixes` 以限制允許的 session key 形狀。
- Hook payload 預設會被安全邊界包裝。
  </Warning>

## Gmail PubSub 整合

透過 Google PubSub 將 Gmail 收件匣觸發器連線至 OpenClaw。

<Note>**先決條件：** `gcloud` CLI、`gog` (gogcli)、已啟用 OpenClaw hooks、用於公開 HTTPS 端點的 Tailscale。</Note>

### 精靈設定 (建議)

```bash
openclaw webhooks gmail setup --account openclaw@gmail.com
```

這會寫入 `hooks.gmail` 設定，啟用 Gmail 預設集，並使用 Tailscale Funnel 作為推播端點。

### Gateway 自動啟動

當設定 `hooks.enabled=true` 和 `hooks.gmail.account` 時，Gateway 會在開機時啟動 `gog gmail watch serve` 並自動續期監看。設定 `OPENCLAW_SKIP_GMAIL_WATCHER=1` 以退出。

### 手動一次性設定

<Steps>
  <Step title="選取 GCP 專案">
    選取擁有 `gog` 使用的 OAuth 用戶端的 GCP 專案：

    ```bash
    gcloud auth login
    gcloud config set project <project-id>
    gcloud services enable gmail.googleapis.com pubsub.googleapis.com
    ```

  </Step>
  <Step title="建立主題並授予 Gmail 推播存取權">
    ```bash
    gcloud pubsub topics create gog-gmail-watch
    gcloud pubsub topics add-iam-policy-binding gog-gmail-watch \
      --member=serviceAccount:gmail-api-push@system.gserviceaccount.com \
      --role=roles/pubsub.publisher
    ```
  </Step>
  <Step title="開始監看">
    ```bash
    gog gmail watch start \
      --account openclaw@gmail.com \
      --label INBOX \
      --topic projects/<project-id>/topics/gog-gmail-watch
    ```
  </Step>
</Steps>

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

<Note>
模型覆寫備註：

- `openclaw cron add|edit --model ...` 會變更工作所選的模型。
- 如果允許該模型，則該特定的提供者/模型會連接到獨立的代理執行。
- 如果不允許，cron 會發出警告並回退至工作的代理/預設模型選擇。
- 設定的回退鏈仍然適用，但沒有明確的個別工作回退清單的純 `--model` 覆寫，不再會以靜默額外重試目標的方式回退到代理主體。
  </Note>

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

`maxConcurrentRuns` 會同時限制排定的 cron 分派與獨立的代理回合執行。獨立的 cron 代理回合會在內部使用佇列的專用 `cron-nested` 執行通道，因此提高此數值可讓獨立的 cron LLM 執行並行進行，而不僅是啟動其外部的 cron 包裝程式。此設定不會擴充共用的非 cron `nested` 通道。

執行時狀態 sidecar 派生自 `cron.store`：諸如 `~/clawd/cron/jobs.json` 之類的 `.json` 存儲會使用 `~/clawd/cron/jobs-state.json`，而沒有 `.json` 後綴的存儲路徑會附加 `-state.json`。

如果您手動編輯 `jobs.json`，請將 `jobs-state.json` 排除在原始碼控制之外。OpenClaw 會使用該 sidecar 來處理待處理位置、活動標記、上次執行中繼資料，以及用來告知排程器何時需要為外部編輯的工作產生新 `nextRunAtMs` 的排程身分識別。

停用 cron：`cron.enabled: false` 或 `OPENCLAW_SKIP_CRON=1`。

<AccordionGroup>
  <Accordion title="重試行為">
    **單次重試**：暫時性錯誤（速率限制、過載、網路、伺服器錯誤）會以指數退避重試最多 3 次。永久性錯誤會立即停用。

    **週期性重試**：重試之間會有指數退避（30 秒到 60 分鐘）。退避會在下一次成功執行後重設。

  </Accordion>
  <Accordion title="維護">
    `cron.sessionRetention` (預設 `24h`) 會修剪隔離式執行階段項目。`cron.runLog.maxBytes` / `cron.runLog.keepLines` 會自動修剪執行日誌檔案。
  </Accordion>
</AccordionGroup>

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

<AccordionGroup>
  <Accordion title="Cron 未觸發">
    - 檢查 `cron.enabled` 和 `OPENCLAW_SKIP_CRON` 環境變數。
    - 確認 Gateway 正在持續運作。
    - 對於 `cron` 排程，請驗證時區 (`--tz`) 與主機時區是否一致。
    - 執行輸出中的 `reason: not-due` 表示已使用 `openclaw cron run <jobId> --due` 檢查手動執行，且該工作尚未到期。
  </Accordion>
  <Accordion title="Cron 已觸發但無傳送">
    - 傳送模式 `none` 表示不預期有 runner 備援傳送。當可用聊天路由時，代理程式仍可使用 `message` 工具直接傳送。
    - 傳送目標遺失/無效 (`channel`/`to`) 表示已跳過傳出。
    - 對於 Matrix，使用小寫 `delivery.to` 房間 ID 的複製或舊版工作可能會失敗，因為 Matrix 房間 ID 有區分大小寫。請將工作編輯為來自 Matrix 的精確 `!room:server` 或 `room:!room:server` 值。
    - 頻道驗證錯誤 (`unauthorized`, `Forbidden`) 表示傳送被憑證阻擋。
    - 如果隔離式執行僅傳回靜默符記 (`NO_REPLY` / `no_reply`)，OpenClaw 會抑制直接傳出傳送，並抑制備援佇列摘要路徑，因此不會回傳任何內容至聊天。
    - 如果代理程式應自行傳送訊息給使用者，請檢查工作是否有可用路由 (`channel: "last"` 搭配先前的聊天，或明確的頻道/目標)。
  </Accordion>
  <Accordion title="Cron 或 heartbeat 似乎阻止了 /new-style 輪替">
    - 每日和閒置重置的新鮮度並非基於 `updatedAt`；請參閱 [會話管理](/zh-Hant/concepts/session#session-lifecycle)。
    - Cron 喚醒、heartbeat 執行、exec 通知以及 gateway 簿記作業可能會更新會話行以進行路由/狀態設定，但它們不會延長 `sessionStartedAt` 或 `lastInteractionAt`。
    - 對於在這些欄位存在之前建立的舊版資料列，當檔案仍然可用時，OpenClaw 可以從逐字稿 JSONL 會話標頭中還原 `sessionStartedAt`。沒有 `lastInteractionAt` 的舊版閒置資料列會使用該還原的開始時間作為其閒置基準線。
  </Accordion>
  <Accordion title="時區陷阱">
    - 沒有 `--tz` 的 Cron 使用 gateway 主機的時區。
    - 沒有時區的 `at` 排程會被視為 UTC。
    - Heartbeat `activeHours` 使用設定的時區解析方式。
  </Accordion>
</AccordionGroup>

## 相關

- [自動化與任務](/zh-Hant/automation) — 自動化機制一覽
- [背景任務](/zh-Hant/automation/tasks) — cron 執行的任務帳本
- [Heartbeat](/zh-Hant/gateway/heartbeat) — 週期性主會話輪次
- [時區](/zh-Hant/concepts/timezone) — 時區設定
