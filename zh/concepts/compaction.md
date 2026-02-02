---
summary: "上下文窗口 + compaction：OpenClaw 如何保持会话在模型限制内"
read_when:
  - 需要理解自动 compaction 与 /compact
  - 在排查长会话触发上下文限制
title: "Compaction"
---
# 上下文窗口与 Compaction

每个模型都有 **上下文窗口**（可见的最大 token 数）。长会话会累积消息与工具结果；当窗口逼近限制时，OpenClaw 会 **compaction** 旧历史以保持在限制内。

## 什么是 compaction
Compaction 会 **总结较早对话** 为紧凑的摘要条目，并保留近期消息。摘要保存在会话历史中，后续请求使用：
- compaction 摘要
- compaction 点之后的近期消息

Compaction 会 **持久化** 到会话 JSONL 历史。

## 配置
`agents.defaults.compaction` 设置详见 [Compaction config & modes](/zh/concepts/compaction)。

## 自动 compaction（默认开启）
当会话接近或超过模型上下文窗口时，OpenClaw 触发自动 compaction，并可能使用压缩后的上下文重试原始请求。

你会看到：
- verbose 模式中的 `🧹 Auto-compaction complete`
- `/status` 显示 `🧹 Compactions: <count>`

在 compaction 前，OpenClaw 可能先运行一次 **静默 memory flush**，将持久化笔记写入磁盘。详见 [Memory](/zh/concepts/memory) 与相关配置。

## 手动 compaction
使用 `/compact`（可附加指令）强制执行 compaction：
```
/compact Focus on decisions and open questions
```

## 上下文窗口来源
上下文窗口依赖具体模型。OpenClaw 使用配置的 provider 目录中的模型定义来确定限制。

## Compaction vs pruning
- **Compaction**：总结并 **持久化** 到 JSONL。
- **Session pruning**：仅修剪旧 **工具结果**，**仅内存**，按请求执行。

pruning 详见 [/concepts/session-pruning](/zh/concepts/session-pruning)。

## 提示
- 会话感觉冗长或上下文臃肿时使用 `/compact`。
- 大型工具输出已被截断；pruning 可进一步减少工具结果堆积。
- 若需全新开始，`/new` 或 `/reset` 会创建新的 session id。
