---
summary: "CLI 參考：`openclaw cron` (排程及執行背景工作)"
read_when:
  - You want scheduled jobs and wakeups
  - You are debugging cron execution and logs
title: "Cron"
---

# `openclaw cron`

管理 Gateway 排程器的 cron 工作。

<Tip>執行 `openclaw cron --help` 以取得完整的命令介面。請參閱 [Cron jobs](/zh-Hant/automation/cron-jobs) 以了解概念指南。</Tip>

## 工作階段

`--session` 接受 `main`、`isolated`、`current` 或 `session:<id>`。

<AccordionGroup>
  <Accordion title="Session keys">
    - `main` 繫結至代理程式的主要工作階段。
    - `isolated` 為每次執行建立新的文字記錄與工作階段 ID。
    - `current` 繫結至建立時的現用工作階段。
    - `session:<id>` 固定至指定的持久工作階段金鑰。

  </Accordion>
  <Accordion title="Isolated session semantics">
    隔離執行會重設環境對話內容。頻道與群組路由、傳送/佇列原則、提權、來源與 ACP 執行階段繫結會針對新執行進行重設。安全偏好設定以及明確的使用者選取模型或授權覆寫可以跨執行保留。
  </Accordion>
</AccordionGroup>

## 傳遞

`openclaw cron list` 與 `openclaw cron show <job-id>` 可預覽解析後的傳送路由。針對 `channel: "last"`，預覽會顯示路由是從主要或目前工作階段解析，還是會因封閉而失敗。

提供者前置詞目標可釐清未解析的公告頻道。例如，當省略 `delivery.channel` 或為 `last` 時，`to: "telegram:123"` 會選取 Telegram。僅有由已載入外掛公告的前置詞才是提供者選取器。如果明確指定 `delivery.channel`，前置詞必須符合該頻道；`channel: "whatsapp"` 搭配 `to: "telegram:123"` 會被拒絕。諸如 `imessage:` 與 `sms:` 等服務前置詞仍為頻道擁有的目標語法。

<Note>隔離的 `cron add` 工作預設為 `--announce` 傳遞。使用 `--no-deliver` 將輸出保留在內部。`--deliver` 仍是 `--announce` 的已棄用別名。</Note>

### 傳遞所有權

隔離的 cron 聊天傳遞是在代理和 runner 之間共享的：

- 當有聊天路由可用時，代理程式可以使用 `message` 工具直接發送。
- `announce` 僅在代理程式未直接發送到解析目標時，對最終回覆進行後援傳遞。
- `webhook` 將完成的負載發佈到 URL。
- `none` 停用執行器的後援傳遞。

`--announce` 是最終回覆的執行器後援傳遞。`--no-deliver` 會停用該後援，但在有聊天路由可用時不會移除代理程式的 `message` 工具。

從主動聊天建立的提醒會保留即時聊天傳遞目標，以進行後備通知傳遞。內部 session 金鑰可能是小寫；請勿將其用作區分大小寫的提供者 ID（例如 Matrix 房間 ID）的依據。

### 失敗傳遞

失敗通知按以下順序解析：

1. 在該工作上使用 `delivery.failureDestination`。
2. 全域 `cron.failureDestination`。
3. 任務的主要通知目標（當未設定明確的失敗目的地時）。

<Note>主階段工作僅當主要傳遞模式為 `webhook` 時，才能使用 `delivery.failureDestination`。隔離工作則在所有模式下皆接受此設定。</Note>

注意：隔離的 cron 執行會將執行層級的代理失敗視為任務錯誤，即使沒有產生回覆 payload，因此模型/提供者的失敗仍會增加錯誤計數器並觸發失敗通知。

如果隔離執行在第一次模型請求之前逾時，`openclaw cron show`
和 `openclaw cron runs` 會包含特定階段的錯誤，例如
`setup timed out before runner start` 或
`stalled before first model call (last phase: context-engine)`。
對於支援 CLI 的提供者，模型前看門狗會保持運作直到外部
CLI 輪次開始，因此階段查詢、掛鉤、驗證、提示和 CLI 設定的停頓會
被回報為模型前的 cron 失敗。

## 排程

### 單次作業

`--at <datetime>` 排定單次執行。除非您也傳遞 `--tz <iana>`，否則無時區偏移的日期時間會被視為 UTC，這會將牆上時鐘時間解讀為給定時區的時間。

<Note>單次工作預設會在成功後刪除。使用 `--keep-after-run` 來保留它們。</Note>

### 週期性作業

週期性作業在連續發生錯誤後會使用指數退避重試：30 秒、1 分鐘、5 分鐘、15 分鐘、60 分鐘。排程會在下一次成功執行後恢復正常。

