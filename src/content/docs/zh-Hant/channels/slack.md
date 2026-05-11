---
summary: "Slack 設定與執行時期行為（Socket Mode + HTTP Request URLs）"
read_when:
  - Setting up Slack or debugging Slack socket/HTTP mode
title: "Slack"
---

透過 Slack 應用程式整合，在 DM 和頻道上具備生產就緒性。預設模式為 Socket Mode；也支援 HTTP Request URLs。

<CardGroup cols={3}>
  <Card title="配對" icon="link" href="/zh-Hant/channels/pairing">
    Slack DM 預設為配對模式。
  </Card>
  <Card title="斜線指令" icon="terminal" href="/zh-Hant/tools/slash-commands">
    原生指令行為和指令目錄。
  </Card>
  <Card title="頻道疑難排解" icon="wrench" href="/zh-Hant/channels/troubleshooting">
    跨頻道診斷和修復手冊。
  </Card>
</CardGroup>

## 快速設定

<Tabs>
  <Tab title="Socket Mode (預設)">
    <Steps>
      <Step title="建立新的 Slack 應用程式">
        在 Slack 應用程式設定中按下 **[Create New App](https://api.slack.com/apps/new)** 按鈕：

        - 選擇 **from a manifest** 並為您的應用程式選擇一個工作區
        - 從下方貼上 [範例 manifest](#manifest-and-scope-checklist) 並繼續建立
        - 產生一個具有 `connections:write` 的 **App-Level Token** (`xapp-...`)
        - 安裝應用程式並複製顯示的 **Bot Token** (`xoxb-...`)
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

        Env 回退 (僅限預設帳戶)：

```bash
SLACK_APP_TOKEN=xapp-...
SLACK_BOT_TOKEN=xoxb-...
```

      </Step>

      <Step title="啟動 gateway">

```bash
openclaw gateway
```

      </Step>
    </Steps>

  </Tab>

  <Tab title="HTTP 要求網址">
    <Steps>
      <Step title="建立新的 Slack 應用程式">
        在 Slack 應用程式設定中按下 **[Create New App](https://api.slack.com/apps/new)** 按鈕：

        - 選擇 **from a manifest** 並為您的應用程式選擇一個工作區
        - 貼上 [example manifest](#manifest-and-scope-checklist) 並在建立前更新網址
        - 儲存 **Signing Secret** 以供請求驗證
        - 安裝應用程式並複製顯示的 **Bot Token** (`xoxb-...`)

      </Step>

      <Step title="設定 OpenClaw">

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

        <Note>
        在多帳號 HTTP 中使用獨特的 webhook 路徑

        為每個帳號指定一個不同的 `webhookPath` (預設為 `/slack/events`)，以免註冊發生衝突。
        </Note>

      </Step>

      <Step title="啟動閘道">

```bash
openclaw gateway
```

      </Step>
    </Steps>

  </Tab>
</Tabs>

## 資訊清單與範圍檢查清單

Slack 應用程式的基礎資訊清單在 Socket Mode 和 HTTP Request URLs 模式下是相同的。只有 `settings` 區塊 (以及斜線指令的 `url`) 有所不同。

基礎資訊清單 (Socket Mode 預設)：

```json
{
  "display_information": {
    "name": "OpenClaw",
    "description": "Slack connector for OpenClaw"
  },
  "features": {
    "bot_user": { "display_name": "OpenClaw", "always_online": true },
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
      "bot": ["app_mentions:read", "assistant:write", "channels:history", "channels:read", "chat:write", "commands", "emoji:read", "files:read", "files:write", "groups:history", "groups:read", "im:history", "im:read", "im:write", "mpim:history", "mpim:read", "mpim:write", "pins:read", "pins:write", "reactions:read", "reactions:write", "users:read"]
    }
  },
  "settings": {
    "socket_mode_enabled": true,
    "event_subscriptions": {
      "bot_events": ["app_mention", "channel_rename", "member_joined_channel", "member_left_channel", "message.channels", "message.groups", "message.im", "message.mpim", "pin_added", "pin_removed", "reaction_added", "reaction_removed"]
    }
  }
}
```

對於 **HTTP Request URLs 模式**，請將 `settings` 替換為 HTTP 版本，並將 `url` 新增至每個斜線指令。需要公開網址：

```json
{
  "features": {
    "slash_commands": [
      {
        "command": "/openclaw",
        "description": "Send a message to OpenClaw",
        "should_escape": false,
        "url": "https://gateway-host.example.com/slack/events"
      }
    ]
  },
  "settings": {
    "event_subscriptions": {
      "request_url": "https://gateway-host.example.com/slack/events",
      "bot_events": [
        /* same as Socket Mode */
      ]
    },
    "interactivity": {
      "is_enabled": true,
      "request_url": "https://gateway-host.example.com/slack/events",
      "message_menu_options_url": "https://gateway-host.example.com/slack/events"
    }
  }
}
```

### 額外的 Manifest 設定

展現擴充上述預設值的不同功能。

<AccordionGroup>
  <Accordion title="可選的原生斜線指令">

    您可以使用多個[原生斜線指令](#commands-and-slash-behavior)，來取代單一具細微差別的設定指令：

    - 使用 `/agentstatus` 而非 `/status`，因為 `/status` 指令已被保留。
    - 一次最多可供使用的斜線指令數量為 25 個。

    將您現有的 `features.slash_commands` 區段替換為[可用指令](/zh-Hant/tools/slash-commands#command-list)的子集：

    <Tabs>
      <Tab title="Socket 模式 (預設)">

```json
    "slash_commands": [
      {
        "command": "/new",
        "description": "Start a new session",
        "usage_hint": "[model]"
      },
      {
        "command": "/reset",
        "description": "Reset the current session"
      },
      {
        "command": "/compact",
        "description": "Compact the session context",
        "usage_hint": "[instructions]"
      },
      {
        "command": "/stop",
        "description": "Stop the current run"
      },
      {
        "command": "/session",
        "description": "Manage thread-binding expiry",
        "usage_hint": "idle <duration|off> or max-age <duration|off>"
      },
      {
        "command": "/think",
        "description": "Set the thinking level",
        "usage_hint": "<level>"
      },
      {
        "command": "/verbose",
        "description": "Toggle verbose output",
        "usage_hint": "on|off|full"
      },
      {
        "command": "/fast",
        "description": "Show or set fast mode",
        "usage_hint": "[status|on|off]"
      },
      {
        "command": "/reasoning",
        "description": "Toggle reasoning visibility",
        "usage_hint": "[on|off|stream]"
      },
      {
        "command": "/elevated",
        "description": "Toggle elevated mode",
        "usage_hint": "[on|off|ask|full]"
      },
      {
        "command": "/exec",
        "description": "Show or set exec defaults",
        "usage_hint": "host=<auto|sandbox|gateway|node> security=<deny|allowlist|full> ask=<off|on-miss|always> node=<id>"
      },
      {
        "command": "/model",
        "description": "Show or set the model",
        "usage_hint": "[name|#|status]"
      },
      {
        "command": "/models",
        "description": "List providers/models",
        "usage_hint": "[provider] [page] [limit=<n>|size=<n>|all]"
      },
      {
        "command": "/help",
        "description": "Show the short help summary"
      },
      {
        "command": "/commands",
        "description": "Show the generated command catalog"
      },
      {
        "command": "/tools",
        "description": "Show what the current agent can use right now",
        "usage_hint": "[compact|verbose]"
      },
      {
        "command": "/agentstatus",
        "description": "Show runtime status, including provider usage/quota when available"
      },
      {
        "command": "/tasks",
        "description": "List active/recent background tasks for the current session"
      },
      {
        "command": "/context",
        "description": "Explain how context is assembled",
        "usage_hint": "[list|detail|json]"
      },
      {
        "command": "/whoami",
        "description": "Show your sender identity"
      },
      {
        "command": "/skill",
        "description": "Run a skill by name",
        "usage_hint": "<name> [input]"
      },
      {
        "command": "/btw",
        "description": "Ask a side question without changing session context",
        "usage_hint": "<question>"
      },
      {
        "command": "/usage",
        "description": "Control the usage footer or show cost summary",
        "usage_hint": "off|tokens|full|cost"
      }
    ]
```

      </Tab>
      <Tab title="HTTP Request URLs">
        使用與上方 Socket 模式相同的 `slash_commands` 清單，並在每個項目中加入 `"url": "https://gateway-host.example.com/slack/events"`。範例：

```json
    "slash_commands": [
      {
        "command": "/new",
        "description": "Start a new session",
        "usage_hint": "[model]",
        "url": "https://gateway-host.example.com/slack/events"
      },
      {
        "command": "/help",
        "description": "Show the short help summary",
        "url": "https://gateway-host.example.com/slack/events"
      }
      // ...repeat for every command with the same `url` value
    ]
```

      </Tab>
    </Tabs>

  </Accordion>
  <Accordion title="可選的作者身分範圍 (寫入作業)">
    如果您希望傳出訊息使用目前的代理程式身分 (自訂使用者名稱和圖示) 而非預設的 Slack 應用程式身分，請新增 `chat:write.customize` bot 範圍。

    如果您使用 emoji 圖示，Slack 預期使用 `:emoji_name:` 語法。

  </Accordion>
  <Accordion title="可選的使用者權杖範圍 (讀取作業)">
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

## 權杖模型

- `botToken` + `appToken` 為 Socket 模式所需。
- HTTP 模式需要 `botToken` + `signingSecret`。
- `botToken`、`appToken`、`signingSecret` 和 `userToken` 接受純文字字串或 SecretRef 物件。
- Config tokens 會覆蓋 env fallback。
- `SLACK_BOT_TOKEN` / `SLACK_APP_TOKEN` 環境變數回退僅適用於預設帳戶。
- `userToken` (`xoxp-...`) 僅限設定 (無環境變數回退) 且預設為唯讀行為 (`userTokenReadOnly: true`)。

狀態快照行為：

- Slack 帳戶檢查會追蹤每個憑證的 `*Source` 和 `*Status` 欄位 (`botToken`、`appToken`、`signingSecret`、`userToken`)。
- 狀態為 `available`、`configured_unavailable` 或 `missing`。
- `configured_unavailable` 表示帳戶是透過 SecretRef 或其他非內嵌秘密來源設定的，但目前的指令/執行路徑無法解析實際值。
- 在 HTTP 模式下，包含 `signingSecretStatus`；在 Socket 模式下，所需的配對為 `botTokenStatus` + `appTokenStatus`。

<Tip>對於動作/目錄讀取，在設定時可優先使用使用者權杖。對於寫入，Bot 權杖保持優先；僅當 `userTokenReadOnly: false` 且無法使用 Bot 權杖時，才允許使用使用者權杖寫入。</Tip>

## 動作與閘道

Slack 動作由 `channels.slack.actions.*` 控制。

目前 Slack 工具中可用的動作群組：

| 群組       | 預設    |
| ---------- | ------- |
| messages   | 已啟用  |
| reactions  | 已啟用  |
| pins       | 已啟用  |
| memberInfo | enabled |
| emojiList  | enabled |

目前的 Slack 訊息動作包括 `send`、`upload-file`、`download-file`、`read`、`edit`、`delete`、`pin`、`unpin`、`list-pins`、`member-info` 和 `emoji-list`。`download-file` 接受傳入檔案預留位置中顯示的 Slack 檔案 ID，並傳回影像的預覽圖或其他檔案類型的本機檔案中繼資料。

## 存取控制與路由

<Tabs>
  <Tab title="DM policy">
    `channels.slack.dmPolicy` 控制 DM 存取（舊版：`channels.slack.dm.policy`）：

    - `pairing`（預設）
    - `allowlist`
    - `open`（要求 `channels.slack.allowFrom` 包含 `"*"`；舊版：`channels.slack.dm.allowFrom`）
    - `disabled`

    DM 旗標：

    - `dm.enabled`（預設為 true）
    - `channels.slack.allowFrom`（建議）
    - `dm.allowFrom`（舊版）
    - `dm.groupEnabled`（群組 DM 預設為 false）
    - `dm.groupChannels`（選用的 MPIM 允許清單）

    多帳號優先順序：

    - `channels.slack.accounts.default.allowFrom` 僅套用於 `default` 帳號。
    - 當特定帳號未設定自己的 `allowFrom` 時，會繼承 `channels.slack.allowFrom`。
    - 特定帳號不會繼承 `channels.slack.accounts.default.allowFrom`。

    DM 中的配對使用 `openclaw pairing approve slack <code>`。

  </Tab>

  <Tab title="Channel policy">
    `channels.slack.groupPolicy` 控制頻道處理：

    - `open`
    - `allowlist`
    - `disabled`

    頻道允許清單位於 `channels.slack.channels` 之下，應使用穩定的頻道 ID。

    執行時期備註：如果完全缺少 `channels.slack`（僅環境變數設定），執行時期會回退至 `groupPolicy="allowlist"` 並記錄警告（即使已設定 `channels.defaults.groupPolicy`）。

    名稱/ID 解析：

    - 當 Token 存取權限允許時，頻道允許清單項目和 DM 允許清單項目會在啟動時解析
    - 未解析的頻道名稱項目會保留為設定值，但在路由預設會被忽略
    - 傳入授權和頻道路由預設優先使用 ID；直接的使用者名稱/slug 比對需要 `channels.slack.dangerouslyAllowNameMatching: true`

  </Tab>

  <Tab title="提及與頻道使用者">
    頻道訊息預設會受到提及限制。

    提及來源：

    - 明確的應用程式提及 (`<@botId>`)
    - 提及正則表達式模式 (`agents.list[].groupChat.mentionPatterns`，回退 `messages.groupChat.mentionPatterns`)
    - 隱含的回覆機器人執行緒行為（當 `thread.requireExplicitMention` 為 `true` 時停用）

    每個頻道的控制項 (`channels.slack.channels.<id>`；僅透過啟動解析或 `dangerouslyAllowNameMatching` 提供名稱)：

    - `requireMention`
    - `users` (允許清單)
    - `allowBots`
    - `skills`
    - `systemPrompt`
    - `tools`，`toolsBySender`
    - `toolsBySender` 金鑰格式：`id:`、`e164:`、`username:`、`name:` 或 `"*"` 萬用字元
      (舊版無前綴金鑰仍僅對應至 `id:`)

  </Tab>
</Tabs>

## 執行緒、會話和回覆標籤

- DM 路由為 `direct`；頻道路由為 `channel`；MPIM 路由為 `group`。
- 使用預設的 `session.dmScope=main` 時，Slack DM 會折疊至 Agent 主要會話。
- 頻道會話：`agent:<agentId>:slack:channel:<channelId>`。
- 執行緒回覆在適用時可以建立執行緒會話後綴 (`:thread:<threadTs>`)。
- `channels.slack.thread.historyScope` 預設為 `thread`；`thread.inheritParent` 預設為 `false`。
- `channels.slack.thread.initialHistoryLimit` 控制在新的執行緒會話開始時擷取多少個現有執行緒訊息（預設 `20`；設定 `0` 以停用）。
- `channels.slack.thread.requireExplicitMention` (預設 `false`)：當 `true` 時，隱藏隱含的執行緒提及，使機器人僅回應執行緒內明確的 `@bot` 提及，即使機器人已參與該執行緒。若未設定此項，在機器人參與的執行緒中的回覆將繞過 `requireMention` 閘道。

回覆執行緒控制：

- `channels.slack.replyToMode`： `off|first|all|batched` (預設 `off`)
- `channels.slack.replyToModeByChatType`：每 `direct|group|channel`
- 直接聊天的舊版後援機制： `channels.slack.dm.replyToMode`

支援手動回覆標籤：

- `[[reply_to_current]]`
- `[[reply_to:<id>]]`

<Note>`replyToMode="off"` 會停用 Slack 中**所有**回覆執行緒，包括明確的 `[[reply_to_*]]` 標籤。這與 Telegram 不同，後者在 `"off"` 模式下仍會遵守明確標籤。Slack 執行緒會從頻道中隱藏訊息，而 Telegram 回覆則保持內聯可見。</Note>

## Ack 反應

`ackReaction` 會在 OpenClaw 處理傳入訊息時發送確認表情符號。

解析順序：

- `channels.slack.accounts.<accountId>.ackReaction`
- `channels.slack.ackReaction`
- `messages.ackReaction`
- 代理身分表情符號後援機制 (`agents.list[].identity.emoji`，否則為 "👀")

備註：

- Slack 預期使用簡碼 (例如 `"eyes"`)。
- 使用 `""` 以針對 Slack 帳號或全域停用反應。

## 文字串流

`channels.slack.streaming` 控制即時預覽行為：

- `off`：停用即時預覽串流。
- `partial` (預設)：以最新的部分輸出取代預覽文字。
- `block`：附加分塊預覽更新。
- `progress`：在生成時顯示進度狀態文字，然後發送最終文字。
- `streaming.preview.toolProgress`：當草稿預覽啟用時，將工具/進度更新路由至同一個已編輯的預覽訊息 (預設： `true`)。設定 `false` 以保留個別的工具/進度訊息。

`channels.slack.streaming.nativeTransport` 控制當 `channels.slack.streaming.mode` 為 `partial` 時的 Slack 原生文字串流（預設值：`true`）。

- 必須要有回覆執行緒才能使用原生文字串流並顯示 Slack 助手執行緒狀態。執行緒選擇仍然遵循 `replyToMode`。
- 當無法使用原生串流時，頻道和群組聊天根層級仍然可以使用正常的草稿預覽。
- 頂層 Slack DM 預設保持在執行緒之外，因此它們不會顯示執行緒樣式的預覽；如果您希望在那裡看到可見的進度，請使用執行緒回覆或 `typingReaction`。
- 媒體和非文字酬載會回退到正常傳遞。
- 媒體/錯誤的最終內容會取消待處理的預覽編輯；符合條件的文字/區塊最終內容只有在能就地編輯預覽時才會排入。
- 如果在回覆中途串流失敗，OpenClaw 會將其餘酬載回退到正常傳遞。

使用草稿預覽代替 Slack 原生文字串流：

```json5
{
  channels: {
    slack: {
      streaming: {
        mode: "partial",
        nativeTransport: false,
      },
    },
  },
}
```

舊版金鑰：

- `channels.slack.streamMode` (`replace | status_final | append`) 會自動遷移到 `channels.slack.streaming.mode`。
- 布林值 `channels.slack.streaming` 會自動遷移到 `channels.slack.streaming.mode` 和 `channels.slack.streaming.nativeTransport`。
- 舊版 `channels.slack.nativeStreaming` 會自動遷移到 `channels.slack.streaming.nativeTransport`。

## 輸入反應回退

`typingReaction` 會在 OpenClaw 處理回覆時，在傳入的 Slack 訊息上新增一個暫時性的反應，然後在執行完成時將其移除。這在執行緒回覆之外最為有用，執行緒回覆會使用預設的「正在輸入...」狀態指示器。

解析順序：

- `channels.slack.accounts.<accountId>.typingReaction`
- `channels.slack.typingReaction`

注意事項：

- Slack 預期使用短代碼（例如 `"hourglass_flowing_sand"`）。
- 該反應是盡力而為的，並且會在回覆或失敗路徑完成後自動嘗試清理。

## 媒體、分塊與傳遞

<AccordionGroup>
  <Accordion title="Inbound attachments">
    Slack 檔案附件會從 Slack 託管的私有 URL（經過令牌驗證的請求流程）下載，並在提取成功且大小限制允許的情況下寫入媒體儲存庫。檔案佔位符包含 Slack `fileId`，以便代理可以使用 `download-file` 提取原始檔案。

    執行時入站大小上限預設為 `20MB`，除非被 `channels.slack.mediaMaxMb` 覆蓋。

  </Accordion>

<Accordion title="Outbound text and files">- 文字區塊使用 `channels.slack.textChunkLimit`（預設為 4000） - `channels.slack.chunkMode="newline"` 啟用段落優先分割 - 檔案發送使用 Slack 上傳 API，並且可以包含執行緒回覆（`thread_ts`） - 出站媒體上限在配置時遵循 `channels.slack.mediaMaxMb`；否則通道發送使用來自媒體管道的 MIME 類型預設值</Accordion>

  <Accordion title="Delivery targets">
    首選的明確目標：

    - 用於私訊 (DMs) 的 `user:<id>`
    - 用於頻道的 `channel:<id>`

    當發送到用戶目標時，Slack 私訊會透過 Slack 對話 API 開啟。

  </Accordion>
</AccordionGroup>

## 指令與斜線行為

斜線指令在 Slack 中以單一配置的指令或多個原生指令的形式出現。配置 `channels.slack.slashCommand` 以變更指令預設值：

- `enabled: false`
- `name: "openclaw"`
- `sessionPrefix: "slack:slash"`
- `ephemeral: true`

```txt
/openclaw /help
```

原生指令需要在您的 Slack 應用程式中進行[額外的清單設定](#additional-manifest-settings)，並且在全域設定中啟用 `channels.slack.commands.native: true` 或 `commands.native: true`。

- Slack 的原生指令自動模式為 **關閉**，因此 `commands.native: "auto"` 不會啟用 Slack 原生指令。

```txt
/help
```

原生參數選單使用自適應渲染策略，在發送所選選項值之前顯示確認模態框：

- 最多 5 個選項：按鈕區塊
- 6-100 個選項：靜態選擇選單
- 超過 100 個選項：當可用的互動選項處理程序時，使用具有非同步選項過濾的外部選擇
- 超出 Slack 限制：編碼的選項值會退回到按鈕

```txt
/think
```

Slash 會話使用像 `agent:<agentId>:slack:slash:<userId>` 這樣的隔離金鑰，並且仍然使用 `CommandTargetSessionKey` 將指令執行路由到目標對話會話。

## 互動式回覆

Slack 可以呈現 Agent 建立的互動式回覆控制項，但此功能預設為停用。

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

或僅針對單一 Slack 帳號啟用：

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

這些指令會編譯成 Slack Block Kit，並將點擊或選擇透過現有的 Slack 互動事件路徑路由回來。

備註：

- 這是 Slack 專用的 UI。其他管道不會將 Slack Block Kit 指令轉換為它們自己的按鈕系統。
- 互動式回調值是 OpenClaw 產生的不透明權杖，而非原始 Agent 建立的值。
- 如果產生的互動式區塊會超出 Slack Block Kit 限制，OpenClaw 會退回到原始的文字回覆，而不是傳送無效的區塊 payload。

## 在 Slack 中進行 Exec 核准

Slack 可以充當具有互動式按鈕和互動的原生核准客戶端，而不是退回到 Web UI 或終端機。

- Exec 核准使用 `channels.slack.execApprovals.*` 進行原生 DM/頻道路由。
- 當請求已經抵達 Slack 並且核准 id 類型為 `plugin:` 時，Plugin 核准仍然可以透過相同的 Slack 原生按鈕介面解決。
- 仍然會執行核准者授權：只有被識別為核准者的使用者可以透過 Slack 核准或拒絕請求。

這使用與其他管道相同的共用核准按鈕介面。當在您的 Slack 應用程式設定中啟用 `interactivity` 時，核准提示會直接在對話中呈現為 Block Kit 按鈕。當這些按鈕出現時，它們是主要的核准 UX；只有當工具結果表示聊天核准無法使用或手動核准是唯一路徑時，OpenClaw 才應該包含手動 `/approve` 指令。

設定路徑：

- `channels.slack.execApprovals.enabled`
- `channels.slack.execApprovals.approvers` (選用；盡可能回退至 `commands.ownerAllowFrom`)
- `channels.slack.execApprovals.target` (`dm` | `channel` | `both`，預設值：`dm`)
- `agentFilter`, `sessionFilter`

當 `enabled` 未設定或為 `"auto"`，且至少有一位
審核者解決時，Slack 會自動啟用原生 exec 審核。設定 `enabled: false` 可明確停用 Slack 作為原生審核客戶端。
設定 `enabled: true` 可在審核者解決時強制啟用原生審核。

未明確設定 Slack exec 審核設定時的預設行為：

```json5
{
  commands: {
    ownerAllowFrom: ["slack:U12345678"],
  },
}
```

只有在您想要覆寫審核者、新增篩選器，或
選擇傳送至來源聊天 (origin-chat) 時，才需要明確的 Slack 原生設定：

```json5
{
  channels: {
    slack: {
      execApprovals: {
        enabled: true,
        approvers: ["U12345678"],
        target: "both",
      },
    },
  },
}
```

共用 `approvals.exec` 轉發是分開的。僅在 exec 審核提示也必須
路由至其他聊天或明確的頻外目標時使用。共用 `approvals.plugin` 轉發也是
分開的；當這些請求已抵達 Slack 時，Slack 原生按鈕仍可解決外掛程式審核。

同聊天 (Same-chat) `/approve` 也可在已支援指令的 Slack 頻道和 DM 中運作。請參閱 [Exec 審核](/zh-Hant/tools/exec-approvals) 以了解完整的審核轉發模型。

## 事件和操作行為

- 訊息編輯/刪除會對應至系統事件。
- 執緒廣播 (「同時傳送至頻道」的執緒回覆) 會作為一般使用者訊息處理。
- 反應新增/移除事件會對應至系統事件。
- 成員加入/離開、頻道建立/重新命名，以及釘選新增/移除事件會對應至系統事件。
- 當啟用 `configWrites` 時，`channel_id_changed` 可以遷移頻道設定金鑰。
- 頻道主題/用途中繼資料會被視為不受信任的上下文，並可注入至路由上下文中。
- 執緒啟動者和初始執緒歷史上下文植入會在適用時透過設定的傳送者允許清單進行篩選。
- 區塊動作和模態互動會發出具有豐富載欄位的結構化 `Slack interaction: ...` 系統事件：
  - 區塊動作：選定值、標籤、選擇器值以及 `workflow_*` 中繼資料
  - 包含路由頻道中繼資料和表單輸入的 modal `view_submission` 和 `view_closed` 事件

## 設定參考

主要參考：[設定參考 - Slack](/zh-Hant/gateway/config-channels#slack)。

<Accordion title="高重要性 Slack 欄位">

- 模式/驗證：`mode`、`botToken`、`appToken`、`signingSecret`、`webhookPath`、`accounts.*`
- DM 存取：`dm.enabled`、`dmPolicy`、`allowFrom` (舊版：`dm.policy`、`dm.allowFrom`)、`dm.groupEnabled`、`dm.groupChannels`
- 相容性切換：`dangerouslyAllowNameMatching` (緊急措施；除非必要，否則請保持關閉)
- 頻道存取：`groupPolicy`、`channels.*`、`channels.*.users`、`channels.*.requireMention`
- 執行緒/歷史記錄：`replyToMode`、`replyToModeByChatType`、`thread.*`、`historyLimit`、`dmHistoryLimit`、`dms.*.historyLimit`
- 傳遞：`textChunkLimit`、`chunkMode`、`mediaMaxMb`、`streaming`、`streaming.nativeTransport`、`streaming.preview.toolProgress`
- 操作/功能：`configWrites`、`commands.native`、`slashCommand.*`、`actions.*`、`userToken`、`userTokenReadOnly`

</Accordion>

## 疑難排解

<AccordionGroup>
  <Accordion title="No replies in channels">
    請依序檢查：

    - `groupPolicy`
    - 頻道允許清單 (`channels.slack.channels`)
    - `requireMention`
    - 逐頻道 `users` 允許清單

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
    - 配對核准 / 允許清單項目
    - Slack Assistant DM 事件：提及 `drop message_changed` 的詳細日誌
      通常表示 Slack 發送了一個經過編輯的 Assistant-thread 事件，但在訊息元資料中
      沒有可復原的人類發送者

```bash
openclaw pairing list slack
```

  </Accordion>

  <Accordion title="Socket mode not connecting">
    在 Slack 應用程式設定中驗證 Bot + 應用程式權杖及 Socket Mode 是否已啟用。

    如果 `openclaw channels status --probe --json` 顯示 `botTokenStatus` 或
    `appTokenStatus: "configured_unavailable"`，表示 Slack 帳戶
    已設定，但目前的執行環境無法解析 SecretRef 支援的
    數值。

  </Accordion>

  <Accordion title="HTTP mode not receiving events">
    驗證：

    - 簽署金鑰 (signing secret)
    - webhook 路徑
    - Slack Request URLs (Events + Interactivity + Slash Commands)
    - 每個 HTTP 帳戶唯一的 `webhookPath`

    如果 `signingSecretStatus: "configured_unavailable"` 出現在帳戶
    快照中，表示 HTTP 帳戶已設定，但目前的執行環境無法
    解析 SecretRef 支援的簽署金鑰。

  </Accordion>

  <Accordion title="Native/slash commands not firing">
    驗證您的意圖：

    - 原生指令模式 (`channels.slack.commands.native: true`)，並在 Slack 中註冊了對應的斜線指令
    - 或是單一斜線指令模式 (`channels.slack.slashCommand.enabled: true`)

    同時也請檢查 `commands.useAccessGroups` 和頻道/使用者允許清單。

  </Accordion>
</AccordionGroup>

## 相關

<CardGroup cols={2}>
  <Card title="配對" icon="link" href="/zh-Hant/channels/pairing">
    將 Slack 使用者配對到閘道。
  </Card>
  <Card title="群組" icon="users" href="/zh-Hant/channels/groups">
    頻道和群組 DM 的行為。
  </Card>
  <Card title="頻道路由" icon="route" href="/zh-Hant/channels/channel-routing">
    將訊息路由傳送給代理人。
  </Card>
  <Card title="安全性" icon="shield" href="/zh-Hant/gateway/security">
    威脅模型和強化防禦。
  </Card>
  <Card title="設定" icon="sliders" href="/zh-Hant/gateway/configuration">
    設定版面配置和優先順序。
  </Card>
  <Card title="斜線指令" icon="terminal" href="/zh-Hant/tools/slash-commands">
    指令目錄和行為。
  </Card>
</CardGroup>
