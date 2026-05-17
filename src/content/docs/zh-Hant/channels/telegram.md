---
summary: "Telegram 機器人支援狀態、功能與配置"
read_when:
  - Working on Telegram features or webhooks
title: "Telegram"
---

透過 grammY 實現適用於機器人私訊和群組的生產就緒功能。長輪詢是預設模式；Webhook 模式是可選的。

<CardGroup cols={3}>
  <Card title="配對" icon="link" href="/zh-Hant/channels/pairing">
    Telegram 的預設私訊 (DM) 政策為配對模式。
  </Card>
  <Card title="管道疑難排解" icon="wrench" href="/zh-Hant/channels/troubleshooting">
    跨管道診斷與修復手冊。
  </Card>
  <Card title="Gateway 配置" icon="settings" href="/zh-Hant/gateway/configuration">
    完整的管道配置範例與模式。
  </Card>
</CardGroup>

## 快速設定

<Steps>
  <Step title="在 BotFather 中建立機器人權杖">
    開啟 Telegram 並與 **@BotFather** 對話 (請確認帳號確切為 `@BotFather`)。

    執行 `/newbot`，依照指示操作，並儲存該權杖。

  </Step>

  <Step title="設定權杖與私訊 (DM) 政策">

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

    環境變數備選方案：`TELEGRAM_BOT_TOKEN=...` (僅限預設帳號)。
    Telegram **不**會使用 `openclaw channels login telegram`；請在 config/env 中設定權杖，然後啟動 gateway。

  </Step>

  <Step title="啟動 Gateway 並核准首則私訊">

```bash
openclaw gateway
openclaw pairing list telegram
openclaw pairing approve telegram <CODE>
```

    配對碼將在 1 小時後過期。

  </Step>

  <Step title="Add the bot to a group">
    將機器人加入您的群組，然後取得群組存取所需的兩個 ID：

    - 您的 Telegram 使用者 ID，用於 `allowFrom` / `groupAllowFrom`
    - Telegram 群組聊天 ID，用於 `channels.telegram.groups` 下的金鑰

    若是初次設定，可以從 `openclaw logs --follow`、轉發 ID 機器人或 Bot API `getUpdates` 取得群組聊天 ID。在允許群組後，`/whoami@<bot_username>` 可以確認使用者和群組 ID。

    以 `-100` 開頭的負數 Telegram 超級群組 ID 即為群組聊天 ID。請將它們放在 `channels.telegram.groups` 下，而非 `groupAllowFrom` 下。

  </Step>
</Steps>

<Note>Token 解析順序會考量帳號。實務上，設定值優先於環境變數後備，且 `TELEGRAM_BOT_TOKEN` 僅適用於預設帳號。</Note>

## Telegram 端設定

<AccordionGroup>
  <Accordion title="Privacy mode and group visibility">
    Telegram 機器人預設為 **隱私模式 (Privacy Mode)**，這會限制它們收到的群組訊息。

    如果機器人必須查看所有群組訊息，請執行以下其中一項：

    - 透過 `/setprivacy` 停用隱私模式，或
    - 將機器人設為群組管理員。

    當切換隱私模式時，請將機器人從各個群組中移除並重新加入，讓 Telegram 套用變更。

  </Accordion>

  <Accordion title="Group permissions">
    管理員狀態是在 Telegram 群組設定中控制的。

    管理員機器人會接收所有群組訊息，這對於始終運作的群組行為很有用。

  </Accordion>

  <Accordion title="Helpful BotFather toggles">

    - `/setjoingroups` 以允許/拒絕加入群組
    - `/setprivacy` 用於群組可見性行為

  </Accordion>
</AccordionGroup>

## 存取控制和啟用

<Tabs>
  <Tab title="DM policy">
    `channels.telegram.dmPolicy` 控制直接訊息存取權限：

    - `pairing` (預設)
    - `allowlist` (需要 `allowFrom` 中至少有一個傳送者 ID)
    - `open` (需要 `allowFrom` 包含 `"*"`)
    - `disabled`

    `dmPolicy: "open"` 搭配 `allowFrom: ["*"]` 會讓任何發現或猜測到機器人使用者名稱的 Telegram 帳戶都能指揮機器人。請僅將其用於具備嚴格限制工具的刻意公開機器人；單一擁有者的機器人應使用 `allowlist` 搭配數位使用者 ID。

    `channels.telegram.allowFrom` 接受數位 Telegram 使用者 ID。`telegram:` / `tg:` 前綴會被接受並正規化。
    在多重帳戶設定中，嚴格的頂層 `channels.telegram.allowFrom` 被視為安全邊界：除非合併後的有效帳戶允許清單仍包含明確的萬用字元，否則帳戶層級的 `allowFrom: ["*"]` 項目不會讓該帳戶公開。
    `dmPolicy: "allowlist"` 若具有空的 `allowFrom` 將阻擋所有 DM，且會被設定檔驗證拒絕。
    設定過程僅會要求數位使用者 ID。
    如果您已升級且設定檔包含 `@username` 允許清單項目，請執行 `openclaw doctor --fix` 來解析它們 (盡力而為；需要 Telegram bot token)。
    如果您之前依賴 pairing-store 允許清單檔案，`openclaw doctor --fix` 可以在允許清單流程中將項目復原到 `channels.telegram.allowFrom` (例如當 `dmPolicy: "allowlist"` 尚無明確 ID 時)。

    對於單一擁有者的機器人，建議偏好使用 `dmPolicy: "allowlist"` 搭配明確的數位 `allowFrom` ID，以在設定檔中維持存取政策的持久性 (而不是依賴先前的配對核准)。

    常見誤解：DM 配對核准並不代表「此傳送者在任何地方都已授權」。
    配對僅授與 DM 存取權。如果尚無指令擁有者，第一次核准的配對也會設定 `commands.ownerAllowFrom`，讓僅限擁有者的指令和執行核准有一個明確的操作者帳戶。
    群組傳送者授權仍來自明確的設定檔允許清單。
    如果您希望「我只需授權一次，DM 和群組指令都能運作」，請將您的數位 Telegram 使用者 ID 放入 `channels.telegram.allowFrom`；對於僅限擁有者的指令，請確保 `commands.ownerAllowFrom` 包含 `telegram:<your user id>`。

    ### 尋找您的 Telegram 使用者 ID

    較安全的方式 (無第三方機器人)：

    1. 私訊您的機器人。
    2. 執行 `openclaw logs --follow`。
    3. 讀取 `from.id`。

    官方 Bot API 方法：

