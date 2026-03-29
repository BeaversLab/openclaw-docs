---
summary: "Telegram 機器人支援狀態、功能及設定"
read_when:
  - Working on Telegram features or webhooks
title: "Telegram"
---

# Telegram (Bot API)

狀態：透過 grammY 支援機器人私訊 (DM) 與群組的正式生產版本。長輪詢 (Long polling) 為預設模式；Webhook 模式為選用。

<CardGroup cols={3}>
  <Card title="配對" icon="link" href="/en/channels/pairing">
    Telegram 的預設私訊原則為配對。
  </Card>
  <Card title="頻道疑難排解" icon="wrench" href="/en/channels/troubleshooting">
    跨頻道診斷與修復手冊。
  </Card>
  <Card title="閘道設定" icon="settings" href="/en/gateway/configuration">
    完整的頻道設定範例與模式。
  </Card>
</CardGroup>

## 快速設定

<Steps>
  <Step title="在 BotFather 中建立機器人權杖">
    開啟 Telegram 並與 **@BotFather** 對話 (請確認帳號確切為 `@BotFather`)。

    執行 `/newbot`，依照提示操作，並儲存權杖。

  </Step>

  <Step title="設定權杖與私訊原則">

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

    環境變數備援：`TELEGRAM_BOT_TOKEN=...` (僅限預設帳號)。
    Telegram **不**會使用 `openclaw channels login telegram`；請在設定/環境變數中設定權杖，然後啟動閘道。

  </Step>

  <Step title="啟動閘道並核准首條私訊">

```bash
openclaw gateway
openclaw pairing list telegram
openclaw pairing approve telegram <CODE>
```

    配對碼會在 1 小時後過期。

  </Step>

  <Step title="將機器人加入群組">
    將機器人加入您的群組，然後設定 `channels.telegram.groups` 與 `groupPolicy` 以符合您的存取模型。
  </Step>
</Steps>

<Note>權杖解析順序會考量帳號。實務上，設定值的優先順序高於環境變數備援，而 `TELEGRAM_BOT_TOKEN` 僅適用於預設帳號。</Note>

## Telegram 端設定

<AccordionGroup>
  <Accordion title="隱私模式和群組可見性">
    Telegram 機器人預設開啟 **隱私模式 (Privacy Mode)**，這會限制它們接收到的群組訊息。

    如果機器人必須查看所有群組訊息，請執行以下任一操作：

    - 透過 `/setprivacy` 停用隱私模式，或
    - 將機器人設為群組管理員。

    切換隱私模式時，請將機器人從各個群組中移除並重新加入，以便 Telegram 套用變更。

  </Accordion>

  <Accordion title="群組權限">
    管理員狀態是在 Telegram 群組設定中控制的。

    擁有管理員權限的機器人會接收所有群組訊息，這對於始終保持運作的群組行為非常有用。

  </Accordion>

  <Accordion title="實用的 BotFather 切換開關">

    - `/setjoingroups` 用於允許/拒絕加入群組
    - `/setprivacy` 用於群組可見性行為

  </Accordion>
</AccordionGroup>

## 存取控制與啟用

<Tabs>
  <Tab title="DM policy">
    `channels.telegram.dmPolicy` 控制私訊存取權限：

    - `pairing` （預設）
    - `allowlist` （至少需要一個發送者 ID 在 `allowFrom` 中）
    - `open` （需要 `allowFrom` 包含 `"*"`）
    - `disabled`

    `channels.telegram.allowFrom` 接受數字 Telegram 使用者 ID。接受並正規化 `telegram:` / `tg:` 前綴。
    當 `dmPolicy: "allowlist"` 的 `allowFrom` 為空時會阻擋所有私訊，且會被設定檔驗證拒絕。
    Onboarding 接受 `@username` 輸入並將其解析為數字 ID。
    如果您已升級且您的設定檔包含 `@username` 允許清單條目，請執行 `openclaw doctor --fix` 來解析它們（盡力而為；需要 Telegram bot token）。
    如果您先前依賴 pairing-store 允許清單檔案，`openclaw doctor --fix` 可以在允許清單流程中將條目恢復到 `channels.telegram.allowFrom` （例如當 `dmPolicy: "allowlist"` 尚無明確 ID 時）。

    對於單一擁有者的機器人，建議優先使用帶有明確數字 `allowFrom` ID 的 `dmPolicy: "allowlist"`，以在設定檔中保持存取策略持久（而不是依賴先前的配對核准）。

    ### 尋找您的 Telegram 使用者 ID

    較安全（無第三方機器人）：

    1. 私訊您的機器人。
    2. 執行 `openclaw logs --follow`。
    3. 讀取 `from.id`。

    官方 Bot API 方法：

