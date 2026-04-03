---
summary: "Slack 設定與執行時行為（Socket Mode + HTTP Events API）"
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
  <Tab title="Socket Mode（預設）">
    <Steps>
      <Step title="建立 Slack 應用程式與權杖">
        在 Slack 應用程式設定中：

        - 啟用 **Socket Mode**
        - 建立具有 `connections:write` 的 **App Token** (`xapp-...`)
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

        環境變數後援（僅限預設帳戶）：

```bash
SLACK_APP_TOKEN=xapp-...
SLACK_BOT_TOKEN=xoxb-...
```

      </Step>

      <Step title="訂閱應用程式事件">
        訂閱以下機器人事件：

        - `app_mention`
        - `message.channels`、`message.groups`、`message.im`、`message.mpim`
        - `reaction_added`、`reaction_removed`
        - `member_joined_channel`、`member_left_channel`
        - `channel_rename`
        - `pin_added`、`pin_removed`

        此外，請為私訊啟用 App Home **Messages Tab**。
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

- `botToken` + `appToken` are required for Socket Mode.
- HTTP mode requires `botToken` + `signingSecret`.
- 配置 Token 覆蓋環境變數後備值。
- `SLACK_BOT_TOKEN` / `SLACK_APP_TOKEN` env fallback applies only to the default account.
- `userToken` (`xoxp-...`) is config-only (no env fallback) and defaults to read-only behavior (`userTokenReadOnly: true`).
- Optional: add `chat:write.customize` if you want outgoing messages to use the active agent identity (custom `username` and icon). `icon_emoji` uses `:emoji_name:` syntax.

<Tip>For actions/directory reads, user token can be preferred when configured. For writes, bot token remains preferred; user-token writes are only allowed when `userTokenReadOnly: false` and bot token is unavailable.</Tip>

## 存取控制與路由

<Tabs>
  <Tab title="DM policy">
    `channels.slack.dmPolicy` 控制 DM 存取（舊版：`channels.slack.dm.policy`）：

    - `pairing`（預設）
    - `allowlist`
    - `open`（要求 `channels.slack.allowFrom` 包含 `"*"`；舊版：`channels.slack.dm.allowFrom`）
    - `disabled`

    DM 標誌：

    - `dm.enabled`（預設為 true）
    - `channels.slack.allowFrom`（首選）
    - `dm.allowFrom`（舊版）
    - `dm.groupEnabled`（群組 DM 預設為 false）
    - `dm.groupChannels`（選用 MPIM 允許清單）

    多帳號優先順序：

    - `channels.slack.accounts.default.allowFrom` 僅適用於 `default` 帳號。
    - 指名的帳號會在未設定自己的 `allowFrom` 時繼承 `channels.slack.allowFrom`。
    - 指名的帳號不會繼承 `channels.slack.accounts.default.allowFrom`。

    DM 中的配對使用 `openclaw pairing approve slack <code>`。

  </Tab>

  <Tab title="Channel policy">
    `channels.slack.groupPolicy` 控制頻道處理：

    - `open`
    - `allowlist`
    - `disabled`

    頻道允許清單位於 `channels.slack.channels` 之下，應使用穩定的頻道 ID。

    執行時期備註：如果 `channels.slack` 完全缺失（僅環境變數設定），執行時期會回退到 `groupPolicy="allowlist"` 並記錄警告（即使已設定 `channels.defaults.groupPolicy`）。

    名稱/ID 解析：

    - 當 Token 存取權限允許時，頻道允許清單項目和 DM 允許清單項目會在啟動時解析
    - 未解析的頻道名稱項目會保留為設定值，但預設會在路由時被忽略
    - 傳入授權和頻道路由預設以 ID 為優先；直接的使用者名稱/slug 配對需要 `channels.slack.dangerouslyAllowNameMatching: true`

  </Tab>

  <Tab title="提及與頻道使用者">
    頻道訊息預設會受到提及限制。

    提及來源：

    - 明確的應用程式提及 (`<@botId>`)
    - 提及正規表示式模式 (`agents.list[].groupChat.mentionPatterns`，後備 `messages.groupChat.mentionPatterns`)
    - 隱含的回覆機器人執行緒行為

    逐頻道控制 (`channels.slack.channels.<id>`；僅限名稱透過啟動解析或 `dangerouslyAllowNameMatching`)：

    - `requireMention`
    - `users` (允許清單)
    - `allowBots`
    - `skills`
    - `systemPrompt`
    - `tools`, `toolsBySender`
    - `toolsBySender` 金鑰格式：`id:`, `e164:`, `username:`, `name:`, 或 `"*"` 萬用字元
      (舊版無前綴金鑰仍然僅對應至 `id:`)

  </Tab>
