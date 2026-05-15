---
summary: "OpenClaw适用于外部应用、脚本、仪表板、CI 作业和 IDE 扩展的公共 OpenClaw 应用 SDK"
title: "OpenClawOpenClaw 应用 SDK"
sidebarTitle: "应用 SDK"
read_when:
  - You are building an external app, script, dashboard, CI job, or IDE extension that talks to OpenClaw
  - You are choosing between the App SDK and the Plugin SDK
  - You are integrating with Gateway agent runs, sessions, events, approvals, models, or tools
---

**OpenClaw 应用 SDK** 是 OpenClaw 进程外部应用的公共客户端 API。当脚本、仪表板、CI 作业、IDE 扩展或其他外部应用想要连接到 Gateway(网关)、启动代理运行、流式传输事件、等待结果、取消工作或检查 Gateway(网关) 资源时，请使用 OpenClawAPIOpenClaw`@openclaw/sdk`Gateway(网关)Gateway(网关)。

<Note>应用 SDK 与 [插件 SDK](/zh/plugins/sdk-overview) 不同。 `@openclaw/sdk`Gateway(网关)OpenClaw 从 OpenClaw 外部与 Gateway(网关) 通信。 `openclaw/plugin-sdk/*`OpenClaw 仅适用于在 OpenClaw 内部运行并注册提供商、通道、工具、挂钩或可信运行时的插件。</Note>

## 今日发布内容

`@openclaw/sdk` 包含以下内容：

| 表面                      | 状态 | 功能                                                          |
| ------------------------- | ---- | ------------------------------------------------------------- |
| `OpenClaw`                | 就绪 | 主客户端入口点。拥有传输、连接、请求和事件。                  |
| `GatewayClientTransport`  | 就绪 | 由 Gateway(网关) 客户端支持的 WebSocket 传输。                |
| `oc.agents`               | 就绪 | 列出、创建、更新、删除并获取代理句柄。                        |
| `Agent.run()`             | 就绪 | 启动 Gateway(网关) Gateway(网关)`agent` 运行并返回 `Run`。    |
| `oc.runs`                 | 就绪 | 创建、获取、等待、取消和流式传输运行。                        |
| `Run.events()`            | 就绪 | 流式传输规范化的每次运行事件，并为快速运行提供重放功能。      |
| `Run.wait()`              | 就绪 | 调用 `agent.wait` 并返回稳定的 `RunResult`。                  |
| `Run.cancel()`            | 就绪 | 根据运行 ID 调用 `sessions.abort`，并在可用时使用会话密钥。   |
| `oc.sessions`             | 就绪 | 创建、解析、发送到、修补、压缩和获取会话句柄。                |
| `Session.send()`          | 就绪 | 调用 `sessions.send` 并返回 `Run`。                           |
| `oc.tasks`                | 就绪 | 列出、读取和取消 Gateway(网关) 任务账本条目。                 |
| `oc.models`               | 就绪 | 调用 `models.list` 和当前的 `models.authStatus`RPC 状态 RPC。 |
| `oc.tools`                | 就绪 | 通过策略管道列出、限定范围并调用 Gateway(网关) 工具。         |
| `oc.artifacts`            | 就绪 | 列出、获取和下载 Gateway(网关) 转录产物。                     |
| `oc.approvals`            | 就绪 | 通过 Gateway(网关) 批准 RPC 列出和解析执行批准。              |
| `oc.environments`         | 部分 | 列出 Gateway(网关) 本地和节点环境候选项；创建/删除尚未连接。  |
| `oc.rawEvents()`          | 就绪 | 为高级使用者暴露原始 Gateway(网关) 事件。                     |
| `normalizeGatewayEvent()` | 就绪 | 将原始 Gateway(网关) 事件转换为稳定的 SDK 事件形状。          |

