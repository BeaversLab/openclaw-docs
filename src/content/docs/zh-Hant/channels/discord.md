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
    原生指令行為和指令目錄。
  </Card>
  <Card title="通道疑難排解" icon="wrench" href="/zh-Hant/channels/troubleshooting">
    跨通道診斷和修復流程。
  </Card>
</CardGroup>

## 快速設定

您需要建立一個包含機器人的新應用程式，將機器人新增至您的伺服器，並將其與 OpenClaw 配對。我們建議將機器人新增至您自己的私人伺服器。如果您還沒有私人伺服器，請先[建立一個](https://support.discord.com/hc/en-us/articles/204849977-How-do-I-create-a-server)（選擇 **Create My Own > For me and my friends**）。

<Steps>
  <Step title="建立 Discord 應用程式和機器人">
    前往 [Discord 開發者入口網站](https://discord.com/developers/applications) 並點擊 **New Application**。將其命名為類似「OpenClaw」的名稱。

    點擊側邊欄上的 **Bot**。將 **Username** 設定為您稱呼 OpenClaw 智慧體的任何名稱。

  </Step>

  <Step title="啟用特權意圖">
    仍在 **Bot** 頁面上，向下捲動至 **Privileged Gateway Intents** 並啟用：

    - **Message Content Intent**（必要）
    - **Server Members Intent**（建議；角色允許清單和名稱至 ID 比對所需）
    - **Presence Intent**（選用；僅狀態更新需要）

  </Step>

  <Step title="複製您的機器人權杖">
    在 **Bot** 頁面上向上捲動並點擊 **Reset Token**。

    <Note>
    儘管名稱如此，這會產生您的第一個權杖——並沒有東西被「重置」。
    </Note>

    複製權杖並將其儲存在某處。這是您的 **Bot Token**，您很快就會用到它。

  </Step>

  <Step title="Generate an invite URL and add the bot to your server">
    點擊側邊欄上的 **OAuth2**。您將生成一個具有正確權限的邀請網址，以便將機器人添加到您的伺服器。

    向下捲動到 **OAuth2 URL Generator** 並啟用：

    - `bot`
    - `applications.commands`

    下方會出現一個 **Bot Permissions** 區塊。請至少啟用：

    **一般權限**
      - 檢視頻道
    **文字權限**
      - 傳送訊息
      - 讀取訊息紀錄
      - 嵌入連結
      - 附加檔案
      - 新增反應 (可選)

    這是正常文字頻道的基礎設定。如果您打算在 Discord 貼文 中發布，包括建立或延續貼文串的論壇 或媒體頻道 工作流程，也請啟用 **Send Messages in Threads**。
    複製底部的生成網址，將其貼到您的瀏覽器中，選擇您的伺服器，然後點擊 **Continue** 進行連線。您現在應該可以在 Discord 伺服器中看到您的機器人。

  </Step>

  <Step title="Enable Developer Mode and collect your IDs">
    回到 Discord 應用程式，您需要啟用開發者模式 才能複製內部 ID。

    1. 點擊 **User Settings** (您大頭貼旁邊的齒輪圖示) → **Advanced** → 開啟 **Developer Mode**
    2. 在側邊欄對您的 **伺服器圖示** 點擊右鍵 → **Copy Server ID**
    3. 對 **您自己的大頭貼** 點擊右鍵 → **Copy User ID**

    將您的 **Server ID** 和 **User ID** 與您的 Bot Token 一起儲存 — 您將在下一步中把這三者傳送給 OpenClaw。

  </Step>

  <Step title="Allow DMs from server members">
    為了讓配對 運作，Discord 需要允許您的機器人傳送 DM 給您。對您的 **伺服器圖示** 點擊右鍵 → **Privacy Settings** → 開啟 **Direct Messages**。

    這允許伺服器成員 (包括機器人) 傳送 DM 給您。如果您想與 OpenClaw 一起使用 Discord DM，請保持此設定開啟。如果您只打算使用公會頻道，您可以在配對後關閉 DM。

  </Step>

  <Step title="安全設置您的機器人權杖（請勿在聊天中發送）">
    您的 Discord 機器人權杖是一個秘密（就像密碼一樣）。在向您的代理發送訊息之前，請在運行 OpenClaw 的機器上設置它。

```bash
export DISCORD_BOT_TOKEN="YOUR_BOT_TOKEN"
cat > discord.patch.json5 <<'JSON5'
{
  channels: {
    discord: {
      enabled: true,
      token: { source: "env", provider: "default", id: "DISCORD_BOT_TOKEN" },
    },
  },
}
JSON5
openclaw config patch --file ./discord.patch.json5 --dry-run
openclaw config patch --file ./discord.patch.json5
openclaw gateway
```

    如果 OpenClaw 已作為背景服務運行，請透過 OpenClaw Mac 應用程式重新啟動它，或透過停止並重新啟動 `openclaw gateway run` 進程來重新啟動它。
    對於受管服務安裝，請在存在 `DISCORD_BOT_TOKEN` 的 shell 中執行 `openclaw gateway install`，或將變數儲存在 `~/.openclaw/.env` 中，以便服務在重新啟動後可以解析 env SecretRef。
    如果您的主機被 Discord 的啟動應用程式查詢封鎖或限速，請從開發者門戶設置 Discord 應用程式/客戶端 ID，以便啟動過程可以跳過該 REST 調用。對於預設帳戶請使用 `channels.discord.applicationId`，當您運行多個 Discord 機器人時請使用 `channels.discord.accounts.<accountId>.applicationId`。

  </Step>

  <Step title="Configure OpenClaw and pair">

    <Tabs>
      <Tab title="Ask your agent">
        在任何現有頻道（例如 Telegram）上與您的 OpenClaw 代理人交談並告知它。如果 Discord 是您的第一個頻道，請改用 CLI / 設定分頁。

        > "我已經在設定中設置了我的 Discord 機器人權杖。請使用使用者 ID `<user_id>` 和伺服器 ID `<server_id>` 完成 Discord 設定。"
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

        預設帳戶的環境變數後援：

```bash
DISCORD_BOT_TOKEN=...
```

        對於腳本或遠端設定，請使用 `openclaw config patch --file ./discord.patch.json5 --dry-run` 寫入相同的 JSON5 區塊，然後在不含 `--dry-run` 的情況下重新執行。支援純文字 `token` 值。在 env/file/exec 提供者之間，也支援 `channels.discord.token` 的 SecretRef 值。請參閱[秘密管理](/zh-Hant/gateway/secrets)。

        對於多個 Discord 機器人，請將每個機器人權杖和應用程式 ID 保留在其帳戶下。頂層 `channels.discord.applicationId` 會由帳戶繼承，因此只有在每個帳戶都應使用相同的應用程式 ID 時才在此設定。

```json5
{
  channels: {
    discord: {
      enabled: true,
      accounts: {
        personal: {
          token: { source: "env", provider: "default", id: "DISCORD_PERSONAL_TOKEN" },
          applicationId: "111111111111111111",
        },
        work: {
          token: { source: "env", provider: "default", id: "DISCORD_WORK_TOKEN" },
          applicationId: "222222222222222222",
        },
      },
    },
  },
}
```

      </Tab>
    </Tabs>

  </Step>

  <Step title="Approve first DM pairing">
    等待直到閘道運行，然後在 Discord 中私訊您的機器人。它將回覆一個配對碼。

    <Tabs>
      <Tab title="Ask your agent">
        將配對碼發送到您現有頻道上的代理人：

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

    您現在應該能夠透過私訊在 Discord 中與您的代理人交談。

  </Step>
</Steps>

<Note>
  Token 解析具有帳戶感知能力。配置中的 token 值優先於環境變數後備值。`DISCORD_BOT_TOKEN` 僅用於預設帳戶。 如果兩個已啟用的 Discord 帳戶解析出相同的機器人 token，OpenClaw 將只為該 token 啟動一個閘道監控器。來自配置的 token 優先於預設的環境變數後備值；否則，第一個已啟用的帳戶將獲勝，並且重複的帳戶將被回報為已停用。 對於進階的傳出呼叫（訊息工具/頻道動作），會針對該呼叫使用明確的單次呼叫
  `token`。這適用於傳送和讀取/探測風格的動作（例如 read/search/fetch/thread/pins/permissions）。帳戶策略/重試設定仍來自活躍執行時段快照中選定的帳戶。
</Note>

## 建議：設定公會工作區

一旦 DM 能夠運作，您可以將您的 Discord 伺服器設定為完整的工作區，讓每個頻道都有自己的代理程式工作階段與背景。這適用於只有您和您的機器人的私人伺服器。

<Steps>
  <Step title="將您的伺服器新增到公會允許清單">
    這可讓您的代理程式在您伺服器上的任何頻道中回應，而不僅僅是 DM。

    <Tabs>
      <Tab title="詢問您的代理程式">
        > 「將我的 Discord Server ID `<server_id>` 新增到公會允許清單」
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
    預設情況下，您的代理程式僅在被 @提 及時才會在伺服器頻道中回應。對於私人伺服器，您可能希望它回應每則訊息。

    在伺服器頻道中，正常的助手最終回應預設為私人。可見的 Discord 輸出必須使用 `message` 工具明確發送，因此代理程式預設可以潛伏，僅在決定頻道回應有用時才發布。

    這意味著選定的模型必須可靠地呼叫工具。如果 Discord 顯示輸入中且日誌顯示使用權杖但沒有發布訊息，請檢查會話日誌中是否有帶有 `didSendViaMessagingTool: false` 的助手文字。這意味著模型產生了私人最終答案，而不是呼叫 `message(action=send)`。請切換到更強大的工具呼叫模型，或使用下方的設定來恢復舊版的自動最終回應。

    <Tabs>
      <Tab title="Ask your agent">
        > "Allow my agent to respond on this server without having to be @mentioned"
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

        若要為群組/頻道房間恢復舊版的自動最終回應，請設定 `messages.groupChat.visibleReplies: "automatic"`。

      </Tab>
    </Tabs>

  </Step>

  <Step title="Plan for memory in guild channels">
    預設情況下，長期記憶 (MEMORY.md) 僅載入於 DM 會話中。伺服器頻道不會自動載入 MEMORY.md。

    <Tabs>
      <Tab title="Ask your agent">
        > "When I ask questions in Discord channels, use memory_search or memory_get if you need long-term context from MEMORY.md."
      </Tab>
      <Tab title="Manual">
        如果您在每個頻道中都需要共享上下文，請將穩定的指令放在 `AGENTS.md` 或 `USER.md` 中（它們會在每個會話中注入）。將長期筆記保存在 `MEMORY.md` 中，並使用記憶工具按需存取。
      </Tab>
    </Tabs>

  </Step>
</Steps>

現在在您的 Discord 伺服器上建立一些頻道並開始聊天。您的代理可以看到頻道名稱，且每個頻道都有自己的獨立會話 —— 因此您可以設定 `#coding`、`#home`、`#research` 或任何適合您工作流程的配置。

## 運行時模型

- Gateway 擁有 Discord 連線。
- 回覆路由是確定性的：Discord 的入站訊息會回覆到 Discord。
- Discord 公會/頻道元資料會作為不受信任的語境新增至模型提示中，而不是作為使用者可見的回覆前綴。如果模型複製該信封回來，OpenClaw 會從出站回覆和未來的重播語境中刪除複製的元資料。
- 預設情況下 (`session.dmScope=main`)，直接聊天會共享代理主會話 (`agent:main:main`)。
- 公會頻道是獨立的會話金鑰 (`agent:<agentId>:discord:channel:<channelId>`)。
- 群組訊息預設會被忽略 (`channels.discord.dm.groupEnabled=false`)。
- 原生斜線命令在獨立的命令會話中執行 (`agent:<agentId>:discord:slash:<userId>`)，同時仍然將 `CommandTargetSessionKey` 傳送到路由的對話會話。
- 僅文字的 cron/heartbeat 公告傳送到 Discord 時，僅使用最終助理可見的答案一次。當代理程式發出多個可傳送的載荷時，媒體和結構化元件載荷仍保持多訊息狀態。

## 論壇頻道

Discord 論壇和媒體頻道僅接受貼文。OpenClaw 支援兩種建立貼文的方式：

- 傳送訊息到論壇父頻道 (`channel:<forumId>`) 以自動建立主題串。主題串標題使用您訊息的第一個非空行。
- 使用 `openclaw message thread create` 直接建立主題串。請勿為論壇頻道傳遞 `--message-id`。

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

論壇父頻道不接受 Discord 元件。如果您需要元件，請傳送到主題串本身 (`channel:<threadId>`)。

## 互動式組件

OpenClaw 支援針對代理訊息的 Discord 元件 v2 容器。使用帶有 `components` 載荷的訊息工具。互動結果會作為正常的傳入訊息路由回代理，並遵循現有的 Discord `replyToMode` 設定。

支援的區塊：

- `text`、`section`、`separator`、`actions`、`media-gallery`、`file`
- 動作列最多允許 5 個按鈕或單一選單
- 選擇類型：`string`、`user`、`role`、`mentionable`、`channel`

預設情況下，元件僅能使用一次。設定 `components.reusable=true` 以允許按鈕、選單和表單多次使用，直到過期為止。

若要限制誰可以點擊按鈕，請在該按鈕上設定 `allowedUsers` (Discord 使用者 ID、標籤或 `*`)。設定後，不符合的使用者會收到暫時性的拒絕訊息。

`/model` 和 `/models` 斜線指令會開啟一個互動式模型選擇器，其中包含供應商、模型和相容執行時期的下拉選單，以及一個提交步驟。`/models add` 已被棄用，現在會傳回棄用訊息，而不是從聊天中註冊模型。選擇器的回應是暫時性的，只有發起的使用者可以使用。Discord 選單限制為 25 個選項，因此當您希望選擇器僅顯示特定供應商（例如 `openai-codex` 或 `vllm`）的動態發現模型時，請將 `provider/*` 項目新增至 `agents.defaults.models`。

檔案附件：

- `file` 區塊必須指向附件參照 (`attachment://<filename>`)
- 透過 `media`/`path`/`filePath` 提供附件（單一檔案）；多個檔案請使用 `media-gallery`
- 當上傳名稱應符合附件參照時，請使用 `filename` 覆寫上傳名稱

Modal 表單：

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
  <Tab title="DM 原則">
    `channels.discord.dmPolicy` 控制 DM 存取權限。`channels.discord.allowFrom` 是標準的 DM 允許清單。

    - `pairing` (預設)
    - `allowlist`
    - `open` (需要 `channels.discord.allowFrom` 包含 `"*"`)
    - `disabled`

    如果 DM 原則未設定為開放，未知使用者將會被封鎖 (或在 `pairing` 模式下被提示配對)。

    多帳號優先順序：

    - `channels.discord.accounts.default.allowFrom` 僅套用於 `default` 帳號。
    - 對於單一帳號，`allowFrom` 的優先順序高於舊版 `dm.allowFrom`。
    - 當具名帳號自己的 `allowFrom` 和舊版 `dm.allowFrom` 未設定時，會繼承 `channels.discord.allowFrom`。
    - 具名帳號不會繼承 `channels.discord.accounts.default.allowFrom`。

    為了相容性，仍會讀取舊版 `channels.discord.dm.policy` 和 `channels.discord.dm.allowFrom`。當能夠在不變更存取權限的情況下進行時，`openclaw doctor --fix` 會將它們遷移至 `dmPolicy` 和 `allowFrom`。

    傳送的 DM 目標格式：

    - `user:<id>`
    - `<@id>` 提及

    當頻道預設值處於啟用狀態時，純數字 ID 通常會解析為頻道 ID，但為了相容性，帳號有效 DM `allowFrom` 中列出的 ID 會被視為使用者 DM 目標。

  </Tab>

  <Tab title="Access groups">
    Discord 私訊和文字指令授權可以在 `channels.discord.allowFrom` 中使用動態 `accessGroup:<name>` 項目。

    存取群組名稱在訊息頻道之間共享。對於成員以各個頻道的一般 `allowFrom` 語法表示的靜態群組，請使用 `type: "message.senders"`；或者當 Discord 頻道的目前 `ViewChannel` 受眾應動態定義成員資格時，請使用 `type: "discord.channelAudience"`。共享存取群組的行為記錄於此：[存取群組](/zh-Hant/channels/access-groups)。

```json5
{
  accessGroups: {
    operators: {
      type: "message.senders",
      members: {
        "*": ["global-owner-id"],
        discord: ["discord:123456789012345678"],
        telegram: ["987654321"],
      },
    },
  },
  channels: {
    discord: {
      dmPolicy: "allowlist",
      allowFrom: ["accessGroup:operators"],
    },
  },
}
```

    Discord 文字頻道沒有獨立的成員清單。`type: "discord.channelAudience"` 將成員資格建模為：私訊傳送者是指定公會的成員，且在套用角色和頻道覆寫後，目前對指定的頻道擁有有效的 `ViewChannel` 權限。

    範例：允許任何可以看到 `#maintainers` 的人私訊機器人，同時對其他所有人關閉私訊。

```json5
{
  accessGroups: {
    maintainers: {
      type: "discord.channelAudience",
      guildId: "1456350064065904867",
      channelId: "1456744319972282449",
      membership: "canViewChannel",
    },
  },
  channels: {
    discord: {
      dmPolicy: "allowlist",
      allowFrom: ["accessGroup:maintainers"],
    },
  },
}
```

    您可以混合動態和靜態項目：

```json5
{
  accessGroups: {
    maintainers: {
      type: "discord.channelAudience",
      guildId: "1456350064065904867",
      channelId: "1456744319972282449",
    },
  },
  channels: {
    discord: {
      dmPolicy: "allowlist",
      allowFrom: ["accessGroup:maintainers", "discord:123456789012345678"],
    },
  },
}
```

    查詢預設為封閉（失敗）。如果 Discord 傳回 `Missing Access`、成員查詢失敗，或該頻道屬於不同的公會，則私訊傳送者將被視為未獲授權。

    當使用頻道受眾存取群組時，請在 Discord 開發人員入口網站中為機器人啟用 **Server Members Intent**。私訊不包含公會成員狀態，因此 OpenClaw 會在授權時透過 Discord REST 解析成員。

  </Tab>

  <Tab title="Guild policy">
    伺服器處理由 `channels.discord.groupPolicy` 控制：

    - `open`
    - `allowlist`
    - `disabled`

    當存在 `channels.discord` 時，安全的預設值為 `allowlist`。

    `allowlist` 行為：

    - 伺服器必須符合 `channels.discord.guilds`（建議使用 `id`，也可接受 slug）
    - 選用的發送者允許清單：`users`（建議使用穩定 ID）和 `roles`（僅限角色 ID）；如果設定了其中任何一個，當發送者符合 `users` 或 `roles` 時即被允許
    - 預設停用直接名稱/標籤比對；僅將 `channels.discord.dangerouslyAllowNameMatching: true` 作為緊急相容模式啟用
    - `users` 支援名稱/標籤，但 ID 更安全；使用名稱/標籤條目時 `openclaw security audit` 會發出警告
    - 如果伺服器設定了 `channels`，則會拒絕未列出的頻道
    - 如果伺服器沒有 `channels` 區塊，則允許該已列入允許清單之伺服器中的所有頻道

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

    如果您只設定 `DISCORD_BOT_TOKEN` 而不建立 `channels.discord` 區塊，執行時期會回退為 `groupPolicy="allowlist"`（並在日誌中發出警告），即使 `channels.defaults.groupPolicy` 是 `open`。

  </Tab>

  <Tab title="提及和群組訊息">
    公會訊息預設為提及門控。

    提及偵測包括：

    - 明確的機器人提及
    - 已設定的提及模式 (`agents.list[].groupChat.mentionPatterns`，後備 `messages.groupChat.mentionPatterns`)
    - 支援情況下的隱含回覆機器人行為

    撰寫外寄 Discord 訊息時，請使用標準提及語法：使用者用 `<@USER_ID>`，頻道用 `<#CHANNEL_ID>`，角色用 `<@&ROLE_ID>`。請勿使用舊版 `<@!USER_ID>` 暱稱提及格式。

    `requireMention` 是依據公會/頻道設定的 (`channels.discord.guilds...`)。
    `ignoreOtherMentions` 可選擇捨棄提及其他使用者/角色但未提及機器人的訊息 (排除 @everyone/@here)。

    群組訊息：

    - 預設：忽略 (`dm.groupEnabled=false`)
    - 透過 `dm.groupChannels` 的可選允許清單 (頻道 ID 或 slug)

  </Tab>
</Tabs>

### 基於角色的代理路由

使用 `bindings[].match.roles` 透過角色 ID 將 Discord 公會成員路由到不同的代理。基於角色的綁定僅接受角色 ID，並在對等或父對等綁定之後、公會專屬綁定之前進行評估。如果綁定也設定了其他相符欄位 (例如 `peer` + `guildId` + `roles`)，則所有已設定的欄位都必須相符。

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

## 原生指令與指令授權

- `commands.native` 預設為 `"auto"` 且已針對 Discord 啟用。
- 各頻道覆寫：`channels.discord.commands.native`。
- `commands.native=false` 會在啟動期間跳過 Discord 斜線指令註冊與清理。先前註冊的指令可能會在 Discord 中持續可見，直到您將其從 Discord 應用程式中移除。
- 原生指令授權使用與一般訊息處理相同的 Discord 允許清單/原則。
- 未經授權的使用者仍可能會在 Discord UI 中看到這些指令；執行仍會強制執行 OpenClaw 授權並傳回「未授權」。

請參閱 [斜線指令](/zh-Hant/tools/slash-commands) 以了解指令目錄和行為。

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
    - `batched`

    注意：`off` 會停用隱式回覆串接。明確的 `[[reply_to_*]]` 標籤仍會受到尊重。
    `first` 總是將隱式原生回覆參照附加至該輪次的第一則傳出 Discord 訊息。
    `batched` 僅在
    傳入輪次為多則訊息的防抖批次時，才附加 Discord 的隱式原生回覆參照。這在您主要想針對
    模糊的爆發式對話使用原生回覆，而非每一則單一訊息輪次時非常有用。

    訊息 ID 會顯示在內容/歷史記錄中，以便 Agent 能鎖定特定訊息。

  </Accordion>

  <Accordion title="即時串流預覽">
    OpenClaw 可以透過發送暫時訊息並在文字到達時編輯該訊息，來串流傳輸草稿回覆。`channels.discord.streaming` 接受 `off` | `partial` | `block` | `progress` (預設)。`progress` 會保留一個可編輯的狀態草稿，並隨著工具進行更新，直到最終交付；共享的起始標籤是一個滾動行，因此一旦出現足夠的工作內容，它就會像其他內容一樣捲動消失。`streamMode` 是一個舊版的執行時期別名。執行 `openclaw doctor --fix` 將持續性配置重寫為標準鍵值。

    將 `channels.discord.streaming.mode` 設定為 `off` 以停用 Discord 預覽編輯。如果明確啟用了 Discord 區塊串流，OpenClaw 將跳過預覽串流以避免重複串流。

```json5
{
  channels: {
    discord: {
      streaming: {
        mode: "progress",
        progress: {
          label: "auto",
          maxLines: 8,
          toolProgress: true,
        },
      },
    },
  },
}
```

    - `partial` 會在 token 到達時編輯單一預覽訊息。
    - `block` 會發射草稿大小的區塊 (使用 `draftChunk` 調整大小和斷點，限制為 `textChunkLimit`)。
    - 媒體、錯誤和明確回覆的最終結果會取消待處理的預覽編輯。
    - `streaming.preview.toolProgress` (預設 `true`) 控制工具/進度更新是否重複使用預覽訊息。
    - 工具/進度列在可用時會呈現為簡潔的表情符號 + 標題 + 詳細資訊，例如 `🛠️ Bash: run tests` 或 `🔎 Web Search: for "query"`。
    - `streaming.preview.commandText` / `streaming.progress.commandText` 控制簡潔進度列中的 command/exec 詳細資訊：`raw` (預設) 或 `status` (僅工具標籤)。

    在保持簡潔進度列的同時隱藏原始 command/exec 文字：

    ```json
    {
      "channels": {
        "discord": {
          "streaming": {
            "mode": "progress",
            "progress": {
              "toolProgress": true,
              "commandText": "status"
            }
          }
        }
      }
    }
    ```

    預覽串流僅支援文字；媒體回覆會回退為正常傳送。當明確啟用 `block` 串流時，OpenClaw 將跳過預覽串流以避免重複串流。

  </Accordion>

  <Accordion title="歷史、背景和執行緒行為">
    Guild 歷史背景：

    - `channels.discord.historyLimit` default `20`
    - fallback: `messages.groupChat.historyLimit`
    - `0` 停用

    DM 歷史控制：

    - `channels.discord.dmHistoryLimit`
    - `channels.discord.dms["<user_id>"].historyLimit`

    執行緒行為：

    - Discord 執行緒作為頻道會話路由，並繼承父頻道設定，除非被覆寫。
    - 執行緒會話繼承父頻道的會議層級 `/model` 選擇作為僅模型的後備方案；執行緒本地的 `/model` 選擇仍具有優先權，且除非啟用逐字稿繼承，否則不會複製父頻道的逐字稿歷史。
    - `channels.discord.thread.inheritParent` (預設 `false`) 選擇讓新的自動執行緒從父頻道逐字稿進行播種。每個帳號的覆寫位於 `channels.discord.accounts.<id>.thread.inheritParent` 下。
    - 訊息工具反應可以解析 `user:<id>` DM 目標。
    - `guilds.<guild>.channels.<channel>.requireMention: false` 在回覆階段啟動後備期間會被保留。

    頻道主題會被注入為 **不受信任** 的背景。允許清單會控制誰可以觸發代理程式，而不是完整的補充背景編輯邊界。

  </Accordion>

  <Accordion title="子代理的執行緒繫結工作階段">
    Discord 可以將執行緒繫結到工作階段目標，以便該執行緒中的後續訊息繼續路由到相同的工作階段（包括子代理工作階段）。

    指令：

    - `/focus <target>` 將目前/新執行緒繫結到子代理/工作階段目標
    - `/unfocus` 移除目前的執行緒繫結
    - `/agents` 顯示活躍執行和繫結狀態
    - `/session idle <duration|off>` 檢查/更新已聚焦繫結的非活動自動取消聚焦
    - `/session max-age <duration|off>` 檢查/更新已聚焦繫結的硬性最大存留時間

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
        spawnSessions: true,
        defaultSpawnContext: "fork",
      },
    },
  },
}
```

    註記：

    - `session.threadBindings.*` 設定全域預設值。
    - `channels.discord.threadBindings.*` 覆寫 Discord 行為。
    - `spawnSessions` 控制 `sessions_spawn({ thread: true })` 和 ACP 執行緒生成的自動建立/繫結執行緒。預設值：`true`。
    - `defaultSpawnContext` 控制執行緒繫結生成的原生子代理上下文。預設值：`"fork"`。
    - 已棄用的 `spawnSubagentSessions`/`spawnAcpSessions` 鍵會由 `openclaw doctor --fix` 遷移。
    - 如果帳戶停用了執行緒繫結，則 `/focus` 和相關的執行緒繫結操作將無法使用。

    參閱 [子代理](/zh-Hant/tools/subagents)、[ACP 代理](/zh-Hant/tools/acp-agents) 和 [設定參考](/zh-Hant/gateway/configuration-reference)。

  </Accordion>

  <Accordion title="持久的 ACP 頻道綁定">
    對於穩定的「永遠在線」ACP 工作區，請設定針對 Discord 對話的頂層類型化 ACP 綁定。

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

    說明：

    - `/acp spawn codex --bind here` 會就地綁定當前頻道或貼文串，並將後續訊息保留在同一個 ACP 會話中。貼文串訊息會繼承父頻道的綁定。
    - 在已綁定的頻道或貼文串中，`/new` 和 `/reset` 會就地重置同一個 ACP 會話。臨時貼文串綁定在生效時可以覆寫目標解析。
    - `spawnSessions` 透過 `--thread auto|here` 控制子貼文串的建立/綁定。

    請參閱 [ACP Agents](/zh-Hant/tools/acp-agents) 以了解綁定行為的詳細資訊。

  </Accordion>

  <Accordion title="反應通知">
    每個公會的反應通知模式：

    - `off`
    - `own` (預設)
    - `all`
    - `allowlist` (使用 `guilds.<id>.users`)

    反應事件會被轉換為系統事件，並附加到已路由的 Discord 會話。

  </Accordion>

  <Accordion title="Ack 反應">
    當 OpenClaw 正在處理傳入訊息時，`ackReaction` 會發送一個確認表情符號。

    解析順序：

    - `channels.discord.accounts.<accountId>.ackReaction`
    - `channels.discord.ackReaction`
    - `messages.ackReaction`
    - 代理程式身分表情符號回退 (`agents.list[].identity.emoji`，否則為 "👀")

    說明：

    - Discord 接受 Unicode 表情符號或自訂表情符號名稱。
    - 使用 `""` 來停用特定頻道或帳戶的反應。

  </Accordion>

  <Accordion title="設定寫入">
    預設會啟用由頻道發起的設定寫入。

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

  <Accordion title="閘道代理伺服器">
    透過 HTTP(S) 代理伺服器使用 `channels.discord.proxy` 路由 Discord 閘道 WebSocket 流量和啟動時的 REST 查詢（應用程式 ID + 許可清單解析）。

```json5
{
  channels: {
    discord: {
      proxy: "http://proxy.example:8080",
    },
  },
}
```

    每個帳號的覆寫設定：

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

    - 許可清單可以使用 `pk:<memberId>`
    - 只有當 `channels.discord.dangerouslyAllowNameMatching: true` 時，才會依名稱/slug 匹配成員顯示名稱
    - 查詢會使用原始訊息 ID，並受限於時間視窗
    - 如果查詢失敗，代理訊息會被視為機器人訊息並捨棄，除非 `allowBots=true`

  </Accordion>

  <Accordion title="輸出提及別名">
    當代理程式需要對已知的 Discord 使用者進行確定性輸出提及時，請使用 `mentionAliases`。鍵值為不包含前置 `@` 的帳號代號；值為 Discord 使用者 ID。未知的帳號代號、`@everyone`、`@here` 以及 Markdown 程式碼範圍內的提及將保持不變。

```json5
{
  channels: {
    discord: {
      mentionAliases: {
        Vladislava: "123456789012345678",
      },
      accounts: {
        ops: {
          mentionAliases: {
            OpsLead: "234567890123456789",
          },
        },
      },
    },
  },
}
```

  </Accordion>

  <Accordion title="Presence configuration">
    當您設定狀態或活動欄位，或是啟用自動在線狀態時，會套用在線狀態更新。

    僅狀態範例：

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

    - 0：正在遊玩
    - 1：正在直播（需要 `activityUrl`）
    - 2：正在聽
    - 3：正在觀看
    - 4：自訂（使用活動文字作為狀態；emoji 為選用）
    - 5：正在競爭

    自動在線狀態範例（執行階段健康狀態訊號）：

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

    自動在線狀態會將執行階段可用性對應到 Discord 狀態：healthy => online、degraded 或 unknown => idle、exhausted 或 unavailable => dnd。選用的文字覆寫：

    - `autoPresence.healthyText`
    - `autoPresence.degradedText`
    - `autoPresence.exhaustedText`（支援 `{reason}` 預留位置）

  </Accordion>

  <Accordion title="Discord 中的審核">
    Discord 支援在 DM（直接訊息）中進行基於按鈕的審核處理，並可選擇在原始頻道中發佈審核提示。

    配置路徑：

    - `channels.discord.execApprovals.enabled`
    - `channels.discord.execApprovals.approvers` （可選；可能的話會回退至 `commands.ownerAllowFrom`）
    - `channels.discord.execApprovals.target` （`dm` | `channel` | `both`，預設值：`dm`）
    - `agentFilter`、`sessionFilter`、`cleanupAfterResolve`

    當 `enabled` 未設定或為 `"auto"`，且至少能解析出一個審核者（無論是來自 `execApprovals.approvers` 還是 `commands.ownerAllowFrom`）時，Discord 會自動啟用原生執行審核。Discord 不會從頻道 `allowFrom`、舊版 `dm.allowFrom` 或直接訊息 `defaultTo` 推斷執行審核者。將 `enabled: false` 設定為可明確停用 Discord 作為原生審核客戶端。

    對於敏感的僅限擁有者的群組指令，例如 `/diagnostics` 和 `/export-trajectory`，OpenClaw 會私下發送審核提示和最終結果。當呼叫的擁有者擁有 Discord 擁有者路由時，它會先嘗試 Discord DM；如果不可用，則回退到 `commands.ownerAllowFrom` 中第一個可用的擁有者路由，例如 Telegram。

    當 `target` 為 `channel` 或 `both` 時，審核提示在頻道中可見。只有已解析的審核者可以使用這些按鈕；其他使用者會收到臨時拒絕通知。審核提示包含指令文字，因此僅在受信任的頻道中啟用頻道傳遞。如果無法從會話金鑰匯出頻道 ID，OpenClaw 會回退到 DM 傳遞。

    Discord 也會呈現其他聊天頻道使用的共用審核按鈕。原生 Discord 配接器主要增加了審核者 DM 路由和頻道分發。
    當這些按鈕存在時，它們是主要的審核使用者體驗；當工具結果顯示
    聊天審核不可用或手動審核是唯一途徑時，OpenClaw
    應僅包含手動 `/approve` 指令。
    如果 Discord 原生審核執行時期未啟用，OpenClaw 會保持
    本地確定性 `/approve <id> <decision>` 提示可見。如果
    執行時期已啟用但原生卡片無法傳遞至任何目標，
    OpenClaw 會發送一個包含來自待審核的確切 `/approve`
    指令的同聊天回退通知。

    Gateway 身份驗證和審核解析遵循共用 Gateway 客戶端約定 （`plugin:` 透過 `plugin.approval.resolve` 解析；其他 ID 透過 `exec.approval.resolve` 解析）。審核預設在 30 分鐘後過期。

    參閱 [執行審核](/zh-Hant/tools/exec-approvals)。

  </Accordion>
</AccordionGroup>

## 工具與動作閘門

Discord 訊息動作包括傳訊、頻道管理、版務管理、在線狀態與元數據動作。

核心範例：

- 傳訊：`sendMessage`、`readMessages`、`editMessage`、`deleteMessage`、`threadReply`
- 反應：`react`、`reactions`、`emojiList`
- 版務管理：`timeout`、`kick`、`ban`
- 在線狀態：`setPresence`

`event-create` 動作接受一個可選的 `image` 參數（URL 或本機檔案路徑）來設定排程活動的封面圖片。

動作閘門位於 `channels.discord.actions.*` 之下。

預設閘門行為：

| 動作群組                                                                                                                                                                 | 預設    |
| ------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ------- |
| reactions、messages、threads、pins、polls、search、memberInfo、roleInfo、channelInfo、channels、voiceStatus、events、stickers、emojiUploads、stickerUploads、permissions | enabled |
| roles                                                                                                                                                                    | 停用    |
| moderation                                                                                                                                                               | 已停用  |
| presence                                                                                                                                                                 | 已停用  |

## Components v2 UI

OpenClaw 使用 Discord 元件 v2 進行執行核可與跨情境標記。Discord 訊息動作也能接受 `components` 以自訂 UI（進階；需透過 discord 工具建構元件載荷），而舊版 `embeds` 雖仍可用，但不建議使用。

- `channels.discord.ui.components.accentColor` 設定 Discord 元件容器所使用的強調色（十六進位）。
- 透過 `channels.discord.accounts.<id>.ui.components.accentColor` 為每個帳號設定。
- 當存在 components v2 時，`embeds` 會被忽略。

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

Discord 有兩種不同的語音介面：即時**語音頻道**（持續對話）與**語音訊息附件**（波形預覽格式）。閘道同時支援這兩種形式。

### 語音頻道

設定檢查清單：

1. 在 Discord 開發人員入口網站中啟用 Message Content Intent。
2. 使用角色/使用者允許清單時，啟用 Server Members Intent。
3. 使用 `bot` 與 `applications.commands` 範圍邀請機器人。
4. 在目標語音頻道中授予 Connect、Speak、Send Messages 與 Read Message History 權限。
5. 啟用原生指令（`commands.native` 或 `channels.discord.commands.native`）。
6. 設定 `channels.discord.voice`。

使用 `/vc join|leave|status` 來控制會話。此指令使用帳號預設的代理程式，並遵循與其他 Discord 指令相同的允許清單與群組原則規則。

```bash
/vc join channel:<voice-channel-id>
/vc status
/vc leave
```

若要在加入前檢查機器人的有效權限，請執行：

```bash
openclaw channels capabilities --channel discord --target channel:<voice-channel-id>
```

自動加入範例：

```json5
{
  channels: {
    discord: {
      voice: {
        enabled: true,
        model: "openai-codex/gpt-5.5",
        autoJoin: [
          {
            guildId: "123456789012345678",
            channelId: "234567890123456789",
          },
        ],
        daveEncryption: true,
        decryptionFailureTolerance: 24,
        connectTimeoutMs: 30000,
        reconnectGraceMs: 15000,
        realtime: {
          provider: "openai",
          model: "gpt-realtime-2",
          voice: "cedar",
        },
      },
    },
  },
}
```

備註：

- `voice.tts` 會覆寫 `stt-tts` 語音播放的 `messages.tts`。即時模式使用 `voice.realtime.voice`。
- `voice.mode` 控制對話路徑。預設為 `agent-proxy`：即時語音前端處理輪流時序、中斷和播放，透過 `openclaw_agent_consult` 將實質工作委派給路由的 OpenClaw 代理程式，並將結果視為來自該說話者的輸入 Discord 提示。`stt-tts` 保持較舊的批次 STT 加上 TTS 流程。`bidi` 讓即時模型直接對話，同時為 OpenClaw 大腦暴露 `openclaw_agent_consult`。
- `voice.agentSession` 控制哪個 OpenClaw 對話接收語音輪次。保留未設以使用語音頻道自己的會話，或設定 `{ mode: "target", target: "channel:<text-channel-id>" }` 以使語音頻道作為現有 Discord 文字頻道會話（例如 `#maintainers`）的麥克風/擴音器擴充功能。
- `voice.model` 會覆寫 Discord 語音回應和即時諮詢的 OpenClaw 代理程式大腦。保留未設以繼承路由的代理程式模型。它與 `voice.realtime.model` 分開。
- `agent-proxy` 透過 `discord-voice` 路由語音，這為說話者和目標工作階段保留了正常的擁有者/工具授權，但隱藏了代理程式的 `tts` 工具，因為 Discord 語音擁有播放控制權。預設情況下，`agent-proxy` 會給予諮詢完整的相當於擁有者的工具存取權限（針對擁有者說話者，即 `voice.realtime.toolPolicy: "owner"`），並且強烈偏好在提供實質性答案之前諮詢 OpenClaw 代理程式（`voice.realtime.consultPolicy: "always"`）。在該預設的 `always` 模式下，即時層不會在諮詢回答之前自動說話填充語；它會捕捉並轉錄語音，然後說出路由傳來的 OpenClaw 回答。如果當 Discord 正在播放第一個回答時，有多個強制諮詢回答完成，後續的精確語音回答將會被排隊，直到播放閒置為止，而不是在句子中間替換語音。
- 在 `stt-tts` 模式下，STT 使用 `tools.media.audio`；`voice.model` 不會影響轉錄。
- 在即時模式下，`voice.realtime.provider`、`voice.realtime.model` 和 `voice.realtime.voice` 會配置即時音訊工作階段。對於 OpenAI Realtime 2 加上 Codex 大腦，請使用 `voice.realtime.model: "gpt-realtime-2"` 和 `voice.model: "openai-codex/gpt-5.5"`。
- OpenAI 即時提供者接受目前的 Realtime 2 事件名稱以及傳統的 Codex 相容別名（用於輸出音訊和轉錄事件），因此相容的提供者快照可以偏移（drift）而不會遺失助理音訊。
- `voice.realtime.bargeIn` 控制說話者開始事件是否中斷作用中的即時播放。如果未設定，則遵循即時提供者的輸入音訊中斷設定。
- `voice.realtime.minBargeInAudioEndMs` 控制在 OpenAI 即時插話截斷音訊之前的助理播放最短持續時間。預設值：`250`。在低回音房間中設定 `0` 以立即中斷，或在回音較重的說話者設定中提高該值。
- 若要在 Discord 播放中使用 OpenAI 語音，請設定 `voice.tts.provider: "openai"` 並在 `voice.tts.openai.voice` 或 `voice.tts.providers.openai.voice` 下選擇文字轉語音語音。在目前的 OpenAI TTS 模型中，`cedar` 是一個聽起來不錯的男性語音選擇。
- 每個頻道的 Discord `systemPrompt` 覆寫設定會套用至該語音頻道的語音逐字稿輪次。
- 語音逐字稿輪次是依據 Discord `allowFrom`（或 `dm.allowFrom`）來取得擁有者身分；非擁有者發言者無法存取僅限擁有者使用的工具（例如 `gateway` 和 `cron`）。
- Discord 語音功能在僅限文字的設定中為選用；設定 `channels.discord.voice.enabled=true`（或保留現有的 `channels.discord.voice` 區塊）即可啟用 `/vc` 指令、語音執行階段以及 `GuildVoiceStates` gateway intent。
- `channels.discord.intents.voiceStates` 可以明確覆寫 voice-state intent 的訂閱設定。若要讓 intent 遵循實際的語音啟用狀態，請將其保留為未設定。
- 如果 `voice.autoJoin` 對於同一個伺服器有多個項目，OpenClaw 將加入該伺服器中最後一個設定的頻道。
- `voice.daveEncryption` 和 `voice.decryptionFailureTolerance` 會直接傳遞至 `@discordjs/voice` 的加入選項。
- 若未設定，`@discordjs/voice` 的預設值為 `daveEncryption=true` 和 `decryptionFailureTolerance=24`。
- OpenClaw 預設使用純 JS 的 `opusscript` 解碼器來接收 Discord 語音。選用的原生 `@discordjs/opus` 套件會被儲存庫的 pnpm install 政策忽略，因此一般的安裝和測試不會編譯原生附加元件；僅在專用的語音效能或正式環境中，才選擇使用原生 opus 組建。
- `voice.connectTimeoutMs` 控制著針對 `/vc join` 的初始 `@discordjs/voice` Ready 等待時間和自動加入嘗試。預設值：`30000`。
- `voice.reconnectGraceMs` 控制 OpenClaw 在销毁已断線的語音會話之前，等待其開始重新連線的時間長短。預設值：`15000`。
- 在 `stt-tts` 模式下，僅因另一使用者開始說話並不會停止語音播放。為避免迴音迴路，OpenClaw 在 TTS 播放時會忽略新的語音擷取；請在播放結束後說話以進行下一輪對話。即時模式會將說話者開始說話的事件作為插話訊號轉發給即時提供者。
- 在即時模式下，從喇叭進入開啟麥克風的迴音可能看起來像是插話並中斷播放。對於迴音嚴重的 Discord 房間，請設定 `voice.realtime.providers.openai.interruptResponseOnInputAudio: false` 以防止 OpenAI 在輸入音訊時自動中斷。如果您仍希望 Discord 說話者開始說話的事件中斷目前的播放，請新增 `voice.realtime.bargeIn: true`。OpenAI 即時橋接器會忽略短於 `voice.realtime.minBargeInAudioEndMs` 的播放截斷，視其為可能的迴音/雜訊，並將其記錄為已跳過，而不是清除 Discord 的播放。
- `voice.captureSilenceGraceMs` 控制 OpenClaw 在 Discord 回報說話者已停止後，等待多久才將該音訊片段定稿以進行 STT。預設值：`2500`；如果 Discord 將正常的停頓分割成斷斷續續的部分逐字稿，請調高此值。
- 當選擇 ElevenLabs 作為 TTS 提供者時，Discord 語音播放會使用串流 TTS 並從提供者的回應串流開始播放。不支援串流的提供者則會退回到合成暫存檔案路徑。
- OpenClaw 也會監控接收解密失敗，並在短時間內多次失敗後，透過離開並重新加入語音頻道來自動恢復。
- 如果在更新後，接收日誌反覆顯示 `DecryptionFailed(UnencryptedWhenPassthroughDisabled)`，請收集相依性報告和日誌。內建的 `@discordjs/voice` 行包含了來自 discord.js PR #11449 的上游填補修補程式，該修補程式解決了 discord.js issue #11419。
- 當 OpenClaw 定稿擷取的說話者片段時，預期會出現 `The operation was aborted` 接收事件；這些是詳細的診斷訊息，而非警告。
- 詳細的 Discord 語音日誌包含每個接受的發話者段落的有界單行 STT 轉錄預覽，因此除錯會顯示使用者端和代理程式回覆端，而不會傾印無界的轉錄文字。

