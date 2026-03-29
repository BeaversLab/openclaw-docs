---
summary: "`openclaw cron` （排程和執行背景工作）的 CLI 參考"
read_when:
  - You want scheduled jobs and wakeups
  - You’re debugging cron execution and logs
title: "cron"
---

# `openclaw cron`

管理 Gateway 排程器的 cron 工作。

相關：

- Cron 工作：[Cron jobs](/en/automation/cron-jobs)

提示：執行 `openclaw cron --help` 以取得完整的命令介面。

注意：隔離的 `cron add` 工作預設為 `--announce` 傳遞。請使用 `--no-deliver` 將輸出保持在內部。`--deliver` 仍作為 `--announce` 的已棄用別名。

注意：單次（`--at`）工作預設會在成功後刪除。請使用 `--keep-after-run` 將其保留。

注意：對於單次 CLI 工作，除非您同時傳遞 `--tz <iana>`（會將該本地時間解譯為給定的時區），否則無時區偏移的 `--at` 日期時間會被視為 UTC。

注意：週期性工作現在會在連續錯誤後使用指數退避重試（30 秒 → 1 分鐘 → 5 分鐘 → 15 分鐘 → 60 分鐘），然後在下次成功執行後恢復正常排程。

注意：`openclaw cron run` 現在會在手動執行排入佇列後立即返回。成功的回應包含 `{ ok: true, enqueued: true, runId }`；請使用 `openclaw cron runs --id <job-id>` 來追蹤最終結果。

注意：保留/修剪是在設定中控制的：

- `cron.sessionRetention`（預設為 `24h`）會修剪已完成的隔離執行階段。
- `cron.runLog.maxBytes` + `cron.runLog.keepLines` 會修剪 `~/.openclaw/cron/runs/<jobId>.jsonl`。

升級注意：如果您擁有來自目前傳遞/儲存格式之前的舊 cron 工作，請執行 `openclaw doctor --fix`。Doctor 現在會正規化舊版 cron 欄位（`jobId`、`schedule.cron`、頂層傳遞欄位、payload `provider` 傳遞別名），並在配置 `cron.webhook` 時將簡單的 `notify: true` webhook 退回工作遷移為明確的 webhook 傳遞。

## 常見編輯

在不變更訊息的情況下更新傳遞設定：

```bash
openclaw cron edit <job-id> --announce --channel telegram --to "123456789"
```

停用隔離工作的傳遞功能：

```bash
openclaw cron edit <job-id> --no-deliver
```

為隔離工作啟用輕量級啟動上下文：

```bash
openclaw cron edit <job-id> --light-context
```

向特定頻道發布公告：

```bash
openclaw cron edit <job-id> --announce --channel slack --to "channel:C1234567890"
```

建立具有輕量級啟動上下文的隔離工作：

```bash
openclaw cron add \
  --name "Lightweight morning brief" \
  --cron "0 7 * * *" \
  --session isolated \
  --message "Summarize overnight updates." \
  --light-context \
  --no-deliver
```

`--light-context` 僅適用於隔離的 agent-turn 工作。對於 cron 執行，輕量級模式會讓啟動上下文保持空白，而不會注入完整的 workspace 啟動集。
