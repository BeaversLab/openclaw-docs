---
summary: "Telegram 機器人支援狀態、功能與配置"
read_when:
  - Working on Telegram features or webhooks
title: "Telegram"
---

# Telegram (Bot API)

狀態：透過 grammY 對機器人私訊 + 群組已達到可投入生產狀態。長輪詢為預設模式；Webhook 模式為選用。

<CardGroup cols={3}>
  <Card title="配對" icon="link" href="/zh-Hant/channels/pairing">
    Telegram 的預設私訊原則為配對模式。
  </Card>
  <Card title="管道疑難排解" icon="wrench" href="/zh-Hant/channels/troubleshooting">
    跨管道診斷與修復手冊。
  </Card>
  <Card title="Gateway configuration" icon="settings" href="/zh-Hant/gateway/configuration">
    完整的通道配置模式和範例。
  </Card>
</CardGroup>

## 快速設定

<Steps>
  <Step title="Create the bot token in BotFather">
    開啟 Telegram 並與 **@BotFather** 對話（確認帳號完全是 `@BotFather`）。

    執行 `/newbot`，跟隨提示並儲存權杖。

  </Step>

  <Step title="Configure token and DM policy">

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

    環境變數後備：`TELEGRAM_BOT_TOKEN=...` （僅限預設帳號）。
    Telegram **不**會使用 `openclaw channels login telegram` ；請在 config/env 中設定權杖，然後啟動 gateway。

  </Step>

  <Step title="啟動 gateway 並批准第一個 DM">

```bash
openclaw gateway
openclaw pairing list telegram
openclaw pairing approve telegram <CODE>
```

    配對碼會在 1 小時後過期。

  </Step>

  <Step title="將機器人加入群組">
    將機器人加入您的群組，然後設定 `channels.telegram.groups` 和 `groupPolicy` 以符合您的存取模式。
  </Step>
</Steps>

<Note>
  Token 解析順序會感知帳號。實務上，設定值優先於環境變數後備值，且 `TELEGRAM_BOT_TOKEN`
  僅適用於預設帳號。
</Note>

## Telegram 端設定

<AccordionGroup>
  <Accordion title="隱私模式和群組可見性">
    Telegram 機器人預設為**隱私模式**，這會限制它們能接收到的群組訊息。

    如果機器人必須查看所有群組訊息，請執行以下其中一項操作：

    - 透過 `/setprivacy` 停用隱私模式，或
    - 將機器人設為群組管理員。

    切換隱私模式時，請在每個群組中移除並重新加入機器人，以便 Telegram 套用變更。

  </Accordion>

  <Accordion title="群組權限">
    管理員狀態是在 Telegram 群組設定中控制的。

    管理員機器人會接收所有群組訊息，這對於始終啟用的群組行為非常有用。

  </Accordion>

  <Accordion title="Helpful BotFather toggles">

    - `/setjoingroups` 允許/拒絕新增至群組
    - `/setprivacy` 用於群組可見性行為

  </Accordion>
</AccordionGroup>

## 存取控制與啟用

<Tabs>
  <Tab title="DM policy">
    `channels.telegram.dmPolicy` 控制直接訊息存取權限：

    - `pairing` (預設)
    - `allowlist` (需要 `allowFrom` 中至少有一個發送者 ID)
    - `open` (需要 `allowFrom` 包含 `"*"`)
    - `disabled`

    `channels.telegram.allowFrom` 接受數字 Telegram 使用者 ID。接受並正規化 `telegram:` / `tg:` 前綴。
    `dmPolicy: "allowlist"` 若空著 `allowFrom` 會封鎖所有 DM，並且會被配置驗證拒絕。
    Onboarding 接受 `@username` 輸入並將其解析為數字 ID。
    如果您升級了並且您的配置包含 `@username` 許可清單條目，請執行 `openclaw doctor --fix` 來解析它們 (盡最大努力；需要 Telegram bot token)。
    如果您之前依賴 pairing-store 許可清單檔案，`openclaw doctor --fix` 可以在許可清單流程中將條目還原到 `channels.telegram.allowFrom` (例如當 `dmPolicy: "allowlist"` 尚沒有明確 ID 時)。

    對於單一擁有者的 bot，建議使用帶有明確數字 `allowFrom` ID 的 `dmPolicy: "allowlist"`，以在配置中保持存取策略的持久性 (而不是依賴先前的配對核准)。

    ### 尋找您的 Telegram 使用者 ID

    更安全 (無第三方 bot)：

    1. 私訊您的 bot。
    2. 執行 `openclaw logs --follow`。
    3. 讀取 `from.id`。

    官方 Bot API 方法：

