---
summary: "审核可能产生费用的项目、使用的密钥以及如何查看使用情况"
read_when:
  - You want to understand which features may call paid APIs
  - You need to audit keys, costs, and usage visibility
  - You’re explaining /status or /usage cost reporting
title: "API 使用和成本"
---

# API 使用与成本

本文档列出了**可以调用 API 密钥的功能**及其成本显示位置。它重点介绍
可能产生提供商使用量或付费 API 调用的 OpenClaw 功能。

## 成本显示位置（聊天 + CLI）

**每次会话成本快照**

- `/status` 显示当前会话模型、上下文使用量和最后一次回复的 token 数。
- 如果模型使用 **API 密钥认证**，`/status` 还会显示最后一次回复的 **预估成本**。
- 如果实时会话元数据稀疏，`/status` 可以从最新的转录使用条目中恢复令牌/缓存计数器和活动运行时模型标签。现有的非零实时值仍然优先，并且当存储的总数缺失或较小时，基于提示大小的转录总数可能胜出。

**每条消息成本页脚**

- `/usage full` 在每条回复后附加一个使用页脚，包括**估算成本**（仅限 API 密钥）。
- `/usage tokens` 仅显示令牌数；订阅式的 OAuth/令牌和 CLI 流程会隐藏美元成本。
- Gemini CLI 说明：当 CLI 返回 JSON 输出时，OpenClaw 会从 `stats` 读取使用情况，将 `stats.cached` 标准化为 `cacheRead`，并在需要时从 `stats.input_tokens - stats.cached` 推导输入令牌。

Anthropic 说明：Anthropic 的公共 Claude Code 文档仍然将直接的 Claude Code 终端使用包含在 Claude 计划限制中。此外，Anthropic 告知 OpenClaw 用户，从 **2026 年 4 月 4 日下午 12:00 PT / 晚上 8:00 BST** 开始，**OpenClaw** 的 Claude 登录路径将被视为第三方工具使用，并需要与订阅分开计费的 **Extra Usage**。Anthropic 未公开 OpenClaw 可以在 `/usage full` 中显示的每条消息美元估算。

**CLI 使用窗口（提供商配额）**

- `openclaw status --usage` 和 `openclaw channels list` 显示提供商**使用窗口**（配额快照，而非每条消息的成本）。
- 人工输出在所有提供商中均被标准化为 `X% left`。
- 当前支持使用窗口的提供商：Anthropic、GitHub Copilot、Gemini CLI、OpenAI Codex、MiniMax、Xiaomi 和 z.ai。
- MiniMax 说明：其原始的 `usage_percent` / `usagePercent` 字段表示剩余配额，因此 OpenClaw 会在显示前将其反转。当存在基于计数的字段时，它们仍然优先。如果提供商返回 `model_remains`，OpenClaw 优先选择聊天模型条目，在需要时从时间戳推导窗口标签，并在计划标签中包含模型名称。
- 这些配额窗口的使用授权在可用时来自特定于提供商的钩子；否则 OpenClaw 会回退到从 auth profiles、env 或 config 中匹配 OAuth/API-key 凭据。

有关详细信息和示例，请参阅 [Token use & costs](/en/reference/token-use)。

## 如何发现密钥

OpenClaw 可以从以下位置获取凭据：

- **Auth profiles**（每个代理一个，存储在 `auth-profiles.json` 中）。
- **环境变量**（例如 `OPENAI_API_KEY`、`BRAVE_API_KEY`、`FIRECRAWL_API_KEY`）。
- **配置**（`models.providers.*.apiKey`、`plugins.entries.*.config.webSearch.apiKey`、
  `plugins.entries.firecrawl.config.webFetch.apiKey`、`memorySearch.*`、
  `talk.providers.*.apiKey`）。
- **Skills**（`skills.entries.<name>.apiKey`），可能会将密钥导出到技能进程环境变量中。

## 可能消耗密钥的功能

### 1) 核心模型响应（聊天 + 工具）

每次回复或工具调用都使用**当前模型提供商**（OpenAI、Anthropic 等）。这是使用量和成本的主要来源。

这也包括订阅式托管提供商，它们仍在 OpenClaw 本地 UI 之外计费，例如 **OpenAI Codex**、**Alibaba Cloud Model Studio
Coding Plan**、**MiniMax Coding Plan**、**Z.AI / GLM Coding Plan**，以及
Anthropic 的 OpenClaw Claude-login 路径并启用了 **Extra Usage**。

有关价格配置，请参阅 [Models](/en/providers/models)；有关显示，请参阅 [Token use & costs](/en/reference/token-use)。

### 2) 媒体理解（音频/图像/视频）

传入的媒体可以在回复运行之前进行摘要/转录。这使用模型/提供商 API。

- 音频：OpenAI / Groq / Deepgram / Google / Mistral。
- 图像：OpenAI / OpenRouter / Anthropic / Google / MiniMax / Moonshot / Qwen / Z.AI。
- 视频：Google / Qwen / Moonshot。

请参阅 [Media understanding](/en/nodes/media-understanding)。

### 3) 图像和视频生成

共享生成功能也可能消耗提供商密钥：

- 图像生成：OpenAI / Google / fal / MiniMax
- 视频生成：Qwen

