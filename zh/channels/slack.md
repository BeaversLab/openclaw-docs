---
summary: "Slack 的 Socket 或 HTTP webhook 模式设置"
read_when: "设置 Slack 或调试 Slack socket/HTTP 模式"
title: "Slack"
---

# Slack

## Socket 模式（默认）

### 快速设置（新手）

1. 创建 Slack 应用并启用 **Socket Mode**。
2. 创建 **App Token**（`xapp-...`）与 **Bot Token**（`xoxb-...`）。
3. 为 OpenClaw 设置 token 并启动 gateway。

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

1. 在 https://api.slack.com/apps 创建 Slack 应用（From scratch）。
2. **Socket Mode** → 开启。然后在 **Basic Information** → **App-Level Tokens** → **Generate Token and Scopes**，添加 scope `connections:write`。复制 **App Token**（`xapp-...`）。
3. **OAuth & Permissions** → 添加 bot token scopes（使用下方 manifest）。点击 **Install to Workspace**。复制 **Bot User OAuth Token**（`xoxb-...`）。
4. 可选：**OAuth & Permissions** → 添加 **User Token Scopes**（见下方只读列表）。重新安装应用并复制 **User OAuth Token**（`xoxp-...`）。
5. **Event Subscriptions** → 启用事件并订阅：
   - `message.*`（包含编辑/删除/线程广播）
   - `app_mention`
   - `reaction_added`、`reaction_removed`
   - `member_joined_channel`、`member_left_channel`
   - `channel_rename`
   - `pin_added`、`pin_removed`
6. 邀请 bot 进入你希望它读取的频道。
7. Slash Commands → 若使用 `channels.slack.slashCommand`，创建 `/openclaw`。若启用原生命令，请为每个内置命令添加一个 slash command（与 `/help` 列表同名）。Slack 的原生命令默认关闭，除非设置 `channels.slack.commands.native: true`（全局 `commands.native` 为 `"auto"`，Slack 保持关闭）。
8. App Home → 启用 **Messages Tab**，便于用户 DM bot。

建议使用下方 manifest，保证 scopes 与事件保持同步。

