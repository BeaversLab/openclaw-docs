---
summary: "Discord 機器人支援狀態、功能和設定"
read_when:
  - Working on Discord channel features
title: "Discord"
---

透過官方 Discord 閘道準備好處理私訊和公會頻道。

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

您需要建立一個包含機器人的新應用程式，將機器人新增到您的伺服器，並將其與 OpenClaw 配對。我們建議將您的機器人新增到您自己的私人伺服器。如果您還沒有，請先[建立一個](https://support.discord.com/hc/en-us/articles/204849977-How-do-I-create-a-server)（選擇 **Create My Own > For me and my friends**）。

<Steps>
  <Step title="建立 Discord 應用程式和機器人">
    前往 [Discord 開發者入口網站](https://discord.com/developers/applications) 並點擊 **New Application**。將其命名為類似「OpenClaw」的名稱。

    點擊側邊欄上的 **Bot**。將 **Username** 設定為您呼叫 OpenClaw 代理程式的任何名稱。

  </Step>

  <Step title="啟用特權意圖">
    仍在 **Bot** 頁面上，向下捲動至 **Privileged Gateway Intents** 並啟用：

    - **Message Content Intent**（必要）
    - **Server Members Intent**（建議；角色白名單和名稱對 ID 匹配所必需）
    - **Presence Intent**（選用；僅需要狀態更新）

  </Step>

  <Step title="複製您的機器人權杖">
    在 **Bot** 頁面上向上捲動並點擊 **Reset Token**。

    <Note>
    顧名思義，這會產生您的第一個權杖——沒有任何東西被「重置」。
    </Note>

    複製權杖並將其保存在某處。這就是您的 **Bot Token**，稍後您將會需要它。

  </Step>

  <Step title="Generate an invite URL and add the bot to your server">
    在側邊欄點擊 **OAuth2**。您將生成一個具有正確權限的邀請 URL，以便將機器人添加到您的伺服器。

    向下捲動至 **OAuth2 URL Generator** 並啟用：

    - `bot`
    - `applications.commands`

    下方會出現 **Bot Permissions** 區塊。請至少啟用：

    **一般權限 (General Permissions)**
      - 檢視頻道 (View Channels)
    **文字權限 (Text Permissions)**
      - 傳送訊息 (Send Messages)
      - 讀取訊息紀錄 (Read Message History)
      - 嵌入連結 (Embed Links)
      - 附加檔案 (Attach Files)
      - 新增反應 (Add Reactions) (選用)

    這是一般文字頻道的基礎設定。如果您計劃在 Discord 貼文中發布，包括建立或延續貼文的論壇或媒體頻道工作流程，請同時啟用 **在貼文中傳送訊息**。
    複製底部生成的 URL，貼上到您的瀏覽器中，選擇您的伺服器，然後點擊 **繼續** 以連線。您現在應該可以在 Discord 伺服器中看到您的機器人。

  </Step>

  <Step title="Enable Developer Mode and collect your IDs">
    回到 Discord 應用程式，您需要啟用開發者模式，以便複製內部 ID。

    1. 點擊 **用戶設定** (User Settings) (您頭像旁的齒輪圖示) → **進階** (Advanced) → 開啟 **開發者模式** (Developer Mode)
    2. 在側邊欄對 **伺服器圖示** 按一下右鍵 → **複製伺服器 ID** (Copy Server ID)
    3. 對 **您自己的頭像** 按一下右鍵 → **複製用戶 ID** (Copy User ID)

    請將您的 **伺服器 ID** 和 **用戶 ID** 與您的機器人權杖一起保存 — 您將在下一步中把這三個資訊都傳送給 OpenClaw。

  </Step>

  <Step title="Allow DMs from server members">
    為了讓配對能夠正常運作，Discord 需要允許您的機器人傳送私訊給您。對 **伺服器圖示** 按一下右鍵 → **隱私設定** (Privacy Settings) → 開啟 **直接訊息** (Direct Messages)。

    這允許伺服器成員 (包括機器人) 傳送私訊給您。如果您想使用 OpenClaw 的 Discord 私訊功能，請保持此設定為啟用狀態。如果您只打算使用伺服器頻道，可以在配對完成後停用私訊功能。

  </Step>

  <Step title="安全設定您的機器人權杖（請勿在聊天中發送）">
    您的 Discord 機器人權杖是一個機密（類似於密碼）。在傳送訊息給您的代理人之前，請在執行 OpenClaw 的機器上進行設定。

```bash
export DISCORD_BOT_TOKEN="YOUR_BOT_TOKEN"
openclaw config set channels.discord.token --ref-provider default --ref-source env --ref-id DISCORD_BOT_TOKEN --dry-run
openclaw config set channels.discord.token --ref-provider default --ref-source env --ref-id DISCORD_BOT_TOKEN
openclaw config set channels.discord.enabled true --strict-json
openclaw gateway
```

    如果 OpenClaw 已經作為背景服務執行，請透過 OpenClaw Mac 應用程式或停止並重新啟動 `openclaw gateway run` 程序來重新啟動它。

  </Step>

  <Step title="設定 OpenClaw 並配對">

    <Tabs>
      <Tab title="詢問您的代理人">
        在任何現有頻道（例如 Telegram）上與您的 OpenClaw 代理人聊天並告訴它。如果 Discord 是您的第一個頻道，請改用 CLI / 設定分頁。

        > "我已經在設定中設定了我的 Discord 機器人權杖。請使用 User ID `<user_id>` 和 Server ID `<server_id>` 完成 Discord 設定。"
      </Tab>
      <Tab title="CLI / 設定">
        如果您偏好使用檔案式設定，請設定：

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

        預設帳戶的 Env 後援：

```bash
DISCORD_BOT_TOKEN=...
```

        支援純文字 `token` 值。也支援跨 env/file/exec 提供者的 `channels.discord.token` 的 SecretRef 值。請參閱 [機密管理](/zh-Hant/gateway/secrets)。

      </Tab>
    </Tabs>

  </Step>

  <Step title="批准首次 DM 配對">
    等待到閘道開始執行，然後在 Discord 中傳送私訊給您的機器人。它將回應一個配對碼。

    <Tabs>
      <Tab title="詢問您的代理人">
        將配對碼傳送給您在現有頻道上的代理人：

        > "批准此 Discord 配對碼：`<CODE>`"
      </Tab>
      <Tab title="CLI">

```bash
openclaw pairing list discord
openclaw pairing approve discord <CODE>
```

      </Tab>
    </Tabs>

    配對碼在 1 小時後過期。

    您現在應該可以透過 DM 在 Discord 中與您的代理人聊天了。

  </Step>
</Steps>

<Note>Token 解析與帳戶相關。Config token 值優先於 env 後備。`DISCORD_BOT_TOKEN` 僅用於預設帳戶。 對於進階的輸出呼叫（訊息工具/頻道動作），會針對該次呼叫使用明確的 per-call `token`。這適用於傳送和讀取/探測樣式的動作（例如 read/search/fetch/thread/pins/permissions）。帳戶原則/重試設定仍然來自作用中執行時快照中選定的帳戶。</Note>

## 建議：設定公會工作區

一旦 DM 能夠運作，您可以將您的 Discord 伺服器設定為完整的工作區，讓每個頻道都有自己的代理程式工作階段與背景。這適用於只有您和您的機器人的私人伺服器。

<Steps>
  <Step title="將您的伺服器新增至公會允許清單">
    這讓您的代理程式能夠在您伺服器上的任何頻道回應，而不僅限於 DM。

    <Tabs>
      <Tab title="詢問您的代理程式">
        > 「Add my Discord Server ID `<server_id>` to the guild allowlist」
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

  <Step title="允許無需 @mention 即可回應">
    預設情況下，您的代理程式只會在公會頻道中被 @mentioned 時才會回應。對於私人伺服器，您可能希望它回應每則訊息。

    <Tabs>
      <Tab title="詢問您的代理程式">
        > 「Allow my agent to respond on this server without having to be @mentioned」
      </Tab>
      <Tab title="Config">
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

  <Step title="規劃伺服器頻道的記憶體">
    預設情況下，長期記憶 (MEMORY.md) 僅載入於 DM 會話中。伺服器頻道不會自動載入 MEMORY.md。

    <Tabs>
      <Tab title="詢問您的代理程式">
        > "當我在 Discord 頻道提問時，如果您需要來自 MEMORY.md 的長期語境，請使用 memory_search 或 memory_get。"
      </Tab>
      <Tab title="手動">
        如果您需要在每個頻道中使用共享語境，請將穩定的指令放在 `AGENTS.md` 或 `USER.md` 中（它們會為每個會話注入）。將長期筆記保留在 `MEMORY.md` 中，並根據需要使用記憶體工具存取它們。
      </Tab>
    </Tabs>

  </Step>
</Steps>

現在在您的 Discord 伺服器上建立一些頻道並開始聊天。您的代理程式可以看到頻道名稱，且每個頻道都有自己的獨立會話 —— 因此您可以設定 `#coding`、`#home`、`#research`，或任何符合您工作流程的設定。

## 運行時模型

- Gateway 擁有 Discord 連線。
- 回覆路由是確定性的：Discord 的入站訊息會回覆到 Discord。
- Discord 公會/頻道元資料會作為不受信任的語境新增至模型提示中，而不是作為使用者可見的回覆前綴。如果模型複製該信封回來，OpenClaw 會從出站回覆和未來的重播語境中刪除複製的元資料。
- 預設情況下 (`session.dmScope=main`)，直接聊天共用代理程式主會話 (`agent:main:main`)。
- 公會頻道是獨立的會話金鑰 (`agent:<agentId>:discord:channel:<channelId>`)。
- 群組 DM 預設會被忽略 (`channels.discord.dm.groupEnabled=false`)。
- 原生斜線指令在獨立的指令會話中執行 (`agent:<agentId>:discord:slash:<userId>`)，同時仍將 `CommandTargetSessionKey` 傳送到路由的對話會話。
- 僅文字的 cron/heartbeat 公告傳送到 Discord 時，僅使用最終助理可見的答案一次。當代理程式發出多個可傳送的載荷時，媒體和結構化元件載荷仍保持多訊息狀態。

## 論壇頻道

Discord 論壇和媒體頻道僅接受貼文。OpenClaw 支援兩種建立貼文的方式：

- 向論壇父頻道 (`channel:<forumId>`) 發送訊息以自動建立討論串。討論串標題使用您訊息的第一行非空內容。
- 使用 `openclaw message thread create` 直接建立討論串。請勿為論壇頻道傳遞 `--message-id`。

範例：發送到論壇父頻道以建立討論串

```bash
openclaw message send --channel discord --target channel:<forumId> \
  --message "Topic title\nBody of the post"
```

範例：明確建立論壇討論串

```bash
openclaw message thread create --channel discord --target channel:<forumId> \
  --thread-name "Topic title" --message "Body of the post"
```

論壇父頻道不接受 Discord 組件。如果您需要使用組件，請發送到討論串本身 (`channel:<threadId>`)。

## 互動式組件

OpenClaw 支援針對代理訊息的 Discord 組件 v2 容器。使用帶有 `components` 載荷的訊息工具。互動結果會作為一般入站訊息路由回代理，並遵循現有的 Discord `replyToMode` 設定。

支援的區塊：

- `text`, `section`, `separator`, `actions`, `media-gallery`, `file`
- 動作列最多允許 5 個按鈕或單一選單
- 選單類型：`string`, `user`, `role`, `mentionable`, `channel`

預設情況下，組件只能使用一次。設定 `components.reusable=true` 以允許按鈕、選單和表單多次使用，直到過期為止。

若要限制誰可以點擊按鈕，請在該按鈕上設定 `allowedUsers` (Discord 使用者 ID、標籤或 `*`)。設定後，不符的使用者會收到暫時性的拒絕訊息。

`/model` 和 `/models` 斜線指令會開啟互動式模型選擇器，其中包含供應商、模型和相容執行階段下拉選單以及提交步驟。`/models add` 已棄用，現在會傳回棄用訊息，而不是從聊天中註冊模型。選擇器的回覆是暫時性的，只有發出指令的使用者可以使用。

檔案附件：

- `file` 區塊必須指向附件參照 (`attachment://<filename>`)
- 透過 `media`/`path`/`filePath` 提供附件（單個檔案）；如果是多個檔案，請使用 `media-gallery`
- 當上傳名稱應與附件參考相符時，使用 `filename` 覆蓋上傳名稱

Modal 表單：

- 新增 `components.modal`，最多包含 5 個欄位
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

    如果 DM 政策未開放，未知使用者將會被封鎖（或在 `pairing` 模式下被提示配對）。

    多帳號優先順序：

    - `channels.discord.accounts.default.allowFrom` 僅適用於 `default` 帳號。
    - 具名帳號當其自身的 `allowFrom` 未設定時，會繼承 `channels.discord.allowFrom`。
    - 具名帳號不會繼承 `channels.discord.accounts.default.allowFrom`。

    用於傳送的 DM 目標格式：

    - `user:<id>`
    - `<@id>` 提及

    純數字 ID 具有歧義且會被拒絕，除非提供了明確的使用者/頻道目標類型。

  </Tab>

  <Tab title="Guild policy">
    公會處理由 `channels.discord.groupPolicy` 控制：

    - `open`
    - `allowlist`
    - `disabled`

    當存在 `channels.discord` 時，安全基線是 `allowlist`。

    `allowlist` 行為：

    - 公會必須符合 `channels.discord.guilds`（建議使用 `id`，可接受 slug）
    - 可選的發送者允許名單：`users`（建議使用穩定 ID）和 `roles`（僅限角色 ID）；如果配置了其中任何一個，當發送者符合 `users` 或 `roles` 時即被允許
    - 直接名稱/標籤匹配預設為停用；僅將 `channels.discord.dangerouslyAllowNameMatching: true` 作為緊急相容模式啟用
    - `users` 支援名稱/標籤，但 ID 更安全；使用名稱/標籤條目時 `openclaw security audit` 會發出警告
    - 如果公會配置了 `channels`，則會拒絕未列出的頻道
    - 如果公會沒有 `channels` 區塊，則該已加入允許名單的公會中的所有頻道均被允許

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

    如果您只設定 `DISCORD_BOT_TOKEN` 而不建立 `channels.discord` 區塊，執行時期會後援至 `groupPolicy="allowlist"`（日誌中會有警告），即使 `channels.defaults.groupPolicy` 是 `open`。

  </Tab>

  <Tab title="提及與群組 DM">
    伺服器訊息預設由提及觸發。

    提及偵測包含：

    - 明確的機器人提及
    - 設定的提及模式 (`agents.list[].groupChat.mentionPatterns`，後備 `messages.groupChat.mentionPatterns`)
    - 在支援情況下的隱含回覆機器人行為

    `requireMention` 是依據伺服器/頻道設定 (`channels.discord.guilds...`)。
    `ignoreOtherMentions` 可選擇捨棄提及其他使用者/角色但未提及機器人的訊息（排除 @everyone/@here）。

    群組 DM：

    - 預設：忽略 (`dm.groupEnabled=false`)
    - 透過 `dm.groupChannels` 的可選允許清單（頻道 ID 或 slug）

  </Tab>
</Tabs>

### 基於角色的代理路由

使用 `bindings[].match.roles` 依據角色 ID 將 Discord 伺服器成員路由到不同的代理。基於角色的綁定僅接受角色 ID，並在對等或父對等綁定之後、僅伺服器綁定之前進行評估。如果綁定也設定了其他比對欄位（例如 `peer` + `guildId` + `roles`），則所有設定的欄位都必須符合。

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

## 原生指令與指令驗證

- `commands.native` 預設為 `"auto"` 且已針對 Discord 啟用。
- 各頻道覆寫：`channels.discord.commands.native`。
- `commands.native=false` 會明確清除先前註冊的 Discord 原生指令。
- 原生指令驗證使用與一般訊息處理相同的 Discord 允許清單/原則。
- 未獲授權的使用者可能仍會在 Discord UI 中看到這些指令；執行時仍會強制執行 OpenClaw 驗證並回傳「未授權」。

請參閱 [斜線指令](/zh-Hant/tools/slash-commands) 以了解指令目錄與行為。

預設斜線指令設定：

- `ephemeral: true`

## 功能詳情

<AccordionGroup>
  <Accordion title="回覆標籤與原生回覆">
    Discord 支援代理輸出中的回覆標籤：

    - `[[reply_to_current]]`
    - `[[reply_to:<id>]]`

    由 `channels.discord.replyToMode` 控制：

    - `off`（預設值）
    - `first`
    - `all`
    - `batched`

    注意：`off` 會停用隱式回覆串接。明確的 `[[reply_to_*]]` 標籤仍會被採用。
    `first` 總是將隱式原生回覆參照附加至該輪次的第一則外送 Discord 訊息。
    `batched` 僅在
    輸入輪次為多則訊息的去抖動批次時，才會附加 Discord 的隱式原生回覆參照。當您希望原生回覆主要用於不明確的爆發性聊天，而非
    每一則單一訊息輪次時，這非常有用。

    訊息 ID 會顯示在內容/歷史中，以便代理鎖定特定訊息。

  </Accordion>

  <Accordion title="Live stream preview">
    OpenClaw 可以透過發送暫時訊息並在文字到達時進行編輯來串流草稿回覆。`channels.discord.streaming` 接受 `off` (預設) | `partial` | `block` | `progress`。在 Discord 上，`progress` 對應到 `partial`；`streamMode` 是舊版別名，會自動遷移。

    預設值保持 `off`，因為當多個機器人或閘道共用帳戶時，Discord 預覽編輯會很快達到速率限制。

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

    - `partial` 會在 token 到達時編輯單一預覽訊息。
    - `block` 會發出草稿大小的區塊 (使用 `draftChunk` 調整大小和斷點，限制為 `textChunkLimit`)。
    - 媒體、錯誤和明確回覆的最終訊息會取消擱置中的預覽編輯。
    - `streaming.preview.toolProgress` (預設 `true`) 控制工具/進度更新是否重複使用預覽訊息。

    預覽串流僅限文字；媒體回覆會回退到正常傳遞。當明確啟用 `block` 串流時，OpenClaw 會跳過預覽串流以避免重複串流。

  </Accordion>

  <Accordion title="歷史記錄、上下文和執行緒行為">
    Guild 歷史記錄上下文：

    - `channels.discord.historyLimit` 預設 `20`
    - 備援：`messages.groupChat.historyLimit`
    - `0` 停用

    DM 歷史記錄控制：

    - `channels.discord.dmHistoryLimit`
    - `channels.discord.dms["<user_id>"].historyLimit`

    執行緒行為：

    - Discord 執行緒作為頻道會話路由，並繼承父頻道設定，除非另有覆寫。
    - 執行緒會話繼承父頻道的會話層級 `/model` 選擇作為僅限模型的備援；執行緒本地的 `/model` 選擇仍優先採用，且除非啟用對話記錄繼承，否則不會複製父對話記錄歷史。
    - `channels.discord.thread.inheritParent` (預設 `false`) 讓新的自動執行緒選擇從父對話記錄開始植入。每個帳號的覆寫位於 `channels.discord.accounts.<id>.thread.inheritParent` 下。
    - 訊息工具反應可以解析 `user:<id>` DM 目標。
    - `guilds.<guild>.channels.<channel>.requireMention: false` 在回覆階段啟動備援期間會被保留。

    頻道主題會被注入為**不受信任**的上下文。允許清單控制誰可以觸發代理程式，而非完整的補充上下文編輯邊界。

  </Accordion>

  <Accordion title="Thread-bound sessions for subagents">
    Discord 可以將執行緒綁定到工作階段目標，以便該執行緒中的後續訊息繼續路由到相同的工作階段（包括子代理工作階段）。

    指令：

    - `/focus <target>` 將當前/新執行緒綁定到子代理/工作階段目標
    - `/unfocus` 移除當前執行緒綁定
    - `/agents` 顯示活躍執行和綁定狀態
    - `/session idle <duration|off>` 檢查/更新聚焦綁定的非使用自動取消聚焦設定
    - `/session max-age <duration|off>` 檢查/更新聚焦綁定的硬性最大期限

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
    - 如果帳戶停用執行緒綁定，`/focus` 和相關的執行緒綁定操作將無法使用。

    參閱 [Sub-agents](/zh-Hant/tools/subagents)、[ACP Agents](/zh-Hant/tools/acp-agents) 和 [Configuration Reference](/zh-Hant/gateway/configuration-reference)。

  </Accordion>

  <Accordion title="Persistent ACP channel bindings">
    對於穩定的「始終在線」ACP 工作區，請配置針對 Discord 對話的頂層類型化 ACP 綁定。

    配置路徑：

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

    註記：

    - `/acp spawn codex --bind here` 將當前頻道或執行緒原位綁定，並將後續訊息保持在同一個 ACP 會話中。執行緒訊息會繼承父頻道綁定。
    - 在已綁定的頻道或執行緒中，`/new` 和 `/reset` 會在原位重置同一個 ACP 會話。暫時的執行緒綁定在啟用時可以覆蓋目標解析。
    - 只有當 OpenClaw 需要透過 `--thread auto|here` 建立/綁定子執行緒時，才需要 `spawnAcpSessions`。

    詳見 [ACP Agents](/zh-Hant/tools/acp-agents) 以了解綁定行為詳情。

  </Accordion>

  <Accordion title="Reaction notifications">
    每個公會的反應通知模式：

    - `off`
    - `own` (預設)
    - `all`
    - `allowlist` (使用 `guilds.<id>.users`)

    反應事件會被轉換為系統事件，並附加到路由的 Discord 會話。

  </Accordion>

  <Accordion title="Ack reactions">
    當 OpenClaw 正在處理傳入訊息時，`ackReaction` 會發送確認表情符號。

    解析順序：

    - `channels.discord.accounts.<accountId>.ackReaction`
    - `channels.discord.ackReaction`
    - `messages.ackReaction`
    - Agent 身份表情符號備選 (`agents.list[].identity.emoji`，否則為 "👀")

    註記：

    - Discord 接受 Unicode 表情符號或自訂表情符號名稱。
    - 使用 `""` 來停用頻道或帳號的反應功能。

  </Accordion>

  <Accordion title="組態寫入">
    預設啟用通道發起的組態寫入。

    這會影響 `/config set|unset` 流程（當啟用指令功能時）。

    若要停用：

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
    透過 HTTP(S) 代理伺服器使用 `channels.discord.proxy` 路由 Discord 閘道 WebSocket 流量與啟動 REST 查詢（應用程式 ID + 白名單解析）。

```json5
{
  channels: {
    discord: {
      proxy: "http://proxy.example:8080",
    },
  },
}
```

    帳號層級的覆寫：

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

    - 白名單可使用 `pk:<memberId>`
    - 僅當 `channels.discord.dangerouslyAllowNameMatching: true` 時，才會依名稱/slug 符合成員顯示名稱
    - 查詢使用原始訊息 ID 並受限於時間視窗
    - 若查詢失敗，代理訊息將被視為機器人訊息並捨棄，除非 `allowBots=true`

  </Accordion>

  <Accordion title="狀態組態">
    當您設定狀態或活動欄位，或是當您啟用自動狀態時，會套用狀態更新。

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

    - 0: Playing (遊戲中)
    - 1: Streaming (直播中，需要 `activityUrl`)
    - 2: Listening (聆聽中)
    - 3: Watching (觀看中)
    - 4: Custom (自訂，使用活動文字作為狀態 state；emoji 為選用)
    - 5: Competing (競爭中)

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

    自動狀態將執行階段可用性對應到 Discord 狀態：healthy => online (上線)，degraded 或 unknown => idle (閒置)，exhausted 或 unavailable => dnd (請勿打擾)。選用的文字覆寫：

    - `autoPresence.healthyText`
    - `autoPresence.degradedText`
    - `autoPresence.exhaustedText` (支援 `{reason}` 佔位符)

  </Accordion>

  <Accordion title="Discord 中的審核">
    Discord 支援在訊息 (DM) 中透過按鈕進行審核處理，並可選擇在原始頻道中發佈審核提示。

    配置路徑：

    - `channels.discord.execApprovals.enabled`
    - `channels.discord.execApprovals.approvers` (選用；盡可能回退至 `commands.ownerAllowFrom`)
    - `channels.discord.execApprovals.target` (`dm` | `channel` | `both`，預設值：`dm`)
    - `agentFilter`, `sessionFilter`, `cleanupAfterResolve`

    當 `enabled` 未設定或設為 `"auto"`，且至少可以解析出一個審核者（無論是來自 `execApprovals.approvers` 還是 `commands.ownerAllowFrom`）時，Discord 會自動啟用原生執行審核。Discord 不會從頻道 `allowFrom`、舊版 `dm.allowFrom` 或直接訊息 `defaultTo` 推斷執行審核者。設定 `enabled: false` 可明確停用 Discord 作為原生審核用戶端。

    當 `target` 為 `channel` 或 `both` 時，審核提示會顯示在頻道中。只有解析出的審核者可以使用按鈕；其他使用者會收到臨時性的拒絕通知。審核提示包含指令文字，因此僅在受信任的頻道中啟用頻道傳送。如果無法從會話金鑰衍生出頻道 ID，OpenClaw 會回退至訊息傳送。

    Discord 也會呈現其他聊天頻道所使用的共用審核按鈕。原生 Discord 配接器主要新增審核者訊息路由和頻道扇出功能。
    當這些按鈕存在時，它們是主要的審核使用者體驗；當工具結果指出聊天審核無法使用或手動審核是唯一路徑時，OpenClaw 應僅包含手動 `/approve` 指令。

    Gateway 身份驗證和審核解析遵循共用的 Gateway 用戶端合約 (`plugin:` ID 透過 `plugin.approval.resolve` 解析；其他 ID 透過 `exec.approval.resolve` 解析)。審核預設在 30 分鐘後過期。

    參閱 [Exec approvals](/zh-Hant/tools/exec-approvals)。

  </Accordion>
</AccordionGroup>

## 工具和操作閘門

Discord 訊息操作包括訊息傳送、頻道管理、內容審核、狀態和元資料操作。

核心範例：

- 訊息傳送：`sendMessage`、`readMessages`、`editMessage`、`deleteMessage`、`threadReply`
- 反應：`react`、`reactions`、`emojiList`
- 內容審核：`timeout`、`kick`、`ban`
- 狀態：`setPresence`

`event-create` 操作接受一個可選的 `image` 參數（URL 或本機檔案路徑）來設定預定活動的封面圖片。

操作閘門位於 `channels.discord.actions.*` 之下。

預設閘門行為：

| 操作群組                                                                                                                                                                 | 預設   |
| ------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ------ |
| reactions、messages、threads、pins、polls、search、memberInfo、roleInfo、channelInfo、channels、voiceStatus、events、stickers、emojiUploads、stickerUploads、permissions | 啟用   |
| roles                                                                                                                                                                    | 停用   |
| moderation                                                                                                                                                               | 停用   |
| presence                                                                                                                                                                 | 已停用 |

## Components v2 UI

OpenClaw 使用 Discord components v2 進行執行審批和跨上下文標記。Discord 訊息操作也可以接受 `components` 來實現自訂 UI（進階；需要透過 discord 工具建構元件負載），而舊版的 `embeds` 仍然可用，但不建議使用。

- `channels.discord.ui.components.accentColor` 設定 Discord 元件容器所使用的強調顏色（十六進位）。
- 使用 `channels.discord.accounts.<id>.ui.components.accentColor` 為每個帳戶進行設定。
- 當存在 components v2 時，`embeds` 將會被忽略。

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

## 語音

Discord 有兩個不同的語音介面：即時**語音頻道**（持續對話）和**語音訊息附件**（波形預覽格式）。該閘道支援這兩者。

### 語音頻道

設定檢查清單：

1. 在 Discord 開發者入口網站中啟用訊息內容意圖。
2. 當使用角色/使用者允許清單時，啟用伺服器成員意圖。
3. 使用 `bot` 和 `applications.commands` 範圍邀請機器人。
4. 在目標語音頻道中授予 Connect、Speak、Send Messages 和 Read Message History 權限。
5. 啟用原生指令（`commands.native` 或 `channels.discord.commands.native`）。
6. 設定 `channels.discord.voice`。

使用 `/vc join|leave|status` 來控制會話。該指令使用帳戶預設代理程式，並遵循與其他 Discord 指令相同的允許清單和群組原則規則。

```bash
/vc join channel:<voice-channel-id>
/vc status
/vc leave
```

自動加入範例：

```json5
{
  channels: {
    discord: {
      voice: {
        enabled: true,
        model: "openai/gpt-5.4-mini",
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
          openai: { voice: "onyx" },
        },
      },
    },
  },
}
```

備註：

- `voice.tts` 僅針對語音播放覆寫 `messages.tts`。
- `voice.model` 僅覆寫用於 Discord 語音頻道回應的 LLM。將其保留未設定狀態以繼承路由的代理程式模型。
- STT 使用 `tools.media.audio`；`voice.model` 不會影響轉錄。
- 語音轉錄輪次是從 Discord `allowFrom`（或 `dm.allowFrom`）衍生擁有者狀態；非擁有者發言者無法存取僅限擁有者的工具（例如 `gateway` 和 `cron`）。
- 語音功能預設為啟用；設定 `channels.discord.voice.enabled=false` 以停用它。
- `voice.daveEncryption` 和 `voice.decryptionFailureTolerance` 會傳遞至 `@discordjs/voice` 加入選項。
- 如果未設定，`@discordjs/voice` 的預設值為 `daveEncryption=true` 和 `decryptionFailureTolerance=24`。
- OpenClaw 也會監控接收解密失敗，並在短時間內重複失敗後通過離開/重新加入語音頻道來自動恢復。
- 如果更新後接收日誌反覆顯示 `DecryptionFailed(UnencryptedWhenPassthroughDisabled)`，請收集相依性報告和日誌。隨附的 `@discordjs/voice` 版本包含了來自 discord.js PR #11449 的上游填補修補程式，該修補程式解決了 discord.js issue #11419。

語音頻道管線：

- Discord PCM 擷取會轉換為 WAV 暫存檔案。
- `tools.media.audio` 處理 STT，例如 `openai/gpt-4o-mini-transcribe`。
- 轉錄會透過正常的 Discord 進入和路由發送。
- 如果設定 `voice.model`，則僅針對此語音頻道輪次覆寫回應 LLM。
- `voice.tts` 會合併到 `messages.tts` 上；產生的音訊會在已加入的頻道中播放。

憑證是根據組件解析的：`voice.model` 的 LLM 路由驗證、`tools.media.audio` 的 STT 驗證，以及 `messages.tts`/`voice.tts` 的 TTS 驗證。

### 語音訊息

Discord 語音訊息會顯示波形預覽，並且需要 OGG/Opus 音訊。OpenClaw 會自動生成波形，但在閘道主機上需要 `ffmpeg` 和 `ffprobe` 來檢查和轉換。

- 提供一個 **本機檔案路徑** (不接受 URL)。
- 省略文字內容 (Discord 會拒絕在同一個 payload 中同時包含文字和語音訊息)。
- 接受任何音訊格式；OpenClaw 會視需要轉換為 OGG/Opus。

```bash
message(action="send", channel="discord", target="channel:123", path="/path/to/audio.mp3", asVoice=true)
```

## 故障排除

<AccordionGroup>
  <Accordion title="使用了不允許的意圖 或 機器人看不到公會訊息">

    - 啟用訊息內容意圖 (Message Content Intent)
    - 當您依賴使用者/成員解析時，啟用伺服器成員意圖 (Server Members Intent)
    - 更改意圖後重啟閘道

  </Accordion>

  <Accordion title="公會訊息意外被封鎖">

    - 驗證 `groupPolicy`
    - 驗證 `channels.discord.guilds` 下的公會白名單
    - 如果存在公會 `channels` 映射，則僅允許列出的頻道
    - 驗證 `requireMention` 行為和提及模式

    有用的檢查：

```bash
openclaw doctor
openclaw channels status --probe
openclaw logs --follow
```

  </Accordion>

  <Accordion title="要求提及 為 false 但仍被封鎖">
    常見原因：

    - `groupPolicy="allowlist"` 沒有對應的公會/頻道白名單
    - `requireMention` 配置在錯誤的位置 (必須在 `channels.discord.guilds` 或頻道項目下)
    - 發送者被公會/頻道 `users` 白名單封鎖

  </Accordion>

  <Accordion title="長時間執行的處理程序逾時或重複回覆">

    典型日誌：

    - `Listener DiscordMessageListener timed out after 30000ms for event MESSAGE_CREATE`
    - `Slow listener detected ...`
    - `discord inbound worker timed out after ...`

    監聽器預算旋鈕：

    - 單一帳號： `channels.discord.eventQueue.listenerTimeout`
    - 多帳號： `channels.discord.accounts.<accountId>.eventQueue.listenerTimeout`

    Worker 執行逾時旋鈕：

    - 單一帳號： `channels.discord.inboundWorker.runTimeoutMs`
    - 多帳號： `channels.discord.accounts.<accountId>.inboundWorker.runTimeoutMs`
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

    使用 `eventQueue.listenerTimeout` 進行緩慢的監聽器設定，並且只有在您想要為佇列中的 Agent 輪次設定獨立的安全閥時才使用 `inboundWorker.runTimeoutMs`。

  </Accordion>

  <Accordion title="權限稽核不符">
    `channels status --probe` 權限檢查僅適用於數值頻道 ID。

    如果您使用 slug 金鑰，執行時期比對仍然可以運作，但 probe 無法完全驗證權限。

  </Accordion>

  <Accordion title="DM 和配對問題">

    - DM 已停用： `channels.discord.dm.enabled=false`
    - DM 原則已停用： `channels.discord.dmPolicy="disabled"` (舊版： `channels.discord.dm.policy`)
    - 正在 `pairing` 模式下等待配對批准

  </Accordion>

  <Accordion title="Bot 對 Bot 迴圈">
    預設情況下，會忽略由 Bot 所傳送的訊息。

    如果您設定 `channels.discord.allowBots=true`，請使用嚴格提及和允許清單規則來避免迴圈行為。
    建議優先使用 `channels.discord.allowBots="mentions"` 以僅接受提及該 Bot 的 Bot 訊息。

  </Accordion>

  <Accordion title="Voice STT drops with DecryptionFailed(...)">

    - 保持 OpenClaw 為最新版本 (`openclaw update`)，以確保存在 Discord 語音接收恢復邏輯
    - 確認 `channels.discord.voice.daveEncryption=true` (預設值)
    - 從 `channels.discord.voice.decryptionFailureTolerance=24` (上游預設值) 開始，並僅在需要時進行調整
    - 監控日誌中的以下內容：
      - `discord voice: DAVE decrypt failures detected`
      - `discord voice: repeated decrypt failures; attempting rejoin`
    - 如果在自動重新加入後故障仍然持續，請收集日誌並與 [discord.js #11419](https://github.com/discordjs/discord.js/issues/11419) 和 [discord.js #11449](https://github.com/discordjs/discord.js/pull/11449) 中的上游 DAVE 接收歷史記錄進行比較

  </Accordion>
</AccordionGroup>

## 配置參考

主要參考：[Configuration reference - Discord](/zh-Hant/gateway/config-channels#discord)。

<Accordion title="高訊號 Discord 欄位">

- startup/auth: `enabled`, `token`, `accounts.*`, `allowBots`
- policy: `groupPolicy`, `dm.*`, `guilds.*`, `guilds.*.channels.*`
- command: `commands.native`, `commands.useAccessGroups`, `configWrites`, `slashCommand.*`
- event queue: `eventQueue.listenerTimeout` (listener budget), `eventQueue.maxQueueSize`, `eventQueue.maxConcurrency`
- inbound worker: `inboundWorker.runTimeoutMs`
- reply/history: `replyToMode`, `historyLimit`, `dmHistoryLimit`, `dms.*.historyLimit`
- delivery: `textChunkLimit`, `chunkMode`, `maxLinesPerMessage`
- streaming: `streaming` (legacy alias: `streamMode`), `streaming.preview.toolProgress`, `draftChunk`, `blockStreaming`, `blockStreamingCoalesce`
- media/retry: `mediaMaxMb` (caps outbound Discord uploads, default `100MB`), `retry`
- actions: `actions.*`
- presence: `activity`, `status`, `activityType`, `activityUrl`
- UI: `ui.components.accentColor`
- features: `threadBindings`, top-level `bindings[]` (`type: "acp"`), `pluralkit`, `execApprovals`, `intents`, `agentComponents`, `heartbeat`, `responsePrefix`

</Accordion>

## 安全與操作

- 將機器人權杖視為機密（在受監控的環境中，優先使用 `DISCORD_BOT_TOKEN`）。
- 授予最小權限的 Discord 權限。
- 如果指令部署/狀態已過時，請重新啟動 gateway 並使用 `openclaw channels status --probe` 重新檢查。

## 相關內容

<CardGroup cols={2}>
  <Card title="配對" icon="link" href="/zh-Hant/channels/pairing">
    將 Discord 使用者配對至 gateway。
  </Card>
  <Card title="群組" icon="users" href="/zh-Hant/channels/groups">
    群組聊天與允許清單行為。
  </Card>
  <Card title="通道路由" icon="route" href="/zh-Hant/channels/channel-routing">
    將傳入訊息路由至代理程式。
  </Card>
  <Card title="安全性" icon="shield" href="/zh-Hant/gateway/security">
    威脅模型與強化防護。
  </Card>
  <Card title="多代理程式路由" icon="sitemap" href="/zh-Hant/concepts/multi-agent">
    將伺服器 和通道對應至代理程式。
  </Card>
  <Card title="斜線指令" icon="terminal" href="/zh-Hant/tools/slash-commands">
    原生指令行為。
  </Card>
</CardGroup>
