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
    Slack 私訊預設為配對模式。
  </Card>
  <Card title="斜線指令" icon="terminal" href="/en/tools/slash-commands">
    原生指令行為與指令目錄。
  </Card>
  <Card title="頻道疑難排解" icon="wrench" href="/en/channels/troubleshooting">
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
        - 建立 **App Token** (`xapp-...`) 並具有 `connections:write`
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

        環境變數後援 (僅限預設帳號)：

```bash
SLACK_APP_TOKEN=xapp-...
SLACK_BOT_TOKEN=xoxb-...
```

      </Step>

      <Step title="訂閱應用程式事件">
        為以下項目訂閱機器人事件：

        - `app_mention`
        - `message.channels`、`message.groups`、`message.im`、`message.mpim`
        - `reaction_added`、`reaction_removed`
        - `member_joined_channel`、`member_left_channel`
        - `channel_rename`
        - `pin_added`、`pin_removed`

        同時為 DM 啟用 App Home 的 **訊息分頁**。
      </Step>

      <Step title="啟動閘道">

```bash
openclaw gateway
```

      </Step>
    </Steps>

  </Tab>

  <Tab title="HTTP Events API 模式">
    <Steps>
      <Step title="為 HTTP 設定 Slack 應用程式">

        - 將模式設定為 HTTP (`channels.slack.mode="http"`)
        - 複製 Slack **Signing Secret**
        - 將「事件訂閱」+「互動性」+「斜線指令」的請求 URL 設定為相同的 webhook 路徑 (預設為 `/slack/events`)

      </Step>

      <Step title="設定 OpenClaw HTTP 模式">

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

      <Step title="為多帳戶 HTTP 使用唯一的 webhook 路徑">
        支援逐帳戶的 HTTP 模式。

        為每個帳戶指定一個不同的 `webhookPath`，以免註冊發生衝突。
      </Step>
    </Steps>

  </Tab>
</Tabs>

## Token 模型

- Socket Mode 需要 `botToken` + `appToken`。
- HTTP 模式需要 `botToken` + `signingSecret`。
- 配置 Token 覆蓋環境變數後備值。
- `SLACK_BOT_TOKEN` / `SLACK_APP_TOKEN` 環環境變數回退僅適用於預設帳戶。
- `userToken` (`xoxp-...`) 僅用於配置（無環境變數回退），並預設為唯讀行為 (`userTokenReadOnly: true`)。
- 可選：如果您希望外傳訊息使用作用中的代理程式身分（自訂 `username` 和圖示），請新增 `chat:write.customize`。`icon_emoji` 使用 `:emoji_name:` 語法。

<Tip>對於動作/目錄讀取，經過配置後可以優先使用使用者權杖。對於寫入，機器人權杖仍然是優先選項；僅在 `userTokenReadOnly: false` 且無法使用機器人權杖時，才允許使用使用者權杖進行寫入。</Tip>

## 存取控制與路由

