---
summary: "透過核心中一等公民的 ACP 控制平面以及外掛支援的執行時（首先是 acpx）來整合 ACP 編程代理"
owner: "onutc"
status: "草稿"
last_updated: "2026-02-25"
title: "ACP 執行緒綁定代理"
---

# ACP 執行緒綁定代理

## 概述

此計劃定義了 OpenClaw 應如何在支援執行緒的頻道（首先是 Discord）中支援 ACP 編程代理，並具備生產級別的生命週期和恢復能力。

相關文件：

- [統一執行時串流重構計劃](/zh-Hant/experiments/plans/acp-unified-streaming-refactor)

目標使用者體驗：

- 使用者生成或將 ACP 會話聚焦到執行緒中
- 該執行緒中的使用者訊息路由到綁定的 ACP 會話
- 代理輸出串流回傳至相同的執行緒人設
- 會話可以是持久性的或單次的，並具有明確的清理控制

## 決策摘要

長期建議是一種混合架構：

- OpenClaw 核心負責 ACP 控制平面相關事項
  - 會話身份和元數據
  - 執行緒綁定和路由決策
  - 傳遞不變性和重複抑制
  - 生命週期清理和恢復語義
- ACP 執行時後端是可插拔的
  - 第一個後端是由 acpx 支援的外掛服務
  - 執行時處理 ACP 傳輸、佇列、取消和重新連線

OpenClaw 不應在核心中重新實作 ACP 傳輸內部機制。
OpenClaw 不應僅依賴純外掛的攔截路徑來進行路由。

## 北極星架構（終極目標）

將 ACP 視為 OpenClaw 中的一等公民控制平面，並配備可插拔的執行時適配器。

不可協商的不變性：

- 每個 ACP 執行緒綁定都引用一個有效的 ACP 會話記錄
- 每個 ACP 會話都具有明確的生命週期狀態 (`creating`, `idle`, `running`, `cancelling`, `closed`, `error`)
- 每個 ACP 執行都具有明確的執行狀態 (`queued`, `running`, `completed`, `failed`, `cancelled`)
- spawn、bind 和 initial enqueue 是原子操作
- 指令重試具有冪等性（不會有重複運行或重複的 Discord 輸出）
- 綁定線程的頻道輸出是 ACP 運行事件的投影，絕非臨時副作用

長期所有權模型：

- `AcpSessionManager` 是唯一的 ACP 寫入器和編排器
- 管理器首先存活於 gateway 程序中；之後可以在相同的介面後移至專用的 sidecar
- 對於每個 ACP session key，管理器擁有一個記憶體中的 actor（序列化的指令執行）
- 適配器（`acpx`、未來的後端）僅實現傳輸/運行時

長期持久化模型：

- 將 ACP 控制平面狀態移至 OpenClaw 狀態目錄下的專用 SQLite 存儲（WAL 模式）
- 在遷移期間將 `SessionEntry.acp` 保留為兼容性投影，而非真實來源
- 僅追加存儲 ACP 事件以支援重放、崩潰恢復和確定性傳遞

### 交付策略（通往聖杯的橋樑）

- 短期橋樑
  - 保留當前的線程綁定機制和現有的 ACP 配置介面
  - 修復元數據缺口錯誤，並通過單一核心 ACP 分支路由 ACP 輪次
  - 立即添加冪等性鍵和失效關閉 路由檢查
- 長期切換
  - 將 ACP 真實來源移至控制平面 DB + actors
  - 使綁定線程的交付完全基於事件投影
  - 移除依賴於機會性會話條目元數據的舊版回退行為

## 為什麼不僅採用純插件

當前的插件掛鉤不足以在沒有核心更改的情況下進行端到端的 ACP 會話路由。

- 來自線程綁定的入站路由首先在核心調度 中解析為會話密鑰
- 訊息掛鉤是即發即棄 的，無法短路主回覆路徑
- 插件指令適用於控制操作，但不適用於替換核心的每輪調度流程

