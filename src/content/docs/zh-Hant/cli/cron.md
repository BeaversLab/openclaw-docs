---
summary: "CLI 參考手冊：`openclaw cron`（排程並執行背景工作）"
read_when:
  - You want scheduled jobs and wakeups
  - You are debugging cron execution and logs
title: "Cron"
---

# `openclaw cron`

管理 Gateway 排程器的 cron 工作。

<Tip>執行 `openclaw cron --help` 以查看完整的命令介面。請參閱 [Cron jobs](/zh-Hant/automation/cron-jobs) 以了解概念指南。</Tip>

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

## 排程

### 單次任務

`--at <datetime>` 排程單次執行。除非您也傳遞 `--tz <iana>`，否則無時區的日期時間會被視為 UTC，後者會解釋為給定時區中的牆上時鐘時間。

<Note>單次任務預設在成功後刪除。使用 `--keep-after-run` 來保留它們。</Note>

### 週期性任務

週期性任務在連續錯誤後會使用指數退避重試：30 秒、1 分鐘、5 分鐘、15 分鐘、60 分鐘。排程會在下一次成功執行後恢復正常。

跳過的執行與執行錯誤分開追蹤。它們不會影響重試退避，但 `openclaw cron edit <job-id> --failure-alert-include-skipped` 可以讓失敗警示選擇接收重複的跳過執行通知。

對於針對本地設定模型提供者的隔離任務，cron 會在啟動代理程序回合之前執行輕量級提供者預檢。Loopback、私人網路和 `.local` `api: "ollama"` 提供者會在 `/api/tags` 進行探測；本地相容 OpenAI 的提供者（例如 vLLM、SGLang 和 LM Studio）則在 `/models` 進行探測。如果端點無法連線，該次執行會被記錄為 `skipped` 並在稍後的排程中重試；匹配的死端點會被快取 5 分鐘，以避免多個任務衝擊同一個本地伺服器。

注意：cron 任務定義存在於 `jobs.json` 中，而擱置中的執行時狀態則存在於 `jobs-state.json` 中。如果 `jobs.json` 被外部編輯，Gateway 會重新載入變更的排程並清除過時的擱置插槽；僅格式化的重寫不會清除擱置插槽。

### 手動執行

`openclaw cron run` 會在手動執行排入佇列後立即返回。成功的回應包含 `{ ok: true, enqueued: true, runId }`。請使用 `openclaw cron runs --id <job-id>` 來追蹤最終結果。

<Note>
`openclaw cron run <job-id>` 預設會強制執行。使用 `--due` 以保留較舊的「僅在到期時執行」行為。
</Note>

## 模型

`cron add|edit --model <ref>` 會為該任務選擇一個允許的模型。

<Warning>如果模型不被允許或無法解析，cron 會使執行失敗並回傳明確的驗證錯誤，而不是回退到任務的代理程式或預設模型選擇。</Warning>

Cron `--model` 是 **任務主要** 模型，而非聊天工作階段 `/model` 覆蓋。這意味著：

- 當選定的工作模型失敗時，設定的模型回退機制仍然適用。
- 當存在時，各別任務的 payload `fallbacks` 會取代設定的回退清單。
- 空的每個任務後備清單（在任務 payload/API 中的 `fallbacks: []`）會使 cron 執行變為嚴格模式。
- 當任務具有 `--model` 但未設定後備清單時，OpenClaw 會傳遞明確的空白後備覆寫，這樣代理主體就不會被附加為隱藏的重試目標。

### 隔離 cron 模型優先順序

隔離 cron 會依以下順序解析作用中的模型：

1. Gmail-hook 覆寫。
2. 每個任務的 `--model`。
3. 已儲存的 cron-session 模型覆寫（當使用者選擇了一個時）。
4. 代理或預設模型選擇。

### 快速模式

隔離 cron 快速模式會遵循解析後的即時模型選擇。模型設定 `params.fastMode` 預設會套用，但已儲存的 session `fastMode` 覆寫仍會優先於設定。

### 即時模型切換重試

如果隔離執行擲回 `LiveSessionModelSwitchError`，cron 會在重試前針對作用中的執行保存已切換的提供者和模型（以及存在的已切換驗證設定檔覆寫）。外部重試迴圈在初始嘗試後限制為兩次切換重試，然後中止而不是無限迴圈。

## 執行輸出與拒絕

