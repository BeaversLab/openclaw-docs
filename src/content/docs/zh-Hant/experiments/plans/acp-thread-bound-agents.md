---
summary: "透過核心中的一等 ACP 控制平面以及外掛支援的執行時（優先 acpx）整合 ACP 編碼代理程式"
owner: "onutc"
status: "草稿"
last_updated: "2026-02-25"
title: "ACP 線程綁定代理程式"
---

# ACP 線程綁定代理程式

## 概述

本計畫定義了 OpenClaw 應如何在支援執行緒的頻道中（優先為 Discord），以生產級別的生命週期與復原機制來支援 ACP 編碼代理程式。

相關文件：

- [統一執行期串流重構計畫](/zh-Hant/experiments/plans/acp-unified-streaming-refactor)

目標使用者體驗：

- 使用者啟動或將 ACP 工作階段聚焦至執行緒中
- 該執行緒中的使用者訊息會路由到綁定的 ACP 工作階段
- 代理程式的輸出會串式傳回至同一個執行緒角色
- 工作階段可以是持續性的或一次性執行，並具有明確的清理控制

## 決策摘要

長期建議是一種混合式架構：

- OpenClaw 核心負責 ACP 控制平面相關事項
  - 工作階段識別與中繼資料
  - 執行緒綁定與路由決策
  - 交付不變性與重複抑制
  - 生命週期清理與復原語意
- ACP 運行時後端是可插拔的
  - 第一個後端是由 acpx 支援的插件服務
  - 運行時負責 ACP 傳輸、佇列、取消和重連

OpenClaw 不應在核心中重新實作 ACP 傳輸內部機制。
OpenClaw 不應依賴純僅透過插件攔截的路徑來進行路由。

## 北極星架構（聖杯）

將 ACP 視為 OpenClaw 中的一等控制平面，並具備可插拔的運行時適配器。

不可妥協的不變條件：

- 每個 ACP 執行緒綁定都引用一個有效的 ACP 會話記錄
- 每個 ACP 會話都有明確的生命週期狀態 (`creating`, `idle`, `running`, `cancelling`, `closed`, `error`)
- 每次 ACP 執行都有明確的執行狀態 (`queued`, `running`, `completed`, `failed`, `cancelled`)
- spawn、bind 和 initial enqueue 是原子性的
- 指令重試是等冪的（不會重複執行或重複輸出到 Discord）
- 綁定執行緒的頻道輸出是 ACP 執行事件的投影，絕非臨時副作用

長期擁有權模型：

- `AcpSessionManager` 是單一的 ACP 寫入器和協調器
- 管理器起初位於 gateway 程序中；之後可移至專用的 sidecar，但保持介面一致
- 對於每個 ACP session key，管理器擁有一個記憶體中的 actor（序列化指令執行）
- 適配器（`acpx`、未來的後端）僅為傳輸/執行時實作

長期持久化模型：

- 將 ACP 控制平面狀態移至 OpenClaw 狀態目錄下的專用 SQLite 存儲（WAL 模式）
- 在遷移期間將 `SessionEntry.acp` 作為兼容性投影保留，而非作為事實來源
- 以僅追加方式存儲 ACP 事件，以支援重放、崩潰恢復和確定性交付

### 交付策略（通往終極目標的橋樑）

- 短期橋接
  - 保持現有的執行緒綁定機制和現有的 ACP 配置表面
  - 修復元數據間隙錯誤，並將 ACP 輪次路由通過單一核心 ACP 分支
  - 立即添加等冪性鍵和失敗關閉路由檢查
- 長期切換
  - 將 ACP 事實來源移至控制平面 DB + actors
  - 使綁定執行緒的交付純粹基於事件投影
  - 移除依賴於機會主義 session-entry 元數據的舊版回退行為

## 為何不採用純外掛方案

當前的外掛掛鉤不足以在不進行核心更改的情況下實現端到端 ACP session 路由。

- 來自執行緒綁定的入站路由首先在核心調度中解析為 session key
- 訊息掛鉤是即發即棄的，無法短路主回覆路徑
- 外掛指令適用於控制操作，但不適合替換核心的每輪調度流程

結果：

- ACP 執行時可以外掛化
- ACP 路由分支必須存在於核心中

