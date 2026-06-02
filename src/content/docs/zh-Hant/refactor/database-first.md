---
summary: "使 SQLite 成為主要持久狀態和快取層，同時保持設定檔支援的遷移計畫"
title: "資料庫優先的狀態重構"
read_when:
  - Moving OpenClaw runtime data, cache, transcripts, task state, or scratch files into SQLite
  - Designing doctor migrations from legacy JSON or JSONL files
  - Changing backup, restore, VFS, or worker storage behavior
  - Removing session locks, pruning, truncation, or JSON compatibility paths
---

# 資料庫優先的狀態重構

## 決策

使用兩層 SQLite 佈局：

- 全域資料庫：`~/.openclaw/state/openclaw.sqlite`
- 代理程式資料庫：每個代理程式一個 SQLite 資料庫，用於代理程式擁有的工作區、
  轉錄、VFS、成品和大型每代理程式執行時狀態
- 組態保持檔案支援：`openclaw.json` 保留在
  資料庫之外。執行時認證設定檔移至 SQLite；外部提供者或 CLI
  憑證檔案仍由擁有者在 OpenClaw 資料庫之外管理。

全域資料庫是控制平面資料庫。它擁有代理程式探索、共用閘道狀態、配對、裝置/節點狀態、任務和流程分類帳、外掛程式狀態、排程器執行時狀態、備份中繼資料以及遷移狀態。

代理程式資料庫是資料平面資料庫。它擁有代理程式的階段中繼資料、逐字稿事件串流、VFS 工作區或暫存命名空間、工具產出、執行產出，以及可搜尋/可索引的代理程式本機快取資料。

這提供了一個持久的全域視圖，而不會強制將大型代理程式工作區、逐字稿和二進位暫存資料放入共用閘道的寫入路徑中。

## 嚴格合約

此遷移有一個規範的執行時形態：

- Session 列僅保存階段中繼資料。它們絕不能保存
  `transcriptLocator`、逐字稿檔案路徑、同層 JSONL 路徑、鎖定路徑、
  修剪中繼資料或檔案時代相容性指標。
- Transcript 身份恆為 SQLite 身份：`{agentId, sessionId}` 加上
  協議在需要時的選用性主詞元資料。
- `sqlite-transcript://...` 不是執行時或協議身份。新程式碼絕對
  不得衍生、持久化、傳遞、解析或遷移 transcript 定位器。執行時與
  測試完全不應包含偽定位器；文件只有在禁止該字串時才可提及它。
- 舊版 `sessions.json`、transcript JSONL、`.jsonl.lock`、修剪、截斷
  與舊版會話路徑邏輯僅屬於 doctor 遷移/匯入路徑。
- 舊版會話設定別名僅屬於 doctor 遷移。執行時不會
  解讀 `session.idleMinutes`、`session.resetByType.dm`，或
  跨代理的 `agent:main:*` 主會話別名（用於其他已設定的代理）。
- 工作階段路由身分是類型化的關聯式狀態。熱門執行時期和 UI 路徑
  應讀取 `sessions.session_scope`、`sessions.account_id`、
  `sessions.primary_conversation_id`、`conversations` 和
  `session_conversations`；它們絕不能解析 `session_key` 或挖掘
  `session_entries.entry_json` 來取得提供者身分，除非是在刪除舊呼叫位置時作為
  相容性影子。
- 頻道層級的直接訊息標記，例如 `dm` 與 `direct`，是路由
  詞彙，而非文字記錄定位器或檔案儲存相容性控制代碼。
- 舊版 hook 處理器設定僅屬於 doctor 警告/遷移層面。
  執行時期絕不能載入 `hooks.internal.handlers`；hooks 僅透過已探索到的
  hook 目錄和 `HOOK.md` 中繼資料執行。
- 執行時期啟動、熱回覆路徑、壓縮、重置、恢復、診斷、
  TTS、記憶體掛勾、子代理、外掛指令路由、協定邊界以及
  掛勾必須將 `{agentId, sessionId}` 傳遞給執行時期。
- 測試應透過 `{agentId, sessionId}` 填入並斷言 SQLite 轉錄資料列。僅證明 JSONL 路徑轉發、
  呼叫端提供的定位器保留，或轉錄檔案相容性的測試應刪除，除非它們涵蓋 doctor 匯入、非會話支援/除錯
  具象化，或協定形狀。
- `runEmbeddedPiAgent(...)`、準備好的工作執行以及內部嵌入式嘗試不得接受轉錄定位器。它們透過 `{agentId, sessionId}` 開啟 SQLite 轉錄管理器，並將該管理器傳遞給內部化的 PI 相容代理會話，以便過時的呼叫端無法讓執行器寫入 JSON/JSONL 轉錄。
- Runner 診斷必須在 SQLite 中儲存執行時/快取/酬載追蹤記錄。
  執行時診斷不得公開 JSONL 檔案覆寫控制項或通用
  逐字稿 JSONL 匯出輔助工具；使用者面向的匯出可以從資料庫資料列具體化明確的
  成果，而無需將檔案名稱回饋至執行時。
- 原始串流記錄使用 `OPENCLAW_RAW_STREAM=1` 加上 SQLite 診斷資料列。
  舊的 pi-mono `PI_RAW_STREAM`、`PI_RAW_STREAM_PATH` 和
  `raw-openai-completions.jsonl` 檔案記錄器合約不是 OpenClaw
  執行時或測試的一部分。
- QMD 記憶體索引不得將 SQLite 逐字稿匯出為 Markdown 檔案。
  QMD 僅索引已配置的記憶體檔案；會議逐字稿搜尋保持
  SQLite 支援。
- QMD SDK 子路徑對於新程式碼而言僅屬於 QMD。SQLite 會話文字紀錄索引輔助程式位於 `memory-core-host-engine-session-transcripts`；任何 QMD 重新匯出僅為了相容性，執行時期程式碼不得使用。
- 內建記憶體索引位於所屬的代理程式資料庫中。執行時期設定與已解析的執行時期合約不得公開 `memorySearch.store.path`；doctor 會刪除該舊版設定金鑰，而目前的程式碼會在內部傳遞代理程式 `databasePath`。

實作工作應持續刪除程式碼，直到這些陳述在 doctor/import/export/debug 範圍之外無一例外地成立。

## 目標狀態與進度

### 硬性目標

- 一個全域 SQLite 資料庫擁有控制平面狀態：`state/openclaw.sqlite`。
- 每個代理程式一個 SQLite 資料庫擁有資料平面狀態：`agents/<agentId>/agent/openclaw-agent.sqlite`。
- Config 仍然由檔案支援。`openclaw.json` 不在此資料庫重構的範圍內。
- Legacy 檔案僅作為 doctor migration 的輸入。
- Runtime 絕不會將 session 或 transcript JSONL 作為 active state 進行寫入或讀取。

### 目標狀態

- `not-started`：檔案時代的 runtime 程式碼仍會寫入 active state。
- `migrating`：doctor/import 程式碼可以將檔案資料移入 SQLite。
- `dual-read`：暫時性的橋接層會讀取 SQLite 和 Legacy 檔案。除非有明確文件記載為 doctor-only，否則此狀態在此次重構中是被禁止的。
- `sqlite-runtime`：runtime 僅讀寫 SQLite。
- `clean`：舊的 runtime API 和測試已被移除，且防護機制可防止回歸。
- `done`：文件、測試、備份、doctor migration 和變更檢查證明了狀態的乾淨。

### 目前狀態

- Sessions：用於 runtime 的 `clean`。Session 資料列位於 per-agent 資料庫中，
  runtime API 使用 `{agentId, sessionId}` 或 `{agentId, sessionKey}`，而
  `sessions.json` 僅供 doctor 使用的遺留輸入。
- Transcripts：用於 runtime 的 `clean`。Transcript 事件、身分、快照
  和軌跡 runtime 事件位於 per-agent 資料庫中。Runtime 不再
  接受 transcript 定位器或 JSONL transcript 路徑。
- PI embedded runner：`clean`。Embedded PI 執行、prepared workers、壓縮
  和重試迴圈使用 SQLite session 範圍並拒絕過期的 transcript handles。
- Cron: `clean` 用於 runtime。Runtime 使用 `cron_jobs` 和 `cron_run_logs`；runtime 測試使用 SQLite `storeKey` 命名，而檔案時代的 cron 路徑僅保留在 doctor legacy migration 測試中。
- Task registry: `clean`。Task 和 Task Flow runtime 資料列位於 `state/openclaw.sqlite`；未發布的 sidecar SQLite 匯入器已被刪除。
- Plugin state: `clean`。Plugin state/blob 資料列位於共享的全域資料庫中；舊的 plugin-state sidecar SQLite 輔助程式已被防護。
- Memory: `sqlite-runtime` 用於內建記憶體和 session 逐字稿索引。Memory 索引表位於 per-agent 資料庫中，plugin memory state 使用共享的 plugin-state 資料列，而 legacy memory 檔案則是 doctor migration 輸入或使用者工作區內容。
- 備份：`sqlite-runtime`。備份階段會壓縮 SQLite 快照，省略即時
  WAL/SHM 附屬檔案，驗證 SQLite 完整性，並在全域資料庫中記錄備份執行。
- Doctor 遷移：`migrating`，是有意為之的。Doctor 將舊版 JSON、
  JSONL 和已停用的附屬儲存庫匯入 SQLite，記錄遷移執行/來源，並移除成功的來源。
- E2E 腳本：`clean` 用於執行時期覆蓋率。Docker MCP 播種會寫入 SQLite
  列。runtime-context Docker 腳本僅在 doctor 遷移播種內建立舊版 JSONL，並明確命名舊版會話索引路徑。

### 剩餘工作

- [x] 將 cron runtime-test 存儲變數從 `storePath` 重命名，除非它們是 doctor 舊版輸入。
      檔案：`src/cron/service.test-harness.ts`、
      `src/cron/service.runs-one-shot-main-job-disables-it.test.ts`、
      `src/cron/service/timer.regression.test.ts`、
      `src/cron/service/ops.test.ts`、`src/cron/service/store.test.ts`、
      `src/cron/service.heartbeat-ok-summary-suppressed.test.ts`、
      `src/cron/service.main-job-passes-heartbeat-target-last.test.ts`、
      `src/cron/store.test.ts`。
      證明：`pnpm check:database-first-legacy-stores`；`rg -n 'storePath' src/cron --glob '!**/commands/doctor/**'`。
- [x] 移除或重新命名過時的檔案時代 export 測試模擬物件。
      檔案：`src/auto-reply/reply/commands-export-test-mocks.ts`。
      證明：`rg -n 'resolveSessionFilePath|sessionFile|storePath|transcriptLocator' src/auto-reply/reply`。
- [x] 讓 Docker runtime-context 舊版 JSONL 種子明顯僅用於 doctor。
      檔案：`scripts/e2e/session-runtime-context-docker-client.ts`。
      證明：`rg -n 'sessions\\.json|sessionFile|\\.jsonl' scripts/e2e/session-runtime-context-docker-client.ts` 僅顯示
      `seedBrokenLegacySessionForDoctorMigration`。
- [x] 在任何架構變更後保持 Kysely 生成的類型一致。
      檔案：`src/state/openclaw-state-schema.sql`、
      `src/state/openclaw-agent-schema.sql`、
      `src/state/*generated*`。
      證明：此階段無架構變更；`pnpm db:kysely:check`；
      `pnpm lint:kysely`。
- [x] 針對受影響的 stores、commands 和 scripts 重新執行專注測試。
      證明：`pnpm test src/cron/service/store.test.ts src/cron/store.test.ts src/cron/service.heartbeat-ok-summary-suppressed.test.ts src/cron/service.main-job-passes-heartbeat-target-last.test.ts src/cron/service.every-jobs-fire.test.ts src/cron/service.persists-delivered-status.test.ts src/cron/service.runs-one-shot-main-job-disables-it.test.ts src/cron/service/ops.test.ts src/cron/service/timer.regression.test.ts src/auto-reply/reply/commands-export-trajectory.test.ts extensions/telegram/src/thread-bindings.test.ts extensions/slack/src/monitor/message-handler/prepare.test.ts src/acp/translator.session-lineage-meta.test.ts`；`git diff --check`。
- [x] 在宣告 `done` 之前，執行變更的 gate 或遠端廣泛證明。
      證明：`pnpm check:changed --timed -- <changed extension paths>` 在 Hetzner Crabbox run `run_3f1cabf6b25c` 上通過，
      在臨時 Node 24/pnpm 設定以及針對已同步的 no-`.git` workspace 的明確路徑路由之後。

### 不要倒退

- 沒有文字紀錄定位器。
- 沒有作用中的 session 檔案。
- 除了 doctor 舊版遷移測試外，沒有假的 JSONL 測試夾具。
- 在預期使用 Kysely 的地方不使用原始 SQLite 存取。
- 不再新增舊版資料庫遷移。此佈局尚未發布；除非有強烈理由，否則請將 schema 版本保持在 `1`。

## 程式碼閱讀假設

沒有後續的產品決策阻礙此計畫。實作應根據這些假設進行：

- 直接使用 `node:sqlite` 並要求此儲存路徑使用 Node 22+ 執行環境。
- 保持僅有一個正常的設定檔。不要在此重構中將設定、插件清單或 Git 工作區移至 SQLite。
- 不需要執行時期相容性檔案。舊版 JSON 和 JSONL 檔案僅作為遷移輸入。分支本機 SQLite 側車檔案從未發布，應刪除而非匯入。
- `openclaw doctor --fix` 擁有從舊版檔案到資料庫的遷移步驟。
  執行時啟動和 `openclaw migrate` 不應攜帶舊版 OpenClaw
  資料庫升級路徑。
- 憑證相容性遵循相同的規則：執行時憑證存在於
  SQLite 中。舊的 `auth-profiles.json`、每個代理程式的 `auth.json` 和共用
  `credentials/oauth.json` 檔案是 doctor 遷移輸入，然後在匯入後
  移除。
- 產生的模型目錄狀態是由資料庫支援的。執行時程式碼絕不能寫入
  `agents/<agentId>/agent/models.json`；現有的 `models.json` 檔案是舊版
  doctor 輸入，並在匯入到 `agent_model_catalogs` 後移除。
- 執行時期不得遷移、正規化或橋接文字紀錄定位器。作用中的
  文字紀錄識別在 SQLite 中為 `{agentId, sessionId}`。檔案路徑僅
  為舊版 doctor 輸入，且 `sqlite-transcript://...` 必須從
  執行時期、協定、掛鉤與外掛介面中消失，而不是被視為
  邊界控制代碼。
- 執行時期 SQLite 文字紀錄讀取不會執行舊版 JSONL 項目形狀遷移或
  重寫整份文字紀錄以達成相容性。舊版項目正規化保留在
  明確的 doctor/import 工具中。Doctor 會在插入 SQLite 列之前
  正規化舊版 JSONL 文字紀錄檔案；目前的執行時期列
  已以目前的文字紀錄架構寫入。Trajectory/session 匯出
  會原樣讀取這些列，且不得執行匯出時期的舊版遷移。
- 舊版文字紀錄 JSONL 解析/遷移輔助函式僅供 doctor 使用。執行時文字紀錄格式程式碼僅建構目前的 SQLite 文字紀錄上下文；doctor 負責在插入資料列前升級舊版 JSONL 項目。
- 舊版由執行時擁有的 JSONL 文字紀錄串流輔助函式已被刪除。Doctor 匯入程式碼負責明確的舊版檔案讀取；執行時工作階段歷史記錄則讀取 SQLite 資料列。
- Codex app-server 繫結使用 OpenClaw `sessionId` 作為 Codex plugin-state 命名空間中的標準金鑰。`sessionKey` 是用於路由/顯示的元資料，且不得取代持久的 session id 或恢復文字紀錄檔的身分。
- Context 引擎直接接收當前的執行時合約。Registry 必須不使用刪除 `sessionKey`、`transcriptScope` 或 `prompt` 的重試填充層來包裝引擎；無法接受當前 database-first 參數的引擎應該明確失敗，而不是被橋接。
- 備份輸出應保持為一個歸檔檔案。資料庫內容應以緊湊的 SQLite 快照形式進入該歸檔，而不是原始的即時 WAL 副檔名檔案。
- Transcript 搜尋很有用，但對第一個 database-first 版本來說並非必需。請設計 schema 以便稍後可以新增 FTS。
- 在資料庫邊界穩定之前，Worker 執行應保持在設定後的實驗性狀態。

## Code-Read 發現

目前的分支已經超越了概念驗證階段。共享資料庫已經存在，Node `node:sqlite` 透過一個小型的運行時輔助程式進行連接，而先前的儲存現已寫入 `state/openclaw.sqlite` 或擁有的 `openclaw-agent.sqlite` 資料庫。

剩餘的工作不在於選擇 SQLite；而在於保持新的邊界乾淨，並刪除任何仍像舊檔案世界的相容性介面：

- Session `storePath` 不再是運行時身分、測試夾具形狀或狀態負載欄位。運行時和橋接測試不再包含 `storePath` 合約名稱；doctor/遷移程式碼擁有該舊版詞彙。
- Session 寫入不再通過舊的行程內 `store-writer.ts` 佇列。SQLite 修補寫入改用衝突偵測和有限重試。
- 舊版路徑探索仍有有效的遷移用途，但執行時代碼應停止將 `sessions.json` 和逐字稿 JSONL 檔案視為可能的寫入目標。
- 代理程式擁有的資料表位於每個代理程式的 SQLite 資料庫中。全域資料庫保留註冊表/控制平面資料列；逐字稿身分是 `{agentId, sessionId}` 位於每個代理程式的逐字稿資料列中。執行時代碼不得保存逐字稿檔案路徑或遷移逐字稿定位器。
- Doctor 已經匯入幾個舊版檔案。清理工作是將其變成 Doctor 呼叫的單一明確遷移實作，並具有持久的遷移報告。

沒有額外的產品問題阻礙實作。

## 目前的程式碼結構

此分支已經具有一個真正的共享 SQLite 基礎：

- 執行時環境現在最低為 Node 22+：`package.json`，CLI 執行時檢查、安裝程式預設值、macOS 執行時定位器、CI 以及公開安裝文件現已全部一致。舊的 Node 22 相容性通道已移除。
- `src/state/openclaw-state-db.ts` 開啟 `openclaw.sqlite`，設定 WAL、`synchronous=NORMAL`、`busy_timeout=30000`、`foreign_keys=ON`，並套用從 `src/state/openclaw-state-schema.sql` 衍生的生成架構模組。
- Kysely 表格類型和執行時架構模組是從已提交的 `.sql` 檔案所建立的可拋棄 SQLite 資料庫生成的；執行時程式碼不再為全域、每個代理程式或代理程式擷取資料庫保留複製貼上的架構字串。
- 執行時期儲存從生成的 Kysely `DB` 介面推導所選和插入的列類型，而不是手動遮蔽 SQLite 列形狀。原始 SQL 僅限於架構應用、 pragmas 和僅用於遷移的 DDL。
- SQLite 架構已折疊至 `user_version = 1`，因為此資料庫佈局尚未發布。執行時期開啟器僅建立目前的架構；檔案至資料庫的匯入仍保留在 doctor 程式碼中，且分支本地的資料庫升級輔助程式已被刪除。
- 在擁有權邊界為規範的地方會強制執行關聯式擁有權：來源遷移列從 `migration_runs` 級聯，任務傳遞狀態從 `task_runs` 級聯，以及文字紀錄識別列從文字紀錄事件級聯。
- 當前共享表格包括 `agent_databases`、
  `auth_profile_stores`、`auth_profile_state`、
  `plugin_state_entries`、`plugin_blob_entries`、`media_blobs`、
  `skill_uploads`、`capture_sessions`、`capture_events`、`capture_blobs`、
  `sandbox_registry_entries`、`cron_run_logs`、`cron_jobs`、`commitments`、
  `delivery_queue_entries`、`model_capability_cache`、
  `workspace_setup_state`、`native_hook_relay_bridges`、
  `current_conversation_bindings`、`plugin_binding_approvals`、
  `tui_last_sessions`、`task_runs`、`task_delivery_state`、`flow_runs`、
  `subagent_runs`、`migration_runs` 和 `backup_runs`。
