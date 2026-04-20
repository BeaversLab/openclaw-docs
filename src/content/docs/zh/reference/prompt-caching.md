---
title: "提示词缓存"
summary: "提示词缓存调节项、合并顺序、提供商行为以及调优模式"
read_when:
  - You want to reduce prompt token costs with cache retention
  - You need per-agent cache behavior in multi-agent setups
  - You are tuning heartbeat and cache-ttl pruning together
---

# 提示词缓存

提示词缓存意味着模型提供商可以在多轮对话中重用未改变的提示词前缀（通常是系统/开发者指令和其他稳定的上下文），而不必每次都重新处理。当上游 OpenClaw 直接提供这些计数器时，API 会将提供商的使用情况标准化为 `cacheRead` 和 `cacheWrite`。

当实时会话快照中缺少缓存计数器时，状态界面也可以从最新的转录使用日志中恢复它们，因此 `/status` 可以在部分会话元数据丢失后继续显示缓存行。现有的非零实时缓存值仍然优先于转录回退值。

为什么这很重要：降低 token 成本，加快响应速度，并为长时间运行的会话提供更可预测的性能。如果没有缓存，即使大部分输入没有变化，重复的提示词在每一轮中都要支付完整的提示词成本。

本页面涵盖所有影响提示词重用和 token 成本的与缓存相关的调节项。

提供商参考：

