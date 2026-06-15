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
- 目前共享表格包括 `agent_databases`、
  `auth_profile_stores`、`auth_profile_state`、
  `plugin_state_entries`、`plugin_blob_entries`、`media_blobs`、
  `skill_uploads`、`capture_sessions`、`capture_events`、`capture_blobs`、
  `sandbox_registry_entries`、`cron_run_logs`、`cron_jobs`、`commitments`、
  `delivery_queue_entries`、`model_capability_cache`、
  `workspace_setup_state`、`native_hook_relay_bridges`、
  `current_conversation_bindings`、`plugin_binding_approvals`、
  `tui_last_sessions`、`acp_sessions`、`acp_replay_sessions`、
  `acp_replay_events`、`task_runs`、`task_delivery_state`、`flow_runs`、
  `subagent_runs`、`migration_runs` 和 `backup_runs`。
- 任意外掛程式擁有的狀態不會獲得主機擁有的類型化表格。已安裝
  的外掛程式使用 `plugin_state_entries` 來存放版本控制的 JSON 載荷，並使用
  `plugin_blob_entries` 來存放位元組，包含命名空間/鍵擁有權、TTL 清理、
  備份和外掛程式遷移記錄。當主機擁有查詢合約時，主機擁有的外掛程式協調狀態仍然
  可以擁有類型化表格，例如 `plugin_binding_approvals`。
- 外掛程式遷移是對外掛程式擁有命名空間的資料遷移，而非主機
  架構遷移。外掛程式可以透過遷移提供者遷移自己的版本控制狀態/blob
  條目，而主機會在一般遷移帳本中記錄來源/執行狀態。除非主機本身
  正在接管新的跨外掛程式合約，否則新外掛程式安裝不需要變更
  `openclaw-state-schema.sql`。
- `src/state/openclaw-agent-db.ts` 開啟
  `agents/<agentId>/agent/openclaw-agent.sqlite`，在全域
  DB 中註冊資料庫，並擁有代理程式本機的 session、transcript、VFS、artifact、cache
  和 memory-index 資料表。共享的 runtime 探索現在讀取生成的型別化
  `agent_databases` 註冊表，而不是在每個呼叫
  站點重新實作該查詢。
- 全域和每個代理程式的資料庫會記錄一個 `schema_meta` 資料列，其中包含資料庫角色、
  schema 版本、時間戳記，以及代理程式資料庫的代理程式 ID。佈局仍然保持
  在 `user_version = 1`，因為這個 SQLite schema 尚未發布。
- 每個代理程式的 session 身份現在具有一個標準的 `sessions` 根資料表，以
  `session_id` 為鍵值，並具有 `session_key`、`session_scope`、`account_id`、
  `primary_conversation_id`、時間戳記、顯示欄位、model 中繼資料、
  harness ID 以及 parent/spawn 連結作為可查詢欄位。`session_routes`
  是從 `session_key` 到目前
  `session_id` 的唯一有效路由索引，因此路由鍵可以移動到新的持久 session，而
  不會讓熱讀取在重複的 `sessions.session_key` 資料列之間選擇。舊的
  `session_entries.entry_json` 相容性酬載透過外鍵掛在
  持久的 `session_id` 根上；它不再是 session
  唯一的 schema 層級表示法。
- 每個代理的外部對話身分也是關聯式的：
  `conversations` 儲存正規化的提供者/帳戶/對話身分，而
  `session_conversations` 將一個 OpenClaw 會話連結到一或多個外部
  對話。這涵蓋了共享主 DM 會話，其中多個對等端可以
  故意映射到同一個會話，而無需在 `session_key` 中造假。SQLite 也會
  強制執行自然提供者身分的唯一性，因此相同的
  channel/account/kind/peer/thread 元組無法跨對話 id 分叉。
  共享主直接對等端以 `participant` 角色連結，因此一個
  OpenClaw 會話可以代表多個外部 DM 對等端，而無需將
  舊的對等端降級為模糊的相關資料列。`sessions.primary_conversation_id` 仍然
  指向當前的類型化遞送目標。封閉的路由/狀態資料行
  是由 SQLite `CHECK` 約束強制執行，而不僅僅依賴
  TypeScript 聯集。
  執行時期會話投影會在應用類型化會話/對話
  資行之前，從 `session_entries.entry_json` 清除相容性路由陰影，因此過時的 JSON
  承載無法復甦遞送目標。
  子代理通知路由同樣需要類型化的 SQLite 遞送上下文；
  它不再回退到相容性 `SessionEntry` 路由欄位。
  閘道 `chat.send` 明確遞送繼承讀取類型化的 SQLite
  遞送上下文，而不是 `origin`/`last*` 相容性欄位。
  `tools.effective` 同樣從類型化的
  SQLite 遞送/路由資料列衍生 provider/account/thread 上下文，而不是過時的 `last*` 會話項目陰影。
  系統事件提示上下文從類型化遞送欄位重建 channel/to/account/thread 欄位，
  而不是 `origin` 陰影。
  共享的 `deliveryContextFromSession` 輔助程式和會話到對話
  映射器現在完全忽略 `SessionEntry.origin`；只有類型化遞送欄位
  和關聯式對話資料列可以建立熱路由身分。
  執行時期會話項目正規化會在持久化或
  投射 `entry_json` 之前剝離 `origin`，並且輸入元資料會寫入類型化的 channel/chat
  欄位加上關聯式對話資料列，而不是建立新的來源
  陰影。
- 轉錄事件、轉錄快照和軌跡執行時事件現在引用規範的每個代理 `sessions` 根，並在會話刪除時級聯。轉錄身份/冪等行繼續從確切的轉錄事件行級聯。
- 記憶核心索引現在使用顯式的代理數據庫表 `memory_index_meta`、`memory_index_sources`、`memory_index_chunks` 和 `memory_embedding_cache`；可選的 FTS/向量側索引使用相同的 `memory_index_*` 前綴，而不是通用的 `meta`、`files`、`chunks` 或 `chunks_vec` 表。`memory_index_sources` 以 `(source_kind, source_key)` 為鍵並帶有可選的 `session_id` 所有權，因此當會話被刪除時，源自會話的源和塊會級聯刪除。緩存的塊嵌入存儲為 Float32 SQLite BLOB，而不是 JSON 文本數組。這些表是派生/搜索緩存，而不是規範的轉錄存儲；它們可以被刪除並從 `sessions`、`transcript_events` 和記憶工作區文件重建。
- 子代理運行恢復狀態現在位於類型化的共享 `subagent_runs` 行中，並帶有索引的子代理、請求者和控制器會話鍵。舊的 `subagents/runs.json` 文件僅作為醫生遷移輸入。
- 當前對話綁定現在位於類型化的共享 `current_conversation_bindings` 行中，以規範化的對話 ID 為鍵，目標代理/會話列、對話類型、狀態、過期時間和元數據存儲為關系列，而不是重複的不透明綁定記錄。持久綁定鍵包括規範化的對話類型，因此直接/群組/頻道引用不會衝突，並且 SQLite 拒絕無效的綁定類型/狀態值。舊的 `bindings/current-conversations.json` 文件僅作為醫生遷移輸入。
- Delivery queue recovery 現在會將 channel、target、
  account、session、retry、error、platform-send 和 recovery state 的類型化佇列欄位
  覆蓋在 replay JSON 上。`entry_json` 保留了 replay payloads、hooks 和 formatting
  payload，但類型化欄位是熱佇列路由/狀態的依據。
- TUI last-session restore 指標現在位於以 TUI 連線/會話範圍雜湊為鍵值的類型化 shared
  `tui_last_sessions` 資料列中。
  舊的 TUI JSON 檔案僅作為 doctor 遷移的輸入。
- 預設 TTS 偏好設定現在位於以 `speech-core`
  外掛為鍵值的 shared plugin-state SQLite 資料列中。舊的 `settings/tts.json` 檔案僅作為 doctor 遷移
  的輸入；執行時環境不再讀取或寫入 TTS 偏好設定 JSON 檔案，且
  舊版路徑解析器位於 doctor 遷移模組中。
- Secret target 中繼資料現在談論的是 stores，而不是假設每個
  憑證 target 都是一個設定檔。`openclaw.json` 仍是 config store；
  auth-profile targets 使用類型化的 SQLite `auth_profile_stores` 資料列，並將
  provider-shaped credentials 保留為 JSON payloads。
- Secret 審計不再掃描已停用的個別 agent `auth.json` 檔案。Doctor 負責
  警告、匯入和移除該舊版檔案。
- 舊版 auth profile 路徑輔助程式現在位於 doctor legacy code 中。核心 auth
  profile 路徑輔助程式公開的是 SQLite auth-store 身份和顯示位置，
  而非 `auth-profiles.json` 或 `auth-state.json` 執行時路徑。
- Subagent run recovery 和 OpenRouter 模型功能快取執行時模組
  現在將 SQLite 快照讀取器/寫入器與僅供 doctor 使用的舊版 JSON
  匯入輔助程式分開。OpenRouter 功能使用 `provider_id = "openrouter"` 下的類型化通用
  `model_capability_cache` 資料列，而不是
  一個不透明的快取 blob 或特定於提供商的主機表格。Subagent run
  `taskName` 儲存在類型化的 `subagent_runs.task_name` 欄位中；
  `payload_json` 副本是重播/偵錯資料，不是熱顯示或
  查詢欄位的來源。
- `src/agents/filesystem/virtual-agent-fs.sqlite.ts` 在代理資料庫 `vfs_entries` 表上實作了 SQLite VFS。目錄讀取、遞迴匯出、刪除和重新命名使用索引的 `(namespace, path)` 前綴範圍，而不是掃描整個命名空間或依賴 `LIKE` 路徑匹配。
- `src/agents/runtime-worker.entry.ts` 為工作程序建立每次執行的 SQLite VFS、工具產出、執行產出和範圍快取儲存。
- 工作區啟動完成標記現在位於以已解析工作區路徑為鍵的類型化共用 `workspace_setup_state` 列中，而不是 `.openclaw/workspace-state.json`；執行時不再讀取或重寫舊版工作區標記，且輔助 API 不再僅為了推導儲存身份而傳遞虛假的 `.openclaw/setup-state` 路徑。
- 執行核准現在位於類型化共用 SQLite `exec_approvals_config` 單例列中。Doctor 匯入舊版 `~/.openclaw/exec-approvals.json`；執行時寫入不再建立、重寫或將該檔案報告為其作用中的儲存位置。macOS 伴隨應用程式讀取和寫入相同的 `state/openclaw.sqlite` 表列；它僅在磁碟上保留 Unix 提示通訊端，因為那是 IPC，而非持久執行時狀態。
- 裝置身份、裝置驗證和啟動執行時模組現在將其 SQLite 快照讀取器/寫入器與僅供 Doctor 使用的舊版 JSON 匯入輔助程式分開。裝置身份使用類型化的 `device_identities` 列，裝置驗證權杖使用類型化的 `device_auth_tokens` 列。裝置驗證寫入根據裝置/角色協調列，而不是截斷權杖表，且執行時不再透過舊的整個儲存介面卡路由單一權杖更新。舊版 version-1 JSON 載荷僅作為 Doctor 匯入/匯出形狀存在。
- GitHub Copilot 權杖交換快取使用 `github-copilot/token-cache/default` 下的共用 SQLite 外掛狀態表。這是提供者擁有的快取狀態，因此它有意不新增主機結構描述表。
- GitHub Copilot 壓縮不再寫入 `openclaw-compaction-*.json` 工作區側車檔案。線束為追蹤的 SDK 會話呼叫 SDK 歷史壓縮 RPC，而 OpenClaw 將持久的會話/逐字稿狀態保留在 SQLite 中，而不是相容性標記檔案。
- 共用的 Swift 執行時期（`OpenClawKit`）對於裝置身分與裝置驗證使用相同的
  `state/openclaw.sqlite` 資料列。macOS app
  協助程式匯入共用的 SQLite 協助程式，而不擁有第二個 JSON 或
  SQLite 路徑。一個遺留的舊版 `identity/device.json` 會阻擋身分的建立，
  直到 doctor 將其匯入 SQLite 為止，這與 TypeScript 和 Android
  的啟動閘門一致。
- Android 裝置身分使用與 TypeScript 相容的相同金鑰素材，
  儲存在具型別的 `state/openclaw.sqlite#table/device_identities` 資料列中。它
  永不讀取或寫入 `openclaw/identity/device.json`；一個遺留的舊版檔案會
  阻擋啟動，直到 doctor 將其匯入 SQLite 為止。
- Android 快取的裝置驗證權杖也使用具型別的
  `state/openclaw.sqlite#table/device_auth_tokens` 資料列，並與 TypeScript 和 Swift 共用相同的
  version-1 權杖語意。執行時期不再讀取 `SecurePrefs`
  `gateway.deviceToken*` 相容性金鑰；這些僅屬於遷移/doctor
  邏輯。
- Android 通知的 recent-package 歷史記錄使用具型別的
  `android_notification_recent_packages` 資料列。執行時期不再遷移或
  讀取舊的 SharedPreferences CSV 金鑰。
- 當存在舊版 `identity/device.json`、
  SQLite 身分資料列無效，或無法開啟 SQLite 身分
  存儲時，裝置身分建立會失敗封閉。Doctor 會先匯入並移除該檔案，因此執行時期
  啟動無法在遷移前靜默輪換配對身分。
- 裝置身分選擇是一個 SQLite 資料列金鑰，而不是 JSON 檔案定位器。測試
  和閘道協助程式會傳遞明確的身分金鑰；只有 doctor 遷移和
  失敗封閉的啟動閘門知道已退役的 `identity/device.json` 檔名。
- 工作階段重設相容性現在位於 doctor 設定遷移中：
  `session.idleMinutes` 被移至 `session.reset.idleMinutes`，
  `session.resetByType.dm` 被移至 `session.resetByType.direct`，而
  執行時期重設政策僅讀取正式的重設金鑰。
