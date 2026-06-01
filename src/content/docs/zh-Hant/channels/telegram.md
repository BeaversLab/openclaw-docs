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
    - 有效格式：`a-z`、`0-9`、`_`，長度 `1..32`
    - 自訂指令無法覆蓋原生指令
    - 衝突/重複項目會被跳過並記錄

    備註：

    - 自訂指令僅是選單項目；它們不會自動實作行為
    - 即使未顯示在 Telegram 選單中，外掛/技能指令在被輸入時仍可運作

    如果停用原生指令，內建指令會被移除。若有設定，自訂/外掛指令仍可能註冊。

    常見設定失敗：

    - 出現 `setMyCommands failed` 且 `BOT_COMMANDS_TOO_MUCH`，表示 Telegram 選單在修剪後仍溢位；請減少外掛/技能/自訂指令或停用 `channels.telegram.commands.native`。
    - 當直接 Bot API curl 指令可運作，但 `deleteWebhook`、`deleteMyCommands` 或 `setMyCommands` 失敗並出現 `404: Not Found` 時，可能表示 `channels.telegram.apiRoot` 被設為完整的 `/bot<TOKEN>` 端點。`apiRoot` 必須僅是 Bot API 根目錄，而 `openclaw doctor --fix` 會移除意外出現在結尾的 `/bot<TOKEN>`。
    - `getMe returned 401` 表示 Telegram 拒絕了設定的 Bot Token。請使用目前的 BotFather Token 更新 `botToken`、`tokenFile` 或 `TELEGRAM_BOT_TOKEN`；OpenClaw 會在輪詢前停止，因此這不會被回報為 Webhook 清理失敗。
    - `setMyCommands failed` 伴隨網路/fetch 錯誤，通常表示到 `api.telegram.org` 的連出 DNS/HTTPS 被封鎖。

    ### 裝置配對指令（`device-pair` 外掛）

    當安裝 `device-pair` 外掛時：

    1. `/pair` 產生設定碼
    2. 在 iOS App 中貼上程式碼
    3. `/pair pending` 列出待審請求（包括角色/範圍）
    4. 批准請求：
       - `/pair approve <requestId>` 用於明確批准
       - `/pair approve` 當只有一個待審請求時
       - `/pair approve latest` 用於最近的一個

    設定碼攜帶短期啟動 Token。內建設定碼啟動僅適用於節點：首次連線會建立待審節點請求，批准後 Gateway 會透過 `scopes: []` 傳回持久節點 Token。它不會傳回移交的操作員 Token；操作員存取需要單獨批准的操作員配對或 Token 流程。

    如果裝置使用變更的驗證詳細資料（例如角色/範圍/公開金鑰）重試，先前的待審請求會被取代，新請求會使用不同的 `requestId`。請在批准前重新執行 `/pair pending`。

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
    Telegram 工具動作包括：

    - `sendMessage` (`to`、`content`、可選的 `mediaUrl`、`replyToMessageId`、`messageThreadId`)
    - `react` (`chatId`、`messageId`、`emoji`)
    - `deleteMessage` (`chatId`、`messageId`)
    - `editMessage` (`chatId`、`messageId`、`content`)
    - `createForumTopic` (`chatId`、`name`、可選的 `iconColor`、`iconCustomEmojiId`)

    頻道訊息動作提供符合人體工學的別名 (`send`、`react`、`delete`、`edit`、`sticker`、`sticker-search`、`topic-create`)。

    閘道控制：

    - `channels.telegram.actions.sendMessage`
    - `channels.telegram.actions.deleteMessage`
    - `channels.telegram.actions.reactions`
    - `channels.telegram.actions.sticker` (預設：停用)

    注意：`edit` 和 `topic-create` 目前預設為啟用，且沒有獨立的 `channels.telegram.actions.*` 切換開關。
    執行時期發送使用作用中的組態/機密快照 (啟動/重新載入)，因此動作路徑不會在每次發送時執行臨時的 SecretRef 重新解析。

    反應移除語意：[/tools/reactions](/zh-Hant/tools/reactions)

  </Accordion>

  <Accordion title="Reply threading tags">
    Telegram 支援在生成的輸出中使用明確的回覆串接標籤：

    - `[[reply_to_current]]` 回覆觸發訊息
    - `[[reply_to:<id>]]` 回覆特定的 Telegram 訊息 ID

    `channels.telegram.replyToMode` 控制處理方式：

    - `off` (預設)
    - `first`
    - `all`

    當啟用回覆串接且原始 Telegram 文字或說明文字可用時，OpenClaw 會自動包含原生的 Telegram 引用摘要。Telegram 將原生引用文字限制在 1024 個 UTF-16 碼位，因此較長的訊息會從開頭開始引用，如果 Telegram 拒絕該引用，則會退回為一般回覆。

    注意：`off` 會停用隱式回覆串接。明確的 `[[reply_to_*]]` 標籤仍然有效。

  </Accordion>

  <Accordion title="論壇主題與貼文行為">
    論壇超級群組：

    - 主題工作階段金鑰會附加 `:topic:<threadId>`
    - 回覆與打字動作以主題貼文為目標
    - 主題設定路徑：
      `channels.telegram.groups.<chatId>.topics.<threadId>`

    一般主題 (`threadId=1`) 的特殊情況：

    - 訊息傳送會省略 `message_thread_id` (Telegram 會拒絕 `sendMessage(...thread_id=1)`)
    - 打字動作仍會包含 `message_thread_id`

    主題繼承：主題項目會繼承群組設定，除非被覆寫 (`requireMention`、`allowFrom`、`skills`、`systemPrompt`、`enabled`、`groupPolicy`)。
    `agentId` 僅限主題使用，不會繼承群組預設值。
    `topics."*"` 會為該群組中的每個主題設定預設值；精確的主題 ID 仍優先於 `"*"`。

    **各主題代理程式路由**：每個主題可以透過在主題設定中設定 `agentId` 來路由到不同的代理程式。這會賦予每個主題自己獨立的工作區、記憶體和工作階段。範例：

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

    每個主題隨後會有自己的工作階段金鑰：`agent:zu:telegram:group:-1001234567890:topic:3`

    **持續性 ACP 主題綁定**：論壇主題可以透過頂層類型化的 ACP 綁定來釘選 ACP 駕驭工作階段 (`bindings[]` 搭配 `type: "acp"` 和 `match.channel: "telegram"`、`peer.kind: "group"`，以及像 `-1001234567890:topic:42` 這樣的主題限定 ID)。目前範圍僅限於群組/超級群組中的論壇主題。請參閱 [ACP Agents](/zh-Hant/tools/acp-agents)。

    **從聊天產生的貼文綁定 ACP 衍生**：`/acp spawn <agent> --thread here|auto` 會將目前的主題綁定到新的 ACP 工作階段；後續訊息會直接路由至該處。OpenClaw 會將衍生確認訊息釘選在主題內。需要 `channels.telegram.threadBindings.spawnSessions` 保持啟用 (預設值：`true`)。

    模板內容會公開 `MessageThreadId` 和 `IsForum`。具有 `message_thread_id` 的 DM 聊天會保留回覆元資料；它們僅在 Telegram `getMe` 回報機器人的 `has_topics_enabled: true` 時，才會使用具備貼文感知能力的工作階段金鑰。
    舊有的 `dm.threadReplies` 和 `direct.*.threadReplies` 覆寫已有意淘汰；請使用 BotFather 貼文模式作為唯一真實來源，並執行 `openclaw doctor --fix` 以移除過時的設定金鑰。

  </Accordion>

  <Accordion title="音訊、影片與貼圖">
    ### 音訊訊息

    Telegram 會區分語音訊備忘錄與音訊檔案。

    - 預設值：音訊檔案的行為模式
    - 在代理程式回覆中加上標籤 `[[audio_as_voice]]` 以強制發送語音訊備忘錄
    - 傳入的語音訊備忘錄轉錄文字在代理程式語境中會被標示為機器生成且
      不可信的文字；提及偵測仍會使用原始轉錄文字，因此受提及限制的語音訊息
      能繼續運作。

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

    Telegram 會區分影片檔案與影片訊備忘錄。

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

    影片訊備忘錄不支援字幕；提供的訊息文字會另外單獨發送。

    ### 貼圖

    傳入貼圖的處理方式：

    - 靜態 WEBP：下載並處理（預留位置 `<media:sticker>`）
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

    貼圖僅會描述一次（若可行的話）並進行快取，以減少重複的視覺辨識呼叫。

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
    Telegram 回應作為 `message_reaction` 更新到達（與訊息負載分開）。

    啟用後，OpenClaw 會將系統事件加入佇列，例如：

    - `Telegram reaction added: 👍 by Alice (@alice) on msg 42`

    設定：

    - `channels.telegram.reactionNotifications`: `off | own | all` (預設： `own`)
    - `channels.telegram.reactionLevel`: `off | ack | minimal | extensive` (預設： `minimal`)

    註事項：

    - `own` 表示僅限使用者對 Bot 發送訊息的回應（透過已發送訊息快取盡力而為）。
    - 回應事件仍遵守 Telegram 存取控制 (`dmPolicy`, `allowFrom`, `groupPolicy`, `groupAllowFrom`)；未經授權的發送者會被捨棄。
    - Telegram 不會在回應更新中提供執行緒 ID。
      - 非論壇群組會路由至群組聊天工作階段
      - 論壇群組會路由至群組一般主題工作階段 (`:topic:1`)，而非確切的原始主題

    用於輪詢/Webhook 的 `allowed_updates` 會自動包含 `message_reaction`。

  </Accordion>

  <Accordion title="Ack reactions">
    當 OpenClaw 正在處理傳入訊息時，`ackReaction` 會發送一個確認表情符號。`ackReactionScope` 決定了該表情符號實際發送的*時機*。

    **表情符號 (`ackReaction`) 解析順序：**

    - `channels.telegram.accounts.<accountId>.ackReaction`
    - `channels.telegram.ackReaction`
    - `messages.ackReaction`
    - agent 身份表情符號回退 (`agents.list[].identity.emoji`，否則為 "👀")

    注意事項：

    - Telegram 預期使用 unicode 表情符號 (例如 "👀")。
    - 使用 `""` 可針對頻道或帳號停用回應反應。

    **範圍 (`messages.ackReactionScope`)：**

    Telegram 提供者會從 `messages.ackReactionScope` 讀取範圍 (預設為 `"group-mentions"`)。目前尚無 Telegram 帳號或 Telegram 頻道層級的覆寫設定。

    數值：`"all"` (DM + 群組)、`"direct"` (僅 DM)、`"group-all"` (每則群組訊息，無 DM)、`"group-mentions"` (當機器人被提及時的群組；**無 DM** — 這是預設值)、`"off"` / `"none"` (停用)。

    <Note>
    預設範圍 (`"group-mentions"`) 不會在直接訊息中觸發 ack 反應。若要在傳入的 Telegram DM 中獲得 ack 反應，請將 `messages.ackReactionScope` 設為 `"direct"` 或 `"all"`。此數值是在 Telegram 提供者啟動時讀取的，因此需要重新啟動 Gateway 才能讓變更生效。
    </Note>

  </Accordion>

  <Accordion title="Config writes from Telegram events and commands">
    頻道配置寫入預設為啟用 (`configWrites !== false`)。

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

  <Accordion title="Long polling vs webhook">
    預設為長輪詢。若要使用 Webhook 模式，請設定 `channels.telegram.webhookUrl` 和 `channels.telegram.webhookSecret`；可選設定 `webhookPath`、`webhookHost`、`webhookPort`（預設值為 `/telegram-webhook`、`127.0.0.1`、`8787`）。

    在長輪詢模式下，OpenClaw 僅在更新成功分發後才會保存其重新啟動水位線。如果處理程序失敗，該更新仍可在同一程序中重試，且不會被標記為已完成以避免重新啟動時的重複。

    本地監聽器綁定至 `127.0.0.1:8787`。若需公開訪問，請在本地埠前放置反向代理，或刻意設定 `webhookHost: "0.0.0.0"`。

    Webhook 模式會在向 Telegram 回傳 `200` 之前，驗證請求守衛、Telegram 密鑰令牌以及 JSON 主體。
    OpenClaw 隨後使用與長輪詢相同的每個聊天/每個主題 Bot 通道非同步處理更新，因此緩慢的 Agent 轉次不會佔用 Telegram 的傳遞 ACK。

  </Accordion>

  <Accordion title="限制、重試與 CLI 目標">
    - `channels.telegram.textChunkLimit` 預設為 4000。
    - `channels.telegram.chunkMode="newline"` 偏好在長度分割前使用段落邊界（空白行）。
    - `channels.telegram.mediaMaxMb`（預設 100）限制傳入與傳出的 Telegram 媒體大小。
    - `channels.telegram.mediaGroupFlushMs`（預設 500）控制在 OpenClaw 將 Telegram 專輯/媒體群組作為單一傳入訊息分派之前緩衝的時間長度。如果專輯部分延遲到達，請增加此值；若要減少專輯回覆延遲，則減少此值。
    - `channels.telegram.timeoutSeconds` 會覆寫 Telegram API 用戶端逾時（若未設定，則套用 grammY 預設值）。Bot 用戶端會將設定值限制在 60 秒的傳出文字/輸入中要求防護之下，以便 grammY 不會在 OpenClaw 的傳輸防護與後備機制執行之前中止可見的回覆傳遞。長輪詢仍使用 45 秒的 `getUpdates` 要求防護，以免閒置輪詢被無限期放棄。
    - `channels.telegram.pollingStallThresholdMs` 預設為 `120000`；僅針對誤報輪詢停頓重啟，在 `30000` 與 `600000` 之間進行調整。
    - 群組情境歷史記錄使用 `channels.telegram.historyLimit` 或 `messages.groupChat.historyLimit`（預設 50）；`0` 會停用它。
    - 當閘道觀察到父訊息時，回覆/引用/轉發的補充情境會正規化為一個選定的對話情境視窗；觀察到的訊息快取會與會話存放區並存。Telegram 在更新中僅包含一個淺層 `reply_to_message`，因此早於快取的鏈結會受限於 Telegram 目前的更新承載。
    - Telegram 許可清單主要控管誰能觸發代理程式，而非完整的補充情境編輯邊界。
    - DM 歷史記錄控制：
      - `channels.telegram.dmHistoryLimit`
      - `channels.telegram.dms["<user_id>"].historyLimit`
    - `channels.telegram.retry` 設定適用於 Telegram 傳送輔助程式（CLI/工具/動作），用於處理可復原的傳出 API 錯誤。傳入的最終回覆傳遞也會針對 Telegram 連線前失敗使用有限的安全傳送重試，但不會重試可能重複可見訊息的模稜兩可的傳送後網路封包。

    CLI 和訊息工具傳送目標可以是數值聊天 ID、使用者名稱或論壇主題目標：

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

    - `--poll-duration-seconds` (5-600)
    - `--poll-anonymous`
    - `--poll-public`
    - `--thread-id` 用於論壇主題（或使用 `:topic:` 目標）

    Telegram 傳送也支援：

    - 當 `channels.telegram.capabilities.inlineButtons` 允許時，使用 `--presentation` 與 `buttons` 區塊作為內聯鍵盤
    - 當機器人可以在該聊天中釘選訊息時，使用 `--pin` 或 `--delivery '{"pin":true}'` 請求釘選傳遞
    - 使用 `--force-document` 將傳出圖片、GIF 和影片以文件形式傳送，而不是壓縮的照片、動畫媒體或影片上傳

    動作閘控：

    - `channels.telegram.actions.sendMessage=false` 停用傳出的 Telegram 訊息，包括輪詢
    - `channels.telegram.actions.poll=false` 停用 Telegram 輪詢建立，同時保持一般傳送已啟用

  </Accordion>

  <Accordion title="Telegram 中的執行核准">
    Telegram 支援在核准者的私訊（DM）中進行執行核准，並可選擇性地在原始聊天或主題中發佈提示。核准者必須是 Telegram 的數位使用者 ID。

    配置路徑：

    - `channels.telegram.execApprovals.enabled` （當至少有一位核准者可解析時自動啟用）
    - `channels.telegram.execApprovals.approvers` （回退至 `commands.ownerAllowFrom` 中的數位擁有者 ID）
    - `channels.telegram.execApprovals.target`： `dm` （預設） | `channel` | `both`
    - `agentFilter`， `sessionFilter`

    `channels.telegram.allowFrom`、`groupAllowFrom` 和 `defaultTo` 控制誰可以與機器人交談以及它發送一般回覆的位置。它們不會將某人變為執行核准者。當尚不存在命令擁有者時，第一個獲得核准的私訊配對會引導 `commands.ownerAllowFrom`，因此單一擁有者設定仍然可以在 `execApprovals.approvers` 下不重複 ID 的情況下運作。

    頻道傳遞會在聊天中顯示命令文字；僅在受信任的群組/主題中啟用 `channel` 或 `both`。當提示進入論壇主題時，OpenClaw 會為核准提示和後續追蹤保留該主題。執行核准預設在 30 分鐘後過期。

    內聯核准按鈕還需要 `channels.telegram.capabilities.inlineButtons` 來允許目標表面（`dm`、`group` 或 `all`）。以 `plugin:` 為前綴的核准 ID 通過外掛程式核准解析；其他則首先通過執行核准解析。

    參見 [執行核准](/zh-Hant/tools/exec-approvals)。

  </Accordion>
