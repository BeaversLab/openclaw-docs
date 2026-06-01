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
- 工作区 + 引导文件（`AGENTS.md`、`SOUL.md`、`TOOLS.md`、`IDENTITY.md`、`USER.md`、`HEARTBEAT.md`、`BOOTSTRAP.md` 在新建时，加上存在的 `MEMORY.md`）。原生 Codex 轮次在为该工作区启用记忆工具时，不会粘贴来自已配置代理工作区的原始 `MEMORY.md`；它们包含一个小的记忆指针，并按需使用记忆工具。如果工具被禁用、记忆搜索不可用，或者活动工作区与代理记忆工作区不同，`MEMORY.md` 将使用正常的受限轮次上下文路径。小写根 `memory.md` 不会被注入；它是与 `MEMORY.md` 配对时 `openclaw doctor --fix` 的遗留修复输入。大型注入文件会被 `agents.defaults.bootstrapMaxChars` 截断（默认：12000），且总引导注入量受 `agents.defaults.bootstrapTotalMaxChars` 限制（默认：60000）。`memory/*.md` 每日文件不属于正常的引导提示；它们在普通轮次中仍通过记忆工具按需提供，但重置/启动模型运行可以在第一轮前置一个包含最近每日记忆的一次性启动上下文块。裸聊天 `/new` 和 `/reset` 命令会在不调用模型的情况下得到确认。启动前奏由 `agents.defaults.startupContext` 控制。压缩后的 AGENTS.md 摘录是独立的，需要显式的 `agents.defaults.compaction.postCompactionSections` 选择加入。
- 时间 (UTC + 用户时区)
- 回复标签 + 心跳行为
- 运行时元数据 (主机/操作系统/模型/思考)

有关完整细分，请参阅 [系统提示](/zh/concepts/system-prompt)。

在记录凭证或身份验证片段时，请使用 [机密占位符约定](/zh/reference/secret-placeholder-conventions) 来避免仅文档更改中的机密扫描器误报。

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

Per-agent 覆盖配置位于 `agents.list[].contextLimits` 下。这些控件用于
有界的运行时摘录和注入的运行时自有块。它们与
引导限制、启动上下文限制和技能提示限制是分开的。

`toolResultMaxChars`OpenClaw 是一个高级上限。当未设置时，OpenClaw 会根据有效的模型上下文窗口
选择实时的工具结果上限：低于 100K token 时为 `16000` 个字符，
在 100K+ token 时为 `32000` 个字符，在 200K+
token 时为 `64000` 个字符，但仍受运行时上下文共享守卫的限制。

对于图像，OpenClaw 会在调用提供商之前对转录/工具图像负载进行缩小。
使用 OpenClaw`agents.defaults.imageMaxDimensionPx`（默认值：`1200`）来调整此设置：

- 较低的值通常会减少视觉 token 的使用和负载大小。
- 较高的值会为 OCR/UI 侧重型的截图保留更多视觉细节。

如需获取实际的细分数据（每个注入文件、工具、技能和系统提示大小），请使用 `/context list` 或 `/context detail`。参见 [Context](/zh/concepts/context)。

## 如何查看当前 token 使用情况

在聊天中使用以下命令：

- `/status` → 显示包含会话模型、上下文使用情况、
  上次响应输入/输出 token 以及**预估成本**（当为活动模型配置了本地定价时）的
  **包含丰富 emoji 的状态卡**。
- `/usage off|tokens|full` → 在每次回复后附加一个**每次响应使用情况页脚**。
  - 按会话持久化（存储为 `responseUsage`）。
  - `/usage full`OpenClaw 仅当 OpenClaw 拥有使用元数据且
    为活动模型配置了本地定价时，才显示预估成本。否则仅显示 token。
- `/usage cost`OpenClaw → 显示来自 OpenClaw 会话日志的本地成本摘要。

其他界面：

- **TUI/Web TUI：** 支持 TUITUI`/status` + `/usage`。
- **CLI：** `openclaw status --usage` 和 `openclaw channels list` 显示
  标准化的提供商配额窗口（`X% left`，而非单次响应成本）。
  当前使用窗口的提供商：Anthropic、GitHub Copilot、Gemini CLI、
  OpenAI Codex、MiniMax、Xiaomi 和 z.ai。

Usage 表面在显示前会对常见的提供商原生字段别名进行标准化。
对于 OpenAI 系 Responses 流量，这包括 `input_tokens` /
`output_tokens` 和 `prompt_tokens` / `completion_tokens`，因此特定于传输的
字段名称不会更改 `/status`、`/usage` 或会话摘要。
Gemini CLI JSON 使用情况也会被标准化：回复文本来自 `response`，且
`stats.cached` 映射到 `cacheRead`，其中当 CLI 省略显式 `stats.input` 字段时
使用 `stats.input_tokens - stats.cached`。
对于原生 OpenAI 系 Responses 流量，WebSocket/SSE 使用别名以
相同的方式标准化，并且当 `total_tokens` 缺失或 `0` 时，总计回退到标准化的输入 + 输出。
当当前会话快照稀疏时，`/status` 和 `session_status` 还可以
从最新的脚本使用日志中恢复 token/缓存 计数器和活动的运行时模型标签。现有的非零实时值仍然
优先于脚本回退值，并且当存储的总计缺失或较小时，较大的面向提示的
脚本总计可以胜出。
提供商配额窗口的使用验证在可用时来自提供商特定的钩子；
否则 OpenClaw 回退到从验证配置文件、env 或配置中匹配 OAuth/API-key 凭据。
助手脚本条目保留相同的标准化使用形状，包括
`usage.cost`，当活动模型配置了定价并且提供商
返回使用元数据时。这为 `/usage cost` 和脚本支持的会话
状态提供了稳定的来源，即使在实时运行时状态消失之后。

