---
summary: "Session pruning：裁剪工具结果以减少上下文膨胀"
read_when:
  - 想减少 LLM 上下文因工具输出增长
  - 正在调整 agents.defaults.contextPruning
title: "会话修剪（Session Pruning）"
---

# 会话修剪（Session Pruning）

Session pruning 会在每次 LLM 调用前，从内存上下文中裁剪**旧的工具结果**。它**不会**改写磁盘上的会话历史（`*.jsonl`）。

## 何时运行

- 当启用 `mode: "cache-ttl"` 且该会话最后一次 Anthropic 调用距离现在超过 `ttl`。
- 仅影响该次请求发送给模型的消息。
- 仅对 Anthropic API 调用生效（以及 OpenRouter 的 Anthropic 模型）。
- 最佳做法：将 `ttl` 与模型的 `cacheControlTtl` 对齐。
- 每次 pruning 后 TTL 窗口重置，后续请求会继续缓存直到 `ttl` 再次过期。

## 智能默认值（Anthropic）

- **OAuth 或 setup-token** profiles：启用 `cache-ttl` pruning，heartbeat 设为 `1h`。
- **API key** profiles：启用 `cache-ttl` pruning，heartbeat 设为 `30m`，并将 Anthropic 模型默认 `cacheControlTtl` 设为 `1h`。
- 若你显式设置了这些值，OpenClaw **不会**覆盖。

## 改善点（成本 + 缓存行为）

- **为何剪裁**：Anthropic prompt 缓存只在 TTL 内有效。若会话闲置超过 TTL，下一次请求会重新缓存完整 prompt，除非先剪裁。
- **哪里变便宜**：pruning 会减少 TTL 过期后的首个请求的 **cacheWrite** 大小。
- **TTL 重置意义**：pruning 执行后缓存窗口重置，后续请求可复用新缓存的 prompt，而不是再次缓存完整历史。
- **不会发生什么**：pruning 不会增加 token 或“加倍”成本；只影响 TTL 后首个请求的缓存内容。

## 可以被剪裁的内容

- 仅 `toolResult` 消息。
- 用户与 assistant 消息**从不**修改。
- 最近 `keepLastAssistants` 条 assistant 消息被保护；该截止点之后的工具结果不会被剪裁。
- 若没有足够的 assistant 消息形成截止点，则跳过 pruning。
- 含**图像块**的工具结果会跳过（不裁剪/清空）。

## 上下文窗口估算

Pruning 使用估算的上下文窗口（chars ≈ tokens × 4）。基础窗口按以下顺序解析：

1. `models.providers.*.models[].contextWindow` 覆盖。
2. 模型定义 `contextWindow`（来自模型注册表）。
3. 默认 `200000` tokens。

若设置了 `agents.defaults.contextTokens`，它将被视为解析窗口的上限（最小值）。

## 模式

### cache-ttl

- 仅当最后一次 Anthropic 调用超过 `ttl`（默认 `5m`）时运行。
- 运行时：与之前一致的 soft-trim + hard-clear 行为。

## Soft vs hard pruning

- **Soft-trim**：仅对超大工具结果。
  - 保留头 + 尾，插入 `...`，并追加原始大小说明。
  - 跳过含图像块的结果。
- **Hard-clear**：用 `hardClear.placeholder` 替换整个工具结果。

## Tool 选择

- `tools.allow` / `tools.deny` 支持 `*` 通配符。
- Deny 优先。
- 匹配不区分大小写。
- Allow 为空 => 允许全部工具。

## 与其他限制的关系

- 内置工具已对输出进行截断；session pruning 是额外层，用于防止长会话在模型上下文中积累过多工具输出。
- Compaction 是独立机制：compaction 总结并持久化，pruning 是按请求的短暂行为。参见 [/concepts/compaction](/zh/concepts/compaction)。

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
  agent: {
    contextPruning: { mode: "off" },
  },
}
```

启用 TTL-aware pruning：

```json5
{
  agent: {
    contextPruning: { mode: "cache-ttl", ttl: "5m" },
  },
}
```

仅对特定工具启用 pruning：

```json5
{
  agent: {
    contextPruning: {
      mode: "cache-ttl",
      tools: { allow: ["exec", "read"], deny: ["*image*"] },
    },
  },
}
```

配置参考： [Gateway Configuration](/zh/gateway/configuration)
