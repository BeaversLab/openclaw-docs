---
summary: "Context engine: pluggable context assembly, compaction, and subagent lifecycle"
read_when:
  - You want to understand how OpenClaw assembles model context
  - You are switching between the legacy engine and a plugin engine
  - You are building a context engine plugin
title: "上下文引擎"
sidebarTitle: "上下文引擎"
---

一个 **上下文引擎** 控制着 OpenClaw 如何为每次运行构建模型上下文：包括包含哪些消息、如何压缩旧的历史记录以及如何管理跨子代理边界的上下文。

OpenClaw 内置了 `legacy` 引擎并默认使用它 - 大多数用户无需更改此设置。仅当您需要不同的组装、压缩或跨会话回忆行为时，才安装并选择插件引擎。

## 快速开始

<Steps>
  <Step title="检查哪个引擎处于活动状态">
    ```bash
    openclaw doctor
    # or inspect config directly:
    cat ~/.openclaw/openclaw.json | jq '.plugins.slots.contextEngine'
    ```
  </Step>
  <Step title="安装插件引擎">
    上下文引擎插件的安装方式与任何其他 OpenClaw 插件相同。

    <Tabs>
      <Tab title="从 npm">
        ```bash
        openclaw plugins install @martian-engineering/lossless-claw
        ```
      </Tab>
      <Tab title="从本地路径">
        ```bash
        openclaw plugins install -l ./my-context-engine
        ```
      </Tab>
    </Tabs>

  </Step>
  <Step title="启用并选择引擎">
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

    安装并配置后，请重启网关。

  </Step>
  <Step title="切换回旧版引擎（可选）">
    将 `contextEngine` 设置为 `"legacy"`（或完全删除该键 - `"legacy"` 为默认值）。
  </Step>
</Steps>

## 工作原理

每次 OpenClaw 运行模型提示时，上下文引擎都会在四个生命周期点参与其中：

<AccordionGroup>
  <Accordion title="1. 摄取">当新消息添加到会话时调用。引擎可以将其存储或索引到自己的数据存储中。</Accordion>
  <Accordion title="2. 组装">在每次模型运行之前调用。引擎返回一组适合令牌预算的有序消息（以及可选的 `systemPromptAddition`）。</Accordion>
  <Accordion title="3. 压缩">当上下文窗口已满，或者用户运行 `/compact` 时调用。引擎会对较早的历史记录进行摘要以释放空间。</Accordion>
  <Accordion title="4. 回合后">在一次运行完成后调用。引擎可以持久化状态、触发后台压缩或更新索引。</Accordion>
</AccordionGroup>

对于捆绑的非 ACP Codex harness，OpenClaw 通过将组装的上下文投影到 Codex 开发者指令和当前回合提示中来应用相同的生命周期。Codex 仍然拥有其原生线程历史记录和原生压缩器。

### 子代理生命周期（可选）

OpenClaw 调用两个可选的子代理生命周期钩子：

<ParamField path="prepareSubagentSpawn" type="method">
  在子运行开始前准备共享上下文状态。该钩子接收父/子会话密钥、`contextMode`（`isolated` 或 `fork`OpenClaw）、可用的转录 id/文件以及可选的 TTL。如果它返回一个回滚句柄，OpenClaw 会在准备成功后生成失败时调用它。请求 `lightContext` 并解析为 `contextMode="isolated"` 的原生子代理生成会故意跳过此钩子，以便子代理从轻量级引导上下文开始，而没有上下文引擎管理的生成前状态。
</ParamField>
<ParamField path="onSubagentEnded" type="method">
  当子代理会话完成或被清除时进行清理。
</ParamField>

### 系统提示词添加

`assemble` 方法可以返回一个 `systemPromptAddition`OpenClaw 字符串。OpenClaw 会将其前置到运行的系统提示中。这允许引擎注入动态的召回指导、检索指令或上下文感知提示，而无需静态工作区文件。

## 传统引擎

内置的 `legacy`OpenClaw 引擎保留了 OpenClaw 的原始行为：

- **摄取 (Ingest)**：无操作（会话管理器直接处理消息持久化）。
- **组装 (Assemble)**：直通（运行时中现有的清理 → 验证 → 限制管道处理上下文组装）。
- **Compact**：委托给内置的摘要压缩，它会对旧消息创建单个摘要并保持最近的消息不变。
- **After turn**：无操作。

旧版引擎不注册工具也不提供 `systemPromptAddition`。

当未设置 `plugins.slots.contextEngine`（或将其设置为 `"legacy"`）时，将自动使用此引擎。

## 插件引擎

插件可以使用插件 API 注册上下文引擎：