</AccordionGroup>

## 錯誤回覆控制

當代理程式遇到傳遞或提供者錯誤時，Telegram 可以回覆錯誤文字或將其隱藏。兩個配置金鑰控制此行為：

| 金鑰                                | 數值               | 預設值  | 描述                                                               |
| ----------------------------------- | ------------------ | ------- | ------------------------------------------------------------------ |
| `channels.telegram.errorPolicy`     | `reply`， `silent` | `reply` | `reply` 向聊天發送友好的錯誤訊息。`silent` 完全禁止錯誤回覆。      |
| `channels.telegram.errorCooldownMs` | 數值 (毫秒)        | `60000` | 向同一聊天發送錯誤回覆之間的最短時間。防止在故障期間錯誤訊息刷屏。 |

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
  <Accordion title="Bot 不回應非提及的群組訊息">

    - 如果 `requireMention=false`，Telegram 隱私模式必須允許完整可見性。
      - BotFather: `/setprivacy` -> Disable
      - 然後將機器人從群組移除並重新加入
    - `openclaw channels status` 會在設定預期接收非提及群組訊息時發出警告。
    - `openclaw channels status --probe` 可以檢查明確的數字群組 ID；萬用字元 `"*"` 無法進行成員資格探查。
    - 快速會話測試: `/activation always`。

  </Accordion>

  <Accordion title="Bot 完全看不到群組訊息">

    - 當 `channels.telegram.groups` 存在時，群組必須被列出（或包含 `"*"`）
    - 驗證機器人在群組中的成員資格
    - 檢查日誌: `openclaw logs --follow` 以了解跳過原因

  </Accordion>

  <Accordion title="指令部分或完全失效">

    - 授權您的發送者身分 (配對和/或數字 `allowFrom`)
    - 即使群組原則是 `open`，指令授權仍然適用
    - `setMyCommands failed` 搭配 `BOT_COMMANDS_TOO_MUCH` 表示原生選單項目過多；請減少外掛/技能/自訂指令或停用原生選單
    - `deleteMyCommands` / `setMyCommands` 啟動呼叫和 `sendChatAction` 輸入呼叫是有界的，並且在請求逾時時透過 Telegram 的傳輸備援機制重試一次。持續的網路/fetch 錯誤通常表示對 `api.telegram.org` 的 DNS/HTTPS 連線性問題

  </Accordion>

  <Accordion title="啟動時回報未授權的權杖">

    - `getMe returned 401` 表示針對所設定的機器人權杖進行 Telegram 身分驗證失敗。
    - 請重新複製或在 BotFather 中重新產生機器人權杖，然後更新預設帳戶的 `channels.telegram.botToken`、`channels.telegram.tokenFile`、`channels.telegram.accounts.<id>.botToken` 或 `TELEGRAM_BOT_TOKEN`。
    - 啟動時的 `deleteWebhook 401 Unauthorized` 也是一種身分驗證失敗；若將其視為「不存在 webhook」只會將相同的錯誤權杖失敗延後到稍後的 API 呼叫。

  </Accordion>

  <Accordion title="輪詢或網路不穩定">

    - Node 22+ + 自訂 fetch/proxy 若 AbortSignal 類型不匹配，可能會觸發立即中止行為。
    - 部份主機會優先將 `api.telegram.org` 解析為 IPv6；損壞的 IPv6 出網會導致 Telegram API 間歇性失敗。
    - 若日誌包含 `TypeError: fetch failed` 或 `Network request for 'getUpdates' failed!`，OpenClaw 現在會將這些視為可恢復的網路錯誤並重試。
    - 在輪詢啟動期間，OpenClaw 會重用 grammY 成功的啟動 `getMe` 探測，因此執行器在第一次 `getUpdates` 之前不需要進行第二次 `getMe`。
    - 若 `deleteWebhook` 在輪詢啟動期間因暫時性網路錯誤而失敗，OpenClaw 會繼續進入長輪詢，而不是發出另一個輪詢前控制平面呼叫。仍然活躍的 webhook 會顯示為 `getUpdates` 衝突；OpenClaw 隨後會重建 Telegram 傳輸並重試 webhook 清理。
    - 如果 Telegram socket 以固定的短週期回收，請檢查 `channels.telegram.timeoutSeconds` 是否過低；bot 客戶端會將設定值限制在出站和 `getUpdates` 請求防護之下，但在舊版本中，若設定值低於這些防護值，可能導致每次輪詢或回覆都中止。
    - 如果日誌包含 `Polling stall detected`，OpenClaw 預設會在 120 秒內未完成長輪詢存活後重新啟動輪詢並重建 Telegram 傳輸。
    - `openclaw channels status --probe` 和 `openclaw doctor` 會在以下情況發出警告：執行中的輪詢帳戶在啟動寬限期後未完成 `getUpdates`、執行中的 webhook 帳戶在啟動寬限期後未完成 `setWebhook`，或最後一次成功的輪詢傳輸活動已過時。
    - 僅當長時間執行的 `getUpdates` 呼叫健康，但您的伺服器仍回報錯誤的輪詢停滯重啟時，才增加 `channels.telegram.pollingStallThresholdMs`。持續停滯通常指向主機與 `api.telegram.org` 之間的 Proxy、DNS、IPv6 或 TLS 出網問題。
    - Telegram 也尊重 Bot API 傳輸的程式代理環境變數，包括 `HTTP_PROXY`、`HTTPS_PROXY`、`ALL_PROXY` 及其小寫變體。`NO_PROXY` / `no_proxy` 仍可繞過 `api.telegram.org`。
    - 如果 OpenClaw 管理的代理透過 `OPENCLAW_PROXY_URL` 為服務環境進行配置，且不存在標準代理環境變數，Telegram 也會使用該 URL 進行 Bot API 傳輸。
    - 在直連出網/TLS 不穩定的 VPS 主機上，透過 `channels.telegram.proxy` 路由 Telegram API 呼叫：

