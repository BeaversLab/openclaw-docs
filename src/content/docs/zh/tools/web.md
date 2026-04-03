---
title: "网络搜索"
sidebarTitle: "网络搜索"
summary: "web_search、x_search 和 web_fetch —— 搜索网络、搜索 X 帖子或获取页面内容"
read_when:
  - You want to enable or configure web_search
  - You want to enable or configure x_search
  - You need to choose a search provider
  - You want to understand auto-detection and provider fallback
---

# Web Search

`web_search` 工具使用您配置的提供商搜索网络
并返回结果。结果按查询缓存 15 分钟（可配置）。

OpenClaw 还包含用于 X（原 Twitter）帖子的 `x_search` 和
用于轻量级 URL 获取的 `web_fetch`。在此阶段，`web_fetch` 保持
本地运行，而 `web_search` 和 `x_search` 可在底层使用 xAI Responses。

<Info>`web_search` 是一个轻量级 HTTP 工具，而非浏览器自动化。对于 JS 繁重的网站或登录，请使用 [Web Browser](/en/tools/browser)。对于 获取特定 URL，请使用 [Web Fetch](/en/tools/web-fetch)。</Info>

## 快速开始

<Steps>
  <Step title="获取 API 密钥">
    选择一个提供商并获取 API 密钥。请参阅下方的提供商页面
    获取注册链接。
  </Step>
  <Step title="配置">
    ```bash
    openclaw configure --section web
    ```
    这将存储密钥并设置提供商。您也可以设置环境变量
    (例如 `BRAVE_API_KEY`) 并跳过此步骤。
  </Step>
  <Step title="使用">
    代理现在可以调用 `web_search`：

    ```javascript
    await web_search({ query: "OpenClaw plugin SDK" });
    ```

    对于 X 帖子，使用：

    ```javascript
    await x_search({ query: "dinner recipes" });
    ```

  </Step>
</Steps>

## 选择提供商

<CardGroup cols={2}>
  <Card title="Brave Search" icon="shield" href="/en/tools/brave-search">
    带有片段的结构化结果。支持 `llm-context` 模式、国家/语言过滤器。提供免费层级。
  </Card>
  <Card title="DuckDuckGo" icon="bird" href="/en/tools/duckduckgo-search">
    无需密钥的回退选项。不需要 API 密钥。非官方的基于 HTML 的集成。
  </Card>
  <Card title="Exa" icon="brain" href="/en/tools/exa-search">
    神经 + 关键词搜索，附带内容提取（高亮、文本、摘要）。
  </Card>
  <Card title="Firecrawl" icon="flame" href="/en/tools/firecrawl">
    结构化结果。最好与 `firecrawl_search` 和 `firecrawl_scrape` 配合使用以进行深度提取。
  </Card>
  <Card title="Gemini" icon="sparkles" href="/en/tools/gemini-search">
    通过 Google Search 接地生成包含引用的 AI 综合答案。
  </Card>
  <Card title="Grok" icon="zap" href="/en/tools/grok-search">
    通过 xAI web 接地生成包含引用的 AI 综合答案。
  </Card>
  <Card title="Kimi" icon="moon" href="/en/tools/kimi-search">
    通过 Moonshot 网络搜索生成包含引用的 AI 综合答案。
  </Card>
  <Card title="Perplexity" icon="search" href="/en/tools/perplexity-search">
    带有内容提取控制和域名过滤的结构化结果。
  </Card>
  <Card title="SearXNG" icon="server" href="/en/tools/searxng-search">
    自托管的元搜索引擎。无需 API 密钥。聚合 Google、Bing、DuckDuckGo 等搜索引擎。
  </Card>
  <Card title="Tavily" icon="globe" href="/en/tools/tavily">
    结构化结果，具有搜索深度、主题过滤和用于 URL 提取的 `tavily_extract`。
  </Card>
</CardGroup>

### 提供商对比

| 提供商                                    | 结果样式       | 过滤器                               | API 密钥                                    |
| ----------------------------------------- | -------------- | ------------------------------------ | ------------------------------------------- |
| [Brave](/en/tools/brave-search)           | 结构化片段     | 国家、语言、时间、`llm-context` 模式 | `BRAVE_API_KEY`                             |
| [DuckDuckGo](/en/tools/duckduckgo-search) | 结构化片段     | --                                   | 无（无需密钥）                              |
| [Exa](/en/tools/exa-search)               | 结构化 + 提取  | 神经/关键词模式、日期、内容提取      | `EXA_API_KEY`                               |
| [Firecrawl](/en/tools/firecrawl)          | 结构化片段     | 通过 `firecrawl_search` 工具         | `FIRECRAWL_API_KEY`                         |
| [Gemini](/en/tools/gemini-search)         | AI 综合 + 引用 | --                                   | `GEMINI_API_KEY`                            |
| [Grok](/en/tools/grok-search)             | AI 综合 + 引用 | --                                   | `XAI_API_KEY`                               |
| [Kimi](/en/tools/kimi-search)             | AI 综合 + 引用 | --                                   | `KIMI_API_KEY` / `MOONSHOT_API_KEY`         |
| [Perplexity](/en/tools/perplexity-search) | 结构化片段     | 国家、语言、时间、域名、内容限制     | `PERPLEXITY_API_KEY` / `OPENROUTER_API_KEY` |
| [SearXNG](/en/tools/searxng-search)       | 结构化片段     | 类别、语言                           | 无（自托管）                                |
| [Tavily](/en/tools/tavily)                | 结构化片段     | 通过 `tavily_search` 工具            | `TAVILY_API_KEY`                            |

