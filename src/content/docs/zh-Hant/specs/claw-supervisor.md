---
title: Claw Supervisor
description: 由 OpenClaw 控制的 Codex app-server session 的機群監控計畫。
readWhen:
  - Designing Codex fleet supervision
  - Building OpenClaw tools that read, steer, or spawn Codex sessions
  - Choosing between local, Cloudflare, and VPS deployment for supervised Codex
---

# Claw Supervisor

## 目標

Claw Supervisor 允許一個始終運行的 OpenClaw 實例監控並驅動 Codex session 機群，而不改變正常的 Codex 使用者體驗。使用者可以 SSH 進入主機，啟動 Codex，在 TUI 中工作，並仍然讓監控器讀取 session、引導它、中斷它、生成相關 session 並接受移交。Codex session 也可以透過 MCP 回呼 OpenClaw。

## 產品模型

Codex 仍然是主要的工作表面。OpenClaw 監控 Codex，而不是將 Codex 隱藏在封閉的 OpenClaw 子代理程式中。

OpenClaw 外掛程式名為 `codex-supervisor`。`crabfleet` 仍然是 CRAB 機器的部署和主機機群設定檔，而不是可重複使用的外掛程式名稱。

該模型有三種角色：

- Human-attached Codex：透過共用的 app-server 啟動的正常互動式 Codex TUI。
- Autonomous Codex：由監控器產生的 Codex app-server 執行緒，使用者稍後可以附加到該執行緒。
- Supervisor Claw：一個始終運行的 OpenClaw 代理程式，具有用於機群狀態、逐字稿讀取、引導、中斷、產生和移交的工具。

OpenClaw 可以在內部使用其現有的子代理程式機制，但外部契約是具有 Codex 執行緒 ID 的可附加 Codex session。

## 架構

```text
user SSH session
  -> codex --remote unix://... or ws://...
      -> local codex app-server daemon
          <-> host sidecar / supervisor connector
              <-> OpenClaw fleet supervisor
                  <-> supervisor MCP exposed back to Codex
```

每個支援 Codex 的主機都會執行：

- Codex app-server 守護程式。
- 一個始終以 `--remote` 啟動互動式 Codex 的啟動器。
- 一個連接器，向監控器註冊 app-server 端點和即時執行緒。

監控器執行：

- 端點註冊表。
- Session 註冊表。
- Codex app-server JSON-RPC 用戶端池。
- 用於 Codex-to-Claw 呼叫的 MCP 伺服器。
- 用於 Claw-to-Codex 控制的 OpenClaw 工具。
- 用於自主操作、核准和迴圈防範的政策引擎。

## Codex App-Server 契約

使用 Codex app-server API 作為標準控制平面：

- `initialize`、`initialized`
- `thread/loaded/list`
- `thread/list`
- `thread/read`
- `thread/resume`
- `thread/start`
- `turn/start`
- `turn/steer`
- `turn/interrupt`
- `model/list`

互動式 Codex 必須使用 `codex --remote <endpoint>` 啟動，以便 TUI 和監督器連接到同一個應用程式伺服器。獨立的 `codex exec` 目前不是即時共享的工作階段；在 Codex 支援 `exec --remote` 之前，請使用應用程式伺服器 API 進行自主工作。

## 工作階段註冊表

監督器會為每個觀察到的 Codex 執行緒儲存一筆記錄：

```json
{
  "sessionId": "codex-thread-id",
  "endpointId": "host-a",
  "host": "host-a.example",
  "workspace": "/workspace/repo",
  "repo": "owner/repo",
  "branch": "feature/example",
  "source": "vscode",
  "status": "idle",
  "humanAttached": true,
  "lastSeenAt": "2026-05-28T10:00:00.000Z",
  "summary": "Short working-state summary"
}
```

本地實作可以從 Codex 執行緒中繼資料衍生出大部分欄位。機群部署應使用主機身分、使用者附加狀態、git 狀態和 sidecar 健康狀況來豐富記錄。

## 給 Codex 的 MCP 介面

每個受監督的 Codex 都會獲得一個名為 `openclaw-codex-supervisor` 的 MCP 伺服器。

工具：

- `codex_sessions_list`：列出可見的 Codex 工作階段。
- `codex_session_read`：讀取一份對話紀錄。
- `codex_session_send`：將訊息傳送至閒置執行緒或引導活動執行緒。
- `codex_session_interrupt`：中斷活動輪次。
- `codex_endpoint_probe`：驗證端點連線能力。
- `claw_report_progress`：將目前的任務狀態發布至監督器。
- `claw_ask`：向監督器請求協助或委派。
- `codex_spawn`：建立新的自主 Codex 工作階段。
- `codex_handoff`：請求人類或對等端接管。

資源：

- `codex://sessions`
- `codex://sessions/{sessionId}`
- `codex://sessions/{sessionId}/transcript`

## Claw 控制介面

永遠在線的 Claw 擁有與內部工具相同的基本操作：

- 列出工作階段和端點
- 讀取對話紀錄
- 傳送/引導文字
- 中斷活動工作
- 產生新的工作階段
- 總結並指派工作階段
- 將指令廣播至篩選後的群組
- 將工作階段標記為已封鎖、已完成或已放棄

工具行為：

- 如果目標執行緒處於閒置狀態，`codex_session_send` 會對應到 `turn/start`。
- 如果目標執行緒處於活動狀態且可見進行中的輪次 ID，則會對應到 `turn/steer`。
- 如果無法識別活動輪次，工具將以失敗封閉處理，而不是建立不相關的輪次。
- 除非受信任的僅限監督器策略啟用了 Codex 公開的 MCP 寫入控制，否則它們將保持停用狀態。
- 除非受信任的監管器專屬策略啟用原始逐字稿讀取，否則其將保持停用狀態。
- 除非有明確策略另行規定，否則自主審核預設拒絕工具/檔案的審核。

