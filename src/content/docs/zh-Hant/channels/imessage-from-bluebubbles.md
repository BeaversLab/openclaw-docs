---
summary: "將舊的 BlueBubbles 設定遷移至內建的 iMessage 外掛，而不會失去配對、允許清單或群組綁定。"
read_when:
  - Planning a move from BlueBubbles to the bundled iMessage plugin
  - Translating BlueBubbles config keys to iMessage equivalents
  - Verifying imsg before enabling the iMessage plugin
title: "從 BlueBubbles 遷移"
---

透過 JSON-RPC 驅動 [`steipete/imsg`](https://github.com/steipete/imsg)，內建的 `imessage` 外掛現在已達到與 BlueBubbles 相同的私有 API 表面（`react`、`edit`、`unsend`、`reply`、`sendWithEffect`、群組管理、附件）。如果您已經在安裝了 `imsg` 的 Mac 上執行，您可以捨棄 BlueBubbles 伺服器，讓外掛直接與 Messages.app 通訊。

BlueBubbles 支援已被移除。OpenClaw 僅透過 `imsg` 支援 iMessage。本指南用於將舊的 `channels.bluebubbles` 設定遷移至 `channels.imessage`；沒有其他支援的遷移途徑。

## 何時適合進行此遷移

- 您已經在登入 Messages.app 的同一台 Mac（或可透過 SSH 連線的 Mac）上執行 `imsg`。
- 您希望減少一個運作元件——不需要獨立的 BlueBubbles 伺服器、不需要進行驗證的 REST 端點、也不需要 webhook 管線。使用單一 CLI 二進位檔，取代伺服器 + 用戶端應用程式 + 助手程式。
- 您處於[受支援的 macOS / `imsg` 版本](/zh-Hant/channels/imessage#requirements-and-permissions-macos)，且私有 API 探測回報為 `available: true`。

## imsg 的作用

`imsg` 是一個用於 Messages 的本機 macOS CLI。OpenClaw 將 `imsg rpc` 作為子程序啟動，並透過 stdin/stdout 使用 JSON-RPC 通訊。沒有 HTTP 伺服器、webhook URL、背景常駐程式、啟動代理程式或需要開放的連接埠。

- 讀取操作來自 `~/Library/Messages/chat.db`，使用唯讀的 SQLite 控制代碼。
- 即時傳入的訊息來自 `imsg watch` / `watch.subscribe`，它會跟隨 `chat.db` 檔案系統事件，並以輪詢作為後備機制。
- 傳送操作使用 Messages.app 自動化來處理一般文字和檔案傳送。
- 進階動作使用 `imsg launch` 將 `imsg` 輔助程式注入到 Messages.app 中。這正是解鎖已讀回執、輸入指示器、豐富傳送、編輯、取消傳送、串聯回覆、輕觸回應和群組管理功能的原因。
- Linux 版本可以檢查複製的 `chat.db`，但無法傳送、監看即時 Mac 資料庫或驅動 Messages.app。對於 OpenClaw iMessage，請在已登入的 Mac 上執行 `imsg`，或透過 SSH 包裝器連接到該 Mac 來執行。

## 在您開始之前

1. 在執行 Messages.app 的 Mac 上安裝 `imsg`：

   ```bash
   brew install steipete/tap/imsg
   imsg --version
   imsg chats --limit 3
   ```

   如果 `imsg chats` 失敗並顯示 `unable to open database file`、空白輸出或 `authorization denied`，請授予終端機、編輯器、Node 程序、Gateway 服務或啟動 `imsg` 的 SSH 父程序「完全磁碟存取權」，然後重新開啟該父程序。

2. 在變更 OpenClaw 設定之前，請驗證讀取、監看、傳送和 RPC 介面：

   ```bash
   imsg chats --limit 10 --json | jq -s
   imsg history --chat-id 42 --limit 10 --attachments --json | jq -s
   imsg watch --chat-id 42 --reactions --json
   imsg send --chat-id 42 --text "OpenClaw imsg test"
   imsg rpc --help
   ```

   將 `42` 替換為來自 `imsg chats` 的真實聊天 ID。傳送需要 Messages.app 的自動化權限。如果 OpenClaw 將透過 SSH 執行，請透過 OpenClaw 將使用的同一個 SSH 包裝器或使用者內容來執行這些指令。

3. 當您需要進階動作時，請啟用私有 API 橋接器：

   ```bash
   imsg launch
   imsg status --json
   ```

   `imsg launch` 需要停用 SIP。基本的傳送、歷史記錄和監看功能不需要 `imsg launch` 即可運作；但進階動作則需要。

4. 透過 OpenClaw 驗證橋接器：

   ```bash
   openclaw channels status --probe
   ```

   您需要 `imessage.privateApi.available: true`。如果它回報 `false`，請先解決該問題 — 請參閱 [功能偵測](/zh-Hant/channels/imessage#private-api-actions)。

5. 擷取您的設定：

   ```bash
   cp ~/.openclaw/openclaw.json5 ~/.openclaw/openclaw.json5.bak
   ```

## 設定轉換

iMessage 和 BlueBubbles 共用許多通道層級的設定。變更的金鑰主要是傳輸方式（REST 伺服器 vs 本機 CLI）。行為金鑰（`dmPolicy`、`groupPolicy`、`allowFrom` 等）保持相同的意義。

| BlueBubbles                                                | 內建 iMessage                             | 註記                                                                                                                                                                                                                                                                                                                   |
| ---------------------------------------------------------- | ----------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `channels.bluebubbles.enabled`                             | `channels.imessage.enabled`               | 語意相同。                                                                                                                                                                                                                                                                                                             |
| `channels.bluebubbles.serverUrl`                           | _(已移除)_                                | 沒有 REST 伺服器——外掛程式會透過 stdio 產生 `imsg rpc`。                                                                                                                                                                                                                                                               |
| `channels.bluebubbles.password`                            | _(已移除)_                                | 不需要 webhook 驗證。                                                                                                                                                                                                                                                                                                  |
| _(隱含)_                                                   | `channels.imessage.cliPath`               | `imsg` 的路徑（預設 `imsg`）；若使用 SSH，請使用包裝腳本。                                                                                                                                                                                                                                                             |
| _(隱含)_                                                   | `channels.imessage.dbPath`                | 選用的 Messages.app `chat.db` 覆蓋值；若省略則自動偵測。                                                                                                                                                                                                                                                               |
| _(隱含)_                                                   | `channels.imessage.remoteHost`            | `host` 或 `user@host` —— 僅在 `cliPath` 是 SSH 包裝器且您想要透過 SCP 擷取附件時需要。                                                                                                                                                                                                                                 |
| `channels.bluebubbles.dmPolicy`                            | `channels.imessage.dmPolicy`              | 相同的值（`pairing` / `allowlist` / `open` / `disabled`）。                                                                                                                                                                                                                                                            |
| `channels.bluebubbles.allowFrom`                           | `channels.imessage.allowFrom`             | 配對批准是依據 handle 而非 token 延續的。                                                                                                                                                                                                                                                                              |
| `channels.bluebubbles.groupPolicy`                         | `channels.imessage.groupPolicy`           | 相同的值（`allowlist` / `open` / `disabled`）。                                                                                                                                                                                                                                                                        |
| `channels.bluebubbles.groupAllowFrom`                      | `channels.imessage.groupAllowFrom`        | 相同。                                                                                                                                                                                                                                                                                                                 |
| `channels.bluebubbles.groups`                              | `channels.imessage.groups`                | **請逐字複製此內容，包括任何 `groups: { "*": { ... } }` 萬用字元項目。** 每個群組的 `requireMention`、`tools`、`toolsBySender` 都會延續。若使用 `groupPolicy: "allowlist"`，空白或遺失的 `groups` 區塊會無聲地丟棄所有群組訊息——請參見下方的「Group registry footgun」。                                               |
| `channels.bluebubbles.sendReadReceipts`                    | `channels.imessage.sendReadReceipts`      | 預設 `true`。使用內建外掛程式時，此項僅在私有 API 探測啟動時觸發。                                                                                                                                                                                                                                                     |
| `channels.bluebubbles.includeAttachments`                  | `channels.imessage.includeAttachments`    | 形狀相同，**同樣預設關閉**。如果您之前在 BlueBubbles 上啟用了附件傳輸，您必須在 iMessage 區塊中明確重新設定——它不會自動帶入，在您設定之前，傳入的圖片/媒體將會被靜默丟棄，且不會出現任何 `Inbound message` 日誌行。                                                                                                    |
| `channels.bluebubbles.attachmentRoots`                     | `channels.imessage.attachmentRoots`       | 本機根路徑；相同的萬用字元規則。                                                                                                                                                                                                                                                                                       |
| _(不適用)_                                                 | `channels.imessage.remoteAttachmentRoots` | 僅當為 SCP 獲取設定了 `remoteHost` 時使用。                                                                                                                                                                                                                                                                            |
| `channels.bluebubbles.mediaMaxMb`                          | `channels.imessage.mediaMaxMb`            | iMessage 上預設為 16 MB（BlueBubbles 預設為 8 MB）。如果您想保持較低的限制，請明確設定。                                                                                                                                                                                                                               |
| `channels.bluebubbles.textChunkLimit`                      | `channels.imessage.textChunkLimit`        | 兩者預設均為 4000。                                                                                                                                                                                                                                                                                                    |
| `channels.bluebubbles.coalesceSameSenderDms`               | `channels.imessage.coalesceSameSenderDms` | 同樣的選用機制。僅限私訊（DM）——群組聊天在兩個通道上都保持每則訊息即時分發。啟用時，若未明確指定 `messages.inbound.byChannel.imessage`，會將預設的傳入防抖（debounce）放寬至 2500 毫秒。請參閱 [iMessage 文件 § 合併拆分發送的私訊](/zh-Hant/channels/imessage#coalescing-split-send-dms-command--url-in-one-composition)。 |
| `channels.bluebubbles.enrichGroupParticipantsFromContacts` | _(不適用)_                                | iMessage 已經從 `chat.db` 讀取發送者顯示名稱。                                                                                                                                                                                                                                                                         |
| `channels.bluebubbles.actions.*`                           | `channels.imessage.actions.*`             | 依動作切換：`reactions`、`edit`、`unsend`、`reply`、`sendWithEffect`、`renameGroup`、`setGroupIcon`、`addParticipant`、`removeParticipant`、`leaveGroup`、`sendAttachment`。                                                                                                                                           |

多帳號設定（`channels.bluebubbles.accounts.*`）會一對一轉換為 `channels.imessage.accounts.*`。

## 群組註冊表的陷阱

內建的 iMessage 外掛會連續執行**兩個**獨立的群組允許清單閘道。群組訊息必須通過這兩道閘道才能到達代理程式（agent）：

1. **Sender / chat-target allowlist** (`channels.imessage.groupAllowFrom`) — 由 `isAllowedIMessageSender` 檢查。根據發送者句柄、`chat_guid`、`chat_identifier` 或 `chat_id` 匹配傳入訊息。形狀與 BlueBubbles 相同。
2. **Group registry** (`channels.imessage.groups`) — 由來自 `inbound-processing.ts:199` 的 `resolveChannelGroupPolicy` 檢查。啟用 `groupPolicy: "allowlist"` 時，此閘門需要以下任一條件：
   - 一個 `groups: { "*": { ... } }` 萬用字元項目（設定 `allowAll = true`），或
   - 在 `groups` 下一個針對每個 `chat_id` 的明確項目。

如果閘門 1 通過但閘門 2 失敗，訊息將被丟棄。此外掛程式會發出兩個 `warn` 層級的訊號，因此在預設日誌層級下不再靜默無聲：

- 當設定 `groupPolicy: "allowlist"` 但 `channels.imessage.groups` 為空時（沒有 `"*"` 萬用字元，也沒有針對每個 `chat_id` 的項目），每個帳戶在啟動時會發出一次 `warn` — 在任何訊息到達之前觸發。
- 當執行期間首次丟棄特定群組時，會針對每個 `chat_id` 發出一次 `warn`，其中會註明 chat_id 以及需要加入到 `groups` 以允許該群組的確切金鑰。

DM 會繼續運作，因為它們走的是不同的程式碼路徑。

這是 BlueBubbles → 內建 iMessage 遷移中最常見的失敗模式：操作員複製了 `groupAllowFrom` 和 `groupPolicy`，但跳過了 `groups` 區塊，因為 BlueBubbles 的 `groups: { "*": { "requireMention": true } }` 看起來像是一個不相關的提及設定。實際上，它對於註冊表閘門是至關重要的。

在 `groupPolicy: "allowlist"` 後保持群組訊息流通的最低配置：

```json5
{
  channels: {
    imessage: {
      groupPolicy: "allowlist",
      groupAllowFrom: ["+15555550123", "chat_guid:any;-;..."],
      groups: {
        "*": { requireMention: true },
      },
    },
  },
}
```

當未設定任何提及模式時，`*` 下的 `requireMention: true` 是無害的：執行時會設定 `canDetectMention = false` 並在 `inbound-processing.ts:512` 處短路提及丟棄邏輯。當配置了提及模式 (`agents.list[].groupChat.mentionPatterns`) 時，它會如預期運作。

如果閘道記錄 `imessage: dropping group message from chat_id=<id>` 或啟動行 `imessage: groupPolicy="allowlist" but channels.imessage.groups is empty`，表示 gate 2 正在丟棄 — 請新增 `groups` 區塊。

## 逐步說明

1. 在現有的 BlueBubbles 區塊旁邊新增一個 iMessage 區塊。在新路徑驗證之前，請僅將舊區塊作為複製來源：

   ```json5
   {
     channels: {
       bluebubbles: {
         enabled: true,
         // ... existing config ...
       },
       imessage: {
         enabled: false, // turn on after the dry run below
         cliPath: "/opt/homebrew/bin/imsg",
         dmPolicy: "pairing",
         allowFrom: ["+15555550123"], // copy from bluebubbles.allowFrom
         groupPolicy: "allowlist",
         groupAllowFrom: [], // copy from bluebubbles.groupAllowFrom
         groups: { "*": { requireMention: true } }, // copy from bluebubbles.groups — silently drops groups if missing, see "Group registry footgun" above
         actions: {
           reactions: true,
           edit: true,
           unsend: true,
           reply: true,
           sendWithEffect: true,
           sendAttachment: true,
         },
       },
     },
   }
   ```

2. **試運行探測** — 啟動閘道並確認 iMessage 回報健康：

   ```bash
   openclaw gateway
   openclaw channels status
   openclaw channels status --probe   # expect imessage.privateApi.available: true
   ```

   由於 `imessage.enabled` 仍為 `false`，因此尚無傳入的 iMessage 流量被路由 — 但 `--probe` 會練習橋接，讓您在切換前就能發現權限/安裝問題。

3. **進行切換。** 移除 BlueBubbles 設定並在一次設定編輯中啟用 iMessage：

   ```json5
   {
     channels: {
       imessage: { enabled: true /* ... */ },
     },
   }
   ```

   重新啟動閘道。傳入的 iMessage 流量現今會透過內建外掛程式流動。

4. **驗證 DMs。** 傳送一則直接訊息給 Agent；確認回覆已送達。

5. **分別驗證群組。** DM 和群組採用不同的程式碼路徑 — DM 成功並不代表群組正在路由。在配對的群組聊天中傳送訊息給 Agent，並確認回覆已送達。如果群組變得沈默（無 Agent 回覆，無錯誤），請檢查閘道日誌中的 `imessage: dropping group message from chat_id=<id>` 或啟動 `imessage: groupPolicy="allowlist" but channels.imessage.groups is empty` 行 — 兩者都會在預設日誌層級觸發。如果出現任一項，表示您的 `groups` 區塊遺失或為空 — 請參閱上方的「群組註冊陷阱」。

6. **驗證動作介面** — 從配對的 DM 中，要求 Agent 回應、編輯、取消傳送、回覆、傳送照片，以及（在群組中）重新命名群組 / 新增或移除參與者。每個動作都應該會原生地出現在 Messages.app 中。如果任何動作拋出「iMessage `<action>` requires the imsg private API bridge」，請再次執行 `imsg launch` 並重新整理 `channels status --probe`。

7. 一旦驗證了 iMessage DM、群組和動作，請**移除 BlueBubbles 伺服器和設定**。OpenClaw 將不會使用 `channels.bluebubbles`。

## 動作一致性概覽

| 動作                                | 舊版 BlueBubbles                  | 內建 iMessage                                                                                                           |
| ----------------------------------- | --------------------------------- | ----------------------------------------------------------------------------------------------------------------------- |
| 傳送文字 / SMS 備援                 | ✅                                | ✅                                                                                                                      |
| 傳送媒體（照片、影片、檔案、語音）  | ✅                                | ✅                                                                                                                      |
| 執行緒回覆 (`reply_to_guid`)        | ✅                                | ✅ (closes [#51892](https://github.com/openclaw/openclaw/issues/51892))                                                 |
| Tapback (`react`)                   | ✅                                | ✅                                                                                                                      |
| 編輯 / 取消發送（macOS 13+ 接收者） | ✅                                | ✅                                                                                                                      |
| 傳送螢幕特效                        | ✅                                | ✅ (解決了部分 [#9394](https://github.com/openclaw/openclaw/issues/9394))                                               |
| 富文本粗體 / 斜體 / 底線 / 刪除線   | ✅                                | ✅（透過 attributedBody 進行類型執行格式化）                                                                            |
| 重新命名群組 / 設定群組圖示         | ✅                                | ✅                                                                                                                      |
| 新增 / 移除參與者，離開群組         | ✅                                | ✅                                                                                                                      |
| 已讀回執和輸入指示器                | ✅                                | ✅（取決於私有 API 偵測）                                                                                               |
| 相同發送者私人訊息合併              | ✅                                | ✅（僅限私人訊息；透過 `channels.imessage.coalesceSameSenderDms` 啟用）                                                 |
| 趕上在閘道關閉時接收到的傳入訊息    | ✅（webhook 重播 + 歷史紀錄擷取） | ✅（透過 `channels.imessage.catchup.enabled` 啟用；解決了 [#78649](https://github.com/openclaw/openclaw/issues/78649)） |

iMessage 趕上功能現已作為內建外掛的可選功能提供。在閘道啟動時，如果 `channels.imessage.catchup.enabled` 為 `true`，閘道會對 `imsg watch` 使用的同一個 JSON-RPC 客戶端執行一次 `chats.list` + 每個聊天 `messages.history` 通過，透過即時分派路徑（允�清單、群組原則、去抖動器、回聲快取）重放每個遺漏的傳入列，並持續保存每個帳戶的游標，以便後續啟動時從中斷處繼續。請參閱 [Catching up after gateway downtime](/zh-Hant/channels/imessage#catching-up-after-gateway-downtime) 以進行調整。

## 配對、工作階段和 ACP 綁定

- **配對核准** 會依照識別碼保留。您不需要重新核准已知發送者 — `channels.imessage.allowFrom` 會識別 BlueBubbles 使用的相同 `+15555550123` / `user@example.com` 字串。
- **工作階段** 保持在每個代理程式 + 聊天的範圍內。私人訊息會在預設 `session.dmScope=main` 下合併到代理程式主工作階段中；群組工作階段會根據每個 `chat_id` 保持隔離。工作階段金鑰不同（`agent:<id>:imessage:group:<chat_id>` 與 BlueBubbles 的同等金鑰相比） — BlueBubbles 工作階段金鑰下的舊對話紀錄不會帶入 iMessage 工作階段。
- 引用 `match.channel: "bluebubbles"` 的 **ACP 繫結** 需要更新為 `"imessage"`。`match.peer.id` 形狀（`chat_id:`、`chat_guid:`、`chat_identifier:`、bare handle）是完全相同的。

## 無回退通道

沒有可切換回來的支援 BlueBubbles 執行時。如果 iMessage 驗證失敗，請設定 `channels.imessage.enabled: false`，重新啟動 Gateway，修復 `imsg` 阻塞問題，然後重試切換。

回覆快取位於 `~/.openclaw/state/imessage/reply-cache.jsonl`（模式 `0600`，父目錄 `0700`）。如果您想要一個全新的開始，可以安全地將其刪除。

## 相關

- [iMessage](/zh-Hant/channels/imessage) — 完整的 iMessage 通道參考，包括 `imsg launch` 設定和功能檢測。
- `/channels/bluebubbles` — 重新導向至此遷移指南的舊版 URL。
- [配對](/zh-Hant/channels/pairing) — DM 認證和配對流程。
- [通道路由](/zh-Hant/channels/channel-routing) — 網關如何為出站回覆選擇通道。