## 自动检测

## 原生 Codex 网页搜索

支持 Codex 的模型可以选择使用提供商原生的 Responses `web_search` 工具，而不是 OpenClaw 托管的 `web_search` 函数。

- 在 `tools.web.search.openaiCodex` 下进行配置
- 它仅对支持 Codex 的模型激活（`openai-codex/*` 或使用 `api: "openai-codex-responses"` 的提供商）
- 托管 `web_search` 仍然适用于不支持 Codex 的模型
- `mode: "cached"` 是默认且推荐的设置
- `tools.web.search.enabled: false` 会禁用托管和原生搜索

```json5
{
  tools: {
    web: {
      search: {
        enabled: true,
        openaiCodex: {
          enabled: true,
          mode: "cached",
          allowedDomains: ["example.com"],
          contextSize: "high",
          userLocation: {
            country: "US",
            city: "New York",
            timezone: "America/New_York",
          },
        },
      },
    },
  },
}
```

如果启用了原生 Codex 搜索，但当前模型不支持 Codex，OpenClaw 将保持正常的托管 `web_search` 行为。

## 设置网页搜索

文档和设置流程中的提供商列表按字母顺序排列。自动检测保留一个
单独的优先级顺序：

如果未设置 `provider`，OpenClaw 将按以下顺序检查 API 密钥并使用
找到的第一个：

1. **Brave** -- `BRAVE_API_KEY` 或 `plugins.entries.brave.config.webSearch.apiKey`
2. **Gemini** -- `GEMINI_API_KEY` 或 `plugins.entries.google.config.webSearch.apiKey`
3. **Grok** -- `XAI_API_KEY` 或 `plugins.entries.xai.config.webSearch.apiKey`
4. **Kimi** -- `KIMI_API_KEY` / `MOONSHOT_API_KEY` 或 `plugins.entries.moonshot.config.webSearch.apiKey`
5. **Perplexity** -- `PERPLEXITY_API_KEY` / `OPENROUTER_API_KEY` 或 `plugins.entries.perplexity.config.webSearch.apiKey`
6. **Firecrawl** -- `FIRECRAWL_API_KEY` 或 `plugins.entries.firecrawl.config.webSearch.apiKey`
7. **Tavily** -- `TAVILY_API_KEY` 或 `plugins.entries.tavily.config.webSearch.apiKey`

无密钥提供商在支持 API 的提供商之后检查：

8. **DuckDuckGo** -- 无需密钥（自动检测顺序 100）
9. **SearXNG** -- `SEARXNG_BASE_URL` 或 `plugins.entries.searxng.config.webSearch.baseUrl`（自动检测顺序 200）

如果未检测到提供商，则回退到 Brave（您将收到缺少密钥的
错误，提示您配置一个）。

<Note>所有提供商密钥字段均支持 SecretRef 对象。在自动检测模式下， OpenClaw 仅解析所选的提供商密钥 -- 未选中的 SecretRefs 保持非活动状态。</Note>

## 配置

```json5
{
  tools: {
    web: {
      search: {
        enabled: true, // default: true
        provider: "brave", // or omit for auto-detection
        maxResults: 5,
        timeoutSeconds: 30,
        cacheTtlMinutes: 15,
      },
    },
  },
}
```

特定于提供商的配置（API 密钥、基本 URL、模式）位于
`plugins.entries.<plugin>.config.webSearch.*` 之下。请参阅提供商页面以获取
示例。

对于 `x_search`，直接配置 `tools.web.x_search.*`。它使用与 Grok 网络搜索相同的
`XAI_API_KEY` 回退机制。
当您在 `openclaw onboard` 或 `openclaw configure --section web` 期间选择 Grok 时，
OpenClaw 还可以使用相同的密钥提供可选的 `x_search` 设置。
这是 Grok 路径中的一个单独后续步骤，而不是一个单独的顶级
网络搜索提供商选择。如果您选择其他提供商，OpenClaw 将不会
显示 `x_search` 提示。

### 存储 API 密钥

