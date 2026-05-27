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

详见 [System Prompt](/zh/concepts/system-prompt)。

在记录凭证或身份验证代码片段时，请使用
[Secret Placeholder Conventions](/zh/reference/secret-placeholder-conventions)，以
避免纯文档更改导致密钥扫描器产生误报。

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

针对每个代理的覆盖配置位于 `agents.list[].contextLimits` 下。这些控制项用于有界运行时摘录和注入的运行时拥有的块。它们与引导限制、启动上下文限制和技能提示限制是分开的。

对于图像，OpenClaw 会在提供商调用前对转录/工具图像负载进行缩小。使用 `agents.defaults.imageMaxDimensionPx`（默认值：`1200`）对此进行调整：

- 较低的值通常会减少视觉 Token 的使用量和负载大小。
- 较高的值可以为 OCR/UI 密集型截图保留更多视觉细节。

如需查看实用细分（按注入的文件、工具、技能和系统提示大小），请使用 `/context list` 或 `/context detail`。请参阅 [Context](/zh/concepts/context)。

## 如何查看当前 Token 使用量

在聊天中使用以下命令：

- `/status` → **丰富的表情符号状态卡片**，显示会话模型、上下文使用情况、
  上次响应的输入/输出 token，以及在为活动模型配置了本地定价时的**预估成本**。
- `/usage off|tokens|full` → 在每次回复中附加一个 **每次响应的使用页脚**。
  - 在每个会话中持久保存（存储为 `responseUsage`）。
  - `/usage full` 仅当 OpenClaw 拥有使用元数据和
    活动模型的本地定价时才显示预估成本。否则，它仅显示 token。
- `/usage cost` → 显示来自 OpenClaw 会话日志的本地成本汇总。

其他界面：

- **TUI/Web TUI：** 支持 `/status` + `/usage`。
- **CLI：** `openclaw status --usage` 和 `openclaw channels list` 显示
  标准化的提供商配额窗口（`X% left`，而非每次响应的成本）。
  当前支持使用窗口的提供商：Anthropic、GitHub Copilot、Gemini CLI、
  OpenAI Codex、MiniMax、Xiaomi 和 z.ai。

Usage surfaces 在显示前会对通用提供商原生的字段别名进行标准化。
对于 OpenAI 系 Responses 流量，这包括 `input_tokens` /
`output_tokens` 和 `prompt_tokens` / `completion_tokens`，因此特定于传输的
字段名称不会更改 `/status`、`/usage` 或会话摘要。
Gemini CLI JSON 使用情况也进行了标准化：回复文本来自 `response`，
且当 CLI 省略显式 `stats.input` 字段时，
`stats.cached` 映射到 `cacheRead` 并使用 `stats.input_tokens - stats.cached`。
对于原生 OpenAI 系 Responses 流量，WebSocket/SSE 使用别名以
相同方式标准化，并且当 `total_tokens` 缺失或 `0` 时，
总数会回退到标准化的输入 + 输出。
当当前会话快照稀疏时，`/status` 和 `session_status` 也可以
从最新的记录使用日志中恢复 token/缓存 计数器和活动运行时模型标签。现有的非零实时值仍然
优先于记录回退值，并且当存储的总数缺失或较小时，较大的面向提示的
记录总数可能会胜出。
提供商配额窗口的使用认证来自提供商特定的钩子（如果可用）；
否则 OpenClaw 回退到从认证配置、环境或配置中匹配 OAuth/API 密钥凭据。
助手记录条目保持相同的标准化使用形状，包括
当活动模型配置了定价并且提供商
返回使用元数据时的 `usage.cost`。这为 `/usage cost` 和记录支持的会话
状态提供了一个稳定的来源，即使在实时运行时状态消失之后。

OpenClaw 将提供商使用统计与当前上下文快照分开管理。提供商 OpenClaw`usage.total` 可能包含缓存的输入、输出以及多个工具循环的模型调用，因此它虽然适用于成本和遥测，但可能会高估实际的上下文窗口。上下文显示和诊断使用最新的提示快照（`promptTokens`，或者在无提示快照可用时使用最后一次模型调用）进行 `context.used`。

## 成本估算（如显示）

成本是根据您的模型定价配置估算的：

```
models.providers.<provider>.models[].cost
```