## 可重用的現有基礎

已實作且應保持為規範：

- 執行緒綁定目標支援 `subagent` 和 `acp`
- 入站執行緒路由覆蓋在正常調度之前通過綁定進行解析
- 通過回覆交付中的 webhook 進行出站執行緒身份識別
- `/focus` 和 `/unfocus` 流程與 ACP 目標相容
- 具備啟動時還原功能的持久化綁定存儲
- 在封存、刪除、取消聚焦、重置和刪除時解除綁定的生命週期

此計劃擴展了該基礎，而非取代它。

## 架構

### 邊界模型

核心（必須位於 OpenClaw 核心中）：

- 回覆管線中的 ACP 會話模式分派分支
- 傳遞仲裁以避免父訊息加上執行緒重複
- ACP 控制平面持久性（在遷移期間透過 `SessionEntry.acp` 相容性投射實現）
- 與會話重置/刪除相關的生命週期解綁和執行時分離語意

Plugin backend (acpx implementation):

- ACP runtime worker supervision
- acpx process invocation and event parsing
- ACP command handlers (`/acp ...`) and operator UX
- backend-specific config defaults and diagnostics

### Runtime ownership model

- one gateway process owns ACP orchestration state
- ACP execution runs in supervised child processes via acpx backend
- process strategy is long lived per active ACP session key, not per message

這避免了每次提示時的啟動成本，並確保取消和重新連接的語義可靠。

### 核心執行時合約

添加一個核心 ACP 執行時合約，使路由代碼不依賴 CLI 詳細信息，並且可以在不改變調度邏輯的情況下切換後端：

```ts
export type AcpRuntimePromptMode = "prompt" | "steer";

export type AcpRuntimeHandle = {
  sessionKey: string;
  backend: string;
  runtimeSessionName: string;
};

export type AcpRuntimeEvent = { type: "text_delta"; stream: "output" | "thought"; text: string } | { type: "tool_call"; name: string; argumentsText: string } | { type: "done"; usage?: Record<string, number> } | { type: "error"; code: string; message: string; retryable?: boolean };

export interface AcpRuntime {
  ensureSession(input: { sessionKey: string; agent: string; mode: "persistent" | "oneshot"; cwd?: string; env?: Record<string, string>; idempotencyKey: string }): Promise<AcpRuntimeHandle>;

  submit(input: { handle: AcpRuntimeHandle; text: string; mode: AcpRuntimePromptMode; idempotencyKey: string }): Promise<{ runtimeRunId: string }>;

  stream(input: { handle: AcpRuntimeHandle; runtimeRunId: string; onEvent: (event: AcpRuntimeEvent) => Promise<void> | void; signal?: AbortSignal }): Promise<void>;

  cancel(input: { handle: AcpRuntimeHandle; runtimeRunId?: string; reason?: string; idempotencyKey: string }): Promise<void>;

  close(input: { handle: AcpRuntimeHandle; reason: string; idempotencyKey: string }): Promise<void>;

  health?(): Promise<{ ok: boolean; details?: string }>;
}
```

實現細節：

- 第一個後端：`AcpxRuntime` 作為插件服務發布
- core 透過 registry 解析 runtime，並在沒有可用的 ACP runtime 後端時因明確的操作者錯誤而失敗

### 控制平面資料模型與持久性

長期的唯一真實來源是專用的 ACP SQLite 資料庫（WAL 模式），用於交易更新和崩潰安全恢復：

- `acp_sessions`
  - `session_key` (pk), `backend`, `agent`, `mode`, `cwd`, `state`, `created_at`, `updated_at`, `last_error`
- `acp_runs`
  - `run_id` (pk), `session_key` (fk), `state`, `requester_message_id`, `idempotency_key`, `started_at`, `ended_at`, `error_code`, `error_message`
- `acp_bindings`
  - `binding_key` (pk), `thread_id`, `channel_id`, `account_id`, `session_key` (fk), `expires_at`, `bound_at`
- `acp_events`
  - `event_id` (pk), `run_id` (fk), `seq`, `kind`, `payload_json`, `created_at`
- `acp_delivery_checkpoint`
  - `run_id` (pk/fk), `last_event_seq`, `last_discord_message_id`, `updated_at`
