---
summary: "审计可能产生费用的功能、使用的密钥以及如何查看使用情况"
read_when:
  - "您想了解哪些功能可能会调用付费 API"
  - "您需要审计密钥、成本和使用情况可见性"
  - "您正在解释 /status 或 /usage 成本报告"
title: "API 使用和成本"
---

# API 使用和成本

本文档列出了**可以调用 API 密钥的功能**以及其成本显示位置。重点介绍
可能产生提供程序使用量或付费 API 调用的 OpenClaw 功能。

## 成本显示位置（聊天 + CLI）

**每次会话成本快照**

- `/status` 显示当前会话模型、上下文使用量和最后回复的 token 数。
- 如果模型使用 **API 密钥身份验证**，`/status` 还会显示最后回复的**预估成本**。

**每条消息成本页脚**

- `/usage full` 会在每条回复后附加使用情况页脚，包括**预估成本**（仅 API 密钥）。
- `/usage tokens` 仅显示 token；OAuth 流程隐藏美元成本。

**CLI 使用情况窗口（提供程序配额）**

- `openclaw status --usage` 和 `openclaw channels list` 显示提供程序**使用情况窗口**
  （配额快照，而非每条消息的成本）。

有关详细信息和示例，请参阅[Token 使用和成本](/zh/token-use)。

## 密钥发现方式

OpenClaw 可以从以下位置获取凭证：

- **身份验证配置文件**（每个 agent，存储在 `auth-profiles.json` 中）。
- **环境变量**（例如 `OPENAI_API_KEY`、`BRAVE_API_KEY`、`FIRECRAWL_API_KEY`）。
- **配置**（`models.providers.*.apiKey`、`tools.web.search.*`、`tools.web.fetch.firecrawl.*`、
  `memorySearch.*`、`talk.apiKey`）。
- **Skills**（`skills.entries.<name>.apiKey`），可能会将密钥导出到 skill 进程环境。

## 可能使用密钥的功能

### 1) 核心模型响应（聊天 + 工具）

每次回复或工具调用都使用**当前模型提供程序**（OpenAI、Anthropic 等）。这是
使用量和成本的主要来源。

有关价格配置，请参阅[模型](/zh/providers/models)；有关显示，请参阅[Token 使用和成本](/zh/token-use)。

### 2) 媒体理解（音频/图像/视频）

传入的媒体可以在回复运行之前进行摘要/转录。这会使用模型/提供程序 API。

- 音频：OpenAI / Groq / Deepgram（现在在密钥存在时**自动启用**）。
- 图像：OpenAI / Anthropic / Google。
- 视频：Google。

请参阅[媒体理解](/zh/nodes/media-understanding)。

### 3) 记忆嵌入 + 语义搜索

当配置为远程提供程序时，语义记忆搜索使用**嵌入 API**：

- `memorySearch.provider = "openai"` → OpenAI 嵌入
- `memorySearch.provider = "gemini"` → Gemini 嵌入
- 如果本地嵌入失败，可选择回退到 OpenAI

您可以使用 `memorySearch.provider = "local"` 将其保持在本地（不使用 API）。

请参阅[记忆](/zh/concepts/memory)。

### 4) 网络搜索工具（通过 OpenRouter 使用 Brave / Perplexity）

`web_search` 使用 API 密钥，可能会产生使用费用：

- **Brave Search API**：`BRAVE_API_KEY` 或 `tools.web.search.apiKey`
- **Perplexity**（通过 OpenRouter）：`PERPLEXITY_API_KEY` 或 `OPENROUTER_API_KEY`

**Brave 免费套餐（慷慨）：**

- **每月 2,000 次请求**
- **每秒 1 次请求**
- **需要信用卡**进行验证（除非您升级，否则不收费）

请参阅[网络工具](/zh/tools/web)。

### 5) 网络获取工具（Firecrawl）

当存在 API 密钥时，`web_fetch` 可以调用 **Firecrawl**：

- `FIRECRAWL_API_KEY` 或 `tools.web.fetch.firecrawl.apiKey`

如果未配置 Firecrawl，工具会回退到直接获取 + 可读性（无付费 API）。

请参阅[网络工具](/zh/tools/web)。

### 6) 提供程序使用快照（status/health）

某些状态命令调用**提供程序使用端点**以显示配额窗口或身份验证运行状况。
这些通常是低量调用，但仍会访问提供程序 API：

- `openclaw status --usage`
- `openclaw models status --json`

请参阅[模型 CLI](/zh/cli/models)。

### 7) 压缩保护摘要

压缩保护可以使用**当前模型**总结会话历史，
运行时会调用提供程序 API。

请参阅[会话管理 + 压缩](/zh/reference/session-management-compaction)。

### 8) 模型扫描/探测

`openclaw models scan` 可以探测 OpenRouter 模型，并在启用探测时使用 `OPENROUTER_API_KEY`。

请参阅[模型 CLI](/zh/cli/models)。

### 9) 对话（语音）

对话模式在配置后可以调用 **ElevenLabs**：

- `ELEVENLABS_API_KEY` 或 `talk.apiKey`

请参阅[对话模式](/zh/nodes/talk)。

### 10) Skills（第三方 API）

Skills 可以将 `apiKey` 存储在 `skills.entries.<name>.apiKey` 中。如果 skill 使用该密钥进行外部
API 调用，可能会根据 skill 的提供程序产生费用。

请参阅[Skills](/zh/tools/skills)。