STT 加上 TTS 管線：

- Discord PCM 擷取會轉換為 WAV 暫存檔案。
- `tools.media.audio` 處理 STT，例如 `openai/gpt-4o-mini-transcribe`。
- 轉錄會透過 Discord 進入和路由傳送，同時回應 LLM 以隱藏代理程式 `tts` 工具並要求傳回文字的語音輸出原則執行，因為 Discord 語音擁有最終的 TTS 播放權。
- `voice.model` 若設定，僅會覆寫此語音通道回合的回應 LLM。
- `voice.tts` 會與 `messages.tts` 合併；支援串流的提供者會直接饋送給播放器，否則產生的音訊檔案會在加入的通道中播放。

預設代理程式代理語音通道會話範例：

```json5
{
  channels: {
    discord: {
      voice: {
        enabled: true,
        model: "openai-codex/gpt-5.5",
        realtime: {
          provider: "openai",
          model: "gpt-realtime-2",
          voice: "cedar",
        },
      },
    },
  },
}
```

若沒有 `voice.agentSession` 區塊，每個語音通道都會有自己的路由 OpenClaw 會話。例如，`/vc join channel:234567890123456789` 會與該 Discord 語音通道的會話對話。即時模型僅是語音前端；實質請求會交給設定的 OpenClaw 代理程式。如果即時模型產生最終轉錄時未呼叫諮詢工具，OpenClaw 會強制進行諮詢作為後備，因此預設行為仍像與代理程式對話。

