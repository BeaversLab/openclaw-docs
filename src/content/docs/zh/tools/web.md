---
summary: "web_search, x_search, and web_fetch -- 搜索网络、搜索 X 帖子或获取页面内容"
title: "Web search"
sidebarTitle: "Web Search"
read_when:
  - You want to enable or configure web_search
  - You want to enable or configure x_search
  - You need to choose a search provider
  - You want to understand auto-detection and provider fallback
---

`web_search` 工具使用您配置的提供商搜索网络并返回结果。结果按查询缓存 15 分钟（可配置）。

OpenClaw 还包含 `x_search` 用于搜索 X（前 Twitter）帖子，以及 `web_fetch` 用于轻量级 URL 获取。在此阶段，`web_fetch` 保持在本地，而 `web_search` 和 `x_search` 可在底层使用 xAI Responses。

<Info>`web_search` 是一个轻量级 HTTP 工具，而非浏览器自动化工具。对于 重度 JS 的网站或登录操作，请使用 [Web Browser](/zh/tools/browser)。若要 获取特定的 URL，请使用 [Web Fetch](/zh/tools/web-fetch)。</Info>

## 快速开始

<Steps>
  <Step title="Choose a 提供商">
    选择一个提供商并完成任何所需的设置。某些提供商不需要密钥，而其他的则使用 API 密钥。详情请参阅下方的提供商页面。
  </Step>
  <Step title="Configure">
    ```bash
    openclaw configure --section web
    ```
    这将存储提供商以及任何所需的凭据。您也可以设置环境变量（例如 `BRAVE_API_KEY`）并针对 API 支持的提供商跳过此步骤。
  </Step>
  <Step title="Use it">
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

## Choosing a 提供商

<CardGroup cols={2}>
  <Card title="Brave Search" icon="shield" href="/zh/tools/brave-search">
    包含片段的结构化结果。支持 `llm-context` 模式、国家/语言过滤器。提供免费层级。
  </Card>
  <Card title="DuckDuckGo" icon="bird" href="/zh/tools/duckduckgo-search">
    无需密钥的回退方案。不需要 API 密钥。基于 HTML 的非官方集成。
  </Card>
  <Card title="Exa" icon="brain" href="/zh/tools/exa-search">
    神经搜索 + 关键词搜索，支持内容提取（高亮、文本、摘要）。
  </Card>
  <Card title="Firecrawl" icon="flame" href="/zh/tools/firecrawl">
    结构化结果。最好与 `firecrawl_search` 和 `firecrawl_scrape` 配合使用以进行深度提取。
  </Card>
  <Card title="Gemini" icon="sparkles" href="/zh/tools/gemini-search">
    通过 Google Search 接地提供带引用的 AI 综合答案。
  </Card>
  <Card title="Grok" icon="zap" href="/zh/tools/grok-search">
    通过 xAI web grounding 提供带引用的 AI 综合答案。
  </Card>
  <Card title="Kimi" icon="moon" href="/zh/tools/kimi-search" Moonshot>
    通过 Moonshot 网络搜索提供带有引用的 AI 综合答案；无依据的聊天回退会明确失败。
  </Card>
  <Card title="MiniMax Search" icon="globe" href="/zh/tools/minimax-search" MiniMaxAPI>
    通过 MiniMax Token Plan 搜索 API 提供结构化结果。
  </Card>
  <Card title="Ollama Web Search" icon="globe" href="/zh/tools/ollama-search">
    通过已登录的本地 Ollama 主机或托管的 Ollama API 进行搜索。
  </Card>
  <Card title="Perplexity" icon="search" href="/zh/tools/perplexity-search">
    结构化结果，包含内容提取控制和域名过滤。
  </Card>
  <Card title="SearXNG" icon="server" href="/zh/tools/searxng-search">
    自托管元搜索。不需要 API 密钥。聚合 Google、Bing、DuckDuckGo 等。
  </Card>
  <Card title="Tavily" icon="globe" href="/zh/tools/tavily">
    结构化结果，具备搜索深度、主题过滤和用于 URL 提取的 `tavily_extract`。
  </Card>
</CardGroup>

