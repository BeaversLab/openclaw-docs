---
summary: "公共 OpenClaw App SDK API、事件分类、构件、审批和包结构的参考设计"
title: "OpenClaw App SDK API 设计"
sidebarTitle: "App SDK API 设计"
read_when:
  - You are implementing the proposed public OpenClaw app SDK
  - You need the draft namespace, event, result, artifact, approval, or security contract for the app SDK
  - You are comparing Gateway protocol resources with the high-level OpenClaw App SDK wrapper
---

此页面是公共 [API App SDK](/zh/concepts/openclaw-sdk) 的详细 OpenClaw 参考设计。它有意与 [Plugin SDK](/zh/plugins/sdk-overview) 分开。

<Note>`@openclaw/sdk` 是用于与 Gateway(网关) 通信的外部应用/客户端包。`openclaw/plugin-sdk/*` 是进程内插件编写合约。 不要从只需要运行代理的应用中导入 Plugin SDK 子路径。</Note>

公共应用 SDK 应分为两层构建：

1. 一个低级别的生成 Gateway(网关) 客户端。
2. 一个高级别的人性化封装，包含 `OpenClaw`、`Agent`、`Session`、`Run`、
   `Task`、`Artifact`、`Approval` 和 `Environment` 对象。

## 命名空间设计

低级命名空间应紧密遵循 Gateway(网关) 资源：

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

高级封装应返回能使常见流程变得愉快的对象：

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

## 事件合约

公共 SDK 应暴露版本化的、可重放的、标准化的事件。

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

`id` 是一个重放游标。消费者应能够使用
`events({ after: id })` 重新连接，并在保留策略允许时接收错过的消息。

推荐的标准化事件系列：

| 事件                  | 含义                                 |
| --------------------- | ------------------------------------ |
| `run.created`         | 运行已接受。                         |
| `run.queued`          | 运行正在等待会话通道、运行时或环境。 |
| `run.started`         | 运行时已开始执行。                   |
| `run.completed`       | 运行已成功完成。                     |
| `run.failed`          | 运行出错结束。                       |
| `run.cancelled`       | 运行已取消。                         |
| `run.timed_out`       | 运行超时。                           |
| `assistant.delta`     | 助手文本增量。                       |
| `assistant.message`   | 完整的助手消息或替换内容。           |
| `thinking.delta`      | 当策略允许展示时的推理或计划增量。   |
| `tool.call.started`   | 工具调用开始。                       |
| `tool.call.delta`     | 工具调用流式进度或部分输出。         |
| `tool.call.completed` | 工具调用成功返回。                   |
| `tool.call.failed`    | 工具调用失败。                       |
| `approval.requested`  | 运行或工具需要批准。                 |
| `approval.resolved`   | 批准已被授予、拒绝、过期或取消。     |
| `question.requested`  | 运行时请求用户或主机应用输入。       |
| `question.answered`   | 主机应用提供了回答。                 |
| `artifact.created`    | 有新的工件可用。                     |
| `artifact.updated`    | 现有工件已更改。                     |
| `session.created`     | 会话已创建。                         |
| `session.updated`     | 会话元数据已更改。                   |
| `session.compacted`   | 发生了会话压缩。                     |
| `task.updated`        | 后台任务状态已更改。                 |
| `git.branch`          | 运行时观察或更改了分支状态。         |
| `git.diff`            | 运行时生成或更改了差异。             |
| `git.pr`              | 运行时打开、更新或链接了拉取请求。   |

运行时原生负载应该可以通过 `raw` 获取，但应用程序不应
必须解析 `raw` 用于普通 UI。

## 结果契约

`Run.wait()` 应返回一个稳定的结果信封：

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

结果应该是平淡且稳定的。时间戳值保留了 Gateway(网关)
的格式，因此当前由生命周期支持的运行通常报告纪元毫秒
数，而适配器可能仍显示 ISO 字符串。富 UI、工具追踪和
运行时原生细节属于事件和工件。

`accepted`Gateway(网关) 是一个非终端等待结果：这意味着在运行产生生命周期结束/错误之前，Gateway(网关) 等待截止时间已过期。绝不能将其视为 `timed_out`；`timed_out` 是保留给超过自身运行超时的运行的。

## 审批和提问

审批必须是一等公民，因为编码代理经常跨越安全边界。

```typescript
run.onApproval(async (request) => {
  if (request.kind === "tool" && request.toolName === "exec") {
    return request.approveOnce({ reason: "CI command allowed by policy" });
  }

  return request.askUser();
});
```

审批事件应包含：

- 审批 ID
- 运行 ID 和会话 ID
- 请求类型
- 请求的操作摘要
- 工具名称或环境操作
- 风险级别
- 可用决策
- 过期时间
- 决策是否可重用

