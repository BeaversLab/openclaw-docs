---
summary: "重構計畫：exec host 路由、node 核准以及 headless runner"
read_when:
  - Designing exec host routing or exec approvals
  - Implementing node runner + UI IPC
  - Adding exec host security modes and slash commands
title: "Exec Host 重構"
---

# Exec host 重構計畫

## 目標

- 新增 `exec.host` + `exec.security` 以在 **sandbox**、**gateway** 和 **node** 之間路由執行。
- 保持預設值 **安全**：除非明確啟用，否則不允許跨 host 執行。
- 將執行拆分為 **headless runner service**，並透過本機 IPC 提供可選 UI（macOS app）。
- 提供 **per-agent** 政策、允許清單、詢問模式和 node 綁定。
- 支援可搭配或不搭配允許清單使用的 **詢問模式**。
- 跨平台：Unix socket + token 驗證（macOS/Linux/Windows 功能對等）。

## 非目標

- 不進行舊版允許清單遷移或舊版架構支援。
- 不為 node exec 提供 PTY/串流（僅支援彙總輸出）。
- 除了現有的 Bridge + Gateway 之外，不新增網路層。

## 決策（已鎖定）

- **配置金鑰：** `exec.host` + `exec.security` （允許 per-agent 覆寫）。
- **提權：** 將 `/elevated` 保留為 gateway 完整存取權限的別名。
- **詢問預設值：** `on-miss`。
- **核准儲存：** `~/.openclaw/exec-approvals.json` （JSON，不進行舊版遷移）。
- **Runner：** headless 系統服務；UI app 託管用於核准的 Unix socket。
- **Node 身分：** 使用現有的 `nodeId`。
- **Socket 驗證：** Unix socket + token （跨平台）；如有需要稍後再拆分。
- **Node host 狀態：** `~/.openclaw/node.json` （node id + 配對 token）。
- **macOS exec host：** 在 macOS app 內執行 `system.run`；node host 服務透過本機 IPC 轉送請求。
- **不使用 XPC helper：** 堅持使用 Unix socket + token + peer 檢查。

## 關鍵概念

### Host

- `sandbox`：Docker exec （目前的行為）。
- `gateway`：在 gateway host 上執行。
- `node`：透過 Bridge 在 node runner 上執行（`system.run`）。

### 安全模式

- `deny`：一律封鎖。
- `allowlist`：僅允許相符項目。
- `full`：允許所有項目（等同於提權）。

### 詢問模式

- `off`：永不詢問。
- `on-miss`：僅在允許清單不匹配時詢問。
- `always`：每次都詢問。

「詢問」與允許清單**獨立**；允許清單可與 `always` 或 `on-miss` 搭配使用。

### 原則解析（每次執行）

1. 解析 `exec.host`（工具參數 → 代理覆寫 → 全域預設值）。
2. 解析 `exec.security` 和 `exec.ask`（優先順序相同）。
3. 如果主機是 `sandbox`，則繼續進行本機沙箱執行。
4. 如果主機是 `gateway` 或 `node`，則在該主機上套用安全性 + 詢問原則。

## 預設安全性

- 預設 `exec.host = sandbox`。
- 對於 `gateway` 和 `node`，預設 `exec.security = deny`。
- 預設 `exec.ask = on-miss`（僅在安全性允許時相關）。
- 如果未設定節點綁定，**代理可以指定任何節點**，但僅限原則允許的情況。

## 組態介面

### 工具參數

- `exec.host`（選用）：`sandbox | gateway | node`。
- `exec.security`（選用）：`deny | allowlist | full`。
- `exec.ask`（選用）：`off | on-miss | always`。
- `exec.node`（選用）：當 `host=node` 時要使用的節點 ID/名稱。

### 組態鍵（全域）

- `tools.exec.host`
- `tools.exec.security`
- `tools.exec.ask`
- `tools.exec.node`（預設節點綁定）

### 組態鍵（各代理）

- `agents.list[].tools.exec.host`
- `agents.list[].tools.exec.security`
- `agents.list[].tools.exec.ask`
- `agents.list[].tools.exec.node`

### 別名

- `/elevated on` = 為代理工作階段設定 `tools.exec.host=gateway`、`tools.exec.security=full`。
- `/elevated off` = 為代理工作階段還原先前的執行設定。

## 核准存放區（JSON）

路徑：`~/.openclaw/exec-approvals.json`

用途：

- 用於 **執行主機**（閘道或節點執行器）的本機原則 + 允許清單。
- 當沒有 UI 可用時的詢問後備方案。
- UI 用戶端的 IPC 憑證。

建議的架構 (v1)：

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

- 無舊版允許清單格式。
- `askFallback` 僅在需要 `ask` 且無法連線至 UI 時適用。
- 檔案權限：`0600`。

## Runner 服務

### 角色

- 在本機強制執行 `exec.security` + `exec.ask`。
- 執行系統指令並回傳輸出。
- 針對執行生命週期發出 Bridge 事件（可選但建議）。

### 服務生命週期

- macOS 上為 Launchd/daemon；Linux/Windows 上為系統服務。
- 核准 JSON 位於執行主機本機。
- UI 託管本機 Unix socket；runers 按需連線。

## UI 整合

### IPC