### 提供商对比

| 提供商                                              | 结果样式                                 | 过滤器                               | API 密钥                                                                              |
| --------------------------------------------------- | ---------------------------------------- | ------------------------------------ | ------------------------------------------------------------------------------------- |
| [Brave](Brave/en/tools/brave-search)                | 结构化片段                               | 国家、语言、时间、`llm-context` 模式 | `BRAVE_API_KEY`                                                                       |
| [DuckDuckGo](/zh/tools/duckduckgo-search)           | 结构化片段                               | --                                   | 无（无密钥）                                                                          |
| [Exa](/zh/tools/exa-search)                         | 结构化 + 已提取                          | 神经/关键词模式、日期、内容提取      | `EXA_API_KEY`                                                                         |
| [Firecrawl](Firecrawl/en/tools/firecrawl)           | 结构化片段                               | 通过 `firecrawl_search` 工具         | `FIRECRAWL_API_KEY`                                                                   |
| [Gemini](/zh/tools/gemini-search)                   | AI 合成 + 引用                           | --                                   | `GEMINI_API_KEY`                                                                      |
| [Grok](/zh/tools/grok-search)                       | AI 合成 + 引用                           | --                                   | xAI OAuth，OAuth`XAI_API_KEY` 或 `plugins.entries.xai.config.webSearch.apiKey`        |
| [Kimi](/zh/tools/kimi-search)                       | AI 综合 + 引用；在无依据的聊天回退时失败 | --                                   | `KIMI_API_KEY` / `MOONSHOT_API_KEY`                                                   |
| [MiniMax Search](MiniMax/en/tools/minimax-search)   | 结构化片段                               | 区域 (`global` / `cn`)               | `MINIMAX_CODE_PLAN_KEY` / `MINIMAX_CODING_API_KEY` / `MINIMAX_OAUTH_TOKEN`            |
| [Ollama Web Search](Ollama/en/tools/ollama-search)  | 结构化片段                               | --                                   | 对于已登录的本地主机无需设置；对于直接 `https://ollama.com` 搜索需要 `OLLAMA_API_KEY` |
| [Perplexity](Perplexity/en/tools/perplexity-search) | 结构化片段                               | 国家、语言、时间、域名、内容限制     | `PERPLEXITY_API_KEY` / `OPENROUTER_API_KEY`                                           |
| [SearXNG](/zh/tools/searxng-search)                 | 结构化片段                               | 类别、语言                           | 无（自托管）                                                                          |
| [Tavily](/zh/tools/tavily)                          | 结构化片段                               | 通过 `tavily_search` 工具            | `TAVILY_API_KEY`                                                                      |

## 自动检测

## 原生 OpenAI 网络搜索

当启用 OpenClaw 网络搜索且未固定托管提供商时，Direct OpenAI Responses 模型会自动使用 OpenAI 托管的 OpenAIOpenAI`web_search`OpenClawOpenAIOpenAIAPIOpenAI 工具。这是捆绑 OpenAI 插件中提供商拥有的行为，仅适用于原生 OpenAI API 流量，不适用于 OpenAI 兼容的代理基础 URL 或 Azure 路由。将 `tools.web.search.provider` 设置为其他提供商（例如 `brave`）以为 OpenAI 模型保留托管的 `web_search`OpenAI 工具，或者设置 `tools.web.search.enabled: false`OpenAI 以同时禁用托管搜索和原生 OpenAI 搜索。

## 原生 Codex 网络搜索

支持 Codex 的模型可以选择使用提供商原生的 Responses `web_search`OpenClaw 工具，而不是 OpenClaw 托管的 `web_search` 函数。

- 在 `tools.web.search.openaiCodex` 下进行配置
- 它仅针对支持 Codex 的 OpenAI 模型（使用 `api: "openai-chatgpt-responses"` 的 OpenAI`openai/*` 模型）激活
- 托管的 `web_search` 仍适用于非 Codex 模型
- `mode: "cached"` 是默认且推荐的设置
- `tools.web.search.enabled: false` 禁用托管搜索和原生搜索

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

