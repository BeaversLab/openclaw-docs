---
summary: "CLI reference for `openclaw message` (send + 渠道 actions)"
read_when:
  - Adding or modifying message CLI actions
  - Changing outbound 渠道 behavior
title: "message"
---

# `openclaw message`

Single outbound command for sending messages and 渠道 actions
(Discord/Google Chat/Slack/Mattermost (plugin)/Telegram/WhatsApp/Signal/iMessage/MS Teams).

## Usage

```
openclaw message <subcommand> [flags]
```

Channel selection:

- `--channel` required if more than one 渠道 is configured.
- If exactly one 渠道 is configured, it becomes the default.
- Values: `whatsapp|telegram|discord|googlechat|slack|mattermost|signal|imessage|msteams` (Mattermost requires plugin)

Target formats (`--target`):

- WhatsApp: E.164 or group JID
- Telegram: chat id or `@username`
- Discord: `channel:<id>` or `user:<id>` (or `<@id>` mention; raw numeric ids are treated as channels)
- Google Chat: `spaces/<spaceId>` or `users/<userId>`
- Slack: `channel:<id>` or `user:<id>` (raw 渠道 id is accepted)
- Mattermost (plugin): `channel:<id>`, `user:<id>`, or `@username` (bare ids are treated as channels)
- Signal: `+E.164`, `group:<id>`, `signal:+E.164`, `signal:group:<id>`, or `username:<name>`/`u:<name>`
- iMessage: handle, `chat_id:<id>`, `chat_guid:<guid>`, or `chat_identifier:<id>`
- MS Teams: conversation id (`19:...@thread.tacv2`) or `conversation:<id>` or `user:<aad-object-id>`

Name lookup:

- For supported providers (Discord/Slack/etc), 渠道 names like `Help` or `#help` are resolved via the directory cache.
- On cache miss, OpenClaw will attempt a live directory lookup when the 提供商 supports it.

## Common flags

- `--channel <name>`
- `--account <id>`
- `--target <dest>` (target 渠道 or user for send/poll/read/etc)
- `--targets <name>`（重复；仅限广播）
- `--json`
- `--dry-run`
- `--verbose`

## SecretRef 行为

- `openclaw message` 在运行所选操作之前会解析支持的渠道 SecretRef。
- 解析范围在可能的情况下限定为当前操作目标：
  - 当设置了 `--channel` 时（或从带有前缀的目标（如 `discord:...`）推断出时），范围为渠道限定
  - 当设置了 `--account` 时，范围为账户限定（渠道全局变量 + 选定的账户表面）
  - 当省略 `--account` 时，OpenClaw 不会强制 `default` 账户 SecretRef 范围
- 不相关渠道上未解析的 SecretRef 不会阻止针对特定渠道的消息操作。
- 如果所选渠道/账户的 SecretRef 未解析，则该操作的命令将失败并关闭。

## 操作

### 核心

- `send`
  - 渠道：WhatsApp/Telegram/Discord/Google Chat/Slack/Mattermost（插件）/Signal/iMessage/MS Teams
  - 必填：`--target`，外加 `--message` 或 `--media`
  - 可选：`--media`、`--reply-to`、`--thread-id`、`--gif-playback`
  - 仅限 Telegram：`--buttons`（需要 `channels.telegram.capabilities.inlineButtons` 允许使用）
  - 仅限 Telegram：`--force-document`（将图片和 GIF 作为文档发送以避免 Telegram 压缩）
  - 仅限 Telegram：`--thread-id`（论坛主题 ID）
  - 仅限 Slack：`--thread-id`（线程时间戳；`--reply-to` 使用相同的字段）
  - 仅限 WhatsApp：`--gif-playback`

- `poll`
  - 渠道：WhatsApp/Telegram/Discord/Matrix/MS Teams
  - 必填：`--target`、`--poll-question`、`--poll-option`（可重复）
  - 可选：`--poll-multi`
  - 仅限 Discord：`--poll-duration-hours`、`--silent`、`--message`
  - 仅限 Telegram：`--poll-duration-seconds` (5-600), `--silent`, `--poll-anonymous` / `--poll-public`, `--thread-id`

- `react`
  - 频道：Discord/Google Chat/Slack/Telegram/WhatsApp/Signal
  - 必需：`--message-id`, `--target`
  - 可选：`--emoji`, `--remove`, `--participant`, `--from-me`, `--target-author`, `--target-author-uuid`
  - 注意：`--remove` 需要 `--emoji`（如果支持，省略 `--emoji` 以清除自己的反应；参见 /tools/reactions）
  - 仅限 WhatsApp：`--participant`, `--from-me`
  - Signal 组反应：需要 `--target-author` 或 `--target-author-uuid`

- `reactions`
  - 频道：Discord/Google Chat/Slack
  - 必需：`--message-id`, `--target`
  - 可选：`--limit`

- `read`
  - 频道：Discord/Slack
  - 必需：`--target`
  - 可选：`--limit`, `--before`, `--after`
  - 仅限 Discord：`--around`

- `edit`
  - 渠道：Discord/Slack
  - 必需：`--message-id`, `--message`, `--target`

