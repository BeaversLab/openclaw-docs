---
title: "Web 搜索"
sidebarTitle: "Web 搜索"
summary: "web_search、x_search 和 web_fetch -- 搜索网络、搜索 X 帖子或获取页面内容"
read_when:
  - You want to enable or configure web_search
  - You want to enable or configure x_search
  - You need to choose a search provider
  - You want to understand auto-detection and provider fallback
---

# Web Search

`web_search` 工具使用您配置的提供商搜索网络并
返回结果。结果按查询缓存 15 分钟（可配置）。

OpenClaw 还包含 `x_search` 用于搜索 X（前 Twitter）帖子，
以及 `web_fetch` 用于轻量级 URL 获取。在此阶段，`web_fetch` 保持
本地运行，而 `web_search` 和 `x_search` 可以在底层使用 xAI Responses。

<Info>`web_search` 是一个轻量级 HTTP 工具，而非浏览器自动化工具。对于 重 JS 网站或需要登录的网站，请使用 [Web Browser](/en/tools/browser)。若要 获取特定的 URL，请使用 [Web Fetch](/en/tools/web-fetch)。</Info>

## 快速开始

<Steps>
  <Step title="获取 API 密钥">
    选择一个提供商并获取 API 密钥。请参阅下方的提供商页面以获取
    注册链接。
  </Step>
  <Step title="配置">
    ```bash
    openclaw configure --section web
    ```
    此步骤会存储密钥并设置提供商。您也可以设置环境变量
    (e.g. `BRAVE_API_KEY`) 并跳过此步骤。
  </Step>
  <Step title="使用它">
    智能体现在可以调用 `web_search`：

    ```javascript
    await web_search({ query: "OpenClaw plugin SDK" });
    ```

    对于 X 帖子，请使用：

    ```javascript
    await x_search({ query: "dinner recipes" });
    ```

  </Step>
</Steps>

## 选择提供商

<CardGroup cols={2}>
  <Card title="Brave 搜索" icon="shield" href="/en/tools/brave-search">
    带有片段的结构化结果。支持 `llm-context` 模式、国家/语言筛选。提供免费层级。
  </Card>
  <Card title="DuckDuckGo" icon="bird" href="/en/tools/duckduckgo-search">
    无需密钥的回退方案。不需要 API 密钥。基于 HTML 的非官方集成。
  </Card>
  <Card title="Exa" icon="brain" href="/en/tools/exa-search">
    神经搜索 + 关键词搜索，支持内容提取（高亮、文本、摘要）。
  </Card>
  <Card title="Firecrawl" icon="flame" href="/en/tools/firecrawl">
    结构化结果。最好与 `firecrawl_search` 和 `firecrawl_scrape` 配合使用以进行深度提取。
  </Card>
  <Card title="Gemini" icon="sparkles" href="/en/tools/gemini-search">
    通过 Google 搜索检索提供带引用的 AI 综合答案。
  </Card>
  <Card title="Grok" icon="zap" href="/en/tools/grok-search">
    通过 xAI 网络检索提供带引用的 AI 综合答案。
  </Card>
  <Card title="Kimi" icon="moon" href="/en/tools/kimi-search">
    通过 Moonshot 网络搜索提供带引用的 AI 综合答案。
  </Card>
  <Card title="Perplexity" icon="search" href="/en/tools/perplexity-search">
    结构化结果，支持内容提取控制和域名过滤。
  </Card>
  <Card title="Tavily" icon="globe" href="/en/tools/tavily">
    结构化结果，具有搜索深度、主题过滤和用于 URL 提取的 `tavily_extract`。
  </Card>
</CardGroup>

### 提供商对比

| 提供商                                    | 结果样式       | 过滤器                               | API 密钥                                    |
| ----------------------------------------- | -------------- | ------------------------------------ | ------------------------------------------- |
| [Brave](/en/tools/brave-search)           | 结构化片段     | 国家、语言、时间、`llm-context` 模式 | `BRAVE_API_KEY`                             |
| [DuckDuckGo](/en/tools/duckduckgo-search) | 结构化摘要     | --                                   | 无（免密钥）                                |
| [Exa](/en/tools/exa-search)               | 结构化 + 提取  | 神经/关键词模式、日期、内容提取      | `EXA_API_KEY`                               |
| [Firecrawl](/en/tools/firecrawl)          | 结构化摘要     | 通过 `firecrawl_search` 工具         | `FIRECRAWL_API_KEY`                         |
| [Gemini](/en/tools/gemini-search)         | AI 合成 + 引用 | --                                   | `GEMINI_API_KEY`                            |
| [Grok](/en/tools/grok-search)             | AI 合成 + 引用 | --                                   | `XAI_API_KEY`                               |
| [Kimi](/en/tools/kimi-search)             | AI 合成 + 引用 | --                                   | `KIMI_API_KEY` / `MOONSHOT_API_KEY`         |
| [Perplexity](/en/tools/perplexity-search) | 结构化摘要     | 国家、语言、时间、域名、内容限制     | `PERPLEXITY_API_KEY` / `OPENROUTER_API_KEY` |
| [Tavily](/en/tools/tavily)                | 结构化摘要     | 通过 `tavily_search` 工具            | `TAVILY_API_KEY`                            |

