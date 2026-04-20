---
summary: "`openclaw cron`（排程和執行背景工作）的 CLI 參考"
read_when:
  - You want scheduled jobs and wakeups
  - You’re debugging cron execution and logs
title: "cron"
---

# `openclaw cron`

管理 Gateway 排程器的 cron 工作。

相關：

- Cron 工作：[Cron 工作](/zh-Hant/automation/cron-jobs)

提示：執行 `openclaw cron --help` 以查看完整的指令介面。

注意：隔離的 `cron add` 工作預設為 `--announce` 傳遞。使用 `--no-deliver` 將輸出保留在內部。`--deliver` 仍保留為 `--announce` 的已棄用別名。

注意：cron 擁有的隔離執行預期為純文字摘要，且執行器擁有最終傳送路徑。`--no-deliver` 將執行保留在內部；它不會將傳遞交還給代理程式的訊息工具。

注意：一次性（`--at`）工作預設會在成功後刪除。使用 `--keep-after-run` 將其保留。

注意：`--session` 支援 `main`、`isolated`、`current` 和 `session:<id>`。
使用 `current` 在建立時綁定至現用工作階段，或使用 `session:<id>` 指定
明確的永久工作階段金鑰。

注意：對於一次性 CLI 工作，除非您也傳遞
`--tz <iana>`（會將該本地牆上時鐘時間解譯為給定的時區），否則無時區偏移的 `--at` 日期時間會被視為 UTC。

注意：週期性工作現在會在連續錯誤後使用指數退避重試（30s → 1m → 5m → 15m → 60m），然後在下一次成功執行後恢復正常排程。

注意：`openclaw cron run` 現在會在手動執行排入佇列後立即返回。成功的回應包含 `{ ok: true, enqueued: true, runId }`；使用 `openclaw cron runs --id <job-id>` 追蹤最終結果。

注意：`openclaw cron run <job-id>` 預設會強制執行。使用 `--due` 保持
舊的「僅在到期時執行」行為。

注意：隔離的 cron 執行會抑制過時的純確認回覆。如果第一個結果只是臨時狀態更新，且沒有子代理執行負責最終答案，cron 會在交付前再次提示以獲取真實結果。

注意：如果隔離的 cron 執行僅返回靜默令牌 (`NO_REPLY` /
`no_reply`)，cron 也會抑制直接出站交付和後備佇列摘要路徑，因此不會將任何內容回傳到聊天。

注意：`cron add|edit --model ...` 使用該作業選定的允許模型。
如果模型不被允許，cron 會警告並改為回退至作業的代理程式/預設模型選擇。已配置的回退鏈仍然適用，但沒有明確的各作業回退列表的純模型覆蓋，不再將代理程式主要模型附加為隱藏的額外重試目標。

注意：隔離的 cron 模型優先順序首先是 Gmail-hook 覆蓋，然後是各作業的
`--model`，接著是任何存儲的 cron-session 模型覆蓋，最後是正常的
代理程式/預設選擇。

注意：隔離的 cron 快速模式遵循解析的即時模型選擇。模型配置
`params.fastMode` 預設適用，但存儲的會話 `fastMode`
覆蓋仍然優先於配置。

注意：如果隔離執行拋出 `LiveSessionModelSwitchError`，cron 會在重試前保留
切換的提供者/模型 (以及切換的授權配置文件覆蓋，如果存在)。外部重試循環在初始嘗試後限制為 2 次切換重試，然後中止而不是無限循環。

注意：失敗通知首先使用 `delivery.failureDestination`，然後是
全局 `cron.failureDestination`，當沒有配置明確的失敗目標時，最終回退到作業的主要
公告目標。

注意：保留/修剪在配置中控制：

- `cron.sessionRetention` (預設 `24h`) 修剪已完成的隔離執行會話。
- `cron.runLog.maxBytes` + `cron.runLog.keepLines` 修剪 `~/.openclaw/cron/runs/<jobId>.jsonl`。

升級注意：如果您擁有當前傳遞/儲存格式之前的舊版 cron 作業，請執行
`openclaw doctor --fix`。Doctor 現在會標準化舊版 cron 欄位（`jobId`、`schedule.cron`、
包含舊版 `threadId` 的頂層傳遞欄位、payload `provider` 傳遞別名），並在設定 `cron.webhook` 時將簡單的
`notify: true` webhook 回退作業遷移為明確的 webhook 傳遞。

## 常見編輯

更新傳遞設定而不變更訊息：

```bash
openclaw cron edit <job-id> --announce --channel telegram --to "123456789"
```

停用隔離作業的傳遞：

```bash
openclaw cron edit <job-id> --no-deliver
```

為隔離作業啟用輕量級啟動語境：

```bash
openclaw cron edit <job-id> --light-context
```

公告至特定頻道：

```bash
openclaw cron edit <job-id> --announce --channel slack --to "channel:C1234567890"
```

建立具有輕量級啟動語境的隔離作業：

```bash
openclaw cron add \
  --name "Lightweight morning brief" \
  --cron "0 7 * * *" \
  --session isolated \
  --message "Summarize overnight updates." \
  --light-context \
  --no-deliver
```

`--light-context` 僅適用於隔離的 agent-turn 作業。對於 cron 執行，輕量級模式會將啟動語境保持為空，而不是注入完整的工作區啟動集。

傳遞所有權注意：

- Cron 擁有的隔離作業一律會透過 cron 執行器（`announce`、`webhook` 或僅限內部使用的 `none`）傳送最終的使用者可見傳遞。
- 如果任務提及要傳訊給某些外部收件者，代理程式應該在結果中描述預期的目的地，而不是嘗試直接傳送。

## 常見管理指令

手動執行：

```bash
openclaw cron run <job-id>
openclaw cron run <job-id> --due
openclaw cron runs --id <job-id> --limit 50
```

Agent/session 重新指定目標：

```bash
openclaw cron edit <job-id> --agent ops
openclaw cron edit <job-id> --clear-agent
openclaw cron edit <job-id> --session current
openclaw cron edit <job-id> --session "session:daily-brief"
```

傳遞微調：

```bash
openclaw cron edit <job-id> --announce --channel slack --to "channel:C1234567890"
openclaw cron edit <job-id> --best-effort-deliver
openclaw cron edit <job-id> --no-best-effort-deliver
openclaw cron edit <job-id> --no-deliver
```

失敗傳遞注意：

- 隔離作業支援 `delivery.failureDestination`。
- 主要 session 作業僅在主要傳遞模式為 `webhook` 時才能使用 `delivery.failureDestination`。
- 如果您未設定任何失敗目的地，且作業已公告至頻道，失敗通知會重複使用相同的公告目標。
