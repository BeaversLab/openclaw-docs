---
summary: "聊天會話管理規則、金鑰與持久化"
read_when:
  - Modifying session handling or storage
title: "會話管理"
---

# 會話管理

OpenClaw 將 **每個代理程式一個直接聊天會話** 視為主要模式。直接聊天會合併至 `agent:<agentId>:<mainKey>`（預設為 `main`），而群組/頻道聊天則有自己的金鑰。`session.mainKey` 會受到尊重。

使用 `session.dmScope` 來控制 **直接訊息** 的分組方式：

- `main`（預設）：所有直接訊息共用主要會話以保持連續性。
- `per-peer`：跨頻道依據發送者 ID 隔離。
- `per-channel-peer`：依據頻道與發送者隔離（建議用於多使用者收件匣）。
- `per-account-channel-peer`：依帳號 + 頻道 + 發送者進行隔離（建議用於多帳號收件匣）。
  使用 `session.identityLinks` 將提供者前綴的對等 ID 對應到規範身分，以便在使用 `per-peer`、`per-channel-peer` 或 `per-account-channel-peer` 時，同一個人在不同頻道之間共用 DM 會話。

## 安全 DM 模式（建議用於多用戶設置）

> **安全警告：** 如果您的 Agent 可以接收來自 **多人** 的 DM，您應強烈考慮啟用安全 DM 模式。若未啟用，所有使用者將共用同一個對話語境，這可能導致使用者之間的私人資訊洩漏。

**預設設定下問題的範例：**

- Alice (`<SENDER_A>`) 傳訊息給您的 Agent 詢問私人主題（例如，醫療預約）
- Bob (`<SENDER_B>`) 訊息傳送給您的 Agent，問道「我們剛才在討論什麼？」
- 因為這兩個私訊共用同一個 session，模型可能會使用 Alice 先前的上下文來回答 Bob。

**解決方法：** 設定 `dmScope` 以按使用者隔離 session：

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

- 您擁有多個發送者的配對核准
- 您使用包含多個項目的私訊允許清單
- 您設定了 `dmPolicy: "open"`
- 多個電話號碼或帳戶可以傳送訊息給您的 Agent

備註：

- 預設為 `dmScope: "main"` 以保持連續性（所有私訊共用主 session）。這適用於單一使用者設定。
- 本機 CLI 入門流程若未設定會預設寫入 `session.dmScope: "per-channel-peer"`（保留現有的明確值）。
- 對於同一頻道上的多帳戶收件匣，建議優先使用 `per-account-channel-peer`。
- 如果同一個人透過多個管道聯絡您，請使用 `session.identityLinks` 將其 DM 對話區塊合併為一個規範身分。
- 您可以使用 `openclaw security audit` 驗證您的 DM 設定（請參閱 [安全性](/zh-Hant/cli/security)）。

## 閘道為唯一真實來源

所有對話區狀態均**由閘道擁有**（即「主控」OpenClaw）。UI 用戶端（macOS 應用程式、WebChat 等）必須向閘道查詢對話區清單和 Token 計數，而非讀取本機檔案。

- 在**遠端模式**下，您關注的對話區存放位置位於遠端閘道主機，而非您的 Mac。
- UI 中顯示的 Token 計數來自閘道的存放欄位（`inputTokens`、`outputTokens`、`totalTokens`、`contextTokens`）。用戶端不會解析 JSONL 逐字稿來「修正」總數。

## 狀態存放位置

- 在**閘道主機**上：
  - 儲存檔案：`~/.openclaw/agents/<agentId>/sessions/sessions.json`（每個代理程式）。
- 對話記錄：`~/.openclaw/agents/<agentId>/sessions/<SessionId>.jsonl`（Telegram 主題會話使用 `.../<SessionId>-topic-<threadId>.jsonl`）。
- 儲存庫是一個映射 `sessionKey -> { sessionId, updatedAt, ... }`。刪除條目是安全的；它們會按需重建。
- 群組條目可能包含 `displayName`、`channel`、`subject`、`room` 和 `space`，以便在 UI 中標記會話。
- 會話條目包含 `origin` 元資料（標籤 + 路由提示），以便 UI 能解釋會話的來源。
- OpenClaw **不會** 讀取舊版 Pi/Tau 會話資料夾。

## 維護

OpenClaw 套用會話儲存庫維護，以使 `sessions.json` 和對話記錄檔案的大小隨時間保持受控。

### 預設值

- `session.maintenance.mode`: `warn`
- `session.maintenance.pruneAfter`: `30d`
- `session.maintenance.maxEntries`: `500`
- `session.maintenance.rotateBytes`: `10mb`
- `session.maintenance.resetArchiveRetention`: 預設為 `pruneAfter` (`30d`)
- `session.maintenance.maxDiskBytes`: 未設定（已停用）
- `session.maintenance.highWaterBytes`: 當啟用預算控制時，預設為 `maxDiskBytes` 的 `80%`