傳統 STT 加上 TTS 範例：

```json5
{
  channels: {
    discord: {
      voice: {
        enabled: true,
        mode: "stt-tts",
        model: "openai/gpt-5.4-mini",
        tts: {
          provider: "openai",
          openai: {
            model: "gpt-4o-mini-tts",
            voice: "cedar",
          },
        },
      },
    },
  },
}
```

即時雙向範例：

```json5
{
  channels: {
    discord: {
      voice: {
        enabled: true,
        mode: "bidi",
        model: "openai-codex/gpt-5.5",
        realtime: {
          provider: "openai",
          model: "gpt-realtime-2",
          voice: "cedar",
          toolPolicy: "safe-read-only",
          consultPolicy: "always",
        },
      },
    },
  },
}
```

語音作為現有 Discord 通道會話的擴充：

```json5
{
  channels: {
    discord: {
      voice: {
        enabled: true,
        mode: "agent-proxy",
        model: "openai-codex/gpt-5.5",
        agentSession: {
          mode: "target",
          target: "channel:123456789012345678",
        },
        realtime: {
          provider: "openai",
          model: "gpt-realtime-2",
          voice: "cedar",
        },
      },
    },
  },
}
```

在 `agent-proxy` 模式下，機器人會加入設定的語音通道，但 OpenClaw 代理程式回合會使用目標通道的正常路由會話和代理程式。即時語音會話會將傳回的結果說回語音通道中。監督代理程式仍可根據其工具原則使用正常訊息工具，包括如果那是正確動作則發送單獨的 Discord 訊息。

