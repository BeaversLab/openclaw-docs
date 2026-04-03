---
summary: "OpenClaw 如何总结长对话以保持在模型的限制范围内"
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

完整的对话历史保留在磁盘上。压缩仅改变模型
在下一轮看到的内容。

## 自动压缩

默认情况下启用自动压缩。当会话接近上下文限制，或模型返回上下文溢出错误时（此时
OpenClaw 会压缩并重试），它会运行。

<Info>在压缩之前，OpenClaw 会自动提醒代理将重要的 笔记保存到 [memory](/en/concepts/memory) 文件中。这可以防止上下文丢失。</Info>

## 手动压缩

在任何聊天中输入 `/compact` 以强制进行压缩。添加指令来指导
摘要：

```
/compact Focus on the API design decisions
```

## 使用不同的模型

默认情况下，压缩使用您代理的主模型。您可以使用一个
能力更强的模型来获得更好的摘要：

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

## 压缩与修剪

|                | 压缩               | 修剪                     |
| -------------- | ------------------ | ------------------------ |
| **作用**       | 总结较早的对话     | 修剪旧工具结果           |
| **是否保存？** | 是（在会话记录中） | 否（仅内存中，每次请求） |
| **范围**       | 整个对话           | 仅工具结果               |

[会话修剪](/en/concepts/session-pruning) 是一个更轻量级的补充功能，它在
不进行总结的情况下修剪工具输出。

## 故障排除

**压缩太频繁？** 模型的上下文窗口可能太小，或者工具
输出可能太大。尝试启用
[会话修剪](/en/concepts/session-pruning)。

**压缩后上下文感觉过时？** 使用 `/compact Focus on <topic>` 来
指导摘要，或启用 [内存刷新](/en/concepts/memory) 以便笔记
能够保留。

**需要全新的开始？** `/new` 将在不压缩的情况下开始一个新的会话。

有关高级配置（预留令牌、保留标识符、自定义上下文引擎、OpenAI 服务器端压缩），请参阅
[Session Management Deep Dive](/en/reference/session-management-compaction)。

## 相关

- [Session](/en/concepts/session) — 会话管理和生命周期
- [Session Pruning](/en/concepts/session-pruning) — 修剪工具结果
- [Context](/en/concepts/context) — 如何为代理轮次构建上下文
- [Hooks](/en/automation/hooks) — 压缩生命周期钩子（before_compaction、after_compaction）
