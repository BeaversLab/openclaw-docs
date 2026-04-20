---
summary: "CLI 参考，适用于 `openclaw message` (发送 + 渠道操作)"
read_when:
  - Adding or modifying message CLI actions
  - Changing outbound channel behavior
title: "message"
---

# `openclaw message`

用于发送消息和渠道操作的单个出站命令
(Discord/Google Chat/iMessage/Matrix/Mattermost (plugin)/Microsoft Teams/Signal/Slack/Telegram/WhatsApp)。

## 用法

```
openclaw message <subcommand> [flags]
```

频道选择：

- 如果配置了多个渠道，则 `--channel` 是必填的。
- 如果恰好配置了一个频道，它将成为默认频道。
- 取值：`discord|googlechat|imessage|matrix|mattermost|msteams|signal|slack|telegram|whatsapp` (Mattermost 需要插件)

目标格式 (`--target`)：

- WhatsApp：E.164 或群组 JID
- Telegram：聊天 ID 或 `@username`
- Discord：`channel:<id>` 或 `user:<id>` (或 `<@id>` 提及；原始数字 ID 将被视为渠道)
- Google Chat：`spaces/<spaceId>` 或 `users/<userId>`
- Slack：`channel:<id>` 或 `user:<id>` (接受原始渠道 ID)
- Mattermost (插件)：`channel:<id>`、`user:<id>` 或 `@username` (裸 ID 将被视为渠道)
- Signal：`+E.164`、`group:<id>`、`signal:+E.164`、`signal:group:<id>` 或 `username:<name>`/`u:<name>`
- iMessage：handle、`chat_id:<id>`、`chat_guid:<guid>` 或 `chat_identifier:<id>`
- Matrix：`@user:server`、`!room:server` 或 `#alias:server`
- Microsoft Teams：会话 ID (`19:...@thread.tacv2`) 或 `conversation:<id>` 或 `user:<aad-object-id>`

名称查找：

- 对于支持的提供商 (Discord/Slack/等)，诸如 `Help` 或 `#help` 之类的渠道名称将通过目录缓存进行解析。
- 如果缓存未命中，且提供商支持，OpenClaw 将尝试实时目录查找。

## 通用标志

- `--channel <name>`
- `--account <id>`
- `--target <dest>` (发送/轮询/读取等操作的目标渠道或用户)
- `--targets <name>` (重复；仅限广播)
- `--json`
- `--dry-run`
- `--verbose`

## SecretRef 行为

- `openclaw message` 会在运行所选操作之前解析受支持的渠道 SecretRefs。
- 解析尽可能限定为活动操作目标：
  - 当设置了 `--channel` 时（或从带前缀的目标如 `discord:...` 推断出时），作用域为渠道
  - 当设置了 `--account` 时，作用域为帐户（渠道全局设置 + 选定的帐户界面）
  - 当省略 `--account` 时，OpenClaw 不会强制 `default` 帐户 SecretRef 作用域
- 不相关渠道上未解析的 SecretRef 不会阻止定向消息操作。
- 如果选定的渠道/账户 SecretRef 未解析，则该操作的命令将失败并关闭。

## 操作

### 核心

- `send`
  - 渠道：WhatsApp/Telegram/Discord/Google Chat/Slack/Mattermost (plugin)/Signal/iMessage/Matrix/Microsoft Teams
  - 必需：`--target`，加上 `--message` 或 `--media`
  - 可选：`--media`，`--interactive`，`--buttons`，`--components`，`--card`，`--reply-to`，`--thread-id`，`--gif-playback`，`--force-document`，`--silent`
  - 共享的交互式负载：在支持的情况下，`--interactive` 发送渠道原生的交互式 JSON 负载
  - 仅限 Telegram：`--buttons`（需要 `channels.telegram.capabilities.inlineButtons` 允许）
  - 仅限 Telegram：`--force-document`（将图片和 GIF 作为文档发送以避免 Telegram 压缩）
  - 仅限 Telegram：`--thread-id`（论坛主题 ID）
  - 仅限 Slack：`--thread-id`（线程时间戳；`--reply-to` 使用相同的字段）
  - 仅限 Discord：`--components` JSON 负载
  - 支持自适应卡片的渠道：在支持的情况下使用 `--card` JSON 负载
  - Telegram + Discord：`--silent`
  - 仅限 WhatsApp：`--gif-playback`

- `poll`
  - 渠道：WhatsApp/Telegram/Discord/Matrix/Microsoft Teams
  - 必需：`--target`，`--poll-question`，`--poll-option`（可重复）
  - 可选：`--poll-multi`
  - 仅限 Discord：`--poll-duration-hours`，`--silent`，`--message`
  - 仅限 Telegram：`--poll-duration-seconds` (5-600), `--silent`, `--poll-anonymous` / `--poll-public`, `--thread-id`

