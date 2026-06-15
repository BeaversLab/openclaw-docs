---
summary: "Telegram 機器人支援狀態、功能和配置"
read_when:
  - Working on Telegram features or webhooks
title: "Telegram"
---

透過 grammY 實現適用於機器人私訊和群組的生產就緒功能。長輪詢是預設模式；Webhook 模式是可選的。

<CardGroup cols={3}>
  <Card title="配對" icon="link" href="/zh-Hant/channels/pairing">
    Telegram 的預設私訊 (DM) 政策是配對。
  </Card>
  <Card title="通道疑難排解" icon="wrench" href="/zh-Hant/channels/troubleshooting">
    跨通道診斷和修復手冊。
  </Card>
  <Card title="閘道配置" icon="settings" href="/zh-Hant/gateway/configuration">
    完整的通道配置模式和範例。
  </Card>
</CardGroup>

## 快速設定

<Steps>
  <Step title="在 BotFather 中建立機器人 Token">
    開啟 Telegram 並與 **@BotFather** 對話 (確認使用者名稱確切為 `@BotFather`)。

    執行 `/newbot`，依照提示操作，並儲存 Token。

  </Step>

  <Step title="配置 Token 和私訊 (DM) 政策">

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

    環境變數備援：`TELEGRAM_BOT_TOKEN=...` (僅限預設帳戶)。
    Telegram **不**使用 `openclaw channels login telegram`；請先在配置/環境變數中設定 Token，然後啟動閘道。

  </Step>

  <Step title="啟動閘道並批准首次私訊 (DM)">

```bash
openclaw gateway
openclaw pairing list telegram
openclaw pairing approve telegram <CODE>
```

    配對碼會在 1 小時後過期。

  </Step>

  <Step title="將機器人新增至群組">
    將機器人新增到您的群組，然後取得群組存取所需的兩個 ID：

    - 您的 Telegram 使用者 ID，用於 `allowFrom` / `groupAllowFrom`
    - Telegram 群組聊天 ID，用作 `channels.telegram.groups` 下的金鑰

    若為初次設定，請從 `openclaw logs --follow`、轉發 ID 機器人或 Bot API `getUpdates` 取得群組聊天 ID。在允許群組後，`/whoami@<bot_username>` 可以確認使用者和群組 ID。

    以 `-100` 開頭的負數 Telegram 超級群組 ID 即為群組聊天 ID。請將其放在 `channels.telegram.groups` 下，而非 `groupAllowFrom` 下。

  </Step>
</Steps>

<Note>Token 解析順序會區分帳戶。實務上，組態值優先於環境變數後備，且 `TELEGRAM_BOT_TOKEN` 僅適用於預設帳戶。 成功啟動後，OpenClaw 會在狀態目錄中快取機器人身分長達 24 小時，因此重新啟動可避免額外的 Telegram `getMe` 呼叫；變更或移除 token 會清除該快取。</Note>

## Telegram 端設定

<AccordionGroup>
  <Accordion title="隱私模式與群組可見性">
    Telegram 機器人預設為 **隱私模式**，這會限制其收到的群組訊息。

    若機器人必須查看所有群組訊息，請採取以下任一方式：

    - 透過 `/setprivacy` 停用隱私模式，或
    - 將機器人設為群組管理員。

    切換隱私模式時，請在每個群組中移除並重新新增機器人，讓 Telegram 套用變更。

  </Accordion>

  <Accordion title="群組權限">
    管理員狀態是在 Telegram 群組設定中控制的。

    管理員機器人會接收所有群組訊息，這對於始終啟用的群組行為很有用。

  </Accordion>

  <Accordion title="實用的 BotFather 切換開關">

    - `/setjoingroups` 以允許/拒絕新增至群組
    - `/setprivacy` 用於群組可見性行為

  </Accordion>
</AccordionGroup>

## 存取控制和啟用

<Tabs>
  <Tab title="DM policy">
    `channels.telegram.dmPolicy` 控制直接訊息存取權限：

    - `pairing` (預設)
    - `allowlist` (需要在 `allowFrom` 中至少有一個發送者 ID)
    - `open` (需要 `allowFrom` 包含 `"*"`)
    - `disabled`

    `dmPolicy: "open"` 搭配 `allowFrom: ["*"]` 允許任何發現或猜測到機器人使用者名稱的 Telegram 帳號指揮該機器人。請僅將其用於工具受到嚴格限制的意圖公開機器人；單一擁有者的機器人應使用 `allowlist` 搭配數字使用者 ID。

    `channels.telegram.allowFrom` 接受數字 Telegram 使用者 ID。`telegram:` / `tg:` 前綴會被接受並正規化。
    在多帳號設定中，嚴格的頂層 `channels.telegram.allowFrom` 被視為安全邊界：帳號層級的 `allowFrom: ["*"]` 項目不會使該帳號公開，除非合併後的有效帳號允許清單仍包含明確的萬用字元。
    `dmPolicy: "allowlist"` 若 `allowFrom` 為空，會阻擋所有 DM，並且會被設定驗證拒絕。
    安裝程式僅要求數字使用者 ID。
    如果您已升級且您的設定包含 `@username` 允許清單項目，請執行 `openclaw doctor --fix` 來解析它們 (盡力而為；需要 Telegram 機器人權杖)。
    如果您先前依賴 pairing-store 允許清單檔案，`openclaw doctor --fix` 可以在允許清單流程中將項目復原到 `channels.telegram.allowFrom` (例如當 `dmPolicy: "allowlist"` 尚無明確 ID 時)。

    對於單一擁有者的機器人，建議使用 `dmPolicy: "allowlist"` 搭配明確的數字 `allowFrom` ID，以讓存取政策在設定中保持持久 (而不是依賴先前的配對核准)。

    常見誤解：DM 配對核准並不代表「此發送者到處都有權限」。
    配對會授予 DM 存取權。如果尚未存在指令擁有者，第一個核准的配對也會設定 `commands.ownerAllowFrom`，以便僅限擁有者的指令和 exec 核准擁有明確的操作員帳號。
    群組發送者授權仍來自明確的設定允許清單。
    如果您想要「我授權一次，DM 和群組指令都能運作」，請將您的數字 Telegram 使用者 ID 放入 `channels.telegram.allowFrom`；對於僅限擁有者的指令，請確保 `commands.ownerAllowFrom` 包含 `telegram:<your user id>`。

    ### 尋找您的 Telegram 使用者 ID

    較安全 (無第三方機器人)：

    1. 私訊您的機器人。
    2. 執行 `openclaw logs --follow`。
    3. 讀取 `from.id`。

    官方 Bot API 方法：

