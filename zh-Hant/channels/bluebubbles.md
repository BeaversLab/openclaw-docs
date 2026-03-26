---
summary: "透過 BlueBubbles macOS 伺服器進行 iMessage 通訊（REST 傳送/接收、輸入指示、反應、配對、進階操作）。"
read_when:
  - Setting up BlueBubbles channel
  - Troubleshooting webhook pairing
  - Configuring iMessage on macOS
title: "BlueBubbles"
---

# BlueBubbles (macOS REST)

狀態：內建插件，透過 HTTP 與 BlueBubbles macOS 伺服器通訊。與舊版 imsg 頻道相比，由於其更豐富的 API 和更簡單的設定，**建議用於 iMessage 整合**。

## 概覽

- 透過 BlueBubbles 協助程式（[bluebubbles.app](https://bluebubbles.app)）在 macOS 上執行。
- 推薦/測試：macOS Sequoia (15)。macOS Tahoe (26) 亦可運作；編輯功能在 Tahoe 上目前無法使用，且群組圖示更新可能回報成功但未同步。
- OpenClaw 通過其 REST API (`GET /api/v1/ping`, `POST /message/text`, `POST /chat/:id/*`) 與其進行通訊。
- 傳入訊息透過 webhook 抵達；傳出回覆、輸入指示器、已讀回執和點贊則是 REST 呼叫。
- 附件和貼圖會被作為傳入媒體接收（並盡可能呈現給代理程式）。
- 配對/許可清單的運作方式與其他頻道（`/channels/pairing` 等）相同，使用 `channels.bluebubbles.allowFrom` + 配對碼。
- 反應會像 Slack/Telegram 一樣作為系統事件呈現，以便代理人在回覆前可以「提及」它們。
- 進階功能：編輯、取消傳送、回覆串列、訊息特效、群組管理。

## 快速開始

1. 在您的 Mac 上安裝 BlueBubbles 伺服器（請依照 [bluebubbles.app/install](https://bluebubbles.app/install) 上的指示操作）。
2. 在 BlueBubbles 設定中，啟用網頁 API 並設定密碼。
3. 執行 `openclaw onboard` 並選取 BlueBubbles，或手動設定：

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

4. 將 BlueBubbles webhook 指向您的閘道（例如：`https://your-gateway-host:3000/bluebubbles-webhook?password=<password>`）。
5. 啟動閘道；它將註冊 webhook 處理程序並開始配對。

安全注意：

- 務必設定 webhook 密碼。
- Webhook 驗證始終是必需的。除非 BlueBubbles webhook 請求包含與 `channels.bluebubbles.password` 相符的密碼/guid（例如 `?password=<password>` 或 `x-password`），否則 OpenClaw 會拒絕該請求，無論 loopback/proxy 拓撲結構為何。
- 在讀取/解析完整的 webhook 內容之前，會先檢查密碼驗證。

## 保持 Messages.app 運作（VM / 無介面設定）

某些 macOS VM / 常駐設定可能會導致「訊息」應用程式進入「閒置」狀態（傳入事件會停止，直到開啟/前景顯示該應用程式）。一個簡單的解決方法是使用 AppleScript + LaunchAgent 每 5 分鐘喚醒一次「訊息」。

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

注意事項：

- 這會在**每 300 秒**以及**登入時**執行。
- 首次執行可能會觸發 macOS **自動化** 提示（`osascript` → 訊息）。請在執行 LaunchAgent 的同一使用者工作階段中核准這些提示。

載入它：

```bash
launchctl unload ~/Library/LaunchAgents/com.user.poke-messages.plist 2>/dev/null || true
launchctl load ~/Library/LaunchAgents/com.user.poke-messages.plist
```

## 入門

BlueBubbles 可在互動式引導中使用：

```
openclaw onboard
```

精靈會提示輸入：

- **伺服器網址**（必填）：BlueBubbles 伺服器位址（例如，`http://192.168.1.100:1234`）
- **Password** (required): API password from BlueBubbles Server settings
- **Webhook 路徑**（選填）：預設為 `/bluebubbles-webhook`
- **私訊政策**：配對、允許清單、開放或已停用
- **允許清單**：電話號碼、電子郵件或聊天目標

您也可以透過 CLI 新增 BlueBubbles：

```
openclaw channels add bluebubbles --http-url http://192.168.1.100:1234 --password <password>
```

## 存取控制（私訊 + 群組）

DMs：

- 預設：`channels.bluebubbles.dmPolicy = "pairing"`。
- 未知發送者會收到配對碼；訊息在獲得批准前將被忽略（配對碼於 1 小時後過期）。
- 透過以下方式批准：
  - `openclaw pairing list bluebubbles`
  - `openclaw pairing approve bluebubbles <CODE>`
- 配對是預設的權杖交換方式。詳細資訊：[配對](/zh-Hant/channels/pairing)

群組：

- `channels.bluebubbles.groupPolicy = open | allowlist | disabled` (預設：`allowlist`)。
- `channels.bluebubbles.groupAllowFrom` 控制當設定 `allowlist` 時誰可以在群組中觸發。

### 提及控制（群組）

BlueBubbles 支援群組聊天的提及控管，符合 iMessage/WhatsApp 的行為：

- 使用 `agents.list[].groupChat.mentionPatterns`（或 `messages.groupChat.mentionPatterns`）來偵測提及。
- 當 `requireMention` 為群組啟用時，代理程式僅在被提及時回應。
- 來自已授權發送者的控制命令會跳過提及門控。

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
- 使用 `allowFrom` 和 `groupAllowFrom` 來確定命令授權。
- 獲授權的傳送者即使在群組中未提及也能執行控制指令。

## 輸入中 + 已讀回執

- **輸入指示器**：在回應生成之前和期間自動發送。
- **讀取回執**：由 `channels.bluebubbles.sendReadReceipts` 控制（預設值：`true`）。
- **輸入指示器**：OpenClaw 發送輸入開始事件；BlueBubbles 會在發送或逾時時自動清除輸入狀態（透過 DELETE 手動停止並不可靠）。

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

當在配置中啟用時，BlueBubbles 支援進階訊息操作：

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

可用操作：

- **react**: 新增/移除輕觸回應反應 (`messageId`, `emoji`, `remove`)
- **edit**: 編輯已發送的訊息 (`messageId`, `text`)
- **unsend**：取消傳送訊息 (`messageId`)
- **reply**: 回覆特定訊息 (`messageId`, `text`, `to`)
- **sendWithEffect**: 使用 iMessage 特效傳送 (`text`, `to`, `effectId`)
- **renameGroup**: 重新命名群組聊天 (`chatGuid`, `displayName`)
- **setGroupIcon**：設定群組聊天的圖示/相片 (`chatGuid`, `media`) — 在 macOS 26 Tahoe 上不穩定 (API 可能會傳回成功，但圖示不會同步)。
- **addParticipant**：將某人加入群組（`chatGuid`，`address`）
- **removeParticipant**：將某人從群組中移除 (`chatGuid`, `address`)
- **leaveGroup**: 離開群組聊天 (`chatGuid`)
- **sendAttachment**：傳送媒體/檔案 (`to`, `buffer`, `filename`, `asVoice`)
  - 語音備忘錄：設定 `asVoice: true` 搭配 **MP3** 或 **CAF** 音訊以 iMessage 語音訊息傳送。當傳送語音備忘錄時，BlueBubbles 會將 MP3 轉換為 CAF。

### 訊息 ID（簡略 vs 完整）

OpenClaw 可能會顯示 _短_ 訊息 ID（例如 `1`、`2`）以節省 token。

- `MessageSid` / `ReplyToId` 可以是短 ID。
- `MessageSidFull` / `ReplyToIdFull` 包含提供者的完整 ID。
- Short IDs 是記憶體內的；它們會在重新啟動或快取被清除時過期。
- 動作接受簡短或完整的 `messageId`，但如果簡短 ID 不再可用，則會報錯。

對於持續的自動化與儲存，請使用完整 ID：

- 範本：`{{MessageSidFull}}`、`{{ReplyToIdFull}}`
- Context: `MessageSidFull` / `ReplyToIdFull` 在輸入承載中

請參閱[設定](/zh-Hant/gateway/configuration)以取得樣板變數。

## 區塊串流

控制回應是以單則訊息發送，還是以區塊串流形式發送：

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
- 透過 `channels.bluebubbles.mediaMaxMb` 設定進出媒體的大小上限（預設：8 MB）。
- 輸出文字被分塊為 `channels.bluebubbles.textChunkLimit`（預設：4000 個字元）。

## 設定參考

完整配置：[Configuration](/zh-Hant/gateway/configuration)

提供者選項：

- `channels.bluebubbles.enabled`：啟用／停用頻道。
- `channels.bluebubbles.serverUrl`: BlueBubbles REST API 基礎 URL。
- `channels.bluebubbles.password`：API 密碼。
- `channels.bluebubbles.webhookPath`: Webhook 端點路徑（預設：`/bluebubbles-webhook`）。
- `channels.bluebubbles.dmPolicy`：`pairing | allowlist | open | disabled`（預設值：`pairing`）。
- `channels.bluebubbles.allowFrom`: DM 許可清單（handles、電子郵件、E.164 號碼、`chat_id:*`、`chat_guid:*`）。
- `channels.bluebubbles.groupPolicy`: `open | allowlist | disabled` (預設: `allowlist`)。
- `channels.bluebubbles.groupAllowFrom`: 群組發送者允許清單。
- `channels.bluebubbles.groups`：每個群組的設定（`requireMention` 等）。
- `channels.bluebubbles.sendReadReceipts`：發送已讀回執（預設值：`true`）。
- `channels.bluebubbles.blockStreaming`：啟用區塊串流（預設值：`false`；串流回覆所需）。
- `channels.bluebubbles.textChunkLimit`：出站區塊大小，以字元為單位（預設值：4000）。
- `channels.bluebubbles.chunkMode`: `length` (預設) 僅在超過 `textChunkLimit` 時分割；`newline` 會在空白行 (段落邊界) 先分割，再進行長度分塊。
- `channels.bluebubbles.mediaMaxMb`：入站/出站媒體大小上限（MB）（預設值：8）。
- `channels.bluebubbles.mediaLocalRoots`：針對外傳本地媒體路徑的明確允許清單，僅限於絕對本地目錄。除非進行此設定，否則預設會拒絕本地路徑傳送。個別帳號覆寫：`channels.bluebubbles.accounts.<accountId>.mediaLocalRoots`。
- `channels.bluebubbles.historyLimit`：用於上下文的群組訊息最大數量（0 表示停用）。
- `channels.bluebubbles.dmHistoryLimit`：私訊歷史記錄限制。
- `channels.bluebubbles.actions`：啟用/停用特定操作。
- `channels.bluebubbles.accounts`: 多帳號配置。

相關的全域選項：

- `agents.list[].groupChat.mentionPatterns` (或 `messages.groupChat.mentionPatterns`)。
- `messages.responsePrefix`。

## 地址 / 傳遞目標

為了穩定的路由，建議使用 `chat_guid`：

- `chat_guid:iMessage;-;+15555550123` （群組建議使用）
- `chat_id:123`
- `chat_identifier:...`
- Direct handles: `+15555550123`, `user@example.com`
  - 如果直接 handle 沒有現有的 DM 聊天，OpenClaw 將透過 `POST /api/v1/chat/new` 建立一個。這需要啟用 BlueBubbles Private API。

## 安全性

- Webhook 請求通過將 `guid`/`password` 查詢參數或標頭與 `channels.bluebubbles.password` 進行比對來完成驗證。來自 `localhost` 的請求也會被接受。
- 請妥善保管 API 密碼與 Webhook 端點（將其視為憑證）。
- Localhost 信任意味著同主機的反向代理可以無意中繞過密碼。如果您代理了網關，請在代理層要求身份驗證並配置 `gateway.trustedProxies`。請參閱 [Gateway security](/zh-Hant/gateway/security#reverse-proxy-configuration)。
- 如果您將 BlueBubbles 伺服器暴露於區域網路之外，請在 BlueBubbles 伺服器上啟用 HTTPS + 防火牆規則。

## 疑難排解

- 如果打字/讀取事件停止運作，請檢查 BlueBubbles webhook 日誌，並確認閘道路徑符合 `channels.bluebubbles.webhookPath`。
- 配對代碼會在一小時後過期；請使用 `openclaw pairing list bluebubbles` 和 `openclaw pairing approve bluebubbles <code>`。
- 反應需要 BlueBubbles 私有 API (`POST /api/v1/message/react`)；請確保伺服器版本已將其公開。
- 編輯/取消發送需要 macOS 13+ 和相容的 BlueBubbles 伺服器版本。在 macOS 26 (Tahoe) 上，由於私有 API 變更，編輯功能目前無法使用。
- 在 macOS 26 (Tahoe) 上，群組圖示更新可能不穩定：API 可能會傳回成功，但新圖示並未同步。
- OpenClaw 會根據 BlueBubbles 伺服器的 macOS 版本自動隱藏已知有問題的操作。如果在 macOS 26 (Tahoe) 上仍然顯示編輯功能，請使用 `channels.bluebubbles.actions.edit=false` 手動停用它。
- 如需狀態/健康資訊：`openclaw status --all` 或 `openclaw status --deep`。

如需一般頻道工作流程參考，請參閱 [頻道](/zh-Hant/channels) 和 [外掛程式](/zh-Hant/tools/plugin) 指南。

import footerZhHant from "/components/footer/zh-Hant.mdx";

<footerZhHant />
