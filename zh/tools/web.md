---
summary: "Web 搜索 + 获取工具（Brave、Gemini、Grok、Kimi 和 Perplexity 提供商）"
read_when:
  - You want to enable web_search or web_fetch
  - You need provider API key setup
  - You want to use Gemini with Google Search grounding
title: "Web 工具"
---

# Web 工具

OpenClaw 附带了两个轻量级的 Web 工具：

- `web_search` — 使用 Brave Search API、Gemini（结合 Google Search grounding）、Grok、Kimi 或 Perplexity Search API 搜索网络。
- `web_fetch` — HTTP 获取 + 可读内容提取（HTML → markdown/text）。

这些**不是**浏览器自动化工具。对于重度 JS 的网站或登录操作，请使用
[浏览器工具](/zh/en/tools/browser)。

## 工作原理

- `web_search` 调用您配置的提供商并返回结果。
- 结果按查询缓存 15 分钟（可配置）。
- `web_fetch` 执行普通的 HTTP GET 并提取可读内容
  （HTML → markdown/text）。它**不**执行 JavaScript。
- `web_fetch` 默认处于启用状态（除非被明确禁用）。

有关特定提供商的详细信息，请参阅 [Brave Search 设置](/zh/en/brave-search) 和 [Perplexity Search 设置](/zh/en/perplexity)。

## 选择搜索提供商

| 提供商                  | 结果形状                           | 提供商特定过滤器                         | 备注                                                                          | API 密钥                                   |
| ------------------------- | ---------------------------------- | -------------------------------------------- | ------------------------------------------------------------------------------ | ------------------------------------------- |
| **Brave Search API**      | 带有片段的结构化结果               | `country`, `language`, `ui_lang`, time       | 支持 Brave `llm-context` 模式                                              | `BRAVE_API_KEY`                             |
| **Gemini**                | AI 合成的答案 + 引用               | —                                            | 使用 Google Search grounding                                                   | `GEMINI_API_KEY`                            |
| **Grok**                  | AI 合成的答案 + 引用               | —                                            | 使用 xAI web-grounded responses                                                | `XAI_API_KEY`                               |
| **Kimi**                  | AI 合成的答案 + 引用               | —                                            | 使用 Moonshot web search                                                       | `KIMI_API_KEY` / `MOONSHOT_API_KEY`         |
| **Perplexity Search API** | 带有片段的结构化结果               | `country`, `language`, time, `domain_filter` | 支持内容提取控制；OpenRouter 使用 Sonar 兼容路径                                | `PERPLEXITY_API_KEY` / `OPENROUTER_API_KEY` |

### 自动检测

上表按字母顺序排列。如果没有显式设置 `provider`，运行时自动检测将按以下顺序检查提供商：

1. **Brave** — `BRAVE_API_KEY` 环境变量或 `tools.web.search.apiKey` 配置
2. **Gemini** — `GEMINI_API_KEY` 环境变量或 `tools.web.search.gemini.apiKey` 配置
3. **Grok** — `XAI_API_KEY` 环境变量或 `tools.web.search.grok.apiKey` 配置
4. **Kimi** — `KIMI_API_KEY` / `MOONSHOT_API_KEY` 环境变量或 `tools.web.search.kimi.apiKey` 配置
5. **Perplexity** — `PERPLEXITY_API_KEY`、`OPENROUTER_API_KEY` 或 `tools.web.search.perplexity.apiKey` 配置

如果未找到密钥，它将回退到 Brave（您会收到一个缺少密钥的错误，提示您进行配置）。

运行时 SecretRef 行为：

- Web 工具的 SecretRef 在网关启动/重新加载时原子解析。
- 在自动检测模式下，OpenClaw 仅解析所选提供商的密钥。未选中的提供商 SecretRef 将保持非活动状态，直到被选中。
- 如果所选提供商的 SecretRef 未解析且不存在提供商环境变量回退，启动/重新加载将快速失败。

## 设置网络搜索

使用 `openclaw configure --section web` 来设置您的 API 密钥并选择提供商。

### Brave Search

