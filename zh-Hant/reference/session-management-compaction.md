---
summary: "深度解析：會話存儲 + 逐字稿、生命週期以及（自動）壓縮內部機制"
read_when:
  - 您需要調試會話 ID、逐字稿 JSONL 或 sessions. 欄位
  - 您正在更改自動壓縮行為或新增「壓縮前」的維護工作
  - 您想要實作記憶體刷新或靜默系統輪次
title: "會話管理深度解析"
---

# 會話管理與壓縮（深度解析）

本文檔解釋了 OpenClaw 如何端到端地管理會話：

- **會話路由**（傳入訊息如何對應到 `sessionKey`）
- **會話存儲** (`sessions.json`) 及其追蹤內容
- **逐字稿持久化** (`*.jsonl`) 及其結構
- **逐字稿整理**（執行前針對特定供應商的修正）
- **上下文限制**（上下文視窗與追蹤的 token 數）
- **壓縮**（手動 + 自動壓縮）以及掛載壓縮前工作的位置
- **靜默維護**（例如：不應產生使用者可見輸出的記憶體寫入）

如果您想先了解高層次的概覽，請從以下內容開始：

- [/concepts/session](/zh-Hant/concepts/session)
- [/concepts/compaction](/zh-Hant/concepts/compaction)
- [/concepts/session-pruning](/zh-Hant/concepts/session-pruning)
- [/reference/transcript-hygiene](/zh-Hant/reference/transcript-hygiene)

---

## 單一事實來源：閘道 (Gateway)

OpenClaw 的設計圍繞著單一擁有會話狀態的**閘道程序**。

- 各種 UI（macOS 應用程式、網頁控制 UI、TUI）應向閘道查詢會話清單和 token 計數。
- 在遠端模式下，會話檔案位於遠端主機上；「檢查您的本地 Mac 檔案」無法反映閘道實際使用的內容。

---

## 兩個持久化層級

OpenClaw 在兩個層級中持久化會話：

1. **會話存儲 (`sessions.json`)**
   - 鍵/值映射：`sessionKey -> SessionEntry`
   - 體積小、可變、可安全編輯（或刪除條目）
   - 追蹤會詢元數據（當前會話 ID、最後活動時間、切換開關、token 計數器等）

2. **逐字稿 (`<sessionId>.jsonl`)**
   - 具有樹狀結構的僅附加逐字稿（條目具有 `id` + `parentId`）
   - 儲存實際的對話、工具呼叫和壓縮摘要
   - 用於為後續輪次重建模型上下文

---

## 磁碟位置

在 Gateway 主機上，每個代理：

- 儲存：`~/.openclaw/agents/<agentId>/sessions/sessions.json`
- 逐字稿：`~/.openclaw/agents/<agentId>/sessions/<sessionId>.jsonl`
  - Telegram 主題會話：`.../<sessionId>-topic-<threadId>.jsonl`

OpenClaw 透過 `src/config/sessions.ts` 解析這些路徑。

---

## 儲存維護與磁碟控制

會話持久化擁有針對 `sessions.json` 和逐字稿產物的自動維護控制項 (`session.maintenance`)：

- `mode`：`warn`（預設值）或 `enforce`
- `pruneAfter`：過期條目的年齡上限（預設 `30d`）
- `maxEntries`：限制 `sessions.json` 中的條目數量（預設 `500`）
- `rotateBytes`：當 `sessions.json` 過大時進行輪替（預設 `10mb`）
- `resetArchiveRetention`：`*.reset.<timestamp>` 逐字稿歸檔的保留時間（預設值：與 `pruneAfter` 相同；`false` 表示停用清理）
- `maxDiskBytes`：選用的會話目錄預算
- `highWaterBytes`：清理後的選用目標（預設為 `80%` 的 `maxDiskBytes`）

磁碟預算清理的執行順序 (`mode: "enforce"`)：

1. 先移除最舊的已歸檔或孤立逐字稿產物。
2. 如果仍高於目標值，則驅逐最舊的會話條目及其逐字稿檔案。
3. 持續執行直到使用量等於或低於 `highWaterBytes`。

在 `mode: "warn"` 中，OpenClaw 會回報潛在的驅逐操作，但不會修改儲存/檔案。

按需執行維護：

```bash
openclaw sessions cleanup --dry-run
openclaw sessions cleanup --enforce
```

---

## Cron 會話與執行日誌

獨立的 Cron 執行也會建立會話條目/逐字稿，並且擁有專屬的保留控制項：

- `cron.sessionRetention`（預設 `24h`）會從會話儲存中修剪舊的獨立 Cron 執行會話（`false` 表示停用）。
- `cron.runLog.maxBytes` + `cron.runLog.keepLines` 修剪 `~/.openclaw/cron/runs/<jobId>.jsonl` 檔案（預設值：`2_000_000` 位元組和 `2000` 行）。

