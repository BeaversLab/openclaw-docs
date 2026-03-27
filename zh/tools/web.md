---
summary: "web_search 工具 -- 使用 Brave、Firecrawl、Gemini、Grok、Kimi、Perplexity 或 Tavily 搜索网络"
read_when:
  - You want to enable or configure web_search
  - You need to choose a search provider
  - You want to understand auto-detection and provider fallback
title: "Web Search"
sidebarTitle: "Web Search"
---

# Web Search

`web_search` 工具使用您配置的提供商搜索网络并返回结果。结果按查询缓存 15 分钟（可配置）。

<Info>
  `web_search` 是一个轻量级 HTTP 工具，而非浏览器自动化。对于重度 JS 的网站或需要登录的网站，请使用
  [Web Browser](/zh/tools/browser)。如需获取特定 URL，请使用 [Web Fetch](/zh/tools/web-fetch)。
</Info>

## 快速开始

<Steps>
  <Step title="获取 API 密钥">
    选择一个提供商并获取一个 API 密钥。请参阅下方的提供商页面以获取
    注册链接。
  </Step>
  <Step title="配置">
    ```bash
    openclaw configure --section web
    ```
    此操作将存储密钥并设置提供商。您也可以设置环境变量
    （例如 `BRAVE_API_KEY`）并跳过此步骤。
  </Step>
  <Step title="使用">
    代理现在可以调用 `web_search`：

    ```javascript
    await web_search({ query: "OpenClaw plugin SDK" });
    ```

  </Step>
</Steps>

## 选择提供商

<CardGroup cols={2}>
  <Card title="Brave Search" icon="shield" href="/zh/tools/brave-search">
    带有片段的结构化结果。支持 `llm-context` 模式、国家/语言过滤器。提供 免费层级。
  </Card>
  <Card title="DuckDuckGo" icon="bird" href="/zh/tools/duckduckgo-search">
    无密钥回退。无需 API 密钥。非官方的基于 HTML 的集成。
  </Card>
  <Card title="Exa" icon="brain" href="/zh/tools/exa-search">
    神经网络 + 关键词搜索，支持内容提取（高亮、文本、摘要）。
  </Card>
  <Card title="Firecrawl" icon="flame" href="/zh/tools/firecrawl">
    结构化结果。最好与 `firecrawl_search` 和 `firecrawl_scrape` 结合使用以进行深度 提取。
  </Card>
  <Card title="Gemini" icon="sparkles" href="/zh/tools/gemini-search">
    通过 Google Search 基础提供带引用的 AI 综合答案。
  </Card>
  <Card title="Grok" icon="zap" href="/zh/tools/grok-search">
    通过 xAI web 基础提供带引用的 AI 综合答案。
  </Card>
  <Card title="Kimi" icon="moon" href="/zh/tools/kimi-search">
    通过 Moonshot 网络搜索提供带引用的 AI 综合答案。
  </Card>
  <Card title="Perplexity" icon="search" href="/zh/tools/perplexity-search">
    具有内容提取控制和域过滤功能的结构化结果。
  </Card>
  <Card title="Tavily" icon="globe" href="/zh/tools/tavily">
    具有搜索深度、主题过滤功能的结构化结果，以及用于 URL 提取的 `tavily_extract`。
  </Card>
</CardGroup>

### 提供商对比

| 提供商                                    | 结果样式           | 筛选                                 | API 密钥                                    |
| ----------------------------------------- | ------------------ | ------------------------------------ | ------------------------------------------- |
| [Brave](/zh/tools/brave-search)           | 结构化片段         | 国家、语言、时间、`llm-context` 模式 | `BRAVE_API_KEY`                             |
| [DuckDuckGo](/zh/tools/duckduckgo-search) | 结构化片段         | --                                   | 无（免密钥）                                |
| [Exa](/zh/tools/exa-search)               | 结构化 + 提取      | 神经/关键词模式、日期、内容提取      | `EXA_API_KEY`                               |
| [Firecrawl](/zh/tools/firecrawl)          | 结构化片段         | 通过 `firecrawl_search` 工具         | `FIRECRAWL_API_KEY`                         |
| [Gemini](/zh/tools/gemini-search)         | AI 综合 + 引用     | --                                   | `GEMINI_API_KEY`                            |
| [Grok](/zh/tools/grok-search)             | AI 综合 + 引用     | --                                   | `XAI_API_KEY`                               |
| [Kimi](/zh/tools/kimi-search)             | AI 综合摘要 + 引用 | --                                   | `KIMI_API_KEY` / `MOONSHOT_API_KEY`         |
| [Perplexity](/zh/tools/perplexity-search) | 结构化片段         | 国家、语言、时间、域名、内容限制     | `PERPLEXITY_API_KEY` / `OPENROUTER_API_KEY` |
| [Tavily](/zh/tools/tavily)                | 结构化片段         | 通过 `tavily_search` 工具            | `TAVILY_API_KEY`                            |