結果：

- ACP 運行時可以插件化
- ACP 路由分支必須存在於核心中

## 可重用的現有基礎

已實現且應保持正統性：

- 線程綁定目標支援 `subagent` 和 `acp`
- 入站線程路由覆蓋在正常調度之前通過綁定解析
- 通過回覆交付中的 webhook 實現出站線程身份
- `/focus` 和 `/unfocus` 流程，並具有 ACP 目標相容性
- 啟動時可還原的持久化綁定儲存
- 在封存、刪除、取消聚焦、重置和刪除時解除綁定生命週期

此計畫擴展了該基礎，而非替換它。

## 架構

### 邊界模型

核心（必須位於 OpenClaw 核心中）：

- 回覆管線中的 ACP 會話模式派發分支
- 交付仲裁以避免父項加上執行緒重複
- ACP 控制平面持久化（遷移期間具有 `SessionEntry.acp` 相容性投影）
- 生命週期解除綁定和執行時分離語義綁定到會話重置/刪除

外掛程式後端（acpx 實作）：

- ACP 執行時工作程序監督
- acpx 程序調用和事件解析
- ACP 指令處理程式（`/acp ...`）和操作員 UX
- 後端特定配置預設和診斷

### 執行時所有權模型

- 一個閘道程序擁有 ACP 編排狀態
- ACP 執行透過 acpx 後端在受監督的子程序中執行
- 程序策略是針對每個作用中的 ACP 會話金鑰長期存在，而非每則訊息

這避免了每次提示的啟動成本，並保持取消和重新連線語意的可靠性。

### 核心執行時合約

新增一個核心 ACP 執行時合約，以便路由程式碼不依賴 CLI 詳細資訊，並且無需更改派發邏輯即可切換後端：

```ts
export type AcpRuntimePromptMode = "prompt" | "steer";

export type AcpRuntimeHandle = {
  sessionKey: string;
  backend: string;
  runtimeSessionName: string;
};

export type AcpRuntimeEvent =
  | { type: "text_delta"; stream: "output" | "thought"; text: string }
  | { type: "tool_call"; name: string; argumentsText: string }
  | { type: "done"; usage?: Record<string, number> }
  | { type: "error"; code: string; message: string; retryable?: boolean };

export interface AcpRuntime {
  ensureSession(input: {
    sessionKey: string;
    agent: string;
    mode: "persistent" | "oneshot";
    cwd?: string;
    env?: Record<string, string>;
    idempotencyKey: string;
  }): Promise<AcpRuntimeHandle>;

  submit(input: {
    handle: AcpRuntimeHandle;
    text: string;
    mode: AcpRuntimePromptMode;
    idempotencyKey: string;
  }): Promise<{ runtimeRunId: string }>;

  stream(input: {
    handle: AcpRuntimeHandle;
    runtimeRunId: string;
    onEvent: (event: AcpRuntimeEvent) => Promise<void> | void;
    signal?: AbortSignal;
  }): Promise<void>;

  cancel(input: {
    handle: AcpRuntimeHandle;
    runtimeRunId?: string;
    reason?: string;
    idempotencyKey: string;
  }): Promise<void>;

  close(input: { handle: AcpRuntimeHandle; reason: string; idempotencyKey: string }): Promise<void>;

  health?(): Promise<{ ok: boolean; details?: string }>;
}
```

實作細節：

- 第一個後端：`AcpxRuntime` 作為外掛程式服務發行
- 核心透過登錄解析執行時，當沒有 ACP 執行時後端可用時失敗並顯示明確的操作員錯誤

### 控制平面資料模型和持久化

長期事實來源是專用的 ACP SQLite 資料庫（WAL 模式），用於交易更新和當機安全復原：

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

- 在遷移期間將 `SessionEntry.acp` 保留為相容性投影
- 程序 ID 和 sockets 僅保留在記憶體中
- 持久化的生命週期和執行狀態存儲於 ACP DB 中，而非通用的 session JSON
- 如果執行時期擁有者死亡，閘道會從 ACP DB 重新恢復並從檢查點繼續