有用的目標形式：

- `target: "channel:123456789012345678"` 透過 Discord 文字通道會話路由。
- `target: "123456789012345678"` 被視為通道目標。
- `target: "dm:123456789012345678"` 或 `target: "user:123456789012345678"` 透過該直接訊息會話路由。

高回聲 OpenAI Realtime 範例：

```json5
{
  channels: {
    discord: {
      voice: {
        enabled: true,
        mode: "bidi",
        model: "openai-codex/gpt-5.5",
        realtime: {
          provider: "openai",
          model: "gpt-realtime-2",
          voice: "cedar",
          bargeIn: true,
          minBargeInAudioEndMs: 500,
          consultPolicy: "always",
          providers: {
            openai: {
              interruptResponseOnInputAudio: false,
            },
          },
        },
      },
    },
  },
}
```

當模型透過開啟的麥克風聽到自己的 Discord 播放內容，但您仍想透過說話來打斷它時，請使用此設定。OpenClaw 可防止 OpenAI 對原始輸入音訊自動中斷，而 `bargeIn: true` 允許 Discord 發言者開始事件和已啟用的發言者音訊在下一個擷取的回合到達 OpenAI 之前，取消進行中的即時回應。低於 `minBargeInAudioEndMs` 的 `audioEndMs` 的極早插話訊號會被視為可能的回聲/雜訊並被忽略，以免模型在第一個播放幀就被截斷。

