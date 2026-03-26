---
summary: "CLI 參考資料，用於 `openclaw cron` (排程並執行背景作業)"
read_when:
  - You want scheduled jobs and wakeups
  - You’re debugging cron execution and logs
title: "cron"
---

# `openclaw cron`

管理 Gateway 排程器的 cron 作業。

相關連結：

- Cron 作業：[Cron 作業](/zh-Hant/automation/cron-jobs)

提示：執行 `openclaw cron --help` 以查看完整的指令介面。

注意：隔離的 `cron add` 作業預設為 `--announce` 傳遞。使用 `--no-deliver` 保持
輸出在內部。`--deliver` 仍是 `--announce` 的已淘汰別名。

注意：單次 (`--at`) 作業預設在成功後刪除。使用 `--keep-after-run` 予以保留。

注意：週期性任務在連續發生錯誤後現在使用指數退避重試（30s → 1m → 5m → 15m → 60m），然後在下一次成功執行後恢復正常排程。

注意：`openclaw cron run` 現在會在手動執行加入佇列後立即回傳。成功的回應包含 `{ ok: true, enqueued: true, runId }`；請使用 `openclaw cron runs --id <job-id>` 來追蹤最終結果。

注意：保留/修剪是透過配置控制的：

- `cron.sessionRetention`（預設 `24h`）會修剪已完成的獨立執行工作階段。
- `cron.runLog.maxBytes` + `cron.runLog.keepLines` 會修剪 `~/.openclaw/cron/runs/<jobId>.jsonl`。

升級說明：如果您擁有當前傳遞/儲存格式之前的舊版 cron 工作，請執行 `openclaw doctor --fix`。Doctor 現在會正規化舊版 cron 欄位（`jobId`、`schedule.cron`、頂層傳遞欄位、payload `provider` 傳遞別名），並在設定 `cron.webhook` 時將簡單的 `notify: true` webhook 後備工作遷移至明確的 webhook 傳遞。

## 常見編輯

更新傳遞設定而不變更訊息：

```bash
openclaw cron edit <job-id> --announce --channel telegram --to "123456789"
```

停用隔離工作的傳遞：

```bash
openclaw cron edit <job-id> --no-deliver
```

為隔離工作啟用輕量級啟動語境：

```bash
openclaw cron edit <job-id> --light-context
```

發佈至特定頻道：

```bash
openclaw cron edit <job-id> --announce --channel slack --to "channel:C1234567890"
```

建立具有輕量級啟動語境的隔離工作：

```bash
openclaw cron add \
  --name "Lightweight morning brief" \
  --cron "0 7 * * *" \
  --session isolated \
  --message "Summarize overnight updates." \
  --light-context \
  --no-deliver
```

`--light-context` 僅適用於獨立的代理輪次工作。對於 cron 執行，輕量級模式會保持引導程序上下文為空，而不是注入完整的工作區引導程序集合。

import footerZhHant from "/components/footer/zh-Hant.mdx";

<footerZhHant />
