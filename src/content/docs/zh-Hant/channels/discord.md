---
summary: "Discord 機器人支援狀態、功能和配置"
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
  <Card title="頻道疑難排解" icon="wrench" href="/zh-Hant/channels/troubleshooting">
    跨頻道診斷和修復流程。
  </Card>
</CardGroup>

## 快速設定

您需要建立一個新的應用程式並附帶機器人，將機器人加入您的伺服器，並將其與 OpenClaw 配對。我們建議將您的機器人加入您自己的私人伺服器。如果您還沒有伺服器，請先[建立一個](https://support.discord.com/hc/en-us/articles/204849977-How-do-I-create-a-server)（選擇 **Create My Own > For me and my friends**）。

<Steps>
  <Step title="建立 Discord 應用程式和機器人">
    前往 [Discord 開發者入口](https://discord.com/developers/applications) 並點擊 **New Application**。將其命名為類似「OpenClaw」。

    在側邊欄點擊 **Bot**。將 **Username** 設定為您對 OpenClaw 代理程式的稱呼。

  </Step>

  <Step title="啟用特殊意圖">
    仍在 **Bot** 頁面上，向下捲動至 **Privileged Gateway Intents** 並啟用：

    - **Message Content Intent**（必要）
    - **Server Members Intent**（建議；角色允許清單和名稱對 ID 匹配所需）
    - **Presence Intent**（選用；僅需要狀態更新時需要）

  </Step>

  <Step title="複製您的機器人權杖">
    在 **Bot** 頁面向上捲動並點擊 **Reset Token**。

    <Note>
    顧名思義，這會產生您的第一個權杖——並沒有任何東西被「重置」。
    </Note>

    複製權杖並將其保存在某處。這是您的 **Bot Token**，您很快就會用到它。

  </Step>

  <Step title="Generate an invite URL and add the bot to your server">
    點擊側邊欄上的 **OAuth2**。您將生成一個具有正確權限的邀請 URL，以將機器人新增到您的伺服器。

    向下捲動至 **OAuth2 URL Generator** 並啟用：

    - `bot`
    - `applications.commands`

    下方將會出現 **Bot Permissions** 區塊。請至少啟用：

    **一般權限**
      - 檢視頻道
    **文字權限**
      - 傳送訊息
      - 讀取訊息紀錄
      - 嵌入連結
      - 附加檔案
      - 新增反應 (選用)

    這是一般文字頻道的基礎設定。如果您計畫在 Discord 貼文中發布內容，包括建立或繼續貼文的論壇或媒體頻道工作流程，也請啟用 **在貼文中傳送訊息**。
    複製底部生成的 URL，將其貼到您的瀏覽器中，選擇您的伺服器，然後點擊 **繼續** 以進行連線。您現在應該能在 Discord 伺服器中看到您的機器人。

  </Step>

  <Step title="Enable Developer Mode and collect your IDs">
    回到 Discord 應用程式，您需要啟用開發者模式才能複製內部 ID。

    1. 點擊 **使用者設定** (您大頭貼旁邊的齒輪圖示) → **進階** → 開啟 **開發者模式**
    2. 在側邊欄對您的 **伺服器圖示** 按右鍵 → **複製伺服器 ID**
    3. 對 **您自己的大頭貼** 按右鍵 → **複製使用者 ID**

    將您的 **伺服器 ID** 和 **使用者 ID** 與您的機器人權杖一起儲存 — 您將在下一步中將這三者傳送給 OpenClaw。

  </Step>

  <Step title="Allow DMs from server members">
    為了讓配對運作，Discord 需要允許您的機器人傳送私訊給您。對您的 **伺服器圖示** 按右鍵 → **隱私權設定** → 開啟 **直接訊息**。

    這允許伺服器成員 (包括機器人) 傳送私訊給您。如果您想與 OpenClaw 一起使用 Discord 私訊，請保持此設定啟用。如果您只計畫使用公會頻道，您可以在配對後停用私訊。

  </Step>

  <Step title="安全設定您的 Bot 權杖（請勿在聊天中傳送）">
    您的 Discord Bot 權杖是一個機密（類似於密碼）。在傳送訊息給您的代理程式之前，請先在執行 OpenClaw 的機器上設定它。

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

    如果 OpenClaw 已經作為背景服務執行，請透過 OpenClaw Mac 應用程式重新啟動它，或是停止並重新啟動 `openclaw gateway run` 程序。
    對於受管理的服務安裝，請在存在 `DISCORD_BOT_TOKEN` 的 Shell 中執行 `openclaw gateway install`，或者將變數儲存在 `~/.openclaw/.env` 中，以便服務在重新啟動後可以解析 env SecretRef。
    如果您的主機被 Discord 的啟動應用程式查詢封鎖或受到速率限制，請從開發者入口網站設定 Discord 應用程式/用戶端 ID，以便啟動過程可以跳過該 REST 呼叫。對於預設帳戶，請使用 `channels.discord.applicationId`；當您執行多個 Discord Bot 時，請使用 `channels.discord.accounts.<accountId>.applicationId`。

  </Step>

  <Step title="設定 OpenClaw 並配對">

    <Tabs>
      <Tab title="詢問您的代理程式">
        在任何現有頻道（例如 Telegram）上與您的 OpenClaw 代理程式交談並告知它。如果 Discord 是您的第一個頻道，請改用 CLI / 設定分頁。

        > "我已經在設定中設定了我的 Discord 機器人權杖。請使用使用者 ID `<user_id>` 和伺服器 ID `<server_id>` 完成 Discord 設定。"
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

        預設帳號的環境變數後備：

```bash
DISCORD_BOT_TOKEN=...
```

        對於腳本化或遠端設定，請使用 `openclaw config patch --file ./discord.patch.json5 --dry-run` 寫入相同的 JSON5 區塊，然後在沒有 `--dry-run` 的情況下重新執行。支援純文字 `token` 值。也支援跨 env/file/exec 提供者的 `channels.discord.token` 的 SecretRef 值。請參閱[機密管理](/zh-Hant/gateway/secrets)。

        對於多個 Discord 機器人，請將每個機器人權杖和應用程式 ID 保留在其帳號下。頂層 `channels.discord.applicationId` 會由帳號繼承，因此僅在每個帳號都應使用相同的應用程式 ID 時才在那裡設定。

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

  <Step title="批准首次 DM 配對">
    等待直到閘道正在執行，然後在 Discord 中私訊您的機器人。它將回覆一個配對碼。

    <Tabs>
      <Tab title="詢問您的代理程式">
        將配對碼傳送給您在現有頻道上的代理程式：

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

    您現在應該能夠透過 DM 在 Discord 中與您的代理程式交談。

  </Step>
</Steps>

<Note>
  Token 解析具有帳戶感知能力。配置中的 Token 值優先於環境變數後備。`DISCORD_BOT_TOKEN` 僅用於預設帳戶。 如果兩個已啟用的 Discord 帳戶解析到相同的機器人 Token，OpenClaw 將僅為該 Token 啟動一個網關監視器。來自配置的 Token 優先於預設的環境變數後備；否則，第一個已啟用的帳戶將獲勝，並將重複的帳戶報告為已停用。 對於進階的傳出呼叫（訊息工具/頻道動作），會為該呼叫使用明確的每次呼叫
  `token`。這適用於發送和讀取/探測風格的動作（例如 read/search/fetch/thread/pins/permissions）。帳戶策略/重試設定仍來自活動執行時快照中選定的帳戶。
</Note>

## 建議：設定公會工作區

一旦 DM 能夠運作，您可以將您的 Discord 伺服器設定為完整的工作區，讓每個頻道都有自己的代理程式工作階段與背景。這適用於只有您和您的機器人的私人伺服器。

<Steps>
  <Step title="將您的伺服器新增到群組允許清單">
    這可讓您的代理程式在您伺服器上的任何頻道中回應，而不僅限於 DM。

    <Tabs>
      <Tab title="詢問您的代理程式">
        > 「將我的 Discord 伺服器 ID `<server_id>` 新增到群組允許清單」
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

  <Step title="允許無需 @提及 即可回覆">
    預設情況下，您的 Agent 只有在被 @提及 時才會在公會頻道中回覆。對於私人伺服器，您可能希望它回覆每則訊息。

    在公會頻道中，預設會自動發布一般回覆。對於共享的常駐房間，請選擇加入 `messages.groupChat.visibleReplies: "message_tool"`，讓 Agent 可以潛伏，並僅在它認為頻道回覆有用時才發布。這與最新一代、工具可靠的模型（如 GPT 5.5）搭配使用效果最佳。除非工具發送資料，否則環境房間事件會保持靜默。有關完整的潛伏模式設定，請參閱 [環境房間事件](/zh-Hant/channels/ambient-room-events)。

    如果 Discord 顯示正在輸入且日誌顯示有使用 Token 但沒有發布訊息，請檢查該輪次是否被設定為環境房間事件，或是選擇加入了訊息工具可見回覆。

    <Tabs>
      <Tab title="詢問您的 Agent">
        > 「允許我的 Agent 在此伺服器上回應，而無需被 @提及」
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

        若要為可見的群組/頻道回覆要求訊息工具發送，請設定 `messages.groupChat.visibleReplies: "message_tool"`。

      </Tab>
    </Tabs>

  </Step>

  <Step title="規劃公會頻道中的記憶體">
    預設情況下，長期記憶體 (MEMORY.md) 僅在 DM 會話中載入。公會頻道不會自動載入 MEMORY.md。

    <Tabs>
      <Tab title="詢問您的 Agent">
        > 「當我在 Discord 頻道中提問時，如果您需要來自 MEMORY.md 的長期上下文，請使用 memory_search 或 memory_get。」
      </Tab>
      <Tab title="手動">
        如果您需要在每個頻道中使用共享上下文，請將穩定的指令放在 `AGENTS.md` 或 `USER.md` 中（它們會為每個會話注入）。將長期筆記保存在 `MEMORY.md` 中，並隨需使用記憶體工具存取它們。
      </Tab>
    </Tabs>

  </Step>
</Steps>

現在在您的 Discord 伺服器上建立一些頻道並開始聊天。您的 Agent 可以看到頻道名稱，且每個頻道都有自己的獨立會話（session）——因此您可以設定 `#coding`、`#home`、`#research`，或任何適合您工作流程的設定。

## 運行時模型

- Gateway 擁有 Discord 連線。
- 回覆路由是確定性的：Discord 的入站訊息會回覆到 Discord。
- Discord 公會/頻道元資料會作為不受信任的語境新增至模型提示中，而不是作為使用者可見的回覆前綴。如果模型複製該信封回來，OpenClaw 會從出站回覆和未來的重播語境中刪除複製的元資料。
- 根據預設（`session.dmScope=main`），直接訊息（DM）共用 Agent 的主會話（`agent:main:main`）。
- 公會（Guild）頻道是獨立的會話金鑰（`agent:<agentId>:discord:channel:<channelId>`）。
- 群組直接訊息（Group DMs）根據預設會被忽略（`channels.discord.dm.groupEnabled=false`）。
- 原生斜線指令在獨立的指令會話中執行（`agent:<agentId>:discord:slash:<userId>`），同時仍將 `CommandTargetSessionKey` 帶入被路由的對話會話中。
- 僅文字的 cron/heartbeat 公告傳送到 Discord 時，僅使用最終助理可見的答案一次。當代理程式發出多個可傳送的載荷時，媒體和結構化元件載荷仍保持多訊息狀態。

## 論壇頻道

Discord 論壇和媒體頻道僅接受貼文。OpenClaw 支援兩種建立貼文的方式：

- 傳送訊息至論壇父頻道（`channel:<forumId>`）以自動建立討論串。討論串標題會使用您訊息的第一行非空白文字。
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

論壇父頻道不接受 Discord 元件。如果您需要元件，請傳送至討論串本身（`channel:<threadId>`）。

## 互動式組件

OpenClaw 支援用於 Agent 訊息的 Discord 元件 v2 容器。請使用帶有 `components` payload 的訊息工具。互動結果會像一般傳入訊息一樣路由回 Agent，並遵循現有的 Discord `replyToMode` 設定。

支援的區塊：

- `text`、`section`、`separator`、`actions`、`media-gallery`、`file`
- 動作列最多允許 5 個按鈕或單一選單
- 選取類型：`string`、`user`、`role`、`mentionable`、`channel`

根據預設，元件僅能使用一次。設定 `components.reusable=true` 以允許按鈕、選單和表單在過期前被多次使用。

若要限制誰可以點擊按鈕，請在該按鈕上設定 `allowedUsers`（Discord 使用者 ID、標籤或 `*`）。設定後，不符合的使用者將會收到暫時性的拒絕訊息。

組件回調預設會在 30 分鐘後過期。設定 `channels.discord.agentComponents.ttlMs` 以變更預設 Discord 帳戶的回註冊生命週期，或在多帳戶設定中使用 `channels.discord.accounts.<accountId>.agentComponents.ttlMs` 覆蓋單一帳戶。該值以毫秒為單位，必須為正整數，且上限為 `86400000`（24 小時）。較長的 TTL 對於需要按鈕保持可用的審核或批准工作流程很有用，但它們也會延長舊 Discord 訊息仍可觸發動作的時間範圍。請盡可能選用符合工作流程的最短 TTL，若過期的回調會造成意外，則保持預設值。

`/model` 和 `/models` 斜線指令會開啟互動式模型選擇器，其中包含提供者、模型和相容執行階段的下拉選單，以及提交步驟。`/models add` 已被棄用，現在會傳回棄用訊息，而不是從聊天中註冊模型。選擇器的回應是暫時性的，只有發出指令的使用者能看到。Discord 選單限制為 25 個選項，因此當您希望選擇器僅顯示所選提供者（例如 `openai-codex` 或 `vllm`）的動態探索模型時，請將 `provider/*` 項目新增至 `agents.defaults.models`。

檔案附件：

- `file` 區塊必須指向附件參照 (`attachment://<filename>`)
- 透過 `media`/`path`/`filePath` 提供附件（單一檔案）；若是多個檔案，請使用 `media-gallery`
- 當上傳名稱應符合附件參照時，使用 `filename` 覆蓋上傳名稱

模態表單：

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
    `channels.discord.dmPolicy` 控制 DM 存取。`channels.discord.allowFrom` 是標準的 DM 允許清單。

    - `pairing` (預設)
    - `allowlist`
    - `open` (要求 `channels.discord.allowFrom` 包含 `"*"`)
    - `disabled`

    如果 DM 原則未開放，未知使用者將被封鎖（或在 `pairing` 模式下被提示配對）。

    多帳號優先順序：

    - `channels.discord.accounts.default.allowFrom` 僅套用於 `default` 帳號。
    - 對於單一帳號，`allowFrom` 的優先順序高於舊版 `dm.allowFrom`。
    - 當具名帳號自己的 `allowFrom` 和舊版 `dm.allowFrom` 未設定時，會繼承 `channels.discord.allowFrom`。
    - 具名帳號不會繼承 `channels.discord.accounts.default.allowFrom`。

    為了相容性，仍會讀取舊版 `channels.discord.dm.policy` 和 `channels.discord.dm.allowFrom`。當可以在不變更存取權限的情況下進行遷移時，`openclaw doctor --fix` 會將其遷移至 `dmPolicy` 和 `allowFrom`。

    DM 目標格式用於傳遞：

    - `user:<id>`
    - `<@id>` 提及

    當頻道預設值啟用時，純數字 ID 通常會解析為頻道 ID，但為了相容性，列在帳號有效 DM `allowFrom` 中的 ID 會被視為使用者 DM 目標。

  </Tab>

  <Tab title="存取群組">
    Discord 私訊和文字指令授權可以在 `channels.discord.allowFrom` 中使用動態 `accessGroup:<name>` 項目。

    存取群組名稱在訊息頻道之間共享。對於成員以各頻道一般 `allowFrom` 語法表示的靜態群組，請使用 `type: "message.senders"`；或者當 Discord 頻道的目前 `ViewChannel` 受眾應動態定義成員資格時，請使用 `type: "discord.channelAudience"`。共享存取群組的行為在此處有說明文件：[存取群組](/zh-Hant/channels/access-groups)。

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

    Discord 文字頻道沒有獨立的成員清單。`type: "discord.channelAudience"` 將成員資格建模為：私訊發送者是已設定伺服器的成員，並在套用角色和頻道覆寫後，目前對已設定的頻道擁有有效的 `ViewChannel` 權限。

    範例：允許任何可以看到 `#maintainers` 的人私訊機器人，同時對其他人關閉私訊。

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

    查詢預設為封閉式失敗。如果 Discord 傳回 `Missing Access`、成員查詢失敗，或是頻道屬於不同的伺服器，則私訊發送者將被視為未獲授權。

    使用頻道受眾存取群組時，請在 Discord 開發者入口網站中為機器人啟用 **Server Members Intent**。私訊不包含伺服器成員狀態，因此 OpenClaw 會在授權時透過 Discord REST 解析成員。

  </Tab>

  <Tab title="Guild policy">
    伺服器處理由 `channels.discord.groupPolicy` 控制：

    - `open`
    - `allowlist`
    - `disabled`

    當存在 `channels.discord` 時，安全的基準是 `allowlist`。

    `allowlist` 行為：

    - 伺服器必須符合 `channels.discord.guilds`（建議使用 `id`，接受 slug）
    - 可選的發送者允許清單：`users`（建議使用穩定 ID）和 `roles`（僅限角色 ID）；如果配置了其中任何一個，當發送者符合 `users` 或 `roles` 時即被允許
    - 預設停用直接名稱/標籤匹配；僅將 `channels.discord.dangerouslyAllowNameMatching: true` 作為緊急相容性模式啟用
    - `users` 支援名稱/標籤，但 ID 更安全；當使用名稱/標籤條目時，`openclaw security audit` 會發出警告
    - 如果伺服器配置了 `channels`，則會拒絕未列出的頻道
    - 如果伺服器沒有 `channels` 區塊，則允許該允許清單伺服器中的所有頻道

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

    如果您只設定了 `DISCORD_BOT_TOKEN` 且未建立 `channels.discord` 區塊，執行時期回退為 `groupPolicy="allowlist"`（並在日誌中發出警告），即使 `channels.defaults.groupPolicy` 是 `open`。

  </Tab>

  <Tab title="提及與群組訊息">
    公會訊息預設會過濾未提及的訊息。

    提及偵測包含：

    - 明確提及機器人
    - 設定的提及模式 (`agents.list[].groupChat.mentionPatterns`，備用 `messages.groupChat.mentionPatterns`)
    - 在支援的情況下隱含的回覆機器人行為

    當撰寫傳出 Discord 訊息時，請使用標準提及語法：針對使用者使用 `<@USER_ID>`，針對頻道使用 `<#CHANNEL_ID>`，以及針對角色使用 `<@&ROLE_ID>`。請勿使用舊版 `<@!USER_ID>` 暱稱提及格式。

    `requireMention` 是針對各公會/頻道設定的 (`channels.discord.guilds...`)。
    `ignoreOtherMentions` 可選擇性地捨棄提及其他使用者/角色但未提及機器人的訊息 (排除 @everyone/@here)。

    群組訊息：

    - 預設：忽略 (`dm.groupEnabled=false`)
    - 透過 `dm.groupChannels` 的可選允許清單 (頻道 ID 或 slug)

  </Tab>
</Tabs>

### 基於角色的代理程式路由

使用 `bindings[].match.roles` 透過角色 ID 將 Discord 公會成員路由至不同的代理程式。基於角色的綁定僅接受角色 ID，並會在對等或父對等綁定之後以及僅公會綁定之前進行評估。如果綁定也設定了其他比對欄位 (例如 `peer` + `guildId` + `roles`)，則所有設定的欄位都必須比對。

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
- `commands.native=false` 會在啟動期間跳過 Discord 斜線指令註冊與清理。先前註冊的指令可能會在 Discord 中持續可見，直到您從 Discord 應用程式中將其移除。
- 原生指令授權使用與一般訊息處理相同的 Discord 允許清單/原則。
- 對於未獲授權的使用者，指令可能仍會在 Discord UI 中可見；執行仍會強制執行 OpenClaw 授權並傳回「未授權」。

請參閱 [斜線指令](/zh-Hant/tools/slash-commands) 以了解指令目錄與行為。

預設斜線指令設定：

- `ephemeral: true`

## 功能詳情

<AccordionGroup>
  <Accordion title="回覆標籤和原生回覆">
    Discord 支援在代理程式輸出中使用回覆標籤：

    - `[[reply_to_current]]`
    - `[[reply_to:<id>]]`

    由 `channels.discord.replyToMode` 控制：

    - `off` (預設)
    - `first`
    - `all`
    - `batched`

    注意：`off` 會停用隱式回覆串接。明確的 `[[reply_to_*]]` 標籤仍會受到尊重。
    `first` 總是將隱式原生回覆參照附加至該回合的第一則傳出 Discord 訊息。
    `batched` 僅當傳入事件為多則訊息的防抖批次時，才會附加 Discord 的隱式原生回覆參照。當您主要希望針對模糊的突發性聊天使用原生回覆，而不是針對每一則單一訊息回合時，這非常有用。

    訊息 ID 會顯示在內容/歷史記錄中，以便代理程式能夠以特定訊息為目標。

  </Accordion>

  <Accordion title="連結預覽">
    Discord 預設會為 URL 產生豐富的連結嵌入內容。OpenClaw 預設會在傳出的 Discord 訊息上隱藏那些產生的嵌入內容，因此除非您選擇加入，否則代理程式傳送的 URL 將保持為純文字連結：

```json5
{
  channels: {
    discord: {
      suppressEmbeds: false,
    },
  },
}
```

    設定 `channels.discord.accounts.<id>.suppressEmbeds` 以覆蓋單一帳戶。代理程式訊息工具傳送也可以針對單一訊息傳遞 `suppressEmbeds: false`。明確的 Discord `embeds` Payload 不會受到預設連結預覽設定的隱藏。

  </Accordion>

  <Accordion title="直播預覽">
    OpenClaw 可以透過發送暫時訊息並隨著文字到達進行編輯來串流草稿回覆。`channels.discord.streaming` 接受 `off` | `partial` | `block` | `progress` (預設)。`progress` 保留一個可編輯的狀態草稿，並在工具進行時更新它直到最終交付；共用的起始標籤是滾動行，因此一旦出現足夠的工作，它就會像其餘部分一樣滾動消失。`streamMode` 是舊版執行時別名。執行 `openclaw doctor --fix` 將持續性設定重寫為正規鍵。

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
        },
      },
    },
  },
}
```

    - `partial` 會在 token 到達時編輯單一預覽訊息。
    - `block` 會發送草稿大小的區塊 (使用 `draftChunk` 調整大小和斷點，限制在 `textChunkLimit`)。
    - 媒體、錯誤和明確回覆的最終結果會取消待處理的預覽編輯。
    - `streaming.preview.toolProgress` (預設 `true`) 控制工具/進度更新是否重複使用預覽訊息。
    - 工具/進度行在可用時會以緊湊的表情符號 + 標題 + 詳細資料呈現，例如 `🛠️ Bash: run tests` 或 `🔎 Web Search: for "query"`。
    - `streaming.progress.maxLineChars` 控制每行進度預覽的預算。散文會在單字邊界縮短；命令和路徑詳細資訊會保留有用的後綴。
    - `streaming.preview.commandText` / `streaming.progress.commandText` 控制緊湊進度行中的命令/exec 詳細資訊：`raw` (預設) 或 `status` (僅工具標籤)。

    隱藏原始命令/exec 文字，同時保留緊湊進度行：

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

    預覽串流僅限文字；媒體回覆會回退到正常傳遞。當明確啟用 `block` 串流時，OpenClaw 會跳過預覽串流以避免重複串流。

  </Accordion>

  <Accordion title="History, context, and thread behavior">
    Guild 歷史記錄上下文：

    - `channels.discord.historyLimit` 預設 `20`
    - 後備：`messages.groupChat.historyLimit`
    - `0` 停用

    DM 歷史記錄控制：

    - `channels.discord.dmHistoryLimit`
    - `channels.discord.dms["<user_id>"].historyLimit`

    Thread 行為：

    - Discord threads 作為頻道會話進行路由，並繼承父頻道設定，除非另有覆蓋。
    - Thread 會話繼承父頻道的會話層級 `/model` 選擇作為僅限模型後備；thread 本地 `/model` 選擇仍然優先，且除非啟用了逐字稿繼承，否則不會複製父逐字稿歷史記錄。
    - `channels.discord.thread.inheritParent` (預設 `false`) 讓新的自動 threads 選擇從父逐字稿進行播種。每個帳戶的覆蓋設定位於 `channels.discord.accounts.<id>.thread.inheritParent` 下。
    - 訊息工具反應可以解析 `user:<id>` DM 目標。
    - `guilds.<guild>.channels.<channel>.requireMention: false` 在回覆階段啟用後備期間會被保留。

    頻道主題會被作為 **不受信任** 的上下文注入。允許清單控制誰可以觸發 agent，而不是完整的補充上下文編輯邊界。

  </Accordion>

  <Accordion title="子代理的執行緒綁定工作階段">
    Discord 可以將執行緒綁定到工作階段目標，以便該執行緒中的後續訊息繼續路由到同一個工作階段（包括子代理工作階段）。

    指令：

    - `/focus <target>` 將目前/新執行緒綁定到子代理/工作階段目標
    - `/unfocus` 移除目前的執行緒綁定
    - `/agents` 顯示活躍的執行和綁定狀態
    - `/session idle <duration|off>` 檢查/更新聚焦綁定的非活動自動取消聚焦設定
    - `/session max-age <duration|off>` 檢查/更新聚焦綁定的硬性最大有效期限

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
    - `spawnSessions` 控制為 `sessions_spawn({ thread: true })` 和 ACP 執行緒生成自動建立/綁定執行緒。預設值：`true`。
    - `defaultSpawnContext` 控制執行緒綁定生成的原生子代理上下文。預設值：`"fork"`。
    - 已棄用的 `spawnSubagentSessions`/`spawnAcpSessions` 金鑰會由 `openclaw doctor --fix` 遷移。
    - 如果某個帳戶停用了執行緒綁定，則 `/focus` 和相關的執行緒綁定操作將無法使用。

    參閱[子代理](/zh-Hant/tools/subagents)、[ACP 代理](/zh-Hant/tools/acp-agents)和[設定參考](/zh-Hant/gateway/configuration-reference)。

  </Accordion>

  <Accordion title="Persistent ACP channel bindings">
    對於穩定的「始終在線」ACP 工作區，請設定針對 Discord 對話的頂層類型化 ACP 繫結。

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

    - `/acp spawn codex --bind here` 會就地繫結目前的頻道或執行緒，並將後續訊息保留在同一個 ACP 連線階段中。執行緒訊息會繼承父頻道的繫結。
    - 在已繫結的頻道或執行緒中，`/new` 和 `/reset` 會就地重設同一個 ACP 連線階段。暫時性的執行緒繫結在啟用期間可以覆寫目標解析。
    - `spawnSessions` 會透過 `--thread auto|here` 限制子執行緒的建立/繫結。

    請參閱 [ACP Agents](/zh-Hant/tools/acp-agents) 以了解繫結行為的詳細資訊。

  </Accordion>

  <Accordion title="Reaction notifications">
    每個公會的reaction通知模式：

    - `off`
    - `own` (預設)
    - `all`
    - `allowlist` (使用 `guilds.<id>.users`)

    Reaction事件會轉換為系統事件，並附加到路由的 Discord 連線階段。

  </Accordion>

  <Accordion title="Ack reactions">
    當 OpenClaw 正在處理傳入訊息時，`ackReaction` 會發送一個確認用的 emoji。

    解析順序：

    - `channels.discord.accounts.<accountId>.ackReaction`
    - `channels.discord.ackReaction`
    - `messages.ackReaction`
    - 代理身分 emoji 備援 (`agents.list[].identity.emoji`，否則為 "👀")

    備註：

    - Discord 接受 Unicode emoji 或自訂 emoji 名稱。
    - 使用 `""` 以停用特定頻道或帳號的 reaction。

  </Accordion>

  <Accordion title="Config writes">
    由頻道發起的設定寫入預設為啟用。

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

  <Accordion title="Gateway proxy">
    透過 `channels.discord.proxy`，將 Discord Gateway WebSocket 流量和啟動時的 REST 查詢（應用程式 ID + 允許清單解析）透過 HTTP(S) 代理伺服器進行路由。

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

  <Accordion title="PluralKit support">
    啟用 PluralKit 解析，將代理訊息對應至系統成員身分：

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

    - 允許清單可以使用 `pk:<memberId>`
    - 只有在 `channels.discord.dangerouslyAllowNameMatching: true` 時，才會根據名稱/slug 來比對成員顯示名稱
    - 查詢會使用原始訊息 ID，且受到時間視窗限制
    - 如果查詢失敗，代理訊息將會被視為機器人訊息並被捨棄，除非 `allowBots=true`

  </Accordion>

  <Accordion title="Outbound mention aliases">
    當代理程式需要對已知的 Discord 使用者進行確定性提及時，請使用 `mentionAliases`。金鑰是不含開頭 `@` 的帳號代碼；值則是 Discord 使用者 ID。未知的帳號代碼、`@everyone`、`@here` 以及 Markdown 程式碼區段內的提及都將保持不變。

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
    當您設定狀態或活動欄位，或當您啟用自動在線狀態時，會套用在線狀態更新。

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

    活動類型對照表：

    - 0: 正在遊玩
    - 1: 正在串流 (需要 `activityUrl`)
    - 2: 正在聆聽
    - 3: 正在觀看
    - 4: 自訂 (使用活動文字作為狀態狀態；表情符號是選用的)
    - 5: 正在競爭

    自動在線狀態範例（執行時期健康訊號）：

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

    自動在線狀態會將執行時期可用性對應到 Discord 狀態：健康 => 上線，降級或未知 => 閒置，耗盡或無法使用 => 請勿打擾。選用的文字覆寫：

    - `autoPresence.healthyText`
    - `autoPresence.degradedText`
    - `autoPresence.exhaustedText` (支援 `{reason}` 預留位置)

  </Accordion>

  <Accordion title="Discord 中的審批">
    Discord 支援在 DM 中使用按鈕進行審批處理，並可選擇在原始頻道中發布審批提示。

    配置路徑：

    - `channels.discord.execApprovals.enabled`
    - `channels.discord.execApprovals.approvers` (可選；盡可能回退至 `commands.ownerAllowFrom`)
    - `channels.discord.execApprovals.target` (`dm` | `channel` | `both`，預設值：`dm`)
    - `agentFilter`、`sessionFilter`、`cleanupAfterResolve`

    當 `enabled` 未設定或為 `"auto"` 且至少可以解析出一個審批者（來自 `execApprovals.approvers` 或 `commands.ownerAllowFrom`）時，Discord 會自動啟用原生執行審批。Discord 不會從頻道 `allowFrom`、舊版 `dm.allowFrom` 或直接訊息 `defaultTo` 推斷執行審批者。設定 `enabled: false` 以明確停用 Discord 作為原生審批客戶端。

    對於敏感的僅限擁有者的群組指令（例如 `/diagnostics` 和 `/export-trajectory`），OpenClaw 會私下發送審批提示和最終結果。當調用的擁有者擁有 Discord 擁有者路由時，它會先嘗試 Discord DM；如果不可用，則回退到 `commands.ownerAllowFrom` 中第一個可用的擁有者路由，例如 Telegram。

    當 `target` 為 `channel` 或 `both` 時，審批提示在頻道中可見。只有已解析的審批者可以使用這些按鈕；其他用戶會收到暫時性拒絕訊息。審批提示包含指令文字，因此僅在信任的頻道中啟用頻道遞送。如果無法從會話金鑰推導出頻道 ID，OpenClaw 會回退到 DM 遞送。

    Discord 也會呈現其他聊天頻道使用的共用審批按鈕。原生 Discord 配接器主要增加了審批者 DM 路由和頻道分發。
    當這些按鈕存在時，它們是主要的審批使用者體驗；僅當工具結果顯示
    聊天審批不可用或手動審批是唯一路徑時，OpenClau
    應僅包含手動 `/approve` 指令。
    如果 Discord 原生審批執行時未啟用，OpenClaw
    會保持本地確定性 `/approve <id> <decision>` 提示可見。如果
    執行時已啟用但無法將原生卡片遞送到任何目標，
    OpenClaw 會發送同聊回退通知，其中包含來自待定審批的確切 `/approve`
    指令。

    Gateway 認證和審批解析遵循共用的 Gateway 客戶端契約 (`plugin:` ID 通過 `plugin.approval.resolve` 解析；其他 ID 通過 `exec.approval.resolve`)。審批預設在 30 分鐘後過期。

    參閱 [Exec approvals](/zh-Hant/tools/exec-approvals)。

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
          voice: "cedar",
        },
      },
    },
  },
}
```

