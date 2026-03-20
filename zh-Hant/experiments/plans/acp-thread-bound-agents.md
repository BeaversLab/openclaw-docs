---
summary: "透過核心與外掛支援執行時間中的一等 ACP 控制平面整合 ACP 編碼代理程式（acpx 優先）"
owner: "onutc"
status: "draft"
last_updated: "2026-02-25"
title: "ACP 執行緒綁定代理程式"
---

# ACP 執行緒綁定代理程式

## 概覽

此計劃定義了 OpenClaw 應如何在支援執行緒的通道（優先支援 Discord）中以生產等級的生命週期和復原機制來支援 ACP 編碼代理程式。

相關文件：

- [統一執行時間串流重構計劃](/zh-Hant/experiments/plans/acp-unified-streaming-refactor)

目標使用者體驗：

- 使用者產生或將 ACP 會話聚焦至執行緒
- 該執行緒中的使用者訊息會路由到綁定的 ACP 會話
- 代理程式輸出串流回傳至同一個執行緒角色
- 會話可以是持續性或一次性，並具有明確的清理控制項

## 決策摘要

長期建議是一種混合式架構：

- OpenClaw 核心擁有 ACP 控制平面事務
  - 會話身分識別與中繼資料
  - 執行緒綁定與路由決策
  - 傳遞不變性與重複抑制
  - 生命週期清理與復原語意
- ACP 執行時間後端是可插拔的
  - 第一個後端是 acpx 支援的外掛程式服務
  - 執行時間處理 ACP 傳輸、佇列、取消與重新連線

OpenClaw 不應在核心中重新實作 ACP 傳輸內部細節。
OpenClaw 不應依賴純外掛式的攔截路徑進行路由。

## 終極架構（理想狀態）

將 ACP 視為 OpenClaw 中的一等控制平面，並配備可插拔的執行時間介面卡。

不可協調的不變性：

- 每個 ACP 執行緒綁定都參照有效的 ACP 會話記錄
- 每個 ACP 會話都有明確的生命週期狀態 (`creating`, `idle`, `running`, `cancelling`, `closed`, `error`)
- 每個 ACP 執行都有明確的執行狀態 (`queued`, `running`, `completed`, `failed`, `cancelled`)
- 產生、綁定和初始佇列動作皆為原子性
- 指令重試為等冪操作（不會產生重複執行或重複的 Discord 輸出）
- 綁定執行緒的通道輸出是 ACP 執行事件的投影，而非臨時副作用

長期擁有權模型：

- `AcpSessionManager` 是單一的 ACP 寫入器和協調器
- 管理器首先存在於閘道進程中；稍後可移動到同一介面後的專用 sidecar
- 每個 ACP 會話金鑰，管理器擁有一個記憶體內部 actor（序列化指令執行）
- 轉接器 (`acpx`，未來的後端) 僅為傳輸/執行時期實作

長期持久化模型：

- 將 ACP 控制平面狀態移動至 OpenClaw 狀態目錄下的專用 SQLite 存儲 (WAL 模式)
- 在遷移期間將 `SessionEntry.acp` 作為兼容性投影，而非事實來源 (source-of-truth)
- 僅附加存儲 ACP 事件，以支援重放、當機恢復和確定性傳遞

### 交付策略 (通往聖杯的橋樑)

- 短期橋樑
  - 保留目前的執行緒綁定機制和現有的 ACP 配置表面
  - 修復中繼資料缺口錯誤，並將 ACP 週期路由至單一核心 ACP 分支
  - 立即加入等冪性金鑰和失敗關閉 (fail-closed) 路由檢查
- 長期切換
  - 將 ACP 事實來源 (source-of-truth) 移至控制平面資料庫 + actors
  - 使綁定執行緒傳遞基於純事件投影
  - 移除依賴於機會性會話條目中繼資料的舊版回退行為

## 為何不採用純外掛

目前的掛鉤若無核心變更，不足以進行端到端的 ACP 會話路由。

- 來自執行緒綁定的入站路由首先在核心分派中解析為會話金鑰
- 訊息掛鉤是即發即棄 (fire-and-forget) 的，無法短路主要回覆路徑
- 外掛指令適用於控制操作，但不適用於取代核心每週期 (per-turn) 分派流程

結果：

- ACP 執行時期可以被外掛化
- ACP 路由分支必須存在於核心中

