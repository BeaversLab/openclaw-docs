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

此页面记录了 OpenClaw 代码模式。它不是 Codex 代码模式。Codex 代码模式是 Codex 编程工具的一部分，拥有自己的项目工作区、运行时、工具和执行语义。Codex 代码模式和 Codex 原生动态工具搜索是稳定的 Codex 工具表面。OpenClaw 代码模式是 OpenClaw 拥有的、用于通用 OpenClaw 运行的实验性工具表面适配器。它使用 OpenClawOpenClawOpenClawOpenClaw`quickjs-wasi`OpenClawOpenClaw，一个隐藏的 OpenClaw 工具目录，以及普通的 OpenClaw 工具执行器。

## 这是什么？

OpenClaw 代码模式允许模型编写一个小的 JavaScript 或 TypeScript 程序，而不是直接从一长串工具列表中进行选择。

当代码模式激活时：

- 模型可见的工具列表确切地只有 `exec` 和 `wait`。
- `exec` 在受约束的 QuickJS-WASI 工作线程中评估模型生成的 JavaScript 或 TypeScript。
- 普通的 OpenClaw 工具对模型提示是隐藏的，并通过 OpenClaw`ALL_TOOLS` 和 `tools` 在客户机程序内部暴露。
- 客户机代码可以搜索隐藏的目录，描述工具，并通过普通代理轮次使用的相同 OpenClaw 执行路径调用工具。
- `wait` 当嵌套工具调用仍处于挂起状态时，恢复暂停的代码模式运行。

重要的区别：代码模式改变了面向模型的编排表面。它不会替换 OpenClaw 工具、插件工具、MCP 工具、身份验证、审批策略、渠道行为或模型选择。

## 为什么这很好？

代码模式使大型工具目录更易于模型使用。

- 更小的提示词表面：提供商接收两个控制工具，而不是几十或几百个完整的工具架构。
- 更好的编排：模型可以在一个代码单元格内使用循环、连接、小型转换、条件逻辑和并行嵌套工具调用。
- 提供商中立：它适用于 OpenClaw、插件、MCP 和客户端工具，而不依赖于提供商原生的代码执行。
- 现有策略仍然有效：嵌套工具调用仍然需要通过 OpenClaw 策略、审批、挂钩、会话上下文和审计路径。
- 明确的故障模式：当明确启用代码模式且运行时不可用时，OpenClaw 将失败关闭，而不是回退到广泛的直接工具暴露。

代码模式对于拥有大量已启用工具目录的代理，或者对于模型在生成答案之前需要反复搜索、组合和调用工具的工作流特别有用。

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

当省略 `tools.codeMode`，`false` 或没有 `enabled: true` 的对象时，代码模式保持关闭状态。

当您需要更严格的限制时，请使用明确的限制：

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

要在调试时确认模型负载的形状，请运行带有针对性日志记录的 Gateway(网关)：

```bash
OPENCLAW_DEBUG_CODE_MODE=1 \
OPENCLAW_DEBUG_MODEL_TRANSPORT=1 \
OPENCLAW_DEBUG_MODEL_PAYLOAD=tools \
openclaw gateway
```

启用代码模式后，记录的面向模型的工具名称应为 `exec` 和 `wait`。如果您需要经编辑的提供商负载，请添加 `OPENCLAW_DEBUG_MODEL_PAYLOAD=full-redacted` 进行短时间的调试会话。

## 技术概览

本页其余部分描述了运行时契约和实现细节。它面向维护者、调试工具暴露的插件作者以及验证高风险部署的操作员。

## 运行时状态

