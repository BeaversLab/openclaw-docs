---
summary: "Slack 設定與執行時期行為（Socket 模式 + HTTP Events API）"
read_when:
  - Setting up Slack or debugging Slack socket/HTTP mode
title: "Slack"
---

# Slack

狀態：透過 Slack 應用程式整合，在 DMs + 頻道上已達生產就緒狀態。預設模式為 Socket 模式；也支援 HTTP Events API 模式。

<CardGroup cols={3}>
  <Card title="配對" icon="link" href="/zh-Hant/channels/pairing">
    Slack DMs 預設為配對模式。
  </Card>
  <Card title="斜線指令" icon="terminal" href="/zh-Hant/tools/slash-commands">
    原生指令行為與指令目錄。
  </Card>
  <Card title="Channel troubleshooting" icon="wrench" href="/zh-Hant/channels/troubleshooting">
    跨頻道診斷與修復手冊。
  </Card>
</CardGroup>

## 快速設定

<Tabs>
  <Tab title="Socket Mode (default)">
    <Steps>
      <Step title="建立 Slack 應用程式與權杖">
        在 Slack 應用程式設定中：

        - 啟用 **Socket Mode**
        - 建立 **App Token** (`xapp-...`) 並設定 `connections:write`
        - 安裝應用程式並複製 **Bot Token** (`xoxb-...`)
      </Step>

      <Step title="設定 OpenClaw">

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

        環境變數備用方案 (僅適用於預設帳戶)：

```exec
SLACK_APP_TOKEN=xapp-...
SLACK_BOT_TOKEN=xoxb-...
```

      </Step>

      <Step title="訂閱應用程式事件">
        訂閱以下 Bot 事件：

        - `app_mention`
        - `message.channels`、`message.groups`、`message.im`、`message.mpim`
        - `reaction_added`、`reaction_removed`
        - `member_joined_channel`、`member_left_channel`
        - `channel_rename`
        - `pin_added`、`pin_removed`

        此外，針對 DM 啟用 App Home 的 **Messages Tab**。
      </Step>

      <Step title="啟動閘道">

```exec
openclaw gateway
```

      </Step>
    </Steps>

  </Tab>

  <Tab title="HTTP Events API mode">
    <Steps>
      <Step title="Configure Slack app for HTTP">

        - set mode to HTTP (`channels.slack.mode="http"`)
        - copy Slack **Signing Secret**
        - set Event Subscriptions + Interactivity + Slash command Request URL to the same webhook path (default `/slack/events`)

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
        Per-account HTTP mode is supported.

        Give each account a distinct `webhookPath` so registrations do not collide.
      </Step>
    </Steps>

  </Tab>
</Tabs>

## Token 模型

- `botToken` + `appToken` 是 Socket Mode 所必需的。
- HTTP 模式需要 `botToken` + `signingSecret`。
- 配置權杖會覆蓋環境變數備援。
- `SLACK_BOT_TOKEN` / `SLACK_APP_TOKEN` 環境變數備援僅適用於預設帳戶。
- `userToken` (`xoxp-...`) 僅限於配置（無環境變數備援），且預設為唯讀行為 (`userTokenReadOnly: true`)。
- 可選：如果您希望傳出訊息使用使用中的代理程式身分（自訂 `username` 和圖示），請新增 `chat:write.customize`。`icon_emoji` 使用 `:emoji_name:` 語法。

<Tip>針對動作/目錄讀取，若已設定可優先使用使用者權杖。針對寫入，機器人權杖 仍為優先；僅當 `userTokenReadOnly: false` 且無法使用機器人 權杖時，才允許使用者權杖寫入。</Tip>

## 存取控制與路由