```bash
curl "https://api.telegram.org/bot<bot_token>/getUpdates"
```

    第三方方法 (隱私性較低)：`@userinfobot` 或 `@getidsbot`。

  </Tab>

  <Tab title="群組策略與允許清單">
    兩個控制項會同時套用：

    1. **哪些群組被允許** (`channels.telegram.groups`)
       - 沒有 `groups` 設定：
         - 搭配 `groupPolicy: "open"`：任何群組都能通過群組 ID 檢查
         - 搭配 `groupPolicy: "allowlist"`（預設值）：群組會被封鎖，直到您新增 `groups` 項目（或 `"*"`）
       - 已設定 `groups`：作為允許清單（明確 ID 或 `"*"`）

    2. **群組中允許哪些發送者** (`channels.telegram.groupPolicy`)
       - `open`
       - `allowlist`（預設值）
       - `disabled`

    `groupAllowFrom` 用於群組發送者篩選。若未設定，Telegram 會回退到 `allowFrom`。
    `groupAllowFrom` 項目應為數字 Telegram 使用者 ID（`telegram:` / `tg:` 前綴會被正規化）。
    請勿將 Telegram 群組或超級群組聊天 ID 放入 `groupAllowFrom`。負數聊天 ID 屬於 `channels.telegram.groups`。
    非數字項目在發送者授權中會被忽略。
    安全邊界 (`2026.2.25+`)：群組發送者授權**不會**繼承 DM 配對儲存的核准。
    配對僅限於 DM。對於群組，請設定 `groupAllowFrom` 或每群組/每主題的 `allowFrom`。
    執行時期備註：如果 `channels.telegram` 完全缺失，執行時期會預設為封閉失敗 `groupPolicy="allowlist"`，除非明確設定 `channels.defaults.groupPolicy`。

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
      常見錯誤：`groupAllowFrom` 不是 Telegram 群組允許清單。

      - 將像 `-1001234567890` 這類負數 Telegram 群組或超級群組聊天 ID 放在 `channels.telegram.groups` 下。
      - 當您想要限制允許群組內的人員誰可以觸發機器人時，將像 `8734062810` 這類 Telegram 使用者 ID 放在 `groupAllowFrom` 下。
      - 僅當您希望允許群組的任何成員都能與機器人交談時，才使用 `groupAllowFrom: ["*"]`。
    </Warning>

  </Tab>

  <Tab title="提及行為">
    群組回覆預設需要提及。

    提及來源可以是：

    - 原生 `@botusername` 提及，或
    - 以下內容中的提及模式：
      - `agents.list[].groupChat.mentionPatterns`
      - `messages.groupChat.mentionPatterns`

    Session 層級指令切換：

    - `/activation always`
    - `/activation mention`

    這些僅更新 session 狀態。請使用 config 來持久化。

    持久化配置範例：

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

- Telegram 歸屬於閘道進程。
- 路由是確定性的：Telegram 訊息會回覆到 Telegram（模型不會選擇頻道）。
- 傳入訊息會正規化為共享頻道封包，其中包含回覆元數據和媒體佔位符。
- 群組會話由群組 ID 隔離。論壇主題會附加 `:topic:<threadId>` 以保持主題隔離。
- 私訊 (DM) 可以攜帶 `message_thread_id`；OpenClaw 使用具有執行緒感知能力的會話金鑰進行路由，並為回覆保留執行緒 ID。
- 長輪詢使用具有逐聊天/逐執行緒定序功能的 grammY 運行器。整體運行器接收端並行性使用 `agents.defaults.maxConcurrent`。
- Telegram Bot API 不支援已讀回執（`sendReadReceipts` 不適用）。

## 功能參考

