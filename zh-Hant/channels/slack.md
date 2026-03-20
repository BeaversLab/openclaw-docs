---
summary: "Slack 設定與執行時期行為（Socket Mode + HTTP Events API）"
read_when:
  - 正在設定 Slack 或偵錯 Slack socket/HTTP 模式
title: "Slack"
---

# Slack

狀態：透過 Slack 應用程式整合，已支援 DM 與頻道的正式環境使用。預設模式為 Socket 模式；亦支援 HTTP Events API 模式。

<CardGroup cols={3}>
  <Card title="配對" icon="link" href="/zh-Hant/channels/pairing">
    Slack 私訊預設為配對模式。
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
  <Tab title="Socket 模式（預設）">
    <Steps>
      <Step title="建立 Slack 應用程式與權杖">
        在 Slack 應用程式設定中：

        - 啟用 **Socket 模式**
        - 使用 `connections:write` 建立 **App Token**（`xapp-...`）
        - 安裝應用程式並複製 **Bot Token**（`xoxb-...`）
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

        環境變數後援（僅限預設帳戶）：

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

        同時為私訊啟用 App Home **訊息分頁**。
      </Step>

      <Step title="啟動閘道">

```bash
openclaw gateway
```

      </Step>
    </Steps>

  </Tab>

  <Tab title="HTTP Events API mode">
    <Steps>
      <Step title="Configure Slack app for HTTP">

        - 將模式設定為 HTTP (`channels.slack.mode="http"`)
        - 複製 Slack **Signing Secret**
        - 將 Event Subscriptions + Interactivity + Slash command 的 Request URL 設定為相同的 webhook 路徑（預設為 `/slack/events`）

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
        支援多帳號 HTTP 模式。

        為每個帳號指定不同的 `webhookPath` 以避免註冊衝突。
      </Step>
    </Steps>

  </Tab>

</Tabs>

## Token 模型

- Socket Mode 需要 `botToken` + `appToken`。
- HTTP 模式需要 `botToken` + `signingSecret`。
- Config tokens 會覆蓋 env fallback。
- `SLACK_BOT_TOKEN` / `SLACK_APP_TOKEN` 的環境變數後援機制僅適用於預設帳號。
- `userToken` (`xoxp-...`) 僅限於設定檔（無環境變數後援），且預設為唯讀行為 (`userTokenReadOnly: true`)。
- 選用：如果您希望外送訊息使用作用中的代理程式身分（自訂 `username` 和圖示），請新增 `chat:write.customize`。`icon_emoji` 使用 `:emoji_name:` 語法。

<Tip>
  對於操作/目錄讀取，使用者權杖可在設定時優先使用。對於寫入操作，Bot 權杖仍然優先；僅在
  `userTokenReadOnly: false` 且無 Bot 權杖可用時，才允許使用者權杖寫入。
</Tip>

## 存取控制與路由

<Tabs>
  <Tab title="DM 政策">
    `channels.slack.dmPolicy` 控制 DM 存取（舊版：`channels.slack.dm.policy`）：

    - `pairing` (預設)
    - `allowlist`
    - `open` (需要 `channels.slack.allowFrom` 包含 `"*"`；舊版：`channels.slack.dm.allowFrom`)
    - `disabled`

    DM 旗標：

    - `dm.enabled` (預設 true)
    - `channels.slack.allowFrom` (建議)
    - `dm.allowFrom` (舊版)
    - `dm.groupEnabled` (群組 DM 預設 false)
    - `dm.groupChannels` (選用 MPIM 允許清單)

    多帳號優先順序：

    - `channels.slack.accounts.default.allowFrom` 僅套用於 `default` 帳號。
    - 當自身 `allowFrom` 未設定時，具名帳號會繼承 `channels.slack.allowFrom`。
    - 具名帳號不會繼承 `channels.slack.accounts.default.allowFrom`。

    DM 中的配對使用 `openclaw pairing approve slack <code>`。

  </Tab>

  <Tab title="頻道政策">
    `channels.slack.groupPolicy` 控制頻道處理：

    - `open`
    - `allowlist`
    - `disabled`

    頻道允許清單位於 `channels.slack.channels` 之下，應使用穩定的頻道 ID。

    執行時期備註：如果 `channels.slack` 完全缺失（僅使用環境變數設定），執行時期會還原為 `groupPolicy="allowlist"` 並記錄警告（即使已設定 `channels.defaults.groupPolicy`）。

    名稱/ID 解析：

    - 當 Token 權限允許時，頻道允許清單項目和 DM 允許清單項目會在啟動時解析
    - 未解析的頻道名稱項目會保留為設定值，但預設會在路由時被忽略
    - 傳入授權和頻道路由預設優先使用 ID；直接的使用者名稱/slug 比對需要 `channels.slack.dangerouslyAllowNameMatching: true`

  </Tab>

  <Tab title="提及與頻道使用者">
    頻道訊息預設會受到提及保護。

    提及來源：

    - 明確的應用程式提及 (`<@botId>`)
    - 提及正規表達式模式 (`agents.list[].groupChat.mentionPatterns`，後備 `messages.groupChat.mentionPatterns`)
    - 隱含的回覆機器人執行緒行為

    各頻道控制 (`channels.slack.channels.<id>`；名稱僅透過啟動解析或 `dangerouslyAllowNameMatching`)：

    - `requireMention`
    - `users` (允許清單)
    - `allowBots`
    - `skills`
    - `systemPrompt`
    - `tools`、`toolsBySender`
    - `toolsBySender` 金鑰格式：`id:`、`e164:`、`username:`、`name:` 或 `"*"` 萬用字元
      (舊版無前綴金鑰仍僅對應至 `id:`)

  </Tab>