这些是 `input`、`output`、`cacheRead` 和 `cacheWrite`OpenClawAPIAPI 的 **每 1M tokens 的美元价格**。如果缺少定价，OpenClaw 仅显示 tokens。成本显示不限于 API 密钥认证：诸如 `aws-sdk` 之类的非 API 密钥提供商，当其配置的模型条目包含本地定价且提供商返回使用元数据时，也可以显示估算成本。

当 sidecars 和 channels 到达 Gateway 就绪路径后，OpenClaw 会对尚未具有本地定价的配置模型引用启动可选的后台定价引导。该引导会获取远程 OpenRouter 和 LiteLLM 定价目录。设置 Gateway(网关)OpenClawOpenRouter`models.pricing.enabled: false` 可以在离线或受限网络上跳过这些目录获取；显式的 `models.providers.*.models[].cost` 条目将继续驱动本地成本估算。

## 缓存 TTL 和修剪影响

提供商提示缓存仅在缓存 TTL 窗口内有效。OpenClaw 可以选择运行 **cache-ttl 修剪**：它在缓存 TTL 过期后修剪会话，然后重置缓存窗口，以便后续请求可以重用新缓存的上下文，而不是重新缓存完整的历史记录。这可以在会话空闲超过 TTL 时保持较低的缓存写入成本。

在 [Gateway configuration](<Gateway(网关)/en/gateway/configuration>) 中进行配置，并在 [Session pruning](/zh/concepts/session-pruning) 中查看行为详细信息。

Heartbeat 可以在空闲间隙期间保持缓存**温暖**。如果您的模型缓存 TTL 为 `1h`，将心跳间隔设置为略低于该值（例如 `55m`）可以避免重新缓存整个提示词，从而降低缓存写入成本。

在多代理设置中，您可以保持一个共享的模型配置，并使用 `agents.list[].params.cacheRetention` 针对每个代理调整缓存行为。

有关详细的逐项指南，请参阅 [提示词缓存](/zh/reference/prompt-caching)。

对于 Anthropic API 定价，缓存读取显著低于输入 token 的成本，而缓存写入则按较高的倍率计费。请参阅 Anthropic 的提示词缓存定价以获取最新费率和 TTL 倍数：
[https://docs.anthropic.com/docs/build-with-claude/prompt-caching](https://docs.anthropic.com/docs/build-with-claude/prompt-caching)

### 示例：使用心跳保持 1 小时缓存温暖

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

### 示例：使用每代理缓存策略处理混合流量

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

`agents.list[].params` 会合并到所选模型的 `params` 之上，因此您可以仅覆盖 `cacheRetention` 并继承其他模型默认值而不做更改。

### Anthropic 1M 上下文

OpenClaw 将具备 GA 能力的 Claude 4.x 模型（如 Opus 4.6、Opus 4.7 和 Sonnet 4.6）的大小设置为 Anthropic 的 1M 上下文窗口。对于这些模型，您不需要 `params.context1m: true`。

```yaml
agents:
  defaults:
    models:
      "anthropic/claude-opus-4-6":
        alias: opus
```

较旧的配置可以保留 `context1m: true`，但 OpenClaw 不再为该设置发送 Anthropic 已停用的 `context-1m-2025-08-07` beta 标头，也不会将不支持的旧版 Claude 模型扩展到 1M。

要求：凭证必须符合长上下文使用条件。如果不符合，
Anthropic 将针对该请求返回提供商端速率限制错误。

如果您使用 OAuth/订阅令牌 (`sk-ant-oat-*`) 对 AnthropicOAuth 进行身份验证，OpenClaw 将保留 OAuth 所需的 Anthropic beta 标头，同时如果旧配置中存在已停用的 `context-1m-*` beta，则将其移除。

## 减少 token 压力的技巧

- 使用 `/compact` 来总结长会话。
- 在工作流中修剪大型工具输出。
- 对于包含大量屏幕截图的会话，请降低 `agents.defaults.imageMaxDimensionPx`。
- 保持技能描述简短（技能列表会注入到提示词中）。
- 对于冗长、探索性的工作，首选较小的模型。

有关确切的技能列表开销公式，请参阅 [Skills](/zh/tools/skills)。

## 相关

- [API 使用和成本](/zh/reference/api-usage-costs)
- [提示词缓存](/zh/reference/prompt-caching)
- [使用情况跟踪](/zh/concepts/usage-tracking)
