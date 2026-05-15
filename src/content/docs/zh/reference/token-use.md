---
summary: "OpenClaw 如何构建提示词上下文并报告 Token 使用量 + 成本"
read_when:
  - Explaining token usage, costs, or context windows
  - Debugging context growth or compaction behavior
title: "Token use and costs"
---

OpenClaw 跟踪的是 **token**，而不是字符。Token 因模型而异，但大多数 OpenAI 风格的模型对于英文文本平均每个 token 约为 4 个字符。

## 系统提示词是如何构建的

OpenClaw 在每次运行时都会自行组装其系统提示词。它包括：

- 工具列表 + 简短描述
- Skills 列表（仅包含元数据；指令会通过 `read` 按需加载）。
  紧凑的 Skills 块由 `skills.limits.maxSkillsPromptChars` 界定，
  并在 `agents.list[].skillsLimits.maxSkillsPromptChars` 处提供可选的按代理覆盖。
- 自我更新指令
- 工作区 + 引导文件（`AGENTS.md`、`SOUL.md`、`TOOLS.md`、`IDENTITY.md`、`USER.md`、`HEARTBEAT.md` 在新建时，以及 `BOOTSTRAP.md` 在存在时，加上 `MEMORY.md`）。小写的根 `memory.md` 不会被注入；它是当与 `MEMORY.md` 配对时，用于 `openclaw doctor --fix` 的旧版修复输入。大文件会被 `agents.defaults.bootstrapMaxChars` 截断（默认：12000），且总的引导注入量受 `agents.defaults.bootstrapTotalMaxChars` 限制（默认：60000）。`memory/*.md` 每日文件不是正常引导提示词的一部分；它们在普通轮次中通过内存工具按需保留，但在重置/启动模型运行时，可以在第一轮前置一个包含最近每日记忆的一次性启动上下文块。纯聊天 `/new` 和 `/reset` 命令会被确认而不调用模型。启动前奏由 `agents.defaults.startupContext` 控制。
- 时间 (UTC + 用户时区)
- 回复标签 + 心跳行为
- 运行时元数据 (主机/操作系统/模型/思考)

在 [系统提示词](/zh/concepts/system-prompt) 中查看完整细分。

## 什么会计入上下文窗口

模型收到的所有内容都会计入上下文限制：

- 系统提示词（上面列出的所有部分）
- 对话历史（用户 + 助手消息）
- 工具调用和工具结果
- 附件/转录（图像、音频、文件）
- 压缩摘要和修剪产物
- 提供商包装器或安全标头（不可见，但仍会计入）

某些运行时繁重的界面有其自己的显式上限：

- `agents.defaults.contextLimits.memoryGetMaxChars`
- `agents.defaults.contextLimits.memoryGetDefaultLines`
- `agents.defaults.contextLimits.toolResultMaxChars`
- `agents.defaults.contextLimits.postCompactionMaxChars`

每个代理的覆盖设置位于 `agents.list[].contextLimits` 下。这些控件用于
有界的运行时摘录和注入的运行时拥有的块。它们与
启动限制、启动上下文限制和技能提示限制
是分开的。

对于图像，OpenClaw 会在调用提供商之前对转录/工具图像负载进行缩小。
使用 OpenClaw`agents.defaults.imageMaxDimensionPx`（默认值：`1200`）来调整此设置：

- 较低的值通常会减少视觉 Token 的使用和负载大小。
- 较高的值可为 OCR/UI 密集型截图保留更多视觉细节。

如需实用的细分信息（每个注入的文件、工具、技能和系统提示大小），请使用 `/context list` 或 `/context detail`。请参阅 [Context](/zh/concepts/context)。

## 如何查看当前 Token 使用情况

在聊天中使用以下命令：

- `/status`API → 显示包含会话模型、上下文使用情况、
  上一次响应的输入/输出 Token 和**估算成本**（仅限 API 密钥）的**丰富表情符号状态卡**。
- `/usage off|tokens|full` → 在每次回复中附加一个**每次响应的使用情况页脚**。
  - 按会话持久化（存储为 `responseUsage`）。
  - OAuth 认证**隐藏成本**（仅显示 Token）。
- `/usage cost`OpenClaw → 显示来自 OpenClaw 会话日志的本地成本摘要。

其他界面：

- **TUI/Web TUI：** 支持 TUITUI`/status` + `/usage`。
- **CLI:** CLI`openclaw status --usage` 和 `openclaw channels list` 显示
  标准化的提供商配额窗口 (`X% left`AnthropicGitHubCLIOpenAIMiniMaxXiaomi，而非每次响应的成本)。
  当前的使用窗口提供商：Anthropic、GitHub Copilot、Gemini CLI、
  OpenAI Codex、MiniMax、Xiaomi 和 z.ai。

使用情况界面在显示之前会规范化常见的提供商原生字段别名。对于 OpenAI 系列的 Responses 流量，这包括 OpenAI`input_tokens` / `output_tokens` 和 `prompt_tokens` / `completion_tokens`，因此传输特定的字段名称不会更改 `/status`、`/usage`CLI 或会话摘要。Gemini CLI JSON 使用情况也进行了规范化：回复文本来自 `response`，而 `stats.cached` 映射到 `cacheRead`，当 CLI 省略显式的 `stats.input`CLI 字段时，使用 `stats.input_tokens - stats.cached`OpenAI。对于原生 OpenAI 系列的 Responses 流量，WebSocket/SSE 使用情况别名以相同的方式规范化，并且当 `total_tokens` 缺失或 `0` 时，总计会回退到规范化的输入 + 输出。当当前会话快照稀疏时，`/status` 和 `session_status`OpenClawOAuthAPI 还可以从最近的脚本使用情况日志中恢复令牌/缓存计数器和活动运行时模型标签。现有的非零实时值仍然优先于脚本回退值，并且当存储的总计缺失或较小时，较大的面向提示的脚本总计可以胜出。提供商配额窗口的使用情况身份验证来自提供商特定的钩子（如果可用）；否则 OpenClaw 会回退到从身份验证配置文件、环境变量或配置中匹配 OAuth/API 密钥凭据。助手脚本条目持久化相同的规范化使用情况形状，包括 `usage.cost`，当活动模型配置了定价并且提供商返回使用情况元数据时。这为 `/usage cost` 和脚本支持的会话状态提供了稳定的来源，即使在实时运行时状态消失之后。

