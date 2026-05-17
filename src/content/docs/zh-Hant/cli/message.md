---
summary: "CLI 參考資料：`openclaw message` (send + channel actions)"
read_when:
  - Adding or modifying message CLI actions
  - Changing outbound channel behavior
title: "訊息"
---

# `openclaw message`

用於發送訊息和頻道動作的單一出站指令
(Discord/Google Chat/iMessage/Matrix/Mattermost (plugin)/Microsoft Teams/Signal/Slack/Telegram/WhatsApp)。

## 使用方式

```
openclaw message <subcommand> [flags]
```

頻道選擇：

- 如果配置了多個通道，則需要 `--channel`。
- 如果僅設定一個頻道，它將成為預設值。
- 值：`discord|googlechat|imessage|matrix|mattermost|msteams|signal|slack|telegram|whatsapp` (Mattermost 需要外掛程式)
- `openclaw message` 當存在 `--channel` 或帶有通道前綴的目標時，會將選定的通道解析為其擁有的外掛程式；否則，它會載入已配置的通道外掛程式以進行預設通道推斷。

目標格式 (`--target`)：

- WhatsApp：E.164、群組 JID 或 WhatsApp Channel/Newsletter JID (`...@newsletter`)
- Telegram：聊天 id、`@username` 或論壇主題目標 (`-1001234567890:topic:42` 或 `--thread-id 42`)
- Discord：`channel:<id>` 或 `user:<id>` (或 `<@id>` 提及；原始數字 id 被視為通道)
- Google Chat：`spaces/<spaceId>` 或 `users/<userId>`
- Slack：`channel:<id>` 或 `user:<id>` (接受原始通道 id)
- Mattermost (plugin)：`channel:<id>`、`user:<id>` 或 `@username` (純 id 被視為通道)
- Signal：`+E.164`、`group:<id>`、`signal:+E.164`、`signal:group:<id>` 或 `username:<name>`/`u:<name>`
- iMessage：handle、`chat_id:<id>`、`chat_guid:<guid>` 或 `chat_identifier:<id>`
- Matrix：`@user:server`、`!room:server` 或 `#alias:server`
- Microsoft Teams：conversation id (`19:...@thread.tacv2`) 或 `conversation:<id>` 或 `user:<aad-object-id>`

名稱查詢：

- 對於支援的供應商 (Discord/Slack 等)，諸如 `Help` 或 `#help` 之類的通道名稱會透過目錄快取解析。
- 如果快取未命中，當供應商支援時，OpenClaw 將嘗試即時目錄查詢。

## 通用旗標

- `--channel <name>`
- `--account <id>`
- `--target <dest>` (用於 send/poll/read 等的目標通道或使用者)
- `--targets <name>` (重複；僅用於廣播)
- `--json`
- `--dry-run`
- `--verbose`

## SecretRef 行為

- `openclaw message` 會在執行選定的動作之前解析支援的頻道 SecretRef。
- 解析範圍在可能時會限定在目前啟用的動作目標：
  - 當設定 `--channel` 時為頻道範圍（或從帶有前綴的目標（如 `discord:...`）推斷）
  - 當設定 `--account` 時為帳號範圍（頻道全域變數 + 選定的帳號層級）
  - 當省略 `--account` 時，OpenClaw 不會強制執行 `default` 帳號 SecretRef 範圍
- 無關頻道上未解析的 SecretRef 不會阻擋目標訊息動作。
- 如果選定的頻道/帳號 SecretRef 未解析，該動作的指令將會以失敗封閉（fail closed）方式處理。

## 動作

### 核心