- 任意外掛擁有的狀態不會獲得主機擁有的類型表格。已安裝的外掛使用 `plugin_state_entries` 來儲存版本化的 JSON 載荷，並使用 `plugin_blob_entries` 來儲存位元組，並透過命名空間/金鑰擁有權、TTL 清理、備份和外掛遷移記錄進行管理。當主機擁有查詢合約時，主機擁有的外掛編排狀態仍可具有類型表格，例如 `plugin_binding_approvals`。
- 外掛遷移是對外掛擁有命名空間的資料遷移，而非主機架構遷移。外掛可以透過遷移提供者遷移其自身的版本化狀態/ blob 條目，而主機會在正常的遷移帳本中記錄來源/執行狀態。除非主機本身要接管新的跨外掛合約，否則安裝新外掛不需要變更 `openclaw-state-schema.sql`。
- `src/state/openclaw-agent-db.ts` 開啟
  `agents/<agentId>/agent/openclaw-agent.sqlite`，在全域 DB 中註冊資料庫，並擁有代理程式本機的 session、transcript、VFS、artifact、cache
  和 memory-index 表格。共享執行時期探索現在會讀取產生的型別安全
  `agent_databases` 註冊表，而不是在每個呼叫點
  重新實作該查詢。
- 全域和每個代理程式的資料庫會記錄一個包含資料庫角色、
  schema 版本、時間戳記以及代理程式資料庫之代理程式 ID 的 `schema_meta` 資料列。由於此 SQLite schema 尚未發布，佈局目前
  仍維持在 `user_version = 1`。
- 個別代理的會話身分現在具備以 `session_id` 為鍵值的正規 `sessions` 根資料表，並包含 `session_key`、`session_scope`、`account_id`、`primary_conversation_id`、時間戳記、顯示欄位、模型中繼資料、駁束 ID 以及父項/衍生連結作為可查詢欄位。`session_routes` 是從 `session_key` 到當前 `session_id` 的唯一作用中路徑索引，因此路徑鍵可以移至全新的持久化會話，而無需讓熱讀取在重複的 `sessions.session_key` 資料列之間選擇。舊的 `session_entries.entry_json` 相容性酬載透過外來鍵掛載於持久化 `session_id` 根上；它不再是會話在綱要層級的唯一呈現方式。
- 每個 Agent 的外部對話身分也是關聯式的：
  `conversations` 儲存正規化的提供者/帳戶/對話身分，而
  `session_conversations` 將一個 OpenClaw 工作階段連結到一個或多個外部
  對話。這涵蓋了共享主控 DM 工作階段，在此類工作階段中，多個對等方可以
  有意地對應到同一個工作階段，而無須在 `session_key` 中虛報。SQLite 也會
  對自然提供者身分執行唯一性約束，因此相同的
  channel/account/kind/peer/thread 元組無法在不同的對話 ID 之間分叉。
  共享主控直接對等方是透過 `participant` 角色連結的，因此一個
  OpenClaw 工作階段可以代表多個外部 DM 對等方，而無須將
  舊的對等方降級為模糊的相關資料列。`sessions.primary_conversation_id` 仍然
  指向當前類型的傳遞目標。封閉式路由/狀態資料列
  是透過 SQLite `CHECK` 約束來執行的，而不僅僅依賴
  TypeScript 聯集。
  執行時期工作階段投影會在套用類型工作階段/對話
  資料列之前，從 `session_entries.entry_json` 中清除相容性路由陰影，
  因此過時的 JSON 負載無法復活傳遞目標。
  子 Agent 公告路由同樣需要類型的 SQLite 傳遞上下文；
  它不再回退到相容性 `SessionEntry` 路由欄位。
  閘道 `chat.send` 明確傳遞繼承會讀取類型的 SQLite
  傳遞上下文，而不是 `origin`/`last*` 相容性欄位。
  `tools.effective` 同樣從類型
  SQLite 傳遞/路由資料列衍生提供者/帳戶/執行緒上下文，而不是過時的 `last*` 工作階段項目陰影。
  系統事件提示上下文會從類型傳遞欄位重建 channel/to/account/thread 欄位，
  而不是 `origin` 陰影。
  共用的 `deliveryContextFromSession` 輔助程式和工作階段對對話
  對應器現在會完全忽略 `SessionEntry.origin`；只有類型傳遞欄位
  和關聯式對話資料列可以建立熱路由身分。
  執行時期工作階段項目正規化會在持久化或
  投影 `entry_json` 之前去除 `origin`，並且傳入中繼資料會寫入類型 channel/chat
  欄位以及關聯式對話資料列，而不是建立新的來源
  陰影。
- Transcript 事件、transcript 快照和軌跡執行時事件現在引用標準的每個代理 `sessions` 根，並在刪除 session 時級聯。Transcript 身份/冪等行繼續從確切的 transcript 事件行級聯。
- Memory-core 索引現在使用明確的 agent-database 表
  `memory_index_meta`、`memory_index_sources`、`memory_index_chunks` 和
  `memory_embedding_cache`；可選的 FTS/vector 側索引使用相同的
  `memory_index_*` 前綴，而不是通用的 `meta`、`files`、`chunks` 或
  `chunks_vec` 表。`memory_index_sources` 以
  `(source_kind, source_key)` 為鍵並攜帶可選的 `session_id` 所有權，因此
  當刪除會話時，從會話衍生的來源和區塊會級聯刪除。快取的
  區塊嵌入儲存為 Float32 SQLite BLOB，而不是 JSON 文字陣列。
  這些表是衍生/搜尋快取，而不是正規的逐字稿儲存；它們
  可以從 `sessions`、`transcript_events` 和記憶體
  工作區檔案中刪除並重建。
- Subagent 執行恢復狀態現在位於具有索引子項、請求者和控制器會話金鑰的類型化共享 `subagent_runs` 資料列中。舊的 `subagents/runs.json` 檔案僅作為 doctor 遷移輸入。
- 目前的對話綁定位於以正規化對話 ID 為金鑰的類型化共享 `current_conversation_bindings` 資料列中，包含目標 agent/session 欄位、對話類型、狀態、有效期限和元資料，這些資料作為關聯式欄位儲存，而非重複的不透明綁定記錄。持久綁定金鑰包含正規化對話類型，因此 direct/group/channel 參考不會衝突，且 SQLite 會拒絕無效的綁定類型/狀態值。舊的 `bindings/current-conversations.json` 檔案僅作為 doctor 遷移輸入。
- 傳遞佇列恢復現在將類型化的佇列欄位（包括 channel、target、account、session、retry、error、platform-send 和 recovery state）疊加在重播 JSON 上。`entry_json` 保留重播負載、掛鉤和格式化負載，但類型化欄位對於熱佇列路由/狀態具有最終決定權。
- TUI 上次會話還原指標現在位於以雜湊 TUI 連線/會話範圍為鍵的類型化共用 `tui_last_sessions` 資料列中。舊的 TUI JSON 檔案僅作為 doctor 遷移的輸入。
- 預設 TTS 偏好設定現在位於在 `speech-core` 外掛程式下索引鍵的共用外掛程式狀態 SQLite 資料列中。舊的 `settings/tts.json` 檔案僅作為 doctor 遷移的輸入；執行時期不再讀取或寫入 TTS 偏好設定 JSON 檔案，且舊版路徑解析器位於 doctor 遷移模組中。
- 秘密目標元數據現在談論的是存儲，而不是假設每個憑證目標都是一個配置檔案。`openclaw.json` 仍然是配置存儲；auth-profile 目標使用類型化的 SQLite `auth_profile_stores` 行，其中提供者形狀的憑證以 JSON 負載的形式保存。
- 秘密稽核不再掃描已棄用的每個代理程式 `auth.json` 檔案。Doctor 負責警告、匯入和刪除該舊版檔案。
- 舊版 auth profile 路徑輔助程式現在位於 doctor 舊版程式碼中。核心 auth profile 路徑輔助程式公開 SQLite auth-store 身分和顯示位置，而不是 `auth-profiles.json` 或 `auth-state.json` 執行時路徑。
- Subagent 執行恢復與 OpenRouter 模型功能快取執行時模組
  現在將 SQLite 快照讀取器/寫入器與僅限 doctor 的舊版 JSON
  匯入輔助程式分開。OpenRouter 功能使用 `model_capability_cache` 下的型別化通用
  `provider_id = "openrouter"` 列，而不是
  一個不透明的快取 blob 或供應商特定的主機表格。Subagent 執行
  `taskName` 儲存在型別化的 `subagent_runs.task_name` 欄位中；
  `payload_json` 副本是重播/除錯資料，而非熱顯示或
  查閱欄位的來源。
- `src/agents/filesystem/virtual-agent-fs.sqlite.ts` 在 agent 資料庫 `vfs_entries` 資料表上實作 SQLite VFS。目錄讀取、遞迴匯出、刪除和重新命名使用已索引的 `(namespace, path)` 前綴範圍，而不是掃描整個命名空間或依賴 `LIKE` 路徑匹配。
- `src/agents/runtime-worker.entry.ts` 為 worker 建立每次執行的 SQLite VFS、工具成果、執行成果和作用域快取儲存。
- 工作區啟動完成標記現在存在於以解析的工作區路徑為鍵的型別共用 `workspace_setup_state` 列中，而不是 `.openclaw/workspace-state.json` 中；執行時期不再讀取或重寫舊版的工作區標記，而協助 API 不再僅為了推導儲存身分而傳遞假的 `.openclaw/setup-state` 路徑。
- Exec 批准現在存在於類型化的共享 SQLite `exec_approvals_config`
  單例行中。Doctor 匯入舊版 `~/.openclaw/exec-approvals.json`；
  執行時寫入不再建立、重寫或將該檔案回報為其作用中
  儲存位置。macOS 伴隨程式會讀寫相同的
  `state/openclaw.sqlite` 表格列；它在磁碟上僅保留 Unix 提示 socket，
  因為那是 IPC，而非持久的執行時狀態。
- 裝置身分、裝置驗證和引導執行時模組現在將其 SQLite 快照讀取器/寫入器與僅供 Doctor 使用的舊版 JSON 匯入輔助程式分開。裝置身分使用類型化的 `device_identities` 資料列，而裝置驗證權杖使用類型化的 `device_auth_tokens` 資料列。裝置驗證寫入會依據裝置/角色來協調資料列，而不是截斷權杖資料表，且執行時不再透過舊的整體儲存介面卡路由單一權杖更新。舊版 version-1 JSON 載荷僅作為 Doctor 匯入/匯出結構存在。
- GitHub Copilot 權杖交換快取使用 `github-copilot/token-cache/default` 下的共享 SQLite plugin-state 資料表。這是提供者擁有的快取狀態，因此它刻意不新增主機架構資料表。
- 共享的 Swift 運行時 (`OpenClawKit`) 針對設備身分和設備授權使用相同的 `state/openclaw.sqlite` 資料列。macOS 應用程式輔助程式匯入共享的 SQLite 輔助程式，而不是擁有第二個 JSON 或 SQLite 路徑。一個剩餘的舊版 `identity/device.json` 會阻擋身分建立，直到 doctor 將其匯入 SQLite 為止，這與 TypeScript 和 Android 啟動閘門相符。
- Android 設備身分使用與 TypeScript 相同的金鑰素材，儲存在具類型的 `state/openclaw.sqlite#table/device_identities` 資料列中。它從不讀取或寫入 `openclaw/identity/device.json`；一個剩餘的舊版檔案會阻擋啟動，直到 doctor 將其匯入 SQLite 為止。
- Android 快取的裝置驗證權杖也使用類型化的 `state/openclaw.sqlite#table/device_auth_tokens` 資料列，並與 TypeScript 和 Swift 共用相同的 version-1 權杖語意。Runtime 不再讀取 `SecurePrefs` `gateway.deviceToken*` 相容性金鑰；這些僅屬於遷移/doctor 邏輯。
- Android 通知的最近套件歷史記錄使用類型化的 `android_notification_recent_packages` 資料列。Runtime 不再遷移或讀取舊的 SharedPreferences CSV 金鑰。
- 當舊版 `identity/device.json` 存在、SQLite 身份資料列無效，或 SQLite 身份存放區無法開啟時，裝置身分建立會以封閉式失敗處理。Doctor 會先匯入並移除該檔案，因此 runtime 啟動無法在遷移前無聲地輪換配對身分。
- 裝置身分選擇是一個 SQLite 列鍵，而不是 JSON 檔案定位器。測試和閘道輔助函數會傳遞明確的身分鍵；只有 doctor 遷移和故障關閉啟動閘道知道已退役的 `identity/device.json` 檔名。
- 會話重設相容性現在存在於 doctor 設定遷移中：`session.idleMinutes` 已移至 `session.reset.idleMinutes`，`session.resetByType.dm` 已移至 `session.resetByType.direct`，並且執行時重設政策僅讀取標準重設鍵。
- 舊版設定相容性現已位於 `src/commands/doctor/` 下。一般的 `readConfigFileSnapshot()` 驗證不會匯入 doctor 舊版偵測器或標註舊版問題；`runDoctorConfigPreflight()` 會為 doctor 修復/報告新增這些問題。doctor 設定流程會匯入 `src/commands/doctor/legacy-config.ts`，而舊的 OAuth profile-id 修復則位於 `src/commands/doctor/legacy/oauth-profile-ids.ts` 下。
- 非 doctor 指令不會自動執行舊版設定修復。例如，`openclaw update --channel` 現在會在遇到無效的舊版設定時失敗，並要求使用者執行 doctor，而不是靜默地匯入 doctor 遷移程式碼。
- Web push、APNs、Voice Wake、更新檢查和設定狀態檢查現在對於訂閱、VAPID 金鑰、節點註冊、觸發器資料列、路由資料列、更新通知狀態和設定狀態條目，使用類型化的共享 SQLite 資料表，而不是整個不透明的 JSON blob。Web push 和 APNs 的快照寫入現在透過主鍵協調訂閱/註冊，而不是清空其資料表；設定狀態檢查則透過設定路徑執行相同操作。其執行時模組將 SQLite 快照讀取器/寫入器與僅限 doctor 的舊版 JSON 匯入輔助程式分開。
- Node-host 設定現在使用共享 SQLite 資料庫中的類型化單例資料列；doctor 會在正常執行時使用之前匯入舊的 `node.json` 檔案。
- Device/node 配對、channel 配對、channel 允許清單以及 bootstrap 狀態
  現在使用具類型的 SQLite 資料列，而非整個不透明的 JSON blob。外掛程式綁定
  批准以及 cron 工作狀態遵循相同的分割方式：執行時模組公開
  SQLite 支援的操作與中性快照輔助程式，而配對/bootstrap
  加上外掛程式綁定批准的快照寫入則透過主鍵協調資料列
  而非截斷資料表，同時 doctor 透過
  `src/commands/doctor/legacy/*` 模組匯入/移除舊的 JSON 檔案。
- 已安裝的外掛程式記錄現在位於 SQLite 已安裝外掛程式索引中。
  執行時設定讀寫不再遷移或保留舊的
  `plugins.installs` authored-config 資料；doctor 會在一般執行時使用前
  將該遺留設定形狀匯入 SQLite。
- QQBot 憑證恢復快照現在位於 SQLite 外掛程式狀態下的 `qqbot/credential-backups` 中。Runtime 不再寫入 `qqbot/data/credential-backup*.json`；doctor 會與其他 QQBot 狀態輸入一起匯入並移除那些舊版備份檔案。
- Gateway 重載規劃會比較內部 `installedPluginIndex.installRecords.*` diff 命名空間下的 SQLite 已安裝外掛程式索引快照。Runtime 重載決策不再將這些資料列包裝在假的 `plugins.installs` config 物件中。
- Matrix 命名帳號憑證升級不再於 Runtime 讀取期間發生。當可以解析單一/預設 Matrix 帳號時，Doctor 負責處理舊的頂層 `credentials/matrix/credentials.json` 重新命名。
- Core 配對和 cron 運行時模組不再匯出舊版 JSON 路徑建構器。Doctor 擁有的舊版模組僅為匯入測試和遷移建構 `pending.json`、`paired.json`、`bootstrap.json` 和 `cron/jobs.json` 來源路徑。舊版 cron job-shape 正規化和 cron run-log 匯入位於 `src/commands/doctor/legacy/cron*.ts` 之下。
- `src/commands/doctor/legacy/runtime-state.ts` 從 doctor 將舊版 JSON 狀態檔案（包括 node host 配置）匯入 SQLite。新的舊版檔案匯入器保留在 `src/commands/doctor/legacy/` 之下。
- `src/commands/doctor/state-migrations.ts` 將舊版 `sessions.json` 和
  `*.jsonl` 轉錄直接匯入 SQLite 並移除成功的來源。它
  不再透過 `agents/<agentId>/sessions/*.jsonl` 暫存根層舊版轉錄
  或在匯入前建立規範的 JSONL 目標。
- 狀態完整性 doctor 檢查不再掃描舊版 session 目錄或
  提供刪除孤兒 JSONL 的選項。舊版轉錄檔案僅作為遷移輸入，
  且遷移步驟負責匯入及來源移除。
- 舊版 sandbox registry 匯入位於
  `src/commands/doctor/legacy/sandbox-registry.ts` 之下；使用中的 sandbox registry
  讀寫仍然僅限 SQLite。
- 舊版 session 轉錄健康狀態/匯入修復位於
  `src/commands/doctor/legacy/session-transcript-health.ts` 之下；runtime command
  模組不再包含 JSONL 轉錄解析或使用中分支修復程式碼。

合併/刪除重點摘要：

- 外掛狀態現在使用共享的 `state/openclaw.sqlite` 資料庫。舊的
  分支本地的 `plugin-state/state.sqlite` 附屬匯入器已被移除，因為
  該 SQLite 版面從未發布過。探測/測試輔助程式回報共享的
  `databasePath`，而不是公開外掛狀態專屬的 SQLite 路徑。
- Task 和 Task Flow 執行時期資料表现在位於共享的
  `state/openclaw.sqlite` 資料庫中，而不是 `tasks/runs.sqlite` 和
  `tasks/flows/registry.sqlite`；舊的附屬匯入器已被移除，
  原因同樣是該版面從未發布。
