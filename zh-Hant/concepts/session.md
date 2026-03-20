---
summary: "會話管理規則、金鑰以及聊天記錄的持久化"
read_when:
  - 修改會話處理或儲存
title: "會話管理"
---

# 會話管理

OpenClaw 將 **每個代理一個直接聊天會話** 視為主要模式。直接聊天會折疊至 `agent:<agentId>:<mainKey>`（預設為 `main`），而群組/頻道聊天則有自己的金鑰。`session.mainKey` 會被遵守。

使用 `session.dmScope` 來控制 **直接訊息** 的分組方式：

- `main` (預設)：所有直接訊息共用主會話以保持連續性。
- `per-peer`：跨頻道依發送者 ID 隔離。
- `per-channel-peer`：依頻道 + 發送者隔離（建議用於多使用者收件匣）。
- `per-account-channel-peer`：依帳號 + 頻道 + 發送者隔離（建議用於多帳號收件匣）。
  使用 `session.identityLinks` 將提供者前綴的對等 ID 映射到標準身份，以便在使用 `per-peer`、`per-channel-peer` 或 `per-account-channel-peer` 時，同一個人跨頻道共用直接訊息會話。

## 安全直接訊息模式（建議用於多使用者設定）

> **安全警告：** 如果您的代理程式可以接收來自**多個人**的直接訊息，您應該強烈考慮啟用安全直接訊息模式。若未啟用，所有使用者將共用相同的對話上下文，這可能會在使用者之間洩漏私人資訊。

**預設設定下的問題範例：**

- Alice (`<SENDER_A>`) 傳送訊息給您的代理關於私人主題（例如，預約醫生）
- Bob (`<SENDER_B>`) 傳送訊息給您的代理詢問「我們剛剛在討論什麼？」
- 由於兩個直接訊息共用同一個會話，模型可能會使用 Alice 的先驗上下文來回答 Bob。

**解決方法：** 設定 `dmScope` 以依使用者隔離會話：

```json5
// ~/.openclaw/openclaw.json
{
  session: {
    // Secure DM mode: isolate DM context per channel + sender.
    dmScope: "per-channel-peer",
  },
}
```

**何時啟用此功能：**

- 您對多個發送者有配對核准
- 您使用的直接訊息允許清單包含多個項目
- 您設定了 `dmPolicy: "open"`
- 多個電話號碼或帳號可以傳訊息給您的代理程式

備註：

- 預設值為 `dmScope: "main"` 以保持連續性（所有直接訊息共用主會話）。這適用於單一使用者設定。
- 若未設定，本機 CLI 引導流程預設會寫入 `session.dmScope: "per-channel-peer"`（既有的明確值會被保留）。
- 對於同一頻道上的多帳號收件匣，建議優先使用 `per-account-channel-peer`。
- 如果同一個人透過多個頻道聯絡您，請使用 `session.identityLinks` 將其直接訊息會話折疊為一個標準身份。
- 您可以使用 `openclaw security audit` 驗證您的直接訊息設定（請參閱 [安全性](/zh-Hant/cli/security)）。

## 閘道是唯一的真實來源

所有會話狀態均由**閘道**（「主控」 OpenClaw）**擁有**。UI 客戶端（macOS 應用程式、WebChat 等）必須向閘道查詢會話清單和 token 計數，而不是讀取本地檔案。

- 在**遠端模式**下，您關心的會話存放區位於遠端閘道主機上，而非您的 Mac。
- UI 中顯示的 Token 計數來自 Gateway 的儲存欄位 (`inputTokens`、`outputTokens`、`totalTokens`、`contextTokens`)。客戶端不會解析 JSONL 訊息紀錄來「修正」總數。

## 狀態所在的儲存位置

- 在**閘道主機**上：
  - 儲存檔案：`~/.openclaw/agents/<agentId>/sessions/sessions.json` (每個 Agent)。
