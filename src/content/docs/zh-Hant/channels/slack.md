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
  <Card title="管道疑難排解" icon="wrench" href="/en/channels/troubleshooting">
    跨管道診斷與修復手冊。
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

        環境變數備援（僅限預設帳戶）：

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

        同時為私訊啟用 App Home 的 **訊息分頁 (Messages Tab)**。
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
        支援每個帳號使用 HTTP 模式。

        為每個帳號指定不同的 `webhookPath`，以免註冊發生衝突。
      </Step>
    </Steps>

  </Tab>
</Tabs>

## Manifest 與範圍檢查清單

<AccordionGroup>
  <Accordion title="Slack app manifest example" defaultOpen>

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

  </Accordion>

  <Accordion title="Optional user-token scopes (read operations)">
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

## Token 模型

- Socket Mode 需要 `botToken` + `appToken`。
- HTTP 模式需要 `botToken` + `signingSecret`。
- `botToken`、`appToken`、`signingSecret` 和 `userToken` 接受純文字字串或 SecretRef 物件。
- 設定中的 Token 會覆蓋環境變數後備值。
- `SLACK_BOT_TOKEN` / `SLACK_APP_TOKEN` 環境變數後備值僅適用於預設帳號。
- `userToken` (`xoxp-...`) 僅限配置（無環境變數後援），且預設為唯讀行為 (`userTokenReadOnly: true`)。
- 選用：如果您希望傳出訊息使用作用中的代理程式身分（自訂 `username` 和圖示），請新增 `chat:write.customize`。`icon_emoji` 使用 `:emoji_name:` 語法。

狀態快照行為：

- Slack 帳號檢查會追蹤每個憑證的 `*Source` 和 `*Status` 欄位
  (`botToken`、`appToken`、`signingSecret`、`userToken`)。
- 狀態為 `available`、`configured_unavailable` 或 `missing`。
- `configured_unavailable` 表示帳號是透過 SecretRef 或其他非內嵌祕密來源設定，但目前的指令/執行路徑
  無法解析實際值。
- 在 HTTP 模式中，包含 `signingSecretStatus`；在 Socket 模式中，
  必要的配對是 `botTokenStatus` + `appTokenStatus`。

<Tip>對於動作/目錄讀取，設定後可優先使用使用者權杖。對於寫入，Bot 權杖仍優先；僅在 `userTokenReadOnly: false` 且 Bot 權杖無法使用時，才允許使用使用者權杖寫入。</Tip>

## 動作與閘道

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
  <Tab title="DM policy">
    `channels.slack.dmPolicy` 控制存取權限（舊版：`channels.slack.dm.policy`）：

    - `pairing`（預設）
    - `allowlist`
    - `open`（要求 `channels.slack.allowFrom` 包含 `"*"`；舊版：`channels.slack.dm.allowFrom`）
    - `disabled`

    DM 旗標：

    - `dm.enabled`（預設為 true）
    - `channels.slack.allowFrom`（建議）
    - `dm.allowFrom`（舊版）
    - `dm.groupEnabled`（群組 DM 預設為 false）
    - `dm.groupChannels`（選用 MPIM 允許清單）

    多帳號優先順序：

    - `channels.slack.accounts.default.allowFrom` 僅套用於 `default` 帳號。
    - 具名帳號在其自身的 `allowFrom` 未設定時會繼承 `channels.slack.allowFrom`。
    - 具名帳號不會繼承 `channels.slack.accounts.default.allowFrom`。

    DM 中的配對使用 `openclaw pairing approve slack <code>`。

  </Tab>

  <Tab title="Channel policy">
    `channels.slack.groupPolicy` 控制頻道處理：

    - `open`
    - `allowlist`
    - `disabled`

    頻道允許清單位於 `channels.slack.channels` 之下，且應使用穩定的頻道 ID。

    執行時期備註：如果完全缺少 `channels.slack`（僅環境變數設定），執行時期會回退到 `groupPolicy="allowlist"` 並記錄警告（即使已設定 `channels.defaults.groupPolicy`）。

    名稱/ID 解析：

    - 當 Token 存取權限允許時，頻道允許清單項目和 DM 允許清單項目會在啟動時解析
    - 未解析的頻道名稱項目會保留為已設定的狀態，但預設會被路由忽略
    - 傳入的授權和頻道路由預設優先使用 ID；直接的使用者名稱/slug 比對需要 `channels.slack.dangerouslyAllowNameMatching: true`

  </Tab>

  <Tab title="提及與頻道使用者">
    頻道訊息預設由提及控制門檻。

    提及來源：

    - 明確的應用程式提及 (`<@botId>`)
    - 提及正則表示式模式 (`agents.list[].groupChat.mentionPatterns`，後備 `messages.groupChat.mentionPatterns`)
    - 隱含的回覆機器人主題行為

    每頻道控制 (`channels.slack.channels.<id>`；僅限名稱透過啟動解析或 `dangerouslyAllowNameMatching`)：

    - `requireMention`
    - `users` (允許清單)
    - `allowBots`
    - `skills`
    - `systemPrompt`
    - `tools`，`toolsBySender`
    - `toolsBySender` 金鑰格式：`id:`，`e164:`，`username:`，`name:`，或 `"*"` 萬用字元
      (舊版無前綴金鑰仍僅對應到 `id:`)

  </Tab>
