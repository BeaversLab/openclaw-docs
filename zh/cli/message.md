---
summary: "`openclaw message` 的 CLI 参考（发送 + 频道操作）"
read_when:
  - 添加或修改 message CLI 行为时
  - 调整出站频道行为时
title: "message"
---

# `openclaw message`

用于发送消息与执行频道操作的统一出站命令
（Discord/Google Chat/Slack/Mattermost（插件）/Telegram/WhatsApp/Signal/iMessage/MS Teams）。

## 用法

```
openclaw message <subcommand> [flags]
```

频道选择：
- 若配置了多个频道，需要 `--channel`。
- 若仅配置一个频道，则它会成为默认。
- 可选值：`whatsapp|telegram|discord|googlechat|slack|mattermost|signal|imessage|msteams`（Mattermost 需要插件）

目标格式（`--target`）：
- WhatsApp：E.164 或群组 JID
- Telegram：chat id 或 `@username`
- Discord：`channel:<id>` 或 `user:<id>`（或 `<@id>` 提及；纯数字 id 会被视为频道）
- Google Chat：`spaces/<spaceId>` 或 `users/<userId>`
- Slack：`channel:<id>` 或 `user:<id>`（纯频道 id 也可用）
- Mattermost（插件）：`channel:<id>`、`user:<id>` 或 `@username`（裸 id 视为频道）
- Signal：`+E.164`、`group:<id>`、`signal:+E.164`、`signal:group:<id>` 或 `username:<name>`/`u:<name>`
- iMessage：handle、`chat_id:<id>`、`chat_guid:<guid>` 或 `chat_identifier:<id>`
- MS Teams：conversation id（`19:...@thread.tacv2`）或 `conversation:<id>` 或 `user:<aad-object-id>`

名称查找：
- 对支持的提供商（Discord/Slack 等），`Help` 或 `#help` 等频道名会通过目录缓存解析。
- 缓存未命中时，若提供商支持，OpenClaw 会尝试实时目录查找。

## 常用标志

- `--channel <name>`
- `--account <id>`
- `--target <dest>`（send/poll/read 等的目标频道或用户）
- `--targets <name>`（可重复；仅广播使用）
- `--json`
- `--dry-run`
- `--verbose`

## Actions

### Core

- `send`
  - Channels：WhatsApp/Telegram/Discord/Google Chat/Slack/Mattermost（插件）/Signal/iMessage/MS Teams
  - 必需：`--target`，以及 `--message` 或 `--media`
  - 可选：`--media`、`--reply-to`、`--thread-id`、`--gif-playback`
  - Telegram 专用：`--buttons`（需要 `channels.telegram.capabilities.inlineButtons` 允许）
  - Telegram 专用：`--thread-id`（forum topic id）
  - Slack 专用：`--thread-id`（thread timestamp；`--reply-to` 使用同一字段）
  - WhatsApp 专用：`--gif-playback`

- `poll`
  - Channels：WhatsApp/Discord/MS Teams
  - 必需：`--target`、`--poll-question`、`--poll-option`（可重复）
  - 可选：`--poll-multi`
  - Discord 专用：`--poll-duration-hours`、`--message`

- `react`
  - Channels：Discord/Google Chat/Slack/Telegram/WhatsApp/Signal
  - 必需：`--message-id`、`--target`
  - 可选：`--emoji`、`--remove`、`--participant`、`--from-me`、`--target-author`、`--target-author-uuid`
  - 说明：`--remove` 需要 `--emoji`（在支持的地方可省略 `--emoji` 清除自己的反应；见 /zh/tools/reactions）
  - WhatsApp 专用：`--participant`、`--from-me`
  - Signal 群组反应：必须提供 `--target-author` 或 `--target-author-uuid`

- `reactions`
  - Channels：Discord/Google Chat/Slack
  - 必需：`--message-id`、`--target`
  - 可选：`--limit`

- `read`
  - Channels：Discord/Slack
  - 必需：`--target`
  - 可选：`--limit`、`--before`、`--after`
  - Discord 专用：`--around`

- `edit`
  - Channels：Discord/Slack
  - 必需：`--message-id`、`--message`、`--target`

- `delete`
  - Channels：Discord/Slack/Telegram
  - 必需：`--message-id`、`--target`

