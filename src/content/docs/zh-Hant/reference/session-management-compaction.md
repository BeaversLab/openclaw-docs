---
summary: "深入探討：會話存儲 + 轉錄、生命週期和（自動）壓縮內部機制"
read_when:
  - You need to debug session ids, transcript JSONL, or sessions.json fields
  - You are changing auto-compaction behavior or adding "pre-compaction" housekeeping
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

- [會話管理](/zh-Hant/concepts/session)
- [壓縮](/zh-Hant/concepts/compaction)
- [記憶體概覽](/zh-Hant/concepts/memory)
- [記憶體搜尋](/zh-Hant/concepts/memory-search)
- [會話修剪](/zh-Hant/concepts/session-pruning)
- [對話紀錄衛生](/zh-Hant/reference/transcript-hygiene)

---

## 真實來源：Gateway

OpenClaw 的設計圍繞著單一擁有工作階段狀態的 **Gateway 處理程序**。

- 使用者介面（macOS 應用程式、網頁控制 UI、TUI）應向 Gateway 查詢工作階段列表和 token 計數。
- 在遠端模式下，會話檔案位於遠端主機上；「檢查您的本地 Mac 檔案」不會反映 Gateway 實際使用的內容。

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
   - 壓縮檢查點是壓縮後繼文稿之上的元資料。新的壓縮作業不會寫入第二個 `.checkpoint.*.jsonl` 副本。

Gateway 歷史記錄讀取器應避免具象化整個對話記錄，除非介面明確需要任意歷史記錄存取。首頁歷史記錄、內嵌聊天記錄、重啟恢復以及 token/使用量檢查使用有界的尾部讀取。完整的對話記錄掃描會透過非同步對話記錄索引進行，該索引會依檔案路徑加上 `mtimeMs`/`size` 進行快取，並在並發讀取器之間共享。

---

## 磁碟上的位置

每個代理程式，在 Gateway 主機上：

- 商店：`~/.openclaw/agents/<agentId>/sessions/sessions.json`
- 對話記錄：`~/.openclaw/agents/<agentId>/sessions/<sessionId>.jsonl`
  - Telegram 主題會話：`.../<sessionId>-topic-<threadId>.jsonl`

OpenClaw 透過 `src/config/sessions.ts` 解析這些路徑。

---

## 商店維護與磁碟控制

會話持久化具有針對 `sessions.json`、對話記錄工件和軌跡側車的自動維護控制 (`session.maintenance`)：

- `mode`：`warn` (預設) 或 `enforce`
- `pruneAfter`：過期條目年限上限 (預設 `30d`)
- `maxEntries`：`sessions.json` 中的條目上限 (預設 `500`)
- `resetArchiveRetention`：`*.reset.<timestamp>` 逐字稿存檔的保留期（預設值：與 `pruneAfter` 相同；`false` 則停用清理）
- `maxDiskBytes`：選用的 sessions-directory 預算
- `highWaterBytes`：清理後的選用目標（預設為 `80%` 的 `maxDiskBytes`）

正常的 Gateway 寫入流程透過每個存放區的 session writer，該 writer 會序列化處理程序中的變更而不會取得執行時期檔案鎖定。熱路徑修補輔助程式會在持有該 writer 時借用以驗證的可變快取，因此大型 `sessions.json` 檔案不會因為每次中繼資料更新而被複製或重新讀取。執行時期程式碼應優先使用 `updateSessionStore(...)` 或 `updateSessionStoreEntry(...)`；直接儲存整個存放區則是相容性與離線維護工具。當 Gateway 可連線時，非試執行模式的 `openclaw sessions cleanup` 和 `openclaw agents delete` 會將存放區變更委派給 Gateway，以便清理工作加入相同的寫入佇列；`--store <path>` 則是直接進行檔案維護的明確離線修復路徑。`maxEntries` 清理對於生產環境大小的上限仍會採用批次處理，因此存放區可能會在下一次高水位清理將其重寫降低之前，短暂超過設定的上限。Session存放區讀取不會在 Gateway 啟動期間修剪或限制項目；請使用寫入或 `openclaw sessions cleanup --enforce` 進行清理。`openclaw sessions cleanup --enforce` 仍然會立即套用設定的上限，並修剪舊的未被參照的逐字稿、檢查點和軌跡檔案，即使未設定磁碟預算。

