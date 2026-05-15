---
summary: "用於外部應用程式、腳本、儀表板、CI 工作和 IDE 擴充功能的公開 OpenClaw App SDK"
title: "OpenClaw App SDK"
sidebarTitle: "App SDK"
read_when:
  - You are building an external app, script, dashboard, CI job, or IDE extension that talks to OpenClaw
  - You are choosing between the App SDK and the Plugin SDK
  - You are integrating with Gateway agent runs, sessions, events, approvals, models, or tools
---

**OpenClaw App SDK** 是 OpenClaw 程序之外應用程式的公開用戶端 API。當腳本、儀表板、CI 工作、IDE 擴充功能或其他外部應用程式想要連接到 Gateway、啟動 Agent 執行、串流事件、等待結果、取消工作或檢查 Gateway 資源時，請使用 `@openclaw/sdk`。

<Note>App SDK 與 [Plugin SDK](/zh-Hant/plugins/sdk-overview) 不同。 `@openclaw/sdk` 從 OpenClaw 外部與 Gateway 通訊。 `openclaw/plugin-sdk/*` 僅適用於在 OpenClaw 內部運行並註冊提供者、通道、工具、鉤子或受信任執行時的插件。</Note>

## 目前發布的功能

`@openclaw/sdk` 包含以下內容：

| 介面                      | 狀態 | 功能說明                                                    |
| ------------------------- | ---- | ----------------------------------------------------------- |
| `OpenClaw`                | 就緒 | 主要的用戶端進入點。擁有傳輸、連線、請求和事件。            |
| `GatewayClientTransport`  | 就緒 | 由 Gateway 用戶端支援的 WebSocket 傳輸。                    |
| `oc.agents`               | 就緒 | 列出、建立、更新、刪除並取得 Agent 控制代碼。               |
| `Agent.run()`             | 就緒 | 啟動 Gateway `agent` 執行並返回 `Run`。                     |
| `oc.runs`                 | 就緒 | 建立、取得、等待、取消和串流執行。                          |
| `Run.events()`            | 就緒 | 串流標準化的每次執行事件，並針對快速執行提供重播功能。      |
| `Run.wait()`              | 就緒 | 呼叫 `agent.wait` 並返回穩定的 `RunResult`。                |
| `Run.cancel()`            | 就緒 | 透過執行 ID 呼叫 `sessions.abort`，並在可用時提供會話金鑰。 |
| `oc.sessions`             | 就緒 | 建立、解析、發送至、修補、壓縮並取得會話控制代碼。          |
| `Session.send()`          | 就緒 | 呼叫 `sessions.send` 並返回 `Run`。                         |
| `oc.tasks`                | 就緒 | 列出、讀取及取消 Gateway 任務帳本項目。                     |
| `oc.models`               | 就緒 | 呼叫 `models.list` 與目前的 `models.authStatus` 狀態 RPC。  |
| `oc.tools`                | 就緒 | 透過原則管道列出、範圍界定並叫用 Gateway 工具。             |
| `oc.artifacts`            | 就緒 | 列出、取得及下載 Gateway 逐字稿產出成果。                   |
| `oc.approvals`            | 就緒 | 透過 Gateway 核准 RPC 列出及解析執行核准。                  |
| `oc.environments`         | 部分 | 列出 Gateway 本地與節點環境候選項；尚未連線建立/刪除功能。  |
| `oc.rawEvents()`          | 就緒 | 公開原始 Gateway 事件供進階消費者使用。                     |
| `normalizeGatewayEvent()` | 就緒 | 將原始 Gateway 事件轉換為穩定的 SDK 事件形式。              |

SDK 也會匯出這些介面使用的核心型別：
`AgentRunParams`、`RunResult`、`RunStatus`、`OpenClawEvent`、
`OpenClawEventType`、`GatewayEvent`、`OpenClawTransport`、
`GatewayRequestOptions`、`SessionCreateParams`、`SessionSendParams`、
`ArtifactSummary`、`ArtifactQuery`、`ArtifactsListResult`、
`ArtifactsGetResult`、`ArtifactsDownloadResult`、
`TaskSummary`、`TaskStatus`、`TasksListParams`、`TasksListResult`、
`TasksGetResult`、`TasksCancelResult`、`RuntimeSelection`、
`EnvironmentSelection`、`WorkspaceSelection`、`ApprovalMode`，以及相關的
結果型別。

## 連線至 Gateway

