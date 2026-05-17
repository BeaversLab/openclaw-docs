---
summary: "CLI 參考手冊：`openclaw cron`（排程並執行背景工作）"
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
    - `isolated` 為每次執行建立新的對話紀錄和工作階段 ID。
    - `current` 繫結至建立時的現用工作階段。
    - `session:<id>` 固定至明確的持久工作階段金鑰。

  </Accordion>
  <Accordion title="Isolated session semantics">
    隔離執行會重置周圍的對語內容。通道和群組路由、傳送/佇列原則、提權、來源和 ACP 執行階段繫結會針對新的執行進行重置。安全的偏好設定以及明確的使用者選取模型或認證覆寫可以跨執行傳遞。
  </Accordion>
</AccordionGroup>

## 傳遞

`openclaw cron list` 和 `openclaw cron show <job-id>` 會預覽解析後的傳送路由。對於 `channel: "last"`，預覽會顯示路由是從主要還是目前工作階段解析，或是會失敗並封閉。

提供者前綴目標可以消除未解析的公告通道歧義。例如，當省略 `delivery.channel` 或為 `last` 時，`to: "telegram:123"` 會選取 Telegram。只有已載入外掛程式公告的前綴才是提供者選取器。如果 `delivery.channel` 是明確的，前綴必須符合該通道；`channel: "whatsapp"` 搭配 `to: "telegram:123"` 會被拒絕。服務前綴（例如 `imessage:` 和 `sms:`）保持通道擁有的目標語法。

<Note>隔離的 `cron add` 任務預設為 `--announce` 傳遞。使用 `--no-deliver` 將輸出保留在內部。`--deliver` 保留為 `--announce` 的已棄用別名。</Note>

### 傳遞所有權

隔離的 cron 聊天傳遞是在代理和 runner 之間共享的：

- 當聊天路由可用時，代理可以使用 `message` 工具直接發送。
- `announce` 僅在代理未直接發送至解析目標時，對最終回覆進行後備傳遞。
- `webhook` 將完成的 payload 發佈到 URL。
- `none` 停用 runner 後備傳遞。

`--announce` 是針對最終回覆的 runner 後備傳遞。`--no-deliver` 會停用該後備傳遞，但在聊天路由可用時不會移除代理的 `message` 工具。

從主動聊天建立的提醒會保留即時聊天傳遞目標，以進行後備通知傳遞。內部 session 金鑰可能是小寫；請勿將其用作區分大小寫的提供者 ID（例如 Matrix 房間 ID）的依據。

### 失敗傳遞

失敗通知按以下順序解析：

1. 任務上的 `delivery.failureDestination`。
2. 全域 `cron.failureDestination`。
3. 任務的主要通知目標（當未設定明確的失敗目的地時）。

<Note>Main-session 任務僅在主要傳遞模式為 `webhook` 時才能使用 `delivery.failureDestination`。隔離任務在所有模式下都接受它。</Note>

注意：隔離的 cron 執行會將執行層級的代理失敗視為任務錯誤，即使沒有產生回覆 payload，因此模型/提供者的失敗仍會增加錯誤計數器並觸發失敗通知。

如果獨立執行在首次模型請求之前逾時，`openclaw cron show` 和 `openclaw cron runs` 會包含特定階段的錯誤，例如 `setup timed out before runner start` 或 `stalled before first model call (last phase: context-engine)`。對於由 CLI 支援的提供者，前置模型監視程式會保持啟用狀態，直到外部 CLI 輪次開始，因此會話查找、掛鉤、驗證、提示和 CLI 設定的停滯會被回報為前置模型 cron 失敗。

## 排程

### 單次作業

`--at <datetime>` 排定單次執行。除非您也傳遞 `--tz <iana>`，否則無時區偏移的日期時間會被視為 UTC，後者會將指定時區的牆上時鐘時間納入解讀。

<Note>單次作業在成功後預設會刪除。請使用 `--keep-after-run` 來保留它們。</Note>

### 週期性作業

週期性作業在連續發生錯誤後會使用指數退避重試：30 秒、1 分鐘、5 分鐘、15 分鐘、60 分鐘。排程會在下一次成功執行後恢復正常。

