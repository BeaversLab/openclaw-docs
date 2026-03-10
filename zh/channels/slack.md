---
summary: "Socket 或 HTTP webhook 模式的 Slack 设置"
read_when: "设置 Slack 或调试 Slack socket/HTTP 模式"
title: "Slack"
---

# Slack

## Socket 模式（默认）

### 快速设置（初学者）

1. 创建一个 Slack 应用并启用 **Socket Mode**。
2. 创建一个 **App Token**（`xapp-...`）和 **Bot Token**（`xoxb-...`）。
3. 为 OpenClaw 设置令牌并启动 gateway。

最小配置：

```json5
{
  channels: {
    slack: {
      enabled: true,
      appToken: "xapp-...",
      botToken: "xoxb-...",
    },
  },
}
```

### 设置

1. 在 https://api.slack.com/apps 中创建一个 Slack 应用（从零开始）。
2. **Socket Mode** → 切换为开。然后转到 **Basic Information** → **App-Level Tokens** → **Generate Token and Scopes**，范围 `connections:write`。复制 **App Token**（`xapp-...`）。
3. **OAuth & Permissions** → 添加 bot token 范围（使用下面的清单）。点击 **Install to Workspace**。复制 **Bot User OAuth Token**（`xoxb-...`）。
4. 可选：**OAuth & Permissions** → 添加 **User Token Scopes**（参见下面的只读列表）。重新安装应用并复制 **User OAuth Token**（`xoxp-...`）。
5. **Event Subscriptions** → 启用事件并订阅：
   - `message.*`（包括编辑/删除/线程广播）
   - `app_mention`
   - `reaction_added`、`reaction_removed`
   - `member_joined_channel`、`member_left_channel`
   - `channel_rename`
   - `pin_added`、`pin_removed`
6. 邀请机器人到您希望它读取的频道。
7. Slash Commands → 如果您使用 `channels.slack.slashCommand`，则创建 `/openclaw`。如果您启用原生命令，则为每个内置命令添加一个斜杠命令（名称与 `/help` 相同）。除非您设置 `channels.slack.commands.native: true`，否则 Slack 的原生命令默认为关闭（全局 `commands.native` 是 `"auto"`，这意味着 Slack 关闭）。
8. App Home → 启用 **Messages Tab**，以便用户可以向机器人发送 DM。

使用下面的清单，以便范围和事件保持同步。

