---
summary: "CLI 參考：`openclaw message` (發送 + 頻道操作)"
read_when:
  - Adding or modifying message CLI actions
  - Changing outbound channel behavior
title: "message"
---

# `openclaw message`

用於發送訊息和頻道操作的單一輸出指令
(Discord/Google Chat/Slack/Mattermost (外掛程式)/Telegram/WhatsApp/Signal/iMessage/MS Teams)。

## 用法

```
openclaw message <subcommand> [flags]
```

頻道選擇：

- 如果配置了多個頻道，則 `--channel` 為必填。
- 如果剛好配置了一個頻道，它將成為預設值。
- 數值：`whatsapp|telegram|discord|googlechat|slack|mattermost|signal|imessage|msteams` (Mattermost 需要外掛程式)

目標格式 (`--target`)：

- WhatsApp：E.164 或群組 JID
- Telegram：聊天 id 或 `@username`
- Discord：`channel:<id>` 或 `user:<id>` (或 `<@id>` 提及；原始數字 id 被視為頻道)
- Google Chat：`spaces/<spaceId>` 或 `users/<userId>`
- Slack：`channel:<id>` 或 `user:<id>` (接受原始頻道 id)
- Mattermost (外掛程式)：`channel:<id>`、`user:<id>` 或 `@username` (單純的 id 被視為頻道)
- Signal：`+E.164`、`group:<id>`、`signal:+E.164`、`signal:group:<id>` 或 `username:<name>`/`u:<name>`
- iMessage：handle、`chat_id:<id>`、`chat_guid:<guid>` 或 `chat_identifier:<id>`
- MS Teams：交談 id (`19:...@thread.tacv2`) 或 `conversation:<id>` 或 `user:<aad-object-id>`

名稱查詢：

- 對於支援的供應商 (Discord/Slack/等)，諸如 `Help` 或 `#help` 等頻道名稱會透過目錄快取解析。
- 如果快取未命中，且供應商支援，OpenClaw 將嘗試即時目錄查詢。

## 通用旗標

- `--channel <name>`
- `--account <id>`
- `--target <dest>` (用於 send/poll/read/等的目標頻道或使用者)
- `--targets <name>`（重複；僅限廣播）
- `--json`
- `--dry-run`
- `--verbose`

## 動作

### 核心

- `send`
  - 頻道：WhatsApp/Telegram/Discord/Google Chat/Slack/Mattermost（外掛程式）/Signal/iMessage/MS Teams
  - 必要欄位：`--target`，加上 `--message` 或 `--media`
  - 選用欄位：`--media`、`--reply-to`、`--thread-id`、`--gif-playback`
  - 僅限 Telegram：`--buttons`（需要 `channels.telegram.capabilities.inlineButtons` 才能允許）
  - 僅限 Telegram：`--force-document`（將圖片和 GIF 作為文件發送，以避免 Telegram 壓縮）
  - 僅限 Telegram：`--thread-id`（論壇主題 ID）
  - 僅限 Slack：`--thread-id`（討論串時間戳記；`--reply-to` 使用相同的欄位）
  - 僅限 WhatsApp：`--gif-playback`

- `poll`
  - 頻道：WhatsApp/Telegram/Discord/Matrix/MS Teams
  - 必要欄位：`--target`、`--poll-question`、`--poll-option`（可重複）
  - 選用欄位：`--poll-multi`
  - 僅限 Discord：`--poll-duration-hours`、`--silent`、`--message`
  - 僅限 Telegram：`--poll-duration-seconds`（5-600）、`--silent`、`--poll-anonymous` / `--poll-public`、`--thread-id`

- `react`
  - 頻道：Discord/Google Chat/Slack/Telegram/WhatsApp/Signal
  - 必要欄位：`--message-id`、`--target`
  - 選用欄位：`--emoji`、`--remove`、`--participant`、`--from-me`、`--target-author`、`--target-author-uuid`
  - 注意：`--remove` 需要 `--emoji`（若支援，省略 `--emoji` 以清除自己的反應；請參閱 /tools/reactions）
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
  - 必填：`--message-id`、`--message`、`--target`

- `delete`
  - 頻道：Discord/Slack/Telegram
  - 必填：`--message-id`、`--target`

- `pin` / `unpin`
  - 頻道：Discord/Slack
  - 必填：`--message-id`、`--target`

- `pins` (清單)
  - 頻道：Discord/Slack
  - 必填：`--target`

- `permissions`
  - 頻道：Discord
  - 必填：`--target`

- `search`
  - 頻道：Discord
  - 必填：`--guild-id`、`--query`
  - 選填：`--channel-id`、`--channel-ids` (重複)、`--author-id`、`--author-ids` (重複)、`--limit`

### 討論串

- `thread create`
  - 頻道：Discord
  - 必填：`--thread-name`、`--target` (頻道 ID)
  - 選填：`--message-id`、`--message`、`--auto-archive-min`

- `thread list`
  - 頻道：Discord
  - 必填：`--guild-id`
  - 可選：`--channel-id`、`--include-archived`、`--before`、`--limit`

- `thread reply`
  - 頻道：Discord
  - 必填：`--target` (thread id)、`--message`
  - 可選：`--media`、`--reply-to`

### 表情符號

- `emoji list`
  - Discord：`--guild-id`
  - Slack：無額外旗標

- `emoji upload`
  - 頻道：Discord
  - 必填：`--guild-id`、`--emoji-name`、`--media`
  - 可選：`--role-ids` (可重複)

### 貼圖

- `sticker send`
  - 頻道：Discord
  - 必填：`--target`、`--sticker-id` (可重複)
  - 可選：`--message`

- `sticker upload`
  - 頻道：Discord
  - 必填：`--guild-id`、`--sticker-name`、`--sticker-desc`、`--sticker-tags`、`--media`

### 角色 / 頻道 / 成員 / 語音

- `role info` (Discord)：`--guild-id`
- `role add` / `role remove` (Discord)：`--guild-id`、`--user-id`、`--role-id`
- `channel info` (Discord)：`--target`
- `channel list` (Discord)：`--guild-id`
- `member info` (Discord/Slack)：`--user-id` (+ `--guild-id` for Discord)
- `voice status` (Discord)：`--guild-id`、`--user-id`

### 活動

- `event list` (Discord)：`--guild-id`
- `event create` (Discord)：`--guild-id`、`--event-name`、`--start-time`
  - 選用：`--end-time`、`--desc`、`--channel-id`、`--location`、`--event-type`

### 版權管理（Discord）

- `timeout`：`--guild-id`、`--user-id`（選用 `--duration-min` 或 `--until`；省略兩者以清除逾時）
- `kick`：`--guild-id`、`--user-id`（+ `--reason`）
- `ban`：`--guild-id`、`--user-id`（+ `--delete-days`、`--reason`）
  - `timeout` 也支援 `--reason`

### 廣播

- `broadcast`
  - 頻道：任何已設定的頻道；使用 `--channel all` 以鎖定所有提供者
  - 必要：`--targets`（可重複）
  - 選用：`--message`、`--media`、`--dry-run`

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

在 Slack 中回應：

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

傳送 Telegram 內嵌按鈕：

```
openclaw message send --channel telegram --target @mychat --message "Choose:" \
  --buttons '[ [{"text":"Yes","callback_data":"cmd:yes"}], [{"text":"No","callback_data":"cmd:no"}] ]'
```

將 Telegram 圖片作為文件傳送以避免壓縮：

```bash
openclaw message send --channel telegram --target @mychat \
  --media ./diagram.png --force-document
```

import footerZhHant from "/components/footer/zh-Hant.mdx";

<footerZhHant />