<Tabs>
  <Tab title="Config file">
    运行 `openclaw configure --section web` 或直接设置密钥：

    ```json5
    {
      plugins: {
        entries: {
          brave: {
            config: {
              webSearch: {
                apiKey: "YOUR_KEY", // pragma: allowlist secret
              },
            },
          },
        },
      },
    }
    ```

  </Tab>
  <Tab title="Environment variable">
    在 Gateway(网关) 进程环境中设置提供商的环境变量：

    ```bash
    export BRAVE_API_KEY="YOUR_KEY"
    ```

    对于网关安装，请将其放入 `~/.openclaw/.env` 中。
    参见 [环境变量](/en/help/faq#env-vars-and-env-loading)。

  </Tab>
</Tabs>

## 工具参数

| 参数                  | 描述                                            |
| --------------------- | ----------------------------------------------- |
| `query`               | 搜索查询（必填）                                |
| `count`               | 要返回的结果数（1-10，默认值：5）               |
| `country`             | 两字母 ISO 国家代码（例如“US”、“DE”）           |
| `language`            | ISO 639-1 语言代码（例如“en”、“de”）            |
| `freshness`           | 时间过滤器：`day`、`week`、`month` 或 `year`    |
| `date_after`          | 此日期之后的结果（YYYY-MM-DD）                  |
| `date_before`         | 此日期之前的结果（YYYY-MM-DD）                  |
| `ui_lang`             | UI 语言代码（仅限 Brave）                       |
| `domain_filter`       | 域名允许列表/拒绝列表数组（仅限 Perplexity）    |
| `max_tokens`          | 总内容预算，默认值 25000（仅限 Perplexity）     |
| `max_tokens_per_page` | 每页 token 限制，默认值 2048（仅限 Perplexity） |

<Warning>并非所有参数都适用于所有提供商。Brave `llm-context` 模式 会拒绝 `ui_lang`、`freshness`、`date_after` 和 `date_before`。 Firecrawl 和 Tavily 仅通过 `web_search` 支持 `query` 和 `count` -- 如需高级选项，请使用其专用工具。</Warning>

## x_search

`x_search` 使用 xAI 查询 X（前身为 Twitter）帖子，并返回带有引用的 AI 综合答案。它接受自然语言查询和可选的结构化筛选器。OpenClaw 仅在处理此工具调用的请求上启用内置的 xAI `x_search` 工具。

<Note>xAI 文档说明 `x_search` 支持关键词搜索、语义搜索、用户搜索和主题抓取。对于转推、回复、书签或观看次数等单条帖子互动统计，建议针对确切的帖子 URL 或状态 ID 进行定向查找。广泛的关键词搜索可能会找到正确的帖子，但返回的单条帖子元数据不完整。一种好的模式是：先定位帖子，然后运行第二个 `x_search` 查询，专注于该特定帖子。</Note>

### x_search 配置

```json5
{
  tools: {
    web: {
      x_search: {
        enabled: true,
        apiKey: "xai-...", // optional if XAI_API_KEY is set
        model: "grok-4-1-fast-non-reasoning",
        inlineCitations: false,
        maxTurns: 2,
        timeoutSeconds: 30,
        cacheTtlMinutes: 15,
      },
    },
  },
}
```

### x_search 参数

| 参数                         | 描述                                   |
| ---------------------------- | -------------------------------------- |
| `query`                      | 搜索查询（必填）                       |
| `allowed_x_handles`          | 将结果限制为特定的 X 用户名            |
| `excluded_x_handles`         | 排除特定的 X 用户名                    |
| `from_date`                  | 仅包含此日期（YYYY-MM-DD）及之后的帖子 |
| `to_date`                    | 仅包含此日期（YYYY-MM-DD）及之前的帖子 |
| `enable_image_understanding` | 让 xAI 检查匹配帖子中附加的图片        |
| `enable_video_understanding` | 让 xAI 检查匹配帖子中附加的视频        |

### x_search 示例

```javascript
await x_search({
  query: "dinner recipes",
  allowed_x_handles: ["nytfood"],
  from_date: "2026-03-01",
});
```

```javascript
// Per-post stats: use the exact status URL or status ID when possible
await x_search({
  query: "https://x.com/huntharo/status/1905678901234567890",
});
```

## 示例

```javascript
// Basic search
await web_search({ query: "OpenClaw plugin SDK" });

// German-specific search
await web_search({ query: "TV online schauen", country: "DE", language: "de" });

// Recent results (past week)
await web_search({ query: "AI developments", freshness: "week" });

// Date range
await web_search({
  query: "climate research",
  date_after: "2024-01-01",
  date_before: "2024-06-30",
});

// Domain filtering (Perplexity only)
await web_search({
  query: "product reviews",
  domain_filter: ["-reddit.com", "-pinterest.com"],
});
```

## 工具配置文件

如果您使用工具配置文件或允许列表，请添加 `web_search`、`x_search` 或 `group:web`：

```json5
{
  tools: {
    allow: ["web_search", "x_search"],
    // or: allow: ["group:web"]  (includes web_search, x_search, and web_fetch)
  },
}
```

## 相关

- [Web Fetch](/en/tools/web-fetch) -- 获取 URL 并提取可读内容
- [Web Browser](/en/tools/browser) -- 针对 JS 繁重网站的完整浏览器自动化
- [Grok Search](/en/tools/grok-search) -- Grok 作为 `web_search` 提供商
