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
- [對話記錄衛生](/zh-Hant/reference/transcript-hygiene)

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
   - 一旦啟用的對話記錄超過檢查點大小上限，就會跳過大型壓縮前除錯檢查點，以避免第二次巨大的
     `.checkpoint.*.jsonl` 複製。

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

逐字稿變更使用逐字稿檔案上的 session 寫入鎖定。取得鎖定最多等待 `session.writeLock.acquireTimeoutMs` 才會顯示忙碌 session 錯誤；預設為 `60000` ms。僅當合法的準備、清理、壓縮或逐字稿鏡像工作在慢速機器上爭用更長時間時，才應提高此值。過期鎖定偵測與最大持有時間警告仍為獨立原則。

磁碟預算清理的執行順序 (`mode: "enforce"`)：

1. 優先移除最舊的已封存、孤立的文字記錄 或孤立的軌跡 檔案。
2. 如果仍高於目標，則驅逐最舊的工作階段條目及其文字記錄/軌跡檔案。
3. 持續進行直到使用量等於或低於 `highWaterBytes`。

在 `mode: "warn"` 中，OpenClaw 會回報潛在的驅逐項目，但不會變動存放區/檔案。

隨需執行維護：

```bash
openclaw sessions cleanup --dry-run
openclaw sessions cleanup --enforce
```

---

## Cron 工作階段與執行記錄

獨立的 cron 執行也會建立工作階段條目/文字記錄，並且具有專用的保留控制：

- `cron.sessionRetention` (預設為 `24h`) 會從工作階段存放區中修剪舊的獨立 cron 執行工作階段 (`false` 則停用此功能)。
- `cron.runLog.maxBytes` + `cron.runLog.keepLines` 會修剪 `~/.openclaw/cron/runs/<jobId>.jsonl` 檔案 (預設值：`2_000_000` 位元組和 `2000` 行)。

當 cron 強制建立新的獨立執行工作階段時，它會在寫入新列之前清理先前的
`cron:<jobId>` 工作階段條目。它會保留安全的偏好設定，例如思考/快速/詳細 設定、標籤以及明確
的使用者選擇模型/驗證覆寫。它會捨棄環境交談語境，例如
頻道/群組路由、傳送或佇列原則、提升、來源和 ACP
執行階段綁定，以便新的獨立執行不會繼承來自較舊執行的過時傳遞或
執行階段權限。

---

## 工作階段金鑰 (`sessionKey`)

`sessionKey` 用於識別您所在的*交談桶* (routing + isolation)。

常見模式：

- 主要/直接聊天 (每個代理人)：`agent:<agentId>:<mainKey>` (預設為 `main`)
- 群組：`agent:<agentId>:<channel>:group:<id>`
- 房間/頻道 (Discord/Slack)：`agent:<agentId>:<channel>:channel:<id>` 或 `...:room:<id>`
- Cron：`cron:<job.id>`
- Webhook：`hook:<uuid>` (除非另有覆寫)

正式規則記載於 [/concepts/session](/zh-Hant/concepts/session)。

---

## 工作階段 ID (`sessionId`)

每個 `sessionKey` 指向一個當前的 `sessionId`（繼續對話的逐字稿檔案）。

經驗法則：

- **重置** (`/new`、`/reset`) 會為該 `sessionKey` 建立一個新的 `sessionId`。
- **每日重置**（預設為閘道主機當地時間凌晨 4:00）會在重置邊界之後的下一則訊息建立一個新的 `sessionId`。
- **閒置過期**（`session.reset.idleMinutes` 或舊版 `session.idleMinutes`）會在閒置時間視窗結束後收到訊息時建立一個新的 `sessionId`。當同時設定每日重置與閒置重置時，以先到期者為準。
- **系統事件**（心跳、cron 喚醒、exec 通知、閘道維護）可能會變更 session 資料列，但不會延長每日/閒置重置的新鲜度。重置輪替會在建立新的提示之前，捨棄前一個 session 的佇列系統事件通知。
- **父層分叉原則** 在建立執行緒或子代理程式分叉時，會使用 PI 的作用中分支。如果該分支過大，OpenClaw 會使用隔離內容啟動子程序，而不是失敗或繼承無用的歷史記錄。大小調整原則是自動的；舊版 `session.parentForkMaxTokens` 設定會由 `openclaw doctor --fix` 移除。

實作細節：決策發生在 `src/auto-reply/reply/session.ts` 中的 `initSessionState()`。

---

## Session 存儲架構 (`sessions.json`)

存儲的數值型別是 `src/config/sessions.ts` 中的 `SessionEntry`。

主要欄位（未列舉完畢）：