備註：

- `voice.tts` 僅針對 `stt-tts` 語音播放覆寫 `messages.tts`。即時模式使用 `voice.realtime.voice`。
- `voice.mode` 控制對話路徑。預設為 `agent-proxy`：即時語音前端處理輪次計時、中斷和播放，將實質工作透過 `openclaw_agent_consult` 委派給路由的 OpenClaw 代理程式，並將結果視為來自該說話者的輸入 Discord 提示。`stt-tts` 保留較舊的批次 STT 加 TTS 流程。`bidi` 允許即時模型直接對話，同時為 OpenClaw 大腦暴露 `openclaw_agent_consult`。
- `voice.agentSession` 控制哪個 OpenClaw 對話接收語音輪次。保留未設定狀態以供語音頻道自己的會話使用，或設定 `{ mode: "target", target: "channel:<text-channel-id>" }` 使語音頻道充當現有 Discord 文字頻道會話（例如 `#maintainers`）的麥克風/擴充功能。
- `voice.model` 會覆寫 Discord 語音回應和即時諮詢的 OpenClaw agent brain。保留未設定以繼承路由的 agent model。它與 `voice.realtime.model` 分開。
- `voice.followUsers` 讓機器人能與選定的使用者加入、移動和離開 Discord 語音。請參閱 [Follow users in voice](#follow-users-in-voice) 以了解行為規則和範例。
- `agent-proxy` 將語音透過 `discord-voice` 路由，這為發言者和目標工作階段保留了正常的擁有者/工具授權，但隱藏了 agent `tts` 工具，因為 Discord 語音擁有播放控制權。預設情況下，`agent-proxy` 為擁有者發言者 (`voice.realtime.toolPolicy: "owner"`) 提供完全等同擁有者的工具存取權，並強烈偏好在提供實質答案之前諮詢 OpenClaw agent (`voice.realtime.consultPolicy: "always"`)。在該預設 `always` 模式下，即時層不會在諮詢答案之前自動說出填充詞；它會擷取並轉錄語音，然後說出路由的 OpenClaw 答案。如果在 Discord 仍在播放第一個答案時完成了多個強制諮詢答案，後續的精確語音答案將會排隊直到播放閒置，而不是替換語音中間的句子。
- 在 `stt-tts` 模式下，STT 使用 `tools.media.audio`；`voice.model` 不會影響轉錄。
- 在即時模式下，`voice.realtime.provider`、`voice.realtime.model` 和 `voice.realtime.voice` 會設定即時音訊工作階段。若是 OpenAI Realtime 2 加上 Codex brain，請使用 `voice.realtime.model: "gpt-realtime-2"` 和 `voice.model: "openai-codex/gpt-5.5"`。
- 即時語音模式預設在即時提供者指令中包含小型 `IDENTITY.md`、`USER.md` 和 `SOUL.md` 設定檔，以便快速直接輪次保持與路由 OpenClaw 代理相同的身分、使用者基礎和角色。設定 `voice.realtime.bootstrapContextFiles` 為子集以自訂此設定，或設定為 `[]` 以停用。支援的即時啟動檔案僅限於這些設定檔；`AGENTS.md` 保留在一般代理上下文中。注入的設定檔上下文不會取代工作區工作、當前事實、記憶查詢或工具支援動作的 `openclaw_agent_consult`。
- 在 OpenAI `agent-proxy` 即時模式中，設定 `voice.realtime.requireWakeName: true` 使 Discord 即時語音保持靜音，直到文字記錄包含喚醒名稱為止。如果未設定 `voice.realtime.wakeNames`，OpenClaw 將使用路由代理的 `name` 加上 `OpenClaw`，並回退到代理 ID 加上 `OpenClaw`。喚醒名稱閘門會停用即時提供者自動回應，並將接受的輪次透過 OpenClaw 代理諮詢路徑進行路由。
- OpenAI 即時提供者接受目前的 Realtime 2 事件名稱和舊版與 Codex 相容的輸出音訊和文字記錄事件別名，因此相容的提供者快照可以偏移而不會丟失助理音訊。
- `voice.realtime.bargeIn` 控制說話者開始事件是否中斷使用中的即時播放。如果未設定，則遵循即時提供者的輸入音訊中斷設定。
- `voice.realtime.minBargeInAudioEndMs` 控制在 OpenAI 即時插話截斷音訊之前的最低助理播放持續時間。預設值：`250`。在低回音房間中設定 `0` 以立即中斷，或在回音較重的揚聲器設置中提高此值。
- 若要在 Discord 上播放 OpenAI 語音，請設定 `voice.tts.provider: "openai"` 並在 `voice.tts.openai.voice` 或 `voice.tts.providers.openai.voice` 下選擇文字轉語音語音。在目前的 OpenAI TTS 模型上，`cedar` 是一個聽起來不錯的男性語音選擇。
- 每個頻道的 Discord `systemPrompt` 覆蓋設定適用於該語音頻道的語音逐字稿輪次。
- 對於擁有者限制的指令和頻道操作，語音逐字稿輪次是從 Discord `allowFrom`（或 `dm.allowFrom`）衍生擁有者狀態的。Agent 工具的可見性遵循路由會話的已配置工具策略。
- 對於僅文字配置，Discord 語音屬於選用功能；設定 `channels.discord.voice.enabled=true`（或保留現有的 `channels.discord.voice` 區塊）以啟用 `/vc` 指令、語音執行時以及 `GuildVoiceStates` 閘道意圖。
- `channels.discord.intents.voiceStates` 可以明確覆寫語音狀態意圖的訂閱設定。如果不設定，該意圖將遵循有效的語音啟用設定。
- 如果 `voice.autoJoin` 對於同一個公會有多個項目，OpenClaw 將加入該公會最後一個配置的頻道。
- `voice.allowedChannels` 是一個選用的駐留允許清單。不設定此項可允許 `/vc join` 加入任何已授權的 Discord 語音頻道。設定後，`/vc join`、啟動自動加入以及 Bot 語音狀態移動將僅限於列出的 `{ guildId, channelId }` 項目。將其設為空陣列可拒絕所有 Discord 語音加入。如果 Discord 將 Bot 移出允許清單，OpenClaw 將離開該頻道，並在有可用時重新加入已配置的自動加入目標。
- `voice.daveEncryption` 和 `voice.decryptionFailureTolerance` 會傳遞給 `@discordjs/voice` 加入選項。
- 如果不設定，`@discordjs/voice` 的預設值為 `daveEncryption=true` 和 `decryptionFailureTolerance=24`。
- 對於 Discord 語音接收，OpenClaw 預設使用純 JS 的 `opusscript` 解碼器。選用的原生 `@discordjs/opus` 套件會被 repo pnpm 安裝原則忽略，因此一般安裝、Docker 軌道和無關測試不會編譯原生擴充功能。專門的語音效能主機可以在安裝原生擴充功能後，透過 `OPENCLAW_DISCORD_OPUS_DECODER=native` 選擇啟用。
- `voice.connectTimeoutMs` 控制在 `@discordjs/voice` 和自動加入嘗試之前的初始 `/vc join` Ready 等待時間。預設值：`30000`。
- `voice.reconnectGraceMs` 控制 OpenClaw 在斷開的語音會話開始重新連接之前等待多長時間，然後才將其銷毀。預設值：`15000`。
- 在 `stt-tts` 模式下，僅因另一使用者開始說話並不會停止語音播放。為避免回饋迴路，OpenClaw 在 TTS 播放時會忽略新的語音擷取；請在播放結束後說話以進行下一輪對話。即時模式會將說話者開始說話作為插斷訊號轉發給即時提供者。
- 在即時模式下，從喇叭到開啟的麥克風的回音可能看起來像插斷並中斷播放。對於回音嚴重的 Discord 房間，請設定 `voice.realtime.providers.openai.interruptResponseOnInputAudio: false` 以防止 OpenAI 在輸入音訊上自動中斷。如果您仍然希望 Discord 說話者開始事件中斷目前的播放，請新增 `voice.realtime.bargeIn: true`。OpenAI 即時橋接器會忽略短於 `voice.realtime.minBargeInAudioEndMs` 的播放截斷，將其視為可能的回音/雜訊，並將其記錄為已跳過而不是清除 Discord 播放。
- `voice.captureSilenceGraceMs` 控制 OpenClaw 在 Discord 回報說話者停止後等待多久，然後才將該音訊區段定案以進行 STT。預設值：`2500`；如果 Discord 將正常停頓分割成斷斷續續的部分轉錄，請提高此值。
- 當 ElevenLabs 是選定的 TTS 提供者時，Discord 語音播放使用串流 TTS 並從提供者回應串流開始。不支援串流的提供者會回退到合成暫存檔案路徑。
- OpenClaw 也會監控接收解密失敗，並透過在短時間內重複失敗後離開/重新加入語音頻道來自動復原。
- 如果在更新後接收日誌重複顯示 `DecryptionFailed(UnencryptedWhenPassthroughDisabled)`，請收集相依性報告和日誌。隨附的 `@discordjs/voice` 行包含了來自 discord.js PR #11449 的上游填充修補程式，該修補程式關閉了 discord.js issue #11419。
- 當 OpenClaw 完成擷取的說話者片段時，預期會出現 `The operation was aborted` 接收事件；這些是詳細的診斷訊息，而非警告。
- 詳細的 Discord 語音紀錄包含每個已接受說話者片段的有限單行 STT 轉錄預覽，因此除錯時會顯示使用者端與代理程式回覆端，而不會傾印無限制的轉錄文字。
- 在 `agent-proxy` 模式下，強制查詢回退會跳過可能不完整的轉錄片段，例如以 `...` 結尾的文字或像 `and` 這樣的尾隨連接詞，以及明顯無法採取動作的結尾語，如「馬上回來」或「再見」。當這種情況阻止了過時的佇列答案時，紀錄會顯示 `forced agent consult skipped reason=...`。

### 在語音中跟隨使用者

當您希望 Discord 語音機器人跟隨一個或多個已知的 Discord 使用者，而不是在啟動時加入固定頻道或等待 `/vc join` 時，請使用 `voice.followUsers`。

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

- `followUsers` 接受原始 Discord 使用者 ID 和 `discord:<id>` 值。OpenClaw 會在比對語音狀態事件之前將這兩種形式正規化。
- 當設定 `followUsers` 時，`followUsersEnabled` 預設為 `true`。將其設定為 `false` 以保留已儲存的清單，但停止自動語音跟隨。
- 當被跟隨的使用者加入允許的語音頻道時，OpenClaw 會加入該頻道。當使用者移動時，OpenClaw 會跟隨移動。當目前被跟隨的使用者斷線時，OpenClaw 會離開。
- 如果多個被跟隨的使用者位於同一個伺服器中，且目前被跟隨的使用者離開，OpenClaw 會在離開伺服器之前移動到另一個追蹤的被跟隨使用者的頻道。如果多個被跟隨的使用者同時移動，則以最新觀察到的語音狀態事件為準。
- `allowedChannels` 仍然適用。位於不允許頻道中的被跟隨使用者會被忽略，且由跟隨擁有的階段會移動到另一個被跟隨的使用者或離開。
- OpenClaw 會在啟動時和以有限的間隔協調錯過的語音狀態事件。協調程序會對設定的伺服器進行取樣，並限制每次執行的 REST 查詢次數，因此非常大的 `followUsers` 清單可能需要超過一個間隔的時間才能收斂。
- 如果 Discord 或管理員在機器人追蹤使用者時移動了機器人，且允許移動至目的地，OpenClaw 將重建語音會話並保留追蹤權限。如果機器人被移至 `allowedChannels` 之外，當存在已設定的目標時，OpenClaw 將離開並重新加入該目標。
- DAVE 接收恢復機制可能會在重複解密失敗後離開並重新加入同一頻道。由追蹤擁有的會話會透過該恢復路徑保留其追蹤權限，因此之後被追蹤的使用者斷線仍會離開頻道。

在加入模式之間選擇：

- 對於需要機器人在您進入時自動加入語音的個人或操作員設定，請使用 `followUsers`。
- 對於即使沒有被追蹤的使用者在語音中也應保持存在的固定房間機器人，請使用 `autoJoin`。
- 對於一次性加入或自動語音在場會令人感到意外的房間，請使用 `/vc join`。

原始碼檢出的原生 opus 設定：

```bash
pnpm install
mise exec node@22 -- pnpm discord:opus:install
```

當您需要上游 macOS arm64 預建的原生附加元件時，請針對 Gateway 使用 Node 22。如果您使用其他 Node 執行時，選用安裝程式可能需要本機 `node-gyp` 原始碼建置工具鏈。

安裝原生附加元件後，使用以下指令啟動 Gateway：

```bash
OPENCLAW_DISCORD_OPUS_DECODER=native pnpm gateway:watch
```

詳細的語音日誌應顯示 `discord voice: opus decoder: @discordjs/opus`。如果未選用環境變數，或者原生附加元件遺失或無法在主機上載入，OpenClaw 將記錄 `discord voice: opus decoder: opusscript` 並繼續透過純 JS 備援方案接收語音。

STT 加上 TTS 管線：

- Discord PCM 擷取內容會轉換為 WAV 暫存檔案。
- `tools.media.audio` 處理 STT，例如 `openai/gpt-4o-mini-transcribe`。
- 轉錄文字會透過 Discord 入口和路由發送，同時回應 LLM 以隱藏代理人 `tts` 工具並要求傳回文字的語音輸出原則執行，因為 Discord 語音擁有最終的 TTS 播放權。
- 設定後，`voice.model` 僅針對此語音頻道輪次覆寫回應 LLM。
- `voice.tts` 會與 `messages.tts` 合併；支援串流的提供者會直接饋送給播放器，否則產生的音訊檔案會在加入的頻道中播放。

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
          voice: "cedar",
        },
      },
    },
  },
}
```

如果沒有 `voice.agentSession` 區塊，每個語音頻道都會獲得自己獨立的已路由 OpenClaw 會話。例如，`/vc join channel:234567890123456789` 會與該 Discord 語音頻道的會話進行交談。即時模型僅作為語音前端；實質性的請求會被交給已配置的 OpenClaw 代理程式。如果即時模型在沒有呼叫 consult 工具的情況下產生了最終逐字稿，OpenClaw 會強制執行 consult 作為後備方案，以便預設行為仍舊像是與代理程式交談。

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
          voice: "cedar",
        },
      },
    },
  },
}
```