- `src/config/sessions/store.ts` 不再需要 `storePath` 來取得輸入
  中繼資料、路由更新或更新時間讀取。指令持久化、CLI
  會話清理、子代理程式深度、授權覆寫和文字記錄會話
  身份使用 agent/session row API。寫入會作為 SQLite 列修補
  應用，並搭配樂觀衝突重試。
- Session 目標解析現在公開各代理程式的資料庫目標，而非舊版
  `sessions.json` 路徑。共用閘道、ACP 中繼資料、doctor 路由修復和
  `openclaw sessions` 會列舉 `agent_databases` 加上已設定的代理程式。
- 閘道會話路由現在使用 `resolveGatewaySessionDatabaseTarget`；
  傳回的目標攜帶 `databasePath` 和候選 SQLite 列鍵，
  而非舊版會話存放區檔案路徑。
- 通道 session 執行時型別現在公開 `{agentId, sessionKey}` 用於
  updated-at 讀取、輸入中繼資料和 last-route 更新。舊的
  `saveSessionStore(storePath, store)` 相容性型別已移除。
- 外掛執行時、擴充 API 和 `config/sessions` barrel 層現在引導
  外掛程式碼至 SQLite 支援的 session row helpers。根函式庫相容性
  匯出 (`loadSessionStore`、`saveSessionStore`、`resolveStorePath`) 保留為
  現有使用者的已棄用 shims。舊的
  `resolveLegacySessionStorePath` helper 已移除；舊版 `sessions.json` 路徑
  建構現在僅限於遷移和測試 fixtures。
- `src/config/sessions/session-entries.sqlite.ts` 現在將標準會話條目儲存在 per-agent 資料庫中，並支援行級的讀取/upsert/delete 修補。Runtime upsert/patch/delete 不再掃描大小寫變體或修剪舊版別名金鑰；doctor 擁有標準化的責任。獨立的 JSON 匯入輔助程式已移除，且遷移會合併 upsert較新的列，而不是取代整個會話資料表。公開的 read/list/load 輔助程式從類型的 `sessions` 和 `conversations` 列中投射熱會話中繼資料；`entry_json` 是一個相容性/除錯影子，可能會過時或無效，而不會失去類型的會話身分或傳遞上下文。
- `src/config/sessions/delivery-info.ts` 現在會從針對各個代理程式設定型別的 `sessions` + `conversations` + `session_conversations` 資料列中解析傳遞情境。
  它不再從 `session_entries.entry_json` 重建執行時期的傳遞身分；缺少設定型別的對話資料列屬於 doctor
  遷移/修復問題，而非執行時期的後備方案。
- 已儲存的工作階段重置決策現在會優先使用設定型別的 `sessions.session_scope`、
  `sessions.chat_type` 和 `sessions.channel` 中繼資料。`sessionKey` 剖析
  僅保留用於命令目標上明確的執行緒/主題後綴；群組與直接重置的分類不再來自鍵的形狀。
- 會話列表/狀態顯示分類現在使用類型化的聊天元資料和
  閘道會話種類。它不再將 `session_key` 內的 `:group:` 或 `:channel:` 子字串
  視為永久的群組/直接真值。
- 靜默回覆策略選擇現在使用明確的對話類型或介面
  元資料。它不再從 `session_key` 子字串
  推測直接/群組策略。
- 會話顯示模型解析現在接受來自 SQLite
  會話資料庫目標的代理程式 ID，而不是從 `session_key` 中將其分割出來。
- Agent-to-agent announce target hydration now uses typed `sessions.list`
  `deliveryContext` only. It no longer recovers channel/account/thread routing
  from legacy `origin`, mirrored `last*` fields, or `session_key` shape.
- `sessions_send` thread-target rejection now reads typed SQLite routing
  metadata. It no longer rejects or accepts targets by parsing thread suffixes
  out of the target key.
- Group-scoped tool policy validation now reads typed SQLite conversation
  routing for the current or spawned session. It no longer trusts group/channel
  identity by decoding `sessionKey`; caller-provided group ids are dropped when
  no typed session row vouches for them.
- 通道模型覆寫匹配現在使用顯式的群組和父級對話元數據。它不再從 `parentSessionKey` 解碼父級對話 ID。
- 存儲的模型覆寫繼承現在需要來自類型化會話上下文的顯式父級會話金鑰。它不再從 `sessionKey` 中的 `:thread:` 或 `:topic:` 後綴推導父級覆寫。
- 舊的會話線程資訊包裝器和已加載插件線程解析器已不復存在；沒有運行時代碼導入 `config/sessions/thread-info`。
- 通道對話助手不再公開完整會話金鑰解析橋接器。核心仍然通過 `resolveSessionConversation(...)` 規範化提供者擁有的原始對話 ID，但它不會從 `sessionKey` 重建路由事實。
- 完成交付、發送原則和任務維護不再從 `session_key` 形狀推斷聊天類型。舊的聊天類型金鑰解析器已被刪除；這些路徑需要類型化的會話元資料、類型化的交付上下文或明確的交付目標詞彙。
- 會話列表/狀態、診斷、核准帳戶綁定、TUI 心跳過濾和使用摘要不再從 `SessionEntry.origin` 挖掘提供者/帳戶/執行緒/顯示路由。唯一剩餘的執行時 `origin` 讀取是非會話概念或當前輪次的交付物件。
- 核准請求的原生會話查找現在讀取類型化的每代理會話路由行。它不再從 `sessionKey` 解析頻道/群組/執行緒會話身分；缺少類型化元資料是遷移/修復問題。
- Gateway session changed/chat/session 事件負載不再回顧
  `SessionEntry.origin` 或 `last*` 路由陰影；客戶端接收類型化的
  `channel`、`chatType` 和 `deliveryContext`。
- Heartbeat 傳遞解析現在可以直接接收類型化的 SQLite
  `deliveryContext`，且 heartbeat 運行時傳遞每個代理程式
  的會話傳遞列，而不是依賴當前路由的相容性 `session_entries`
  陰影。
- Cron isolated-agent 傳遞目標解析也會在回退到
  相容性條目負載之前，從類型化的每個代理程式會話傳遞列中補充其當前
  路由。
- Subagent 公告來源解析現在會將類型化的請求者會話傳遞上下文透過 `loadRequesterSessionEntry` 傳遞，並且優先使用該資料行而非相容性 `last*`/`deliveryContext` 陰影。
- 傳入會詮中繼資料更新現在會先針對每個代理程式的類型化傳遞資料行進行合併；舊的 `SessionEntry` 傳遞欄位僅作為當沒有類型化對話資料行存在時的後備選項。
- 重新啟動/更新傳遞提取現在讓類型化的 SQLite 傳遞 `threadId` 優先於從 `sessionKey` 解析的主題/執行緒片段；解析僅是舊版執行緒形狀鍵的後備方案。
- Hook 代理程式上下文頻道 ID 現在優先使用類型化的 SQLite 對話身分，其次是明確的訊息中繼資料。它們不再從 `sessionKey` 解析提供者/群組/頻道片段。
- Gateway `chat.send` external-route 繼承現在會讀取具類型的 SQLite 會話路由元數據，而不是從 `sessionKey` 片段推斷 channel/direct/group 範圍。Channel-scoped 會話僅在具類型會話的 channel 和聊天類型與儲存的交付上下文相符時才繼承；shared-main 會話則保持其更嚴格的 CLI/no-client-metadata 規則。
- Restart-sentinel 喚醒和延續路由現在會在將心跳喚醒或 routed agent-turn 延續排入佇列之前，讀取具類型的 SQLite 交付/路由行。它不再從 session-entry JSON shadow 重建交付上下文。
- Gateway `tools.effective` 上下文解析現在會從 SQLite 讀取針對 provider、account、target、thread 和 reply-mode 輸入的型別化 delivery/routing 資料列。它不再從過時的 `session_entries.entry_json` origin shadows 恢復那些熱路由欄位。
- 即時語音諮詢路由現在會從針對每個代理程式的型別化 SQLite session 資料列解析 parent/call delivery。在選擇嵌入式代理程式訊息路由時，它不再回退到相容性 `SessionEntry.deliveryContext` shadows。
- ACP 產生心跳中繼器和母串流路由現在會從型別化 SQLite session 資料列讀取 parent delivery。它們不再從相容性 session-entry shadows 重建 parent delivery 上下文。
- 現在，工作階段傳遞路由的保留會遵循類型化的聊天元資料和持續化的傳遞欄位。它不再從 `sessionKey` 提取通道提示、直接/主要標記或執行緒形狀；只有當 SQLite 已經為該工作階段儲存了類型化/持續化的傳遞身分時，內部網路聊天路由才會繼承外部目標。
- 一般工作階段傳遞提取現在僅讀取確切的類型化 SQLite 工作階段傳遞列。它不再解析執行緒/主題後綴，也不會從執行緒形狀的鍵退回到基礎工作階段鍵。
- 回覆分派、重啟哨兵恢復以及即時語音查詢路由現在會使用確切的類型化 SQLite 工作階段/對話列進行執行緒路由。它們不再透過解析執行緒形狀的工作階段鍵來恢復執行緒 ID 或基礎工作階段傳遞上下文。
- 嵌入式 PI 歷史記錄限制現在針對 provider、聊天類型和對端身分，使用類型化的 SQLite 會話路由投影（`sessions` + primary `conversations`）。它不再從 `sessionKey` 中解析 provider、DM、group 或 thread 的結構。
- Cron 工具交付推斷現在使用顯式交付或僅使用當前的類型化交付語境。它不再從 `agentSessionKey` 解碼 channel、peer、account 或 thread 目標。
- 運行時會話行不再攜帶舊的 `lastProvider` 路由別名。輔助函數和測試使用類型化的 `lastChannel` 和 `deliveryContext` 欄位；doctor 遷移是唯一應該翻譯舊路由別名或持久化 `origin` 影子的地方。
- Transcript events、VFS 資料列與工具 artifact 資料列現在會寫入每個 Agent 的資料庫。未發布的全域 transcript-file 對照表已移除；doctor 改為在持久化的遷移資料列中記錄舊版來源路徑。
- 執行時期的 transcript 查詢不再掃描 JSONL 位元組位移或探查舊版 transcript 檔案。Gateway 的 chat/media/history 路徑會從 SQLite 讀取 transcript 資料列；session JSONL 現在僅作為 doctor 的舊版輸入，而非執行時期狀態或匯出格式。
- Transcript 的父代與分支關係使用 SQLite transcript 標頭中的結構化 `parentTranscriptScope: {agentId, sessionId}` 元資料，而非類似路徑的 `agent-db:...transcript_events...` 定位字串。
- 轉錄管理器合約不再暴露隱式的持久化 `create(cwd)` 或 `continueRecent(cwd)` 建構函式。持久化轉錄管理器會透過明確的 `{agentId, sessionId}` 作用域開啟；僅記憶體內管理器在測試和純轉錄轉換中保持無作用域。
- 執行時期轉錄存放區 API 解析 SQLite 作用域，而非檔案系統路徑。舊的 `resolve...ForPath` 協助程式和未使用的 `transcriptPath` 寫入選項已從執行時期呼叫端移除。
- 執行時期階段作業解析現在使用 `{agentId, sessionId}`，且不得為外部邊界導出 `sqlite-transcript://<agent>/<session>` 字串。舊有的絕對 JSONL 路徑僅作為 doctor 遷移的輸入。
- Native hook relay direct-bridge 記錄現在位於以 relay id 為鍵的類型化共用 `native_hook_relay_bridges` 列中。Runtime 不再為這些短暫的 bridge 記錄寫入 `/tmp` JSON 註冊表或不透明的通用記錄。
- `runEmbeddedPiAgent(...)` 不再具有 transcript-locator 參數。
  準備好的 worker 描述符也省略了 transcript locators。Runtime session
  狀態和佇列中的後續執行攜帶 `{agentId, sessionId}` 而不是
  衍生的 transcript handles。
- 嵌入式壓縮現在從 `agentId` 和 `sessionId` 取得 SQLite 範圍。
  壓縮掛鉤、context-engine 呼叫、CLI 委派和協定回覆
  不得接收衍生的 `sqlite-transcript://...` 控制代碼。匯出/除錯程式碼
  可以從資料列具體化明確的使用者產出，但它不提供
  通用的 session JSONL 匯出路徑，也不將檔案名稱回饋至執行時
  身份。
- `/export-session` 從 SQLite 讀取逐字稿資料列，並僅寫入請求的
  獨立 HTML 檢視。內建檢視器不再從這些資料列重建或
  下載 session JSONL。
- Context-engine 委派不再解析逐字稿定位器來恢復
  代理程式身分。準備好的執行時內容將解析的 `agentId`
  帶入內建壓縮介面卡。
- Transcript 重寫與即時工具結果截斷現在透過 `{agentId, sessionId}` 讀取並持久化 transcript 狀態，並且不會為 transcript-update 事件載荷推導暫時的定位器。
- transcript-state 輔助介面不再具有基於定位器的 `readTranscriptState`、`replaceTranscriptStateEvents` 或 `persistTranscriptStateMutation` 變體。執行階段呼叫者必須使用 `{agentId, sessionId}` API。Doctor import 透過明確的檔案路徑讀取舊版檔案並寫入 SQLite 資料列；它不會遷移定位器字串。
- 執行階段 session-manager 契約不再公開 `open(locator)`、
  `forkFrom(locator)` 或 `setTranscriptLocator(...)`。持久化 session
  管理器僅透過 `{agentId, sessionId}` 開啟；清單/分叉輔助函式存在於
  以列為導向的 session 和 checkpoint API 中，而非 transcript manager
  外觀。
- Gateway transcript reader API 為優先範圍。它們接收
  `{agentId, sessionId}`，且不接受位置 transcript 定位器，以免
  意外成為執行階段識別。主動 transcript 定位器解析
  已消失；舊版來源路徑僅由 doctor 匯入程式碼讀取。
- Transcript 更新事件也是優先範圍。`emitSessionTranscriptUpdate`
  不再接受裸露定位器字串，且監聽器透過
  `{agentId, sessionId}` 路由，而不解析控制代碼。
- Gateway session-message broadcast 從 agent/session 範圍解析 session keys，而不是從 transcript locator。舊的 transcript-locator-to-session key resolver/cache 已經消失。
- Gateway session-history SSE 根據 agent/session 範圍過濾即時更新。它不再將 transcript locator 候選項、realpaths 或檔案形式的 transcript identities 規範化，來決定串流是否應該接收更新。
- Session lifecycle hooks 不再在 `session_end` 上衍生或暴露 transcript locators。Hook 消費者會取得 `sessionId`、`sessionKey`、next-session ids 和 agent context；transcript 檔案不是 lifecycle contract 的一部分。
- Reset hooks 不再衍生或公開文字紀錄定位器。`before_reset` payload 攜帶恢復的 SQLite 訊息以及重置原因，而會話身份保留在 hook context 中。
- Agent harness reset 不再接受文字紀錄定位器。Reset dispatch 的範圍由 `sessionId`/`sessionKey` 加上原因決定。
- Agent extension session types 不再公開 `transcriptLocator`；extensions 應該使用 session context 和 runtime APIs，而不是試圖獲取基於檔案形式的文字紀錄身份。
- Plugin compaction hooks 不再公開文字紀錄定位器。Hook context 已經攜帶會話身份，而文字紀錄讀取必須透過 SQLite 具有範圍感知的 APIs，而不是基於檔案形式的 handles。
- `before_agent_finalize` hooks 不再公開 `transcriptPath`，包括
  原生 hook 中繼承載。最終處理 hooks 僅使用 session context。
- Gateway 重置回應不再在傳回的項目上合成文字紀錄定位器。重置會建立 SQLite 文字紀錄列，傳回乾淨的
  session 項目，並將文字紀錄存取留給具範圍感知能力的讀取器。
- 內嵌執行和壓縮結果不再顯示用於 session 結算的文字紀錄定位器。自動壓縮僅更新作用中的 `sessionId`、
  壓縮計數器和 token 中繼資料。
- 內嵌嘗試結果不再傳回 `transcriptLocatorUsed`，且
  context-engine `compact()` 結果不再傳回文字紀錄定位器。
  Runtime 重試迴圈僅接受後續的 `sessionId`。
- Delivery-mirror 副本附加結果不再返回副本定位器。呼叫者獲得附加的 `messageId`；副本更新信號使用 SQLite 範圍。
- 父會話分支輔助函式僅返回分支的 `sessionId`。子代理準備階段將子代理/會話範圍傳遞給引擎。
- CLI 執行器參數和歷史記錄重新植入不再接受副本定位器。CLI 歷史記錄讀取根據 `{agentId, sessionId}` 和會話金鑰上下文解析 SQLite 副本範圍。
- CLI 和嵌入式執行器測試裝置現在透過會話 ID 植入和讀取 SQLite 副本行，而不是假設活動會話是 `*.jsonl` 檔案或透過執行時參數傳遞 `sqlite-transcript://...` 字串。
- Session tool-result guard events 即使記憶體管理程式沒有衍生的定位器，也會從已知的 Session 範圍發出。其測試不再偽造使用中 `/tmp/*.jsonl` transcript 檔案。
- BTW 和 compaction-checkpoint helper 現在會根據 SQLite 範圍讀取和分叉 transcript 資料列。Checkpoint 中繼資料現在僅儲存 session ID 和 leaf/entry ID；衍生的定位器不再寫入到 checkpoint 載荷中。
- Gateway transcript-key 查詢在協定邊界使用 SQLite transcript 範圍，並且不再對 transcript 檔名進行 realpath 或 stat 操作。
- Automatic compaction transcript 旋轉會直接透過 SQLite transcript 存儲寫入後繼的 transcript 資料列。Session 資料列僅保留後繼的 session 身分，而不是持久的 JSONL 路徑或持久的定位器。
- 內嵌的 context-engine 壓縮使用具名的 SQLite 轉錄輪替輔助程式。輪替測試不再建構 JSONL 後繼路徑，也不會將使用中會話建模為檔案。
- 受控的傳出圖像保留機制根據 SQLite 轉錄統計資料來鍵入其轉錄訊息快取，而非使用檔案系統 stat 呼叫。
- 執行階段會話鎖定與獨立的舊版 `.jsonl.lock` doctor 通道已被移除。
- Microsoft Teams 執行階段 barrel 與公開 plugin SDK 不再重新匯出舊的檔案鎖定輔助程式；永續 plugin 狀態路徑已由 SQLite 支援。
- 會話年齡/計數修剪與明確的會話清理已被移除。Doctor 擁有舊版匯入功能；過時會話會被明確重設或刪除。
- Doctor 完整性檢查不再將舊版 JSONL 檔案計為 SQLite 工作階段列的有效有效
  逐字稿。有效逐字稿的健康狀態僅適用於 SQLite；
  舊版 JSONL 檔案會被回報為遷移/孤立清理輸入。
- Doctor 不再將 `agents/<agent>/sessions/` 視為必要的執行階段
  狀態。它僅在該目錄已存在時進行掃描，作為舊版匯入
  或孤立清理輸入。