### 路由與傳遞

入站：

- 將當前線程綁定查找保留為第一步路由
- 如果綁定的目標是 ACP session，則路由到 ACP 執行時期分支而非 `getReplyFromConfig`
- 明確的 `/acp steer` 指令使用 `mode: "steer"`

出站：

- ACP 事件串流被正規化為 OpenClaw 回覆區塊
- 傳遞目標透過現有的綁定目標路徑解析
- 當該 session 回合的綁定線程處於活動狀態時，父頻道的完成會被抑制

串流政策：

- 使用合併視窗串流部分輸出
- 可配置的最小間隔和最大區塊位元組數，以保持在 Discord 速率限制之下
- 最後一條訊息總是在完成或失敗時發送

### 狀態機與事務邊界

Session 狀態機：

- `creating -> idle -> running -> idle`
- `running -> cancelling -> idle | error`
- `idle -> closed`
- `error -> idle | closed`

Run 狀態機：

- `queued -> running -> completed`
- `running -> failed | cancelled`
- `queued -> cancelled`

必需的事務邊界：

- spawn 事務
  - 建立 ACP session 資料列
  - 建立/更新 ACP thread binding 資料列
  - 將初始 run 資料列加入佇列
- 關閉事務
  - 將 session 標記為已關閉
  - 刪除/過期 binding 資料列
  - 寫入最終的關閉事件
- cancel 事務
  - 使用冪等鍵將目標 run 標記為正在取消/已取消

在這些邊界之間不允許部分成功。

### Per-session Actor 模型

`AcpSessionManager` 針對每個 ACP session key 執行一個 actor：

- actor mailbox 串行化 `submit`、`cancel`、`close` 和 `stream` 的副作用
- actor 擁有該 session 的 runtime handle hydration 和 runtime adapter process lifecycle
- actor 在任何 Discord 傳遞之前按順序寫入 run 事件 (`seq`)
- actor 在成功發送 outbound 後更新傳遞檢查點

這消除了跨回合競爭並防止重複或亂序的 thread 輸出。

### 冪等性與傳遞投影

所有外部 ACP 動作都必須攜帶冪等鍵：

- spawn 冪等鍵
- prompt/steer 冪等鍵
- cancel 冪等鍵
- close 冪等鍵

傳遞規則：

- Discord 訊息源自 `acp_events` 加上 `acp_delivery_checkpoint`
- 重試會從檢查點恢復，而不會重新發送已傳遞的區塊
- 最終回覆的發送從投影邏輯來看是每次 run 僅一次 (exactly-once)

### 恢復與自我修復

Gateway 啟動時：

- 載入非終結態 ACP sessions (`creating`、`idle`、`running`、`cancelling`、`error`)
- 在首次 inbound 事件時延遲重建 actor，或在設定上限下主動重建
- 協調任何缺少心跳的 `running` 執行並標記 `failed` 或透過配接器復原

在收到 Discord 執行緒傳入訊息時：

- 如果綁定存在但 ACP 會話遺失，則封閉式失敗並明確顯示過期綁定訊息
- 在操作員安全的驗證後，選擇性地自動解除綁定過期的綁定
- 切勿將過期的 ACP 綁定以靜默方式路由至正常 LLM 路徑

### 生命週期與安全性

支援的操作：

- 取消當前執行：`/acp cancel`
- 解除綁定執行緒：`/unfocus`
- 關閉 ACP 會話：`/acp close`
- 透過有效 TTL 自動關閉閒置會話

TTL 政策：

- 有效 TTL 為以下項目的最小值
  - 全域/會話 TTL
  - Discord 執行緒綁定 TTL
  - ACP 執行時擁有者 TTL

安全控制：

- 依名稱允許清單管理 ACP 代理程式
- 限制 ACP 會話的工作區根目錄
- 環境變數允許清單傳遞
- 每個帳戶及全域的最大並發 ACP 會話數
- 執行時崩潰的有限重試退避

