---
summary: "所有支援頻道的 Reaction 工具語意"
read_when:
  - Working on reactions in any channel
  - Understanding how emoji reactions differ across platforms
title: "Reactions"
---

# Reactions

Agent 可以使用 `message` 工具的 `react` 動作，在訊息上新增及移除 emoji 反應。反應行為會因頻道而異。

## 運作方式

```json
{
  "action": "react",
  "messageId": "msg-123",
  "emoji": "thumbsup"
}
```

- 新增反應時需要 `emoji`。
- 將 `emoji` 設為空字串 (`""`) 以移除 bot 的反應。
- 設定 `remove: true` 以移除特定的 emoji (需要非空的 `emoji`)。

## 頻道行為

<AccordionGroup>
  <Accordion title="Discord 和 Slack">
    - 空的 `emoji` 會移除該訊息上 bot 的所有反應。
    - `remove: true` 僅移除指定的 emoji。
  </Accordion>

<Accordion title="Google Chat">- 空的 `emoji` 會移除應用程式在訊息上的反應。 - `remove: true` 僅移除指定的表情符號。</Accordion>

<Accordion title="Telegram">- 空的 `emoji` 會移除機器人的反應。 - `remove: true` 也會移除反應，但為了工具驗證，仍需要非空的 `emoji`。</Accordion>

<Accordion title="WhatsApp">- 空的 `emoji` 會移除機器人反應。 - `remove: true` 在內部映射為空的表情符號（在工具呼叫中仍需要 `emoji`）。</Accordion>

<Accordion title="Zalo 個人版 (zalouser)">- 需要非空的 `emoji`。 - `remove: true` 會移除該特定的 emoji 反應。</Accordion>

  <Accordion title="Signal">
    - 傳入的反應通知由 `channels.signal.reactionNotifications` 控制：`"off"` 會停用它們，`"own"`（預設）會在使用者對機器人訊息做出反應時發出事件，而 `"all"` 則會為所有反應發出事件。
  </Accordion>
</AccordionGroup>

## 反應層級

每個頻道的 `reactionLevel` 設定控制代理程式使用回應的廣泛程度。數值通常是 `off`、`ack`、`minimal` 或 `extensive`。

- [Telegram reactionLevel](/en/channels/telegram#reaction-notifications) — `channels.telegram.reactionLevel`
- [WhatsApp reactionLevel](/en/channels/whatsapp#reactions) — `channels.whatsapp.reactionLevel`

在個別頻道上設定 `reactionLevel`，以調整代理在各個平台上對訊息做出反應的頻率。

## 相關內容

- [Agent Send](/en/tools/agent-send) — 包含 `react` 的 `message` 工具
- [Channels](/en/channels) — 特定通道的配置