維護作業會保留持久的對話外部指標，例如群組 session 和執行緒範圍的聊天 session，但針對 cron、hooks、heartbeat、ACP 和 sub-agents 的合成執行時期項目，在超過設定的時間、計數或磁碟預算時，仍可被移除。

OpenClaw 不再在 Gateway 寫入期間建立自動 `sessions.json.bak.*` 輪替備份。舊版的 `session.maintenance.rotateBytes` 金鑰會被忽略，且 `openclaw doctor --fix` 會將其從較舊的設定中移除。

Transcript mutations use a session write lock on the transcript file. Lock acquisition waits up to
`session.writeLock.acquireTimeoutMs` before surfacing a busy-session error; the default is `60000`
ms. Raise this only when legitimate prep, cleanup, compaction, or transcript mirror work contends
longer on slow machines. `session.writeLock.staleMs` controls when an existing lock can be
reclaimed as stale; the default is `1800000` ms. `session.writeLock.maxHoldMs` controls the
in-process watchdog release threshold; the default is `300000` ms. Emergency env overrides are
`OPENCLAW_SESSION_WRITE_LOCK_ACQUIRE_TIMEOUT_MS`, `OPENCLAW_SESSION_WRITE_LOCK_STALE_MS`, and
`OPENCLAW_SESSION_WRITE_LOCK_MAX_HOLD_MS`.

Enforcement order for disk budget cleanup (`mode: "enforce"`):

1. 優先移除最舊的已封存、孤立的文字記錄 或孤立的軌跡 檔案。
2. 如果仍高於目標，則驅逐最舊的工作階段條目及其文字記錄/軌跡檔案。
3. Keep going until usage is at or below `highWaterBytes`.

In `mode: "warn"`, OpenClaw reports potential evictions but does not mutate the store/files.

隨需執行維護：

```bash
openclaw sessions cleanup --dry-run
openclaw sessions cleanup --enforce
```

---

## Cron 工作階段與執行記錄

獨立的 cron 執行也會建立工作階段條目/文字記錄，並且具有專用的保留控制：

- `cron.sessionRetention` (default `24h`) prunes old isolated cron run sessions from the session store (`false` disables).
- `cron.runLog.keepLines` 會在每個 cron 工作中修剪保留的 SQLite 執行歷史記錄行（預設值：`2000`）。`cron.runLog.maxBytes` 仍然支援較舊的檔案支援執行日誌。

當 cron 強制建立新的隔離執行會話時，它會在寫入新行之前清理先前的
`cron:<jobId>` 會話項目。它會攜帶安全的偏好設定，例如思考/快速/詳細設定、標籤，以及明確的
使用者選擇的模型/身分驗證覆蓋設定。它會捨棄環境對話上下文，例如
頻道/群組路由、傳送或佇列原則、提升、來源，以及 ACP
執行階段綁定，因此全新的隔離執行無法從較舊的執行繼承過時的傳遞或
執行階段權限。

---

## 會話金鑰 (`sessionKey`)

`sessionKey` 用於識別您所在的「哪個對話儲存桶」（路由 + 隔離）。

常見模式：

- 主要/直接聊天（每個代理程式）：`agent:<agentId>:<mainKey>`（預設 `main`）
- 群組：`agent:<agentId>:<channel>:group:<id>`
- 房間/頻道（Discord/Slack）：`agent:<agentId>:<channel>:channel:<id>` 或 `...:room:<id>`
- Cron：`cron:<job.id>`
- Webhook：`hook:<uuid>`（除非有覆蓋）

正式規則記載於 [/concepts/session](/zh-Hant/concepts/session)。

---

## 會話 ID (`sessionId`)

每個 `sessionKey` 都指向一個目前的 `sessionId`（即延續對話的對話紀錄檔案）。

經驗法則：

