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
    Telegram 的預設 DM 政策為配對模式。
  </Card>
  <Card title="頻道故障排除" icon="wrench" href="/en/channels/troubleshooting">
    跨頻道診斷與修復手冊。
  </Card>
  <Card title="閘道器設定" icon="settings" href="/en/gateway/configuration">
    完整的頻道設定範例與模式。
  </Card>
</CardGroup>

## 快速設定

<Steps>
  <Step title="在 BotFather 中建立 bot token">
    開啟 Telegram 並與 **@BotFather** 對話（確認 handle 完全是 `@BotFather`）。

    執行 `/newbot`，依照提示操作，並儲存 token。

  </Step>

  <Step title="設定 token 與 DM 政策">

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

    Env 後備：`TELEGRAM_BOT_TOKEN=...`（僅限預設帳戶）。
    Telegram **不會**使用 `openclaw channels login telegram`；請在 config/env 中設定 token，然後啟動 gateway。

  </Step>

  <Step title="啟動 gateway 並核准首個 DM">

```bash
openclaw gateway
openclaw pairing list telegram
openclaw pairing approve telegram <CODE>
```

    配對碼會在 1 小時後過期。

  </Step>

  <Step title="將機器人新增至群組">
    將機器人新增至您的群組，然後設定 `channels.telegram.groups` 和 `groupPolicy` 以符合您的存取模型。
  </Step>
</Steps>

<Note>Token 解析順序具有帳號感知能力。實際上，組態值會優先於環境變數後備，且 `TELEGRAM_BOT_TOKEN` 僅適用於預設帳號。</Note>

## Telegram 端設定

<AccordionGroup>
  <Accordion title="隱私模式與群組可見性">
    Telegram 機器人預設為 **隱私模式**，這會限制它們能接收的群組訊息。

    如果機器人必須查看所有群組訊息，請執行以下任一操作：

    - 透過 `/setprivacy` 停用隱私模式，或
    - 將機器人設為群組管理員。

    當切換隱私模式時，請在每個群組中移除並重新加入機器人，讓 Telegram 套用變更。

  </Accordion>

  <Accordion title="群組權限">
    管理員狀態是在 Telegram 群組設定中控制的。

    管理員機器人會接收所有群組訊息，這對於始終運行的群組行為很有用。

  </Accordion>

  <Accordion title="實用的 BotFather 開關">

    - `/setjoingroups` 用於允許/拒絕群組加入
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

    `channels.telegram.allowFrom` 接受數字 Telegram 用戶 ID。`telegram:` / `tg:` 前綴會被接受並正規化。
    `dmPolicy: "allowlist"` 若 `allowFrom` 為空則會阻擋所有 DM，且會被設定驗證拒絕。
    Onboarding 接受 `@username` 輸入並將其解析為數字 ID。
    如果您升級後您的設定包含 `@username` 允許清單條目，請執行 `openclaw doctor --fix` 來解析它們 (盡力而為；需要 Telegram bot token)。
    如果您先前依賴 pairing-store 允許清單檔案，`openclaw doctor --fix` 可以在允許清單流程中將條目還原至 `channels.telegram.allowFrom` (例如當 `dmPolicy: "allowlist"` 尚無明確 ID 時)。

    對於單一擁有者的 bot，建議優先使用帶有明確數字 `allowFrom` ID 的 `dmPolicy: "allowlist"`，以在設定中保持存取策略持久化 (而非依賴先前的配對核准)。

    ### 尋找您的 Telegram 用戶 ID

    較安全的方式 (無第三方 bot)：

    1. 私訊您的 bot。
    2. 執行 `openclaw logs --follow`。
    3. 讀取 `from.id`。

    官方 Bot API 方法：