```ts
import { buildMemorySystemPromptAddition } from "openclaw/plugin-sdk/core";

export default function register(api) {
  api.registerContextEngine("my-engine", (ctx) => ({
    info: {
      id: "my-engine",
      name: "My Context Engine",
      ownsCompaction: true,
    },

    async ingest({ sessionId, message, isHeartbeat }) {
      // Store the message in your data store
      return { ingested: true };
    },

    async assemble({ sessionId, messages, tokenBudget, availableTools, citationsMode }) {
      // Return messages that fit the budget
      return {
        messages: buildContext(messages, tokenBudget),
        estimatedTokens: countTokens(messages),
        systemPromptAddition: buildMemorySystemPromptAddition({
          availableTools: availableTools ?? new Set(),
          citationsMode,
        }),
      };
    },

    async compact({ sessionId, force }) {
      // Summarize older context
      return { ok: true, compacted: true };
    },
  }));
}
```

工厂 `ctx` 包含可选的 `config`、`agentDir` 和 `workspaceDir`
值，以便插件可以在第一个生命周期钩子运行之前初始化每个代理或每个工作区的状态。

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
| `info`             | 属性 | 引擎 ID、名称、版本以及它是否拥有压缩权       |
| `ingest(params)`   | 方法 | 存储单条消息                                  |
| `assemble(params)` | 方法 | 为模型运行构建上下文（返回 `AssembleResult`） |
| `compact(params)`  | 方法 | 摘要/缩减上下文                               |

`assemble` 返回一个 `AssembleResult`，其中包含：

<ParamField path="messages" type="Message[]" required>
  发送给模型的有序消息。
</ParamField>
<ParamField path="estimatedTokens" type="number" required>
  引擎对组装上下文中总 token 数的估计。OpenClaw 将其用于压缩阈值决策和诊断报告。
</ParamField>
<ParamField path="systemPromptAddition" type="string">
  附加到系统提示之前。
</ParamField>
<ParamField path="promptAuthority" type='"assembled" | "preassembly_may_overflow"'>
  控制运行器在溢出预检时使用哪种 token 估计。默认为 `"assembled"`，这意味着仅检查已组装提示的估计值——适用于返回窗口化、自包含上下文的引擎。仅当你的组装视图可能掩盖底层转录中的溢出风险时，才设置为 `"preassembly_may_overflow"`；此时，运行器在决定是否进行预防性压缩时，会取组装估计值与组装前（非窗口化）会话历史估计值中的最大值。无论哪种方式，你返回的消息仍然是模型所看到的内容——`promptAuthority`
  仅影响预检。
</ParamField>

`compact` 返回一个 `CompactResult`。当压缩轮换活动转录时，`result.sessionId` 和 `result.sessionFile` 标识下一次重试或回合必须使用的后续会话。

可选成员：

| 成员                           | 类型 | 用途                                                                       |
| ------------------------------ | ---- | -------------------------------------------------------------------------- |
| `bootstrap(params)`            | 方法 | 初始化会话的引擎状态。在引擎首次看到会话时（例如，导入历史记录）调用一次。 |
| `ingestBatch(params)`          | 方法 | 作为批次摄取已完成的回合。在运行完成后调用，一次性包含该回合的所有消息。   |
| `afterTurn(params)`            | 方法 | 运行后的生命周期工作（持久化状态，触发后台压缩）。                         |
| `prepareSubagentSpawn(params)` | 方法 | 在子会话开始之前为其设置共享状态。                                         |
| `onSubagentEnded(params)`      | 方法 | 在子代理结束后进行清理。                                                   |
| `dispose()`                    | 方法 | 释放资源。在网关关闭或插件重新加载期间调用 - 而非针对每个会话。            |

### 主机要求

上下文引擎可以在 `info.hostRequirements` 上声明主机能力要求。
OpenClaw 会在开始操作前检查这些要求，如果所选运行时无法满足要求，则将以描述性错误关闭并失败。

对于代理运行，当引擎必须通过 `assemble()` 控制实际模型提示时，请声明 `assemble-before-prompt`：

```ts
info: {
  id: "my-context-engine",
  name: "My Context Engine",
  hostRequirements: {
    "agent-run": {
      requiredCapabilities: ["assemble-before-prompt"],
      unsupportedMessage:
        "Use the native Codex or OpenClaw embedded runtime, or select the legacy context engine.",
    },
  },
}
```

Native Codex 和 OpenClaw 嵌入式代理运行满足 `assemble-before-prompt`。
通用 CLI 后端不满足，因此需要它的引擎会在 CLI 进程启动之前被拒绝。

### 故障隔离

OpenClaw 将选定的插件引擎与核心回复路径隔离。如果非旧版引擎缺失、未通过合约验证、在工厂创建期间抛出异常，或在生命周期方法中抛出异常，OpenClaw 会将该引擎在当前 Gateway(网关) 进程中进行隔离，并将上下文引擎工作降级为内置的 `legacy` 引擎。错误会与失败的操作一起记录，以便操作员可以修复、更新或禁用插件，而不会导致代理静默无响应。

