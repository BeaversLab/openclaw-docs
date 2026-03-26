---
summary: "提案：ACP 綁定對話的長期指令授權模型"
read_when:
  - Designing native command auth behavior in Telegram/Discord ACP-bound channels/topics
title: "ACP 綁定指令授權（提案）"
---

# ACP 綁定指令授權（提案）

狀態：已提案，**尚未實作**。

本文件描述了 ACP 綁定對話中原生指令的長期授權模型。這是一個實驗性提案，並不取代當前的生產環境行為。

關於已實作的行為，請閱讀以下原始碼與測試：

- `src/telegram/bot-native-commands.ts`
- `src/discord/monitor/native-command.ts`
- `src/auto-reply/reply/commands-core.ts`

## 問題

目前我們有特定指令的檢查（例如 `/new` 和 `/reset`），
需要在綁定 ACP 的頻道/主題中運作，即使允許清單是空的。
這解決了當前的 UX 痛點，但基於指令名稱的例外情況無法有效擴展。

## 長期架構

將指令授權從臨時的處理程序邏輯移至指令元資料以及
共用的原則評估器。

### 1) 將授權原則元資料新增至指令定義

每個指令定義都應宣告一個授權原則。範例結構：

```ts
type CommandAuthPolicy =
  | { mode: "owner_or_allowlist" } // default, current strict behavior
  | { mode: "bound_acp_or_owner_or_allowlist" } // allow in explicitly bound ACP conversations
  | { mode: "owner_only" };
```

`/new` 和 `/reset` 將使用 `bound_acp_or_owner_or_allowlist`。
大多數其他指令將維持 `owner_or_allowlist`。

### 2) 在跨頻道之間共用一個評估器

引入一個輔助工具，使用以下方式評估指令授權：

- 指令原則元資料
- 發送者授權狀態
- 已解析的對話綁定狀態

Telegram 和 Discord 的原生處理程序都應該呼叫同一個 helper 以避免行為偏離。

### 3) 使用 binding-match 作為繞過邊界

當策略允許綁定 ACP 繞過時，僅在為當前對話解析了配置的 binding match 時才授權（而不僅僅是因為當前 session key 看起來像 ACP）。

這保持了邊界的明確性，並最大限度地減少意外的擴大。

## 為什麼這樣更好

- 擴展到未來的命令，而無需添加更多基於命令名稱的條件判斷。
- 在不同通道之間保持行為一致。
- 通過要求明確的 binding match，保留了當前的安全模型。
- 將允許列表保留為可選的加固措施，而不是通用要求。

## 推出計劃（未來）

1. 將命令授權策略字段添加到命令註冊表類型和命令數據中。
2. 實施共享評估器並遷移 Telegram + Discord 原生處理程序。
3. 將 `/new` 和 `/reset` 移至元數據驅動策略。
4. 針對每種策略模式和通道介面新增測試。

## 非目標

- 此提案不改變 ACP 會話生命週期行為。
- 此提案不要求所有 ACP 綁定命令都有允許列表。
- 此提案不改變現有的路由綁定語義。

## 備註

此提案旨在增補現有功能，不會刪除或取代現有的
實驗文件。

import footerZhHant from "/components/footer/zh-Hant.mdx";

<footerZhHant />