```yaml
channels:
  telegram:
    proxy: socks5://<user>:<password>@proxy-host:1080
```

    - Node 22+ 預設為 `autoSelectFamily=true` (WSL2 除外)。Telegram DNS 結果順序尊重 `OPENCLAW_TELEGRAM_DNS_RESULT_ORDER`，然後是 `channels.telegram.network.dnsResultOrder`，接著是程序預設值如 `NODE_OPTIONS=--dns-result-order=ipv4first`；如果都不適用，Node 22+ 會回退到 `ipv4first`。
    - 如果您的主機是 WSL2 或明確使用 IPv4 運作得更好，請強制選擇系列：

```yaml
channels:
  telegram:
    network:
      autoSelectFamily: false
```

    - RFC 2544 基準範圍的答案 (`198.18.0.0/15`) 預設已允許
      用於 Telegram 媒體下載。如果受信任的偽 IP 或
      透明代理在媒體下載期間將 `api.telegram.org` 重寫為其他
      私有/內部/特殊用途位址，您可以選擇
      啟用僅 Telegram 的繞過：

```yaml
channels:
  telegram:
    network:
      dangerouslyAllowPrivateNetwork: true
```

    - 相同的選項也可在每個帳戶使用，位於
      `channels.telegram.accounts.<accountId>.network.dangerouslyAllowPrivateNetwork`。
    - 如果您的代理將 Telegram 媒體主機解析為 `198.18.x.x`，請先關閉
      危險標誌。Telegram 媒體預設已允許 RFC 2544
      基準範圍。

    <Warning>
      `channels.telegram.network.dangerouslyAllowPrivateNetwork` 會削弱 Telegram
      媒體 SSRF 防護。僅在受信任的操作員控制代理環境中使用，
      例如 Clash、Mihomo 或 Surge 偽 IP 路由，當它們
      在 RFC 2544 基準範圍之外合成私有或特殊用途答案時。
      對於正常的公開網際網路 Telegram 存取，請保持關閉。
    </Warning>

    - 環境覆寫 (暫時性)：
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

