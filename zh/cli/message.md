---
summary: "CLI 参考，用于 `openclaw message`（发送 + 频道操作）"
read_when:
  - Adding or modifying message CLI actions
  - Changing outbound channel behavior
title: "message"
---

# `openclaw message`

用于发送消息和执行频道操作的单个出站命令
(Discord/Google Chat/Slack/Mattermost (插件)/Telegram/WhatsApp/Signal/iMessage/MS Teams)。

## 用法

```
openclaw message <subcommand> [flags]
```

频道选择：

- `--channel` 如果配置了多个频道则为必需项。
- 如果恰好配置了一个频道，它将成为默认频道。
- 取值：`whatsapp|telegram|discord|googlechat|slack|mattermost|signal|imessage|msteams`（Mattermost 需要插件）

目标格式（`--target`）：

- WhatsApp：E.164 或群组 JID
- Telegram：chat id 或 `@username`
- Discord：`channel:<id>` 或 `user:<id>`（或 `<@id>` 提及；原始数字 ID 被视为频道）
- Google Chat：`spaces/<spaceId>` 或 `users/<userId>`
- Slack：`channel:<id>` 或 `user:<id>`（接受原始频道 ID）
- Mattermost（插件）：`channel:<id>`、`user:<id>` 或 `@username`（纯 ID 被视为频道）
- Signal：`+E.164`、`group:<id>`、`signal:+E.164`、`signal:group:<id>` 或 `username:<name>`/`u:<name>`
- iMessage：handle、`chat_id:<id>`、`chat_guid:<guid>` 或 `chat_identifier:<id>`
- MS Teams：对话 id（`19:...@thread.tacv2`）或 `conversation:<id>` 或 `user:<aad-object-id>`

名称查找：

- 对于受支持的提供商（Discord/Slack 等），诸如 `Help` 或 `#help` 之类的频道名称会通过目录缓存进行解析。
- 如果缓存未命中，当提供商支持时，OpenClaw 将尝试实时目录查找。

## 通用标志

- `--channel <name>`
- `--account <id>`
- `--target <dest>`（用于发送/轮询/读取等的目标频道或用户）
- `--targets <name>`（可重复；仅限广播）
- `--json`
- `--dry-run`
- `--verbose`

## 操作

### 核心

- `send`
  - 频道：WhatsApp/Telegram/Discord/Google Chat/Slack/Mattermost (plugin)/Signal/iMessage/MS Teams
  - 必需：`--target`，外加 `--message` 或 `--media`
  - 可选：`--media`，`--reply-to`，`--thread-id`，`--gif-playback`
  - 仅限 Telegram：`--buttons`（需要 `channels.telegram.capabilities.inlineButtons` 允许该操作）
  - 仅限 Telegram：`--thread-id`（论坛主题 id）
  - 仅限 Slack：`--thread-id`（线程时间戳；`--reply-to` 使用同一字段）
  - 仅限 WhatsApp：`--gif-playback`

- `poll`
  - 频道：WhatsApp/Telegram/Discord/Matrix/MS Teams
  - 必需：`--target`，`--poll-question`，`--poll-option`（可重复）
  - 可选：`--poll-multi`
  - 仅限 Discord：`--poll-duration-hours`，`--silent`，`--message`
  - 仅限 Telegram：`--poll-duration-seconds` (5-600)，`--silent`，`--poll-anonymous` / `--poll-public`，`--thread-id`

- `react`
  - 频道：Discord/Google Chat/Slack/Telegram/WhatsApp/Signal
  - 必需：`--message-id`，`--target`
  - 可选：`--emoji`，`--remove`，`--participant`，`--from-me`，`--target-author`，`--target-author-uuid`
  - 注意：`--remove` 需要 `--emoji`（如果支持，省略 `--emoji` 以清除自己的表情回应；参见 /tools/reactions）
  - 仅限 WhatsApp：`--participant`，`--from-me`
  - Signal 群组表情回应：需要 `--target-author` 或 `--target-author-uuid`

- `reactions`
  - 频道：Discord/Google Chat/Slack
  - 必需：`--message-id`，`--target`
  - 可选：`--limit`

- `read`
  - 频道：Discord/Slack
  - 必需：`--target`
  - 可选：`--limit`，`--before`，`--after`
  - 仅限 Discord：`--around`

- `edit`
  - 频道：Discord/Slack
  - 必需：`--message-id`，`--message`，`--target`

- `delete`
  - 频道：Discord/Slack/Telegram
  - 必需：`--message-id`，`--target`

- `pin` / `unpin`
  - 频道：Discord/Slack
  - 必需：`--message-id`，`--target`

- `pins`（列表）
  - 频道：Discord/Slack
  - 必需：`--target`

- `permissions`
  - 频道：Discord
  - 必需：`--target`

