---
summary: "深入探討：Session 儲存 + 逐字稿、生命週期以及（自動）壓縮內部機制"
read_when:
  - You need to debug session ids, transcript JSONL, or sessions.json fields
  - You are changing auto-compaction behavior or adding “pre-compaction” housekeeping
  - You want to implement memory flushes or silent system turns
title: "Session 管理深度探討"
---

# Session 管理與壓縮（深度探討）

本文說明 OpenClaw 如何端到端地管理 Session：

- **Session 路由**（傳入訊息如何對應至 `sessionKey`）
- **Session 儲存** (`sessions.json`) 及其追蹤項目
- **逐字稿持久性** (`*.jsonl`) 及其結構
- **逐字稿整理**（執行前針對供應商的特定修正）
- **Context 限制**（context window 與追蹤 token 的比較）
- **壓縮**（手動 + 自動壓縮）以及掛載預壓縮工作的位置
- **靜默維護**（例如不應產生使用者可見輸出的記憶體寫入）

如果您想先了解高階概覽，請從以下內容開始：

- [/concepts/session](/zh-Hant/concepts/session)
- [/concepts/compaction](/zh-Hant/concepts/compaction)
- [/concepts/session-pruning](/zh-Hant/concepts/session-pruning)
- [/reference/transcript-hygiene](/zh-Hant/reference/transcript-hygiene)

---

## 單一事實來源：Gateway

OpenClaw 的設計圍繞著單一擁有 Session 狀態的 **Gateway 程序**。

- UI（macOS app、網頁 Control UI、TUI）應向 Gateway 查詢 Session 列表和 token 計數。
- 在遠端模式下，Session 檔案位於遠端主機上；「檢查您的本地 Mac 檔案」並不會反映 Gateway 正在使用的內容。

---

## 兩個持久化層級

OpenClaw 在兩個層級中持久化 Session：

1. **Session 儲存 (`sessions.json`)**
   - 鍵/值對映：`sessionKey -> SessionEntry`
   - 小型、可變動、可安全編輯（或刪除條目）
   - 追蹤 Session 中繼資料（當前 session id、最後活動、切換、token 計數器等）

2. **逐字稿 (`<sessionId>.jsonl`)**
   - 具有樹狀結構的僅追加逐字稿（條目具有 `id` + `parentId`）
   - 儲存實際對話 + 工具呼叫 + 壓縮摘要
   - 用於重建未來輪次的模型內容

---

## 磁碟位置

每個 Agent，在 Gateway 主機上：

- 儲存：`~/.openclaw/agents/<agentId>/sessions/sessions.json`
- 逐字稿：`~/.openclaw/agents/<agentId>/sessions/<sessionId>.jsonl`
  - Telegram 主題會話：`.../<sessionId>-topic-<threadId>.jsonl`

OpenClaw 透過 `src/config/sessions.ts` 解析這些內容。

---

## 儲存庫維護與磁碟控制

會話持久化具有針對 `sessions.json` 和轉錄檔案的自動維護控制機制 (`session.maintenance`)：

- `mode`：`warn`（預設）或 `enforce`
- `pruneAfter`：過時條目的保留期限上限（預設 `30d`）
- `maxEntries`：限制 `sessions.json` 中的條目數量（預設 `500`）
- `rotateBytes`：當 `sessions.json` 過大時輪替它（預設 `10mb`）
- `resetArchiveRetention`：`*.reset.<timestamp>` 轉錄存檔的保留期（預設：與 `pruneAfter` 相同；`false` 停用清理）
- `maxDiskBytes`：可選的會話目錄預算
- `highWaterBytes`：清理後的目標使用量（預設為 `80%` 的 `maxDiskBytes`）

磁碟預算清理的執行順序 (`mode: "enforce"`)：

1. 先移除最舊的已存檔或孤立的轉錄檔案。
2. 若仍高於目標值，則驅逐最舊的會話條目及其轉錄檔案。
3. 持續執行直到使用量降至 `highWaterBytes` 或更低。

在 `mode: "warn"` 模式下，OpenClaw 會回報可能的驅逐操作，但不會修改儲存庫或檔案。

按需執行維護：

```bash
openclaw sessions cleanup --dry-run
openclaw sessions cleanup --enforce
```

---

## Cron 會話與執行日誌

獨立的 cron 執行也會建立會話條目/轉錄檔，並且它們擁有專用的保留控制：

- `cron.sessionRetention`（預設 `24h`）會從會話儲存庫中修剪舊的獨立 cron 執行會話（`false` 停用）。
- `cron.runLog.maxBytes` + `cron.runLog.keepLines` 會修剪 `~/.openclaw/cron/runs/<jobId>.jsonl` 檔案（預設值：`2_000_000` 位元組和 `2000` 行）。

---

## 會話金鑰 (`sessionKey`)

