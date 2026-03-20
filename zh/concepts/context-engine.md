---
summary: "Context engine: pluggable context assembly, compaction, and subagent lifecycle"
read_when:
  - You want to understand how OpenClaw assembles 模型 context
  - You are switching between the legacy engine and a plugin engine
  - You are building a context engine plugin
title: "Context Engine"
---

# Context Engine

A **context engine** controls how OpenClaw builds 模型 context for each run.
It decides which messages to include, how to summarize older history, and how
to manage context across subagent boundaries.

OpenClaw ships with a built-in `legacy` engine. Plugins can register
alternative engines that replace the active context-engine lifecycle.

## 快速开始

Check which engine is active:

```bash
openclaw doctor
# or inspect config directly:
cat ~/.openclaw/openclaw.json | jq '.plugins.slots.contextEngine'
```

### Installing a context engine plugin

Context engine plugins are installed like any other OpenClaw plugin. Install
first, then select the engine in the slot:

```bash
# Install from npm
openclaw plugins install @martian-engineering/lossless-claw

# Or install from a local path (for development)
openclaw plugins install -l ./my-context-engine
```

Then enable the plugin and select it as the active engine in your config:

```json5
// openclaw.json
{
  plugins: {
    slots: {
      contextEngine: "lossless-claw", // must match the plugin's registered engine id
    },
    entries: {
      "lossless-claw": {
        enabled: true,
        // Plugin-specific config goes here (see the plugin's docs)
      },
    },
  },
}
```

Restart the gateway after installing and configuring.

To switch back to the built-in engine, set `contextEngine` to `"legacy"` (or
remove the key entirely — `"legacy"` is the default).

## How it works

Every time OpenClaw runs a 模型 prompt, the context engine participates at
four lifecycle points:

1. **Ingest** — called when a new message is added to the 会话. The engine
   can store or index the message in its own data store.
2. **Assemble** — called before each 模型 run. The engine returns an ordered
   set of messages (and an optional `systemPromptAddition`) that fit within
   the token budget.
3. **Compact** — called when the context window is full, or when the user runs
   `/compact`. The engine summarizes older history to free space.
4. **After turn** — called after a run completes. The engine can persist state,
   trigger background compaction, or update indexes.

### Subagent lifecycle (optional)

OpenClaw currently calls one subagent lifecycle hook:

- **onSubagentEnded** — clean up when a subagent 会话 completes or is swept.

The `prepareSubagentSpawn` hook is part of the interface for future use, but
the runtime does not invoke it yet.

### System prompt addition

`assemble` 方法可以返回 `systemPromptAddition` 字符串。OpenClaw
将其前置到本次运行的系统提示词。这使得引擎能够注入
动态召回指导、检索指令或上下文感知提示，而无需静态工作区文件。

## 旧版引擎

内置的 `legacy` 引擎保留了 OpenClaw 的原始行为：

- **Ingest（摄取）**：no-op（会话管理器直接处理消息持久化）。
- **Assemble（组装）**：pass-through（运行时现有的 sanitize → validate → limit 管道
负责处理上下文组装）。
- **Compact（压缩）**：委托给内置的摘要压缩，该功能会创建
旧消息的单个摘要并保留最近的消息不变。
- **After turn（回合后）**：no-op。

旧版引擎不注册工具也不提供 `systemPromptAddition`。

当未设置 `plugins.slots.contextEngine`（或将其设置为 `"legacy"`）时，
将自动使用此引擎。

## 插件引擎

插件可以使用插件 API 注册上下文引擎：

```ts
export default function register(api) {
  api.registerContextEngine("my-engine", () => ({
    info: {
      id: "my-engine",
      name: "My Context Engine",
      ownsCompaction: true,
    },

    async ingest({ sessionId, message, isHeartbeat }) {
      // Store the message in your data store
      return { ingested: true };
    },

    async assemble({ sessionId, messages, tokenBudget }) {
      // Return messages that fit the budget
      return {
        messages: buildContext(messages, tokenBudget),
        estimatedTokens: countTokens(messages),
        systemPromptAddition: "Use lcm_grep to search history...",
      };
    },

    async compact({ sessionId, force }) {
      // Summarize older context
      return { ok: true, compacted: true };
    },
  }));
}
```

然后在配置中启用它：

```json5
{
  plugins: {
    slots: {
      contextEngine: "my-engine",
    },
    entries: {
      "my-engine": {
        enabled: true,
      },
    },
  },
}
```

### ContextEngine 接口

必需成员：

| 成员             | 种类     | 用途                                                  |
| ------------------ | -------- | -------------------------------------------------------- |
| `info`             | 属性 | 引擎 ID、名称、版本以及是否拥有压缩 |
| `ingest(params)`   | 方法   | 存储单条消息                                   |
| `assemble(params)` | 方法   | 为模型运行构建上下文（返回 `AssembleResult`） |
| `compact(params)`  | 方法   | 摘要/减少上下文                                 |

