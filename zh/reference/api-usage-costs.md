---
summary: "审计哪些功能会产生费用、使用哪些 key，以及如何查看用量"
title: "API Usage and Costs"
read_when:
  - 想了解哪些功能可能调用付费 API
  - 需要审计 key、成本与用量可见性
  - 正在解释 /status 或 /usage 费用展示
---
# API 用量与成本

本文列出 **会调用 API key 的功能** 以及费用显示位置。重点是可能产生 provider 用量或付费 API 调用的 OpenClaw 功能。

## 成本显示位置（聊天 + CLI）

**按会话成本快照**
- `/status` 显示当前会话模型、上下文用量与最后一次回复的 token。
- 若模型使用 **API-key 认证**，`/status` 还会显示最后一次回复的 **预估成本**。

**按消息成本脚注**
- `/usage full` 会在每条回复后附加用量脚注，包含 **预估成本**（仅 API-key）。
- `/usage tokens` 仅显示 token；OAuth 流程隐藏金额。

**CLI 用量窗口（provider 配额）**
- `openclaw status --usage` 与 `openclaw channels list` 显示 provider **用量窗口**
  （配额快照，而非每条消息成本）。

详情与示例参见 [Token use & costs](/zh/token-use)。

## Key 的发现方式

OpenClaw 可以从以下来源获取凭据：
- **Auth profiles**（按代理，存储在 `auth-profiles.json`）。
- **环境变量**（如 `OPENAI_API_KEY`、`BRAVE_API_KEY`、`FIRECRAWL_API_KEY`）。
- **配置**（`models.providers.*.apiKey`、`tools.web.search.*`、`tools.web.fetch.firecrawl.*`、
  `memorySearch.*`、`talk.apiKey`）。
- **Skills**（`skills.entries.<name>.apiKey`），可将 key 导出到 skill 进程环境变量。

## 可能产生费用的功能

### 1) 核心模型回复（聊天 + 工具）
每次回复或工具调用都会使用 **当前模型提供商**（OpenAI、Anthropic 等）。这是主要的用量与成本来源。

定价配置参见 [Models](/zh/providers/models)，显示方式参见 [Token use & costs](/zh/token-use)。

### 2) 媒体理解（音频/图片/视频）
入站媒体可在回复前被总结/转写，这会调用模型/provider API。

- 音频：OpenAI / Groq / Deepgram（当存在 key 时 **自动启用**）。
- 图片：OpenAI / Anthropic / Google。
- 视频：Google。

参见 [Media understanding](/zh/nodes/media-understanding)。

### 3) 记忆向量与语义搜索
语义记忆搜索在配置为远程 provider 时会使用 **embedding API**：
- `memorySearch.provider = "openai"` → OpenAI embeddings
- `memorySearch.provider = "gemini"` → Gemini embeddings
- 可选：本地 embeddings 失败时回退到 OpenAI

可使用 `memorySearch.provider = "local"` 保持本地（无 API 用量）。

参见 [Memory](/zh/concepts/memory)。

### 4) Web 搜索工具（Brave / Perplexity via OpenRouter）
`web_search` 使用 API key，可能产生费用：

- **Brave Search API**：`BRAVE_API_KEY` 或 `tools.web.search.apiKey`
- **Perplexity**（通过 OpenRouter）：`PERPLEXITY_API_KEY` 或 `OPENROUTER_API_KEY`

**Brave 免费额度（较慷慨）：**
- **每月 2,000 次请求**
- **每秒 1 次请求**
- **需要信用卡验证**（除非升级，否则不收费）

参见 [Web tools](/zh/tools/web)。

### 5) Web 抓取工具（Firecrawl）
`web_fetch` 在配置 API key 时可调用 **Firecrawl**：
- `FIRECRAWL_API_KEY` 或 `tools.web.fetch.firecrawl.apiKey`

若未配置 Firecrawl，工具会回退到直连抓取 + readability（无付费 API）。

参见 [Web tools](/zh/tools/web)。

### 6) Provider 用量快照（status/health）
某些状态命令会调用 **provider 用量端点** 来显示配额窗口或认证健康状态。
这些通常是低频调用，但仍会触发 provider API：
- `openclaw status --usage`
- `openclaw models status --json`

参见 [Models CLI](/zh/cli/models)。

### 7) Compaction 保护性摘要
Compaction safeguard 可能使用 **当前模型** 对会话历史进行摘要，从而调用 provider API。

参见 [Session management + compaction](/zh/reference/session-management-compaction)。

### 8) 模型扫描 / 探测
`openclaw models scan` 可探测 OpenRouter 模型，在启用探测时会使用 `OPENROUTER_API_KEY`。

参见 [Models CLI](/zh/cli/models)。

### 9) Talk（语音）
Talk 模式在配置时可调用 **ElevenLabs**：
- `ELEVENLABS_API_KEY` 或 `talk.apiKey`

参见 [Talk mode](/zh/nodes/talk)。

### 10) Skills（第三方 API）
Skills 可以在 `skills.entries.<name>.apiKey` 中存储 `apiKey`。若某个 skill 使用该 key 访问外部 API，则会产生对应 provider 的费用。

参见 [Skills](/zh/tools/skills)。