主机要求失败的情况有所不同：当引擎声明运行时缺少所需功能时，OpenClaw 会在启动运行之前直接失败。这可以保护那些在不支持的主机上运行时会破坏状态的引擎。

### ownsCompaction

`ownsCompaction` 控制是否为本次运行启用 OpenClaw 运行时内置的尝试内自动压缩：

<AccordionGroup>
  <Accordion title="ownsCompaction: true">引擎拥有压缩行为。OpenClaw 禁用该次运行的 OpenClaw 运行时内置自动压缩，并且引擎的 `compact()` 实现负责 `/compact`、溢出恢复压缩以及它想要在 `afterTurn()` 中执行的任何主动压缩。OpenClaw 可能仍会运行预提示溢出保护措施；当它预测完整转录将溢出时，恢复路径会在提交另一个提示之前调用活动引擎的 `compact()`。</Accordion>
  <Accordion title="ownsCompaction: false or unset">OpenClaw 运行时的内置自动压缩仍可能在提示执行期间运行，但仍会调用活动引擎的 `compact()` 方法进行 `/compact` 和溢出恢复。</Accordion>
</AccordionGroup>

<Warning>`ownsCompaction: false` 并 **不** 意味着 OpenClaw 会自动回退到旧版引擎的压缩路径。</Warning>

这意味着有两种有效的插件模式：

<Tabs>
  <Tab title="Owning mode">实现您自己的压缩算法并设置 `ownsCompaction: true`。</Tab>
  <Tab title="Delegating mode">设置 `ownsCompaction: false` 并让 `compact()` 调用 `openclaw/plugin-sdk/core` 中的 `delegateCompactionToRuntime(...)`，以使用 OpenClaw 的内置压缩行为。</Tab>
</Tabs>

对于非拥有模式的活跃引擎，no-op `compact()` 是不安全的，因为它禁用了该引擎槽位的常规 `/compact` 和溢出恢复压缩路径。

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

<Note>该槽位在运行时是独占的 - 对于给定的运行或压缩操作，只会解析一个已注册的上下文引擎。其他已启用的 `kind: "context-engine"` 插件仍然可以加载并运行其注册代码；`plugins.slots.contextEngine` 仅选择 OpenClaw 在需要上下文引擎时解析哪个已注册的引擎 id。</Note>

<Note>**插件卸载：** 当您卸载当前选为 `plugins.slots.contextEngine` 的插件时，OpenClaw 会将该槽位重置为默认值 (`legacy`)。相同的重置行为也适用于 `plugins.slots.memory`。无需手动编辑配置。</Note>

## 与压缩和记忆的关系

<AccordionGroup>
  <Accordion title="Compaction" OpenClaw>
    压缩是上下文引擎的职责之一。传统引擎委托给 OpenClaw 内置的摘要。插件引擎可以实现任何压缩策略（DAG 摘要、向量检索等）。
  </Accordion>
  <Accordion title="Memory plugins">
    Memory 插件 (`plugins.slots.memory`) 与上下文引擎是分开的。Memory 插件提供搜索/检索功能；上下文引擎控制模型看到的内容。它们可以协同工作 - 上下文引擎可能会在组装过程中使用 Memory 插件的数据。如果插件引擎需要使用活跃的 Memory 提示路径，应该首选使用 `openclaw/plugin-sdk/core` 中的 `buildMemorySystemPromptAddition(...)`，它将活跃的 Memory 提示部分转换为随时可预置的
    `systemPromptAddition`。如果引擎需要更低级别的控制，它仍然可以通过 `buildActiveMemoryPromptSection(...)` 从 `openclaw/plugin-sdk/memory-host-core` 中提取原始行。
  </Accordion>
  <Accordion title="Session pruning">无论哪个上下文引擎处于活动状态，内存中修剪旧工具结果的操作仍会继续运行。</Accordion>
</AccordionGroup>

## 提示

- 使用 `openclaw doctor` 来验证您的引擎是否正在正确加载。
- 如果切换引擎，现有会话将继续使用其当前历史记录。新引擎将接管未来的运行。
- 引擎错误会被记录，所选的插件引擎将在当前 Gateway(网关) 进程中被隔离。OpenClaw 会回退到 `legacy` 以便用户轮次可以继续回复，但你仍然应该修复、更新、禁用或卸载损坏的插件。
- 对于开发，使用 `openclaw plugins install -l ./my-engine` 来链接本地插件目录而无需复制。

## 相关

- [压缩](/zh/concepts/compaction) - 总结长对话
- [上下文](/zh/concepts/context) - 如何为代理轮次构建上下文
- [插件架构](/zh/plugins/architecture) - 注册上下文引擎插件
- [插件清单](/zh/plugins/manifest) - 插件清单字段
- [插件](/zh/tools/plugin) - 插件概述