預期的語音日誌：

- 加入時：`discord voice: joining ... voiceSession=... supervisorSession=... agentSessionMode=... voiceModel=... realtimeModel=...`
- 即時開始時：`discord voice: realtime bridge starting ... autoRespond=false interruptResponse=false bargeIn=false minBargeInAudioEndMs=...`
- 發言者音訊時：`discord voice: realtime speaker turn opened ...`、`discord voice: realtime input audio started ... outputAudioMs=... outputActive=...` 和 `discord voice: realtime speaker turn closed ... chunks=... discordBytes=... realtimeBytes=... interruptedPlayback=...`
- 即時回應完成時：`discord voice: realtime audio playback finishing reason=response.done ... audioMs=... chunks=...`
- 播放停止/重設時：`discord voice: realtime audio playback stopped reason=... audioMs=... elapsedMs=... chunks=...`
- 即時諮詢時：`discord voice: realtime consult requested ... voiceSession=... supervisorSession=... question=...`
- 代理回應時：`discord voice: agent turn answer ...`
- 佇列的精確語音時：`discord voice: realtime exact speech queued ... queued=... outputAudioMs=... outputActive=...`，接著是 `discord voice: realtime exact speech dequeued reason=player-idle ...`
- 偵測到插話時：`discord voice: realtime barge-in detected source=speaker-start ...` 或 `discord voice: realtime barge-in detected source=active-speaker-audio ...`，接著是 `discord voice: realtime barge-in requested reason=... outputAudioMs=... outputActive=...`
- 即時中斷時：`discord voice: realtime model interrupt requested client:response.cancel reason=barge-in`，接著是 `discord voice: realtime model audio truncated client:conversation.item.truncate reason=barge-in audioEndMs=...` 或 `discord voice: realtime model interrupt confirmed server:response.done status=cancelled ...`
- 忽略回聲/雜訊時：`discord voice: realtime model interrupt ignored client:conversation.item.truncate.skipped reason=barge-in audioEndMs=0 minAudioEndMs=250`
- 停用插話時：`discord voice: realtime capture ignored during playback (barge-in disabled) ...`
- 播放閒置時：`discord voice: realtime barge-in ignored reason=... outputActive=false ... playbackChunks=0`

