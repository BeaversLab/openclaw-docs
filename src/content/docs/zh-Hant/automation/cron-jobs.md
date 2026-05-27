---
summary: "Gateway 排程器的排程工作、webhook 和 Gmail PubSub 觸發器"
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
- 工作定義會持續保存在 `~/.openclaw/cron/jobs.json`，因此重新啟動不會遺失排程。
- 執行時期執行狀態會持續保存在旁邊的 `~/.openclaw/cron/jobs-state.json`。如果您在 git 中追蹤 cron 定義，請追蹤 `jobs.json` 並將 `jobs-state.json` 設為 gitignore。
- 分割後，較舊的 OpenClaw 版本可以讀取 `jobs.json`，但可能會將工作視為新的，因為執行時期欄位現在位於 `jobs-state.json` 中。
- 當 Gateway 正在執行或已停止時編輯 `jobs.json`，OpenClaw 會將變更的排程欄位與待處理的執行時期插槽中繼資料進行比較，並清除過時的 `nextRunAtMs` 值。純格式化或僅重新排序鍵值的重寫會保留待處理的插槽。
- 所有 cron 執行都會建立 [背景工作](/zh-Hant/automation/tasks) 記錄。
- Gateway 啟動時，過期的隔離 agent-turn 任務會被重新排程到通道連線視窗之外，而不是立即重播，因此 Discord/Telegram 啟動和原生指令設定在重新啟動後能保持響應。
- 一次性工作 (`--at`) 預設會在成功後自動刪除。
- 隔離的 cron 執行會在執行完成時，盡最大努力關閉其 `cron:<jobId>` 會話所追蹤的瀏覽器分頁/程序，因此分離的瀏覽器自動化不會留下遺留的程序。
- 接收狹窄 cron 自我清理授權的隔離 cron 執行仍然可以讀取排程器狀態、其當前任務的自我過濾清單以及該任務的執行歷史，因此狀態/心跳檢查可以檢查其自己的排程，而無需獲得更廣泛的 cron 修改權限。
- 隔離的 cron 執行也能防止過時的確認回覆。如果第一個結果只是臨時狀態更新（`on it`、`pulling everything together` 和類似提示），且沒有子代理程式執行仍負責最終答案，OpenClaw 會在傳送前再次提示以取得實際結果。
- 隔離的 cron 執行會使用來自內嵌執行的結構化執行拒絕元數據，包括巢狀錯誤訊息以 `SYSTEM_RUN_DENIED` 或 `INVALID_REQUEST` 開頭的 node-host `UNAVAILABLE` 包裝器，因此被阻擋的指令不會被回報為成功的執行，而一般的助理文字也不會被視為拒絕。
- 隔離 cron 執行還會將執行層級的代理程式失敗視為任務錯誤，即使沒有產生回覆負載，因此模型/提供者失敗會增加錯誤計數器並觸發失敗通知，而不是將任務清除為成功。
- 當隔離的 agent-turn 工作達到 `timeoutSeconds` 時，cron 會中止底層的 agent 執行並給予一個短暫的清理視窗。如果執行未排空，Gateway 擁有的清理機制會在 cron 記錄逾時之前強制清除該執行的會話擁有權，以免排隊的聊天工作滯留在過期的處理會話之後。
- 如果隔離的 agent-turn 在 runner 啟動之前或在第一次模型呼叫之前停滯，cron 會記錄特定階段的逾時，例如 `setup timed out before runner start` 或 `stalled before first model call (last phase: context-engine)`。這些看門狗程式會在外部 CLI 程序實際啟動之前覆蓋內嵌提供者和 CLI 支援的提供者，並且與長 `timeoutSeconds` 值獨立設限，以便冷啟動/驗證/內容失敗能快速顯現，而不是等待完整的工作預算。
- 如果您使用系統 cron 或其他外部排程器來執行 `openclaw agent`，請用強制終止升級機制將其包裝，即使 CLI 處理了 `SIGTERM`/`SIGINT`。Gateway 支援的執行會要求 Gateway 中止已接受的執行；本機和內嵌的後備執行則會收到相同的中止訊號。對於 GNU `timeout`，建議優先使用 `timeout -k 60 600 openclaw agent ...` 而非純粹的 `timeout 600 ...`；如果程序無法排空，`-k` 值即為監督者的最後防線。對於 systemd 單元，請使用 `SIGTERM` 停止訊號加上寬限期（例如 `TimeoutStopSec`）再進行最終終止，以保持相同的結構。如果重試在原始 Gateway 執行仍處於活動狀態時重複使用 `--run-id`，重複項目將被回報為執行中，而不會啟動第二次執行。

