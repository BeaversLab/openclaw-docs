---
summary: "Discord 機器人支援狀態、功能和設定"
read_when:
  - Working on Discord channel features
title: "Discord"
---

# Discord (Bot API)

狀態：已準備好透過官方 Discord 閘道處理私訊和公會頻道。

<CardGroup cols={3}>
  <Card title="配對" icon="link" href="/zh-Hant/channels/pairing">
    Discord 私訊預設為配對模式。
  </Card>
  <Card title="斜線指令" icon="terminal" href="/zh-Hant/tools/slash-commands">
    原生指令行為和指令目錄。
  </Card>
  <Card title="頻道疑難排解" icon="wrench" href="/zh-Hant/channels/troubleshooting">
    跨頻道診斷和修復流程。
  </Card>
</CardGroup>

## 快速設定

您需要建立一個附帶機器人的新應用程式，將機器人加入您的伺服器，並將其與 OpenClaw 配對。我們建議將您的機器人加入您自己的私人伺服器。如果您還沒有私人伺服器，請先[建立一個](https://support.discord.com/hc/en-us/articles/204849977-How-do-I-create-a-server)（選擇 **Create My Own > For me and my friends**）。

<Steps>
  <Step title="建立 Discord 應用程式和機器人">
    前往 [Discord 開發者入口](https://discord.com/developers/applications) 並點擊 **New Application**。將其命名為類似 "OpenClaw" 的名稱。

    點擊側邊欄的 **Bot**。將 **Username** 設定為您對 OpenClaw 代理程式的稱呼。

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

  <Step title="產生邀請 URL 並將機器人加入您的伺服器">
    點擊側邊欄的 **OAuth2**。您將產生一個具有適當權限的邀請 URL，以便將機器人加入您的伺服器。

    向下捲動至 **OAuth2 URL Generator** 並啟用：

    - `bot`
    - `applications.commands`

    下方會出現一個 **Bot Permissions** 區塊。請至少啟用：

    **General Permissions**
      - View Channels
    **Text Permissions**
      - Send Messages
      - Read Message History
      - Embed Links
      - Attach Files
      - Add Reactions (optional)

    這是一般文字頻道的基準設定。如果您計劃在 Discord 執行緒中發佈訊息，包括會建立或延續執行緒的論壇或媒體頻道工作流程，也請啟用 **Send Messages in Threads**。
    複製底部產生的 URL，將其貼到您的瀏覽器中，選擇您的伺服器，然後點擊 **Continue** 以進行連線。您現在應該可以在 Discord 伺服器中看到您的機器人了。

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

  <Step title="安全設定您的機器人權杖（請勿在聊天中傳送）">
    您的 Discord 機器人權杖是個機密（就像密碼一樣）。請在傳送訊息給您的 agent 之前，在執行 OpenClaw 的機器上設定它。

```bash
export DISCORD_BOT_TOKEN="YOUR_BOT_TOKEN"
openclaw config set channels.discord.token --ref-provider default --ref-source env --ref-id DISCORD_BOT_TOKEN --dry-run
openclaw config set channels.discord.token --ref-provider default --ref-source env --ref-id DISCORD_BOT_TOKEN
openclaw config set channels.discord.enabled true --strict-json
openclaw gateway
```

    如果 OpenClaw 已經作為背景服務執行，請透過 OpenClaw Mac 應用程式重新啟動，或是停止並重新啟動 `openclaw gateway run` 程序。

  </Step>

  <Step title="設定 OpenClaw 並配對">

    <Tabs>
      <Tab title="詢問您的代理">
        在任何現有頻道（例如 Telegram）上與您的 OpenClaw 代理對話並告訴它。如果 Discord 是您的第一個頻道，請改用 CLI / config 分頁。

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

        預設帳戶的環境變數後備：

```bash
DISCORD_BOT_TOKEN=...
```

        支援純文字 `token` 值。在 env/file/exec 提供者之間也支援 `channels.discord.token` 的 SecretRef 值。請參閱[機密管理](/zh-Hant/gateway/secrets)。

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

`/model` 和 `/models` 斜線指令會開啟互動式模型選擇器，其中包含提供者和模型下拉選單以及提交步驟。除非 `commands.modelsWrite=false`，否則 `/models add` 也支援從對話中新增新的提供者/模型條目，且新增的模型會立即顯示而無需重新啟動 gateway。選擇器的回應是暫時性的，只有發起的用戶可以使用它。

檔案附件：

- `file` 區塊必須指向附件參照（`attachment://<filename>`）
- 透過 `media`/`path`/`filePath` 提供附件（單一檔案）；使用 `media-gallery` 上傳多個檔案
- 使用 `filename` 覆寫上傳名稱，當其應符合附件參照時

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
    `channels.discord.dmPolicy` 控制 DM 存取（舊版：`channels.discord.dm.policy`）：

    - `pairing`（預設）
    - `allowlist`
    - `open`（要求 `channels.discord.allowFrom` 包含 `"*"`；舊版：`channels.discord.dm.allowFrom`）
    - `disabled`

    如果 DM 政策不是開放，未知使用者會被封鎖（或在 `pairing` 模式下被提示配對）。

    多帳號優先順序：

    - `channels.discord.accounts.default.allowFrom` 僅適用於 `default` 帳號。
    - 具名帳號繼承 `channels.discord.allowFrom`，當其自己的 `allowFrom` 未設定時。
    - 具名帳號不繼承 `channels.discord.accounts.default.allowFrom`。

    傳送的 DM 目標格式：

    - `user:<id>`
    - `<@id>` 提及

    純數字 ID 具有歧義且會被拒絕，除非提供明確的使用者/頻道目標類型。

  </Tab>

  <Tab title="伺服器政策">
    伺服器處理由 `channels.discord.groupPolicy` 控制：

    - `open`
    - `allowlist`
    - `disabled`

    當 `channels.discord` 存在時，安全的預設值是 `allowlist`。

    `allowlist` 的行為：

    - 伺服器必須符合 `channels.discord.guilds`（建議使用 `id`，也接受 slug）
    - 可選的發送者白名單：`users`（建議使用穩定的 ID）和 `roles`（僅限角色 ID）；如果配置了任一項，當發送者符合 `users` 或 `roles` 時即被允許
    - 預設停用直接名稱/標籤匹配；請僅將 `channels.discord.dangerouslyAllowNameMatching: true` 作為緊急相容模式啟用
    - `users` 支援名稱/標籤，但 ID 更安全；當使用名稱/標籤項目時，`openclaw security audit` 會發出警告
    - 如果伺服器配置了 `channels`，非列出的頻道將被拒絕
    - 如果伺服器沒有 `channels` 區塊，該已加入白名單伺服器中的所有頻道皆被允許

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

    如果您僅設定 `DISCORD_BOT_TOKEN` 且未建立 `channels.discord` 區塊，運行時的後備選項是 `groupPolicy="allowlist"`（並在日誌中顯示警告），即使 `channels.defaults.groupPolicy` 是 `open`。

  </Tab>

  <Tab title="提及和群組訊息">
    公訊息預設由提及控制。

    提及偵測包含：

    - 明確的機器人提及
    - 已設定的提及模式 (`agents.list[].groupChat.mentionPatterns`，後備 `messages.groupChat.mentionPatterns`)
    - 支援情況下隱含的回覆機器人行為

    `requireMention` 是依伺服器/頻道設定 (`channels.discord.guilds...`)。
    `ignoreOtherMentions` 可選擇性地捨棄提及其他使用者/身分組但未提及機器人的訊息 (排除 @everyone/@here)。

    群組訊息：

    - 預設：忽略 (`dm.groupEnabled=false`)
    - 透過 `dm.groupChannels` 的可選允許清單 (頻道 ID 或 slug)

  </Tab>
</Tabs>

### 基於角色的代理路由

使用 `bindings[].match.roles` 透過身分組 ID 將 Discord 公會成員路由到不同的代理程式。基於身分組的綁定僅接受身分組 ID，且會在對等或父對等綁定之後、僅公會綁定之前進行評估。如果綁定也設定了其他相符欄位 (例如 `peer` + `guildId` + `roles`)，則所有設定的欄位都必須相符。

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

  <Accordion title="特權意圖">
    在 **Bot -> Privileged Gateway Intents** 中，啟用：

    - Message Content Intent
    - Server Members Intent (推薦)

    Presence intent 是選用的，只有當您想要接收狀態更新時才需要。設定機器人狀態 (`setPresence`) 不需要為成員啟用狀態更新。

  </Accordion>

  <Accordion title="OAuth 範圍和基準權限">
    OAuth URL 產生器：

    - 範圍：`bot`、`applications.commands`

    典型的基準權限：

    **一般權限**
      - View Channels
    **文字權限**
      - Send Messages
      - Read Message History
      - Embed Links
      - Attach Files
      - Add Reactions (選用)

    這是一般文字頻道的基準設定。如果您計劃在 Discord 執行緒中發文，包括建立或繼續執行緒的論壇或媒體頻道工作流程，也請啟用 **Send Messages in Threads**。
    除非明確需要，否則請避免使用 `Administrator`。

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
- 每個頻道的覆寫：`channels.discord.commands.native`。
- `commands.native=false` 會明確清除先前註冊的 Discord 原生指令。
- 原生指令驗證使用與一般訊息處理相同的 Discord 允許清單/原則。
- 對於未獲授權的使用者，指令可能仍會顯示在 Discord UI 中；但執行仍會強制執行 OpenClaw 驗證並回傳「未授權」。

請參閱 [斜線指令](/zh-Hant/tools/slash-commands) 以了解指令目錄和行為。

預設斜線指令設定：

- `ephemeral: true`

## 功能詳情

<AccordionGroup>
  <Accordion title="回覆標籤與原生回覆">
    Discord 支援代理輸出中的回覆標籤：

    - `[[reply_to_current]]`
    - `[[reply_to:<id>]]`

    由 `channels.discord.replyToMode` 控制：

    - `off` (預設)
    - `first`
    - `all`
    - `batched`

    注意：`off` 會停用隱含回覆串接。明確的 `[[reply_to_*]]` 標籤仍會受到採用。
    `first` 總是會將隱含的原生回覆參照附加至該輪次的第一個出站 Discord 訊息。
    `batched` 僅在入站輪次為多則訊息的防抖批次時，才會附加 Discord 的隱含原生回覆參照。當您主要希望針對不明確的突發性交談使用原生回覆，而非針對每一則單一訊息輪次時，這非常有用。

    訊息 ID 會顯示在內容/記錄中，以便代理能鎖定特定訊息。

  </Accordion>

  <Accordion title="即時串流預覽">
    OpenClaw 可以透過傳送暫時訊息並在文字到達時編輯該訊息來串流草稿回覆。

    - `channels.discord.streaming` 控制預覽串流 (`off` | `partial` | `block` | `progress`，預設值：`off`)。
    - 預設值保持 `off`，因為 Discord 的預覽編輯可能會快速觸及速率限制，特別是當多個機器人或閘道共用相同的帳戶或伺服器流量時。
    - 為了跨頻道一致性接受 `progress`，且在 Discord 上會對應至 `partial`。
    - `channels.discord.streamMode` 是舊版別名，會自動遷移。
    - `partial` 會在 Token 到達時編輯單一預覽訊息。
    - `block` 發出草稿大小的區塊（使用 `draftChunk` 來調整大小和斷點）。
    - 媒體、錯誤和明確回覆的最終訊息會取消擱置中的預覽編輯，且在正常傳遞之前不會重新整理暫時草稿。
    - `streaming.preview.toolProgress` 控制工具/進度更新是否重複使用相同的草稿預覽訊息（預設值：`true`）。設定 `false` 以保留分開的工具/進度訊息。

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

    `block` 模式區塊劃分預設值（限制在 `channels.discord.textChunkLimit`）：

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

    預覽串流僅限文字；媒體回覆會退回至正常傳遞。

    注意：預覽串流與區塊串流是分開的。當針對 Discord 明確啟用區塊串流時，OpenClaw 會跳過預覽串流以避免重複串流。

  </Accordion>

  <Accordion title="History, context, and thread behavior">
    Guild 歷史紀錄上下文：

    - `channels.discord.historyLimit` default `20`
    - fallback: `messages.groupChat.historyLimit`
    - `0` disables

    DM 歷史紀錄控制：

    - `channels.discord.dmHistoryLimit`
    - `channels.discord.dms["<user_id>"].historyLimit`

    Thread 行為：

    - Discord threads 被路由為 channel sessions
    - parent thread metadata 可用於 parent-session linkage
    - thread config 繼承 parent channel config，除非存在 thread-specific entry
    - parent transcript inheritance into newly created auto-threads 是 opt-in via `channels.discord.thread.inheritParent` (default `false`)。當 `false` 時，新建立的 Discord thread sessions 從 parent channel transcript 開始獨立；當 `true` 時，parent channel history 會作為新 thread session 的種子
    - per-account overrides 存在於 `channels.discord.accounts.<id>.thread.inheritParent` 下
    - message-tool reactions 可以解析 `user:<id>` DM targets 以及 channel targets
    - `channels.discord.guilds.<guild>.channels.<channel>.requireMention: false` 在 reply-stage activation fallback 期間會被保留，因此設定的 always-on channels 即使在 reply-stage fallback 執行時仍保持 always-on

    Channel topics會被注入為 **untrusted** context（而不是作為 system prompt）。
    Reply 和 quoted-message context 目前保持接收狀態。
    Discord allowlists 主要控制誰可以觸發 agent，而不是完整的 supplemental-context redaction boundary。

  </Accordion>

  <Accordion title="子代理的綁定會話執行緒">
    Discord 可以將執行緒綁定到會話目標，以便該執行緒中的後續訊息繼續路由到同一個會話（包括子代理會話）。

    指令：

    - `/focus <target>` 將當前/新執行緒綁定到子代理/會話目標
    - `/unfocus` 移除當前執行緒綁定
    - `/agents` 顯示活躍的執行和綁定狀態
    - `/session idle <duration|off>` 檢查/更新已聚焦綁定的閒置自動取消聚焦
    - `/session max-age <duration|off>` 檢查/更新已聚焦綁定的硬性最大存留時間

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

    注意：

    - `session.threadBindings.*` 設定全域預設值。
    - `channels.discord.threadBindings.*` 覆寫 Discord 行為。
    - `spawnSubagentSessions` 必須為 true 才能為 `sessions_spawn({ thread: true })` 自動建立/綁定執行緒。
    - `spawnAcpSessions` 必須為 true 才能為 ACP（`/acp spawn ... --thread ...` 或 `sessions_spawn({ runtime: "acp", thread: true })`）自動建立/綁定執行緒。
    - 如果帳戶停用了執行緒綁定，`/focus` 和相關的埁行緒綁定操作將無法使用。

    請參閱[子代理](/zh-Hant/tools/subagents)、[ACP 代理](/zh-Hant/tools/acp-agents)和[配置參考](/zh-Hant/gateway/configuration-reference)。

  </Accordion>

  <Accordion title="Persistent ACP channel bindings">
    對於穩定的「始終在線」ACP 工作區，請設定針對 Discord 對話的頂層類型化 ACP 繫結。

    設定路徑：

    - `bindings[]` with `type: "acp"` and `match.channel: "discord"`

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

    - `/acp spawn codex --bind here` 將目前的 Discord 頻道或執行緒就地繫結，並將未來的訊息路由傳送到同一個 ACP 工作階段。
    - 這仍然可能意味著「啟動一個新的 Codex ACP 工作階段」，但它本身不會建立新的 Discord 執行緒。現有的頻道會保持為聊天介面。
    - Codex 仍可能在自己的 `cwd` 或磁碟上的後端工作區中執行。該工作區是執行時狀態，而不是 Discord 執行緒。
    - 執行緒訊息可以繼承上層頻道的 ACP 繫結。
    - 在已繫結的頻道或執行緒中，`/new` 和 `/reset` 會就地重設同一個 ACP 工作階段。
    - 臨時執行緒繫結仍然有效，並且在啟用時可以覆蓋目標解析。
    - 只有當 OpenClaw 需要透過 `--thread auto|here` 建立/繫結子執行緒時，才需要 `spawnAcpSessions`。對於目前頻道中的 `/acp spawn ... --bind here`，則不需要。

    請參閱 [ACP Agents](/zh-Hant/tools/acp-agents) 以了解繫結行為的詳細資訊。

  </Accordion>

  <Accordion title="Reaction notifications">
    每個公會的反應通知模式：

    - `off`
    - `own` (預設)
    - `all`
    - `allowlist` (使用 `guilds.<id>.users`)

    反應事件會轉換為系統事件，並附加到路由傳送的 Discord 工作階段。

  </Accordion>

  <Accordion title="Ack reactions">
    當 OpenClaw 正在處理傳入訊息時，`ackReaction` 會發送確認表情符號。

    解析順序：

    - `channels.discord.accounts.<accountId>.ackReaction`
    - `channels.discord.ackReaction`
    - `messages.ackReaction`
    - Agent 身份表情符號備選（`agents.list[].identity.emoji`，否則為 "👀"）

    註記：

    - Discord 接受 Unicode 表情符號或自訂表情符號名稱。
    - 使用 `""` 以停用針對特定頻道或帳號的表情符號回應。

  </Accordion>

  <Accordion title="Config writes">
    預設會啟用由頻道發起的設定寫入功能。

    這會影響 `/config set|unset` 流程（當啟用指令功能時）。

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
    使用 `channels.discord.proxy` 透過 HTTP(S) 代理伺服器傳送 Discord Gateway WebSocket 流量以及啟動時的 REST 查詢（應用程式 ID + 允許列表解析）。

```json5
{
  channels: {
    discord: {
      proxy: "http://proxy.example:8080",
    },
  },
}
```

    針對每個帳號的覆寫設定：

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
    啟用 PluralKit 解析以將代理訊息對應至系統成員身份：

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

    - 允許列表可以使用 `pk:<memberId>`
    - 只有在 `channels.discord.dangerouslyAllowNameMatching: true` 時，才會透過名稱/slug 來比對成員顯示名稱
    - 查詢會使用原始訊息 ID 並受到時間視窗限制
    - 如果查詢失敗，除非 `allowBots=true`，否則代理訊息將會被視為機器人訊息並被丟棄

  </Accordion>

  <Accordion title="Presence configuration">
    當您設定狀態或活動欄位，或當您啟用自動狀態時，會套用 Presence 更新。

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
    - 4: Custom (自訂，使用活動文字作為狀態；emoji 為選用)
    - 5: Competing (正在競爭)

    自動狀態範例（執行時期健康狀態訊號）：

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

    自動狀態會將執行時期可用性對應到 Discord 狀態：healthy => online (線上)，degraded 或 unknown => idle (閒置)，exhausted 或 unavailable => dnd (請勿打擾)。選用的文字覆寫：

    - `autoPresence.healthyText`
    - `autoPresence.degradedText`
    - `autoPresence.exhaustedText` (支援 `{reason}` 預留位置)

  </Accordion>

  <Accordion title="Discord 中的審批">
    Discord 支援在 DM 中使用基於按鈕的審批處理，並可選擇在原始頻道中發佈審批提示。

    配置路徑：

    - `channels.discord.execApprovals.enabled`
    - `channels.discord.execApprovals.approvers` (可選；盡可能回退至 `commands.ownerAllowFrom`)
    - `channels.discord.execApprovals.target` (`dm` | `channel` | `both`，預設值：`dm`)
    - `agentFilter`, `sessionFilter`, `cleanupAfterResolve`

    當 `enabled` 未設定或為 `"auto"` 且至少可以解析出一個審批者時（來自 `execApprovals.approvers` 或 `commands.ownerAllowFrom`），Discord 會自動啟用原生 exec 審批。Discord 不會從頻道 `allowFrom`、舊版 `dm.allowFrom` 或直接訊息 `defaultTo` 推斷 exec 審批者。設定 `enabled: false` 以明確停用 Discord 作為原生審批用戶端。

    當 `target` 為 `channel` 或 `both` 時，審批提示在頻道中可見。只有被解析的審批者可以使用按鈕；其他用戶會收到臨時拒絕通知。審批提示包含指令文字，因此請僅在信任的頻道中啟用頻道發送。如果無法從會話金鑰推導頻道 ID，OpenClaw 會回退至 DM 發送。

    Discord 也會渲染其他聊天頻道使用的共用審批按鈕。原生 Discord 配接器主要增加了審批者 DM 路由和頻道分發。
    當存在這些按鈕時，它們是主要的審批 UX；OpenClaw 應僅在工具結果指出
    聊天審批不可用或手動審批是唯一途徑時，包含手動 `/approve` 指令。

    此處理程式的 Gateway 認證使用與其他 Gateway 用戶端相同的共用憑證解析合約：

    - env-first 本地認證 (`OPENCLAW_GATEWAY_TOKEN` / `OPENCLAW_GATEWAY_PASSWORD` 然後 `gateway.auth.*`)
    - 在本地模式下，僅當 `gateway.auth.*` 未設定時，`gateway.remote.*` 才能用作回退；已設定但未解析的本地 SecretRefs 將封閉失敗
    - 適用時透過 `gateway.remote.*` 支援遠端模式
    - URL 覆寫是覆寫安全的：CLI 覆寫不重複使用隱式憑證，env 覆寫僅使用 env 憑證

    審批解析行為：

    - 前綴為 `plugin:` 的 ID 透過 `plugin.approval.resolve` 解析。
    - 其他 ID 透過 `exec.approval.resolve` 解析。
    - Discord 在此處不執行額外的 exec-to-plugin 回退跳躍；
      id 前綴決定它呼叫哪個 gateway 方法。

    預設情況下，Exec 審批會在 30 分鐘後過期。如果審批因未知的
    審批 ID 而失敗，請驗證審批者解析、功能啟用，
    以及已發送的審批 id 種類是否符合擱置中的請求。

    相關文件：[Exec approvals](/zh-Hant/tools/exec-approvals)

  </Accordion>
</AccordionGroup>

## 工具和動作閘門

Discord 訊息動作包括傳訊、頻道管理、審核、狀態和元數據動作。

核心範例：

- 訊息：`sendMessage`、`readMessages`、`editMessage`、`deleteMessage`、`threadReply`
- 反應：`react`、`reactions`、`emojiList`
- 管理：`timeout`、`kick`、`ban`
- 狀態：`setPresence`

`event-create` 動作接受一個可選的 `image` 參數（URL 或本機檔案路徑）來設定排程活動的封面圖片。

動作閘門位於 `channels.discord.actions.*` 之下。

預設閘門行為：

| 動作群組                                                                                                                                                                 | 預設   |
| ------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ------ |
| reactions, messages, threads, pins, polls, search, memberInfo, roleInfo, channelInfo, channels, voiceStatus, events, stickers, emojiUploads, stickerUploads, permissions | 已啟用 |
| roles                                                                                                                                                                    | 已停用 |
| moderation                                                                                                                                                               | 已停用 |
| presence                                                                                                                                                                 | 已停用 |

## 組件 v2 UI

OpenClaw 使用 Discord 組件 v2 進行執行核准和跨上下文標記。Discord 訊息動作也可以接受 `components` 以用於自訂 UI（進階；需要透過 discord 工具建構組件承載），而舊版的 `embeds` 仍然可用但不建議使用。

- `channels.discord.ui.components.accentColor` 設定 Discord 組件容器使用的強調色（十六進位）。
- 使用 `channels.discord.accounts.<id>.ui.components.accentColor` 為每個帳戶進行設定。
- 當存在組件 v2 時，`embeds` 將被忽略。

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

使用 Discord 專用的原生指令 `/vc join|leave|status` 來控制會話。該指令使用帳戶預設代理程式，並遵循與其他 Discord 指令相同的允許清單和群組原則規則。

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

- 對於語音播放，`voice.tts` 會覆寫 `messages.tts`。
- 語音逐字稿輪次從 Discord `allowFrom`（或 `dm.allowFrom`）取得擁有者狀態；非擁有者的發言者無法存取僅限擁有者的工具（例如 `gateway` 和 `cron`）。
- 語音功能預設為啟用；設定 `channels.discord.voice.enabled=false` 以停用它。
- `voice.daveEncryption` 和 `voice.decryptionFailureTolerance` 會傳遞至 `@discordjs/voice` 加入選項。
- `@discordjs/voice` 預設為 `daveEncryption=true` 和 `decryptionFailureTolerance=24` (若未設定)。
- OpenClaw 也會監控接收解密失敗，並在短時間內多次失敗後，透過離開並重新加入語音頻道來自動恢復。
- 如果接收日誌重複顯示 `DecryptionFailed(UnencryptedWhenPassthroughDisabled)`，這可能是上游 `@discordjs/voice` 接收錯誤，追蹤於 [discord.js #11419](https://github.com/discordjs/discord.js/issues/11419)。

## 語音訊息

Discord 語音訊息會顯示波形預覽，並且需要 OGG/Opus 音訊加上元數據。OpenClaw 會自動生成波形，但它需要 `ffmpeg` 和 `ffprobe` 在閘道主機上可用，以檢查和轉換音訊檔案。

需求與限制：

- 提供**本機檔案路徑**（會拒絕 URL）。
- 省略文字內容（Discord 不允許在同一個 payload 中同時包含文字和語音訊息）。
- 接受任何音訊格式；必要時 OpenClaw 會將其轉換為 OGG/Opus。

範例：

```bash
message(action="send", channel="discord", target="channel:123", path="/path/to/audio.mp3", asVoice=true)
```

## 疑難排解

<AccordionGroup>
  <Accordion title="Used disallowed intents or bot sees no guild messages">

    - 啟用 Message Content Intent
    - 當您依賴使用者/成員解析時，啟用 Server Members Intent
    - 更改 intents 後重新啟動 gateway

  </Accordion>

  <Accordion title="Guild messages blocked unexpectedly">

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

  <Accordion title="Require mention false but still blocked">
    常見原因：

    - `groupPolicy="allowlist"` 但沒有匹配的伺服器/頻道允許清單
    - `requireMention` 配置在錯誤的位置 (必須在 `channels.discord.guilds` 或頻道條目下)
    - 發送者被伺服器/頻道 `users` 允許清單封鎖

  </Accordion>

  <Accordion title="Long-running handlers time out or duplicate replies">

    典型日誌：

    - `Listener DiscordMessageListener timed out after 30000ms for event MESSAGE_CREATE`
    - `Slow listener detected ...`
    - `discord inbound worker timed out after ...`

    監聽器預算旋鈕：

    - 單一帳戶：`channels.discord.eventQueue.listenerTimeout`
    - 多帳戶：`channels.discord.accounts.<accountId>.eventQueue.listenerTimeout`

    Worker 執行逾時旋鈕：

    - 單一帳戶：`channels.discord.inboundWorker.runTimeoutMs`
    - 多帳戶：`channels.discord.accounts.<accountId>.inboundWorker.runTimeoutMs`
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

    對於緩慢的監聽器設定，請使用 `eventQueue.listenerTimeout`；只有當您想為排隊的代理轉換設定獨立的安全閥時，才使用 `inboundWorker.runTimeoutMs`。

  </Accordion>

  <Accordion title="Permissions audit mismatches">
    `channels status --probe` 權限檢查僅適用於數值頻道 ID。

    如果您使用 slug 鍵，執行階段匹配仍然可以運作，但探測 無法完全驗證權限。

  </Accordion>

  <Accordion title="DM and pairing issues">

    - DM 已停用：`channels.discord.dm.enabled=false`
    - DM 政策已停用：`channels.discord.dmPolicy="disabled"` (舊版：`channels.discord.dm.policy`)
    - 在 `pairing` 模式下等待配對批准

  </Accordion>

  <Accordion title="Bot to bot loops">
    預設情況下會忽略由 bot 建立的訊息。

    如果您設定 `channels.discord.allowBots=true`，請使用嚴格提及和允許清單規則來避免迴圈行為。
    建議優先使用 `channels.discord.allowBots="mentions"`，以僅接受提及該 bot 的 bot 訊息。

  </Accordion>

  <Accordion title="Voice STT drops with DecryptionFailed(...)">

    - 保持 OpenClaw 為最新版本 (`openclaw update`)，以便存在 Discord 語音接收恢復邏輯
    - 確認 `channels.discord.voice.daveEncryption=true`（預設值）
    - 從 `channels.discord.voice.decryptionFailureTolerance=24`（上游預設值）開始，僅在需要時進行調整
    - 監控日誌中的以下內容：
      - `discord voice: DAVE decrypt failures detected`
      - `discord voice: repeated decrypt failures; attempting rejoin`
    - 如果在自動重新加入後仍然失敗，請收集日誌並與 [discord.js #11419](https://github.com/discordjs/discord.js/issues/11419) 進行比較

  </Accordion>
</AccordionGroup>

## 組態參考指標

主要參考：

- [設定參考 - Discord](/zh-Hant/gateway/configuration-reference#discord)

重要的 Discord 欄位：

- startup/auth: `enabled`, `token`, `accounts.*`, `allowBots`
- policy: `groupPolicy`, `dm.*`, `guilds.*`, `guilds.*.channels.*`
- command: `commands.native`, `commands.useAccessGroups`, `configWrites`, `slashCommand.*`
- event queue: `eventQueue.listenerTimeout` (listener budget), `eventQueue.maxQueueSize`, `eventQueue.maxConcurrency`
- inbound worker: `inboundWorker.runTimeoutMs`
- reply/history: `replyToMode`, `historyLimit`, `dmHistoryLimit`, `dms.*.historyLimit`
- delivery: `textChunkLimit`, `chunkMode`, `maxLinesPerMessage`
- streaming: `streaming` (legacy alias: `streamMode`), `streaming.preview.toolProgress`, `draftChunk`, `blockStreaming`, `blockStreamingCoalesce`
- media/retry: `mediaMaxMb`, `retry`
  - `mediaMaxMb` 限制傳出的 Discord 上傳（預設值：`100MB`）
- actions: `actions.*`
- presence: `activity`, `status`, `activityType`, `activityUrl`
- UI: `ui.components.accentColor`
- features: `threadBindings`, top-level `bindings[]` (`type: "acp"`), `pluralkit`, `execApprovals`, `intents`, `agentComponents`, `heartbeat`, `responsePrefix`

## Safety and operations

- 請將 bot tokens 視為機密（在受監控的環境中建議優先使用 `DISCORD_BOT_TOKEN`）。
- Grant least-privilege Discord permissions.
- 如果指令部署/狀態過期，請重新啟動 gateway 並使用 `openclaw channels status --probe` 重新檢查。

## Related

- [配對](/zh-Hant/channels/pairing)
- [群組](/zh-Hant/channels/groups)
- [通道路由](/zh-Hant/channels/channel-routing)
- [安全性](/zh-Hant/gateway/security)
- [多代理路由](/zh-Hant/concepts/multi-agent)
- [疑難排解](/zh-Hant/channels/troubleshooting)
- [斜線指令](/zh-Hant/tools/slash-commands)