问题与审批是分开的。问题是向用户或主机应用询问信息。审批则是请求执行操作的权限。

## ToolSpace 模型

应用需要了解工具表面，而无需导入插件内部。

```typescript
const tools = await run.toolSpace();

for (const tool of tools.list()) {
  console.log(tool.name, tool.source, tool.requiresApproval);
}
```

SDK 应公开：

- 规范化工具元数据
- 来源：OpenClaw、MCP、插件、渠道、运行时或应用
- 架构摘要
- 审批策略
- 运行时兼容性
- 工具是隐藏、只读、可写还是可由主机执行

通过 SDK 调用工具应该是明确且有范围的。大多数应用应运行代理，而不是直接调用任意工具。

## 产物模型

产物应涵盖文件以外的更多内容。

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

常见示例：

- 文件编辑和生成的文件
- 补丁包
- VCS 差异
- 屏幕截图和媒体输出
- 日志和跟踪包
- 拉取请求链接
- 运行时轨迹
- 受管环境工作区快照

产物访问应支持编辑、保留和下载 URL，而无需假设每个产物都是普通的本地文件。

## 安全模型

应用 SDK 必须明确权限。

推荐的令牌范围：

| 范围                | 允许                                 |
| ------------------- | ------------------------------------ |
| `agent.read`        | 列出并检查代理。                     |
| `agent.run`         | 启动运行。                           |
| `session.read`      | 读取会话元数据和消息。               |
| `session.write`     | 创建、发送到、分叉、压缩和中止会话。 |
| `task.read`         | 读取后台任务状态。                   |
| `task.write`        | 取消或修改任务通知策略。             |
| `approval.respond`  | 批准或拒绝请求。                     |
| `tools.invoke`      | 直接调用暴露的工具。                 |
| `artifacts.read`    | 列出并下载产物。                     |
| `environment.write` | 创建或销毁托管环境。                 |
| `admin`             | 管理操作。                           |

默认值：

- 默认不转发机密信息
- 无限制的环境变量传递
- 使用机密引用而非机密值
- 显式的沙盒和网络策略
- 显式的远程环境保留策略
- 除非策略另有证明，否则主机执行需要批准
- 原始运行时事件在离开 Gateway(网关) 之前会被编辑，除非调用方具有
  更强的诊断范围

## 托管环境提供商

托管代理应作为环境提供商来实现。

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

第一个实现不需要是托管的 SaaS。它可以针对
现有的节点主机、临时工作区、CI 风格的运行器或 Testbox 风格的
环境。重要的合约是：

1. 准备工作区
2. 绑定安全的环境和机密
3. 开始运行
4. 流式传输事件
5. 收集产物
6. 根据策略清理或保留

一旦此功能稳定，托管的云服务可以实现相同的提供商
合约。

## 包结构

推荐的包：

| 包                      | 用途                                                |
| ----------------------- | --------------------------------------------------- |
| `@openclaw/sdk`         | 公共高级 SDK 和生成的低级 Gateway(网关) 客户端。    |
| `@openclaw/sdk-react`   | 用于仪表板和应用构建器的可选 React Hooks。          |
| `@openclaw/sdk-testing` | 用于应用集成的测试助手和模拟 Gateway(网关) 服务器。 |

该仓库已经有用于插件的 `openclaw/plugin-sdk/*`。保持该命名空间
独立，以免混淆插件作者和应用开发者。

## 生成的客户端策略

低级客户端应从版本化的 Gateway(网关) 协议
模式生成，然后由手写的符合人体工程学的类封装。

分层：

1. Gateway(网关) 模式作为事实来源。
2. 生成的低级 TypeScript 客户端。
3. 用于外部输入和事件负载的运行时验证器。
4. 高级 `OpenClaw`、`Agent`、`Session`、`Run`、`Task` 和 `Artifact`
   包装器。
5. Cookbook 示例和集成测试。

优势：

- 协议差异可见
- 测试可以将生成的方法与 Gateway(网关) 导出进行比较
- App SDK 保持独立于 Plugin SDK 内部
- 底层使用者仍然拥有完整的协议访问权限
- 高级使用者获得小型产品 API

## 相关

- [OpenClaw App SDK](/zh/concepts/openclaw-sdk)
- [Gateway(网关) RPC 参考](/zh/reference/rpc)
- [Agent 循环](/zh/concepts/agent-loop)
- [Agent 运行时](/zh/concepts/agent-runtimes)
- [后台任务](/zh/automation/tasks)
- [ACP agents](/zh/tools/acp-agents)
- [Plugin SDK 概述](/zh/plugins/sdk-overview)
