---
summary: "深入探討：會話存儲 + 轉錄、生命週期和（自動）壓縮內部機制"
read_when:
  - You need to debug session ids, transcript JSONL, or sessions.json fields
  - You are changing auto-compaction behavior or adding “pre-compaction” housekeeping
  - You want to implement memory flushes or silent system turns
title: "Session management deep dive"
---

OpenClaw 在以下領域端到端地管理工作階段：

- **工作階段路由**（傳入訊息如何對應到 `sessionKey`）
- **工作階段存放區**（`sessions.json`）及其追蹤內容
- **對話記錄持久性**（`*.jsonl`）及其結構
- **對話記錄衛生**（執行前的供應商特定修補）
- **內容限制**（內容視窗與追蹤的 token）

- **壓縮**（手動與自動壓縮）以及預壓縮工作的掛載位置
- **靜音維護**（不應產生使用者可見輸出的記憶體寫入）

如果您希望先獲得高階概覽，請從以下內容開始：

- [工作階段管理](/zh-Hant/concepts/session)
- [壓縮](/zh-Hant/concepts/compaction)
- [記憶體概覽](/zh-Hant/concepts/memory)
- [記憶體搜尋](/zh-Hant/concepts/memory-search)
- [工作階段修剪](/zh-Hant/concepts/session-pruning)
- [對話記錄衛生](/zh-Hant/reference/transcript-hygiene)

---

## 真實來源：Gateway

OpenClaw 的設計圍繞著單一擁有工作階段狀態的 **Gateway 處理程序**。

- 使用者介面（macOS 應用程式、網頁控制 UI、TUI）應向 Gateway 查詢工作階段列表和 token 計數。
- 在遠端模式下，工作階段檔案位於遠端主機上；「檢查您的本機 Mac 檔案」不會反映 Gateway 正在使用的內容。

---

## 兩個持久層

OpenClaw 在兩個層中持久化工作階段：

1. **工作階段存放區 (`sessions.json`)**
   - 鍵/值對映：`sessionKey -> SessionEntry`
   - 小型、可變、安全可編輯（或刪除條目）
   - 追蹤工作階段元數據（目前工作階段 id、最後活動、切換、token 計數器等）

2. **對話記錄 (`<sessionId>.jsonl`)**
   - 具有樹狀結構的僅附加對話記錄（條目具有 `id` + `parentId`）
   - 儲存實際的對話 + 工具呼叫 + 壓縮摘要
   - 用於重建未來回合的模型內容
   - 一旦啟用的對話記錄超過檢查點大小上限，就會跳過大型壓縮前除錯檢查點，以避免第二次巨大的
     `.checkpoint.*.jsonl` 複製。

---

## 磁盤上的位置

每個代理，在 Gateway 主機上：

- 存放區：`~/.openclaw/agents/<agentId>/sessions/sessions.json`
- Transcripts: `~/.openclaw/agents/<agentId>/sessions/<sessionId>.jsonl`
  - Telegram topic sessions: `.../<sessionId>-topic-<threadId>.jsonl`

OpenClaw 透過 `src/config/sessions.ts` 解析這些內容。

---

## 存儲維護和磁盤控制

Session persistence 具有 `sessions.json` 和 transcript 成品的自動維護控制 (`session.maintenance`)：

- `mode`： `warn` (預設) 或 `enforce`
- `pruneAfter`：過期條目的年齡截止 (預設 `30d`)
- `maxEntries`：限制 `sessions.json` 中的條目數量 (預設 `500`)
- `rotateBytes`：當過大時輪替 `sessions.json` (預設 `10mb`)
- `resetArchiveRetention`： `*.reset.<timestamp>` transcript 封存的保留期 (預設：與 `pruneAfter` 相同； `false` 停用清理)
- `maxDiskBytes`：選用性的 sessions-directory 預算
- `highWaterBytes`：清理後的選用性目標 (預設為 `maxDiskBytes` 的 `80%`)

正常的 Gateway 寫入會針對生產級別的上限進行批次 `maxEntries` 清理，因此在下一次高水位清理將其寫回之前，store 可能會短暫超過設定的上限。 `openclaw sessions cleanup --enforce` 仍會立即套用設定的上限。

