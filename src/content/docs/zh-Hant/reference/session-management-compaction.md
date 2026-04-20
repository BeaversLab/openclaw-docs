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

- [/concepts/session](/zh-Hant/concepts/session)
- [/concepts/compaction](/zh-Hant/concepts/compaction)
- [/concepts/memory](/zh-Hant/concepts/memory)
- [/concepts/memory-search](/zh-Hant/concepts/memory-search)
- [/concepts/session-pruning](/zh-Hant/concepts/session-pruning)
- [/reference/transcript-hygiene](/zh-Hant/reference/transcript-hygiene)

---

## 真相來源：Gateway

OpenClaw 的設計圍繞著單一擁有會話狀態的 **Gateway 進程**。

- UI（macOS 應用程式、網頁 Control UI、TUI）應向 Gateway 查詢會話列表和 token 計數。
- 在遠端模式下，會話檔案位於遠端主機上；「檢查您的本地 Mac 檔案」不會反映 Gateway 正在使用的內容。

---

## 兩個持久化層

OpenClaw 在兩個層中持久化會話：

1. **會話存儲 (`sessions.json`)**
   - 鍵/值映射：`sessionKey -> SessionEntry`
   - 小型、可變、安全可編輯（或刪除條目）
   - 追蹤會話元數據（當前會話 ID、最後活動、切換開關、token 計數器等）

2. **對話記錄 (`<sessionId>.jsonl`)**
   - 具有樹狀結構的僅追加對話記錄（條目具有 `id` + `parentId`）
   - 存儲實際對話 + 工具調用 + 壓縮摘要
   - 用於重建未來輪次的模型上下文

---

## 磁盤上的位置

每個代理，在 Gateway 主機上：

- 存儲：`~/.openclaw/agents/<agentId>/sessions/sessions.json`
- 對話記錄：`~/.openclaw/agents/<agentId>/sessions/<sessionId>.jsonl`
  - Telegram 主題會話：`.../<sessionId>-topic-<threadId>.jsonl`

OpenClaw 通過 `src/config/sessions.ts` 解析這些。

---

## 存儲維護和磁盤控制

會話持久化具有針對 `sessions.json` 和對話記錄工件的自動維護控制 (`session.maintenance`)：

- `mode`：`warn`（預設）或 `enforce`
- `pruneAfter`：過期條目年齡截止（預設 `30d`）
- `maxEntries`：限制 `sessions.json` 中的條目數（預設 `500`）
- `rotateBytes`：當 `sessions.json` 過大時進行輪替（預設 `10mb`）
- `resetArchiveRetention`：`*.reset.<timestamp>` 逐字稿存檔的保留期（預設值：與 `pruneAfter` 相同；`false` 則停用清理）
- `maxDiskBytes`：選用的 sessions-directory 預算
- `highWaterBytes`：清理後的選用目標（預設為 `80%` 的 `maxDiskBytes`）

磁碟預算清理的執行順序 (`mode: "enforce"`)：

1. 優先移除最舊的已存檔或孤立的逐字稿構件。
2. 若仍高於目標，則驅逐最舊的會話條目及其逐字稿檔案。
3. 持續執行直到使用量達到或低於 `highWaterBytes`。

在 `mode: "warn"` 中，OpenClaw 會回報可能的驅逐項目，但不會修改儲存/檔案。

視需要執行維護：

```bash
openclaw sessions cleanup --dry-run
openclaw sessions cleanup --enforce
```

---

## Cron 會話與執行日誌

獨立的 cron 執行也會建立會話條目/逐字稿，並且擁有專屬的保留控制項：

- `cron.sessionRetention`（預設 `24h`）會從會話儲存中修剪舊的獨立 cron 執行會話（`false` 則停用）。
- `cron.runLog.maxBytes` + `cron.runLog.keepLines` 會修剪 `~/.openclaw/cron/runs/<jobId>.jsonl` 檔案（預設值：`2_000_000` 位元組和 `2000` 行）。

