---
summary: "對 cron 和 heartbeat 排程與遞送進行疑難排解"
read_when:
  - Cron did not run
  - Cron ran but no message was delivered
  - Heartbeat seems silent or skipped
title: "Automation Troubleshooting"
---

# Automation troubleshooting

請使用此頁面處理排程器和遞送問題 (`cron` + `heartbeat`)。

## Command ladder

```exec
openclaw status
openclaw gateway status
openclaw logs --follow
openclaw doctor
openclaw channels status --probe
```

然後執行自動化檢查：

```exec
openclaw cron status
openclaw cron list
openclaw system heartbeat last
```

## Cron not firing

```exec
openclaw cron status
openclaw cron list
openclaw cron runs --id <jobId> --limit 20
openclaw logs --follow
```

正常的輸出看起來像：

- `cron status` 回報已啟用，且有一個未來的 `nextWakeAtMs`。
- Job 已啟用且具有有效的排程/時區。
- `cron runs` 顯示 `ok` 或明確的跳過原因。

常見特徵：

- `cron: scheduler disabled; jobs will not run automatically` → 在 config/env 中停用了 cron。
- `cron: timer tick failed` → scheduler tick 當機；請檢查周圍的堆疊/日誌內容。
- 執行輸出中出現 `reason: not-due` → 手動執行時未呼叫 `--force` 且工作尚未到期。

## Cron 已觸發但未發送

```exec
openclaw cron runs --id <jobId> --limit 20
openclaw cron list
openclaw channels status --probe
openclaw logs --follow
```

正常的輸出如下所示：

- 執行狀態為 `ok`。
- 已為隔離工作設定發送模式/目標。
- 通道探測回報目標通道已連線。

常見特徵：

- 執行成功但發送模式為 `none` → 預期不會有外部訊息。
- 發送目標遺失/無效 (`channel`/`to`) → 內部執行可能成功，但會跳過發送。
- 通道驗證錯誤 (`unauthorized`, `missing_scope`, `Forbidden`) → 發送被通道憑證/權限封鎖。

## 心跳被抑制或跳過

```exec
openclaw system heartbeat last
openclaw logs --follow
openclaw config get agents.defaults.heartbeat
openclaw channels status --probe
```

正常的輸出如下所示：

- 心跳已啟用且間隔不為零。
- 最後一次心跳結果為 `ran`（或已理解跳過原因）。

常見特徵：

- `heartbeat skipped` 搭配 `reason=quiet-hours` → 超出 `activeHours`。
- `requests-in-flight` → 主通道忙碌；心跳已延遲。
- `empty-heartbeat-file` → 間隔心跳已跳過，因為 `HEARTBEAT.md` 沒有可執行內容，且沒有已標記的 cron 事件在佇列中。
- `alerts-disabled` → 可見性設定隱藏了外寄心跳訊息。

## 時區與 activeHours 注意事項

```exec
openclaw config get agents.defaults.heartbeat.activeHours
openclaw config get agents.defaults.heartbeat.activeHours.timezone
openclaw config get agents.defaults.userTimezone || echo "agents.defaults.userTimezone not set"
openclaw cron list
openclaw logs --follow
```

快速規則：

- `Config path not found: agents.defaults.userTimezone` 表示金鑰未設定；心跳會回退到主機時區（若設定則為 `activeHours.timezone`）。
- 未指定 `--tz` 的 Cron 使用閘道主機時區。
- 心跳 `activeHours` 使用設定的時區解析方式（`user`、`local` 或明確的 IANA tz）。
- 對於 cron `at` 排程，沒有時區的 ISO 時間戳會被視為 UTC。

常見跡象：

- 主機時區變更後，工作在錯誤的牆上時鐘時間執行。
- 心跳在您的白天總是被跳過，因為 `activeHours.timezone` 錯誤。

相關：

- [/automation/cron-jobs](/zh-Hant/automation/cron-jobs)
- [/gateway/heartbeat](/zh-Hant/gateway/heartbeat)
- [/automation/cron-vs-heartbeat](/zh-Hant/automation/cron-vs-heartbeat)
- [/concepts/timezone](/zh-Hant/concepts/timezone)