```bash
curl "https://api.telegram.org/bot<bot_token>/getUpdates"
```

    第三方方法 (隱私性較低)：`@userinfobot` 或 `@getidsbot`。

  </Tab>

  <Tab title="群組政策與允許清單">
    兩個控制項共同作用：

    1. **允許哪些群組** (`channels.telegram.groups`)
       - 未設定 `groups` 配置：
         - 使用 `groupPolicy: "open"`：任何群組都可以通過群組 ID 檢查
         - 使用 `groupPolicy: "allowlist"` (預設)：群組會被封鎖，直到您新增 `groups` 項目 (或 `"*"`)
       - 已設定 `groups`：作為允許清單 (明確的 ID 或 `"*"`)

    2. **群組中允許哪些傳送者** (`channels.telegram.groupPolicy`)
       - `open`
       - `allowlist` (預設)
       - `disabled`

    `groupAllowFrom` 用於群組傳送者過濾。如果未設定，Telegram 會回退至 `allowFrom`。
    `groupAllowFrom` 項目應為數字的 Telegram 使用者 ID (`telegram:` / `tg:` 前綴會被正規化)。
    請勿將 Telegram 群組或超級群組的聊天 ID 放入 `groupAllowFrom`。負數聊天 ID 屬於 `channels.telegram.groups`。
    非數字項目會在傳送者授權時被忽略。
    安全邊界 (`2026.2.25+`)：群組傳送者授權**不會**繼承 DM 配對儲存庫的核准。
    配對僅限於 DM。對於群組，請設定 `groupAllowFrom` 或每個群組/每個主題的 `allowFrom`。
    如果 `groupAllowFrom` 未設定，Telegram 會回退至配置 `allowFrom`，而非配對儲存庫。
    單一擁有者機器人的實用模式：在 `channels.telegram.allowFrom` 中設定您的使用者 ID，保留 `groupAllowFrom` 未設定，並在 `channels.telegram.groups` 下允許目標群組。
    執行時期注意：如果 `channels.telegram` 完全缺失，執行時期預設為「失敗關閉」(fail-closed) `groupPolicy="allowlist"`，除非明確設定 `channels.defaults.groupPolicy`。

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

    使用 `@<bot_username> ping` 從群組測試。普通的群組訊息不會觸發機器人，而 `requireMention: true` 則會。

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

      - 將像 `-1001234567890` 這樣的負數 Telegram 群組或超級群組聊天 ID 放在 `channels.telegram.groups` 下。
      - 當您想要限制允許群組內哪些人可以觸發機器人時，將像 `8734062810` 這樣的 Telegram 使用者 ID 放在 `groupAllowFrom` 下。
      - 僅當您希望允許群組的任何成員都能與機器人交談時，才使用 `groupAllowFrom: ["*"]`。

    </Warning>

  </Tab>

  <Tab title="提及行為">
    預設情況下，群組回覆需要提及。

    提及可以來自：

    - 原生 `@botusername` 提及，或
    - 以下內容中的提及模式：
      - `agents.list[].groupChat.mentionPatterns`
      - `messages.groupChat.mentionPatterns`

    Session 層級指令切換：

    - `/activation always`
    - `/activation mention`

    這些僅更新 session 狀態。請使用設定以保留設定。

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

    - 將群組訊息轉發到 `@userinfobot` / `@getidsbot`
    - 或從 `openclaw logs --follow` 讀取 `chat.id`
    - 或檢查 Bot API `getUpdates`
    - 在允許群組後，如果啟用了原生指令，請執行 `/whoami@<bot_username>`

  </Tab>
</Tabs>

## 執行時行為

