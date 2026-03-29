---
summary: "CLI 參考資料，用於 `openclaw message` (發送 + 頻道操作)"
read_when:
  - Adding or modifying message CLI actions
  - Changing outbound channel behavior
title: "message"
---

# `openclaw message`

用於發送訊息和頻道操作的單一 outbound 指令
(Discord/Google Chat/Slack/Mattermost (plugin)/Telegram/WhatsApp/Signal/iMessage/Microsoft Teams)。

## 使用方式

```
openclaw message <subcommand> [flags]
```

頻道選擇：

- `--channel` 如果設定了一個以上的頻道則為必填。
- 如果僅設定一個頻道，它將成為預設值。
- 數值：`whatsapp|telegram|discord|googlechat|slack|mattermost|signal|imessage|msteams` (Mattermost 需要 plugin)

目標格式 (`--target`)：

- WhatsApp：E.164 或群組 JID
- Telegram：chat id 或 `@username`
- Discord：`channel:<id>` 或 `user:<id>` (或 `<@id>` mention；原始數字 id 被視為頻道)
- Google Chat：`spaces/<spaceId>` 或 `users/<userId>`
- Slack：`channel:<id>` 或 `user:<id>` (接受原始頻道 id)
- Mattermost (plugin)：`channel:<id>`、`user:<id>` 或 `@username` (純 id 被視為頻道)
- Signal：`+E.164`、`group:<id>`、`signal:+E.164`、`signal:group:<id>` 或 `username:<name>`/`u:<name>`
- iMessage：handle、`chat_id:<id>`、`chat_guid:<guid>` 或 `chat_identifier:<id>`
- Microsoft Teams：conversation id (`19:...@thread.tacv2`) 或 `conversation:<id>` 或 `user:<aad-object-id>`

名稱查找：

- 對於支援的提供者 (Discord/Slack 等)，像 `Help` 或 `#help` 這樣的頻道名稱會透過目錄快取解析。
- 如果快取未命中 (cache miss)，當提供者支援時，OpenClaw 將嘗試即時目錄查找。

## 通用旗標

- `--channel <name>`
- `--account <id>`
- `--target <dest>` (send/poll/read/etc 的目標頻道或使用者)
- `--targets <name>` (repeat; broadcast only)
- `--json`
- `--dry-run`
- `--verbose`

## SecretRef 行為

- `openclaw message` 會在執行選定的動作之前解析支援的通道 SecretRefs。
- 解析範圍盡可能限於目前的動作目標：
  - 當設定 `--channel` 時（或從像 `discord:...` 這樣的前綴目標推斷時）為通道範圍
  - 當設定 `--account` 時為帳戶範圍（通道全域變數 + 選定的帳戶層級）
  - 當省略 `--account` 時，OpenClaw 不會強制執行 `default` 帳戶 SecretRef 範圍
- 無關通道上未解析的 SecretRefs 不會阻擋特定的訊息動作。
- 如果選定的通道/帳戶 SecretRef 未解析，該動作的指令將會失敗並關閉。

## 動作

### 核心

- `send`
  - 通道：WhatsApp/Telegram/Discord/Google Chat/Slack/Mattermost (plugin)/Signal/iMessage/Microsoft Teams
  - 必填：`--target`，外加 `--message` 或 `--media`
  - 選填：`--media`、`--reply-to`、`--thread-id`、`--gif-playback`
  - 僅限 Telegram：`--buttons` (需要 `channels.telegram.capabilities.inlineButtons` 允許)
  - 僅限 Telegram：`--force-document` (將圖片和 GIF 作為文件發送以避免 Telegram 壓縮)
  - 僅限 Telegram：`--thread-id` (forum topic id)
  - 僅限 Slack：`--thread-id` (thread timestamp; `--reply-to` 使用相同欄位)
  - 僅限 WhatsApp：`--gif-playback`

- `poll`
  - 通道：WhatsApp/Telegram/Discord/Matrix/Microsoft Teams
  - 必填：`--target`、`--poll-question`、`--poll-option` (可重複)
  - 選填：`--poll-multi`
  - 僅限 Discord：`--poll-duration-hours`、`--silent`、`--message`
  - 僅限 Telegram：`--poll-duration-seconds` (5-600), `--silent`, `--poll-anonymous` / `--poll-public`, `--thread-id`

