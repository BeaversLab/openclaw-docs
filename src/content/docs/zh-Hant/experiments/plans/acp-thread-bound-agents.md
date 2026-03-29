---
summary: "透過核心中的頂級 ACP 控制平面和外掛支援的執行時（優先考慮 acpx）整合 ACP 編碼代理"
owner: "onutc"
status: "草稿"
last_updated: "2026-02-25"
title: "ACP 線程綁定代理"
---

# ACP 線程綁定代理

## 概述

此計劃定義了 OpenClaw 應如何在支援線程的頻道（優先考慮 Discord）中支援 ACP 編碼代理，並具備生產級別的生命週期和恢復機制。

相關文件：

- [統一執行時串流重構計劃](/en/experiments/plans/acp-unified-streaming-refactor)

目標用戶體驗：

- 用戶生成或將 ACP 會話聚焦到線程中
- 該線程中的用戶訊息路由到綁定的 ACP 會話
- 代理輸出串流返回到相同的線程角色
- 會話可以是持久性的或一次性的，並具有明確的清理控制

## 決策摘要

長期建議採用混合架構：

- OpenClaw 核心擁有 ACP 控制平面相關事項
  - 會話身份和元數據
  - 線程綁定和路由決策
  - 交付不變性和重複抑制
  - 生命週期清理和恢復語義
- ACP 執行時後端是可插拔的
  - 第一個後端是由 acpx 支援的外掛服務
  - 執行時處理 ACP 傳輸、排隊、取消和重新連線

OpenClaw 不應在核心中重新實現 ACP 傳輸內部結構。
OpenClaw 不應依賴純外掛攔截路徑進行路由。

## 北極星架構（終極目標）

將 ACP 視為 OpenClaw 中頂級的控制平面，並具有可插拔的執行時適配器。

不可妥協的不變性：

- 每個 ACP 線程綁定都引用有效的 ACP 會話記錄
- 每個 ACP 會話都有明確的生命週期狀態 (`creating`, `idle`, `running`, `cancelling`, `closed`, `error`)
- 每個 ACP 運行都有明確的運行狀態 (`queued`, `running`, `completed`, `failed`, `cancelled`)
- 產生、綁定和初始入列是原子性的
- 指令重試具有等冪性（不會重複執行或輸出重複的 Discord 訊息）
- 綁定執行緒的頻道輸出是 ACP 執行事件的投影，絕非臨時的副作用

長期所有權模型：

- `AcpSessionManager` 是唯一的 ACP 寫入器和協調器
- 管理器最初位於閘道進程中；之後可在相同介面後方移至專用的 sidecar
- 針對每個 ACP 工階段金鑰，管理器擁有一個記憶體中的 actor（序列化的指令執行）
- 轉接器（`acpx` 及未來的後端）僅作為傳輸/執行時期的實作

長期持久化模型：

- 將 ACP 控制平面狀態移至 OpenClaw 狀態目錄下的專用 SQLite 儲存庫（WAL 模式）
- 在遷移期間將 `SessionEntry.acp` 保留為相容性投影，而非事實來源
- 僅附加儲存 ACP 事件，以支援重放、當機恢復和確定性交付

### 交付策略（通往最終目標的橋樑）

- 短期橋接
  - 保留目前的執行緒綁定機制和現有的 ACP 設定介面
  - 修復 metadata-gap 錯誤，並將 ACP 輪次路由至單一的核心 ACP 分支
  - 立即新增等冪性金鑰和失效關閉的路由檢查
- 長期切換
  - 將 ACP 的事實來源移至控制平面資料庫 + actors
  - 使綁定執行緒的交付完全基於事件投影
  - 移除依賴於臨時會話進入元資料的舊版後備行為

## 為何不使用純外掛

若無核心變更，目前的外掛掛勾不足以進行端到端的 ACP 會話路由。

- 來自執行緒綁定的入站路由會先在核心分派中解析為會話金鑰
- 訊息掛勾即發即棄，無法短路主要回覆路徑
- 外掛指令適用於控制操作，但不適合取代核心的每輪次分派流程