### 運作方式

維護作業會在寫入工作階段存放區時執行，您也可以使用 `openclaw sessions cleanup` 按需觸發。

- `mode: "warn"`: 回報將被淘汰的內容，但不會修改項目/文字紀錄。
- `mode: "enforce"`: 按以下順序套用清理：
  1. 修剪早於 `pruneAfter` 的過時條目
  2. 將條目數量限制在 `maxEntries`（優先移除最舊的）
  3. 封存不再被參照之已移除條目的逐字稿檔案
  4. 根據保留政策清除舊的 `*.deleted.<timestamp>` 和 `*.reset.<timestamp>` 封存
  5. 當 `sessions.json` 超過 `rotateBytes` 時進行輪替
  6. 如果設定了 `maxDiskBytes`，則對 `highWaterBytes` 執行磁碟預算限制（優先移除最舊的檔案，接著是最舊的工作階段）

### 大型儲存庫的效能注意事項

大型工作階段儲存庫在高吞吐量的設定中很常見。維護工作屬於寫入路徑的工作，因此非常大的儲存庫可能會增加寫入延遲。

最會增加成本的因素：

- 非常高的 `session.maintenance.maxEntries` 數值
- 長 `pruneAfter` 視窗會導致過時條目殘留
- `~/.openclaw/agents/<agentId>/sessions/` 中有大量的文字記錄/歸檔
- 啟用磁碟預算 (`maxDiskBytes`) 卻未設定合理的修剪/上限

解決方案：

- 在生產環境中使用 `mode: "enforce"`，以便自動限制增長
- 同時設定時間和計數限制 (`pruneAfter` + `maxEntries`)，不要只設定其中一個
- 在大規模部署中設定 `maxDiskBytes` + `highWaterBytes` 作為硬性上限
- 將 `highWaterBytes` 保持顯著低於 `maxDiskBytes` (預設為 80%)
- 變更設定後執行 `openclaw sessions cleanup --dry-run --json`，在強制執行前驗證預期影響
- 對於頻繁作用中的工作階段，執行手動清理時請傳遞 `--active-key`

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

為 sessions 目錄啟用硬碟配額：

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

針對較大型安裝進行調整（範例）：

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

OpenClaw 預設會在 LLM 呼叫前，從記憶體上下文中修剪 **舊的工具結果**。
這**不會**重寫 JSONL 歷史記錄。請參閱 [/concepts/session-pruning](/zh-Hant/concepts/session-pruning)。

## 壓縮前記憶體清理

當會話接近自動壓縮時，OpenClaw 可以執行 **靜默記憶體清理**
以提醒模型將持久化筆記寫入磁碟。這僅在工作區可寫入時執行。請參閱 [記憶體](/zh-Hant/concepts/memory) 和
[壓縮](/zh-Hant/concepts/compaction)。

## 傳輸映射 → 會話金鑰

- 直接聊天遵循 `session.dmScope`（預設 `main`）。
  - `main`：`agent:<agentId>:<mainKey>`（跨裝置/頻道的連續性）。
    - 多個電話號碼和頻道可以對應到同一個代理程式主金鑰；它們充當對話的傳輸通道。
  - `per-peer`：`agent:<agentId>:direct:<peerId>`。
  - `per-channel-peer`：`agent:<agentId>:<channel>:direct:<peerId>`。
  - `per-account-channel-peer`：`agent:<agentId>:<channel>:<accountId>:direct:<peerId>`（accountId 預設為 `default`）。
  - 如果 `session.identityLinks` 符合提供者前綴的對等 ID（例如 `telegram:123`），則標準金鑰會取代 `<peerId>`，以便同一個人在頻道之間共享一個工作階段。
- 群組聊天會隔離狀態：`agent:<agentId>:<channel>:group:<id>`（房間/頻道使用 `agent:<agentId>:<channel>:channel:<id>`）。
  - Telegram 論壇主題會將 `:topic:<threadId>` 附加到群組 ID 以進行隔離。
  - 為了遷移，仍會識別傳統的 `group:<id>` 金鑰。
- 輸入語境可能仍會使用 `group:<id>`；頻道是從 `Provider` 推斷出來的，並且會被正規化為標準的 `agent:<agentId>:<channel>:group:<id>` 形式。
- 其他來源：
  - Cron 作業：`cron:<job.id>` (isolated) 或自訂 `session:<custom-id>` (persistent)
  - Webhooks：`hook:<uuid>`（除非由 hook 明確設定）
  - 節點運行次數： `node-<nodeId>`

## 生命週期