在 `agent-proxy` 模式下，機器人會加入已配置的語音頻道，但 OpenClaw 代理程式回合使用目標頻道的正常已路由會話和代理程式。即時語音會話會將傳回的結果朗讀回語音頻道中。監督代理程式仍可根據其工具原則使用正常的訊息工具，包括若適合的話發送單獨的 Discord 訊息。

當委派的 OpenClaw 執行處於啟用狀態時，新的 Discord 語音逐字稿會在啟動另一個代理程式回合之前被視為即時執行控制。諸如「status」、「cancel that」、「use the smaller fix」或「when you're done also check tests」之類的短語會被分類為狀態、取消、導引或針對啟用中會話的後續輸入。狀態、取消、已接受的導引以及後續結果會被朗讀回語音頻道，以便呼叫者知道 OpenClaw 是否處理了該請求。

有用的目標形式：

- `target: "channel:123456789012345678"` 經由 Discord 文字頻道會話進行路由。
- `target: "123456789012345678"` 被視為頻道目標。
- `target: "dm:123456789012345678"` 或 `target: "user:123456789012345678"` 經由該直接訊息會話進行路由。

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

當模型透過開放式麥克風聽到自己的 Discord 播放聲音，但您仍希望透過說話來中斷它時，請使用此設定。OpenClaw 可防止 OpenAI 根據原始輸入音訊自動中斷，而 `bargeIn: true` 則讓 Discord 發言者開始事件和已啟用的發言者音訊，在下一個擷取的輪次到達 OpenAI 之前，取消目前生效的即時回應。低於 `minBargeInAudioEndMs` 且帶有 `audioEndMs` 的極早期插話訊號會被視為可能是回音/雜訊並予以忽略，以免模型在第一個播放幀就被切斷。

