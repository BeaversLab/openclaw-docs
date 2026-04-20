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

`web_search` 工具使用您配置的提供商搜索网络并
返回结果。结果按查询缓存 15 分钟（可配置）。

OpenClaw 还包含用于 X（前 Twitter）帖子的 `x_search` 和
用于轻量级 URL 获取的 `web_fetch`。在此阶段，`web_fetch` 保持
本地，而 `web_search` 和 `x_search` 可在底层使用 xAI Responses。

<Info>`web_search` 是一个轻量级 HTTP 工具，而不是浏览器自动化。对于 重 JS 的站点或登录，请使用 [Web Browser](/zh/tools/browser)。对于 获取特定 URL，请使用 [Web Fetch](/zh/tools/web-fetch)。</Info>

## 快速开始

<Steps>
  <Step title="选择提供商">
    选择一个提供商并完成任何所需的设置。一些提供商是
    无密钥的，而其他的则使用 API 密钥。详情请参阅下面的提供商页面。
  </Step>
  <Step title="配置">
    ```bash
    openclaw configure --section web
    ```
    这将存储提供商和任何所需的凭据。您也可以设置环境
    变量（例如 `BRAVE_API_KEY`）并为基于 API 的
    提供商跳过此步骤。
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
  <Card title="Brave Search" icon="shield" href="/zh/tools/brave-search">
    带有片段的结构化结果。支持 `llm-context` 模式、国家/语言过滤器。提供免费层级。
  </Card>
  <Card title="DuckDuckGo" icon="bird" href="/zh/tools/duckduckgo-search">
    无需密钥的回退选项。不需要 API 密钥。非官方的基于 HTML 的集成。
  </Card>
  <Card title="Exa" icon="brain" href="/zh/tools/exa-search">
    神经 + 关键词搜索，附带内容提取（高亮、文本、摘要）。
  </Card>
  <Card title="Firecrawl" icon="flame" href="/zh/tools/firecrawl">
    结构化结果。最适合与 `firecrawl_search` 和 `firecrawl_scrape` 配合以进行深度提取。
  </Card>
  <Card title="Gemini" icon="sparkles" href="/zh/tools/gemini-search">
    通过 Google Search 接地生成包含引用的 AI 综合答案。
  </Card>
  <Card title="Grok" icon="zap" href="/zh/tools/grok-search">
    通过 xAI web 接地生成包含引用的 AI 综合答案。
  </Card>
  <Card title="Kimi" icon="moon" href="/zh/tools/kimi-search">
    通过 Moonshot 网络搜索生成包含引用的 AI 综合答案。
  </Card>
  <Card title="MiniMax Search" icon="globe" href="/zh/tools/minimax-search">
    通过 MiniMax Coding Plan 搜索 API 获取结构化结果。
  </Card>
  <Card title="Ollama Web Search" icon="globe" href="/zh/tools/ollama-search">
    通过配置的 Ollama 主机进行免密钥搜索。需要 `ollama signin`。
  </Card>
  <Card title="Perplexity" icon="search" href="/zh/tools/perplexity-search">
    具有内容提取控制和域名过滤功能的结构化结果。
  </Card>
  <Card title="SearXNG" icon="server" href="/zh/tools/searxng-search">
    自托管的元搜索引擎。无需 API 密钥。聚合了 Google、Bing、DuckDuckGo 等搜索结果。
  </Card>
  <Card title="Tavily" icon="globe" href="/zh/tools/tavily">
    具有搜索深度、主题过滤和 `tavily_extract` 用于 URL 提取的结构化结果。
  </Card>
</CardGroup>

### 提供商对比

