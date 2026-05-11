---
summary: "修剪旧工具结果以保持上下文精简并提高缓存效率"
title: "会话修剪"
read_when:
  - You want to reduce context growth from tool outputs
  - You want to understand Anthropic prompt cache optimization
---

会话修剪会在每次 LLM 调用之前从上下文中修剪 **旧工具结果**。它可以减少因累积工具输出（执行结果、文件读取、搜索结果）而产生的上下文膨胀，而无需重写正常的对话文本。

<Info>修剪仅在内存中进行 —— 它不会修改磁盘上的会话记录。 您的完整历史记录始终会被保留。</Info>

## 为什么重要

长会话会累积导致上下文窗口膨胀的工具输出。这会增加成本，并可能迫使系统过早地进行 [压缩](/zh/concepts/compaction)。

修剪对于 **Anthropic 提示缓存** 尤其有价值。在缓存 TTL 过期后，下一个请求会重新缓存完整的提示。修剪减少了缓存写入的大小，从而直接降低了成本。

## 工作原理

1. 等待缓存 TTL 过期（默认为 5 分钟）。
2. 查找用于常规修剪的旧工具结果（对话文本保持不变）。
3. **软修剪** 超大结果 —— 保留头部和尾部，插入 `...`。
4. **硬清除** 其余部分 —— 用占位符替换。
5. 重置 TTL，以便后续请求重用新的缓存。

## 旧版图像清理

OpenClaw 还为在历史记录中保留原始图像块或提示水合媒体标记的会话构建了一个单独的幂等重放视图。

- 它会逐字节保留 **最近 3 个已完成的轮次**，以便针对近期后续对话的提示缓存前缀保持稳定。
- 在重放视图中，来自 `user` 或 `toolResult` 历史记录的较旧的已处理图像块可以用 `[image data removed - already processed by model]` 替换。
- 较旧的文本媒体引用（如 `[media attached: ...]`、`[Image: source: ...]` 和 `media://inbound/...`）可以用 `[media reference removed - already processed by model]` 替换。当前轮次的附件标记保持完整，以便视觉模型仍能水合新图像。
- 原始会话记录不会被重写，因此历史记录查看器仍可以呈现原始消息条目及其图像。
- 这与正常的缓存 TTL 修剪是分开的。它的存在是为了防止重复的图像负载或过时的媒体引用在后续轮次中破坏提示缓存。

## 智能默认值

OpenClaw 为 Anthropic 配置文件自动启用修剪：

| 配置文件类型                                       | 已启用修剪 | 心跳    |
| -------------------------------------------------- | ---------- | ------- |
| Anthropic OAuth/token 认证（包括 Claude CLI 复用） | 是         | 1 小时  |
| API 密钥                                           | 是         | 30 分钟 |

如果您设置了显式值，OpenClaw 将不会覆盖它们。

## 启用或禁用

对于非 Anthropic 提供商，修剪默认处于关闭状态。要启用：

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

它们相辅相成——修剪可以在压缩周期之间保持工具输出的精简。

## 延伸阅读

- [压缩](/zh/concepts/compaction) -- 基于总结的上下文缩减
- [Gateway(网关) 配置](/zh/gateway/configuration) -- 所有修剪配置选项
  (`contextPruning.*`)

## 相关

- [会话管理](/zh/concepts/session)
- [会话工具](/zh/concepts/session-tool)
- [上下文引擎](/zh/concepts/context-engine)