- 舊版配置相容性現在位於 `src/commands/doctor/` 下。正常的 `readConfigFileSnapshot()` 驗證不會匯入 doctor 舊版偵測器或標註舊版問題；`runDoctorConfigPreflight()` 會為 doctor 修復/報告新增這些問題。doctor 配置流程會匯入 `src/commands/doctor/legacy-config.ts`，而舊的 OAuth profile-id 修復則位於 `src/commands/doctor/legacy/oauth-profile-ids.ts` 下。
- 非 doctor 指令不會自動執行舊版配置修復。例如，`openclaw update --channel` 現在會在遇到無效的舊版配置時失敗，並要求使用者執行 doctor，而不是靜默地匯入 doctor 遷移程式碼。
- Web 推送、APNs、Voice Wake、更新檢查和配置健康狀態現在對訂閱、VAPID 金鑰、節點註冊、觸發器資料列、路由資料列、更新通知狀態和配置健康狀態條目使用類型化的共享 SQLite 表，而不是使用整個不透明的 JSON Blob。Web 推送和 APNs 快照寫入現在透過主鍵協調訂閱/註冊，而不是清除它們的表；配置健康狀態則透過配置路徑執行相同操作。它們的執行時模組將 SQLite 快照讀取器/寫入器與僅限 doctor 的舊版 JSON 匯入輔助程式分開。
- 節點主機配置現在在共享 SQLite 資料庫中使用類型化的單例資料列；doctor 在正常執行時使用之前會匯入舊的 `node.json` 檔案。
- 裝置/節點配對、通道配對、通道允許列表和引導狀態現在使用類型化的 SQLite 資料列，而不是整個不透明的 JSON Blob。外掛綁定核准和 cron 任務狀態遵循相同的拆分：執行時模組公開 SQLite 支援的操作和中性的快照輔助程式，而配對/引導以及外掛綁定核准快照寫入透過主鍵協調資料列而不是截斷表，同時 doctor 透過 `src/commands/doctor/legacy/*` 模組匯入/移除舊的 JSON 檔案。
- 已安裝的外掛記錄現在位於 SQLite 已安裝外插件引中。執行時配置讀取/寫入不再遷移或保留舊的 `plugins.installs` authored-config 資料；doctor 會在正常執行時使用之前將該舊版配置形狀匯入 SQLite。
- QQBot 憑證復原快照現已位於 SQLite 外掛狀態中的 `qqbot/credential-backups` 下。Runtime 不再寫入 `qqbot/data/credential-backup*.json`；doctor 會匯入並將這些舊版備份檔案與其他 QQBot 狀態輸入一併移除。
- Gateway 重新載入計劃會在內部的 `installedPluginIndex.installRecords.*` diff 命名空間下比較 SQLite 已安裝外掛索引快照。Runtime 重新載入決策不再將這些資料列包裝在假的 `plugins.installs` 設定物件中。
- Matrix 具名帳號憑證升級不再於 Runtime 讀取期間發生。當可以解析單一/預設 Matrix 帳號時，Doctor 負責處理舊的頂層 `credentials/matrix/credentials.json` 重新命名。
- Core pairing 和 cron Runtime 模組不再匯出舊版 JSON 路徑建構器。Doctor 擁有的舊版模組會建構 `pending.json`、`paired.json`、`bootstrap.json` 和 `cron/jobs.json` 來源路徑，僅用於匯入測試和遷移。舊版 cron job-shape 正規化和 cron 執行紀錄匯入位於 `src/commands/doctor/legacy/cron*.ts` 下。
- `src/commands/doctor/legacy/runtime-state.ts` 會從 doctor 將舊版 JSON 狀態檔案（包括節點主機設定）匯入 SQLite。新的舊版檔案匯入器仍位於 `src/commands/doctor/legacy/` 下。
- `src/commands/doctor/state-migrations.ts` 會將舊版 `sessions.json` 和 `*.jsonl` 逐字稿直接匯入 SQLite 並移除成功的來源。它不再透過 `agents/<agentId>/sessions/*.jsonl` 暫存根層級舊版逐字稿，也不在匯入前建立標準 JSONL 目標。
- 狀態完整性 doctor 檢查不再掃描舊版 session 目錄或提供刪除孤立 JSONL 的選項。舊版逐字稿檔案僅作為遷移輸入，且遷移步驟負責匯入及來源移除。
- 舊版 sandbox registry 匯入位於 `src/commands/doctor/legacy/sandbox-registry.ts` 下；使用中的 sandbox registry 讀寫維持僅限 SQLite。
- 舊版 session 逐字稿健康狀況/匯入修復位於 `src/commands/doctor/legacy/session-transcript-health.ts` 下；Runtime 指令模組不再包含 JSONL 逐字稿解析或作用中分支修復程式碼。

已完成的整合/刪除重點：

- 外掛狀態現在使用共享的 `state/openclaw.sqlite` 資料庫。舊的分支本機 `plugin-state/state.sqlite` sidecar 匯入器已被移除，因為該 SQLite 版面配置從未發布。探測/測試輔助工具現在回報共享的 `databasePath`，而不是公開特定於外掛狀態的 SQLite 路徑。
- Task 和 Task Flow 執行時表格現在位於共享的 `state/openclaw.sqlite` 資料庫中，而不是 `tasks/runs.sqlite` 和 `tasks/flows/registry.sqlite`；舊的 sidecar 匯入器已被移除，原因同樣是因為該版本配置從未發布。
- `src/config/sessions/store.ts` 不再需要 `storePath` 來處理傳入中繼資料、路由更新或讀取 updated-at。命令持久化、CLI 會話清理、子代理程式深度、授權覆寫和文字記錄會話身分識別均使用代理程式/會話列 API。寫入操作會以樂觀衝突重試的方式作為 SQLite 列修補套用。
- 會話目標解析現在公開每個代理程式的資料庫目標，而非舊有的 `sessions.json` 路徑。共用閘道、ACP 中繼資料、doctor 路由修復和 `openclaw sessions` 會列舉 `agent_databases` 以及已設定的代理程式。
- 閘道會話路由現在使用 `resolveGatewaySessionDatabaseTarget`；傳回的目標攜帶 `databasePath` 和候選 SQLite 列鍵，而非舊有的會話存放區檔案路徑。
- 通道會話執行時類型現在公開 `{agentId, sessionKey}` 以進行 updated-at 讀取、傳入中繼資料和最後路由更新。舊的 `saveSessionStore(storePath, store)` 相容性類型已不復存在。
- 外掛執行時、擴充 API 和 `config/sessions` barrel 表面現在會將外掛程式碼引導至 SQLite 支援的會話列輔助程式。根函式庫相容性匯出 (`loadSessionStore`, `saveSessionStore`, `resolveStorePath`) 作為已棄用的填充程式保留給現有取用者。舊的 `resolveLegacySessionStorePath` 輔助程式已不復存在；舊有的 `sessions.json` 路徑建構現在僅限於遷移和測試裝置。
- `src/config/sessions/session-entries.sqlite.ts` 現在將標準會話條目儲存在個別代理的資料庫中，並具有層級讀取/更新/刪除修補支援。執行時期的更新/修補/刪除不再掃描大小寫變體或修剪舊版別名金鑰；doctor 擁有標準化權限。獨立的 JSON 匯入輔助程式已移除，遷移時會合併更新較新的資料列，而不是取代整個會話表格。公開的讀取/列表/載入輔助程式會從類型化的 `sessions` 和 `conversations` 資料列投影熱會話元資料；`entry_json` 是一個相容性/除錯影子，可能會過時或無效，而不會失去類型化的會話身分或傳遞內容。
- `src/config/sessions/delivery-info.ts` 現在從類型化的個別代理 `sessions` + `conversations` + `session_conversations` 資料列解析傳遞內容。它不再從 `session_entries.entry_json` 重建執行時期的傳遞身分；缺少類型化的對話資料列是 doctor 遷移/修復問題，而非執行時期的後備方案。
- 已儲存會話的重設決策現在優先使用類型化的 `sessions.session_scope`、`sessions.chat_type` 和 `sessions.channel` 元資料。`sessionKey` 解析僅保留用於指令目標上明確的執行緒/主題後綴；群組與直接重設的分類不再來自金鑰形狀。
- 會話列表/狀態顯示分類現在使用類型化的聊天元資料和閘道會話類型。它不再將 `session_key` 內的 `:group:` 或 `:channel:` 子字串視為持久的群組/直接事實。
- 靜默回覆策略選擇現在使用明確的對話類型或介面元資料。它不再從 `session_key` 子字串推斷直接/群組策略。
- 會話顯示模型解析現在接受來自 SQLite 會話資料庫目標的代理 ID，而不是從 `session_key` 中將其分割出來。
- Agent-to-agent announce target hydration 現在僅使用類型化的 `sessions.list`
  `deliveryContext`。它不再從舊版 `origin`、鏡像的 `last*` 欄位或 `session_key` 形狀中還原 channel/account/thread 路由。
- `sessions_send` thread-target 拒絕現在讀取類型化的 SQLite 路由
  元資料。它不再透過從目標鍵中解析 thread 後綴
  來拒絕或接受目標。
- Group-scoped tool policy 驗證現在會為目前或產生的 session 讀取類型化的 SQLite 對話
  路由。它不再透過解碼 `sessionKey` 來信任 group/channel
  身份；當沒有類型化的 session 資料行為其擔保時，呼叫者提供的 group id 會被捨棄。
- Channel model override 匹配現在會使用明確的 group 和 parent
  對話元資料。它不再從 `parentSessionKey` 解碼 parent 對話 id。
- Stored model override 繼承現在需要來自類型化 session 語境的明確 parent session key。
  它不再從 `sessionKey` 中的 `:thread:` 或 `:topic:` 後綴衍生 parent 覆寫。
- 舊的 session thread-info 包裝器和 loaded-plugin thread 解析器已經消失；
  沒有執行時代碼匯入 `config/sessions/thread-info`。
- Channel 對話助手不再公開 full-session-key 解析
  橋樑。Core 仍然透過 `resolveSessionConversation(...)` 正規化提供者擁有的原始對話 id，
  但它不會從 `sessionKey` 重建路由事實。
- Completion delivery、send policy 和 task 維護不再從 `session_key` 形狀衍生 chat
  類型。舊的 chat-type key 解析器已被刪除；
  這些路徑需要類型化的 session 元資料、類型化的 delivery 語境，或
  明確的 delivery 目標詞彙。
- Session list/status、診斷、approval account 綁定、TUI heartbeat
  過濾和使用摘要不再從 `SessionEntry.origin` 挖掘
  provider/account/thread/display 路由。唯一剩餘的執行時期
  `origin` 讀取是非 session 概念或目前回合的 delivery 物件。
- 審批請求的原生對話查詢現在讀取類型化的每代理會話路由行。它不再從 `sessionKey` 解析通道/群組/執行緒對話身分；缺少類型化中繼資料是一個遷移/修復問題。
- 閘道會話變更/聊天/會話事件酬載不再回顯 `SessionEntry.origin` 或 `last*` 路由陰影；用戶端接收類型化的 `channel`、`chatType` 和 `deliveryContext`。
- 心跳傳遞解析現在可以直接接收類型化的 SQLite `deliveryContext`，並且心跳執行時會傳遞每代理會話傳遞行，而不是依賴當前路由的相容性 `session_entries` 陰影。
- Cron 隔離代理傳遞目標解析也會在回退到相容性項目酬載之前，從類型化的每代理會話傳遞行填充其當前路由。
- 子代理公告來源解析現在透過 `loadRequesterSessionEntry` 傳遞類型化的請求者會話傳遞上下文，並且優先使用該行，而不是相容性 `last*`/`deliveryContext` 陰影。
- 輸入會話中繼資料更新現在會先針對類型化的每代理傳遞行進行合併；舊的 `SessionEntry` 傳遞欄位僅在不存在類型化對話行時作為回退方案。
- 重新啟動/更新傳遞提取現在讓類型化的 SQLite 傳遞 `threadId` 優先於從 `sessionKey` 解析的主題/執行緒片段；解析僅是傳統執行緒形狀金鑰的回退方案。
- Hook 代理上下文頻道 ID 現在優先使用類型化的 SQLite 對話身分，然後是明確的訊息中繼資料。它們不再從 `sessionKey` 解析提供者/群組/頻道片段。
- Gateway `chat.send` 外部路由繼承現在讀取類型化的 SQLite 會話
  路由元數據，而不是從 `sessionKey` 片段推斷
  頻道/直接/群組範圍。僅當類型化會話頻道和聊天類型與
  儲存的遞送內容相符時，頻道範圍的會話才會繼承；
  shared-main 會話保持其更嚴格的 CLI/no-client-metadata 規則。
- 重啟哨兵喚醒和續傳路由現在在將心跳喚醒或路由
  的代理人輪次續傳加入佇列之前，會讀取類型化的 SQLite
  遞送/路由資料列。它不再從會話項目 JSON 映射
  重建遞送內容。
- Gateway `tools.effective` 內容解析現在會讀取類型化的 SQLite
  遞送/路由資料列，以取得提供者、帳戶、目標、執行緒和回覆模式
  輸入。它不再從過時的 `session_entries.entry_json` 來源映射
  中恢復這些熱路由欄位。
- 即時語音諮詢路由現在會從類型化的每個代理人 SQLite
  會話資料列解析父項/呼叫遞送。在選擇嵌入式代理人
  訊息路由時，它不再退回到相容性 `SessionEntry.deliveryContext` 映射。
- ACP 生成心跳中繼和父資料流路由現在會從類型化的 SQLite
  會話資料列讀取父項遞送。它們不再從相容性會話項目映射
  重建父項遞送內容。
- 會話遞送路由保留現在遵循類型化的聊天元數據和
  持久化的遞送欄位。它不再從 `sessionKey` 提取頻道提示、
  直接/主標記或執行緒形狀；內部網路聊天路由僅當 SQLite
  已經擁有該會話的類型化/持久化遞送身分時，才會繼承外部目標。
- 一般會話遞送提取現在僅讀取確切的類型化 SQLite
  會話遞送資料列。它不再解析執行緒/主題後綴，或
  從執行緒形狀的金鑰退回到基礎會話金鑰。
- 回覆分派、重啟哨兵恢復和即時語音諮詢路由
  現在使用確切的類型化 SQLite 會話/對話資料列進行執行緒路由。
  它們不再通過解析執行緒形狀的會話金鑰來恢復執行緒 ID
  或基礎會話遞送內容。
