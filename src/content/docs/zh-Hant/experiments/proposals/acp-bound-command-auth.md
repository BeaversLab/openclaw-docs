---
summary: "提案：ACP 綁定對話的長期指令授權模型"
read_when:
  - Designing native command auth behavior in Telegram/Discord ACP-bound channels/topics
title: "ACP 綁定指令授權（提案）"
---

# ACP 綁定指令授權（提案）

狀態：已提案，**尚未實作**。

本文件描述了 ACP 綁定對話中原生指令的長期授權模型。這是一項實驗性提案，並不會取代當前的正式運作行為。

若要了解已實作的行為，請閱讀以下來源與測試：

- `src/telegram/bot-native-commands.ts`
- `src/discord/monitor/native-command.ts`
- `src/auto-reply/reply/commands-core.ts`

## 問題

目前我們有特定指令的檢查（例如 `/new` 和 `/reset`），即使在允許清單為空時，這些檢查也需在 ACP 綁定的頻道/主題中運作。這解決了當前的使用者體驗痛點，但基於指令名稱的例外情況無法擴展。

## 長期規劃

將指令授權從特定的處理器邏輯移至指令元資料以及共用的策略評估器。

### 1) 將授權策略元資料新增至指令定義

每個指令定義都應宣告一個授權策略。範例結構：

```ts
type CommandAuthPolicy =
  | { mode: "owner_or_allowlist" } // default, current strict behavior
  | { mode: "bound_acp_or_owner_or_allowlist" } // allow in explicitly bound ACP conversations
  | { mode: "owner_only" };
```

`/new` 和 `/reset` 將會使用 `bound_acp_or_owner_or_allowlist`。
大多數其他指令將維持為 `owner_or_allowlist`。

### 2) 跨頻道共用一個評估器

引入一個輔助函式，使用以下方式評估指令授權：

- 指令策略元資料
- 發送者授權狀態
- 已解析的對話綁定狀態

Telegram 和 Discord 的原生處理器都應該呼叫同一個輔助函式，以避免行為不一致。

### 3) 使用綁定匹配 作為繞過邊界

當策略允許綁定 ACP 繞過時，僅在當前對話已解析出設定的綁定匹配時才授權（而不僅僅是因為目前的工作階段金鑰看起來像 ACP）。

這使邊界保持明確，並盡量減少意外擴大。

## 為何這樣更好

- 可擴展至未來的指令，無需新增更多基於指令名稱的條件判斷。
- 在頻道之間保持行為一致。
- 透過要求明確的綁定匹配來維持當前的安全模型。
- 將允許清單視為可選的強化措施，而非普遍要求。

## 推出計畫（未來）

1. 將命令授權政策欄位新增到命令註冊類型和命令資料中。
2. 實作共享評估器並遷移 Telegram + Discord 原生處理器。
3. 將 `/new` 和 `/reset` 移至元資料驅動的政策。
4. 針對每種政策模式和通道介面新增測試。

## 非目標

- 本提案不會改變 ACP 會話生命週期行為。
- 本提案不要求所有 ACP 綁定命令都使用允許清單。
- 本提案不會改變現有的路由綁定語意。

## 注意

本提案故意採用增量方式，不會刪除或取代現有的實驗文件。
