---
summary: "Discord bot 支援狀態、功能與設定"
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

您需要建立一個包含 bot 的新應用程式，將 bot 新增至您的伺服器，並將其與 OpenClaw 配對。我們建議將您的 bot 新增至您自己的私人伺服器。如果您還沒有私人伺服器，請先[建立一個](https://support.discord.com/hc/en-us/articles/204849977-How-do-I-create-a-server)（選擇 **Create My Own > For me and my friends**）。

<Steps>
  <Step title="建立 Discord 應用程式與 bot">
    前往 [Discord Developer Portal](https://discord.com/developers/applications) 並點擊 **New Application**。將其命名為類似 "OpenClaw" 的名稱。

    點擊側邊欄上的 **Bot**。將 **Username** 設定為您稱呼 OpenClaw agent 的任何名稱。

  </Step>

  <Step title="啟用特權意圖">
    仍在 **Bot** 頁面上，向下捲動至 **Privileged Gateway Intents** 並啟用：

    - **Message Content Intent**（必要）
    - **Server Members Intent**（建議；角色允許清單與名稱至 ID 比對所必需）
    - **Presence Intent**（選用；僅需要狀態更新時需要）

  </Step>

  <Step title="複製您的 bot 權杖">
    在 **Bot** 頁面上向上捲動並點擊 **Reset Token**。

    <Note>
    顧名思義，這會產生您的第一個權杖——並未「重置」任何東西。
    </Note>

    複製權杖並將其保存在某處。這就是您的 **Bot Token**，稍後您會用到它。

  </Step>

  <Step title="Generate an invite URL and add the bot to your server">
    點擊側邊欄上的 **OAuth2**。您將生成一個擁有合適權限的邀請 URL，以便將機器人加入您的伺服器。

    向下捲動至 **OAuth2 URL Generator** 並啟用：

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
      - 新增回應 (選用)

    這是一般文字頻道的基礎設定。如果您打算在 Discord 貼文中發佈訊息，包括建立或繼續貼文的論壇或媒體頻道工作流程，也請啟用 **Send Messages in Threads**。
    複製底部生成的 URL，貼至您的瀏覽器中，選擇您的伺服器，然後點擊 **Continue (繼續)** 以進行連線。您現在應該能在 Discord 伺服器中看到您的機器人。

  </Step>

  <Step title="Enable Developer Mode and collect your IDs">
    回到 Discord 應用程式，您需要啟用開發者模式，以便複製內部 ID。

    1. 點擊 **使用者設定** (頭像旁的齒輪圖示) → **進階** → 開啟 **開發者模式**
    2. 在側邊欄對您的 **伺服器圖示** 按右鍵 → **Copy Server ID**
    3. 對您的 **個人頭像** 按右鍵 → **Copy User ID**

    請將您的 **伺服器 ID** 和 **使用者 ID** 與機器人 Token 一起保存 — 您將在下一步中把這三者都傳送給 OpenClaw。

  </Step>

  <Step title="Allow DMs from server members">
    為了讓配對能正常運作，Discord 需要允許您的機器人向您傳送私訊。請對您的 **伺服器圖示** 按右鍵 → **隱私設定** → 開啟 **Direct Messages**。

    這允許伺服器成員 (包括機器人) 傳送私訊給您。如果您想透過 OpenClaw 使用 Discord 私訊，請保持此設定啟用。如果您只打算使用公會頻道，則可以在配對完成後停用私訊功能。

  </Step>

  <Step title="安全地設置您的機器人令牌（請勿在聊天中發送）">
    您的 Discord 機器人令牌是一個秘密（就像密碼一樣）。在向您的代理發送訊息之前，請在運行 OpenClaw 的機器上設置它。

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

    如果 OpenClaw 已作為後台服務運行，請通過 OpenClaw Mac 應用程序重新啟動它，或通過停止並重新啟動 `openclaw gateway run` 進程來重新啟動它。
    對於託管服務安裝，請在存在 `DISCORD_BOT_TOKEN` 的 shell 中運行 `openclaw gateway install`，或者將變量存儲在 `~/.openclaw/.env` 中，以便服務可以在重啟後解析 env SecretRef。
    如果您的主機被 Discord 的啟動應用程序查找阻止或限速，請從開發者門戶設置 Discord 應用程序/客戶端 ID，以便啟動可以跳過該 REST 調用。對於默認帳戶使用 `channels.discord.applicationId`，或者在運行多個 Discord 機器人時使用 `channels.discord.accounts.<accountId>.applicationId`。

  </Step>

  <Step title="Configure OpenClaw and pair">

    <Tabs>
      <Tab title="Ask your agent">
        在任何現有頻道（例如 Telegram）上與您的 OpenClaw 代理程式交談並告訴它。如果 Discord 是您的第一個頻道，請改用 CLI / config 分頁。

        > "我已經在配置中設置了我的 Discord bot token。請使用使用者 ID `<user_id>` 和伺服器 ID `<server_id>` 完成 Discord 設置。"
      </Tab>
      <Tab title="CLI / config">
        如果您偏好基於文件的配置，請設定：

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

        預設帳戶的環境變數備援：

```bash
DISCORD_BOT_TOKEN=...
```

        對於腳本化或遠端設置，請使用 `openclaw config patch --file ./discord.patch.json5 --dry-run` 寫入相同的 JSON5 區塊，然後在沒有 `--dry-run` 的情況下重新執行。支援純文字 `token` 值。跨 env/file/exec 提供者也支援 `channels.discord.token` 的 SecretRef 值。請參閱[機密管理](/zh-Hant/gateway/secrets)。

        對於多個 Discord bot，請將每個 bot token 和應用程式 ID 保留在其帳戶下。頂層 `channels.discord.applicationId` 會由帳戶繼承，因此僅當每個帳戶都應使用相同的應用程式 ID 時才在那裡設定。

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
    等待直到閘道運行，然後在 Discord 中私訊您的 bot。它將回應配對代碼。

    <Tabs>
      <Tab title="Ask your agent">
        將配對代碼發送給您在現有頻道上的代理程式：

        > "批准此 Discord 配對代碼：`<CODE>`"
      </Tab>
      <Tab title="CLI">

```bash
openclaw pairing list discord
openclaw pairing approve discord <CODE>
```

      </Tab>
    </Tabs>

    配對代碼在 1 小時後過期。

    您現在應該能夠透過私訊在 Discord 中與您的代理程式交談。

  </Step>
</Steps>

<Note>
  Token 解析與帳戶相關。設定中的 Token 值優先於環境變數後備值。`DISCORD_BOT_TOKEN` 僅用於預設帳戶。 如果兩個已啟用的 Discord 帳戶解析到同一個 Bot Token，OpenClaw 將僅為該 Token 啟動一個 Gateway 監視器。來源為設定的 Token 優先於預設的環境變數後備值；否則，第一個已啟用的帳戶會優先被使用，並將重複的帳戶回報為已停用。 對於進階的傳出呼叫（訊息工具/頻道動作），會為該次呼叫使用明確的單次呼叫
  `token`。這適用於發送和讀取/探測風格的動作（例如讀取/搜尋/擷取/執行緒/釘選訊息/權限）。帳戶原則/重試設定仍來自作用中執行時段快照中選取的帳戶。
</Note>

## 建議：設定公會工作區

一旦 DM 能夠運作，您可以將您的 Discord 伺服器設定為完整的工作區，讓每個頻道都有自己的代理程式工作階段與背景。這適用於只有您和您的機器人的私人伺服器。

<Steps>
  <Step title="將您的伺服器新增到伺服器允許清單">
    這能讓您的 Agent 在您伺服器上的任何頻道中回應，而不僅限於私訊（DM）。

    <Tabs>
      <Tab title="詢問您的 Agent">
        > 「將我的 Discord Server ID `<server_id>` 新增至伺服器允許清單」
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

  <Step title="Allow responses without @mention">
    預設情況下，您的代理程式只在被 @提及 時才會在公會頻道中回應。對於私人伺服器，您可能希望它回應每一則訊息。

    在公會頻道中，正常的回覆預設會自動發布。對於共享的常駐房間，請選擇加入 `messages.groupChat.visibleReplies: "message_tool"`，讓代理程式可以潛伏，並只在認為頻道回覆有用時才發布。這與最新一代、工具可靠的模型（如 GPT 5.5）搭配使用效果最好。除非工具發送內容，否則環境房間事件將保持安靜。有關完整的潛伏模式配置，請參閱 [環境房間事件](/zh-Hant/channels/ambient-room-events)。

    如果 Discord 顯示正在輸入，且日誌顯示使用了 Token 但沒有發布訊息，請檢查該輪次是否被配置為環境房間事件，或者是否選擇加入了訊息工具可見回覆。

    <Tabs>
      <Tab title="Ask your agent">
        > 「允許我的代理程式在此伺服器上回應而無需被 @提及」
      </Tab>
      <Tab title="Config">
        在您的公會配置中設定 `requireMention: false`：

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

        若要為可見的群組/頻道回覆要求透過訊息工具發送，請設定 `messages.groupChat.visibleReplies: "message_tool"`。

      </Tab>
    </Tabs>

  </Step>

  <Step title="Plan for memory in guild channels">
    預設情況下，長期記憶 (MEMORY.md) 只會載入於 DM 工作階段中。公會頻道不會自動載入 MEMORY.md。

    <Tabs>
      <Tab title="Ask your agent">
        > 「當我在 Discord 頻道中提問時，如果您需要來自 MEMORY.md 的長期語境，請使用 memory_search 或 memory_get。」
      </Tab>
      <Tab title="Manual">
        如果您需要在每個頻道中使用共享語境，請將穩定的指示放在 `AGENTS.md` 或 `USER.md` 中（它們會為每個工作階段注入）。將長期筆記保存在 `MEMORY.md` 中，並使用記憶工具按需存取。
      </Tab>
    </Tabs>

  </Step>
</Steps>

現在在您的 Discord 伺服器上建立一些頻道並開始聊天。您的代理程式可以看到頻道名稱，並且每個頻道都有自己獨立的會話——因此您可以設定 `#coding`、`#home`、`#research` 或任何適合您工作流程的項目。

## 運行時模型

- Gateway 擁有 Discord 連線。
- 回覆路由是確定性的：Discord 的入站訊息會回覆到 Discord。
- Discord 公會/頻道元資料會作為不受信任的語境新增至模型提示中，而不是作為使用者可見的回覆前綴。如果模型複製該信封回來，OpenClaw 會從出站回覆和未來的重播語境中刪除複製的元資料。
- 預設情況下 (`session.dmScope=main`)，直接聊天會共用代理程式主會話 (`agent:main:main`)。
- 公會頻道是獨立的會話金鑰 (`agent:<agentId>:discord:channel:<channelId>`)。
- 群組直接訊息預設會被忽略 (`channels.discord.dm.groupEnabled=false`)。
- 原生斜線指令在獨立的指令會話中執行 (`agent:<agentId>:discord:slash:<userId>`)，同時仍將 `CommandTargetSessionKey` 傳遞到路由的對話會話。
- 僅文字的 cron/heartbeat 公告傳送到 Discord 時，僅使用最終助理可見的答案一次。當代理程式發出多個可傳送的載荷時，媒體和結構化元件載荷仍保持多訊息狀態。

## 論壇頻道

Discord 論壇和媒體頻道僅接受貼文。OpenClaw 支援兩種建立貼文的方式：

- 傳送訊息至論壇父頻道 (`channel:<forumId>`) 以自動建立討論串。討論串標題會使用您訊息的第一行非空行。
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

論壇父頻道不接受 Discord 組件。如果您需要組件，請傳送至討論串本身 (`channel:<threadId>`)。

## 互動式組件

OpenClaw 支援代理程式訊息的 Discord 組件 v2 容器。使用訊息工具並搭配 `components` 載荷。互動結果會作為一般傳入訊息路由回代理程式，並遵循現有的 Discord `replyToMode` 設定。

支援的區塊：

- `text`、`section`、`separator`、`actions`、`media-gallery`、`file`
- 動作列最多允許 5 個按鈕或單一選單
- 選取類型：`string`、`user`、`role`、`mentionable`、`channel`

預設情況下，組件僅能使用一次。設定 `components.reusable=true` 以允許按鈕、選取器和表單多次使用，直到過期為止。

若要限制誰可以點擊按鈕，請在該按鈕上設定 `allowedUsers` (Discord 使用者 ID、標籤或 `*`)。設定後，不符合的使用者會收到暫時性拒絕回應。

組件回呼預設在 30 分鐘後過期。設定 `channels.discord.agentComponents.ttlMs` 以變更預設 Discord 帳戶的回呼登錄存留時間，或在多帳戶設定中使用 `channels.discord.accounts.<accountId>.agentComponents.ttlMs` 覆寫特定帳戶。該數值為毫秒，必須為正整數，且上限為 `86400000`（24 小時）。較長的 TTL 適合需要按鈕保持可用的審核或批准工作流程，但也會延長舊 Discord 訊息仍可觸發動作的時間視窗。請盡量使用符合工作流程需求的最短 TTL，並在過期回呼會造成意外時保持預設值。

`/model` 和 `/models` 斜線指令會開啟互動式模型選擇器，其中包含供應商、模型和相容執行時期的下拉選單，以及一個提交步驟。`/models add` 已棄用，現在會傳回棄用訊息，而不是從聊天中註冊模型。選擇器的回覆是暫時性的，只有發出指令的使用者能看見。Discord 選單限制為 25 個選項，因此當您希望選擇器僅顯示特定供應商（例如 `openai-codex` 或 `vllm`）的動態探索模型時，請將 `provider/*` 項目新增至 `agents.defaults.models`。

檔案附件：

- `file` 區塊必須指向附件參照 (`attachment://<filename>`)
- 透過 `media`/`path`/`filePath` 提供附件（單一檔案）；多個檔案請使用 `media-gallery`
- 當上傳名稱應符合附件參照時，使用 `filename` 覆寫

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
  <Tab title="DM 政策">
    `channels.discord.dmPolicy` 控制存取權限。`channels.discord.allowFrom` 是標準的 DM 允許清單。

    - `pairing` （預設）
    - `allowlist`
    - `open` （需要 `channels.discord.allowFrom` 包含 `"*"`）
    - `disabled`

    如果 DM 政策未開放，未知使用者會被封鎖（或在 `pairing` 模式下提示配對）。

    多帳號優先順序：

    - `channels.discord.accounts.default.allowFrom` 僅適用於 `default` 帳號。
    - 對於單一帳號，`allowFrom` 優先於舊版 `dm.allowFrom`。
    - 當具名帳號自身的 `allowFrom` 和舊版 `dm.allowFrom` 未設定時，會繼承 `channels.discord.allowFrom`。
    - 具名帳號不會繼承 `channels.discord.accounts.default.allowFrom`。

    舊版 `channels.discord.dm.policy` 和 `channels.discord.dm.allowFrom` 仍為相容性而讀取。`openclaw doctor --fix` 會在不改變存取權限的情況下，將其遷移至 `dmPolicy` 和 `allowFrom`。

    傳送的 DM 目標格式：

    - `user:<id>`
    - `<@id>` 提及

    當頻設預設值啟用時，純數字 ID 通常會解析為頻道 ID，但為了相容性，列在帳號有效 DM `allowFrom` 中的 ID 會被視為使用者 DM 目標。

  </Tab>

  <Tab title="存取群組">
    Discord 私訊與文字指令授權可在 `channels.discord.allowFrom` 中使用動態 `accessGroup:<name>` 項目。

    存取群組名稱在訊息頻道間共用。若為靜態群組（成員以各頻道的正常 `allowFrom` 語法表示），請使用 `type: "message.senders"`；若應由 Discord 頻道目前的 `ViewChannel` 受眾動態定義成員資格，則使用 `type: "discord.channelAudience"`。共用存取群組的行為紀錄於此：[存取群組](/zh-Hant/channels/access-groups)。

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

    Discord 文字頻道沒有獨立的成員清單。`type: "discord.channelAudience"` 將成員資格建模為：私訊發送者為已設定伺服器的成員，且在套用角色與頻道覆寫後，目前在已設定頻道上擁有有效的 `ViewChannel` 權限。

    範例：允許任何可查看 `#maintainers` 的人私訊機器人，同時對其他所有人關閉私訊。

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

    您可以混合動態與靜態項目：

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

    查詢失敗時預設封鎖。如果 Discord 傳回 `Missing Access`、成員查詢失敗，或頻道屬於不同的伺服器，該私訊發送者將被視為未授權。

    使用頻道受眾存取群組時，請在 Discord 開發者入口網站為機器人啟用 **Server Members Intent**。私訊不包含伺服器成員狀態，因此 OpenClaw 會在授權時透過 Discord REST 解析成員。

  </Tab>

  <Tab title="Guild policy">
    公會處理由 `channels.discord.groupPolicy` 控制：

    - `open`
    - `allowlist`
    - `disabled`

    當存在 `channels.discord` 時，安全基線為 `allowlist`。

    `allowlist` 行為：

    - 公會必須符合 `channels.discord.guilds`（建議使用 `id`，亦接受 slug）
    - 可選的發送者允許清單：`users`（建議使用穩定 ID）和 `roles`（僅限角色 ID）；如果配置了其中任何一個，當發送者符合 `users` 或 `roles` 時即被允許
    - 預設停用直接名稱/標籤匹配；僅將 `channels.discord.dangerouslyAllowNameMatching: true` 作為緊急兼容模式啟用
    - `users` 支援名稱/標籤，但 ID 更安全；當使用名稱/標籤項目時，`openclaw security audit` 會發出警告
    - 如果公會配置了 `channels`，則會拒絕未列出的頻道
    - 如果公會沒有 `channels` 區塊，則允許該已列入允許清單之公會中的所有頻道

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

    如果您僅設定 `DISCORD_BOT_TOKEN` 且未建立 `channels.discord` 區塊，即使 `channels.defaults.groupPolicy` 為 `open`，執行時期後備仍為 `groupPolicy="allowlist"`（並在日誌中發出警告）。

  </Tab>

  <Tab title="Mentions and group DMs">
    伺服器訊息預設會受到提及限制。

    提及偵測包含：

    - 明確的機器人提及
    - 設定的提及模式 (`agents.list[].groupChat.mentionPatterns`, 後備 `messages.groupChat.mentionPatterns`)
    - 在支援情況下的隱含回覆機器人行為

    當撰寫外發 Discord 訊息時，請使用標準提及語法：使用者用 `<@USER_ID>`, 頻道用 `<#CHANNEL_ID>`, 以及角色用 `<@&ROLE_ID>`。請勿使用舊版的 `<@!USER_ID>` 暱稱提及形式。

    `requireMention` 是針對每個伺服器/頻道 (`channels.discord.guilds...`) 進行設定。
    `ignoreOtherMentions` 可選地捨棄提及其他使用者/角色但未提及機器人的訊息（不包括 @everyone/@here）。

    群組 DM：

    - 預設：忽略 (`dm.groupEnabled=false`)
    - 透過 `dm.groupChannels` 的可選允許清單 (頻道 ID 或 slug)

  </Tab>
</Tabs>

### 基於角色的代理程式路由

使用 `bindings[].match.roles` 根據角色 ID 將 Discord 伺服器成員路由到不同的代理程式。基於角色的綁定僅接受角色 ID，並且在對等或父對等綁定之後評估，而在僅伺服器綁定之前評估。如果綁定也設定了其他相符欄位（例如 `peer` + `guildId` + `roles`），則所有設定的欄位都必須相符。

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
- 每個頻道的覆寫：`channels.discord.commands.native`。
- `commands.native=false` 會在啟動期間跳過 Discord 斜線指令註冊和清理。先前註冊的指令可能會在 Discord 中保持可見，直到您從 Discord 應用程式中將其移除。
- 原生指令授權使用與一般訊息處理相同的 Discord 允許清單/原則。
- 對於未獲授權的使用者，指令可能仍會在 Discord UI 中可見；執行仍會強制執行 OpenClaw 授權並傳回「未授權」。

請參閱 [Slash commands](/zh-Hant/tools/slash-commands) 以了解指令目錄和行為。

預設斜線指令設定：

- `ephemeral: true`

## 功能詳情

<AccordionGroup>
  <Accordion title="Reply tags and native replies">
    Discord 在代理輸出中支援回覆標籤：

    - `[[reply_to_current]]`
    - `[[reply_to:<id>]]`

    由 `channels.discord.replyToMode` 控制：

    - `off` (預設)
    - `first`
    - `all`
    - `batched`

    注意：`off` 會停用隱式回覆串接。明確的 `[[reply_to_*]]` 標籤仍會被接受。
    `first` 總是將隱式原生回覆參照附加至該回合的第一則傳出 Discord 訊息。
    `batched` 僅在傳入事件為多則訊息的防抖批次時，才附加 Discord 的隱式原生回覆參照。當您主要希望對模糊的突發聊天使用原生回覆，而非對每一則單一訊息回合使用時，這就很有用。

    訊息 ID 會顯示於情境/歷史中，以便代理能夠指定特定訊息。

  </Accordion>

  <Accordion title="Link previews">
    Discord 預設會為 URL 產生豐富的連結嵌入。OpenClaw 預設會在傳出的 Discord 訊息上抑制這些產生的嵌入，因此除非您選擇加入，否則代理傳送的 URL 將保持為純文字連結：

```json5
{
  channels: {
    discord: {
      suppressEmbeds: false,
    },
  },
}
```

    設定 `channels.discord.accounts.<id>.suppressEmbeds` 以覆寫單一帳戶。代理訊息工具傳送也可以針對單一訊息傳遞 `suppressEmbeds: false`。明確的 Discord `embeds` 承載不會受到預設連結預覽設定的抑制。

  </Accordion>

  <Accordion title="直播預覽">
    OpenClaw 可以透過發送暫時訊息並隨著文字送達編輯該訊息來串流草稿回覆。`channels.discord.streaming` 接受 `off` | `partial` | `block` | `progress` (預設)。`progress` 會維持一個可編輯的狀態草稿，並隨著工具進度更新它，直到最終傳送；共享的起始標籤是滾動行，因此一旦出現足夠的工作，它就會像其他內容一樣捲動消失。`streamMode` 是舊版執行時期別名。執行 `openclaw doctor --fix` 可將持久化的設定重寫為正式鍵值。

    將 `channels.discord.streaming.mode` 設為 `off` 以停用 Discord 預覽編輯。如果明確啟用了 Discord 區塊串流，OpenClaw 將跳過預覽串流以避免重複串流。

```json5
{
  channels: {
    discord: {
      streaming: {
        mode: "progress",
        progress: {
          label: "auto",
          maxLines: 8,
          maxLineChars: 120,
          toolProgress: true,
          commentary: false,
        },
      },
    },
  },
}
```

    - `partial` 會在 token 送達時編輯單一預覽訊息。
    - `block` 會發送草稿大小的區塊 (使用 `draftChunk` 調整大小和中斷點，限制為 `textChunkLimit`)。
    - 媒體、錯誤和明確回覆的最終結果會取消待處理的預覽編輯。
    - `streaming.preview.toolProgress` (預設 `true`) 控制工具/進度更新是否重複使用預覽訊息。
    - 工具/進度列在可用時會以精簡的表情符號 + 標題 + 詳細資訊呈現，例如 `🛠️ Bash: run tests` 或 `🔎 Web Search: for "query"`。
    - `streaming.progress.commentary` (預設 `false`) 選擇在暫時進度草稿中包含助理評論/序言文字。評論會在顯示前清理，保持暫時性，且不會改變最終答案的傳送。
    - `streaming.progress.maxLineChars` 控制每行進度預覽的預算。散文會在單字邊界縮短；指令和路徑詳細資訊會保留有用的後綴。
    - `streaming.preview.commandText` / `streaming.progress.commandText` 控制精簡進度列中的指令/執行詳細資訊：`raw` (預設) 或 `status` (僅工具標籤)。

    隱藏原始指令/執行文字，同時保留精簡進度列：

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

    預覽串流僅限文字；媒體回覆會回退到正常傳送。當明確啟用 `block` 串流時，OpenClaw 將跳過預覽串流以避免重複串流。

  </Accordion>

  <Accordion title="歷史記錄、上下文與串控行為">
    公會歷史記錄上下文：

    - `channels.discord.historyLimit` 預設 `20`
    - 後備： `messages.groupChat.historyLimit`
    - `0` 停用

    DM 歷史記錄控制：

    - `channels.discord.dmHistoryLimit`
    - `channels.discord.dms["<user_id>"].historyLimit`

    串控行為：

    - Discord 串留言論會作為頻道會話進行路由，並繼承父頻道配置，除非被覆寫。
    - 串留言論會話會繼承父頻道的會話層級 `/model` 選擇作為僅限模型的后備；串留言論本地的 `/model` 選擇仍優先，且除非啟用了對話記錄繼承，否則不會複製父對話記錄歷史。
    - `channels.discord.thread.inheritParent` (預設 `false`) 會讓新的自動串留言論選擇從父對話記錄進行初始化。每個帳號的覆寫位於 `channels.discord.accounts.<id>.thread.inheritParent` 下。
    - 訊息工具反應可以解析 `user:<id>` DM 目標。
    - 在回覆階段啟用後備期間，`guilds.<guild>.channels.<channel>.requireMention: false` 會被保留。

    頻道主題會作為**不受信任**的上下文被注入。允許清單控制誰可以觸發代理，而不是完整的補充上下文編輯邊界。

  </Accordion>

  <Accordion title="Thread-bound sessions for subagents">
    Discord 可以將執行緒綁定到會話目標，以便該執行緒中的後續訊息繼續路由到同一個會話（包括子代理程式會話）。

    指令：

    - `/focus <target>` 將目前/新執行緒綁定到子代理程式/會話目標
    - `/unfocus` 移除目前的執行緒綁定
    - `/agents` 顯示活躍執行與綁定狀態
    - `/session idle <duration|off>` 檢查/更新聚焦綁定的非使用自動取消聚焦
    - `/session max-age <duration|off>` 檢查/更新聚焦綁定的強制最大存活時間

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

    備註：

    - `session.threadBindings.*` 設定全域預設值。
    - `channels.discord.threadBindings.*` 覆寫 Discord 行為。
    - `spawnSessions` 控制 `sessions_spawn({ thread: true })` 和 ACP 執行緒產生的自動建立/綁定執行緒。預設值：`true`。
    - `defaultSpawnContext` 控制執行緒綁定產生的原生子代理程式上下文。預設值：`"fork"`。
    - 已棄用的 `spawnSubagentSessions`/`spawnAcpSessions` 金鑰會由 `openclaw doctor --fix` 遷移。
    - 如果帳戶停用了執行緒綁定，`/focus` 和相關的執行緒綁定操作將無法使用。

    參閱 [Sub-agents](/zh-Hant/tools/subagents)、[ACP Agents](/zh-Hant/tools/acp-agents) 和 [Configuration Reference](/zh-Hant/gateway/configuration-reference)。

  </Accordion>

  <Accordion title="Persistent ACP channel bindings">
    對於穩定的「永遠在線」ACP 工作區，請設定針對 Discord 對話的頂層類型化 ACP 綁定。

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

    註：

    - `/acp spawn codex --bind here` 會就地綁定當前頻道或執行緒，並將後續訊息保留在同一個 ACP 工作階段中。執行緒訊息會繼承上層頻道的綁定。
    - 在已綁定的頻道或執行緒中，`/new` 和 `/reset` 會就地重設同一個 ACP 工作階段。臨時執行緒綁定在啟用時可以覆寫目標解析。
    - `spawnSessions` 透過 `--thread auto|here` 來管控子執行緒的建立/綁定。

    請參閱 [ACP Agents](/zh-Hant/tools/acp-agents) 以了解綁定行為的詳細資訊。

  </Accordion>

  <Accordion title="Reaction notifications">
    每個伺服器的表情符號通知模式：

    - `off`
    - `own` (預設)
    - `all`
    - `allowlist` (使用 `guilds.<id>.users`)

    表情符號事件會被轉換為系統事件，並附加到被路由的 Discord 工作階段。

  </Accordion>

  <Accordion title="Ack reactions">
    當 OpenClaw 正在處理傳入訊息時，`ackReaction` 會傳送確認表情符號。

    解析順序：

    - `channels.discord.accounts.<accountId>.ackReaction`
    - `channels.discord.ackReaction`
    - `messages.ackReaction`
    - 代理程式身分表情符號回退 (`agents.list[].identity.emoji`，否則為 "👀")

    註：

    - Discord 接受 Unicode 表情符號或自訂表情符號名稱。
    - 使用 `""` 來停用特定頻道或帳戶的表情符號回應。

  </Accordion>

  <Accordion title="Config writes">
    通道發起的配置寫入預設為啟用。

    這會影響 `/config set|unset` 流程（當啟用指令功能時）。

    停用：

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
    使用 `channels.discord.proxy` 透過 HTTP(S) 代理伺服器傳送 Discord Gateway WebSocket 流量以及啟動時的 REST 查詢（應用程式 ID + 許可清單解析）。

```json5
{
  channels: {
    discord: {
      proxy: "http://proxy.example:8080",
    },
  },
}
```

    每個帳戶的覆寫：

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

    注意：

    - 許可清單可以使用 `pk:<memberId>`
    - 僅在 `channels.discord.dangerouslyAllowNameMatching: true` 時，成員顯示名稱才會透過名稱/slug 進行比對
    - 查詢使用原始訊息 ID 並受限於時間視窗
    - 如果查詢失敗，代理訊息將被視為機器人訊息並被丟棄，除非 `allowBots=true`

  </Accordion>

  <Accordion title="Outbound mention aliases">
    當代理程式需要針對已知 Discord 使用者進行確定的輸出提及時，請使用 `mentionAliases`。鍵為不帶前導 `@` 的帳號代碼；值為 Discord 使用者 ID。未知的帳號代碼、`@everyone`、`@here` 以及 Markdown 程式碼範圍內的提及將保持不變。

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

  <Accordion title="Discord 中的審批">
    Discord 支援在 DM（直訊）中透過按鈕進行審批處理，並可選擇在原始頻道中發佈審批提示。

    配置路徑：

    - `channels.discord.execApprovals.enabled`
    - `channels.discord.execApprovals.approvers`（可選；盡可能回退至 `commands.ownerAllowFrom`）
    - `channels.discord.execApprovals.target`（`dm` | `channel` | `both`，預設值：`dm`）
    - `agentFilter`、`sessionFilter`、`cleanupAfterResolve`

    當 `enabled` 未設定或為 `"auto"` 且至少可以解析到一位審批者時（來自 `execApprovals.approvers` 或 `commands.ownerAllowFrom`），Discord 會自動啟用原生 exec 審批。Discord 不會從頻道 `allowFrom`、舊版 `dm.allowFrom` 或直訊 `defaultTo` 推斷 exec 審批者。將 `enabled: false` 設定為可明確停用 Discord 作為原生審批客戶端。

    對於敏感的僅限擁有者的群組指令（如 `/diagnostics` 和 `/export-trajectory`），OpenClaw 會私下發送審批提示和最終結果。如果觸發的擁有者有 Discord 擁有者路由，它會優先嘗試 Discord DM；如果不可用，則回退至 `commands.ownerAllowFrom` 中第一個可用的擁有者路由（例如 Telegram）。

    當 `target` 為 `channel` 或 `both` 時，審批提示在頻道中可見。只有被解析的審批者可以使用這些按鈕；其他用戶會收到暫時性的拒絕提示。審批提示包含指令文本，因此請僅在受信任的頻道中啟用頻道投遞。如果無法從會話金鑰匯出頻道 ID，OpenClaw 將回退至 DM 投遞。

    Discord 也會呈現其他聊天頻道使用的共用審批按鈕。原生 Discord 介面卡主要增加了審批者 DM 路由和頻道分發。
    當這些按鈕存在時，它們是主要的審批 UX；OpenClaw
    應僅在工具結果指出
    聊天審批不可用或手動審批是唯一途徑時，才包含手動 `/approve` 指令。
    如果 Discord 原生審批執行時未啟用，OpenClaw 會保持
    本地確定性 `/approve <id> <decision>` 提示可見。如果
    執行時已啟用但無法將原生卡片傳送至任何目標，
    OpenClaw 將發送包含來自待處理審批的確切 `/approve`
    指令的同聊回退通知。

    Gateway 授權和審批解析遵循共用的 Gateway 客戶端契約（`plugin:` ID 透過 `plugin.approval.resolve` 解析；其他 ID 透過 `exec.approval.resolve` 解析）。審批預設在 30 分鐘後過期。

    參閱 [Exec 審批](/zh-Hant/tools/exec-approvals)。

  </Accordion>
</AccordionGroup>

## 工具和操作門控

Discord 訊息操作包括傳訊、頻道管理、內容審核、狀態和元資料操作。

核心範例：

- 訊息傳遞：`sendMessage`、`readMessages`、`editMessage`、`deleteMessage`、`threadReply`
- 反應：`react`、`reactions`、`emojiList`
- 內容審核：`timeout`、`kick`、`ban`
- 狀態：`setPresence`

`event-create` 操作接受選用的 `image` 參數（URL 或本地檔案路徑）以設定排程活動的封面圖片。

操作門控位於 `channels.discord.actions.*` 之下。

預設閘道行為：

| 操作群組                                                                                                                                                                 | 預設   |
| ------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ------ |
| reactions, messages, threads, pins, polls, search, memberInfo, roleInfo, channelInfo, channels, voiceStatus, events, stickers, emojiUploads, stickerUploads, permissions | 已啟用 |
| roles                                                                                                                                                                    | 已停用 |
| moderation                                                                                                                                                               | 已停用 |
| presence                                                                                                                                                                 | 已停用 |

## 組件 v2 UI

OpenClaw 使用 Discord 組件 v2 來進行執行審批和跨上下文標記。Discord 訊息操作也可以接受 `components` 以用於自訂 UI（進階；需要透過 discord 工具建構組件載荷），而舊版的 `embeds` 仍然可用但不建議使用。

- `channels.discord.ui.components.accentColor` 設定 Discord 組件容器所使用的強調顏色（十六進位）。
- 使用 `channels.discord.accounts.<id>.ui.components.accentColor` 為每個帳戶設定。
- `channels.discord.agentComponents.ttlMs` 控制已發送的 Discord 組件回調註冊保留的時間長度（預設 `1800000`，最大 `86400000`）。使用 `channels.discord.accounts.<id>.agentComponents.ttlMs` 為每個帳戶設定。
- 當存在組件 v2 時，`embeds` 會被忽略。
- 純 URL 預覽預設會被隱藏。當單一出站連結應展開時，在訊息操作上設定 `suppressEmbeds: false`。

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

Discord 有兩種不同的語音介面：即時**語音頻道**（持續對話）和**語音訊息附件**（波形預覽格式）。閘道支援這兩種格式。

### 語音頻道

設定檢查清單：

1. 在 Discord 開發者入口網站中啟用 Message Content Intent。
2. 當使用角色/使用者白名單時，啟用 Server Members Intent。
3. 使用 `bot` 和 `applications.commands` 範圍邀請機器人。
4. 在目標語音頻道中授予 Connect、Speak、Send Messages 和 Read Message History 權限。
5. 啟用原生指令（`commands.native` 或 `channels.discord.commands.native`）。
6. 設定 `channels.discord.voice`。

使用 `/vc join|leave|status` 來控制會話。該指令使用帳戶預設代理程式，並遵循與其他 Discord 指令相同的白名單和群組政策規則。

```bash
/vc join channel:<voice-channel-id>
/vc status
/vc leave
```

若要在加入之前檢查機器人的有效權限，請執行：

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
        allowedChannels: [
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
          speakerVoice: "cedar",
        },
      },
    },
  },
}
```

備註：

- `voice.tts` 僅針對 `stt-tts` 語音播放覆寫 `messages.tts`。即時模式使用 `voice.realtime.speakerVoice`。
- `voice.mode` 控制對話路徑。預設為 `agent-proxy`：即時語音前端處理輪次計時、中斷和播放，將實質工作透過 `openclaw_agent_consult` 委派給路由的 OpenClaw 代理程式，並將結果視為來自該說話者的輸入 Discord 提示。`stt-tts` 保留較舊的批次 STT 加 TTS 流程。`bidi` 允許即時模型直接對話，同時為 OpenClaw 大腦暴露 `openclaw_agent_consult`。
- `voice.agentSession` 控制哪個 OpenClaw 對話接收語音輪次。保留未設定狀態以供語音頻道自己的會話使用，或設定 `{ mode: "target", target: "channel:<text-channel-id>" }` 使語音頻道充當現有 Discord 文字頻道會話（例如 `#maintainers`）的麥克風/擴充功能。
- `voice.model` 會覆寫 Discord 語音回應和即時諮詢的 OpenClaw agent brain。保留未設定以繼承路由的 agent model。它與 `voice.realtime.model` 分開。
- `voice.followUsers` 讓機器人能夠與選定的使用者加入、移動及離開 Discord 語音。請參閱 [Follow users in voice](#follow-users-in-voice) 以了解行為規則和範例。
- `agent-proxy` 將語音透過 `discord-voice` 路由，這為發言者和目標工作階段保留了正常的擁有者/工具授權，但隱藏了 agent `tts` 工具，因為 Discord 語音擁有播放控制權。預設情況下，`agent-proxy` 為擁有者發言者 (`voice.realtime.toolPolicy: "owner"`) 提供完全等同擁有者的工具存取權，並強烈偏好在提供實質答案之前諮詢 OpenClaw agent (`voice.realtime.consultPolicy: "always"`)。在該預設 `always` 模式下，即時層不會在諮詢答案之前自動說出填充詞；它會擷取並轉錄語音，然後說出路由的 OpenClaw 答案。如果在 Discord 仍在播放第一個答案時完成了多個強制諮詢答案，後續的精確語音答案將會排隊直到播放閒置，而不是替換語音中間的句子。
- 在 `stt-tts` 模式下，STT 使用 `tools.media.audio`；`voice.model` 不會影響轉錄。
- 在即時模式中，`voice.realtime.provider`、`voice.realtime.model` 和 `voice.realtime.speakerVoice` 會設定即時音訊階段。若使用 OpenAI Realtime 2 加上 Codex brain，請使用 `voice.realtime.model: "gpt-realtime-2"` 和 `voice.model: "openai-codex/gpt-5.5"`。
- 即時語音模式預設在即時提供者指令中包含小型 `IDENTITY.md`、`USER.md` 和 `SOUL.md` 設定檔，以便快速直接輪次保持與路由 OpenClaw 代理相同的身分、使用者基礎和角色。設定 `voice.realtime.bootstrapContextFiles` 為子集以自訂此設定，或設定為 `[]` 以停用。支援的即時啟動檔案僅限於這些設定檔；`AGENTS.md` 保留在一般代理上下文中。注入的設定檔上下文不會取代工作區工作、當前事實、記憶查詢或工具支援動作的 `openclaw_agent_consult`。
- 在 OpenAI `agent-proxy` 即時模式中，設定 `voice.realtime.requireWakeName: true` 可讓 Discord 即時語音保持靜音，直到文字記錄以喚醒名稱開頭或結尾為止。設定的喚醒名稱必須是一個或兩個字。若未設定 `voice.realtime.wakeNames`，OpenClaw 將使用路由代理的 `name` 加上 `OpenClaw`，並回退至代理 id 加上 `OpenClaw`。喚醒名稱閘控會停用即時提供者的自動回應，將接受的回合透過 OpenClaw 代理諮詢路徑進行路由，並在最終文字記錄抵達前，從部分文字記錄中辨識出開頭的喚醒名稱時，給予簡短的口語確認。
- OpenAI 即時提供者接受目前的 Realtime 2 事件名稱和舊版與 Codex 相容的輸出音訊和文字記錄事件別名，因此相容的提供者快照可以偏移而不會丟失助理音訊。
- `voice.realtime.bargeIn` 控制說話者開始事件是否中斷使用中的即時播放。如果未設定，則遵循即時提供者的輸入音訊中斷設定。
- `voice.realtime.minBargeInAudioEndMs` 控制在 OpenAI 即時插話截斷音訊之前的最低助理播放持續時間。預設值：`250`。在低回音房間中設定 `0` 以立即中斷，或在回音較重的揚聲器設置中提高此值。
- 若要在 Discord 上播放 OpenAI 語音，請設定 `voice.tts.provider: "openai"` 並在 `voice.tts.providers.openai.speakerVoice` 下選擇文字轉語音語音。`cedar` 是在目前 OpenAI TTS 模型上一個聽起來不錯的男性聲音選擇。
- 每個頻道的 Discord `systemPrompt` 覆寫會套用至該語音頻道的語音文字記錄回合。
- 語音文字記錄回合會從 Discord `allowFrom` (或 `dm.allowFrom`) 推斷擁有者狀態，以用於擁有者閘控指令和頻道動作。代理工具可見性遵循路由階段的設定工具政策。
- Discord 語音對於僅限文字的設定為選用；請設定 `channels.discord.voice.enabled=true`（或保留現有的 `channels.discord.voice` 區塊）以啟用 `/vc` 指令、語音執行時以及 `GuildVoiceStates` gateway intent。
- `channels.discord.intents.voiceStates` 可以明確覆寫 voice-state intent 訂閱。保持未設定可讓 intent 遵循有效的語音啟用狀態。
- 如果 `voice.autoJoin` 對同一個伺服器有多個項目，OpenClaw 會加入該伺服器最後一個設定的頻道。
- `voice.allowedChannels` 是一個可選用的駐留允許清單。保持未設定可允許 `/vc join` 進入任何已授權的 Discord 語音頻道。設定後，`/vc join`、啟動自動加入以及機器人語音狀態移動將受限於列出的 `{ guildId, channelId }` 項目。將其設為空陣列可拒絕所有 Discord 語音加入。如果 Discord 將機器人移出允許清單，OpenClaw 會離開該頻道，並在可用時重新加入設定的自動加入目標。
- `voice.daveEncryption` 和 `voice.decryptionFailureTolerance` 會傳遞至 `@discordjs/voice` 加入選項。
- 若未設定，`@discordjs/voice` 的預設值為 `daveEncryption=true` 和 `decryptionFailureTolerance=24`。
- OpenClaw 使用內建的 `libopus-wasm` 編解碼器進行 Discord 語音接收和即時原始 PCM 播放。它附帶一個固定的 libopus WebAssembly 版本，不需要原生的 opus 插件。
- `voice.connectTimeoutMs` 控制針對 `/vc join` 和自動加入嘗試的初始 `@discordjs/voice` Ready 等待時間。預設值：`30000`。
- `voice.reconnectGraceMs` 控制 OpenClaw 在斷線的語音工作階段開始重新連線前等待的時間，之後會將其銷毀。預設值：`15000`。
- 在 `stt-tts` 模式下，僅因另一使用者開始說話並不會導致語音播放停止。為避免回饋迴路，當 TTS 正在播放時，OpenClaw 會忽略新的語音擷取；請在播放結束後再說話以進行下一輪對話。即時模式會將說話者開始說話的事件作為插斷訊號轉發給即時供應商。
- 在即時模式中，喇叭聲音進入開啟的麥克風可能會被誤判為插斷並中斷播放。對於回音嚴重的 Discord 聊天室，請設定 `voice.realtime.providers.openai.interruptResponseOnInputAudio: false` 以防止 OpenAI 在輸入音訊時自動中斷。如果您仍希望 Discord 的說話者開始事件能中斷正在進行的播放，請加入 `voice.realtime.bargeIn: true`。OpenAI 即時橋接器會忽略短於 `voice.realtime.minBargeInAudioEndMs` 的播放截斷，將其視為可能的回音/雜訊，並將其記錄為已跳過，而不是清除 Discord 的播放。
- `voice.captureSilenceGraceMs` 控制在 Discord 回報說話者停止後，OpenClaw 等待多久才將該音訊片段定稿以進行 STT。預設值：`2000`；如果 Discord 將正常的停頓分割成零碎的部分逐字稿，請提高此數值。
- 當 ElevenLabs 是選定的 TTS 提供者時，Discord 語音播放使用串流 TTS 並從提供者回應串流開始。不支援串流的提供者會回退到合成暫存檔案路徑。
- OpenClaw 也會監控接收解密失敗，並透過在短時間內重複失敗後離開/重新加入語音頻道來自動復原。
- 如果更新後接收日誌重複顯示 `DecryptionFailed(UnencryptedWhenPassthroughDisabled)`，請收集相依性報告和日誌。隨附的 `@discordjs/voice` 行包含來自 discord.js PR #11449 的上游填充修正，該修正解決了 discord.js issue #11419。
- 當 OpenClaw 將擷取的說話者片段定稿時，預期會出現 `The operation was aborted` 接收事件；這些是詳細的診斷訊息，而非警告。
- 詳細的 Discord 語音紀錄包含每個已接受說話者片段的有限單行 STT 轉錄預覽，因此除錯時會顯示使用者端與代理程式回覆端，而不會傾印無限制的轉錄文字。
- 在 `agent-proxy` 模式下，強制諮詢回退機制會跳過可能不完整的逐字稿片段，例如以 `...` 結尾的文字或像 `and` 這樣的尾隨連接詞，以及明顯無法執行的結束語，如「馬上回來」或「再見」。當此機制阻止過時的排隊回答時，日誌會顯示 `forced agent consult skipped reason=...`。

### 在語音中跟隨使用者

當您希望 Discord 語音機器人跟隨一位或多位已知的 Discord 使用者，而不是在啟動時加入固定頻道或等待 `/vc join` 時，請使用 `voice.followUsers`。

```json5
{
  channels: {
    discord: {
      voice: {
        enabled: true,
        followUsersEnabled: true,
        followUsers: ["discord:123456789012345678"],
        allowedChannels: [
          {
            guildId: "123456789012345678",
            channelId: "234567890123456789",
          },
        ],
      },
    },
  },
}
```

行為：

- `followUsers` 接受原始 Discord 使用者 ID 和 `discord:<id>` 值。OpenClaw 在比對語音狀態事件前會將兩者正規化。
- 當設定 `followUsers` 時，`followUsersEnabled` 預設為 `true`。將其設為 `false` 可保留已儲存的清單，但停止自動跟隨語音。
- 當被跟隨的使用者加入允許的語音頻道時，OpenClaw 會加入該頻道。當使用者移動時，OpenClaw 會跟隨移動。當目前被跟隨的使用者斷線時，OpenClaw 會離開。
- 如果多個被跟隨的使用者位於同一個伺服器中，且目前被跟隨的使用者離開，OpenClaw 會在離開伺服器之前移動到另一個追蹤的被跟隨使用者的頻道。如果多個被跟隨的使用者同時移動，則以最新觀察到的語音狀態事件為準。
- `allowedChannels` 仍然適用。位於不允許頻道中的被跟隨使用者會被忽略，而由跟隨擁有的階段會移至另一位被跟隨使用者或離開。
- OpenClaw 會在啟動時和以受限間隔調和錯過的語音狀態事件。調和會對設定的伺服器進行抽樣，並限制每次執行的 REST 查詢次數，因此非常大的 `followUsers` 清單可能需要超過一個間隔才能收斂。
- 如果 Discord 或管理員在機器人跟隨使用者時移動機器人，OpenClaw 會重建語音階段，並在目標允許時保留跟隨擁有權。如果機器人被移至 `allowedChannels` 之外，OpenClaw 會離開並在存在設定目標時重新加入。
- DAVE 接收恢復機制可能會在重複解密失敗後離開並重新加入同一頻道。由追蹤擁有的會話會透過該恢復路徑保留其追蹤權限，因此之後被追蹤的使用者斷線仍會離開頻道。

在加入模式之間選擇：

- 對於您希望機器人在您語音時自動加入的個人或操作員設定，請使用 `followUsers`。
- 對於即使沒有被追蹤的使用者語音也應存在的固定房間機器人，請使用 `autoJoin`。
- 對於一次性加入或自動語音出現會令人感到意外的房間，請使用 `/vc join`。

Discord 語音編解碼器：

- 語音接收日誌顯示 `discord voice: opus decoder: libopus-wasm`。
- 即時播放會使用相同的捆綁 `libopus-wasm` 套件，將原始 48 kHz 立體聲 PCM 編碼為 Opus，然後將封包傳遞給 `@discordjs/voice`。
- 檔案和提供者串流播放會使用 ffmpeg 轉碼為原始 48 kHz 立體聲 PCM，然後使用 `libopus-wasm` 產生傳送至 Discord 的 Opus 封包串流。

STT 加上 TTS 管線：

- Discord PCM 擷取內容會轉換為 WAV 暫存檔案。
- `tools.media.audio` 處理 STT，例如 `openai/gpt-4o-mini-transcribe`。
- 逐字稿會透過 Discord 進入和路由傳送，同時回應 LLM 以語音輸出原則執行，該原則會隱藏代理程式 `tts` 工具並要求傳回文字，因為 Discord 語音擁有最終的 TTS 播放。
- `voice.model` 如果設定，僅會覆蓋此語音頻道輪次的回應 LLM。
- `voice.tts` 會與 `messages.tts` 合併；支援串流的提供者會直接饋送給播放器，否則產生的音訊檔案將在加入的頻道中播放。

預設代理人代理語音頻道會話範例：

```json5
{
  channels: {
    discord: {
      voice: {
        enabled: true,
        model: "openai-codex/gpt-5.5",
        followUsersEnabled: true,
        followUsers: ["123456789012345678"],
        realtime: {
          provider: "openai",
          model: "gpt-realtime-2",
          speakerVoice: "cedar",
        },
      },
    },
  },
}
```

如果沒有 `voice.agentSession` 區塊，每個語音頻道都會獲得自己獨立路由的 OpenClaw 工作階段。例如，`/vc join channel:234567890123456789` 會與該 Discord 語音頻道的工作階段對話。即時模型僅是語音前端；實質請求會交給設定的 OpenClaw 代理程式。如果即時模型產生的最終逐字稿未呼叫 consult 工具，OpenClaw 會強制執行 consult 作為後備機制，以便預設行為仍像與代理程式對話。

傳統 STT 加上 TTS 的範例：

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
          providers: {
            openai: {
              model: "gpt-4o-mini-tts",
              speakerVoice: "cedar",
            },
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
          speakerVoice: "cedar",
          toolPolicy: "safe-read-only",
          consultPolicy: "always",
        },
      },
    },
  },
}
```

語音作為現有 Discord 頻道會話的擴充：

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
          speakerVoice: "cedar",
        },
      },
    },
  },
}
```