結果：

- ACP 執行時期可外掛化
- ACP 路由分支必須存在於核心中

## 可重用的既有基礎

已實作且應保持為標準：

- 執行緒綁定目標支援 `subagent` 和 `acp`
- 入站執行緒路由覆寫會在正常分派之前透過綁定進行解析
- 透過 webhook 在回覆交付中傳輸出站執行緒身分
- `/focus` 和 `/unfocus` 流程具有 ACP 目標相容性
- 啟動時可還原的持久化綁定存儲
- 在歸檔、刪除、取消聚焦、重置和刪除時解除綁定生命週期

此計劃擴展了該基礎，而非替換它。

## 架構

### 邊界模型

核心（必須在 OpenClaw 核心中）：

- 回覆管道中的 ACP 會話模式調度分支
- 交付仲裁以避免父級加上線程重複
- ACP 控制平面持久化（在遷移期間具有 `SessionEntry.acp` 相容性投影）
- 生命週期解除綁定和運行時分離語義與會話重置/刪除相關聯

插件後端（acpx 實作）：

- ACP 運行時工作程序監督
- acpx 進程調用和事件解析
- ACP 指令處理程式（`/acp ...`）和操作員 UX
- 後端特定的配置預設值和診斷

### 運行時所有權模型

- 一個閘道進程擁有 ACP 編排狀態
- ACP 執行透過 acpx 後端在受監督的子進程中運行
- 進程策略是針對每個活動 ACP 會話金鑰長期運行，而非針對每個訊息

這避免了每次提示時的啟動成本，並使取消和重新連接語義保持可靠。

### 核心運行時契約

新增核心 ACP 運行時契約，以便路由程式碼不依賴 CLI 詳細資訊，並且可以在不更改調度邏輯的情況下切換後端：

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

實作細節：

- 第一個後端：`AcpxRuntime` 作為插件服務發布
- 核心透過註冊表解析運行時，並在沒有可用的 ACP 運行時後端時以明確的操作員錯誤失敗

### 控制平面資料模型和持久化

長期唯一事實來源是專用的 ACP SQLite 資料庫（WAL 模式），用於事務性更新和防當機恢復：

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
  - `scope`, `idempotency_key`, `result_json`, `created_at`, unique `(scope, idempotency_key)`

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

- 在遷移期間將 `SessionEntry.acp` 作為兼容性投射保留
- 程序 ID 和 sockets 僅保存在記憶體中
- 持久生命週期和執行狀態存放於 ACP DB，而非通用會話 JSON
- 如果運行時擁有者死亡，閘道會從 ACP DB 重新補水並從檢查點恢復

### 路由與遞送

入站：

- 將當前綁定查找保留為第一個路由步驟
- 如果綁定目標是 ACP 會話，則路由到 ACP 運行時分支而非 `getReplyFromConfig`
- 明確的 `/acp steer` 指令使用 `mode: "steer"`

出站：

- ACP 事件流被正規化為 OpenClaw 回覆區塊
- 遞送目標透過現有的綁定目標路徑解析
- 當綁定執行緒在該會話輪次處於活動狀態時，父頻道完成會被抑制

串流策略：

- 使用合併視窗串流部分輸出
- 可配置的最小間隔和最大區塊位元組數，以保持在 Discord 速率限制以下
- 最終訊息總是在完成或失敗時發送

### 狀態機與交易邊界

會話狀態機：

- `creating -> idle -> running -> idle`
- `running -> cancelling -> idle | error`
- `idle -> closed`
- `error -> idle | closed`

運行狀態機：

- `queued -> running -> completed`
- `running -> failed | cancelled`
- `queued -> cancelled`

必要的交易邊界：

- 生成交易
  - 建立 ACP 會話資料列
  - 建立/更新 ACP 執行緒綁定資料列
  - 將初始執行排入佇列
- 關閉交易
  - 標記會話已關閉
  - 刪除/過期綁定資料列
  - 寫入最終關閉事件
- 取消交易
  - 使用等冪性金鑰標記目標執行為正在取消/已取消

在這些邊界之間不允許部分成功。