- Gateway `sessions.resolve`、工作階段修補/重置/壓縮路徑、子代理
  程式產生、快速中止、ACP 元資料、心跳隔離的工作階段以及 TUI
  修補，不再作為正常執行階段工作的副作用來遷移或修剪舊版工作階段金鑰。
- CLI 指令階段作業 (session) 解析現在會返回擁有的 `agentId` 而非
  `storePath`，並且在正常的
  `--to` 或 `--session-id` 解析期間，不再複製舊版主要階段作業 (main-session) 資料列。舊版主要資料列正規化 (canonicalization) 僅屬於 doctor。
- 執行時期子代理程式深度解析不再讀取 `sessions.json` 或 JSON5
  階段作業儲存。它透過代理程式 ID 讀取 SQLite `session_entries`，而舊版
  深度/階段作業中繼資料只能透過 doctor 匯入路徑進入。
- 驗證設定檔階段作業覆寫透過直接 `{agentId, sessionKey}`
  資料列更新來持久化，而不是延遲載入檔案狀階段作業儲存執行時期。
- 自動回覆詳細閘門和會話更新輔助程式現在會依據會話身分讀取/更新 SQLite
  會話資料列，且在接觸已保存的資料列狀態前不再需要舊版儲存路徑。
- 指令執行會詮中繼資料輔助程式現在使用以條目為導向的名稱和模組
  路徑；舊的 `session-store` 指令輔助介面已被移除。
- 啟動標頭植入和手動壓縮邊界強化現在會直接
  變更 SQLite 轉錄資料列。執行階段呼叫者傳遞會話身分，而非
  可寫入的 `.jsonl` 路徑。
- 無聲會話輪替重播會透過
  `{agentId, sessionId}` 從 SQLite 轉錄資料列複製最近的使用者/助理回合。它不再接受
  來源或目標轉錄定位器。
- 新的執行階段會話列不再儲存逐字稿定位器。呼叫者直接使用 `{agentId, sessionId}`；匯出/除錯指令可以在具體化列時選擇輸出檔案名稱。
- 啟動新的持續化逐字稿會話現在總是透過範圍開啟 SQLite 列。會話管理員不再重用先前的檔案時代逐字稿路徑或定位器作為新會話的身分識別。
- 持續化的逐字稿會話使用明確的 `openTranscriptSessionManagerForSession({agentId, sessionId})` API。舊的靜態 `SessionManager.create/openForSession/list/forkFromSession` 外觀已移除，因此測試和執行階段程式碼不會意外重建檔案時代的會話發現機制。
- 外掛程式執行階段不再公開 `api.runtime.agent.session.resolveTranscriptLocatorPath`；外掛程式碼使用 SQLite 列輔助程式和範圍值。
- 公開的 `session-store-runtime` SDK 介面現在僅匯出會話列
  和逐字稿列輔助函式。原始的 SQLite 資料庫開啟/路徑以及關閉/重置
  輔助函式位於專注的 `sqlite-runtime` SDK 介面中，因此外掛測試不再
  引入已棄用的廣泛測試桶來進行資料庫清理。
- 舊版 `.jsonl` 軌跡/檢查點檔名分類器現在位於
  doctor 舊版會話檔案模組中。核心會話驗證不再匯入
  檔案成品輔助函式來決定正常的 SQLite 會話 ID。
- 主動記憶體阻塞性子代理執行使用 SQLite 逐字稿列，而不是
  在外掛狀態下建立臨時或持久的 `session.jsonl` 檔案。舊的
  `transcriptDir` 選項已被移除。
- 一次性 slug 生成和 Crestodian 規劃器運行使用 SQLite 轉錄行
  而不是建立暫時的 `session.jsonl` 檔案。
- `llm-task` 助手運行和隱藏承諾提取也使用 SQLite
  轉錄行，因此這些僅限模型的助手會話不再建立
  暫時的 JSON/JSONL 轉錄檔案。
- `TranscriptSessionManager` 現在只是一個開啟的 SQLite 轉錄範圍。
  執行時程式碼使用 `openTranscriptSessionManagerForSession({agentId,
sessionId})` 開啟它；建立、分支、繼續、列出和派生流程位於其
  擁有的 SQLite 行助手中，而不是靜態管理器外觀。
  Doctor/import/debug 程式碼在執行時會話管理器之外處理明確的舊版來源檔案。
- 過時的 `SessionManager.newSession()` 和
  `SessionManager.createBranchedSession()` Facade 方法已被移除。新的
  session 和 transcript 子代由其擁有的 SQLite
  workflow 建立，而不是將已開啟的 manager 變異為不同的持久化 session。
- 父 transcript fork 決策和 fork 建立不再接受
  `storePath` 或 `sessionsDir`；它們使用 `{agentId, sessionId}` SQLite
  transcript 範圍，而非保留的檔案系統路徑元資料。
- Memory-host 不再匯出無操作的 session-directory transcript
  分類輔助函式；transcript 篩選現在會在條目建構期間從 SQLite 列
  元資料衍生。
- Memory-host 和 QMD 會話匯出測試使用 SQLite 轉錄範圍。舊的 `agents/<agentId>/sessions/*.jsonl` 路徑僅在測試刻意驗證 doctor/import/export 相容性時保持涵蓋。
- QA-lab 原始會話檢查現在透過閘道使用 `sessions.list` 而非讀取 `agents/qa/sessions/sessions.json`；MSteams 回饋會直接附加至 SQLite 轉錄，而不會偽造 JSONL 路徑。
- 共用的入站通道輪次現在攜帶 `{agentId, sessionKey}` 而非舊有的 `storePath`。LINE、WhatsApp、Slack、Discord、Telegram、Matrix、Signal、iMessage、BlueBubbles、Feishu、Google Chat、IRC、Nextcloud Talk、Zalo、Zalo Personal、QA Channel、Microsoft Teams、Mattermost、Synology Chat、Tlon、Twitch 和 QQBot 記錄路徑現在會讀取 updated-at 元資料，並透過 SQLite 身份記錄入站會話資料列。
- Transcript 定位器持久性已從活動會話行中移除。
  `resolveSessionTranscriptTarget` 會傳回 `agentId`、`sessionId` 和可選的
  主題中繼資料；doctor 是唯一匯入舊版 transcript 檔案
  名稱的程式碼。
- Runtime transcript 標頭始於 SQLite 版本 `1`。舊的 JSONL V1/V2/V3
  形狀升級僅存在於 doctor 匯入中，並在儲存列之前將匯入的標頭正規化為
  目前的 SQLite transcript 版本。
- Database-first guard 現在會封鎖 `SessionManager.listAll` 和
  `SessionManager.forkFromSession`；會話列出以及 fork/restore 工作流程
  必須繼續使用 row/scoped SQLite APIs。
- Guard 也會在 doctor/import 程式碼之外封鎖舊版 transcript JSONL 解析/active-branch 修復輔助
  名稱，因此 runtime 無法長出第二條舊版
  transcript 遷移路徑。
- 嵌入式 PI 執行會拒絕傳入的 transcr ipt 控制代碼。它們在 worker 啟動前使用 SQLite `{agentId, sessionId}` 身份，並在嘗試接觸 transcr ipt 狀態之前再次使用。過時的 `/tmp/*.jsonl` 輸入無法選取執行階段寫入目標。
- Cache trace、Anthropic payload、raw stream 和診斷時間軸記錄現在會寫入至類型化的 SQLite `diagnostic_events` 資料列。Gateway 穩定性套件現在會寫入至類型化的 SQLite `diagnostic_stability_bundles` 資料列。舊的 `diagnostics.cacheTrace.filePath`、`OPENCLAW_CACHE_TRACE_FILE`、`OPENCLAW_ANTHROPIC_PAYLOAD_LOG_FILE` 和 `OPENCLAW_DIAGNOSTICS_TIMELINE_PATH` JSONL 覆寫路徑已被移除，且一般的穩定性擷取不再寫入 `logs/stability/*.json` 檔案。
- Cron 持久化現在會協調 SQLite `cron_jobs` 資料列，而不是在每次儲存時刪除/重新插入整個作業資料表。Plugin 目標回寫會直接更新符合的 cron 資料列，並將執行時期 cron 狀態保持在同一個狀態資料庫交易中。
- Cron 執行時期呼叫者現在使用穩定的 SQLite cron 存儲金鑰。舊版 `cron.store` 路徑僅作為 doctor 匯入輸入；正式環境的 gateway、任務維護、狀態、執行日誌 和 Telegram 目標回寫路徑使用 `resolveCronStoreKey`，並且不再對金鑰進行路徑標準化。Cron 狀態現在回報 `storeKey`，而不是舊的檔案形式 `storePath` 欄位。
- Cron 執行時載入和排程不再正規化舊版持久化的作業
  形狀，例如 `jobId`、`schedule.cron`、數值 `atMs`、字串布林值，或
  遺失的 `sessionTarget`。Doctor 舊版匯入會在
  列插入 SQLite 之前負責這些修復。
- ACP spawn 不再解析或持久化文字紀錄 JSONL 檔案路徑。Spawn
  和 thread-bind 設定會直接持久化 SQLite session 列，並將
  session id 作為保留的文字紀錄識別。
- ACP session 元資料 API 現在透過 `agentId` 讀取/列出/更新 SQLite 列，並
  且不再將 `storePath` 作為 ACP session 項目契約的一部分公開。
- Session 使用量計算與 Gateway 使用量聚合現在僅透過 `{agentId, sessionId}` 解析文字紀錄 (transcripts)。成本/使用量快取與已發現的 Session 摘要不再合成或傳回文字紀錄定位字串。
- Gateway 聊天附加、中止部分持久化 (abort-partial persistence)、`/sessions.send` 以及網路聊天媒體文字紀錄寫入，現在透過 SQLite 文字紀錄範圍直接附加。Gateway 文字紀錄注入輔助程式不再接受 `transcriptLocator` 參數。
- SQLite 文字紀錄探索現在僅列出文字紀錄範圍與統計資料：`{agentId, sessionId, updatedAt, eventCount}`。已廢棄的 `listSqliteSessionTranscriptLocators` 相容性輔助程式與逐列 `locator` 欄位已被移除。
- Transcript repair runtime 現在僅公開
  `repairTranscriptSessionStateIfNeeded({agentId, sessionId})`。舊的
  基於 locator 的修復輔助程式已刪除；doctor/debug 程式碼會讀取明確的
  原始檔案路徑，且永不遷移 locator 字串。
- ACP replay ledger runtime 現在將每個工作階段的重播列儲存在共享的
  SQLite 狀態資料庫中，而不是 `acp/event-ledger.json`；doctor 會匯入並
  移除舊版檔案。
- Gateway transcript reader 輔助程式現在位於
  `src/gateway/session-transcript-readers.ts`，而不是舊的
  `session-utils.fs` 模組名稱。後備重試歷史檢查是根據
  SQLite transcript 內容命名，而不是舊的 file-helper 介面。
- Gateway injected-chat 和 compaction 輔助程式現在透過內部輔助 API 傳遞 SQLite transcript 範圍，
  而不是將數值命名為 transcript 路徑或
  原始檔案。
- 啟動延續偵測現在透過 `hasCompletedBootstrapTranscriptTurn` 檢查 SQLite 轉錄資料行；它不再公開檔案狀的輔助程式名稱。
- Embedded-runner 測試現在會使用 SQLite 轉錄身分識別，且開啟新的轉錄管理員一律需要明確的 `sessionId`。
- 記憶體索引輔助程式現在端到端使用 SQLite 轉錄術語：主機匯出 `listSessionTranscriptScopesForAgent` 和 `sessionTranscriptKeyForScope`，目標同步佇列 `sessionTranscripts`，公開的 session-search 命中會公開不透明的 `transcript:<agent>:<session>` 路徑，且內部 DB 來源金鑰是 `session:<session>` 於 `source_kind='sessions'` 之下，而非假的檔案路徑。
- 通用插件 SDK 的持久化去重輔助程式不再公開以檔案為形式的選項。呼叫端提供 SQLite 範圍鍵，而持久的去重資料列則存在於共享的插件狀態中。
- Microsoft Teams SSO 和委派的 OAuth 權杖已從鎖定的 JSON 檔案移至 SQLite 插件狀態。Doctor 匯入 `msteams-sso-tokens.json` 和 `msteams-delegated.json`，從載荷重建標準的 SSO 權杖鍵，並移除來源檔案。
- Matrix 同步快取狀態已從 `bot-storage.json` 移至 SQLite 插件狀態。Doctor 匯入舊版的原始或封裝同步載荷並移除來源檔案。現有的 Matrix 和 QA Matrix 用戶端會傳遞 SQLite 同步儲存區根目錄，而不是偽造的 `sync-store.json` 或 `bot-storage.json` 路徑。
- Matrix legacy crypto migration status moved from
  `legacy-crypto-migration.json` to SQLite plugin state. Doctor imports the
  old status file; Matrix SDK IndexedDB snapshots moved from
  `crypto-idb-snapshot.json` to SQLite plugin blobs. Matrix recovery keys and
  credentials are SQLite plugin-state rows; their old JSON files are doctor
  migration inputs only.
- Memory Wiki activity logs now use SQLite plugin state instead of
  `.openclaw-wiki/log.jsonl`. The Memory Wiki migration provider imports old
  JSONL logs; wiki markdown and user vault content stay file-backed as
  workspace content.
- Memory Wiki no longer creates `.openclaw-wiki/state.json` or the unused
  `.openclaw-wiki/locks` directory. The migration provider removes those retired
  plugin metadata files if an older vault still has them.
- Crestodian 稽核項目現在使用核心 SQLite 外掛程式狀態，而不是 `audit/crestodian.jsonl`。Doctor 會匯入舊版 JSONL 稽核日誌，並在成功匯入後將其移除。
- 組態寫入/觀察稽核項目現在使用核心 SQLite 外掛程式狀態，而不是 `logs/config-audit.jsonl`。Doctor 會匯入舊版 JSONL 稽核日誌，並在成功匯入後將其移除。
- macOS 伴隨程式在編輯 `openclaw.json` 時，不再寫入應用程式本地的 `logs/config-audit.jsonl` 或 `logs/config-health.json` 附屬檔案。組態檔案保持以檔案為基礎，還原快照仍位於組態檔案旁邊，而持久的組態稽核/健康狀態屬於 Gateway SQLite 存儲。
- Crestodian 救援待審核項目現在使用核心 SQLite 外掛程式狀態，而不是 `crestodian/rescue-pending/*.json`。Doctor 會匯入舊版待審核檔案，並在成功匯入後將其移除。
- Phone Control 臨時 arming 狀態現在使用 SQLite plugin state 而非 `plugins/phone-control/armed.json`。Doctor 會將 legacy armed-state 檔案匯入 `phone-control/arm-state` namespace 並移除該檔案。
- Doctor 不再就地修復 JSONL transcripts 或建立備份 JSONL 檔案。它會將 active branch 匯入 SQLite 並移除 legacy 來源。
- Session-memory hook transcript lookup 使用 `{agentId, sessionId}` 僅限 scope 的 SQLite 讀取。其 helper 不再接受或推導 transcript locators、legacy 檔案讀取或檔案重寫選項。
- Codex app-server conversation bindings 現在透過 OpenClaw session key 或明確的 `{agentId, sessionId}` scope 來鍵結 SQLite plugin state。它們絕不能保留 transcript-path fallback bindings。
- Codex app-server 的鏡像歷史讀取僅使用 SQLite 的紀錄範圍；它們絕不能從紀錄檔路徑中恢復身分。
- 角色排序和壓縮重設路徑不再取消連結舊的紀錄檔；重設僅會旋轉 SQLite 會話列和紀錄身分。
- Gateway 重設和檢查點回應會傳回乾淨的會話列以及會話 ID。它們不再為客戶端合成 SQLite 紀錄定位器。
- Memory-core dreaming 不再透過探查遺失的 JSONL 檔案來修剪會話列。Subagent 清理作業會透過會話執行階段 API 進行，而不是檔案系統存在性檢查。其紀錄擷取測試會直接植入 SQLite 列，而不是建立 `agents/<id>/sessions` 設定或定位器預留位置。
- 記憶體逐字稿索引可能會將 `transcript:<agentId>:<sessionId>` 作為引用/讀取輔助工具的虛擬搜尋命中路徑公開。持久化索引來源是關聯式的（`source_kind='sessions'`、`source_key='session:<sessionId>'`、`session_id=<sessionId>`），因此該值不是運行時逐字稿定位器，不是檔案系統路徑，並且絕不能傳回會話運行時 API。
- Gateway doctor memory status 從 SQLite plugin-state 列讀取短期回憶和階段訊號計數，而不是 `memory/.dreams/*.json`；CLI 和 doctor 輸出現在將該存儲標記為 SQLite 存儲，而不是路徑。
- Memory-core 執行時期、CLI 狀態、Gateway doctor 方法以及 plugin SDK
  外觀不再稽核或封存舊版 `.dreams/session-corpus` 檔案。
  這些檔案僅作為遷移輸入；doctor 會將其匯入 SQLite 並
  在驗證後刪除來源。現有工作階段攝取證據列
  現在使用虛擬 SQLite 路徑 `memory/session-ingestion/<day>.txt`；執行時期
  絕不寫入或衍生 `.dreams/session-corpus` 中的狀態。
- Memory-core 公用產物會將 SQLite 主機事件公開為虛擬 JSON
  產物 `memory/events/memory-host-events.json`；它們不再重複使用
  舊版 `.dreams/events.jsonl` 來源路徑。
- Sandbox 容器/瀏覽器註冊表现在使用共享的 `sandbox_registry_entries` SQLite 表，其中包含具有類型的 session、image、timestamp、backend/config 和 browser port 列。Doctor 導入舊版單一式和分片的 JSON 註冊表文件，並移除成功的來源。運行時讀取使用類型化的行列作為事實來源；`entry_json` 僅是重放/調試副本。
- Commitments 现在使用類型化的共享 `commitments` 表，而不是整個存儲的 JSON blob。快照保存通過 commitment id 進行 upsert，並且僅刪除缺失的行，而不是清除並重新插入該表。運行時從類型化的 scope、delivery-window、status、attempt 和 text 列加載 commitments；`record_json` 僅是重放/調試副本。Doctor 導入舊版 `commitments.json` 並在成功導入後將其移除。
- Cron 工作定義、排程狀態和執行歷史不再擁有執行時 JSON 寫入器或讀取器。執行時使用帶有類型化排程、負載、交付、失敗警示、工作階段、狀態和執行時狀態欄位的 `cron_jobs` 資料列，加上針對狀態、診斷摘要、交付狀態/錯誤、工作階段/執行、模型和權杖總計的類型化 `cron_run_logs` 中繼資料。`job_json` 僅作為重播/除錯副本；`state_json` 保留尚未具有熱查詢欄位的巢狀執行時診斷，同時執行時會從類型化欄位重新填充熱狀態欄位。Doctor 匯入舊版 `jobs.json`、`jobs-state.json` 和 `runs/*.jsonl` 檔案並移除已匯入的來源。外掛目標回寫會更新相符的 `cron_jobs` 資料列，而不是載入並替換整個 cron 存儲區。
- 如果 doctor 無法在不取代明確傳遞目標的情況下安全地轉換舊版 `notify: true` webhook 後備機制，它會記錄一個警告並保留舊版來源，而不是發布有損失的 SQLite 資料列。
- 輸出和工作階段傳遞佇列現在會將佇列狀態、項目類型、工作階段金鑰、頻道、目標、帳戶 ID、重試次數、上次嘗試/錯誤、復原狀態和平臺發送標記作為共享 `delivery_queue_entries` 表格中的型別欄位進行儲存。執行時期復原會從這些型別欄位讀取熱門欄位，而重試/復原變更會直接更新這些欄位，而不需要重寫重播 JSON。完整的 JSON 載荷僅保留作為訊息主體和其他冷重播資料的重播/除錯 blob。
- 受管的輸出圖像記錄現在使用類型化的共享
  `managed_outgoing_image_records` 列，而媒體位元組仍儲存在
  `media_blobs` 中。JSON 記錄僅作為重播/調試副本保留。