- 运行时：[`quickjs-wasi`](https://github.com/vercel-labs/quickjs-wasi)。
- 默认状态：禁用。
- 稳定性：实验性 OpenClaw 表面；Codex Code mode 是一个独立的稳定 Codex harness 表面。
- 目标表面：通用 OpenClaw 代理运行。
- 安全态势：模型代码具有敌意。
- 面向用户的承诺：启用代码模式绝不会自动回退到广泛的直接工具暴露。

## 范围

代码模式拥有已准备运行的面向模型编排形状。它不拥有模型选择、渠道行为、身份验证、工具策略或工具实现。

范围内：

- 模型可见的 `exec` 和 `wait` 工具定义
- 隐藏工具目录构建
- JavaScript 和 TypeScript 客户执行
- QuickJS-WASI worker 运行时
- 用于目录搜索、模式描述和工具调用的主机回调
- 暂停的客户程序的可恢复状态
- 输出、超时、内存、待处理调用和快照限制
- 用于嵌套工具调用的遥测和轨迹投射

范围外：

- 提供商原生的远程代码执行
- Shell 执行语义
- 更改现有工具授权
- 持久的用户编写脚本
- 客户代码中的包管理器、文件、网络或模块访问
- 直接复用 Codex Code mode 内部组件

提供商拥有的工具（如远程 Python 沙箱）仍然是独立的工具。请参阅 [代码执行](/zh/tools/code-execution)。

## 术语

**Code mode** 是 OpenClaw 运行时模式，它隐藏正常的模型工具，仅暴露 `exec` 和 `wait`。

**Guest runtime** 是评估模型代码的 QuickJS-WASI JavaScript 虚拟机。

**Host bridge** 是客户代码回调 OpenClaw 的狭窄 JSON 兼容表面。

**Catalog** 是在正常的工具策略、插件、MCP 和客户端工具解析之后，运行范围的生效工具列表。

**Nested 工具 call** 是通过主机桥从客户代码发起的工具调用。

**Snapshot** 是保存的序列化 QuickJS-WASI 虚拟机状态，以便 `wait` 可以继续暂停的代码模式运行。

## 配置

`tools.codeMode.enabled` 是激活门控。设置其他代码模式字段不会启用该功能。

支持的字段：

- `enabled`: boolean. 默认 `false`. 仅在 `true` 时启用代码模式。
- `runtime`: `"quickjs-wasi"`. 唯一支持的运行时。
- `mode`: `"only"`. 公开 `exec` 和 `wait`，隐藏普通模型工具。
- `languages`: `"javascript"` 和 `"typescript"` 的数组。默认包含
  两者。
- `timeoutMs`: 单次 `exec` 或 `wait` 的挂钟上限。默认 `10000`.
  运行时限制：`100` 到 `60000`。
- `memoryLimitBytes`: QuickJS 堆上限。默认 `67108864`. 运行时限制：
  `1048576` 到 `1073741824`。
- `maxOutputBytes`: 返回文本、JSON 和日志的上限。默认 `65536`.
  运行时限制：`1024` 到 `10485760`。
- `maxSnapshotBytes`: 序列化 VM 快照的上限。默认 `10485760`.
  运行时限制：`1024` 到 `268435456`。
- `maxPendingToolCalls`: 并发嵌套工具调用的上限。默认 `16`.
  运行时限制：`1` 到 `128`。
- `snapshotTtlSeconds`: 挂起的 VM 可以恢复的时间。默认 `900`.
  运行时限制：`1` 到 `86400`。
- `searchDefaultLimit`: 默认隐藏目录搜索结果计数。默认 `8`.
  运行时将其限制为 `maxSearchLimit`。
- `maxSearchLimit`: 最大隐藏目录搜索结果计数。默认 `50`.
  运行时限制：`1` 到 `50`。

如果启用了代码模式，但 QuickJS-WASI 无法加载，OpenClaw 将在该次运行中安全关闭。它不会以静默方式暴露普通工具作为后备。

## 激活

代码模式在确定有效工具策略之后、组装最终模型请求之前进行评估。

激活顺序：

1. 解析 agent、模型、提供商、sandbox、渠道、sender 和运行策略。
2. 构建有效的 OpenClaw 工具列表。
3. 添加符合条件的插件、MCP 和客户端工具。
4. 应用允许和拒绝策略。
5. 如果 `tools.codeMode.enabled` 为 false，则继续进行正常的工具暴露。
6. 如果已启用且工具在该次运行中处于活动状态，则在代码模式目录中注册有效工具。
7. 从模型可见的工具列表中移除所有普通工具。
8. 添加代码模式 `exec` 和 `wait`。

故意没有工具的运行，例如原始模型调用、`disableTools` 或空的允许列表，即使配置包含 `tools.codeMode.enabled: true`，也不会激活代码模式界面。

代码模式目录是运行范围的。它不得泄露来自另一个 agent、会话、sender 或 run 的工具。

## 模型可见的工具

当代码模式处于活动状态时，模型确切地看到这些顶层工具：

- `exec`
- `wait`

所有其他已启用的工具都将从面向模型的工具列表中隐藏，并注册在代码模式目录中。

模型应使用 `exec` 进行工具编排、数据合并、循环、并行嵌套调用和结构化转换。模型应仅当 `exec` 返回可恢复的 `waiting` 结果时，才使用 `wait`。

## `exec`

`exec` 启动一个代码模式单元格并返回一个结果。输入代码由模型生成，必须被视为潜在恶意。

输入：

```typescript
type CodeModeExecInput = {
  code: string;
  language?: "javascript" | "typescript";
};
```

输入规则：

- `code` 是必需的，且必须非空。
- `language` 默认为 `"javascript"`。
- 如果 `language` 是 `"typescript"`OpenClaw，OpenClaw 会在评估前进行转译。
- `exec` 在 v1 中拒绝 `import`、`require`、动态导入和模块加载器模式。
- `exec` 不会递归地公开普通的 shell `exec` 实现。

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

仅当客户 VM 没有挂起工作且在 OpenClaw 的输出适配器运行后最终值与 JSON 兼容时，`exec` 才返回 `completed`OpenClaw。

## `wait`

`wait` 继续执行已挂起的 code-mode VM。

输入：

```typescript
type CodeModeWaitInput = {
  runId: string;
};
```

输出与 `exec` 返回的 `CodeModeResult` 联合类型相同。

之所以存在 `wait`OpenClaw，是因为嵌套的 OpenClaw 工具可能会很慢、具有交互性、需要审批或流式传输部分更新。当主机等待外部工作时，模型不应保持一个长 `exec` 调用处于打开状态。

QuickJS-WASI 快照和恢复是 v1 的恢复机制：

1. `exec` 评估代码，直到完成、失败或挂起。
2. 挂起时，OpenClaw 会对 QuickJS VM 进行快照并记录待处理的主机工作。
3. 当待处理的工作完成后，`wait` 会恢复 VM 快照。
4. OpenClaw 通过稳定名称重新注册主机回调。
5. OpenClaw 将嵌套工具结果传递到恢复的 VM 中。
6. OpenClaw 排空 QuickJS 待处理的作业。
7. `wait` 返回 `completed`、`failed` 或另一个 `waiting` 结果。

快照是运行时状态，不是用户工件。它们受大小限制、会过期，并且范围限定于创建它们的运行和会话。

`wait` 在以下情况下失败：

- `runId` 未知。
- 快照已过期。
- 父运行或会话已中止。
- 调用者不在同一运行/会话范围内。
- QuickJS-WASI 恢复失败。
- 恢复将超过配置的限制。

## 访客运行时 API

访客运行时公开了一个小型的全局 API：

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

目录辅助函数：

```typescript
type ToolCatalog = {
  search(query: string, options?: { limit?: number }): Promise<ToolCatalogEntry[]>;
  describe(id: string): Promise<ToolCatalogEntryWithSchema>;
  call(id: string, input?: unknown): Promise<unknown>;
  [safeToolName: string]: unknown;
};
```

仅为明确的安全名称安装便捷的工具函数：

```typescript
const files = await tools.search("read local file");
const fileRead = await tools.describe(files[0].id);
const content = await tools.call(fileRead.id, { path: "README.md" });

// If the hidden catalog has an unambiguous `web_search` entry:
const hits = await tools.web_search({ query: "OpenClaw code mode" });
```

访客运行时不得直接公开主机对象。输入和输出作为具有明确大小限制的 JSON 兼容值穿过桥接。

## 输出 API

`text(value)` 将人类可读的输出附加到 `output` 数组。

`json(value)` 在 JSON 兼容序列化后附加一个结构化输出项。

访客代码的最终返回值成为 `completed` 结果中的 `value`。

输出项：

```typescript
type CodeModeOutput = { type: "text"; text: string } | { type: "json"; value: unknown };
```

输出规则：

- 输出顺序与访客调用匹配
- 输出受 `maxOutputBytes` 限制
- 不可序列化的值被转换为纯字符串或错误
- v1 不支持二进制值
- 图像和文件通过普通的 OpenClaw 工具传输，而不是通过代码模式桥接

## 工具目录

隐藏目录包含有效策略过滤后的工具：

1. OpenClaw 核心工具。
2. 捆绑的插件工具。
3. 外部插件工具。
4. MCP 工具。
5. 客户端为当前运行提供的工具。

目录 ID 在一次运行中是稳定的，并且在等效工具集之间尽可能具有确定性。

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

目录省略了代码模式控制工具：

- `exec`
- `wait`
- `tool_search_code`
- `tool_search`
- `tool_describe`
- `tool_call`

这可以防止递归，并保持面向模型的合同狭窄。

## 工具搜索交互

对于代码模式处于活动状态的运行，代码模式取代了 PI 工具搜索模型表面。

当 `tools.codeMode.enabled` 为 true 且代码模式激活时：

- OpenClaw 不会将 OpenClaw`tool_search_code`、`tool_search`、`tool_describe`
  或 `tool_call` 作为模型可见的工具暴露出来。
- 相同的编目思想转移到了访客运行时内部。
- 访客运行时接收精简的 `ALL_TOOLS` 元数据，以及搜索、描述
  和调用助手。
- 嵌套调用通过与工具搜索相同的 OpenClaw 执行器路径进行分派。

现有的 [Tool Search](/zh/tools/tool-searchOpenClaw) 页面描述了 PI 精简
目录桥接。代码模式是能够使用 `exec` 和 `wait` 的运行
的通用 OpenClaw 替代方案。

## 工具名称与冲突

模型可见的 `exec`OpenClaw 工具是代码模式工具。如果启用了正常的 OpenClaw
shell `exec` 工具，它会从模型中隐藏，并像任何
其他工具一样被编目。

在访客运行时内部：

- 如果策略允许，`tools.call("openclaw:core:exec", input)` 可以调用 shell exec 工具。
- 只有当 shell exec 目录条目具有明确的安全名称时，才会安装 `tools.exec(...)`。
- 代码模式 `exec` 工具永远无法通过 `tools` 递归使用。

如果两个工具规范化为相同的安全便捷名称，OpenClaw 将省略
便捷函数，并要求使用 OpenClaw`tools.call(id, input)`。

## 嵌套工具执行

每个嵌套工具调用都会穿过主机桥并重新进入 OpenClaw。

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

嵌套调用作为真实的工具调用投影到转录中，以便支持包
can show what happened. 该投影标识了父代码模式工具调用
和嵌套工具 id。

允许的并行嵌套调用最多为 `maxPendingToolCalls`。

## 运行时状态

每个代码模式运行都有一个状态机：

- `running`：VM 正在执行或嵌套调用正在进行中。
- `waiting`：VM 快照存在，可以使用 `wait` 恢复。
- `completed`：已返回最终值；快照已删除。
- `failed`：已返回错误；快照已删除。
- `expired`：快照或挂起状态超过了保留期限；无法恢复。
- `aborted`：父运行/会话已取消；快照已删除。

状态的作用域包括 agent 运行、会话和工具调用 id。来自不同运行或会话的 `wait` 调用将失败。

快照存储是受限的：

- 每次运行的最大快照字节数
- 每个进程的最大实时快照数
- 快照 TTL
- 运行结束时清理
- 当不支持持久化时，在 Gateway(网关) 关闭时清理

## QuickJS-WASI 运行时

OpenClaw 将 `quickjs-wasi` 作为所属包中的直接依赖加载。运行时不依赖为 proxy、PAC 或其他不相关依赖安装的传递副本。

运行时职责：

- 编译或加载 QuickJS-WASI WebAssembly 模块
- 为每次代码模式运行或恢复创建一个隔离的 VM
- 通过稳定的名称注册主机回调
- 设置内存和中断限制
- 执行 JavaScript
- 排空待处理作业
- 对挂起的 VM 状态进行快照
- 为 `wait` 恢复快照
- 在达到终止状态后释放 VM 句柄和快照

运行时在 worker 中 OpenClaw 的主事件循环之外执行。访客无限循环绝不能无限期阻塞 Gateway(网关) 进程。

## TypeScript

TypeScript 支持仅作为源码转换：

- 接受的输入：一个 TypeScript 代码字符串
- 输出：由 QuickJS-WASI 执行的 JavaScript 字符串
- 无类型检查
- 无模块解析
- v1 中没有 `import` 或 `require`
- 诊断信息作为 `failed` 结果返回

TypeScript 编译器仅为 TypeScript 单元延迟加载。普通的 JavaScript 单元和禁用的代码模式不会加载编译器。

转换应在可行的情况下保留有用的行号。

## 安全边界

模型代码具有潜在敌意。运行时采用纵深防御策略：

- 在主事件循环之外运行 QuickJS-WASI
- 将 `quickjs-wasi` 作为直接依赖加载，而不是通过 Codex 或传递
  包
- 访客中没有文件系统、网络、子进程、模块导入、环境变量或
  主机全局对象
- 使用 QuickJS 内存和中断限制
- 强制执行父进程的挂钟超时
- 强制执行输出、快照、日志和待处理调用的上限
- 通过狭窄的 JSON 适配器序列化主机桥接值
- 将主机错误转换为简单的访客错误，绝不包含主机领域对象
- 在超时、中止、会话结束或过期时丢弃快照
- 拒绝递归访问 `exec`、`wait` 和工具搜索控制工具
- 防止便捷名称冲突遮蔽目录辅助工具

沙箱只是一个安全层。对于高风险部署，操作员仍然需要操作系统级别的加固。

## 错误代码

```typescript
type CodeModeErrorCode = "runtime_unavailable" | "invalid_config" | "invalid_input" | "unsupported_language" | "typescript_transform_failed" | "module_access_denied" | "timeout" | "memory_limit_exceeded" | "output_limit_exceeded" | "snapshot_limit_exceeded" | "snapshot_expired" | "snapshot_restore_failed" | "too_many_pending_tool_calls" | "nested_tool_failed" | "aborted" | "internal_error";
```

返回给访客的错误是纯数据。主机 `Error` 实例、堆栈
对象、原型和主机函数不会进入 QuickJS。

## 遥测

代码模式报告：

- 发送给模型的可见工具名称
- 隐藏目录的大小和来源细分
- `exec` 和 `wait` 计数
- 嵌套搜索、描述和调用计数
- 调用的嵌套工具 ID
- 超时、内存、快照和输出上限失败
- 快照生命周期事件

遥测不得包含机密、原始环境值或未编辑的工具输入，除非超出现有的 OpenClaw 轨迹策略范围。

## 调试

当代码模式的行为与普通工具运行不同时，使用针对性的模型传输日志记录：

```bash
OPENCLAW_DEBUG_CODE_MODE=1 \
OPENCLAW_DEBUG_MODEL_TRANSPORT=1 \
OPENCLAW_DEBUG_MODEL_PAYLOAD=tools \
OPENCLAW_DEBUG_SSE=events \
openclaw gateway
```

对于负载形状调试，请使用 `OPENCLAW_DEBUG_MODEL_PAYLOAD=full-redacted`。
这会记录模型请求的限制性和已编辑的 JSON 快照；仅应在调试时使用，因为提示词和消息文本仍可能出现。

对于流调试，请使用 `OPENCLAW_DEBUG_SSE=peek` 来记录前五个
已编辑的 SSE 事件。如果在代码模式界面激活后，最终提供商负载
未准确包含 `exec` 和 `wait`，代码模式也将无法通过关闭检查。

## 实现布局

实现单元：

- 配置契约：`tools.codeMode`
- 目录构建器：有效工具、压缩条目和 ID 映射
- 模型表面适配器：用 `exec` 和 `wait` 替换可见工具
- QuickJS-WASI 运行时适配器：加载、求值、快照、恢复、销毁
- 工作进程监视器：超时、中止、崩溃隔离
- 桥接适配器：JSON 安全的主机回调和结果传递
- TypeScript 转换适配器
- 快照存储：TTL、大小上限、运行/会话作用域
- 嵌套工具调用的轨迹投射
- 遥测计数器和诊断

该实现复用了工具搜索中的目录和执行器概念，但不使用 `node:vm` 子进程作为沙箱。

## 验证清单

代码模式的覆盖范围应证明：

- 禁用配置使现有的工具暴露保持不变
- 不包含 `enabled: true` 的对象配置使代码模式保持禁用
- 启用配置在工具对运行激活时，仅向模型暴露 `exec` 和 `wait`
- 原始的无工具运行、`disableTools` 和空允许列表不会触发代码模式负载强制执行
- 所有有效工具都出现在 `ALL_TOOLS` 中
- 被拒绝的工具不会出现在 `ALL_TOOLS` 中
- `tools.search`、`tools.describe` 和 `tools.call` 适用于 OpenClaw 工具
- 工具搜索控制工具对模型表面和隐藏目录均不可见
- 嵌套调用保留审批和 Hook 行为
- Shell `exec` 对模型隐藏，但在允许时可通过目录 ID 调用
- 递归代码模式的 `exec` 和 `wait` 无法从访客代码调用
- TypeScript 输入被转换并求值，而在禁用或仅 JavaScript 路径上不加载 TypeScript
- `import`、`require`、文件系统、网络和环境访问失败
- 无限循环会超时，并且无法阻塞 Gateway(网关)
- 内存上限失败会终止访客虚拟机
- 对已完成和已暂停的调用强制执行输出和快照上限
- `wait` 恢复暂停的快照并返回最终值
- 已过期、已中止、错误会话和未知的 `runId` 值将失败
- 转录重放和持久化保留代码模式控制调用
- 转录和遥测清晰显示嵌套工具调用

## E2E 测试计划

在更改运行时时，将这些作为集成或端到端测试运行：

1. 使用 Gateway(网关) 和 `tools.codeMode.enabled: false` 启动网关。
2. 发送包含小型直接工具集的代理轮次。
3. 断言模型可见工具未更改。
4. 使用 `tools.codeMode.enabled: true` 重启。
5. 发送包含 OpenClaw、插件、MCP 和客户端测试工具的代理轮次。
6. 断言模型可见工具列表确切为 `exec`、`wait`。
7. 在 `exec` 中，读取 `ALL_TOOLS` 并断言有效的测试工具存在。
8. 在 `exec` 中，调用 `tools.search`、`tools.describe` 和 `tools.call`。
9. 断言被拒绝的工具不存在，且无法通过猜测的 ID 调用。
10. 启动一个嵌套工具调用，该调用在 `exec` 返回 `waiting` 后解析。
11. 调用 `wait` 并断言恢复的 VM 接收到工具结果。
12. 断言最终答案包含恢复后产生的输出。
13. 断言超时、中止和快照过期会清理运行时状态。
14. 导出轨迹并断言嵌套调用在父代码模式下调用下可见。

对此页面仅文档的更改仍应运行 `pnpm check:docs`。

## 相关

- [工具搜索](/zh/tools/tool-search)
- [Agent 运行时](/zh/concepts/agent-runtimes)
- [Exec 工具](/zh/tools/exec)
- [代码执行](/zh/tools/code-execution)