- `acp_idempotency`
  - `scope`, `idempotency_key`, `result_json`, `created_at`, 唯一的 `(scope, idempotency_key)`

```ts
export type AcpSessionMeta = {
  backend: string;
  agent: string;
  runtimeSessionName: string;
  mode: "persistent" | "oneshot";
  cwd?: string;
  state: "idle" | "running" | "error";
  lastActivityAt: number;
  lastError?: string;
};
```

儲存規則：

- 在遷移期間將 `SessionEntry.acp` 作為相容性投影保留
- 進程 ID 和 socket 僅保留在記憶體中
- 持久化的生命週期和運行狀態儲存在 ACP 資料庫中，而非通用會話 JSON
- 如果執行時期擁有者終止，閘道會從 ACP 資料庫重新載入並從檢查點恢復

### 路由與傳遞

入站：

- 保持目前的執行緒綁定查詢作為第一步路由
- 如果綁定的目標是 ACP session，則路由到 ACP runtime branch 而非 `getReplyFromConfig`
- 明確的 `/acp steer` 指令使用 `mode: "steer"`

出站：

- ACP 事件串流會被正規化為 OpenClaw 回覆區塊
- 傳遞目標是透過現有的綁定目標路徑解析
- 當該會話輪次有一個綁定執行緒處於活動狀態時，父頻道完成訊號將被抑制

串流策略：

- 透過合併視窗串流部分輸出
- 可設定的最小間隔和最大區塊位元組，以保持低於 Discord 速率限制
- 最終訊息始終在完成或失敗時發出

### 狀態機與交易邊界

會話狀態機：

- `creating -> idle -> running -> idle`
- `running -> cancelling -> idle | error`
- `idle -> closed`
- `error -> idle | closed`

Run state machine:

- `queued -> running -> completed`
- `running -> failed | cancelled`
- `queued -> cancelled`

Required transaction boundaries:

- spawn transaction
  - create ACP session row
  - create/update ACP thread binding row
  - enqueue initial run row
- close transaction
  - mark session closed
  - 刪除/過期綁定行
  - 寫入最終關閉事件
- 取消事務
  - 使用冪等鍵標記目標執行為取消中/已取消

在這些邊界之間不允許部分成功。

### 每個會話的 Actor 模型

`AcpSessionManager` 針對每個 ACP 會話金鑰執行一個 actor：

- actor mailbox 串行化 `submit`、`cancel`、`close` 和 `stream` 副作用
- actor 擁有該會話的 runtime handle hydration 和 runtime adapter process 生命週期
- actor 在任何 Discord 傳送之前，依序寫入執行事件 (`seq`)
- actor 在成功傳送出站訊息後更新傳送檢查點

這消除了跨輪次競態，並防止重複或亂序的線程輸出。

### 冪等性與交付預測

所有外部 ACP 操作都必須帶有冪等鍵：

- spawn 冪等鍵
- prompt/steer 冪等鍵
- cancel 冪等鍵
- close 冪等鍵

交付規則：

- Discord 訊息是從 `acp_events` 加上 `acp_delivery_checkpoint` 推導出來的
- 重試會從檢查點恢復，而不重新發送已傳送的區塊
- 最終回覆的發送是從投影邏輯每次執行僅一次

### 恢復與自我修復

在閘道啟動時：

- 載入非終止的 ACP 會話（`creating`、`idle`、`running`、`cancelling`、`error`）
- 在首次傳入事件時延遲重新建立 Actor，或在配置的限制內預先建立
- 協調任何 `running` 遺失心跳的執行並將其標記為 `failed` 或透過配接器還原

在收到 Discord 執行緒訊息時：

- 如果連結存在但 ACP 會話遺失，則以明確的過期連結訊息進行封閉式失敗
- 在操作員安全的驗證後，可選擇自動解除過期的連結
- 切勿將過期的 ACP 綁定無聲路由至正常 LLM 路徑

### 生命週期與安全性

支援的操作：

- 取消當前執行：`/acp cancel`
- 解綁執行緒：`/unfocus`
- 關閉 ACP 會話：`/acp close`
- 透過有效 TTL 自動關閉閒置會話

TTL 政策：

