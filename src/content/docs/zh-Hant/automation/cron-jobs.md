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
  <Step title="新增一次性提醒">
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
    openclaw cron get <job-id>
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
- 隔離的 cron 執行會使用來自嵌入式執行的結構化執行拒絕中繼資料，包括巢狀錯誤訊息以 `SYSTEM_RUN_DENIED` 或 `INVALID_REQUEST` 開頭的節點主機 `UNAVAILABLE` 包裝函式，因此被阻擋的指令不會被回報為成功執行，而一般的助理文字也不會被視為拒絕。
- 隔離 cron 執行還會將執行層級的代理程式失敗視為任務錯誤，即使沒有產生回覆負載，因此模型/提供者失敗會增加錯誤計數器並觸發失敗通知，而不是將任務清除為成功。
- 當隔離的代理輪次作業達到 `timeoutSeconds` 時，cron 會中止基礎的代理執行並給予一個短暫的清理時間窗。如果執行未耗盡，Gateway 擁有的清理機制會在 cron 記錄逾時之前強制清除該執行的階段作業擁有權，因此佇列中的聊天工作不會滯留在過期的處理階段之後。
- 如果隔離的代理輪次在執行器啟動之前或在首次模型呼叫之前停滯，cron 會記錄階段特定的逾時，例如 `setup timed out before runner start` 或 `stalled before first model call (last phase: context-engine)`。這些監看程式涵蓋嵌入式提供者和 CLI 支援的提供者，在其外部 CLI 處理程序實際啟動之前，並獨立於長 `timeoutSeconds` 值進行限制，以便冷啟動/驗證/情境失敗能快速浮現，而不是等待完整的作業預算。

<a id="maintenance"></a>

<Note>
cron 的任務對帥以執行階段擁有者為優先，持續性歷史記錄為輔助：只要 cron 執行階段仍追蹤該作業正在執行，作用中的 cron 任務就會保持運作，即使舊的子階段記錄列仍然存在。一旦執行階段停止擁有該作業且 5 分鐘寬限期滿，維護程序會檢查相符 `cron:<jobId>:<startedAt>` 執行的持續性執行日誌和作業狀態。如果該持續性歷史記錄顯示終止結果，任務分類帳即據以結算；否則 Gateway 擁有的維護程序可將任務標記為 `lost`。離線 CLI 稽核可以從持續性歷史記錄中恢復，但它不會將其本身空白的處理中作用中作業集視為 Gateway 擁有的 cron 執行已消失的證明。
</Note>

## 排程類型

| 種類    | CLI 標誌  | 說明                                               |
| ------- | --------- | -------------------------------------------------- |
| `at`    | `--at`    | 單次時間戳記 (ISO 8601 或相對時間，例如 `20m`)     |
| `every` | `--every` | 固定間隔                                           |
| `cron`  | `--cron`  | 5 欄位或 6 欄位的 cron 表達式，可選擇性加入 `--tz` |

不帶時區的時間戳會被視為 UTC。請加入 `--tz America/New_York` 以進行本地牆時排程。

週期性的整點表達式會自動錯開最多 5 分鐘，以減少負載尖峰。請使用 `--exact` 強制精確時間，或使用 `--stagger 30s` 指定明確的時間視窗。

### 月份中的日期與星期中的日期使用 OR 邏輯

