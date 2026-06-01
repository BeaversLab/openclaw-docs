---
summary: "CLI 參考資料，用於 `openclaw cron` (排程並執行背景工作)"
read_when:
  - You want scheduled jobs and wakeups
  - You are debugging cron execution and logs
title: "Cron"
---

# `openclaw cron`

管理 Gateway 排程器的 cron 工作。

<Tip>執行 `openclaw cron --help` 以查看完整的命令介面。請參閱 [Cron jobs](/zh-Hant/automation/cron-jobs) 以了解概念指南。</Tip>

## 快速建立工作

`openclaw cron create` 是 `openclaw cron add` 的別名。對於新工作，請先輸入排程，再輸入提示詞：

```bash
openclaw cron create "0 7 * * *" \
  "Summarize overnight updates." \
  --name "Morning brief" \
  --agent ops
```

當工作應將完成後的 payload 以 POST 方式發送，而不是傳遞到聊天目標時，請使用 `--webhook <url>`：

```bash
openclaw cron create "0 18 * * 1-5" \
  "Summarize today's deploys as JSON." \
  --name "Deploy digest" \
  --webhook "https://example.invalid/openclaw/cron"
```

## Sessions

`--session` 接受 `main`、`isolated`、`current` 或 `session:<id>`。

<AccordionGroup>
  <Accordion title="Session keys">
    - `main` 綁定到代理程式的主要工作階段。
    - `isolated` 為每次執行建立全新的逐字稿和工作階段 ID。
    - `current` 在建立時綁定到使用中的工作階段。
    - `session:<id>` 固定到明確的持久工作階段金鑰。

  </Accordion>
  <Accordion title="Isolated session semantics">
    隔離執行會重設環境對話內容。通道和群組路由、傳送/佇列策略、提權、來源和 ACP 執行階段綁定會在新的執行中重設。安全偏好設定以及明確的使用者選取模型或驗證覆寫可以在執行之間傳遞。
  </Accordion>
</AccordionGroup>

## 傳遞

`openclaw cron list` 和 `openclaw cron show <job-id>` 預覽解析後的傳遞路由。對於 `channel: "last"`，預覽會顯示路由是從主要或目前工作階段解析，還是會失敗關閉。

提供者前綴的目標可以消除未解析公告頻道的歧義。例如，當省略 `delivery.channel` 或為 `last` 時，`to: "telegram:123"` 會選擇 Telegram。只有已載入外掛宣佈的前綴才是提供者選擇器。如果明確指定了 `delivery.channel`，前綴必須符合該頻道；帶有 `to: "telegram:123"` 的 `channel: "whatsapp"` 將被拒絕。諸如 `imessage:` 和 `sms:` 等服務前綴仍保留為頻道擁有的目標語法。

<Note>隔離的 `cron add` 作業預設為 `--announce` 傳遞。使用 `--no-deliver` 將輸出保留在內部。`--deliver` 仍作為 `--announce` 的已棄用別名。</Note>

### 傳遞所有權

隔離的 cron 聊天傳遞是在代理程式與執行器之間共享的：

- 當有聊天路由可用時，代理程式可以使用 `message` 工具直接傳送。
- `announce` 僅在代理程式未直接傳送至解析的目標時，才後援傳送最終回覆。
- `webhook` 會將完成的負載發佈至 URL。
- `none` 會停用執行器的後援傳遞。

使用 `cron add|create --webhook <url>` 或 `cron edit <job-id> --webhook <url>` 來設定 webhook 傳遞。請勿將 `--webhook` 與聊天傳遞標記（例如 `--announce`、`--no-deliver`、`--channel`、`--to`、`--thread-id` 或 `--account`）結合使用。

`--announce` 是最終回覆的執行器後援傳遞。`--no-deliver` 會停用該後援，但當有聊天路由可用時，並不會移除代理程式的 `message` 工具。

