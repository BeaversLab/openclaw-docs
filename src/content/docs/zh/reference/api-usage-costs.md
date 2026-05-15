---
summary: "审核可能产生费用的项目、使用的密钥以及如何查看使用情况"
read_when:
  - You want to understand which features may call paid APIs
  - You need to audit keys, costs, and usage visibility
  - You're explaining /status or /usage cost reporting
title: "API 使用情况和费用"
---

本文档列出了**可以调用 API 密钥的功能**及其成本显示位置。重点介绍了
OpenClaw 中可能产生提供商使用量或付费 API 调用的功能。

## 成本显示位置（聊天 + CLI）

**每会话成本快照**

- `/status` 显示当前会话模型、上下文使用量以及上次回复的令牌数。
- 如果模型使用 **API 密钥认证**，API`/status` 还会显示上次回复的**预估成本**。
- 如果实时会话元数据稀疏，`/status` 可以从最新的转录使用条目中
  恢复令牌/缓存计数器和活动运行时模型标签。现有的非零实时值仍然优先，当存储的总数
  缺失或较小时，提示大小的转录总数可能胜出。

**每条消息成本页脚**

- `/usage full`API 会向每条回复附加一个使用情况页脚，包括**预估成本**（仅限 API 密钥）。
- `/usage tokens`OAuthCLI 仅显示令牌数；订阅式 OAuth/令牌和 CLI 流程会隐藏美元成本。
- Gemini CLI 说明：当 CLI 返回 JSON 输出时，OpenClaw 会从
  CLICLIOpenClaw`stats` 读取使用情况，将 `stats.cached` 标准化为 `cacheRead`，并在需要时
  从 `stats.input_tokens - stats.cached` 推导输入令牌。

Anthropic 说明：Anthropic 员工告诉我们，OpenClaw 风格的 Claude CLI 使用
再次被允许，因此除非 Anthropic 发布新政策，否则 OpenClaw 将 Claude CLI 重用和 AnthropicAnthropicOpenClawCLIOpenClawCLI`claude -p`AnthropicAnthropicOpenClaw 使用
视为该集成的授权使用。Anthropic 仍然不暴露 OpenClaw 可以在 `/usage full` 中显示的
每条消息美元预估。

**CLI 使用窗口（提供商配额）**

- `openclaw status --usage` 和 `openclaw channels list` 显示提供商 **使用量窗口**（配额快照，而非单条消息的费用）。
- 各提供商的输出均标准化为 `X% left`。
- 当前支持使用量窗口的提供商：Anthropic、GitHub Copilot、Gemini CLI、OpenAI Codex、MiniMax、Xiaomi 和 z.ai。
- MiniMax 说明：其原始 MiniMax`usage_percent` / `usagePercent`OpenClaw 字段表示剩余配额，因此 OpenClaw 在显示前会将其反转。如果存在基于计数的字段，则优先使用它们。如果提供商返回 `model_remains`OpenClaw，OpenClaw 会优先使用聊天模型条目，并在需要时根据时间戳推导窗口标签，同时在方案标签中包含模型名称。
- 这些配额窗口的使用鉴权在可用时来自提供商特定的钩子；否则 OpenClaw 会回退到从身份配置文件、环境变量或配置中匹配的 OAuth/API 密钥凭据。

有关详细信息和示例，请参阅 [Token 使用与费用](/zh/reference/token-use)。

## 密钥如何被发现

OpenClaw 可以从以下位置获取凭据：

- **身份配置文件**（每个代理，存储在 `auth-profiles.json` 中）。
- **环境变量**（例如 `OPENAI_API_KEY`、`BRAVE_API_KEY`、`FIRECRAWL_API_KEY`）。
- **配置**（`models.providers.*.apiKey`、`plugins.entries.*.config.webSearch.apiKey`、
  `plugins.entries.firecrawl.config.webFetch.apiKey`、`memorySearch.*`、
  `talk.providers.*.apiKey`）。
- **Skills**（`skills.entries.<name>.apiKey`）可以将密钥导出到技能进程环境中。

## 可能消耗密钥的功能

### 1) 核心模型响应（聊天 + 工具）

每次回复或工具调用都会使用 **当前模型提供商**（OpenAI、Anthropic 等）。这是使用量和费用的主要来源。

这还包括订阅式托管提供商，它们仍在 OpenClaw 本地 UI 之外计费，例如 **OpenAI Codex**、**Alibaba Cloud Model Studio Coding Plan**、**MiniMax Coding Plan**、**Z.AI / GLM Coding Plan**，以及启用了 **Extra Usage** 的 Anthropic 的 OpenClaw Claude 登录路径。

有关定价配置，请参阅 [Models](/zh/providers/models)；有关显示，请参阅 [Token use & costs](/zh/reference/token-use)。

### 2) 媒体理解（音频/图像/视频）

入站媒体可以在回复运行之前进行摘要/转录。这会使用模型/提供商 API。

- 音频：OpenAI / Groq / Deepgram / DeepInfra / Google / Mistral。
- 图像：OpenAI / OpenRouter / Anthropic / DeepInfra / Google / MiniMax / Moonshot / Qwen / Z.AI。
- 视频：Google / Qwen / Moonshot。

请参阅 [Media understanding](/zh/nodes/media-understanding)。

### 3) 图像和视频生成

共享的生成功能也可能消耗提供商密钥：

- 图像生成：OpenAI / Google / DeepInfra / fal / MiniMax
- 视频生成：DeepInfra / Qwen

当 `agents.defaults.imageGenerationModel` 未设置时，图像生成可以推断出支持身份验证的提供商默认值。视频生成目前需要显式的 `agents.defaults.videoGenerationModel`，例如 `qwen/wan2.6-t2v`。

