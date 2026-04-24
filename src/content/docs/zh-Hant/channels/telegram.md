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
  <Step title="在 BotFather 中建立機器人權杖">
    開啟 Telegram 並與 **@BotFather** 對話（確認帳號名稱完全為 `@BotFather`）。

    執行 `/newbot`，依照指示操作，並儲存權杖。

  </Step>

  <Step title="設定權杖與 DM 政策">

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

    環境變數後備：`TELEGRAM_BOT_TOKEN=...`（僅適用於預設帳號）。
    Telegram **不**會使用 `openclaw channels login telegram`；請在 config/env 中設定權杖，然後啟動 gateway。

  </Step>

  <Step title="啟動閘道並批准首次 DM">

```bash
openclaw gateway
openclaw pairing list telegram
openclaw pairing approve telegram <CODE>
```

    配對代碼將在 1 小時後過期。

  </Step>

  <Step title="將機器人加入群組">
    將機器人加入您的群組，然後設定 `channels.telegram.groups` 和 `groupPolicy` 以符合您的存取模式。
  </Step>
</Steps>

<Note>權杖解析順序會考慮帳號。實務上，設定值的優先度高於環境變數後備，且 `TELEGRAM_BOT_TOKEN` 僅適用於預設帳號。</Note>

## Telegram 端設定

<AccordionGroup>
  <Accordion title="隱私模式與群組可見性">
    Telegram 機器人預設為 **隱私模式**，這會限制其能收到的群組訊息。

    如果機器人必須查看所有群組訊息，請採取以下其中一種方式：

    - 透過 `/setprivacy` 停用隱私模式，或
    - 將機器人設為群組管理員。

    當切換隱私模式時，請將機器人從各個群組中移除後重新加入，讓 Telegram 套用變更。

  </Accordion>

  <Accordion title="群組權限">
    管理員狀態是在 Telegram 群組設定中控制的。

    管理員機器人會接收所有群組訊息，這對於始終啟用的群組行為非常有用。

  </Accordion>

  <Accordion title="實用的 BotFather 切換選項">

    - `/setjoingroups` 以允許/拒絕將機器人加入群組
    - `/setprivacy` 用於群組可見性行為

  </Accordion>
</AccordionGroup>

## 存取控制與啟用

<Tabs>
  <Tab title="DM policy">
    `channels.telegram.dmPolicy` 控制直接訊息存取：

    - `pairing` (預設)
    - `allowlist` (要求 `allowFrom` 中至少有一個發送者 ID)
    - `open` (要求 `allowFrom` 包含 `"*"`)
    - `disabled`

    `channels.telegram.allowFrom` 接受數字 Telegram 使用者 ID。`telegram:` / `tg:` 前綴會被接受並正規化。
    如果 `dmPolicy: "allowlist"` 的 `allowFrom` 為空，則會封鎖所有 DM，並且會被組態驗證拒絕。
    設定僅要求數字使用者 ID。
    如果您升級後，您的組態包含 `@username` 允許清單條目，請執行 `openclaw doctor --fix` 來解析它們 (盡力而為；需要 Telegram bot token)。
    如果您之前依賴配對儲存 允許清單檔案，`openclaw doctor --fix` 可以在允許清單流程中將條目還原到 `channels.telegram.allowFrom` (例如當 `dmPolicy: "allowlist"` 尚無明確 ID 時)。

    對於單一擁有者的 bot，建議優先使用具有明確數字 `allowFrom` ID 的 `dmPolicy: "allowlist"`，以在組態中保持存取策略持續有效 (而不是依賴先前的配對核准)。

    常見誤解：DM 配對核准並不代表「此發送者在任何地方都已授權」。
    配對僅授與 DM 存取權限。群組發送者授權仍來自明確的組態允許清單。
    如果您希望「我只需授權一次，DM 和群組指令都能運作」，請將您的數字 Telegram 使用者 ID 放入 `channels.telegram.allowFrom`。

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

  <Tab title="群組策略與允許清單">
    兩項控制會同時生效：

    1. **允許哪些群組** (`channels.telegram.groups`)
       - 若無 `groups` 設定：
         - 搭配 `groupPolicy: "open"`：任何群組都能通過群組 ID 檢查
         - 搭配 `groupPolicy: "allowlist"` (預設)：群組會被阻擋，直到您加入 `groups` 條目 (或 `"*"`)
       - 若已設定 `groups`：作為允許清單使用 (明確 ID 或 `"*"`)

    2. **群組中允許哪些發送者** (`channels.telegram.groupPolicy`)
       - `open`
       - `allowlist` (預設)
       - `disabled`

    `groupAllowFrom` 用於篩選群組發送者。若未設定，Telegram 會回退到 `allowFrom`。
    `groupAllowFrom` 條目應為數字格式的 Telegram 使用者 ID (`telegram:` / `tg:` 前綴會被正規化)。
    請勿將 Telegram 群組或超級群組的聊天 ID 放入 `groupAllowFrom`。負數聊天 ID 應置於 `channels.telegram.groups` 之下。
    非數字條目在發送者授權中會被忽略。
    安全邊界 (`2026.2.25+`)：群組發送者授權 **不會** 繼承 DM 配對儲存 (pairing-store) 的核准。
    配對僅限於 DM。對於群組，請設定 `groupAllowFrom` 或每個群組/每個主題的 `allowFrom`。
    若 `groupAllowFrom` 未設定，Telegram 會回退到設定值 `allowFrom`，而非配對儲存。
    單一擁有者機器人的實用模式：將您的使用者 ID 設定在 `channels.telegram.allowFrom`，保持 `groupAllowFrom` 未設定，並在 `channels.telegram.groups` 下允許目標群組。
    執行時期備註：若完全缺少 `channels.telegram`，執行時期預設為 fail-closed (預設拒絕) 的 `groupPolicy="allowlist"`，除非明確設定了 `channels.defaults.groupPolicy`。

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
      常見錯誤：`groupAllowFrom` 不是 Telegram 群組的允許清單。

      - 將負數的 Telegram 群組或超級群組聊天 ID (例如 `-1001234567890`) 置於 `channels.telegram.groups` 之下。
      - 當您想要限制允許群組內哪些人可以觸發機器人時，將 Telegram 使用者 ID (例如 `8734062810`) 置於 `groupAllowFrom` 之下。
      - 僅當您希望允許群組中的任何成員都能與機器人交談時，才使用 `groupAllowFrom: ["*"]`。
    </Warning>

  </Tab>

  <Tab title="Mention behavior">
    群組回覆預設需要提及。

    提及可以來自：

    - 原生 `@botusername` 提及，或
    - 以下內容中的提及模式：
      - `agents.list[].groupChat.mentionPatterns`
      - `messages.groupChat.mentionPatterns`

    層級指令切換：

    - `/activation always`
    - `/activation mention`

    這些僅更新會話狀態。請使用設定以保持持久性。

    持久性設定範例：

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
- DM 訊息可以攜帶 `message_thread_id`；OpenClaw 使用具備執行緒感知能力的會話金鑰路由它們，並為回覆保留執行緒 ID。
- 長輪詢使用 grammY runner 並進行每個聊天/每個執行緒的排序。整體 runner sink 並發性使用 `agents.defaults.maxConcurrent`。
- 長輪詢監看狗重新啟動會在預設 120 秒內未完成 `getUpdates` 存活檢查後觸發。僅當您的部署在長時間執行的工作中仍出現錯誤的輪詢停滯重新啟動時，才增加 `channels.telegram.pollingStallThresholdMs`。該值以毫秒為單位，允許範圍從 `30000` 到 `600000`；支援帳號層級的覆寫。
- Telegram Bot API 不支援已讀回執（`sendReadReceipts` 不適用）。

