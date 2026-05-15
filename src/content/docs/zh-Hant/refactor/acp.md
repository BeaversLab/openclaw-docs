---
summary: "讓 ACP session 和 ACPX process 所有權變得明確的遷移計畫"
read_when:
  - Refactoring ACP session lifecycle or ACPX process cleanup
  - Debugging ACPX orphan processes, PID reuse, or multi-gateway cleanup safety
  - Changing sessions_list visibility for spawned ACP or subagent sessions
  - Designing ownership metadata for background tasks, ACP sessions, or process leases
title: "ACP 生命週期重構"
sidebarTitle: "ACP 生命週期重構"
---

ACP 生命週期目前運作正常，但太多部分是事後推斷的。
Process cleanup 會根據 PID、命令字串、wrapper
路徑以及即時 process 表來重建所有權。Session 可見性則是根據
session-key 字串加上次要的 `sessions.list({ spawnedBy })` 查找來重建所有權。
這使得小幅度修補成為可能，但也讓邊緣情況容易被忽略：
PID 重複使用、帶引號的命令、adapter 孫進程、多 gateway 狀態根、
`cancel` 與 `close` 的對比，以及 `tree` 與 `all` 的可見性對比，都變成了
重新發現相同所有權規則的各自獨立的地方。

此次重構將所有權提升為一級概念。目標並非建立新的 ACP 產品
介面；而是為現有的 ACP 與 ACPX 行為建立更安全的內部合約。

## 目標

- 除非目前的即時證據符合 OpenClaw 擁有的租約，否則 cleanup
  絕不發送訊號給 process。
- `cancel`、`close` 和 startup reaping 具有不同的生命週期意圖。
- `sessions_list`、`sessions_history`、`sessions_send` 和狀態檢查均使用
  相同的請求者擁有的 session 模型。
- 多 gateway 安裝環境不能清除彼此的 ACPX wrappers。
- 舊的 ACPX session 記錄在遷移期間持續正常運作。
- Runtime 維持由 plugin 擁有；core 不會得知 ACPX 套件的細節。

## 非目標

- 替換 ACPX 或變更公開的 `/acp` 指令介面。
- 將廠商特定的 ACP adapter 行為移入 core。
- 要求使用者在升級前手動清理狀態。
- 讓 `cancel` 關閉可重複使用的 ACP sessions。

## 目標模型

### Gateway 實例身份

每個 Gateway process 都應該有一個穩定的 runtime instance id：

```ts
type GatewayInstanceId = string;
```

它可以在 Gateway 啟動時生成，並在該安裝的生命週期內持久化保存於狀態中。它不是安全機密；它是所有權區分符，用於避免將一個 Gateway 的 ACP 程序與另一個 Gateway 的程序混淆。

### ACP Session 所有权

每個生成的 ACP 會話都應該具有標準化的所有權元數據：

```ts
type AcpSessionOwner = {
  sessionKey: string;
  spawnedBy?: string;
  parentSessionKey?: string;
  ownerSessionKey: string;
  agentId: string;
  backend: "acpx";
  gatewayInstanceId: GatewayInstanceId;
  createdAt: number;
};
```

Gateway 應該在已知的會話行上返回這些欄位。可見性過濾應該是對行元數據的純粹檢查：

```ts
canSeeSessionRow({
  row,
  requesterSessionKey,
  visibility,
  a2aPolicy,
});
```

這從可見性檢查中移除了隱藏的次要 `sessions.list({ spawnedBy })` 呼叫。生成的跨代理 ACP 子進程之所以是請求者擁有的，是因為行中這樣標註，而不是因為第二次查詢恰好找到了它。

### ACPX 程序租約

每次生成的 wrapper 啟動都應該創建一個租約記錄：

```ts
type AcpxProcessLease = {
  leaseId: string;
  gatewayInstanceId: GatewayInstanceId;
  sessionKey: string;
  wrapperRoot: string;
  wrapperPath: string;
  rootPid: number;
  processGroupId?: number;
  commandHash: string;
  startedAt: number;
  state: "open" | "closing" | "closed" | "lost";
};
```

wrapper 程序應該在其環境中接收租約 ID 和 gateway 實例 ID：

```sh
OPENCLAW_ACPX_LEASE_ID=...
OPENCLAW_GATEWAY_INSTANCE_ID=...
```

當平台允許時，驗證應優先使用實時程序元數據，這些元數據不會被命令引號混淆：

- 根 PID 仍然存在
- 實時 wrapper 路徑位於 `wrapperRoot` 之下
- 程序組在可用時與租約匹配
- 環境在可讀時包含預期的租約 ID
- 命令哈希或可執行路徑與租約匹配

如果無法驗證實時程序，清理將以失敗關閉（fails closed）。

## 生命週期控制器

引入一個擁有程序租約和清理策略的 ACPX 生命週期控制器：

```ts
interface AcpxLifecycleController {
  ensureSession(input: AcpRuntimeEnsureInput): Promise<AcpRuntimeHandle>;
  cancelTurn(handle: AcpRuntimeHandle): Promise<void>;
  closeSession(input: { handle: AcpRuntimeHandle; discardPersistentState?: boolean; reason?: string }): Promise<void>;
  reapStartupOrphans(): Promise<void>;
  verifyOwnedTree(lease: AcpxProcessLease): Promise<OwnedProcessTree | null>;
}
```

`cancelTurn` 請求僅進行取消操作。它不得收割可重用的 wrapper 或 adapter 程序。

`closeSession` 被允許進行收割，但僅限於加載會話記錄、加載租約並驗證實時程序樹仍然屬於該租約之後。

