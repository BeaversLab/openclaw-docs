---
summary: "CLI 參考資料，用於 `openclaw cron`（排程和執行背景工作）"
read_when:
  - You want scheduled jobs and wakeups
  - You are debugging cron execution and logs
title: "Cron"
---

# `openclaw cron`

管理 Gateway 排程器的 cron 工作。

<Tip>執行 `openclaw cron --help` 以查看完整的指令介面。請參閱 [Cron jobs](/zh-Hant/automation/cron-jobs) 以了解概念指南。</Tip>

## 工作階段

`--session` 接受 `main`、`isolated`、`current` 或 `session:<id>`。

<AccordionGroup>
  <Accordion title="Session keys">
    - `main` 繫結至代理程式的主要工作階段。
    - `isolated` 為每次執行建立新的對話記錄和工作階段 ID。
    - `current` 繫結至建立時的現用工作階段。
    - `session:<id>` 釘選至明確的持續性工作階段金鑰。
  </Accordion>
  <Accordion title="Isolated session semantics">
    隔離執行會重設周圍的對話上下文。頻道和群組路由、傳送/佇列原則、提升、來源和 ACP 執行階段繫結會在新的執行中重設。安全偏好設定以及明確的使用者選取模型或驗證覆寫可以跨執行保留。
  </Accordion>
</AccordionGroup>

## 傳遞

`openclaw cron list` 和 `openclaw cron show <job-id>` 預覽已解析的傳遞路由。對於 `channel: "last"`，預覽會顯示路由是從主要或目前工作階段解析，還是會以封閉式失敗。

<Note>隔離的 `cron add` 工作預設為 `--announce` 傳遞。使用 `--no-deliver` 將輸出保持在內部。`--deliver` 仍作為 `--announce` 的已棄用別名。</Note>

### 傳遞擁有權

隔離的 cron 聊天傳遞是在代理程式和執行器之間共享的：

- 當有聊天路由可用時，代理程式可以使用 `message` 工具直接傳送。
- `announce` 僅在代理程式未直接傳送至已解析目標時，才會備援傳遞最終回覆。
- `webhook` 將完成的 payload 張貼至 URL。
- `none` 會停用 runner 備援傳遞。

`--announce` 是最終回覆的 runner 備援傳遞。`--no-deliver` 會停用該備援，但在有聊天路由可用時不會移除代理程式的 `message` 工具。

從進行中的聊天建立的提醒會保留即時聊天傳遞目標，用於備援公告傳遞。內部工作階段金鑰可能為小寫；請勿將其作為區分大小寫的提供者 ID（例如 Matrix 房間 ID）的事實依據。

### 失敗傳遞

失敗通知會依照以下順序解析：

1. 工作上的 `delivery.failureDestination`。
2. 全域 `cron.failureDestination`。
3. 工作的主要公告目標（當未設定明確的失敗目的地時）。

<Note>主要工作階段的工作只有在主要傳遞模式為 `webhook` 時才能使用 `delivery.failureDestination`。隔離工作則在所有模式下皆接受。</Note>

注意：隔離 cron 執行會將執行層級的代理程式失敗視為工作錯誤，即使未產生回覆 payload 亦然；因此模型/提供者失敗仍會增加錯誤計數器並觸發失敗通知。

## 排程

### 一次性工作

`--at <datetime>` 會排程一次性執行。若無時區偏移的日期時間會被視為 UTC，除非您同時傳遞 `--tz <iana>`，這會以指定時區的牆上時鐘時間來解讀。

<Note>一次性工作預設在成功後會被刪除。請使用 `--keep-after-run` 來保留它們。</Note>

### 週期性工作

週期性工作在連續錯誤後會使用指數退避重試：30 秒、1 分鐘、5 分鐘、15 分鐘、60 分鐘。排程會在下一次成功執行後恢復正常。

跳過的執行會與執行錯誤分開追蹤。它們不會影響重試退避，但 `openclaw cron edit <job-id> --failure-alert-include-skipped` 可以選擇讓失敗警示接收重複跳過執行的通知。

注意：cron 工作定義位於 `jobs.json`，而擱置的執行時期狀態位於 `jobs-state.json`。如果 `jobs.json` 被外部編輯，Gateway 會重新載入變更的排程並清除過期的擱置時段；僅格式化的重寫不會清除擱置時段。

### 手動執行

`openclaw cron run` 會在手動執行排入佇列後立即返回。成功的回應包含 `{ ok: true, enqueued: true, runId }`。請使用 `openclaw cron runs --id <job-id>` 來追蹤最終結果。

<Note>
`openclaw cron run <job-id>` 預設會強制執行。請使用 `--due` 以保留較舊的「僅在到期時執行」行為。
</Note>

## 模型

`cron add|edit --model <ref>` 為工作選取一個允許的模型。