預期的語音日誌：

- 加入時：`discord voice: joining ... voiceSession=... supervisorSession=... agentSessionMode=... voiceModel=... realtimeModel=...`
- 開始即時處理時：`discord voice: realtime bridge starting ... autoRespond=false interruptResponse=false bargeIn=false minBargeInAudioEndMs=...`
- 當有發言者音訊時：`discord voice: realtime speaker turn opened ...`、`discord voice: realtime input audio started ... outputAudioMs=... outputActive=...` 和 `discord voice: realtime speaker turn closed ... chunks=... discordBytes=... realtimeBytes=... interruptedPlayback=...`
- 跳過過時語音時：`discord voice: realtime forced agent consult skipped reason=incomplete-transcript ...` 或 `reason=non-actionable-closing ...`
- 即時回應完成時：`discord voice: realtime audio playback finishing reason=response.done ... audioMs=... chunks=...`
- 播放停止/重置時：`discord voice: realtime audio playback stopped reason=... audioMs=... elapsedMs=... chunks=...`
- 即時諮詢時：`discord voice: realtime consult requested ... voiceSession=... supervisorSession=... question=...`
- 代理程式回答時：`discord voice: agent turn answer ...`
- 將精確語音加入佇列時：`discord voice: realtime exact speech queued ... queued=... outputAudioMs=... outputActive=...`，接著是 `discord voice: realtime exact speech dequeued reason=player-idle ...`
- 偵測到插話時：`discord voice: realtime barge-in detected source=speaker-start ...` 或 `discord voice: realtime barge-in detected source=active-speaker-audio ...`，接著是 `discord voice: realtime barge-in requested reason=... outputAudioMs=... outputActive=...`
- 即時中斷時：`discord voice: realtime model interrupt requested client:response.cancel reason=barge-in`，接著是 `discord voice: realtime model audio truncated client:conversation.item.truncate reason=barge-in audioEndMs=...` 或 `discord voice: realtime model interrupt confirmed server:response.done status=cancelled ...` 之一
- 忽略回音/雜訊時：`discord voice: realtime model interrupt ignored client:conversation.item.truncate.skipped reason=barge-in audioEndMs=0 minAudioEndMs=250`
- 停用插話時：`discord voice: realtime capture ignored during playback (barge-in disabled) ...`
- 閒置播放時：`discord voice: realtime barge-in ignored reason=... outputActive=false ... playbackChunks=0`