- Telegram 由 gateway 程序擁有。
- 路由是確定性的：Telegram 的入站回覆會回傳給 Telegram（模型不會選擇頻道）。
- 傳入訊息會正規化為共享通道封包，其中包含回覆中繼資料、媒體預留位置，以及網關已觀察到的 Telegram 回覆之持久化回覆鏈上下文。
- 群組 sessions 會依群組 ID 隔離。Forum 主題會附加 `:topic:<threadId>` 以保持主題隔離。
- DM 訊息可以攜帶 `message_thread_id`；OpenClaw 會為回覆保留 thread ID，但預設將 DM 保留在扁平 session 中。當您有意要隔離 DM 主題 session 時，請設定 `channels.telegram.dm.threadReplies: "inbound"`、`channels.telegram.direct.<chatId>.threadReplies: "inbound"`、`requireTopic: true` 或符合的主題設定。
- Long polling 使用 grammY runner 進行逐聊天/逐執行緒的排序。整體 runner sink 並發性使用 `agents.defaults.maxConcurrent`。
- Long polling 在每個 gateway 進程內受到保護，因此一次只有一個作用中的 poller 可以使用 bot token。如果您仍然看到 `getUpdates` 409 衝突，則可能是另一個 OpenClaw gateway、腳本或外部 poller 正在使用相同的 token。
- Long-polling 看門狗重啟觸發預設在 120 秒內沒有完成 `getUpdates` 活性偵測。僅當您的部署在長時間執行的工作期間仍然看到錯誤的 polling-stall 重啟時，才增加 `channels.telegram.pollingStallThresholdMs`。該值以毫秒為單位，允許範圍從 `30000` 到 `600000`；支援每個帳戶的覆寫。
- Telegram Bot API 不支援已讀回執（`sendReadReceipts` 不適用）。

## 功能參考

