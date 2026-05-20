---
summary: "讓支援的群組房間提供安靜的上下文，除非代理程式使用訊息工具傳送"
read_when:
  - Configuring always-on group or channel rooms
  - You want the agent to watch room chatter without posting final text automatically
  - Debugging typing and token usage with no visible room message
title: "環境房間事件"
sidebarTitle: "環境房間事件"
---

環境房間事件讓 OpenClaw 將未提及的群組或頻道閒聊作為安靜的上下文進行處理。代理程式可以更新記憶和會話狀態，但除非代理程式明確呼叫 `message` 工具，否則房間將保持安靜。

對於始終在線的群組聊天，這是推薦的模式：結合 `messages.groupChat.unmentionedInbound: "room_event"` 和 `messages.groupChat.visibleReplies: "message_tool"`。當代理程式應該聆聽、決定何時回覆才有用，並避免舊的提示模式（回答 `NO_REPLY`）時使用它。

目前支援的平台：Discord 公會頻道、Slack 頻道和私人頻道、Slack 多人私訊，以及 Telegram 群組或超級群組。其他群組頻道將保持其現有的群組行為，除非其頻道頁面顯示支援環境房間事件。

## 建議設定

設定全域群組聊天行為：

```json5
{
  messages: {
    groupChat: {
      unmentionedInbound: "room_event",
      visibleReplies: "message_tool",
      historyLimit: 50,
    },
  },
}
```

然後透過停用該房間的提及門控，將房間本身設定為始終在線。該頻道仍必須由其正常的 `groupPolicy`、房間允許清單和傳送者允許清單允許。

儲存設定後，Gateway 會熱重新載入 `messages` 設定。僅當停用檔案監看或設定重新載入時才需要重新啟動。

## 變更內容

使用 `messages.groupChat.unmentionedInbound: "room_event"` 時：

- 未提及且允許的群組或頻道訊息會變成安靜的房間事件
- 提及的訊息保持為使用者請求
- 文字指令和原生指令保持為使用者請求
- 中止或停止請求保持為使用者請求
- 直接訊息保持為使用者請求

房間事件使用嚴格的可見傳遞方式。最終的助理文字是私密的。代理程式必須呼叫 `message(action=send)` 才能在房間中發布。

## Discord 範例

```json5
{
  messages: {
    groupChat: {
      unmentionedInbound: "room_event",
      visibleReplies: "message_tool",
      historyLimit: 50,
    },
  },
  channels: {
    discord: {
      groupPolicy: "allowlist",
      guilds: {
        "<DISCORD_SERVER_ID>": {
          requireMention: false,
          users: ["<YOUR_DISCORD_USER_ID>"],
        },
      },
    },
  },
}
```

當只有一個頻道應為環境模式時，使用每個頻道的 Discord 設定：

```json5
{
  channels: {
    discord: {
      guilds: {
        "<DISCORD_SERVER_ID>": {
          channels: {
            "<DISCORD_CHANNEL_ID_OR_NAME>": {
              allow: true,
              requireMention: false,
            },
          },
        },
      },
    },
  },
}
```

## Slack 範例

Slack 頻道允許清單優先採用 ID。使用諸如 `C12345678` 的頻道 ID，而非 `#channel-name`。

```json5
{
  messages: {
    groupChat: {
      unmentionedInbound: "room_event",
      visibleReplies: "message_tool",
      historyLimit: 50,
    },
  },
  channels: {
    slack: {
      groupPolicy: "allowlist",
      channels: {
        "<SLACK_CHANNEL_ID>": {
          allow: true,
          requireMention: false,
        },
      },
    },
  },
}
```

## Telegram 範例

對於 Telegram 群組，機器人必須能夠看到正常的群組訊息。如果 `requireMention: false`，請停用 BotFather 隱私模式或使用其他能將完整群組流量傳送給機器人的 Telegram 設定。