---

## 會話金鑰 (`sessionKey`)

`sessionKey` 用於識別您所在的*對話儲存桶*（路由 + 隔離）。

常見模式：

- 主要/直接聊天（每個代理）：`agent:<agentId>:<mainKey>`（預設 `main`）
- 群組：`agent:<agentId>:<channel>:group:<id>`
- 房間/頻道（Discord/Slack）：`agent:<agentId>:<channel>:channel:<id>` 或 `...:room:<id>`
- Cron：`cron:<job.id>`
- Webhook：`hook:<uuid>`（除非被覆寫）

標準規則記錄在 [/concepts/session](/zh-Hant/concepts/session)。

---

## 會話 ID (`sessionId`)

每個 `sessionKey` 指向當前的 `sessionId`（即繼續對話的逐字稿檔案）。

經驗法則：

- **Reset** (`/new`, `/reset`) 會為該 `sessionKey` 建立一個新的 `sessionId`。
- **Daily reset**（預設為 Gateway 主機當地時間凌晨 4:00）會在重置邊界後的下一則訊息建立新的 `sessionId`。
- **Idle expiry** (`session.reset.idleMinutes` 或舊版 `session.idleMinutes`) 會在閒置視窗後收到訊息時建立新的 `sessionId`。當同時設定了 daily + idle 時，以先到期者為準。
- **Thread parent fork guard** (`session.parentForkMaxTokens`，預設 `100000`) 當父 session 已經太大時，會跳過父 transcript 的分叉；新的 thread 將重新開始。設定 `0` 可停用此功能。

實作細節：決策發生在 `src/auto-reply/reply/session.ts` 的 `initSessionState()` 中。

---

## Session store schema (`sessions.json`)

Store 的值類型是 `src/config/sessions.ts` 中的 `SessionEntry`。

主要欄位（未列舉完畢）：

- `sessionId`：目前的 transcript id（檔名由此衍生，除非設定了 `sessionFile`）
- `updatedAt`：上次活動時間戳記
- `sessionFile`：可選的明確 transcript 路徑覆寫
- `chatType`：`direct | group | room`（有助於 UI 和傳送策略）
- `provider`、`subject`、`room`、`space`、`displayName`：群組/頻道標籤的元資料
- 切換開關：
  - `thinkingLevel`、`verboseLevel`、`reasoningLevel`、`elevatedLevel`
  - `sendPolicy`（各 session 的覆寫）
- 模型選擇：
  - `providerOverride`、`modelOverride`、`authProfileOverride`
- Token 計數器（盡力而為 / 取決於供應商）：
  - `inputTokens`、`outputTokens`、`totalTokens`、`contextTokens`
- `compactionCount`：此會話金鑰的自動壓縮完成頻率
- `memoryFlushAt`：上次預壓縮記憶體清除的時間戳
- `memoryFlushCompactionCount`：上次清除執行時的壓縮計數

存放區可以安全編輯，但 Gateway 是權威來源：它可能會在會話執行時重寫或重新填充項目。

---

## Transcript 結構 (`*.jsonl`)

Transcripts 由 `@mariozechner/pi-coding-agent` 的 `SessionManager` 管理。

該檔案為 JSONL：

- 第一行：會話標頭 (`type: "session"`，包括 `id`、`cwd`、`timestamp`、可選的 `parentSession`)
- 接著：帶有 `id` + `parentId` 的會話項目（樹狀結構）

值得注意的項目類型：

- `message`：user/assistant/toolResult 訊息
- `custom_message`：擴充功能注入且會*進入*模型上下文的訊息（可從 UI 中隱藏）
- `custom`：*不會*進入模型上下文的擴充功能狀態
- `compaction`：帶有 `firstKeptEntryId` 和 `tokensBefore` 的持久化壓縮摘要
- `branch_summary`：巡覽樹狀結構分支時的持久化摘要