- **重設** (`/new`, `/reset`) 會為該 `sessionKey` 建立一個新的 `sessionId`。
- **每日重設**（預設為閘道主機上的當地時間上午 4:00）會在重設邊界之後的下一則訊息建立新的 `sessionId`。
- **閒置過期** (`session.reset.idleMinutes` 或舊版 `session.idleMinutes`) 會在訊息於閒置窗口結束後到達時建立新的 `sessionId`。當同時設定了每日與閒置過期時，以先到期者為準。
- **系統事件**（心跳、cron 喚醒、exec 通知、閘道維護）可能會變更 session 資料列，但不會延長每日/閒置重置的新鲜度。重置輪替會在建立新的提示之前，捨棄前一個 session 的佇列系統事件通知。
- **父分支原則** 在建立執行緒或子代理分支時會使用 OpenClaw 的作用中分支。如果該分支過大，OpenClaw 會以隔離上下文啟動子項，而不是失敗或繼承無法使用的歷史記錄。大小調整原則是自動的；舊版 `session.parentForkMaxTokens` 設定已由 `openclaw doctor --fix` 移除。

實作細節：決策發生在 `initSessionState()` 的 `src/auto-reply/reply/session.ts` 中。

---

## Session store schema (`sessions.json`)

儲存區的數值型別是 `SessionEntry` 中定義的 `src/config/sessions.ts`。

主要欄位（未列舉完畢）：

- `sessionId`：目前的文字記錄 ID（除非設定了 `sessionFile`，否則檔名由此衍生）
- `sessionStartedAt`：目前 `sessionId` 的開始時間戳記；每日重置新鮮度使用此值。舊版資料列可能會從 JSONL session header 推導此值。
- `lastInteractionAt`：上一次真實使用者/頻道互動的時間戳記；閒置重置新鮮度使用此值，因此 heartbeat、cron 和 exec 事件不會讓會話保持活躍。沒有此欄位的舊版資料列會針對閒置新鮮度回退到復原的會話開始時間。
- `updatedAt`：上一次儲存區資料列變動的時間戳記，用於列出、修剪和簿記。它不是每日/閒置重置新鮮度的依據。
- `sessionFile`：選用的明確文字記錄路徑覆寫
- `chatType`：`direct | group | room`（有助於 UI 和傳送原則）
- `provider`、`subject`、`room`、`space`、`displayName`：群組/頻道標籤的元資料
- 切換開關：
  - `thinkingLevel`、`verboseLevel`、`reasoningLevel`、`elevatedLevel`
  - `sendPolicy`（每個會話的覆寫）
- 模型選擇：
  - `providerOverride`, `modelOverride`, `authProfileOverride`
- Token 計數器（盡力而為 / 取決於供應商）：
  - `inputTokens`, `outputTokens`, `totalTokens`, `contextTokens`
- `compactionCount`：針對此工作階段金鑰的自動壓縮完成頻率
- `memoryFlushAt`：上次壓縮前記憶體清除的時間戳記
- `memoryFlushCompactionCount`：上次清除執行時的壓縮計數

存儲可以安全編輯，但 Gateway 是權威來源：它可能會在會話運行時重寫或重新填充條目。

---

## 對話紀錄結構 (`*.jsonl`)

對話紀錄由 `openclaw/plugin-sdk/agent-sessions` 的 `SessionManager` 管理。

該文件為 JSONL 格式：

- 第一行：工作階段標頭 (`type: "session"`，包含 `id`、`cwd`、`timestamp`，選用 `parentSession`)
- 接著：帶有 `id` + `parentId` 的工作階段項目 (樹狀結構)

值得注意的條目類型：

- `message`：使用者/助理/工具結果訊息
- `custom_message`：擴充功能注入且「確實」會進入模型上下文的訊息 (可從 UI 隱藏)
- `custom`：不會進入模型上下文的擴充功能狀態
- `compaction`：包含 `firstKeptEntryId` 和 `tokensBefore` 的已持久化壓縮摘要
- `branch_summary`：瀏覽樹狀分支時的已持久化摘要

OpenClaw 故意「不」修正對話紀錄；閘道會使用 `SessionManager` 來讀寫它們。

---

## 上下文視窗與追蹤的 Token

有兩個不同的概念很重要：

