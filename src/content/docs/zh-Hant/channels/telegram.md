---
summary: "Telegram bot 支援狀態、功能和配置"
read_when:
  - Working on Telegram features or webhooks
title: "Telegram"
---

# Telegram (Bot API)

狀態：透過 grammY 支援機器人私訊 (DM) 與群組的正式生產版本。長輪詢 (Long polling) 為預設模式；Webhook 模式為選用。

<CardGroup cols={3}>
  <Card title="配對" icon="link" href="/zh-Hant/channels/pairing">
    Telegram 的預設 DM 原則為配對模式。
  </Card>
  <Card title="頻道疑難排解" icon="wrench" href="/zh-Hant/channels/troubleshooting">
    跨頻道診斷與修復手冊。
  </Card>
  <Card title="閘道配置" icon="settings" href="/zh-Hant/gateway/configuration">
    完整的頻道配置範例與模式。
  </Card>
</CardGroup>

## 快速設定

<Steps>
  <Step title="在 BotFather 中建立 Bot Token">
    開啟 Telegram 並與 **@BotFather** 對話（請確認帳號確切為 `@BotFather`）。

    執行 `/newbot`，依照提示操作，並儲存 Token。

  </Step>

  <Step title="設定 Token 與 DM 原則">

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

    環境變數後備： `TELEGRAM_BOT_TOKEN=...`（僅限預設帳號）。
    Telegram **不**使用 `openclaw channels login telegram`；請在 config/env 中設定 token，然後啟動閘道。

  </Step>

  <Step title="啟動閘道並批准首次 DM">

```bash
openclaw gateway
openclaw pairing list telegram
openclaw pairing approve telegram <CODE>
```

    配對代碼將在 1 小時後過期。

  </Step>

  <Step title="將 Bot 加入群組">
    將 Bot 加入您的群組，然後設定 `channels.telegram.groups` 和 `groupPolicy` 以符合您的存取模型。
  </Step>
</Steps>

<Note>Token 解析順序會考量帳號。實務上，設定值優先於環境變數後備，而 `TELEGRAM_BOT_TOKEN` 僅適用於預設帳號。</Note>

## Telegram 端設定

<AccordionGroup>
  <Accordion title="隱私模式和群組可見性">
    Telegram 機器人預設為 **隱私模式**，這限制了它們能接收的群組訊息。

    如果機器人必須查看所有群組訊息，請執行以下任一操作：

    - 透過 `/setprivacy` 停用隱私模式，或
    - 將機器人設為群組管理員。

    切換隱私模式時，請在各個群組中移除並重新加入機器人，以便 Telegram 套用變更。

  </Accordion>

  <Accordion title="群組權限">
    管理員狀態是在 Telegram 群組設定中控制的。

    管理員機器人會接收所有群組訊息，這對於始終啟用的群組行為非常有用。

  </Accordion>

  <Accordion title="實用的 BotFather 選項">

    - `/setjoingroups` 以允許/拒絕加入群組
    - `/setprivacy` 用於群組可見性行為

  </Accordion>
</AccordionGroup>

## 存取控制與啟用

<Tabs>
  <Tab title="DM policy">
    `channels.telegram.dmPolicy` 控制直接訊息存取權限：

    - `pairing` (預設)
    - `allowlist` (需要在 `allowFrom` 中至少有一個發送者 ID)
    - `open` (要求 `allowFrom` 包含 `"*"`)
    - `disabled`

    `channels.telegram.allowFrom` 接受數字 Telegram 使用者 ID。`telegram:` / `tg:` 前綴會被接受並正規化。
    `dmPolicy: "allowlist"` 若 `allowFrom` 為空則會封鎖所有 DM，且會被配置驗證拒絕。
    安裝設定僅要求數字使用者 ID。
    如果您升級後且配置包含 `@username` 白名單條目，請執行 `openclaw doctor --fix` 以解析它們 (盡力而為；需要 Telegram bot token)。
    如果您先前依賴 pairing-store 白名單檔案，`openclaw doctor --fix` 可以在白名單流程中將條目還原至 `channels.telegram.allowFrom` (例如當 `dmPolicy: "allowlist"` 尚無明確 ID 時)。

    對於單一擁有者的 bot，建議優先使用 `dmPolicy: "allowlist"` 並搭配明確的數字 `allowFrom` ID，以確保配置中的存取政策持久有效 (而非依賴先前的配對核准)。

    常見誤解：DM 配對核准並不代表「此發送者在所有地方都已授權」。
    配對僅授予 DM 存取權。群組發送者授權仍來自於明確的配置白名單。
    如果您希望「我只需授權一次，DM 和群組指令都能運作」，請將您的數字 Telegram 使用者 ID 放入 `channels.telegram.allowFrom` 中。

    ### 尋找您的 Telegram 使用者 ID

    較安全 (無第三方 bot)：

    1. 私訊您的 bot。
    2. 執行 `openclaw logs --follow`。
    3. 讀取 `from.id`。

    官方 Bot API 方法：

