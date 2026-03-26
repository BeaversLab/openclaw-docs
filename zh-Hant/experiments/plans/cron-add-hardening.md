---
summary: "加強 cron.add 輸入處理、對齊架構並改善 cron UI/代理工具"
owner: "openclaw"
status: "complete"
last_updated: "2026-01-05"
title: "Cron Add Hardening"
---

# Cron 新增強化與架構對齊

## 背景

最近的 gateway 日志顯示重複的 `cron.add` 失敗，參數無效（缺少 `sessionTarget`、`wakeMode`、`payload`，以及格式錯誤的 `schedule`）。這表明至少有一個客戶端（可能是 agent 工具呼叫路徑）正在傳送被包裝或部分指定的 job payloads。此外，TypeScript、gateway schema、CLI 標誌和 UI 表單類型中的 cron 提供者 enums 之間存在差異，並且 `cron.status` 的 UI 不匹配（期望 `jobCount`，但 gateway 傳回 `jobs`）。

## 目標

- 透過標準化常見的包裝載荷並推斷缺失的 `kind` 欄位，以停止 `cron.add` INVALID_REQUEST 垃圾訊息。
- 統一 gateway schema、cron 類型、CLI 文件和 UI 表單中的 cron 提供者清單。
- 明確定義 agent cron tool schema，以便 LLM 產生正確的 job payload。
- 修正 Control UI cron 狀態的工作計數顯示。
- 新增測試以涵蓋標準化和工具行為。

## 非目標

- 更改 cron 排程語意或工作執行行為。
- 新增新的排程種類或 cron 表達式解析。
- 除了必要的欄位修復外，徹底翻新 cron 的 UI/UX。

## 調查結果（目前的差距）

- `CronPayloadSchema` in gateway excludes `signal` + `imessage`, while TS types include them.
- Control UI CronStatus 預期 `jobCount`，但 gateway 傳回 `jobs`。
- Agent cron tool schema 允許任意的 `job` 物件，從而導致格式錯誤的輸入。
- Gateway 嚴格驗證 `cron.add` 而不進行正規化，因此包裹的 payload 會失敗。

## 變更內容

- `cron.add` 和 `cron.update` 現在會正規化常見的包裝形狀並推斷缺失的 `kind` 欄位。
- Agent cron 工具架構與 gateway 架構相符，這減少了無效的 payload。
- Provider 枚舉在 gateway、CLI、UI 和 macOS 選擇器之間保持一致。
- Control UI 使用 gateway 的 `jobs` 計數欄位來顯示狀態。

## 目前的行為

- **正規化：** 被包裝的 `data`/`job` 載荷會被解包；在安全時會推斷 `schedule.kind` 和 `payload.kind`。
- **預設值：** 當缺少 `wakeMode` 和 `sessionTarget` 時，會套用安全的預設值。
- **供應商：** Discord/Slack/Signal/iMessage 現在在 CLI/UI 中一致地顯示。

請參閱 [Cron jobs](/zh-Hant/automation/cron-jobs) 以了解標準化格式和範例。

## 驗證

- 監控 Gateway 日誌，觀察 `cron.add` INVALID_REQUEST 錯誤是否減少。
- 確認重新整理後，Control UI 的 cron 狀態會顯示工作計數。

## 選擇性後續追蹤

- 手動 Control UI 冒煙測試：依照提供者新增 cron 工作並驗證狀態工作計數。

## 開放問題

- `cron.add` 是否應接受來自客戶端的明確 `state`（目前 schema 禁止此操作）？
- 我們是否應允許將 `webchat` 作為明確的傳遞提供者（目前已在傳遞解析中被過濾）？

import footerZhHant from "/components/footer/zh-Hant.mdx";

<footerZhHant />