多账户支持：使用 `channels.slack.accounts` 配置每账户令牌和可选的 `name`。有关共享模式，请参阅 [`gateway/configuration`](/zh/gateway/configuration#telegramaccounts--discordaccounts--slackaccounts--signalaccounts--imessageaccounts)。

### OpenClaw 配置（最小）

通过环境变量设置令牌（推荐）：

- `SLACK_APP_TOKEN=xapp-...`
- `SLACK_BOT_TOKEN=xoxb-...`

或通过配置：

```json5
{
  channels: {
    slack: {
      enabled: true,
      appToken: "xapp-...",
      botToken: "xoxb-...",
    },
  },
}
```

### 用户令牌（可选）

OpenClaw 可以使用 Slack 用户令牌（`xoxp-...`）进行读取操作（历史记录、
pin、反应、表情符号、成员信息）。默认情况下，这保持只读：当存在用户令牌时，读取优先使用用户令牌，写入仍然使用 bot 令牌，除非您明确选择加入。即使使用 `userTokenReadOnly: false`，当 bot 令牌可用时，写入仍然优先使用它。

用户令牌在配置文件中配置（不支持环境变量）。对于多账户，请设置 `channels.slack.accounts.<id>.userToken`。

bot + app + user 令牌的示例：

```json5
{
  channels: {
    slack: {
      enabled: true,
      appToken: "xapp-...",
      botToken: "xoxb-...",
      userToken: "xoxp-...",
    },
  },
}
```

显式设置 userTokenReadOnly 的示例（允许用户令牌写入）：

```json5
{
  channels: {
    slack: {
      enabled: true,
      appToken: "xapp-...",
      botToken: "xoxb-...",
      userToken: "xoxp-...",
      userTokenReadOnly: false,
    },
  },
}
```

#### 令牌使用

- 读取操作（历史记录、反应列表、pin 列表、表情符号列表、成员信息、
  搜索）优先使用用户令牌（如果已配置），否则使用 bot 令牌。
- 写入操作（发送/编辑/删除消息、添加/删除反应、pin/unpin、
  文件上传）默认使用 bot 令牌。如果 `userTokenReadOnly: false` 并且没有可用的 bot 令牌，OpenClaw 将回退到用户令牌。

### 历史上下文

- `channels.slack.historyLimit`（或 `channels.slack.accounts.*.historyLimit`）控制将多少最近的频道/群组消息包装到提示中。
- 回退到 `messages.groupChat.historyLimit`。设置 `0` 禁用（默认 50）。

## HTTP 模式（Events API）

当您的 Gateway 可以通过 HTTPS 被 Slack 访问时，使用 HTTP webhook 模式（典型用于服务器部署）。
HTTP 模式使用 Events API + Interactivity + Slash Commands，具有共享的请求 URL。

### 设置

1. 创建一个 Slack 应用并**禁用 Socket Mode**（如果您只使用 HTTP，则可选）。
2. **Basic Information** → 复制 **Signing Secret**。
3. **OAuth & Permissions** → 安装应用并复制 **Bot User OAuth Token**（`xoxb-...`）。
4. **Event Subscriptions** → 启用事件并将 **Request URL** 设置为您的 gateway webhook 路径（默认 `/slack/events`）。
5. **Interactivity & Shortcuts** → 启用并设置相同的 **Request URL**。
6. **Slash Commands** → 为您的命令设置相同的 **Request URL**。

请求 URL 示例：
`https://gateway-host/slack/events`

### OpenClaw 配置（最小）

```json5
{
  channels: {
    slack: {
      enabled: true,
      mode: "http",
      botToken: "xoxb-...",
      signingSecret: "your-signing-secret",
      webhookPath: "/slack/events",
    },
  },
}
```

多账户 HTTP 模式：设置 `channels.slack.accounts.<id>.mode = "http"` 并为每个账户提供唯一的
`webhookPath`，以便每个 Slack 应用可以指向自己的 URL。

### 清单（可选）

使用此 Slack 应用清单快速创建应用（如果需要，可以调整名称/命令）。如果您计划配置用户令牌，请包括用户范围。

```json
{
  "display_information": {
    "name": "OpenClaw",
    "description": "Slack connector for OpenClaw"
  },
  "features": {
    "bot_user": {
      "display_name": "OpenClaw",
      "always_online": false
    },
    "app_home": {
      "messages_tab_enabled": true,
      "messages_tab_read_only_enabled": false
    },
    "slash_commands": [
      {
        "command": "/openclaw",
        "description": "Send a message to OpenClaw",
        "should_escape": false
      }
    ]
  },
  "oauth_config": {
    "scopes": {
      "bot": [
        "chat:write",
        "channels:history",
        "channels:read",
        "groups:history",
        "groups:read",
        "groups:write",
        "im:history",
        "im:read",
        "im:write",
        "mpim:history",
        "mpim:read",
        "mpim:write",
        "users:read",
        "app_mentions:read",
        "reactions:read",
        "reactions:write",
        "pins:read",
        "pins:write",
        "emoji:read",
        "commands",
        "files:read",
        "files:write"
      ],
      "user": [
        "channels:history",
        "channels:read",
        "groups:history",
        "groups:read",
        "im:history",
        "im:read",
        "mpim:history",
        "mpim:read",
        "users:read",
        "reactions:read",
        "pins:read",
        "emoji:read",
        "search:read"
      ]
    }
  },
  "settings": {
    "socket_mode_enabled": true,
    "event_subscriptions": {
      "bot_events": [
        "app_mention",
        "message.channels",
        "message.groups",
        "message.im",
        "message.mpim",
        "reaction_added",
        "reaction_removed",
        "member_joined_channel",
        "member_left_channel",
        "channel_rename",
        "pin_added",
        "pin_removed"
      ]
    }
  }
}
```

如果您启用原生命令，请为要公开的每个命令添加一个 `slash_commands` 条目（匹配 `/help` 列表）。使用 `channels.slack.commands.native` 覆盖。

## 范围（当前 vs 可选）

Slack 的 Conversations API 是类型范围的：您只需要实际接触的对话类型的范围（channels、groups、im、mpim）。有关概述，请参阅
https://docs.slack.dev/apis/web-api/using-the-conversations-api/。

### Bot 令牌范围（必需）

- `chat:write`（通过 `chat.postMessage` 发送/更新/删除消息）
  https://docs.slack.dev/reference/methods/chat.postMessage
- `im:write`（通过 `conversations.open` 打开 DM，用于用户 DM）
  https://docs.slack.dev/reference/methods/conversations.open
- `channels:history`、`groups:history`、`im:history`、`mpim:history`
  https://docs.slack.dev/reference/methods/conversations.history
- `channels:read`、`groups:read`、`im:read`、`mpim:read`
  https://docs.slack.dev/reference/methods/conversations.info
- `users:read`（用户查找）
  https://docs.slack.dev/reference/methods/users.info
- `reactions:read`、`reactions:write`（`reactions.get` / `reactions.add`）
  https://docs.slack.dev/reference/methods/reactions.get
  https://docs.slack.dev/reference/methods/reactions.add
- `pins:read`、`pins:write`（`pins.list` / `pins.add` / `pins.remove`）
  https://docs.slack.dev/reference/scopes/pins.read
  https://docs.slack.dev/reference/scopes/pins.write
- `emoji:read`（`emoji.list`）
  https://docs.slack.dev/reference/scopes/emoji.read
- `files:write`（通过 `files.uploadV2` 上传）
  https://docs.slack.dev/messaging/working-with-files/#upload

### 用户令牌范围（可选，默认只读）

如果您配置 `channels.slack.userToken`，请在 **User Token Scopes** 下添加这些。

- `channels:history`、`groups:history`、`im:history`、`mpim:history`
- `channels:read`、`groups:read`、`im:read`、`mpim:read`
- `users:read`
- `reactions:read`
- `pins:read`
- `emoji:read`
- `search:read`

### 今天不需要（但可能将来需要）

- `mpim:write`（仅当我们通过 `conversations.open` 添加群组 DM 打开/DM 开始时）
- `groups:write`（仅当我们添加私有频道管理时：创建/重命名/邀请/归档）
- `chat:write.public`（仅当我们想发布到机器人不在的频道时）
  https://docs.slack.dev/reference/scopes/chat.write.public
- `users:read.email`（仅当我们需要来自 `users.info` 的电子邮件字段时）
  https://docs.slack.dev/changelog/2017-04-narrowing-email-access
- `files:read`（仅当我们开始列出/读取文件元数据时）

## 配置

Slack 仅使用 Socket 模式（没有 HTTP webhook 服务器）。提供两个令牌：

```json
{
  "slack": {
    "enabled": true,
    "botToken": "xoxb-...",
    "appToken": "xapp-...",
    "groupPolicy": "allowlist",
    "dm": {
      "enabled": true,
      "policy": "pairing",
      "allowFrom": ["U123", "U456", "*"],
      "groupEnabled": false,
      "groupChannels": ["G123"],
      "replyToMode": "all"
    },
    "channels": {
      "C123": { "allow": true, "requireMention": true },
      "#general": {
        "allow": true,
        "requireMention": true,
        "users": ["U123"],
        "skills": ["search", "docs"],
        "systemPrompt": "Keep answers short."
      }
    },
    "reactionNotifications": "own",
    "reactionAllowlist": ["U123"],
    "replyToMode": "off",
    "actions": {
      "reactions": true,
      "messages": true,
      "pins": true,
      "memberInfo": true,
      "emojiList": true
    },
    "slashCommand": {
      "enabled": true,
      "name": "openclaw",
      "sessionPrefix": "slack:slash",
      "ephemeral": true
    },
    "textChunkLimit": 4000,
    "mediaMaxMb": 20
  }
}
```

令牌也可以通过环境变量提供：

- `SLACK_BOT_TOKEN`
- `SLACK_APP_TOKEN`

Ack 反应通过 `messages.ackReaction` +
`messages.ackReactionScope` 全局控制。使用 `messages.removeAckAfterReply` 在机器人回复后清除
ack 反应。

## 限制

- 出站文本被分块为 `channels.slack.textChunkLimit`（默认 4000）。
- 可选换行符分块：设置 `channels.slack.chunkMode="newline"` 以在长度分块之前按空行（段落边界）分割。
- 媒体上传受 `channels.slack.mediaMaxMb` 限制（默认 20）。

## 回复线程

默认情况下，OpenClaw 在主频道中回复。使用 `channels.slack.replyToMode` 控制自动线程化：

| Mode    | Behavior                                                                                                                                                            |
| ------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `off`   | **默认。**在主频道中回复。仅当触发消息已经在线程中时才线程化。                                                                  |
| `first` | 第一次回复进入线程（在触发消息下），后续回复进入主频道。对于保持上下文可见同时避免线程混乱很有用。 |
| `all`   | 所有回复进入线程。保持对话包含在内，但可能会降低可见性。                                                                                  |

该模式适用于自动回复和代理工具调用（`slack sendMessage`）。

### 按聊天类型的线程化

您可以通过设置 `channels.slack.replyToModeByChatType` 为每种聊天类型配置不同的线程化行为：

```json5
{
  channels: {
    slack: {
      replyToMode: "off", // default for channels
      replyToModeByChatType: {
        direct: "all", // DMs always thread
        group: "first", // group DMs/MPIM thread first reply
      },
    },
  },
}
```

支持的聊天类型：

- `direct`：1:1 DM（Slack `im`）
- `group`：群组 DM / MPIM（Slack `mpim`）
- `channel`：标准频道（公共/私有）

优先级：

1. `replyToModeByChatType.<chatType>`
2. `replyToMode`
3. Provider 默认（`off`）

当未设置聊天类型覆盖时，旧的 `channels.slack.dm.replyToMode` 仍被接受作为 `direct` 的回退。

示例：

仅线程化 DM：

```json5
{
  channels: {
    slack: {
      replyToMode: "off",
      replyToModeByChatType: { direct: "all" },
    },
  },
}
```

线程化群组 DM，但保持频道在根目录：

```json5
{
  channels: {
    slack: {
      replyToMode: "off",
      replyToModeByChatType: { group: "first" },
    },
  },
}
```

使频道线程化，保持 DM 在根目录：

```json5
{
  channels: {
    slack: {
      replyToMode: "first",
      replyToModeByChatType: { direct: "off", group: "off" },
    },
  },
}
```

### 手动线程化标签

对于精细控制，请在代理响应中使用这些标签：

- `[[reply_to_current]]` — 回复触发消息（开始/继续线程）。
- `[[reply_to:<id>]]` — 回复特定的消息 id。

## 会话 + 路由

- DM 共享 `main` 会话（类似 WhatsApp/Telegram）。
- 频道映射到 `agent:<agentId>:slack:channel:<channelId>` 会话。
- 斜杠命令使用 `agent:<agentId>:slack:slash:<userId>` 会话（前缀可通过 `channels.slack.slashCommand.sessionPrefix` 配置）。
- 如果 Slack 不提供 `channel_type`，OpenClaw 会从频道 ID 前缀（`D`、`C`、`G`）推断它，并默认为 `channel` 以保持会话键稳定。
- 原生命令注册使用 `commands.native`（全局默认 `"auto"` → Slack 关闭），并且可以通过 `channels.slack.commands.native` 按工作区覆盖。文本命令需要独立的 `/...` 消息，并且可以通过 `commands.text: false` 禁用。Slash 斜杠命令在 Slack 应用中管理，不会自动删除。使用 `commands.useAccessGroups: false` 绕过命令的访问组检查。
- 完整命令列表 + 配置：[Slash commands](/zh/tools/slash-commands)

## DM 安全性（配对）

- 默认：`channels.slack.dm.policy="pairing"` — 未知 DM 发送者收到配对码（1 小时后过期）。
- 通过以下方式批准：`openclaw pairing approve slack <code>`。
- 要允许任何人：设置 `channels.slack.dm.policy="open"` 和 `channels.slack.dm.allowFrom=["*"]`。
- `channels.slack.dm.allowFrom` 接受用户 ID、@handles 或电子邮件（当令牌允许时在启动时解析）。向导接受用户名并在设置期间当令牌允许时将其解析为 id。

## 群组策略

- `channels.slack.groupPolicy` 控制频道处理（`open|disabled|allowlist`）。
- `allowlist` 要求频道在 `channels.slack.channels` 中列出。
- 如果您仅设置 `SLACK_BOT_TOKEN`/`SLACK_APP_TOKEN` 并且从未创建 `channels.slack` 部分，
  运行时将 `groupPolicy` 默认为 `open`。添加 `channels.slack.groupPolicy`、
  `channels.defaults.groupPolicy` 或频道允许列表以锁定它。
- 配置向导接受 `#channel` 名称并在可能时将其解析为 ID
  （公共 + 私有）；如果存在多个匹配，它倾向于活动频道。
- 在启动时，OpenClaw 将允许列表中的频道/用户名解析为 ID（当令牌允许时）
  并记录映射；未解析的条目保持原样。
- 要允许**没有频道**，请设置 `channels.slack.groupPolicy: "disabled"`（或保持空的允许列表）。

频道选项（`channels.slack.channels.<id>` 或 `channels.slack.channels.<name>`）：

- `allow`：当 `groupPolicy="allowlist"` 时允许/拒绝频道。
- `requireMention`：频道的提及限制。
- `tools`：可选的每频道工具策略覆盖（`allow`/`deny`/`alsoAllow`）。
- `toolsBySender`：频道内可选的每发送者工具策略覆盖（键是发送者 id/@handles/emails；支持 `"*"` 通配符）。
- `allowBots`：允许此频道中的机器人编写的消息（默认：false）。
- `users`：可选的每频道用户允许列表。
- `skills`：技能过滤器（省略 = 所有技能，空 = 无）。
- `systemPrompt`：频道的额外系统提示（与主题/目的结合）。
- `enabled`：设置 `false` 以禁用频道。

## 传递目标

将这些与 cron/CLI 发送一起使用：

- `user:<id>` 用于 DM
- `channel:<id>` 用于频道

## 工具操作

Slack 工具操作可以用 `channels.slack.actions.*` 限制：

| Action group | Default | Notes                  |
| ------------ | ------- | ---------------------- |
| reactions    | enabled | 反应 + 列出反应 |
| messages     | enabled | 读取/发送/编辑/删除  |
| pins         | enabled | Pin/unpin/列表         |
| memberInfo   | enabled | 成员信息            |
| emojiList    | enabled | 自定义表情符号列表      |

## 安全注意事项

- 写入默认使用 bot 令牌，因此状态更改操作保持限定于
  应用的 bot 权限和身份。
- 设置 `userTokenReadOnly: false` 允许在 bot 令牌不可用时使用用户令牌进行写入
  操作，这意味着操作使用安装用户的访问权限运行。将用户令牌视为高度特权并保持
  操作限制和允许列表严格。
- 如果您启用用户令牌写入，请确保用户令牌包含您期望的写入
  范围（`chat:write`、`reactions:write`、`pins:write`、
  `files:write`），否则这些操作将失败。

## 注意事项

- 提及限制通过 `channels.slack.channels` 控制（设置 `requireMention` 为 `true`）；`agents.list[].groupChat.mentionPatterns`（或 `messages.groupChat.mentionPatterns`）也算作提及。
- 多代理覆盖：在 `agents.list[].groupChat.mentionPatterns` 上设置每代理模式。
- 反应通知遵循 `channels.slack.reactionNotifications`（使用 `reactionAllowlist` 和模式 `allowlist`）。
- 机器人编写的消息默认被忽略；通过 `channels.slack.allowBots` 或 `channels.slack.channels.<id>.allowBots` 启用。
- 警告：如果您允许对其他机器人回复（`channels.slack.allowBots=true` 或 `channels.slack.channels.<id>.allowBots=true`），请使用 `requireMention`、`channels.slack.channels.<id>.users` 允许列表和/或在 `AGENTS.md` 和 `SOUL.md` 中设置明确的防护措施来防止机器人到机器人的回复循环。
- 对于 Slack 工具，反应删除语义在 [/tools/reactions](/zh/tools/reactions) 中。
- 附件在被允许且在大小限制内时被下载到媒体存储。