<a id="maintenance"></a>

<Note>
Cron 的任務協調優先由執行時期擁有，其次依賴持久化歷史記錄：只要 cron 執行時期仍將該任務標記為執行中，一個活躍的 cron 任務就會保持運作，即使舊的子工作階段記錄仍然存在。一旦執行時期不再擁有該任務且 5 分鐘的寬限期過期，維護程序會檢查持久化的執行日誌以及與該 `cron:<jobId>:<startedAt>` 執行相符的任務狀態。如果該持久化歷史記錄顯示最終結果，則任務帳本將依此完成；否則，Gateway 所有的維護程序可將該任務標記為 `lost`。離線 CLI 審計可從持久化歷史記錄中恢復，但它不會將其自身空的進行中活躍任務集合視為 Gateway 所有的 cron 執行已消失的證明。
</Note>

## 排程類型

| 類型    | CLI 標誌  | 說明                                         |
| ------- | --------- | -------------------------------------------- |
| `at`    | `--at`    | 一次性時間戳 (ISO 8601 或相對時間，如 `20m`) |
| `every` | `--every` | 固定間隔                                     |
| `cron`  | `--cron`  | 5 欄位或 6 欄位 cron 表達式，可選 `--tz`     |

未指定時區的時間戳會被視為 UTC。請加上 `--tz America/New_York` 以進行當地牆上時鐘排程。

循環的整點表達式會自動錯開最多 5 分鐘，以減少負載尖峰。請使用 `--exact` 強制精確時間，或使用 `--stagger 30s` 指定明確視窗。

### 月份中的日期與星期幾使用 OR 邏輯

