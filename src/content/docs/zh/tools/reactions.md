---
summary: "所有受支持渠道中的反应工具语义"
read_when:
  - Working on reactions in any channel
  - Understanding how emoji reactions differ across platforms
title: "反应"
---

# 反应

代理可以使用 `message`
工具以及 `react` 操作来添加和移除消息上的表情符号反应。反应行为因渠道而异。

## 工作原理

```json
{
  "action": "react",
  "messageId": "msg-123",
  "emoji": "thumbsup"
}
```

- 添加反应时需要 `emoji`。
- 将 `emoji` 设置为空字符串 (`""`) 以移除机器人的反应。
- 设置 `remove: true` 以移除特定的表情符号（要求 `emoji` 不为空）。

## 渠道行为

<AccordionGroup>
  <Accordion title="Discord 和 Slack">
    - 空的 `emoji` 会移除机器人在该消息上的所有反应。
    - `remove: true` 仅移除指定的表情符号。
  </Accordion>

<Accordion title="Google Chat">- 空 `emoji` 会移除应用在该消息上的回应。 - `remove: true` 仅移除指定的表情符号。</Accordion>

<Accordion title="Telegram">- 空 `emoji` 会移除机器人的回应。 - `remove: true` 也会移除回应，但为了工具验证，仍需要非空的 `emoji`。</Accordion>

<Accordion title="WhatsApp">- 空 `emoji` 会移除机器人的回应。 - `remove: true` 在内部映射为空表情符号（工具调用中仍需 `emoji`）。</Accordion>

<Accordion title="Zalo 个人版 (zalouser)">- 需要非空的 `emoji`。 - `remove: true` 会移除特定的表情符号回应。</Accordion>

  <Accordion title="Signal">
    - 入站反应通知由 `channels.signal.reactionNotifications` 控制：`"off"` 禁用通知，`"own"`（默认）在用户对机器人消息做出反应时发出事件，`"all"` 则对所有反应发出事件。
  </Accordion>
</AccordionGroup>

## 反应级别

针对每个渠道的 `reactionLevel` 配置控制 Agent 使用反应的广泛程度。值通常为 `off`、`ack`、`minimal` 或 `extensive`。

- [Telegram reactionLevel](/en/channels/telegram#reaction-notifications) — `channels.telegram.reactionLevel`
- [WhatsApp reactionLevel](/en/channels/whatsapp#reactions) — `channels.whatsapp.reactionLevel`

在各个渠道上设置 `reactionLevel`，以调整 Agent 在每个平台上对消息做出反应的活跃程度。

## 相关

- [Agent Send](/en/tools/agent-send) — 包含 `react` 的 `message` 工具
- [Channels](/en/channels) — 特定于渠道的配置