```bash
curl "https://api.telegram.org/bot<bot_token>/getUpdates"
```

    第三方方法 (隱私性較低)：`@userinfobot` 或 `@getidsbot`。

  </Tab>

  <Tab title="群組原則與允許清單">
    兩個控制項會共同作用：

    1. **允許哪些群組** (`channels.telegram.groups`)
       - 沒有 `groups` 設定：
         - 使用 `groupPolicy: "open"`：任何群組都可以通過群組 ID 檢查
         - 使用 `groupPolicy: "allowlist"` (預設)：群組會被阻擋，直到您新增 `groups` 項目 (或 `"*"`)
       - 已設定 `groups`：作為允許清單 (明確 ID 或 `"*"`)

    2. **群組中允許哪些寄件者** (`channels.telegram.groupPolicy`)
       - `open`
       - `allowlist` (預設)
       - `disabled`

    `groupAllowFrom` 用於群組寄件者過濾。如果未設定，Telegram 會回退到 `allowFrom`。
    `groupAllowFrom` 項目應為數字 Telegram 使用者 ID (`telegram:` / `tg:` 前綴會被正規化)。
    請勿將 Telegram 群組或超級群組聊天 ID 放入 `groupAllowFrom`。負數聊天 ID 屬於 `channels.telegram.groups`。
    非數字項目會在寄件者授權時被忽略。
    安全邊界 (`2026.2.25+`)：群組寄件者授權**不**繼承 DM 配對儲存庫的核准。
    配對僅限 DM。對於群組，請設定 `groupAllowFrom` 或逐群組/逐主題的 `allowFrom`。
    如果 `groupAllowFrom` 未設定，Telegram 會回退到設定檔 `allowFrom`，而不是配對儲存庫。
    單一擁有者機器人的實用模式：在 `channels.telegram.allowFrom` 中設定您的使用者 ID，保留 `groupAllowFrom` 未設定，並在 `channels.telegram.groups` 下允許目標群組。
    執行時期注意：如果完全缺少 `channels.telegram`，執行時期預設為 fail-closed `groupPolicy="allowlist"`，除非明確設定 `channels.defaults.groupPolicy`。

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
      常見錯誤：`groupAllowFrom` 不是 Telegram 群組的允許清單。

      - 將負數 Telegram 群組或超級群組聊天 ID (如 `-1001234567890`) 放在 `channels.telegram.groups` 下。
      - 當您想要限制允許群組中哪些人可以觸發機器人時，將 Telegram 使用者 ID (如 `8734062810`) 放在 `groupAllowFrom` 下。
      - 僅當您希望允許群組的任何成員都能與機器人對話時，才使用 `groupAllowFrom: ["*"]`。
    </Warning>

  </Tab>

  <Tab title="提及行為">
    群組回覆預設需要提及。

    提及可以來自：

    - 原生 `@botusername` 提及，或
    - 以下位置的提及模式：
      - `agents.list[].groupChat.mentionPatterns`
      - `messages.groupChat.mentionPatterns`

    層級命令切換：

    - `/activation always`
    - `/activation mention`

    這些僅更新會話狀態。請使用設定以保持持久性。

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

- Telegram 歸屬於 gateway 程序。
- 路由是確定性的：Telegram 的入站訊息會回覆到 Telegram（模型不選擇通道）。
- 入站訊息會正規化為共享通道封包，其中包含回詮中繼資料和媒體預留位置。
- 群組會話按群組 ID 隔離。論壇主題附加 `:topic:<threadId>` 以保持主題隔離。
- DM 訊息可以攜帶 `message_thread_id`；OpenClaw 使用具備執行緒感知能力的會話金鑰來路由它們，並為回覆保留執行緒 ID。
- 長輪詢使用 grammY 運行器，並進行逐聊天/逐執行緒的排序。整體運行器接收併發度使用 `agents.defaults.maxConcurrent`。
- 長輪詢看門狗重新啟動觸發器預設在 120 秒內沒有完成 `getUpdates` 存活檢查後觸發。僅當您的部署在長時間運行的工作期間仍然出現錯誤的輪詢停滯重新啟動時，才增加 `channels.telegram.pollingStallThresholdMs`。該值以毫秒為單位，允許範圍從 `30000` 到 `600000`；支援每個帳號的覆蓋設定。
- Telegram Bot API 不支援已讀回執 (`sendReadReceipts` 不適用)。

## 功能參考