```bash
curl "https://api.telegram.org/bot<bot_token>/getUpdates"
```

    第三方方法（隱私性較低）： `@userinfobot` 或 `@getidsbot`。

  </Tab>

  <Tab title="群組政策與允許清單">
    兩個控制項會一起套用：

    1. **哪些群組被允許** (`channels.telegram.groups`)
       - 沒有 `groups` 設定：
         - 使用 `groupPolicy: "open"`：任何群組都可以通過群組 ID 檢查
         - 使用 `groupPolicy: "allowlist"` (預設)：群組會被封鎖，直到您新增 `groups` 項目 (或 `"*"`)
       - 已設定 `groups`：作為允許清單 (明確的 ID 或 `"*"`)

    2. **群組中允許哪些傳送者** (`channels.telegram.groupPolicy`)
       - `open`
       - `allowlist` (預設)
       - `disabled`

    `groupAllowFrom` 用於群組傳送者過濾。如果未設定，Telegram 會回退至 `allowFrom`。
    `groupAllowFrom` 項目應為數字的 Telegram 使用者 ID (`telegram:` / `tg:` 前綴會被正規化)。
    請勿將 Telegram 群組或超級群組聊天 ID 放入 `groupAllowFrom`。負數聊天 ID 屬於 `channels.telegram.groups`。
    非數字項目在傳送者授權時會被忽略。
    安全邊界 (`2026.2.25+`)：群組傳送者授權**不**會繼承 DM 配對儲存庫 (pairing-store) 的核准。
    配對僅限於 DM。對於群組，請設定 `groupAllowFrom` 或每個群組/每個主題的 `allowFrom`。
    執行時期備註：如果完全缺少 `channels.telegram`，執行時期預設為失敗關閉 (fail-closed) 的 `groupPolicy="allowlist"`，除非明確設定 `channels.defaults.groupPolicy`。

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

      - 將負數的 Telegram 群組或超級群組聊天 ID (如 `-1001234567890`) 放在 `channels.telegram.groups` 下。
      - 當您想要限制允許群組內哪些人可以觸發機器人時，將 Telegram 使用者 ID (如 `8734062810`) 放在 `groupAllowFrom` 下。
      - 僅當您希望允許群組的任何成員都能與機器人交談時，才使用 `groupAllowFrom: ["*"]`。
    </Warning>

  </Tab>

  <Tab title="Mention behavior">
    群組回覆預設需要提及。

    提及可以來自：

    - 原生 `@botusername` 提及，或
    - 下列位置中的提及模式：
      - `agents.list[].groupChat.mentionPatterns`
      - `messages.groupChat.mentionPatterns`

    工作階段層級的指令切換：

    - `/activation always`
    - `/activation mention`

    這些僅更新工作階段狀態。請使用設定以實現持久化。

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
- 群組工作階段依群組 ID 隔離。論壇主題會附加 `:topic:<threadId>` 以保持主題隔離。
- DM 訊息可以攜帶 `message_thread_id`；OpenClaw 使用具備執行緒感知能力的工作階段金鑰來路由它們，並為回覆保留執行緒 ID。
- 輪詢使用 grammY 執行器，並搭配每個聊天/每個執行緒的順序處理。整體執行器接收端並行性使用 `agents.defaults.maxConcurrent`。
- Telegram Bot API 不支援已讀回執（`sendReadReceipts` 不適用）。

## 功能參考