## 可重複使用的現有基礎

已實作且應保持為標準：

- 執行緒綁定目標支援 `subagent` 和 `acp`
- 入站執行緒路由覆寫在正常分派之前透過綁定解析
- 透過回覆傳遞中的 webhook 進行出站執行緒身分識別
- 具有 ACP 目標相容性的 `/focus` 和 `/unfocus` 流程
- 支援啟動時還原的持久化綁定存儲
- 在封存、刪除、取消聚焦、重置和刪除時進行解除綁定生命週期

此計畫擴展了該基礎，而非取代它。

## 架構

### 邊界模型

核心（必須位於 OpenClaw 核心中）：

- 回覆管線中的 ACP 會話模式分派分支
- 傳遞仲裁以避免父級與執行緒重複
- ACP 控制平面持久化（在遷移期間具備 `SessionEntry.acp` 相容性投影）
- 生命週期解除綁定與執行時分離語意，與會話重設/刪除綁定

外掛後端 (acpx 實作)：

- ACP 執行時工作程式監督
- acpx 程序呼叫與事件解析
- ACP 指令處理程式 (`/acp ...`) 與操作員 UX
- 後端特定的設定預設值與診斷

### 執行時擁有權模型

- 一個閘道程序擁有 ACP 編排狀態
- ACP 執行透過 acpx 後端在受監督的子程序中執行
- 程序策略是每個有效 ACP 會話金鑰長期存在，而非每則訊息

這可避免每次提示時的啟動成本，並保持取消與重新連線語意的可靠性。

### 核心執行時合約

新增核心 ACP 執行時合約，以便路由程式碼不依賴 CLI 詳細資訊，並且無需變更分派邏輯即可切換後端：

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

- 第一個後端：`AcpxRuntime` 作為外掛服務出貨
- 核心透過登錄解析執行時，當沒有可用的 ACP 執行時後端時，會以明確的操作員錯誤失敗

### 控制平面資料模型與持久化

長期真實來源是專用的 ACP SQLite 資料庫 (WAL 模式)，用於交易更新與防當機復原：

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

- 在遷移期間將 `SessionEntry.acp` 作為相容性投影保留
- 程序 ID 和 socket 僅保留在記憶體中
- 持久生命週期和執行狀態存在於 ACP 資料庫中，而非通用會話 JSON
- 如果執行時期擁有者死亡，閘道會從 ACP 資料庫重新補水並從檢查點恢復

### 路由與遞送

入站：

- 將當前線程綁定查找保留為第一個路由步驟
- 如果綁定目標是 ACP 會話，則路由到 ACP 執行時期分支而不是 `getReplyFromConfig`
- 明確的 `/acp steer` 指令使用 `mode: "steer"`

出站：

- ACP 事件串流被正規化為 OpenClaw 回覆區塊
- 遞送目標透過現有的綁定目標路徑解析
- 當綁定的線程在該會話輪次中處於活動狀態時，父通道完成會被抑制

串流策略：

- 使用合併視窗串流部分輸出
- 可配置的最小間隔和最大區塊位元組數，以保持在 Discord 速率限制之下
- 最終訊息始終在完成或失敗時發出

### 狀態機與交易邊界

會話狀態機：

- `creating -> idle -> running -> idle`
- `running -> cancelling -> idle | error`
- `idle -> closed`
- `error -> idle | closed`

執行狀態機：

- `queued -> running -> completed`
- `running -> failed | cancelled`
- `queued -> cancelled`

必要的交易邊界：

- 生成交易
  - 建立 ACP 會話資料列
  - 建立/更新 ACP 執行緒綁定資料列
  - 將初始執行資料列入列
- 關閉交易
  - 標記會話已關閉
  - 刪除/過期綁定資料列
  - 寫入最終關閉事件
- 取消交易
  - 使用冪等鍵標記目標執行為取消中/已取消

這些邊界之間不允許部分成功。

### 每個會話的 Actor 模型

`AcpSessionManager` 針對每個 ACP 會話金鑰執行一個 actor：

- actor 信箱序列化 `submit`、`cancel`、`close` 和 `stream` 副作用
- actor 擁有該會話的執行時控制代碼準備和執行時配接器程序生命週期
- actor 在任何 Discord 傳遞之前依序寫入執行事件 (`seq`)
- actor 在成功傳出傳送後更新傳遞檢查點