请参阅 [Image generation](/zh/tools/image-generation)、[Qwen Cloud](/zh/providers/qwen) 和 [Models](/zh/concepts/models)。

### 4) 记忆嵌入 + 语义搜索

当为远程提供商配置时，语义记忆搜索会使用 **embedding APIs**：

- `memorySearch.provider = "openai"` → OpenAI embeddings
- `memorySearch.provider = "gemini"` → Gemini embeddings
- `memorySearch.provider = "voyage"` → Voyage embeddings
- `memorySearch.provider = "mistral"` → Mistral 嵌入
- `memorySearch.provider = "deepinfra"` → DeepInfra 嵌入
- `memorySearch.provider = "lmstudio"` → LM Studio 嵌入（本地/自托管）
- `memorySearch.provider = "ollama"` → OllamaAPI 嵌入（本地/自托管；通常无托管提供商计费）
- 如果本地 embeddings 失败，可以选择回退到远程提供商

您可以使用 `memorySearch.provider = "local"`API 将其保留在本地（不使用 API）。

参见 [Memory](/zh/concepts/memory)。

### 5) Web search 工具

`web_search` 可能会根据您的提供商产生使用费用：

- **Brave Search API**：`BRAVE_API_KEY` 或 `plugins.entries.brave.config.webSearch.apiKey`
- **Exa**：`EXA_API_KEY` 或 `plugins.entries.exa.config.webSearch.apiKey`
- **Firecrawl**：`FIRECRAWL_API_KEY` 或 `plugins.entries.firecrawl.config.webSearch.apiKey`
- **Gemini (Google Search)**：`GEMINI_API_KEY` 或 `plugins.entries.google.config.webSearch.apiKey`
- **Grok (xAI)**：`XAI_API_KEY` 或 `plugins.entries.xai.config.webSearch.apiKey`
- **Kimi (Moonshot)**：`KIMI_API_KEY`、`MOONSHOT_API_KEY` 或 `plugins.entries.moonshot.config.webSearch.apiKey`
- **MiniMax Search**：`MINIMAX_CODE_PLAN_KEY`、`MINIMAX_CODING_API_KEY`、`MINIMAX_API_KEY` 或 `plugins.entries.minimax.config.webSearch.apiKey`
- **Ollama Web Search**：对于可访问且已登录的本地 Ollama 主机无需密钥；直接的 `https://ollama.com` 搜索使用 `OLLAMA_API_KEY`，且受身份验证保护的主机可以重用常规的 Ollama 提供商不记名身份验证
- **Perplexity Search API**：`PERPLEXITY_API_KEY`、`OPENROUTER_API_KEY` 或 `plugins.entries.perplexity.config.webSearch.apiKey`
- **Tavily**：`TAVILY_API_KEY` 或 `plugins.entries.tavily.config.webSearch.apiKey`
- **DuckDuckGo**：无密钥回退选项（无 API 计费，但非官方且基于 HTML）
- **SearXNG**：`SEARXNG_BASE_URL` 或 `plugins.entries.searxng.config.webSearch.baseUrl`API（免密钥/自托管；无托管 API 计费）

传统的 `tools.web.search.*` 提供商路径仍会通过临时兼容性垫片加载，但它们不再是推荐的配置界面。

**Brave 搜索免费额度：** 每个 Brave 计划都包含每月 $5 的可续期免费额度。搜索计划每 1,000 次请求费用为 $5，因此该额度可覆盖每月 1,000 次免费请求。在 Brave 仪表板中设置您的使用限制，以避免意外收费。

参见 [Web 工具](/zh/tools/web)。

### 5) Web 获取工具 (Firecrawl)

当存在 API 密钥时，`web_fetch`FirecrawlAPI 可以调用 **Firecrawl**：

- `FIRECRAWL_API_KEY` 或 `plugins.entries.firecrawl.config.webFetch.apiKey`

如果未配置 Firecrawl，该工具将回退到直接获取外加捆绑的 Firecrawl`web-readability`API 插件（无付费 API）。禁用 `plugins.entries.web-readability.enabled` 以跳过本地 Readability 提取。

参见 [Web 工具](/zh/tools/web)。

### 6) 提供商使用快照 (status/health)

某些状态命令会调用 **提供商使用端点** 以显示配额窗口或身份验证运行状况。
这些通常是低调用量操作，但仍然会访问提供商 API：

- `openclaw status --usage`
- `openclaw models status --json`

参见 [Models CLI](CLI/en/cli/models)。

### 7) 压缩安全摘要

压缩安全机制可以使用 **当前模型** 对会话历史进行摘要，这会在其运行时调用提供商 API。

参见 [Session management + compaction](/zh/reference/session-management-compaction)。

### 8) 模型扫描 / 探测

`openclaw models scan`OpenRouter 可以探测 OpenRouter 模型，并在启用探测时使用 `OPENROUTER_API_KEY`。

参见 [Models CLI](CLI/en/cli/models)。

### 9) 通话 (语音)

在配置后，通话模式可以调用 **ElevenLabs**：

- `ELEVENLABS_API_KEY` 或 `talk.providers.elevenlabs.apiKey`

参见 [Talk mode](/zh/nodes/talk)。

### 10) Skills (第三方 API)

Skills 可以在 `skills.entries.<name>.apiKey` 中存储 `apiKey`。如果 skill 使用该密钥访问外部 API，则可能会根据 skill 的提供商产生费用。

参见 [Skills](/zh/tools/skills)。

## 相关

- [Token use and costs](/zh/reference/token-use)
- [Prompt caching](/zh/reference/prompt-caching)
- [Usage tracking](/zh/concepts/usage-tracking)