</Tabs>

## 指令與斜線行為

- 原生指令自動模式對 Slack 來說是**關閉**的 (`commands.native: "auto"` 不會啟用 Slack 原生指令)。
- 使用 `channels.slack.commands.native: true` (或全域 `commands.native: true`) 啟用原生 Slack 指令處理程式。
- 當啟用原生指令時，請在 Slack 中註冊相符的斜線指令 (`/<command>` 名稱)，但有一個例外：
  - 為狀態指令註冊 `/agentstatus` (Slack 保留了 `/status`)
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

並仍然針對目標對話工作階段路由指令執行 (`CommandTargetSessionKey`)。

## 串接、會話和回覆標籤

- DM 路由為 `direct`；頻道路由為 `channel`；MPIM 路由為 `group`。
- 使用預設的 `session.dmScope=main`，Slack 私訊會折疊至代理主工作階段。
- 頻道工作階段：`agent:<agentId>:slack:channel:<channelId>`。
- 執行緒回覆可以在適用時建立執行緒工作階段後綴（`:thread:<threadTs>`）。
- `channels.slack.thread.historyScope` 預設值為 `thread`；`thread.inheritParent` 預設值為 `false`。
- `channels.slack.thread.initialHistoryLimit` 控制當新執行緒工作階段開始時擷取多少現有的執行緒訊息（預設 `20`；設定 `0` 以停用）。

回覆執行緒控制：

- `channels.slack.replyToMode`： `off|first|all`（預設 `off`）
- `channels.slack.replyToModeByChatType`：每個 `direct|group|channel`
- 直接聊天的舊版後援方案： `channels.slack.dm.replyToMode`

支援手動回覆標籤：

- `[[reply_to_current]]`
- `[[reply_to:<id>]]`

注意：`replyToMode="off"` 會停用 Slack 中**所有**回覆執行緒，包括明確的 `[[reply_to_*]]` 標籤。這與 Telegram 不同，後者在 `"off"` 模式下仍會遵守明確標籤。這種差異反映了平台的執行緒模型：Slack 執行緒會將訊息從頻道中隱藏，而 Telegram 回覆則會保持在主要聊天流程中可見。

## 媒體、分塊與傳遞

<AccordionGroup>
  <Accordion title="Inbound attachments">
    Slack 檔案附件是從 Slack 託管的私人 URL 下載（權杖驗證請求流程），並在擷取成功且大小限制允許時寫入媒體存放區。

    執行時期的入站大小上限預設為 `20MB`，除非被 `channels.slack.mediaMaxMb` 覆寫。

  </Accordion>

<Accordion title="Outbound text and files">
  - 文字區塊使用 `channels.slack.textChunkLimit` (預設 4000) - `channels.slack.chunkMode="newline"`
  啟用以段落為主的分割 - 檔案傳送使用 Slack 上傳 API，且可包含執行緒回覆 (`thread_ts`) -
  已設定時，傳出媒體上限遵循 `channels.slack.mediaMaxMb`；否則通道傳送會使用媒體管線的 MIME
  類型預設值
</Accordion>

  <Accordion title="Delivery targets">
    首選的明確目標：

    - DM 使用 `user:<id>`
    - 頻道使用 `channel:<id>`

    傳送至使用者目標時，Slack DM 會透過 Slack 對話 API 開啟。

  </Accordion>
</AccordionGroup>

## Actions and gates

Slack 動作由 `channels.slack.actions.*` 控制。

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
- 助理執行緒狀態更新 (用於執行緒中的「正在輸入...」指示器) 使用 `assistant.threads.setStatus`，並需要 bot 權限 `assistant:write`。
- 當啟用 `configWrites` 時，`channel_id_changed` 可以遷移通道設定金鑰。
- Channel topic/purpose metadata is treated as untrusted context and can be injected into routing context.
- 區塊動作和模態互動會發出具有豐富 payload 欄位的結構化 `Slack interaction: ...` 系統事件：
  - 區塊動作：選取值、標籤、選擇器值和 `workflow_*` 中繼資料
  - 模態 `view_submission` 和 `view_closed` 事件，包含路由通道中繼資料和表單輸入

## Ack reactions

當 OpenClaw 正在處理傳入訊息時，`ackReaction` 會傳送確認表情符號。

Resolution order:

- `channels.slack.accounts.<accountId>.ackReaction`
- `channels.slack.ackReaction`
- `messages.ackReaction`
- 代理身分表情符號後備 (`agents.list[].identity.emoji`，否則為「👀」)