如果启用了原生 Codex 搜索但当前模型不支持 Codex，OpenClaw 将保持正常的托管 OpenClaw`web_search` 行为。

## 网络安全

托管的 `web_search`OpenClawAPIOpenClaw 提供商调用使用 OpenClaw 的受保护提取路径。对于受信任的提供商 API 主机，OpenClaw 仅针对该提供商主机名允许在 `198.18.0.0/15` 和 `fc00::/7` 中使用 Surge、Clash 和 sing-box 的虚假 IP DNS 应答。其他私有、环回、链路本地和元数据目的地仍然被阻止。

此自动允许不适用于任意的 `web_fetch` URL。对于
`web_fetch`，请仅在您的
可信代理拥有这些合成范围时明确启用 `tools.web.fetch.ssrfPolicy.allowRfc2544BenchmarkRange` 和
`tools.web.fetch.ssrfPolicy.allowIpv6UniqueLocalRange`。

## 设置网络搜索

文档和设置流程中的提供商列表按字母顺序排列。自动检测保持
单独的优先顺序。

如果未设置 `provider`OpenClaw，OpenClaw 将按此顺序检查提供商并使用
第一个准备就绪的提供商：

首先是支持 API 的提供商：

1. **Brave** -- Brave`BRAVE_API_KEY` 或 `plugins.entries.brave.config.webSearch.apiKey` （顺序 10）
2. **MiniMax Search** -- MiniMax`MINIMAX_CODE_PLAN_KEY` / `MINIMAX_CODING_API_KEY` / `MINIMAX_OAUTH_TOKEN` / `MINIMAX_API_KEY` 或 `plugins.entries.minimax.config.webSearch.apiKey` （顺序 15）
3. **Gemini** -- `plugins.entries.google.config.webSearch.apiKey`、 `GEMINI_API_KEY` 或 `models.providers.google.apiKey` （顺序 20）
4. **Grok** -- xAI OAuth、 OAuth`XAI_API_KEY` 或 `plugins.entries.xai.config.webSearch.apiKey` （顺序 30）
5. **Kimi** -- `KIMI_API_KEY` / `MOONSHOT_API_KEY` 或 `plugins.entries.moonshot.config.webSearch.apiKey` （顺序 40）
6. **Perplexity** -- Perplexity`PERPLEXITY_API_KEY` / `OPENROUTER_API_KEY` 或 `plugins.entries.perplexity.config.webSearch.apiKey` （顺序 50）
7. **Firecrawl** -- Firecrawl`FIRECRAWL_API_KEY` 或 `plugins.entries.firecrawl.config.webSearch.apiKey` （顺序 60）
8. **Exa** -- `EXA_API_KEY` 或 `plugins.entries.exa.config.webSearch.apiKey`；可选的 `plugins.entries.exa.config.webSearch.baseUrl` 会覆盖 Exa 端点 （顺序 65）
9. **Tavily** -- `TAVILY_API_KEY` 或 `plugins.entries.tavily.config.webSearch.apiKey` （顺序 70）

之后是无密钥的后备方案：

10. **DuckDuckGo** -- 无需账户或 API 密钥的无密钥 HTML 后备方案（顺序 100）
11. **Ollama Web Search** -- 通过您配置的本地 Ollama 主机进行的免密钥回退，当其可达且使用 OllamaOllama`ollama signin`Ollama 登录时；当主机需要时，可以重用 Ollama 提供商的 bearer auth，并且当使用 `OLLAMA_API_KEY` 配置时，可以调用直接的 `https://ollama.com` 搜索 （顺序 110）
12. **SearXNG** -- `SEARXNG_BASE_URL` 或 `plugins.entries.searxng.config.webSearch.baseUrl` （顺序 200）

如果未检测到提供商，它将回退到 Brave（您将收到缺失密钥错误，提示您配置一个）。

<Note>
  所有提供商密钥字段均支持 SecretRef 对象。位于 `plugins.entries.<plugin>.config.webSearch.apiKey` 下的插件作用域 SecretRefs
  会针对内置的 API 支持的网络搜索提供商进行解析，包括 Brave、Exa、Firecrawl、
  Gemini、Grok、Kimi、MiniMax、Perplexity 和 Tavily，
  无论提供商是通过 `tools.web.search.provider`OpenClaw 显式选择还是
  通过自动检测选中。在自动检测模式下，OpenClaw 仅解析
  选定的提供商密钥——未选定的 SecretRefs 保持非活动状态，因此您可以
  配置多个提供商，而无需为未使用的提供商支付解析成本。
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