</Tabs>

## 指令與斜線行為

- Slack 的原生指令自動模式為 **關閉** (`commands.native: "auto"` 不會啟用 Slack 原生指令)。
- 使用 `channels.slack.commands.native: true` (或全域 `commands.native: true`) 啟用原生 Slack 指令處理程序。
- 當啟用原生指令時，請在 Slack 中註冊相符的斜線指令 (`/<command>` 名稱)，但有一個例外：
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
- 使用預設的 `session.dmScope=main`，Slack 私訊會折疊至 Agent 主會話。
- 頻道會話：`agent:<agentId>:slack:channel:<channelId>`。
- 適用時，回覆訊息可以建立執行緒會話後綴（`:thread:<threadTs>`）。
- `channels.slack.thread.historyScope` 預設為 `thread`；`thread.inheritParent` 預設為 `false`。
- `channels.slack.thread.initialHistoryLimit` 控制當新的執行緒會話開始時擷取多少現有的執行緒訊息（預設 `20`；設定 `0` 以停用）。

Reply threading controls:

- `channels.slack.replyToMode`：`off|first|all`（預設 `off`）
- `channels.slack.replyToModeByChatType`：每個 `direct|group|channel`
- 直接聊天的舊版後備方案：`channels.slack.dm.replyToMode`

Manual reply tags are supported:

- `[[reply_to_current]]`
- `[[reply_to:<id>]]`

注意：`replyToMode="off"` 會停用 Slack 中**所有**回覆執行緒，包括明確的 `[[reply_to_*]]` 標籤。這與 Telegram 不同，後者在 `"off"` 模式下仍會遵守明確標籤。這種差異反映了平台的執行緒模型：Slack 執行緒會將訊息從頻道中隱藏，而 Telegram 回覆則在主聊天流程中保持可見。

## 媒體、分塊與傳遞

<AccordionGroup>
  <Accordion title="Inbound attachments">
    Slack 檔案附件會從 Slack 託管的私人 URL 下載（經過權杖驗證的請求流程），並在擷取成功且大小限制允許時寫入至媒體存放區。

    執行時期連入大小上限預設為 `20MB`，除非被 `channels.slack.mediaMaxMb` 覆寫。

  </Accordion>

<Accordion title="Outbound text and files">- 文字區塊使用 `channels.slack.textChunkLimit` (預設 4000) - `channels.slack.chunkMode="newline"` 啟用段落優先分割 - 檔案傳送使用 Slack 上傳 API，並可包含執行緒回覆 (`thread_ts`) - 出站媒體上限在配置時遵循 `channels.slack.mediaMaxMb`；否則頻道傳送會使用媒體管線的 MIME 類型預設值</Accordion>

  <Accordion title="Delivery targets">
    首選的明確目標：

    - `user:<id>` 用於 DM
    - `channel:<id>` 用於頻道

    當發送到使用者目標時，Slack DM 會透過 Slack 對話 API 開啟。

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
- Assistant 執行緒狀態更新 (用於執行緒中的「正在輸入...」指示器) 使用 `assistant.threads.setStatus`，並需要機器人權限 `assistant:write`。
- 當啟用 `configWrites` 時，`channel_id_changed` 可以遷移頻道配置金鑰。
- 通道主題/目的元資料被視為不受信任的上下文，並可以注入到路由上下文中。
- 區塊動作和模態互動會發出具有豐富負載欄位的結構化 `Slack interaction: ...` 系統事件：
  - 區塊動作：選取的值、標籤、選擇器值和 `workflow_*` 元資料
  - 模態 `view_submission` 和 `view_closed` 事件，包含路由的頻道元資料和表單輸入

