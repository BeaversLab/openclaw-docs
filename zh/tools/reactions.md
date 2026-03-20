---
summary: "跨渠道共享的表情反应语义"
read_when:
  - 在任何渠道中处理表情反应
title: "表情反应"
---

# 反应工具

跨频道共享的反应语义：

- 添加表情反应时需要 `emoji`。
- 当支持时，`emoji=""` 会移除机器人的表情反应。
- 当支持时，`remove: true` 会移除指定的表情符号（需要 `emoji`）。

频道说明：

- **Discord/Slack**：空的 `emoji` 会移除机器人在该消息上的所有表情反应；`remove: true` 仅移除该表情符号。
- **Google Chat**：空的 `emoji` 会移除应用在该消息上的表情反应；`remove: true` 仅移除该表情符号。
- **Telegram**：空的 `emoji` 会移除机器人的表情反应；`remove: true` 也会移除表情反应，但为了工具验证，仍需要非空的 `emoji`。
- **WhatsApp**：空的 `emoji` 会移除机器人的表情反应；`remove: true` 映射为空表情符号（仍需要 `emoji`）。
- **Zalo 个人版 (`zalouser`)**：需要非空的 `emoji`；`remove: true` 会移除该特定的表情符号反应。
- **Signal**：当启用 `channels.signal.reactionNotifications` 时，传入的表情反应通知会发出系统事件。

import en from "/components/footer/en.mdx";

<en />
