---
summary: "用於 Gateway 排程器的已排程工作、Webhook 和 Gmail PubSub 觸發器"
read_when:
  - Scheduling background jobs or wakeups
  - Wiring external triggers (webhooks, Gmail) into OpenClaw
  - Deciding between heartbeat and cron for scheduled tasks
title: "已排程任務"
sidebarTitle: "已排程任務"
---

Cron 是 Gateway 的內建排程器。它會持久化工作，在正確的時間喚醒代理，並可以將輸出傳遞回聊天頻道或 webhook 端點。

## 快速入門

<Steps>
  <Step title="新增一次性提醒">
    ```bash
    openclaw cron create "2026-02-01T16:00:00Z" \
      --name "Reminder" \
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
- 工作定義、執行時狀態和執行歷史記錄會持久儲存在 OpenClaw 的共享 SQLite 狀態資料庫中，因此重啟不會導致排程遺失。
- 升級時，舊版 `~/.openclaw/cron/jobs.json`、`jobs-state.json` 和 `runs/*.jsonl` 檔案會匯入一次，並重新命名加上 `.migrated` 後綴。格式錯誤的工作列會在執行時跳過，並複製到 `jobs-quarantine.json` 以供稍後修復或檢閱。
- `cron.store` 仍然命名邏輯 cron 儲存金鑰和舊版匯入路徑。匯入後，編輯該 JSON 檔案不再會變更作用中的 cron 工作；請改用 `openclaw cron add|edit|remove` 或 Gateway cron RPC 方法。
- 所有 cron 執行都會建立 [background task](/zh-Hant/automation/tasks) 記錄。
- Gateway 啟動時，過期的隔離 agent-turn 工作會重新排程到通道連線視窗之外，而不是立即重播，這樣 Discord/Telegram 啟動和原生指令設定在重啟後仍能保持響應。
- 一次性工作（`--at`）預設在成功後會自動刪除。
- 隔離 cron 執行會在完成時盡最大努力關閉其 `cron:<jobId>` 會話的追蹤瀏覽器分頁/程序，因此分離的瀏覽器自動化不會留下孤兒程序。
- 接收狹隘 cron 自身清理授權的隔離 cron 執行仍然可以讀取排程器狀態、其目前工作的自我過濾清單，以及該工作的執行歷史記錄，因此狀態/心跳檢查可以檢查其自己的排程，而無需獲得更廣泛的 cron 變更存取權。
- 隔離 cron 執行也會防範過時的確認回覆。如果第一個結果只是過渡狀態更新（`on it`、`pulling everything together` 和類似提示），且沒有子代理程式執行仍對最終答案負責，OpenClaw 會在傳送之前重新提示一次以取得實際結果。
- 獨立 cron 執行使用來自內嵌執行的結構化執行拒絕元數據，包括巢狀錯誤訊息以 `SYSTEM_RUN_DENIED` 或 `INVALID_REQUEST` 開頭的 node-host `UNAVAILABLE` 包裝器，因此被阻止的命令不會被回報為成功執行，而普通的助理文字也不會被視為拒絕。
- 獨立 cron 執行還會將執行層級的代理失敗視為任務錯誤，即使沒有產生回應載荷，因此模型/提供者失敗會增加錯誤計數器並觸發失敗通知，而不是將任務清除為成功。
- 當獨立的代理輪次任務達到 `timeoutSeconds` 時，cron 會中止底層的代理執行並給予短暫的清理時間。如果執行未完成排空，Gateway 擁有的清理機制會在 cron 記錄逾時之前強制清除該執行的會話擁有權，因此排隊的聊天工作不會被遺留在過期的處理會話之後。
- 如果獨立的代理輪次在執行器啟動之前或第一次模型呼叫之前停滯，cron 會記錄特定階段的逾時，例如 `setup timed out before runner start` 或 `stalled before first model call (last phase: context-engine)`。這些監控程序涵蓋內嵌提供者和 CLI 支援的提供者，在其外部 CLI 程序實際啟動之前，並且獨立於較長的 `timeoutSeconds` 值進行限制，以便冷啟動/驗證/內容失敗能快速顯示，而不是等待完整的任務預算。
- 如果您使用系統 cron 或其他外部排程器來執行 `openclaw agent`，請用強制終止升級來包裝它，即使 CLI 處理了 `SIGTERM`/`SIGINT`。由 Gateway 支援的執行會要求 Gateway 中止已接受的執行；本機和嵌入式備援執行會收到相同的中止訊號。對於 GNU `timeout`，建議優先使用 `timeout -k 60 600 openclaw agent ...` 而非純粹的 `timeout 600 ...`；如果程序無法排出，`-k` 值是監督者的最後防線。對於 systemd 單元，請使用 `SIGTERM` 停止訊號加上寬限期（例如 `TimeoutStopSec`）來保持相同的形狀，然後再進行最終終止。如果重試重用了 `--run-id`，而原始 Gateway 執行仍處於活動狀態，則重複項將被報告為正在進行中，而不是啟動第二次執行。

<a id="maintenance"></a>

<Note>
Cron 的任務協調首先由執行時期擁有，其次由持久化歷史記錄支援：只要 cron 執行時期仍將該任務追蹤為正在執行，活動的 cron 任務就會保持活動狀態，即使舊的子會話記錄仍然存在。一旦執行時期停止擁有該任務且 5 分鐘的寬限期過期，維護程序會檢查匹配 `cron:<jobId>:<startedAt>` 執行的持久化執行記錄和任務狀態。如果該持久化歷史記錄顯示終止結果，則任務分錄將由此確定；否則，由 Gateway 擁有的維護程序可以將任務標記為 `lost`。離線 CLI 稽核可以從持久化歷史記錄中恢復，但它不會將其自身空白的進程中活動任務集視為 Gateway 擁有的 cron 執行已消失的證明。
</Note>

## 排程類型

| 種類    | CLI 標誌  | 描述                                             |
| ------- | --------- | ------------------------------------------------ |
| `at`    | `--at`    | 一次性時間戳記（ISO 8601 或相對時間如 `20m`）    |
| `every` | `--every` | 固定間隔                                         |
| `cron`  | `--cron`  | 5 欄位或 6 欄位 cron 表示式，可選擇性加上 `--tz` |

未指定時區的時間戳記會被視為 UTC。請加入 `--tz America/New_York` 以進行本地牆上時鐘排程。

每小時週期性執行的表示式會自動錯開最多 5 分鐘，以減少負載尖峰。請使用 `--exact` 強制精確計時，或使用 `--stagger 30s` 指定明確的時間視窗。

### 月份中的日期與星期幾使用 OR 邏輯

Cron 表示式由 [croner](https://github.com/Hexagon/croner) 解析。當「月份中的日期」和「星期幾」欄位皆非萬用字元時，croner 會在**任一**欄位符合時即匹配，而非兩者都要符合。這是標準 Vixie cron 的行為。

```
# Intended: "9 AM on the 15th, only if it's a Monday"
# Actual:   "9 AM on every 15th, AND 9 AM on every Monday"
0 9 15 * 1
```

這會導致每月觸發約 5–6 次，而非每月 0–1 次。OpenClaw 在此使用 Croner 的預設 OR 行為。若要求兩個條件同時滿足，請使用 Croner 的 `+` 星期幾修飾符 (`0 9 15 * +1`)，或者僅在其中一個欄位排程，並在您的工作提示詞或指令中對另一個欄位設定防護條件。

## 執行樣式

| 樣式         | `--session` 值      | 執行於              | 最適用於                 |
| ------------ | ------------------- | ------------------- | ------------------------ |
| 主工作階段   | `main`              | 專用 cron 喚醒通道  | 提醒、系統事件           |
| 隔離         | `isolated`          | 專用 `cron:<jobId>` | 報表、背景雜務           |
| 目前工作階段 | `current`           | 於建立時綁定        | 具備情境感知的週期性工作 |
| 自訂工作階段 | `session:custom-id` | 具名的持久工作階段  | 基於歷史記錄的工作流程   |

<AccordionGroup>
  <Accordion title="主會話 vs 獨立 vs 自訂">
    **主會話 (Main session)** 工作會將一個系統事件加入 cron 擁有的執行通道，並選擇性地喚醒心跳 (`--wake now` 或 `--wake next-heartbeat`)。它們可以使用目標主會話的最後一次傳遞上下文來進行回覆，但不會將例行的 cron 輪次附加到人類聊天通道，也不會延長目標會話的每日/閒置重置新鮮度。**獨立 (Isolated)** 工作會使用新啟的會話執行專屬的代理程式輪次。**自訂會話 (Custom sessions)** (`session:xxx`) 會在執行之間保持上下文，進而實作諸如基於先前摘要的每日站會等工作流程。

    主會話 cron 事件是獨立的系統事件提醒。它們不會自動包含預設心跳提示中的「讀取 HEARTBEAT.md」指令。如果週期性提醒應該查詢 `HEARTBEAT.md`，請在 cron 事件文字或代理程式自身的指令中明確說明。

  </Accordion>
  <Accordion title="「新啟會話」對獨立工作的意義">
    對於獨立工作，「新啟會話」意指每次執行都使用新的對話記錄/會話 ID。OpenClaw 可能會攜帶安全的偏好設定，例如思考/快速/詳細設定、標籤，以及明確的使用者選取模型/驗證覆寫，但並不會繼承較舊 cron 記錄中的環境對話上下文：通道/群組路由、傳送或排入佇列原則、升級、來源，或 ACP 執行階段繫結。當週期性工作應刻意建構於相同的對話上下文時，請使用 `current` 或 `session:<id>`。
  </Accordion>
  <Accordion title="執行階段清理">
    對於獨立工作，執行階段拆解現在包含對該 cron 會話的盡力而為 (best-effort) 瀏覽器清理。清理失敗會被忽略，因此實際的 cron 結果仍會優先採用。

    獨立 cron 執行也會透過共用的執行階段清理路徑，釋放為該工作建立的任何隨附 MCP 執行階段執行個體。這與主會話和自訂會話 MCP 用戶端的拆解方式一致，因此獨立 cron 工作不會在執行之間洩漏 stdio 子程序或長期存在的 MCP 連線。

  </Accordion>
  <Accordion title="Subagent and Discord delivery">
    當獨立的 cron 執行協調子代理時，傳遞也會優先使用最終的後代輸出，而非陳舊的父代暫時性文字。如果後代仍在運行，OpenClaw 會隱藏該部分父代更新，而不是發布它。

    對於僅限文字的 Discord 公告目標，OpenClaw 只會發送一次標準的最終助理文字，而不是重播串流/中間文字承載和最終答案。媒體和結構化 Discord 承載仍會作為單獨的承載傳遞，以確保附件和元件不會遺失。

  </Accordion>
</AccordionGroup>

### 隔離任務的 Payload 選項

<ParamField path="--message" type="string" required>
  提示文字（隔離模式必填）。
</ParamField>
<ParamField path="--model" type="string">
  模型覆寫；使用為該任務選取的允許模型。
</ParamField>
<ParamField path="--thinking" type="string">
  思考層級覆寫。
</ParamField>
<ParamField path="--light-context" type="boolean">
  跳過工作區啟動檔案注入。
</ParamField>
<ParamField path="--tools" type="string">
  限制任務可以使用的工具，例如 `--tools exec,read`。
</ParamField>

`--model` 使用選取的允許模型作為該任務的主要模型。這與聊天會話的 `/model` 覆寫不同：當任務主要模型失敗時，設定的後援鏈仍然適用。如果請求的模型不被允許或無法解析，cron 會以明確的驗證錯誤使執行失敗，而不是自動回退至任務的代理/預設模型選擇。

Cron 任務也可以攜帶 payload 層級的 `fallbacks`。當存在時，該列表會取代任務的已配置後援鏈。當您需要一個僅嘗試所選模型的嚴格 cron 運行時，請在任務 payload/API 中使用 `fallbacks: []`。如果任務具有 `--model` 但既沒有也沒有配置後援，OpenClaw 會傳遞一個明確的空後援覆寫，這樣 agent primary 就不會被附加為隱藏的額外重試目標。

Local-provider 預檢檢查會在將 cron 運行標記為 `skipped` 之前遍歷已配置的後援；`fallbacks: []` 使該預檢路徑保持嚴格。

隔離任務的模型選擇優先順序為：

1. Gmail hook 模型覆寫（當運行來自 Gmail 且允許該覆寫時）
2. 每個任務的 payload `model`
3. 使用者選擇的已儲存 cron 會話模型覆寫
4. Agent/預設模型選擇

快速模式也遵循解析後的即時選擇。如果所選的模型配置具有 `params.fastMode`，隔離的 cron 預設會使用它。已儲存的會話 `fastMode` 覆寫無論在哪個方向上都會勝過配置。

如果隔離運行遇到即時模型切換交接，cron 會使用切換後的提供商/模型進行重試，並在重試之前將該即時選擇持久化給活動運行。當切換還攜帶新的 auth profile 時，cron 也會為活動運行持久化該 auth profile 覆寫。重試是有界的：在初始嘗試加上 2 次切換重試後，cron 會中止而不是無限循環。

在隔離的 cron 執行進入代理執行器之前，OpenClaw 會檢查可達的本地提供商端點，尋找其 `baseUrl` 為 loopback、private-network 或 `.local` 的已設定 `api: "ollama"` 和 `api: "openai-completions"` 提供商。如果該端點已停機，執行會被記錄為 `skipped`，並附上明確的提供商/模型錯誤，而不是啟動模型呼叫。端點結果會快取 5 分鐘，因此許多使用同一失效的本地 Ollama、vLLM、SGLang 或 LM Studio 伺服器的到期任務會共用一個小型探測，而不是造成請求風暴。跳過的提供商前置檢查執行不會增加執行錯誤的指數退避；當您想要重複的跳過通知時，請啟用 `failureAlert.includeSkipped`。

## 傳遞與輸出

| 模式       | 發生情況                                   |
| ---------- | ------------------------------------------ |
| `announce` | 如果代理未發送，則將最終文字後備傳遞至目標 |
| `webhook`  | 將完成事件負載 POST 至 URL                 |
| `none`     | 無執行器後備傳遞                           |

請使用 `--announce --channel telegram --to "-1001234567890"` 進行頻道傳遞。對於 Telegram 論壇主題，請使用 `-1001234567890:topic:123`；OpenClaw 也接受 Telegram 擁有的 `-1001234567890:123` 簡寫。直接的 RPC/config 呼叫者可以傳遞 `delivery.threadId` 作為字串或數字。Slack/Discord/Mattermost 目標應使用明確的前綴 (`channel:<id>`, `user:<id>`)。Matrix 房間 ID 區分大小寫；請使用確切的房間 ID 或來自 Matrix 的 `room:!room:server` 格式。

當公告傳遞使用 `channel: "last"` 或省略 `channel` 時，諸如 `telegram:123` 這類提供者前綴的目標可以選取頻道，然後 cron 才會回退到工作階段歷史記錄或單一設定的頻道。只有已載入外掛程式公告的前綴才是提供者選取器。如果明確指定 `delivery.channel`，目標前綴必須指定相同的提供者；例如，`channel: "whatsapp"` 搭配 `to: "telegram:123"` 會被拒絕，而不是讓 WhatsApp 將 Telegram ID 解讀為電話號碼。目標類型和服務前綴，例如 `channel:<id>`、`user:<id>`、`imessage:<handle>` 和 `sms:<number>`，仍然屬於頻道擁有的目標語法，而非提供者選取器。

對於隔離工作，聊天傳遞是共用的。如果聊天路由可用，即使工作使用 `--no-deliver`，代理程式仍可使用 `message` 工具。如果代理程式傳送到設定/目前的目標，OpenClaw 會跳過回退公告。否則，`announce`、`webhook` 和 `none` 僅控制執行器在代理程式輪次之後對最終回覆的處理方式。

當代理程式從作用中的聊天建立隔離提醒時，OpenClaw 會將保留的即時傳遞目標儲存為回退公告路由。內部工作階段金鑰可能是小寫；當目前的聊天內容可用時，提供者傳遞目標不會從這些金鑰重建。

隱含公告傳遞使用設定的頻道允許清單來驗證並重新傳送過時的目標。DM 配對儲存核准並非回退自動化接收者；當排程工作應主動傳送到 DM 時，請設定 `delivery.to` 或設定頻道 `allowFrom` 項目。

## 輸出語言

Cron 工作不會從頻道、地區設定或先前的訊息中推斷回覆語言。請將語言規則放入排程訊息或範本中：

```bash
openclaw cron edit <jobId> \
  --message "Summarize the updates. Respond in Chinese; keep URLs, code, and product names unchanged."
```

對於範本檔案，請在渲染的提示中保留語言指令，並在作業執行前驗證 `{{language}}` 等預留位置已填入。如果輸出混合了語言，請將規則明確化，例如：「敘述文字使用中文，技術術語保留英文」。

失敗通知遵循獨立的目的地路徑：

- `cron.failureDestination` 設定了失敗通知的全域預設值。
- `job.delivery.failureDestination` 會針對各個作業覆寫該設定。
- 若兩者皆未設定，且作業已透過 `announce` 傳遞，失敗通知現在將會回退至該主要公告目標。
- `delivery.failureDestination` 僅支援 `sessionTarget="isolated"` 作業，除非主要傳遞模式是 `webhook`。
- `failureAlert.includeSkipped: true` 可讓作業或全域 cron 警示原則選擇接收重複的跳過執行警示。跳過的執行會維護獨立的連續跳過計數器，因此不會影響執行錯誤的退避機制。

## CLI 範例

<Tabs>
  <Tab title="單次提醒">```bash openclaw cron add \ --name "Calendar check" \ --at "20m" \ --session main \ --system-event "Next heartbeat: check calendar." \ --wake now ```</Tab>
  <Tab title="週期性獨立作業">```bash openclaw cron create "0 7 * * *" \ "Summarize overnight updates." \ --name "Morning brief" \ --tz "America/Los_Angeles" \ --session isolated \ --announce \ --channel slack \ --to "channel:C1234567890" ```</Tab>
  <Tab title="模型與思考覆寫">```bash openclaw cron add \ --name "Deep analysis" \ --cron "0 6 * * 1" \ --tz "America/Los_Angeles" \ --session isolated \ --message "Weekly deep analysis of project progress." \ --model "opus" \ --thinking high \ --announce ```</Tab>
  <Tab title="Webhook 輸出">```bash openclaw cron create "0 18 * * 1-5" \ "Summarize today's deploys as JSON." \ --name "Deploy digest" \ --webhook "https://example.invalid/openclaw/cron" ```</Tab>
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

- `Authorization: Bearer <token>` (推薦)
- `x-openclaw-token: <token>`

查詢字串 token 將被拒絕。

<AccordionGroup>
  <Accordion title="POST /hooks/wake">
    為主會話將系統事件加入佇列：

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
    執行一個隔離的代理程序輪次：

    ```bash
    curl -X POST http://127.0.0.1:18789/hooks/agent \
      -H 'Authorization: Bearer SECRET' \
      -H 'Content-Type: application/json' \
      -d '{"message":"Summarize inbox","name":"Email","model":"openai/gpt-5.4"}'
    ```

    欄位：`message`（必填）、`name`、`agentId`、`wakeMode`、`deliver`、`channel`、`to`、`model`、`fallbacks`、`thinking`、`timeoutSeconds`。

  </Accordion>
  <Accordion title="Mapped hooks (POST /hooks/<name>)">
    自訂 Hook 名稱是透過設定檔中的 `hooks.mappings` 來解析。對映可以使用範本或程式碼轉換，將任意 Payload 轉換為 `wake` 或 `agent` 動作。
  </Accordion>
</AccordionGroup>

<Warning>
請將 Hook 端點置於 loopback、tailnet 或受信任的反向代理之後。

- 使用專用的 Hook Token；請勿重複使用 Gateway 驗證 Token。
- 將 `hooks.path` 保持在專用子路徑上；`/` 會被拒絕。
- 設定 `hooks.allowedAgentIds` 以限制 Hook 可以鎖定的有效代理程序，包括省略 `agentId` 時的預設代理程序。
- 除非您需要由呼叫者選擇的會話，否則請保持 `hooks.allowRequestSessionKey=false`。
- 如果您啟用 `hooks.allowRequestSessionKey`，請同時設定 `hooks.allowedSessionKeyPrefixes` 以限制允許的會話金鑰形狀。
- Hook Payload 預設會以安全邊界包裝。

</Warning>

## Gmail PubSub 整合

透過 Google PubSub 將 Gmail 收件匣觸發程序連線至 OpenClaw。

<Note>**先決條件：** `gcloud` CLI、`gog` (gogcli)、已啟用 OpenClaw hooks、用於公開 HTTPS 端點的 Tailscale。</Note>

### 精靈設定（推薦）

```bash
openclaw webhooks gmail setup --account openclaw@gmail.com
```

這會寫入 `hooks.gmail` 設定、啟用 Gmail 預設集，並使用 Tailscale Funnel 作為推送端點。

### Gateway 自動啟動

當設定了 `hooks.enabled=true` 和 `hooks.gmail.account` 時，Gateway 會在開機時啟動 `gog gmail watch serve` 並自動續期監聽。設定 `OPENCLAW_SKIP_GMAIL_WATCHER=1` 以退出。

### 手動一次性設定

<Steps>
  <Step title="選擇 GCP 專案">
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
  <Step title="啟動監聽">
    ```bash
    gog gmail watch start \
      --account openclaw@gmail.com \
      --label INBOX \
      --topic projects/<project-id>/topics/gog-gmail-watch
    ```
  </Step>
</Steps>

### Gmail 模型覆蓋

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
openclaw cron create "0 6 * * *" "Check ops queue" --name "Ops sweep" --session isolated --agent ops
openclaw cron edit <jobId> --clear-agent
```

`openclaw cron run <jobId>` 在將手動執行加入佇列後返回。對於必須等到佇列執行完成才解除阻塞的關閉 hooks、維護腳本或其他自動化，請使用 `--wait`。等待模式會輪詢確切返回的 `runId`；若狀態為 `ok`，它會以 `0` 退出，若為 `error`、`skipped` 或等待逾時，則以非零值退出。

`openclaw cron create` 是 `openclaw cron add` 的別名，且新的作業可以使用位置排程（`"0 9 * * 1"`、`"every 1h"`、`"20m"` 或 ISO 時間戳記），後接一個位置代理程式提示。在 `cron add|create` 或 `cron edit` 上使用 `--webhook <url>`，將完成的執行負載 POST 到 HTTP 端點。Webhook 傳遞無法與聊天傳遞旗標（例如 `--announce`、`--channel`、`--to`、`--thread-id` 或 `--account`）結合使用。

<Note>
模型覆寫說明：

- `openclaw cron add|edit --model ...` 會變更作業的選取模型。
- 如果允許該模型，該特定的提供者/模型會抵達隔離代理程式執行。
- 如果不允許或無法解析，cron 會以明確的驗證錯誤使執行失敗。
- 設定的後援鏈仍然適用，因為 cron `--model` 是作業主要設定，而非工作階段 `/model` 覆寫。
- 負載 `fallbacks` 會取代該作業的設定後援；`fallbacks: []` 會停用後援並使執行變成嚴格模式。
- 沒有明確或設定後援清單的一般 `--model`，不會將代理程式主要設定作為無額外重試目標的靜默備援。

</Note>

## 設定

```json5
{
  cron: {
    enabled: true,
    store: "~/.openclaw/cron/jobs.json",
    maxConcurrentRuns: 8,
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

`maxConcurrentRuns` 同時限制已排程的 cron 分派與隔離代理程式回合執行，預設值為 8。隔離 cron 代理程式回合會在內部使用佇列專用的 `cron-nested` 執行通道，因此提高此值可讓獨立的 cron LLM 執行並行進行，而不僅是啟動其外層 cron 包裝函式。此設定不會加寬共用的非 cron `nested` 通道。

`cron.store` 是邏輯儲存區金鑰與傳統匯入路徑。現有的儲存區會在首次載入時匯入 SQLite 並進行封存；未來的 cron 變更應透過 CLI 或 Gateway API 進行。

停用 cron：`cron.enabled: false` 或 `OPENCLAW_SKIP_CRON=1`。

<AccordionGroup>
  <Accordion title="重試行為">
    **一次性重試**：暫時性錯誤（速率限制、過載、網路、伺服器錯誤）會以指數退避重試最多 3 次。永久性錯誤會立即停用。

    **週期性重試**：重試之間使用指數退避（30 秒到 60 分鐘）。下次成功執行後退避會重置。

  </Accordion>
  <Accordion title="維護">
    `cron.sessionRetention`（預設 `24h`）會修剪獨立的執行階段記錄。`cron.runLog.keepLines` 限制每個工作保留的 SQLite 執行歷史記錄行數；`maxBytes` 保留是為了與較舊的檔案支援執行日誌的設定相容。
  </Accordion>
</AccordionGroup>

## 故障排除

### 命令階梯

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
    - 確認 Gateway 正在持續執行。
    - 對於 `cron` 排程，請驗證時區（`--tz`）與主機時區是否一致。
    - 執行輸出中的 `reason: not-due` 表示已使用 `openclaw cron run <jobId> --due` 檢查手動執行，且該工作尚未到期。

  </Accordion>
  <Accordion title="Cron 已觸發但無遞送">
    - 遞送模式 `none` 表示預期不會有 runner 後備傳送。當聊天路由可用時，Agent 仍可使用 `message` 工具直接傳送。
    - 遞送目標遺失/無效 (`channel`/`to`) 表示已跳過傳出。
    - 對於 Matrix，使用小寫 `delivery.to` 房間 ID 的複製或舊版工作可能會失敗，因為 Matrix 房間 ID 區分大小寫。請將工作編輯為 Matrix 中的精確 `!room:server` 或 `room:!room:server` 值。
    - 頻道驗證錯誤 (`unauthorized`, `Forbidden`) 表示遞送被憑證阻擋。
    - 如果隔離執行僅返回靜默令牌 (`NO_REPLY` / `no_reply`)，OpenClaw 將抑制直接傳出遞送，並抑制後備排隊摘要路徑，因此不會有任何內容發布回聊天。
    - 如果 Agent 應該自行傳送訊息給用戶，請檢查工作是否有可用的路由 (`channel: "last"` 搭配先前的聊天，或明確的頻道/目標)。

  </Accordion>
  <Accordion title="Cron 或心跳似乎阻止了 /new-style 滾動更新">
    - 每日和閒置重置的新鮮度不是基於 `updatedAt`；請參閱 [Session management](/zh-Hant/concepts/session#session-lifecycle)。
    - Cron 喚醒、心跳執行、exec 通知和 Gateway 簿記可能會更新會話行以進行路由/狀態設定，但它們不會延長 `sessionStartedAt` 或 `lastInteractionAt`。
    - 對於在這些欄位存在之前建立的舊版行，當檔案仍可用時，OpenClaw 可以從逐字稿 JSONL 會話標頭中恢復 `sessionStartedAt`。沒有 `lastInteractionAt` 的舊版閒置行會使用該恢復的開始時間作為其閒置基準。

  </Accordion>
  <Accordion title="時區注意事項">
    - 未使用 `--tz` 的 Cron 使用閘道主機時區。
    - 沒有時區的 `at` 排程會被視為 UTC。
    - Heartbeat `activeHours` 使用設定的時區解析方式。

  </Accordion>
</AccordionGroup>

## 相關

- [自動化](/zh-Hant/automation) — 快速瀏覽所有自動化機制
- [背景工作](/zh-Hant/automation/tasks) — cron 執行的任務分類帳
- [Heartbeat](/zh-Hant/gateway/heartbeat) — 定期主會話輪次
- [時區](/zh-Hant/concepts/timezone) — 時區設定
