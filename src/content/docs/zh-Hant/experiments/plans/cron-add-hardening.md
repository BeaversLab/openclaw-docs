---
summary: "加強 cron.add 輸入處理，對齊架構並改善 cron UI/代理程式工具"
owner: "openclaw"
status: "complete"
last_updated: "2026-01-05"
title: "Cron Add Hardening"
---

# Cron Add Hardening & Schema Alignment

## Context

最近的閘道日誌顯示重複出現 `cron.add` 失敗，並伴隨無效參數（缺少 `sessionTarget`、`wakeMode`、`payload`，以及格式錯誤的 `schedule`）。這表示至少有一個客戶端（可能是代理程式工具呼叫路徑）正在傳送被包裝或部分指定的作業承載。此外，TypeScript、閘道架構、CLI 標誌和 UI 表單類型中的 cron 提供者列舉存在差異，加上 `cron.status` 的 UI 不匹配（預期為 `jobCount`，但閘道回傳 `jobs`）。

## Goals

- 透過正規化常見的包裝承載並推斷缺少的 `kind` 欄位，停止 `cron.add` INVALID_REQUEST 垃圾訊息。
- 對齊閘道架構、cron 類型、CLI 文件和 UI 表單之間的 cron 提供者清單。
- 明確指定代理程式 cron 工具架構，以便 LLM 產生正確的作業承載。
- 修正 Control UI 的 cron 狀態作業計數顯示。
- 新增測試以涵蓋正規化和工具行為。

## Non-goals

- 變更 cron 排程語意或作業執行行為。
- 新增新的排程種類或 cron 表達式解析。
- 除了必要的欄位修正之外，徹底改造 cron 的 UI/UX。

## Findings (current gaps)

- 閘道中的 `CronPayloadSchema` 排除了 `signal` 和 `imessage`，而 TS 類型則包含了它們。
- Control UI 的 CronStatus 預期 `jobCount`，但閘道回傳 `jobs`。
- 代理程式 cron 工具架構允許任意的 `job` 物件，導致格式錯誤的輸入。
- 閘道嚴格驗證 `cron.add` 而不進行正規化，因此被包裝的承載會失敗。

## 變更內容

- `cron.add` 和 `cron.update` 現在會標準化常見的包裝形狀，並推斷缺失的 `kind` 欄位。
- Agent cron 工具的架構符合 gateway 的架構，這減少了無效的 payload。
- Provider 列舉在 gateway、CLI、UI 和 macOS 選擇器之間保持一致。
- Control UI 使用 gateway 的 `jobs` 計數欄位來顯示狀態。

## 目前行為

- **標準化：** 被包裝的 `data`/`job` payload 會被解包；當安全時，`schedule.kind` 和 `payload.kind` 會被推斷出來。
- **預設值：** 當缺少 `wakeMode` 和 `sessionTarget` 時，會套用安全的預設值。
- **提供者：** Discord/Slack/Signal/iMessage 現在在 CLI/UI 之間一致地呈現。

請參閱 [Cron jobs](/zh-Hant/automation/cron-jobs) 以了解標準化的形狀和範例。

## 驗證

- 觀察 gateway 日誌，看 `cron.add` INVALID_REQUEST 錯誤是否減少。
- 確認 Control UI cron 狀態在重新整理後顯示工作計數。

## 選擇性後續跟進

- 手動 Control UI 煙霧測試：為每個 provider 新增一個 cron 工作並驗證狀態工作計數。

## 未解決的問題

- `cron.add` 是否應該接受來自用戶端的明確 `state`（目前架構不允許）？
- 我們是否應該允許 `webchat` 作為明確的傳遞提供者（目前在傳遞解析中被過濾掉）？
