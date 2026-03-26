---
summary: "Web search + fetch tools (Brave, Firecrawl, Gemini, Grok, Kimi, Perplexity, and Tavily providers)"
read_when:
  - You want to enable web_search or web_fetch
  - You need provider API key setup
  - You want to use Gemini with Google Search grounding
title: "Web Tools"
---

# Web 工具

OpenClaw 附带了两个轻量级的 Web 工具：

- `web_search` — 使用Brave Search API、Firecrawl Search、Gemini with Google Search grounding、Grok、Kimi、Perplexity Search API或Tavily Search API搜索网络。
- `web_fetch` — HTTP获取 + 可读性提取 (HTML → markdown/text)。

这些**不是**浏览器自动化。对于JS密集型站点或登录，请使用
[浏览器工具](/zh/tools/browser)。

## 工作原理

- `web_search` 调用您配置的提供商并返回结果。
- 结果按查询缓存 15 分钟（可配置）。
- `web_fetch` 执行普通的HTTP GET并提取可读内容
  (HTML → markdown/text)。它**不**执行JavaScript。
- `web_fetch` 默认启用（除非明确禁用）。
- 捆绑的Firecrawl插件在启用时也会添加 `firecrawl_search` 和 `firecrawl_scrape`。
- 捆绑的Tavily插件在启用时也会添加 `tavily_search` 和 `tavily_extract`。

有关特定提供商的详细信息，请参阅[Brave Search设置](/zh/tools/brave-search)、[Perplexity Search设置](/zh/tools/perplexity-search)和[Tavily Search设置](/zh/tools/tavily)。

## Choosing a search 提供商

| Provider                | Result shape                       | Provider-specific filters                                    | Notes                                                       | API key                                     |
| ----------------------- | ---------------------------------- | ------------------------------------------------------------ | ----------------------------------------------------------- | ------------------------------------------- |
| **Brave Search API**    | Structured results with snippets   | `country`, `language`, `ui_lang`, time                       | Supports Brave `llm-context` mode                           | `BRAVE_API_KEY`                             |
| **Firecrawl Search**    | Structured results with snippets   | Use `firecrawl_search` for Firecrawl-specific search options | Best for pairing search with Firecrawl scraping/extraction  | `FIRECRAWL_API_KEY`                         |
| **Gemini**              | AI-synthesized answers + citations | —                                                            | Uses Google Search grounding                                | `GEMINI_API_KEY`                            |
| **Grok**                | AI-synthesized answers + citations | —                                                            | Uses xAI web-grounded responses                             | `XAI_API_KEY`                               |
| **Kimi**                | AI 综合的答案 + 引用               | —                                                            | 使用 Moonshot 网络搜索                                      | `KIMI_API_KEY` / `MOONSHOT_API_KEY`         |
| **Perplexity 搜索 API** | 带片段的结构化结果                 | `country`、`language`、时间、`domain_filter`                 | 支持内容提取控制；OpenRouter 使用 Sonar 兼容路径            | `PERPLEXITY_API_KEY` / `OPENROUTER_API_KEY` |
| **Tavily 搜索 API**     | 带片段的结构化结果                 | 使用 `tavily_search` 进行 Tavily 特定的搜索选项设置          | 搜索深度、主题过滤、AI 答案、通过 `tavily_extract` 提取 URL | `TAVILY_API_KEY`                            |

### 自动检测

上表按字母顺序排列。如果未显式设置 `provider`，运行时自动检测将按以下顺序检查提供商：

1. **Brave** — `BRAVE_API_KEY` 环境变量或 `plugins.entries.brave.config.webSearch.apiKey`
2. **Gemini** — `GEMINI_API_KEY` 环境变量或 `plugins.entries.google.config.webSearch.apiKey`
3. **Grok** — `XAI_API_KEY` 环境变量或 `plugins.entries.xai.config.webSearch.apiKey`
4. **Kimi** — `KIMI_API_KEY` / `MOONSHOT_API_KEY` 环境变量或 `plugins.entries.moonshot.config.webSearch.apiKey`
5. **Perplexity** — `PERPLEXITY_API_KEY`、`OPENROUTER_API_KEY` 或 `plugins.entries.perplexity.config.webSearch.apiKey`
6. **Firecrawl** — `FIRECRAWL_API_KEY` 环境变量或 `plugins.entries.firecrawl.config.webSearch.apiKey`
7. **Tavily** — `TAVILY_API_KEY` 环境变量或 `plugins.entries.tavily.config.webSearch.apiKey`