<Accordion title="高重要性 Telegram 欄位">

- startup/auth: `enabled`, `botToken`, `tokenFile`, `accounts.*` (`tokenFile` 必須指向一般檔案；不接受符號連結)
- access control: `dmPolicy`, `allowFrom`, `groupPolicy`, `groupAllowFrom`, `groups`, `groups.*.topics.*`, 頂層 `bindings[]` (`type: "acp"`)
- topic defaults: `groups.<chatId>.topics."*"` 套用於未匹配的論壇主題；精確的主題 ID 會覆寫它
- exec approvals: `execApprovals`, `accounts.*.execApprovals`
- command/menu: `commands.native`, `commands.nativeSkills`, `customCommands`
- threading/replies: `replyToMode`
- streaming: `streaming` (預覽), `streaming.preview.toolProgress`, `blockStreaming`
- formatting/delivery: `textChunkLimit`, `chunkMode`, `linkPreview`, `responsePrefix`
- media/network: `mediaMaxMb`, `mediaGroupFlushMs`, `timeoutSeconds`, `pollingStallThresholdMs`, `retry`, `network.autoSelectFamily`, `network.dangerouslyAllowPrivateNetwork`, `proxy`
- custom API root: `apiRoot` (僅限 Bot API root；請勿包含 `/bot<TOKEN>`)
- webhook: `webhookUrl`, `webhookSecret`, `webhookPath`, `webhookHost`
- actions/capabilities: `capabilities.inlineButtons`, `actions.sendMessage|editMessage|deleteMessage|reactions|sticker`
- reactions: `reactionNotifications`, `reactionLevel`
- errors: `errorPolicy`, `errorCooldownMs`
- writes/history: `configWrites`, `historyLimit`, `dmHistoryLimit`, `dms.*.historyLimit`

</Accordion>

<Note>多帳號優先順序：當配置了兩個或更多帳號 ID 時，請設定 `channels.telegram.defaultAccount`（或包含 `channels.telegram.accounts.default`）以明確指定預設路由。否則，OpenClaw 將回退到第一個標準化的帳號 ID，且 `openclaw doctor` 會發出警告。命名帳號會繼承 `channels.telegram.allowFrom` / `groupAllowFrom`，但不會繼承 `accounts.default.*` 的值。</Note>

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
