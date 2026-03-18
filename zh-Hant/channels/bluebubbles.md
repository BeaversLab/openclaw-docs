---
summary: "透過 BlueBubbles macOS 伺服器進行 iMessage 通訊（REST 傳送/接收、輸入中狀態、反應、配對、進階動作）。"
read_when:
  - Setting up BlueBubbles channel
  - Troubleshooting webhook pairing
  - Configuring iMessage on macOS
title: "BlueBubbles"
---

# BlueBubbles (macOS REST)

狀態：透過 HTTP 與 BlueBubbles macOS 伺服器通訊的內建外掛。與舊版 imsg 頻道相比，由於其更豐富的 API 和更簡單的設定，**建議用於 iMessage 整合**。

## 概覽

- 透過 BlueBubbles 輔助應用程式在 macOS 上運行 ([bluebubbles.app](https://bluebubbles.app))。
- 建議/測試版本：macOS Sequoia (15)。macOS Tahoe (26) 也可運作；但在 Tahoe 上目前編輯功能損壞，且群組圖示更新可能會回報成功但未同步。
- OpenClaw 透過其 REST API 與其通訊 (`GET /api/v1/ping`, `POST /message/text`, `POST /chat/:id/*`)。
- 訊息透過 webhook 傳入；傳出回覆、輸入指示器、已讀回執和點回（Tapbacks）則是 REST 呼叫。
- 附件和貼圖會作為傳入媒體被攝入（並在可能時呈現給代理人）。
- 配對/允許清單的運作方式與其他頻道相同（`/channels/pairing` 等），需使用 `channels.bluebubbles.allowFrom` 加上配對碼。
- 反應會像 Slack/Telegram 一樣以系統事件呈現，以便代理人在回覆前「提及」它們。
- 進階功能：編輯、取消傳送、回覆串列、訊息效果、群組管理。

## 快速開始

1. 在您的 Mac 上安裝 BlueBubbles 伺服器（請遵循 [bluebubbles.app/install](https://bluebubbles.app/install) 的指示）。
2. 在 BlueBubbles 設定中，啟用 Web API 並設定密碼。
3. 執行 `openclaw onboard` 並選擇 BlueBubbles，或進行手動設定：

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
5. 啟動 gateway；它將註冊 webhook 處理程序並開始配對。

安全提示：

- 務必設定 webhook 密碼。
- Webhook 驗證始終是必需的。除非請求包含與 `channels.bluebubbles.password` 相符的密碼/guid（例如 `?password=<password>` 或 `x-password`），否則 OpenClaw 將拒絕 BlueBubbles webhook 請求，無論環回/代理拓撲如何。
- 密碼驗證會在讀取/解析完整 webhook 內容之前進行檢查。

## 保持 Messages.app 運作（VM / 無介面設定）

某些 macOS VM / 永遠在線的設定可能會導致 Messages.app 變為「閒置」狀態（收到的事件會停止，直到應用程式被開啟/前景化）。一個簡單的解決方法是使用 AppleScript + LaunchAgent **每 5 分鐘喚醒 Messages 一次**。

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

- 這會**每 300 秒**執行一次，並**在登入時**執行。
- 初次執行可能會觸發 macOS **Automation**（自動化）提示（`osascript` → Messages）。請在執行 LaunchAgent 的相同使用者工作階段中核准這些提示。

載入它：

```bash
launchctl unload ~/Library/LaunchAgents/com.user.poke-messages.plist 2>/dev/null || true
launchctl load ~/Library/LaunchAgents/com.user.poke-messages.plist
```

## Onboarding

BlueBubbles 可在互動式入學流程中使用：

```
openclaw onboard
```

精靈會提示輸入：

- **Server URL**（必要）：BlueBubbles 伺服器位址（例如 `http://192.168.1.100:1234`）
- **Password**（必要）：來自 BlueBubbles Server 設定的 API 密碼
- **Webhook path**（選用）：預設為 `/bluebubbles-webhook`
- **DM policy**（私訊政策）：pairing（配對）、allowlist（白名單）、open（開放）或 disabled（停用）
- **Allow list**（白名單）：電話號碼、電子郵件或聊天目標

您也可以透過 CLI 新增 BlueBubbles：

```
openclaw channels add bluebubbles --http-url http://192.168.1.100:1234 --password <password>
```

## 存取控制（私人訊息 + 群組）

私人訊息：

- 預設：`channels.bluebubbles.dmPolicy = "pairing"`。
- 未知發送者會收到配對代碼；在批准之前訊息將被忽略（代碼會在 1 小時後過期）。
- 透過以下方式批准：
  - `openclaw pairing list bluebubbles`
  - `openclaw pairing approve bluebubbles <CODE>`
- 配對是預設的權杖交換方式。詳情：[配對](/zh-Hant/channels/pairing)

群組：

- `channels.bluebubbles.groupPolicy = open | allowlist | disabled`（預設：`allowlist`）。
- 當設定 `allowlist` 時，`channels.bluebubbles.groupAllowFrom` 控制誰可以在群組中觸發機器人。

### 提及限制（群組）

BlueBubbles 支援群組聊天的提及限制，其行為符合 iMessage/WhatsApp：

- 使用 `agents.list[].groupChat.mentionPatterns`（或 `messages.groupChat.mentionPatterns`）來偵測提及。
- 當為群組啟用 `requireMention` 時，代理人僅在被提及時回應。
- 來自授權發送者的控制指令會繞過提及閘控。

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

### 指令閘控

- 控制指令（例如 `/config`、`/model`）需要授權。
- 使用 `allowFrom` 和 `groupAllowFrom` 來決定指令授權。
- 授權發送者可以在群組中執行控制指令，即使沒有提及機器人。

## 輸入 + 已讀回執

- **輸入指示器**：會在產生回應之前和期間自動發送。
- **已讀回執**：由 `channels.bluebubbles.sendReadReceipts` 控制（預設值：`true`）。
- **輸入指示器**：OpenClaw 發送輸入開始事件；BlueBubbles 會在發送或逾時時自動清除輸入狀態（透過 DELETE 手動停止是不可靠的）。

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

當在設定中啟用時，BlueBubbles 支援進階訊息動作：

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

- **react**：新增/移除點回反應 (`messageId`, `emoji`, `remove`)
- **edit**：編輯已傳送的訊息 (`messageId`, `text`)
- **unsend**：取消傳送訊息 (`messageId`)
- **reply**：回覆特定訊息 (`messageId`, `text`, `to`)
- **sendWithEffect**：傳送時使用 iMessage 特效 (`text`, `to`, `effectId`)
- **renameGroup**：重新命名群組聊天 (`chatGuid`, `displayName`)
- **setGroupIcon**：設定群組聊天的圖示/照片 (`chatGuid`, `media`) — 在 macOS 26 Tahoe 上不穩定 (API 可能會返回成功，但圖示不會同步)。
- **addParticipant**：將某人加入群組 (`chatGuid`, `address`)
- **removeParticipant**：將某人從群組中移除 (`chatGuid`, `address`)
- **leaveGroup**：離開群組聊天 (`chatGuid`)
- **sendAttachment**：傳送媒體/檔案 (`to`, `buffer`, `filename`, `asVoice`)
  - 語音備忘錄：設定 `asVoice: true` 並搭配 **MP3** 或 **CAF** 音訊以 iMessage 語音訊息的形式傳送。BlueBubbles 在傳送語音備忘錄時會將 MP3 轉換為 CAF。

### 訊息 ID (簡短 vs 完整)

OpenClaw 可能會顯示*短*訊息 ID（例如 `1`, `2`）以節省權杖。

- `MessageSid` / `ReplyToId` 可以是短 ID。
- `MessageSidFull` / `ReplyToIdFull` 包含提供者完整 ID。
- 短 ID 僅儲存在記憶體中；它們可能會在重新啟動或快取清除後過期。
- 動作接受短 ID 或完整 `messageId`，但如果短 ID 不再可用，則會報錯。

對於持續性自動化與儲存，請使用完整 ID：

- 模板：`{{MessageSidFull}}`, `{{ReplyToIdFull}}`
- 語境：傳入酬載中的 `MessageSidFull` / `ReplyToIdFull`

關於模板變數，請參閱 [Configuration](/zh-Hant/gateway/configuration)。

## 區塊串流

控制回應是作為單一訊息傳送還是以區塊形式串流：

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
- 透過 `channels.bluebubbles.mediaMaxMb` 設定媒體上限，適用於傳入和傳出的媒體（預設值：8 MB）。
- 傳出的文字會被區塊化為 `channels.bluebubbles.textChunkLimit`（預設值：4000 個字元）。

## 設定參考

完整設定：[Configuration](/zh-Hant/gateway/configuration)

提供者選項：

- `channels.bluebubbles.enabled`：啟用/停用此通道。
- `channels.bluebubbles.serverUrl`：BlueBubbles REST API 基礎 URL。
- `channels.bluebubbles.password`：API 密碼。
- `channels.bluebubbles.webhookPath`：Webhook 端點路徑（預設值：`/bluebubbles-webhook`）。
- `channels.bluebubbles.dmPolicy`：`pairing | allowlist | open | disabled`（預設值：`pairing`）。
- `channels.bluebubbles.allowFrom`：DM 白名單（handles、電子郵件、E.164 號碼、`chat_id:*`、`chat_guid:*`）。
- `channels.bluebubbles.groupPolicy`：`open | allowlist | disabled`（預設值：`allowlist`）。
- `channels.bluebubbles.groupAllowFrom`：群組發送者白名單。
- `channels.bluebubbles.groups`：各群組設定（`requireMention` 等）。
- `channels.bluebubbles.sendReadReceipts`：發送已讀回執（預設值：`true`）。
- `channels.bluebubbles.blockStreaming`：啟用區塊串流（預設值：`false`；串流回覆所需）。
- `channels.bluebubbles.textChunkLimit`：出站區塊大小（字元）（預設值：4000）。
- `channels.bluebubbles.chunkMode`: `length` (預設) 僅在超過 `textChunkLimit` 時分割；`newline` 會在空白行 (段落邊界) 進行長度分割之前先分割。
- `channels.bluebubbles.mediaMaxMb`: 進階/出站媒體容量上限，單位為 MB (預設: 8)。
- `channels.bluebubbles.mediaLocalRoots`: 明確允許用於出站本地媒體路徑的絕對本地目錄白名單。除非有配置此項，否則預設會拒絕傳送本地路徑。每帳號覆寫設定：`channels.bluebubbles.accounts.<accountId>.mediaLocalRoots`。
- `channels.bluebubbles.historyLimit`: 用於內容的群組訊息最大數量 (設為 0 則停用)。
- `channels.bluebubbles.dmHistoryLimit`: 私訊 (DM) 歷史記錄限制。
- `channels.bluebubbles.actions`: 啟用/停用特定動作。
- `channels.bluebubbles.accounts`: 多帳號設定。

相關的全域選項：

- `agents.list[].groupChat.mentionPatterns`（或 `messages.groupChat.mentionPatterns`）。
- `messages.responsePrefix`。

## 定址 / 傳遞目標

為了穩定的路由，建議使用 `chat_guid`：

- `chat_guid:iMessage;-;+15555550123`（群組建議使用）
- `chat_id:123`
- `chat_identifier:...`
- 直接指標：`+15555550123`、`user@example.com`
  - 如果直接指標沒有現有的私人訊息 (DM) 對話，OpenClaw 將透過 `POST /api/v1/chat/new` 建立一個。這需要啟用 BlueBubbles Private API。

## 安全性

- Webhook 請求是透過將 `guid`/`password` 查詢參數或標頭與 `channels.bluebubbles.password` 進行比對來驗證的。來自 `localhost` 的請求也會被接受。
- 請妥善保管 API 密碼和 Webhook 端點（將其視為憑證對待）。
- 本地主機信任意味著同主機的反向代理可能會無意中繞過密碼。如果您代理了網關，請在代理層要求驗證並配置 `gateway.trustedProxies`。請參閱 [Gateway security](/zh-Hant/gateway/security#reverse-proxy-configuration)。
- 如果將 BlueBubbles 伺服器暴露在區域網路（LAN）之外，請在該伺服器上啟用 HTTPS 和防火牆規則。

## 疑難排解

- 如果輸入/已讀事件停止運作，請檢查 BlueBubbles 的 Webhook 日誌，並驗證網關路徑是否符合 `channels.bluebubbles.webhookPath`。
- 配對代碼的有效期為一小時；請使用 `openclaw pairing list bluebubbles` 和 `openclaw pairing approve bluebubbles <code>`。
- 反應（Reactions）需要 BlueBubbles 私有 API (`POST /api/v1/message/react`)；請確保伺服器版本已將其開放。
- 編輯/取消傳送需要 macOS 13+ 及相容的 BlueBubbles 伺服器版本。在 macOS 26 (Tahoe) 上，由於私有 API 變更，編輯功能目前無法使用。
- 在 macOS 26 (Tahoe) 上，群組圖示更新可能不穩定：API 可能會回傳成功，但新圖示並未同步。
- OpenClaw 會根據 BlueBubbles 伺服器的 macOS 版本自動隱藏已知損壞的操作。如果在 macOS 26 (Tahoe) 上仍然顯示編輯選項，請使用 `channels.bluebubbles.actions.edit=false` 手動停用它。
- 如需狀態/健康資訊：`openclaw status --all` 或 `openclaw status --deep`。

如需一般通道工作流程參考，請參閱 [Channels](/zh-Hant/channels) 和 [Plugins](/zh-Hant/tools/plugin) 指南。

import footerZhHant from "/components/footer/zh-Hant.mdx";

<footerZhHant />