1. 在 [brave.com/search/api](https://brave.com/search/api/) 创建 Brave Search API 账户
2. 在仪表板中，选择 **Search** 计划并生成一个 API 密钥。
3. 运行 `openclaw configure --section web` 将密钥存储在配置中，或在您的环境中设置 `BRAVE_API_KEY`。

每个 Brave 计划都包含 **每月 5 美元的免费额度**（自动续期）。搜索计划每 1,000 次请求收费 5 美元，因此免费额度涵盖每月 1,000 次查询。请在 Brave 仪表板中设置您的使用限制，以免产生意外费用。有关当前计划和定价，请参阅 [Brave API portal](https://brave.com/search/api/)。

### Perplexity Search

1. 在 [perplexity.ai/settings/api](https://www.perplexity.ai/settings/api) 创建 Perplexity 账户
2. 在仪表板中生成一个 API 密钥
3. 运行 `openclaw configure --section web` 将密钥存储在配置中，或在您的环境中设置 `PERPLEXITY_API_KEY`。

为了保持旧版 Sonar/OpenRouter 的兼容性，请改用 `OPENROUTER_API_KEY`，或者使用 `sk-or-...` 密钥配置 `tools.web.search.perplexity.apiKey`。设置 `tools.web.search.perplexity.baseUrl` 或 `model` 也会使 Perplexity 重新选择 chat-completions 兼容路径。

有关更多详细信息，请参阅 [Perplexity Search API Docs](https://docs.perplexity.ai/guides/search-quickstart)。

### 在哪里存储密钥

**通过配置：** 运行 `openclaw configure --section web`。它将密钥存储在特定于提供商的配置路径下：

- Brave: `tools.web.search.apiKey`
- Gemini: `tools.web.search.gemini.apiKey`
- Grok: `tools.web.search.grok.apiKey`
- Kimi: `tools.web.search.kimi.apiKey`
- Perplexity: `tools.web.search.perplexity.apiKey`

所有这些字段也都支持 SecretRef 对象。

**通过环境变量：** 在 Gateway 网关 进程环境中设置提供商的环境变量：

- Brave: `BRAVE_API_KEY`
- Gemini: `GEMINI_API_KEY`
- Grok: `XAI_API_KEY`
- Kimi: `KIMI_API_KEY` 或 `MOONSHOT_API_KEY`
- Perplexity: `PERPLEXITY_API_KEY` 或 `OPENROUTER_API_KEY`

对于网关安装，将这些放入 `~/.openclaw/.env` （或您的服务环境）中。参见 [Env vars](/zh/en/help/faq#how-does-openclaw-load-environment-variables)。

### 配置示例

**Brave Search：**

```json5
{
  tools: {
    web: {
      search: {
        enabled: true,
        provider: "brave",
        apiKey: "YOUR_BRAVE_API_KEY", // optional if BRAVE_API_KEY is set // pragma: allowlist secret
      },
    },
  },
}
```

**Brave LLM 上下文模式：**

```json5
{
  tools: {
    web: {
      search: {
        enabled: true,
        provider: "brave",
        apiKey: "YOUR_BRAVE_API_KEY", // optional if BRAVE_API_KEY is set // pragma: allowlist secret
        brave: {
          mode: "llm-context",
        },
      },
    },
  },
}
```

`llm-context` 返回提取的页面块用于检索增强，而不是标准的 Brave 摘要。
在此模式下，`country` 和 `language` / `search_lang` 仍然有效，但 `ui_lang`，
`freshness`， `date_after` 和 `date_before` 会被拒绝。

**Perplexity Search：**

```json5
{
  tools: {
    web: {
      search: {
        enabled: true,
        provider: "perplexity",
        perplexity: {
          apiKey: "pplx-...", // optional if PERPLEXITY_API_KEY is set
        },
      },
    },
  },
}
```

**通过 OpenRouter / Sonar 兼容性使用 Perplexity：**

```json5
{
  tools: {
    web: {
      search: {
        enabled: true,
        provider: "perplexity",
        perplexity: {
          apiKey: "<openrouter-api-key>", // optional if OPENROUTER_API_KEY is set
          baseUrl: "https://openrouter.ai/api/v1",
          model: "perplexity/sonar-pro",
        },
      },
    },
  },
}
```

## 使用 Gemini（Google 搜索增强）

Gemini 模型支持内置的 [Google Search grounding](https://ai.google.dev/gemini-api/docs/grounding)，
它返回由实时 Google 搜索结果支持并附带引用的 AI 综合答案。

### 获取 Gemini API 密钥

1. 前往 [Google AI Studio](https://aistudio.google.com/apikey)
2. 创建一个 API 密钥
3. 在 Gateway 网关 环境中设置 `GEMINI_API_KEY`，或配置 `tools.web.search.gemini.apiKey`

### 设置 Gemini 搜索

```json5
{
  tools: {
    web: {
      search: {
        provider: "gemini",
        gemini: {
          // API key (optional if GEMINI_API_KEY is set)
          apiKey: "AIza...",
          // Model (defaults to "gemini-2.5-flash")
          model: "gemini-2.5-flash",
        },
      },
    },
  },
}
```

**环境变量替代方案：** 在 Gateway 网关 环境中设置 `GEMINI_API_KEY`。
对于 Gateway 网关 安装，将其放入 `~/.openclaw/.env` 中。

### 注意事项

- 来自 Gemini 增强的引用 URL 会自动从 Google 的
  重定向 URL 解析为直接 URL。
- 在返回最终的引用 URL 之前，重定向解析使用 SSRF 防护路径（HEAD + 重定向检查 + http/https 验证）。
- 重定向解析使用严格的 SSRF 默认值，因此指向私有/内部目标的重定向将被阻止。
- 默认模型（`gemini-2.5-flash`）速度快且具有成本效益。
  可以使用任何支持 grounding 的 Gemini 模型。

## web_search

使用您配置的提供商搜索网络。

### 要求

- `tools.web.search.enabled` 不得为 `false` （默认：启用）
- 您所选提供商的 API 密钥：
  - **Brave**: `BRAVE_API_KEY` 或 `tools.web.search.apiKey`
  - **Gemini**: `GEMINI_API_KEY` 或 `tools.web.search.gemini.apiKey`
  - **Grok**: `XAI_API_KEY` 或 `tools.web.search.grok.apiKey`
  - **Kimi**: `KIMI_API_KEY`、`MOONSHOT_API_KEY` 或 `tools.web.search.kimi.apiKey`
  - **Perplexity**: `PERPLEXITY_API_KEY`、`OPENROUTER_API_KEY` 或 `tools.web.search.perplexity.apiKey`
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

除非另有说明，所有参数均适用于 Brave 和原生 Perplexity Search API。

Perplexity 的 OpenRouter / Sonar 兼容路径仅支持 `query` 和 `freshness`。
如果您设置了 `tools.web.search.perplexity.baseUrl` / `model`，使用了 `OPENROUTER_API_KEY`，或者配置了 `sk-or-...` 密钥，仅限搜索 API 的过滤器将返回明确的错误。

| 参数              | 描述                                                     |
| --------------------- | ------------------------------------------------------- |
| `query`               | 搜索查询（必需）                                         |
| `count`               | 返回的结果数量（1-10，默认：5）                           |
| `country`             | 2字母 ISO 国家代码（例如 "US", "DE"）                   |
| `language`            | ISO 639-1 语言代码（例如 "en", "de"）                   |
| `freshness`           | 时间过滤器：`day`, `week`, `month`, 或 `year`        |
| `date_after`          | 此日期之后的结果（YYYY-MM-DD）                           |
| `date_before`         | 此日期之前的结果（YYYY-MM-DD）                           |
| `ui_lang`             | UI 语言代码（仅限 Brave）                                 |
| `domain_filter`       | 域名允许列表/阻止列表数组（仅限 Perplexity）               |
| `max_tokens`          | 总内容预算，默认 25000（仅限 Perplexity）                 |
| `max_tokens_per_page` | 每页 token 限制，默认 2048（仅限 Perplexity）            |

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

当启用 Brave `llm-context` 模式时，不支持 `ui_lang`、`freshness`、`date_after` 和
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

- `url`（必需，仅限 http/https）
- `extractMode` (`markdown` | `text`)
- `maxChars` (截断长页面)

注：

- `web_fetch` 首先使用 Readability（主要内容提取），然后使用 Firecrawl（如果已配置）。如果两者都失败，该工具将返回错误。
- Firecrawl 请求默认使用绕过机器人模式并缓存结果。
- Firecrawl SecretRefs 仅在 Firecrawl 处于活动状态时（`tools.web.fetch.enabled !== false` 和 `tools.web.fetch.firecrawl.enabled !== false`）才会被解析。
- 如果 Firecrawl 处于活动状态且其 SecretRef 未解析且没有 `FIRECRAWL_API_KEY` 回退，启动/重载将快速失败。
- `web_fetch` 默认发送类似 Chrome 的 User-Agent 和 `Accept-Language`；如需要，请覆盖 `userAgent`。
- `web_fetch` 阻止私有/内部主机名并重新检查重定向（用 `maxRedirects` 限制）。
- `maxChars` 被限制在 `tools.web.fetch.maxCharsCap`。
- `web_fetch` 在解析之前将下载的响应正文大小限制为 `tools.web.fetch.maxResponseBytes`；超大的响应会被截断并包含警告。
- `web_fetch` 是尽力而为的提取；某些网站将需要浏览器工具。
- 有关密钥设置和服务详细信息，请参阅 [Firecrawl](/zh/en/tools/firecrawl)。
- 响应会被缓存（默认 15 分钟）以减少重复抓取。
- 如果您使用工具配置文件/允许列表，请添加 `web_search`/`web_fetch` 或 `group:web`。
- 如果缺少 API 密钥，`web_search` 将返回一个简短的设置提示以及文档链接。

import zh from '/components/footer/zh.mdx';

<zh />
