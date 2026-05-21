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
- DM 訊息可以帶有 `message_thread_id`；OpenClaw 會保留回覆的執行緒 ID，但預設將 DM 保持在平面會話中。當您有意要隔離 DM 主題會話時，請設定 `channels.telegram.dm.threadReplies: "inbound"`、`channels.telegram.direct.<chatId>.threadReplies: "inbound"`、`requireTopic: true`，或符合的主題設定。
- 長輪詢使用 grammY runner 進行每個聊天/執行緒的排序。整體 runner sink 並行性使用 `agents.defaults.maxConcurrent`。
- 多重帳號啟動會限制並行的 Telegram `getMe` 探測，因此大型 bot 機群不會同時分散每個帳號的探測。
- 長輪詢在每個 gateway 程序內受到保護，因此一次只有一個有效的 poller 可以使用 bot token。如果您仍然看到 `getUpdates` 409 衝突，另一個 OpenClaw gateway、腳本或外部 poller 可能正在使用相同的 token。
- 長輪詢看門狗重啟預設會在 120 秒內沒有完成 `getUpdates` 存活檢查後觸發。僅當您的部署在長時間執行的工作中仍然出現錯誤的輪詢停滯重啟時，才增加 `channels.telegram.pollingStallThresholdMs`。該值以毫秒為單位，允許範圍從 `30000` 到 `600000`；支援每個帳戶的覆寫設定。
- Telegram Bot API 不支援已讀回執（`sendReadReceipts` 不適用）。

## 功能參考

