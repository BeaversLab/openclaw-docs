---
summary: " `openclaw message`（傳送 + 頻道動作）的 CLI 參考資料"
read_when:
  - Adding or modifying message CLI actions
  - Changing outbound channel behavior
title: "message"
---

# `openclaw message`

用於傳送訊息和頻道動作的單一輸出指令
(Discord/Google Chat/Slack/Mattermost (plugin)/Telegram/WhatsApp/Signal/iMessage/Microsoft Teams)。

## 用法

```
openclaw message <subcommand> [flags]
```

頻道選取：

- 如果設定了多個頻道，則需要 `--channel`。
- 如果剛好設定了一個頻道，它將成為預設值。
- 數值：`whatsapp|telegram|discord|googlechat|slack|mattermost|signal|imessage|msteams`（Mattermost 需要 plugin）

目標格式 (`--target`)：

- WhatsApp：E.164 或群組 JID
- Telegram：chat id 或 `@username`
- Discord: `channel:<id>` 或 `user:<id>`（或 `<@id>` 提及；原始數字 ID 被視為頻道）
- Google Chat: `spaces/<spaceId>` 或 `users/<userId>`
- Slack: `channel:<id>` 或 `user:<id>`（接受原始頻道 ID）
- Mattermost (plugin): `channel:<id>`、`user:<id>` 或 `@username`（純 ID 被視為頻道）
- Signal: `+E.164`、`group:<id>`、`signal:+E.164`、`signal:group:<id>` 或 `username:<name>`/`u:<name>`
- iMessage: handle、`chat_id:<id>`、`chat_guid:<guid>` 或 `chat_identifier:<id>`
- Microsoft Teams：conversation id (`19:...@thread.tacv2`) 或 `conversation:<id>` 或 `user:<aad-object-id>`

名稱查找：

- 對於支援的提供者（Discord/Slack/等），諸如 `Help` 或 `#help` 的頻道名稱會透過目錄快取解析。
- 若快取未命中，且提供者支援時，OpenClaw 將嘗試即時目錄查找。

## 通用旗標

- `--channel <name>`
- `--account <id>`
- `--target <dest>` (send/poll/read/等 的目標頻道或使用者)
- `--targets <name>` (重複；僅限廣播)
- `--json`
- `--dry-run`
- `--verbose`

## SecretRef 行為

- `openclaw message` 會在執行選定的動作之前解析支援的頻道 SecretRefs。
- 解析範圍在可能的情況下限於目前的動作目標：
  - 當設定了 `--channel` 時（或從帶有前綴的目標（例如 `discord:...`）推斷時），範圍為頻道層級
  - 當設定了 `--account` 時，範圍為帳戶層級（頻道全域設定 + 所選帳戶介面）
  - 當省略 `--account` 時，OpenClaw 不會強制執行 `default` 帳戶 SecretRef 範圍
- 不相關頻道上未解析的 SecretRef 不會阻擋目標訊息動作。
- 如果所選頻道/帳戶的 SecretRef 未解析，該動作的指令將會失敗封閉（fails closed）。

## 動作

### 核心

- `send`
  - 頻道：WhatsApp/Telegram/Discord/Google Chat/Slack/Mattermost (plugin)/Signal/iMessage/Microsoft Teams
  - 必要：`--target`，加上 `--message` 或 `--media`
  - 選用：`--media`、`--reply-to`、`--thread-id`、`--gif-playback`
  - 僅限 Telegram：`--buttons`（需要 `channels.telegram.capabilities.inlineButtons` 才能允許此操作）
  - 僅限 Telegram：`--force-document`（將圖片和 GIF 作為文件發送以避免 Telegram 壓縮）
  - 僅限 Telegram：`--thread-id`（論壇主題 ID）
  - 僅限 Slack：`--thread-id`（執行緒時間戳記；`--reply-to` 使用同一個欄位）
  - 僅限 WhatsApp：`--gif-playback`

- `poll`
  - 頻道：WhatsApp/Telegram/Discord/Matrix/Microsoft Teams
  - 必填：`--target`、`--poll-question`、`--poll-option`（可重複）
  - 選填：`--poll-multi`
  - 僅 Discord：`--poll-duration-hours`、`--silent`、`--message`
  - 僅 Telegram：`--poll-duration-seconds`（5-600）、`--silent`、`--poll-anonymous` / `--poll-public`、`--thread-id`

- `react`
  - 頻道：Discord/Google Chat/Slack/Telegram/WhatsApp/Signal
  - 必填：`--message-id`、`--target`
  - 選填：`--emoji`、`--remove`、`--participant`、`--from-me`、`--target-author`、`--target-author-uuid`
  - 注意：`--remove` 需要 `--emoji`（如果支援，省略 `--emoji` 以清除自己的回應；請參閱 /tools/reactions）
  - 僅限 WhatsApp：`--participant`、`--from-me`
  - Signal 群組回應：需要 `--target-author` 或 `--target-author-uuid`

- `reactions`
  - 頻道：Discord/Google Chat/Slack
  - 必填：`--message-id`、`--target`
  - 選填：`--limit`

- `read`
  - 頻道：Discord/Slack
  - 必填：`--target`
  - 選填：`--limit`、`--before`、`--after`
  - 僅限 Discord：`--around`