跳過的執行會與執行錯誤分開追蹤。它們不會影響重試退避，但 `openclaw cron edit <job-id> --failure-alert-include-skipped` 可以讓失敗警示選擇接收重複跳過執行的通知。

對於針對本機設定模型提供者的隔離作業，cron 會在啟動 agent 回合之前執行輕量級的提供者飛前檢查。Loopback、私人網路和 `.local` `api: "ollama"` 提供者會在 `/api/tags` 接受偵測；本機 OpenAI 相容提供者（例如 vLLM、SGLang 和 LM Studio）會在 `/models` 接受偵測。如果端點無法連線，該執行會記錄為 `skipped` 並在稍後的排程中重試；符合條件的失效端點會快取 5 分鐘，以避免許多作業衝擊同一個本機伺服器。

注意：cron 作業定義位於 `jobs.json`，而擱置中的執行時狀態位於 `jobs-state.json`。如果 `jobs.json` 被外部編輯，Gateway 會重新載入變更的排程並清除過期的擱置位置；僅格式化的重寫動作不會清除擱置位置。

### 手動執行

`openclaw cron run <job-id>` 預設會強制執行，並在手動執行排入佇列後立即傳回。成功的回應會包含 `{ ok: true, enqueued: true, runId }`。請使用傳回的 `runId` 來檢查後續的結果：

```bash
openclaw cron run <job-id>
openclaw cron runs --id <job-id> --run-id <run-id>
```

當腳本應該封鎖，直到該特定排入佇列的執行記錄終止狀態時，請新增 `--wait`：

```bash
openclaw cron run <job-id> --wait --wait-timeout 10m --poll-interval 2s
```

使用 `--wait` 時，CLI 仍然會先呼叫 `cron.run`，然後針對傳回的 `runId` 輪詢 `cron.runs`。只有當執行以狀態 `ok` 完成時，指令才會以 `0` 結束。當執行以 `error` 或 `skipped` 完成、Gateway 回應未包含 `runId`，或 `--wait-timeout` 過期時，它會以非零值結束。`--poll-interval` 必須大於零。

<Note>當您希望只有在作業目前到期時才執行手動指令，請使用 `--due`。如果 `--due --wait` 未將執行排入佇列，指令會傳回正常的非執行回應，而不是進行輪詢。</Note>

## Models

`cron add|edit --model <ref>` 選擇作業的允許模型。

<Warning>如果模型不允許或無法解析，cron 將使運行失敗並返回明確的驗證錯誤，而不是回退到作業的 agent 或預設模型選擇。</Warning>

Cron `--model` 是一個 **作業主要設定**，而非聊天會話 `/model` 覆蓋。這意味著：

- 當選定的作業模型失敗時，已配置的模型回退機制仍然適用。
- 個別作業的 Payload `fallbacks` 會在存在時取代已配置的回退列表。
- 空的個別作業回退列表（作業 Payload/API 中的 `fallbacks: []`）會使 cron 運行變得嚴格。
- 當作業具有 `--model` 但未配置回退列表時，OpenClaw 會傳遞一個明確的空回退覆蓋，以免 agent 主要設定被附加為隱藏的重試目標。

`openclaw doctor` 會回報已設定 `payload.model` 的作業，包括供應商命名空間計數以及與 `agents.defaults.model` 的不符之處。當即時聊天和排程作業之間的授權、供應商或計費行為看起來不同時，請使用該檢查。

### 隔離 cron 模型優先順序

隔離 cron 按以下順序解析作用中的模型：

1. Gmail-hook 覆蓋。
2. 個別作業 `--model`。
3. 儲存的 cron-session 模型覆蓋（當使用者選擇了模型時）。
4. Agent 或預設模型選擇。

### 快速模式

隔離 cron 快速模式遵循解析後的即時模型選擇。模型設定 `params.fastMode` 預設套用，但儲存的會話 `fastMode` 覆蓋仍然優先於設定。

### 即時模型切換重試

如果隔離執行拋出 `LiveSessionModelSwitchError`，cron 會在重試前為作用中的執行保存切換後的供應商和模型（以及切換後的授權設定檔覆蓋，如果存在的話）。外部重試迴圈限制在初始嘗試後進行兩次切換重試，然後中止而不是無限循環。

## 執行輸出與拒絕

### 過時確認抑制

隔離 cron 會開啟抑制僅包含過時確認的回覆。如果第一個結果只是臨時狀態更新，且沒有後代子 agent 執行負責最終答案，cron 會在交付前再次提示以取得真實結果。

### 靜默 Token 抑制

