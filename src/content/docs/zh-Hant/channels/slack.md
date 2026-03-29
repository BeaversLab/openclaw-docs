---
summary: "Slack 設定與執行時期行為（Socket 模式 + HTTP Events API）"
read_when:
  - Setting up Slack or debugging Slack socket/HTTP mode
title: "Slack"
---

# Slack

狀態：透過 Slack 應用程式整合，支援 DM 和頻道的生產環境使用。預設模式為 Socket 模式；也支援 HTTP Events API 模式。

<CardGroup cols={3}>
  <Card title="配對" icon="link" href="/en/channels/pairing">
    Slack DM 預設為配對模式。
  </Card>
  <Card title="斜線指令" icon="terminal" href="/en/tools/slash-commands">
    原生指令行為與指令目錄。
  </Card>
  <Card title="頻道疑難排解" icon="wrench" href="/en/channels/troubleshooting">
    跨頻道診斷與修復指南。
  </Card>
</CardGroup>

## 快速設定

<Tabs>
  <Tab title="Socket Mode (default)">
    <Steps>
      <Step title="Create Slack app and tokens">
        在 Slack 應用程式設定中：

        - 啟用 **Socket Mode**
        - 建立具有 `connections:write` 的 **App Token** (`xapp-...`)
        - 安裝應用程式並複製 **Bot Token** (`xoxb-...`)
      </Step>

      <Step title="Configure OpenClaw">

```json5
{
  channels: {
    slack: {
      enabled: true,
      mode: "socket",
      appToken: "xapp-...",
      botToken: "xoxb-...",
    },
  },
}
```

        環境後備 (僅限預設帳戶)：

```bash
SLACK_APP_TOKEN=xapp-...
SLACK_BOT_TOKEN=xoxb-...
```

      </Step>

      <Step title="Subscribe app events">
        訂閱以下機器人事件：

        - `app_mention`
        - `message.channels`, `message.groups`, `message.im`, `message.mpim`
        - `reaction_added`, `reaction_removed`
        - `member_joined_channel`, `member_left_channel`
        - `channel_rename`
        - `pin_added`, `pin_removed`

        此外，為 DM 啟用 App Home **Messages Tab**。
      </Step>

      <Step title="Start gateway">

```bash
openclaw gateway
```

      </Step>
    </Steps>

  </Tab>

  <Tab title="HTTP Events API mode">
    <Steps>
      <Step title="Configure Slack app for HTTP">

        - 將模式設為 HTTP (`channels.slack.mode="http"`)
        - 複製 Slack **Signing Secret**
        - 將 Event Subscriptions + Interactivity + Slash command Request URL 設為相同的 webhook 路徑 (預設為 `/slack/events`)

      </Step>

      <Step title="Configure OpenClaw HTTP mode">

```json5
{
  channels: {
    slack: {
      enabled: true,
      mode: "http",
      botToken: "xoxb-...",
      signingSecret: "your-signing-secret",
      webhookPath: "/slack/events",
    },
  },
}
```

      </Step>

      <Step title="Use unique webhook paths for multi-account HTTP">
        支援每個帳戶的 HTTP 模式。

        為每個帳戶指定一個不同的 `webhookPath`，以免註冊衝突。
      </Step>
    </Steps>

  </Tab>
</Tabs>

## Token 模型

- Socket Mode 需要 `botToken` + `appToken`。
- HTTP 模式需要 `botToken` + `signingSecret`。
- 配置 Token 覆蓋環境變數後備值。
- `SLACK_BOT_TOKEN` / `SLACK_APP_TOKEN` 環境變數後備值僅適用於預設帳戶。
- `userToken` (`xoxp-...`) 僅限配置（無環境變數後備值），且預設為唯讀行為 (`userTokenReadOnly: true`)。
- 可選：如果您希望外發訊息使用啟動中的代理程式身份（自訂 `username` 和圖示），請新增 `chat:write.customize`。`icon_emoji` 使用 `:emoji_name:` 語法。

<Tip>對於動作/目錄讀取，配置後可優先使用使用者 Token。對於寫入，Bot Token 仍為優先；僅當 `userTokenReadOnly: false` 且 Bot Token 不可用時，才允許使用使用者 Token 進行寫入。</Tip>

## 存取控制與路由