| 提供商                                       | 结果样式           | 筛选器                               | API 密钥                                                         |
| -------------------------------------------- | ------------------ | ------------------------------------ | ---------------------------------------------------------------- |
| [Brave](/zh/tools/brave-search)              | 结构化摘要         | 国家、语言、时间、`llm-context` 模式 | `BRAVE_API_KEY`                                                  |
| [DuckDuckGo](/zh/tools/duckduckgo-search)    | 结构化摘要         | --                                   | 无（免密钥）                                                     |
| [Exa](/zh/tools/exa-search)                  | 结构化 + 提取      | 神经/关键词模式、日期、内容提取      | `EXA_API_KEY`                                                    |
| [Firecrawl](/zh/tools/firecrawl)             | 结构化摘要         | 通过 `firecrawl_search` 工具         | `FIRECRAWL_API_KEY`                                              |
| [Gemini](/zh/tools/gemini-search)            | AI 合成 + 引用     | --                                   | `GEMINI_API_KEY`                                                 |
| [Grok](/zh/tools/grok-search)                | AI 合成 + 引用     | --                                   | `XAI_API_KEY`                                                    |
| [Kimi](/zh/tools/kimi-search)                | AI 综合摘要 + 引用 | --                                   | `KIMI_API_KEY` / `MOONSHOT_API_KEY`                              |
| [MiniMax Search](/zh/tools/minimax-search)   | 结构化摘要         | 区域 (`global` / `cn`)               | `MINIMAX_CODE_PLAN_KEY` / `MINIMAX_CODING_API_KEY`               |
| [Ollama Web Search](/zh/tools/ollama-search) | 结构化摘要         | --                                   | 默认无；需要 `ollama signin`，可复用 Ollama 提供商的 Bearer 认证 |
| [Perplexity](/zh/tools/perplexity-search)    | 结构化摘要         | 国家、语言、时间、域名、内容限制     | `PERPLEXITY_API_KEY` / `OPENROUTER_API_KEY`                      |
| [SearXNG](/zh/tools/searxng-search)          | 结构化摘要         | 类别、语言                           | 无（自托管）                                                     |
| [Tavily](/zh/tools/tavily)                   | 结构化摘要         | 通过 `tavily_search` 工具            | `TAVILY_API_KEY`                                                 |

## 自动检测

## 原生 Codex 网络搜索

支持 Codex 的模型可以选择使用提供商原生的 Responses `web_search` 工具，而不是 OpenClaw 托管的 `web_search` 函数。

- 在 `tools.web.search.openaiCodex` 下进行配置
- 它仅对支持 Codex 的模型生效（`openai-codex/*` 或使用 `api: "openai-codex-responses"` 的提供商）
- 托管的 `web_search` 仍适用于非 Codex 模型
- `mode: "cached"` 是默认且推荐的设置
- `tools.web.search.enabled: false` 会同时禁用托管搜索和原生搜索

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

## 设置网络搜索

文档和设置流程中的提供商列表按字母顺序排列。自动检测则保持单独的优先顺序。

如果未设置 `provider`，OpenClaw 将按以下顺序检查提供商，并使用第一个准备好的提供商：

首先检查 API 支持的提供商：

1. **Brave** -- `BRAVE_API_KEY` 或 `plugins.entries.brave.config.webSearch.apiKey` （顺序 10）
2. **MiniMax 搜索** -- `MINIMAX_CODE_PLAN_KEY` / `MINIMAX_CODING_API_KEY` 或 `plugins.entries.minimax.config.webSearch.apiKey` (顺序 15)
3. **Gemini** -- `GEMINI_API_KEY` 或 `plugins.entries.google.config.webSearch.apiKey` (顺序 20)
4. **Grok** -- `XAI_API_KEY` 或 `plugins.entries.xai.config.webSearch.apiKey` (顺序 30)
5. **Kimi** -- `KIMI_API_KEY` / `MOONSHOT_API_KEY` 或 `plugins.entries.moonshot.config.webSearch.apiKey` (顺序 40)
6. **Perplexity** -- `PERPLEXITY_API_KEY` / `OPENROUTER_API_KEY` 或 `plugins.entries.perplexity.config.webSearch.apiKey` (顺序 50)
7. **Firecrawl** -- `FIRECRAWL_API_KEY` 或 `plugins.entries.firecrawl.config.webSearch.apiKey` (顺序 60)
8. **Exa** -- `EXA_API_KEY` 或 `plugins.entries.exa.config.webSearch.apiKey` (顺序 65)
9. **Tavily** -- `TAVILY_API_KEY` 或 `plugins.entries.tavily.config.webSearch.apiKey` (顺序 70)