<Tabs>
  <Tab title="DM policy">
    `channels.slack.dmPolicy` 控制 DM 存取（舊版：`channels.slack.dm.policy`）：

    - `pairing`（預設）
    - `allowlist`
    - `open`（要求 `channels.slack.allowFrom` 包含 `"*"`；舊版：`channels.slack.dm.allowFrom`）
    - `disabled`

    DM 標記：

    - `dm.enabled`（預設為 true）
    - `channels.slack.allowFrom`（偏好）
    - `dm.allowFrom`（舊版）
    - `dm.groupEnabled`（群組 DM 預設為 false）
    - `dm.groupChannels`（選用的 MPIM 許可清單）

    多帳號優先順序：

    - `channels.slack.accounts.default.allowFrom` 僅套用於 `default` 帳號。
    - 具名帳號在其本身的 `allowFrom` 未設定時會繼承 `channels.slack.allowFrom`。
    - 具名帳號不會繼承 `channels.slack.accounts.default.allowFrom`。

    DM 中的配對使用 `openclaw pairing approve slack <code>`。

  </Tab>

  <Tab title="Channel policy">
    `channels.slack.groupPolicy` 控制頻道處理：

    - `open`
    - `allowlist`
    - `disabled`

    頻道允許列表位於 `channels.slack.channels` 之下，應使用穩定的頻道 ID。

    執行時注意：如果完全缺少 `channels.slack`（僅透過環境變數設定），執行時會回退至 `groupPolicy="allowlist"` 並記錄警告（即使設定了 `channels.defaults.groupPolicy`）。

    名稱/ID 解析：

    - 當 Token 權限允許時，頻道允許列表條目與 DM 允許列表條目會在啟動時進行解析
    - 未解析的頻道名稱條目會保持設定的樣子，但預設會被路由忽略
    - 連入授權與頻道路由預設優先使用 ID；直接的使用者名稱/slug 匹配需要 `channels.slack.dangerouslyAllowNameMatching: true`

  </Tab>

  <Tab title="提及與頻道使用者">
    頻道訊息預設由提及過濾。

    提及來源：

    - 明確的應用程式提及 (`<@botId>`)
    - 提及正則表達式模式 (`agents.list[].groupChat.mentionPatterns`，後備 `messages.groupChat.mentionPatterns`)
    - 隱含的回覆機器人執行緒行為

    各頻道控制項 (`channels.slack.channels.<id>`；僅限名稱透過啟動解析或 `dangerouslyAllowNameMatching`)：

    - `requireMention`
    - `users` (允許清單)
    - `allowBots`
    - `skills`
    - `systemPrompt`
    - `tools`, `toolsBySender`
    - `toolsBySender` 金鑰格式：`id:`、`e164:`、`username:`、`name:` 或 `"*"` 萬用字元
      (舊版無前綴金鑰仍僅對應至 `id:`)

  </Tab>
</Tabs>

## 指令與斜線行為

- Slack 的原生指令自動模式為「關閉」（`commands.native: "auto"` 不會啟用 Slack 原生指令）。
- 使用 `channels.slack.commands.native: true`（或全域 `commands.native: true`）啟用原生 Slack 指令處理程式。
- 啟用原生指令時，請在 Slack 中註冊相符的斜線指令（`/<command>` 名稱），但有一個例外：
  - 為狀態指令註冊 `/agentstatus`（Slack 保留了 `/status`）
- 如果未啟用原生指令，您可以透過 `channels.slack.slashCommand` 執行單一設定的斜線指令。
- 原生參數選單現在會調整其呈現策略：
  - 最多 5 個選項：按鈕區塊
  - 6-100 個選項：靜態選取選單
  - 超過 100 個選項：當有互動選項處理程式可用時，使用具有非同步選項篩選的外部選取
  - 如果編碼的選項值超過 Slack 限制，流程會退回到按鈕
- 對於較長的選項載荷，斜線指令參數選單會在發送所選值之前使用確認對話框。

## 互動式回覆

Slack 可以呈現 Agent 建立的互動式回覆控件，但此功能預設為停用。

全域啟用：

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

或僅對單一 Slack 帳號啟用：

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

啟用後，Agent 可以發出 Slack 專用的回覆指令：

- `[[slack_buttons: Approve:approve, Reject:reject]]`
- `[[slack_select: Choose a target | Canary:canary, Production:production]]`

這些指令會編譯為 Slack Block Kit，並透過現有的 Slack 互動事件路徑將點擊或選擇路由回來。

備註：

- 這是 Slack 專用的 UI。其他頻道不會將 Slack Block Kit 指令轉換為其自身的按鈕系統。
- 互動式回調值是 OpenClaw 產生的不透明標記，而非 Agent 建立的原始值。
- 如果生成的互動區塊超過 Slack Block Kit 的限制，OpenClaw 將回退為原始文字回覆，而不是發送無效的區塊承載。

預設斜線指令設定：

- `enabled: false`
- `name: "openclaw"`
- `sessionPrefix: "slack:slash"`
- `ephemeral: true`

斜線會話使用隔離的金鑰：

- `agent:<agentId>:slack:slash:<userId>`

並且仍將指令執行路由到目標對話會話 (`CommandTargetSessionKey`)。

## 串接、會話和回覆標籤