- `react`
  - 頻道：Discord/Google Chat/Slack/Telegram/WhatsApp/Signal
  - 必填：`--message-id`, `--target`
  - 選填：`--emoji`, `--remove`, `--participant`, `--from-me`, `--target-author`, `--target-author-uuid`
  - 注意：`--remove` 需要 `--emoji`（在支援的情況下省略 `--emoji` 以清除自己的回應；請參閱 /tools/reactions）
  - 僅限 WhatsApp：`--participant`, `--from-me`
  - Signal 群組回應：必填 `--target-author` 或 `--target-author-uuid`

- `reactions`
  - 頻道：Discord/Google Chat/Slack
  - 必填：`--message-id`, `--target`
  - 選填：`--limit`

- `read`
  - 頻道：Discord/Slack
  - 必填：`--target`
  - 選填：`--limit`, `--before`, `--after`
  - 僅限 Discord：`--around`

- `edit`
  - 頻道：Discord/Slack
  - 必填：`--message-id`, `--message`, `--target`

- `delete`
  - 頻道：Discord/Slack/Telegram
  - 必填：`--message-id`, `--target`

- `pin` / `unpin`
  - 頻道：Discord/Slack
  - 必填：`--message-id`, `--target`

- `pins` (清單)
  - 頻道：Discord/Slack
  - 必填：`--target`

- `permissions`
  - 頻道：Discord
  - 必填：`--target`

- `search`
  - 頻道：Discord
  - 必填：`--guild-id`，`--query`
  - 選填：`--channel-id`，`--channel-ids` (重複)，`--author-id`，`--author-ids` (重複)，`--limit`

### 討論串

- `thread create`
  - 頻道：Discord
  - 必填：`--thread-name`，`--target` (頻道 ID)
  - 選填：`--message-id`，`--message`，`--auto-archive-min`

- `thread list`
  - 頻道：Discord
  - 必填：`--guild-id`
  - 選填：`--channel-id`，`--include-archived`，`--before`，`--limit`

- `thread reply`
  - 頻道：Discord
  - 必填：`--target` (討論串 ID)，`--message`
  - 選填：`--media`，`--reply-to`

### 表情符號

- `emoji list`
  - Discord：`--guild-id`
  - Slack：無額外標誌

- `emoji upload`
  - 頻道：Discord
  - 必填：`--guild-id`，`--emoji-name`，`--media`
  - 選填：`--role-ids` (重複)

### 貼圖

- `sticker send`
  - 頻道：Discord
  - 必填：`--target`，`--sticker-id` (重複)
  - 選填：`--message`

- `sticker upload`
  - 頻道：Discord
  - 必填：`--guild-id`，`--sticker-name`，`--sticker-desc`，`--sticker-tags`，`--media`

### 角色 / 頻道 / 成員 / 語音

- `role info` (Discord)：`--guild-id`
- `role add` / `role remove` (Discord)：`--guild-id`，`--user-id`，`--role-id`
- `channel info` (Discord)：`--target`
- `channel list` (Discord): `--guild-id`
- `member info` (Discord/Slack): `--user-id` (+ `--guild-id` for Discord)
- `voice status` (Discord): `--guild-id`, `--user-id`

### Events

- `event list` (Discord): `--guild-id`
- `event create` (Discord): `--guild-id`, `--event-name`, `--start-time`
  - Optional: `--end-time`, `--desc`, `--channel-id`, `--location`, `--event-type`

### Moderation (Discord)

- `timeout`: `--guild-id`, `--user-id` (optional `--duration-min` or `--until`; omit both to clear timeout)
- `kick`: `--guild-id`, `--user-id` (+ `--reason`)
- `ban`: `--guild-id`, `--user-id` (+ `--delete-days`, `--reason`)
  - `timeout` also supports `--reason`

### Broadcast

- `broadcast`
  - Channels: any configured channel; use `--channel all` to target all providers
  - Required: `--targets` (repeat)
  - Optional: `--message`, `--media`, `--dry-run`

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

See [Discord components](/en/channels/discord#interactive-components) for the full schema.

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