`reapStartupOrphans` 從狀態中打開的租約開始。它可以使用程序表來查找後代，但不应首先掃描任意的看似 ACP 的命令，然後再決定它們可能是我們的。

## Wrapper 契約

生成的 wrapper 應保持小巧。它們應該：

- 在支持的情況下，在程序組中啟動 adapter
- 將正常終止信號轉發給程序組
- 檢測父進程死亡
- 在父進程死亡時，發送 SIGTERM，然後保持 wrapper 處於活動狀態，直到 SIGKILL
  備用方案運行
- 在可用時，將根 PID 和程序組 ID 報告回生命週期控制器

Wrapper 不應該決定 session 政策。它們僅針對自己的 adapter group 強制執行本機進程樹清理。

## Session 可見性合約

可見性應該使用標準化的資料列擁有權：

```ts
type SessionVisibilityInput = {
  requesterSessionKey: string;
  row: {
    key: string;
    agentId: string;
    ownerSessionKey?: string;
    spawnedBy?: string;
    parentSessionKey?: string;
  };
  visibility: "self" | "tree" | "agent" | "all";
  a2aPolicy: AgentToAgentPolicy;
};
```

規則：

- `self`：僅限請求者 session。
- `tree`：請求者 session 加上由請求者擁有或產生的資料列。
- `all`：所有相同 agent 的資料列、允許 a2a 的跨 agent 資料列，以及請求者擁有的
  產生跨 agent 資料列，即使在一般 a2a 停用時亦然。
- `agent`：僅限相同 agent，除非明確的擁有者關係指出該資料列
  屬於請求者。

這使得 `tree` 和 `all` 具有單調性：`all` 不得隱藏
`tree` 會顯示的擁有子項。

## 移轉計畫

### 階段 1：新增身分識別與租約

- 將 `gatewayInstanceId` 新增至 Gateway 狀態。
- 在 ACPX 狀態目錄下新增 ACPX 租約存放區。
- 在產生產生的 wrapper 之前寫入租約。
- 將 `leaseId` 儲存在新的 ACPX session 記錄上。
- 為舊記錄保留現有的 PID 和 command 欄位。

### 階段 2：租約優先清理

- 變更關閉清理以先載入 `leaseId`。
- 在發送訊號之前，根據租約驗證即時進程擁有權。
- 僅針對舊版記錄保留目前的根 PID 和 wrapper-root 後備方案。
- 在驗證清理後，將租約標記為 `closed`。
- 當進程在清理之前消失時，將租約標記為 `lost`。

### 階段 3：租約優先啟動時清理

- 啟動時清理會掃描開啟的租約。
- 針對每個租約，驗證根進程並收集子系。
- 優先清理已驗證樹狀結構的子項。
- 使用有界的保留視窗，讓舊的 `closed` 和 `lost` 租約過期。
- 僅將 command-marker 掃描保留為暫時的舊版後備方案，並在可能時
  使用 wrapper root 和 Gateway 實例進行防護。

### 階段 4：Session 擁有權資料列

- 將擁有權中繼資料新增至 Gateway session 資料列。
- 教導 ACPX、subagent、background-task 和 session-store 寫入器填入
  `ownerSessionKey` 或 `spawnedBy`。
- 將可見性檢查轉換為使用列中繼資料。
- 移除可見性時間的次要 `sessions.list({ spawnedBy })` 查詢。

### 階段 5：移除傳統啟發式方法

經過一個發佈視窗後：

- 停止依賴儲存的根指令字串來進行非傳統 ACPX 清理
- 移除指令標記啟動掃描
- 移除可見性後備清單查詢
- 對於遺失或無法驗證的租約，保持防禦性的「無法存取時封閉」行為

## 測試

新增兩個資料表驅動的測試套件。

程序生命週期模擬器：

- PID 被不相關的程序重複使用
- PID 被另一個 Gateway 的包裝器根重複使用
- 儲存的包裝器指令是 shell 引號的，即時 `ps` 指令則不是
- 配接器子程序退出，孫程序保留在程序群組中
- 父程序終止 SIGTERM 後備達到 SIGKILL
- 程序清單無法使用
- 程序遺失的過時租約
- 啟動時的孤立程序，包含包裝器、配接器子程序和孫程序

工作階段可見性矩陣：

- `self`, `tree`, `agent`, `all`
- 啟用和停用 a2a
- 相同代理程式列
- 跨代理程式列
- 請求者擁有的衍生跨代理程式 ACP 列
- 沙盒化請求者被限制在 `tree`
- list、history、send 和 status 動作

重要不變性：只要設定的可見性包含請求者工作階段樹，請求者擁有的衍生子程序就是可見的，且 `all` 的能力不低於 `tree`。

## 相容性備註

舊的工作階段記錄可能沒有 `leaseId`。它們應該使用傳統的「無法存取時封閉」清理路徑：

- 要求即時的根程序
- 當預期產生包裝器時，要求包裝器根擁有權
- 對於非包裝器根，要求指令一致性
- 絕不要僅根據過時的儲存 PID 中繼資料發送信號

如果無法驗證傳統記錄，請勿變動它。啟動租約清理和下一個發佈視窗最終應淘汰此後備機制。

## 成功標準

- 關閉舊或過時的 ACPX 工作階段無法終止另一個 Gateway 的程序。
- 父程序終止不會留下固執的配接器孫程序繼續執行。
- `cancel` 在不關閉可重複使用工作階段的情況下中止主動輪詢。
- `sessions_list` 可以在 `tree` 和 `all` 之下顯示請求者擁有的跨代理 ACP 子項。
- 啟動清理由租約驅動，而非廣泛的命令字串掃描。
- 專注的進程和可見性矩陣測試涵蓋了先前需要一次性審查修復的每個邊緣情況。