- `sessionId`：當前逐字稿 ID（除非設定了 `sessionFile`，否則檔案名稱衍生自此 ID）
- `sessionStartedAt`：當前 `sessionId` 的開始時間戳記；每日重置
  新鲜度使用此值。舊版資料列可能會從 JSONL session 標頭衍生此值。
- `lastInteractionAt`：最後一次真實使用者/頻道互動的時間戳記；閒置重置
  新鲜度使用此值，因此心跳、cron 和 exec 事件不會保持 session
  存活。沒有此欄位的舊版資料列會針對閒置新鲜度回退到
  復原的 session 開始時間。
- `updatedAt`：最後一次存儲列變更時間戳，用於列出、修剪和記帳。它不是每日/閒置重置新鮮度的依據。
- `sessionFile`：可選的顯式對話路徑覆寫
- `chatType`：`direct | group | room`（有助於 UI 和發送策略）
- `provider`、`subject`、`room`、`space`、`displayName`：群組/頻道標籤的元數據
- 切換開關：
  - `thinkingLevel`、`verboseLevel`、`reasoningLevel`、`elevatedLevel`
  - `sendPolicy`（每個會話的覆寫）
- 模型選擇：
  - `providerOverride`、`modelOverride`、`authProfileOverride`
- Token 計數器（盡力而為 / 取決於供應商）：
  - `inputTokens`、`outputTokens`、`totalTokens`、`contextTokens`
- `compactionCount`：此會話金鑰完成自動壓縮的頻率
- `memoryFlushAt`：上次壓縮前記憶體清除的時間戳
- `memoryFlushCompactionCount`：上次清除運行時的壓縮計數

存儲可以安全編輯，但 Gateway 是權威來源：它可能會在會話運行時重寫或重新填充條目。

---

## 對話結構（`*.jsonl`）

對話由 `@mariozechner/pi-coding-agent` 的 `SessionManager` 管理。

該文件為 JSONL 格式：

- 第一行：會話標頭（`type: "session"`，包含 `id`、`cwd`、`timestamp`、可選的 `parentSession`）
- 然後是：包含 `id` + `parentId`（樹）的會話條目

值得注意的條目類型：

- `message`：用戶/助手/工具結果訊息
- `custom_message`：由擴充功能注入且*確實*會進入模型上下文的訊息（可從 UI 中隱藏）
- `custom`：不會進入模型上下文的擴充功能狀態
- `compaction`：持久的壓縮摘要，包含 `firstKeptEntryId` 和 `tokensBefore`
- `branch_summary`：導覽樹狀分支時的持久摘要

OpenClaw 故意**不**「修正」腳本；Gateway 使用 `SessionManager` 來讀寫它們。

---

## 上下文視窗與追蹤的 Token

有兩個不同的概念很重要：

1. **模型上下文視窗**：每個模型的硬性上限（模型可見的 Token）
2. **Session store 計數器**：寫入 `sessions.json` 的滾動統計資料（用於 /status 和儀表板）

如果您正在調整限制：

- 上下文視窗來自模型目錄（並且可以透過設定覆寫）。
- Store 中的 `contextTokens` 是一個執行時間估計值/回報值；請勿將其視為嚴格的保證。

更多資訊，請參閱 [/token-use](/zh-Hant/reference/token-use)。

---

## 壓縮：它是什麼

壓縮會將較舊的對話總結為腳本中持久的 `compaction` 條目，並保持最近的訊息不變。

壓縮後，後續的回合會看到：

- 壓縮摘要
- `firstKeptEntryId` 之後的訊息

壓縮是**持久性**的（與 session pruning 不同）。請參閱 [/concepts/session-pruning](/zh-Hant/concepts/session-pruning)。

## 壓縮區塊邊界與工具配對

當 OpenClaw 將長腳本分割成壓縮區塊時，它會保持
助理工具呼叫與其對應的 `toolResult` 條目配對。

- 如果 Token 比例分割落在工具呼叫與其結果之間，OpenClaw
  會將邊界移至助理工具呼叫訊息，而不是分離
  這一對。
- 如果尾隨的工具結果區塊會導致區塊超過目標，
  OpenClaw 會保留該待處理的工具區塊，並保持未摘要的尾部
  完整。
- 已中止/錯誤的工具呼叫區塊不會保留待處理的分割狀態。

---

## 自動壓縮發生的時機（Pi 執行時間）

在嵌入式 Pi 代理程式中，自動壓縮會在兩種情況下觸發：

1. **溢出恢復**：模型傳回情境溢出錯誤
   (`request_too_large`, `context length exceeded`, `input exceeds the maximum
number of tokens`, `input token count exceeds the maximum number of input
tokens`, `input is too long for the model`, `ollama error: context length
exceeded`, 以及類似的供應商特定變體) → 壓縮 → 重試。
2. **閾值維護**：在一次成功的回合之後，當：

