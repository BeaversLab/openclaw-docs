---
summary: "让受支持的群组房间提供静默上下文，除非代理使用消息工具发送"
read_when:
  - Configuring always-on group or channel rooms
  - You want the agent to watch room chatter without posting final text automatically
  - Debugging typing and token usage with no visible room message
title: "环境房间事件"
sidebarTitle: "环境房间事件"
---

环境房间事件允许 OpenClaw 将未提及的群组或渠道闲聊作为静默上下文进行处理。代理可以更新内存和会话状态，但房间保持静默，除非代理明确调用 OpenClaw`message` 工具。

对于常驻群组聊天，这是推荐的模式：将 `messages.groupChat.unmentionedInbound: "room_event"` 与 `messages.groupChat.visibleReplies: "message_tool"` 结合使用。当代理应该监听、决定何时回复有用时，并避免回答 `NO_REPLY` 的旧提示模式时，请使用它。

目前支持的平台：Discord 公会频道、Slack 频道和私人频道、Slack 多人私信，以及 Telegram 群组或超级群组。其他群组频道保持其现有的群组行为，除非其频道页面注明支持环境房间事件。

## 推荐的设置

设置全局群组聊天行为：

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

然后，通过禁用该房间的提及门控，将房间本身配置为常驻模式。该渠道仍必须通过其正常的 `groupPolicy`、房间白名单和发送者白名单的允许。

保存配置后，Gateway(网关) 会热重载 Gateway(网关)`messages` 设置。仅在禁用文件监视或配置重载时才需要重启。

## 变化内容

启用 `messages.groupChat.unmentionedInbound: "room_event"` 后：

- 未提及的允许群组或渠道消息变为静默房间事件
- 提及的消息保持为用户请求
- 文本命令和本机命令保持为用户请求
- 中止或停止请求保持为用户请求
- 私信保持为用户请求

房间事件使用严格的可见传递。最终的助手文本是私有的。代理必须调用 `message(action=send)` 才能在房间中发布。

## Discord 示例

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

当只有一个频道应为环境模式时，请使用每个频道的 Discord 配置：

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

## Slack 示例

Slack 渠道允许列表以 ID 为首。请使用渠道 ID，例如 Slack`C12345678`，而不是 `#channel-name`。

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

## Telegram 示例

对于 Telegram 群组，机器人必须能够看到正常的群组消息。如果 Telegram`requireMention: false`Telegram，请禁用 BotFather 隐私模式或使用另一个能将完整群组流量传递给机器人的 Telegram 设置。

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

Telegram 群组 ID 通常是负数，例如 Telegram`-1001234567890`。请从 `openclaw logs --follow`API 中读取 `chat.id`，将群组消息转发给 ID 辅助机器人，或检查 Bot API `getUpdates`。

## 代理特定策略

当多个代理共享同一个房间，但只有一个代理应将未提及的闲聊视为环境上下文时，请使用代理覆盖：

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

特定于代理的 `agents.list[].groupChat.unmentionedInbound` 值会覆盖该代理的 `messages.groupChat.unmentionedInbound`。

## 可见回复模式

对于普通的群组/渠道用户请求，`messages.groupChat.visibleReplies` 默认为 `"automatic"`。如果您希望最终助手文本可见地发布而无需显式调用消息工具，请保留该默认值。

对于始终开启的环境房间，仍然推荐使用 `messages.groupChat.visibleReplies: "message_tool"`OpenClaw，尤其是对于像 GPT 5.5 这样可靠调用工具的最新一代模型。它允许代理通过调用消息工具来决定何时发言。如果模型返回最终文本但未调用工具，OpenClaw 将把该最终文本设为私密，并记录被抑制的传递元数据。

即使其他群组请求使用自动回复，房间事件仍保持严格模式。未提及的环境房间事件仍然需要 `message(action=send)` 才能产生可见输出。

## 历史记录

`messages.groupChat.historyLimit` 控制全局群组历史记录的默认值。渠道可以使用 `channels.<channel>.historyLimit` 覆盖它，某些渠道还支持每个账户的历史记录限制。

设置 `historyLimit: 0` 以禁用群组历史记录上下文。

支持的房间事件渠道会将最近的环境房间消息保留为上下文。Discord 会保留房间事件历史记录，直到可见的 Discord 发送成功，因此在通过消息工具传递之前不会丢失静默上下文。

## 故障排除

如果房间显示正在输入或正在使用 Token，但没有可见消息：

1. 确认该房间是否被渠道白名单和发送者白名单允许。
2. 确认 `requireMention: false` 已在您预期的房间级别设置。
3. 检查 `messages.groupChat.unmentionedInbound` 或代理覆盖是否为 `"room_event"`。
4. 检查日志中是否有被抑制的最终有效负载元数据或 `didSendViaMessagingTool: false`。
5. 对于普通的群组请求，如果您希望自动发布最终回复，请保留或恢复 `messages.groupChat.visibleReplies: "automatic"`。对于使用 `message_tool` 的环境房间，请使用可靠调用工具的模型/运行时。

如果 Telegram 环境房间根本没有触发，请检查 BotFather 隐私模式并验证 Gateway(网关) 是否正在接收正常的群组消息。

如果 Slack 环境房间未触发，请验证渠道键是否为 Slack 渠道 ID，且应用程序对该房间类型具有所需的 SlackSlack`channels:history` 或 `groups:history` 范围（scope）。

## 相关

- [群组](/zh/channels/groups)
- [Discord](Discord/en/channels/discord)
- [Slack](Slack/en/channels/slack)
- [Telegram](Telegram/en/channels/telegram)
- [渠道故障排除](/zh/channels/troubleshooting)
- [渠道配置参考](/zh/gateway/config-channels)