```bash
curl "https://api.telegram.org/bot<bot_token>/getUpdates"
```

    第三方方法 (隱私性較低)：`@userinfobot` 或 `@getidsbot`。

  </Tab>

  <Tab title="群組原則和允許清單">
    兩項控制措施會共同生效：

    1. **哪些群組被允許** (`channels.telegram.groups`)
       - 沒有 `groups` 設定：
         - 搭配 `groupPolicy: "open"`：任何群組都可以通過群組 ID 檢查
         - 搭配 `groupPolicy: "allowlist"`（預設）：群組會被封鎖，直到您新增 `groups` 項目（或 `"*"`）
       - 已設定 `groups`：作為允許清單（明確 ID 或 `"*"`）

    2. **哪些傳送者在群組中被允許** (`channels.telegram.groupPolicy`)
       - `open`
       - `allowlist`（預設）
       - `disabled`

    `groupAllowFrom` 用於群組傳送者過濾。如果未設定，Telegram 會退回至 `allowFrom`。
    `groupAllowFrom` 項目應為數字的 Telegram 使用者 ID（`telegram:` / `tg:` 前綴會被正規化）。
    請勿將 Telegram 群組或超級群組聊天 ID 放入 `groupAllowFrom`。負數聊天 ID 屬於 `channels.telegram.groups`。
    非數字項目在傳送者授權時會被忽略。
    安全邊界（`2026.2.25+`）：群組傳送者授權**不會**繼承 DM 配對儲存庫的核准。
    配對僅限於 DM。對於群組，請設定 `groupAllowFrom` 或每群組/每主題的 `allowFrom`。
    如果 `groupAllowFrom` 未設定，Telegram 會退回至設定 `allowFrom`，而非配對儲存庫。
    單一擁有者機器人的實用模式：將您的使用者 ID 設定在 `channels.telegram.allowFrom` 中，讓 `groupAllowFrom` 保持未設定，並在 `channels.telegram.groups` 下允許目標群組。
    執行時備註：如果 `channels.telegram` 完全缺失，執行時預設為封閉失敗 `groupPolicy="allowlist"`，除非明確設定 `channels.defaults.groupPolicy`。

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

    從群組中使用 `@<bot_username> ping` 進行測試。純群組訊息不會觸發機器人，但 `requireMention: true` 會。

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

      - 將負數的 Telegram 群組或超級群組聊天 ID（如 `-1001234567890`）放在 `channels.telegram.groups` 下。
      - 當您想要限制允許群組內哪些人可以觸發機器人時，將 Telegram 使用者 ID（如 `8734062810`）放在 `groupAllowFrom` 下。
      - 僅當您希望允許群組的任何成員都能與機器人對話時，才使用 `groupAllowFrom: ["*"]`。

    </Warning>

  </Tab>

  <Tab title="提及行為">
    預設情況下，群組回覆需要提及。

    提及可以來自：

    - 原生 `@botusername` 提及，或
    - 以下內容中的提及模式：
      - `agents.list[].groupChat.mentionPatterns`
      - `messages.groupChat.mentionPatterns`

    會話層級指令切換：

    - `/activation always`
    - `/activation mention`

    這些僅更新會話狀態。請使用設定以保持永久性。

    永久性設定範例：

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
    - 在群組被允許後，如果已啟用原生指令，請執行 `/whoami@<bot_username>`

  </Tab>
</Tabs>

## 執行時行為

- Telegram 由 gateway 程序擁有。
- 路由是確定性的：Telegram 的入站回覆會回傳給 Telegram（模型不會選擇頻道）。
- 傳入訊息會正規化為共享通道封包，其中包含回覆中繼資料、媒體預留位置，以及網關已觀察到的 Telegram 回覆之持久化回覆鏈上下文。
- 群組會話依群組 ID 隔離。論壇主題會附加 `:topic:<threadId>` 以保持主題隔離。
- 私訊訊息可以攜帶 `message_thread_id`；OpenClaw 會在回覆中保留它。僅當 Telegram `getMe` 回報機器人具有 `has_topics_enabled: true` 時，私訊主題會話才會分割；否則私訊保持扁平會話。
- 長輪詢使用帶有每聊天/每執行緒排序的 grammY runner。整體 runner sink 並發使用 `agents.defaults.maxConcurrent`。
- 多帳號啟動會限制並發的 Telegram `getMe` 探測，因此大型 Bot 機群不會立即擴散每個帳號的探測。
- 長輪詢在每個閘道程序內受到保護，因此一次只有一個主動輪詢器可以使用 Bot token。如果您仍然看到 `getUpdates` 409 衝突，則另一個 OpenClaw 閘道、腳本或外部輪詢器可能正在使用相同的 token。
- 長輪詢看門狗預設在 120 秒內未完成 `getUpdates` 存活檢查後觸發重啟。僅當您的部署在長時間運行的工作中仍然出現錯誤的輪詢停頓重啟時，才增加 `channels.telegram.pollingStallThresholdMs`。該值以毫秒為單位，允許範圍從 `30000` 到 `600000`；支援針對每個帳戶進行覆寫。
- Telegram Bot API 不支援已讀回執（`sendReadReceipts` 不適用）。