Cron 表達式由 [croner](https://github.com/Hexagon/croner) 解析。當「日期（月）」與「星期」欄位皆非萬用字元時，croner 會在 **任一** 欄位符合時即匹配，而非兩者皆需符合。這是標準 Vixie cron 的行為。

```
# Intended: "9 AM on the 15th, only if it's a Monday"
# Actual:   "9 AM on every 15th, AND 9 AM on every Monday"
0 9 15 * 1
```

這會導致每個月觸發約 5-6 次，而非每月 0-1 次。OpenClaw 在此處使用 Croner 的預設 OR 行為。若需同時滿足兩個條件，請使用 Croner 的 `+` 星期修飾符（`0 9 15 * +1`），或在其中一個欄位進行排程，並在您的提示詞或指令中防衛另一個欄位。

## 執行樣式

| 樣式     | `--session` 值      | 執行於              | 最適用於               |
| -------- | ------------------- | ------------------- | ---------------------- |
| 主要會話 | `main`              | 專用 cron 喚醒通道  | 提醒、系統事件         |
| 隔離     | `isolated`          | 專用 `cron:<jobId>` | 報告、背景雜務         |
| 目前會話 | `current`           | 於建立時綁定        | 具情境感知的週期性工作 |
| 自訂會話 | `session:custom-id` | 具持久化的具名會話  | 基於歷史紀錄的工作流程 |

<AccordionGroup>
  <Accordion title="主會話 vs 隔離 vs 自訂">
    **主會话** 工作會將系統事件加入 cron 擁有的執行通道，並可選擇性地喚醒心跳（`--wake now` 或 `--wake next-heartbeat`）。它們可以使用目標主會話的最後一次傳遞語境來回覆，但並不會將例行的 cron 輪次附加至人員聊天通道，也不會延長目標會話的每日/閒置重置新鮮度。**隔離** 工作會使用全新會話執行專屬的代理輪次。**自訂會話**（`session:xxx`）會在各次執行間持續保留語境，讓像是每日站會這樣能夠基於先前摘要的工作流程成為可能。
  </Accordion>
  <Accordion title="「新工作階段」對隔離作業的意義">
    對於隔離作業，「新工作階段」表示每次執行都有一個新的文字記錄/工作階段 ID。OpenClaw 可能會攜帶安全的偏好設定，例如思考/快速/詳細設定、標籤，以及明確的使用者選取模型/授權覆寫，但它不會繼承較舊的 cron 記錄中的環境對話上下文：頻道/群組路由、傳送或排入佇列策略、提權、來源或 ACP 執行時期繫結。當週期性作業應刻意建立在相同的對話上下文時，請使用 `current` 或 `session:<id>`。
  </Accordion>
  <Accordion title="執行時期清理">
    對於隔離工作，執行時期拆解現在包含對該 cron 工作階段的最佳瀏覽器清理。清理失敗會被忽略，因此實際的 cron 結果仍然優先。

    隔離的 cron 執行也會透過共用的執行時期清理路徑，釋放為該工作建立的任何捆綁 MCP 執行時期實例。這與主工作階段和自訂工作階段 MCP 用戶端的拆解方式相符，因此隔離的 cron 工作不會在執行之間洩漏 stdio 子程序或長期存在的 MCP 連線。

  </Accordion>
  <Accordion title="Subagent 和 Discord 傳遞">
    當隔離的 cron 執行協調 subagent 時，傳遞也會偏好最終的後代輸出，而非過時的父級暫存文字。如果後代仍在執行中，OpenClaw 會抑制該部分父級更新，而不是發布它。

    對於僅文字的 Discord 公告目標，OpenClaw 會傳送一次標準的最終助理文字，而不是重播串流/中間文字酬載和最終答案。媒體和結構化的 Discord 酬載仍然作為分開的酬載傳送，因此附件和元件不會被遺漏。

  </Accordion>
</AccordionGroup>

### 隔離工作的酬載選項

<ParamField path="--message" type="string" required>
  提示詞文字（隔離作業必填）。
</ParamField>
<ParamField path="--model" type="string">
  模型覆寫；使用作業所選取的允許模型。
</ParamField>
<ParamField path="--thinking" type="string">
  思考等級覆寫。
</ParamField>
<ParamField path="--light-context" type="boolean">
  略過工作區啟動檔案注入。
</ParamField>
<ParamField path="--tools" type="string">
  限制作業可使用的工具，例如 `--tools exec,read`。
</ParamField>

`--model` 使用所選取的允許模型作為該作業的主要模型。這與聊天工作階段 `/model` 覆寫不同：當作業主要模型失敗時，設定的後援鏈仍然會套用。如果請求的模型不被允許或無法解析，cron 會以明確的驗證錯誤讓執行失敗，而不是自動回退至作業的代理程式/預設模型選擇。

Cron 作業也可以攜帶 Payload 層級的 `fallbacks`。當存在時，該清單會取代作業設定的後援鏈。當您想要嚴格的 cron 執行且僅嘗試選取的模型時，請在作業 Payload/API 中使用 `fallbacks: []`。如果作業具有 `--model` 但沒有 payload 或設定的後援，OpenClaw 會傳遞明確的空後援覆寫，因此代理程式主要模型不會被附加為隱藏的額外重試目標。

獨立作業的模型選擇優先順序為：

1. Gmail 掛鉤模型覆寫（當執行來自 Gmail 且該覆寫被允許時）
2. 每次任務的 Payload `model`
3. 使用者選取的儲存 cron 工作階段模型覆寫
4. Agent/預設模型選擇

快速模式也遵循解析後的即時選擇。如果選定的模型配置有 `params.fastMode`，隔離的 cron 預設會使用該設定。無論方向如何，儲存的 Session `fastMode` 覆蓋仍優先於配置。

如果獨立執行遇到即時模型切換的移交，cron 會使用切換後的提供商/模型重試，並在重試前將該即時選擇持久化保存至當前執行。當切換也帶有新的身份設定檔時，cron 也會將該身份設定檔覆蓋持久化保存至當前執行。重試是有上限的：在初始嘗試加上 2 次切換重試後，cron 會中止執行而不是無限循環。

在隔離的 cron 執行進入代理運行器之前，OpenClaw 會檢查可達的本機提供者端點，針對配置的 `api: "ollama"` 和 `api: "openai-completions"` 提供者，其 `baseUrl` 為 loopback、private-network 或 `.local`。如果該端點停機，該次執行會被記錄為 `skipped`，並附上清楚的提供者/模型錯誤，而不是啟動模型呼叫。端點結果會快取 5 分鐘，因此許多使用同一個已停機的本機 Ollama、vLLM、SGLang 或 LM Studio 伺服器的到期任務，會共用一次小型探測，而不是造成請求風暴。跳過提供者預檢的執行不會增加執行錯誤的退避時間；當您想要重複收到跳過通知時，請啟用 `failureAlert.includeSkipped`。

## 傳遞與輸出

| 模式       | 發生情況                                           |
| ---------- | -------------------------------------------------- |
| `announce` | 如果代理程式未發送內容，則將最終文字備援傳遞至目標 |
| `webhook`  | 將已完成事件負載 POST 至 URL                       |
| `none`     | 無執行器備援傳遞                                   |

使用 `--announce --channel telegram --to "-1001234567890"` 進行頻道傳送。對於 Telegram 論壇主題，請使用 `-1001234567890:topic:123`；直接的 RPC/配置 呼叫者也可以傳遞 `delivery.threadId` 作為字串或數字。Slack/Discord/Mattermost 目標應使用明確的前綴 (`channel:<id>`、`user:<id>`)。Matrix 房間 ID 有區分大小寫；請使用來自 Matrix 的確切房間 ID 或 `room:!room:server` 形式。

當公告傳送使用 `channel: "last"` 或省略 `channel` 時，諸如 `telegram:123` 的提供者前綴目標可以在 cron 回退到工作階段歷史或單一設定通道之前選擇通道。只有已載入外掛宣佈的前綴才是提供者選擇器。如果明確指定了 `delivery.channel`，則目標前綴必須指定相同的提供者；例如，會拒絕 `channel: "whatsapp"` 搭配 `to: "telegram:123"`，而不是讓 WhatsApp 將 Telegram ID 解讀為電話號碼。目標類型和服務前綴，如 `channel:<id>`、`user:<id>`、`imessage:<handle>` 和 `sms:<number>`，仍屬於通道擁有的目標語法，而非提供者選擇器。

對於隔離作業，聊天傳送是共享的。如果聊天路由可用，即使作業使用 `--no-deliver`，代理程式仍可使用 `message` 工具。如果代理程式傳送到設定/目前目標，OpenClaw 會略過回退公告。否則，`announce`、`webhook` 和 `none` 僅控制執行器在代理程式輪次之後對最終回覆的處理方式。

當代理程式從活躍聊天中建立隔離提醒時，OpenClaw 會儲存保留的即時發送目標作為回退公告路由。內部會話金鑰可能為小寫；當當前聊天內容可用時，提供者發送目標不會從這些金鑰重建。

隱含公告傳送使用設定的通道允許清單來驗證並重新路由過時的目標。DM 配對儲存核准並非回退自動化接收者；當排程作業應主動傳送至 DM 時，請設定 `delivery.to` 或設定通道 `allowFrom` 項目。

失敗通知遵循單獨的目的地路徑：

- `cron.failureDestination` 設定了失敗通知的全域預設值。
- `job.delivery.failureDestination` 會針對每個作業覆寫該設定。
- 如果兩者皆未設定，且作業已透過 `announce` 傳送，失敗通知現在會回退到該主要公告目標。
- `delivery.failureDestination` 僅在主要傳送模式為 `webhook` 時才支援 `sessionTarget="isolated"` 作業。
- `failureAlert.includeSkipped: true` 啟用作業或全域 cron 警報策略的重複跳過執行警報。跳過的執行會維護一個獨立的連續跳過計數器，因此不會影響執行錯誤的退避機制。

## CLI 範例

<Tabs>
  <Tab title="單次提醒">```bash openclaw cron add \ --name "Calendar check" \ --at "20m" \ --session main \ --system-event "Next heartbeat: check calendar." \ --wake now ```</Tab>
  <Tab title="週期性隔離作業">```bash openclaw cron add \ --name "Morning brief" \ --cron "0 7 * * *" \ --tz "America/Los_Angeles" \ --session isolated \ --message "Summarize overnight updates." \ --announce \ --channel slack \ --to "channel:C1234567890" ```</Tab>
  <Tab title="模型與思考覆寫">```bash openclaw cron add \ --name "Deep analysis" \ --cron "0 6 * * 1" \ --tz "America/Los_Angeles" \ --session isolated \ --message "Weekly deep analysis of project progress." \ --model "opus" \ --thinking high \ --announce ```</Tab>
</Tabs>

## Webhooks

Gateway 可以公開 HTTP webhook 端點以供外部觸發。請在配置中啟用：

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

查詢字串 token 將會被拒絕。

<AccordionGroup>
  <Accordion title="POST /hooks/wake">
    為主工作階段將系統事件加入佇列：

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
    執行獨立的 agent 輪次：

    ```bash
    curl -X POST http://127.0.0.1:18789/hooks/agent \
      -H 'Authorization: Bearer SECRET' \
      -H 'Content-Type: application/json' \
      -d '{"message":"Summarize inbox","name":"Email","model":"openai/gpt-5.4"}'
    ```

    欄位：`message` (必填)、`name`、`agentId`、`wakeMode`、`deliver`、`channel`、`to`、`model`、`fallbacks`、`thinking`、`timeoutSeconds`。

  </Accordion>
  <Accordion title="Mapped hooks (POST /hooks/<name>)">
    自訂 hook 名稱透過設定中的 `hooks.mappings` 解析。對應可以使用範本或程式碼轉換，將任意 payload 轉換為 `wake` 或 `agent` 動作。
  </Accordion>
</AccordionGroup>

<Warning>
請將 hook 端點置於 loopback、tailnet 或受信任的反向代理之後。

- 使用專用的 hook token；不要重複使用 gateway 驗證 token。
- 將 `hooks.path` 放在專用的子路徑上；`/` 會被拒絕。
- 設定 `hooks.allowedAgentIds` 以限制明確的 `agentId` 路由。
- 除非您需要由呼叫者選擇的 session，否則請保留 `hooks.allowRequestSessionKey=false`。
- 如果您啟用 `hooks.allowRequestSessionKey`，同時設定 `hooks.allowedSessionKeyPrefixes` 以限制允許的 session key 形狀。
- Hook payload 預設會由安全邊界包裝。

</Warning>

## Gmail PubSub 整合

透過 Google PubSub 將 Gmail 收件匣觸發程序連線至 OpenClaw。

<Note>**先決條件：** `gcloud` CLI、`gog` (gogcli)、已啟用 OpenClaw hooks、用於公開 HTTPS 端點的 Tailscale。</Note>

### 精靈設定（推薦）

```bash
openclaw webhooks gmail setup --account openclaw@gmail.com
```

這會寫入 `hooks.gmail` 設定，啟用 Gmail 預設集，並使用 Tailscale Funnel 作為推送端點。

### Gateway 自動啟動

當設定 `hooks.enabled=true` 和 `hooks.gmail.account` 時，Gateway 會在開機時啟動 `gog gmail watch serve` 並自動續期監看。設定 `OPENCLAW_SKIP_GMAIL_WATCHER=1` 以退出。

### 手動一次性設定

<Steps>
  <Step title="Select the GCP project">
    選擇擁有 `gog` 使用的 OAuth 用戶端的 GCP 專案：

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
  <Step title="開始監視">
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

# Get one stored job as JSON
openclaw cron get <jobId>

# Show one job, including resolved delivery route
openclaw cron show <jobId>

# Edit a job
openclaw cron edit <jobId> --message "Updated prompt" --model "opus"

# Force run a job now
openclaw cron run <jobId>

# Force run a job now and wait for its terminal status
openclaw cron run <jobId> --wait --wait-timeout 10m --poll-interval 2s

# Run only if due
openclaw cron run <jobId> --due

# View run history
openclaw cron runs --id <jobId> --limit 50

# View one exact run
openclaw cron runs --id <jobId> --run-id <runId>

# Delete a job
openclaw cron remove <jobId>

# Agent selection (multi-agent setups)
openclaw cron add --name "Ops sweep" --cron "0 6 * * *" --session isolated --message "Check ops queue" --agent ops
openclaw cron edit <jobId> --clear-agent
```

`openclaw cron run <jobId>` 在將手動執行加入佇列後返回。對於必須等到佇列執行完成才能解除封鎖的關閉 hook、維護腳本或其他自動化作業，請使用 `--wait`。等待模式會輪詢確切返回的 `runId`；對於狀態 `ok`，它會以 `0` 退出，而對於 `error`、`skipped` 或等待逾時，則會以非零值退出。

<Note>
模型覆寫說明：

- `openclaw cron add|edit --model ...` 會變更作業所選的模型。
- 如果該模型被允許，該特定的提供者/模型會到達獨立的代理執行環境。
- 如果不被允許或無法解析，cron 會以明確的驗證錯誤讓執行失敗。
- 設定的後援鏈仍然適用，因為 cron `--model` 是一個作業主要設定，而非工作階段 `/model` 覆寫。
- Payload `fallbacks` 會取代該作業的設定後援；`fallbacks: []` 則會停用後援並使執行變為嚴格模式。
- 不含明確或設定後援清單的純 `--model` 不會靜默地將代理主要設定作為額外的重試目標來退回使用。

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

`maxConcurrentRuns` 同時限制了排定的 cron 分派與獨立代理回合執行。獨立的 cron 代理回合在內部使用佇列專用的 `cron-nested` 執行通道，因此提高此數值可讓獨立的 cron LLM 執行並行進行，而不僅是啟動其外層的 cron 包裝器。共用的非 cron `nested` 通道不會因此設定而變寬。

執行時期狀態側車是衍生自 `cron.store`：諸如 `~/clawd/cron/jobs.json` 之類的 `.json` 存儲會使用 `~/clawd/cron/jobs-state.json`，而不含 `.json` 後綴的存儲路徑則會附加 `-state.json`。

如果您手動編輯 `jobs.json`，請將 `jobs-state.json` 排除在版本控制之外。OpenClaw 使用該側車來處理待處理時段、活動標記、上次執行中繼資料，以及用來告訴排程器何時需要為外部編輯的作業產生全新 `nextRunAtMs` 的排程身分識別。

停用 cron：`cron.enabled: false` 或 `OPENCLAW_SKIP_CRON=1`。

<AccordionGroup>
  <Accordion title="重試行為">
    **單次重試**：暫時性錯誤（速率限制、過載、網路、伺服器錯誤）最多會重試 3 次，並採用指數退避。永久錯誤會立即停用。

    **循環重試**：重試之間採用指數退避（30 秒到 60 分鐘）。在下次成功執行後，退避會重置。

  </Accordion>
  <Accordion title="維護">
    `cron.sessionRetention` (預設 `24h`) 會修剪獨立執行階段項目。`cron.runLog.maxBytes` / `cron.runLog.keepLines` 會自動修剪執行記錄檔。
  </Accordion>
</AccordionGroup>

## 故障排除

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
    - 確認 Gateway 正持續運行。
    - 對於 `cron` 排程，請驗證時區 (`--tz`) 與主機時區是否一致。
    - 執行輸出中的 `reason: not-due` 表示已使用 `openclaw cron run <jobId> --due` 檢查手動執行，且作業尚未到期。

  </Accordion>
  <Accordion title="Cron 已觸發但未傳送">
    - 傳送模式 `none` 表示預期不會有執行器備援傳送。當聊天路由可用時，Agent 仍可使用 `message` 工具直接傳送。
    - 傳送目標遺失/無效 (`channel`/`to`) 表示已跳過傳出。
    - 對於 Matrix，具有小寫 `delivery.to` 房間 ID 的複製或舊版作業可能會失敗，因為 Matrix 房間 ID 區分大小寫。請將作業編輯為 Matrix 中的確切 `!room:server` 或 `room:!room:server` 值。
    - 頻道驗證錯誤 (`unauthorized`, `Forbidden`) 表示傳送被憑證封鎖。
    - 如果獨立執行僅傳回靜默權杖 (`NO_REPLY` / `no_reply`)，OpenClaw 會抑制直接傳出傳送，並抑制備援佇列摘要路徑，因此不會將任何內容張貼回聊天。
    - 如果 Agent 應該自行傳送訊息給使用者，請檢查作業是否有可用的路由 (`channel: "last"` 搭配先前的聊天，或明確的頻道/目標)。

  </Accordion>
  <Accordion title="Cron or heartbeat appears to prevent /new-style rollover">
    - 每日重置與閒置重置的新鮮度並非基於 `updatedAt`；請參閱[會話管理](/zh-Hant/concepts/session#session-lifecycle)。
    - Cron 喚醒、heartbeat 執行、exec 通知以及 gateway 簿記可能會更新會話行以用於路由/狀態，但它們不會延長 `sessionStartedAt` 或 `lastInteractionAt`。
    - 對於在這些欄位存在之前建立的舊版行，當檔案仍然可用時，OpenClaw 可以從文字記錄 JSONL 會話標頭中還原 `sessionStartedAt`。沒有 `lastInteractionAt` 的舊版閒置行會使用該還原的開始時間作為其閒置基線。

  </Accordion>
  <Accordion title="Timezone gotchas">
    - 沒有 `--tz` 的 Cron 會使用 gateway 主機的時區。
    - 沒有時區的 `at` 排程會被視為 UTC。
    - Heartbeat `activeHours` 使用已配置的時區解析。

  </Accordion>
</AccordionGroup>

## 相關

- [自動化](/zh-Hant/automation) — 所有自動化機制一覽
- [背景任務](/zh-Hant/automation/tasks) — cron 執行的任務分類帳
- [Heartbeat](/zh-Hant/gateway/heartbeat) — 週期性主會話輪次
- [時區](/zh-Hant/concepts/timezone) — 時區配置