- 有效 TTL 為以下的最小值
  - 全域/會話 TTL
  - Discord 執行緒綁定 TTL
  - ACP 執行時擁有者 TTL

安全控制措施：

- 按名稱允許清單篩選 ACP 代理
- 限制 ACP 會段的工作區根目錄
- 環境變數允許清單直通
- 每個帳戶及全域的最大並發 ACP 會段數
- 針對執行時期當機的有界重啟退避

## 設定介面

核心鍵值：

- `acp.enabled`
- `acp.dispatch.enabled` （獨立 ACP 路由終止開關）
- `acp.backend` （預設 `acpx`）
- `acp.defaultAgent`
- `acp.allowedAgents[]`
- `acp.maxConcurrentSessions`
- `acp.stream.coalesceIdleMs`
- `acp.stream.maxChunkChars`
- `acp.runtime.ttlMinutes`
- `acp.controlPlane.store`（`sqlite` 預設值）
- `acp.controlPlane.storePath`
- `acp.controlPlane.recovery.eagerActors`
- `acp.controlPlane.recovery.reconcileRunningAfterMs`
- `acp.controlPlane.checkpoint.flushEveryEvents`
- `acp.controlPlane.checkpoint.flushEveryMs`
- `acp.idempotency.ttlHours`
- `channels.discord.threadBindings.spawnAcpSessions`

外掛程式/後端金鑰（acpx 外掛程式區段）：

- 後端指令/路徑覆寫
- 後端環境變數允許清單
- 後端各代理程式預設集
- 後端啟動/停止逾時
- 後端每個會話的最大進行中執行數

## 實作規格

### 控制平面模組（新增）

在核心中新增專用的 ACP 控制平面模組：

- `src/acp/control-plane/manager.ts`
  - 擁有 ACP 參與者、生命週期轉換、命令序列化
- `src/acp/control-plane/store.ts`
  - SQLite 結構管理、事務處理、查詢輔助程式
- `src/acp/control-plane/events.ts`
  - 類型化的 ACP 事件定義和序列化
- `src/acp/control-plane/checkpoint.ts`
  - 持久化傳送檢查點和重播遊標
- `src/acp/control-plane/idempotency.ts`
  - 冪等性金鑰保留和回應重播
- `src/acp/control-plane/recovery.ts`
  - 啟動時調和與 Actor 重填計劃

相容性橋接模組：

- `src/acp/runtime/session-meta.ts`
  - 暫時保留用於投影到 `SessionEntry.acp`
  - 在遷移切換後必須不再作為單一真實來源

### 所需不變性（必須在程式碼中強制執行）

- ACP 會話建立與執行緒綁定是原子的（單一交易）
- 每個 ACP 會話 actor 在任何時候至多只能有一個正在運行的執行
- 每次執行時，event `seq` 必須嚴格遞增
- delivery checkpoint 永遠不會超過最後一次提交的 event
- 冪等重放會針對重複的 command key 返回先前的成功 payload
- 過時/缺失的 ACP metadata 無法路由至正常的非 ACP 回覆路徑

### 核心接觸點

需要變更的核心檔案：

- `src/auto-reply/reply/dispatch-from-config.ts`
  - ACP branch 呼叫 `AcpSessionManager.submit` 以及 event-projection delivery
  - 移除繞過控制平面不變性的直接 ACP 後備機制
- `src/auto-reply/reply/inbound-context.ts` (或最近的正規化上下文邊界)
  - 為 ACP 控制平面公開正規化的路由鍵和冪等種子
- `src/config/sessions/types.ts`
  - 將 `SessionEntry.acp` 保留為僅用於投射的相容性欄位
- `src/gateway/server-methods/sessions.ts`
  - 重置/刪除/封存必須呼叫 ACP 管理器的關閉/解除繫結交易路徑
- `src/infra/outbound/bound-delivery-router.ts`
  - 針對 ACP 綁定會話輪次強制執行失敗關閉（fail-closed）的目標行為
- `src/discord/monitor/thread-bindings.ts`
  - 新增連接至控制平面查找的 ACP 陳舊綁定驗證輔助函式
- `src/auto-reply/reply/commands-acp.ts`
  - 透過 ACP 管理員 API 路由 spawn/cancel/close/steer