</Tabs>

## 主題討論、工作階段與回覆標籤

- DM 路由為 `direct`；頻道為 `channel`；MPIM 為 `group`。
- 使用預設 `session.dmScope=main` 時，Slack DM 會折疊至代理程式主工作階段。
- 頻道工作階段：`agent:<agentId>:slack:channel:<channelId>`。
- 主題回覆可以在適用時建立主題工作階段後綴 (`:thread:<threadTs>`)。
- `channels.slack.thread.historyScope` 預設為 `thread`；`thread.inheritParent` 預設為 `false`。
- `channels.slack.thread.initialHistoryLimit` 控制當新主題工作階段開始時擷取多少現有的主題訊息 (預設 `20`；設定 `0` 以停用)。

回覆主題控制：

- `channels.slack.replyToMode`：`off|first|all|batched` (預設 `off`)
- `channels.slack.replyToModeByChatType`：每一 `direct|group|channel`
- 直接聊天的舊版後備：`channels.slack.dm.replyToMode`

支援手動回覆標籤：

- `[[reply_to_current]]`
- `[[reply_to:<id>]]`

注意：`replyToMode="off"` 會停用 Slack 中**所有**的回覆串接，包括明確的 `[[reply_to_*]]` 標籤。這與 Telegram 不同，後者在 `"off"` 模式下仍會遵守明確標籤。這種差異反映了平台的串接模型：Slack 串接會將訊息從頻道中隱藏，而 Telegram 回覆則會顯示在主要聊天流程中。

## Ack 反應

`ackReaction` 會在 OpenClaw 處理傳入訊息時發送確認表情符號。

解析順序：

- `channels.slack.accounts.<accountId>.ackReaction`
- `channels.slack.ackReaction`
- `messages.ackReaction`
- 代理身分表情符號後備 (`agents.list[].identity.emoji`，否則為 "👀")

備註：

- Slack 預期短代碼 (例如 `"eyes"`)。
- 使用 `""` 針對 Slack 帳戶或全域停用該反應。

## 文字串流

`channels.slack.streaming` 控制即時預覽行為：

- `off`：停用即時預覽串流。
- `partial` (預設)：以最新的部分輸出取代預覽文字。
- `block`：附加分塊預覽更新。
- `progress`：在生成時顯示進度狀態文字，然後發送最終文字。

當 `streaming` 為 `partial` 時，`channels.slack.nativeStreaming` 控制 Slack 原生文字串流 (預設：`true`)。

- 必須有可用的回覆串接才能顯示原生文字串流。串接選擇仍遵循 `replyToMode`。如果沒有串接，則會使用一般的草稿預覽。
- 媒體和非文字內容會回退到一般傳遞方式。
- 如果在回覆中途串流失敗，OpenClaw 會將剩餘內容回退到一般傳遞方式。

使用草稿預覽代替 Slack 原生文字串流：

```json5
{
  channels: {
    slack: {
      streaming: "partial",
      nativeStreaming: false,
    },
  },
}
```

舊版金鑰：

- `channels.slack.streamMode` (`replace | status_final | append`) 會自動遷移至 `channels.slack.streaming`。
- 布林值 `channels.slack.streaming` 會自動遷移至 `channels.slack.nativeStreaming`。

## 輸入中反應後備

`typingReaction` 會在 OpenClaw 處理回覆時，對傳入的 Slack 訊息新增一個暫時的回應，然後在執行完成時將其移除。這在執行緒回覆之外最為有用，因為執行緒回覆會使用預設的「正在輸入...」狀態指示器。

解析順序：

- `channels.slack.accounts.<accountId>.typingReaction`
- `channels.slack.typingReaction`

備註：

- Slack 預期的是 shortcodes（例如 `"hourglass_flowing_sand"`）。
- 回應是盡力而為的，並且會在回覆或失敗路徑完成後自動嘗試清理。

## 媒體、分塊與傳遞