若要調試被截斷的音訊，請將即時語音日誌作為時間軸來閱讀：

1. `realtime audio playback started` 表示 Discord 已開始播放助理音訊。橋接器從此點開始計算助理輸出區塊、Discord PCM 位元組、提供者即時位元組和合成音訊持續時間。
2. `realtime speaker turn opened` 標示 Discord 發言者變為啟用狀態。如果播放已啟用且啟用了 `bargeIn`，此後可能會接著 `barge-in detected source=speaker-start`。
3. `realtime input audio started` 標記了為該發話者輪次收到的第一個實際音訊幀。此處的 `outputActive=true` 或非零 `outputAudioMs` 表示麥克風正在發送輸入，同時助手播放仍在進行中。
4. `barge-in detected source=active-speaker-audio` 表示 OpenClaw 在助手播放活躍期間看到了實時發話者音訊。這有助於區分真正的中斷和沒有實用音訊的 Discord 發話者開始事件。
5. `barge-in requested reason=...` 表示 OpenClaw 要求即時提供者取消或截斷活動回應。它包含 `outputAudioMs`、`outputActive` 和 `playbackChunks`，因此您可以看到在中斷之前實際播放了多少助手音訊。
6. `realtime audio playback stopped reason=...` 是本機 Discord 播放重置點。原因說明了誰停止了播放：`barge-in`、`player-idle`、`provider-clear-audio`、`forced-agent-consult`、`stream-close` 或 `session-close`。
7. `realtime speaker turn closed` 總結了捕獲的輸入輪次。`chunks=0` 或 `hasAudio=false` 表示發話者輪次已開啟，但沒有可用的音訊到達即時橋接器。`interruptedPlayback=true` 表示輸入輪次與助手輸出重疊並觸發了插話邏輯。