- Discord 模型選擇器偏好設定、指令部署雜湊和執行緒綁定
  現在使用共享 SQLite 外掛程式狀態。其舊版 JSON 匯入計畫位於
  Discord 外掛程式設定/修復程式遷移介面中，而非核心遷移程式碼。
- 外掛程式舊版匯入偵測器使用以 doctor 命名的模組，例如
  `doctor-legacy-state.ts` 或 `doctor-state-imports.ts`；正常管道執行時
  模組不得匯入舊版 JSON 偵測器。
- BlueBubbles 追蹤游標和輸入去重標記現在使用共享 SQLite
  外掛程式狀態。其舊版 JSON 匯入計畫位於 BlueBubbles 外掛程式
  設定/修復程式遷移介面中，而非核心遷移程式碼。
- Telegram 更新偏移量、貼紙快取列、已傳送訊息快取列、主題名稱快取列以及執行緒繫結現在使用共用的 SQLite 外掛程式狀態。其舊版 JSON 匯入計畫位於 Telegram 外掛程式的 setup/doctor 遷移介面中，而非核心遷移程式碼中。
- iMessage 追趕游標、回覆短 ID 對應以及已傳送回聲去重列現在使用共用的 SQLite 外掛程式狀態。舊的 `imessage/catchup/*.json`、`imessage/reply-cache.jsonl` 和 `imessage/sent-echoes.jsonl` 檔案僅作為 doctor 輸入。
- Feishu 訊息去重列現在使用共用的 SQLite 外掛程式狀態，而非 `feishu/dedup/*.json` 檔案。其舊版 JSON 匯入計畫位於 Feishu 外掛程式的 setup/doctor 遷移介面中，而非核心遷移程式碼中。
- Microsoft Teams 的對話、投票、待上傳緩衝區和回饋學習現在使用共享的 SQLite 外掛程式狀態/BLOB 資料表。待上傳路徑使用 `plugin_blob_entries`，因此媒體緩衝區會以 SQLite BLOB 形式儲存，而不是 base64 JSON。執行階段輔助程式名稱現在使用 SQLite/狀態命名，而不是 `*-fs` 檔案存放區命名，而且舊的 `storePath` 填充層已從這些存放區中移除。其舊版 JSON 匯入計畫位於 Microsoft Teams 外掛程式設定/醫生遷移介面中。
- Zalo 託管輸出媒體現在使用共享 SQLite `plugin_blob_entries`
  取代 `openclaw-zalo-outbound-media` JSON/bin 臨時側車檔案。
- Diffs 檢視器 HTML 和中繼資料現在使用共享的 SQLite `plugin_blob_entries`
  代替 `meta.json`/`viewer.html` 暫存檔案。渲染的 PNG/PDF 輸出保留
  為暫存具體化，因為通道傳遞仍然需要檔案路徑。
- Canvas 管理的文件現在使用共享的 SQLite `plugin_blob_entries` 代替
  預設的 `state/canvas/documents` 目錄。Canvas 主機直接提供這些
  blob；僅針對明確的 `host.root`
  運算子內容或當下游媒體讀取器需要路徑時的暫時具體化建立本機檔案。
- 檔案傳輸稽核決定現在使用共享 SQLite `plugin_state_entries`
  代替無限制的 `audit/file-transfer.jsonl` 執行時期日誌。Doctor
  會將舊版 JSONL 稽核檔案匯入至外掛程式狀態，並在乾淨匯入後移除來源。
- ACPX 程序租約和閘道執行個體身分現在使用共享的 SQLite 外掛
  狀態。Doctor 將傳統的 `gateway-instance-id` 檔案匯入到外掛狀態中
  並移除來源。
- ACPX 產生的包裝腳本和隔離的 Codex 目錄是 OpenClaw 暫存根目錄下的臨時
  具體化，而非持久的 OpenClaw 狀態。持久的 ACPX 執行時期紀錄是 SQLite 租約和 gateway-instance 資料列；
  舊的 ACPX `stateDir` 配置介面已被移除，因為不再有執行時期狀態寫入
  該處。
- Gateway 媒體附件現在使用共享的 `media_blobs` SQLite 表作為
  標準位元組存儲。返回給通道和沙盒
  相容性表面的本地路徑是資料庫行的臨時具體化，而不是
  持久化媒體存儲。執行時媒體允許列表不再包含遺留的
  `$OPENCLAW_STATE_DIR/media` 或 config-dir `media` 根目錄；這些目錄
  僅是 doctor 匯入來源。
- Shell 自動完成不再寫入 `$OPENCLAW_STATE_DIR/completions/*` 快取
  檔案。Install、doctor、update 和 release smoke 路徑使用生成的
  自動完成輸出或 profile sourcing，而不是持久的自動完成快取
  檔案。
- Gateway skill-upload 暫存現在使用共享的 `skill_uploads` 資料列。上傳
  中繼資料、等冪性金鑰和封存位元組儲存在 SQLite 中；安裝程式
  只在安裝執行期間收到一個暫時的具體化封存路徑。
- Subagent 內聯附件不再在工作區 `.openclaw/attachments/*` 下具體化。產生路徑會準備 SQLite VFS 種子項目，
  內聯執行會將這些項目播種到每個 agent 的執行時期暫存命名空間，
  而磁碟支援的工具會將該 SQLite 暫存覆蓋在附件路徑上。舊的
  subagent-run attachment-dir 註冊表欄位和清理掛鉤已經移除。
- CLI 映像檔補水不再維護穩定的 `openclaw-cli-images` 快取
  檔案。外部 CLI 後端仍然會收到檔案路徑，但這些路徑
  是每次執行的暫時具體化並會進行清理。
- 快取追蹤診斷、Anthropic 載荷診斷、原始模型串流診斷、診斷時間軸事件以及 Gateway 穩定性套件現在會寫入 SQLite 列，而不是 `logs/*.jsonl` 或 `logs/stability/*.json` 檔案。執行時期路徑覆寫旗標和環境變數已被移除；匯出/除錯指令可以明確地從資料庫列具體化檔案。
- macOS 伴隨應用程式不再有滾動式 `diagnostics.jsonl` 寫入器。應用程式日誌會進入統一記錄，而持續性 Gateway 診斷則保持 SQLite 支援。
- macOS port-guardian 記錄清單現在使用類型的共享 SQLite `macos_port_guardian_records` 列，而不是 Application Support JSON 檔案或不透明的單例 blob。
- Gateway 單例鎖現在使用 `state_leases``gateway_locks` 範圍下的類型共享 SQLite `state_leases` 列，而不是 temp-dir 鎖定檔案。Fly 和 OAuth 疑難排解文件現在指向 SQLite 租用/認證重新整理鎖，而不是過期的檔案鎖清理。
- Gateway 重新啟動哨兵狀態現在使用類型共享 SQLite `gateway_restart_sentinel` 列，而不是 `restart-sentinel.json`；執行時從類型欄位讀取哨兵類型、狀態、路由、訊息、接續和統計資料。`payload_json` 僅是重放/調試副本。執行時程式碼直接清除 SQLite 列，不再負責檔案清理管道。
- Gateway 重啟意圖和監督器切接狀態現在使用類型化的共享
  SQLite `gateway_restart_intent` 和 `gateway_restart_handoff` 資料列，而不是
  `gateway-restart-intent.json` 和
  `gateway-supervisor-restart-handoff.json` sidecars。
- Gateway 單例協調現在使用 `gateway_locks` 下的類型化 `state_leases` 資料列，而不是寫入 `gateway.<hash>.lock` 檔案。租約資料列包含鎖的擁有者、到期時間、心跳和除酬酬載；SQLite 擁有原子的獲取/釋放邊界。已淘汰的檔案鎖目錄選項已移除；測試直接使用 SQLite 資料列身分。
- 舊的未被參照的 cron 使用報告輔助程式（用於掃描 `cron/runs/*.jsonl`
  檔案）已被刪除。Cron 執行歷史報告應讀取類型化的
  `cron_run_logs` SQLite 資料列。
- 主會話重啟恢復現在透過 SQLite `agent_databases` 註冊表探索候選代理程式，而不是掃描 `agents/*/sessions` 目錄。
- Gemini 會話損毀恢復現在僅刪除 SQLite 會話資料列；它不再需要遺留的 `storePath` 閘道，也不會嘗試解除連結衍生的逐字稿 JSONL 路徑。
- 路徑覆寫處理現在將字面的 `undefined`/`null` 環境值視為未設定，以防止在測試或 Shell 交接期間意外產生存放庫根目錄的 `undefined/state/*.sqlite` 資料庫。
- Config health fingerprints now use typed shared SQLite `config_health_entries`
  rows instead of `logs/config-health.json`, keeping the normal config file as
  the only non-credential configuration document. The macOS companion keeps only
  process-local health state and does not recreate the old JSON sidecar.
- Auth profile runtime no longer imports or writes credential JSON files. The
  canonical credential store is SQLite; `auth-profiles.json`, per-agent
  `auth.json`, and shared `credentials/oauth.json` are doctor migration inputs
  that are removed after import.
- Auth profile save/state tests now assert typed SQLite auth tables directly
  and only use legacy auth-profile filenames for doctor migration inputs.
- `openclaw secrets apply` 僅會清理設定檔、環境檔以及 SQLite
  auth-profile store。它不再包含編輯舊版 per-agent `auth.json` 的相容性邏輯；
  doctor 擁有匯入和刪除該檔案的權責。
- Hermes secret migration 會規劃並將匯入的 API-key profile 直接套用
  到 SQLite auth-profile store 中。它不再寫入或驗證
  `auth-profiles.json` 作為中繼目標。
- 使用者面向的驗證文件現在描述的是
  `state/openclaw.sqlite#table/auth_profile_stores/<agentDir>`，而不是
  告訴使用者去檢查或複製 `auth-profiles.json`；舊版的 OAuth/auth JSON
  名稱僅作為 doctor-import 輸入保留在文件中。
- 核心狀態路徑輔助函式不再暴露已退役的 `credentials/oauth.json`
  檔案。舊版檔名僅限於 doctor auth import 路徑內部使用。
- 安裝、安全性、入門、模型驗證和 SecretRef 文件現在描述
  SQLite auth-profile 資料列和整體狀態備份/遷移，而非
  每個代理程式的 auth-profile JSON 檔案。
- PI 模型探索現在會將標準憑證傳遞到記憶體中的
  `pi-coding-agent` 驗證儲存空間。它不再於探索期間建立、清理或寫入
  每個代理程式的 `auth.json`。
- Voice Wake 觸發器和路由設定現在使用類型化的共用 SQLite 資料表
  代替 `settings/voicewake.json`、`settings/voicewake-routing.json` 或
  不透明的通用資料列；doctor 會匯入舊版 JSON 檔案並在成功遷移後將其移除。
- Update-check 狀態現在使用類型化的共用 `update_check_state` 資料列，而非
  `update-check.json` 或不透明的通用 blob；doctor 會匯入
  舊版 JSON 檔案並在成功遷移後將其移除。
- Config 健康狀態現在使用類型化的共享 `config_health_entries` 列，而不是 `logs/config-health.json` 或不透明的通用 blob；doctor 會匯入舊版 JSON 檔案並在成功遷移後將其移除。
- 外掛程式對話綁定核准現在使用類型化的 `plugin_binding_approvals` 列，而不是不透明的共享 SQLite 狀態或 `plugin-binding-approvals.json`；舊版檔案是 doctor 遷移的輸入。
- 通用目前對話綁定現在儲存類型化的 `current_conversation_bindings` 列，而不是覆寫 `bindings/current-conversations.json`；doctor 會匯入舊版 JSON 檔案並在成功遷移後將其移除。
- Memory Wiki 匯入來源同步分帳現 在每個 vault/source 金鑰儲存一個 SQLite plugin-state 列，而不是覆寫 `.openclaw-wiki/source-sync.json`；遷移提供者會匯入並移除舊版 JSON 分帳。
- Memory Wiki ChatGPT 匯入執行記錄現在每個 vault/run id 儲存一列 SQLite plugin-state，而不是寫入 `.openclaw-wiki/import-runs/*.json`。回滾快照在匯入執行快照歸檔移動到 blob 儲存之前，仍保持為明確的 vault 檔案。
- Memory Wiki 編譯摘要現在儲存 SQLite plugin blob 列，而不是寫入 `.openclaw-wiki/cache/agent-digest.json` 和 `.openclaw-wiki/cache/claims.jsonl`。遷移提供者會匯入舊的快取檔案，並在快取目錄變空時將其移除。
- ClawHub 技能安裝追蹤現在會為每個工作區/技能儲存一個 SQLite 外掛狀態資料列，而不是在執行時間寫入或讀取 `.clawhub/lock.json` 和 `.clawhub/origin.json` 附屬檔案。執行時間程式碼使用已追蹤的安裝狀態物件，而不是檔案形式的鎖定檔案/來源抽象。Doctor 會從設定的代理程式工作區匯入舊版附屬檔案，並在乾淨的匯入後將其移除。
- 已安裝的外掛索引現在會讀取和寫入類型化的共享 SQLite `installed_plugin_index` 單例資料列，而不是 `plugins/installs.json`；舊版 JSON 檔案僅作為 doctor 遷移輸入，並在匯入後被移除。
- 舊版 `plugins/installs.json` 路徑輔助函式現在位於 doctor 舊版程式碼中。執行時間外掛索引模組僅公開 SQLite 支援的持久性選項，而非 JSON 檔案路徑。
- Gateway 重啟哨兵、重啟意圖和監督器移交狀態現在使用類型化的共享 SQLite 行（`gateway_restart_sentinel`、`gateway_restart_intent` 和 `gateway_restart_handoff`）代替通用的不透明 blob。運行時重啟程式碼沒有基於檔案的哨兵/意圖/移交契約。
- Matrix 同步快取、儲存元資料、執行緒綁定、入站去重標記、啟動驗證冷卻狀態、SDK IndexedDB 加密快照、憑證和恢復金鑰現在使用共享 SQLite 外掛程式狀態/blob 表。運行時路徑結構不再公開 `storage-meta.json` 元資料路徑；該檔名僅作為舊版遷移輸入。其舊版 JSON 匯入計畫存在於 Matrix 外掛程式設定/醫生遷移介面中。
- Matrix 啟動時不再掃描、報告或完成舊版 Matrix 檔案狀態。Matrix 檔案檢測、舊版加密快照建立、房間金鑰還原遷移狀態、匯入及來源移除現在皆由 doctor 擁有。
- Matrix 執行時遷移 barrels 已被移除。舊版狀態/加密檢測與變更輔助程式現在改由 Matrix doctor 直接匯入，不再作為執行時 API 介面的一部分。
- Matrix 遷移快照重複使用標記現已存在於 SQLite 外掛狀態中，而非 `matrix/migration-snapshot.json`；doctor 仍可重複使用相同的已驗證遷移前存檔，而無需撰寫側車狀態檔案。
- Nostr bus 游標與個人資料發佈狀態現在使用共享的 SQLite 外掛狀態。其舊版 JSON 匯入計畫位於 Nostr 外掛設定/doctor 遷移介面中。
- Active Memory 會話切換現在使用共享的 SQLite 外掛狀態，而不是
  `session-toggles.json`；重新開啟記憶功能時會刪除該列，而不是
  重寫 JSON 物件。
- Skill Workshop 提案和審查計數器現在使用共享的 SQLite 外掛狀態，而不是每個工作區的 `skill-workshop/<workspace>.json` 存儲。每個
  提案是 `skill-workshop/proposals` 下的一個獨立列，而審查
  計數器是 `skill-workshop/reviews` 下的一個獨立列。
- Skill Workshop 審查者子代理運作現在使用運行時會話文字紀錄解析器，而不是建立 `skill-workshop/<sessionId>.json` 旁載會話路徑。
- ACPX 程序租約現在使用 `acpx/process-leases` 下的共享 SQLite 外掛程式狀態，而不是全檔案 `process-leases.json` 登錄檔。
  每個租約都作為獨立的行儲存，在不需執行時期 JSON 重寫路徑的情況下保留了啟動時的過期程序清理。
- ACPX 包裝程式指令碼和隔離的 Codex 主目錄是在 OpenClaw 暫存根目錄中生成的。它們會根據需要重新建立，並不是備份或遷移的輸入。
- Subagent 執行登錄檔的持久化使用類型化的共享 `subagent_runs` 行。
  舊的 `subagents/runs.json` 路徑現在只是 doctor 遷移的輸入，並且執行時期輔助函式名稱不再將狀態層描述為磁碟支援。
  執行時期測試不再建立無效或空的 `runs.json` 來證明登錄檔行為；它們直接植入/讀取 SQLite 行。
- 備份在歸檔之前會暫存狀態目錄，複製非資料庫檔案，使用 `VACUUM INTO` 對 `*.sqlite` 資料庫進行快照，省略即時的 WAL/SHM 側車檔案，在歸檔清單中記錄快照元數據，並在 SQLite 中隨歸檔清單記錄已完成的備份執行。`openclaw backup
create` validates the written archive by default; `--no-verify` 是明確的快速路徑。
- `openclaw backup restore` 在解壓縮之前驗證歸檔，重複使用驗證器的正規化清單，並將已驗證的清單資產還原到其記錄的來源路徑。它需要 `--yes` 才能進行寫入，並支援 `--dry-run` 作為還原計畫。
- 舊的備份易變路徑過濾器已被刪除。備份不再需要針對舊版會話或 cron JSON/JSONL 檔案的 live-tar 跳過清單，因為 SQLite 快照會在建立封存之前進行預存。
- 單純的設定與入門工作區準備作業不再建立 `agents/<agentId>/sessions/` 目錄。它們僅建立 config/workspace；SQLite 會話列和逐字稿列會視需要在個別代理程式的資料庫中建立。
- 安全性權限修復現在以全域和個別代理程式的 SQLite 資料庫以及 WAL/SHM 副檔案為目標，而不是 `sessions.json` 和逐字稿 JSONL 檔案。
- 沙箱登錄執行階段名稱現在直接描述 SQLite 登錄種類，而不是透過現用存放區傳遞舊版 JSON 登錄術語。
- `openclaw reset --scope config+creds+sessions` 會移除每個代理程式的
  `openclaw-agent.sqlite` 資料庫以及 WAL/SHM 副檔名，而不僅是舊版
  `sessions/` 目錄。
