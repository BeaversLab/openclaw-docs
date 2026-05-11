---
summary: "Telegram bot 支援狀態、功能和配置"
read_when:
  - Working on Telegram features or webhooks
title: "Telegram"
---

透過 grammY 實現適用於機器人私訊和群組的生產就緒功能。長輪詢是預設模式；Webhook 模式是可選的。

<CardGroup cols={3}>
  <Card title="配對" icon="link" href="/zh-Hant/channels/pairing">
    Telegram 的預設私訊原則是配對。
  </Card>
  <Card title="頻道疑難排解" icon="wrench" href="/zh-Hant/channels/troubleshooting">
    跨頻道診斷和修復手冊。
  </Card>
  <Card title="閘道組態" icon="settings" href="/zh-Hant/gateway/configuration">
    完整的頻道組態模式和範例。
  </Card>
</CardGroup>

## 快速設定

<Steps>
  <Step title="在 BotFather 中建立機器人 Token">
    開啟 Telegram 並與 **@BotFather** 對話（確認帳號確切是 `@BotFather`）。

    執行 `/newbot`，依照提示操作，並儲存 token。

  </Step>

  <Step title="設定 Token 與私訊原則">

```json5
{
  channels: {
    telegram: {
      enabled: true,
      botToken: "123:abc",
      dmPolicy: "pairing",
      groups: { "*": { requireMention: true } },
    },
  },
}
```

    環境變數後備：`TELEGRAM_BOT_TOKEN=...` (僅適用於預設帳號)。
    Telegram **不**會使用 `openclaw channels login telegram`；請在設定/環境變數中設定 token，然後啟動閘道。

  </Step>

  <Step title="啟動閘道並核准首條私訊">

```bash
openclaw gateway
openclaw pairing list telegram
openclaw pairing approve telegram <CODE>
```

    配對碼將於 1 小時後過期。

  </Step>

  <Step title="將機器人加入群組">
    將機器人加入您的群組，然後設定 `channels.telegram.groups` 和 `groupPolicy` 以符合您的存取模式。
  </Step>
</Steps>

<Note>Token 解析順序具備帳號感知功能。實際上，設定值會優先於環境變數後備，且 `TELEGRAM_BOT_TOKEN` 僅適用於預設帳號。</Note>

## Telegram 端設定

<AccordionGroup>
  <Accordion title="隱私模式和群組可見性">
    Telegram 機器人預設處於 **隱私模式**，這會限制它們接收到的群組訊息。

    如果機器人必須查看所有群組訊息，請執行以下任一操作：

    - 透過 `/setprivacy` 停用隱私模式，或
    - 將機器人設為群組管理員。

    切換隱私模式時，請在每個群組中移除並重新加入機器人，以便 Telegram 套用變更。

  </Accordion>

  <Accordion title="群組權限">
    管理員狀態是在 Telegram 群組設定中控制的。

    管理員機器人會接收所有群組訊息，這對於始終啟用的群組行為很有用。

  </Accordion>

  <Accordion title="實用的 BotFather 切換開關">

    - `/setjoingroups` 以允許/拒絕群組新增
    - `/setprivacy` 用於群組可見性行為

  </Accordion>
</AccordionGroup>

## 存取控制和啟用

<Tabs>
  <Tab title="DM 原則">
    `channels.telegram.dmPolicy` 控制直接訊息存取權限：

    - `pairing` (預設)
    - `allowlist` (需要 `allowFrom` 中至少有一個發送者 ID)
    - `open` (需要 `allowFrom` 包含 `"*"`)
    - `disabled`

    `channels.telegram.allowFrom` 接受數字 Telegram 使用者 ID。`telegram:` / `tg:` 前綴會被接受並正規化。
    `dmPolicy: "allowlist"` 若設為空白的 `allowFrom` 將會阻擋所有 DM，並且會被組態驗證拒絕。
    設定過程只會要求輸入數字使用者 ID。
    如果您升級了版本且您的組態中包含 `@username` 允許清單項目，請執行 `openclaw doctor --fix` 來解析它們 (盡力而為；需要 Telegram bot token)。
    如果您之前依賴 pairing-store 允許清單檔案，`openclaw doctor --fix` 可以在允許清單流程中將項目還原至 `channels.telegram.allowFrom` (例如當 `dmPolicy: "allowlist"` 尚沒有明確的 ID 時)。

    對於單一擁有者的機器人，建議優先使用帶有明確數字 `allowFrom` ID 的 `dmPolicy: "allowlist"`，以確保組態中的存取原則持久有效 (而不是依賴先前的配對核准)。

    常見誤解：DM 配對核准並不意味著「此發送者在任何地方都已獲得授權」。
    配對僅授予 DM 存取權限。群組發送者授權仍來自明確的組態允許清單。
    如果您想要「我只需被授權一次，DM 和群組指令就能運作」，請將您的數字 Telegram 使用者 ID 放入 `channels.telegram.allowFrom`。

    ### 尋找您的 Telegram 使用者 ID

    更安全的方法 (不使用第三方機器人)：

    1. 傳送私訊 (DM) 給您的機器人。
    2. 執行 `openclaw logs --follow`。
    3. 閱讀 `from.id`。

    官方 Bot API 方法：

