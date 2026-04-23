---
summary: "OpenClaw 如何构建提示词上下文并报告 Token 使用量 + 成本"
read_when:
  - Explaining token usage, costs, or context windows
  - Debugging context growth or compaction behavior
title: "Token 使用与成本"
---

# Token 使用与成本

OpenClaw 追踪的是 **tokens**，而不是字符。Token 是特定于模型的，但对于英文文本，大多数 OpenAI 风格的模型平均每个 Token 约为 4 个字符。

## 系统提示词是如何构建的

OpenClaw 在每次运行时都会组装自己的系统提示词。它包括：

- 工具列表 + 简短描述
- Skills 列表（仅限元数据；指令按需加载 `read`）。
  紧凑的 Skills 块以 `skills.limits.maxSkillsPromptChars` 为界，
  并在 `agents.list[].skillsLimits.maxSkillsPromptChars` 处提供可选的每个代理的覆盖。
- 自我更新指令
- 工作区 + 引导文件（`AGENTS.md`、`SOUL.md`、`TOOLS.md`、`IDENTITY.md`、`USER.md`、`HEARTBEAT.md`、新建时的 `BOOTSTRAP.md`，以及存在时的 `MEMORY.md` 或作为小写回退的 `memory.md`）。大文件会被 `agents.defaults.bootstrapMaxChars` 截断（默认值：12000），并且总的引导注入量受 `agents.defaults.bootstrapTotalMaxChars` 限制（默认值：60000）。`memory/*.md` 每日文件不属于常规引导提示的一部分；它们在普通轮次中通过内存工具按需加载，但纯 `/new` 和 `/reset` 可以在第一回合前置一个包含近期每日记忆的一次性启动上下文块。该启动前言由 `agents.defaults.startupContext` 控制。
- 时间 (UTC + 用户时区)
- 回复标签 + 心跳行为
- 运行时元数据 (主机/操作系统/模型/思考)

有关完整细分，请参阅 [系统提示](/zh/concepts/system-prompt)。

## 上下文窗口中包含的内容

模型接收到的所有内容都计入上下文限制：

- 系统提示词（上面列出的所有部分）
- 对话历史（用户 + 助手消息）
- 工具调用和工具结果
- 附件/转录（图像、音频、文件）
- 压缩摘要和修剪产物
- 提供商包装器或安全标头（不可见，但仍被计算在内）

一些运行时繁重的界面有其明确的限制：

- `agents.defaults.contextLimits.memoryGetMaxChars`
- `agents.defaults.contextLimits.memoryGetDefaultLines`
- `agents.defaults.contextLimits.toolResultMaxChars`
- `agents.defaults.contextLimits.postCompactionMaxChars`

每个代理的覆盖设置位于 `agents.list[].contextLimits` 下。这些调节旋钮用于
有界运行时摘录和注入的运行时拥有块。它们与
引导限制、启动上下文限制和 Skills 提示限制是分开的。

对于图像，OpenClaw 在提供商调用之前会对转录/工具图像负载进行下采样。
使用 `agents.defaults.imageMaxDimensionPx`（默认值：`1200`）对此进行调整：

- 较低的值通常会减少视觉 Token 的使用量和负载大小。
- 较高的值可以为 OCR/UI 密集型截图保留更多视觉细节。

如需实用的细分（按注入的文件、工具、技能和系统提示大小），请使用 `/context list` 或 `/context detail`。请参阅 [上下文](/zh/concepts/context)。

## 如何查看当前 Token 使用量

在聊天中使用以下命令：

- `/status` → **表情符号丰富的状态卡片**，包含会话模型、上下文使用情况、
  上次响应输入/输出令牌数以及**预估费用**（仅限 API 密钥）。
- `/usage off|tokens|full` → 在每条回复后附加**每次响应的使用页脚**。
  - 按会话持久化（存储为 `responseUsage`）。
  - OAuth 认证**隐藏费用**（仅显示令牌）。
- `/usage cost` → 显示来自 OpenClaw 会话日志的本地费用摘要。

其他界面：

- **TUI/Web TUI：** 支持 `/status` 和 `/usage`。
- **CLI：** `openclaw status --usage` 和 `openclaw channels list` 显示
  规范化的提供商配额窗口（`X% left`，而非每次响应的费用）。
  当前支持使用窗口的提供商：Anthropic、GitHub Copilot、Gemini CLI、
  OpenAI Codex、MiniMax、Xiaomi 和 z.ai。

