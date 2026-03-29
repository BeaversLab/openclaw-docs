---
summary: "Session management rules, keys, and persistence for chats"
read_when:
  - Modifying session handling or storage
title: "Session Management"
---

# Session Management

OpenClaw 將 **每個 Agent 一個直接聊天會話** 視為主要。直接聊天會合併至 `agent:<agentId>:<mainKey>`（預設 `main`），而群組/頻道聊天則有自己的金鑰。`session.mainKey` 受到尊重。

使用 `session.dmScope` 來控制 **直接訊息** 的分組方式：

- `main`（預設）：所有 DM 共用主要會話以保持連續性。
- `per-peer`：跨頻道依發送者 ID 隔離。
- `per-channel-peer`：依頻道 + 發送者隔離（建議用於多使用者收件匣）。
- `per-account-channel-peer`：依帳號 + 頻道 + 發送者隔離（建議用於多帳號收件匣）。
  使用 `session.identityLinks` 將提供者前綴的對等 ID 對應到規範身分，以便在使用 `per-peer`、`per-channel-peer` 或 `per-account-channel-peer` 時，同一個人跨頻道共用 DM 會話。

## Secure DM mode (recommended for multi-user setups)

> **安全警告：** 如果您的 Agent 可以接收來自 **多個人** 的 DM，您應該強烈考慮啟用安全 DM 模式。如果沒有啟用，所有使用者將共用相同的對話上下文，這可能會在使用者之間洩漏私人資訊。

**預設設定下的問題範例：**

- Alice（`<SENDER_A>`） 傳訊息給您的 Agent 詢問私人主題（例如，預約醫療）
- Bob（`<SENDER_B>`） 傳訊息給您的 Agent 詢問「我們剛剛在討論什麼？」
- 由於兩個 DM 共用同一個會話，模型可能會使用 Alice 之前的上下文來回答 Bob。

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
- 您使用包含多個項目的 DM 允許清單
- 您設定了 `dmPolicy: "open"`
- 多個電話號碼或帳號可以傳訊息給您的 Agent

備註：

- 預設值為 `dmScope: "main"` 以保持連續性（所有 DM 共享主會話）。這對於單用戶設定來說沒有問題。
- Local CLI 入門程序在未設定時預設會寫入 `session.dmScope: "per-channel-peer"`（既有的明確值將會被保留）。
- 對於同一頻道上的多帳號收件匣，建議使用 `per-account-channel-peer`。
- 如果同一個人透過多個頻道聯繫您，請使用 `session.identityLinks` 將其 DM 會話合併為一個標準身分。
- 您可以使用 `openclaw security audit` 驗證您的 DM 設定（請參閱 [security](/en/cli/security)）。

## Gateway 是唯一的真相來源

所有會話狀態均**由 gateway 擁有**（即「主控」 OpenClaw）。UI 用戶端（macOS 應用程式、WebChat 等）必須向 gateway 查詢會話列表和 token 計數，而不是讀取本地檔案。

- 在 **remote mode** 中，您關注的會話儲存位於遠端 gateway 主機上，而非您的 Mac。
- UI 中顯示的 token 計數來自 gateway 的儲存欄位（`inputTokens`、`outputTokens`、`totalTokens`、`contextTokens`）。用戶端不會解析 JSONL 訊息紀錄來「修正」總數。

## 狀態存放位置

- 在 **gateway 主機** 上：
  - 儲存檔案：`~/.openclaw/agents/<agentId>/sessions/sessions.json`（每個 agent 一個）。
- 訊息紀錄：`~/.openclaw/agents/<agentId>/sessions/<SessionId>.jsonl`（Telegram 主題會話使用 `.../<SessionId>-topic-<threadId>.jsonl`）。
- 儲存是一個映射 `sessionKey -> { sessionId, updatedAt, ... }`。刪除條目是安全的；它們會按需重建。
- 群組條目可能包含 `displayName`、`channel`、`subject`、`room` 和 `space`，以便在 UI 中標示會話。
- 會話條目包含 `origin` 元資料（標籤 + 路由提示），以便 UI 能夠說明會話的來源。
- OpenClaw **不會**讀取舊版 Pi/Tau 會話資料夾。

## 維護

OpenClaw 套用會話儲存維護，以隨時間控制 `sessions.json` 和訊息紀錄工件的規模。

### 預設值

- `session.maintenance.mode`: `warn`
- `session.maintenance.pruneAfter`: `30d`
- `session.maintenance.maxEntries`：`500`
- `session.maintenance.rotateBytes`：`10mb`
- `session.maintenance.resetArchiveRetention`：預設為 `pruneAfter`（`30d`）
- `session.maintenance.maxDiskBytes`：未設定（已停用）
- `session.maintenance.highWaterBytes`：當啟用預算時，預設為 `80%` 的 `maxDiskBytes`

