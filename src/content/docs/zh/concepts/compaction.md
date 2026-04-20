---
summary: "OpenClaw 如何通过总结长对话来保持在模型限制范围内"
read_when:
  - You want to understand auto-compaction and /compact
  - You are debugging long sessions hitting context limits
title: "压缩"
---

# 压缩

每个模型都有一个上下文窗口——即其可以处理的最大 token 数。
当对话接近该限制时，OpenClaw 会将较早的消息**压缩**
为摘要，以便聊天能够继续。

## 工作原理

1. 较早的对话轮次被总结为一个压缩条目。
2. 摘要保存在会话记录中。
3. 最近的消息保持原样。

当 OpenClaw 将历史记录分割为压缩块时，它会保持助手工具调用与其匹配的 `toolResult` 条目成对。如果分割点位于工具块内部，OpenClaw 会移动边界以保持这对条目在一起，并保留当前未总结的尾部。

完整的对话历史记录保留在磁盘上。压缩仅更改模型在下一轮看到的内容。

## 自动压缩

默认情况下启用自动压缩。当会话接近上下文限制，或者当模型返回上下文溢出错误时（在这种情况下，OpenClaw 会压缩并重试），它会运行。典型的溢出签名包括 `request_too_large`、`context length exceeded`、`input exceeds the maximum
number of tokens`, `input token count exceeds the maximum number of input
tokens`, `input is too long for the 模型`, and `ollama error: context length
exceeded`。

<Info>在压缩之前，OpenClaw 会自动提醒代理将重要笔记保存到 [memory](/zh/concepts/memory) 文件中。这可以防止上下文丢失。</Info>

使用 `openclaw.json` 中的 `agents.defaults.compaction` 设置来配置压缩行为（模式、目标令牌等）。压缩摘要默认保留不透明标识符（`identifierPolicy: "strict"`）。您可以使用 `identifierPolicy: "off"` 覆盖此设置，或使用 `identifierPolicy: "custom"` 和 `identifierInstructions` 提供自定义文本。

您可以通过 `agents.defaults.compaction.model` 选择性地为压缩摘要指定不同的模型。当您的主模型是本地或小型模型，并且您希望由能力更强的模型生成压缩摘要时，这非常有用。该覆盖接受任何 `provider/model-id` 字符串：

```json
{
  "agents": {
    "defaults": {
      "compaction": {
        "model": "openrouter/anthropic/claude-sonnet-4-6"
      }
    }
  }
}
```

这也适用于本地模型，例如专门用于摘要的第二个 Ollama 模型或微调的压缩专家模型：

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

## 可插拔压缩提供程序

插件可以通过插件 API 上的 `registerCompactionProvider()` 注册自定义压缩提供商。当注册并配置了提供商后，OpenClaw 会将摘要委托给它，而不是使用内置的 LLM 流程。

要使用已注册的提供商，请在您的配置中设置提供商 id：

```json
{
  "agents": {
    "defaults": {
      "compaction": {
        "provider": "my-provider"
      }
    }
  }
}
```

设置 `provider` 会自动强制启用 `mode: "safeguard"`。提供商接收与内置路径相同的压缩指令和标识符保留策略，并且 OpenClaw 仍会在提供商输出后保留最近轮次和拆分轮次的后缀上下文。如果提供商失败或返回空结果，OpenClaw 将回退到内置 LLM 摘要。

## 自动压缩（默认开启）

当会话接近或超过模型的上下文窗口时，OpenClaw 会触发自动压缩，并可能会使用压缩后的上下文重试原始请求。

您将看到：

- 详细模式下的 `🧹 Auto-compaction complete`
- 显示 `🧹 Compactions: <count>` 的 `/status`

在压缩之前，OpenClaw 可以运行一个 **静默内存刷新** 轮次，将持久化笔记存储到磁盘。有关详细信息和配置，请参阅 [内存](/zh/concepts/memory)。

## 手动压缩

在任何聊天中输入 `/compact` 以强制压缩。添加指令来指导摘要：

```
/compact Focus on the API design decisions
```

## 使用不同的模型

默认情况下，压缩使用您的代理的主模型。您可以使用能力更强的模型来获得更好的摘要：

```json5
{
  agents: {
    defaults: {
      compaction: {
        model: "openrouter/anthropic/claude-sonnet-4-6",
      },
    },
  },
}
```

## 压缩开始通知

默认情况下，压缩静默运行。要在压缩开始时显示简短通知，请启用 `notifyUser`：

```json5
{
  agents: {
    defaults: {
      compaction: {
        notifyUser: true,
      },
    },
  },
}
```

启用后，用户会在每次压缩运行开始时看到一条短消息（例如，“正在压缩上下文...”）。

## 压缩 vs 修剪

|                | 压缩               | 修剪                       |
| -------------- | ------------------ | -------------------------- |
| **作用**       | 摘要较旧的对话     | 修剪旧的工具结果           |
| **是否保存？** | 是（在会话记录中） | 否（仅在内存中，每次请求） |
| **范围**       | 整个对话           | 仅工具结果                 |

[会话修剪](/zh/concepts/session-pruning) 是一个更轻量级的补充功能，它在不需要摘要的情况下修剪工具输出。

## 故障排除

**压缩太频繁？** 模型的上下文窗口可能较小，或者工具输出可能很大。尝试启用[会话修剪](/zh/concepts/session-pruning)。

**压缩后上下文感觉陈旧？** 使用 `/compact Focus on <topic>` 来引导摘要，或启用 [memory flush](/zh/concepts/memory) 以便保留笔记。

**需要重新开始？** `/new` 启动一个新的会话而无需压缩。

有关高级配置（保留令牌、标识符保留、自定义上下文引擎、OpenAI 服务器端压缩），请参阅[会话管理深度剖析](/zh/reference/session-management-compaction)。

## 相关

- [会话](/zh/concepts/session) — 会话管理和生命周期
- [会话修剪](/zh/concepts/session-pruning) — 修剪工具结果
- [上下文](/zh/concepts/context) — 如何为代理轮次构建上下文
- [钩子](/zh/automation/hooks) — 压缩生命周期钩子（before_compaction、after_compaction）