在 `agent-proxy` 模式下，機器人會加入設定的語音頻道，但 OpenClaw 代理程式輪次會使用目標頻道的正常路由工作階段和代理程式。即時語音工作階段會將傳回的結果說話回傳到語音頻道中。監督代理程式仍可根據其工具政策使用正常的訊息工具，包括如果這是正確的操作，則發送單獨的 Discord 訊息。

當委派的 OpenClaw 執行處於啟用狀態時，新的 Discord 語音逐字稿會在啟動另一個代理程式回合之前被視為即時執行控制。諸如「status」、「cancel that」、「use the smaller fix」或「when you're done also check tests」之類的短語會被分類為狀態、取消、導引或針對啟用中會話的後續輸入。狀態、取消、已接受的導引以及後續結果會被朗讀回語音頻道，以便呼叫者知道 OpenClaw 是否處理了該請求。

有用的目標形式：

- `target: "channel:123456789012345678"` 會透過 Discord 文字頻道工作階段進行路由。
- `target: "123456789012345678"` 被視為頻道目標。
- `target: "dm:123456789012345678"` 或 `target: "user:123456789012345678"` 會透過該直訊工作階段進行路由。

重度回音的 OpenAI Realtime 範例：

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
          speakerVoice: "cedar",
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

當模型透過開放式麥克風聽到自己的 Discord 播放聲音，但您仍想透過說話來中斷它時，請使用此功能。OpenClaw 會防止 OpenAI 在原始輸入音訊上自動中斷，而 `bargeIn: true` 則允許 Discord 揚聲器啟動事件和已啟用的揚聲器音訊在下一個擷取的輪次到達 OpenAI 之前取消作用中的即時回應。在 `minBargeInAudioEndMs` 以下且 `audioEndMs` 非常早的插入信號會被視為可能的回音/雜音並予以忽略，以免模型在第一個播放影格就被切斷。