- Gateway 彙總 session 輔助程式現在使用以條目為導向的名稱：
  `loadCombinedSessionEntriesForGateway` 會回傳 `{ databasePath, entries }`。
  舊的 combined-store 命名已從執行階段呼叫端中移除。
- Docker MCP 通道植入現在會將主要 session 資料列和逐字稿
  事件寫入每個代理程式的 SQLite 資料庫，而不是建立
  `sessions.json` 和 JSONL 逐字稿。
- 內建的 session-memory hook 現在透過 `{agentId, sessionId}` 從
  SQLite 解析先前的 session 內容。它不再掃描、儲存或合成
  逐字稿路徑或 `workspace/sessions` 目錄。
- 內建的 command-logger hook 現在會將命令稽核行寫入共用的 SQLite `command_log_entries` 資料表，而不是附加到 `logs/commands.log`。
- 通道配對允許清單現在僅在執行階段和 Plugin SDK 中公開以 SQLite 為後端的讀寫輔助程式。舊的 `*-allowFrom.json` 路徑解析器和檔案讀取器僅存在於 doctor legacy import 程式碼下。
- `migration_runs` 記錄 legacy-state 遷移的執行情況，包括狀態、時間戳記和 JSON 報告。
- `migration_sources` 記錄每個匯入的 legacy 檔案來源，包括雜湊、大小、記錄數、目標資料表、執行 ID、狀態和來源移除狀態。
- `backup_runs` 記錄備份封存路徑、狀態和 JSON 清單。
- 全域架構不保留未使用的 `agents` 註冊表（registry）資料表。代理程式資料庫探索是正規的 `agent_databases` 註冊表，直到執行時期擁有真正的代理程式記錄擁有者。
- 產生的型錄設定會以代理程式目錄作為鍵值，儲存在具型別的全域 SQLite `agent_model_catalogs` 列中。執行時期呼叫者使用 `ensureOpenClawModelCatalog`；執行時期程式碼中沒有 `models.json` 相容性 API。實作會寫入 SQLite，而嵌入式 PI 註冊表會從儲存的酬載進行填充，且不會建立 `models.json` 檔案。
- QMD 會話逐字稿 Markdown 匯出和 `memory.qmd.sessions` 設定已被移除。沒有 QMD 逐字稿集合，沒有 `qmd/sessions*` 執行時期路徑，也沒有以檔案為基礎的會話記憶體橋接器。
- Memory-core runtime 從 `openclaw/plugin-sdk/memory-core-host-engine-session-transcripts` 匯入 SQLite transcript 索引輔助程式，而不是從 QMD SDK 子路徑。QMD 子路徑僅為了外部呼叫者保留相容性重新匯出，直到主要的 SDK 清理作業將其移除為止。
- QMD 自己的 `index.sqlite` 現在是由主要的 SQLite `plugin_blob_entries` 表支援的暫存 runtime 實作。Runtime 不再建立持久的 `~/.openclaw/agents/<agentId>/qmd` 側車檔案。
- 選用的 `memory-lancedb` 外掛程式不再將 `~/.openclaw/memory/lancedb` 建立為隱含的 OpenClaw 管理儲存庫。它是一個外部 LanceDB 後端，並且保持停用狀態，直到操作員設定明確的 `dbPath` 為止。
- `check:database-first-legacy-stores` 會阻擋新的執行時原始碼將遺留的儲存名稱與寫入式檔案系統 API 配對使用。它也會阻擋重新引入轉錄橋接合約的執行時原始碼，例如 `transcriptLocator`、`sqlite-transcript://...`、`sessionFile` 或 `storePath`，並掃描測試程式碼中是否有這些橋接合約名稱。它也禁止 `SessionManager.open(...)` 和舊的靜態 SessionManager 外觀，以便執行時和測試無法在不知不覺中重新建立檔案支援的會話開啟器或檔案時代會話探索。它也禁止來自匯出 UI 的舊會話 JSONL 下載器 hook/class。它也禁止側車形狀的 plugin-state/task SQLite 輔助程式名稱；測試應斷言 `databasePath` 和共用的 `state/openclaw.sqlite` 位置，而不是假裝這些功能擁有各自的 SQLite 檔案。它也禁止執行時原始碼中的舊通用記憶體索引 SQL 資料表名稱（`meta`、`files`、`chunks`、`chunks_vec`、`chunks_fts`、`embedding_cache`），以便代理程式資料庫保持其明確的 `memory_index_*` 結構描述。它也禁止嵌入 TEXT 結構描述和嵌入 JSON 陣列寫入，以便向量保持為緊湊的 SQLite BLOB。遷移、doctor、匯入和明確的非會話匯出程式碼仍然允許。此防護現也涵蓋執行時 `cache/*.json` 儲存、通用 `thread-bindings.json` 側車、cron 狀態/執行記錄 JSON、設定健康狀況 JSON、重新啟動和鎖定側車、Voice Wake 設定、外掛程式繫結核准、已安裝外掛程式索引 JSON、檔案傳輸稽核 JSONL、記憶 Wiki 活動記錄、舊的捆綁 `command-logger` 文字記錄，以及 pi-mono 原始串流 JSONL 診斷旋鈕。它也禁止舊的根層級 doctor 遺留模組名稱，以便相容性程式碼保持在 `src/commands/doctor/` 下。Android 除錯處理常式也使用 logcat/記憶體輸出，而不是暫存 `camera_debug.log` 或 `debug_logs.txt` 快取檔案。

## 目標架構形狀

保持架構明確。主機擁有的執行階段狀態使用型別化資料表。外掛擁有的不透明狀態使用 `plugin_state_entries` / `plugin_blob_entries`；沒有通用的主機 `kv` 資料表。

全域資料庫：

```text
state_leases(scope, lease_key, owner, expires_at, heartbeat_at, payload_json, created_at, updated_at)
exec_approvals_config(config_key, raw_json, socket_path, has_socket_token, default_security, default_ask, default_ask_fallback, auto_allow_skills, agent_count, allowlist_count, updated_at_ms)
schema_meta(meta_key, role, schema_version, agent_id, app_version, created_at, updated_at)
agent_databases(agent_id, path, schema_version, last_seen_at, size_bytes)
task_runs(...)
task_delivery_state(...)
flow_runs(...)
subagent_runs(run_id, child_session_key, requester_session_key, controller_session_key, created_at, ended_at, cleanup_handled, payload_json)
current_conversation_bindings(binding_key, binding_id, target_agent_id, target_session_id, target_session_key, channel, account_id, conversation_kind, parent_conversation_id, conversation_id, target_kind, status, bound_at, expires_at, metadata_json, updated_at)
plugin_binding_approvals(plugin_root, channel, account_id, plugin_id, plugin_name, approved_at)
tui_last_sessions(scope_key, session_key, updated_at)
plugin_state_entries(plugin_id, namespace, entry_key, value_json, created_at, expires_at)
plugin_blob_entries(plugin_id, namespace, entry_key, metadata_json, blob, created_at, expires_at)
media_blobs(subdir, id, content_type, size_bytes, blob, created_at, updated_at)
skill_uploads(upload_id, kind, slug, force, size_bytes, sha256, actual_sha256, received_bytes, archive_blob, created_at, expires_at, committed, committed_at, idempotency_key_hash)
web_push_subscriptions(endpoint_hash, subscription_id, endpoint, p256dh, auth, created_at_ms, updated_at_ms)
web_push_vapid_keys(key_id, public_key, private_key, subject, updated_at_ms)
apns_registrations(node_id, transport, token, relay_handle, send_grant, installation_id, topic, environment, distribution, token_debug_suffix, updated_at_ms)
node_host_config(config_key, version, node_id, token, display_name, gateway_host, gateway_port, gateway_tls, gateway_tls_fingerprint, updated_at_ms)
device_identities(identity_key, device_id, public_key_pem, private_key_pem, created_at_ms, updated_at_ms)
device_auth_tokens(device_id, role, token, scopes_json, updated_at_ms)
macos_port_guardian_records(pid, port, command, mode, timestamp)
workspace_setup_state(workspace_key, workspace_path, version, bootstrap_seeded_at, setup_completed_at, updated_at)
native_hook_relay_bridges(relay_id, pid, hostname, port, token, expires_at_ms, updated_at_ms)
model_capability_cache(provider_id, model_id, name, input_text, input_image, reasoning, supports_tools, context_window, max_tokens, cost_input, cost_output, cost_cache_read, cost_cache_write, updated_at_ms)
agent_model_catalogs(catalog_key, agent_dir, raw_json, updated_at)
managed_outgoing_image_records(attachment_id, session_key, message_id, created_at, updated_at, retention_class, alt, original_media_id, original_media_subdir, original_content_type, original_width, original_height, original_size_bytes, original_filename, record_json)
gateway_restart_sentinel(sentinel_key, version, kind, status, ts, session_key, thread_id, delivery_channel, delivery_to, delivery_account_id, message, continuation_json, doctor_hint, stats_json, payload_json, updated_at_ms)
channel_pairing_requests(channel_key, account_id, request_id, code, created_at, last_seen_at, meta_json)
channel_pairing_allow_entries(channel_key, account_id, entry, sort_order, updated_at)
voicewake_triggers(config_key, position, trigger, updated_at_ms)
voicewake_routing_config(config_key, version, default_target_mode, default_target_agent_id, default_target_session_key, updated_at_ms)
voicewake_routing_routes(config_key, position, trigger, target_mode, target_agent_id, target_session_key, updated_at_ms)
update_check_state(state_key, last_checked_at, last_notified_version, last_notified_tag, last_available_version, last_available_tag, auto_install_id, auto_first_seen_version, auto_first_seen_tag, auto_first_seen_at, auto_last_attempt_version, auto_last_attempt_at, auto_last_success_version, auto_last_success_at, updated_at_ms)
config_health_entries(config_path, last_known_good_json, last_promoted_good_json, last_observed_suspicious_signature, updated_at_ms)
sandbox_registry_entries(registry_kind, container_name, session_key, backend_id, runtime_label, image, created_at_ms, last_used_at_ms, config_label_kind, config_hash, cdp_port, no_vnc_port, entry_json, updated_at)
cron_run_logs(store_key, job_id, seq, ts, status, error, summary, diagnostics_summary, delivery_status, delivery_error, delivered, session_id, session_key, run_id, run_at_ms, duration_ms, next_run_at_ms, model, provider, total_tokens, entry_json, created_at)
cron_jobs(store_key, job_id, name, description, enabled, delete_after_run, created_at_ms, agent_id, session_key, schedule_kind, schedule_expr, schedule_tz, every_ms, anchor_ms, at, stagger_ms, session_target, wake_mode, payload_kind, payload_message, payload_model, payload_fallbacks_json, payload_thinking, payload_timeout_seconds, payload_allow_unsafe_external_content, payload_external_content_source_json, payload_light_context, payload_tools_allow_json, delivery_mode, delivery_channel, delivery_to, delivery_thread_id, delivery_account_id, delivery_best_effort, failure_delivery_mode, failure_delivery_channel, failure_delivery_to, failure_delivery_account_id, failure_alert_disabled, failure_alert_after, failure_alert_channel, failure_alert_to, failure_alert_cooldown_ms, failure_alert_include_skipped, failure_alert_mode, failure_alert_account_id, next_run_at_ms, running_at_ms, last_run_at_ms, last_run_status, last_error, last_duration_ms, consecutive_errors, consecutive_skipped, schedule_error_count, last_delivery_status, last_delivery_error, last_delivered, last_failure_alert_at_ms, job_json, state_json, runtime_updated_at_ms, schedule_identity, sort_order, updated_at)
delivery_queue_entries(queue_name, id, status, entry_kind, session_key, channel, target, account_id, retry_count, last_attempt_at, last_error, recovery_state, platform_send_started_at, entry_json, enqueued_at, updated_at, failed_at)
commitments(id, agent_id, session_key, channel, account_id, recipient_id, thread_id, sender_id, kind, sensitivity, source, status, reason, suggested_text, dedupe_key, confidence, due_earliest_ms, due_latest_ms, due_timezone, source_message_id, source_run_id, created_at_ms, updated_at_ms, attempts, last_attempt_at_ms, sent_at_ms, dismissed_at_ms, snoozed_until_ms, expired_at_ms, record_json)
migration_runs(id, started_at, finished_at, status, report_json)
migration_sources(source_key, migration_kind, source_path, target_table, source_sha256, source_size_bytes, source_record_count, last_run_id, status, imported_at, removed_source, report_json)
backup_runs(id, created_at, archive_path, status, manifest_json)
```

Agent 資料庫：

```text
schema_meta(meta_key, role, schema_version, agent_id, app_version, created_at, updated_at)
sessions(session_id, session_key, session_scope, created_at, updated_at, started_at, ended_at, status, chat_type, channel, account_id, primary_conversation_id, model_provider, model, agent_harness_id, parent_session_key, spawned_by, display_name)
conversations(conversation_id, channel, account_id, kind, peer_id, parent_conversation_id, thread_id, native_channel_id, native_direct_user_id, label, metadata_json, created_at, updated_at)
session_conversations(session_id, conversation_id, role, first_seen_at, last_seen_at)
session_routes(session_key, session_id, updated_at)
session_entries(session_id, session_key, entry_json, updated_at)
transcript_events(session_id, seq, event_json, created_at)
transcript_event_identities(session_id, event_id, seq, event_type, has_parent, parent_id, message_idempotency_key, created_at)
transcript_snapshots(session_id, snapshot_id, reason, event_count, created_at, metadata_json)
vfs_entries(namespace, path, kind, content_blob, metadata_json, updated_at)
tool_artifacts(run_id, artifact_id, kind, metadata_json, blob, created_at)
run_artifacts(run_id, path, kind, metadata_json, blob, created_at)
trajectory_runtime_events(session_id, run_id, seq, event_json, created_at)
memory_index_meta(meta_key, schema_version, provider, model, provider_key, sources_json, scope_hash, chunk_tokens, chunk_overlap, vector_dims, fts_tokenizer, config_hash, updated_at)
memory_index_sources(source_kind, source_key, path, session_id, hash, mtime, size)
memory_index_chunks(id, source_kind, source_key, path, session_id, start_line, end_line, hash, model, text, embedding, embedding_dims, updated_at)
memory_embedding_cache(provider, model, provider_key, hash, embedding, dims, updated_at)
cache_entries(scope, key, value_json, blob, expires_at, updated_at)
```

未來的搜尋可以新增 FTS 資料表，而無需變更標準事件資料表：

```text
transcript_events_fts(session_id, seq, text)
vfs_entries_fts(namespace, path, text)
```

大值應使用 `blob` 欄位，而非 JSON 字串編碼。請保留
`value_json` 給必須能以純 SQLite 工具檢查的小型結構化資料。

`agent_databases` 是此分支的標準註冊表。在存在真正的代理程式記錄擁有者之前，請勿新增
`agents` 資料表；代理程式設定保留在
`openclaw.json` 中。

## Doctor 遷移形式

Doctor 應該呼叫一個明確的遷移步驟，該步驟是可報告的且可以安全地重新執行：

```bash
openclaw doctor --fix
```

`openclaw doctor --fix` 在一般的配置預檢之後呼叫狀態遷移實作，並在匯入之前建立經過驗證的備份。執行時啟動和 `openclaw migrate` 不得匯入舊版的 OpenClaw 狀態檔案。

遷移屬性：

- 一次遷移通掃描所有舊版檔案來源並在變更任何內容之前生成計畫。
- Doctor 在匯入舊版檔案之前會建立一個已驗證的遷移前備份封存檔。
- 匯入作業具冪等性，並根據來源路徑、mtime、大小、雜湊值和目標資料表進行索引鍵處理。
- 來源檔案處理成功後，會在目標資料庫認可後被移除或封存。
- 匯入失敗會保留來源不變，並在 `migration_runs` 中記錄警告。
- 執行時程式碼僅在遷移存在時讀取 SQLite。
- 不需要降級/匯出至執行時檔案的路徑。

## 遷移清單

將這些移至全域資料庫：

- Task registry 執行時寫入現在使用共享資料庫；未發佈的
  `tasks/runs.sqlite` 側邊車匯入器已被刪除。Snapshot 儲存會透過 task
  id 進行 upsert，並僅刪除遺失的 task/delivery 資料列。
- Task Flow 執行階段寫入現在會使用共享資料庫；未發佈的
  `tasks/flows/registry.sqlite` sidecar 匯入器已刪除。Snapshot 儲存
  會依 flow id 進行 upsert，並僅刪除遺失的 flow 資料列。
- Plugin state 執行階段寫入現在會使用共享資料庫；未發佈的
  `plugin-state/state.sqlite` sidecar 匯入器已刪除。
- 內建記憶體搜尋不再預設為 `memory/<agentId>.sqlite`；其
  索引表位於所屬的 agent 資料庫中，且明確的
  `memorySearch.store.path` 附屬選項已改由 doctor 設定
  遷移處理。
- 內建記憶體重新索引僅會重置 agent 資料庫中由記憶體擁有的資料表。
  它不得取代整個 SQLite 檔案，因為同一個資料庫擁有
  工作階段、逐字稿、VFS 列、成品和執行時期快取。
- 將沙箱容器/瀏覽器註冊表從單體和分片的 JSON 中分離出來。執行時寫入現在使用共享資料庫；舊版 JSON 匯入予以保留。
- Cron 任務定義、排程狀態和執行記錄現在使用共享 SQLite；doctor 會匯入/移除舊版 `jobs.json`、`jobs-state.json` 和 `cron/runs/*.jsonl` 檔案
- 裝置身分/驗證、推播、更新檢查、承諾、OpenRouter 模型快取、已安裝的外掛索引，以及 app-server 繫結
- 裝置/節點配對與啟動記錄現在使用具類型的 SQLite 資料表
- 裝置配對通知訂閱者與已傳遞請求標記現在使用共享的 SQLite plugin-state 資料表，而非 `device-pair-notify.json`。
- Voice-call 通話記錄現在改用共享的 SQLite plugin-state 資料表，位於
  `voice-call` / `calls` 命名空間下，而非 `calls.jsonl`；plugin CLI
  會追蹤並彙總以 SQLite 為後備的通話歷史。
- QQBot gateway 會話、已知使用者記錄和 ref-index 引用快取現在使用
  SQLite plugin state 於 `qqbot` 命名空間 (`sessions`、 `known-users`、
  `ref-index`)，而非 `session-*.json`、 `known-users.json` 和
  `ref-index.jsonl`；QQBot doctor/setup 遷移會匯入並移除
  舊版檔案。
- Discord 模型選擇器偏好設定、指令部署雜湊值以及執行緒綁定
  現在使用 SQLite 外掛程式狀態於 `discord` 命名空間下
  (`model-picker-preferences`, `command-deploy-hashes`, `thread-bindings`)
  取代 `model-picker-preferences.json`、`command-deploy-cache.json` 及
  `thread-bindings.json`；Discord doctor/setup 遷移會匯入並
  移除舊版檔案。