- DM 路由為 `direct`；頻道路由為 `channel`；MPIM 路由為 `group`。
- 使用預設的 `session.dmScope=main`，Slack DM 會折疊為 Agent 主會話。
- 頻道會話：`agent:<agentId>:slack:channel:<channelId>`。
- 回覆主題可以在適用時建立主題階段後綴（`:thread:<threadTs>`）。
- `channels.slack.thread.historyScope` 預設為 `thread`；`thread.inheritParent` 預設為 `false`。
- `channels.slack.thread.initialHistoryLimit` 控制開始新的主題階段時擷取多少個現有的主題訊息（預設 `20`；設定 `0` 以停用）。

回覆主題控制：

- `channels.slack.replyToMode`：`off|first|all`（預設 `off`）
- `channels.slack.replyToModeByChatType`：每個 `direct|group|channel`
- 直接聊天的舊版後備：`channels.slack.dm.replyToMode`

支援手動回覆標籤：

- `[[reply_to_current]]`
- `[[reply_to:<id>]]`

注意：`replyToMode="off"` 會停用 Slack 中**所有**回覆串，包括明確的 `[[reply_to_*]]` 標籤。這與 Telegram 不同，後者在 `"off"` 模式下仍會遵守明確的標籤。這種差異反映了平台的串模型：Slack 串會將訊息從頻道中隱藏，而 Telegram 回覆則會保留在主要聊天流程中可見。

## 媒體、區塊分割與傳遞

<AccordionGroup>
  <Accordion title="Inbound attachments">
    Slack 檔案附件會從 Slack 託管的私人 URL（經過權杖驗證的要求流程）下載，並在擷取成功且大小限制允許的情況下寫入至媒體存放區。

    執行時期的入站大小上限預設為 `20MB`，除非被 `channels.slack.mediaMaxMb` 覆蓋。

  </Accordion>

<Accordion title="Outbound text and files">
  - text chunks use `channels.slack.textChunkLimit` (default 4000) - `channels.slack.chunkMode="newline"` enables paragraph-first splitting - file sends use Slack upload APIs and can include thread replies (`thread_ts`) - outbound media cap follows `channels.slack.mediaMaxMb` when configured; otherwise channel sends use MIME-kind defaults from media pipeline
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

目前 Slack 工具中可用的操作群組：

| 群組       | 預設   |
| ---------- | ------ |
| messages   | 已啟用 |
| reactions  | 已啟用 |
| pins       | 已啟用 |
| memberInfo | 已啟用 |
| emojiList  | 已啟用 |

## 事件和運營行為

- 訊息編輯/刪除/串接廣播被映射為系統事件。
- 反應新增/移除事件被映射為系統事件。
- 成員加入/離開、頻道建立/重新命名以及釘選新增/移除事件被映射為系統事件。
- 助理串接狀態更新（用於串接中的「正在輸入...」指示器）使用 `assistant.threads.setStatus`，並且需要 bot scope `assistant:write`。
- 當啟用 `configWrites` 時，`channel_id_changed` 可以遷移頻道配置金鑰。
- 頻道主題/用途元資料被視為不受信任的上下文，並可以注入到路由上下文中。
- 區塊動作和模態互動會發出具有豐富負載欄位的結構化 `Slack interaction: ...` 系統事件：
  - 區塊動作：選定值、標籤、選擇器值，以及 `workflow_*` 元資料
  - 模態 `view_submission` 和 `view_closed` 事件，包含路由的頻道元資料和表單輸入

## 確認反應

當 OpenClaw 正在處理傳入訊息時，`ackReaction` 會發送確認表情符號。

解析順序：

- `channels.slack.accounts.<accountId>.ackReaction`
- `channels.slack.ackReaction`
- `messages.ackReaction`
- 代理身分表情符號後備機制 (`agents.list[].identity.emoji`，否則為 "👀")

備註：

- Slack 預期使用短代碼 (例如 `"eyes"`)。
- 使用 `""` 來針對 Slack 帳戶或全域停用該反應。

## 輸入中反應備用

當 OpenClaw 正在處理回覆時，`typingReaction` 會在傳入的 Slack 訊息上新增暫時的回應，然後在執行完成時將其移除。當 Slack 原生助手輸入狀態無法使用時，這是一個很有用的備案，特別是在 DMs 中。

解析順序：

- `channels.slack.accounts.<accountId>.typingReaction`
- `channels.slack.typingReaction`

備註：

- Slack 預期短代碼（例如 `"hourglass_flowing_sand"`）。
- 回應是「盡力而為」的，且會在回覆或失敗路徑完成後自動嘗試清理。