```bash
curl "https://api.telegram.org/bot<bot_token>/getUpdates"
```

    第三方方法 (隱私性較低)：`@userinfobot` 或 `@getidsbot`。

  </Tab>

  <Tab title="群組政策與允許清單">
    兩項控制會共同套用：

    1. **哪些群組被允許** (`channels.telegram.groups`)
       - 沒有 `groups` 設定：
         - 搭配 `groupPolicy: "open"`：任何群組都能通過群組 ID 檢查
         - 搭配 `groupPolicy: "allowlist"` (預設)：群組會被阻擋，直到您新增 `groups` 項目 (或 `"*"`)
       - 已設定 `groups`：作為允許清單 (明確 ID 或 `"*"`)

    2. **哪些傳送者在群組中被允許** (`channels.telegram.groupPolicy`)
       - `open`
       - `allowlist` (預設)
       - `disabled`

    `groupAllowFrom` 用於群組傳送者過濾。若未設定，Telegram 會回退至 `allowFrom`。
    `groupAllowFrom` 項目應為數字 Telegram 使用者 ID (`telegram:` / `tg:` 前綴會被正規化)。
    請勿將 Telegram 群組或超級群組聊天 ID 放入 `groupAllowFrom`。負數聊天 ID 應歸於 `channels.telegram.groups`。
    非數字項目在傳送者授權時會被忽略。
    安全邊界 (`2026.2.25+`)：群組傳送者授權**並不**繼承 DM 配對存放區的核准。
    配對僅限 DM。針對群組，請設定 `groupAllowFrom` 或各群組/各主題的 `allowFrom`。
    執行時期備註：若 `channels.telegram` 完全缺失，除非明確設定 `channels.defaults.groupPolicy`，否則執行時期會預設為封閉失敗 `groupPolicy="allowlist"`。

    範例：允許某個特定群組中的任何成員：

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

    範例：僅允許某個特定群組中的特定使用者：

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
      常見錯誤：`groupAllowFrom` 並不是 Telegram 群組允許清單。

      - 請將負數 Telegram 群組或超級群組聊天 ID (如 `-1001234567890`) 放在 `channels.telegram.groups` 下。
      - 當您想限制已允許群組中哪些人可以觸發機器人時，請將 Telegram 使用者 ID (如 `8734062810`) 放在 `groupAllowFrom` 下。
      - 僅在您希望已允許群組的任何成員都能與機器人交談時，才使用 `groupAllowFrom: ["*"]`。
    </Warning>

  </Tab>

  <Tab title="提及行為">
    群組回覆預設需要提及。

    提及可以來自：

    - 原生 `@botusername` 提及，或
    - 以下提及模式：
      - `agents.list[].groupChat.mentionPatterns`
      - `messages.groupChat.mentionPatterns`

    Session 層級指令切換：

    - `/activation always`
    - `/activation mention`

    這些僅更新 session 狀態。請使用 config 進行持久化。

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

    - 將群組訊息轉發到 `@userinfobot` / `@getidsbot`
    - 或從 `openclaw logs --follow` 讀取 `chat.id`
    - 或檢查 Bot API `getUpdates`

  </Tab>
</Tabs>

## 執行時行為

- Telegram 歸屬於 gateway 程序。
- 路由是確定性的：Telegram 的入站訊息會回覆到 Telegram（模型不選擇通道）。
- 入站訊息會正規化為共享通道封包，其中包含回詮中繼資料和媒體預留位置。
- 群組會話依群組 ID 隔離。論壇主題會附加 `:topic:<threadId>` 以保持主題隔離。
- DM 訊息可以攜帶 `message_thread_id`；OpenClaw 使用具備執行緒感知能力的會話金鑰進行路由，並在回覆時保留執行緒 ID。
- 長輪詢使用 grammY 運行器，並採用逐聊 天/逐執行緒的排序。整體運行器接收端併發性使用 `agents.defaults.maxConcurrent`。
- Telegram Bot API 不支援已讀回執（`sendReadReceipts` 不適用）。

## 功能參考

