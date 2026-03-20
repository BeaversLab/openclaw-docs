---
summary: "透過 BlueBubbles macOS 伺服器使用 iMessage（REST 傳送/接收、輸入中、反應、配對、進階操作）。"
read_when:
  - 設定 BlueBubbles 頻道
  - 故障排除 webhook 配對
  - 在 macOS 上設定 iMessage
title: "BlueBubbles"
---

# BlueBubbles (macOS REST)

狀態：內建外掛，透過 HTTP 與 BlueBubbles macOS 伺服器通訊。與舊版 imsg 頻道相比，由於其 API 更豐富且設定更簡單，因此**推薦用於 iMessage 整合**。

## 概覽

- 透過 BlueBubbles 助理應用程式 ([bluebubbles.app](https://bluebubbles.app)) 在 macOS 上執行。
- 推薦/測試版本：macOS Sequoia (15)。macOS Tahoe (26) 也可運作；在 Tahoe 上編輯功能目前損壞，且群組圖示更新可能回報成功但未同步。
- OpenClaw 透過其 REST API (`GET /api/v1/ping`, `POST /message/text`, `POST /chat/:id/*`) 與其通訊。
- 傳入訊息透過 webhooks 抵達；傳出回覆、輸入指示器、已讀回執和點回是 REST 呼叫。
- 附件和貼圖作為內部媒體被攝入（並在可能時呈現給代理人）。
- 配對/允許清單的運作方式與其他頻道（`/channels/pairing` 等）相同，使用 `channels.bluebubbles.allowFrom` + 配對碼。
- 回應與 Slack/Telegram 一樣作為系統事件呈現，因此代理人可以在回覆前「提及」它們。
- 進階功能：編輯、取消傳送、回覆串列、訊息特效、群組管理。

## 快速開始

1. 在您的 Mac 上安裝 BlueBubbles 伺服器（依照 [bluebubbles.app/install](https://bluebubbles.app/install) 上的指示進行）。
2. 在 BlueBubbles 設定中，啟用 Web API 並設定密碼。
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

4. 將 BlueBubbles webhooks 指向您的網關（例如：`https://your-gateway-host:3000/bluebubbles-webhook?password=<password>`）。
5. 啟動網關；它將註冊 webhook 處理程序並開始配對。

安全提示：

- 務必設定 webhook 密碼。
- Webhook 驗證始終是必需的。除非 BlueBubbles webhook 請求包含與 `channels.bluebubbles.password` 相符的密碼/guid（例如 `?password=<password>` 或 `x-password`），否則 OpenClaw 將拒絕這些請求，無論 loopback/proxy 拓撲結構如何。
- 密碼驗證會在讀取/解析完整 webhook 內容之前進行檢查。

## 保持 Messages.app 運作（VM / 無介面設定）

部分 macOS VM / 持續運作設定可能會導致 Messages.app 變成「閒置」狀態（除非應用程式被開啟/置於前景，否則傳入事件會停止）。一個簡單的解決方法是使用 AppleScript + LaunchAgent **每 5 分鐘喚醒一次 Messages**。

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

- 這會**每 300 秒**以及**登入時**執行。
- 首次執行可能會觸發 macOS **自動化** 權限提示（`osascript` → 訊息）。請在執行該 LaunchAgent 的相同使用者工作階段中核准這些權限。

載入它：

```bash
launchctl unload ~/Library/LaunchAgents/com.user.poke-messages.plist 2>/dev/null || true
launchctl load ~/Library/LaunchAgents/com.user.poke-messages.plist
```

## 上架（Onboarding）

BlueBubbles 可在互動式上架中使用：

```
openclaw onboard
```

精靈會提示輸入：

- **伺服器 URL**（必填）：BlueBubbles 伺服器位址（例如 `http://192.168.1.100:1234`）
- **密碼**（必填）：來自 BlueBubbles Server 設定的 API 密碼
- **Webhook 路徑**（選填）：預設為 `/bluebubbles-webhook`
- **私訊 (DM) 政策**：配對、允許清單、開放或停用
- **允許清單**：電話號碼、電子郵件或聊天目標

您也可以透過 CLI 新增 BlueBubbles：

```
openclaw channels add bluebubbles --http-url http://192.168.1.100:1234 --password <password>
```

## 存取控制（私訊 + 群組）

私訊：

- 預設值：`channels.bluebubbles.dmPolicy = "pairing"`。
- 未知的發送者會收到配對碼；在核准之前訊息會被忽略（配對碼在 1 小時後過期）。
- 透過以下方式核准：
  - `openclaw pairing list bluebubbles`
  - `openclaw pairing approve bluebubbles <CODE>`
- 配對是預設的權杖交換方式。詳情：[配對](/zh-Hant/channels/pairing)

群組：

- `channels.bluebubbles.groupPolicy = open | allowlist | disabled`（預設值：`allowlist`）。
- 當設定 `allowlist` 時，`channels.bluebubbles.groupAllowFrom` 控制誰可以在群組中觸發。

### 提及閘門（群組）

BlueBubbles 支援群組聊天的提及閘門，符合 iMessage/WhatsApp 的行為：

- 使用 `agents.list[].groupChat.mentionPatterns`（或 `messages.groupChat.mentionPatterns`）來偵測提及。
- 當為群組啟用 `requireMention` 時，代理程式僅在被提及時才會回應。
- 來自授權發送者的控制命令會略過提及門檻。

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

### 命令門檻

- 控制命令（例如 `/config`、`/model`）需要授權。
- 使用 `allowFrom` 和 `groupAllowFrom` 來判斷命令授權。
- 授權發送者即使在群組中未提及也能執行控制命令。

## 輸入中 + 已讀回執

- **輸入中指示器**：在生成回應之前和期間會自動發送。
- **已讀回執**：由 `channels.bluebubbles.sendReadReceipts` 控制（預設值：`true`）。
- **輸入中指示器**：OpenClaw 發送正在輸入的開始事件；BlueBubbles 會在發送或逾時時自動清除輸入狀態（透過 DELETE 手動停止並不可靠）。

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

BlueBubbles 支援進階訊息動作，當在設定中啟用時：

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

- **react**: 新增/移除點擊回應 (`messageId`, `emoji`, `remove`)
- **edit**: 編輯已傳送的訊息 (`messageId`, `text`)
- **unsend**: 取消傳送訊息 (`messageId`)
- **reply**: 回覆特定訊息 (`messageId`, `text`, `to`)
- **sendWithEffect**: 搭配 iMessage 特效傳送 (`text`, `to`, `effectId`)
- **renameGroup**: 重新命名群組聊天 (`chatGuid`, `displayName`)
- **setGroupIcon**: 設定群組聊天的圖示/照片 (`chatGuid`, `media`) — 在 macOS 26 Tahoe 上不穩定（API 可能回傳成功但圖示未同步）。
- **addParticipant**: 新增某人至群組 (`chatGuid`, `address`)
- **removeParticipant**: 從群組中移除某人 (`chatGuid`, `address`)
- **leaveGroup**: 離開群組聊天 (`chatGuid`)
- **sendAttachment**: 傳送媒體/檔案 (`to`, `buffer`, `filename`, `asVoice`)
  - 語音備忘錄：將 `asVoice: true` 設定為 **MP3** 或 **CAF** 音訊以作為 iMessage 語音訊息傳送。BlueBubbles 會在傳送語音備忘錄時將 MP3 轉換為 CAF。

### 訊息 ID（簡短 vs 完整）

OpenClaw 可能會顯示 _簡短_ 訊息 ID（例如 `1`、`2`）以節省 Token。

- `MessageSid` / `ReplyToId` 可以是簡短 ID。
- `MessageSidFull` / `ReplyToIdFull` 包含提供者的完整 ID。
- 簡短 ID 僅儲存在記憶體中；它們可能會在重新啟動或快取清除時過期。
- 動作接受簡短或完整的 `messageId`，但如果簡短 ID 不再可用，則會報錯。

請使用完整 ID 進行持久的自動化與儲存：

- 範本：`{{MessageSidFull}}`、`{{ReplyToIdFull}}`
- 語境：傳入 Payload 中的 `MessageSidFull` / `ReplyToIdFull`

請參閱 [組態](/zh-Hant/gateway/configuration) 以了解範本變數。

## 封鎖串流

控制回應是作為單一訊息發送，還是分塊串流發送：

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
- 透過 `channels.bluebubbles.mediaMaxMb` 設定傳入與傳出媒體的大小上限（預設：8 MB）。
- 傳出文字會被區塊化為 `channels.bluebubbles.textChunkLimit`（預設：4000 個字元）。

## 組態參考

完整組態：[Configuration](/zh-Hant/gateway/configuration)

提供者選項：

- `channels.bluebubbles.enabled`：啟用/停用頻道。
- `channels.bluebubbles.serverUrl`：BlueBubbles REST API 基礎 URL。
- `channels.bluebubbles.password`：API 密碼。
- `channels.bluebubbles.webhookPath`：Webhook 端點路徑（預設：`/bluebubbles-webhook`）。
- `channels.bluebubbles.dmPolicy`：`pairing | allowlist | open | disabled`（預設：`pairing`）。
- `channels.bluebubbles.allowFrom`: DM 允許清單（帳號、電子郵件、E.164 號碼、`chat_id:*`、`chat_guid:*`）。
- `channels.bluebubbles.groupPolicy`: `open | allowlist | disabled`（預設值：`allowlist`）。
- `channels.bluebubbles.groupAllowFrom`: 群組發送者允許清單。
- `channels.bluebubbles.groups`: 各群組設定（`requireMention` 等）。
- `channels.bluebubbles.sendReadReceipts`: 發送已讀回執（預設值：`true`）。
- `channels.bluebubbles.blockStreaming`: 啟用區塊串流（預設值：`false`；串流回覆所需）。
- `channels.bluebubbles.textChunkLimit`: 外傳區塊大小（以字元計，預設值為 4000）。
- `channels.bluebubbles.chunkMode`：`length`（預設）僅在超過 `textChunkLimit` 時分割；`newline` 在進行長度分塊前於空行（段落邊界）分割。
- `channels.bluebubbles.mediaMaxMb`：傳入/傳出媒體上限，單位為 MB（預設：8）。
- `channels.bluebubbles.mediaLocalRoots`：允許用於傳出本機媒體路徑的絕對本機目錄的明確允許清單。除非已配置，否則預設拒絕傳送本機路徑。每個帳戶的覆蓋設定：`channels.bluebubbles.accounts.<accountId>.mediaLocalRoots`。
- `channels.bluebubbles.historyLimit`：內容的最大群組訊息數（0 表示停用）。
- `channels.bluebubbles.dmHistoryLimit`：DM 歷史記錄限制。
- `channels.bluebubbles.actions`：啟用/停用特定動作。
- `channels.bluebubbles.accounts`：多帳戶配置。

相關的全域選項：

- `agents.list[].groupChat.mentionPatterns`（或 `messages.groupChat.mentionPatterns`）。
- `messages.responsePrefix`。

## 定址 / 傳送目標

為了穩定的路由，建議優先使用 `chat_guid`：

- `chat_guid:iMessage;-;+15555550123`（群組建議使用）
- `chat_id:123`
- `chat_identifier:...`
- 直接代碼：`+15555550123`、`user@example.com`
  - 如果直接代碼沒有既有的私人訊息對話，OpenClaw 將透過 `POST /api/v1/chat/new` 建立一個。這需要啟用 BlueBubbles Private API。

## 安全性

- Webhook 請求是透過比對 `guid`/`password` 查詢參數或標頭與 `channels.bluebubbles.password` 來進行驗證。來自 `localhost` 的請求也會被接受。
- 請妥善保管 API 密碼和 webhook 端點（將其視為憑證）。
- Localhost 信任意味著同主機的反向代理可能會無意繞過密碼。如果您為閘道設定代理，請在代理層級要求身份驗證並設定 `gateway.trustedProxies`。請參閱 [閘道安全性](/zh-Hant/gateway/security#reverse-proxy-configuration)。
- 如果在區域網路 (LAN) 之外公開 BlueBubbles 伺服器，請在該伺服器上啟用 HTTPS 和防火牆規則。

## 疑難排解

- 如果輸入/已讀事件停止運作，請檢查 BlueBubbles webhook 記錄，並確認閘道路徑符合 `channels.bluebubbles.webhookPath`。
- 配對碼會在一小時後過期；請使用 `openclaw pairing list bluebubbles` 和 `openclaw pairing approve bluebubbles <code>`。
- 反應功能需要 BlueBubbles 私有 API (`POST /api/v1/message/react`)；請確保伺服器版本已將其公開。
- 編輯/取消傳送需要 macOS 13+ 和相容的 BlueBubbles 伺服器版本。在 macOS 26 (Tahoe) 上，由於私有 API 變更，編輯功能目前無法使用。
- 在 macOS 26 (Tahoe) 上，群組圖示更新可能不穩定：API 可能會回傳成功，但新圖示並未同步。
- OpenClaw 會根據 BlueBubbles 伺服器的 macOS 版本自動隱藏已知損壞的操作。如果在 macOS 26 (Tahoe) 上仍然顯示編輯選項，請使用 `channels.bluebubbles.actions.edit=false` 手動停用它。
- 若要查看狀態/健康狀況資訊：`openclaw status --all` 或 `openclaw status --deep`。

如需一般頻道工作流程參考，請參閱 [頻道](/zh-Hant/channels) 和 [外掛程式](/zh-Hant/tools/plugin) 指南。

import en from "/components/footer/en.mdx";

<en />
