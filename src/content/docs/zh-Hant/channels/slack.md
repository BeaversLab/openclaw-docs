---
summary: "Slack 設定與執行時期行為 (Socket Mode + HTTP Request URLs)"
read_when:
  - Setting up Slack or debugging Slack socket/HTTP mode
title: "Slack"
---

# Slack

狀態：透過 Slack 應用程式整合，已支援 DMs + 頻道的正式環境版本。預設模式為 Socket Mode；同時也支援 HTTP Request URLs。

<CardGroup cols={3}>
  <Card title="配對" icon="link" href="/en/channels/pairing">
    Slack DMs 預設為配對模式。
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
  <Tab title="Socket Mode (預設)">
    <Steps>
      <Step title="建立新的 Slack 應用程式">
        在 Slack 應用程式設定中按下 **[建立新應用程式](https://api.slack.com/apps/new)** 按鈕：

        - 選擇 **從 manifest** 並為您的應用程式選取一個工作區
        - 貼上下方的 [範例 manifest](#manifest-and-scope-checklist) 並繼續建立
        - 產生一個具有 `connections:write` 的 **應用程式層級 Token** (`xapp-...`)
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

  <Tab title="HTTP Request URLs">
    <Steps>
      <Step title="Create a new Slack app">
        在 Slack 應用程式設定中，按一下 **[Create New App](https://api.slack.com/apps/new)** 按鈕：

        - 選擇 **from a manifest** 並為您的應用程式選擇一個工作區
        - 貼上 [example manifest](#manifest-and-scope-checklist) 並在建立前更新 URL
        - 儲存 **Signing Secret** 以用於請求驗證
        - 安裝應用程式並複製顯示的 **Bot Token** (`xoxb-...`)

      </Step>

      <Step title="Configure OpenClaw">

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
        Use unique webhook paths for multi-account HTTP

        給每個帳戶一個獨特的 `webhookPath` (預設 `/slack/events`)，以免註冊衝突。
        </Note>

      </Step>

      <Step title="Start gateway">

```bash
openclaw gateway
```

      </Step>
    </Steps>

  </Tab>
</Tabs>

## Manifest 與範圍檢查清單

<Tabs>
  <Tab title="Socket Mode (default)">

```json
{
  "display_information": {
    "name": "OpenClaw",
    "description": "Slack connector for OpenClaw"
  },
  "features": {
    "bot_user": {
      "display_name": "OpenClaw",
      "always_online": true
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

  </Tab>

  <Tab title="HTTP Request URLs">

```json
{
  "display_information": {
    "name": "OpenClaw",
    "description": "Slack connector for OpenClaw"
  },
  "features": {
    "bot_user": {
      "display_name": "OpenClaw",
      "always_online": true
    },
    "app_home": {
      "messages_tab_enabled": true,
      "messages_tab_read_only_enabled": false
    },
    "slash_commands": [
      {
        "command": "/openclaw",
        "description": "Send a message to OpenClaw",
        "should_escape": false,
        "url": "https://gateway-host.example.com/slack/events"
      }
    ]
  },
  "oauth_config": {
    "scopes": {
      "bot": ["app_mentions:read", "assistant:write", "channels:history", "channels:read", "chat:write", "commands", "emoji:read", "files:read", "files:write", "groups:history", "groups:read", "im:history", "im:read", "im:write", "mpim:history", "mpim:read", "mpim:write", "pins:read", "pins:write", "reactions:read", "reactions:write", "users:read"]
    }
  },
  "settings": {
    "event_subscriptions": {
      "request_url": "https://gateway-host.example.com/slack/events",
      "bot_events": ["app_mention", "channel_rename", "member_joined_channel", "member_left_channel", "message.channels", "message.groups", "message.im", "message.mpim", "pin_added", "pin_removed", "reaction_added", "reaction_removed"]
    },
    "interactivity": {
      "is_enabled": true,
      "request_url": "https://gateway-host.example.com/slack/events",
      "message_menu_options_url": "https://gateway-host.example.com/slack/events"
    }
  }
}
```

  </Tab>
</Tabs>

<AccordionGroup>
  <Accordion title="Optional authorship scopes (write operations)">
    如果您希望傳出訊息使用 active agent identity (自訂使用者名稱和圖示) 而非預設的 Slack 應用程式身分，請新增 `chat:write.customize` bot scope。

    如果您使用 emoji 圖示，Slack 期望的是 `:emoji_name:` 語法。

  </Accordion>
  <Accordion title="Optional user-token scopes (read operations)">
    如果您設定 `channels.slack.userToken`，典型的讀取 scopes 為：

    - `channels:history`, `groups:history`, `im:history`, `mpim:history`
    - `channels:read`, `groups:read`, `im:read`, `mpim:read`
    - `users:read`
    - `reactions:read`
    - `pins:read`
    - `emoji:read`
    - `search:read` (如果您依賴 Slack 搜尋讀取)

  </Accordion>
</AccordionGroup>

## Token 模型

- Socket Mode 需要 `botToken` + `appToken`。
- HTTP 模式需要 `botToken` + `signingSecret`。
- `botToken`、`appToken`、`signingSecret` 和 `userToken` 接受純字串
  或 SecretRef 物件。
- 組態 Token 會覆蓋環境變數後備。
- `SLACK_BOT_TOKEN` / `SLACK_APP_TOKEN` 環境變數後備僅適用於預設帳戶。
- `userToken` (`xoxp-...`) 僅限組態使用（無環境變數後備），且預設為唯讀行為 (`userTokenReadOnly: true`)。

狀態快照行為：

- Slack 帳戶檢查會追蹤各憑證的 `*Source` 和 `*Status`
  欄位 (`botToken`, `appToken`, `signingSecret`, `userToken`)。
- 狀態為 `available`、`configured_unavailable` 或 `missing`。
- `configured_unavailable` 表示帳戶透過 SecretRef
  或其他非行內秘密來源進行組態，但目前的指令/執行階段路徑
  無法解析實際值。
- 在 HTTP 模式下，包含 `signingSecretStatus`；在 Socket Mode 中，
  必要的配對是 `botTokenStatus` + `appTokenStatus`。

<Tip>對於動作/目錄讀取，當已設定時，使用者 Token 優先。對於寫入，Bot Token 仍然優先；僅當設定 `userTokenReadOnly: false` 且無 Bot Token 時，才允許使用使用者 Token 寫入。</Tip>

## 動作與閘門

Slack 動作由 `channels.slack.actions.*` 控制。

目前 Slack 工具中可用的動作群組：

| 群組       | 預設   |
| ---------- | ------ |
| messages   | 已啟用 |
| reactions  | 已啟用 |
| pins       | 已啟用 |
| memberInfo | 已啟用 |
| emojiList  | 已啟用 |

目前的 Slack 訊息動作包括 `send`、`upload-file`、`download-file`、`read`、`edit`、`delete`、`pin`、`unpin`、`list-pins`、`member-info` 和 `emoji-list`。

## 存取控制與路由

<Tabs>
  <Tab title="DM 政策">
    `channels.slack.dmPolicy` 控制 DM 存取（舊版：`channels.slack.dm.policy`）：

    - `pairing`（預設）
    - `allowlist`
    - `open`（要求 `channels.slack.allowFrom` 包含 `"*"`；舊版：`channels.slack.dm.allowFrom`）
    - `disabled`

    DM 旗標：

    - `dm.enabled`（預設為 true）
    - `channels.slack.allowFrom`（建議使用）
    - `dm.allowFrom`（舊版）
    - `dm.groupEnabled`（群組 DM 預設為 false）
    - `dm.groupChannels`（可選的 MPIM 許可清單）

    多帳號優先順序：

    - `channels.slack.accounts.default.allowFrom` 僅套用於 `default` 帳號。
    - 具名帳號在未設定自己的 `allowFrom` 時會繼承 `channels.slack.allowFrom`。
    - 具名帳號不會繼承 `channels.slack.accounts.default.allowFrom`。

    DM 中的配對使用 `openclaw pairing approve slack <code>`。

  </Tab>

  <Tab title="頻道政策">
    `channels.slack.groupPolicy` 控制頻道處理方式：

    - `open`
    - `allowlist`
    - `disabled`

    頻道允許清單位於 `channels.slack.channels` 之下，並應使用穩定的頻道 ID。

    執行時注意：如果 `channels.slack` 完全缺失（僅環境變數設定），執行時會回退到 `groupPolicy="allowlist"` 並記錄警告（即使設定了 `channels.defaults.groupPolicy`）。

    名稱/ID 解析：

    - 頻道允許清單項目和 DM 允許清單項目會在啟動時於 Token 存取允許的情況下解析
    - 未解析的頻道名稱項目會保留為設定值，但預設會在路由中被忽略
    - 傳入授權和頻道路由預設以 ID 為優先；直接使用者名稱/slug 匹配需要 `channels.slack.dangerouslyAllowNameMatching: true`

  </Tab>

  <Tab title="提及與頻道使用者">
    頻道訊息預設受提及限制。

    提及來源：

    - 明確的 App 提及 (`<@botId>`)
    - 提及正則表達式模式 (`agents.list[].groupChat.mentionPatterns`, 後備 `messages.groupChat.mentionPatterns`)
    - 隱含的回覆機器人執行緒行為（當 `thread.requireExplicitMention` 為 `true` 時停用）

    各頻道控制項 (`channels.slack.channels.<id>`; 僅透過啟動解析或 `dangerouslyAllowNameMatching` 提供名稱)：

    - `requireMention`
    - `users` (允許清單)
    - `allowBots`
    - `skills`
    - `systemPrompt`
    - `tools`, `toolsBySender`
    - `toolsBySender` 金鑰格式： `id:`, `e164:`, `username:`, `name:`, 或 `"*"` 萬用字元
      (舊版無前綴金鑰仍僅對應至 `id:`)

  </Tab>
</Tabs>

## 執行緒、會話和回覆標籤

- DM 以 `direct` 方式路由；頻道以 `channel`；MPIM 以 `group`。
- 使用預設的 `session.dmScope=main`，Slack 私訊會折疊至代理主會話。
- 頻道會話：`agent:<agentId>:slack:channel:<channelId>`。
- 在適用時，執行緒回覆可以建立執行緒會話後綴（`:thread:<threadTs>`）。
- `channels.slack.thread.historyScope` 預設為 `thread`；`thread.inheritParent` 預設為 `false`。
- `channels.slack.thread.initialHistoryLimit` 控制當新執行緒會話開始時獲取多少現有的執行緒訊息（預設 `20`；設定 `0` 以停用）。
- `channels.slack.thread.requireExplicitMention`（預設 `false`）：當 `true` 時，抑制隱式執行緒提及，因此機器人僅回應執行緒內顯式的 `@bot` 提及，即使機器人已參與該執行緒。若無此設定，機器人參與的執行緒中的回覆將繞過 `requireMention` 閘道。

回覆執行緒控制：

- `channels.slack.replyToMode`： `off|first|all|batched`（預設 `off`）
- `channels.slack.replyToModeByChatType`：每 `direct|group|channel`
- 直接聊天的舊版後備方案： `channels.slack.dm.replyToMode`

支援手動回覆標籤：

- `[[reply_to_current]]`
- `[[reply_to:<id>]]`

注意： `replyToMode="off"` 會停用 Slack 中 **所有** 的回覆執行緒功能，包括顯式的 `[[reply_to_*]]` 標籤。這與 Telegram 不同，後者在 `"off"` 模式下仍會遵守顯式標籤。此差異反映了平台的執行緒模型：Slack 執行緒會從頻道中隱藏訊息，而 Telegram 回覆則會保留在主要聊天流程中。

## 確認反應

當 OpenClaw 正在處理傳入訊息時，`ackReaction` 會發送一個確認表情符號。

解析順序：

- `channels.slack.accounts.<accountId>.ackReaction`
- `channels.slack.ackReaction`
- `messages.ackReaction`
- 代理身分表情符號後備機制（`agents.list[].identity.emoji`，否則為 "👀"）

注意事項：

- Slack 預期短代碼（shortcodes，例如 `"eyes"`）。
- 使用 `""` 針對 Slack 帳號或全域停用該反應。

## 文字串流

`channels.slack.streaming` 控制即時預覽行為：

- `off`：停用即時預覽串流。
- `partial` (預設)：將預覽文字替換為最新的部分輸出。
- `block`：附加分塊的預覽更新。
- `progress`：在生成時顯示進度狀態文字，然後發送最終文字。

當 `channels.slack.streaming.mode` 為 `partial` 時，`channels.slack.streaming.nativeTransport` 控制 Slack 原生文字串流 (預設值：`true`)。

- 必須要有回覆執行緒，才能顯示原生文字串流和 Slack 助理執行緒狀態。執行緒選擇仍然遵循 `replyToMode`。
- 當無法使用原生串流時，頻道和群組聊天根目錄仍然可以使用正常的草稿預覽。
- 頂層 Slack DM 預設保持在執行緒之外，因此它們不會顯示執行緒樣式的預覽；如果您希望在那裡看到可見的進度，請使用執行緒回覆或 `typingReaction`。
- 媒體和非文字負載會回退到正常傳遞。
- 如果在回覆過程中串流失敗，OpenClaw 會將其餘負載回退到正常傳遞。

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

- `channels.slack.streamMode` (`replace | status_final | append`) 會自動遷移至 `channels.slack.streaming.mode`。
- 布林值 `channels.slack.streaming` 會自動遷移至 `channels.slack.streaming.mode` 和 `channels.slack.streaming.nativeTransport`。
- 舊版 `channels.slack.nativeStreaming` 會自動遷移至 `channels.slack.streaming.nativeTransport`。

## 輸入反應回退

`typingReaction` 會在 OpenClaw 處理回覆時，向傳入的 Slack 訊息新增暫時性反應，然後在執行完成時將其移除。這在執行緒回覆之外最有用，因為執行緒回覆使用預設的「正在輸入...」狀態指示器。

解析順序：

- `channels.slack.accounts.<accountId>.typingReaction`
- `channels.slack.typingReaction`

備註：

- Slack 預期使用短代碼 (例如 `"hourglass_flowing_sand"`)。
- 該反應採用盡力而為的方式，並在回覆或失敗路徑完成後自動嘗試清理。

## 媒體、分塊與傳遞

<AccordionGroup>
  <Accordion title="Inbound attachments">
    Slack 檔案附件是從 Slack 託管的私人 URL（令牌驗證的請求流程）下載的，並在抓取成功且大小限制允許時寫入媒體存儲。

    運行時入站大小上限預設為 `20MB`，除非被 `channels.slack.mediaMaxMb` 覆蓋。

  </Accordion>

<Accordion title="Outbound text and files">- 文字分塊使用 `channels.slack.textChunkLimit`（預設為 4000） - `channels.slack.chunkMode="newline"` 啟用段落優先分割 - 檔案傳送使用 Slack 上傳 API，並且可以包含執行緒回覆（`thread_ts`） - 出站媒體上限在配置時遵循 `channels.slack.mediaMaxMb`；否則頻道傳送使用媒體管道中基於 MIME 類型的預設值</Accordion>

  <Accordion title="Delivery targets">
    首選的明確目標：

    - `user:<id>` 用於 DM
    - `channel:<id>` 用於頻道

    當傳送到使用者目標時，Slack DM 會透過 Slack 對話 API 開啟。

  </Accordion>
</AccordionGroup>

## 指令與斜線行為

- Slack 的原生指令自動模式為「關閉」（`commands.native: "auto"` 不會啟用 Slack 原生指令）。
- 使用 `channels.slack.commands.native: true`（或全域 `commands.native: true`）啟用原生 Slack 指令處理程式。
- 啟用原生指令時，在 Slack 中註冊相符的斜線指令（`/<command>` 名稱），有一個例外：
  - 為狀態指令註冊 `/agentstatus`（Slack 保留 `/status`）
- 如果未啟用原生指令，您可以透過 `channels.slack.slashCommand` 執行單一設定的斜線指令。
- 原生參數選單現在會調整其呈現策略：
  - 最多 5 個選項：按鈕區塊
  - 6-100 個選項：靜態選擇選單
  - 超過 100 個選項：外部選擇，並在有互動選項處理程式可用時進行非同步選項過濾
  - 如果編碼的選項值超出 Slack 限制，流程會回退到按鈕
- 對於長選項負載，斜線指令參數選單會在發送所選值之前使用確認對話框。

預設斜線指令設定：

- `enabled: false`
- `name: "openclaw"`
- `sessionPrefix: "slack:slash"`
- `ephemeral: true`

Slash 會話使用隔離的金鑰：

- `agent:<agentId>:slack:slash:<userId>`

並且仍然根據目標對話會話 (`CommandTargetSessionKey`) 路由指令執行。

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

或僅針對一個 Slack 帳戶啟用它：

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

這些指令會編譯成 Slack Block Kit，並透過現有的 Slack 互動事件路徑將點擊或選擇傳回。

備註：

- 這是 Slack 專用的 UI。其他頻道不會將 Slack Block Kit 指令轉換為其自己的按鈕系統。
- 互動式回調值是 OpenClaw 產生的不透明標記，而不是原始的代理程式建立值。
- 如果產生的互動式區塊會超出 Slack Block Kit 限制，OpenClaw 會回退到原始的文字回覆，而不是發送無效的區塊負載。

## Slack 中的執行核准

Slack 可以充當具有互動式按鈕和互動的原生核准用戶端，而不是回退到 Web UI 或終端機。

- 執行核准使用 `channels.slack.execApprovals.*` 進行原生 DM/頻道路由。
- 當請求已經抵達 Slack 並且核准 ID 類型為 `plugin:` 時，外掛程式核准仍然可以透過相同的 Slack 原生按鈕介面解決。
- 仍然會執行核准者授權：只有被識別為核准者的使用者才能透過 Slack 核准或拒絕請求。

這使用與其他頻道相同的共用審批按鈕介面。當在您的 Slack 應用程式設定中啟用 `interactivity` 時，審批提示會直接在對話中以 Block Kit 按鈕呈現。當這些按鈕存在時，它們是主要的審批使用者體驗；OpenClaw 應僅在工具結果指出聊天審批不可用或手動審批是唯一途徑時，才包含手動 `/approve` 指令。

設定路徑：

- `channels.slack.execApprovals.enabled`
- `channels.slack.execApprovals.approvers` （選用；可能的話會回退到 `commands.ownerAllowFrom`）
- `channels.slack.execApprovals.target` （`dm` | `channel` | `both`，預設值： `dm`）
- `agentFilter`、 `sessionFilter`

當 `enabled` 未設定或為 `"auto"` 且至少有一位審批者解析時，Slack 會自動啟用原生執行審批。設定 `enabled: false` 可明確停用 Slack 作為原生審批用戶端。設定 `enabled: true` 可在審批者解析時強制啟用原生審批。

沒有明確 Slack 執行審批設定時的預設行為：

```json5
{
  commands: {
    ownerAllowFrom: ["slack:U12345678"],
  },
}
```

只有當您想要覆寫審批者、新增篩選器或選擇加入來源聊天傳遞時，才需要明確的 Slack 原生設定：

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

共用 `approvals.exec` 轉發是分開的。僅當執行審批提示也必須路由到其他聊天或明確的頻外目標時才使用它。共用 `approvals.plugin` 轉發也是分開的；當這些請求已經抵達 Slack 時，Slack 原生按鈕仍然可以解析外掛程式審批。

同聊天 `/approve` 也適用於已經支援指令的 Slack 頻道和 DM。請參閱 [Exec approvals](/en/tools/exec-approvals) 以了解完整的審批轉發模型。

## 事件與操作行為

- 訊息編輯/刪除/執行緒廣播會對應到系統事件。
- 表情反應新增/移除事件會對應到系統事件。
- 成員加入/離開、頻道建立/重新命名，以及釘選新增/移除事件會對應到系統事件。
- 當啟用 `configWrites` 時，`channel_id_changed` 可以遷移通道配置金鑰。
- 通道主題/目的元資料被視為不受信任的上下文，並可以注入到路由上下文中。
- 執行緒啟動器和初始執行緒歷史上下文播種會在適用時根據配置的發送者允許清單進行過濾。
- 區塊操作和模態互動會發出具有豐富負載欄位的結構化 `Slack interaction: ...` 系統事件：
  - 區塊操作：選取的值、標籤、選取器值和 `workflow_*` 元資料
  - 具有路由通道元資料和表單輸入的模態 `view_submission` 和 `view_closed` 事件

## 配置參考指標

主要參考：

- [配置參考 - Slack](/en/gateway/configuration-reference#slack)

  高信號 Slack 欄位：
  - 模式/身份驗證：`mode`、`botToken`、`appToken`、`signingSecret`、`webhookPath`、`accounts.*`
  - DM 存取：`dm.enabled`、`dmPolicy`、`allowFrom`（舊版：`dm.policy`、`dm.allowFrom`）、`dm.groupEnabled`、`dm.groupChannels`
  - 相容性切換：`dangerouslyAllowNameMatching`（緊急措施；除非否則需要，否則請保持關閉）
  - 通道存取：`groupPolicy`、`channels.*`、`channels.*.users`、`channels.*.requireMention`
  - 執行緒/歷史：`replyToMode`、`replyToModeByChatType`、`thread.*`、`historyLimit`、`dmHistoryLimit`、`dms.*.historyLimit`
  - 傳遞：`textChunkLimit`、`chunkMode`、`mediaMaxMb`、`streaming`、`streaming.nativeTransport`
  - ops/features: `configWrites`, `commands.native`, `slashCommand.*`, `actions.*`, `userToken`, `userTokenReadOnly`

## 疑難排解

<AccordionGroup>
  <Accordion title="頻道中沒有回覆">
    依序檢查：

    - `groupPolicy`
    - channel allowlist (`channels.slack.channels`)
    - `requireMention`
    - per-channel `users` allowlist

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
    - `channels.slack.dmPolicy` (或 legacy `channels.slack.dm.policy`)
    - pairing approvals / allowlist entries

```bash
openclaw pairing list slack
```

  </Accordion>

  <Accordion title="Socket 模式無法連線">
    在 Slack 應用程式設定中驗證 bot + app tokens 和 Socket Mode 的啟用狀態。

    如果 `openclaw channels status --probe --json` 顯示 `botTokenStatus` 或
    `appTokenStatus: "configured_unavailable"`，表示 Slack 帳號已
    設定，但目前的執行環境無法解析 SecretRef 支援的
    數值。

  </Accordion>

  <Accordion title="HTTP 模式未收到事件">
    驗證：

    - signing secret
    - webhook path
    - Slack Request URLs (Events + Interactivity + Slash Commands)
    - 每個 HTTP 帳號唯一的 `webhookPath`

    如果 `signingSecretStatus: "configured_unavailable"` 出現在帳號
    快照中，表示 HTTP 帳號已設定，但目前的執行環境無法
    解析 SecretRef 支援的 signing secret。

  </Accordion>

  <Accordion title="原生/斜線指令無法觸發">
    驗證您原本的意圖是：

    - 原生指令模式 (`channels.slack.commands.native: true`) 並已在 Slack 中註冊相符的斜線指令
    - 還是單一斜線指令模式 (`channels.slack.slashCommand.enabled: true`)

    另外請檢查 `commands.useAccessGroups` 和頻道/使用者 allowlists。

  </Accordion>
</AccordionGroup>

## 相關內容

- [配對](/en/channels/pairing)
- [群組](/en/channels/groups)
- [安全性](/en/gateway/security)
- [通道路由](/en/channels/channel-routing)
- [疑難排解](/en/channels/troubleshooting)
- [設定](/en/gateway/configuration)
- [斜線指令](/en/tools/slash-commands)