<Tabs>
  <Tab title="DM 原則">
    `channels.slack.dmPolicy` 控制 DM 存取（舊版：`channels.slack.dm.policy`）：

    - `pairing` (預設)
    - `allowlist`
    - `open` (要求 `channels.slack.allowFrom` 包含 `"*"`；舊版：`channels.slack.dm.allowFrom`)
    - `disabled`

    DM 旗標：

    - `dm.enabled` (預設為 true)
    - `channels.slack.allowFrom` (建議)
    - `dm.allowFrom` (舊版)
    - `dm.groupEnabled` (群組 DM 預設為 false)
    - `dm.groupChannels` (選用 MPIM 允許清單)

    多帳戶優先順序：

    - `channels.slack.accounts.default.allowFrom` 僅適用於 `default` 帳戶。
    - 當命名帳戶自身的 `allowFrom` 未設定時，會繼承 `channels.slack.allowFrom`。
    - 命名帳戶不會繼承 `channels.slack.accounts.default.allowFrom`。

    DM 中的配對使用 `openclaw pairing approve slack <code>`。

  </Tab>

  <Tab title="Channel policy">
    `channels.slack.groupPolicy` 控制頻道處理：

    - `open`
    - `allowlist`
    - `disabled`

    頻道允許清單位於 `channels.slack.channels` 之下，應使用穩定的頻道 ID。

    執行時期注意事項：如果 `channels.slack` 完全缺失（僅環境變數設定），執行時期會回退至 `groupPolicy="allowlist"` 並記錄警告（即使已設定 `channels.defaults.groupPolicy`）。

    名稱/ID 解析：

    - 頻道允許清單項目和 DM 允許清單項目會在啟動時，於 Token 權限允許的情況下進行解析
    - 未解析的頻道名稱項目會保留設定，但預設會被路由忽略
    - 傳入授權和頻道路由預設優先使用 ID；直接的使用者名稱/slug 匹配需要 `channels.slack.dangerouslyAllowNameMatching: true`

  </Tab>

  <Tab title="Mentions and channel users">
    頻道訊息預設受提及門控限制。

    提及來源：

    - 明確的 App 提及 (`<@botId>`)
    - 提及正規表示式模式 (`agents.list[].groupChat.mentionPatterns`，後援 `messages.groupChat.mentionPatterns`)
    - 隱含的回覆 Bot Thread 行為

    逐頻道控制 (`channels.slack.channels.<id>`；名稱僅能透過啟動時解析或 `dangerouslyAllowNameMatching`)：

    - `requireMention`
    - `users` (allowlist)
    - `allowBots`
    - `skills`
    - `systemPrompt`
    - `tools`, `toolsBySender`
    - `toolsBySender` 金鑰格式：`id:`、`e164:`、`username:`、`name:` 或 `"*"` 萬用字元
      （舊版無前綴金鑰仍僅對應至 `id:`）

  </Tab>
</Tabs>

## 指令與斜線行為

- Slack 的原生指令自動模式為**關閉**（`commands.native: "auto"` 不會啟用 Slack 原生指令）。
- 使用 `channels.slack.commands.native: true`（或全局 `commands.native: true`）啟用原生 Slack 指令處理程式。
- 當啟用原生指令時，請在 Slack 中註冊相符的斜線指令（`/<command>` 名稱），但有一個例外：
  - 為狀態指令註冊 `/agentstatus`（Slack 保留了 `/status`）
- 如果未啟用原生指令，您可以透過 `channels.slack.slashCommand` 執行單一設定的斜線指令。
- 原生參數選單現在會調整其呈現策略：
  - 多達 5 個選項：按鈕區塊
  - 6-100 個選項：靜態選擇選單
  - 超過 100 個選項：當有互動選項處理程式可用時，使用外部選擇搭配非同步選項篩選
  - 如果編碼的選項值超過 Slack 限制，流程會還原為按鈕
- 對於長選項酬載，斜線指令參數選單會在發送選定的值之前使用確認對話框。

## 互動式回覆

Slack 可以呈現代理程式建立的互動式回覆控制項，但此功能預設為停用。

全域啟用它：

```json5
{
  channels: {
    slack: {
      capabilities: {
        interactiveReplies: true,
      },
    },
  },
}
```

或僅針對一個 Slack 帳號啟用它：