- `delete`
  - 频道：Discord/Slack/Telegram
  - 必需：`--message-id`, `--target`

- `pin` / `unpin`
  - 频道：Discord/Slack
  - 必需：`--message-id`, `--target`

- `pins` (列表)
  - 频道：Discord/Slack
  - 必需：`--target`

- `permissions`
  - 频道：Discord
  - 必需：`--target`

- `search`
  - 渠道：Discord
  - 必填：`--guild-id`，`--query`
  - 可选：`--channel-id`，`--channel-ids` (repeat)，`--author-id`，`--author-ids` (repeat)，`--limit`

### 主题

- `thread create`
  - 渠道：Discord
  - 必填：`--thread-name`，`--target` (渠道 id)
  - 可选：`--message-id`，`--message`，`--auto-archive-min`

- `thread list`
  - 渠道：Discord
  - 必填：`--guild-id`
  - 可选：`--channel-id`，`--include-archived`，`--before`，`--limit`

- `thread reply`
  - 渠道：Discord
  - 必填：`--target` (thread id)，`--message`
  - 可选：`--media`，`--reply-to`

### 表情符号

- `emoji list`
  - Discord：`--guild-id`
  - Slack：无额外标志

- `emoji upload`
  - 频道：Discord
  - 必填：`--guild-id`，`--emoji-name`，`--media`
  - 可选：`--role-ids` (repeat)

### 贴纸

- `sticker send`
  - 渠道：Discord
  - 必填：`--target`，`--sticker-id` (repeat)
  - 可选：`--message`

- `sticker upload`
  - 渠道：Discord
  - 必填：`--guild-id`，`--sticker-name`，`--sticker-desc`，`--sticker-tags`，`--media`

### 角色 / 渠道 / 成员 / 语音

- `role info` (Discord)：`--guild-id`
- `role add` / `role remove` (Discord)：`--guild-id`，`--user-id`，`--role-id`
- `channel info` (Discord)：`--target`
- `channel list` (Discord): `--guild-id`
- `member info` (Discord/Slack): `--user-id` (+ `--guild-id` for Discord)
- `voice status` (Discord): `--guild-id`, `--user-id`

### Events

- `event list` (Discord): `--guild-id`
- `event create` (Discord): `--guild-id`, `--event-name`, `--start-time`
  - 可选: `--end-time`, `--desc`, `--channel-id`, `--location`, `--event-type`

### Moderation (Discord)

- `timeout`: `--guild-id`, `--user-id` (optional `--duration-min` or `--until`; omit both to clear timeout)
- `kick`: `--guild-id`, `--user-id` (+ `--reason`)
- `ban`: `--guild-id`, `--user-id` (+ `--delete-days`, `--reason`)
  - `timeout` also supports `--reason`

### Broadcast

- `broadcast`
  - 渠道: any configured 渠道; use `--channel all` to target all providers
  - Required: `--targets` (repeat)
  - 可选: `--message`, `--media`, `--dry-run`

## Examples

Send a Discord reply:

```
openclaw message send --channel discord \
  --target channel:123 --message "hi" --reply-to 456
```

Send a Discord message with components:

```
openclaw message send --channel discord \
  --target channel:123 --message "Choose:" \
  --components '{"text":"Choose a path","blocks":[{"type":"actions","buttons":[{"label":"Approve","style":"success"},{"label":"Decline","style":"danger"}]}]}'
```

See [Discord components](/zh/channels/discord#interactive-components) for the full schema.

Create a Discord poll:

```
openclaw message poll --channel discord \
  --target channel:123 \
  --poll-question "Snack?" \
  --poll-option Pizza --poll-option Sushi \
  --poll-multi --poll-duration-hours 48
```

Create a Telegram poll (auto-close in 2 minutes):

```
openclaw message poll --channel telegram \
  --target @mychat \
  --poll-question "Lunch?" \
  --poll-option Pizza --poll-option Sushi \
  --poll-duration-seconds 120 --silent
```

Send a Teams proactive message:

```
openclaw message send --channel msteams \
  --target conversation:19:abc@thread.tacv2 --message "hi"
```

Create a Teams poll:

```
openclaw message poll --channel msteams \
  --target conversation:19:abc@thread.tacv2 \
  --poll-question "Lunch?" \
  --poll-option Pizza --poll-option Sushi
```

React in Slack:

```
openclaw message react --channel slack \
  --target C123 --message-id 456 --emoji "✅"
```

React in a Signal group:

```
openclaw message react --channel signal \
  --target signal:group:abc123 --message-id 1737630212345 \
  --emoji "✅" --target-author-uuid 123e4567-e89b-12d3-a456-426614174000
```

Send Telegram inline buttons:

```
openclaw message send --channel telegram --target @mychat --message "Choose:" \
  --buttons '[ [{"text":"Yes","callback_data":"cmd:yes"}], [{"text":"No","callback_data":"cmd:no"}] ]'
```

Send a Telegram image as a document to avoid compression:

```bash
openclaw message send --channel telegram --target @mychat \
  --media ./diagram.png --force-document
```

import zh from "/components/footer/zh.mdx";

<zh />