<AccordionGroup>
  <Accordion title="直播預覽（訊息編輯）">
    OpenClaw 可以即時串流部分回覆：

    - 直接送訊息：預覽訊息 + `editMessageText`
    - 群組/話題：預覽訊息 + `editMessageText`
    - 直接送訊息工具進度：當啟用並支援時，可選的原生 `sendMessageDraft` 狀態預覽

    需求：

    - `channels.telegram.streaming` 為 `off | partial | block | progress`（預設值：`partial`）
    - `progress` 為工具進度保留一個可編輯的狀態草稿，在完成時清除它，並將最終答案作為一般訊息發送
    - `streaming.preview.toolProgress` 控制工具/進度更新是否重用同一個編輯過的預覽訊息（當預覽串流啟用時預設為 `true`）
    - `streaming.preview.commandText` 控制這些工具進度行內的 command/exec 詳細資訊：`raw`（預設值，保留已發佈的行為）或 `status`（僅工具標籤）
    - 舊版 `channels.telegram.streamMode` 和布林 `streaming` 值會被偵測到；執行 `openclaw doctor --fix` 將其遷移至 `channels.telegram.streaming.mode`

    工具進度預覽更新是工具執行時顯示的簡短狀態行，例如指令執行、檔案讀取、規劃更新、修補摘要，或 Codex 應用程式伺服器模式下的 Codex 前言/評註文字。Telegram 預設保持啟用這些功能，以符合 `v2026.4.22` 及更高版本的已發佈 OpenClaw 行為。

    直接送訊息可以針對這些工具進度行使用原生 Telegram 草稿，而不會將工具閒聊內容存入聊天紀錄。原生草稿會在答案文字開始前停止；最終答案會保持在一般的持久傳遞路徑上。此通道預設為關閉，應先限制為受信任的直接送訊息 ID：

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

    當您希望看到工具進度但不想將最終答案編輯至同一則訊息中時，請使用 `progress` 模式。將指令文字政策置於 `streaming.progress` 下：

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

    僅當您想要僅傳遞最終結果時才使用 `streaming.mode: "off"`：Telegram 預覽編輯被停用，一般的工具/進度閒聊內容會被抑制，而不是作為獨立狀態訊息發送。核准提示、媒體載荷和錯誤仍會透過一般的最終傳遞路徑路由。當您只想保留答案預覽編輯但隱藏工具進度狀態行時，請使用 `streaming.preview.toolProgress: false`。

    <Note>
      Telegram 選取的引用回覆是例外。當 `replyToMode` 為 `"first"`、`"all"` 或 `"batched"`，且傳入訊息包含選取的引用文字時，OpenClaw 會透過 Telegram 的原生引用回覆路徑發送最終答案，而不是編輯答案預覽，因此 `streaming.preview.toolProgress` 無法顯示該回合的簡短狀態行。沒有選取引用文字的當前訊息回覆仍會保留預覽串流。當工具進度的可見性比原生引用回覆更重要時，請設定 `replyToMode: "off"`，或設定 `streaming.preview.toolProgress: false` 以接受此權衡取捨。
    </Note>

    對於純文字回覆：

    - 簡短的直接送訊息/群組/話題預覽：OpenClaw 保留相同的預覽訊息並就地執行最終編輯
    - 分割為多個 Telegram 訊息的長文字最終結果會盡可能重用現有的預覽作為第一個最終區塊，然後僅發送剩餘的區塊
    - 進度模式的最終結果會清除狀態草稿並使用一般的最終傳遞，而不是將草稿編輯為答案
    - 如果在最終文字確認之前最終編輯失敗，OpenClaw 會使用一般的最終傳遞並清理過時的預覽

    對於複雜的回覆（例如媒體載荷），OpenClaw 會回退到一般的最終傳遞，然後清理預覽訊息。

    預覽串流與區塊串流分開。當明確為 Telegram 啟用區塊串流時，OpenClaw 會跳過預覽串流以避免重複串流。

    Telegram 專用的推理串流：

    - `/reasoning stream` 在生成時將推理發送到即時預覽
    - 推理預覽在最終傳遞後會被刪除；當推理應保持可見時，請使用 `/reasoning on`
    - 最終答案的發送不包含推理文字

  </Accordion>

  <Accordion title="格式化與 HTML 後備">
    外寄文字使用 Telegram `parse_mode: "HTML"`。

    - 類 Markdown 的文字會被渲染為安全的 Telegram HTML。
    - 支援的 Telegram HTML 標籤會被保留；不支援的 HTML 會被跳脫。
    - 如果 Telegram 拒絕解析後的 HTML，OpenClaw 會重試為純文字。

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

    - 名稱會被標準化（去除前導 `/`，轉為小寫）
    - 有效格式：`a-z`、`0-9`、`_`，長度 `1..32`
    - 自訂指令無法覆蓋原生指令
    - 衝突/重複的項目將被跳過並記錄

    備註：

    - 自訂指令僅作為選單項目；它們不會自動實作行為
    - 即使未在 Telegram 選單中顯示，外掛程式/技能指令在輸入時仍然有效

    如果停用原生指令，內建指令將被移除。若有設定，自訂/外掛程式指令仍可能註冊。

    常見的設定失敗：

    - `setMyCommands failed` 搭配 `BOT_COMMANDS_TOO_MUCH` 表示 Telegram 選單在修剪後仍然溢位；請減少外掛程式/技能/自訂指令或停用 `channels.telegram.commands.native`。
    - `deleteWebhook`、`deleteMyCommands` 或 `setMyCommands` 失敗並出現 `404: Not Found`，但直接的 Bot API curl 指令正常運作，這可能是因為 `channels.telegram.apiRoot` 被設為完整的 `/bot<TOKEN>` 端點。`apiRoot` 必須僅為 Bot API 根目錄，而 `openclaw doctor --fix` 可移除意外留下的尾隨 `/bot<TOKEN>`。
    - `getMe returned 401` 表示 Telegram 拒絕了設定的 bot 權杖。請使用目前從 BotFather 取得的權杖更新 `botToken`、`tokenFile` 或 `TELEGRAM_BOT_TOKEN`；OpenClaw 會在輪詢前停止，因此這不會被回報為 webhook 清理失敗。
    - `setMyCommands failed` 搭配網路/fetch 錯誤通常表示對 `api.telegram.org` 的出站 DNS/HTTPS 被封鎖。

    ### 裝置配對指令 (`device-pair` 外掛程式)

    當安裝 `device-pair` 外掛程式時：

    1. `/pair` 產生設定碼
    2. 將代碼貼上至 iOS 應用程式
    3. `/pair pending` 列出待處理請求（包括角色/範圍）
    4. 批准請求：
       - `/pair approve <requestId>` 用於明確批准
       - `/pair approve` 當只有一個待處理請求時
       - `/pair approve latest` 用於最近的請求

    設定碼攜帶一個短期有效的 bootstrap 權杖。內建的設定碼 bootstrap 僅限節點：首次連線會建立待處理的節點請求，批准後 Gateway 會傳回具 `scopes: []` 的持久節點權杖。它不會傳回移交的操作員權杖；操作員存取需要單獨的已批准操作員配對或權杖流程。

    如果裝置使用變更後的驗證詳細資料（例如角色/範圍/公開金鑰）重試，之前的待處理請求會被取代，新請求會使用不同的 `requestId`。請在批准前重新執行 `/pair pending`。

    更多詳細資訊：[配對](/zh-Hant/channels/pairing#pair-via-telegram-recommended-for-ios)。

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

    Telegram `web_app` 按鈕僅在使用者與機器人之間的私人聊天中運作。

    回調點擊會以文字形式傳遞給代理程式：
    `callback_data: <value>`

  </Accordion>

  <Accordion title="適用於代理和自動化的 Telegram 訊息動作">
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
    執行時期的發送使用啟用中的設定/機密快照 (啟動/重新載入)，因此動作路徑不會在每次發送時執行臨時的 SecretRef 重新解析。

    移除反應語意：[/tools/reactions](/zh-Hant/tools/reactions)

  </Accordion>

  <Accordion title="Reply threading tags">
    Telegram 在生成的輸出中支援明確的回覆串連標籤：

    - `[[reply_to_current]]` 回覆觸發訊息
    - `[[reply_to:<id>]]` 回覆特定的 Telegram 訊息 ID

    `channels.telegram.replyToMode` 控制處理方式：

    - `off` (預設)
    - `first`
    - `all`

    當啟用回覆串連功能且原始 Telegram 文字或說明可用時，OpenClaw 會自動包含原生的 Telegram 引用摘要。Telegram 將原生引用文字限制為 1024 個 UTF-16 代碼單元，因此較長的訊息會從開頭開始引用，如果 Telegram 拒絕該引用，則會回退為普通回覆。

    注意：`off` 會停用隱含的回覆串連。明確的 `[[reply_to_*]]` 標籤仍會被接受。

  </Accordion>

  <Accordion title="論壇主題與討論串行為">
    論壇超級群組：

    - 主題會話金鑰會附加 `:topic:<threadId>`
    - 回覆與輸入狀態以主題討論串為目標
    - 主題配置路徑：
      `channels.telegram.groups.<chatId>.topics.<threadId>`

    一般主題 (`threadId=1`) 的特殊情況：

    - 訊息發送會省略 `message_thread_id` (Telegram 會拒絕 `sendMessage(...thread_id=1)`)
    - 輸入動作仍包含 `message_thread_id`

    主題繼承：主題條目會繼承群組設定，除非被覆寫 (`requireMention`, `allowFrom`, `skills`, `systemPrompt`, `enabled`, `groupPolicy`)。
    `agentId` 僅限主題使用，不會繼承群組預設值。

    **個別主題代理路由**：每個主題可以透過在主題配置中設定 `agentId` 來路由到不同的代理。這讓每個主題擁有自己獨立的工作區、記憶體和會話。例如：

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

    **持久化 ACP 主題綁定**：論壇主題可以透過頂層類型化 ACP 綁定來固定 ACP 駕馭會話 (`bindings[]` 搭配 `type: "acp"` 與 `match.channel: "telegram"`, `peer.kind: "group"`，以及像 `-1001234567890:topic:42` 這樣的主題限定 id)。目前僅限於群組/超級群組中的論壇主題。請參閱 [ACP Agents](/zh-Hant/tools/acp-agents)。

    **從聊天產生的綁定討論串 ACP**：`/acp spawn <agent> --thread here|auto` 會將目前的主題綁定到新的 ACP 會話；後續訊息會直接路由到那裡。OpenClaw 會將產生確認釘選在主題內。需要 `channels.telegram.threadBindings.spawnSessions` 保持啟用 (預設：`true`)。

    範本上下文會公開 `MessageThreadId` 與 `IsForum`。預設情況下，具有 `message_thread_id` 的 DM 聊天會在扁平會話上保留 DM 路由與回覆中繼資料；它們只有在設定為 `threadReplies: "inbound"`、`threadReplies: "always"`、`requireTopic: true` 或符合的主題配置時，才會使用具備討論串感知能力的會話金鑰。請使用頂層 `channels.telegram.dm.threadReplies` 作為帳號預設值，或使用 `direct.<chatId>.threadReplies` 針對單一 DM。

  </Accordion>

  <Accordion title="Audio, video, and stickers">
    ### 音訊訊息

    Telegram 區分語音訊備與音訊檔案。

    - 預設：音訊檔案行為
    - 在 Agent 回覆中加入標籤 `[[audio_as_voice]]` 以強制發送語音訊備
    - 傳入的語音訊備逐字稿在 Agent 上下文中被框架為機器生成、
      不受信任的文字；提及偵測仍然使用原始逐字稿，
      因此受提及閘門控制的語音訊息可以繼續運作。

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

    Telegram 區分視訊檔案與視訊訊備。

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

    視訊訊備不支援字幕；提供的訊息文字會分開發送。

    ### 貼圖

    傳入貼圖的處理方式：

    - 靜態 WEBP：下載並處理（預留位置 `<media:sticker>`）
    - 動畫 TGS：略過
    - 視訊 WEBM：略過

    貼圖上下文欄位：

    - `Sticker.emoji`
    - `Sticker.setName`
    - `Sticker.fileId`
    - `Sticker.fileUniqueId`
    - `Sticker.cachedDescription`

    貼圖快取檔案：

    - `~/.openclaw/telegram/sticker-cache.json`

    貼圖會被描述一次（如果可能的話）並被快取，以減少重複的視覺呼叫。

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
    Telegram 反應會以 `message_reaction` 更新的形式到達（與訊息載荷分開）。

    啟用後，OpenClaw 會將系統事件加入佇列，例如：

    - `Telegram reaction added: 👍 by Alice (@alice) on msg 42`

    設定：

    - `channels.telegram.reactionNotifications`：`off | own | all`（預設：`own`）
    - `channels.telegram.reactionLevel`：`off | ack | minimal | extensive`（預設：`minimal`）

    備註：

    - `own` 表示僅針對使用者對 Bot 發送訊息的反應（透過已發送訊息快取盡力而為）。
    - 反應事件仍遵守 Telegram 存取控制（`dmPolicy`、`allowFrom`、`groupPolicy`、`groupAllowFrom`）；未經授權的發送者會被過濾。
    - Telegram 不會在反應更新中提供執行緒 ID。
      - 非論壇群組會路由至群組聊天階段
      - 論壇群組會路由至群組一般主題階段（`:topic:1`），而非確切的原始主題

    用於輪詢/Webhook 的 `allowed_updates` 會自動包含 `message_reaction`。

  </Accordion>

  <Accordion title="Ack reactions">
    當 OpenClaw 正在處理傳入訊息時，`ackReaction` 會發送一個確認表情符號。

    解析順序：

    - `channels.telegram.accounts.<accountId>.ackReaction`
    - `channels.telegram.ackReaction`
    - `messages.ackReaction`
    - 代理身分表情符號後備（`agents.list[].identity.emoji`，否則為「👀」）

    備註：

    - Telegram 預期為 unicode 表情符號（例如「👀」）。
    - 使用 `""` 以停用頻道或帳戶的反應功能。

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
    預設為長輪詢。若要使用 Webhook 模式，請設定 `channels.telegram.webhookUrl` 和 `channels.telegram.webhookSecret`；可選 `webhookPath`、`webhookHost`、`webhookPort` (預設值 `/telegram-webhook`、`127.0.0.1`、`8787`)。

    在長輪詢模式下，OpenClaw 僅在更新成功分派後才會保存重啟水位標記。如果處理程式失敗，該更新會在相同程序中保持可重試狀態，並不會被標記為已完成以進行重啟去重。

    本地監聽器綁定至 `127.0.0.1:8787`。對於公開入口，可以在本地連接埠前放置反向代理，或刻意設定 `webhookHost: "0.0.0.0"`。

    Webhook 模式會在向 Telegram 傳回 `200` 之前，驗證請求守衛、Telegram 密鑰 Token 和 JSON 主體。
    OpenClaw 隨後透過與長輪詢相同的每個聊天/每個主題 Bot 通道非同步處理更新，因此緩慢的 Agent 回應不會佔用 Telegram 的傳遞 ACK。

  </Accordion>

  <Accordion title="限制、重試與 CLI 目標">
    - `channels.telegram.textChunkLimit` 預設為 4000。
    - `channels.telegram.chunkMode="newline"` 偏好在長度分割前保留段落邊界（空白行）。
    - `channels.telegram.mediaMaxMb`（預設 100）限制傳入與傳出的 Telegram 媒體大小。
    - `channels.telegram.mediaGroupFlushMs`（預設 500）控制 Telegram 相簿/媒體群組在 OpenClaw 將其作為單一傳入訊息分派前的緩衝時間。若相簿部分延遲到達則增加此值；若要降低相簿回應延遲則減少此值。
    - `channels.telegram.timeoutSeconds` 覆寫 Telegram API 客戶端逾時（若未設定，則套用 grammY 預設值）。Bot 客戶端會將設定值限制在 60 秒的傳出文字/輸入要求防護之下，以免 grammY 在 OpenClaw 的傳輸防護與後援機制運作前中斷可見的回應傳遞。長輪詢仍使用 45 秒的 `getUpdates` 要求防護，因此閒置輪詢不會被無限遺棄。
    - `channels.telegram.pollingStallThresholdMs` 預設為 `120000`；僅在發生誤判的輪詢停滯重啟時，才將其調整為 `30000` 與 `600000` 之間的數值。
    - 群組上下文歷史記錄使用 `channels.telegram.historyLimit` 或 `messages.groupChat.historyLimit`（預設 50）；`0` 則予以停用。
    - 當閘道已觀察到父訊息時，回覆/引用/轉傳的補充上下文會被正規化為一個選定的對話上下文視窗；觀察到的訊息快取會儲存在會話存放區旁。Telegram 在更新中僅包含一個淺層的 `reply_to_message`，因此早於快取的鏈結會受限於 Telegram 目前的更新內容。
    - Telegram 允許清單主要控管誰能觸發代理程式，而非完整的補充上下文編輯邊界。
    - DM 歷史記錄控制：
      - `channels.telegram.dmHistoryLimit`
      - `channels.telegram.dms["<user_id>"].historyLimit`
    - `channels.telegram.retry` 設定套用於 Telegram 傳送輔助程式（CLI/工具/動作），以處理可復原的傳出 API 錯誤。傳入的最終回覆傳遞也會針對 Telegram 連線前失敗使用有界的安全傳送重試，但不會重試傳送後不明確的網路封包，以免重複可見訊息。

    CLI 與 message-tool 傳送目標可以是數字聊天 ID、使用者名稱，或論壇主題目標：

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

    Telegram 專用的輪詢旗標：

    - `--poll-duration-seconds` (5-600)
    - `--poll-anonymous`
    - `--poll-public`
    - `--thread-id` 用於論壇主題（或使用 `:topic:` 目標）

    Telegram 傳送也支援：

    - `--presentation` 搭配 `buttons` 區塊以用於內聯鍵盤，當 `channels.telegram.capabilities.inlineButtons` 允許時
    - `--pin` 或 `--delivery '{"pin":true}'` 以在機器人可釘選該聊天時要求釘選傳遞
    - `--force-document` 將傳出圖片、GIF 與影片以文件而非壓縮相片、動態媒體或影片上傳方式傳送

    動作控管：

    - `channels.telegram.actions.sendMessage=false` 停用傳出 Telegram 訊息，包括輪詢
    - `channels.telegram.actions.poll=false` 停用 Telegram 輪詢建立，但保留一般傳送功能

  </Accordion>

  <Accordion title="Telegram 中的執行審批">
    Telegram 支援在審批者的私人訊息（DM）中進行執行審批，並可選擇在原始聊天或主題中發送提示。審批者必須是數字 Telegram 使用者 ID。

    配置路徑：

    - `channels.telegram.execApprovals.enabled` (當至少有一位審批者可解析時自動啟用)
    - `channels.telegram.execApprovals.approvers` (回退到來自 `commands.ownerAllowFrom` 的數字擁有者 ID)
    - `channels.telegram.execApprovals.target`: `dm` (預設) | `channel` | `both`
    - `agentFilter`, `sessionFilter`

    `channels.telegram.allowFrom`、`groupAllowFrom` 和 `defaultTo` 控制誰可以與機器人交談及其發送正常回覆的位置。它們並不會將某人設為執行審批者。當尚不存在命令擁有者時，第一個獲批准的 DM 配對會引導 `commands.ownerAllowFrom`，因此單一擁有者的設定仍然可以在 `execApprovals.approvers` 下重複 ID 的情況下運作。

    頻道傳遞會在聊天中顯示命令文字；請僅在受信任的群組/主題中啟用 `channel` 或 `both`。當提示落地於論壇主題時，OpenClaw 會為審批提示及後續追蹤保留該主題。執行審批預設在 30 分鐘後過期。

    內聯審批按鈕也需要 `channels.telegram.capabilities.inlineButtons` 來允許目標介面 (`dm`、`group` 或 `all`)。前綴為 `plugin:` 的審批 ID 透過外掛程式審批解析；其他則優先透過執行審批解析。

    請參閱 [執行審批](/zh-Hant/tools/exec-approvals)。

  </Accordion>
</AccordionGroup>

## 錯誤回覆控制

當代理程式遇到傳遞或提供者錯誤時，Telegram 可以回覆錯誤文字或隱藏該錯誤。有兩個設定金鑰控制此行為：

| 金鑰                                | 數值              | 預設    | 說明                                                               |
| ----------------------------------- | ----------------- | ------- | ------------------------------------------------------------------ |
| `channels.telegram.errorPolicy`     | `reply`、`silent` | `reply` | `reply` 會向聊天發送友好的錯誤訊息。`silent` 則完全抑制錯誤回覆。  |
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
  <Accordion title="機器人不回應未提及的群組訊息">

    - 如果是 `requireMention=false`，Telegram 隱私模式必須允許完全可見。
      - BotFather：`/setprivacy` -> 停用
      - 然後將機器人從群組中移除並重新加入
    - 當配置期望未提及的群組訊息時，`openclaw channels status` 會發出警告。
    - `openclaw channels status --probe` 可以檢查明確的數字群組 ID；萬用字元 `"*"` 無法被偵測成員身份。
    - 快速會話測試：`/activation always`。

  </Accordion>

  <Accordion title="機器人完全看不到群組訊息">

    - 當 `channels.telegram.groups` 存在時，群組必須被列出（或包含 `"*"`）
    - 驗證機器人在群組中的成員身份
    - 檢查日誌：`openclaw logs --follow` 以了解跳過原因

  </Accordion>

  <Accordion title="指令部分無法運作或完全無法運作">

    - 授權您的發送者身分（配對和/或數字 `allowFrom`）
    - 即使群組原則是 `open`，指令授權仍然適用
    - `setMyCommands failed` 伴隨 `BOT_COMMANDS_TOO_MUCH` 表示原生選單項目過多；請減少外掛/技能/自訂指令或停用原生選單
    - `deleteMyCommands` / `setMyCommands` 啟動呼叫和 `sendChatAction` 輸入呼叫是有界的，並且在請求逾時時透過 Telegram 的傳輸備援機制重試一次。持續的網路/fetch 錯誤通常表示對 `api.telegram.org` 的 DNS/HTTPS 連線問題

  </Accordion>

  <Accordion title="Startup reports unauthorized token">

    - `getMe returned 401` 表示針對已設定 Bot 權杖的 Telegram 驗證失敗。
    - 在 BotFather 中重新複製或重新產生 Bot 權杖，然後更新預設帳戶的 `channels.telegram.botToken`、`channels.telegram.tokenFile`、`channels.telegram.accounts.<id>.botToken` 或 `TELEGRAM_BOT_TOKEN`。
    - 啟動期間發生 `deleteWebhook 401 Unauthorized` 也是一種驗證失敗；將其視為「webhook 不存在」只會將同樣的錯誤權杖失敗延後到之後的 API 呼叫。

  </Accordion>

  <Accordion title="輪詢或網路不穩定">

    - Node 22+ + 自訂 fetch/proxy 可能會在 AbortSignal 類型不匹配時觸發立即中止行為。
    - 部分主機會將 `api.telegram.org` 解析為 IPv6；損壞的 IPv6 出站可能會導致 Telegram API 間歇性故障。
    - 如果日誌包含 `TypeError: fetch failed` 或 `Network request for 'getUpdates' failed!`，OpenClaw 現在會將其作為可復原的網路錯誤重試。
    - 在輪詢啟動期間，OpenClaw 會重複使用成功的 grammY 啟動 `getMe` 探測，因此執行器在第一個 `getUpdates` 之前不需要第二個 `getMe`。
    - 如果 `deleteWebhook` 在輪詢啟動期間因暫時性網路錯誤而失敗，OpenClaw 將繼續進行長輪詢，而不是發出另一個輪詢前控制平面呼叫。仍然處於活動狀態的 webhook 會顯示為 `getUpdates` 衝突；然後 OpenClaw 會重建 Telegram 傳輸並重試 webhook 清理。
    - 如果 Telegram socket 在短暫的固定週期內回收，請檢查 `channels.telegram.timeoutSeconds` 是否過低；bot 客戶端會將配置值限制在出站和 `getUpdates` 請求防護之下，但舊版本在設定低於這些防護值時可能會中止每次輪詢或回覆。
    - 如果日誌包含 `Polling stall detected`，預設情況下，OpenClaw 會在 120 秒內沒有完成長輪詢存活時重新啟動輪詢並重建 Telegram 傳輸。
    - 當運行的輪詢帳號在啟動寬限期後未完成 `getUpdates`，運行的 webhook 帳號在啟動寬限期後未完成 `setWebhook`，或最後一次成功的輪詢傳輸活動過舊時，`openclaw channels status --probe` 和 `openclaw doctor` 會發出警告。
    - 僅當長時間執行的 `getUpdates` 呼叫健康但您的主機仍報告錯誤的輪詢停滯重啟時，才增加 `channels.telegram.pollingStallThresholdMs`。持續停滯通常指向主機與 `api.telegram.org` 之間的代理、DNS、IPv6 或 TLS 出站問題。
    - Telegram 也會透過 Bot API 傳輸的進程代理環境變數，包括 `HTTP_PROXY`、`HTTPS_PROXY`、`ALL_PROXY` 及其小寫變體。`NO_PROXY` / `no_proxy` 仍可繞過 `api.telegram.org`。
    - 如果 OpenClaw 受控代理透過 `OPENCLAW_PROXY_URL` 為服務環境配置，且不存在標準代理環境變數，Telegram 也會使用該 URL 進行 Bot API 傳輸。
    - 在具有不穩定直接出站/TLS 的 VPS 主機上，透過 `channels.telegram.proxy` 路由 Telegram API 呼叫：

```yaml
channels:
  telegram:
    proxy: socks5://<user>:<password>@proxy-host:1080
```

    - Node 22+ 預設為 `autoSelectFamily=true`（WSL2 除外）。Telegram DNS 結果順序遵循 `OPENCLAW_TELEGRAM_DNS_RESULT_ORDER`，然後是 `channels.telegram.network.dnsResultOrder`，然後是進程預設值（如 `NODE_OPTIONS=--dns-result-order=ipv4first`）；如果都不適用，Node 22+ 會回退到 `ipv4first`。
    - 如果您的主機是 WSL2 或明確在僅 IPv4 行為下運作更好，請強制選擇地址族：

```yaml
channels:
  telegram:
    network:
      autoSelectFamily: false
```

    - RFC 2544 基準範圍答案（`198.18.0.0/15`）預設已允許用於 Telegram 媒體下載。如果在媒體下載期間，受信任的假 IP 或透明代理將 `api.telegram.org` 重寫為其他私有/內部/特殊用途地址，您可以選擇加入僅 Telegram 繞過：

```yaml
channels:
  telegram:
    network:
      dangerouslyAllowPrivateNetwork: true
```

    - 每個帳號都可以在 `channels.telegram.accounts.<accountId>.network.dangerouslyAllowPrivateNetwork` 處選擇加入相同的選項。
    - 如果您的代理將 Telegram 媒體主機解析為 `198.18.x.x`，請先保持關閉危險標誌。Telegram 媒體預設已允許 RFC 2544 基準範圍。

    <Warning>
      `channels.telegram.network.dangerouslyAllowPrivateNetwork` 會減弱 Telegram 媒體
      SSRF 保護。僅在受信任的操作員控制的代理環境中使用它，
      例如 Clash、Mihomo 或 Surge 假 IP 路由，當它們
      在 RFC 2544 基準範圍之外綜合私有或特殊用途答案時。
      對於正常的公共網際網路 Telegram 存取，請將其關閉。
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

更多幫助：[頻道疑難排解](/zh-Hant/channels/troubleshooting)。

## 組態參考

主要參考資料：[配置參考 - Telegram](/zh-Hant/gateway/config-channels#telegram)。

<Accordion title="重要的 Telegram 欄位">

- 啟動/驗證 (startup/auth): `enabled`, `botToken`, `tokenFile`, `accounts.*` (`tokenFile` 必須指向一個常規文件；不支援符號連結)
- 存取控制 (access control): `dmPolicy`, `allowFrom`, `groupPolicy`, `groupAllowFrom`, `groups`, `groups.*.topics.*`, 頂層 `bindings[]` (`type: "acp"`)
- 執行核准 (exec approvals): `execApprovals`, `accounts.*.execApprovals`
- 指令/選單 (command/menu): `commands.native`, `commands.nativeSkills`, `customCommands`
- 執行緒/回覆 (threading/replies): `replyToMode`, `dm.threadReplies`, `direct.*.threadReplies`
- 串流 (streaming): `streaming` (預覽), `streaming.preview.toolProgress`, `blockStreaming`
- 格式/傳送 (formatting/delivery): `textChunkLimit`, `chunkMode`, `linkPreview`, `responsePrefix`
- 媒體/網路 (media/network): `mediaMaxMb`, `mediaGroupFlushMs`, `timeoutSeconds`, `pollingStallThresholdMs`, `retry`, `network.autoSelectFamily`, `network.dangerouslyAllowPrivateNetwork`, `proxy`
- 自訂 API 根目錄 (custom API root): `apiRoot` (僅限 Bot API 根目錄；請勿包含 `/bot<TOKEN>`)
- Webhook: `webhookUrl`, `webhookSecret`, `webhookPath`, `webhookHost`
- 動作/功能 (actions/capabilities): `capabilities.inlineButtons`, `actions.sendMessage|editMessage|deleteMessage|reactions|sticker`
- 反應 (reactions): `reactionNotifications`, `reactionLevel`
- 錯誤 (errors): `errorPolicy`, `errorCooldownMs`
- 寫入/歷史 (writes/history): `configWrites`, `historyLimit`, `dmHistoryLimit`, `dms.*.historyLimit`

</Accordion>

<Note>多帳戶優先級：當配置了兩個或多個帳戶 ID 時，請設定 `channels.telegram.defaultAccount`（或包含 `channels.telegram.accounts.default`）以明確預設路由。否則，OpenClaw 將退回至第一個標準化的帳戶 ID，且 `openclaw doctor` 會發出警告。命名帳戶會繼承 `channels.telegram.allowFrom` / `groupAllowFrom`，但不會繼承 `accounts.default.*` 的值。</Note>

## 相關

<CardGroup cols={2}>
  <Card title="配對" icon="link" href="/zh-Hant/channels/pairing">
    將 Telegram 使用者與閘道配對。
  </Card>
  <Card title="群組" icon="users" href="/zh-Hant/channels/groups">
    群組與主題的白名單行為。
  </Card>
  <Card title="通道路由" icon="route" href="/zh-Hant/channels/channel-routing">
    將傳入訊息路由至代理程式。
  </Card>
  <Card title="安全性" icon="shield" href="/zh-Hant/gateway/security">
    威脅模型與加固。
  </Card>
  <Card title="多代理程式路由" icon="sitemap" href="/zh-Hant/concepts/multi-agent">
    將群組和主題對應至代理程式。
  </Card>
  <Card title="疑難排解" icon="wrench" href="/zh-Hant/channels/troubleshooting">
    跨通道診斷。
  </Card>
</CardGroup>
