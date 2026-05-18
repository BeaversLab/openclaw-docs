---
summary: "Telegram 機器人支援狀態、功能及配置"
read_when:
  - Working on Telegram features or webhooks
title: "Telegram"
---

透過 grammY 實現適用於機器人私訊和群組的生產就緒功能。長輪詢是預設模式；Webhook 模式是可選的。

<CardGroup cols={3}>
  <Card title="配對" icon="link" href="/zh-Hant/channels/pairing">
    Telegram 的預設私訊政策是配對。
  </Card>
  <Card title="頻道疑難排解" icon="wrench" href="/zh-Hant/channels/troubleshooting">
    跨頻道診斷與修復操作手冊。
  </Card>
  <Card title="Gateway 配置" icon="settings" href="/zh-Hant/gateway/configuration">
    完整的頻道配置模式與範例。
  </Card>
</CardGroup>

## 快速設定

<Steps>
  <Step title="在 BotFather 中建立機器人權杖">
    開啟 Telegram 並與 **@BotFather** 對話（請確認帳號代碼完全為 `@BotFather`）。

    執行 `/newbot`，依照提示操作，並儲存權杖。

  </Step>

  <Step title="設定權杖與私訊政策">

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
    Telegram **不**使用 `openclaw channels login telegram`；請在 config/env 中設定權杖，然後啟動 gateway。

  </Step>

  <Step title="啟動 gateway 並核准首次私訊">

```bash
openclaw gateway
openclaw pairing list telegram
openclaw pairing approve telegram <CODE>
```

    配對碼會在 1 小時後過期。

  </Step>

  <Step title="將機器人加入群組">
    將機器人加入您的群組，然後取得群組存取所需的兩個 ID：

    - 您的 Telegram 使用者 ID，用於 `allowFrom` / `groupAllowFrom`
    - Telegram 群組聊天 ID，作為 `channels.telegram.groups` 下的鍵值

    若是首次設定，請從 `openclaw logs --follow`、轉發 ID 機器人或 Bot API `getUpdates` 取得群組聊天 ID。群組獲得授權後，`/whoami@<bot_username>` 可以確認使用者和群組 ID。

    以 `-100` 開頭的負數 Telegram 超級群組 ID 即為群組聊天 ID。請將其置於 `channels.telegram.groups` 下，而非 `groupAllowFrom` 下。

  </Step>
</Steps>

<Note>Token 解析順序會區分帳戶。實務上，設定值會優先於環境變數後備值，且 `TELEGRAM_BOT_TOKEN` 僅適用於預設帳戶。 成功啟動後，OpenClaw 會將機器人身份快取在狀態目錄中長達 24 小時，以便重新啟動時能避免額外的 Telegram `getMe` 呼叫；變更或移除 token 將會清除該快取。</Note>

## Telegram 端設定

<AccordionGroup>
  <Accordion title="隱私模式與群組可見性">
    Telegram 機器人預設為**隱私模式**，這會限制它們收到的群組訊息。

    如果機器人必須查看所有群組訊息，請執行以下任一操作：

    - 透過 `/setprivacy` 停用隱私模式，或
    - 將機器人設為群組管理員。

    切換隱私模式時，請在每個群組中移除並重新加入機器人，讓 Telegram 套用變更。

  </Accordion>

  <Accordion title="群組權限">
    管理員狀態是在 Telegram 群組設定中控制。

    管理員機器人會接收所有群組訊息，這對於始終啟用的群組行為很有用。

  </Accordion>

  <Accordion title="實用的 BotFather 切換開關">

    - `/setjoingroups` 以允許/拒絕加入群組
    - `/setprivacy` 用於群組可見性行為

  </Accordion>
</AccordionGroup>

## 存取控制和啟用

<Tabs>
  <Tab title="DM policy">
    `channels.telegram.dmPolicy` 控制直接訊息存取權限：

    - `pairing`（預設）
    - `allowlist`（`allowFrom` 中至少需要一個發送者 ID）
    - `open`（要求 `allowFrom` 包含 `"*"`）
    - `disabled`

    `dmPolicy: "open"` 搭配 `allowFrom: ["*"]` 允許任何發現或猜測到 bot 使用者名稱的 Telegram 帳戶控制 bot。僅將其用於工具嚴格限制的故意公開 bot；單一擁有者的 bot 應使用 `allowlist` 搭配數位使用者 ID。

    `channels.telegram.allowFrom` 接受數位 Telegram 使用者 ID。`telegram:` / `tg:` 前綴會被接受並正規化。
    在多帳號設定中，限制性的頂層 `channels.telegram.allowFrom` 被視為安全邊界：除非合併後的有效帳號允許清單仍包含明確的萬用字元，否則帳號層級的 `allowFrom: ["*"]` 項目不會使該帳號公開。
    `dmPolicy: "allowlist"` 若 `allowFrom` 為空會封鎖所有 DM，並且會被設定驗證拒絕。
    安裝設定僅要求數位使用者 ID。
    如果您已升級且設定包含 `@username` 允許清單項目，請執行 `openclaw doctor --fix` 來解析它們（盡力而為；需要 Telegram bot token）。
    如果您之前依賴 pairing-store 允許清單檔案，`openclaw doctor --fix` 可以在允許清單流程中將項目恢復到 `channels.telegram.allowFrom`（例如當 `dmPolicy: "allowlist"` 尚無明確 ID 時）。

    對於單一擁有者的 bot，建議優先使用 `dmPolicy: "allowlist"` 搭配明確的數位 `allowFrom` ID，以保持設定中的存取政策持久（而不是依賴先前的配對批准）。

    常見誤解：DM 配對批准並不意味著「此發送者在任何地方都已獲授權」。
    配對授予 DM 存取權。如果尚無指令擁有者，第一次批准的配對也會設定 `commands.ownerAllowFrom`，因此僅限擁有者的指令和執行批准具有明確的操作員帳戶。
    群組發送者授權仍來自明確的設定允許清單。
    如果您想要「我獲得一次授權，DM 和群組指令皆可運作」，請將您的數位 Telegram 使用者 ID 放入 `channels.telegram.allowFrom`；對於僅限擁有者的指令，請確保 `commands.ownerAllowFrom` 包含 `telegram:<your user id>`。

    ### 尋找您的 Telegram 使用者 ID

    更安全的方式（無第三方 bot）：

    1. 傳送私訊給您的 bot。
    2. 執行 `openclaw logs --follow`。
    3. 讀取 `from.id`。

    官方 Bot API 方法：