<Tabs>
  <Tab title="DM policy">
    `channels.slack.dmPolicy` 控制私訊存取（舊版：`channels.slack.dm.policy`）：

    - `pairing`（預設）
    - `allowlist`
    - `open`（要求 `channels.slack.allowFrom` 包含 `"*"`；舊版：`channels.slack.dm.allowFrom`）
    - `disabled`

    私訊標誌：

    - `dm.enabled`（預設為 true）
    - `channels.slack.allowFrom`（首選）
    - `dm.allowFrom`（舊版）
    - `dm.groupEnabled`（群組私訊預設為 false）
    - `dm.groupChannels`（選用的 MPIM 允許清單）

    多帳號優先順序：

    - `channels.slack.accounts.default.allowFrom` 僅適用於 `default` 帳號。
    - 指名的帳號在其自身的 `allowFrom` 未設定時，會繼承 `channels.slack.allowFrom`。
    - 指名的帳號不會繼承 `channels.slack.accounts.default.allowFrom`。

    私訊中的配對使用 `openclaw pairing approve slack <code>`。

  </Tab>

  <Tab title="頻道政策">
    `channels.slack.groupPolicy` 控制頻道處理方式：

    - `open`
    - `allowlist`
    - `disabled`

    頻道白名單位於 `channels.slack.channels` 之下，應使用穩定的頻道 ID。

    執行時備註：如果完全缺少 `channels.slack`（僅環境變數設定），執行時會回退到 `groupPolicy="allowlist"` 並記錄警告（即使設定了 `channels.defaults.groupPolicy`）。

    名稱/ID 解析：

    - 當 Token 權限允許時，頻道白名單項目和 DM 白名單項目會在啟動時進行解析
    - 未解析的頻道名稱項目會保留為已設定的狀態，但預設會在路由時被忽略
    - 傳入的授權和頻道路由預設優先使用 ID；直接的使用者名稱/slug 匹配需要 `channels.slack.dangerouslyAllowNameMatching: true`

  </Tab>

  <Tab title="提及與頻道使用者">
    頻道訊息預設為提及防護（mention-gated）。

    提及來源：

    - 明確的應用提及 (`<@botId>`)
    - 提及正則表達式模式 (`agents.list[].groupChat.mentionPatterns`, 後備 `messages.groupChat.mentionPatterns`)
    - 隱含的回覆機器人執行緒行為

    逐頻道控制 (`channels.slack.channels.<id>`; 僅名稱透過啟動解析或 `dangerouslyAllowNameMatching`):

    - `requireMention`
    - `users` (允許清單)
    - `allowBots`
    - `skills`
    - `systemPrompt`
    - `tools`, `toolsBySender`
    - `toolsBySender` 金鑰格式：`id:`, `e164:`, `username:`, `name:`, 或 `"*"` 萬用字元
      (舊版無前綴金鑰仍僅對應至 `id:`)

  </Tab>
</Tabs>

## 指令與斜線行為

- Slack 的原生指令自動模式為 **關閉** (`commands.native: "auto"` 不啟用 Slack 原生指令)。
- 使用 `channels.slack.commands.native: true` (或全域 `commands.native: true`) 啟用 Slack 原生指令處理程式。
- 啟用原生指令時，請在 Slack 中註冊符合的斜線指令 (`/<command>` 名稱)，但有一個例外：
  - 為狀態指令註冊 `/agentstatus` (Slack 保留 `/status`)
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

並且仍然針對目標對話工作階段路由指令執行 (`CommandTargetSessionKey`)。

## 串接、會話和回覆標籤

- DM 路由為 `direct`；頻道為 `channel`；MPIM 為 `group`。
- 使用預設的 `session.dmScope=main`，Slack 私訊會折疊到代理主工作階段。
- 頻道工作階段：`agent:<agentId>:slack:channel:<channelId>`。
- 回覆執行緒可在適用時建立執行緒工作階段後綴 (`:thread:<threadTs>`)。
- `channels.slack.thread.historyScope` 預設為 `thread`；`thread.inheritParent` 預設為 `false`。
- `channels.slack.thread.initialHistoryLimit` 控制當新的執行緒工作階段開始時會擷取多少現有的執行緒訊息 (預設 `20`；設定 `0` 以停用)。

Reply threading controls:

- `channels.slack.replyToMode`：`off|first|all` (預設 `off`)
- `channels.slack.replyToModeByChatType`：每 `direct|group|channel`
- 直接聊天的舊版後援機制：`channels.slack.dm.replyToMode`

Manual reply tags are supported:

- `[[reply_to_current]]`
- `[[reply_to:<id>]]`

注意：`replyToMode="off"` 會停用 Slack 中**所有**回覆串接，包括明確的 `[[reply_to_*]]` 標籤。這與 Telegram 不同，後者在 `"off"` 模式下仍會遵守明確標籤。這種差異反映了平台串接模型：Slack 串接會將訊息從頻道中隱藏，而 Telegram 回覆則會保留在主要聊天流程中。

## 媒體、分塊與傳遞

<AccordionGroup>
  <Accordion title="Inbound attachments">
    Slack 檔案附件會從 Slack 託管的私人 URL（以權杖驗證的要求流程）下載，並在擷取成功且大小限制允許時寫入媒體存放區。

    執行時期傳入大小上限預設為 `20MB`，除非被 `channels.slack.mediaMaxMb` 覆寫。

  </Accordion>