### 每個會話的 Actor 模型

`AcpSessionManager` 為每個 ACP 會話金鑰執行一個 actor：

- actor 信箱序列化 `submit`、`cancel`、`close` 和 `stream` 副作用
- actor 擁有該會話的執行時期處理程序填充和執行時期介面卡程序生命週期
- actor 在任何 Discord 傳遞之前依序寫入執行事件 (`seq`)
- actor 在成功出站發送後更新傳遞檢查點

這消除了跨輪次競爭並防止重複或亂序的執行緒輸出。

### 等冪性與傳遞投影

所有外部 ACP 操作必須帶有等冪性金鑰：

- 生成等冪性金鑰
- 提示/導向等冪性金鑰
- 取消等冪性金鑰
- 關閉等冪性金鑰

傳遞規則：

- Discord 訊息源自 `acp_events` 加上 `acp_delivery_checkpoint`
- 重試從檢查點恢復，而不重新發送已傳遞的區塊
- 最終回覆發射來自投影邏輯，每次執行剛好一次

### 恢復與自我修復

在閘道啟動時：

- 載入非終端 ACP 會話 (`creating`, `idle`, `running`, `cancelling`, `error`)
- 在第一次入站事件時延遲重新建立 actor，或在配置的上限下積極重新建立
- 協調任何 `running` 遺失心跳的運行，並標記 `failed` 或透過配接器復原

收到 Discord 執行緒訊息時：

- 如果綁定存在但 ACP 工作階段遺失，以明確的過期綁定訊息封閉式地失敗
- 在操作員安全的驗證後，選擇性地自動解除綁定過期綁定
- 切勿將過期的 ACP 綁定以靜默方式路由至正常的 LLM 路徑

### 生命週期與安全性

支援的操作：

- 取消目前運行：`/acp cancel`
- 解除綁定執行緒：`/unfocus`
- 關閉 ACP 工作階段：`/acp close`
- 透過有效 TTL 自動關閉閒置工作階段

TTL 原則：

- 有效 TTL 為以下項目的最小值
  - 全域/工作階段 TTL
  - Discord 執行緒綁定 TTL
  - ACP 執行階段擁有者 TTL

安全性控制：

- 依名稱將 ACP 代理程式列入允許清單
- 限制 ACP 工作階段的工作區根目錄
- 環境變數允許清單傳遞
- 每個帳戶和全域的最大並行 ACP 工作階段數
- 針對執行階段當機的有界重新啟動退避

## 設定介面

核心金鑰：

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

外掛程式/後端金鑰 (acpx 外掛程式區段)：

- 後端指令/路徑覆寫
- 後端環境變數允許清單
- 後端各代理程式預設集
- 後端啟動/停止逾時
- 後端每個工作階段的最大進行中運行數

## 實作規格

### 控制平面模組 (新增)

在核心中加入專用的 ACP 控制平面模組：

- `src/acp/control-plane/manager.ts`
  - 擁有 ACP 參與者、生命週期轉換、指令序列化
- `src/acp/control-plane/store.ts`
  - SQLite 結構描述管理、交易、查詢協助程式
- `src/acp/control-plane/events.ts`
  - 具類型的 ACP 事件定義與序列化
- `src/acp/control-plane/checkpoint.ts`
  - 持久化傳遞檢查點與重放游標
- `src/acp/control-plane/idempotency.ts`
  - 等冪性鍵保留與回應重放
- `src/acp/control-plane/recovery.ts`
  - 啟動時協調與 Actor 重新水合計畫

相容性橋接模組：

- `src/acp/runtime/session-meta.ts`
  - 暫時保留以投射至 `SessionEntry.acp`
  - 必須在遷移切換後停止作為事實來源（source-of-truth）

### 必要的不變數（必須在程式碼中強制執行）

- ACP 會話建立與執行緒繫結為不可分割操作（單一交易）
- 每個 ACP 會話 Actor 同時至多只有一個作用中的執行
- 每次執行中，事件 `seq` 嚴格遞增
- 傳遞檢查點絕不超過最後一次提交的事件
- 等冪性重放針對重複的命令鍵回傳先前的成功載荷
- 過時/遺失的 ACP 中繼資料不可路由至一般非 ACP 回應路徑