- `src/agents/acp-spawn.ts`
  - 停止臨時元資料寫入；呼叫 ACP 管理員 spawn 交易
- `src/plugin-sdk/**` 與插件運行時橋接
  - 乾淨地公開 ACP 後端註冊與健康語義

明確不替換的核心檔案：

- `src/discord/monitor/message-handler.preflight.ts`
  - 將執行緒綁定覆寫行為保留為標準的 session-key 解析器

### ACP 運行時註冊表 API

新增核心註冊表模組：

- `src/acp/runtime/registry.ts`

必備 API：

```ts
export type AcpRuntimeBackend = {
  id: string;
  runtime: AcpRuntime;
  healthy?: () => boolean;
};

export function registerAcpRuntimeBackend(backend: AcpRuntimeBackend): void;
export function unregisterAcpRuntimeBackend(id: string): void;
export function getAcpRuntimeBackend(id?: string): AcpRuntimeBackend | null;
export function requireAcpRuntimeBackend(id?: string): AcpRuntimeBackend;
```

行為：

- 當不可用時，`requireAcpRuntimeBackend` 會丟出一個型別化的 ACP 後端遺失錯誤
- 插件服務在 `start` 上註冊後端，並在 `stop` 上取消註冊
- runtime 查詢是唯讀的且僅限於行程內

### acpx runtime 插件合約（實作細節）

對於第一個生產環境後端 (`extensions/acpx`)，OpenClaw 和 acpx
使用嚴格的指令合約進行連接：

- 後端 ID：`acpx`
- 外掛服務 ID：`acpx-runtime`
- 執行時期控制代碼編碼：`runtimeSessionName = acpx:v1:<base64url(json)>`
- 編碼 Payload 欄位：
  - `name`（acpx 命名工作階段；使用 OpenClaw `sessionKey`）
  - `agent`（acpx 代理程式指令）
  - `cwd`（工作階段工作區根目錄）
  - `mode` (`persistent | oneshot`)

指令對應：

- 確保工作階段：
  - `acpx --format json --json-strict --cwd <cwd> <agent> sessions ensure --name <name>`
- 提示輪次：
  - `acpx --format json --json-strict --cwd <cwd> <agent> prompt --session <name> --file -`
- 取消：
  - `acpx --format json --json-strict --cwd <cwd> <agent> cancel --session <name>`
- 關閉：
  - `acpx --format json --json-strict --cwd <cwd> <agent> sessions close <name>`

串流：

- OpenClaw 從 `acpx --format json --json-strict` 消耗 nd 事件
- `text` => `text_delta/output`
- `thought` => `text_delta/thought`
- `tool_call` => `tool_call`
- `done` => `done`
- `error` => `error`

### Session 結構描述補丁

在 `src/config/sessions/types.ts` 中修補 `SessionEntry`：

```ts
type SessionAcpMeta = {
  backend: string;
  agent: string;
  runtimeSessionName: string;
  mode: "persistent" | "oneshot";
  cwd?: string;
  state: "idle" | "running" | "error";
  lastActivityAt: number;
  lastError?: string;
};
```

持久化欄位：

- `SessionEntry.acp?: SessionAcpMeta`

遷移規則：

- 階段 A：雙寫（`acp` 投影 + ACP SQLite 唯一真實來源）
- 階段 B：從 ACP SQLite 主要讀取，從舊版 `SessionEntry.acp` 後備讀取
- 階段 C：遷移指令從有效的舊版條目回填缺失的 ACP 資料列
- 階段 D：移除後備讀取，並僅為 UX 保留投影為可選
- 舊版欄位（`cliSessionIds`、`claudeCliSessionId`）保持不變

### 錯誤合約

加入穩定的 ACP 錯誤碼與使用者面向訊息：

- `ACP_BACKEND_MISSING`
  - message: `ACP runtime backend is not configured. Install and enable the acpx runtime plugin.`
- `ACP_BACKEND_UNAVAILABLE`
  - message: `ACP runtime backend is currently unavailable. Try again in a moment.`
- `ACP_SESSION_INIT_FAILED`
  - message: `Could not initialize ACP session runtime.`
- `ACP_TURN_FAILED`
  - message: `ACP turn failed before completion.`

Rules:

