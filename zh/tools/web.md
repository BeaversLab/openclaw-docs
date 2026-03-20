---
summary: "Web search + fetch tools (Brave, Firecrawl, Gemini, Grok, Kimi, and Perplexity providers)"
read_when:
  - 您想要启用 web_search 或 web_fetch
  - 您需要 提供商 API key setup
  - 您想要使用 Gemini 结合 Google Search grounding
title: "Web Tools"
---

# Web 工具

OpenClaw 附带了两个轻量级 Web 工具：

- `web_search` — 使用 Brave Search API、Firecrawl Search、Gemini with Google Search grounding、Grok、Kimi 或 Perplexity Search API 搜索 Web。
- `web_fetch` — HTTP 获取 + 可读内容提取 (HTML → markdown/text)。

这些**不是**浏览器自动化工具。对于重度依赖 JS 的网站或需要登录的情况，请使用
[Browser 工具](/zh/tools/browser)。

## 工作原理

- `web_search` 会调用您配置的 提供商 并返回结果。
- 结果会按查询缓存 15 分钟（可配置）。
- `web_fetch` 执行普通的 HTTP GET 并提取可读内容
  (HTML → markdown/text)。它**不**执行 JavaScript。
- `web_fetch` 默认启用（除非明确禁用）。
- 当启用时，内置的 Firecrawl 插件还会添加 `firecrawl_search` 和 `firecrawl_scrape`。

有关特定于 提供商 的详细信息，请参阅 [Brave Search 设置](/zh/brave-search) 和 [Perplexity Search 设置](/zh/perplexity)。

## 选择搜索提供商

| 提供商                  | 结果形态             | 提供商特有的过滤器                                        | 备注                                              | API 密钥                                    |
| ----------------------- | -------------------- | --------------------------------------------------------- | ------------------------------------------------- | ------------------------------------------- |
| **Brave Search API**    | 带有片段的结构化结果 | `country`、`language`、`ui_lang`、时间                    | 支持 Brave `llm-context` 模式                     | `BRAVE_API_KEY`                             |
| **Firecrawl Search**    | 带有片段的结构化结果 | 使用 `firecrawl_search` 进行 Firecrawl 特定的搜索选项设置 | 最适合将搜索与 Firecrawl 抓取/提取结合使用        | `FIRECRAWL_API_KEY`                         |
| **Gemini**              | AI 合成的答案 + 引用 | —                                                         | 使用 Google Search grounding                      | `GEMINI_API_KEY`                            |
| **Grok**                | AI 合成的答案 + 引用 | —                                                         | 使用 xAI Web grounded 响应                        | `XAI_API_KEY`                               |
| **Kimi**                | AI 合成的答案 + 引用 | —                                                         | 使用 Moonshot 网络搜索                            | `KIMI_API_KEY` / `MOONSHOT_API_KEY`         |
| **Perplexity 搜索 API** | 包含片段的结构化结果 | `country`， `language`，时间， `domain_filter`            | 支持内容提取控制； OpenRouter 使用 Sonar 兼容路径 | `PERPLEXITY_API_KEY` / `OPENROUTER_API_KEY` |

### 自动检测

上表按字母顺序排列。如果未显式设置 `provider`，运行时自动检测将按以下顺序检查提供商：

1. **Brave** — `BRAVE_API_KEY` 环境变量或 `plugins.entries.brave.config.webSearch.apiKey`
2. **Gemini** — `GEMINI_API_KEY` 环境变量或 `plugins.entries.google.config.webSearch.apiKey`
3. **Grok** — `XAI_API_KEY` 环境变量或 `plugins.entries.xai.config.webSearch.apiKey`
4. **Kimi** — `KIMI_API_KEY` / `MOONSHOT_API_KEY` 环境变量或 `plugins.entries.moonshot.config.webSearch.apiKey`
5. **Perplexity** — `PERPLEXITY_API_KEY`， `OPENROUTER_API_KEY` 或 `plugins.entries.perplexity.config.webSearch.apiKey`
6. **Firecrawl** — `FIRECRAWL_API_KEY` 环境变量或 `plugins.entries.firecrawl.config.webSearch.apiKey`

如果未找到密钥，它将回退到 Brave（您将收到一个缺失密钥的错误，提示您进行配置）。

运行时 SecretRef 行为：

- Web 工具 SecretRefs 在网关启动/重新加载时原子解析。
- 在自动检测模式下， OpenClaw 仅解析所选提供商密钥。未选中的提供商 SecretRefs 保持非活动状态，直到被选中。
- 如果所选的提供商 SecretRef 未解析且不存在提供商环境变量回退，启动/重新加载将快速失败。

## 设置网络搜索

使用 `openclaw configure --section web` 设置您的 API 密钥并选择一个提供商。