```bash
curl "https://api.telegram.org/bot<bot_token>/getUpdates"
```

    第三方方法（隱私性較低）：`@userinfobot` 或 `@getidsbot`。

  </Tab>

  <Tab title="群組政策和允許清單">
    兩個控制項一起套用：

    1. **允許哪些群組** (`channels.telegram.groups`)
       - 沒有 `groups` 配置：
         - 配合 `groupPolicy: "open"`：任何群組都可以通過群組 ID 檢查
         - 配合 `groupPolicy: "allowlist"`（預設）：群組會被封鎖，直到您新增 `groups` 項目（或 `"*"`）
       - 已設定 `groups`：作為允許清單（明確的 ID 或 `"*"`）

    2. **群組中允許哪些發送者** (`channels.telegram.groupPolicy`)
       - `open`
       - `allowlist`（預設）
       - `disabled`

    `groupAllowFrom` 用於群組發送者過濾。如果未設定，Telegram 會退回到 `allowFrom`。
    `groupAllowFrom` 項目應為數字 Telegram 使用者 ID（`telegram:` / `tg:` 前綴會被正規化）。
    請勿將 Telegram 群組或超級群組聊天 ID 放入 `groupAllowFrom`。負數聊天 ID 應放在 `channels.telegram.groups` 下。
    非數字項目在發送者授權中會被忽略。
    安全邊界 (`2026.2.25+`)：群組發送者驗證**不會**繼承 DM 配對儲存庫的核准。
    配對僅限於 DM。對於群組，請設定 `groupAllowFrom` 或每個群組/每個主題的 `allowFrom`。
    如果未設定 `groupAllowFrom`，Telegram 會退回到配置 `allowFrom`，而不是配對儲存庫。
    單一擁有者機器人的實用模式：在 `channels.telegram.allowFrom` 中設定您的使用者 ID，保留 `groupAllowFrom` 未設定，並在 `channels.telegram.groups` 下允許目標群組。
    執行時備註：如果 `channels.telegram` 完全缺失，執行時預設為失敗關閉 (fail-closed) 的 `groupPolicy="allowlist"`，除非明確設定了 `channels.defaults.groupPolicy`。

    僅限擁有者的群組設定：

```json5
{
  channels: {
    telegram: {
      enabled: true,
      dmPolicy: "pairing",
      allowFrom: ["<YOUR_TELEGRAM_USER_ID>"],
      groupPolicy: "allowlist",
      groups: {
        "<GROUP_CHAT_ID>": {
          requireMention: true,
        },
      },
    },
  },
}
```

    在群組中使用 `@<bot_username> ping` 測試。一般的群組訊息不會觸發機器人，但 `requireMention: true` 可以。

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

      - 將負數 Telegram 群組或超級群組聊天 ID（例如 `-1001234567890`）放在 `channels.telegram.groups` 下。
      - 當您想要限制允許群組內的哪些人可以觸發機器人時，將 Telegram 使用者 ID（例如 `8734062810`）放在 `groupAllowFrom` 下。
      - 僅當您希望允許群組的任何成員都能與機器人交談時，才使用 `groupAllowFrom: ["*"]`。

    </Warning>

  </Tab>

  <Tab title="提及行為">
    群組回覆預設需要提及。

    提及可以來自：

    - 原生 `@botusername` 提及，或
    - 以下內容中的提及模式：
      - `agents.list[].groupChat.mentionPatterns`
      - `messages.groupChat.mentionPatterns`

    會話層級指令切換：

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
    - 在允許群組後，如果啟用了原生指令，請執行 `/whoami@<bot_username>`

  </Tab>
</Tabs>

## 執行時行為

- Telegram 由 gateway 程序擁有。
- 路由是確定性的：Telegram 的入站回覆會回傳給 Telegram（模型不會選擇頻道）。
- 傳入訊息會正規化為共享通道封包，其中包含回覆中繼資料、媒體預留位置，以及網關已觀察到的 Telegram 回覆之持久化回覆鏈上下文。
- 群組會話依群組 ID 隔離。論壇主題會附加 `:topic:<threadId>` 以保持主題隔離。
- DM 訊息可以攜帶 `message_thread_id`；OpenClaw 會在回覆時保留執行緒 ID，但預設將 DM 保持在一般會話中。當您有意要進行 DM 主題會話隔離時，請設定 `channels.telegram.dm.threadReplies: "inbound"`、`channels.telegram.direct.<chatId>.threadReplies: "inbound"`、`requireTopic: true` 或相符的主題設定。
- 長輪詢使用帶有每聊天/每執行緒排序的 grammY runner。整體 runner sink 並發使用 `agents.defaults.maxConcurrent`。
- 多帳號啟動會限制並發的 Telegram `getMe` 探測，因此大型 Bot 機群不會立即擴散每個帳號的探測。
- 長輪詢在每個閘道程序內受到保護，因此一次只有一個主動輪詢器可以使用 Bot token。如果您仍然看到 `getUpdates` 409 衝突，則另一個 OpenClaw 閘道、腳本或外部輪詢器可能正在使用相同的 token。
- 長輪詢看門狗預設在 120 秒內未完成 `getUpdates` 存活檢查後觸發重啟。僅當您的部署在長時間運行的工作中仍然出現錯誤的輪詢停頓重啟時，才增加 `channels.telegram.pollingStallThresholdMs`。該值以毫秒為單位，允許範圍從 `30000` 到 `600000`；支援針對每個帳戶進行覆寫。
- Telegram Bot API 不支援已讀回執（`sendReadReceipts` 不適用）。