OpenClaw 刻意*不*「修復」transcripts；Gateway 使用 `SessionManager` 來讀寫它們。

---

## 內容視窗 vs 追蹤的 token

有兩個不同的概念很重要：

1. **模型內容視窗**：每個模型的硬性上限（模型可見的 token）
2. **會話存放區計數器**：寫入 `sessions.json` 的滾動統計數據（用於 /status 和儀表板）

如果您正在調整限制：

- 內容視窗來自模型目錄（並且可以透過設定覆寫）。
- 存放區中的 `contextTokens` 是一個執行時估計/回報值；請勿將其視為嚴格的保證。

詳情請參閱 [/token-use](/zh-Hant/reference/token-use)。

---

## 壓縮：它是什麼

壓縮將較舊的對話總結為對話記錄中持久化的 `compaction` 條目，並保持最近的訊息不變。

壓縮後，後續的回合會看到：

- 壓縮摘要
- `firstKeptEntryId` 之後的訊息

壓縮是**持久性**的（與會話修剪不同）。請參閱 [/concepts/session-pruning](/zh-Hant/concepts/session-pruning)。

## 壓縮區塊邊界與工具配對

當 OpenClaw 將長逐字稿分割成壓縮區塊時，它會讓助理工具呼叫與其匹配的 `toolResult` 項目保持配對。

- 如果 token 分配分割點落在工具呼叫及其結果之間，OpenClaw 會將邊界移至助理工具呼叫訊息，而不是將這對分開。
- 如果尾隨的工具結果區塊會導致區塊超過目標，OpenClaw 將保留該擱置中的工具區塊，並保持未摘要的尾部完整。
- 已中止/錯誤的工具呼叫區塊不會保留擱置的分割開啟狀態。

---

## 自動壓縮發生時機（Pi 執行時期）

在內嵌的 Pi 代理程式中，自動壓縮會在兩種情況下觸發：

1. **溢位恢復**：模型傳回內容溢位錯誤
   (`request_too_large`, `context length exceeded`, `input exceeds the maximum
number of tokens`, `input token count exceeds the maximum number of input
tokens`, `input is too long for the model`, `ollama error: context length
exceeded`, 以及類似的供應商特定變體) → 壓縮 → 重試。
2. **臨界值維護**：在成功的一輪之後，當：

`contextTokens > contextWindow - reserveTokens`

其中：

- `contextWindow` 是模型的內容視窗
- `reserveTokens` 是為提示詞 + 下一個模型輸出保留的緩衝空間

這些是 Pi 執行時期的語意（OpenClaw 使用事件，但 Pi 決定何時壓縮）。

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

OpenClaw 也會對嵌入式執行強制執行安全底線：

- 如果 `compaction.reserveTokens < reserveTokensFloor`，OpenClaw 會將其提高。
- 預設底線為 `20000` 個 token。
- 設定 `agents.defaults.compaction.reserveTokensFloor: 0` 以停用底線。
- 如果已經更高，OpenClaw 將保持不變。

原因：在壓縮變得不可避免之前，為多輪「維護」（如記憶體寫入）留出足夠的餘量。

實作：`ensurePiCompactionReserveTokens()` 於 `src/agents/pi-settings.ts` 中
（從 `src/agents/pi-embedded-runner.ts` 呼叫）。

---

## 可插拔壓縮提供者

外掛程式可以透過外掛 API 上的 `registerCompactionProvider()` 註冊壓縮提供者。當 `agents.defaults.compaction.provider` 被設定為已註冊的提供者 ID 時，保護擴充功能會將摘要處理委派給該提供者，而不是內建的 `summarizeInStages` 管線。

- `provider`：已註冊壓縮提供者外掛程式的 ID。保留未設定狀態以使用預設的 LLM 摘要。
- 設定 `provider` 會強制執行 `mode: "safeguard"`。
- 提供者會收到與內建路徑相同的壓縮指令和識別符保留原則。
- 保護機制仍然會在提供者輸出之後保留最近輪次和分割輪次的後綴內容。
- 如果提供者失敗或傳回空結果，OpenClaw 會自動回退到內建的 LLM 摘要。
- 中止/逾時訊號會被重新拋出（不會被吞沒）以尊重呼叫者的取消要求。

