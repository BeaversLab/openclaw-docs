---
summary: "所有受支持渠道中的反应工具语义"
read_when:
  - Working on reactions in any channel
  - Understanding how emoji reactions differ across platforms
title: "反应"
---

# 反应

Agent 可以使用 `message` 工具的 `react` 操作在消息上添加和移除表情符号反应。反应行为因渠道而异。

## 工作原理

```json
{
  "action": "react",
  "messageId": "msg-123",
  "emoji": "thumbsup"
}
```

- 添加反应时需要 `emoji`。
- 将 `emoji` 设置为空字符串 (`""`) 以移除 bot 的反应。
- 设置 `remove: true` 以移除特定表情符号（需要非空的 `emoji`）。

## 渠道行为

<AccordionGroup>
  <Accordion title="Discord 和 Slack">
    - 空的 `emoji` 会移除消息上所有 bot 的反应。
    - `remove: true` 仅移除指定的表情符号。
  </Accordion>

<Accordion title="Google Chat">- 空的 `emoji` 会移除应用在消息上的反应。 - `remove: true` 仅移除指定的表情符号。</Accordion>

<Accordion title="Telegram">- 空的 `emoji` 会移除 bot 的反应。 - `remove: true` 也可以移除反应，但为了工具验证，仍然需要非空的 `emoji`。</Accordion>

<Accordion title="WhatsApp">- 空的 `emoji` 会移除 bot 的反应。 - `remove: true` 在内部映射为空表情符号（在工具调用中仍然需要 `emoji`）。</Accordion>

<Accordion title="Zalo Personal (zalouser)">- 需要非空的 `emoji`。 - `remove: true` 移除该特定的表情符号反应。</Accordion>

<Accordion title="Feishu/Lark">- 使用带有操作 `add`、`remove` 和 `list` 的 `feishu_reaction` 工具。 - 添加/移除需要 `emoji_type`；移除还需要 `reaction_id`。</Accordion>

  <Accordion title="Signal">
    - 入站反应通知由 `channels.signal.reactionNotifications` 控制：`"off"` 禁用它们，`"own"`（默认）在用户对机器人消息做出反应时发出事件，而 `"all"` 则为所有反应发出事件。
  </Accordion>
</AccordionGroup>

## 反应级别

针对每个渠道的 `reactionLevel` 配置控制代理使用反应的广泛程度。值通常为 `off`、`ack`、`minimal` 或 `extensive`。

- [Telegram reactionLevel](/zh/channels/telegram#reaction-notifications) — `channels.telegram.reactionLevel`
- [WhatsApp reactionLevel](/zh/channels/whatsapp#reaction-level) — `channels.whatsapp.reactionLevel`

在各个渠道上设置 `reactionLevel`，以调整代理在每个平台上对消息做出反应的活跃程度。

## 相关

- [Agent Send](/zh/tools/agent-send) — 包含 `react` 的 `message` 工具
- [Channels](/zh/channels) — 特定渠道的配置