<AccordionGroup>
  <Accordion title="即時串流預覽（訊息編輯）">
    OpenClaw 可以即時串流部分回覆：

    - 直接聊天：預覽訊息 + `editMessageText`
    - 群組/主題：預覽訊息 + `editMessageText`

    需求：

    - `channels.telegram.streaming` 為 `off | partial | block | progress`（預設：`partial`）
    - `progress` 維護一個可編輯的工具進度狀態草稿，完成時清除它，並將最終答案作為普通訊息發送
    - `streaming.preview.toolProgress` 控制工具/進度更新是否重用同一條編輯後的預覽訊息（當預覽串流啟用時預設為 `true`）
    - `streaming.preview.commandText` 控制這些工具進度行內的命令/exec 詳情：`raw`（預設，保留已發布的行為）或 `status`（僅工具標籤）
    - 偵測到舊版的 `channels.telegram.streamMode` 和布林 `streaming` 值；執行 `openclaw doctor --fix` 將其遷移至 `channels.telegram.streaming.mode`

    工具進度預覽更新是在工具執行時顯示的簡短狀態行，例如命令執行、檔案讀取、規劃更新或修補摘要。Telegram 預設保持這些項目啟用，以符合 `v2026.4.22` 及更高版本 OpenClaw 的已發布行為。若要保留答案文字的編輯預覽但隱藏工具進度行，請設定：

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

    若要保持工具進度可見但隱藏命令/exec 文字，請設定：

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

    當您想要可見的工具進度但不將最終答案編輯至同一則訊息時，請使用 `progress` 模式。將命令文字策略置於 `streaming.progress` 下：

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

    僅當您想要僅傳送最終結果時才使用 `streaming.mode: "off"`：Telegram 預覽編輯功能被停用，且通用的工具/進度閒聊會被抑制，而不是作為獨立狀態訊息發送。核准提示、媒體載荷和錯誤仍透過正常的最終傳遞路由。當您只想保留答案預覽編輯同時隱藏工具進度狀態行時，請使用 `streaming.preview.toolProgress: false`。

    <Note>
      Telegram 選取的引用回覆是例外。當 `replyToMode` 為 `"first"`、`"all"` 或 `"batched"` 且傳入訊息包含選取的引用文字時，OpenClaw 會透過 Telegram 的原生引用回覆路徑傳送最終答案，而不是編輯答案預覽，因此 `streaming.preview.toolProgress` 無法顯示該輪次的簡短狀態行。沒有選取引用文字的當前訊息回覆仍保持預覽串流。當工具進度可見性比原生引用回覆更重要時，請設定 `replyToMode: "off"`，或設定 `streaming.preview.toolProgress: false` 以確認此取捨。
    </Note>

    對於純文字回覆：

    - 簡短 DM/群組/主題預覽：OpenClaw 保留相同的預覽訊息並就地執行最終編輯
    - 分割成多則 Telegram 訊息的長文字最終結果會盡可能重用現有的預覽作為第一個最終區塊，然後僅發送剩餘的區塊
    - 進度模式最終結果會清除狀態草稿，並使用正常的最終傳遞，而不是將草稿編輯為答案
    - 如果在最終編輯於完成文字確認之前失敗，OpenClaw 會使用正常的最終傳遞並清理過時的預覽

    對於複雜的回覆（例如媒體載荷），OpenClaw 會退回至正常的最終傳遞，然後清理預覽訊息。

    預覽串流與區塊串流分開。當 Telegram 明確啟用區塊串流時，OpenClaw 會跳過預覽串流以避免重複串流。

    Telegram 專用的推理串流：

    - `/reasoning stream` 在生成時將推理發送到即時預覽
    - 推理預覽在最終傳遞後會被刪除；當推理應保持可見時，請使用 `/reasoning on`
    - 最終答案將不帶推理文字發送

  </Accordion>

  <Accordion title="Formatting and HTML fallback">
    傳出文字使用 Telegram `parse_mode: "HTML"`。

    - 類 Markdown 的文字會被轉譯為 Telegram 安全的 HTML。
    - 支援的 Telegram HTML 標籤會被保留；不支援的 HTML 則會被跳脫。
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

    - 名稱會被標準化（移除開頭的 `/`，轉為小寫）
    - 有效格式：`a-z`、`0-9`、`_`，長度 `1..32`
    - 自訂指令無法覆寫原生指令
    - 衝突/重複項目會被跳過並記錄

    備註：

    - 自訂指令僅是選單項目；它們不會自動實作行為
    - 外掛/技能指令即使在 Telegram 選單中未顯示，輸入時仍然可以運作

    如果原生指令被停用，內建指令會被移除。如果已設定，自訂/外掛指令可能仍會註冊。

    常見設定失敗：

    - `setMyCommands failed` 搭配 `BOT_COMMANDS_TOO_MUCH` 表示 Telegram 選單在修剪後仍然溢位；請減少外掛/技能/自訂指令或停用 `channels.telegram.commands.native`。
    - 當直接的 Bot API curl 指令可運作時，`deleteWebhook`、`deleteMyCommands` 或 `setMyCommands` 失敗並出現 `404: Not Found`，可能表示 `channels.telegram.apiRoot` 被設為完整的 `/bot<TOKEN>` 端點。`apiRoot` 必須僅為 Bot API 根目錄，而 `openclaw doctor --fix` 會移除意外新增的結尾 `/bot<TOKEN>`。
    - `getMe returned 401` 表示 Telegram 拒絕了設定的機器人權杖。請使用目前的 BotFather 權杖更新 `botToken`、`tokenFile` 或 `TELEGRAM_BOT_TOKEN`；OpenClaw 會在輪詢前停止，因此這不會被回報為 webhook 清理失敗。
    - `setMyCommands failed` 搭配網路/擷取錯誤通常表示對 `api.telegram.org` 的對外 DNS/HTTPS 被封鎖。

    ### 裝置配對指令 (`device-pair` 外掛)

    當安裝 `device-pair` 外掛時：

    1. `/pair` 產生設定碼
    2. 在 iOS 應用程式中貼上程式碼
    3. `/pair pending` 列出待處理請求（包括角色/範圍）
    4. 批准請求：
       - `/pair approve <requestId>` 用於明確批准
       - `/pair approve` 當只有一個待處理請求時
       - `/pair approve latest` 用於最近的一個

    設定碼攜帶短期有效啟動權杖。內建啟動移交會將主要節點權杖保留在 `scopes: []`；任何移交的操作員權杖都會受限於 `operator.approvals`、`operator.read`、`operator.talk.secrets` 和 `operator.write`。啟動範圍檢查會加上角色前綴，因此操作員允許清單僅滿足操作員請求；非操作員角色仍需要在其自己的角色前綴下的範圍。

    如果裝置使用變更的驗證詳細資料（例如角色/範圍/公開金鑰）重試，先前的待處理請求會被取代，新請求會使用不同的 `requestId`。請在批准前重新執行 `/pair pending`。

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

    注意：`edit` 和 `topic-create` 目前預設為啟用，並且沒有個別的 `channels.telegram.actions.*` 切換開關。
    執行階段傳送使用作用中的組態/密鑰快照 (啟動/重新載入)，因此動作路徑不會在每次傳送時執行臨時的 SecretRef 重新解析。

    反應移除語意：[/tools/reactions](/zh-Hant/tools/reactions)

  </Accordion>

  <Accordion title="Reply threading tags">
    Telegram 支援在生成輸出中使用明確的回覆串連標籤：

    - `[[reply_to_current]]` 回覆觸發訊息
    - `[[reply_to:<id>]]` 回覆特定的 Telegram 訊息 ID

    `channels.telegram.replyToMode` 控制處理方式：

    - `off` （預設）
    - `first`
    - `all`

    當啟用回覆串連且原始 Telegram 文字或說明可用時，OpenClaw 會自動包含原生的 Telegram 引用摘要。Telegram 將原生引用文字限制為 1024 個 UTF-16 程式碼單元，因此較長的訊息會從開頭開始引用，如果 Telegram 拒絕該引用，則會退回為單純的回覆。

    注意：`off` 會停用隱式回覆串連。明確的 `[[reply_to_*]]` 標籤仍會被遵守。

  </Accordion>

  <Accordion title="Forum topics and thread behavior">
    論壇超級群組：

    - 主題會話金鑰會附加 `:topic:<threadId>`
    - 回覆和輸入狀態以主題串為目標
    - 主題配置路徑：
      `channels.telegram.groups.<chatId>.topics.<threadId>`

    一般主題 (`threadId=1`) 的特殊情況：

    - 訊息發送會省略 `message_thread_id`（Telegram 會拒絕 `sendMessage(...thread_id=1)`）
    - 輸入動作仍會包含 `message_thread_id`

    主題繼承：主題條目會繼承群組設定，除非被覆寫 (`requireMention`, `allowFrom`, `skills`, `systemPrompt`, `enabled`, `groupPolicy`)。
    `agentId` 僅適用於主題，不會繼承群組預設值。

    **依主題的代理程式路由**：每個主題都可以透過在主題配置中設定 `agentId` 來路由到不同的代理程式。這給每個主題提供了自己獨立的工作區、記憶體和會話。範例：

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

    **持久化 ACP 主題綁定**：論壇主題可以透過頂層類型化的 ACP 綁定來固定 ACP harness 會話 (`bindings[]` 搭配 `type: "acp"` 和 `match.channel: "telegram"`、`peer.kind: "group"`，以及類似 `-1001234567890:topic:42` 的主題限定 id)。目前僅限於群組/超級群組中的論壇主題。請參閱 [ACP Agents](/zh-Hant/tools/acp-agents)。

    **從聊天進行執行緒綁定的 ACP 生成**：`/acp spawn <agent> --thread here|auto` 會將目前的主題綁定到新的 ACP 會話；後續訊息會直接路由到該處。OpenClaw 會將生成確認訊息釘選在主題內。需要 `channels.telegram.threadBindings.spawnSessions` 保持啟用 (預設值：`true`)。

    模板上下文會公開 `MessageThreadId` 和 `IsForum`。具有 `message_thread_id` 的 DM 聊天預設會在扁平會話上保留 DM 路由和回覆元資料；只有在配置了 `threadReplies: "inbound"`、`threadReplies: "always"`、`requireTopic: true` 或符合的主題配置時，才會使用執行緒感知的會話金鑰。請對帳號預設值使用頂層 `channels.telegram.dm.threadReplies`，或對單一 DM 使用 `direct.<chatId>.threadReplies`。

  </Accordion>

  <Accordion title="Audio, video, and stickers">
    ### 音訊訊息

    Telegram 區分語音訊備與音訊檔案。

    - 預設：音訊檔案行為
    - 在 Agent 回覆中標記 `[[audio_as_voice]]` 以強制發送語音訊備
    - 傳入的語音訊備轉錄文本在 Agent 上下文中被標記為機器生成且不受信任的文字；提及偵測仍使用原始轉錄文本，因此受提及限制的語音訊息仍可正常運作。

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

    Telegram 區分影片檔案與影片訊備。

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

    影片訊備不支援標題說明；提供的訊息文字會分開發送。

    ### 貼圖

    傳入貼圖的處理方式：

    - 靜態 WEBP：下載並處理（佔位符 `<media:sticker>`）
    - 動畫 TGS：略過
    - 影片 WEBM：略過

    貼圖上下文欄位：

    - `Sticker.emoji`
    - `Sticker.setName`
    - `Sticker.fileId`
    - `Sticker.fileUniqueId`
    - `Sticker.cachedDescription`

    貼圖快取檔案：

    - `~/.openclaw/telegram/sticker-cache.json`

    貼圖會盡可能只描述一次並快取，以減少重複的視覺呼叫。

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
    Telegram 回應以 `message_reaction` 更新的形式到達（與訊息載荷分開）。

    啟用後，OpenClaw 會將系統事件排入佇列，例如：

    - `Telegram reaction added: 👍 by Alice (@alice) on msg 42`

    配置：

    - `channels.telegram.reactionNotifications`：`off | own | all`（預設：`own`）
    - `channels.telegram.reactionLevel`：`off | ack | minimal | extensive`（預設：`minimal`）

    注意事項：

    - `own` 表示僅針對使用者對機器人發送訊息的回應（透過已發送訊息快取盡力而為）。
    - 回應事件仍會遵守 Telegram 存取控制（`dmPolicy`、`allowFrom`、`groupPolicy`、`groupAllowFrom`）；未經授權的發送者會被捨棄。
    - Telegram 不會在回應更新中提供執行緒 ID。
      - 非論壇群組會路由到群組聊天會話
      - 論壇群組會路由到群組的一般主題會話（`:topic:1`），而非確切的原始主題

    用於輪詢/Webhook 的 `allowed_updates` 會自動包含 `message_reaction`。

  </Accordion>

  <Accordion title="Ack reactions">
    當 OpenClaw 正在處理傳入訊息時，`ackReaction` 會發送確認表情符號。

    解析順序：

    - `channels.telegram.accounts.<accountId>.ackReaction`
    - `channels.telegram.ackReaction`
    - `messages.ackReaction`
    - 代理身份表情符號後備（`agents.list[].identity.emoji`，否則為 "👀"）

    注意事項：

    - Telegram 預期為 unicode 表情符號（例如 "👀"）。
    - 使用 `""` 來停用頻道或帳戶的回應。

  </Accordion>

  <Accordion title="來自 Telegram 事件和指令的配置寫入">
    頻道配置寫入預設為啟用 (`configWrites !== false`)。

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

  <Accordion title="長輪詢與 Webhook">
    預設為長輪詢。若要使用 Webhook 模式，請設定 `channels.telegram.webhookUrl` 和 `channels.telegram.webhookSecret`；可選 `webhookPath`、`webhookHost`、`webhookPort` (預設值為 `/telegram-webhook`、`127.0.0.1`、`8787`)。

    在長輪詢模式下，OpenClaw 僅在更新成功分派後才會保存其重新啟動水位標記。如果處理程序失敗，該更新仍可在同一程序中重試，且不會被標記為已完成以進行重新啟動去重。

    本地監聽器綁定至 `127.0.0.1:8787`。對於公開入口，您可以將反向代理置於本地端口之前，或是刻意設定 `webhookHost: "0.0.0.0"`。

    Webhook 模式會在向 Telegram 傳回 `200` 之前驗證請求防護、Telegram 密鑰 token 以及 JSON 主體。
    然後 OpenClaw 會透過與長輪詢相同的每個聊天/每個主題 Bot 通道非同步處理更新，因此緩慢的 Agent 回合不會佔用 Telegram 的傳遞 ACK。

  </Accordion>

  <Accordion title="限制、重試與 CLI 目標">
    - `channels.telegram.textChunkLimit` 預設為 4000。
    - `channels.telegram.chunkMode="newline"` 在進行長度分割前，偏好段落邊界（空白行）。
    - `channels.telegram.mediaMaxMb`（預設 100）限制傳入與傳出的 Telegram 媒體大小。
    - `channels.telegram.mediaGroupFlushMs`（預設 500）控制在 OpenClaw 將 Telegram 相簿/媒體群組作為單一傳入訊息分派前的緩衝時間。如果相簿部分抵達較晚則增加此值；若要降低相簿回覆延遲則減少此值。
    - `channels.telegram.timeoutSeconds` 覆寫 Telegram API 客戶端逾時（若未設定則套用 grammY 預設值）。Bot 客戶端會將設定值限制在 60 秒的傳出文字/輸入請求防護之下，以免 grammY 在 OpenClaw 的傳輸防護與後備機制運作前中斷可見回覆的遞送。長輪詢仍使用 45 秒的 `getUpdates` 請求防護，以免閒置輪詢被無限期捨棄。
    - `channels.telegram.pollingStallThresholdMs` 預設為 `120000`；僅在發生誤判的輪詢停滯重啟時，才需在 `30000` 到 `600000` 之間調整。
    - 群組上下文紀錄使用 `channels.telegram.historyLimit` 或 `messages.groupChat.historyLimit`（預設 50）；`0` 則予以停用。
    - 回覆/引用/轉發的補充上下文會在閘道觀察到父訊息時，被正規化為一個選定的對話上下文視窗；觀察到的訊息快取會儲存在會話存放區旁。Telegram 在更新中僅包含一個淺層的 `reply_to_message`，因此早於快取的鏈結會受限於 Telegram 目前的更新內容。
    - Telegram 白名單主要管控誰能觸發代理程式，而非完整的補充上下文編輯邊界。
    - DM（私人訊息）紀錄控制：
      - `channels.telegram.dmHistoryLimit`
      - `channels.telegram.dms["<user_id>"].historyLimit`
    - `channels.telegram.retry` 設定適用於 Telegram 傳送輔助程式（CLI/工具/動作）針對可復原的傳出 API 錯誤。傳入的最終回覆遞送也會針對 Telegram 連線前失敗使用有界的安全傳送重試，但不會重試模稜兩可的傳送後網路封包，以避免重複可見訊息。

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

    Telegram 專用的輪詢旗標：

    - `--poll-duration-seconds` (5-600)
    - `--poll-anonymous`
    - `--poll-public`
    - `--thread-id` 用於論壇主題（或使用 `:topic:` 目標）

    Telegram 傳送也支援：

    - `--presentation` 搭配 `buttons` 區塊用於內聯鍵盤，當 `channels.telegram.capabilities.inlineButtons` 允許時
    - `--pin` 或 `--delivery '{"pin":true}'` 以請求置頂遞送，當機器人可在該聊天中置頂時
    - `--force-document` 以將傳出圖片、GIF 與影片以文件形式傳送，而非壓縮相片、動態媒體或影片上傳

    動作閘控：

    - `channels.telegram.actions.sendMessage=false` 停用傳出的 Telegram 訊息，包含輪詢
    - `channels.telegram.actions.poll=false` 停用 Telegram 輪詢建立，但仍允許一般傳送

  </Accordion>

  <Accordion title="Exec approvals in Telegram">
    Telegram 支援在審核者的私人訊息中進行執行審核，並可選擇在原始聊天或主題中發出提示。審核者必須是 Telegram 的數位用戶 ID。

    設定路徑：

    - `channels.telegram.execApprovals.enabled` (當至少有一個審核者可解析時自動啟用)
    - `channels.telegram.execApprovals.approvers` (回退至來自 `commands.ownerAllowFrom` 的數位擁有者 ID)
    - `channels.telegram.execApprovals.target`: `dm` (預設) | `channel` | `both`
    - `agentFilter`, `sessionFilter`

    `channels.telegram.allowFrom`、`groupAllowFrom` 和 `defaultTo` 控制誰可以與機器人交談以及它將正常回覆傳送到哪裡。它們不會讓某人成為執行審核者。當尚不存在指令擁有者時，第一個獲批准的私人訊息配對會引導 `commands.ownerAllowFrom`，因此單一擁有者設定仍然可以在 `execApprovals.approvers` 下不重複 ID 的情況下運作。

    頻道傳遞會在聊天中顯示指令文字；請僅在受信任的群組/主題中啟用 `channel` 或 `both`。當提示落在論壇主題中時，OpenClaw 會保留審核提示和後續回應的主題。執行審核預設在 30 分鐘後過期。

    內嵌審核按鈕還需要 `channels.telegram.capabilities.inlineButtons` 才能允許目標表面 (`dm`、`group` 或 `all`)。前綴為 `plugin:` 的審核 ID 透過外掛程式審核解析；其他的則優先透過執行審核解析。

    參閱 [Exec approvals](/zh-Hant/tools/exec-approvals)。

  </Accordion>
