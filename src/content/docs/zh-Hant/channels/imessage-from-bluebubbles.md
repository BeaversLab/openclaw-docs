---
summary: "將舊的 BlueBubbles 設定遷移至內建的 iMessage 外掛，而不會失去配對、允許清單或群組綁定。"
read_when:
  - Planning a move from BlueBubbles to the bundled iMessage plugin
  - Translating BlueBubbles config keys to iMessage equivalents
  - Verifying imsg before enabling the iMessage plugin
title: "從 BlueBubbles 遷移"
---

內建的 `imessage` 插件現在透過 JSON-RPC 驅動 [`steipete/imsg`](https://github.com/steipete/imsg)，已達到與 BlueBubbles 相同的私有 API 表面 (`react`、`edit`、`unsend`、`reply`、`sendWithEffect`、群組管理、附件)。如果您已經在執行安裝了 `imsg` 的 Mac，您可以捨棄 BlueBubbles 伺服器並讓插件直接與 Messages.app 通訊。

BlueBubbles 支援已被移除。OpenClaw 僅透過 `imsg` 支援 iMessage。本指南用於將舊的 `channels.bluebubbles` 設定遷移至 `channels.imessage`；沒有其他支援的遷移途徑。

<Note>如需簡短公告和操作員摘要，請參閱 [BlueBubbles removal and the imsg iMessage path](/zh-Hant/announcements/bluebubbles-imessage)。</Note>

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
- 您處在私有 API 探測回報 `available: true` 的 [受支援 macOS / `imsg` 版本](/zh-Hant/channels/imessage#requirements-and-permissions-macos) 上。

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

   將 `42` 替換為來自 `imsg chats` 的真實聊天 ID。發送需要 Messages.app 的自動化權限。如果 OpenClaw 將透過 SSH 執行，請透過 OpenClaw 將使用的同一個 SSH 包裝程式或使用者內容來執行這些指令。如果讀取/探測正常但發送因 AppleEvents `-1743` 而失敗，請檢查自動化是否落在 `/usr/libexec/sshd-keygen-wrapper` 上；請參閱 [SSH wrapper sends fail with AppleEvents -1743](/zh-Hant/channels/imessage#ssh-wrapper-sends-fail-with-appleevents-1743)。

3. 當您需要進階動作時，啟用私有 API 橋接器：

   ```bash
   imsg launch
   imsg status --json
   ```

   `imsg launch` 需要停用 SIP。基本發送、歷史記錄和監看功能不需要 `imsg launch` 即可運作；進階動作則需要。

4. 在您加入啟用的 `channels.imessage` 設定後，透過 OpenClaw 驗證橋接器：

   ```bash
   openclaw channels status --probe
   ```

   您需要 `imessage.privateApi.available: true`。如果它回報 `false`，請先解決該問題 — 請參閱 [Capability detection](/zh-Hant/channels/imessage#private-api-actions)。`channels status --probe` 僅會探測已設定且已啟用的帳戶。

5. 擷取您的設定：

   ```bash
   cp ~/.openclaw/openclaw.json5 ~/.openclaw/openclaw.json5.bak
   ```

## 設定轉換

iMessage 和 BlueBubbles 共用許多頻道層級的設定。會改變的鍵值主要是傳輸方式 (REST 伺服器與本機 CLI)。行為鍵值 (`dmPolicy`、`groupPolicy`、`allowFrom` 等) 保持相同的含義。

| BlueBubbles                                                | 內建 iMessage                             | 備註                                                                                                                                                                                                                                                                                                               |
| ---------------------------------------------------------- | ----------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `channels.bluebubbles.enabled`                             | `channels.imessage.enabled`               | 語意相同。                                                                                                                                                                                                                                                                                                         |
| `channels.bluebubbles.serverUrl`                           | _(已移除)_                                | 無 REST 伺服器 — 外掛程式透過 stdio 產生 `imsg rpc`。                                                                                                                                                                                                                                                              |
| `channels.bluebubbles.password`                            | _(已移除)_                                | 不需要 webhook 驗證。                                                                                                                                                                                                                                                                                              |
| _(隱含)_                                                   | `channels.imessage.cliPath`               | `imsg` 的路徑（預設為 `imsg`）；針對 SSH 使用包裝腳本。                                                                                                                                                                                                                                                            |
| _(隱含)_                                                   | `channels.imessage.dbPath`                | 選用的 Messages.app `chat.db` 覆寫；若省略則自動偵測。                                                                                                                                                                                                                                                             |
| _(隱含)_                                                   | `channels.imessage.remoteHost`            | `host` 或 `user@host` — 僅在 `cliPath` 為 SSH 包裝程式且您想要 SCP 附件擷取時需要。                                                                                                                                                                                                                                |
| `channels.bluebubbles.dmPolicy`                            | `channels.imessage.dmPolicy`              | 相同的值（`pairing` / `allowlist` / `open` / `disabled`）。                                                                                                                                                                                                                                                        |
| `channels.bluebubbles.allowFrom`                           | `channels.imessage.allowFrom`             | 配對批准是依照 handle 而非 token 繼承的。                                                                                                                                                                                                                                                                          |
| `channels.bluebubbles.groupPolicy`                         | `channels.imessage.groupPolicy`           | 相同的值（`allowlist` / `open` / `disabled`）。                                                                                                                                                                                                                                                                    |
| `channels.bluebubbles.groupAllowFrom`                      | `channels.imessage.groupAllowFrom`        | 相同。                                                                                                                                                                                                                                                                                                             |
| `channels.bluebubbles.groups`                              | `channels.imessage.groups`                | **逐字複製此內容，包括任何 `groups: { "*": { ... } }` 萬用字元項目。** 每個群組的 `requireMention`、`tools`、`toolsBySender` 會保留。使用 `groupPolicy: "allowlist"` 時，空白或遺失的 `groups` 區塊會靜默丟棄所有群組訊息 — 請參閱下方的「Group registry footgun」。                                               |
| `channels.bluebubbles.sendReadReceipts`                    | `channels.imessage.sendReadReceipts`      | 預設為 `true`。使用隨附的外掛程式時，這只會在私人 API 探測啟動時觸發。                                                                                                                                                                                                                                             |
| `channels.bluebubbles.includeAttachments`                  | `channels.imessage.includeAttachments`    | 相同的結構，**同樣預設關閉**。如果您在 BlueBubbles 上有附件傳輸，您必須在 iMessage 區塊上明確重新設定此項 — 它不會隱含地保留，並且傳入的照片/媒體將被靜默丟棄，直到您為止，且不會有 `Inbound message` 日誌行。                                                                                                     |
| `channels.bluebubbles.attachmentRoots`                     | `channels.imessage.attachmentRoots`       | 本地根路徑；相同的萬用字元規則。                                                                                                                                                                                                                                                                                   |
| _(不適用)_                                                 | `channels.imessage.remoteAttachmentRoots` | 僅在設定 `remoteHost` 進行 SCP 抓取時使用。                                                                                                                                                                                                                                                                        |
| `channels.bluebubbles.mediaMaxMb`                          | `channels.imessage.mediaMaxMb`            | iMessage 預設為 16 MB（BlueBubbles 預設為 8 MB）。如果您想保持較低的上限，請明確設定。                                                                                                                                                                                                                             |
| `channels.bluebubbles.textChunkLimit`                      | `channels.imessage.textChunkLimit`        | 兩者皆預設為 4000。                                                                                                                                                                                                                                                                                                |
| `channels.bluebubbles.coalesceSameSenderDms`               | `channels.imessage.coalesceSameSenderDms` | 相同的選用加入機制。僅限私訊（DM）——群組聊天在兩個頻道都保持即時逐訊息分發。若未指定 `messages.inbound.byChannel.imessage`，啟用時會將預設的輸入防抖動（debounce）加寬至 2500 毫秒。請參閱 [iMessage 文件 § 合併分割發送的私訊](/zh-Hant/channels/imessage#coalescing-split-send-dms-command--url-in-one-composition)。 |
| `channels.bluebubbles.enrichGroupParticipantsFromContacts` | _(不適用)_                                | iMessage 已經從 `chat.db` 讀取發送者顯示名稱。                                                                                                                                                                                                                                                                     |
| `channels.bluebubbles.actions.*`                           | `channels.imessage.actions.*`             | 個別動作切換開關：`reactions`、`edit`、`unsend`、`reply`、`sendWithEffect`、`renameGroup`、`setGroupIcon`、`addParticipant`、`removeParticipant`、`leaveGroup`、`sendAttachment`。                                                                                                                                 |

多帳號設定（`channels.bluebubbles.accounts.*`）會一對一轉換為 `channels.imessage.accounts.*`。

## 群組註冊表陷阱

內建的 iMessage 外掛會連續執行 **兩個** 獨立的群組允許清單閘門。兩者都必須通過，群組訊息才能抵達代理程式（agent）：

1. **發送者 / 聊天目標允許清單**（`channels.imessage.groupAllowFrom`）——由 `isAllowedIMessageSender` 檢查。根據發送者代碼、`chat_guid`、`chat_identifier` 或 `chat_id` 比對輸入訊息。結構與 BlueBubbles 相同。
2. **群組註冊表**（`channels.imessage.groups`）——由 `inbound-processing.ts:199` 中的 `resolveChannelGroupPolicy` 檢查。使用 `groupPolicy: "allowlist"` 時，此閘門需要具備以下任一條件：
   - 一個 `groups: { "*": { ... } }` 萬用字元項目（設定 `allowAll = true`），或
   - `groups` 下明確針對每個 `chat_id` 的項目。

如果通過了第一道閘門但第二道閘門失敗，訊息將會被丟棄。外掛程式會發出兩個 `warn` 層級的訊號，因此在預設日誌層級下不會再無聲無息：

- 每個帳戶在啟動時發出一次 `warn`，當設定了 `groupPolicy: "allowlist"` 但 `channels.imessage.groups` 為空時（沒有 `"*"` 萬用字元，也沒有針對每個 `chat_id` 的項目）——在任何訊息抵達之前觸發。
- 在執行時期特定群組首次被丟棄時，針對每個 `chat_id` 發出一次 `warn`，指明 chat_id 以及需要加入 `groups` 的確切金鑰以允許該群組。

DM（直接訊息）會繼續運作，因為它們走的是不同的程式碼路徑。

這是 BlueBubbles → 內建 iMessage 遷移最常見的失敗模式：操作員複製了 `groupAllowFrom` 和 `groupPolicy` 但跳過了 `groups` 區塊，因為 BlueBubbles 的 `groups: { "*": { "requireMention": true } }` 看起來像是一個不相關的提及設定。它實際上是註冊表閘門的關鍵支撐。

在 `groupPolicy: "allowlist"` 之後保持群組訊息流動的最低配置：

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

當未配置提及模式時，`*` 下的 `requireMention: true` 是無害的：執行時期會設定 `canDetectMention = false` 並在 `inbound-processing.ts:512` 處短路提及丟棄邏輯。當配置了提及模式 (`agents.list[].groupChat.mentionPatterns`) 時，它會如預期運作。

如果閘道記錄了 `imessage: dropping group message from chat_id=<id>` 或啟動行 `imessage: groupPolicy="allowlist" but channels.imessage.groups is empty`，表示第二道閘門正在丟棄訊息——請新增 `groups` 區塊。

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

   `channels status --probe` 只會探測已設定且已啟用的帳戶。除非您有意讓兩個通道監視器同時執行，否則不要同時啟用 BlueBubbles 和 iMessage 並重新啟動閘道。如果您不打算立即切換，請在重新啟動閘道之前將 `channels.imessage.enabled` 設回 `false`。使用 [Before you start](#before-you-start) 中的直接 `imsg` 指令，在啟用 OpenClaw 流量之前驗證 Mac。

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

5. **單獨驗證群組。** 私訊和群組採用不同的程式碼路徑 — 私訊成功並不證明群組正在路由。在已配對的群組聊天中傳送訊息給代理，並確認收到回覆。如果群組變得沈默（沒有代理回覆，也沒有錯誤），請檢查閘道日誌中的 `imessage: dropping group message from chat_id=<id>` 或啟動 `imessage: groupPolicy="allowlist" but channels.imessage.groups is empty` 行 — 兩者都會在預設日誌層級觸發。如果出現其中任何一個，表示您的 `groups` 區塊遺失或為空 — 請參閱上方的「Group registry footgun」。

6. **驗證操作介面** — 從已配對的私訊中，請代理進行回應、編輯、取消傳送、回覆、傳送照片，以及（在群組中）重新命名群組 / 新增或移除參與者。每個操作都應原生地出現在 Messages.app 中。如果任何操作拋出「iMessage `<action>` requires the imsg private API bridge」，請再次執行 `imsg launch` 並重新整理 `channels status --probe`。

7. 一旦驗證了 iMessage 私訊、群組和操作，**移除 BlueBubbles 伺服器和設定**。OpenClaw 將不會使用 `channels.bluebubbles`。

## 操作功能對照總覽

| 操作                                | 舊版 BlueBubbles                 | 內建 iMessage                                                                                                          |
| ----------------------------------- | -------------------------------- | ---------------------------------------------------------------------------------------------------------------------- |
| 傳送文字 / SMS 備援                 | ✅                               | ✅                                                                                                                     |
| 傳送媒體（照片、影片、檔案、語音）  | ✅                               | ✅                                                                                                                     |
| 串聯回覆 (`reply_to_guid`)          | ✅                               | ✅ (closes [#51892](https://github.com/openclaw/openclaw/issues/51892))                                                |
| 點回 (`react`)                      | ✅                               | ✅                                                                                                                     |
| 編輯 / 取消傳送（macOS 13+ 接收者） | ✅                               | ✅                                                                                                                     |
| 傳送螢幕特效                        | ✅                               | ✅ (closes part of [#9394](https://github.com/openclaw/openclaw/issues/9394))                                          |
| 富文字粗體 / 斜體 / 底線 / 刪除線   | ✅                               | ✅ (透過 attributedBody 進行 typed-run 格式設定)                                                                       |
| 重新命名群組 / 設定群組圖示         | ✅                               | ✅                                                                                                                     |
| 新增 / 移除參與者，離開群組         | ✅                               | ✅                                                                                                                     |
| 已讀回執與輸入指示器                | ✅                               | ✅ (取決於私有 API 探測)                                                                                               |
| 相同傳送者的私訊合併                | ✅                               | ✅ (僅限私訊；透過 `channels.imessage.coalesceSameSenderDms` 啟用)                                                     |
| 接駁閘道關閉時收到之內送訊息的追趕  | ✅ (webhook 重播 + 歷史紀錄擷取) | ✅ (透過 `channels.imessage.catchup.enabled` 啟用；closes [#78649](https://github.com/openclaw/openclaw/issues/78649)) |

iMessage 追趕現已作為內建外掛的可選功能提供。在閘道啟動時，如果 `channels.imessage.catchup.enabled` 為 `true`，閘道會針對 `imsg watch` 使用的同一個 JSON-RPC 用戶端執行一次 `chats.list` + 針對每個聊天 `messages.history` 的掃描，透過即時分派路徑（白名單、群組原則、防抖、回聲快取）重新播放每個錯過的傳入列，並保存每個帳戶的游標，以便後續啟動從中斷處繼續。有關調整，請參閱 [Catching up after gateway downtime](/zh-Hant/channels/imessage#catching-up-after-gateway-downtime)。

## 配對、工作階段與 ACP 繫結

- **配對核准** 會依 handle 延續。您不需要重新核准已知發送者 — `channels.imessage.allowFrom` 能辨識 BlueBubbles 使用的相同 `+15555550123` / `user@example.com` 字串。
- **工作階段** 保持以 agent + chat 為範圍。在預設 `session.dmScope=main` 下，DM 會合併至 agent 主工作階段；群組工作階段則依 `chat_id` 保持獨立。工作階段金鑰不同（`agent:<id>:imessage:group:<chat_id>` 與 BlueBubbles 的同等項目） — BlueBubbles 工作階段金鑰下的舊對話紀錄不會帶入 iMessage 工作階段。
- 參照 `match.channel: "bluebubbles"` 的 **ACP 繫結** 需要更新為 `"imessage"`。`match.peer.id` 的形狀（`chat_id:`、`chat_guid:`、`chat_identifier:`、純 handle）完全相同。

## 無回溯通道

沒有支援的 BlueBubbles 執行環境可供切換回去。如果 iMessage 驗證失敗，請設定 `channels.imessage.enabled: false`，重新啟動 Gateway，修正 `imsg` 阻礙因素，然後重試切換。

回覆快取位於 SQLite 外掛程式狀態中。`openclaw doctor --fix` 會匯入並封存舊的 `imessage/reply-cache.jsonl` 側車檔案（當存在的時候）。

## 相關

- [BlueBubbles 移除與 imsg iMessage 路徑](/zh-Hant/announcements/bluebubbles-imessage) — 簡短公告與操作員摘要。
- [iMessage](/zh-Hant/channels/imessage) — 完整的 iMessage 頻道參考資料，包含 `imsg launch` 設定與功能偵測。
- `/channels/bluebubbles` — 重新導向至此移轉指南的舊版 URL。
- [配對](/zh-Hant/channels/pairing) — DM 驗證與配對流程。
- [頻道路由](/zh-Hant/channels/channel-routing) — Gateway 如何為 outbound 回覆挑選頻道。