若要對被切斷的音訊進行除錯，請將即時語音日誌視為時間軸來閱讀：

1. `realtime audio playback started` 表示 Discord 已開始播放助理音訊。橋接器會從此時開始計算助理輸出區塊、Discord PCM 位元組、提供者即時位元組和合成音訊持續時間。
2. `realtime speaker turn opened` 標記著 Discord 發言者進入啟用狀態。如果播放已進行中且啟用了 `bargeIn`，這之後可能會接著 `barge-in detected source=speaker-start`。
3. `realtime input audio started` 標示為該講者輪次收到第一個實際音訊幀。此處的 `outputActive=true` 或非零 `outputAudioMs` 表示麥克風正在輸入，而助理播放仍在進行中。
4. `barge-in detected source=active-speaker-audio` 表示 OpenClaw 在助理播放進行中偵測到了即時講者音訊。這對於區分真實的插話與沒有實用音訊的 Discord 講者開始事件很有幫助。
5. `barge-in requested reason=...` 表示 OpenClaw 要求即時服務提供者取消或截斷現有的回應。它包含 `outputAudioMs`、`outputActive` 和 `playbackChunks`，讓您可以查看在插話發生前實際播放了多少助理音訊。
6. `realtime audio playback stopped reason=...` 是本機 Discord 播放重置點。原因會說明是誰停止了播放：`barge-in`、`player-idle`、`provider-clear-audio`、`forced-agent-consult`、`stream-close` 或 `session-close`。
7. `realtime speaker turn closed` 摘要了擷取到的輸入輪次。`chunks=0` 或 `hasAudio=false` 表示講者輪次已開啟，但沒有可用的音訊傳送到即時橋接器。`interruptedPlayback=true` 表示該輸入輪次與助理輸出重疊並觸發了插話邏輯。

