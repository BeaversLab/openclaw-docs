---
title: "提示缓存"
summary: "提示缓存控制参数、合并顺序、提供者行为以及调优模式"
read_when:
  - You want to reduce prompt token costs with cache retention
  - You need per-agent cache behavior in multi-agent setups
  - You are tuning heartbeat and cache-ttl pruning together
---

# 提示词缓存

提示缓存是指模型提供商可以在多轮对话中重用未更改的提示前缀（通常是系统/开发者指令和其他稳定的上下文），而不必每次都重新处理它们。第一个匹配的请求会写入缓存令牌（`cacheWrite`），而后续匹配的请求可以读取它们（`cacheRead`）。

这很重要：更低的令牌成本、更快的响应，以及长时间运行会话中更可预测的性能。如果没有缓存，重复的提示词即使在大多数输入没有改变的情况下，每一轮也要支付完整的提示词成本。

本页面涵盖了所有影响提示词重用和令牌成本的缓存相关控制项。

有关 Anthropic 定价的详细信息，请参阅：
[https://docs.anthropic.com/docs/build-with-claude/prompt-caching](https://docs.anthropic.com/docs/build-with-claude/prompt-caching)

## 主要控制项

### `cacheRetention`（模型和每个代理）

在模型参数上设置缓存保留：

```yaml
agents:
  defaults:
    models:
      "anthropic/claude-opus-4-6":
        params:
          cacheRetention: "short" # none | short | long
```

每个代理的覆盖：

```yaml
agents:
  list:
    - id: "alerts"
      params:
        cacheRetention: "none"
```

配置合并顺序：

1. `agents.defaults.models["provider/model"].params`
2. `agents.list[].params`（匹配代理 ID；按键覆盖）

### 旧版 `cacheControlTtl`

仍接受并映射旧值：

- `5m` -> `short`
- `1h` -> `long`

对于新配置，首选 `cacheRetention`。

### `contextPruning.mode: "cache-ttl"`

在缓存 TTL 窗口后修剪旧的工具结果上下文，以便空闲后的请求不会重新缓存过大的历史记录。

```yaml
agents:
  defaults:
    contextPruning:
      mode: "cache-ttl"
      ttl: "1h"
```

有关完整行为，请参阅 [会话修剪](/en/concepts/session-pruning)。

### 心跳保温

心跳可以使缓存窗口保持热度，并减少空闲间隔后的重复缓存写入。

```yaml
agents:
  defaults:
    heartbeat:
      every: "55m"
```

支持 `agents.list[].heartbeat` 处的每个代理心跳。

## 提供商行为

### Anthropic (直接 API)

- 支持 `cacheRetention`。
- 使用 Anthropic API 密钥身份验证配置文件时，如果未设置，OpenClaw 会为 Anthropic 模型引用植入 `cacheRetention: "short"`。

### Amazon Bedrock

- Anthropic Claude 模型引用（`amazon-bedrock/*anthropic.claude*`）支持显式 `cacheRetention` 透传。
- 非 Anthropic Bedrock 模型在运行时被强制设置为 `cacheRetention: "none"`。

### OpenRouter Anthropic 模型

对于 `openrouter/anthropic/*` 模型引用，OpenClaw 在系统/开发者提示块上注入 Anthropic `cache_control`，以提高提示缓存的复用性。

### 其他提供商

如果提供程序不支持此缓存模式，`cacheRetention` 将无效。

## 调优模式

### 混合流量（推荐的默认设置）

在主代理上保持长期存在的基线，在突发通知代理上禁用缓存：

```yaml
agents:
  defaults:
    model:
      primary: "anthropic/claude-opus-4-6"
    models:
      "anthropic/claude-opus-4-6":
        params:
          cacheRetention: "long"
  list:
    - id: "research"
      default: true
      heartbeat:
        every: "55m"
    - id: "alerts"
      params:
        cacheRetention: "none"
```

### 成本优先基线

- 设置基线 `cacheRetention: "short"`。
- 启用 `contextPruning.mode: "cache-ttl"`。
- 仅对受益于预热缓存的代理，将心跳保持在 TTL 以下。

## 缓存诊断

OpenClaw 为嵌入式代理运行公开了专门的缓存跟踪诊断。

### `diagnostics.cacheTrace` 配置

```yaml
diagnostics:
  cacheTrace:
    enabled: true
    filePath: "~/.openclaw/logs/cache-trace.jsonl" # optional
    includeMessages: false # default true
    includePrompt: false # default true
    includeSystem: false # default true
```

默认值：

- `filePath`: `$OPENCLAW_STATE_DIR/logs/cache-trace.jsonl`
- `includeMessages`: `true`
- `includePrompt`: `true`
- `includeSystem`: `true`

### 环境切换（一次性调试）

- `OPENCLAW_CACHE_TRACE=1` 启用缓存跟踪。
- `OPENCLAW_CACHE_TRACE_FILE=/path/to/cache-trace.jsonl` 覆盖输出路径。
- `OPENCLAW_CACHE_TRACE_MESSAGES=0|1` 切换完整消息负载捕获。
- `OPENCLAW_CACHE_TRACE_PROMPT=0|1` 切换提示词文本捕获。
- `OPENCLAW_CACHE_TRACE_SYSTEM=0|1` 切换系统提示词捕获。

### 检查内容

- 缓存跟踪事件采用 JSONL 格式，并包含分阶段快照，如 `session:loaded`、`prompt:before`、`stream:context` 和 `session:after`。
- 每轮对话的缓存 Token 影响通过 `cacheRead` 和 `cacheWrite` 在常规使用界面中可见（例如 `/usage full` 和会话使用摘要）。

## 快速故障排除

- 大多数轮次的 `cacheWrite` 较高：检查是否存在不稳定的系统提示词输入，并验证模型/提供商是否支持您的缓存设置。
- `cacheRetention` 无效：确认模型密钥与 `agents.defaults.models["provider/model"]` 匹配。
- 带有缓存设置的 Bedrock Nova/Mistral 请求：预期运行时强制为 `none`。

相关文档：

- [Anthropic](/en/providers/anthropic)
- [Token Use and Costs](/en/reference/token-use)
- [Session Pruning](/en/concepts/session-pruning)
- [Gateway Configuration Reference](/en/gateway/configuration-reference)

import zh from '/components/footer/zh.mdx';

<zh />