- 訊息紀錄：`~/.openclaw/agents/<agentId>/sessions/<SessionId>.jsonl` (Telegram 主題會話使用 `.../<SessionId>-topic-<threadId>.jsonl`)。
- 儲存是一個 map `sessionKey -> { sessionId, updatedAt, ... }`。刪除條目是安全的；它們會按需重建。
- 群組條目可能包含 `displayName`、`channel`、`subject`、`room` 和 `space`，以便在 UI 中標記會話。
- 會話條目包含 `origin` 元資料 (標籤 + 路由提示)，以便 UI 能說明會話的來源。
- OpenClaw **不會**讀取舊版 Pi/Tau 會話資料夾。

## 維護

OpenClaw 套用會話儲存維護，以隨時間控制 `sessions.json` 和訊息紀錄工件的規模。

### 預設值

- `session.maintenance.mode`: `warn`
- `session.maintenance.pruneAfter`: `30d`
- `session.maintenance.maxEntries`: `500`
- `session.maintenance.rotateBytes`: `10mb`
- `session.maintenance.resetArchiveRetention`: 預設為 `pruneAfter` (`30d`)
- `session.maintenance.maxDiskBytes`: 未設定 (已停用)
- `session.maintenance.highWaterBytes`: 啟用預算控制時，預設為 `maxDiskBytes` 的 `80%`

### 運作方式

維護作業會在寫入會話儲存時執行，您也可以使用 `openclaw sessions cleanup` 按需觸發。

- `mode: "warn"`: 回報將被清除的內容，但不會修改條目/訊息紀錄。
- `mode: "enforce"`: 依此順序套用清理：
  1. 清除早於 `pruneAfter` 的過期條目
  2. 將條目數量限制為 `maxEntries` (由舊到新)
  3. 封存不再被參照之已移除項目的文字記錄檔案
  4. 根據保留原則清除舊的 `*.deleted.<timestamp>` 和 `*.reset.<timestamp>` 存檔
  5. 當 `sessions.json` 超過 `rotateBytes` 時進行輪替
  6. 如果設定了 `maxDiskBytes`，則對 `highWaterBytes` 執行磁碟預算（先清理最舊的工件，再清理最舊的會話）

### 大型存儲的效能注意事項

大型會話存儲在高吞吐量的設置中很常見。維護作業屬於寫入路徑工作，因此非常大的存儲可能會增加寫入延遲。

最會增加成本的因素：

- 非常高的 `session.maintenance.maxEntries` 值
- 過長的 `pruneAfter` 視窗會導致過時條目留存
- `~/.openclaw/agents/<agentId>/sessions/` 中有大量的文字紀錄/歸檔工件
- 啟用磁碟預算 (`maxDiskBytes`) 但未設定合理的修剪/上限

建議做法：

- 在生產環境中使用 `mode: "enforce"`，以便自動限制增長
- 同時設定時間和計數限制 (`pruneAfter` + `maxEntries`)，而不僅僅是其中之一
- 設定 `maxDiskBytes` + `highWaterBytes` 作為大型部署中的硬性上限
- 將 `highWaterBytes` 保持在低於 `maxDiskBytes` 的有意義水平（預設為 80%）
- 在設定變更後執行 `openclaw sessions cleanup --dry-run --json`，以便在強制執行前驗證預期影響
- 對於頻繁的活躍會話，在執行手動清理時傳遞 `--active-key`

### 自訂範例

使用保守的強制執行策略：

```json5
{
  session: {
    maintenance: {
      mode: "enforce",
      pruneAfter: "45d",
      maxEntries: 800,
      rotateBytes: "20mb",
      resetArchiveRetention: "14d",
    },
  },
}
```

為會話目錄啟用硬碟配額：

```json5
{
  session: {
    maintenance: {
      mode: "enforce",
      maxDiskBytes: "1gb",
      highWaterBytes: "800mb",
    },
  },
}
```

針對較大型安裝進行微調（範例）：

```json5
{
  session: {
    maintenance: {
      mode: "enforce",
      pruneAfter: "14d",
      maxEntries: 2000,
      rotateBytes: "25mb",
      maxDiskBytes: "2gb",
      highWaterBytes: "1.6gb",
    },
  },
}
```

從 CLI 預覽或強制執行維護：

```bash
openclaw sessions cleanup --dry-run
openclaw sessions cleanup --enforce
```

## 會話修剪

