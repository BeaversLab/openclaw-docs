---
summary: "透過 BlueBubbles macOS 伺服器傳送 iMessage（REST 傳送/接收、輸入指示、反應、配對、進階操作）。"
read_when:
  - Setting up BlueBubbles channel
  - Troubleshooting webhook pairing
  - Configuring iMessage on macOS
title: "BlueBubbles"
---

# BlueBubbles (macOS REST)

狀態：內建外掛，透過 HTTP 與 BlueBubbles macOS 伺服器通訊。由於其 API 豐富且設定比舊版 imsg 頻道簡單，**建議用於 iMessage 整合**。

## 內建外掛

目前的 OpenClaw 發行版本已內建 BlueBubbles，因此一般的套件組建版本
不需要單獨進行 `openclaw plugins install` 步驟。

## 概覽

- 透過 BlueBubbles 助理應用程式在 macOS 上執行（[bluebubbles.app](https://bluebubbles.app)）。
- 推薦/已測試：macOS Sequoia (15)。macOS Tahoe (26) 可用；目前在 Tahoe 上編輯功能有問題，且群組圖示更新可能回報成功但未同步。
- OpenClaw 透過其 REST API 與其對話（`GET /api/v1/ping`、`POST /message/text`、`POST /chat/:id/*`）。
- 傳入訊息透過 webhooks 抵達；傳出回覆、輸入指示器、已讀回執和點回是 REST 呼叫。
- 附件和貼圖會作為傳入媒體匯入（並在可能時顯示給代理程式）。
- 配對/許可清單的運作方式與其他頻道相同（`/channels/pairing` 等），並搭配 `channels.bluebubbles.allowFrom` 和配對碼。
- 反應會像 Slack/Telegram 一樣作為系統事件呈現，以便代理人在回覆前「提及」它們。
- 進階功能：編輯、取消傳送、回覆串接、訊息特效、群組管理。

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

安全性提醒：

- 務必設定 webhook 密碼。
- 始終需要 Webhook 驗證。除非 BlueBubbles webhook 要求包含符合 `channels.bluebubbles.password` 的密碼/guid（例如 `?password=<password>` 或 `x-password`），否則 OpenClaw 會拒絕該要求，無論迴路/代理拓撲為何。
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
- 第一次執行可能會觸發 macOS **自動化** 提示（`osascript` → 訊息）。請在執行 LaunchAgent 的相同使用者工作階段中核准它們。

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

- **伺服器網址**（必填）：BlueBubbles 伺服器位址（例如 `http://192.168.1.100:1234`）
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

- 預設值：`channels.bluebubbles.dmPolicy = "pairing"`。
- 未知發送者會收到配對碼；訊息會被忽略直到核准為止 (配對碼在 1 小時後過期)。
- 透過以下方式核准：
  - `openclaw pairing list bluebubbles`
  - `openclaw pairing approve bluebubbles <CODE>`
- 配對是預設的權杖交換方式。詳細資訊：[配對](/zh-Hant/channels/pairing)

群組：

- `channels.bluebubbles.groupPolicy = open | allowlist | disabled`（預設值：`allowlist`）。
- 當設定 `allowlist` 時，`channels.bluebubbles.groupAllowFrom` 控制誰可以在群組中觸發。

### 聯絡人名稱充實（macOS，選用）

BlueBubbles 群組 webhook 通常僅包含原始的參與者地址。如果您希望 `GroupMembers` 語境改為顯示本機聯絡人名稱，您可以選擇在 macOS 上啟用本機聯絡人增強功能：

- `channels.bluebubbles.enrichGroupParticipantsFromContacts = true` 啟用查找。預設值：`false`。
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

- 使用 `agents.list[].groupChat.mentionPatterns` (或 `messages.groupChat.mentionPatterns`) 來偵測提及。
- 當為群組啟用 `requireMention` 時，Agent 僅在被提及時回應。
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
- 使用 `allowFrom` 和 `groupAllowFrom` 來決定指令授權。
- 授權的發送者即使在群組中未提及也可以執行控制命令。

### 各群組系統提示詞

`channels.bluebubbles.groups.*` 下的每個條目都接受一個可選的 `systemPrompt` 字串。該值會在每一次處理該群組訊息時被注入到 Agent 的系統提示詞中，因此您可以設定各群組的角色或行為規則，而無需編輯 Agent 的提示詞：

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

索引鍵會與 BlueBubbles 回報的群組 `chatGuid` / `chatIdentifier` / 數字 `chatId` 相匹配，而 `"*"` 萬用字元條目會為所有沒有完全匹配的群組提供預設值 (此模式也用於 `requireMention` 和各群組工具政策)。完全匹配的優先順序高於萬用字元。DM (私人訊息) 會忽略此欄位；請改用 Agent 層級或帳號層級的提示詞自訂。

#### 實作範例：執行緒回覆和輕拍回應 (Private API)

啟用 BlueBubbles Private API 後，傳入的訊息會帶有短訊息 ID (例如 `[[reply_to:5]]`)，Agent 可以呼叫 `action=reply` 以回覆特定訊息，或呼叫 `action=react` 來發送輕拍回應。各群組的 `systemPrompt` 是確保 Agent 選擇正確工具的可靠方式：

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

輕拍回應和執行緒回覆都需要 BlueBubbles Private API；請參閱 [進階動作](#advanced-actions) 和 [訊息 ID](#message-ids-short-vs-full) 以了解底層機制。

## ACP 對話綁定

BlueBubbles 聊天可以轉換為持久的 ACP 工作區，而無需更改傳輸層。

快速操作員流程：

- 在 DM 或允許的群組聊天中運行 `/acp spawn codex --bind here`。
- 該 BlueBubbles 對話中的未來訊息將路由到生成的 ACP 會話。
- `/new` 和 `/reset` 就地重置同一個綁定的 ACP 會話。
- `/acp close` 關閉 ACP 會話並移除綁定。

還支持通過頂層 `bindings[]` 條目配置持久綁定，其中包含 `type: "acp"` 和 `match.channel: "bluebubbles"`。

`match.peer.id` 可以使用任何支持的 BlueBubbles 目標形式：

- 標準化的 DM 處理程序，例如 `+15555550123` 或 `user@example.com`
- `chat_id:<id>`
- `chat_guid:<guid>`
- `chat_identifier:<identifier>`

對於穩定的群組綁定，優先使用 `chat_id:*` 或 `chat_identifier:*`。

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

有關共享 ACP 綁定行為，請參閱 [ACP Agents](/zh-Hant/tools/acp-agents)。

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

- **react**：新增/移除輕觸回應（`messageId`、`emoji`、`remove`）
- **edit**：編輯已發送的訊息（`messageId`、`text`）
- **unsend**：取消發送訊息（`messageId`）
- **reply**：回覆特定訊息（`messageId`、`text`、`to`）
- **sendWithEffect**：發送時帶有 iMessage 特效（`text`、`to`、`effectId`）
- **renameGroup**：重新命名群組聊天 (`chatGuid`, `displayName`)
- **setGroupIcon**：設定群組聊天的圖示/照片 (`chatGuid`, `media`) — 在 macOS 26 Tahoe 上不穩定 (API 可能會回傳成功，但圖示不會同步)。
- **addParticipant**：將某人加入群組 (`chatGuid`, `address`)
- **removeParticipant**：將某人從群組中移除 (`chatGuid`, `address`)
- **leaveGroup**：離開群組聊天 (`chatGuid`)
- **upload-file**：傳送媒體/檔案 (`to`, `buffer`, `filename`, `asVoice`)
  - 語音備忘錄：設定 `asVoice: true` 為 **MP3** 或 **CAF** 音訊，以 iMessage 語音訊息的形式傳送。BlueBubbles 在傳送語音備忘錄時會將 MP3 轉換為 CAF。
- 舊版別名：`sendAttachment` 仍然有效，但 `upload-file` 是正式的動作名稱。

### 訊息 ID (簡短 vs 完整)

OpenClaw 可能會顯示 _簡短_ 訊息 ID (例如 `1`, `2`) 以節省 tokens。

- `MessageSid` / `ReplyToId` 可以是簡短 ID。
- `MessageSidFull` / `ReplyToIdFull` 包含提供者的完整 ID。
- 簡短 ID 僅儲存在記憶體中；它們可能會在重啟或快取被清除時過期。
- 動作接受簡短或完整的 `messageId`，但如果簡短 ID 不再可用，則會報錯。

針對持久的自動化和儲存，請使用完整 ID：

- 範本：`{{MessageSidFull}}`, `{{ReplyToIdFull}}`
- 內容：傳入負載中的 `MessageSidFull` / `ReplyToIdFull`

關於範本變數，請參閱 [組態](/zh-Hant/gateway/configuration)。

## 區塊串流

控制回應是作為單一訊息傳送，還是分成區塊串流傳送：

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

- 傳入的附件會下載並儲存在媒體快取中。
- 透過 `channels.bluebubbles.mediaMaxMb` 設定傳入及傳出媒體的大小上限 (預設：8 MB)。
- 外發文字會被分塊至 `channels.bluebubbles.textChunkLimit`（預設：4000 個字元）。

## 配置參考

完整配置：[Configuration](/zh-Hant/gateway/configuration)

提供者選項：

- `channels.bluebubbles.enabled`：啟用/停用頻道。
- `channels.bluebubbles.serverUrl`：BlueBubbles REST API 基礎 URL。
- `channels.bluebubbles.password`：API 密碼。
- `channels.bluebubbles.webhookPath`：Webhook 端點路徑（預設：`/bluebubbles-webhook`）。
- `channels.bluebubbles.dmPolicy`：`pairing | allowlist | open | disabled`（預設：`pairing`）。
- `channels.bluebubbles.allowFrom`：DM 許可清單（handles、電子郵件、E.164 號碼、`chat_id:*`、`chat_guid:*`）。
- `channels.bluebubbles.groupPolicy`：`open | allowlist | disabled`（預設：`allowlist`）。
- `channels.bluebubbles.groupAllowFrom`：群組發送者許可清單。
- `channels.bluebubbles.enrichGroupParticipantsFromContacts`：在 macOS 上，通過閘檢查後，可選地從本機聯絡人豐富未命名的群組參與者。預設：`false`。
- `channels.bluebubbles.groups`：每群組配置（`requireMention` 等）。
- `channels.bluebubbles.sendReadReceipts`：發送已讀回執（預設：`true`）。
- `channels.bluebubbles.blockStreaming`：啟用區塊串流（預設：`false`；串流回覆所需）。
- `channels.bluebubbles.textChunkLimit`：外發區塊大小（以字元為單位，預設：4000）。
- `channels.bluebubbles.sendTimeoutMs`：透過 `/api/v1/message/text` 發送外發文字的每次請求逾時間（以毫秒為單位，預設：30000）。在 macOS 26 設定上提高此值，因為 Private API iMessage 發送可能會在 iMessage 框架內停滯 60 秒以上；例如 `45000` 或 `60000`。探測、聊天查詢、反應、編輯和健康檢查目前保持較短的 10 秒預設值；計劃作為後續工作擴大對反應和編輯的涵蓋範圍。每帳號覆寫：`channels.bluebubbles.accounts.<accountId>.sendTimeoutMs`。
- `channels.bluebubbles.chunkMode`: `length` (預設) 僅在超過 `textChunkLimit` 時分割；`newline` 在進行長度分塊前於空白行（段落邊界）分割。
- `channels.bluebubbles.mediaMaxMb`: 進出站媒體容量上限，單位為 MB (預設：8)。
- `channels.bluebubbles.mediaLocalRoots`: 允許用於發送本地媒體路徑的絕對本地目錄明確白名單。除非配置此項，否則預設拒絕本地路徑發送。帳號覆寫：`channels.bluebubbles.accounts.<accountId>.mediaLocalRoots`。
- `channels.bluebubbles.historyLimit`: 用於背景的群組訊息最大數量 (0 表示停用)。
- `channels.bluebubbles.dmHistoryLimit`: DM (私人訊息) 歷史記錄限制。
- `channels.bluebubbles.actions`: 啟用/停用特定操作。
- `channels.bluebubbles.accounts`: 多帳號配置。

相關全域選項：

- `agents.list[].groupChat.mentionPatterns` (或 `messages.groupChat.mentionPatterns`)。
- `messages.responsePrefix`。

## 定址 / 傳送目標

建議優先使用 `chat_guid` 以進行穩定的路由：

- `chat_guid:iMessage;-;+15555550123` (建議用於群組)
- `chat_id:123`
- `chat_identifier:...`
- 直接處理標識：`+15555550123`, `user@example.com`
  - 如果直接處理標識沒有既存的 DM 聊天，OpenClaw 將透過 `POST /api/v1/chat/new` 建立一個。這需要啟用 BlueBubbles Private API。

## 安全性

- 透過比對 `guid`/`password` 查詢參數或標頭與 `channels.bluebubbles.password` 來驗證 Webhook 請求。
- 請妥善保管 API 密碼和 webhook 端點 (將其視為憑證對待)。
- BlueBubbles webhook 驗證沒有 localhost 繞過機制。如果您代理 webhook 流量，請在請求中端對端保留 BlueBubbles 密碼。此處 `gateway.trustedProxies` 不會取代 `channels.bluebubbles.password`。請參閱 [Gateway security](/zh-Hant/gateway/security#reverse-proxy-configuration)。
- 若在區域網路 (LAN) 外暴露 BlueBubbles 伺服器，請啟用 HTTPS + 防火牆規則。

## 故障排除

- 如果輸入/已讀事件停止運作，請檢查 BlueBubbles webhook 日誌並確認閘道路徑符合 `channels.bluebubbles.webhookPath`。
- 配對碼會在一小時後過期；請使用 `openclaw pairing list bluebubbles` 和 `openclaw pairing approve bluebubbles <code>`。
- 反應需要 BlueBubbles 私有 API (`POST /api/v1/message/react`)；請確保伺服器版本有將其開放。
- 編輯/取消傳送需要 macOS 13+ 和相容的 BlueBubbles 伺服器版本。在 macOS 26 (Tahoe) 上，由於私有 API 變更，編輯功能目前無法使用。
- 群組圖示更新在 macOS 26 (Tahoe) 上可能不穩定：API 可能會回傳成功，但新圖示並未同步。
- OpenClaw 會根據 BlueBubbles 伺服器的 macOS 版本自動隱藏已知無效的操作。如果在 macOS 26 (Tahoe) 上仍然顯示編輯選項，請使用 `channels.bluebubbles.actions.edit=false` 手動停用。
- 若要取得狀態/健康狀態資訊：`openclaw status --all` 或 `openclaw status --deep`。

如需一般頻道工作流程參考，請參閱 [Channels](/zh-Hant/channels) 和 [Plugins](/zh-Hant/tools/plugin) 指南。

## 相關

- [Channels Overview](/zh-Hant/channels) — 所有支援的頻道
- [Pairing](/zh-Hant/channels/pairing) — DM 驗證與配對流程
- [Groups](/zh-Hant/channels/groups) — 群組聊天行為與提及控制
- [Channel Routing](/zh-Hant/channels/channel-routing) — 訊息的會話路由
- [Security](/zh-Hant/gateway/security) — 存取模型與強化安全性