`sessionKey` 指出了您所在的*對話存儲桶*（路由 + 隔離）。

常見模式：

- 主/直接聊天（每個代理）：`agent:<agentId>:<mainKey>`（默認 `main`）
- 群組：`agent:<agentId>:<channel>:group:<id>`
- 房間/頻道（Discord/Slack）：`agent:<agentId>:<channel>:channel:<id>` 或 `...:room:<id>`
- Cron：`cron:<job.id>`
- Webhook：`hook:<uuid>`（除非被覆蓋）

標準規則記錄在 [/concepts/session](/zh-Hant/concepts/session)。

---

## Session ids (`sessionId`)

每個 `sessionKey` 指向當前的 `sessionId`（繼續對話的逐字稿文件）。

經驗法則：

- **重置** (`/new`, `/reset`) 會為該 `sessionKey` 創建一個新的 `sessionId`。
- **每日重置**（默認為網關主機本地時間凌晨 4:00）會在重置邊界之後的下一條消息上創建一個新的 `sessionId`。
- **空閒過期** (`session.reset.idleMinutes` 或舊版 `session.idleMinutes`) 會在消息於空閒窗口後到達時創建一個新的 `sessionId`。當同時配置了每日和空閒過期時，以先到期者為準。
- **線程父級分叉守護** (`session.parentForkMaxTokens`，默認 `100000`) 會在父級會話過大時跳過父級逐字稿分叉；新線程將重新開始。設置 `0` 以禁用。

實現細節：決定發生在 `src/auto-reply/reply/session.ts` 中的 `initSessionState()` 裡。

---

## Session store schema (`sessions.json`)

存儲的值類型是 `src/config/sessions.ts` 中的 `SessionEntry`。

關鍵字段（非詳盡）：

- `sessionId`：當前逐字稿 id（文件名由此衍生，除非設置了 `sessionFile`）
- `updatedAt`：最後活動時間戳
- `sessionFile`：可選的顯式逐字稿路徑覆蓋
- `chatType`: `direct | group | room` (幫助 UI 和發送原則)
- `provider`, `subject`, `room`, `space`, `displayName`: 群組/頻道標籤的元數據
- 切換開關：
  - `thinkingLevel`, `verboseLevel`, `reasoningLevel`, `elevatedLevel`
  - `sendPolicy` (每個 session 的覆蓋設定)
- 模型選擇：
  - `providerOverride`, `modelOverride`, `authProfileOverride`
- Token 計數器 (盡力而為 / 取決於供應商)：
  - `inputTokens`, `outputTokens`, `totalTokens`, `contextTokens`
- `compactionCount`: 此 session key 完成自動壓縮的頻率
- `memoryFlushAt`: 上次預壓縮記憶體清除的時間戳
- `memoryFlushCompactionCount`: 上次清除執行時的壓縮計數

存放區可以安全編輯，但 Gateway 是權威來源：它可能會在 session 執行時重寫或還原條目。

---

## 逐字稿結構 (`*.jsonl`)

逐字稿由 `@mariozechner/pi-coding-agent` 的 `SessionManager` 管理。

該檔案是 JSONL 格式：

- 第一行：session 標頭 (`type: "session"`，包含 `id`, `cwd`, `timestamp`，選用的 `parentSession`)
- 接下來：帶有 `id` + `parentId` (樹狀) 的 session 條目

值得注意的條目類型：

- `message`: 使用者/助理/工具結果訊息
- `custom_message`: 擴充功能注入且會進入模型上下文的訊息 (可對 UI 隱藏)
- `custom`: 不會進入模型上下文的擴充功能狀態
- `compaction`: 持久化的壓縮摘要，包含 `firstKeptEntryId` 和 `tokensBefore`
- `branch_summary`: 瀏覽樹狀分支時的持久化摘要

OpenClaw 故意**不**「修補」對話記錄；Gateway 使用 `SessionManager` 來讀寫它們。

---

## Context windows vs tracked tokens

有兩個不同的概念很重要：

1. **Model context window**：每個模型的硬性上限（模型可見的 tokens）
2. **Session store counters**：寫入 `sessions.json` 的滾動統計數據（用於 /status 和儀表板）

如果您正在調整限制：

- Context window 來自模型目錄（並且可以透過配置覆蓋）。
- Store 中的 `contextTokens` 是一個執行時期估計/報告值；不要將其視為嚴格的保證。

更多資訊，請參見 [/token-use](/zh-Hant/reference/token-use)。

---

## Compaction: what it is

Compaction 將較舊的對話總結為對話記錄中持續存在的 `compaction` 條目，並保持最近的訊息不變。

壓縮後，未來的回合會看到：

- 壓縮摘要
- `firstKeptEntryId` 之後的訊息

壓縮是**持久性的**（與 session pruning 不同）。請參見 [/concepts/session-pruning](/zh-Hant/concepts/session-pruning)。