- 嵌入式 PI 歷史限制現在針對提供者、聊天類型和對等身份使用類型化的 SQLite 會話路由投影（`sessions` + 主鍵 `conversations`）。它不再從 `sessionKey` 中解析提供者、DM、群組或執行緒形狀。
- Cron 工具傳遞推斷現在使用明確傳遞或僅使用當前類型化傳遞上下文。它不再從 `agentSessionKey` 解碼頻道、對等端、帳戶或執行緒目標。
- 執行時期會話行不再攜帶舊的 `lastProvider` 路由別名。輔助函式和測試使用類型化的 `lastChannel` 和 `deliveryContext` 欄位；doctor 遷移是唯一應轉換較舊路由別名或持久化 `origin` 陰影的地方。
- 逐字稿事件、VFS 行和工具成品行現在寫入 per-agent 資料庫。未發布的全局逐字稿檔案映射表已消失；doctor 改為在持久化遷移行中記錄舊版來源路徑。
- 執行時期逐字稿查找不再掃描 JSONL 位元組偏移量或探查舊版逐字稿檔案。Gateway 聊天/媒體/歷史路徑從 SQLite 讀取逐字稿行；會話 JSONL 現在僅是舊版 doctor 輸入，而不是執行時期狀態或匯出格式。
- 逐字稿父級和分支關係使用 SQLite 逐字稿標頭中的結構化 `parentTranscriptScope: {agentId, sessionId}` 元數據，而不是類似路徑的 `agent-db:...transcript_events...` 定位器字串。
- 逐字稿管理器契約不再公開隱式持久化 `create(cwd)` 或 `continueRecent(cwd)` 建構函式。持久化逐字稿管理器使用明確的 `{agentId, sessionId}` 範圍開啟；僅記憶體內管理器在測試和純逐字稿轉換中保持無範圍。
- 執行時期逐字稿儲存 API 解析 SQLite 範圍，而非檔案系統路徑。舊的 `resolve...ForPath` 輔助函式和未使用的 `transcriptPath` 寫入選項已從執行時期呼叫者中移除。
- 執行時期會話解析現在使用 `{agentId, sessionId}`，且不得為外部邊界衍生 `sqlite-transcript://<agent>/<session>` 字串。舊版絕對 JSONL 路徑僅作為 doctor 遷移輸入。
- Native hook relay direct-bridge 記錄現存在於以 relay id 為鍵的型別共用 `native_hook_relay_bridges` 資料列中。Runtime 不再為這些短暫的 bridge 記錄寫入 `/tmp` JSON 註冊表或不明的一般記錄。
- `runEmbeddedPiAgent(...)` 不再具有 transcript-locator 參數。準備好的 worker 描述符也省略了 transcript 定位器。Runtime 工作階段狀態和佇列中的後續執行改為攜帶 `{agentId, sessionId}`，而非衍生的 transcript 控制代碼。
- Embedded compaction 現在從 `agentId` 和 `sessionId` 取得 SQLite 範圍。Compaction hooks、context-engine 呼叫、CLI 委派和協定回覆不得接收衍生的 `sqlite-transcript://...` 控制代碼。Export/debug 程式碼可以從資料列具體化明確的使用者產出成果，但不提供通用的工作階段 JSONL 匯出路徑或將檔案名稱回傳給 runtime 身份。
- `/export-session` 從 SQLite 讀取 transcript 資料列，並僅寫入請求的獨立 HTML 檢視。嵌入式檢視器不再從這些資料列重建或下載工作階段 JSONL。
- Context-engine 委派不再解析 transcript 定位器來還原 agent 身份。準備好的 runtime 語境將解析出的 `agentId` 帶入內建的 compaction 配接器。
- Transcript 重寫和即時 tool-result 截斷現在透過 `{agentId, sessionId}` 讀取並持久化 transcript 狀態，且不會為 transcript-update 事件承載衍生暫時的定位器。
- Transcript-state 輔助介面不再具有基於定位器的 `readTranscriptState`、`replaceTranscriptStateEvents` 或 `persistTranscriptStateMutation` 變體。Runtime 呼叫者必須使用 `{agentId, sessionId}` API。Doctor import 會透過明確的檔案路徑讀取舊版檔案並寫入 SQLite 資料列；它不會遷移定位器字串。
- Runtime session-manager 契約不再公開 `open(locator)`、`forkFrom(locator)` 或 `setTranscriptLocator(...)`。持久化的 session manager 僅透過 `{agentId, sessionId}` 開啟；list/fork 輔助函式位於以行為導向的 session 和 checkpoint API 上，而非 transcript manager 外觀。
- Gateway transcript reader API 以範圍優先。它們接受 `{agentId, sessionId}`，並不接受可能意外成為 runtime identity 的位置性 transcript 定位器。主動的 transcript 定位器解析已消失；舊版來源路徑僅由 doctor import 程式碼讀取。
- Transcript 更新事件也以範圍優先。`emitSessionTranscriptUpdate` 不再接受純定位器字串，且監聽器透過 `{agentId, sessionId}` 進行路由，而無須解析處理代碼。
- Gateway session-message 廣播從 agent/session 範圍解析 session 金鑰，而非從 transcript 定位器。舊的 transcript-locator-to-session 金鑰解析器/快取已消失。
- Gateway session-history SSE 依據 agent/session 範圍篩選即時更新。它不再正規化 transcript 定位器候選、realpaths 或檔案形式的 transcript 身份來決定串流是否應接收更新。
- Session 生命週期掛鉤不再在 `session_end` 上衍生或公開 transcript 定位器。掛鉤消費者取得 `sessionId`、`sessionKey`、next-session id 和 agent 上下文；transcript 檔案不是生命週期契約的一部分。
- 重置掛鉤也不再衍生或公開 transcript 定位器。`before_reset` 載荷攜帶恢復的 SQLite 訊息以及重置原因，而 session 身份則保留在掛鉤上下文中。
- Agent harness 重置不再接受 transcript 定位器。重置分派由 `sessionId`/`sessionKey` 加上原因作為範圍。
- Agent 擴充功能 session 類型不再公開 `transcriptLocator`；擴充功能應使用 session 上下文和 runtime API，而非取得檔案形式的 transcript 身份。
- 外掛壓縮掛鉤不再公開文字紀錄定位器。掛鉤上下文已經攜帶會話身份，且文字紀錄讀取必須透過 SQLite 感知作用域的 API，而不是檔案形狀的控制代碼。
- `before_agent_finalize` 掛鉤不再公開 `transcriptPath`，包括原生掛鉤中繼酬載。最終處理掛鉤僅使用會話上下文。
- 閘道重設回應不再在傳回的項目上合成文字紀錄定位器。重設會建立 SQLite 文字紀錄資料列，傳回乾淨的會話項目，並將文字紀錄存取權留給感知作用域的讀取器。
- 嵌入式執行和壓縮結果不再為會話計算顯示文字紀錄定位器。自動壓縮僅更新作用中的 `sessionId`、壓縮計數器和權杖中繼資料。
- 嵌入式嘗試結果不再傳回 `transcriptLocatorUsed`，且 context-engine `compact()` 結果不再傳回文字紀錄定位器。執行時期重試迴圈僅接受後繼 `sessionId`。
- 傳遞鏡像文字紀錄附加結果不再傳回文字紀錄定位器。呼叫者會取得附加的 `messageId`；文字紀錄更新訊號使用 SQLite 作用域。
- 父會話分支輔助函式僅傳回分支的 `sessionId`。子代理程式準備會將子代理程式/會話作用域傳遞給引擎。
- CLI 執行器參數和歷史重新植入不再接受文字紀錄定位器。CLI 歷史讀取會從 `{agentId, sessionId}` 和會話金鑰上下文解析 SQLite 文字紀錄作用域。
- CLI 和嵌入式執行器測試裝置現在依會話 ID 植入和讀取 SQLite 文字紀錄資料列，而不是假設作用中的會話是 `*.jsonl` 檔案，或是透過執行時期參數傳遞 `sqlite-transcript://...` 字串。
- 會話工具結果防護事件從已知的會話作用域發出，即使記憶體內管理員沒有衍生的定位器。其測試不再偽造作用中的 `/tmp/*.jsonl` 文字紀錄檔案。
- BTW 和壓縮檢查點輔助函式現在透過 SQLite 作用域讀取和分支文字紀錄資料列。檢查點中繼資料現在僅儲存會話 ID 和 leaf/entry ID；衍生的定位器不再寫入檢查點酬載中。
- Gateway transcript-key 查詢在協定邊界使用 SQLite transcript 範圍，且不再對 transcript 檔案名稱進行 realpath 或 stat。
- 自動壓縮的 transcript 輪換會直接透過 SQLite transcript 存儲寫入後繼 transcript 列。Session 列僅保留後繼 session 的身分識別，而不是持久的 JSONL 路徑或持久化的定位器。
- 嵌入式 context-engine 壓縮使用 SQLite 命名的 transcript 輪換輔助程式。輪換測試不再建構 JSONL 後繼路徑，也不會將作用中的 session 模型化為檔案。
- 受控的傳出圖像保留機制會根據 SQLite transcript 統計資料來設定其 transcript-message 快取的鍵，而不是使用檔案系統的 stat 呼叫。
- Runtime session 鎖定和獨立的舊版 `.jsonl.lock` doctor 通道已被移除。
- Microsoft Teams runtime barrel 和公開外掛 SDK 不再重新匯出舊的檔案鎖定輔助程式；持久的外掛狀態路徑由 SQLite 支援。
- Session 年齡/計數修剪和明確的 session 清理已被移除。Doctor 擁有舊版匯入功能；過時的 session 會被明確重置或刪除。
- Doctor 完整性檢查不再將舊版 JSONL 檔案計為 SQLite session 列的有效作用中 transcript。作用中 transcript 的健全性僅限於 SQLite；舊版 JSONL 檔案會被回報為遷移/孤立清理的輸入。
- Doctor 不再將 `agents/<agent>/sessions/` 視為所需的 runtime 狀態。它僅在該目錄已存在時才進行掃描，作為舊版匯入或孤立清理的輸入。
- Gateway `sessions.resolve`、session 修補/重置/壓縮路徑、子代理程式生成、快速中止、ACP 中繼資料、心跳隔離 session 和 TUI 修補不再作為正常 runtime 工作的副作用來遷移或修剪舊版 session 鍵。
- CLI 命令 session 解析現在會返回擁有的 `agentId` 而非 `storePath`，並且不再在正常的 `--to` 或 `--session-id` 解析期間複製舊版主 session 列。舊版主列的正規化僅屬於 doctor 的職責。
- Runtime subagent depth resolution no longer reads `sessions.json` or JSON5
  session stores. It reads SQLite `session_entries` by agent id, and legacy
  depth/session metadata can only enter through the doctor import path.
- Auth profile session overrides persist through direct `{agentId, sessionKey}`
  row upserts instead of lazy-loading a file-shaped session-store runtime.
- Auto-reply verbose gating and session update helpers now read/upsert SQLite
  session rows by session identity and no longer require a legacy store path
  before touching persisted row state.
- Command-run session metadata helpers now use entry-oriented names and module
  paths; the old `session-store` command helper surface has been removed.
- Bootstrap header seeding and manual compaction boundary hardening now mutate
  SQLite transcript rows directly. Runtime callers pass session identity, not
  writable `.jsonl` paths.
- Silent session-rotation replay copies recent user/assistant turns by
  `{agentId, sessionId}` from SQLite transcript rows. It no longer accepts
  source or target transcript locators.
- Fresh runtime session rows no longer store transcript locators. Callers use
  `{agentId, sessionId}` directly; export/debug commands can choose output file
  names when they materialize rows.
- Starting a new persisted transcript session now always opens SQLite rows by
  scope. The session manager no longer reuses a previous file-era transcript
  path or locator as the identity for the new session.
- Persisted transcript sessions use the explicit
  `openTranscriptSessionManagerForSession({agentId, sessionId})` API. The old
  static `SessionManager.create/openForSession/list/forkFromSession` facades are
  gone so tests and runtime code cannot accidentally recreate file-era session
  discovery.
- Plugin runtime no longer exposes `api.runtime.agent.session.resolveTranscriptLocatorPath`;
  plugin code uses SQLite row helpers and scope values.
- The public `session-store-runtime` SDK surface now only exports session row
  and transcript row helpers. Raw SQLite database open/path and close/reset
  helpers live in the focused `sqlite-runtime` SDK surface, so plugin tests no
  longer pull the deprecated broad testing barrel for database cleanup.
- 舊版 `.jsonl` 軌跡/檢查點檔名分類器現在位於
  doctor legacy session-file 模組中。核心會話驗證不再匯入
  file-artifact 輔助工具來決定正常的 SQLite 會話 ID。
- 主動記憶體阻斷子代理執行現在會使用 SQLite 記錄列，而不是
  在插件狀態下建立暫存或持續存在的 `session.jsonl` 檔案。舊的
  `transcriptDir` 選項已被移除。
- 一次性 slug 生成和 Crestodian 規劃器執行會使用 SQLite 記錄列，
  而不是建立暫存的 `session.jsonl` 檔案。
- `llm-task` 輔助執行和隱藏承諾提取也會使用 SQLite
  記錄列，因此這些僅模型的輔助會話不再會建立
  暫時的 JSON/JSONL 記錄檔案。
- `TranscriptSessionManager` 現在只是一個已開啟的 SQLite 記錄範圍。
  執行時代碼使用 `openTranscriptSessionManagerForSession({agentId,
sessionId})` 來開啟它；建立、分支、繼續、列出和分支流程現在位於
  其所屬的 SQLite 列輔助工具中，而不是靜態管理器外觀。
  Doctor/import/debug 代碼在執行階段會話管理器之外處理顯式的舊版來源檔案。
- 過時的 `SessionManager.newSession()` 和
  `SessionManager.createBranchedSession()` 外觀方法已被移除。新的
  會話和記錄後代是由其所屬的 SQLite 工作流程所建立，而不是將已開啟的管理器
  變異為不同的持續性會話。
- 父記錄分支決策和分支建立不再接受
  `storePath` 或 `sessionsDir`；它們使用 `{agentId, sessionId}` SQLite
  記錄範圍，而不是保留的檔案系統路徑元資料。
- Memory-host 不再匯出空操作會話目錄記錄
  分類輔助工具；記錄篩選現在會在條目建構期間從 SQLite 列
  元資料衍生。
- Memory-host 和 QMD 會話匯出測試使用 SQLite 記錄範圍。舊的
  `agents/<agentId>/sessions/*.jsonl` 路徑僅在測試有意證明
  doctor/import/export 相容性時才會被涵蓋。
- QA-lab 原始會話檢查現在透過閘道使用 `sessions.list`
  而不是讀取 `agents/qa/sessions/sessions.json`；MSteams 回饋
  會直接附加到 SQLite 轉錄，而不會偽造 JSONL 路徑。
- 共用的輸入通道輪次現在攜帶 `{agentId, sessionKey}` 而非
  舊有的 `storePath`。LINE、WhatsApp、Slack、Discord、Telegram、Matrix、Signal、
  iMessage、BlueBubbles、Feishu、Google Chat、IRC、Nextcloud Talk、Zalo、
  Zalo Personal、QA Channel、Microsoft Teams、Mattermost、Synology Chat、Tlon、
  Twitch 和 QQBot 的記錄路徑現在會讀取 updated-at 元資料，並透過 SQLite 身份
  記錄輸入會話資料列。
- 轉錄定位器持續性已從作用中的會話資料列中移除。
  `resolveSessionTranscriptTarget` 會傳回 `agentId`、`sessionId` 和選用的
  主題元資料；doctor 是唯一匯入舊版轉錄檔案名稱的程式碼。
- 執行時期轉錄標頭從 SQLite 版本 `1` 開始。舊的 JSONL V1/V2/V3
  形狀升級僅存在於 doctor 匯入中，並會在儲存資料列之前將匯入的標頭正規化為
  目前的 SQLite 轉錄版本。
- 資料庫優先守衛現在禁止 `SessionManager.listAll` 和
  `SessionManager.forkFromSession`；會話列出和 fork/restore 工作流程
  必須保持在資料列/範圍 SQLite API 上。
- 該守衛也禁止在 doctor/import 程式碼之外使用舊版轉錄 JSONL 剖析/active-branch 修復協助程式
  名稱，因此執行時期無法長出第二條舊版轉錄移轉路徑。
- 嵌入式 PI 執行會拒絕傳入的轉錄控制代碼。它們會在啟動 worker 之前以及嘗試
  觸碰轉錄狀態之前使用 SQLite `{agentId, sessionId}` 身份。過時的 `/tmp/*.jsonl` 輸入無法選取
  執行時期寫入目標。
