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
- 如果 OpenClaw 拥有当前模型的使用元数据和本地定价，
  OpenClaw`/status`API 还会显示上次回复的**预估成本**。这可能包括
  明确定价的非 API 密钥提供商，例如 Bedrock `aws-sdk` 模型。
- 如果实时会话元数据稀疏，`/status` 可以从最新的转录使用
  条目中恢复令牌/缓存计数器和当前运行时模型标签。现有的非零实时值
  仍然优先，并且当存储的总值缺失或较小时，提示大小的转录总值可能会胜出。

**每条消息成本页脚**

- `/usage full` 会在每次回复后附加一个使用页脚，当为当前模型配置了本地定价
  并且有可用的使用元数据时，其中包括**预估成本**。
- `/usage tokens`OAuthCLI 仅显示令牌；订阅式 OAuth/令牌和 CLI 流程
  仍然仅显示令牌，除非该运行时提供兼容的使用元数据
  并且配置了明确的本地价格。
- Gemini CLI 说明：当 CLI 返回 JSON 输出时，OpenClaw 会从
  CLICLIOpenClaw`stats` 读取使用数据，将 `stats.cached` 标准化为 `cacheRead`，并在需要时从 `stats.input_tokens - stats.cached` 推导输入令牌。

Anthropic 说明：Anthropic 工作人员告诉我们，OpenClaw 风格的 Claude CLI 使用
再次被允许，因此除非 Anthropic 发布新政策，否则 OpenClaw 将 Claude CLI 重用和 AnthropicAnthropicOpenClawCLIOpenClawCLI`claude -p`AnthropicAnthropicOpenClaw 使用视为
此集成的认可行为。Anthropic 仍然不公开 OpenClaw 可以
在 `/usage full` 中显示的每条消息的美元估算值。

**CLI 使用窗口（提供商配额）**

- `openclaw status --usage` 和 `openclaw channels list` 显示提供商**使用窗口**
  （配额快照，而非每条消息的成本）。
- 人工输出在所有提供商中标准化为 `X% left`。
- 当前支持使用量窗口的提供商：Anthropic、GitHub Copilot、Gemini CLI、OpenAI Codex、MiniMax、Xiaomi 和 z.ai。
- MiniMax 说明：其原始 MiniMax`usage_percent` / `usagePercent`OpenClaw 字段表示剩余配额，因此 OpenClaw 会在显示之前将其反转。当存在基于计数的字段时，它们优先。如果提供商返回 `model_remains`OpenClaw，OpenClaw 会优先选择聊天模型条目，并在需要时根据时间戳推导窗口标签，同时在计划标签中包含模型名称。
- 这些配额窗口的使用鉴权在可用时来自提供商特定的钩子；否则 OpenClaw 会回退到从身份配置文件、环境变量或配置中匹配的 OAuth/API 密钥凭据。

有关详细信息和示例，请参阅 [Token use & costs](/zh/reference/token-use)。

## 密钥如何被发现

OpenClaw 可以从以下位置获取凭据：

- **Auth profiles**（每个代理一份，存储在 `auth-profiles.json` 中）。
- **Environment variables**（例如 `OPENAI_API_KEY`、`BRAVE_API_KEY`、`FIRECRAWL_API_KEY`）。
- **Config**（`models.providers.*.apiKey`、`plugins.entries.*.config.webSearch.apiKey`、
  `plugins.entries.firecrawl.config.webFetch.apiKey`、`memorySearch.*`、
  `talk.providers.*.apiKey`）。
- **Skills**（`skills.entries.<name>.apiKey`），可能会将密钥导出到技能进程环境中。

## 可能消耗密钥的功能

### 1) 核心模型响应（聊天 + 工具）

每次回复或工具调用都会使用 **当前模型提供商**（OpenAI、Anthropic 等）。这是使用量和费用的主要来源。

这还包括订阅式托管提供商，它们仍在 OpenClaw 本地 UI 之外计费，例如 **OpenAI Codex**、**Alibaba Cloud Model Studio Coding Plan**、**MiniMax Coding Plan**、**Z.AI / GLM Coding Plan**，以及启用了 **Extra Usage** 的 Anthropic 的 OpenClaw Claude 登录路径。

有关价格配置，请参阅 [Models](/zh/providers/models)；有关显示信息，请参阅 [Token use & costs](/zh/reference/token-use)。

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

请参阅 [Image generation](/zh/tools/image-generationQwen)、[Qwen Cloud](/zh/providers/qwen)
和 [Models](/zh/concepts/models)。

### 4) 记忆嵌入 + 语义搜索

当为远程提供商配置时，语义记忆搜索会使用 **embedding APIs**：

- `memorySearch.provider = "openai"`OpenAI → OpenAI embeddings
- `memorySearch.provider = "gemini"` → Gemini embeddings
- `memorySearch.provider = "voyage"` → Voyage embeddings
- `memorySearch.provider = "mistral"` → Mistral embeddings
- `memorySearch.provider = "deepinfra"` → DeepInfra embeddings
- `memorySearch.provider = "lmstudio"` → LM Studio embeddings（本地/自托管）
- `memorySearch.provider = "ollama"`OllamaAPI → Ollama embeddings（本地/自托管；通常无托管 API 费用）
- 如果本地 embeddings 失败，可以选择回退到远程提供商

