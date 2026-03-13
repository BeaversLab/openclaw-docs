---
title: "会话剪枝"
summary: "会话剪枝：通过修剪工具结果来减少上下文膨胀"
read_when:
  - You want to reduce LLM context growth from tool outputs
  - You are tuning agents.defaults.contextPruning
---

# 会话剪枝

会话剪枝会在每次 LLM 调用之前，从内存上下文中修剪**旧的工具结果**。它**不会**重写磁盘上的会话历史记录 (`*.jsonl`)。

## 运行时机

- 当启用 `mode: "cache-ttl"` 且该会话的最后一次 Anthropic 调用早于 `ttl` 时。
- 仅影响发送给该请求模型的消息。
- 仅对 Anthropic API 调用（以及 OpenRouter Anthropic 模型）有效。
- 为了获得最佳效果，请将 `ttl` 与模型的 `cacheRetention` 策略相匹配 (`short` = 5m, `long` = 1h)。
- 修剪后，TTL 窗口会重置，因此后续请求会保持缓存，直到 `ttl` 再次过期。

## 智能默认值

- **OAuth 或 setup-token** 配置文件：启用 `cache-ttl` 修剪并将心跳设置为 `1h`。
- **API key** 配置文件：启用 `cache-ttl` 修剪，将心跳设置为 `30m`，并在 Anthropic 模型上默认启用 `cacheRetention: "short"`。
- 如果您显式设置了这些值中的任何一个，OpenClaw 将**不会**覆盖它们。

## 改进内容（成本 + 缓存行为）

- **为何修剪：** Anthropic 提示缓存仅在 TTL 内有效。如果会话闲置超过 TTL，除非先进行修剪，否则下一个请求将重新缓存整个提示。
- **降低成本之处：** 修剪减少了 TTL 过期后第一个请求的 **cacheWrite** 大小。
- **TTL 重置的重要性：** 一旦运行修剪，缓存窗口就会重置，因此后续请求可以重用新缓存的提示，而无需再次重新缓存完整历史记录。
- **不做之事：** 修剪不会增加 token 或产生“双重”成本；它仅改变 TTL 后第一个请求中缓存的内容。

## 可修剪的内容

- 仅限 `toolResult` 消息。
- 用户 + 助手消息**绝不会**被修改。
- 最后 `keepLastAssistants` 条助手消息受保护；该截止点之后的工具结果不会被修剪。
- 如果没有足够的助手消息来确定截止点，则跳过修剪。
- 包含 **图像块** 的工具结果将被跳过（永远不会被修剪/清除）。

## 上下文窗口估算

修剪使用估算的上下文窗口（字符数 ≈ token 数 × 4）。基本窗口按以下顺序解析：

1. `models.providers.*.models[].contextWindow` 覆盖。
2. 模型定义 `contextWindow`（来自模型注册表）。
3. 默认 `200000` token。

如果设置了 `agents.defaults.contextTokens`，它将被视为已解析窗口的上限（最小值）。

## 模式

### 缓存有效期 (cache-ttl)

- 仅当最后一次 Anthropic 调用早于 `ttl` 时才运行修剪（默认 `5m`）。
- 运行时：与之前相同的软修剪 + 硬清除行为。

## 软修剪与硬修剪

- **软修剪**：仅针对过大的工具结果。
  - 保留头部和尾部，插入 `...`，并附加一条包含原始大小的说明。
  - 跳过包含图像块的结果。
- **硬清除**：用 `hardClear.placeholder` 替换整个工具结果。

## 工具选择

- `tools.allow` / `tools.deny` 支持 `*` 通配符。
- 拒绝列表优先。
- 匹配不区分大小写。
- 空的允许列表 => 允许所有工具。

## 与其他限制的交互

- 内置工具已经会截断其自身的输出；会话修剪是一个额外的层，可防止长时间运行的聊天在模型上下文中积累过多的工具输出。
- 压缩是独立的：压缩进行总结并持久化，而修剪是针对每个请求的临时操作。参见 [/concepts/compaction](/zh/en/concepts/compaction)。

## 默认值（启用时）

- `ttl`: `"5m"`
- `keepLastAssistants`: `3`
- `softTrimRatio`: `0.3`
- `hardClearRatio`: `0.5`
- `minPrunableToolChars`: `50000`
- `softTrim`: `{ maxChars: 4000, headChars: 1500, tailChars: 1500 }`
- `hardClear`: `{ enabled: true, placeholder: "[Old tool result content cleared]" }`

## 示例

默认（关闭）：

```json5
{
  agents: { defaults: { contextPruning: { mode: "off" } } },
}
```

启用基于 TTL 的修剪：

```json5
{
  agents: { defaults: { contextPruning: { mode: "cache-ttl", ttl: "5m" } } },
}
```

将修剪限制为特定工具：

```json5
{
  agents: {
    defaults: {
      contextPruning: {
        mode: "cache-ttl",
        tools: { allow: ["exec", "read"], deny: ["*image*"] },
      },
    },
  },
}
```

请参阅配置参考：[网关配置](/zh/en/gateway/configuration)

import zh from '/components/footer/zh.mdx';

<zh />