這消除了跨輪次競爭，並防止重複或亂序的執行緒輸出。

### 冪等性與傳遞投影

所有外部 ACP 操作都必須攜帶冪等鍵：

- 生成冪等鍵
- 提示/引導冪等鍵
- 取消冪等鍵
- 關閉冪等鍵

傳遞規則：

- Discord 訊息衍生自 `acp_events` 加上 `acp_delivery_checkpoint`
- 重試從檢查點恢復，而不重新傳送已傳遞的區塊
- 最終回覆發射透過投影邏輯每次執行正好一次

### 恢復與自我修復

在閘道啟動時：

- 載入非終止 ACP 會話 (`creating`、`idle`、`running`、`cancelling`、`error`)
- 在第一次傳入事件時延遲重新建立 actor，或在設定的上限下積極重新建立
- 協調任何缺少心跳的 `running` 執行並標記 `failed` 或透過配接器恢復

在傳入 Discord 執行緒訊息時：

- 如果綁定存在但 ACP 會話遺失，則以明確的過期綁定訊息失敗關閉
- 在操作員安全的驗證後選擇性自動解除綁定過期綁定
- 切勿將過期的 ACP 綁定靜默路由到正常的 LLM 路徑

### 生命週期與安全性

支援的操作：

- 取消當前執行：`/acp cancel`
- 解除綁定執行緒：`/unfocus`
- 關閉 ACP session：`/acp close`
- 依有效 TTL 自動關閉閒置 session

TTL 政策：

- 有效 TTL 為以下項目的最小值
  - 全域/session TTL
  - Discord 執行緒綁定 TTL
  - ACP 執行時期擁有者 TTL

安全控制：

- 依名稱允許清單篩選 ACP agents
- 限制 ACP session 的工作區根目錄
- 環境變數允許清單傳遞
- 每個帳戶和全域的最大並行 ACP session 數
- 執行時期崩潰的受限重新啟動退避

## 設定表面

Core keys：

- `acp.enabled`
- `acp.dispatch.enabled` (獨立 ACP 路由切換開關)
- `acp.backend` (預設 `acpx`)
- `acp.defaultAgent`
- `acp.allowedAgents[]`
- `acp.maxConcurrentSessions`
- `acp.stream.coalesceIdleMs`
- `acp.stream.maxChunkChars`
- `acp.runtime.ttlMinutes`
- `acp.controlPlane.store` (`sqlite` 預設)
- `acp.controlPlane.storePath`
- `acp.controlPlane.recovery.eagerActors`
- `acp.controlPlane.recovery.reconcileRunningAfterMs`
- `acp.controlPlane.checkpoint.flushEveryEvents`
- `acp.controlPlane.checkpoint.flushEveryMs`
- `acp.idempotency.ttlHours`
- `channels.discord.threadBindings.spawnAcpSessions`

Plugin/backend keys (acpx plugin 區段)：

- backend 指令/路徑覆寫
- backend 環境變數允許清單
- backend 各 agent 預設集
- backend 啟動/停止逾時
- backend 每個 session 的最大進行中執行數

## 實作規格

### Control-plane modules (新)

在 core 中新增專屬的 ACP control-plane modules：

- `src/acp/control-plane/manager.ts`
  - 擁有 ACP actors、生命週期轉換、指令序列化
- `src/acp/control-plane/store.ts`
  - SQLite 結構描述管理、交易、查詢輔助程式
- `src/acp/control-plane/events.ts`
  - 型別化 ACP 事件定義和序列化
- `src/acp/control-plane/checkpoint.ts`
  - 持久化傳遞檢查點和重播游標
- `src/acp/control-plane/idempotency.ts`
  - 等幂鍵保留和回應重播
- `src/acp/control-plane/recovery.ts`
  - 啟動時間對帳和 actor 重新填充計劃

相容性橋接 modules：

- `src/acp/runtime/session-meta.ts`
  - 暫時保留以投影至 `SessionEntry.acp`
  - 必須在遷移切換後停止作為真實來源

### 必要的不變量（必須在程式碼中強制執行）