---

## Session 金鑰 (`sessionKey`)

`sessionKey` 用於識別您所在的「交談桶」（routing + isolation）。

常見模式：

- 主要/直接聊天（每個 agent）：`agent:<agentId>:<mainKey>`（預設 `main`）
- 群組：`agent:<agentId>:<channel>:group:<id>`
- 房間/頻道 (Discord/Slack)：`agent:<agentId>:<channel>:channel:<id>` 或 `...:room:<id>`
- Cron：`cron:<job.id>`
- Webhook：`hook:<uuid>`（除非被覆寫）

正式規則記載於 [/concepts/session](/zh-Hant/concepts/session)。

---

## Session ID (`sessionId`)

每個 `sessionKey` 指向一個目前的 `sessionId`（繼續對話的逐字稿檔案）。

經驗法則：

- **重置** (`/new`, `/reset`) 會為該 `sessionKey` 建立新的 `sessionId`。
- **每日重置**（預設為閘道主機當地時間凌晨 4:00）會在重置邊界之後的下一則訊息建立新的 `sessionId`。
- **閒置過期**（`session.reset.idleMinutes` 或舊版 `session.idleMinutes`）會在閒置時間視窗結束後收到訊息時建立新的 `sessionId`。當同時設定每日重置與閒置過期時，以先到期者為準。
- **執行緒父層分叉保護**（`session.parentForkMaxTokens`，預設 `100000`）會在父層 session 過大時跳過父層逐字稿分叉；新的執行緒會重新開始。設定 `0` 以停用。

實作細節：決策發生在 `src/auto-reply/reply/session.ts` 的 `initSessionState()` 中。

---

## Session store 結構描述 (`sessions.json`)

Store 的數值型別是 `src/config/sessions.ts` 中的 `SessionEntry`。

主要欄位（非詳盡列表）：

- `sessionId`: 目前的逐字稿 ID（除非設定了 `sessionFile`，否則檔名由此衍生）
- `updatedAt`: 上次活動時間戳
- `sessionFile`: 可選的明確逐字稿路徑覆寫
- `chatType`: `direct | group | room`（有助於 UI 和傳送策略）
- `provider`、`subject`、`room`、`space`、`displayName`: 群組/頻道標籤的元資料
- 切換開關：
  - `thinkingLevel`、`verboseLevel`、`reasoningLevel`、`elevatedLevel`
  - `sendPolicy`（每個工作階段的覆寫）
- 模型選擇：
  - `providerOverride`、`modelOverride`、`authProfileOverride`
- Token 計數器（盡力而為 / 取決於供應商）：
  - `inputTokens`、`outputTokens`、`totalTokens`、`contextTokens`
- `compactionCount`: 此工作階段金鑰的自動壓縮完成次數
- `memoryFlushAt`: 上次預壓縮記憶體排清的時間戳
- `memoryFlushCompactionCount`: 上次排清執行時的壓縮計數

儲存區可以安全編輯，但 Gateway 是權威來源：它可能會在工作階段執行時重寫或重新補充條目。

---

## 逐字稿結構 (`*.jsonl`)

逐字稿由 `@mariozechner/pi-coding-agent` 的 `SessionManager` 管理。

該檔案為 JSONL：

- 第一行：工作階段標頭 (`type: "session"`，包含 `id`、`cwd`、`timestamp`，可選的 `parentSession`)
- 接著：帶有 `id` + `parentId`（樹）的工作階段條目

值得注意的條目類型：

- `message`: 使用者/助理/工具結果訊息
- `custom_message`: 確實會進入模型上下文的擴充功能注入訊息（可以從 UI 隱藏）
- `custom`：不會進入模型上下文的擴充功能狀態
- `compaction`：持久化的壓縮摘要，包含 `firstKeptEntryId` 和 `tokensBefore`
- `branch_summary`：瀏覽樹狀分支時的持久化摘要

OpenClaw 故意**不**「修復」對話記錄；Gateway 使用 `SessionManager` 來讀寫它們。

---

## 內文視窗與追蹤的 Token

有兩個不同的概念很重要：

1. **模型內文視窗**：每個模型的硬性上限（模型可見的 Token）
2. **Session store 計數器**：寫入 `sessions.json` 的滾動統計資料（用於 /status 和儀表板）

如果您正在調整限制：

- 內文視窗來自模型目錄（並且可以透過設定覆寫）。
- Store 中的 `contextTokens` 是一個執行時間估計值/報告值；不要將其視為嚴格的保證。

更多資訊，請參閱 [/token-use](/zh-Hant/reference/token-use)。

---

## 壓縮：它是什麼

壓縮會將較舊的對話摘要化為對話記錄中一個持久的 `compaction` 項目，並保持最近的訊息不變。

壓縮後，未來的回合會看到：