實用欄位：

- `outputAudioMs`：即時提供者在日誌行之前生成的助手音訊持續時間。
- `audioMs`：播放停止前 OpenClaw 計數的助手音訊持續時間。
- `elapsedMs`：開啟和關閉播放串流或發話者輪次之間的牆上時鐘時間。
- `discordBytes`：發送到 Discord 語音或從 Discord 語音接收的 48 kHz 立體聲 PCM 位元組。
- `realtimeBytes`：發送到即時提供者或從即時提供者接收的提供者格式 PCM 位元組。
- `playbackChunks`：轉發到 Discord 的助手音訊區塊，用於活動回應。
- `sinceLastAudioMs`：最後一個捕獲的發話者音訊幀與發話者輪次關閉之間的間隔。

常見模式：

- 如果出現 `source=active-speaker-audio` 立即中斷、較小的 `outputAudioMs`，且附近有同一用戶，通常表示喇叭回聲進入了麥克風。請提高 `voice.realtime.minBargeInAudioEndMs`、降低喇叭音量、使用耳機，或設定 `voice.realtime.providers.openai.interruptResponseOnInputAudio: false`。
- `source=speaker-start` 之後接著 `speaker turn closed ... hasAudio=false` 表示 Discord 回報了說話者開始，但沒有音訊傳送到 OpenClaw。這可能是暫時性的 Discord 語音事件、雜訊閘行為，或是客戶端短暫觸發了麥克風。
- 如果沒有附近的插話或 `provider-clear-audio` 就出現 `audio playback stopped reason=stream-close`，表示本機 Discord 播放串流意外結束。請檢查前一個提供者及 Discord 播放器日誌。
- `capture ignored during playback (barge-in disabled)` 表示當助理音訊作用時，OpenClaw 故意捨棄了輸入。如果您希望語音能中斷播放，請啟用 `voice.realtime.bargeIn`。
- `barge-in ignored ... outputActive=false` 表示 Discord 或提供者 VAD 偵測到語音，但 OpenClaw 沒有作用中的播放可供中斷。這不應該中斷音訊。

憑證是依元件解析的：LLM 路由驗證用於 `voice.model`，STT 驗證用於 `tools.media.audio`，TTS 驗證用於 `messages.tts`/`voice.tts`，即時提供者驗證則用於 `voice.realtime.providers` 或提供者的正常驗證設定。

