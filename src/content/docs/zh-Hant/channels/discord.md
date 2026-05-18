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

您需要建立一個包含機器人的新應用程式，將機器人新增至您的伺服器，並將其與 OpenClaw 配對。我們建議將您的機器人新增到您自己的私人伺服器。如果您還沒有伺服器，請先[建立一個](https://support.discord.com/hc/en-us/articles/204849977-How-do-I-create-a-server)（選擇 **Create My Own > For me and my friends**）。

<Steps>
  <Step title="建立 Discord 應用程式和機器人">
    前往 [Discord 開發者入口網站](https://discord.com/developers/applications) 並點擊 **New Application**。將其命名為類似 "OpenClaw" 的名稱。

    點擊側邊欄上的 **Bot**。將 **Username** 設定為您稱呼 OpenClaw 代理程式的任何名稱。

  </Step>

  <Step title="啟用特殊權限 Intents">
    仍然在 **Bot** 頁面上，向下捲動至 **Privileged Gateway Intents** 並啟用：

    - **Message Content Intent**（必填）
    - **Server Members Intent**（建議；角色白名單和名稱至 ID 匹配所需）
    - **Presence Intent**（選填；僅需要狀態更新時需要）

  </Step>

  <Step title="複製您的機器人權杖">
    在 **Bot** 頁面上向上捲動並點擊 **Reset Token**。

    <Note>
    顧名思義，這會產生您的第一個權杖——並沒有任何東西被「重置」。
    </Note>

    複製該權杖並將其儲存在某處。這就是您的 **Bot Token**，稍後您會用到它。

  </Step>

  <Step title="Generate an invite URL and add the bot to your server">
    在側邊欄點擊 **OAuth2**。您將生成一個具有適當權限的邀請 URL，以將機器人新增至您的伺服器。

    向下捲動至 **OAuth2 URL Generator** 並啟用：

    - `bot`
    - `applications.commands`

    下方會出現 **Bot Permissions** 區塊。至少啟用：

    **一般權限**
      - 檢視頻道
    **文字權限**
      - 傳送訊息
      - 讀取訊息歷史記錄
      - 嵌入連結
      - 附加檔案
      - 新增回應 (選用)

    這是正常文字頻道的基礎設定。如果您計劃在 Discord 貼文中發佈，包括建立或繼續貼文的論壇或媒體頻道工作流程，請同時啟用 **Send Messages in Threads**。
    複製底部生成的 URL，將其貼上至您的瀏覽器中，選取您的伺服器，然後點擊 **Continue** 以連線。您現在應該可以在 Discord 伺服器中看到您的機器人。

  </Step>

  <Step title="Enable Developer Mode and collect your IDs">
    回到 Discord 應用程式，您需要啟用開發人員模式才能複製內部 ID。

    1. 點擊 **使用者設定** (您大頭像旁邊的齒輪圖示) → **進階** → 開啟 **Developer Mode**
    2. 在側邊欄對您的 **伺服器圖示** 按一下滑鼠右鍵 → **Copy Server ID**
    3. 對您 **自己的大頭像** 按一下滑鼠右鍵 → **Copy User ID**

    將您的 **伺服器 ID** 和 **使用者 ID** 與您的機器人 Token 一起儲存——您將在下一步中將這三者傳送給 OpenClaw。

  </Step>

  <Step title="Allow DMs from server members">
    為了讓配對能夠運作，Discord 需要允許您的機器人傳送 DM 給您。對您的 **伺服器圖示** 按一下滑鼠右鍵 → **隱私設定** → 開啟 **Direct Messages**。

    這允許伺服器成員 (包括機器人) 傳送 DM 給您。如果您想與 OpenClaw 一起使用 Discord DM，請保持啟用狀態。如果您只計劃使用公會頻道，您可以在配對後停用 DM。

  </Step>

  <Step title="Set your bot token securely (do not send it in chat)">
    您的 Discord Bot 權杖是機密資訊（類似密碼）。在傳送訊息給您的代理程式之前，請在執行 OpenClaw 的機器上設定它。

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
    對於受控服務安裝，請在存在 `DISCORD_BOT_TOKEN` 的 shell 中執行 `openclaw gateway install`，或將變數儲存在 `~/.openclaw/.env` 中，以便服務在重新啟動後能夠解析 env SecretRef。
    如果您的主機被 Discord 的啟動應用程式查詢封鎖或受到速率限制，請從開發人員入口網站設定 Discord 應用程式/用戶端 ID，以便啟動過程可以跳過該 REST 呼叫。對於預設帳戶，請使用 `channels.discord.applicationId`；當您執行多個 Discord 機器人時，請使用 `channels.discord.accounts.<accountId>.applicationId`。

  </Step>

  <Step title="Configure OpenClaw and pair">

    <Tabs>
      <Tab title="Ask your agent">
        在任何現有頻道（例如 Telegram）上與您的 OpenClaw Agent 交談並告訴它。如果 Discord 是您的第一個頻道，請改用 CLI / config 分頁。

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

        預設帳號的環境變數後備：

```bash
DISCORD_BOT_TOKEN=...
```

        若為腳本或遠端設定，請使用 `openclaw config patch --file ./discord.patch.json5 --dry-run` 寫入相同的 JSON5 區塊，然後在不使用 `--dry-run` 的情況下重新執行。支援純文字 `token` 值。也支援跨 env/file/exec 提供者的 `channels.discord.token` 之 SecretRef 值。請參閱 [Secrets Management](/zh-Hant/gateway/secrets)。

        對於多個 Discord 機器人，請將每個機器人權杖和應用程式 ID 保留在其帳號下。頂層 `channels.discord.applicationId` 會由帳號繼承，因此只有當每個帳號都應使用相同的應用程式 ID 時，才在那裡設定它。

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
    等待直到閘道正在運行，然後在 Discord 中私訊您的機器人。它將回應配對代碼。

    <Tabs>
      <Tab title="Ask your agent">
        將配對代碼傳送給您現有頻道上的 Agent：

        > "Approve this Discord pairing code: `<CODE>`"
      </Tab>
      <Tab title="CLI">

```bash
openclaw pairing list discord
openclaw pairing approve discord <CODE>
```

      </Tab>
    </Tabs>

    配對代碼在 1 小時後過期。

    您現在應該可以透過 DM 在 Discord 中與您的 Agent 交談。

  </Step>
</Steps>

<Note>
  Token 解析是感知帳號的。設定的 Token 值優先於環境變數後備。`DISCORD_BOT_TOKEN` 僅用於預設帳號。 如果兩個已啟用的 Discord 帳號解析到相同的 Bot Token，OpenClaw 將只為該 Token 啟動一個閘道監視器。來自設定的 Token 優先於預設的環境變數後備；否則，第一個已啟用的帳號將獲勝，並將重複的帳號報告為已停用。 對於進階的傳出呼叫（訊息工具/頻道動作），會針對該呼叫使用明確的、每次呼叫專屬的
  `token`。這適用於傳送以及讀取/探測風格的動作（例如讀取/搜尋/擷取/執行緒/釘選訊息/權限）。帳號策略/重試設定仍來自作用中執行時段快照中選取的帳號。
</Note>

## 建議：設定公會工作區

一旦 DM 能夠運作，您可以將您的 Discord 伺服器設定為完整的工作區，讓每個頻道都有自己的代理程式工作階段與背景。這適用於只有您和您的機器人的私人伺服器。

<Steps>
  <Step title="將您的伺服器新增至伺服器允許清單">
    這可讓您的代理程式在您伺服器上的任何頻道中回應，而不僅限於 DM。

    <Tabs>
      <Tab title="詢問您的代理程式">
        > "Add my Discord Server ID `<server_id>` to the guild allowlist"
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
    預設情況下，您的代理程式僅在伺服器頻道中被 @提及 時才會回應。對於私人伺服器，您可能希望它回應每則訊息。

    在伺服器頻道中，可見的 Discord 輸出預設應使用 `message` 工具，這樣代理程式可以保持潛伏，並僅在決定頻道回覆有用時才發佈訊息。除非該工具發送訊息，否則環境房間事件會保持靜默。如需完整的潛伏模式設定，請參閱 [Ambient room events](/zh-Hant/channels/ambient-room-events)。

    這表示所選的模型應可靠地呼叫工具。如果 Discord 顯示正在輸入且日誌顯示使用了 token 但沒有發佈訊息，請檢查該輪次是否被設定為環境房間事件，或使用下方的設定來針對正常的群組請求恢復舊版的自動最終回覆。

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

        若要針對群組/頻道房間恢復舊版的自動最終回覆，請設定 `messages.groupChat.visibleReplies: "automatic"`。

      </Tab>
    </Tabs>

  </Step>

  <Step title="Plan for memory in guild channels">
    預設情況下，長期記憶 (MEMORY.md) 僅在 DM 工作階段中載入。伺服器頻道不會自動載入 MEMORY.md。

    <Tabs>
      <Tab title="Ask your agent">
        > "When I ask questions in Discord channels, use memory_search or memory_get if you need long-term context from MEMORY.md."
      </Tab>
      <Tab title="Manual">
        如果您在每個頻道中都需要共享的上下文，請將穩定的指令放在 `AGENTS.md` 或 `USER.md` 中（它們會針對每個工作階段注入）。將長期筆記保留在 `MEMORY.md` 中，並使用記憶工具按需存取。
      </Tab>
    </Tabs>

  </Step>
</Steps>

現在在您的 Discord 伺服器上建立一些頻道並開始聊天。您的 Agent 可以看到頻道名稱，並且每個頻道都有自己獨立的 session — 所以您可以設定 `#coding`、`#home`、`#research`，或是任何適合您工作流程的設定。

## 運行時模型

- Gateway 擁有 Discord 連線。
- 回覆路由是確定性的：Discord 的入站訊息會回覆到 Discord。
- Discord 公會/頻道元資料會作為不受信任的語境新增至模型提示中，而不是作為使用者可見的回覆前綴。如果模型複製該信封回來，OpenClaw 會從出站回覆和未來的重播語境中刪除複製的元資料。
- 預設情況下 (`session.dmScope=main`)，直接聊天會共用 Agent 的主 session (`agent:main:main`)。
- 公會頻道是獨立的 session 金鑰 (`agent:<agentId>:discord:channel:<channelId>`)。
- 群組 DM 預設會被忽略 (`channels.discord.dm.groupEnabled=false`)。
- 原生斜線指令在獨立的指令 session 中執行 (`agent:<agentId>:discord:slash:<userId>`)，同時仍將 `CommandTargetSessionKey` 傳送到被路由的對話 session。
- 僅文字的 cron/heartbeat 公告傳送到 Discord 時，僅使用最終助理可見的答案一次。當代理程式發出多個可傳送的載荷時，媒體和結構化元件載荷仍保持多訊息狀態。

## 論壇頻道

Discord 論壇和媒體頻道僅接受貼文。OpenClaw 支援兩種建立貼文的方式：

- 傳送訊息到論壇父頻道 (`channel:<forumId>`) 以自動建立主題串。主題串標題使用您訊息的第一行非空白文字。
- 使用 `openclaw message thread create` 直接建立主題串。不要為論壇頻道傳遞 `--message-id`。

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

論壇父頻道不接受 Discord 元件。如果您需要元件，請傳送訊息到主題串本身 (`channel:<threadId>`)。

## 互動式組件

OpenClaw 支援針對 Agent 訊息的 Discord 元件 v2 容器。使用帶有 `components` 載荷的訊息工具。互動結果會作為一般的傳入訊息路由回給 Agent，並遵循現有的 Discord `replyToMode` 設定。

支援的區塊：

- %%PH:INLINE_CODE:236:8d4dd35%%、`text``section`、`separator`、`actions`、`media-gallery`、`file`
- 動作列最多允許 5 個按鈕或單一選單
- 選取類型：`string`、`user`、`role`、`mentionable`、`channel`

預設情況下，元件僅能使用一次。設定 `components.reusable=true` 以允許按鈕、選單和表單在過期前被多次使用。

若要限制誰可以點擊按鈕，請在該按鈕上設定 `allowedUsers` (Discord 使用者 ID、標籤或 `*`)。設定後，不符合條件的使用者將會收到暫時性的拒絕訊息。

`/model` 和 `/models` 斜線指令會開啟一個互動式模型選擇器，其中包含提供者、模型和相容執行階段的下拉選單，以及一個提交步驟。`/models add` 已被棄用，現在會返回棄用訊息，而不是從聊天中註冊模型。選擇器的回覆是暫時性的，只有呼叫的使用者可以看到它。Discord 選擇選單限制為 25 個選項，因此當您希望選擇器僅顯示所選提供者（例如 `openai-codex` 或 `vllm`）的動態發現模型時，請將 `provider/*` 項目新增至 `agents.defaults.models`。

檔案附件：

- `file` 區塊必須指向附件參考（`attachment://<filename>`）
- 透過 `media`/`path`/`filePath` 提供附件（單一檔案）；對於多個檔案，請使用 `media-gallery`
- 當上傳名稱應符合附件參考時，使用 `filename` 來覆寫它

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
  <Tab title="DM policy">
    `channels.discord.dmPolicy` 控制存取權限。`channels.discord.allowFrom` 是標準的 DM 許可清單。

    - `pairing` (預設)
    - `allowlist`
    - `open` (需要 `channels.discord.allowFrom` 包含 `"*"`)
    - `disabled`

    如果 DM 政策未開放，未知使用者將被封鎖 (或在 `pairing` 模式下被提示配對)。

    多帳號優先順序：

    - `channels.discord.accounts.default.allowFrom` 僅套用於 `default` 帳號。
    - 對於單一帳號，`allowFrom` 優先於舊版 `dm.allowFrom`。
    - 當具名帳號自己的 `allowFrom` 和舊版 `dm.allowFrom` 未設定時，會繼承 `channels.discord.allowFrom`。
    - 具名帳號不會繼承 `channels.discord.accounts.default.allowFrom`。

    為了相容性，仍會讀取舊版 `channels.discord.dm.policy` 和 `channels.discord.dm.allowFrom`。`openclaw doctor --fix` 會在不變更存取權限的情況下，將其遷移至 `dmPolicy` 和 `allowFrom`。

    傳送的 DM 目標格式：

    - `user:<id>`
    - `<@id>` 提及

    當啟用頻道預設值時，純數字 ID 通常會解析為頻道 ID，但為了相容性，列在帳號有效 DM `allowFrom` 中的 ID 會被視為使用者 DM 目標。

  </Tab>

  <Tab title="Access groups">
    Discord 私訊和文字指令授權可以使用 `accessGroup:<name>` 中的動態 `channels.discord.allowFrom` 項目。

    存取群組名稱在訊息頻道之間共享。對於成員以每個頻道的正常 `allowFrom` 語法表示的靜態群組，請使用 `type: "message.senders"`；或者當 Discord 頻道的當前 `ViewChannel` 受眾應動態定義成員資格時，請使用 `type: "discord.channelAudience"`。共享存取群組的行為記錄於此：[存取群組](/zh-Hant/channels/access-groups)。

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

    Discord 文字頻道沒有單獨的成員列表。`type: "discord.channelAudience"` 將成員資格模擬為：私訊發送者是已設定公會的成員，並且在套用角色和頻道覆寫後，目前對已設定的頻道擁有有效的 `ViewChannel` 權限。

    範例：允許任何可以看到 `#maintainers` 的人向機器人發送私訊，同時對其他所有人關閉私訊。

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

    查詢失敗時會採取封閉策略。如果 Discord 返回 `Missing Access`、成員查詢失敗，或者頻道屬於不同的公會，則私訊發送者將被視為未經授權。

    使用頻道受眾存取群組時，請在 Discord 開發者入口網站中為機器人啟用 **Server Members Intent**。私訊不包含公會成員狀態，因此 OpenClaw 會在授權時透過 Discord REST 解析成員。

  </Tab>

  <Tab title="Guild policy">
    公會處理由 `channels.discord.groupPolicy` 控制：

    - `open`
    - `allowlist`
    - `disabled`

    當存在 `channels.discord` 時，安全基線為 `allowlist`。

    `allowlist` 行為：

    - 公會必須符合 `channels.discord.guilds`（優先使用 `id`，接受 slug）
    - 可選的發送者允許清單：`users`（建議使用穩定 ID）和 `roles`（僅限角色 ID）；如果配置了其中任何一個，當發送者符合 `users` 或 `roles` 時即允許
    - 預設停用直接名稱/標籤比對；僅將 `channels.discord.dangerouslyAllowNameMatching: true` 作為緊急相容性模式啟用
    - `users` 支援名稱/標籤，但 ID 更安全；使用名稱/標籤條目時 `openclaw security audit` 會發出警告
    - 如果公會配置了 `channels`，則會拒絕未列出的頻道
    - 如果公會沒有 `channels` 區塊，則該允許清單公會中的所有頻道都獲允許

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

    如果您僅設定了 `DISCORD_BOT_TOKEN` 而未建立 `channels.discord` 區塊，即使 `channels.defaults.groupPolicy` 為 `open`，執行時期會回退為 `groupPolicy="allowlist"`（並在日誌中發出警告）。

  </Tab>

  <Tab title="提及與群組 DM">
    伺服器訊息預設受提及限制。

    提及偵測包含：

    - 明確的機器人提及
    - 已設定的提及模式 (`agents.list[].groupChat.mentionPatterns`，後備 `messages.groupChat.mentionPatterns`)
    - 支援情況下的隱含回覆機器人行為

    撰寫外傳 Discord 訊息時，請使用標準提及語法：使用者使用 `<@USER_ID>`，頻道使用 `<#CHANNEL_ID>`，角色使用 `<@&ROLE_ID>`。請勿使用舊版 `<@!USER_ID>` 暱稱提及格式。

    `requireMention` 是依伺服器/頻道 (`channels.discord.guilds...`) 設定的。
    `ignoreOtherMentions` 可選擇捨棄提及其他使用者/角色但未提及機器人的訊息 (排除 @everyone/@here)。

    群組 DM：

    - 預設：忽略 (`dm.groupEnabled=false`)
    - 透過 `dm.groupChannels` 的可選允許清單 (頻道 ID 或 slug)

  </Tab>
</Tabs>

### 基於角色的代理路由

使用 `bindings[].match.roles` 透過角色 ID 將 Discord 伺服器成員路由到不同的代理程式。基於角色的綁定僅接受角色 ID，並在同層級或父層同層綁定之後、以及僅伺服器綁定之前進行評估。如果綁定也設定了其他相符欄位 (例如 `peer` + `guildId` + `roles`)，則所有設定的欄位都必須相符。

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
- `commands.native=false` 會在啟動期間跳過 Discord 斜線指令註冊與清理。先前註冊的指令可能在 Discord 中保持可見，直到您從 Discord 應用程式中將其移除。
- 原生指令授權使用與一般訊息處理相同的 Discord 允許清單/原則。
- 未經授權的使用者仍可能會在 Discord UI 中看到這些指令；執行仍會強制執行 OpenClaw 授權並傳回「未授權」。

請參閱 [斜線指令](/zh-Hant/tools/slash-commands) 以了解指令目錄與行為。

預設斜線指令設定：

- `ephemeral: true`

## 功能詳情

<AccordionGroup>
  <Accordion title="回覆標籤與原生回覆">
    Discord 支援在 Agent 輸出中使用回覆標籤：

    - `[[reply_to_current]]`
    - `[[reply_to:<id>]]`

    由 `channels.discord.replyToMode` 控制：

    - `off` (預設)
    - `first`
    - `all`
    - `batched`

    注意：`off` 會停用隱式回覆串接。明確的 `[[reply_to_*]]` 標籤仍會被尊重。
    `first` 總是將隱式原生回覆參照附加至該輪次的第一個外寄 Discord 訊息。
    `batched` 僅當
    传入事件為多個訊息的去彈批次時，才附加 Discord 的隱式原生回覆參照。當您主要希望針對模糊的爆發性對話（而非每一個單一訊息輪次）使用原生回覆時，這非常有用。

    訊息 ID 會呈現在上下文/歷史記錄中，以便 Agent 能鎖定特定訊息。

  </Accordion>

  <Accordion title="連結預覽">
    Discord 預設會為 URL 產生豐富的連結嵌入。OpenClaw 預設會在外寄 Discord 訊息上抑制這些產生的嵌入內容，因此 Agent 發送的 URL 會保持為純文字連結，除非您選擇加入：

```json5
{
  channels: {
    discord: {
      suppressEmbeds: false,
    },
  },
}
```

    設定 `channels.discord.accounts.<id>.suppressEmbeds` 以覆寫單一帳號。Agent 訊息工具傳送也可以為單一訊息傳遞 `suppressEmbeds: false`。明確的 Discord `embeds` Payload 不會受到預設連結預覽設定的抑制。

  </Accordion>

  <Accordion title="即時串流預覽">
    OpenClaw 可以透過發送臨時訊息並隨文字到來進行編輯，來串流草稿回覆。`channels.discord.streaming` 接受 `off` | `partial` | `block` | `progress` (預設)。`progress` 會維持一個可編輯的狀態草稿，並隨工具進度更新直到最終交付；共享的起始標籤是滾動行，因此一旦有足夠的工作顯示，它就會像其餘部分一樣捲動消失。`streamMode` 是舊版執行時別名。請執行 `openclaw doctor --fix` 將持久化配置重寫為標準鍵。

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
    - `block` 會發出草稿大小的區塊 (使用 `draftChunk` 調整大小和中斷點，限制為 `textChunkLimit`)。
    - 媒體、錯誤和明確回覆的最終內容會取消擱置中的預覽編輯。
    - `streaming.preview.toolProgress` (預設為 `true`) 控制工具/進度更新是否重複使用預覽訊息。
    - 工具/進度行在可用時會以精簡的表情符號 + 標題 + 詳細資訊呈現，例如 `🛠️ Bash: run tests` 或 `🔎 Web Search: for "query"`。
    - `streaming.progress.maxLineChars` 控制每行進度預覽的預算。散文會在字詞邊界縮短；指令和路徑詳細資訊會保留有用的後綴。
    - `streaming.preview.commandText` / `streaming.progress.commandText` 控制精簡進度行中的指令/exec 詳細資訊：`raw` (預設) 或 `status` (僅工具標籤)。

    隱藏原始指令/exec 文字，同時保留精簡進度行：

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

    預覽串流僅限文字；媒體回覆會回退至正常傳送。當明確啟用 `block` 串流時，OpenClaw 將跳過預覽串流以避免重複串流。

  </Accordion>

  <Accordion title="History, context, and thread behavior">
    公會歷史記錄上下文：

    - `channels.discord.historyLimit` default `20`
    - fallback：`messages.groupChat.historyLimit`
    - `0` 停用

    DM 歷史記錄控制：

    - `channels.discord.dmHistoryLimit`
    - `channels.discord.dms["<user_id>"].historyLimit`

    串流行為：

    - Discord 串流作為頻道會話進行路由，並繼承父頻道配置，除非另有覆蓋。
    - 串流會話繼承父頻道的會話層級 `/model` 選擇作為僅模型的後備方案；串流本地的 `/model` 選擇仍然優先，且除非啟用逐字稿繼承，否則不會複製父逐字稿歷史記錄。
    - `channels.discord.thread.inheritParent` (預設 `false`) 選擇讓新的自動串流從父逐字稿進行播種。每個帳戶的覆蓋設定位於 `channels.discord.accounts.<id>.thread.inheritParent` 下。
    - 訊息工具反應可以解析 `user:<id>` DM 目標。
    - 在回覆階段啟動後備期間，`guilds.<guild>.channels.<channel>.requireMention: false` 會被保留。

    頻道主題會作為 **不受信任** 的上下文注入。允許清單控制誰可以觸發代理程式，而不是完整的補充上下文編輯邊界。

  </Accordion>

  <Accordion title="子代理的綁定執行緒會話">
    Discord 可以將執行緒綁定到會話目標，以便該執行緒中的後續訊息繼續路由到同一個會話（包括子代理會話）。

    指令：

    - `/focus <target>` 將目前/新的執行緒綁定到子代理/會話目標
    - `/unfocus` 移除目前的執行緒綁定
    - `/agents` 顯示活躍的執行和綁定狀態
    - `/session idle <duration|off>` 檢查/更新已聚焦綁定的非活動自動取消聚焦
    - `/session max-age <duration|off>` 檢查/更新已聚焦綁定的硬性最大期限

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
    - `defaultSpawnContext` 控制執行緒綁定產生的原生子代理上下文。預設值：`"fork"`。
    - 已棄用的 `spawnSubagentSessions`/`spawnAcpSessions` 金鑰會由 `openclaw doctor --fix` 遷移。
    - 如果某個帳戶停用了執行緒綁定，`/focus` 和相關的執行緒綁定操作將無法使用。

    參閱 [子代理](/zh-Hant/tools/subagents)、[ACP 代理](/zh-Hant/tools/acp-agents) 和 [配置參考](/zh-Hant/gateway/configuration-reference)。

  </Accordion>

  <Accordion title="Persistent ACP channel bindings">
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

    註記：

    - `/acp spawn codex --bind here` 會就地綁定目前頻道或主題串，並將後續訊息保持在同一個 ACP 工作階段中。主題串訊息會繼承上層頻道的綁定。
    - 在已綁定的頻道或主題串中，`/new` 和 `/reset` 會就地重設同一個 ACP 工作階段。暫時性的主題串綁定在啟用期間可以覆寫目標解析。
    - `spawnSessions` 透過 `--thread auto|here` 閘控子主題串的建立/綁定。

    請參閱 [ACP Agents](/zh-Hant/tools/acp-agents) 以了解綁定行為的詳細資訊。

  </Accordion>

  <Accordion title="Reaction notifications">
    每個公會的反應通知模式：

    - `off`
    - `own` (預設)
    - `all`
    - `allowlist` (使用 `guilds.<id>.users`)

    反應事件會被轉換為系統事件，並附加到路由傳送的 Discord 工作階段。

  </Accordion>

  <Accordion title="Ack reactions">
    當 OpenClaw 正在處理傳入訊息時，`ackReaction` 會發送一個確認表情符號。

    解析順序：

    - `channels.discord.accounts.<accountId>.ackReaction`
    - `channels.discord.ackReaction`
    - `messages.ackReaction`
    - Agent 身份表情符號備選 (`agents.list[].identity.emoji`，否則為「👀」)

    註記：

    - Discord 接受 unicode 表情符號或自訂表情符號名稱。
    - 使用 `""` 以停用針對頻道或帳戶的反應。

  </Accordion>

  <Accordion title="Config writes">
    預設啟用頻道發起的設定寫入。

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
    透過 HTTP(S) 代理伺服器使用 `channels.discord.proxy` 路由 Discord Gateway WebSocket 流量和啟動 REST 查詢（應用程式 ID + 允許清單解析）。

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
    啟用 PluralKit 解析，將代理訊息對應到系統成員身分：

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

    - 允許清單可以使用 `pk:<memberId>`
    - 僅當 `channels.discord.dangerouslyAllowNameMatching: true` 時，才會依名稱/slug 符合成員顯示名稱
    - 查詢使用原始訊息 ID 並受限於時間視窗
    - 如果查詢失敗，代理訊息將被視為機器人訊息並被丟棄，除非 `allowBots=true`

  </Accordion>

  <Accordion title="Outbound mention aliases">
    當代理程式需要針對已知 Discord 使用者進行確定性的 outbound mention 時，請使用 `mentionAliases`。金鑰是不含前導 `@` 的代碼；值則是 Discord 使用者 ID。未知的代碼、`@everyone`、`@here` 以及 Markdown code 區塊內的提及會保持不變。

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
    Presence 更新會在您設定狀態或活動欄位，或當您啟用自動 Presence 時套用。

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

    活動類型對應：

    - 0: 遊戲中
    - 1: 直播中（需要 `activityUrl`）
    - 2: 聆聽中
    - 3: 觀看中
    - 4: 自訂（將活動文字用作狀態；emoji 為選用）
    - 5: 競爭中

    自動 Presence 範例（運行時健康訊號）：

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

    自動 Presence 將運行時可用性對應到 Discord 狀態：健康 => 上線，降級或未知 => 閒置，耗盡或不可用 => 請勿打擾。選用的文字覆寫：

    - `autoPresence.healthyText`
    - `autoPresence.degradedText`
    - `autoPresence.exhaustedText`（支援 `{reason}` 佔位符）

  </Accordion>

  <Accordion title="Discord 中的審核">
    Discord 支援在 DM 中使用按鈕進行審核處理，並可選擇在原始頻道中發布審核提示。

    設定路徑：

    - `channels.discord.execApprovals.enabled`
    - `channels.discord.execApprovals.approvers`（選用；盡可能時回退至 `commands.ownerAllowFrom`）
    - `channels.discord.execApprovals.target`（`dm` | `channel` | `both`，預設值：`dm`）
    - `agentFilter`、`sessionFilter`、`cleanupAfterResolve`

    當 `enabled` 未設定或為 `"auto"` 且可解析至少一位審核者時（來自 `execApprovals.approvers` 或 `commands.ownerAllowFrom`），Discord 會自動啟用原生執行審核。Discord 不會從頻道 `allowFrom`、舊版 `dm.allowFrom` 或直接訊息 `defaultTo` 推斷執行審核者。請設定 `enabled: false` 以明確停用 Discord 作為原生審核用戶端。

    對於敏感的僅限擁有者的群組指令（例如 `/diagnostics` 和 `/export-trajectory`），OpenClaw 會私下發送審核提示和最終結果。當呼叫的擁有者具有 Discord 擁有者路由時，它會先嘗試 Discord DM；如果不可用，則回退至 `commands.ownerAllowFrom` 中第一個可用的擁有者路由（例如 Telegram）。

    當 `target` 為 `channel` 或 `both` 時，審核提示會在頻道中可見。只有已解析的審核者可以使用按鈕；其他使用者會收到暫時性的拒絕通知。審核提示包含指令文字，因此請僅在受信任的頻道中啟用頻道傳遞。如果無法從工作階段金鑰衍生頻道 ID，OpenClaw 會回退至 DM 傳遞。

    Discord 也會呈現其他聊天頻道使用的共用審核按鈕。原生 Discord 配接器主要增加了審核者 DM 路由和頻道分發。
    當這些按鈕存在時，它們是主要的審核 UX；當工具結果顯示
    聊天審核無法使用或手動審核是唯一途徑時，OpenClaw
    應該僅包含手動 `/approve` 指令。
    如果 Discord 原生審核執行時期未啟用，OpenClaw 會保持
    本地確定性 `/approve <id> <decision>` 提示可見。如果
    執行時期已啟用但無法將原生卡片傳遞至任何目標，
    OpenClaw 會傳送一則包含來自待審核中確切 `/approve`
    指令的同頻道回退通知。

    Gateway 驗證和審核解析遵循共用的 Gateway 用戶端約定（`plugin:` ID 透過 `plugin.approval.resolve` 解析；其他 ID 透過 `exec.approval.resolve`）。審核預設在 30 分鐘後過期。

    請參閱 [執行審核](/zh-Hant/tools/exec-approvals)。

  </Accordion>
</AccordionGroup>

## 工具和操作閘門

Discord 訊息操作包括傳訊、頻道管理、內容審核、在線狀態和元數據操作。

核心範例：

- 傳訊：`sendMessage`、`readMessages`、`editMessage`、`deleteMessage`、`threadReply`
- 反應：`react`、`reactions`、`emojiList`
- 內容審核：`timeout`、`kick`、`ban`
- 在線狀態：`setPresence`

`event-create` 操作接受可選的 `image` 參數（URL 或本地檔案路徑）來設定排程活動的封面圖片。

操作閘門位於 `channels.discord.actions.*` 之下。

預設閘門行為：

| 操作群組                                                                                                                                                                 | 預設   |
| ------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ------ |
| reactions, messages, threads, pins, polls, search, memberInfo, roleInfo, channelInfo, channels, voiceStatus, events, stickers, emojiUploads, stickerUploads, permissions | 已啟用 |
| roles                                                                                                                                                                    | 已停用 |
| moderation                                                                                                                                                               | 已停用 |
| presence                                                                                                                                                                 | 已停用 |

## 組件 v2 UI

OpenClaw 使用 Discord 組件 v2 來進行執行審批和跨上下文標記。Discord 訊息操作也可以接受 `components` 來實現自訂 UI（進階；需要透過 discord 工具構建組件負載），而舊版的 `embeds` 仍然可用，但不建議使用。

- `channels.discord.ui.components.accentColor` 設定 Discord 組件容器所使用的強調顏色（十六進位）。
- 使用 `channels.discord.accounts.<id>.ui.components.accentColor` 為每個帳戶進行設定。
- 當存在組件 v2 時，會忽略 `embeds`。
- 純網址預覽預設會被隱藏。當單一出站連結應展開時，請在訊息操作上設定 `suppressEmbeds: false`。

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

Discord 有兩個不同的語音介面：即時 **語音頻道**（連續對話）和 **語音訊息附件**（波形預覽格式）。閘道支援這兩者。

### 語音頻道

設定檢查清單：

1. 在 Discord 開發者入口網站中啟用訊息內容意圖。
2. 當使用角色/使用者白名單時，啟用伺服器成員意圖。
3. 使用 `bot` 和 `applications.commands` 範圍邀請機器人。
4. 在目標語音頻道中授予連線、說話、傳送訊息和讀取訊息歷史的權限。
5. 啟用原生指令（`commands.native` 或 `channels.discord.commands.native`）。
6. 設定 `channels.discord.voice`。

使用 `/vc join|leave|status` 來控制會話。該指令使用帳戶預設代理，並遵循與其他 Discord 指令相同的允許清單和群組原則規則。

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

- `voice.tts` 僅針對 `stt-tts` 語音播放覆蓋 `messages.tts`。即時模式使用 `voice.realtime.voice`。
- `voice.mode` 控制對話路徑。預設為 `agent-proxy`：即時語音前端處理輪次計時、中斷和播放，將實質工作透過 `openclaw_agent_consult` 委派給路由的 OpenClaw 代理，並將結果視為來自該說話者的已輸入 Discord 提示。`stt-tts` 保持較舊的批次 STT 加 TTS 流程。`bidi` 允許即時模型直接對話，同時為 OpenClaw 大腦公開 `openclaw_agent_consult`。
- `voice.agentSession` 控制哪個 OpenClaw 對話接收語音輪次。留空以使用語音頻道自己的會話，或設定 `{ mode: "target", target: "channel:<text-channel-id>" }` 使語音頻道充當現有 Discord 文字頻道會話（例如 `#maintainers`）的麥克風/擴音器擴充功能。
- `voice.model` 覆蓋用於 Discord 語音回應和即時諮詢的 OpenClaw 代理大腦。留空以繼承路由的代理模型。它與 `voice.realtime.model` 分開。
- `agent-proxy` 透過 `discord-voice` 路由語音，這會為說話者和目標會話保留正常的擁有者/工具授權，但會隱藏代理程式的 `tts` 工具，因為 Discord 語音擁有播放權。預設情況下，`agent-proxy` 會針對擁有者說話者（`voice.realtime.toolPolicy: "owner"`）給予諮詢完整的擁有者同等工具存取權，並強烈傾向在實質回答之前諮詢 OpenClaw 代理程式（`voice.realtime.consultPolicy: "always"`）。在該預設 `always` 模式下，即時層不會在諮詢回答之前自動說出填充語；它會擷取並轉錄語音，然後說出路由傳來的 OpenClaw 回答。如果多個強制諮詢回答在 Discord 仍在播放第一個回答時完成，後續的精確語音回答將會排隊等待播放閒置，而不是替換正在說話的內容。
- 在 `stt-tts` 模式下，STT 使用 `tools.media.audio`；`voice.model` 不會影響轉錄。
- 在即時模式下，`voice.realtime.provider`、`voice.realtime.model` 和 `voice.realtime.voice` 會設定即時音訊會話。若為 OpenAI Realtime 2 加上 Codex 大腦，請使用 `voice.realtime.model: "gpt-realtime-2"` 和 `voice.model: "openai-codex/gpt-5.5"`。
- OpenAI 即時提供者接受目前的 Realtime 2 事件名稱和舊版 Codex 相容的輸出音訊與轉錄事件別名，因此相容的提供者快照可以變更而不會遺失助理音訊。
- `voice.realtime.bargeIn` 控制說話者開始說話事件是否會中斷作用中的即時播放。若未設定，則會遵循即時提供者的輸入音訊中斷設定。
- `voice.realtime.minBargeInAudioEndMs` 控制 OpenAI 即時插話截斷音訊之前的助理最短播放時間。預設值：`250`。在低回音房間中設定 `0` 以立即中斷，或在回音較重的說話者設定中提高此值。
- 若要在 Discord 上播放 OpenAI 語音，請設定 `voice.tts.provider: "openai"` 並在 `voice.tts.openai.voice` 或 `voice.tts.providers.openai.voice` 下選擇文字轉語音語音。在目前的 OpenAI TTS 模型中，`cedar` 是一個不錯的男性聲音選擇。
- 每個頻道的 Discord `systemPrompt` 覆寫會套用至該語音頻道的語音文字紀錄輪次。
- 語音文字紀錄輪次是從 Discord `allowFrom`（或 `dm.allowFrom`）衍生擁有者狀態；非擁有者發言者無法存取僅限擁有者的工具（例如 `gateway` 和 `cron`）。
- 對於僅限文字的設定，Discord 語音為選用功能；請設定 `channels.discord.voice.enabled=true`（或保留現有的 `channels.discord.voice` 區塊）以啟用 `/vc` 指令、語音執行階段，以及 `GuildVoiceStates` gateway intent。
- `channels.discord.intents.voiceStates` 可以明確覆寫語音狀態 intent 訂閱。保留未設定狀態可讓 intent 遵循有效的語音啟用設定。
- 如果 `voice.autoJoin` 對於同一個公會有多個項目，OpenClaw 會加入該公會最後一個設定的頻道。
- `voice.allowedChannels` 是一個選用的駐留允許清單。保留未設定狀態以允許 `/vc join` 進入任何已授權的 Discord 語音頻道。設定時，`/vc join`、啟動自動加入，以及機器人語音狀態移動都會受限於列出的 `{ guildId, channelId }` 項目。將其設為空陣列可拒絕所有 Discord 語音加入。如果 Discord 將機器人移至允許清單之外，OpenClaw 會離開該頻道，並在可用時重新加入設定的自動加入目標。
- `voice.daveEncryption` 和 `voice.decryptionFailureTolerance` 會傳遞至 `@discordjs/voice` 加入選項。
- 若未設定，`@discordjs/voice` 預設值為 `daveEncryption=true` 和 `decryptionFailureTolerance=24`。
- OpenClaw 預設使用純 JS 的 `opusscript` 解碼器來接收 Discord 語音。可選的原生 `@discordjs/opus` 套件會被 repo pnpm install 政策忽略，因此一般安裝、Docker lanes 和不相關的測試不會編譯原生附加元件。專門的語音效能主機可以在安裝原生附加元件後，透過 `OPENCLAW_DISCORD_OPUS_DECODER=native` 選擇加入。
- `voice.connectTimeoutMs` 控制針對 `/vc join` 的初始 `@discordjs/voice` Ready 等待時間以及自動加入嘗試。預設值：`30000`。
- `voice.reconnectGraceMs` 控制 OpenClaw 在已斷線的語音會話開始重新連接之前等待多久，然後才將其銷毀。預設值：`15000`。
- 在 `stt-tts` 模式下，語音播放不會僅因為另一個使用者開始說話而停止。為了避免回饋迴路，OpenClaw 在 TTS 播放時會忽略新的語音擷取；請在播放結束後再說話以進行下一輪。即時模式會將說話者開始訊號作為插斷訊號轉發給即時提供者。
- 在即時模式中，從揚聲器傳入開啟麥克風的回聲可能看起來像是插斷並中斷播放。對於回聲嚴重的 Discord 房間，請設定 `voice.realtime.providers.openai.interruptResponseOnInputAudio: false` 以防止 OpenAI 在輸入音訊時自動中斷。如果您仍然希望 Discord 說話者開始事件中斷目前的播放，請新增 `voice.realtime.bargeIn: true`。OpenAI 即時橋接器會忽略短於 `voice.realtime.minBargeInAudioEndMs` 的播放截斷，視其為可能的回聲/雜訊，並將其記錄為已跳過，而不是清除 Discord 播放。
- `voice.captureSilenceGraceMs` 控制 OpenClaw 在 Discord 回報說話者停止後，等待多久才將該音訊片段定案以進行 STT。預設值：`2500`；如果 Discord 將正常的停頓分割成斷斷續續的部分轉錄，請提高此值。
- 當選擇 ElevenLabs 作為 TTS 提供者時，Discord 語音播放會使用串流 TTS 並從提供者的回應串流開始播放。不支援串流的提供者會退回到合成的暫存檔案路徑。
- OpenClaw 也會監控接收解密失敗，並在短時間內多次失敗後，透過離開/重新加入語音頻道來自動復原。
- 如果在更新後接收日誌重複顯示 `DecryptionFailed(UnencryptedWhenPassthroughDisabled)`，請收集依賴報告和日誌。內建的 `@discordjs/voice` 行包含了來自 discord.js PR #11449 的上游填充修補程式，該 PR 關閉了 discord.js issue #11419。
- 當 OpenClaw 完成擷取的發言者片段時，預期會有 `The operation was aborted` 接收事件；它們是詳細的診斷訊息，而非警告。
- 詳細的 Discord 語音日誌包含每個已接受的發言者片段的有界單行 STT 轉錄預覽，因此除錯會顯示使用者端和代理程式回覆端，而不會傾印無界的轉錄文字。
- 在 `agent-proxy` 模式下，強制諮詢回退會跳過可能不完整的轉錄片段，例如以 `...` 結尾的文字或像 `and` 這樣的尾隨連接詞，加上明顯不可操作的結束語，如「馬上回來」或「再見」。當這阻止了過期的排隊答案時，日誌會顯示 `forced agent consult skipped reason=...`。

來源檢出的原生 opus 設定：

```bash
pnpm install
mise exec node@22 -- pnpm discord:opus:install
```

當您想要上游 macOS arm64 預建的原生附加元件時，請使用 Node 22 做為閘道。如果您使用其他的 Node 執行時，選用安裝程式可能需要本機 `node-gyp` 原始碼建置工具鍊。

安裝原生附加元件後，使用以下指令啟動閘道：

```bash
OPENCLAW_DISCORD_OPUS_DECODER=native pnpm gateway:watch
```

詳細的語音日誌應顯示 `discord voice: opus decoder: @discordjs/opus`。如果沒有選用環境變數，或是原生附加元件遺失或無法在主機上載入，OpenClaw 會記錄 `discord voice: opus decoder: opusscript` 並繼續透過純 JS 回退接收語音。

STT 加上 TTS 管線：

- Discord PCM 擷取會轉換為 WAV 暫存檔。
- `tools.media.audio` 處理 STT，例如 `openai/gpt-4o-mini-transcribe`。
- 轉錄文字會透過 Discord 進入和路由發送，同時回應 LLM 以隱藏代理程式 `tts` 工具並要求傳回文字的語音輸出政策執行，因為 Discord 語音擁有最終的 TTS 播放權。
- `voice.model` 若已設定，僅會針對此語音頻道輪次覆寫回應 LLM。
- `voice.tts` 會合併到 `messages.tts` 上；支援串流的提供者會直接將音訊饋送給播放器，否則產生的音訊檔案會在已加入的頻道中播放。

預設的代理程式代理語音頻道會話範例：

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

如果沒有 `voice.agentSession` 區塊，每個語音頻道都會獲得自己路由的 OpenClaw 會話。例如，`/vc join channel:234567890123456789` 會與該 Discord 語音頻道的會話交談。即時模型只是語音前端；實質性的請求會交給已設定的 OpenClaw 代理程式。如果即時模型產生了最終的文字記錄卻未呼叫 consult 工具，OpenClaw 會強制進行 consult 作為後備方案，讓預設行為仍保持與與代理程式交談一致。

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

在 `agent-proxy` 模式下，機器人會加入已設定的語音頻道，但 OpenClaw 代理程式的回合會使用目標頻道的正常路由會話和代理程式。即時語音會話會將傳回的結果說回語音頻道中。監督代理程式仍可根據其工具政策使用正常的訊息工具，包括發送單獨的 Discord 訊息（如果那是正確的動作）。

有用的目標形式：

- `target: "channel:123456789012345678"` 透過 Discord 文字頻道會話進行路由。
- `target: "123456789012345678"` 被視為頻道目標。
- `target: "dm:123456789012345678"` 或 `target: "user:123456789012345678"` 透過該直接訊息會話進行路由。

高回音的 OpenAI Realtime 範例：

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

當模型透過開啟的麥克風聽到自己的 Discord 播放聲時，請使用此選項，但您仍希望透過說話來中斷它。OpenClaw 防止 OpenAI 在原始輸入音訊上自動中斷，而 `bargeIn: true` 則允許 Discord 說話者開始事件和已啟動的說話者音訊，在下一個擷取的回合到達 OpenAI 之前，取消作用中的即時回應。低於 `minBargeInAudioEndMs` 且具備 `audioEndMs` 的極早插入訊號會被視為可能的回音/雜訊並予以忽略，因此模型不會在第一個播放幀處就被切斷。

預期的語音日誌：

- 加入時：`discord voice: joining ... voiceSession=... supervisorSession=... agentSessionMode=... voiceModel=... realtimeModel=...`
- 即時開始時：`discord voice: realtime bridge starting ... autoRespond=false interruptResponse=false bargeIn=false minBargeInAudioEndMs=...`
- 關於說者音訊：`discord voice: realtime speaker turn opened ...`、`discord voice: realtime input audio started ... outputAudioMs=... outputActive=...` 和 `discord voice: realtime speaker turn closed ... chunks=... discordBytes=... realtimeBytes=... interruptedPlayback=...`
- 關於跳過過時語音：`discord voice: realtime forced agent consult skipped reason=incomplete-transcript ...` 或 `reason=non-actionable-closing ...`
- 關於即時回應完成：`discord voice: realtime audio playback finishing reason=response.done ... audioMs=... chunks=...`
- 關於播放停止/重置：`discord voice: realtime audio playback stopped reason=... audioMs=... elapsedMs=... chunks=...`
- 關於即時諮詢：`discord voice: realtime consult requested ... voiceSession=... supervisorSession=... question=...`
- 關於代理回答：`discord voice: agent turn answer ...`
- 關於排隊的精確語音：`discord voice: realtime exact speech queued ... queued=... outputAudioMs=... outputActive=...`，隨後是 `discord voice: realtime exact speech dequeued reason=player-idle ...`
- 關於插話檢測：`discord voice: realtime barge-in detected source=speaker-start ...` 或 `discord voice: realtime barge-in detected source=active-speaker-audio ...`，隨後是 `discord voice: realtime barge-in requested reason=... outputAudioMs=... outputActive=...`
- 關於即時中斷：`discord voice: realtime model interrupt requested client:response.cancel reason=barge-in`，隨後是 `discord voice: realtime model audio truncated client:conversation.item.truncate reason=barge-in audioEndMs=...` 或 `discord voice: realtime model interrupt confirmed server:response.done status=cancelled ...`
- 關於忽略的回音/雜音：`discord voice: realtime model interrupt ignored client:conversation.item.truncate.skipped reason=barge-in audioEndMs=0 minAudioEndMs=250`
- 關於停用的插話：`discord voice: realtime capture ignored during playback (barge-in disabled) ...`
- 關於閒置播放：`discord voice: realtime barge-in ignored reason=... outputActive=false ... playbackChunks=0`

若要調試被截斷的音訊，請將即時語音日誌視為時間軸進行閱讀：

1. `realtime audio playback started` 表示 Discord 已開始播放助理音訊。橋接器從此刻開始計算助理輸出區塊、Discord PCM 位元組、提供者即時位元組以及合成音訊持續時間。
2. `realtime speaker turn opened` 標記 Discord 說者變為活躍狀態。如果播放已經活躍並且已啟用 `bargeIn`，則此後可能會接著 `barge-in detected source=speaker-start`。
3. `realtime input audio started` 標記為該說者輪次接收到第一個實際音訊幀。此處出現 `outputActive=true` 或非零的 `outputAudioMs` 表示助理播放仍在活躍時，麥克風正在發送輸入。
4. `barge-in detected source=active-speaker-audio` 表示 OpenClaw 在助理播放活躍期間看到了即時說者音訊。這有助於區分真正的中斷與沒有有用音訊的 Discord 說者開始事件。
5. `barge-in requested reason=...` 表示 OpenClaw 要求即時提供者取消或截斷目前的回應。它包含 `outputAudioMs`、`outputActive` 和 `playbackChunks`，因此您可以看到在中斷之前實際播放了多少助理音訊。
6. `realtime audio playback stopped reason=...` 是本機 Discord 播放重置點。原因顯示了誰停止了播放：`barge-in`、`player-idle`、`provider-clear-audio`、`forced-agent-consult`、`stream-close` 或 `session-close`。
7. `realtime speaker turn closed` 摘要了捕獲的輸入輪次。`chunks=0` 或 `hasAudio=false` 表示說話者輪次已開啟，但沒有可用的音訊到達即時橋接器。`interruptedPlayback=true` 表示輸入輪次與助理輸出重疊，並觸發了插話邏輯。

實用欄位：

- `outputAudioMs`：即時提供者在日誌行之前產生的助理音訊持續時間。
- `audioMs`：OpenClaw 在播放停止之前計算的助理音訊持續時間。
- `elapsedMs`：開啟和關閉播放串流或說話者輪次之間的牆上時鐘時間。
- `discordBytes`：傳送到 Discord 語音或從其接收的 48 kHz 立體聲 PCM 位元組。
- `realtimeBytes`：傳送到即時提供者或從其接收的提供者格式 PCM 位元組。
- `playbackChunks`：轉發到 Discord 的助理音訊區塊，用於目前的回應。
- `sinceLastAudioMs`：最後一個捕獲的說話者音訊框與說話者輪次關閉之間的間隙。

常見模式：

- 立即斷開並伴有 `source=active-speaker-audio`、較小的 `outputAudioMs`，且附近有相同的使用者，通常指向說話者回聲進入了麥克風。調高 `voice.realtime.minBargeInAudioEndMs`，降低說話者音量，使用耳機，或設定 `voice.realtime.providers.openai.interruptResponseOnInputAudio: false`。
- `source=speaker-start` 之後接 `speaker turn closed ... hasAudio=false` 表示 Discord 回報有說話者開始說話，但沒有音訊傳送到 OpenClaw。這可能是暫時性的 Discord 語音事件、雜訊閘行為，或是客戶端短暫開啟麥克風。
- `audio playback stopped reason=stream-close` 若附近沒有插話或 `provider-clear-audio`，表示本機 Discord 播放串流意外結束。請檢查前一個提供者和 Discord 播放器日誌。
- `capture ignored during playback (barge-in disabled)` 表示當助手音訊正在播放時，OpenClaw 故意捨棄了輸入。如果您希望語音能中斷播放，請啟用 `voice.realtime.bargeIn`。
- `barge-in ignored ... outputActive=false` 表示 Discord 或提供者 VAD 回報有語音，但 OpenClaw 沒有正在播放的音訊可中斷。這不應該會切斷音訊。

認證資訊是依元件解析的：LLM 路由認證用於 `voice.model`，STT 認證用於 `tools.media.audio`，TTS 認證用於 `messages.tts`/`voice.tts`，而即時提供者認證用於 `voice.realtime.providers` 或提供者的正常認證設定。

### 語音訊息

Discord 語音訊息會顯示波形預覽，且需要 OGG/Opus 音訊。OpenClaw 會自動產生波形，但在閘道主機上需要 `ffmpeg` 和 `ffprobe` 來檢查和轉換。

- 提供 **本機檔案路徑** (URL 會被拒絕)。
- 請省略文字內容 (Discord 會拒絕在同一個載荷中同時包含文字和語音訊息)。
- 接受任何音訊格式；OpenClaw 會視需要轉換為 OGG/Opus。

```bash
message(action="send", channel="discord", target="channel:123", path="/path/to/audio.mp3", asVoice=true)
```

## 疑難排解

<AccordionGroup>
  <Accordion title="使用了不允許的意圖或機器人看不到公會訊息">

    - 啟用訊息內容意圖
    - 當您依賴使用者/成員解析時，啟用伺服器成員意圖
    - 變更意圖後重新啟動閘道

  </Accordion>

  <Accordion title="伺服器訊息意外被阻擋">

    - 驗證 `groupPolicy`
    - 驗證 `channels.discord.guilds` 下的伺服器許可清單
    - 如果伺服器 `channels` 對應存在，則僅允許列出的頻道
    - 驗證 `requireMention` 行為與提及模式

    實用的檢查方式：

```bash
openclaw doctor
openclaw channels status --probe
openclaw logs --follow
```

  </Accordion>

  <Accordion title="Require mention 設為 false 但仍被阻擋">
    常見原因：

    - `groupPolicy="allowlist"` 但沒有對應的伺服器/頻道許可清單
    - `requireMention` 配置位置錯誤（必須位於 `channels.discord.guilds` 或頻道項目下）
    - 發送者被伺服器/頻道 `users` 許可清單阻擋

  </Accordion>

  <Accordion title="長時間執行的 Discord 輪次或重複回覆">

    典型日誌：

    - `Slow listener detected ...`
    - `stuck session: sessionKey=agent:...:discord:... state=processing ...`

    Discord Gateway 佇列調整參數：

    - 單一帳號：`channels.discord.eventQueue.listenerTimeout`
    - 多帳號：`channels.discord.accounts.<accountId>.eventQueue.listenerTimeout`
    - 這僅控制 Discord Gateway 監聽器的工作，而非代理輪次的生命週期

    Discord 不會對已排隊的代理輪次套用頻道擁有的逾時時間。訊息監聽器會立即移交工作，而已排隊的 Discord 執行作業會保留每個會話的順序，直到會話/工具/執行時期生命週期完成或中止該工作。

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

  <Accordion title="Gateway 元資料查詢逾時警告">
    OpenClaw 在連線前會取得 Discord `/gateway/bot` 元資料。暫時性失敗會回退至 Discord 的預設 Gateway URL，並在日誌中進行速率限制。

    元資料逾時調整參數：

    - 單一帳號：`channels.discord.gatewayInfoTimeoutMs`
    - 多帳號：`channels.discord.accounts.<accountId>.gatewayInfoTimeoutMs`
    - 未設定配置時的環境變數回退：`OPENCLAW_DISCORD_GATEWAY_INFO_TIMEOUT_MS`
    - 預設值：`30000` (30 秒)，最大值：`120000`

  </Accordion>

  <Accordion title="Gateway READY 逾時重啟">
    OpenClaw 在啟動期間和運行時重新連線後會等待 Discord 的 gateway `READY` 事件。具備啟動錯開功能的多帳號設定可能需要比預設值更長的啟動 READY 視窗。

    READY 逾時控制選項：

    - 啟動單一帳號：`channels.discord.gatewayReadyTimeoutMs`
    - 啟動多帳號：`channels.discord.accounts.<accountId>.gatewayReadyTimeoutMs`
    - 未設定設定時的啟動環境變數後援：`OPENCLAW_DISCORD_READY_TIMEOUT_MS`
    - 啟動預設值：`15000` (15 秒)，最大值：`120000`
    - 運行時單一帳號：`channels.discord.gatewayRuntimeReadyTimeoutMs`
    - 運行時多帳號：`channels.discord.accounts.<accountId>.gatewayRuntimeReadyTimeoutMs`
    - 未設定設定時的運行時環境變數後援：`OPENCLAW_DISCORD_RUNTIME_READY_TIMEOUT_MS`
    - 運行時預設值：`30000` (30 秒)，最大值：`120000`

  </Accordion>

  <Accordion title="權限稽核不一致">
    `channels status --probe` 權限檢查僅適用於數值頻道 ID。

    如果您使用 slug 鍵，運行時比對仍然可以運作，但 probe 無法完全驗證權限。

  </Accordion>

  <Accordion title="DM 和配對問題">

    - DM 已停用：`channels.discord.dm.enabled=false`
    - DM 原則已停用：`channels.discord.dmPolicy="disabled"` (舊版：`channels.discord.dm.policy`)
    - 正在等待 `pairing` 模式下的配對核准

  </Accordion>

  <Accordion title="Bot to bot loops">
    根據預設，由機器人傳送的訊息會被忽略。

    如果您設定了 `channels.discord.allowBots=true`，請使用嚴格的提及和允許清單規則來避免迴圈行為。
    建議優先使用 `channels.discord.allowBots="mentions"` 以僅接受提及該機器人的機器人訊息。

    OpenClaw 也內建了共用的 [機器人迴圈防護](/zh-Hant/channels/bot-loop-protection)。每當 `allowBots` 讓由機器人傳送的訊息抵達派發層級時，Discord 會將傳入事件對應至 `(account, channel, bot pair)` 事實，而通用配對守衛會在該配對超過設定的事件預算後抑制該配對。此守衛可防止以往必須透過 Discord 速率限制才能阻止的失控雙機器人迴圈；這不會影響單一機器人部署或保持在預算內的一次性機器人回覆。

    預設設定（當設定 `allowBots` 時啟用）如下：

    - `maxEventsPerWindow: 20` -- 機器人配對可在滑動視窗內交換 20 則訊息
    - `windowSeconds: 60` -- 滑動視窗長度
    - `cooldownSeconds: 60` -- 一旦觸發預算，任何方向每則額外的機器人對機器人訊息都將被丟棄一分鐘

    在 `channels.defaults.botLoopProtection` 下設定一次共用的預設值，然後當合法的工作流程需要更多空間時覆寫 Discord 設定。優先順序為：

    - `channels.discord.accounts.<account>.botLoopProtection`
    - `channels.discord.botLoopProtection`
    - `channels.defaults.botLoopProtection`
    - 內建預設值

    Discord 使用通用的 `maxEventsPerWindow`、`windowSeconds` 和 `cooldownSeconds` 鍵值。

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
            // Lets Molty write "@Mantis" and send a real Discord mention.
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

  <Accordion title="語音 STT 因 DecryptionFailed(...) 而中斷">

    - 保持 OpenClaw 為最新版本 (`openclaw update`)，以確保存在 Discord 語音接收恢復邏輯
    - 確認 `channels.discord.voice.daveEncryption=true` (預設)
    - 從 `channels.discord.voice.decryptionFailureTolerance=24` (上游預設) 開始，僅在需要時進行調整
    - 監控日誌中的以下內容：
      - `discord voice: DAVE decrypt failures detected`
      - `discord voice: repeated decrypt failures; attempting rejoin`
    - 如果自動重新加入後故障持續存在，請收集日誌並與 [discord.js #11419](https://github.com/discordjs/discord.js/issues/11419) 和 [discord.js #11449](https://github.com/discordjs/discord.js/pull/11449) 中的上游 DAVE 接收歷史進行比較

  </Accordion>
</AccordionGroup>

## 組態參考

主要參考：[組態參考 - Discord](/zh-Hant/gateway/config-channels#discord)。

<Accordion title="高信號 Discord 欄位">

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

- 請將機器人令牌視為機密（在受監控的環境中，建議優先使用 `DISCORD_BOT_TOKEN`）。
- 授予最小權限的 Discord 權限。
- 如果指令部署/狀態已過時，請重新啟動 gateway 並使用 `openclaw channels status --probe` 重新檢查。

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
    威脅模型與防護加固。
  </Card>
  <Card title="多重代理程式路由" icon="sitemap" href="/zh-Hant/concepts/multi-agent">
    將伺服器和通道對應至代理程式。
  </Card>
  <Card title="斜線指令" icon="terminal" href="/zh-Hant/tools/slash-commands">
    原生指令行為。
  </Card>
</CardGroup>
