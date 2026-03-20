---
summary: "強化 cron.add 輸入處理，對齊架構，並改善 cron UI/agent 工具"
owner: "openclaw"
status: "complete"
last_updated: "2026-01-05"
title: "Cron Add Hardening"
---

# Cron Add Hardening & Schema Alignment

## 背景

最近的 gateway 日誌顯示重複出現 `cron.add` 失敗，並伴隨無效參數（缺少 `sessionTarget`、`wakeMode`、`payload` 以及格式錯誤的 `schedule`）。這表明至少有一個客戶端（可能是 agent 工具呼叫路徑）正在發送被包裹或部分指定的 job payloads。此外，TypeScript、gateway schema、CLI 標誌和 UI 表單類型中的 cron provider 枚舉存在差異，此外 `cron.status` 的 UI 也不匹配（預期是 `jobCount`，但 gateway 返回 `jobs`）。

## 目標

- 透過正規化常見的 wrapper payloads 並推斷缺失的 `kind` 欄位，停止 `cron.add` INVALID_REQUEST 垃圾訊息。
- 對齊 gateway schema、cron types、CLI 文件和 UI 表單中的 cron provider 列表。
- 明確制定 agent cron tool schema，以便 LLM 產生正確的 job payloads。
- 修復 Control UI cron status 的 job 計數顯示。
- 新增測試以涵蓋正規化和工具行為。

## 非目標

- 變更 cron 排程語意或 job 執行行為。
- 新增新的排程類型或 cron expression 解析。
- 除了必要的欄位修復外，全面改革 cron 的 UI/UX。

## 發現（現有缺口）

- Gateway 中的 `CronPayloadSchema` 排除了 `signal` + `imessage`，而 TS types 則包含它們。
- Control UI CronStatus 預期 `jobCount`，但 gateway 返回 `jobs`。
- Agent cron tool schema 允許任意的 `job` 物件，導致格式錯誤的輸入。
- Gateway 嚴格驗證 `cron.add` 而不進行正規化，因此被包裹的 payloads 會失敗。

## 變更內容

- `cron.add` 和 `cron.update` 現在會正規化常見的 wrapper 形狀並推斷缺失的 `kind` 欄位。
- Agent cron 工具架構與 gateway 架構相符，減少了無效的 payload。
- Provider 列舉在 gateway、CLI、UI 和 macOS 選擇器之間已保持一致。
- Control UI 使用 gateway 的 `jobs` 欄位來顯示狀態。

## 目前行為

- **正規化：** 已包裝的 `data`/`job` payload 會被解包；在安全的情況下會推斷 `schedule.kind` 和 `payload.kind`。
- **預設值：** 當缺少 `wakeMode` 和 `sessionTarget` 時，會套用安全的預設值。
- **Providers：** Discord/Slack/Signal/iMessage 現在在 CLI/UI 中一致地呈現。

請參閱 [Cron jobs](/zh-Hant/automation/cron-jobs) 以了解正規化的結構和範例。

## 驗證

- 觀察 gateway 日誌，確認 `cron.add` INVALID_REQUEST 錯誤是否減少。
- 確認 Control UI cron 狀態在重新整理後會顯示工作計數。

## 選擇性後續工作

- Control UI 手動冒煙測試：針對每個 provider 新增 cron 工作並驗證狀態工作計數。

## 開放問題

- `cron.add` 是否應接受來自用戶端的明確 `state`（目前架構不允許）？
- 我們是否應允許 `webchat` 作為明確的傳遞 provider（目前在傳遞解析中會被過濾掉）？

import en from "/components/footer/en.mdx";

<en />