### 語音訊息

Discord 語音訊息會顯示波形預覽，並且需要 OGG/Opus 音訊。OpenClaw 會自動產生波形，但需要在閘道主機上安裝 `ffmpeg` 和 `ffprobe` 來進行檢查和轉換。

- 提供 **本地檔案路徑**（會拒絕 URL）。
- 省略文字內容（Discord 會拒絕在同一個 payload 中同時包含文字和語音訊息）。
- 接受任何音訊格式；OpenClaw 會視需要轉換為 OGG/Opus。

```bash
message(action="send", channel="discord", target="channel:123", path="/path/to/audio.mp3", asVoice=true)
```

## 疑難排解

<AccordionGroup>
  <Accordion title="使用了不允許的意圖或機器人看不到公會訊息">

    - 啟用訊息內容意圖 (Message Content Intent)
    - 當您依賴使用者/成員解析時，啟用伺服器成員意圖 (Server Members Intent)
    - 變更意圖後重新啟動閘道

  </Accordion>

  <Accordion title="Guild messages blocked unexpectedly">

    - 驗證 `groupPolicy`
    - 驗證 `channels.discord.guilds` 下的伺服器允許清單
    - 如果伺服器 `channels` 對應存在，則僅允許列出的頻道
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

    - `groupPolicy="allowlist"` 沒有對應的伺服器/頻道允許清單
    - `requireMention` 配置位置錯誤（必須在 `channels.discord.guilds` 或頻道條目下）
    - 發送者被伺服器/頻道 `users` 允許清單封鎖

  </Accordion>

  <Accordion title="Long-running Discord turns or duplicate replies">

    典型日誌：

    - `Slow listener detected ...`
    - `stuck session: sessionKey=agent:...:discord:... state=processing ...`

    Discord 閘道佇列調整參數：

    - 單一帳號：`channels.discord.eventQueue.listenerTimeout`
    - 多帳號：`channels.discord.accounts.<accountId>.eventQueue.listenerTimeout`
    - 這僅控制 Discord 閘道監聽器的工作，不控制代理輪次生命週期

    Discord 不會對佇列中的代理輪次套用頻道擁有的逾時。訊息監聽器會立即移交，且佇列中的 Discord 執行會保留每個階段的順序，直到階段/工具/執行時生命週期完成或中止工作。

```json5
{
  channels: {
    discord: {
      accounts: {
        default: {
          eventQueue: {
            listenerTimeout: 120000,
          },
        },
      },
    },
  },
}
```

  </Accordion>

  <Accordion title="Gateway metadata lookup timeout warnings">
    OpenClaw 在連線前會取得 Discord `/gateway/bot` 元數據。暫時性失敗會回退至 Discord 的預設閘道 URL，並在日誌中進行速率限制。

    元數據逾時調整參數：

    - 單一帳號：`channels.discord.gatewayInfoTimeoutMs`
    - 多帳號：`channels.discord.accounts.<accountId>.gatewayInfoTimeoutMs`
    - 未設定配置時的環境變數回退：`OPENCLAW_DISCORD_GATEWAY_INFO_TIMEOUT_MS`
    - 預設值：`30000` (30 秒)，最大值：`120000`

  </Accordion>

  <Accordion title="Gateway READY 逾時重啟">
    OpenClaw 會在啟動期間和執行階段重新連線後，等待 Discord 的 Gateway `READY` 事件。採用啟動錯開的多帳號設置，可能需要比預設更長的啟動 READY 視窗。

    READY 逾時設定選項：

    - 啟動單一帳號：`channels.discord.gatewayReadyTimeoutMs`
    - 啟動多帳號：`channels.discord.accounts.<accountId>.gatewayReadyTimeoutMs`
    - 未設定設定時的啟動環境變數後備：`OPENCLAW_DISCORD_READY_TIMEOUT_MS`
    - 啟動預設值：`15000` (15 秒)，最大值：`120000`
    - 執行階段單一帳號：`channels.discord.gatewayRuntimeReadyTimeoutMs`
    - 執行階段多帳號：`channels.discord.accounts.<accountId>.gatewayRuntimeReadyTimeoutMs`
    - 未設定設定時的執行階段環境變數後備：`OPENCLAW_DISCORD_RUNTIME_READY_TIMEOUT_MS`
    - 執行階段預設值：`30000` (30 秒)，最大值：`120000`

  </Accordion>

  <Accordion title="權限稽核不符">
    `channels status --probe` 權限檢查僅適用於數值頻道 ID。

    如果您使用 slug 金鑰，執行階段比對仍可運作，但 probe 無法完全驗證權限。

  </Accordion>

  <Accordion title="DM 和配對問題">

    - DM 已停用：`channels.discord.dm.enabled=false`
    - DM 政策已停用：`channels.discord.dmPolicy="disabled"` (舊版：`channels.discord.dm.policy`)
    - 在 `pairing` 模式下等待配對批准

  </Accordion>

  <Accordion title="Bot 與 Bot 迴圈">
    預設會忽略 Bot 建立的訊息。

    如果您設定 `channels.discord.allowBots=true`，請使用嚴格的提及和允許清單規則，以避免迴圈行為。
    建議優先使用 `channels.discord.allowBots="mentions"`，僅接受提及該 Bot 的 Bot 訊息。

```json5
{
  channels: {
    discord: {
      accounts: {
        mantis: {
          // Mantis listens to other bots only when they mention her.
          allowBots: "mentions",
        },
        molty: {
          // Molty listens to all bot-authored Discord messages.
          allowBots: true,
          mentionAliases: {
            // Lets Molty write "@Mantis" and send a real Discord mention.
            Mantis: "MANTIS_DISCORD_USER_ID",
          },
        },
      },
    },
  },
}
```

  </Accordion>

  <Accordion title="Voice STT drops with DecryptionFailed(...)">

    - 保持 OpenClaw 為最新版本 (`openclaw update`)，以確保存在 Discord 語音接收恢復邏輯
    - 確認 `channels.discord.voice.daveEncryption=true`（預設值）
    - 從 `channels.discord.voice.decryptionFailureTolerance=24`（上游預設值）開始，僅在需要時進行調整
    - 觀察日誌中的：
      - `discord voice: DAVE decrypt failures detected`
      - `discord voice: repeated decrypt failures; attempting rejoin`
    - 如果在自動重新加入後故障仍然持續，請收集日誌並與 [discord.js #11419](https://github.com/discordjs/discord.js/issues/11419) 和 [discord.js #11449](https://github.com/discordjs/discord.js/pull/11449) 中的上游 DAVE 接收歷史記錄進行比較

  </Accordion>
</AccordionGroup>

## 組態參考

主要參考：[組態參考 - Discord](/zh-Hant/gateway/config-channels#discord)。

<Accordion title="高訊號 Discord 欄位">

- startup/auth: `enabled`, `token`, `accounts.*`, `allowBots`
- policy: `groupPolicy`, `dm.*`, `guilds.*`, `guilds.*.channels.*`
- command: `commands.native`, `commands.useAccessGroups`, `configWrites`, `slashCommand.*`
- event queue: `eventQueue.listenerTimeout` (listener budget), `eventQueue.maxQueueSize`, `eventQueue.maxConcurrency`
- gateway: `gatewayInfoTimeoutMs`, `gatewayReadyTimeoutMs`, `gatewayRuntimeReadyTimeoutMs`
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

- 請將 bot 權杖視為機密（在受監管的環境中建議優先使用 `DISCORD_BOT_TOKEN`）。
- 授予最小權限 Discord 權限。
- 如果指令部署/狀態過時，請重新啟動 gateway 並使用 `openclaw channels status --probe` 重新檢查。

## 相關

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
    威脅模型與防護強化。
  </Card>
  <Card title="多代理程式路由" icon="sitemap" href="/zh-Hant/concepts/multi-agent">
    將伺服器和通道對應至代理程式。
  </Card>
  <Card title="斜線指令" icon="terminal" href="/zh-Hant/tools/slash-commands">
    原生指令行為。
  </Card>
</CardGroup>