### 核心接觸點

需變更的核心檔案：

- `src/auto-reply/reply/dispatch-from-config.ts`
  - ACP 分支呼叫 `AcpSessionManager.submit` 與事件投射傳遞
  - 移除繞過控制平面不變數的直接 ACP 後備機制
- `src/auto-reply/reply/inbound-context.ts`（或最近的標準化語境邊界）
  - 揭露標準化路由鍵與 ACP 控制平面的等冪性種子
- `src/config/sessions/types.ts`
  - 將 `SessionEntry.acp` 保留為僅供投射使用的相容性欄位
- `src/gateway/server-methods/sessions.ts`
  - 重置/刪除/封存必須呼叫 ACP 管理器的關閉/解除繫結交易路徑
- `src/infra/outbound/bound-delivery-router.ts`
  - 對 ACP 繫結的會話回合強制執行失敗關閉（fail-closed）的目的地行為
- `src/discord/monitor/thread-bindings.ts`
  - 加入連線至控制平面查詢的 ACP 過時繫結驗證輔助程式
- `src/auto-reply/reply/commands-acp.ts`
  - 透過 ACP 管理器 API 路由生成/取消/關閉/導引
- `src/agents/acp-spawn.ts`
  - 停止臨時中繼資料寫入；呼叫 ACP 管理器生成交易
- `src/plugin-sdk/**` 與外掛程式執行時期橋接
  - 乾淨地揭露 ACP 後端註冊與健康語意

明確不替換的核心檔案：

- `src/discord/monitor/message-handler.preflight.ts`
  - 將執行緒繫結覆寫行為保持為標準的 session-key 解析器

### ACP 執行時期登錄 API

新增核心登錄模組：

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

- `requireAcpRuntimeBackend` 在無法使用時拋出類型化的 ACP 後端缺失錯誤
- 插件服務在 `start` 註冊後端，並在 `stop` 取消註冊
- 執行時期查找是唯讀的，且僅限於程序內

### acpx 執行時期插件合約 (實作細節)

對於第一個正式生產後端 (`extensions/acpx`)，OpenClaw 和 acpx 透過嚴格的指令合約連接：

- 後端 ID：`acpx`
- 插件服務 ID：`acpx-runtime`
- 執行時期處理程序編碼：`runtimeSessionName = acpx:v1:<base64url(json)>`
- 編碼的 Payload 欄位：
  - `name` (acpx 命名會話；使用 OpenClaw `sessionKey`)
  - `agent` (acpx 代理程式指令)
  - `cwd` (會話工作區根目錄)
  - `mode` (`persistent | oneshot`)

指令對應：

- 確保會話：
  - `acpx --format json --json-strict --cwd <cwd> <agent> sessions ensure --name <name>`
- 提示輪次：
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

### 會話 Schema 修補

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

- 階段 A：雙重寫入 (`acp` 投影 + ACP SQLite 事實來源)
- 階段 B：從 ACP SQLite 主要讀取，從舊版 `SessionEntry.acp` 後備讀取
- 階段 C：遷移指令從有效的舊版條目回填缺失的 ACP 資料列
- 階段 D：移除 fallback-read 並將 projection 保持為可選，僅用於 UX
- 舊版欄位 (`cliSessionIds`, `claudeCliSessionId`) 保持不變

### 錯誤契約

新增穩定的 ACP 錯誤代碼和面向使用者的訊息：

- `ACP_BACKEND_MISSING`
  - 訊息： `ACP runtime backend is not configured. Install and enable the acpx runtime plugin.`
- `ACP_BACKEND_UNAVAILABLE`
  - 訊息： `ACP runtime backend is currently unavailable. Try again in a moment.`
- `ACP_SESSION_INIT_FAILED`
  - 訊息： `Could not initialize ACP session runtime.`
- `ACP_TURN_FAILED`
  - 訊息： `ACP turn failed before completion.`

規則：