已略過的執行與執行錯誤分開追蹤。它們不會影響重試退避，但 `openclaw cron edit <job-id> --failure-alert-include-skipped` 可以選擇讓失敗警示接收重複的已略過執行通知。

對於針對本地設定模型提供者的獨立作業，cron 會在啟動代理程式輪次之前執行輕量級提供者飛行前檢查。Loopback、專用網路和 `.local` `api: "ollama"` 提供者會在 `/api/tags` 探測；本機 OpenAI 相容的提供者（例如 vLLM、SGLang 和 LM Studio）會在 `/models` 探測。如果端點無法連線，該執行會記錄為 `skipped` 並在稍後的排程中重試；相符的失效端點會快取 5 分鐘，以避免許多作業衝擊同一台本機伺服器。

注意：cron 作業定義位於 `jobs.json` 中，而待處理的執行階段狀態位於 `jobs-state.json` 中。如果 `jobs.json` 被外部編輯，Gateway 會重新載入變更的排程並清除過時的待處理插槽；僅格式化的重寫不會清除待處理插槽。

### 手動執行

`openclaw cron run` 在手動執行加入佇列後立即傳回。成功的回應包含 `{ ok: true, enqueued: true, runId }`。請使用 `openclaw cron runs --id <job-id>` 追蹤最終結果。

<Note>
`openclaw cron run <job-id>` 預設會強制執行。使用 `--due` 以保留舊的「僅在到期時執行」行為。
</Note>

## Models

`cron add|edit --model <ref>` 選擇作業的允許模型。

<Warning>如果模型不被允許或無法解析，cron 會以明確的驗證錯誤讓執行失敗，而不是回退到作業的 agent 或預設模型選擇。</Warning>

Cron `--model` 是一個 **作業主要設定**，而不是聊天會話 `/model` 覆寫。這表示：

- 當選取的作業模型失敗時，設定的模型回退仍然適用。
- 個別作業的 Payload `fallbacks` 會在存在時取代設定的回退清單。
- 空的個別作業回退清單（作業 Payload/API 中的 `fallbacks: []`）會讓 cron 執行變成嚴格模式。
- 當作業有 `--model` 但未設定回退清單時，OpenClaw 會傳遞一個明確的空回退覆寫，因此 agent 主要設定不會被附加為隱藏的重試目標。

### 隔離 cron 模型優先順序

隔離 cron 會依照此順序解析作用中的模型：

1. Gmail-hook 覆寫。
2. 個別作業 `--model`。
3. 儲存的 cron-session 模型覆寫（當使用者選擇了模型時）。
4. Agent 或預設模型選擇。

### 快速模式

隔離 cron 快速模式遵循解析後的即時模型選擇。模型設定 `params.fastMode` 預設會套用，但儲存的會話 `fastMode` 覆寫仍然會優先於設定。

### 即時模型切換重試

如果隔離執行拋出 `LiveSessionModelSwitchError`，cron 會在重試之前，為作用中的執行保存切換後的提供者和模型（以及在存在時切換後的 auth profile 覆寫）。外部重試迴圈在初始嘗試後限制為兩次切換重試，然後中止而不是無限迴圈。

## 執行輸出與拒絕

### 過時確認抑制

獨立的 cron 會抑制過時的僅確認回覆。如果第一個結果只是一個臨時狀態更新，且沒有後續的子代理運行負責最終答案，則 cron 會在交付前重新提示一次以獲取真實結果。

### 靜默令牌抑制

如果獨立的 cron 運行僅返回靜默令牌 (`NO_REPLY` 或 `no_reply`)，cron 將同時抑制直接出站交付和後備佇列摘要路徑，因此不會將任何內容發布回聊天。

### 結構化拒絕

獨立的 cron 運行優先使用嵌入運行中的結構化執行拒絕元數據，然後回退到最終輸出中的已知拒絕標記，例如 `SYSTEM_RUN_DENIED`、`INVALID_REQUEST` 和批准綁定拒絕短語。

`cron list` 和運行歷史記錄會顯示拒絕原因，而不是將被阻止的命令報告為 `ok`。