<Warning>如果該模型不被允許，cron 會發出警告並回退至工作的代理程式或預設模型選擇。設定的回退鏈仍然適用，但如果沒有針對特定工作的明確回退清單，單純的模型覆寫將不再將代理程式主要模型附加為隱藏的額外重試目標。</Warning>

### 隔離 cron 模型優先順序

隔離 cron 依以下順序解析活動模型：

1. Gmail-hook 覆寫。
2. 個別工作 `--model`。
3. 儲存的 cron-session 模型覆寫（當使用者選擇時）。
4. 代理程式或預設模型選擇。

### 快速模式

隔離 cron 快速模式遵循解析後的即時模型選擇。模型設定 `params.fastMode` 預設生效，但儲存的 session `fastMode` 覆寫仍優先於設定。

### 即時模型切換重試

如果隔離執行拋出 `LiveSessionModelSwitchError`，cron 會在重試前將切換後的提供者和模型（以及存在的切換後 auth profile 覆寫）保存至活動執行中。外部重試迴圈在初始嘗試後限制為兩次切換重試，然後中止而不是無限迴圈。

## 執行輸出與拒絕

### 過時確認抑制

隔離 cron 會開啟抑制僅含過時確認的回覆。如果第一個結果只是暫時的狀態更新，且沒有子代理程式執行負責最終答案，cron 會在傳送前重新提示一次以取得真實結果。

### 靜默符號抑制

如果隔離 cron 執行僅傳回靜默符號（`NO_REPLY` 或 `no_reply`），cron 會同時抑制直接 outbound 傳送和回退的佇列摘要路徑，因此不會將任何內容張貼回聊天。

### 結構化拒絕

隔離的 cron 執行優先使用來自嵌入式執行的結構化執行拒絕中繼資料，然後回退到最終輸出中的已知拒絕標記，例如 `SYSTEM_RUN_DENIED`、`INVALID_REQUEST` 和批准綁定拒絕短語。

`cron list` 和執行歷史記錄會顯示拒絕原因，而不是將被阻擋的指令報告為 `ok`。

## 保留

保留和修剪是在配置中控制的：

- `cron.sessionRetention` (預設為 `24h`) 會修剪已完成的隔離執行階段。
- `cron.runLog.maxBytes` 和 `cron.runLog.keepLines` 會修剪 `~/.openclaw/cron/runs/<jobId>.jsonl`。

## 遷移舊版工作

<Note>如果您有來自目前傳遞和儲存格式之前的 cron 工作，請執行 `openclaw doctor --fix`。Doctor 會將舊版 cron 欄位正規化 (`jobId`、`schedule.cron`、包括舊版 `threadId` 在內的頂層傳遞欄位、承載 `provider` 傳遞別名)，並在設定 `cron.webhook` 時將簡單的 `notify: true` webhook 後備工作遷移到明確的 webhook 傳遞。</Note>

## 常見編輯

更新傳遞設定而不變更訊息：

```bash
openclaw cron edit <job-id> --announce --channel telegram --to "123456789"
```

停用隔離工作的傳遞：

```bash
openclaw cron edit <job-id> --no-deliver
```

為隔離工作啟用輕量級啟動程序內容：

```bash
openclaw cron edit <job-id> --light-context
```

向特定頻道發布：

```bash
openclaw cron edit <job-id> --announce --channel slack --to "channel:C1234567890"
```

建立具有輕量級啟動程序內容的隔離工作：

```bash
openclaw cron add \
  --name "Lightweight morning brief" \
  --cron "0 7 * * *" \
  --session isolated \
  --message "Summarize overnight updates." \
  --light-context \
  --no-deliver
```

`--light-context` 僅適用於隔離的 agent-turn 工作。對於 cron 執行，輕量級模式會保持啟動程序內容為空，而不是注入完整的工作區啟動程序集。

## 常見管理員指令

手動執行和檢查：

```bash
openclaw cron list
openclaw cron show <job-id>
openclaw cron run <job-id>
openclaw cron run <job-id> --due
openclaw cron runs --id <job-id> --limit 50
```

`cron runs` 項目包含傳遞診斷資訊，其中包含預期的 cron 目標、解析的目標、message-tool 發送、後備使用和傳遞狀態。

代理和階段重新導向：

```bash
openclaw cron edit <job-id> --agent ops
openclaw cron edit <job-id> --clear-agent
openclaw cron edit <job-id> --session current
openclaw cron edit <job-id> --session "session:daily-brief"
```

傳遞調整：

```bash
openclaw cron edit <job-id> --announce --channel slack --to "channel:C1234567890"
openclaw cron edit <job-id> --best-effort-deliver
openclaw cron edit <job-id> --no-best-effort-deliver
openclaw cron edit <job-id> --no-deliver
```

## 相關

- [CLI 參考資料](/zh-Hant/cli)
- [預定任務](/zh-Hant/automation/cron-jobs)