- ACP session 建立和 thread bind 是原子的（單一交易）
- 每個 ACP session actor 一次最多只能有一個 active run
- event `seq` 在每次 run 中嚴格遞增
- delivery checkpoint 絕不會超過最後一次提交的 event
- 等幕重放針對重複的 command keys 返回先前的成功 payload
- 過時/遺失的 ACP metadata 無法路由到正常的非 ACP 回覆路徑

### Core 接觸點

需要變更的 Core 檔案：

- `src/auto-reply/reply/dispatch-from-config.ts`
  - ACP branch 呼叫 `AcpSessionManager.submit` 和 event-projection delivery
  - 移除繞過 control-plane 不變量的直接 ACP 後備機制
- `src/auto-reply/reply/inbound-context.ts` （或最近的 normalized context 邊界）
  - 為 ACP control plane 公開 normalized routing keys 和等幕 seeds
- `src/config/sessions/types.ts`
  - 將 `SessionEntry.acp` 保留為僅限 projection 的相容性欄位
- `src/gateway/server-methods/sessions.ts`
  - reset/delete/archive 必須呼叫 ACP manager 的 close/unbind 交易路徑
- `src/infra/outbound/bound-delivery-router.ts`
  - 對 ACP bound session turns 強制執行 fail-closed destination 行為
- `src/discord/monitor/thread-bindings.ts`
  - 新增連接到 control-plane lookups 的 ACP stale-binding 驗證輔助程式
- `src/auto-reply/reply/commands-acp.ts`
  - 透過 ACP manager APIs 路由 spawn/cancel/close/steer
- `src/agents/acp-spawn.ts`
  - 停止 ad-hoc metadata 寫入；呼叫 ACP manager spawn 交易
- `src/plugin-sdk/**` 和 plugin runtime bridge
  - 清楚地公開 ACP backend 註冊和健康語意

明確不替換的 Core 檔案：

- `src/discord/monitor/message-handler.preflight.ts`
  - 將 thread binding 覆寫行為保留為正式的 session-key 解析器

### ACP runtime registry API

新增一個 core registry 模組：

- `src/acp/runtime/registry.ts`

必要 API：

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

- 當不可用時，`requireAcpRuntimeBackend` 拋出一個類型化的 ACP backend 缺失錯誤
- plugin service 在 `start` 上註冊 backend，並在 `stop` 上取消註冊
- runtime lookups 是唯讀且 process-local 的

### acpx runtime plugin contract （實作細節）

對於首個生產環境後端 (`extensions/acpx`)，OpenClaw 和 acpx 透過嚴格的指令契約連接：

- backend id: `acpx`
- plugin service id: `acpx-runtime`
- runtime handle encoding: `runtimeSessionName = acpx:v1:<base64url(json)>`
- encoded payload fields:
  - `name` (acpx named session; uses OpenClaw `sessionKey`)
  - `agent` (acpx agent command)
  - `cwd` (session workspace root)
  - `mode` (`persistent | oneshot`)

Command mapping:

- ensure session:
  - `acpx --format json --json-strict --cwd <cwd> <agent> sessions ensure --name <name>`
- prompt turn:
  - `acpx --format json --json-strict --cwd <cwd> <agent> prompt --session <name> --file -`
- cancel:
  - `acpx --format json --json-strict --cwd <cwd> <agent> cancel --session <name>`
- close:
  - `acpx --format json --json-strict --cwd <cwd> <agent> sessions close <name>`

Streaming:

- OpenClaw consumes nd events from `acpx --format json --json-strict`
- `text` => `text_delta/output`
- `thought` => `text_delta/thought`
- `tool_call` => `tool_call`
- `done` => `done`
- `error` => `error`

### Session schema patch

Patch `SessionEntry` in `src/config/sessions/types.ts`:

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

Persisted field:

- `SessionEntry.acp?: SessionAcpMeta`

Migration rules:

- phase A: dual-write (`acp` projection + ACP SQLite source-of-truth)
- phase B: read-primary from ACP SQLite, fallback-read from legacy `SessionEntry.acp`
- phase C: migration command backfills missing ACP rows from valid legacy entries
- phase D: remove fallback-read and keep projection optional for UX only
- legacy fields (`cliSessionIds`, `claudeCliSessionId`) remain untouched

### Error contract

Add stable ACP error codes and user-facing messages:

- `ACP_BACKEND_MISSING`
  - message: `ACP runtime backend is not configured. Install and enable the acpx runtime plugin.`
