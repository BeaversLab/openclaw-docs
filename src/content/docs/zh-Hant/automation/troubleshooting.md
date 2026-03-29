---
summary: "對 cron 與 heartbeat 的排程及傳遞進行疑難排解"
read_when:
  - Cron did not run
  - Cron ran but no message was delivered
  - Heartbeat seems silent or skipped
title: "自動化疑難排解"
---

# 自動化疑難排解

使用此頁面處理排程器與傳遞問題 (`cron` + `heartbeat`)。

## 指令階梯

```bash
openclaw status
openclaw gateway status
openclaw logs --follow
openclaw doctor
openclaw channels status --probe
```

然後執行自動化檢查：

```bash
openclaw cron status
openclaw cron list
openclaw system heartbeat last
```

## Cron 未觸發

```bash
openclaw cron status
openclaw cron list
openclaw cron runs --id <jobId> --limit 20
openclaw logs --follow
```

正常的輸出如下：

- `cron status` 回報已啟用，且 `nextWakeAtMs` 在未來。
- Job 已啟用且有有效的排程/時區。
- `cron runs` 顯示 `ok` 或明確的略過原因。

常見特徵：

- `cron: scheduler disabled; jobs will not run automatically` → 在設定/環境中停用了 cron。
- `cron: timer tick failed` → 排程器 tick 當機；請檢查周圍的堆疊/日誌內容。
- 執行輸出中出現 `reason: not-due` → 手動執行呼叫時未帶有 `--force` 且工作尚未到期。

## Cron 已觸發但未交付

```bash
openclaw cron runs --id <jobId> --limit 20
openclaw cron list
openclaw channels status --probe
openclaw logs --follow
```

良好的輸出如下所示：

- 執行狀態為 `ok`。
- 已針對隔離工作設定交付模式/目標。
- 通道探測回報目標通道已連線。

常見特徵：

- 執行成功但交付模式為 `none` → 預期不會有外部訊息。
- 交付目標遺失/無效 (`channel`/`to`) → 執行可能在內部成功，但跳過輸出。
- 通道驗證錯誤 (`unauthorized`, `missing_scope`, `Forbidden`) → 交付被通道憑證/權限阻擋。

## 心跳被抑制或跳過

```bash
openclaw system heartbeat last
openclaw logs --follow
openclaw config get agents.defaults.heartbeat
openclaw channels status --probe
```

良好的輸出如下所示：

- 已啟用心跳且間隔不為零。
- 最後的心跳結果是 `ran`（或已知跳過原因）。

常見特徵：

- `heartbeat skipped` 搭配 `reason=quiet-hours` → 在 `activeHours` 之外。
- `requests-in-flight` → 主通道忙碌；心跳已延後。
- `empty-heartbeat-file` → 間隔心跳已跳過，因為 `HEARTBEAT.md` 沒有可執行的內容，且沒有標記的 cron 事件在佇列中。
- `alerts-disabled` → 可見性設定隱藏了外送的心跳訊息。

## 時區與 activeHours 注意事項

```bash
openclaw config get agents.defaults.heartbeat.activeHours
openclaw config get agents.defaults.heartbeat.activeHours.timezone
openclaw config get agents.defaults.userTimezone || echo "agents.defaults.userTimezone not set"
openclaw cron list
openclaw logs --follow
```

快速規則：

- `Config path not found: agents.defaults.userTimezone` 表示金鑰未設定；心跳會退回至主機時區（若設定則為 `activeHours.timezone`）。
- 沒有 `--tz` 的 Cron 會使用閘道主機時區。
- Heartbeat `activeHours` 使用設定的時區解析方式 (`user`、`local` 或明確的 IANA tz)。
- Cron `at` 排程會將沒有時區的 ISO 時間戳視為 UTC，除非您使用了 CLI `--at "<offset-less-iso>" --tz <iana>`。

常見特徵：

- 主機時區變更後，作業會在錯誤的牆上時鐘時間執行。
- Heartbeat 在您的白天總是被跳過，因為 `activeHours.timezone` 錯誤。

相關連結：

- [/automation/cron-jobs](/en/automation/cron-jobs)
- [/gateway/heartbeat](/en/gateway/heartbeat)
- [/automation/cron-vs-heartbeat](/en/automation/cron-vs-heartbeat)
- [/concepts/timezone](/en/concepts/timezone)