- Anthropic 提示词缓存：[https://platform.claude.com/docs/en/build-with-claude/prompt-caching](https://platform.claude.com/docs/en/build-with-claude/prompt-caching)
- OpenAI 提示词缓存：[https://developers.openai.com/api/docs/guides/prompt-caching](https://developers.openai.com/api/docs/guides/prompt-caching)
- OpenAI API 标头和请求 ID：[https://developers.openai.com/api/reference/overview](https://developers.openai.com/api/reference/overview)
- Anthropic 请求 ID 和错误：[https://platform.claude.com/docs/en/api/errors](https://platform.claude.com/docs/en/api/errors)

## 主要调节项

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

每个代理的覆盖：

```yaml
agents:
  list:
    - id: "alerts"
      params:
        cacheRetention: "none"
```

配置合并顺序：

1. `agents.defaults.params`（全局默认值 —— 适用于所有模型）
2. `agents.defaults.models["provider/model"].params`（按模型覆盖）
3. `agents.list[].params`（匹配代理 ID；按键覆盖）

### `contextPruning.mode: "cache-ttl"`

在缓存 TTL 窗口后修剪旧的工具结果上下文，以防止空闲后的请求重新缓存过大的历史记录。

```yaml
agents:
  defaults:
    contextPruning:
      mode: "cache-ttl"
      ttl: "1h"
```

有关完整行为，请参阅[会话修剪](/zh/concepts/session-pruning)。

### Heartbeat 保持活跃

Heartbeat 可以保持缓存窗口处于活跃状态，并减少空闲间隙后重复的缓存写入。

```yaml
agents:
  defaults:
    heartbeat:
      every: "55m"
```

在 `agents.list[].heartbeat` 支持每个代理的心跳。

## 提供商行为

### Anthropic（直接 API）

- 支持 `cacheRetention`。
- 使用 Anthropic API 密钥身份验证配置文件时，如果未设置，OpenClaw 会为 Anthropic 模型引用预设 `cacheRetention: "short"`。
- Anthropic 原生 Messages 响应同时暴露了 `cache_read_input_tokens` 和 `cache_creation_input_tokens`，因此 OpenClaw 可以同时显示 `cacheRead` 和 `cacheWrite`。
- 对于原生 Anthropic 请求，`cacheRetention: "short"` 映射到默认的 5 分钟临时缓存，而 `cacheRetention: "long"` 仅在直接 `api.anthropic.com` 主机上升级到 1 小时的 TTL。

### OpenAI（直接 API）

- 在支持的最新模型上，提示缓存是自动的。OpenClaw 不需要注入块级缓存标记。
- OpenClaw 使用 `prompt_cache_key` 保持跨轮的缓存路由稳定，并且仅在直接 OpenAI 主机上选择了 `cacheRetention: "long"` 时才使用 `prompt_cache_retention: "24h"`。
- OpenAI 响应通过 `usage.prompt_tokens_details.cached_tokens`（或在 Responses API 事件上通过 `input_tokens_details.cached_tokens`）暴露缓存的提示令牌。OpenClaw 将其映射到 `cacheRead`。
- OpenAI 不暴露单独的缓存写入令牌计数器，因此即使提供商正在预热缓存，`cacheWrite` 在 OpenAI 路径上也保持 `0`。
- OpenAI 返回有用的追踪和速率限制标头，例如 `x-request-id`、`openai-processing-ms` 和 `x-ratelimit-*`，但缓存命中统计应来自使用情况负载，而不是标头。
- 实际上，OpenAI 通常表现得像初始前缀缓存，而不是 Anthropic 风格的移动全历史重用。稳定的长前缀文本轮次在当前的实时探测中可能接近 `4864` 缓存令牌平台期，而重度工具或 MCP 风格的脚本即使在精确重复时也往往平台期接近 `4608` 个缓存令牌。

### Anthropic Vertex

- Vertex AI (`anthropic-vertex/*`) 上的 Anthropic 模型以与直接 Anthropic 相同的方式支持 `cacheRetention`。
- `cacheRetention: "long"` 映射到 Vertex AI 端点上实际的 1 小时提示缓存 TTL。
- `anthropic-vertex` 的默认缓存保留与直接 Anthropic 默认值匹配。
- Vertex 请求通过边界感知的缓存整形进行路由，以确保缓存重用与提供商实际接收到的内容保持一致。

### Amazon Bedrock

- Anthropic Claude 模型引用（`amazon-bedrock/*anthropic.claude*`）支持显式的 `cacheRetention` 透传。
- 非 Anthropic 的 Bedrock 模型在运行时被强制设置为 `cacheRetention: "none"`。

### OpenRouter Anthropic 模型

对于 `openrouter/anthropic/*` 模型引用，OpenClaw 仅在请求仍针对已验证的 OpenRouter 路由（默认端点上的 `openrouter`，或解析为 `openrouter.ai` 的任何提供商/基本 URL）时，才会在系统/开发者提示块上注入 Anthropic `cache_control`，以提高提示缓存重用率。

如果您将模型重新指向任意 OpenAI 兼容的代理 URL，OpenClaw 将停止注入那些 OpenRouter 特定的 Anthropic 缓存标记。

### 其他提供商

如果提供商不支持此缓存模式，`cacheRetention` 将无效。

### Google Gemini 直接 API

- 直接 Gemini 传输（`api: "google-generative-ai"`）通过上游 `cachedContentTokenCount` 报告缓存命中；OpenClaw 将其映射到 `cacheRead`。
- 当在直接 Gemini 模型上设置 `cacheRetention` 时，OpenClaw 会自动为 Google AI Studio 运行中的系统提示创建、重用和刷新 `cachedContents` 资源。这意味着您不再需要手动预创建缓存内容句柄。
- 您仍然可以通过 `params.cachedContent`（或旧版 `params.cached_content`）在配置的模型上传递预先存在的 Gemini 缓存内容句柄。
- 这与 Anthropic/OpenAI 提示前缀缓存是分开的。对于 Gemini，OpenClaw 管理提供商原生的 `cachedContents` 资源，而不是在请求中注入缓存标记。

### Gemini CLI JSON 用法

- Gemini CLI JSON 输出也可以通过 `stats.cached` 显示缓存命中；OpenClaw 将其映射到 `cacheRead`。
- 如果 CLI 省略了直接的 `stats.input` 值，OpenClaw 会从 `stats.input_tokens - stats.cached` 推导输入令牌。
- 这仅是使用量的标准化。这并不意味着 OpenClaw 正在为 Gemini CLI 创建 Anthropic/OpenAI 风格的提示缓存标记。

## 系统提示缓存边界

OpenClaw 将系统提示分为**稳定前缀**和**易变后缀**，两者由内部缓存前缀边界分隔。边界上方的内容（工具定义、技能元数据、工作区文件和其他相对静态的上下文）经过排序，以便在轮次之间保持字节一致。边界下方的内容（例如 `HEARTBEAT.md`、运行时时间戳和其他每轮元数据）允许更改，而不会使缓存的前缀失效。

关键设计选择：

- 稳定的工作区项目上下文文件排在 `HEARTBEAT.md` 之前，因此心跳波动不会破坏稳定的前缀。
- 该边界应用于 Anthropic 系列、OpenAI 系列、Google 和 CLI 传输塑形，因此所有支持的提供商都能从相同的前缀稳定性中受益。
- Codex 响应和 Anthropic Vertex 请求通过边界感知的缓存塑形进行路由，以使缓存重用与提供商实际接收的内容保持一致。
- 系统提示指纹经过标准化处理（空白、行尾、挂钩添加的上下文、运行时功能排序），以便语义上未更改的提示在轮次之间共享 KV/缓存。

如果在配置或工作区更改后看到意外的 `cacheWrite` 峰值，请检查更改是落在缓存边界的上方还是下方。将易变内容移至边界下方（或使其稳定）通常可以解决此问题。

## OpenClaw 缓存稳定性保护

OpenClaw 还会在请求到达提供商之前，确保多个对缓存敏感的负载形状具有确定性：

- Bundle MCP 工具目录在工具注册之前经过确定性排序，因此 `listTools()` 顺序更改不会破坏工具块并破坏提示缓存前缀。
- 具有持久化图像块的旧版会话会保持**最近 3 个完成的轮次**完整；较早的已处理图像块可能会被标记替换，以免图像密集的后续操作不断重新发送大量过时负载。

## 调优模式

### 混合流量（推荐的默认设置）

在主代理上保留长期基线，在突发通知代理上禁用缓存：

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
- 仅对受益于预热缓存的 Agent，将心跳保持在 TTL 以下。

## 缓存诊断

OpenClaw 为嵌入式 Agent 运行暴露了专用的缓存跟踪诊断。

对于面向用户的常规诊断，当实时会话条目中没有这些计数器时，`/status` 和其他使用摘要可以将最新的对话使用条目作为 `cacheRead` /
`cacheWrite` 的回退源。

## 实时回归测试

OpenClaw 为重复前缀、工具轮次、图像轮次、MCP 风格工具对话以及 Anthropic 无缓存控制维护一个综合的实时缓存回归网关。

- `src/agents/live-cache-regression.live.test.ts`
- `src/agents/live-cache-regression-baseline.ts`

使用以下命令运行窄的实时网关：

```sh
OPENCLAW_LIVE_TEST=1 OPENCLAW_LIVE_CACHE_TEST=1 pnpm test:live:cache
```

基线文件存储最近观察到的实时数据加上测试使用的特定于提供商的回归下限。运行器还使用每次运行的新会话 ID 和提示命名空间，以免之前的缓存状态污染当前的回归样本。

这些测试故意不在各提供商之间使用相同的成功标准。

### Anthropic 实时期望

- 期望通过 `cacheWrite` 进行显式预热写入。
- 在重复轮次上期望近乎完整的历史记录重用，因为 Anthropic 缓存控制会在对话中推进缓存断点。
- 当前的实时断言仍对稳定、工具和图像路径使用高命中率阈值。

### OpenAI 实时期望

- 仅期望 `cacheRead`。`cacheWrite` 保持 `0`。
- 将重复轮次的缓存重用视为特定于提供商的平台期，而不是 Anthropic 风格的移动全历史记录重用。
- 当前的实时断言使用从 `gpt-5.4-mini` 上观察到的实时行为得出的保守下限检查：
  - 稳定前缀：`cacheRead >= 4608`，命中率 `>= 0.90`
  - 工具对话：`cacheRead >= 4096`，命中率 `>= 0.85`
  - 图像对话：`cacheRead >= 3840`，命中率 `>= 0.82`
  - MCP 风格的对话记录：`cacheRead >= 4096`，命中率 `>= 0.85`

2026-04-04 的新鲜综合实时验证结果为：

- 稳定前缀：`cacheRead=4864`，命中率 `0.966`
- 工具对话记录：`cacheRead=4608`，命中率 `0.896`
- 图像对话记录：`cacheRead=4864`，命中率 `0.954`
- MCP 风格的对话记录：`cacheRead=4608`，命中率 `0.891`

综合网关最近的本地挂钟时间大约为 `88s`。

断言存在差异的原因：

- Anthropic 暴露了显式缓存断点和移动的对话历史重用。
- OpenAI 的提示缓存仍然对精确前缀敏感，但在实时 Response 流量中，有效的可重用前缀可能会比完整提示更早达到平台期。
- 因此，通过单一的跨提供商百分比阈值来比较 Anthropic 和 OpenAI 会产生错误的回归。

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

- `filePath`：`$OPENCLAW_STATE_DIR/logs/cache-trace.jsonl`
- `includeMessages`：`true`
- `includePrompt`：`true`
- `includeSystem`：`true`

### 环境变量开关（一次性调试）

- `OPENCLAW_CACHE_TRACE=1` 启用缓存跟踪。
- `OPENCLAW_CACHE_TRACE_FILE=/path/to/cache-trace.jsonl` 覆盖输出路径。
- `OPENCLAW_CACHE_TRACE_MESSAGES=0|1` 切换完整消息负载捕获。
- `OPENCLAW_CACHE_TRACE_PROMPT=0|1` 切换提示文本捕获。
- `OPENCLAW_CACHE_TRACE_SYSTEM=0|1` 切换系统提示捕获。

### 检查内容

- 缓存跟踪事件为 JSONL 格式，包含 `session:loaded`、`prompt:before`、`stream:context` 和 `session:after` 等分阶段快照。
- 每次轮换的缓存 Token 影响可通过 `cacheRead` 和 `cacheWrite` 在常规使用界面中看到（例如 `/usage full` 和会话使用摘要）。
- 对于 Anthropic，当缓存处于活动状态时，预期会同时出现 `cacheRead` 和 `cacheWrite`。
- 对于 OpenAI，缓存命中时期望 `cacheRead`，而 `cacheWrite` 保持 `0`；OpenAI 不发布单独的缓存写入 token 字段。
- 如果您需要请求追踪，请将请求 ID 和速率限制头与缓存指标分开记录。OpenClaw 当前的缓存追踪输出侧重于提示词/会话形状和标准化的 token 使用情况，而不是原始提供商响应头。

## 快速故障排除

- 大多数轮次中的 `cacheWrite` 较高：检查易变的系统提示词输入，并验证模型/提供商是否支持您的缓存设置。
- 在 Anthropic 上 `cacheWrite` 较高：通常意味着缓存断点落在了每次请求都会更改的内容上。
- OpenAI 的 `cacheRead` 较低：验证稳定的前缀位于前面，重复的前缀至少为 1024 个 token，并且对于应该共享缓存的轮次重复使用相同的 `prompt_cache_key`。
- `cacheRetention` 无效：确认模型密钥与 `agents.defaults.models["provider/model"]` 匹配。
- 具有缓存设置的 Bedrock Nova/Mistral 请求：预期运行时强制 `none`。

相关文档：

- [Anthropic](/zh/providers/anthropic)
- [Token Use and Costs](/zh/reference/token-use)
- [Session Pruning](/zh/concepts/session-pruning)
- [Gateway(网关) Configuration Reference](/zh/gateway/configuration-reference)
