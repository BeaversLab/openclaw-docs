---
summary: "Telegram bot 支援狀態、功能和配置"
read_when:
  - Working on Telegram features or webhooks
title: "Telegram"
---

# Telegram (Bot API)

狀態：透過 grammY 支援機器人私訊 (DM) 與群組的正式生產版本。長輪詢 (Long polling) 為預設模式；Webhook 模式為選用。

<CardGroup cols={3}>
  <Card title="配對" icon="link" href="/en/channels/pairing">
    Telegram 的預設 DM 原則為配對模式。
  </Card>
  <Card title="頻道疑難排解" icon="wrench" href="/en/channels/troubleshooting">
    跨頻道診斷與修復手冊。
  </Card>
  <Card title="閘道配置" icon="settings" href="/en/gateway/configuration">
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
    - `allowlist` (需要 `allowFrom` 中至少一個發送者 ID)
    - `open` (需要 `allowFrom` 包含 `"*"`)
    - `disabled`

    `channels.telegram.allowFrom` 接受數字 Telegram 使用者 ID。`telegram:` / `tg:` 前綴會被接受並正規化。
    `dmPolicy: "allowlist"` 若 `allowFrom` 為空則會阻擋所有 DM，且會被配置驗證拒絕。
    入站流程接受 `@username` 輸入並將其解析為數字 ID。
    如果您升級後且配置包含 `@username` 允許清單條目，請執行 `openclaw doctor --fix` 來解析它們 (盡力而為；需要 Telegram bot token)。
    如果您之前依賴配對存放區允許清單檔案，`openclaw doctor --fix` 可以在允許清單流程中將條目恢復到 `channels.telegram.allowFrom` (例如當 `dmPolicy: "allowlist"` 尚無明確 ID 時)。

    對於單一擁有者的 bot，建議優先使用帶有明確數字 `allowFrom` ID 的 `dmPolicy: "allowlist"`，以在配置中保持存取策略持久 (而不是依賴先前的配對核准)。

    常見誤解：DM 配對核准並不代表「此發送者在任何地方都已被授權」。
    配對僅授予 DM 存取權限。群組發送者授權仍來自明確的配置允許清單。
    如果您希望「一次授權，同時適用於 DM 和群組指令」，請將您的數字 Telegram 使用者 ID 放入 `channels.telegram.allowFrom`。

    ### 尋找您的 Telegram 使用者 ID

    較安全的方式 (無需第三方 bot)：

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
    兩項控制會共同生效：

    1. **哪些群組是被允許的** (`channels.telegram.groups`)
       - 沒有 `groups` 設定：
         - 使用 `groupPolicy: "open"`：任何群組都可以通過群組 ID 檢查
         - 使用 `groupPolicy: "allowlist"` (預設)：群組會被封鎖，直到您新增 `groups` 項目 (或 `"*"`)
       - 已設定 `groups`：作為允許清單 (明確 ID 或 `"*"`)

    2. **哪些發送者在群組中是被允許的** (`channels.telegram.groupPolicy`)
       - `open`
       - `allowlist` (預設)
       - `disabled`

    `groupAllowFrom` 用於群組發送者過濾。如果未設定，Telegram 會退回到 `allowFrom`。
    `groupAllowFrom` 項目應為數字型別的 Telegram 使用者 ID (`telegram:` / `tg:` 前綴會被正規化)。
    請勿將 Telegram 群組或超級群組聊天 ID 放入 `groupAllowFrom`。負數聊天 ID 應屬於 `channels.telegram.groups`。
    非數字項目在發送者授權中會被忽略。
    安全邊界 (`2026.2.25+`)：群組發送者授權**不會**繼承 DM 配對儲存空間 的核准。
    配對僅限於 DM。對於群組，請設定 `groupAllowFrom` 或每個群組/每個主題的 `allowFrom`。
    如果 `groupAllowFrom` 未設定，Telegram 會退回到設定檔 `allowFrom`，而非配對儲存空間。
    單一擁有者機器人的實用模式：在 `channels.telegram.allowFrom` 中設定您的使用者 ID，保持 `groupAllowFrom` 未設定，並在 `channels.telegram.groups` 中允許目標群組。
    執行時期備註：如果 `channels.telegram` 完全缺失，執行時期預設為故障關閉 `groupPolicy="allowlist"`，除非明確設定 `channels.defaults.groupPolicy`。

    範例：允許一個特定群組中的任何成員：

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

    範例：僅允許一個特定群組中的特定使用者：

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

      - 將負數的 Telegram 群組或超級群組聊天 ID (例如 `-1001234567890`) 放在 `channels.telegram.groups` 下。
      - 當您想要限制允許群組內哪些人可以觸發機器人時，將 Telegram 使用者 ID (例如 `8734062810`) 放在 `groupAllowFrom` 下。
      - 僅當您希望允許群組的任何成員都能與機器人交談時，才使用 `groupAllowFrom: ["*"]`。
    </Warning>

  </Tab>

  <Tab title="提及行為">
    群組回覆預設需要提及。

    提及可以來自：

    - 原生 `@botusername` 提及，或
    - 下列內容中的提及模式：
      - `agents.list[].groupChat.mentionPatterns`
      - `messages.groupChat.mentionPatterns`

    會話層級指令切換：

    - `/activation always`
    - `/activation mention`

    這些僅更新會話狀態。使用設定以保持持久化。

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

    - 轉傳群組訊息至 `@userinfobot` / `@getidsbot`
    - 或從 `openclaw logs --follow` 讀取 `chat.id`
    - 或檢查 Bot API `getUpdates`

  </Tab>
