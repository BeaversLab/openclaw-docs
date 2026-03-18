---
summary: "提案：ACP 繫結對話中長期命令授權模型"
read_when:
  - Designing native command auth behavior in Telegram/Discord ACP-bound channels/topics
title: "ACP 繫結命令授權（提案）"
---

# ACP 繫結命令授權（提案）

狀態：已提案，**尚未實作**。

本文說明 ACP 繫結對話中原生命令的長期授權模型。這是一項實驗提案，並不會取代當前的正式運作行為。

關於已實作的行為，請閱讀以下原始碼與測試：

- `src/telegram/bot-native-commands.ts`
- `src/discord/monitor/native-command.ts`
- `src/auto-reply/reply/commands-core.ts`

## 問題

目前我們有特定命令的檢查（例如 `/new` 和 `/reset`），需要
在 ACP 繫結頻道/主題中運作，即使允許清單為空。這解決了當前的使用者體驗問題，但基於命令名稱的例外情況無法擴展。

## 長期規劃

將命令授權從特設的處理器邏輯移至命令元資料與共用
原則評估器。

### 1) 將授權原則元資料新增至命令定義

每個命令定義都應宣告一個授權原則。範例結構：

```ts
type CommandAuthPolicy =
  | { mode: "owner_or_allowlist" } // default, current strict behavior
  | { mode: "bound_acp_or_owner_or_allowlist" } // allow in explicitly bound ACP conversations
  | { mode: "owner_only" };
```

`/new` 和 `/reset` 將會使用 `bound_acp_or_owner_or_allowlist`。
大多數其他命令將維持 `owner_or_allowlist`。

### 2) 在頻道間共用一個評估器

引入一個輔助函式，使用以下方式評估命令授權：

- 命令原則元資料
- 傳送者授權狀態
- 解析後的對話繫結狀態

Telegram 和 Discord 原生處理器都應該呼叫相同的輔助函式，以避免
行為差異。

### 3) 使用繫結匹配作為略過邊界

當原則允許略過繫結的 ACP 時，僅在當前對話解析出設定的繫結
符合時才授權（不僅僅是因為當前
會話金鑰看起來像 ACP）。

這可以保持邊界明確，並最大程度減少意外擴大範圍。

## 為何這樣更好

- 可擴展至未來的命令，無需新增更多基於命令名稱的條件判斷。
- 保持跨頻道的行為一致性。
- 透過要求明確的繫結符合，維持當前的安全模型。
- 讓允許清單成為可選的強化措施，而非普遍要求。

## 推出計畫（未來）

1. Add command auth policy field to command registry types and command data.
2. Implement shared evaluator and migrate Telegram + Discord native handlers.
3. Move `/new` and `/reset` to metadata-driven policy.
4. Add tests per policy mode and channel surface.

## Non-goals

- This proposal does not change ACP session lifecycle behavior.
- This proposal does not require allowlists for all ACP-bound commands.
- This proposal does not change existing route binding semantics.

## Note

This proposal is intentionally additive and does not delete or replace existing
experiments documents.

import footerZhHant from "/components/footer/zh-Hant.mdx";

<footerZhHant />
