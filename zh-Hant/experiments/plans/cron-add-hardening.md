---
summary: "加強 cron.add 輸入處理，對齊架構，並改善 cron UI/代理工具"
owner: "openclaw"
status: "complete"
last_updated: "2026-01-05"
title: "Cron Add Hardening"
---

# Cron Add Hardening & Schema Alignment

## 背景

最近的 gateway 日誌顯示，由於無效參數（缺少 `sessionTarget`、`wakeMode`、`payload` 以及格式錯誤的 `schedule`），`cron.add` 失敗重複出現。這表明至少有一個客戶端（可能是代理工具呼叫路徑）正在發送被包裹或部分指定的 job 載荷。另外，TypeScript、gateway schema、CLI 標誌和 UI 表單類型中的 cron provider 列舉存在不一致，此外 `cron.status` 的 UI 不匹配（預期 `jobCount` 但 gateway 返回 `jobs`）。

## 目標

- 透過正規化常見的包裹載荷並推斷缺少的 `kind` 欄位，來停止 `cron.add` INVALID_REQUEST 垃圾訊息。
- 對齊 gateway schema、cron types、CLI 文件和 UI 表單中的 cron provider 列表。
- 讓代理 cron 工具 schema 更明確，以便 LLM 產生正確的 job 載荷。
- 修復 Control UI cron 狀態 job 計數顯示。
- 新增測試以涵蓋正規化和工具行為。

## 非目標

- 變更 cron 排程語意或 job 執行行為。
- 新增新的排程種類或 cron 表達式解析。
- 除了必要的欄位修復外，全面改造 cron 的 UI/UX。

## 調查結果（現有差距）

- gateway 中的 `CronPayloadSchema` 排除了 `signal` + `imessage`，而 TS 類型包含了它們。
- Control UI CronStatus 預期 `jobCount`，但 gateway 返回 `jobs`。
- 代理 cron 工具 schema 允許任意的 `job` 物件，導致產生格式錯誤的輸入。
- Gateway 嚴格驗證 `cron.add` 且不進行正規化，因此被包裹的載荷會失敗。

## 變更內容

- `cron.add` 和 `cron.update` 現在會對常見的包裝形狀進行正規化，並推斷缺失的 `kind` 欄位。
- Agent cron 工具架構與 Gateway 架構相符，這減少了無效的 Payload。
- Provider 列舉已對齊 Gateway、CLI、UI 和 macOS 選擇器。
- Control UI 使用 Gateway 的 `jobs` 計數欄位來顯示狀態。

## 目前行為

- **正規化：** 被包裝的 `data`/`job` Payload 會被解包；在安全的情況下會推斷 `schedule.kind` 和 `payload.kind`。
- **預設值：** 當缺失時，會為 `wakeMode` 和 `sessionTarget` 套用安全的預設值。
- **提供者：** Discord/Slack/Signal/iMessage 現在在 CLI/UI 中一致地呈現。

請參閱 [Cron jobs](/zh-Hant/automation/cron-jobs) 以了解正規化的形狀和範例。

## 驗證

- 監看 Gateway 日誌中減少的 `cron.add` INVALID_REQUEST 錯誤。
- 確認 Control UI cron 狀態在重新整理後顯示工作計數。

## 選用後續追蹤

- 手動 Control UI 測試：針對每個提供者新增一個 cron 工作並驗證狀態工作計數。

## 待解決問題

- `cron.add` 是否應接受來自用戶端的明確 `state` (目前架構不允許)？
- 我們是否應允許 `webchat` 作為明確的傳遞提供者 (目前在傳遞解析中被過濾)？

import footerZhHant from "/components/footer/zh-Hant.mdx";

<footerZhHant />
