---
summary: "Discord 機器人支援狀態、功能和設定"
read_when:
  - Working on Discord channel features
title: "Discord"
---

# Discord (Bot API)

狀態：已準備好透過官方 Discord gateway 使用 DM 和公會頻道。

<CardGroup cols={3}>
  <Card title="配對" icon="link" href="/zh-Hant/channels/pairing">
    Discord DM 預設為配對模式。
  </Card>
  <Card title="斜線指令" icon="terminal" href="/zh-Hant/tools/slash-commands">
    原生指令行為和指令目錄。
  </Card>
  <Card title="頻道疑難排解" icon="wrench" href="/zh-Hant/channels/troubleshooting">
    跨頻道診斷和修復流程。
  </Card>
</CardGroup>

## 快速設定

您需要建立一個包含機器人的新應用程式，將機器人新增至您的伺服器，並將其與 OpenClaw 配對。我們建議將您的機器人新增至您自己的私人伺服器。如果您還沒有私人伺服器，請先[建立一個](https://support.discord.com/hc/en-us/articles/204849977-How-do-I-create-a-server) (選擇 **Create My Own > For me and my friends**)。

<Steps>
  <Step title="建立 Discord 應用程式和機器人">
    前往 [Discord Developer Portal](https://discord.com/developers/applications) 並點擊 **New Application**。將其命名為類似「OpenClaw」的名稱。

    點擊側邊欄上的 **Bot**。將 **Username** 設定為您稱呼 OpenClaw agent 的任何名稱。

  </Step>

  <Step title="啟用特殊權限 Intents">
    仍在 **Bot** 頁面上，向下捲動至 **Privileged Gateway Intents** 並啟用：

    - **Message Content Intent** (必要)
    - **Server Members Intent** (建議；角色允許清單和名稱對 ID 匹配所需)
    - **Presence Intent** (選用；僅需要狀態更新時使用)

  </Step>

  <Step title="複製您的機器人 Token">
    在 **Bot** 頁面上向上捲動並點擊 **Reset Token**。

    <Note>
    儘管名稱如此，這會產生您的第一個 token — 沒有任何東西被「重置」。
    </Note>

    複製 token 並將其儲存在某處。這是您的 **Bot Token**，您很快就會需要它。

  </Step>

  <Step title="Generate an invite URL and add the bot to your server">
    在側邊欄點擊 **OAuth2**。您將產生一個具有正確權限的邀請網址，以將機器人新增至您的伺服器。

    向下捲動至 **OAuth2 URL Generator** 並啟用：

    - `bot`
    - `applications.commands`

    下方會出現 **Bot Permissions** 區塊。啟用：

    - View Channels
    - Send Messages
    - Read Message History
    - Embed Links
    - Attach Files
    - Add Reactions (選用)

    複製底部產生的網址，將其貼至您的瀏覽器中，選取您的伺服器，然後點擊 **Continue** 以進行連線。您現在應該可以在 Discord 伺服器中看到您的機器人。

  </Step>

  <Step title="Enable Developer Mode and collect your IDs">
    回到 Discord 應用程式，您需要啟用開發者模式才能複製內部 ID。

    1. 點擊 **User Settings** (您大頭貼旁的齒輪圖示) → **Advanced** → 開啟 **Developer Mode**
    2. 在側邊欄對著您的 **server icon** 按下滑鼠右鍵 → **Copy Server ID**
    3. 對著您的 **own avatar** 按下滑鼠右鍵 → **Copy User ID**

    將您的 **Server ID** 和 **User ID** 與您的 Bot Token 一起儲存起來 — 您將在下一步中把這三項資訊都傳送給 OpenClaw。

  </Step>

  <Step title="Allow DMs from server members">
    為了讓配對運作，Discord 需要允許您的機器人傳送私訊給您。對著您的 **server icon** 按下滑鼠右鍵 → **Privacy Settings** → 開啟 **Direct Messages**。

    這允許伺服器成員 (包括機器人) 傳送私訊給您。如果您想透過 OpenClaw 使用 Discord 私訊，請保持此設定為啟用。如果您只計畫使用伺服器頻道，您可以在配對完成後停用私訊。

  </Step>

  <Step title="Step 0: Set your bot token securely (do not send it in chat)">
    您的 Discord 機器人權杖是一個機密資訊 (類似於密碼)。請在傳送訊息給您的代理程式之前，先在執行 OpenClaw 的機器上設定它。

```bash
openclaw config set channels.discord.token '"YOUR_BOT_TOKEN"' --json
openclaw config set channels.discord.enabled true --json
openclaw gateway
```

    如果 OpenClaw 已經作為背景服務執行，請改用 `openclaw gateway restart`。

  </Step>

  <Step title="Configure OpenClaw and pair">

    <Tabs>
      <Tab title="Ask your agent">
        在任何既有的頻道（例如 Telegram）上與您的 OpenClaw 智慧體對話並告訴它。如果 Discord 是您的第一個頻道，請改用 CLI / config 分頁。

        > "我已經在設定中設置了我的 Discord 機器人 token。請使用 User ID `<user_id>` 和 Server ID `<server_id>` 完成 Discord 設定。"
      </Tab>
      <Tab title="CLI / config">
        如果您偏好基於檔案的設定，請設定：

```json5
{
  channels: {
    discord: {
      enabled: true,
      token: "YOUR_BOT_TOKEN",
    },
  },
}
```

        預設帳號的 Env 後備方案：

```bash
DISCORD_BOT_TOKEN=...
```

        同時也支援 `channels.discord.token` 的 SecretRef 值（env/file/exec 提供者）。請參閱 [機密管理](/zh-Hant/gateway/secrets)。

      </Tab>
    </Tabs>

  </Step>

  <Step title="Approve first DM pairing">
    等待直到 gateway 正在運行，然後在 Discord 中私訊您的機器人。它會回覆一個配對碼。

    <Tabs>
      <Tab title="Ask your agent">
        將配對碼傳送給您在既有頻道上的智慧體：

        > "批准此 Discord 配對碼： `<CODE>`"
      </Tab>
      <Tab title="CLI">

```bash
openclaw pairing list discord
openclaw pairing approve discord <CODE>
```

      </Tab>
    </Tabs>

    配對碼將在 1 小時後過期。

    您現在應該可以透過 DM 在 Discord 中與您的智慧體交談。

  </Step>
</Steps>

<Note>
  Token 解析是感知帳號的。設定中的 token 值優先於 env 後備方案。 `DISCORD_BOT_TOKEN`
  僅用於預設帳號。對於進階的傳出呼叫（訊息工具/頻道動作）， 該次呼叫會使用明確的 per-call
  `token`。帳號原則/重試設定仍然來自於 作用中執行時快照中所選取的帳號。
</Note>

## 建議：設定伺服器工作區

一旦 DM 運作正常，您可以將您的 Discord 伺服器設定為完整的工作區，其中每個頻道都會獲得具有自己上下文的智慧體工作階段。建議將此用於只有您和您的機器人的私人伺服器。

<Steps>
  <Step title="將您的伺服器新增到公會允許清單">
    這可讓您的代理程式在您伺服器上的任何頻道回應，而不僅限於私訊。

    <Tabs>
      <Tab title="詢問您的代理程式">
        > "將我的 Discord 伺服器 ID `<server_id>` 新增到公會允許清單"
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
    根據預設，您的代理程式只有在公會頻道中被 @提及 時才會回應。對於私人伺服器，您可能會希望它回應每一則訊息。

    <Tabs>
      <Tab title="詢問您的代理程式">
        > "允許我的代理程式在此伺服器上回應，而不需要被 @提及"
      </Tab>
      <Tab title="設定">
        在您的公會設定中設定 `requireMention: false`：

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

  <Step title="規劃公會頻道中的記憶體">
    根據預設，長期記憶體 (MEMORY.md) 只會在私訊工作階段中載入。公會頻道不會自動載入 MEMORY.md。

    <Tabs>
      <Tab title="詢問您的代理程式">
        > "當我在 Discord 頻道提問時，如果您需要來自 MEMORY.md 的長期上下文，請使用 memory_search 或 memory_get。"
      </Tab>
      <Tab title="手動">
        如果您在每個頻道都需要共享的上下文，請將穩定的指示放在 `AGENTS.md` 或 `USER.md` 中（它們會為每個工作階段注入）。將長期筆記保存在 `MEMORY.md` 中，並使用記憶體工具隨時存取。
      </Tab>
    </Tabs>

  </Step>
</Steps>

現在在您的 Discord 伺服器上建立一些頻道並開始聊天。您的代理程式可以看到頻道名稱，而且每個頻道都有自己的獨立工作階段 — 因此您可以設定 `#coding`、`#home`、`#research` 或任何適合您工作流程的項目。

## 執行階段模型

- Gateway 擁有 Discord 連線。
- 回覆路由是確定性的：Discord 的入站訊息會回覆至 Discord。
- 預設情況下 (`session.dmScope=main`)，直接聊天共享代理主會話 (`agent:main:main`)。
- 公會頻道使用獨立的會話金鑰 (`agent:<agentId>:discord:channel:<channelId>`)。
- 群組私訊預設會被忽略 (`channels.discord.dm.groupEnabled=false`)。
- 原生斜線指令在獨立的指令會話中執行 (`agent:<agentId>:discord:slash:<userId>`)，同時仍會將 `CommandTargetSessionKey` 帶到被路由的對話會話中。

## 論壇頻道

Discord 論壇和媒體頻道僅接受貼文。OpenClaw 支援兩種建立方式：

- 傳送訊息至論壇父頻道 (`channel:<forumId>`) 以自動建立貼文。貼文標題會使用您訊息的第一行非空內容。
- 使用 `openclaw message thread create` 直接建立貼文。請勿對論壇頻道傳遞 `--message-id`。

範例：傳送至論壇父頻道以建立貼文

```bash
openclaw message send --channel discord --target channel:<forumId> \
  --message "Topic title\nBody of the post"
```

範例：明確建立論壇貼文

```bash
openclaw message thread create --channel discord --target channel:<forumId> \
  --thread-name "Topic title" --message "Body of the post"
```

論壇父頻道不接受 Discord 元件。如果您需要元件，請傳送至貼文本身 (`channel:<threadId>`)。

## 互動元件

OpenClaw 支援用於代理訊息的 Discord 元件 v2 容器。請使用帶有 `components` 載荷的訊息工具。互動結果會作為一般入站訊息路由回代理，並遵循現有的 Discord `replyToMode` 設定。

支援的區塊：

- `text`, `section`, `separator`, `actions`, `media-gallery`, `file`
- 動作列允許最多 5 個按鈕或單一選單
- 選單類型：`string`, `user`, `role`, `mentionable`, `channel`

預設情況下，元件僅能使用一次。設定 `components.reusable=true` 以允許按鈕、選單和表單多次使用，直到過期。

若要限制誰可以點擊按鈕，請在該按鈕上設定 `allowedUsers`（Discord 使用者 ID、標籤或 `*`）。設定後，不符的使用者將收到暫時性的拒絕訊息。

`/model` 和 `/models` 斜線指令會開啟一個互動式模型選擇器，其中包含供應商和模型下拉式選單以及提交步驟。選擇器的回覆是暫時性的，只有呼叫的使用者可以使用它。

檔案附件：

- `file` 區塊必須指向附件參照（`attachment://<filename>`）
- 透過 `media`/`path`/`filePath` 提供附件（單一檔案）；使用 `media-gallery` 提供多個檔案
- 當上傳名稱應符合附件參照時，請使用 `filename` 覆蓋上傳名稱

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

## 存取控制和路由

<Tabs>
  <Tab title="DM policy">
    `channels.discord.dmPolicy` 控制存取權限（舊版：`channels.discord.dm.policy`）：

    - `pairing`（預設）
    - `allowlist`
    - `open`（要求 `channels.discord.allowFrom` 包含 `"*"`；舊版：`channels.discord.dm.allowFrom`）
    - `disabled`

    如果 DM 政策未開放，未知使用者將被封鎖（或在 `pairing` 模式下被提示配對）。

    多帳號優先順序：

    - `channels.discord.accounts.default.allowFrom` 僅適用於 `default` 帳號。
    - 具名帳號當其自身的 `allowFrom` 未設定時，會繼承 `channels.discord.allowFrom`。
    - 具名帳號不會繼承 `channels.discord.accounts.default.allowFrom`。

    傳送的目標格式：

    - `user:<id>`
    - `<@id>` mention

    除非提供明確的使用者/頻道目標類型，否則純數字 ID 具有歧義且會被拒絕。

  </Tab>

  <Tab title="Guild policy">
    Guild 處理由 `channels.discord.groupPolicy` 控制：

    - `open`
    - `allowlist`
    - `disabled`

    當存在 `channels.discord` 時，安全基準是 `allowlist`。

    `allowlist` 行為：

    - guild 必須符合 `channels.discord.guilds`（`id` 優先，接受 slug）
    - 可選的發送者允許清單：`users`（建議使用穩定 ID）和 `roles`（僅限角色 ID）；如果配置了其中任何一個，當發送者符合 `users` 或 `roles` 時即被允許
    - 預設停用直接名稱/標籤匹配；僅將 `channels.discord.dangerouslyAllowNameMatching: true` 作為緊急兼容模式啟用
    - `users` 支援名稱/標籤，但 ID 更安全；使用名稱/標籤條目時 `openclaw security audit` 會發出警告
    - 如果 guild 已配置 `channels`，則會拒絕未列出的頻道
    - 如果 guild 沒有 `channels` 區塊，則該允許清單中的 guild 中的所有頻道皆被允許

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

    如果您僅設定 `DISCORD_BOT_TOKEN` 而未建立 `channels.discord` 區塊，即使 `channels.defaults.groupPolicy` 是 `open`，執行時期回退也會是 `groupPolicy="allowlist"`（並在記錄中發出警告）。

  </Tab>

  <Tab title="提及和群組訊息">
    公會訊息預設為提及過濾。

    提及偵測包括：

    - 明確的機器人提及
    - 已設定的提及模式 (`agents.list[].groupChat.mentionPatterns`，後備 `messages.groupChat.mentionPatterns`)
    - 在支援的情況下隱含的回覆機器人行為

    `requireMention` 是針對每個公會/頻道設定的 (`channels.discord.guilds...`)。
    `ignoreOtherMentions` 可選地捨棄提及其他使用者/角色但未提及機器人的訊息 (排除 @everyone/@here)。

    群組訊息：

    - 預設：忽略 (`dm.groupEnabled=false`)
    - 透過 `dm.groupChannels` 的可選允許清單 (頻道 ID 或 slug)

  </Tab>
</Tabs>

### 基於角色的代理路由

使用 `bindings[].match.roles` 根據角色 ID 將 Discord 公會成員路由到不同的代理。基於角色的綁定僅接受角色 ID，並在對等或父對等綁定之後以及僅公會綁定之前評估。如果綁定也設定了其他相符欄位 (例如 `peer` + `guildId` + `roles`)，則所有設定的欄位都必須相符。

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

    1. Discord 開發者入口網站 -> **Applications** -> **New Application**
    2. **Bot** -> **Add Bot**
    3. 複製機器人權杖

  </Accordion>

  <Accordion title="特權意圖">
    在 **Bot -> Privileged Gateway Intents** 中，啟用：

    - Message Content Intent
    - Server Members Intent (建議)

    Presence intent 是選用的，只有在您想要接收 presence 更新時才需要。設定機器人 presence (`setPresence`) 不需要為成員啟用 presence 更新。

  </Accordion>

  <Accordion title="OAuth 範圍和基礎權限">
    OAuth URL 產生器：

    - 範圍： `bot`, `applications.commands`

    典型的基礎權限：

    - 檢視頻道
    - 傳送訊息
    - 讀取訊息歷史記錄
    - 嵌入連結
    - 附加檔案
    - 新增反應 (選用)

    避免使用 `Administrator`，除非明確需要。

  </Accordion>

  <Accordion title="複製 ID">
    啟用 Discord 開發者模式，然後複製：

    - 伺服器 ID
    - 頻道 ID
    - 使用者 ID

    為了可靠的安全性審查和探測，建議在 OpenClaw 設定中優先使用數值 ID。

  </Accordion>
</AccordionGroup>

## 原生指令與指令授權

- `commands.native` 預設為 `"auto"` 且已針對 Discord 啟用。
- 各頻道覆寫： `channels.discord.commands.native`。
- `commands.native=false` 會明確清除先前註冊的 Discord 原生指令。
- 原生指令授權使用與一般訊息處理相同的 Discord 允許清單/原則。
- 對於未經授權的使用者，指令可能仍會顯示在 Discord 使用者介面中；執行時仍會強制執行 OpenClaw 授權並傳回「未授權」。

請參閱 [斜線指令](/zh-Hant/tools/slash-commands) 以了解指令目錄和行為。

預設斜線指令設定：

- `ephemeral: true`

## 功能詳細資訊

<AccordionGroup>
  <Accordion title="回覆標籤和原生回覆">
    Discord 支援代理輸出中的回覆標籤：

    - `[[reply_to_current]]`
    - `[[reply_to:<id>]]`

    由 `channels.discord.replyToMode` 控制：

    - `off` (預設)
    - `first`
    - `all`

    注意： `off` 會停用隱含回覆串接。明確的 `[[reply_to_*]]` 標籤仍會受到尊重。

    訊息 ID 會顯示在上下文/歷史記錄中，以便代理能鎖定特定訊息。

  </Accordion>

  <Accordion title="Live stream preview">
    OpenClaw 可以透過發送暫時訊息並在文字到達時編輯該訊息，來串流草稿回覆。

    - `channels.discord.streaming` 控制預覽串流 (`off` | `partial` | `block` | `progress`，預設：`off`)。
    - `progress` 為了跨頻道一致性而被接受，並在 Discord 上對應至 `partial`。
    - `channels.discord.streamMode` 是舊版別名，會自動遷移。
    - `partial` 會在 token 到達時編輯單一預覽訊息。
    - `block` 發出草稿大小的區塊 (使用 `draftChunk` 來調整大小和中斷點)。

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

    `block` 模式區塊分割預設值 (限制在 `channels.discord.textChunkLimit`)：

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

    預覽串流僅適用於文字；媒體回覆會回退為正常傳遞。

    注意：預覽串流與區塊串流是分開的。當為 Discord 明確啟用區塊串流時，OpenClaw 會跳過預覽串流以避免重複串流。

  </Accordion>

  <Accordion title="History, context, and thread behavior">
    Guild 歷史記錄上下文：

    - `channels.discord.historyLimit` 預設 `20`
    - 後備： `messages.groupChat.historyLimit`
    - `0` 停用

    DM 歷史記錄控制：

    - `channels.discord.dmHistoryLimit`
    - `channels.discord.dms["<user_id>"].historyLimit`

    串流行為：

    - Discord 串流會被路由為頻道工作階段
    - 父串流星資料可用於父工作階段連結
    - 串流設定會繼承父頻道設定，除非存在特定串流的項目

    頻道主題會被注入為 **不信任** 上下文 (而非系統提示)。

  </Accordion>

  <Accordion title="適合子代理程式的執行緒繫結工作階段">
    Discord 可以將執行緒繫結到工作階段目標，使得該執行緒中的後續訊息持續路由到同一個工作階段（包括子代理程式工作階段）。

    指令：

    - `/focus <target>` 將目前/新的執行緒繫結到子代理程式/工作階段目標
    - `/unfocus` 移除目前的執行緒繫結
    - `/agents` 顯示活躍的執行和繫結狀態
    - `/session idle <duration|off>` 檢查/更新已聚焦繫結的非自動聚焦設定
    - `/session max-age <duration|off>` 檢查/更新已聚焦繫結的強制最大存活時間

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
    - `channels.discord.threadBindings.*` 覆寫 Discord 行為。
    - `spawnSubagentSessions` 必須為 true，才能為 `sessions_spawn({ thread: true })` 自動建立/繫結執行緒。
    - `spawnAcpSessions` 必須為 true，才能為 ACP（`/acp spawn ... --thread ...` 或 `sessions_spawn({ runtime: "acp", thread: true })`）自動建立/繫結執行緒。
    - 如果帳戶停用了執行緒繫結，`/focus` 和相關的執行緒繫結操作將無法使用。

    參閱[子代理程式](/zh-Hant/tools/subagents)、[ACP 代理程式](/zh-Hant/tools/acp-agents)和[設定參考](/zh-Hant/gateway/configuration-reference)。

  </Accordion>

  <Accordion title="永續 ACP 頻道繫結">
    針對穩定的「永遠線上」ACP 工作區，請設定以 Discord 對話為目標的頂層類型 ACP 繫結。

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

    說明：

    - 執行緒訊息可以繼承上層頻道的 ACP 繫結。
    - 在已繫結的頻道或執行緒中，`/new` 和 `/reset` 會原地重設同一個 ACP 工作階段。
    - 暫時的執行緒繫結仍然有效，且在啟用時可以覆寫目標解析。

    參閱[ACP 代理程式](/zh-Hant/tools/acp-agents)以了解繫結行為的詳細資訊。

  </Accordion>

  <Accordion title="Reaction notifications">
    依公會的反應通知模式：

    - `off`
    - `own` （預設）
    - `all`
    - `allowlist` （使用 `guilds.<id>.users`）

    反應事件會轉換為系統事件，並附加到已路由的 Discord 會話。

  </Accordion>

  <Accordion title="Ack reactions">
    當 OpenClaw 正在處理傳入訊息時，`ackReaction` 會發送一個確認表情符號。

    解析順序：

    - `channels.discord.accounts.<accountId>.ackReaction`
    - `channels.discord.ackReaction`
    - `messages.ackReaction`
    - 代理身分表情符號備選 （`agents.list[].identity.emoji`，否則為 "👀"）

    備註：

    - Discord 接受 unicode 表情符號或自訂表情符號名稱。
    - 使用 `""` 以停用頻道或帳戶的反應。

  </Accordion>

  <Accordion title="Config writes">
    由頻道發起的配置寫入預設為啟用。

    這會影響 `/config set|unset` 流程 （當啟用指令功能時）。

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

  <Accordion title="Gateway proxy">
    使用 `channels.discord.proxy` 透過 HTTP(S) 代理伺服器路由 Discord 閘道 WebSocket 流量及啟動時的 REST 查詢 （應用程式 ID + 允許清單解析）。

```json5
{
  channels: {
    discord: {
      proxy: "http://proxy.example:8080",
    },
  },
}
```

    每個帳戶的覆寫設定：

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

  <Accordion title="PluralKit support">
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

    備註：

    - 允許清單可以使用 `pk:<memberId>`
    - 僅當 `channels.discord.dangerouslyAllowNameMatching: true` 時，成員顯示名稱才會依名稱/slug 進行比對
    - 查詢使用原始訊息 ID，且受時間窗口限制
    - 如果查詢失敗，代理訊息將被視為機器人訊息並被捨棄，除非 `allowBots=true`

  </Accordion>

  <Accordion title="Presence configuration">
    當您設定狀態或活動欄位，或啟用自動狀態時，會套用 Presence 更新。

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

    - 0: Playing（遊玩中）
    - 1: Streaming（直播中，需要 `activityUrl`）
    - 2: Listening（聆聽中）
    - 3: Watching（觀看中）
    - 4: Custom（自訂，將活動文字作為狀態內容；表情符號為選用）
    - 5: Competing（競技中）

    自動狀態範例（執行階段健康訊號）：

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

    自動狀態會將執行階段可用性對應至 Discord 狀態：healthy => online（上線）、degraded 或 unknown => idle（閒置）、exhausted 或 unavailable => dnd（請勿打擾）。選用的文字覆寫：

    - `autoPresence.healthyText`
    - `autoPresence.degradedText`
    - `autoPresence.exhaustedText`（支援 `{reason}` 預留位置）

  </Accordion>

  <Accordion title="Discord 中的執行核準">
    Discord 支援在 DM 中使用按鈕進行執行核準，並可選擇在原始頻道中發送核準提示。

    配置路徑：

    - `channels.discord.execApprovals.enabled`
    - `channels.discord.execApprovals.approvers`
    - `channels.discord.execApprovals.target` (`dm` | `channel` | `both`，預設：`dm`)
    - `agentFilter`、`sessionFilter`、`cleanupAfterResolve`

    當 `target` 為 `channel` 或 `both` 時，核準提示會在頻道中可見。只有設定的核準者可以使用按鈕；其他使用者會收到暫時性的拒絕訊息。核準提示包含指令文字，因此僅在受信任的頻道中啟用頻道傳送。如果無法從工作階段金鑰衍生頻道 ID，OpenClaw 會改用 DM 傳送。

    此處理程式的 Gateway 驗證使用與其他 Gateway 用戶端相同的共享憑證解析合約：

    - env-first 本機驗證 (`OPENCLAW_GATEWAY_TOKEN` / `OPENCLAW_GATEWAY_PASSWORD` 然後 `gateway.auth.*`)
    - 在本機模式下，只有在未設定 `gateway.auth.*` 時，才能將 `gateway.remote.*` 作為後備；已設定但未解析的本機 SecretRef 會失敗封閉
    - 適用時透過 `gateway.remote.*` 支援遠端模式
    - URL 覆寫是覆寫安全的：CLI 覆寫不會重用隱含憑證，env 覆寫僅使用 env 憑證

    如果核準因未知的核準 ID 而失敗，請驗證核準者清單和功能啟用狀態。

    相關文件：[執行核準](/zh-Hant/tools/exec-approvals)

  </Accordion>
</AccordionGroup>

## 工具和動作閘道

Discord 訊息動作包括訊息傳送、頻道管理、版主管理、狀態和元資料動作。

核心範例：

- 訊息傳送：`sendMessage`、`readMessages`、`editMessage`、`deleteMessage`、`threadReply`
- reactions: `react`, `reactions`, `emojiList`
- moderation: `timeout`, `kick`, `ban`
- presence: `setPresence`

Action gates live under `channels.discord.actions.*`.

Default gate behavior:

| Action group                                                                                                                                                             | Default  |
| ------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | -------- |
| reactions, messages, threads, pins, polls, search, memberInfo, roleInfo, channelInfo, channels, voiceStatus, events, stickers, emojiUploads, stickerUploads, permissions | enabled  |
| roles                                                                                                                                                                    | disabled |
| moderation                                                                                                                                                               | disabled |
| presence                                                                                                                                                                 | disabled |

## Components v2 UI

OpenClaw uses Discord components v2 for exec approvals and cross-context markers. Discord message actions can also accept `components` for custom UI (advanced; requires Carbon component instances), while legacy `embeds` remain available but are not recommended.

- `channels.discord.ui.components.accentColor` sets the accent color used by Discord component containers (hex).
- Set per account with `channels.discord.accounts.<id>.ui.components.accentColor`.
- `embeds` are ignored when components v2 are present.

Example:

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

## Voice channels

OpenClaw can join Discord voice channels for realtime, continuous conversations. This is separate from voice message attachments.

Requirements:

- Enable native commands (`commands.native` or `channels.discord.commands.native`).
- Configure `channels.discord.voice`.
- The bot needs Connect + Speak permissions in the target voice channel.

Use the Discord-only native command `/vc join|leave|status` to control sessions. The command uses the account default agent and follows the same allowlist and group policy rules as other Discord commands.

Auto-join example:

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

Notes:

- `voice.tts` overrides `messages.tts` for voice playback only.
- Voice transcript turns derive owner status from Discord `allowFrom` (or `dm.allowFrom`); non-owner speakers cannot access owner-only tools (for example `gateway` and `cron`).
- 語音功能預設為啟用；設定 `channels.discord.voice.enabled=false` 即可停用。
- `voice.daveEncryption` 和 `voice.decryptionFailureTolerance` 會傳遞至 `@discordjs/voice` 的加入選項。
- 若未設定，`@discordjs/voice` 的預設值為 `daveEncryption=true` 和 `decryptionFailureTolerance=24`。
- OpenClaw 也會監控接收解密失敗的情況，並在短時間內連續失敗後，透過離開並重新加入語音頻道來自動復原。
- 如果接收日誌重複顯示 `DecryptionFailed(UnencryptedWhenPassthroughDisabled)`，這可能是上游 `@discordjs/voice` 的接收錯誤，該錯誤追蹤於 [discord.js #11419](https://github.com/discordjs/discord.js/issues/11419)。

## 語音訊息

Discord 語音訊息會顯示波形預覽，並且需要 OGG/Opus 音訊以及元資料。OpenClaw 會自動產生波形，但需要在 Gateway 主機上安裝 `ffmpeg` 和 `ffprobe`，以檢查和轉換音訊檔案。

需求與限制：

- 提供**本地檔案路徑**（不接受 URL）。
- 省略文字內容（Discord 不允許在同一個 payload 中同時包含文字和語音訊息）。
- 接受任何音訊格式；如有需要，OpenClaw 會將其轉換為 OGG/Opus。

範例：

```bash
message(action="send", channel="discord", target="channel:123", path="/path/to/audio.mp3", asVoice=true)
```

## 疑難排解

<AccordionGroup>
  <Accordion title="使用了不允許的 intents 或 Bot 看不到伺服器訊息">

    - 啟用 Message Content Intent
    - 當您依賴使用者/成員解析時，啟用 Server Members Intent
    - 變更 intents 後請重新啟動 gateway

  </Accordion>

  <Accordion title="伺服器訊息意外被阻擋">

    - 驗證 `groupPolicy`
    - 驗證 `channels.discord.guilds` 下的伺服器允許清單
    - 如果伺服器 `channels` map 存在，則僅允許列出的頻道
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

    - `groupPolicy="allowlist"` 但沒有相符的伺服器/頻道允許清單
    - `requireMention` 配置錯誤位置（必須在 `channels.discord.guilds` 或頻道項目下）
    - 發送者被伺服器/頻道 `users` 允許清單封鎖

  </Accordion>

  <Accordion title="Long-running handlers time out or duplicate replies">

    典型日誌：

    - `Listener DiscordMessageListener timed out after 30000ms for event MESSAGE_CREATE`
    - `Slow listener detected ...`
    - `discord inbound worker timed out after ...`

    監聽器預算控制：

    - 單一帳號： `channels.discord.eventQueue.listenerTimeout`
    - 多重帳號： `channels.discord.accounts.<accountId>.eventQueue.listenerTimeout`

    Worker 執行逾時控制：

    - 單一帳號： `channels.discord.inboundWorker.runTimeoutMs`
    - 多重帳號： `channels.discord.accounts.<accountId>.inboundWorker.runTimeoutMs`
    - 預設： `1800000` (30 分鐘)；設定 `0` 以停用

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

    對於緩慢的監聽器設定請使用 `eventQueue.listenerTimeout`，而 `inboundWorker.runTimeoutMs`
    僅在您想要為佇列中的 Agent 輪次設定獨立的安全閥時使用。

  </Accordion>

  <Accordion title="Permissions audit mismatches">
    `channels status --probe` 權限檢查僅適用於數值頻道 ID。

    如果您使用 slug 鍵，執行時期的比對仍然可以運作，但探查無法完全驗證權限。

  </Accordion>

  <Accordion title="DM and pairing issues">

    - DM 已停用： `channels.discord.dm.enabled=false`
    - DM 原則已停用： `channels.discord.dmPolicy="disabled"` (舊版： `channels.discord.dm.policy`)
    - 在 `pairing` 模式中等待配對批准

  </Accordion>

  <Accordion title="Bot to bot loops">
    預設情況下，由 Bot 建立的訊息會被忽略。

    如果您設定 `channels.discord.allowBots=true`，請使用嚴格提及和允許清單規則來避免迴圈行為。
    建議優先使用 `channels.discord.allowBots="mentions"` 以僅接受提及該 Bot 的 Bot 訊息。

  </Accordion>

  <Accordion title="Voice STT drops with DecryptionFailed(...)">

    - 保持 OpenClaw 為最新版本 (`openclaw update`)，以確保存在 Discord 語音接收恢復邏輯
    - 確認 `channels.discord.voice.daveEncryption=true` (預設)
    - 從 `channels.discord.voice.decryptionFailureTolerance=24` (上游預設) 開始，並僅在需要時進行調整
    - 監控日誌中的：
      - `discord voice: DAVE decrypt failures detected`
      - `discord voice: repeated decrypt failures; attempting rejoin`
    - 如果在自動重新加入後持續失敗，請收集日誌並與 [discord.js #11419](https://github.com/discordjs/discord.js/issues/11419) 進行比較

  </Accordion>
</AccordionGroup>

## 配置參考指標

主要參考：

- [配置參考 - Discord](/zh-Hant/gateway/configuration-reference#discord)

高優先級 Discord 欄位：

- 啟動/驗證：`enabled`、`token`、`accounts.*`、`allowBots`
- 策略：`groupPolicy`、`dm.*`、`guilds.*`、`guilds.*.channels.*`
- 指令：`commands.native`、`commands.useAccessGroups`、`configWrites`、`slashCommand.*`
- 事件佇列：`eventQueue.listenerTimeout` (監聽器預算)、`eventQueue.maxQueueSize`、`eventQueue.maxConcurrency`
- 輸入工作器：`inboundWorker.runTimeoutMs`
- 回覆/歷史：`replyToMode`、`historyLimit`、`dmHistoryLimit`、`dms.*.historyLimit`
- 傳送：`textChunkLimit`、`chunkMode`、`maxLinesPerMessage`
- 串流：`streaming` (舊版別名：`streamMode`)、`draftChunk`、`blockStreaming`、`blockStreamingCoalesce`
- 媒體/重試：`mediaMaxMb`、`retry`
  - `mediaMaxMb` 限制傳出 Discord 上傳 (預設：`8MB`)
- 動作：`actions.*`
- presence: `activity`, `status`, `activityType`, `activityUrl`
- UI: `ui.components.accentColor`
- features: `threadBindings`, top-level `bindings[]` (`type: "acp"`), `pluralkit`, `execApprovals`, `intents`, `agentComponents`, `heartbeat`, `responsePrefix`

## 安全性與操作

- 將 Bot 權杖視為機密（在受監控的環境中建議優先使用 `DISCORD_BOT_TOKEN`）。
- 授予最小權限的 Discord 權限。
- 如果指令部署/狀態過時，請重新啟動閘道並使用 `openclaw channels status --probe` 重新檢查。

## 相關內容

- [配對](/zh-Hant/channels/pairing)
- [通道路由](/zh-Hant/channels/channel-routing)
- [多代理路由](/zh-Hant/concepts/multi-agent)
- [疑難排解](/zh-Hant/channels/troubleshooting)
- [斜線指令](/zh-Hant/tools/slash-commands)

import footerZhHant from "/components/footer/zh-Hant.mdx";

<footerZhHant />