```json5
{
  messages: {
    groupChat: {
      unmentionedInbound: "room_event",
      visibleReplies: "message_tool",
      historyLimit: 50,
    },
  },
  channels: {
    telegram: {
      groups: {
        "<TELEGRAM_GROUP_CHAT_ID>": {
          groupPolicy: "open",
          requireMention: false,
        },
      },
    },
  },
}
```

Telegram 群組 ID 通常是負數，例如 `-1001234567890`。請從 `openclaw logs --follow` 讀取 `chat.id`，將群組訊息轉發給 ID 輔助機器人，或檢查 Bot API `getUpdates`。

## 代理程式特定原則

當多個代理程式共用同一個房間，但只有一個應該將未提及的閒聊視為環境語境時，請使用代理程式覆寫：

```json5
{
  messages: {
    groupChat: {
      visibleReplies: "message_tool",
    },
  },
  agents: {
    list: [
      {
        id: "main",
        groupChat: {
          unmentionedInbound: "room_event",
          mentionPatterns: ["@openclaw", "openclaw"],
        },
      },
    ],
  },
}
```

針對該代理程式，特定的 `agents.list[].groupChat.unmentionedInbound` 值會覆寫 `messages.groupChat.unmentionedInbound`。

## 可見回覆模式

`messages.groupChat.visibleReplies` 針對一般的群組/頻道使用者請求預設為 `"automatic"`。當您希望最終的助理文字可見地發布，且無需明確呼叫 message-tool 時，請保持該預設值。

對於恆常運作的環境房間，`messages.groupChat.visibleReplies: "message_tool"` 仍然被推薦，特別是搭配最新一代、工具可靠的模型（如 GPT 5.5）。它允許代理程式透過呼叫訊息工具來決定何時發言。如果模型返回最終文字但未呼叫工具，OpenClaw 會將該最終文字設為私密，並記錄被抑制的傳遞元資料。

即使其他群組請求使用自動回覆，房間事件仍保持嚴格模式。未被提及的環境房間事件仍然需要 `message(action=send)` 才能產生可見的輸出。

## 歷史記錄

`messages.groupChat.historyLimit` 控制全域群組歷史記錄的預設值。頻道可以使用 `channels.<channel>.historyLimit` 覆寫它，且部分頻道也支援每個帳戶的歷史記錄限制。

設定 `historyLimit: 0` 以停用群組歷史記錄內容。

支援房間事件的頻道會將最近的环境房間訊息保留為語境。Discord 會保留房間事件歷史記錄，直到可見的 Discord 傳送成功為止，因此在訊息工具傳送之前不會遺失靜默語境。

## 疑難排解

如果房間顯示正在輸入或使用 Token 但沒有可見訊息：

1. 確認房間是否已加入頻道允許清單和發送者允許清單。
2. 確認 `requireMention: false` 已設定在您預期的房間層級。
3. 檢查 `messages.groupChat.unmentionedInbound` 或代理程式覆寫是否為 `"room_event"`。
4. 檢查日誌中是否有被抑制的最終載荷元資料或 `didSendViaMessagingTool: false`。
5. 對於一般的群組請求，如果您希望最終回覆自動發布，請保留或恢復 `messages.groupChat.visibleReplies: "automatic"`。對於使用 `message_tool` 的環境房間，請使用可靠呼叫工具的模型/執行時期環境。

如果 Telegram 環境房間完全沒有觸發，請檢查 BotFather 隱私模式，並確認 Gateway 有接收到一般群組訊息。

如果 Slack 環境房間未觸發，請驗證頻道金鑰是否為 Slack 頻道 ID，並且應用程式是否具有該房間類型所需的 `channels:history` 或 `groups:history` 範圍權限。

## 相關

- [群組](/zh-Hant/channels/groups)
- [Discord](/zh-Hant/channels/discord)
- [Slack](/zh-Hant/channels/slack)
- [Telegram](/zh-Hant/channels/telegram)
- [頻道疑難排解](/zh-Hant/channels/troubleshooting)
- [頻道組態參考](/zh-Hant/gateway/config-channels)
