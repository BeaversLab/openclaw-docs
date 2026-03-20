---
summary: "CLI reference for `openclaw cron` (schedule and run background jobs)"
read_when:
  - You want scheduled jobs and wakeups
  - You’re debugging cron execution and logs
title: "cron"
---

# `openclaw cron`

Manage cron jobs for the Gateway scheduler.

Related:

- Cron jobs: [Cron jobs](/zh-Hant/automation/cron-jobs)

Tip: run `openclaw cron --help` for the full command surface.

Note: isolated `cron add` jobs default to `--announce` delivery. Use `--no-deliver` to keep
output internal. `--deliver` remains as a deprecated alias for `--announce`.

Note: one-shot (`--at`) jobs delete after success by default. Use `--keep-after-run` to keep them.

注意：循環作業現在會在連續錯誤後使用指數退避重試（30秒 → 1分鐘 → 5分鐘 → 15分鐘 → 60分鐘），然後在下次成功執行後恢復正常排程。

注意：`openclaw cron run` 現在會在手動執行排入佇列後立即返回。成功的回應包含 `{ ok: true, enqueued: true, runId }`；請使用 `openclaw cron runs --id <job-id>` 來追蹤最終結果。

注意：保留/修剪是在配置中控制的：

- `cron.sessionRetention`（預設為 `24h`）會修剪已完成的獨立執行階段。
- `cron.runLog.maxBytes` + `cron.runLog.keepLines` 會修剪 `~/.openclaw/cron/runs/<jobId>.jsonl`。

升級說明：如果您擁有來自目前傳送/儲存格式之前的舊版 cron 工作，請執行 `openclaw doctor --fix`。Doctor 現在會標準化舊版 cron 欄位（`jobId`、`schedule.cron`、頂層傳送欄位、payload `provider` 傳送別名），並在設定 `cron.webhook` 時，將簡單的 `notify: true` webhook 備送工作遷移至明確的 webhook 傳送。

## 常見編輯

更新傳送設定而不變更訊息：

```bash
openclaw cron edit <job-id> --announce --channel telegram --to "123456789"
```

停用獨立工作的傳送：

```bash
openclaw cron edit <job-id> --no-deliver
```

為獨立工作啟用輕量級啟動內容 (bootstrap context)：

```bash
openclaw cron edit <job-id> --light-context
```

宣布到特定頻道：

```bash
openclaw cron edit <job-id> --announce --channel slack --to "channel:C1234567890"
```

建立具有輕量級啟動內容 (bootstrap context) 的獨立工作：

```bash
openclaw cron add \
  --name "Lightweight morning brief" \
  --cron "0 7 * * *" \
  --session isolated \
  --message "Summarize overnight updates." \
  --light-context \
  --no-deliver
```

`--light-context` 僅適用於隔離的 agent-turn 任務。對於 cron 執行，輕量級模式會將 bootstrap 內容保持為空，而不是注入完整的 workspace bootstrap 集合。

import en from "/components/footer/en.mdx";

<en />