1. **模型上下文視窗**：每個模型的硬性上限（模型可見的 Token）
2. **工作階段存放區計數器**：寫入 `sessions.json` 的滾動統計資料 (用於 /status 和儀表板)

如果您正在調整限制：

- 上下文視窗來自模型目錄（並且可以透過設定覆寫）。
- 存放區中的 `contextTokens` 是執行時期估計值/回報值；請勿將其視為嚴格保證。

如需更多資訊，請參閱 [/token-use](/zh-Hant/reference/token-use)。

---

## 壓縮：它是什麼

壓縮會將較舊的對話摘要為對話紀錄中已持久化的 `compaction` 項目，並保持最近的訊息完整不變。

壓縮後，後續的回合會看到：

- 壓縮摘要
- `firstKeptEntryId` 之後的訊息

壓縮後重新注入 AGENTS.md 部分是透過 `agents.defaults.compaction.postCompactionSections` 選擇性啟用的；當未設定或設為 `[]` 時，OpenClaw 不會在壓縮摘要之上附加 AGENTS.md 摘錄。

壓縮是**永久性**的（不同於會話修剪）。請參閱 [/concepts/session-pruning](/zh-Hant/concepts/session-pruning)。

## 壓縮區塊邊界與工具配對

當 OpenClaw 將長逐字稿分割成壓縮區塊時，它會讓助手工具呼叫與其對應的 `toolResult` 項目保持配對。

- 如果權重分割落在工具呼叫與其結果之間，OpenClaw 會將邊界移至助理工具呼叫訊息，而不是將這一對分開。
- 如果尾隨的工具結果區塊會導致區塊超過目標，OpenClaw 會保留該待處理工具區塊，並保持未摘要的尾部完整。
- 中止/錯誤的工具呼叫區塊不會保持待處理分割開啟狀態。

---

## 當自動壓縮發生時 (OpenClaw 執行階段)

在內嵌的 OpenClaw 代理程式中，自動壓縮會在兩種情況下觸發：

1. **溢位恢復 (Overflow recovery)**：模型傳回內容溢位錯誤 (`request_too_large`、`context length exceeded`、`input exceeds the maximum number of tokens`, `input token count exceeds the maximum number of input tokens`, `input is too long for the model`, `ollama error: context length exceeded`，以及類似的供應商特定變體) → 壓縮 → 重試。當供應商回報嘗試的 token 計數時，OpenClaw 會將該觀察到的計數轉發至溢位恢復壓縮程序。如果供應商確認溢位但未暴露可解析的計數，OpenClaw 會傳遞一個最低限度超出預算的合成計數給壓縮引擎和診斷工具。如果溢位恢復仍然失敗，OpenClaw 會向使用者顯示明確的指引，並保留目前的會話對應，而不是靜默地將會話金鑰旋轉到新的會話 ID。下一步由操作員控制：重試訊息、執行 `/compact`，或在偏愛新會話時執行 `/new`。
2. **閾值維護**：在一次成功的輪次之後，當：

`contextTokens > contextWindow - reserveTokens`

其中：

- `contextWindow` 是模型的內容視窗
- `reserveTokens` 是為提示詞和下一個模型輸出保留的緩衝空間

這些是 OpenClaw 執行時期的語義。

當設定了 `agents.defaults.compaction.maxActiveTranscriptBytes` 且使用中的逐字稿檔案達到該大小時，OpenClaw 也可以在開啟下一個執行之前觸發飛行前本機壓縮。這是針對本機重新開啟成本的檔案大小防護，而非原始歸檔：OpenClaw 仍會執行正常的語意壓縮，並且它需要 `truncateAfterCompaction`，這樣壓縮後的摘要才能成為新的後續逐字稿。

對於嵌入式 OpenClaw 執行，`agents.defaults.compaction.midTurnPrecheck.enabled: true`
增加了一個選用的工具迴圈守衛。在附加工具結果之後以及下一次
模型呼叫之前，OpenClaw 使用輪次開始時使用的相同預檢
預算邏輯來估算提示詞壓力。如果語境不再適合，該守衛不會
在 OpenClaw 執行時的 `transformContext` hook 內進行壓縮。它會引發結構化的
輪次中預檢訊號，停止目前的提示詞提交，並讓
外部執行迴圈使用現有的復原路徑：在足夠時截斷過大的工具結果，
或觸發設定的壓縮模式並重試。該
選項預設為停用，且可與 `default` 和 `safeguard`
壓縮模式搭配使用，包括由提供者支援的安全壓縮。
這與 `maxActiveTranscriptBytes` 無關：位元組大小守衛在
輪次開啟之前運行，而輪次中預檢則在附加新工具結果後的嵌入式 OpenClaw 工具
迴圈中較晚運行。