`contextTokens > contextWindow - reserveTokens`

其中：

- `contextWindow` 是模型的情境視窗
- `reserveTokens` 是保留給提示詞和下一個模型輸出的緩衝空間

這些是 Pi 執行時期的語意 (OpenClaw 消費這些事件，但由 Pi 決定何時壓縮)。

當設定了 `agents.defaults.compaction.maxActiveTranscriptBytes` 且目前的
轉錄檔案達到該大小時，OpenClaw 也可以在開啟下一次執行之前觸發事前本機壓縮。這是針對本機重新開啟成本的檔案大小防護，而非單純的歸檔：OpenClaw 仍然會執行正常的語意壓縮，並且它需要 `truncateAfterCompaction`，以便壓縮後的摘要能成為
新的後續轉錄。

對於嵌入式 Pi 執行，`agents.defaults.compaction.midTurnPrecheck.enabled: true`
增加了一個選用性的工具迴圈防護。在附加工具結果之後、下一次模型呼叫之前，OpenClaw 會使用回合開始時使用的相同事前預算邏輯來估算提示詞壓力。如果情境不再適合，防護機制不會在 Pi 的 `transformContext` 掛鉤內進行壓縮。它會發出一個結構化的
回合中預檢訊號，停止目前的提示詞提交，並讓外部執行迴圈使用現有的恢復路徑：如果足夠則截斷過大的工具結果，
或者觸發已設定的壓縮模式並重試。該選項預設為停用，並且可與 `default` 和 `safeguard`
壓縮模式搭配使用，包括由供應商支援的安全防護壓縮。
這與 `maxActiveTranscriptBytes` 無關：位元組大小防護在
回合開啟之前執行，而回合中預檢則在附加新的工具結果之後，於較晚的時段於嵌入式 Pi 工具
迴圈中執行。

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
- 預設底線是 `20000` 個 token。
- 設定 `agents.defaults.compaction.reserveTokensFloor: 0` 以停用底線。
- 如果已經更高，OpenClaw 將保持不變。
- 手動 `/compact` 會遵守明確的 `agents.defaults.compaction.keepRecentTokens`
  並保留 Pi 的最近尾部切斷點。如果沒有明確的保留預算，
  手動壓縮仍然是一個硬檢查點，重建的上下文從
  新摘要開始。
- 設定 `agents.defaults.compaction.midTurnPrecheck.enabled: true` 以在新工具結果之後和下一次模型
  呼叫之前執行可選的工具循環預檢。這只是一個觸發器；摘要生成仍然使用配置的
  壓縮路徑。它獨立於 `maxActiveTranscriptBytes`，後者是一個
  週期開始時的有效逐字稿位元組大小保護。
- 將 `agents.defaults.compaction.maxActiveTranscriptBytes` 設定為位元組值或
  字串（例如 `"20mb"`），以便在有效逐字稿
  變大時在週期之前執行本地壓縮。此保護僅在
  同時啟用 `truncateAfterCompaction` 時才會作用。保持未設定或設定 `0` 以
  停用。
- 啟用 `agents.defaults.compaction.truncateAfterCompaction` 後，
  OpenClaw 會在壓縮後將有效逐字稿輪替為壓縮後的繼任 JSONL。
  舊的完整逐字稿保持存檔狀態，並從壓縮檢查點連結，而不是就地重寫。

原因：在壓縮變得不可避免之前，為多輪「內務處理」（如記憶體寫入）留出足夠的空間。

實作：`ensurePiCompactionReserveTokens()` 在 `src/agents/pi-settings.ts` 中
（從 `src/agents/pi-embedded-runner.ts` 呼叫）。

---

## 可插拔的壓縮提供者

外掛程式可以透過外掛程式 API 上的 `registerCompactionProvider()` 註冊壓縮提供者。當 `agents.defaults.compaction.provider` 被設定為已註冊的提供者 ID 時，安全擴充功能會將摘要委託給該提供者，而不是內建的 `summarizeInStages` 管線。

- `provider`：已註冊的壓縮提供者外掛程式的 ID。保留未設定以使用預設的 LLM 摘要。
- 設定 `provider` 會強制執行 `mode: "safeguard"`。
- 提供者會收到與內建路徑相同的壓縮指令和識別符保留策略。
- 在提供者輸出之後，安全機制仍然會保留最近輪次和分割輪次的後綴上下文。
- 內建的安全機制摘要會重新結合先前的摘要與新訊息，而不是逐字保留完整的先前摘要。
- 安全機制模式預設會啟用摘要品質稽核；設定 `qualityGuard.enabled: false` 以跳過在輸出格式錯誤時重試的行為。
- 如果提供者失敗或傳回空結果，OpenClaw 會自動回退到內建的 LLM 摘要。
- 中止/逾時信號會被重新拋出（而不被吞沒），以尊重呼叫者的取消操作。

