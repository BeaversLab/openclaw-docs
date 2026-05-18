---
summary: "所有受支持渠道中的反应工具语义"
read_when:
  - Working on reactions in any channel
  - Understanding how emoji reactions differ across platforms
title: "反应"
---

代理可以使用 `message`
工具和 `react` 操作在消息上添加和移除表情符号回应。回应行为因渠道和传输方式而异。

## 工作原理

```json
{
  "action": "react",
  "messageId": "msg-123",
  "emoji": "thumbsup"
}
```

- 添加回应时需要 `emoji`。
- 将 `emoji` 设置为空字符串 (`""`) 以移除机器人的回应。
- 设置 `remove: true` 以移除特定表情符号（要求 `emoji` 非空）。
- 在支持状态反应的频道上，对反应设置 `trackToolCalls: true` 可让运行时在同一轮次内使用该已反应的消息进行后续的工具进度反应。

## 渠道行为

<AccordionGroup>
  <Accordion title="Discord 和 Slack">
    - 空的 `emoji` 会移除机器人在消息上的所有表情回应。
    - `remove: true` 仅移除指定的表情符号。

  </Accordion>

  <Accordion title="Google ChatGoogle Chat">
    - 空 `emoji` 会移除应用在该消息上的反应。
    - `remove: true` 仅移除指定的表情符号。

  </Accordion>

  <Accordion title="TelegramTelegram">
    - 空的 `emoji` 会移除机器人做出的反应。
    - `remove: true` 也会移除反应，但仍需要非空的 `emoji` 以便通过工具验证。

  </Accordion>

  <Accordion title="WhatsAppWhatsApp">
    - 空的 `emoji` 会移除机器人反应。
    - `remove: true` 在内部映射为空表情符号（在工具调用中仍然需要 `emoji`WhatsApp）。
    - WhatsApp 每条消息只有一个机器人反应槽位；状态反应更新会替换该槽位，而不是堆叠多个表情符号。

  </Accordion>

  <Accordion title="ZaloZalo 个人版 (zalouser)">
    - 要求非空的 `emoji`。
    - `remove: true` 会移除特定的表情反应。

  </Accordion>

  <Accordion title="Feishu/Lark">
    - 使用带有操作 `add`、`remove` 和 `list` 的 `feishu_reaction` 工具。
    - 添加/移除需要 `emoji_type`；移除还需要 `reaction_id`。

  </Accordion>

  <Accordion title="SignalSignal">
    - 入站表情符号通知由 `channels.signal.reactionNotifications` 控制：`"off"` 将其禁用，`"own"`（默认）在用户对机器人消息做出反应时发出事件，而 `"all"` 会针对所有反应发出事件。

  </Accordion>

  <Accordion title="iMessageiMessage"iMessage>
    - 出站反应是 iMessage 点回（`love`、`like`、`dislike`、`laugh`、`emphasize` 和 `question`）。
    - 入站点回通知由 `channels.imessage.reactionNotifications` 控制：`"off"` 禁用它们，`"own"`（默认）在用户对机器人发送的消息做出反应时发出事件，而 `"all"` 则对来自授权发送者的所有点回发出事件。

  </Accordion>
</AccordionGroup>

## 反应级别

针对特定渠道的 `reactionLevel` 配置控制代理使用反应的广泛程度。值通常为 `off`、`ack`、`minimal` 或 `extensive`。

- [Telegram reactionLevel](/zh/channels/telegram#reaction-notifications) — `channels.telegram.reactionLevel`
- [WhatsApp reactionLevel](/zh/channels/whatsapp#reaction-level) — `channels.whatsapp.reactionLevel`

在各个渠道上设置 `reactionLevel`，以调整代理在每个平台上对消息做出反应的积极程度。

## 相关

- [Agent Send](/zh/tools/agent-send) — 包含 `react` 的 `message` 工具
- [渠道](/zh/channels) — 渠道特定配置