- `send`
  - 頻道：WhatsApp/Telegram/Discord/Google Chat/Slack/Mattermost (plugin)/Signal/iMessage/Matrix/Microsoft Teams
  - 必填：`--target`，外加 `--message`、`--media` 或 `--presentation`
  - 選填：`--media`、`--presentation`、`--delivery`、`--pin`、`--reply-to`、`--thread-id`、`--gif-playback`、`--force-document`、`--silent`
  - 共享的呈現內容：`--presentation` 發送語義區塊（`text`、`context`、`divider`、`buttons`、`select`），核心會透過所選頻道宣告的功能來進行轉譯。請參閱 [訊息呈現](/zh-Hant/plugins/message-presentation)。
  - 通用傳遞偏好設定：`--delivery` 接受傳遞提示，例如 `{ "pin": true }`；如果頻道支援，`--pin` 是固定傳遞的簡寫。
  - 僅限 Telegram：`--force-document`（將圖片、GIF 和影片以文件形式發送，以避免 Telegram 壓縮）
  - 僅限 Telegram：`--thread-id`（論壇主題 ID）
  - 僅限 Slack：`--thread-id` (執行緒時間戳記；`--reply-to` 使用相同的欄位)
  - Telegram + Discord：`--silent`
  - 僅限 WhatsApp：`--gif-playback`；WhatsApp 頻道/電子報使用其原生 `@newsletter` JID 定址。

- `poll`
  - 頻道：WhatsApp/Telegram/Discord/Matrix/Microsoft Teams
  - 必填：`--target`, `--poll-question`, `--poll-option` (重複)
  - 選填：`--poll-multi`
  - 僅限 Discord：`--poll-duration-hours`, `--silent`, `--message`
  - 僅限 Telegram：`--poll-duration-seconds` (5-600), `--silent`, `--poll-anonymous` / `--poll-public`, `--thread-id`

- `react`
  - 頻道：Discord/Google Chat/Slack/Telegram/WhatsApp/Signal/Matrix
  - 必填：`--message-id`, `--target`
  - 選填：`--emoji`, `--remove`, `--participant`, `--from-me`, `--target-author`, `--target-author-uuid`
  - 注意：`--remove` 需要 `--emoji` (在支援的情況下省略 `--emoji` 以清除自己的反應；請參閱 /tools/reactions)
  - 僅限 WhatsApp：`--participant`, `--from-me`
  - Signal 群組反應：需要 `--target-author` 或 `--target-author-uuid`

- `reactions`
  - 頻道：Discord/Google Chat/Slack/Matrix
  - 必填：`--message-id`, `--target`
  - 選填：`--limit`

- `read`
  - 頻道：Discord/Slack/Matrix
  - 必填：`--target`
  - 選填：`--limit`, `--message-id`, `--before`, `--after`
  - 僅限 Slack：`--message-id` 會讀取特定的 Slack 訊息時間戳記；與 `--thread-id` 結合以讀取確切的主題回覆。
  - 僅限 Discord：`--around`

- `edit`
  - 頻道：Discord/Slack/Matrix
  - 必填：`--message-id`、`--message`、`--target`

- `delete`
  - 頻道：Discord/Slack/Telegram/Matrix
  - 必填：`--message-id`、`--target`

- `pin` / `unpin`
  - 頻道：Discord/Slack/Matrix
  - 必填：`--message-id`、`--target`

- `pins` (清單)
  - 頻道：Discord/Slack/Matrix
  - 必填：`--target`

- `permissions`
  - 頻道：Discord/Matrix
  - 必填：`--target`
  - 僅限 Matrix：當啟用 Matrix 加密並允許驗證動作時可用

- `search`
  - 頻道：Discord
  - 必填：`--guild-id`、`--query`
  - 選填：`--channel-id`、`--channel-ids` (可重複)、`--author-id`、`--author-ids` (可重複)、`--limit`

### 討論串

- `thread create`
  - 頻道：Discord
  - 必填：`--thread-name`、`--target` (頻道 ID)
  - 選填：`--message-id`、`--message`、`--auto-archive-min`

- `thread list`
  - 頻道：Discord
  - 必填：`--guild-id`
  - 選填：`--channel-id`、`--include-archived`、`--before`、`--limit`

- `thread reply`
  - 頻道：Discord
  - 必填：`--target` (主題 ID)、`--message`
  - 選填：`--media`、`--reply-to`