```bash
curl "https://api.telegram.org/bot<bot_token>/getUpdates"
```

    第三方方法 (隱私性較低)：`@userinfobot` 或 `@getidsbot`。

  </Tab>

  <Tab title="群組政策與允許清單">
    兩項控制措施會同時生效：

    1. **哪些群組被允許** (`channels.telegram.groups`)
       - 沒有 `groups` 設定：
         - 使用 `groupPolicy: "open"`：任何群組都能通過群組 ID 檢查
         - 使用 `groupPolicy: "allowlist"` (預設)：群組會被封鎖，直到您加入 `groups` 項目 (或 `"*"`)
       - 已設定 `groups`：作為允許清單 (明確 ID 或 `"*"`)

    2. **群組中哪些傳送者被允許** (`channels.telegram.groupPolicy`)
       - `open`
       - `allowlist` (預設)
       - `disabled`

    `groupAllowFrom` 用於篩選群組傳送者。若未設定，Telegram 會回退至 `allowFrom`。
    `groupAllowFrom` 項目應為數字格式的 Telegram 使用者 ID (`telegram:` / `tg:` 前綴會被正規化)。
    請勿將 Telegram 群組或超級群組聊天 ID 放入 `groupAllowFrom`。負數聊天 ID 應置於 `channels.telegram.groups`。
    非數字項目在傳送者授權時會被忽略。
    安全邊界 (`2026.2.25+`)：群組傳送者授權 **不會** 繼承 DM 配對儲存庫的核准。
    配對僅限於 DM。對於群組，請設定 `groupAllowFrom` 或各群組/各主題的 `allowFrom`。
    若 `groupAllowFrom` 未設定，Telegram 會回退至設定檔 `allowFrom`，而非配對儲存庫。
    單一擁有者機器人的實用模式：在 `channels.telegram.allowFrom` 中設定您的使用者 ID，將 `groupAllowFrom` 保持未設定，並在 `channels.telegram.groups` 下允許目標群組。
    執行時備註：若 `channels.telegram` 完全遺失，執行時預設為失效關閉 (fail-closed) `groupPolicy="allowlist"`，除非明確設定了 `channels.defaults.groupPolicy`。

    範例：允許特定群組中的任何成員：

```json5
{
  channels: {
    telegram: {
      groups: {
        "-1001234567890": {
          groupPolicy: "open",
          requireMention: false,
        },
      },
    },
  },
}
```

    範例：僅允許特定群組中的特定使用者：

```json5
{
  channels: {
    telegram: {
      groups: {
        "-1001234567890": {
          requireMention: true,
          allowFrom: ["8734062810", "745123456"],
        },
      },
    },
  },
}
```

    <Warning>
      常見錯誤：`groupAllowFrom` 並不是 Telegram 群組的允許清單。

      - 將負數的 Telegram 群組或超級群組聊天 ID (如 `-1001234567890`) 置於 `channels.telegram.groups` 下。
      - 當您想限制允許群組中哪些人可以觸發機器人時，將 Telegram 使用者 ID (如 `8734062810`) 置於 `groupAllowFrom` 下。
      - 僅當您希望允許群組中的任何成員都能與機器人交談時，才使用 `groupAllowFrom: ["*"]`。
    </Warning>

  </Tab>

  <Tab title="提及行為">
    群組回覆預設需要提及。

    提及可以來自：

    - 原生 `@botusername` 提及，或
    - 以下內容中的提及模式：
      - `agents.list[].groupChat.mentionPatterns`
      - `messages.groupChat.mentionPatterns`

    會話層級的指令切換：

    - `/activation always`
    - `/activation mention`

    這些僅更新會話狀態。請使用設定以進行持久化。

    持久化設定範例：

```json5
{
  channels: {
    telegram: {
      groups: {
        "*": { requireMention: false },
      },
    },
  },
}
```

    取得群組聊天 ID：

    - 將群組訊息轉發給 `@userinfobot` / `@getidsbot`
    - 或從 `openclaw logs --follow` 讀取 `chat.id`
    - 或檢查 Bot API `getUpdates`

  </Tab>
</Tabs>

## 執行時行為

- Telegram 由 gateway 程序擁有。
- 路由是確定性的：Telegram 的入站回覆會回傳給 Telegram（模型不會選擇頻道）。
- 入站訊息會正規化為共享頻道封包，其中包含回覆元資料和媒體預留位置。
- 群組會話依群組 ID 隔離。論壇主題會附加 `:topic:<threadId>` 以保持主題隔離。
- 私訊可以攜帶 `message_thread_id`；OpenClaw 使用具備執行緒感知能力的會話金鑰來路由它們，並為回覆保留執行緒 ID。
- 長輪詢使用具備每個聊天/每個執行緒排序功能的 grammY 執行器。整體執行器接收端並行性使用 `agents.defaults.maxConcurrent`。
- 長輪詢在每個 gateway 程序內部受到保護，因此一次只有一個作用中的輪詢器可以使用 bot token。如果您仍然看到 `getUpdates` 409 衝突，表示另一個 OpenClaw gateway、腳本或外部輪詢器可能正在使用相同的 token。
- 長輪詢看門狗重新啟動觸發器預設在 120 秒未完成 `getUpdates` 存活後啟動。僅在您的部署在長時間運行的工作期間仍然出現錯誤的輪詢停滯重新啟動時，才增加 `channels.telegram.pollingStallThresholdMs`。該值以毫秒為單位，允許範圍從 `30000` 到 `600000`；支援每個帳戶的覆寫。
- Telegram Bot API 不支援已讀回執（`sendReadReceipts` 不適用）。

