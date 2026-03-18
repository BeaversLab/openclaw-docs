---
summary: "Slack 設定與執行時期行為（Socket 模式 + HTTP Events API）"
read_when:
  - Setting up Slack or debugging Slack socket/HTTP mode
title: "Slack"
---

# Slack

狀態：透過 Slack 應用程式整合，已支援 DM 與頻道的正式環境使用。預設模式為 Socket 模式；亦支援 HTTP Events API 模式。

<CardGroup cols={3}>
  <Card title="配對" icon="link" href="/zh-Hant/channels/pairing">
    Slack DM 預設為配對模式。
  </Card>
  <Card title="斜線指令" icon="terminal" href="/zh-Hant/tools/slash-commands">
    原生指令行為與指令目錄。
  </Card>
  <Card title="頻道疑難排解" icon="wrench" href="/zh-Hant/channels/troubleshooting">
    跨頻道診斷與修復手冊。
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

        環境變數回退 (僅限預設帳戶)：

```bash
SLACK_APP_TOKEN=xapp-...
SLACK_BOT_TOKEN=xoxb-...
```

      </Step>

      <Step title="Subscribe app events">
        訂閱 Bot 事件：

        - `app_mention`
        - `message.channels`, `message.groups`, `message.im`, `message.mpim`
        - `reaction_added`, `reaction_removed`
        - `member_joined_channel`, `member_left_channel`
        - `channel_rename`
        - `pin_added`, `pin_removed`

        此外，請為 DM 啟用 App Home **Messages Tab**。
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
        - 將 Event Subscriptions + Interactivity + Slash command Request URL 設定為相同的 webhook 路徑 (預設為 `/slack/events`)

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

        為每個帳戶指定一個不同的 `webhookPath`，以免註冊發生衝突。
      </Step>
    </Steps>

  </Tab>
</Tabs>

## Token 模型

- Socket Mode 需要 `botToken` + `appToken`。
- HTTP 模式需要 `botToken` + `signingSecret`。
- Config tokens 會覆蓋 env fallback。
- `SLACK_BOT_TOKEN` / `SLACK_APP_TOKEN` env fallback 僅套用於預設帳戶。
- `userToken` (`xoxp-...`) 僅限設定 (無 env fallback)，且預設為唯讀行為 (`userTokenReadOnly: true`)。
- 選用：如果您希望傳出訊息使用 active agent 身份 (自訂 `username` 和圖示)，請新增 `chat:write.customize`。`icon_emoji` 使用 `:emoji_name:` 語法。

<Tip>
  對於操作/目錄讀取，設定後 user token 可優先使用。對於寫入，bot token 仍然優先；僅當設定
  `userTokenReadOnly: false` 且 bot token 不可用時，才允許使用 user-token 進行寫入。
</Tip>

## 存取控制與路由

<Tabs>
  <Tab title="DM policy">
    `channels.slack.dmPolicy` 控制 DM 存取 (舊版： `channels.slack.dm.policy`):

    - `pairing` (預設)
    - `allowlist`
    - `open` (需要 `channels.slack.allowFrom` 包含 `"*"`；舊版： `channels.slack.dm.allowFrom`)
    - `disabled`

    DM flags:

    - `dm.enabled` (預設 true)
    - `channels.slack.allowFrom` (建議)
    - `dm.allowFrom` (舊版)
    - `dm.groupEnabled` (群組 DM 預設 false)
    - `dm.groupChannels` (選用 MPIM allowlist)

    多帳戶優先順序:

    - `channels.slack.accounts.default.allowFrom` 僅套用於 `default` 帳戶。
    - 當命名帳戶自己的 `allowFrom` 未設定時，會繼承 `channels.slack.allowFrom`。
    - 命名帳戶不會繼承 `channels.slack.accounts.default.allowFrom`。

    DM 中的配對使用 `openclaw pairing approve slack <code>`。

  </Tab>

  <Tab title="頻道政策">
    `channels.slack.groupPolicy` 控制頻道處理：

    - `open`
    - `allowlist`
    - `disabled`

    頻道允許清單位於 `channels.slack.channels` 之下，應使用穩定的頻道 ID。

    執行時期備註：如果 `channels.slack` 完全缺失（僅透過環境變數設定），執行時期會回退至 `groupPolicy="allowlist"` 並記錄警告（即使已設定 `channels.defaults.groupPolicy`）。

    名稱/ID 解析：

    - 當 Token 權限允許時，頻道允許清單項目和 DM 允許清單項目會在啟動時解析
    - 未解析的頻道名稱項目會保持為設定的狀態，但預設會在路由中被忽略
    - 連入授權和頻道路由預設以 ID 為優先；直接的使用者名稱/slug 比對需要 `channels.slack.dangerouslyAllowNameMatching: true`

  </Tab>

  <Tab title="提及與頻道使用者">
    頻道訊息預設會受提及閘控 (mention-gated)。

    提及來源：

    - 明確的 App 提及 (`<@botId>`)
    - 提及正則表達式模式 (`agents.list[].groupChat.mentionPatterns`，後備 `messages.groupChat.mentionPatterns`)
    - 隱含的回覆 Bot thread 行為

    逐頻道控制 (`channels.slack.channels.<id>`；僅能透過啟動時解析或 `dangerouslyAllowNameMatching` 使用名稱)：

    - `requireMention`
    - `users` (allowlist)
    - `allowBots`
    - `skills`
    - `systemPrompt`
    - `tools`, `toolsBySender`
    - `toolsBySender` 金鑰格式：`id:`, `e164:`, `username:`, `name:`, 或 `"*"` 萬用字元
      (舊版無前綴金鑰仍僅對應至 `id:`)

  </Tab>
