---
summary: "OpenClaw 如何总结长对话以保持在模型限制内"
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

当 OpenClaw 将历史记录拆分为压缩块时，它会将助手的工具调用与其匹配的 `toolResult` 条目保持配对。如果分割点落在工具块内，OpenClaw 会移动边界以使这对保持在一起，并保留当前未总结的尾部。

完整的对话历史记录保留在磁盘上。压缩仅更改模型在下一轮看到的内容。

## 自动压缩

默认情况下启用自动压缩。它会话接近上下文限制时运行，或者当模型返回上下文溢出错误时运行（在这种情况下，OpenClaw 会压缩并重试）。典型的溢出特征包括 `request_too_large`、`context length exceeded`、`input exceeds the maximum
number of tokens`, `input token count exceeds the maximum number of input
tokens`, `input is too long for the 模型`, and `ollama error: context length
exceeded`。

<Info>在压缩之前，OpenClaw 会自动提醒代理将重要笔记保存到 [memory](/en/concepts/memory) 文件中。这可以防止上下文丢失。</Info>

## 手动压缩

在任何聊天中输入 `/compact` 以强制进行压缩。添加指令以指导总结：

```
/compact Focus on the API design decisions
```

## 使用不同的模型

默认情况下，压缩使用您代理的主要模型。您可以使用更强大的模型以获得更好的总结：

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

## 压缩与剪枝

|              | 压缩               | 剪枝                       |
| ------------ | ------------------ | -------------------------- |
| **功能**     | 总结较早的对话     | 修剪旧的工具结果           |
| **已保存？** | 是（在会话记录中） | 否（仅在内存中，每次请求） |
| **范围**     | 整个对话           | 仅工具结果                 |

[会话剪枝](/en/concepts/session-pruning) 是一个更轻量级的补充功能，它在不进行总结的情况下修剪工具输出。

## 故障排除

**压缩过于频繁？** 模型的上下文窗口可能较小，或者工具输出可能较大。尝试启用
[会话修剪](/en/concepts/session-pruning)。

**压缩后上下文感觉陈旧？** 使用 `/compact Focus on <topic>` 来
指导摘要生成，或启用 [内存刷新](/en/concepts/memory) 以便
保留笔记。

**需要全新的开始？** `/new` 启动一个新会话而不进行压缩。

有关高级配置（保留令牌、标识符保留、自定义
上下文引擎、OpenAI 服务端压缩），请参阅
[会话管理深度解析](/en/reference/session-management-compaction)。

## 相关

- [会话](/en/concepts/session) — 会话管理和生命周期
- [会话修剪](/en/concepts/session-pruning) — 修剪工具结果
- [上下文](/en/concepts/context) — 如何为智能体轮次构建上下文
- [钩子](/en/automation/hooks) — 压缩生命周期钩子 (before_compaction, after_compaction)
