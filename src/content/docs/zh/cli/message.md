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
  - 必填：`--target`，加上 `--message`、`--media` 或 `--presentation`
  - 可选：`--media`、`--presentation`、`--delivery`、`--pin`、`--reply-to`、`--thread-id`、`--gif-playback`、`--force-document`、`--silent`
  - 共享展示负载：`--presentation` 发送语义块（`text`、`context`、`divider`、`buttons`、`select`），核心通过所选渠道声明的功能进行渲染。参见 [消息展示](/zh/plugins/message-presentation)。
  - 通用投递首选项：`--delivery` 接受诸如 `{ "pin": true }` 之类的投递提示；`--pin` 是在渠道支持时用于置顶投递的简写。
  - 仅限 Telegram：`--force-document`（将图像和 GIF 作为文档发送以避免 Telegram 压缩）
  - 仅限 Telegram：`--thread-id`（论坛话题 id）
  - 仅限 Slack：`--thread-id`（线程时间戳；`--reply-to` 使用相同的字段）
  - Telegram + Discord：`--silent`
  - 仅限 WhatsApp：`--gif-playback`

- `poll`
  - 渠道：WhatsApp/Telegram/Discord/Matrix/Microsoft Teams
  - 必填：`--target`、`--poll-question`、`--poll-option`（可重复）
  - 可选：`--poll-multi`
  - 仅限 Discord：`--poll-duration-hours`、`--silent`、`--message`
  - 仅限 Telegram：`--poll-duration-seconds` (5-600)、`--silent`、`--poll-anonymous` / `--poll-public`、`--thread-id`

- `react`
  - 频道：Discord/Google Chat/Slack/Telegram/WhatsApp/Signal/Matrix
  - 必填：`--message-id`、`--target`
  - 可选：`--emoji`、`--remove`、`--participant`、`--from-me`、`--target-author`、`--target-author-uuid`
  - 注意：`--remove` 需要 `--emoji`（如果支持，省略 `--emoji` 以清除自己的反应；请参阅 /tools/reactions）
  - 仅限 WhatsApp：`--participant`、`--from-me`
  - Signal 群组反应：需要 `--target-author` 或 `--target-author-uuid`

- `reactions`
  - 频道：Discord/Google Chat/Slack/Matrix
  - 必需：`--message-id`、`--target`
  - 可选：`--limit`

- `read`
  - 频道：Discord/Slack/Matrix
  - 必需：`--target`
  - 可选：`--limit`、`--before`、`--after`
  - 仅限 Discord：`--around`

- `edit`
  - 频道：Discord/Slack/Matrix
  - 必填：`--message-id`，`--message`，`--target`

- `delete`
  - 频道：Discord/Slack/Telegram/Matrix
  - 必填：`--message-id`，`--target`

- `pin` / `unpin`
  - 频道：Discord/Slack/Matrix
  - 必填：`--message-id`，`--target`

- `pins` (list)
  - 频道：Discord/Slack/Matrix
  - 必填：`--target`

- `permissions`
  - 频道：Discord/Matrix
  - 必填：`--target`
  - 仅限 Matrix：当启用 Matrix 加密并允许验证操作时可用

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
  - 频道：Discord
  - 必填：`--target`（线程 id），`--message`
  - 可选：`--media`，`--reply-to`

### 表情符号

- `emoji list`
  - Discord：`--guild-id`
  - Slack：无额外标志

- `emoji upload`
  - 频道：Discord
  - 必填：`--guild-id`，`--emoji-name`，`--media`
  - 可选：`--role-ids`（可重复）

### 贴纸

- `sticker send`
  - 频道：Discord
  - 必填：`--target`，`--sticker-id`（可重复）
  - 可选：`--message`

- `sticker upload`
  - 频道：Discord
  - 必需：`--guild-id`、`--sticker-name`、`--sticker-desc`、`--sticker-tags`、`--media`

### 角色 / 频道 / 成员 / 语音

- `role info` (Discord): `--guild-id`
- `role add` / `role remove` (Discord): `--guild-id`、`--user-id`、`--role-id`
- `channel info` (Discord): `--target`
- `channel list` (Discord): `--guild-id`
- `member info` (Discord/Slack): `--user-id`（Discord 需要 `--guild-id`）
- `voice status` (Discord): `--guild-id`, `--user-id`

### Events

- `event list` (Discord): `--guild-id`
- `event create` (Discord): `--guild-id`, `--event-name`, `--start-time`
  - Optional: `--end-time`, `--desc`, `--channel-id`, `--location`, `--event-type`

### Moderation (Discord)

- `timeout`: `--guild-id`, `--user-id` (optional `--duration-min` or `--until`; omit both to clear timeout)
- `kick`: `--guild-id`, `--user-id` (+ `--reason`)
- `ban`: `--guild-id`, `--user-id` (+ `--delete-days`, `--reason`)
  - `timeout` 也支持 `--reason`

### 广播

- `broadcast`
  - 渠道：任何已配置的渠道；使用 `--channel all` 定位所有提供商
  - 必需：`--targets <target...>`
  - 可选：`--message`, `--media`, `--dry-run`

## 示例

发送 Discord 回复：

```
openclaw message send --channel discord \
  --target channel:123 --message "hi" --reply-to 456
```

发送带有语义按钮的消息：

```
openclaw message send --channel discord \
  --target channel:123 --message "Choose:" \
  --presentation '{"blocks":[{"type":"buttons","buttons":[{"label":"Approve","value":"approve","style":"success"},{"label":"Decline","value":"decline","style":"danger"}]}]}'
```

Core 根据渠道能力，将相同的 `presentation` 载荷渲染为 Discord 组件、Slack 块、Telegram 内联按钮、Mattermost 属性或 Teams/Feishu 卡片。有关完整的约定和回退规则，请参阅 [Message Presentation](/zh/plugins/message-presentation)。

发送更丰富的展示载荷：

```bash
openclaw message send --channel googlechat --target spaces/AAA... \
  --message "Choose:" \
  --presentation '{"title":"Deploy approval","tone":"warning","blocks":[{"type":"text","text":"Choose a path"},{"type":"buttons","buttons":[{"label":"Approve","value":"approve"},{"label":"Decline","value":"decline"}]}]}'
```

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

通过通用展示发送 Telegram 内联按钮：

```
openclaw message send --channel telegram --target @mychat --message "Choose:" \
  --presentation '{"blocks":[{"type":"buttons","buttons":[{"label":"Yes","value":"cmd:yes"},{"label":"No","value":"cmd:no"}]}]}'
```

通过通用展示发送 Teams 卡片：

```bash
openclaw message send --channel msteams \
  --target conversation:19:abc@thread.tacv2 \
  --presentation '{"title":"Status update","blocks":[{"type":"text","text":"Build completed"}]}'
```

将 Telegram 图片作为文档发送以避免压缩：

```bash
openclaw message send --channel telegram --target @mychat \
  --media ./diagram.png --force-document
```
