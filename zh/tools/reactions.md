---
summary: "跨频道共享的反应语义"
read_when:
  - Working on reactions in any channel
title: "反应"
---

# 反应工具

跨频道共享的反应语义：

- 添加反应时需要 `emoji`。
- `emoji=""` 在支持的情况下移除机器人的反应。
- `remove: true` 在支持的情况下移除指定的 emoji（需要 `emoji`）。

频道说明：

- **Discord/Slack**：空的 `emoji` 移除机器人在消息上的所有反应；`remove: true` 仅移除该 emoji。
- **Google Chat**：空的 `emoji` 移除应用在消息上的反应；`remove: true` 仅移除该 emoji。
- **Telegram**：空的 `emoji` 移除机器人的反应；`remove: true` 也会移除反应，但工具验证仍需要非空的 `emoji`。
- **WhatsApp**：空的 `emoji` 移除机器人反应；`remove: true` 映射到空 emoji（仍然需要 `emoji`）。
- **Zalo 个人版 (`zalouser`)**：需要非空的 `emoji`；`remove: true` 移除特定的 emoji 反应。
- **Signal**：当启用 `channels.signal.reactionNotifications` 时，入站反应通知会发出系统事件。

import zh from "/components/footer/zh.mdx";

<zh />
