---
title: "会话修剪"
summary: "修剪旧的工具结果以保持上下文精简并提高缓存效率"
read_when:
  - You want to reduce context growth from tool outputs
  - You want to understand Anthropic prompt cache optimization
---

# 会话剪枝

会话修剪会在每次 LLM 调用之前从上下文中修剪 **旧的工具结果**。它会减少累积的工具输出（执行结果、文件读取、搜索结果）导致的上下文膨胀，而无需重写正常的对话文本。

<Info>修剪仅在内存中进行 —— 它不会修改磁盘上的会话记录。 您的完整历史记录始终会被保留。</Info>

## 为何重要

长会话会累积工具输出，从而膨胀上下文窗口。这会增加成本，并可能迫使 [compaction](/en/concepts/compaction) 过早发生。

修剪对于 **Anthropic 提示词缓存**尤其有价值。在缓存 TTL 过期后，下一个请求会重新缓存完整的提示词。修剪减少了缓存写入的大小，从而直接降低了成本。

## 工作原理

1. 等待缓存 TTL 过期（默认为 5 分钟）。
2. 查找用于正常修剪的旧工具结果（对话文本保持不变）。
3. **软修剪**（Soft-trim）过大的结果 —— 保留头部和尾部，并插入 `...`。
4. **硬清除**（Hard-clear）其余部分 —— 用占位符替换。
5. 重置 TTL，以便后续请求重用新的缓存。

## 旧版图片清理

OpenClaw 还会为在历史记录中保留原始图片块的旧版旧会话运行一个单独的幂等清理。

- 它会逐字保留 **最近 3 个完成的轮次**，以便针对后续跟进的提示缓存前缀保持稳定。
- `user` 或 `toolResult` 历史记录中较旧的已处理图片块可以替换为 `[image data removed - already processed by model]`。
- 这与正常的缓存 TTL 修剪是分开的。它的存在是为了防止重复的图片负载在后续轮次中破坏提示缓存。

## 智能默认值

OpenClaw 会为 Anthropic 配置文件自动启用修剪：

| 配置文件类型                                       | 已启用修剪 | Heartbeat |
| -------------------------------------------------- | ---------- | --------- |
| Anthropic OAuth/token auth（包括 Claude CLI 重用） | 是         | 1 小时    |
| API key                                            | 是         | 30 分钟   |

如果您设置了显式值，OpenClaw 将不会覆盖它们。

## 启用或禁用

对于非 Anthropic 提供商，默认情况下修剪是关闭的。要启用：

```json5
{
  agents: {
    defaults: {
      contextPruning: { mode: "cache-ttl", ttl: "5m" },
    },
  },
}
```

要禁用：请设置 `mode: "off"`。

## 修剪与压缩

|                | 修剪           | 压缩           |
| -------------- | -------------- | -------------- |
| **内容**       | 修剪工具结果   | 总结对话       |
| **是否保存？** | 否（每次请求） | 是（在记录中） |
| **范围**       | 仅工具结果     | 整个对话       |

它们互为补充——修剪可以在压缩周期之间保持工具输出精简。

## 延伸阅读

- [Compaction](/en/concepts/compaction) —— 基于摘要的上下文缩减
- [Gateway(网关) Configuration](/en/gateway/configuration) —— 所有修剪配置选项
  (`contextPruning.*`)