<AccordionGroup>
  <Accordion title="即時串流預覽（訊息編輯）">
    OpenClaw 可以即時串流部分回覆：

    - 直接聊天：預覽訊息 + `editMessageText`
    - 群組/主題：預覽訊息 + `editMessageText`

    需求：

    - `channels.telegram.streaming` 為 `off | partial | block | progress`（預設：`partial`）
    - `progress` 在 Telegram 上對應至 `partial`（相容跨頻道命名）
    - 舊版 `channels.telegram.streamMode` 和布林值 `streaming` 會自動對應

    對於純文字回覆：

    - DM：OpenClaw 保持相同的預覽訊息並就地執行最終編輯（不產生第二則訊息）
    - 群組/主題：OpenClaw 保持相同的預覽訊息並就地執行最終編輯（不產生第二則訊息）

    對於複雜回覆（例如媒體內容），OpenClaw 會回退至正常的最終傳送，然後清除預覽訊息。

    預覽串流與區塊串流是分開的。當為 Telegram 明確啟用區塊串流時，OpenClaw 會跳過預覽串流以避免重複串流。

    如果原生草稿傳輸不可用或被拒絕，OpenClaw 會自動回退至 `sendMessage` + `editMessageText`。

    Telegram 專用的推理串流：

    - `/reasoning stream` 在生成時將推理內容傳送至即時預覽
    - 最終答案傳送時不包含推理文字

  </Accordion>

  <Accordion title="格式與 HTML 備援">
    傳出文字使用 Telegram `parse_mode: "HTML"`。

    - 類 Markdown 文字會渲染為 Telegram 安全的 HTML。
    - 原始模型 HTML 會被跳脫以減少 Telegram 解析失敗。
    - 如果 Telegram 拒絕解析後的 HTML，OpenClaw 會以純文字重試。

    連結預覽預設為啟用，可透過 `channels.telegram.linkPreview: false` 停用。

  </Accordion>

  <Accordion title="原生指令與自訂指令">
    Telegram 指令選單註冊是在啟動時透過 `setMyCommands` 處理的。

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
    - 自訂指令無法覆蓋原生指令
    - 衝突/重複項目會被跳過並記錄

    備註：

    - 自訂指令僅為選單項目；它們不會自動實作行為
    - 即使未在 Telegram 選單中顯示，外掛/技能指令在輸入時仍可正常運作

    如果停用原生指令，內建指令會被移除。若經設定，自訂/外掛指令仍可能會註冊。

    常見設定失敗：

    - `setMyCommands failed` 搭配 `BOT_COMMANDS_TOO_MUCH` 表示 Telegram 選單在修剪後仍然溢位；請減少外掛/技能/自訂指令或停用 `channels.telegram.commands.native`。
    - `setMyCommands failed` 搭配網路/fetch 錯誤通常表示傳出到 `api.telegram.org` 的 DNS/HTTPS 被封鎖。

    ### 裝置配對指令 (`device-pair` 外掛)

    當安裝 `device-pair` 外掛時：

    1. `/pair` 產生設定碼
    2. 將代碼貼上至 iOS 應用程式
    3. `/pair pending` 列出待處理請求（包括角色/scopes）
    4. 核准請求：
       - `/pair approve <requestId>` 用於明確核准
       - `/pair approve` 當只有一個待處理請求時
       - `/pair approve latest` 用於最近的一個

    如果裝置以不同的驗證詳細資料（例如角色/scopes/公開金鑰）重試，先前的待處理請求會被取代，新請求會使用不同的 `requestId`。在核准前請重新執行 `/pair pending`。

    更多詳細資訊：[配對](/en/channels/pairing#pair-via-telegram-recommended-for-ios)。

  </Accordion>

  <Accordion title="內聯按鈕">
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

    帳戶覆寫：

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

  <Accordion title="針對代理和自動化的 Telegram 訊息動作">
    Telegram 工具動作包括：

    - `sendMessage` (`to`, `content`, 可選 `mediaUrl`, `replyToMessageId`, `messageThreadId`)
    - `react` (`chatId`, `messageId`, `emoji`)
    - `deleteMessage` (`chatId`, `messageId`)
    - `editMessage` (`chatId`, `messageId`, `content`)
    - `createForumTopic` (`chatId`, `name`, 可選 `iconColor`, `iconCustomEmojiId`)

    頻道訊息動作公開符合人體工學的別名 (`send`, `react`, `delete`, `edit`, `sticker`, `sticker-search`, `topic-create`)。

    閘道控制：

    - `channels.telegram.actions.sendMessage`
    - `channels.telegram.actions.deleteMessage`
    - `channels.telegram.actions.reactions`
    - `channels.telegram.actions.sticker` (預設：停用)

    注意：`edit` 和 `topic-create` 目前預設為啟用，且沒有個別的 `channels.telegram.actions.*` 開關。
    執行時傳送使用啟用的 config/secrets 快照 (啟動/重新載入)，因此動作路徑不會在每次傳送時執行臨時的 SecretRef 重新解析。

    反應移除語意：[/tools/reactions](/en/tools/reactions)

  </Accordion>

  <Accordion title="Reply threading tags">
    Telegram 支援在生成的輸出中使用明確的回覆串連標籤：

    - `[[reply_to_current]]` 回覆觸發訊息
    - `[[reply_to:<id>]]` 回覆特定的 Telegram 訊息 ID

    `channels.telegram.replyToMode` 控制處理方式：

    - `off` (預設)
    - `first`
    - `all`

    注意：`off` 會停用隱含的回覆串連。明確的 `[[reply_to_*]]` 標籤仍會被接受。

  </Accordion>

  <Accordion title="論壇主題與串流行為">
    論壇超級群組：

    - 主題會話金鑰會附加 `:topic:<threadId>`
    - 回覆與輸入狀態會以主題串為目標
    - 主題設定路徑：
      `channels.telegram.groups.<chatId>.topics.<threadId>`

    一般主題 (`threadId=1`) 的特殊情況：

    - 訊息傳送會省略 `message_thread_id` (Telegram 會拒絕 `sendMessage(...thread_id=1)`)
    - 輸入動作仍然會包含 `message_thread_id`

    主題繼承：主題項目會繼承群組設定，除非被覆寫 (`requireMention`, `allowFrom`, `skills`, `systemPrompt`, `enabled`, `groupPolicy`)。
    `agentId` 僅適用於主題，不會繼承群組預設值。

    **每個主題的代理程式路由**：每個主題可以透過在主題設定中設定 `agentId` 來路由到不同的代理程式。這會賦予每個主題自己獨立的工作區、記憶體和會話。範例：

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

    **持久化的 ACP 主題綁定**：論壇主題可以透過頂層類型化的 ACP 綁定來固定 ACP 操縱器會話：

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

    此功能目前僅限於群組和超級群組中的論壇主題。

    **從聊天產生與串綁定的 ACP**：

    - `/acp spawn <agent> --thread here|auto` 可以將目前的 Telegram 主題綁定到新的 ACP 會話。
    - 後續的主題訊息會直接路由到已綁定的 ACP 會話 (不需要 `/acp steer`)。
    - OpenClaw 會在成功綁定後將產生確認訊息釘選在主題內。
    - 需要 `channels.telegram.threadBindings.spawnAcpSessions=true`。

    樣板內容包括：

    - `MessageThreadId`
    - `IsForum`

    DM 串流行為：

    - 具有 `message_thread_id` 的私人聊天會保留 DM 路由，但使用具備串感知能力的會話金鑰/回覆目標。

  </Accordion>

  <Accordion title="音訊、影片和貼圖">
    ### 音訊訊息

    Telegram 區分語音訊息和音訊檔案。

    - 預設：音訊檔案行為
    - 在代理回覆中標記 `[[audio_as_voice]]` 以強制發送語音訊息

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

    Telegram 區分影片檔案和影片訊息（圓形訊息）。

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

    傳入貼圖處理：

    - 靜態 WEBP：下載並處理（預留位置 `<media:sticker>`）
    - 動畫 TGS：跳過
    - 影片 WEBM：跳過

    貼圖內容欄位：

    - `Sticker.emoji`
    - `Sticker.setName`
    - `Sticker.fileId`
    - `Sticker.fileUniqueId`
    - `Sticker.cachedDescription`

    貼圖快取檔案：

    - `~/.openclaw/telegram/sticker-cache.json`

    貼圖會被描述一次（若可能）並快取，以減少重複的視覺辨識呼叫。

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
    Telegram 回應會以 `message_reaction` 更新的形式到達（與訊息內容分開）。

    啟用後，OpenClaw 會將系統事件排入佇列，例如：

    - `Telegram reaction added: 👍 by Alice (@alice) on msg 42`

    設定：

    - `channels.telegram.reactionNotifications`： `off | own | all` （預設值： `own`）
    - `channels.telegram.reactionLevel`： `off | ack | minimal | extensive` （預設值： `minimal`）

    備註：

    - `own` 表示僅針對使用者對機器人傳送訊息的回應（透過已傳送訊息快取盡力而為）。
    - 回應事件仍會遵守 Telegram 存取控制（ `dmPolicy` 、 `allowFrom` 、 `groupPolicy` 、 `groupAllowFrom` ）；未授權的發送者會被丟棄。
    - Telegram 不會在回應更新中提供主題 ID。
      - 非論壇群組會路由到群組聊天會話
      - 論壇群組會路由到群組一般主題會話（ `:topic:1` ），而不是確切的原始主題

    用於輪詢/網路鈎子的 `allowed_updates` 會自動包含 `message_reaction`。

  </Accordion>

  <Accordion title="Ack reactions">
    當 OpenClaw 正在處理傳入訊息時， `ackReaction` 會發送一個確認表情符號。

    解析順序：

    - `channels.telegram.accounts.<accountId>.ackReaction`
    - `channels.telegram.ackReaction`
    - `messages.ackReaction`
    - 代理程式身分表情符號備選（ `agents.list[].identity.emoji` ，否則為 "👀" ）

    備註：

    - Telegram 預期使用 unicode 表情符號（例如 "👀"）。
    - 使用 `""` 來停用頻道或帳戶的回應。

  </Accordion>

  <Accordion title="Config writes from Telegram events and commands">
    頻道配置寫入預設為啟用 (`configWrites !== false`)。

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
    預設：長輪詢。

    Webhook 模式：

    - 設定 `channels.telegram.webhookUrl`
    - 設定 `channels.telegram.webhookSecret` (設定 webhook URL 時為必填)
    - 選用 `channels.telegram.webhookPath` (預設 `/telegram-webhook`)
    - 選用 `channels.telegram.webhookHost` (預設 `127.0.0.1`)
    - 選用 `channels.telegram.webhookPort` (預設 `8787`)

    Webhook 模式的預設本機監聽器綁定至 `127.0.0.1:8787`。

    如果您的公開端點不同，請在前方放置反向代理，並將 `webhookUrl` 指向公開 URL。
    當您刻意需要外部連入流量時，請設定 `webhookHost` (例如 `0.0.0.0`)。

  </Accordion>

  <Accordion title="限制、重試和 CLI 目標">
    - `channels.telegram.textChunkLimit` 預設為 4000。
    - `channels.telegram.chunkMode="newline"` 在長度分割前偏好段落邊界（空白行）。
    - `channels.telegram.mediaMaxMb` （預設 100）限制傳入和傳出的 Telegram 媒體大小。
    - `channels.telegram.timeoutSeconds` 覆寫 Telegram API 客戶端逾時（若未設定，則應用 grammY 預設值）。
    - 群組內容歷史記錄使用 `channels.telegram.historyLimit` 或 `messages.groupChat.historyLimit` （預設 50）；`0` 則停用。
    - DM 歷史記錄控制：
      - `channels.telegram.dmHistoryLimit`
      - `channels.telegram.dms["<user_id>"].historyLimit`
    - `channels.telegram.retry` 設定套用於 Telegram 傳送輔助程式（CLI/工具/動作），以處理可復原的傳出 API 錯誤。

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
    - `--force-document` 將傳出圖片和 GIF 作為文件傳送，而不是壓縮的照片或動態媒體上傳

    動作閘道：

    - `channels.telegram.actions.sendMessage=false` 停用傳出 Telegram 訊息，包括投票
    - `channels.telegram.actions.poll=false` 停用 Telegram 投票建立，同時保持一般傳送啟用

  </Accordion>

  <Accordion title="Telegram 中的執行審批">
    Telegram 支援在審批者私訊中進行執行審批，並可選擇在原始聊天或主題中發佈審批提示。

    配置路徑：

    - `channels.telegram.execApprovals.enabled`
    - `channels.telegram.execApprovals.approvers`
    - `channels.telegram.execApprovals.target` (`dm` | `channel` | `both`，預設： `dm`)
    - `agentFilter`，`sessionFilter`

    審批者必須是 Telegram 使用者 ID 的數字形式。當 `enabled` 為 false 或 `approvers` 為空時，Telegram 不會充當執行審批客戶端。審批請求將退回到其他已配置的審批路由或執行審批備援策略。

    傳遞規則：

    - `target: "dm"` 僅將審批提示發送至已配置的審批者私訊
    - `target: "channel"` 將提示發送回原始 Telegram 聊天/主題
    - `target: "both"` 發送至審批者私訊以及原始聊天/主題

    只有已配置的審批者可以批准或拒絕。非審批者無法使用 `/approve` 且無法使用 Telegram 審批按鈕。

    頻道傳遞會在聊天中顯示指令文字，因此僅在受信任的群組/主題中啟用 `channel` 或 `both`。當提示發送至論壇主題時，OpenClaw 會保留該主題以供審批提示和審批准後的後續跟進使用。

    內嵌審批按鈕也取決於 `channels.telegram.capabilities.inlineButtons` 允許目標表面 (`dm`、`group` 或 `all`)。

    相關文件：[執行審批](/en/tools/exec-approvals)

  </Accordion>
</AccordionGroup>

## 疑難排解

<AccordionGroup>
  <Accordion title="機器人不回應未提及的群組訊息">

    - 如果 `requireMention=false`，Telegram 隱私模式必須允許完整可見性。
      - BotFather: `/setprivacy` -> Disable
      - 然後將機器人移出並重新加入群組
    - 當設定期望未提及的群組訊息時，`openclaw channels status` 會發出警告。
    - `openclaw channels status --probe` 可以檢查明確的數字群組 ID；萬用字元 `"*"` 無法探測成員身份。
    - 快速會話測試：`/activation always`。

  </Accordion>

  <Accordion title="機器人完全看不到群組訊息">

    - 當 `channels.telegram.groups` 存在時，必須列出群組（或包含 `"*"`）
    - 驗證機器人是否為群組成員
    - 檢查日誌：`openclaw logs --follow` 以了解跳過原因

  </Accordion>

  <Accordion title="指令部分運作或完全無法運作">

    - 授權您的發送者身分（配對和/或數字 `allowFrom`）
    - 即使群組原則是 `open`，指令授權仍然適用
    - `setMyCommands failed` 搭配 `BOT_COMMANDS_TOO_MUCH` 表示原生選單項目過多；請減少外掛程式/技能/自訂指令或停用原生選單
    - `setMyCommands failed` 搭配網路/擷取錯誤通常表示對 `api.telegram.org` 的 DNS/HTTPS 連線問題

  </Accordion>

  <Accordion title="輪詢或網路不穩定">

    - Node 22+ + 自訂 fetch/proxy 若 AbortSignal 類型不相符，可能會觸發立即中止行為。
    - 某些主機會優先將 `api.telegram.org` 解析為 IPv6；IPv6 出站異常可能會導致 Telegram API 間歇性失敗。
    - 如果日誌中包含 `TypeError: fetch failed` 或 `Network request for 'getUpdates' failed!`，OpenClaw 現在會將這些錯誤視為可復原的網路錯誤並進行重試。
    - 在直接出站/TLS 不穩定的 VPS 主機上，透過 `channels.telegram.proxy` 路由 Telegram API 呼叫：

```yaml
channels:
  telegram:
    proxy: socks5://<user>:<password>@proxy-host:1080
```

    - Node 22+ 預設使用 `autoSelectFamily=true`（WSL2 除外）和 `dnsResultOrder=ipv4first`。
    - 如果您的主機是 WSL2 或明確在僅使用 IPv4 的模式下運作更好，請強制選擇協定版本：

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
    - 驗證 DNS 解析結果：

```bash
dig +short api.telegram.org A
dig +short api.telegram.org AAAA
```

  </Accordion>
</AccordionGroup>

更多說明：[頻道疑難排解](/en/channels/troubleshooting)。

## Telegram 設定參考指引

主要參考：

- `channels.telegram.enabled`：啟用/停用頻道啟動。
- `channels.telegram.botToken`：Bot 權杖 (BotFather)。
- `channels.telegram.tokenFile`：從一般檔案路徑讀取權杖。不支援符號連結。
- `channels.telegram.dmPolicy`：`pairing | allowlist | open | disabled`（預設：配對）。
- `channels.telegram.allowFrom`：DM 許可清單（Telegram 數位使用者 ID）。`allowlist` 至少需要一個傳送者 ID。`open` 需要 `"*"`。`openclaw doctor --fix` 可將舊版 `@username` 項目解析為 ID，並可在許可清單遷移流程中從配對儲存檔案復原許可清單項目。
- `channels.telegram.actions.poll`：啟用或停用 Telegram 投票建立（預設：啟用；仍需 `sendMessage`）。
- `channels.telegram.defaultTo`：CLI `--deliver` 使用的預設 Telegram 目標，當未提供明確的 `--reply-to` 時。
- `channels.telegram.groupPolicy`：`open | allowlist | disabled`（預設值：allowlist）。
- `channels.telegram.groupAllowFrom`：群組發送者許可清單（數字形式的 Telegram 使用者 ID）。`openclaw doctor --fix` 可以將舊版的 `@username` 項目解析為 ID。非數字項目在驗證時會被忽略。群組驗證不會使用 DM 配對儲存庫回退機制（`2026.2.25+`）。
- 多帳號優先順序：
  - 當設定了兩個或更多帳號 ID 時，請設定 `channels.telegram.defaultAccount`（或包含 `channels.telegram.accounts.default`）以明確指定預設路由。
  - 如果兩者皆未設定，OpenClaw 將回退至第一個標準化的帳號 ID，並且 `openclaw doctor` 會發出警告。
  - `channels.telegram.accounts.default.allowFrom` 和 `channels.telegram.accounts.default.groupAllowFrom` 僅適用於 `default` 帳號。
  - 當未設定帳號層級的值時，命名帳號會繼承 `channels.telegram.allowFrom` 和 `channels.telegram.groupAllowFrom`。
  - 命名帳號不會繼承 `channels.telegram.accounts.default.allowFrom` / `groupAllowFrom`。
- `channels.telegram.groups`：每個群組的預設值 + 許可清單（使用 `"*"` 設定全域預設值）。
  - `channels.telegram.groups.<id>.groupPolicy`：groupPolicy（`open | allowlist | disabled`）的每個群組覆蓋設定。
  - `channels.telegram.groups.<id>.requireMention`：提及閘控的預設值。
  - `channels.telegram.groups.<id>.skills`：技能過濾器（省略 = 所有技能，空白 = 無）。
  - `channels.telegram.groups.<id>.allowFrom`：每個群組的發送者許可清單覆蓋設定。
  - `channels.telegram.groups.<id>.systemPrompt`：群組的額外系統提示詞。
  - `channels.telegram.groups.<id>.enabled`：當 `false` 時停用該群組。
  - `channels.telegram.groups.<id>.topics.<threadId>.*`：每個主題的覆蓋設定（群組欄位 + 主題專屬的 `agentId`）。
  - `channels.telegram.groups.<id>.topics.<threadId>.agentId`：將此主題路由至特定的代理程式（覆蓋群組層級和綁定路由）。
- `channels.telegram.groups.<id>.topics.<threadId>.groupPolicy`：groupPolicy（`open | allowlist | disabled`）的每個主題覆蓋設定。
- `channels.telegram.groups.<id>.topics.<threadId>.requireMention`：每個主題提及閘門覆寫。
- 頂層 `bindings[]` 包含 `type: "acp"` 和 `match.peer.id` 中的標準主題 ID `chatId:topic:topicId`：持續性 ACP 主題綁定欄位（請參閱 [ACP Agents](/en/tools/acp-agents#channel-specific-settings)）。
- `channels.telegram.direct.<id>.topics.<threadId>.agentId`：將 DM 主題路由至特定代理程式（行為與論壇主題相同）。
- `channels.telegram.execApprovals.enabled`：啟用 Telegram 作為此帳戶的基於聊天執行核准客戶端。
- `channels.telegram.execApprovals.approvers`：獲准核准或拒絕執行請求的 Telegram 使用者 ID。啟用執行核准時為必填。
- `channels.telegram.execApprovals.target`：`dm | channel | both`（預設值：`dm`）。當存在原始 Telegram 主題時，`channel` 和 `both` 會予以保留。
- `channels.telegram.execApprovals.agentFilter`：轉發核准提示的選用性代理程式 ID 篩選器。
- `channels.telegram.execApprovals.sessionFilter`：轉發核准提示的選用性工作階段金鑰篩選器（子字串或 regex）。
- `channels.telegram.accounts.<account>.execApprovals`：Telegram 執行核准路由和核准者授權的每個帳戶覆寫。
- `channels.telegram.capabilities.inlineButtons`：`off | dm | group | all | allowlist`（預設值：allowlist）。
- `channels.telegram.accounts.<account>.capabilities.inlineButtons`：每個帳戶覆寫。
- `channels.telegram.commands.nativeSkills`：啟用/停用 Telegram 原生技能指令。
- `channels.telegram.replyToMode`：`off | first | all`（預設值：`off`）。
- `channels.telegram.textChunkLimit`：傳出區塊大小（字元）。
- `channels.telegram.chunkMode`：`length`（預設值）或 `newline` 以在長度區塊劃分之前依空行（段落邊界）進行分割。
- `channels.telegram.linkPreview`：切換傳出訊息的連結預覽（預設值：true）。
- `channels.telegram.streaming`: `off | partial | block | progress` (即時串流預覽；預設值：`partial`；`progress` 對應至 `partial`；`block` 是舊版預覽模式相容性)。Telegram 預覽串流使用一條會原地編輯的預覽訊息。
- `channels.telegram.mediaMaxMb`: Telegram 傳入/傳出媒體上限 (MB，預設值：100)。
- `channels.telegram.retry`: Telegram 發送輔助程式 (CLI/tools/actions) 在可復原的傳出 API 錯誤上的重試原則 (attempts, minDelayMs, maxDelayMs, jitter)。
- `channels.telegram.network.autoSelectFamily`: 覆寫 Node autoSelectFamily (true=啟用，false=停用)。在 Node 22+ 上預設為啟用，而在 WSL2 上預設為停用。
- `channels.telegram.network.dnsResultOrder`: 覆寫 DNS 結果順序 (`ipv4first` 或 `verbatim`)。在 Node 22+ 上預設為 `ipv4first`。
- `channels.telegram.proxy`: Bot API 呼叫的 Proxy URL (SOCKS/HTTP)。
- `channels.telegram.webhookUrl`: 啟用 Webhook 模式 (需要 `channels.telegram.webhookSecret`)。
- `channels.telegram.webhookSecret`: Webhook 密鑰 (設定 webhookUrl 時為必填)。
- `channels.telegram.webhookPath`: 本地 Webhook 路徑 (預設值：`/telegram-webhook`)。
- `channels.telegram.webhookHost`: 本地 Webhook 綁定主機 (預設值：`127.0.0.1`)。
- `channels.telegram.webhookPort`: 本地 Webhook 綁定連接埠 (預設值：`8787`)。
- `channels.telegram.actions.reactions`: 閘道 Telegram 工具回應。
- `channels.telegram.actions.sendMessage`: 閘道 Telegram 工具訊息發送。
- `channels.telegram.actions.deleteMessage`: 閘道 Telegram 工具訊息刪除。
- `channels.telegram.actions.sticker`: 閘道 Telegram 貼圖動作 — 發送與搜尋 (預設值：false)。
- `channels.telegram.reactionNotifications`: `off | own | all` — 控制哪些回應會觸發系統事件 (未設定時預設值為 `own`)。
- `channels.telegram.reactionLevel`: `off | ack | minimal | extensive` — 控制代理程式的回應能力 (未設定時預設值為 `minimal`)。

- [Telegram 配置參考](/en/gateway/configuration-reference#telegram)

Telegram 專屬的高優先級欄位：

- 啟動/認證： `enabled`、 `botToken`、 `tokenFile`、 `accounts.*`（ `tokenFile` 必須指向一個常規檔案；不接受符號連結）
- 存取控制： `dmPolicy`、 `allowFrom`、 `groupPolicy`、 `groupAllowFrom`、 `groups`、 `groups.*.topics.*`、頂層 `bindings[]`（ `type: "acp"`）
- 執行核准： `execApprovals`、 `accounts.*.execApprovals`
- 指令/選單： `commands.native`、 `commands.nativeSkills`、 `customCommands`
- 執行緒/回覆： `replyToMode`
- 串流： `streaming`（預覽版）、 `blockStreaming`
- 格式/傳送： `textChunkLimit`、 `chunkMode`、 `linkPreview`、 `responsePrefix`
- 媒體/網路： `mediaMaxMb`、 `timeoutSeconds`、 `retry`、 `network.autoSelectFamily`、 `proxy`
- Webhook： `webhookUrl`、 `webhookSecret`、 `webhookPath`、 `webhookHost`
- 動作/功能： `capabilities.inlineButtons`、 `actions.sendMessage|editMessage|deleteMessage|reactions|sticker`
- 反應： `reactionNotifications`、 `reactionLevel`
- 寫入/歷史： `configWrites`、 `historyLimit`、 `dmHistoryLimit`、 `dms.*.historyLimit`

## 相關

- [配對](/en/channels/pairing)
- [頻道路由](/en/channels/channel-routing)
- [多代理路由](/en/concepts/multi-agent)
- [疑難排解](/en/channels/troubleshooting)