- BlueBubbles 追蹤游標及入站去重標記現在使用 SQLite 外掛程式
  狀態於 `bluebubbles` 命名空間下 (`catchup-cursors`, `inbound-dedupe`)
  取代 `bluebubbles/catchup/*.json` 及
  `bluebubbles/inbound-dedupe/*.json`；BlueBubbles doctor/setup 遷移
  會匯入並移除舊版檔案。
- Telegram 更新偏移量、貼圖快取項目、回覆鏈訊息快取項目、已傳送訊息快取項目、主題名稱快取項目以及執行緒綁定現在使用 `telegram` 命名空間下的 SQLite 外掛程式狀態 (`update-offsets`, `sticker-cache`, `message-cache`, `sent-messages`, `topic-names`, `thread-bindings`)，取代 `update-offset-*.json`、`sticker-cache.json`、`*.telegram-messages.json`、`*.telegram-sent-messages.json`、`*.telegram-topic-names.json` 和 `thread-bindings-*.json`；Telegram doctor/setup 遷移會匯入並移除舊版檔案。
- iMessage 追趕游標、回覆 short-id 對應以及 sent-echo 去重資料行
  現在使用 `imessage` 命名空間（`catchup-cursors`、
  `reply-cache`、 `sent-echoes`）下的 SQLite 外掛程式狀態，而非 `imessage/catchup/*.json`、
  `imessage/reply-cache.jsonl` 和 `imessage/sent-echoes.jsonl`；iMessage
  doctor/setup 遷移會匯入並移除舊版檔案。
- Microsoft Teams 對話、投票、委派權杖、待上傳項目以及
  反饋學習現在使用 SQLite 外掛程式狀態/BLOB 命名空間
  (`conversations`, `polls`, `delegated-tokens`, `pending-uploads`,
  `feedback-learnings`)，而非 `msteams-conversations.json`,
  `msteams-polls.json`, `msteams-delegated.json`,
  `msteams-pending-uploads.json` 和 `*.learnings.json`；Microsoft Teams
  doctor/setup 遷移會匯入並移除這些舊版檔案。
- Matrix 同步快取、儲存元資料、執行緒綁定、入站去重標記、啟動驗證冷卻狀態、憑證、復原金鑰以及 SDK IndexedDB 加密快照現在使用 `matrix` 下的 SQLite 外掛程式 state/blob 命名空間 (`sync-store`, `storage-meta`, `thread-bindings`, `inbound-dedupe`, `startup-verification`, `credentials`, `recovery-key`, `idb-snapshots`)，而不是 `bot-storage.json`, `storage-meta.json`, `thread-bindings.json`, `inbound-dedupe.json`, `startup-verification.json`, `credentials.json`, `recovery-key.json` 和 `crypto-idb-snapshot.json`；Matrix doctor/setup 遷移會從帳戶範圍的 Matrix 儲存根目錄匯入並移除那些舊版檔案。
- Nostr 匯流排游標和個人資料發佈狀態現在使用 SQLite 外掛程式狀態於 `nostr` 命名空間 (`bus-state`, `profile-state`) 下，而非 `bus-state-*.json` 和 `profile-state-*.json`；Nostr doctor/setuptools 遷移會匯入並移除舊版檔案。
- Active Memory 會話切換現在使用 SQLite 外掛程式狀態於 `active-memory/session-toggles` 下，而非 `session-toggles.json`。
- Skill Workshop 提案佇列和審查計數器現在使用 SQLite 外掛程式狀態於 `skill-workshop/proposals` 和 `skill-workshop/reviews` 下，而非每個工作區的 `skill-workshop/<workspace>.json` 檔案。
- 出站傳遞和會話傳遞佇列現在使用不同的佇列名稱 (`outbound-delivery`, `session-delivery`) 共用全域 SQLite
  `delivery_queue_entries` 表，而非持久化的
  `delivery-queue/*.json`、`delivery-queue/failed/*.json` 和
  `session-delivery-queue/*.json` 檔案。doctor legacy-state 步驟會匯入
  待處理和失敗的資料列、移除過時的已傳遞標記，並在匯入後刪除舊的
  JSON 檔案。熱路由和重試欄位是類型化欄位；JSON 載荷僅保留用於重放/偵錯。
- ACPX 程序租約現在使用 `acpx/process-leases` 下的 SQLite 外掛程式狀態
  取代 `process-leases.json`。
- 備份與遷移執行中繼資料

將這些移至代理程式資料庫：

- Agent 會話根目錄和相容性形成的會話條目 payload。已完成
  執行時期寫入：熱會話元資料可在 `sessions` 中查詢，而
  舊版形成的完整 `SessionEntry` payload 仍保留在 `session_entries` 中。
- Agent 轉錄事件。已完成執行時期寫入。
- 壓縮檢查點和轉錄快照。已完成執行時期寫入：
  檢查點轉錄副本是 SQLite 轉錄行，檢查點
  元資料則記錄在 `transcript_snapshots` 中。Gateway 檢查點輔助程式
  現在將這些值命名為轉錄快照，而非來源檔案。
- Agent VFS scratch/workspace 命名空間。已完成執行時期 VFS 寫入。
- 子代理附加 payload。已完成執行時期寫入：它們是 SQLite VFS
  種子條目，從非永久性工作區檔案。
- 工具產出。已完成執行時期寫入。
- 執行產出成果。已透過每個代理程式 (per-agent) 的
  `run_artifacts` 資料表完成工作執行階段寫入。
- 代理程式本機執行階段快取。已透過每個代理程式 (per-agent) 的 `cache_entries` 資料表完成工作執行階段範圍快取寫入。
  閘道範圍的模型快取保留在全域資料庫中，除非它們變成代理程式特定。
- ACP 父級串流日誌。已為執行階段寫入完成。
- ACP 重播帳本會話。已透過 `acp_replay_sessions` 和 `acp_replay_events` 完成執行階段寫入；
  舊版 `acp/event-ledger.json` 僅保留作為診斷工具 的輸入。
- 非明確匯出檔案時的 Trajectory 附屬檔案。針對執行時寫入已完成：trajectory capture 寫入 agent-database `trajectory_runtime_events` 資料列，並將執行範圍的構件鏡像至 SQLite。舊版附屬檔案僅作為 doctor 匯入輸入；匯出可以具體化全新的 JSONL support-bundle 輸出，但不會在執行時讀取或遷移舊的 trajectory/transcript 附屬檔案。執行時 trajectory capture 會公開 SQLite 範圍；JSONL 路徑輔助程式僅限於匯出/除錯支援，不會從執行時模組重新匯出。Embedded-runner trajectory 中繼資料記錄 `{agentId, sessionId, sessionKey}` 身份，而非持久化 transcript 定位器。

暫時保留這些檔案支援的項目：

- `openclaw.json`
- 提供者或 CLI 憑證檔案
- plugin/package 清單
- 選取磁碟模式時的使用者工作區和 Git 儲存庫
- 供操作員追蹤的日誌，除非特定的日誌介面已被移動

## 遷移計劃

### 階段 0：凍結邊界

在移動更多資料列之前，明確確定持久狀態邊界：

- 在全域資料庫中新增一個 `migration_runs` 資料表。
  已完成：用於遺留狀態遷移執行報告。
- 新增一個由 doctor 擁有的狀態遷移服務，用於檔案到資料庫的匯入。
  已完成：`openclaw doctor --fix` 使用了遺留狀態遷移實作。
- 使 `plan` 變成唯讀，並讓 `apply` 建立備份、匯入、驗證，
  然後刪除或隔離舊檔案。
  已完成：doctor 會建立已驗證的遷移前備份，將備份路徑傳遞給
  `migration_runs`，並重複使用匯入器/移除路徑。
- 新增靜態禁令，使新的執行時程式碼無法寫入舊版狀態檔案，同時遷移程式碼和測試仍可植入/讀取它們。
  對目前已遷移的舊版存儲已完成此操作；防護機制也會掃描巢狀測試中是否有禁止的執行時 transcript 定位器合約。

### 階段 1：完成全域控制平面

將共享協調狀態保留在 `state/openclaw.sqlite` 中：

- 代理程式及代理程式資料庫註冊表
- 任務和任務流程帳本
- 外掛程式狀態
- 沙盒容器/瀏覽器註冊表
- Cron/排程器執行歷史
- 配對、裝置、推送、更新檢查、TUI、OpenRouter/模型快取，以及其他
  小型閘道範圍的執行時狀態
- 備份與遷移元數據
- Gateway 媒體附件位元組。運行時寫入已完成；直接檔案路徑是為了與通道發送器和沙盒暫存區相容而產生的暫時具體化。運行時允許清單接受 SQLite 具體化路徑，而非舊版狀態/配置媒體根目錄。Doctor 會將舊版媒體檔案匯入 `media_blobs`，並在成功寫入資料列後移除來源檔案。
- 除錯代理捕捉會話、事件和 payload blob。已完成：在共享狀態 DB 中即時捕捉，並透過共享狀態 DB 啟動、架構、WAL 和忙碌逾時設定開啟。沒有除錯代理運行時 sidecar DB 覆寫、blob 目錄或僅限代理捕捉生成的架構/codegen 目標。

此階段還會從這些子系統中刪除重複的 sidecar 開啟器、權限輔助程式、WAL 設定、檔系統修剪和相容性寫入器。

### 階段 2：引入個別代理資料庫

為每個代理程式建立一個資料庫，並從全域資料庫註冊它：

```text
~/.openclaw/state/openclaw.sqlite
~/.openclaw/agents/<agentId>/agent/openclaw-agent.sqlite
```

全域 `agent_databases` 列儲存路徑、架構版本、最後查看
時間戳記以及基本的大小/完整性元資料。執行時代碼會向註冊表請求
代理程式資料庫，而不是直接推導檔案路徑。

代理程式資料庫擁有：

- `sessions` 作為標準的工作階段根目錄，`session_entries` 作為
  附加至該根目錄的相容性裝酬載表，以及
  `session_routes` 作為唯一的活動 `session_key` 查詢
- `conversations` 和 `session_conversations` 作為附加至工作階段的
  標準化提供者路由識別身分
- `transcript_events`
- 文字記錄快照和壓縮檢查點。已完成執行時寫入。
- `vfs_entries`
- `tool_artifacts` 和運行產出
- 代理端本地的 runtime/cache 資料列。已針對 worker 範圍快取完成。
- ACP 父串流事件
- 當軌跡 runtime 事件不是明確的匯出產出時

### 階段 3：置換會話存放區 (Session Store) API

Runtime 已完成。檔案狀的會話存放區介面並非有效的
runtime 契約：

- Runtime 不再呼叫 `loadSessionStore(storePath)` 或將 `storePath` 視為
  會話身分。
- Runtime 的資料列操作包含 `getSessionEntry`、`upsertSessionEntry`、
  `patchSessionEntry`、`deleteSessionEntry` 和 `listSessionEntries`。
- 全存放區重寫輔助程式、檔案寫入器、佇列測試、別名修剪和
  舊版金鑰刪除參數已從 runtime 中移除。
- 已棄用的根套件相容性匯出仍會將標準 `sessions.json` 路徑調整為 SQLite 列 API。
- `sessions.json` 解析僅保留在 doctor 遷移/匯入程式碼和 doctor 測試中。
- 執行時期生命週期後備讀取會讀取 SQLite 轉錄標頭，而非 JSONL 首行。

請繼續刪除任何重新引入檔案鎖定參數、修剪/截斷作為檔案維護的術語、儲存路徑識別碼，或唯一斷言為 JSON 持久化的測試。

### 階段 4：移動轉錄、ACP 串流、軌跡與 VFS

讓每個代理程式資料串流都原生資料庫化：

- Transcript 附加寫入會經過一個 SQLite 事務，該事務確保
  session 標頭，檢查 message 幾等性，選擇父尾，插入
  到 `transcript_events`，並在
  `transcript_event_identities` 中記錄可查詢的身分元數據。這對於直接的 transcript message 附加和
  正常持久化的 `TranscriptSessionManager` 附加均已完成；明確的分支
  操作保留其明確的父級選擇，並且仍然寫入 SQLite 列
  而不衍生任何文件定位器。
- ACP 父串流日誌變成列，而不是 `.acp-stream.jsonl` 文件。已完成。
- ACP spawn 設定不再持久化 transcript JSONL 路徑。已完成。
- Runtime trajectory capture 直接寫入事件列/產物。明確的
  support/export 指令仍可產生 support-bundle JSONL 產物作為
  匯出格式，但 session 匯出不會重建 session JSONL。已完成。
- 設定為磁碟模式時，磁碟工作區會保留在磁碟上。
- VFS 暫存區和實驗性的僅 VFS 工作區模式會使用代理程式資料庫。

此遷移會匯入舊的 JSONL 檔案一次，在 `migration_runs` 中記錄計數/雜湊值，並在完整性檢查後移除已匯入的檔案。

### 階段 5：備份、還原、清理與驗證

備份仍維持為一個封存檔案：

- 對每個全域和代理程式資料庫設置檢查點。
- 使用 SQLite 備份語意或 `VACUUM INTO` 為每個資料庫建立快照。
- 將壓縮後的資料庫快照、設定、外部憑證和要求的工作區匯出進行封存。
- 省略原始即時 `*.sqlite-wal` 和 `*.sqlite-shm` 檔案。
- 透過開啟每個資料庫快照並執行 `PRAGMA integrity_check` 來驗證。
  `openclaw backup create` 預設會執行此歸檔驗證；
  `--no-verify` 僅略過寫入後的歸檔程序，而非略過快照
  建立的完整性檢查。
- 還原會將快照複製回其目標路徑。此分支會將未出貨的 SQLite 版面重置為 `user_version = 1`；未來出貨的結構變更可以在需要時新增明確的遷移。

### 階段 6：Worker 執行時期

在資料庫分割落地的同時，將 Worker 模式保持為實驗性：

- Workers 會接收 agent id、run id、filesystem mode 和 DB registry identity。
- 每個 Worker 開啟自己的 SQLite 連線。
- Parent 保留 channel delivery、approvals、config 和 cancellation authority。
- 從每個執行中的 run 一個 worker 開始；只有在生命週期和 DB
  連線擁有權穩定後，才加入 pooling。

### 階段 7：刪除舊世界

針對執行時期會話管理已完成。舊世界僅允許作為明確的 doctor 輸入或支援/匯出輸出：

- 無執行時期 `sessions.json`、transcript JSONL、sandbox registry JSON、task sidecar SQLite 或 plugin-state sidecar SQLite 寫入。
- 無 JSON/會話檔案修剪、檔案 transcript 截斷、會話檔案鎖定或鎖形狀的會話測試。
- 無旨在保持舊會話檔案為最新狀態的執行時期相容性匯出。
- 明確的支援匯出仍為使用者要求的封存/具體化格式，且不得將檔案名稱回饋至執行時期身分。

## 備份與還原

備份應為單一封存檔案，但資料庫捕獲應為 SQLite 原生格式：

1. 停止長時間執行的寫入活動或進入短暫的備份屏障。
2. 針對每個全域和 agent 資料庫，執行檢查點。
3. 使用 SQLite 備份語義或 `VACUUM INTO` 對每個資料庫建立快照，並存入
   暫時備份目錄。
4. 將壓縮後的資料庫快照、設定檔、憑證目錄、
   選定的工作區，以及一份清單進行封存。
5. 透過開啟每個包含的 SQLite 快照並執行
   `PRAGMA integrity_check` 來驗證封存檔。
   `openclaw backup create` 預設會執行此動作；`--no-verify` 僅用於
   故意跳過寫入後封存通過的情況。

不要依賴原始即時的 `*.sqlite`、`*.sqlite-wal` 和 `*.sqlite-shm` 副本作為
主要備份格式。封存清單應記錄資料庫角色、
代理程式 ID、綱要版本、來源路徑、快照路徑、位元組大小和完整性
狀態。

Restore 應該從存檔快照重建全域資料庫和代理資料庫檔案。由於 SQLite 版面配置尚未發布，此重構僅保留 version-1 綱要以及 doctor 檔案轉資料庫匯入。Restore 指令會先驗證存檔，然後從驗證後的解載內容中替換每個資產清單項目。

## Runtime 重構計畫

1. 新增資料庫 registry API。
   - 解析全域 DB 和各代理 DB 的路徑。
   - 將未發布的綱要保持在 `user_version = 1`；直到已發布的綱要有需要時，再新增綱要遷移執行程式碼。
   - 新增測試、備份和 doctor 使用的 close/checkpoint/integrity 輔助函式。

2. 合併 sidecar SQLite 儲存庫。
   - 將插件狀態表格移至全域資料庫。Runtime 寫入已完成；未發布的舊版 sidecar 匯入器已刪除。
   - 將任務註冊表移至全域資料庫。執行階段寫入已完成；未交付的舊版側車匯入器已刪除。
   - 將任務流程表移至全域資料庫。執行階段寫入已完成；未交付的舊版側車匯入器已刪除。
   - 將內建記憶體搜尋表移至各個代理程式資料庫中。已完成；透過 doctor 設定遷移，現在已移除明確的自訂 `memorySearch.store.path`。完整的重新索引僅針對記憶體表就地執行；舊的整個檔案交換路徑和側車索引交換輔助程式已刪除。
   - 從那些子系統中刪除重複的資料庫開啟器、WAL 設定、權限輔助程式和關閉路徑。

3. 將代理程式擁有的表移至各個代理程式的資料庫中。
   - 透過全域資料庫註冊表按需建立代理程式 DB。已完成。
   - 將執行階段工作階段條目、逐字稿事件、VFS 列和工具成品移至代理程式 DB。已完成。
   - 不要遷移分支本地的共用資料庫會話條目、逐字稿事件、VFS 資料列或工具人工製品；該佈局從未發布。在 doctor 中僅保留舊版檔案到資料庫的匯入功能。

4. 取代會話儲存 API。
   - 移除 `storePath` 作為執行時身分。對執行時已完成並由 `check:database-first-legacy-stores` 守護：session 元數據、路由更新、指令持久化、CLI session 清理、飛書推理預覽、文字紀錄狀態持久化、子代理深度、身分驗證設定檔 session 覆寫、父分叉邏輯和 QA 實驗室檢查現在從 canonical agent/session keys 解析資料庫。Gateway/TUI/UI/macOS session 列表回應現在公開 `databasePath` 而非舊版的 `path`；macOS 偵錯介面將 per-agent 資料庫顯示為唯讀狀態，而不是寫入 `session.store` 設定。`/status`、聊天驅動的軌跡匯出和 CLI 相依性代理不再傳播舊版儲存路徑；文字紀錄使用後備讀取會依據 agent/session 身分讀取 SQLite。執行時和橋接測試不再公開 `storePath`；doctor/migration 輸入擁有該舊版欄位名稱。Gateway 合併 session 載入不再有針對非樣板 `session.store` 值的特殊執行時分支；它會聚合 per-agent SQLite 列。舊版 session-lock doctor 通道及其 `.jsonl.lock` 清理協助程式已被移除；SQLite 現在是 session 併發邊界。熱門執行時呼叫站點使用面向列的協助程式名稱，例如 `resolveSessionRowEntry`；舊的 `resolveSessionStoreEntry` 相容性別名已從執行時和外掛 SDK 匯出中移除。

