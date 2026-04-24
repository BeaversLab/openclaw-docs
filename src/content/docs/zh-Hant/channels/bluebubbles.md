---
summary: "透過 BlueBubbles macOS 伺服器進行 iMessage 通訊 (REST 發送/接收、輸入指示、反應、配對、進階動作)。"
read_when:
  - Setting up BlueBubbles channel
  - Troubleshooting webhook pairing
  - Configuring iMessage on macOS
title: "BlueBubbles"
---

# BlueBubbles (macOS REST)

狀態：內建外掛，透過 HTTP 與 BlueBubbles macOS 伺服器通訊。由於其 API 豐富且設定比舊版 imsg 頻道簡單，**建議用於 iMessage 整合**。

## 內建外掛

目前的 OpenClaw 發行版本已內建 BlueBubbles，因此一般的封裝版本不需要額外的 `openclaw plugins install` 步驟。

## 概覽

- 透過 BlueBubbles 輔助應用程式 ([bluebubbles.app](https://bluebubbles.app)) 在 macOS 上執行。
- 推薦/已測試：macOS Sequoia (15)。macOS Tahoe (26) 可用；目前在 Tahoe 上編輯功能有問題，且群組圖示更新可能回報成功但未同步。
- OpenClaw 透過其 REST API (`GET /api/v1/ping`、`POST /message/text`、`POST /chat/:id/*`) 與其進行通訊。
- 傳入訊息透過 webhooks 抵達；傳出回覆、輸入指示器、已讀回執和點回是 REST 呼叫。
- 附件和貼圖會作為傳入媒體匯入（並在可能時顯示給代理程式）。
- 配對/允許清單的運作方式與其他頻道相同 (`/channels/pairing` 等)，需搭配 `channels.bluebubbles.allowFrom` 與配對碼。
- 反應會像 Slack/Telegram 一樣作為系統事件呈現，以便代理人在回覆前「提及」它們。
- 進階功能：編輯、取消傳送、回覆串接、訊息特效、群組管理。

## 快速開始

1. 在您的 Mac 上安裝 BlueBubbles 伺服器（依照 [bluebubbles.app/install](https://bluebubbles.app/install) 的指示）。
2. 在 BlueBubbles 設定中，啟用 web API 並設定密碼。
3. 執行 `openclaw onboard` 並選擇 BlueBubbles，或是手動設定：

   ```json5
   {
     channels: {
       bluebubbles: {
         enabled: true,
         serverUrl: "http://192.168.1.100:1234",
         password: "example-password",
         webhookPath: "/bluebubbles-webhook",
       },
     },
   }
   ```

4. 將 BlueBubbles webhooks 指向您的 gateway（例如：`https://your-gateway-host:3000/bluebubbles-webhook?password=<password>`）。
5. 啟動閘道；它將註冊 webhook 處理程式並開始配對。

安全性提醒：

- 務必設定 webhook 密碼。
- Webhook 驗證始終是必需的。除非 BlueBubbles webhook 請求包含符合 `channels.bluebubbles.password` 的密碼/guid（例如 `?password=<password>` 或 `x-password`），否則 OpenClaw 會拒絕該請求，無論環路/代理拓撲為何。
- 密碼驗證會在讀取/解析完整 webhook 內容之前進行檢查。

## 保持 Messages.app 運作（VM / 無頭設定）

某些 macOS VM / 永遠線上的設定可能會導致 Messages.app 變成「閒置」狀態（在開啟/前景應用程式之前，傳入事件會停止）。一個簡單的解決方法是使用 AppleScript + LaunchAgent **每 5 分鐘喚醒一次 Messages**。

### 1) 儲存 AppleScript

將此儲存為：

- `~/Scripts/poke-messages.scpt`

範例腳本（非互動式；不會搶佔焦點）：

```applescript
try
  tell application "Messages"
    if not running then
      launch
    end if

    -- Touch the scripting interface to keep the process responsive.
    set _chatCount to (count of chats)
  end tell
on error
  -- Ignore transient failures (first-run prompts, locked session, etc).
end try
```

### 2) 安裝 LaunchAgent

將此儲存為：

- `~/Library/LaunchAgents/com.user.poke-messages.plist`

```xml
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
  <dict>
    <key>Label</key>
    <string>com.user.poke-messages</string>

    <key>ProgramArguments</key>
    <array>
      <string>/bin/bash</string>
      <string>-lc</string>
      <string>/usr/bin/osascript &quot;$HOME/Scripts/poke-messages.scpt&quot;</string>
    </array>

    <key>RunAtLoad</key>
    <true/>

    <key>StartInterval</key>
    <integer>300</integer>

    <key>StandardOutPath</key>
    <string>/tmp/poke-messages.log</string>
    <key>StandardErrorPath</key>
    <string>/tmp/poke-messages.err</string>
  </dict>
</plist>
```

備註：

- 這會在**每 300 秒**以及**登入時**執行。
- 首次執行可能會觸發 macOS **Automation（自動化）** 提示（`osascript` → Messages）。請在執行 LaunchAgent 的同一個使用者工作階段中批准這些提示。

載入它：

```bash
launchctl unload ~/Library/LaunchAgents/com.user.poke-messages.plist 2>/dev/null || true
launchctl load ~/Library/LaunchAgents/com.user.poke-messages.plist
```

## 上架

BlueBubbles 可在互動式上架中使用：

```
openclaw onboard
```

精靈會提示輸入：

- **伺服器 URL**（必填）：BlueBubbles 伺服器位址（例如 `http://192.168.1.100:1234`）
- **Password (密碼)** (必要)：來自 BlueBubbles Server 設定的 API 密碼
- **Webhook 路徑**（選填）：預設為 `/bluebubbles-webhook`
- **DM policy (私人訊息政策)**：pairing (配對)、allowlist (允許清單)、open (開放) 或 disabled (停用)
- **Allow list (允許清單)**：電話號碼、電子郵件或聊天目標

您也可以透過 CLI 新增 BlueBubbles：

```
openclaw channels add bluebubbles --http-url http://192.168.1.100:1234 --password <password>
```

## 存取控制 (DM + 群組)

私人訊息 (DM)：

- 預設：`channels.bluebubbles.dmPolicy = "pairing"`。
- 未知發送者會收到配對碼；訊息會被忽略直到核准為止 (配對碼在 1 小時後過期)。
- 透過以下方式核准：
  - `openclaw pairing list bluebubbles`
  - `openclaw pairing approve bluebubbles <CODE>`
- 配對是預設的權杖交換方式。詳情：[配對](/zh-Hant/channels/pairing)

群組：

- `channels.bluebubbles.groupPolicy = open | allowlist | disabled`（預設：`allowlist`）。
- 當設定 `allowlist` 時，`channels.bluebubbles.groupAllowFrom` 控制誰可以在群組中觸發。

### 聯絡人名稱充實（macOS，選用）

BlueBubbles 群組 webhook 通常只包含原始的參與者位址。如果您希望 `GroupMembers` 上下文顯示本地聯絡人名稱，您可以選擇在 macOS 上啟用本地聯絡人擴充：

- `channels.bluebubbles.enrichGroupParticipantsFromContacts = true` 啟用查詢。預設：`false`。
- 查詢僅在群組存取權、指令授權和提及閘門允許訊息通過後才會執行。
- 僅未命名的電話參與者會被充實。
- 當找不到本地匹配項時，原始電話號碼將作為備用方案。

```json5
{
  channels: {
    bluebubbles: {
      enrichGroupParticipantsFromContacts: true,
    },
  },
}
```

### 提及限制（群組）

BlueBubbles 支援群組聊天的提及限制，符合 iMessage/WhatsApp 的行為：

- 使用 `agents.list[].groupChat.mentionPatterns` (或 `messages.groupChat.mentionPatterns`) 來檢測提及。
- 當為群組啟用 `requireMention` 時，代理人僅在被提及時回應。
- 來自授權發送者的控制命令會略過提及限制。

各群組設定：

```json5
{
  channels: {
    bluebubbles: {
      groupPolicy: "allowlist",
      groupAllowFrom: ["+15555550123"],
      groups: {
        "*": { requireMention: true }, // default for all groups
        "iMessage;-;chat123": { requireMention: false }, // override for specific group
      },
    },
  },
}
```

### 命令限制

- 控制指令 (例如 `/config`、`/model`) 需要授權。
- 使用 `allowFrom` 和 `groupAllowFrom` 來判斷指令授權。
- 授權的發送者即使在群組中未提及也可以執行控制命令。

### 各群組系統提示詞

`channels.bluebubbles.groups.*` 下的每個條目都接受一個可選的 `systemPrompt` 字串。該值會在處理該群組訊息的每個輪次中注入到代理人的系統提示中，因此您可以設定各群組的人格或行為規則，而無需編輯代理人提示：

```json5
{
  channels: {
    bluebubbles: {
      groups: {
        "iMessage;-;chat123": {
          systemPrompt: "Keep responses under 3 sentences. Mirror the group's casual tone.",
        },
      },
    },
  },
}
```

金鑰須符合 BlueBubbles 對群組回報的 `chatGuid` / `chatIdentifier` / 數字 `chatId`，而 `"*"` 萬用字元項目則為沒有完全符合的每個群組提供預設值（此模式與 `requireMention` 及各群組工具政策所用的模式相同）。完全符合的項目優先於萬用字元。DM 會忽略此欄位；請改用 Agent 層級或帳戶層級的提示自訂。

#### 實作範例：執行緒回覆和輕拍回應 (Private API)

啟用 BlueBubbles 私有 API 後，傳入訊息會帶有短訊息 ID（例如 `[[reply_to:5]]`），且 Agent 可呼叫 `action=reply` 來回覆特定訊息，或呼叫 `action=react` 來傳送 Tapback。各群組的 `systemPrompt` 是確保 Agent 選擇正確工具的可靠方式：

```json5
{
  channels: {
    bluebubbles: {
      groups: {
        "iMessage;+;chat-family": {
          systemPrompt: [
            "When replying in this group, always call action=reply with the",
            "[[reply_to:N]] messageId from context so your response threads",
            "under the triggering message. Never send a new unlinked message.",
            "",
            "For short acknowledgements ('ok', 'got it', 'on it'), use",
            "action=react with an appropriate tapback emoji (❤️, 👍, 😂, ‼️, ❓)",
            "instead of sending a text reply.",
          ].join(" "),
        },
      },
    },
  },
}
```

Tapback 反應和執行緒回覆都需要 BlueBubbles Private API；請參閱 [Advanced actions](#advanced-actions) 和 [Message IDs](#message-ids-short-vs-full) 以了解底層機制。

## ACP 對話綁定

BlueBubbles 聊天可以轉換為持久的 ACP 工作區，而無需更改傳輸層。

快速操作員流程：

- 在 DM 或允許的群組聊天中執行 `/acp spawn codex --bind here`。
- 該 BlueBubbles 對話中的未來訊息將路由到生成的 ACP 會話。
- `/new` 和 `/reset` 會原地重設相同的綁定 ACP 工作階段。
- `/acp close` 會關閉 ACP 工作階段並移除綁定。

也支援透過頂層 `bindings[]` 項目設定具有 `type: "acp"` 和 `match.channel: "bluebubbles"` 的持續性綁定。

`match.peer.id` 可以使用任何支援的 BlueBubbles 目標格式：

- 標準化的 DM 處理程序，例如 `+15555550123` 或 `user@example.com`
- `chat_id:<id>`
- `chat_guid:<guid>`
- `chat_identifier:<identifier>`

為了穩定的群組綁定，建議優先使用 `chat_id:*` 或 `chat_identifier:*`。

範例：

```json5
{
  agents: {
    list: [
      {
        id: "codex",
        runtime: {
          type: "acp",
          acp: { agent: "codex", backend: "acpx", mode: "persistent" },
        },
      },
    ],
  },
  bindings: [
    {
      type: "acp",
      agentId: "codex",
      match: {
        channel: "bluebubbles",
        accountId: "default",
        peer: { kind: "dm", id: "+15555550123" },
      },
      acp: { label: "codex-imessage" },
    },
  ],
}
```

關於共用的 ACP 綁定行為，請參閱 [ACP Agents](/zh-Hant/tools/acp-agents)。

## 輸入中 + 已讀回執

- **輸入指示器**：在回應生成之前和期間自動發送。
- **已讀回執**：由 `channels.bluebubbles.sendReadReceipts` 控制（預設值：`true`）。
- **輸入指示器**：OpenClaw 發送輸入開始事件；BlueBubbles 在發送或超時時自動清除輸入狀態（通過 DELETE 手動停止是不可靠的）。

```json5
{
  channels: {
    bluebubbles: {
      sendReadReceipts: false, // disable read receipts
    },
  },
}
```

## 進階動作

如果在配置中啟用，BlueBubbles 支持進階訊息動作：

```json5
{
  channels: {
    bluebubbles: {
      actions: {
        reactions: true, // tapbacks (default: true)
        edit: true, // edit sent messages (macOS 13+, broken on macOS 26 Tahoe)
        unsend: true, // unsend messages (macOS 13+)
        reply: true, // reply threading by message GUID
        sendWithEffect: true, // message effects (slam, loud, etc.)
        renameGroup: true, // rename group chats
        setGroupIcon: true, // set group chat icon/photo (flaky on macOS 26 Tahoe)
        addParticipant: true, // add participants to groups
        removeParticipant: true, // remove participants from groups
        leaveGroup: true, // leave group chats
        sendAttachment: true, // send attachments/media
      },
    },
  },
}
```

可用動作：

- **react**：新增/移除輕觸回應（`messageId`、`emoji`、`remove`）。iMessage 原生的輕觸回應集為 `love`、`like`、`dislike`、`laugh`、`emphasize` 和 `question`。當代理選擇該集合以外的表情符號（例如 `👀`）時，回應工具會回退至 `love`，以便輕觸回應仍能呈現，而不會導致整個請求失敗。設定的 ack 回應仍會嚴格驗證，並對未知值報錯。
- **edit**：編輯已傳送的訊息（`messageId`、`text`）
- **unsend**：取消傳送訊息（`messageId`）
- **reply**: 回覆特定訊息 (`messageId`, `text`, `to`)
- **sendWithEffect**: 搭配 iMessage 效果傳送 (`text`, `to`, `effectId`)
- **renameGroup**: 重新命名群組聊天 (`chatGuid`, `displayName`)
- **setGroupIcon**: 設定群組聊天的圖示/照片 (`chatGuid`, `media`) — 在 macOS 26 Tahoe 上不穩定 (API 可能會傳回成功，但圖示不會同步)。
- **addParticipant**: 新增成員至群組 (`chatGuid`, `address`)
- **removeParticipant**: 從群組中移除成員 (`chatGuid`, `address`)
- **leaveGroup**: 離開群組聊天 (`chatGuid`)
- **upload-file**: 發送媒體/檔案 (`to`, `buffer`, `filename`, `asVoice`)
  - 語音備忘錄：設定 `asVoice: true` 為 **MP3** 或 **CAF** 音訊以作為 iMessage 語音訊息發送。BlueBubbles 在發送語音備忘錄時會將 MP3 轉換為 CAF。
- 舊版別名：`sendAttachment` 仍然有效，但 `upload-file` 是標準的動作名稱。

### 訊息 ID (簡短 vs 完整)

OpenClaw 可能會顯示 _簡短_ 訊息 ID（例如 `1`、`2`）以節省 token。

- `MessageSid` / `ReplyToId` 可以是簡短 ID。
- `MessageSidFull` / `ReplyToIdFull` 包含提供者的完整 ID。
- 簡短 ID 僅儲存在記憶體中；它們可能會在重啟或快取被清除時過期。
- Actions 接受簡短或完整的 `messageId`，但如果簡短 ID 不再可用，將會報錯。

針對持久的自動化和儲存，請使用完整 ID：

- 範本：`{{MessageSidFull}}`、`{{ReplyToIdFull}}`
- Context：入站負載中的 `MessageSidFull` / `ReplyToIdFull`

請參閱 [Configuration](/zh-Hant/gateway/configuration) 以了解範本變數。

<a id="coalescing-split-send-dms-command--url-in-one-composition"></a>

## 合併拆分發送的私訊（一則組合中包含指令 + URL）

當使用者在 iMessage 中同時輸入指令和 URL 時 — 例如 `Dump https://example.com/article` — Apple 會將發送拆分為 **兩個單獨的 webhook 傳遞**：

1. 一則文字訊息（`"Dump"`）。
2. 一個 URL 預覽氣球（`"https://..."`），並將 OG 預覽圖片作為附件。

在大多數設定下，這兩個 Webhook 會以約 0.8-2.0 秒的時間差到達 OpenClaw。如果沒有合併，Agent 會在第 1 輪單獨接收到指令並回覆（通常是「發送網址給我」），然後直到第 2 輪才看到網址——此時指令的語境已經丟失。

`channels.bluebubbles.coalesceSameSenderDms` 選項會將連續的相同發送者 Webhook 合併為單一 Agent 回合的私訊（DM）。群組聊天則繼續按每則訊息進行索引，以保留多使用者的回合結構。

### 何時啟用

啟用條件：

- 您的技能預期在一則訊息中包含 `command + payload`（傾印、貼上、儲存、佇列等）。
- 您的使用者會在指令旁貼上網址、圖片或長內容。
- 您可以接受私訊回合增加的延遲（見下文）。

保持停用條件：

- 您需要單字私訊觸發指令具備最低延遲。
- 您的所有流程都是一次性指令，且沒有後續的負載追蹤。

### 啟用方式

```json5
{
  channels: {
    bluebubbles: {
      coalesceSameSenderDms: true, // opt in (default: false)
    },
  },
}
```

啟用該標誌且未指定明確的 `messages.inbound.byChannel.bluebubbles` 時，防抖視窗會擴大至 **2500 毫秒**（非合併發送的預設值為 500 毫秒）。必須使用更寬的視窗，因為 Apple 的分拆發送間隔 0.8-2.0 秒無法納入較緊的預設範圍內。

若要自行調整視窗：

```json5
{
  messages: {
    inbound: {
      byChannel: {
        // 2500 ms works for most setups; raise to 4000 ms if your Mac is slow
        // or under memory pressure (observed gap can stretch past 2 s then).
        bluebubbles: 2500,
      },
    },
  },
}
```

### 權衡取捨

- **增加私訊控制指令的延遲。** 啟用該標誌後，私訊控制指令訊息（例如 `Dump`、`Save` 等）現在會等待最長至防抖視窗的時間再發送，以防還有負載 webhook 傳入。群組聊天指令則保持即時發送。
- **合併輸出有限制** — 合併文字上限為 4000 個字元，並帶有明確的 `…[truncated]` 標記；附件上限為 20 個；來源條目上限為 10 個（超過此數則保留首尾項目）。每個來源 `messageId` 仍會傳遞至 inbound-dedupe，因此稍後 MessagePoller 重放任何單一事件都會被視為重複項。
- **選用功能，逐頻道設定。** 其他頻道（Telegram、WhatsApp、Slack 等）不受影響。

### 情境與代理程式所見

| 使用者撰寫                                        | Apple 傳送                | 關閉旗標（預設）                       | 開啟旗標 + 2500 毫秒時間窗                             |
| ------------------------------------------------- | ------------------------- | -------------------------------------- | ------------------------------------------------------ |
| `Dump https://example.com`（一次傳送）            | 2 個 webhook，間隔約 1 秒 | 兩次代理輪次：先是「Dump」，然後是 URL | 一次輪次：合併文字 `Dump https://example.com`          |
| `Save this 📎image.jpg caption`（附件 + 文字）    | 2 個 webhook              | 兩次輪次                               | 一次輪次：文字 + 圖片                                  |
| `/status`（獨立指令）                             | 1 個 webhook              | 即時發送                               | **等待至視窗結束，然後發送**                           |
| 單獨貼上 URL                                      | 1 個 webhook              | 即時發送                               | 即時發送（桶中只有一個項目）                           |
| 文字 + URL 作為兩條故意分開的訊息發送，間隔數分鐘 | 視窗外 2 個 webhook       | 兩個輪次                               | 兩個輪次（視窗在它們之間過期）                         |
| 快速大量（視窗內超過 10 條小型私訊）              | N 個 webhook              | N 個輪次                               | 一個輪次，受限輸出（第一個 + 最新，應用文字/附件上限） |

### 拆分發送合併疑難排解

如果標誌已開啟且拆分發送仍以兩個輪次到達，請檢查每個層級：

1. **組態確實已載入。**

   ```
   grep coalesceSameSenderDms ~/.openclaw/openclaw.json
   ```

   然後 `openclaw gateway restart` — 標誌在建立 debouncer-registry 時讀取。

2. **防跳動視窗對您的設定來說足夠寬。** 查看 `~/Library/Logs/bluebubbles-server/main.log` 下的 BlueBubbles 伺服器日誌：

   ```
   grep -E "Dispatching event to webhook" main.log | tail -20
   ```

   測量 `"Dump"` 風格的文字發送與隨後的 `"https://..."; Attachments:` 發送之間的間隔。提高 `messages.inbound.byChannel.bluebubbles` 以充分覆蓋該間隔。

3. **Session JSONL 時間戳 ≠ webhook 抵達時間。** Session 事件時間戳（`~/.openclaw/agents/<id>/sessions/*.jsonl`）反映的是網關將訊息傳遞給代理的時間，**而非** webhook 抵達的時間。標記為 `[Queued messages while agent was busy]` 的排隊第二則訊息表示當第二個 webhook 抵達時，第一輪仍在執行中——合併桶已經排空。請根據 BB 伺服器日誌而非 session 日誌來調整視窗時間。

4. **記憶體壓力導致回應傳送變慢。** 在較小的機器（8 GB）上，Agent 輪次的耗時可能足以讓合併桶在回應完成前就先排空，導致 URL 成為排隊的第二輪次。請檢查 `memory_pressure` 和 `ps -o rss -p $(pgrep openclaw-gateway)`；如果閘道超過約 500 MB RSS 且壓縮器正在運作，請關閉其他繁重的程序或升級到更大的主機。

5. **回覆引用傳送是不同的路徑。** 如果使用者點擊 `Dump` 作為對現有 URL 氣球（iMessage 在 Dump 氣球上顯示「1 則回覆」徽章）的**回覆**，則 URL 存在於 `replyToBody` 中，而不是在第二個 webhook 中。合併不適用於此——這是技能/提示的考量，而不是防抖動器的考量。

## 區塊串流

控制回應是以單一訊息傳送還是以區塊串流傳送：

```json5
{
  channels: {
    bluebubbles: {
      blockStreaming: true, // enable block streaming (off by default)
    },
  },
}
```

## 媒體 + 限制

- 傳入的附件會被下載並儲存在媒體快取中。
- 透過 `channels.bluebubbles.mediaMaxMb` 設定媒體限制，適用於傳入和傳出的媒體（預設：8 MB）。
- 傳出文字被分塊為 `channels.bluebubbles.textChunkLimit`（預設：4000 個字元）。

## 配置參考

完整配置：[配置](/zh-Hant/gateway/configuration)

提供者選項：

- `channels.bluebubbles.enabled`：啟用/停用頻道。
- `channels.bluebubbles.serverUrl`：BlueBubbles REST API 基礎 URL。
- `channels.bluebubbles.password`：API 密碼。
- `channels.bluebubbles.webhookPath`：Webhook 端點路徑（預設：`/bluebubbles-webhook`）。
- `channels.bluebubbles.dmPolicy`：`pairing | allowlist | open | disabled`（預設：`pairing`）。
- `channels.bluebubbles.allowFrom`：DM 允許清單（handles、電子郵件、E.164 號碼、`chat_id:*`、`chat_guid:*`）。
- `channels.bluebubbles.groupPolicy`： `open | allowlist | disabled`（預設： `allowlist`）。
- `channels.bluebubbles.groupAllowFrom`：群組發送者允許清單。
- `channels.bluebubbles.enrichGroupParticipantsFromContacts`：在 macOS 上，可選擇在通過閘道檢查後，從本地通訊錄豐富未命名的群組參與者資訊。預設： `false`。
- `channels.bluebubbles.groups`：各群組設定（`requireMention` 等）。
- `channels.bluebubbles.sendReadReceipts`：傳送已讀回執（預設： `true`）。
- `channels.bluebubbles.blockStreaming`：啟用區塊串流（預設： `false`；串流回復所需）。
- `channels.bluebubbles.textChunkLimit`：出塊大小（以字元為單位，預設為 4000）。
- `channels.bluebubbles.sendTimeoutMs`：透過 `/api/v1/message/text` 發送出站文字的每次請求逾時時間，單位為毫秒（預設值：30000）。在 macOS 26 設定中，如果 Private API iMessage 發送在 iMessage 框架內停滯超過 60 秒，請提高此值；例如 `45000` 或 `60000`。探查、聊天查詢、反應、編輯和健康檢查目前保持較短的 10 秒預設值；計劃在後續追蹤中將覆蓋範圍擴大到反應和編輯。每個帳號的覆蓋設定：`channels.bluebubbles.accounts.<accountId>.sendTimeoutMs`。
- `channels.bluebubbles.chunkMode`：`length`（預設值）僅在超過 `textChunkLimit` 時分割；`newline` 會在空白行（段落邊界）處先分割，然後再進行長度分塊。
- `channels.bluebubbles.mediaMaxMb`：入站/出站媒體大小上限，單位為 MB（預設值：8）。
- `channels.bluebubbles.mediaLocalRoots`：允許用於輸出本地媒體路徑的絕對本地目錄的明確允許清單。除非進行了配置，否則預設情況下拒絕本地路徑發送。帳戶級別覆蓋：`channels.bluebubbles.accounts.<accountId>.mediaLocalRoots`。
- `channels.bluebubbles.coalesceSameSenderDms`：將連續的相同發送者 DM webhook 合併為一個 agent 輪次，以便 Apple 的文字+URL 分拆發送作為單一訊息到達（預設值：`false`）。請參閱 [Coalescing split-send DMs](#coalescing-split-send-dms-command--url-in-one-composition) 以了解場景、視窗調整和權衡。在沒有明確的 `messages.inbound.byChannel.bluebubbles` 的情況下啟用時，將預設的輸入防抖視窗從 500 毫秒擴大到 2500 毫秒。
- `channels.bluebubbles.historyLimit`：上下文的最大群組訊息數（0 表示禁用）。
- `channels.bluebubbles.dmHistoryLimit`：DM 歷史記錄限制。
- `channels.bluebubbles.actions`：啟用/停用特定操作。
- `channels.bluebubbles.accounts`: 多帳號配置。

相關的全域選項：

- `agents.list[].groupChat.mentionPatterns` (或 `messages.groupChat.mentionPatterns`)。
- `messages.responsePrefix`。

## 定址 / 傳遞目標

為了穩定的路由，建議優先使用 `chat_guid`：

- `chat_guid:iMessage;-;+15555550123` (群組首選)
- `chat_id:123`
- `chat_identifier:...`
- 直接代碼: `+15555550123`, `user@example.com`
  - 如果直接代碼沒有現有的 DM 聊天，OpenClaw 將透過 `POST /api/v1/chat/new` 建立一個。這需要啟用 BlueBubbles Private API。

### iMessage 與 SMS 路由

當同一個聯絡人在 Mac 上同時擁有 iMessage 和 SMS 聊天（例如已註冊 iMessage 的電話號碼，但也收到了綠氣泡的備訊息），OpenClaw 偏好 iMessage 聊天，並且永遠不會靜默降級為 SMS。若要強制使用 SMS 聊天，請使用明確的 `sms:` 目標前綴（例如 `sms:+15555550123`）。沒有匹配 iMessage 聊天的聯絡人仍會透過 BlueBubbles 回報的任何聊天進行發送。

## 安全性

- 透過將 `guid`/`password` 查詢參數或標頭與 `channels.bluebubbles.password` 進行比較，來驗證 Webhook 請求。
- 請妥善保管 API 密碼和 webhook 端點的秘密（將其視為憑證）。
- BlueBubbles webhook 驗證沒有 localhost 繞過方式。如果您代理 webhook 流量，請在請求中端到端保留 BlueBubbles 密碼。`gateway.trustedProxies` 在此不會取代 `channels.bluebubbles.password`。請參閱 [Gateway security](/zh-Hant/gateway/security#reverse-proxy-configuration)。
- 如果在區域網路 (LAN) 以外公開 BlueBubbles 伺服器，請在伺服器上啟用 HTTPS 和防火牆規則。

## 疑難排解

- 如果輸入/已讀事件停止運作，請檢查 BlueBubbles webhook 日誌，並驗證閘道路徑是否符合 `channels.bluebubbles.webhookPath`。
- 配對碼會在一小時後過期；請使用 `openclaw pairing list bluebubbles` 和 `openclaw pairing approve bluebubbles <code>`。
- 反應需要 BlueBubbles 私有 API (`POST /api/v1/message/react`)；請確保伺服器版本已將其公開。
- 編輯/取消發送需要 macOS 13+ 和相容的 BlueBubbles 伺服器版本。在 macOS 26 (Tahoe) 上，由於私有 API 變更，編輯功能目前無法使用。
- 在 macOS 26 (Tahoe) 上，群組圖示更新可能不穩定：API 可能會回傳成功，但新圖示並未同步。
- OpenClaw 會根據 BlueBubbles 伺服器的 macOS 版本自動隱藏已知有問題的操作。如果在 macOS 26 (Tahoe) 上編輯功能仍然顯示，請使用 `channels.bluebubbles.actions.edit=false` 手動停用。
- 已啟用 `coalesceSameSenderDms` 但分段發送（例如 `Dump` + URL）仍作為兩輪對話到達：請參閱[分段發送合併疑難排解](#split-send-coalescing-troubleshooting)檢查清單 —— 常見原因包括防抖視窗過短、將工作階段日誌時間戳誤讀為 Webhook 抵達時間，或是回覆引言發送（使用的是 `replyToBody`，而非第二個 Webhook）。
- 如需狀態/健康資訊：`openclaw status --all` 或 `openclaw status --deep`。

如需一般頻道工作流程參考，請參閱 [Channels](/zh-Hant/channels) 和 [Plugins](/zh-Hant/tools/plugin) 指南。

## 相關

- [Channels Overview](/zh-Hant/channels) — 所有支援的頻道
- [Pairing](/zh-Hant/channels/pairing) — 私訊驗證和配對流程
- [Groups](/zh-Hant/channels/groups) — 群組聊天行為和提及控制
- [Channel Routing](/zh-Hant/channels/channel-routing) — 訊息的會話路由
- [Security](/zh-Hant/gateway/security) — 存取模型和強化