## 功能參考

<AccordionGroup>
  <Accordion title="即時串流預覽（訊息編輯）">
    OpenClaw 可以即時串流部分回覆：

    - 直接聊天：預覽訊息 + `editMessageText`
    - 群組/主題：預覽訊息 + `editMessageText`

    需求：

    - `channels.telegram.streaming` 為 `off | partial | block | progress`（預設值：`partial`）
    - `progress` 會為工具進度保留一個可編輯的狀態草稿，完成時將其清除，並將最終答案作為一般訊息發送
    - `streaming.preview.toolProgress` 控制工具/進度更新是否重用同一個已編輯的預覽訊息（當預覽串流啟用時，預設值為 `true`）
    - `streaming.preview.commandText` 控制這些工具進度行中的 command/exec 詳細資訊：`raw`（預設值，保留已發布的行為）或 `status`（僅工具標籤）
    - 舊版 `channels.telegram.streamMode` 和布林值 `streaming` 值會被偵測到；執行 `openclaw doctor --fix` 以將它們遷移至 `channels.telegram.streaming.mode`

    工具進度預覽更新是指在工具執行時顯示的短狀態行，例如命令執行、檔案讀取、規劃更新、修補摘要，或 Codex 應用程式伺服器模式下的 Codex 前言/評註文字。Telegram 預設保持啟用這些功能，以符合 `v2026.4.22` 及更高版本的 OpenClaw 已發布行為。若要保留答案文字的已編輯預覽但隱藏工具進度行，請設定：

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

    若要保持工具進度可見但隱藏 command/exec 文字，請設定：

    ```json
    {
      "channels": {
        "telegram": {
          "streaming": {
            "mode": "partial",
            "preview": {
              "commandText": "status"
            }
          }
        }
      }
    }
    ```

    當您希望工具進度可見，但不想將最終答案編輯至同一則訊息時，請使用 `progress` 模式。將 command-text 政策放在 `streaming.progress` 之下：

    ```json
    {
      "channels": {
        "telegram": {
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

    僅當您想要僅最終交付時才使用 `streaming.mode: "off"`：Telegram 預覽編輯已停用，且一般工具/進度閒聊會被抑制，而不是作為獨立狀態訊息發送。核准提示、媒體承載和錯誤仍會透過一般最終交付路由。當您只想保留答案預覽編輯並隱藏工具進度狀態行時，請使用 `streaming.preview.toolProgress: false`。

    <Note>
      Telegram 選取的引言回覆是例外。當 `replyToMode` 為 `"first"`、`"all"` 或 `"batched"`，且傳入訊息包含選取的引言文字時，OpenClaw 會透過 Telegram 的原生引言回覆路徑發送最終答案，而不是編輯答案預覽，因此 `streaming.preview.toolProgress` 無法顯示該輪次的短狀態行。沒有選取引言文字的目前訊息回覆仍會保留預覽串流。當工具進度可見性比原生引言回覆更重要時，請設定 `replyToMode: "off"`，或設定 `streaming.preview.toolProgress: false` 以接受此取捨。
    </Note>

    對於純文字回覆：

    - 短 DM/群組/主題預覽：OpenClaw 保持相同的預覽訊息並就地執行最終編輯
    - 分割成多個 Telegram 訊息的長文字最終內容會盡可能重用現有預覽作為第一個最終區塊，然後僅發送剩餘區塊
    - progress-mode 最終內容會清除狀態草稿並使用一般最終交付，而不是將草稿編輯為答案
    - 如果在最終編輯於完成文字確認之前失敗，OpenClaw 會使用一般最終交付並清理過時的預覽

    對於複雜回覆（例如媒體承載），OpenClaw 會退回至一般最終交付，然後清理預覽訊息。

    預覽串流與區塊串流是分開的。當針對 Telegram 明確啟用區塊串流時，OpenClaw 會跳過預覽串流以避免重複串流。

    Telegram 專屬推理串流：

    - `/reasoning stream` 在生成時將推理發送到即時預覽
    - 最終交付後會刪除推理預覽；當推理應保持可見時，請使用 `/reasoning on`
    - 最終答案會在不包含推理文字的情況下發送

  </Accordion>

  <Accordion title="格式化與 HTML 備援">
    外寄文字使用 Telegram `parse_mode: "HTML"`。

    - 類 Markdown 的文字會被轉譯為 Telegram 安全的 HTML。
    - 支援的 Telegram HTML 標籤會被保留；不支援的 HTML 會被跳脫。
    - 如果 Telegram 拒絕解析後的 HTML，OpenClaw 會以純文字重試。

    連結預覽預設為啟用，並可透過 `channels.telegram.linkPreview: false` 停用。

  </Accordion>

  <Accordion title="原生指令與自訂指令">
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
    - 有效格式：`a-z`、`0-9`、`_`，長度 `1..32`
    - 自訂指令無法覆蓋原生指令
    - 衝突/重複項目將被跳過並記錄

    備註：

    - 自訂指令僅為選單項目；它們不會自動實作行為
    - 外掛/技能指令即使在 Telegram 選單中未顯示，只要輸入仍可運作

    如果停用原生指令，內建指令將被移除。若已配置，自訂/外掛指令仍可能註冊。

    常見設定失敗：

    - `setMyCommands failed` 搭配 `BOT_COMMANDS_TOO_MUCH` 表示 Telegram 選單在修剪後仍然溢位；請減少外掛/技能/自訂指令或停用 `channels.telegram.commands.native`。
    - 當直接的 Bot API curl 指令可運作時，`deleteWebhook`、`deleteMyCommands` 或 `setMyCommands` 失敗並顯示 `404: Not Found`，可能表示 `channels.telegram.apiRoot` 被設為完整的 `/bot<TOKEN>` 端點。`apiRoot` 必須僅為 Bot API 根目錄，而 `openclaw doctor --fix` 會移除意外產生的結尾 `/bot<TOKEN>`。
    - `getMe returned 401` 表示 Telegram 拒絕了已設定的 Bot 權杖。請使用目前的 BotFather 權杖更新 `botToken`、`tokenFile` 或 `TELEGRAM_BOT_TOKEN`；OpenClaw 會在輪詢前停止，因此這不會被回報為 webhook 清理失敗。
    - `setMyCommands failed` 搭配網路/擷取錯誤通常表示對 `api.telegram.org` 的出站 DNS/HTTPS 被封鎖。

    ### 裝置配對指令（`device-pair` 外掛）

    當安裝 `device-pair` 外掛時：

    1. `/pair` 產生設定碼
    2. 在 iOS App 中貼上程式碼
    3. `/pair pending` 列出待處理請求（包括角色/範圍）
    4. 批准請求：
       - `/pair approve <requestId>` 用於明確批准
       - `/pair approve` 當只有一個待處理請求時
       - `/pair approve latest` 用於最近的請求

    設定碼攜帶短期有效的啟動權杖。內建設定碼啟動僅限節點：首次連線會建立待處理的節點請求，批准後 Gateway 會傳回具有 `scopes: []` 的持久節點權杖。它不會傳回移交的操作員權杖；操作員存取需要單獨的已批准操作員配對或權杖流程。

    如果裝置使用變更的驗證詳細資料（例如角色/範圍/公開金鑰）重試，先前的待處理請求將被取代，新請求會使用不同的 `requestId`。請在批准前重新執行 `/pair pending`。

    更多詳情：[配對](/zh-Hant/channels/pairing#pair-via-telegram-recommended-for-ios)。

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

    每個帳戶的覆蓋設定：

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

    Mini App 按鈕範例：

```json5
{
  action: "send",
  channel: "telegram",
  to: "123456789",
  message: "Open app:",
  presentation: {
    blocks: [
      {
        type: "buttons",
        buttons: [{ label: "Launch", web_app: { url: "https://example.com/app" } }],
      },
    ],
  },
}
```

    Telegram `web_app` 按鈕僅適用於使用者與機器人之間的私人聊天。

    回調點擊會以文字形式傳遞給代理程式：
    `callback_data: <value>`

  </Accordion>

  <Accordion title="給代理程式和自動化的 Telegram 訊息動作">
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

    注意：`edit` 和 `topic-create` 目前預設為啟用，並且沒有個別的 `channels.telegram.actions.*` 切換開關。
    執行時期傳送使用作用中的設定/機密快照 (啟動/重新載入)，因此動作路徑不會在每次傳送時執行臨時 SecretRef 重新解析。

    回應移除語意：[/tools/reactions](/zh-Hant/tools/reactions)

  </Accordion>

  <Accordion title="Reply threading tags">
    Telegram 支援在生成輸出中使用明確的回覆串接標籤：

    - `[[reply_to_current]]` 回覆觸發訊息
    - `[[reply_to:<id>]]` 回覆特定的 Telegram 訊息 ID

    `channels.telegram.replyToMode` 控制處理方式：

    - `off` (預設)
    - `first`
    - `all`

    當啟用回覆串接且原始 Telegram 文字或說明可用時，OpenClaw 會自動包含原生的 Telegram 引用摘錄。Telegram 將原生引用文字限制為 1024 個 UTF-16 碼位，因此較長的訊息會從開頭開始引用，如果 Telegram 拒絕該引用，則會退回為一般回覆。

    注意：`off` 會停用隱含的回覆串接。明確的 `[[reply_to_*]]` 標籤仍會被採用。

  </Accordion>

  <Accordion title="論壇主題和執行緒行為">
    論壇超級群組：

    - 主題會話金鑰會附加 `:topic:<threadId>`
    - 回覆和輸入指示會鎖定主題執行緒
    - 主題配置路徑：
      `channels.telegram.groups.<chatId>.topics.<threadId>`

    一般主題 (`threadId=1`) 的特殊情況：

    - 訊息發送會省略 `message_thread_id` (Telegram 會拒絕 `sendMessage(...thread_id=1)`)
    - 輸入指示動作仍會包含 `message_thread_id`

    主題繼承：主題條目會繼承群組設定，除非被覆寫 (`requireMention`、`allowFrom`、`skills`、`systemPrompt`、`enabled`、`groupPolicy`)。
    `agentId` 是僅限主題的設定，不會繼承群組預設值。

    **每個主題的代理程式路由**：每個主題可以透過在主題配置中設定 `agentId` 來路由到不同的代理程式。這會賦予每個主題自己獨立的工作區、記憶和會話。例如：

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

    **持續性 ACP 主題綁定**：論壇主題可以透過頂層類型化的 ACP 綁定來固定 ACP 駝具會話 (`bindings[]` 搭配 `type: "acp"` 和 `match.channel: "telegram"`、`peer.kind: "group"`，以及類似 `-1001234567890:topic:42` 的主題限定 ID)。目前範圍僅限群組/超級群組中的論壇主題。請參閱 [ACP Agents](/zh-Hant/tools/acp-agents)。

    **從聊天產生執行緒綁定的 ACP**：`/acp spawn <agent> --thread here|auto` 會將目前主題綁定到新的 ACP 會話；後續訊息會直接路由到該處。OpenClaw 會將產生確認釘選在主題內。需要 `channels.telegram.threadBindings.spawnSessions` 保持啟用 (預設值：`true`)。

    模板上下文會公開 `MessageThreadId` 和 `IsForum`。具有 `message_thread_id` 的 DM 聊天預設會將 DM 路由和回覆中繼資料保留在平面會話上；只有在設定 `threadReplies: "inbound"`、`threadReplies: "always"`、`requireTopic: true` 或符合的主題配置時，才會使用具備執行緒感知能力的會話金鑰。請使用頂層 `channels.telegram.dm.threadReplies` 作為帳戶預設值，或使用 `direct.<chatId>.threadReplies` 針對單一 DM。

  </Accordion>

  <Accordion title="音訊、視訊和貼圖">
    ### 音訊訊息

    Telegram 區分語音訊息和音訊檔案。

    - 預設：音訊檔案行為
    - 在代理程式回覆中使用標籤 `[[audio_as_voice]]` 以強制傳送語音訊息
    - 傳入的語音訊息文字紀錄在代理程式上下文中被標示為機器生成、不受信任的文字；提及偵測仍使用原始文字紀錄，因此提及閘控的語音訊息仍可繼續運作。

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

    Telegram 區分視訊檔案和視訊訊息。

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

    視訊訊息不支援說明文字；提供的訊息文字會單獨傳送。

    ### 貼圖

    傳入貼圖處理：

    - 靜態 WEBP：已下載並處理（預留位置 `<media:sticker>`）
    - 動態 TGS：已跳過
    - 視訊 WEBM：已跳過

    貼圖上下文欄位：

    - `Sticker.emoji`
    - `Sticker.setName`
    - `Sticker.fileId`
    - `Sticker.fileUniqueId`
    - `Sticker.cachedDescription`

    貼圖快取檔案：

    - `~/.openclaw/telegram/sticker-cache.json`

    貼圖會被描述一次（盡可能）並快取，以減少重複的視覺呼叫。

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

    傳送貼圖動作：

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
    Telegram 回應會以 `message_reaction` 更新的形式到達（與訊息內容分開）。

    啟用後，OpenClaw 會將系統事件排入佇列，例如：

    - `Telegram reaction added: 👍 by Alice (@alice) on msg 42`

    設定：

    - `channels.telegram.reactionNotifications`：`off | own | all`（預設：`own`）
    - `channels.telegram.reactionLevel`：`off | ack | minimal | extensive`（預設：`minimal`）

    備註：

    - `own` 表示僅限使用者對機器人發送訊息的回應（透過已發送訊息快取盡力而為）。
    - 回應事件仍會遵守 Telegram 存取控制（`dmPolicy`、`allowFrom`、`groupPolicy`、`groupAllowFrom`）；未經授權的發送者會被捨棄。
    - Telegram 不會在回應更新中提供執行緒 ID。
      - 非論壇群組會路由至群組聊天工作階段
      - 論壇群組會路由至群組一般主題工作階段（`:topic:1`），而非確切的原始主題

    `allowed_updates` 用於輪詢/Webhook 時會自動包含 `message_reaction`。

  </Accordion>

  <Accordion title="Ack reactions">
    當 OpenClaw 正在處理傳入訊息時，`ackReaction` 會發送確認表情符號。

    解析順序：

    - `channels.telegram.accounts.<accountId>.ackReaction`
    - `channels.telegram.ackReaction`
    - `messages.ackReaction`
    - 代理身分表情符號後備（`agents.list[].identity.emoji`，否則為 "👀"）

    備註：

    - Telegram 預期為 Unicode 表情符號（例如 "👀"）。
    - 使用 `""` 來停用特定頻道或帳號的回應。

  </Accordion>

  <Accordion title="來自 Telegram 事件與指令的設定寫入">
    頻道設定寫入預設為啟用 (`configWrites !== false`)。

    由 Telegram 觸發的寫入包含：

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

  <Accordion title="長輪詢與 Webhook">
    預設為長輪詢。若要使用 Webhook 模式，請設定 `channels.telegram.webhookUrl` 與 `channels.telegram.webhookSecret`；可選 `webhookPath`、`webhookHost`、`webhookPort` (預設 `/telegram-webhook`、`127.0.0.1`、`8787`)。

    在長輪詢模式下，OpenClaw 僅在更新成功分派後才會保存重啟水位線。如果處理程式失敗，該更新在相同進程中仍可重試，且不會被寫入為已完成以進行重啟去重。

    本地監聽器綁定至 `127.0.0.1:8787`。對於公開的連入流量，請在本地連接埠前放置反向代理，或刻意設定 `webhookHost: "0.0.0.0"`。

    Webhook 模式會在向 Telegram 回傳 `200` 之前，驗證請求防護、Telegram 密鑰權杖與 JSON 主體。
    OpenClaw 接著透過與長輪詢相同的每個聊天/每個主題 Bot 通道非同步處理該更新，因此緩慢的 Agent 回合不會佔用 Telegram 的遞送 ACK。

  </Accordion>

  <Accordion title="限制、重試與 CLI 目標">
    - `channels.telegram.textChunkLimit` 預設為 4000。
    - `channels.telegram.chunkMode="newline"` 偏好在進行長度分割前以段落邊界（空白行）為優先。
    - `channels.telegram.mediaMaxMb` （預設 100）限制傳入與傳出的 Telegram 媒體大小。
    - `channels.telegram.mediaGroupFlushMs` （預設 500）控制在 OpenClaw 將 Telegram 專輯/媒體群組作為單一傳入訊息分派前的緩衝時間。如果專輯部分延遲抵達，請增加此值；若要降低專輯回覆延遲，則減少此值。
    - `channels.telegram.timeoutSeconds` 覆寫 Telegram API 用戶端逾時（若未設定，則套用 grammY 預設值）。Bot 用戶端會將設定值限制在 60 秒的外寄文字/輸入請求防護之下，以免 grammY 在 OpenClaw 的傳輸防護與備援機制運作前，中斷可見回覆的傳遞。長輪詢仍使用 45 秒的 `getUpdates` 請求防護，以避免閒置輪詢無限期被捨棄。
    - `channels.telegram.pollingStallThresholdMs` 預設為 `120000`；僅在因誤判輪詢停滯而重新啟動時，才在 `30000` 到 `600000` 之間進行微調。
    - 群組情境歷史使用 `channels.telegram.historyLimit` 或 `messages.groupChat.historyLimit` （預設 50）；`0` 則停用此功能。
    - 當閘道已觀察到父訊息時，回覆/引用/轉發的補充情境會被正規化為單一選取的對話情境視窗；觀察到的訊息快取會與工作階段存放區一併保存。Telegram 在更新中僅包含一個淺層 `reply_to_message`，因此早於快取的鏈結會受限於 Telegram 目前的更新內容。
    - Telegram 許可清單主要控管誰能觸發代理程式，而非完整的補充情境編輯邊界。
    - DM 歷史控制：
      - `channels.telegram.dmHistoryLimit`
      - `channels.telegram.dms["<user_id>"].historyLimit`
    - `channels.telegram.retry` 設定套用於 Telegram 傳送輔助程式（CLI/工具/動作），以處理可復原的外寄 API 錯誤。傳入的最終回覆傳遞也會針對 Telegram 連線前失敗使用有限的安全傳送重試，但不會重試可能造成可見訊息重複的模糊傳送後網路信封。

    CLI 與訊息工具的傳送目標可以是數字聊天 ID、使用者名稱，或論壇主題目標：

```bash
openclaw message send --channel telegram --target 123456789 --message "hi"
openclaw message send --channel telegram --target @name --message "hi"
openclaw message send --channel telegram --target -1001234567890:topic:42 --message "hi topic"
```

    Telegram 輪詢使用 `openclaw message poll` 並支援論壇主題：

```bash
openclaw message poll --channel telegram --target 123456789 \
  --poll-question "Ship it?" --poll-option "Yes" --poll-option "No"