此后的免密钥备用选项：

10. **DuckDuckGo** -- 免密钥 HTML 备用选项，无需账户或 API 密钥 (顺序 100)
11. **Ollama Web Search** -- 通过您配置的 Ollama 主机提供的免密钥备用选项；要求 Ollama 可访问并使用 `ollama signin` 登录，如果主机需要，可以重用 Ollama 提供商的 bearer auth (顺序 110)
12. **SearXNG** -- `SEARXNG_BASE_URL` 或 `plugins.entries.searxng.config.webSearch.baseUrl` (顺序 200)

如果未检测到提供商，则回退到 Brave (您将收到缺少密钥的错误提示，要求您配置一个)。

<Note>所有提供商密钥字段都支持 SecretRef 对象。在自动检测模式下， OpenClaw 仅解析所选的提供商密钥 —— 未选中的 SecretRefs 保持非活动状态。</Note>

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

提供商特定的配置 (API 密钥、基础 URL、模式) 位于
`plugins.entries.<plugin>.config.webSearch.*` 之下。请参阅提供商页面
查看示例。

`web_fetch` 回退提供商的选择是独立的：

- 使用 `tools.web.fetch.provider` 进行选择
- 或省略该字段，让 OpenClaw 从可用凭据中自动检测第一个就绪的 web-fetch
  提供商
- 目前捆绑的 web-fetch 提供商是 Firecrawl，配置位于
  `plugins.entries.firecrawl.config.webFetch.*` 之下

当您在 `openclaw onboard` 或
`openclaw configure --section web` 期间选择 **Kimi** 时，OpenClaw 还可以询问：

- Moonshot API 区域（`https://api.moonshot.ai/v1` 或 `https://api.moonshot.cn/v1`）
- 默认的 Kimi 网络搜索模型（默认为 `kimi-k2.5`）