- `search`
  - 频道：Discord
  - 必需：`--guild-id`，`--query`
  - 可选：`--channel-id`，`--channel-ids`（重复），`--author-id`，`--author-ids`（重复），`--limit`

### 主题 (Threads)

- `thread create`
  - 频道：Discord
  - 必需：`--thread-name`，`--target`（频道 ID）
  - 可选：`--message-id`，`--message`，`--auto-archive-min`

- `thread list`
  - 渠道：Discord
  - 必填：`--guild-id`
  - 可选：`--channel-id`，`--include-archived`，`--before`，`--limit`

- `thread reply`
  - 渠道：Discord
  - 必填：`--target`（线程 ID），`--message`
  - 可选：`--media`，`--reply-to`

### 表情符号 (Emojis)

- `emoji list`
  - Discord：`--guild-id`
  - Slack：无额外标志

- `emoji upload`
  - 渠道：Discord
  - 必填：`--guild-id`，`--emoji-name`，`--media`
  - 可选：`--role-ids`（可重复）

### 贴纸 (Stickers)

- `sticker send`
  - 渠道：Discord
  - 必填：`--target`，`--sticker-id`（可重复）
  - 可选：`--message`

- `sticker upload`
  - 渠道：Discord
  - 必填：`--guild-id`，`--sticker-name`，`--sticker-desc`，`--sticker-tags`，`--media`

### 角色 / 频道 / 成员 / 语音 (Roles / Channels / Members / Voice)

- `role info`（Discord）：`--guild-id`
- `role add` / `role remove`（Discord）：`--guild-id`，`--user-id`，`--role-id`
- `channel info`（Discord）：`--target`
- `channel list`（Discord）：`--guild-id`
- `member info`（Discord/Slack）：`--user-id`（Discord 需 + `--guild-id`）
- `voice status`（Discord）：`--guild-id`，`--user-id`

### 事件

- `event list`（Discord）：`--guild-id`
- `event create` (Discord): `--guild-id`, `--event-name`, `--start-time`
  - 可选: `--end-time`, `--desc`, `--channel-id`, `--location`, `--event-type`

### 审核 (Discord)

- `timeout`: `--guild-id`, `--user-id` (可选 `--duration-min` 或 `--until`; 省略两者以清除超时)
- `kick`: `--guild-id`, `--user-id` (+ `--reason`)
- `ban`: `--guild-id`, `--user-id` (+ `--delete-days`, `--reason`)
  - `timeout` 也支持 `--reason`

### 广播

- `broadcast`
  - Channels: any configured channel; use `--channel all` to target all providers
  - Required: `--targets` (repeat)
  - Optional: `--message`, `--media`, `--dry-run`

## 示例

发送 Discord 回复:

```
openclaw message send --channel discord \
  --target channel:123 --message "hi" --reply-to 456
```

发送带有组件的 Discord 消息:

```
openclaw message send --channel discord \
  --target channel:123 --message "Choose:" \
  --components '{"text":"Choose a path","blocks":[{"type":"actions","buttons":[{"label":"Approve","style":"success"},{"label":"Decline","style":"danger"}]}]}'
```

完整架构请参阅 [Discord 组件](/en/channels/discord#interactive-components)。

创建 Discord 投票:

```
openclaw message poll --channel discord \
  --target channel:123 \
  --poll-question "Snack?" \
  --poll-option Pizza --poll-option Sushi \
  --poll-multi --poll-duration-hours 48
```

创建 Telegram 投票 (2 分钟后自动关闭):

```
openclaw message poll --channel telegram \
  --target @mychat \
  --poll-question "Lunch?" \
  --poll-option Pizza --poll-option Sushi \
  --poll-duration-seconds 120 --silent
```

发送 Teams 主动消息:

```
openclaw message send --channel msteams \
  --target conversation:19:abc@thread.tacv2 --message "hi"
```

创建 Teams 投票:

```
openclaw message poll --channel msteams \
  --target conversation:19:abc@thread.tacv2 \
  --poll-question "Lunch?" \
  --poll-option Pizza --poll-option Sushi
```

在 Slack 中回应:

```
openclaw message react --channel slack \
  --target C123 --message-id 456 --emoji "✅"
```

在 Signal 群组中回应:

```
openclaw message react --channel signal \
  --target signal:group:abc123 --message-id 1737630212345 \
  --emoji "✅" --target-author-uuid 123e4567-e89b-12d3-a456-426614174000
```

发送 Telegram 行内按钮:

```
openclaw message send --channel telegram --target @mychat --message "Choose:" \
  --buttons '[ [{"text":"Yes","callback_data":"cmd:yes"}], [{"text":"No","callback_data":"cmd:no"}] ]'
```

import zh from '/components/footer/zh.mdx';

<zh />