- 快取追蹤、Anthropic 載荷、原始串流和診斷時間軸記錄現在寫入類型化的 SQLite `diagnostic_events` 資料列。Gateway 穩定性套組現在寫入類型化的 SQLite `diagnostic_stability_bundles` 資料列。舊的 `diagnostics.cacheTrace.filePath`、`OPENCLAW_CACHE_TRACE_FILE`、`OPENCLAW_ANTHROPIC_PAYLOAD_LOG_FILE` 和 `OPENCLAW_DIAGNOSTICS_TIMELINE_PATH` JSONL 覆蓋路徑已被移除，且正常的穩定性擷取不再寫入 `logs/stability/*.json` 檔案。
- Cron 持久性現在協調 SQLite `cron_jobs` 資料列，而不是在每次儲存時刪除/重新插入整個工作資料表。外掛目標回寫會直接更新相符的 cron 資料列，並將運行時 cron 狀態保持在同一個狀態資料庫交易中。
- Cron 運行時呼叫者現在使用穩定的 SQLite cron 存儲金鑰。舊的 `cron.store` 路徑僅作為 doctor 匯入輸入；生產環境 gateway、工作維護、狀態、執行紀錄和 Telegram 目標回寫路徑使用 `resolveCronStoreKey`，且不再對金鑰進行路徑正規化。Cron 狀態現在回報 `storeKey`，而不是舊的檔案形態 `storePath` 欄位。
- Cron 運行時載入和排程不再正規化舊的持久化工作形態，例如 `jobId`、`schedule.cron`、數字 `atMs`、字串布林值或遺失的 `sessionTarget`。Doctor 舊版匯入會在資料列插入 SQLite 之前負責這些修復工作。
- ACP spawn 不再解析或持久化逐字稿 JSONL 檔案路徑。Spawn 和執行緒綁定設定會直接持久化 SQLite 工作階段資料列，並將工作階段 id 作為保留的逐字稿識別碼。
- ACP 工作階段中繼資料 API 現在透過 `agentId` 讀取/列出/更新 SQLite 資料列，且不再將 `storePath` 作為 ACP 工作階段項目合約的一部分公開。
- 工作階段使用量計算和 gateway 使用量彙總現在僅透過 `{agentId, sessionId}` 解析逐字稿。成本/使用量快取和已發現工作階段摘要不再合成或回傳逐字稿定位器字串。
- Gateway 聊天附加、中止部分持久化、`/sessions.send` 以及網路聊天媒體文字記錄寫入現在直接透過 SQLite 文字記錄範圍進行附加。Gateway 文字記錄注入輔助程式不再接受 `transcriptLocator` 參數。
- SQLite 文字記錄探索現在僅列出文字記錄範圍和統計資料：`{agentId, sessionId, updatedAt, eventCount}`。已淘汰的 `listSqliteSessionTranscriptLocators` 相容性輔助程式和逐行 `locator` 欄位已被移除。
- 文字記錄修復執行階段現在僅公開 `repairTranscriptSessionStateIfNeeded({agentId, sessionId})`。舊的基於定位器 (locator-based) 的修復輔助程式已被刪除；doctor/debug 程式碼會讀取明確的原始檔案路徑，且永不遷移定位器字串。
- ACP 重播帳本執行階段現在會將每個工作階段的重播資料列儲存在共享 SQLite 狀態資料庫中，而不是 `acp/event-ledger.json`；doctor 會匯入並移除舊版檔案。
- Gateway 文字記錄讀取器輔助程式現在位於 `src/gateway/session-transcript-readers.ts`，而不是舊的 `session-utils.fs` 模組名稱。後援重試歷史記錄檢查現在是以 SQLite 文字記錄內容命名，而不是舊的檔案輔助程式介面。
- Gateway 注入聊天和壓縮輔助程式現在透過內部輔助程式 API 傳遞 SQLite 文字記錄範圍，而不是將值命名為文字記錄路徑或原始檔案。
- 啟動程序延續偵測現在透過 `hasCompletedBootstrapTranscriptTurn` 檢查 SQLite 文字記錄資料列；它不再公開檔案形狀的輔助程式名稱。
- Embedded-runner 測試現在會使用 SQLite 文字記錄身分識別，且開啟新的文字記錄管理員一律需要明確的 `sessionId`。
- 記憶體索引輔助程式現在全程使用 SQLite 文字記錄術語：主機匯出 `listSessionTranscriptScopesForAgent` 和 `sessionTranscriptKeyForScope`，目標同步佇列 `sessionTranscripts`，公開的工作階段搜尋命中會公開不透明的 `transcript:<agent>:<session>` 路徑，且內部 DB 來源金鑰是 `session:<session>` 位於 `source_kind='sessions'` 之下，而不是偽造的檔案路徑。
- 通用插件 SDK 持久性去重輔助程式不再公開檔案形狀的選項。呼叫者提供 SQLite 範圍金鑰，且持久性去重資料列位於共享插件狀態中。
- Microsoft Teams SSO 和委派的 OAuth 權杖已從鎖定的 JSON 檔案移至
  SQLite 外掛程式狀態。Doctor 會匯入 `msteams-sso-tokens.json` 和
  `msteams-delegated.json`，從酬載重建標準 SSO 權杖金鑰，
  並移除來源檔案。
- Matrix 同步快取狀態已從 `bot-storage.json` 移至
  SQLite 外掛程式狀態。Doctor 會匯入舊的原始或包裝同步酬載並移除
  來源檔案。使用中的 Matrix 和 QA Matrix 用戶端會傳遞 SQLite 同步儲存區根
  目錄，而不是偽造的 `sync-store.json` 或 `bot-storage.json` 路徑。
- Matrix 舊版加密移轉狀態已從
  `legacy-crypto-migration.json` 移至 SQLite 外掛程式狀態。Doctor 會匯入
  舊的狀態檔案；Matrix SDK IndexedDB 快照已從
  `crypto-idb-snapshot.json` 移至 SQLite 外掛程式 Blob。Matrix 復原金鑰和
  認證是 SQLite 外掛程式狀態資料列；其舊的 JSON 檔案僅為 Doctor
  移轉輸入來源。
- Memory Wiki 活動日誌現在使用 SQLite 外掛程式狀態，而非
  `.openclaw-wiki/log.jsonl`。Memory Wiki 移轉提供者會匯入舊的
  JSONL 日誌；Wiki markdown 和使用者 vault 內容保持檔案支援作為
  工作區內容。
- Memory Wiki 不再建立 `.openclaw-wiki/state.json` 或未使用的
  `.openclaw-wiki/locks` 目錄。如果較舊的 vault 仍有這些已淘汰的
  外掛程式中繼資料檔案，移轉提供者會將其移除。
- Crestodian 稽核項目現在使用核心 SQLite 外掛程式狀態，而非
  `audit/crestodian.jsonl`。Doctor 會匯入舊版 JSONL 稽核日誌並
  在成功匯入後將其移除。
- 設定寫入/觀察稽核項目現在使用核心 SQLite 外掛程式狀態，而非
  `logs/config-audit.jsonl`。Doctor 會匯入舊版 JSONL 稽核日誌並
  在成功匯入後將其移除。
- macOS 伴隨程式在編輯 `openclaw.json` 時，不再寫入應用程式本機 `logs/config-audit.jsonl` 或
  `logs/config-health.json` 副檔名檔案。設定
  檔案保持檔案支援，復原快照保留在設定檔旁邊，
  而持久的設定稽核/健康狀態屬於 Gateway SQLite 儲存區。
- Crestodian 救援待批准项現在改用核心 SQLite 插件狀態，而非 `crestodian/rescue-pending/*.json`。Doctor 會匯入舊版的待批准檔案，並在成功匯入後將其移除。
- Phone Control 暫時布防狀態現在使用 SQLite 插件狀態，而非 `plugins/phone-control/armed.json`。Doctor 會將舊版布防狀態檔案匯入到 `phone-control/arm-state` 命名空間並移除該檔案。
- Doctor 不再就地修復 JSONL 轉錄或建立備份 JSONL 檔案。它會將使用中的分支匯入 SQLite 並移除舊版來源。
- Session-memory hook 轉錄查詢使用 `{agentId, sessionId}` 僅限範圍的 SQLite 讀取。其輔助函式不再接受或推導轉錄定位器、舊版檔案讀取或檔案重寫選項。
- Codex app-server 對話綁定現在透過 OpenClaw 工作階段金鑰或明確的 `{agentId, sessionId}` 範圍來設定 SQLite 插件狀態的索引鍵。它們不得保留轉錄路徑的後備綁定。
- Codex app-server 鏡像歷史記錄讀取僅使用 SQLite 轉錄範圍；它們不得從轉錄檔案路徑恢復身分。
- 角色排序和壓縮重設路徑不再取消連結舊的轉錄檔案；重設僅會輪替 SQLite 工作階段列和轉錄身分。
- Gateway 重設和檢查點回應會傳回乾淨的工作階段列和工作階段 ID。它們不再為用戶端合成 SQLite 轉錄定位器。
- Memory-core dreaming 不再透過探測遺失的 JSONL 檔案來修剪工作階段列。子代理清理會透過工作階段執行時期 API，而非檔案系統存在性檢查來進行。其轉錄擷取測試會直接植入 SQLite 列，而非建立 `agents/<id>/sessions` 固定裝置或定位器預留位置。
- 記憶體轉錄索引可能會將 `transcript:<agentId>:<sessionId>` 暴露為引用/讀取輔助函式的虛擬搜尋命中路徑。持久索引來源是關聯式的 (`source_kind='sessions'`、`source_key='session:<sessionId>'`、`session_id=<sessionId>`)，因此該值不是執行時期轉錄定位器，不是檔案系統路徑，且絕不能傳回工作階段執行時期 API。
- Gateway doctor 記憶體狀態從 SQLite plugin-state 列讀取短期回憶和階段訊號計數，而非 `memory/.dreams/*.json`；CLI 和 doctor 輸出現將該儲存空間標記為 SQLite 存儲，而非路徑。
- Memory-core 執行時、CLI 狀態、Gateway doctor 方法和 plugin SDK 外觀不再稽核或封存舊版 `.dreams/session-corpus` 檔案。這些檔案僅作為遷移輸入；doctor 會將其匯入 SQLite 並在驗證後刪除來源。現用 session-ingestion 證據列現使用虛擬 SQLite 路徑 `memory/session-ingestion/<day>.txt`；執行時絕不寫入或從 `.dreams/session-corpus` 衍生狀態。
- Memory-core 公用神器將 SQLite 主機事件公開為虛擬 JSON 神器 `memory/events/memory-host-events.json`；它們不再重複使用舊版 `.dreams/events.jsonl` 來源路徑。
- Sandbox 容器/瀏覽器登錄檔現使用共用的 `sandbox_registry_entries` SQLite 表，其中包含類型化的 session、image、timestamp、backend/config 和 browser port 欄位。Doctor 會匯入舊版單體和分片 JSON 登錄檔，並移除成功的來源。執行時讀取使用類型化的列欄位作為事實來源；`entry_json` 僅為重放/偵錯副本。
- Commitments 現使用類型化的共用 `commitments` 表，而非整個儲存區的 JSON blob。快照保存會透過 commitment id 進行 upsert，並僅刪除遺失的列，而非清除並重新插入該表。執行時從類型化的 scope、delivery-window、status、attempt 和 text 欄位載入 commitments；`record_json` 僅為重放/偵錯副本。Doctor 會匯入舊版 `commitments.json` 並在成功匯入後將其移除。
- Cron job 定義、排程狀態和執行歷史不再具有執行時期 JSON 寫入器或讀取器。執行時期使用帶有類型排程、payload、遞送、失敗警報、session、狀態和執行時期狀態欄位的 `cron_jobs` 列，加上用於狀態、診斷摘要、遞送狀態/錯誤、session/執行、模型和 token 總計的類型 `cron_run_logs` 元數據。`job_json` 僅是重播/調試副本；`state_json` 保留尚未具有熱查詢欄位的巢狀執行時期診斷，而執行時期會從類型欄位重新補充熱狀態欄位。Doctor 匯入舊版的 `jobs.json`、`jobs-state.json` 和 `runs/*.jsonl` 檔案並移除已匯入的來源。外掛目標回寫會更新匹配的 `cron_jobs` 列，而不是載入並取代整個 cron store。
- Doctor 和 Gateway 啟動會在排程器執行之前，將舊版 `notify: true` webhook 回退轉換為明確的 SQLite 遞送。已向聊天宣佈的工作會保留該遞送方式並接收 webhook `completionDestination`；沒有 `cron.webhook` 的工作會被回報以進行手動修復。
- 輸出和 session 遞送佇列現在會將佇列狀態、項目種類、session 金鑰、通道、目標、帳戶 ID、重試次數、上次嘗試/錯誤、復原狀態和平台傳送標記，以類型欄位的形式儲存在共用的 `delivery_queue_entries` 資料表中。執行時期復原會從這些類型欄位讀取熱欄位，而重試/復原變更會直接更新這些欄位，而不需要重寫重播 JSON。完整的 JSON payload 僅保留為訊息本文和其他冷重播資料的重播/調試 blob。
- 受管理的輸出圖片記錄現在使用類型的共用 `managed_outgoing_image_records` 列，而媒體位元組仍儲存在 `media_blobs` 中。JSON 記錄僅作為重播/調試副本保留。
- Discord 模型選擇器偏好設定、指令部署雜湊和執行緒綁定現在使用共用的 SQLite 外掛狀態。其舊版 JSON 匯入計畫位於 Discord 外掛設定/Doctor 遷移介面中，而不是在核心遷移程式碼中。
- 外掛程式的舊版匯入偵測器使用以 doctor 命名的模組，例如 `doctor-legacy-state.ts` 或 `doctor-state-imports.ts`；正常的通道執行時模組絕不得匯入舊版 JSON 偵測器。
- BlueBubbles 的追趕游標與 inbound 去重標記現在使用共享的 SQLite 外掛程式狀態。其舊版 JSON 匯入計畫位於 BlueBubbles 外掛程式的設定/doctor 遷移介面中，而非核心遷移程式碼中。
- Telegram 的更新偏移量、貼圖快取列、已傳送訊息快取列、主題名稱快取列以及執行緒綁定現在使用共享的 SQLite 外掛程式狀態。其舊版 JSON 匯入計畫位於 Telegram 外掛程式的設定/doctor 遷移介面中，而非核心遷移程式碼中。
- iMessage 的追趕游標、回覆短 ID 對應以及已傳送回顯去重列現在使用共享的 SQLite 外掛程式狀態。舊的 `imessage/catchup/*.json`、`imessage/reply-cache.jsonl` 和 `imessage/sent-echoes.jsonl` 檔案僅作為 doctor 的輸入。
- Feishu 訊息去重列現在使用共享的 SQLite 外掛程式狀態，以取代 `feishu/dedup/*.json` 檔案。其舊版 JSON 匯入計畫位於 Feishu 外掛程式的設定/doctor 遷移介面中，而非核心遷移程式碼中。
- Microsoft Teams 的對話、投票、待上傳緩衝區以及意見回饋學習資料現在使用共享的 SQLite 外掛程式狀態/blob 資料表。待上傳路徑使用 `plugin_blob_entries`，因此媒體緩衝區會以 SQLite BLOB 形式儲存，而非 base64 JSON。執行時輔助程式名稱現在使用 SQLite/狀態命名法，而非 `*-fs` 檔案存放區命名法，且舊的 `storePath` 填充層已從這些存放區中移除。其舊版 JSON 匯入計畫位於 Microsoft Teams 外掛程式的設定/doctor 遷移介面中。
- Zalo 託管的出站媒体现在使用共享的 SQLite `plugin_blob_entries`，以取代 `openclaw-zalo-outbound-media` JSON/bin 臨時側車檔案。
- Diffs 檢視器的 HTML 與中繼資料現在使用共享的 SQLite `plugin_blob_entries`，以取代 `meta.json`/`viewer.html` 臨時檔案。渲染的 PNG/PDF 輸出仍維持為臨時具體化內容，因為通道傳遞仍然需要檔案路徑。
- Canvas 管理的文件現在改用共享的 SQLite `plugin_blob_entries`，而不是預設的 `state/canvas/documents` 目錄。Canvas 主機會直接提供這些 blob；只有在需要明確的 `host.root` 運算子內容，或是當下游媒體讀取器需要路徑進行臨時具體化時，才會建立本機檔案。
- 檔案傳輸稽核決定現在使用共享的 SQLite `plugin_state_entries`，而不是無限制的 `audit/file-transfer.jsonl` 執行時期日誌。Doctor 會將舊版 JSONL 稽核檔案匯入至外掛程式狀態，並在乾淨匯入後移除來源。
- ACPX 程序租約與閘道執行個體身分識別現在使用共享的 SQLite 外掛程式狀態。Doctor 會將舊版 `gateway-instance-id` 檔案匯入至外掛程式狀態並移除來源。
- ACPX 產生的包裝程式指令碼與隔離的 Codex home 是 OpenClaw 暫存根目錄下的臨時具體化內容，並非持久的 OpenClaw 狀態。持久的 ACPX 執行時期記錄是 SQLite 租約與閘道執行個體資料列；舊的 ACPX `stateDir` 設定介面已被移除，因為不再有執行時期狀態寫入該處。
- 閘道媒體附件現在使用共享的 `media_blobs` SQLite 資料表作為標準位元組存放區。傳回至通道和沙箱相容介面的本機路徑是資料庫資料列的臨時具體化內容，而非持久的媒體存放區。執行時期媒體允許清單不再包含舊版 `$OPENCLAW_STATE_DIR/media` 或設定目錄 `media` 根目錄；這些目錄僅為 doctor 匯入來源。
- Shell 自動完成不再寫入 `$OPENCLAW_STATE_DIR/completions/*` 快取檔案。安裝、doctor、更新和發行版本測試路徑使用產生的自動完成輸出或設定檔載入，而非持久的自動完成快取檔案。
- 閘道技術上傳暫存現在使用共享的 `skill_uploads` 資料列。上傳中繼資料、冪等金鑰和封存位元組儲存在 SQLite 中；安裝程式僅在安裝執行期間接收一個臨時具體化的封存路徑。
- 子代理內聯附件不再在工作區 `.openclaw/attachments/*` 下具體化。產生路徑會準備 SQLite VFS 種子條目，
  內聯運行會將這些條目植入每個代理運行時暫存命名空間，而磁碟支援的工具會將
  該 SQLite 暫存覆蓋在附件路徑上。舊的子代理運行附件目錄登錄檔欄位和清理掛鉤已移除。