<AccordionGroup>
  <Accordion title="Live stream preview (message edits)">
    OpenClaw 可以即時串流部分回覆：

    - 直接聊天：預覽訊息 + `editMessageText`
    - 群組/話題：預覽訊息 + `editMessageText`

    需求：

    - `channels.telegram.streaming` 為 `off | partial | block | progress`（預設值：`partial`）
    - `progress` 對應到 Telegram 上的 `partial`（與跨通道命名相容）
    - 舊版 `channels.telegram.streamMode` 和布林值 `streaming` 會自動對應

    對於純文字回覆：

    - DM：OpenClaw 保持同一則預覽訊息並就地執行最終編輯（不會有第二則訊息）
    - 群組/話題：OpenClaw 保持同一則預覽訊息並就地執行最終編輯（不會有第二則訊息）

    對於複雜回覆（例如媒體承載），OpenClaw 會退回到正常的最終傳遞，然後清理預覽訊息。

    預覽串流與區塊串流是分開的。當明確為 Telegram 啟用區塊串流時，OpenClaw 會跳過預覽串流以避免重複串流。

    如果原生草稿傳輸不可用或被拒絕，OpenClaw 會自動退回到 `sendMessage` + `editMessageText`。

    Telegram 專用的推理串流：

    - `/reasoning stream` 在生成期間將推理發送到即時預覽
    - 最終答案會在不包含推理文本的情況下發送

  </Accordion>

  <Accordion title="Formatting and HTML fallback">
    外寄文字使用 Telegram `parse_mode: "HTML"`。

    - 類 Markdown 的文字會被渲染為 Telegram 相容的 HTML。
    - 原始模型 HTML 會被跳脫，以減少 Telegram 解析失敗。
    - 如果 Telegram 拒絕解析後的 HTML，OpenClaw 會以純文字重試。

    連結預覽預設為啟用，並可透過 `channels.telegram.linkPreview: false` 停用。

  </Accordion>

  <Accordion title="原生指令與自訂指令">
    Telegram 指令選單註冊是在啟動時透過 `setMyCommands` 處理。

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

    - 名稱會被標準化（去除前導 `/`，轉為小寫）
    - 有效格式：`a-z`、`0-9`、`_`，長度 `1..32`
    - 自訂指令無法覆蓋原生指令
    - 衝突/重複的項目會被跳過並記錄

    備註：

    - 自訂指令僅為選單項目；它們不會自動實作行為
    - 即使未在 Telegram 選單中顯示，外掛/技能指令在輸入時仍可運作

    如果停用原生指令，內建指令會被移除。如果已設定，自訂/外掛指令可能仍會註冊。

    常見設定失敗：

    - `setMyCommands failed` 搭配 `BOT_COMMANDS_TOO_MUCH` 表示 Telegram 選單在修剪後仍然溢位；請減少外掛/技能/自訂指令或停用 `channels.telegram.commands.native`。
    - `setMyCommands failed` 搭配網路/fetch 錯誤通常表示對 `api.telegram.org` 的連出 DNS/HTTPS 被封鎖。

    ### 裝置配對指令 (`device-pair` 外掛)

    當安裝 `device-pair` 外掛時：

    1. `/pair` 產生設定碼
    2. 將程式碼貼上至 iOS 應用程式
    3. `/pair pending` 列出待處理請求（包括角色/範圍）
    4. 批准請求：
       - `/pair approve <requestId>` 用於明確批准
       - `/pair approve` 當只有一個待處理請求時
       - `/pair approve latest` 用於最近的一個

    如果裝置以變更的驗證詳細資料（例如角色/範圍/公開金鑰）重試，先前的待處理請求會被取代，新請求會使用不同的 `requestId`。請在批准前重新執行 `/pair pending`。

    更多細節：[配對](/zh-Hant/channels/pairing#pair-via-telegram-recommended-for-ios)。

  </Accordion>

  <Accordion title="內聯按鈕">
    配置鍵盤範圍：

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

    每個帳號的覆蓋設定：

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

    舊版 `capabilities: ["inlineButtons"]` 對應至 `inlineButtons: "all"`。

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

    回調點擊會以文字形式傳遞給代理程式：
    `callback_data: <value>`

  </Accordion>

  <Accordion title="適用於代理程式與自動化的 Telegram 訊息動作">
    Telegram 工具動作包括：

    - `sendMessage` (`to`、`content`、選用的 `mediaUrl`、`replyToMessageId`、`messageThreadId`)
    - `react` (`chatId`、`messageId`、`emoji`)
    - `deleteMessage` (`chatId`、`messageId`)
    - `editMessage` (`chatId`、`messageId`、`content`)
    - `createForumTopic` (`chatId`、`name`、選用的 `iconColor`、`iconCustomEmojiId`)

    頻道訊息動作提供符合人體工學的別名 (`send`、`react`、`delete`、`edit`、`sticker`、`sticker-search`、`topic-create`)。

    閘道控制：

    - `channels.telegram.actions.sendMessage`
    - `channels.telegram.actions.deleteMessage`
    - `channels.telegram.actions.reactions`
    - `channels.telegram.actions.sticker` (預設：停用)

    注意：`edit` 與 `topic-create` 目前預設為啟用，且沒有個別的 `channels.telegram.actions.*` 切換開關。
    執行階段傳送會使用現有的組態/密鑰快照 (啟動/重新載入)，因此動作路徑不會在每次傳送時執行隨機的 SecretRef 重新解析。

    移除反應的語意：[/tools/reactions](/zh-Hant/tools/reactions)

  </Accordion>

  <Accordion title="回覆串標籤">
    Telegram 支援在輸出中使用明確的回覆串標籤：

    - `[[reply_to_current]]` 回覆觸發訊息
    - `[[reply_to:<id>]]` 回覆特定的 Telegram 訊息 ID

    `channels.telegram.replyToMode` 控制處理方式：

    - `off` (預設)
    - `first`
    - `all`

    注意：`off` 會停用隱含回覆串。明確的 `[[reply_to_*]]` 標籤仍會被採用。

  </Accordion>

  <Accordion title="Forum topics and thread behavior">
    論壇超級群組：

    - 主題會話金鑰附加 `:topic:<threadId>`
    - 回覆和打字動作以主題串為目標
    - 主題配置路徑：
      `channels.telegram.groups.<chatId>.topics.<threadId>`

    一般主題 (`threadId=1`) 特殊情況：

    - 訊息發送省略 `message_thread_id`（Telegram 會拒絕 `sendMessage(...thread_id=1)`）
    - 打字動作仍然包含 `message_thread_id`

    主題繼承：除非被覆寫，否則主題項目會繼承群組設定 (`requireMention`, `allowFrom`, `skills`, `systemPrompt`, `enabled`, `groupPolicy`)。
    `agentId` 僅適用於主題，不會繼承群組預設值。

    **每個主題的代理程式路由**：透過在主題配置中設定 `agentId`，每個主題都可以路由到不同的代理程式。這賦予每個主題自己的獨立工作區、記憶體和會話。範例：

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

    **持久化 ACP 主題綁定**：論壇主題可以透過頂層類型化的 ACP 綁定來固定 ACP 駝具會話：

    - `bindings[]` 搭配 `type: "acp"` 和 `match.channel: "telegram"`

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
            channel: "telegram",
            accountId: "default",
            peer: { kind: "group", id: "-1001234567890:topic:42" },
          },
        },
      ],
      channels: {
        telegram: {
          groups: {
            "-1001234567890": {
              topics: {
                "42": {
                  requireMention: false,
                },
              },
            },
          },
        },
      },
    }
    ```

    此功能目前僅限於群組和超級群組中的論壇主題。

    **從聊天啟動綁定至串的 ACP**：

    - `/acp spawn <agent> --thread here|auto` 可以將目前的 Telegram 主題綁定到新的 ACP 會話。
    - 後續的主題訊息直接路由到已綁定的 ACP 會話（不需要 `/acp steer`）。
    - 成功綁定後，OpenClaw 會將產生確認訊息釘選在主題中。
    - 需要 `channels.telegram.threadBindings.spawnAcpSessions=true`。

    範本上下文包括：

    - `MessageThreadId`
    - `IsForum`

    DM 串行為：

    - 具有 `message_thread_id` 的私人聊天會保留 DM 路由，但使用感知串的會話金鑰/回覆目標。

  </Accordion>

  <Accordion title="音訊、影片和貼圖">
    ### 音訊訊息

    Telegram 區分語音訊息和音訊檔案。

    - 預設：音訊檔案行為
    - 在代理程式回覆中標記 `[[audio_as_voice]]` 以強制發送語音訊息

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

    Telegram 區分影片檔案和影片訊息。

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

    影片訊息不支援字幕；提供的訊息文字會單獨發送。

    ### 貼圖

    傳入貼圖處理：

    - 靜態 WEBP：已下載並處理（預留位置 `<media:sticker>`）
    - 動畫 TGS：已跳過
    - 影片 WEBM：已跳過

    貼圖內容欄位：

    - `Sticker.emoji`
    - `Sticker.setName`
    - `Sticker.fileId`
    - `Sticker.fileUniqueId`
    - `Sticker.cachedDescription`

    貼圖快取檔案：

    - `~/.openclaw/telegram/sticker-cache.json`

    貼圖僅描述一次（如果可能的話）並進行快取，以減少重複的視覺呼叫。

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

    搜尋已快取的貼圖：

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
    Telegram 反應會作為 `message_reaction` 更新到達（與訊息內容分開）。

    啟用後，OpenClaw 會將系統事件加入佇列，例如：

    - `Telegram reaction added: 👍 by Alice (@alice) on msg 42`

    設定：

    - `channels.telegram.reactionNotifications`: `off | own | all` (預設：`own`)
    - `channels.telegram.reactionLevel`: `off | ack | minimal | extensive` (預設：`minimal`)

    備註：

    - `own` 表示僅針對使用者對機器人發送訊息的反應（透過已發送訊息快取盡力而為）。
    - 反應事件仍遵守 Telegram 存取控制 (`dmPolicy`, `allowFrom`, `groupPolicy`, `groupAllowFrom`)；未授權的發送者會被丟棄。
    - Telegram 不會在反應更新中提供執行緒 ID。
      - 非論壇群組會路由到群組聊天工作階段
      - 論壇群組會路由到群組的一般主題工作階段 (`:topic:1`)，而非確切的原始主題

    用於輪詢/Webhook 的 `allowed_updates` 會自動包含 `message_reaction`。

  </Accordion>

  <Accordion title="Ack reactions">
    當 OpenClaw 正在處理傳入訊息時，`ackReaction` 會傳送確認表情符號。

    解析順序：

    - `channels.telegram.accounts.<accountId>.ackReaction`
    - `channels.telegram.ackReaction`
    - `messages.ackReaction`
    - agent identity emoji fallback (`agents.list[].identity.emoji`，否則為 "👀")

    註記：

    - Telegram 預期為 unicode 表情符號 (例如 "👀")。
    - 使用 `""` 停用頻道或帳號的反應。

  </Accordion>

  <Accordion title="來自 Telegram 事件和指令的設定寫入">
    頻道設定寫入預設為啟用 (`configWrites !== false`)。

    由 Telegram 觸發的寫入包括：

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

  <Accordion title="長輪詢 vs Webhook">
    預設：長輪詢 (long polling)。

    Webhook 模式：

    - 設定 `channels.telegram.webhookUrl`
    - 設定 `channels.telegram.webhookSecret` (設定 webhook URL 時為必填)
    - 選填 `channels.telegram.webhookPath` (預設為 `/telegram-webhook`)
    - 選填 `channels.telegram.webhookHost` (預設為 `127.0.0.1`)
    - 選填 `channels.telegram.webhookPort` (預設為 `8787`)

    Webhook 模式的預設本機監聽器綁定至 `127.0.0.1:8787`。

    如果您的公開端點不同，請在前方放置反向代理，並將 `webhookUrl` 指向公開 URL。
    當您刻意需要外部連入時，請設定 `webhookHost` (例如 `0.0.0.0`)。

  </Accordion>

  <Accordion title="限制、重試與 CLI 目標">
    - `channels.telegram.textChunkLimit` 預設為 4000。
    - `channels.telegram.chunkMode="newline"` 偏好段落邊界（空白行）進行長度分割。
    - `channels.telegram.mediaMaxMb`（預設 100）限制傳入與傳出的 Telegram 媒體大小。
    - `channels.telegram.timeoutSeconds` 覆寫 Telegram API 用戶端逾時（若未設定，則套用 grammY 預設值）。
    - 群組情境歷史記錄使用 `channels.telegram.historyLimit` 或 `messages.groupChat.historyLimit`（預設 50）；`0` 可停用。
    - DM 歷史記錄控制：
      - `channels.telegram.dmHistoryLimit`
      - `channels.telegram.dms["<user_id>"].historyLimit`
    - `channels.telegram.retry` 設定適用於 Telegram 傳送輔助程式（CLI/tools/actions），用於可復原的傳出 API 錯誤。

    CLI 傳送目標可以是數位聊天 ID 或使用者名稱：

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

    Telegram 專用投票旗標：

    - `--poll-duration-seconds`（5-600）
    - `--poll-anonymous`
    - `--poll-public`
    - `--thread-id` 用於論壇主題（或使用 `:topic:` 目標）

    Telegram 傳送也支援：

    - 當 `channels.telegram.capabilities.inlineButtons` 允許時，使用 `--buttons` 設定內聯鍵盤
    - `--force-document` 將傳出圖片和 GIF 作為文件傳送，而非壓縮相片或動態媒體上傳

    動作閘控：

    - `channels.telegram.actions.sendMessage=false` 停用傳出 Telegram 訊息，包括投票
    - `channels.telegram.actions.poll=false` 停用 Telegram 投票建立，同時保持一般傳送啟用

  </Accordion>

  <Accordion title="在 Telegram 中執行審批">
    Telegram 支援在審核者私訊中進行執行審批，並可選擇在原始聊天或主題中發布審批提示。

    配置路徑：

    - `channels.telegram.execApprovals.enabled`
    - `channels.telegram.execApprovals.approvers`
    - `channels.telegram.execApprovals.target` (`dm` | `channel` | `both`, 預設: `dm`)
    - `agentFilter`, `sessionFilter`

    審核者必須是數字形式的 Telegram 使用者 ID。當 `enabled` 為 false 或 `approvers` 為空時，Telegram 將不作為執行審批客戶端。審批請求將回退到其他已配置的審批路由或執行審批回退策略。

    傳遞規則：

    - `target: "dm"` 僅將審批提示發送至已配置的審核者私訊
    - `target: "channel"` 將提示發送回原始的 Telegram 聊天/主題
    - `target: "both"` 發送至審核者私訊以及原始聊天/主題

    只有已配置的審核者可以核准或拒絕。非審核者無法使用 `/approve`，也無法使用 Telegram 審核按鈕。

    頻道傳遞會在聊天中顯示命令文字，因此請僅在受信任的群組/主題中啟用 `channel` 或 `both`。當提示送達論壇主題時，OpenClaw 會為審批提示和審批後的後續動作保留該主題。

    內聯審批按鈕也取決於 `channels.telegram.capabilities.inlineButtons` 允許目標介面 (`dm`, `group`, 或 `all`)。

    相關文件：[執行審批](/zh-Hant/tools/exec-approvals)

  </Accordion>
</AccordionGroup>

## 疑難排解

<AccordionGroup>
  <Accordion title="Bot does not respond to non mention group messages">

    - 如果 `requireMention=false`，Telegram 隱私模式必須允許完全可見。
      - BotFather：`/setprivacy` -> Disable
      - 然後將機器人從群組中移除並重新新增
    - `openclaw channels status` 會在配置期望未提及的群組訊息時發出警告。
    - `openclaw channels status --probe` 可以檢查明確的數字群組 ID；萬用字元 `"*"` 無法被探測成員身分。
    - 快速會話測試：`/activation always`。

  </Accordion>

  <Accordion title="機器人完全看不到群組訊息">

    - 當 `channels.telegram.groups` 存在時，群組必須被列出（或包含 `"*"`）
    - 驗證機器人是否為群組成員
    - 檢查日誌：`openclaw logs --follow` 以瞭解跳過原因

  </Accordion>

  <Accordion title="指令部分無法運作或完全失效">

    - 授權您的發送者身分（配對和/或數字 `allowFrom`）
    - 即使群組原則為 `open`，指令授權仍然適用
    - 出現 `setMyCommands failed` 並伴隨 `BOT_COMMANDS_TOO_MUCH`，表示原生選單項目過多；請減少外掛/技能/自訂指令或停用原生選單
    - 出現 `setMyCommands failed` 並伴隨網路/擷取錯誤，通常表示連線至 `api.telegram.org` 時的 DNS/HTTPS 連線性問題

  </Accordion>

  <Accordion title="輪詢或網路不穩定">

    - Node 22+ + 自訂 fetch/proxy 若 AbortSignal 類型不匹配，可能會觸發立即中止行為。
    - 某些主機會優先將 `api.telegram.org` 解析為 IPv6；IPv6 出站故障會導致 Telegram API 間歇性失敗。
    - 如果日誌包含 `TypeError: fetch failed` 或 `Network request for 'getUpdates' failed!`，OpenClaw 現在會將其作為可復原的網路錯誤進行重試。
    - 在直連出站/TLS 不穩定的 VPS 主機上，將 Telegram API 呼叫透過 `channels.telegram.proxy` 路由：

```yaml
channels:
  telegram:
    proxy: socks5://<user>:<password>@proxy-host:1080
