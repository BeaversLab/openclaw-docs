---
summary: "Telegram bot support status, capabilities, and configuration"
read_when:
  - Working on Telegram features or webhooks
title: "Telegram"
---

# Telegram (Bot API)

狀態：透過 grammY 支援機器人私訊和群組，已具備生產環境可用性。長輪詢為預設模式；Webhook 模式為可選。

<CardGroup cols={3}>
  <Card title="配對" icon="link" href="/zh-Hant/channels/pairing">
    Telegram 的預設 DM 政策是配對。
  </Card>
  <Card title="通道疑難排解" icon="wrench" href="/zh-Hant/channels/troubleshooting">
    跨通道診斷與修復手冊。
  </Card>
  <Card title="Gateway 設定" icon="settings" href="/zh-Hant/gateway/configuration">
    完整的通道設定模式與範例。
  </Card>
</CardGroup>

## 快速設定

<Steps>
  <Step title="在 BotFather 中建立 bot token">
    開啟 Telegram 並與 **@BotFather** 對話（確認帳號代號確切為 `@BotFather`）。

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

    環境變數後備：`TELEGRAM_BOT_TOKEN=...`（僅限預設帳號）。
    Telegram **不**使用 `openclaw channels login telegram`；請在設定/環境變數中設定 token，然後啟動 gateway。

  </Step>

  <Step title="啟動 gateway 並批准第一個 DM">

```bash
openclaw gateway
openclaw pairing list telegram
openclaw pairing approve telegram <CODE>
```

    配對碼會在 1 小時後過期。

  </Step>

  <Step title="將 bot 新增至群組">
    將 bot 新增至您的群組，然後設定 `channels.telegram.groups` 和 `groupPolicy` 以符合您的存取模型。
  </Step>
</Steps>

<Note>
  Token 解析順序會辨識帳號。實務上，設定值會優先於環境變數後備，而 `TELEGRAM_BOT_TOKEN`
  僅適用於預設帳號。
</Note>

## Telegram 端設定

<AccordionGroup>
  <Accordion title="隱私模式和群組可見性">
    Telegram 機器人預設為 **隱私模式**，這會限制它們接收的群組訊息。

    如果機器人必須查看所有群組訊息，請執行下列其中一項：

    - 透過 `/setprivacy` 停用隱私模式，或
    - 將機器人設為群組管理員。

    切換隱私模式時，請將機器人從每個群組中移除並重新新增，以便 Telegram 套用變更。

  </Accordion>

  <Accordion title="群組權限">
    管理員狀態是在 Telegram 群組設定中控制的。

    管理員機器人會接收所有群組訊息，這對於始終啟用的群組行為很有用。

  </Accordion>

  <Accordion title="實用的 BotFather 切換開關">

    - `/setjoingroups` 以允許/拒絕將機器人新增至群組
    - `/setprivacy` 用於群組可見性行為

  </Accordion>
</AccordionGroup>

## 存取控制和啟用

