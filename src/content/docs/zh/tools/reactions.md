---
summary: "所有受支持渠道中的反应工具语义"
read_when:
  - Working on reactions in any channel
  - Understanding how emoji reactions differ across platforms
title: "反应"
---

Agent 可以使用 `message` 工具的 `react` 操作在消息上添加和移除表情符号反应。反应行为因渠道和传输而异。

## 工作原理

```json
{
  "action": "react",
  "messageId": "msg-123",
  "emoji": "thumbsup"
}
```

- 添加反应时需要 `emoji`。
- 将 `emoji` 设置为空字符串 (`""`) 以移除 Bot 的反应。
- 设置 `remove: true` 以移除特定的表情符号（要求 `emoji` 非空）。
- 在支持状态反应的渠道上，反应上的 `trackToolCalls: true` 允许运行时在同一回合内的后续工具进度反应中使用该已反应的消息。

## 渠道行为

<AccordionGroup>
  <Accordion title="DiscordDiscord 和 Slack">
    - 空的 `emoji` 会移除消息上所有 Bot 的反应。
    - `remove: true` 仅移除指定的表情符号。

  </Accordion>

  <Accordion title="Google Chat">
    - 空的 `emoji` 会移除消息上应用 的反应。
    - `remove: true` 仅移除指定的表情符号。

  </Accordion>

  <Accordion title="Nextcloud Talk">
    - 仅支持添加反应：`emoji` 是必需的，且必须非空。
    - 尚不支持移除反应；带有 `remove: true`（或空的 `emoji`）的调用将被明确拒绝并报错，而不是静默无操作。
    - 需要将 Talk Bot 注册到 `reaction` 功能（参见 [Nextcloud Talk 渠道文档](/zh/channels/nextcloud-talk)）。

  </Accordion>

  <Accordion title="Telegram">
    - 空的 `emoji` 会移除 Bot 的反应。
    - `remove: true` 也会移除反应，但仍要求 `emoji` 非空以便通过工具验证。

  </Accordion>

  <Accordion title="WhatsAppWhatsApp">
    - 空的 `emoji` 会移除机器人反应。
    - `remove: true` 在内部映射为空表情符号（在工具调用中仍需要 `emoji`WhatsApp）。
    - WhatsApp 每条消息只有一个机器人反应槽；状态反应更新会替换该槽位，而不是堆叠多个表情符号。

  </Accordion>

  <Accordion title="ZaloZalo Personal (zalouser)">
    - 需要非空的 `emoji`。
    - `remove: true` 会移除该特定的表情符号反应。

  </Accordion>

  <Accordion title="Feishu/Lark">
    - 使用 `feishu_reaction` 工具以及操作 `add`、`remove` 和 `list`。
    - 添加/移除需要 `emoji_type`；移除还需要 `reaction_id`。

  </Accordion>

  <Accordion title="SignalSignal">
    - 入站反应通知由 `channels.signal.reactionNotifications` 控制：`"off"` 禁用它们，`"own"`（默认）在用户对机器人消息做出反应时发出事件，而 `"all"` 对所有反应发出事件。

  </Accordion>

  <Accordion title="iMessageiMessage"iMessage>
    - 出站反应是 iMessage 点回（`love`、`like`、`dislike`、`laugh`、`emphasize` 和 `question`）。
    - 入站点回通知由 `channels.imessage.reactionNotifications` 控制：`"off"` 禁用它们，`"own"`（默认）在用户对机器人创建的消息做出反应时发出事件，而 `"all"` 对来自授权发件人的所有点回发出事件。

  </Accordion>
</AccordionGroup>

## 反应级别

按 `reactionLevel` 的配置控制 agent 使用反应的广泛程度。值通常为 `off`、`ack`、`minimal` 或 `extensive`。

- [Telegram reactionLevel](/zh/channels/telegram#reaction-notifications) — `channels.telegram.reactionLevel`
- [WhatsApp reactionLevel](/zh/channels/whatsapp#reaction-level) — `channels.whatsapp.reactionLevel`

在各个渠道上设置 `reactionLevel`，以调整 agent 在每个平台上对消息做出反应的活跃程度。

## 相关

- [Agent Send](/zh/tools/agent-send) — 包含 `react` 的 `message` 工具
- [Channels](/zh/channels) — 特定渠道的配置
