---
summary: "CLI 参考，适用于 `openclaw message` (发送 + 渠道操作)"
read_when:
  - Adding or modifying message CLI actions
  - Changing outbound channel behavior
title: "Message"
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
- 当存在 `--channel` 或带有渠道前缀的目标时，`openclaw message` 会将选定的渠道解析为其所属插件；否则它会加载配置的渠道插件以进行默认渠道推断。

目标格式 (`--target`)：

- WhatsApp：E.164、群组 JID 或 WhatsApp Channel/Newsletter JID (WhatsAppWhatsApp`...@newsletter`)
- Telegram：chat id、Telegram`@username` 或论坛主题目标 (`-1001234567890:topic:42` 或 `--thread-id 42`)
- Discord：Discord`channel:<id>` 或 `user:<id>`（或 `<@id>` 提及；原始数字 ID 被视为渠道）
- Google Chat：Google Chat`spaces/<spaceId>` 或 `users/<userId>`
- Slack：Slack`channel:<id>` 或 `user:<id>`（接受原始渠道 ID）
- Mattermost (插件)：Mattermost`channel:<id>`、`user:<id>` 或 `@username`（裸 ID 被视为渠道）
- Signal：Signal`+E.164`、`group:<id>`、`signal:+E.164`、`signal:group:<id>` 或 `username:<name>`/`u:<name>`
- iMessage：handle、iMessage`chat_id:<id>`、`chat_guid:<guid>` 或 `chat_identifier:<id>`
- Matrix：Matrix`@user:server`、`!room:server` 或 `#alias:server`
- Microsoft Teams：conversation id (Microsoft Teams`19:...@thread.tacv2`) 或 `conversation:<id>` 或 `user:<aad-object-id>`

名称查找：

- 对于受支持的提供商（Discord/Slack/等），诸如 DiscordSlack`Help` 或 `#help` 之类的渠道名称会通过目录缓存进行解析。
- 如果缓存未命中，当提供商支持时，OpenClaw 将尝试实时目录查找。

## 通用标志

- `--channel <name>`
- `--account <id>`
- `--target <dest>` (发送/轮询/读取等的目标渠道或用户)
- `--targets <name>` (重复；仅限广播)
- `--json`
- `--dry-run`
- `--verbose`

## SecretRef 行为

- `openclaw message` 在运行所选操作之前解析支持的渠道 SecretRef。
- 解析范围在可能时限定于当前操作目标：
  - 当设置了 `--channel` 时（或从带有前缀的目标如 `discord:...` 推断得出），解析范围为渠道级别
  - 当设置了 `--account` 时（渠道全局变量 + 所选账户界面），解析范围为账户级别
  - 当省略 `--account`OpenClaw 时，OpenClaw 不会强制 `default` 账户 SecretRef 范围
- 不相关渠道上未解析的 SecretRef 不会阻止目标消息操作。
- 如果所选渠道/账户的 SecretRef 未解析，该命令的该操作将以失败关闭。

## 操作

### 核心

- `send`
  - 渠道：WhatsApp/Telegram/Discord/Google Chat/Slack/Mattermost (插件)/Signal/iMessage/Matrix/Microsoft Teams
  - 必填：`--target`，加上 `--message`、`--media` 或 `--presentation`
  - 可选：`--media`、`--presentation`、`--delivery`、`--pin`、`--reply-to`、`--thread-id`、`--gif-playback`、`--force-document`、`--silent`
  - 共享展示负载：`--presentation` 发送语义块（`text`、`context`、`divider`、`buttons`、`select`），核心通过所选渠道声明的功能进行渲染。参见 [Message Presentation](/zh/plugins/message-presentation)。
  - 通用投递首选项：`--delivery` 接受投递提示，例如 `{ "pin": true }`；当渠道支持时，`--pin` 是固定投递的简写。
  - 仅限 Telegram：`--force-document`（将图像和 GIF 作为文档发送以避免 Telegram 压缩）
  - 仅限 Telegram：`--thread-id`（论坛主题 ID）
  - 仅限 Slack：`--thread-id`（线程时间戳；`--reply-to` 使用相同的字段）
  - Telegram + Discord：`--silent`
  - 仅限 WhatsApp：`--gif-playback`；WhatsApp 渠道/时事通讯通过其原生的 `@newsletter` JID 进行寻址。

- `poll`
  - 渠道：WhatsApp/Telegram/Discord/Matrix/Microsoft Teams
  - 必填：`--target`、`--poll-question`、`--poll-option`（可重复）
  - 可选：`--poll-multi`
  - 仅限 Discord：`--poll-duration-hours`、`--silent`、`--message`
  - 仅限 Telegram：`--poll-duration-seconds`（5-600）、`--silent`、`--poll-anonymous` / `--poll-public`、`--thread-id`

