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

注意：`openclaw cron list` 和 `openclaw cron show <job-id>` 會預覽解析後的傳遞路由。對於 `channel: "last"`，預覽會顯示路由是從主/目前工作階段解析，還是會失敗關閉。

注意：隔離的 `cron add` 工作預設為 `--announce` 傳遞。使用 `--no-deliver` 以保持輸出在內部。`--deliver` 保留為 `--announce` 的已棄用別名。

注意：隔離的 cron 聊天傳遞是共享的。`--announce` 是最終回覆的執行器後備傳遞；`--no-deliver` 會停用該後備，但在有可用聊天路由時不會移除代理程式的 `message` 工具。

注意：一次性 (`--at`) 工作在成功後預設會被刪除。使用 `--keep-after-run` 來保留它們。

注意：`--session` 支援 `main`、`isolated`、`current` 和 `session:<id>`。
使用 `current` 在建立時綁定到啟用的工作階段，或使用 `session:<id>` 針對
明確的持久工作階段金鑰。

注意：對於一次性 CLI 工作，無時區位移的 `--at` 日期時間會被視為 UTC，除非您也傳遞
`--tz <iana>`，這會將當地牆鐘時間解釋為給定的時區。

注意：週期性工作現在在連續錯誤後會使用指數退避重試 (30s → 1m → 5m → 15m → 60m)，然後在下次成功執行後恢復正常排程。

注意：`openclaw cron run` 現在會在手動執行排入佇列後立即返回。成功的回應包括 `{ ok: true, enqueued: true, runId }`；使用 `openclaw cron runs --id <job-id>` 來追蹤最終結果。

注意：`openclaw cron run <job-id>` 預設會強制執行。使用 `--due` 以保持
較舊的「僅在到期時執行」行為。

注意：獨立 cron 執行會抑制過時的僅確認回覆。如果第一個結果只是臨時狀態更新，且沒有後續子代理程式執行負責最終答案，則 cron 會在交付之前重新提示一次以取得真實結果。

注意：如果獨立 cron 執行僅返回靜默標記 (`NO_REPLY` /
`no_reply`)，cron 也會抑制直接輸出傳遞和後備佇列摘要路徑，因此不會有任何內容發佈回聊天。

注意：`cron add|edit --model ...` 會為該作業使用所選的允許模型。
如果該模型不被允許，cron 會發出警告並回退到該作業的代理程式/預設模型選擇。設定的後備鏈仍然適用，但沒有明確的各作業後備列表的單純模型覆蓋，不再將代理程式主要模型作為隱藏的額外重試目標附加。

注意：獨立 cron 模型優先順序首先是 Gmail-hook 覆蓋，然後是各作業的
`--model`，接著是任何已儲存的 cron-session 模型覆蓋，最後是正常的
代理程式/預設選擇。

注意：獨立 cron 快速模式遵循解析後的即時模型選擇。模型設定
`params.fastMode` 預設適用，但已儲存的 session `fastMode`
覆蓋仍優先於設定。

注意：如果獨立執行拋出 `LiveSessionModelSwitchError`，cron 會在重試之前保存
切換後的提供者/模型（以及在存在時切換後的認證設定檔覆蓋）。外部重試迴圈在初始嘗試後受限於 2 次切換重試，然後中止而不是無限迴圈。

注意：失敗通知首先使用 `delivery.failureDestination`，然後是
全域 `cron.failureDestination`，最後在未設定明確失敗目的地時回退到該作業的主要
公告目標。

注意：保留/修剪是在設定中控制的：

- `cron.sessionRetention` (預設 `24h`) 會修剪已完成的獨立執行 session。
- `cron.runLog.maxBytes` + `cron.runLog.keepLines` 修剪 `~/.openclaw/cron/runs/<jobId>.jsonl`。

升級提示：如果您擁有來自目前傳遞/儲存格式之前的舊版 cron 工作，請執行
`openclaw doctor --fix`。Doctor 現在會將舊版 cron 欄位（`jobId`、`schedule.cron`、
包含舊版 `threadId` 的頂層傳遞欄位、payload `provider` 傳遞別名）標準化，並在設定 `cron.webhook` 時
將簡單的 `notify: true` webhook 後援工作遷移至明確的 webhook 傳遞。

## 常見編輯

更新傳遞設定而不變更訊息：

```bash
openclaw cron edit <job-id> --announce --channel telegram --to "123456789"
```

停用隔離工作的傳遞：

```bash
openclaw cron edit <job-id> --no-deliver
```

為隔離工作啟用輕量級 bootstrap 上下文：

```bash
openclaw cron edit <job-id> --light-context
```

發佈到特定頻道：

```bash
openclaw cron edit <job-id> --announce --channel slack --to "channel:C1234567890"
```

建立具有輕量級 bootstrap 上下文的隔離工作：

```bash
openclaw cron add \
  --name "Lightweight morning brief" \
  --cron "0 7 * * *" \
  --session isolated \
  --message "Summarize overnight updates." \
  --light-context \
  --no-deliver
```

`--light-context` 僅適用於隔離的 agent-turn 工作。對於 cron 執行，輕量級模式會將 bootstrap 上下文保持空白，而不是注入完整的工作區 bootstrap 集合。

傳遞所有權提示：

- 隔離的 cron 聊天傳遞是共用的。當聊天路由可用時，Agent 可以使用
  `message` 工具直接傳送。
- `announce` 僅在 Agent 未直接傳送至解析目標時，才會後援傳送最終回覆。`webhook` 會將完成的 payload 發佈至 URL。
  `none` 會停用 runner 後援傳遞。

## 常見管理指令

手動執行：

```bash
openclaw cron list
openclaw cron show <job-id>
openclaw cron run <job-id>
openclaw cron run <job-id> --due
openclaw cron runs --id <job-id> --limit 50
```

`cron runs` 項目包含傳遞診斷資訊，內含預期的 cron 目標、
解析目標、message-tool 傳送、後援使用以及已傳遞狀態。

Agent/階段會話重新指定目標：

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

失敗傳遞提示：

- 隔離工作支援 `delivery.failureDestination`。
- Main-session 工作只有在主要傳遞模式為 `webhook` 時，才能使用 `delivery.failureDestination`。
- 如果您未設定任何失敗目的地且工作已發佈至頻道，失敗通知將重複使用相同的發佈目標。
