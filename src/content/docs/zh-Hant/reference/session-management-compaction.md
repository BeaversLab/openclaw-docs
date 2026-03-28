---
summary: "深入探討：Session store + 轉錄、生命週期與（自動）壓縮內部原理"
read_when:
  - You need to debug session ids, transcript JSONL, or sessions.json fields
  - You are changing auto-compaction behavior or adding “pre-compaction” housekeeping
  - You want to implement memory flushes or silent system turns
title: "Session Management 深度剖析"
---

# Session 管理與壓縮（深度剖析）

本文件說明 OpenClaw 如何端到端地管理 Sessions：

- **Session 路由**（傳入訊息如何對應到 `sessionKey`）
- **Session store**（`sessions.json`）及其追蹤內容
- **轉錄持久性**（`*.jsonl`）及其結構
- **轉錄整理**（執行前的特定提供者修正）
- **Context 限制**（Context 視窗與追蹤的 token 數）
- **壓縮**（手動 + 自動壓縮）以及掛接預壓縮工作的位置
- **靜音維護**（例如不應產生使用者可見輸出的記憶體寫入）

如果您希望先獲得更高層次的概述，請從：

- [/concepts/session](/zh-Hant/concepts/session)
- [/concepts/compaction](/zh-Hant/concepts/compaction)
- [/concepts/session-pruning](/zh-Hant/concepts/session-pruning)
- [/reference/transcript-hygiene](/zh-Hant/reference/transcript-hygiene)

---

## 真實來源：Gateway

OpenClaw 的設計圍繞著單一的 **Gateway 進程**，該進程擁有會話狀態。

- UI（macOS 應用程式、網頁 Control UI、TUI）應查詢 Gateway 以取得會話列表和 token 計數。
- 在遠端模式下，會話檔案位於遠端主機上；「檢查您的本機 Mac 檔案」不會反映 Gateway 正在使用的內容。

---

## 兩個持久化層

OpenClaw 在兩個層中持久化會話：

1. **Session store (`sessions.json`)**
   - 鍵/值映射：`sessionKey -> SessionEntry`
   - 小型、可變、可安全編輯（或刪除條目）
   - 追蹤會話元資料（目前會話 ID、上次活動、切換、計數器等）

2. **Transcript (`<sessionId>.jsonl`)**
   - 具樹狀結構的僅附加記錄（條目具有 `id` + `parentId`）
   - 儲存實際的對話 + 工具呼叫 + 壓縮摘要
   - 用於為後續輪次重建模型上下文

---

## 磁碟位置

在 Gateway 主機上，每個代理：

- Store: `~/.openclaw/agents/<agentId>/sessions/sessions.json`
- Transcripts: `~/.openclaw/agents/<agentId>/sessions/<sessionId>.jsonl`
  - Telegram 主題會話：`.../<sessionId>-topic-<threadId>.jsonl`

OpenClaw 透過 `src/config/sessions.ts` 解析這些路徑。

---

## 儲存空間維護與磁碟控制

會話持久化具有自動維護控制（`session.maintenance`）用於 `sessions.json` 和記錄產物：

- `mode`：`warn`（預設）或 `enforce`
- `pruneAfter`：過時條目年限截止（預設 `30d`）
- `maxEntries`：`sessions.json` 中的條目上限（預設 `500`）
- `rotateBytes`：當過大時輪替 `sessions.json`（預設 `10mb`）
- `resetArchiveRetention`：`*.reset.<timestamp>` 對話存檔的保留期限（預設：與 `pruneAfter` 相同；`false` 停用清理）
- `maxDiskBytes`：選用的 sessions-directory 預算
- `highWaterBytes`：清理後的可選目標（`maxDiskBytes` 的預設值為 `80%`）

磁碟預算清理的執行順序（`mode: "enforce"`）：

1. 首先移除最舊的已歸檔或孤立的語音稿檔案。
2. 如果仍高於目標，則驅逐最舊的會話條目及其語音稿檔案。
3. 持續執行直到使用量達到或低於 `highWaterBytes`。

在 `mode: "warn"` 模式下，OpenClaw 會報告潛在的驅逐操作，但不會變更儲存/檔案。

按需執行維護：

```exec
openclaw sessions cleanup --dry-run
openclaw sessions cleanup --enforce
```

---

## Cron 會話和運行日誌

隔離的 cron 運行也會建立會話條目/語音稿，並且它們有專用的保留控制：

- `cron.sessionRetention`（預設為 `24h`）會從會話儲存中修剪舊的隔離 cron 運行會話（`false` 表示停用）。
- `cron.runLog.maxBytes` + `cron.runLog.keepLines` 會修剪 `~/.openclaw/cron/runs/<jobId>.jsonl` 檔案（預設值：`2_000_000` 位元組和 `2000` 行）。

