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

- `openclaw status --usage` 和 `openclaw channels list` 显示提供商 **使用情况窗口**
  （配额快照，而非每条消息的成本）。

有关详细信息和示例，请参阅 [Token 使用与成本](/zh/en/reference/token-use)。

## 密钥是如何被发现的

OpenClaw 可以从以下来源获取凭据：

- **认证配置文件**（针对每个代理，存储在 `auth-profiles.json` 中）。
- **环境变量**（例如 `OPENAI_API_KEY`、`BRAVE_API_KEY`、`FIRECRAWL_API_KEY`）。
- **配置**（`models.providers.*.apiKey`、`tools.web.search.*`、`tools.web.fetch.firecrawl.*`，
  `memorySearch.*`、`talk.apiKey`）。
- **技能**（`skills.entries.<name>.apiKey`）可能会将密钥导出到技能进程环境中。

## 可能消耗密钥的功能

### 1) 核心模型响应（聊天 + 工具）

每次回复或工具调用都会使用 **当前模型提供商**（OpenAI、Anthropic 等）。这是
使用量和成本的主要来源。

有关价格配置，请参阅 [模型](/zh/en/providers/models)；有关显示，请参阅 [Token 使用与成本](/zh/en/reference/token-use)。

### 2) 媒体理解（音频/图像/视频）

传入的媒体可以在回复运行之前进行摘要/转录。这会使用模型/提供商 API。

- 音频：OpenAI / Groq / Deepgram（现在在密钥存在时 **自动启用**）。
- 图像：OpenAI / Anthropic / Google。
- 视频：Google。

参见[媒体理解](/zh/en/nodes/media-understanding)。

### 3) 记忆嵌入 + 语义搜索

当配置为远程提供商时，语义记忆搜索使用**嵌入 API**：

- `memorySearch.provider = "openai"` → OpenAI 嵌入
- `memorySearch.provider = "gemini"` → Gemini 嵌入
- `memorySearch.provider = "voyage"` → Voyage 嵌入
- `memorySearch.provider = "mistral"` → Mistral 嵌入
- `memorySearch.provider = "ollama"` → Ollama 嵌入（本地/自托管；通常无托管 API 计费）
- 如果本地嵌入失败，可选择回退到远程提供商

您可以使用 `memorySearch.provider = "local"` 将其保持在本地（无 API 使用量）。

参见[记忆](/zh/en/concepts/memory)。

### 4) 网络搜索工具

`web_search` 使用 API 密钥，并可能根据您的提供商产生使用费用：

- **Brave Search API**：`BRAVE_API_KEY` 或 `tools.web.search.apiKey`
- **Gemini (Google Search)**：`GEMINI_API_KEY` 或 `tools.web.search.gemini.apiKey`
- **Grok (xAI)**：`XAI_API_KEY` 或 `tools.web.search.grok.apiKey`
- **Kimi (Moonshot)**：`KIMI_API_KEY`、`MOONSHOT_API_KEY` 或 `tools.web.search.kimi.apiKey`
- **Perplexity 搜索 API**：`PERPLEXITY_API_KEY`、`OPENROUTER_API_KEY` 或 `tools.web.search.perplexity.apiKey`

**Brave Search 免费额度:** 每个 Brave 计划包含每月 $5 的可续期
免费额度。搜索计划每 1,000 次请求收费 $5，因此该额度可覆盖
每月 1,000 次免费请求。请在 Brave 仪表板中设置您的使用限制
以避免意外费用。

参见[网络工具](/zh/en/tools/web)。

### 5) 网络获取工具 (Firecrawl)

当存在 API 密钥时，`web_fetch` 可以调用 **Firecrawl**：

- `FIRECRAWL_API_KEY` 或 `tools.web.fetch.firecrawl.apiKey`

如果未配置 Firecrawl，该工具将回退到直接获取 + 可读性处理（无付费 API）。

参见[网络工具](/zh/en/tools/web)。

### 6) 提供商使用快照（状态/健康）

某些状态命令调用**提供商使用端点**以显示配额窗口或身份验证健康状况。
这些通常是低容量调用，但仍会访问提供商 API：

- `openclaw status --usage`
- `openclaw models status --json`

参见[Models CLI](/zh/en/cli/models)。

### 7) 压缩保护摘要

压缩保护机制可以使用**当前模型**总结会话历史，运行时会调用提供商 API。

参见[会话管理 + 压缩](/zh/en/reference/会话-management-compaction)。

### 8) 模型扫描/探测

`openclaw models scan` 可以探测 OpenRouter 模型，并在启用探测时使用 `OPENROUTER_API_KEY`。

参见[模型 CLI](/zh/en/cli/models)。

### 9) 对话（语音）

对话模式在配置后可以调用 **ElevenLabs**：

- `ELEVENLABS_API_KEY` 或 `talk.apiKey`

参见[对话模式](/zh/en/nodes/talk)。

### 10) 技能（第三方 API）

技能可以在 `skills.entries.<name>.apiKey` 中存储 `apiKey`。如果技能使用该密钥调用外部 API，则可能会根据技能的提供商产生费用。

参见[技能](/zh/en/tools/skills)。

import zh from '/components/footer/zh.mdx';

<zh />