```json5
{
  channels: {
    slack: {
      accounts: {
        ops: {
          capabilities: {
            interactiveReplies: true,
          },
        },
      },
    },
  },
}
```

啟用後，代理程式可以發出 Slack 專用的回覆指令：

- `[[slack_buttons: Approve:approve, Reject:reject]]`
- `[[slack_select: Choose a target | Canary:canary, Production:production]]`

這些指令會編譯成 Slack Block Kit，並透過現有的 Slack 互動事件路徑將點擊或選擇路由回來。

備註：

- 這是 Slack 專用的 UI。其他頻道不會將 Slack Block Kit 指令轉換為它們自己的按鈕系統。
- 互動式回呼值是 OpenClaw 產生的不透明權杖，而非原始的代理程式建立值。
- 如果產生的互動式區塊會超過 Slack Block Kit 限制，OpenClaw 會還原為原始的文字回覆，而不是發送無效的區塊酬載。

預設斜線指令設定：

- `enabled: false`
- `name: "openclaw"`
- `sessionPrefix: "slack:slash"`
- `ephemeral: true`

斜線會話使用隔離的金鑰：

- `agent:<agentId>:slack:slash:<userId>`

並且仍會針對目標對話會話（`CommandTargetSessionKey`）路由指令執行。

## 串接、會話和回覆標籤

- DMs route as `direct`; channels as `channel`; MPIMs as `group`。
- With default `session.dmScope=main`, Slack DMs collapse to agent main session.
- Channel sessions: `agent:<agentId>:slack:channel:<channelId>`。
- Thread replies can create thread session suffixes (`:thread:<threadTs>`) when applicable.
- `channels.slack.thread.historyScope` default is `thread`; `thread.inheritParent` default is `false`。
- `channels.slack.thread.initialHistoryLimit` controls how many existing thread messages are fetched when a new thread session starts (default `20`; set `0` to disable).

Reply threading controls:

- `channels.slack.replyToMode`: `off|first|all` (default `off`)
- `channels.slack.replyToModeByChatType`: per `direct|group|channel`
- legacy fallback for direct chats: `channels.slack.dm.replyToMode`

Manual reply tags are supported:

- `[[reply_to_current]]`
- `[[reply_to:<id>]]`

Note: `replyToMode="off"` disables **all** reply threading in Slack, including explicit `[[reply_to_*]]` tags. This differs from Telegram, where explicit tags are still honored in `"off"` mode. The difference reflects the platform threading models: Slack threads hide messages from the channel, while Telegram replies remain visible in the main chat flow.

## 媒體、分塊與傳遞

<AccordionGroup>
  <Accordion title="Inbound attachments">
    Slack file attachments are downloaded from Slack-hosted private URLs (token-authenticated request flow) and written to the media store when fetch succeeds and size limits permit.

    Runtime inbound size cap defaults to `20MB` unless overridden by `channels.slack.mediaMaxMb`.

  </Accordion>

<Accordion title="Outbound text and files">- 文字區塊使用 `channels.slack.textChunkLimit` (預設 4000) - `channels.slack.chunkMode="newline"` 啟用以段落為主的分割 - 檔案傳送使用 Slack 上傳 API 且可包含執行緒回覆 (`thread_ts`) - 連出媒體上限在設定後遵循 `channels.slack.mediaMaxMb`；否則頻道傳送使用媒體管線的 MIME 類型預設值</Accordion>

  <Accordion title="Delivery targets">
    首選的明確目標：

    - `user:<id>` 用於私訊
    - `channel:<id>` 用於頻道

    當傳送至使用者目標時，Slack 私訊會透過 Slack 對話 API 開啟。

  </Accordion>
</AccordionGroup>

## 動作與閘道

Slack 動作由 `channels.slack.actions.*` 控制。

目前 Slack 工具中可用的動作群組：

| 群組         | 預設   |
| ------------ | ------ |
| 訊息         | 已啟用 |
| 反應         | 已啟用 |
| 釘選         | 已啟用 |
| 成員資訊     | 已啟用 |
| 表情符號清單 | 已啟用 |

## 事件與營運行為

