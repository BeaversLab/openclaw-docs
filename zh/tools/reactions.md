---
title: "反应"
summary: "跨频道共享的表情回应语义"
read_when:
  - 处理任意频道的 reactions
---

# 表情回应工具

跨频道共享的 reaction 语义：

- 添加 reaction 时必须提供 `emoji`。
- `emoji=""` 在支持的情况下移除机器人自己的 reaction。
- `remove: true` 在支持的情况下移除指定 emoji（需要 `emoji`）。

频道说明：

- **Discord/Slack**：空 `emoji` 移除该消息上机器人所有反应；`remove: true` 仅移除指定 emoji。
- **Google Chat**：空 `emoji` 移除该消息上应用的反应；`remove: true` 仅移除指定 emoji。
- **Telegram**：空 `emoji` 移除机器人的反应；`remove: true` 也会移除，但工具校验仍要求非空 `emoji`。
- **WhatsApp**：空 `emoji` 移除机器人反应；`remove: true` 映射为空 emoji（仍要求 `emoji`）。
- **Signal**：当启用 `channels.signal.reactionNotifications` 时，入站 reaction 通知会触发系统事件。