</Tabs>

## 指令與斜線行為

- 原生指令自動模式針對 Slack 為**關閉** (`commands.native: "auto"` 不會啟用 Slack 原生指令)。
- 使用 `channels.slack.commands.native: true`（或全域 `commands.native: true`）啟用原生 Slack 指令處理程式。
- 啟用原生指令時，請在 Slack 中註冊相符的斜線指令（`/<command>` 名稱），但有一個例外：
  - 為狀態指令註冊 `/agentstatus`（Slack 保留 `/status`）
- 如果未啟用原生指令，您可以透過 `channels.slack.slashCommand` 執行單一設定的斜線指令。
- 原生引數選單現在會調整其呈現策略：
  - 最多 5 個選項：按鈕區塊
  - 6-100 個選項：靜態選擇選單
  - 超過 100 個選項：外部選擇，並在可用互動選項處理程式時進行非同步選項篩選
  - 如果編碼的選項值超過 Slack 限制，流程會退回至按鈕
- 對於冗長的選項承載，斜線指令引數選單會在分派所選值之前使用確認對話框。

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

或僅針對單一 Slack 帳戶啟用它：

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

- 這是 Slack 專用的 UI。其他頻道不會將 Slack Block Kit 指令翻譯成其自己的按鈕系統。
- 互動式回呼值是 OpenClaw 產生的不透明權杖，而非原始的代理程式建立值。
- 如果產生的互動區塊會超過 Slack Block Kit 限制，OpenClaw 會退回至原始文字回覆，而不是傳送無效的區塊承載。

預設斜線指令設定：

- `enabled: false`
- `name: "openclaw"`
- `sessionPrefix: "slack:slash"`
- `ephemeral: true`

Slash 會話使用獨立金鑰：

- `agent:<agentId>:slack:slash:<userId>`

並且仍針對目標對話會話（`CommandTargetSessionKey`）路由指令執行。

## 串接、會話和回覆標籤

- DMs 路由為 `direct`；頻道為 `channel`；MPIM 為 `group`。
- 使用預設的 `session.dmScope=main`，Slack DMs 會折疊至 agent 主要會話。
- 頻道會話：`agent:<agentId>:slack:channel:<channelId>`。
- 執行緒回覆可以在適用時建立執行緒會話後綴（`:thread:<threadTs>`）。
- `channels.slack.thread.historyScope` 預設為 `thread`；`thread.inheritParent` 預設為 `false`。
- `channels.slack.thread.initialHistoryLimit` 控制當新執行緒會話開始時取得多少現有的執行緒訊息（預設 `20`；設定 `0` 以停用）。

回覆執行緒控制：

- `channels.slack.replyToMode`：`off|first|all`（預設 `off`）
- `channels.slack.replyToModeByChatType`：每個 `direct|group|channel`
- 直接聊天的舊版後備：`channels.slack.dm.replyToMode`

支援手動回覆標籤：

- `[[reply_to_current]]`
- `[[reply_to:<id>]]`

注意：`replyToMode="off"` 會停用 Slack 中**所有**回覆執行緒，包括明確的 `[[reply_to_*]]` 標籤。這與 Telegram 不同，後者在 `"off"` 模式下仍會遵守明確標籤。這種差異反映了平台的執行緒模型：Slack 執行緒會將訊息從頻道中隱藏，而 Telegram 回覆則在主要聊天流程中保持可見。

## 媒體、分塊與傳遞

<AccordionGroup>
  <Accordion title="Inbound attachments">
    Slack 檔案附件是從 Slack 託管的私有 URL 下載的（經過令牌驗證的請求流程），並在擷取成功且大小限制允許時寫入媒體儲存區。

    執行時入站大小上限預設為 `20MB`，除非被 `channels.slack.mediaMaxMb` 覆寫。

  </Accordion>