## 設定介面

核心鍵值：

- `acp.enabled`
- `acp.dispatch.enabled` (獨立 ACP 路由終止開關)
- `acp.backend` (預設 `acpx`)
- `acp.defaultAgent`
- `acp.allowedAgents[]`
- `acp.maxConcurrentSessions`
- `acp.stream.coalesceIdleMs`
- `acp.stream.maxChunkChars`
- `acp.runtime.ttlMinutes`
- `acp.controlPlane.store` (`sqlite` 預設值)
- `acp.controlPlane.storePath`
- `acp.controlPlane.recovery.eagerActors`
- `acp.controlPlane.recovery.reconcileRunningAfterMs`
- `acp.controlPlane.checkpoint.flushEveryEvents`
- `acp.controlPlane.checkpoint.flushEveryMs`
- `acp.idempotency.ttlHours`
- `channels.discord.threadBindings.spawnAcpSessions`

外掛程式/後端鍵值 (acpx 外掛程式區段)：

- 後端指令/路徑覆寫
- 後端 env 允許清單
- 後端各代理程式預設集
- 後端啟動/停止逾時
- 後端每個會話的最大進行中執行數

## 實作規格

### 控制平面模組 (新)

在核心中新增專用的 ACP 控制平面模組：

- `src/acp/control-plane/manager.ts`
  - 擁有 ACP 參與者、生命週期轉換、指令序列化
- `src/acp/control-plane/store.ts`
  - SQLite 架構管理、交易、查詢輔助程式
- `src/acp/control-plane/events.ts`
  - 型別化 ACP 事件定義與序列化
- `src/acp/control-plane/checkpoint.ts`
  - 持久化傳遞檢查點與重播游標
- `src/acp/control-plane/idempotency.ts`
  - 等冪性鍵保留與回應重播
- `src/acp/control-plane/recovery.ts`
  - 啟動時協調與 Actor 重新載入計畫

相容性橋接模組：

- `src/acp/runtime/session-meta.ts`
  - 暫時保留以投射至 `SessionEntry.acp`
  - 在遷移切換後必須停止作為真實來源

### 必要不變性（必須在程式碼中執行）

- ACP 工作階段建立與執行緒綁定為原子性（單一交易）
- 每個 ACP 工作階段 Actor 在任何時刻最多只能有一個執行中的執行
- 每次執行中事件 `seq` 嚴格遞增
- 傳遞檢查點絕不超過最後一次認可的事件
- 等冪性重播會針對重複的指令鍵回傳先前的成功回應
- 過時/遺失的 ACP 中繼資料不得路由至一般非 ACP 回應路徑

### 核心接觸點

需要變更的核心檔案：

- `src/auto-reply/reply/dispatch-from-config.ts`
  - ACP 分支呼叫 `AcpSessionManager.submit` 與事件投射傳遞
  - 移除繞過控制平面不變性的直接 ACP 後援
- `src/auto-reply/reply/inbound-context.ts`（或最近的正規化內容邊界）
  - 為 ACP 控制平面公開正規化路由鍵與等冪種子
- `src/config/sessions/types.ts`
  - 將 `SessionEntry.acp` 保留為僅投射的相容性欄位
- `src/gateway/server-methods/sessions.ts`
  - 重置/刪除/封存必須呼叫 ACP 管理器的關閉/解綁交易路徑
- `src/infra/outbound/bound-delivery-router.ts`
  - 對 ACP 綁定工作階段回合執行失敗封閉（fail-closed）的目的地行為
- `src/discord/monitor/thread-bindings.ts`
  - 加入連線至控制平面查詢的 ACP 過時綁定驗證輔助程式
- `src/auto-reply/reply/commands-acp.ts`
  - 透過 ACP 管理器 API 路由生成/取消/關閉/導引
- `src/agents/acp-spawn.ts`
  - 停止臨時的中繼資料寫入；呼叫 ACP 管理器生成交易