<Tabs>
  <Tab title="DM 政策">
    `channels.telegram.dmPolicy` 控制直接訊息存取：

    - `pairing` (預設)
    - `allowlist` (`allowFrom` 中至少需要一個傳送者 ID)
    - `open` (要求 `allowFrom` 包含 `"*"`)
    - `disabled`

    `channels.telegram.allowFrom` 接受數字 Telegram 用戶 ID。接受並正規化 `telegram:` / `tg:` 前綴。
    如果 `allowFrom` 為空，`dmPolicy: "allowlist"` 將封鎖所有 DM，並且會被配置驗證拒絕。
    Onboarding 接受 `@username` 輸入並將其解析為數字 ID。
    如果您已升級並且配置包含 `@username` 允許清單條目，請執行 `openclaw doctor --fix` 來解析它們 (盡力而為；需要 Telegram bot token)。
    如果您之前依賴配對存儲 (pairing-store) 允許清單文件，在允許清單流程中 `openclaw doctor --fix` 可以將條目恢復到 `channels.telegram.allowFrom` 中 (例如當 `dmPolicy: "allowlist"` 尚無明確 ID 時)。

    對於單一擁有者的 bot，建議優先使用帶有明確數字 `allowFrom` ID 的 `dmPolicy: "allowlist"`，以保持存取策略在配置中的持久性 (而不是依賴先前的配對批准)。

    ### 尋找您的 Telegram 用戶 ID

    更安全的方法 (無第三方 bot)：

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
    兩項控制會共同生效：

    1. **允許哪些群組** (`channels.telegram.groups`)
       - 無 `groups` 設定：
         - 若有 `groupPolicy: "open"`：任何群組都能通過群組 ID 檢查
         - 若有 `groupPolicy: "allowlist"`（預設）：群組會被封鎖，直到您新增 `groups` 項目（或 `"*"`）
       - 已設定 `groups`：作為允許清單（明確 ID 或 `"*"`）

    2. **群組中允許哪些傳送者** (`channels.telegram.groupPolicy`)
       - `open`
       - `allowlist`（預設）
       - `disabled`

    `groupAllowFrom` 用於群組傳送者篩選。若未設定，Telegram 會回退使用 `allowFrom`。
    `groupAllowFrom` 項目應為數字型 Telegram 使用者 ID（`telegram:` / `tg:` 前綴會被正規化）。
    請勿將 Telegram 群組或超級群組聊天 ID 放入 `groupAllowFrom`。負數聊天 ID 應歸於 `channels.telegram.groups` 之下。
    非數字項目在傳送者授權時會被忽略。
    安全邊界 (`2026.2.25+`)：群組傳送者授權**不會**繼承 DM 配對儲存庫的核准。
    配對僅限 DM。針對群組，請設定 `groupAllowFrom` 或各群組/各主題的 `allowFrom`。
    執行時期備註：若完全缺少 `channels.telegram`，執行時期預設為 fail-closed `groupPolicy="allowlist"`，除非明確設定 `channels.defaults.groupPolicy`。

    範例：允許某一特定群組中的任何成員：

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

    範例：僅允許某一特定群組中的特定使用者：

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
      常見錯誤：`groupAllowFrom` 並非 Telegram 群組允許清單。

      - 將負數的 Telegram 群組或超級群組聊天 ID（如 `-1001234567890`）放入 `channels.telegram.groups`。
      - 若您想限制允許群組內哪些人可以觸發機器人，請將 Telegram 使用者 ID（如 `8734062810`）放入 `groupAllowFrom`。
      - 僅當您希望允許群組的任何成員都能與機器人交談時，才使用 `groupAllowFrom: ["*"]`。
    </Warning>

  </Tab>

  <Tab title="提及行為">
    群組回覆預設需要提及。

    提及來源可為：

    - 原生 `@botusername` 提及，或
    - 下列提及模式：
      - `agents.list[].groupChat.mentionPatterns`
      - `messages.groupChat.mentionPatterns`

    層級命令切換：

    - `/activation always`
    - `/activation mention`

    這些僅更新階段狀態。請使用設定以保持永久。

    永久設定範例：

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

    - 將群組訊息轉發至 `@userinfobot` / `@getidsbot`
    - 或從 `openclaw logs --follow` 讀取 `chat.id`
    - 或檢查 Bot API `getUpdates`

  </Tab>
</Tabs>

## 執行時行為

- Telegram 歸閘道器程序所有。
- 路由是確定性的：Telegram 的入站訊息會回覆到 Telegram（模型不會選擇頻道）。
- 入站訊息會正規化為共享頻道封包，其中包含回覆元資料和媒體預留位置。
- 群組階段依群組 ID 隔離。論壇主題會附加 `:topic:<threadId>` 以保持主題隔離。
- 私訊可攜帶 `message_thread_id`；OpenClaw 使用具備執行緒感知的階段金鑰路由，並在回覆時保留執行緒 ID。
- 長輪詢使用具備逐聊天/逐執行緒排序的 grammY 執行器。整體執行器匯排程並發性使用 `agents.defaults.maxConcurrent`。
- Telegram Bot API 不支援已讀回執（`sendReadReceipts` 不適用）。

## 功能參考