預期的語音日誌：

- 加入時：`discord voice: joining ... voiceSession=... supervisorSession=... agentSessionMode=... voiceModel=... realtimeModel=...`
- 即時開始時：`discord voice: realtime bridge starting ... autoRespond=false interruptResponse=false bargeIn=false minBargeInAudioEndMs=...`
- 揚聲器音訊時：`discord voice: realtime speaker turn opened ...`、`discord voice: realtime input audio started ... outputAudioMs=... outputActive=...` 和 `discord voice: realtime speaker turn closed ... chunks=... discordBytes=... realtimeBytes=... interruptedPlayback=...`
- 跳過過時語音時：`discord voice: realtime forced agent consult skipped reason=incomplete-transcript ...` 或 `reason=non-actionable-closing ...`
- 即時回應完成時：`discord voice: realtime audio playback finishing reason=response.done ... audioMs=... chunks=...`
- 播放停止/重置時：`discord voice: realtime audio playback stopped reason=... audioMs=... elapsedMs=... chunks=...`
- 即時諮詢時：`discord voice: realtime consult requested ... voiceSession=... supervisorSession=... question=...`
- 代理人回答時：`discord voice: agent turn answer ...`
- 佇列精確語音時：`discord voice: realtime exact speech queued ... queued=... outputAudioMs=... outputActive=...`，接著是 `discord voice: realtime exact speech dequeued reason=player-idle ...`
- 檢測到插話時：`discord voice: realtime barge-in detected source=speaker-start ...` 或 `discord voice: realtime barge-in detected source=active-speaker-audio ...`，接著是 `discord voice: realtime barge-in requested reason=... outputAudioMs=... outputActive=...`
- 即時中斷時：`discord voice: realtime model interrupt requested client:response.cancel reason=barge-in`，接著是 `discord voice: realtime model audio truncated client:conversation.item.truncate reason=barge-in audioEndMs=...` 或 `discord voice: realtime model interrupt confirmed server:response.done status=cancelled ...`
- 忽略回音/噪音時：`discord voice: realtime model interrupt ignored client:conversation.item.truncate.skipped reason=barge-in audioEndMs=0 minAudioEndMs=250`
- 停用插話時：`discord voice: realtime capture ignored during playback (barge-in disabled) ...`
- 播放閒置時：`discord voice: realtime barge-in ignored reason=... outputActive=false ... playbackChunks=0`

