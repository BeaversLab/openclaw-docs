---
summary: "重構計劃：exec host 路由、節點核准與 headless runner"
read_when:
  - 正在設計 exec host 路由或 exec 核准
  - 正在實作 node runner + UI IPC
  - 新增 exec host 安全模式與斜線指令
title: "Exec Host 重構"
---

# Exec host 重構計劃

## 目標

- 新增 `exec.host` + `exec.security` 以跨越 **sandbox**、**gateway** 與 **node** 路由執行。
- 保持預設值 **安全**：除非明確啟用，否則不進行跨主機執行。
- 將執行拆分為具備可選 UI（macOS app）的 **headless runner 服務**，透過本機 IPC 連接。
- 提供 **per-agent** 政策、允許清單、詢問模式與節點綁定。
- 支援 **ask modes**，可搭配或不搭配允許清單使用。
- 跨平台：Unix socket + token 驗證（macOS/Linux/Windows 對等）。

## 非目標

- 不進行舊版允許清單遷移或舊版架構支援。
- 不提供 node exec 的 PTY/串流（僅聚合輸出）。
- 除了現有的 Bridge + Gateway 之外，不新增網路層。

## 決策（已鎖定）

- **Config keys:** `exec.host` + `exec.security`（允許 per-agent 覆寫）。
- **Elevation:** 保留 `/elevated` 作為 gateway 完整存取的別名。
- **Ask default:** `on-miss`。
- **Approvals store:** `~/.openclaw/exec-approvals.json`（JSON，無舊版遷移）。
- **Runner:** headless 系統服務；UI app 託管用於核准的 Unix socket。
- **Node identity:** 使用現有的 `nodeId`。
- **Socket auth:** Unix socket + token（跨平台）；如有需要日後再拆分。
- **Node host state:** `~/.openclaw/node.json`（節點 id + 配對 token）。
- **macOS exec host:** 在 macOS app 內執行 `system.run`；node host 服務透過本機 IPC 轉送請求。
- **No XPC helper:** 堅持使用 Unix socket + token + peer 檢查。

## 關鍵概念

### 主機

- `sandbox`：Docker exec（目前行為）。
- `gateway`：在 gateway host 上執行。
- `node`：透過 Bridge 在 node runner 上執行（`system.run`）。

### 安全模式

- `deny`：總是封鎖。
- `allowlist`：僅允許符合的項目。
- `full`：允許所有操作（等同於提升權限）。

### 詢問模式

- `off`：永不詢問。
- `on-miss`：僅在允許清單不匹配時詢問。
- `always`：每次都詢問。

詢問與允許清單是**獨立**的；允許清單可以與 `always` 或 `on-miss` 搭配使用。

### 原則解析（每次執行）

1. 解析 `exec.host`（工具參數 → 代理覆寫 → 全域預設）。
2. 解析 `exec.security` 和 `exec.ask`（優先順序相同）。
3. 如果主機是 `sandbox`，則繼續進行本機沙箱執行。
4. 如果主機是 `gateway` 或 `node`，則在該主機上套用安全性 + 詢問原則。

## 預設安全性

- 預設 `exec.host = sandbox`。
- 對於 `gateway` 和 `node`，預設 `exec.security = deny`。
- 預設 `exec.ask = on-miss`（僅在安全性允許時相關）。
- 如果未設定節點綁定，**代理可以以任何節點為目標**，但前提是原則允許。

## 設定介面

### 工具參數

- `exec.host`（可選）：`sandbox | gateway | node`。
- `exec.security`（可選）：`deny | allowlist | full`。
- `exec.ask`（可選）：`off | on-miss | always`。
- `exec.node`（可選）：當 `host=node` 時使用的節點 ID/名稱。

### 設定鍵（全域）

- `tools.exec.host`
- `tools.exec.security`
- `tools.exec.ask`
- `tools.exec.node`（預設節點綁定）

### 設定鍵（各代理）

- `agents.list[].tools.exec.host`
- `agents.list[].tools.exec.security`
- `agents.list[].tools.exec.ask`
- `agents.list[].tools.exec.node`

### 別名

- `/elevated on` = 為代理作業階段設定 `tools.exec.host=gateway`、`tools.exec.security=full`。
- `/elevated off` = 為代理作業階段還原先前的執行設定。

## 核准存放區 (JSON)

路徑：`~/.openclaw/exec-approvals.json`

用途：

- **執行主機**（gateway 或 node runner）的本機策略 + 允許清單。
- 當沒有 UI 可用時詢問回退。
- UI 用戶端的 IPC 憑證。

提議的架構 (v1)：

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

備註：

- 不支援舊版允許清單格式。
- `askFallback` 僅在需要 `ask` 且無法連接到 UI 時適用。
- 檔案權限：`0600`。

## Runner 服務 (headless)

### 角色

- 在本機強制執行 `exec.security` + `exec.ask`。
- 執行系統指令並傳回輸出。
- 針對 exec 生命週期發出 Bridge 事件（可選但建議）。

### 服務生命週期

- macOS 上的 Launchd/daemon；Linux/Windows 上的系統服務。
- Approvals JSON 是執行主機本機的。
- UI 託管本地 Unix socket；runers 按需連線。

## UI 整合 (macOS app)

### IPC