---

## Session 鍵 (`sessionKey`)

`sessionKey` 用於識別您所在的「對話儲存桶」（routing + isolation，即路由與隔離）。

常見模式：

- 主要/直接聊天（每個代理）：`agent:<agentId>:<mainKey>`（預設為 `main`）
- 群組：`agent:<agentId>:<channel>:group:<id>`
- 房間/頻道 (Discord/Slack)：`agent:<agentId>:<channel>:channel:<id>` 或 `...:room:<id>`
- Cron：`cron:<job.id>`
- Webhook：`hook:<uuid>`（除非被覆寫）

標準規則記錄於 [/concepts/session](/zh-Hant/concepts/session)。

---

## Session ID (`sessionId`)

每個 `sessionKey` 指向當前 `sessionId`（繼續對話的逐字稿檔案）。

經驗法則：

- **重置** (`/new`, `/reset`) 會為該 `sessionKey` 建立新的 `sessionId`。
- **每日重置**（預設為閘道主機當地時間上午 4:00）會在重置邊界後的下一則訊息建立新的 `sessionId`。
- **閒置到期**（`session.reset.idleMinutes` 或舊版 `session.idleMinutes`）會在訊息於閒置視窗後抵達時建立新的 `sessionId`。當同時設定每日重置與閒置到期時，以先到期者為準。
- **執行緒父層分岔守衛** (`session.parentForkMaxTokens`，預設為 `100000`) 會在父層工作階段過大時跳過父層文字記錄的分岔；新執行緒將從頭開始。設定 `0` 即可停用。

實作細節：此決策發生在 `src/auto-reply/reply/session.ts` 中的 `initSessionState()` 裡。

---

## 工作階段存放區架構 (`sessions.json`)

存放區的數值型別是 `src/config/sessions.ts` 中的 `SessionEntry`。

主要欄位（非完整列表）：

- `sessionId`：目前的文字記錄 ID（檔案名稱由此衍生，除非設定了 `sessionFile`）
- `updatedAt`：上次活動時間戳記
- `sessionFile`：選用的明確文字記錄路徑覆寫
- `chatType`: `direct | group | room` (協助 UI 和發送策略)
- `provider`, `subject`, `room`, `space`, `displayName`: 群組/通道標籤的元資料
- 切換開關：
  - `thinkingLevel`, `verboseLevel`, `reasoningLevel`, `elevatedLevel`
  - `sendPolicy` (個別會話覆寫)
- 模型選擇：
  - `providerOverride`, `modelOverride`, `authProfileOverride`
- Token 計數器 (盡力而為 / 取決於供應商)：
  - `inputTokens`, `outputTokens`, `totalTokens`, `contextTokens`
- `compactionCount`：針對此工作階段金鑰自動壓縮完成的頻率
- `memoryFlushAt`：最後一次預壓縮記憶體排清的時間戳記
- `memoryFlushCompactionCount`：最後一次排清執行時的壓縮計數

存放區是安全的，可以編輯，但閘道是權威來源：它可能會在工作階段執行時重寫或重新填充項目。

---

## 文字紀錄結構 (`*.jsonl`)

文字紀錄由 `@mariozechner/pi-coding-agent` 的 `SessionManager` 管理。

該檔案為 JSONL 格式：

- 第一行：工作階段標頭 (`type: "session"`，包含 `id`、`cwd`、`timestamp`，選用的 `parentSession`)
- 接著：包含 `id` + `parentId` (樹狀結構) 的工作階段項目

值得注意的項目類型：

- `message`：使用者/助理/工具結果訊息
- `custom_message`：擴充功能注入且「確實」進入模型上下文的訊息（可以從 UI 中隱藏）
- `custom`：擴充功能狀態，「未」進入模型上下文
- `compaction`：持久化的壓縮摘要，包含 `firstKeptEntryId` 和 `tokensBefore`
- `branch_summary`：導覽樹狀分支時持久化的摘要

OpenClaw 刻意「不」修正對話紀錄；Gateway 使用 `SessionManager` 來讀寫它們。

---

## 上下文視窗與追蹤的 Token

有兩個不同的概念至關重要：

1. **模型上下文視窗**：每個模型的硬性上限（模型可見的 token）
2. **工作階段存放區計數器**：寫入 `sessions.json` 的滾動統計資料（用於 /status 和儀表板）

如果您正在調整限制：

- 上下文視窗來自模型目錄（並且可以透過配置覆寫）。
- 存放區中的 `contextTokens` 是一個執行時期估計/報告值；請勿將其視為嚴格的保證。

如需更多資訊，請參閱 [/token-use](/zh-Hant/reference/token-use)。

---

## 壓縮：它是什么