- return actionable user-safe message in-thread
- log detailed backend/system error only in runtime logs
- never silently fall back to normal LLM path when ACP routing was explicitly selected

### Duplicate delivery arbitration

Single routing rule for ACP bound turns:

- 如果目標 ACP 會話和請求者上下文存在活動的執行緒綁定，則僅傳送到該綁定的執行緒
- 請勿在同一輪次中也傳送到父頻道
- 如果綁定的目標選擇不明確，則以明確錯誤封閉失敗（無隱式父級回退）
- 如果不存在活動的綁定，則使用正常的會話目標行為

### 可觀測性和運營準備情況

所需指標：

- 按後端和錯誤代碼分類的 ACP 生成成功/失敗計數
- ACP 執行延遲百分位數（佇列等待時間、執行回合時間、傳遞預測時間）
- ACP 參與者（actor）重新啟動次數與重新啟動原因
- 過期綁定（stale-binding）偵測次數
- 等冪重放命中率
- Discord 傳遞重試與速率限制計數器

必要日誌：

- 以 `sessionKey`、`runId`、`backend`、`threadId`、`idempotencyKey` 為鍵的結構化日誌
- 針對工作階段和執行狀態機的明確狀態轉換日誌
- 配接器命令日誌，包含可安全編輯的引數和退出摘要

必要的診斷：

- `/acp sessions` 包含狀態、活躍執行、最後錯誤和綁定狀態
- `/acp doctor` (或同等功能) 驗證後端註冊、儲存狀況及過期綁定

### 設定優先順序與有效值

ACP 啟用優先順序：

- 帳戶覆寫： `channels.discord.accounts.<id>.threadBindings.spawnAcpSessions`
- 頻道覆寫： `channels.discord.threadBindings.spawnAcpSessions`
- 全域 ACP 閘道： `acp.enabled`
- 派送閘道： `acp.dispatch.enabled`
- 後端可用性：針對 `acp.backend` 的已註冊後端

自動啟用行為：

- 當已配置 ACP（`acp.enabled=true`、`acp.dispatch.enabled=true` 或
  `acp.backend=acpx`）時，除非被列入黑名單或明確停用，
  否則外掛程式自動啟用會標記 `plugins.entries.acpx.enabled=true`

TTL 有效值：

- `min(session ttl, discord thread binding ttl, acp runtime ttl)`

### 測試對應

單元測試：

- `src/acp/runtime/registry.test.ts` （新增）
- `src/auto-reply/reply/dispatch-from-config.acp.test.ts` （新增）
- `src/infra/outbound/bound-delivery-router.test.ts` （擴展 ACP 失效關閉案例）
- `src/config/sessions/types.test.ts` 或最近的 session-store 測試（ACP 元數據持久化）

整合測試：

- `src/discord/monitor/reply-delivery.test.ts` （綁定 ACP 傳遞目標行為）
- `src/discord/monitor/message-handler.preflight*.test.ts` （綁定 ACP session-key 路由連續性）
- 後端套件中的 acpx 插件運行時測試（服務註冊/啟動/停止 + 事件正規化）

Gateway 端對端測試：

- `src/gateway/server.sessions.gateway-server-sessions-a.e2e.test.ts`（擴充 ACP 重置/刪除生命週期覆蓋範圍）
- ACP 交談輪次端對端測試，涵蓋生成、訊息、串流、取消、失焦、重啟恢復

### 推出防護

新增獨立的 ACP 調度終止開關：

- 首次發佈時將 `acp.dispatch.enabled` 預設設為 `false`
- 當停用時：
  - ACP 產生/聚焦控制指令仍可能繫結工作階段
  - ACP 分派路徑不會啟動
  - 使用者收到明確訊息指出 ACP 分派已依原則停用
- 在金絲雀驗證之後，可在後續版本中將預設值切換為 `true`

## 指令與 UX 計畫

### 新指令

- `/acp spawn <agent-id> [--mode persistent|oneshot] [--thread auto|here|off]`
- `/acp cancel [session]`
- `/acp steer <instruction>`
- `/acp close [session]`
- `/acp sessions`

### 現有指令相容性

- `/focus <sessionKey>` 持續支援 ACP 目標
- `/unfocus` 保持目前的語意
- `/session idle` 和 `/session max-age` 取代舊的 TTL 覆寫