</AccordionGroup>

## 錯誤回覆控制

當代理程式遇到傳遞或提供者錯誤時，Telegram 可以回覆錯誤文字或將其隱藏。有兩個配置鍵控制此行為：

| 鍵                                  | 值                | 預設    | 說明                                                                           |
| ----------------------------------- | ----------------- | ------- | ------------------------------------------------------------------------------ |
| `channels.telegram.errorPolicy`     | `reply`, `silent` | `reply` | `reply` 會向聊天傳送友善的錯誤訊息。`silent` 會完全抑制錯誤回覆。              |
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

    - 如果 `requireMention=false`，Telegram 隱私模式必須允許完全可見。
      - BotFather: `/setprivacy` -> 停用
      - 然後將機器人從群組中移除並重新加入
    - 當設定預期接收未提及的群組訊息時，`openclaw channels status` 會發出警告。
    - `openclaw channels status --probe` 可以檢查明確的數字群組 ID；萬用字元 `"*"` 無法進行成員資格探測。
    - 快速會話測試：`/activation always`。

  </Accordion>

  <Accordion title="Bot not seeing group messages at all">

    - 當 `channels.telegram.groups` 存在時，群組必須被列入（或包含 `"*"`）
    - 驗證機器人在群組中的成員身份
    - 檢查日誌：`openclaw logs --follow` 以了解跳過原因

  </Accordion>

  <Accordion title="Commands work partially or not at all">

    - 授權您的發送者身份（配對和/或數字 `allowFrom`）
    - 即使群組原則是 `open`，指令授權仍然適用
    - `setMyCommands failed` 並帶有 `BOT_COMMANDS_TOO_MUCH` 表示原生選單項目過多；請減少外掛程式/技能/自訂指令或停用原生選單
    - `deleteMyCommands` / `setMyCommands` 啟動呼叫和 `sendChatAction` 輸入呼叫有上限，並且在請求逾時時透過 Telegram 的傳輸後援機制重試一次。持續的網路/擷取錯誤通常表示對 `api.telegram.org` 的 DNS/HTTPS 連線問題

  </Accordion>

  <Accordion title="Startup reports unauthorized token">

    - `getMe returned 401` 表示針對已設定的機器人權杖進行 Telegram 身分驗證失敗。
    - 在 BotFather 中重新複製或重新產生機器人權杖，然後更新預設帳戶的 `channels.telegram.botToken`、`channels.telegram.tokenFile`、`channels.telegram.accounts.<id>.botToken` 或 `TELEGRAM_BOT_TOKEN`。
    - 啟動期間發生 `deleteWebhook 401 Unauthorized` 也是身分驗證失敗；若將其視為「webhook 不存在」只會將相同的錯誤權杖失敗延後到之後的 API 呼叫。

  </Accordion>

  <Accordion title="輪詢或網路不穩定">

    - Node 22+ + 自訂 fetch/proxy 若 AbortSignal 類型不符，可能觸發立即中止行為。
    - 部分主機會優先將 `api.telegram.org` 解析為 IPv6；IPv6 出口故障可能會導致 Telegram API 間歇性錯誤。
    - 如果日誌包含 `TypeError: fetch failed` 或 `Network request for 'getUpdates' failed!`，OpenClaw 現在會將這些視為可復原的網路錯誤進行重試。
    - 在輪詢啟動期間，OpenClaw 會重複使用成功的啟動 `getMe` 探測供 grammY 使用，因此執行器在第一次 `getUpdates` 之前不需要第二個 `getMe`。
    - 如果 `deleteWebhook` 在輪詢啟動期間因暫時性網路錯誤而失敗，OpenClaw 會繼續進行長輪詢，而不是發出另一次輪詢前控制平面呼叫。仍處於啟用狀態的 webhook 會顯示為 `getUpdates` 衝突；OpenClaw 隨後會重建 Telegram 傳輸並重試 webhook 清理。
    - 如果 Telegram sockets 在短時間的固定週期內回收，請檢查 `channels.telegram.timeoutSeconds` 是否過低；bot 客戶端會將設定值限制在出站和 `getUpdates` 請求防護值之下，但舊版本當此值低於防護值時可能會中止每次輪詢或回覆。
    - 如果日誌包含 `Polling stall detected`，OpenClaw 會在預設 120 秒內未完成長輪詢存活時，重新啟動輪詢並重建 Telegram 傳輸。
    - 當運行中的輪詢帳號在啟動寬限期後未完成 `getUpdates`，或運行中的 webhook 帳號在啟動寬限期後未完成 `setWebhook`，或最後一次成功的輪詢傳輸活動已過時，`openclaw channels status --probe` 和 `openclaw doctor` 會發出警告。
    - 僅當長時間運行的 `getUpdates` 呼叫健康但您的主機仍回報錯誤的輪詢停滯重啟時，才增加 `channels.telegram.pollingStallThresholdMs`。持續停滯通常指向主機與 `api.telegram.org` 之間的代理、DNS、IPv6 或 TLS 出口問題。
    - Telegram 也會遵循 Bot API 傳輸的程序代理環境變數，包括 `HTTP_PROXY`、`HTTPS_PROXY`、`ALL_PROXY` 及其小寫變體。`NO_PROXY` / `no_proxy` 仍可繞過 `api.telegram.org`。
    - 如果透過 `OPENCLAW_PROXY_URL` 為服務環境配置了 OpenClaw 管理的代理，且沒有標準代理環境變數，Telegram 也會使用該 URL 進行 Bot API 傳輸。
    - 在直接出口/TLS 不穩定的 VPS 主機上，透過 `channels.telegram.proxy` 路由 Telegram API 呼叫：