- 使用 `{ agentId, sessionKey }` 列操作。
  已完成：`getSessionEntry`、`upsertSessionEntry`、`deleteSessionEntry`、
  `patchSessionEntry` 和 `listSessionEntries` 是以 SQLite 為優先的 API，不
  需要會話儲存路徑。狀態摘要、本地代理狀態、健全狀況，
  以及 `openclaw sessions` 列出指令現在會直接讀取各代理的列，
  並顯示各代理的 SQLite 資料庫路徑，而非 `sessions.json` 路徑。
- 將整個儲存的刪除/插入替換為 `upsertSessionEntry`、
  `deleteSessionEntry`、`listSessionEntries` 和 SQL 清理查詢。
  執行時已完成：熱路徑現在使用列 API 和衝突重試的列修補；
  其餘的整個儲存匯入/取代輔助程式僅限於遷移匯入
  程式碼和 SQLite 後端測試。
  - 刪除 `store-writer.ts` 和 writer-queue 測試。完成。
  - 從 session row upserts/patches 中刪除 runtime legacy-key pruning 和 alias-delete 參數。完成。

5. 刪除 runtime JSON registry 行為。
   - 使 sandbox registry 讀寫僅限於 SQLite。完成。
   - 僅從遷移步驟匯入 monolithic 和 sharded JSON。完成。
   - 移除 sharded registry 鎖定和 JSON 寫入。完成。

- 如果形狀保持為熱路徑操作狀態，則保留一個類型化的 registry 表，而不是將 registry 行儲存為通用不透明 JSON。完成。

6. 刪除 file-lock-shaped session 變異。
   - 已完成 runtime lock 創建和 runtime lock API。
   - 獨立的 legacy `.jsonl.lock` doctor 清理通道已被移除。
   - `session.writeLock` 是經由 doctor 遷移的 legacy 配置，而不是類型化的 runtime 設置。
   - State integrity 不再有單獨的孤兒轉錄文件修剪路徑；doctor 遷移會在一個地方匯入/移除舊版 JSONL 來源。
   - Gateway 單例協調使用 `state_leases` 下的類型化 SQLite `gateway_locks` 行，並且不再暴露檔案鎖定目錄縫隙。
   - 通用外掛 SDK 去重持久化不再使用檔案鎖定或 JSON 檔案；它寫入共享的 SQLite 外掛狀態行。已完成。
   - QMD 嵌入式協調使用 SQLite 狀態租約而不是 `qmd/embed.lock`。已完成。

7. 讓 Worker 具備資料庫感知能力。
   - Worker 開啟它們自己的 SQLite 連線。
   - 父程序擁有交付、通道回呼 和配置。
   - Worker 接收代理 ID、執行 ID、檔案系統模式和 DB 註冊表身分，而不是即時控制代碼。
   - `vfs-only` 保持實驗性狀態，並使用代理資料庫作為其儲存根目錄。
   - 首先每個活躍運行保持一個 worker。連線池可以等到資料庫連線生命週期和取消行為變得無趣再說。

8. 備份整合。
   - 教導備份透過 SQLite 備份或 `VACUUM INTO` 來對全域和 agent 資料庫進行快照。已完成針對狀態資產下發現的 `*.sqlite` 檔案。
   - 為 SQLite 完整性和 schema 版本新增備份驗證。已完成針對備份建立和預設封存驗證完整性檢查。
   - 在 SQLite 中記錄備份執行元資料。已透過共享的 `backup_runs` 表格完成，包含封存路徑、狀態和清單 JSON。
   - 新增從已驗證封存快照還原的功能。已完成：`openclaw backup restore` 在解壓縮前進行驗證，使用驗證器的正規化清單，支援 `--dry-run`，並且在替換記錄的來源路徑前需要 `--yes`。
   - 僅在請求時包含 VFS/工作區匯出；請勿將 session 內部結構匯出為 JSON 或 JSONL。

9. 刪除過時的測試和程式碼。已針對已知的 runtime session 介面完成。

- 移除斷言執行時建立 `sessions.json` 或逐字稿
  JSONL 檔案的測試。已針對核心 session store、chat、gateway 逐字稿事件、
  preview、lifecycle、command session-entry 更新、auto-reply reset/trace，以及
  memory-core dreaming fixtures、approval target routing、session transcript
  repair、security permission repair、trajectory export 和 session export 完成。
  Active-memory transcript 測試現今斷言 SQLite 範圍，並不會建立暫時性或
  持續性的 JSONL 檔案。
  舊的 heartbeat transcript-pruning 回歸測試已移除，因為
  runtime 不再截斷 JSONL transcripts。
  Agent session-list 工具測試不再將舊版 `sessions.json` 路徑
  模型化為 gateway 回應形狀；app/UI/macOS 測試使用 `databasePath`。
  `/status` transcript-usage 測試現在直接植入 SQLite transcript 列
  而非寫入 JSONL 檔案。
  Gateway session lifecycle 測試現在使用 SQLite transcript 植入輔助程式
  直接進行；舊的單行 session-file fixture 形狀已從 reset
  與 delete 涵蓋範圍中移除。
  `sessions.delete` 不再傳回檔案時代的 `archived: []` 欄位；刪除
  僅回報列變異結果。舊的 `deleteTranscript` 選項也
  不復存在：刪除 session 會移除正規 `sessions` 根目錄，並讓
  SQLite 串聯刪除 session 擁有的 transcript、snapshot 與 trajectory 列，因此沒有
  呼叫者能遺留 transcript orphans 或忘記清理分支。
  Context-engine trajectory 擷取測試現在從獨立的
  agent 資料庫讀取 `trajectory_runtime_events`
  列，而非讀取
  `session.trajectory.jsonl`。
  Docker MCP 頻道植入腳本現在直接植入 SQLite 列。直接的
  `sessions.json` 寫入僅限於 doctor fixtures。
  Tool Search Gateway E2E 從 SQLite transcript 列讀取 tool-call 證據
  而非掃描 `agents/<agentId>/sessions/*.jsonl` 檔案。
  Memory-core host 事件與 session-corpus scratch 列現在位於共用的
  SQLite plugin-state 中；`events.jsonl` 與 `session-corpus/*.txt` 僅作為
  舊版 doctor 遷移輸入。有效的列使用 `memory/session-ingestion/`
  虛擬路徑，而非 `.dreams/session-corpus`。舊的 memory-core dreaming
  修復模組及其 CLI/Gateway 測試已移除，因為 runtime 不再
  擁有該語料庫的檔案封存修復。Memory-core
  bridge/public-artifact 測試不再公開 `.dreams/events.jsonl`；它們
  使用 SQLite 支援的虛擬 JSON artifact 名稱。
  Public SDK/Codex 測試文件現在敘述 SQLite session 狀態而非 session
  檔案，且 channel-turn 範例不再公開 `storePath` 引數。
  Matrix sync 狀態現在使用 SQLite plugin-state store 直接。Active
  client/runtime 契約傳遞帳戶儲存根目錄，而非 `bot-storage.json`
  路徑，且 doctor 會在刪除來源前將舊版 `bot-storage.json` 匯入 SQLite。QA Matrix restart/destructive 情境現在直接變更 SQLite sync
  列，而非建立或刪除假的 `bot-storage.json` 檔案，且
  E2EE 基底傳遞 sync-store 根目錄而非假的
  `sync-store.json` 路徑。
  Matrix storage-root 選擇不再根據舊版 sync/thread JSON
  檔案評分根目錄；它使用持久根目錄元資料與真實的加密狀態。
  Runtime SQLite session 後端測試套件不再偽造
  `sessions.json`；舊版來源 fixtures 現在位於匯入它們的 doctor
  測試中。
  Gateway session 測試不再公開 `createSessionStoreDir` 輔助程式或
  未使用的暫時 session-store 路徑設定；fixture 目錄為明確指定，直接
  列設定使用 SQLite session-row 命名。
  僅限 Doctor 的 JSON5 session-store 解析器涵蓋範圍已從 infra 測試移出
  並移入 doctor 遷移測試，因此 runtime 測試套件不再擁有舊版
  session-file 解析。
  Microsoft Teams runtime SSO/pending-upload 測試不再攜帶 JSON sidecar
  fixtures 或解析器；舊版 SSO token 解析僅存在於 plugin
  遷移模組中。Telegram 測試不再植入假的 `/tmp/*.json` store
  路徑；它們直接重設 SQLite 支援的訊息快取。泛型
  OpenClaw test-state 輔助程式不再公開舊版 `auth-profiles.json`
  寫入器；doctor auth 遷移測試在本機擁有該 fixture。
  TUI last-session 指標、exec approvals、active-memory
  切換、Matrix dedupe/startup 驗證、Memory Wiki 來源同步、
  current-conversation 繫結、onboarding auth 與 Hermes secret 匯入的 Runtime 測試，不再
  製造舊的 sidecar 檔案或斷言舊檔名不存在。它們
  透過 SQLite 列與公開 store API 證明行為；doctor/migration
  測試是唯一舊版來源檔名所屬之處。
  設備/節點配對、channel allowFrom、restart 意圖、
  restart handoff、session 傳遞佇列項目、設定健全性、iMessage
  快取、cron 工作、PI transcript 標頭、subagent 登錄與受管理
  圖像附件的 Runtime 測試，也不再僅為了證明
  它們被忽略或不存在而建立已淘汰的 JSON/JSONL 檔案。
  PI 溢位恢復不再擁有 SessionManager 重寫/截斷
  後備方案：tool-result 截斷與 context-engine transcript 重寫會變更
  SQLite transcript 列，然後從資料庫重新整理有效的 prompt 狀態。
  持久化的 SessionManager 訊息附加委派給原子的 SQLite
  transcript 附加輔助程式以進行父項選擇與等冪性。一般的
  元資料/自訂項目附加也會在 SQLite 內選取目前的父項，因此
  停滯的 manager 執行個體不會復活 pre-SQLite parent-chain 競爭條件。
  針對 mid-turn prechecks 與 `sessions_yield` 的合成 PI 尾部清理現在
  直接修剪 SQLite transcript 狀態；舊的 SessionManager 尾部移除
  橋接器及其測試已刪除。
  壓縮檢查點擷取也僅從 SQLite 快照；呼叫者不再
  傳遞即時 SessionManager 作為替代逐字稿來源。
- 保留僅為遷移而植入舊版檔案的測試。
- 針對活躍的執行時介面，JSON 檔案證明已被 SQL 資料列證明取代。

- 新增對執行時寫入舊版 session/cache JSON 路徑的靜態封鎖。
  已對 repo guard 完成此項。

10. 使遷移報告可供稽核。
    - 在 SQLite 中記錄遷移執行，包含開始/結束時間戳記、來源
      路徑、來源雜湊、計數、警告及備份路徑。
      完成：legacy-state 遷移執行現在會持續保存 `migration_runs`
      報告，其中包含來源路徑/表格清單、來源檔案 SHA-256、大小、
      記錄計數、警告及備份路徑。
      完成：legacy-state 遷移執行也會持續保存 `migration_sources`
      資料列，以便進行來源層級稽核及未來的跳過/回填決策。
    - 讓套用具等冪性。在部分匯入後重新執行應該要麼跳過已匯入的來源，要麼透過穩定金鑰進行合併。
      完成：session 索引、transcripts、傳送佇列、外掛狀態、task
      分類帳，以及 agent 擁有的全域 SQLite 列現在透過穩定金鑰或
      upsert/replace 語意匯入，因此重新執行會進行合併而不會重複持久化
      列。
    - 匯入失敗必須將原始來源檔案保留在原處。
      完成：失敗的 transcript 匯入現在會將原始 JSONL 來源保留在其
      偵測到的路徑，並且 `migration_sources` 將來源記錄為
      `warning`，並附帶 `removed_source=0` 以供下一次 doctor 執行使用。

## 效能規則

- 每個執行緒/程序一個連線是可以的；不要在 worker 之間共用 handles。
- 使用 WAL、`foreign_keys=ON`、30 秒的忙碌逾時，以及短 `BEGIN IMMEDIATE`
  寫入交易。
- 讓寫入事務輔助函式保持同步，除非/直到異步事務 API 加入明確的互斥鎖/背壓語意。
- 保持父級交付寫入短小且具有事務性。
- 避免重寫整個存儲；請使用層級級的 upsert/delete。
- 在遷移熱代碼之前，為 list-by-agent、list-by-session、updated-at、run id 和過期路徑添加索引。
- 將大型成品、媒體和向量存儲為 BLOB 或分塊的 BLOB 行，而非 base64 或數值陣列 JSON。
- 保持不透明的插件狀態條目短小且範圍受限。
- 新增用於 TTL/過期的 SQL 清理，而非檔案系統修剪。
  已針對資料庫擁有的執行時存儲完成：媒體、插件狀態、插件 blob、
  永久重複刪除和代理快取均透過 SQLite 行過期。剩餘的
  檔案系統清理僅限於臨時具現化或明確的
  移除指令。

## 靜態禁止

新增一個程式庫檢查，使對舊版狀態路徑的新執行時寫入失敗：

- `sessions.json`
- `*.trajectory.jsonl` 具體化的 support-bundle 輸出除外
- `.acp-stream.jsonl`
- `acp/event-ledger.json`
- `cache/*.json` 執行時期快取檔案
- `agents/<agentId>/agent/auth.json`
- `agents/<agentId>/agent/models.json`
- `credentials/oauth.json`
- `github-copilot.token.json`
- `openrouter-models.json`
- `auth-profiles.json`
- `auth-state.json`
- `exec-approvals.json`
- `workspace-state.json`
- 矩陣 `credentials*.json` 和 `recovery-key.json`
- `cron/runs/*.jsonl`
- `cron/jobs.json`
- `jobs-state.json`
- `device-pair-notify.json`
- `devices/pending.json`
- `devices/paired.json`
- `devices/bootstrap.json`
- `nodes/pending.json`
- `nodes/paired.json`
- `identity/device.json`
- `identity/device-auth.json`
- `push/web-push-subscriptions.json`
- `push/vapid-keys.json`
- `push/apns-registrations.json`
- `process-leases.json`
- `gateway-instance-id`
- `session-toggles.json`
- Memory-core `.dreams/events.jsonl`
- Memory-core `.dreams/session-corpus/`
- Memory-core `.dreams/daily-ingestion.json`
- Memory-core `.dreams/session-ingestion.json`
- Memory-core `.dreams/short-term-recall.json`
- Memory-core `.dreams/phase-signals.json`
- Memory-core `.dreams/short-term-promotion.lock`
- Skill Workshop `skill-workshop/<workspace>.json`
- Skill Workshop `skill-workshop/skill-workshop-review-*.json`
- Nostr `bus-state-*.json`
- Nostr `profile-state-*.json`
- `calls.jsonl`
- `known-users.json`
- `ref-index.jsonl`
- QQBot `session-*.json`
- BlueBubbles `bluebubbles/catchup/*.json`
- BlueBubbles `bluebubbles/inbound-dedupe/*.json`
- Telegram `update-offset-*.json`
- Telegram `sticker-cache.json`
- Telegram `*.telegram-messages.json`
- Telegram `*.telegram-sent-messages.json`
- Telegram `*.telegram-topic-names.json`
- Telegram `thread-bindings-*.json`
- iMessage `catchup/*.json`
- iMessage `reply-cache.jsonl`
- iMessage `sent-echoes.jsonl`
- Microsoft Teams `msteams-conversations.json`
- Microsoft Teams `msteams-polls.json`
- Microsoft Teams `msteams-sso-tokens.json`
- Microsoft Teams `msteams-delegated.json`
- Microsoft Teams `msteams-pending-uploads.json`
- Microsoft Teams `*.learnings.json`
- Matrix `bot-storage.json`
- Matrix `sync-store.json`
- Matrix `thread-bindings.json`
- Matrix `inbound-dedupe.json`
- Matrix `startup-verification.json`
- Matrix `storage-meta.json`
- Matrix `crypto-idb-snapshot.json`
- Discord `model-picker-preferences.json`
- Discord `command-deploy-cache.json`
- 沙盒註冊表分片 JSON 檔案
- 原生 hook relay `/tmp` 橋接 JSON 檔案
- `plugin-state/state.sqlite`
- 臨時 `openclaw-state.sqlite` 執行時 sidecar
- `tasks/runs.sqlite`
- `tasks/flows/registry.sqlite`
- `bindings/current-conversations.json`
- `restart-sentinel.json`
- `gateway-restart-intent.json`
- `gateway-supervisor-restart-handoff.json`
- `gateway.<hash>.lock`
- `qmd/embed.lock`
- `commands.log`
- `config-health.json`
- `port-guard.json`
- `settings/voicewake.json`
- `settings/voicewake-routing.json`
- `plugin-binding-approvals.json`
- `plugins/installs.json`
- `audit/file-transfer.jsonl`
- `audit/crestodian.jsonl`
- `crestodian/rescue-pending/*.json`
- `plugins/phone-control/armed.json`
- 記憶維基 `.openclaw-wiki/log.jsonl`
- 記憶維基 `.openclaw-wiki/state.json`
- 記憶維基 `.openclaw-wiki/locks/`
- 記憶維基 `.openclaw-wiki/source-sync.json`
- 記憶維基 `.openclaw-wiki/import-runs/*.json`
- 記憶維基 `.openclaw-wiki/cache/agent-digest.json`
- 記憶維基 `.openclaw-wiki/cache/claims.jsonl`
- ClawHub `.clawhub/lock.json`
- ClawHub `.clawhub/origin.json`
- Browser profile decoration `.openclaw-profile-decorated`
- `SessionManager.open(...)` 檔案支援的會話開啟器
- `SessionManager.listAll(...)` 和 `TranscriptSessionManager.listAll(...)`
  文字記錄列表外觀
- `SessionManager.forkFromSession(...)` 和
  `TranscriptSessionManager.forkFromSession(...)` 文字記錄分支外觀
- `SessionManager.newSession(...)` 和 `TranscriptSessionManager.newSession(...)`
  可變會話替換外觀
- `SessionManager.createBranchedSession(...)` 和
  `TranscriptSessionManager.createBranchedSession(...)` 分支會話外觀

該禁令應允許測試建立舊版 fixture，並允許遷移程式碼讀取/匯入/移除舊版檔案來源。未發布的 SQLite 側車檔案仍維持禁令，且不獲得 doctor 匯入許可。

## 完成標準

- 執行階段資料與快取寫入應導向全域或代理的 SQLite 資料庫。
- Runtime 不再寫入工作階段索引、transcript JSONL、sandbox registry JSON、task sidecar SQLite 或 plugin-state sidecar SQLite。未交付的 task 和 plugin-state sidecar SQLite 匯入器已被刪除。
- 舊版檔案匯入僅限 doctor 使用。
- 備份會產生一個包含精簡 SQLite 快照和完整性證明的封存檔。
- Agent workers 可以使用磁碟、VFS scratch 或實驗性的 VFS-only 儲存來執行。
- Config 和明確的 credential 檔案仍是唯一預期的持久化非資料庫控制檔案。
- Repo 檢查可防止重新引入舊版的 runtime 檔案存放區。
