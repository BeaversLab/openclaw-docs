---
summary: "上下文引擎：可插拔的上下文组装、压缩和子代理生命周期"
read_when:
  - You want to understand how OpenClaw assembles model context
  - You are switching between the legacy engine and a plugin engine
  - You are building a context engine plugin
title: "上下文引擎"
sidebarTitle: "上下文引擎"
---

一个 **上下文引擎** 控制着 OpenClaw 如何为每次运行构建模型上下文：包括包含哪些消息、如何压缩旧的历史记录以及如何管理跨子代理边界的上下文。

OpenClaw 内置了一个 `legacy` 引擎并默认使用它 — 大多数用户无需更改此设置。仅当您需要不同的组装、压缩或跨会话召回行为时，才需安装并选择插件引擎。

## 快速开始

<Steps>
  <Step title="检查当前启用的引擎">
    ```bash
    openclaw doctor
    # or inspect config directly:
    cat ~/.openclaw/openclaw.json | jq '.plugins.slots.contextEngine'
    ```
  </Step>
  <Step title="安装插件引擎">
    上下文引擎插件的安装方式与任何其他 OpenClaw 插件相同。

    <Tabs>
      <Tab title="从 npm 安装">
        ```bash
        openclaw plugins install @martian-engineering/lossless-claw
        ```
      </Tab>
      <Tab title="从本地路径安装">
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
    将 `contextEngine` 设置为 `"legacy"`（或完全删除该键 — `"legacy"` 为默认值）。
  </Step>
</Steps>

## 工作原理

每次 OpenClaw 运行模型提示时，上下文引擎都会在四个生命周期点参与其中：

<AccordionGroup>
  <Accordion title="1. 摄取">当新消息添加到会话时调用。引擎可以在其自己的数据存储中存储或索引该消息。</Accordion>
  <Accordion title="2. 组装">在每次模型运行之前调用。引擎返回一组有序的消息（以及一个可选的 `systemPromptAddition`），这些消息适应于 token 预算。</Accordion>
  <Accordion title="3. 压缩">当上下文窗口已满或用户运行 `/compact` 时调用。引擎通过总结旧历史记录来释放空间。</Accordion>
  <Accordion title="4. 回合后">在运行完成后调用。引擎可以持久化状态、触发后台压缩或更新索引。</Accordion>
</AccordionGroup>

对于捆绑的非 ACP Codex harness，OpenClaw 通过将组装的上下文投影到 Codex 开发者指令和当前回合提示中来应用相同的生命周期。Codex 仍然拥有其原生线程历史记录和原生压缩器。

### 子代理生命周期（可选）

OpenClaw 调用两个可选的子代理生命周期钩子：

<ParamField path="prepareSubagentSpawn" type="method">
  在子运行开始之前准备共享上下文状态。该钩子接收父/子会话密钥、`contextMode`（`isolated` 或 `fork`）、可用的脚本 ID/文件以及可选的 TTL。如果它返回一个回滚句柄，OpenClaw 会在准备成功后生成失败时调用它。
</ParamField>
<ParamField path="onSubagentEnded" type="method">
  当子代理会话完成或被清理时进行清理。
</ParamField>

### 系统提示词添加

`assemble` 方法可以返回一个 `systemPromptAddition` 字符串。OpenClaw 会将其添加到运行的系统提示词之前。这允许引擎注入动态召回指导、检索指令或上下文感知提示，而无需静态工作区文件。

## 传统引擎

内置的 `legacy` 引擎保留了 OpenClaw 的原始行为：

- **摄取 (Ingest)**：无操作（会话管理器直接处理消息持久化）。
- **组装 (Assemble)**：直通（运行时中现有的清理 → 验证 → 限制管道处理上下文组装）。
- **Compact**：委托给内置的摘要压缩，它会对旧消息创建单个摘要并保持最近的消息不变。
- **After turn**：无操作。

旧版引擎不注册工具或提供 `systemPromptAddition`。

当未设置 `plugins.slots.contextEngine`（或将其设置为 `"legacy"`）时，将自动使用此引擎。

## 插件引擎

插件可以使用插件 API 注册上下文引擎：