## 確認反應

當 OpenClaw 正在處理傳入訊息時，`ackReaction` 會發送確認表情符號。

解析順序：

- `channels.slack.accounts.<accountId>.ackReaction`
- `channels.slack.ackReaction`
- `messages.ackReaction`
- 代理身分表情符號後備 (`agents.list[].identity.emoji`，否則為 "👀")

注意事項：

- Slack 預期短代碼（例如 `"eyes"`）。
- 使用 `""` 以針對 Slack 帳號或全域停用該回應。

## 輸入中反應備用方案

當 OpenClaw 正在處理回覆時，`typingReaction` 會對傳入的 Slack 訊息新增暫時性的回應，然後在執行結束時將其移除。當 Slack 原生助理輸入狀態無法使用時，這是一個很有用的備案，特別是在直接訊息（DM）中。

解析順序：

- `channels.slack.accounts.<accountId>.typingReaction`
- `channels.slack.typingReaction`

注意事項：

- Slack 預期短代碼（例如 `"hourglass_flowing_sand"`）。
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

  <Accordion title="Optional user-token scopes (read operations)">
    如果您設定 `channels.slack.userToken`，典型的讀取範圍是：

    - `channels:history`, `groups:history`, `im:history`, `mpim:history`
    - `channels:read`, `groups:read`, `im:read`, `mpim:read`
    - `users:read`
    - `reactions:read`
    - `pins:read`
    - `emoji:read`
    - `search:read` (如果您依賴 Slack 搜尋讀取)

  </Accordion>
</AccordionGroup>

## Slack 中的執行核准

執行核准提示可以透過互動按鈕和互動原生路由至 Slack，而不是回退到 Web UI 或終端機。會強制執行核准者授權：只有被識別為核准者的使用者才能透過 Slack 核准或拒絕請求。

這會使用與其他通道相同的共用核准按鈕介面。當您在 Slack 應用程式設定中啟用 `interactivity` 時，核准提示會直接在對話中呈現為 Block Kit 按鈕。

設定使用共用的 `approvals.exec` 設定搭配 Slack 目標：

```json5
{
  approvals: {
    exec: {
      enabled: true,
      targets: [{ channel: "slack", to: "U12345678" }],
    },
  },
}
```

同聊天室 `/approve` 也適用於已支援指令的 Slack 頻道和直接訊息（DM）。請參閱 [執行核准](/en/tools/exec-approvals) 以了解完整的核准轉送模型。

## 疑難排解

<AccordionGroup>
  <Accordion title="頻道中沒有回覆">
    依序檢查：

    - `groupPolicy`
    - channel allowlist (`channels.slack.channels`)
    - `requireMention`
    - 每個頻道的 `users` 允許清單

    有用的指令：

```bash
openclaw channels status --probe
openclaw logs --follow
openclaw doctor
```

  </Accordion>

  <Accordion title="DM 訊息被忽略">
    檢查：

    - `channels.slack.dm.enabled`
    - `channels.slack.dmPolicy` (或舊版 `channels.slack.dm.policy`)
    - 配對核准 / 允許清單條目

```bash
openclaw pairing list slack
```

  </Accordion>

