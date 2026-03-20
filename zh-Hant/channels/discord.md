---
summary: "Discord 機器人支援狀態、功能和設定"
read_when:
  - 處理 Discord 頻道功能時
title: "Discord"
---

# Discord (Bot API)

狀態：已準備好透過官方 Discord gateway 使用 DM 和公會頻道。

<CardGroup cols={3}>
  <Card title="配對" icon="link" href="/zh-Hant/channels/pairing">
    Discord 私訊預設為配對模式。
  </Card>
  <Card title="斜線指令" icon="terminal" href="/zh-Hant/tools/slash-commands">
    原生指令行為和指令目錄。
  </Card>
  <Card title="頻道疑難排解" icon="wrench" href="/zh-Hant/channels/troubleshooting">
    跨頻道診斷與修復流程。
  </Card>
</CardGroup>

## 快速設定

您將需要建立一個包含機器人的新應用程式，將機器人加入至您的伺服器，並將其與 OpenClaw 配對。我們建議將您的機器人加入至您自己的私人伺服器。如果您還沒有私人伺服器，請先[建立一個](https://support.discord.com/hc/en-us/articles/204849977-How-do-I-create-a-server)（選擇 **Create My Own > For me and my friends**）。

<Steps>
  <Step title="建立 Discord 應用程式和機器人">
    前往 [Discord 開發者入口網站](https://discord.com/developers/applications) 並點擊 **New Application**。將其命名為類似 "OpenClaw" 的名稱。

    點擊側邊欄上的 **Bot**。將 **Username** 設定為您對 OpenClaw 智慧體的稱呼。

  </Step>

  <Step title="啟用特殊權限意圖">
    仍在 **Bot** 頁面上，向下捲動至 **Privileged Gateway Intents** 並啟用：

    - **Message Content Intent**（必要）
    - **Server Members Intent**（建議；角色允許清單和名稱至 ID 比對所需要）
    - **Presence Intent**（選用；僅狀態更新需要）

  </Step>

  <Step title="複製您的機器人權杖">
    在 **Bot** 頁面上向上捲動並點擊 **Reset Token**。

    <Note>
    儘管名稱如此，但這會產生您的第一個權杖 — 並沒有進行任何「重置」。
    </Note>

    複製該權杖並將其保存在某處。這就是您的 **Bot Token**，稍後您會用到它。

  </Step>

  <Step title="Generate an invite URL and add the bot to your server">
    點擊側邊欄上的 **OAuth2**。您將生成一個具有正確權限的邀請 URL，以便將機器人加入您的伺服器。

    向下捲動至 **OAuth2 URL Generator** 並啟用：

    - `bot`
    - `applications.commands`

    下方將出現 **Bot Permissions** 區塊。啟用：

    - 檢視頻道
    - 傳送訊息
    - 讀取訊息紀錄
    - 嵌入連結
    - 附加檔案
    - 新增反應 (選用)

    複製底部生成的 URL，將其貼到您的瀏覽器中，選擇您的伺服器，然後點擊 **Continue** 進行連線。您現在應該可以在 Discord 伺服器中看到您的機器人了。

  </Step>

  <Step title="Enable Developer Mode and collect your IDs">
    回到 Discord 應用程式，您需要啟用開發者模式才能複製內部 ID。

    1. 點擊 **User Settings** (您的頭像旁的齒輪圖示) → **Advanced** → 切換開啟 **Developer Mode**
    2. 在側邊欄中對您的 **server icon** 點擊右鍵 → **Copy Server ID**
    3. 對您 **own avatar** 點擊右鍵 → **Copy User ID**

    將您的 **Server ID** 和 **User ID** 與您的 Bot Token 一起儲存起來 — 您將在下一步中把這三個都傳送給 OpenClaw。

  </Step>

  <Step title="Allow DMs from server members">
    為了讓配對正常運作，Discord 需要允許您的機器人向您傳送 DM。對您的 **server icon** 點擊右鍵 → **Privacy Settings** → 切換開啟 **Direct Messages**。

    這讓伺服器成員 (包括機器人) 可以向您傳送 DM。如果您想要與 OpenClaw 使用 Discord DM，請保持啟用。如果您僅打算使用公會頻道，則可以在配對後停用 DM。

  </Step>

  <Step title="Step 0: Set your bot token securely (do not send it in chat)">
    您的 Discord 機器人 token 是一個機密 (就像密碼一樣)。在傳送訊息給您的代理人之前，請在執行 OpenClaw 的機器上設定它。

```bash
export DISCORD_BOT_TOKEN="YOUR_BOT_TOKEN"
openclaw config set channels.discord.token --ref-provider default --ref-source env --ref-id DISCORD_BOT_TOKEN --dry-run
openclaw config set channels.discord.token --ref-provider default --ref-source env --ref-id DISCORD_BOT_TOKEN
openclaw config set channels.discord.enabled true --strict-json
openclaw gateway
```

    如果 OpenClaw 已經作為背景服務執行，請改用 `openclaw gateway restart`。

  </Step>

  <Step title="Configure OpenClaw and pair">

    <Tabs>
      <Tab title="Ask your agent">
        在任何現有頻道（例如 Telegram）上與您的 OpenClaw agent 對話並告知它。如果 Discord 是您的第一個頻道，請改用 CLI / config 分頁。

        > "I already set my Discord bot token in config. Please finish Discord setup with User ID `<user_id>` and Server ID `<server_id>`."
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

        預設帳戶的 Env fallback：

```bash
DISCORD_BOT_TOKEN=...
```

        支援純文字 `token` 值。跨 env/file/exec 提供者也支援 `channels.discord.token` 的 SecretRef 值。請參閱 [Secrets Management](/zh-Hant/gateway/secrets)。

      </Tab>
    </Tabs>

  </Step>


  <Step title="Approve first DM pairing">
    等待直到 gateway 運行，然後在 Discord 中傳送私人訊息給您的 bot。它將回傳一個配對碼。

    <Tabs>
      <Tab title="Ask your agent">
        將配對碼傳送給您在現有頻道上的 agent：

        > "Approve this Discord pairing code: `<CODE>`"
      </Tab>
      <Tab title="CLI">

```bash
openclaw pairing list discord
openclaw pairing approve discord <CODE>
```

      </Tab>
    </Tabs>

    配對碼將在 1 小時後過期。

    您現在應該可以透過 DM 在 Discord 上與您的 agent 對話。

  </Step>

</Steps>

<Note>
Token 解析是感知帳戶的。Config token 值優先於 env fallback。`DISCORD_BOT_TOKEN` 僅用於預設帳戶。
對於進階的出站呼叫（訊息工具/頻道動作），該次呼叫會使用明確的每次呼叫 `token`。這適用於傳送和讀取/探測風格的動作（例如 read/search/fetch/thread/pins/permissions）。帳戶原則/重試設定仍來自於作用中 runtime snapshot 中選定的帳戶。
</Note>


## 建議：設定伺服器工作區

一旦 DM 運作正常，您可以將您的 Discord 伺服器設定為完整的工作區，其中每個頻道都會獲得具有自己上下文的智慧體工作階段。建議將此用於只有您和您的機器人的私人伺服器。

<Steps>
  <Step title="將您的伺服器新增到群組允許清單">
    這可讓您的代理程式在您伺服器上的任何頻道中回應，而不僅限於私訊。

    <Tabs>
      <Tab title="詢問您的代理程式">
        > "將我的 Discord 伺服器 ID `<server_id>` 新增到群組允許清單"
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

  <Step title="允許無需 @提及 即可回應">
    根據預設，您的代理程式僅在群組頻道中被 @提及 時才會回應。對於私人伺服器，您可能會希望它回應每則訊息。

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
    根據預設，長期記憶體 (MEMORY.md) 僅會在私訊 (DM) 工作階段中載入。群組頻道不會自動載入 MEMORY.md。

    <Tabs>
      <Tab title="詢問您的代理程式">
        > "當我在 Discord 頻道提問時，如果您需要來自 MEMORY.md 的長期語境，請使用 memory_search 或 memory_get。"
      </Tab>
      <Tab title="手動">
        如果您需要在每個頻道中使用共用語境，請將穩定的指令放在 `AGENTS.md` 或 `USER.md` 中 (它們會為每個工作階段注入)。將長期筆記保留在 `MEMORY.md` 中，並使用記憶體工具按需存取。
      </Tab>
    </Tabs>

  </Step>
</Steps>

現在在您的 Discord 伺服器上建立一些頻道並開始聊天。您的代理程式可以看到頻道名稱，且每個頻道都有自己獨立的工作階段 — 因此您可以設定 `#coding`、`#home`、`#research`，或任何符合您工作流程的頻道。

## 執行階段模型

- Gateway 擁有 Discord 連線。
- 回覆路由是確定性的：Discord 的入站訊息會回覆至 Discord。
- 預設情況下 (`session.dmScope=main`)，直接訊息共用代理主會話 (`agent:main:main`)。
- 公會頻道是隔離的會話金鑰 (`agent:<agentId>:discord:channel:<channelId>`)。
- 群組 DM 預設會被忽略 (`channels.discord.dm.groupEnabled=false`)。
- 原生斜線指令在隔離的指令會話中執行 (`agent:<agentId>:discord:slash:<userId>`)，同時仍將 `CommandTargetSessionKey` 攜帶到路由的對話會話。

## 論壇頻道

Discord 論壇和媒體頻道僅接受貼文。OpenClaw 支援兩種建立方式：

- 傳送訊息到論壇父頻道 (`channel:<forumId>`) 以自動建立討論串。討論串標題使用您訊息的第一個非空行。
- 使用 `openclaw message thread create` 直接建立討論串。對於論壇頻道，請勿傳遞 `--message-id`。

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

論壇父頻道不接受 Discord 元件。如果您需要元件，請傳送到討論串本身 (`channel:<threadId>`)。

## 互動元件

OpenClaw 支援 Discord 元件 v2 容器用於代理訊息。使用帶有 `components` 載荷的訊息工具。互動結果會作為正常入站訊息路由回代理，並遵循現有的 Discord `replyToMode` 設定。

支援的區塊：

- `text`、`section`、`separator`、`actions`、`media-gallery`、`file`
- 動作列允許最多 5 個按鈕或單一選單
- 選取類型：`string`、`user`、`role`、`mentionable`、`channel`

預設情況下，元件為一次性使用。設定 `components.reusable=true` 以允許按鈕、選取器和表單被多次使用，直到過期。

若要限制誰可以點擊按鈕，請在該按鈕上設定 `allowedUsers` (Discord 使用者 ID、標籤或 `*`)。設定後，不符合的使用者會收到暫時性的拒絕回應。

`/model` 和 `/models` 斜線指令會開啟互動式模型選擇器，包含提供者和模型下拉選單以及提交步驟。選擇器的回應是暫時性的，只有呼叫的使用者可以使用。

檔案附件：

- `file` 區塊必須指向附件參照 (`attachment://<filename>`)
- 透過 `media`/`path`/`filePath` 提供附件 (單一檔案)；多個檔案請使用 `media-gallery`
- 當上傳名稱應符合附件參照時，請使用 `filename` 覆寫上傳名稱

模態表單：

- 新增 `components.modal`，最多可包含 5 個欄位
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
  <Tab title="DM 政策">
    `channels.discord.dmPolicy` 控制存取權限 (舊版：`channels.discord.dm.policy`)：

    - `pairing` (預設)
    - `allowlist`
    - `open` (要求 `channels.discord.allowFrom` 包含 `"*"`；舊版：`channels.discord.dm.allowFrom`)
    - `disabled`

    如果 DM 政策未開放，未知的使用者將會被封鎖 (或在 `pairing` 模式下被提示進行配對)。

    多帳號優先順序：

    - `channels.discord.accounts.default.allowFrom` 僅套用於 `default` 帳號。
    - 具名帳號在其自身的 `allowFrom` 未設定時，會繼承 `channels.discord.allowFrom`。
    - 具名帳號不會繼承 `channels.discord.accounts.default.allowFrom`。

    傳送的目標格式：

    - `user:<id>`
    - `<@id>` 提及

    純數字 ID 具有歧義且會被拒絕，除非提供明確的使用者/頻道目標類型。

  </Tab>


  <Tab title="Guild policy">
    Guild 處理由 `channels.discord.groupPolicy` 控制：

    - `open`
    - `allowlist`
    - `disabled`

    當 `channels.discord` 存在時，安全的基準是 `allowlist`。

    `allowlist` 行為：

    - guild 必須符合 `channels.discord.guilds` (`id` 優先，可接受 slug)
    - 可選的傳送者允許清單：`users` (建議使用穩定 ID) 和 `roles` (僅限角色 ID)；如果配置了其中任一項，當傳送者符合 `users` 或 `roles` 時即獲得允許
    - 直接名稱/標籤匹配預設為停用；僅將 `channels.discord.dangerouslyAllowNameMatching: true` 作為緊急相容模式啟用
    - `users` 支援名稱/標籤，但 ID 更安全；當使用名稱/標籤項目時，`openclaw security audit` 會發出警告
    - 如果 guild 已配置 `channels`，則會拒絕未列出的頻道
    - 如果 guild 沒有 `channels` 區塊，則該允許清單 guild 中的所有頻道均被允許

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

    如果您僅設定 `DISCORD_BOT_TOKEN` 且未建立 `channels.discord` 區塊，執行時期回退機制為 `groupPolicy="allowlist"` (並在日誌中發出警告)，即使 `channels.defaults.groupPolicy` 為 `open`。

  </Tab>

  <Tab title="提及與群組 DM">
    公伺服器訊息預設由提及控制。

    提及偵測包括：

    - 明確的機器人提及
    - 設定的提及模式 (`agents.list[].groupChat.mentionPatterns`，後備 `messages.groupChat.mentionPatterns`)
    - 在支援的情況下的隱含回覆機器人行為

    `requireMention` 是針對每個公伺服器/頻道設定的 (`channels.discord.guilds...`)。
    `ignoreOtherMentions` 可選擇性地捨棄提及其他使用者/角色但未提及機器人的訊息 (排除 @everyone/@here)。

    群組 DM：

    - 預設：忽略 (`dm.groupEnabled=false`)
    - 透過 `dm.groupChannels` 的可選允許清單 (頻道 ID 或 slug)

  </Tab>

</Tabs>

### 基於角色的代理路由

使用 `bindings[].match.roles` 根據角色 ID 將 Discord 公伺服器成員路由到不同的代理程式。基於角色的綁定僅接受角色 ID，並在對等或父對等綁定之後以及僅公伺服器綁定之前進行評估。如果綁定也設定了其他相符欄位 (例如 `peer` + `guildId` + `roles`)，則所有設定的欄位都必須相符。

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


  <Accordion title="特殊權限意圖">
    在 **Bot -> Privileged Gateway Intents** 中，啟用：

    - Message Content Intent
    - Server Members Intent (建議)

    Presence intent 是可選的，只有當您想要接收 presence 更新時才需要。設定機器人 presence (`setPresence`) 不需要為成員啟用 presence 更新。

  </Accordion>


  <Accordion title="OAuth 範圍和基礎權限">
    OAuth URL 產生器：

    - 範圍：`bot`、`applications.commands`

    典型的基礎權限：

    - View Channels
    - Send Messages
    - Read Message History
    - Embed Links
    - Attach Files
    - Add Reactions (可選)

    避免使用 `Administrator`，除非明確需要。

  </Accordion>


  <Accordion title="複製 ID">
    啟用 Discord 開發者模式，然後複製：

    - 伺服器 ID
    - 頻道 ID
    - 使用者 ID

    為了可靠的稽核與探測，建議在 OpenClaw 設定中優先使用數值 ID。

  </Accordion>
</AccordionGroup>

## 原生指令與指令授權

- `commands.native` 預設為 `"auto"` 且已針對 Discord 啟用。
- 各頻道覆寫：`channels.discord.commands.native`。
- `commands.native=false` 會明確清除先前註冊的 Discord 原生指令。
- 原生指令授權使用與一般訊息處理相同的 Discord 允許清單/原則。
- 對於未經授權的使用者，指令可能仍會顯示在 Discord 使用者介面中；執行時仍會強制執行 OpenClaw 授權並傳回「未授權」。

請參閱 [斜線指令](/zh-Hant/tools/slash-commands) 以了解指令目錄與行為。

預設斜線指令設定：

- `ephemeral: true`

## 功能詳細資訊

<AccordionGroup>
  <Accordion title="回覆標籤與原生回覆">
    Discord 支援在代理程式輸出中使用回覆標籤：

    - `[[reply_to_current]]`
    - `[[reply_to:<id>]]`

    由 `channels.discord.replyToMode` 控制：

    - `off` (預設)
    - `first`
    - `all`

    注意：`off` 會停用隱含回覆串接。明確的 `[[reply_to_*]]` 標籤仍會受到尊重。

    訊息 ID 會顯示在內容/歷史記錄中，以便代理程式鎖定特定訊息。

  </Accordion>

  <Accordion title="直播串流預覽">
    OpenClaw 可以透過發送暫時訊息並在文字到達時進行編輯，來串流草稿回覆。

    - `channels.discord.streaming` 控制預覽串流 (`off` | `partial` | `block` | `progress`，預設：`off`)。
    - `progress` 為了跨頻道一致性而被接受，並在 Discord 上對應到 `partial`。
    - `channels.discord.streamMode` 是舊版別名，會自動遷移。
    - `partial` 會在 token 到達時編輯單一預覽訊息。
    - `block` 發送草稿大小的區塊（使用 `draftChunk` 來調整大小和斷點）。

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

    `block` 模式區塊劃分預設值（限制為 `channels.discord.textChunkLimit`）：

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

    預覽串流僅限文字；媒體回覆會改為正常傳遞。

    注意：預覽串流與區塊串流是分開的。當針對 Discord 明確啟用區塊串流時，OpenClaw 會跳過預覽串流以避免重複串流。

  </Accordion>

  <Accordion title="歷史紀錄、上下文和執行緒行為">
    Guild 歷史紀錄上下文：

    - `channels.discord.historyLimit` 預設 `20`
    - 後備：`messages.groupChat.historyLimit`
    - `0` 停用

    DM 歷史紀錄控制：

    - `channels.discord.dmHistoryLimit`
    - `channels.discord.dms["<user_id>"].historyLimit`

    執行緒行為：

    - Discord 執行緒作為頻道會話進行路由
    - 父執行緒元資料可用於父會話連結
    - 執行緒設定繼承父頻道設定，除非存在執行緒特定的項目

    頻道主題會被注入為 **不受信任** 的上下文（而非系統提示）。

  </Accordion>

  <Accordion title="子代理的執行緒繫結會話">
    Discord 可以將執行緒繫結到會話目標，以便該執行緒中的後續訊息繼續路由到同一個會話（包括子代理會話）。

    指令：

    - `/focus <target>` 將目前/新執行緒繫結到子代理/會話目標
    - `/unfocus` 移除目前執行緒繫結
    - `/agents` 顯示活躍的執行和繫結狀態
    - `/session idle <duration|off>` 檢查/更新焦點繫結的非活動自動取消焦點
    - `/session max-age <duration|off>` 檢查/更新焦點繫結的硬性最長存留時間

    配置：

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

    註記：

    - `session.threadBindings.*` 設定全域預設值。
    - `channels.discord.threadBindings.*` 覆寫 Discord 行為。
    - `spawnSubagentSessions` 必須為 true 才能為 `sessions_spawn({ thread: true })` 自動建立/繫結執行緒。
    - `spawnAcpSessions` 必須為 true 才能為 ACP（`/acp spawn ... --thread ...` 或 `sessions_spawn({ runtime: "acp", thread: true })`）自動建立/繫結執行緒。
    - 如果帳戶停用了執行緒繫結，`/focus` 和相關的執行緒繫結操作將無法使用。

    參閱 [Sub-agents](/zh-Hant/tools/subagents)、[ACP Agents](/zh-Hant/tools/acp-agents) 和 [Configuration Reference](/zh-Hant/gateway/configuration-reference)。

  </Accordion>


  <Accordion title="持久的 ACP 頻道繫結">
    對於穩定的「永遠線上」ACP 工作區，請設定針對 Discord 對話的頂層類型化 ACP 繫結。

    配置路徑：

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

    註記：

    - 執行緒訊息可以繼承上層頻道的 ACP 繫結。
    - 在已繫結的頻道或執行緒中，`/new` 和 `/reset` 會在原位重設同一個 ACP 會話。
    - 暫時的執行緒繫結仍然有效，並且在啟用時可以覆寫目標解析。

    參閱 [ACP Agents](/zh-Hant/tools/acp-agents) 以了解繫結行為的詳細資訊。

  </Accordion>


  <Accordion title="Reaction notifications">
    各公會反應通知模式：

    - `off`
    - `own`（預設）
    - `all`
    - `allowlist`（使用 `guilds.<id>.users`）

    反應事件會被轉換為系統事件，並附加到路由到的 Discord 會話。

  </Accordion>


  <Accordion title="Ack reactions">
    當 OpenClaw 正在處理傳入訊息時，`ackReaction` 會傳送一個確認表情符號。

    解析順序：

    - `channels.discord.accounts.<accountId>.ackReaction`
    - `channels.discord.ackReaction`
    - `messages.ackReaction`
    - 代理身分表情符號回退（`agents.list[].identity.emoji`，否則為「👀」）

    注意事項：

    - Discord 接受 Unicode 表情符號或自訂表情符號名稱。
    - 使用 `""` 針對頻道或帳號停用反應。

  </Accordion>


  <Accordion title="Config writes">
    預設啟用頻道發起的配置寫入。

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
    透過 HTTP(S) 代理伺服器使用 `channels.discord.proxy` 路由 Discord Gateway WebSocket 流量及啟動 REST 查詢（應用程式 ID + 白名單解析）。

```json5
{
  channels: {
    discord: {
      proxy: "http://proxy.example:8080",
    },
  },
}
```

    各帳號覆寫：

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

    注意事項：

    - 白名單可以使用 `pk:<memberId>`
    - 只有在 `channels.discord.dangerouslyAllowNameMatching: true` 時，才會依名稱/slug 匹配成員顯示名稱
    - 查詢使用原始訊息 ID 並受限於時間視窗
    - 如果查詢失敗，代理訊息將被視為機器人訊息並被捨棄，除非 `allowBots=true`

  </Accordion>


  <Accordion title="Presence configuration">
    Presence updates are applied when you set a status or activity field, or when you enable auto presence.

    Status only example:

```json5
{
  channels: {
    discord: {
      status: "idle",
    },
  },
}
```

    Activity example (custom status is the default activity type):

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

    Streaming example:

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

    Activity type map:

    - 0: Playing
    - 1: Streaming (requires `activityUrl`)
    - 2: Listening
    - 3: Watching
    - 4: Custom (uses the activity text as the status state; emoji is optional)
    - 5: Competing

    Auto presence example (runtime health signal):

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

    Auto presence maps runtime availability to Discord status: healthy => online, degraded or unknown => idle, exhausted or unavailable => dnd. Optional text overrides:

    - `autoPresence.healthyText`
    - `autoPresence.degradedText`
    - `autoPresence.exhaustedText` (supports `{reason}` placeholder)

  </Accordion>

  <Accordion title="Discord 中的執行審批">
    Discord 支援在 DM 中使用基於按鈕的執行審批，並可選擇在原始頻道中張貼審批提示。

    設定路徑：

    - `channels.discord.execApprovals.enabled`
    - `channels.discord.execApprovals.approvers`
    - `channels.discord.execApprovals.target` (`dm` | `channel` | `both`，預設值：`dm`)
    - `agentFilter`、`sessionFilter`、`cleanupAfterResolve`

    當 `target` 為 `channel` 或 `both` 時，審批提示會在頻道中顯示。只有設定的審批者可以使用這些按鈕；其他使用者會收到暫時性的拒絕訊息。審批提示包含指令文字，因此請僅在信任的頻道中啟用頻道傳送。如果無法從 session key 取得頻道 ID，OpenClaw 將會退回使用 DM 傳送。

    此處理程式的 Gateway 驗證使用與其他 Gateway 用戶端相同的共用憑證解析合約：

    - 環境優先的本機驗證 (`OPENCLAW_GATEWAY_TOKEN` / `OPENCLAW_GATEWAY_PASSWORD` 然後是 `gateway.auth.*`)
    - 在本機模式下，僅當 `gateway.auth.*` 未設定時，`gateway.remote.*` 才能作為後備；已設定但未解析的本機 SecretRefs 將會失敗關閉 (fail closed)
    - 適用時透過 `gateway.remote.*` 支援遠端模式
    - URL 覆寫是覆寫安全的：CLI 覆寫不會重複使用隱含憑證，而環境覆寫僅使用環境憑證

    如果審批因未知的審批 ID 而失敗，請驗證審批者清單和功能啟用狀態。

    相關文件：[執行審批](/zh-Hant/tools/exec-approvals)

  </Accordion>
</AccordionGroup>

## 工具和動作閘道

Discord 訊息動作包括訊息傳送、頻道管理、版主管理、狀態和元資料動作。

核心範例：

- 訊息傳遞：`sendMessage`、`readMessages`、`editMessage`、`deleteMessage`、`threadReply`
- 反應：`react`、`reactions`、`emojiList`
- 管理：`timeout`、`kick`、`ban`
- presence: `setPresence`

Action gates 位於 `channels.discord.actions.*` 之下。

Default gate behavior:

| Action group                                                                                                                                                             | Default  |
| ------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | -------- |
| reactions, messages, threads, pins, polls, search, memberInfo, roleInfo, channelInfo, channels, voiceStatus, events, stickers, emojiUploads, stickerUploads, permissions | enabled  |
| roles                                                                                                                                                                    | disabled |
| moderation                                                                                                                                                               | disabled |
| presence                                                                                                                                                                 | disabled |

## Components v2 UI

OpenClaw 使用 Discord 元件 v2 來進行執行核准和跨上下文標記。Discord 訊息動作也可以接受 `components` 以實作自訂 UI（進階；需要 Carbon 元件實例），而舊版的 `embeds` 仍然可用但不建議使用。

- `channels.discord.ui.components.accentColor` 設定 Discord 元件容器所使用的強調色（十六進位）。
- 使用 `channels.discord.accounts.<id>.ui.components.accentColor` 為每個帳戶設定。
- 當存在元件 v2 時，會忽略 `embeds`。

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

- 啟用原生指令（`commands.native` 或 `channels.discord.commands.native`）。
- 設定 `channels.discord.voice`。
- The bot needs Connect + Speak permissions in the target voice channel.

使用 Discord 專有的原生指令 `/vc join|leave|status` 來控制會話。該指令使用帳戶預設代理程式，並遵循與其他 Discord 指令相同的允許清單和群組原則規則。

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

- `voice.tts` 會覆寫 `messages.tts`，僅適用於語音播放。
- 語音文字紀錄輪次會根據 Discord 的 `allowFrom`（或 `dm.allowFrom`）來推斷擁有者狀態；非擁有者的發言者無法存取僅限擁有者的工具（例如 `gateway` 和 `cron`）。
- 語音預設為啟用；設定 `channels.discord.voice.enabled=false` 即可停用。
- `voice.daveEncryption` 和 `voice.decryptionFailureTolerance` 會傳遞至 `@discordjs/voice` 的加入選項。
- 如果未設定，`@discordjs/voice` 的預設值為 `daveEncryption=true` 和 `decryptionFailureTolerance=24`。
- OpenClaw 也會監控接收解密失敗的情況，並在短時間內連續失敗後，透過離開並重新加入語音頻道來自動復原。
- 如果接收日誌重複顯示 `DecryptionFailed(UnencryptedWhenPassthroughDisabled)`，這可能是上游 `@discordjs/voice` 的接收錯誤，此錯誤已在 [discord.js #11419](https://github.com/discordjs/discord.js/issues/11419) 中追蹤。

## 語音訊息

Discord 語音訊息會顯示波形預覽，並需要 OGG/Opus 音訊加上中繼資料。OpenClaw 會自動產生波形，但需要在閘道主機上使用 `ffmpeg` 和 `ffprobe` 來檢查和轉換音訊檔案。

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
  <Accordion title="使用了不允許的意圖或機器人看不到伺服器訊息">

    - 啟用訊息內容意圖 (Message Content Intent)
    - 當您依賴使用者/成員解析時，啟用伺服器成員意圖 (Server Members Intent)
    - 變更意圖後重新啟動閘道

  </Accordion>

  <Accordion title="伺服器訊息意外被阻擋">

    - 驗證 `groupPolicy`
    - 驗證 `channels.discord.guilds` 下的伺服器允許清單
    - 如果伺服器 `channels` 對應存在，則僅允許列出的頻道
    - 驗證 `requireMention` 行為和提及模式

    有用的檢查方式：

```bash
openclaw doctor
openclaw channels status --probe
openclaw logs --follow
```

  </Accordion>

  <Accordion title="設定要求提及為 false 但仍被阻擋">
    常見原因：

    - `groupPolicy="allowlist"` 但沒有對應的伺服器/頻道允許清單
    - `requireMention` 設定在錯誤的位置 (必須在 `channels.discord.guilds` 或頻道項目下)
    - 發送者被伺服器/頻道 `users` 允許清單阻擋

  </Accordion>

  <Accordion title="長時間執行的處理程式逾時或重複回覆">

    典型日誌：

    - `Listener DiscordMessageListener timed out after 30000ms for event MESSAGE_CREATE`
    - `Slow listener detected ...`
    - `discord inbound worker timed out after ...`

    監聽器預算控制參數：

    - 單一帳戶: `channels.discord.eventQueue.listenerTimeout`
    - 多重帳戶: `channels.discord.accounts.<accountId>.eventQueue.listenerTimeout`

    Worker 執行逾時控制參數：

    - 單一帳戶: `channels.discord.inboundWorker.runTimeoutMs`
    - 多重帳戶: `channels.discord.accounts.<accountId>.inboundWorker.runTimeoutMs`
    - 預設值: `1800000` (30 分鐘)；設定 `0` 以停用

    建議的基準設定：

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

    針對緩慢的監聽器設定使用 `eventQueue.listenerTimeout`，並且僅在您想要為佇列中的代理輪次設定獨立的安全閥時使用 `inboundWorker.runTimeoutMs`。

  </Accordion>

  <Accordion title="Permissions audit mismatches">
    `channels status --probe` 權限檢查僅適用於數值頻道 ID。

    如果您使用 slug 金鑰，執行階段比對仍然可以運作，但 probe 無法完全驗證權限。

  </Accordion>

  <Accordion title="DM and pairing issues">

    - DM 已停用：`channels.discord.dm.enabled=false`
    - DM 原則已停用：`channels.discord.dmPolicy="disabled"` (舊版：`channels.discord.dm.policy`)
    - 正在等待 `pairing` 模式下的配對核准

  </Accordion>

  <Accordion title="Bot to bot loops">
    預設會忽略由機器人傳送的訊息。

    如果您設定 `channels.discord.allowBots=true`，請使用嚴格提及與允許清單規則以避免迴圈行為。
    建議優先使用 `channels.discord.allowBots="mentions"`，以僅接受提及該機器人的機器人訊息。

  </Accordion>

  <Accordion title="Voice STT drops with DecryptionFailed(...)">

    - 保持 OpenClaw 為最新版本 (`openclaw update`)，以確保存在 Discord 語音接收復原邏輯
    - 確認 `channels.discord.voice.daveEncryption=true` (預設)
    - 從 `channels.discord.voice.decryptionFailureTolerance=24` (上游預設值) 開始，並僅在需要時進行調整
    - 監看日誌中的以下內容：
      - `discord voice: DAVE decrypt failures detected`
      - `discord voice: repeated decrypt failures; attempting rejoin`
    - 如果自動重新加入後故障持續發生，請收集日誌並與 [discord.js #11419](https://github.com/discordjs/discord.js/issues/11419) 進行比對

  </Accordion>
</AccordionGroup>

## 配置參考指標

主要參考：

- [Configuration reference - Discord](/zh-Hant/gateway/configuration-reference#discord)

高優先級 Discord 欄位：

- startup/auth: `enabled`, `token`, `accounts.*`, `allowBots`
- policy: `groupPolicy`, `dm.*`, `guilds.*`, `guilds.*.channels.*`
- command: `commands.native`, `commands.useAccessGroups`, `configWrites`, `slashCommand.*`
- event queue: `eventQueue.listenerTimeout` (listener budget), `eventQueue.maxQueueSize`, `eventQueue.maxConcurrency`
- 入站 worker：`inboundWorker.runTimeoutMs`
- 回覆/歷史：`replyToMode`、`historyLimit`、`dmHistoryLimit`、`dms.*.historyLimit`
- 遞送：`textChunkLimit`、`chunkMode`、`maxLinesPerMessage`
- 串流：`streaming` (舊版別名：`streamMode`)、`draftChunk`、`blockStreaming`、`blockStreamingCoalesce`
- 媒體/重試：`mediaMaxMb`、`retry`
  - `mediaMaxMb` 限制外傳 Discord 上傳 (預設值：`8MB`)
- 動作：`actions.*`
- 狀態：`activity`、`status`、`activityType`、`activityUrl`
- UI：`ui.components.accentColor`
- 功能：`threadBindings`、頂層 `bindings[]` (`type: "acp"`)、`pluralkit`、`execApprovals`、`intents`、`agentComponents`、`heartbeat`、`responsePrefix`

## 安全性與操作

- 將機器人權杖視為機密資訊 (在受監控環境中建議優先使用 `DISCORD_BOT_TOKEN`)。
- 授予最小權限的 Discord 權限。
- 如果指令部署/狀態過期，請重新啟動 Gateway 並使用 `openclaw channels status --probe` 重新檢查。

## 相關內容

- [配對](/zh-Hant/channels/pairing)
- [頻道路由](/zh-Hant/channels/channel-routing)
- [多代理程式路由](/zh-Hant/concepts/multi-agent)
- [疑難排解](/zh-Hant/channels/troubleshooting)
- [斜線指令](/zh-Hant/tools/slash-commands)

import en from "/components/footer/en.mdx";

<en />
