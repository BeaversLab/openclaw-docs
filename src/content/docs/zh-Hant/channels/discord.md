---
summary: "Discord 機器人支援狀態、功能和設定"
read_when:
  - Working on Discord channel features
title: "Discord"
---

# Discord (Bot API)

狀態：已準備好透過官方 Discord 閘道處理私訊和公會頻道。

<CardGroup cols={3}>
  <Card title="配對" icon="link" href="/en/channels/pairing">
    Discord 私訊預設為配對模式。
  </Card>
  <Card title="斜線指令" icon="terminal" href="/en/tools/slash-commands">
    原生指令行為和指令目錄。
  </Card>
  <Card title="頻道疑難排解" icon="wrench" href="/en/channels/troubleshooting">
    跨頻道診斷和修復流程。
  </Card>
</CardGroup>

## 快速設定

您將需要建立一個帶有機器人的新應用程式，將機器人新增到您的伺服器，並將其與 OpenClaw 配對。我們建議將您的機器人新增到您自己的私人伺服器。如果您還沒有，請先[建立一個](https://support.discord.com/hc/en-us/articles/204849977-How-do-I-create-a-server)（選擇 **Create My Own > For me and my friends**）。

<Steps>
  <Step title="建立 Discord 應用程式和機器人">
    前往 [Discord 開發者入口網站](https://discord.com/developers/applications) 並點擊 **New Application**。將其命名為類似 "OpenClaw" 的名稱。

    點擊側邊欄上的 **Bot**。將 **Username** 設定為您對 OpenClaw 代理程式的稱呼。

  </Step>

  <Step title="啟用特殊權限意圖">
    仍在 **Bot** 頁面上，向下捲動至 **Privileged Gateway Intents** 並啟用：

    - **Message Content Intent**（必要）
    - **Server Members Intent**（建議；角色白名單和名稱到 ID 匹配所需）
    - **Presence Intent**（可選；僅在需要狀態更新時需要）

  </Step>

  <Step title="複製您的機器人權杖">
    在 **Bot** 頁面上向上捲動並點擊 **Reset Token**。

    <Note>
    顧名思義，這會產生您的第一個權杖——沒有任何東西被「重置」。
    </Note>

    複製權杖並將其保存在某處。這是您的 **Bot Token**，稍後您將會用到它。

  </Step>

  <Step title="生成邀請 URL 並將 Bot 加入至您的伺服器">
    點擊側邊欄上的 **OAuth2**。您將生成一個具有適當權限的邀請 URL，以便將 Bot 加入至您的伺服器。

    向下捲動至 **OAuth2 URL Generator** 並啟用：

    - `bot`
    - `applications.commands`

    下方會出現一個 **Bot Permissions** 區塊。啟用：

    - View Channels
    - Send Messages
    - Read Message History
    - Embed Links
    - Attach Files
    - Add Reactions (選用)

    複製底部生成的 URL，將其貼上至您的瀏覽器中，選擇您的伺服器，然後點擊 **Continue** 以進行連線。您現在應該可以在 Discord 伺服器中看到您的 Bot。

  </Step>

  <Step title="啟用開發者模式並收集您的 ID">
    回到 Discord 應用程式，您需要啟用開發者模式，以便複製內部 ID。

    1. 點擊 **User Settings** (您大頭貼旁的齒輪圖示) → **Advanced** → 開啟 **Developer Mode**
    2. 在側邊欄中對您的 **伺服器圖示** 點擊右鍵 → **Copy Server ID**
    3. 對 **您自己的大頭貼** 點擊右鍵 → **Copy User ID**

    將您的 **Server ID** 和 **User ID** 與您的 Bot Token 一起保存好 — 您將在下一步中把這三個都傳送給 OpenClaw。

  </Step>

  <Step title="允許來自成員的私人訊息">
    為了讓配對能夠運作，Discord 需要允許您的 Bot 傳送私人訊息給您。對您的 **伺服器圖示** 點擊右鍵 → **Privacy Settings** → 開啟 **Direct Messages**。

    這讓伺服器成員 (包括 Bot) 可以傳送私人訊息給您。如果您想透過 OpenClaw 使用 Discord 私人訊息，請保持此設定為啟用狀態。如果您只計畫使用公會頻道，您可以在配對完成後停用私人訊息。

  </Step>

  <Step title="安全設定您的 Bot Token (請勿在聊天中傳送)">
    您的 Discord Bot Token 是一個機密 (就像密碼一樣)。在傳送訊息給您的代理程式之前，請先在執行 OpenClaw 的機器上設定它。

```bash
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
      <Tab title="詢問您的代理程式">
        在任何現有頻道（例如 Telegram）上與您的 OpenClaw 代理程式交談並告訴它。如果 Discord 是您的第一個頻道，請改用 CLI / config 分頁。

        > "我已經在設定中設定了我的 Discord 機器人權杖。請使用 User ID `<user_id>` 和 Server ID `<server_id>` 完成 Discord 設定。"
      </Tab>
      <Tab title="CLI / config">
        如果您偏好基於檔案的設定，請設定：

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

        預設帳戶的 Env 後備：

```bash
DISCORD_BOT_TOKEN=...
```

        支援純文字 `token` 值。跨 env/file/exec 提供者也支援 `channels.discord.token` 的 SecretRef 值。請參閱[機密管理](/en/gateway/secrets)。

      </Tab>
    </Tabs>

  </Step>

  <Step title="批准首次 DM 配對">
    等到閘道運行後，在 Discord 中私訊您的機器人。它會回覆配對碼。

    <Tabs>
      <Tab title="詢問您的代理程式">
        將配對碼傳送給您現有頻道上的代理程式：

        > "批准此 Discord 配對碼： `<CODE>`"
      </Tab>
      <Tab title="CLI">

```bash
openclaw pairing list discord
openclaw pairing approve discord <CODE>
```

      </Tab>
    </Tabs>

    配對碼會在 1 小時後過期。

    您現在應該可以透過 DM 在 Discord 中與您的代理程式交談。

  </Step>
</Steps>

<Note>權杖解析具有帳戶感知功能。設定權杖值優先於 env 後備。`DISCORD_BOT_TOKEN` 僅用於預設帳戶。對於進階輸出呼叫（訊息工具/頻道動作），該次呼叫會使用明確的單次呼叫 `token`。這適用於傳送和讀取/探測樣式的動作（例如 read/search/fetch/thread/pins/permissions）。帳戶原則/重試設定仍來自 活躍執行時快照中所選的帳戶。</Note>

## 建議：設定伺服器工作區

一旦私訊（DM）運作正常，您可以將您的 Discord 伺服器設定為完整的工作區，讓每個頻道都擁有自己的代理程式工作階段與上下文。這建議用於僅包含您與您的機器人的私人伺服器。

<Steps>
  <Step title="將您的伺服器新增到群組允許列表">
    這會讓您的代理程式能夠在您伺服器上的任何頻道中回應，而不僅限於私訊（DM）。

    <Tabs>
      <Tab title="詢問您的代理程式">
        > "將我的 Discord 伺服器 ID `<server_id>` 新增至群組允許列表"
      </Tab>
      <Tab title="設定">

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

  <Step title="允許在無 @提及 的情況下回應">
    預設情況下，您的代理程式只有在被 @提及 時才會在群組頻道中回應。對於私人伺服器，您可能會希望它回應每一則訊息。

    <Tabs>
      <Tab title="詢問您的代理程式">
        > "允許我的代理程式在此伺服器上回應，而無需被 @提及"
      </Tab>
      <Tab title="設定">
        在您的群組設定中設定 `requireMention: false`：

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

  <Step title="規劃群組頻道中的記憶體">
    預設情況下，長期記憶體（MEMORY.md）僅會在私訊工作階段中載入。群組頻道不會自動載入 MEMORY.md。

    <Tabs>
      <Tab title="詢問您的代理程式">
        > "當我在 Discord 頻道中提問時，如果您需要來自 MEMORY.md 的長期上下文，請使用 memory_search 或 memory_get。"
      </Tab>
      <Tab title="手動">
        如果您需要在每個頻道中使用共享上下文，請將穩定的指令放在 `AGENTS.md` 或 `USER.md` 中（它們會在每個工作階段中注入）。將長期筆記保留在 `MEMORY.md` 中，並使用記憶體工具按需存取。
      </Tab>
    </Tabs>

  </Step>
</Steps>

現在在您的 Discord 伺服器上建立一些頻道並開始聊天。您的代理程式可以看到頻道名稱，並且每個頻道都有自己的獨立會話——因此您可以設定 `#coding`、`#home`、`#research` 或任何適合您工作流程的內容。

## 執行時模型

- Gateway 擁有 Discord 連線。
- 回覆路由是確定性的：Discord 的 inbound 回覆會回傳給 Discord。
- 根據預設 (`session.dmScope=main`)，直接聊天共享代理程式主會話 (`agent:main:main`)。
- 公會頻道是獨立的會話金鑰 (`agent:<agentId>:discord:channel:<channelId>`)。
- 群組 DM 根據預設會被忽略 (`channels.discord.dm.groupEnabled=false`)。
- 原生斜線指令在獨立的指令會話 (`agent:<agentId>:discord:slash:<userId>`) 中執行，同時仍將 `CommandTargetSessionKey` 傳送到路由的對話會話。

## 論壇頻道

Discord 論壇和媒體頻道僅接受討論串貼文。OpenClaw 支援兩種建立方式：

- 傳送訊息到論壇父頻道 (`channel:<forumId>`) 以自動建立討論串。討論串標題使用您訊息的第一行非空白行。
- 使用 `openclaw message thread create` 直接建立討論串。請勿傳遞 `--message-id` 給論壇頻道。

範例：傳送到論壇父頻道以建立討論串

```bash
openclaw message send --channel discord --target channel:<forumId> \
  --message "Topic title\nBody of the post"
```

範例：明確建立論壇討論串

```bash
openclaw message thread create --channel discord --target channel:<forumId> \
  --thread-name "Topic title" --message "Body of the post"
```

論壇父頻道不接受 Discord 元件。如果您需要元件，請傳送到討論串本身 (`channel:<threadId>`)。

## 互動元件

OpenClaw 支援用於代理程式訊息的 Discord 元件 v2 容器。使用具有 `components` payload 的訊息工具。互動結果作為正常的 inbound 訊息路由回代理程式，並遵循現有的 Discord `replyToMode` 設定。

支援的區塊：

- `text`、`section`、`separator`、`actions`、`media-gallery`、`file`
- Action rows 允許最多 5 個按鈕或單一選單
- 選擇類型：`string`、`user`、`role`、`mentionable`、`channel`

預設情況下，元件僅能使用一次。設定 `components.reusable=true` 以允許按鈕、選單和表單在過期前多次使用。

若要限制誰可以點擊按鈕，請在該按鈕上設定 `allowedUsers`（Discord 使用者 ID、標籤或 `*`）。設定後，不符合的使用者會收到暫時性的拒絕訊息。

`/model` 和 `/models` 斜線指令會開啟一個互動式模型選擇器，包含提供者和模型下拉選單以及提交步驟。選擇器的回應為暫時性，僅發起的使用者可以使用。

檔案附件：

- `file` 區塊必須指向附件參照（`attachment://<filename>`）
- 透過 `media`/`path`/`filePath` 提供附件（單一檔案）；使用 `media-gallery` 提供多個檔案
- 當上傳名稱應符合附件參照時，使用 `filename` 覆寫上傳名稱

模態表單：

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
    `channels.discord.dmPolicy` 控制 DM 存取權限（舊版：`channels.discord.dm.policy`）：

    - `pairing`（預設）
    - `allowlist`
    - `open`（要求 `channels.discord.allowFrom` 包含 `"*"`；舊版：`channels.discord.dm.allowFrom`）
    - `disabled`

    如果 DM 政策未設為開放，未知使用者將被封鎖（或在 `pairing` 模式下被提示配對）。

    多帳號優先順序：

    - `channels.discord.accounts.default.allowFrom` 僅套用於 `default` 帳號。
    - 當具名帳號自身的 `allowFrom` 未設定時，會繼承 `channels.discord.allowFrom`。
    - 具名帳號不會繼承 `channels.discord.accounts.default.allowFrom`。

    傳送的目標格式：

    - `user:<id>`
    - `<@id>` 提及

    純數字 ID 具有歧義且會被拒絕，除非提供明確的使用者/頻道目標類型。

  </Tab>

  <Tab title="Guild policy">
    公會處理由 `channels.discord.groupPolicy` 控制：

    - `open`
    - `allowlist`
    - `disabled`

    當 `channels.discord` 存在時，預設的安全基準是 `allowlist`。

    `allowlist` 行為：

    - 公會必須符合 `channels.discord.guilds`（建議使用 `id`，接受 slug）
    - 可選的傳送者允許名單：`users`（建議使用穩定 ID）和 `roles`（僅限角色 ID）；如果設定了其中一個，當傳送者符合 `users` 或 `roles` 時即允許
    - 直接名稱/標籤匹配預設為停用；僅將 `channels.discord.dangerouslyAllowNameMatching: true` 作為緊急相容性模式啟用
    - `users` 支援名稱/標籤，但 ID 更安全；當使用名稱/標籤項目時，`openclaw security audit` 會發出警告
    - 如果公會設定了 `channels`，則會拒絕未列出的頻道
    - 如果公會沒有 `channels` 區塊，則允許該已列入允許名單之公會中的所有頻道

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

    如果您只設定 `DISCORD_BOT_TOKEN` 而不建立 `channels.discord` 區塊，則執行時期回退為 `groupPolicy="allowlist"`（並在日誌中顯示警告），即使 `channels.defaults.groupPolicy` 是 `open`。

  </Tab>

  <Tab title="提及與群組 DM">
    公訊息預設會受到提及限制。

    提及偵測包含：

    - 明確的機器人提及
    - 已設定的提及模式 (`agents.list[].groupChat.mentionPatterns`，備用 `messages.groupChat.mentionPatterns`)
    - 在支援情況下的隱含回覆機器人行為

    `requireMention` 是針對每個公會/頻道設定的 (`channels.discord.guilds...`)。
    `ignoreOtherMentions` 可選地捨棄提及其他使用者/角色但未提及機器人的訊息 (排除 @everyone/@here)。

    群組 DM：

    - 預設：忽略 (`dm.groupEnabled=false`)
    - 透過 `dm.groupChannels` 的可選允許清單 (頻道 ID 或 slug)

  </Tab>
</Tabs>

### 基於角色的代理路由

使用 `bindings[].match.roles` 依據角色 ID 將 Discord 公會成員路由至不同的代理。基於角色的綁定僅接受角色 ID，且在對等或父對等綁定之後、公會專屬綁定之前進行評估。如果綁定也設定了其他匹配欄位 (例如 `peer` + `guildId` + `roles`)，則所有設定的欄位都必須符合。

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
    3. 複製機器人 token

  </Accordion>

  <Accordion title="特殊權限意圖">
    在 **Bot -> Privileged Gateway Intents** 中，啟用：

    - Message Content Intent
    - Server Members Intent (建議)

    Presence 意圖是選用的，只有當您想要接收狀態更新時才需要。設定機器人狀態 (`setPresence`) 不需要為成員啟用狀態更新。

  </Accordion>

  <Accordion title="OAuth 範圍和基線權限">
    OAuth URL 產生器：

    - scopes: `bot`, `applications.commands`

    典型基線權限：

    - 檢視頻道
    - 傳送訊息
    - 讀取訊息紀錄
    - 嵌入連結
    - 附加檔案
    - 新增反應 (選用)

    避免使用 `Administrator`，除非明確需要。

  </Accordion>

  <Accordion title="複製 ID">
    啟用 Discord 開發者模式，然後複製：

    - server ID
    - channel ID
    - user ID

    為了可靠的稽核和探測，建議在 OpenClaw 設定中使用數字 ID。

  </Accordion>
</AccordionGroup>

## 原生指令和指令驗證

- `commands.native` 預設為 `"auto"`，並已針對 Discord 啟用。
- 各頻道覆寫：`channels.discord.commands.native`。
- `commands.native=false` 會明確清除先前註冊的 Discord 原生指令。
- 原生指令驗證使用與一般訊息處理相同的 Discord 允許清單/原則。
- 對於未獲授權的使用者，指令可能仍會顯示在 Discord UI 中；但執行仍會強制執行 OpenClaw 驗證並回傳「未授權」。

請參閱 [斜線指令](/en/tools/slash-commands) 以了解指令目錄和行為。

預設斜線指令設定：

- `ephemeral: true`

## 功能詳情

<AccordionGroup>
  <Accordion title="回覆標籤和原生回覆">
    Discord 支援在 Agent 輸出中使用回覆標籤：

    - `[[reply_to_current]]`
    - `[[reply_to:<id>]]`

    由 `channels.discord.replyToMode` 控制：

    - `off` (預設)
    - `first`
    - `all`

    注意：`off` 會停用隱含的回覆串接。明確的 `[[reply_to_*]]` 標籤仍會受到採用。

    訊息 ID 會顯示在內容/紀錄中，以便 Agent 指定特定訊息。

  </Accordion>

  <Accordion title="直播預覽">
    OpenClaw 可以透過傳送暫時訊息並在文字到達時編輯該訊息來串流草稿回覆。

    - `channels.discord.streaming` 控制預覽串流 (`off` | `partial` | `block` | `progress`, 預設: `off`)。
    - 預設保持為 `off`，因為 Discord 預覽編輯可能會快速觸及速率限制，特別是當多個機器人或閘道共用相同帳戶或伺服器流量時。
    - 為了跨通道一致性，接受 `progress`，並在 Discord 上對應至 `partial`。
    - `channels.discord.streamMode` 是舊版別名，會自動遷移。
    - `partial` 會在 token 到達時編輯單一預覽訊息。
    - `block` 會發出草稿大小的區塊 (使用 `draftChunk` 來調整大小和斷點)。

    範例:

```json5
{
  channels: {
    discord: {
      streaming: "partial",
    },
  },
}
```

    `block` 模式區塊分割預設值 (限制為 `channels.discord.textChunkLimit`):

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

    注意: 預覽串流與區塊串流分開。當針對 Discord 明確啟用區塊串流時，OpenClaw 會跳過預覽串流以避免重複串流。

  </Accordion>

  <Accordion title="歷史、上下文和執行緒行為">
    Guild 歷史上下文:

    - `channels.discord.historyLimit` 預設 `20`
    - 後備: `messages.groupChat.historyLimit`
    - `0` 停用

    DM 歷史控制:

    - `channels.discord.dmHistoryLimit`
    - `channels.discord.dms["<user_id>"].historyLimit`

    執行緒行為:

    - Discord 執行緒作為通道會話被路由
    - 父執行緒元資料可用於父會話連結
    - 執行緒組態繼承父通道組態，除非存在執行緒特定項目

    通道主題會被作為 **不受信任** 的上下文 (而非系統提示) 注入。

  </Accordion>

  <Accordion title="Thread-bound sessions for subagents">
    Discord 可以將執行緒繫結至會話目標，使該執行緒中的後續訊息持續路由至同一個會話（包括子代理程式會話）。

    指令：

    - `/focus <target>` 將目前/新的執行緒繫結至子代理程式/會話目標
    - `/unfocus` 移除目前的執行緒繫結
    - `/agents` 顯示正在執行的項目與繫結狀態
    - `/session idle <duration|off>` 檢查/更新聚焦繫結的非活動自動失去焦點設定
    - `/session max-age <duration|off>` 檢查/更新聚焦繫結的強制最大存留時間

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

    備註：

    - `session.threadBindings.*` 設定全域預設值。
    - `channels.discord.threadBindings.*` 覆寫 Discord 的行為。
    - `spawnSubagentSessions` 必須為 true，才能為 `sessions_spawn({ thread: true })` 自動建立/繫結執行緒。
    - `spawnAcpSessions` 必須為 true，才能為 ACP（`/acp spawn ... --thread ...` 或 `sessions_spawn({ runtime: "acp", thread: true })`）自動建立/繫結執行緒。
    - 如果帳戶停用了執行緒繫結功能，`/focus` 及相關的執行緒繫結操作將無法使用。

    請參閱[子代理程式](/en/tools/subagents)、[ACP 代理程式](/en/tools/acp-agents)和[設定參考](/en/gateway/configuration-reference)。

  </Accordion>

  <Accordion title="Persistent ACP channel bindings">
    對於穩定的「永遠線上」ACP 工作區，請設定目標指向 Discord 對話的頂層類型化 ACP 繫結。

    設定路徑：

    - `bindings[]` 搭配 `type: "acp"` 和 `match.channel: "discord"`

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

    - 執行緒訊息可以繼承上層頻道的 ACP 繫結。
    - 在已繫結的頻道或執行緒中，`/new` 和 `/reset` 會就地重設同一個 ACP 會話。
    - 暫時的執行緒繫結仍然有效，並在啟用時可以覆寫目標解析結果。

    請參閱[ACP 代理程式](/en/tools/acp-agents)以了解繫結行為的詳細資訊。

  </Accordion>

  <Accordion title="反應通知">
    每個伺服器的反應通知模式：

    - `off`
    - `own` (預設)
    - `all`
    - `allowlist` (使用 `guilds.<id>.users`)

    反應事件會被轉換為系統事件，並附加到路由的 Discord 會話中。

  </Accordion>

  <Accordion title="Ack 反應">
    當 OpenClaw 正在處理傳入訊息時，`ackReaction` 會發送一個確認表情符號。

    解析順序：

    - `channels.discord.accounts.<accountId>.ackReaction`
    - `channels.discord.ackReaction`
    - `messages.ackReaction`
    - 代理身份表情符號後備 (`agents.list[].identity.emoji`，否則為 "👀")

    註記：

    - Discord 接受 unicode 表情符號或自訂表情符號名稱。
    - 使用 `""` 可針對頻道或帳號停用該反應。

  </Accordion>

  <Accordion title="設定寫入">
    頻道發起的設定寫入預設為啟用。

    這會影響 `/config set|unset` 流程 (當啟用指令功能時)。

    停用方式：

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

  <Accordion title="閘道代理">
    使用 `channels.discord.proxy` 透過 HTTP(S) 代理伺服器路由 Discord 閘道 WebSocket 流量以及啟動時的 REST 查詢 (應用程式 ID + 白名單解析)。

```json5
{
  channels: {
    discord: {
      proxy: "http://proxy.example:8080",
    },
  },
}
```

    每個帳號的覆寫：

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
    啟用 PluralKit 解析以將代理訊息對應到系統成員身分：

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

    註記：

    - 白名單可以使用 `pk:<memberId>`
    - 只有當 `channels.discord.dangerouslyAllowNameMatching: true` 時，成員顯示名稱才會僅依照名稱/代稱 進行比對
    - 查詢使用原始訊息 ID 並受限於時間視窗
    - 如果查詢失敗，代理訊息將被視為機器人訊息並被丟棄，除非 `allowBots=true`

  </Accordion>

  <Accordion title="Presence configuration">
    當您設定狀態或活動欄位，或啟用自動狀態時，會套用狀態更新。

    僅包含狀態的範例：

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
    - 1: 正在串流 (requires `activityUrl`)
    - 2: 正在聆聽
    - 3: 正在觀看
    - 4: 自訂 (uses the activity text as the status state; emoji is optional)
    - 5: 正在競爭

    自動狀態範例 (runtime health signal)：

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

    自動狀態會將執行時期可用性對應到 Discord 狀態：healthy => online, degraded or unknown => idle, exhausted or unavailable => dnd。選用的文字覆寫：

    - `autoPresence.healthyText`
    - `autoPresence.degradedText`
    - `autoPresence.exhaustedText` (supports `{reason}` placeholder)

  </Accordion>

  <Accordion title="Discord 中的執行審批">
    Discord 支援在私訊（DM）中透過按鈕進行執行審批，並可選擇在原始頻道中發佈審批提示。

    設定路徑：

    - `channels.discord.execApprovals.enabled`
    - `channels.discord.execApprovals.approvers`
    - `channels.discord.execApprovals.target` (`dm` | `channel` | `both`，預設：`dm`)
    - `agentFilter`、`sessionFilter`、`cleanupAfterResolve`

    當 `target` 為 `channel` 或 `both` 時，審批提示會顯示在頻道中。只有設定的審批者可以使用這些按鈕；其他使用者會收到一個暫時性的拒絕訊息。審批提示包含指令文字，因此僅在受信任的頻道中啟用頻道傳遞。如果無法從 session key 推導出頻道 ID，OpenClaw 會回退到私訊傳遞。

    此處理程式的 Gateway 驗證使用與其他 Gateway 用戶端相同的共享憑證解析約定：

    - 優先環境變數的本機驗證（`OPENCLAW_GATEWAY_TOKEN` / `OPENCLAW_GATEWAY_PASSWORD`，然後是 `gateway.auth.*`）
    - 在本機模式下，只有在未設定 `gateway.auth.*` 時，才能將 `gateway.remote.*` 作為後備選項；已設定但未解析的本機 SecretRefs 將會失敗關閉（fail closed）
    - 在適用時透過 `gateway.remote.*` 支援遠端模式
    - URL 覆寫是覆寫安全的：CLI 覆寫不會重複使用隱式憑證，而環境變數覆寫僅使用環境變數憑證

    如果審批因未知的審批 ID 而失敗，請檢查審批者清單和功能啟用狀態。

    相關文件：[執行審批](/en/tools/exec-approvals)

  </Accordion>
</AccordionGroup>

## 工具和動作閘門

Discord 訊息動作包括傳訊、頻道管理、審核、狀態和元數據動作。

核心範例：

- 傳訊：`sendMessage`、`readMessages`、`editMessage`、`deleteMessage`、`threadReply`
- 反應：`react`、`reactions`、`emojiList`
- 版主：`timeout`、`kick`、`ban`
- 在線狀態：`setPresence`

動作閘門位於 `channels.discord.actions.*` 之下。

預設閘門行為：

| 動作群組                                                                                                                                                                 | 預設   |
| ------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ------ |
| reactions、messages、threads、pins、polls、search、memberInfo、roleInfo、channelInfo、channels、voiceStatus、events、stickers、emojiUploads、stickerUploads、permissions | 已啟用 |
| roles                                                                                                                                                                    | 已停用 |
| moderation                                                                                                                                                               | 已停用 |
| presence                                                                                                                                                                 | 已停用 |

## Components v2 UI

OpenClaw 使用 Discord components v2 進行執行核准和跨上下文標記。Discord 訊息動作也可以接受 `components` 以實作自訂 UI（進階；需要 Carbon 組件實例），而舊版的 `embeds` 仍然可用但不建議使用。

- `channels.discord.ui.components.accentColor` 設定 Discord 組件容器所使用的強調顏色 (hex)。
- 使用 `channels.discord.accounts.<id>.ui.components.accentColor` 針對每個帳戶進行設定。
- 當存在 components v2 時，會忽略 `embeds`。

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

OpenClaw 可以加入 Discord 語音頻道進行即時、連續的對話。這與語音訊息附件是分開的。

需求：

- 啟用原生指令 (`commands.native` 或 `channels.discord.commands.native`)。
- 設定 `channels.discord.voice`。
- 機器人在目標語音頻道中需要 Connect + Speak 權限。

使用 Discord 專有的原生指令 `/vc join|leave|status` 來控制階段。該指令使用帳戶預設代理程式，並遵循與其他 Discord 指令相同的允許清單和群組政策規則。

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

- `voice.tts` 會覆寫 `messages.tts` 僅用於語音播放。
- 語音逐字稿回合衍生自 Discord `allowFrom` (或 `dm.allowFrom`) 的擁有者狀態；非擁有者說話者無法存取僅限擁有者的工具 (例如 `gateway` 和 `cron`)。
- 語音預設為啟用；設定 `channels.discord.voice.enabled=false` 以停用它。
- `voice.daveEncryption` 和 `voice.decryptionFailureTolerance` 會傳遞至 `@discordjs/voice` 加入選項。
- `@discordjs/voice` 若未設定，預設值為 `daveEncryption=true` 和 `decryptionFailureTolerance=24`。
- OpenClaw 也會監控接收解密失敗，並在短時間內多次失敗後通過離開/重新加入語音頻道來自動恢復。
- 如果接收日誌重複顯示 `DecryptionFailed(UnencryptedWhenPassthroughDisabled)`，這可能是 [discord.js #11419](https://github.com/discordjs/discord.js/issues/11419) 中追蹤的上游 `@discordjs/voice` 接收錯誤。

## 語音訊息

Discord 語音訊息會顯示波形預覽，並且需要 OGG/Opus 音訊加上中繼資料。OpenClaw 會自動生成波形，但它需要在閘道主機上安裝 `ffmpeg` 和 `ffprobe` 以檢查和轉換音訊檔案。

需求與限制：

- 提供 **本機檔案路徑**（不接受 URL）。
- 省略文字內容（Discord 不允許在同一個 payload 中同時包含文字和語音訊息）。
- 接受任何音訊格式；OpenClaw 會在需要時轉換為 OGG/Opus。

範例：

```bash
message(action="send", channel="discord", target="channel:123", path="/path/to/audio.mp3", asVoice=true)
```

## 疑難排解

<AccordionGroup>
  <Accordion title="使用了不允許的 intents 或機器人看不到伺服器訊息">

    - 啟用 Message Content Intent
    - 當您依賴使用者/成員解析時，啟用 Server Members Intent
    - 變更 intents 後重新啟動閘道

  </Accordion>

  <Accordion title="伺服器訊息意外被封鎖">

    - 驗證 `groupPolicy`
    - 驗證 `channels.discord.guilds` 下的伺服器允許清單
    - 如果伺服器 `channels` 對映存在，則僅允許列出的頻道
    - 驗證 `requireMention` 行為和提及模式

    有用的檢查：

```bash
openclaw doctor
openclaw channels status --probe
openclaw logs --follow
```

  </Accordion>

  <Accordion title="Require mention false but still blocked">
    常見原因：

    - `groupPolicy="allowlist"` 但沒有對應的伺服器/頻道白名單
    - `requireMention` 設定位置錯誤（必須位於 `channels.discord.guilds` 或頻道項目下）
    - 發送者被伺服器/頻道 `users` 白名單封鎖

  </Accordion>

  <Accordion title="Long-running handlers time out or duplicate replies">

    典型日誌：

    - `Listener DiscordMessageListener timed out after 30000ms for event MESSAGE_CREATE`
    - `Slow listener detected ...`
    - `discord inbound worker timed out after ...`

    監聽器預算調節參數：

    - 單一帳號： `channels.discord.eventQueue.listenerTimeout`
    - 多重帳號： `channels.discord.accounts.<accountId>.eventQueue.listenerTimeout`

    Worker 執行逾時調節參數：

    - 單一帳號： `channels.discord.inboundWorker.runTimeoutMs`
    - 多重帳號： `channels.discord.accounts.<accountId>.inboundWorker.runTimeoutMs`
    - 預設值： `1800000` (30 分鐘)；設定 `0` 以停用

    建議基準：

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

    請對緩慢的監聽器設定使用 `eventQueue.listenerTimeout`，並且僅在您想要為佇列中的代理程式回合設定獨立的安全閥時使用 `inboundWorker.runTimeoutMs`

  </Accordion>

  <Accordion title="Permissions audit mismatches">
    `channels status --probe` 權限檢查僅適用於數字頻道 ID。

    如果您使用 slug 鍵，執行時期的比對仍然可以運作，但偵測無法完全驗證權限。

  </Accordion>

  <Accordion title="DM and pairing issues">

    - DM 已停用： `channels.discord.dm.enabled=false`
    - DM 政策已停用： `channels.discord.dmPolicy="disabled"` (舊版： `channels.discord.dm.policy`)
    - 正在等待 `pairing` 模式下的配對審核

  </Accordion>

  <Accordion title="Bot to bot loops">
    預設情況下，由機器人發送的訊息會被忽略。

    如果您設定 `channels.discord.allowBots=true`，請使用嚴格的提及和白名單規則以避免迴圈行為。
    建議優先使用 `channels.discord.allowBots="mentions"` 以僅接受提及該機器人的機器人訊息。

  </Accordion>

  <Accordion title="Voice STT drops with DecryptionFailed(...)">

    - 保持 OpenClaw 為最新版本 (`openclaw update`)，以確保存在 Discord 語音接收恢復邏輯
    - 確認 `channels.discord.voice.daveEncryption=true` (預設值)
    - 從 `channels.discord.voice.decryptionFailureTolerance=24` (上游預設值) 開始，並僅在需要時進行調整
    - 監控日誌以查看：
      - `discord voice: DAVE decrypt failures detected`
      - `discord voice: repeated decrypt failures; attempting rejoin`
    - 如果在自動重新加入後仍然出現故障，請收集日誌並與 [discord.js #11419](https://github.com/discordjs/discord.js/issues/11419) 進行比較

  </Accordion>
</AccordionGroup>

## 設定參考指標

主要參考：

- [Discord 設定參考](/en/gateway/configuration-reference#discord)

高優先級 Discord 欄位：

- 啟動/驗證：`enabled`, `token`, `accounts.*`, `allowBots`
- 原則：`groupPolicy`, `dm.*`, `guilds.*`, `guilds.*.channels.*`
- 指令：`commands.native`, `commands.useAccessGroups`, `configWrites`, `slashCommand.*`
- 事件佇列：`eventQueue.listenerTimeout` (監聽器預算), `eventQueue.maxQueueSize`, `eventQueue.maxConcurrency`
- 輸入 Worker：`inboundWorker.runTimeoutMs`
- 回覆/歷史：`replyToMode`, `historyLimit`, `dmHistoryLimit`, `dms.*.historyLimit`
- 傳遞：`textChunkLimit`, `chunkMode`, `maxLinesPerMessage`
- 串流：`streaming` (舊版別名：`streamMode`), `draftChunk`, `blockStreaming`, `blockStreamingCoalesce`
- 媒體/重試：`mediaMaxMb`, `retry`
  - `mediaMaxMb` 限制傳出的 Discord 上傳 (預設值：`8MB`)
- 動作：`actions.*`
- presence: `activity`, `status`, `activityType`, `activityUrl`
- UI: `ui.components.accentColor`
- features: `threadBindings`, 頂層 `bindings[]` (`type: "acp"`), `pluralkit`, `execApprovals`, `intents`, `agentComponents`, `heartbeat`, `responsePrefix`

## 安全性與操作

- 請將機器人權杖視為機密（在受監管環境中建議使用 `DISCORD_BOT_TOKEN`）。
- 授予最小權限的 Discord 權限。
- 如果指令部署/狀態過時，請重新啟動 gateway 並使用 `openclaw channels status --probe` 重新檢查。

## 相關

- [配對](/en/channels/pairing)
- [通道路由](/en/channels/channel-routing)
- [多代理路由](/en/concepts/multi-agent)
- [疑難排解](/en/channels/troubleshooting)
- [斜線指令](/en/tools/slash-commands)