- `pin` / `unpin`
  - Channels：Discord/Slack
  - 必需：`--message-id`、`--target`

- `pins`（列表）
  - Channels：Discord/Slack
  - 必需：`--target`

- `permissions`
  - Channels：Discord
  - 必需：`--target`

- `search`
  - Channels：Discord
  - 必需：`--guild-id`、`--query`
  - 可选：`--channel-id`、`--channel-ids`（可重复）、`--author-id`、`--author-ids`（可重复）、`--limit`

### Threads

- `thread create`
  - Channels：Discord
  - 必需：`--thread-name`、`--target`（频道 id）
  - 可选：`--message-id`、`--auto-archive-min`

- `thread list`
  - Channels：Discord
  - 必需：`--guild-id`
  - 可选：`--channel-id`、`--include-archived`、`--before`、`--limit`

- `thread reply`
  - Channels：Discord
  - 必需：`--target`（thread id）、`--message`
  - 可选：`--media`、`--reply-to`

### Emojis

- `emoji list`
  - Discord：`--guild-id`
  - Slack：无需额外标志

- `emoji upload`
  - Channels：Discord
  - 必需：`--guild-id`、`--emoji-name`、`--media`
  - 可选：`--role-ids`（可重复）

### Stickers

- `sticker send`
  - Channels：Discord
  - 必需：`--target`、`--sticker-id`（可重复）
  - 可选：`--message`

- `sticker upload`
  - Channels：Discord
  - 必需：`--guild-id`、`--sticker-name`、`--sticker-desc`、`--sticker-tags`、`--media`

### Roles / Channels / Members / Voice

- `role info`（Discord）：`--guild-id`
- `role add` / `role remove`（Discord）：`--guild-id`、`--user-id`、`--role-id`
- `channel info`（Discord）：`--target`
- `channel list`（Discord）：`--guild-id`
- `member info`（Discord/Slack）：`--user-id`（Discord 还需 `--guild-id`）
- `voice status`（Discord）：`--guild-id`、`--user-id`

### Events

- `event list`（Discord）：`--guild-id`
- `event create`（Discord）：`--guild-id`、`--event-name`、`--start-time`
  - 可选：`--end-time`、`--desc`、`--channel-id`、`--location`、`--event-type`

### Moderation（Discord）

- `timeout`：`--guild-id`、`--user-id`（可选 `--duration-min` 或 `--until`；两者都省略则清除超时）
- `kick`：`--guild-id`、`--user-id`（+ `--reason`）
- `ban`：`--guild-id`、`--user-id`（+ `--delete-days`、`--reason`）
  - `timeout` 也支持 `--reason`

### Broadcast

- `broadcast`
  - Channels：任意已配置频道；用 `--channel all` 以覆盖所有提供商
  - 必需：`--targets`（可重复）
  - 可选：`--message`、`--media`、`--dry-run`

## 示例

发送 Discord 回复：
```
openclaw message send --channel discord \
  --target channel:123 --message "hi" --reply-to 456
```

创建 Discord 投票：
```
openclaw message poll --channel discord \
  --target channel:123 \
  --poll-question "Snack?" \
  --poll-option Pizza --poll-option Sushi \
  --poll-multi --poll-duration-hours 48
```

发送 Teams 主动消息：
```
openclaw message send --channel msteams \
  --target conversation:19:abc@thread.tacv2 --message "hi"
```

创建 Teams 投票：
```
openclaw message poll --channel msteams \
  --target conversation:19:abc@thread.tacv2 \
  --poll-question "Lunch?" \
  --poll-option Pizza --poll-option Sushi
```

Slack 中 react：
```
openclaw message react --channel slack \
  --target C123 --message-id 456 --emoji "✅"
```

在 Signal 群组中 react：
```
openclaw message react --channel signal \
  --target signal:group:abc123 --message-id 1737630212345 \
  --emoji "✅" --target-author-uuid 123e4567-e89b-12d3-a456-426614174000
```

发送 Telegram inline buttons：
```
openclaw message send --channel telegram --target @mychat --message "Choose:" \
  --buttons '[ [{"text":"Yes","callback_data":"cmd:yes"}], [{"text":"No","callback_data":"cmd:no"}] ]'
```
