---
summary: "OpenClawOpenClaw 代码模式：一个由 QuickJS-WASI 和隐藏的运行范围工具目录支持的可选 exec/wait 工具界面"
title: "代码模式"
sidebarTitle: "代码模式"
read_when:
  - You want to enable OpenClaw code mode for an agent run
  - You need to explain why code mode is different from Codex Code mode
  - You are reviewing the exec/wait contract, QuickJS-WASI sandbox, TypeScript transform, or hidden tool-catalog bridge
  - You are adding or reviewing an internal code-mode namespace registry integration
---

代码模式是 OpenClaw 的一项实验性代理运行时功能。默认情况下它是关闭的。当您启用它时，OpenClaw 会更改模型在一次运行中看到的内容：不再直接公开每个已启用的工具架构，模型只能看到
OpenClawOpenClaw`exec` 和 `wait`。

此页面记录了 OpenClaw 代码模式。它不是 Codex 代码模式。这两个功能共享一个名称，但它们由不同的运行时实现，并公开不同的
OpenClaw`exec` 合约：

- 除非受限工具策略禁用了本机代码模式，否则 Codex 代码模式会为 Codex 应用服务器线程启用。它在 Codex 编程工具包中运行，其中模型通过 `exec.command` 合约编写 shell 命令。
- 除非配置了 OpenClaw`tools.codeMode.enabled: true`OpenClaw，否则 OpenClaw 代码模式是禁用的。它在 OpenClaw 通用代理运行时中运行，其中模型通过 `exec.code` 合约编写 JavaScript 或 TypeScript 程序。

Codex 代码模式和 Codex 本机动态工具搜索是稳定的 Codex 工具包界面。OpenClaw 代码模式是一个 OpenClaw 拥有的实验性工具界面适配器，用于通用 OpenClaw 运行。它使用 OpenClawOpenClawOpenClaw`quickjs-wasi`OpenClawOpenClaw、一个隐藏的 OpenClaw
工具目录以及正常的 OpenClaw 工具执行器。

## 这是什么？

OpenClaw 代码模式允许模型编写一个小的 JavaScript 或 TypeScript 程序，而不是直接从冗长的工具列表中进行选择。

当代码模式激活时：

- 模型可见的工具列表正是 `exec` 和 `wait`。
- `exec` 在受限的
  QuickJS-WASI 工作线程中评估模型生成的 JavaScript 或 TypeScript。
- 正常的 OpenClaw 工具对模型提示隐藏，并通过 OpenClaw`ALL_TOOLS` 和 `tools` 在访客程序中公开。
- 访客代码可以搜索隐藏的目录、描述工具，并通过普通代理轮次使用的相同 OpenClaw 执行路径来调用工具。
- MCP 工具被归类在 `MCP` 命名空间下。在代码模式下，此命名空间是调用 MCP 工具的唯一支持方式。
- `wait` 在嵌套工具调用仍处于挂起状态时恢复已暂停的代码模式运行。

重要区别：代码模式改变了面向模型的编排表面。它不会替换 OpenClaw 工具、插件工具、MCP 工具、身份验证、审批策略、渠道行为或模型选择。

## 为什么这很有用？

代码模式使大型工具目录更易于模型使用。

- 更小的提示表面：提供商接收两个控制工具，而不是数十或数百个完整的工具架构。
- 更好的编排：模型可以在一个代码单元内使用循环、连接、小型转换、条件逻辑和并行嵌套工具调用。
- 提供商中立：它适用于 OpenClaw、插件、MCP 和客户端工具，而无需依赖提供商原生的代码执行。
- 现有策略保持有效：嵌套工具调用仍需经过 OpenClaw 策略、审批、挂钩、会话上下文和审计路径。
- 明确的失败模式：当显式启用代码模式且运行时不可用时，OpenClaw 将以失败关闭（fail closed）的方式处理，而不是回退到广泛的直接工具暴露。

对于拥有大量已启用工具目录的代理，或者对于模型需要反复搜索、组合和调用工具才能生成答案的工作流，代码模式尤其有用。

## 如何启用它

将 `tools.codeMode.enabled: true` 添加到代理或运行时配置中：

```json5
{
  tools: {
    codeMode: {
      enabled: true,
    },
  },
}
```

也接受简写形式：

```json5
{
  tools: {
    codeMode: true,
  },
}
```

如果省略 `tools.codeMode`、将其设为 `false` 或为不包含 `enabled: true` 的对象，则代码模式保持关闭状态。