從活躍聊天建立的提醒會保留即時聊天傳遞目標，以用於後援公告傳遞。內部工作階段金鑰可能是小寫；請勿將其作為區分大小寫的提供者 ID（例如 Matrix 房間 ID）的單一資料來源。

### 失敗傳遞

失敗通知依以下順序解析：

1. 在作業上使用 `delivery.failureDestination`。
2. 全域 `cron.failureDestination`。
3. 作業的主要通知目標（當未設定明確的失敗目的地時）。

<Note>主會話 (Main-session) 作業僅能在主要傳遞模式為 `webhook` 時使用 `delivery.failureDestination`。隔離作業在所有模式下皆可接受。</Note>

注意：隔離的 cron 執行會將執行層級的 agent 失敗視為作業錯誤，即使未產生回應 payload 也一樣，因此模型/提供者 (provider) 的失敗仍會增加錯誤計數器並觸發失敗通知。

如果隔離執行在首次模型請求之前逾時，`openclaw cron show` 和 `openclaw cron runs` 會包含特定階段的錯誤，例如 `setup timed out before runner start` 或 `stalled before first model call (last phase: context-engine)`。
對於由 CLI 支援的提供者，前模型看門狗 (pre-model watchdog) 會保持啟用，直到外部 CLI 輪次開始為止，因此會話查閱、掛鉤、驗證、提示和 CLI 設定的停頓會被回報為前模型 cron 失敗。

## 排程

### 一次性作業

`--at <datetime>` 排程一次性執行。除非您也傳遞 `--tz <iana>`，否則無時區的日期時間會被視為 UTC，此參數會將給定時區的牆上時鐘時間 (wall-clock time) 解釋為相應時間。

<Note>一次性作業在成功後預設會被刪除。使用 `--keep-after-run` 來保留它們。</Note>

### 週期性作業

週期性作業在連續錯誤後會使用指數退避重試：30s、1m、5m、15m、60m。在下次成功執行後，排程會恢復正常。

跳過的執行與執行錯誤分開追蹤。它們不會影響重試退避，但 `openclaw cron edit <job-id> --failure-alert-include-skipped` 可以選擇讓失敗警示接收重複跳過執行的通知。

針對以本機設定的模型提供者為目標的隔離作業，cron 會在啟動代理輪次之前執行輕量級提供者預檢。Loopback、私人網路和 `.local` `api: "ollama"` 提供者會在 `/api/tags` 進行探測；vLLM、SGLang 和 LM Studio 等本機 OpenAI 相容提供者則會在 `/models` 進行探測。如果端點無法連線，該次執行會被記錄為 `skipped` 並在稍後的排程中重試；符合條件的失效端點會被快取 5 分鐘，以避免許多作業重複衝擊同一個本機伺服器。

注意：cron 作業定義存放於 `jobs.json`，而待處理的執行時狀態則存放於 `jobs-state.json`。如果 `jobs.json` 被外部編輯，Gateway 會重新載入變更的排程並清除過時的待處理時段；僅格式化的重寫不會清除待處理時段。格式錯誤的作業資料列會在載入時從活動的 `jobs.json` 中移除，並將其原始內容複製到 `jobs-quarantine.json`。

### 手動執行

`openclaw cron run <job-id>` 預設會強制執行並在該次手動執行加入佇列後立即返回。成功的回應包含 `{ ok: true, enqueued: true, runId }`。請使用返回的 `runId` 來檢查後續結果：

```bash
openclaw cron run <job-id>
openclaw cron runs --id <job-id> --run-id <run-id>
```

當腳本應該持續等待，直到該特定佇列執行記錄最終狀態時，請新增 `--wait`：

```bash
openclaw cron run <job-id> --wait --wait-timeout 10m --poll-interval 2s
```

使用 `--wait` 時，CLI 仍會先呼叫 `cron.run`，然後輪詢 `cron.runs` 以取得返回的 `runId`。該指令僅在執行完成且狀態為 `ok` 時會 `0`。當執行以 `error` 或 `skipped` 完成、Gateway 回應未包含 `runId`，或是 `--wait-timeout` 到期時，它會以非零值結束。`--poll-interval` 必須大於零。