openclaw message poll --channel telegram --target -1001234567890:topic:42 \
  --poll-question "Pick a time" --poll-option "10am" --poll-option "2pm" \
  --poll-duration-seconds 300 --poll-public
```

    Telegram 專用輪詢旗標：

    - `--poll-duration-seconds` （5-600）
    - `--poll-anonymous`
    - `--poll-public`
    - `--thread-id` 用於論壇主題（或使用 `:topic:` 目標）

    Telegram 傳送也支援：

    - `--presentation` 搭配 `buttons` 區塊以用於內聯鍵盤，當 `channels.telegram.capabilities.inlineButtons` 允許時
    - `--pin` 或 `--delivery '{"pin":true}'` 以在 Bot 可於該聊天中置頂時要求置頂傳遞
    - `--force-document` 將外寄圖片、GIF 與影片以文件形式傳送，而非壓縮的照片、動態媒體或影片上傳

    動作閘門：

    - `channels.telegram.actions.sendMessage=false` 停用外寄 Telegram 訊息，包含輪詢
    - `channels.telegram.actions.poll=false` 停用 Telegram 輪詢建立，但仍啟用一般傳送

  </Accordion>

  <Accordion title="在 Telegram 中執行審批">
    Telegram 支援在審批者的私訊（DM）中進行 exec 審批，並可選擇在原始聊天或主題中發出提示。審批者必須是 Telegram 的數位用戶 ID。

    配置路徑：

    - `channels.telegram.execApprovals.enabled` （當至少有一位審批者可解析時自動啟用）
    - `channels.telegram.execApprovals.approvers` （回退至 `commands.ownerAllowFrom` 中的數位擁有者 ID）
    - `channels.telegram.execApprovals.target`: `dm` （預設） | `channel` | `both`
    - `agentFilter`, `sessionFilter`

    `channels.telegram.allowFrom`, `groupAllowFrom`, 和 `defaultTo` 控制誰可以與機器人交談以及它將一般回覆傳送至何處。它們不會讓某人成為 exec 審批者。當尚無命令擁有者時，第一個經過核可的私訊配對會引導 `commands.ownerAllowFrom`，因此單一擁有者設定仍然有效，而無需在 `execApprovals.approvers` 下重複 ID。

    頻道傳遞會在聊天中顯示命令文字；僅在受信任的群組/主題中啟用 `channel` 或 `both`。當提示落入論壇主題時，OpenClaw 會保留審批提示及後續追蹤的主題。Exec 審批預設在 30 分鐘後過期。

    內嵌審核按鈕還需要 `channels.telegram.capabilities.inlineButtons` 以允許目標表面（`dm`、`group` 或 `all`）。前綴為 `plugin:` 的審批 ID 透過外掛程式審批解析；其他則首先透過 exec 審批解析。

    參閱 [Exec approvals](/zh-Hant/tools/exec-approvals)。

  </Accordion>
</AccordionGroup>

## 錯誤回覆控制

當代理程式遇到傳遞或提供者錯誤時，Telegram 可以回覆錯誤文字或隱藏該錯誤。有兩個設定金鑰控制此行為：

| 金鑰                                | 數值              | 預設    | 說明                                                               |
| ----------------------------------- | ----------------- | ------- | ------------------------------------------------------------------ |
| `channels.telegram.errorPolicy`     | `reply`, `silent` | `reply` | `reply` 會向聊天發送友善的錯誤訊息。 `silent` 完全抑制錯誤回覆。   |
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

    - 如果是 `requireMention=false`，Telegram 隱私模式必須允許完全可見。
      - BotFather：`/setprivacy` -> Disable
      - 然後將機器人從群組中移除並重新新增
    - 當配置要求未提及的群組訊息時，`openclaw channels status` 會發出警告。
    - `openclaw channels status --probe` 可以檢查明確的數字群組 ID；萬用字元 `"*"` 無法被探測成員身分。
    - 快速會話測試：`/activation always`。

  </Accordion>

  <Accordion title="Bot not seeing group messages at all">

    - 當存在 `channels.telegram.groups` 時，群組必須被列出（或包含 `"*"`）
    - 驗證機器人在群組中的成員身分
    - 檢查日誌：`openclaw logs --follow` 以查看跳過原因

  </Accordion>

  <Accordion title="Commands work partially or not at all">

    - 授權您的發送者身分（配對和/或數字 `allowFrom`）
    - 即使群組原則是 `open`，指令授權仍然適用
    - 伴隨 `BOT_COMMANDS_TOO_MUCH` 的 `setMyCommands failed` 表示原生選單項目過多；請減少外掛/技能/自訂指令或停用原生選單
    - `deleteMyCommands` / `setMyCommands` 啟動呼叫和 `sendChatAction` 輸入呼叫是有界的，並在請求逾時時透過 Telegram 的傳輸回退機制重試一次。持續的網路/擷取錯誤通常表示對 `api.telegram.org` 的 DNS/HTTPS 連線問題

  </Accordion>

  <Accordion title="Startup reports unauthorized token">

    - `getMe returned 401` 表示所配置的機器人 Token 發生 Telegram 驗證失敗。
    - 在 BotFather 中重新複製或重新產生機器人 Token，然後為預設帳戶更新 `channels.telegram.botToken`、`channels.telegram.tokenFile`、`channels.telegram.accounts.<id>.botToken` 或 `TELEGRAM_BOT_TOKEN`。
    - 啟動時發生的 `deleteWebhook 401 Unauthorized` 也是一種驗證失敗；將其視為「Webhook 不存在」只會將同樣的 Token 錯誤延後到之後的 API 呼叫中發生。

  </Accordion>

  <Accordion title="輪詢或網路不穩定">

    - Node 22+ + 自訂 fetch/proxy 如果 AbortSignal 類型不匹配，可能會觸發立即中止行為。
    - 某些主機會優先將 `api.telegram.org` 解析為 IPv6；損壞的 IPv6 出站可能會導致間歇性的 Telegram API 失敗。
    - 如果日誌包含 `TypeError: fetch failed` 或 `Network request for 'getUpdates' failed!`，OpenClaw 現在會將這些作為可恢復的網路錯誤進行重試。
    - 在輪詢啟動期間，OpenClaw 會重用成功的啟動 `getMe` 探測給 grammY，因此 runner 不需要在第一個 `getUpdates` 之前進行第二次 `getMe`。
    - 如果 `deleteWebhook` 在輪詢啟動期間因暫時性網路錯誤而失敗，OpenClaw 會繼續進行長輪詢，而不是發出另一個輪詢前控制平面調用。仍然活躍的 webhook 會顯示為 `getUpdates` 衝突；然後 OpenClaw 重建 Telegram 傳輸並重試 webhook 清理。
    - 如果 Telegram sockets 以短間隔的固定節奏回收，請檢查 `channels.telegram.timeoutSeconds` 是否過低；bot 客戶端會將配置值限制在出站和 `getUpdates` 請求防護之下，但舊版本在此值低於這些防護值時可能會中止每次輪詢或回覆。
    - 如果日誌包含 `Polling stall detected`，OpenClaw 預設會在 120 秒內沒有完成長輪詢活躍檢測時重啟輪詢並重建 Telegram 傳輸。
    - 當運行中的輪詢帳戶在啟動寬限期後未完成 `getUpdates`，或運行中的 webhook 帳戶在啟動寬限期後未完成 `setWebhook`，或最後一次成功的輪詢傳輸活動過時時，`openclaw channels status --probe` 和 `openclaw doctor` 會發出警告。
    - 僅當長時間運行的 `getUpdates` 調用健康但您的主機仍報告錯誤的輪詢停頓重啟時，才增加 `channels.telegram.pollingStallThresholdMs`。持續的停頓通常指向主機與 `api.telegram.org` 之間的 proxy、DNS、IPv6 或 TLS 出站問題。
    - Telegram 也支援 Bot API 傳輸的程式 proxy 環境變數，包括 `HTTP_PROXY`、`HTTPS_PROXY`、`ALL_PROXY` 及其小寫變體。`NO_PROXY` / `no_proxy` 仍可繞過 `api.telegram.org`。
    - 如果 OpenClaw 管理的 proxy 是透過 `OPENCLAW_PROXY_URL` 為服務環境配置的，並且沒有標準的 proxy 環境變數，Telegram 也會使用該 URL 進行 Bot API 傳輸。
    - 在直接出站/TLS 不穩定的 VPS 主機上，透過 `channels.telegram.proxy` 路由 Telegram API 調用：

```yaml
channels:
  telegram:
    proxy: socks5://<user>:<password>@proxy-host:1080