<Accordion title="Outbound text and files">- 文字區塊使用 `channels.slack.textChunkLimit`（預設 4000） - `channels.slack.chunkMode="newline"` 啟用優先段落分割 - 檔案傳送使用 Slack 上傳 API，且可包含串列回覆（`thread_ts`） - 外傳媒體上限在設定後遵循 `channels.slack.mediaMaxMb`；否則頻道傳送會使用媒體管線的 MIME 類型預設值</Accordion>

  <Accordion title="Delivery targets">
    首選的明確目標：

    - DM 使用 `user:<id>`
    - 頻道使用 `channel:<id>`

    當傳送至使用者目標時，Slack DM 會透過 Slack 對話 API 開啟。

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

目前的 Slack 訊息動作包括 `send`、`upload-file`、`download-file`、`read`、`edit`、`delete`、`pin`、`unpin`、`list-pins`、`member-info` 和 `emoji-list`。

## 事件與營運行為

- 訊息編輯/刪除/訊息串廣播會對應至系統事件。
- 新增/移除表情符號事件會對應至系統事件。
- 成員加入/離開、頻道建立/重新命名，以及釘選新增/移除事件會對應至系統事件。
- 助理訊息串狀態更新（用於訊息串中的「輸入中...」指示器）使用 `assistant.threads.setStatus`，並且需要 bot 權限 `assistant:write`。
- 當啟用 `configWrites` 時，`channel_id_changed` 可以遷移通道配置金鑰。
- 通道主題/目的元資料被視為不受信任的上下文，並可以注入到路由上下文中。
- 區塊操作和模態互動會發出結構化的 `Slack interaction: ...` 系統事件，其中包含豐富的負載欄位：
  - 區塊操作：選定的值、標籤、選擇器值和 `workflow_*` 元資料
  - 帶有路由通道元資料和表單輸入的模態 `view_submission` 和 `view_closed` 事件

## 確認反應

當 OpenClaw 正在處理傳入訊息時，`ackReaction` 會發送確認表情符號。

解析順序：

- `channels.slack.accounts.<accountId>.ackReaction`
- `channels.slack.ackReaction`
- `messages.ackReaction`
- 代理身分表情符號備用方案（`agents.list[].identity.emoji`，否則為「👀」）

注意事項：

- Slack 預期使用短代碼（例如 `"eyes"`）。
- 使用 `""` 針對 Slack 帳號或全域停用該反應。

## 輸入中反應備用方案

`typingReaction` 會在 OpenClaw 處理回覆時，在傳入的 Slack 訊息上新增暫時性的反應，然後在執行完成時將其移除。當 Slack 原生助理輸入指示無法使用時，這是一個很有用的備用方案，特別是在 DM 中。

解析順序：

- `channels.slack.accounts.<accountId>.typingReaction`
- `channels.slack.typingReaction`

注意事項：

- Slack 預期使用短代碼（例如 `"hourglass_flowing_sand"`）。
- 該反應為盡力而為，並且會在回覆或失敗路徑完成後自動嘗試進行清理。

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

  <Accordion title="選用的使用者權杖範圍（讀取作業）">
    如果您設定 `channels.slack.userToken`，典型的讀取範圍為：

    - `channels:history`、`groups:history`、`im:history`、`mpim:history`
    - `channels:read`、`groups:read`、`im:read`、`mpim:read`
    - `users:read`
    - `reactions:read`
    - `pins:read`
    - `emoji:read`
    - `search:read`（如果您依賴 Slack 搜尋讀取）

  </Accordion>
</AccordionGroup>

## 疑難排解

<AccordionGroup>
  <Accordion title="頻道中無回覆">
    請依序檢查：

    - `groupPolicy`
    - 頻道允許名單 (`channels.slack.channels`)
    - `requireMention`
    - 各頻道 `users` 允許名單

    實用指令：

```bash
openclaw channels status --probe
openclaw logs --follow
openclaw doctor
```

  </Accordion>

  <Accordion title="忽略 DM 訊息">
    請檢查：

    - `channels.slack.dm.enabled`
    - `channels.slack.dmPolicy` (或舊版 `channels.slack.dm.policy`)
    - 配對審核 / 允許名單項目