当
`agents.defaults.imageGenerationModel` 未设置时，图像生成可以推断支持身份验证的提供商默认值。视频生成目前
需要一个显式的 `agents.defaults.videoGenerationModel`，例如
`qwen/wan2.6-t2v`。

参见 [图像生成](/en/tools/image-generation)、[Qwen Cloud](/en/providers/qwen)
和 [模型](/en/concepts/models)。

### 4) 记忆嵌入 + 语义搜索

当为远程提供商配置时，语义记忆搜索会使用 **嵌入 API**：

- `memorySearch.provider = "openai"` → OpenAI 嵌入
- `memorySearch.provider = "gemini"` → Gemini 嵌入
- `memorySearch.provider = "voyage"` → Voyage 嵌入
- `memorySearch.provider = "mistral"` → Mistral 嵌入
- `memorySearch.provider = "ollama"` → Ollama 嵌入（本地/自托管；通常无托管 API 计费）
- 如果本地嵌入失败，可选择回退到远程提供商

您可以使用 `memorySearch.provider = "local"` 将其保持在本地（无 API 使用）。

参见 [记忆](/en/concepts/memory)。

### 5) 网络搜索工具

`web_search` 可能会根据您的提供商产生使用费用：

- **Brave Search API**：`BRAVE_API_KEY` 或 `plugins.entries.brave.config.webSearch.apiKey`
- **Exa**：`EXA_API_KEY` 或 `plugins.entries.exa.config.webSearch.apiKey`
- **Firecrawl**：`FIRECRAWL_API_KEY` 或 `plugins.entries.firecrawl.config.webSearch.apiKey`
- **Gemini (Google Search)**：`GEMINI_API_KEY` 或 `plugins.entries.google.config.webSearch.apiKey`
- **Grok (xAI)**：`XAI_API_KEY` 或 `plugins.entries.xai.config.webSearch.apiKey`
- **Kimi (Moonshot)**：`KIMI_API_KEY`、`MOONSHOT_API_KEY` 或 `plugins.entries.moonshot.config.webSearch.apiKey`
- **MiniMax Search**：`MINIMAX_CODE_PLAN_KEY`、`MINIMAX_CODING_API_KEY`、`MINIMAX_API_KEY` 或 `plugins.entries.minimax.config.webSearch.apiKey`
- **Ollama Web Search**：默认不需要密钥，但需要一个可访问的 Ollama 主机以及 `ollama signin`；当主机需要时，也可以复用常规的 Ollama 提供商 bearer auth
- **Perplexity Search API**：`PERPLEXITY_API_KEY`、`OPENROUTER_API_KEY` 或 `plugins.entries.perplexity.config.webSearch.apiKey`
- **Tavily**：`TAVILY_API_KEY` 或 `plugins.entries.tavily.config.webSearch.apiKey`
- **DuckDuckGo**：无密钥回退（无 API 计费，但非官方且基于 HTML）
- **SearXNG**: `SEARXNG_BASE_URL` 或 `plugins.entries.searxng.config.webSearch.baseUrl` （免密钥/自托管；无托管 API 计费）

传统的 `tools.web.search.*` 提供商路径仍然通过临时兼容性垫片加载，但它们不再是推荐的配置界面。

**Brave Search 免费额度：** 每个 Brave 计划包含每月 $5 的续费免费额度。搜索计划每 1,000 次请求费用为 $5，因此该额度覆盖每月 1,000 次免费请求。在 Brave 仪表板中设置您的使用限制，以避免意外收费。

请参阅 [Web 工具](/en/tools/web)。

### 5) Web 抓取工具 (Firecrawl)

当存在 Firecrawl 密钥时，`web_fetch` 可以调用 **API**：

- `FIRECRAWL_API_KEY` 或 `plugins.entries.firecrawl.config.webFetch.apiKey`

如果未配置 Firecrawl，该工具将回退到直接抓取 + 可读性处理（无付费 API）。

请参阅 [Web 工具](/en/tools/web)。

### 6) 提供商使用快照（状态/健康）

某些状态命令会调用 **提供商使用端点** 以显示配额窗口或身份验证健康状况。这些通常是低频调用，但仍然会访问提供商 API：

- `openclaw status --usage`
- `openclaw models status --json`

请参阅 [模型 CLI](/en/cli/models)。

### 7) 压缩保护摘要

压缩保护功能可以使用 **当前模型** 汇总会话历史，运行时会调用提供商 API。

请参阅 [会话管理 + 压缩](/en/reference/session-management-compaction)。

### 8) 模型扫描 / 探测

`openclaw models scan` 可以探测 OpenRouter 模型，并在启用探测时使用 `OPENROUTER_API_KEY`。

请参阅 [模型 CLI](/en/cli/models)。

### 9) 对话（语音）

对话模式可以在配置后调用 **ElevenLabs**：

- `ELEVENLABS_API_KEY` 或 `talk.providers.elevenlabs.apiKey`

请参阅 [对话模式](/en/nodes/talk)。

### 10) Skills（第三方 API）

Skills 可以将 `apiKey` 存储在 `skills.entries.<name>.apiKey` 中。如果 Skill 使用该密钥访问外部 API，则可能会根据 Skill 的提供商产生费用。

请参阅 [Skills](/en/tools/skills)。