对于 `x_search`，请配置 `plugins.entries.xai.config.xSearch.*`。它使用与 Grok 网络搜索相同的 `XAI_API_KEY` 回退机制。
旧的 `tools.web.x_search.*` 配置会由 `openclaw doctor --fix` 自动迁移。
当您在 `openclaw onboard` 或 `openclaw configure --section web` 期间选择 Grok 时，
OpenClaw 还可以提供使用相同密钥的可选 `x_search` 设置。
这是 Grok 路径内一个独立的后续步骤，不是一个独立的顶层
网络搜索提供商选择。如果您选择了其他提供商，OpenClaw 将不会
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
    在 Gateway(网关) 进程环境中设置提供商环境变量：

    ```bash
    export BRAVE_API_KEY="YOUR_KEY"
    ```

    对于 gateway 安装，请将其放入 `~/.openclaw/.env` 中。
    参见 [Env vars](/zh/help/faq#env-vars-and-env-loading)。

  </Tab>
</Tabs>

## 工具参数

| 参数                  | 描述                                          |
| --------------------- | --------------------------------------------- |
| `query`               | 搜索查询（必填）                              |
| `count`               | 返回结果数（1-10，默认：5）                   |
| `country`             | 双字母 ISO 国家代码（例如 "US"、"DE"）        |
| `language`            | ISO 639-1 语言代码（例如 "en"、"de"）         |
| `search_lang`         | 搜索语言代码（仅限 Brave）                    |
| `freshness`           | 时间过滤器：`day`、`week`、`month` 或 `year`  |
| `date_after`          | 此日期之后的结果（YYYY-MM-DD）                |
| `date_before`         | 此日期之前的结果（YYYY-MM-DD）                |
| `ui_lang`             | UI 语言代码（仅限 Brave）                     |
| `domain_filter`       | 域名允许列表/阻止列表数组（仅限 Perplexity）  |
| `max_tokens`          | 总内容预算，默认 25000（仅限 Perplexity）     |
| `max_tokens_per_page` | 每页 token 限制，默认 2048（仅限 Perplexity） |

<Warning>
  并非所有参数都适用于所有提供商。Brave 的 `llm-context` 模式 会拒绝 `ui_lang`、`freshness`、`date_after` 和 `date_before`。 Gemini、Grok 和 Kimi 返回一个带引用的综合答案。它们 接受 `count` 以保持工具兼容性，但这不会改变 基于事实的答案形态。 当您使用 Sonar/Perplexity 兼容路径（`plugins.entries.perplexity.config.webSearch.baseUrl` / `model` 或 `OPENROUTER_API_KEY`）时，OpenRouter 的行为方式相同。
  SearXNG 仅对受信任的专用网络或环回主机接受 `http://`； 公共 SearXNG 端点必须使用 `https://`。 Firecrawl 和 Tavily 仅通过 `web_search` 支持 `query` 和 `count` -- 如需高级选项，请使用其专用工具。
</Warning>

## x_search

`x_search` 使用 xAI 查询 X（前 Twitter）帖子并返回
带有引用的 AI 综合答案。它接受自然语言查询和
可选的结构化过滤器。OpenClaw 仅在处理此工具调用的请求上启用内置的 xAI `x_search`
工具。

<Note>xAI 文档称 `x_search` 支持关键词搜索、语义搜索、用户 搜索和主题抓取。对于每条帖子的互动数据，如转发、 回复、书签或浏览量，建议对确切的帖子 URL 或状态 ID 进行定向查找。广泛的关键词搜索可能会找到正确的帖子，但返回的 每条帖子元数据可能不完整。一个好的模式是：先定位帖子，然后 运行第二个针对该确切帖子的 `x_search` 查询。</Note>

### x_search 配置

```json5
{
  plugins: {
    entries: {
      xai: {
        config: {
          xSearch: {
            enabled: true,
            model: "grok-4-1-fast-non-reasoning",
            inlineCitations: false,
            maxTurns: 2,
            timeoutSeconds: 30,
            cacheTtlMinutes: 15,
          },
          webSearch: {
            apiKey: "xai-...", // optional if XAI_API_KEY is set
          },
        },
      },
    },
  },
}
```

### x_search 参数

| 参数                         | 描述                                   |
| ---------------------------- | -------------------------------------- |
| `query`                      | 搜索查询（必填）                       |
| `allowed_x_handles`          | 将结果限制为特定的 X 账号              |
| `excluded_x_handles`         | 排除特定的 X 帐号                      |
| `from_date`                  | 仅包含此日期或之后的帖子（YYYY-MM-DD） |
| `to_date`                    | 仅包含此日期或之前的帖子（YYYY-MM-DD） |
| `enable_image_understanding` | 让 xAI 检查匹配帖子所附的图片          |
| `enable_video_understanding` | 让 xAI 检查匹配帖子所附的视频          |

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

## 工具配置

如果您使用工具配置或允许列表，请添加 `web_search`、`x_search` 或 `group:web`：

```json5
{
  tools: {
    allow: ["web_search", "x_search"],
    // or: allow: ["group:web"]  (includes web_search, x_search, and web_fetch)
  },
}
```

## 相关

- [Web Fetch](/zh/tools/web-fetch) -- 获取 URL 并提取可读内容
- [Web Browser](/zh/tools/browser) -- 针对 JS 重型站点的完整浏览器自动化
- [Grok Search](/zh/tools/grok-search) -- Grok 作为 `web_search` 提供商
- [Ollama Web Search](/zh/tools/ollama-search) -- 通过您的 Ollama 主机进行无密钥网络搜索