- `ACP_BACKEND_UNAVAILABLE`
  - message: `ACP runtime backend is currently unavailable. Try again in a moment.`
- `ACP_SESSION_INIT_FAILED`
  - message: `Could not initialize ACP session runtime.`
- `ACP_TURN_FAILED`
  - message: `ACP turn failed before completion.`

Rules:

- 在執行緒中回傳可採取行動且對使用者安全的訊息
- 僅在執行時日誌中記錄詳細的後端/系統錯誤
- 當明確選擇了 ACP 路由時，切勿無聲回退至正常 LLM 路徑

### 重複傳送仲裁

ACP 綁定輪次的單一路由規則：

- 如果目標 ACP 工作階段和請求者內容存在有效的執行緒綁定，則僅傳送至該綁定執行緒
- 請勿同時傳送至父頻道進行相同的輪次
- 如果綁定目標的選擇不明確，則以明確錯誤封閉失敗（無隱式父級回退）
- 如果不存在有效的綁定，則使用正常的工作階段目標行為

### 可觀測性和營運就緒狀態

所需指標：

- 依後端和錯誤代碼區分的 ACP 產生成功/失敗計數
- ACP 執行延遲百分位數（佇列等待時間、執行時輪次時間、傳送投影時間）
- ACP 參與者重啟計數和重啟原因
- 過時綁定偵測計數
- 等冪性重放命中率
- Discord 傳送重試和速率限制計數器

所需日誌：

- 以 `sessionKey`、`runId`、`backend`、`threadId`、`idempotencyKey` 為鍵的結構化日誌
- 工作階段和執行狀態機的明確狀態轉換日誌
- 配接器命令日誌，包含可安全編輯的參數和退出摘要

所需診斷：

- `/acp sessions` 包含狀態、作用中的執行、最後一個錯誤和綁定狀態
- `/acp doctor`（或同等項）驗證後端註冊、儲存體健康狀況和過時綁定

### 組態優先順序和有效值

ACP 啟用優先順序：

- 帳戶覆寫：`channels.discord.accounts.<id>.threadBindings.spawnAcpSessions`
- 頻道覆寫：`channels.discord.threadBindings.spawnAcpSessions`
- 全域 ACP 閘道：`acp.enabled`
- 分派閘道：`acp.dispatch.enabled`
- 後端可用性：已註冊 `acp.backend` 的後端

自動啟用行為：

- 當 ACP 已組態時（`acp.enabled=true`、`acp.dispatch.enabled=true` 或
  `acp.backend=acpx`），外掛程式自動啟用會標記 `plugins.entries.acpx.enabled=true`
  除非被列入黑名單或明確停用

TTL 有效值：

- `min(session ttl, discord thread binding ttl, acp runtime ttl)`

### 測試對應表

單元測試：

- `src/acp/runtime/registry.test.ts` (新增)
- `src/auto-reply/reply/dispatch-from-config.acp.test.ts` (新增)
- `src/infra/outbound/bound-delivery-router.test.ts` (擴充 ACP fail-closed 案例)
- `src/config/sessions/types.test.ts` 或最近的 session-store 測試 (ACP metadata persistence)

整合測試：

- `src/discord/monitor/reply-delivery.test.ts` (bound ACP delivery target behavior)
- `src/discord/monitor/message-handler.preflight*.test.ts` (bound ACP session-key routing continuity)
- 後端套件中的 acpx 插件執行時測試 (service register/start/stop + event normalization)

Gateway 端對端測試：

- `src/gateway/server.sessions.gateway-server-sessions-a.e2e.test.ts` (擴充 ACP reset/delete 生命週期覆蓋範圍)
- ACP thread turn 往返端對端測試：spawn、message、stream、cancel、unfocus、restart recovery

### 推出防護

新增獨立的 ACP dispatch kill switch：

- `acp.dispatch.enabled` 預設 `false` 用於首次發布
- 停用時：
  - ACP spawn/focus 控制指令仍可能綁定 sessions
  - ACP dispatch 路徑不會啟動
  - 使用者會收到明確訊息，指出 ACP dispatch 已由原則停用
- 在 canary 驗證之後，預設值可以在後續版本中翻轉為 `true`

## 指令與 UX 規劃

### 新指令

