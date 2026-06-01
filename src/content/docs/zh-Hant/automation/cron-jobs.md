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
- 工作定義會保存在 `~/.openclaw/cron/jobs.json`，因此重新啟動不會遺失排程。
- 執行階段狀態會保存在旁邊的 `~/.openclaw/cron/jobs-state.json` 中。如果您在 git 中追蹤 cron 定義，請追蹤 `jobs.json` 並將 `jobs-state.json` 加入 gitignore。
- 如果 `jobs.json` 包含格式錯誤的列，Gateway 會讓有效的工作繼續執行，從作用中存放區移除格式錯誤的列，並將原始列儲存在旁邊的 `jobs-quarantine.json` 中，以便稍後修復或審查。
- 分割後，舊版的 OpenClaw 可以讀取 `jobs.json`，但可能會將工作視為全新的，因為執行階段欄位現在存在於 `jobs-state.json` 中。
- 當 Gateway 在執行中或已停止時編輯 `jobs.json`，OpenClaw 會將變更的排程欄位與擱置中的執行階段時段中繼資料進行比較，並清除過時的 `nextRunAtMs` 值。純格式變更或僅變更鍵順序的重新寫入會保留擱置中的時段。
- 所有 cron 執行都會建立 [背景任務](/zh-Hant/automation/tasks) 記錄。
- Gateway 啟動時，過期的隔離 agent-turn 工作會重新排程到通道連線視窗之外，而不是立即重播，這樣 Discord/Telegram 啟動和原生命令設定在重新啟動後仍能保持回應。
- 一次性工作 (`--at`) 預設在成功後會自動刪除。
- 隔離式 cron 會在執行完成時盡最大努力關閉受追蹤的瀏覽器分頁/程序及其 `cron:<jobId>` 會話，因此分離的瀏覽器自動化不會留下孤立的程序。
- 獲得狹義 cron 自我清理授權的隔離式 cron 執行仍然可以讀取排程器狀態、其當前作業的自過濾列表，以及該作業的執行歷史，因此狀態/心跳檢查可以檢查其自己的排程，而無需獲得更廣泛的 cron 修改權限。
- 隔離式 cron 執行還會防止過時的確認回覆。如果第一個結果只是臨時狀態更新（`on it`、`pulling everything together` 和類似提示），並且沒有後代子代理執行仍對最終答案負責，則 OpenClaw 會在交付之前重新提示一次以獲取實際結果。
- 隔離式 cron 執行使用來自嵌入式執行的結構化執行拒絕元數據，包括節點主機 `UNAVAILABLE` 包裝器，其嵌套錯誤訊息以 `SYSTEM_RUN_DENIED` 或 `INVALID_REQUEST` 開頭，因此被阻止的命令不會被報告為成功執行，而普通的助理散文也不會被視為拒絕。
- 即使沒有產生回覆負載，隔離式 cron 執行也會將執行級別的代理失敗視為作業錯誤，因此模型/提供者失敗會增加錯誤計數器並觸發失敗通知，而不是將作業清除為成功。
- 當隔離式代理輪次作業達到 `timeoutSeconds` 時，cron 會中止底層代理執行並給予它一個短暫的清理窗口。如果執行未排空，Gateway 擁有的清理會強制清除該執行的會話所有權，然後 cron 記錄超時，因此排隊的聊天工作不會留在過時的處理會話之後。
- 如果隔離式代理輪次在執行器啟動之前或在第一次模型調用之前停止，cron 會記錄特定階段的超時，例如 `setup timed out before runner start` 或 `stalled before first model call (last phase: context-engine)`。這些看門狗涵蓋嵌入式提供者和支援 CLI 的提供者，在它們的外部 CLI 程序實際啟動之前，並且與長 `timeoutSeconds` 值獨立限制，因此冷啟動/身份驗證/上下文失敗會快速顯示，而不是等待完整的作業預算。
- 如果您使用系統 cron 或其他外部排程器來執行 `openclaw agent`，請用強制終止升級機制來包裝它，即使 CLI 處理了 `SIGTERM`/`SIGINT`。Gateway 支援的執行會要求 Gateway 中止已接受的執行；本機和內嵌的後備執行則會收到相同的中止訊號。對於 GNU `timeout`，建議優先使用 `timeout -k 60 600 openclaw agent ...` 而非純 `timeout 600 ...`；如果程序無法正常排空，`-k` 值即為監督者的最後防線。對於 systemd 單元，請保持相同的結構，使用 `SIGTERM` 停止訊號並加上寬限期視窗，例如在最終終止前的 `TimeoutStopSec`。如果重試重複使用了 `--run-id`，而原始 Gateway 執行仍在進行中，則該重複項將被回報為執行中，而不會啟動第二次執行。

