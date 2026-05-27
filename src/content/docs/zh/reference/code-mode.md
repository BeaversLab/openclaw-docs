---
summary: "OpenClawOpenClaw 代码模式：一种由 QuickJS-WASI 支持的、具有隐藏运行范围工具目录的可选执行/等待工具表面"
title: "代码模式"
sidebarTitle: "代码模式"
read_when:
  - You want to enable OpenClaw code mode for an agent run
  - You need to explain why code mode is different from Codex Code mode
  - You are reviewing the exec/wait contract, QuickJS-WASI sandbox, TypeScript transform, or hidden tool-catalog bridge
---

代码模式是一个实验性的 OpenClaw 代理运行时功能。默认情况下它是关闭的。当你启用它时，OpenClaw 会改变模型在一次运行中看到的内容：不再直接暴露每个已启用的工具架构，模型只能看到
OpenClawOpenClaw`exec` 和 `wait`。

本页面记录了 OpenClaw 代码模式。它不是 Codex 代码模式。这两个功能共享一个名称，但它们由不同的运行时实现，并暴露不同的 OpenClaw`exec` 协约：

- 除非受限工具策略禁用了原生代码模式，否则 Codex 代码模式默认对 Codex 应用服务器线程启用。它在 Codex 编程工具包中运行，模型通过 `exec.command` 协约编写 shell 命令。
- 除非配置了 OpenClaw`tools.codeMode.enabled: true`OpenClaw，否则 OpenClaw 代码模式处于禁用状态。它在 OpenClaw 通用代理运行时中运行，模型通过 `exec.code` 协约编写 JavaScript 或 TypeScript 程序。

Codex 代码模式和 Codex 原生动态工具搜索是稳定的 Codex 工具包界面。OpenClaw 代码模式是一个由 OpenClaw 拥有的实验性工具界面适配器，用于通用 OpenClaw 运行。它使用 OpenClawOpenClawOpenClaw`quickjs-wasi`OpenClawOpenClaw、一个隐藏的 OpenClaw 工具目录以及正常的 OpenClaw 工具执行器。

## 这是什么？

OpenClaw 代码模式允许模型编写一个小的 JavaScript 或 TypeScript 程序，而不是直接从冗长的工具列表中进行选择。

当代码模式激活时：

- 模型可见的工具列表仅为 `exec` 和 `wait`。
- `exec` 在受限的 QuickJS-WASI worker 中评估模型生成的 JavaScript 或 TypeScript。
- 正常的 OpenClaw 工具对模型提示隐藏，并通过 OpenClaw`ALL_TOOLS` 和 `tools` 在访客程序内部暴露。
- 访客代码可以搜索隐藏的目录、描述工具，并通过普通代理轮次使用的相同 OpenClaw 执行路径来调用工具。
- 当嵌套工具调用仍处于挂起状态时，`wait` 会恢复暂停的代码模式运行。

重要的区别在于：代码模式改变了面向模型的编排表面。它不会取代 OpenClaw 工具、插件工具、MCP 工具、身份验证、审批策略、渠道行为或模型选择。

## 为什么这很好？

代码模式使大型工具目录更易于模型使用。

- 更小的提示词表面：提供商接收两个控制工具，而不是数十或数百个完整的工具架构。
- 更好的编排：模型可以在一个代码单元内使用循环、连接、小型转换、条件逻辑和并行嵌套工具调用。
- 提供商中立：它适用于 OpenClaw、插件、MCP 和客户端工具，而不依赖于提供商原生的代码执行。
- 现有策略保持有效：嵌套工具调用仍然需要通过 OpenClaw 策略、审批、挂钩、会话上下文和审计路径。
- 清晰的故障模式：当明确启用代码模式且运行时不可用时，OpenClaw 将以失败关闭的方式处理，而不是回退到广泛的直接工具暴露。

对于拥有大量已启用工具目录的代理，或者模型在生成答案之前需要反复搜索、组合和调用工具的工作流，代码模式尤其有用。

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

当省略 `tools.codeMode`、设置为 `false` 或不包含 `enabled: true` 的对象时，代码模式保持关闭状态。

当您想要更严格的限制时，请使用显式限制：

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

要在调试时确认模型负载的形状，请使用针对性的日志记录运行 Gateway：