<Note>
  `channels.telegram.dm.threadReplies` 和 `channels.telegram.direct.<chatId>.threadReplies` 已被移除。如果您的配置中仍有這些鍵，升級後請執行 `openclaw doctor --fix`。私訊主題路由現現在遵循 Telegram `getMe.has_topics_enabled` 中的機器人能力，該能力由 BotFather 的執行緒模式控制：啟用主題的機器人在 Telegram 發送 `message_thread_id` 時會使用執行緒範圍的私訊會話；其他私訊保持扁平會話。
</Note>

## 功能參考

<AccordionGroup>
  <Accordion title="即時串流預覽（訊息編輯）">
    OpenClaw 可以即時串流部分回覆：

    - 直接聊天：預覽訊息 + `editMessageText`
    - 群組/主題：預覽訊息 + `editMessageText`
    - 直接聊天的工具進度：當啟用並支援時，可選的原生 `sendMessageDraft` 狀態預覽

    需求：

    - `channels.telegram.streaming` 為 `off | partial | block | progress`（預設值：`partial`）
    - `progress` 會為工具進度保留一個可編輯的狀態草稿，在完成時清除，並將最終答案作為一般訊息發送
    - `streaming.preview.toolProgress` 控制工具/進度更新是否重複使用同一個編輯過的預覽訊息（當預覽串流處於活動狀態時，預設值為 `true`）
    - `streaming.preview.commandText` 控制這些工具進度行中的 command/exec 細節：`raw`（預設值，保留已發布的行為）或 `status`（僅顯示工具標籤）
    - 偵測到舊版的 `channels.telegram.streamMode` 和布林值 `streaming`；請執行 `openclaw doctor --fix` 將其遷移至 `channels.telegram.streaming.mode`

    工具進度預覽更新是在工具執行時顯示的簡短狀態行，例如命令執行、檔案讀取、規劃更新、修補摘要，或 Codex 應用程式伺服器模式下的 Codex 前言/評論文字。Telegram 預設會啟用這些功能，以符合 `v2026.4.22` 及更新版本的 OpenClaw 發布行為。

    直接聊天可以對這些工具進度行使用原生的 Telegram 草稿，而不會將工具雜訊保留在聊天記錄中。原生草稿會在答案文字開始前停止；最終答案會保持在一般持久傳遞路徑上。此通道預設為關閉，且應先限制為受信任的 DM ID：

    ```json
    {
      "channels": {
        "telegram": {
          "streaming": {
            "mode": "partial",
            "preview": {
              "toolProgress": true,
              "nativeToolProgress": true,
              "nativeToolProgressAllowFrom": ["123456789"]
            }
          }
        }
      }
    }
    ```

    若要保留答案文字的編輯預覽但隱藏工具進度行，請設定：

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

    若要保留工具進度可見但隱藏 command/exec 文字，請設定：

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

    當您希望可見的工具進度但不將最終答案編輯到同一則訊息中時，請使用 `progress` 模式。將 command-text 政策置於 `streaming.progress` 之下：

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

    僅在您想要僅限最終傳遞時才使用 `streaming.mode: "off"`：Telegram 預覽編輯會被停用，且一般工具/進度雜訊會被隱藏，而不是作為獨立狀態訊息發送。批准提示、媒體載荷和錯誤仍會透過一般最終傳遞路徑傳送。當您只想保留答案預覽編輯但隱藏工具進度狀態行時，請使用 `streaming.preview.toolProgress: false`。

    <Note>
      Telegram 選取的引用回覆是例外情況。當 `replyToMode` 為 `"first"`、`"all"` 或 `"batched"`，且傳入訊息包含選取的引用文字時，OpenClaw 會透過 Telegram 的原生引用回覆路徑傳送最終答案，而不是編輯答案預覽，因此 `streaming.preview.toolProgress` 無法顯示該輪次的簡短狀態行。沒有選取引用文字的目前訊息回覆仍會保留預覽串流。當工具進度的可見性比原生引用回覆更重要時，請設定 `replyToMode: "off"`，或設定 `streaming.preview.toolProgress: false` 以確認此取捨。
    </Note>

    對於純文字回覆：

    - 簡短的 DM/群組/主題預覽：OpenClaw 會保留相同的預覽訊息並就地執行最終編輯
    - 分割成多則 Telegram 訊息的長文字最終內容會盡可能重複使用現有的預覽作為第一個最終區塊，然後僅發送剩餘的區塊
    - 進度模式的最終內容會清除狀態草稿並使用一般最終傳遞，而不是將草稿編輯為答案
    - 如果在最終文字確認之前最終編輯失敗，OpenClaw 會使用一般最終傳遞並清除過時的預覽

    對於複雜的回覆（例如媒體載荷），OpenClaw 會回退到一般最終傳遞，然後清除預覽訊息。

    預覽串流與區塊串流是分開的。當為 Telegram 明確啟用區塊串流時，OpenClaw 會跳過預覽串流以避免雙重串流。

    推理串流行為：

    - `/reasoning stream` 使用支援通道的推理預覽路徑；在 Telegram 上，它會在生成時將推理串流至即時預覽中
    - 推理預覽會在最終傳遞後刪除；當推理應保持可見時，請使用 `/reasoning on`
    - 最終答案會在不含推理文字的情況下發送

  </Accordion>

  <Accordion title="格式化與 HTML 後備">
    外發文字使用 Telegram `parse_mode: "HTML"`。

    - 類 Markdown 的文字會被轉譯為 Telegram 安全的 HTML。
    - 支援的 Telegram HTML 標籤會被保留；不支援的 HTML 會被轉義。
    - 如果 Telegram 拒絕解析後的 HTML，OpenClaw 會以純文字重試。

    連結預覽預設為啟用，並可透過 `channels.telegram.linkPreview: false` 停用。

  </Accordion>

  <Accordion title="Native commands and custom commands">
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

    - 名稱會被標準化（去除前置 `/`，轉為小寫）
    - 有效格式：`a-z`、`0-9`、`_`，長度 `1..32`
    - 自訂指令無法覆寫原生指令
    - 衝突/重複項目會被跳過並記錄

    備註：

    - 自訂指令僅為選單項目；它們不會自動實作行為
    - 外掛/技能指令即使未顯示在 Telegram 選單中，在輸入時仍可正常運作

    如果停用原生指令，內建指令會被移除。如果經過配置，自訂/外掛指令可能仍會註冊。

    常見設定失敗：

    - `setMyCommands failed` 伴有 `BOT_COMMANDS_TOO_MUCH` 表示 Telegram 選單在修剪後仍然溢位；請減少外掛/技能/自訂指令或停用 `channels.telegram.commands.native`。
    - 如果直接的 Bot API curl 指令正常運作，但 `deleteWebhook`、`deleteMyCommands` 或 `setMyCommands` 失敗並出現 `404: Not Found`，可能表示 `channels.telegram.apiRoot` 被設定為完整的 `/bot<TOKEN>` 端點。`apiRoot` 必須僅為 Bot API 根目錄，而 `openclaw doctor --fix` 會移除意外的尾部 `/bot<TOKEN>`。
    - `getMe returned 401` 表示 Telegram 拒絕了設定的 Bot token。請使用目前的 BotFather token 更新 `botToken`、`tokenFile` 或 `TELEGRAM_BOT_TOKEN`；OpenClaw 會在輪詢前停止，因此這不會被回報為 webhook 清理失敗。
    - `setMyCommands failed` 伴有網路/fetch 錯誤通常表示對 `api.telegram.org` 的出站 DNS/HTTPS 被封鎖。

    ### 裝置配對指令 (`device-pair` 外掛)

    當安裝 `device-pair` 外掛時：

    1. `/pair` 產生設定碼
    2. 在 iOS 應用程式中貼上程式碼
    3. `/pair pending` 列出待處理請求（包括角色/範圍）
    4. 批准請求：
       - `/pair approve <requestId>` 用於明確批准
       - `/pair approve` 當只有一個待處理請求時
       - `/pair approve latest` 用於最近的一個

    設定碼包含短期啟動 token。內建設定碼啟動僅限節點：首次連線會建立待處理節點請求，批准後 Gateway 會透過 `scopes: []` 傳回持久的節點 token。它不會傳回移交的操作員 token；操作員存取需要單獨的經批准操作員配對或 token 流程。

    如果裝置使用變更的驗證詳細資料（例如角色/範圍/公開金鑰）重試，先前的待處理請求會被取代，新請求會使用不同的 `requestId`。請在批准前重新執行 `/pair pending`。

    更多詳情：[配對](/zh-Hant/channels/pairing#pair-via-telegram-recommended-for-ios)。

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

    逐帳號覆寫：

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

    Telegram `web_app` 按鈕僅在使用者與機器人的私人對話中有效。

    回調點擊會以文字形式傳遞給 Agent：
    `callback_data: <value>`

  </Accordion>

  <Accordion title="Telegram message actions for agents and automation">
    Telegram 工具動作包含：

    - `sendMessage` (`to`, `content`, 選用 `mediaUrl`, `replyToMessageId`, `messageThreadId`)
    - `react` (`chatId`, `messageId`, `emoji`)
    - `deleteMessage` (`chatId`, `messageId`)
    - `editMessage` (`chatId`, `messageId`, `content` 或 `caption`, 選用 `presentation` 內聯按鈕；僅按鈕的編輯會更新回覆標記)
    - `createForumTopic` (`chatId`, `name`, 選用 `iconColor`, `iconCustomEmojiId`)

    頻道訊息動作公開了符合人體工學的別名 (`send`, `react`, `delete`, `edit`, `sticker`, `sticker-search`, `topic-create`)。

    閘道控制：

    - `channels.telegram.actions.sendMessage`
    - `channels.telegram.actions.deleteMessage`
    - `channels.telegram.actions.reactions`
    - `channels.telegram.actions.sticker` (預設：停用)

    注意：`edit` 和 `topic-create` 目前預設為啟用，且沒有個別的 `channels.telegram.actions.*` 開關。
    執行時發送使用啟用的設定/密鑰快照 (啟動/重新載入)，因此動作路徑不會在每次發送時執行臨時的 SecretRef 重新解析。

    反應移除語意：[/tools/reactions](/zh-Hant/tools/reactions)

  </Accordion>

  <Accordion title="Reply threading tags">
    Telegram 支援在生成的輸出中使用明確的回覆串連標籤：

    - `[[reply_to_current]]` 回覆觸發訊息
    - `[[reply_to:<id>]]` 回覆特定的 Telegram 訊息 ID

    `channels.telegram.replyToMode` 控制處理方式：

    - `off` （預設值）
    - `first`
    - `all`

    當啟用回覆串連功能且原始 Telegram 文字或標題可用時，OpenClaw 會自動包含原生的 Telegram 引用摘錄。Telegram 將原生引用文字限制在 1024 個 UTF-16 代碼單位，因此較長的訊息會從開頭開始引用，如果 Telegram 拒絕該引用，則會回退到普通回覆。

    注意：`off` 會停用隱式回覆串連。明確的 `[[reply_to_*]]` 標籤仍會受到尊重。

  </Accordion>

  <Accordion title="Forum topics and thread behavior">
    論壇超級群組：

    - 主題會話金鑰附加 `:topic:<threadId>`
    - 回覆和輸入狀態目標為主題串
    - 主題配置路徑：
      `channels.telegram.groups.<chatId>.topics.<threadId>`

    一般主題 (`threadId=1`) 特殊情況：

    - 訊息傳送省略 `message_thread_id` (Telegram 會拒絕 `sendMessage(...thread_id=1)`)
    - 輸入動作仍包含 `message_thread_id`

    主題繼承：主題條目繼承群組設定，除非被覆蓋 (`requireMention`, `allowFrom`, `skills`, `systemPrompt`, `enabled`, `groupPolicy`)。
    `agentId` 僅適用於主題，不繼承群組預設值。
    `topics."*"` 為該群組中的每個主題設定預設值；精確的主題 ID 優先於 `"*"`。

    **Per-topic agent routing**：每個主題都可以透過在主題配置中設定 `agentId` 來路由到不同的代理程式。這會為每個主題提供其獨立的工作區、記憶體和會話。範例：

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

    然後每個主題都有自己的會話金鑰：`agent:zu:telegram:group:-1001234567890:topic:3`

    **Persistent ACP topic binding**：論壇主題可以透過頂層類型化 ACP 繫結 (`bindings[]` 搭配 `type: "acp"` 和 `match.channel: "telegram"`，`peer.kind: "group"`，以及類似 `-1001234567890:topic:42` 的主題限定 id) 來固定 ACP 駕駛程式會話。目前範圍僅限於群組/超級群組中的論壇主題。請參閱 [ACP Agents](/zh-Hant/tools/acp-agents)。

    **Thread-bound ACP spawn from chat**：`/acp spawn <agent> --thread here|auto` 將當前主題繫結到新的 ACP 會話；後續追問會直接路由到該處。OpenClaw 會將產生確認訊息釘選在主題中。需要 `channels.telegram.threadBindings.spawnSessions` 保持啟用 (預設值：`true`)。

    樣板上下文公開 `MessageThreadId` 和 `IsForum`。具有 `message_thread_id` 的 DM 聊天會保留回覆元資料；只有當 Telegram `getMe` 向機器人回報 `has_topics_enabled: true` 時，它們才會使用具有執行緒意識的會話金鑰。
    舊有的 `dm.threadReplies` 和 `direct.*.threadReplies` 覆蓋已刻意淘汰；請使用 BotFather 執行緒模式作為唯一真實來源，並執行 `openclaw doctor --fix` 來移除過時的配置金鑰。

  </Accordion>

  <Accordion title="音訊、影片和貼圖">
    ### 音訊訊息

    Telegram 區分語音訊息和音訊檔案。

    - 預設：音訊檔案行為
    - 在代理回覆中標記 `[[audio_as_voice]]` 以強制發送語音訊息
    - 傳入的語音訊息逐字稿在代理上下文中被標記為機器生成、不受信任的文字；提及偵測仍使用原始逐字稿，因此受提及限制的語音訊息可以繼續運作。

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

    Telegram 區分影片檔案和影片訊息。

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

    - 靜態 WEBP：下載並處理（佔位符 `<media:sticker>`）
    - 動畫 TGS：跳過
    - 影片 WEBM：跳過

    貼圖上下文欄位：

    - `Sticker.emoji`
    - `Sticker.setName`
    - `Sticker.fileId`
    - `Sticker.fileUniqueId`
    - `Sticker.cachedDescription`

    貼圖描述會快取在 OpenClaw SQLite 外掛狀態中，以減少重複的視覺呼叫。

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
    Telegram 反應會以 `message_reaction` 更新的形式到達（與訊息負載分開）。

    啟用後，OpenClaw 會將系統事件加入佇列，例如：

    - `Telegram reaction added: 👍 by Alice (@alice) on msg 42`

    設定：

    - `channels.telegram.reactionNotifications`： `off | own | all`（預設： `own`）
    - `channels.telegram.reactionLevel`： `off | ack | minimal | extensive`（預設： `minimal`）

    備註：

    - `own` 表示僅限使用者對機器人發送訊息的反應（透過已發送訊息快取盡力而為）。
    - 反應事件仍遵守 Telegram 存取控制（`dmPolicy`、 `allowFrom`、 `groupPolicy`、 `groupAllowFrom`）；未授權的發送者會被丟棄。
    - Telegram 不會在反應更新中提供主題 ID。
      - 非論壇群組會路由至群組聊天會話
      - 論壇群組會路由至群組一般主題會話（`:topic:1`），而非確切的原始主題

    用於輪詢/Webhook 的 `allowed_updates` 會自動包含 `message_reaction`。

  </Accordion>

  <Accordion title="Ack reactions">
    當 OpenClaw 正在處理傳入訊息時，`ackReaction` 會傳送一個確認表情符號。`ackReactionScope` 決定了該表情符號的實際傳送時機。

    **表情符號 (`ackReaction`) 解析順序：**

    - `channels.telegram.accounts.<accountId>.ackReaction`
    - `channels.telegram.ackReaction`
    - `messages.ackReaction`
    - agent 身份表情符號備選 (`agents.list[].identity.emoji`，否則為 "👀")

    註事：

    - Telegram 預期 Unicode 表情符號 (例如 "👀")。
    - 使用 `""` 可針對頻道或帳戶停用回應。

    **範圍 (`messages.ackReactionScope`)：**

    Telegram 提供者從 `messages.ackReactionScope` 讀取範圍 (預設為 `"group-mentions"`)。目前尚無 Telegram 帳戶層級或頻道層級的覆寫設定。

    數值：`"all"` (DM + 群組)、`"direct"` (僅 DM)、`"group-all"` (每則群組訊息，不含 DM)、`"group-mentions"` (當 bot 被提及時的群組；**不含 DM** — 這是預設值)、`"off"` / `"none"` (已停用)。

    <Note>
    預設範圍 (`"group-mentions"`) 不會在私訊中觸發 ack 回應。若要在 Telegram 傳入私訊中取得 ack 回應，請將 `messages.ackReactionScope` 設為 `"direct"` 或 `"all"`。此數值是在 Telegram 提供者啟動時讀取的，因此需要重新啟動 gateway 才能使變更生效。
    </Note>

  </Accordion>

  <Accordion title="Config writes from Telegram events and commands">
    頻道配置寫入功能預設為啟用 (`configWrites !== false`)。

    由 Telegram 觸發的寫入包括：

    - 群組遷移事件 (`migrate_to_chat_id`) 以更新 `channels.telegram.groups`
    - `/config set` 和 `/config unset` (需要啟用指令)

    停用方式：

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
    預設為長輪詢。若要使用 Webhook 模式，請設定 `channels.telegram.webhookUrl` 和 `channels.telegram.webhookSecret`；可選擇性設定 `webhookPath`、`webhookHost`、`webhookPort`（預設值為 `/telegram-webhook`、`127.0.0.1`、`8787`）。

    在長輪詢模式下，OpenClaw 僅在更新成功分派後才會保存其重新啟動浮水印。如果處理程式失敗，該更新會在同一個程序中保持可重試的狀態，且不會被標記為已完成以進行重新啟動重複資料排除。

    本地端監聽器會綁定至 `127.0.0.1:8787`。對於公開的連入流量，您可以在本地端口前方放置一個反向代理伺服器，或者刻意設定 `webhookHost: "0.0.0.0"`。

    Webhook 模式會在回傳 `200` 給 Telegram 之前，驗證請求守衛、Telegram 密鑰權杖以及 JSON 主體。
    接著 OpenClaw 會使用與長輪詢相同的「每個聊天/每個主題」機器人通道非同步地處理更新，因此緩慢的代理轉次不會佔用 Telegram 的傳遞 ACK。

  </Accordion>

  <Accordion title="限制、重試與 CLI 目標">
    - `channels.telegram.textChunkLimit` 預設為 4000。
    - `channels.telegram.chunkMode="newline"` 偏好在長度分割前優先使用段落邊界（空白行）。
    - `channels.telegram.mediaMaxMb` （預設 100）限制傳入與傳出的 Telegram 媒體大小。
    - `channels.telegram.mediaGroupFlushMs` （預設 500）控制在 OpenClaw 將 Telegram 專輯/媒體群組作為單一傳入訊息分派前的緩衝時間。若專輯部分延遲到達則增加此值；若要降低專輯回應延遲則減少此值。
    - `channels.telegram.timeoutSeconds` 覆寫 Telegram API 客戶端逾時（若未設定則套用 grammY 預設值）。Bot 客戶端會將設定值限制在 60 秒傳出文字/輸入請求防護之下，以避免 grammY 在 OpenClaw 的傳輸防護與後援機制運作前中斷可見回應的傳遞。長輪詢仍使用 45 秒的 `getUpdates` 請求防護，以免閒置輪詢被無限期遺棄。
    - `channels.telegram.pollingStallThresholdMs` 預設為 `120000`；僅針對誤判的輪詢停滯重啟，在 `30000` 與 `600000` 之間進行調整。
    - 群組內容歷史記錄使用 `channels.telegram.historyLimit` 或 `messages.groupChat.historyLimit` （預設 50）；`0` 則停用。
    - 當閘道已觀察到父訊息時，回覆/引用/轉發的補充內容會被標準化為一個選定的對話內容視窗；觀察訊息快取儲存於 OpenClaw SQLite 外掛狀態中，而 `openclaw doctor --fix` 則匯入舊版 sidecars。Telegram 在更新中僅包含一個淺層的 `reply_to_message`，因此早於快取的鏈結將受限於 Telegram 目前的更新載量。
    - Telegram 允許清單主要控制誰能觸發代理程式，而非完整的補充內容編修邊界。
    - DM（私訊）歷史記錄控制：
      - `channels.telegram.dmHistoryLimit`
      - `channels.telegram.dms["<user_id>"].historyLimit`
    - `channels.telegram.retry` 設定套用於 Telegram 傳送輔助程式（CLI/工具/動作），以處理可復原的傳出 API 錯誤。傳入的最終回覆傳遞也會針對 Telegram 連線前失敗使用有界的安全傳送重試，但不會重試可能導致可見訊息重複的模糊傳後網路信封。

    CLI 與訊息工具的傳送目標可以是數位聊天 ID、使用者名稱，或論壇主題目標：

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

    Telegram 專屬輪詢旗標：

    - `--poll-duration-seconds` （5-600）
    - `--poll-anonymous`
    - `--poll-public`
    - `--thread-id` 用於論壇主題（或使用 `:topic:` 目標）

    Telegram 傳送也支援：

    - `--presentation` 搭配 `buttons` 區塊以用於內聯鍵盤，當 `channels.telegram.capabilities.inlineButtons` 允許時
    - `--pin` 或 `--delivery '{"pin":true}'` 以在機器人能於該聊天中置頂時請求置頂傳遞
    - `--force-document` 以將傳出圖片、GIF 與影片作為檔案傳送，而非壓縮的照片、動態媒體或影片上傳

    動作閘控：

    - `channels.telegram.actions.sendMessage=false` 停用傳出 Telegram 訊息，包括輪詢
    - `channels.telegram.actions.poll=false` 停用 Telegram 輪詢建立，但保持一般傳送啟用

  </Accordion>

  <Accordion title="Telegram 中的執行審批">
    Telegram 支援在審批者的私人訊息（DM）中進行執行審批，並可選擇在原始聊天或主題中發出提示。審批者必須是 Telegram 的數位使用者 ID。

    設定路徑：

    - `channels.telegram.execApprovals.enabled` (當至少有一位審批者可解析時自動啟用)
    - `channels.telegram.execApprovals.approvers` (回退至來自 `commands.ownerAllowFrom` 的數位擁有者 ID)
    - `channels.telegram.execApprovals.target`: `dm` (預設) | `channel` | `both`
    - `agentFilter`, `sessionFilter`

    `channels.telegram.allowFrom`、`groupAllowFrom` 和 `defaultTo` 控制誰可以與機器人交談以及它將正常回覆傳送到何處。它們不會使某人成為執行審批者。當尚無命令擁有者時，第一個經過審批的私人訊息配對會引導 `commands.ownerAllowFrom`，因此單一擁有者設定仍然有效，而無需在 `execApprovals.approvers` 下重複 ID。

    頻道傳遞會在聊天中顯示命令文字；僅在信任的群組/主題中啟用 `channel` 或 `both`。當提示發送到論壇主題時，OpenClaw 會為審批提示和後續追蹤保留該主題。執行審批預設在 30 分鐘後過期。

    內聯審批按鈕還需要 `channels.telegram.capabilities.inlineButtons` 來允許目標介面 (`dm`、`group` 或 `all`)。加上 `plugin:` 前綴的審批 ID 透過外掛程式審批解析；其他的則優先透過執行審批解析。

    請參閱 [執行審批](/zh-Hant/tools/exec-approvals)。

  </Accordion>
</AccordionGroup>

## 錯誤回覆控制

當代理程式遇到傳遞或提供者錯誤時，Telegram 可以回覆錯誤文字或將其隱藏。兩個配置金鑰控制此行為：

| 金鑰                                | 數值              | 預設值  | 描述                                                               |
| ----------------------------------- | ----------------- | ------- | ------------------------------------------------------------------ |
| `channels.telegram.errorPolicy`     | `reply`, `silent` | `reply` | `reply` 會傳送友善的錯誤訊息至聊天。`silent` 則完全抑制錯誤回覆。  |
| `channels.telegram.errorCooldownMs` | 數值 (毫秒)       | `60000` | 向同一聊天發送錯誤回覆之間的最短時間。防止在故障期間錯誤訊息刷屏。 |

支援每帳戶、每群組和每主題的覆寫（繼承方式與其他 Telegram 設定鍵相同）。

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
  <Accordion title="機器人不回應未提及的群組訊息">

    - 如果設定為 `requireMention=false`，Telegram 隱私模式必須允許完整可見性。
      - BotFather：`/setprivacy` -> 停用
      - 然後從群組中移除並重新加入機器人
    - 當設定預期未提及的群組訊息時，`openclaw channels status` 會發出警告。
    - `openclaw channels status --probe` 可以檢查明確的數字群組 ID；萬用字元 `"*"` 無法進行成員資格探測。
    - 快速會話測試：`/activation always`。

  </Accordion>

  <Accordion title="機器人完全看不到群組訊息">

    - 當存在 `channels.telegram.groups` 時，群組必須被列出（或包含 `"*"`）
    - 驗證機器人在群組中的成員資格
    - 檢查日誌：`openclaw logs --follow` 以了解跳過原因

  </Accordion>

  <Accordion title="指令部分運作或完全不運作">

    - 授權您的發送者身分（配對和/或數字 `allowFrom`）
    - 即使群組原則為 `open`，指令授權仍然適用
    - `setMyCommands failed` 並帶有 `BOT_COMMANDS_TOO_MUCH` 表示原生選單項目過多；請減少外掛/技能/自訂指令或停用原生選單
    - `deleteMyCommands` / `setMyCommands` 啟動呼叫和 `sendChatAction` 輸入呼叫有界，並在請求逾時時透過 Telegram 的傳輸備援機制重試一次。持續的網路/擷取錯誤通常表示對 `api.telegram.org` 的 DNS/HTTPS 連線能力問題

  </Accordion>

  <Accordion title="Startup reports unauthorized token">

    - `getMe returned 401` 是針對所配置機器人 Token 的 Telegram 身份驗證失敗。
    - 在 BotFather 中重新複製或重新產生機器人 Token，然後更新預設帳戶的 `channels.telegram.botToken`、`channels.telegram.tokenFile`、`channels.telegram.accounts.<id>.botToken` 或 `TELEGRAM_BOT_TOKEN`。
    - 啟動期間的 `deleteWebhook 401 Unauthorized` 也是身分驗證失敗；將其視為「不存在 Webhook」只會將相同的無效 Token 失敗延後到之後的 API 呼叫。

  </Accordion>

  <Accordion title="輪詢或網路不穩定">

    - Node 22+ + 自訂 fetch/proxy 若 AbortSignal 類型不匹配，可能觸發立即中止行為。
    - 某些主機優先將 `api.telegram.org` 解析為 IPv6；損壞的 IPv6 出站可能導致間歇性的 Telegram API 失敗。
    - 如果日誌包含 `TypeError: fetch failed` 或 `Network request for 'getUpdates' failed!`，OpenClaw 現在會將這些作為可恢復的網路錯誤重試。
    - 在輪詢啟動期間，OpenClaw 會重用成功啟動的 grammY `getMe` 探測，因此執行器在第一個 `getUpdates` 之前不需要第二個 `getMe`。
    - 如果 `deleteWebhook` 在輪詢啟動期間因暫時性網路錯誤而失敗，OpenClaw 會繼續進行長輪詢，而不是發出另一個輪詢前控制平面呼叫。仍然活躍的 webhook 會顯示為 `getUpdates` 衝突；OpenClaw 然後會重建傳輸並重試 webhook 清理。
    - 如果 Telegram sockets 在短暫的固定節奏上回收，請檢查 `channels.telegram.timeoutSeconds` 是否過低；bot 客戶端會將配置值限制在出站和 `getUpdates` 請求防護之下，但舊版本當此值設定低於這些防護時可能會中止每次輪詢或回覆。
    - 如果日誌包含 `Polling stall detected`，OpenClaw 預設會在 120 秒內沒有完成長輪詢存活時重新啟動輪詢並重建 Telegram 傳輸。
    - 當運行中的輪詢帳號在啟動寬限期後未完成 `getUpdates`，或運行中的 webhook 帳號在啟動寬限期後未完成 `setWebhook`，或最後一次成功的輪詢傳輸活動過舊時，`openclaw channels status --probe` 和 `openclaw doctor` 會發出警告。
    - 僅當長時間運行的 `getUpdates` 呼叫正常但您的主機仍報告錯誤的輪詢停滯重啟時，才增加 `channels.telegram.pollingStallThresholdMs`。持續的停滯通常指向主機與 `api.telegram.org` 之間的代理、DNS、IPv6 或 TLS 出站問題。
    - Telegram 也尊重 Bot API 傳輸的程序代理環境變數，包括 `HTTP_PROXY`、`HTTPS_PROXY`、`ALL_PROXY` 及其小寫變體。`NO_PROXY` / `no_proxy` 仍可繞過 `api.telegram.org`。
    - 如果 OpenClaw 管理代理透過 `OPENCLAW_PROXY_URL` 針對服務環境進行配置，且不存在標準代理環境變數，Telegram 也會使用該 URL 進行 Bot API 傳輸。
    - 在具有不穩定直接出站/TLS 的 VPS 主機上，透過 `channels.telegram.proxy` 路由 Telegram API 呼叫：

```yaml
channels:
  telegram:
    proxy: socks5://<user>:<password>@proxy-host:1080
```

    - Node 22+ 預設為 `autoSelectFamily=true`（WSL2 除外）。Telegram DNS 結果順序尊重 `OPENCLAW_TELEGRAM_DNS_RESULT_ORDER`，然後是 `channels.telegram.network.dnsResultOrder`，然後是程序預設值，例如 `NODE_OPTIONS=--dns-result-order=ipv4first`；如果都不適用，Node 22+ 會回退到 `ipv4first`。
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
      加入僅 Telegram 繞過：

```yaml
channels:
  telegram:
    network:
      dangerouslyAllowPrivateNetwork: true
```

    - 每個帳號也可以在
      `channels.telegram.accounts.<accountId>.network.dangerouslyAllowPrivateNetwork` 使用相同的選擇加入選項。
    - 如果您的代理將 Telegram 媒體主機解析為 `198.18.x.x`，請先保留
      危險旗標關閉。Telegram 媒體預設已允許 RFC 2544
      基準範圍。

    <Warning>
      `channels.telegram.network.dangerouslyAllowPrivateNetwork` 會削弱 Telegram
      媒體 SSRF 防護。僅在受信任的操作員控制代理環境（如 Clash、Mihomo 或 Surge 假 IP 路由）中使用它，
      當它們綜合出 RFC 2544 基準範圍之外的
      私有或特殊用途答案時。對於正常的公共網際網路 Telegram 存取，請將其關閉。
    </Warning>

    - 環境覆蓋（臨時）：
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

主要參考：[組態參考 - Telegram](/zh-Hant/gateway/config-channels#telegram)。

<Accordion title="高重要性的 Telegram 欄位">

- 啟動/授權：`enabled`、`botToken`、`tokenFile`、`accounts.*`（`tokenFile` 必須指向一般檔案；不接受符號連結）
- 存取控制：`dmPolicy`、`allowFrom`、`groupPolicy`、`groupAllowFrom`、`groups`、`groups.*.topics.*`、頂層 `bindings[]`（`type: "acp"`）
- 主題預設值：`groups.<chatId>.topics."*"` 套用於未匹配的論壇主題；精確的主題 ID 會覆寫它
- 執行核准：`execApprovals`、`accounts.*.execApprovals`
- 指令/選單：`commands.native`、`commands.nativeSkills`、`customCommands`
- 執行緒/回覆：`replyToMode`
- 串流：`streaming`（預覽）、`streaming.preview.toolProgress`、`blockStreaming`
- 格式/傳遞：`textChunkLimit`、`chunkMode`、`linkPreview`、`responsePrefix`
- 媒體/網路：`mediaMaxMb`、`mediaGroupFlushMs`、`timeoutSeconds`、`pollingStallThresholdMs`、`retry`、`network.autoSelectFamily`、`network.dangerouslyAllowPrivateNetwork`、`proxy`
- 自訂 API 根目錄：`apiRoot`（僅限 Bot API 根目錄；不要包含 `/bot<TOKEN>`）
- Webhook：`webhookUrl`、`webhookSecret`、`webhookPath`、`webhookHost`
- 動作/功能：`capabilities.inlineButtons`、`actions.sendMessage|editMessage|deleteMessage|reactions|sticker`
- 反應：`reactionNotifications`、`reactionLevel`
- 錯誤：`errorPolicy`、`errorCooldownMs`
- 寫入/歷史紀錄：`configWrites`、`historyLimit`、`dmHistoryLimit`、`dms.*.historyLimit`

</Accordion>

<Note>多帳號優先級：當配置了兩個或多個帳號 ID 時，請設定 `channels.telegram.defaultAccount`（或包含 `channels.telegram.accounts.default`）以明確預設路由。否則 OpenClaw 將回退到第一個正規化的帳號 ID，且 `openclaw doctor` 會發出警告。命名帳號會繼承 `channels.telegram.allowFrom` / `groupAllowFrom`，但不繼承 `accounts.default.*` 值。</Note>

## 相關

<CardGroup cols={2}>
  <Card title="配對" icon="link" href="/zh-Hant/channels/pairing">
    將 Telegram 使用者與閘道配對。
  </Card>
  <Card title="群組" icon="users" href="/zh-Hant/channels/groups">
    群組與主題的允許清單行為。
  </Card>
  <Card title="頻道路由" icon="route" href="/zh-Hant/channels/channel-routing">
    將訊息路由至代理程式。
  </Card>
  <Card title="安全性" icon="shield" href="/zh-Hant/gateway/security">
    威脅模型與強化防護。
  </Card>
  <Card title="多代理路由" icon="sitemap" href="/zh-Hant/concepts/multi-agent">
    將群組和主題對應至代理程式。
  </Card>
  <Card title="疑難排解" icon="wrench" href="/zh-Hant/channels/troubleshooting">
    跨頻道診斷。
  </Card>
</CardGroup>
