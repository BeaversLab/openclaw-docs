---
summary: "CLI 参考，用于 `openclaw message`（发送 + 渠道操作）"
read_when:
  - Adding or modifying message CLI actions
  - Changing outbound channel behavior
title: "message"
---

# `openclaw message`

用于发送消息和渠道操作的单个出站命令
(Discord/Google Chat/Slack/Mattermost (plugin)/Telegram/WhatsApp/Signal/iMessage/Microsoft Teams)。

## 用法

```
openclaw message <subcommand> [flags]
```

频道选择：

- 如果配置了多个渠道，则需要 `--channel`。
- 如果恰好配置了一个频道，它将成为默认频道。
- 值：`whatsapp|telegram|discord|googlechat|slack|mattermost|signal|imessage|msteams`（Mattermost 需要插件）

目标格式 (`--target`)：

- WhatsApp：E.164 或群组 JID
- Telegram：聊天 ID 或 `@username`
- Discord：`channel:<id>` 或 `user:<id>`（或 `<@id>` 提及；原始数字 ID 被视为渠道）
- Google Chat：`spaces/<spaceId>` 或 `users/<userId>`
- Slack：`channel:<id>` 或 `user:<id>`（接受原始渠道 ID）
- Mattermost（插件）：`channel:<id>`、`user:<id>` 或 `@username`（纯 ID 被视为渠道）
- Signal：`+E.164`、`group:<id>`、`signal:+E.164`、`signal:group:<id>` 或 `username:<name>`/`u:<name>`
- iMessage：handle、`chat_id:<id>`、`chat_guid:<guid>` 或 `chat_identifier:<id>`
- Microsoft Teams：对话 ID (`19:...@thread.tacv2`) 或 `conversation:<id>` 或 `user:<aad-object-id>`

名称查找：

- 对于受支持的提供商（Discord/Slack/etc），诸如 `Help` 或 `#help` 之类的渠道名称将通过目录缓存进行解析。
- 如果缓存未命中，当提供商支持时，OpenClaw 将尝试实时目录查找。

## 通用标志

- `--channel <name>`
- `--account <id>`
- `--target <dest>`（用于发送/轮询/读取等的目标渠道或用户）
- `--targets <name>`（重复；仅限广播）
- `--json`
- `--dry-run`
- `--verbose`

## SecretRef 行为

- `openclaw message` 会在运行所选操作之前解析受支持的渠道 SecretRef。
- 解析范围尽可能限定为当前操作的目标：
  - 设置 `--channel` 时限定为渠道范围（或从带前缀的目标如 `discord:...` 推断）
  - 设置 `--account` 时限定为账户范围（渠道全局变量 + 所选账户接口）
  - 如果省略 `--account`，OpenClaw 不会强制 `default` 账户 SecretRef 的作用域
- 不相关渠道上未解析的 SecretRef 不会阻止针对特定渠道的消息操作。
- 如果所选渠道/账户的 SecretRef 未解析，该命令将在该操作上以失败方式关闭（fail closed）。

## 操作

### 核心

- `send`
  - 渠道：WhatsApp/Telegram/Discord/Google Chat/Slack/Mattermost (plugin)/Signal/iMessage/Microsoft Teams
  - 必需：`--target`，以及 `--message` 或 `--media`
  - 可选：`--media`、`--reply-to`、`--thread-id`、`--gif-playback`
  - 仅限 Telegram：`--buttons`（需要 `channels.telegram.capabilities.inlineButtons` 允许）
  - 仅限 Telegram：`--force-document`（将图片和 GIF 作为文档发送以避免 Telegram 压缩）
  - 仅限 Telegram：`--thread-id`（论坛主题 ID）
  - 仅限 Slack：`--thread-id`（线程时间戳；`--reply-to` 使用同一字段）
  - 仅限 WhatsApp：`--gif-playback`

- `poll`
  - 渠道：WhatsApp/Telegram/Discord/Matrix/Microsoft Teams
  - 必需：`--target`、`--poll-question`、`--poll-option`（可重复）
  - 可选：`--poll-multi`
  - 仅限 Discord：`--poll-duration-hours`、`--silent`、`--message`
  - 仅限 Telegram：`--poll-duration-seconds` (5-600)、`--silent`、`--poll-anonymous` / `--poll-public`、`--thread-id`

- `react`
  - 频道：Discord/Google Chat/Slack/Telegram/WhatsApp/Signal
  - 必需：`--message-id`、`--target`
  - 可选：`--emoji`、`--remove`、`--participant`、`--from-me`、`--target-author`、`--target-author-uuid`
  - 注意：`--remove` 需要 `--emoji`（如果支持，省略 `--emoji` 以清除自己的反应；请参阅 /tools/reactions）
  - 仅限 WhatsApp：`--participant`、`--from-me`
  - Signal 群组反应：必需 `--target-author` 或 `--target-author-uuid`

- `reactions`
  - 频道：Discord/Google Chat/Slack
  - 必需：`--message-id`、`--target`
  - 可选：`--limit`