<Accordion title="Outbound text and files">
  - text chunks use `channels.slack.textChunkLimit` (default 4000) -
  `channels.slack.chunkMode="newline"` enables paragraph-first splitting - file sends use Slack
  upload APIs and can include thread replies (`thread_ts`) - outbound media cap follows
  `channels.slack.mediaMaxMb` when configured; otherwise channel sends use MIME-kind defaults from
  media pipeline
</Accordion>

  <Accordion title="Delivery targets">
    Preferred explicit targets:

    - `user:<id>` for DMs
    - `channel:<id>` for channels

    Slack DMs are opened via Slack conversation APIs when sending to user targets.

  </Accordion>
</AccordionGroup>

## Actions and gates

Slack actions are controlled by `channels.slack.actions.*`.

Available action groups in current Slack tooling:

| Group      | Default |
| ---------- | ------- |
| messages   | enabled |
| reactions  | enabled |
| pins       | enabled |
| memberInfo | enabled |
| emojiList  | enabled |

## Events and operational behavior

- Message edits/deletes/thread broadcasts are mapped into system events.
- Reaction add/remove events are mapped into system events.
- Member join/leave, channel created/renamed, and pin add/remove events are mapped into system events.
- Assistant thread status updates (for "is typing..." indicators in threads) use `assistant.threads.setStatus` and require bot scope `assistant:write`.
- `channel_id_changed` can migrate channel config keys when `configWrites` is enabled.
- Channel topic/purpose metadata is treated as untrusted context and can be injected into routing context.
- Block actions and modal interactions emit structured `Slack interaction: ...` system events with rich payload fields:
  - block actions: selected values, labels, picker values, and `workflow_*` metadata
  - modal `view_submission` and `view_closed` events with routed channel metadata and form inputs

## Ack reactions

`ackReaction` sends an acknowledgement emoji while OpenClaw is processing an inbound message.

Resolution order:

- `channels.slack.accounts.<accountId>.ackReaction`
- `channels.slack.ackReaction`
- `messages.ackReaction`
- agent identity emoji fallback (`agents.list[].identity.emoji`, else "👀")

備註：

- Slack 預期的是 shortcodes（例如 `"eyes"`）。
- 使用 `""` 為 Slack 帳號或全域停用該反應。

## Typing reaction fallback

`typingReaction` 會在 OpenClaw 處理回覆時，對傳入的 Slack 訊息新增一個暫時性的反應，然後在執行完成時將其移除。當 Slack 原生助手輸入狀態不可用時（特別是在 DM 中），這是一個很有用的備用方案。

解析順序：

- `channels.slack.accounts.<accountId>.typingReaction`
- `channels.slack.typingReaction`

備註：

- Slack 預期的是 shortcodes（例如 `"hourglass_flowing_sand"`）。
- 此反應是「盡力而為」的，並且會在回覆或失敗路徑完成後自動嘗試進行清理。

