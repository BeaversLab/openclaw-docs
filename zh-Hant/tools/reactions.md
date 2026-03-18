---
summary: "跨頻道共用的反應語意"
read_when:
  - Working on reactions in any channel
title: "反應"
---

# 反應工具

跨頻道共用的反應語意：

- 新增反應時必須提供 `emoji`。
- 當支援時，`emoji=""` 會移除機器人的反應。
- 當支援時，`remove: true` 會移除指定的表情符號（需要 `emoji`）。

頻道備註：

- **Discord/Slack**：空的 `emoji` 會移除訊息上所有機器人的反應；`remove: true` 僅移除該表情符號。
- **Google Chat**：空的 `emoji` 會移除訊息上應用程式的反應；`remove: true` 僅移除該表情符號。
- **Telegram**：空的 `emoji` 會移除機器人的反應；`remove: true` 也會移除反應，但仍需要非空的 `emoji` 以進行工具驗證。
- **WhatsApp**：空的 `emoji` 會移除機器人的反應；`remove: true` 對應到空的表情符號（仍需要 `emoji`）。
- **Zalo 個人版 (`zalouser`)**：需要非空的 `emoji`；`remove: true` 會移除該特定的表情符號反應。
- **Signal**：當啟用 `channels.signal.reactionNotifications` 時，傳入的反應通知會發出系統事件。

import footerZhHant from "/components/footer/zh-Hant.mdx";

<footerZhHant />