- `react`
  - 频道：Discord/Google Chat/Slack/Telegram/WhatsApp/Signal/Matrix
  - 必需：`--message-id`，`--target`
  - 可选：`--emoji`，`--remove`，`--participant`，`--from-me`，`--target-author`，`--target-author-uuid`
  - 注意：`--remove` 需要 `--emoji`（如果支持，省略 `--emoji` 以清除自己的回应；请参阅 /tools/reactions）
  - 仅限 WhatsApp：WhatsApp`--participant`，`--from-me`
  - Signal 群组回应：需要 Signal`--target-author` 或 `--target-author-uuid`

- `reactions`
  - 频道：Discord/Google Chat/Slack/Matrix
  - 必需：`--message-id`，`--target`
  - 可选：`--limit`

- `read`
  - 频道：Discord/Slack/Matrix
  - 必需：`--target`
  - 可选：`--limit`，`--message-id`，`--before`，`--after`
  - 仅限 Slack：Slack`--message-id`Slack 读取特定的 Slack 消息时间戳；结合 `--thread-id` 以读取确切的线程回复。
  - 仅限 Discord：Discord`--around`

- `edit`
  - 频道：Discord/Slack/Matrix
  - 必需：`--message-id`，`--message`，`--target`

- `delete`
  - 渠道：Discord/Slack/Telegram/Matrix
  - 必需：`--message-id`，`--target`

- `pin` / `unpin`
  - 渠道：Discord/Slack/Matrix
  - 必需：`--message-id`，`--target`

- `pins`（列表）
  - 渠道：Discord/Slack/Matrix
  - 必需：`--target`

- `permissions`
  - 渠道：Discord/Matrix
  - 必需：`--target`
  - 仅限 Matrix：当启用 Matrix 加密并允许验证操作时可用

- `search`
  - 渠道：Discord
  - 必需：`--guild-id`，`--query`
  - 可选：`--channel-id`，`--channel-ids`（可重复），`--author-id`，`--author-ids`（可重复），`--limit`

### Threads

- `thread create`
  - 渠道：Discord
  - 必需：`--thread-name`，`--target`（渠道 id）
  - 可选：`--message-id`，`--message`，`--auto-archive-min`

- `thread list`
  - 渠道：Discord
  - 必需：`--guild-id`
  - 可选：`--channel-id`，`--include-archived`，`--before`，`--limit`

- `thread reply`
  - 渠道：Discord
  - 必需：`--target`（thread id），`--message`
  - 可选：`--media`，`--reply-to`

### Emojis

- `emoji list`
  - Discord: Discord`--guild-id`
  - Slack: 无额外标志

- `emoji upload`
  - 频道：Discord
  - 必需：`--guild-id`、`--emoji-name`、`--media`
  - 可选：`--role-ids`（可重复）

### 贴纸

- `sticker send`
  - 频道：Discord
  - 必需：`--target`、`--sticker-id`（可重复）
  - 可选：`--message`

- `sticker upload`
  - 频道：Discord
  - 必需：`--guild-id`、`--sticker-name`、`--sticker-desc`、`--sticker-tags`、`--media`

### 角色 / 频道 / 成员 / 语音

- `role info`Discord (Discord): `--guild-id`
- `role add` / `role remove`Discord (Discord): `--guild-id`、`--user-id`、`--role-id`
- `channel info`Discord (Discord): `--target`
- `channel list`Discord (Discord): `--guild-id`
- `member info`DiscordSlack (Discord/Slack): `--user-id`（Discord 需加 `--guild-id`Discord）
- `voice status`Discord (Discord): `--guild-id`、`--user-id`

### 事件

- `event list`Discord (Discord): `--guild-id`
- `event create`Discord (Discord): `--guild-id`、`--event-name`、`--start-time`
  - 可选： `--end-time`， `--desc`， `--channel-id`， `--location`， `--event-type`

### 审核 (Discord)

- `timeout`： `--guild-id`， `--user-id` （可选 `--duration-min` 或 `--until`；省略两者以清除超时）
- `kick`： `--guild-id`， `--user-id` （+ `--reason`）
- `ban`： `--guild-id`， `--user-id` （+ `--delete-days`， `--reason`）
  - `timeout` 也支持 `--reason`

### 广播

- `broadcast`
  - 渠道：任何已配置的渠道；使用 `--channel all` 以针对所有提供商
  - 必需： `--targets <target...>`
  - 可选： `--message`， `--media`， `--dry-run`

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

Core 会根据渠道能力，将相同的 `presentation` 负载渲染为 Discord 组件、Slack 块、Telegram 内联按钮、Mattermost 属性或 Teams/Feishu 卡片。有关完整契约和回退规则，请参阅 [消息展示](/zh/plugins/message-presentation)。

发送更丰富的展示负载：

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

## 相关

- [CLI 参考](CLI/en/cli)
- [Agent 发送](/zh/tools/agent-send)
