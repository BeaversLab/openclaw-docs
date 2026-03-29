---
summary: "深入探討：會話存儲 + 轉錄、生命週期和（自動）壓縮內部機制"
read_when:
  - You need to debug session ids, transcript JSONL, or sessions.json fields
  - You are changing auto-compaction behavior or adding “pre-compaction” housekeeping
  - You want to implement memory flushes or silent system turns
title: "會話管理深入探討"
---

# 會話管理與壓縮（深入探討）

本文說明 OpenClaw 如何端到端地管理會話：

- **會話路由**（傳入訊息如何對應到 `sessionKey`）
- **會話存儲**（`sessions.json`）及其追蹤內容
- **轉錄持久化**（`*.jsonl`）及其結構
- **轉錄整理**（執行前的提供者特定修正）
- **上下文限制**（上下文視窗 vs 追蹤的 token）
- **壓縮**（手動 + 自動壓縮）以及在哪裡掛載預壓縮工作
- **靜默維護**（例如，不應產生用戶可見輸出的記憶體寫入）

如果您想先了解高階概述，請從以下內容開始：

- [/concepts/session](/en/concepts/session)
- [/concepts/compaction](/en/concepts/compaction)
- [/concepts/session-pruning](/en/concepts/session-pruning)
- [/reference/transcript-hygiene](/en/reference/transcript-hygiene)

---

## 事實來源：閘道器

OpenClaw 的設計圍繞著單一擁有會話狀態的 **閘道器程序**。

- 用戶介面（macOS 應用程式、網頁控制介面、TUI）應向閘道器查詢會話列表和 token 計數。
- 在遠端模式下，會話檔案位於遠端主機上；「檢查您的本地 Mac 檔案」不會反映閘道器的使用情況。

---

## 兩個持久化層

OpenClaw 在兩個層中持久化會話：

1. **會話存儲（`sessions.json`）**
   - 鍵/值映射：`sessionKey -> SessionEntry`
   - 小巧、可變、安全可編輯（或刪除條目）
   - 追蹤會話元數據（當前會話 ID、最後活動時間、切換、token 計數器等）

2. **轉錄（`<sessionId>.jsonl`）**
   - 具有樹狀結構的僅追加轉錄（條目具有 `id` + `parentId`）
   - 儲存實際的對話 + 工具調用 + 壓縮摘要
   - 用於為未來的輪次重建模型上下文

---

## 磁碟位置

每個代理，位於閘道器主機上：

- 存儲：`~/.openclaw/agents/<agentId>/sessions/sessions.json`
- 轉錄：`~/.openclaw/agents/<agentId>/sessions/<sessionId>.jsonl`
  - Telegram 主題會話：`.../<sessionId>-topic-<threadId>.jsonl`

OpenClaw 透過 `src/config/sessions.ts` 解析這些內容。

---

## 儲存庫維護與磁碟控制

會話持久化具備自動維護控制（`session.maintenance`），適用於 `sessions.json` 和對話紀錄構件：

- `mode`：`warn`（預設）或 `enforce`
- `pruneAfter`：過時條目年限截斷（預設 `30d`）
- `maxEntries`：限制 `sessions.json` 中的條目數（預設 `500`）
- `rotateBytes`：當 `sessions.json` 超過大小時輪替（預設 `10mb`）
- `resetArchiveRetention`：`*.reset.<timestamp>` 對話紀錄封存的保留期限（預設：同 `pruneAfter`；`false` 停用清理）
- `maxDiskBytes`：可選的 sessions-directory 預算
- `highWaterBytes`：清理後的可選目標（預設 `80%` 為 `maxDiskBytes`）

磁碟預算清理的執行順序（`mode: "enforce"`）：

1. 先移除最舊的封存或孤立的對話紀錄構件。
2. 如果仍高於目標，則驅逐最舊的會話條目及其對話紀錄檔案。
3. 持續進行直到使用量低於或等於 `highWaterBytes`。

在 `mode: "warn"` 中，OpenClaw 會回報潛在的驅逐對象，但不會變更儲存庫/檔案。

隨需執行維護：

```bash
openclaw sessions cleanup --dry-run
openclaw sessions cleanup --enforce
```

---

## Cron 會話與執行日誌

獨立的 cron 執行也會建立會話條目/對話紀錄，並且有專用的保留控制：

- `cron.sessionRetention`（預設 `24h`）會從會話儲存庫中修剪舊的獨立 cron 執行會話（`false` 停用）。
- `cron.runLog.maxBytes` + `cron.runLog.keepLines` 會修剪 `~/.openclaw/cron/runs/<jobId>.jsonl` 檔案（預設值：`2_000_000` 位元組和 `2000` 行）。

---

## Session 金鑰（`sessionKey`）

