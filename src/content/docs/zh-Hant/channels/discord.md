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

您將需要建立一個包含機器人的新應用程式，將機器人加入至您的伺服器，並將其與 OpenClaw 配對。我們建議將您的機器人加入至您自己的私人伺服器。如果您還沒有私人伺服器，請先[建立一個](https://support.discord.com/hc/en-us/articles/204849977-How-do-I-create-a-server)（選擇 **Create My Own > For me and my friends**）。

<Steps>
  <Step title="建立 Discord 應用程式和機器人">
    前往 [Discord Developer Portal](https://discord.com/developers/applications) 並點擊 **New Application**。將其命名為類似「OpenClaw」的名稱。

    點擊側邊欄上的 **Bot**。將 **Username** 設定為您對 OpenClaw agent 的稱呼。

  </Step>

  <Step title="啟用特權意圖">
    仍在 **Bot** 頁面上，向下捲動至 **Privileged Gateway Intents** 並啟用：

    - **Message Content Intent**（必需）
    - **Server Members Intent**（建議；角色允許清單和名稱到 ID 匹配所需）
    - **Presence Intent**（可選；僅在需要狀態更新時需要）

  </Step>

  <Step title="複製您的機器人 Token">
    在 **Bot** 頁面上向上捲動並點擊 **Reset Token**。

    <Note>
    顧名思義，這會產生您的第一個 token —— 並沒有東西被「重置」。
    </Note>

    複製該 token 並將其保存在某處。這是您的 **Bot Token**，您稍後會用到它。

  </Step>

  <Step title="Generate an invite URL and add the bot to your server">
    點擊側邊欄上的 **OAuth2**。您將生成一個包含適當權限的邀請 URL，以將機器人添加到您的伺服器。

    向下捲動至 **OAuth2 URL Generator** 並啟用：

    - `bot`
    - `applications.commands`

    下方會出現 **Bot Permissions** 區塊。啟用：

    - 檢視頻道
    - 傳送訊息
    - 讀取訊息紀錄
    - 嵌入連結
    - 附加檔案
    - 新增反應 (可選)

    複製底部生成的 URL，將其貼到您的瀏覽器中，選擇您的伺服器，然後點擊 **Continue (繼續)** 進行連線。您現在應該可以在 Discord 伺服器中看到您的機器人了。

  </Step>

  <Step title="啟用開發者模式並收集您的 ID">
    回到 Discord 應用程式，您需要啟用開發者模式才能複製內部 ID。

    1. 點擊 **User Settings**（頭像旁的齒輪圖示）→ **Advanced** → 開啟 **Developer Mode**
    2. 在側邊欄對您的 **伺服器圖示** 按一下滑鼠右鍵 → **Copy Server ID**
    3. 對 **您自己的大頭貼** 按一下滑鼠右鍵 → **Copy User ID**

    將您的 **Server ID** 和 **User ID** 與您的 Bot Token 一起儲存 — 您將在下一步把這三者都發送給 OpenClaw。

  </Step>

  <Step title="Allow DMs from server members">
    若要進行配對，Discord 需要允許您的機器人向您傳送私人訊息。在 **伺服器圖示** 上按一下滑鼠右鍵 → **隱私權設定** → 開啟 **私人訊息**。

    這可讓伺服器成員（包括機器人）傳送私人訊息給您。如果您想透過 OpenClaw 使用 Discord 私人訊息，請保持此設定啟用。如果您只打算使用公會頻道，則可以在配對完成後停用私人訊息。

  </Step>

  <Step title="Set your bot token securely (do not send it in chat)">
    您的 Discord 機器人權杖是機密資訊（類似於密碼）。請在傳送訊息給您的代理程式之前，在執行 OpenClaw 的機器上進行設定。

```bash
export DISCORD_BOT_TOKEN="YOUR_BOT_TOKEN"
openclaw config set channels.discord.token --ref-provider default --ref-source env --ref-id DISCORD_BOT_TOKEN --dry-run
openclaw config set channels.discord.token --ref-provider default --ref-source env --ref-id DISCORD_BOT_TOKEN
openclaw config set channels.discord.enabled true --strict-json
openclaw gateway
```

    如果 OpenClaw 已作為背景服務執行，請改用 `openclaw gateway restart`。

  </Step>

  <Step title="Configure OpenClaw and pair">

    <Tabs>
      <Tab title="Ask your agent">
        在任何現有頻道（例如 Telegram）上與您的 OpenClaw 代理程式交談，並告知它。如果 Discord 是您的第一個頻道，請改用 CLI / config 分頁。

        > "我已經在設定中設定了我的 Discord 機器人權杖。請使用使用者 ID `<user_id>` 和伺服器 ID `<server_id>` 完成 Discord 設定。"
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

        預設帳戶的 Env 後備方案：

```bash
DISCORD_BOT_TOKEN=...
```

        支援純文字 `token` 值。也跨 env/file/exec 提供者支援 SecretRef 值，用於 `channels.discord.token`。請參閱[機密管理](/en/gateway/secrets)。

      </Tab>
    </Tabs>

  </Step>

  <Step title="Approve first DM pairing">
    等待閘道運行，然後在 Discord 中私訊您的機器人。它將回應一個配對代碼。

    <Tabs>
      <Tab title="Ask your agent">
        將配對代碼傳送給您現有頻道上的代理：

        > "Approve this Discord pairing code: `<CODE>`"
      </Tab>
      <Tab title="CLI">

```bash
openclaw pairing list discord
openclaw pairing approve discord <CODE>
```

      </Tab>
    </Tabs>

    配對代碼將在 1 小時後過期。

    您現在應該可以透過 DM 在 Discord 上與您的代理聊天。

  </Step>
</Steps>

<Note>Token 解析具有帳戶感知能力。Config token 值優先於 env 後備值。`DISCORD_BOT_TOKEN` 僅用於預設帳戶。 對於進階出站呼叫（訊息工具/頻道動作），會使用該呼叫特定的每呼叫明確 `token`。這適用於發送和讀取/探測風格的動作（例如 read/search/fetch/thread/pins/permissions）。帳戶原則/重試設定仍來自活動執行時快照中選定的帳戶。</Note>

## 建議：設定伺服器工作區

一旦私訊（DM）運作正常，您可以將您的 Discord 伺服器設定為完整的工作區，讓每個頻道都擁有自己的代理程式工作階段與上下文。這建議用於僅包含您與您的機器人的私人伺服器。

<Steps>
  <Step title="將您的伺服器新增至伺服器允許清單">
    這可讓您的代理程式在您伺服器上的任何頻道中回應，而不僅限於私訊。

    <Tabs>
      <Tab title="詢問您的代理程式">
        > 「將我的 Discord 伺服器 ID `<server_id>` 新增至伺服器允許清單」
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
    根據預設，您的 Agent 僅在頻道中被 @提及時才會回應。對於私人伺服器，您可能會希望它回應每則訊息。

    <Tabs>
      <Tab title="詢問您的 Agent">
        > 「允許我的 Agent 在此伺服器上回應而無需被 @提及」
      </Tab>
      <Tab title="設定">
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

  <Step title="Plan for memory in guild channels">
    預設情況下，長期記憶（MEMORY.md）僅在 DM 會話中載入。公會頻道不會自動載入 MEMORY.md。

    <Tabs>
      <Tab title="Ask your agent">
        > "當我在 Discord 頻道中提問時，如果你需要來自 MEMORY.md 的長期背景，請使用 memory_search 或 memory_get。"
      </Tab>
      <Tab title="Manual">
        如果您需要每個頻道都有共享背景，請將穩定的指令放在 `AGENTS.md` 或 `USER.md` 中（它們會為每個會話注入）。將長期筆記保留在 `MEMORY.md` 中，並透過記憶工具按需存取。
      </Tab>
    </Tabs>

  </Step>
</Steps>

現在在您的 Discord 伺服器上建立一些頻道並開始聊天。您的代理可以看到頻道名稱，且每個頻道都有自己的獨立會話 — 因此您可以設定 `#coding`、`#home`、`#research` 或任何符合您工作流程的內容。

## 執行時模型

- Gateway 擁有 Discord 連線。
- 回覆路由是確定性的：Discord 的 inbound 回覆會回傳給 Discord。
- 預設情況下 (`session.dmScope=main`)，直接聊天共用代理主會話 (`agent:main:main`)。
- 公會頻道是獨立的會話金鑰 (`agent:<agentId>:discord:channel:<channelId>`)。
- 群組直接訊息預設會被忽略 (`channels.discord.dm.groupEnabled=false`)。
- 原生斜線指令在獨立的指令會話中執行 (`agent:<agentId>:discord:slash:<userId>`)，同時仍將 `CommandTargetSessionKey` 攜帶至路由的對話會話。

## 論壇頻道

Discord 論壇和媒體頻道僅接受討論串貼文。OpenClaw 支援兩種建立方式：

- 傳送訊息至論壇父頻道 (`channel:<forumId>`) 以自動建立主題串。主題串標題使用您訊息中的第一行非空白內容。
- 使用 `openclaw message thread create` 直接建立主題串。針對論壇頻道，請勿傳遞 `--message-id`。

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

論壇父頻道不接受 Discord 元件。如果您需要使用元件，請傳送至主題串本身 (`channel:<threadId>`)。

## 互動元件

OpenClaw 支援針對代理程式訊息使用 Discord 元件 v2 容器。請使用帶有 `components` 載荷的訊息工具。互動結果會以一般傳入訊息的形式路由回代理程式，並遵循現有的 Discord `replyToMode` 設定。

支援的區塊：

- `text`、`section`、`separator`、`actions`、`media-gallery`、`file`
- Action rows 允許最多 5 個按鈕或單一選單
- 選取類型：`string`、`user`、`role`、`mentionable`、`channel`

預設情況下，元件只能使用一次。設定 `components.reusable=true` 以允許按鈕、選取器和表單多次使用，直到過期為止。

若要限制誰可以點擊按鈕，請在該按鈕上設定 `allowedUsers`（Discord 使用者 ID、標記或 `*`）。設定後，不符合的使用者會收到一則暫時性的拒絕訊息。

`/model` 和 `/models` 斜線指令會開啟一個互動式模型選擇器，其中包含供應商和模型下拉選單以及提交步驟。選擇器的回覆是暫時的，只有呼叫的使用者可以使用它。

檔案附件：

- `file` 區塊必須指向附件參考 (`attachment://<filename>`)
- 透過 `media`/`path`/`filePath` 提供附件（單個檔案）；使用 `media-gallery` 來處理多個檔案
- 當上傳名稱應與附件參考相符時，使用 `filename` 來覆寫它

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

## 存取控制與路由

<Tabs>
  <Tab title="DM policy">
    `channels.discord.dmPolicy` 控制存取權限（舊版：`channels.discord.dm.policy`）：

    - `pairing`（預設）
    - `allowlist`
    - `open`（要求 `channels.discord.allowFrom` 包含 `"*"`；舊版：`channels.discord.dm.allowFrom`）
    - `disabled`

    如果 DM 政策未設定為開放，未知使用者將會被封鎖（或在 `pairing` 模式下被提示進行配對）。

    多帳號優先順序：

    - `channels.discord.accounts.default.allowFrom` 僅套用於 `default` 帳號。
    - 具名帳號會在自身 `allowFrom` 未設定時繼承 `channels.discord.allowFrom`。
    - 具名帳號不會繼承 `channels.discord.accounts.default.allowFrom`。

    傳送時的 DM 目標格式：

    - `user:<id>`
    - `<@id>` 提及

    除非提供明確的使用者/頻道目標類型，否則純數字 ID 具有歧義且會被拒絕。

  </Tab>

  <Tab title="Guild policy">
    伺服器處理由 `channels.discord.groupPolicy` 控制：

    - `open`
    - `allowlist`
    - `disabled`

    當存在 `channels.discord` 時，安全的基線是 `allowlist`。

    `allowlist` 行為：

    - 伺服器必須符合 `channels.discord.guilds`（`id` 優先，接受 slug）
    - 可選的發送者允許清單：`users`（建議使用穩定的 ID）和 `roles`（僅限角色 ID）；如果設定了其中任何一個，當發送者符合 `users` 或 `roles` 時即被允許
    - 預設停用直接名稱/標籤匹配；僅將 `channels.discord.dangerouslyAllowNameMatching: true` 啟用作為緊急相容模式
    - `users` 支援名稱/標籤，但 ID 更安全；當使用名稱/標籤條目時 `openclaw security audit` 會發出警告
    - 如果伺服器設定了 `channels`，未列出的頻道會被拒絕
    - 如果伺服器沒有 `channels` 區塊，則該已列入允許清單的伺服器中的所有頻道皆被允許

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

    如果您僅設定 `DISCORD_BOT_TOKEN` 而未建立 `channels.discord` 區塊，執行時期會回退為 `groupPolicy="allowlist"`（並在日誌中發出警告），即使 `channels.defaults.groupPolicy` 是 `open`。

  </Tab>

  <Tab title="提及與群組訊息">
    伺服器訊息預設受提及限制。

    提及偵測包含：

    - 明確提及機器人
    - 設定的提及模式 (`agents.list[].groupChat.mentionPatterns`，後備 `messages.groupChat.mentionPatterns`)
    - 在支援情況下的隱含回覆機器人行為

    `requireMention` 是針對每個伺服器/頻道設定 (`channels.discord.guilds...`)。
    `ignoreOtherMentions` 可選地捨棄提及其他使用者/角色但未提及機器人的訊息 (排除 @everyone/@here)。

    群組訊息：

    - 預設：忽略 (`dm.groupEnabled=false`)
    - 透過 `dm.groupChannels` 的可選允許清單 (頻道 ID 或代碼)

  </Tab>
</Tabs>

### 基於角色的代理路由

使用 `bindings[].match.roles` 根據角色 ID 將 Discord 公會成員路由到不同的代理程式。基於角色的綁定僅接受角色 ID，並在對等或父對等綁定之後、僅限公會的綁定之前進行評估。如果綁定還設定了其他比對欄位（例如 `peer` + `guildId` + `roles`），則所有設定的欄位都必須相符。

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
  <Accordion title="Create app and bot">

    1. Discord Developer Portal -> **Applications** -> **New Application**
    2. **Bot** -> **Add Bot**
    3. Copy bot token

  </Accordion>

  <Accordion title="Privileged intents">
    在 **Bot -> Privileged Gateway Intents** 中，啟用：

    - Message Content Intent（訊息內容意圖）
    - Server Members Intent（伺服器成員意圖，推薦）

    Presence intent（在線狀態意圖）是可選的，只有當您想要接收在線狀態更新時才需要。設置機器人的在線狀態 (`setPresence`) 不需要為成員啟用在線狀態更新。

  </Accordion>

  <Accordion title="OAuth scopes and baseline permissions">
    OAuth URL 生成器：

    - 範圍 (scopes)：`bot`、`applications.commands`

    典型的基礎權限：

    - View Channels（查看頻道）
    - Send Messages（發送訊息）
    - Read Message History（閱讀訊息歷史）
    - Embed Links（嵌入連結）
    - Attach Files（附加檔案）
    - Add Reactions（新增反應，可選）

    除非明確需要，否則避免使用 `Administrator`。

  </Accordion>

  <Accordion title="Copy IDs">
    啟用 Discord 開發者模式，然後複製：

    - server ID
    - channel ID
    - user ID

    在 OpenClaw 設定中優先使用數字 ID，以確保稽核和探測的可靠性。

  </Accordion>
</AccordionGroup>

## 原生指令和指令驗證

- `commands.native` 預設為 `"auto"`，並針對 Discord 啟用。
- 頻道覆蓋設定：`channels.discord.commands.native`。
- `commands.native=false` 會明確清除先前註冊的 Discord 原生指令。
- 原生指令驗證使用與一般訊息處理相同的 Discord 允許清單/原則。
- 對於未獲授權的使用者，指令可能仍會顯示在 Discord UI 中；但執行仍會強制執行 OpenClaw 驗證並回傳「未授權」。

請參閱 [Slash commands](/en/tools/slash-commands) 以了解指令目錄和行為。

預設斜線指令設定：

- `ephemeral: true`

## 功能詳情

<AccordionGroup>
  <Accordion title="Reply tags and native replies">
    Discord 支援在 Agent 輸出中使用回覆標籤：

    - `[[reply_to_current]]`
    - `[[reply_to:<id>]]`

    由 `channels.discord.replyToMode` 控制：

    - `off` (預設)
    - `first`
    - `all`

    注意：`off` 會停用隱式回覆串接。明確的 `[[reply_to_*]]` 標籤仍會被接受。

    訊息 ID 會顯示在上下文/歷史記錄中，以便 Agent 能夠指定特定訊息。

  </Accordion>

  <Accordion title="Live stream preview">
    OpenClaw 可以透過發送暫時訊息並在文字抵達時進行編輯，來串流草稿回覆。

    - `channels.discord.streaming` 控制預覽串流（`off` | `partial` | `block` | `progress`，預設值：`off`）。
    - 預設值保持為 `off`，因為 Discord 的預覽編輯可能會很快達到速率限制，特別是在多個機器人或閘道共用同一個帳戶或伺服器流量時。
    - 為了跨頻道一致性，接受 `progress`，並在 Discord 上對應到 `partial`。
    - `channels.discord.streamMode` 是舊版別名，會自動遷移。
    - `partial` 會在 token 抵達時編輯單一預覽訊息。
    - `block` 會發出草稿大小的區塊（使用 `draftChunk` 來調整大小和中斷點）。

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

    預覽串流僅限文字；媒體回覆會回退到正常傳遞。

    注意：預覽串流與區塊串流是分開的。當 Discord 明確啟用區塊串流時，OpenClaw 會跳過預覽串流以避免雙重串流。

  </Accordion>

  <Accordion title="History, context, and thread behavior">
    Guild 歷史紀錄上下文：

    - `channels.discord.historyLimit` default `20`
    - fallback: `messages.groupChat.historyLimit`
    - `0` disables

    DM 歷史紀錄控制：

    - `channels.discord.dmHistoryLimit`
    - `channels.discord.dms["<user_id>"].historyLimit`

    執行緒行為：

    - Discord 執行緒被作為頻道會話進行路由
    - 父執行緒元資料可用於父會話連結
    - 執行緒設定會繼承父頻道設定，除非存在特定於執行緒的條目

    頻道主題會被作為 **不受信任的** 上下文注入（而非系統提示詞）。

  </Accordion>

  <Accordion title="子代理的執行緒綁定會話">
    Discord 可以將執行緒綁定到會話目標，以便該執行緒中的後續訊息繼續路由到同一個會話（包括子代理會話）。

    指令：

    - `/focus <target>` 將當前/新執行緒綁定到子代理/會話目標
    - `/unfocus` 移除當前執行緒綁定
    - `/agents` 顯示活躍的執行和綁定狀態
    - `/session idle <duration|off>` 檢查/更新聚焦綁定的非活躍自動取消聚焦設定
    - `/session max-age <duration|off>` 檢查/更新聚焦綁定的硬性最大存留時間

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
    - `channels.discord.threadBindings.*` 覆寫 Discord 行為。
    - `spawnSubagentSessions` 必須為 true 才能為 `sessions_spawn({ thread: true })` 自動建立/綁定執行緒。
    - `spawnAcpSessions` 必須為 true 才能為 ACP（`/acp spawn ... --thread ...` 或 `sessions_spawn({ runtime: "acp", thread: true })`）自動建立/綁定執行緒。
    - 如果帳戶停用了執行緒綁定，則 `/focus` 和相關的執行緒綁定操作將無法使用。

    參閱[子代理](/en/tools/subagents)、[ACP 代理](/en/tools/acp-agents)和[設定參考](/en/gateway/configuration-reference)。

  </Accordion>

  <Accordion title="Persistent ACP channel bindings">
    對於穩定的「永遠在線」ACP 工作區，請配置針對 Discord 對話的頂層類型化 ACP 綁定。

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

    注意事項：

    - `/acp spawn codex --bind here` 會就地綁定目前的 Discord 頻道或討論串，並將後續訊息路由至相同的 ACP 工作階段。
    - 這仍然可能意味著「啟動新的 Codex ACP 工作階段」，但它本身不會建立新的 Discord 討論串。現有的頻道會保持作為聊天介面。
    - Codex 可能仍會在磁碟上自己的 `cwd` 或後端工作區中執行。該工作區是執行時狀態，而非 Discord 討論串。
    - 討論串訊息可以繼承上層頻道的 ACP 綁定。
    - 在已綁定的頻道或討論串中，`/new` 和 `/reset` 會就地重設相同的 ACP 工作階段。
    - 臨時討論串綁定仍然有效，並在啟用時可以覆寫目標解析。
    - 只有當 OpenClaw 需要透過 `--thread auto|here` 建立/綁定子討論串時，才需要 `spawnAcpSessions`。對於目前頻道中的 `/acp spawn ... --bind here` 則非必要。

    請參閱 [ACP Agents](/en/tools/acp-agents) 以了解綁定行為的詳細資訊。

  </Accordion>

  <Accordion title="Reaction notifications">
    每個伺服器的反應通知模式：

    - `off`
    - `own` (預設)
    - `all`
    - `allowlist` (使用 `guilds.<id>.users`)

    反應事件會轉換為系統事件，並附加到已路由的 Discord 工作階段。

  </Accordion>

  <Accordion title="Ack reactions">
    當 OpenClaw 正在處理傳入訊息時，`ackReaction` 會發送一個確認回應的 emoji。

    解析順序：

    - `channels.discord.accounts.<accountId>.ackReaction`
    - `channels.discord.ackReaction`
    - `messages.ackReaction`
    - agent identity emoji 後備機制 (`agents.list[].identity.emoji`，否則為 "👀")

    備註：

    - Discord 接受 Unicode emoji 或自訂 emoji 名稱。
    - 使用 `""` 來停用特定頻道或帳號的回應。

  </Accordion>

  <Accordion title="Config writes">
    頻道發起的設定寫入預設為啟用。

    這會影響 `/config set|unset` 流程（當指令功能啟用時）。

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
    透過 HTTP(S) 代理伺服器使用 `channels.discord.proxy` 路由 Discord 閘道 WebSocket 流量以及啟動時期的 REST 查詢（應用程式 ID + 白名單解析）。

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

    備註：

    - allowlists 可以使用 `pk:<memberId>`
    - 僅當 `channels.discord.dangerouslyAllowNameMatching: true` 時，才會透過名稱/slug 比對成員顯示名稱
    - 查詢使用原始訊息 ID，並受限於時間視窗
    - 如果查詢失敗，代理訊息將被視為機器人訊息並丟棄，除非 `allowBots=true`

  </Accordion>

  <Accordion title="Presence configuration">
    當您設定狀態或活動欄位，或啟用自動 Presence 時，會套用 Presence 更新。

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

    活動範例（自訂狀態為預設的活動類型）：

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

    直播範例：

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

    活動類型對應表：

    - 0: Playing (正在遊玩)
    - 1: Streaming (正在直播，需要 `activityUrl`)
    - 2: Listening (正在聆聽)
    - 3: Watching (正在觀看)
    - 4: Custom (自訂，將活動文字作為狀態內容；表情符號為選填)
    - 5: Competing (正在競爭)

    自動 Presence 範例（執行期健康訊號）：

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

    自動 Presence 會將執行期可用性對應至 Discord 狀態：healthy => online (線上)，degraded 或 unknown => idle (閒置)，exhausted 或 unavailable => dnd (請勿打擾)。選用的文字覆寫：

    - `autoPresence.healthyText`
    - `autoPresence.degradedText`
    - `autoPresence.exhaustedText` (支援 `{reason}` 預留位置)

  </Accordion>

  <Accordion title="在 Discord 中執行審批">
    Discord 支援在私訊中進行基於按鈕的執行審批，並可選擇在原始頻道中發佈審批提示。

    配置路徑：

    - `channels.discord.execApprovals.enabled`
    - `channels.discord.execApprovals.approvers`
    - `channels.discord.execApprovals.target` (`dm` | `channel` | `both`，預設值：`dm`)
    - `agentFilter`、`sessionFilter`、`cleanupAfterResolve`

    當 `target` 為 `channel` 或 `both` 時，審批提示會在頻道中顯示。只有已配置的審批者可以使用這些按鈕；其他使用者會收到一個臨時性的拒絕訊息。審批提示包含命令文字，因此僅在受信任的頻道中啟用頻道投遞。如果無法從工作階段金鑰推導出頻道 ID，OpenClaw 將退回到私訊投遞。

    此處理程式的 Gateway 驗證使用與其他 Gateway 用戶端相同的共享憑證解析約定：

    - 環境優先的本機驗證 (`OPENCLAW_GATEWAY_TOKEN` / `OPENCLAW_GATEWAY_PASSWORD` 然後是 `gateway.auth.*`)
    - 在本機模式下，僅當未設定 `gateway.auth.*` 時，`gateway.remote.*` 才能用作後備；已配置但未解析的本機 SecretRefs 將失敗關閉
    - 適用時透過 `gateway.remote.*` 提供遠端模式支援
    - URL 覆蓋是覆蓋安全的：CLI 覆蓋不會重複使用隱式憑證，而環境覆蓋僅使用環境憑證

    如果審批因未知的審批 ID 而失敗，請驗證審批者清單和功能啟用狀態。

    相關文件：[執行審批](/en/tools/exec-approvals)

  </Accordion>
</AccordionGroup>

## 工具和動作閘門

Discord 訊息動作包括傳訊、頻道管理、審核、狀態和元數據動作。

核心範例：

- 訊息傳遞：`sendMessage`、`readMessages`、`editMessage`、`deleteMessage`、`threadReply`
- 反應：`react`、`reactions`、`emojiList`
- 管理：`timeout`、`kick`、`ban`
- 上線狀態：`setPresence`

Action gates 位於 `channels.discord.actions.*` 之下。

預設閘門行為：

| 動作群組                                                                                                                                                                 | 預設   |
| ------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ------ |
| reactions、messages、threads、pins、polls、search、memberInfo、roleInfo、channelInfo、channels、voiceStatus、events、stickers、emojiUploads、stickerUploads、permissions | 已啟用 |
| roles                                                                                                                                                                    | 已停用 |
| moderation                                                                                                                                                               | 已停用 |
| presence                                                                                                                                                                 | 已停用 |

## Components v2 UI

OpenClaw 使用 Discord 組件 v2 進行執行審核和跨情境標記。Discord 訊息動作也可以接受 `components` 以實作自訂 UI（進階；需要 Carbon 組件實例），而舊版 `embeds` 仍然可用，但不建議使用。

- `channels.discord.ui.components.accentColor` 設定 Discord 元件容器使用的強調色（十六進位）。
- 使用 `channels.discord.accounts.<id>.ui.components.accentColor` 為每個帳戶進行設定。
- 當存在 components v2 時，`embeds` 將被忽略。

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

- 啟用原生指令（`commands.native` 或 `channels.discord.commands.native`）。
- 設定 `channels.discord.voice`。
- 機器人在目標語音頻道中需要 Connect + Speak 權限。

使用 Discord 專有的原生指令 `/vc join|leave|status` 來控制會話。該指令使用帳戶預設代理，並遵循與其他 Discord 指令相同的允許清單和群組政策規則。

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

- 對於語音播放，`voice.tts` 會覆蓋 `messages.tts`。
- 語音文字紀錄輪次從 Discord `allowFrom`（或 `dm.allowFrom`）衍生擁有者狀態；非擁有者說話者無法存取僅限擁有者的工具（例如 `gateway` 和 `cron`）。
- 語音功能預設為啟用；設定 `channels.discord.voice.enabled=false` 以停用它。
- `voice.daveEncryption` 和 `voice.decryptionFailureTolerance` 會傳遞至 `@discordjs/voice` 加入選項。
- 若未設定，`@discordjs/voice` 預設值為 `daveEncryption=true` 和 `decryptionFailureTolerance=24`。
- OpenClaw 也會監控接收解密失敗，並在短時間內多次失敗後通過離開/重新加入語音頻道來自動恢復。
- 如果接收日誌重複顯示 `DecryptionFailed(UnencryptedWhenPassthroughDisabled)`，這可能是 [discord.js #11419](https://github.com/discordjs/discord.js/issues/11419) 中追蹤的上游 `@discordjs/voice` 接收錯誤。

## 語音訊息

Discord 語音訊息會顯示波形預覽，並需要 OGG/Opus 音訊加上元數據。OpenClaw 會自動生成波形，但它需要在閘道主機上提供 `ffmpeg` 和 `ffprobe`，以檢查和轉換音訊檔案。

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
  <Accordion title="Used disallowed intents or bot sees no guild messages">

    - 啟用訊息內容意圖
    - 當您依賴使用者/成員解析時，啟用伺服器成員意圖
    - 變更意圖後重新啟動閘道

  </Accordion>

  <Accordion title="公訊息意外被封鎖">

    - 驗證 `groupPolicy`
    - 驗證 `channels.discord.guilds` 下的公許可清單
    - 如果公 `channels` 對應存在，則僅允許列出的頻道
    - 驗證 `requireMention` 行為和提及模式

    有用的檢查：

```bash
openclaw doctor
openclaw channels status --probe
openclaw logs --follow
```

  </Accordion>

  <Accordion title="Require mention 為 false 但仍被封鎖">
    常見原因：

    - `groupPolicy="allowlist"` 但沒有匹配的公/頻道許可清單
    - `requireMention` 配置位置錯誤（必須在 `channels.discord.guilds` 或頻道條目下）
    - 發送者被公/頻道 `users` 許可清單封鎖

  </Accordion>

  <Accordion title="長時間運行的處理程序逾時或重複回覆">

    典型日誌：

    - `Listener DiscordMessageListener timed out after 30000ms for event MESSAGE_CREATE`
    - `Slow listener detected ...`
    - `discord inbound worker timed out after ...`

    監聽器預算旋鈕：

    - 單一帳號：`channels.discord.eventQueue.listenerTimeout`
    - 多帳號：`channels.discord.accounts.<accountId>.eventQueue.listenerTimeout`

    Worker 執行逾時旋鈕：

    - 單一帳號：`channels.discord.inboundWorker.runTimeoutMs`
    - 多帳號：`channels.discord.accounts.<accountId>.inboundWorker.runTimeoutMs`
    - 預設：`1800000` (30 分鐘)；設定 `0` 以停用

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

    使用 `eventQueue.listenerTimeout` 進行緩慢監聽器設定，並且僅在您想要為佇列中的 Agent 交談設置獨立的安全閥時才使用 `inboundWorker.runTimeoutMs`。

  </Accordion>

  <Accordion title="權限稽核不匹配">
    `channels status --probe` 權限檢查僅適用於數值頻道 ID。

    如果您使用 slug 金鑰，執行時期比對仍然可以運作，但 probe 無法完全驗證權限。

  </Accordion>

  <Accordion title="DM 和配對問題">

    - DM 已停用：`channels.discord.dm.enabled=false`
    - DM 原則已停用：`channels.discord.dmPolicy="disabled"` (舊版：`channels.discord.dm.policy`)
    - 正在等待 `pairing` 模式下的配對批准

  </Accordion>

  <Accordion title="Bot to bot loops">
    預設情況下，會忽略由機器人發送的訊息。

    如果您設定了 `channels.discord.allowBots=true`，請使用嚴格的提及與允許清單規則，以避免迴圈行為。
    建議優先使用 `channels.discord.allowBots="mentions"`，以僅接受提及該機器人的機器人訊息。

  </Accordion>

  <Accordion title="Voice STT drops with DecryptionFailed(...)">

    - keep OpenClaw current (`openclaw update`) so the Discord voice receive recovery logic is present
    - confirm `channels.discord.voice.daveEncryption=true` (default)
    - start from `channels.discord.voice.decryptionFailureTolerance=24` (upstream default) and tune only if needed
    - watch logs for:
      - `discord voice: DAVE decrypt failures detected`
      - `discord voice: repeated decrypt failures; attempting rejoin`
    - if failures continue after automatic rejoin, collect logs and compare against [discord.js #11419](https://github.com/discordjs/discord.js/issues/11419)

  </Accordion>
</AccordionGroup>

## 設定參考指標

主要參考：

- [Configuration reference - Discord](/en/gateway/configuration-reference#discord)

高優先級 Discord 欄位：

- startup/auth: `enabled`, `token`, `accounts.*`, `allowBots`
- policy: `groupPolicy`, `dm.*`, `guilds.*`, `guilds.*.channels.*`
- command: `commands.native`, `commands.useAccessGroups`, `configWrites`, `slashCommand.*`
- event queue: `eventQueue.listenerTimeout` (listener budget), `eventQueue.maxQueueSize`, `eventQueue.maxConcurrency`
- inbound worker: `inboundWorker.runTimeoutMs`
- reply/history: `replyToMode`, `historyLimit`, `dmHistoryLimit`, `dms.*.historyLimit`
- delivery: `textChunkLimit`, `chunkMode`, `maxLinesPerMessage`
- streaming: `streaming` (舊版別名: `streamMode`), `draftChunk`, `blockStreaming`, `blockStreamingCoalesce`
- media/retry: `mediaMaxMb`, `retry`
  - `mediaMaxMb` 限制傳出 Discord 上傳 (預設: `8MB`)
- actions: `actions.*`
- presence: `activity`, `status`, `activityType`, `activityUrl`
- UI: `ui.components.accentColor`
- 功能：`threadBindings`、頂層 `bindings[]` (`type: "acp"`)、`pluralkit`、`execApprovals`、`intents`、`agentComponents`、`heartbeat`、`responsePrefix`

## 安全性與操作

- 請將機器人令牌視為機密（在受監控的環境中建議優先使用 `DISCORD_BOT_TOKEN`）。
- 授予最小權限的 Discord 權限。
- 如果指令部署/狀態過時，請重新啟動閘道並使用 `openclaw channels status --probe` 重新檢查。

## 相關

- [配對](/en/channels/pairing)
- [通道路由](/en/channels/channel-routing)
- [多代理路由](/en/concepts/multi-agent)
- [疑難排解](/en/channels/troubleshooting)
- [斜線指令](/en/tools/slash-commands)