## 分階段推出

### 第 0 階段 ADR 和架構凍結

- 發布關於 ACP 控制平面所有權和介面卡邊界的 ADR
- 凍結 DB 結構描述 (`acp_sessions`, `acp_runs`, `acp_bindings`, `acp_events`, `acp_delivery_checkpoint`, `acp_idempotency`)
- 定義穩定的 ACP 錯誤代碼、事件契約以及狀態轉換防護

### 第一階段：核心中的控制平面基礎

- 實作 `AcpSessionManager` 以及每個會話的執行期 (actor runtime)
- 實作 ACP SQLite 儲存與交易輔助程式
- 實作等冪性儲存與重播輔助程式
- 實作事件附加與傳遞檢查點模組
- 將 spawn/cancel/close API 連接至管理器，並確保交易保證

### 第 2 階段：核心路由與生命週期整合

- 將來自派發管道的綁定執行緒 ACP 回合路由至 ACP 管理器
- 當 ACP 繫結/工作階段不變數失敗時，強制執行「故障封閉」路由
- 整合重置/刪除/歸檔/取消聚焦生命週期與 ACP 關閉/解除綁定事務
- 加入過期綁定偵測與選用的自動解除綁定政策

### 第 3 階段 acpx 後端介面卡/外掛

- 根據執行時期合約實作 `acpx` 介面卡 (`ensureSession`, `submit`, `stream`, `cancel`, `close`)
- 新增後端健康檢查及啟動/拆除註冊
- 將 acpx nd 事件正規化為 ACP 執行時期事件
- 強制執行後端逾時、程序監督以及重新啟動/退避策略

### 第 4 階段：交付投影與通道使用者體驗（以 Discord 為優先）

- 實作具檢查點恢復功能的事件驅動通道投影（以 Discord 為優先）
- 使用具速率限制感知的排空策略合併串流區塊
- 保證每次執行僅傳送一次最終完成訊息
- 發佈 `/acp spawn`、`/acp cancel`、`/acp steer`、`/acp close`、`/acp sessions`

### 第 5 階段：遷移與切換

- 引進雙寫至 `SessionEntry.acp` 投影以及 ACP SQLite 事實來源（source-of-truth）
- 為舊版 ACP 中繼資料列新增遷移公用程式
- 將讀取路徑切換為以 ACP SQLite 為主
- 移除依賴遺失 `SessionEntry.acp` 的舊版回退路由

### 階段 6 穩固、SLO 與擴展限制

- 執行並行限制（全域/帳戶/工作階段）、佇列策略與逾時預算
- 新增完整遙測、儀表板與警報閾值
- 混亂測試崩潰恢復與重複傳遞抑制
- 發布後端中斷、資料庫損壞和過時綁定修復的運作手冊

### 完整實作檢查清單

- 核心控制平面模組與測試
- 資料庫遷移與回滾計劃
- 跨派送與指令的 ACP 管理器 API 整合
- 外掛程式執行環境橋接器中的介面卡註冊介面
- acpx 介面卡實作與測試
- 具備執行緒能力的管道交付投影邏輯與檢查點重放（以 Discord 為優先）
- 用於重置/刪除/封存/取消聚焦的生命週期鉤子
- 過期繫結偵測器與操作員面向的診斷工具
- 所有新 ACP 金鑰的設定驗證與優先順序測試
- 操作文件與故障排除手冊

## 測試計畫

單元測試：

- ACP 資料庫交易邊界（生成/繫結/入佇列的原子性、取消、關閉）
- ACP 狀態機轉換防護，用於會話與執行
- 所有 ACP 指令的等冪性保留/重播語意
- 每個會話 actor 序列化與佇列排序
- acpx 事件解析器與區塊合併器
- 執行時期監督器重啟與退避策略
- 配置優先順序與有效 TTL 計算
- 核心 ACP 路由分支選擇，以及當後端/會話無效時的失效關閉行為

整合測試：