```bash
OPENCLAW_DEBUG_CODE_MODE=1 \
OPENCLAW_DEBUG_MODEL_TRANSPORT=1 \
OPENCLAW_DEBUG_MODEL_PAYLOAD=tools \
openclaw gateway
```

启用代码模式后，记录的面向模型的工具名称应为 `exec` 和 `wait`。如果您需要经过编辑的提供商负载，请添加 `OPENCLAW_DEBUG_MODEL_PAYLOAD=full-redacted` 以进行简短的调试会话。

## 技术概览

本页的其余部分描述了运行时契约和实现细节。它旨在供维护者、正在调试工具暴露的插件作者以及验证高风险部署的操作员使用。

## 运行时状态

- 运行时：[`quickjs-wasi`](https://github.com/vercel-labs/quickjs-wasi)。
- 默认状态：已禁用。
- 稳定性：实验性的 OpenClaw 表面；Codex Code mode 是一个独立的稳定 Codex harness 表面。
- 目标表面：通用 OpenClaw 代理运行。
- 安全姿态：模型代码是恶意的。
- 面向用户的承诺：启用代码模式绝不会静默回退到广泛的直接工具暴露。

## 范围

代码模式拥有针对已准备运行的面向模型的编排形态。它不拥有模型选择、渠道行为、身份验证、工具策略或工具实现。

范围内：

- 模型可见的 `exec` 和 `wait` 工具定义
- 隐藏工具目录构建
- JavaScript 和 TypeScript 访客执行
- QuickJS-WASI worker 运行时
- 用于目录搜索、架构描述和工具调用的主机回调
- 用于暂停访客程序的可恢复状态
- 输出、超时、内存、待处理调用和快照限制
- 用于嵌套工具调用的遥测和轨迹投影

范围外：

- 提供商原生的远程代码执行
- Shell 执行语义
- 更改现有工具授权
- 持久的用户编写脚本
- 访客代码中的包管理器、文件、网络或模块访问
- 直接复用 Codex Code mode 内部组件

提供商拥有的工具（如远程 Python 沙箱）仍然是单独的工具。请参阅 [代码执行](/zh/tools/code-execution)。

## 术语

**代码模式** 是 OpenClaw 运行时模式，它隐藏正常的模型工具，仅暴露 `exec` 和 `wait`。

**访客运行时** 是评估模型代码的 QuickJS-WASI JavaScript VM。

**主机桥接** 是从访客代码回调到 OpenClaw 的狭窄 JSON 兼容表面。

**目录** 是经过正常工具策略、插件、MCP 和客户端工具解析后，运行范围内有效工具的列表。

**嵌套工具调用** 是通过主机桥接从访客代码发起的工具调用。

**快照** 是序列化的 QuickJS-WASI VM 状态，已保存以便 `wait` 可以继续暂停的代码模式运行。

## 配置

`tools.codeMode.enabled` 是激活开关。设置其他代码模式字段不会启用该功能。

支持的字段：

- `enabled`：布尔值。默认为 `false`。仅在 `true` 时启用代码模式。
- `runtime`：`"quickjs-wasi"`。唯一支持的运行时。
- `mode`：`"only"`。暴露 `exec` 和 `wait`，隐藏常规模型工具。
- `languages`：`"javascript"` 和 `"typescript"` 的数组。默认包含两者。
- `timeoutMs`：单次 `exec` 或 `wait` 的实时上限。默认 `10000`。运行时限制：`100` 到 `60000`。
- `memoryLimitBytes`：QuickJS 堆上限。默认 `67108864`。运行时限制：`1048576` 到 `1073741824`。
- `maxOutputBytes`：返回文本、JSON 和日志的上限。默认 `65536`。运行时限制：`1024` 到 `10485760`。
- `maxSnapshotBytes`：序列化 VM 快照的上限。默认 `10485760`。运行时限制：`1024` 到 `268435456`。
- `maxPendingToolCalls`：并发嵌套工具调用的上限。默认 `16`。运行时限制：`1` 到 `128`。
- `snapshotTtlSeconds`：挂起的 VM 可以恢复的时长。默认 `900`。运行时限制：`1` 到 `86400`。
- `searchDefaultLimit`：默认隐藏目录搜索结果计数。默认 `8`。运行时将其限制为 `maxSearchLimit`。
- `maxSearchLimit`：最大隐藏目录搜索结果计数。默认 `50`。运行时限制：`1` 到 `50`。

如果启用了代码模式但 QuickJS-WASI 无法加载，OpenClaw 将在此次运行中以故障关闭（fail closed）方式失败。它不会静默暴露普通工具作为后备。

## 激活

代码模式在确定有效的工具策略之后、组装最终的模型请求之前进行评估。

激活顺序：

1. 解析代理、模型、提供商、沙箱、渠道、发送者和运行策略。
2. 构建有效的 OpenClaw 工具列表。
3. 添加符合条件的插件、MCP 和客户端工具。
4. 应用允许和拒绝策略。
5. 如果 `tools.codeMode.enabled` 为 false，则继续正常的工具暴露流程。
6. 如果已启用且工具在运行中处于活动状态，则将有效工具注册到代码模式目录中。
7. 从模型可见的工具列表中移除所有普通工具。
8. 添加代码模式 `exec` 和 `wait`。

故意没有工具的运行，例如原始模型调用、`disableTools` 或空的允许列表，即使配置包含 `tools.codeMode.enabled: true`，也不会激活代码模式表面。

代码模式目录是运行范围的。它绝不能泄露来自其他代理、会话、发送者或运行的工具。

## 模型可见工具

当代码模式处于活动状态时，模型只能看到这些顶层工具：

- `exec`
- `wait`

所有其他已启用的工具都会从模型面向的工具列表中隐藏，并注册在代码模式目录中。

模型应使用 `exec` 进行工具编排、数据连接、循环、并行嵌套调用和结构化转换。仅当 `exec` 返回可恢复的 `waiting` 结果时，模型才应使用 `wait`。

## `exec`

`exec` 启动一个代码模式单元格并返回一个结果。输入代码是由模型生成的，必须被视为具有敌意。

输入：

```typescript
type CodeModeExecInput = {
  code?: string;
  command?: string;
  language?: "javascript" | "typescript";
};
```

输入规则：

- `code` 或 `command` 中必须有一个非空。
- `code` 是记录在案的模型面向字段。
- `command` 被接受为 hook 策略和受信任重写的 exec 兼容别名；当两者同时存在时，其值必须匹配。
- 外部代码模式 `exec` hook 事件包含 `toolKind: "code_mode_exec"`，并且当输入语言已知时包含 `toolInputKind: "javascript" | "typescript"`，因此策略可以区分代码模式单元格与共享相同工具名称的 shell 风格 `exec` 调用。
- `language` 默认为 `"javascript"`。
- 如果 `language` 为 `"typescript"`OpenClaw，OpenClaw 会在求值前进行转译。
- `exec` 在 v1 中拒绝 `import`、`require`、动态导入和模块加载器模式。
- `exec` 不会递归地公开正常的 shell `exec` 实现。

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

当 QuickJS VM 以可恢复状态挂起时，`exec` 返回 `waiting`。该结果包含一个用于 `wait` 的 `runId`。

仅当来宾 VM 没有挂起工作且最终值在 OpenClaw 的输出适配器运行后与 JSON 兼容时，`exec` 才返回 `completed`OpenClaw。

## `wait`

`wait` 继续一个已挂起的代码模式 VM。

输入：

```typescript
type CodeModeWaitInput = {
  runId: string;
};
```

输出是与 `exec` 返回的相同的 `CodeModeResult` 联合类型。

`wait`OpenClaw 的存在是因为嵌套的 OpenClaw 工具可能会很慢、具有交互性、需要审批通过或流式传输部分更新。当主机等待外部工作时，模型不需要保持一个长 `exec` 调用处于打开状态。

QuickJS-WASI 快照和恢复是 v1 的恢复机制：

1. `exec` 评估代码直到完成、失败或挂起。
2. 挂起时，OpenClaw 会对 QuickJS VM 进行快照并记录待处理的主机工作。
3. 当待处理的工作完成后，`wait` 会恢复 VM 快照。
4. OpenClaw 通过稳定名称重新注册主机回调。
5. OpenClaw 将嵌套的工具结果传递到恢复后的 VM 中。
6. OpenClaw 排空 QuickJS 待处理的任务。
7. `wait` 返回 `completed`、`failed` 或另一个 `waiting` 结果。

快照是运行时状态，而非用户产物。它们受到大小限制，有过期时间，并且其范围限于创建它们的运行和会话。

`wait` 在以下情况下失败：

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

Guest runtime 不得直接暴露主机对象。输入和输出作为具有显式大小限制的 JSON 兼容值跨过桥接。

## Output API

`text(value)` 将人类可读的输出追加到 `output` 数组中。

`json(value)` 在进行 JSON 兼容序列化后追加结构化输出项。

Guest 代码的最终返回值在 `completed` 结果中变为 `value`。

输出项：

```typescript
type CodeModeOutput = { type: "text"; text: string } | { type: "json"; value: unknown };
```

输出规则：

- 输出顺序与 guest 调用相匹配
- 输出受 `maxOutputBytes` 限制
- 不可序列化的值将被转换为纯字符串或错误
- v1 不支持二进制值
- 图像和文件通过普通的 OpenClaw 工具传输，而不通过代码模式桥接

## 工具目录

隐藏目录包含经过有效策略过滤后的工具：

1. OpenClaw 核心工具。
2. 捆绑的插件工具。
3. 外部插件工具。
4. MCP 工具。
5. 当前运行提供的客户端工具。

目录 ID 在单次运行中是稳定的，并且在等效工具集之间尽可能具有确定性。

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

目录中省略了代码模式控制工具：

- `exec`
- `wait`
- `tool_search_code`
- `tool_search`
- `tool_describe`
- `tool_call`

这可以防止递归，并保持面向模型的契约范围狭窄。

## 工具搜索交互

对于代码模式处于活动状态的运行，代码模式取代了 PI 工具搜索模型界面。

当 `tools.codeMode.enabled` 为 true 且代码模式激活时：

- OpenClaw 不会将 OpenClaw`tool_search_code`、`tool_search`、`tool_describe` 或 `tool_call` 作为模型可见的工具暴露。
- 相同的目录概念移入了客机运行时内部。
- 客机运行时接收紧凑的 `ALL_TOOLS` 元数据以及搜索、描述和调用辅助程序。
- 嵌套调用通过工具搜索所使用的同一 OpenClaw 执行器路径进行调度。

现有的 [工具搜索](/zh/tools/tool-searchOpenClaw) 页面描述了 PI 紧凑目录桥。代码模式是适用于可以使用 `exec` 和 `wait` 的运行的通用 OpenClaw 替代方案。

## 工具名称与冲突

模型可见的 `exec`OpenClaw 工具是代码模式工具。如果启用了常规的 OpenClaw shell `exec` 工具，它将对模型隐藏，并像其他任何工具一样被编入目录。

在客机运行时内部：

- 如果策略允许，`tools.call("openclaw:core:exec", input)` 可以调用 shell exec 工具。
- 仅当 shell exec 目录条目具有明确的安全名称时，才会安装 `tools.exec(...)`。
- 代码模式 `exec` 工具永远无法通过 `tools` 递归获得。

如果两个工具规范化为相同的安全便捷名称，OpenClaw 将省略
便捷函数并要求使用 OpenClaw`tools.call(id, input)`。

## 嵌套工具执行

每次嵌套工具调用都会穿过主机桥接并重新进入 OpenClaw。

嵌套执行保留：

- 活动代理 ID
- 会话 ID 和会话密钥
- 发送者和渠道上下文
- 沙箱策略
- 审批策略
- 插件 `before_tool_call` 钩子
- 中止信号
- 可用的流式更新
- 轨迹和审计事件

嵌套调用作为真实工具调用投射到转录本中，以便支持包
可以显示发生的情况。该投射标识了父代码模式工具调用
和嵌套工具 ID。

允许并行嵌套调用最多 `maxPendingToolCalls` 个。

## 运行时状态

每次代码模式运行都有一个状态机：

- `running`：VM 正在执行或嵌套调用正在进行中。
- `waiting`：VM 快照存在，可以使用 `wait` 恢复。
- `completed`：返回最终值；快照已删除。
- `failed`：返回错误；快照已删除。
- `expired`：快照或挂起状态超过保留期限；无法恢复。
- `aborted`：父运行/会话已取消；快照已删除。

状态按代理运行、会话和工具调用 ID 划定范围。来自
不同运行或会话的 `wait` 调用将失败。

快照存储是受限的：

- 每次运行的最大快照字节数
- 每个进程的最大活动快照数
- 快照 TTL
- 运行结束时清理
- 在不支持持久化的 Gateway(网关) 关闭时清理

## QuickJS-WASI 运行时

OpenClaw 将 OpenClaw`quickjs-wasi` 作为所属包中的直接依赖加载。该
运行时不依赖于为代理、PAC 或其他
不相关依赖安装的传递副本。

运行时职责：

- 编译或加载 QuickJS-WASI WebAssembly 模块
- 为每次代码模式运行或恢复创建一个隔离的 VM
- 按稳定名称注册主机回调
- 设置内存和中断限制
- 评估 JavaScript
- 排空待处理的任务
- 对挂起的 VM 状态进行快照
- 恢复 `wait` 的快照
- 在终端状态后释放 VM 句柄和快照

运行时在 Worker 中于 OpenClaw 的主事件循环之外执行。来宾无限循环不得无限期阻塞 Gateway(网关) 进程。

## TypeScript

TypeScript 支持仅作为源代码转换：

- 接受的输入：一个 TypeScript 代码字符串
- 输出：由 QuickJS-WASI 求值的 JavaScript 字符串
- 无类型检查
- 无模块解析
- v1 中没有 `import` 或 `require`
- 诊断信息作为 `failed` 结果返回

TypeScript 编译器仅为 TypeScript 单元惰性加载。普通 JavaScript 单元和禁用的代码模式不会加载编译器。

在可行的情况下，转换应保留有用的行号。

## 安全边界

模型代码是恶意的。运行时采用纵深防御：

- 在主事件循环之外运行 QuickJS-WASI
- 将 `quickjs-wasi` 作为直接依赖项加载，而不是通过 Codex 或传递包加载
- 来宾环境中没有文件系统、网络、子进程、模块导入、环境变量或宿主全局对象
- 使用 QuickJS 内存和中断限制
- 强制执行父进程挂钟超时
- 强制执行输出、快照、日志和待处理调用上限
- 通过窄 JSON 适配器序列化宿主桥接值
- 将宿主错误转换为普通来宾错误，绝不转换为宿主领域对象
- 在超时、中止、会话结束或过期时丢弃快照
- 拒绝递归访问 `exec`、`wait` 和工具搜索控制工具
- 防止便捷名称冲突遮蔽目录辅助程序

沙箱只是一个安全层。对于高风险部署，操作员仍然需要操作系统级别的加固。

## 错误代码

```typescript
type CodeModeErrorCode = "runtime_unavailable" | "invalid_config" | "invalid_input" | "unsupported_language" | "typescript_transform_failed" | "module_access_denied" | "timeout" | "memory_limit_exceeded" | "output_limit_exceeded" | "snapshot_limit_exceeded" | "snapshot_expired" | "snapshot_restore_failed" | "too_many_pending_tool_calls" | "nested_tool_failed" | "aborted" | "internal_error";
```

返回给来宾的错误是纯数据。宿主 `Error` 实例、堆栈对象、原型和宿主函数不会进入 QuickJS。

## 遥测

代码模式报告：

- 发送到模型的可见工具名称
- 隐藏目录大小和来源细分
- `exec` 和 `wait` 计数
- 嵌套搜索、描述和调用计数
- 调用的嵌套工具 ID
- 超时、内存、快照和输出上限失败
- 快照生命周期事件

遥测数据不得包含机密、原始环境值或除现有 OpenClaw 轨迹策略之外的未编辑工具输入。

## 调试

当代码模式行为与普通工具运行不同时，使用针对性的模型传输日志记录：

```bash
OPENCLAW_DEBUG_CODE_MODE=1 \
OPENCLAW_DEBUG_MODEL_TRANSPORT=1 \
OPENCLAW_DEBUG_MODEL_PAYLOAD=tools \
OPENCLAW_DEBUG_SSE=events \
openclaw gateway
```

对于负载形状调试，请使用 `OPENCLAW_DEBUG_MODEL_PAYLOAD=full-redacted`。这会记录模型请求的受限、已编辑 JSON 快照；它应仅在调试时使用，因为提示词和消息文本仍可能出现。

对于流调试，请使用 `OPENCLAW_DEBUG_SSE=peek` 来记录前五个已编辑的 SSE 事件。如果代码模式界面激活后，最终提供商负载未准确包含 `exec` 和 `wait`，代码模式也会以失败封闭（fail closed）。

## 实现布局

实现单元：

- 配置契约：`tools.codeMode`
- 目录构建器：将有效工具转换为紧凑条目和 ID 映射
- 模型界面适配器：用 `exec` 和 `wait` 替换可见工具
- QuickJS-WASI 运行时适配器：加载、求值、快照、恢复、释放
- Worker 监督器：超时、中止、崩溃隔离
- 桥接适配器：JSON 安全的主机回调和结果交付
- TypeScript 转换适配器
- 快照存储：TTL、大小上限、运行/会话范围
- 用于嵌套工具调用的轨迹投影
- 遥测计数器和诊断

该实现重用了工具搜索中的目录和执行器概念，但不使用 `node:vm` 子进程作为沙箱。

## 验证清单

代码模式覆盖范围应证明：

- 禁用的配置使现有工具暴露保持不变
- 没有 `enabled: true` 的对象配置使代码模式保持禁用
- 当工具针对运行处于活动状态时，启用的配置仅向模型暴露 `exec` 和 `wait`
- 原始无工具运行、`disableTools` 和空允许列表不会触发代码模式负载强制
- 所有有效工具都出现在 `ALL_TOOLS` 中
- 被拒绝的工具不会出现在 `ALL_TOOLS` 中
- `tools.search`、`tools.describe` 和 `tools.call`OpenClaw 适用于 OpenClaw 工具
- 工具搜索控制工具对模型界面和隐藏目录均不可见
- 嵌套调用保留审批和挂钩行为
- 模型无法看到 shell `exec`，但在允许时可通过目录 ID 调用
- 递归代码模式 `exec` 和 `wait` 无法从访客代码中调用
- TypeScript 输入会被转换和求值，而无需在已禁用或仅限 JavaScript 的路径上加载 TypeScript
- `import`、`require`、文件系统、网络和环境访问均失败
- 无限循环会超时，并且无法阻塞 Gateway(网关)
- 内存上限失败会终止访客虚拟机
- 对已完成和已暂停的调用强制执行输出和快照上限
- `wait` 恢复已暂停的快照并返回最终值
- 已过期、已中止、错误会话和未知的 `runId` 值均失败
- 记录重放和持久化保留代码模式控制调用
- 记录和遥测清晰地显示嵌套工具调用

## 端到端测试计划

更改运行时时，将这些作为集成或端到端测试运行：

1. 使用 Gateway(网关)`tools.codeMode.enabled: false` 启动 Gateway(网关)。
2. 发送包含小型直接工具集的代理轮次。
3. 断言模型可见的工具未更改。
4. 使用 `tools.codeMode.enabled: true` 重启。
5. 发送包含 OpenClaw、插件、MCP 和客户端测试工具的代理轮次。
6. 断言模型可见的工具列表确切为 `exec`、`wait`。
7. 在 `exec` 中，读取 `ALL_TOOLS` 并断言有效的测试工具存在。
8. 在 `exec` 中，调用 `tools.search`、`tools.describe` 和 `tools.call`。
9. 断言被拒绝的工具不存在，且无法通过猜测的 ID 调用。
10. 启动一个嵌套工具调用，该调用在 `exec` 返回 `waiting` 后解析。
11. 调用 `wait` 并断言恢复后的 VM 接收到了工具结果。
12. 断言最终答案包含恢复后产生的输出。
13. 断言超时、中止和快照过期会清理运行时状态。
14. 导出轨迹并断言嵌套调用在父级 code-mode 调用下可见。

对此页面的仅文档更改仍应运行 `pnpm check:docs`。

## 相关

- [工具搜索](/zh/tools/tool-search)
- [Agent 运行时](/zh/concepts/agent-runtimes)
- [Exec 工具](/zh/tools/exec)
- [代码执行](/zh/tools/code-execution)