- CLI 映像組態不再維護穩定的 `openclaw-cli-images` 快取
  檔案。外部 CLI 後端仍會接收檔案路徑，但這些路徑是
  每次運行的暫時具體化結果，並會被清理。
- 快取追蹤診斷、Anthropic 承載診斷、原始模型串流
  診斷、診斷時間軸事件和 Gateway 穩定性套件現在
  寫入 SQLite 列，而不是 `logs/*.jsonl` 或
  `logs/stability/*.json` 檔案。
  運行時路徑覆寫標誌和環境變數已被移除；匯出/除錯
  指令可以從資料庫列中明確具體化檔案。
- macOS 伴隨應用程式不再有滾動式 `diagnostics.jsonl` 寫入器。應用程式
  記錄會進入統一記錄，而持久的 Gateway 診斷則保持 SQLite 支援。
- macOS port-guardian 記錄清單現在使用類型化的共享 SQLite
  `macos_port_guardian_records` 列，而不是 Application Support JSON 檔案
  或不透明的單例二進位大型物件。
- Gateway 單例鎖現在使用類型化的共享 SQLite `state_leases` 列，位於
  `gateway_locks` 範圍下，而不是暫存目錄鎖定檔案。Fly 和 OAuth
  疑難排解文件現在指向 SQLite 租用/授權重新整理鎖，而不是
  過期的檔案鎖清理。
- Gateway 重啟哨兵狀態現在使用類型化的共享 SQLite
  `gateway_restart_sentinel` 列，而不是 `restart-sentinel.json`；運行時
  從類型化欄位讀取哨兵種類、狀態、路由、訊息、接續和統計資料。
  `payload_json` 僅是重播/除錯副本。運行時程式碼直接清除
  SQLite 列，不再攜帶檔案清理管道。
- Gateway 重啟意圖和監督者移交狀態現在使用類型化的共享
  SQLite `gateway_restart_intent` 和 `gateway_restart_handoff` 列，而不是
  `gateway-restart-intent.json` 和
  `gateway-supervisor-restart-handoff.json` 側車。
- Gateway 單例協調現在改用 `state_leases` 下的具型別 `gateway_locks` 列，而不是寫入 `gateway.<hash>.lock` 檔案。租約列擁有鎖擁有者、過期時間、心跳和除酬酬載；SQLite 則擁有原子獲取/釋放邊界。已退休的檔案鎖目錄選項已消失；測試直接使用 SQLite 列識別。
- 舊的未引用 cron 使用報告輔助程式已刪除，該程式用於掃描 `cron/runs/*.jsonl` 檔案。Cron 執行歷史報告應讀取具型別 `cron_run_logs` SQLite 列。
- 主會話重啟恢復現在透過 SQLite `agent_databases` 註冊表來探索候選代理程式，而不是掃描 `agents/*/sessions` 目錄。
- Gemini 會話損毀恢復現在僅刪除 SQLite 會話列；它不再需要舊版 `storePath` 閘道或嘗試取消連結衍生的逐字稿 JSONL 路徑。
- 路徑覆寫處理現在將字面 `undefined`/`null` 環境值視為未設定，以防止在測試或 shell 交接期間意外產生 repo-root `undefined/state/*.sqlite` 資料庫。
- Config 健康指紋現在使用具型別共享 SQLite `config_health_entries` 列，而非 `logs/config-health.json`，將一般 config 檔案保持為唯一的非憑證配置文件。macOS 伴隨程式僅保留程序本機健康狀態，且不會重建舊的 JSON 附屬檔案。
- Auth profile 執行時期不再匯入或寫入憑證 JSON 檔案。標準憑證存放區是 SQLite；`auth-profiles.json`、各代理程式 `auth.json` 和共享 `credentials/oauth.json` 是 doctor 遷移輸入，會在匯入後移除。
- Auth profile 儲存/狀態測試現在直接斷言具型別 SQLite auth 表，並僅將舊版 auth-profile 檔名用於 doctor 遷移輸入。
- `openclaw secrets apply` 僅清除 config 檔案、env 檔案和 SQLite auth-profile 存放區。它不再包含編輯已退休各代理程式 `auth.json` 的相容性邏輯；doctor 負責匯入和刪除該檔案。
- Hermes secret migration plans 將匯入的 API-key profile 直接應用
  到 SQLite auth-profile store 中。它不再寫入或驗證
  `auth-profiles.json` 作為中繼目標。
- 使用者面向的 auth 文件現在描述
  `state/openclaw.sqlite#table/auth_profile_stores/<agentDir>`，而不是
  告訴使用者檢查或複製 `auth-profiles.json`；舊版的 OAuth/auth JSON
  名稱僅作為 doctor-import 輸入保留在文件中。
- Core state-path helpers 不再公開已停用的 `credentials/oauth.json`
  檔案。舊版檔名僅限於 doctor auth import 路徑內部。
- Install、security、onboarding、model-auth 和 SecretRef 文件現在描述
  SQLite auth-profile rows 和全狀態備份/遷移，而不是
  逐 agent 的 auth-profile JSON 檔案。
- PI model discovery 現在會將規格憑證傳遞到記憶體中的
  `pi-coding-agent` auth storage。在 discovery 期間，它不再建立、清理或寫入
  逐 agent 的 `auth.json`。
- Voice Wake 觸發器和路由設定現在改用型別化的共享 SQLite tables，
  而不是 `settings/voicewake.json`、`settings/voicewake-routing.json` 或
  不透明的泛型 rows；doctor 會匯入舊版 JSON 檔案並在成功遷移後將其移除。
- Update-check state 現在使用型別化的共享 `update_check_state` row，
  而不是 `update-check.json` 或不透明的泛型 blob；doctor
  會匯入舊版 JSON 檔案並在成功遷移後將其移除。
- Config health state 現在使用型別化的共享 `config_health_entries` rows，
  而不是 `logs/config-health.json` 或不透明的泛型 blob；doctor
  會匯入舊版 JSON 檔案並在成功遷移後將其移除。
- Plugin conversation binding approvals 現在使用型別化的
  `plugin_binding_approvals` rows，而不是不透明的共享 SQLite state 或
  `plugin-binding-approvals.json`；舊版檔案是 doctor migration 的輸入來源。
- 泛型的 current-conversation bindings 現在會儲存型別化的
  `current_conversation_bindings` rows，而不是重寫
  `bindings/current-conversations.json`；doctor 會匯入舊版 JSON 檔案並
  在成功遷移後將其移除。
- Memory Wiki 匯入來源同步帳本現在會為每個 vault/source 金鑰儲存一個 SQLite 外掛狀態資料列，而不是覆寫 `.openclaw-wiki/source-sync.json`；遷移提供者會匯入並移除舊版的 JSON 帳本。
- Memory Wiki ChatGPT 匯入執行記錄現在會為每個 vault/run id 儲存一個 SQLite 外掛狀態資料列，而不是寫入 `.openclaw-wiki/import-runs/*.json`。回溯快照仍維持為明確的 vault 檔案，直到匯入執行快照歸檔被移至 blob 儲存。
- Memory Wiki 編譯摘要現在會儲存 SQLite 外掛 blob 資料列，而不是寫入 `.openclaw-wiki/cache/agent-digest.json` 和 `.openclaw-wiki/cache/claims.jsonl`。遷移提供者會匯入舊的快取檔案，並在快取目錄變空時將其移除。
- ClawHub 技能安裝追蹤現在會為每個 workspace/skill 儲存一個 SQLite 外掛狀態資料列，而不是在執行時寫入或讀取 `.clawhub/lock.json` 和 `.clawhub/origin.json` 副檔案。執行時程式碼使用已追蹤安裝的狀態物件，而不是檔案形狀的鎖定檔案/來源抽象。Doctor 會從設定的代理程式工作區匯入舊版副檔案，並在乾淨的匯入後將其移除。
- 已安裝的外掛索引現在會讀寫類型化的共享 SQLite `installed_plugin_index` 單例資料列，而不是 `plugins/installs.json`；舊版 JSON 檔案僅作為 doctor 遷移輸入，並在匯入後被移除。
- 舊版 `plugins/installs.json` 路徑輔助程式現在位於 doctor 舊版程式碼中。執行時外掛索引模組僅公開 SQLite 支援的持久性選項，而非 JSON 檔案路徑。
- Gateway 重新啟動哨兵、重新啟動意圖和監督器交接狀態現在使用類型化的共享 SQLite 資料列（`gateway_restart_sentinel`、`gateway_restart_intent` 和 `gateway_restart_handoff`），而不是通用的不透明 blob。執行時重新啟動程式碼沒有檔案形狀的哨兵/意圖/交接合約。
- Matrix 同步快取、儲存中繼資料、執行緒繫結、輸入去重標記、啟動驗證冷卻狀態、SDK IndexedDB 加密快照、憑證和復原金鑰現在使用共用的 SQLite 外掛程式 state/blob 資料表。Runtime path 結構不再公開 `storage-meta.json` metadata 路徑；該檔名僅作為舊版遷移的輸入。其舊版 JSON 匯入計畫位於 Matrix 外掛程式設定/doctor 遷移介面中。
- Matrix 啟動不再掃描、回報或完成舊版 Matrix 檔案狀態。Matrix 檔案偵測、舊版加密快照建立、房間金鑰復原遷移狀態、匯入和來源移除均由 doctor 管理。
- 已移除 Matrix runtime 遷移 barrels。舊版狀態/加密偵測和輔助修改工具現在直接由 Matrix doctor 匯入，而非 runtime API 介面的一部分。
- Matrix 遷移快照重複使用標記現位於 SQLite 外掛程式狀態中，而非 `matrix/migration-snapshot.json`；doctor 仍可重複使用相同的已驗證遷移前存檔，而無需寫入 sidecar 狀態檔案。
- Nostr bus 游標和個人資料發佈狀態現在使用共用的 SQLite 外掛程式狀態。其舊版 JSON 匯入計畫位於 Nostr 外掛程式設定/doctor 遷移介面中。
- Active Memory 會話切換現在使用共用的 SQLite 外掛程式狀態，而非 `session-toggles.json`；重新啟用記憶功能會刪除該列，而非重寫 JSON 物件。
- Skill Workshop 提案和審查計數器現在使用共用的 SQLite 外掛程式狀態，而非各工作區的 `skill-workshop/<workspace>.json` stores。每個提案是 `skill-workshop/proposals` 下的一個獨立列，而審查計數器是 `skill-workshop/reviews` 下的一個獨立列。
- Skill Workshop 審查者子代理程式執行現在使用 runtime 會話文字記錄解析器，而非建立 `skill-workshop/<sessionId>.json` sidecar 會話路徑。
- ACPX 程序租約現在使用 `acpx/process-leases` 下的共用 SQLite 外掛程式狀態，而非全檔案的 `process-leases.json` registry。每個租約儲存為其獨立列，保留啟動時的陳舊程序清理功能，無需 runtime JSON 重寫路徑。
- ACPX 包裝腳本和獨立的 Codex home 是在 OpenClaw 臨時根目錄中生成的。它們會根據需要重新建立，並非備份或遷移的輸入來源。
- 子代理執行登錄表的持久化使用類型化的共享 `subagent_runs` 資料列。舊的 `subagents/runs.json` 路徑現在僅作為 doctor 遷移的輸入，而且執行時期輔助程式名稱不再將狀態層描述為以磁碟為支援的儲存。執行時期測試不再建立無效或空的 `runs.json` 固定裝置來證明登錄表行為；它們會直接植入/讀取 SQLite 資料列。
- 備份在封存前會暫存狀態目錄，複製非資料庫檔案，使用 `VACUUM INTO` 對 `*.sqlite` 資料庫進行快照，省略作用中的 WAL/SHM 側車檔案，在封存清單中記錄快照元資料，並在 SQLite 中使用封存清單記錄已完成的備份執行。`openclaw backup
create` validates the written archive by default; `--no-verify` 是明確的快速路徑。
- `openclaw backup restore` 在解壓縮前驗證封存，重複使用驗證器的正規化清單，並將經過驗證的清單資產還原至其記錄的來源路徑。它需要 `--yes` 進行寫入，並支援 `--dry-run` 作為還原計劃。
- 舊的備份動態路徑過濾器已被刪除。由於 SQLite 快照是在建立封存之前進行暫存，因此備份不再需要針對舊版會話或 cron JSON/JSONL 檔案的即時 tar 跳過清單。
- 標準設定和入門工作區準備不再建立 `agents/<agentId>/sessions/` 目錄。它們只建立 config/workspace；SQLite 會話資料列和逐字稿資料列會在每個代理的資料庫中按需建立。
- 安全性權限修復現在以全域和每個代理的 SQLite 資料庫以及 WAL/SHM 側車檔案為目標，而不是 `sessions.json` 和逐字稿 JSONL 檔案。
- 沙箱登錄表執行時期名稱現在直接描述 SQLite 登錄表類型，而不是透過作用中的儲存空間傳遞舊版的 JSON 登錄表術語。
- `openclaw reset --scope config+creds+sessions` 會移除每個代理的 `openclaw-agent.sqlite` 資料庫以及 WAL/SHM 側車檔案，而不僅僅是舊版的 `sessions/` 目錄。
- Gateway aggregate session helpers 現在使用以項目為導向的名稱：
  `loadCombinedSessionEntriesForGateway` 會傳回 `{ databasePath, entries }`。
  舊的 combined-store 命名已從 runtime 呼叫端中移除。
