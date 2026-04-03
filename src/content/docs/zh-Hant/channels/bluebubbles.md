---
summary: "透過 BlueBubbles macOS 伺服器實現 iMessage（REST 傳送/接收、輸入中、反應、配對、進階操作）。"
read_when:
  - Setting up BlueBubbles channel
  - Troubleshooting webhook pairing
  - Configuring iMessage on macOS
title: "BlueBubbles"
---

# BlueBubbles (macOS REST)

狀態：內建外掛，透過 HTTP 與 BlueBubbles macOS 伺服器通訊。由於其 API 豐富且設定比舊版 imsg 頻道簡單，**建議用於 iMessage 整合**。

## 概覽

- 透過 BlueBubbles 助理應用程式在 macOS 上執行（[bluebubbles.app](https://bluebubbles.app)）。
- 建議/測試版本：macOS Sequoia (15)。macOS Tahoe (26) 也可運作；目前在 Tahoe 上編輯功能有問題，且群組圖示更新可能回報成功但未同步。
- OpenClaw 透過其 REST API 與其通訊 (`GET /api/v1/ping`, `POST /message/text`, `POST /chat/:id/*`)。
- 傳入訊息透過 webhooks 到達；傳出回覆、輸入指示器、已讀回執和輕拍回應則為 REST 呼叫。
- 附件和貼圖會作為傳入媒體被攝入（並在可能時顯示給代理程式）。
- 配對/允許清單的運作方式與其他頻道相同（`/channels/pairing` 等），結合 `channels.bluebubbles.allowFrom` + 配對碼。
- 反應會像 Slack/Telegram 一樣顯示為系統事件，因此代理程式可以在回覆前「提及」它們。
- 進階功能：編輯、取消傳送、回覆串、訊息效果、群組管理。

## 快速開始

1. 在您的 Mac 上安裝 BlueBubbles 伺服器（請遵循 [bluebubbles.app/install](https://bluebubbles.app/install) 上的指示）。
2. 在 BlueBubbles 設定中，啟用 web API 並設定密碼。
3. 執行 `openclaw onboard` 並選擇 BlueBubbles，或手動設定：

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

安全提示：

- 務必設定 webhook 密碼。
- Webhook 認證始終是必需的。除非 BlueBubbles webhook 請求包含與 `channels.bluebubbles.password` 匹配的密碼/guid（例如 `?password=<password>` 或 `x-password`），否則 OpenClaw 會拒絕這些請求，無論回環/代理拓撲如何。
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
- 首次執行可能會觸發 macOS **Automation** 提示（`osascript` → Messages）。請在執行 LaunchAgent 的同一使用者工作階段中批准這些提示。

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

- **Server URL**（必填）：BlueBubbles 伺服器位址（例如 `http://192.168.1.100:1234`）
- **密碼**（必填）：來自 BlueBubbles 伺服器設定的 API 密碼
- **Webhook path**（選填）：預設為 `/bluebubbles-webhook`
- **私訊政策**：配對、允許清單、開放或停用
- **允許清單**：電話號碼、電子郵件或聊天目標

您也可以透過 CLI 新增 BlueBubbles：

```
openclaw channels add bluebubbles --http-url http://192.168.1.100:1234 --password <password>
```

## 存取控制（私訊 + 群組）

私訊：

- 預設值：`channels.bluebubbles.dmPolicy = "pairing"`。
- 未知發送者會收到配對碼；在獲得批准之前訊息會被忽略（配對碼於 1 小時後過期）。
- 透過以下方式批准：
  - `openclaw pairing list bluebubbles`
  - `openclaw pairing approve bluebubbles <CODE>`
- 配對是預設的 token 交換方式。詳情：[配對](/en/channels/pairing)

群組：

- `channels.bluebubbles.groupPolicy = open | allowlist | disabled` (預設值：`allowlist`)。
- `channels.bluebubbles.groupAllowFrom` 控制當 `allowlist` 被設定時，誰可以在群組中觸發。

### 聯絡人名稱豐富 (macOS，選用)

BlueBubbles 群組 webhook 通常僅包含原始參與者地址。如果您希望 `GroupMembers` 語境顯示本機聯絡人名稱，您可以選擇在 macOS 上啟用本機聯絡人豐富功能：

- `channels.bluebubbles.enrichGroupParticipantsFromContacts = true` 啟用查找。預設值：`false`。
- 查找僅在群組存取、指令授權和提及閘門允許訊息通過後執行。
- 僅未命名的電話參與者會被豐富。
- 若未找到本機相符項目，原始電話號碼將作為後備方案。

```json5
{
  channels: {
    bluebubbles: {
      enrichGroupParticipantsFromContacts: true,
    },
  },
}
```

### 提及閘門（群組）

BlueBubbles 支援群組聊天的提及閘門，符合 iMessage/WhatsApp 的行為：

- 使用 `agents.list[].groupChat.mentionPatterns`（或 `messages.groupChat.mentionPatterns`）來偵測提及。
- 當為群組啟用 `requireMention` 時，代理人僅在被提及時才會回應。
- 來自授權發送者的控制指令會略過提及閘門。

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

### 指令閘門

- 控制指令（例如 `/config`、`/model`）需要授權。
- 使用 `allowFrom` 和 `groupAllowFrom` 來決定指令授權。
- 授權發送者即使未在群組中提及，也可以執行控制指令。

## ACP 對話綁定

BlueBubbles 聊天可以轉換為持久的 ACP 工作空間，而無需更改傳輸層。

快速操作員流程：

- 在私訊或允許的群組聊天中執行 `/acp spawn codex --bind here`。
- 之後在同一個 BlueBubbles 對話中的訊息將路由到生成的 ACP 工作階段。
- `/new` 和 `/reset` 會就地重設同一個綁定的 ACP 工作階段。
- `/acp close` 會關閉 ACP 工作階段並移除綁定。

也支援通過頂層 `bindings[]` 項目配置具有 `type: "acp"` 和 `match.channel: "bluebubbles"` 的持久綁定。

`match.peer.id` 可以使用任何支援的 BlueBubbles 目標形式：

- 標準化的私訊代碼，例如 `+15555550123` 或 `user@example.com`
- `chat_id:<id>`
- `chat_guid:<guid>`
- `chat_identifier:<identifier>`

若要獲得穩定的群組綁定，請優先選擇 `chat_id:*` 或 `chat_identifier:*`。

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

請參閱 [ACP Agents](/en/tools/acp-agents) 以了解共享的 ACP 綁定行為。

## 輸入中 + 已讀回執

- **輸入中指示器**：會在生成回應之前及期間自動發送。
- **已讀回執**：由 `channels.bluebubbles.sendReadReceipts` 控制（預設值：`true`）。
- **輸入中指示器**：OpenClaw 會發送輸入開始事件；BlueBubbles 會在發送或逾時時自動清除輸入狀態（透過 DELETE 手動停止是不可靠的）。

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

- **react**: 新增/移除點回反應 (`messageId`, `emoji`, `remove`)
- **edit**: 編輯已發送的訊息 (`messageId`, `text`)
- **unsend**: 撤回訊息 (`messageId`)
- **reply**: 回覆特定訊息 (`messageId`, `text`, `to`)
- **sendWithEffect**: 發送時附帶 iMessage 特效 (`text`, `to`, `effectId`)
- **renameGroup**: 重新命名群組聊天 (`chatGuid`, `displayName`)
- **setGroupIcon**：設定群組聊天的圖示/照片 (`chatGuid`, `media`) — 在 macOS 26 Tahoe 上不穩定 (API 可能返回成功但圖示未同步)。
- **addParticipant**：將某人加入群組 (`chatGuid`, `address`)
- **removeParticipant**：將某人從群組中移除 (`chatGuid`, `address`)
- **leaveGroup**：離開群組聊天 (`chatGuid`)
- **upload-file**：傳送媒體/檔案 (`to`, `buffer`, `filename`, `asVoice`)
  - 語音備忘錄：將 `asVoice: true` 設定為 **MP3** 或 **CAF** 音訊，以 iMessage 語音訊息形式傳送。BlueBubbles 在傳送語音備忘錄時會將 MP3 轉換為 CAF。
- 舊版別名：`sendAttachment` 仍然有效，但 `upload-file` 是標準的動作名稱。

### 訊息 ID（簡短與完整）

OpenClaw 可能會顯示*簡短*訊息 ID（例如 `1`、`2`）以節省 token。

- `MessageSid` / `ReplyToId` 可以是簡短 ID。
- `MessageSidFull` / `ReplyToIdFull` 包含提供者的完整 ID。
- 簡短 ID 儲存在記憶體中；它們會在重新啟動或快取清除時過期。
- 動作接受簡短或完整的 `messageId`，但如果簡短 ID 已不再可用，則會報錯。

對於持久的自動化和儲存，請使用完整 ID：

- 範本：`{{MessageSidFull}}`、`{{ReplyToIdFull}}`
- 內容：入站負載中的 `MessageSidFull` / `ReplyToIdFull`

請參閱 [Configuration](/en/gateway/configuration) 以了解範本變數。

## 區塊串流

控制回應是以單一訊息傳送還是以區塊串流方式傳送：

```json5
{
  channels: {
    bluebubbles: {
      blockStreaming: true, // enable block streaming (off by default)
    },
  },
}
```

## 媒體與限制

- 傳入的附件會下載並儲存在媒體快取中。
- 透過 `channels.bluebubbles.mediaMaxMb` 設定傳入與傳出媒體的大小上限（預設：8 MB）。
- 傳出文字會分割成 `channels.bluebubbles.textChunkLimit`（預設：4000 個字元）。

## 設定參考

完整設定：[Configuration](/en/gateway/configuration)

提供者選項：

- `channels.bluebubbles.enabled`：啟用/停用頻道。
- `channels.bluebubbles.serverUrl`：BlueBubbles REST API 基礎 URL。
- `channels.bluebubbles.password`：API 密碼。
- `channels.bluebubbles.webhookPath`：Webhook 端點路徑（預設：`/bluebubbles-webhook`）。
- `channels.bluebubbles.dmPolicy`：`pairing | allowlist | open | disabled`（預設值：`pairing`）。
- `channels.bluebubbles.allowFrom`：私訊（DM）允許清單（handles、電子郵件、E.164 號碼、`chat_id:*`、`chat_guid:*`）。
- `channels.bluebubbles.groupPolicy`：`open | allowlist | disabled`（預設值：`allowlist`）。
- `channels.bluebubbles.groupAllowFrom`：群組發送者允許清單。
- `channels.bluebubbles.enrichGroupParticipantsFromContacts`：在 macOS 上，可選擇在通過閘道檢查後，從本機聯絡人填補未命名的群組參與者。預設值：`false`。
- `channels.bluebubbles.groups`：各群組設定（`requireMention` 等）。
- `channels.bluebubbles.sendReadReceipts`：發送已讀回執（預設值：`true`）。
- `channels.bluebubbles.blockStreaming`：啟用區塊串流（預設值：`false`；串流回覆所需）。
- `channels.bluebubbles.textChunkLimit`：出站區塊大小（字元，預設值：4000）。
- `channels.bluebubbles.chunkMode`：`length`（預設值）僅在超過 `textChunkLimit` 時分割；`newline` 會在長度分割前先依空行（段落邊界）分割。
- `channels.bluebubbles.mediaMaxMb`：入站/出站媒體容量上限（MB，預設值：8）。
- `channels.bluebubbles.mediaLocalRoots`：允許用於出站本機媒體路徑的絕對本機目錄明確允許清單。除非進行此設定，否則預設會拒絕本機路徑發送。每個帳號的覆寫設定：`channels.bluebubbles.accounts.<accountId>.mediaLocalRoots`。
- `channels.bluebubbles.historyLimit`：用於語境的群組訊息數量上限（0 表示停用）。
- `channels.bluebubbles.dmHistoryLimit`：私訊歷史記錄限制。
- `channels.bluebubbles.actions`：啟用/停用特定動作。
- `channels.bluebubbles.accounts`：多帳號設定。

相關的全域選項：

- `agents.list[].groupChat.mentionPatterns`（或 `messages.groupChat.mentionPatterns`）。
- `messages.responsePrefix`。

## 定址 / 傳送目標

為了穩定的路由，建議優先使用 `chat_guid`：

- `chat_guid:iMessage;-;+15555550123`（建議用於群組）
- `chat_id:123`
- `chat_identifier:...`
- 直接代碼：`+15555550123`、`user@example.com`
  - 如果直接代碼沒有現有的私訊對話，OpenClaw 將透過 `POST /api/v1/chat/new` 建立一個。這需要啟用 BlueBubbles Private API。

## 安全性

- Webhook 請求是透過將 `guid`/`password` 查詢參數或標頭與 `channels.bluebubbles.password` 進行比對來驗證的。來自 `localhost` 的請求也會被接受。
- 請妥善保管 API 密碼和 webhook 端點（將其視為憑證）。
- Localhost 信任意味著同主機的反向代理可能會在無意中繞過密碼。如果您代理了網關，請在代理層要求身份驗證並設定 `gateway.trustedProxies`。請參閱 [Gateway security](/en/gateway/security#reverse-proxy-configuration)。
- 如果您在區域網路 (LAN) 之外公開 BlueBubbles 伺服器，請啟用 HTTPS 和防火牆規則。

## 疑難排解

- 如果輸入/已讀事件停止運作，請檢查 BlueBubbles webhook 記錄並驗證網關路徑是否符合 `channels.bluebubbles.webhookPath`。
- 配對碼在一小時後過期；請使用 `openclaw pairing list bluebubbles` 和 `openclaw pairing approve bluebubbles <code>`。
- 反應需要 BlueBubbles 私有 API (`POST /api/v1/message/react`)；請確保伺服器版本已將其開放。
- 編輯/取消傳送需要 macOS 13+ 及相容的 BlueBubbles 伺服器版本。在 macOS 26 (Tahoe) 上，由於私有 API 變更，編輯功能目前無法使用。
- 群組圖示更新在 macOS 26 (Tahoe) 上可能不穩定：API 可能會傳回成功，但新圖示並未同步。
- OpenClaw 會根據 BlueBubbles 伺服器的 macOS 版本自動隱藏已知損壞的操作。如果在 macOS 26 (Tahoe) 上仍顯示編輯功能，請使用 `channels.bluebubbles.actions.edit=false` 手動停用。
- 若要查看狀態/健康狀況資訊：`openclaw status --all` 或 `openclaw status --deep`。

如需一般頻道工作流程參考，請參閱 [頻道](/en/channels) 與 [外掛程式](/en/tools/plugin) 指南。

## 相關

- [頻道總覽](/en/channels) — 所有支援的頻道
- [配對](/en/channels/pairing) — 私訊驗證與配對流程
- [群組](/en/channels/groups) — 群組聊天行為與提及控管
- [頻道路由](/en/channels/channel-routing) — 訊息的工作階段路由
- [安全性](/en/gateway/security) — 存取模型與加固