<Accordion title="Socket 模式無法連線">在 Slack 應用程式設定中驗證 bot + app token 以及是否已啟用 Socket Mode。</Accordion>

  <Accordion title="HTTP 模式未收到事件">
    驗證：

    - signing secret
    - webhook path
    - Slack Request URLs (Events + Interactivity + Slash Commands)
    - 每個 HTTP 帳戶唯一的 `webhookPath`

  </Accordion>

  <Accordion title="原生/斜線指令未觸發">
    確認您的意圖是：

    - 原生指令模式 (`channels.slack.commands.native: true`) 搭配在 Slack 中註冊的相符斜線指令
    - 或單一斜線指令模式 (`channels.slack.slashCommand.enabled: true`)

    同時檢查 `commands.useAccessGroups` 與頻道/使用者允許清單。

  </Accordion>
</AccordionGroup>

## 文字串流

OpenClaw 支援透過 Agents 和 AI Apps API 進行 Slack 原生文字串流。

`channels.slack.streaming` 控制即時預覽行為：

- `off`：停用即時預覽串流。
- `partial` (預設值)：將預覽文字替換為最新的部分輸出。
- `block`：附加分塊的預覽更新。
- `progress`：生成時顯示進度狀態文字，然後發送最終文字。

`channels.slack.nativeStreaming` 控制 Slack 的原生串流 API (`chat.startStream` / `chat.appendStream` / `chat.stopStream`)，當 `streaming` 為 `partial` 時 (預設值： `true`)。

停用原生 Slack 串流 (保留草稿預覽行為)：

```yaml
channels:
  slack:
    streaming: partial
    nativeStreaming: false
```

舊版鍵值 (Legacy keys)：

- `channels.slack.streamMode` (`replace | status_final | append`) 會自動遷移至 `channels.slack.streaming`。
- 布林值 `channels.slack.streaming` 會自動遷移至 `channels.slack.nativeStreaming`。

### 需求條件

1. 在您的 Slack 應用程式設定中啟用 **Agents and AI Apps**。
2. 確保應用程式擁有 `assistant:write` 權限範圍。
3. 該訊息必須有一個可用的回覆串列。串列選擇仍遵循 `replyToMode`。

### 行為

- 第一個文字區塊會啟動串流 (`chat.startStream`)。
- 後續的文字區塊會附加至同一個串流 (`chat.appendStream`)。
- 回覆結束時會定案串流 (`chat.stopStream`)。
- 媒體和非文字酬載會回退至正常傳遞方式。
- 如果在回覆中途串流失敗，OpenClaw 會將剩餘的酬載回退至正常傳遞方式。

## 設定參考指標

主要參考：

- [Configuration reference - Slack](/en/gateway/configuration-reference#slack)

  高重要性的 Slack 欄位：
  - 模式/驗證： `mode`、`botToken`、`appToken`、`signingSecret`、`webhookPath`、`accounts.*`
  - DM 存取： `dm.enabled`、`dmPolicy`、`allowFrom` (舊版： `dm.policy`、`dm.allowFrom`)、`dm.groupEnabled`、`dm.groupChannels`
  - 相容性切換開關： `dangerouslyAllowNameMatching` (緊急應變；除非否則需要否則請保持關閉)
  - 頻道存取： `groupPolicy`、`channels.*`、`channels.*.users`、`channels.*.requireMention`
  - threading/history: `replyToMode`, `replyToModeByChatType`, `thread.*`, `historyLimit`, `dmHistoryLimit`, `dms.*.historyLimit`
  - delivery: `textChunkLimit`, `chunkMode`, `mediaMaxMb`, `streaming`, `nativeStreaming`
  - ops/features: `configWrites`, `commands.native`, `slashCommand.*`, `actions.*`, `userToken`, `userTokenReadOnly`

## 相關

- [配對](/en/channels/pairing)
- [群組](/en/channels/groups)
- [安全性](/en/gateway/security)
- [通道路由](/en/channels/channel-routing)
- [疑難排解](/en/channels/troubleshooting)
- [設定](/en/gateway/configuration)
- [斜線指令](/en/tools/slash-commands)