```bash
openclaw pairing list slack
```

  </Accordion>

<Accordion title="Socket 模式無法連線">驗證 Slack 應用程式設定中的 Bot + 應用程式權杖以及是否已啟用 Socket 模式。</Accordion>

  <Accordion title="HTTP 模式未接收到事件">
    請驗證：

    - 簽署密鑰 (signing secret)
    - webhook 路徑
    - Slack 請求 URL (Events + Interactivity + Slash Commands)
    - 每個 HTTP 帳戶唯一的 `webhookPath`

  </Accordion>

  <Accordion title="原生/斜線指令未觸發">
    請確認您的意圖是：

    - 原生指令模式 (`channels.slack.commands.native: true`)，並已在 Slack 中註冊相符的斜線指令
    - 還是單一斜線指令模式 (`channels.slack.slashCommand.enabled: true`)

    同時請檢查 `commands.useAccessGroups` 和頻道/使用者允許清單。

  </Accordion>
</AccordionGroup>

## 文字串流

OpenClaw 支援透過 Agents 和 AI Apps API 進行 Slack 原生文字串流。

`channels.slack.streaming` 控制即時預覽行為：

- `off`：停用即時預覽串流。
- `partial` (預設): 以最新的部分輸出取代預覽文字。
- `block`: 附加分塊預覽更新。
- `progress`: 生成時顯示進度狀態文字，然後發送最終文字。

當 `streaming` 為 `partial` 時 (預設: `true`)，`channels.slack.nativeStreaming` 控制 Slack 的原生串流 API (`chat.startStream` / `chat.appendStream` / `chat.stopStream`)。

停用原生 Slack 串流 (保留草稿預覽行為):

```yaml
channels:
  slack:
    streaming: partial
    nativeStreaming: false
```

舊版金鑰:

- `channels.slack.streamMode` (`replace | status_final | append`) 會自動遷移至 `channels.slack.streaming`。
- 布林值 `channels.slack.streaming` 會自動遷移至 `channels.slack.nativeStreaming`。

### 需求

1. 在您的 Slack 應用程式設定中啟用 **Agents and AI Apps**。
2. 確保該應用程式具有 `assistant:write` 權限。
3. 該訊息必須有一個可用的回覆串。串的選擇仍然遵循 `replyToMode`。

### 行為

- 第一個文字區塊啟動串流 (`chat.startStream`)。
- 後續的文字區塊附加到同一個串流 (`chat.appendStream`)。
- 回覆結束時完成串流 (`chat.stopStream`)。
- 媒體和非文字承載會回退到正常傳遞方式。
- 如果在回覆中途串流失敗，OpenClaw 會對剩餘的承載回退到正常傳遞方式。

## 設定參考指標

主要參考：

- [Configuration reference - Slack](/en/gateway/configuration-reference#slack)

  高訊號 Slack 欄位：
  - 模式/驗證： `mode`, `botToken`, `appToken`, `signingSecret`, `webhookPath`, `accounts.*`
  - DM 存取： `dm.enabled`, `dmPolicy`, `allowFrom` (舊版： `dm.policy`, `dm.allowFrom`), `dm.groupEnabled`, `dm.groupChannels`
  - 相容性切換開關： `dangerouslyAllowNameMatching` (緊急措施；除非否則需要，請保持關閉)
  - 頻道存取： `groupPolicy`, `channels.*`, `channels.*.users`, `channels.*.requireMention`
  - 串接/歷史： `replyToMode`, `replyToModeByChatType`, `thread.*`, `historyLimit`, `dmHistoryLimit`, `dms.*.historyLimit`
  - 傳遞： `textChunkLimit`, `chunkMode`, `mediaMaxMb`, `streaming`, `nativeStreaming`
  - 運作/功能： `configWrites`, `commands.native`, `slashCommand.*`, `actions.*`, `userToken`, `userTokenReadOnly`

## 相關

- [配對](/en/channels/pairing)
- [通道路由](/en/channels/channel-routing)
- [疑難排解](/en/channels/troubleshooting)
- [設定](/en/gateway/configuration)
- [斜線指令](/en/tools/slash-commands)
