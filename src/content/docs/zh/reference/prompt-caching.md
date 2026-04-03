---
title: "Prompt 缓存"
summary: "Prompt 缓存控制项、合并顺序、提供商行为和调优模式"
read_when:
  - You want to reduce prompt token costs with cache retention
  - You need per-agent cache behavior in multi-agent setups
  - You are tuning heartbeat and cache-ttl pruning together
---

# 提示词缓存

Prompt 缓存意味着模型提供商可以在多轮对话中重复使用未更改的提示词前缀（通常是系统/开发者指令和其他稳定的上下文），而不必每次都重新处理它们。第一个匹配的请求写入缓存令牌（`cacheWrite`），后续匹配的请求可以读取它们（`cacheRead`）。

这很重要：更低的令牌成本、更快的响应，以及长时间运行会话中更可预测的性能。如果没有缓存，重复的提示词即使在大多数输入没有改变的情况下，每一轮也要支付完整的提示词成本。

本页面涵盖了所有影响提示词重用和令牌成本的缓存相关控制项。

有关 Anthropic 定价详情，请参阅：
[https://docs.anthropic.com/docs/build-with-claude/prompt-caching](https://docs.anthropic.com/docs/build-with-claude/prompt-caching)

## 主要控制项

### `cacheRetention`（全局默认值、模型和每个代理）

将所有模型的缓存保留设置为全局默认值：

```yaml
agents:
  defaults:
    params:
      cacheRetention: "long" # none | short | long
```

按模型覆盖：

```yaml
agents:
  defaults:
    models:
      "anthropic/claude-opus-4-6":
        params:
          cacheRetention: "short" # none | short | long
```

按代理覆盖：

```yaml
agents:
  list:
    - id: "alerts"
      params:
        cacheRetention: "none"
```

配置合并顺序：

1. `agents.defaults.params`（全局默认值 — 适用于所有模型）
2. `agents.defaults.models["provider/model"].params`（按模型覆盖）
3. `agents.list[].params`（匹配代理 ID；按键覆盖）

### 旧版 `cacheControlTtl`

仍然接受并映射旧版值：

- `5m` -> `short`
- `1h` -> `long`

对于新配置，首选 `cacheRetention`。

### `contextPruning.mode: "cache-ttl"`

在缓存 TTL 窗口后修剪旧的工具结果上下文，以防止空闲后的请求重新缓存过大的历史记录。

```yaml
agents:
  defaults:
    contextPruning:
      mode: "cache-ttl"
      ttl: "1h"
```

有关完整行为，请参阅[会话修剪](/en/concepts/session-pruning)。

### Heartbeat 保持活跃

Heartbeat 可以保持缓存窗口处于活跃状态，并减少空闲间隙后重复的缓存写入。

```yaml
agents:
  defaults:
    heartbeat:
      every: "55m"
```

支持在 `agents.list[].heartbeat` 处进行每个代理的 heartbeat 设置。

## 提供商行为

### Anthropic（直接 API）

- 支持 `cacheRetention`。
- 对于 Anthropic API 密钥身份验证配置文件，如果未设置，OpenClaw 会为 Anthropic 模型引用预设 `cacheRetention: "short"`。

### Amazon Bedrock

- Anthropic Claude 模型引用（`amazon-bedrock/*anthropic.claude*`）支持显式的 `cacheRetention` 透传。
- 非 Anthropic Bedrock 模型在运行时被强制设置为 `cacheRetention: "none"`。

### OpenRouter Anthropic 模型

对于 `openrouter/anthropic/*` 模型引用，OpenClaw 会在系统/开发者提示词块上注入 Anthropic `cache_control`，以提高提示词缓存的重用率。

### 其他提供商

如果提供商不支持此缓存模式，则 `cacheRetention` 无效。

## 调优模式

### 混合流量（推荐的默认设置）

在主代理上保持长期运行的基准，在突发通知代理上禁用缓存：

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

### 成本优先的基准

- 设置基准 `cacheRetention: "short"`。
- 启用 `contextPruning.mode: "cache-ttl"`。
- 仅对受益于热缓存的代理，将心跳保持在 TTL 以下。

## 缓存诊断

OpenClaw 为嵌入式代理运行暴露了专用的缓存跟踪诊断功能。

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

### 环境变量切换（一次性调试）

- `OPENCLAW_CACHE_TRACE=1` 启用缓存跟踪。
- `OPENCLAW_CACHE_TRACE_FILE=/path/to/cache-trace.jsonl` 覆盖输出路径。
- `OPENCLAW_CACHE_TRACE_MESSAGES=0|1` 切换完整消息负载捕获。
- `OPENCLAW_CACHE_TRACE_PROMPT=0|1` 切换提示词文本捕获。
- `OPENCLAW_CACHE_TRACE_SYSTEM=0|1` 切换系统提示词捕获。

### 检查内容

- 缓存跟踪事件为 JSONL 格式，并包含 `session:loaded`、`prompt:before`、`stream:context` 和 `session:after` 等阶段性快照。
- 每轮的缓存令牌影响通过常规使用界面可见，包括 `cacheRead` 和 `cacheWrite`（例如 `/usage full` 和会话使用摘要）。

## 快速故障排除

- 大多数轮次上的 `cacheWrite` 较高：检查是否存在易变的系统提示词输入，并验证模型/提供商是否支持您的缓存设置。
- `cacheRetention` 无效：确认模型键与 `agents.defaults.models["provider/model"]` 匹配。
- 带有缓存设置的 Bedrock Nova/Mistral 请求：预期运行时强制为 `none`。

相关文档：

- [Anthropic](/en/providers/anthropic)
- [Token Use and Costs](/en/reference/token-use)
- [Session Pruning](/en/concepts/session-pruning)
- [Gateway(网关) Configuration Reference](/en/gateway/configuration-reference)