使用情况界面会在显示前规范化常见的提供商原生字段别名。
对于 OpenAI 系列响应流量，这包括 `input_tokens` /
`output_tokens` 和 `prompt_tokens` / `completion_tokens`，因此特定于传输的
字段名称不会改变 `/status`、`/usage` 或会话摘要。
Gemini CLI JSON 使用情况也会被规范化：回复文本来自 `response`，并且
当 CLI 省略显式 `stats.input` 字段时，`stats.cached` 会映射到 `cacheRead` 并使用 `stats.input_tokens - stats.cached`。
对于原生 OpenAI 系列响应流量，WebSocket/SSE 使用情况别名
以相同方式规范化，当 `total_tokens` 缺失或 `0` 时，总计会回退到规范化输入 + 输出。
当当前会话快照稀疏时，`/status` 和 `session_status` 也可以
从最新的转录使用日志中恢复令牌/缓存计数器和活动运行时模型标签。现有的非零实时值仍
优先于转录回退值，当存储的总计缺失或较小时，较大的面向提示的
转录总计可能会胜出。
提供商配额窗口的使用情况授权来自提供商特定的挂钩（如果可用）；
否则 OpenClaw 会回退到从授权配置文件、环境或配置中匹配 OAuth/API 密钥凭据。
助手转录条目保留相同的规范化使用情况形状，包括
当活动模型配置了定价且提供商返回使用元数据时的 `usage.cost`。这为 `/usage cost` 和转录支持的会话
状态提供了稳定的来源，即使在实时运行时状态消失之后。

## 成本估算（如显示）

成本是根据您的 CLI 定价配置估算的：

```
models.providers.<provider>.models[].cost
```

这些是 `input`、`output`、`cacheRead` 和
`cacheWrite` 的 **每 100 万 token 美元价格**。如果缺少定价，OpenClaw 仅显示 token。OAuth token
从不显示美元成本。

## 缓存 TTL 和修剪影响

提供商提示缓存仅在缓存 TTL 窗口内适用。OpenClaw 可以选择运行**缓存 TTL 修剪**：它会在缓存 TTL 过期后修剪会话，然后重置缓存窗口，以便后续请求可以重用新缓存的上下文，而不是重新缓存完整历史记录。这会在会话闲置超过 TTL 时保持较低的缓存写入成本。

在 [Gateway(网关) 配置](/zh/gateway/configuration) 中进行配置，并在 [会话修剪](/zh/concepts/session-pruning) 中查看
行为详细信息。

心跳可以在空闲间隙保持缓存“**温暖**”。如果您的模型缓存 TTL
为 `1h`，将心跳间隔设置为略低于该值（例如 `55m`）可以避免
重新缓存完整提示词，从而降低缓存写入成本。

在多代理设置中，您可以保留一个共享模型配置，并使用 `agents.list[].params.cacheRetention`
针对每个代理调整缓存行为。

有关详细的逐项控制指南，请参阅 [提示词缓存](/zh/reference/prompt-caching)。

对于 Anthropic API 定价，缓存读取比输入
token 便宜得多，而缓存写入则按更高的倍率计费。请参阅 Anthropic
的提示词缓存定价以获取最新费率和 TTL 倍率：
[https://docs.anthropic.com/docs/build-with-claude/prompt-caching](https://docs.anthropic.com/docs/build-with-claude/prompt-caching)

### 示例：使用心跳保持 1 小时缓存热度

```yaml
agents:
  defaults:
    model:
      primary: "anthropic/claude-opus-4-6"
    models:
      "anthropic/claude-opus-4-6":
        params:
          cacheRetention: "long"
    heartbeat:
      every: "55m"
```

### 示例：使用每个智能体的缓存策略处理混合流量

```yaml
agents:
  defaults:
    model:
      primary: "anthropic/claude-opus-4-6"
    models:
      "anthropic/claude-opus-4-6":
        params:
          cacheRetention: "long" # default baseline for most agents
  list:
    - id: "research"
      default: true
      heartbeat:
        every: "55m" # keep long cache warm for deep sessions
    - id: "alerts"
      params:
        cacheRetention: "none" # avoid cache writes for bursty notifications
```

`agents.list[].params` 在所选模型的 `params` 之上合并，因此您可以
仅覆盖 `cacheRetention` 并继承其他模型默认值而不作更改。

### 示例：启用 Anthropic 1M 上下文 beta 标头

Anthropic 的 1M 上下文窗口目前处于测试版封测阶段。当您在支持的 Opus
或 Sonnet 模型上启用 `context1m` 时，OpenClaw 可以注入
所需的 `anthropic-beta` 值。

```yaml
agents:
  defaults:
    models:
      "anthropic/claude-opus-4-6":
        params:
          context1m: true
```

这映射到 Anthropic 的 `context-1m-2025-08-07` 测试版标头。

这仅当在该模型条目上设置了 `context1m: true` 时才适用。

要求：凭证必须符合长上下文使用条件。如果不符合，Anthropic 将返回提供商端速率限制错误。

如果您使用 Anthropic/订阅 token (`sk-ant-oat-*`) 对 OAuth 进行身份验证，
OpenClaw 将跳过 `context-1m-*` 测试版标头，因为 Anthropic 目前
会拒绝该组合并返回 HTTP 401。

## 减少 token 压力的技巧

- 使用 `/compact` 来总结长会话。
- 在工作流中裁剪大型工具输出。
- 对于包含大量屏幕截图的会话，请降低 `agents.defaults.imageMaxDimensionPx`。
- 保持技能描述简短（技能列表会注入到提示词中）。
- 对于冗长、探索性的工作，优先使用较小的模型。

有关确切的技能列表开销公式，请参阅 [Skills](/zh/tools/skills)。