- `/acp spawn <agent-id> [--mode persistent|oneshot] [--thread auto|here|off]`
- `/acp cancel [session]`
- `/acp steer <instruction>`
- `/acp close [session]`
- `/acp sessions`

### 現有指令相容性

- `/focus <sessionKey>` 持續支援 ACP targets
- `/unfocus` 保持目前的語意
- `/session idle` 和 `/session max-age` 取代舊的 TTL 覆寫

## 分階段推出

### 階段 0 ADR 與 schema 凍結

- 發布 ACP control-plane ownership 與 adapter boundaries 的 ADR
- 凍結 DB schema (`acp_sessions`, `acp_runs`, `acp_bindings`, `acp_events`, `acp_delivery_checkpoint`, `acp_idempotency`)
- 定義穩定的 ACP 錯誤代碼、事件合約以及狀態轉換防護機制

### 階段 1 核心中的 Control-plane 基礎

- 實作 `AcpSessionManager` 與 per-session actor runtime
- 實作 ACP SQLite 存儲和事務輔助程式
- 實作冪等性存儲和重放輔助程式
- 實作事件追加和傳遞檢查點模組
- 將 spawn/cancel/close API 連接到管理器，並提供事務保證

### 第 2 階段：核心路由和生命週期整合

- 將執行緒綁定的 ACP 輪次從分派管道路由到 ACP 管理器
- 當 ACP 綁定/會話不變數失敗時，執行失效關閉路由
- 將 reset/delete/archive/unfocus 生命週期與 ACP close/unbind 事務整合
- 加入過期綁定檢測和可選的自動解除綁定策略

### 第 3 階段：acpx 後端介面卡/外掛程式

- 根據執行時期合約實作 `acpx` 介面卡 (`ensureSession`、`submit`、`stream`、`cancel`、`close`)
- 加入後端健康檢查以及啟動/拆卸註冊
- 將 acpx nd 事件正規化為 ACP 執行時期事件
- 執行後端逾時、程序監督以及重新啟動/退避策略

### 第 4 階段：傳遞投影和頻道使用者體驗 (Discord 優先)

- 實作具備檢查點恢復功能的事件驅動頻道投影 (Discord 優先)
- 合併串流區塊，並套用具備速率限制感知的排空策略
- 保證每次執行僅傳送一次最終完成訊息
- 交付 `/acp spawn`、`/acp cancel`、`/acp steer`、`/acp close`、`/acp sessions`

### 第 5 階段：遷移和切換

- 引導雙寫入至 `SessionEntry.acp` 投影以及 ACP SQLite 事實來源
- 為舊版 ACP 中繼資料資料列加入遷移公用程式
- 將讀取路徑切換為 ACP SQLite 主要來源
- 移除依賴遺失的 `SessionEntry.acp` 之舊版後備路由

### 第 6 階段：強化、SLO 和規模限制

- 執行並行限制 (全域/帳戶/會話)、佇列策略以及逾時預算
- 加入完整的遙測、儀表板和警示閾值
- 對崩潰恢復和重複傳遞抑制進行混亂測試
- 發布後端停機、資料庫損毀和過期綁定修補的操作手冊

### 完整實作檢查清單

- 核心控制平面模組和測試
- 資料庫遷移和復原計畫
- 跨調度和命令的 ACP manager API 整合
- 插件 runtime 橋接器中的介面卡註冊介面
- acpx 介面卡實作與測試
- 具備 thread 能力的通道傳遞投影邏輯與檢查點重播（Discord 優先）
- 用於重置/刪除/封存/取消聚焦的生命週期掛鉤
- 過時綁定偵測器與操作員診斷
- 針對所有新 ACP 金鑰的設定驗證與優先順序測試
- 操作文件與故障排除手冊

## 測試計畫

單元測試：

- ACP DB 交易邊界（生成/綁定/入佇列原子性、取消、關閉）
- 會話與執行的 ACP 狀態機轉換防護
- 所有 ACP 命令的等冪性保留/重播語意
- 每個會話的 actor 序列化與佇列排序
- acpx 事件解析器與區塊合併器
- runtime supervisor 重啟與退避策略
- 設定優先順序與有效 TTL 計算
- 核心 ACP 路由分支選擇與當後端/會話無效時的失效關閉行為

整合測試：