- `react`
  - 频道：Discord/Google Chat/Slack/Telegram/WhatsApp/Signal/Matrix
  - 必填：`--message-id`, `--target`
  - 可选：`--emoji`, `--remove`, `--participant`, `--from-me`, `--target-author`, `--target-author-uuid`
  - 注意：`--remove` 需要 `--emoji`（在支持的情况下省略 `--emoji` 以清除自己的反应；请参阅 /tools/reactions）
  - 仅限 WhatsApp：`--participant`, `--from-me`
  - Signal 群组反应：需要 `--target-author` 或 `--target-author-uuid`

- `reactions`
  - 频道：Discord/Google Chat/Slack/Matrix
  - 必填：`--message-id`, `--target`
  - 可选：`--limit`

- `read`
  - 频道：Discord/Slack/Matrix
  - 必填：`--target`
  - 可选：`--limit`, `--before`, `--after`
  - 仅限 Discord：`--around`

- `edit`
  - 频道：Discord/Slack/Matrix
  - 必填：`--message-id`, `--message`, `--target`

- `delete`
  - 频道：Discord/Slack/Telegram/Matrix
  - 必填：`--message-id`, `--target`

- `pin` / `unpin`
  - 频道：Discord/Slack/Matrix
  - 必填：`--message-id`, `--target`

- `pins` (列表)
  - 频道：Discord/Slack/Matrix
  - 必填：`--target`

- `permissions`
  - 频道：Discord/Matrix
  - 必填：`--target`
  - 仅限 Matrix：当启用 Matrix 加密并允许验证操作时可用

- `search`
  - 渠道：Discord
  - 必填：`--guild-id`，`--query`
  - 可选：`--channel-id`，`--channel-ids`（可重复），`--author-id`，`--author-ids`（可重复），`--limit`

### Threads

- `thread create`
  - 渠道：Discord
  - 必填：`--thread-name`，`--target`（渠道 ID）
  - 可选：`--message-id`，`--message`，`--auto-archive-min`

- `thread list`
  - 渠道：Discord
  - 必填：`--guild-id`
  - 可选：`--channel-id`，`--include-archived`，`--before`，`--limit`

- `thread reply`
  - 渠道：Discord
  - 必填：`--target`（线程 ID），`--message`
  - 可选：`--media`，`--reply-to`

### Emojis

- `emoji list`
  - Discord：`--guild-id`
  - Slack：无额外标志

- `emoji upload`
  - 渠道：Discord
  - 必填：`--guild-id`，`--emoji-name`，`--media`
  - 可选：`--role-ids`（可重复）

### Stickers

- `sticker send`
  - Channels: Discord
  - 必填：`--target`，`--sticker-id`（可重复）
  - 可选：`--message`

- `sticker upload`
  - 渠道：Discord
  - 必填：`--guild-id`，`--sticker-name`，`--sticker-desc`，`--sticker-tags`，`--media`

### Roles / Channels / Members / Voice

- `role info`（Discord）：`--guild-id`
- `role add` / `role remove` (Discord): `--guild-id`, `--user-id`, `--role-id`
- `channel info` (Discord): `--target`
- `channel list` (Discord): `--guild-id`
- `member info` (Discord/Slack): `--user-id` (+ `--guild-id` for Discord)
- `voice status` (Discord): `--guild-id`, `--user-id`

### 事件

- `event list` (Discord): `--guild-id`
- `event create` (Discord): `--guild-id`, `--event-name`, `--start-time`
  - 可选：`--end-time`, `--desc`, `--channel-id`, `--location`, `--event-type`

### 管理 (Discord)

- `timeout`: `--guild-id`, `--user-id` (optional `--duration-min` or `--until`; omit both to clear timeout)
- `kick`: `--guild-id`, `--user-id` (+ `--reason`)
- `ban`: `--guild-id`, `--user-id` (+ `--delete-days`, `--reason`)
  - `timeout` also supports `--reason`

### 广播

- `broadcast`
  - 渠道：任何已配置的渠道；使用 `--channel all` 以定位所有提供商
  - 必填：`--targets <target...>`
  - 可选：`--message`, `--media`, `--dry-run`

## 示例

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

Send a shared interactive payload:

```bash
openclaw message send --channel googlechat --target spaces/AAA... \
  --message "Choose:" \
  --interactive '{"text":"Choose a path","blocks":[{"type":"actions","buttons":[{"label":"Approve"},{"label":"Decline"}]}]}'
```

Create a Discord poll:

```
openclaw message poll --channel discord \
  --target channel:123 \
  --poll-question "Snack?" \
  --poll-option Pizza --poll-option Sushi \
  --poll-multi --poll-duration-hours 48
```

创建 Telegram 投票（2分钟后自动关闭）：

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

发送 Teams 自适应卡片：

```bash
openclaw message send --channel msteams \
  --target conversation:19:abc@thread.tacv2 \
  --card '{"type":"AdaptiveCard","version":"1.5","body":[{"type":"TextBlock","text":"Status update"}]}'
```

将 Telegram 图片作为文档发送以避免压缩：

```bash
openclaw message send --channel telegram --target @mychat \
  --media ./diagram.png --force-document
```
