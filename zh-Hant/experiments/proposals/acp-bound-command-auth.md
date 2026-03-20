---
summary: "提案：ACP 綁定對話的長期命令授權模型"
read_when:
  - 設計 Telegram/Discord ACP 綁定頻道/主題中的原生命令授權行為
title: "ACP 綁定命令授權（提案）"
---

# ACP 繫結命令授權（提案）

狀態：已提案，**尚未實作**。

本文檔描述了 ACP 綁定對話中原生命令的長期授權模型。這是一個實驗性提案，並不取代目前的生產環境行為。

關於已實作的行為，請閱讀以下原始碼與測試：

- `src/telegram/bot-native-commands.ts`
- `src/discord/monitor/native-command.ts`
- `src/auto-reply/reply/commands-core.ts`

## 問題

目前我們有特定命令的檢查（例如 `/new` 和 `/reset`），即使允許清單為空，這些檢查也需要在 ACP 綁定頻道/主題內運作。這解決了當前的 UX 痛點，但基於命令名稱的例外情況無法良好擴展。

## 長期規劃

將命令授權從臨時處理程式邏輯移至命令元資料以及共用的政策評估器。

### 1) 將授權原則元資料新增至命令定義

每個命令定義都應宣告一個授權原則。範例結構：

```ts
type CommandAuthPolicy =
  | { mode: "owner_or_allowlist" } // default, current strict behavior
  | { mode: "bound_acp_or_owner_or_allowlist" } // allow in explicitly bound ACP conversations
  | { mode: "owner_only" };
```

`/new` 和 `/reset` 將會使用 `bound_acp_or_owner_or_allowlist`。大多數其他命令將保持 `owner_or_allowlist`。

### 2) 在頻道間共用一個評估器

引入一個輔助函式，使用以下方式評估命令授權：

- 命令原則元資料
- 傳送者授權狀態
- 解析後的對話繫結狀態

Telegram 和 Discord 原生處理程式都應該呼叫同一個輔助函式，以避免行為差異。

### 3) 使用繫結匹配作為略過邊界

當政策允許綁定 ACP 繞過時，僅在為當前對話解析到已設定的綁定匹配時才授權（而不僅僅是因為當前會話金鑰看起來像 ACP）。

這可以保持邊界明確，並最大程度減少意外擴大範圍。

## 為何這樣更好

- 可擴展至未來的命令，無需新增更多基於命令名稱的條件判斷。
- 保持跨頻道的行為一致性。
- 透過要求明確的繫結符合，維持當前的安全模型。
- 讓允許清單成為可選的強化措施，而非普遍要求。

## 推出計畫（未來）

1. Add command auth policy field to command registry types and command data.
2. Implement shared evaluator and migrate Telegram + Discord native handlers.
3. 將 `/new` 和 `/reset` 移至由元資料驅動的政策。
4. Add tests per policy mode and channel surface.

## Non-goals

- This proposal does not change ACP session lifecycle behavior.
- This proposal does not require allowlists for all ACP-bound commands.
- This proposal does not change existing route binding semantics.

## Note

本提案特意作為增補內容，不刪除或取代現有的實驗文檔。

import footerZhHant from "/components/footer/zh-Hant.mdx";

<footerZhHant />