壓縮將較舊的對話總結為腳本中的一個持久化 `compaction` 條目，並保持最近的訊息不變。

壓縮後，未來的回合將看到：

- 壓縮摘要
- `firstKeptEntryId` 之後的訊息

壓縮是**持久性的**（與 session pruning 不同）。請參閱 [/concepts/session-pruning](/zh-Hant/concepts/session-pruning)。

---

## 發生自動壓縮的時機 (Pi runtime)

在嵌入式 Pi 代理程式中，自動壓縮會在兩種情況下觸發：

1. **溢出恢復**：模型返回上下文溢出錯誤 → 壓縮 → 重試。
2. **閾值維護**：在成功完成一輪後，當：

`contextTokens > contextWindow - reserveTokens`

其中：

- `contextWindow` 是模型的上下文視窗
- `reserveTokens` 是為提示詞 + 下一個模型輸出保留的餘量

這些是 Pi 運行時的語義（OpenClaw 消耗這些事件，但由 Pi 決定何時進行壓縮）。

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

OpenClaw 也會為嵌入式執行強制執行一個安全底線：

- 如果 `compaction.reserveTokens < reserveTokensFloor`，OpenClaw 會提高它。
- 預設底線是 `20000` 個 token。
- 設定 `agents.defaults.compaction.reserveTokensFloor: 0` 以停用底線。
- 如果它已經更高，OpenClaw 將保持不變。

原因：在壓縮變得無法避免之前，為多輪「雜務」（如記憶體寫入）保留足夠的餘量。

實作：`ensurePiCompactionReserveTokens()` 於 `src/agents/pi-settings.ts`
（從 `src/agents/pi-embedded-runner.ts` 呼叫）。

---

## 使用者可見的介面

您可以透過以下方式觀察壓縮和會話狀態：

- `/status`（於任何聊天會話中）
- `openclaw status` (CLI)
- `openclaw sessions` / `sessions --json`
- 詳細模式：`🧹 Auto-compaction complete` + 壓縮計數

---

## 靜音維護（`NO_REPLY`）

OpenClaw 支援背景任務的「靜音」回合，使用者不應看到中間輸出。

慣例：

- 助理以 `NO_REPLY` 開始其輸出，以指示「不傳遞回覆給使用者」。
- OpenClaw 會在傳遞層中移除/隱藏此內容。

自 `2026.1.10` 起，當部分區塊以 `NO_REPLY` 開頭時，OpenClaw 也會隱藏 **草稿/輸入中串流**，以免靜音操作在回合中途洩漏部分輸出。

---

## 壓縮前「記憶體刷新」（已實作）

目標：在自動壓縮發生之前，執行靜音的代理回合，將持久狀態寫入磁碟（例如代理工作區中的 `memory/YYYY-MM-DD.md`），以免壓縮刪除關鍵語境。

OpenClaw 使用 **壓縮前臨界值刷新** 方法：

1. 監控會話語境使用量。
2. 當超過「軟性臨界值」（低於 Pi 的壓縮臨界值）時，對代理執行靜音的「立即寫入記憶體」指令。
3. 使用 `NO_REPLY`，讓使用者什麼都看不到。

設定（`agents.defaults.compaction.memoryFlush`）：

- `enabled`（預設值：`true`）
- `softThresholdTokens`（預設值：`4000`）
- `prompt`（刷新回合的使用者訊息）
- `systemPrompt`（為刷新回合附加的額外系統提示）

備註：

- 預設提示/系統提示包含 `NO_REPLY` 提示以隱藏傳遞。
- 刷新每個壓縮週期執行一次（在 `sessions.json` 中追蹤）。
- 刷新僅針對嵌入式 Pi 會話執行（CLI 後端會跳過它）。
- 當 session workspace 為唯讀時（`workspaceAccess: "ro"` 或 `"none"`），會跳過 flush。
- 請參閱 [Memory](/zh-Hant/concepts/memory) 以了解 workspace 檔案佈局和寫入模式。

Pi 也在擴充功能 API 中公開了 `session_before_compact` hook，但目前 OpenClaw 的 flush 邏輯位於 Gateway 端。

---

## 疑難排解檢查清單

- Session key 錯誤？請先從 [/concepts/session](/zh-Hant/concepts/session) 開始，並確認 `sessionKey` 中的 `/status`。
- Store 與 transcript 不符？請從 `openclaw status` 確認 Gateway 主機和 store 路徑。
- 壓縮過於頻繁？檢查：
  - model context window（太小）
  - compaction settings（`reserveTokens` 相對於 model window 設得太高，可能導致更早進行壓縮）
  - tool-result 臃腫：啟用/調整 session pruning
- Silent turns 洩漏？請確認回覆以 `NO_REPLY`（確切 token）開頭，並且您所在的版本包含串流抑制修復。
