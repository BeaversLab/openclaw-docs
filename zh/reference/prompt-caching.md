---
title: "Prompt Caching"
summary: "Prompt caching knobs, merge order, 提供商 behavior, and tuning patterns"
read_when:
  - You want to reduce prompt token costs with cache retention
  - You need per-agent cache behavior in multi-agent setups
  - You are tuning heartbeat and cache-ttl pruning together
---

# Prompt caching

Prompt caching means the 模型 提供商 can reuse unchanged prompt prefixes (usually system/developer instructions and other stable context) across turns instead of re-processing them every time. The first matching request writes cache tokens (`cacheWrite`), and later matching requests can read them back (`cacheRead`).

Why this matters: lower token cost, faster responses, and more predictable performance for long-running sessions. Without caching, repeated prompts pay the full prompt cost on every turn even when most input did not change.

This page covers all cache-related knobs that affect prompt reuse and token cost.

For Anthropic pricing details, see:
[https://docs.anthropic.com/docs/build-with-claude/prompt-caching](https://docs.anthropic.com/docs/build-with-claude/prompt-caching)

## Primary knobs

### `cacheRetention` (模型 and per-agent)

Set cache retention on 模型 params:

```yaml
agents:
  defaults:
    models:
      "anthropic/claude-opus-4-6":
        params:
          cacheRetention: "short" # none | short | long
```

Per-agent override:

```yaml
agents:
  list:
    - id: "alerts"
      params:
        cacheRetention: "none"
```

Config merge order:

1. `agents.defaults.models["provider/model"].params`
2. `agents.list[].params` (matching agent id; overrides by key)

### Legacy `cacheControlTtl`

Legacy values are still accepted and mapped:

- `5m` -> `short`
- `1h` -> `long`

Prefer `cacheRetention` for new config.

### `contextPruning.mode: "cache-ttl"`

Prunes old 工具-result context after cache TTL windows so post-idle requests do not re-cache oversized history.

```yaml
agents:
  defaults:
    contextPruning:
      mode: "cache-ttl"
      ttl: "1h"
```

See [Session Pruning](/zh/concepts/session-pruning) for full behavior.

### Heartbeat keep-warm

Heartbeat can keep cache windows warm and reduce repeated cache writes after idle gaps.

```yaml
agents:
  defaults:
    heartbeat:
      every: "55m"
```

Per-agent heartbeat is supported at `agents.list[].heartbeat`.

## Provider behavior

### Anthropic (direct API)

- `cacheRetention` is supported.
- With Anthropic API-key auth profiles, OpenClaw seeds `cacheRetention: "short"` for Anthropic 模型 refs when unset.

### Amazon Bedrock

- Anthropic Claude 模型引用 (`amazon-bedrock/*anthropic.claude*`) 支持显式的 `cacheRetention` 直通。
- 非 Anthropic Bedrock 模型在运行时被强制 `cacheRetention: "none"`。

### OpenRouter Anthropic 模型

对于 `openrouter/anthropic/*` 模型引用，OpenClaw 会在系统/开发人员提示块上注入 Anthropic `cache_control`，以提高提示缓存的复用率。

### 其他提供商

如果提供商不支持此缓存模式，`cacheRetention` 将无效。

## 调优模式

### 混合流量（推荐默认值）

在主代理上保持长期存在的基准，在突发通知代理上禁用缓存：

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
- 仅对受益于预热缓存的代理，将其心跳保持在 TTL 之下。

## 缓存诊断

OpenClaw 为嵌入式代理运行提供专用的缓存跟踪诊断。

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

### 环境开关（一次性调试）

- `OPENCLAW_CACHE_TRACE=1` 启用缓存跟踪。
- `OPENCLAW_CACHE_TRACE_FILE=/path/to/cache-trace.jsonl` 覆盖输出路径。
- `OPENCLAW_CACHE_TRACE_MESSAGES=0|1` 切换完整消息负载捕获。
- `OPENCLAW_CACHE_TRACE_PROMPT=0|1` 切换提示文本捕获。
- `OPENCLAW_CACHE_TRACE_SYSTEM=0|1` 切换系统提示捕获。

### 检查内容

- 缓存跟踪事件为 JSONL 格式，包含分阶段快照，如 `session:loaded`、`prompt:before`、`stream:context` 和 `session:after`。
- 每次轮换的缓存令牌影响可通过 `cacheRead` 和 `cacheWrite` 在正常使用界面中查看（例如 `/usage full` 和会话使用摘要）。

## 快速故障排除

- 大多数轮次的高 `cacheWrite`：检查不稳定的系统提示词输入，并验证模型/提供商是否支持您的缓存设置。
- `cacheRetention` 无效：确认模型密钥与 `agents.defaults.models["provider/model"]` 匹配。
- 带有缓存设置的 Bedrock Nova/Mistral 请求：预期运行时强制 `none`。

相关文档：

- [Anthropic](/zh/providers/anthropic)
- [Token Use and Costs](/zh/reference/token-use)
- [Session Pruning](/zh/concepts/session-pruning)
- [Gateway Configuration Reference](/zh/gateway/configuration-reference)

import en from "/components/footer/en.mdx";

<en />