`sessionKey` 標識您處於哪個「對話桶」中（路由 + 隔離）。

常見模式：

- 主要/直接聊天（每個 Agent）：`agent:<agentId>:<mainKey>`（預設 `main`）
- 群組：`agent:<agentId>:<channel>:group:<id>`
- 房間/頻道（Discord/Slack）：`agent:<agentId>:<channel>:channel:<id>` 或 `...:room:<id>`
- Cron：`cron:<job.id>`
- Webhook：`hook:<uuid>`（除非被覆蓋）

標準規則記錄在 [/concepts/session](/en/concepts/session)。

---

## Session ID (`sessionId`)

每個 `sessionKey` 指向當前的 `sessionId`（即延續對話的文字記錄檔案）。

經驗法則：

- **重置**（`/new`、`/reset`）會為該 `sessionKey` 建立新的 `sessionId`。
- **每日重置**（預設為閘道主機當地時間凌晨 4:00）會在重置界限後的下一則訊息時建立新的 `sessionId`。
- **閒置過期**（`session.reset.idleMinutes` 或舊版 `session.idleMinutes`）會在閒置視窗後收到訊息時建立新的 `sessionId`。當同時設定了每日重置與閒置過期時，以先到期者為準。
- **執行緒父層分叉防護**（`session.parentForkMaxTokens`，預設 `100000`）會在父層 Session 已經過大時跳過父層文字記錄的分叉；新執行緒會重新開始。設定 `0` 以停用。

實作細節：決策發生在 `src/auto-reply/reply/session.ts` 的 `initSessionState()` 中。

---

## Session 存儲架構 (`sessions.json`)

存儲的值類型是 `src/config/sessions.ts` 中的 `SessionEntry`。

主要欄位（非詳盡列表）：

- `sessionId`：當前的文字記錄 ID（檔名衍生自此，除非設定了 `sessionFile`）
- `updatedAt`：最後活動時間戳
- `sessionFile`：可選的明確文字記錄路徑覆蓋
- `chatType`: `direct | group | room` (協助 UI 和發送策略)
- `provider`, `subject`, `room`, `space`, `displayName`: 用於群組/頻道標籤的元資料
- 切換開關：
  - `thinkingLevel`, `verboseLevel`, `reasoningLevel`, `elevatedLevel`
  - `sendPolicy` (每個工作階段的覆寫)
- 模型選擇：
  - `providerOverride`, `modelOverride`, `authProfileOverride`
- Token 計數器 (盡力而為 / 取決於提供者)：
  - `inputTokens`, `outputTokens`, `totalTokens`, `contextTokens`
- `compactionCount`: 此工作階段金鑰的自動壓縮完成頻率
- `memoryFlushAt`: 上次預壓縮記憶體排清的時間戳記
- `memoryFlushCompactionCount`: 上次排清執行時的壓縮計數

存放區可以安全編輯，但 Gateway 是最高權威：它可能會在工作階段執行時重寫或重新填充條目。

---

## 文字記錄結構 (`*.jsonl`)

文字記錄由 `@mariozechner/pi-coding-agent` 的 `SessionManager` 管理。

該檔案為 JSONL 格式：

- 第一行：工作階段標頭 (`type: "session"`，包含 `id`、`cwd`、`timestamp`，選用 `parentSession`)
- 接著：帶有 `id` + `parentId` (樹) 的工作階段條目

值得注意的條目類型：

- `message`: 使用者/助理/工具結果訊息
- `custom_message`: 擴充功能注入且*會*進入模型語境的訊息 (可以從 UI 隱藏)
- `custom`: *不會*進入模型語境的擴充功能狀態
- `compaction`: 帶有 `firstKeptEntryId` 和 `tokensBefore` 的持久化壓縮摘要
- `branch_summary`: 瀏覽樹狀分支時的持久化摘要

OpenClaw 故意**不**「修補」文字紀錄；Gateway 使用 `SessionManager` 來讀寫它們。

---

## 內容視窗與追蹤的 Tokens

有兩個不同的概念很重要：

1. **模型內容視窗**：每個模型的硬性上限（模型可見的 tokens）
2. **Session 存儲計數器**：寫入 `sessions.json` 的滾動統計資料（用於 /status 和儀表板）

如果您正在調整限制：

- 內容視窗來自模型目錄（並且可以透過配置覆寫）。
- 存儲中的 `contextTokens` 是一個執行時期估算/回報值；不要將其視為嚴格的保證。

欲了解更多資訊，請參閱 [/token-use](/en/reference/token-use)。

---

## 壓縮：它是什麼

壓縮會將較舊的對話摘要為文字紀錄中持續存在的 `compaction` 條目，並保持最近的訊息完整不變。

壓縮後，未來的輪次會看到：

- 壓縮摘要
- `firstKeptEntryId` 之後的訊息