若要對被切斷的音訊進行除錯，請將即時語音日誌視為時間軸來閱讀：

1. `realtime audio playback started` 表示 Discord 已開始播放助手音訊。橋接器從此時開始計算助手輸出區塊、Discord PCM 位元組、提供者即時位元組以及合成音訊持續時間。
2. `realtime speaker turn opened` 標記 Discord 說音者變為啟用狀態。如果播放已啟用且 `bargeIn` 已啟用，這之後可能會接著 `barge-in detected source=speaker-start`。
3. `realtime input audio started` 標記為該說話者輪次收到的第一個實際音訊幀。此處的 `outputActive=true` 或非零 `outputAudioMs` 表示麥克風正在發送輸入，而助手播放仍在進行中。
4. `barge-in detected source=active-speaker-audio` 表示 OpenClaw 在助手播放啟用時偵測到即時說話者音訊。這有助於區分真實的中斷與沒有實用音訊的 Discord 說話者開始事件。
5. `barge-in requested reason=...` 表示 OpenClaw 已要求即時提供者取消或截斷作用中的回應。它包含 `outputAudioMs`、`outputActive` 和 `playbackChunks`，因此您可以看到在中斷之前實際播放了多少助手音訊。
6. `realtime audio playback stopped reason=...` 是本機 Discord 播放重置點。原因說明了是誰停止了播放：`barge-in`、`player-idle`、`provider-clear-audio`、`forced-agent-consult`、`stream-close` 或 `session-close`。
7. `realtime speaker turn closed` 總結了捕捉到的輸入回合。`chunks=0` 或 `hasAudio=false` 表示說話者回合已開啟，但沒有可用的音訊到達即時橋接器。`interruptedPlayback=true` 表示輸入回合與助手輸出重疊並觸發了插話邏輯。