### 運作方式

維護作業在寫入階段儲存（session-store）時執行，您也可以使用 `openclaw sessions cleanup` 按需觸發。

- `mode: "warn"`：回報將被清除的內容但不變更條目/逐字稿。
- `mode: "enforce"`：依此順序執行清理：
  1. 清除早於 `pruneAfter` 的過期條目
  2. 將條目數量上限設為 `maxEntries`（優先清除最舊的）
  3. 封存已移除且不再被參照的條目之逐字稿檔案
  4. 根據保留原則清除舊的 `*.deleted.<timestamp>` 和 `*.reset.<timestamp>` 封存
  5. 當 `sessions.json` 超過 `rotateBytes` 時進行輪替
  6. 如果設定了 `maxDiskBytes`，則對 `highWaterBytes` 執行磁碟預算限制（優先清除最舊的成品，接著是最舊的工作階段）

### 大型儲存的效能注意事項

大型階段儲存在高流量設定中很常見。維護工作屬於寫入路徑工作，因此非常大的儲存可能會增加寫入延遲。

最增加成本的因素：

- 非常高的 `session.maintenance.maxEntries` 數值
- 長 `pruneAfter` 視窗會保留過期條目
- `~/.openclaw/agents/<agentId>/sessions/` 中有許多逐字稿/封存成品
- 在沒有合理的修剪/上限限制下啟用磁碟預算（`maxDiskBytes`）

處理方式：

- 在生產環境中使用 `mode: "enforce"` 以自動限制成長
- 同時設定時間和數量限制（`pruneAfter` + `maxEntries`），而不僅僅是其中之一
- 為大型部署設定 `maxDiskBytes` + `highWaterBytes` 作為硬性上限
- 將 `highWaterBytes` 保持在 `maxDiskBytes` 以下有意義的數值（預設為 80%）
- 在配置變更後執行 `openclaw sessions cleanup --dry-run --json`，以便在強制執行前驗證預期的影響
- 對於頻繁的活動會話，在執行手動清理時傳遞 `--active-key`

### 自訂範例

使用保守的強制執行政策：

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

為會話目錄啟用硬碟預算：

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

OpenClaw 預設會在 LLM 呼叫之前，從記憶體內容中修剪**舊的工具結果**。
這**不會**重寫 JSONL 歷史記錄。請參閱 [/concepts/session-pruning](/en/concepts/session-pruning)。

## 壓縮前記憶體清除

當會話接近自動壓縮時，OpenClaw 可以執行**靜默記憶體清除**
回合，以提醒模型將持久化筆記寫入磁碟。這僅在工作區可寫入時運作。
請參閱 [Memory](/en/concepts/memory) 和
[Compaction](/en/concepts/compaction)。

## 傳輸映射 → 會話金鑰

- 直接聊天遵循 `session.dmScope`（預設 `main`）。
  - `main`：`agent:<agentId>:<mainKey>`（跨裝置/頻道的連續性）。
    - 多個電話號碼和頻道可以映射到同一個代理主要金鑰；它們充當進入同一對話的傳輸通道。
  - `per-peer`：`agent:<agentId>:direct:<peerId>`。
  - `per-channel-peer`：`agent:<agentId>:<channel>:direct:<peerId>`。
  - `per-account-channel-peer`：`agent:<agentId>:<channel>:<accountId>:direct:<peerId>`（accountId 預設為 `default`）。
  - 如果 `session.identityLinks` 符合提供者前綴的對等 ID（例如 `telegram:123`），則標準金鑰會取代 `<peerId>`，因此同一個人跨頻道共用一個會話。
- 群組聊天會隔離狀態：`agent:<agentId>:<channel>:group:<id>`（房間/頻道使用 `agent:<agentId>:<channel>:channel:<id>`）。
  - Telegram 論壇主題會將 `:topic:<threadId>` 附加到群組 ID 以進行隔離。
  - 舊版 `group:<id>` 金鑰仍被識別以用於遷移。
- 輸入語境可能仍會使用 `group:<id>`；通道是從 `Provider` 推斷出來的，並標準化為正規的 `agent:<agentId>:<channel>:group:<id>` 形式。
- 其他來源：
  - Cron 任務：`cron:<job.id>`（隔離）或自訂 `session:<custom-id>`（持久）
  - Webhooks：`hook:<uuid>`（除非由 hook 明確設定）
  - 節點執行：`node-<nodeId>`