<a id="maintenance"></a>

<Note>
Cron 的工作任務調解以執行時期擁有權為優先，持久化歷史記錄為輔：只要 cron 執行時期仍將該工作追蹤為執行中，即使舊的子階段資料列仍然存在，活躍的 cron 工作任務仍會保持活躍。一旦執行時期停止擁有該工作且 5 分鐘寬限期屆滿，維護程式會檢查對應 `cron:<jobId>:<startedAt>` 執行的持久化執行日誌和工作狀態。如果該持久化歷史記錄顯示最終結果，工作任務分類帳將據此定案；否則，Gateway 擁有的維護程式可將工作任務標記為 `lost`。離線 CLI 稽核可以從持久化歷史記錄中恢復，但它不會將其本身空白的進行中活躍工作集視為 Gateway 擁有的 cron 執行已消失的證明。
</Note>

## 排程類型

| 種類    | CLI 標誌  | 說明                                             |
| ------- | --------- | ------------------------------------------------ |
| `at`    | `--at`    | 單次時間戳記 (ISO 8601 或相對時間如 `20m`)       |
| `every` | `--every` | 固定間隔                                         |
| `cron`  | `--cron`  | 5 欄位或 6 欄位 cron 表達式，可選擇性加上 `--tz` |

沒有時區的時間戳記會被視為 UTC。請加入 `--tz America/New_York` 以進行本地牆上時鐘排程。

每小時週期性執行的表達式會自動錯開最多 5 分鐘，以減少負載尖峰。請使用 `--exact` 強制精確時間，或使用 `--stagger 30s` 指定明確的時間範圍。

### 月份日期與星期使用 OR 邏輯