實用欄位：

- `outputAudioMs`：即時提供者在該日誌行之前產生的助手音訊持續時間。
- `audioMs`：OpenClaw 在播放停止前計算的助手音訊持續時間。
- `elapsedMs`：開啟和關閉播放串流或說話者回合之間的牆上時鐘時間。
- `discordBytes`：傳送到 Discord 語音或從 Discord 語音接收的 48 kHz 立體聲 PCM 位元組。
- `realtimeBytes`：傳送到即時提供者或從即時提供者接收的提供者格式 PCM 位元組。
- `playbackChunks`：轉發到 Discord 以進行主動回應的助手音訊區塊。
- `sinceLastAudioMs`：最後捕捉到的說話者音訊框架與說話者回合結束之間的間隔。

常見模式：

- 如果立即中斷並伴有 `source=active-speaker-audio`、`outputAudioMs` 很小，且附近有相同用戶，通常表示揚聲器的回聲進入了麥克風。請提高 `voice.realtime.minBargeInAudioEndMs`、降低揚聲器音量、使用耳機或設定 `voice.realtime.providers.openai.interruptResponseOnInputAudio: false`。
- `source=speaker-start` 後接 `speaker turn closed ... hasAudio=false` 表示 Discord 回報了說話者開始，但沒有音訊到達 OpenClaw。這可能是一個暫時性的 Discord 語音事件、噪聲閘行為，或者是客戶端短暫按下了麥克風按鍵。
- 如果附近沒有插話或 `provider-clear-audio` 卻出現 `audio playback stopped reason=stream-close`，表示本機 Discord 播放串流意外結束。請檢查先前的提供者和 Discord 播放器日誌。
- `capture ignored during playback (barge-in disabled)` 表示 OpenClaw 在助手音訊啟動時故意丟棄了輸入。如果您希望語音能中斷播放，請啟用 `voice.realtime.bargeIn`。
- `barge-in ignored ... outputActive=false` 表示 Discord 或提供者 VAD 偵測到語音，但 OpenClaw 沒有進行中的播放可中斷。這不應該切斷音訊。