使用明確的 Gateway URL 建立用戶端，或為測試與嵌入式應用程式執行階段注入自訂傳輸。

```typescript
import { OpenClaw } from "@openclaw/sdk";

const oc = new OpenClaw({
  url: "ws://127.0.0.1:18789",
  token: process.env.OPENCLAW_GATEWAY_TOKEN,
  requestTimeoutMs: 30_000,
});

await oc.connect();
```

`new OpenClaw({ gateway: "ws://..." })` 等同於 `url`。建構函式接受
`gateway: "auto"` 選項，但自動 Gateway 探索目前尚未成為獨立的 SDK 功能；
當應用程式尚不知如何探索 Gateway 時，請傳遞 `url`。

對於測試，請傳入一個實作了 `OpenClawTransport` 的物件：

```typescript
const oc = new OpenClaw({
  transport: {
    async request(method, params) {
      return { method, params };
    },
    async *events() {},
  },
});
```

## 執行 Agent

當應用程式需要 Agent 控制代碼時，請使用 `oc.agents.get(id)`，然後呼叫
`agent.run()`。

```typescript
const agent = await oc.agents.get("main");

const run = await agent.run({
  input: "Review this pull request and suggest the smallest safe fix.",
  model: "openai/gpt-5.5",
  sessionKey: "main",
  timeoutMs: 30_000,
});

for await (const event of run.events()) {
  const data = event.data as { delta?: unknown };
  if (event.type === "assistant.delta" && typeof data.delta === "string") {
    process.stdout.write(data.delta);
  }
}

const result = await run.wait({ timeoutMs: 120_000 });
console.log(result.status);
```

提供者限定的模型參考（例如 `openai/gpt-5.5`）會被拆分為 Gateway
`provider` 和 `model` 覆寫。`timeoutMs` 在 SDK 中保持毫秒單位，
並會轉換為 `agent` RPC 的 Gateway 逾時秒數。

`run.wait()` 使用 Gateway `agent.wait` RPC。如果執行仍處於活躍狀態時等待期限屆滿，
會傳回 `status: "accepted"`，而不是假裝執行本身逾時。執行時逾時、已中止的執行和已取消的執行
會被正規化為 `timed_out` 或 `cancelled`。

## 建立並重複使用 Sessions

當應用程式需要持久的文字記錄狀態時，請使用 Sessions。

```typescript
const session = await oc.sessions.create({
  agentId: "main",
  label: "release-review",
});

const run = await session.send("Prepare release notes from the current diff.");
await run.wait();
```

`Session.send()` 會呼叫 `sessions.send` 並傳回 `Run`。Session 控制代碼也
支援：

```typescript
await session.abort(run.id);
await session.patch({ label: "renamed-session" });
await session.compact({ maxLines: 200 });
```

## 串流事件

SDK 會將原始 Gateway 事件正規化為穩定的 `OpenClawEvent` 封裝：

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
  raw?: GatewayEvent;
};
```

常見的事件類型包括：

| 事件類型              | 來源 Gateway 事件              |
| --------------------- | ------------------------------ |
| `run.started`         | `agent` 生命週期開始           |
| `run.completed`       | `agent` 生命週期結束           |
| `run.failed`          | `agent` 生命週期錯誤           |
| `run.cancelled`       | 已中止/已取消的生命週期結束    |
| `run.timed_out`       | 逾時的生命週期結束             |
| `assistant.delta`     | Assistant 串流增量             |
| `assistant.message`   | Assistant 訊息                 |
| `thinking.delta`      | 思考或計畫串流                 |
| `tool.call.started`   | 工具/項目/指令開始             |
| `tool.call.delta`     | 工具/項目/指令更新             |
| `tool.call.completed` | 工具/項目/指令完成             |
| `tool.call.failed`    | 工具/項目/指令失敗或已封鎖狀態 |
| `approval.requested`  | Exec 或 Plugin 核准請求        |
| `approval.resolved`   | Exec 或外掛程式審核決議        |
| `session.created`     | `sessions.changed` 建立        |
| `session.updated`     | `sessions.changed` 更新        |
| `session.compacted`   | `sessions.changed` 壓縮        |
| `task.updated`        | 任務更新事件                   |
| `artifact.updated`    | 修補串流事件                   |
| `raw`                 | 任何尚未有穩定 SDK 對應的事件  |

`Run.events()` 會將事件篩選至單一執行 ID，並為快速執行重播已見過的事件。這意味著記載的流程是安全的：

```typescript
const run = await agent.run("Summarize the latest session.");