## 清單與範圍檢查清單

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
    - `search:read` (如果您依賴 Slack 搜尋讀取功能)

  </Accordion>
</AccordionGroup>

## 疑難排解

<AccordionGroup>
  <Accordion title="頻道中無回覆">
    請依序檢查：

    - `groupPolicy`
    - 頻道允許清單 (`channels.slack.channels`)
    - `requireMention`
    - 個別頻道 `users` 允許清單

    實用指令：

```exec
openclaw channels status --probe
openclaw logs --follow
openclaw doctor
```

  </Accordion>

  <Accordion title="DM 訊息被忽略">
    檢查：

    - `channels.slack.dm.enabled`
    - `channels.slack.dmPolicy` (或舊版 `channels.slack.dm.policy`)
    - 配對審核 / 允許清單項目

```exec
openclaw pairing list slack
```

  </Accordion>

<Accordion title="Socket 模式無法連線">在 Slack 應用程式設定中驗證 bot + 應用程式 Token 以及是否已啟用 Socket Mode。</Accordion>

  <Accordion title="HTTP mode not receiving events">
    驗證：

    - signing secret
    - webhook path
    - Slack Request URLs (Events + Interactivity + Slash Commands)
    - 每個 HTTP 帳戶唯一的 `webhookPath`

  </Accordion>

  <Accordion title="Native/slash commands not firing">
    驗證您的意圖：

    - 原生指令模式 (`channels.slack.commands.native: true`) 搭配在 Slack 中註冊的相符斜線指令
    - 或單一斜線指令模式 (`channels.slack.slashCommand.enabled: true`)

    同時請檢查 `commands.useAccessGroups` 和頻道/使用者白名單。

  </Accordion>
</AccordionGroup>

## 文字串流

OpenClaw 透過 Agents 和 AI Apps API 支援 Slack 原生文字串流。

`channels.slack.streaming` 控制即時預覽行為：

- `off`：停用即時預覽串流。
- `partial` (預設)：將預覽文字替換為最新的部分輸出。
- `block`：附加分塊預覽更新。
- `progress`：在生成時顯示進度狀態文字，然後發送最終文字。

當 `streaming` 為 `partial` 時，`channels.slack.nativeStreaming` 控制 Slack 的原生串流 API (`chat.startStream` / `chat.appendStream` / `chat.stopStream`)（預設：`true`）。

停用原生 Slack 串流（保留草稿預覽行為）：

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
2. 確保該應用程式具有 `assistant:write` 範圍。
3. 該訊息必須有一個可用的回覆串。串的選取仍遵循 `replyToMode`。

### 行為

- 第一個文字區塊啟動串流 (`chat.startStream`)。
- 後續的文字區塊附加至同一個串流 (`chat.appendStream`)。
- 回覆結束時確定串流 (`chat.stopStream`)。
- 媒體和非文字酬載會回退到正常傳遞。
- 如果在回覆中途串流失敗，OpenClaw 將對剩餘的酬載回退到正常傳遞。

## 設定參考指標

主要參考：

- [Configuration reference - Slack](/zh-Hant/gateway/configuration-reference#slack)

  高訊號 Slack 欄位：
  - 模式/認證：`mode`, `botToken`, `appToken`, `signingSecret`, `webhookPath`, `accounts.*`
  - DM 存取：`dm.enabled`, `dmPolicy`, `allowFrom` (舊版：`dm.policy`, `dm.allowFrom`), `dm.groupEnabled`, `dm.groupChannels`
  - 相容性切換開關：`dangerouslyAllowNameMatching` (break-glass；除非必要，否則請保持關閉)
  - 頻道存取：`groupPolicy`, `channels.*`, `channels.*.users`, `channels.*.requireMention`
  - threading/history: `replyToMode`, `replyToModeByChatType`, `thread.*`, `historyLimit`, `dmHistoryLimit`, `dms.*.historyLimit`
  - delivery: `textChunkLimit`, `chunkMode`, `mediaMaxMb`, `streaming`, `nativeStreaming`
  - ops/features: `configWrites`, `commands.native`, `slashCommand.*`, `actions.*`, `userToken`, `userTokenReadOnly`

## 相關

- [配對](/zh-Hant/channels/pairing)
- [通道路由](/zh-Hant/channels/channel-routing)
- [疑難排解](/zh-Hant/channels/troubleshooting)
- [設定](/zh-Hant/gateway/configuration)
- [斜線指令](/zh-Hant/tools/slash-commands)