## 啟動流程

互動式主機登入：

1. 使用者 SSH 進入 CRAB 主機。
2. SSH 服務啟動或驗證 `codex app-server daemon start`。
3. 登入包裝器啟動 `codex --remote unix:// --cd <workspace>`。
4. 主機連接器註冊端點和已載入的執行緒。
5. 監管器發出一個高優先級的機群事件：新的 Codex 工作階段、工作區、人類附加狀態、當前任務預覽。
6. 監管器 Claw 可以立即讀取和導引。

自主生成：

1. 監管器選擇主機和工作區。
2. 主機連接器開啟或恢復 Codex 應用伺服器執行緒。
3. 監管器使用任務文字和 MCP 配置開始第一輪。
4. 工作階段註冊表將其標記為自主且可附加。
5. 一旦 Codex 支援該確切的使用者體驗，人類之後可以使用 `codex --remote <endpoint> resume <threadId>` 進行附加，或透過同一個應用伺服器上的當前恢復流程進行附加。

## 部署

首選控制平面：

- 主機連接器保持與監管器的出站 WebSocket 連接。
- 監管器狀態儲存在 OpenClaw Gateway 儲存中。
- Codex 應用伺服器仍保持在每個主機的本地；絕不要將未經身份驗證的原始應用伺服器暴露給公共網際網路。

Cloudflare 可行性：

- 適用於註冊表、耐用物件、WebSocket 汇聚、輕量級事件路由以及公共 MCP/網關端點。
- 僅靠 Cloudflare 本身不足以進行直接的主機控制，因為 Workers 無法撥打任意的私有 Unix sockets 或本地回環應用伺服器。
- 當每個主機連接器通過出站 WebSocket 回呼時，使用 Cloudflare。

VPS 備用方案：

- 當需要長時間運行的進程控制、SSH 隧道、私有網路路由或本地檔案系統存取時，使用 Hetzner 服務。
- 保持相同的協定：主機連接器出站，監管器註冊表集中，Codex 應用伺服器本地。

## 安全性

- 預設綁定是本地 Unix socket。
- 遠端應用伺服器使用權杖或簽署的持有人驗證。
- 主機連接器使用範圍主機權杖向監管器進行身份驗證。
- 監管器工具強制執行每個工作階段的策略：讀取、導引、中斷、生成、審核。
- 跨代理訊息包含 `originSessionId`；自我回聲會被丟棄。
- 廣播需要明確的過濾器和有界的目標計數。
- Transcript 讀取會在 OpenClaw 邊界對機密進行編輯。
- 除非策略允許，否則對於由監督者發起的回合，批准請求預設為拒絕。

## 實作計畫

第一階段：本地監督者 MVP

- 新增用於 stdio proxy 和 WebSocket 端點的 Codex app-server JSON-RPC 客戶端。
- 新增監督者端點/Session Registry。
- 新增 MCP 工具：list、read、send、interrupt、probe。
- 新增端點的本地環境配置。
- 新增假的 app-server 測試和一個本地即時 app-server 的冒煙測試。

第二階段：OpenClaw 整合

- 在 `codex-supervisor` 外掛程式中註冊監督者工具。
- 將監督者 MCP 注入到 Codex thread 配置中。
- 將 session 摘要新增到 agent 上下文。
- 當出現新的 Codex threads 時新增事件通知。
- 新增用於自主 send/interrupt/spawn 的策略配置。

第三階段：Fleet 連接器

- Host sidecar 註冊 app-server 端點、host metadata、git/workspace metadata 和人員附加狀態。
- 新增用於 Cloudflare 或 VPS 控制平面的出站 WebSocket 連接器。
- 新增重新連線、心跳和過期 session 清理。
- 新增 CRAB SSH 啟動器包裝器。

第四階段：自主操作

- 新增 spawn/resume/takeover 流程。
- 新增廣播和委派。
- 新增進度報告和任務狀態摘要。
- 新增迴圈防止和速率限制。
- 新增儀表板檢視。

第五階段：Multi-Claw

- 依群組分割 session。
- 為每個 session 新增領導者/租約。
- 新增稽核日誌和重播。
- 新增 Claw 群組之間的升級處理。

## 驗收測試

- 人類透過共用的 app-server 啟動 Codex TUI。
- 監督者透過 `thread/loaded/list` 列出即時 thread。
- 監督者透過 `thread/read` 讀取 transcript。
- 監督者透過 `turn/start` 發送文字到閒置的 thread。
- 監督者透過 `turn/steer` 引導活躍的 thread。
- 監督者中斷透過 `turn/interrupt` 停止活躍的回合。
- Codex 呼叫監督者 MCP 並列出對等的 sessions。
- 一個自主的 Codex 被生成，後來由人員附加。
- 遺失的 host 連接器將 sessions 標記為過期，而不刪除歷史記錄。

## 未解決的問題

- 針對在沒有 TUI 的情況下生成的 app-server thread，確切的 Codex TUI 附加 UX。
- Codex 是否應該為無頭即時共用的執行新增 `exec --remote`。
- 持久狀態擁有者：OpenClaw Gateway DB、Cloudflare Durable Object 或 VPS 資料庫。
- 監督器發起回合的審核策略粒度。
- 應將多少對話摘要注入到常開 Claw 語境中，與作為工具/資源保留相較。