- 用於確定性串流與取消行為的假 ACP 配接器程序
- ACP 管理器 + 與交易式持久層的 dispatch 整合
- 綁定至 ACP session 金鑰的執行緒入站路由
- 綁定執行緒的出站傳遞會抑制父頻道的重複
- 檢查點重放會在傳遞失敗後復原並從最後一個事件繼續
- ACP runtime 後端的 plugin 服務註冊與拆除

Gateway e2e 測試：

- 以執行緒生成 ACP，交換多輪提示，取消聚焦
- 以持續化的 ACP DB 和綁定重新啟動 gateway，然後繼續同一個 session
- 多執行緒中的並發 ACP 工作階段不會發生交叉干擾
- 重複的指令重試（相同的冪等金鑰）不會建立重複的執行或回覆
- 過時綁定情境會產生明確錯誤與選用性的自動清理行為

## 風險與緩解措施

- 轉換期間的重複傳遞
  - 緩解措施：單一目標解析器與冪等事件檢查點
- 負載下的執行時程序更替
  - 緩解措施：長壽命的單次會話擁有者 + 並發上限 + 指數退避
- 外掛程式遺失或設定錯誤
  - 緩解措施：向操作員明確顯示錯誤並採取失效關閉的 ACP 路由（不隱式回退至正常會話路徑）
- 子代理與 ACP 閘道之間的設定混淆
  - 緩解措施：明確的 ACP 金鑰以及包含有效策略來源的指令回饋
- 控制平面存放區損壞或遷移錯誤
  - 緩解措施：WAL 模式、備份/還原掛鉤、遷移冒煙測試以及唯讀回退診斷
- Actor 死鎖或信箱飢餓
  - 緩解措施：看門狗計時器、Actor 健康探針，以及帶有拒絕遙測的有界信箱深度

## 驗收檢查清單

- ACP session spawn 可以在支援的通道介面卡中建立或綁定執行緒（目前為 Discord）
- 所有執行緒訊息僅路由至綁定的 ACP session
- ACP 輸出以串流或批次方式顯示在同一執行緒身分中
- 綁定回合在父頻道中沒有重複輸出
- spawn+bind+initial enqueue 在持久化儲存中是原子的
- ACP 指令重試是等冪的，且不會造成重複執行或輸出
- cancel、close、unfocus、archive、reset 和 delete 執行確定性清理
- 當機重啟會保留對應關係並恢復多輪對話的連續性
- 並行執行緒綁定 ACP 工作階段獨立運作
- ACP 後端缺少狀態時產生清晰可執行的錯誤
- 偵測到過時的綁定並明確顯示（可選擇安全的自動清理）
- 提供控制平面指標與診斷資訊供操作員使用
- 新的單元、整合與端對端測試覆蓋率通過

## 附錄：針對目前實作的重構（狀態）

這些是非阻礙性的後續工作，旨在當前功能集落地後保持 ACP 路徑的可維護性。

### 1) 集中化 ACP 調度策略評估（已完成）

- 透過 `src/acp/policy.ts` 中的共享 ACP 策略輔助函式實作
- dispatch、ACP 指令生命週期處理器和 ACP 生成路徑現在使用共享策略邏輯

### 2) 依子指令領域拆分 ACP 指令處理器（已完成）

- `src/auto-reply/reply/commands-acp.ts` 現在是一個精簡的路由器
- 子指令行為拆分為：
  - `src/auto-reply/reply/commands-acp/lifecycle.ts`
  - `src/auto-reply/reply/commands-acp/runtime-options.ts`
  - `src/auto-reply/reply/commands-acp/diagnostics.ts`
  - `src/auto-reply/reply/commands-acp/shared.ts` 中的共享輔助程式

### 3) 按職責拆分 ACP session manager（已完成）

- manager 拆分為：
  - `src/acp/control-plane/manager.ts`（public facade + singleton）
  - `src/acp/control-plane/manager.core.ts`（manager implementation）
  - `src/acp/control-plane/manager.types.ts` (管理員類型/依賴)
  - `src/acp/control-plane/manager.utils.ts` (正規化 + 輔助函數)

### 4) 選用性 acpx 執行時配接器清理

- `extensions/acpx/src/runtime.ts` 可拆分為：
- 程序執行/監督
- nd 事件解析/正規化
- 執行時 API 表面 (`submit`, `cancel`, `close`, 等)
- 提高可測試性，並使後端行為更容易稽核