<AccordionGroup>
  <Accordion title="Inbound attachments">
    當擷取成功且大小限制允許時，Slack 檔案附件會從 Slack 託管的私人 URL（經過權杖驗證的要求流程）下載並寫入媒體存放區。

    執行時期傳入大小上限預設為 `20MB`，除非被 `channels.slack.mediaMaxMb` 覆蓋。

  </Accordion>

<Accordion title="Outbound text and files">- 文字區塊使用 `channels.slack.textChunkLimit`（預設為 4000） - `channels.slack.chunkMode="newline"` 啟用段落優先分割 - 檔案傳送使用 Slack 上傳 API，並可包含執行緒回覆（`thread_ts`） - 若有設定，傳出媒體上限遵循 `channels.slack.mediaMaxMb`；否則頻道傳送使用媒體管線中的 MIME 類型預設值</Accordion>

  <Accordion title="Delivery targets">
    首選的明確目標：

    - `user:<id>` 用於 DM
    - `channel:<id>` 用於頻道

    當傳送至使用者目標時，Slack DM 會透過 Slack 對話 API 開啟。

  </Accordion>
</AccordionGroup>

## 指令與斜線行為

- Slack 的原生指令自動模式為「關閉」（`commands.native: "auto"` 不會啟用 Slack 原生指令）。
- 使用 `channels.slack.commands.native: true`（或全域 `commands.native: true`）啟用 Slack 原生指令處理程式。
- 當啟用原生指令時，請在 Slack 中註冊相符的斜線指令（`/<command>` 名稱），但有一個例外：
  - 為狀態指令註冊 `/agentstatus`（Slack 保留了 `/status`）
- 如果未啟用原生指令，您可以透過 `channels.slack.slashCommand` 執行單一設定的斜線指令。
- 原生參數選單現在會調整其渲染策略：
  - 最多 5 個選項：按鈕區塊
  - 6-100 個選項：靜態選擇選單
  - 超過 100 個選項：當可使用互動選項處理程序時，使用帶有非同步選項過濾的外部選擇選單
  - 如果編碼後的選項值超過 Slack 限制，流程將回退到按鈕
- 對於較長的選項負載，斜線指令參數選單會在發送選取值之前使用確認對話框。

預設斜線指令設定：

- `enabled: false`
- `name: "openclaw"`
- `sessionPrefix: "slack:slash"`
- `ephemeral: true`

Slash 會話使用獨立的金鑰：

- `agent:<agentId>:slack:slash:<userId>`

並且仍然針對目標對話會話（`CommandTargetSessionKey`）路由指令執行。

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

或者僅為一個 Slack 帳戶啟用它：

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

這些指令會編譯成 Slack Block Kit，並將點擊或選取透過現有的 Slack 互動事件路徑路由回來。

注意事項：

- 這是 Slack 專用的 UI。其他管道不會將 Slack Block Kit 指令轉換為它們自己的按鈕系統。
- 互動式回呼值是 OpenClaw 產生的不透明 token，而非原始的代理程式建立值。
- 如果產生的互動區塊會超過 Slack Block Kit 限制，OpenClaw 將回退到原始文字回覆，而不是發送無效的區塊負載。

## 在 Slack 中執行審批

Slack 可以充當具有互動式按鈕和互動的原生審批用戶端，而不是回退到 Web UI 或終端機。

- 執行審批使用 `channels.slack.execApprovals.*` 進行原生 DM/頻道路由。
- 當請求已經到達 Slack 且審批 ID 類型為 `plugin:` 時，外掛程式審批仍可透過相同的 Slack 原生按鈕介面進行解析。
- 審批者授權仍然受到強制執行：只有被識別為審批者的使用者才能透過 Slack 批准或拒絕請求。

這與其他管道使用相同的共享審批按鈕介面。當您在 Slack 應用程式設定中啟用 `interactivity` 時，審批提示會直接在對話中呈現為 Block Kit 按鈕。
當這些按鈕存在時，它們是主要的審批使用者體驗；只有當工具結果顯示聊天審批無法使用或手動審批是唯一途徑時，OpenClaw 才應包含手動 `/approve` 指令。

設定路徑：

- `channels.slack.execApprovals.enabled`
- `channels.slack.execApprovals.approvers` （可選；可能時會回退至 `commands.ownerAllowFrom`）
- `channels.slack.execApprovals.target` （`dm` | `channel` | `both`，預設值：`dm`）
- `agentFilter`、`sessionFilter`

當 `enabled` 未設定或為 `"auto"` 且至少有一位
審批者解析時，Slack 會自動啟用原生執行審批。設定 `enabled: false` 可明確停用 Slack 作為原生審批用戶端。
設定 `enabled: true` 可在審批者解析時強制啟用原生審批。

沒有明確 Slack 執行審批設定時的預設行為：

```json5
{
  commands: {
    ownerAllowFrom: ["slack:U12345678"],
  },
}
```