## 功能參考

<AccordionGroup>
  <Accordion title="即時串流預覽（訊息編輯）">
    OpenClaw 可以即時串流部分回覆：

    - 直接聊天：預覽訊息 + `editMessageText`
    - 群組/主題：預覽訊息 + `editMessageText`

    需求：

    - `channels.telegram.streaming` 為 `off | partial | block | progress`（預設：`partial`）
    - `progress` 在 Telegram 上對應至 `partial`（相容跨通道命名）
    - `streaming.preview.toolProgress` 控制工具/進度更新是否重複使用同一個編輯過的預覽訊息（預設：當預覽串流啟用時為 `true`）
    - 偵測到舊版 `channels.telegram.streamMode` 與布林值 `streaming`；請執行 `openclaw doctor --fix` 將其遷移至 `channels.telegram.streaming.mode`

    工具進度預覽更新是指在工具執行時顯示的簡短「Working...」行，例如指令執行、檔案讀取、規劃更新或修補摘要。Telegram 預設保持啟用這些功能，以符合 `v2026.4.22` 及之後發布的 OpenClaw 行為。若要保留答案文字的編輯預覽但隱藏工具進度行，請設定：

    ```json
    {
      "channels": {
        "telegram": {
          "streaming": {
            "mode": "partial",
            "preview": {
              "toolProgress": false
            }
          }
        }
      }
    }
    ```

    僅在您想要完全停用 Telegram 預覽編輯時使用 `streaming.mode: "off"`。僅在您想要停用工具進度狀態行時使用 `streaming.preview.toolProgress: false`。

    對於純文字回覆：

    - 簡短的直接訊息/群組/主題預覽：OpenClaw 保留同一則預覽訊息並就地進行最終編輯
    - 超過約一分鐘的預覽：OpenClaw 會將完成的回覆作為新的最終訊息發送，然後清理預覽，因此 Telegram 可見的時間戳記反映的是完成時間，而非預覽建立時間

    對於複雜回覆（例如媒體載荷），OpenClaw 會恢復為正常的最終傳遞，然後清理預覽訊息。

    預覽串流與區塊串流是分開的。當針對 Telegram 明確啟用區塊串流時，OpenClaw 會跳過預覽串流以避免雙重串流。

    如果無法使用或拒絕原生草稿傳輸，OpenClaw 會自動退回至 `sendMessage` + `editMessageText`。

    Telegram 專用的推理串流：

    - `/reasoning stream` 在生成時將推理發送至即時預覽
    - 最終答案不包含推理文字

  </Accordion>

  <Accordion title="格式與 HTML 後備">
    傳出文字使用 Telegram `parse_mode: "HTML"`。

    - 準 Markdown 文字會轉譯為 Telegram 安全的 HTML。
    - 原始模型 HTML 會進行跳脫，以減少 Telegram 解析失敗。
    - 如果 Telegram 拒絕解析後的 HTML，OpenClaw 會以純文字重試。

    連結預覽預設為啟用，可使用 `channels.telegram.linkPreview: false` 停用。

  </Accordion>

  <Accordion title="原生指令和自訂指令">
    Telegram 指令選單註冊在啟動時透過 `setMyCommands` 處理。

    原生指令預設值：

    - `commands.native: "auto"` 啟用 Telegram 的原生指令

    新增自訂指令選單項目：