OpenClaw 将提供商使用统计与当前上下文快照分开维护。提供商 OpenClaw`usage.total` 可能包含缓存输入、输出和多次工具循环模型调用，因此这对成本和遥测很有用，但可能会夸大实时上下文窗口。上下文显示和诊断使用最新的提示快照（`promptTokens`，或当没有提示快照可用时的最后一次模型调用）来进行 `context.used`。

## 成本估算（如显示）

成本是根据您的模型定价配置估算的：

```
models.providers.<provider>.models[].cost
```

这些是 `input`、`output`、`cacheRead` 和 `cacheWrite`OpenClawAPIAPI 的 **每 100 万 Token 美元** 价格。如果缺少定价，OpenClaw 仅显示 Token。成本显示不仅限于 API 密钥身份验证：非 API 密钥提供商（如 `aws-sdk`）可以在其配置的模型条目包含本地定价并且提供商返回使用元数据时显示估算成本。

在 Sidecar 和通道到达 Gateway 就绪路径后，OpenClaw 会对尚未具有本地定价的已配置模型引用启动可选的后台定价引导。该引导获取远程 OpenRouter 和 LiteLLM 定价目录。设置 Gateway(网关)OpenClawOpenRouter`models.pricing.enabled: false` 以在离线或受限网络上跳过这些目录获取；显式的 `models.providers.*.models[].cost` 条目将继续驱动本地成本估算。

## 缓存 TTL 和清理影响

提供商提示缓存仅在缓存 TTL 窗口内有效。OpenClaw 可以选择运行 **缓存 TTL 清理**：它在缓存 TTL 过期后清理会话，然后重置缓存窗口，以便后续请求可以重用新缓存的上下文，而不是重新缓存整个历史记录。这可以在会话超过 TTL 处于空闲状态时保持较低的缓存写入成本。

在 [Gateway 配置](<Gateway(网关)/en/gateway/configuration>) 中进行配置，并在 [会话清理](/zh/concepts/session-pruning) 中查看行为详细信息。

Heartbeat 可以在空闲间隙保持缓存**热度**。如果您的模型缓存 TTL
为 `1h`，将心跳间隔设置得略低于该值（例如 `55m`）可以避免
重新缓存整个提示词，从而降低缓存写入成本。

在多代理设置中，您可以保持一个共享的模型配置，并使用 `agents.list[].params.cacheRetention` 针对每个代理调整缓存行为。

有关详尽的逐步指南，请参阅 [Prompt Caching](/zh/reference/prompt-caching)。

对于 Anthropic API 定价，缓存读取费用显著低于输入
token，而缓存写入则按更高的倍率计费。请参阅 Anthropic
提示词缓存定价以获取最新费率和 TTL 倍数：
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

### 示例：使用每代理缓存策略应对混合流量

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

`agents.list[].params` 会合并到所选模型的 `params` 之上，因此您可以
仅覆盖 `cacheRetention` 并继承其他模型默认值而无需更改。

### Anthropic 1M 上下文

OpenClaw 会对支持 GA 的 Claude 4.x 模型（如 Opus 4.8、Opus 4.7、Opus 4.6 和
Sonnet 4.6）使用 Anthropic 的 1M 上下文窗口进行扩容。您不需要
为这些模型设置 `params.context1m: true`。

```yaml
agents:
  defaults:
    models:
      "anthropic/claude-opus-4-6":
        alias: opus
```

较旧的配置可以保留 `context1m: true`，但 OpenClaw 不再会为此设置发送
Anthropic 已弃用的 `context-1m-2025-08-07` beta 标头，也
不会将不支持的旧版 Claude 模型扩展到 1M。

要求：凭据必须具备使用长上下文的资格。否则，
Anthropic 将针对该请求返回提供商端的速率限制错误。

如果您使用 OAuth/订阅令牌 (`sk-ant-oat-*`) 对 AnthropicOAuth 进行身份验证，
OpenClaw 会保留 OAuth 所需的 Anthropic beta 标头，同时如果旧配置中
仍存在已弃用的 `context-1m-*` beta，则会将其移除。

## 降低 token 压力的技巧

- 使用 `/compact` 来总结长会话。
- 在工作流中裁剪大型工具输出。
- 对于包含大量截图的会话，请降低 `agents.defaults.imageMaxDimensionPx`。
- 保持 Skills 描述简短（Skills 列表会被注入到提示词中）。
- 对于冗长的探索性工作，首选较小的模型。

有关确切的 Skills 列表开销公式，请参阅 [Skills](/zh/tools/skills)。

## 相关

- [API 使用和成本](API/en/reference/api-usage-costs)
- [提示词缓存](/zh/reference/prompt-caching)
- [使用情况跟踪](/zh/concepts/usage-tracking)