## Manifest 和 scope 檢查清單

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
      "bot": [
        "chat:write",
        "channels:history",
        "channels:read",
        "groups:history",
        "im:history",
        "im:read",
        "im:write",
        "mpim:history",
        "mpim:read",
        "mpim:write",
        "users:read",
        "app_mentions:read",
        "assistant:write",
        "reactions:read",
        "reactions:write",
        "pins:read",
        "pins:write",
        "emoji:read",
        "commands",
        "files:read",
        "files:write"
      ]
    }
  },
  "settings": {
    "socket_mode_enabled": true,
    "event_subscriptions": {
      "bot_events": [
        "app_mention",
        "message.channels",
        "message.groups",
        "message.im",
        "message.mpim",
        "reaction_added",
        "reaction_removed",
        "member_joined_channel",
        "member_left_channel",
        "channel_rename",
        "pin_added",
        "pin_removed"
      ]
    }
  }
}
```

  </Accordion>

  <Accordion title="Optional user-token scopes (read operations)">
    如果您設定 `channels.slack.userToken`，典型的讀取權限範圍如下：

    - `channels:history`, `groups:history`, `im:history`, `mpim:history`
    - `channels:read`, `groups:read`, `im:read`, `mpim:read`
    - `users:read`
    - `reactions:read`
    - `pins:read`
    - `emoji:read`
    - `search:read` (如果您依賴 Slack 搜尋讀取)

  </Accordion>
</AccordionGroup>

## 疑難排解

<AccordionGroup>
  <Accordion title="No replies in channels">
    請依序檢查：

    - `groupPolicy`
    - channel allowlist (`channels.slack.channels`)
    - `requireMention`
    - 每個頻道的 `users` allowlist

    實用指令：

```bash
openclaw channels status --probe
openclaw logs --follow
openclaw doctor
```

  </Accordion>

  <Accordion title="DM messages ignored">
    檢查：

    - `channels.slack.dm.enabled`
    - `channels.slack.dmPolicy` (或舊版 `channels.slack.dm.policy`)
    - 配對核准 / 允許列表項目

```bash
openclaw pairing list slack
```

  </Accordion>

<Accordion title="Socket mode not connecting">
  驗證 Slack 應用程式設定中的 Bot + 應用程式 Token 和 Socket Mode 啟用狀態。
</Accordion>

  <Accordion title="HTTP mode not receiving events">
    驗證：

    - 簽署金鑰
    - webhook 路徑
    - Slack Request URLs (Events + Interactivity + Slash Commands)
    - 每個 HTTP 帳戶唯一的 `webhookPath`

  </Accordion>

  <Accordion title="Native/slash commands not firing">
    驗證您原本的意圖：

    - 原生命令模式 (`channels.slack.commands.native: true`) 搭配在 Slack 中註冊的相符斜線命令
    - 或單一斜線命令模式 (`channels.slack.slashCommand.enabled: true`)

    另請檢查 `commands.useAccessGroups` 和頻道/使用者允許列表。

  </Accordion>
</AccordionGroup>

## 文字串流

OpenClaw 支援透過 Agents 和 AI Apps API 進行 Slack 原生文字串流。

`channels.slack.streaming` 控制即時預覽行為：

- `off`：停用即時預覽串流。
- `partial` (預設)：以最新的部分輸出取代預覽文字。
- `block`：附加區塊化預覽更新。
- `progress`：在生成時顯示進度狀態文字，然後傳送最終文字。

當 `streaming` 為 `partial` 時，`channels.slack.nativeStreaming` 控制 Slack 原生串流 API (`chat.startStream` / `chat.appendStream` / `chat.stopStream`) (預設： `true`)。

停用原生 Slack 串流 (保留草稿預覽行為)：

```yaml
channels:
  slack:
    streaming: partial
    nativeStreaming: false
```

舊版金鑰：

- `channels.slack.streamMode` (`replace | status_final | append`) 會自動遷移至 `channels.slack.streaming`。
- 布林值 `channels.slack.streaming` 會自動遷移至 `channels.slack.nativeStreaming`。

### 需求

1. 在您的 Slack 應用程式設定中啟用 **Agents and AI Apps**。
2. 確保應用程式具備 `assistant:write` 範圍。
3. 該訊息必須具備可用的回覆串。串的選取仍遵循 `replyToMode`。

### 行為

- 第一個文字區塊啟動串流 (`chat.startStream`)。
- 後續文字區塊附加至同一個串流 (`chat.appendStream`)。
- 回覆結束時完成串流 (`chat.stopStream`)。
- 媒體和非文字酬載會回退至正常傳遞方式。
- 如果在回覆中途串流失敗，OpenClaw 會對其餘酬載回退至正常傳遞方式。

## 設定參考指標

主要參考：

- [Configuration reference - Slack](/zh-Hant/gateway/configuration-reference#slack)

  高優先性 Slack 欄位：
  - 模式/驗證：`mode`、`botToken`、`appToken`、`signingSecret`、`webhookPath`、`accounts.*`
  - DM 存取：`dm.enabled`、`dmPolicy`、`allowFrom` (舊版：`dm.policy`、`dm.allowFrom`)、`dm.groupEnabled`、`dm.groupChannels`
  - 相容性切換開關：`dangerouslyAllowNameMatching` (應急措施；除非必要否則請保持關閉)
  - 頻道存取：`groupPolicy`、`channels.*`、`channels.*.users`、`channels.*.requireMention`
  - 串接/紀錄：`replyToMode`、`replyToModeByChatType`、`thread.*`、`historyLimit`、`dmHistoryLimit`、`dms.*.historyLimit`
  - 傳遞：`textChunkLimit`、`chunkMode`、`mediaMaxMb`、`streaming`、`nativeStreaming`
  - ops/features: `configWrites`, `commands.native`, `slashCommand.*`, `actions.*`, `userToken`, `userTokenReadOnly`

## 相關

- [配對](/zh-Hant/channels/pairing)
- [通道路由](/zh-Hant/channels/channel-routing)
- [疑難排解](/zh-Hant/channels/troubleshooting)
- [設定](/zh-Hant/gateway/configuration)
- [斜線指令](/zh-Hant/tools/slash-commands)

import footerZhHant from "/components/footer/zh-Hant.mdx";

<footerZhHant />