磁碟預算清理的執行順序 (`mode: "enforce"`)：

1. 優先移除最舊的已封存或孤立 transcript 成品。
2. 如果仍高於目標，則驅逐最舊的 session 條目及其 transcript 檔案。
3. 持續進行直到使用量達到或低於 `highWaterBytes`。

在 `mode: "warn"` 中，OpenClaw 會報告潛在的驅逐動作，但不會修改 store/檔案。

視需要執行維護：

```bash
openclaw sessions cleanup --dry-run
openclaw sessions cleanup --enforce
```

---

## Cron sessions 和 run logs

獨立的 cron 執行也會建立 session 條目/transcript，並且它們擁有專用的保留控制：

- `cron.sessionRetention` （預設 `24h`）會從 session store（`false` 則停用）中修剪舊的獨立 cron 執行 session。
- `cron.runLog.maxBytes` + `cron.runLog.keepLines` 會修剪 `~/.openclaw/cron/runs/<jobId>.jsonl` 檔案（預設值：`2_000_000` 位元組和 `2000` 行）。

當 cron 強制建立新的獨立執行 session 時，它會在寫入新列之前清理先前的
`cron:<jobId>` session 條目。它會保留安全的偏好設定，例如 thinking/fast/verbose 設定、標籤，以及明確的使用者選取模型/auth 覆寫。它會捨棄環境對話上下文，例如
頻道/群組路由、發送或佇列原則、提升權限、來源，以及 ACP
執行階段綁定，以便全新的獨立執行無法繼承較舊執行中的過期傳遞或
執行階段權限。

---

## Session 金鑰 (`sessionKey`)

`sessionKey` 指出您所在的「對話桶」\_（routing + isolation）。

常見模式：

- 主要/直接聊天（每個代理）：`agent:<agentId>:<mainKey>` （預設 `main`）
- 群組：`agent:<agentId>:<channel>:group:<id>`
- 房間/頻道（Discord/Slack）：`agent:<agentId>:<channel>:channel:<id>` 或 `...:room:<id>`
- Cron：`cron:<job.id>`
- Webhook：`hook:<uuid>` （除非另有覆寫）

正式規則已記錄於 [/concepts/session](/zh-Hant/concepts/session)。

---

## Session ID (`sessionId`)

每個 `sessionKey` 都指向目前的 `sessionId` （即繼續對話的文字記錄檔案）。

經驗法則：

- **重置**（`/new`、`/reset`）會為該 `sessionKey` 建立新的 `sessionId`。
- **每日重置** （預設為閘道主機上的當地時間上午 4:00）會在重置界限之後的下一則訊息建立新的 `sessionId`。
- **閒置過期**（`session.reset.idleMinutes` 或舊版 `session.idleMinutes`）會在訊息於閒置時間窗結束後到達時建立新的 `sessionId`。當同時設定了每日 + 閒置時，以先到期者為準。
- **系統事件**（心跳、喚醒 cron、執行通知、Gateway 簿記）可能會變更 session 資料列，但不會延長每日/閒置重設的新鮮度。重設輪替會在建立新的提示之前，捨棄前一個 session 的佇列系統事件通知。
- **執行緒父層分叉防護**（`session.parentForkMaxTokens`，預設 `100000`）會在父層 session 已經過大時跳過父層逐字稿分叉；新的執行緒會重新開始。設定 `0` 即可停用。

實作細節：決策是在 `initSessionState()` 中的 `src/auto-reply/reply/session.ts` 內進行。

---

## Session store schema（`sessions.json`）

store 的數值型別是 `SessionEntry` 中的 `src/config/sessions.ts`。

主要欄位（未列舉完畢）：

- `sessionId`：目前的逐字稿 ID（除非設定了 `sessionFile`，否則檔案名稱衍生自此處）
- `sessionStartedAt`：目前 `sessionId` 的開始時間戳記；每日重設
  新鮮度會使用此值。舊版資料列可能會從 JSONL session 標頭衍生此值。
