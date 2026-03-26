---
summary: "重構計畫：執行主機路由、節點核准以及無頭執行器"
read_when:
  - Designing exec host routing or exec approvals
  - Implementing node runner + UI IPC
  - Adding exec host security modes and slash commands
title: "執行主機重構"
---

# 執行主機重構計畫

## 目標

- 新增 `exec.host` + `exec.security` 以在 **sandbox**、**gateway** 和 **node** 之間路由執行。
- 保持預設值 **安全**：除非明確啟用，否則不允許跨主機執行。
- 將執行分離為 **無頭執行器服務**，並透過本機 IPC 提供選用的 UI (macOS 應用程式)。
- 提供 **每個代理程式** 的原則、允許清單、詢問模式和節點綁定。
- 支援可搭配或不搭配允許清單使用的 **詢問模式**。
- 跨平台：Unix socket + 權杖驗證 (macOS/Linux/Windows 功能對等)。

## 非目標

- 不進行舊版允許清單遷移或舊版架構支援。
- 節點執行不提供 PTY/串流 (僅提供彙總輸出)。
- 除現有的 Bridge + Gateway 外，不新增網路層。

## 決策（已鎖定）

- **組態鍵：** `exec.host` + `exec.security`（允許每個 agent 覆蓋）。
- **提權：** 將 `/elevated` 保留為 gateway 完全存取的別名。
- **Ask 預設值：** `on-miss`。
- **核准儲存：** `~/.openclaw/exec-approvals.json`（JSON，無舊版遷移）。
- **執行器：** 無頭系統服務；UI 應用程式主持用於核准的 Unix socket。
- **Node 身分識別：** 使用現有的 `nodeId`。
- **Socket 驗證：** Unix socket + token（跨平台）；如有需要稍後再拆分。
- **Node 主機狀態：** `~/.openclaw/node.json`（node id + 配對 token）。
- **macOS exec host：** 在 macOS 應用程式內執行 `system.run`；node host 服務透過本機 IPC 轉發請求。
- **不使用 XPC helper：** 堅持使用 Unix socket + token + peer 檢查。

## 關鍵概念

### 主機

- `sandbox`：Docker exec（目前的行為）。
- `gateway`：在 gateway host 上執行 exec。
- `node`：透過 Bridge (`system.run`) 在 node runner 上執行 exec。

### 安全模式

- `deny`：永遠封鎖。
- `allowlist`：僅允許符合條件的項目。
- `full`：允許所有項目（等同於 elevated）。

### 詢問模式

- `off`：永不詢問。
- `on-miss`：僅在 allowlist 不符合時詢問。
- `always`：每次都詢問。

詢問與 allowlist 是**獨立**的；allowlist 可與 `always` 或 `on-miss` 搭配使用。

### 策略解析（每次 exec）

1. 解析 `exec.host` (tool param → agent override → global default)。
2. 解析 `exec.security` 和 `exec.ask` (優先順序相同)。
3. 如果 host 是 `sandbox`，則繼續執行本機沙盒執行。
4. 如果 host 是 `gateway` 或 `node`，則對該 host 應用安全 + 詢問策略。

## 預設安全性

- 預設 `exec.host = sandbox`。
- `gateway` 和 `node` 的預設 `exec.security = deny`。
- 預設 `exec.ask = on-miss` (僅在安全性允許時相關)。
- 如果未設定節點綁定，**Agent 可以以任何節點為目標**，但僅限於策略允許的情況。

## 設定介面

### 工具參數

- `exec.host` (可選): `sandbox | gateway | node`。
- `exec.security` (optional): `deny | allowlist | full`。
- `exec.ask` (optional): `off | on-miss | always`。
- `exec.node` (optional): 當 `host=node` 時使用的節點 ID/名稱。

### Config keys (global)

- `tools.exec.host`
- `tools.exec.security`
- `tools.exec.ask`
- `tools.exec.node` (預設節點綁定)

### Config keys (per agent)

- `agents.list[].tools.exec.host`
- `agents.list[].tools.exec.security`
- `agents.list[].tools.exec.ask`
- `agents.list[].tools.exec.node`

### 別名

- `/elevated on` = 為代理程式工作階段設定 `tools.exec.host=gateway`、`tools.exec.security=full`。
- `/elevated off` = 為代理程式工作階段還原先前的 exec 設定。

## 核准存放區 (JSON)

Path: `~/.openclaw/exec-approvals.json`

Purpose:

- Local policy + allowlists for the **execution host** (gateway or node runner).
- Ask fallback when no UI is available.
- IPC credentials for UI clients.

Proposed schema (v1):

```json
{
  "version": 1,
  "socket": {
    "path": "~/.openclaw/exec-approvals.sock",
    "token": "base64-opaque-token"
  },
  "defaults": {
    "security": "deny",
    "ask": "on-miss",
    "askFallback": "deny"
  },
  "agents": {
    "agent-id-1": {
      "security": "allowlist",
      "ask": "on-miss",
      "allowlist": [
        {
          "pattern": "~/Projects/**/bin/rg",
          "lastUsedAt": 0,
          "lastUsedCommand": "rg -n TODO",
          "lastResolvedPath": "/Users/user/Projects/.../bin/rg"
        }
      ]
    }
  }
}
```

Notes:

- No legacy allowlist formats.
- `askFallback` applies only when `ask` is required and no UI is reachable.
- File permissions: `0600`.

## Runner service (headless)

### Role

- Enforce `exec.security` + `exec.ask` locally.
- Execute system commands and return output.
- Emit Bridge events for exec lifecycle (optional but recommended).

### Service lifecycle

- Launchd/daemon on macOS; system service on Linux/Windows.
- Approvals JSON is local to the execution host.
- UI hosts a local Unix socket; runners connect on demand.