如果未找到密钥，则回退到 Brave（您将收到一个提示配置的缺失密钥错误）。

运行时 SecretRef 行为：

- Web 工具 SecretRefs 在网关启动/重新加载时原子解析。
- 在自动检测模式下，OpenClaw 仅解析所选的提供商密钥。未选中的提供商 SecretRefs 保持非活动状态，直到被选中。
- 如果所选的提供商 SecretRef 未解析且不存在提供商环境回退，启动/重新加载将快速失败。

## 设置网络搜索

使用 `openclaw configure --section web` 设置您的 API 密钥并选择提供商。

### Brave 搜索

1. 在 [brave.com/search/api](https://brave.com/search/api/) 创建一个 Brave Search API 账户
2. 在仪表盘中，选择 **Search** 计划并生成一个 API 密钥。
3. 运行 `openclaw configure --section web` 将密钥存储在配置中，或者在您的环境中设置 `BRAVE_API_KEY`。

每个 Brave 计划都包含 **每月 5 美元的免费额度**（可续期）。Search 计划每 1,000 次请求收费 5 美元，因此该额度覆盖每月 1,000 次查询。在 Brave 仪表盘中设置您的使用限额，以避免意外收费。有关当前计划和定价，请参阅 [Brave API 门户](https://brave.com/search/api/)。

### Perplexity Search

1. 在 [perplexity.ai/settings/api](https://www.perplexity.ai/settings/api) 创建一个 Perplexity 账户
2. 在仪表盘中生成一个 API 密钥
3. 运行 `openclaw configure --section web` 将密钥存储在配置中，或者在您的环境中设置 `PERPLEXITY_API_KEY`。

为了与传统的 Sonar/OpenRouter 兼容，请改为设置 `OPENROUTER_API_KEY`，或使用 `sk-or-...` 密钥配置 `plugins.entries.perplexity.config.webSearch.apiKey`。设置 `plugins.entries.perplexity.config.webSearch.baseUrl` 或 `model` 也会让 Perplexity 重新选择 chat-completions 兼容路径。

特定于提供商的网络搜索配置现在位于 `plugins.entries.<plugin>.config.webSearch.*` 下。
传统的 `tools.web.search.*` 提供商路径仍然通过兼容性填充层加载一个版本，但不应在新的配置中使用它们。

有关更多详细信息，请参阅 [Perplexity Search API 文档](https://docs.perplexity.ai/guides/search-quickstart)。

### 密钥存储位置

**通过配置：** 运行 `openclaw configure --section web`。它会将密钥存储在特定于提供商的配置路径下：

- Brave： `plugins.entries.brave.config.webSearch.apiKey`
- Firecrawl： `plugins.entries.firecrawl.config.webSearch.apiKey`
- Gemini： `plugins.entries.google.config.webSearch.apiKey`
- Grok： `plugins.entries.xai.config.webSearch.apiKey`
- Kimi： `plugins.entries.moonshot.config.webSearch.apiKey`
- Perplexity： `plugins.entries.perplexity.config.webSearch.apiKey`
- Tavily： `plugins.entries.tavily.config.webSearch.apiKey`

所有这些字段也都支持 SecretRef 对象。

**通过环境：** 在 Gateway(网关) 进程环境中设置提供商环境变量：

- Brave： `BRAVE_API_KEY`
- Firecrawl： `FIRECRAWL_API_KEY`
- Gemini： `GEMINI_API_KEY`
- Grok： `XAI_API_KEY`
- Kimi：`KIMI_API_KEY` 或 `MOONSHOT_API_KEY`
- Perplexity：`PERPLEXITY_API_KEY` 或 `OPENROUTER_API_KEY`
- Tavily：`TAVILY_API_KEY`

对于 Gateway(网关) 安装，请将这些放入 `~/.openclaw/.env`（或您的服务环境）中。请参阅 [环境变量](/zh/help/faq#how-does-openclaw-load-environment-variables)。

### 配置示例

**Brave 搜索：**

```json5
{
  plugins: {
    entries: {
      brave: {
        config: {
          webSearch: {
            apiKey: "YOUR_BRAVE_API_KEY", // optional if BRAVE_API_KEY is set // pragma: allowlist secret
          },
        },
      },
    },
  },
  tools: {
    web: {
      search: {
        enabled: true,
        provider: "brave",
      },
    },
  },
}
```

**Firecrawl 搜索：**

```json5
{
  plugins: {
    entries: {
      firecrawl: {
        enabled: true,
      },
    },
  },
  tools: {
    web: {
      search: {
        enabled: true,
        provider: "firecrawl",
      },
    },
  },
  plugins: {
    entries: {
      firecrawl: {
        enabled: true,
        config: {
          webSearch: {
            apiKey: "fc-...", // optional if FIRECRAWL_API_KEY is set
            baseUrl: "https://api.firecrawl.dev",
          },
        },
      },
    },
  },
}
```

当您在 新手引导 中或 `openclaw configure --section web` 中选择 Firecrawl 时，OpenClaw 会自动启用内置的 Firecrawl 插件，因此 `web_search`、`firecrawl_search` 和 `firecrawl_scrape` 均可用。

**Tavily 搜索：**

```json5
{
  plugins: {
    entries: {
      tavily: {
        enabled: true,
        config: {
          webSearch: {
            apiKey: "tvly-...", // optional if TAVILY_API_KEY is set
            baseUrl: "https://api.tavily.com",
          },
        },
      },
    },
  },
  tools: {
    web: {
      search: {
        enabled: true,
        provider: "tavily",
      },
    },
  },
}
```

当您在 新手引导 中或 `openclaw configure --section web` 中选择 Tavily 时，OpenClaw 会自动启用内置的 Tavily 插件，因此 `web_search`、`tavily_search` 和 `tavily_extract` 均可用。

**Brave LLM 上下文模式：**

```json5
{
  plugins: {
    entries: {
      brave: {
        config: {
          webSearch: {
            apiKey: "YOUR_BRAVE_API_KEY", // optional if BRAVE_API_KEY is set // pragma: allowlist secret
            mode: "llm-context",
          },
        },
      },
    },
  },
  tools: {
    web: {
      search: {
        enabled: true,
        provider: "brave",
      },
    },
  },
}
```

`llm-context` 返回提取的页面块用于上下文，而不是标准的 Brave 摘要。
在此模式下，`country` 和 `language` / `search_lang` 仍然有效，但 `ui_lang`、
`freshness`、`date_after` 和 `date_before` 会被拒绝。

**Perplexity 搜索：**

```json5
{
  plugins: {
    entries: {
      perplexity: {
        config: {
          webSearch: {
            apiKey: "pplx-...", // optional if PERPLEXITY_API_KEY is set
          },
        },
      },
    },
  },
  tools: {
    web: {
      search: {
        enabled: true,
        provider: "perplexity",
      },
    },
  },
}
```

**通过 OpenRouter / Sonar 兼容层使用 Perplexity：**

```json5
{
  plugins: {
    entries: {
      perplexity: {
        config: {
          webSearch: {
            apiKey: "<openrouter-api-key>", // optional if OPENROUTER_API_KEY is set
            baseUrl: "https://openrouter.ai/api/v1",
            model: "perplexity/sonar-pro",
          },
        },
      },
    },
  },
  tools: {
    web: {
      search: {
        enabled: true,
        provider: "perplexity",
      },
    },
  },
}
```

## 使用 Gemini（Google 搜索上下文）

Gemini 模型支持内置的 [Google 搜索上下文](https://ai.google.dev/gemini-api/docs/grounding)，
该功能返回由实时 Google 搜索结果支持并带有引用的 AI 综合答案。

### 获取 Gemini API 密钥

1. 前往 [Google AI Studio](https://aistudio.google.com/apikey)
2. 创建 API 密钥
3. 在 Gateway(网关) 环境中设置 `GEMINI_API_KEY`，或配置 `plugins.entries.google.config.webSearch.apiKey`

### 设置 Gemini 搜索

```json5
{
  plugins: {
    entries: {
      google: {
        config: {
          webSearch: {
            // API key (optional if GEMINI_API_KEY is set)
            apiKey: "AIza...",
            // Model (defaults to "gemini-2.5-flash")
            model: "gemini-2.5-flash",
          },
        },
      },
    },
  },
  tools: {
    web: {
      search: {
        provider: "gemini",
      },
    },
  },
}
```

**环境变量替代方案：** 在 Gateway(网关) 环境中设置 `GEMINI_API_KEY`。
对于 Gateway(网关) 安装，请将其放入 `~/.openclaw/.env` 中。

### 注意

- 来自 Gemini 上下文的引用 URL 会自动从 Google
  重定向 URL 解析为直接 URL。
- 重定向解析在返回最终引文 URL 之前，使用 SSRF 防护路径（HEAD + 重定向检查 + http/https 验证）。
- 重定向解析使用严格的 SSRF 默认值，因此阻止重定向到私有/内部目标。
- 默认模型 (`gemini-2.5-flash`) 快速且具有成本效益。
  可以使用任何支持 grounding 的 Gemini 模型。

## web_search

使用您配置的提供商搜索网络。

### 要求

- `tools.web.search.enabled` 不得为 `false`（默认：启用）
- 所选提供商的 API 密钥：
  - **Brave**：`BRAVE_API_KEY` 或 `plugins.entries.brave.config.webSearch.apiKey`
  - **Firecrawl**：`FIRECRAWL_API_KEY` 或 `plugins.entries.firecrawl.config.webSearch.apiKey`
  - **Gemini**：`GEMINI_API_KEY` 或 `plugins.entries.google.config.webSearch.apiKey`
  - **Grok**：`XAI_API_KEY` 或 `plugins.entries.xai.config.webSearch.apiKey`
  - **Kimi**：`KIMI_API_KEY`、`MOONSHOT_API_KEY` 或 `plugins.entries.moonshot.config.webSearch.apiKey`
  - **Perplexity**：`PERPLEXITY_API_KEY`、`OPENROUTER_API_KEY` 或 `plugins.entries.perplexity.config.webSearch.apiKey`
  - **Tavily**：`TAVILY_API_KEY` 或 `plugins.entries.tavily.config.webSearch.apiKey`
- 上述所有提供商密钥字段均支持 SecretRef 对象。

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

参数取决于所选的提供商。

Perplexity 的 OpenRouter / Sonar 兼容性路径仅支持 `query` 和 `freshness`。
如果您设置了 `plugins.entries.perplexity.config.webSearch.baseUrl` / `model`、使用了 `OPENROUTER_API_KEY`，或者在 `plugins.entries.perplexity.config.webSearch.apiKey` 下配置了 `sk-or-...` 密钥，则仅限搜索 API 的过滤器将返回显式错误。

| 参数                  | 描述                                          |
| --------------------- | --------------------------------------------- |
| `query`               | 搜索查询（必填）                              |
| `count`               | 要返回的结果数（1-10，默认：5）               |
| `country`             | 2 字母 ISO 国家代码（例如“US”、“DE”）         |
| `language`            | ISO 639-1 语言代码（例如“en”、“de”）          |
| `freshness`           | 时间过滤器：`day`、`week`、`month` 或 `year`  |
| `date_after`          | 此日期之后的结果 (YYYY-MM-DD)                 |
| `date_before`         | 此日期之前的结果 (YYYY-MM-DD)                 |
| `ui_lang`             | UI 语言代码（仅限 Brave）                     |
| `domain_filter`       | 域名允许列表/拒绝列表数组（仅限 Perplexity）  |
| `max_tokens`          | 总内容预算，默认 25000（仅限 Perplexity）     |
| `max_tokens_per_page` | 每页 token 限制，默认 2048（仅限 Perplexity） |

Firecrawl `web_search` 支持 `query` 和 `count`。对于 Firecrawl 特定的控制（如 `sources`、`categories`、结果抓取或抓取超时），请使用捆绑的 Firecrawl 插件中的 `firecrawl_search`。

Tavily `web_search` 支持 `query` 和 `count`（最多 20 个结果）。对于 Tavily 特定的控制（如 `search_depth`、`topic`、`include_answer` 或域名过滤器），请使用捆绑的 Tavily 插件中的 `tavily_search`。对于 URL 内容提取，请使用 `tavily_extract`。详情请参阅 [Tavily](/zh/tools/tavily)。

**示例：**

```javascript
// German-specific search
await web_search({
  query: "TV online schauen",
  country: "DE",
  language: "de",
});

// Recent results (past week)
await web_search({
  query: "TMBG interview",
  freshness: "week",
});

// Date range search
await web_search({
  query: "AI developments",
  date_after: "2024-01-01",
  date_before: "2024-06-30",
});

// Domain filtering (Perplexity only)
await web_search({
  query: "climate research",
  domain_filter: ["nature.com", "science.org", ".edu"],
});

// Exclude domains (Perplexity only)
await web_search({
  query: "product reviews",
  domain_filter: ["-reddit.com", "-pinterest.com"],
});

// More content extraction (Perplexity only)
await web_search({
  query: "detailed AI research",
  max_tokens: 50000,
  max_tokens_per_page: 4096,
});
```

当启用 Brave `llm-context` 模式时，不支持 `ui_lang`、`freshness`、`date_after` 和 `date_before`。对于这些过滤器，请使用 Brave `web` 模式。

## web_fetch

获取 URL 并提取可读内容。

### web_fetch 要求

- `tools.web.fetch.enabled` 不得为 `false`（默认：已启用）
- 可选的 Firecrawl 回退：设置 `tools.web.fetch.firecrawl.apiKey` 或 `FIRECRAWL_API_KEY`。
- `tools.web.fetch.firecrawl.apiKey` 支持 SecretRef 对象。

### web_fetch 配置

```json5
{
  tools: {
    web: {
      fetch: {
        enabled: true,
        maxChars: 50000,
        maxCharsCap: 50000,
        maxResponseBytes: 2000000,
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

### web_fetch 工具参数

- `url`（必填，仅限 http/https）
- `extractMode` (`markdown` | `text`)
- `maxChars`（截断长页面）

注意：

- `web_fetch` 首先使用 Readability（主要内容提取），然后使用 Firecrawl（如果已配置）。如果两者都失败，该工具会返回错误。
- Firecrawl 请求默认使用绕过机器人模式并缓存结果。
- Firecrawl SecretRefs 仅在 Firecrawl 处于活动状态时（`tools.web.fetch.enabled !== false` 和 `tools.web.fetch.firecrawl.enabled !== false`）才被解析。
- 如果 Firecrawl 处于活动状态且其 SecretRef 未解析，且没有 `FIRECRAWL_API_KEY` 回退，启动/重载将快速失败。
- `web_fetch` 默认发送类似 Chrome 的 User-Agent 和 `Accept-Language`；如有需要，请覆盖 `userAgent`。
- `web_fetch` 会阻止私有/内部主机名并重新检查重定向（使用 `maxRedirects` 进行限制）。
- `maxChars` 限制在 `tools.web.fetch.maxCharsCap`。
- `web_fetch` 在解析之前将下载的响应主体大小限制为 `tools.web.fetch.maxResponseBytes`；超大的响应会被截断并包含警告。
- `web_fetch` 是尽力而为的提取；某些站点将需要浏览器工具。
- 有关密钥设置和服务详细信息，请参阅 [Firecrawl](/zh/tools/firecrawl)。
- 响应会被缓存（默认 15 分钟）以减少重复获取。
- 如果您使用工具配置文件/允许列表，请添加 `web_search`/`web_fetch` 或 `group:web`。
- 如果缺少 API 密钥，`web_search` 会返回一个简短的设置提示和文档链接。

import zh from "/components/footer/zh.mdx";

<zh />
