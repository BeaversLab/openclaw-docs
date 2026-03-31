---
summary: "上下文引擎：可插拔的上下文组装、压缩和子代理生命周期"
read_when:
  - You want to understand how OpenClaw assembles model context
  - You are switching between the legacy engine and a plugin engine
  - You are building a context engine plugin
title: "上下文引擎"
---

# 上下文引擎

**上下文引擎** 控制 OpenClaw 如何为每次运行构建模型上下文。
它决定包含哪些消息，如何汇总较早的历史记录，以及如何
跨子代理边界管理上下文。

OpenClaw 内置了一个 `legacy` 引擎。插件可以注册
替代引擎，以替换活动的上下文引擎生命周期。

## 快速开始

检查哪个引擎处于活动状态：

```bash
openclaw doctor
# or inspect config directly:
cat ~/.openclaw/openclaw.json | jq '.plugins.slots.contextEngine'
```

### 安装上下文引擎插件

上下文引擎插件的安装方式与任何其他 OpenClaw 插件相同。首先
安装，然后在插槽中选择引擎：

```bash
# Install from npm
openclaw plugins install @martian-engineering/lossless-claw

# Or install from a local path (for development)
openclaw plugins install -l ./my-context-engine
```

然后在配置中启用该插件并将其选择为活动引擎：

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

安装和配置后重启网关。

要切换回内置引擎，请将 `contextEngine` 设置为 `"legacy"`（或者
完全删除该键 — `"legacy"` 是默认值）。

## 工作原理

每次 OpenClaw 运行模型提示时，上下文引擎都会在
四个生命周期点参与：

1. **摄取** — 当新消息添加到会话时调用。引擎
   可以在其自己的数据存储中存储或索引消息。
2. **组装** — 在每次模型运行之前调用。引擎返回一组
   消息（以及可选的 `systemPromptAddition`），这些消息适合
   在令牌预算内。
3. **压缩** — 当上下文窗口已满或用户运行
   `/compact` 时调用。引擎会汇总较旧的历史记录以释放空间。
4. **轮次后** — 在运行完成后调用。引擎可以持久化状态，
   触发后台压缩或更新索引。

### 子代理生命周期（可选）

OpenClaw 目前调用一个子代理生命周期挂钩：

- **onSubagentEnded** — 当子代理会话完成或被清除时进行清理。

`prepareSubagentSpawn` 挂钩是接口的一部分，供将来使用，但
运行时尚未调用它。

### 系统提示添加

`assemble` 方法可以返回一个 `systemPromptAddition` 字符串。OpenClaw
会将其预置到本次运行的系统提示词之前。这使得引擎可以注入动态
的召回指导、检索指令或上下文感知提示，而无需静态工作区文件。

## 传统引擎

内置的 `legacy` 引擎保留了 OpenClaw 的原始行为：

- **摄取 (Ingest)**：无操作（会话管理器直接处理消息持久化）。
- **组装 (Assemble)**：透传（运行时中现有的清理 → 验证 → 限制管道
  负责处理上下文组装）。
- **压缩 (Compact)**：委托给内置的摘要压缩，它会创建
  旧消息的单个摘要并保持最近的消息不变。
- **轮次后 (After turn)**：无操作。

传统引擎不注册工具，也不提供 `systemPromptAddition`。

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

| 成员               | 类型 | 用途                                          |
| ------------------ | ---- | --------------------------------------------- |
| `info`             | 属性 | 引擎 ID、名称、版本，以及它是否拥有压缩权     |
| `ingest(params)`   | 方法 | 存储单条消息                                  |
| `assemble(params)` | 方法 | 为模型运行构建上下文（返回 `AssembleResult`） |
| `compact(params)`  | 方法 | 总结/减少上下文                               |

`assemble` 返回一个 `AssembleResult`，其中包含：

- `messages` — 要发送给模型的有序消息。
- `estimatedTokens`（必需，`number`）— 引擎对组装后
  上下文中总 token 数的估计。OpenClaw 将其用于压缩阈值
  决策和诊断报告。