來源：`src/plugins/compaction-provider.ts`、`src/agents/pi-hooks/compaction-safeguard.ts`。

---

## 使用者可見的介面

您可以透過以下方式觀察壓縮和會話狀態：

- `/status`（在任何聊天會話中）
- `openclaw status` (CLI)
- `openclaw sessions` / `sessions --json`
- 詳細模式：`🧹 Auto-compaction complete` + 壓縮計數

---

## 靜默維護 (`NO_REPLY`)

OpenClaw 支援背景任務的「靜默」輪次，使用者不應看到中間輸出。

慣例：

- Assistant 的輸出以精確的靜默標記 `NO_REPLY` /
  `no_reply` 開頭，以表示「不向使用者傳遞回覆」。
- OpenClaw 會在傳遞層將其剝離/隱藏。
- 精確的靜默標記隱藏是不區分大小寫的，因此 `NO_REPLY` 和
  `no_reply` 在整個負載僅為靜默標記時均視為有效。
- 此功能僅適用於真正的背景/不傳遞輪次；它不是普通可操作使用者請求的捷徑。

自 `2026.1.10` 起，當部分區塊以 `NO_REPLY` 開頭時，OpenClaw 也會隱藏 **草稿/輸入流式傳輸**，以免靜默操作在輪次中途洩漏部分輸出。

---

## 預壓縮「記憶體清除」（已實作）

目標：在自動壓縮發生之前，執行一個靜默的代理輪次，將持久狀態寫入磁碟（例如 Agent 工作區中的 `memory/YYYY-MM-DD.md`），這樣壓縮就不會刪除關鍵上下文。

OpenClaw 使用 **預先閾值清除** 方法：

1. 監控 Session 上下文使用量。
2. 當其超過「軟閾值」（低於 Pi 的壓縮閾值）時，向 Agent 發送靜默的「立即寫入記憶體」指令。
3. 使用精確的靜默標記 `NO_REPLY` / `no_reply`，讓使用者什麼也看不到。

配置 (`agents.defaults.compaction.memoryFlush`)：

- `enabled` (預設值：`true`)
- `softThresholdTokens` (預設值：`4000`)
- `prompt` (清除輪次的使用者訊息)
- `systemPrompt` (為清除輪次附加的額外系統提示詞)

註記：

- 預設的提示詞/系統提示詞包含 `NO_REPLY` 提示以隱藏傳遞。
- 清除操作在每個壓縮週期執行一次（在 `sessions.json` 中追蹤）。
- 清除操作僅針對嵌入式 Pi Session 執行（CLI 後端會跳過）。
- 當 Session 工作區為唯讀時（`workspaceAccess: "ro"` 或 `"none"`），會跳過清除操作。
- 關於工作區檔案佈局和寫入模式，請參閱 [記憶體](/zh-Hant/concepts/memory)。

Pi 也在擴充 API 中公開了 `session_before_compact` hook，但 OpenClaw 的 flush 邏輯目前位於 Gateway 端。

---

## 故障排除檢查清單

- Session key 錯誤？請從 [/concepts/session](/zh-Hant/concepts/session) 開始，並確認 `sessionKey` 中的 `/status`。
- Store 與 transcript 不符？請從 `openclaw status` 確認 Gateway 主機和 store 路徑。
- 壓縮過於頻繁？請檢查：
  - model context window（太小）
  - compaction settings（對於 model window 來說，`reserveTokens` 太高可能導致更早的壓縮）
  - tool-result 膨脹：啟用/調整 session pruning
- Silent turns 洩漏？請確認回覆以 `NO_REPLY` 開頭（不區分大小寫的精確 token），並且您正在使用包含串流抑制修復的版本。
