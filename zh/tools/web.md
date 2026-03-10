---
summary: "Web 搜索 + 获取工具（Brave Search API、Perplexity 直连/OpenRouter）"
read_when:
  - "You want to enable web_search or web_fetch"
  - "You need Brave Search API key setup"
  - "You want to use Perplexity Sonar for web search"
title: "Web 工具"
---

# Web 工具

OpenClaw 内置两个轻量级 Web 工具：

- `web_search` — 通过 Brave Search API（默认）或 Perplexity Sonar（直连或通过 OpenRouter）搜索 Web。
- `web_fetch` — HTTP 获取 + 可读内容提取（HTML → markdown/text）。

这些**不是**浏览器自动化工具。对于需要大量 JavaScript 的网站或登录，请使用
[Browser tool](/zh/tools/browser)。

## 工作原理

- `web_search` 调用您配置的提供商并返回结果。
  - **Brave**（默认）：返回结构化结果（标题、URL、摘要）。
  - **Perplexity**：返回 AI 综合答案，并附带来自实时 Web 搜索的引用。
- 结果按查询缓存 15 分钟（可配置）。
- `web_fetch` 执行纯 HTTP GET 并提取可读内容
  （HTML → markdown/text）。它**不**执行 JavaScript。
- `web_fetch` 默认启用（除非明确禁用）。

## 选择搜索提供商

| 提供商             | 优点                                          | 缺点                                     | API Key                                      |
| ------------------- | -------------------------------------------- | ---------------------------------------- | -------------------------------------------- |
| **Brave**（默认） | 快速、结构化结果、免费层                      | 传统搜索结果                             | `BRAVE_API_KEY`                              |
| **Perplexity**      | AI 综合答案、引用、实时                        | 需要 Perplexity 或 OpenRouter 访问权限    | `OPENROUTER_API_KEY` 或 `PERPLEXITY_API_KEY` |

参见 [Brave Search setup](/zh/brave-search) 和 [Perplexity Sonar](/zh/perplexity) 了解提供商特定详情。

在配置中设置提供商：

```json5
{
  tools: {
    web: {
      search: {
        provider: "brave", // or "perplexity"
      },
    },
  },
}
```

示例：切换到 Perplexity Sonar（直连 API）：

```json5
{
  tools: {
    web: {
      search: {
        provider: "perplexity",
        perplexity: {
          apiKey: "pplx-...",
          baseUrl: "https://api.perplexity.ai",
          model: "perplexity/sonar-pro",
        },
      },
    },
  },
}
```

## 获取 Brave API 密钥

1. 在 https://brave.com/search/api/ 创建 Brave Search API 账户
2. 在仪表板中，选择 **Data for Search** 计划（不是 "Data for AI"）并生成 API 密钥。
3. 运行 `openclaw configure --section web` 将密钥存储在配置中（推荐），或在环境中设置 `BRAVE_API_KEY`。

Brave 提供免费层和付费计划；请查看 Brave API 门户了解当前的限制和定价。

### 设置密钥的位置（推荐）

**推荐：**运行 `openclaw configure --section web`。它将密钥存储在
`~/.openclaw/openclaw.json` 下的 `tools.web.search.apiKey` 中。