```

    - Node 22+ 預設使用 `autoSelectFamily=true`（WSL2 除外）和 `dnsResultOrder=ipv4first`。
    - 如果您的主機是 WSL2 或明確在僅 IPv4 模式下運作更好，請強制選擇位址族：

```yaml
channels:
  telegram:
    network:
      autoSelectFamily: false
```

    - 環境變數覆寫（臨時）：
      - `OPENCLAW_TELEGRAM_DISABLE_AUTO_SELECT_FAMILY=1`
      - `OPENCLAW_TELEGRAM_ENABLE_AUTO_SELECT_FAMILY=1`
      - `OPENCLAW_TELEGRAM_DNS_RESULT_ORDER=ipv4first`
    - 驗證 DNS 回應：

```bash
dig +short api.telegram.org A
dig +short api.telegram.org AAAA
```

  </Accordion>
</AccordionGroup>

更多說明：[頻道疑難排解](/zh-Hant/channels/troubleshooting)。

## Telegram 配置參考指標

主要參考：

- `channels.telegram.enabled`：啟用/停用頻道啟動。
- `channels.telegram.botToken`：Bot 權杖（BotFather）。
- `channels.telegram.tokenFile`：從常規檔案路徑讀取權杖。符號連結會被拒絕。
- `channels.telegram.dmPolicy`：`pairing | allowlist | open | disabled`（預設：pairing）。
- `channels.telegram.allowFrom`：DM 許可清單（數字 Telegram 使用者 ID）。`allowlist` 至少需要一個寄件者 ID。`open` 需要 `"*"`。`openclaw doctor --fix` 可以解析舊版 `@username` 項目為 ID，並可在許可清單遷移流程中從配對儲存檔案還原許可清單項目。
- `channels.telegram.actions.poll`：啟用或停用 Telegram 投票建立（預設值：啟用；仍需 `sendMessage`）。
- `channels.telegram.defaultTo`：當未提供明確的 `--reply-to` 時，CLI `--deliver` 使用的預設 Telegram 目標。
- `channels.telegram.groupPolicy`：`open | allowlist | disabled`（預設值：allowlist）。
- `channels.telegram.groupAllowFrom`：群組發送者允許清單（數字型 Telegram 使用者 ID）。`openclaw doctor --fix` 可將舊版 `@username` 項目解析為 ID。非數字項目在驗證時會被忽略。群組驗證不使用 DM 配對儲存備援（`2026.2.25+`）。
- 多重帳號優先順序：
  - 當設定兩個或多個帳號 ID 時，請設定 `channels.telegram.defaultAccount`（或包含 `channels.telegram.accounts.default`）以明確指定預設路由。
  - 如果兩者皆未設定，OpenClaw 將回退到第一個正規化的帳號 ID，並且 `openclaw doctor` 會發出警告。
  - `channels.telegram.accounts.default.allowFrom` 和 `channels.telegram.accounts.default.groupAllowFrom` 僅套用於 `default` 帳號。
  - 當未設定帳號層級的值時，具名帳號會繼承 `channels.telegram.allowFrom` 和 `channels.telegram.groupAllowFrom`。
  - 具名帳號不會繼承 `channels.telegram.accounts.default.allowFrom` / `groupAllowFrom`。
- `channels.telegram.groups`：各群組的預設值 + 允許清單（使用 `"*"` 設定全域預設值）。
  - `channels.telegram.groups.<id>.groupPolicy`：groupPolicy 的各群組覆寫（`open | allowlist | disabled`）。
  - `channels.telegram.groups.<id>.requireMention`：提及閘控預設值。
  - `channels.telegram.groups.<id>.skills`：技能過濾器（省略 = 所有技能，空白 = 無）。
  - `channels.telegram.groups.<id>.allowFrom`：每群組發送者允許清單覆寫。
  - `channels.telegram.groups.<id>.systemPrompt`：群組額外的系統提示詞。
  - `channels.telegram.groups.<id>.enabled`：當 `false` 時停用群組。
  - `channels.telegram.groups.<id>.topics.<threadId>.*`：每主題覆寫（群組欄位 + 僅限主題的 `agentId`）。
  - `channels.telegram.groups.<id>.topics.<threadId>.agentId`：將此主題路由至特定代理程式（覆寫群組層級和綁定路由）。
- `channels.telegram.groups.<id>.topics.<threadId>.groupPolicy`：groupPolicy 的每主題覆寫（`open | allowlist | disabled`）。
- `channels.telegram.groups.<id>.topics.<threadId>.requireMention`：每主題提及閘控覆寫。
- `bindings[]` 中的頂層 `type: "acp"` 與 canonical topic id `chatId:topic:topicId` 在 `match.peer.id` 中：持續性 ACP topic 綁定欄位（請參閱 [ACP Agents](/zh-Hant/tools/acp-agents#channel-specific-settings)）。
- `channels.telegram.direct.<id>.topics.<threadId>.agentId`：將 DM 主題路由到特定的代理程式（與論壇主題的行為相同）。
- `channels.telegram.execApprovals.enabled`：啟用 Telegram 作為此帳戶的聊天式執行核准用戶端。
- `channels.telegram.execApprovals.approvers`：獲准核准或拒絕執行請求的 Telegram 使用者 ID。啟用執行核准時為必填。
- `channels.telegram.execApprovals.target`：`dm | channel | both`（預設值：`dm`）。`channel` 和 `both` 會在存在時保留原始 Telegram 主題。
- `channels.telegram.execApprovals.agentFilter`：轉發的核准提示的可選代理 ID 篩選器。
- `channels.telegram.execApprovals.sessionFilter`：轉發的核准提示的可選會話金鑰篩選器（子字串或正則表示式）。
- `channels.telegram.accounts.<account>.execApprovals`：Telegram 執行核准路由與核准者授權的逐帳號覆寫。
- `channels.telegram.capabilities.inlineButtons`：`off | dm | group | all | allowlist`（預設：allowlist）。
- `channels.telegram.accounts.<account>.capabilities.inlineButtons`：逐帳號覆寫。
- `channels.telegram.commands.nativeSkills`：啟用/停用 Telegram 原生技能指令。
- `channels.telegram.replyToMode`：`off | first | all`（預設：`off`）。
- `channels.telegram.textChunkLimit`：出站區塊大小（字元）。
- `channels.telegram.chunkMode`：`length`（預設）或 `newline` 在空白行（段落邊界）進行分割，然後再依據長度分塊。
- `channels.telegram.linkPreview`：切換外寄訊息的連結預覽（預設：true）。
- `channels.telegram.streaming`：`off | partial | block | progress`（即時串流預覽；預設：`partial`；`progress` 對應至 `partial`；`block` 為舊版預覽模式相容性）。Telegram 預覽串流使用單一則預覽訊息並就地編輯。
- `channels.telegram.mediaMaxMb`：入站/出站 Telegram 媒體上限（MB，預設：100）。
- `channels.telegram.retry`：在可恢復的輸出 API 錯誤上，針對 Telegram 發送輔助程式（CLI/tools/actions）的重試原則（attempts、minDelayMs、maxDelayMs、jitter）。
- `channels.telegram.network.autoSelectFamily`：覆寫 Node autoSelectFamily（true=啟用，false=停用）。在 Node 22+ 上預設為啟用，WSL2 則預設為停用。
- `channels.telegram.network.dnsResultOrder`：覆寫 DNS 結果順序（`ipv4first` 或 `verbatim`）。在 Node 22+ 上預設為 `ipv4first`。
- `channels.telegram.proxy`：Bot API 呼叫的 Proxy URL (SOCKS/HTTP)。
- `channels.telegram.webhookUrl`：啟用 webhook 模式（需要 `channels.telegram.webhookSecret`）。
- `channels.telegram.webhookSecret`：webhook secret（設定 webhookUrl 時必填）。
- `channels.telegram.webhookPath`：本機 webhook 路徑（預設 `/telegram-webhook`）。
- `channels.telegram.webhookHost`：本地 webhook 綁定主機（預設 `127.0.0.1`）。
- `channels.telegram.webhookPort`：本地 webhook 綁定連接埠（預設 `8787`）。
- `channels.telegram.actions.reactions`：管制 Telegram 工具反應。
- `channels.telegram.actions.sendMessage`：管制 Telegram 工具訊息發送。
- `channels.telegram.actions.deleteMessage`：管制 Telegram 工具訊息刪除。
- `channels.telegram.actions.sticker`：管制 Telegram 貼圖動作 — 發送與搜尋（預設：false）。
- `channels.telegram.reactionNotifications`：`off | own | all` — 控制哪些反應會觸發系統事件（未設定時預設為 `own`）。
- `channels.telegram.reactionLevel`：`off | ack | minimal | extensive` — 控制代理的反應能力（未設定時預設為 `minimal`）。

- [配置參考 - Telegram](/zh-Hant/gateway/configuration-reference#telegram)

Telegram 特有的高權重欄位：

- startup/auth: `enabled`, `botToken`, `tokenFile`, `accounts.*` (`tokenFile` 必須指向一個常規檔案；符號連結會被拒絕)
- access control: `dmPolicy`, `allowFrom`, `groupPolicy`, `groupAllowFrom`, `groups`, `groups.*.topics.*`, 頂層 `bindings[]` (`type: "acp"`)
- exec approvals: `execApprovals`, `accounts.*.execApprovals`
- command/menu: `commands.native`, `commands.nativeSkills`, `customCommands`
- threading/replies: `replyToMode`
- streaming: `streaming` (預覽), `blockStreaming`
- formatting/delivery: `textChunkLimit`, `chunkMode`, `linkPreview`, `responsePrefix`
- media/network: `mediaMaxMb`, `timeoutSeconds`, `retry`, `network.autoSelectFamily`, `proxy`
- webhook: `webhookUrl`, `webhookSecret`, `webhookPath`, `webhookHost`
- actions/capabilities: `capabilities.inlineButtons`, `actions.sendMessage|editMessage|deleteMessage|reactions|sticker`
- reactions: `reactionNotifications`, `reactionLevel`
- 寫入/歷史： `configWrites`, `historyLimit`, `dmHistoryLimit`, `dms.*.historyLimit`

## 相關

- [配對](/zh-Hant/channels/pairing)
- [通道路由](/zh-Hant/channels/channel-routing)
- [多代理路由](/zh-Hant/concepts/multi-agent)
- [疑難排解](/zh-Hant/channels/troubleshooting)

import footerZhHant from "/components/footer/zh-Hant.mdx";

<footerZhHant />
