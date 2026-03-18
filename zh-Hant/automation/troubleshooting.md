---
summary: "排解 cron 和 heartbeat 排程與傳送問題"
read_when:
  - Cron did not run
  - Cron ran but no message was delivered
  - Heartbeat seems silent or skipped
title: "Automation Troubleshooting"
---

# Automation troubleshooting

使用此頁面處理排程器和傳送問題 (`cron` + `heartbeat`)。

## Command ladder

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

## Cron not firing

```bash
openclaw cron status
openclaw cron list
openclaw cron runs --id <jobId> --limit 20
openclaw logs --follow
```

正常輸出看起來像：

- `cron status` 回報已啟用且未來有 `nextWakeAtMs`。
- 工作已啟用且具有有效的排程/時區。
- `cron runs` 顯示 `ok` 或明確的略過原因。

常見特徵：

- `cron: scheduler disabled; jobs will not run automatically` → 在 config/env 中停用了 cron。
- `cron: timer tick failed` → 排程器 tick 當機；請檢查周圍的堆疊/日誌內容。
- 執行輸出中的 `reason: not-due` → 在沒有 `--force` 的情況下呼叫手動執行，且工作尚未到期。

## Cron fired but no delivery

```bash
openclaw cron runs --id <jobId> --limit 20
openclaw cron list
openclaw channels status --probe
openclaw logs --follow
```

正常輸出看起來像：

- 執行狀態為 `ok`。
- 針對獨立作業設定了傳送模式/目標。
- 頻道探測回報目標頻道已連接。

常見特徵：

- 執行成功但傳送模式為 `none` → 預期不會有外部訊息。
- 傳送目標遺失/無效 (`channel`/`to`) → 執行在內部可能成功，但略過出站。
- 頻道驗證錯誤 (`unauthorized`, `missing_scope`, `Forbidden`) → 傳送被頻道憑證/權限封鎖。

## Heartbeat suppressed or skipped

```bash
openclaw system heartbeat last
openclaw logs --follow
openclaw config get agents.defaults.heartbeat
openclaw channels status --probe
```

正常輸出看起來像：

- 已啟用具有非零間隔的 Heartbeat。
- 最後一次 heartbeat 結果為 `ran` (或了解略過原因)。

常見特徵：

- `heartbeat skipped` 伴隨 `reason=quiet-hours` → 在 `activeHours` 之外。
- `requests-in-flight` → 主通道忙碌；heartbeat 延後。
- `empty-heartbeat-file` → 間隔 heartbeat 被略過，因為 `HEARTBEAT.md` 沒有可執行的內容，且沒有標記的 cron 事件在佇列中。
- `alerts-disabled` → 可見度設定會抑制傳出的心跳訊息。

## 時區與 activeHours 的注意事項

```bash
openclaw config get agents.defaults.heartbeat.activeHours
openclaw config get agents.defaults.heartbeat.activeHours.timezone
openclaw config get agents.defaults.userTimezone || echo "agents.defaults.userTimezone not set"
openclaw cron list
openclaw logs --follow
```

快速規則：

- `Config path not found: agents.defaults.userTimezone` 表示該鍵未設定；心跳會回退至主機時區（或如果設定了則使用 `activeHours.timezone`）。
- 沒有 `--tz` 的 Cron 會使用閘道主機時區。
- 心跳 `activeHours` 使用已設定的時區解析方式（`user`、`local` 或明確的 IANA tz）。
- 不帶時區的 ISO 時間戳在 cron `at` 排程中會被視為 UTC。

常見情況：

- 主機時區變更後，工作在錯誤的時鐘時間執行。
- 心跳總是在您的白天被跳過，因為 `activeHours.timezone` 錯誤。

相關連結：

- [/automation/cron-jobs](/zh-Hant/automation/cron-jobs)
- [/gateway/heartbeat](/zh-Hant/gateway/heartbeat)
- [/automation/cron-vs-heartbeat](/zh-Hant/automation/cron-vs-heartbeat)
- [/concepts/timezone](/zh-Hant/concepts/timezone)

import footerZhHant from "/components/footer/zh-Hant.mdx";

<footerZhHant />
