---
summary: "跨頻道共享的回應語意"
read_when:
  - 在任何頻道上處理回應
title: "回應"
---

# 反應工具

跨頻道共用的反應語意：

- 新增回應時需要 `emoji`。
- 當支援時，`emoji=""` 會移除機器人的回應。
- 當支援時，`remove: true` 會移除指定的 emoji（需要 `emoji`）。

頻道備註：

- **Discord/Slack**：空的 `emoji` 會移除訊息上所有機器人的回應；`remove: true` 僅移除該 emoji。
- **Google Chat**：空的 `emoji` 會移除訊息上應用程式的回應；`remove: true` 僅移除該 emoji。
- **Telegram**：空的 `emoji` 會移除機器人的回應；`remove: true` 也會移除回應，但仍需要非空的 `emoji` 以進行工具驗證。
- **WhatsApp**：空的 `emoji` 會移除機器人的回應；`remove: true` 對應到空的 emoji（仍需要 `emoji`）。
- **Zalo Personal (`zalouser`)**：需要非空的 `emoji`；`remove: true` 會移除該特定 emoji 回應。
- **Signal**：當啟用 `channels.signal.reactionNotifications` 時，傳入的回應通知會發出系統事件。

import en from "/components/footer/en.mdx";

<en />