## 生命週期

- 重置政策：會話會被重複使用直到過期，過期時間會在下一個傳入訊息時進行評估。
- 每日重設：預設為 **閘道主機當地時間凌晨 4:00**。一旦會話的最後更新時間早於最近的每日重設時間，該會話即視為過期。
- 閒置重設（選用）：`idleMinutes` 會新增一個滑動閒置視窗。當同時設定了每日重設和閒置重設時，**任一先過期者** 會強制啟動新的會話。
- 舊版僅閒置模式：如果您設定了 `session.idleMinutes` 但未設定任何 `session.reset`/`resetByType` 配置，OpenClaw 將處於舊版相容的僅閒置模式。
- 按類型覆寫（選用）：`resetByType` 允許您覆寫 `direct`、`group` 和 `thread` 會話的政策（thread = Slack/Discord 串、Telegram 主題、以及由連接器提供的 Matrix 串）。
- 按通道覆寫（選用）：`resetByChannel` 會覆寫某個通道的重設政策（適用於該通道的所有會話類型，且優先順序高於 `reset`/`resetByType`）。
- 重置觸發條件：精確的 `/new` 或 `/reset`（加上 `resetTriggers` 中的任何額外內容）會啟動一個新的會話 ID 並將訊息的其餘部分傳遞下去。`/new <model>` 接受模型別名、`provider/model` 或提供者名稱（模糊比對）來設定新會話的模型。如果單獨發送 `/new` 或 `/reset`，OpenClaw 會執行一個簡短的「hello」問候回合以確認重置。
- 手動重置：從存儲中刪除特定金鑰或移除 JSONL 轉錄；下一條訊息將重新建立它們。
- 隔離的 cron 作業每次運行總是建立一個新的 `sessionId`（不復用閒置項）。

## 發送策略（可選）

無需列出各個 ID，即可封鎖特定會話類型的傳遞。

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

運行時覆蓋（僅限所有者）：

- `/send on` → 允許此會話
- `/send off` → 拒絕此會話
- `/send inherit` → 清除覆蓋並使用配置規則
  將這些作為獨立訊息發送，以便註冊。

## 配置（可選重命名範例）

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

- `openclaw status` — 顯示存儲路徑和最近的會話。
- `openclaw sessions --json` — 轉儲每個條目（使用 `--active <minutes>` 過濾）。
- `openclaw gateway call sessions.list --params '{}'` — 從運行中的網關獲取會話（使用 `--url`/`--token` 進行遠程網關訪問）。
- 在聊天中發送 `/status` 作為獨立訊息，以查看代理是否可連接、使用了多少會話上下文、當前的思考/快速/詳細切換狀態，以及您的 WhatsApp Web 憑證上次刷新的時間（有助於發現重新連結的需求）。
- 發送 `/context list` 或 `/context detail` 以查看系統提示和注入的工作區文件中的內容（以及最大的上下文貢獻者）。
- 發送 `/stop`（或獨立的中止短語，如 `stop`、`stop action`、`stop run`、`stop openclaw`）以中止當前運行，清除該會話排隊的後續操作，並停止從其生成的任何子代理運行（回覆包含停止計數）。
- 發送 `/compact`（可選指令）作為獨立訊息，以摘要較舊的上下文並釋放視窗空間。請參閱 [/concepts/compaction](/en/concepts/compaction)。
- 可以直接打開 JSONL 轉錄以查看完整的輪次。

## 提示

- 讓主金鑰專用於 1:1 流量；讓群組保留它們自己的金鑰。
- 在自動清理時，刪除單個金鑰而不是整個存儲，以保留其他地方的上下文。

## Session origin metadata

每個會話條目都會記錄其來源（盡最大努力）在 `origin` 中：

- `label`：人類可讀的標籤（從對話標籤 + 群組主題/頻道解析）
- `provider`：標準化的頻道 ID（包括擴展）
- `from`/`to`：來自入站信封的原始路由 ID
- `accountId`：提供商帳號 ID（當有多帳號時）
- `threadId`：當頻道支援時的執行緒/主題 ID
  這些來源欄位會為直接訊息、頻道和群組填入。如果連接器僅更新傳遞路由（例如，為了保持 DM
  主會話最新），它仍應提供入站上下文，以便會話保留其解釋性元數據。擴充功能可以透過在入站上下文中發送
  `ConversationLabel`、`GroupSubject`、`GroupChannel`、
  `GroupSpace` 和 `SenderName`，並呼叫 `recordSessionMetaFromInbound`
  （或將相同的上下文傳遞給 `updateLastRoute`）來做到這一點。
