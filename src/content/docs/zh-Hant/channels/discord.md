---
summary: "Discord 機器人支援狀態、功能及配置"
read_when:
  - Working on Discord channel features
title: "Discord"
---

# Discord (Bot API)

狀態：已準備好透過官方 Discord Gateway 支援私訊 (DM) 和公會頻道。

<CardGroup cols={3}>
  <Card title="配對" icon="link" href="/zh-Hant/channels/pairing">
    Discord 私訊預設為配對模式。
  </Card>
  <Card title="斜線指令" icon="terminal" href="/zh-Hant/tools/slash-commands">
    原生指令行為與指令目錄。
  </Card>
  <Card title="頻道疑難排解" icon="wrench" href="/zh-Hant/channels/troubleshooting">
    跨頻道診斷與修復流程。
  </Card>
</CardGroup>

## 快速設定

您需要建立一個包含機器人的新應用程式，將機器人新增至您的伺服器，並將其與 OpenClaw 配對。我們建議將您的機器人新增至您自己的私人伺服器。如果您還沒有，請先[建立一個](https://support.discord.com/hc/en-us/articles/204849977-How-do-I-create-a-server)（選擇 **Create My Own > For me and my friends**）。

<Steps>
  <Step title="建立 Discord 應用程式和機器人">
    前往 [Discord 開發者入口網站](https://discord.com/developers/applications) 並點擊 **New Application**。將其命名為類似「OpenClaw」的名稱。

    點擊側邊欄上的 **Bot**。將 **Username** 設定為您對 OpenClaw 代理程式的稱呼。

  </Step>

  <Step title="啟用特權意圖">
    仍在 **Bot** 頁面上，向下捲動至 **Privileged Gateway Intents** 並啟用：

    - **Message Content Intent**（必填）
    - **Server Members Intent**（建議；角色允許清單和名稱至 ID 匹配所需）
    - **Presence Intent**（選填；僅需要狀態更新時需要）

  </Step>

  <Step title="複製您的機器人權杖">
    在 **Bot** 頁面上向上捲動並點擊 **Reset Token**。

    <Note>
    顧名思義，這會生成您的第一個權杖 —— 沒有任何東西被「重置」。
    </Note>

    複製權杖並將其保存在某處。這就是您的 **Bot Token**，您很快會需要用到它。

  </Step>

  <Step title="Generate an invite URL and add the bot to your server">
    在側邊欄點擊 **OAuth2**。您將生成一個擁有正確權限的邀請 URL，以便將機器人新增到您的伺服器。

    向下捲動至 **OAuth2 URL Generator** 並啟用：

    - `bot`
    - `applications.commands`

    下方會出現 **Bot Permissions** 區塊。啟用：

    - View Channels
    - Send Messages
    - Read Message History
    - Embed Links
    - Attach Files
    - Add Reactions (optional)

    複製底部生成的 URL，將其貼到瀏覽器中，選擇您的伺服器，然後點擊 **Continue** 以連線。您現在應該能在 Discord 伺服器中看到您的機器人了。

  </Step>

  <Step title="啟用開發者模式並蒐集您的 ID">
    回到 Discord 應用程式，您需要啟用開發者模式才能複製內部 ID。

    1. 點擊 **User Settings**（使用者設定，您大頭貼旁的齒輪圖示）→ **Advanced**（進階）→ 開啟 **Developer Mode**（開發者模式）
    2. 在側邊欄對您的 **server icon**（伺服器圖示）按右鍵 → **Copy Server ID**（複製伺服器 ID）
    3. 對您 **own avatar**（自己的大頭貼）按右鍵 → **Copy User ID**（複製使用者 ID）

    請將您的 **Server ID**（伺服器 ID）和 **User ID**（使用者 ID）與您的 Bot Token（機器人權杖）一起儲存——您將在下一步中把這三者都傳送給 OpenClaw。

  </Step>

  <Step title="Allow DMs from server members">
    若要進行配對，Discord 需要允許您的機器人向您傳送私訊。在 **伺服器圖示** 上按一下右鍵 → **隱私權設定** → 開啟 **直接訊息**。

    這可讓伺服器成員（包括機器人）向您傳送私訊。如果您想要透過 OpenClaw 使用 Discord 私訊，請保持此設定為啟用狀態。如果您只打算使用伺服器頻道，則可以在配對後停用私訊功能。

  </Step>

  <Step title="Step 0: Set your bot token securely (do not send it in chat)">
    您的 Discord 機器人權杖是秘密資訊（就像密碼一樣）。請在傳送訊息給您的代理程式之前，在執行 OpenClaw 的機器上進行設定。

```exec
export DISCORD_BOT_TOKEN="YOUR_BOT_TOKEN"
openclaw config set channels.discord.token --ref-provider default --ref-source env --ref-id DISCORD_BOT_TOKEN --dry-run
openclaw config set channels.discord.token --ref-provider default --ref-source env --ref-id DISCORD_BOT_TOKEN
openclaw config set channels.discord.enabled true --strict-json
openclaw gateway
```

    如果 OpenClaw 已經作為背景服務執行，請改用 `openclaw gateway restart`。

  </Step>

  <Step title="設定 OpenClaw 並配對">

    <Tabs>
      <Tab title="詢問您的 agent">
        在任何現有頻道（例如 Telegram）上與您的 OpenClaw agent 聊天並告知它。如果 Discord 是您的第一個頻道，請改用 CLI / config 分頁。

        > "我已經在 config 中設定好了我的 Discord bot token。請使用 User ID `<user_id>` 和 Server ID `<server_id>` 完成 Discord 設定。"
      </Tab>
      <Tab title="CLI / config">
        如果您偏好使用基於檔案的設定，請設定：

```json5
{
  channels: {
    discord: {
      enabled: true,
      token: {
        source: "env",
        provider: "default",
        id: "DISCORD_BOT_TOKEN",
      },
    },
  },
}
```

        預設帳戶的 Env 後備選項：

```exec
DISCORD_BOT_TOKEN=...
```

        支援純文字 `token` 值。跨 env/file/exec 提供者也支援 `channels.discord.token` 的 SecretRef 值。請參閱[機密管理](/zh-Hant/gateway/secrets)。

      </Tab>
    </Tabs>

  </Step>

  <Step title="Approve first DM pairing">
    等待閘道執行，然後在 Discord 中傳送私訊（DM）給您的機器人。它會回應一個配對代碼。

    <Tabs>
      <Tab title="Ask your agent">
        將配對代碼傳送給您現有頻道上的代理：

        > "Approve this Discord pairing code: `<CODE>`"
      </Tab>
      <Tab title="CLI">

```exec
openclaw pairing list discord
openclaw pairing approve discord <CODE>
```

      </Tab>
    </Tabs>

    配對代碼會在 1 小時後過期。

    您現在應該可以透過 Discord 私訊與您的代理聊天。

  </Step>
</Steps>

<Note>Token 解析具有帳戶感知能力。Config token 值優先於 env 後備值。`DISCORD_BOT_TOKEN` 僅用於預設帳戶。對於進階的傳出呼叫（訊息工具/頻道操作）， 該呼叫會使用明確的單次呼叫 `token`。這適用於傳送和讀取/探測風格的 操作（例如 read/search/fetch/thread/pins/permissions）。帳戶策略/重試設定 仍然來自作用中執行時快照中選取的帳戶。</Note>

## 建議：設定伺服器工作區

一旦 DM 能正常運作，您可以將您的 Discord 伺服器設定為完整的工作區，讓每個頻道都有屬於自己的代理程式會話與上下文。這建議用於只有您與您的機器人的私人伺服器。

<Steps>
  <Step title="Add your server to the guild allowlist">
    這可讓您的 Agent 在您伺服器的任何頻道中回應，而不僅限於 DM。

    <Tabs>
      <Tab title="Ask your agent">
        > 「將我的 Discord 伺服器 ID `<server_id>` 加入到 guild 允許清單中」
      </Tab>
      <Tab title="Config">

```json5
{
  channels: {
    discord: {
      groupPolicy: "allowlist",
      guilds: {
        YOUR_SERVER_ID: {
          requireMention: true,
          users: ["YOUR_USER_ID"],
        },
      },
    },
  },
}
```

      </Tab>
    </Tabs>

  </Step>

  <Step title="Allow responses without @mention">
    預設情況下，您的 Agent 只會在伺服器頻道中收到 @mention 時回應。對於私人伺服器，您可能希望它回應每則訊息。

    <Tabs>
      <Tab title="Ask your agent">
        > 「Allow my agent to respond on this server without having to be @mentioned」
      </Tab>
      <Tab title="Config">
        在您的伺服器設定中設定 `requireMention: false`：

```json5
{
  channels: {
    discord: {
      guilds: {
        YOUR_SERVER_ID: {
          requireMention: false,
        },
      },
    },
  },
}
```

      </Tab>
    </Tabs>

  </Step>

  <Step title="規劃伺服器頻道中的記憶體">
    預設情況下，長期記憶體 (MEMORY.md) 僅在 DM 聊天中載入。伺服器頻道不會自動載入 MEMORY.md。

    <Tabs>
      <Tab title="詢問您的代理程式">
        > "當我在 Discord 頻道中提問時，如果您需要來自 MEMORY.md 的長期上下文，請使用 memory_search 或 memory_get。"
      </Tab>
      <Tab title="手動">
        如果您需要在每個頻道中使用共享的上下文，請將穩定的指令放在 `AGENTS.md` 或 `USER.md` 中（它們會在每次工作階段中注入）。將長期筆記保存在 `MEMORY.md` 中，並透過記憶體工具按需存取。
      </Tab>
    </Tabs>

  </Step>
</Steps>

現在在您的 Discord 伺服器上建立一些頻道並開始聊天。您的代理程式可以看到頻道名稱，且每個頻道都有自己獨立的會話 — 因此您可以設定 `#coding`、`#home`、`#research`，或是任何適合您工作流程的配置。

## 執行時模型

- 閘道擁有 Discord 連線。
- 回覆路由是確定性的：Discord 的入站訊息會回覆到 Discord。
- 預設情況下 (`session.dmScope=main`)，直接聊天共用代理程式主會話 (`agent:main:main`)。
- 公會頻道是獨立的會話金鑰 (`agent:<agentId>:discord:channel:<channelId>`)。
- 群組私訊預設會被忽略 (`channels.discord.dm.groupEnabled=false`)。
- 原生斜線指令在獨立的指令會話中執行 (`agent:<agentId>:discord:slash:<userId>`)，同時仍將 `CommandTargetSessionKey` 帶到路由的對話會話中。

## 論壇頻道

Discord 論壇和媒體頻道僅接受貼文。OpenClaw 支援兩種建立方式：

- 傳送訊息至論壇母頻道 (`channel:<forumId>`) 以自動建立貼文。貼文標題將使用您訊息中的第一行非空文字。
- 使用 `openclaw message thread create` 直接建立貼文。請勿針對論壇頻道傳遞 `--message-id`。

範例：傳送至論壇母頻道以建立貼文

```exec
openclaw message send --channel discord --target channel:<forumId> \
  --message "Topic title\nBody of the post"
```

範例：明確建立論壇貼文

```exec
openclaw message thread create --channel discord --target channel:<forumId> \
  --thread-name "Topic title" --message "Body of the post"
```

論壇母頻道不接受 Discord 元件。如果您需要使用元件，請傳送至貼文本身 (`channel:<threadId>`)。

## 互動式元件

OpenClaw 支援針對代理程式訊息的 Discord 元件 v2 容器。請使用帶有 `components` 載荷的訊息工具。互動結果會作為一般傳入訊息路由回代理程式，並遵循現有的 Discord `replyToMode` 設定。

支援的區塊：

- `text`, `section`, `separator`, `actions`, `media-gallery`, `file`
- 動作列允許最多 5 個按鈕或單一選單
- 選取類型：`string`, `user`, `role`, `mentionable`, `channel`

預設情況下，元件為單次使用。設定 `components.reusable=true` 以允許按鈕、選單和表單在過期前被多次使用。

若要限制誰可以點擊按鈕，請在該按鈕上設定 `allowedUsers`（Discord 使用者 ID、標籤或 `*`）。配置後，不符合條件的使用者會收到一個暫時性的拒絕訊息。

`/model` 和 `/models` 斜線指令會開啟一個互動式模型選擇器，其中包含供應商和模型下拉選單以及提交步驟。選擇器的回應是暫時性的，且只有發起指令的使用者可以使用。

檔案附件：

- `file` 區塊必須指向附件參考（`attachment://<filename>`）
- 透過 `media`/`path`/`filePath` 提供附件（單個檔案）；如有多個檔案請使用 `media-gallery`
- 當上傳名稱應符合附件參考時，使用 `filename` 覆蓋上傳名稱

強制回應表單：

- 新增 `components.modal`，最多 5 個欄位
- 欄位類型：`text`、`checkbox`、`radio`、`select`、`role-select`、`user-select`
- OpenClaw 會自動新增觸發按鈕

範例：

```json5
{
  channel: "discord",
  action: "send",
  to: "channel:123456789012345678",
  message: "Optional fallback text",
  components: {
    reusable: true,
    text: "Choose a path",
    blocks: [
      {
        type: "actions",
        buttons: [
          {
            label: "Approve",
            style: "success",
            allowedUsers: ["123456789012345678"],
          },
          { label: "Decline", style: "danger" },
        ],
      },
      {
        type: "actions",
        select: {
          type: "string",
          placeholder: "Pick an option",
          options: [
            { label: "Option A", value: "a" },
            { label: "Option B", value: "b" },
          ],
        },
      },
    ],
    modal: {
      title: "Details",
      triggerLabel: "Open form",
      fields: [
        { type: "text", label: "Requester" },
        {
          type: "select",
          label: "Priority",
          options: [
            { label: "Low", value: "low" },
            { label: "High", value: "high" },
          ],
        },
      ],
    },
  },
}
```

## 存取控制與路由

<Tabs>
  <Tab title="DM policy">
    `channels.discord.dmPolicy` 控制 DM 存取權（舊版：`channels.discord.dm.policy`）：

    - `pairing`（預設）
    - `allowlist`
    - `open`（需要 `channels.discord.allowFrom` 包含 `"*"`；舊版：`channels.discord.dm.allowFrom`）
    - `disabled`

    如果 DM 政策未設定為開放，未知使用者將被封鎖（或在 `pairing` 模式下被提示配對）。

    多帳號優先順序：

    - `channels.discord.accounts.default.allowFrom` 僅適用於 `default` 帳號。
    - 具名帳號在未設定自己的 `allowFrom` 時，會繼承 `channels.discord.allowFrom`。
    - 具名帳號不會繼承 `channels.discord.accounts.default.allowFrom`。

    傳送的 DM 目標格式：

    - `user:<id>`
    - `<@id>` 提及

    除非提供明確的使用者/頻道目標類型，否則純數字 ID 具有歧義且會被拒絕。

  </Tab>

  <Tab title="Guild policy">
    公會處理由 `channels.discord.groupPolicy` 控制：

    - `open`
    - `allowlist`
    - `disabled`

    當 `channels.discord` 存在時，安全基準為 `allowlist`。

    `allowlist` 行為：

    - 公會必須符合 `channels.discord.guilds`（優先使用 `id`，接受 slug）
    - 選用性發送者許可清單：`users`（建議使用穩定 ID）和 `roles`（僅限角色 ID）；如果設定了其中一個，當發送者符合 `users` 或 `roles` 時即獲允許
    - 預設停用直接名稱/標籤匹配；僅將 `channels.discord.dangerouslyAllowNameMatching: true` 作為緊急相容性模式啟用
    - `users` 支援名稱/標籤，但 ID 更安全；使用名稱/標籤項目時 `openclaw security audit` 會發出警告
    - 如果公會設定了 `channels`，會拒絕未列出的頻道
    - 如果公會沒有 `channels` 區塊，該許可清單公會中的所有頻道都會被允許

    範例：

```json5
{
  channels: {
    discord: {
      groupPolicy: "allowlist",
      guilds: {
        "123456789012345678": {
          requireMention: true,
          ignoreOtherMentions: true,
          users: ["987654321098765432"],
          roles: ["123456789012345678"],
          channels: {
            general: { allow: true },
            help: { allow: true, requireMention: true },
          },
        },
      },
    },
  },
}
```

    如果您只設定 `DISCORD_BOT_TOKEN` 而未建立 `channels.discord` 區塊，即使 `channels.defaults.groupPolicy` 是 `open`，執行時期回退為 `groupPolicy="allowlist"`（日誌中會顯示警告）。

  </Tab>

  <Tab title="提及與群組 DM">
    公訊息預設受提及限制。

    提及偵測包括：

    - 明確的機器人提及
    - 已設定的提及模式 (`agents.list[].groupChat.mentionPatterns`，後備 `messages.groupChat.mentionPatterns`)
    - 支援情況下的隱含回覆機器人行為

    `requireMention` 是依據公會/頻道 (`channels.discord.guilds...`) 設定的。
    `ignoreOtherMentions` 可選地捨棄提及其他使用者/角色但未提及機器人的訊息（排除 @everyone/@here）。

    群組 DM：

    - 預設：忽略 (`dm.groupEnabled=false`)
    - 透過 `dm.groupChannels` 的可選允許清單（頻道 ID 或 slug）

  </Tab>
</Tabs>

### 基於角色的代理程式路由

使用 `bindings[].match.roles` 根據角色 ID 將 Discord 公會成員路由到不同的代理程式。基於角色的綁定僅接受角色 ID，並在對等或父對等綁定之後、以及僅限公會的綁定之前進行評估。如果綁定也設定了其他比對欄位（例如 `peer` + `guildId` + `roles`），則所有已設定的欄位都必須符合。

```json5
{
  bindings: [
    {
      agentId: "opus",
      match: {
        channel: "discord",
        guildId: "123456789012345678",
        roles: ["111111111111111111"],
      },
    },
    {
      agentId: "sonnet",
      match: {
        channel: "discord",
        guildId: "123456789012345678",
      },
    },
  ],
}
```

## 開發者入口網站設定

<AccordionGroup>
  <Accordion title="建立應用程式和機器人">

    1. Discord Developer Portal -> **Applications** -> **New Application**
    2. **Bot** -> **Add Bot**
    3. Copy bot token

  </Accordion>

  <Accordion title="Privileged intents">
    在 **Bot -> Privileged Gateway Intents** 中，啟用：

    - Message Content Intent
    - Server Members Intent (建議)

    Presence intent 是可選的，只有在您想要接收狀態更新時才需要。設定機器人狀態 (`setPresence`) 不需要為成員啟用狀態更新。

  </Accordion>

  <Accordion title="OAuth scopes and baseline permissions">
    OAuth URL 產生器：

    - scopes: `bot`, `applications.commands`

    典型的基準權限：

    - View Channels
    - Send Messages
    - Read Message History
    - Embed Links
    - Attach Files
    - Add Reactions (可選)

    除非明確需要，否則請避免使用 `Administrator`。

  </Accordion>

  <Accordion title="複製 ID">
    啟用 Discord 開發者模式，然後複製：

    - 伺服器 ID
    - 頻道 ID
    - 使用者 ID

    為了可靠的稽核與探測，建議在 OpenClaw 設定中優先使用數值 ID。

  </Accordion>
</AccordionGroup>

## 原生指令與指令驗證

- `commands.native` 預設為 `"auto"`，且已針對 Discord 啟用。
- 各頻道覆寫設定：`channels.discord.commands.native`。
- `commands.native=false` 會明確清除先前註冊的 Discord 原生指令。
- 原生指令驗證使用與一般訊息處理相同的 Discord 允許清單/原則。
- 未經授權的使用者仍可能在 Discord 介面中看到指令；執行時仍會強制執行 OpenClaw 授權並傳回「未授權」。

請參閱 [斜線指令](/zh-Hant/tools/slash-commands) 以了解指令目錄與行為。

預設斜線指令設定：

- `ephemeral: true`

## 功能詳情

<AccordionGroup>
  <Accordion title="Reply tags and native replies">
    Discord 支援 Agent 輸出中的回覆標籤：

    - `[[reply_to_current]]`
    - `[[reply_to:<id>]]`

    由 `channels.discord.replyToMode` 控制：

    - `off` (預設)
    - `first`
    - `all`

    注意：`off` 會停用隱含的回覆串接。明確的 `[[reply_to_*]]` 標籤仍會被遵守。

    訊息 ID 會顯示在內容/歷史記錄中，以便 Agent 鎖定特定訊息。

  </Accordion>

  <Accordion title="即時串流預覽">
    OpenClaw 可以透過傳送暫時訊息並在文字到達時編輯它，來串流草稿回覆。

    - `channels.discord.streaming` 控制預覽串流（`off` | `partial` | `block` | `progress`，預設值：`off`）。
    - `progress` 為了跨頻道一致性而被接受，並且在 Discord 上對應到 `partial`。
    - `channels.discord.streamMode` 是舊版別名，會自動遷移。
    - `partial` 會在 token 到達時編輯單一預覽訊息。
    - `block` 會發出草稿大小的區塊（使用 `draftChunk` 來調整大小和斷點）。

    範例：

```json5
{
  channels: {
    discord: {
      streaming: "partial",
    },
  },
}
```

    `block` 模式區塊分割預設值（限制為 `channels.discord.textChunkLimit`）：

```json5
{
  channels: {
    discord: {
      streaming: "block",
      draftChunk: {
        minChars: 200,
        maxChars: 800,
        breakPreference: "paragraph",
      },
    },
  },
}
```

    預覽串流僅限文字；媒體回覆會回退為正常傳遞。

    注意：預覽串流與區塊串流是分開的。當針對 Discord 明確啟用區塊串流時，OpenClaw 會跳過預覽串流以避免重複串流。

  </Accordion>

  <Accordion title="歷史、語境和執行緒行為">
    Guild 歷史語境：

    - `channels.discord.historyLimit` default `20`
    - fallback: `messages.groupChat.historyLimit`
    - `0` disables

    DM 歷史控制：

    - `channels.discord.dmHistoryLimit`
    - `channels.discord.dms["<user_id>"].historyLimit`

    執行緒行為：

    - Discord 執行緒被作為頻道會話進行路由
    - 父執行緒元資料可用於父會話連結
    - 執行緒設定繼承父頻道設定，除非存在特定於執行緒的條目

    頻道主題會作為**不受信任**的語境注入（而非系統提示詞）。

  </Accordion>

  <Accordion title="子代理的執行緒繫結會話">
    Discord 可以將執行緒繫結至會話目標，使得該執行緒中的後續訊息持續路由至同一個會話（包括子代理會話）。

    指令：

    - `/focus <target>` 將目前/新的執行緒繫結至子代理/會話目標
    - `/unfocus` 移除目前執行緒的繫結
    - `/agents` 顯示活躍的執行和繫結狀態
    - `/session idle <duration|off>` 檢查/更新聚焦繫結的非活動自動取消聚焦設定
    - `/session max-age <duration|off>` 檢查/更新聚焦繫結的硬性最大壽命

    設定：

```json5
{
  session: {
    threadBindings: {
      enabled: true,
      idleHours: 24,
      maxAgeHours: 0,
    },
  },
  channels: {
    discord: {
      threadBindings: {
        enabled: true,
        idleHours: 24,
        maxAgeHours: 0,
        spawnSubagentSessions: false, // opt-in
      },
    },
  },
}
```

    說明：

    - `session.threadBindings.*` 設定全域預設值。
    - `channels.discord.threadBindings.*` 覆寫 Discord 的行為。
    - `spawnSubagentSessions` 必須為 true 才能為 `sessions_spawn({ thread: true })` 自動建立/繫結執行緒。
    - `spawnAcpSessions` 必須為 true 才能為 ACP（`/acp spawn ... --thread ...` 或 `sessions_spawn({ runtime: "acp", thread: true })`）自動建立/繫結執行緒。
    - 如果帳戶停用了執行緒繫結，`/focus` 及相關的執行緒繫結操作將無法使用。

    請參閱[子代理](/zh-Hant/tools/subagents)、[ACP 代理](/zh-Hant/tools/acp-agents)和[設定參考](/zh-Hant/gateway/configuration-reference)。

  </Accordion>

  <Accordion title="持續性 ACP 頻道綁定">
    對於穩定的「永遠在線」ACP 工作區，請設定針對 Discord 對話的頂層類型化 ACP 綁定。

    設定路徑：

    - `bindings[]` 與 `type: "acp"` 和 `match.channel: "discord"`

    範例：

```json5
{
  agents: {
    list: [
      {
        id: "codex",
        runtime: {
          type: "acp",
          acp: {
            agent: "codex",
            backend: "acpx",
            mode: "persistent",
            cwd: "/workspace/openclaw",
          },
        },
      },
    ],
  },
  bindings: [
    {
      type: "acp",
      agentId: "codex",
      match: {
        channel: "discord",
        accountId: "default",
        peer: { kind: "channel", id: "222222222222222222" },
      },
      acp: { label: "codex-main" },
    },
  ],
  channels: {
    discord: {
      guilds: {
        "111111111111111111": {
          channels: {
            "222222222222222222": {
              requireMention: false,
            },
          },
        },
      },
    },
  },
}
```

    備註：

    - 討論串訊息可以繼承上層頻道的 ACP 綁定。
    - 在已綁定的頻道或討論串中，`/new` 和 `/reset` 會在原地重設相同的 ACP 會話。
    - 暫時的討論串綁定仍然有效，並且在作用中時可以覆寫目標解析。

    參閱 [ACP Agents](/zh-Hant/tools/acp-agents) 以了解綁定行為的詳細資訊。

  </Accordion>

  <Accordion title="Reaction notifications">
    每個公會的回應通知模式：

    - `off`
    - `own` （預設）
    - `all`
    - `allowlist` （使用 `guilds.<id>.users`）

    回應事件會被轉換為系統事件，並附加到路由的 Discord 會話中。

  </Accordion>

  <Accordion title="Ack reactions">
    當 OpenClaw 正在處理傳入訊息時，`ackReaction` 會發送確認表情符號。

    解析順序：

    - `channels.discord.accounts.<accountId>.ackReaction`
    - `channels.discord.ackReaction`
    - `messages.ackReaction`
    - Agent 身份表情符號備選（`agents.list[].identity.emoji`，否則為 "👀"）

    備註：

    - Discord 接受 Unicode 表情符號或自訂表情符號名稱。
    - 使用 `""` 來停用特定頻道或帳號的表情反應。

  </Accordion>

  <Accordion title="Config writes">
    預設已啟用頻道發起的設定寫入。

    這會影響 `/config set|unset` 流程（當啟用指令功能時）。

    停用方法：

```json5
{
  channels: {
    discord: {
      configWrites: false,
    },
  },
}
```

  </Accordion>

  <Accordion title="Gateway proxy">
    透過 HTTP(S) 代理伺服器使用 `channels.discord.proxy` 路由 Discord gateway WebSocket 流量和啟動時 REST 查詢（應用程式 ID + 允許清單解析）。

```json5
{
  channels: {
    discord: {
      proxy: "http://proxy.example:8080",
    },
  },
}
```

    逐帳號覆寫：

```json5
{
  channels: {
    discord: {
      accounts: {
        primary: {
          proxy: "http://proxy.example:8080",
        },
      },
    },
  },
}
```

  </Accordion>

  <Accordion title="PluralKit 支援">
    啟用 PluralKit 解析以將代理訊息對應至系統成員身分：

```json5
{
  channels: {
    discord: {
      pluralkit: {
        enabled: true,
        token: "pk_live_...", // optional; needed for private systems
      },
    },
  },
}
```

    註事：

    - allowlists 可以使用 `pk:<memberId>`
    - 只有在 `channels.discord.dangerouslyAllowNameMatching: true` 時，才會根據 name/slug 比對成員顯示名稱
    - 查詢會使用原始訊息 ID 並受限於時間視窗
    - 如果查詢失敗，除非 `allowBots=true`，否則代理訊息會被視為機器人訊息並被丟棄

  </Accordion>

  <Accordion title="Presence 配置">
    當您設定狀態或活動欄位，或是啟用自動狀態時，會套用 Presence 更新。

    僅設定狀態的範例：

```json5
{
  channels: {
    discord: {
      status: "idle",
    },
  },
}
```

    活動範例（自訂狀態是預設的活動類型）：

```json5
{
  channels: {
    discord: {
      activity: "Focus time",
      activityType: 4,
    },
  },
}
```

    串流範例：

```json5
{
  channels: {
    discord: {
      activity: "Live coding",
      activityType: 1,
      activityUrl: "https://twitch.tv/openclaw",
    },
  },
}
```

    活動類型對應：

    - 0: 正在遊玩
    - 1: 正在串流（需要 `activityUrl`）
    - 2: 正在聆聽
    - 3: 正在觀看
    - 4: 自訂（將活動文字作為狀態；emoji 為選用）
    - 5: 正在競爭

    自動狀態範例（執行時間健康訊號）：

```json5
{
  channels: {
    discord: {
      autoPresence: {
        enabled: true,
        intervalMs: 30000,
        minUpdateIntervalMs: 15000,
        exhaustedText: "token exhausted",
      },
    },
  },
}
```

    自動狀態會將執行時間可用性對應到 Discord 狀態：healthy => online, degraded or unknown => idle, exhausted or unavailable => dnd。選用的文字覆寫：

    - `autoPresence.healthyText`
    - `autoPresence.degradedText`
    - `autoPresence.exhaustedText` (支援 `{reason}` 預留位置)

  </Accordion>

  <Accordion title="Discord 中的執行審批">
    Discord 支援在 DM 中使用基於按鈕的執行審批，並可選擇在原始頻道中發佈審批提示。

    配置路徑：

    - `channels.discord.execApprovals.enabled`
    - `channels.discord.execApprovals.approvers`
    - `channels.discord.execApprovals.target` (`dm` | `channel` | `both`，預設：`dm`)
    - `agentFilter`、`sessionFilter`、`cleanupAfterResolve`

    當 `target` 為 `channel` 或 `both` 時，審批提示在頻道中可見。僅已配置的審批者可以使用這些按鈕；其他使用者會收到暫時性的拒絕回應。審批提示包含指令文字，因此僅在受信任的頻道中啟用頻道傳遞。如果無法從 session key 推導出頻道 ID，OpenClaw 將回退到 DM 傳遞。

    此處理程式的 Gateway 驗證使用與其他 Gateway 用戶端相同的共用憑證解析協定：

    - env 優先的本地驗證 (`OPENCLAW_GATEWAY_TOKEN` / `OPENCLAW_GATEWAY_PASSWORD` 然後 `gateway.auth.*`)
    - 在本地模式中，僅當 `gateway.auth.*` 未設定時，`gateway.remote.*` 才能用作備選；已配置但未解析的本地 SecretRefs 將失敗關閉
    - 適用時透過 `gateway.remote.*` 支援遠端模式
    - URL 覆寫具有覆寫安全性：CLI 覆寫不會重複使用隱式憑證，而 env 覆寫僅使用 env 憑證

    如果審批因未知的審批 ID 而失敗，請檢查審批者清單和功能啟用狀態。

    相關文件：[執行審批](/zh-Hant/tools/exec-approvals)

  </Accordion>
</AccordionGroup>

## 工具和動作閘門

Discord 訊息動作包括訊息傳送、頻道管理、內容審核、狀態顯示和元數據動作。

核心範例：

- 訊息傳送： `sendMessage`、 `readMessages`、 `editMessage`、 `deleteMessage`、 `threadReply`
- 反應： `react`、 `reactions`、 `emojiList`
- 內容審核： `timeout`、 `kick`、 `ban`
- 狀態顯示： `setPresence`

動作閘門位於 `channels.discord.actions.*` 之下。

預設閘門行為：

| 動作群組                                                                                                                                                                 | 預設   |
| ------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ------ |
| reactions, messages, threads, pins, polls, search, memberInfo, roleInfo, channelInfo, channels, voiceStatus, events, stickers, emojiUploads, stickerUploads, permissions | 已啟用 |
| roles                                                                                                                                                                    | 已停用 |
| moderation                                                                                                                                                               | 已停用 |
| presence                                                                                                                                                                 | 已停用 |

## 組件 v2 UI

OpenClaw 針對執行核准和跨上下文標記使用 Discord 組件 v2。Discord 訊息動作也可以接受 `components` 以使用自訂 UI（進階；需要 Carbon 組件實例），而舊版的 `embeds` 仍然可用，但不建議使用。

- `channels.discord.ui.components.accentColor` 設定 Discord 組件容器使用的強調顏色（十六進位）。
- 使用 `channels.discord.accounts.<id>.ui.components.accentColor` 為每個帳戶設定。
- 當存在組件 v2 時，`embeds` 會被忽略。

範例：

```json5
{
  channels: {
    discord: {
      ui: {
        components: {
          accentColor: "#5865F2",
        },
      },
    },
  },
}
```

## 語音頻道

OpenClaw 可以加入 Discord 語音頻道以進行即時、連續的對話。這與語音訊息附件是分開的。

需求：

- 啟用原生指令（`commands.native` 或 `channels.discord.commands.native`）。
- 設定 `channels.discord.voice`。
- 機器人在目標語音頻道中需要 Connect + Speak 權限。

使用 Discord 專有的原生指令 `/vc join|leave|status` 來控制工作階段。該指令使用帳號預設代理程式，並遵循與其他 Discord 指令相同的允許清單和群組原則規則。

自動加入範例：

```json5
{
  channels: {
    discord: {
      voice: {
        enabled: true,
        autoJoin: [
          {
            guildId: "123456789012345678",
            channelId: "234567890123456789",
          },
        ],
        daveEncryption: true,
        decryptionFailureTolerance: 24,
        tts: {
          provider: "openai",
          openai: { voice: "alloy" },
        },
      },
    },
  },
}
```

備註：

- `voice.tts` 會覆寫 `messages.tts`，僅用於語音播放。
- 語音轉錄輪次從 Discord `allowFrom` （或 `dm.allowFrom` ）衍生擁有者狀態；非擁有者說話者無法存取僅限擁有者的工具（例如 `gateway` 和 `cron` ）。
- 語音功能預設為啟用；設定 `channels.discord.voice.enabled=false` 以停用它。
- `voice.daveEncryption` 和 `voice.decryptionFailureTolerance` 會傳遞至 `@discordjs/voice` 加入選項。
- 若未設定，`@discordjs/voice` 預設值為 `daveEncryption=true` 和 `decryptionFailureTolerance=24`。
- OpenClaw 也會監視接收解密失敗，並在短時間內連續失敗後，透過離開並重新加入語音頻道來自動恢復。
- 如果接收日誌反覆顯示 `DecryptionFailed(UnencryptedWhenPassthroughDisabled)`，這可能是上游 `@discordjs/voice` 接收錯誤，該錯誤在 [discord.js #11419](https://github.com/discordjs/discord.js/issues/11419) 中進行了追蹤。

## 語音訊息

Discord 語音訊息會顯示波形預覽，並且需要 OGG/Opus 音訊加上元數據。OpenClaw 會自動生成波形，但它需要在 gateway 主機上安�有 `ffmpeg` 和 `ffprobe`，以便檢查和轉換音訊檔案。

需求和限制：

- 提供**本地檔案路徑**（不接受 URL）。
- 省略文字內容（Discord 不允許在同一個 payload 中同時包含文字和語音訊息）。
- 接受任何音訊格式；OpenClaw 會在需要時轉換為 OGG/Opus。

範例：

```exec
message(action="send", channel="discord", target="channel:123", path="/path/to/audio.mp3", asVoice=true)
```

## 疑難排解

<AccordionGroup>
  <Accordion title="使用了不允許的 Intent 或 Bot 看不到伺服器訊息">

    - 啟用訊息內容 Intent (Message Content Intent)
    - 當您依賴使用者/成員解析時，啟用伺服器成員 Intent (Server Members Intent)
    - 變更 Intent 後重新啟動 Gateway

  </Accordion>

  <Accordion title="伺服器訊息意外遭到封鎖">

    - 驗證 `groupPolicy`
    - 驗證 `channels.discord.guilds` 下的伺服器允許清單
    - 如果伺服器 `channels` 映射存在，則僅允許列出的頻道
    - 驗證 `requireMention` 行為和提及模式

    有用的檢查方式：

```exec
openclaw doctor
openclaw channels status --probe
openclaw logs --follow
```

  </Accordion>

  <Accordion title="Require mention false but still blocked">
    常見原因：

    - `groupPolicy="allowlist"` 沒有匹配的伺服器/頻道允許清單
    - `requireMention` 配置位置錯誤（必須在 `channels.discord.guilds` 或頻道條目下）
    - 發送者被伺服器/頻道 `users` 允許清單阻擋

  </Accordion>

  <Accordion title="Long-running handlers time out or duplicate replies">

    典型日誌：

    - `Listener DiscordMessageListener timed out after 30000ms for event MESSAGE_CREATE`
    - `Slow listener detected ...`
    - `discord inbound worker timed out after ...`

    監聽器預算控制旋鈕：

    - 單一帳戶： `channels.discord.eventQueue.listenerTimeout`
    - 多重帳戶： `channels.discord.accounts.<accountId>.eventQueue.listenerTimeout`

    Worker 執行逾時控制旋鈕：

    - 單一帳戶： `channels.discord.inboundWorker.runTimeoutMs`
    - 多重帳戶： `channels.discord.accounts.<accountId>.inboundWorker.runTimeoutMs`
    - 預設值： `1800000` (30 分鐘)；設定 `0` 以停用

    建議基準設定：

```json5
{
  channels: {
    discord: {
      accounts: {
        default: {
          eventQueue: {
            listenerTimeout: 120000,
          },
          inboundWorker: {
            runTimeoutMs: 1800000,
          },
        },
      },
    },
  },
}
```

    請針對緩慢的監聽器設定使用 `eventQueue.listenerTimeout`，並且僅在您希望為佇列中的 Agent 輪次設定獨立的安全閥時使用 `inboundWorker.runTimeoutMs`。

  </Accordion>

  <Accordion title="權限稽核不符">
    `channels status --probe` 權限檢查僅適用於數值頻道 ID。

    如果您使用 slug 鍵，執行時期比對仍然可以運作，但 probe 無法完全驗證權限。

  </Accordion>

  <Accordion title="DM 和配對問題">

    - DM 已停用：`channels.discord.dm.enabled=false`
    - DM 原則已停用：`channels.discord.dmPolicy="disabled"` (舊版：`channels.discord.dm.policy`)
    - 在 `pairing` 模式中等待配對批准

  </Accordion>

  <Accordion title="Bot to bot loops">
    預設會忽略機器人發送的訊息。

    如果您設定 `channels.discord.allowBots=true`，請使用嚴格提及與允許清單規則以避免迴圈行為。
    建議使用 `channels.discord.allowBots="mentions"` 以僅接受提及該機器人的機器人訊息。

  </Accordion>

  <Accordion title="Voice STT drops with DecryptionFailed(...)">

    - 保持 OpenClaw 為最新版本 (`openclaw update`)，以確保存在 Discord 語音接收恢復邏輯
    - 確認 `channels.discord.voice.daveEncryption=true`（預設值）
    - 從 `channels.discord.voice.decryptionFailureTolerance=24`（上游預設值）開始，僅在需要時進行調整
    - 監控日誌中的以下內容：
      - `discord voice: DAVE decrypt failures detected`
      - `discord voice: repeated decrypt failures; attempting rejoin`
    - 如果在自動重新加入後仍然出現故障，請收集日誌並與 [discord.js #11419](https://github.com/discordjs/discord.js/issues/11419) 進行比對

  </Accordion>
</AccordionGroup>

## 配置參考指標

主要參考：

- [Configuration reference - Discord](/zh-Hant/gateway/configuration-reference#discord)

高重要性 Discord 欄位：

- startup/auth: `enabled`, `token`, `accounts.*`, `allowBots`
- policy: `groupPolicy`, `dm.*`, `guilds.*`, `guilds.*.channels.*`
- command: `commands.native`, `commands.useAccessGroups`, `configWrites`, `slashCommand.*`
- event queue: `eventQueue.listenerTimeout` (listener budget), `eventQueue.maxQueueSize`, `eventQueue.maxConcurrency`
- inbound worker: `inboundWorker.runTimeoutMs`
- reply/history: `replyToMode`, `historyLimit`, `dmHistoryLimit`, `dms.*.historyLimit`
- delivery: `textChunkLimit`, `chunkMode`, `maxLinesPerMessage`
- streaming: `streaming` (legacy alias: `streamMode`), `draftChunk`, `blockStreaming`, `blockStreamingCoalesce`
- media/retry: `mediaMaxMb`, `retry`
  - `mediaMaxMb` 限制傳出 Discord 上傳（預設：`8MB`）
- actions: `actions.*`
- presence: `activity`, `status`, `activityType`, `activityUrl`
- UI: `ui.components.accentColor`
- 功能：`threadBindings`、頂層 `bindings[]` (`type: "acp"`)、`pluralkit`、`execApprovals`、`intents`、`agentComponents`、`heartbeat`、`responsePrefix`

## 安全性與操作

- 請將 bot 權杖視為機密資訊（在受控環境中建議優先使用 `DISCORD_BOT_TOKEN`）。
- 授予最小權限的 Discord 權限。
- 如果指令部署/狀態過時，請重新啟動 gateway 並使用 `openclaw channels status --probe` 重新檢查。

## 相關

- [配對](/zh-Hant/channels/pairing)
- [通道路由](/zh-Hant/channels/channel-routing)
- [多代理路由](/zh-Hant/concepts/multi-agent)
- [故障排除](/zh-Hant/channels/troubleshooting)
- [斜線指令](/zh-Hant/tools/slash-commands)