```yaml
channels:
  telegram:
    proxy: socks5://<user>:<password>@proxy-host:1080
```

    - Node 22+ 預設為 `autoSelectFamily=true` (WSL2 除外)。Telegram DNS 結果順序遵循 `OPENCLAW_TELEGRAM_DNS_RESULT_ORDER`，然後是 `channels.telegram.network.dnsResultOrder`，接著是程序預設值例如 `NODE_OPTIONS=--dns-result-order=ipv4first`；如果都不適用，Node 22+ 會回退到 `ipv4first`。
    - 如果您的主機是 WSL2 或明確在僅 IPv4 行為下運作更好，請強制選擇系列：

```yaml
channels:
  telegram:
    network:
      autoSelectFamily: false
```

    - RFC 2544 基準範圍的回答 (`198.18.0.0/15`) 預設已允許用於
      Telegram 媒體下載。如果受信任的假 IP 或
      透明代理在下載媒體時將 `api.telegram.org` 重寫為其他
      私有/內部/特殊用途地址，您可以選擇加入
      僅 Telegram 的繞過：

```yaml
channels:
  telegram:
    network:
      dangerouslyAllowPrivateNetwork: true
```

    - 每個帳號都可以在
      `channels.telegram.accounts.<accountId>.network.dangerouslyAllowPrivateNetwork` 使用相同的選擇加入。
    - 如果您的代理將 Telegram 媒體主機解析為 `198.18.x.x`，請先關閉
      危險標誌。Telegram 媒體預設已允許 RFC 2544
      基準範圍。

    <Warning>
      `channels.telegram.network.dangerouslyAllowPrivateNetwork` 會削弱 Telegram
      媒體 SSRF 防護。僅在受信任的運營商控制代理環境中使用，
      例如 Clash、Mihomo 或 Surge 假 IP 路由，當它們
      在 RFC 2544 基準範圍之外合成私有或特殊用途回答時。
      對於正常的公共網際網路 Telegram 存取，請保持關閉。
    </Warning>

    - 環境覆寫 (暫時性)：
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