壓縮是**持久性**的（與 session 修剪不同）。請參閱 [/concepts/session-pruning](/en/concepts/session-pruning)。

---

## 自動壓縮何時發生（Pi 執行時期）

在嵌入式 Pi 代理中，自動壓縮會在兩種情況下觸發：

1. **溢出恢復**：模型返回內容溢出錯誤 → 壓縮 → 重試。
2. **閾值維護**：在成功的輪次之後，當：

`contextTokens > contextWindow - reserveTokens`

其中：

- `contextWindow` 是模型的內容視窗
- `reserveTokens` 是為提示和下一個模型輸出保留的餘量

這些是 Pi 執行時期的語義（OpenClaw 消費事件，但 Pi 決定何時壓縮）。

---

## 壓縮設定 (`reserveTokens`, `keepRecentTokens`)

Pi 的壓縮設定位於 Pi 設定中：

```json5
{
  compaction: {
    enabled: true,
    reserveTokens: 16384,
    keepRecentTokens: 20000,
  },
}
```

OpenClaw 還會為嵌入式執行強制執行一個安全底線：

- 如果 `compaction.reserveTokens < reserveTokensFloor`，OpenClaw 會提高它。
- 預設底線是 `20000` 個 tokens。
- 設定 `agents.defaults.compaction.reserveTokensFloor: 0` 以停用底線。
- 如果它已經更高，OpenClaw 將不予干預。

原因：在壓縮變得不可避免之前，為多輪次「內務管理」（如記憶體寫入）留出足夠的餘量。

實作：`ensurePiCompactionReserveTokens()` 於 `src/agents/pi-settings.ts` 中
（由 `src/agents/pi-embedded-runner.ts` 呼叫）。

---

## 使用者可見介面

您可以透過以下方式觀察壓縮和會話狀態：

- `/status`（於任何聊天會話中）
- `openclaw status` (CLI)
- `openclaw sessions` / `sessions --json`
- 詳細模式：`🧹 Auto-compaction complete` + 壓縮計數

---

## 靜音維護 (`NO_REPLY`)

OpenClaw 支援背景任務的「靜音」輪次，使用者不應看到中間輸出。

慣例：

- 助理以其輸出開頭加上 `NO_REPLY` 來表示「不要傳送回覆給使用者」。
- OpenClaw 會在傳遞層中剝離/隱藏此內容。

自 `2026.1.10` 起，當部分區塊以 `NO_REPLY` 開頭時，OpenClaw 也會隱藏 **草稿/輸入串流**，因此靜音操作不會在輪次中途洩漏部分輸出。

---

## 壓縮前「記憶體清除」（已實作）

目標：在自動壓縮發生之前，執行靜音的代理輪次，將持久化狀態寫入磁碟（例如代理工作區中的 `memory/YYYY-MM-DD.md`），以便壓縮無法刪除關鍵上下文。

OpenClaw 使用**閾值前清除**方法：

1. 監控會話上下文使用量。
2. 當它超過「軟閾值」（低於 Pi 的壓縮閾值）時，執行靜音的
   「立即寫入記憶體」指令給代理。
3. 使用 `NO_REPLY`，以便使用者什麼也看不到。

設定 (`agents.defaults.compaction.memoryFlush`)：

- `enabled` (預設值： `true`)
- `softThresholdTokens` (預設值： `4000`)
- `prompt` (清除輪次的使用者訊息)
- `systemPrompt` (為清除輪次附加的額外系統提示)

註記：

- 預設提示/系統提示包含 `NO_REPLY` 提示以隱藏傳遞。
- 清除每個壓縮週期執行一次（在 `sessions.json` 中追蹤）。
- 清除僅針對內嵌的 Pi 會話執行（CLI 後端會跳過它）。
- 當 session 工作區為唯讀時（`workspaceAccess: "ro"` 或 `"none"`），會跳過排清。
- 請參閱 [記憶體](/en/concepts/memory) 以了解工作區檔案佈局和寫入模式。

Pi 也在擴充功能 API 中公開了 `session_before_compact` hook，但 OpenClaw 的排清邏輯目前位於 Gateway 端。

---

## 疑難排解檢查清單

- Session key 錯誤？請從 [/concepts/session](/en/concepts/session) 開始，並確認 `sessionKey` 中的 `/status`。
- Store 與 transcipt 不符？請從 `openclaw status` 確認 Gateway 主機和 store 路徑。
- 壓縮垃圾訊息？請檢查：
  - model context window（太小）
  - 壓縮設定（對於 model window 來說 `reserveTokens` 太高可能會導致提早壓縮）
  - tool-result bloat：啟用/調整 session pruning
- Silent turns 洩漏？請確認回覆以 `NO_REPLY`（精確 token）開頭，且您所在的版本包含串流抑制修復。