<Note>當您希望手動指令僅在作業目前到期時執行，請使用 `--due`。如果 `--due --wait` 未將執行加入佇列，該指令會傳回正常的非執行回應，而不是進行輪詢。</Note>

## 模型

`cron add|edit --model <ref>` 選擇該作業允許的模型。

<Warning>如果模型不被允許或無法解析，cron 會以明確的驗證錯誤使執行失敗，而不是回退到作業的 agent 或預設模型選擇。</Warning>

Cron `--model` 是一個 **作業主體**，而非聊天會話 `/model` 覆寫。這意味著：

- 當選定的作業模型失敗時，設定的模型回退仍然適用。
- 當存在時，單一作業 payload `fallbacks` 會取代設定的回退清單。
- 空的單一作業回退清單（作業 payload/API 中的 `fallbacks: []`）會使 cron 執行變成嚴格模式。
- 當作業擁有 `--model` 但未設定回退清單時，OpenClaw 會傳遞明確的空回退覆寫，因此 agent 主體不會被附加為隱藏的重試目標。
- 本機提供者預檢檢查會在標記 cron 執行為 `skipped` 之前走訪設定的回退。

`openclaw doctor` 會回報已設定 `payload.model` 的作業，包括提供者命名空間計數以及與 `agents.defaults.model` 的不一致。當即時聊天與排定作業之間的驗證、提供者或計費行為看起來不同時，請使用該檢查。

### 獨立 cron 模型優先順序

獨立 cron 依以下順序解析使用中的模型：

1. Gmail-hook 覆寫。
2. 單一作業 `--model`。
3. 儲存的 cron-session 模型覆寫（當使用者選擇了一個時）。
4. Agent 或預設模型選擇。

### 快速模式

獨立 cron 快速模式遵循解析後的即時模型選擇。模型設定 `params.fastMode` 預設適用，但儲存的會話 `fastMode` 覆寫仍優先於設定。

### 即時模型切換重試

如果獨立執行拋出 `LiveSessionModelSwitchError`，cron 會在重試之前，為當前執行保存已切換的提供者和模型（以及在存在時保存已切換的授權設定檔覆寫）。外部重試循環在初始嘗試之後最多限制兩次切換重試，然後中止而不是無限循環。

## 執行輸出與拒絕

### 過時確認訊息抑制

獨立 cron 週期性執行會抑制僅包含過時確認訊息的回覆。如果第一個結果只是中間狀態更新，且沒有後代子代理程式執行負責最終答案，cron 會在傳遞之前重新提示一次以取得真實結果。

### 靜默令牌抑制

如果獨立 cron 執行僅返回靜默令牌（`NO_REPLY` 或 `no_reply`），cron 會同時抑制直接出站傳遞和備用佇列摘要路徑，因此不會有任何內容回傳到聊天。

### 結構化拒絕

獨立 cron 執行使用來自嵌入執行的結構化執行拒絕元數據，作為權威的拒絕信號。當巢狀結構化錯誤訊息以 `SYSTEM_RUN_DENIED` 或 `INVALID_REQUEST` 開頭時，它們也會遵守節點主機 `UNAVAILABLE` 包裝器。

除非嵌入執行也提供結構化拒絕元數據，否則 Cron 不會將最終輸出散文或看似批准的拒絕短語歸類為拒絕，因此普通的助手文字不會被視為被阻擋的指令。

`cron list` 和執行歷史會顯示拒絕原因，而不是將被阻擋的指令報告為 `ok`。

## 保留

保留和修剪是在設定中控制的：

- `cron.sessionRetention`（預設 `24h`）會修剪已完成的獨立執行階段。
- `cron.runLog.maxBytes` 和 `cron.runLog.keepLines` 會修剪 `~/.openclaw/cron/runs/<jobId>.jsonl`。

## 遷移舊工作