更多幫助：[頻道疑難排解](/zh-Hant/channels/troubleshooting)。

## 設定參考

主要參考：[組態參考 - Telegram](/zh-Hant/gateway/config-channels#telegram)。

<Accordion title="高重要性 Telegram 欄位">

- 啟動/認證：`enabled`、`botToken`、`tokenFile`、`accounts.*`（`tokenFile` 必須指向一般檔案；符號連結會被拒絕）
- 存取控制：`dmPolicy`、`allowFrom`、`groupPolicy`、`groupAllowFrom`、`groups`、`groups.*.topics.*`、頂層 `bindings[]`（`type: "acp"`）
- 執行核准：`execApprovals`、`accounts.*.execApprovals`
- 指令/選單：`commands.native`、`commands.nativeSkills`、`customCommands`
- 執行緒/回覆：`replyToMode`、`dm.threadReplies`、`direct.*.threadReplies`
- 串流：`streaming`（預覽）、`streaming.preview.toolProgress`、`blockStreaming`
- 格式化/傳遞：`textChunkLimit`、`chunkMode`、`linkPreview`、`responsePrefix`
- 媒體/網路：`mediaMaxMb`、`mediaGroupFlushMs`、`timeoutSeconds`、`pollingStallThresholdMs`、`retry`、`network.autoSelectFamily`、`network.dangerouslyAllowPrivateNetwork`、`proxy`
- 自訂 API 根路徑：`apiRoot`（僅限 Bot API 根路徑；請勿包含 `/bot<TOKEN>`）
- Webhook：`webhookUrl`、`webhookSecret`、`webhookPath`、`webhookHost`
- 動作/功能：`capabilities.inlineButtons`、`actions.sendMessage|editMessage|deleteMessage|reactions|sticker`
- 反應：`reactionNotifications`、`reactionLevel`
- 錯誤：`errorPolicy`、`errorCooldownMs`
- 寫入/歷史：`configWrites`、`historyLimit`、`dmHistoryLimit`、`dms.*.historyLimit`

</Accordion>

<Note>多帳號優先順序：當設定兩個或多個帳號 ID 時，請設定 `channels.telegram.defaultAccount`（或包含 `channels.telegram.accounts.default`）以明確指定預設路由。否則，OpenClaw 將回退至第一個標準化的帳號 ID，並且 `openclaw doctor` 會發出警告。命名帳號會繼承 `channels.telegram.allowFrom` / `groupAllowFrom`，但不會繼承 `accounts.default.*` 的值。</Note>

## 相關

<CardGroup cols={2}>
  <Card title="配對" icon="link" href="/zh-Hant/channels/pairing">
    將 Telegram 使用者配對至閘道。
  </Card>
  <Card title="群組" icon="users" href="/zh-Hant/channels/groups">
    群組與主題允許清單的行為。
  </Card>
  <Card title="頻道路由" icon="route" href="/zh-Hant/channels/channel-routing">
    將傳入訊息路由至代理程式。
  </Card>
  <Card title="安全性" icon="shield" href="/zh-Hant/gateway/security">
    威脅模型與防護強化。
  </Card>
  <Card title="多代理程式路由" icon="sitemap" href="/zh-Hant/concepts/multi-agent">
    將群組和主題對應至代理程式。
  </Card>
  <Card title="疑難排解" icon="wrench" href="/zh-Hant/channels/troubleshooting">
    跨頻道診斷。
  </Card>
</CardGroup>