如果獨立的 cron 執行僅傳回靜默令牌（`NO_REPLY` 或 `no_reply`），cron 會同時抑制直接輸出傳遞和後備的佇列摘要路徑，因此不會將任何內容發布回聊天。

### 結構化拒絕

隔離的 cron 執行會使用來自內嵌執行的結構化執行拒絕元資料，作為權威的拒絕訊號。當巢狀結構化錯誤訊息以 `SYSTEM_RUN_DENIED` 或 `INVALID_REQUEST` 開頭時，它們也會遵守節點主機 `UNAVAILABLE` 包裝器。

除非內嵌執行也提供結構化拒絕元資料，否則 Cron 不會將最終輸出的散文或看起來類似核准的拒絕短語分類為拒絕，因此一般的助手文字不會被視為被封鎖的命令。

`cron list` 和執行歷史記錄會顯示拒絕原因，而不是將被封鎖的命令回報為 `ok`。

## 保留

保留與修剪是在設定中控制的：

- `cron.sessionRetention` (預設 `24h`) 會修剪已完成的隔離執行階段。
- `cron.runLog.maxBytes` 和 `cron.runLog.keepLines` 會修剪 `~/.openclaw/cron/runs/<jobId>.jsonl`。

## 遷移較舊的工作

<Note>如果您有在目前傳遞和儲存格式之前的 cron 工作，請執行 `openclaw doctor --fix`。Doctor 會正規化舊版 cron 欄位 (`jobId`、`schedule.cron`、包括舊版 `threadId` 在內的頂層傳遞欄位、payload `provider` 傳遞別名)，並在設定 `cron.webhook` 時，將簡單的 `notify: true` webhook 後備工作遷移至明確的 webhook 傳遞。</Note>

## 常見編輯

更新傳遞設定而不變更訊息：

```bash
openclaw cron edit <job-id> --announce --channel telegram --to "123456789"
```

停用隔離工作的傳遞：

```bash
openclaw cron edit <job-id> --no-deliver
```

為隔離工作啟用輕量級啟動內容：

```bash
openclaw cron edit <job-id> --light-context
```

向特定頻道發布：

```bash
openclaw cron edit <job-id> --announce --channel slack --to "channel:C1234567890"
```

向 Telegram 論壇主題發布：

```bash
openclaw cron edit <job-id> --announce --channel telegram --to "-1001234567890" --thread-id 42
```

建立具有輕量級啟動內容的隔離工作：

```bash
openclaw cron add \
  --name "Lightweight morning brief" \
  --cron "0 7 * * *" \
  --session isolated \
  --message "Summarize overnight updates." \
  --light-context \
  --no-deliver
```

`--light-context` 僅適用於隔離的代理程式回合工作。對於 cron 執行，輕量級模式會將啟動內容保持為空，而不是注入完整的工作區啟動集。

## 常見管理命令

手動執行和檢查：

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

`openclaw cron list` 預設會顯示所有符合的作業。傳遞 `--agent <id>` 以僅顯示有效正規化代理程式 ID 符合的作業；沒有儲存代理程式 ID 的作業會被視為設定的預設代理程式。

`openclaw cron get <job-id>` 會直接傳回已儲存的作業 JSON。當您想要包含傳遞路由預覽的可讀檢視時，請使用 `cron show <job-id>`。

`cron list --json` 和 `cron show <job-id> --json` 在每個作業上包含一個頂層 `status` 欄位，這是根據 `enabled`、`state.runningAtMs` 和 `state.lastRunStatus` 計算而來的。數值包括：`disabled`、`running`、`ok`、`error`、`skipped` 或 `idle`。這反映了人類可讀的狀態欄，以便外部工具可以讀取作業狀態而無需重新推導。

`cron runs` 項目包含傳遞診斷資訊，其中包括預期的 cron 目標、解析的目標、message-tool 傳送、後備使用情況以及已傳遞狀態。

代理程式與工作階段重新導向：

```bash
openclaw cron edit <job-id> --agent ops
openclaw cron edit <job-id> --clear-agent
openclaw cron edit <job-id> --session current
openclaw cron edit <job-id> --session "session:daily-brief"
```

當代理程式輪班作業中省略 `--agent` 時，`openclaw cron add` 會發出警告並後退至預設代理程式 (`main`)。請在建立時傳遞 `--agent <id>` 以釘選特定代理程式。

傳遞調整：

```bash
openclaw cron edit <job-id> --announce --channel slack --to "channel:C1234567890"
openclaw cron edit <job-id> --best-effort-deliver
openclaw cron edit <job-id> --no-best-effort-deliver
openclaw cron edit <job-id> --no-deliver
```

## 相關

- [CLI 參考](/zh-Hant/cli)
- [排程任務](/zh-Hant/automation/cron-jobs)