- 在執行緒中傳回可執行的使用者安全訊息
- 僅在執行時日誌中記錄詳細的後端/系統錯誤
- 當明確選擇了 ACP 路由時，切勿無聲地回退至一般 LLM 路徑

### 重複傳送仲裁

ACP 綁定回合的單一路由規則：

- 如果目標 ACP 工作階段和請求者上下文存在有效的執行緒綁定，僅傳送至該綁定執行緒
- 不要對同一回合傳送至父頻道
- 如果綁定的目的地選擇不明確，則以明確錯誤失敗關閉 (無隱含的父級回退)
- 如果不存在有效的綁定，則使用一般的工作階段目的地行為

### 可觀測性和營運就緒度

所需的指標：

- 依後端和錯誤代碼區分的 ACP 生成成功/失敗計數
- ACP 執行延遲百分位數 (佇列等待時間、執行時回合時間、傳送投影時間)
- ACP 參與者重新啟動計數和重新啟動原因
- 過時綁定偵測計數
- 等幂性重放命中率
- Discord 傳送重試和速率限制計數器

所需的日誌：

- 由 `sessionKey`、`runId`、`backend`、`threadId`、`idempotencyKey` 鍵值的結構化日誌
- 工作階段和執行狀態機的明確狀態轉換日誌
- 包含可安全編輯參數和退出摘要的配接器命令日誌

所需的診斷：

- `/acp sessions` 包含狀態、有效執行、上次錯誤和綁定狀態
- `/acp doctor` (或同等功能) 驗證後端註冊、儲存體健康狀況和過時綁定

### 設定優先順序和有效值

ACP 啟用優先順序：

- 帳號覆寫： `channels.discord.accounts.<id>.threadBindings.spawnAcpSessions`
- 頻道覆寫：`channels.discord.threadBindings.spawnAcpSessions`
- 全域 ACP 閘道：`acp.enabled`
- 分派閘道：`acp.dispatch.enabled`
- 後端可用性：已註冊的後端用於 `acp.backend`

自動啟用行為：

- 當 ACP 已設定（`acp.enabled=true`、`acp.dispatch.enabled=true` 或
  `acp.backend=acpx`）時，外掛程式自動啟用會標記 `plugins.entries.acpx.enabled=true`
  除非在封鎖名單中或被明確停用

TTL 有效值：

- `min(session ttl, discord thread binding ttl, acp runtime ttl)`

### 測試對應

單元測試：

- `src/acp/runtime/registry.test.ts`（新增）
- `src/auto-reply/reply/dispatch-from-config.acp.test.ts`（新增）
- `src/infra/outbound/bound-delivery-router.test.ts`（擴充 ACP 失敗關閉案例）
- `src/config/sessions/types.test.ts` 或最相近的 session-store 測試（ACP 中繼資料持久性）

整合測試：

- `src/discord/monitor/reply-delivery.test.ts`（綁定的 ACP 傳送目標行為）
- `src/discord/monitor/message-handler.preflight*.test.ts`（綁定的 ACP session-key 路由連續性）
- 後端套件中的 acpx 外掛程式執行時測試（服務註冊/啟動/停止 + 事件正規化）

Gateway 端對端測試：

- `src/gateway/server.sessions.gateway-server-sessions-a.e2e.test.ts`（擴充 ACP 重設/刪除生命週期覆蓋範圍）
- ACP 執行緒輪次端對端往返測試，涵蓋生成、訊息、串流、取消、取消焦點、重新啟動復原

### 推出防護

新增獨立的 ACP 分派終止開關：

- `acp.dispatch.enabled` 預設為 `false` 用於首次發布
- 停用時：
  - ACP 生成/聚焦控制指令仍可能綁定工作階段
  - ACP 分派路徑不會啟動
  - 使用者會收到明確訊息，指出 ACP 分派已因政策而停用
- 金絲雀驗證後，預設值可以在後續版本中切換為 `true`

## 指令與 UX 規劃

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

### 第 0 階段 ADR 與綱凍結

