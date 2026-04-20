---
summary: "重構計畫：exec host 路由、節點審核與無頭執行器"
read_when:
  - Designing exec host routing or exec approvals
  - Implementing node runner + UI IPC
  - Adding exec host security modes and slash commands
title: "Exec Host 重構"
---

# Exec host 重構計畫

## 目標

- 新增 `exec.host` + `exec.security` 以在 **sandbox**、**gateway** 和 **node** 之間路由執行。
- 保持預設值 **安全**：除非明確啟用，否則不允許跨主機執行。
- 將執行拆分為具選用 UI（macOS app）透過本機 IPC 連線的 **無頭執行器服務**。
- 提供 **個別代理程式** 的原則、允許清單、詢問模式和節點綁定。
- 支援可搭配允許清單使用或不使用的 **詢問模式**。
- 跨平台：Unix socket + token 認證（macOS/Linux/Windows 同等支援）。

## 非目標

- 不提供舊版允許清單遷移或舊版 Schema 支援。
- 不提供節點執行的 PTY/串流（僅支援聚合輸出）。
- 除了現有的 Bridge + Gateway 之外，不新增額外的網路層。

## 已鎖定的決定

- **設定金鑰：** `exec.host` + `exec.security`（允許各別代理程式覆寫）。
- **提權：** 將 `/elevated` 保留為 gateway 完整存取權的別名。
- **詢問預設值：** `on-miss`。
- **審核儲存：** `~/.openclaw/exec-approvals.json`（JSON，無舊版遷移）。
- **執行器：** 無頭系統服務；UI app 託管 Unix socket 用於審核。
- **節點身分識別：** 使用現有的 `nodeId`。
- **Socket 認證：** Unix socket + token（跨平台）；如有需要之後再拆分。
- **節點主機狀態：** `~/.openclaw/node.json`（節點 ID + 配對 token）。
- **macOS exec host：** 在 macOS app 內執行 `system.run`；節點主機服務透過本機 IPC 轉發請求。
- **不使用 XPC helper：** 堅持使用 Unix socket + token + 對等檢查。

## 關鍵概念

### 主機

- `sandbox`：Docker exec（目前行為）。
- `gateway`：在 gateway host 上執行。
- `node`：透過 Bridge 在節點執行器上執行（`system.run`）。

### 安全模式

- `deny`：一律封鎖。
- `allowlist`：僅允許符合的項目。
- `full`：允許所有項目（等同於已提權）。

### 詢問模式

- `off`：永不詢問。
- `on-miss`：僅在允許清單不符時詢問。
- `always`：每次都詢問。

詢問（Ask）與允許清單（allowlist）彼此**獨立**；允許清單可與 `always` 或 `on-miss` 搭配使用。

### 原則解析（每次執行）

1. 解析 `exec.host`（工具參數 → 代理覆寫 → 全域預設）。
2. 解析 `exec.security` 和 `exec.ask`（優先順序相同）。
3. 如果主機是 `sandbox`，則繼續進行本地沙箱執行。
4. 如果主機是 `gateway` 或 `node`，則對該主機套用安全性 + 詢問原則。

## 預設安全性

- 預設 `exec.host = sandbox`。
- 針對 `gateway` 和 `node`，預設 `exec.security = deny`。
- 預設 `exec.ask = on-miss`（僅在安全性允許時相關）。
- 若未設定節點綁定，**代理可以以任何節點為目標**，但前提是原則允許。

## 設定介面

### 工具參數

- `exec.host`（選用）：`sandbox | gateway | node`。
- `exec.security`（選用）：`deny | allowlist | full`。
- `exec.ask`（選用）：`off | on-miss | always`。
- `exec.node`（選用）：當 `host=node` 時要使用的節點 ID/名稱。

### 設定鍵（全域）

- `tools.exec.host`
- `tools.exec.security`
- `tools.exec.ask`
- `tools.exec.node`（預設節點綁定）

### 設定鍵（每個代理）

- `agents.list[].tools.exec.host`
- `agents.list[].tools.exec.security`
- `agents.list[].tools.exec.ask`
- `agents.list[].tools.exec.node`

### 別名

- `/elevated on` = 為代理工作階段設定 `tools.exec.host=gateway`、`tools.exec.security=full`。
- `/elevated off` = 為代理工作階段還原先前的執行設定。

## 核准存放區 (JSON)

路徑：`~/.openclaw/exec-approvals.json`

用途：

- **執行主機**（閘道或節點執行器）的本地原則與允許清單。
- 無 UI 時的詢問後援機制。
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
- `askFallback` 僅在需要 `ask` 且無法連接 UI 時套用。
- 檔案權限：`0600`。

## 執行器服務 (無頭模式)

### 角色

- 在本機強制執行 `exec.security` + `exec.ask`。
- 執行系統指令並回傳輸出。
- 發送執行生命週期的 Bridge 事件 (可選但建議)。

### 服務生命週期

- macOS 上為 Launchd/daemon；Linux/Windows 上為系統服務。
- Approvals JSON 檔案位於執行主機本機。
- UI 託管本機 Unix socket；執行器按需連線。

## UI 整合 (macOS 應用程式)

### IPC

- 位於 `~/.openclaw/exec-approvals.sock` 的 Unix socket (0600)。
- Token 儲存於 `exec-approvals.json` (0600)。
- 對等檢查：僅限相同 UID。
- 挑戰/回應：nonce + HMAC(token, request-hash) 以防止重放。
- 短暫 TTL (例如 10 秒) + 最大負載 + 速率限制。