SDK 还导出了这些接口使用的核心类型：
`AgentRunParams`、`RunResult`、`RunStatus`、`OpenClawEvent`、
`OpenClawEventType`、`GatewayEvent`、`OpenClawTransport`、
`GatewayRequestOptions`、`SessionCreateParams`、`SessionSendParams`、
`ArtifactSummary`、`ArtifactQuery`、`ArtifactsListResult`、
`ArtifactsGetResult`、`ArtifactsDownloadResult`、
`TaskSummary`、`TaskStatus`、`TasksListParams`、`TasksListResult`、
`TasksGetResult`、`TasksCancelResult`、`RuntimeSelection`、
`EnvironmentSelection`、`WorkspaceSelection`、`ApprovalMode` 以及相关的
结果类型。

## 连接到 Gateway(网关)

使用明确的 Gateway(网关) URL 创建客户端，或者为测试和嵌入式应用运行时注入自定义传输。

```typescript
import { OpenClaw } from "@openclaw/sdk";

const oc = new OpenClaw({
  url: "ws://127.0.0.1:18789",
  token: process.env.OPENCLAW_GATEWAY_TOKEN,
  requestTimeoutMs: 30_000,
});

await oc.connect();
```

`new OpenClaw({ gateway: "ws://..." })` 等同于 `url`。构造函数接受
`gateway: "auto"`Gateway(网关) 选项，但自动 Gateway(网关) 发现目前还不是独立的 SDK 功能；当应用程序尚不清楚如何发现
Gateway(网关) 时，请传递 `url`Gateway(网关)。

对于测试，请传入一个实现了 `OpenClawTransport` 的对象：

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

## 运行代理

当应用需要代理句柄时使用 `oc.agents.get(id)`，然后调用
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

提供商标识的模型引用（如 `openai/gpt-5.5`Gateway(网关)）会被拆分为 Gateway(网关)
`provider` 和 `model` 覆盖项。`timeoutMs`Gateway(网关) 在 SDK 中保持毫秒单位，
并会为 `agent`RPC RPC 转换为 Gateway(网关) 超时秒数。

`run.wait()`Gateway(网关) 使用 Gateway(网关) `agent.wait`RPC RPC。当运行仍处于活动状态时，过期的等待截止时间将返回 `status: "accepted"`，而不是假装运行本身超时了。运行时超时、中止的运行和已取消的运行被规范化为 `timed_out` 或 `cancelled`。

## 创建并重用会话

当应用程序需要持久化的转录状态时，请使用会话。

```typescript
const session = await oc.sessions.create({
  agentId: "main",
  label: "release-review",
});

const run = await session.send("Prepare release notes from the current diff.");
await run.wait();
```

`Session.send()` 调用 `sessions.send` 并返回 `Run`。会话句柄还支持：

```typescript
await session.abort(run.id);
await session.patch({ label: "renamed-session" });
await session.compact({ maxLines: 200 });
```

## 流式传输事件

SDK 将原始 Gateway(网关) 事件规范化为稳定的 Gateway(网关)`OpenClawEvent` 信封：

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

常见事件类型包括：

| 事件类型              | 源 Gateway(网关) 事件        |
| --------------------- | ---------------------------- |
| `run.started`         | `agent` 生命周期开始         |
| `run.completed`       | `agent` 生命周期结束         |
| `run.failed`          | `agent` 生命周期错误         |
| `run.cancelled`       | 已中止/已取消生命周期结束    |
| `run.timed_out`       | 超时生命周期结束             |
| `assistant.delta`     | 助手流式增量                 |
| `assistant.message`   | 助手消息                     |
| `thinking.delta`      | 思考或计划流                 |
| `tool.call.started`   | 工具/项目/命令开始           |
| `tool.call.delta`     | 工具/项目/命令更新           |
| `tool.call.completed` | 工具/项目/命令完成           |
| `tool.call.failed`    | 工具/项目/命令失败或受阻状态 |
| `approval.requested`  | Exec 或插件审批请求          |
| `approval.resolved`   | Exec 或插件审批解决          |
| `session.created`     | `sessions.changed` 创建      |
| `session.updated`     | `sessions.changed` 更新      |
| `session.compacted`   | `sessions.changed` 压实      |
| `task.updated`        | 任务更新事件                 |
| `artifact.updated`    | 补丁流事件                   |
| `raw`                 | 任何尚无稳定 SDK 映射的事件  |

