---
summary: "所有支援頻道的 Reaction 工具語意"
read_when:
  - Working on reactions in any channel
  - Understanding how emoji reactions differ across platforms
title: "Reactions"
---

Agent 可以使用 `message`
工具搭配 `react` 動作，在訊息上新增和移除表情符號反應。反應行為會因頻道和傳輸方式而異。

## 運作方式

```json
{
  "action": "react",
  "messageId": "msg-123",
  "emoji": "thumbsup"
}
```

- 新增反應時需要 `emoji`。
- 將 `emoji` 設為空字串 (`""`) 以移除機器人的反應。
- 設定 `remove: true` 以移除特定表情符號（需要非空的 `emoji`）。
- 在支援狀態反應的頻道上，反應上的 `trackToolCalls: true`
  可讓執行階段在同一回合中，將該已反應訊息用於後續的工具
  進度反應。

## 頻道行為

<AccordionGroup>
  <Accordion title="Discord 和 Slack">
    - 空的 `emoji` 會移除機器人在該訊息上的所有反應。
    - `remove: true` 僅會移除指定的表情符號。

  </Accordion>

  <Accordion title="Google Chat">
    - 空的 `emoji` 會移除應用程式在該訊息上的反應。
    - `remove: true` 僅會移除指定的表情符號。

  </Accordion>

  <Accordion title="Telegram">
    - 空的 `emoji` 會移除機器人的反應。
    - `remove: true` 也會移除反應，但仍需要非空的 `emoji` 以進行工具驗證。

  </Accordion>

  <Accordion title="WhatsApp">
    - 空的 `emoji` 會移除機器人回應。
    - `remove: true` 在內部會映射為空的 emoji（在工具呼叫中仍然需要 `emoji`）。
    - WhatsApp 每則訊息只有一個機器人回應位置；狀態回應更新會替換該位置，而不是堆疊多個 emoji。

  </Accordion>

  <Accordion title="Zalo 個人版 (zalouser)">
    - 需要非空的 `emoji`。
    - `remove: true` 會移除該特定表情符號反應。

  </Accordion>

  <Accordion title="Feishu/Lark">
    - 使用帶有動作 `add`、`remove` 和 `list` 的 `feishu_reaction` 工具。
    - 新增/移除需要 `emoji_type`；移除也需要 `reaction_id`。

  </Accordion>

  <Accordion title="Signal">
    - 傳入的反應通知由 `channels.signal.reactionNotifications` 控制：`"off"` 會停用通知，`"own"`（預設值）會在使用者對機器人訊息做出反應時發出事件，而 `"all"` 會為所有反應發出事件。

  </Accordion>

  <Accordion title="iMessage">
    - 傳出反應是 iMessage 輕拍回應（`love`、`like`、`dislike`、`laugh`、`emphasize` 和 `question`）。
    - 傳入的輕拍回應通知由 `channels.imessage.reactionNotifications` 控制：`"off"` 會停用通知，`"own"`（預設值）會在使用者對機器人傳送的訊息做出反應時發出事件，而 `"all"` 會為來自已授寄件者的所有輕拍回應發出事件。

  </Accordion>
</AccordionGroup>

## 反應等級

每個頻道的 `reactionLevel` 設定會控制 Agent 使用反應的廣泛程度。數值通常為 `off`、`ack`、`minimal` 或 `extensive`。

- [Telegram reactionLevel](/zh-Hant/channels/telegram#reaction-notifications) — `channels.telegram.reactionLevel`
- [WhatsApp reactionLevel](/zh-Hant/channels/whatsapp#reaction-level) — `channels.whatsapp.reactionLevel`

在個別頻道上設定 `reactionLevel`，以調整 Agent 在各平台上對訊息做出反應的積極程度。

## 相關

- [Agent Send](/zh-Hant/tools/agent-send) — 包含 `react` 的 `message` 工具
- [Channels](/zh-Hant/channels) — 特定頻道的配置