- `src/plugin-sdk/**` 與外掛執行時期橋接
  - 清晰地公開 ACP 後端註冊與健康語意

明確不替換的核心檔案：

- `src/discord/monitor/message-handler.preflight.ts`
  - 保持執行緒繫結覆寫行為作為標準的 session-key 解析器

### ACP 執行時期註冊表 API

新增一個核心註冊表模組：

- `src/acp/runtime/registry.ts`

必要的 API：

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

- `requireAcpRuntimeBackend` 在無法使用時拋出一個型別化的 ACP 後端遺失錯誤
- 外掛服務在 `start` 上註冊後端，並在 `stop` 上取消註冊
- 執行時期查詢是唯讀且僅限於處理程序本地的

### acpx 執行時期外掛合約 (實作細節)

對於第一個生產後端 (`extensions/acpx`)，OpenClaw 和 acpx 之間
使用嚴格的指令合約連接：

- 後端 id: `acpx`
- 外掛服務 id: `acpx-runtime`
- 執行時期控制代碼編碼: `runtimeSessionName = acpx:v1:<base64url(json)>`
- 編碼的酬載欄位：
  - `name` (acpx 命名 session；使用 OpenClaw `sessionKey`)
  - `agent` (acpx agent 指令)
  - `cwd` (session 工作區根目錄)
  - `mode` (`persistent | oneshot`)

指令對應：

- 確保 session：
  - `acpx --format json --json-strict --cwd <cwd> <agent> sessions ensure --name <name>`
- 提示回合：
  - `acpx --format json --json-strict --cwd <cwd> <agent> prompt --session <name> --file -`
- 取消：
  - `acpx --format json --json-strict --cwd <cwd> <agent> cancel --session <name>`
- 關閉：
  - `acpx --format json --json-strict --cwd <cwd> <agent> sessions close <name>`

串流處理：

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

- 階段 A：雙寫入 (`acp` 投影 + ACP SQLite 真實來源)
- 階段 B：從 ACP SQLite 讀取主要資料，從舊版 `SessionEntry.acp` 進行後備讀取
- 階段 C：遷移指令從有效的舊版項目回填遺失的 ACP 列
- 階段 D：移除 fallback-read 並將 projection 保持為可選，僅用於 UX
- 舊版欄位 (`cliSessionIds`, `claudeCliSessionId`) 保持不變

### 錯誤合約

新增穩定的 ACP 錯誤代碼和面向使用者的訊息：

- `ACP_BACKEND_MISSING`
  - 訊息：`ACP runtime backend is not configured. Install and enable the acpx runtime plugin.`
- `ACP_BACKEND_UNAVAILABLE`
  - 訊息：`ACP runtime backend is currently unavailable. Try again in a moment.`
- `ACP_SESSION_INIT_FAILED`
  - 訊息：`Could not initialize ACP session runtime.`
- `ACP_TURN_FAILED`
  - 訊息：`ACP turn failed before completion.`

規則：

- 在執行緒內回傳可執行的使用者安全訊息
- 僅在執行時日誌中記錄詳細的後端/系統錯誤
- 當明確選擇 ACP 路由時，切勿靜默回退至正常的 LLM 路徑

### 重複傳遞仲裁

針對 ACP 綁定回合的單一路由規則：

- 如果目標 ACP session 和請求者內容存在有效的執行緒綁定，則僅傳遞至該綁定的執行緒
- 不要針對同一回合也傳送至父頻道
- 如果綁定的目標選擇不明確，則以明確錯誤失敗關閉（無隱含的父級回退）
- 如果不存在有效的綁定，則使用正常的 session 目標行為

### 可觀測性和運營就緒狀態

必要的指標：

- 按後端和錯誤代碼統計的 ACP 產生成功/失敗次數
- ACP 執行延遲百分位數（佇列等待時間、執行時回合時間、傳遞 projection 時間）
- ACP actor 重新啟動次數和重新啟動原因
- 過時綁定偵測次數
- 等幂性重放命中率
- Discord 傳遞重試和速率限制計數器