- Docker MCP 頻道植入 現在會將主會話列 和
  轉錄事件 寫入每個 Agent 的 SQLite 資料庫，而不是建立
  `sessions.json` 和 JSONL 轉錄檔。
- 內建的 session-memory hook 現在透過 `{agentId, sessionId}` 從
  SQLite 解析先前會語境。它不再掃描、儲存或合成
  轉錄路徑或 `workspace/sessions` 目錄。
- 內建的 command-logger hook 現在會將指令稽核 列寫入共用的
  SQLite `command_log_entries` 資料表，而不是附加
  `logs/commands.log`。
- 頻道配對允許清單 現在在 runtime 和
  插件 SDK 中僅公開基於 SQLite 的讀寫輔助程式。舊的 `*-allowFrom.json` 路徑解析器
  和檔案讀取器僅存在於 doctor 舊版匯入程式碼下。
- `migration_runs` 記錄舊版狀態遷移的執行，包含狀態、
  時間戳記和 JSON 報告。
- `migration_sources` 記錄每個匯入的舊版檔案來源，包含雜湊、大小、
  記錄計數、目標資料表、執行 ID、狀態和來源移除狀態。
- `backup_runs` 記錄備份封存路徑、狀態和 JSON 清單。
- 全域結構 不保留未使用的 `agents` 註冊 資料表。Agent
  資料庫探索是正規的 `agent_databases` 註冊表，直到 runtime
  擁有真正的 Agent 記錄擁有者。
- 產生的模型目錄設定 儲存在以 Agent 目錄為索引鍵的類型化全域 SQLite
  `agent_model_catalogs` 列中。Runtime 呼叫端使用
  `ensureOpenClawModelCatalog`；runtime 程式碼中沒有
  `models.json` 相容性 API。實作會寫入 SQLite，而嵌入式 PI 註冊表是
  從該儲存的有效負載填補，而不會建立 `models.json` 檔案。
- QMD 會語轉錄 Markdown 匯出和 `memory.qmd.sessions` 設定已
  被移除。沒有 QMD 轉錄集合，沒有 `qmd/sessions*` runtime
  路徑，也沒有基於檔案的會語記憶橋接器。
- Memory-core runtime 從 `openclaw/plugin-sdk/memory-core-host-engine-session-transcripts` 匯入 SQLite 逐字稿索引輔助程式，而非來自 QMD SDK 子路徑。QMD 子路徑僅為了外部呼叫者保留相容性重新匯出，直到進行主要的 SDK 清除作業時將其移除。
- QMD 自己的 `index.sqlite` 現在是由主要 SQLite `plugin_blob_entries` 資料表支援的暫存運行時具體化。Runtime 不再建立持久的 `~/.openclaw/agents/<agentId>/qmd` 副檔案。
- 選用的 `memory-lancedb` 外掛程式不再將 `~/.openclaw/memory/lancedb` 建立為隱含的 OpenClaw 管理儲存庫。它是一個外部 LanceDB 後端，並在操作員設定明確的 `dbPath` 之前保持停用狀態。
- `check:database-first-legacy-stores` 會阻擋將遺留儲存名稱與寫入式檔案系統 API 配對的新執行時期原始碼。它也會阻擋重新引入轉錄橋接合約（如 `transcriptLocator`、`sqlite-transcript://...`、`sessionFile` 或 `storePath`）的執行時期原始碼，並掃描測試中的這些橋接合約名稱。它也會禁止 `SessionManager.open(...)` 和舊的靜態 SessionManager 外觀，以便執行時期和測試無法無聲無息地重新建立檔案支援的會話開啟器或檔案時代的會話探索。它也會禁止匯出 UI 中的舊會話 JSONL 下載器 hook/class。它也會禁止側車形狀的外掛狀態/任務 SQLite 輔助名稱；測試應斷言 `databasePath` 和共用的 `state/openclaw.sqlite` 位置，而不是假設這些功能擁有獨立的 SQLite 檔案。它也會禁止執行時期原始碼中的舊通用記憶體索引 SQL 表名稱（`meta`、`files`、`chunks`、`chunks_vec`、`chunks_fts`、`embedding_cache`），以便代理資料庫保持其明確的 `memory_index_*` 結構描述。它也會禁止嵌入 TEXT 結構描述和嵌入 JSON 陣列寫入，以便向量保持緊湊的 SQLite BLOB。遷移、doctor、匯入和明確的非會話匯出程式碼仍然允許。防護現在也涵蓋執行時期 `cache/*.json` 儲存、通用 `thread-bindings.json` 側車、cron 狀態/執行記錄 JSON、設定健康 JSON、重新啟動和鎖定側車、語音喚醒設定、外掛繫結核准、已安裝外掛索引 JSON、檔案傳輸稽核 JSONL、記憶體 Wiki 活動記錄、舊的捆綁 `command-logger` 文字記錄，以及 pi-mono 原始串流 JSONL 診斷旋鈕。它也會禁止舊的根層級 doctor 遺留模組名稱，以便相容性程式碼保留在 `src/commands/doctor/` 下。Android 調試處理程式也使用 logcat/記憶體輸出，而不是暫存 `camera_debug.log` 或 `debug_logs.txt` 快取檔案。

## 目標結構描述形狀

保持 schema 明確。Host 擁有的執行時期狀態使用型別化資料表。Plugin 擁有的不透明狀態使用 `plugin_state_entries` / `plugin_blob_entries`；沒有通用的 host `kv` 資料表。

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

未來的搜尋可以新增 FTS 資料表，而無需更動規範事件資料表：

```text
transcript_events_fts(session_id, seq, text)
vfs_entries_fts(namespace, path, text)
```

大型數值應使用 `blob` 欄位，而非 JSON 字串編碼。對於必須能以純 SQLite 工具檢視的小型結構化資料，請保留 `value_json`。

`agent_databases` 是此分支的規範登錄檔。在存在真正的 agent-record 擁有者之前，請勿新增 `agents` 資料表；agent 設定維持在 `openclaw.json`。

## Doctor 遷移形狀

Doctor 應呼叫一個明確的遷移步驟，該步驟可報告且可安全重新執行：

```bash
openclaw doctor --fix
```

`openclaw doctor --fix` 在一般設定預檢之後叫用狀態遷移實作，並在匯入前建立已驗證的備份。執行時期啟動和 `openclaw migrate` 不得匯入舊版 OpenClaw 狀態檔案。

遷移屬性：

- 一次遷移流程會發現所有舊版檔案來源，並在變更任何內容前產生計畫。
- Doctor 會在匯入舊版檔案前，建立已驗證的遷移前備份封存檔。
- 匯入具等冪性，並依來源路徑、mtime、大小、雜湊與目標資料表做為索引鍵。
- 來源檔案成功後會在目標資料庫提交後被移除或封存。
- 匯入失敗時會保持來源不變，並在 `migration_runs` 中記錄警告。
- 執行時期程式碼僅在遷移存在後讀取 SQLite。
- 不需要降級/匯出為執行時期檔案的路徑。

## 遷移清單

將這些移至全域資料庫：

- Task registry 執行時期寫入現在使用共享資料庫；未發貨的 `tasks/runs.sqlite` sidecar 匯入器已刪除。Snapshot 儲存依 task id 進行 upsert，並僅刪除遺失的 task/delivery 資料列。
- Task Flow 執行時期寫入現在使用共享資料庫；未發貨的 `tasks/flows/registry.sqlite` sidecar 匯入器已刪除。Snapshot 儲存依 flow id 進行 upsert，並僅刪除遺失的 flow 資料列。
- 插件狀態執行時寫入現在使用共享資料庫；未發佈的 `plugin-state/state.sqlite` sidecar 匯入器已被刪除。
- 內建記憶體搜尋不再預設為 `memory/<agentId>.sqlite`；其索引表位於所屬的代理程式資料庫中，且顯式的 `memorySearch.store.path` sidecar opt-in 已退役至 doctor 設定遷移。
- 內建記憶體重建索引僅重設代理程式資料庫中記憶體擁有的表。它不得替換整個 SQLite 檔案，因為同一資料庫擁有會話、文字記錄、VFS 資料列、工件和執行時快取。
- 沙箱容器/瀏覽器登錄檔來自單一和分片的 JSON。執行時寫入現在使用共享資料庫；保留舊版 JSON 匯入。
- Cron 工作定義、排程狀態和執行歷史現在使用共享 SQLite；doctor 匯入/移除舊版 `jobs.json`、`jobs-state.json` 和 `cron/runs/*.jsonl` 檔案。
- 裝置身分/驗證、推送、更新檢查、承諾、OpenRouter 模型快取、已安裝插件索引和應用程式伺服器綁定
- 裝置/節點配對和引導記錄現在使用具型別的 SQLite 表。
- 裝置配對通知訂閱者和已傳送請求標記現在使用共享 SQLite plugin-state 表，而不是 `device-pair-notify.json`。
- 語音通話記錄現在使用共享 SQLite plugin-state 表，位於 `voice-call` / `calls` 命名空間下，而不是 `calls.jsonl`；插件 CLI 追蹤並摘要支援 SQLite 的通話記錄。
- QQBot 閘道會話、已知使用者記錄和 ref-index 引用快取現在使用 SQLite plugin state，位於 `qqbot` 命名空間 (`sessions`、`known-users`、`ref-index`) 下，而不是 `session-*.json`、`known-users.json` 和 `ref-index.jsonl`；QQBot doctor/setup 遷移會匯入並移除舊版檔案。
- Discord 模型選擇器偏好設定、指令部署雜湊值，以及執行緒綁定
  現在使用 SQLite 外掛程式狀態於 `discord` 命名空間
  （`model-picker-preferences`、`command-deploy-hashes`、`thread-bindings`）
  取代 `model-picker-preferences.json`、`command-deploy-cache.json` 和
  `thread-bindings.json`；Discord doctor/setup 遷移會匯入並
  移除舊版檔案。
- BlueBubbles 追蹤游標和入站去重標記現在使用 SQLite 外掛程式
  狀態於 `bluebubbles` 命名空間（`catchup-cursors`、`inbound-dedupe`）
  取代 `bluebubbles/catchup/*.json` 和
  `bluebubbles/inbound-dedupe/*.json`；BlueBubbles doctor/setup 遷移
  會匯入並移除舊版檔案。
- Telegram 更新偏移量、貼圖快取項目、回覆鏈訊息快取
  項目、已傳送訊息快取項目、主題名稱快取項目，以及執行緒
  綁定現在使用 SQLite 外掛程式狀態於 `telegram` 命名空間
  （`update-offsets`、`sticker-cache`、`message-cache`、`sent-messages`、
  `topic-names`、`thread-bindings`）取代 `update-offset-*.json`、
  `sticker-cache.json`、`*.telegram-messages.json`、
  `*.telegram-sent-messages.json`、`*.telegram-topic-names.json` 和
  `thread-bindings-*.json`；Telegram doctor/setup 遷移會匯入並
  移除舊版檔案。
- iMessage 追蹤游標、回覆短 ID 對應，以及已傳送回聲去重列
  現在使用 SQLite 外掛程式狀態於 `imessage` 命名空間（`catchup-cursors`、
  `reply-cache`、`sent-echoes`）取代 `imessage/catchup/*.json`、
  `imessage/reply-cache.jsonl` 和 `imessage/sent-echoes.jsonl`；iMessage
  doctor/setup 遷移會匯入並移除舊版檔案。
- Microsoft Teams 對話、投票、委派權杖、待上傳內容以及
  反饋學習資料現在使用 SQLite 外掛狀態/blob 命名空間
  (`conversations`, `polls`, `delegated-tokens`, `pending-uploads`,
  `feedback-learnings`) 取代 `msteams-conversations.json`,
  `msteams-polls.json`, `msteams-delegated.json`,
  `msteams-pending-uploads.json` 和 `*.learnings.json`；Microsoft Teams
  doctor/setup 遷移會匯入並移除舊版檔案。
- Matrix 同步快取、儲存中繼資料、執行緒綁定、輸入去重標記、
  啟動驗證冷卻狀態、憑證、復原金鑰和 SDK
  IndexedDB 加密快照現在使用 SQLite 外掛狀態/blob 命名空間於
  `matrix` (`sync-store`, `storage-meta`, `thread-bindings`, `inbound-dedupe`,
  `startup-verification`, `credentials`, `recovery-key`, `idb-snapshots`)
  取代 `bot-storage.json`、`storage-meta.json`、`thread-bindings.json`、
  `inbound-dedupe.json`、`startup-verification.json`、`credentials.json`、
  `recovery-key.json` 和 `crypto-idb-snapshot.json`；Matrix doctor/setup
  遷移會從帳戶範圍的 Matrix 儲存根目錄匯入並移除這些舊版檔案。
- Nostr bus 游標和個人檔案發佈狀態現在使用 SQLite 外掛狀態於
  `nostr` 命名空間 (`bus-state`, `profile-state`) 取代
  `bus-state-*.json` 和 `profile-state-*.json`；Nostr doctor/setup
  遷移會匯入並移除舊版檔案。
- Active Memory 工作階段切換現在使用 SQLite 外掛狀態於
  `active-memory/session-toggles` 取代 `session-toggles.json`。
- 技能工作坊提案佇列和審核計數器現在改用 `skill-workshop/proposals` 和 `skill-workshop/reviews` 下的 SQLite 外掛程式狀態，而不再使用每個工作區的 `skill-workshop/<workspace>.json` 檔案。
- 外送傳遞和會話傳遞佇列現在使用獨立的佇列名稱 (`outbound-delivery`, `session-delivery`) 共用全域 SQLite `delivery_queue_entries` 資料表，而不再使用持久的 `delivery-queue/*.json`, `delivery-queue/failed/*.json`, 和 `session-delivery-queue/*.json` 檔案。doctor legacy-state 步驟會匯入待處理和失敗的列，移除陳舊的已傳遞標記，並在匯入後刪除舊的 JSON 檔案。熱路由和重試欄位是具類型的欄位；JSON 承載僅保留用於重放/除錯。
- ACPX 程序租約現在改用 `acpx/process-leases` 下的 SQLite 外掛程式狀態，而不再使用 `process-leases.json`。
- 備份和遷移執行中繼資料

將這些移至代理程式資料庫：