Cron 表達式由 [croner](https://github.com/Hexagon/croner) 解析。當月份日期和星期欄位皆非萬用字元時，croner 會在 **任一** 欄位相符時即觸發，而非需要兩者皆符合。這是標準的 Vixie cron 行為。

```
# Intended: "9 AM on the 15th, only if it's a Monday"
# Actual:   "9 AM on every 15th, AND 9 AM on every Monday"
0 9 15 * 1
```

這會使觸發頻率從每個月約 0–1 次變成每個月約 5–6 次。OpenClaw 在此採用 Croner 的預設 OR 行為。若要同時滿足兩個條件，請使用 Croner 的 `+` 星期修飾符 (`0 9 15 * +1`)，或者在其中一個欄位進行排程，並在工作的提示或指令中守衛另一個條件。

## 執行風格

| 風格     | `--session` 值      | 執行於              | 最適用於                   |
| -------- | ------------------- | ------------------- | -------------------------- |
| 主要階段 | `main`              | 專用喚醒通道        | 提醒、系統事件             |
| 隔離     | `isolated`          | 專用 `cron:<jobId>` | 報告、背景雜務             |
| 目前階段 | `current`           | 於建立時綁定        | 具備情境感知的週期性工作   |
| 自訂階段 | `session:custom-id` | 具持久性的具名階段  | 基於歷史紀錄建構的工作流程 |

<AccordionGroup>
  <Accordion title="主會話 vs 獨立 vs 自訂">
    **Main session**（主會話）作業會將系統事件加入至 cron 擁有的執行通道中，並選擇性地喚醒心跳（`--wake now` 或 `--wake next-heartbeat`）。它們可以使用目標主會話的最後傳遞情境進行回覆，但不會將例行的 cron 輪次附加至人類聊天通道，也不會延長目標會話的每日/閒置重設新鮮度。**Isolated**（獨立）作業會使用新鮮的會話執行專屬的代理程式輪次。**Custom sessions**（自訂會話）（`session:xxx`）會在執行之間保存情境，從而啟用諸如基於先前摘要的每日站立會議等工作流程。

    Main-session cron 事件是獨立的系統事件提醒。它們不會自動包含預設 heartbeat 提示詞的「讀取
    HEARTBEAT.md」指令。如果週期性提醒應該查閱
    `HEARTBEAT.md`，請在 cron 事件文字或代理程式自身的指令中明確說明。

  </Accordion>
  <Accordion title="'fresh session' 對於獨立作業的意義">
    對於獨立作業而言，「fresh session」（新鮮會話）意指每次執行都使用新的逐字稿/會話 ID。OpenClaw 可能會攜帶安全的偏好設定，例如思考/快速/詳細設定、標籤，以及明確的使用者選取模型/驗證覆寫，但它不會繼承舊 cron 列中的環境對話情境：頻道/群組路由、傳送或佇列原則、提升、來源，或 ACP 執行時期繫結。當週期性作業應刻意建構於相同的對話情境時，請使用 `current` 或 `session:<id>`。
  </Accordion>
  <Accordion title="執行時期清理">
    對於獨立作業，執行時期拆解現包含對該 cron 會話的盡力瀏覽器清理。清理失敗會被忽略，因此實際的 cron 結果仍會優先採用。

    獨立的 cron 執行也會透過共用的執行時期清理路徑，釋放為該作業建立的任何配套 MCP 執行時期實例。這與 main-session 和 custom-session MCP 用戶端的拆解方式一致，因此獨立 cron 作業不會在執行之間洩漏 stdio 子程序或長期存活的 MCP 連線。

  </Accordion>
  <Accordion title="Subagent and Discord delivery">
    當獨立的 cron 排程編排子代理時，傳遞也會優先選擇最終後代輸出，而非過時的父級暫存文字。如果後代仍在執行，OpenClaw 將會隱藏該部分的父級更新，而不是將其公告。

    對於純文字的 Discord 公告目標，OpenClaw 只會傳送一次標準的最終助理文字，而不是重播串流/中間文字酬載和最終答案。媒體和結構化的 Discord 酬載仍會作為獨立的酬載傳送，以免附件和元件被遺漏。

  </Accordion>
</AccordionGroup>

### 獨立工作的酬載選項

<ParamField path="--message" type="string" required>
  提示文字（獨立模式必填）。
</ParamField>
<ParamField path="--model" type="string">
  模型覆寫；使用為該工作選取的允許模型。
</ParamField>
<ParamField path="--thinking" type="string">
  思考層級覆寫。
</ParamField>
<ParamField path="--light-context" type="boolean">
  略過工作區啟動檔案注入。
</ParamField>
<ParamField path="--tools" type="string">
  限制該工作可以使用的工具，例如 `--tools exec,read`。
</ParamField>

`--model` 會將選取的允許模型用作該工作的主要模型。這與聊天會話 `/model` 覆寫不同：當工作主要模型失敗時，設定的備援鏈仍然會套用。如果請求的模型不被允許或無法解析，cron 會明確顯示驗證錯誤導致執行失敗，而不是靜默地回退至該工作的代理程式/預設模型選擇。

Cron 任務也可以攜帶 Payload 層級的 `fallbacks`。當存在時，該列表會取代任務的已設定備援鏈。當您希望一個嚴格的 cron 執行僅嘗試選定的模型時，請在任務 payload/API 中使用 `fallbacks: []`。如果任務有 `--model` 但既沒有 payload 也沒有已設定的備援，OpenClaw 會傳遞一個明確的空備援覆寫，因此代理主要模型不會被附加為隱藏的額外重試目標。

本地提供者預檢檢查會在將 cron 執行標記為 `skipped` 之前走訪已設定的備援；`fallbacks: []` 會使該預檢路徑保持嚴格。

隔離任務的模型選擇優先順序為：

1. Gmail hook 模型覆寫（當執行來自 Gmail 且允許該覆寫時）
2. 各別任務 payload `model`
3. 使用者選取的已儲存 cron 工作階段模型覆寫
4. 代理/預設模型選擇

快速模式也遵循解析後的即時選擇。如果選定的模型設定有 `params.fastMode`，隔離的 cron 預設會使用它。已儲存的工作階段 `fastMode` 覆寫無論在任何方向上都會勝過設定。

如果隔離執行遇到即時模型切換交接，cron 會使用切換後的提供者/模型重試，並在重試前為執行中的執行保存該即時選擇。當切換也攜帶新的認證設定檔時，cron 也會為執行中的執行保存該認證設定檔覆寫。重試是有次數限制的：在初始嘗試加上 2 次切換重試後，cron 會中止而不是無限循環。

在獨立的 cron 排程進入代理運行器之前，OpenClaw 會檢查可達到的本機提供者端點，以查找配置的 `api: "ollama"` 和 `api: "openai-completions"` 提供者，其 `baseUrl` 為 loopback、private-network 或 `.local`。如果該端點停機，該次運行將被記錄為 `skipped`，並附上清楚的提供者/模型錯誤，而不是啟動模型呼叫。端點結果會快取 5 分鐘，因此許多使用同一個已失效的本機 Ollama、vLLM、SGLang 或 LM Studio 伺服器的到期工作將共用一個小型探測，而不是造成請求風暴。跳過的提供者預檢運行不會增加執行錯誤的退避；當您想要重複的跳過通知時，請啟用 `failureAlert.includeSkipped`。

## 傳遞與輸出

| 模式       | 會發生什麼事                                   |
| ---------- | ---------------------------------------------- |
| `announce` | 如果代理未發送內容，則將最終文字退回傳遞至目標 |
| `webhook`  | 將已完成事件 payload POST 到 URL               |
| `none`     | 無運行器退回傳遞                               |

使用 `--announce --channel telegram --to "-1001234567890"` 進行頻道傳遞。對於 Telegram 論壇主題，請使用 `-1001234567890:topic:123`；OpenClaw 也接受 Telegram 擁有的 `-1001234567890:123` 簡寫。直接的 RPC/Config 呼叫者可以傳遞 `delivery.threadId` 作為字串或數字。Slack/Discord/Mattermost 目標應使用明確的前綴 (`channel:<id>`、`user:<id>`)。Matrix 房間 ID 區分大小寫；請使用 Matrix 中的確切房間 ID 或 `room:!room:server` 格式。

當公告傳遞使用 `channel: "last"` 或省略 `channel` 時，諸如 `telegram:123` 的供應商前綴目標可以在 cron 回退到會話歷史記錄或單個配置的通道之前選擇通道。只有已載入插件宣佈的前綴才是供應商選擇器。如果 `delivery.channel` 是明確的，則目標前綴必須命名同一個供應商；例如，`channel: "whatsapp"` 與 `to: "telegram:123"` 將被拒絕，而不是讓 WhatsApp 將 Telegram ID 解釋為電話號碼。目標類型和服務前綴，如 `channel:<id>`、`user:<id>`、`imessage:<handle>` 和 `sms:<number>`，仍然是通道擁有的目標語法，而不是供應商選擇器。

對於隔離作業，聊天傳遞是共享的。如果聊天路由可用，即使作業使用 `--no-deliver`，代理也可以使用 `message` 工具。如果代理發送到配置/當前目標，OpenClaw 會跳過回退公告。否則，`announce`、`webhook` 和 `none` 僅控制運行器在代理輪次後對最終回覆執行的操作。

當代理從活動聊天中建立隔離提醒時，OpenClaw 會儲存保留的即時傳遞目標以用於回退公告路由。內部會話金鑰可能是小寫的；當可使用當前聊天上下文時，不會從這些金鑰重建供應商傳遞目標。

隱式公告傳遞使用配置的通道允許清單來驗證並重新路由過期的目標。DM 配對存儲批准不是回退自動化接收者；當計畫作業應主動發送到 DM 時，請設定 `delivery.to` 或配置通道 `allowFrom` 條目。

## 輸出語言

Cron 作業不會從通道、語言環境或先前的訊息中推斷回覆語言。請將語言規則放在計畫訊息或模板中：

```bash
openclaw cron edit <jobId> \
  --message "Summarize the updates. Respond in Chinese; keep URLs, code, and product names unchanged."
```

對於範本檔案，請在渲染的提示詞中保留語言指令，並在任務執行前驗證如 `{{language}}` 等佔位符是否已填入。如果輸出混合了語言，請明確規則，例如：「敘述文字使用中文，並保留技術術語為英文」。

失敗通知遵循一個單獨的目的地路徑：

- `cron.failureDestination` 設定了失敗通知的全域預設值。
- `job.delivery.failureDestination` 會針對每個任務覆蓋該設定。
- 如果兩者皆未設定，且任務已透過 `announce` 進行傳遞，失敗通知現在會回退至該主要公告目標。
- `delivery.failureDestination` 僅在 `sessionTarget="isolated"` 任務上受支援，除非主要的傳遞模式是 `webhook`。
- `failureAlert.includeSkipped: true` 讓任務或全域 cron 警示策略選用重複跳過執行的警示。跳過的執行會維護一個獨立的連續跳過計數器，因此不會影響執行錯誤的退避機制。

## CLI 範例

<Tabs>
  <Tab title="一次性提醒">```bash openclaw cron add \ --name "Calendar check" \ --at "20m" \ --session main \ --system-event "Next heartbeat: check calendar." \ --wake now ```</Tab>
  <Tab title="週期性獨立任務">```bash openclaw cron create "0 7 * * *" \ "Summarize overnight updates." \ --name "Morning brief" \ --tz "America/Los_Angeles" \ --session isolated \ --announce \ --channel slack \ --to "channel:C1234567890" ```</Tab>
  <Tab title="模型與思考覆寫">```bash openclaw cron add \ --name "Deep analysis" \ --cron "0 6 * * 1" \ --tz "America/Los_Angeles" \ --session isolated \ --message "Weekly deep analysis of project progress." \ --model "opus" \ --thinking high \ --announce ```</Tab>
  <Tab title="Webhook 輸出">```bash openclaw cron create "0 18 * * 1-5" \ "Summarize today's deploys as JSON." \ --name "Deploy digest" \ --webhook "https://example.invalid/openclaw/cron" ```</Tab>
</Tabs>

## Webhooks

Gateway 可以為外部觸發程序公開 HTTP webhook 端點。請在設定中啟用：

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

每個請求必須在標頭中包含 hook token：

- `Authorization: Bearer <token>` (推薦)
- `x-openclaw-token: <token>`

查詢字串 (Query-string) token 將被拒絕。

<AccordionGroup>
  <Accordion title="POST /hooks/wake">
    將系統事件加入主會話佇列：

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
    執行一個獨立的代理回合：

    ```bash
    curl -X POST http://127.0.0.1:18789/hooks/agent \
      -H 'Authorization: Bearer SECRET' \
      -H 'Content-Type: application/json' \
      -d '{"message":"Summarize inbox","name":"Email","model":"openai/gpt-5.4"}'
    ```

    欄位：`message` (必要)、`name`、`agentId`、`wakeMode`、`deliver`、`channel`、`to`、`model`、`fallbacks`、`thinking`、`timeoutSeconds`。

  </Accordion>
  <Accordion title="對映的掛鉤 (POST /hooks/<name>)">
    自訂掛鉤名稱透過設定中的 `hooks.mappings` 解析。對映可以使用範本或程式碼轉換，將任意負載轉換為 `wake` 或 `agent` 動作。
  </Accordion>
</AccordionGroup>

<Warning>
請將掛鉤端點置於 loopback、tailnet 或受信任的 reverse proxy 之後。

- 使用專屬的掛鉤權杖；請勿重複使用閘道驗證權杖。
- 將 `hooks.path` 保持在專用子路徑上；`/` 將被拒絕。
- 設定 `hooks.allowedAgentIds` 以限制掛鉤可以鎖定的有效代理，包括當省略 `agentId` 時的預設代理。
- 除非您需要由呼叫者選擇的會話，否則請保持 `hooks.allowRequestSessionKey=false`。
- 如果您啟用 `hooks.allowRequestSessionKey`，同時請設定 `hooks.allowedSessionKeyPrefixes` 以限制允許的會話金鑰形狀。
- 掛鉤負載預設會包裝在安全邊界中。

</Warning>

## Gmail PubSub 整合

透過 Google PubSub 將 Gmail 收件匣觸發事件連線至 OpenClaw。

<Note>**先決條件：** `gcloud` CLI、`gog` (gogcli)、已啟用 OpenClaw hooks、用於公開 HTTPS 端點的 Tailscale。</Note>

### 精靈設定（推薦）

```bash
openclaw webhooks gmail setup --account openclaw@gmail.com
```

這會寫入 `hooks.gmail` 設定，啟用 Gmail 預設集，並使用 Tailscale Funnel 作為推送端點。

### Gateway 自動啟動

當設定 `hooks.enabled=true` 和 `hooks.gmail.account` 時，Gateway 會在開機時啟動 `gog gmail watch serve` 並自動續期監視。設定 `OPENCLAW_SKIP_GMAIL_WATCHER=1` 以退出。

### 手動一次性設定

<Steps>
  <Step title="選取 GCP 專案">
    選取擁有 `gog` 使用的 OAuth 客戶端的 GCP 專案：

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
  <Step title="啟動監視">
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
openclaw cron create "0 6 * * *" "Check ops queue" --name "Ops sweep" --session isolated --agent ops
openclaw cron edit <jobId> --clear-agent
```

`openclaw cron run <jobId>` 在將手動執行加入佇列後會立即返回。請使用 `--wait` 進行關閉掛鉤、維護腳本，或其他必須等到佇列執行完成後才能繼續的自動化作業。等待模式會輪詢確切返回的 `runId`；若狀態為 `ok` 則退出碼為 `0`，若為 `error`、`skipped` 或等待逾時則退出碼為非零。

`openclaw cron create` 是 `openclaw cron add` 的別名，且新工作可以使用位置排程（`"0 9 * * 1"`、`"every 1h"`、`"20m"` 或 ISO 時間戳記），後面接著位置代理程式提示。在 `cron add|create` 或 `cron edit` 上使用 `--webhook <url>`，將完成的執行負載 POST 到 HTTP 端點。Webhook 傳送無法與聊天傳送旗標（例如 `--announce`、`--channel`、`--to`、`--thread-id` 或 `--account`）結合使用。

<Note>
模型覆寫說明：

- `openclaw cron add|edit --model ...` 會變更工作所選的模型。
- 如果允許使用該模型，該確切的供應商/模型將到達獨立的代理程式執行。
- 如果不允許使用該模型或無法解析，cron 會以明確的驗證錯誤使執行失敗。
- 設定的後援鏈仍然適用，因為 cron `--model` 是工作主要設定，而非工作階段 `/model` 覆寫。
- 負載 `fallbacks` 會取代該工作的設定後援；`fallbacks: []` 會停用後援並使執行變得嚴格。
- 沒有明確或設定後援清單的純 `--model`，不會將代理程式主要設定作為靜默額外重試目標。

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

`maxConcurrentRuns` 同時限制排定的 cron 分派與獨立的代理程式回合執行，預設值為 8。獨立的 cron 代理程式回合在內部會使用佇列專用的 `cron-nested` 執行通道，因此提高此數值可讓獨立的 cron LLM 執行並行進行，而不僅是啟動其外層的 cron 包裝函式。共用的非 cron `nested` 通道不會由此設定擴充。

執行時期狀態 sidecar 衍生自 `cron.store`：例如 `~/clawd/cron/jobs.json` 的 `.json` 商店會使用 `~/clawd/cron/jobs-state.json`，而沒有 `.json` 後綴的商店路徑則會附加 `-state.json`。

如果您手動編輯 `jobs.json`，請將 `jobs-state.json` 排除在版本控制之外。OpenClaw 使用該附屬檔案來儲存待定插槽、啟用標記、上次執行元數據，以及告知排程器何時需要為外部編輯的工作重新產生 `nextRunAtMs` 的排程身分識別。

停用 cron：`cron.enabled: false` 或 `OPENCLAW_SKIP_CRON=1`。

<AccordionGroup>
  <Accordion title="重試行為">
    **一次性重試**：暫時性錯誤（速率限制、過載、網路、伺服器錯誤）會以指數退避重試最多 3 次。永久性錯誤會立即停用。

    **週期性重試**：重試之間採用指數退避（30 秒至 60 分鐘）。在下次成功執行後，退避會重置。

  </Accordion>
  <Accordion title="維護">
    `cron.sessionRetention`（預設 `24h`）會修剪獨立執行階段項目。`cron.runLog.maxBytes` / `cron.runLog.keepLines` 會自動修剪執行日誌檔案。
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
    - 確認 Gateway 持續執行中。
    - 針對 `cron` 排程，請驗證時區（`--tz`）與主機時區是否一致。
    - 執行輸出中的 `reason: not-due` 表示已使用 `openclaw cron run <jobId> --due` 檢查手動執行，且該工作尚未到期。

  </Accordion>
  <Accordion title="Cron fired but no delivery">
    - 傳遞模式 `none` 意味著不預期有 runner 備援傳送。當聊天路由可用時，Agent 仍可使用 `message` 工具直接傳送。
    - 傳遞目標遺失/無效 (`channel`/`to`) 表示已跳過傳出。
    - 對於 Matrix，複製或舊版任務如果使用了小寫的 `delivery.to` 房間 ID 可能會失敗，因為 Matrix 房間 ID 有區分大小寫。請將任務編輯為 Matrix 中確切的 `!room:server` 或 `room:!room:server` 值。
    - 頻道認證錯誤 (`unauthorized`, `Forbidden`) 表示傳遞被憑證阻擋。
    - 如果隔離執行僅返回靜默令牌 (`NO_REPLY` / `no_reply`)，OpenClaw 將抑制直接傳出傳遞，並抑制備援佇列摘要路徑，因此不會有任何內容回傳至聊天。
    - 如果 Agent 應該自行傳送訊息給使用者，請檢查任務是否具有可用的路由 (`channel: "last"` 搭配先前的聊天，或明確的頻道/目標)。

  </Accordion>
  <Accordion title="Cron or heartbeat appears to prevent /new-style rollover">
    - 每日和閒置重置新鮮度並非基於 `updatedAt`；請參閱 [Session management](/zh-Hant/concepts/session#session-lifecycle)。
    - Cron 喚醒、heartbeat 執行、exec 通知和 gateway 簿記可能會更新會話行以進行路由/狀態更新，但它們不會延長 `sessionStartedAt` 或 `lastInteractionAt`。
    - 對於在這些欄位存在之前建立的舊版行，當檔案仍然可用時，OpenClaw 可以從文字記錄 JSONL 會話標頭還原 `sessionStartedAt`。沒有 `lastInteractionAt` 的舊版閒置行會使用該還原的開始時間作為其閒置基準。

  </Accordion>
  <Accordion title="時區陷阱">
    - 不含 `--tz` 的 Cron 使用閘道主機時區。
    - 沒有時區的 `at` 排程會被視為 UTC。
    - Heartbeat `activeHours` 使用設定的時區解析。

  </Accordion>
</AccordionGroup>

## 相關

- [Automation](/zh-Hant/automation) — 快速瀏覽所有自動化機制
- [Background Tasks](/zh-Hant/automation/tasks) — Cron 執行的任務分類帳
- [Heartbeat](/zh-Hant/gateway/heartbeat) — 週期性主工作階段輪次
- [Timezone](/zh-Hant/concepts/timezone) — 時區設定