- 位於 `~/.openclaw/exec-approvals.sock` (0600) 的 Unix socket。
- Token 儲存在 `exec-approvals.json` (0600) 中。
- 對等檢查：僅限相同 UID。
- 挑戰/回應：nonce + HMAC(token, request-hash) 以防止重放。
- 短 TTL (例如 10s) + 最大負載 + 速率限制。

### 詢問流程 (macOS app exec host)

1. Node 服務從 gateway 接收 `system.run`。
2. Node 服務連線到本地 socket 並發送提示/exec 請求。
3. App 驗證對等端 + token + HMAC + TTL，然後在需要時顯示對話框。
4. App 在 UI 上下文中執行指令並傳回輸出。
5. Node 服務將輸出傳回給 gateway。

如果 UI 缺失：

- 套用 `askFallback` (`deny|allowlist|full`)。

### 圖表 (SCI)

```
Agent -> Gateway -> Bridge -> Node Service (TS)
                         |  IPC (UDS + token + HMAC + TTL)
                         v
                     Mac App (UI + TCC + system.run)
```

## Node 身份 + 綁定

- 使用來自 Bridge 配對的現有 `nodeId`。
- 綁定模型：
  - `tools.exec.node` 將 agent 限制在特定的 node。
  - 如果未設定，agent 可以選擇任何 node (策略仍然強制執行預設值)。
- Node 選擇解析：
  - `nodeId` 精確匹配
  - `displayName` (已標準化)
  - `remoteIp`
  - `nodeId` 前綴 (>= 6 個字元)

## 事件

### 誰看到事件

- 系統事件是 **每個 session** 的，並在下一次提示時顯示給 agent。
- 儲存在 gateway 的記憶體佇列中 (`enqueueSystemEvent`)。

### 事件文字

- `Exec started (node=<id>, id=<runId>)`
- `Exec finished (node=<id>, id=<runId>, code=<code>)` + 選用輸出尾部
- `Exec denied (node=<id>, id=<runId>, <reason>)`

### 傳輸

選項 A（推薦）：

- Runner 發送 Bridge `event` 幀 `exec.started` / `exec.finished`。
- Gateway `handleBridgeEvent` 將這些對應至 `enqueueSystemEvent`。

選項 B：

- Gateway `exec` 工具直接處理生命週期（僅同步）。

## Exec 流程

### Sandbox 主機

- 現有 `exec` 行為（未使用 sandbox 時為 Docker 或主機）。
- 僅在非 sandbox 模式下支援 PTY。

### Gateway 主機

- Gateway 程序在自己的機器上執行。
- 執行本機 `exec-approvals.json`（安全性/詢問/允許清單）。

### Node 主機

- Gateway 使用 `system.run` 呼叫 `node.invoke`。
- Runner 執行本機審核。
- Runner 傳回聚合的 stdout/stderr。
- 針對開始/完成/拒絕的選用 Bridge 事件。

## 輸出上限

- 將合併的 stdout+stderr 上限設為 **200k**；為事件保留 **tail 20k**。
- 以清晰的後綴截斷（例如 `"… (truncated)"`）。

## 斜線指令

- `/exec host=<sandbox|gateway|node> security=<deny|allowlist|full> ask=<off|on-miss|always> node=<id>`
- 每個 Agent、每個工作階段的覆寫；除非透過設定儲存，否則為非持久性。
- `/elevated on|off|ask|full` 仍是 `host=gateway security=full` 的捷徑（其中 `full` 會略過審核）。

## 跨平台故事

- Runner 服務是可移植的執行目標。
- UI 是選用的；如果缺少，則套用 `askFallback`。
- Windows/Linux 支援相同的審核 JSON + socket 通訊協定。

## 實作階段

### 階段 1：設定 + exec 路由

- 新增 `exec.host`、`exec.security`、`exec.ask`、`exec.node` 的設定 schema。
- 更新工具管道以遵守 `exec.host`。
- 新增 `/exec` 斜線指令並保留 `/elevated` 別名。

### 階段 2：審核儲存 + gateway 執行

- 實作 `exec-approvals.json` 讀取器/寫入器。
- 對 `gateway` 主機執行允許清單 + 詢問模式。
- 新增輸出上限。

### 階段 3：node runner 執行

- 更新 node runner 以執行 allowlist + ask。
- 將 Unix socket prompt bridge 加入 macOS 應用程式 UI。
- 連接 `askFallback`。

### 階段 4：事件

- 為 exec 生命週期新增 node → gateway Bridge 事件。
- 對應到 `enqueueSystemEvent` 以進行 agent prompts。

### 階段 5：UI 潤飾

- Mac 應用程式：allowlist 編輯器、per-agent 切換器、ask policy UI。
- Node 綁定控制（選用）。

## 測試計畫

- 單元測試：allowlist 匹配（glob + 不區分大小寫）。
- 單元測試：政策解析優先順序（tool param → agent override → global）。
- 整合測試：node runner deny/allow/ask 流程。
- Bridge 事件測試：node event → system event 路由。

## 已知風險

- UI 無法使用：確保遵守 `askFallback`。
- 長時間執行的指令：依賴 timeout + output caps。
- Multi-node 歧異：除非有 node 綁定或明確的 node 參數，否則報錯。

## 相關文件

- [Exec 工具](/zh-Hant/tools/exec)
- [Exec 審核](/zh-Hant/tools/exec-approvals)
- [節點](/zh-Hant/nodes)
- [提升權限模式](/zh-Hant/tools/elevated)

import footerZhHant from "/components/footer/zh-Hant.mdx";

<footerZhHant />
