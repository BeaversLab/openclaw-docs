---
summary: "提示缓存旋钮、合并顺序、提供商行为和调优模式"
title: "提示缓存"
read_when:
  - You want to reduce prompt token costs with cache retention
  - You need per-agent cache behavior in multi-agent setups
  - You are tuning heartbeat and cache-ttl pruning together
---

提示缓存意味着模型提供商可以在多轮对话中重用未更改的提示前缀（通常是系统/开发者指令和其他稳定的上下文），而不必每次都重新处理它们。当上游 API 直接暴露这些计数器时，OpenClaw 会将提供商的使用情况标准化为 `cacheRead` 和 `cacheWrite`。

当实时会话快照缺少缓存计数器时，状态表面还可以从最新的转录使用日志中恢复它们，因此 `/status` 可以在部分会话元数据丢失后继续显示缓存行。现有的非零实时缓存值仍优先于转录回退值。

为何重要：降低 token 成本，加快响应速度，并为长时间运行的会话提供更可预测的性能。如果没有缓存，即使大部分输入没有变化，重复的提示也会在每一轮中支付完整的提示成本。

以下各节涵盖了影响提示重用和 token 成本的每个与缓存相关的旋钮。

提供商参考：

- Anthropic 提示词缓存：[Anthropichttps://platform.claude.com/docs/en/build-with-claude/prompt-caching](https://platform.claude.com/docs/en/build-with-claude/prompt-caching)
- OpenAI 提示词缓存：[OpenAIhttps://developers.openai.com/api/docs/guides/prompt-caching](https://developers.openai.com/api/docs/guides/prompt-caching)
- OpenAI API 标头和请求 ID：[OpenAIAPIhttps://developers.openai.com/api/reference/overview](https://developers.openai.com/api/reference/overview)
- Anthropic 请求 ID 和错误：[Anthropichttps://platform.claude.com/docs/en/api/errors](https://platform.claude.com/docs/en/api/errors)

## 主要旋钮

### `cacheRetention`（全局默认值、模型和每个代理）

将所有模型的全局默认缓存保留设置为：

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

### `contextPruning.mode: "cache-ttl"`

在缓存 TTL 窗口之后修剪旧工具结果上下文，以便空闲后的请求不会重新缓存过大的历史记录。

```yaml
agents:
  defaults:
    contextPruning:
      mode: "cache-ttl"
      ttl: "1h"
```

有关完整行为，请参阅 [Session Pruning](/zh/concepts/session-pruning)。

### 心跳保温

心跳可以使缓存窗口保持热度，并减少空闲间隔后的重复缓存写入。

```yaml
agents:
  defaults:
    heartbeat:
      every: "55m"
```

`agents.list[].heartbeat` 支持每个代理的心跳。

## 提供商行为

### Anthropic (直接 API)

- 支持 `cacheRetention`。
- 使用 Anthropic API 密钥身份验证配置文件时，如果未设置，OpenClaw 会为 Anthropic 模型引用设定 `cacheRetention: "short"` 种子值。
- Anthropic 原生 Messages 响应会同时暴露 `cache_read_input_tokens` 和 `cache_creation_input_tokens`，因此 OpenClaw 可以同时显示 `cacheRead` 和 `cacheWrite`。
- 对于原生 Anthropic 请求，`cacheRetention: "short"` 映射到默认的 5 分钟临时缓存，而 `cacheRetention: "long"` 仅在直接 `api.anthropic.com` 主机上升级为 1 小时 TTL。

### OpenAI (直接 API)

- 在支持的最新模型上，提示词缓存是自动的。OpenClaw 不需要注入块级缓存标记。
- OpenClaw 使用 OpenClaw`prompt_cache_key`OpenAI 来保持跨轮次的缓存路由稳定。当选择 `cacheRetention: "long"` 时，直连 OpenAI 主机使用 `prompt_cache_retention: "24h"`。
- 兼容 OpenAI 的 Completions 提供商仅在其模型配置显式设置 `compat.supportsPromptCacheKey: true` 时才会收到 OpenAI`prompt_cache_key`；在该相同的加入设置下，显式 `cacheRetention: "long"` 也会转发 `prompt_cache_retention: "24h"`，而 `cacheRetention: "none"` 会同时抑制这两个字段。
- OpenAI 响应通过 OpenAI`usage.prompt_tokens_details.cached_tokens`（或在 Responses API 事件上的 `input_tokens_details.cached_tokens`APIOpenClaw）公开缓存的提示词 token。OpenClaw 将其映射到 `cacheRead`。
- OpenAI 未公开单独的缓存写入 token 计数器，因此即使提供商正在预热缓存，OpenAI`cacheWrite` 在 OpenAI 路径上仍保持 `0`OpenAI。
- OpenAI 返回有用的跟踪和速率限制标头，例如 OpenAI`x-request-id`、`openai-processing-ms` 和 `x-ratelimit-*`，但缓存命中计费应来自 usage payload，而非标头。
- 在实践中，OpenAI 的行为通常类似于初始前缀缓存，而不是 Anthropic 风格的移动全历史重用。稳定的长前缀文本轮次在当前的实时探测中可能接近 OpenAIAnthropic`4864` 缓存 token 平台，而重度工具或 MCP 风格的记录即使在完全重复时也通常在 `4608` 缓存 token 附近趋于平稳。

### Anthropic Vertex

- Vertex AI 上的 Anthropic 模型 (Anthropic`anthropic-vertex/*`) 支持直接连接 Anthropic 同样的 `cacheRetention`Anthropic 方式。
- `cacheRetention: "long"` 映射到 Vertex AI 端点上真实的 1 小时提示缓存 TTL。
- `anthropic-vertex`Anthropic 的默认缓存保留与直接连接 Anthropic 的默认设置相匹配。
- Vertex 请求通过边界感知的缓存整形进行路由，以确保缓存重用与提供商实际接收到的内容保持一致。

### Amazon Bedrock

- Anthropic Claude 模型引用 (Anthropic`amazon-bedrock/*anthropic.claude*`) 支持显式 `cacheRetention` 透传。
- 非 Anthropic 的 Bedrock 模型在运行时被强制使用 Anthropic`cacheRetention: "none"`。

### OpenRouter 模型

对于 `openrouter/anthropic/*`OpenClawAnthropic 模型引用，仅当请求仍针对已验证的 OpenRouter 路由（其默认端点上的 `openrouter`，或任何解析为 `openrouter.ai` 的提供商/基础 URL）时，OpenClaw 才会在系统/开发者提示块上注入 Anthropic `cache_control`OpenRouter 以提高提示缓存复用率。

对于 `openrouter/deepseek/*`、`openrouter/moonshot*/*` 和 `openrouter/zai/*` 模型引用，允许使用 `contextPruning.mode: "cache-ttl"`OpenRouterOpenClawAnthropic，因为 OpenRouter 会自动处理提供商端的提示缓存。OpenClaw 不会在这些请求中注入 Anthropic `cache_control` 标记。

DeepSeek 缓存构建是尽力而为的，可能需要几秒钟。立即的后续请求可能仍显示 `cached_tokens: 0`；请在短暂延迟后通过重复的相同前缀请求进行验证，并将 `usage.prompt_tokens_details.cached_tokens` 用作缓存命中信号。

如果您将模型重新指向任意 OpenAI 兼容的代理 URL，OpenClaw
将停止注入那些特定于 OpenRouter 的 Anthropic 缓存标记。

### 其他提供商

如果提供商不支持此缓存模式，`cacheRetention` 将无效。

### Google Gemini 直接 API

- 直接 Gemini 传输 (`api: "google-generative-ai"`) 通过上游 `cachedContentTokenCount`OpenClaw 报告缓存命中；OpenClaw 将其映射为 `cacheRead`。
- 当在直接 Gemini 模型上设置 `cacheRetention`OpenClaw 时，OpenClaw 会在 Google AI Studio 运行中为系统提示自动创建、重用和刷新 `cachedContents` 资源。这意味着您不再需要手动预创建缓存内容的句柄。
- 您仍然可以通过配置的模型传入预先存在的 Gemini 缓存内容句柄，作为 `params.cachedContent`（或旧版的 `params.cached_content`）。
- 这与 Anthropic/OpenAI 提示前缀缓存是分开的。对于 Gemini，OpenClaw 管理提供商原生的 AnthropicOpenAIOpenClaw`cachedContents` 资源，而不是在请求中注入缓存标记。

### Gemini CLI JSON 使用情况

- Gemini CLI JSON 输出也可以通过 CLI`stats.cached`OpenClaw 显示缓存命中；OpenClaw 将其映射到 `cacheRead`。
- 如果 CLI 省略了直接的 CLI`stats.input`OpenClaw 值，OpenClaw 会从 `stats.input_tokens - stats.cached` 推导输入令牌。
- 这仅是使用情况的规范化。并不意味着 OpenClaw 正在为 Gemini Anthropic 创建 OpenAI/CLI 风格的提示缓存标记。

## 系统提示缓存边界

OpenClaw 将系统提示分成一个**稳定前缀**和一个**易变后缀**，由内部缓存前缀边界分隔。边界上方的内容（工具定义、技能元数据、工作区文件和其他相对静态的上下文）经过排序，以便在轮次之间保持字节完全相同。边界下方的内容（例如 OpenClaw`HEARTBEAT.md`、运行时时间戳和其他每轮元数据）允许更改，而不会使缓存的前缀失效。

关键设计选择：

- 稳定的工作区项目上下文文件被排序在 `HEARTBEAT.md` 之前，因此心跳波动不会破坏稳定的前缀。
- 该边界应用于 Anthropic 系列、OpenAI 系列、Google 和 CLI 传输塑形，以便所有支持的提供商都能从相同的前缀稳定性中受益。
- Codex 响应和 Anthropic Vertex 请求会通过边界感知的缓存塑形进行路由，以确保缓存重用与提供商实际接收的内容保持一致。
- 系统提示指纹会进行标准化处理（包括空白字符、换行符、Hook 添加的上下文、运行时能力排序），以便语义未变的提示在不同轮次间共享 KV/缓存。

如果您在配置或工作区更改后发现 `cacheWrite` 出现意外峰值，请检查更改是位于缓存边界的上方还是下方。将易变内容移至边界下方（或使其稳定）通常可以解决此问题。

## OpenClaw 缓存稳定性守护

OpenClaw 还会在请求到达提供商之前，对多个敏感于缓存的负载形状进行确定性处理：

- Bundle MCP 工具目录在工具注册之前进行确定性排序，因此 `listTools()` 顺序的更改不会搅动工具块并破坏提示缓存前缀。
- 具有持久化图像块的旧版会话会保持 **最近 3 个已完成的轮次** 完整；较旧的已处理图像块可能会被标记替换，以便繁重的图像后续跟进不会继续重新发送过时的大负载。

## 调优模式

### 混合流量（推荐默认设置）

在主代理上保持长期运行的基准线，在突发通知代理上禁用缓存：

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

### 成本优先基准线

- 设置基准 `cacheRetention: "short"`。
- 启用 `contextPruning.mode: "cache-ttl"`。
- 仅对于受益于预热缓存的代理，将心跳保持在您的 TTL 以下。

## 缓存诊断

OpenClaw 为嵌入式代理运行提供专门的缓存跟踪诊断。

对于面向普通用户的诊断信息，当实时会话条目缺少这些计数器时，`/status` 和其他使用情况摘要可以使用最新的记录使用情况条目作为 `cacheRead` /
`cacheWrite` 的备用来源。

## 实时回归测试

OpenClaw 为重复的前缀、工具轮次、图像轮次、MCP 风格的工具转录以及 Anthropic 无缓存控制保留一个组合的实时缓存回归门控。

- `src/agents/live-cache-regression.live.test.ts`
- `src/agents/live-cache-regression-baseline.ts`

运行以下命令来执行窄范围实时门控：

```sh
OPENCLAW_LIVE_TEST=1 OPENCLAW_LIVE_CACHE_TEST=1 pnpm test:live:cache
```

基准文件存储了最近观察到的实时数据加上测试使用的特定于提供商的回归下限。运行器还为每次运行使用新的会话 ID 和提示命名空间，以免之前的缓存状态污染当前的回归样本。

这些测试有意不在各提供商之间使用相同的成功标准。

### Anthropic 实时预期

- 预期通过 `cacheWrite` 进行显式的预热写入。
- 预期在重复轮次中几乎完全复用历史记录，因为 Anthropic 缓存控制会推进对话中的缓存断点。
- 当前的实时断言仍对稳定路径、工具路径和图像路径使用高命中率阈值。

### OpenAI 实时预期

- 仅预期 `cacheRead`。 `cacheWrite` 保持 `0`。
- 将重复轮次的缓存复用视为特定于提供商的平台期，而不是 Anthropic 风格的移动全历史记录复用。
- 当前的实时断言使用保守的下限检查，这些检查基于 `gpt-5.4-mini` 上的观察到的实时行为：
  - 稳定前缀： `cacheRead >= 4608`，命中率 `>= 0.90`
  - 工具记录： `cacheRead >= 4096`，命中率 `>= 0.85`
  - 图像记录： `cacheRead >= 3840`，命中率 `>= 0.82`
  - MCP 风格记录： `cacheRead >= 4096`，命中率 `>= 0.85`

2026-04-04 的最新综合实时验证结果为：

- 稳定前缀： `cacheRead=4864`，命中率 `0.966`
- 工具记录： `cacheRead=4608`，命中率 `0.896`
- 图像记录： `cacheRead=4864`，命中率 `0.954`
- MCP 风格记录： `cacheRead=4608`，命中率 `0.891`

最近本地组合网关的挂钟时间约为 `88s`。

断言为何不同：

- Anthropic 提供了显式的缓存断点和移动的对话历史记录复用。
- OpenAI 的提示词缓存仍然对精确前缀敏感，但在实时 Responses 流量中，有效的可复用前缀可能会比完整提示词更早达到平台期。
- 因此，通过单一跨提供商百分比阈值比较 Anthropic 和 OpenAI 会产生错误的回归。

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

- `filePath`： `$OPENCLAW_STATE_DIR/logs/cache-trace.jsonl`
- `includeMessages`： `true`
- `includePrompt`： `true`
- `includeSystem`： `true`

### 环境变量切换（一次性调试）

- `OPENCLAW_CACHE_TRACE=1` 启用缓存跟踪。
- `OPENCLAW_CACHE_TRACE_FILE=/path/to/cache-trace.jsonl` 覆盖输出路径。
- `OPENCLAW_CACHE_TRACE_MESSAGES=0|1` 切换完整消息负载捕获。
- `OPENCLAW_CACHE_TRACE_PROMPT=0|1` 切换提示词文本捕获。
- `OPENCLAW_CACHE_TRACE_SYSTEM=0|1` 切换系统提示词捕获。

### 检查内容

- 缓存跟踪事件是 JSONL 格式，并包含 `session:loaded`、`prompt:before`、`stream:context` 和 `session:after` 等分阶段快照。
- 每轮对话的缓存令牌影响通过 `cacheRead` 和 `cacheWrite` 在正常使用界面中可见（例如 `/usage full` 和会话使用摘要）。
- 对于 Anthropic，当缓存处于活动状态时，预期会出现 `cacheRead` 和 `cacheWrite`。
- 对于 OpenAI，在缓存命中时期望出现 `cacheRead`，而 `cacheWrite` 保持 `0`；OpenAI 不发布单独的缓存写入令牌字段。
- 如果您需要请求跟踪，请将请求 ID 和速率限制标头与缓存指标分开记录。OpenClaw 当前的 cache-trace 输出侧重于提示词/会话形状和标准化的 Token 使用情况，而不是原始提供商响应标头。

## 快速故障排除

- 大多数轮次中的 `cacheWrite` 较高：检查是否存在不稳定的系统提示词输入，并验证模型/提供商是否支持您的缓存设置。
- Anthropic 上的 `cacheWrite` 较高：通常意味着缓存断点落在每次请求都会更改的内容上。
- OpenAI 的 `cacheRead` 较低：验证稳定的前缀位于最前面，重复的前缀至少为 1024 个令牌，并且对于应该共享缓存的轮次重复使用相同的 `prompt_cache_key`。
- `cacheRetention` 无效：确认模型密钥与 `agents.defaults.models["provider/model"]` 匹配。
- 带有缓存设置的 Bedrock Nova/Mistral 请求：预期的运行时强制为 `none`。

相关文档：

- [Anthropic](/zh/providers/anthropic)
- [令牌使用和成本](/zh/reference/token-use)
- [会话修剪](/zh/concepts/session-pruning)
- [Gateway(网关) 配置参考](/zh/gateway/configuration-reference)

## 相关

- [令牌使用和成本](/zh/reference/token-use)
- [API 使用和成本](/zh/reference/api-usage-costs)