- `edit`
  - 頻道：Discord/Slack
  - 必填：`--message-id`，`--message`，`--target`

- `delete`
  - 頻道：Discord/Slack/Telegram
  - 必填：`--message-id`，`--target`

- `pin` / `unpin`
  - 頻道：Discord/Slack
  - 必填：`--message-id`，`--target`

- `pins` (列表)
  - 頻道：Discord/Slack
  - 必填：`--target`

- `permissions`
  - 頻道：Discord
  - 必填：`--target`

- `search`
  - 頻道：Discord
  - 必填：`--guild-id`，`--query`
  - 選用：`--channel-id`、`--channel-ids`（重複）、`--author-id`、`--author-ids`（重複）、`--limit`

### 討論串

- `thread create`
  - 頻道：Discord
  - 必要：`--thread-name`、`--target`（頻道 ID）
  - 選用：`--message-id`、`--message`、`--auto-archive-min`

- `thread list`
  - 頻道：Discord
  - 必要：`--guild-id`
  - 選用：`--channel-id`、`--include-archived`、`--before`、`--limit`

- `thread reply`
  - 頻道：Discord
  - 必要：`--target`（討論串 ID）、`--message`
  - 選填：`--media`、`--reply-to`

### 表情符號

- `emoji list`
  - Discord：`--guild-id`
  - Slack：無額外標誌

- `emoji upload`
  - 頻道：Discord
  - 必填：`--guild-id`、`--emoji-name`、`--media`
  - 選填：`--role-ids`（可重複）

### 貼圖

- `sticker send`
  - 頻道：Discord
  - 必填：`--target`、`--sticker-id`（可重複）
  - 選填：`--message`

- `sticker upload`
  - 頻道：Discord
  - 必填：`--guild-id`、`--sticker-name`、`--sticker-desc`、`--sticker-tags`、`--media`

### 角色 / 頻道 / 成員 / 語音

- `role info` (Discord): `--guild-id`
- `role add` / `role remove` (Discord): `--guild-id`, `--user-id`, `--role-id`
- `channel info` (Discord): `--target`
- `channel list` (Discord): `--guild-id`
- `member info` (Discord/Slack): `--user-id` (+ `--guild-id` for Discord)
- `voice status` (Discord): `--guild-id`, `--user-id`

### 事件

- `event list` (Discord): `--guild-id`
- `event create` (Discord): `--guild-id`, `--event-name`, `--start-time`
  - 選用: `--end-time`, `--desc`, `--channel-id`, `--location`, `--event-type`

### 管理 (Discord)

- `timeout`: `--guild-id`, `--user-id` (選用 `--duration-min` 或 `--until`；省略兩者以清除逾時)
- `kick`: `--guild-id`, `--user-id` (+ `--reason`)
- `ban`: `--guild-id`, `--user-id` (+ `--delete-days`, `--reason`)
  - `timeout` 也支援 `--reason`

### 廣播

- `broadcast`
  - 頻道：任何已設定的頻道；使用 `--channel all` 以目標所有提供者
  - 必填：`--targets`（可重複）
  - 選填：`--message`, `--media`, `--dry-run`

## 範例

傳送 Discord 回覆：

```
openclaw message send --channel discord \
  --target channel:123 --message "hi" --reply-to 456
```

傳送包含元件的 Discord 訊息：

```
openclaw message send --channel discord \
  --target channel:123 --message "Choose:" \
  --components '{"text":"Choose a path","blocks":[{"type":"actions","buttons":[{"label":"Approve","style":"success"},{"label":"Decline","style":"danger"}]}]}'
```

請參閱 [Discord 元件](/zh-Hant/channels/discord#interactive-components) 以了解完整架構。

建立 Discord 投票：

```
openclaw message poll --channel discord \
  --target channel:123 \
  --poll-question "Snack?" \
  --poll-option Pizza --poll-option Sushi \
  --poll-multi --poll-duration-hours 48
```

建立 Telegram 投票（2 分鐘後自動關閉）：

```
openclaw message poll --channel telegram \
  --target @mychat \
  --poll-question "Lunch?" \
  --poll-option Pizza --poll-option Sushi \
  --poll-duration-seconds 120 --silent
```

傳送 Teams 主動訊息：

```
openclaw message send --channel msteams \
  --target conversation:19:abc@thread.tacv2 --message "hi"
```

建立 Teams 投票：

```
openclaw message poll --channel msteams \
  --target conversation:19:abc@thread.tacv2 \
  --poll-question "Lunch?" \
  --poll-option Pizza --poll-option Sushi
```

在 Slack 上做出反應：

```
openclaw message react --channel slack \
  --target C123 --message-id 456 --emoji "✅"
```

在 Signal 群組中回應：

```
openclaw message react --channel signal \
  --target signal:group:abc123 --message-id 1737630212345 \
  --emoji "✅" --target-author-uuid 123e4567-e89b-12d3-a456-426614174000
```

傳送 Telegram 內聯按鈕：

```
openclaw message send --channel telegram --target @mychat --message "Choose:" \
  --buttons '[ [{"text":"Yes","callback_data":"cmd:yes"}], [{"text":"No","callback_data":"cmd:no"}] ]'
```

將 Telegram 圖片作為文件傳送以避免壓縮：

```exec
openclaw message send --channel telegram --target @mychat \
  --media ./diagram.png --force-document
```