### 表情符號

- `emoji list`
  - Discord：`--guild-id`
  - Slack：無額外旗標

- `emoji upload`
  - 頻道：Discord
  - 必填：`--guild-id`、`--emoji-name`、`--media`
  - 選填：`--role-ids` (可重複)

### 貼圖

- `sticker send`
  - 頻道：Discord
  - 必填：`--target`、`--sticker-id` (可重複)
  - 選用：`--message`

- `sticker upload`
  - 頻道：Discord
  - 必要：`--guild-id`、`--sticker-name`、`--sticker-desc`、`--sticker-tags`、`--media`

### 角色 / 頻道 / 成員 / 語音

- `role info` (Discord)：`--guild-id`
- `role add` / `role remove` (Discord)：`--guild-id`、`--user-id`、`--role-id`
- `channel info` (Discord)：`--target`
- `channel list` (Discord)：`--guild-id`
- `member info` (Discord/Slack)：`--user-id`（Discord 需要 + `--guild-id`）
- `voice status` (Discord)：`--guild-id`、`--user-id`

### 活動

- `event list` (Discord)：`--guild-id`
- `event create` (Discord)：`--guild-id`、`--event-name`、`--start-time`
  - 選用：`--end-time`、`--desc`、`--channel-id`、`--location`、`--event-type`

### 管理 (Discord)

- `timeout`：`--guild-id`、`--user-id`（選用 `--duration-min` 或 `--until`；省略兩者以清除逾時）
- `kick`：`--guild-id`、`--user-id`（+ `--reason`）
- `ban`：`--guild-id`、`--user-id`（+ `--delete-days`、`--reason`）
  - `timeout` 也支援 `--reason`

### 廣播

- `broadcast`
  - 頻道：任何已設定的頻道；使用 `--channel all` 以目標指向所有提供者
  - 必要：`--targets <target...>`
  - 選填：`--message`、`--media`、`--dry-run`

## 範例

發送 Discord 回覆：

```
openclaw message send --channel discord \
  --target channel:123 --message "hi" --reply-to 456
```

發送包含語義按鈕的訊息：

```
openclaw message send --channel discord \
  --target channel:123 --message "Choose:" \
  --presentation '{"blocks":[{"type":"buttons","buttons":[{"label":"Approve","value":"approve","style":"success"},{"label":"Decline","value":"decline","style":"danger"}]}]}'
```

Core 會根據頻道功能，將相同的 `presentation` payload 渲染為 Discord 元件、Slack 區塊、Telegram 內聯按鈕、Mattermost 屬性，或是 Teams/Feishu 卡片。完整的約定與回退規則請參閱 [訊息呈現](/zh-Hant/plugins/message-presentation)。

發送更豐富的呈現 payload：

```bash
openclaw message send --channel googlechat --target spaces/AAA... \
  --message "Choose:" \
  --presentation '{"title":"Deploy approval","tone":"warning","blocks":[{"type":"text","text":"Choose a path"},{"type":"buttons","buttons":[{"label":"Approve","value":"approve"},{"label":"Decline","value":"decline"}]}]}'
```

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

透過通用呈現發送 Telegram 內聯按鈕：

```
openclaw message send --channel telegram --target @mychat --message "Choose:" \
  --presentation '{"blocks":[{"type":"buttons","buttons":[{"label":"Yes","value":"cmd:yes"},{"label":"No","value":"cmd:no"}]}]}'
```

透過通用呈現發送 Teams 卡片：

```bash
openclaw message send --channel msteams \
  --target conversation:19:abc@thread.tacv2 \
  --presentation '{"title":"Status update","blocks":[{"type":"text","text":"Build completed"}]}'
```

將 Telegram 圖片以文件形式傳送以避免壓縮：

```bash
openclaw message send --channel telegram --target @mychat \
  --media ./diagram.png --force-document
```

## 相關

- [CLI 參考](/zh-Hant/cli)
- [Agent send](/zh-Hant/tools/agent-send)