實用欄位：

- `outputAudioMs`：在該日誌行之前，即時服務提供者產生的助理音訊持續時間。
- `audioMs`：播放停止前，OpenClaw 計算的助理音訊持續時間。
- `elapsedMs`：開啟與關閉播放串流或講者輪次之間的牆上時鐘時間。
- `discordBytes`：傳送至或接收自 Discord 語音的 48 kHz 立體聲 PCM 位元組。
- `realtimeBytes`：傳送至或接收自即時服務提供者的提供者格式 PCM 位元組。
- `playbackChunks`：針對現有回應轉發至 Discord 的助理音訊區塊。
- `sinceLastAudioMs`：最後擷取的講者音訊幀與關閉講者輪次之間的間隔。

常見模式：

- `source=active-speaker-audio` 時立即中斷、`outputAudioMs` 很小，且附近有同一使用者，通常表示喇叭的回聲進入了麥克風。請提高 `voice.realtime.minBargeInAudioEndMs`、降低喇叭音量、使用耳機，或設定 `voice.realtime.providers.openai.interruptResponseOnInputAudio: false`。
- `source=speaker-start` 之後接著 `speaker turn closed ... hasAudio=false` 表示 Discord 回報了說話者開始發聲，但沒有音訊傳送到 OpenClaw。這可能是暫時性的 Discord 語音事件、噪聲閘行為，或是客戶端短暫按下麥克風按鍵。
- `audio playback stopped reason=stream-close` 而附近沒有插話或 `provider-clear-audio`，表示本機 Discord 播放串流意外結束。請檢查先前的提供者以及 Discord 播放器日誌。
- `capture ignored during playback (barge-in disabled)` 表示當助理音訊作用中時，OpenClaw 刻意捨棄了輸入。如果您希望說話能中斷播放，請啟用 `voice.realtime.bargeIn`。
- `barge-in ignored ... outputActive=false` 表示 Discord 或提供者 VAD 回報有說話聲，但 OpenClaw 沒有作用中的播放可供中斷。這不應該中斷音訊。