- 用於確定性串流與取消行為的假 ACP 介面卡程序
- ACP manager + 調度整合與事務持久化
- thread-bound 入站路由至 ACP session 金鑰
- thread-bound 出站傳遞抑制父頻道重複
- 檢查點重播在傳遞失敗後恢復，並從最後一個事件繼續
- ACP runtime 後端的插件服務註冊與拆除

Gateway 端到端測試：

- 使用 thread 生成 ACP，交換多輪提示，unfocus
- Gateway 重啟並保留 ACP DB 和綁定，然後繼續同一個會話
- 多個 thread 中的並發 ACP session 不會互相干擾
- 重複的命令重試（相同的等冪性金鑰）不會建立重複的執行或回覆
- 過時綁定場景產生明確錯誤與可選的自動清理行為

## 風險與緩解措施

- 過渡期間的重複傳遞
  - 緩解措施：�一目標解析器與等冪事件檢查點
- 負載下的 runtime 程序流失
  - 緩解措施：長壽命的每個會話擁有者 + 並發上限 + 退避
- 插件缺失或設定錯誤
  - 緩解措施：明確的操作員錯誤與失效關閉的 ACP 路由（無隱式回退至正常會話路徑）
- 子代理與 ACP 閘道之間的設定混淆
  - 緩解措施：明確的 ACP 金鑰以及包含有效策略來源的指令回饋
- 控制平面儲存損壞或遷移錯誤
  - 緩解措施：WAL 模式、備份/還原鉤子、遷移冒煙測試 以及唯讀後置診斷
- Actor 死鎖或信箱匱乏
  - 緩解措施：看門狗計時器、Actor 健康檢查，以及具有拒絕遙測的有界信箱深度

## 驗收檢查清單

- ACP session 生成可以在支援的通道適配器（目前為 Discord）中建立或綁定執行緒
- 所有執行緒訊息僅路由到綁定的 ACP session
- ACP 輸出以串流或批次形式出現在相同的執行緒身分中
- 綁定的回合中不會在父頻道中出現重複輸出
- 生成+綁定+初始排入佇列在持久性儲存中是原子的
- ACP 指令重試是等冪的，不會重複執行或輸出
- 取消、關閉、取消聚焦、封存、重設和刪除執行確定性清理
- 當機重啟會保留映射並恢復多輪次連續性
- 並發的執行緒綁定 ACP sessions 獨立運作
- ACP 後端缺少狀態會產生清晰可操作的錯誤
- 過時的綁定會被檢測到並明確顯示（可選安全自動清理）
- 控制平面指標和診斷可供操作員使用
- 新的單元、整合和端對端覆蓋率通過

## 附錄：針對當前實作的目標重構 (狀態)

這些是非阻礙性的後續跟進，以在當前功能集落地後保持 ACP 路徑的可維護性。

### 1) 集中化 ACP 分派策略評估 (已完成)

- 透過 `src/acp/policy.ts` 中的共享 ACP 策略輔助程式實作
- 分派、ACP 指令生命週期處理程式和 ACP 生成路徑現在都使用共享策略邏輯

### 2) 依子指令領域拆分 ACP 指令處理程式 (已完成)

- `src/auto-reply/reply/commands-acp.ts` 現在是一個精簡路由器
- 子指令行為拆分為：
  - `src/auto-reply/reply/commands-acp/lifecycle.ts`
  - `src/auto-reply/reply/commands-acp/runtime-options.ts`
  - `src/auto-reply/reply/commands-acp/diagnostics.ts`
  - `src/auto-reply/reply/commands-acp/shared.ts` 中的共享輔助程式

### 3) 依職責拆分 ACP session 管理器 (已完成)

- 管理器拆分為：
  - `src/acp/control-plane/manager.ts` (公開外觀 + 單例)
  - `src/acp/control-plane/manager.core.ts` (管理器實作)
  - `src/acp/control-plane/manager.types.ts` (管理器類型/依賴)
  - `src/acp/control-plane/manager.utils.ts` (normalization + helper functions)

### 4) Optional acpx runtime adapter cleanup

- `extensions/acpx/src/runtime.ts` can be split into:
- process execution/supervision
- nd event parsing/normalization
- runtime API surface (`submit`, `cancel`, `close`, etc.)
- improves testability and makes backend behavior easier to audit

import footerZhHant from "/components/footer/zh-Hant.mdx";

<footerZhHant />