- 發布關於 ACP 控制平面擁有權和介面卡邊界的 ADR
- 凍結 DB 綱要 (`acp_sessions`, `acp_runs`, `acp_bindings`, `acp_events`, `acp_delivery_checkpoint`, `acp_idempotency`)
- 定義穩定的 ACP 錯誤代碼、事件契約和狀態轉換防護機制

### 階段 1：核心中的控制平面基礎

- 實作 `AcpSessionManager` 和每個 session 的 actor 執行環境
- 實作 ACP SQLite 儲存庫和交易輔助函式
- 實作冪等性儲存庫和重播輔助函式
- 實作事件附加與傳遞檢查點模組
- 將 spawn/cancel/close API 連接到管理器，並提供交易保證

### 階段 2：核心路由與生命週期整合

- 將來自分派管道的執行緒綁定 ACP 回合路由到 ACP 管理器
- 當 ACP 綁定/session 不變性失效時，強制執行失效關閉路由
- 將重置/刪除/封存/取消聚焦生命週期與 ACP 關閉/解除綁定交易整合
- 新增過期綁定偵測和選用的自動解除綁定策略

### 階段 3：acpx 後端介面卡/外掛

- 根據執行環境契約實作 `acpx` 介面卡 (`ensureSession`, `submit`, `stream`, `cancel`, `close`)
- 新增後端健康檢查和啟動/終止註冊
- 將 acpx nd 事件正規化為 ACP 執行環境事件
- 強制執行後端逾時、程序監督，以及重啟/退避策略

### 階段 4：傳遞投影與頻道使用者體驗 (優先 Discord)

- 實作具檢查點恢復功能的事件驅動頻道投影 (優先 Discord)
- 使用具速率限制感知的排清策略合併串流區塊
- 保證每次執行僅傳送一次最終完成訊息
- 發布 `/acp spawn`, `/acp cancel`, `/acp steer`, `/acp close`, `/acp sessions`

### 階段 5：遷移與切換

- 引導對 `SessionEntry.acp` 投影加上 ACP SQLite 單一真實來源的雙寫入
- 新增舊版 ACP 元資料列的遷移工具
- 將讀取路徑切換至 ACP SQLite 主要資料庫
- 移除依賴缺失 `SessionEntry.acp` 的舊版後備路由

### 階段 6 加固、SLO 與規模限制

- 執行並發限制（全域/帳號/工作階段）、佇列策略與逾時預算
- 新增完整的遙測、儀表板與告警閾值
- 混沌測試崩潰恢復與重複傳遞抑制
- 發布後端中斷、資料庫損壞與過期繫結修復的操作手冊

### 完整實作檢查清單

- 核心控制平面模組與測試
- 資料庫遷移與復原計畫
- 跨派發與指令的 ACP 管理員 API 整合
- 外掛執行時期橋接器中的配接器註冊介面
- acpx 配接器實作與測試
- 具備檢查點重新播放功能的執行緒通道傳遞投影邏輯（優先支援 Discord）
- 重置/刪除/封存/取消聚焦的生命週期掛鉤
- 過期繫結偵測器與操作員導向的診斷工具
- 所有新 ACP 金鑰的設定驗證與優先順序測試
- 操作文件與疑難排解手冊

## 測試計畫

單元測試：

- ACP 資料庫交易邊界（衍生/繫結/入列原子性、取消、關閉）
- 工作階段與執行的 ACP 狀態機轉換防護
- 所有 ACP 指令的冪等保留/重新播放語意
- 每工作階段的執行器序列化與佇列排序
- acpx 事件解析器與區塊合併器
- 執行時期監督器重啟與退避政策
- 設定優先順序與有效 TTL 計算
- 核心 ACP 路由分支選擇，以及當後端/工作階段無效時的失效關閉行為

整合測試：

- 用於確定性串流與取消行為的偽造 ACP 配接器程序
- 具有交易持久化的 ACP 管理員 + 派發整合
- 執行緒繫結的入站路由至 ACP 工作階段金鑰
- 執行緒繫結的出站傳遞抑制父通道的重複
- 檢查點重新播放在傳遞失敗後恢復，並從最後一個事件繼續
- 外掛服務註冊與 ACP 執行時期後端的拆除

