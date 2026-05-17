---
summary: "將舊的 BlueBubbles 設定遷移至內建的 iMessage 外掛，而不會失去配對、允許清單或群組綁定。"
read_when:
  - Planning a move from BlueBubbles to the bundled iMessage plugin
  - Translating BlueBubbles config keys to iMessage equivalents
  - Verifying imsg before enabling the iMessage plugin
title: "從 BlueBubbles 遷移"
---

內建的 `imessage` 插件現在透過 JSON-RPC 驅動 [`steipete/imsg`](https://github.com/steipete/imsg)，已達到與 BlueBubbles 相同的私有 API 表面（`react`、`edit`、`unsend`、`reply`、`sendWithEffect`、群組管理、附件）。如果您已經在執行安裝了 `imsg` 的 Mac，您可以捨棄 BlueBubbles 伺服器，讓插件直接與 Messages.app 對話。

BlueBubbles 支援已被移除。OpenClaw 僅透過 `imsg` 支援 iMessage。本指南用於將舊的 `channels.bluebubbles` 設定遷移至 `channels.imessage`；沒有其他支援的遷移途徑。

<Note>關於簡短公告和操作員摘要，請參閱 [BlueBubbles 移除與 imsg iMessage 路徑](/zh-Hant/announcements/bluebubbles-imessage)。</Note>

## 遷移檢查清單

當您已經了解舊的 BlueBubbles 設定並想要最短的安全路徑時，請使用此檢查清單：

1. 直接在執行 Messages.app 的 Mac 上驗證 `imsg`（`imsg chats`、`imsg history`、`imsg send` 和 `imsg rpc --help`）。
2. 將行為金鑰從 `channels.bluebubbles` 複製到 `channels.imessage`：`dmPolicy`、`allowFrom`、`groupPolicy`、`groupAllowFrom`、`groups`、`includeAttachments`、`attachmentRoots`、`mediaMaxMb`、`textChunkLimit`、`coalesceSameSenderDms` 和 `actions`。
3. 捨棄不再存在的傳輸金鑰：`serverUrl`、`password`、webhook URL 和 BlueBubbles 伺服器設定。
4. 如果 Gateway 並未在 Messages Mac 上執行，請將 `channels.imessage.cliPath` 設定為 SSH 包裝器，並設定 `remoteHost` 以進行遠端附件擷取。
5. 在 Gateway 停止的情況下，啟用 `channels.imessage`，然後執行 `openclaw channels status --probe --channel imessage`。
6. 測試一個私人訊息、一個允許的群組（如果已啟用還包括附件），以及您期望代理程式使用的每個私有 API 動作。
7. 在驗證 iMessage 路徑後，刪除 BlueBubbles 伺服器和舊的 `channels.bluebubbles` 設定。

## 此遷移適用時機

- 您已在同一台 Mac（或透過 SSH 可連線的 Mac）上執行 `imsg`，且該 Mac 已登入 Messages.app。
- 您希望減少一個運作環節——無需獨立的 BlueBubbles 伺服器、無需進行驗證的 REST 端點、也無需設置 Webhook。使用單一 CLI 二進位檔案，取代伺服器 + 客戶端應用程式 + 助手程式的組合。
- 您使用的 macOS / `imsg` 版本[受到支援](/zh-Hant/channels/imessage#requirements-and-permissions-macos)，且私有 API 探測回報 `available: true`。

## imsg 的功能

`imsg` 是一個適用於 Messages 的本機 macOS CLI。OpenClaw 會將 `imsg rpc` 作為子程序啟動，並透過 stdin/stdout 進行 JSON-RPC 通訊。這裡沒有 HTTP 伺服器、Webhook URL、背景常駐程式、啟動代理程式 或需要對外開放的連接埠。

- 讀取操作是透過唯讀 SQLite 句柄從 `~/Library/Messages/chat.db` 取得。
- 即時傳入的訊息來自 `imsg watch` / `watch.subscribe`，該機制會跟隨 `chat.db` 的檔案系統事件，並以輪詢 作為後備機制。
- 發送操作使用 Messages.app 自動化來處理一般文字和檔案傳送。
- 進階動作使用 `imsg launch` 將 `imsg` 助手注入至 Messages.app 中。這正是能夠解鎖已讀回執、輸入指示器、豐富傳送、編輯、取消傳送、串聯回覆、輕觸回應 以及群組管理功能的原因。
- Linux 版本可以檢查複製過來的 `chat.db`，但無法傳送、監看即時 Mac 資料庫或驅動 Messages.app。若要使用 OpenClaw iMessage，請在已登入的 Mac 上執行 `imsg`，或透過 SSH 包裝程式連線至該 Mac 來執行。

## 開始之前

1. 在執行 Messages.app 的 Mac 上安裝 `imsg`：

   ```bash
   brew install steipete/tap/imsg
   imsg --version
   imsg chats --limit 3
   ```

   如果 `imsg chats` 失敗並顯示 `unable to open database file`、空輸出或 `authorization denied`，請授予終端機、編輯器、Node 程序、Gateway 服務或啟動 `imsg` 的 SSH 父程序「完全磁碟存取權」(Full Disk Access)，然後重新開啟該父程序。

2. 在變更 OpenClaw 設定之前，請先驗證讀取、監看、發送和 RPC 介面：

   ```bash
   imsg chats --limit 10 --json | jq -s
   imsg history --chat-id 42 --limit 10 --attachments --json | jq -s
   imsg watch --chat-id 42 --reactions --json
   imsg send --chat-id 42 --text "OpenClaw imsg test"
   imsg rpc --help
   ```

   將 `42` 替換為 `imsg chats` 中的真實聊天 ID。傳送需要 Messages.app 的自動化權限。如果 OpenClaw 將透過 SSH 執行，請透過 OpenClaw 將使用的同一個 SSH 包裝程式或使用者環境執行這些指令。

3. 當您需要進階動作時，啟用私有 API 橋接器：

   ```bash
   imsg launch
   imsg status --json
   ```

   `imsg launch` 需要停用 SIP。基本傳送、歷史記錄和監看不需要 `imsg launch` 即可運作；進階動作則需要。

4. 在您新增啟用的 `channels.imessage` 設定後，透過 OpenClaw 驗證橋接器：

   ```bash
   openclaw channels status --probe
   ```

   您需要 `imessage.privateApi.available: true`。如果它回報 `false`，請先修正該問題 — 請參閱[功能偵測](/zh-Hant/channels/imessage#private-api-actions)。`channels status --probe` 僅會探測已設定且啟用的帳戶。

5. 擷取您的設定：

   ```bash
   cp ~/.openclaw/openclaw.json5 ~/.openclaw/openclaw.json5.bak
   ```

## 設定轉換

iMessage 和 BlueBubbles 共用許多通道層級的設定。變更的金鑰主要是傳輸方式（REST 伺服器與本機 CLI）。行為金鑰（`dmPolicy`、`groupPolicy`、`allowFrom` 等）保持相同的含義。

| BlueBubbles                                                | 內建 iMessage                             | 備註                                                                                                                                                                                                                                                                                                                         |
| ---------------------------------------------------------- | ----------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `channels.bluebubbles.enabled`                             | `channels.imessage.enabled`               | 語意相同。                                                                                                                                                                                                                                                                                                                   |
| `channels.bluebubbles.serverUrl`                           | _(已移除)_                                | 無 REST 伺服器 — 外掛程式透過 stdio 啟動 `imsg rpc`。                                                                                                                                                                                                                                                                        |
| `channels.bluebubbles.password`                            | _(已移除)_                                | 不需要 webhook 驗證。                                                                                                                                                                                                                                                                                                        |
| _(隱含)_                                                   | `channels.imessage.cliPath`               | `imsg` 的路徑（預設 `imsg`）；對 SSH 使用包裝腳本。                                                                                                                                                                                                                                                                          |
| _(隱含)_                                                   | `channels.imessage.dbPath`                | 選用的 Messages.app `chat.db` 覆寫值；省略時自動偵測。                                                                                                                                                                                                                                                                       |
| _(隱含)_                                                   | `channels.imessage.remoteHost`            | `host` 或 `user@host` — 僅在 `cliPath` 是 SSH 包裝程式且您想要 SCP 附件擷取時需要。                                                                                                                                                                                                                                          |
| `channels.bluebubbles.dmPolicy`                            | `channels.imessage.dmPolicy`              | 相同的值 (`pairing` / `allowlist` / `open` / `disabled`)。                                                                                                                                                                                                                                                                   |
| `channels.bluebubbles.allowFrom`                           | `channels.imessage.allowFrom`             | 配對批准是依照 handle 而非 token 繼承的。                                                                                                                                                                                                                                                                                    |
| `channels.bluebubbles.groupPolicy`                         | `channels.imessage.groupPolicy`           | 相同的值 (`allowlist` / `open` / `disabled`)。                                                                                                                                                                                                                                                                               |
| `channels.bluebubbles.groupAllowFrom`                      | `channels.imessage.groupAllowFrom`        | 相同。                                                                                                                                                                                                                                                                                                                       |
| `channels.bluebubbles.groups`                              | `channels.imessage.groups`                | **逐字複製此內容，包括任何 `groups: { "*": { ... } }` 萬用字元條目。** 各群組的 `requireMention`、`tools`、`toolsBySender` 會被繼承。使用 `groupPolicy: "allowlist"` 時，空缺或遺失的 `groups` 區塊會靜默捨棄所有群組訊息 — 請參見下方的「Group registry footgun」。                                                         |
| `channels.bluebubbles.sendReadReceipts`                    | `channels.imessage.sendReadReceipts`      | 預設 `true`。使用隨附的插件時，這只會在私有 API 探測啟動時觸發。                                                                                                                                                                                                                                                             |
| `channels.bluebubbles.includeAttachments`                  | `channels.imessage.includeAttachments`    | 結構相同，**同樣預設為關閉**。如果您之前在 BlueBubbles 上有附件傳輸，您必須在 iMessage 區塊上明確重新設定此項 — 它不會隱式繼承，且在您設定之前，傳入的相片/媒體將會被靜默捨棄，不會有任何 `Inbound message` 日誌行。                                                                                                         |
| `channels.bluebubbles.attachmentRoots`                     | `channels.imessage.attachmentRoots`       | 本地根路徑；相同的萬用字元規則。                                                                                                                                                                                                                                                                                             |
| _(不適用)_                                                 | `channels.imessage.remoteAttachmentRoots` | 僅在為 SCP 取用設定了 `remoteHost` 時使用。                                                                                                                                                                                                                                                                                  |
| `channels.bluebubbles.mediaMaxMb`                          | `channels.imessage.mediaMaxMb`            | iMessage 預設為 16 MB（BlueBubbles 預設為 8 MB）。如果您想保持較低的上限，請明確設定。                                                                                                                                                                                                                                       |
| `channels.bluebubbles.textChunkLimit`                      | `channels.imessage.textChunkLimit`        | 兩者皆預設為 4000。                                                                                                                                                                                                                                                                                                          |
| `channels.bluebubbles.coalesceSameSenderDms`               | `channels.imessage.coalesceSameSenderDms` | 同樣為選用設定。僅限私訊（DM）—— 群組聊天會在兩個頻道上保持即時逐訊息分發。若在未指定 `messages.inbound.byChannel.imessage` 的情況下啟用，會將預設的輸入防抖（debounce）時間加寬至 2500 毫秒。請參閱 [iMessage 文件 § 合併分割發送的私訊](/zh-Hant/channels/imessage#coalescing-split-send-dms-command--url-in-one-composition)。 |
| `channels.bluebubbles.enrichGroupParticipantsFromContacts` | _(不適用)_                                | iMessage 已經從 `chat.db` 讀取發送者顯示名稱。                                                                                                                                                                                                                                                                               |
| `channels.bluebubbles.actions.*`                           | `channels.imessage.actions.*`             | 每個動作的切換開關：`reactions`、`edit`、`unsend`、`reply`、`sendWithEffect`、`renameGroup`、`setGroupIcon`、`addParticipant`、`removeParticipant`、`leaveGroup`、`sendAttachment`。                                                                                                                                         |

多帳號設定 (`channels.bluebubbles.accounts.*`) 會一對一對應轉換為 `channels.imessage.accounts.*`。

## 群組註冊表陷阱

內建的 iMessage 外掛會連續執行 **兩個** 獨立的群組允許清單閘門。兩者都必須通過，群組訊息才能抵達代理程式（agent）：

1. **發送者 / 聊天目標允許清單** (`channels.imessage.groupAllowFrom`) —— 由 `isAllowedIMessageSender` 檢查。根據發送者代碼（handle）、`chat_guid`、`chat_identifier` 或 `chat_id` 比對輸入訊息。結構與 BlueBubbles 相同。
2. **群組註冊表** (`channels.imessage.groups`) —— 由 `resolveChannelGroupPolicy` 從 `inbound-processing.ts:199` 檢查。配合 `groupPolicy: "allowlist"`，此閘門要求下列任一條件：
   - 一個 `groups: { "*": { ... } }` 萬用字元項目（設定 `allowAll = true`），或
   - 一個在 `groups` 下的明確每個 `chat_id` 項目。

如果閘門 1 通過但閘門 2 失敗，訊息將被丟棄。外掛會發出兩個 `warn` 層級的信號，因此這在預設日誌層級下不再是靜默的：

- 每個帳戶的一次性啟動 `warn`，當設定了 `groupPolicy: "allowlist"` 但 `channels.imessage.groups` 為空（沒有 `"*"` 萬用字元，沒有逐 `chat_id` 項目）時觸發 — 在任何訊息落地之前觸發。
- 特定群組首次在執行時期出現時，一次針對該 `chat_id` 的 `warn`，指名 chat_id 以及要加入 `groups` 以允許它的確切金鑰。

DM（直接訊息）會繼續運作，因為它們走的是不同的程式碼路徑。

這是最常見的 BlueBubbles → 內建 iMessage 遷移失敗模式：操作員複製了 `groupAllowFrom` 和 `groupPolicy` 但跳過了 `groups` 區塊，因為 BlueBubbles 的 `groups: { "*": { "requireMention": true } }` 看起來像一個無關的提及設定。實際上它對註冊表閘門至關重要。

在 `groupPolicy: "allowlist"` 之後保持群組訊息流動的最低設定：

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

當未設定提及模式時，`*` 下的 `requireMention: true` 是無害的：執行時會設定 `canDetectMention = false` 並在 `inbound-processing.ts:512` 短路提及拋棄。如果設定了提及模式（`agents.list[].groupChat.mentionPatterns`），它會如期運作。

如果閘道記錄 `imessage: dropping group message from chat_id=<id>` 或啟動行 `imessage: groupPolicy="allowlist" but channels.imessage.groups is empty`，表示閘門 2 正在拋棄 — 請新增 `groups` 區塊。

## 逐步操作

1. 在現有的 BlueBubbles 區塊旁邊新增一個 iMessage 區塊。當閘道仍在路由 BlueBubbles 流量時，請將其保持停用：

   ```json5
   {
     channels: {
       bluebubbles: {
         enabled: true,
         // ... existing config ...
       },
       imessage: {
         enabled: false,
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

2. **在流量變得重要之前先探測** — 停止閘道，暫時啟用 iMessage 區塊，並從 CLI 確認 iMessage 回報健康：

   ```bash
   openclaw gateway stop
   # edit config: channels.imessage.enabled = true
   openclaw channels status --probe --channel imessage   # expect imessage.privateApi.available: true
   ```

   `channels status --probe` 僅會探測已設定且已啟用的帳戶。除非您有意同時執行兩個通道監視器，否則請勿在同時啟用 BlueBubbles 和 iMessage 的情況下重新啟動 Gateway。如果您不打算立即切換，請在重新啟動 Gateway 之前將 `channels.imessage.enabled` 設回 `false`。使用 [開始之前](#before-you-start) 中的直接 `imsg` 指令，在啟用 OpenClaw 流量之前驗證 Mac。

3. **切換。** 一旦啟用的 iMessage 帳戶回報狀態健康，請移除 BlueBubbles 設定並保持 iMessage 啟用：

   ```json5
   {
     channels: {
       imessage: { enabled: true /* ... */ },
     },
   }
   ```

   重新啟動 Gateway。傳入的 iMessage 流量現將透過內建插件流動。

4. **驗證 DM。** 傳送直接訊息給代理；確認收到回覆。

5. **分別驗證群組。** DM 和群組採用不同的程式碼路徑 — DM 成功並不證明群組路由正常。在已配對的群組聊天中傳送訊息給代理，並確認收到回覆。如果群組沒有回應（沒有代理回覆，也沒有錯誤），請檢查 Gateway 日誌中的 `imessage: dropping group message from chat_id=<id>` 或啟動時的 `imessage: groupPolicy="allowlist" but channels.imessage.groups is empty` 行 — 這兩者都會在預設日誌層級觸發。如果出現其中任何一個，表示您的 `groups` 區塊遺失或空白 — 請參閱上方的「Group registry footgun」。

6. **驗證操作功能** — 從已配對的 DM，要求代理進行回應、編輯、取消傳送、回覆、傳送照片，以及（在群組中）重新命名群組 / 新增或移除參與者。每個操作都應該原生的顯示在 Messages.app 中。如果有任何操作拋出「iMessage `<action>` requires the imsg private API bridge」，請再次執行 `imsg launch` 並重新整理 `channels status --probe`。

7. 一旦驗證了 iMessage DM、群組和操作，**移除 BlueBubbles 伺服器和設定**。OpenClaw 將不會使用 `channels.bluebubbles`。

## 操作功能對照總覽

| 操作                                | 舊版 BlueBubbles                 | 內建 iMessage                                                                                                            |
| ----------------------------------- | -------------------------------- | ------------------------------------------------------------------------------------------------------------------------ |
| 傳送文字 / SMS 備援                 | ✅                               | ✅                                                                                                                       |
| 傳送媒體（照片、影片、檔案、語音）  | ✅                               | ✅                                                                                                                       |
| 串聯回覆 (`reply_to_guid`)          | ✅                               | ✅ (closes [#51892](https://github.com/openclaw/openclaw/issues/51892))                                                  |
| Tapback (`react`)                   | ✅                               | ✅                                                                                                                       |
| 編輯 / 取消傳送（macOS 13+ 接收者） | ✅                               | ✅                                                                                                                       |
| 傳送螢幕特效                        | ✅                               | ✅ (部分關閉 [#9394](https://github.com/openclaw/openclaw/issues/9394))                                                  |
| 富文字粗體 / 斜體 / 底線 / 刪除線   | ✅                               | ✅ (透過 attributedBody 進行 typed-run 格式設定)                                                                         |
| 重新命名群組 / 設定群組圖示         | ✅                               | ✅                                                                                                                       |
| 新增 / 移除參與者，離開群組         | ✅                               | ✅                                                                                                                       |
| 已讀回執與輸入指示器                | ✅                               | ✅ (取決於私有 API 探測)                                                                                                 |
| 相同傳送者的私訊合併                | ✅                               | ✅ (僅限私訊；透過 `channels.imessage.coalesceSameSenderDms` 選擇加入)                                                   |
| 接駁閘道關閉時收到之內送訊息的追趕  | ✅ (webhook 重播 + 歷史紀錄擷取) | ✅ (透過 `channels.imessage.catchup.enabled` 選擇加入；關閉 [#78649](https://github.com/openclaw/openclaw/issues/78649)) |

iMessage 追趕功能現已作為內建外掛的可選功能提供。在閘道啟動時，如果 `channels.imessage.catchup.enabled` 為 `true`，閘道會針對與 `imsg watch` 使用的相同 JSON-RPC 用戶端執行一次 `chats.list` + 每個聊天室的 `messages.history` 傳遞，透過即時分派路徑 (允許清單、群組原則、防抖動、回聲快取) 重播每個錯過的內送紀錄，並保存每個帳號的游標，以便後續啟動能從中斷處繼續。請參閱 [Catching up after gateway downtime](/zh-Hant/channels/imessage#catching-up-after-gateway-downtime) 以進行調整。

## 配對、工作階段與 ACP 繫結

- **配對核准** 會依據 handle 延續。您不需要重新核准已知的傳送者 — `channels.imessage.allowFrom` 能辨識 BlueBubbles 使用的相同 `+15555550123` / `user@example.com` 字串。
- **工作階段** 保持依據代理程式 + 聊天室的範圍。在預設的 `session.dmScope=main` 下，私訊會折疊至代理程式主工作階段；群組工作階段則依據每個 `chat_id` 保持獨立。工作階段金鑰有所不同 (`agent:<id>:imessage:group:<chat_id>` 與 BlueBubbles 的對應項目) — BlueBubbles 工作階段金鑰下的舊對話紀錄不會帶入 iMessage 工作階段。
- 參照 `match.channel: "bluebubbles"` 的 **ACP 繫結** 需要更新為 `"imessage"`。`match.peer.id` 形狀 (`chat_id:`、`chat_guid:`、`chat_identifier:`、純 handle) 是相同的。

## 無回溯通道

沒有支援的 BlueBubbles 運行環境可以切換回去。如果 iMessage 驗證失敗，請設定 `channels.imessage.enabled: false`，重新啟動 Gateway，修復 `imsg` 阻礙，然後重試切換。

回覆快取位於 `~/.openclaw/state/imessage/reply-cache.jsonl`（模式 `0600`，父目錄 `0700`）。如果您想乾淨地重新開始，可以安全地將其刪除。

## 相關

- [BlueBubbles 移除與 imsg iMessage 路徑](/zh-Hant/announcements/bluebubbles-imessage) — 簡短的公告與管理員摘要。
- [iMessage](/zh-Hant/channels/imessage) — 完整的 iMessage 頻道參考，包括 `imsg launch` 設定與功能偵測。
- `/channels/bluebubbles` — 重新導向至此遷移指南的舊版 URL。
- [配對](/zh-Hant/channels/pairing) — DM 驗證與配對流程。
- [頻道路由](/zh-Hant/channels/channel-routing) — Gateway 如何為出站回覆選擇頻道。
