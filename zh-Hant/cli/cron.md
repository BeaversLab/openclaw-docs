---
summary: "用於 `openclaw cron` (排程及執行背景工作) 的 CLI 參考"
read_when:
  - You want scheduled jobs and wakeups
  - You’re debugging cron execution and logs
title: "cron"
---

# `openclaw cron`

管理 Gateway 排程器的 cron 工作。

相關連結：

- Cron 工作：[Cron jobs](/zh-Hant/automation/cron-jobs)

提示：執行 `openclaw cron --help` 以查看完整的指令介面。

注意：隔離式 `cron add` 工作預設為 `--announce` 傳送。使用 `--no-deliver` 將輸出保持在內部。`--deliver` 仍保留為 `--announce` 的已棄用別名。

注意：一次性 (`--at`) 工作在成功後會預設刪除。使用 `--keep-after-run` 予以保留。

注意：週期性工作現在會在連續錯誤後使用指數退避重試 (30s → 1m → 5m → 15m → 60m)，然後在下一次成功執行後恢復正常排程。

注意：`openclaw cron run` 現在會在手動執行排入佇列後立即返回。成功的回應包含 `{ ok: true, enqueued: true, runId }`；請使用 `openclaw cron runs --id <job-id>` 追蹤最終結果。

注意：保留/修剪是透過設定控制：

- `cron.sessionRetention` (預設 `24h`) 會修剪已完成的隔離式執行工作階段。
- `cron.runLog.maxBytes` + `cron.runLog.keepLines` 會修剪 `~/.openclaw/cron/runs/<jobId>.jsonl`。

升級提示：如果您擁有來自目前傳送/儲存格式之前的舊 cron 工作，請執行
`openclaw doctor --fix`。Doctor 現在會正規化舊版 cron 欄位 (`jobId`、`schedule.cron`、
頂層傳送欄位、payload `provider` 傳送別名)，並在設定 `cron.webhook` 時
將簡單的 `notify: true` webhook 退回工作遷移至明確的 webhook 傳送。

## 常見編輯

更新傳送設定而不變更訊息：

```bash
openclaw cron edit <job-id> --announce --channel telegram --to "123456789"
```

停用隔離式工作的傳送：

```bash
openclaw cron edit <job-id> --no-deliver
```

為隔離式工作啟用輕量級啟動內容：

```bash
openclaw cron edit <job-id> --light-context
```

發佈至特定頻道：

```bash
openclaw cron edit <job-id> --announce --channel slack --to "channel:C1234567890"
```

建立具有輕量級啟動內容的隔離式工作：

```bash
openclaw cron add \
  --name "Lightweight morning brief" \
  --cron "0 7 * * *" \
  --session isolated \
  --message "Summarize overnight updates." \
  --light-context \
  --no-deliver
```

`--light-context` 僅適用於隔離的 agent-turn 任務。對於 cron 執行，輕量級模式會將 bootstrap 內容保持為空，而不是注入完整的工作區 bootstrap 集合。

import footerZhHant from "/components/footer/zh-Hant.mdx";

<footerZhHant />