OpenClaw 将提供商的使用统计与当前的上下文快照分开维护。提供商 OpenClaw`usage.total` 可以包含缓存的输入、输出以及多次工具循环的模型调用，因此它虽然对成本和遥测很有用，但可能会夸大实际的上下文窗口。上下文显示和诊断使用最新的提示快照（`promptTokens`，或者在无提示快照可用时使用最后一次模型调用）来用于 `context.used`。

## 成本估算（如显示）

成本是根据您的模型定价配置估算的：

```
models.providers.<provider>.models[].cost
```

这些是 `input`、`output`、`cacheRead` 和 `cacheWrite`OpenClawOAuth 的 **每 100 万个 Token 的美元价格**。如果缺少定价，OpenClaw 仅显示 Token 数量。OAuth Token 从不显示美元成本。

在 Sidecar 和通道达到 Gateway 就绪路径后，OpenClaw 会为尚未具有本地定价的已配置模型引用启动可选的后台定价引导。该引导过程会获取远程的 OpenRouter 和 LiteLLM 定价目录。设置 Gateway(网关)OpenClawOpenRouter`models.pricing.enabled: false` 可以在离线或受限网络上跳过这些目录获取；显式的 `models.providers.*.models[].cost` 条目将继续驱动本地成本估算。

## 缓存 TTL 和修剪影响

提供商提示缓存仅在缓存 TTL 窗口内适用。OpenClaw 可以选择运行 **cache-ttl 修剪**：它会在缓存 TTL 过期后修剪会话，然后重置缓存窗口，以便后续请求可以重用新缓存的上下文，而不是重新缓存整个历史记录。这会在会话空闲超过 TTL 时保持较低的缓存写入成本。

在 [Gateway 配置](<Gateway(网关)/en/gateway/configuration>) 中进行配置，并在 [Session pruning](/zh/concepts/session-pruning) 中查看行为详细信息。

心跳可以在空闲间隙期间保持缓存 **温暖（warm）**。如果您的模型缓存 TTL 是 `1h`，将心跳间隔设置为略低于该值（例如 `55m`）可以避免重新缓存完整提示，从而减少缓存写入成本。

在多代理设置中，您可以保留一个共享的模型配置，并使用 `agents.list[].params.cacheRetention` 为每个代理调整缓存行为。

有关详细的逐项指南，请参阅 [Prompt Caching](/zh/reference/prompt-caching)。

对于 Anthropic API 定价，缓存读取比输入 token 便宜得多，而缓存写入的计费倍数更高。请参阅 Anthropic 的提示词缓存定价以了解最新费率和 TTL 倍数：
[AnthropicAPIAnthropichttps://docs.anthropic.com/docs/build-with-claude/prompt-caching](https://docs.anthropic.com/docs/build-with-claude/prompt-caching)

### 示例：使用心跳保持 1 小时缓存热状态

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

### 示例：具有每个代理缓存策略的混合流量

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

`agents.list[].params` 合并在所选模型的 `params` 之上，因此您可以仅覆盖 `cacheRetention` 并继承其他模型默认值而不做更改。

### 示例：启用 Anthropic 1M 上下文 beta 标头

Anthropic 的 1M 上下文窗口目前处于 Beta 封锁阶段。当您在支持的 Opus 或 Sonnet 模型上启用 `context1m` 时，OpenClaw 可以注入所需的 AnthropicOpenClaw`anthropic-beta` 值。

```yaml
agents:
  defaults:
    models:
      "anthropic/claude-opus-4-6":
        params:
          context1m: true
```

这对应于 Anthropic 的 Anthropic`context-1m-2025-08-07` Beta 标头。

这仅当在该模型条目上设置了 `context1m: true` 时才适用。

要求：凭证必须符合长上下文使用条件。如果不符合，
Anthropic 将针对该请求返回提供商端速率限制错误。

如果您使用 OAuth/订阅令牌 (AnthropicOAuth`sk-ant-oat-*`OpenClaw) 对 Anthropic 进行身份验证，OpenClaw 将跳过 `context-1m-*`Anthropic Beta 标头，因为 Anthropic 目前会拒绝该组合并返回 HTTP 401。

## 减少 token 压力的技巧

- 使用 `/compact` 来总结长会话。
- 在工作流中修剪大型工具输出。
- 对于包含大量屏幕截图的会话，请降低 `agents.defaults.imageMaxDimensionPx`。
- 保持技能描述简短（技能列表会注入到提示词中）。
- 对于冗长、探索性的工作，首选较小的模型。

有关确切的技能列表开销公式，请参阅 [Skills](/zh/tools/skills)。

## 相关

- [API 使用和成本](API/en/reference/api-usage-costs)
- [提示词缓存](/zh/reference/prompt-caching)
- [使用情况跟踪](/zh/concepts/usage-tracking)