`Run.events()` 将事件过滤到一个运行 ID 并重放已见过的事件以实现快速运行。这意味着文档记录的流程是安全的：

```typescript
const run = await agent.run("Summarize the latest session.");

for await (const event of run.events()) {
  if (event.type === "run.completed") {
    break;
  }
}
```

对于应用范围的流，请使用 `oc.events()`Gateway(网关)。对于原始 Gateway(网关) 帧，请使用 `oc.rawEvents()`。

## 模型、工具、产物和审批

模型助手映射到当前的 Gateway(网关) 方法：

```typescript
await oc.models.list();
await oc.models.status({ probe: false }); // calls models.authStatus
```

工具助手公开 Gateway(网关) 目录、有效的工具视图以及直接调用 Gateway(网关) 工具。Gateway(网关)Gateway(网关)`oc.tools.invoke()` 返回一个类型化的信封，而不是因策略或审批拒绝而抛出异常。

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

产物助手公开 Gateway(网关) 的产物投影，用于会话、运行或任务上下文。每次调用都需要一个明确的 Gateway(网关)`sessionKey`、`runId` 或 `taskId` 范围：

```typescript
const { artifacts } = await oc.artifacts.list({ sessionKey: "main" });
const first = artifacts[0];

if (first) {
  const { artifact } = await oc.artifacts.get(first.id, { sessionKey: "main" });
  const download = await oc.artifacts.download(artifact.id, { sessionKey: "main" });
  console.log(download.encoding, download.url);
}
```

审批助手使用执行审批 RPC：

```typescript
const approvals = await oc.approvals.list();
await oc.approvals.respond("approval-id", { decision: "approve" });
```

任务助手使用持久化任务账本，该账本也支持 `openclaw tasks`：

```typescript
const tasks = await oc.tasks.list({ status: "running", sessionKey: "agent:main:main" });
const task = await oc.tasks.get(tasks.tasks[0].id);
await oc.tasks.cancel(task.task.id, { reason: "user stopped task" });
```

环境助手公开只读的 Gateway(网关) 本地和节点发现：

```typescript
const { environments } = await oc.environments.list();
await oc.environments.status(environments[0].id);
```

## 目前明确不支持

SDK 包含了我们想要的产品模型的名称，但它不会默默地假装 Gateway(网关) RPC 存在。这些调用目前会抛出明确的不支持错误：

```typescript
await oc.environments.create({});
await oc.environments.delete("environment-id");
```

每次运行的 `workspace`、`runtime`、`environment` 和 `approvals`Gateway(网关) 字段被输入为未来形状，但当前的 Gateway(网关) 不支持 `agent`RPC RPC 上的这些覆盖。如果调用者传递了它们，SDK 将在提交运行之前抛出异常，以免工作意外使用默认的工作区、运行时、环境或审批行为执行。

## App SDK 与 Plugin SDK

当代码位于 OpenClaw 外部时，请使用 App SDK：

- 启动或观察代理运行的 Node 脚本
- 调用 Gateway(网关) 的 CI 作业
- 仪表板和管理面板
- IDE 扩展
- 不需要成为渠道插件的外部网桥
- 使用模拟或真实的 Gateway(网关) 传输进行集成测试

当代码在 OpenClaw 内部运行时，请使用 Plugin SDK：

- 提供商插件
- 渠道插件
- 工具或生命周期钩子
- 代理 harness 插件
- 可信的运行时助手

App SDK 代码应从 `@openclaw/sdk` 导入。Plugin 代码应从有文档记录的 `openclaw/plugin-sdk/*` 子路径导入。不要混用这两种约定。

## 相关

- [OpenClaw App SDK API 设计](/zh/reference/openclaw-sdk-api-design)
- [Gateway(网关) RPC 参考](/zh/reference/rpc)
- [Agent loop](/zh/concepts/agent-loop)
- [Agent runtimes](/zh/concepts/agent-runtimes)
- [Sessions](/zh/concepts/session)
- [Background tasks](/zh/automation/tasks)
- [ACP agents](/zh/tools/acp-agents)
- [Plugin SDK 概述](/zh/plugins/sdk-overview)