<AccordionGroup>
  <Accordion title="直播預覽 (訊息編輯)">
    OpenClaw 可以即時串流部分回覆：

    - 直接聊天：預覽訊息 + `editMessageText`
    - 群組/主題：預覽訊息 + `editMessageText`

    條件：

    - `channels.telegram.streaming` 為 `off | partial | block | progress` (預設值：`partial`)
    - `progress` 在 Telegram 上對應至 `partial` (與跨頻道命名相容)
    - 舊版 `channels.telegram.streamMode` 和布林值 `streaming` 值會自動對應

    對於純文字回覆：

    - DM：OpenClaw 保留相同的預覽訊息並就地執行最終編輯 (無第二則訊息)
    - 群組/主題：OpenClaw 保留相同的預覽訊息並就地執行最終編輯 (無第二則訊息)

    對於複雜的回覆 (例如媒體 payload)，OpenClaw 會回退至正常的最終傳遞，然後清理預覽訊息。

    預覽串流與區塊串流是分開的。當為 Telegram 明確啟用區塊串流時，OpenClaw 會跳過預覽串流以避免重複串流。

    如果無法使用或拒絕原生草稿傳輸，OpenClaw 會自動回退至 `sendMessage` + `editMessageText`。

    Telegram 專用的推理串流：

    - `/reasoning stream` 在生成期間將推理發送至即時預覽
    - 最終答案在發送時不包含推理文字

  </Accordion>

  <Accordion title="格式化與 HTML 回退">
    傳出文字使用 Telegram `parse_mode: "HTML"`。

    - 類 Markdown 的文字會被轉譯為 Telegram 安全的 HTML。
    - 原始模型 HTML 會被跳脫 以減少 Telegram 剖析失敗。
    - 如果 Telegram 拒絕剖析後的 HTML，OpenClaw 會以純文字重試。

    連結預覽預設為啟用，並可透過 `channels.telegram.linkPreview: false` 停用。

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

    - 名稱會經過標準化（移除開頭的 `/`，轉為小寫）
    - 有效格式：`a-z`、`0-9`、`_`，長度 `1..32`
    - 自訂指令無法覆寫原生指令
    - 衝突/重複項目會被跳過並記錄下來

    注意事項：

    - 自訂指令僅是選單項目；它們不會自動實作行為
    - 即使未顯示在 Telegram 選單中，外掛程式/技能指令在輸入時仍然可以運作

    如果停用原生指令，內建指令會被移除。若已設定，自訂/外掛程式指令可能仍會註冊。

    常見設定失敗：

    - `setMyCommands failed` 搭配 `BOT_COMMANDS_TOO_MUCH` 表示 Telegram 選單在修剪後仍然溢位；請減少外掛程式/技能/自訂指令或停用 `channels.telegram.commands.native`。
    - `setMyCommands failed` 搭配網路/擷取錯誤通常表示對 `api.telegram.org` 的連出 DNS/HTTPS 被阻擋。

    ### 裝置配對指令 (`device-pair` 外掛程式)

    當安裝 `device-pair` 外掛程式時：

    1. `/pair` 產生設定程式碼
    2. 將程式碼貼上至 iOS 應用程式
    3. `/pair approve` 核准最新的待處理請求

    更多詳細資訊：[配對](/zh-Hant/channels/pairing#pair-via-telegram-recommended-for-ios)。

  </Accordion>

  <Accordion title="行內按鈕">
    設定行內鍵盤範圍：

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

    帳號層級覆寫：

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
    - `allowlist`（預設）

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

  <Accordion title="適用於代理程式和自動化的 Telegram 訊息動作">
    Telegram 工具動作包括：

    - `sendMessage` (`to`, `content`, 選用 `mediaUrl`, `replyToMessageId`, `messageThreadId`)
    - `react` (`chatId`, `messageId`, `emoji`)
    - `deleteMessage` (`chatId`, `messageId`)
    - `editMessage` (`chatId`, `messageId`, `content`)
    - `createForumTopic` (`chatId`, `name`, 選用 `iconColor`, `iconCustomEmojiId`)

    頻道訊息動作提供符合人體工學的別名 (`send`, `react`, `delete`, `edit`, `sticker`, `sticker-search`, `topic-create`)。

    閘道控制：

    - `channels.telegram.actions.sendMessage`
    - `channels.telegram.actions.deleteMessage`
    - `channels.telegram.actions.reactions`
    - `channels.telegram.actions.sticker` (預設：停用)

    注意：`edit` 和 `topic-create` 目前預設為啟用，且沒有個別的 `channels.telegram.actions.*` 切換開關。
    執行時間傳送使用作用中的設定/機密快照 (啟動/重新載入)，因此動作路徑不會在每次傳送時執行臨時的 SecretRef 重新解析。

    反應移除語意：[/tools/reactions](/zh-Hant/tools/reactions)

  </Accordion>

  <Accordion title="回覆執行緒標籤">
    Telegram 支援在生成的輸出中使用明確的回覆執行緒標籤：

    - `[[reply_to_current]]` 回覆觸發訊息
    - `[[reply_to:<id>]]` 回覆特定的 Telegram 訊息 ID

    `channels.telegram.replyToMode` 控制處理方式：

    - `off` (預設)
    - `first`
    - `all`

    注意：`off` 會停用隱含的回覆執行緒。明確的 `[[reply_to_*]]` 標籤仍然有效。

  </Accordion>

  <Accordion title="Forum topics and thread behavior">
    Forum supergroups:

    - topic session keys append `:topic:<threadId>`
    - replies and typing target the topic thread
    - topic config path:
      `channels.telegram.groups.<chatId>.topics.<threadId>`

    General topic (`threadId=1`) special-case:

    - message sends omit `message_thread_id` (Telegram rejects `sendMessage(...thread_id=1)`)
    - typing actions still include `message_thread_id`

    Topic inheritance: topic entries inherit group settings unless overridden (`requireMention`, `allowFrom`, `skills`, `systemPrompt`, `enabled`, `groupPolicy`).
    `agentId` is topic-only and does not inherit from group defaults.

    **Per-topic agent routing**: Each topic can route to a different agent by setting `agentId` in the topic config. This gives each topic its own isolated workspace, memory, and session. Example:

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

    Each topic then has its own session key: `agent:zu:telegram:group:-1001234567890:topic:3`

    **Persistent ACP topic binding**: Forum topics can pin ACP harness sessions through top-level typed ACP bindings:

    - `bindings[]` with `type: "acp"` and `match.channel: "telegram"`

    Example:

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

    This is currently scoped to forum topics in groups and supergroups.

    **Thread-bound ACP spawn from chat**:

    - `/acp spawn <agent> --thread here|auto` can bind the current Telegram topic to a new ACP session.
    - Follow-up topic messages route to the bound ACP session directly (no `/acp steer` required).
    - OpenClaw pins the spawn confirmation message in-topic after a successful bind.
    - Requires `channels.telegram.threadBindings.spawnAcpSessions=true`.

    Template context includes:

    - `MessageThreadId`
    - `IsForum`

    DM thread behavior:

    - private chats with `message_thread_id` keep DM routing but use thread-aware session keys/reply targets.

  </Accordion>

  <Accordion title="音訊、影片和貼圖">
    ### 音訊訊息

    Telegram 區分語音訊息和音訊檔案。

    - 預設：音訊檔案行為
    - 在 Agent 回覆中加入標籤 `[[audio_as_voice]]` 以強制發送語音訊息

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

    影片訊息不支援標題；提供的訊息文字會分開發送。

    ### 貼圖

    傳入貼圖的處理：

    - 靜態 WEBP：下載並處理（placeholder `<media:sticker>`）
    - 動態 TGS：略過
    - 影片 WEBM：略過

    貼圖情境欄位：

    - `Sticker.emoji`
    - `Sticker.setName`
    - `Sticker.fileId`
    - `Sticker.fileUniqueId`
    - `Sticker.cachedDescription`

    貼圖快取檔案：

    - `~/.openclaw/telegram/sticker-cache.json`

    貼圖會被描述一次（如果可能的話）並快取起來，以減少重複的視覺呼叫。

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

  <Accordion title="反應通知">
    Telegram 的反應會以 `message_reaction` 更新的形式到達（與訊息內容分開）。

    啟用後，OpenClaw 會將系統事件加入佇列，例如：

    - `Telegram reaction added: 👍 by Alice (@alice) on msg 42`

    設定：

    - `channels.telegram.reactionNotifications`： `off | own | all` （預設： `own`）
    - `channels.telegram.reactionLevel`： `off | ack | minimal | extensive` （預設： `minimal`）

    備註：

    - `own` 表示僅限使用者對機器人發送訊息的反應（透過已發送訊息快取盡力而為）。
    - 反應事件仍會遵守 Telegram 存取控制（ `dmPolicy` 、 `allowFrom` 、 `groupPolicy` 、 `groupAllowFrom` ）；未經授權的發送者會被捨棄。
    - Telegram 不會在反應更新中提供執行緒 ID。
      - 非論壇群組會路由到群組聊天階段
      - 論壇群組會路由到群組一般主題階段（ `:topic:1` ），而非確切的原始主題

    用於輪詢/Webhook 的 `allowed_updates` 會自動包含 `message_reaction`。

  </Accordion>

  <Accordion title="Ack 反應">
    當 OpenClaw 正在處理傳入訊息時， `ackReaction` 會發送確認用的表情符號。

    解析順序：

    - `channels.telegram.accounts.<accountId>.ackReaction`
    - `channels.telegram.ackReaction`
    - `messages.ackReaction`
    - 代理身分表情符號後備（ `agents.list[].identity.emoji` ，否則為 "👀"）

    備註：

    - Telegram 預期 unicode 表情符號（例如 "👀"）。
    - 使用 `""` 來停用頻道或帳戶的反應。

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
    預設：長輪詢 (long polling)。

    Webhook 模式：

    - 設定 `channels.telegram.webhookUrl`
    - 設定 `channels.telegram.webhookSecret` (設定 Webhook URL 時為必填)
    - 選填 `channels.telegram.webhookPath` (預設 `/telegram-webhook`)
    - 選填 `channels.telegram.webhookHost` (預設 `127.0.0.1`)
    - 選填 `channels.telegram.webhookPort` (預設 `8787`)

    Webhook 模式的預設本地監聽器綁定至 `127.0.0.1:8787`。

    如果您的公開端點不同，請在前方放置反向代理並將 `webhookUrl` 指向公開 URL。
    當您刻意需要外部流入時，請設定 `webhookHost` (例如 `0.0.0.0`)。

  </Accordion>

  <Accordion title="限制、重試與 CLI 目標">
    - `channels.telegram.textChunkLimit` 預設為 4000。
    - `channels.telegram.chunkMode="newline"` 偏好段落邊界（空白行）優於長度分割。
    - `channels.telegram.mediaMaxMb`（預設 100）限制傳入與傳出的 Telegram 媒體大小。
    - `channels.telegram.timeoutSeconds` 覆寫 Telegram API 客戶端逾時（若未設定，則套用 grammY 預設值）。
    - 群組情境歷史使用 `channels.telegram.historyLimit` 或 `messages.groupChat.historyLimit`（預設 50）；`0` 則停用。
    - 私訊歷史控制：
      - `channels.telegram.dmHistoryLimit`
      - `channels.telegram.dms["<user_id>"].historyLimit`
    - `channels.telegram.retry` 設定套用於 Telegram 發送輔助工具（CLI/tools/actions），用於可復原的傳出 API 錯誤。

    CLI 發送目標可以是數值聊天 ID 或使用者名稱：

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

    Telegram 發送也支援：

    - `--buttons` 用於內聯鍵盤，當 `channels.telegram.capabilities.inlineButtons` 允許時
    - `--force-document` 將傳出圖片與 GIF 以文件形式發送，而非壓縮照片或動態媒體上傳

    動作閘控：

    - `channels.telegram.actions.sendMessage=false` 停用傳出 Telegram 訊息，包含投票
    - `channels.telegram.actions.poll=false` 停用 Telegram 投票建立，同時保留一般發送功能

  </Accordion>

  <Accordion title="在 Telegram 中執行審批">
    Telegram 支援在審批者的私訊（DM）中進行執行審批，並可選擇將審批提示發送到原始聊天或主題。

    設定路徑：

    - `channels.telegram.execApprovals.enabled`
    - `channels.telegram.execApprovals.approvers`
    - `channels.telegram.execApprovals.target` (`dm` | `channel` | `both`，預設值：`dm`)
    - `agentFilter`、`sessionFilter`

    審批者必須是數字格式的 Telegram 使用者 ID。當 `enabled` 為 false 或 `approvers` 為空時，Telegram 不會充當執行審批客戶端。審批請求將回退到其他已設定的審批路由或執行審批回退策略。

    傳送規則：

    - `target: "dm"` 僅將審批提示傳送至已設定的審批者私訊
    - `target: "channel"` 將提示傳送回原始 Telegram 聊天/主題
    - `target: "both"` 同時傳送至審批者私訊及原始聊天/主題

    只有已設定的審批者可以批准或拒絕。非審批者無法使用 `/approve` 且無法使用 Telegram 審批按鈕。

    頻道傳送會在聊天中顯示命令文字，因此僅在信任的群組/主題中啟用 `channel` 或 `both`。當提示進入論壇主題時，OpenClaw 會為審批提示和審批後的後續追蹤保留該主題。

    內嵌審批按鈕也取決於 `channels.telegram.capabilities.inlineButtons` 是否允許目標介面（`dm`、`group` 或 `all`）。

    相關文件：[Exec approvals](/zh-Hant/tools/exec-approvals)

  </Accordion>
</AccordionGroup>

## 疑難排解

<AccordionGroup>
  <Accordion title="機器人未回應非提及的群組訊息">

    - 若 `requireMention=false`，Telegram 隱私模式必須允許完全可見。
      - BotFather：`/setprivacy` -> Disable (停用)
      - 然後將機器人從群組中移除並重新加入
    - 若設定預期未提及的群組訊息，`openclaw channels status` 會發出警告。
    - `openclaw channels status --probe` 可以檢查明確的數字群組 ID；萬用字元 `"*"` 無法探測成員身份。
    - 快速連線測試：`/activation always`。

  </Accordion>

  <Accordion title="機器人完全看不到群組訊息">

    - 當存在 `channels.telegram.groups` 時，群組必須被列出 (或包含 `"*"`)
    - 驗證機器人在群組中的成員身份
    - 檢查日誌：`openclaw logs --follow` 以略過原因

  </Accordion>

  <Accordion title="指令部分無法運作或完全無法運作">

    - 授權您的發送者身分 (配對 和/或 數字 `allowFrom`)
    - 即使群組原則是 `open`，指令授權仍然適用
    - `setMyCommands failed` 伴隨 `BOT_COMMANDS_TOO_MUCH` 表示原生選單項目過多；請減少外掛/技能/自訂指令或停用原生選單
    - `setMyCommands failed` 伴隨網路/擷取錯誤通常表示對 `api.telegram.org` 的 DNS/HTTPS 連線能力問題

  </Accordion>

  <Accordion title="輪詢或網路不穩定">

    - Node 22+ + 自訂 fetch/proxy 若 AbortSignal 類型不符，可能會觸發立即中止行為。
    - 某些主機優先將 `api.telegram.org` 解析為 IPv6；損壞的 IPv6 出站可能會導致間歇性的 Telegram API 失敗。
    - 如果日誌包含 `TypeError: fetch failed` 或 `Network request for 'getUpdates' failed!`，OpenClaw 現在會將這些作為可恢復的網路錯誤重試。
    - 在具有不穩定直接出站/TLS 的 VPS 主機上，透過 `channels.telegram.proxy` 路由 Telegram API 呼叫：

```yaml
channels:
  telegram:
    proxy: socks5://<user>:<password>@proxy-host:1080
```

    - Node 22+ 預設為 `autoSelectFamily=true`（WSL2 除外）和 `dnsResultOrder=ipv4first`。
    - 如果您的主機是 WSL2 或明確在僅 IPv4 行為下運作更好，請強制選擇系列：

```yaml
channels:
  telegram:
    network:
      autoSelectFamily: false
```

    - 環境覆寫（暫時）：
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

更多說明：[頻道故障排除](/zh-Hant/channels/troubleshooting)。

## Telegram 設定參考指引

主要參考：

- `channels.telegram.enabled`：啟用/停用頻道啟動。
- `channels.telegram.botToken`：機器人權杖 (BotFather)。
- `channels.telegram.tokenFile`：從一般檔案路徑讀取權杖。符號連結會被拒絕。
- `channels.telegram.dmPolicy`：`pairing | allowlist | open | disabled`（預設：配對）。
- `channels.telegram.allowFrom`：DM 許可清單（數字 Telegram 使用者 ID）。`allowlist` 至少需要一個傳送者 ID。`open` 需要 `"*"`。`openclaw doctor --fix` 可以將舊版 `@username` 項目解析為 ID，並且可以在許可清單遷移流程中從配對儲存檔案中恢復許可清單項目。
- `channels.telegram.actions.poll`：啟用或停用 Telegram 投票建立（預設：已啟用；仍需 `sendMessage`）。
- `channels.telegram.defaultTo`：當未提供明確的 `--reply-to` 時，CLI `--deliver` 使用的預設 Telegram 目標。
- `channels.telegram.groupPolicy`: `open | allowlist | disabled` (預設: allowlist)。
- `channels.telegram.groupAllowFrom`: 群組發送者允許清單 (數字 Telegram 使用者 ID)。`openclaw doctor --fix` 可將舊版 `@username` 項目解析為 ID。非數字項目在驗證時會被忽略。群組驗證不使用 DM 配對儲存後備 (`2026.2.25+`)。
- 多帳號優先順序：
  - 當設定兩個或多個帳戶 ID 時，請設定 `channels.telegram.defaultAccount` (或包含 `channels.telegram.accounts.default`) 以明確指定預設路由。
  - 若兩者皆未設定，OpenClaw 將回退到第一個正規化的帳戶 ID，並發出 `openclaw doctor` 警告。
  - `channels.telegram.accounts.default.allowFrom` 和 `channels.telegram.accounts.default.groupAllowFrom` 僅適用於 `default` 帳戶。
  - 當帳戶層級的值未設定時，命名帳戶會繼承 `channels.telegram.allowFrom` 和 `channels.telegram.groupAllowFrom`。
  - 命名帳戶不會繼承 `channels.telegram.accounts.default.allowFrom` / `groupAllowFrom`。
- `channels.telegram.groups`: 各群組預設值 + 允許清單 (使用 `"*"` 設定全域預設值)。
  - `channels.telegram.groups.<id>.groupPolicy`: groupPolicy (`open | allowlist | disabled`) 的各群組覆蓋設定。
  - `channels.telegram.groups.<id>.requireMention`: 提及閘門預設值。
  - `channels.telegram.groups.<id>.skills`: 技能過濾器 (省略 = 所有技能，空白 = 無)。
  - `channels.telegram.groups.<id>.allowFrom`: 各群組發送者允許清單覆蓋設定。
  - `channels.telegram.groups.<id>.systemPrompt`: 群組的額外系統提示詞。
  - `channels.telegram.groups.<id>.enabled`: 當 `false` 時停用群組。
  - `channels.telegram.groups.<id>.topics.<threadId>.*`: 各主題覆蓋設定 (群組欄位 + 主題專屬 `agentId`)。
  - `channels.telegram.groups.<id>.topics.<threadId>.agentId`: 將此主題路由至特定代理程式 (覆蓋群組層級和繫結路由)。
- `channels.telegram.groups.<id>.topics.<threadId>.groupPolicy`: groupPolicy (`open | allowlist | disabled`) 的各主題覆蓋設定。
- `channels.telegram.groups.<id>.topics.<threadId>.requireMention`: 各主題提及閘門覆蓋設定。
- 頂層 `bindings[]`，其中包含 `type: "acp"` 和正準主題 ID `chatId:topic:topicId`，位於 `match.peer.id` 中：持久化 ACP 主題綁定欄位（請參閱 [ACP Agents](/zh-Hant/tools/acp-agents#channel-specific-settings)）。
- `channels.telegram.direct.<id>.topics.<threadId>.agentId`：將 DM 主題路由至特定代理程式（行為與論壇主題相同）。
- `channels.telegram.execApprovals.enabled`：啟用 Telegram 作為此帳戶的基於聊天室執行核准用戶端。
- `channels.telegram.execApprovals.approvers`：獲准核准或拒絕執行請求的 Telegram 使用者 ID。啟用執行核准時為必填。
- `channels.telegram.execApprovals.target`：`dm | channel | both`（預設值：`dm`）。`channel` 和 `both` 會在存在時保留來源的 Telegram 主題。
- `channels.telegram.execApprovals.agentFilter`：轉發核准提示的選用性代理程式 ID 篩選器。
- `channels.telegram.execApprovals.sessionFilter`：轉發核准提示的選用性會話金鑰篩選器（子字串或 regex）。
- `channels.telegram.accounts.<account>.execApprovals`：每個帳戶的 Telegram 執行核准路由與核准者授權覆寫。
- `channels.telegram.capabilities.inlineButtons`：`off | dm | group | all | allowlist`（預設值：allowlist）。
- `channels.telegram.accounts.<account>.capabilities.inlineButtons`：每個帳戶的覆寫。
- `channels.telegram.commands.nativeSkills`：啟用/停用 Telegram 原生技能指令。
- `channels.telegram.replyToMode`：`off | first | all`（預設值：`off`）。
- `channels.telegram.textChunkLimit`：輸出區塊大小（字元數）。
- `channels.telegram.chunkMode`：`length`（預設值）或 `newline`，以在按長度區塊分割之前先依空行（段落邊界）分割。
- `channels.telegram.linkPreview`：切換輸出訊息的連結預覽（預設值：true）。
- `channels.telegram.streaming`: `off | partial | block | progress` (即時串流預覽；預設為 `partial`；`progress` 對應至 `partial`；`block` 是舊版預覽模式相容性)。Telegram 預覽串流使用單一預覽訊息進行就地編輯。
- `channels.telegram.mediaMaxMb`: Telegram 媒體入站/出站上限 (MB，預設：100)。
- `channels.telegram.retry`: Telegram 發送輔助工具 (CLI/tools/actions) 在可復原的出站 API 錯誤上的重試原則 (attempts, minDelayMs, maxDelayMs, jitter)。
- `channels.telegram.network.autoSelectFamily`: 覆寫 Node autoSelectFamily (true=啟用, false=停用)。在 Node 22+ 上預設為啟用，WSL2 則預設為停用。
- `channels.telegram.network.dnsResultOrder`: 覆寫 DNS 結果順序 (`ipv4first` 或 `verbatim`)。在 Node 22+ 上預設為 `ipv4first`。
- `channels.telegram.proxy`: Bot API 呼叫的代理 URL (SOCKS/HTTP)。
- `channels.telegram.webhookUrl`: 啟用 webhook 模式 (需要 `channels.telegram.webhookSecret`)。
- `channels.telegram.webhookSecret`: webhook 密鑰 (設定 webhookUrl 時為必填)。
- `channels.telegram.webhookPath`: 本地 webhook 路徑 (預設 `/telegram-webhook`)。
- `channels.telegram.webhookHost`: 本地 webhook 綁定主機 (預設 `127.0.0.1`)。
- `channels.telegram.webhookPort`: 本地 webhook 綁定連接埠 (預設 `8787`)。
- `channels.telegram.actions.reactions`: 閘控 Telegram 工具反應。
- `channels.telegram.actions.sendMessage`: 閘控 Telegram 工具訊息發送。
- `channels.telegram.actions.deleteMessage`: 閘控 Telegram 工具訊息刪除。
- `channels.telegram.actions.sticker`: 閘控 Telegram 貼圖動作 — 發送與搜尋 (預設：false)。
- `channels.telegram.reactionNotifications`: `off | own | all` — 控制哪些反應會觸發系統事件 (未設定時預設為 `own`)。
- `channels.telegram.reactionLevel`: `off | ack | minimal | extensive` — 控制代理的反應能力 (未設定時預設為 `minimal`)。

- [配置參考 - Telegram](/zh-Hant/gateway/configuration-reference#telegram)

Telegram 特有的重要欄位：

- startup/auth: `enabled`, `botToken`, `tokenFile`, `accounts.*` (`tokenFile` 必須指向一般檔案；不接受符號連結)
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
- writes/history: `configWrites`, `historyLimit`, `dmHistoryLimit`, `dms.*.historyLimit`

## 相關連結

- [配對](/zh-Hant/channels/pairing)
- [通道路由](/zh-Hant/channels/channel-routing)
- [多代理路由](/zh-Hant/concepts/multi-agent)
- [疑難排解](/zh-Hant/channels/troubleshooting)

import footerZhHant from "/components/footer/zh-Hant.mdx";

<footerZhHant />
