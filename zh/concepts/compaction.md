---
summary: "上下文窗口 + 压缩：OpenClaw 如何保持会话在模型限制内"
read_when:
  - You want to understand auto-compaction and /compact
  - You are debugging long sessions hitting context limits
title: "压缩"
---

# 上下文窗口与压缩

每个模型都有一个**上下文窗口**（它能看到的最大 Token 数）。长时间的对话会积累消息和工具结果；一旦窗口紧张，OpenClaw 会**压缩**旧的历史记录以保持在限制范围内。

## 什么是压缩

压缩会将**较旧的对话**总结为一个简洁的摘要条目，并保持最近的消息不变。摘要存储在会话历史中，因此未来的请求会使用：

- 压缩摘要
- 压缩点之后的最近消息

压缩会**持久化**保存在会话的 JSONL 历史中。

## 配置

使用 `agents.defaults.compaction` 设置在你的 `openclaw.json` 中配置压缩行为（模式、目标 Token 等）。
压缩摘要默认保留不透明标识符（`identifierPolicy: "strict"`）。你可以用 `identifierPolicy: "off"` 覆盖它，或通过 `identifierPolicy: "custom"` 和 `identifierInstructions` 提供自定义文本。

你可以通过 `agents.defaults.compaction.model` 指定不同的模型来进行压缩摘要。当你的主模型是本地模型或小模型，并且你希望由能力更强的模型生成压缩摘要时，这非常有用。该覆盖设置接受任何 `provider/model-id` 字符串：

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

这也适用于本地模型，例如第二个专门用于摘要的 Ollama 模型或微调过的压缩专家模型：

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

如果未设置，压缩将使用代理的主模型。

## 自动压缩（默认开启）

当会话接近或超过模型的上下文窗口时，OpenClaw 会触发自动压缩，并可能会使用压缩后的上下文重试原始请求。

你会看到：

- 在详细模式下的 `🧹 Auto-compaction complete`
- 显示 `🧹 Compactions: <count>` 的 `/status`

在压缩之前，OpenClaw 可以运行一个**静默内存刷新** 轮次，将持久化笔记存储到磁盘。有关详细信息和配置，请参阅 [内存](/zh/en/concepts/memory)。

## 手动压缩

使用 `/compact` （可选地附带指令）来强制执行一次压缩：

```
/compact Focus on decisions and open questions
```

## 上下文窗口来源

上下文窗口是特定于模型的。OpenClaw 使用来自已配置提供商目录中的模型定义来确定限制。

## 压缩 vs 修剪

- **压缩**：进行摘要并以 JSONL 格式**持久化**。
- **会话修剪**：仅修剪旧的**工具结果**，在**内存中**，针对每个请求。

有关修剪的详细信息，请参阅 [/concepts/session-pruning](/zh/en/concepts/session-pruning)。

## OpenAI 服务端压缩

OpenClaw 还支持针对兼容的直接 OpenAI 模型的 OpenAI Responses 服务端压缩提示。这与本地 OpenClaw 压缩是分开的，并且可以与它一起运行。

- 本地压缩：OpenClaw 进行摘要并持久化到会话 JSONL 中。
- 服务端压缩：当以下条件满足时，OpenAI 在提供商侧压缩上下文：
  `store` + `context_management` 被启用。

有关模型参数和覆盖设置，请参阅 [OpenAI provider](/zh/en/providers/openai)。

## 提示

- 当会话感觉陈旧或上下文臃肿时，请使用 `/compact`。
- 大型工具输出已经被截断；修剪可以进一步减少工具结果的累积。
- 如果您需要重新开始，`/new` 或 `/reset` 将启动一个新的会话 ID。