憑證是根據組件解析的：`voice.model` 的 LLM 路由驗證、`tools.media.audio` 的 STT 驗證、`messages.tts`/`voice.tts` 的 TTS 驗證，以及 `voice.realtime.providers` 或提供者一般驗證設定的即時提供者驗證。

### 語音訊息

Discord 語音訊息會顯示波形預覽，並且需要 OGG/Opus 音訊。OpenClaw 會自動產生波形，但在閘道主機上需要 `ffmpeg` 和 `ffprobe` 來檢查和轉換。

- 提供 **本地檔案路徑**（會拒絕 URL）。
- 省略文字內容（Discord 會拒絕在同一個載荷中同時包含文字與語音訊息）。
- 接受任何音訊格式；OpenClaw 會視需要轉換為 OGG/Opus。

```bash
message(action="send", channel="discord", target="channel:123", path="/path/to/audio.mp3", asVoice=true)
```

## 疑難排解

<AccordionGroup>
  <Accordion title="使用了不允許的意圖或機器人未看到公會訊息">

    - 啟用訊息內容意圖
    - 當您依賴使用者/成員解析時，啟用伺服器成員意圖
    - 變更意圖後重新啟動閘道

  </Accordion>

  <Accordion title="公會訊息意外被封鎖">

    - 驗證 `groupPolicy`
    - 驗證 `channels.discord.guilds` 下的公會允許清單
    - 如果公會 `channels` 對應存在，則僅允許列出的頻道
    - 驗證 `requireMention` 行為和提及模式

    實用的檢查方式：