您可以使用 `memorySearch.provider = "local"`API 将其保持在本地（无 API 使用）。

参见[记忆](/zh/concepts/memory)。

### 5) Web search 工具

`web_search` 可能会根据您的提供商产生使用费用：

- **Brave Search API**：BraveAPI`BRAVE_API_KEY` 或 `plugins.entries.brave.config.webSearch.apiKey`
- **Exa**：`EXA_API_KEY` 或 `plugins.entries.exa.config.webSearch.apiKey`
- **Firecrawl**：Firecrawl`FIRECRAWL_API_KEY` 或 `plugins.entries.firecrawl.config.webSearch.apiKey`
- **Gemini (Google Search)**：`GEMINI_API_KEY` 或 `plugins.entries.google.config.webSearch.apiKey`
- **Grok (xAI)**：xAI OAuth 配置文件、OAuth`XAI_API_KEY` 或 `plugins.entries.xai.config.webSearch.apiKey`
- **Kimi (Moonshot)**：Moonshot`KIMI_API_KEY`、`MOONSHOT_API_KEY` 或 `plugins.entries.moonshot.config.webSearch.apiKey`
- **MiniMax Search**：MiniMax`MINIMAX_CODE_PLAN_KEY`、`MINIMAX_CODING_API_KEY`、`MINIMAX_API_KEY` 或 `plugins.entries.minimax.config.webSearch.apiKey`
- **Ollama Web Search**：对于可访问的已登录本地 Ollama 主机免费；直接 OllamaOllama`https://ollama.com` 搜索使用 `OLLAMA_API_KEY`Ollama，且受身份验证保护的主机可以重用普通的 Ollama 提供商不记名认证
- **Perplexity Search API**：PerplexityAPI`PERPLEXITY_API_KEY`、`OPENROUTER_API_KEY` 或 `plugins.entries.perplexity.config.webSearch.apiKey`
- **Tavily**：`TAVILY_API_KEY` 或 `plugins.entries.tavily.config.webSearch.apiKey`
- **DuckDuckGo**：无密钥回退选项（无 API 计费，但非官方且基于 HTML）
- **SearXNG**：`SEARXNG_BASE_URL` 或 `plugins.entries.searxng.config.webSearch.baseUrl`API（无密钥/自托管；无托管 API 计费）

传统的 `tools.web.search.*` 提供商路径仍然通过临时兼容性垫片加载，但它们不再是推荐的配置界面。

**Brave 搜索免费额度：** 每个 Brave 计划都包含每月 $5 的可续期免费额度。搜索计划每 1,000 次请求费用为 $5，因此该额度可覆盖每月 1,000 次免费请求。在 Brave 仪表板中设置您的使用限制，以避免意外收费。

参见[Web 工具](/zh/tools/web)。

### 5) Web 获取工具 (Firecrawl)

当存在 API 密钥时，`web_fetch`FirecrawlAPI 可以调用 **Firecrawl**：

- `FIRECRAWL_API_KEY` 或 `plugins.entries.firecrawl.config.webFetch.apiKey`

如果未配置 Firecrawl，该工具将回退到直接获取并附带捆绑的 `web-readability` 插件（无付费 API）。禁用 `plugins.entries.web-readability.enabled` 以跳过本地 Readability 提取。

请参阅 [Web tools](/zh/tools/web)。

### 6) 提供商使用快照 (status/health)

某些状态命令会调用 **提供商使用端点** 以显示配额窗口或身份验证运行状况。
这些通常是低调用量操作，但仍然会访问提供商 API：

- `openclaw status --usage`
- `openclaw models status --json`

请参阅 [Models CLI](/zh/cli/models)。

### 7) 压缩安全摘要

压缩安全机制可以使用 **当前模型** 对会话历史进行摘要，这会在其运行时调用提供商 API。

请参阅 [Session management + compaction](/zh/reference/session-management-compaction)。

### 8) 模型扫描 / 探测

`openclaw models scan` 可以探测 OpenRouter 模型，并且在启用探测时使用 `OPENROUTER_API_KEY`。

请参阅 [Models CLI](/zh/cli/models)。

### 9) 通话 (语音)

在配置后，通话模式可以调用 **ElevenLabs**：

- `ELEVENLABS_API_KEY` 或 `talk.providers.elevenlabs.apiKey`

请参阅 [Talk mode](/zh/nodes/talk)。

### 10) Skills (第三方 API)

Skills 可以将 `apiKey` 存储在 `skills.entries.<name>.apiKey` 中。如果 skill 将该密钥用于外部 API，则可能会根据 skill 的提供商产生费用。

请参阅 [Skills](/zh/tools/skills)。

## 相关

- [Token use and costs](/zh/reference/token-use)
- [Prompt caching](/zh/reference/prompt-caching)
- [Usage tracking](/zh/concepts/usage-tracking)