### Brave 搜索

1. 在 [brave.com/search/api](https://brave.com/search/api/) 创建 Brave 搜索 API 账户
2. 在仪表板中，选择 **Search** 计划并生成 API 密钥。
3. 运行 `openclaw configure --section web` 将密钥存储在配置中，或在您的环境中设置 `BRAVE_API_KEY`。

每个 Brave 计划都包含 **每月 5 美元的免费额度**（每月更新）。搜索计划每 1,000 次请求花费 5 美元，因此该额度覆盖每月 1,000 次查询。请在 Brave 仪表板中设置您的使用限制，以避免意外收费。有关当前计划和定价，请参阅 [Brave API portal](https://brave.com/search/api/)。

### Perplexity 搜索

1. 在 [perplexity.ai/settings/api](https://www.perplexity.ai/settings/api) 创建一个 Perplexity 帐户
2. 在仪表板中生成一个 API 密钥
3. 运行 `openclaw configure --section web` 将密钥存储在配置中，或者在您的环境中设置 `PERPLEXITY_API_KEY`。

为了保持与旧版 Sonar/OpenRouter 的兼容性，请改为设置 `OPENROUTER_API_KEY`，或者使用 `sk-or-...` 密钥配置 `plugins.entries.perplexity.config.webSearch.apiKey`。设置 `plugins.entries.perplexity.config.webSearch.baseUrl` 或 `model` 也会让 Perplexity 重新选择 chat-completions 兼容路径。

特定于提供商的 Web 搜索配置现在位于 `plugins.entries.<plugin>.config.webSearch.*` 下。
旧版 `tools.web.search.*` 提供商路径仍然在一个版本中通过兼容性垫片加载，但不应在新配置中使用它们。

有关更多详细信息，请参阅 [Perplexity Search API Docs](https://docs.perplexity.ai/guides/search-quickstart)。

### 在哪里存储密钥

**通过配置：** 运行 `openclaw configure --section web`。它会将密钥存储在特定于提供商的配置路径下：

- Brave：`plugins.entries.brave.config.webSearch.apiKey`
- Firecrawl：`plugins.entries.firecrawl.config.webSearch.apiKey`
- Gemini：`plugins.entries.google.config.webSearch.apiKey`
- Grok：`plugins.entries.xai.config.webSearch.apiKey`
- Kimi：`plugins.entries.moonshot.config.webSearch.apiKey`
- Perplexity：`plugins.entries.perplexity.config.webSearch.apiKey`

所有这些字段也都支持 SecretRef 对象。

**通过环境：** 在 Gateway 进程环境中设置提供商环境变量：

- Brave：`BRAVE_API_KEY`
- Firecrawl：`FIRECRAWL_API_KEY`
- Gemini：`GEMINI_API_KEY`
- Grok：`XAI_API_KEY`
- Kimi：`KIMI_API_KEY` 或 `MOONSHOT_API_KEY`
- Perplexity：`PERPLEXITY_API_KEY` 或 `OPENROUTER_API_KEY`

对于 gateway 安装，请将这些放入 `~/.openclaw/.env`（或您的服务环境）中。请参阅 [Env vars](/zh/help/faq#how-does-openclaw-load-environment-variables)。

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

当您在新手引导或 `openclaw configure --section web` 中选择 Firecrawl 时，OpenClaw 会自动启用内置的 Firecrawl 插件，因此 `web_search`、`firecrawl_search` 和 `firecrawl_scrape` 均可用。

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

`llm-context` 返回提取的页面块用于生成依据，而不是标准的 Brave 摘要。
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

## 使用 Gemini（Google 搜索依据）

Gemini 模型支持内置的 [Google 搜索依据](https://ai.google.dev/gemini-api/docs/grounding)，
该功能返回由实时 Google 搜索结果支持的 AI 综合答案，并附上引用。

### 获取 Gemini API 密钥

1. 前往 [Google AI Studio](https://aistudio.google.com/apikey)
2. 创建一个 API 密钥
3. 在 Gateway 环境中设置 `GEMINI_API_KEY`，或配置 `plugins.entries.google.config.webSearch.apiKey`

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

**环境变量替代方案：** 在 Gateway 环境中设置 `GEMINI_API_KEY`。
对于网关安装，请将其放入 `~/.openclaw/.env` 中。

### 说明

- 来自 Gemini 依据的引用 URL 会自动从 Google
  重定向 URL 解析为直接 URL。
- 重定向解析在返回最终引用 URL 之前，会使用 SSRF 防护路径（HEAD + 重定向检查 + http/https 验证）。
- 重定向解析使用严格的 SSRF 默认设置，因此会阻止对私有/内部目标的重定向。
- 默认模型（`gemini-2.5-flash`）速度快且具有成本效益。
  可以使用任何支持依据功能的 Gemini 模型。

## web_search

使用您配置的提供商搜索网络。

### 要求

- `tools.web.search.enabled` 不得为 `false`（默认：启用）
- 您所选提供商的 API 密钥：
  - **Brave**：`BRAVE_API_KEY` 或 `plugins.entries.brave.config.webSearch.apiKey`
  - **Firecrawl**: `FIRECRAWL_API_KEY` 或 `plugins.entries.firecrawl.config.webSearch.apiKey`
  - **Gemini**: `GEMINI_API_KEY` 或 `plugins.entries.google.config.webSearch.apiKey`
  - **Grok**: `XAI_API_KEY` 或 `plugins.entries.xai.config.webSearch.apiKey`
  - **Kimi**: `KIMI_API_KEY`、`MOONSHOT_API_KEY` 或 `plugins.entries.moonshot.config.webSearch.apiKey`
  - **Perplexity**: `PERPLEXITY_API_KEY`、`OPENROUTER_API_KEY` 或 `plugins.entries.perplexity.config.webSearch.apiKey`
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

参数取决于所选提供商。

Perplexity 的 OpenRouter / Sonar 兼容路径仅支持 `query` 和 `freshness`。
如果您设置了 `plugins.entries.perplexity.config.webSearch.baseUrl` / `model`，使用了 `OPENROUTER_API_KEY`，或者在 `plugins.entries.perplexity.config.webSearch.apiKey` 下配置了 `sk-or-...` 密钥，则纯搜索 API 过滤器将返回显式错误。

| 参数                  | 描述                                          |
| --------------------- | --------------------------------------------- |
| `query`               | 搜索查询（必填）                              |
| `count`               | 返回结果数（1-10，默认值：5）                 |
| `country`             | 双字母 ISO 国家代码（例如："US"、"DE"）       |
| `language`            | ISO 639-1 语言代码（例如："en"、"de"）        |
| `freshness`           | 时间过滤器：`day`、`week`、`month` 或 `year`  |
| `date_after`          | 此日期之后的结果 (YYYY-MM-DD)                 |
| `date_before`         | 此日期之前的结果 (YYYY-MM-DD)                 |
| `ui_lang`             | UI 语言代码（仅限 Brave）                     |
| `domain_filter`       | 域名允许列表/拒绝列表数组（仅限 Perplexity）  |
| `max_tokens`          | 总内容预算，默认 25000（仅限 Perplexity）     |
| `max_tokens_per_page` | 每页 token 限制，默认 2048（仅限 Perplexity） |

Firecrawl `web_search` 支持 `query` 和 `count`。对于 Firecrawl 特定的控制（例如 `sources`、`categories`、结果抓取或抓取超时），请使用捆绑的 Firecrawl 插件中的 `firecrawl_search`。

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

启用 Brave `llm-context` 模式后，不支持 `ui_lang`、`freshness`、`date_after` 和
`date_before`。请使用 Brave `web` 模式来应用这些过滤器。

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
- `extractMode`（`markdown` | `text`）
- `maxChars`（截断长页面）

注意：

- `web_fetch` 首先使用 Readability（主要内容提取），然后使用 Firecrawl（如果已配置）。如果两者都失败，该工具将返回错误。
- Firecrawl 请求默认使用绕过机器人模式并缓存结果。
- Firecrawl SecretRef 仅在 Firecrawl 处于活动状态时才解析（`tools.web.fetch.enabled !== false` 和 `tools.web.fetch.firecrawl.enabled !== false`）。
- 如果 Firecrawl 处于活动状态且其 SecretRef 未解析且没有 `FIRECRAWL_API_KEY` 回退，启动/重新加载将快速失败。
- `web_fetch` 默认发送类似 Chrome 的 User-Agent 和 `Accept-Language`；如需要，请覆盖 `userAgent`。
- `web_fetch` 会阻止私有/内部主机名并重新检查重定向（使用 `maxRedirects` 限制）。
- `maxChars` 被限制为 `tools.web.fetch.maxCharsCap`。
- `web_fetch` 在解析之前将下载的响应正文大小限制为 `tools.web.fetch.maxResponseBytes`；超大的响应会被截断并包含警告。
- `web_fetch` 是尽力而为的提取；某些站点将需要浏览器工具。
- 有关密钥设置和服务详细信息，请参阅 [Firecrawl](/zh/tools/firecrawl)。
- 响应会被缓存（默认 15 分钟），以减少重复获取。
- 如果您使用工具配置文件/允许列表，请添加 `web_search`/`web_fetch` 或 `group:web`。
- 如果缺少 API 密钥，`web_search` 将返回一个包含文档链接的简短设置提示。

import zh from "/components/footer/zh.mdx";

<zh />