只有在您想要覆寫審批者、新增篩選條件，或
選擇啟用來源聊天交付時，才需要明確的 Slack 原生設定：

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

共享的 `approvals.exec` 轉發是分開的。僅當執行審批提示也必須
路由到其他聊天或明確的頻外目標時才使用它。共享的 `approvals.plugin` 轉發也是
分開的；當這些請求已經
到達 Slack 時，Slack 原生按鈕仍然可以解析外掛程式審批。

相同聊天的 `/approve` 也可以在已支援指令的 Slack 頻道和 DM 中使用。請參閱 [執行審批](/en/tools/exec-approvals) 以了解完整的審批轉發模型。

## 事件與運作行為

- 訊息編輯/刪除/執行緒廣播會對應到系統事件。
- 新增/移除反應事件會對應到系統事件。
- 成員加入/離開、頻道建立/重新命名，以及釘選新增/移除事件會對應到系統事件。
- 當啟用 `configWrites` 時，`channel_id_changed` 可以遷移頻道設定金鑰。
- 頻道主題/目的元資料會被視為不信任的上下文，並可以注入到路由上下文中。
- 執行緒起始者和初始執行緒歷史上下文播種會根據配置的發送者允許清單進行篩選（若適用）。
- 區塊動作和模態互動會發出具有豐富 Payload 欄位的結構化 `Slack interaction: ...` 系統事件：
  - 區塊動作：選定值、標籤、選擇器值和 `workflow_*` 元資料
  - 模態 `view_submission` 和 `view_closed` 事件，包含路由頻道元資料和表單輸入

## 設定參考指標

主要參考：

- [設定參考 - Slack](/en/gateway/configuration-reference#slack)

  高重要性 Slack 欄位：
  - 模式/驗證：`mode`、`botToken`、`appToken`、`signingSecret`、`webhookPath`、`accounts.*`
  - DM 存取：`dm.enabled`、`dmPolicy`、`allowFrom`（舊版：`dm.policy`、`dm.allowFrom`）、`dm.groupEnabled`、`dm.groupChannels`
  - 相容性切換：`dangerouslyAllowNameMatching`（緊急使用；除非需要否則請保持關閉）
  - 頻道存取：`groupPolicy`、`channels.*`、`channels.*.users`、`channels.*.requireMention`
  - 執行緒/歷史：`replyToMode`、`replyToModeByChatType`、`thread.*`、`historyLimit`、`dmHistoryLimit`、`dms.*.historyLimit`
  - delivery: `textChunkLimit`, `chunkMode`, `mediaMaxMb`, `streaming`, `nativeStreaming`
  - ops/features: `configWrites`, `commands.native`, `slashCommand.*`, `actions.*`, `userToken`, `userTokenReadOnly`

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
    檢查：

    - `channels.slack.dm.enabled`
    - `channels.slack.dmPolicy` (或舊版 `channels.slack.dm.policy`)
    - 配對核准 / 允許名單項目

```bash
openclaw pairing list slack
```

  </Accordion>

  <Accordion title="Socket 模式無法連線">
    在 Slack 應用程式設定中驗證 Bot + 應用程式權杖以及 Socket Mode 是否已啟用。

    如果 `openclaw channels status --probe --json` 顯示 `botTokenStatus` 或
    `appTokenStatus: "configured_unavailable"`，表示 Slack 帳號已
    設定，但目前的執行階段無法解析 SecretRef 支援的
    數值。

  </Accordion>

  <Accordion title="HTTP 模式未接收事件">
    驗證：

    - 簽章密鑰
    - webhook 路徑
    - Slack Request URLs (Events + Interactivity + Slash Commands)
    - 每個 HTTP 帳號的唯一 `webhookPath`

    如果帳號快照中出現 `signingSecretStatus: "configured_unavailable"`，表示
    HTTP 帳號已設定，但目前的執行階段無法解析 SecretRef 支援的
    簽章密鑰。

  </Accordion>

  <Accordion title="Native/slash commands not firing">
    請驗證您的意圖為：

    - 原生指令模式 (`channels.slack.commands.native: true`) 並已在 Slack 中註冊相符的斜線指令
    - 或是單一斜線指令模式 (`channels.slack.slashCommand.enabled: true`)

    同時也請檢查 `commands.useAccessGroups` 和頻道/使用者允許清單。

  </Accordion>
</AccordionGroup>

## 相關

- [配對](/en/channels/pairing)
- [群組](/en/channels/groups)
- [安全性](/en/gateway/security)
- [頻道路由](/en/channels/channel-routing)
- [疑難排解](/en/channels/troubleshooting)
- [設定](/en/gateway/configuration)
- [斜線指令](/en/tools/slash-commands)