多账号支持：使用 `channels.slack.accounts` 配置各账号 token 与可选 `name`。参见 [`gateway/configuration`](/zh/gateway/configuration#telegramaccounts--discordaccounts--slackaccounts--signalaccounts--imessageaccounts) 的通用模式。

### OpenClaw 配置（最小）

通过环境变量设置 token（推荐）：

- `SLACK_APP_TOKEN=xapp-...`
- `SLACK_BOT_TOKEN=xoxb-...`

或使用配置：

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

### User token（可选）

OpenClaw 可使用 Slack user token（`xoxp-...`）进行读取操作（历史、pins、reactions、emoji、成员信息）。默认保持只读：存在 user token 时优先用于读；写仍使用 bot token，除非你显式允许。即使设置了 `userTokenReadOnly: false`，只要 bot token 可用，写操作仍优先使用 bot token。

User token 需在配置文件中设置（无环境变量支持）。多账号时设置 `channels.slack.accounts.<id>.userToken`。

同时配置 bot + app + user token 示例：

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

显式允许 userToken 写入：

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

#### Token 使用方式

- 读操作（历史、reactions 列表、pins 列表、emoji 列表、成员信息、搜索）优先使用 user token；否则使用 bot token。
- 写操作（发送/编辑/删除消息、添加/移除 reactions、pin/unpin、文件上传）默认使用 bot token。若 `userTokenReadOnly: false` 且没有 bot token，OpenClaw 才会回退到 user token。

### 历史上下文

- `channels.slack.historyLimit`（或 `channels.slack.accounts.*.historyLimit`）控制将多少最近频道/群聊消息包装进提示。
- 回退到 `messages.groupChat.historyLimit`。设为 `0` 关闭（默认 50）。

## HTTP 模式（Events API）

当 gateway 可通过 HTTPS 被 Slack 访问（常用于服务器部署）时使用 HTTP webhook 模式。
HTTP 模式使用 Events API + Interactivity + Slash Commands，共用一个请求 URL。

### 设置

1. 创建 Slack 应用并**禁用 Socket Mode**（若只用 HTTP）。
2. **Basic Information** → 复制 **Signing Secret**。
3. **OAuth & Permissions** → 安装应用并复制 **Bot User OAuth Token**（`xoxb-...`）。
4. **Event Subscriptions** → 启用事件并将 **Request URL** 设置为你的 gateway webhook 路径（默认 `/slack/events`）。
5. **Interactivity & Shortcuts** → 启用并设置同样的 **Request URL**。
6. **Slash Commands** → 为命令设置同样的 **Request URL**。

示例请求 URL：
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

多账号 HTTP 模式：设置 `channels.slack.accounts.<id>.mode = "http"` 并为每个账号提供唯一
`webhookPath`，以便各 Slack 应用指向不同 URL。

### Manifest（可选）

使用此 Slack app manifest 快速创建应用（可调整名称/命令）。若计划配置 user token，请包含 user scopes。

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

若启用原生命令，请为每个命令添加一个 `slash_commands` 条目（与 `/help` 列表一致）。可用 `channels.slack.commands.native` 覆盖。

## Scopes（当前 vs 可选）

Slack Conversations API 是按类型授权的：你只需要实际触达的会话类型 scopes（channels、groups、im、mpim）。概览见：
https://docs.slack.dev/apis/web-api/using-the-conversations-api/

### Bot token scopes（必需）

- `chat:write`（通过 `chat.postMessage` 发送/更新/删除消息）
  https://docs.slack.dev/reference/methods/chat.postMessage
- `im:write`（通过 `conversations.open` 打开 DM）
  https://docs.slack.dev/reference/methods/conversations.open
- `channels:history`、`groups:history`、`im:history`、`mpim:history`
  https://docs.slack.dev/reference/methods/conversations.history
- `channels:read`、`groups:read`、`im:read`、`mpim:read`
  https://docs.slack.dev/reference/methods/conversations.info
- `users:read`（用户查询）
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

### User token scopes（可选，默认只读）

若配置 `channels.slack.userToken`，在 **User Token Scopes** 中添加：

- `channels:history`、`groups:history`、`im:history`、`mpim:history`
- `channels:read`、`groups:read`、`im:read`、`mpim:read`
- `users:read`
- `reactions:read`
- `pins:read`
- `emoji:read`
- `search:read`

### 当前不需要（但可能未来需要）

- `mpim:write`（仅当我们加入通过 `conversations.open` 打开群 DM 时）
- `groups:write`（仅当我们加入私有频道管理：创建/重命名/邀请/归档）
- `chat:write.public`（仅当我们要向 bot 未加入的频道发消息）
  https://docs.slack.dev/reference/scopes/chat.write.public
- `users:read.email`（仅当需要 `users.info` 的 email 字段）
  https://docs.slack.dev/changelog/2017-04-narrowing-email-access
- `files:read`（仅当我们开始列出/读取文件元数据）

## 配置

Slack 使用 Socket Mode（无 HTTP webhook 服务器）。需要提供两个 token：

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

Tokens 也可通过环境变量提供：

- `SLACK_BOT_TOKEN`
- `SLACK_APP_TOKEN`

Ack reaction 由 `messages.ackReaction` + `messages.ackReactionScope` 全局控制。
使用 `messages.removeAckAfterReply` 在 bot 回复后清除 ack reaction。

## 限制

- 出站文本按 `channels.slack.textChunkLimit` 分块（默认 4000）。
- 可选按段落分块：设置 `channels.slack.chunkMode="newline"`，先按空行分段再分块。
- 媒体上传上限为 `channels.slack.mediaMaxMb`（默认 20）。

## 回复线程

默认情况下，OpenClaw 在主频道回复。使用 `channels.slack.replyToMode` 控制自动线程：

| 模式    | 行为                                                               |
| ------- | ------------------------------------------------------------------ |
| `off`   | **默认。** 主频道回复。只有触发消息在已有线程中时才在线程回复。    |
| `first` | 首条回复在线程中，后续回复回主频道。适合保留上下文又避免线程过多。 |
| `all`   | 所有回复都在同一线程中。对话更集中，但可见性可能降低。             |

该模式对自动回复与 agent 工具调用（`slack sendMessage`）均生效。

### 按聊天类型线程

通过 `channels.slack.replyToModeByChatType` 可为不同聊天类型配置不同线程行为：

```json5
{
  channels: {
    slack: {
      replyToMode: "off", // 频道默认
      replyToModeByChatType: {
        direct: "all", // 私聊总是在线程
        group: "first", // 群 DM/MPIM 首条线程
      },
    },
  },
}
```

支持的聊天类型：

- `direct`：1:1 私聊（Slack `im`）
- `group`：群 DM / MPIM（Slack `mpim`）
- `channel`：标准频道（公开/私有）

优先级：

1. `replyToModeByChatType.<chatType>`
2. `replyToMode`
3. Provider 默认（`off`）

旧版 `channels.slack.dm.replyToMode` 仍可作为 `direct` 的回退，当未设置 chat-type 覆盖时生效。

示例：

仅线程私聊：

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

线程群 DM，频道保持主频道：

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

频道在线程，DM 在主频道：

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

### 手动线程标签

如需精细控制，可在 agent 输出中使用以下标签：

- `[[reply_to_current]]` — 回复触发消息（开始/继续线程）。
- `[[reply_to:<id>]]` — 回复指定消息 id。

## 会话 + 路由

- 私聊共享 `main` 会话（与 WhatsApp/Telegram 类似）。
- 频道映射为 `agent:<agentId>:slack:channel:<channelId>` 会话。
- Slash 命令使用 `agent:<agentId>:slack:slash:<userId>` 会话（前缀可通过 `channels.slack.slashCommand.sessionPrefix` 配置）。
- 若 Slack 未提供 `channel_type`，OpenClaw 会根据频道 ID 前缀（`D`、`C`、`G`）推断，默认 `channel` 以保持会话 key 稳定。
- 原生命令注册使用 `commands.native`（全局默认 `"auto"` → Slack 关闭），可通过 `channels.slack.commands.native` 覆盖。文本命令需独立 `/...` 消息，可用 `commands.text: false` 关闭。Slack slash commands 由 Slack 应用管理，不会自动移除。可用 `commands.useAccessGroups: false` 跳过命令的 access-group 检查。
- 完整命令列表与配置见 [斜杠命令](/zh/tools/slash-commands)

## DM 安全（配对）

- 默认：`channels.slack.dm.policy="pairing"` — 未知私聊发送者会收到配对码（1 小时过期）。
- 批准命令：`openclaw pairing approve slack <code>`。
- 允许任何人：`channels.slack.dm.policy="open"` 且 `channels.slack.dm.allowFrom=["*"]`。
- `channels.slack.dm.allowFrom` 支持用户 ID、@handle 或邮箱（启动时在 token 允许时解析）。向导接受用户名并在 token 允许时解析为 id。

## 群策略

- `channels.slack.groupPolicy` 控制频道处理（`open|disabled|allowlist`）。
- `allowlist` 需要在 `channels.slack.channels` 中列出频道。
- 若你只设置 `SLACK_BOT_TOKEN`/`SLACK_APP_TOKEN` 而未创建 `channels.slack` 配置块，
  运行时会将 `groupPolicy` 默认为 `open`。添加 `channels.slack.groupPolicy`、
  `channels.defaults.groupPolicy` 或频道 allowlist 以锁定。
- 配置向导接受 `#channel` 名称并在可能时解析为 ID（公开 + 私有）；若存在多个匹配，优先当前活跃频道。
- 启动时，OpenClaw 会将 allowlist 中的频道/用户名称解析为 ID（token 允许时）并记录映射；无法解析的条目保留原样。
- 若要**禁止所有频道**，设置 `channels.slack.groupPolicy: "disabled"`（或保持空 allowlist）。

频道选项（`channels.slack.channels.<id>` 或 `channels.slack.channels.<name>`）：

- `allow`：当 `groupPolicy="allowlist"` 时允许/拒绝频道。
- `requireMention`：频道提及门控。
- `tools`：可选频道级工具策略覆盖（`allow`/`deny`/`alsoAllow`）。
- `toolsBySender`：频道内发送者工具策略覆盖（key 为发送者 id/@handle/email；支持 `"*"` 通配）。
- `allowBots`：允许 bot 发送的消息（默认：false）。
- `users`：可选频道用户 allowlist。
- `skills`：技能过滤（省略=所有技能，空=无技能）。
- `systemPrompt`：频道额外系统提示（与主题/目的合并）。
- `enabled`：设为 `false` 禁用频道。

## 投递目标

用于 cron/CLI 发送：

- `user:<id>` 用于私聊
- `channel:<id>` 用于频道

## 工具动作

Slack 工具动作可通过 `channels.slack.actions.*` 门控：

| 动作组     | 默认    | 说明                   |
| ---------- | ------- | ---------------------- |
| reactions  | enabled | React + list reactions |
| messages   | enabled | 读/发/编辑/删除        |
| pins       | enabled | 置顶/取消置顶/列表     |
| memberInfo | enabled | 成员信息               |
| emojiList  | enabled | 自定义 emoji 列表      |

## 安全说明

- 写操作默认使用 bot token，确保改动限定在应用 bot 权限/身份下。
- 设置 `userTokenReadOnly: false` 会在 bot token 不可用时使用 user token 写入，这意味着操作以安装者权限执行。请将 user token 视为高权限，并严格收紧 action gates 与 allowlist。
- 若启用 user-token 写入，请确保 user token 包含所需写权限（`chat:write`、`reactions:write`、`pins:write`、`files:write`），否则写操作会失败。

## 备注

- 提及门控通过 `channels.slack.channels` 控制（将 `requireMention` 设为 `true`）；`agents.list[].groupChat.mentionPatterns`（或 `messages.groupChat.mentionPatterns`）也会被视为提及。
- 多 agent 覆盖：在 `agents.list[].groupChat.mentionPatterns` 中设置每个 agent 的模式。
- Reaction 通知遵循 `channels.slack.reactionNotifications`（`allowlist` 模式使用 `reactionAllowlist`）。
- Bot 发送的消息默认忽略；可通过 `channels.slack.allowBots` 或 `channels.slack.channels.<id>.allowBots` 启用。
- 警告：若允许回复其他 bot（`channels.slack.allowBots=true` 或 `channels.slack.channels.<id>.allowBots=true`），请通过 `requireMention`、`channels.slack.channels.<id>.users` allowlist，和/或 `AGENTS.md`、`SOUL.md` 的 guardrails 防止 bot-to-bot 循环。
- Slack 工具中 reaction 移除语义见 [/tools/reactions](/zh/tools/reactions)。
- 附件在允许且未超限时会下载到媒体存储。
