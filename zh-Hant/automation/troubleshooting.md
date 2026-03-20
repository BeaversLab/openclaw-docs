---
summary: "疑難排解 cron 和 heartbeat 排程與傳遞"
read_when:
  - Cron 未執行
  - Cron 已執行但未傳遞訊息
  - Heartbeat 似乎無回應或被略過
title: "自動化疑難排解"
---

# 自動化疑難排解

使用此頁面處理排程器和傳遞問題 (`cron` + `heartbeat`)。

## 指令階梯

```bash
openclaw status
openclaw gateway status
openclaw logs --follow
openclaw doctor
openclaw channels status --probe
```

接著執行自動化檢查：

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

正常的輸出看起來像：

- `cron status` 回報已啟用且未來有一個 `nextWakeAtMs`。
- 工作已啟用且有有效的排程/時區。
- `cron runs` 顯示 `ok` 或明確的略過原因。

常見特徵：

- `cron: scheduler disabled; jobs will not run automatically` → 在 config/env 中停用了 cron。
- `cron: timer tick failed` → 排程器 tick 當機；請檢查周圍的堆疊/日誌上下文。
- 執行輸出中有 `reason: not-due` → 在未使用 `--force` 的情況下呼叫手動執行，且工作尚未到期。

## Cron 已觸發但無傳遞

```bash
openclaw cron runs --id <jobId> --limit 20
openclaw cron list
openclaw channels status --probe
openclaw logs --follow
```

正常的輸出看起來像：

- 執行狀態為 `ok`。
- 已為獨立工作設定傳遞模式/目標。
- 通道探測回報目標通道已連線。

常見特徵：

- 執行成功但傳遞模式為 `none` → 預期不會有外部訊息。
- 傳遞目標缺失/無效 (`channel`/`to`) → 執行可能在內部成功，但會略過 outbound。
- 通道驗證錯誤 (`unauthorized`, `missing_scope`, `Forbidden`) → 傳遞被通道憑證/權限阻擋。

## Heartbeat 被抑制或略過

```bash
openclaw system heartbeat last
openclaw logs --follow
openclaw config get agents.defaults.heartbeat
openclaw channels status --probe
```

正常的輸出看起來像：

- Heartbeat 已啟用且間隔不為零。
- 上一次 heartbeat 結果為 `ran` (或已理解略過原因)。

常見特徵：

- `heartbeat skipped` 且 `reason=quiet-hours` → 在 `activeHours` 之外。
- `requests-in-flight` → 主通道忙碌；heartbeat 已延遲。
- `empty-heartbeat-file` → 略過間隔 heartbeat，因為 `HEARTBEAT.md` 沒有可執行的內容，且沒有已加標籤的 cron 事件在佇列中。
- `alerts-disabled` → 可見性設置會抑制傳出的 heartbeat 訊息。

## 時區和 activeHours 注意事項

```bash
openclaw config get agents.defaults.heartbeat.activeHours
openclaw config get agents.defaults.heartbeat.activeHours.timezone
openclaw config get agents.defaults.userTimezone || echo "agents.defaults.userTimezone not set"
openclaw cron list
openclaw logs --follow
```

快速規則：

- `Config path not found: agents.defaults.userTimezone` 表示金鑰未設定；heartbeat 會回退至主機時區（或如果已設定則使用 `activeHours.timezone`）。
- 未包含 `--tz` 的 Cron 會使用閘道主機時區。
- Heartbeat `activeHours` 使用設定的時區解析方式（`user`、`local` 或明確的 IANA tz）。
- 不含時區的 ISO 時間戳記在 cron `at` 排程中會被視為 UTC。

常見特徵：

- 主機時區變更後，工作在錯誤的時鐘時間執行。
- 由於 `activeHours.timezone` 錯誤，Heartbeat 總是在您的白天被略過。

相關連結：

- [/automation/cron-jobs](/zh-Hant/automation/cron-jobs)
- [/gateway/heartbeat](/zh-Hant/gateway/heartbeat)
- [/automation/cron-vs-heartbeat](/zh-Hant/automation/cron-vs-heartbeat)
- [/concepts/timezone](/zh-Hant/concepts/timezone)

import en from "/components/footer/en.mdx";

<en />