---

## When auto-compaction happens (Pi runtime)

在嵌入式 Pi agent 中，自動壓縮在兩種情況下觸發：

1. **Overflow recovery**：模型返回 context overflow 錯誤 → 壓縮 → 重試。
2. **Threshold maintenance**：成功回合後，當：

`contextTokens > contextWindow - reserveTokens`

其中：

- `contextWindow` 是模型的 context window
- `reserveTokens` 是為 prompts 和下一個模型輸出保留的餘量

這些是 Pi 執行時期的語意（OpenClaw 消費事件，但 Pi 決定何時壓縮）。

---

## Compaction settings (`reserveTokens`, `keepRecentTokens`)

Pi 的壓縮設定位於 Pi settings 中：

```json5
{
  compaction: {
    enabled: true,
    reserveTokens: 16384,
    keepRecentTokens: 20000,
  },
}
```

OpenClaw 也會為嵌入式執行強制執行安全底線：

- 如果 `compaction.reserveTokens < reserveTokensFloor`，OpenClaw 會提高它。
- 預設底線是 `20000` 個 tokens。
- 設定 `agents.defaults.compaction.reserveTokensFloor: 0` 以停用底線。
- 如果已經更高，OpenClaw 將保持不變。

原因：在壓縮變得無法避免之前，留出足夠的餘量供多回合「維護」（如 memory writes）使用。

實作：`ensurePiCompactionReserveTokens()` 於 `src/agents/pi-settings.ts` 中
（從 `src/agents/pi-embedded-runner.ts` 呼叫）。

---

## 使用者可見的介面

您可以透過以下方式觀察壓縮和會話狀態：

- `/status`（於任何聊天會話中）
- `openclaw status`（CLI）
- `openclaw sessions` / `sessions --json`
- 詳細模式：`🧹 Auto-compaction complete` + 壓縮計數

---

## 靜音維護（`NO_REPLY`）

OpenClaw 支援針對背景任務的「靜音」回合，使用者不應在這些任務中看到中間輸出。

慣例：

- 助手以其輸出開頭包含 `NO_REPLY` 來表示「不向使用者傳遞回覆」。
- OpenClaw 會在傳遞層中移除/隱藏此內容。

自 `2026.1.10` 起，當部分區塊以 `NO_REPLY` 開頭時，OpenClaw 也會隱藏 **草稿/輸入串流**，因此靜音操作不會在回合中途洩漏部分輸出。

---

## 壓縮前「記憶體清除」（已實作）

目標：在自動壓縮發生之前，執行一個靜音的代理回合，將持久狀態寫入磁碟（例如代理工作區中的 `memory/YYYY-MM-DD.md`），以便壓縮無法刪除關鍵上下文。

OpenClaw 使用 **閾值前清除** 方法：

1. 監控會話上下文使用量。
2. 當其超過「軟閾值」（低於 Pi 的壓縮閾值）時，向代理執行一個靜音的「立即寫入記憶體」指令。
3. 使用 `NO_REPLY` 讓使用者看不到任何內容。

設定（`agents.defaults.compaction.memoryFlush`）：

- `enabled`（預設值：`true`）
- `softThresholdTokens`（預設值：`4000`）
- `prompt`（清除回合的使用者訊息）
- `systemPrompt`（為清除回合附加的額外系統提示）

註記：

- 預設提示/系統提示包含一個 `NO_REPLY` 提示以隱藏傳遞。
- 清除每個壓縮週期執行一次（在 `sessions.json` 中追蹤）。
- 清除僅針對嵌入式 Pi 會話執行（CLI 後端會跳過它）。
- 當 session 工作區為唯讀（`workspaceAccess: "ro"` 或 `"none"`）時，會跳過重新整理（flush）。
- 請參閱 [Memory](/zh-Hant/concepts/memory) 以了解工作區檔案佈局和寫入模式。

Pi 也在擴充功能 API 中公開了一個 `session_before_compact` hook，但 OpenClaw 的重新整理邏輯目前位於 Gateway 端。

---

## 疑難排解檢查清單

- Session key 錯誤？請先從 [/concepts/session](/zh-Hant/concepts/session) 開始，並確認 `sessionKey` 在 `/status` 中。
- Store 與 transcript 不相符？請從 `openclaw status` 確認 Gateway 主機和 store 路徑。
- 壓縮（Compaction）垃圾訊息？檢查：
  - model context window（太小）
  - 壓縮設定（`reserveTokens` 對於 model window 來說太高可能會導致更早的壓縮）
  - tool-result 臃腫：啟用/調整 session pruning
- Silent turns 洩漏？請確認回覆以 `NO_REPLY`（精確 token）開頭，且您使用的是包含串流抑制修復的版本。

import footerZhHant from "/components/footer/zh-Hant.mdx";

<footerZhHant />
