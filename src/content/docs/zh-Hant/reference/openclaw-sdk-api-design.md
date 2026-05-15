---
summary: "公開 OpenClaw App SDK API、事件分類、產出物、審核和套件結構的參考設計"
title: "OpenClaw App SDK API 設計"
sidebarTitle: "App SDK API 設計"
read_when:
  - You are implementing the proposed public OpenClaw app SDK
  - You need the draft namespace, event, result, artifact, approval, or security contract for the app SDK
  - You are comparing Gateway protocol resources with the high-level OpenClaw App SDK wrapper
---

此頁面是公開 [OpenClaw App SDK](/zh-Hant/concepts/openclaw-sdk) 的詳細 API 參考設計。它刻意與 [Plugin SDK](/zh-Hant/plugins/sdk-overview) 分離。

<Note>`@openclaw/sdk` 是與 Gateway 通訊的外部應用程式/用戶端套件。`openclaw/plugin-sdk/*` 是進程內插件編寫合約。 請勿從僅需執行代理程式的應用程式中匯入 Plugin SDK 子路徑。</Note>

公開應用程式 SDK 應分為兩層建構：

1. 低層級的產生 Gateway 用戶端。
2. 高層級的人體工學包裝器，包含 `OpenClaw`、`Agent`、`Session`、`Run`、
   `Task`、`Artifact`、`Approval` 和 `Environment` 物件。

## 命名空間設計

低層級命名空間應緊密遵循 Gateway 資源：

```typescript
oc.agents.list();
oc.agents.get("main");
oc.agents.create(...);
oc.agents.update(...);

oc.sessions.list();
oc.sessions.create(...);
oc.sessions.resolve(...);
oc.sessions.send(...);
oc.sessions.messages(...);
oc.sessions.fork(...);
oc.sessions.compact(...);
oc.sessions.abort(...);

oc.runs.create(...);
oc.runs.get(runId);
oc.runs.events(runId, { after });
oc.runs.wait(runId);
oc.runs.cancel(runId);

oc.tasks.list({ status: "running" });
oc.tasks.get(taskId);
oc.tasks.cancel(taskId, { reason });
oc.tasks.events(taskId, { after }); // future API

oc.models.list();
oc.models.status(); // Gateway models.authStatus

oc.tools.list();
oc.tools.invoke("tool-name", { sessionKey, idempotencyKey });

oc.artifacts.list({ runId });
oc.artifacts.get(artifactId, { runId });
oc.artifacts.download(artifactId, { runId });

oc.approvals.list();
oc.approvals.respond(approvalId, ...);

oc.environments.list();
oc.environments.create(...); // future API: current SDK throws unsupported
oc.environments.status(environmentId);
oc.environments.delete(environmentId); // future API: current SDK throws unsupported
```

高層級包裝器應回傳讓常見流程更順暢的物件：

```typescript
const run = await agent.run(inputOrParams);
await run.cancel();
await run.wait();

for await (const event of run.events()) {
  // normalized event stream
}

const artifacts = await run.artifacts.list();
const session = await run.session();
```

## 事件合約

公開 SDK 應公開具版本控制、可重播、正規化的事件。

```typescript
type OpenClawEvent = {
  version: 1;
  id: string;
  ts: number;
  type: OpenClawEventType;
  runId?: string;
  sessionId?: string;
  sessionKey?: string;
  taskId?: string;
  agentId?: string;
  data: unknown;
  raw?: unknown;
};
```

`id` 是一個重播游標。消費者應能使用 `events({ after: id })` 重新連線，並在保留期限允許時接收錯過的事件。

建議的正規化事件系列：

