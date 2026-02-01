---
summary: "上下文窗口 + 压缩：OpenClaw 如何让会话保持在模型限制内"
read_when:
  - 想了解自动压缩与 /compact
  - 正在调试长会话触及上下文限制
---
# 上下文窗口与压缩

每个模型都有**上下文窗口**（可见的最大 token 数）。长时间聊天会累积消息与工具结果；当窗口吃紧时，OpenClaw 会**压缩**较早的历史以保持在限制内。

## 什么是压缩

压缩会**总结较早的对话**为一个精简摘要条目，并保留近期消息。该摘要存储在会话历史中，因此后续请求使用：
- 压缩摘要
- 压缩点之后的近期消息

压缩会**持久化**在会话的 JSONL 历史中。

## 配置

参见 [Compaction config & modes](/zh/concepts/compaction) 中的 `agents.defaults.compaction` 设置。

## 自动压缩（默认开启）

当会话接近或超过模型的上下文窗口时，OpenClaw 会触发自动压缩，并可能使用压缩后的上下文重试原始请求。

你会看到：
- verbose 模式下的 `🧹 Auto-compaction complete`
- `/status` 中显示 `🧹 Compactions: <count>`

在压缩前，OpenClaw 可能执行一次**静默 memory flush** 回合，将持久化笔记写入磁盘。
配置与细节参见 [Memory](/zh/concepts/memory)。

## 手动压缩

使用 `/compact`（可附加指令）来强制执行一次压缩：
```
/compact Focus on decisions and open questions
```

## 上下文窗口来源

上下文窗口是模型特定的。OpenClaw 使用配置的 provider catalog 中的模型定义来确定限制。

## 压缩 vs pruning

- **压缩**：总结并**持久化**到 JSONL。
- **会话 pruning**：仅裁剪旧的**工具结果**，仅**内存中**，按请求执行。

pruning 详情参见 [/concepts/session-pruning](/zh/concepts/session-pruning)。

## 提示

- 当会话变得迟钝或上下文膨胀时使用 `/compact`。
- 大型工具输出已被截断；pruning 可进一步减少工具结果堆积。
- 如果需要全新开始，`/new` 或 `/reset` 会启动新的会话 id。
