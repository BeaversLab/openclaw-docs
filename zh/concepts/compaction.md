---
summary: "Context window + compaction: how OpenClaw keeps sessions under 模型 limits"
read_when:
  - You want to understand auto-compaction and /compact
  - You are debugging long sessions hitting context limits
title: "Compaction"
---

# Context Window & Compaction

Every 模型 has a **context window** (max tokens it can see). Long-running chats accumulate messages and 工具 results; once the window is tight, OpenClaw **compacts** older history to stay within limits.

## What compaction is

Compaction **summarizes older conversation** into a compact summary entry and keeps recent messages intact. The summary is stored in the 会话 history, so future requests use:

- The compaction summary
- Recent messages after the compaction point

Compaction **persists** in the 会话’s JSONL history.

## Configuration

使用 `openclaw.json` 中的 `agents.defaults.compaction` 设置来配置压缩行为（模式、目标令牌等）。压缩摘要默认保留不透明标识符 (`identifierPolicy: "strict"`)。你可以使用 `identifierPolicy: "off"` 覆盖此设置，或通过 `identifierPolicy: "custom"` 和 `identifierInstructions` 提供自定义文本。

你可以通过 `agents.defaults.compaction.model` 选择为压缩摘要指定不同的模型。当你的主模型是本地或小模型，并且你希望由更强大的模型生成压缩摘要时，这非常有用。该覆盖接受任何 `provider/model-id` 字符串：

```json
{
  "agents": {
    "defaults": {
      "compaction": {
        "model": "openrouter/anthropic/claude-sonnet-4-5"
      }
    }
  }
}
```

这也适用于本地模型，例如第二个 Ollama 模型专用于摘要或微调的压缩专家：

```json
{
  "agents": {
    "defaults": {
      "compaction": {
        "model": "ollama/llama3.1:8b"
      }
    }
  }
}
```

未设置时，压缩使用代理的主模型。

## 自动压缩（默认开启）

当会话接近或超出模型的上下文窗口时，OpenClaw 会触发自动压缩，并可能使用压缩后的上下文重试原始请求。

您将看到：

- `🧹 Auto-compaction complete` 在详细模式下
- `/status` 显示 `🧹 Compactions: <count>`

在压缩之前，OpenClaw 可以运行一个 **静默内存刷新（silent memory flush）** 轮次，将持久化笔记存储到磁盘。有关详细信息和配置，请参阅 [Memory](/zh/concepts/memory)。

## 手动压缩

使用 `/compact`（可选择带有指令）来强制执行一次压缩：

```
/compact Focus on decisions and open questions
```

## 上下文窗口来源

上下文窗口取决于模型。OpenClaw 使用配置的提供商目录中的模型定义来确定限制。

## 压缩与修剪

- **压缩**：进行摘要并**持久化**为 JSONL。
- **会话修剪**：仅修剪旧的**工具结果**，每次请求在**内存中**进行。

有关修剪的详细信息，请参阅 [/concepts/会话-pruning](/zh/concepts/session-pruning)。

## OpenAI 服务端压缩

OpenClaw 还支持 OpenAI Responses 服务端压缩提示，适用于兼容的直接 OpenAI 模型。这与本地 OpenClaw 压缩是分开的，并且可以与其并行运行。

- 本地压缩：OpenClaw 进行摘要并将其持久化到会话 JSONL 中。
- 服务端压缩：当启用 `store` + `context_management` 时，OpenAI 在提供商端压缩上下文。

有关模型参数和覆盖设置，请参阅 [OpenAI 提供商](/zh/providers/openai)。

## 自定义上下文引擎

压缩行为由活动的[上下文引擎](/zh/concepts/context-engine)拥有。传统引擎使用上述内置摘要。插件引擎（通过 `plugins.slots.contextEngine` 选择）可以实现任何压缩策略——DAG 摘要、向量检索、增量压缩等。

当插件引擎设置 `ownsCompaction: true` 时，OpenClaw 将所有压缩决策委托给该引擎，并且不运行内置的自动压缩。

当 `ownsCompaction` 为 `false` 或未设置时，OpenClaw 仍可能使用 Pi 的内置尝试中自动压缩，但活动引擎的 `compact()` 方法仍会处理 `/compact` 和溢出恢复。不会自动回退到传统引擎的压缩路径。

如果您正在构建非拥有的上下文引擎，请通过从 `openclaw/plugin-sdk/core` 调用 `delegateCompactionToRuntime(...)` 来实现 `compact()`。

## 提示

- 当会话感觉陈旧或上下文臃肿时，请使用 `/compact`。
- 大型工具输出已被截断；修剪可以进一步减少工具结果的堆积。
- 如果您需要一个全新的开始，`/new` 或 `/reset` 会启动一个新的会话 ID。

import zh from "/components/footer/zh.mdx";

<zh />