- 壓縮摘要
- `firstKeptEntryId` 之後的訊息

壓縮是**持久化**的（與 session pruning 不同）。請參閱 [/concepts/session-pruning](/zh-Hant/concepts/session-pruning)。

---

## 自動壓縮發生的時機（Pi 執行時間）

在嵌入式 Pi 代理程式中，自動壓縮會在兩種情況下觸發：

1. **溢出恢復**：模型傳回內文溢出錯誤 → 壓縮 → 重試。
2. **閾值維護**：在一次成功的回合之後，當：

`contextTokens > contextWindow - reserveTokens`

其中：

- `contextWindow` 是模型的內文視窗
- `reserveTokens` 是為提示詞 + 下一個模型輸出保留的緩衝空間

這些是 Pi 執行時間的語意（OpenClaw 消費事件，但 Pi 決定何時進行壓縮）。

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

OpenClaw 也會針對嵌入式執行強制執行安全底限：

- 如果 `compaction.reserveTokens < reserveTokensFloor`，OpenClaw 會提高它。
- 預設下限為 `20000` 個 token。
- 設定 `agents.defaults.compaction.reserveTokensFloor: 0` 以停用下限。
- 如果已經更高，OpenClaw 會保持不變。

原因：在壓縮變得無法避免之前，留出足夠的空間供多輪「維護」（例如記憶體寫入）使用。

實作：`ensurePiCompactionReserveTokens()` 在 `src/agents/pi-settings.ts` 中
（由 `src/agents/pi-embedded-runner.ts` 呼叫）。

---

## 使用者可見的介面

您可以透過以下方式觀察壓縮和工作階段狀態：

- `/status` （在任何聊天工作階段中）
- `openclaw status` (CLI)
- `openclaw sessions` / `sessions --json`
- 詳細模式：`🧹 Auto-compaction complete` + 壓縮計數

---

## 靜默維護 (`NO_REPLY`)

OpenClaw 支援背景任務的「靜默」回合，使用者不應看到中間輸出。

慣例：

- 助理會以 `NO_REPLY` 開始其輸出，以表示「不要傳送回覆給使用者」。
- OpenClaw 會在傳遞層中移除/隱藏此內容。

從 `2026.1.10` 開始，當部分區塊以 `NO_REPLY` 開頭時，OpenClaw 也會隱藏 **草稿/輸入中串流**，因此靜默操作不會在回合中途洩漏部分輸出。

---

## 預壓縮「記憶體清除」（已實作）

目標：在自動壓縮發生之前，執行一個靜默的代理回合，將持久狀態寫入磁碟（例如代理工作區中的 `memory/YYYY-MM-DD.md`），這樣壓縮就無法擦除關鍵上下文。

OpenClaw 使用 **臨界值前清除** 方法：

1. 監控工作階段上下文使用情況。
2. 當超過「臨界值」（低於 Pi 的壓縮臨界值）時，向代理執行靜默的「立即寫入記憶體」指令。
3. 使用 `NO_REPLY`，讓使用者什麼也看不到。

組態 (`agents.defaults.compaction.memoryFlush`)：

- `enabled` （預設值：`true`）
- `softThresholdTokens` （預設值：`4000`）
- `prompt` （清除回合的使用者訊息）
- `systemPrompt` （附加到清除回合的額外系統提示）

備註：

- 預設的提示詞/系統提示詞包含一個 `NO_REPLY` 提示以抑制交付。
- 此排空在每個壓縮週期執行一次（在 `sessions.json` 中追蹤）。
- 此排空僅針對嵌入式 Pi 會話執行（CLI 後端會跳過它）。
- 當會話工作區為唯讀時（`workspaceAccess: "ro"` 或 `"none"`），將跳過此排空。
- 關於工作區檔案佈局和寫入模式，請參閱 [記憶體](/zh-Hant/concepts/memory)。

Pi 也在擴充功能 API 中公開了一個 `session_before_compact` 掛鉤，但 OpenClaw 的排空邏輯目前位於 Gateway 端。

---

## 疑難排解檢查清單

- 會話金鑰錯誤？請先從 [/concepts/session](/zh-Hant/concepts/session) 開始，並確認 `/status` 中的 `sessionKey`。
- 儲存與記錄不匹配？請從 `openclaw status` 確認 Gateway 主機和儲存路徑。
- 壓縮垃圾訊息？請檢查：
  - 模型上下文視窗（太小）
  - 壓縮設定（對於模型視窗而言 `reserveTokens` 太高可能導致更早壓縮）
  - 工具結果膨脹：啟用/調整會話修剪
- 靜默回合洩漏？確認回覆以 `NO_REPLY`（確切 token）開頭，並且您使用的版本包含串流抑制修復。

import footerZhHant from "/components/footer/zh-Hant.mdx";

<footerZhHant />
