---
summary: "透過 BlueBubbles macOS 伺服器進行 iMessage（REST 傳送/接收、輸入狀態、反應、配對、進階操作）。"
read_when:
  - Setting up BlueBubbles channel
  - Troubleshooting webhook pairing
  - Configuring iMessage on macOS
title: "BlueBubbles"
---

# BlueBubbles (macOS REST)

狀態：內建外掛，透過 HTTP 與 BlueBubbles macOS 伺服器通訊。由於其 API 豐富且設定比舊版 imsg 頻道簡單，**建議用於 iMessage 整合**。

## 概覽

- 透過 BlueBubbles 協助程式 ([bluebubbles.app](https://bluebubbles.app)) 在 macOS 上執行。
- 建議/測試版本：macOS Sequoia (15)。macOS Tahoe (26) 也可運作；目前在 Tahoe 上編輯功能有問題，且群組圖示更新可能回報成功但未同步。
- OpenClaw 透過其 REST API （`GET /api/v1/ping`、`POST /message/text`、`POST /chat/:id/*`）與其通訊。
- 傳入訊息透過 webhooks 到達；傳出回覆、輸入指示器、已讀回執和輕拍回應則為 REST 呼叫。
- 附件和貼圖會作為傳入媒體被攝入（並在可能時顯示給代理程式）。
- 配對/允許清單的運作方式與其他頻道（`/channels/pairing` 等）相同，需使用 `channels.bluebubbles.allowFrom` + 配對碼。
- 反應會像 Slack/Telegram 一樣顯示為系統事件，因此代理程式可以在回覆前「提及」它們。
- 進階功能：編輯、取消傳送、回覆串、訊息效果、群組管理。

## 快速開始

1. 在您的 Mac 上安裝 BlueBubbles 伺服器（請遵循 [bluebubbles.app/install](https://bluebubbles.app/install) 上的指示）。
2. 在 BlueBubbles 設定中，啟用 web API 並設定密碼。
3. 執行 `openclaw onboard` 並選取 BlueBubbles，或是手動設定：

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

4. 將 BlueBubbles webhooks 指向您的閘道（例如：`https://your-gateway-host:3000/bluebubbles-webhook?password=<password>`）。
5. 啟動閘道；它將註冊 webhook 處理程式並開始配對。

安全提示：

- 務必設定 webhook 密碼。
- Webhook 驗證始終是必需的。除非 BlueBubbles webhook 請求包含符合 `channels.bluebubbles.password` 的密碼/guid（例如 `?password=<password>` 或 `x-password`），否則 OpenClaw 將拒絕這些請求，無論回送/代理拓撲如何。
- 密碼驗證會在讀取/解析完整 webhook 內容之前進行檢查。

## 保持 Messages.app 運作 (VM / 無介面設置)

某些 macOS VM / 常開設置可能會導致 Messages.app 進入「閒置」狀態（傳入事件停止，直到應用程式被開啟/切換到前景）。一個簡單的解決方法是使用 AppleScript + LaunchAgent **每 5 分鐘觸碰一下 Messages**。

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

註記：

- 這會**每 300 秒**和**登入時**執行一次。
- 第一次執行可能會觸發 macOS **自動化** 提示（`osascript` → 訊息）。請在執行 LaunchAgent 的相同使用者工作階段中核准它們。

載入它：

```bash
launchctl unload ~/Library/LaunchAgents/com.user.poke-messages.plist 2>/dev/null || true
launchctl load ~/Library/LaunchAgents/com.user.poke-messages.plist
```

## 上架

BlueBubbles 可用於互動式上架：

```
openclaw onboard
```

精靈會提示輸入：

- **伺服器網址**（必填）：BlueBubbles 伺服器位址（例如 `http://192.168.1.100:1234`）
- **密碼**（必填）：來自 BlueBubbles 伺服器設定的 API 密碼
- **Webhook 路徑**（選填）：預設為 `/bluebubbles-webhook`
- **私訊政策**：配對、允許清單、開放或停用
- **允許清單**：電話號碼、電子郵件或聊天目標

您也可以透過 CLI 新增 BlueBubbles：

```
openclaw channels add bluebubbles --http-url http://192.168.1.100:1234 --password <password>
```

## 存取控制（私訊 + 群組）

私訊：

- 預設：`channels.bluebubbles.dmPolicy = "pairing"`。
- 未知發送者會收到配對碼；在獲得批准之前訊息會被忽略（配對碼於 1 小時後過期）。
- 透過以下方式批准：
  - `openclaw pairing list bluebubbles`
  - `openclaw pairing approve bluebubbles <CODE>`
- 配對是預設的權杖交換方式。詳情：[配對](/en/channels/pairing)

群組：

- `channels.bluebubbles.groupPolicy = open | allowlist | disabled`（預設：`allowlist`）。
- 當設定 `allowlist` 時，`channels.bluebubbles.groupAllowFrom` 控制群組中誰可以觸發機器人。

### 提及閘門（群組）

BlueBubbles 支援群組聊天的提及閘門，符合 iMessage/WhatsApp 的行為：

- 使用 `agents.list[].groupChat.mentionPatterns`（或 `messages.groupChat.mentionPatterns`）來偵測提及。
- 當為群組啟用 `requireMention` 時，代理僅在被提及時回應。
- 來自授權發送者的控制命令會繞過提及閘道。

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

### 指令閘道

- 控制指令（例如 `/config`、`/model`）需要授權。
- 使用 `allowFrom` 和 `groupAllowFrom` 來判定指令授權。
- 授權的發送者即使在群組中未提及也可以執行控制指令。

## 輸入中 + 已讀回執

- **輸入指示器**：在產生回應之前和期間會自動發送。
- **已讀回執**：由 `channels.bluebubbles.sendReadReceipts` 控制（預設值：`true`）。
- **輸入指示器**：OpenClaw 會發送正在輸入的開始事件；BlueBubbles 會在發送或逾時時自動清除輸入狀態（透過 DELETE 手動停止並不可靠）。

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

如果在設定中啟用，BlueBubbles 支援進階訊息動作：

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

- **react**: 新增/移除點讚回應 (`messageId`, `emoji`, `remove`)
- **edit**: 編輯已傳送的訊息 (`messageId`, `text`)
- **unsend**: 取消傳送訊息 (`messageId`)
- **reply**: 回覆特定訊息 (`messageId`, `text`, `to`)
- **sendWithEffect**: 以 iMessage 特效傳送 (`text`, `to`, `effectId`)
- **renameGroup**: 重新命名群組聊天 (`chatGuid`, `displayName`)
- **setGroupIcon**: 設定群組聊天的圖示/照片 (`chatGuid`, `media`) — 在 macOS 26 Tahoe 上不穩定 (API 可能傳回成功，但圖示不會同步)。
- **addParticipant**: 新增成員到群組 (`chatGuid`, `address`)
- **removeParticipant**: 從群組中移除成員 (`chatGuid`, `address`)
- **leaveGroup**：離開群組聊天 (`chatGuid`)
- **sendAttachment**：傳送媒體/檔案 (`to`, `buffer`, `filename`, `asVoice`)
  - 語音備忘錄：設定 `asVoice: true` 為 **MP3** 或 **CAF** 音訊，以 iMessage 語音訊息傳送。BlueBubbles 在傳送語音備忘錄時會將 MP3 轉換為 CAF。

### 訊息 ID（短 ID vs 完整 ID）

OpenClaw 可能會顯示「簡短」訊息 ID（例如 `1`、`2`）以節省 tokens。

- `MessageSid` / `ReplyToId` 可以是簡短 ID。
- `MessageSidFull` / `ReplyToIdFull` 包含提供者的完整 ID。
- 簡短 ID 僅存在於記憶體中；它們可能會在重啟或快取清除後過期。
- 動作接受簡短或完整的 `messageId`，但如果簡短 ID 不再可用，則會報錯。

請使用完整的 ID 進行持久化自動化和儲存：

- 範本：`{{MessageSidFull}}`、`{{ReplyToIdFull}}`
- 上下文：入站負載中的 `MessageSidFull` / `ReplyToIdFull`

請參閱 [設定](/en/gateway/configuration) 以了解範本變數。

## 阻斷串流

控制回應是作為單條訊息發送還是分塊串流：

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

- 傳入的附件將會被下載並儲存在媒體快取中。
- 透過 `channels.bluebubbles.mediaMaxMb` 設定傳入與傳出媒體的大小上限（預設：8 MB）。
- 傳出文字會被分割成 `channels.bluebubbles.textChunkLimit`（預設：4000 個字元）。

## 設定參考

完整設定：[Configuration](/en/gateway/configuration)

供應商選項：

- `channels.bluebubbles.enabled`：啟用/停用此頻道。
- `channels.bluebubbles.serverUrl`：BlueBubbles REST API 基礎 URL。
- `channels.bluebubbles.password`：API 密碼。
- `channels.bluebubbles.webhookPath`：Webhook 端點路徑（預設值：`/bluebubbles-webhook`）。
- `channels.bluebubbles.dmPolicy`：`pairing | allowlist | open | disabled`（預設值：`pairing`）。
- `channels.bluebubbles.allowFrom`: DM 白名單 (handles、電子郵件、E.164 號碼、`chat_id:*`、`chat_guid:*`)。
- `channels.bluebubbles.groupPolicy`: `open | allowlist | disabled` (預設: `allowlist`)。
- `channels.bluebubbles.groupAllowFrom`: 群組發送者白名單。
- `channels.bluebubbles.groups`: 每個群組的配置 (`requireMention` 等等)。
- `channels.bluebubbles.sendReadReceipts`: 發送已讀回執（預設值：`true`）。
- `channels.bluebubbles.blockStreaming`: 啟用區塊串流（預設值：`false`；串流回覆所需）。
- `channels.bluebubbles.textChunkLimit`: 輸出區塊大小（以字元為單位，預設值：4000）。
- `channels.bluebubbles.chunkMode`： `length` (預設) 僅在超過 `textChunkLimit` 時分割； `newline` 會在進行長度分段前於空行 (段落邊界) 分割。
- `channels.bluebubbles.mediaMaxMb`：進入/傳出媒體大小上限，單位為 MB (預設：8)。
- `channels.bluebubbles.mediaLocalRoots`：允許輸出的本地媒體路徑所使用的絕對本地目錄之明確允許列表。除非進行此配置，否則預設會拒絕傳送本地路徑。每帳號覆寫：`channels.bluebubbles.accounts.<accountId>.mediaLocalRoots`。
- `channels.bluebubbles.historyLimit`：情境（context）的群組訊息數量上限（設為 0 則停用）。
- `channels.bluebubbles.dmHistoryLimit`：私訊 (DM) 歷史記錄限制。
- `channels.bluebubbles.actions`：啟用/停用特定動作。
- `channels.bluebubbles.accounts`：多帳號設定。

相關全域選項：

- `agents.list[].groupChat.mentionPatterns`（或 `messages.groupChat.mentionPatterns`）。
- `messages.responsePrefix`。

## 定址 / 傳遞目標

建議優先使用 `chat_guid` 以獲得穩定的路由：

- `chat_guid:iMessage;-;+15555550123`（群組建議使用）
- `chat_id:123`
- `chat_identifier:...`
- Direct handles: `+15555550123`, `user@example.com`
  - If a direct handle does not have an existing DM chat, OpenClaw will create one via `POST /api/v1/chat/new`. This requires the BlueBubbles Private API to be enabled.

## Security

- Webhook 請求是透過比對 `guid`/`password` 查詢參數或標頭與 `channels.bluebubbles.password` 來進行驗證。來自 `localhost` 的請求也會被接受。
- 請妥善保管 API 密碼和 webhook 端點（將其視為憑證）。
- Localhost 信任意味著同主機反向代理可能會在無意中繞過密碼。如果您對閘道進行代理，請在代理層要求身份驗證並設定 `gateway.trustedProxies`。請參閱 [Gateway security](/en/gateway/security#reverse-proxy-configuration)。
- 如果您將 BlueBubbles 伺服器暴露於區域網路之外，請在該伺服器上啟用 HTTPS 和防火牆規則。

## 疑難排解

- 如果打字/已讀事件停止運作，請檢查 BlueBubbles webhook 日誌並驗證閘道路徑符合 `channels.bluebubbles.webhookPath`。
- 配對碼會在一小時後過期；請使用 `openclaw pairing list bluebubbles` 和 `openclaw pairing approve bluebubbles <code>`。
- 反應功能需要 BlueBubbles 私有 API (`POST /api/v1/message/react`)；請確保伺服器版本已將其開放。
- 編輯/取消傳送需要 macOS 13+ 和相容的 BlueBubbles 伺服器版本。在 macOS 26 (Tahoe) 上，由於私有 API 變更，編輯功能目前無法使用。
- 群組圖示更新在 macOS 26 (Tahoe) 上可能不穩定：API 可能會傳回成功，但新圖示並未同步。
- OpenClaw 會根據 BlueBubbles 伺服器的 macOS 版本自動隱藏已知損壞的操作。如果在 macOS 26 (Tahoe) 上仍然顯示編輯選項，請使用 `channels.bluebubbles.actions.edit=false` 手動停用它。
- 若要查看狀態/健康資訊：`openclaw status --all` 或 `openclaw status --deep`。

如需一般頻道工作流程參考，請參閱 [頻道](/en/channels) 與 [外掛程式](/en/tools/plugin) 指南。