当您使用配置了 MCP 服务器的沙箱隔离代理时，还要确保沙箱工具策略允许捆绑的 MCP 插件，例如使用 `tools.sandbox.tools.alsoAllow: ["bundle-mcp"]`。请参阅[配置 - 工具和自定义提供商](/zh/gateway/config-tools#mcp-and-plugin-tools-inside-sandbox-tool-policy)。

当您需要更严格的限制时，请使用显式限制：

```json5
{
  tools: {
    codeMode: {
      enabled: true,
      timeoutMs: 10000,
      memoryLimitBytes: 67108864,
      maxOutputBytes: 65536,
      maxSnapshotBytes: 10485760,
      maxPendingToolCalls: 16,
      snapshotTtlSeconds: 900,
      searchDefaultLimit: 8,
      maxSearchLimit: 50,
    },
  },
}
```

要在调试时确认模型负载的形状，请运行 Gateway(网关) 并使用针对性日志记录：

```bash
OPENCLAW_DEBUG_CODE_MODE=1 \
OPENCLAW_DEBUG_MODEL_TRANSPORT=1 \
OPENCLAW_DEBUG_MODEL_PAYLOAD=tools \
openclaw gateway
```

当代码模式处于活动状态时，记录的面向模型的工具名称应为 `exec` 和
`wait`。如果您需要提供商的经修订负载，请添加
`OPENCLAW_DEBUG_MODEL_PAYLOAD=full-redacted` 以进行短暂的调试会话。

## 技术概览

本页的其余部分描述了运行时协定和实现细节。
它旨在供维护人员、调试工具公开的插件作者以及
验证高风险部署的操作员使用。

## 运行时状态

- 运行时：[`quickjs-wasi`](https://github.com/vercel-labs/quickjs-wasi)。
- 默认状态：已禁用。
- 稳定性：实验性的 OpenClaw 表面；Codex 代码模式是一个独立的稳定
  Codex harness 表面。
- 目标表面：通用 OpenClaw 代理运行。
- 安全态势：模型代码具有敌意。
- 面向用户的承诺：启用代码模式绝不会静默回退到广泛的
  直接工具公开。

## 范围

代码模式拥有准备运行时面向模型的编排形状。它
不拥有模型选择、渠道行为、身份验证、工具策略或工具
实现。

范围内：

- 模型可见的 `exec` 和 `wait` 工具定义
- 隐藏工具目录构建
- JavaScript 和 TypeScript 访客执行
- QuickJS-WASI worker 运行时
- 用于目录搜索、架构描述和工具调用的主机回调
- 用于暂停的访客程序的可恢复状态
- 输出、超时、内存、待处理调用和快照限制
- 用于嵌套工具调用的遥测和轨迹投影

范围外：

- 提供商原生的远程代码执行
- Shell 执行语义
- 更改现有的工具授权
- 持久的用户编写的脚本
- 访客代码中的包管理器、文件、网络或模块访问
- 直接重用 Codex 代码模式内部

提供商拥有的工具（如远程 Python 沙箱）仍然是独立的工具。请参阅
[代码执行](/zh/tools/code-execution)。

## 术语

**代码模式** 是隐藏普通模型工具并
仅公开 `exec` 和 `wait` 的 OpenClaw 运行时模式。

**访客运行时** 是评估模型代码的 QuickJS-WASI JavaScript VM。

**主机桥接（Host bridge）** 是从访客代码回调到 OpenClaw 的狭窄 JSON 兼容接口。

**目录** 是经过正常工具策略、插件、MCP 和客户端工具解析后，运行范围内的有效工具列表。

**嵌套工具调用** 是通过主机桥接从访客代码发起的工具调用。

**快照** 是已序列化的 QuickJS-WASI 虚拟机状态，已保存以便 `wait` 可以继续挂起的代码模式运行。

## 配置

`tools.codeMode.enabled` 是激活开关。仅设置其他代码模式字段不会启用该功能。

支持的字段：

- `enabled`：布尔值。默认为 `false`。仅当 `true` 时启用代码模式。
- `runtime`：`"quickjs-wasi"`。唯一支持的运行时。
- `mode`：`"only"`。暴露 `exec` 和 `wait`，隐藏正常的模型工具。
- `languages`：`"javascript"` 和 `"typescript"` 的数组。默认包含两者。
- `timeoutMs`：单次 `exec` 或 `wait` 的挂钟时间上限。默认为 `10000`。运行时限制范围：`100` 到 `60000`。
- `memoryLimitBytes`：QuickJS 堆上限。默认为 `67108864`。运行时限制范围：`1048576` 到 `1073741824`。
- `maxOutputBytes`：返回文本、JSON 和日志的上限。默认为 `65536`。运行时限制范围：`1024` 到 `10485760`。
- `maxSnapshotBytes`：序列化虚拟机快照的上限。默认为 `10485760`。运行时限制范围：`1024` 到 `268435456`。
- `maxPendingToolCalls`：并发嵌套工具调用的上限。默认为 `16`。运行时限制范围：`1` 到 `128`。
- `snapshotTtlSeconds`：暂停的 VM 可以恢复多长时间。默认 `900`。
  运行时限制：`1` 到 `86400`。
- `searchDefaultLimit`：默认隐藏目录搜索结果计数。默认 `8`。
  运行时将其限制为 `maxSearchLimit`。
- `maxSearchLimit`：最大隐藏目录搜索结果计数。默认 `50`。
  运行时限制：`1` 到 `50`。

如果启用了代码模式但无法加载 QuickJS-WASI，OpenClaw 将对该运行以封闭方式失败。它不会作为后备静默暴露普通工具。

## 激活

代码模式在确知有效工具策略之后、组装最终模型请求之前进行评估。

激活顺序：

1. 解析代理、模型、提供商、沙箱、渠道、发送方和运行策略。
2. 构建有效的 OpenClaw 工具列表。
3. 添加符合条件的插件、MCP 和客户端工具。
4. 应用允许和拒绝策略。
5. 如果 `tools.codeMode.enabled` 为 false，则继续正常的工具暴露。
6. 如果已启用且工具在该运行中处于活动状态，请在代码模式目录中注册有效的工具。
7. 从模型可见的工具列表中移除所有普通工具。
8. 添加代码模式 `exec` 和 `wait`。

故意没有工具的运行（如原始模型调用、`disableTools` 或空的允许列表）即使配置包含 `tools.codeMode.enabled: true` 也不会激活代码模式界面。

代码模式目录是运行范围的。它不得泄露来自其他代理、会话、发送方或运行的工具。

## 模型可见工具

当代码模式处于活动状态时，模型只会看到这些顶层工具：

- `exec`
- `wait`

所有其他已启用的工具都会从面向模型的工具列表中隐藏，并注册在代码模式目录中。

模型应使用 `exec` 进行工具编排、数据连接、循环、并行嵌套调用和结构化转换。仅当 `exec` 返回可恢复的 `waiting` 结果时，模型才应使用 `wait`。

## `exec`

`exec` 启动代码模式单元并返回一个结果。输入代码由模型生成，必须将其视为具有敌意。

输入：

```typescript
type CodeModeExecInput = {
  code?: string;
  command?: string;
  language?: "javascript" | "typescript";
};
```

输入规则：

- `code` 或 `command` 之一必须非空。
- `code` 是文档中面向模型的字段。
- `command` 被接受为 hook 策略和受信任重写的 exec 兼容别名；当两者同时存在时，值必须匹配。
- 外部代码模式 `exec` hook 事件包括 `toolKind: "code_mode_exec"`，并且在输入语言已知时包括 `toolInputKind: "javascript" | "typescript"`，因此策略可以区分代码模式单元与共享相同工具名称的 shell 样式 `exec` 调用。
- `language` 默认为 `"javascript"`。
- 如果 `language` 为 `"typescript"`OpenClaw，OpenClaw 会在评估前进行转译。
- `exec` 在 v1 中拒绝 `import`、`require`、动态导入和模块加载器模式。
- `exec` 不会递归地暴露正常的 shell `exec` 实现。

结果：

```typescript
type CodeModeResult = CodeModeCompletedResult | CodeModeWaitingResult | CodeModeFailedResult;

type CodeModeCompletedResult = {
  status: "completed";
  value: unknown;
  output?: CodeModeOutput[];
  telemetry: CodeModeTelemetry;
};

type CodeModeWaitingResult = {
  status: "waiting";
  runId: string;
  reason: "pending_tools" | "yield";
  pendingToolCalls?: CodeModePendingToolCall[];
  output?: CodeModeOutput[];
  telemetry: CodeModeTelemetry;
};

type CodeModeFailedResult = {
  status: "failed";
  error: string;
  code?: CodeModeErrorCode;
  output?: CodeModeOutput[];
  telemetry: CodeModeTelemetry;
};
```

当 QuickJS VM 挂起并具有仍需要模型可见的延续的可恢复状态时，`exec` 返回 `waiting`。结果包含一个用于 `wait` 的 `runId`。命名空间桥接调用（包括 MCP 命名空间调用）会在它们准备就绪时在同一个 `exec`/`wait` 调用内部自动排空，因此紧凑的代码块可以检查 `$api()` 并调用 MCP 工具，而无需强制每个命名空间等待进行一次模型工具调用。

仅当来宾 VM 没有挂起工作且最终值在 OpenClaw 的输出适配器运行后与 JSON 兼容时，`exec` 才返回 `completed`OpenClaw。

## `wait`

`wait` 继续已挂起的代码模式 VM。

输入：

```typescript
type CodeModeWaitInput = {
  runId: string;
};
```

输出是与 `exec` 返回的相同的 `CodeModeResult` 联合类型。

`wait`OpenClaw 的存在是因为嵌套的 OpenClaw 工具可能会很慢、具有交互性、需要审批批准或流式传输部分更新。当主机等待外部工作时，模型不应需要保持一个长 `exec` 调用处于打开状态。

QuickJS-WASI 快照和恢复是 v1 恢复机制：

1. `exec` 评估代码直到完成、失败或挂起。
2. 挂起时，OpenClaw 会对 QuickJS VM 进行快照并记录挂起的主机工作。
3. 当挂起工作结束时，`wait` 恢复 VM 快照。
4. OpenClaw 通过稳定名称重新注册主机回调。
5. OpenClaw 将嵌套工具结果传递到恢复的 VM 中。
6. OpenClaw 排空 QuickJS 挂起的任务。
7. `wait` 返回 `completed`、`failed` 或另一个 `waiting` 结果。

快照是运行时状态，而不是用户工件。它们的大小受限，会过期，并且仅限于创建它们的运行和会话。

在以下情况下 `wait` 失败：

- `runId` 未知。
- 快照已过期。
- 父运行或会话已中止。
- 调用者不在同一运行/会话范围内。
- QuickJS-WASI 恢复失败。
- 恢复将超出配置的限制。

## Guest runtime API

Guest runtime 暴露了一个小型全局 API：

```typescript
declare const ALL_TOOLS: ToolCatalogEntry[];
declare const tools: ToolCatalog;
declare const MCP: Record<string, unknown>;
declare const namespaces: Record<string, unknown>;

declare function text(value: unknown): void;
declare function json(value: unknown): void;
declare function yield_control(reason?: string): Promise<void>;
```

`ALL_TOOLS` 是运行范围目录的紧凑元数据。默认情况下，它不包含完整的架构。

```typescript
type ToolCatalogEntry = {
  id: string;
  name: string;
  label?: string;
  description: string;
  source: "openclaw" | "plugin" | "mcp" | "client";
  sourceName?: string;
};
```

仅在需要时加载完整架构：

```typescript
type ToolCatalogEntryWithSchema = ToolCatalogEntry & {
  parameters: unknown;
};
```

目录辅助工具：

```typescript
type ToolCatalog = {
  search(query: string, options?: { limit?: number }): Promise<ToolCatalogEntry[]>;
  describe(id: string): Promise<ToolCatalogEntryWithSchema>;
  call(id: string, input?: unknown): Promise<unknown>;
  [safeToolName: string]: unknown;
};
```

仅为明确的安全名称安装便捷工具函数：

```typescript
const files = await tools.search("read local file");
const fileRead = await tools.describe(files[0].id);
const content = await tools.call(fileRead.id, { path: "README.md" });

// If the hidden catalog has an unambiguous `web_search` entry:
const hits = await tools.web_search({ query: "OpenClaw code mode" });
```

在代码模式下，无法通过 `tools.call(...)` 或便捷函数调用 MCP 目录条目。它们仅通过生成的 `MCP` 命名空间公开。TypeScript 风格的声明文件可通过只读 `API` 虚拟文件表面获取，因此代理可以检查 MCP 签名而无需将 MCP 架构添加到提示中：

```typescript
const files = await API.list("mcp");
const githubApi = await API.read("mcp/github.d.ts");

const issue = await MCP.github.createIssue({
  owner: "openclaw",
  repo: "openclaw",
  title: "Investigate gateway logs",
});

const snapshot = await MCP.chromeDevtools.takeSnapshot({ output: "markdown" });
const resource = await MCP.docs.resources.read({ uri: "memo://one" });
const prompt = await MCP.docs.prompts.get({
  name: "brief",
  arguments: { topic: "release" },
});
```

`API.read("mcp/<server>.d.ts")` 返回从 MCP 工具元数据推断出的紧凑声明：

```typescript
type McpToolResult = {
  content?: unknown[];
  structuredContent?: unknown;
  isError?: boolean;
  [key: string]: unknown;
};

declare namespace MCP.github {
  /** Return this TypeScript-style API header. */
  function $api(toolName?: string, options?: { schema?: boolean }): Promise<McpApiHeader>;

  /**
   * Create a GitHub issue.
   * @param owner Repository owner
   * @param repo Repository name
   * @param title Issue title
   */
  function createIssue(input: { owner: string; repo: string; title: string; body?: string }): Promise<McpToolResult>;
}
```

声明文件是虚拟的，不是写入工作区或状态目录下的文件。对于每次代码模式 `exec` 调用，OpenClaw 都会构建运行范围工具目录，保留可见的 MCP 条目，渲染 `mcp/index.d.ts` 加上每个可见服务器的 `mcp/<server>.d.ts` 声明，并将该小型只读表注入 QuickJS 工作线程。Guest 代码仅看到 `API` 对象：`API.list(prefix?)` 返回文件元数据，`API.read(path)` 返回所选声明内容。未知路径和 `.` / `..` 段将被拒绝。

这使得大型 MCP 模式不会出现在模型提示中。代理从 `exec` 工具描述中得知存在虚拟 API，仅读取所需的声明文件，然后使用一个对象参数调用 `MCP.<server>.<tool>()`。当代理需要在程序内部获取单工具模式响应时，`MCP.<server>.$api()` 仍可用作内联回退方案。

Guest 运行时不得直接暴露 Host 对象。输入和输出作为具有显式大小限制的 JSON 兼容值通过桥接。

## 内部命名空间

内部命名空间为代码模式提供了简洁的域 API，而无需添加更多模型可见的工具。加载器拥有的集成可以注册命名空间，例如 `Issues`、`Fictions` 或 `Calendar`；然后 Guest 代码在 QuickJS 程序内部调用该命名空间，而 OpenClaw 仍仅向 展示 `exec` 和 `wait`。

命名空间目前是内部的。没有公共插件 SDK 命名空间 API：外部插件命名空间需要加载器拥有的合约，以便插件标识、已安装的清单、身份验证状态和缓存的目录描述符不会与支持该命名空间的插件工具发生漂移。核心代码模式仅拥有沙箱、序列化、目录门控和桥接分发。

Guest 代码随后可以使用直接全局对象或 `namespaces` 映射：

```javascript
const open = await Issues.list({ state: "open" });
const alsoOpen = await namespaces.Issues.list({ state: "open" });
return { count: open.length, alsoCount: alsoOpen.length };
```

### 注册表生命周期

命名空间注册表是进程本地的，并按命名空间 ID 键控。典型的运行遵循此路径：

1. 受信任的加载器调用 `registerCodeModeNamespaceForPlugin(pluginId, registration)`。
2. 代码模式为该运行创建隐藏的 `ToolSearchRuntime` 并读取其运行范围的目录。
3. `createCodeModeNamespaceRuntime(ctx, catalog)` 仅保留那些 `requiredToolNames` 均可见且归同一 `pluginId` 所有的注册项。
4. 每个可见的命名空间都会为当前运行调用 `createScope(ctx)`。
   作用域接收运行上下文，例如 `agentId`、`sessionKey`、`sessionId`、
   `runId`、配置和中止状态。
5. 作用域数据被序列化为一个简单的描述符，并作为
   直接全局变量和 `namespaces.<globalName>` 注入到 QuickJS 中。
6. 访客调用通过 worker 桥接暂停，解析宿主上的命名空间路径，将调用映射到声明的插件拥有的目录工具，并通过 `ToolSearchRuntime.call` 执行该工具。
7. OpenClaw 会在活动的 OpenClaw`exec`/`wait` 工具调用内部自动排空准备就绪的命名空间桥接调用。如果在超时时命名空间工作仍在挂起，或者
   访客显式让出，`wait` 稍后会恢复同一命名空间运行时。
8. 插件回滚或卸载会调用 `clearCodeModeNamespacesForPlugin(pluginId)`，
   以防止过时的全局变量在插件加载失败后仍然存在。

重要的不变性：命名空间调用就是目录工具调用。它们使用与 `tools.call(...)` 相同的策略挂钩、批准、中止处理、遥测、记录投影
以及暂停/恢复行为。

### 注册形式

从拥有支持工具的集成中注册命名空间。保持作用域较小，并且仅公开映射到已声明目录工具的域动词。

```typescript
import { createCodeModeNamespaceTool, registerCodeModeNamespaceForPlugin } from "../agents/code-mode-namespaces.js";

const pluginId = "github";

registerCodeModeNamespaceForPlugin(pluginId, {
  id: "github-issues",
  globalName: "Issues",
  description: "GitHub issue helpers for the current repository.",
  requiredToolNames: ["github_list_issues", "github_update_issue"],
  prompt: "Use Issues.list(params) and Issues.update(number, patch).",
  createScope: (ctx) => ({
    repository: ctx.config,
    list: createCodeModeNamespaceTool("github_list_issues", ([params]) => params ?? {}),
    update: createCodeModeNamespaceTool("github_update_issue", ([number, patch]) => ({
      number,
      patch,
    })),
  }),
});
```

`createCodeModeNamespaceTool(toolName, inputMapper)` 将作用域成员标记为
可调用的命名空间函数。可选的 `inputMapper` 接收访客
参数并返回支持目录工具的输入对象。如果没有
输入映射器，则使用第一个访客参数；如果省略，则使用 `{}`。

原始宿主函数在访客代码运行之前会被拒绝：

```typescript
createScope: () => ({
  // Wrong: this bypasses the catalog tool lifecycle and will be rejected.
  list: async () => githubClient.listIssues(),
});
```

### 所有权和可见性

命名空间所有权绑定到注册调用者的 `pluginId`。
`requiredToolNames` 既是可见性网关，也是所有权检查：

- 每个必需的工具都必须存在于运行目录中
- 每个必需的工具都必须具有 `sourceName === pluginId`
- 当任何必需工具缺失或由另一个
  插件拥有时，该命名空间将被隐藏
- 每个可调用路径只能目标定位到在 `requiredToolNames` 中命名的工具

这可以防止另一个插件通过注册同名工具来暴露命名空间。这也使命名空间与普通的代理策略保持一致：如果运行无法看到支持工具，它也就无法看到该命名空间。

例如，GitHub 命名空间应该位于 GitHub 拥有的扩展后面，该扩展拥有 GitHub 认证、REST 或 GraphQL 客户端、速率限制、写入批准和测试。核心代码模式不应嵌入 GitHub 特定的 API、令牌处理或提供商策略。

### 作用域序列化规则

`createScope(ctx)` 可能返回一个包含 JSON 兼容值、数组、嵌套对象和 `createCodeModeNamespaceTool(...)` 调用标记的纯对象。宿主对象从不直接进入 QuickJS。

序列化程序拒绝：

- 原始函数
- 循环对象图
- 不安全的路径段：`__proto__`、`constructor`、`prototype`、空键或包含内部路径分隔符的键
- 不是 JavaScript 标识符的 `globalName` 值
- 与内置代码模式全局变量（如 `tools`、`namespaces`、`text`、`json`、`yield_control` 或 `__openclaw*`）冲突的 `globalName`

无法进行 JSON 序列化的值在跨桥之前会被转换为 JSON 安全的后备值。二进制数据、句柄、套接字、客户端和类实例应保留在普通目录工具后面。

### 提示词

仅当命名空间在该运行中可见时，命名空间 `description` 和可选的 `prompt` 才会附加到模型可见的 `exec` 模式。使用它们来教授最小的有用表面：

```typescript
{
  description: "Fiction production service helpers.",
  prompt:
    "Use Fictions.riskAudit(), Fictions.promoteIfReady(id, status), and Fictions.unpaidOver(amount).",
}
```

保持提示词关于命名空间契约，而不是关于身份验证设置、实现历史或不相关的插件行为。

### 清理

命名空间是进程本地注册。当拥有插件被禁用、卸载或回滚时，请将其删除：

```typescript
clearCodeModeNamespacesForPlugin(pluginId);
```

仅当移除一个已知的命名空间时才使用 `unregisterCodeModeNamespace(namespaceId)`。测试可以调用 `clearCodeModeNamespacesForTest()` 以避免在不同测试用例间泄漏注册信息。

### 测试清单

命名空间的变更应覆盖安全边界和访客行为：

- 仅当后端工具可见时，命名空间提示文本才会出现
- 来自另一个 `sourceName` 的同名工具不会暴露该命名空间
- 原始作用域函数会被拒绝
- 伪造的命名空间 ID 和伪造的路径会被拒绝
- 可调用路径不能以未声明的工具为目标
- 嵌套对象和共享引用正确序列化
- 命名空间调用通过目录工具执行并返回 JSON 安全的详细信息
- 失败可以被访客代码捕获
- 挂起的命名空间调用通过 `wait` 恢复
- 插件回滚会清除所属的命名空间注册

命名空间是对通用 `tools.search` / `tools.call` 目录的补充。使用该目录来处理任意已启用的 OpenClaw、插件和客户端工具；使用 `MCP` 处理 MCP 工具；在其他命名空间中，用于插件拥有且有文档记录的领域 API，在这些场景下，简洁的代码比重复的模式查找更可靠。

## 输出 API

`text(value)` 将人类可读的输出追加到 `output` 数组中。

`json(value)` 在进行 JSON 兼容序列化后追加一个结构化输出项。

访客代码的最终返回值会成为 `completed` 结果中的 `value`。

输出项：

```typescript
type CodeModeOutput = { type: "text"; text: string } | { type: "json"; value: unknown };
```

输出规则：

- 输出顺序与访客调用匹配
- 输出受 `maxOutputBytes` 限制
- 不可序列化的值会被转换为纯字符串或错误
- v1 不支持二进制值
- 图像和文件通过常规 OpenClaw 工具传输，而不通过
  代码模式桥接器

## 工具目录

隐藏目录包括经过有效策略筛选后的工具：

1. OpenClaw 核心工具。
2. 捆绑的插件工具。
3. 外部插件工具。
4. MCP 工具。
5. 当前运行中客户端提供的工具。

目录 ID 在单次运行中保持稳定，并在等效工具集间尽可能具备确定性。

推荐的 ID 形状：

```text
<source>:<owner>:<tool-name>
```

示例：

```text
openclaw:core:message
plugin:browser:browser_request
mcp:github:create_issue
client:app:select_file
```

该目录会省略代码模式控制工具：

- `exec`
- `wait`
- `tool_search_code`
- `tool_search`
- `tool_describe`
- `tool_call`

这可以防止递归，并保持面向模型的契约范围狭窄。

MCP 条目保留在运行范围的目录中，以便策略、审批、钩子、遥测、转录投影和确切的工具 ID 与正常工具执行共享。面向 Guest 的 `ALL_TOOLS`、`tools.search(...)`、`tools.describe(...)` 和 `tools.call(...)` 视图会省略 MCP 条目。生成的 `MCP.<server>.<tool>({ ...input })` 命名空间会解析回确切的目录 ID，然后通过相同的执行器路径进行分发。

## 工具搜索交互

代码模式取代了活动运行中的 OpenClaw 工具搜索模型表面。

当 `tools.codeMode.enabled` 为 true 且代码模式激活时：

- OpenClaw 不会将 `tool_search_code`、`tool_search`、`tool_describe` 或 `tool_call` 作为模型可见的工具公开。
- 相同的目录概念被移入 Guest 运行时内部。
- Guest 运行时接收紧凑的 `ALL_TOOLS` 元数据，以及用于非 MCP 工具的搜索、描述和调用辅助函数。
- MCP 调用使用生成的 `MCP` 命名空间及其 `$api()` 标头，而不是 `tools.call(...)`。
- 嵌套调用通过工具搜索使用的相同 OpenClaw 执行器路径进行分发。

现有的 [工具搜索](/zh/tools/tool-search) 页面描述了 OpenClaw 紧凑目录桥。代码模式是能够使用 `exec` 和 `wait` 的运行的通用 OpenClaw 替代方案。

## 工具名称和冲突

模型可见的 `exec` 工具是代码模式工具。如果启用了常规的 OpenClaw shell `exec` 工具，它将对模型隐藏，并像其他任何工具一样被编目。

在访客运行时内部：

- 如果策略允许，`tools.call("openclaw:core:exec", input)` 可以调用 shell exec 工具。
- 仅当 shell exec 目录条目具有明确的安全名称时，才会安装 `tools.exec(...)`。
- 代码模式 `exec` 工具永远无法通过 `tools` 递归使用。

如果两个工具规范化为相同的安全便捷名称，OpenClaw 将省略该便捷函数，并要求使用 `tools.call(id, input)`。

## 嵌套工具执行

每次嵌套工具调用都会跨越主机桥接器并重新进入 OpenClaw。

嵌套执行保留以下内容：

- active agent id
- 会话 id and 会话 key
- sender and 渠道 context
- sandbox policy
- approval policy
- plugin `before_tool_call` hooks
- abort signal
- streaming updates where available
- trajectory and audit events

嵌套调用作为真实工具调用投影到转录本中，因此支持包可以显示发生了什么。该投影标识了父代码模式工具调用和嵌套工具 id。

允许最多 `maxPendingToolCalls` 个并行嵌套调用。

## Runtime state

每次代码模式运行都有一个状态机：

- `running`: VM 正在执行或嵌套调用正在进行中。
- `waiting`: VM 快照存在，可以使用 `wait` 恢复。
- `completed`: 返回最终值；快照已删除。
- `failed`: 返回错误；快照已删除。
- `expired`: 快照或挂起状态超过保留期限；无法恢复。
- `aborted`: 父运行/会话已取消；快照已删除。

状态按代理运行、会话和工具调用 id 划定作用域。来自不同运行或会话的 `wait` 调用将失败。

快照存储是受限的：

- 每次运行的最大快照字节数
- 每个进程的最大实时快照数
- snapshot TTL
- cleanup on run end
- 在 Gateway(网关) 关闭时不支持持久化的清理

## QuickJS-WASI 运行时

OpenClaw 在所属包中将 OpenClaw`quickjs-wasi` 作为直接依赖加载。
运行时依赖不依赖于为代理、PAC 或其他不相关依赖安装的传递副本。

运行时职责：

- 编译或加载 QuickJS-WASI WebAssembly 模块
- 为每次代码模式运行或恢复创建一个隔离的 VM
- 通过稳定的名称注册主机回调
- 设置内存和中断限制
- 执行 JavaScript
- 排空待处理的任务
- 快照挂起的 VM 状态
- 恢复 `wait` 的快照
- 在达到终止状态后释放 VM 句柄和快照

运行时在工作器中在 OpenClaw 的主事件循环之外执行。来宾
无限循环不得无限期阻塞 Gateway(网关) 进程。

## TypeScript

TypeScript 支持仅作为源转换：

- 接受的输入：一个 TypeScript 代码字符串
- 输出：由 QuickJS-WASI 执行的 JavaScript 字符串
- 无类型检查
- 无模块解析
- v1 中没有 `import` 或 `require`
- 诊断信息作为 `failed` 结果返回

TypeScript 编译器仅针对 TypeScript 单元格延迟加载。纯
JavaScript 单元格和禁用的代码模式不会加载编译器。

在可行的情况下，转换应保留有用的行号。

## 安全边界

模型代码是恶意的。运行时使用纵深防御：

- 在主事件循环之外运行 QuickJS-WASI
- 将 `quickjs-wasi` 作为直接依赖加载，而不是通过 Codex 或传递
  包
- 来宾中无文件系统、网络、子进程、模块导入、环境变量或
  主机全局对象
- 使用 QuickJS 内存和中断限制
- 强制执行父进程的挂钟超时
- 强制执行输出、快照、日志和待处理调用的上限
- 通过狭窄的 JSON 适配器序列化主机桥接值
- 将主机错误转换为纯来宾错误，绝不使用主机领域对象
- 在超时、中止、会话结束或到期时丢弃快照
- 拒绝递归访问 `exec`、`wait` 和工具搜索控制工具
- 防止便捷名称冲突遮蔽目录辅助函数

沙箱是一层安全防护。对于高风险部署，操作员仍然需要操作系统级别的加固。

## 错误代码

```typescript
type CodeModeErrorCode = "runtime_unavailable" | "invalid_config" | "invalid_input" | "unsupported_language" | "typescript_transform_failed" | "module_access_denied" | "timeout" | "memory_limit_exceeded" | "output_limit_exceeded" | "snapshot_limit_exceeded" | "snapshot_expired" | "snapshot_restore_failed" | "too_many_pending_tool_calls" | "nested_tool_failed" | "aborted" | "internal_error";
```

返回给客端的错误是纯数据。主机 `Error` 实例、堆栈对象、原型和主机函数不会传入 QuickJS。

## 遥测

代码模式报告：

- 发送给模型的可见工具名称
- 隐藏的目录大小和来源细分
- `exec` 和 `wait` 计数
- 嵌套的搜索、描述和调用计数
- 被调用的嵌套工具 ID
- 超时、内存、快照和输出上限失败
- 快照生命周期事件

遥测不得包含密钥、原始环境值或除现有 OpenClaw 轨迹策略之外的未经编辑的工具输入。

## 调试

当代码模式的行为与普通工具运行不同时，使用有针对性的模型传输日志记录：

```bash
OPENCLAW_DEBUG_CODE_MODE=1 \
OPENCLAW_DEBUG_MODEL_TRANSPORT=1 \
OPENCLAW_DEBUG_MODEL_PAYLOAD=tools \
OPENCLAW_DEBUG_SSE=events \
openclaw gateway
```

对于负载形状调试，请使用 `OPENCLAW_DEBUG_MODEL_PAYLOAD=full-redacted`。
这会记录模型请求的受限、经编辑的 JSON 快照；应仅在调试期间使用，因为提示和消息文本仍可能出现。

对于流调试，请使用 `OPENCLAW_DEBUG_SSE=peek` 来记录前五个
经编辑的 SSE 事件。如果代码模式界面激活后，最终提供商负载
未准确包含 `exec` 和 `wait`，
代码模式也会执行失效关闭（fail closed）。

## 实现布局

实现单元：

- 配置契约： `tools.codeMode`
- 目录构建器：有效工具到压缩条目和 ID 映射
- 模型界面适配器：将可见工具替换为 `exec` 和 `wait`
- QuickJS-WASI 运行时适配器：加载、求值、快照、恢复、释放
- 工作器监督器：超时、中止、崩溃隔离
- 桥接适配器：JSON 安全的主机回调和结果传递
- TypeScript 转换适配器
- 快照存储：TTL、大小上限、运行/会话作用域
- 用于嵌套工具调用的轨迹投影
- 遥测计数器和诊断

该实现重用了工具搜索中的目录和执行器概念，但
不使用 `node:vm` 子项作为沙箱。

## 验证清单

代码模式覆盖范围应证明：

- 禁用的配置使现有的工具暴露保持不变
- 不包含 `enabled: true` 的对象配置使代码模式保持禁用状态
- 当运行中的工具处于活动状态时，启用的配置仅向模型暴露 `exec` 和 `wait`
- 原始无工具运行、`disableTools` 和空允许列表不会触发代码模式负载强制执行
- 所有有效的非 MCP 工具都出现在 `ALL_TOOLS` 中
- 被拒绝的工具不会出现在 `ALL_TOOLS` 中
- `tools.search`、`tools.describe` 和 `tools.call` 适用于 OpenClaw 工具
- `API.list("mcp")` 和 `API.read("mcp/<server>.d.ts")` 在没有桥接/工具调用的情况下暴露 TypeScript 风格的 MCP 声明
- MCP 命名空间 `$api()` 仍可作为模式的内联回退方案使用
- MCP 命名空间调用适用于具有单个对象输入的可见 MCP 工具，而直接 MCP 目录条目不存在于 `tools.*` 中
- 工具搜索控制工具在模型界面和隐藏目录中均被隐藏
- 嵌套调用保留审批和钩子行为
- shell `exec` 对模型隐藏，但在允许时可通过目录 ID 调用
- 递归代码模式 `exec` 和 `wait` 无法从访客代码调用
- TypeScript 输入会被转换和评估，而无需在禁用或仅限 JavaScript 的路径上加载 TypeScript
- `import`、`require`、文件系统、网络和环境访问均失败
- 无限循环会超时，且无法阻塞 Gateway(网关)
- 内存上限失败会终止访客 VM
- 对已完成和暂停的调用强制执行输出和快照上限
- `wait` 恢复暂停的快照并返回最终值
- 过期、已中止、会话错误和未知的 `runId` 值均失败
- 脚本重放和持久化会保留代码模式控制调用
- 脚本和遥测数据清楚地显示嵌套的工具调用

## 端到端测试计划

在更改运行时时，请将这些作为集成测试或端到端测试运行：

1. 使用 Gateway(网关)`tools.codeMode.enabled: false` 启动 Gateway(网关)。
2. 发送一个带有小型直接工具集的 agent 轮次。
3. 断言模型可见的工具未发生更改。
4. 使用 `tools.codeMode.enabled: true` 重启。
5. 发送一个包含 OpenClaw、插件、MCP 和客户端测试工具的 agent 轮次。
6. 断言模型可见的工具列表确切为 `exec`、`wait`。
7. 在 `exec` 中，读取 `ALL_TOOLS` 并断言有效的测试工具存在。
8. 在 `exec`OpenClaw 中，通过 `tools.search`、`tools.describe` 和 `tools.call` 调用 OpenClaw/插件/客户端工具。
9. 在 `exec` 中，调用 `API.list("mcp")` 和 `API.read("mcp/<server>.d.ts")` 并断言声明文件描述了可见的 MCP 工具。
10. 在 `exec` 中，通过 `MCP.<server>.<tool>({ ...input })` 调用 MCP 工具，并断言 `ALL_TOOLS` 和 `tools.*` 中不存在直接的 MCP 目录条目。
11. 断言被拒绝的工具不存在，且无法通过猜测的 ID 进行调用。
12. 启动一个嵌套工具调用，该调用在 `exec` 返回 `waiting` 后解析。
13. 调用 `wait` 并断言恢复的 VM 接收到工具结果。
14. 断言最终答案包含恢复后产生的输出。
15. 断言超时、中止和快照过期会清理运行时状态。
16. 导出轨迹并断言嵌套调用在父级 code-mode 调用下可见。

对此页面仅文档的更改仍应运行 `pnpm check:docs`。

## 相关

- [工具搜索](/zh/tools/tool-search)
- [Agent 运行时](/zh/concepts/agent-runtimes)
- [Exec 工具](/zh/tools/exec)
- [代码执行](/zh/tools/code-execution)