```ts
import { buildMemorySystemPromptAddition } from "openclaw/plugin-sdk/core";

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
| `info`             | 属性 | 引擎 id、名称、版本以及它是否拥有压缩权       |
| `ingest(params)`   | 方法 | 存储单条消息                                  |
| `assemble(params)` | 方法 | 为模型运行构建上下文（返回 `AssembleResult`） |
| `compact(params)`  | 方法 | 摘要/缩减上下文                               |

`assemble` 返回一个 `AssembleResult`，包含：

<ParamField path="messages" type="Message[]" required>
  发送到模型的有序消息。
</ParamField>
<ParamField path="estimatedTokens" type="number" required>
  引擎对组装上下文中总 Token 数的估计。OpenClaw 使用此值进行压缩阈值决策和诊断报告。
</ParamField>
<ParamField path="systemPromptAddition" type="string">
  附加到系统提示词之前。
</ParamField>

`compact` 返回一个 `CompactResult`。当压缩轮换活动
转录时，`result.sessionId` 和 `result.sessionFile` 标识下一次
重试或回合必须使用的后续会话。

可选成员：

| 成员                           | 类型 | 用途                                                                       |
| ------------------------------ | ---- | -------------------------------------------------------------------------- |
| `bootstrap(params)`            | 方法 | 初始化会话的引擎状态。当引擎首次看到会话时（例如，导入历史记录）调用一次。 |
| `ingestBatch(params)`          | 方法 | 作为批次摄取已完成的回合。在运行完成后调用，一次性包含该回合的所有消息。   |
| `afterTurn(params)`            | 方法 | 运行后生命周期工作（持久化状态、触发后台压缩）。                           |
| `prepareSubagentSpawn(params)` | 方法 | 在子会话开始之前为其设置共享状态。                                         |
| `onSubagentEnded(params)`      | 方法 | 在子代理结束后进行清理。                                                   |
| `dispose()`                    | 方法 | 释放资源。在网关关闭或插件重新加载期间调用——而不是每次会话都调用。         |

### ownsCompaction

`ownsCompaction` 控制是否为该运行启用 Pi 内置的尝试内自动压缩：

<AccordionGroup>
  <Accordion title="ownsCompaction: true">引擎拥有压缩行为。OpenClaw 将禁用该运行的 Pi 内置自动压缩，引擎的 `compact()` 实现负责 `/compact`、溢出恢复压缩以及它想要在 `afterTurn()` 中执行的任何主动压缩。OpenClaw 可能仍会运行提示前溢出保护；当它预测完整的转录将溢出时，恢复路径将在提交另一个提示之前调用活动引擎的 `compact()`。</Accordion>
  <Accordion title="ownsCompaction: false or unset">Pi 的内置自动压缩仍可能在提示执行期间运行，但活动引擎的 `compact()` 方法仍会被调用以进行 `/compact` 和溢出恢复。</Accordion>
</AccordionGroup>

<Warning>`ownsCompaction: false` **并不**意味着 OpenClaw 自动回退到旧版引擎的压缩路径。</Warning>

这意味着有两种有效的插件模式：

<Tabs>
  <Tab title="Owning mode">实现您自己的压缩算法并设置 `ownsCompaction: true`。</Tab>
  <Tab title="Delegating mode">设置 `ownsCompaction: false` 并让 `compact()` 从 `openclaw/plugin-sdk/core` 调用 `delegateCompactionToRuntime(...)` 以使用 OpenClaw 的内置压缩行为。</Tab>
</Tabs>

对于活动的非拥有引擎来说，空操作 `compact()` 是不安全的，因为它禁用了该引擎槽的正常 `/compact` 和溢出恢复压缩路径。

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

<Note>该槽位在运行时是独占的——对于给定的运行或压缩操作，只会解析一个已注册的上下文引擎。其他已启用的 `kind: "context-engine"` 插件仍可以加载并运行其注册代码；`plugins.slots.contextEngine` 仅选择当 OpenClaw 需要上下文引擎时解析哪个已注册的引擎 ID。</Note>

<Note>**插件卸载：** 当您卸载当前选为 `plugins.slots.contextEngine` 的插件时，OpenClaw 会将槽位重置为默认值（`legacy`）。相同的重置行为也适用于 `plugins.slots.memory`。无需手动编辑配置。</Note>

## 与压缩和内存的关系

<AccordionGroup>
  <Accordion title="Compaction">压缩是上下文引擎的职责之一。传统引擎将其委托给 OpenClaw 的内置摘要功能。插件引擎可以实现任何压缩策略（DAG 摘要、向量检索等）。</Accordion>
  <Accordion title="Memory plugins">
    内存插件（`plugins.slots.memory`）与上下文引擎是分离的。内存插件提供搜索/检索功能；上下文引擎控制模型看到的内容。它们可以协同工作——上下文引擎可能会在组装过程中使用内存插件数据。想要使用活动内存提示路径的插件引擎应优先使用 `openclaw/plugin-sdk/core` 中的 `buildMemorySystemPromptAddition(...)`，它会将活动的内存提示部分转换为易于前置的
    `systemPromptAddition`。如果引擎需要更低级别的控制，它仍然可以通过 `buildActiveMemoryPromptSection(...)` 从 `openclaw/plugin-sdk/memory-host-core` 拉取原始行。
  </Accordion>
  <Accordion title="Session pruning">无论哪个上下文引擎处于活动状态，内存中修剪旧工具结果的操作仍会运行。</Accordion>
</AccordionGroup>

## 提示

- 使用 `openclaw doctor` 来验证您的引擎是否正确加载。
- 如果切换引擎，现有会话将继续使用其当前历史记录。新引擎将接管未来的运行。
- 引擎错误会被记录并显示在诊断信息中。如果插件引擎注册失败，或者选定的引擎 id 无法解析，OpenClaw 不会自动回退；运行将会失败，直到您修复插件或将 `plugins.slots.contextEngine` 切换回 `"legacy"`。
- 在开发过程中，请使用 `openclaw plugins install -l ./my-engine` 来链接本地插件目录，而无需复制。

## 相关内容

- [压缩](/zh/concepts/compaction) — 总结长对话
- [上下文](/zh/concepts/context) — 如何为代理轮次构建上下文
- [插件架构](/zh/plugins/architecture) — 注册上下文引擎插件
- [插件清单](/zh/plugins/manifest) — 插件清单字段
- [插件](/zh/tools/plugin) — 插件概述