特定于提供商的配置（API 密钥、基础 URL、模式）位于
`plugins.entries.<plugin>.config.webSearch.*` 之下。Gemini 还可以重用
`models.providers.google.apiKey` 和 `models.providers.google.baseUrl` 作为其专用网络搜索配置和 `GEMINI_API_KEY` 之后的低优先级
备用。请参阅
提供商页面以获取示例。
Grok 还可以重用来自 `openclaw models auth login
--提供商 xai --method oauth` 的 xAI OAuth 身份验证配置文件；API 密钥配置仍作为备用。

`tools.web.search.provider` 会根据内置和已安装插件清单声明的网络搜索提供商 ID
进行验证。诸如 `"brvae"` 之类的拼写错误
将导致配置验证失败，而不是静默回退到自动检测。如果
配置的提供商仅有过时的插件证据，例如卸载第三方插件后
遗留的 `plugins.entries.<plugin>`OpenClaw 块，
OpenClaw 将保持启动弹性并报告警告，以便您可以重新安装
插件或运行 `openclaw doctor --fix` 来清理过时的配置。

`web_fetch` 备用提供商的选择是独立的：

- 通过 `tools.web.fetch.provider` 进行选择
- 或者省略该字段，让 OpenClaw 从可用的凭据中自动检测第一个就绪的网络获取提供商
- 非沙箱隔离的 `web_fetch` 可以使用声明了
  `contracts.webFetchProviders` 的已安装插件提供商；沙箱隔离的获取保持仅限内置
- 目前捆绑的 web-fetch 提供商是 Firecrawl，配置于
  `plugins.entries.firecrawl.config.webFetch.*`

当您在 `openclaw onboard` 或
`openclaw configure --section web` 期间选择 **Kimi** 时，OpenClaw 也可以请求：

- Moonshot API 区域 (`https://api.moonshot.ai/v1` 或 `https://api.moonshot.cn/v1`)
- 默认的 Kimi web-search 模型（默认为 `kimi-k2.6`）