```bash
openclaw doctor
openclaw channels status --probe
openclaw logs --follow
```

  </Accordion>

  <Accordion title="Require mention 為 false 但仍被封鎖">
    常見原因：

    - `groupPolicy="allowlist"` 但沒有符合的公會/頻道允許清單
    - `requireMention` 設定在錯誤的位置（必須在 `channels.discord.guilds` 或頻道項目下）
    - 發送者被公會/頻道 `users` 允許清單封鎖

  </Accordion>

  <Accordion title="Long-running Discord turns or duplicate replies">

    典型日誌：

    - `Slow listener detected ...`
    - `stuck session: sessionKey=agent:...:discord:... state=processing ...`

    Discord 網關佇列調整選項：

    - single-account: `channels.discord.eventQueue.listenerTimeout`
    - multi-account: `channels.discord.accounts.<accountId>.eventQueue.listenerTimeout`
    - 這僅控制 Discord 網關監聽器的工作，而非 Agent 輪次的生命週期

    Discord 不會對佇列中的 Agent 輪次套用以頻道為擁有者的逾時。訊息監聽器會立即移交工作，而佇列中的 Discord 執行會保留每個會話的順序，直到會話/工具/執行時生命週期完成或中止工作。

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
    OpenClaw 會在連線前擷取 Discord `/gateway/bot` 元資料。暫時性失敗會回退至 Discord 的預設網關 URL，並在日誌中進行速率限制。

    元資料逾時調整選項：

    - single-account: `channels.discord.gatewayInfoTimeoutMs`
    - multi-account: `channels.discord.accounts.<accountId>.gatewayInfoTimeoutMs`
    - 當未設定配置時的 env 回退：`OPENCLAW_DISCORD_GATEWAY_INFO_TIMEOUT_MS`
    - 預設值：`30000` (30 秒)，最大值：`120000`

  </Accordion>

  <Accordion title="Gateway READY timeout restarts">
    OpenClaw 會在啟動期間以及執行階段重新連線後，等待 Discord 的 gateway `READY` 事件。具有啟動錯開的多帳號設置，可能需要比預設值更長的啟動 READY 視窗。

    READY timeout 調整選項：

    - 啟動單一帳號：`channels.discord.gatewayReadyTimeoutMs`
    - 啟動多帳號：`channels.discord.accounts.<accountId>.gatewayReadyTimeoutMs`
    - 未設定設定時的啟動環境變數備用方案：`OPENCLAW_DISCORD_READY_TIMEOUT_MS`
    - 啟動預設值：`15000` (15 秒)，最大值：`120000`
    - 執行階段單一帳號：`channels.discord.gatewayRuntimeReadyTimeoutMs`
    - 執行階段多帳號：`channels.discord.accounts.<accountId>.gatewayRuntimeReadyTimeoutMs`
    - 未設定設定時的執行階段環境變數備用方案：`OPENCLAW_DISCORD_RUNTIME_READY_TIMEOUT_MS`
    - 執行階段預設值：`30000` (30 秒)，最大值：`120000`

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

    如果您設定 `channels.discord.allowBots=true`，請使用嚴格提及和允許清單規則來避免迴圈行為。
    建議使用 `channels.discord.allowBots="mentions"` 來僅接受提及該機器人的機器人訊息。

    OpenClaw 也內建了共享的 [機器人迴圈防護](/zh-Hant/channels/bot-loop-protection)。每當 `allowBots` 讓機器人傳送的訊息到達分派程序時，Discord 會將傳入事件對應到 `(account, channel, bot pair)` 事實，而通用的配對守衛會在配對超過設定的事件預算後抑制該配對。此守衛可防止過去必須由 Discord 速率限制來阻止的失控雙機器人迴圈；它不會影響單一機器人部署或是保持在預算內的一次性機器人回覆。

    預設設定（當設定 `allowBots` 時啟用）：

    - `maxEventsPerWindow: 20` -- 機器人配對可在滑動視窗內交換 20 則訊息
    - `windowSeconds: 60` -- 滑動視窗長度
    - `cooldownSeconds: 60` -- 一旦觸發預算，任何方向的額外機器人對機器人訊息都會被捨棄一分鐘

    在 `channels.defaults.botLoopProtection` 下設定一次共享預設值，然後當合法的工作流程需要更多空間時再覆寫 Discord 設定。優先順序為：

    - `channels.discord.accounts.<account>.botLoopProtection`
    - `channels.discord.botLoopProtection`
    - `channels.defaults.botLoopProtection`
    - 內建預設值

    Discord 使用通用的 `maxEventsPerWindow`、`windowSeconds` 和 `cooldownSeconds` 金鑰。