OpenClaw 預設會在 LLM 呼叫之前，從記憶體內容中修剪**舊的工具結果**。
這**不會**重寫 JSONL 歷史紀錄。請參閱 [/concepts/session-pruning](/zh-Hant/concepts/session-pruning)。

## 壓縮前的記憶體清理

當會話接近自動壓縮時，OpenClaw 可以執行**靜默記憶體刷新**
以提醒模型將持久化的筆記寫入磁碟。這僅在工作區可寫時執行。請參閱 [Memory](/zh-Hant/concepts/memory) 和
[Compaction](/zh-Hant/concepts/compaction)。

## 傳輸對應 → 會話金鑰

- 直接聊天遵循 `session.dmScope`（預設為 `main`）。
  - `main`： `agent:<agentId>:<mainKey>`（跨裝置/管道的連續性）。
    - 多個電話號碼和通道可以對應到同一個代理程式主金鑰；它們充當進入同一個對話的傳輸通道。
  - `per-peer`： `agent:<agentId>:direct:<peerId>`。
  - `per-channel-peer`： `agent:<agentId>:<channel>:direct:<peerId>`。
  - `per-account-channel-peer`： `agent:<agentId>:<channel>:<accountId>:direct:<peerId>`（accountId 預設為 `default`）。
  - 如果 `session.identityLinks` 符合提供者前綴的 peer id（例如 `telegram:123`），則規範金鑰會取代 `<peerId>`，以便同一個人在不同頻道之間共用一個 session。
- 群組聊天會隔離狀態：`agent:<agentId>:<channel>:group:<id>`（房間/頻道使用 `agent:<agentId>:<channel>:channel:<id>`）。
  - Telegram 論壇主題會將 `:topic:<threadId>` 附加到群組 id 以進行隔離。
  - 為了遷移，仍會辨識舊版 `group:<id>` 金鑰。
- 輸入語境可能仍會使用 `group:<id>`；頻道是從 `Provider` 推斷出來的，並正規化為規範的 `agent:<agentId>:<channel>:group:<id>` 形式。
- 其他來源：
  - Cron 工作：`cron:<job.id>`（隔離）或自訂 `session:<custom-id>`（持久）
  - Webhooks：`hook:<uuid>`（除非由 hook 明確設定）
  - Node 執行：`node-<nodeId>`

## 生命週期

- 重置策略：會話會被重複使用直到過期，過期評估會在下一次收到傳入訊息時進行。
- 每日重置：預設為 **閘道主機上的當地時間上午 4:00**。一旦會話的最後更新時間早於最近的每日重置時間，該會話即視為過時。
- 閒置重設（可選）：`idleMinutes` 會增加一個滑動閒置視窗。當同時設定了每日和閒置重設時，**任一個先到期** 都會強制建立新的 session。
- 舊版僅閒置模式：如果您設定 `session.idleMinutes` 但沒有設定任何 `session.reset`/`resetByType` 設定，OpenClaw 為了向後相容性會保持僅閒置模式。
- 各類型覆寫（可選）：`resetByType` 讓您能夠覆寫 `direct`、`group` 和 `thread` session 的原則（thread = Slack/Discord 串列、Telegram 主題、以及當連接器提供時的 Matrix 串列）。
- 各頻道覆寫（可選）：`resetByChannel` 會覆寫某個頻道的重設原則（適用於該頻道所有類型的 session，並優先於 `reset`/`resetByType`）。
- 重置觸發器：精確的 `/new` 或 `/reset`（加上 `resetTriggers` 中的任何額外內容）會啟動一個新的 session id 並將訊息的其餘部分傳遞過去。`/new <model>` 接受模型別名、`provider/model` 或提供者名稱（模糊匹配）來設定新的 session 模型。如果單獨發送 `/new` 或 `/reset`，OpenClaw 會運行一個簡短的「hello」問候輪次以確認重置。
- 手動重置：從存儲中刪除特定金鑰或刪除 JSONL 轉錄文件；下一條訊息將重新建立它們。
- 獨立的 cron 任務每次運行總是會建立一個新的 `sessionId`（不重複使用閒置的）。

## 發送策略（可選）

封鎖特定會話類型的傳送，而無需列出各個 id。