<Note>如果您擁有當前交付和存儲格式之前的 cron 任務，請運行 `openclaw doctor --fix`。Doctor 會正規化舊版 cron 字段（`jobId`、`schedule.cron`、頂層交付字段包括舊版 `threadId`、payload `provider` 交付別名），並在配置了 `cron.webhook` 時將簡單的 `notify: true` webhook 後備任務遷移到顯式 webhook 交付。</Note>

## 常見編輯

更新交付設置而不更改訊息：

```bash
openclaw cron edit <job-id> --announce --channel telegram --to "123456789"
```

為獨立任務停用交付：

```bash
openclaw cron edit <job-id> --no-deliver
```

為獨立任務啟用輕量級引導程序上下文：

```bash
openclaw cron edit <job-id> --light-context
```

向特定頻道發送公告：

```bash
openclaw cron edit <job-id> --announce --channel slack --to "channel:C1234567890"
```

向 Telegram 論壇主題發送公告：

```bash
openclaw cron edit <job-id> --announce --channel telegram --to "-1001234567890" --thread-id 42
```

建立帶有輕量級引導程序上下文的獨立任務：

```bash
openclaw cron create "0 7 * * *" \
  "Summarize overnight updates." \
  --name "Lightweight morning brief" \
  --session isolated \
  --light-context \
  --no-deliver
```

`--light-context` 僅適用於獨立的 agent-turn 任務。對於 cron 運行，輕量級模式會將引導程序上下文保持為空，而不是注入完整的工作區引導程序集。

## 常見管理命令

手動運行和檢查：

```bash
openclaw cron list
openclaw cron list --agent ops
openclaw cron get <job-id>
openclaw cron show <job-id>
openclaw cron run <job-id>
openclaw cron run <job-id> --due
openclaw cron run <job-id> --wait --wait-timeout 10m
openclaw cron run <job-id> --wait --wait-timeout 10m --poll-interval 2s
openclaw cron runs --id <job-id> --limit 50
openclaw cron runs --id <job-id> --run-id <run-id>
```

`openclaw cron list` 預設會顯示所有符合的任務。傳遞 `--agent <id>` 以僅顯示有效正規化 agent id 符合的任務；沒有存儲 agent id 的任務將計為配置的預設 agent。

`openclaw cron get <job-id>` 直接返回存儲的任務 JSON。當您需要帶有交付路由預覽的人類可讀視圖時，請使用 `cron show <job-id>`。

`cron list --json` 和 `cron show <job-id> --json` 在每個任務上包含一個頂層 `status` 字段，該字段是根據 `enabled`、`state.runningAtMs` 和 `state.lastRunStatus` 計算得出的。值包括：`disabled`、`running`、`ok`、`error`、`skipped` 或 `idle`。這反映了人類可讀的狀態列，以便外部工具可以讀取任務狀態而無需重新推導。

`cron runs` 條目包含交付診斷信息，其中包括預期的 cron 目標、解析的目標、訊息工具發送、後備使用以及已交付狀態。

代理和會話重定目標：

```bash
openclaw cron edit <job-id> --agent ops
openclaw cron edit <job-id> --clear-agent
openclaw cron edit <job-id> --session current
openclaw cron edit <job-id> --session "session:daily-brief"
```

當代理輪次任務中省略 `--agent` 時，`openclaw cron add` 會發出警告並回退到預設代理 (`main`)。在建立時傳遞 `--agent <id>` 以鎖定特定代理。

傳遞微調：

```bash
openclaw cron edit <job-id> --announce --channel slack --to "channel:C1234567890"
openclaw cron edit <job-id> --webhook "https://example.invalid/openclaw/cron"
openclaw cron edit <job-id> --best-effort-deliver
openclaw cron edit <job-id> --no-best-effort-deliver
openclaw cron edit <job-id> --no-deliver
```

## 相關

- [CLI 參考](/zh-Hant/cli)
- [排程任務](/zh-Hant/automation/cron-jobs)