<AccordionGroup>
  <Accordion title="即時串流預覽（訊息編輯）">
    OpenClaw 可以即時串流部分回覆：

    - 直接聊天：預覽訊息 + `editMessageText`
    - 群組/主題：預覽訊息 + `editMessageText`

    需求：

    - `channels.telegram.streaming` 為 `off | partial | block | progress`（預設：`partial`）
    - `progress` 在 Telegram 上對應至 `partial`（相容跨頻道命名）
    - 舊版 `channels.telegram.streamMode` 和布林值 `streaming` 值會自動對應

    對於純文字回覆：

    - DM：OpenClaw 保持相同的預覽訊息並就地執行最終編輯（不會有第二則訊息）
    - 群組/主題：OpenClaw 保持相同的預覽訊息並就地執行最終編輯（不會有第二則訊息）

    對於複雜回覆（例如媒體承載），OpenClaw 會回退至正常的最終傳送，然後清理預覽訊息。

    預覽串流與區塊串流是分開的。當為 Telegram 明確啟用區塊串流時，OpenClaw 會跳過預覽串流以避免重複串流。

    如果原生的草稿傳輸不可用/被拒絕，OpenClaw 會自動回退至 `sendMessage` + `editMessageText`。

    Telegram 專用的推理串流：

    - `/reasoning stream` 在生成時將推理傳送到即時預覽
    - 最終答案會在不包含推理文字的情況下傳送

  </Accordion>

  <Accordion title="格式與 HTML 回退">
    外寄文字使用 Telegram `parse_mode: "HTML"`。

    - 類 Markdown 的文字會被轉譯為 Telegram 安全的 HTML。
    - 原始模型 HTML 會被跳脫，以減少 Telegram 解析失敗。
    - 如果 Telegram 拒絕解析後的 HTML，OpenClaw 會以純文字重試。

    連結預覽預設為啟用，並可透過 `channels.telegram.linkPreview: false` 停用。

  </Accordion>

  <Accordion title="原生指令和自訂指令">
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

    - 名稱會被正規化（移除前導 `/`，轉為小寫）
    - 有效格式：`a-z`、`0-9`、`_`，長度 `1..32`
    - 自訂指令無法覆寫原生指令
    - 衝突/重複項目會被跳過並記錄

    備註：

    - 自訂指令僅為選單項目；它們不會自動實作行為
    - 即使未在 Telegram 選單中顯示，外掛/技能指令在輸入時仍可運作

    如果停用原生指令，內建指令會被移除。若有配置，自訂/外掛指令仍可能註冊。

    常見設定失敗：

    - `setMyCommands failed` 搭配 `BOT_COMMANDS_TOO_MUCH` 表示 Telegram 選單在修剪後仍然溢位；請減少外掛/技能/自訂指令或停用 `channels.telegram.commands.native`。
    - `setMyCommands failed` 搭配網路/fetch 錯誤通常表示對 `api.telegram.org` 的向外 DNS/HTTPS 連線被封鎖。

    ### 裝置配對指令 (`device-pair` 外掛)

    當安裝 `device-pair` 外掛時：

    1. `/pair` 產生設定代碼
    2. 將代碼貼至 iOS 應用程式
    3. `/pair pending` 列出待處理請求（包括角色/範圍）
    4. 核准請求：
       - `/pair approve <requestId>` 用於明確核准
       - `/pair approve` 當只有一個待處理請求時
       - `/pair approve latest` 用於最近的一個

    設定代碼帶有一個短期有效的啟動權杖。內建的啟動移交會將主要節點權杖保留在 `scopes: []`；任何被移交的操作員權杖仍受限於 `operator.approvals`、`operator.read`、`operator.talk.secrets` 和 `operator.write`。啟動範圍檢查會加上角色前綴，因此操作員白名單僅滿足操作員請求；非操作員角色仍需要在其自己的角色前綴下的範圍。

    如果裝置以變更的驗證詳細資料（例如角色/範圍/公開金鑰）重試，先前的待處理請求會被取代，新請求會使用不同的 `requestId`。請在核准前重新執行 `/pair pending`。

    更多細節：[配對](/zh-Hant/channels/pairing#pair-via-telegram-recommended-for-ios)。

  </Accordion>

  <Accordion title="Inline buttons">
    設定內聯鍵盤範圍：

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

    每個帳號的覆寫設定：

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
    - `allowlist` (預設)

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

    回調點擊會以文字形式傳遞給 Agent：
    `callback_data: <value>`

  </Accordion>

  <Accordion title="代理和自動化的 Telegram 訊息動作">
    Telegram 工具動作包括：

    - `sendMessage` (`to`、 `content`、選用 `mediaUrl`、 `replyToMessageId`、 `messageThreadId`)
    - `react` (`chatId`、 `messageId`、 `emoji`)
    - `deleteMessage` (`chatId`、 `messageId`)
    - `editMessage` (`chatId`、 `messageId`、 `content`)
    - `createForumTopic` (`chatId`、 `name`、選用 `iconColor`、 `iconCustomEmojiId`)

    頻道訊息動作公開了符合人體工學的別名 (`send`、 `react`、 `delete`、 `edit`、 `sticker`、 `sticker-search`、 `topic-create`)。

    閘道控制：

    - `channels.telegram.actions.sendMessage`
    - `channels.telegram.actions.deleteMessage`
    - `channels.telegram.actions.reactions`
    - `channels.telegram.actions.sticker` (預設：停用)

    注意：`edit` 和 `topic-create` 目前預設為啟用，且沒有個別的 `channels.telegram.actions.*` 開關。
    執行時期傳送使用啟用中的設定/密鑰快照 (啟動/重新載入)，因此動作路徑不會在每次傳送時執行臨時 SecretRef 重新解析。

    反應移除語意：[/tools/reactions](/zh-Hant/tools/reactions)

  </Accordion>

  <Accordion title="Reply threading tags">
    Telegram 支援在生成的輸出中使用明確的回覆串連標籤：

    - `[[reply_to_current]]` 回覆觸發訊息
    - `[[reply_to:<id>]]` 回覆特定的 Telegram 訊息 ID

    `channels.telegram.replyToMode` 控制處理方式：

    - `off` (預設)
    - `first`
    - `all`

    註：`off` 會停用隱含的回覆串連。明確的 `[[reply_to_*]]` 標籤仍會受到採用。

  </Accordion>

  <Accordion title="論壇主題與執行緒行為">
    論壇超級群組：

    - 主題會話金鑰附加 `:topic:<threadId>`
    - 回覆與輸入狀態以主題執行緒為目標
    - 主題配置路徑：
      `channels.telegram.groups.<chatId>.topics.<threadId>`

    一般主題 (`threadId=1`) 特殊情況：

    - 訊息發送省略 `message_thread_id` (Telegram 拒絕 `sendMessage(...thread_id=1)`)
    - 輸入動作仍包含 `message_thread_id`

    主題繼承：主題項目會繼承群組設定，除非被覆寫 (`requireMention`, `allowFrom`, `skills`, `systemPrompt`, `enabled`, `groupPolicy`)。
    `agentId` 僅限主題使用，不繼承群組預設值。

    **每個主題的代理路由**：每個主題可以透過在主題配置中設定 `agentId` 來路由到不同的代理。這讓每個主題都有自己獨立的工作區、記憶體與會話。範例：

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

    每個主題隨後會有自己的會話金鑰：`agent:zu:telegram:group:-1001234567890:topic:3`

    **持續性 ACP 主題綁定**：論壇主題可以透過頂層類型的 ACP 綁定來釘選 ACP harness 會話：

    - `bindings[]` 搭配 `type: "acp"` 與 `match.channel: "telegram"`

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

    此功能目前僅限於群組與超級群組中的論壇主題。

    **從聊天產生的執行緒綁定 ACP**：

    - `/acp spawn <agent> --thread here|auto` 可以將目前的 Telegram 主題綁定到新的 ACP 會話。
    - 後續的主題訊息會直接路由到綁定的 ACP 會話 (無需 `/acp steer`)。
    - OpenClaw 會在成功綁定後於主題內釘選產生確認訊息。
    - 需要 `channels.telegram.threadBindings.spawnAcpSessions=true`。

    樣板內容包括：

    - `MessageThreadId`
    - `IsForum`

    DM 執行緒行為：

    - 帶有 `message_thread_id` 的私人聊天會保留 DM 路由，但使用具執行緒感知能力的會話金鑰/回覆目標。

  </Accordion>

  <Accordion title="音訊、視訊和貼圖">
    ### 音訊訊息

    Telegram 區分語音備忘錄與音訊檔案。

    - 預設：音訊檔案行為
    - 在代理人回覆中使用標籤 `[[audio_as_voice]]` 以強制發送語音備忘錄

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

    ### 視訊訊息

    Telegram 區分視訊檔案與視訊備忘錄。

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

    視訊備忘錄不支援說明文字；提供的訊息文字會單獨發送。

    ### 貼圖

    傳入貼圖的處理：

    - 靜態 WEBP：下載並處理（預留位置 `<media:sticker>`）
    - 動畫 TGS：跳過
    - 視訊 WEBM：跳過

    貼圖內容欄位：

    - `Sticker.emoji`
    - `Sticker.setName`
    - `Sticker.fileId`
    - `Sticker.fileUniqueId`
    - `Sticker.cachedDescription`

    貼圖快取檔案：

    - `~/.openclaw/telegram/sticker-cache.json`

    貼圖會（盡可能）被描述一次並快取，以減少重複的視覺呼叫。

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
    Telegram 反應會以 `message_reaction` 更新形式到達（與訊息內容分開）。

    啟用後，OpenClaw 會將系統事件加入佇列，例如：

    - `Telegram reaction added: 👍 by Alice (@alice) on msg 42`

    設定：

    - `channels.telegram.reactionNotifications`: `off | own | all` (預設: `own`)
    - `channels.telegram.reactionLevel`: `off | ack | minimal | extensive` (預設: `minimal`)

    備註：

    - `own` 表示僅限用戶對機器人所發送訊息的反應（透過已發送訊息快取盡力而為）。
    - 反應事件仍會遵守 Telegram 存取控制 (`dmPolicy`, `allowFrom`, `groupPolicy`, `groupAllowFrom`)；未授權的發送者會被丟棄。
    - Telegram 不會在反應更新中提供執行緒 ID。
      - 非論壇群組會路由至群組聊天階段
      - 論壇群組會路由至群組一般主題階段 (`:topic:1`)，而非確切的原始主題

    `allowed_updates` 用於 polling/webhook 會自動包含 `message_reaction`。

  </Accordion>

  <Accordion title="Ack reactions">
    當 OpenClaw 正在處理傳入訊息時，`ackReaction` 會發送一個確認表情符號。

    解析順序：

    - `channels.telegram.accounts.<accountId>.ackReaction`
    - `channels.telegram.ackReaction`
    - `messages.ackReaction`
    - 代理身分表情符號後備 (`agents.list[].identity.emoji`, 否則為 "👀")

    備註：

    - Telegram 預期 unicode 表情符號 (例如 "👀")。
    - 使用 `""` 以停用頻道或帳戶的反應功能。

  </Accordion>

  <Accordion title="來自 Telegram 事件和指令的設定寫入">
    頻道設定寫入預設為啟用 (`configWrites !== false`)。

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

  <Accordion title="長輪詢 vs webhook">
    預設：長輪詢 (long polling)。

    Webhook 模式：

    - 設定 `channels.telegram.webhookUrl`
    - 設定 `channels.telegram.webhookSecret` (設定 webhook URL 時必須)
    - 選用 `channels.telegram.webhookPath` (預設 `/telegram-webhook`)
    - 選用 `channels.telegram.webhookHost` (預設 `127.0.0.1`)
    - 選用 `channels.telegram.webhookPort` (預設 `8787`)

    Webhook 模式的預設本地監聽器綁定至 `127.0.0.1:8787`。

    如果您的公開端點不同，請在前方放置反向代理並將 `webhookUrl` 指向公開 URL。
    當您刻意需要外部流入時，請設定 `webhookHost` (例如 `0.0.0.0`)。

  </Accordion>

  <Accordion title="限制、重試與 CLI 目標">
    - `channels.telegram.textChunkLimit` 預設為 4000。
    - `channels.telegram.chunkMode="newline"` 偏好在長度分割前使用段落邊界（空行）。
    - `channels.telegram.mediaMaxMb`（預設 100）限制傳入和傳出的 Telegram 媒體大小。
    - `channels.telegram.timeoutSeconds` 覆寫 Telegram API 客戶端逾時（若未設定，則套用 grammY 預設值）。
    - `channels.telegram.pollingStallThresholdMs` 預設為 `120000`；僅針對誤判的輪詢停滯重啟，才需在 `30000` 到 `600000` 之間調整。
    - 群組上下文歷史使用 `channels.telegram.historyLimit` 或 `messages.groupChat.historyLimit`（預設 50）；`0` 則停用。
    - 回覆/引用/轉發的補充上下文目前會照實傳遞。
    - Telegram 白名單主要控制誰可以觸發代理程式，而非完整的補充上下文編輯邊界。
    - DM 歷史控制：
      - `channels.telegram.dmHistoryLimit`
      - `channels.telegram.dms["<user_id>"].historyLimit`
    - `channels.telegram.retry` 設定套用於 Telegram 傳送輔助程式（CLI/工具/動作），用於可復原的傳出 API 錯誤。

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

    Telegram 專用的投票旗標：

    - `--poll-duration-seconds` (5-600)
    - `--poll-anonymous`
    - `--poll-public`
    - `--thread-id` 用於論壇主題（或使用 `:topic:` 目標）

    Telegram 傳送也支援：

    - `--buttons` 用於內聯鍵盤，當 `channels.telegram.capabilities.inlineButtons` 允許時
    - `--force-document` 將傳出圖片和 GIF 以文件形式傳送，而非壓縮的照片或動態媒體上傳

    動作閘控：

    - `channels.telegram.actions.sendMessage=false` 停用傳出 Telegram 訊息，包括投票
    - `channels.telegram.actions.poll=false` 停用 Telegram 投票建立，同時保留一般傳送功能

  </Accordion>

  <Accordion title="Telegram 中的執行核准">
    Telegram 支援在核准者的私訊（DM）中進行執行核准，並可選擇在原始聊天或主題中發布核准提示。

    配置路徑：

    - `channels.telegram.execApprovals.enabled`
    - `channels.telegram.execApprovals.approvers`（可選；若可能，會回退到從 `allowFrom` 推斷出的數位擁有者 ID 和直接 `defaultTo`）
    - `channels.telegram.execApprovals.target`（`dm` | `channel` | `both`，預設：`dm`）
    - `agentFilter`、`sessionFilter`

    核准者必須是 Telegram 的數位使用者 ID。當 `enabled` 未設定或為 `"auto"` 且至少能解析出一個核准者（無論是從 `execApprovals.approvers` 還是從帳戶的數位擁有者配置（`allowFrom` 和私訊 `defaultTo`））時，Telegram 會自動啟用原生執行核准。設定 `enabled: false` 可明確停用 Telegram 作為原生核准客戶端。否則，核准請求會回退到其他已配置的核准路由或執行核准回退策略。

    Telegram 也會呈現其他聊天管道使用的共用核准按鈕。Telegram 原生適配器主要增加了核准者私訊路由、頻道/主題分發，以及交付前的輸入提示。
    當這些按鈕存在時，它們是主要的核准使用者體驗（UX）；僅當工具結果顯示
    聊天核准不可用或手動核准是唯一途徑時，OpenClaw 才應包含手動
    `/approve` 指令。

    交付規則：

    - `target: "dm"` 僅將核准提示發送給已解析的核准者私訊
    - `target: "channel"` 將提示發回原始 Telegram 聊天/主題
    - `target: "both"` 發送給核准者私訊和原始聊天/主題

    只有已解析的核准者可以核准或拒絕。非核准者無法使用 `/approve`，也無法使用 Telegram 核准按鈕。

    核准解析行為：

    - 前綴為 `plugin:` 的 ID 始終透過外掛程式核准解析。
    - 其他核准 ID 先嘗試 `exec.approval.resolve`。
    - 如果 Telegram 也獲授權進行外掛程式核准，且閘道表示
      執行核准未知/已過期，Telegram 會透過
      `plugin.approval.resolve` 重試一次。
    - 真正的執行核准拒絕/錯誤不會無聲地回退到外掛程式
      核准解析。

    頻道交付會在聊天中顯示指令文字，因此僅在受信任的群組/主題中啟用 `channel` 或 `both`。當提示出現在論壇主題中時，OpenClaw 會為核准提示和核准後的後續追蹤保留該主題。執行核准預設在 30 分鐘後過期。

    內聯核准按鈕也取決於 `channels.telegram.capabilities.inlineButtons` 允許目標介面（`dm`、`group` 或 `all`）。

    相關文件：[執行核准](/zh-Hant/tools/exec-approvals)

  </Accordion>
</AccordionGroup>

## 錯誤回覆控制

當代理程式遇到傳遞或提供者錯誤時，Telegram 可以回覆錯誤文字或將其隱藏。有兩個配置鍵控制此行為：

| 鍵                                  | 值                | 預設    | 說明                                                                           |
| ----------------------------------- | ----------------- | ------- | ------------------------------------------------------------------------------ |
| `channels.telegram.errorPolicy`     | `reply`, `silent` | `reply` | `reply` 會向聊天發送友好的錯誤訊息。`silent` 則完全隱藏錯誤回覆。              |
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

    - 如果 `requireMention=false`，Telegram 隱私模式必須允許完整可見性。
      - BotFather: `/setprivacy` -> Disable
      - 然後將機器人從群組中移除並重新加入
    - 當配置預期未提及的群組訊息時，`openclaw channels status` 會發出警告。
    - `openclaw channels status --probe` 可以檢查明確的數位群組 ID；萬用字元 `"*"` 無法探測成員資格。
    - 快速會話測試：`/activation always`。

  </Accordion>

  <Accordion title="Bot not seeing group messages at all">

    - 當存在 `channels.telegram.groups` 時，群組必須被列出（或包含 `"*"`）
    - 驗證機器人在群組中的成員資格
    - 檢查日誌：`openclaw logs --follow` 以了解跳過原因

  </Accordion>

  <Accordion title="指令部分無法運作或完全失效">

    - 授權您的傳送者身分（配對和/或數字 `allowFrom`）
    - 即使群組原則為 `open`，指令授權仍然適用
    - 出現 `setMyCommands failed` 並搭配 `BOT_COMMANDS_TOO_MUCH` 表示原生選單項目過多；請減少外掛程式/技能/自訂指令或停用原生選單
    - 出現 `setMyCommands failed` 並搭配網路/擷取錯誤，通常表示對 `api.telegram.org` 的 DNS/HTTPS 連線性問題

  </Accordion>

  <Accordion title="輪詢或網路不穩定">

    - Node 22+ + 自訂 fetch/proxy 如果 AbortSignal 類型不符，可能會觸發立即中止行為。
    - 部份主機會先將 `api.telegram.org` 解析為 IPv6；損壞的 IPv6 出站連線可能會導致間歇性的 Telegram API 失敗。
    - 如果日誌包含 `TypeError: fetch failed` 或 `Network request for 'getUpdates' failed!`，OpenClaw 現在會將這些錯誤視為可復原的網路錯誤並重試。
    - 如果日誌包含 `Polling stall detected`，OpenClaw 會在預設情況下，若 120 秒內未完成長輪詢存活檢查，便重新啟動輪詢並重建傳輸層。
    - 請僅在長時間執行的 `getUpdates` 呼叫正常，但您的主機仍回報錯誤的輪詢停滯重啟時，才增加 `channels.telegram.pollingStallThresholdMs`。持續的停滯通常指向主機與 `api.telegram.org` 之間的代理、DNS、IPv6 或 TLS 出站問題。
    - 在直接出站/TLS 不穩定的 VPS 主機上，透過 `channels.telegram.proxy` 路由 Telegram API 呼叫：

```yaml
channels:
  telegram:
    proxy: socks5://<user>:<password>@proxy-host:1080
```

    - Node 22+ 預設為 `autoSelectFamily=true`（WSL2 除外）與 `dnsResultOrder=ipv4first`。
    - 如果您的主機是 WSL2，或是明確地在僅 IPv4 環境下運作較佳，請強制選擇家族：

```yaml
channels:
  telegram:
    network:
      autoSelectFamily: false
```

    - RFC 2544 基準範圍的回應 (`198.18.0.0/15`) 已預設允許用於 Telegram 媒體下載。如果在媒體下載期間，一個受信任的偽 IP 或透明代理將 `api.telegram.org` 重寫為其他私人/內部/特殊用途位址，您可以選擇啟用 Telegram 專用的繞過：

```yaml
channels:
  telegram:
    network:
      dangerouslyAllowPrivateNetwork: true
```

    - 每個帳戶都可以在 `channels.telegram.accounts.<accountId>.network.dangerouslyAllowPrivateNetwork` 取得相同的選項。
    - 如果您的代理將 Telegram 媒體主機解析為 `198.18.x.x`，請先關閉此危險旗標。Telegram 媒體已預設允許 RFC 2544 基準範圍。

    <Warning>
      `channels.telegram.network.dangerouslyAllowPrivateNetwork` 會削弱 Telegram
      媒體的 SSRF 防護。僅在受信任的操作員控制代理環境（例如 Clash、Mihomo 或 Surge 偽 IP 路由）中，且當其合成 RFC 2544 基準範圍之外的私人或特殊用途回應時使用。對於正常的公開網際網路 Telegram 存取，請保持關閉。
    </Warning>

    - 環境覆蓋（暫時性）：
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

更多協助：[頻道疑難排解](/zh-Hant/channels/troubleshooting)。

## Telegram 設定參考指標

主要參考：

- `channels.telegram.enabled`：啟用／停用頻道啟動。
- `channels.telegram.botToken`：機器人權杖（BotFather）。
- `channels.telegram.tokenFile`：從一般檔案路徑讀取權杖。符號連結會被拒絕。
- `channels.telegram.dmPolicy`：`pairing | allowlist | open | disabled`（預設：pairing）。
- `channels.telegram.allowFrom`：DM 許可清單（數字 Telegram 使用者 ID）。`allowlist` 至少需要一個發送者 ID。`open` 需要 `"*"`。`openclaw doctor --fix` 可以將舊版 `@username` 項目解析為 ID，並且可以在許可清單遷移流程中從配對存放區檔案還原許可清單項目。
- `channels.telegram.actions.poll`：啟用或停用 Telegram 投票建立（預設：已啟用；仍需要 `sendMessage`）。
- `channels.telegram.defaultTo`：當未提供明確的 `--reply-to` 時，CLI `--deliver` 使用的預設 Telegram 目標。
- `channels.telegram.groupPolicy`：`open | allowlist | disabled`（預設：allowlist）。
- `channels.telegram.groupAllowFrom`：群組發送者許可清單（數字 Telegram 使用者 ID）。`openclaw doctor --fix` 可以將舊版 `@username` 項目解析為 ID。非數字項目在驗證時會被忽略。群組驗證不使用 DM 配對存放區後援（`2026.2.25+`）。
- 多帳號優先順序：
  - 當設定了兩個或多個帳號 ID 時，請設定 `channels.telegram.defaultAccount`（或包含 `channels.telegram.accounts.default`）以明確指定預設路由。
  - 如果兩者皆未設定，OpenClaw 會退回至第一個正規化的帳號 ID，並且 `openclaw doctor` 會發出警告。
  - `channels.telegram.accounts.default.allowFrom` 和 `channels.telegram.accounts.default.groupAllowFrom` 僅套用於 `default` 帳號。
  - 當未設定帳號層級的值時，命名帳號會繼承 `channels.telegram.allowFrom` 和 `channels.telegram.groupAllowFrom`。
  - 命名帳戶不繼承 `channels.telegram.accounts.default.allowFrom` / `groupAllowFrom`。
- `channels.telegram.groups`：每群組預設值 + 允許清單（使用 `"*"` 設定全域預設值）。
  - `channels.telegram.groups.<id>.groupPolicy`：每群組的 groupPolicy 覆蓋（`open | allowlist | disabled`）。
  - `channels.telegram.groups.<id>.requireMention`：提及閘門預設值。
  - `channels.telegram.groups.<id>.skills`：技能過濾器（省略 = 所有技能，空 = 無）。
  - `channels.telegram.groups.<id>.allowFrom`：每群組發送者允許清單覆蓋。
  - `channels.telegram.groups.<id>.systemPrompt`：群組的額外系統提示詞。
  - `channels.telegram.groups.<id>.enabled`：當 `false` 時停用該群組。
  - `channels.telegram.groups.<id>.topics.<threadId>.*`：每主題覆蓋（群組欄位 + 僅主題 `agentId`）。
  - `channels.telegram.groups.<id>.topics.<threadId>.agentId`：將此主題路由到特定代理（覆蓋群組層級和綁定路由）。
- `channels.telegram.groups.<id>.topics.<threadId>.groupPolicy`：每主題的 groupPolicy 覆蓋（`open | allowlist | disabled`）。
- `channels.telegram.groups.<id>.topics.<threadId>.requireMention`：每主題提及閘門覆蓋。
- `match.peer.id` 中的頂層 `bindings[]`，包含 `type: "acp"` 和正準主題 ID `chatId:topic:topicId`：持久化 ACP 主題綁定欄位（參見 [ACP Agents](/zh-Hant/tools/acp-agents#channel-specific-settings)）。
- `channels.telegram.direct.<id>.topics.<threadId>.agentId`：將 DM 主題路由到特定代理（行為與論壇主題相同）。
- `channels.telegram.execApprovals.enabled`：啟用 Telegram 作為此帳戶的基於聊天執行批准客戶端。
- `channels.telegram.execApprovals.approvers`：允許批准或拒絕執行請求的 Telegram 使用者 ID。當 `channels.telegram.allowFrom` 或直接的 `channels.telegram.defaultTo` 已經識別擁有者時為選填。
- `channels.telegram.execApprovals.target`：`dm | channel | both`（預設：`dm`）。當存在來源 Telegram 主題時，`channel` 和 `both` 會保留它。
- `channels.telegram.execApprovals.agentFilter`：轉發批准提示的可選代理 ID 過濾器。
- `channels.telegram.execApprovals.sessionFilter`：轉發審核提示的可選會話金鑰過濾器（子字串或正則表達式）。
- `channels.telegram.accounts.<account>.execApprovals`：每個帳號的 Telegram 執行審核路由和審核者授權覆蓋設定。
- `channels.telegram.capabilities.inlineButtons`：`off | dm | group | all | allowlist`（預設值：allowlist）。
- `channels.telegram.accounts.<account>.capabilities.inlineButtons`：每個帳號的覆蓋設定。
- `channels.telegram.commands.nativeSkills`：啟用/停用 Telegram 原生技能指令。
- `channels.telegram.replyToMode`：`off | first | all`（預設值：`off`）。
- `channels.telegram.textChunkLimit`：輸出區塊大小（字元數）。
- `channels.telegram.chunkMode`：`length`（預設值）或 `newline`，以在長度分割前根據空行（段落邊界）進行分割。
- `channels.telegram.linkPreview`：切換輸出訊息的連結預覽（預設值：true）。
- `channels.telegram.streaming`：`off | partial | block | progress`（即時串流預覽；預設值：`partial`；`progress` 對應至 `partial`；`block` 為舊版預覽模式相容性）。Telegram 預覽串流使用單一預覽訊息並直接編輯。
- `channels.telegram.mediaMaxMb`：輸入/輸出 Telegram 媒體上限（MB，預設值：100）。
- `channels.telegram.retry`：針對可復原的輸出 API 錯誤，Telegram 發送輔助工具（CLI/工具/動作）的重試原則（attempts、minDelayMs、maxDelayMs、jitter）。
- `channels.telegram.network.autoSelectFamily`：覆蓋 Node autoSelectFamily（true=啟用，false=停用）。在 Node 22+ 上預設為啟用，WSL2 則預設為停用。
- `channels.telegram.network.dnsResultOrder`：覆蓋 DNS 結果順序（`ipv4first` 或 `verbatim`）。在 Node 22+ 上預設為 `ipv4first`。
- `channels.telegram.network.dangerouslyAllowPrivateNetwork`：針對受信任的假 IP 或透明代理環境的危險選項，其中 Telegram 媒體下載將 `api.telegram.org` 解析為預設 RFC 2544 基準範圍允許之外的私人/內部/特殊用途位址。
- `channels.telegram.proxy`：Bot API 呼叫的代理 URL (SOCKS/HTTP)。
- `channels.telegram.webhookUrl`：啟用 webhook 模式 (需要 `channels.telegram.webhookSecret`)。
- `channels.telegram.webhookSecret`：webhook 密鑰 (設定 webhookUrl 時必填)。
- `channels.telegram.webhookPath`：本機 webhook 路徑 (預設 `/telegram-webhook`)。
- `channels.telegram.webhookHost`：本機 webhook 綁定主機 (預設 `127.0.0.1`)。
- `channels.telegram.webhookPort`：本機 webhook 綁定連接埠 (預設 `8787`)。
- `channels.telegram.actions.reactions`：閘道 Telegram 工具反應。
- `channels.telegram.actions.sendMessage`：閘道 Telegram 工具訊息發送。
- `channels.telegram.actions.deleteMessage`：閘道 Telegram 工具訊息刪除。
- `channels.telegram.actions.sticker`：閘道 Telegram 貼圖動作 — 發送與搜尋 (預設：false)。
- `channels.telegram.reactionNotifications`：`off | own | all` — 控制哪些反應會觸發系統事件 (若未設定則預設為 `own`)。
- `channels.telegram.reactionLevel`：`off | ack | minimal | extensive` — 控制 Agent 的反應能力 (若未設定則預設為 `minimal`)。
- `channels.telegram.errorPolicy`：`reply | silent` — 控制錯誤回覆行為 (預設：`reply`)。支援針對每個帳號/群組/話題進行覆寫。
- `channels.telegram.errorCooldownMs`：對同一聊天發送錯誤回覆之間的最小毫秒間隔 (預設 `60000`)。防止在服務中斷時產生錯誤訊息垃圾訊息。

- [配置參考 - Telegram](/zh-Hant/gateway/configuration-reference#telegram)

Telegram 專用的高信號欄位：

- startup/auth：`enabled`、`botToken`、`tokenFile`、`accounts.*` (`tokenFile` 必須指向一般檔案；不接受符號連結)
- 存取控制：`dmPolicy`、`allowFrom`、`groupPolicy`、`groupAllowFrom`、`groups`、`groups.*.topics.*`、頂層 `bindings[]` (`type: "acp"`)
- 執行核准：`execApprovals`、`accounts.*.execApprovals`
- 指令/選單：`commands.native`、`commands.nativeSkills`、`customCommands`
- 執行緒/回覆：`replyToMode`
- 串流：`streaming` (預覽)、`blockStreaming`
- 格式化/傳遞：`textChunkLimit`、`chunkMode`、`linkPreview`、`responsePrefix`
- 媒體/網路：`mediaMaxMb`、`timeoutSeconds`、`pollingStallThresholdMs`、`retry`、`network.autoSelectFamily`、`network.dangerouslyAllowPrivateNetwork`、`proxy`
- Webhook：`webhookUrl`、`webhookSecret`、`webhookPath`、`webhookHost`
- 動作/功能：`capabilities.inlineButtons`、`actions.sendMessage|editMessage|deleteMessage|reactions|sticker`
- 反應：`reactionNotifications`、`reactionLevel`
- 錯誤：`errorPolicy`、`errorCooldownMs`
- 寫入/歷史：`configWrites`、`historyLimit`、`dmHistoryLimit`、`dms.*.historyLimit`

## 相關

- [配對](/zh-Hant/channels/pairing)
- [群組](/zh-Hant/channels/groups)
- [安全性](/zh-Hant/gateway/security)
- [通道路由](/zh-Hant/channels/channel-routing)
- [多代理路由](/zh-Hant/concepts/multi-agent)
- [疑難排解](/zh-Hant/channels/troubleshooting)