- 重置策略：會話會被重複使用直到過期，而過期評估會在下一條傳入訊息時進行。
- 每日重設：預設為 **閘道主機當地時間凌晨 4:00**。一旦某個階段的最後更新時間早於最近的每日重設時間，該階段即視為過時。
- 閒置重置（可選）：`idleMinutes` 新增一個滑動閒置視窗。當同時設定了每日重置和閒置重置時，**任一先到期的**將強制開啟新會話。
- 舊版僅閒置模式：如果您設定 `session.idleMinutes` 但未設定任何 `session.reset`/`resetByType` 設定，OpenClaw 將為了向後相容性而保持在僅閒置模式。
- 各類型覆寫（可選）：`resetByType` 允許您覆寫 `direct`、`group` 和 `thread` 會話的策略（thread = Slack/Discord 串列、Telegram 主題、以及由連接器提供的 Matrix 串列）。
- 個別頻道覆寫（可選）：`resetByChannel` 會覆寫特定頻道的重置策略（適用於該頻道所有類型的會話，並優先於 `reset`/`resetByType`）。
- 重置觸發器：精確的 `/new` 或 `/reset`（加上 `resetTriggers` 中的任何額外內容）會啟動一個新的會話 ID，並傳遞訊息的剩餘部分。`/new <model>` 接受模型別名、`provider/model` 或提供者名稱（模糊比對）來設定新的會話模型。如果單獨發送 `/new` 或 `/reset`，OpenClaw 會執行一個簡短的「hello」問候回合以確認重置。
- 手動重置：從存儲中刪除特定金鑰或移除 JSONL 轉錄檔；下一則訊息將重新建立它們。
- 隔離的 cron jobs 每次執行總是會建立一個新的 `sessionId`（不會閒置重用）。

## 發送原則（選用）

封鎖特定會話類型的傳送，而無需列出個別 id。

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

執行時期覆寫（�限擁有者）：

- `/send on` → 允許此會話
- `/send off` → 拒絕此會話
- `/send inherit` → 清除覆寫並使用設定規則
  將這些作為獨立訊息傳送，以便它們註冊。

## 設定（選用重新命名範例）

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

- `openclaw status` — 顯示儲存路徑和最近的會話。
- `openclaw sessions --json` — 傾印每個條目（使用 `--active <minutes>` 進行過濾）。
- `openclaw gateway call sessions.list --params '{}'` — 從執行中的 gateway 取得會話（使用 `--url`/`--token` 進行遠端 gateway 存取）。
- 在聊天中傳送 `/status` 作為獨立訊息，以檢查代理是否可連線、使用了多少 session 上下文、目前的思考/快速/詳細切換狀態，以及您的 WhatsApp web 憑證上次重新整理的時間（有助於發現需要重新連結的情況）。
- 傳送 `/context list` 或 `/context detail` 以查看系統提示詞和注入的工作區檔案的內容（以及最大的上下文貢獻者）。
- 傳送 `/stop`（或單獨的中止短語如 `stop`、`stop action`、`stop run`、`stop openclaw`）以中止當前執行、清除該 session 的排隊後續操作，並停止由其產生的任何子代理執行（回覆中包含已停止的計數）。
- 傳送 `/compact`（可選指令）作為獨立訊息，以總結舊的上下文並釋放視窗空間。請參閱 [/concepts/compaction](/zh-Hant/concepts/compaction)。
- JSONL 逐字稿可以直接開啟以檢視完整的輪次。

## 提示

- 將主鍵專用於 1:1 流量；讓群組保留自己的金鑰。
- 在自動執行清理時，請刪除個別金鑰而非整個儲存空間，以保留其他地方的上下文。

## 會話來源元資料

每個會話條目都會在 `origin` 中記錄其來源（盡最大努力）：

- `label`：人類可讀標籤（從對話標籤 + 群組主題/頻道解析而來）
- `provider`：正規化頻道 ID（包括擴充功能）
- `from`/`to`：來自輸入信封的原始路由 ID
- `accountId`: 供應商帳戶 ID（多帳戶時）
- `threadId`: 當通道支援時的討論串/主題 ID
  起源欄位會為私人訊息、頻道和群組填入內容。如果
  連接器僅更新傳遞路由（例如，為了保持私人訊息主會話
  為最新），它仍應提供輸入上下文，以便會話保留其
  解說元資料。擴充功能可以透過在輸入
  上下文中傳送 `ConversationLabel`、
  `GroupSubject`、`GroupChannel`、`GroupSpace` 和 `SenderName` 並呼叫 `recordSessionMetaFromInbound`（或將相同的上下文
  傳遞給 `updateLastRoute`）來做到這一點。

import footerZhHant from "/components/footer/zh-Hant.mdx";

<footerZhHant />