`assemble` 返回一个 `AssembleResult`，包含：

- `messages` — 要发送给模型的有序消息。
- `estimatedTokens`（必需，`number`）— 引擎对组装后
上下文中总 token 数的估计。OpenClaw 将其用于压缩阈值
决策和诊断报告。
- `systemPromptAddition`（可选，`string`）— 前置到系统提示词。

可选成员：

| 成员                         | 种类   | 用途                                                                                                         |
| ------------------------------ | ------ | --------------------------------------------------------------------------------------------------------------- |
| `bootstrap(params)`            | 方法 | 初始化会话的引擎状态。在引擎首次看到会话时调用一次（例如，导入历史记录）。 |
| `ingestBatch(params)`          | 方法 | 以批次方式摄取已完成的轮次。在运行完成后调用，一次性传入该轮次的所有消息。     |
| `afterTurn(params)`            | 方法 | 运行后的生命周期工作（持久化状态，触发后台压缩）。                                         |
| `prepareSubagentSpawn(params)` | 方法 | 为子会话设置共享状态。                                                                        |
| `onSubagentEnded(params)`      | 方法 | 在子代理结束后进行清理。                                                                                 |
| `dispose()`                    | 方法 | 释放资源。在网关关闭或插件重新加载期间调用——而非针对每个会话调用。                           |

### ownsCompaction

`ownsCompaction` 控制 Pi 内置的尝试内自动压缩在运行期间是否保持启用：

- `true` — 引擎拥有压缩行为。OpenClaw 将针对该运行禁用 Pi 的内置自动压缩，并且引擎的 `compact()` 实现负责 `/compact`、溢出恢复压缩，以及其想要在 `afterTurn()` 中执行的任何主动压缩。
- `false` 或未设置 — Pi 的内置自动压缩仍可能在提示执行期间运行，但活动引擎的 `compact()` 方法仍会被调用以进行 `/compact` 和溢出恢复。

`ownsCompaction: false` 并 **不** 意味着 OpenClaw 会自动回退到传统引擎的压缩路径。

这意味着存在两种有效的插件模式：

- **拥有模式** — 实现您自己的压缩算法并设置 `ownsCompaction: true`。
- **委托模式** — 设置 `ownsCompaction: false` 并让 `compact()` 调用 `delegateCompactionToRuntime(...)`（来自 `openclaw/plugin-sdk/core`），以使用 OpenClaw 的内置压缩行为。

对于活动的非拥有引擎而言，空操作的 `compact()` 是不安全的，因为它会禁用该引擎插槽的正常 `/compact` 和溢出恢复压缩路径。

## 配置参考

```json5
{
  plugins: {
    slots: {
      // Select the active context engine. Default: "legacy".
      // Set to a plugin id to use a plugin engine.
      contextEngine: "legacy",
    },
  },
}
```

该插槽在运行时是独占的 — 对于给定的运行或压缩操作，只会解析一个已注册的上下文引擎。其他已启用的 `kind: "context-engine"` 插件仍然可以加载并运行其注册代码；`plugins.slots.contextEngine` 仅选择当 OpenClaw 需要上下文引擎时解析哪个已注册的引擎 ID。

## 与压缩和内存的关系

- **压缩** 是上下文引擎的职责之一。传统引擎将工作委托给 OpenClaw 内置的摘要功能。插件引擎可以实现任何压缩策略（DAG 摘要、向量检索等）。
- **内存插件** (`plugins.slots.memory`) 与上下文引擎是分开的。内存插件提供搜索/检索功能；上下文引擎控制模型看到的内容。它们可以协同工作 — 上下文引擎可能会在组装过程中使用内存插件的数据。
- **会话修剪**（在内存中修剪旧工具结果）仍会运行，无论激活了哪个上下文引擎。

## 提示

- 使用 `openclaw doctor` 来验证您的引擎是否正确加载。
- 如果切换引擎，现有会话将继续使用其当前历史记录。新引擎将接管未来的运行。
- 引擎错误会被记录并显示在诊断信息中。如果插件引擎注册失败，或者无法解析所选的引擎 ID，OpenClaw 不会自动回退；在您修复插件或 `plugins.slots.contextEngine` 切换回 `"legacy"` 之前，运行将失败。
- 对于开发，请使用 `openclaw plugins install -l ./my-engine` 来链接本地插件目录，而无需复制。

另请参阅：[压缩](/zh/concepts/compaction)、[上下文](/zh/concepts/context)、[插件](/zh/tools/plugin)、[插件清单](/zh/plugins/manifest)。

import en from "/components/footer/en.mdx";

<en />