備註：

- Slack 預期短代碼 (例如 `"eyes"`)。
- 使用 `""` 以停用 Slack 帳戶或全域的表情符號反應。

## Typing reaction fallback

當 OpenClaw 正在處理回覆時，`typingReaction` 會在傳入 Slack 訊息上新增暫時性反應，然後在執行完成時將其移除。當 Slack 原生助理輸入狀態無法使用時，這是一個很有用的後備方案，特別是在 DM 中。

解析順序：

- `channels.slack.accounts.<accountId>.typingReaction`
- `channels.slack.typingReaction`

備註：

- Slack 預期短代碼（例如 `"hourglass_flowing_sand"`）。
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

  <Accordion title="選用使用者權杖範圍（讀取操作）">
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
    依序檢查：

    - `groupPolicy`
    - 頻道允許清單（`channels.slack.channels`）
    - `requireMention`
    - 各頻道 `users` 允許清單

    實用指令：

```bash
openclaw channels status --probe
openclaw logs --follow
openclaw doctor
```

  </Accordion>

  <Accordion title="DM 訊息被忽略">
    檢查：

    - `channels.slack.dm.enabled`
    - `channels.slack.dmPolicy`（或舊版 `channels.slack.dm.policy`）
    - 配對核准 / 允許清單項目

```bash
openclaw pairing list slack
```

  </Accordion>

<Accordion title="Socket 模式無法連線">
  驗證 Slack 應用程式設定中的 Bot + 應用程式權杖，以及是否已啟用 Socket 模式。
</Accordion>

  <Accordion title="HTTP 模式未收到事件">
    驗證：

    - 簽署密鑰
    - webhook 路徑
    - Slack 要求 URL（事件 + 互動 + 斜線指令）
    - 每個 HTTP 帳戶的唯一 `webhookPath`

  </Accordion>

  <Accordion title="原生/斜線命令未觸發">
    請確認您的意圖是：

    - 原生命令模式 (`channels.slack.commands.native: true`) 並在 Slack 中註冊了相符的斜線命令
    - 或是單一斜線命令模式 (`channels.slack.slashCommand.enabled: true`)

    同時請檢查 `commands.useAccessGroups` 和頻道/使用者允許清單。

  </Accordion>
</AccordionGroup>

## 文字串流

OpenClaw 支援透過 Agents 和 AI Apps API 進行 Slack 原生文字串流。

`channels.slack.streaming` 控制即時預覽行為：

- `off`：停用即時預覽串流。
- `partial` (預設)：將預覽文字替換為最新的部分輸出。
- `block`：附加分塊預覽更新。
- `progress`：在生成時顯示進度狀態文字，然後發送最終文字。

當 `streaming` 為 `partial` 時，`channels.slack.nativeStreaming` 控制 Slack 的原生串流 API (`chat.startStream` / `chat.appendStream` / `chat.stopStream`) (預設值：`true`)。

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
2. 確保應用程式具備 `assistant:write` 範圍 (scope)。
3. 該訊息必須要有可用的回覆串行。串行選取仍遵循 `replyToMode`。

### 行為

- 第一個文字區塊啟動串流 (`chat.startStream`)。
- 後續文字區塊附加至同一串流 (`chat.appendStream`)。
- 回覆結束時定案串流 (`chat.stopStream`)。
- 媒體和非文字酬載會回退至正常傳遞方式。
- 如果在回覆中途串流失敗，OpenClaw 會對其餘酬載回退至正常傳遞方式。

## 設定參考指標

主要參考：

- [組態參考 - Slack](/zh-Hant/gateway/configuration-reference#slack)

  高優先性 Slack 欄位：
  - 模式/驗證：`mode`、`botToken`、`appToken`、`signingSecret`、`webhookPath`、`accounts.*`
  - DM 存取：`dm.enabled`、`dmPolicy`、`allowFrom`（舊版：`dm.policy`、`dm.allowFrom`）、`dm.groupEnabled`、`dm.groupChannels`
  - 相容性切換開關：`dangerouslyAllowNameMatching`（緊急使用；除非否則需要，請保持關閉）
  - 頻道存取：`groupPolicy`、`channels.*`、`channels.*.users`、`channels.*.requireMention`
  - 回覆歷史：`replyToMode`、`replyToModeByChatType`、`thread.*`、`historyLimit`、`dmHistoryLimit`、`dms.*.historyLimit`
  - 傳送：`textChunkLimit`、`chunkMode`、`mediaMaxMb`、`streaming`、`nativeStreaming`
  - 操作/功能：`configWrites`、`commands.native`、`slashCommand.*`、`actions.*`、`userToken`、`userTokenReadOnly`

## 相關

- [配對](/zh-Hant/channels/pairing)
- [頻道路由](/zh-Hant/channels/channel-routing)
- [疑難排解](/zh-Hant/channels/troubleshooting)
- [組態](/zh-Hant/gateway/configuration)
- [斜線指令](/zh-Hant/tools/slash-commands)

import footerZhHant from "/components/footer/zh-Hant.mdx";

<footerZhHant />
