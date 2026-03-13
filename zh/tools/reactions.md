---
summary: "跨频道共享的反应语义"
read_when:
  - Working on reactions in any channel
title: "反应"
---

# 反应工具

跨频道共享的反应语义：

- 添加反应时需要 `emoji`。
- 如果支持，`emoji=""` 会移除机器人的反应。
- 如果支持，`remove: true` 会移除指定的表情符号（需要 `emoji`）。

频道说明：

- **Discord/Slack**：空的 `emoji` 会移除机器人在消息上的所有反应；`remove: true` 仅移除该表情符号。
- **Google Chat**：空的 `emoji` 会移除应用在消息上的反应；`remove: true` 仅移除该表情符号。
- **Telegram**：空的 `emoji` 会移除机器人的反应；`remove: true` 也会移除反应，但为了工具验证，仍需要非空的 `emoji`。
- **WhatsApp**：空的 `emoji` 会移除机器人的反应；`remove: true` 映射为空表情符号（仍需要 `emoji`）。
- **Zalo 个人版 (`zalouser`)**：需要非空的 `emoji`；`remove: true` 会移除特定的表情符号反应。
- **Signal**：当启用 `channels.signal.reactionNotifications` 时，传入的反应通知会发出系统事件。

import zh from '/components/footer/zh.mdx';

<zh />