- 代理程式會話根目錄和相容性形狀的會話項目承載。針對執行階段寫入已完成：熱會話中繼資料可在 `sessions` 中查詢，而舊形狀的完整 `SessionEntry` 承載則保留在 `session_entries` 中。
- 代理程式逐字稿事件。針對執行階段寫入已完成。
- 壓縮檢查點和逐字稿快照。針對執行階段寫入已完成：檢查點逐字稿副本是 SQLite 逐字稿列，且檢查點中繼資料記錄在 `transcript_snapshots` 中。閘道檢查點協助程式現將這些值命名為逐字稿快照，而非來源檔案。
- 代理程式 VFS 暫存/工作區命名空間。針對執行階段 VFS 寫入已完成。
- 子代理程式附件承載。針對執行階段寫入已完成：它們是 SQLite VFS 種子項目，而非持久的工作區檔案。
- 工具成品。針對執行階段寫入已完成。
- 執行成品。針對工作者執行階段寫入已透過個別代理程式的 `run_artifacts` 資料表完成。
- 代理程式本機執行階段快取。針對工作者執行階段範圍快取寫入已透過個別代理程式的 `cache_entries` 資料表完成。閘道範圍的模型快取保留在全域資料庫中，除非它們變成特定於代理程式。
- ACP 父資料流記錄。針對執行階段寫入已完成。
- ACP 重放分類帳會話。已透過
  `acp_replay_sessions` 和 `acp_replay_events` 完成執行階段寫入；舊版 `acp/event-ledger.json`
  僅作為 doctor 輸入保留。
- ACP 會話元數據。已透過 `acp_sessions` 完成執行階段寫入；舊版
  `entry.acp` 區塊在 `sessions.json` 中僅作為 doctor 遷移輸入。
- 當軌跡側車不是明確的匯出檔案時。已為執行階段
  寫入完成：軌跡捕獲寫入 agent-database `trajectory_runtime_events`
  列並將執行範圍的產出映照到 SQLite。舊版側車僅作為 doctor
  匯入輸入；匯出可以在執行階段實作全新的 JSONL 支援套件輸出
  但不會讀取或遷移舊的軌跡/文字記錄側車。
  執行階段軌跡捕獲公開 SQLite 範圍；JSONL 路徑輔助程式
  被隔離在匯出/除錯支援中，且不會從執行階段模組重新匯出。
  嵌入式執行器軌跡元數據記錄 `{agentId, sessionId, sessionKey}`
  身份，而不是持久化文字記錄定位器。

暫時將這些保留為檔案支援：

- `openclaw.json`
- 提供者或 CLI 憑證檔案
- 插件/套件清單
- 選擇磁碟模式時的使用者工作區和 Git 儲存庫
- 供操作員追蹤的日誌，除非移動了特定的日誌表面

## 遷移計劃

### 階段 0：凍結邊界

在移動更多列之前，使持久狀態邊界變得明確：

- 在全域資料庫中新增一個 `migration_runs` 資料表。
  已完成舊版狀態遷移執行報告。
- 新增單一 doctor 擁有的狀態遷移服務，用於從檔案匯入到資料庫。
  已完成：`openclaw doctor --fix` 使用舊版狀態遷移實作。
- 使 `plan` 成為唯讀，並讓 `apply` 建立備份、匯入、驗證，
  然後刪除或隔離舊檔案。
  已完成：doctor 建立經過驗證的遷移前備份，將備份路徑
  傳遞給 `migration_runs`，並重複使用匯入器/移除路徑。
- 新增靜態禁令，使新的執行時代碼無法寫入舊版狀態檔案，同時遷移代碼和測試仍可植入/讀取它們。
  目前已針對已遷移的舊版存儲完成；該防護機制也會掃描巢狀測試中是否包含被禁止的執行時轉錄定位器約定。

### 階段 1：完成全域控制平面

將共享協調狀態保留在 `state/openclaw.sqlite` 中：

- 代理程式與代理程式資料庫註冊表
- 任務和任務流程分類帳
- 外掛狀態
- 沙箱容器/瀏覽器註冊表
- Cron/排程器執行記錄
- 配對、裝置、推播、更新檢查、TUI、OpenRouter/模型快取，以及其他
  小型閘道範圍的執行時狀態
- 備份與遷移元數據
- 閘道媒體附件位元組。執行時寫入已完成；直接檔案路徑
  是為了與頻道發送者和沙箱暫存相容的暫時具體化。執行時允許清單接受 SQLite 具體化路徑，而非舊版
  狀態/配置媒體根目錄。Doctor 會將舊版媒體檔案匯入
  `media_blobs` 並在成功寫入資料列後移除原始檔案。
- 偵錯代理擷取階段、事件和有效載荷 Blob。已完成：擷取動態存在
  於共享狀態 DB 中，並透過共享狀態 DB 引導程序、架構、
  WAL 和忙碌逾時設定開啟。沒有偵錯代理執行時 sidecar DB
  覆寫、Blob 目錄或僅代理擷取生成的架構/程式碼生成
  目標。

此階段也會從這些子系統中刪除重複的 sidecar 開啟器、權限輔助程式、WAL
設定、檔系統修剪和相容性寫入器。

### 階段 2：引進每個代理程式的資料庫

為每個代理程式建立一個資料庫並從全域 DB 註冊它：

```text
~/.openclaw/state/openclaw.sqlite
~/.openclaw/agents/<agentId>/agent/openclaw-agent.sqlite
```

全域 `agent_databases` 資列儲存路徑、架構版本、最後看見的
時間戳記以及基本大小/完整性元數據。執行時代碼向註冊表詢問
代理程式 DB，而不是直接推導檔案路徑。

代理程式 DB 擁有：

- `sessions` 作為正式的階段根目錄，並以 `session_entries` 作為附加至該根目錄的
  相容性外形有效載荷資料表，以及
  `session_routes` 作為唯一的活動 `session_key` 查找
- `conversations` 和 `session_conversations` 作為附加至階段的
  正規化提供者路由身分
- `transcript_events`
- transcript snapshots and compaction checkpoints. Done for runtime writes.
- `vfs_entries`
- `tool_artifacts` and run artifacts
- agent-local runtime/cache rows. Done for worker scoped caches.
- ACP parent stream events
- trajectory runtime events when they are not explicit export artifacts

### Phase 3: Replace Session Store APIs

Done for runtime. The file-shaped session store surface is not an active
runtime contract:

- Runtime no longer calls `loadSessionStore(storePath)` or treats `storePath` as
  session identity.
- Runtime row operations are `getSessionEntry`, `upsertSessionEntry`,
  `patchSessionEntry`, `deleteSessionEntry`, and `listSessionEntries`.
- Whole-store rewrite helpers, file writers, queue tests, alias pruning, and
  legacy-key deletion parameters are gone from runtime.
- Deprecated root-package compatibility exports still adapt canonical
  `sessions.json` paths onto the SQLite row APIs.
- `sessions.json` parsing remains only in doctor migration/import code and
  doctor tests.
- Runtime lifecycle fallback reads SQLite transcript headers, not JSONL first
  lines.

Keep deleting anything that reintroduces file-lock parameters,
pruning/truncation-as-file-maintenance vocabulary, store-path identity, or tests
whose only assertion is JSON persistence.

### Phase 4: Move Transcripts, ACP Streams, Trajectories, And VFS

Make every agent data stream database-native:

- Transcript append writes go through one SQLite transaction that ensures the
  session header, checks message idempotency, selects the parent tail, inserts
  into `transcript_events`, and records queryable identity metadata in
  `transcript_event_identities`. Done for direct transcript message appends and
  normal persisted `TranscriptSessionManager` appends; explicit branch
  operations keep their explicit parent choice and still write SQLite rows
  without deriving any file locator.
- ACP parent stream logs become rows, not `.acp-stream.jsonl` files. Done.
- ACP spawn setup no longer persists transcript JSONL paths. Done.
- Runtime trajectory capture 將事件資料列/構件直接寫入。明確的
  support/export 指令仍可產生 support-bundle JSONL 構件作為
  匯出格式，但 session 匯出不會重新建立 session JSONL。已完成。
- 設定為磁碟模式時，磁碟工作區會保留在磁碟上。
- VFS 暫存區和實驗性僅 VFS 工作區模式使用 agent DB。

遷移作業僅匯入舊的 JSONL 檔案一次，在
`migration_runs` 中記錄計數/雜湊值，並在完整性檢查後移除已匯入的檔案。

### 階段 5：備份、還原、壓縮與驗證

備份保持為一個壓縮檔：

- 對每個全域和 agent 資料庫進行檢查點設定。
- 使用 SQLite 備份語意或 `VACUUM INTO` 對每個 DB 進行快照。
- 封存壓縮後的 DB 快照、設定、外部認證以及請求的
  工作區匯出內容。
- 省略原始即時 `*.sqlite-wal` 和 `*.sqlite-shm` 檔案。
- 透過開啟每個 DB 快照並執行 `PRAGMA integrity_check` 來驗證。
  `openclaw backup create` 預設會執行此封存驗證；
  `--no-verify` 僅跳過寫入後的封存傳遞，而不跳過快照
  建立的完整性檢查。
- 還原作業會將快照複製回其目標路徑。此分支將
  未發布的 SQLite 佈局重設為 `user_version = 1`；未來發布的 schema 變更
  可以在需要時新增明確的遷移。

### 階段 6：Worker 執行階段

在資料庫分割落地期間，讓 worker 模式保持實驗性質：

- Workers 會接收 agent id、run id、檔案系統模式和 DB 註冊表身分識別。
- 每個 worker 會開啟自己的 SQLite 連線。
- 父程序保留通道遞送、核准、設定和取消授權。
- 從每次作用中的執行各使用一個 worker 開始；僅在生命週期和 DB
  連線擁有權穩定後才新增共用池。

### 階段 7：刪除舊世界

執行階段 session 管理已完成。舊世界僅允許作為明確的
doctor 輸入或 support/export 輸出：

- 沒有執行階段 `sessions.json`、transcript JSONL、sandbox registry JSON、task
  sidecar SQLite 或 plugin-state sidecar SQLite 寫入。
- 沒有 JSON/session 檔案修剪、檔案 transcript 截斷、session 檔案鎖定，
  或鎖定狀的 session 測試。
- 沒有運行時兼容性匯出，其目的是保持舊的會話檔案為最新狀態。
- 明確的支援匯出保留使用者要求的存檔/具體化格式，且不得將檔案名稱反饋回運行時身份。

## 備份與還原

備份應該是一個存檔檔案，但資料庫捕獲應該是 SQLite 原生的：

1. 停止長時間執行的寫入活動或進入一個短暫的備份屏障。
2. 對每個全域資料庫和代理資料庫執行檢查點。
3. 使用 SQLite 備份語義或 `VACUUM INTO` 將每個資料庫快照到臨時備份目錄中。
4. 將壓縮後的資料庫快照、設定檔、憑證目錄、選定的工作區以及清單歸檔。
5. 透過開啟每個包含的 SQLite 快照並執行 `PRAGMA integrity_check` 來驗證存檔。
   `openclaw backup create` 預設會執行此操作；`--no-verify` 僅用於故意跳過寫入後存檔傳遞的情況。

不要依賴原始的即時 `*.sqlite`、`*.sqlite-wal` 和 `*.sqlite-shm` 副本作為主要備份格式。存檔清單應記錄資料庫角色、代理 ID、架構版本、來源路徑、快照路徑、位元組大小和完整性狀態。

還原應從存檔快照重建全域資料庫和代理資料庫檔案。由於 SQLite 佈局尚未發布，此重構僅保留 version-1 架構以及 doctor 檔案到資料庫的匯入。還原命令首先驗證存檔，然後從驗證後的提取載入中替換每個清單資產。

## 運行時重構計畫

1. 新增資料庫註冊表 API。
   - 解析全域資料庫和每個代理資料庫的路徑。
   - 將未發布的架構保留在 `user_version = 1`；在已發布的架構需要之前，不要新增架構遷移執行器程式碼。
   - 新增由測試、備份和 doctor 使用的關閉/檢查點/完整性輔助程式。

2. 合併附屬 SQLite 儲存。
   - 將外掛程式狀態表移至全域資料庫。運行時寫入已完成；未發布的舊版附屬匯入器已刪除。
   - 將任務註冊表表移至全域資料庫。運行時寫入已完成；未發布的舊版附屬匯入器已刪除。
   - 將任務流程表移至全局資料庫。運行時寫入已完成；未發布的舊版 sidecar 匯入器已刪除。
   - 將內建記憶體搜尋表移至每個代理程式資料庫。已完成；顯式自訂 `memorySearch.store.path` 現已由 doctor 配置遷移移除。完整重新索引就地針對記憶體表執行；舊的整檔交換路徑和 sidecar 索引交換輔助程式已刪除。
   - 從這些子系統中刪除重複的資料庫開啟器、WAL 設定、權限輔助程式和關閉路徑。

3. 將代理程式擁有的表移至每個代理程式的資料庫中。
   - 通過全局資料庫註冊表按需建立代理程式 DB。已完成。
   - 將運行時會話條目、文字記錄事件、VFS 行和工具產物移至代理程式 DB。已完成。
   - 不要遷移分支本地共享 DB 會話條目、文字記錄事件、VFS 行或工具產物；該佈局從未發布。僅在 doctor 中保留舊版檔案到資料庫的匯入。

4. 替換會話存儲 API。
   - 移除 `storePath` 作為執行時身分。對執行時已完成並由 `check:database-first-legacy-stores` 守護：會話元資料、路由更新、命令持久化、CLI 會話清理、飛書推理預覽、逐字稿狀態持久化、子代理深度、授權配置檔會話覆寫、父分支邏輯和 QA 實驗室檢查現在從正準代理/會話鍵解析資料庫。Gateway/TUI/UI/macOS 會話列表回應現在公開 `databasePath` 而非舊有的 `path`；macOS 偵錯介面顯示每個代理的資料庫為唯讀狀態，而非寫入 `session.store` 配置。`/status`、聊天驅動的軌跡匯出和 CLI 依賴代理不再傳播舊有的儲存路徑；逐字稿使用後備讀取會根據代理/會份身分讀取 SQLite。執行時和橋接測試不再公開 `storePath`；doctor/migration 輸入擁有該舊有欄位名稱。Gateway 組合會話載入不再對非範本化的 `session.store` 值擁有特殊的執行時分支；它聚合每個代理的 SQLite 列。舊有的會話鎖 doctor 通道及其 `.jsonl.lock` 清理助手已被移除；SQLite 現在是會話並發邊界。熱門執行時呼叫站點使用列導向的助手名稱，例如 `resolveSessionRowEntry`；舊的 `resolveSessionStoreEntry` 相容性別名已從執行時和外掛 SDK 匯出中移除。

- 使用 `{ agentId, sessionKey }` 列操作。已完成：`getSessionEntry`、`upsertSessionEntry`、`deleteSessionEntry`、`patchSessionEntry` 和 `listSessionEntries` 是 SQLite 優先的 API，不需要會話儲存路徑。狀態摘要、本機代理狀態、健康狀況和 `openclaw sessions` 列出命令現在直接讀取每個代理的列，並顯示每個代理的 SQLite 資料庫路徑，而非 `sessions.json` 路徑。
- 使用 `upsertSessionEntry`、
  `deleteSessionEntry`、`listSessionEntries` 和 SQL 清理查詢取代全存儲刪除/插入。
  運行時已完成：熱路徑現在使用行 API 和衝突重試的行補丁；
  剩餘的全存儲導入/取代輔助函數僅限於遷移導入
  代碼和 SQLite 後端測試。
  - 刪除 `store-writer.ts` 和寫入器佇列測試。已完成。
  - 從會話
    行 upsert/patch 中刪除運行時舊版金鑰修剪和別名刪除參數。已完成。

