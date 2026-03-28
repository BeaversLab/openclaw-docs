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

**每条消息成本页脚**

- `/usage full` 会在每次回复后附加使用情况页脚，包括 **预估成本**（仅限 API 密钥）。
- `/usage tokens` 仅显示 token；OAuth 流程会隐藏美元成本。

**CLI 使用窗口（提供商配额）**

- `openclaw status --usage` 和 `openclaw channels list` 显示提供商**使用量窗口**（配额快照，而非单条消息的费用）。

有关详细信息和示例，请参阅 [Token 使用与费用](/zh/reference/token-use)。

## 如何发现密钥

OpenClaw 可以从以下位置获取凭据：

- **Auth profiles**（每个代理，存储在 `auth-profiles.json` 中）。
- **Environment variables**（例如 `OPENAI_API_KEY`、`BRAVE_API_KEY`、`FIRECRAWL_API_KEY`）。
- **Config**（`models.providers.*.apiKey`、`tools.web.search.*`、`tools.web.fetch.firecrawl.*`、
  `memorySearch.*`、`talk.apiKey`）。
- **Skills**（`skills.entries.<name>.apiKey`）可能会将密钥导出到技能进程环境中。

## 可能消耗密钥的功能

### 1) 核心模型响应（聊天 + 工具）

每次回复或工具调用都使用**当前模型提供商**（OpenAI、Anthropic 等）。这是使用量和成本的主要来源。

有关价格配置，请参阅 [模型](/zh/providers/models)；有关显示，请参阅 [Token 使用与费用](/zh/reference/token-use)。

### 2) 媒体理解（音频/图像/视频）

传入的媒体可以在回复运行之前进行摘要/转录。这会使用模型/提供商 API。

- 音频：OpenAI / Groq / Deepgram（当密钥存在时现在会**自动启用**）。
- 图像：OpenAI / Anthropic / Google。
- 视频：Google。

请参阅 [媒体理解](/zh/nodes/media-understanding)。

### 3) 记忆嵌入 + 语义搜索

当为远程提供商配置时，语义记忆搜索会使用**嵌入 API**：

- `memorySearch.provider = "openai"` → OpenAI 嵌入
- `memorySearch.provider = "gemini"` → Gemini 嵌入
- `memorySearch.provider = "voyage"` → Voyage 嵌入
- `memorySearch.provider = "mistral"` → Mistral 嵌入
- `memorySearch.provider = "ollama"` → Ollama 嵌入（本地/自托管；通常没有托管 API 计费）
- 如果本地嵌入失败，可以选择回退到远程提供商

您可以使用 `memorySearch.provider = "local"` 将其保持在本地（不使用 API）。

请参阅 [记忆](/zh/concepts/memory)。

### 4) Web search 工具

`web_search` 使用 API 密钥，并且根据您的提供商可能会产生使用费用：

- **Brave 搜索 API**：`BRAVE_API_KEY` 或 `plugins.entries.brave.config.webSearch.apiKey`
- **Gemini (Google 搜索)**：`GEMINI_API_KEY` 或 `plugins.entries.google.config.webSearch.apiKey`
- **Grok (xAI)**：`XAI_API_KEY` 或 `plugins.entries.xai.config.webSearch.apiKey`
- **Kimi (Moonshot)**：`KIMI_API_KEY`、`MOONSHOT_API_KEY` 或 `plugins.entries.moonshot.config.webSearch.apiKey`
- **Perplexity 搜索 API**：`PERPLEXITY_API_KEY`、`OPENROUTER_API_KEY` 或 `plugins.entries.perplexity.config.webSearch.apiKey`

旧版 `tools.web.search.*` 提供商路径仍通过临时兼容性垫片加载，但它们不再是推荐的配置界面。

**Brave 搜索免费额度**：每个 Brave 计划均包含每月 $5 的续期免费额度。搜索计划价格为每 1,000 次请求 $5，因此该额度覆盖每月 1,000 次免费请求。在 Brave 仪表板中设置您的使用限制，以避免意外收费。

请参阅 [Web 工具](/zh/tools/web)。

### 5) Web 抓取工具 (Firecrawl)

当存在 Firecrawl 密钥时，`web_fetch` 可以调用 **API**：

- `FIRECRAWL_API_KEY` 或 `tools.web.fetch.firecrawl.apiKey`

如果未配置 Firecrawl，该工具将回退到直接抓取 + 可读性处理（无付费 API）。

请参阅 [Web 工具](/zh/tools/web)。

### 6) 提供商使用快照（状态/健康状况）

某些状态命令会调用 **提供商 usage endpoints**（提供商使用端点）以显示配额窗口或身份验证健康状况。这些通常是低量调用，但仍然会访问提供商 API：

- `openclaw status --usage`
- `openclaw models status --json`

请参阅 [模型 CLI](/zh/cli/models)。

### 7) 压缩保护摘要

压缩保护机制可以使用 **当前模型** 摘要会话历史，运行时会调用提供商 API。

请参阅 [会话管理 + 压缩](/zh/reference/session-management-compaction)。

### 8) 模型扫描 / 探测

`openclaw models scan` 可以探测 OpenRouter 模型，并在启用探测时使用 `OPENROUTER_API_KEY`。

请参阅 [模型 CLI](/zh/cli/models)。

### 9) 对话（语音）

配置后，对话模式可以调用 **ElevenLabs**：

- `ELEVENLABS_API_KEY` 或 `talk.apiKey`

请参阅 [对话模式](/zh/nodes/talk)。

### 10) Skills（第三方 API）

Skills 可以在 `skills.entries.<name>.apiKey` 中存储 `apiKey`。如果技能使用该密钥调用外部 API，则可能会根据该技能的提供商产生费用。

请参阅 [Skills](/zh/tools/skills)。
