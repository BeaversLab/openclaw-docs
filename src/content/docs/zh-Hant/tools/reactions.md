---
summary: "所有支援頻道的 Reaction 工具語意"
read_when:
  - Working on reactions in any channel
  - Understanding how emoji reactions differ across platforms
title: "Reactions"
---

# Reactions

Agent 可以使用 `message` 工具的 `react` 動作，在訊息上新增及移除 emoji 表情回應。表情回應的行為會因頻道而異。

## 運作方式

```json
{
  "action": "react",
  "messageId": "msg-123",
  "emoji": "thumbsup"
}
```

- 新增表情回應時，需要 `emoji`。
- 將 `emoji` 設為空字串 (`""`) 以移除機器人的表情回應。
- 設定 `remove: true` 以移除特定的 emoji（需要非空的 `emoji`）。

## 頻道行為

<AccordionGroup>
  <Accordion title="Discord 和 Slack">
    - 空的 `emoji` 會移除機器人在該訊息上的所有表情回應。
    - `remove: true` 僅移除指定的 emoji。
  </Accordion>

<Accordion title="Google Chat">- 空的 `emoji` 會移除應用程式在該訊息上的表情回應。 - `remove: true` 僅移除指定的 emoji。</Accordion>

<Accordion title="Telegram">- 空的 `emoji` 會移除機器人的表情回應。 - `remove: true` 也會移除表情回應，但仍需要非空的 `emoji` 以通過工具驗證。</Accordion>

<Accordion title="WhatsApp">- 空的 `emoji` 會移除機器人的表情回應。 - `remove: true` 在內部會對應到空的 emoji（但在工具呼叫中仍需要 `emoji`）。</Accordion>

<Accordion title="Zalo 個人版 (zalouser)">- 需要非空的 `emoji`。 - `remove: true` 會移除該特定的 emoji 表情回應。</Accordion>

<Accordion title="Feishu/Lark">- 使用 `feishu_reaction` 工具搭配動作 `add`、`remove` 和 `list`。 - 新增/移除需要 `emoji_type`；移除也需要 `reaction_id`。</Accordion>

  <Accordion title="Signal">
    - 傳入反應通知由 `channels.signal.reactionNotifications` 控制：`"off"` 停用通知，`"own"`（預設）在使用者對機器人訊息做出反應時發出事件，而 `"all"` 則會為所有反應發出事件。
  </Accordion>
</AccordionGroup>

## 反應等級

各頻道的 `reactionLevel` 設定控制代理使用反應的廣泛程度。數值通常為 `off`、`ack`、`minimal` 或 `extensive`。

- [Telegram reactionLevel](/en/channels/telegram#reaction-notifications) — `channels.telegram.reactionLevel`
- [WhatsApp reactionLevel](/en/channels/whatsapp#reactions) — `channels.whatsapp.reactionLevel`

在各個頻道上設定 `reactionLevel`，以調整代理在每個平台上對訊息做出反應的積極程度。

## 相關

- [Agent Send](/en/tools/agent-send) — 包含 `react` 的 `message` 工具
- [Channels](/en/channels) — 特定頻道設定
