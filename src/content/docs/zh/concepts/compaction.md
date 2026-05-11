---
summary: "OpenClaw 如何通过总结长对话来保持在模型限制范围内"
read_when:
  - You want to understand auto-compaction and /compact
  - You are debugging long sessions hitting context limits
title: "压缩"
---

每个模型都有一个上下文窗口：即它可以处理的最大 token 数量。当对话接近该限制时，OpenClaw 会将旧消息**压缩**为摘要，以便聊天能够继续。

## 工作原理

1. 较早的对话轮次会被总结为一个压缩条目。
2. 摘要会保存在会话记录中。
3. 最近的消息会保持原样。

当 OpenClaw 将历史记录分割为压缩块时，它会将助手工具调用与其匹配的 `toolResult` 条目保持在一起。如果分割点落在工具块内部，OpenClaw 会移动边界以使该对保持在一起，并保留当前未总结的尾部。

完整的对话历史记录会保留在磁盘上。压缩仅改变模型在下一轮所看到的内容。

## 自动压缩

默认情况下启用自动压缩。当会话接近上下文限制，或者模型返回上下文溢出错误（在这种情况下，OpenClaw 会压缩并重试）时，它会运行。

您将会看到：

- `🧹 Auto-compaction complete` 在详细模式下。
- 显示 `🧹 Compactions: <count>` 的 `/status`。

<Info>在压缩之前，OpenClaw 会自动提醒智能体将重要笔记保存到 [memory](/zh/concepts/memory) 文件中。这可以防止上下文丢失。</Info>

<AccordionGroup>
  <Accordion title="Recognized overflow signatures">
    OpenClaw 根据这些提供商错误模式检测上下文溢出：

    - `request_too_large`
    - `context length exceeded`
    - `input exceeds the maximum number of tokens`
    - `input token count exceeds the maximum number of input tokens`
    - `input is too long for the model`
    - `ollama error: context length exceeded`

  </Accordion>
</AccordionGroup>

## 手动压缩

在任何聊天中输入 `/compact` 以强制进行压缩。添加指令来引导摘要生成：

```
/compact Focus on the API design decisions
```

当设置了 `agents.defaults.compaction.keepRecentTokens` 时，手动压缩会遵守该 Pi 切割点，并在重建的上下文中保留最近的尾部。如果没有明确的保留预算，手动压缩将充当硬检查点，并仅从新摘要继续。

## 配置

在您的 `openclaw.json` 中的 `agents.defaults.compaction` 下配置压缩。以下列出了最常见的选项；如需完整参考，请参阅[会话管理深入探讨](/zh/reference/session-management-compaction)。

### 使用不同的模型

默认情况下，压缩使用代理的主要模型。设置 `agents.defaults.compaction.model` 以将摘要委托给能力更强或更专业的模型。该覆盖设置接受任何 `provider/model-id` 字符串：

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

这也适用于本地模型，例如第二个专用于摘要的 Ollama 模型：

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

如果未设置，压缩将使用代理的主要模型。

### 标识符保留

压缩摘要默认保留不透明标识符 (`identifierPolicy: "strict"`)。使用 `identifierPolicy: "off"` 覆盖以禁用，或使用 `identifierPolicy: "custom"` 加上 `identifierInstructions` 进行自定义指导。

### 活动记录字节守护

当设置了 `agents.defaults.compaction.maxActiveTranscriptBytes` 时，如果活动的 JSONL 达到该大小，OpenClaw 会在运行前触发正常的本地压缩。这对于长时间运行的会话非常有用，因为提供商端的上下文管理可能会保持模型上下文健康，而本地记录会不断增长。它不会拆分原始 JSONL 字节；而是要求正常的压缩管道创建语义摘要。

<Warning>字节守护需要 `truncateAfterCompaction: true`。如果没有记录轮转，活动文件将不会缩小，并且守护将保持不活动状态。</Warning>

### 后续记录

当启用 `agents.defaults.compaction.truncateAfterCompaction` 时，OpenClaw 不会就地重写现有记录。它根据压缩摘要、保留的状态和未摘要的尾部创建一个新的活动后续记录，然后将先前的 JSONL 保留为存档的检查点源。
后续记录还会丢弃在短时间内重试窗口内到达的完全重复的长用户轮次，因此渠道重试风暴不会被带入
压缩后的下一个活动记录中。

压缩前检查点仅在其保持低于 OpenClaw 的检查点大小上限时才会被保留；过大的活动记录仍会压缩，但 OpenClaw 会跳过大型调试快照，而不是使磁盘使用量翻倍。

### 压缩通知

默认情况下，压缩会在静默中运行。设置 `notifyUser` 以在压缩开始和完成时显示简短的状态消息：

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

### 内存刷新

在压缩之前，OpenClaw 可以运行一次**静默内存刷新** 来将持久化的笔记存储到磁盘。有关详细信息和配置，请参阅 [Memory](/zh/concepts/memory)。

## 可插拔的压缩提供商

插件可以通过插件 API 上的 `registerCompactionProvider()` 注册自定义压缩提供商。当注册并配置了提供商时，OpenClaw 会将摘要委托给它，而不是使用内置的 LLM 流程。

要使用已注册的提供商，请在配置中设置其 id：

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

设置 `provider` 会自动强制 `mode: "safeguard"`。提供商接收与内置路径相同的压缩指令和标识符保留策略，并且 OpenClaw 仍然会在提供商输出之后保留最近轮次和分割轮次的后缀上下文。

<Note>如果提供商失败或返回空结果，OpenClaw 将回退到内置的 LLM 摘要。</Note>

## 压缩 vs 剪枝

|                | 压缩               | 剪枝                       |
| -------------- | ------------------ | -------------------------- |
| **作用**       | 总结较早的对话     | 修剪旧的工具结果           |
| **是否保存？** | 是（在会话记录中） | 否（仅在内存中，每次请求） |
| **范围**       | 整个对话           | 仅工具结果                 |

[会话剪枝](/zh/concepts/session-pruning) 是一个更轻量级的补充功能，它会修剪工具输出而不会进行总结。

## 故障排除

**压缩频率太高？** 模型的上下文窗口可能太小，或者工具输出可能太大。请尝试启用 [会话剪枝](/zh/concepts/session-pruning)。

**压缩后上下文感觉陈旧？** 使用 `/compact Focus on <topic>` 来指导摘要，或启用 [内存刷新](/zh/concepts/memory) 以便保留笔记。

**需要全新的开始？** `/new` 会启动一个新会话，而不会进行压缩。

有关高级配置（保留令牌、标识符保留、自定义上下文引擎、OpenAI 服务端压缩），请参阅 [会话管理深度解析](/zh/reference/session-management-compaction)。

## 相关

- [会话](/zh/concepts/session)：会话管理和生命周期。
- [会话剪枝](/zh/concepts/session-pruning)：修剪工具结果。
- [Context](/zh/concepts/context)：如何为 Agent 轮次构建上下文。
- [Hooks](/zh/automation/hooks)：压缩生命周期钩子 (`before_compaction`, `after_compaction`)。