### 詢問流程 (macOS 應用程式執行主機)

1. Node 服務從閘道接收 `system.run`。
2. Node 服務連線到本機 socket 並發送提示/執行請求。
3. 應用程式驗證對等端 + token + HMAC + TTL，然後在需要時顯示對話框。
4. 應用程式在 UI 語境中執行指令並回傳輸出。
5. Node 服務將輸出回傳給閘道。

如果 UI 遺失：

- 套用 `askFallback` (`deny|allowlist|full`)。

### 圖表 (SCI)

```
Agent -> Gateway -> Bridge -> Node Service (TS)
                         |  IPC (UDS + token + HMAC + TTL)
                         v
                     Mac App (UI + TCC + system.run)
```

## 節點身分識別 + 綁定

- 使用來自 Bridge 配對的現有 `nodeId`。
- 綁定模型：
  - `tools.exec.node` 將代理程式限制在特定節點。
  - 若未設定，代理程式可選擇任何節點 (政策仍強制執行預設值)。
- 節點選取解析：
  - `nodeId` 完全相符
  - `displayName` (已正規化)
  - `remoteIp`
  - `nodeId` 前綴 (>= 6 個字元)

## 事件

### 誰看得到事件

- 系統事件是 **依據 session** 並在下一次提示時顯示給代理程式。
- 儲存於閘道的記憶體佇列中 (`enqueueSystemEvent`)。

### 事件文字

- `Exec started (node=<id>, id=<runId>)`
- `Exec finished (node=<id>, id=<runId>, code=<code>)` + 選用輸出尾部
- `Exec denied (node=<id>, id=<runId>, <reason>)`

### 傳輸

選項 A (建議)：

- Runner 發送 Bridge `event` 幀 `exec.started` / `exec.finished`。
- Gateway `handleBridgeEvent` 將這些對應至 `enqueueSystemEvent`。

選項 B：

- Gateway `exec` 工具直接處理生命週期（僅限同步）。

## Exec 流程

### Sandbox host

- 現有的 `exec` 行為（未使用 sandbox 時為 Docker 或 host）。
- 僅在非沙箱模式支援 PTY。

### Gateway host

- Gateway 程序在其自身的機器上執行。
- 強制執行本地 `exec-approvals.json`（安全性/詢問/允許清單）。

### Node host

- Gateway 以 `system.run` 呼叫 `node.invoke`。
- Runner 強制執行本機核准。
- Runner 傳回聚合的 stdout/stderr。
- 針對開始/完成/拒絕的選用 Bridge 事件。

## 輸出上限

- 將合併的 stdout+stderr 上限設為 **200k**；保留 **tail 20k** 用於事件。
- 使用明確的後綴截斷（例如 `"… (truncated)"`）。

## 斜線指令

- `/exec host=<sandbox|gateway|node> security=<deny|allowlist|full> ask=<off|on-miss|always> node=<id>`
- 針對每個 Agent、每個工作階段的覆寫；除非透過設定儲存，否則為非永久性。
- `/elevated on|off|ask|full` 保持為 `host=gateway security=full` 的捷徑（其中 `full` 跳過核准）。

## 跨平台情況

- Runner 服務是可攜帶的執行目標。
- UI 為選用；如果遺失，則適用 `askFallback`。
- Windows/Linux 支援相同的核准 JSON + socket 通訊協定。

## 實作階段

### 階段 1：設定 + exec 路由

- 新增 `exec.host`、`exec.security`、`exec.ask`、`exec.node` 的設定架構。
- 更新工具管道以遵守 `exec.host`。
- 新增 `/exec` 斜線指令並保留 `/elevated` 別名。

### 階段 2：核准存放區 + gateway 強制執行

- 實作 `exec-approvals.json` 讀取器/寫入器。
- 針對 `gateway` host 強制執行允許清單 + 詢問模式。
- 新增輸出上限。

### 階段 3：node runner 強制執行

- 更新 node runner 以強制執行允許清單 + 詢問。
- 將 Unix socket prompt bridge 連線至 macOS 應用程式 UI。
- 連線 `askFallback`。

### 階段 4：事件

- 針對執行生命週期，新增 node → gateway Bridge 事件。
- 對應至 `enqueueSystemEvent` 以供 agent 提示使用。

### 階段 5：UI 打磨

- Mac 應用程式：允許清單編輯器、每個 agent 的切換器、詢問政策 UI。
- 節點綁定控制（選用）。

## 測試計畫

- 單元測試：允許清單匹配（glob + 不區分大小寫）。
- 單元測試：政策解析優先順序（工具參數 → agent 覆蓋 → 全域）。
- 整合測試：節點執行器的拒絕/允許/詢問流程。
- Bridge 事件測試：節點事件 → 系統事件路由。

## 開放風險

- UI 無法使用：確保遵守 `askFallback`。
- 長時間執行的指令：依賴逾時 + 輸出上限。
- 多節點歧異：除非有節點綁定或明確的節點參數，否則報錯。

## 相關文件

- [Exec tool](/zh-Hant/tools/exec)
- [Exec approvals](/zh-Hant/tools/exec-approvals)
- [Nodes](/zh-Hant/nodes)
- [Elevated mode](/zh-Hant/tools/elevated)
