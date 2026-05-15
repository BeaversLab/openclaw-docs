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
- 所有 cron 執行都會建立 [background task](/zh-Hant/automation/tasks) 記錄。
- Gateway 啟動時，過期的隔離 agent-turn 任務會被重新排程到通道連線視窗之外，而不是立即重播，因此 Discord/Telegram 啟動和原生指令設定在重新啟動後能保持響應。
- 單次任務 (`--at`) 預設會在成功後自動刪除。
- 隔離 cron 執行會在完成時盡力關閉其 `cron:<jobId>` 會話的已追蹤瀏覽器分頁/程序，因此分離的瀏覽器自動化不會留下遺留的程序。
- 接收狹窄 cron 自我清理授權的隔離 cron 執行仍然可以讀取排程器狀態、其當前任務的自我過濾清單以及該任務的執行歷史，因此狀態/心跳檢查可以檢查其自己的排程，而無需獲得更廣泛的 cron 修改權限。
- 隔離 cron 執行還會防範過時的確認回覆。如果第一個結果只是臨時狀態更新 (`on it`、`pulling everything together` 和類似提示)，並且沒有子代理程式執行仍對最終答案負責，OpenClaw 會在傳送前重新提示一次以取得實際結果。
- 隔離 cron 執行優先使用來自嵌入式執行的結構化執行拒絕元數據，然後退回到已知的最終摘要/輸出標記，例如 `SYSTEM_RUN_DENIED` 和 `INVALID_REQUEST`，因此被封鎖的指令不會被報告為綠色執行。
- 隔離 cron 執行還會將執行層級的代理程式失敗視為任務錯誤，即使沒有產生回覆負載，因此模型/提供者失敗會增加錯誤計數器並觸發失敗通知，而不是將任務清除為成功。
- 當隔離 agent-turn 任務達到 `timeoutSeconds` 時，cron 會中止底層代理程式執行並給予一個短暫的清理視窗。如果執行未排空，Gateway 擁有的清理會在 cron 記錄逾時之前強制清除該執行的會話擁有權，因此排隊的聊天工作不會遺留在過時的處理會話之後。

<a id="maintenance"></a>

<Note>
Cron 的任務對帳優先由執行時期 擁有，其次依賴持久化歷史記錄：只要 cron 執行時期仍將該工作追蹤為執行中，一個作用中的 cron 任務就會保持活躍狀態，即使舊的子會話 記錄仍然存在。一旦執行時期不再擁有該工作且 5 分鐘的寬限期 過期，維護程序會檢查持久化的執行日誌與工作狀態，以尋找匹配的 `cron:<jobId>:<startedAt>` 執行。如果該持久化歷史顯示最終結果，任務帳本將依此定案；否則，由 Gateway 擁有的維護程序可將任務標記為 `lost`。離線 CLI 稽核可從持久化歷史中恢復，但它不會將自身空的程序內作用中工作集 視為 Gateway 擁有的 cron 執行已消失的證明。
</Note>

## 排程類型

| 類型    | CLI 標誌  | 說明                                           |
| ------- | --------- | ---------------------------------------------- |
| `at`    | `--at`    | 單次時間戳記 (ISO 8601 或相對時間如 `20m`)     |
| `every` | `--every` | 固定間隔                                       |
| `cron`  | `--cron`  | 5 欄位或 6 欄位 cron 表達式，可選擇搭配 `--tz` |

未指定時區的時間戳記將被視為 UTC。請加入 `--tz America/New_York` 以進行本地牆上時鐘 排程。

週期性的整點表達式會自動錯開最多 5 分鐘，以減少負載尖峰。請使用 `--exact` 強制精確計時，或使用 `--stagger 30s` 指定明確的時間視窗。

### 「每月日期」與「每週日期」使用 OR 邏輯