5. 刪除運行時 JSON 註冊表行為。
   - 使沙箱註冊表讀寫僅使用 SQLite。已完成。
   - 僅從遷移步驟導入整體和分片 JSON。已完成。
   - 移除分片註冊表鎖和 JSON 寫入。已完成。

- 如果形狀保持熱路徑操作狀態，則保留一個類型化註冊表，而不是將註冊表行存儲為通用
  不透明 JSON。已完成。

6. 刪除檔案鎖形狀的會話變異。
   - 已完成運行時鎖建立和運行時鎖 API。
   - 獨立的舊版 `.jsonl.lock` doctor 清理通道已被移除。
   - `session.writeLock` 是 doctor 遷移的舊版配置，而不是類型化運行時
     設置。
   - 狀態完整性不再有單獨的孤立轉錄檔案修剪
     路徑；doctor 遷移在一個地方導入/移除舊版 JSONL 源。
   - 網關單例協調使用 `gateway_locks` 下的類型化 SQLite `state_leases` 行，並且不再公開檔案鎖目錄接縫。
   - 通用插件 SDK 去重持久化不再使用檔案鎖或 JSON
     檔案；它寫入共享的 SQLite 插件狀態行。已完成。
   - QMD 嵌入協調使用 SQLite 狀態租約代替
     `qmd/embed.lock`。已完成。

7. 使工作程序具有資料庫感知能力。
   - 工作程序開啟自己的 SQLite 連線。
   - 父程序擁有傳遞、通道回調和配置。
   - 工作程序接收代理 ID、運行 ID、檔案系統模式和 DB 註冊表
     身份，而不是即時句柄。
   - `vfs-only` 保持實驗狀態，並使用代理資料庫作為其存儲
     根目錄。
   - 首先保持每個活躍運行一個工作程序。池化可以等到 DB 連線
     生命週期和取消行為變得無趣時再進行。

8. 備份整合。
   - 教導備份程式透過 SQLite 備份或
     `VACUUM INTO` 來對全域和代理資料庫進行快照。已針對狀態資產下發現的 `*.sqlite` 檔案完成。
   - 新增 SQLite 完整性與架構版本的備份驗證。已針對
     備份建立與預設封存驗證完整性檢查完成。
   - 在 SQLite 中記錄備份執行中繼資料。透過共用的 `backup_runs`
     資料表完成，包含封存路徑、狀態與清單 JSON。
   - 新增從已驗證的封存快照還原的功能。已完成：`openclaw backup
restore` 在解壓縮前會進行驗證，使用驗證器的正規化
     清單，支援 `--dry-run`，並且在替換
     記錄的來源路徑前需要 `--yes`。
   - 僅在要求時包含 VFS/工作區匯出；請勿將 session
     內部匯出為 JSON 或 JSONL。

9. 刪除過時的測試與程式碼。已針對已知的執行時段 session 介面完成。

- 移除斷言執行時建立 `sessions.json` 或文字紀錄
  JSONL 檔案的測試。核心會話儲存庫、聊天、閘道文字紀錄事件、
  預覽、生命週期、指令會話條目更新、自動回覆重設/追蹤以及
  記憶核心 dreaming fixtures、核准目標路由、會話文字紀錄
  修復、安全權限修復、軌跡匯出和會話匯出均已完成。
  Active-memory 文字紀錄測試現在斷言 SQLite 範圍，且不會建立臨時或
  持續化的 JSONL 檔案。
  舊的心跳文字紀錄修剪回歸測試已被移除，因為
  執行時不再截斷 JSONL 文字紀錄。
  代理程式會話清單工具測試不再將舊版 `sessions.json` 路徑
  模型為閘道回應形狀；app/UI/macOS 測試使用 `databasePath`。
  `/status` 文字紀錄使用測試現在直接植入 SQLite 文字紀錄資料列
  而不是寫入 JSONL 檔案。
  閘道會話生命週期測試現在直接使用 SQLite 文字紀錄植入協助程式；
  舊的單行會話檔案 fixture 形狀已從重設
  和刪除覆蓋範圍中消失。
  `sessions.delete` 不再傳回檔案時代的 `archived: []` 欄位；刪除
  僅回報資料列變異結果。舊的 `deleteTranscript` 選項也
  不復存在：刪除會話會移除正規 `sessions` 根目錄並讓
  SQLite 級聯會話擁有的文字紀錄、快照和軌跡資料列，因此沒有
  呼叫者能遺留文字紀錄孤兒或遺忘清理分支。
  Context-engine 軌跡擷取測試現在從獨立的代理程式資料庫讀取 `trajectory_runtime_events`
  資列，而不是讀取
  `session.trajectory.jsonl`。
  Docker MCP 通道植入指令碼現在直接植入 SQLite 資列。直接的
  `sessions.json` 寫入僅限於 doctor fixtures。
  工具搜尋閘道 E2E 從 SQLite 文字紀錄資料列讀取工具呼叫證據
  而不是掃描 `agents/<agentId>/sessions/*.jsonl` 檔案。
  Memory-core 主機事件和會話語料庫暫存資料列現在位於共享的
  SQLite 插件狀態中；`events.jsonl` 和 `session-corpus/*.txt` 僅為
  舊版 doctor 遷移輸入。作用中的資料列使用 `memory/session-ingestion/`
  虛擬路徑，而非 `.dreams/session-corpus`。舊的 memory-core dreaming
  修復模組及其 CLI/Gateway 測試已被移除，因為執行時
  不再擁有該語料庫的檔案存檔修復功能。Memory-core
  橋接/公用成品測試不再公開 `.dreams/events.jsonl`；
  它們使用 SQLite 支援的虛擬 JSON 成品名稱。
  公用 SDK/Codex 測試文件現在說明 SQLite 會話狀態而非會話
  檔案，且 channel-turn 範例不再公開 `storePath` 引數。
  Matrix 同步狀態現在直接使用 SQLite 插件狀態儲存庫。作用中的
  用戶端/執行時合約傳遞帳戶儲存根目錄，而非 `bot-storage.json`
  路徑，且 doctor 會在刪除來源前將舊版 `bot-storage.json` 匯入 SQLite。
  QA Matrix 重新啟動/破壞性情境現在直接變更 SQLite 同步
  資列，而不是建立或刪除虛假的 `bot-storage.json` 檔案，且
  E2EE 基底傳遞同步儲存根目錄，而非虛假的
  `sync-store.json` 路徑。
  Matrix 儲存根目錄選取不再根據舊版同步/執行緒 JSON
  檔案評分根目錄；它使用持久根目錄中繼資料加上真實加密狀態。
  執行時 SQLite 會話後端測試套件不再偽造
  `sessions.json`；舊版來源 fixtures 現在位於匯入它們的 doctor
  測試中。
  閘道會話測試不再公開 `createSessionStoreDir` 協助程式或
  未使用的臨時會話儲存路徑設定；fixture 目錄為明確指定，且直接
  資列設定使用 SQLite 會話資料列命名。
  僅限 Doctor 的 JSON5 會話儲存解析器覆蓋範圍已從基礎設施測試移出
  並移至 doctor 遷移測試，因此執行時測試套件不再擁有舊版
  會話檔案解析。
  Microsoft Teams 執行時 SSO/待傳送上傳測試不再攜帶 JSON sidecar
  fixtures 或解析器；舊版 SSO 權杖解析僅存在於插件
  遷移模組中。Telegram 測試不再植入虛假的 `/tmp/*.json` 儲存
  路徑；它們直接重設 SQLite 支援的訊息快取。通用
  OpenClaw 測試狀態協助程式不再公開舊版 `auth-profiles.json`
  寫入器；doctor 認證遷移測試在該處本機擁有該 fixture。
  TUI 上次會話指標、執行核准、active-memory
  切換、Matrix 重複刪除/啟動驗證、Memory Wiki 來源同步、
  目前對話繫結、入門認證和 Hermes 秘密匯入的執行時測試不再
  製造舊的 sidecar 檔案或斷言舊檔名不存在。它們
  透過 SQLite 資列和公用儲存 API 證明行為；doctor/遷移
  測試是舊版來源檔名所屬的唯一位置。
  裝置/節點配對、通道 allowFrom、重新啟動意圖、
  重新啟動移交、會話傳遞佇列項目、設定健全狀況、iMessage
  快取、 cron 排程工作、PI 文字紀錄標頭、子代理程式登錄檔和受管理
  影像附件的執行時測試也不再建立已淘汰的 JSON/JSONL 檔案，僅為了證明
  它們被忽略或不存在。
  PI 溢位恢復不再具有 SessionManager 重寫/截斷
  退路：工具結果截斷和 context-engine 文字紀錄重寫會變更
  SQLite 文字紀錄資料列，然後從資料庫重新整理作用中的提示狀態。
  持續化的 SessionManager 訊息附加委派給原子 SQLite
  文字紀錄附加協助程式，以進行父項選取和等冪性。一般的
  中繼資料/自訂項目附加也會在 SQLite 內選取目前父項，因此
  停滯的管理員執行個體不會復活前 SQLite 的父項鏈競爭條件。
  用於輪次中期前檢查和 `sessions_yield` 的合成 PI 尾部清理現在
  直接修剪 SQLite 文字紀錄狀態；舊的 SessionManager 尾部移除
  橋接及其測試已被刪除。
  壓縮檢查點擷取也僅從 SQLite 擷取快照；呼叫者不再
  將作用中的 SessionManager 作為替代文字紀錄來源傳遞。
- 僅保留用於遷移的播種舊版文件的測試。
- JSON 檔案證明已被 SQL 行證明取代，用於活躍的運行時表面。

- 對舊版 session/cache JSON 路徑的運行時寫入新增靜態封鎖。已針對 repo guard 完成。

10. 使遷移報表可被稽核。
    - 在 SQLite 中記錄遷移運行，包含開始/結束時間戳記、來源路徑、來源雜湊、計數、警告和備份路徑。完成：legacy-state 遷移執行現在會持續儲存 `migration_runs` 報表，其中包含來源路徑/表格清單、來源檔案 SHA-256、大小、記錄計數、警告和備份路徑。完成：legacy-state 遷移執行也會持續儲存 `migration_sources` 行，用於來源層級的稽核以及未來的跳過/回填決策。
    - 使套用具冪等性。部分匯入後重新執行應該跳過已匯入的來源或透過穩定金鑰合併。完成：session 索引、逐字稿、傳遞佇列、外掛狀態、任務分類帳和代理擁有的全域 SQLite 行透過穩定金鑰或 upsert/replace 語意匯入，因此重新執行會合併而不會複製持久性行。
    - 匯入失敗必須將原始來源檔案保留在原處。完成：失敗的逐字稿匯入現在會將原始 JSONL 來源保留在其偵測到的路徑，並且 `migration_sources` 會將來源記錄為 `warning` 並附帶 `removed_source=0` 以供下一次 doctor 運行使用。

## 效能規則

- 每個執行緒/程序一個連線是可以的；請不要跨工作程式共用控制代碼。
- 使用 WAL、`foreign_keys=ON`、30 秒忙碌逾時和短 `BEGIN IMMEDIATE` 寫入交易。
- 保持寫入交易輔助程式同步，除非/直到非同步交易 API 新增明確的 mutex/背壓語意。
- 保持父項傳遞寫入為小型且交易式。
- 避免全店重寫；使用行層級 upsert/delete。
- 在移動熱程式碼之前，先新增 list-by-agent、list-by-session、updated-at、run id 和 expiration 路徑的索引。
- 將大型成品、媒體和向量儲存為 BLOB 或分塊 BLOB 行，而非 base64 或數值陣列 JSON。
- 保持不透明的外掛狀態項目小型且範圍受限。
- 新增用於 TTL/過期時間的 SQL 清理作業，以取代檔案系統修剪。
  對於資料庫擁有的執行時期儲存空間已經完成：媒體、外掛狀態、外掛 blob、
  持續性去重以及代理快取都會透過 SQLite 列到期。剩餘的
  檔案系統清理僅限於暫時具象化或明確的
  移除指令。

## 靜態禁令

新增一個檢查程式庫的機制，若對舊版狀態路徑進行新的執行時期寫入則會失敗：

- `sessions.json`
- `*.trajectory.jsonl` 除外，包括具象化的支援套件輸出
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
- 記憶核心 `.dreams/events.jsonl`
- 記憶核心 `.dreams/session-corpus/`
- 記憶核心 `.dreams/daily-ingestion.json`
- 記憶核心 `.dreams/session-ingestion.json`
- 記憶核心 `.dreams/short-term-recall.json`
- 記憶核心 `.dreams/phase-signals.json`
- 記憶核心 `.dreams/short-term-promotion.lock`
- 技能工作坊 `skill-workshop/<workspace>.json`
- 技能工作坊 `skill-workshop/skill-workshop-review-*.json`
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
- sandbox registry shard JSON 檔案
- native hook relay `/tmp` bridge JSON 檔案
- `plugin-state/state.sqlite`
- ad-hoc `openclaw-state.sqlite` runtime sidecars
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
- Memory Wiki `.openclaw-wiki/log.jsonl`
- 記憶維基 `.openclaw-wiki/state.json`
- 記憶維基 `.openclaw-wiki/locks/`
- 記憶維基 `.openclaw-wiki/source-sync.json`
- 記憶維基 `.openclaw-wiki/import-runs/*.json`
- 記憶維基 `.openclaw-wiki/cache/agent-digest.json`
- 記憶維基 `.openclaw-wiki/cache/claims.jsonl`
- ClawHub `.clawhub/lock.json`
- ClawHub `.clawhub/origin.json`
- 瀏覽器設定檔裝飾 `.openclaw-profile-decorated`
- `SessionManager.open(...)` 檔案支援的會話開啟器
- `SessionManager.listAll(...)` 和 `TranscriptSessionManager.listAll(...)`
  逐字稿清單外觀
- `SessionManager.forkFromSession(...)` 和
  `TranscriptSessionManager.forkFromSession(...)` 逐字稿分支外觀
- `SessionManager.newSession(...)` 和 `TranscriptSessionManager.newSession(...)`
  可變會話替換外觀
- `SessionManager.createBranchedSession(...)` 和
  `TranscriptSessionManager.createBranchedSession(...)` 分支會話外觀

此禁令應允許測試建立舊版固定裝置，並允許遷移程式碼
讀取/匯入/移除舊版檔案來源。未發貨的 SQLite 副檔名仍維持禁用
狀態，且不獲得 doctor 匯入許可。

## 完成標準

- 執行階段資料與快取寫入會進入全域或代理 SQLite 資料庫。
- 執行階段不再寫入會話索引、逐字稿 JSONL、沙盒登錄檔
  JSON、任務副檔名 SQLite 或外掛狀態副檔名 SQLite。未發貨的任務
  與外掛狀態副檔名 SQLite 匯入器將被刪除。
- 舊版檔案匯入僅限 doctor 使用。
- 備份會產生一個包含精簡 SQLite 快照與完整性證明的封存檔。
- 代理工作程式可使用磁碟、VFS 暫存區或實驗性純 VFS
  儲存來執行。
- 設定與明確的憑證檔案仍為唯一預期的持久化
  非資料庫控制檔案。
- Repo 檢查會防止重新引入舊版執行階段檔案儲存。