```json5
{
  session: {
    sendPolicy: {
      rules: [
        { action: "deny", match: { channel: "discord", chatType: "group" } },
        { action: "deny", match: { keyPrefix: "cron:" } },
        // Match the raw session key (including the `agent:<id>:` prefix).
        { action: "deny", match: { rawKeyPrefix: "agent:main:discord:" } },
      ],
      default: "allow",
    },
  },
}
```

運行時覆寫（�限擁有者）：

- `/send on` → 允許此 session
- `/send off` → 拒絕此 session
- `/send inherit` → 清除覆寫並使用設定規則
  將這些作為獨立訊息發送以便註冊。

## 配置（可選重新命名範例）

```json5
// ~/.openclaw/openclaw.json
{
  session: {
    scope: "per-sender", // keep group keys separate
    dmScope: "main", // DM continuity (set per-channel-peer/per-account-channel-peer for shared inboxes)
    identityLinks: {
      alice: ["telegram:123456789", "discord:987654321012345678"],
    },
    reset: {
      // Defaults: mode=daily, atHour=4 (gateway host local time).
      // If you also set idleMinutes, whichever expires first wins.
      mode: "daily",
      atHour: 4,
      idleMinutes: 120,
    },
    resetByType: {
      thread: { mode: "daily", atHour: 4 },
      direct: { mode: "idle", idleMinutes: 240 },
      group: { mode: "idle", idleMinutes: 120 },
    },
    resetByChannel: {
      discord: { mode: "idle", idleMinutes: 10080 },
    },
    resetTriggers: ["/new", "/reset"],
    store: "~/.openclaw/agents/{agentId}/sessions/sessions.json",
    mainKey: "main",
  },
}
```

## 檢查

- `openclaw status` — 顯示儲存路徑和最近的 session。
- `openclaw sessions --json` — 傾印每個條目（使用 `--active <minutes>` 進行過濾）。
- `openclaw gateway call sessions.list --params '{}'` — 從正在運行的 gateway 獲取 session（使用 `--url`/`--token` 進行遠端 gateway 存取）。
- 在聊天中將 `/status` 作為獨立訊息發送，以查看 agent 是否可達、使用了多少 session 上下文、當前的思考/快速/詳細開關，以及您的 WhatsApp web 憑證上次更新的時間（有助於發現需要重新連結的情況）。
- 發送 `/context list` 或 `/context detail` 以查看系統提示和注入的工作區檔案中的內容（以及最大的上下文貢獻者）。
- 發送 `/stop`（或獨立的中止短語，如 `stop`、`stop action`、`stop run`、`stop openclaw`）以中止當前運行、清除該 session 排隊的後續操作，並停止從其產生的任何子 agent 運行（回覆包含已停止的計數）。
- 將 `/compact`（可選指令）作為獨立訊息發送，以摘要較舊的上下文並釋放視窗空間。參見 [/concepts/compaction](/zh-Hant/concepts/compaction)。
- 可以直接打開 JSONL 轉錄文件以查看完整的對話輪次。

## 提示

- 將主金鑰專用於 1:1 流量；讓群組保留自己的金鑰。
- 自動執行清理時，刪除單個金鑰而不是整個存儲，以保留其他地方的上下文。

## Session 來源元資料

每個會話條目會記錄其來源（盡最大努力）於 `origin`：

- `label`：人類可讀的標籤（從對話標籤 + 群組主題/頻道解析而來）
- `provider`：標準化的頻道 ID（包括擴展功能）
- `from`/`to`：來自入站封包的原始路由 ID
- `accountId`：提供商帳號 ID（當為多帳號時）
- `threadId`：當頻道支援時的執行緒/主題 ID
  起源欄位會針對直接訊息、頻道和群組進行填寫。如果連接器僅更新傳遞路由（例如，為了保持 DM 主會話處於最新狀態），它仍應提供入站上下文，以便會話保留其解釋元資料。擴充功能可以透過在入站上下文中傳送 `ConversationLabel`、
  `GroupSubject`、`GroupChannel`、`GroupSpace` 和 `SenderName`，並呼叫 `recordSessionMetaFromInbound`（或將相同的上下文傳遞給 `updateLastRoute`）來實現此目的。

import en from "/components/footer/en.mdx";

<en />