- 訊息編輯/刪除/執行緒廣播會對應到系統事件。
- 反應新增/移除事件會對應到系統事件。
- 成員加入/離開、頻道建立/重新命名以及釘選新增/移除事件會對應到系統事件。
- 助理執行緒狀態更新 (用於執行緒中的「正在輸入...」指示器) 使用 `assistant.threads.setStatus` 且需要機器人範圍 `assistant:write`。
- `channel_id_changed` 可以在啟用 `configWrites` 時遷移頻道設定金鑰。
- 頻道主題/目的元資料會被視為不受信任的上下文，並可注入到路由上下文中。
- 區塊動作和模態互動會發出結構化的 `Slack interaction: ...` 系統事件，其中包含豐富的 payload 欄位：
  - 區塊動作：選取的值、標籤、選擇器值以及 `workflow_*` 元資料
  - 模態 `view_submission` 和 `view_closed` 事件，包含路由頻道元資料和表單輸入

## 確認反應

`ackReaction` 會在 OpenClaw 處理傳入訊息時傳送確認表情符號。

解析順序：

- `channels.slack.accounts.<accountId>.ackReaction`
- `channels.slack.ackReaction`
- `messages.ackReaction`
- 代理身分表情符號備用方案 (`agents.list[].identity.emoji`，否則為 "👀")

備註：

- Slack 預期的是短代碼（例如 `"eyes"`）。
- 使用 `""` 針對 Slack 帳戶或全域停用此回應。

## 輸入中反應備用方案

`typingReaction` 會在 OpenClaw 處理回覆時，對傳入的 Slack 訊息新增暫時性的反應，然後在執行完成後將其移除。當 Slack 原生助理輸入狀態無法使用時，這是一個很有用的備用方案，特別是在直接訊息 (DM) 中。

解析順序：

- `channels.slack.accounts.<accountId>.typingReaction`
- `channels.slack.typingReaction`

備註：

- Slack 預期的是短代碼（例如 `"hourglass_flowing_sand"`）。
- 此反應採取盡力而為 的方式，並會在回覆或失敗路徑完成後自動嘗試進行清理。

## Manifest 與範圍檢查清單

<AccordionGroup>
  <Accordion title="Slack app manifest example">

```json
{
  "display_information": {
    "name": "OpenClaw",
    "description": "Slack connector for OpenClaw"
  },
  "features": {
    "bot_user": {
      "display_name": "OpenClaw",
      "always_online": false
    },
    "app_home": {
      "messages_tab_enabled": true,
      "messages_tab_read_only_enabled": false
    },
    "slash_commands": [
      {
        "command": "/openclaw",
        "description": "Send a message to OpenClaw",
        "should_escape": false
      }
    ]
  },
  "oauth_config": {
    "scopes": {
      "bot": ["chat:write", "channels:history", "channels:read", "groups:history", "im:history", "im:read", "im:write", "mpim:history", "mpim:read", "mpim:write", "users:read", "app_mentions:read", "assistant:write", "reactions:read", "reactions:write", "pins:read", "pins:write", "emoji:read", "commands", "files:read", "files:write"]
    }
  },
  "settings": {
    "socket_mode_enabled": true,
    "event_subscriptions": {
      "bot_events": ["app_mention", "message.channels", "message.groups", "message.im", "message.mpim", "reaction_added", "reaction_removed", "member_joined_channel", "member_left_channel", "channel_rename", "pin_added", "pin_removed"]
    }
  }
}
```

  </Accordion>

  <Accordion title="選用的使用者權杖範圍 (讀取作業)">
    如果您設定 `channels.slack.userToken`，典型的讀取範圍為：

    - `channels:history`、`groups:history`、`im:history`、`mpim:history`
    - `channels:read`、`groups:read`、`im:read`、`mpim:read`
    - `users:read`
    - `reactions:read`
    - `pins:read`
    - `emoji:read`
    - `search:read` (如果您依賴 Slack 搜尋讀取)

  </Accordion>
</AccordionGroup>

## 疑難排解

<AccordionGroup>
  <Accordion title="頻道中無回覆">
    請依序檢查：

    - `groupPolicy`
    - 頻道允許清單 (`channels.slack.channels`)
    - `requireMention`
    - 各頻道的 `users` 允許清單

    實用指令：