來源：`src/plugins/compaction-provider.ts`、`src/agents/pi-hooks/compaction-safeguard.ts`。

---

## 使用者可見的介面

您可以透過以下方式觀察壓縮和會話狀態：

- `/status`（在任何聊天會話中）
- `openclaw status` (CLI)
- `openclaw sessions` / `sessions --json`
- 詳細模式：`🧹 Auto-compaction complete` + 壓縮計數

---

## 靜音維護 (`NO_REPLY`)

OpenClaw 支援針對不應讓使用者看到中間輸出的背景任務使用「靜音」輪次。

慣例：

- 助理會以確切的靜音權杖 `NO_REPLY` /
  `no_reply` 開始其輸出，以表示「不要傳遞回覆給使用者」。
- OpenClaw 會在傳遞層中剝離/隱藏此內容。
- 確切的靜音權杖隱藏是不區分大小寫的，因此當整個有效負載僅包含靜音權杖時，`NO_REPLY` 和
  `no_reply` 都會被視為有效。
- 這僅適用於真正的背景/不傳遞輪次；它不是處理一般可執行使用者請求的捷徑。

自 `2026.1.10` 起，當部分區塊以 `NO_REPLY` 開頭時，OpenClaw 也會隱藏 **草稿/輸入串流**，因此靜音操作不會在輪次中途洩漏部分輸出。

---

## 預壓縮「記憶體清除」（已實作）

目標：在自動壓縮發生之前，執行一個靜默的代理回合，將持久化狀態寫入磁碟（例如代理工作區中的 `memory/YYYY-MM-DD.md`），這樣壓縮就不會刪除關鍵上下文。

OpenClaw 使用 **閾值前沖洗** 方法：

1. 監控會話上下文使用情況。
2. 當它跨越「軟閾值」（低於 Pi 的壓縮閾值）時，向代理發送一個靜默的「立即寫入記憶體」指令。
3. 使用確切的靜默令牌 `NO_REPLY` / `no_reply`，以便用戶什麼也看不到。

配置 (`agents.defaults.compaction.memoryFlush`)：

- `enabled`（預設值：`true`）
- `model`（可選的確切提供商/模型覆蓋，用於沖洗回合，例如 `ollama/qwen3:8b`）
- `softThresholdTokens`（預設值：`4000`）
- `prompt`（用於沖洗回合的用戶訊息）
- `systemPrompt`（為沖洗回合附加的額外系統提示詞）

備註：

- 預設提示詞/系統提示詞包含 `NO_REPLY` 提示以抑制傳遞。
- 當設定了 `model` 時，沖洗回合將使用該模型，而不繼承活動會話的後備鏈，因此�限本地的維護不會靜默地回退到付費的對話模型。
- 沖洗每個壓縮週期運行一次（在 `sessions.json` 中追蹤）。
- 沖洗僅針對嵌入式 Pi 會話運行（CLI 後端會跳過它）。
- 當會話工作區為唯讀時（`workspaceAccess: "ro"` 或 `"none"`），將跳過沖洗。
- 有關工作區檔案佈局和寫入模式，請參閱 [記憶體](/zh-Hant/concepts/memory)。

Pi 也在擴充功能 API 中公開了 `session_before_compact` 掛鉤，但 OpenClaw 的沖洗邏輯目前位於 Gateway 端。

---

## 故障排除檢查清單

- 會話金鑰錯誤？從 [/concepts/session](/zh-Hant/concepts/session) 開始，並確認 `sessionKey` 在 `/status` 中。
- 儲存與文字記錄不匹配？從 `openclaw status` 確認 Gateway 主機和儲存路徑。
- 壓縮垃圾訊息？檢查：
  - 模型上下文視窗（過小）
  - 壓縮設定（`reserveTokens` 對於模型視窗來說過高可能會導致更早的壓縮）
  - 工具結果膨脹：啟用/調整會話修剪
- 靜輪迴洩漏？請確認回覆以 `NO_REPLY` 開頭（不區分大小寫的精確 token）並且您使用的是包含流式抑制修復的版本。

## 相關

- [會話管理](/zh-Hant/concepts/session)
- [會話修剪](/zh-Hant/concepts/session-pruning)
- [上下文引擎](/zh-Hant/concepts/context-engine)