```json5
{
  channels: {
    defaults: {
      botLoopProtection: {
        maxEventsPerWindow: 20,
        windowSeconds: 60,
        cooldownSeconds: 60,
      },
    },
    discord: {
      // Optional Discord-wide override. Account blocks override individual
      // fields and inherit omitted fields from here.
      botLoopProtection: {
        maxEventsPerWindow: 4,
      },
      accounts: {
        mantis: {
          // Mantis listens to other bots only when they mention her.
          allowBots: "mentions",
        },
        molty: {
          // Molty listens to all bot-authored Discord messages.
          allowBots: true,
          mentionAliases: {
            // Lets Molty write a Mantis Discord mention with the configured user id.
            Mantis: "MANTIS_DISCORD_USER_ID",
          },
          botLoopProtection: {
            // Allow up to five messages per minute before suppressing the pair.
            maxEventsPerWindow: 5,
            windowSeconds: 60,
            cooldownSeconds: 90,
          },
        },
      },
    },
  },
}
```

  </Accordion>

  <Accordion title="Voice STT drops with DecryptionFailed(...)">

    - 保持 OpenClaw 為最新版本 (`openclaw update`)，以確保 Discord 語音接收恢復邏輯存在
    - 確認 `channels.discord.voice.daveEncryption=true`（預設值）
    - 從 `channels.discord.voice.decryptionFailureTolerance=24`（上游預設值）開始，僅在需要時進行調整
    - 監控日誌中的以下內容：
      - `discord voice: DAVE decrypt failures detected`
      - `discord voice: repeated decrypt failures; attempting rejoin`
    - 如果自動重新加入後故障仍然持續，請收集日誌並與 [discord.js #11419](https://github.com/discordjs/discord.js/issues/11419) 和 [discord.js #11449](https://github.com/discordjs/discord.js/pull/11449) 中的上游 DAVE 接收歷史進行比對

  </Accordion>
</AccordionGroup>

## 配置參考

主要參考資料：[Configuration reference - Discord](/zh-Hant/gateway/config-channels#discord)。

<Accordion title="高訊號 Discord 欄位">

- 啟動/驗證：`enabled`、`token`、`accounts.*`、`allowBots`
- 政策：`groupPolicy`、`dm.*`、`guilds.*`、`guilds.*.channels.*`
- 指令：`commands.native`、`commands.useAccessGroups`、`configWrites`、`slashCommand.*`
- 事件佇列：`eventQueue.listenerTimeout` (listener budget)、`eventQueue.maxQueueSize`、`eventQueue.maxConcurrency`
- 閘道：`gatewayInfoTimeoutMs`、`gatewayReadyTimeoutMs`、`gatewayRuntimeReadyTimeoutMs`
- 回覆/紀錄：`replyToMode`、`historyLimit`、`dmHistoryLimit`、`dms.*.historyLimit`
- 傳送：`textChunkLimit`、`chunkMode`、`maxLinesPerMessage`
- 串流：`streaming` (舊版別名：`streamMode`)、`streaming.preview.toolProgress`、`draftChunk`、`blockStreaming`、`blockStreamingCoalesce`
- 媒體/重試：`mediaMaxMb` (限制 Discord 外傳上傳，預設 `100MB`)、`retry`
- 動作：`actions.*`
- 線上狀態：`activity`、`status`、`activityType`、`activityUrl`
- UI：`ui.components.accentColor`
- 功能：`threadBindings`、頂層 `bindings[]` (`type: "acp"`)、`pluralkit`、`execApprovals`、`intents`、`agentComponents.enabled`、`agentComponents.ttlMs`、`heartbeat`、`responsePrefix`

</Accordion>

## 安全與操作

- 請將機器人權杖視為機密 (在受監控的環境中建議優先使用 `DISCORD_BOT_TOKEN`)。
- 授予最小權限的 Discord 權限。
- 如果指令部署/狀態過時，請重新啟動閘道並使用 `openclaw channels status --probe` 重新檢查。

## 相關內容

<CardGroup cols={2}>
  <Card title="配對" icon="link" href="/zh-Hant/channels/pairing">
    將 Discord 使用者與閘道配對。
  </Card>
  <Card title="群組" icon="users" href="/zh-Hant/channels/groups">
    群組聊天與允許清單行為。
  </Card>
  <Card title="頻道路由" icon="route" href="/zh-Hant/channels/channel-routing">
    將傳入訊息路由至代理程式。
  </Card>
  <Card title="安全性" icon="shield" href="/zh-Hant/gateway/security">
    威脅模型與強化防護。
  </Card>
  <Card title="多代理程式路由" icon="sitemap" href="/zh-Hant/concepts/multi-agent">
    將伺服器和頻道對應至代理程式。
  </Card>
  <Card title="斜線指令" icon="terminal" href="/zh-Hant/tools/slash-commands">
    原生指令行為。
  </Card>
</CardGroup>