憑證是依照元件解析的：LLM 路由驗證用於 `voice.model`，STT 驗證用於 `tools.media.audio`，TTS 驗證用於 `messages.tts`/`voice.tts`，而即時提供者驗證用於 `voice.realtime.providers` 或提供者的正常驗證設定。

### 語音訊息

Discord 語音訊息會顯示波形預覽，且需要 OGG/Opus 音訊。OpenClaw 會自動產生波形，但在閘道主機上需要 `ffmpeg` 和 `ffprobe` 來檢查與轉換。

- 提供 **本地檔案路徑**（會拒絕 URL）。
- 省略文字內容（Discord 會拒絕在同一個載荷中同時包含文字與語音訊息）。
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

  <Accordion title="伺服器訊息意外被封鎖">

    - 驗證 `groupPolicy`
    - 驗證 `channels.discord.guilds` 下的伺服器白名單
    - 如果存在伺服器 `channels` 對應，則僅允許列出的頻道
    - 驗證 `requireMention` 行為與提及模式

    有用的檢查方式：

```bash
openclaw doctor
openclaw channels status --probe
openclaw logs --follow
```

  </Accordion>

  <Accordion title="Require mention 為 false 但仍被封鎖">
    常見原因：

    - `groupPolicy="allowlist"` 但沒有對應的伺服器/頻道白名單
    - `requireMention` 配置在錯誤的位置（必須在 `channels.discord.guilds` 或頻道條目下）
    - 發送者被伺服器/頻道 `users` 白名單封鎖

  </Accordion>

  <Accordion title="Discord 回應時間過長或重複回覆">

    典型日誌：

    - `Slow listener detected ...`
    - `stuck session: sessionKey=agent:...:discord:... state=processing ...`

    Discord Gateway 佇列調節參數：

    - 單一帳號： `channels.discord.eventQueue.listenerTimeout`
    - 多重帳號： `channels.discord.accounts.<accountId>.eventQueue.listenerTimeout`
    - 這僅控制 Discord Gateway 監聽器的工作，不控制代理回應的生命週期

    Discord 不會對佇列中的代理回應套用頻道擁有的逾時。訊息監聽器會立即移交，且佇列中的 Discord 執行會保留每個階段的順序，直到階段/工具/執行時生命週期完成或中止工作。

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

  <Accordion title="Gateway 中繼資料查詢逾時警告">
    OpenClaw 在連線前會取得 Discord `/gateway/bot` 中繼資料。暫時性失敗會回退到 Discord 的預設 Gateway URL，並在日誌中進行速率限制。

    中繼資料逾時調節參數：

    - 單一帳號： `channels.discord.gatewayInfoTimeoutMs`
    - 多重帳號： `channels.discord.accounts.<accountId>.gatewayInfoTimeoutMs`
    - 當未設定配置時的環境變數回退： `OPENCLAW_DISCORD_GATEWAY_INFO_TIMEOUT_MS`
    - 預設值： `30000` (30 秒)，最大值： `120000`

  </Accordion>

  <Accordion title="Gateway READY 逾時重啟">
    OpenClaw 會在啟動期間和執行階段重新連線後等待 Discord 的 gateway `READY` 事件。具有啟動錯開的多帳號設定可能需要比預設更長的啟動 READY 視窗。

    READY 逾時設定選項：

    - 啟動單一帳號：`channels.discord.gatewayReadyTimeoutMs`
    - 啟動多帳號：`channels.discord.accounts.<accountId>.gatewayReadyTimeoutMs`
    - 未設定組態時的啟動環境變數後備：`OPENCLAW_DISCORD_READY_TIMEOUT_MS`
    - 啟動預設值：`15000` (15 秒)，最大值：`120000`
    - 執行階段單一帳號：`channels.discord.gatewayRuntimeReadyTimeoutMs`
    - 執行階段多帳號：`channels.discord.accounts.<accountId>.gatewayRuntimeReadyTimeoutMs`
    - 未設定組態時的執行階段環境變數後備：`OPENCLAW_DISCORD_RUNTIME_READY_TIMEOUT_MS`
    - 執行階段預設值：`30000` (30 秒)，最大值：`120000`

  </Accordion>

  <Accordion title="權限審核不一致">
    `channels status --probe` 權限檢查僅適用於數值頻道 ID。

    如果您使用 slug 鍵，執行階段比對仍然可以運作，但 probe 無法完全驗證權限。

  </Accordion>

  <Accordion title="DM 和配對問題">

    - DM 已停用：`channels.discord.dm.enabled=false`
    - DM 原則已停用：`channels.discord.dmPolicy="disabled"` (舊版：`channels.discord.dm.policy`)
    - 在 `pairing` 模式下等待配對批准

  </Accordion>

  <Accordion title="Bot to bot loops">
    預設會忽略由機器人發送的訊息。

    如果您設定了 `channels.discord.allowBots=true`，請使用嚴格的提及與允許清單規則來避免回圈行為。
    建議優先使用 `channels.discord.allowBots="mentions"`，以僅接受提及該機器人的機器人訊息。

    OpenClaw 也內建了共用的 [bot loop protection](/zh-Hant/channels/bot-loop-protection)。每當 `allowBots` 讓由機器人發送的訊息到達調度時，Discord 會將傳入事件對應到 `(account, channel, bot pair)` 事實，而通用配對守衛會在配對超過設定的事件預算後將其抑制。此守衛可防止以往必須透過 Discord 速率限制才能阻止的失控雙機器人回圈；它不會影響單一機器人部署或是保持在預算內的一次性機器人回覆。

    預設設定（當設定 `allowBots` 時啟用）：

    - `maxEventsPerWindow: 20` —— 機器人配對可在滑動視窗內交換 20 則訊息
    - `windowSeconds: 60` —— 滑動視窗長度
    - `cooldownSeconds: 60` —— 一旦觸發預算，任何方向的額外機器人對機器人訊息都將被丟棄一分鐘

    在 `channels.defaults.botLoopProtection` 下設定一次共用的預設值，然後當合法的工作流程需要更多空間時再覆寫 Discord 設定。優先順序為：

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

    - 保持 OpenClaw 為最新版本 (`openclaw update`)，以便存在 Discord 語音接收恢復邏輯
    - 確認 `channels.discord.voice.daveEncryption=true` (預設)
    - 從 `channels.discord.voice.decryptionFailureTolerance=24` (上游預設) 開始，並僅在需要時進行調整
    - 監控日誌中的以下內容：
      - `discord voice: DAVE decrypt failures detected`
      - `discord voice: repeated decrypt failures; attempting rejoin`
    - 如果在自動重新加入後故障仍然持續，請收集日誌並與 [discord.js #11419](https://github.com/discordjs/discord.js/issues/11419) 和 [discord.js #11449](https://github.com/discordjs/discord.js/pull/11449) 中的上游 DAVE 接收歷史進行比較

  </Accordion>
</AccordionGroup>

## 配置參考

主要參考：[Configuration reference - Discord](/zh-Hant/gateway/config-channels#discord)。

<Accordion title="高重要性 Discord 欄位">

- 啟動/驗證： `enabled`, `token`, `accounts.*`, `allowBots`
- 策略： `groupPolicy`, `dm.*`, `guilds.*`, `guilds.*.channels.*`
- 指令： `commands.native`, `commands.useAccessGroups`, `configWrites`, `slashCommand.*`
- 事件佇列： `eventQueue.listenerTimeout` (監聽器預算), `eventQueue.maxQueueSize`, `eventQueue.maxConcurrency`
- 閘道： `gatewayInfoTimeoutMs`, `gatewayReadyTimeoutMs`, `gatewayRuntimeReadyTimeoutMs`
- 回覆/歷史： `replyToMode`, `historyLimit`, `dmHistoryLimit`, `dms.*.historyLimit`
- 傳遞： `textChunkLimit`, `chunkMode`, `maxLinesPerMessage`
- 串流： `streaming` (舊版別名： `streamMode`), `streaming.preview.toolProgress`, `draftChunk`, `blockStreaming`, `blockStreamingCoalesce`
- 媒體/重試： `mediaMaxMb` (限制傳出 Discord 上傳，預設 `100MB`), `retry`
- 動作： `actions.*`
- 上線狀態： `activity`, `status`, `activityType`, `activityUrl`
- UI： `ui.components.accentColor`
- 功能： `threadBindings`, 頂層 `bindings[]` (`type: "acp"`), `pluralkit`, `execApprovals`, `intents`, `agentComponents.enabled`, `agentComponents.ttlMs`, `heartbeat`, `responsePrefix`

</Accordion>

## 安全與操作

- 請將機器人令牌視為機密（在受監控的環境中，`DISCORD_BOT_TOKEN` 較佳）。
- 授予最小權限的 Discord 權限。
- 如果指令部署/狀態過時，請重新啟動 gateway 並使用 `openclaw channels status --probe` 重新檢查。

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
    威脅模型與加固。
  </Card>
  <Card title="多代理程式路由" icon="sitemap" href="/zh-Hant/concepts/multi-agent">
    將伺服器和通道對應至代理程式。
  </Card>
  <Card title="斜線指令" icon="terminal" href="/zh-Hant/tools/slash-commands">
    原生指令行為。
  </Card>
</CardGroup>