### 過時確認抑制

隔離 cron 會開啟抑制僅包含過時確認的回覆。如果第一個結果只是臨時狀態更新，且沒有子代理執行負責最終答案，cron 會在交付前重新提示一次以取得真實結果。

### 靜默符號抑制

如果隔離 cron 執行僅傳回靜默符號（`NO_REPLY` 或 `no_reply`），cron 會同時抑制直接 outbound 傳遞和後備排程摘要路徑，因此不會有任何內容貼回聊天。

### 結構化拒絕

隔離 cron 執行偏好來自內嵌執行的結構化執行拒絕元數據，然後退回到最終輸出中的已知拒絕標記，例如 `SYSTEM_RUN_DENIED`、`INVALID_REQUEST` 和批准綁定拒絕片語。

`cron list` 和執行歷史記錄會顯示拒絕原因，而不是將被封鎖的指令回報為 `ok`。

## 保留

保留和修剪是在設定中控制的：

- `cron.sessionRetention` (預設 `24h`) 會清理已完成的獨立執行階段。
- `cron.runLog.maxBytes` 和 `cron.runLog.keepLines` 會清理 `~/.openclaw/cron/runs/<jobId>.jsonl`。

## 遷移舊版工作

<Note>如果您有在目前的傳遞和儲存格式之前建立的 cron 工作，請執行 `openclaw doctor --fix`。Doctor 會正規化舊版 cron 欄位 (`jobId`、`schedule.cron`、包含舊版 `threadId` 的頂層傳遞欄位、payload `provider` 傳遞別名)，並在設定 `cron.webhook` 時，將簡單的 `notify: true` webhook 後備工作遷移至明確的 webhook 傳遞。</Note>

## 常見編輯

更新傳遞設定而不變更訊息：

```bash
openclaw cron edit <job-id> --announce --channel telegram --to "123456789"
```

停用獨立工作的傳遞：

```bash
openclaw cron edit <job-id> --no-deliver
```

為獨立工作啟用輕量級啟動上下文：

```bash
openclaw cron edit <job-id> --light-context
```

宣布至特定頻道：

```bash
openclaw cron edit <job-id> --announce --channel slack --to "channel:C1234567890"
```

宣布至 Telegram 論壇主題：

```bash
openclaw cron edit <job-id> --announce --channel telegram --to "-1001234567890" --thread-id 42
```

建立具有輕量級啟動上下文的獨立工作：

```bash
openclaw cron add \
  --name "Lightweight morning brief" \
  --cron "0 7 * * *" \
  --session isolated \
  --message "Summarize overnight updates." \
  --light-context \
  --no-deliver
```

`--light-context` 僅適用於獨立的 agent-turn 工作。對於 cron 執行，輕量模式會將啟動上下文保持為空白，而不是注入完整的工作區啟動集合。

## 常見管理指令

手動執行與檢查：

```bash
openclaw cron list
openclaw cron list --agent ops
openclaw cron show <job-id>
openclaw cron run <job-id>
openclaw cron run <job-id> --due
openclaw cron runs --id <job-id> --limit 50
```

`openclaw cron list` 預設會顯示所有符合的工作。傳遞 `--agent <id>` 以僅顯示有效正規化 agent id 符合的工作；沒有儲存 agent id 的工作會視為設定的預設 agent。

`cron list --json` 和 `cron show <job-id> --json` 在每個工作上包含一個頂層 `status` 欄位，根據 `enabled`、`state.runningAtMs` 和 `state.lastRunStatus` 計算得出。數值包括：`disabled`、`running`、`ok`、`error`、`skipped` 或 `idle`。這反映了人類可讀的狀態欄，以便外部工具可以在不重新推導的情況下讀取工作狀態。

`cron runs` 條目包含傳遞診斷資訊，包括預定的 cron 目標、解析後的目標、message-tool 傳送、備援使用以及已傳遞狀態。

代理程式和會話重新導向：

```bash
openclaw cron edit <job-id> --agent ops
openclaw cron edit <job-id> --clear-agent
openclaw cron edit <job-id> --session current
openclaw cron edit <job-id> --session "session:daily-brief"
```

當代理程式輪次 (agent-turn) 工作中省略 `--agent` 時，`openclaw cron add` 會發出警告，並回退至預設代理程式 (`main`)。請在建立時傳遞 `--agent <id>` 以鎖定特定代理程式。

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