## UI integration (macOS app)

### IPC

- Unix socket 於 `~/.openclaw/exec-approvals.sock` (0600)。
- Token 儲存於 `exec-approvals.json` (0600)。
- Peer 檢查：僅限相同 UID。
- 挑戰/回應：nonce + HMAC(token, request-hash) 以防止重放。
- 短暫 TTL (例如 10s) + 最大 payload + 速率限制。

### Ask flow (macOS app exec host)

1. Node service 從 gateway 接收 `system.run`。
2. Node service 連接到本機 socket 並發送 prompt/exec request。
3. App 驗證 peer + token + HMAC + TTL，然後在需要時顯示對話框。
4. App 在 UI 語境中執行命令並傳回輸出。
5. Node service 將輸出傳回給 gateway。

如果 UI 缺失：

- 應用 `askFallback` (`deny|allowlist|full`)。

### Diagram (SCI)

```
Agent -> Gateway -> Bridge -> Node Service (TS)
                         |  IPC (UDS + token + HMAC + TTL)
                         v
                     Mac App (UI + TCC + system.run)
```

## Node identity + binding

- 使用來自 Bridge 配對的現有 `nodeId`。
- Binding model：
  - `tools.exec.node` 將 agent 限制在特定 node。
  - 如果未設定，Agent 可以選擇任何節點（原則仍會強制執行預設值）。
- 節點選擇解析：
  - `nodeId` 完全符合
  - `displayName`（已標準化）
  - `remoteIp`
  - `nodeId` 字首（>= 6 個字元）

## 事件處理

### 誰可以看到事件

- 系統事件是**依會話 (per session)** 的，並會在下一個提示中顯示給 Agent。
- 儲存在閘道記憶體佇列 (`enqueueSystemEvent`) 中。

### 事件文字

- `Exec started (node=<id>, id=<runId>)`
- `Exec finished (node=<id>, id=<runId>, code=<code>)` + 選用輸出尾部
- `Exec denied (node=<id>, id=<runId>, <reason>)`

### 傳輸

選項 A（建議）：

- Runner 發送 Bridge `event` 幀 `exec.started` / `exec.finished`。
- 閘道 `handleBridgeEvent` 將這些對應到 `enqueueSystemEvent`。

選項 B：

- Gateway `exec` 工具直接處理生命週期（僅同步）。

## 執行流程

### Sandbox 主機

- 現有的 `exec` 行為（Docker 或非沙箱模式下的 host）。
- 僅在非沙箱模式下支援 PTY。

### Gateway 主機

- Gateway 程序在自己的機器上執行。
- 強制執行本地 `exec-approvals.json`（security/ask/allowlist）。

### Node 主機

- Gateway 使用 `system.run` 呼叫 `node.invoke`。
- Runner 強制執行本地審核。
- Runner 返回聚合的 stdout/stderr。
- 可選的 Bridge 事件用於 start/finish/deny。

## 輸出限制

- 將合併的 stdout+stderr 限制在 **200k**；為事件保留 **tail 20k**。
- 使用明確的後綴截斷（例如 `"… (truncated)"`）。

## 斜線指令

- `/exec host=<sandbox|gateway|node> security=<deny|allowlist|full> ask=<off|on-miss|always> node=<id>`
- 每個 Agent、每個 Session 的覆蓋；除非透過配置儲存，否則不持久化。
- `/elevated on|off|ask|full` 仍然是 `host=gateway security=full` 的捷徑（其中 `full` 跳過核准）。

## 跨平台故事

- Runner 服務是可移植的執行目標。
- UI 是可選的；如果缺失，則套用 `askFallback`。
- Windows/Linux 支援相同的核准 JSON + socket 協定。

## 實作階段

### 第 1 階段：設定 + exec 路由

- 新增 `exec.host`、`exec.security`、`exec.ask`、`exec.node` 的設定架構。
- 更新工具管道以遵守 `exec.host`。
- 新增 `/exec` 斜線指令並保留 `/elevated` 別名。

### 第 2 階段：核准存放區 + 閘道強制執行

- 實作 `exec-approvals.json` 讀取器/寫入器。
- 針對 `gateway` 主機強制執行允許清單 + 詢問模式。
- 新增輸出上限。

### 第 3 階段：Node runner 強制執行

- 更新 node runner 以強制執行允許清單 + 詢問。
- 將 Unix socket 提示橋接新增至 macOS 應用程式 UI。
- 連線 `askFallback`。

### 第 4 階段：事件

- 新增 node → gateway Bridge 事件以用於 exec 生命週期。
- 對應至 `enqueueSystemEvent` 以供 Agent 提示使用。

### 第 5 階段：UI 打磨

- Mac 應用程式：允許清單編輯器、Per-agent 切換器、詢問原則 UI。
- Node 綁定控制（可選）。

## 測試計畫

- 單元測試：允許清單比對（glob + 不區分大小寫）。
- 單元測試：原則解析優先順序（tool 參數 → agent 覆寫 → 全域）。
- 整合測試：node runner 拒絕/允許/詢問流程。
- Bridge 事件測試：node 事件 → 系統事件路由。

## 開放風險

- UI 無法使用：確保遵守 `askFallback`。
- 長時間執行的命令：依賴逾時和輸出上限。
- 多節點歧義：除非有節點綁定或明確的節點參數，否則報錯。

## 相關文件

- [Exec tool](/zh-Hant/tools/exec)
- [Exec approvals](/zh-Hant/tools/exec-approvals)
- [Nodes](/zh-Hant/nodes)
- [Elevated mode](/zh-Hant/tools/elevated)

import footerZhHant from "/components/footer/zh-Hant.mdx";

<footerZhHant />