Cron 表達式由 [croner](https://github.com/Hexagon/croner) 解析。當「每月日期」與「每週日期」欄位皆非萬用字元 時，croner 會在**任一**欄位相符時即匹配——而不是兩者皆需相符。這是標準的 Vixie cron 行為。

```
# Intended: "9 AM on the 15th, only if it's a Monday"
# Actual:   "9 AM on every 15th, AND 9 AM on every Monday"
0 9 15 * 1
```

這會導致每個月觸發約 5–6 次，而非每個月 0–1 次。OpenClaw 在此使用 Croner 的預設 OR 行為。若要要求兩個條件同時成立，請使用 Croner 的 `+` 每週日期修飾符 (`0 9 15 * +1`)，或者在其中一個欄位上排程，並在您的工作的提示 或指令 中檢查另一個條件。

## 執行樣式

| 樣式         | `--session` 值      | 執行於                 | 最適用於               |
| ------------ | ------------------- | ---------------------- | ---------------------- |
| 主要會話     | `main`              | 下一次心跳週期         | 提醒、系統事件         |
| 獨立         | `isolated`          | 專用 `cron:<jobId>`    | 報告、背景雜務         |
| 目前工作階段 | `current`           | 建立時綁定             | 情境感知的週期性工作   |
| 自訂工作階段 | `session:custom-id` | 具持久性的命名工作階段 | 基於歷史記錄的工作流程 |

<AccordionGroup>
  <Accordion title="主工作階段 vs 獨立 vs 自訂">
    **主工作階段** 工作會將系統事件加入佇列，並選擇性地喚醒心跳 (`--wake now` 或 `--wake next-heartbeat`)。這些系統事件不會延長目標工作階段的每日/閒置重設新鮮度。**獨立** 工作會使用新的工作階段執行專用的代理程式週期。**自訂工作階段** (`session:xxx`) 會在執行之間保留情境，啟用像是基於先前摘要的每日站會之類的工作流程。
  </Accordion>
  <Accordion title="「新鮮工作階段」對獨立工作的意義">
    對於獨立工作，「新鮮工作階段」是指每次執行都有新的 transcript/session ID。OpenClaw 可能會攜帶安全的偏好設定，例如思考/快速/詳細設定、標籤，以及使用者明確選擇的模型/驗證覆寫，但它不會繼承來自較舊 cron 記錄的環境對話情境：頻道/群組路由、傳送或佇列原則、提升、來源或 ACP 執行時期綁定。當週期性工作應刻意建立在相同的對話情境時，請使用 `current` 或 `session:<id>`。
  </Accordion>
  <Accordion title="執行時期清理">
    對於獨立工作，執行時期拆卸現在包含針對該 cron 工作階段的盡力瀏覽器清理。清理失敗會被忽略，因此實際的 cron 結果仍然優先採用。

    獨立 cron 執行也會透過共享的執行時期清理路徑，釋放為工作建立的任何綁定 MCP 執行時期執行個體。這與主工作階段和自訂工作階段 MCP 用戶端的拆卸方式相符，因此獨立 cron 工作不會在執行之間洩漏 stdio 子行程或長期存在的 MCP 連線。

  </Accordion>
  <Accordion title="子代理與 Discord 傳遞">
    當獨立 cron 任務協調子代理時，傳遞也優先選擇最終的後代輸出，而非陳舊的父級中間文字。如果後代仍在執行，OpenClaw 會抑制那個部分的父級更新，而不是發布它。

    對於僅文字的 Discord 公告目標，OpenClaw 只會發送一次標準的最終助理文字，而不是重播串流/中間文字內容和最終答案。媒體和結構化的 Discord 內容仍然會作為獨立的內容發送，以免遺失附件和組件。

  </Accordion>
</AccordionGroup>

### 獨立任務的內容選項

<ParamField path="--message" type="string" required>
  提示詞文字（獨立模式必填）。
</ParamField>
<ParamField path="--model" type="string">
  模型覆寫；使用為該任務選定的允許模型。
</ParamField>
<ParamField path="--thinking" type="string">
  思考等級覆寫。
</ParamField>
<ParamField path="--light-context" type="boolean">
  跳過工作區引導檔案注入。
</ParamField>
<ParamField path="--tools" type="string">
  限制該任務可以使用的工具，例如 `--tools exec,read`。
</ParamField>

`--model` 會將選定的允許模型作為該任務的主要模型。這與聊天會話的 `/model` 覆寫不同：當任務主要模型失敗時，設定的後援鏈仍然會生效。如果請求的模型不被允許或無法解析，cron 會使執行失敗並顯示明確的驗證錯誤，而不是無聲地回退至任務的代理/預設模型選擇。

Cron 工作也可以攜帶層級為 Payload 的 `fallbacks`。當存在時，該列表會取代為該工作設定的後援鏈。當您需要一個嚴格的 cron 執行，僅嘗試選定的模型時，請在工作 Payload/API 中使用 `fallbacks: []`。如果一個工作有 `--model` 但既沒有也沒有設定的後援，OpenClaw 會傳遞一個明確的空白後援覆寫，這樣 Agent 主要模型就不會被附加為隱藏的額外重試目標。

隔離工作的模型選擇優先順序為：

1. Gmail hook 模型覆寫（當執行來自 Gmail 且允許該覆寫時）
2. 各個工作的 Payload `model`
3. 使用者選擇的已儲存 cron 會話模型覆寫
4. Agent/預設模型選擇

快速模式也遵循解析後的即時選擇。如果選定的模型配置有 `params.fastMode`，隔離的 cron 預設會使用它。無論方向如何，儲存的會話 `fastMode` 覆寫仍然優先於配置。

如果隔離執行遇到即時模型切換移交，cron 會使用切換後的供應商/模型重試，並在重試前為當前執行保存該即時選擇。當切換也帶有新的認證設定檔時，cron 也會為當前執行保存該認證設定檔覆寫。重試是有界的：在初次嘗試加上 2 次切換重試後，cron 會中止而不是無限迴圈。

在隔離的 cron 執行進入 agent runner 之前，OpenClaw 會檢查可連線的本地提供者端點，針對 `baseUrl` 為 loopback、private-network 或 `.local` 的已設定 `api: "ollama"` 和 `api: "openai-completions"` 提供者。如果該端點已關閉，執行會被記錄為 `skipped` 並附上清楚的供應商/模型錯誤，而不是啟動模型呼叫。端點結果會快取 5 分鐘，因此許多使用同一個已故障本地 Ollama、vLLM、SGLang 或 LM Studio 伺服器的到期工作會共用一個小型探測，而不是建立請求風暴。略過的提供者預檢執行不會增加執行錯誤退避；當您想要重複的略過通知時，請啟用 `failureAlert.includeSkipped`。

## 傳遞與輸出

| 模式       | 發生什麼事                                     |
| ---------- | ---------------------------------------------- |
| `announce` | 如果代理程式未發送，則將最終文字後援傳遞給目標 |
| `webhook`  | 將完成事件承載 POST 到 URL                     |
| `none`     | 無執行器後援傳遞                               |

使用 `--announce --channel telegram --to "-1001234567890"` 進行頻道傳遞。對於 Telegram 論壇主題，請使用 `-1001234567890:topic:123`；直接 RPC/config 呼叫者也可以傳遞 `delivery.threadId` 作為字串或數字。Slack/Discord/Mattermost 目標應使用明確的前綴（`channel:<id>`、`user:<id>`）。Matrix 房間 ID 區分大小寫；請使用來自 Matrix 的確切房間 ID 或 `room:!room:server` 形式。

當 announce 傳遞使用 `channel: "last"` 或省略 `channel` 時，具有提供者前綴的目標（例如 `telegram:123`）可以在 cron 回退到會話記錄或單個配置頻道之前選擇頻道。僅已載入外掛程式宣佈的前綴才是提供者選擇器。如果 `delivery.channel` 是明確的，則目標前綴必須命名相同的提供者；例如，`channel: "whatsapp"` 搭配 `to: "telegram:123"` 會被拒絕，而不是讓 WhatsApp 將 Telegram ID 解釋為電話號碼。目標類型和服務前綴，例如 `channel:<id>`、`user:<id>`、`imessage:<handle>` 和 `sms:<number>`，仍然是頻道擁有的目標語法，而不是提供者選擇器。

對於隔離作業，聊天傳遞是共享的。如果聊天路由可用，即使作業使用 `--no-deliver`，代理程式也可以使用 `message` 工具。如果代理程式發送到配置/當前目標，OpenClaw 會跳過後援 announce。否則，`announce`、`webhook` 和 `none` 僅控制執行器在代理程式輪次之後對最終回覆所做的處理。

當代理程式從活躍聊天中建立隔離提醒時，OpenClaw 會將保留的即時傳遞目標存儲用於後援 announce 路由。內部會話金鑰可能是小寫；當當前聊天上下文可用時，提供者傳遞目標不會從這些金鑰重建。

隱式公告傳遞使用配置的通道允許清單來驗證並重新路由過期的目標。DM 配對儲存核准不是自動化的後備接收者；當排程任務應主動發送至 DM 時，請設定 `delivery.to` 或配置通道 `allowFrom` 項目。

失敗通知遵循單獨的目的地路徑：

- `cron.failureDestination` 設定失敗通知的全域預設值。
- `job.delivery.failureDestination` 會針對每個工作覆寫該設定。
- 如果兩者皆未設定，且工作已透過 `announce` 傳遞，失敗通知現在會回退至該主要公告目標。
- 除非主要傳遞模式是 `webhook`，否則 `delivery.failureDestination` 僅支援 `sessionTarget="isolated"` 工作。
- `failureAlert.includeSkipped: true` 讓工作或全域 cron 警示策略選擇接收重複的跳過執行警示。跳過的執行會維護單獨的連續跳過計數器，因此不會影響執行錯誤的退避。

## CLI 範例

<Tabs>
  <Tab title="一次性提醒">```bash openclaw cron add \ --name "Calendar check" \ --at "20m" \ --session main \ --system-event "Next heartbeat: check calendar." \ --wake now ```</Tab>
  <Tab title="週期性隔離工作">```bash openclaw cron add \ --name "Morning brief" \ --cron "0 7 * * *" \ --tz "America/Los_Angeles" \ --session isolated \ --message "Summarize overnight updates." \ --announce \ --channel slack \ --to "channel:C1234567890" ```</Tab>
  <Tab title="模型與思考覆寫">```bash openclaw cron add \ --name "Deep analysis" \ --cron "0 6 * * 1" \ --tz "America/Los_Angeles" \ --session isolated \ --message "Weekly deep analysis of project progress." \ --model "opus" \ --thinking high \ --announce ```</Tab>
</Tabs>

## Webhooks

Gateway 可以為外部觸發程序公開 HTTP webhook 端點。在配置中啟用：

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

查詢字串 token 會被拒絕。

<AccordionGroup>
  <Accordion title="POST /hooks/wake">
    將系統事件加入主工作階段的佇列：

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
    執行獨立的 agent 週期：

    ```bash
    curl -X POST http://127.0.0.1:18789/hooks/agent \
      -H 'Authorization: Bearer SECRET' \
      -H 'Content-Type: application/json' \
      -d '{"message":"Summarize inbox","name":"Email","model":"openai/gpt-5.4"}'
    ```

    欄位：`message`（必填）、`name`、`agentId`、`wakeMode`、`deliver`、`channel`、`to`、`model`、`fallbacks`、`thinking`、`timeoutSeconds`。

  </Accordion>
  <Accordion title="對應的 hooks (POST /hooks/<name>)">
    自訂 hook 名稱透過設定檔中的 `hooks.mappings` 解析。對應關係可以使用範本或程式碼轉換，將任意 payload 轉換為 `wake` 或 `agent` 動作。
  </Accordion>
</AccordionGroup>

<Warning>
請將 hook 端點保留在 loopback、tailnet 或受信任的反向代理後方。

- 使用專用的 hook token；請勿重複使用 gateway auth token。
- 將 `hooks.path` 保留在專用的子路徑上；`/` 會被拒絕。
- 設定 `hooks.allowedAgentIds` 以限制明確的 `agentId` 路由。
- 除非您需要呼叫端選擇的 session，否則請保持 `hooks.allowRequestSessionKey=false`。
- 如果您啟用 `hooks.allowRequestSessionKey`，請同時設定 `hooks.allowedSessionKeyPrefixes` 以限制允許的 session key 形狀。
- Hook payload 預設會被安全邊界包裝。

</Warning>

## Gmail PubSub 整合

透過 Google PubSub 將 Gmail 收件匣觸發器連線至 OpenClaw。

<Note>**先決條件：**`gcloud` CLI、`gog` (gogcli)、已啟用 OpenClaw hooks、用於公開 HTTPS 端點的 Tailscale。</Note>

### 精靈設定（推薦）

```bash
openclaw webhooks gmail setup --account openclaw@gmail.com
```

這會寫入 `hooks.gmail` 設定、啟用 Gmail 預設集，並使用 Tailscale Funnel 作為推播端點。

### Gateway 自動啟動

當設定 `hooks.enabled=true` 和 `hooks.gmail.account` 時，Gateway 會在開機時啟動 `gog gmail watch serve` 並自動續約監視。設定 `OPENCLAW_SKIP_GMAIL_WATCHER=1` 即可選擇退出。

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
  <Step title="建立主題並授予 Gmail 推送存取權">
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
模型覆寫說明：

- `openclaw cron add|edit --model ...` 會變更工作選取的模型。
- 若允許該模型，該特定的提供者/模型將會到達獨立代理程式執行。
- 若不允許或無法解析，cron 會以明確的驗證錯誤使執行失敗。
- 因為 cron `--model` 是工作主要設定，而非工作階段 `/model` 覆寫，所以設定的後援鏈仍然適用。
- Payload `fallbacks` 會取代該工作的設定後援；`fallbacks: []` 則會停用後援並使執行變為嚴格模式。
- 若沒有明確或設定的後援清單，單純的 `--model` 不會靜默地將代理程式主要設定作為額外的重試目標。

</Note>

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

`maxConcurrentRuns` 同時限制了已排程的 cron 分派與獨立的代理程式輪次執行。獨立的 cron 代理程式輪次會在內部使用佇列專用的 `cron-nested` 執行通道，因此提高此數值可讓獨立的 cron LLM 執行並行進行，而不僅是啟動其外部的 cron 包裝函式。此設定不會擴充共用的非 cron `nested` 通道。

執行時期狀態 sidecar 是衍生自 `cron.store`：諸如 `~/clawd/cron/jobs.json` 之類的 `.json` 存儲會使用 `~/clawd/cron/jobs-state.json`，而沒有 `.json` 後綴的存儲路徑則會附加 `-state.json`。

如果您手動編輯 `jobs.json`，請將 `jobs-state.json` 排除在原始碼控制之外。OpenClaw 使用該 sidecar 檔案來儲存待定槽位、啟用標記、上次執行中繼資料，以及排程身分（用於告知排程器何時需要為外部編輯的工作產生新的 `nextRunAtMs`）。

停用 cron：`cron.enabled: false` 或 `OPENCLAW_SKIP_CRON=1`。

<AccordionGroup>
  <Accordion title="重試行為">
    **單次重試**：暫時性錯誤（速率限制、過載、網路、伺服器錯誤）會重試最多 3 次，並採用指數退避。永久性錯誤會立即停用。

    **週期性重試**：重試之間採用指數退避（30 秒到 60 分鐘）。在下一次成功執行後，退避時間會重置。

  </Accordion>
  <Accordion title="維護">
    `cron.sessionRetention`（預設 `24h`）會修剪獨立執行階段的項目。`cron.runLog.maxBytes` / `cron.runLog.keepLines` 會自動修剪執行記錄檔。
  </Accordion>
</AccordionGroup>

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

<AccordionGroup>
  <Accordion title="Cron 未觸發">
    - 檢查 `cron.enabled` 和 `OPENCLAW_SKIP_CRON` 環境變數。
    - 確認 Gateway 持續在執行中。
    - 針對 `cron` 排程，請驗證時區（`--tz`）與主機時區是否一致。
    - 執行輸出中的 `reason: not-due` 表示已使用 `openclaw cron run <jobId> --due` 檢查手動執行，但該工作尚未到期。

  </Accordion>
  <Accordion title="Cron 已觸發但未傳送">
    - 傳送模式 `none` 表示不預期有執行器的備用傳送。當有聊天路由可用時，代理仍然可以使用 `message` 工具直接傳送。
    - 傳送目標遺失/無效 (`channel`/`to`) 表示已跳過傳出。
    - 對於 Matrix，複製或舊版工作中使用小寫 `delivery.to` 房間 ID 可能會失敗，因為 Matrix 房間 ID 有區分大小寫。請將工作編輯為 Matrix 中確切的 `!room:server` 或 `room:!room:server` 值。
    - 頻道驗證錯誤 (`unauthorized`, `Forbidden`) 表示傳送被憑證阻擋。
    - 如果獨立執行僅返回靜默標記 (`NO_REPLY` / `no_reply`)，OpenClaw 會抑制直接傳出傳送，並抑制備用排程摘要路徑，因此不會回傳任何內容到聊天。
    - 如果代理應該自己傳送訊息給使用者，請檢查工作是否有可用的路由 (`channel: "last"` 搭配先前的聊天，或明確的頻道/目標)。

  </Accordion>
  <Accordion title="Cron 或心跳似乎會阻止 /new-style 週期重置">
    - 每日和閒置重置的新鮮度不是基於 `updatedAt`；請參閱 [Session management](/zh-Hant/concepts/session#session-lifecycle)。
    - Cron 喚醒、心跳執行、執行通知和閘道簿記可能會更新會話行以進行路由/狀態設定，但它們不會延長 `sessionStartedAt` 或 `lastInteractionAt`。
    - 對於在這些欄位存在之前建立的舊版行，當檔案仍可用時，OpenClaw 可以從逐字稿 JSONL 會話標頭還原 `sessionStartedAt`。沒有 `lastInteractionAt` 的舊版閒置行會使用該還原的開始時間作為其閒置基準。

  </Accordion>
  <Accordion title="時區陷阱">
    - 未指定 `--tz` 的 Cron 會使用閘道主機的時區。
    - 未指定時區的 `at` 排程會被視為 UTC。
    - Heartbeat `activeHours` 會使用設定的時區解析方式。

  </Accordion>
</AccordionGroup>

## 相關

- [Automation & Tasks](/zh-Hant/automation) — 一目瞭然的所有自動化機制
- [Background Tasks](/zh-Hant/automation/tasks) — Cron 執行的任務分類帳
- [Heartbeat](/zh-Hant/gateway/heartbeat) — 週期性主工作階段輪次
- [Timezone](/zh-Hant/concepts/timezone) — 時區設定