| 事件                  | 含義                                     |
| --------------------- | ---------------------------------------- |
| `run.created`         | 執行已接受。                             |
| `run.queued`          | 執行正在等待通道、執行時間或環境。       |
| `run.started`         | 執行時間已開始執行。                     |
| `run.completed`       | 執行已成功完成。                         |
| `run.failed`          | 執行以錯誤結束。                         |
| `run.cancelled`       | 執行已取消。                             |
| `run.timed_out`       | 執行已超過其逾時時間。                   |
| `assistant.delta`     | 助理文字增量。                           |
| `assistant.message`   | 完整的助手訊息或替代內容。               |
| `thinking.delta`      | 推理或計畫增量，當政策允許暴露時。       |
| `tool.call.started`   | 工具呼叫開始。                           |
| `tool.call.delta`     | 工具呼叫串流進度或部分輸出。             |
| `tool.call.completed` | 工具呼叫成功返回。                       |
| `tool.call.failed`    | 工具呼叫失敗。                           |
| `approval.requested`  | 執行或工具需要審批。                     |
| `approval.resolved`   | 審批已授予、拒絕、過期或取消。           |
| `question.requested`  | 執行環境請求使用者或主機應用程式輸入。   |
| `question.answered`   | 主機應用程式提供了答案。                 |
| `artifact.created`    | 新的構件可用。                           |
| `artifact.updated`    | 現有構件已變更。                         |
| `session.created`     | 工作階段已建立。                         |
| `session.updated`     | 工作階段元資料已變更。                   |
| `session.compacted`   | 工作階段壓縮已發生。                     |
| `task.updated`        | 背景工作狀態已變更。                     |
| `git.branch`          | 執行環境觀察到或變更了分支狀態。         |
| `git.diff`            | 執行環境產生或變更了差異。               |
| `git.pr`              | 執行環境開啟、更新或連結了一個拉取請求。 |

執行環境原生 Payload 應透過 `raw` 取得，但應用程式不應
為了一般 UI 而解析 `raw`。

## 結果合約

`Run.wait()` 應回傳穩定的結果封包：

```typescript
type RunResult = {
  runId: string;
  status: "accepted" | "completed" | "failed" | "cancelled" | "timed_out";
  sessionId?: string;
  sessionKey?: string;
  taskId?: string;
  startedAt?: string | number;
  endedAt?: string | number;
  output?: {
    text?: string;
    messages?: SDKMessage[];
  };
  usage?: {
    inputTokens?: number;
    outputTokens?: number;
    totalTokens?: number;
    costUsd?: number;
  };
  artifacts?: ArtifactSummary[];
  error?: SDKError;
};
```

結果應為平淡且穩定的。時間戳記值保留 Gateway 的形狀，因此目前由生命週期支援的執行通常會回傳 Epoch 毫秒數字，而介接器仍可能顯示 ISO 字串。豐富的 UI、工具追蹤和執行環境原生細節屬於事件和構件。

`accepted` 是非終止的等待結果：它表示在執行產生生命週期結束/錯誤之前，Gateway 等待截止時間已過期。它不得被視為 `timed_out`；`timed_out` 是保留給超過其自身執行環境逾時的執行。

## 審批與問題

審批必須是一等公民，因為程式撰寫代理程式經常跨越安全邊界。

```typescript
run.onApproval(async (request) => {
  if (request.kind === "tool" && request.toolName === "exec") {
    return request.approveOnce({ reason: "CI command allowed by policy" });
  }

  return request.askUser();
});
```

審批事件應包含：

- 審批 ID
- 執行 ID 和工作階段 ID
- 請求種類
- 請求的操作摘要
- 工具名稱或環境操作
- 風險等級
- 可用的決策
- 過期時間
- 決策是否可以重複使用

問題與審批是分開的。問題是向使用者或主機應用程式詢問資訊。審批則是請求執行操作的許可。

## ToolSpace 模型

應用程式需要在不匯入外掛內部細節的情況下了解工具介面。

```typescript
const tools = await run.toolSpace();

for (const tool of tools.list()) {
  console.log(tool.name, tool.source, tool.requiresApproval);
}
```

SDK 應公開：

- 正規化的工具中繼資料
- 來源：OpenClaw、MCP、外掛、頻道、執行時或應用程式
- 綱要摘要
- 審批原則
- 執行時相容性
- 工具是否為隱藏、唯讀、可寫入或主機可用

透過 SDK 進行的工具呼叫應該是明確且受限的。大多數應用程式應執行代理程式，而不是直接呼叫任意工具。

## 產物模型

產物應涵蓋的內容不僅限於檔案。

```typescript
type ArtifactSummary = {
  id: string;
  runId?: string;
  sessionId?: string;
  type: "file" | "patch" | "diff" | "log" | "media" | "screenshot" | "trajectory" | "pull_request" | "workspace";
  title?: string;
  mimeType?: string;
  sizeBytes?: number;
  createdAt: string;
  expiresAt?: string;
};
```

常見範例：