</Tabs>

## 執行時行為

- Telegram 歸屬於 gateway 程序。
- 路由是確定性的：Telegram 的入站訊息會回覆到 Telegram（模型不選擇通道）。
- 入站訊息會正規化為共享通道封包，其中包含回詮中繼資料和媒體預留位置。
- 群組會話依據群組 ID 隔離。論壇主題附加 `:topic:<threadId>` 以保持主題隔離。
- 私訊可攜帶 `message_thread_id`；OpenClaw 使用具備執行緒感知能力的會話金鑰進行路由，並在回覆時保留執行緒 ID。
- 長輪詢使用 grammY 執行器，並採用逐聊天/逐執行緒的序列機制。整體執行器匯排程並行度使用 `agents.defaults.maxConcurrent`。
- Telegram Bot API 不支援已讀回執（`sendReadReceipts` 不適用）。

## 功能參考

<AccordionGroup>
  <Accordion title="即時串流預覽（訊息編輯）">
    OpenClaw 可以即時串流部分回覆：

    - 直接聊天：預覽訊息 + `editMessageText`
    - 群組/主題：預覽訊息 + `editMessageText`

    需求：

    - `channels.telegram.streaming` 為 `off | partial | block | progress`（預設：`partial`）
    - `progress` 在 Telegram 上對應至 `partial`（與跨通道命名相容）
    - 舊版 `channels.telegram.streamMode` 和布林值 `streaming` 值會自動對應

    對於純文字回覆：

    - DM：OpenClaw 保留相同的預覽訊息並就地執行最終編輯（無第二則訊息）
    - 群組/主題：OpenClaw 保留相同的預覽訊息並就地執行最終編輯（無第二則訊息）

    對於複雜回覆（例如媒體承載），OpenClaw 會回退至正常的最終傳遞，然後清理預覽訊息。

    預覽串流與區塊串流是分開的。當針對 Telegram 明確啟用區塊串流時，OpenClaw 會跳過預覽串流以避免重複串流。

    如果原生草稿傳輸不可用/被拒絕，OpenClaw 會自動回退至 `sendMessage` + `editMessageText`。

    Telegram 專用推理串流：

    - `/reasoning stream` 在生成時將推理傳送到即時預覽
    - 最終答案會在不含推理文字的情況下傳送

  </Accordion>

  <Accordion title="格式設定與 HTML 回退">
    傳出文字使用 Telegram `parse_mode: "HTML"`。

    - 類似 Markdown 的文字會轉譯為 Telegram 安全的 HTML。
    - 原始模型 HTML 會被跳脫以減少 Telegram 解析失敗。
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

    - 名稱會被標準化（移除開頭的 `/`，轉為小寫）
    - 有效模式：`a-z`、`0-9`、`_`，長度 `1..32`
    - 自訂指令無法覆寫原生指令
    - 衝突/重複的項目會被跳過並記錄下來

    備註：

    - 自訂指令僅是選單項目；它們不會自動實作行為
    - 即使未顯示在 Telegram 選單中，外掛程式/技能指令在輸入時仍可運作

    如果停用原生指令，內建指令會被移除。如果已設定，自訂/外掛程式指令仍可能註冊。

    常見的設定失敗：

    - `setMyCommands failed` 搭配 `BOT_COMMANDS_TOO_MUCH` 表示 Telegram 選單在修剪後仍然溢位；請減少外掛程式/技能/自訂指令或停用 `channels.telegram.commands.native`。
    - `setMyCommands failed` 搭配網路/擷取錯誤通常表示對 `api.telegram.org` 的出站 DNS/HTTPS 被阻擋。

    ### 裝置配對指令 (`device-pair` 外掛程式)

    當安裝了 `device-pair` 外掛程式時：

    1. `/pair` 產生設定程式碼
    2. 在 iOS App 中貼上程式碼
    3. `/pair pending` 列出待處理請求（包括角色/範圍）
    4. 核准請求：
       - `/pair approve <requestId>` 用於明確核准
       - `/pair approve` 當只有一個待處理請求時
       - `/pair approve latest` 用於最近的一個

    設定程式碼帶有短期有效的 bootstrap token。內建的 bootstrap 交手會將主要節點 token 保留在 `scopes: []`；任何交出的操作員 token 都會受限於 `operator.approvals`、`operator.read`、`operator.talk.secrets` 和 `operator.write`。Bootstrap 範圍檢查會加上角色前綴，因此操作員允許清單僅滿足操作員請求；非操作員角色仍需要在其自己的角色前綴下的範圍。

    如果裝置使用變更的驗證詳細資料（例如角色/範圍/公開金鑰）重試，先前的待處理請求會被取代，新請求會使用不同的 `requestId`。請在核准前重新執行 `/pair pending`。

    更多詳情：[配對](/en/channels/pairing#pair-via-telegram-recommended-for-ios)。

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

    每個帳號的覆寫：

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

    回調點擊會以文字形式傳遞給代理程式：
    `callback_data: <value>`

  </Accordion>

  <Accordion title="適用於代理程式和自動化的 Telegram 訊息動作">
    Telegram 工具動作包括：

    - `sendMessage` (`to`, `content`, 選用 `mediaUrl`, `replyToMessageId`, `messageThreadId`)
    - `react` (`chatId`, `messageId`, `emoji`)
    - `deleteMessage` (`chatId`, `messageId`)
    - `editMessage` (`chatId`, `messageId`, `content`)
    - `createForumTopic` (`chatId`, `name`, 選用 `iconColor`, `iconCustomEmojiId`)

    頻道訊息動作公開符合人體工學的別名 (`send`, `react`, `delete`, `edit`, `sticker`, `sticker-search`, `topic-create`)。

    閘道控制：

    - `channels.telegram.actions.sendMessage`
    - `channels.telegram.actions.deleteMessage`
    - `channels.telegram.actions.reactions`
    - `channels.telegram.actions.sticker` (預設：停用)

    注意：`edit` 和 `topic-create` 目前預設為啟用，且沒有個別的 `channels.telegram.actions.*` 切換開關。
    執行時間發送使用作用中的設定/密碼快照 (啟動/重新載入)，因此動作路徑不會在每次發送時執行臨時的 SecretRef 重新解析。

    反應移除語意：[/tools/reactions](/en/tools/reactions)

  </Accordion>

  <Accordion title="Reply threading tags">
    Telegram 支援在產生的輸出中使用明確的回覆串連標籤：

    - `[[reply_to_current]]` 回覆觸發訊息
    - `[[reply_to:<id>]]` 回覆特定的 Telegram 訊息 ID

    `channels.telegram.replyToMode` 控制處理方式：

    - `off` (預設)
    - `first`
    - `all`

    注意：`off` 會停用隱含的回覆串連。明確的 `[[reply_to_*]]` 標籤仍然有效。

  </Accordion>

  <Accordion title="論壇主題和執行緒行為">
    論壇超級群組：

    - 主題會話金鑰附加 `:topic:<threadId>`
    - 回覆和輸入狀態以主題執行緒為目標
    - 主題配置路徑：
      `channels.telegram.groups.<chatId>.topics.<threadId>`

    一般主題 (`threadId=1`) 特殊情況：

    - 訊息發送省略 `message_thread_id`（Telegram 拒絕 `sendMessage(...thread_id=1)`）
    - 輸入動作仍包含 `message_thread_id`

    主題繼承：主題條目繼承群組設定，除非被覆寫（`requireMention`、`allowFrom`、`skills`、`systemPrompt`、`enabled`、`groupPolicy`）。
    `agentId` 僅限主題，不繼承群組預設值。

    **每個主題的代理路由**：每個主題可以透過在主題配置中設定 `agentId` 來路由到不同的代理。這給每個主題自己的隔離工作區、記憶體和會話。範例：

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

    每個主題然後有自己的會話金鑰：`agent:zu:telegram:group:-1001234567890:topic:3`

    **持久化 ACP 主題綁定**：論壇主題可以透過頂層類型化的 ACP 綁定來釘選 ACP 駝具會話：

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

    此功能目前範圍僅限群組和超級群組中的論壇主題。

    **從聊天產生執行緒綁定的 ACP**：

    - `/acp spawn <agent> --thread here|auto` 可以將目前的 Telegram 主題綁定到新的 ACP 會話。
    - 後續的主題訊息直接路由到綁定的 ACP 會話（不需要 `/acp steer`）。
    - OpenClaw 在成功綁定後會在主題內釘選產生確認訊息。
    - 需要 `channels.telegram.threadBindings.spawnAcpSessions=true`。

    模板上下文包括：

    - `MessageThreadId`
    - `IsForum`

    DM 執行緒行為：

    - 具有 `message_thread_id` 的私人聊天保留 DM 路由，但使用具有執行緒感知能力的會話金鑰/回覆目標。

  </Accordion>

  <Accordion title="音訊、影片和貼圖">
    ### 音訊訊息

    Telegram 區分語音訊息與音訊檔案。

    - 預設：音訊檔案行為
    - 在代理程式回覆中標記 `[[audio_as_voice]]` 以強制發送語音訊息

    訊息操作範例：

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

    訊息操作範例：

```json5
{
  action: "send",
  channel: "telegram",
  to: "123456789",
  media: "https://example.com/video.mp4",
  asVideoNote: true,
}
```

    影片訊息不支援說明文字；提供的訊息文字會單獨發送。

    ### 貼圖

    傳入貼圖處理：

    - 靜態 WEBP：已下載並處理（佔位符 `<media:sticker>`）
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

    貼圖僅會描述一次（在可能的情況下）並進行快取，以減少重複的視覺呼叫。

    啟用貼圖操作：

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

    發送貼圖操作：

```json5
{
  action: "sticker",
  channel: "telegram",
  to: "123456789",
  fileId: "CAACAgIAAxkBAAI...",
}
```

    搜尋快取貼圖：

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
    Telegram 的反應會作為 `message_reaction` 更新到達（與訊息內容分開）。

    啟用後，OpenClaw 會將系統事件加入佇列，例如：

    - `Telegram reaction added: 👍 by Alice (@alice) on msg 42`

    設定：

    - `channels.telegram.reactionNotifications`: `off | own | all` (預設: `own`)
    - `channels.telegram.reactionLevel`: `off | ack | minimal | extensive` (預設: `minimal`)

    備註：

    - `own` 表示僅限使用者對 Bot 發送訊息的反應（透過已發送訊息快取盡力而為）。
    - 反應事件仍會遵守 Telegram 存取控制 (`dmPolicy`, `allowFrom`, `groupPolicy`, `groupAllowFrom`)；未授權的發送者會被捨棄。
    - Telegram 不會在反應更新中提供主題 ID。
      - 非論壇群組會路由到群組聊天階段
      - 論壇群組會路由到群組一般主題階段 (`:topic:1`)，而非確切的原始主題

    用於輪詢/Webhook 的 `allowed_updates` 會自動包含 `message_reaction`。

  </Accordion>

  <Accordion title="Ack reactions">
    當 OpenClaw 正在處理傳入訊息時，`ackReaction` 會發送確認用表情符號。

    解析順序：

    - `channels.telegram.accounts.<accountId>.ackReaction`
    - `channels.telegram.ackReaction`
    - `messages.ackReaction`
    - agent identity emoji fallback (`agents.list[].identity.emoji`, 否則為 "👀")

    備註：

    - Telegram 預期使用 Unicode 表情符號 (例如 "👀")。
    - 使用 `""` 來停用頻道或帳號的反應功能。

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

  <Accordion title="長輪詢 vs Webhook">
    預設：長輪詢。

    Webhook 模式：

    - 設定 `channels.telegram.webhookUrl`
    - 設定 `channels.telegram.webhookSecret` (設定 Webhook URL 時為必填)
    - 選用 `channels.telegram.webhookPath` (預設 `/telegram-webhook`)
    - 選用 `channels.telegram.webhookHost` (預設 `127.0.0.1`)
    - 選用 `channels.telegram.webhookPort` (預設 `8787`)

    Webhook 模式的預設本機監聽器綁定至 `127.0.0.1:8787`。

    如果您的公開端點不同，請在前方放置反向代理並將 `webhookUrl` 指向公開 URL。
    當您刻意需要外部連入時，請設定 `webhookHost` (例如 `0.0.0.0`)。

  </Accordion>

  <Accordion title="限制、重試和 CLI 目標">
    - `channels.telegram.textChunkLimit` 預設為 4000。
    - `channels.telegram.chunkMode="newline"` 偏好在長度分割前使用段落邊界（空白行）。
    - `channels.telegram.mediaMaxMb` （預設 100）限制傳入和傳出的 Telegram 媒體大小。
    - `channels.telegram.timeoutSeconds` 覆寫 Telegram API 用戶端逾時（若未設定，則套用 grammY 預設值）。
    - 群組上下文紀錄使用 `channels.telegram.historyLimit` 或 `messages.groupChat.historyLimit` （預設 50）；`0` 則停用。
    - 回覆/引用/轉發的補充上下文目前會按接收到的樣子傳遞。
    - Telegram 允許清單主要控制誰可以觸發代理程式，而非完整的補充上下文編輯邊界。
    - DM 歷史紀錄控制：
      - `channels.telegram.dmHistoryLimit`
      - `channels.telegram.dms["<user_id>"].historyLimit`
    - `channels.telegram.retry` 設定會套用於 Telegram 傳送輔助程式（CLI/工具/動作），以處理可復原的傳出 API 錯誤。

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

    - `--poll-duration-seconds` （5-600）
    - `--poll-anonymous`
    - `--poll-public`
    - `--thread-id` 用於論壇主題（或使用 `:topic:` 目標）

    Telegram 傳送也支援：

    - `--buttons` 用於內聯鍵盤，當 `channels.telegram.capabilities.inlineButtons` 允許時
    - `--force-document` 將傳出圖片和 GIF 以文件形式傳送，而不是壓縮照片或動態媒體上傳

    動作閘道：

    - `channels.telegram.actions.sendMessage=false` 停用傳出 Telegram 訊息，包括投票
    - `channels.telegram.actions.poll=false` 停用 Telegram 投票建立，同時保留一般傳送功能

  </Accordion>

  <Accordion title="在 Telegram 中進行執行審批">
    Telegram 支援在審批者的私人訊息 (DM) 中進行執行審批，並可選擇將審批提示張貼到原始聊天或主題中。

    設定路徑：

    - `channels.telegram.execApprovals.enabled`
    - `channels.telegram.execApprovals.approvers` (可選；若可能，會回退到從 `allowFrom` 和直接 `defaultTo` 推斷出的數字擁有者 ID)
    - `channels.telegram.execApprovals.target` (`dm` | `channel` | `both`，預設值：`dm`)
    - `agentFilter`, `sessionFilter`

    審批者必須是 Telegram 的數字使用者 ID。當 `enabled` 未設定或為 `"auto"`，且至少能解析出一個審批者（無論是來自 `execApprovals.approvers` 還是帳號的數字擁有者設定 (`allowFrom` 和直接訊息 `defaultTo`)）時，Telegram 會自動啟用原生執行審批。設定 `enabled: false` 可明確停用 Telegram 作為原生審批准用戶端。否則，審批請求會回退到其他設定的審批路由或執行審備援政策。

    Telegram 也會轉譯其他聊天頻道使用的共用審批按鈕。原生的 Telegram 配接器主要增加了審批者 DM 路由、頻道/主題分發，以及傳送前的輸入提示。
    當這些按鈕存在時，它們是主要的審批使用者體驗 (UX)；僅當工具結果指出
    聊天審批不可用或手動審批是唯一途徑時，OpenClaw
    才應包含手動 `/approve` 指令。

    傳送規則：

    - `target: "dm"` 僅將審批提示傳送給已解析的審批者 DM
    - `target: "channel"` 將提示傳送回原始的 Telegram 聊天/主題
    - `target: "both"` 傳送給審批者 DM 和原始聊天/主題

    只有已解析的審批者可以批准或拒絕。非審批者無法使用 `/approve`，也無法使用 Telegram 審批按鈕。

    審批解析行為：

    - 前綴為 `plugin:` 的 ID 始終透過外掛程式審批進行解析。
    - 其他審批 ID 先嘗試 `exec.approval.resolve`。
    - 如果 Telegram 也被授權進行外掛程式審批，且閘道表示
      執行審批未知/已過期，Telegram 會透過
      `plugin.approval.resolve` 重試一次。
    - 真正的執行審批拒絕/錯誤不會無聲地回退到外掛程式
      審批解析。

    頻道傳送會在聊天中顯示指令文字，因此僅在受信任的群組/主題中啟用 `channel` 或 `both`。當提示位於論壇主題時，OpenClaw 會為審批提示和審批後的後續追蹤保留該主題。執行審批預設在 30 分鐘後過期。

    內嵌審批按鈕也取決於 `channels.telegram.capabilities.inlineButtons` 允許目標介面 (`dm`、`group` 或 `all`)。

    相關文件：[執行審批](/en/tools/exec-approvals)

  </Accordion>
</AccordionGroup>

## 錯誤回覆控制

當 Agent 遇到傳遞或提供者錯誤時，Telegram 可以回覆錯誤文字或將其隱藏。有兩個配置鍵控制此行為：

| 配置鍵                              | 數值              | 預設值  | 說明                                                                  |
| ----------------------------------- | ----------------- | ------- | --------------------------------------------------------------------- |
| `channels.telegram.errorPolicy`     | `reply`, `silent` | `reply` | `reply` 會傳送友好的錯誤訊息至聊天室。`silent` 則會完全抑制錯誤回覆。 |
| `channels.telegram.errorCooldownMs` | 數字 (毫秒)       | `60000` | 對同一個聊天室回覆錯誤的最低時間間隔。防止中斷期間的錯誤訊息洗版。    |

支援每個帳戶、群組和主題的覆蓋設定（繼承方式與其他 Telegram 配置鍵相同）。

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

    - 若為 `requireMention=false`，Telegram 隱私模式必須允許完整可見性。
      - BotFather: `/setprivacy` -> Disable
      - 然後將機器人從群組中移除並重新加入
    - `openclaw channels status` 會在設定預期接收非提及的群組訊息時發出警告。
    - `openclaw channels status --probe` 可以檢查明確的數值群組 ID；萬用字元 `"*"` 無法探測成員資格。
    - 快速會話測試：`/activation always`。

  </Accordion>

  <Accordion title="Bot not seeing group messages at all">

    - 當 `channels.telegram.groups` 存在時，群組必須被列出（或包含 `"*"`）
    - 確認機器人在群組中的成員身份
    - 檢查記錄：`openclaw logs --follow` 以瞭解跳過原因

  </Accordion>

  <Accordion title="Commands work partially or not at all">

    - 授權您的發送者身分（配對和/或數值 `allowFrom`）
    - 即使群組原則為 `open`，指令授權仍然適用
    - `setMyCommands failed` 伴隨 `BOT_COMMANDS_TOO_MUCH` 表示原生選單項目過多；請減少外掛/技能/自訂指令或停用原生選單
    - `setMyCommands failed` 伴隨網路/fetch 錯誤通常表示對 `api.telegram.org` 的 DNS/HTTPS 連線問題

  </Accordion>

  <Accordion title="輪詢或網路不穩定">

    - Node 22+ + 自訂 fetch/proxy 如果 AbortSignal 類型不匹配，可能會觸發立即中止行為。
    - 部分主機會將 `api.telegram.org` 優先解析為 IPv6；損壞的 IPv6 出網可能會導致 Telegram API 間歇性故障。
    - 如果日誌包含 `TypeError: fetch failed` 或 `Network request for 'getUpdates' failed!`，OpenClaw 現在會將這些作為可恢復的網路錯誤重試。
    - 在具有不穩定直接出網/TLS 的 VPS 主機上，透過 `channels.telegram.proxy` 路由 Telegram API 呼叫：

```yaml
channels:
  telegram:
    proxy: socks5://<user>:<password>@proxy-host:1080
```

    - Node 22+ 預設為 `autoSelectFamily=true` (WSL2 除外) 和 `dnsResultOrder=ipv4first`。
    - 如果您的主機是 WSL2 或明確在僅 IPv4 行為下運作更好，請強制選擇家族：

```yaml
channels:
  telegram:
    network:
      autoSelectFamily: false
```

    - RFC 2544 基準範圍的回答 (`198.18.0.0/15`) 在 Telegram 媒體下載時已預設允許。如果在媒體下載期間，受信任的 fake-IP 或透明代理將 `api.telegram.org` 重寫為其他私有/內部/特殊用途位址，您可以選擇加入 Telegram 專用繞過：

```yaml
channels:
  telegram:
    network:
      dangerouslyAllowPrivateNetwork: true
```

    - 同樣的選項可在每個帳號的
      `channels.telegram.accounts.<accountId>.network.dangerouslyAllowPrivateNetwork` 中使用。
    - 如果您的代理將 Telegram 媒體主機解析為 `198.18.x.x`，請先保持危險標誌關閉。Telegram 媒體已預設允許 RFC 2544 基準範圍。

    <Warning>
      `channels.telegram.network.dangerouslyAllowPrivateNetwork` 會減弱 Telegram
      媒體 SSRF 防護。僅在受信任的運營商控制的代理環境（例如 Clash、Mihomo 或 Surge fake-IP 路由）中使用，當它們綜合出 RFC 2544 基準範圍之外的私有或特殊用途回答時。對於正常的公共網際網路 Telegram 存取，請將其關閉。
    </Warning>

    - 環境覆寫 (臨時)：
      - `OPENCLAW_TELEGRAM_DISABLE_AUTO_SELECT_FAMILY=1`
      - `OPENCLAW_TELEGRAM_ENABLE_AUTO_SELECT_FAMILY=1`
      - `OPENCLAW_TELEGRAM_DNS_RESULT_ORDER=ipv4first`
    - 驗證 DNS 回答：

```bash
dig +short api.telegram.org A
dig +short api.telegram.org AAAA
```

  </Accordion>
</AccordionGroup>

更多說明：[頻道疑難排解](/en/channels/troubleshooting)。

## Telegram 配置參考指引

主要參考：

- `channels.telegram.enabled`: 啟用/停用頻道啟動。
- `channels.telegram.botToken`: 機器人權杖 (BotFather)。
- `channels.telegram.tokenFile`：從常規檔案路徑讀取令牌。拒絕符號連結。
- `channels.telegram.dmPolicy`：`pairing | allowlist | open | disabled`（預設：pairing）。
- `channels.telegram.allowFrom`：DM 許可清單（數字 Telegram 使用者 ID）。`allowlist` 需要至少一個傳送者 ID。`open` 需要 `"*"`。`openclaw doctor --fix` 可以將舊版 `@username` 項目解析為 ID，並且可以在許可清單遷移流程中從配對儲存檔案中恢復許可清單項目。
- `channels.telegram.actions.poll`：啟用或停用 Telegram 投票建立（預設：已啟用；仍然需要 `sendMessage`）。
- `channels.telegram.defaultTo`：當未提供明確的 `--reply-to` 時，CLI `--deliver` 使用的預設 Telegram 目標。
- `channels.telegram.groupPolicy`：`open | allowlist | disabled`（預設：allowlist）。
- `channels.telegram.groupAllowFrom`：群組傳送者許可清單（數字 Telegram 使用者 ID）。`openclaw doctor --fix` 可以將舊版 `@username` 項目解析為 ID。非數字項目在驗證時會被忽略。群組驗證不使用 DM 配對儲存後備（`2026.2.25+`）。
- 多帳號優先順序：
  - 當配置了兩個或多個帳號 ID 時，設定 `channels.telegram.defaultAccount`（或包含 `channels.telegram.accounts.default`）以使預設路由變得明確。
  - 如果兩者都未設定，OpenClaw 將回退到第一個正規化的帳號 ID，並且 `openclaw doctor` 會發出警告。
  - `channels.telegram.accounts.default.allowFrom` 和 `channels.telegram.accounts.default.groupAllowFrom` 僅適用於 `default` 帳號。
  - 當帳號級別的值未設定時，命名帳號會繼承 `channels.telegram.allowFrom` 和 `channels.telegram.groupAllowFrom`。
  - 命名帳號不會繼承 `channels.telegram.accounts.default.allowFrom` / `groupAllowFrom`。
- `channels.telegram.groups`：各群組預設值 + 許可清單（使用 `"*"` 作為全域預設值）。
  - `channels.telegram.groups.<id>.groupPolicy`：groupPolicy（`open | allowlist | disabled`）的各群組覆寫。
  - `channels.telegram.groups.<id>.requireMention`：提及控制預設值。
  - `channels.telegram.groups.<id>.skills`：技能過濾器（省略 = 所有技能，空白 = 無）。
  - `channels.telegram.groups.<id>.allowFrom`：每群組發送者允許清單覆寫。
  - `channels.telegram.groups.<id>.systemPrompt`：群組的額外系統提示詞。
  - `channels.telegram.groups.<id>.enabled`：當 `false` 時停用該群組。
  - `channels.telegram.groups.<id>.topics.<threadId>.*`：每主題覆寫（群組欄位 + 主題專屬 `agentId`）。
  - `channels.telegram.groups.<id>.topics.<threadId>.agentId`：將此主題路由至特定代理程式（覆寫群組層級和綁定路由）。
- `channels.telegram.groups.<id>.topics.<threadId>.groupPolicy`：groupPolicy 的每主題覆寫（`open | allowlist | disabled`）。
- `channels.telegram.groups.<id>.topics.<threadId>.requireMention`：每主題提及控制覆寫。
- 頂層 `bindings[]`，帶有 `type: "acp"` 和 `match.peer.id` 中的正準主題 ID `chatId:topic:topicId`：持久化 ACP 主題綁定欄位（請參閱 [ACP Agents](/en/tools/acp-agents#channel-specific-settings)）。
- `channels.telegram.direct.<id>.topics.<threadId>.agentId`：將 DM 主題路由至特定代理程式（行為與論壇主題相同）。
- `channels.telegram.execApprovals.enabled`：啟用 Telegram 作為此帳戶的基於聊天的 exec 批准用戶端。
- `channels.telegram.execApprovals.approvers`：允許批准或拒絕 exec 請求的 Telegram 使用者 ID。當 `channels.telegram.allowFrom` 或直接的 `channels.telegram.defaultTo` 已識別擁有者時為選填。
- `channels.telegram.execApprovals.target`：`dm | channel | both`（預設：`dm`）。`channel` 和 `both` 會在存在時保留原始的 Telegram 主題。
- `channels.telegram.execApprovals.agentFilter`：轉發批准提示的選用代理程式 ID 過濾器。
- `channels.telegram.execApprovals.sessionFilter`：轉發批准提示的選用會話金鑰過濾器（子字串或正規表示式）。
- `channels.telegram.accounts.<account>.execApprovals`：每帳戶覆寫 Telegram exec 批准路由和批准者授權。
- `channels.telegram.capabilities.inlineButtons`：`off | dm | group | all | allowlist`（預設：允許清單）。
- `channels.telegram.accounts.<account>.capabilities.inlineButtons`：每帳戶覆寫。
- `channels.telegram.commands.nativeSkills`：啟用/停用 Telegram 原生技能指令。
- `channels.telegram.replyToMode`：`off | first | all`（預設值：`off`）。
- `channels.telegram.textChunkLimit`：傳出區塊大小（字元數）。
- `channels.telegram.chunkMode`：`length`（預設值）或 `newline`，在進行長度分塊之前於空白行（段落邊界）進行分割。
- `channels.telegram.linkPreview`：切換傳出訊息的連結預覽（預設值：true）。
- `channels.telegram.streaming`：`off | partial | block | progress`（即時串流預覽；預設值：`partial`；`progress` 對應至 `partial`；`block` 為舊版預覽模式相容性）。Telegram 預覽串流使用單一預覽訊息並就地編輯。
- `channels.telegram.mediaMaxMb`：Telegram 傳入/傳出媒體上限（MB，預設值：100）。
- `channels.telegram.retry`：Telegram 傳送輔助程式（CLI/工具/動作）在可復原的傳出 API 錯誤時的重試原則（attempts、minDelayMs、maxDelayMs、jitter）。
- `channels.telegram.network.autoSelectFamily`：覆寫 Node autoSelectFamily（true=啟用，false=停用）。在 Node 22+ 上預設為啟用，WSL2 則預設為停用。
- `channels.telegram.network.dnsResultOrder`：覆寫 DNS 結果順序（`ipv4first` 或 `verbatim`）。在 Node 22+ 上預設為 `ipv4first`。
- `channels.telegram.network.dangerouslyAllowPrivateNetwork`：針對受信任的偽造 IP 或透明代理環境的危險選項，在此類環境中，Telegram 媒體下載會將 `api.telegram.org` 解析為預設 RFC 2544 基準範圍允許範圍之外的私人/內部/特殊用途地址。
- `channels.telegram.proxy`：Bot API 呼叫的 Proxy URL（SOCKS/HTTP）。
- `channels.telegram.webhookUrl`：啟用 Webhook 模式（需要 `channels.telegram.webhookSecret`）。
- `channels.telegram.webhookSecret`：Webhook 密鑰（設定 webhookUrl 時為必要項）。
- `channels.telegram.webhookPath`：本機 Webhook 路徑（預設值 `/telegram-webhook`）。
- `channels.telegram.webhookHost`：本機 webhook 繫結主機（預設 `127.0.0.1`）。
- `channels.telegram.webhookPort`：本機 webhook 繫結連接埠（預設 `8787`）。
- `channels.telegram.actions.reactions`：控管 Telegram 工具反應。
- `channels.telegram.actions.sendMessage`：控管 Telegram 工具訊息傳送。
- `channels.telegram.actions.deleteMessage`：控管 Telegram 工具訊息刪除。
- `channels.telegram.actions.sticker`：控管 Telegram 貼圖動作 — 傳送與搜尋（預設：false）。
- `channels.telegram.reactionNotifications`：`off | own | all` — 控制哪些反應會觸發系統事件（若未設定則預設為 `own`）。
- `channels.telegram.reactionLevel`：`off | ack | minimal | extensive` — 控制代理程式的反應能力（若未設定則預設為 `minimal`）。
- `channels.telegram.errorPolicy`：`reply | silent` — 控制錯誤回覆行為（預設 `reply`）。支援每個帳號/群組/主題的覆寫設定。
- `channels.telegram.errorCooldownMs`：對同一聊天傳送錯誤回覆之間的最小毫秒間隔（預設 `60000`）。防止中斷期間的錯誤訊息濫發。

- [配置參考 - Telegram](/en/gateway/configuration-reference#telegram)

Telegram 專用的高信號欄位：

- 啟動/驗證：`enabled`、`botToken`、`tokenFile`、`accounts.*`（`tokenFile` 必須指向一般檔案；不接受符號連結）
- 存取控制：`dmPolicy`、`allowFrom`、`groupPolicy`、`groupAllowFrom`、`groups`、`groups.*.topics.*`、頂層 `bindings[]`（`type: "acp"`）
- 執行審核：`execApprovals`、`accounts.*.execApprovals`
- 指令/選單：`commands.native`、`commands.nativeSkills`、`customCommands`
- 執行緒/回覆：`replyToMode`
- 串流：`streaming` （預覽），`blockStreaming`
- 格式/傳遞：`textChunkLimit`，`chunkMode`，`linkPreview`，`responsePrefix`
- 媒體/網路：`mediaMaxMb`，`timeoutSeconds`，`retry`，`network.autoSelectFamily`，`network.dangerouslyAllowPrivateNetwork`，`proxy`
- Webhook：`webhookUrl`，`webhookSecret`，`webhookPath`，`webhookHost`
- 動作/功能：`capabilities.inlineButtons`，`actions.sendMessage|editMessage|deleteMessage|reactions|sticker`
- 反應：`reactionNotifications`，`reactionLevel`
- 錯誤：`errorPolicy`，`errorCooldownMs`
- 寫入/歷史：`configWrites`，`historyLimit`，`dmHistoryLimit`，`dms.*.historyLimit`

## 相關

- [配對](/en/channels/pairing)
- [群組](/en/channels/groups)
- [安全性](/en/gateway/security)
- [頻道路由](/en/channels/channel-routing)
- [多代理路由](/en/concepts/multi-agent)
- [疑難排解](/en/channels/troubleshooting)