- 位於 `~/.openclaw/exec-approvals.sock` 的 Unix socket (0600)。
- Token 儲存於 `exec-approvals.json` 中 (0600)。
- 對等檢查：僅限相同 UID。
- 挑戰/回應：nonce + HMAC(token, request-hash) 以防止重放。
- 短 TTL (例如 10s) + 最大承載 + 速率限制。

### 詢問流程 (macOS app 執行主機)

1. 節點服務從 gateway 接收 `system.run`。
2. 節點服務連線至本機 socket 並傳送提示/執行請求。
3. App 驗證對等方 + token + HMAC + TTL，然後視需要顯示對話框。
4. App 在 UI 語境中執行指令並回傳輸出。
5. 節點服務將輸出回傳給 gateway。

如果 UI 缺失：

- 套用 `askFallback` (`deny|allowlist|full`)。

### 圖表 (SCI)

```
Agent -> Gateway -> Bridge -> Node Service (TS)
                         |  IPC (UDS + token + HMAC + TTL)
                         v
                     Mac App (UI + TCC + system.run)
```

## 節點身分識別 + 繫結

- 使用來自 Bridge 配對的現有 `nodeId`。
- 繫結模型：
  - `tools.exec.node` 將代理程式限制在特定節點。
  - 若未設定，代理程式可選擇任何節點 (原則仍會強制執行預設值)。
- 節點選取解析：
  - `nodeId` 完全符合
  - `displayName` (標準化)
  - `remoteIp`
  - `nodeId` 前綴 (>= 6 個字元)

## 事件處理

### 誰看得到事件

- 系統事件是**每個會話** 的，並在下一次提示時顯示給代理程式。
- 儲存在 gateway 記憶體佇列中 (`enqueueSystemEvent`)。

### 事件文字

- `Exec started (node=<id>, id=<runId>)`
- `Exec finished (node=<id>, id=<runId>, code=<code>)` + 選用的輸出結尾
- `Exec denied (node=<id>, id=<runId>, <reason>)`

### 傳輸

選項 A (建議)：

- Runner 發送 Bridge `event` frames `exec.started` / `exec.finished`。
- Gateway `handleBridgeEvent` 將這些映射為 `enqueueSystemEvent`。

選項 B：

- Gateway `exec` tool 直接處理生命週期（僅限同步）。

## 執行流程

### Sandbox host

- 現有的 `exec` 行為（Docker 或未沙盒化時的主機）。
- PTY 僅在非沙盒模式下支援。

### Gateway host

- Gateway 进程在自己的机器上执行。
- 強制執行本地 `exec-approvals.json` (security/ask/allowlist)。

### Node host

- Gateway 使用 `system.run` 調用 `node.invoke`。
- Runner 強制執行本地核准。
- Runner 返回聚合的 stdout/stderr。
- 針對開始/完成/拒絕的可選 Bridge 事件。

## 輸出上限

- 將合併的 stdout+stderr 限制在 **200k**；保留事件的 **tail 20k**。
- 使用明確的後綴截斷（例如 `"… (truncated)"`）。

## 斜線指令

- `/exec host=<sandbox|gateway|node> security=<deny|allowlist|full> ask=<off|on-miss|always> node=<id>`
- Per-agent、per-session 覆蓋；除非透過設定儲存，否則為非持久性。
- `/elevated on|off|ask|full` 仍然是 `host=gateway security=full` 的捷徑（透過 `full` 跳過核准）。

## 跨平台支援

- Runner service 是可移植的執行目標。
- UI 是可選的；如果缺少，則適用 `askFallback`。
- Windows/Linux 支援相同的核准 JSON + socket 協定。

## 實作階段

### 階段 1：設定 + 執行路由

- 新增 `exec.host`、`exec.security`、`exec.ask`、`exec.node` 的設定架構。
- 更新 tool plumbing 以遵守 `exec.host`。
- 新增 `/exec` 斜線指令並保留 `/elevated` 別名。

### 階段 2：核准儲存 + gateway 強制執行

- 實作 `exec-approvals.json` 讀寫器。
- 對 `gateway` host 強制執行 allowlist + ask 模式。
- 新增輸出上限。

### 階段 3：node runner 強制執行

- 更新 node runner 以強制執行 allowlist + ask。
- 將 Unix socket prompt bridge 連線至 macOS 應用程式 UI。
- 連接 `askFallback`。

### 階段 4：事件

- 針對執行生命週期，新增 node → gateway Bridge 事件。
- 對應至 `enqueueSystemEvent` 以供 agent 提示使用。

### 階段 5：UI 打磨

- Mac 應用程式：允許清單編輯器、per-agent 切換器、詢問政策 UI。
- Node 繫結控制（選用）。

## 測試計畫

- 單元測試：允許清單比對（glob + 不區分大小寫）。
- 單元測試：政策解析優先順序（tool 參數 → agent 覆寫 → 全域）。
- 整合測試：node runner 拒絕/允許/詢問流程。
- Bridge 事件測試：node event → system event 路由。

## 開放風險

- UI 無法使用：確保遵守 `askFallback`。
- 長時間執行的指令：依賴逾時 + 輸出上限。
- Multi-node 模糊性：除非有 node 繫結或明確的 node 參數，否則報錯。

## 相關文件

- [Exec tool](/zh-Hant/tools/exec)
- [Exec approvals](/zh-Hant/tools/exec-approvals)
- [Nodes](/zh-Hant/nodes)
- [Elevated mode](/zh-Hant/tools/elevated)

import footerZhHant from "/components/footer/zh-Hant.mdx";

<footerZhHant />