Cron 表達式由 [croner](https://github.com/Hexagon/croner) 解析。當月份中的日期與星期幾欄位皆非萬用字元時，croner 會在 **任一** 欄位符合時即匹配，而非需兩者皆符合。這是標準 Vixie cron 的行為。

```
# Intended: "9 AM on the 15th, only if it's a Monday"
# Actual:   "9 AM on every 15th, AND 9 AM on every Monday"
0 9 15 * 1
```

這會導致每月觸發約 5-6 次，而非每月 0-1 次。OpenClaw 在此使用 Croner 的預設 OR 行為。若要求兩個條件皆須符合，請使用 Croner 的 `+` 星期幾修飾詞 (`0 9 15 * +1`)，或者在單一欄位上排程，並在任務的提示或指令中防護另一個條件。

## 執行樣式

| 樣式           | `--session` 值      | 執行於               | 最適用於               |
| -------------- | ------------------- | -------------------- | ---------------------- |
| 主要工作階段   | `main`              | 專用 cron 喚醒通道   | 提醒、系統事件         |
| 隔離           | `isolated`          | 專用 `cron:<jobId>`  | 報表、後台雜務         |
| 目前的工作階段 | `current`           | 建立時綁定           | 感知語境的週期性工作   |
| 自訂工作階段   | `session:custom-id` | 持久化的具名工作階段 | 基於歷史記錄的工作流程 |

<AccordionGroup>
  <Accordion title="Main session vs isolated vs custom">
    **Main session** 工作會將系統事件加入至 cron 擁有的執行通道，並選擇性地喚醒心跳（`--wake now` 或 `--wake next-heartbeat`）。它們可以使用目標主工作階段的最後一次傳遞語境來進行回覆，但不會將常規的 cron 回合附加至人員聊天通道，也不會延長目標工作階段的每日/閒置重置新鮮度。**Isolated** 工作會以全新的工作階段執行專用的代理程式回合。**Custom sessions**（`session:xxx`）會在執行之間保持語境，啟用諸如基於先前摘要的每日站會等工作流程。

    主工作階段的 cron 事件是獨立的系統事件提醒。它們並不會自動包含預設心跳提示中的「讀取
    HEARTBEAT.md」指令。如果週期性提醒應查閱
    `HEARTBEAT.md`，請在 cron 事件文字或代理程式自己的指令中明確說明。

  </Accordion>
  <Accordion title="What 'fresh session' means for isolated jobs">
    對於隔離工作而言，「fresh session」意指每次執行都有一個新的逐字稿/工作階段 ID。OpenClaw 可能會攜帶安全的偏好設定，例如 thinking/fast/verbose 設定、標籤以及明確的使用者選取模型/身分驗證覆寫，但它不會繼承舊 cron 記錄中的環境對話語境：通道/群組路由、傳送或佇列原則、提昇權限、來源或 ACP 執行時期繫結。當週期性工作應刻意建立在相同的對話語境上時，請使用 `current` 或 `session:<id>`。
  </Accordion>
  <Accordion title="Runtime cleanup">
    對於隔離作業，執行階段拆解現在包含針對該 cron 會話的盡力而為瀏覽器清理。清理失敗會被忽略，因此實際的 cron 結果仍優先生效。

    隔離的 cron 執行也會透過共享的執行階段清理路徑，釋放為作業建立的任何捆綁 MCP 執行階段實例。這與主會話和自訂會話 MCP 客戶端的拆解方式相符，因此隔離的 cron 作業不會在執行之間洩漏 stdio 子程序或長期存活的 MCP 連線。

  </Accordion>
  <Accordion title="Subagent and Discord delivery">
    當隔離的 cron 執行協調子代理程式時，傳遞也會偏好最終的後代輸出，而非過時的父代中介文字。如果後代仍在執行，OpenClaw 會抑制該部分父代更新，而不發布它。

    對於僅文字的 Discord 公告目標，OpenClaw 只會傳送一次標準的最終助理文字，而不是重播串流/中介文字負載和最終答案。媒體和結構化的 Discord 負載仍會作為單獨的負載傳遞，因此附件和元件不會被遺漏。

  </Accordion>
</AccordionGroup>

### 隔離作業的負載選項

<ParamField path="--message" type="string" required>
  提示文字（隔離作業必填）。
</ParamField>
<ParamField path="--model" type="string">
  模型覆寫；使用作業所選取的允許模型。
</ParamField>
<ParamField path="--thinking" type="string">
  思考等級覆寫。
</ParamField>
<ParamField path="--light-context" type="boolean">
  跳過工作區啟動檔案注入。
</ParamField>
<ParamField path="--tools" type="string">
  限制作業可以使用的工具，例如 `--tools exec,read`。
</ParamField>

`--model` 使用選取的允許模型作為該任務的主要模型。這與聊天會話的 `/model` 覆蓋不同：當任務主要模型失敗時，設定的後備鏈仍然適用。如果請求的模型不被允許或無法解析，cron 會以明確的驗證錯誤使執行失敗，而不是靜默地回退到任務的 agent/預設模型選擇。

Cron 任務也可以攜帶層級的 `fallbacks`。當存在時，該列表會取代為任務設定的後備鏈。如果您想要嚴格的 cron 執行且僅嘗試選取的模型，請在任務 payload/API 中使用 `fallbacks: []`。如果任務有 `--model` 但既沒有也沒有設定的後備，OpenClaw 會傳遞一個明確的空後備覆蓋，因此 agent 主要模型不會被附加為隱藏的額外重試目標。

隔離任務的模型選擇優先順序為：

1. Gmail hook 模型覆蓋（當執行來自 Gmail 且允許該覆蓋時）
2. 每個任務的 payload `model`
3. 使用者選取的儲存 cron 會話模型覆蓋
4. Agent/預設模型選擇

快速模式也遵循解析後的即時選擇。如果選取的模型配置具有 `params.fastMode`，隔離的 cron 預設會使用它。儲存的會話 `fastMode` 覆蓋在任何方向上都優先於配置。

如果隔離執行遇到即時模型切換移交，cron 會使用切換後的提供者/模型重試，並在重試之前為活躍執行保留該即時選擇。當切換也攜帶新的 auth profile 時，cron 也會為活躍執行保留該 auth profile 覆蓋。重試是受限的：在初始嘗試加上 2 次切換重試後，cron 會中止而不是無限循環。

在隔離的 cron 執行進入代理執行器之前，OpenClaw 會檢查可達的本地提供者端點，以尋找配置的 `api: "ollama"` 和 `api: "openai-completions"` 提供者，其 `baseUrl` 為 loopback、private-network 或 `.local`。如果該端點已關閉，則該執行將被記錄為 `skipped`，並帶有清晰的提供者/模型錯誤，而不是啟動模型調用。端點結果會快取 5 分鐘，因此許多使用相同失效本地 Ollama、vLLM、SGLang 或 LM Studio 伺服器的到期任務將共享一個小型探測，而不是建立請求風暴。跳過的提供者預檢執行不會增加執行錯誤的退避時間；當您想要重複的跳過通知時，請啟用 `failureAlert.includeSkipped`。

## 傳遞與輸出

| 模式       | 發生情況                                   |
| ---------- | ------------------------------------------ |
| `announce` | 如果代理未發送，則將最終文字備援傳遞至目標 |
| `webhook`  | 將完成事件負載 POST 到 URL                 |
| `none`     | 無執行器備援傳遞                           |

使用 `--announce --channel telegram --to "-1001234567890"` 進行頻道傳遞。對於 Telegram 論壇主題，請使用 `-1001234567890:topic:123`；OpenClaw 也接受 Telegram 擁有的 `-1001234567890:123` 簡寫。直接 RPC/config 呼叫者可以將 `delivery.threadId` 作為字串或數字傳遞。Slack/Discord/Mattermost 目標應使用明確的前綴 (`channel:<id>`、`user:<id>`)。Matrix 房間 ID 區分大小寫；請使用來自 Matrix 的確切房間 ID 或 `room:!room:server` 形式。

當公告傳遞使用 `channel: "last"` 或省略 `channel` 時，諸如 `telegram:123` 的提供者前綴目標可以在 cron 回退到會話記錄或單個配置的通道之前選擇通道。只有已載入插件廣告的前綴才是提供者選擇器。如果明確指定 `delivery.channel`，則目標前綴必須命名相同的提供者；例如，`channel: "whatsapp"` 搭配 `to: "telegram:123"` 會被拒絕，而不是讓 WhatsApp 將 Telegram ID 解釋為電話號碼。諸如 `channel:<id>`、`user:<id>`、`imessage:<handle>` 和 `sms:<number>` 等目標類型和服務前綴仍保持通道擁有的目標語法，而非提供者選擇器。

對於隔離作業，聊天傳遞是共享的。如果聊天路由可用，即使作業使用 `--no-deliver`，Agent 也可以使用 `message` 工具。如果 Agent 發送到配置的/當前目標，OpenClaw 會跳過回退公告。否則，`announce`、`webhook` 和 `none` 僅控制執行器在 Agent 輪次之後對最終回覆的處理方式。

當 Agent 從活動聊天中建立隔離提醒時，OpenClaw 會為回退公告路由儲存保留的即時傳遞目標。內部會話金鑰可能是小寫的；當目前聊天語境可用時，提供者傳遞目標不會從這些金鑰重建。

隱含公告傳遞使用配置的通道允許清單來驗證並重新路由過期的目標。DM 配對儲存核可不是回退自動化接收者；當排程作業應主動發送到 DM 時，請設定 `delivery.to` 或配置通道 `allowFrom` 項目。

## 輸出語言

Cron 作業不會從通道、語言環境或先前的訊息推斷回覆語言。請將語言規則放入排程訊息或範本中：

```bash
openclaw cron edit <jobId> \
  --message "Summarize the updates. Respond in Chinese; keep URLs, code, and product names unchanged."
```

對於模板檔案，請在渲染後的提示詞中保留語言指令，並在任務執行前確認 `{{language}}` 等佔位符已填入。如果輸出混合了語言，請明確規則，例如：「敘述文字使用中文，技術術語保留英文」。

失敗通知遵循單獨的目的地路徑：

- `cron.failureDestination` 為失敗通知設定全域預設值。
- `job.delivery.failureDestination` 可針對每個任務覆寫該設定。
- 如果兩者皆未設定，且任務已透過 `announce` 傳送，失敗通知現在會退回該主要發布目標。
- 除非主要傳送模式是 `webhook`，否則 `delivery.failureDestination` 僅支援 `sessionTarget="isolated"` 任務。
- `failureAlert.includeSkipped: true` 讓任務或全域 cron 警報策略啟用重複跳過執行的警報。跳過的執行會維護一個獨立的連續跳過計數器，因此不會影響執行錯誤的退避。

## CLI 範例

<Tabs>
  <Tab title="一次性提醒">```bash openclaw cron add \ --name "Calendar check" \ --at "20m" \ --session main \ --system-event "Next heartbeat: check calendar." \ --wake now ```</Tab>
  <Tab title="定期隔離任務">```bash openclaw cron add \ --name "Morning brief" \ --cron "0 7 * * *" \ --tz "America/Los_Angeles" \ --session isolated \ --message "Summarize overnight updates." \ --announce \ --channel slack \ --to "channel:C1234567890" ```</Tab>
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

- `Authorization: Bearer <token>` (推薦)
- `x-openclaw-token: <token>`

查詢字串 token 將被拒絕。

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
    執行一個獨立的 Agent 週期：

    ```bash
    curl -X POST http://127.0.0.1:18789/hooks/agent \
      -H 'Authorization: Bearer SECRET' \
      -H 'Content-Type: application/json' \
      -d '{"message":"Summarize inbox","name":"Email","model":"openai/gpt-5.4"}'
    ```

    欄位： `message` (必填), `name`, `agentId`, `wakeMode`, `deliver`, `channel`, `to`, `model`, `fallbacks`, `thinking`, `timeoutSeconds`。

  </Accordion>
  <Accordion title="Mapped hooks (POST /hooks/<name>)">
    自訂 Hook 名稱透過設定中的 `hooks.mappings` 進行解析。對映可以使用範本或程式碼轉換，將任意 payload 轉換為 `wake` 或 `agent` 動作。
  </Accordion>
</AccordionGroup>

<Warning>
請將 Hook 端點置於 loopback、tailnet 或受信任的反向代理之後。

- 使用專用的 Hook token；請勿重複使用 Gateway auth token。
- 將 `hooks.path` 保留在專用的子路徑上；`/` 會被拒絕。
- 設定 `hooks.allowedAgentIds` 以限制明確的 `agentId` 路由。
- 保持 `hooks.allowRequestSessionKey=false`，除非您需要由呼叫者選擇的 session。
- 如果您啟用 `hooks.allowRequestSessionKey`，同時也請設定 `hooks.allowedSessionKeyPrefixes` 來限制允許的 session key 形狀。
- Hook payload 預設會以安全邊界包裝。

</Warning>

## Gmail PubSub 整合

透過 Google PubSub 將 Gmail 收件匣觸發程序連線至 OpenClaw。

<Note>**先決條件：** `gcloud` CLI、`gog` (gogcli)、已啟用 OpenClaw hooks、用於公開 HTTPS 端點的 Tailscale。</Note>

### 精靈設定 (建議)

```bash
openclaw webhooks gmail setup --account openclaw@gmail.com
```

這會寫入 `hooks.gmail` 設定，啟用 Gmail 預設集，並使用 Tailscale Funnel 作為推播端點。

### Gateway 自動啟動

當設定 `hooks.enabled=true` 和 `hooks.gmail.account` 時，Gateway 會在開機時啟動 `gog gmail watch serve` 並自動續約監看。設定 `OPENCLAW_SKIP_GMAIL_WATCHER=1` 可選擇退出。

### 一次性手動設定

<Steps>
  <Step title="選擇 GCP 專案">
    選擇擁有 `gog` 使用之 OAuth 用戶端的 GCP 專案：

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
  <Step title="啟動監控">
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

`openclaw cron run <jobId>` 在將手動執行加入佇列後立即返回。對於必須等到佇列執行完成才能結束的關機鉤子、維護腳本或其他自動化，請使用 `--wait`。等待模式會輪詢確切返回的 `runId`；如果狀態為 `ok` 則返回 `0`，若發生 `error`、`skipped` 或等待逾時則返回非零值。

<Note>
模型覆寫說明：

- `openclaw cron add|edit --model ...` 會變更工作選取的模型。
- 若模型允許使用，該確切的提供者/模型將會連線到獨立的代理程式執行。
- 若模型不允許使用或無法解析，cron 會以明確的驗證錯誤使執行失敗。
- 已設定的後援鏈依然適用，因為 cron `--model` 是工作主要設定，而非工作階段 `/model` 覆寫。
- Payload `fallbacks` 會取代該工作已設定的後援；`fallbacks: []` 則會停用後援並使執行變為嚴格模式。
- 若不帶任何明確或已設定的後援清單而僅使用純粹的 `--model`，則不會將代理程式主要設定作為無聲的額外重試目標來進行回退。

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

`maxConcurrentRuns` 同時限制了排定的 cron 分派與獨立的代理程式輪次執行。獨立的 cron 代理程式輪次在內部會使用佇列專屬的 `cron-nested` 執行通道，因此提高此數值可讓獨立的 cron LLM 執行並行進行，而不僅是啟動其外部的 cron 包裝程式。共享的非 cron `nested` 通道不會因為此設定而變寬。

執行時狀態側車源自 `cron.store`：諸如 `~/clawd/cron/jobs.json` 之類的 `.json` 存儲會使用 `~/clawd/cron/jobs-state.json`，而沒有 `.json` 後綴的存儲路徑則會附加 `-state.json`。

如果您手動編輯 `jobs.json`，請將 `jobs-state.json` 保留在原始碼控制之外。OpenClaw 使用該側車來處理待處理槽位、活動標記、上次運行元數據，以及告訴排程器何時需要為外部編輯的作業重新生成 `nextRunAtMs` 的排程身份。

停用 cron：`cron.enabled: false` 或 `OPENCLAW_SKIP_CRON=1`。

<AccordionGroup>
  <Accordion title="重試行為">
    **單次重試**：暫時性錯誤（速率限制、過載、網路、伺服器錯誤）會以指數退避機制重試最多 3 次。永久性錯誤會立即停用。

    **週期性重試**：重試之間採用指數退避（30 秒到 60 分鐘）。在下一次成功運行後，退避會重置。

  </Accordion>
  <Accordion title="維護">
    `cron.sessionRetention`（預設 `24h`）會修剪獨立的運行會話條目。`cron.runLog.maxBytes` / `cron.runLog.keepLines` 會自動修剪運行日誌檔案。
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
    - 確認 Gateway 持續運作中。
    - 對於 `cron` 排程，請驗證時區（`--tz`）與主機時區是否一致。
    - 運行輸出中的 `reason: not-due` 表示已透過 `openclaw cron run <jobId> --due` 檢查手動運行，且該作業尚未到期。

  </Accordion>
  <Accordion title="Cron 已觸發但無傳送">
    - 傳送模式 `none` 表示不預期執行器的後備傳送。當有聊天路由可用時，代理仍然可以使用 `message` 工具直接傳送。
    - 傳送目標遺失/無效 (`channel`/`to`) 表示已跳過傳出。
    - 對於 Matrix，複製或遺留的工作若使用小寫的 `delivery.to` 房間 ID 可能會失敗，因為 Matrix 房間 ID 有區分大小寫。請編輯工作為 Matrix 中的確切 `!room:server` 或 `room:!room:server` 值。
    - 頻道認證錯誤 (`unauthorized`, `Forbidden`) 表示傳送被憑證阻擋。
    - 如果隔離執行僅返回靜默權杖 (`NO_REPLY` / `no_reply`)，OpenClaw 會抑制直接傳出傳送，並抑制後備佇列摘要路徑，因此不會有任何內容回傳至聊天。
    - 如果代理應該自行傳送訊息給使用者，請檢查工作是否有可用的路由 (`channel: "last"` 搭配先前的聊天，或明確的頻道/目標)。

  </Accordion>
  <Accordion title="Cron 或心跳似乎阻止了 /new-style 輪替">
    - 每日與閒置重置的新鮮度並非基於 `updatedAt`；請參閱 [會話管理](/zh-Hant/concepts/session#session-lifecycle)。
    - Cron 喚醒、心跳執行、執行通知和閘道簿記可能會更新會話列以進行路由/狀態更新，但它們不會延長 `sessionStartedAt` 或 `lastInteractionAt`。
    - 對於在這些欄位存在之前建立的遺留列，當檔案仍可用時，OpenClaw 可以從文字記錄 JSONL 會話標頭中還原 `sessionStartedAt`。沒有 `lastInteractionAt` 的遺留閒置列會使用該還原的開始時間作為其閒置基準。

  </Accordion>
  <Accordion title="時區陷阱">
    - 未使用 `--tz` 的 Cron 使用閘道主機時區。
    - 沒有時區的 `at` 排程會被視為 UTC。
    - Heartbeat `activeHours` 使用設定的時區解析方式。

  </Accordion>
</AccordionGroup>

## 相關

- [Automation](/zh-Hant/automation) — 總覽所有自動化機制
- [Background Tasks](/zh-Hant/automation/tasks) — cron 執行的任務分類帳
- [Heartbeat](/zh-Hant/gateway/heartbeat) — 定期主工作階段輪次
- [Timezone](/zh-Hant/concepts/timezone) — 時區設定