必要的日誌：

- 以 `sessionKey`、`runId`、`backend`、`threadId`、`idempotencyKey` 為鍵的結構化日誌
- session 和執行狀態機的明確狀態轉換日誌
- 包含可安全編輯參數和退出摘要的配接器命令日誌

必要的診斷：

- `/acp sessions` 包含狀態、有效的執行、上次錯誤和綁定狀態
- `/acp doctor`（或同等工具）驗證後端註冊、儲存體健康狀態和過時綁定

### 設定優先順序和有效值

ACP 啟用優先順序：

- 帳號覆寫：`channels.discord.accounts.<id>.threadBindings.spawnAcpSessions`
- 頻道覆寫：`channels.discord.threadBindings.spawnAcpSessions`
- 全域 ACP 閘道：`acp.enabled`
- 分派閘道：`acp.dispatch.enabled`
- 後端可用性：`acp.backend` 的已註冊後端

自動啟用行為：

- 當已設定 ACP (`acp.enabled=true`、`acp.dispatch.enabled=true` 或
  `acp.backend=acpx`)，外掛程式自動啟用會標記 `plugins.entries.acpx.enabled=true`
  除非被列在拒絕清單中或已明確停用

TTL 有效值：

- `min(session ttl, discord thread binding ttl, acp runtime ttl)`

### 測試對應

單元測試：

- `src/acp/runtime/registry.test.ts` (新增)
- `src/auto-reply/reply/dispatch-from-config.acp.test.ts` (新增)
- `src/infra/outbound/bound-delivery-router.test.ts` (擴充 ACP 失敗關閉案例)
- `src/config/sessions/types.test.ts` 或最接近的 session-store 測試 (ACP 元資料持續性)

整合測試：

- `src/discord/monitor/reply-delivery.test.ts` (ACP 繫結傳遞目標行為)
- `src/discord/monitor/message-handler.preflight*.test.ts` (ACP 繫結 session-key 路由連續性)
- 後端套件中的 acpx 外掛程式執行時間測試 (服務註冊/啟動/停止 + 事件正規化)

Gateway 端對端測試：

- `src/gateway/server.sessions.gateway-server-sessions-a.e2e.test.ts` (擴充 ACP 重設/删除生命週期覆蓋率)
- ACP 執緒輪次端對端測試，涵蓋生成、訊息、串流、取消、失去焦點、重新啟動復原

### 推出防護機制

新增獨立的 ACP 分派終止開關：

- `acp.dispatch.enabled` 預設 `false` 用於首次發布
- 當停用時：
  - ACP 生成/聚焦控制指令仍可繫結工作階段
  - ACP 分派路徑不會啟動
  - 使用者會收到明確訊息，指出 ACP 分派已由原則停用
- 金絲雀驗證後，可在後續發布中將預設值翻轉為 `true`

## 指令與 UX 計畫

### 新指令

- `/acp spawn <agent-id> [--mode persistent|oneshot] [--thread auto|here|off]`
- `/acp cancel [session]`
- `/acp steer <instruction>`
- `/acp close [session]`
- `/acp sessions`

### 現有指令相容性

- `/focus <sessionKey>` 繼續支援 ACP 目標
- `/unfocus` 保持目前的語意
- `/session idle` 和 `/session max-age` 取代舊的 TTL 覆寫

## 分階段推出

### 第 0 階段 ADR 和結構描述凍結

- 發布關於 ACP 控制平面所有權和介接器邊界的 ADR
- 凍結 DB 結構描述 (`acp_sessions`, `acp_runs`, `acp_bindings`, `acp_events`, `acp_delivery_checkpoint`, `acp_idempotency`)
- 定義穩定的 ACP 錯誤碼、事件合約以及狀態轉換防護機制

### 第一階段：核心中的控制平面基礎建設