## 自动检测

文档和设置流程中的提供商列表按字母顺序排列。自动检测保持单独的优先级顺序：

如果未设置 `provider`，OpenClaw 将按以下顺序检查 API 密钥，并使用找到的第一个密钥：

1. **Brave** -- `BRAVE_API_KEY` 或 `plugins.entries.brave.config.webSearch.apiKey`
2. **Gemini** -- `GEMINI_API_KEY` 或 `plugins.entries.google.config.webSearch.apiKey`
3. **Grok** -- `XAI_API_KEY` 或 `plugins.entries.xai.config.webSearch.apiKey`
4. **Kimi** -- `KIMI_API_KEY` / `MOONSHOT_API_KEY` 或 `plugins.entries.moonshot.config.webSearch.apiKey`
5. **Perplexity** -- `PERPLEXITY_API_KEY` / `OPENROUTER_API_KEY` 或 `plugins.entries.perplexity.config.webSearch.apiKey`
6. **Firecrawl** -- `FIRECRAWL_API_KEY` 或 `plugins.entries.firecrawl.config.webSearch.apiKey`
7. **Tavily** -- `TAVILY_API_KEY` 或 `plugins.entries.tavily.config.webSearch.apiKey`

如果未找到密钥，它将回退到 Brave（您将收到一个缺少密钥的错误提示，提示您进行配置）。

<Note>All 提供商 key fields support SecretRef objects. In auto-detect mode, OpenClaw resolves only the selected 提供商 key -- non-selected SecretRefs stay inactive.</Note>

## Config

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

Provider-specific config (API keys, base URLs, modes) lives under
`plugins.entries.<plugin>.config.webSearch.*`. See the 提供商 pages for
examples.

For `x_search`, configure `tools.web.x_search.*` directly. It uses the same
`XAI_API_KEY` fallback as Grok web search.

### Storing API keys

<Tabs>
  <Tab title="Config file">
    Run `openclaw configure --section web` or set the key directly:

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
    Set the 提供商 环境变量 in the Gateway(网关) process environment:

    ```bash
    export BRAVE_API_KEY="YOUR_KEY"
    ```

    For a gateway install, put it in `~/.openclaw/.env`.
    See [Env vars](/en/help/faq#env-vars-and-env-loading).

  </Tab>
</Tabs>

## Tool parameters

| Parameter             | Description                                           |
| --------------------- | ----------------------------------------------------- |
| `query`               | Search query (required)                               |
| `count`               | Results to return (1-10, default: 5)                  |
| `country`             | 2-letter ISO country code (e.g. "US", "DE")           |
| `language`            | ISO 639-1 language code (e.g. "en", "de")             |
| `freshness`           | Time filter: `day`, `week`, `month`, or `year`        |
| `date_after`          | Results after this date (YYYY-MM-DD)                  |
| `date_before`         | Results before this date (YYYY-MM-DD)                 |
| `ui_lang`             | UI language code (Brave only)                         |
| `domain_filter`       | Domain allowlist/denylist array (Perplexity only)     |
| `max_tokens`          | Total content budget, default 25000 (Perplexity only) |
| `max_tokens_per_page` | Per-page token limit, default 2048 (Perplexity only)  |

<Warning>并非所有参数都适用于所有提供商。Brave `llm-context` 模式 会拒绝 `ui_lang`、`freshness`、`date_after` 和 `date_before`。 Brave 和 Tavily 仅通过 `web_search` 支持 `query` 和 `count` 中的 Firecrawl——如需高级选项，请使用其专用工具。</Warning>

## x_search

`x_search` 使用 xAI 查询 X（前 Twitter）帖子并
返回带有引用的 AI 综合答案。它接受自然语言查询和
可选的结构化过滤器。OpenClaw 仅在服务于此工具调用的请求上
启用内置的 xAI `x_search` 工具。

<Note>xAI 文档记载 `x_search` 支持关键词搜索、语义搜索、用户 搜索和主题抓取。对于转推、 回复、书签或观看次数等单篇帖子参与度统计，建议对确切的帖子 URL 或状态 ID 进行定向查找。广泛的关键词搜索可能会找到正确的帖子，但返回的 单篇帖子元数据可能不完整。一个好的模式是：首先定位帖子，然后 运行第二个 `x_search` 查询，专注于该确切帖子。</Note>

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

| 参数                         | 描述                                       |
| ---------------------------- | ------------------------------------------ |
| `query`                      | 搜索查询（必需）                           |
| `allowed_x_handles`          | 将结果限制为特定的 X 句柄                  |
| `excluded_x_handles`         | 排除特定的 X 句柄                          |
| `from_date`                  | 仅包含此日期（YYYY-MM-DD）当日及之后的帖子 |
| `to_date`                    | 仅包含此日期（YYYY-MM-DD）当日及之前的帖子 |
| `enable_image_understanding` | 允许 xAI 检查附加到匹配帖子的图片          |
| `enable_video_understanding` | 允许 xAI 检查附加到匹配帖子的视频          |

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
- [Web Browser](/en/tools/browser) -- 针对重度 JavaScript 网站的完整浏览器自动化
- [Grok Search](/en/tools/grok-search) -- Grok 作为 `web_search` 提供商