- `lastInteractionAt`：上次真實使用者/頻道互動時間戳記；閒置重設
  新鮮度會使用此值，因此心跳、cron 和執行事件不會讓 sessions
  保持運作。沒有此欄位的舊版資料列會回退到復原的 session 開始
  時間作為閒置新鮮度。
- `updatedAt`：上次 store 資料列變更時間戳記，用於列舉、修剪與
  簿記。這不是每日/閒置重設新鮮度的依據。
- `sessionFile`：選用的明確逐字稿路徑覆寫
- `chatType`：`direct | group | room`（協助 UI 與傳送原則）
- `provider`、`subject`、`room`、`space`、`displayName`：用於群組/頻道標籤的中繼資料
- 切換開關：
  - `thinkingLevel`, `verboseLevel`, `reasoningLevel`, `elevatedLevel`
  - `sendPolicy`（每個會話的覆寫）
- 模型選擇：
  - `providerOverride`, `modelOverride`, `authProfileOverride`
- Token 計數器（盡力而為 / 取決於供應商）：
  - `inputTokens`, `outputTokens`, `totalTokens`, `contextTokens`
- `compactionCount`：針對此會話金鑰完成自動壓縮的頻率
- `memoryFlushAt`：上次壓縮前記憶體清除的時間戳記
- `memoryFlushCompactionCount`：上次清除執行時的壓縮計數

存放區可以安全編輯，但 Gateway 是權威來源：它可能會在會話執行時重寫或還原條目。

---

## 對話紀錄結構 (`*.jsonl`)

對話紀錄由 `@mariozechner/pi-coding-agent` 的 `SessionManager` 管理。

該檔案為 JSONL：

- 第一行：會話標頭 (`type: "session"`，包括 `id`、`cwd`、`timestamp`、選用的 `parentSession`)
- 接著：包含 `id` + `parentId` 的會話條目（樹狀結構）

值得注意的條目類型：

- `message`：使用者/助理/工具結果訊息
- `custom_message`：_確實_ 會進入模型上下文的擴充功能注入訊息（可以從 UI 中隱藏）
- `custom`：_不會_ 進入模型上下文的擴充功能狀態
- `compaction`：包含 `firstKeptEntryId` 和 `tokensBefore` 的持久化壓縮摘要
- `branch_summary`：瀏覽樹狀分支時的持久化摘要

OpenClaw 刻意**不**「修正」對話紀錄；Gateway 使用 `SessionManager` 來讀寫它們。

---

## 上下文視窗與追蹤的 Tokens

有兩個不同的概念很重要：

1. **模型上下文視窗**：每個模型的硬性上限（模型可見的 tokens）
2. **Session store counters**：寫入 `sessions.json` 的滾動統計數據（用於 /status 和儀表板）

如果您正在調整限制：

- Context window 來自模型目錄（並且可以透過配置覆寫）。
- Store 中的 `contextTokens` 是運行時估算/報告值；請勿將其視為嚴格的保證。

欲了解更多資訊，請參閱 [/token-use](/zh-Hant/reference/token-use)。

---

## 壓縮：它是什麼

壓縮將較舊的對話總結為對話記錄中的持久化 `compaction` 條目，並保持最近的訊息不變。

壓縮後，後續的回合將看到：

- 壓縮摘要
- `firstKeptEntryId` 之後的訊息

壓縮是**持久化的**（與 Session pruning 不同）。請參閱 [/concepts/session-pruning](/zh-Hant/concepts/session-pruning)。

## 壓縮區塊邊界與工具配對

當 OpenClaw 將長對話記錄拆分為壓縮區塊時，它會保持
助理工具呼叫與其對應的 `toolResult` 條目配對。

- 如果權重分割落在工具呼叫及其結果之間，OpenClaw
  會將邊界移至助理工具呼叫訊息，而不是分離
  該配對。
- 如果尾隨的工具結果區塊會導致區塊超過目標，
  OpenClaw 會保留該待處理的工具區塊，並保持未總結的尾部
  完整。
- 已中止/錯誤的工具呼叫區塊不會保留待處理的分割。

---