- 實作 `AcpSessionManager` 和每個階段的 actor 執行環境
- 實作 ACP SQLite 存儲區和交易輔助程式
- 實作冪等存儲區和重新執行輔助程式
- 實作事件附加與傳遞檢查點模組
- 將 spawn/cancel/close API 連結至管理器，並確保交易保證

### 第二階段：核心路由與生命週期整合

- 將來自分派管道的執行緒綁定 ACP 回合路由至 ACP 管理器
- 當 ACP 綁定/會話不變數失敗時，強制執行失敗即關閉的路由
- 將重置/刪除/封存/取消聚焦生命週期與 ACP 關閉/解除綁定交易整合
- 新增過期綁定偵測和選用的自動解除綁定原則

### 第三階段：acpx 後端介接器/外掛程式

- 根據執行環境合約實作 `acpx` 介接器 (`ensureSession`, `submit`, `stream`, `cancel`, `close`)
- 新增後端健康檢查以及啟動/拆除註冊
- 將 acpx nd 事件正規化為 ACP 執行環境事件
- 強制執行後端逾時、程序監督以及重啟/退避原則

### 第四階段：傳遞投影與頻道使用者體驗 (以 Discord 為優先)

- 實作具備檢查點恢復功能的事件驅動頻道投影 (以 Discord 為優先)
- 合併串流區塊，並套用具速率限制意識的排清原則
- 保證每次執行僅傳送一次最終完成訊息
- 發布 `/acp spawn`, `/acp cancel`, `/acp steer`, `/acp close`, `/acp sessions`

### 第五階段：移轉與切換

- 引入對 `SessionEntry.acp` 投影和 ACP SQLite 事實來源的雙重寫入
- 為舊版 ACP 元資料列新增移轉公用程式
- 將讀取路徑切換至 ACP SQLite 主來源
- 移除依賴遺失 `SessionEntry.acp` 的舊版回退路由

### 第 6 階段：強化、SLO 與擴展限制

- 執行並行限制（全域/帳號/工作階段）、佇列原則與逾時預算
- 新增完整遙測、儀表板與警示閾值
- 混亂測試崩潰復原與重複傳遞抑制
- 發布後端中斷、資料庫損壞與過時綁定修復的操作手冊

### 完整實作檢查清單

- 核心控制平面模組與測試
- 資料庫遷移與回滾計畫
- 跨派送與指令的 ACP 管理員 API 整合
- 外掛程式執行期橋接器中的轉接器註冊介面
- acpx 轉接器實作與測試
- 具備執行緒能力的通道傳遞投射邏輯與檢查點重播（優先 Discord）
- 重置/刪除/封存/取消聚焦的生命週期鉤子
- 過時綁定偵測器與操作員面向診斷
- 所有新增 ACP 金鑰的設定驗證與優先順序測試
- 操作文件與疑難排解手冊

## 測試計畫

單元測試：

- ACP 資料庫交易邊界（生成/綁定/入佇列原子性、取消、關閉）
- 工作階段與執行的 ACP 狀態機轉換防護
- 所有 ACP 指令的等幕性保留/重播語意
- 各工作階段執行者序列化與佇列排序
- acpx 事件剖析器與區塊合併器
- 執行期監督器重啟與退避原則
- 設定優先順序與有效 TTL 計算
- 核心 ACP 路由分支選擇與當後端/工作階段無效時的失效關閉行為

整合測試：

- 用於決定性串流與取消行為的偽造 ACP 轉接器程序
- ACP 管理員 + 交易式持續性的派送整合
- 執行緒繫結的傳入路由至 ACP 工作階段金鑰
- 執行緒繫結的傳出傳遞抑制父頻道重複
- 檢查點重播在傳遞失敗後復原並從最後一個事件恢復
- 外掛程式服務註冊與 ACP 執行期後端拆除

Gateway 端對端測試：