---

## 壓縮設定 (`reserveTokens`, `keepRecentTokens`)

OpenClaw 執行時期的壓縮設定位於代理程式設定中：

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

- 如果 `compaction.reserveTokens < reserveTokensFloor`，OpenClaw 會提高它。
- 預設下限為 `20000` 個 token。
- 設定 `agents.defaults.compaction.reserveTokensFloor: 0` 以停用下限。
- 如果已經更高，OpenClaw 會保持不變。
- 手動 `/compact` 會遵守明確的 `agents.defaults.compaction.keepRecentTokens`
  並保留 OpenClaw 執行時的近期尾部切點。如果沒有明確的保留預算，
  手動壓縮仍是一個硬檢查點，重建的語境從
  新摘要開始。
- 設定 `agents.defaults.compaction.midTurnPrecheck.enabled: true` 以在新增工具結果之後以及下一次模型
  呼叫之前執行選用的工具迴圈預檢。這僅是一個觸發器；摘要生成仍使用設定的
  壓縮路徑。這與 `maxActiveTranscriptBytes` 無關，後者是一個
  輪次開始時的使用中逐字稿位元組大小守衛。
- 將 `agents.defaults.compaction.maxActiveTranscriptBytes` 設定位元組值或
  諸如 `"20mb"` 的字串，以便在使用中
  逐字稿變大時在輪次之前執行本機壓縮。此守衛僅當
  同時啟用 `truncateAfterCompaction` 時才會作用。保留未設定或設定 `0` 以
  停用。
- 當啟用 `agents.defaults.compaction.truncateAfterCompaction` 時，
  OpenClaw 會在壓縮後將作用中的傳輸記錄旋轉至壓縮後的繼任者 JSONL。分支/還原檢查點動作會使用該壓縮後的繼任者；
  舊版壓縮前檢查點檔案在被參照時仍保持可讀取狀態。

原因：保留足夠的空間以進行多輪次「維護」（例如記憶體寫入），避免壓縮變得勢在必行。

實作方式：`src/agents/agent-settings.ts` 中的 `ensureAgentCompactionReserveTokens()`
（由 `src/agents/embedded-agent-runner.ts` 呼叫）。

---

## 可插拔壓縮提供者

外掛程式可以透過外掛程式 API 上的 `registerCompactionProvider()` 註冊壓縮提供者。當 `agents.defaults.compaction.provider` 被設定為已註冊的提供者 ID 時，安全防護擴充功能會將摘要處理委派給該提供者，而不是內建的 `summarizeInStages` 管線。

- `provider`：已註冊壓縮提供者外掛程式的 ID。保留未設定狀態以使用預設的 LLM 摘要。
- 設定 `provider` 會強制啟用 `mode: "safeguard"`。
- 提供者會收到與內建路徑相同的壓縮指示和識別符保留政策。
- 防護機制仍會在提供者輸出後保留最近輪次和分割輪次的後綴內容。
- 內建防護摘要會使用新訊息重新萃取先前的摘要，
  而不是逐字保留完整的先前摘要。
- 安全防護模式預設會啟用摘要品質稽核；設定
  `qualityGuard.enabled: false` 以略過「輸出格式錯誤時重試」的行為。
- 如果提供者失敗或傳回空結果，OpenClaw 會自動回退至內建 LLM 摘要。
- 中止/逾時訊號會重新擲回（不會被吞掉），以尊重呼叫者的取消要求。

來源：`src/plugins/compaction-provider.ts`、`src/agents/agent-hooks/compaction-safeguard.ts`。

---

## 使用者可見介面

您可以透過以下方式觀察壓縮和工作階段狀態：