## 何時發生自動壓縮（Pi 執行時）

在嵌入式 Pi 代理程式中，自動壓縮會在兩種情況下觸發：

1. **溢出恢復**：模型返回上下文溢出錯誤
   (`request_too_large`, `context length exceeded`, `input exceeds the maximum
number of tokens`, `input token count exceeds the maximum number of input
tokens`, `input is too long for the model`, `ollama error: context length
exceeded`, 以及類似的供應商特定變體) → 壓縮 → 重試。
2. **閾值維護**：在成功的一輪之後，當：

`contextTokens > contextWindow - reserveTokens`

其中：

- `contextWindow` 是模型的上下文視窗
- `reserveTokens` 是為提示詞 + 下一個模型輸出保留的餘量

這些是 Pi 運行時語義（OpenClaw 消耗事件，但 Pi 決定何時進行壓縮）。

當設定了 `agents.defaults.compaction.maxActiveTranscriptBytes` 且活動的逐字稿檔案達到該大小時，OpenClaw 也可以在開啟下一次執行之前觸發飛行前本機壓縮。這是針對本機重新開啟成本的檔案大小保護措施，而非單純的歸檔：OpenClaw 仍會執行正常的語義壓縮，並且它需要 `truncateAfterCompaction`，以便壓縮後的摘要可以成為新的後續逐字稿。

---

## 壓縮設定（`reserveTokens`，`keepRecentTokens`）

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

OpenClaw 也會針對嵌入式執行強制執行安全底線：

- 如果 `compaction.reserveTokens < reserveTokensFloor`，OpenClaw 會將其調高。
- 預設底線為 `20000` 個 token。
- 設定 `agents.defaults.compaction.reserveTokensFloor: 0` 以停用底線。
- 如果已經更高，OpenClaw 將不予變動。
- 手動 `/compact` 遵守明確的 `agents.defaults.compaction.keepRecentTokens`
  並保留 Pi 的近期尾部切斷點。如果沒有明確的保留預算，
  手動壓縮仍然是硬式檢查點，重建的上下文從
  新摘要開始。
- 將 `agents.defaults.compaction.maxActiveTranscriptBytes` 設定位元組值或
  類似 `"20mb"` 的字串，以便在活動
  逐字稿變大時在輪次之前執行本機壓縮。此保護措施僅在
  同時啟用 `truncateAfterCompaction` 時有效。保留未設定或設定 `0` 以
  停用。
- 當啟用 `agents.defaults.compaction.truncateAfterCompaction` 時，
  OpenClaw 會在壓縮後將活動逐字稿旋轉至壓縮後的後續 JSONL。
  舊的完整逐字稿保持歸檔狀態並從壓縮檢查點連結，而不是就地重寫。

原因：在壓縮變得不可避免之前，為多輪次「清理」（例如記憶體寫入）留出足夠的空間。

實作：`ensurePiCompactionReserveTokens()` 於 `src/agents/pi-settings.ts`
（從 `src/agents/pi-embedded-runner.ts` 呼叫）。

---

## 可插拔的壓縮提供者

外掛程式可以透過外掛程式 API 上的 `registerCompactionProvider()` 註冊壓縮提供者。當 `agents.defaults.compaction.provider` 設定為已註冊的提供者 ID 時，安全擴充功能會將摘要委派給該提供者，而不是內建的 `summarizeInStages` 管線。

- `provider`：已註冊壓縮提供者外掛程式的 ID。保留未設定狀態以使用預設的 LLM 摘要。
- 設定 `provider` 會強制啟用 `mode: "safeguard"`。
- 提供者會收到與內建路徑相同的壓縮指令和識別碼保留政策。
- 安全擴充功能在提供者輸出之後，仍會保留最近輪次和分割輪次的尾隨上下文。
- 內建安全摘要會使用新訊息重新蒸餾先前的摘要，而不是逐字保留完整的先前摘要。
- 安全模式預設會啟用摘要品質稽核；設定 `qualityGuard.enabled: false` 以跳過在輸出格式錯誤時重試的行為。
- 如果提供者失敗或傳回空結果，OpenClaw 會自動回退到內建 LLM 摘要。
- 中止/逾時訊號會被重新擲回（而不是被吞沒），以尊重呼叫者的取消要求。