**环境变量替代方案：**在 Gateway 进程环境中设置 `BRAVE_API_KEY`。
对于 gateway 安装，将其放在 `~/.openclaw/.env` 中（或您的服务环境）。参见 [Env vars](/zh/help/faq#how-does-openclaw-load-environment-variables)。

## 使用 Perplexity（直连或通过 OpenRouter）

Perplexity Sonar 模型具有内置 Web 搜索功能，并返回带有引用的 AI 综合答案。
您可以通过 OpenRouter 使用它们（无需信用卡 - 支持加密货币/预付费）。

### 获取 OpenRouter API 密钥

1. 在 https://openrouter.ai/ 创建账户
2. 添加额度（支持加密货币、预付费或信用卡）
3. 在账户设置中生成 API 密钥

### 设置 Perplexity 搜索

```json5
{
  tools: {
    web: {
      search: {
        enabled: true,
        provider: "perplexity",
        perplexity: {
          // API key (optional if OPENROUTER_API_KEY or PERPLEXITY_API_KEY is set)
          apiKey: "sk-or-v1-...",
          // Base URL (key-aware default if omitted)
          baseUrl: "https://openrouter.ai/api/v1",
          // Model (defaults to perplexity/sonar-pro)
          model: "perplexity/sonar-pro",
        },
      },
    },
  },
}
```

**环境变量替代方案：**在 Gateway 环境中设置 `OPENROUTER_API_KEY` 或 `PERPLEXITY_API_KEY`。
对于 gateway 安装，将其放在 `~/.openclaw/.env` 中。

如果未设置基础 URL，OpenClaw 会根据 API 密钥来源选择默认值：

- `PERPLEXITY_API_KEY` 或 `pplx-...` → `https://api.perplexity.ai`
- `OPENROUTER_API_KEY` 或 `sk-or-...` → `https://openrouter.ai/api/v1`
- 未知密钥格式 → OpenRouter（安全回退）

### 可用的 Perplexity 模型

| 模型                            | 描述                          | 最适用于          |
| -------------------------------- | ------------------------------------ | ----------------- |
| `perplexity/sonar`               | 带有 Web 搜索的快速问答             | 快速查询         |
| `perplexity/sonar-pro`（默认） | 带有 Web 搜索的多步推理 | 复杂问题         |
| `perplexity/sonar-reasoning-pro` | 思维链分析            | 深度研究         |

## web_search

使用您配置的提供商搜索 Web。

### 要求

- `tools.web.search.enabled` 不能为 `false`（默认：启用）
- 您选择的提供商的 API 密钥：
  - **Brave**：`BRAVE_API_KEY` 或 `tools.web.search.apiKey`
  - **Perplexity**：`OPENROUTER_API_KEY`、`PERPLEXITY_API_KEY` 或 `tools.web.search.perplexity.apiKey`

### 配置

```json5
{
  tools: {
    web: {
      search: {
        enabled: true,
        apiKey: "BRAVE_API_KEY_HERE", // optional if BRAVE_API_KEY is set
        maxResults: 5,
        timeoutSeconds: 30,
        cacheTtlMinutes: 15,
      },
    },
  },
}
```

### 工具参数

- `query`（必需）
- `count`（1–10；默认来自配置）
- `country`（可选）：特定区域结果的 2 字母国家代码（例如 "DE"、"US"、"ALL"）。如果省略，Brave 选择其默认区域。
- `search_lang`（可选）：搜索结果的 ISO 语言代码（例如 "de"、"en"、"fr"）
- `ui_lang`（可选）：UI 元素的 ISO 语言代码
- `freshness`（可选，仅 Brave）：按发现时间过滤（`pd`、`pw`、`pm`、`py` 或 `YYYY-MM-DDtoYYYY-MM-DD`）

**示例：**

```javascript
// German-specific search
await web_search({
  query: "TV online schauen",
  count: 10,
  country: "DE",
  search_lang: "de",
});

// French search with French UI
await web_search({
  query: "actualités",
  country: "FR",
  search_lang: "fr",
  ui_lang: "fr",
});

// Recent results (past week)
await web_search({
  query: "TMBG interview",
  freshness: "pw",
});
```

## web_fetch

获取 URL 并提取可读内容。

### 要求

- `tools.web.fetch.enabled` 不能为 `false`（默认：启用）
- 可选的 Firecrawl 回退：设置 `tools.web.fetch.firecrawl.apiKey` 或 `FIRECRAWL_API_KEY`。

### 配置

```json5
{
  tools: {
    web: {
      fetch: {
        enabled: true,
        maxChars: 50000,
        maxCharsCap: 50000,
        timeoutSeconds: 30,
        cacheTtlMinutes: 15,
        maxRedirects: 3,
        userAgent: "Mozilla/5.0 (Macintosh; Intel Mac OS X 14_7_2) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36",
        readability: true,
        firecrawl: {
          enabled: true,
          apiKey: "FIRECRAWL_API_KEY_HERE", // optional if FIRECRAWL_API_KEY is set
          baseUrl: "https://api.firecrawl.dev",
          onlyMainContent: true,
          maxAgeMs: 86400000, // ms (1 day)
          timeoutSeconds: 60,
        },
      },
    },
  },
}
```

### 工具参数

- `url`（必需，仅 http/https）
- `extractMode`（`markdown` | `text`）
- `maxChars`（截断长页面）

注意事项：

- `web_fetch` 首先使用 Readability（主要内容提取），然后使用 Firecrawl（如果配置）。如果两者都失败，工具将返回错误。
- Firecrawl 请求默认使用反机器人模式并缓存结果。
- `web_fetch` 默认发送类似 Chrome 的 User-Agent 和 `Accept-Language`；如果需要，覆盖 `userAgent`。
- `web_fetch` 阻止私有/内部主机名并重新检查重定向（通过 `maxRedirects` 限制）。
- `maxChars` 被限制为 `tools.web.fetch.maxCharsCap`。
- `web_fetch` 是尽力提取；某些网站需要浏览器工具。
- 参见 [Firecrawl](/zh/tools/firecrawl) 了解密钥设置和服务详情。
- 响应会被缓存（默认 15 分钟）以减少重复获取。
- 如果您使用工具配置文件/白名单，添加 `web_search`/`web_fetch` 或 `group:web`。
- 如果缺少 Brave 密钥，`web_search` 将返回简短的设置提示和文档链接。