- 檔案編輯和生成的檔案
- 修補程式套件
- VCS 差異
- 螢幕擷圖和媒體輸出
- 日誌和追蹤套件
- Pull request 連結
- 執行時軌跡
- 受控環境工作區快照

產物存取應支援編修、保留和下載 URL，而不要假設每個產物都是普通的本機檔案。

## 安全模型

應用程式 SDK 必須明確權限。

建議的 token 範圍：

| 範圍                | 允許                                     |
| ------------------- | ---------------------------------------- |
| `agent.read`        | 列出並檢查代理程式。                     |
| `agent.run`         | 啟動執行。                               |
| `session.read`      | 讀取工作階段中繼資料和訊息。             |
| `session.write`     | 建立、傳送至、分叉、壓縮和中止工作階段。 |
| `task.read`         | 讀取背景任務狀態。                       |
| `task.write`        | 取消或修改任務通知原則。                 |
| `approval.respond`  | 批准或拒絕請求。                         |
| `tools.invoke`      | 直接呼叫公開的工具。                     |
| `artifacts.read`    | 列出並下載產物。                         |
| `environment.write` | 建立或終結受控環境。                     |
| `admin`             | 管理操作。                               |

預設值：

- 預設不轉發機密
- 無限制的環境變數傳遞
- 使用機密參照而非機密值
- 明確的沙箱和網路原則
- 明確的遠端環境保留
- 除非策略另有證明，否則主機執行需要批准
- 原始執行時期事件在離開 Gateway 之前會被編輯，除非呼叫者具有更強大的診斷範圍

## 受管環境提供者

受管代理應作為環境提供者實作。

```typescript
type EnvironmentProvider = {
  id: string;
  capabilities: {
    checkout?: boolean;
    sandbox?: boolean;
    networkPolicy?: boolean;
    secrets?: boolean;
    artifacts?: boolean;
    logs?: boolean;
    pullRequests?: boolean;
    longRunning?: boolean;
  };
};
```

首次實作不需要是託管的 SaaS。它可以針對現有的節點主機、暫時性工作區、CI 風格的執行器，或 Testbox 風格的環境。重要的合約是：

1. 準備工作區
2. 綁定安全環境和秘密
3. 開始執行
4. 串流事件
5. 收集構件
6. 根據策略清理或保留

一旦這穩定後，託管的雲端服務就可以實作相同的提供者合約。

## 套件結構

建議的套件：

| 套件                    | 用途                                                  |
| ----------------------- | ----------------------------------------------------- |
| `@openclaw/sdk`         | 公開的高階 SDK 和產生的低階 Gateway 用戶端。          |
| `@openclaw/sdk-react`   | 用於儀表板和應用程式建構者的選用 React hooks。        |
| `@openclaw/sdk-testing` | 用於應用程式整合的測試輔助工具和模擬 Gateway 伺服器。 |

儲存庫已經有用於外掛程式的 `openclaw/plugin-sdk/*`。請將該命名空間分開，以避免混淆外掛程式作者與應用程式開發人員。

## 產生的用戶端策略

低階用戶端應該從版本化的 Gateway 協定架構產生，然後由手寫的人體工學類別包裝。

分層：

1. Gateway 架構為真實來源。
2. 產生的低階 TypeScript 用戶端。
3. 用於外部輸入和事件負載的執行時期驗證器。
4. 高階 `OpenClaw`、`Agent`、`Session`、`Run`、`Task` 和 `Artifact`
   包裝器。
5. 食譜範例和整合測試。

優點：

- 協定漂移可見
- 測試可以比較產生的方法與 Gateway 導出
- App SDK 保持獨立於 Plugin SDK 內部
- 低階消費者仍然擁有完整的協定存取權
- 高階消費者獲得小型產品 API

## 相關

- [OpenClaw App SDK](/zh-Hant/concepts/openclaw-sdk)
- [Gateway RPC 參考](/zh-Hant/reference/rpc)
- [代理迴圈](/zh-Hant/concepts/agent-loop)
- [代理執行時期](/zh-Hant/concepts/agent-runtimes)
- [背景任務](/zh-Hant/automation/tasks)
- [ACP 代理程式](/zh-Hant/tools/acp-agents)
- [外掛程式 SDK 概覽](/zh-Hant/plugins/sdk-overview)