## 功能參考

<AccordionGroup>
  <Accordion title="即時串流預覽 (訊息編輯)">
    OpenClaw 可以即時串流部分回覆：

    - 直接聊天：預覽訊息 + `editMessageText`
    - 群組/主題：預覽訊息 + `editMessageText`

    需求：

    - `channels.telegram.streaming` 為 `off | partial | block | progress` (預設：`partial`)
    - `progress` 在 Telegram 上對應至 `partial` (與跨頻道命名相容)
    - `streaming.preview.toolProgress` 控制工具/進度更新是否重複使用同一個編輯後的預覽訊息 (預設：`true`)。設定 `false` 以保留分開的工具/進度訊息。
    - 舊版 `channels.telegram.streamMode` 與布林值 `streaming` 會自動對應

    針對純文字回覆：

    - DM：OpenClaw 保留同一則預覽訊息並進行最終就地編輯 (不會有第二則訊息)
    - 群組/主題：OpenClaw 保留同一則預覽訊息並進行最終就地編輯 (不會有第二則訊息)

    針對複雜回覆 (例如媒體 payload)，OpenClaw 會回退至正常的最終傳遞，然後清理預覽訊息。

    預覽串流與區塊串流是分開的。當 Telegram 明確啟用區塊串流時，OpenClaw 會跳過預覽串流以避免重複串流。

    如果原生草稿傳輸無法使用或被拒絕，OpenClaw 會自動回退至 `sendMessage` + `editMessageText`。

    Telegram 專用的推理串流：

    - `/reasoning stream` 在生成時將推理傳送至即時預覽
    - 最終答案會在不包含推理文字的情況下傳送

  </Accordion>

  <Accordion title="格式化與 HTML 回退">
    外寄文字使用 Telegram `parse_mode: "HTML"`。

    - 類 Markdown 文字會轉譯為 Telegram 安全的 HTML。
    - 原始模型 HTML 會被逸出以減少 Telegram 解析失敗。
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

    - 名稱會被正規化（移除開頭的 `/`，轉為小寫）
    - 有效模式：`a-z`、`0-9`、`_`，長度 `1..32`
    - 自訂指令無法覆寫原生指令
    - 衝突/重複項目將被跳過並記錄

    備註：

    - 自訂指令僅為選單項目；它們不會自動實作行為
    - 外掛/技能指令即使在 Telegram 選單中未顯示，在輸入時仍可運作

    如果停用原生指令，內建項目將被移除。若經設定，自訂/外掛指令仍可註冊。

    常見設定失敗：

    - `setMyCommands failed` 搭配 `BOT_COMMANDS_TOO_MUCH` 表示 Telegram 選單在修剪後仍然溢位；請減少外掛/技能/自訂指令或停用 `channels.telegram.commands.native`。
    - `setMyCommands failed` 搭配網路/fetch 錯誤通常表示對 `api.telegram.org` 的連出 DNS/HTTPS 被封鎖。

    ### 裝置配對指令 (`device-pair` 外掛)

    當安裝 `device-pair` 外掛時：

    1. `/pair` 產生設定碼
    2. 在 iOS App 中貼上程式碼
    3. `/pair pending` 列出待處理請求（包括角色/範圍）
    4. 批准請求：
       - `/pair approve <requestId>` 用於明確批准
       - `/pair approve` 當只有一個待處理請求時
       - `/pair approve latest` 用於最新的請求

    設定碼攜帶短期有效的 bootstrap token。內建 bootstrap 交接將主要節點 token 保留在 `scopes: []`；任何交接的操作員 token 仍然受限於 `operator.approvals`、`operator.read`、`operator.talk.secrets` 和 `operator.write`。Bootstrap 範圍檢查帶有角色前綴，因此操作員允許清單僅滿足操作員請求；非操作員角色仍需要在其自身角色前綴下的範圍。

    如果裝置使用變更的驗證詳細資料（例如角色/範圍/公開金鑰）重試，先前的待處理請求將被取代，新請求將使用不同的 `requestId`。請在批准前重新執行 `/pair pending`。

    更多詳細資訊：[配對](/zh-Hant/channels/pairing#pair-via-telegram-recommended-for-ios)。

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

    - `sendMessage` (`to`, `content`, 選用的 `mediaUrl`, `replyToMessageId`, `messageThreadId`)
    - `react` (`chatId`, `messageId`, `emoji`)
    - `deleteMessage` (`chatId`, `messageId`)
    - `editMessage` (`chatId`, `messageId`, `content`)
    - `createForumTopic` (`chatId`, `name`, 選用的 `iconColor`, `iconCustomEmojiId`)

    頻道訊息動作提供符合人體工學的別名 (`send`, `react`, `delete`, `edit`, `sticker`, `sticker-search`, `topic-create`)。

    閘道控制：

    - `channels.telegram.actions.sendMessage`
    - `channels.telegram.actions.deleteMessage`
    - `channels.telegram.actions.reactions`
    - `channels.telegram.actions.sticker` (預設：停用)

    注意：`edit` 和 `topic-create` 目前預設為啟用，且沒有個別的 `channels.telegram.actions.*` 切換開關。
    執行階段傳送使用現有的組態/密碼快照 (啟動/重新載入)，因此動作路徑不會在每次傳送時執行臨時 SecretRef 重新解析。

    移除反應語意：[/tools/reactions](/zh-Hant/tools/reactions)

  </Accordion>

  <Accordion title="回覆串接標籤">
    Telegram 支援在生成的輸出中使用明確的回覆串接標籤：

    - `[[reply_to_current]]` 回覆觸發訊息
    - `[[reply_to:<id>]]` 回覆特定的 Telegram 訊息 ID

    `channels.telegram.replyToMode` 控制處理方式：

    - `off` (預設)
    - `first`
    - `all`

    備註：`off` 會停用隱含的回覆串接。明確的 `[[reply_to_*]]` 標籤仍然會被遵守。

  </Accordion>

  <Accordion title="論壇主題與執行緒行為">
    論壇超級群組：

    - 主題會話金鑰會附加 `:topic:<threadId>`
    - 回覆與輸入目標針對主題執行緒
    - 主題設定路徑：
      `channels.telegram.groups.<chatId>.topics.<threadId>`

    一般主題（`threadId=1`）的特殊情況：

    - 訊息發送會省略 `message_thread_id`（Telegram 會拒絕 `sendMessage(...thread_id=1)`）
    - 輸入動作仍會包含 `message_thread_id`

    主題繼承：主題條目會繼承群組設定，除非被覆寫（`requireMention`、`allowFrom`、`skills`、`systemPrompt`、`enabled`、`groupPolicy`）。
    `agentId` 僅限主題使用，不會繼承群組預設值。

    **依主題的代理程式路由**：每個主題可以透過在主題設定中設定 `agentId` 來路由到不同的代理程式。這會賦予每個主題自己獨立的工作區、記憶體和會話。範例：

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

    **持續性 ACP 主題綁定**：論壇主題可以透過頂層類型化的 ACP 綁定來釘選 ACP 駝具會話：

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
    - 後續的主題訊息會直接路由到綁定的 ACP 會話（不需要 `/acp steer`）。
    - OpenClaw 會在成功綁定後將產生確認訊息釘選於主題內。
    - 需要 `channels.telegram.threadBindings.spawnAcpSessions=true`。

    模板內容包括：

    - `MessageThreadId`
    - `IsForum`

    DM 執行緒行為：

    - 擁有 `message_thread_id` 的私人聊天會保留 DM 路由，但使用具備執行緒感知能力的會話金鑰/回覆目標。

  </Accordion>

  <Accordion title="Audio, video, and stickers">
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

    - 靜態 WEBP：下載並處理（佔位符 `<media:sticker>`）
    - 動態 TGS：跳過
    - 影片 WEBM：跳過

    貼圖上下文欄位：

    - `Sticker.emoji`
    - `Sticker.setName`
    - `Sticker.fileId`
    - `Sticker.fileUniqueId`
    - `Sticker.cachedDescription`

    貼圖快取檔案：

    - `~/.openclaw/telegram/sticker-cache.json`

    貼圖會被描述一次（當可能的情況下）並快取，以減少重複的視覺呼叫。

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
    Telegram 回應會作為 `message_reaction` 更新到達（與訊息負載分開）。

    啟用後，OpenClaw 會將系統事件加入佇列，例如：

    - `Telegram reaction added: 👍 by Alice (@alice) on msg 42`

    設定：

    - `channels.telegram.reactionNotifications`: `off | own | all` (預設: `own`)
    - `channels.telegram.reactionLevel`: `off | ack | minimal | extensive` (預設: `minimal`)

    備註：

    - `own` 表示僅限使用者對機器人發送訊息的回應（透過已發送訊息快取盡力而為）。
    - 回應事件仍會遵守 Telegram 存取控制 (`dmPolicy`, `allowFrom`, `groupPolicy`, `groupAllowFrom`)；未授權的發送者會被捨棄。
    - Telegram 不會在回應更新中提供執行緒 ID。
      - 非論壇群組會路由至群組聊天工作階段
      - 論壇群組會路由至群組的一般主題工作階段 (`:topic:1`)，而非確切的原始主題

    輪詢/Webhook 的 `allowed_updates` 會自動包含 `message_reaction`。

  </Accordion>

  <Accordion title="Ack reactions">
    當 OpenClaw 正在處理傳入訊息時，`ackReaction` 會發送確認表情符號。

    解析順序：

    - `channels.telegram.accounts.<accountId>.ackReaction`
    - `channels.telegram.ackReaction`
    - `messages.ackReaction`
    - 代理程式身分表情符號後援 (`agents.list[].identity.emoji`，否則為 "👀")

    備註：

    - Telegram 預期為 unicode 表情符號 (例如 "👀")。
    - 使用 `""` 以停用頻道或帳戶的回應。

  </Accordion>

  <Accordion title="來自 Telegram 事件和指令的配置寫入">
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

<Accordion title="群組中的模型選擇器授權">群組模型選擇器內聯按鈕需要與 `/models` 相同的授權。未經授權的參與者可以瀏覽並點擊按鈕，但 OpenClaw 會在更改會話模型之前拒絕回調。</Accordion>

  <Accordion title="長輪詢 vs Webhook">
    預設：長輪詢。

    Webhook 模式：

    - 設定 `channels.telegram.webhookUrl`
    - 設定 `channels.telegram.webhookSecret` (設定 webhook URL 時為必填)
    - 選填 `channels.telegram.webhookPath` (預設 `/telegram-webhook`)
    - 選填 `channels.telegram.webhookHost` (預設 `127.0.0.1`)
    - 選填 `channels.telegram.webhookPort` (預設 `8787`)

    Webhook 模式的預設本地監聽器綁定至 `127.0.0.1:8787`。

    如果您的公開端點不同，請在前方放置反向代理並將 `webhookUrl` 指向公開 URL。
    當您刻意需要外部流入流量時，設定 `webhookHost` (例如 `0.0.0.0`)。

    grammY webhook 回調會在 5 秒內返回 200，以便 Telegram 不會將長時間執行的更新作為讀取逾時重試；較長的工作會在背景繼續執行。輪詢會在 `getUpdates` 次 409 衝突後重建 HTTP 傳輸，因此重試會使用新的 TCP 連線，而不是在 Telegram 終止的 keep-alive socket 上循環。

  </Accordion>

  <Accordion title="限制、重試與 CLI 目標">
    - `channels.telegram.textChunkLimit` 預設為 4000。
    - `channels.telegram.chunkMode="newline"` 偏好在進行長度分割前以段落邊界（空白行）為準。
    - `channels.telegram.mediaMaxMb` （預設 100）限制傳入與傳出的 Telegram 媒體大小。
    - `channels.telegram.timeoutSeconds` 覆蓋 Telegram API 客戶端逾時設定（若未設定，則套用 grammY 預設值）。
    - `channels.telegram.pollingStallThresholdMs` 預設為 `120000`；僅針對誤判的輪詢停頓重啟，將其調整於 `30000` 與 `600000` 之間。
    - 群組情境記錄使用 `channels.telegram.historyLimit` 或 `messages.groupChat.historyLimit` （預設 50）；`0` 則停用此功能。
    - 回覆/引言/轉發的補充情境目前會直接傳遞收到的內容。
    - Telegram 白名單主要控制誰能觸發代理程式，而非完整的補充情境編輯邊界。
    - DM 記錄控制：
      - `channels.telegram.dmHistoryLimit`
      - `channels.telegram.dms["<user_id>"].historyLimit`
    - `channels.telegram.retry` 設定套用於 Telegram 發送輔助程式 （CLI/tools/actions），針對可復原的傳出 API 錯誤。

    CLI 發送目標可以是數位聊天 ID 或使用者名稱：

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

    Telegram 發送也支援：

    - 當 `channels.telegram.capabilities.inlineButtons` 允許時，使用 `buttons` 區塊的 `--presentation` 用於內聯鍵盤
    - 當機器人可在該聊天中釘選訊息時，使用 `--pin` 或 `--delivery '{"pin":true}'` 請求釘選傳遞
    - `--force-document` 將傳出的圖片與 GIF 以文件形式傳送，而非壓縮的照片或動態媒體上傳

    動作閘控：

    - `channels.telegram.actions.sendMessage=false` 停用傳出的 Telegram 訊息，包括投票
    - `channels.telegram.actions.poll=false` 停用 Telegram 投票建立，同時維持一般傳送功能啟用

  </Accordion>

  <Accordion title="Telegram 中的執行審批">
    Telegram 支援在審批者的私人訊息（DM）中進行執行審批，並可選擇在原始聊天或主題中發佈審批提示。

    配置路徑：

    - `channels.telegram.execApprovals.enabled`
    - `channels.telegram.execApprovals.approvers`（可選；在可能情況下，回退到從 `allowFrom` 和直接 `defaultTo` 推斷出的數字擁有者 ID）
    - `channels.telegram.execApprovals.target`（`dm` | `channel` | `both`，預設：`dm`）
    - `agentFilter`、`sessionFilter`

    審批者必須是 Telegram 的數字用戶 ID。當 `enabled` 未設定或為 `"auto"` 且至少可以解析到一位審批者時（無論是從 `execApprovals.approvers` 還是從帳戶的數字擁有者配置 `allowFrom` 和直接訊息 `defaultTo`），Telegram 會自動啟用原生執行審批。將 `enabled: false` 設定為可明確停用 Telegram 作為原生審批客戶端。否則，審批請求將回退到其他已配置的審批路由或執行審批回退策略。

    Telegram 也會呈現其他聊天頻道使用的共用審批按鈕。原生 Telegram 配接器主要增加了審批者 DM 路由、頻道/主題分發以及發送前的輸入提示。
    當這些按鈕存在時，它們是主要的審批 UX；OpenClaw 應僅在工具結果指出聊天審批不可用或手動審批是唯一途徑時，才包含手動 `/approve` 指令。

    傳送規則：

    - `target: "dm"` 僅將審批提示傳送給已解析的審批者 DM
    - `target: "channel"` 將提示傳送回原始 Telegram 聊天/主題
    - `target: "both"` 傳送給審批者 DM 和原始聊天/主題

    只有已解析的審批者才能核准或拒絕。非審批者無法使用 `/approve` 且無法使用 Telegram 審批按鈕。

    審批解析行為：

    - 前綴為 `plugin:` 的 ID 始終透過外掛程式審批進行解析。
    - 其他審批 ID 先嘗試 `exec.approval.resolve`。
    - 如果 Telegram 也被授權進行外掛程式審批，且閘道表示執行審批未知/已過期，Telegram 會透過 `plugin.approval.resolve` 重試一次。
    - 真正的執行審批拒絕/錯誤不會靜默回退到外掛程式審批解析。

    頻道傳送會在聊天中顯示指令文字，因此僅在受信任的群組/主題中啟用 `channel` 或 `both`。當提示落在論壇主題中時，OpenClaw 會為審批提示和審批後的後續追蹤保留該主題。執行審批預設在 30 分鐘後過期。

    內嵌審批按鈕也取決於 `channels.telegram.capabilities.inlineButtons` 是否允許目標介面（`dm`、`group` 或 `all`）。

    相關文件：[執行審批](/zh-Hant/tools/exec-approvals)

  </Accordion>
</AccordionGroup>

## 錯誤回覆控制

當代理程式遇到傳遞或提供者錯誤時，Telegram 可以回覆錯誤文字或隱藏該錯誤。有兩個設定金鑰控制此行為：

| 金鑰                                | 數值              | 預設    | 說明                                                               |
| ----------------------------------- | ----------------- | ------- | ------------------------------------------------------------------ |
| `channels.telegram.errorPolicy`     | `reply`, `silent` | `reply` | `reply` 會向聊天發送友善的錯誤訊息。 `silent` 完全隱藏錯誤回覆。   |
| `channels.telegram.errorCooldownMs` | 數字 (毫秒)       | `60000` | 對同一個聊天傳送錯誤回覆的最小間隔時間。防止中斷期間錯誤訊息氾濫。 |

支援每個帳戶、每個群組和每個主題的覆蓋設定（繼承規則與其他 Telegram 設定金鑰相同）。

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

    - 如果是 `requireMention=false`，Telegram 隱私模式必須允許完整可見性。
      - BotFather: `/setprivacy` -> Disable
      - 然後將 Bot 從群組移除並重新加入
    - 當設定預期未提及的群組訊息時，`openclaw channels status` 會發出警告。
    - `openclaw channels status --probe` 可以檢查明確的數字群組 ID；萬用字元 `"*"` 無法探測成員資格。
    - 快速會話測試：`/activation always`。

  </Accordion>

  <Accordion title="Bot not seeing group messages at all">

    - 當 `channels.telegram.groups` 存在時，群組必須被列出（或包含 `"*"`）
    - 驗證 Bot 在群組中的成員資格
    - 檢查日誌：`openclaw logs --follow` 以了解跳過原因

  </Accordion>

  <Accordion title="指令部分運作或完全無法運作">

    - 授權您的發送者身分（配對和/或數字 `allowFrom`）
    - 即使群組原則為 `open`，指令授權仍然適用
    - `setMyCommands failed` 伴隨 `BOT_COMMANDS_TOO_MUCH` 表示原生選單項目過多；請減少外掛程式/技能/自訂指令或停用原生選單
    - `setMyCommands failed` 伴隨網路/擷取錯誤通常表示對 `api.telegram.org` 的 DNS/HTTPS 連線能力問題

  </Accordion>

  <Accordion title="輪詢或網路不穩定">

    - Node 22+ + 自訂 fetch/proxy 若 AbortSignal 類型不匹配，可能會觸發立即中止行為。
    - 部分主機會優先將 `api.telegram.org` 解析為 IPv6；損壞的 IPv6 出站連線可能導致間歇性的 Telegram API 失敗。
    - 如果日誌包含 `TypeError: fetch failed` 或 `Network request for 'getUpdates' failed!`，OpenClaw 現在會將這些作為可恢復的網路錯誤進行重試。
    - 如果日誌包含 `Polling stall detected`，OpenClaw 將在預設 120 秒內沒有完成長輪詢活躍檢測後，重新啟動輪詢並重建 Telegram 傳輸層。
    - 僅當長時間執行的 `getUpdates` 呼叫健康但您的主機仍回報錯誤的輪詢停頓重啟時，才增加 `channels.telegram.pollingStallThresholdMs`。持續停頓通常指向主機與 `api.telegram.org` 之間的代理、DNS、IPv6 或 TLS 出站問題。
    - 在具有不穩定直接出站/TLS 的 VPS 主機上，透過 `channels.telegram.proxy` 路由 Telegram API 呼叫：

```yaml
channels:
  telegram:
    proxy: socks5://<user>:<password>@proxy-host:1080
```

    - Node 22+ 預設使用 `autoSelectFamily=true`（WSL2 除外）和 `dnsResultOrder=ipv4first`。
    - 如果您的主機是 WSL2 或明確在僅 IPv4 行為下運作更好，請強制選擇家族：

```yaml
channels:
  telegram:
    network:
      autoSelectFamily: false
```

    - RFC 2544 基準範圍的回應 (`198.18.0.0/15`) 預設已允許用於
      Telegram 媒體下載。如果受信任的偽 IP 或透明代理在下載媒體時將
      `api.telegram.org` 重寫為其他私有/內部/特殊用途位址，您可以選擇啟用僅限 Telegram 的繞過：

```yaml
channels:
  telegram:
    network:
      dangerouslyAllowPrivateNetwork: true
```

    - 每個帳戶都可以在
      `channels.telegram.accounts.<accountId>.network.dangerouslyAllowPrivateNetwork` 使用相同的選項。
    - 如果您的代理將 Telegram 媒體主機解析為 `198.18.x.x`，請先保持
      危險旗標關閉。Telegram 媒體預設已允許 RFC 2544 基準範圍。

    <Warning>
      `channels.telegram.network.dangerouslyAllowPrivateNetwork` 會減弱 Telegram
      媒體 SSRF 保護。僅在受信任的操作員控制的代理環境（如 Clash、Mihomo 或 Surge 偽 IP 路由）中使用，
      當它們綜合出 RFC 2544 基準範圍之外的私有或特殊用途回應時。對於正常的公眾網際網路 Telegram 存取，請將其關閉。
    </Warning>

    - 環境覆寫（暫時性）：
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
- `channels.telegram.dmPolicy`：`pairing | allowlist | open | disabled`（預設值：pairing）。
- `channels.telegram.allowFrom`：DM 許可清單（Telegram 數位使用者 ID）。`allowlist` 需要至少一個發送者 ID。`open` 需要 `"*"`。`openclaw doctor --fix` 可以將舊版 `@username` 項目解析為 ID，並可以在許可清單遷移流程中從配對存放區檔案中復原許可清單項目。
- `channels.telegram.actions.poll`：啟用或停用 Telegram 投票建立（預設值：已啟用；仍需要 `sendMessage`）。
- `channels.telegram.defaultTo`：當未提供明確的 `--reply-to` 時，CLI `--deliver` 使用的預設 Telegram 目標。
- `channels.telegram.groupPolicy`：`open | allowlist | disabled`（預設值：allowlist）。
- `channels.telegram.groupAllowFrom`：群組發送者許可清單（Telegram 數位使用者 ID）。`openclaw doctor --fix` 可以將舊版 `@username` 項目解析為 ID。非數字項目在驗證時會被忽略。群組驗證不使用 DM 配對存放區備援（`2026.2.25+`）。
- 多重帳號優先順序：
  - 當設定兩個或多個帳號 ID 時，請設定 `channels.telegram.defaultAccount`（或包含 `channels.telegram.accounts.default`）以明確指定預設路由。
  - 如果兩者都未設定，OpenClaw 將退回到第一個正規化帳號 ID，並且 `openclaw doctor` 會發出警告。
  - `channels.telegram.accounts.default.allowFrom` 和 `channels.telegram.accounts.default.groupAllowFrom` 僅適用於 `default` 帳號。
  - 當未設定帳號層級的值時，具名帳號會繼承 `channels.telegram.allowFrom` 和 `channels.telegram.groupAllowFrom`。
  - 命名帳戶不繼承 `channels.telegram.accounts.default.allowFrom` / `groupAllowFrom`。
- `channels.telegram.groups`：各群組預設值 + 白名單（使用 `"*"` 作為全域預設值）。
  - `channels.telegram.groups.<id>.groupPolicy`：groupPolicy 的各群組覆寫 (`open | allowlist | disabled`)。
  - `channels.telegram.groups.<id>.requireMention`：提及閘門預設值。
  - `channels.telegram.groups.<id>.skills`：技能過濾器（省略 = 所有技能，空白 = 無）。
  - `channels.telegram.groups.<id>.allowFrom`：各群組發送者白名單覆寫。
  - `channels.telegram.groups.<id>.systemPrompt`：群組的額外系統提示。
  - `channels.telegram.groups.<id>.enabled`：當 `false` 時停用該群組。
  - `channels.telegram.groups.<id>.topics.<threadId>.*`：各主題覆寫（群組欄位 + 主題專屬 `agentId`）。
  - `channels.telegram.groups.<id>.topics.<threadId>.agentId`：將此主題路由到特定代理（覆寫群組層級和綁定路由）。
- `channels.telegram.groups.<id>.topics.<threadId>.groupPolicy`：groupPolicy 的各主題覆寫 (`open | allowlist | disabled`)。
- `channels.telegram.groups.<id>.topics.<threadId>.requireMention`：各主題提及閘門覆寫。
- `match.peer.id` 中帶有 `type: "acp"` 和標準主題 ID `chatId:topic:topicId` 的頂層 `bindings[]`：持久化 ACP 主題綁定欄位（請參閱 [ACP Agents](/zh-Hant/tools/acp-agents#channel-specific-settings)）。
- `channels.telegram.direct.<id>.topics.<threadId>.agentId`：將 DM 主題路由到特定代理（行為與論壇主題相同）。
- `channels.telegram.execApprovals.enabled`：為此帳戶啟用 Telegram 作為基於聊天 的 exec 審核客戶端。
- `channels.telegram.execApprovals.approvers`：獲准批准或拒絕 exec 請求的 Telegram 使用者 ID。當 `channels.telegram.allowFrom` 或直接 `channels.telegram.defaultTo` 已識別擁有者時為選填。
- `channels.telegram.execApprovals.target`：`dm | channel | both`（預設：`dm`）。`channel` 和 `both` 會在存在時保留原始 Telegram 主題。
- `channels.telegram.execApprovals.agentFilter`：轉送審核提示的選用代理 ID 過濾器。
- `channels.telegram.execApprovals.sessionFilter`：轉發的核准提示的可選會話金鑰過濾器（子字串或正則表達式）。
- `channels.telegram.accounts.<account>.execApprovals`：每個帳戶的 Telegram 執行核准路由和核准者授權覆蓋設定。
- `channels.telegram.capabilities.inlineButtons`：`off | dm | group | all | allowlist`（預設值：allowlist）。
- `channels.telegram.accounts.<account>.capabilities.inlineButtons`：每個帳戶的覆蓋設定。
- `channels.telegram.commands.nativeSkills`：啟用/停用 Telegram 原生技能指令。
- `channels.telegram.replyToMode`：`off | first | all`（預設值：`off`）。
- `channels.telegram.textChunkLimit`：出站區塊大小（字元數）。
- `channels.telegram.chunkMode`：`length`（預設值）或 `newline`，在按長度分塊之前於空白行（段落邊界）進行分割。
- `channels.telegram.linkPreview`：切換出站訊息的連結預覽（預設值：true）。
- `channels.telegram.streaming`：`off | partial | block | progress`（即時串流預覽；預設值：`partial`；`progress` 對應至 `partial`；`block` 為舊版預覽模式相容性）。Telegram 預覽串流使用的是一條就地編輯的預覽訊息。
- `channels.telegram.streaming.preview.toolProgress`：當啟用預覽串流時，重複使用即時預覽訊息來進行工具/進度更新（預設值：`true`）。設定 `false` 以保留獨立的工具/進度訊息。
- `channels.telegram.mediaMaxMb`：入站/出站 Telegram 媒體上限（MB，預設值：100）。
- `channels.telegram.retry`：針對可復原的出站 API 錯誤，Telegram 發送輔助程式（CLI/工具/動作）的重試原則（attempts、minDelayMs、maxDelayMs、jitter）。
- `channels.telegram.network.autoSelectFamily`：覆蓋 Node autoSelectFamily（true=啟用，false=停用）。在 Node 22+ 上預設為啟用，WSL2 則預設為停用。
- `channels.telegram.network.dnsResultOrder`：覆蓋 DNS 結果順序（`ipv4first` 或 `verbatim`）。在 Node 22+ 上預設為 `ipv4first`。
- `channels.telegram.network.dangerouslyAllowPrivateNetwork`：危險的選項，僅適用於受信任的假 IP 或透明代理環境，在該環境下 Telegram 媒體下載會將 `api.telegram.org` 解析為預設 RFC 2544 基準範圍許可之外的私有/內部/特殊用途位址。
- `channels.telegram.proxy`：Bot API 呼叫的代理 URL (SOCKS/HTTP)。
- `channels.telegram.webhookUrl`：啟用 webhook 模式（需要 `channels.telegram.webhookSecret`）。
- `channels.telegram.webhookSecret`：webhook 金鑰（設定 webhookUrl 時為必填）。
- `channels.telegram.webhookPath`：本機 webhook 路徑（預設為 `/telegram-webhook`）。
- `channels.telegram.webhookHost`：本機 webhook 綁定主機（預設為 `127.0.0.1`）。
- `channels.telegram.webhookPort`：本機 webhook 綁定連接埠（預設為 `8787`）。
- `channels.telegram.actions.reactions`：控管 Telegram 工具反應。
- `channels.telegram.actions.sendMessage`：控管 Telegram 工具訊息傳送。
- `channels.telegram.actions.deleteMessage`：控管 Telegram 工具訊息刪除。
- `channels.telegram.actions.sticker`：控管 Telegram 貼圖動作 — 傳送與搜尋（預設：false）。
- `channels.telegram.reactionNotifications`：`off | own | all` — 控制哪些反應會觸發系統事件（未設定時預設為 `own`）。
- `channels.telegram.reactionLevel`：`off | ack | minimal | extensive` — 控制 Agent 的反應能力（未設定時預設為 `minimal`）。
- `channels.telegram.errorPolicy`：`reply | silent` — 控制錯誤回覆行為（預設為 `reply`）。支援針對每個帳號/群組/主題進行覆寫。
- `channels.telegram.errorCooldownMs`：對同一個聊天進行錯誤回覆之間的最小毫秒間隔（預設為 `60000`）。防止在服務中斷期間產生錯誤洗版。

- [組態參考 - Telegram](/zh-Hant/gateway/configuration-reference#telegram)

Telegram 特有的高重要性欄位：

- 啟動/認證： `enabled`， `botToken`， `tokenFile`， `accounts.*`（`tokenFile` 必須指向一般檔案；不支援符號連結）
- 存取控制： `dmPolicy`， `allowFrom`， `groupPolicy`， `groupAllowFrom`， `groups`， `groups.*.topics.*`，頂層 `bindings[]`（`type: "acp"`）
- 執行核准： `execApprovals`， `accounts.*.execApprovals`
- 指令/選單： `commands.native`， `commands.nativeSkills`， `customCommands`
- 執行緒/回覆： `replyToMode`
- 串流： `streaming`（預覽）， `streaming.preview.toolProgress`， `blockStreaming`
- 格式/傳遞： `textChunkLimit`， `chunkMode`， `linkPreview`， `responsePrefix`
- 媒體/網路： `mediaMaxMb`， `timeoutSeconds`， `pollingStallThresholdMs`， `retry`， `network.autoSelectFamily`， `network.dangerouslyAllowPrivateNetwork`， `proxy`
- Webhook： `webhookUrl`， `webhookSecret`， `webhookPath`， `webhookHost`
- 動作/功能： `capabilities.inlineButtons`， `actions.sendMessage|editMessage|deleteMessage|reactions|sticker`
- 反應： `reactionNotifications`， `reactionLevel`
- 錯誤： `errorPolicy`， `errorCooldownMs`
- 寫入/歷史： `configWrites`， `historyLimit`， `dmHistoryLimit`， `dms.*.historyLimit`

## 相關

- [配對](/zh-Hant/channels/pairing)
- [群組](/zh-Hant/channels/groups)
- [安全性](/zh-Hant/gateway/security)
- [頻道路由](/zh-Hant/channels/channel-routing)
- [多代理路由](/zh-Hant/concepts/multi-agent)
- [疑難排解](/zh-Hant/channels/troubleshooting)