- 使用執行緒生成 ACP、交換多輪提示、取消聚焦
- 使用持續化的 ACP 資料庫與綁定重新啟動 Gateway，然後繼續相同工作階段
- 多個執行緒中的並行 ACP 工作階段無交叉干擾
- 重複指令重試（相同等幕金鑰）不會建立重複執行或回覆
- 過時綁定場景產生明確錯誤與可選的自動清理行為

## 風險與緩解措施

- 過渡期間的重複傳遞
  - 緩解措施：單一目標解析器與冪等事件檢查點
- 負載下的執行時程序更動
  - 緩解措施：長壽命的每個會話擁有者 + 並發上限 + 退避
- 外掛程式遺失或配置錯誤
  - 緩解措施：明確的面向操作員的錯誤與失敗關閉的 ACP 路由（無隱式回退至正常會話路徑）
- 子代理程式與 ACP 閘道之間的配置混亂
  - 緩解措施：明確的 ACP 金鑰，以及包含有效策略來源的命令回饋
- 控制平面存放區損毀或移轉錯誤
  - 緩解措施：WAL 模式、備份/還原勾點、移轉冒煙測試，以及唯讀回退診斷
- 執行器死鎖或信箱飢餓
  - 緩解措施：看門狗計時器、執行器健康探測，以及帶有拒絕遙測的有限信箱深度

## 驗收檢查清單

- ACP 會話生成可以在支援的通道配接器中（目前為 Discord）建立或綁定執行緒
- 所有執行緒訊息僅路由至綁定的 ACP 會話
- ACP 輸出以串流或批次形式出現在同一執行緒身分中
- 綁定輪次在父頻道中沒有重複輸出
- spawn+bind+initial enqueue 在持久存放區中為原子操作
- ACP 命令重試為冪等操作，不會重複執行或輸出
- cancel、close、unfocus、archive、reset 和 delete 執行確定性清理
- 當機重新啟動會保留對應關係並恢復多輪次連續性
- 並發的執行緒綁定 ACP 會話獨立運作
- ACP 後端遺失狀態會產生明確的可操作錯誤
- 過時綁定會被偵測到並明確呈現（含可選的安全自動清理）
- 控制平面指標與診斷可供操作員使用
- 新的單元、整合和端對端覆蓋率測試通過

## 附錄：針對目前實作的重點重構（狀態）

這些是非阻塞性的後續工作，旨在確保目前功能集推出後 ACP 路徑的可維護性。

### 1) 集中 ACP 分派策略評估（已完成）

- 透過 `src/acp/policy.ts` 中的共用 ACP 策略協助程式實作
- dispatch、ACP 命令生命週期處理程式和 ACP 生成路徑現在會使用共用的策略邏輯

### 2) 依子命令領域拆分 ACP 命令處理程式（已完成）

- `src/auto-reply/reply/commands-acp.ts` 現在是一個薄層路由器
- 子指令行為被分割為：
  - `src/auto-reply/reply/commands-acp/lifecycle.ts`
  - `src/auto-reply/reply/commands-acp/runtime-options.ts`
  - `src/auto-reply/reply/commands-acp/diagnostics.ts`
  - `src/auto-reply/reply/commands-acp/shared.ts` 中的共享輔助函數

### 3) 依職責分割 ACP 會話管理器（已完成）

- 管理器被分割為：
  - `src/acp/control-plane/manager.ts` (公開外觀層 + 單例模式)
  - `src/acp/control-plane/manager.core.ts` (管理器實作)
  - `src/acp/control-plane/manager.types.ts` (管理器類型/依賴)
  - `src/acp/control-plane/manager.utils.ts` (正規化 + 輔助函數)

### 4) 選用的 acpx 執行時適配器清理

- `extensions/acpx/src/runtime.ts` 可以被分割為：
- 程序執行/監督
- nd 事件解析/正規化
- 執行時 API 介面 (`submit`, `cancel`, `close`, 等)
- 提高可測試性，並讓後端行為更容易審計

import footerZhHant from "/components/footer/zh-Hant.mdx";

<footerZhHant />