```bash
openclaw channels status --probe
openclaw logs --follow
openclaw doctor
```

  </Accordion>

  <Accordion title="忽略訊息">
    檢查：

    - `channels.slack.dm.enabled`
    - `channels.slack.dmPolicy` (或舊版 `channels.slack.dm.policy`)
    - 配對核准 / 允許清單項目

```bash
openclaw pairing list slack
```

  </Accordion>

<Accordion title="Socket 模式無法連線">在 Slack 應用程式設定中驗證 bot + 應用程式 token 及 Socket Mode 是否已啟用。</Accordion>

  <Accordion title="HTTP 模式未收到事件">
    驗證：

    - 簽署金鑰
    - webhook 路徑
    - Slack Request URLs (Events + Interactivity + Slash Commands)
    - 每個 HTTP 帳號唯一的 `webhookPath`

  </Accordion>

  <Accordion title="原生/斜線指令未觸發">
    確認您是否原本意圖使用：

    - 原生指令模式 (`channels.slack.commands.native: true`) 並在 Slack 中註冊了相符的斜線指令
    - 或是單一斜線指令模式 (`channels.slack.slashCommand.enabled: true`)

    同時也請檢查 `commands.useAccessGroups` 和頻道/使用者允許清單。

  </Accordion>
</AccordionGroup>

## 文字串流

OpenClaw 支援透過 Agents 和 AI Apps API 使用 Slack 原生文字串流。

`channels.slack.streaming` 控制即時預覽行為：

- `off`：停用即時預覽串流。
- `partial` (預設)：以最新的部分輸出取代預覽文字。
- `block`：附加分塊預覽更新。
- `progress`：產生時顯示進度狀態文字，然後傳送最終文字。

當 `streaming` 為 `partial` 時，`channels.slack.nativeStreaming` 控制 Slack 的原生串流 API (`chat.startStream` / `chat.appendStream` / `chat.stopStream`) (預設：`true`)。

停用 Slack 原生串流 (保持草稿預覽行為)：

```yaml
channels:
  slack:
    streaming: partial
    nativeStreaming: false
```

舊版金鑰：

- `channels.slack.streamMode` (`replace | status_final | append`) 會自動遷移至 `channels.slack.streaming`。
- boolean `channels.slack.streaming` 會自動遷移到 `channels.slack.nativeStreaming`。

### 需求

1. 在您的 Slack 應用程式設定中啟用 **Agents and AI Apps**。
2. 確保應用程式具有 `assistant:write` 範圍。
3. 該訊息必須具備可用的回覆串。串選擇仍遵循 `replyToMode`。

### 行為

- 第一個文字區塊會啟動串流 (`chat.startStream`)。
- 後續的文字區塊會附加至同一個串流 (`chat.appendStream`)。
- 回覆結束會完成串流 (`chat.stopStream`)。
- 媒體和非文字酬載會回退至正常傳遞。
- 如果在回覆過程中串流失敗，OpenClaw 會將其餘酬載回退至正常傳遞。

## 設定參考指引

主要參考：

- [Configuration reference - Slack](/en/gateway/configuration-reference#slack)

  重要的 Slack 欄位：
  - 模式/驗證：`mode`、`botToken`、`appToken`、`signingSecret`、`webhookPath`、`accounts.*`
  - DM 存取：`dm.enabled`、`dmPolicy`、`allowFrom` (舊版：`dm.policy`、`dm.allowFrom`)、`dm.groupEnabled`、`dm.groupChannels`
  - 相容性切換開關：`dangerouslyAllowNameMatching` (緊急措施；除非必要否則保持關閉)
  - 頻道存取：`groupPolicy`、`channels.*`、`channels.*.users`、`channels.*.requireMention`
  - 串接/歷史：`replyToMode`、`replyToModeByChatType`、`thread.*`、`historyLimit`、`dmHistoryLimit`、`dms.*.historyLimit`
  - 傳遞：`textChunkLimit`、`chunkMode`、`mediaMaxMb`、`streaming`、`nativeStreaming`
  - ops/features: `configWrites`, `commands.native`, `slashCommand.*`, `actions.*`, `userToken`, `userTokenReadOnly`

## 相關

- [配對](/en/channels/pairing)
- [通道路由](/en/channels/channel-routing)
- [疑難排解](/en/channels/troubleshooting)
- [設定](/en/gateway/configuration)
- [斜線指令](/en/tools/slash-commands)
