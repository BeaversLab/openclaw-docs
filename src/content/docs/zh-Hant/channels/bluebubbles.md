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

## 內建外掛

目前的 OpenClaw 發行版本內建了 BlueBubbles，因此一般的打包版本不需要額外的 `openclaw plugins install` 步驟。

## 概覽

- 透過 BlueBubbles 輔助應用程式 ([bluebubbles.app](https://bluebubbles.app)) 在 macOS 上執行。
- 推薦/已測試：macOS Sequoia (15)。macOS Tahoe (26) 可用；目前在 Tahoe 上編輯功能有問題，且群組圖示更新可能回報成功但未同步。
- OpenClaw 透過其 REST API 與其通訊 (`GET /api/v1/ping`, `POST /message/text`, `POST /chat/:id/*`)。
- 傳入訊息透過 webhooks 抵達；傳出回覆、輸入指示器、已讀回執和點回是 REST 呼叫。
- 附件和貼圖會作為傳入媒體匯入（並在可能時顯示給代理程式）。
- 配對/許可清單的運作方式與其他頻道（`/channels/pairing` 等）相同，需使用 `channels.bluebubbles.allowFrom` + 配對碼。
- 反應會像 Slack/Telegram 一樣作為系統事件呈現，以便代理人在回覆前「提及」它們。
- 進階功能：編輯、取消傳送、回覆串接、訊息特效、群組管理。

## 快速開始

1. 在您的 Mac 上安裝 BlueBubbles 伺服器（請遵循 [bluebubbles.app/install](https://bluebubbles.app/install) 上的指示）。
2. 在 BlueBubbles 設定中，啟用 web API 並設定密碼。
3. 執行 `openclaw onboard` 並選擇 BlueBubbles，或手動進行設定：

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
- 始終需要 Webhook 驗證。除非 BlueBubbles webhook 請求包含符合 `channels.bluebubbles.password` 的密碼/guid（例如 `?password=<password>` 或 `x-password`），否則 OpenClaw 將拒絕該請求，無論 loopback/proxy 拓撲為何。
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
- 首次執行可能會觸發 macOS **Automation (自動化)** 權限提示 (`osascript` → 訊息)。請在執行 LaunchAgent 的同一個使用者工作階段中核准它們。

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

- **Server URL (伺服器網址)** (必要)：BlueBubbles 伺服器位址 (例如 `http://192.168.1.100:1234`)
- **Password (密碼)** (必要)：來自 BlueBubbles Server 設定的 API 密碼
- **Webhook path (Webhook 路徑)** (選用)：預設為 `/bluebubbles-webhook`
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
- 配對是預設的權杖交換。詳情：[配對](/en/channels/pairing)

群組：

- `channels.bluebubbles.groupPolicy = open | allowlist | disabled`（預設：`allowlist`）。
- 當設定了 `allowlist` 時，`channels.bluebubbles.groupAllowFrom` 控制誰可以在群組中觸發。

### 聯絡人名稱充實（macOS，選用）

BlueBubbles 群組網路掛鉤通常僅包含原始參與者地址。如果您希望 `GroupMembers` 上下文改為顯示本機聯絡人名稱，您可以選擇在 macOS 上啟用本機聯絡人充實：

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

- 使用 `agents.list[].groupChat.mentionPatterns` （或 `messages.groupChat.mentionPatterns` ）來偵測提及。
- 當為群組啟用 `requireMention` 時，代理僅在被提及時回應。
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

- 控制命令（例如 `/config` 、 `/model` ）需要授權。
- 使用 `allowFrom` 和 `groupAllowFrom` 來決定命令授權。
- 授權的發送者即使在群組中未提及也可以執行控制命令。

## ACP 對話綁定

BlueBubbles 聊天可以轉換為持久的 ACP 工作區，而無需更改傳輸層。

快速操作員流程：

- 在私訊或允許的群組聊天中執行 `/acp spawn codex --bind here`。
- 該 BlueBubbles 對話中的後續訊息將路由到生成的 ACP 會話。
- `/new` 和 `/reset` 會就地重置同一個綁定的 ACP 會話。
- `/acp close` 會關閉 ACP 會話並移除綁定。

還透過頂層 `bindings[]` 條目支援已配置的持久綁定，其中包含 `type: "acp"` 和 `match.channel: "bluebubbles"`。

`match.peer.id` 可以使用任何支援的 BlueBubbles 目標格式：

- 標準化的私訊句柄，例如 `+15555550123` 或 `user@example.com`
- `chat_id:<id>`
- `chat_guid:<guid>`
- `chat_identifier:<identifier>`

若要建立穩定的群組綁定，建議優先使用 `chat_id:*` 或 `chat_identifier:*`。

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

關於共用的 ACP 綁定行為，請參閱 [ACP Agents](/en/tools/acp-agents)。

## 輸入中 + 已讀回執

- **輸入指示器**：會在產生回應之前及期間自動發送。
- **已讀回執**：由 `channels.bluebubbles.sendReadReceipts` 控制（預設值：`true`）。
- **輸入指示器**：OpenClaw 會發送輸入開始事件；BlueBubbles 會在發送或逾時時自動清除輸入狀態（透過 DELETE 手動停止並不可靠）。

```json5
{
  channels: {
    bluebubbles: {
      sendReadReceipts: false, // disable read receipts
    },
  },
}
```

## 進階操作

若在設定中啟用，BlueBubbles 支援進階訊息操作：

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

- **react**：新增/移除點按反應 (`messageId`, `emoji`, `remove`)
- **edit**：編輯已傳送的訊息 (`messageId`, `text`)
- **unsend**：收回訊息 (`messageId`)
- **reply**：回覆特定訊息 (`messageId`, `text`, `to`)
- **sendWithEffect**：搭配 iMessage 特效傳送 (`text`, `to`, `effectId`)
- **renameGroup**：重新命名群組聊天 (`chatGuid`, `displayName`)
- **setGroupIcon**：設定群組聊天的圖示/照片 (`chatGuid`, `media`) — 在 macOS 26 Tahoe 上不穩定 (API 可能會傳回成功，但圖示未同步)。
- **addParticipant**：將某人新增至群組 (`chatGuid`, `address`)
- **removeParticipant**：將某人從群組中移除 (`chatGuid`, `address`)
- **leaveGroup**：離開群組聊天 (`chatGuid`)
- **upload-file**：傳送媒體/檔案 (`to`, `buffer`, `filename`, `asVoice`)
  - 語音備忘錄：將 `asVoice: true` 設定為 **MP3** 或 **CAF** 音訊以作為 iMessage 語音訊息傳送。BlueBubbles 會在傳送語音備忘錄時將 MP3 轉換為 CAF。
- 舊版別名：`sendAttachment` 仍然有效，但 `upload-file` 是標準的動作名稱。

### 訊息 ID（短格式與完整格式）

OpenClaw 可能會提供「短」訊息 ID（例如 `1`、`2`）以節省 tokens。

- `MessageSid` / `ReplyToId` 可以是短 ID。
- `MessageSidFull` / `ReplyToIdFull` 包含提供者的完整 ID。
- 短 ID 儲存在記憶體中；它們可能會在重啟或快取清除時過期。
- 動作接受短格式或完整的 `messageId`，但如果短 ID 不再可用，將會報錯。

對於持久化的自動化操作和儲存，請使用完整 ID：

- 範本：`{{MessageSidFull}}`、`{{ReplyToIdFull}}`
- 上下文：傳入負載中的 `MessageSidFull` / `ReplyToIdFull`

請參閱 [Configuration](/en/gateway/configuration) 以了解模板變數。

## 區塊串流

控制回應是作為單一訊息發送還是以區塊串流發送：

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
- 透過 `channels.bluebubbles.mediaMaxMb` 設定傳入和傳出媒體的大小上限（預設：8 MB）。
- 傳出文字會被分塊至 `channels.bluebubbles.textChunkLimit`（預設：4000 個字元）。

## 組態參考

完整組態：[Configuration](/en/gateway/configuration)

提供者選項：

- `channels.bluebubbles.enabled`：啟用/停用頻道。
- `channels.bluebubbles.serverUrl`：BlueBubbles REST API 的基礎 URL。
- `channels.bluebubbles.password`：API 密碼。
- `channels.bluebubbles.webhookPath`：Webhook 端點路徑（預設：`/bluebubbles-webhook`）。
- `channels.bluebubbles.dmPolicy`: `pairing | allowlist | open | disabled` (預設：`pairing`)。
- `channels.bluebubbles.allowFrom`: DM 允許清單 (handles、電子郵件、E.164 號碼、`chat_id:*`、`chat_guid:*`)。
- `channels.bluebubbles.groupPolicy`: `open | allowlist | disabled` (預設：`allowlist`)。
- `channels.bluebubbles.groupAllowFrom`: 群組發送者允許清單。
- `channels.bluebubbles.enrichGroupParticipantsFromContacts`: 在 macOS 上，通過檢查後可選擇從本機聯絡人中充實未命名的群組參與者。預設：`false`。
- `channels.bluebubbles.groups`: 每個群組的設定 (`requireMention` 等)。
- `channels.bluebubbles.sendReadReceipts`: 發送已讀回執 (預設：`true`)。
- `channels.bluebubbles.blockStreaming`：啟用區塊串流（預設值：`false`；串流回覆所必需）。
- `channels.bluebubbles.textChunkLimit`：出塊大小，以字元為單位（預設值：4000）。
- `channels.bluebubbles.chunkMode`：`length`（預設值）僅在超過 `textChunkLimit` 時分割；`newline` 在進行長度分割前於空行（段落邊界）處分割。
- `channels.bluebubbles.mediaMaxMb`：入站/出站媒體大小上限，單位為 MB（預設值：8）。
- `channels.bluebubbles.mediaLocalRoots`：允許用於出站本地媒體路徑的絕對本地目錄明確允許清單。除非進行此配置，否則預設拒絕發送本地路徑。帳戶級別覆寫：`channels.bluebubbles.accounts.<accountId>.mediaLocalRoots`。
- `channels.bluebubbles.historyLimit`：用於上下文的最大群組訊息數（設為 0 表示停用）。
- `channels.bluebubbles.dmHistoryLimit`：DM 歷史記錄限制。
- `channels.bluebubbles.actions`：啟用/停用特定動作。
- `channels.bluebubbles.accounts`：多帳號設定。

相關的全域選項：

- `agents.list[].groupChat.mentionPatterns`（或 `messages.groupChat.mentionPatterns`）。
- `messages.responsePrefix`。

## 定址 / 傳送目標

建議優先使用 `chat_guid` 以獲得穩定的路由：

- `chat_guid:iMessage;-;+15555550123`（群組建議使用）
- `chat_id:123`
- `chat_identifier:...`
- 直接位址：`+15555550123`、`user@example.com`
  - 如果直接位址沒有現有的 DM 聊天，OpenClaw 將透過 `POST /api/v1/chat/new` 建立一個。這需要啟用 BlueBubbles Private API。

## 安全性

- Webhook 請求通過將 `guid`/`password` 查詢參數或標頭與 `channels.bluebubbles.password` 進行比較來進行驗證。
- 請妥善保管 API 密碼和 webhook 端點（將其視為憑證）。
- BlueBubbles webhook 驗證沒有 localhost 繞過機制。如果您代理 webhook 流量，請在請求中端對端保留 BlueBubbles 密碼。`gateway.trustedProxies` 不會在此取代 `channels.bluebubbles.password`。參閱 [閘道安全](/en/gateway/security#reverse-proxy-configuration)。
- 如果將 BlueBubbles 伺服器暴露在區域網路（LAN）之外，請在伺服器上啟用 HTTPS 和防火牆規則。

## 疑難排解

- 如果輸入/已讀事件停止運作，請檢查 BlueBubbles webhook 記錄並驗證閘道路徑是否符合 `channels.bluebubbles.webhookPath`。
- 配對碼在一小時後過期；使用 `openclaw pairing list bluebubbles` 和 `openclaw pairing approve bluebubbles <code>`。
- 反應需要 BlueBubbles 私有 API (`POST /api/v1/message/react`)；請確保伺服器版本已開啟。
- 編輯/取消發送需要 macOS 13+ 和相容的 BlueBubbles 伺服器版本。在 macOS 26 (Tahoe) 上，由於私有 API 變更，編輯功能目前無法使用。
- 在 macOS 26 (Tahoe) 上，群組圖示更新可能不穩定：API 可能會回傳成功，但新圖示並未同步。
- OpenClaw 會根據 BlueBubbles 伺服器的 macOS 版本自動隱藏已知損壞的操作。如果在 macOS 26 (Tahoe) 上仍然顯示編輯選項，請使用 `channels.bluebubbles.actions.edit=false` 手動停用它。
- 若要查看狀態/健康資訊：`openclaw status --all` 或 `openclaw status --deep`。

如需一般頻道工作流程參考，請參閱 [頻道](/en/channels) 和 [外掛程式](/en/tools/plugin) 指南。

## 相關

- [頻道概覽](/en/channels) — 所有支援的頻道
- [配對](/en/channels/pairing) — 私訊驗證和配對流程
- [群組](/en/channels/groups) — 群組聊天行為和提及控管
- [頻道路由](/en/channels/channel-routing) — 訊息的會話路由
- [安全性](/en/gateway/security) — 存取模型和防護