- `systemPromptAddition`（可选，`string`）— 预置到系统提示词之前。

可选成员：

| 成员                           | 类型 | 用途                                                                                 |
| ------------------------------ | ---- | ------------------------------------------------------------------------------------ |
| `bootstrap(params)`            | 方法 | 为会话初始化引擎状态。在引擎首次看到会话时调用一次（例如，导入历史记录）。           |
| `ingestBatch(params)`          | 方法 | 将完成的回合作为一个批次进行摄取。在一次运行完成后调用，一次性接收该回合的所有消息。 |
| `afterTurn(params)`            | 方法 | 运行后生命周期工作（持久化状态、触发后台压缩）。                                     |
| `prepareSubagentSpawn(params)` | 方法 | 为子会话设置共享状态。                                                               |
| `onSubagentEnded(params)`      | 方法 | 在子代理结束后进行清理。                                                             |
| `dispose()`                    | 方法 | 释放资源。在网关关闭或插件重新加载期间调用——而非每次会话。                           |

### ownsCompaction

`ownsCompaction` 控制是否在运行期间启用 Pi 内置的尝试内自动压缩：

- `true` — 引擎拥有压缩行为。OpenClaw 将禁用该运行的 Pi 内置自动压缩，引擎的 `compact()` 实现负责 `/compact`、溢出恢复压缩以及它想要在 `afterTurn()` 中执行的任何主动压缩。
- `false` 或未设置 — Pi 内置的自动压缩仍可能在提示执行期间运行，但仍会调用活动引擎的 `compact()` 方法进行 `/compact` 和溢出恢复。

`ownsCompaction: false` 并**不**意味着 OpenClaw 会自动回退到旧版引擎的压缩路径。

这意味着有两种有效的插件模式：

- **拥有模式** — 实现您自己的压缩算法并设置
  `ownsCompaction: true`。
- **委托模式** — 设置 `ownsCompaction: false` 并让 `compact()` 调用
  `delegateCompactionToRuntime(...)` 中的 `openclaw/plugin-sdk/core` 来使用
  OpenClaw 的内置压缩行为。

对于活动的非拥有引擎，空操作的 `compact()` 是不安全的，因为它会禁用该引擎槽位的常规 `/compact` 和溢出恢复压缩路径。

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

该插槽在运行时是独占的 —— 对于给定的运行或压缩操作，只能解析一个已注册的上下文引擎。其他已启用的 `kind: "context-engine"` 插件仍可以加载并运行其注册代码；`plugins.slots.contextEngine` 仅选择 OpenClaw 在需要上下文引擎时解析哪个已注册的引擎 ID。

## 与压缩和内存的关系

- **压缩** 是上下文引擎的一项职责。旧版引擎 委托给 OpenClaw 的内置摘要。插件引擎可以实现任何压缩策略（DAG 摘要、向量检索等）。
- **内存插件** (`plugins.slots.memory`) 与上下文引擎是分开的。内存插件提供搜索/检索；上下文引擎控制模型看到的内容。它们可以协同工作 —— 上下文引擎可能会在组装期间使用内存插件数据。
- **会话修剪** (在内存中修剪旧的工具结果) 仍会运行，而无论当前处于活动状态的是哪个上下文引擎。

## 提示

- 使用 `openclaw doctor` 来验证您的引擎是否正确加载。
- 如果切换引擎，现有会话将继续使用其当前历史记录。新引擎将接管未来的运行。
- 引擎错误会被记录并在诊断中显示。如果插件引擎未能注册，或者所选的引擎 ID 无法解析，OpenClaw 不会自动回退；运行将失败，直到您修复插件或将 `plugins.slots.contextEngine` 切换回 `"legacy"`。
- 对于开发，请使用 `openclaw plugins install -l ./my-engine` 来链接本地插件目录，而无需复制。

另请参阅：[Compaction](/en/concepts/compaction)、[Context](/en/concepts/context)、
[Plugins](/en/tools/plugin)、[Plugin manifest](/en/plugins/manifest)。