- `/status`（在任何聊天工作階段中）
- `openclaw status`（CLI）
- `openclaw sessions` / `sessions --json`
- Gateway 日誌（`pnpm gateway:watch` 或 `openclaw logs --follow`）：`embedded run auto-compaction start` + `complete`
- 詳細模式：`🧹 Auto-compaction complete` + 壓縮計數

---

## 靜默維護（`NO_REPLY`）

OpenClaw 支援背景任務的「靜音」輪次，使用者不應看到中間輸出。

慣例：

- 助理會以其輸出的確切靜默權杖 `NO_REPLY` /
  `no_reply` 作為開頭，以表示「不要傳遞回覆給使用者」。
- OpenClaw 會在傳遞層中移除/隱藏此內容。
- 精確的靜默權杖抑制是不區分大小寫的，因此當整個載荷僅為靜默權杖時，`NO_REPLY` 和
  `no_reply` 兩者都視為有效。
- 這僅適用於真正的背景/不傳遞輪次；它不是一般可執行使用者請求的捷徑。

自 `2026.1.10` 起，當部分區塊以 `NO_REPLY` 開頭時，OpenClaw 也會隱藏 **草稿/輸入中串流**，因此靜默操作不會在對話中途洩漏部分
輸出。

---

## Pre-compaction "memory flush" (implemented)

目標：在自動壓縮發生之前，執行一個靜默的代理轉次，將持久狀態寫入磁碟（例如代理工作區中的 `memory/YYYY-MM-DD.md`），以便壓縮無法刪除關鍵上下文。

OpenClaw 使用 **pre-threshold flush** 方法：

1. 監控 session 上下文使用量。
2. 當它跨越「soft threshold」（低於 OpenClaw 執行時的壓縮閾值）時，對 agent 執行靜音的「write memory now」指令。
3. 使用確切的靜默令牌 `NO_REPLY` / `no_reply`，以便用戶什麼也看不到。

配置 (`agents.defaults.compaction.memoryFlush`)：

- `enabled`（預設值：`true`）
- `model`（可選的精確提供者/模型覆蓋，用於刷新轉次，例如 `ollama/qwen3:8b`）
- `softThresholdTokens`（預設值：`4000`）
- `prompt`（刷新轉次的用戶訊息）
- `systemPrompt`（為刷新轉次附加的額外系統提示詞）

註記：

- 預設提示詞/系統提示詞包含一個 `NO_REPLY` 提示以抑制傳遞。
- 當設置了 `model` 時，刷新轉次將使用該模型，而不繼承活動會話的備用鏈，因此限本地的維護不會無聲地回退到付費的對話模型。
- 刷新每個壓縮週期運行一次（在 `sessions.json` 中追蹤）。
- Flush 僅針對內嵌的 OpenClaw sessions 執行 (CLI 後端會跳過它)。
- 當會話工作區為唯讀時（`workspaceAccess: "ro"` 或 `"none"`），將跳過刷新。
- 有關工作區檔案佈局和寫入模式，請參閱 [記憶體 (Memory)](/zh-Hant/concepts/memory)。

OpenClaw 還在擴充功能 API 中公開了一個 `session_before_compact` 掛鉤，但目前 OpenClaw 的刷新邏輯位於 Gateway 端。

---

## 疑難排解檢查清單

- 會話密鑰錯誤？從 [/concepts/session](/zh-Hant/concepts/session) 開始，並確認 `sessionKey` 中的 `/status`。
- 存儲與轉錄不匹配？從 `openclaw status` 確認 Gateway 主機和存儲路徑。
- 壓縮垃圾訊息？請檢查：
  - 模型語境視窗 (太小)
  - 壓縮設置（`reserveTokens` 對於模型視窗來說太高會導致更早的壓縮）
  - tool-result 膨脹：啟用/調整 session pruning
- 靜默轉次洩漏？確認回覆以 `NO_REPLY` 開頭（不區分大小寫的確切令牌），並且您使用的版本包含串流抑制修復。

## 相關

- [會話管理 (Session management)](/zh-Hant/concepts/session)
- [會話修剪](/zh-Hant/concepts/session-pruning)
- [內容引擎](/zh-Hant/concepts/context-engine)