对于 `x_search`，请配置 `plugins.entries.xai.config.xSearch.*`。它使用与聊天相同的
xAI 身份验证配置文件，或者 Grok web search 使用的 `XAI_API_KEY` / 插件 web-search
凭据。
旧的 `tools.web.x_search.*` 配置会由 `openclaw doctor --fix` 自动迁移。
当您在 `openclaw onboard` 或 `openclaw configure --section web` 期间选择 Grok 时，
OpenClaw 也可以提供使用相同凭据的可选 `x_search` 设置。
这是 Grok 路径中的一个单独后续步骤，而不是一个单独的顶级
web-search 提供商选择。如果您选择了其他提供商，OpenClaw 将不会
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

    对于网关安装，请将其放入 `~/.openclaw/.env` 中。
    请参阅 [环境变量](/zh/help/faq#env-vars-and-env-loading)。

  </Tab>
</Tabs>

## 工具参数

| 参数                  | 描述                                            |
| --------------------- | ----------------------------------------------- |
| `query`               | 搜索查询（必填）                                |
| `count`               | 要返回的结果数（1-10，默认：5）                 |
| `country`             | 2 字母 ISO 国家代码（例如 "US"、"DE"）          |
| `language`            | ISO 639-1 语言代码（例如 "en"、"de"）           |
| `search_lang`         | 搜索语言代码（仅限 Brave）                      |
| `freshness`           | 时间过滤器：`day`、`week`、`month` 或 `year`    |
| `date_after`          | 此日期之后的结果（YYYY-MM-DD）                  |
| `date_before`         | 此日期之前的结果（YYYY-MM-DD）                  |
| `ui_lang`             | UI 语言代码（仅限 Brave）                       |
| `domain_filter`       | 域名允许列表/拒绝列表数组（仅限 Perplexity）    |
| `max_tokens`          | 总内容预算，默认为 25000（仅限 Perplexity）     |
| `max_tokens_per_page` | 每页 token 限制，默认为 2048（仅限 Perplexity） |

<Warning>
  并非所有参数都适用于所有提供商。Brave Brave `llm-context` 模式 会拒绝 `ui_lang`；`date_before` 还需要 `date_after`Brave，因为 Brave 自定义 新鲜度范围需要同时包含开始日期和结束日期。 Gemini、Grok 和 Kimi 会返回一个带引用的综合答案。它们 接受 `count` 以兼容共享工具，但这不会改变 基于事实的答案的形状。Gemma 支持 `freshness`、`date_after` 和 `date_before`，方法是将它们转换为 Google 搜索 grounding
  时间范围。 当您使用 Sonar/Perplexity 兼容路径（`plugins.entries.perplexity.config.webSearch.baseUrl` / `model` 或 `OPENROUTER_API_KEY`）时，OpenRouter 的行为方式相同。 SearXNG 仅对受信任的专用网络或环回主机接受 `http://`； 公共 SearXNG 端点必须使用 `https://`。 Firecrawl 和 Tavily 仅通过 `web_search` 支持 `query` 和 `count` -- 如需高级选项，请使用它们专用工具。
</Warning>

## x_search

`x_search` 使用 xAI 查询 X（前身为 Twitter）帖子并返回
带引用的 AI 综合答案。它接受自然语言查询和
可选的结构化过滤器。OpenClaw 仅在服务于此工具调用的请求上启用内置的 xAI `x_search`
工具。

<Note>xAI 文档指出 `x_search` 支持关键词搜索、语义搜索、用户搜索 和主题串抓取。对于单条帖子的互动数据（如转推、 回复、书签或浏览量），建议针对确切的帖子 URL 或状态 ID 进行定向查找。广泛的关键词搜索可能会找到正确的帖子，但返回的单条帖子元数据 可能不够完整。一个好的模式是：先定位帖子，然后 运行第二条 `x_search` 查询，专注于该确切帖子。</Note>

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
            baseUrl: "https://api.x.ai/v1", // optional, overrides webSearch.baseUrl
            inlineCitations: false,
            maxTurns: 2,
            timeoutSeconds: 30,
            cacheTtlMinutes: 15,
          },
          webSearch: {
            apiKey: "xai-...", // optional if an xAI auth profile or XAI_API_KEY is set
            baseUrl: "https://api.x.ai/v1", // optional shared xAI Responses base URL
          },
        },
      },
    },
  },
}
```

当设置了
`plugins.entries.xai.config.xSearch.baseUrl` 时，`x_search` 会将帖子发布到 `<baseUrl>/responses`。如果省略了该字段，
它会回退到 `plugins.entries.xai.config.webSearch.baseUrl`，然后是
传统的 `tools.web.search.grok.baseUrl`，最后是公共 xAI 端点。

### x_search 参数

| 参数                         | 描述                                  |
| ---------------------------- | ------------------------------------- |
| `query`                      | 搜索查询（必填）                      |
| `allowed_x_handles`          | 将结果限制为特定的 X 用户名           |
| `excluded_x_handles`         | 排除特定的 X 用户名                   |
| `from_date`                  | 仅包含此日期及之后的帖子 (YYYY-MM-DD) |
| `to_date`                    | 仅包含此日期及之前的帖子 (YYYY-MM-DD) |
| `enable_image_understanding` | 允许 xAI 检查匹配帖子中附加的图片     |
| `enable_video_understanding` | 允许 xAI 检查匹配帖子中附加的视频     |

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

- [Web Fetch](/zh/tools/web-fetch) -- 获取 URL 并提取可读内容
- [Web Browser](/zh/tools/browser) -- 针对重度 JavaScript 网站的完整浏览器自动化
- [Grok Search](/zh/tools/grok-search) -- 使用 Grok 作为 `web_search` 提供商
- [Ollama Web Search](Ollama/en/tools/ollama-searchOllama) -- 通过您的 Ollama 主机进行免密钥网络搜索