```

    - Node 22+ 預設為 `autoSelectFamily=true`（WSL2 除外）。Telegram DNS 結果順序優先考慮 `OPENCLAW_TELEGRAM_DNS_RESULT_ORDER`，然後是 `channels.telegram.network.dnsResultOrder`，然後是程式預設值，例如 `NODE_OPTIONS=--dns-result-order=ipv4first`；如果都不適用，Node 22+ 會回退到 `ipv4first`。
    - 如果您的主機是 WSL2 或明確在僅 IPv4 行為下運作更好，請強制選擇系列：

```yaml
channels:
  telegram:
    network:
      autoSelectFamily: false
```

    - RFC 2544 基準範圍答案 (`198.18.0.0/15`) 預設已允許
      用於 Telegram 媒體下載。如果受信任的假 IP 或
      透明代理在媒體下載期間將 `api.telegram.org` 重寫為其他
      私有/內部/特殊用途地址，您可以選擇
      加入僅 Telegram 的繞過：

```yaml
channels:
  telegram:
    network:
      dangerouslyAllowPrivateNetwork: true
```

    - 每個帳戶都可以在
      `channels.telegram.accounts.<accountId>.network.dangerouslyAllowPrivateNetwork` 使用相同的選項。
    - 如果您的 proxy 將 Telegram 媒體主機解析為 `198.18.x.x`，請先將
      危險標誌保持關閉。Telegram 媒體預設已允許 RFC 2544
      基準範圍。

    <Warning>
      `channels.telegram.network.dangerouslyAllowPrivateNetwork` 會削弱 Telegram
      媒體 SSRF 防護。僅在受信任的操作員控制的 proxy
      環境中使用，例如 Clash、Mihomo 或 Surge 假 IP 路由，當它們
      在 RFC 2544 基準
      範圍之外合成私有或特殊用途答案時。對於正常的公共網際網路 Telegram 存取，請將其關閉。
    </Warning>

    - 環境覆寫（臨時）：
      - `OPENCLAW_TELEGRAM_DISABLE_AUTO_SELECT_FAMILY=1`
      - `OPENCLAW_TELEGRAM_ENABLE_AUTO_SELECT_FAMILY=1`
      - `OPENCLAW_TELEGRAM_DNS_RESULT_ORDER=ipv4first`
    - 驗證 DNS 答案：

```bash
dig +short api.telegram.org A
dig +short api.telegram.org AAAA
```

  </Accordion>
</AccordionGroup>

更多說明：[頻道疑難排解](/zh-Hant/channels/troubleshooting)。

## 組態參考

主要參考資料：[組態參考 - Telegram](/zh-Hant/gateway/config-channels#telegram)。

<Accordion title="高訊號 Telegram 欄位">

- 啟動/驗證：`enabled`、`botToken`、`tokenFile`、`accounts.*`（`tokenFile` 必須指向常規檔案；不接受符號連結）
- 存取控制：`dmPolicy`、`allowFrom`、`groupPolicy`、`groupAllowFrom`、`groups`、`groups.*.topics.*`、頂層 `bindings[]`（`type: "acp"`）
- 執行審核：`execApprovals`、`accounts.*.execApprovals`
- 指令/選單：`commands.native`、`commands.nativeSkills`、`customCommands`
- 主題/回覆：`replyToMode`、`dm.threadReplies`、`direct.*.threadReplies`
- 串流：`streaming`（預覽）、`streaming.preview.toolProgress`、`blockStreaming`
- 格式/傳遞：`textChunkLimit`、`chunkMode`、`linkPreview`、`responsePrefix`
- 媒體/網路：`mediaMaxMb`、`mediaGroupFlushMs`、`timeoutSeconds`、`pollingStallThresholdMs`、`retry`、`network.autoSelectFamily`、`network.dangerouslyAllowPrivateNetwork`、`proxy`
- 自訂 API 根路徑：`apiRoot`（僅限 Bot API 根路徑；請勿包含 `/bot<TOKEN>`）
- Webhook：`webhookUrl`、`webhookSecret`、`webhookPath`、`webhookHost`
- 動作/功能：`capabilities.inlineButtons`、`actions.sendMessage|editMessage|deleteMessage|reactions|sticker`
- 反應：`reactionNotifications`、`reactionLevel`
- 錯誤：`errorPolicy`、`errorCooldownMs`
- 寫入/歷史：`configWrites`、`historyLimit`、`dmHistoryLimit`、`dms.*.historyLimit`

</Accordion>

<Note>多帳號優先順序：當配置了兩個或多個帳號 ID 時，請設定 `channels.telegram.defaultAccount`（或包含 `channels.telegram.accounts.default`）以明確指定預設路由。否則 OpenClaw 將回退到第一個正規化的帳號 ID 且 `openclaw doctor` 會發出警告。命名帳號會繼承 `channels.telegram.allowFrom` / `groupAllowFrom`，但不繼承 `accounts.default.*` 值。</Note>

## 相關

<CardGroup cols={2}>
  <Card title="Pairing" icon="link" href="/zh-Hant/channels/pairing">
    將 Telegram 使用者配對至閘道。
  </Card>
  <Card title="Groups" icon="users" href="/zh-Hant/channels/groups">
    群組與主題的允許清單行為。
  </Card>
  <Card title="Channel routing" icon="route" href="/zh-Hant/channels/channel-routing">
    將訊息路由至代理程式。
  </Card>
  <Card title="Security" icon="shield" href="/zh-Hant/gateway/security">
    威脅模型與加固。
  </Card>
  <Card title="Multi-agent routing" icon="sitemap" href="/zh-Hant/concepts/multi-agent">
    將群組與主題對應至代理程式。
  </Card>
  <Card title="Troubleshooting" icon="wrench" href="/zh-Hant/channels/troubleshooting">
    跨通道診斷。
  </Card>
</CardGroup>