- `read`
  - 频道：Discord/Slack
  - 必需：`--target`
  - 可选：`--limit`、`--before`、`--after`
  - 仅限 Discord：`--around`

- `edit`
  - 频道：Discord/Slack
  - 必需：`--message-id`、`--message`、`--target`

- `delete`
  - 频道：Discord/Slack/Telegram
  - 必需：`--message-id`、`--target`

- `pin` / `unpin`
  - 频道：Discord/Slack
  - 必需：`--message-id`、`--target`

- `pins` (列表)
  - 频道：Discord/Slack
  - 必需：`--target`

- `permissions`
  - 渠道：Discord
  - 必填：`--target`

- `search`
  - 渠道：Discord
  - 必填：`--guild-id`, `--query`
  - 可选：`--channel-id`, `--channel-ids` (repeat), `--author-id`, `--author-ids` (repeat), `--limit`

### Threads

- `thread create`
  - 渠道：Discord
  - 必填：`--thread-name`, `--target` (渠道 id)
  - 可选：`--message-id`, `--message`, `--auto-archive-min`

- `thread list`
  - 渠道：Discord
  - 必填：`--guild-id`
  - 可选：`--channel-id`, `--include-archived`, `--before`, `--limit`

- `thread reply`
  - 渠道：Discord
  - 必填：`--target` (thread id), `--message`
  - 可选：`--media`, `--reply-to`

### Emojis

- `emoji list`
  - Discord: `--guild-id`
  - Slack: no extra flags

- `emoji upload`
  - 渠道：Discord
  - 必填：`--guild-id`, `--emoji-name`, `--media`
  - 可选：`--role-ids` (repeat)

### Stickers

- `sticker send`
  - 渠道：Discord
  - 必填：`--target`, `--sticker-id` (repeat)
  - 可选：`--message`

- `sticker upload`
  - 渠道：Discord
  - 必填：`--guild-id`, `--sticker-name`, `--sticker-desc`, `--sticker-tags`, `--media`

### Roles / Channels / Members / Voice

- `role info` (Discord): `--guild-id`
- `role add` / `role remove` (Discord): `--guild-id`, `--user-id`, `--role-id`
- `channel info` (Discord): `--target`
- `channel list` (Discord): `--guild-id`
- `member info` (Discord/Slack): `--user-id` (+ `--guild-id` 用于 Discord)
- `voice status` (Discord): `--guild-id`, `--user-id`

### 事件

- `event list` (Discord): `--guild-id`
- `event create` (Discord): `--guild-id`, `--event-name`, `--start-time`
  - 可选：`--end-time`, `--desc`, `--channel-id`, `--location`, `--event-type`

### 管理 (Discord)

- `timeout`: `--guild-id`, `--user-id` (可选 `--duration-min` 或 `--until`; 省略两者以清除超时)
- `kick`: `--guild-id`, `--user-id` (+ `--reason`)
- `ban`: `--guild-id`, `--user-id` (+ `--delete-days`, `--reason`)
  - `timeout` 也支持 `--reason`

### 广播

- `broadcast`
  - 渠道：任何已配置的渠道；使用 `--channel all` 来定位所有提供商
  - 必填：`--targets` (可重复)
  - 可选：`--message`, `--media`, `--dry-run`

## 示例

发送 Discord 回复：

```
openclaw message send --channel discord \
  --target channel:123 --message "hi" --reply-to 456
```

发送带有组件的 Discord 消息：

```
openclaw message send --channel discord \
  --target channel:123 --message "Choose:" \
  --components '{"text":"Choose a path","blocks":[{"type":"actions","buttons":[{"label":"Approve","style":"success"},{"label":"Decline","style":"danger"}]}]}'
```

有关完整架构，请参阅 [Discord 组件](/zh/channels/discord#interactive-components)。

创建 Discord 投票：

```
openclaw message poll --channel discord \
  --target channel:123 \
  --poll-question "Snack?" \
  --poll-option Pizza --poll-option Sushi \
  --poll-multi --poll-duration-hours 48
```

创建 Telegram 投票（2 分钟后自动关闭）：

```
openclaw message poll --channel telegram \
  --target @mychat \
  --poll-question "Lunch?" \
  --poll-option Pizza --poll-option Sushi \
  --poll-duration-seconds 120 --silent
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

在 Slack 中做出反应：

```
openclaw message react --channel slack \
  --target C123 --message-id 456 --emoji "✅"
```

在 Signal 群组中做出反应：

```
openclaw message react --channel signal \
  --target signal:group:abc123 --message-id 1737630212345 \
  --emoji "✅" --target-author-uuid 123e4567-e89b-12d3-a456-426614174000
```

发送 Telegram 内联按钮：

```
openclaw message send --channel telegram --target @mychat --message "Choose:" \
  --buttons '[ [{"text":"Yes","callback_data":"cmd:yes"}], [{"text":"No","callback_data":"cmd:no"}] ]'
```

将 Telegram 图片作为文档发送以避免压缩：

```bash
openclaw message send --channel telegram --target @mychat \
  --media ./diagram.png --force-document
```