```json5
{
  channels: {
    telegram: {
      customCommands: [
        { command: "backup", description: "Git backup" },
        { command: "generate", description: "Create an image" },
      ],
    },
  },
}
```

    規則：

    - 名稱會被正規化（移除開頭的 `/`，轉為小寫）
    - 有效模式：`a-z`、`0-9`、`_`，長度 `1..32`
    - 自訂指令無法覆寫原生指令
    - 衝突/重複項目會被跳過並記錄

    備註：

    - 自訂指令僅為選單項目；它們不會自動實作行為
    - 外掛/技能指令即使未顯示在 Telegram 選單中，在輸入時仍可運作

    如果停用原生指令，內建指令會被移除。如果已設定，自訂/外掛指令仍可註冊。

    常見設定失敗：

    - `setMyCommands failed` 搭配 `BOT_COMMANDS_TOO_MUCH` 表示 Telegram 選單在修剪後仍然溢位；請減少外掛/技能/自訂指令或停用 `channels.telegram.commands.native`。
    - `setMyCommands failed` 搭配網路/擷取錯誤通常表示對 `api.telegram.org` 的輸出 DNS/HTTPS 被阻擋。

    ### 裝置配對指令 (`device-pair` 外掛)

    當安裝 `device-pair` 外掛時：

    1. `/pair` 產生設定程式碼
    2. 將程式碼貼到 iOS 應用程式中
    3. `/pair pending` 列出待處理請求（包括角色/範圍）
    4. 核准請求：
       - `/pair approve <requestId>` 用於明確核准
       - `/pair approve` 當只有一個待處理請求時
       - `/pair approve latest` 用於最近的一個

    設定程式碼帶有短期的啟動權杖。內建啟動交接會將主要節點權杖保留在 `scopes: []`；任何被交接的操作員權杖會保持在 `operator.approvals`、`operator.read`、`operator.talk.secrets` 和 `operator.write` 之內。啟動範圍檢查會加上角色前綴，因此操作員白名單僅滿足操作員請求；非操作員角色仍需要在其自己的角色前綴下的範圍。

    如果裝置以變更的驗證詳細資料（例如角色/範圍/公開金鑰）重試，先前的待處理請求會被取代，新請求會使用不同的 `requestId`。請在核准前重新執行 `/pair pending`。

    更多詳細資訊：[配對](/zh-Hant/channels/pairing#pair-via-telegram-recommended-for-ios)。

  </Accordion>

  <Accordion title="Inline buttons">
    配置內聯鍵盤範圍：

```json5
{
  channels: {
    telegram: {
      capabilities: {
        inlineButtons: "allowlist",
      },
    },
  },
}
```

    帳戶層級的覆寫：

```json5
{
  channels: {
    telegram: {
      accounts: {
        main: {
          capabilities: {
            inlineButtons: "allowlist",
          },
        },
      },
    },
  },
}
```

    範圍：

    - `off`
    - `dm`
    - `group`
    - `all`
    - `allowlist` （預設）

    舊版的 `capabilities: ["inlineButtons"]` 對應到 `inlineButtons: "all"`。

    訊息動作範例：

```json5
{
  action: "send",
  channel: "telegram",
  to: "123456789",
  message: "Choose an option:",
  buttons: [
    [
      { text: "Yes", callback_data: "yes" },
      { text: "No", callback_data: "no" },
    ],
    [{ text: "Cancel", callback_data: "cancel" }],
  ],
}
```

    回調點擊會以文字形式傳遞給代理：
    `callback_data: <value>`

  </Accordion>

  <Accordion title="適用於代理程式和自動化的 Telegram 訊息動作">
    Telegram 工具動作包括：

    - `sendMessage` (`to`, `content`, 選填 `mediaUrl`, `replyToMessageId`, `messageThreadId`)
    - `react` (`chatId`, `messageId`, `emoji`)
    - `deleteMessage` (`chatId`, `messageId`)
    - `editMessage` (`chatId`, `messageId`, `content`)
    - `createForumTopic` (`chatId`, `name`, 選填 `iconColor`, `iconCustomEmojiId`)

    頻道訊息動作公開符合人體工學的別名 (`send`, `react`, `delete`, `edit`, `sticker`, `sticker-search`, `topic-create`)。

    閘道控制：

    - `channels.telegram.actions.sendMessage`
    - `channels.telegram.actions.deleteMessage`
    - `channels.telegram.actions.reactions`
    - `channels.telegram.actions.sticker` (預設: 已停用)

    注意: `edit` 和 `topic-create` 目前預設為啟用，並且沒有個別的 `channels.telegram.actions.*` 切換開關。
    執行時傳送使用啟用的設定/秘密資料快照 (啟動/重新載入)，因此動作路徑不會在每次傳送時執行臨時的 SecretRef 重新解析。

    回應移除語意: [/tools/reactions](/zh-Hant/tools/reactions)

  </Accordion>

  <Accordion title="回覆執行緒標籤">
    Telegram 在生成的輸出中支援明確的回覆執行緒標籤：

    - `[[reply_to_current]]` 回覆觸發訊息
    - `[[reply_to:<id>]]` 回覆特定的 Telegram 訊息 ID

    `channels.telegram.replyToMode` 控制處理方式：

    - `off` (預設)
    - `first`
    - `all`

    當啟用回覆執行緒且原始 Telegram 文字或說明可用時，OpenClaw 會自動包含原生 Telegram 引用摘要。Telegram 將原生引用文字限制為 1024 個 UTF-16 程式碼單元，因此較長的訊息會從開頭開始引用，如果 Telegram 拒絕引用，則會回退為普通回覆。

    注意：`off` 會停用隱式回覆執行緒。明確的 `[[reply_to_*]]` 標籤仍會受到遵守。

  </Accordion>

  <Accordion title="Forum topics and thread behavior">
    論壇超級群組：

    - 主題會話金鑰附加 `:topic:<threadId>`
    - 回覆和輸入狀態針對主題串
    - 主題配置路徑：
      `channels.telegram.groups.<chatId>.topics.<threadId>`

    一般主題 (`threadId=1`) 的特殊情況：

    - 訊息發送會省略 `message_thread_id` (Telegram 會拒絕 `sendMessage(...thread_id=1)`)
    - 輸入狀態動作仍包含 `message_thread_id`

    主題繼承：主題條目會繼承群組設定，除非被覆蓋 (`requireMention`、`allowFrom`、`skills`、`systemPrompt`、`enabled`、`groupPolicy`)。
    `agentId` 是主題專屬的，不會從群組預設值繼承。

    **每個主題的代理路由**：透過在主題配置中設定 `agentId`，每個主題都可以路由到不同的代理。這會賦予每個主題自己獨立的工作區、記憶體和會話。範例：

    ```json5
    {
      channels: {
        telegram: {
          groups: {
            "-1001234567890": {
              topics: {
                "1": { agentId: "main" },      // General topic → main agent
                "3": { agentId: "zu" },        // Dev topic → zu agent
                "5": { agentId: "coder" }      // Code review → coder agent
              }
            }
          }
        }
      }
    }
    ```

    每個主題隨後都有自己的會話金鑰：`agent:zu:telegram:group:-1001234567890:topic:3`

    **持久化 ACP 主題綁定**：論壇主題可以透過頂層類型化的 ACP 綁定來固定 ACP 挽具會話 (`bindings[]` 搭配 `type: "acp"` 和 `match.channel: "telegram"`、`peer.kind: "group"`，以及類似 `-1001234567890:topic:42` 的主題限定 ID)。目前範圍僅限群組/超級群組中的論壇主題。請參閱 [ACP Agents](/zh-Hant/tools/acp-agents)。

    **從聊天產生的執行緒綁定 ACP 生成**：`/acp spawn <agent> --thread here|auto` 將當前主題綁定到新的 ACP 會話；後續追問會直接路由到該處。OpenClaw 會將生成確認釘選在主題內。需要 `channels.telegram.threadBindings.spawnAcpSessions=true`。

    模板上下文會公開 `MessageThreadId` 和 `IsForum`。具有 `message_thread_id` 的 DM 聊天會保留 DM 路由，但使用具備執行緒感知能力的會話金鑰。

  </Accordion>

  <Accordion title="Audio, video, and stickers">
    ### 音訊訊息

    Telegram 區分語音訊息與音訊檔案。

    - 預設：音訊檔案行為
    - 在 Agent 回覆中標記 `[[audio_as_voice]]` 以強制發送語音訊息
    - 傳入的語音訊息文字稿在 Agent 語境中會被標示為機器產生、不可信的文字；提及偵測仍會使用原始文字稿，因此受提及限制的語音訊息仍可正常運作。

    訊息動作範例：

```json5
{
  action: "send",
  channel: "telegram",
  to: "123456789",
  media: "https://example.com/voice.ogg",
  asVoice: true,
}
```

    ### 影片訊息

    Telegram 區分影片檔案與影片訊息。

    訊息動作範例：

```json5
{
  action: "send",
  channel: "telegram",
  to: "123456789",
  media: "https://example.com/video.mp4",
  asVideoNote: true,
}
```

    影片訊息不支援標題；提供的訊息文字會單獨發送。

    ### 貼圖

    傳入貼圖處理方式：

    - 靜態 WEBP：下載並處理（佔位符 `<media:sticker>`）
    - 動態 TGS：跳過
    - 影片 WEBM：跳過

    貼圖語境欄位：

    - `Sticker.emoji`
    - `Sticker.setName`
    - `Sticker.fileId`
    - `Sticker.fileUniqueId`
    - `Sticker.cachedDescription`

    貼圖快取檔案：

    - `~/.openclaw/telegram/sticker-cache.json`

    貼圖僅會被描述一次（如果可能的話）並加以快取，以減少重複的視覺模型呼叫。

    啟用貼圖動作：

```json5
{
  channels: {
    telegram: {
      actions: {
        sticker: true,
      },
    },
  },
}
```

    發送貼圖動作：

```json5
{
  action: "sticker",
  channel: "telegram",
  to: "123456789",
  fileId: "CAACAgIAAxkBAAI...",
}
```

    搜尋快取的貼圖：

```json5
{
  action: "sticker-search",
  channel: "telegram",
  query: "cat waving",
  limit: 5,
}
```

  </Accordion>

  <Accordion title="Reaction notifications">
    Telegram 回應會以 `message_reaction` 更新的形式到達（與訊息酬載分開）。

    啟用後，OpenClaw 會將系統事件加入佇列，例如：

    - `Telegram reaction added: 👍 by Alice (@alice) on msg 42`

    設定：

    - `channels.telegram.reactionNotifications`： `off | own | all`（預設值： `own`）
    - `channels.telegram.reactionLevel`： `off | ack | minimal | extensive`（預設值： `minimal`）

    備註：

    - `own` 表示僅限使用者對機器人發送訊息的回應（透過已發送訊息快取盡力而為）。
    - 回應事件仍會遵守 Telegram 存取控制（`dmPolicy`、 `allowFrom`、 `groupPolicy`、 `groupAllowFrom`）；未授權的發送者會被捨棄。
    - Telegram 不會在回應更新中提供執行緒 ID。
      - 非論壇群組會路由至群組聊天工作階段
      - 論壇群組會路由至群組一般主題工作階段（`:topic:1`），而非確切的原始主題

    適用於輪詢/Webhook 的 `allowed_updates` 會自動包含 `message_reaction`。

  </Accordion>

  <Accordion title="Ack reactions">
    當 OpenClaw 正在處理傳入訊息時， `ackReaction` 會傳送一個確認 emoji。

    解析順序：

    - `channels.telegram.accounts.<accountId>.ackReaction`
    - `channels.telegram.ackReaction`
    - `messages.ackReaction`
    - 代理程式身分 emoji 後備機制（`agents.list[].identity.emoji`，否則為 "👀"）

    備註：

    - Telegram 預期的是 unicode emoji（例如 "👀"）。
    - 使用 `""` 來停用特定頻道或帳戶的回應。

  </Accordion>

  <Accordion title="Config writes from Telegram events and commands">
    預設啟用通道配置寫入 (`configWrites !== false`)。

    Telegram 觸發的寫入包括：

    - 群組遷移事件 (`migrate_to_chat_id`) 以更新 `channels.telegram.groups`
    - `/config set` 和 `/config unset` (需要啟用指令)

    停用：

```json5
{
  channels: {
    telegram: {
      configWrites: false,
    },
  },
}
```

  </Accordion>

  <Accordion title="Long polling vs webhook">
    預設為長輪詢。若使用 Webhook 模式，請設定 `channels.telegram.webhookUrl` 和 `channels.telegram.webhookSecret`；可選 `webhookPath`、`webhookHost`、`webhookPort` (預設值 `/telegram-webhook`、`127.0.0.1`、`8787`)。

    本地監聽器綁定至 `127.0.0.1:8787`。若需公開入口，請在本機連接埠前方放置反向代理，或刻意設定 `webhookHost: "0.0.0.0"`。

    Webhook 模式會在向 Telegram 傳回 `200` 之前，驗證請求防護、Telegram 密鑰令牌及 JSON 主體。
    接著 OpenClaw 會透過與長輪詢相同的每個聊天/每個主題機器人通道非同步處理更新，因此緩慢的代理回合不會佔用 Telegram 的傳遞 ACK。

  </Accordion>

  <Accordion title="限制、重試與 CLI 目標">
    - `channels.telegram.textChunkLimit` 預設為 4000。
    - `channels.telegram.chunkMode="newline"` 偏好在長度分割前使用段落邊界（空白行）。
    - `channels.telegram.mediaMaxMb` （預設 100）限制了傳入和傳出的 Telegram 媒體大小。
    - `channels.telegram.timeoutSeconds` 覆蓋 Telegram API 用戶端逾時設定（若未設定，則應用 grammY 預設值）。
    - `channels.telegram.pollingStallThresholdMs` 預設為 `120000`；僅針對誤判的輪詢停滯重啟，將其調整為 `30000` 到 `600000` 之間。
    - 群組上下文記錄使用 `channels.telegram.historyLimit` 或 `messages.groupChat.historyLimit`（預設 50）；`0` 將其停用。
    - 回覆/引用/轉發的補充上下文目前會按接收到的內容直接傳遞。
    - Telegram 允許清單主要用於控制誰可以觸發代理程式，並非完整的補充上下文編輯邊界。
    - DM（私人訊息）記錄控制：
      - `channels.telegram.dmHistoryLimit`
      - `channels.telegram.dms["<user_id>"].historyLimit`
    - `channels.telegram.retry` 設定適用於 Telegram 發送輔助程式（CLI/工具/動作），用於處理可復原的傳出 API 錯誤。

    CLI 發送目標可以是數字聊天 ID 或使用者名稱：

```bash
openclaw message send --channel telegram --target 123456789 --message "hi"
openclaw message send --channel telegram --target @name --message "hi"
```

    Telegram 投票使用 `openclaw message poll` 並支援論壇主題：

```bash
openclaw message poll --channel telegram --target 123456789 \
  --poll-question "Ship it?" --poll-option "Yes" --poll-option "No"
openclaw message poll --channel telegram --target -1001234567890:topic:42 \
  --poll-question "Pick a time" --poll-option "10am" --poll-option "2pm" \
  --poll-duration-seconds 300 --poll-public
```

    Telegram 專屬投票旗標：

    - `--poll-duration-seconds` (5-600)
    - `--poll-anonymous`
    - `--poll-public`
    - `--thread-id` 用於論壇主題（或使用 `:topic:` 目標）

    Telegram 發送也支援：

    - `--presentation` 搭配 `buttons` 區塊，用於 `channels.telegram.capabilities.inlineButtons` 允許時的內聯鍵盤
    - `--pin` 或 `--delivery '{"pin":true}'`，以便在機器人可以在該聊天中置頂訊息時請求置頂傳送
    - `--force-document` 將傳出的圖片和 GIF 以文件形式發送，而不是壓縮的照片或動態媒體上傳

    動作閘控：

    - `channels.telegram.actions.sendMessage=false` 停用傳出的 Telegram 訊息，包括投票
    - `channels.telegram.actions.poll=false` 停用 Telegram 投票建立，同時保持一般發送功能啟用

  </Accordion>

  <Accordion title="Exec approvals in Telegram">
    Telegram 支援在審核者的 DM 中進行 exec approvals，並可選擇在原始聊天或主題中發佈提示。審核者必須是 Telegram 的數位使用者 ID。

    配置路徑：

    - `channels.telegram.execApprovals.enabled` （當至少有一個審核者可解析時自動啟用）
    - `channels.telegram.execApprovals.approvers` （退回到來自 `allowFrom` / `defaultTo` 的數位擁有者 ID）
    - `channels.telegram.execApprovals.target`: `dm` （預設） | `channel` | `both`
    - `agentFilter`, `sessionFilter`

    頻道交付會在聊天中顯示指令文字；請僅在受信任的群組/主題中啟用 `channel` 或 `both`。當提示進入論壇主題時，OpenClaw 會為審核提示和後續追蹤保留該主題。Exec approvals 預設在 30 分鐘後過期。

    內聯審核按鈕還需要 `channels.telegram.capabilities.inlineButtons` 來允許目標表面（`dm`、`group` 或 `all`）。前綴為 `plugin:` 的審核 ID 通過外掛程式審核解析；其他則首先通過 exec approvals 解析。

    參見 [Exec approvals](/zh-Hant/tools/exec-approvals)。

  </Accordion>
</AccordionGroup>

## 錯誤回覆控制

當代理程式遇到傳遞或提供者錯誤時，Telegram 可以回覆錯誤文字或將其隱藏。有兩個配置鍵控制此行為：

| 鍵                                  | 值                | 預設    | 說明                                                                           |
| ----------------------------------- | ----------------- | ------- | ------------------------------------------------------------------------------ |
| `channels.telegram.errorPolicy`     | `reply`, `silent` | `reply` | `reply` 會向聊天發送一個友善的錯誤訊息。`silent` 則完全抑制錯誤回覆。          |
| `channels.telegram.errorCooldownMs` | 數值 (毫秒)       | `60000` | 對同一聊天發送錯誤回覆之間的最小時間間隔。防止在服務中斷期間出現錯誤訊息洗版。 |

支援每個帳戶、每個群組和每個主題的覆寫（繼承方式與其他 Telegram 配置鍵相同）。

```json5
{
  channels: {
    telegram: {
      errorPolicy: "reply",
      errorCooldownMs: 120000,
      groups: {
        "-1001234567890": {
          errorPolicy: "silent", // suppress errors in this group
        },
      },
    },
  },
}
```

## 疑難排解

<AccordionGroup>
  <Accordion title="Bot does not respond to non mention group messages">

    - 如果是 `requireMention=false`，Telegram 隱私模式必須允許完全可見。
      - BotFather：`/setprivacy` -> 停用
      - 然後從群組中移除並重新加入機器人
    - 當設定預期接收非提及的群組訊息時，`openclaw channels status` 會發出警告。
    - `openclaw channels status --probe` 可以檢查明確的數字群組 ID；萬用字元 `"*"` 無法探測成員資格。
    - 快速工作階段測試：`/activation always`。

  </Accordion>

  <Accordion title="Bot not seeing group messages at all">

    - 當 `channels.telegram.groups` 存在時，必須列出群組（或包含 `"*"`）
    - 驗證機器人在群組中的成員資格
    - 檢查日誌：`openclaw logs --follow` 以查看跳過原因

  </Accordion>

  <Accordion title="Commands work partially or not at all">

    - 授權您的傳送者身分（配對和/或數字 `allowFrom`）
    - 即使群組原則是 `open`，指令授權仍然適用
    - `setMyCommands failed` 並伴隨 `BOT_COMMANDS_TOO_MUCH` 表示原生選單項目過多；請減少外掛/技能/自訂指令或停用原生選單
    - `setMyCommands failed` 並伴隨網路/擷取錯誤通常表示對 `api.telegram.org` 的 DNS/HTTPS 連線能力問題

  </Accordion>

  <Accordion title="輪詢或網路不穩定">

    - Node 22+ + 自訂 fetch/proxy 如果 AbortSignal 類型不符，可能會觸發立即中止行為。
    - 部份主機會將 `api.telegram.org` 解析為 IPv6；IPv6 出站故障可能導致 Telegram API 間歇性失敗。
    - 如果日誌包含 `TypeError: fetch failed` 或 `Network request for 'getUpdates' failed!`，OpenClaw 現在會將這些視為可復原的網路錯誤並重試。
    - 如果日誌包含 `Polling stall detected`，OpenClaw 預設會在 120 秒內未收到完成的長輪詢存活訊號後，重新啟動輪詢並重建 Telegram 傳輸。
    - 僅當長時間執行的 `getUpdates` 呼叫正常，但主機仍回報錯誤的輪詢停頓重啟時，才增加 `channels.telegram.pollingStallThresholdMs`。持續停頓通常指向主機與 `api.telegram.org` 之間的代理、DNS、IPv6 或 TLS 出站問題。
    - 在直接出站/TLS 不穩定的 VPS 主機上，透過 `channels.telegram.proxy` 路由 Telegram API 呼叫：

```yaml
channels:
  telegram:
    proxy: socks5://<user>:<password>@proxy-host:1080
```

    - Node 22+ 預設為 `autoSelectFamily=true`（WSL2 除外）與 `dnsResultOrder=ipv4first`。
    - 如果您的主機是 WSL2，或明確使用僅 IPv4 行為效果較佳，請強制選擇位址族：

```yaml
channels:
  telegram:
    network:
      autoSelectFamily: false
```

    - RFC 2544 基準範圍的解析結果（`198.18.0.0/15`）預設已允許用於 Telegram 媒體下載。如果在媒體下載期間，信任的假 IP 或透明代理將 `api.telegram.org` 重寫為其他私有/內部/特殊用途位址，您可以選擇啟用 Telegram 專用的繞過：

```yaml
channels:
  telegram:
    network:
      dangerouslyAllowPrivateNetwork: true
```

    - 每個帳戶也可以在
      `channels.telegram.accounts.<accountId>.network.dangerouslyAllowPrivateNetwork` 啟用相同選項。
    - 如果您的代理將 Telegram 媒體主機解析為 `198.18.x.x`，請先保持關閉此危險旗標。Telegram 媒體預設已允許 RFC 2544 基準範圍。

    <Warning>
      `channels.telegram.network.dangerouslyAllowPrivateNetwork` 會削弱 Telegram
      媒體的 SSRF 防護。僅在信任的、由操作員控制的代理環境中使用，例如 Clash、Mihomo 或 Surge 假 IP 路由，當它們在 RFC 2544 基準範圍之外合成私有或特殊用途的解析結果時。對於正常的公用網際網路 Telegram 存取，請保持關閉。
    </Warning>

    - 環境覆寫（暫時性）：
      - `OPENCLAW_TELEGRAM_DISABLE_AUTO_SELECT_FAMILY=1`
      - `OPENCLAW_TELEGRAM_ENABLE_AUTO_SELECT_FAMILY=1`
      - `OPENCLAW_TELEGRAM_DNS_RESULT_ORDER=ipv4first`
    - 驗證 DNS 解析結果：

```bash
dig +short api.telegram.org A
dig +short api.telegram.org AAAA
```

  </Accordion>
</AccordionGroup>

更多說明：[頻道疑難排解](/zh-Hant/channels/troubleshooting)。

## 設定參考

主要參考：[設定參考 - Telegram](/zh-Hant/gateway/config-channels#telegram)。

<Accordion title="High-signal Telegram fields">

- startup/auth: `enabled`, `botToken`, `tokenFile`, `accounts.*` (`tokenFile` must point to a regular file; symlinks are rejected)
- access control: `dmPolicy`, `allowFrom`, `groupPolicy`, `groupAllowFrom`, `groups`, `groups.*.topics.*`, top-level `bindings[]` (`type: "acp"`)
- exec approvals: `execApprovals`, `accounts.*.execApprovals`
- command/menu: `commands.native`, `commands.nativeSkills`, `customCommands`
- threading/replies: `replyToMode`
- streaming: `streaming` (preview), `streaming.preview.toolProgress`, `blockStreaming`
- formatting/delivery: `textChunkLimit`, `chunkMode`, `linkPreview`, `responsePrefix`
- media/network: `mediaMaxMb`, `timeoutSeconds`, `pollingStallThresholdMs`, `retry`, `network.autoSelectFamily`, `network.dangerouslyAllowPrivateNetwork`, `proxy`
- webhook: `webhookUrl`, `webhookSecret`, `webhookPath`, `webhookHost`
- actions/capabilities: `capabilities.inlineButtons`, `actions.sendMessage|editMessage|deleteMessage|reactions|sticker`
- reactions: `reactionNotifications`, `reactionLevel`
- errors: `errorPolicy`, `errorCooldownMs`
- writes/history: `configWrites`, `historyLimit`, `dmHistoryLimit`, `dms.*.historyLimit`

</Accordion>

<Note>多帳號優先順序：當配置了兩個或多個帳號 ID 時，設定 `channels.telegram.defaultAccount`（或包含 `channels.telegram.accounts.default`）以使預設路由明確化。否則 OpenClaw 將回退到第一個正規化的帳號 ID，並由 `openclaw doctor` 發出警告。命名帳號繼承 `channels.telegram.allowFrom` / `groupAllowFrom`，但不繼承 `accounts.default.*` 值。</Note>

## 相關

<CardGroup cols={2}>
  <Card title="配對" icon="link" href="/zh-Hant/channels/pairing">
    將 Telegram 使用者配對至閘道。
  </Card>
  <Card title="群組" icon="users" href="/zh-Hant/channels/groups">
    群組與主題允許清單行為。
  </Card>
  <Card title="通道路由" icon="route" href="/zh-Hant/channels/channel-routing">
    將傳入訊息路由至代理程式。
  </Card>
  <Card title="安全性" icon="shield" href="/zh-Hant/gateway/security">
    威脅模型與防護強化。
  </Card>
  <Card title="多代理程式路由" icon="sitemap" href="/zh-Hant/concepts/multi-agent">
    將群組和主題對應至代理程式。
  </Card>
  <Card title="疑難排解" icon="wrench" href="/zh-Hant/channels/troubleshooting">
    跨通道診斷。
  </Card>
</CardGroup>