<AccordionGroup>
  <Accordion title="即時串流預覽 (訊息編輯)">
    OpenClaw 可以即時串流部分回覆：

    - 直接聊天：預覽訊息 + `editMessageText`
    - 群組/主題：預覽訊息 + `editMessageText`

    需求：

    - `channels.telegram.streaming` 為 `off | partial | block | progress` (預設：`partial`)
    - `progress` 在 Telegram 上對應至 `partial` (與跨通道命名相容)
    - 舊版 `channels.telegram.streamMode` 和布林值 `streaming` 會自動對應

    對於純文字回覆：

    - DM：OpenClaw 保持相同的預覽訊息並就地進行最終編輯 (不發送第二則訊息)
    - 群組/主題：OpenClaw 保持相同的預覽訊息並就地進行最終編輯 (不發送第二則訊息)

    對於複雜回覆 (例如媒體承載)，OpenClaw 會回退至正常的最終傳遞，然後清理預覽訊息。

    預覽串流與區塊串流是分開的。當 Telegram 明確啟用區塊串流時，OpenClaw 會跳過預覽串流以避免雙重串流。

    如果原生草稿傳輸不可用或被拒絕，OpenClaw 會自動回退至 `sendMessage` + `editMessageText`。

    Telegram 專屬推理串流：

    - `/reasoning stream` 在生成時將推理發送至即時預覽
    - 最終答案發送時不包含推理文字

  </Accordion>

  <Accordion title="格式化與 HTML 備用機制">
    外發文字使用 Telegram `parse_mode: "HTML"`。

    - 類 Markdown 文字會轉譯為 Telegram 安全的 HTML。
    - 原始模型 HTML 會被跳脫，以減少 Telegram 解析失敗。
    - 如果 Telegram 拒絕解析後的 HTML，OpenClaw 會以純文字重試。

    連結預覽預設為啟用，可透過 `channels.telegram.linkPreview: false` 停用。

  </Accordion>

  <Accordion title="原生指令和自訂指令">
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
    - 有效格式：`a-z`、`0-9`、`_`，長度 `1..32`
    - 自訂指令無法覆寫原生指令
    - 衝突/重複的項目會被跳過並記錄下來

    備註：

    - 自訂指令僅為選單項目；它們不會自動實作行為
    - 外掛/技能指令即使未顯示在 Telegram 選單中，在輸入時仍可運作

    如果停用原生指令，內建指令會被移除。如果有設定，自訂/外掛指令仍可能註冊。

    常見設定失敗：

    - `setMyCommands failed` 搭配 `BOT_COMMANDS_TOO_MUCH` 表示 Telegram 選單在修剪後仍然溢位；請減少外掛/技能/自訂指令或停用 `channels.telegram.commands.native`。
    - `setMyCommands failed` 搭配網路/擷取錯誤通常表示對 `api.telegram.org` 的輸出 DNS/HTTPS 被封鎖。

    ### 裝置配對指令 (`device-pair` 外掛)

    當安裝 `device-pair` 外掛時：

    1. `/pair` 產生設定碼
    2. 在 iOS App 中貼上程式碼
    3. `/pair pending` 列出待處理請求（包含角色/範圍）
    4. 核准請求：
       - `/pair approve <requestId>` 用於明確核准
       - `/pair approve` 當只有一個待處理請求時
       - `/pair approve latest` 用於最近的一個

    如果裝置使用變更的驗證詳細資料（例如角色/範圍/公開金鑰）重試，先前的待處理請求會被取代，新請求會使用不同的 `requestId`。請在核准前重新執行 `/pair pending`。

    更多詳細資訊：[配對](/en/channels/pairing#pair-via-telegram-recommended-for-ios)。

  </Accordion>

  <Accordion title="Inline buttons">
    設定內聯鍵盤範圍 (inline keyboard scope)：

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

    每個帳戶的覆寫設定：

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

    範圍 (Scopes)：

    - `off`
    - `dm`
    - `group`
    - `all`
    - `allowlist` (預設)

    舊版 `capabilities: ["inlineButtons"]` 對應到 `inlineButtons: "all"`。

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

    - `sendMessage` (`to`、`content`、選用 `mediaUrl`、`replyToMessageId`、`messageThreadId`)
    - `react` (`chatId`、`messageId`、`emoji`)
    - `deleteMessage` (`chatId`、`messageId`)
    - `editMessage` (`chatId`、`messageId`、`content`)
    - `createForumTopic` (`chatId`、`name`、選用 `iconColor`、`iconCustomEmojiId`)

    頻道訊息動作提供符合人體工學的別名 (`send`、`react`、`delete`、`edit`、`sticker`、`sticker-search`、`topic-create`)。

    閘道控制：

    - `channels.telegram.actions.sendMessage`
    - `channels.telegram.actions.deleteMessage`
    - `channels.telegram.actions.reactions`
    - `channels.telegram.actions.sticker` (預設：停用)

    注意：`edit` 和 `topic-create` 目前預設為啟用，且沒有個別的 `channels.telegram.actions.*` 切換開關。
    執行階段傳送使用使用中的設定/祕密快照 (啟動/重新載入)，因此動作路徑不會在每次傳送時執行臨時 SecretRef 重新解析。

    反應移除語意：[/tools/reactions](/en/tools/reactions)

  </Accordion>

  <Accordion title="Reply threading tags">
    Telegram 支援在生成輸出中使用明確的回覆串接標籤：

    - `[[reply_to_current]]` 回覆觸發訊息
    - `[[reply_to:<id>]]` 回覆特定的 Telegram 訊息 ID

    `channels.telegram.replyToMode` 控制處理方式：

    - `off` (預設)
    - `first`
    - `all`

    注意：`off` 會停用隱含的回覆串接。明確的 `[[reply_to_*]]` 標籤仍會受到遵守。

  </Accordion>

  <Accordion title="論壇主題和執行緒行為">
    論壇超級群組：

    - 主題會話金鑰附加 `:topic:<threadId>`
    - 回覆和打字目標鎖定主題執行緒
    - 主題配置路徑：
      `channels.telegram.groups.<chatId>.topics.<threadId>`

    一般主題 (`threadId=1`) 特殊情況：

    - 訊息發送會省略 `message_thread_id` (Telegram 會拒絕 `sendMessage(...thread_id=1)`)
    - 打字動作仍然包含 `message_thread_id`

    主題繼承：主題條目會繼承群組設定，除非被覆蓋 (`requireMention`, `allowFrom`, `skills`, `systemPrompt`, `enabled`, `groupPolicy`)。
    `agentId` 是僅限主題的，不會繼承群組預設值。

    **每個主題的代理程式路由**：每個主題都可以透過在主題配置中設定 `agentId` 來路由到不同的代理程式。這會賦予每個主題自己獨立的工作區、記憶體和會話。範例：

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

    每個主題隨後擁有自己的會話金鑰：`agent:zu:telegram:group:-1001234567890:topic:3`

    **持久化 ACP 主題綁定**：論壇主題可以透過頂層類型化的 ACP 綁定來固定 ACP 鞍具會話：

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

    **從聊天產生執行緒綁定的 ACP**：

    - `/acp spawn <agent> --thread here|auto` 可以將目前的 Telegram 主題綁定到新的 ACP 會話。
    - 後續的主題訊息會直接路由到已綁定的 ACP 會話 (不需要 `/acp steer`)。
    - OpenClaw 在成功綁定後會在主題內釘選生成確認訊息。
    - 需要 `channels.telegram.threadBindings.spawnAcpSessions=true`。

    樣板內容包括：

    - `MessageThreadId`
    - `IsForum`

    DM 執行緒行為：

    - 具有 `message_thread_id` 的私人聊天會保留 DM 路由，但會使用具備執行緒感知能力的會話金鑰/回覆目標。

  </Accordion>

  <Accordion title="音訊、影片和貼圖">
    ### 音訊訊息

    Telegram 區分語音訊息與音訊檔案。

    - 預設：音訊檔案行為
    - 在 agent 回覆中標記 `[[audio_as_voice]]` 以強制發送語音訊息

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

    影片訊息不支援字幕；提供的訊息文字會單獨發送。

    ### 貼圖

    貼圖傳入處理：

    - 靜態 WEBP：已下載並處理（佔位符 `<media:sticker>`）
    - 動畫 TGS：已跳過
    - 影片 WEBM：已跳過

    貼圖情境欄位：

    - `Sticker.emoji`
    - `Sticker.setName`
    - `Sticker.fileId`
    - `Sticker.fileUniqueId`
    - `Sticker.cachedDescription`

    貼圖快取檔案：

    - `~/.openclaw/telegram/sticker-cache.json`

    貼圖會被描述一次（如果可能的話）並快取，以減少重複的視覺呼叫。

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
    Telegram 反應會以 `message_reaction` 更新的形式到達（與訊息負載分開）。

    啟用後，OpenClaw 會將系統事件排入佇列，例如：

    - `Telegram reaction added: 👍 by Alice (@alice) on msg 42`

    設定：

    - `channels.telegram.reactionNotifications`：`off | own | all`（預設：`own`）
    - `channels.telegram.reactionLevel`：`off | ack | minimal | extensive`（預設：`minimal`）

    備註：

    - `own` 表示僅限使用者對機器人發送訊息的反應（透過已發送訊息快取盡力而為）。
    - 反應事件仍會遵守 Telegram 存取控制（`dmPolicy`、`allowFrom`、`groupPolicy`、`groupAllowFrom`）；未經授權的發送者會被捨棄。
    - Telegram 不會在反應更新中提供主題 ID。
      - 非論壇群組會路由至群組聊天會話
      - 論壇群組會路由至群組一般主題會話（`:topic:1`），而非確切的原始主題

    `allowed_updates` 用於 polling/webhook 時會自動包含 `message_reaction`。

  </Accordion>

  <Accordion title="Ack reactions">
    當 OpenClaw 正在處理傳入訊息時，`ackReaction` 會傳送一個確認表情符號。

    解析順序：

    - `channels.telegram.accounts.<accountId>.ackReaction`
    - `channels.telegram.ackReaction`
    - `messages.ackReaction`
    - 代理身分表情符號後備機制 (`agents.list[].identity.emoji`，否則為 "👀")

    註記：

    - Telegram 預期為 unicode 表情符號 (例如 "👀")。
    - 使用 `""` 來停用特定頻道或帳戶的反應。

  </Accordion>

  <Accordion title="來自 Telegram 事件和指令的設定寫入">
    頻道設定寫入預設為開啟 (`configWrites !== false`)。

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
    - 設定 `channels.telegram.webhookSecret` (設定 Webhook URL 時為必填)
    - 選填 `channels.telegram.webhookPath` (預設 `/telegram-webhook`)
    - 選填 `channels.telegram.webhookHost` (預設 `127.0.0.1`)
    - 選填 `channels.telegram.webhookPort` (預設 `8787`)

    Webhook 模式的預設本地監聽器綁定至 `127.0.0.1:8787`。

    如果您的公開端點不同，請在前方放置反向代理並將 `webhookUrl` 指向公開 URL。
    當您刻意需要外部流入流量時，請設定 `webhookHost` (例如 `0.0.0.0`)。

  </Accordion>

  <Accordion title="限制、重試和 CLI 目標">
    - `channels.telegram.textChunkLimit` 預設為 4000。
    - `channels.telegram.chunkMode="newline"` 偏好在長度分割前使用段落邊界（空行）。
    - `channels.telegram.mediaMaxMb` （預設 100）限制傳入和傳出的 Telegram 媒體大小。
    - `channels.telegram.timeoutSeconds` 覆寫 Telegram API 客戶端逾時（若未設定，則套用 grammY 預設值）。
    - 群組內容歷史記錄使用 `channels.telegram.historyLimit` 或 `messages.groupChat.historyLimit` （預設 50）； `0` 則停用。
    - DM 歷史記錄控制：
      - `channels.telegram.dmHistoryLimit`
      - `channels.telegram.dms["<user_id>"].historyLimit`
    - `channels.telegram.retry` 設定適用於 Telegram 傳送輔助程式（CLI/工具/動作），用於可復原的傳出 API 錯誤。

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

    - `--poll-duration-seconds` （5-600）
    - `--poll-anonymous`
    - `--poll-public`
    - `--thread-id` 用於論壇主題（或使用 `:topic:` 目標）

    Telegram 傳送也支援：

    - `--buttons` 用於內聯鍵盤，當 `channels.telegram.capabilities.inlineButtons` 允許時
    - `--force-document` 將傳出圖片和 GIF 以文件形式傳送，而不是壓縮的照片或動態媒體上傳

    動作閘道：

    - `channels.telegram.actions.sendMessage=false` 停用傳出的 Telegram 訊息，包括投票
    - `channels.telegram.actions.poll=false` 停用 Telegram 投票建立，同時保持一般傳送啟用

  </Accordion>

  <Accordion title="在 Telegram 中執行審批">
    Telegram 支援在審批者的私人訊息（DM）中進行執行審批，並可選擇在原始聊天或主題中發布審批提示。

    配置路徑：

    - `channels.telegram.execApprovals.enabled`
    - `channels.telegram.execApprovals.approvers`
    - `channels.telegram.execApprovals.target` (`dm` | `channel` | `both`, 預設: `dm`)
    - `agentFilter`, `sessionFilter`

    審批者必須是數字格式的 Telegram 使用者 ID。當 `enabled` 為 false 或 `approvers` 為空時，Telegram 不會充當執行審批客戶端。審批請求將回退到其他已配置的審批路由或執行審批回退策略。

    傳遞規則：

    - `target: "dm"` 僅將審批提示發送至已配置的審批者私人訊息
    - `target: "channel"` 將提示發送回原始 Telegram 聊天/主題
    - `target: "both"` 發送至審批者私人訊息及原始聊天/主題

    只有已配置的審批者可以批准或拒絕。非審批者無法使用 `/approve`，也無法使用 Telegram 審批按鈕。

    頻道傳遞會在聊天中顯示指令文字，因此僅在受信任的群組/主題中啟用 `channel` 或 `both`。當提示落於論壇主題時，OpenClaw 會為審批提示和批准後的後續追蹤保留該主題。

    內嵌審批按鈕也取決於 `channels.telegram.capabilities.inlineButtons` 允許目標介面（`dm`、`group` 或 `all`）。

    相關文件：[執行審批](/en/tools/exec-approvals)

  </Accordion>
</AccordionGroup>

## 疑難排解

<AccordionGroup>
  <Accordion title="Bot does not respond to non mention group messages">

    - 如果是 `requireMention=false`，Telegram 隱私模式必須允許完全可見。
      - BotFather: `/setprivacy` -> Disable
      - 然後將機器人從群組中移除並重新加入
    - 當配置期望未提及的群組訊息時，`openclaw channels status` 會發出警告。
    - `openclaw channels status --probe` 可以檢查明確的數字群組 ID；通配符 `"*"` 無法探測成員資格。
    - 快速會話測試：`/activation always`。

  </Accordion>

  <Accordion title="機器人完全看不到群組訊息">

    - 當 `channels.telegram.groups` 存在時，群組必須被列出（或包含 `"*"`）
    - 驗證機器人在群組中的成員身份
    - 檢查日誌：`openclaw logs --follow` 以了解跳過原因

  </Accordion>

  <Accordion title="指令無法運作或僅部分運作">

    - 授權您的發送者身分（配對和/或數字 `allowFrom`）
    - 即使群組原則是 `open`，指令授權仍然適用
    - 出現 `setMyCommands failed` 並伴隨 `BOT_COMMANDS_TOO_MUCH` 表示原生選單項目過多；請減少外掛程式/技能/自訂指令或停用原生選單
    - 出現 `setMyCommands failed` 並伴隨網路/擷取錯誤，通常表示對 `api.telegram.org` 的 DNS/HTTPS 連線性問題

  </Accordion>

  <Accordion title="輪詢或網路不穩定">

    - Node 22+ + 自訂 fetch/proxy 若 AbortSignal 類型不符，可能會觸發立即中止行為。
    - 部份主機會優先將 `api.telegram.org` 解析為 IPv6；損壞的 IPv6 出網連線可能導致 Telegram API 間歇性失敗。
    - 若日誌中包含 `TypeError: fetch failed` 或 `Network request for 'getUpdates' failed!`，OpenClaw 現在會將其視為可復原的網路錯誤並重試。
    - 在直連出網/TLS 不穩定的 VPS 主機上，請將 Telegram API 呼叫透過 `channels.telegram.proxy` 路由：

```yaml
channels:
  telegram:
    proxy: socks5://<user>:<password>@proxy-host:1080
```

    - Node 22+ 預設使用 `autoSelectFamily=true` (WSL2 除外) 和 `dnsResultOrder=ipv4first`。
    - 若您的主機是 WSL2，或明確在僅 IPv4 模式下運作較佳，請強制指定位址族群：

```yaml
channels:
  telegram:
    network:
      autoSelectFamily: false
```

    - 環境變數覆寫 (暫時性)：
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

更多説明：[頻道疑難排解](/en/channels/troubleshooting)。

## Telegram 設定參考指引

主要參考：

- `channels.telegram.enabled`：啟用/停用頻道啟動。
- `channels.telegram.botToken`：機器人權杖。
- `channels.telegram.tokenFile`：從常規檔案路徑讀取權杖。不接受符號連結。
- `channels.telegram.dmPolicy`：`pairing | allowlist | open | disabled`（預設值：pairing）。
- `channels.telegram.allowFrom`：DM 許可清單（Telegram 的數位使用者 ID）。`allowlist` 需要至少一個發送者 ID。`open` 需要 `"*"`。`openclaw doctor --fix` 可以將舊版的 `@username` 項目解析為 ID，並可以在許可清單遷移流程中從 pairing-store 檔案復原許可清單項目。
- `channels.telegram.actions.poll`：啟用或停用 Telegram 投票建立（預設值：啟用；仍需要 `sendMessage`）。
- `channels.telegram.defaultTo`：當未提供明確的 `--reply-to` 時，CLI `--deliver` 使用的預設 Telegram 目標。
- `channels.telegram.groupPolicy`：`open | allowlist | disabled`（預設值：allowlist）。
- `channels.telegram.groupAllowFrom`：群組發送者允許清單（數字 Telegram 使用者 ID）。`openclaw doctor --fix` 可將舊版 `@username` 項目解析為 ID。非數字項目在驗證時會被忽略。群組驗證不使用 DM 配對儲存區後援機制（`2026.2.25+`）。
- 多帳號優先順序：
  - 當設定了兩個或更多帳戶 ID 時，請設定 `channels.telegram.defaultAccount`（或包含 `channels.telegram.accounts.default`）以明確指定預設路由。
  - 如果兩者都未設置，OpenClaw 將回退到第一個標準化的帳戶 ID，並且 `openclaw doctor` 發出警告。
  - `channels.telegram.accounts.default.allowFrom` 和 `channels.telegram.accounts.default.groupAllowFrom` 僅適用於 `default` 帳戶。
  - 當未設置帳戶級別的值時，命名帳戶將繼承 `channels.telegram.allowFrom` 和 `channels.telegram.groupAllowFrom`。
  - 命名帳戶不繼承 `channels.telegram.accounts.default.allowFrom` / `groupAllowFrom`。
- `channels.telegram.groups`：每組預設值 + 允許清單（使用 `"*"` 作為全域預設值）。
  - `channels.telegram.groups.<id>.groupPolicy`：groupPolicy（`open | allowlist | disabled`）的每組覆蓋設置。
  - `channels.telegram.groups.<id>.requireMention`：提及閘門預設值。
  - `channels.telegram.groups.<id>.skills`：技能過濾器（省略 = 所有技能，空值 = 無）。
  - `channels.telegram.groups.<id>.allowFrom`：每個群組的發送者允許清單覆寫。
  - `channels.telegram.groups.<id>.systemPrompt`：群組的額外系統提示詞。
  - `channels.telegram.groups.<id>.enabled`：當 `false` 時停用群組。
  - `channels.telegram.groups.<id>.topics.<threadId>.*`：每個主題的覆寫（群組欄位 + 僅限主題的 `agentId`）。
  - `channels.telegram.groups.<id>.topics.<threadId>.agentId`：將此主題路由至特定代理（覆寫群組層級和綁定路由）。
- `channels.telegram.groups.<id>.topics.<threadId>.groupPolicy`：groupPolicy 的每個主題覆寫（`open | allowlist | disabled`）。
- `channels.telegram.groups.<id>.topics.<threadId>.requireMention`：每個主題的提及閘門覆寫。
- 頂層 `bindings[]`，包含 `type: "acp"` 與規範主題 ID `chatId:topic:topicId` 於 `match.peer.id` 中：持續性 ACP 主題綁定欄位（請參閱 [ACP Agents](/en/tools/acp-agents#channel-specific-settings)）。
- `channels.telegram.direct.<id>.topics.<threadId>.agentId`：將 DM 主題路由至特定 Agent（行為與論壇主題相同）。
- `channels.telegram.execApprovals.enabled`：啟用 Telegram 作為此帳戶的基於聊天執行的批准客戶端。
- `channels.telegram.execApprovals.approvers`：被允許批准或拒絕執行請求的 Telegram 使用者 ID。啟用執行批准時為必填。
- `channels.telegram.execApprovals.target`：`dm | channel | both`（預設值：`dm`）。`channel` 和 `both` 會在存在時保留原始的 Telegram 主題。
- `channels.telegram.execApprovals.agentFilter`：轉發審核提示的選用性代理 ID 篩選器。
- `channels.telegram.execApprovals.sessionFilter`：轉發審核提示的選用性 Session Key 篩選器（子字串或 Regex）。
- `channels.telegram.accounts.<account>.execApprovals`：每個帳戶的 Telegram 執行審核路由與審核者授權覆寫設定。
- `channels.telegram.capabilities.inlineButtons`： `off | dm | group | all | allowlist` （預設值：allowlist）。
- `channels.telegram.accounts.<account>.capabilities.inlineButtons`：每個帳戶的覆寫設定。
- `channels.telegram.commands.nativeSkills`：啟用/停用 Telegram 原生技能指令。
- `channels.telegram.replyToMode`： `off | first | all` （預設值： `off`）。
- `channels.telegram.textChunkLimit`：輸出區塊大小（字元數）。
- `channels.telegram.chunkMode`：`length`（預設）或 `newline` 以在進行長度分塊前依空白行（段落邊界）分割。
- `channels.telegram.linkPreview`：切換外寄訊息的連結預覽（預設：true）。
- `channels.telegram.streaming`：`off | partial | block | progress`（即時串流預覽；預設：`partial`；`progress` 對應至 `partial`；`block` 為舊版預覽模式相容性）。Telegram 預覽串流使用單一預覽訊息並就地編輯。
- `channels.telegram.mediaMaxMb`：Telegram 進出站媒體上限（MB，預設：100）。
- `channels.telegram.retry`：Telegram 發送輔助程式（CLI/tools/actions）在可恢復的輸出 API 錯誤時的重試原則（attempts、minDelayMs、maxDelayMs、jitter）。
- `channels.telegram.network.autoSelectFamily`：覆寫 Node autoSelectFamily（true=啟用，false=停用）。在 Node 22+ 上預設為啟用，WSL2 則預設為停用。
- `channels.telegram.network.dnsResultOrder`：覆寫 DNS 結果順序（`ipv4first` 或 `verbatim`）。在 Node 22+ 上預設為 `ipv4first`。
- `channels.telegram.proxy`：Bot API 呼叫的 Proxy URL（SOCKS/HTTP）。
- `channels.telegram.webhookUrl`：啟用 webhook 模式（需要 `channels.telegram.webhookSecret`）。
- `channels.telegram.webhookSecret`：webhook secret（設定 webhookUrl 時為必填）。
- `channels.telegram.webhookPath`：本機 webhook 路徑（預設 `/telegram-webhook`）。
- `channels.telegram.webhookHost`：本機 webhook 綁定主機（預設 `127.0.0.1`）。
- `channels.telegram.webhookPort`：本機 webhook 綁定連接埠（預設 `8787`）。
- `channels.telegram.actions.reactions`：閘道 Telegram 工具回應。
- `channels.telegram.actions.sendMessage`：閘道 Telegram 工具訊息發送。
- `channels.telegram.actions.deleteMessage`：閘道 Telegram 工具訊息刪除。
- `channels.telegram.actions.sticker`：閘道 Telegram 貼圖動作——發送與搜尋（預設：false）。
- `channels.telegram.reactionNotifications`：`off | own | all` —— 控制哪些回應會觸發系統事件（未設定時預設為 `own`）。
- `channels.telegram.reactionLevel`：`off | ack | minimal | extensive` —— 控制代理程式的回應能力（未設定時預設為 `minimal`）。

- [配置參考 - Telegram](/en/gateway/configuration-reference#telegram)

Telegram 專屬的高優先級欄位：

- 啟動/驗證：`enabled`、`botToken`、`tokenFile`、`accounts.*`（`tokenFile` 必須指向常規檔案；符號連結會被拒絕）
- 存取控制：`dmPolicy`、`allowFrom`、`groupPolicy`、`groupAllowFrom`、`groups`、`groups.*.topics.*`、頂層 `bindings[]`（`type: "acp"`）
- 執行核准：`execApprovals`、`accounts.*.execApprovals`
- 指令/選單：`commands.native`、`commands.nativeSkills`、`customCommands`
- threading/replies: `replyToMode`
- streaming: `streaming` (預覽), `blockStreaming`
- formatting/delivery: `textChunkLimit`, `chunkMode`, `linkPreview`, `responsePrefix`
- media/network: `mediaMaxMb`, `timeoutSeconds`, `retry`, `network.autoSelectFamily`, `proxy`
- webhook: `webhookUrl`, `webhookSecret`, `webhookPath`, `webhookHost`
- actions/capabilities: `capabilities.inlineButtons`, `actions.sendMessage|editMessage|deleteMessage|reactions|sticker`
- reactions: `reactionNotifications`, `reactionLevel`
- writes/history: `configWrites`, `historyLimit`, `dmHistoryLimit`, `dms.*.historyLimit`

## 相關

- [配對](/en/channels/pairing)
- [通道路由](/en/channels/channel-routing)
- [多代理路由](/en/concepts/multi-agent)
- [疑難排解](/en/channels/troubleshooting)