來源：`src/plugins/compaction-provider.ts`、`src/agents/pi-hooks/compaction-safeguard.ts`。

---

## 使用者可見的介面

您可以透過以下方式觀察壓縮和工作階段狀態：

- `/status`（在任何聊天工作階段中）
- `openclaw status` (CLI)
- `openclaw sessions` / `sessions --json`
- 詳細模式：`🧹 Auto-compaction complete` + 壓縮計數

---

## 靜靜維護（`NO_REPLY`）

OpenClaw 支援背景任務的「靜默」輪次，使用者不應看到中間輸出。

慣例：

- 助手會以確切的靜默權杖 `NO_REPLY` /
  `no_reply` 開始其輸出，以表示「不要傳送回覆給使用者」。
- OpenClaw 會在傳遞層中將其移除/隱藏。
- 確切的靜默權杖隱藏是不區分大小寫的，因此當整個有效負載只是靜默權杖時，`NO_REPLY` 和
  `no_reply` 都算數。
- 這僅適用於真正的背景/非交付輪次；這不是針對
  普通可操作使用者請求的捷徑。

自 `2026.1.10` 起，當部分區塊以 `NO_REPLY` 開頭時，OpenClaw 也會抑制 **草稿/輸入串流**，
因此靜默操作不會在輪次中間洩漏部分
輸出。

---

## 壓縮前「記憶體清除」（已實作）

目標：在自動壓縮發生之前，執行一個靜默的代理程式輪次，將持久
狀態寫入磁碟（例如代理程式工作區中的 `memory/YYYY-MM-DD.md`），以便壓縮無法
清除關鍵上下文。

OpenClaw 使用 **閾值前清除** 方法：

1. 監控會話上下文使用量。
2. 當它跨越「軟閾值」（低於 Pi 的壓縮閾值）時，向代理程式發送靜默
   的「立即寫入記憶體」指令。
3. 使用確切的靜默令牌 `NO_REPLY` / `no_reply`，以便使用者
   什麼也看不到。

配置（`agents.defaults.compaction.memoryFlush`）：

- `enabled`（預設值：`true`）
- `softThresholdTokens`（預設值：`4000`）
- `prompt`（用於清除輪次的使用者訊息）
- `systemPrompt`（為清除輪次附加的額外系統提示）

備註：

- 預設提示/系統提示包含一個 `NO_REPLY` 提示以抑制
  交付。
- 清除每個壓縮週期運行一次（在 `sessions.json` 中追蹤）。
- 清除僅針對嵌入式 Pi 會話運行（CLI 後端會跳過它）。
- 當會話工作區為唯讀時（`workspaceAccess: "ro"` 或 `"none"`），將跳過清除。
- 請參閱 [記憶體](/zh-Hant/concepts/memory) 以了解工作區檔案佈局和寫入模式。

Pi 也在擴充功能 API 中公開了 `session_before_compact` 掛鉤，但目前 OpenClaw 的
清除邏輯位於 Gateway 端。

---

## 故障排除檢查清單

- 會話金鑰錯誤？首先從 [/concepts/session](/zh-Hant/concepts/session) 開始，並確認 `/status` 中的 `sessionKey`。
- 存放區與逐字稿不匹配？從 `openclaw status` 確認 Gateway 主機和存放區路徑。
- 壓縮垃圾訊息？請檢查：
  - 模型內容視窗（太小）
  - 壓縮設定（`reserveTokens` 對於模型視窗來說太高可能會導致更早的壓縮）
  - 工具結果膨脹：啟用/調整會話修剪
- 靜默回合洩漏？請確認回覆以 `NO_REPLY` 開頭（不區分大小寫的精確 token），並且您使用的版本包含了串流抑制修復。

## 相關

- [會話管理](/zh-Hant/concepts/session)
- [會話修剪](/zh-Hant/concepts/session-pruning)
- [情境引擎](/zh-Hant/concepts/context-engine)
