---
summary: "跨频道共享的反应语义"
read_when:
  - "Working on reactions in any channel"
title: "反应"
---

# 反应工具

跨频道的共享反应语义：

- `emoji` 在添加反应时是必需的。
- `emoji=""` 在支持时移除机器人的反应。
- `remove: true` 在支持时移除指定的表情符号（需要 `emoji`）。

频道注意事项：

- **Discord/Slack**：空的 `emoji` 移除机器人在消息上的所有反应；`remove: true` 仅移除该表情符号。
- **Google Chat**：空的 `emoji` 移除应用在消息上的反应；`remove: true` 仅移除该表情符号。
- **Telegram**：空的 `emoji` 移除机器人的反应；`remove: true` 也移除反应，但仍需要非空的 `emoji` 用于工具验证。
- **WhatsApp**：空的 `emoji` 移除机器人反应；`remove: true` 映射到空表情符号（仍需要 `emoji`）。
- **Signal**：当启用 `channels.signal.reactionNotifications` 时，入站反应通知会发出系统事件。