## 自动检测

文档和设置流程中的提供商列表按字母顺序排列。自动检测会保持
一个单独的优先顺序：

如果未设置 `provider`，OpenClaw 将按以下顺序检查 API 密钥，并使用
找到的第一个密钥：

1. **Brave** -- `BRAVE_API_KEY` 或 `plugins.entries.brave.config.webSearch.apiKey`
2. **Gemini** -- `GEMINI_API_KEY` 或 `plugins.entries.google.config.webSearch.apiKey`
3. **Grok** -- `XAI_API_KEY` 或 `plugins.entries.xai.config.webSearch.apiKey`
4. **Kimi** -- `KIMI_API_KEY` / `MOONSHOT_API_KEY` 或 `plugins.entries.moonshot.config.webSearch.apiKey`
5. **Perplexity** -- `PERPLEXITY_API_KEY` / `OPENROUTER_API_KEY` 或 `plugins.entries.perplexity.config.webSearch.apiKey`
6. **Firecrawl** -- `FIRECRAWL_API_KEY` 或 `plugins.entries.firecrawl.config.webSearch.apiKey`
7. **Tavily** -- `TAVILY_API_KEY` 或 `plugins.entries.tavily.config.webSearch.apiKey`

如果未找到任何密钥，它将回退到 Brave（您将收到缺少密钥错误
提示您配置一个）。

<Note>
  所有提供商密钥字段均支持 SecretRef 对象。在自动检测模式下，OpenClaw 仅解析
  选定的提供商密钥——未选定的 SecretRefs 保持不活动状态。
</Note>

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
`plugins.entries.<plugin>.config.webSearch.*` 之下。请参阅提供商页面
了解示例。

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
  <Tab title="环境变量">
    在 Gateway(网关) 进程环境中设置提供商环境变量：

    ```bash
    export BRAVE_API_KEY="YOUR_KEY"
    ```

    对于 gateway 安装，将其放在 `~/.openclaw/.env` 中。
    请参阅 [环境变量](/zh/help/faq#env-vars-and-env-loading)。

  </Tab>
</Tabs>

## 工具参数

| 参数                  | 描述                                            |
| --------------------- | ----------------------------------------------- |
| `query`               | 搜索查询（必填）                                |
| `count`               | 返回结果数（1-10，默认：5）                     |
| `country`             | 两个字母的 ISO 国家代码（例如 "US"、"DE"）      |
| `language`            | ISO 639-1 语言代码（例如 "en"、"de"）           |
| `freshness`           | 时间过滤器：`day`、`week`、`month` 或 `year`    |
| `date_after`          | 此日期之后的结果 (YYYY-MM-DD)                   |
| `date_before`         | 此日期之前的结果 (YYYY-MM-DD)                   |
| `ui_lang`             | UI 语言代码（仅限 Brave）                       |
| `domain_filter`       | 域名允许列表/拒绝列表数组（仅限 Perplexity）    |
| `max_tokens`          | 总内容预算，默认为 25000（仅限 Perplexity）     |
| `max_tokens_per_page` | 每页 token 限制，默认为 2048（仅限 Perplexity） |

<Warning>
  并非所有参数都适用于所有提供商。Brave `llm-context` 模式拒绝 `ui_lang`、 `freshness`、`date_after`
  和 `date_before`。Firecrawl 和 Tavily 仅通过 `web_search` 支持 `query` 和 `count` ——
  高级选项请使用它们各自的专用工具。
</Warning>

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

如果您使用工具配置文件或允许列表，请添加 `web_search` 或 `group:web`：

```json5
{
  tools: {
    allow: ["web_search"],
    // or: allow: ["group:web"]  (includes both web_search and web_fetch)
  },
}
```

## 相关

- [Web Fetch](/zh/tools/web-fetch) -- 获取 URL 并提取可读内容
- [Web Browser](/zh/tools/browser) -- 针对 JS 重型网站的完整浏览器自动化

import zh from "/components/footer/zh.mdx";

<zh />