Gateway 端到端測試：

- 以執行緒衍生 ACP，交換多輪提示，取消聚焦
- 使用已保存的 ACP 資料庫與繫結重啟 Gateway，然後繼續相同的工作階段
- 多個執行緒中的並發 ACP 工作階段不會有互相干擾
- 重複的指令重試（相同的冪等金鑰）不會建立重複的執行或回覆
- 過時綁定場景會產生明確的錯誤與可選的自動清理行為

## 風險與緩解措施

- 過渡期間的重複交付
  - 緩解措施：�一目標解析器與冪等事件檢查點
- 負載下的執行時進程流失
  - 緩解措施：長壽命的每會話擁有者 + 並發上限 + 退避
- 外掛程式遺失或配置錯誤
  - 緩解措施：明確的運算器導向錯誤與失效關閉的 ACP 路由（無隱性回退至正常會話路徑）
- 子代理與 ACP 閘道之間的配置混淆
  - 緩解措施：明確的 ACP 金鑰與包含有效策略來源的指令回饋
- 控制平面儲存損壞或遷移錯誤
  - 緩解措施：WAL 模式、備份/還原掛鉤、遷移冒煙測試，以及唯讀回退診斷
- 參與者死鎖或信箱匱乏
  - 緩解措施：看門狗計時器、參與者健康探測，以及帶有拒絕遙測的有界信箱深度

## 驗收檢查清單

- ACP 會話產生可以在支援的通道配接器（目前為 Discord）中建立或綁定執行緒
- 所有執行緒訊息僅路由至綁定的 ACP 會話
- ACP 輸出以串流或批次形式出現在同一個執行緒識別中
- 綁定的回合中，父通道無重複輸出
- 產生 + 綁定 + 初始佇列在持續性儲存中具備不可分割性
- ACP 指令重試具冪等性，且不會重複執行或輸出
- 取消、關閉、解除聚焦、封存、重設與刪除執行確定性清理
- 當機重新啟動會保留對應並恢復多輪次連續性
- 並發的執行緒綁定 ACP 會話獨立運作
- ACP 後端遺失狀態會產生清晰可行的錯誤
- 過時的綁定會被偵測並明確呈現（含可選的安全自動清理）
- 控制平面指標與診斷可供運算器使用
- 新增的單元、整合與端對端覆蓋率通過

## 附錄：針對目前實作的重構目標（狀態）

這些是非阻塞性的後續工作，目的是在目前功能集落地後保持 ACP 路徑的可維護性。

### 1) 集中化 ACP 分派策略評估（已完成）

- 透過 `src/acp/policy.ts` 中的共用 ACP 策略輔助函式實作
- 分派、ACP 指令生命週期處理器與 ACP 產生路徑現在使用共用策略邏輯

### 2) 依子指令領域拆分 ACP 指令處理器（已完成）

- `src/auto-reply/reply/commands-acp.ts` 現在是一個薄路由
- 子指令行為被拆分為：
  - `src/auto-reply/reply/commands-acp/lifecycle.ts`
  - `src/auto-reply/reply/commands-acp/runtime-options.ts`
  - `src/auto-reply/reply/commands-acp/diagnostics.ts`
  - `src/auto-reply/reply/commands-acp/shared.ts` 中的共享輔助函數

### 3) 按職責拆分 ACP 會話管理器（已完成）

- 管理器被拆分為：
  - `src/acp/control-plane/manager.ts`（公共外觀 + 單例）
  - `src/acp/control-plane/manager.core.ts`（管理器實現）
  - `src/acp/control-plane/manager.types.ts`（管理器類型/依賴）
  - `src/acp/control-plane/manager.utils.ts`（正規化 + 輔助函數）

### 4) 可選的 acpx 運行時適配器清理

- `extensions/acpx/src/runtime.ts` 可以被拆分為：
- 程序執行/監督
- nd 事件解析/正規化
- 運行時 API 表面（`submit`、`cancel`、`close` 等）
- 提高可測試性並使後端行為更容易審核