## 保留

保留和修剪在配置中控制：

- `cron.sessionRetention` (預設 `24h`) 修剪已完成的獨立運行會話。
- `cron.runLog.maxBytes` 和 `cron.runLog.keepLines` 修剪 `~/.openclaw/cron/runs/<jobId>.jsonl`。

## 遷移舊作業

<Note>如果您擁有當前交付和存儲格式之前的 cron 作業，請運行 `openclaw doctor --fix`。Doctor 會標準化舊版 cron 字段 (`jobId`、`schedule.cron`、包括舊版 `threadId` 在內的頂層交付字段、負載 `provider` 交付別名)，並在配置 `cron.webhook` 時將簡單的 `notify: true` webhook 後備作業遷移到顯式 webhook 交付。</Note>

## 常見編輯

更新交付設定而不變更訊息：

```bash
openclaw cron edit <job-id> --announce --channel telegram --to "123456789"
```

停用獨立作業的交付：

```bash
openclaw cron edit <job-id> --no-deliver
```

為獨立作業啟用輕量級引導上下文：

```bash
openclaw cron edit <job-id> --light-context
```

向特定頻道公告：

```bash
openclaw cron edit <job-id> --announce --channel slack --to "channel:C1234567890"
```

向 Telegram 論壇主題公告：

```bash
openclaw cron edit <job-id> --announce --channel telegram --to "-1001234567890" --thread-id 42
```

建立具有輕量級引導上下文的獨立作業：

```bash
openclaw cron add \
  --name "Lightweight morning brief" \
  --cron "0 7 * * *" \
  --session isolated \
  --message "Summarize overnight updates." \
  --light-context \
  --no-deliver
```

`--light-context` 僅適用於獨立的代理輪次作業。對於 cron 運行，輕量級模式會將引導上下文保持為空，而不是注入完整的工作區引導集合。

## 常見的管理員指令

手動執行與檢查：

```bash
openclaw cron list
openclaw cron list --agent ops
openclaw cron get <job-id>
openclaw cron show <job-id>
openclaw cron run <job-id>
openclaw cron run <job-id> --due
openclaw cron runs --id <job-id> --limit 50
```

`openclaw cron list` 預設會顯示所有符合條件的工作。傳入 `--agent <id>` 以僅顯示有效標準化代理程式 ID 相符的工作；未儲存代理程式 ID 的工作則視為設定的預設代理程式。

`openclaw cron get <job-id>` 會直接回傳儲存的工作 JSON。當您想要包含傳遞路由預覽的人類可讀視圖時，請使用 `cron show <job-id>`。

`cron list --json` 和 `cron show <job-id> --json` 在每個工作中包含一個頂層 `status` 欄位，該欄位是根據 `enabled`、`state.runningAtMs` 和 `state.lastRunStatus` 計算而得。數值包括：`disabled`、`running`、`ok`、`error`、`skipped` 或 `idle`。這反映了人類可讀的狀態欄，以便外部工具無需重新推導即可讀取工作狀態。

`cron runs` 項目包含傳遞診斷資訊，其中包括預定的 cron 目標、解析後的目標、message-tool 發送、備援使用以及已傳遞狀態。

代理程式與工作階段重新指定目標：

```bash
openclaw cron edit <job-id> --agent ops
openclaw cron edit <job-id> --clear-agent
openclaw cron edit <job-id> --session current
openclaw cron edit <job-id> --session "session:daily-brief"
```

當在 agent-turn 工作中省略 `--agent` 時，`openclaw cron add` 會發出警告，並退回至預設代理程式 (`main`)。在建立時傳入 `--agent <id>` 以鎖定特定的代理程式。

傳遞調整：

```bash
openclaw cron edit <job-id> --announce --channel slack --to "channel:C1234567890"
openclaw cron edit <job-id> --best-effort-deliver
openclaw cron edit <job-id> --no-best-effort-deliver
openclaw cron edit <job-id> --no-deliver
```

## 相關

- [CLI 參考資料](/zh-Hant/cli)
- [排程任務](/zh-Hant/automation/cron-jobs)