for await (const event of run.events()) {
  if (event.type === "run.completed") {
    break;
  }
}
```

對於應用程式全域串流，請使用 `oc.events()`。對於原始 Gateway 框架，請使用 `oc.rawEvents()`。

## 模型、工具、成品與審核

模型輔助函式對應到目前的 Gateway 方法：

```typescript
await oc.models.list();
await oc.models.status({ probe: false }); // calls models.authStatus
```

工具輔助函式會公開 Gateway 目錄、有效的工具檢視，以及直接呼叫 Gateway 工具。`oc.tools.invoke()` 會傳回具型別的封包，而非針對原則或審核拒絕擲回例外。

```typescript
await oc.tools.list();
await oc.tools.effective({ sessionKey: "main" });
await oc.tools.invoke("tool-name", {
  args: { input: "value" },
  sessionKey: "main",
  confirm: false,
  idempotencyKey: "tool-call-1",
});
```

成品輔助函式會公開針對工作階段、執行或任務內容的 Gateway 成品投影。每次呼叫都需要一個明確的 `sessionKey`、`runId` 或 `taskId` 範圍：

```typescript
const { artifacts } = await oc.artifacts.list({ sessionKey: "main" });
const first = artifacts[0];

if (first) {
  const { artifact } = await oc.artifacts.get(first.id, { sessionKey: "main" });
  const download = await oc.artifacts.download(artifact.id, { sessionKey: "main" });
  console.log(download.encoding, download.url);
}
```

審核輔助函式使用 exec 審核 RPC：

```typescript
const approvals = await oc.approvals.list();
await oc.approvals.respond("approval-id", { decision: "approve" });
```

任務輔助函式使用同樣支援 `openclaw tasks` 的持久任務分類帳：

```typescript
const tasks = await oc.tasks.list({ status: "running", sessionKey: "agent:main:main" });
const task = await oc.tasks.get(tasks.tasks[0].id);
await oc.tasks.cancel(task.task.id, { reason: "user stopped task" });
```

環境輔助函式會公開唯讀的 Gateway 本端與節點探索功能：

```typescript
const { environments } = await oc.environments.list();
await oc.environments.status(environments[0].id);
```

## 目前明確不支援

SDK 包含了我們想要的產品模型名稱，但不會靜默假設 Gateway RPC 存在。這些呼叫目前會擲回明確的不支援錯誤：

```typescript
await oc.environments.create({});
await oc.environments.delete("environment-id");
```

每次執行的 `workspace`、`runtime`、`environment` 和 `approvals` 欄位被型別化為未來的形狀，但目前的 Gateway 不支援在 `agent` RPC 上進行這些覆寫。如果呼叫端傳遞這些參數，SDK 會在提交執行前擲回例外，以免工作意外使用預設的工作區、執行環境、環境或審核行為執行。

## App SDK 與 Plugin SDK

當程式碼位於 OpenClaw 外部時，請使用 App SDK：

- 啟動或觀察代理執行的 Node 腳本
- 呼叫 Gateway 的 CI 工作
- 儀表板和管理面板
- IDE 擴充功能
- 不需要成為通道外掛程式的外部橋接器
- 使用模擬或真實 Gateway 傳輸的整合測試

當程式碼在 OpenClaw 內部執行時，請使用 Plugin SDK：

- 提供者外掛程式
- 通道外掛程式
- 工具或生命週期掛鉤
- 代理程式線束外掛程式
- 受信任的執行時期輔助程式

App SDK 程式碼應從 `@openclaw/sdk` 匯入。Plugin 程式碼應從文件記載的 `openclaw/plugin-sdk/*` 子路徑匯入。請勿混用這兩個合約。

## 相關

- [OpenClaw App SDK API 設計](/zh-Hant/reference/openclaw-sdk-api-design)
- [Gateway RPC 參考](/zh-Hant/reference/rpc)
- [代理程式迴圈](/zh-Hant/concepts/agent-loop)
- [代理程式執行時期](/zh-Hant/concepts/agent-runtimes)
- [工作階段](/zh-Hant/concepts/session)
- [背景工作](/zh-Hant/automation/tasks)
- [ACP 代理程式](/zh-Hant/tools/acp-agents)
- [Plugin SDK 概觀](/zh-Hant/plugins/sdk-overview)
