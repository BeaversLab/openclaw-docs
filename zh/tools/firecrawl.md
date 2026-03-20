---
summary: "Firecrawl 搜索、抓取和 web_fetch 回退"
read_when:
  - 您希望使用 Firecrawl 支持的 Web 提取
  - 您需要一个 Firecrawl API 密钥
  - 您希望将 Firecrawl 作为 web_search 提供商
  - 您需要为 web_fetch 进行反爬虫提取
title: "Firecrawl"
---

# Firecrawl

OpenClaw 可以通过三种方式使用 **Firecrawl**：

- 作为 `web_search` 提供商
- 作为显式插件工具：`firecrawl_search` 和 `firecrawl_scrape`
- 作为 `web_fetch` 的回退提取器

它是一项托管的提取/搜索服务，支持反爬虫和缓存，
这有助于处理重度依赖 JS 的网站或阻止普通 HTTP 获取的页面。

## 获取 API 密钥

1. 创建一个 Firecrawl 账户并生成一个 API 密钥。
2. 将其存储在配置中，或在网关环境中设置 `FIRECRAWL_API_KEY`。

## 配置 Firecrawl 搜索

```json5
{
  tools: {
    web: {
      search: {
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
            apiKey: "FIRECRAWL_API_KEY_HERE",
            baseUrl: "https://api.firecrawl.dev",
          },
        },
      },
    },
  },
}
```

注意事项：

- 在 新手引导 或 `openclaw configure --section web` 中选择 Firecrawl 会自动启用捆绑的 Firecrawl 插件。
- 配合 Firecrawl 使用的 `web_search` 支持 `query` 和 `count`。
- 对于 Firecrawl 特有的控制，如 `sources`、`categories` 或结果抓取，请使用 `firecrawl_search`。

## 配置 Firecrawl 抓取 + web_fetch 回退

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
      fetch: {
        firecrawl: {
          apiKey: "FIRECRAWL_API_KEY_HERE",
          baseUrl: "https://api.firecrawl.dev",
          onlyMainContent: true,
          maxAgeMs: 172800000,
          timeoutSeconds: 60,
        },
      },
    },
  },
}
```

注意事项：

- 除非显式设置为 `false`，否则 `firecrawl.enabled` 默认为 `true`。
- 仅当存在 Firecrawl 密钥（`tools.web.fetch.firecrawl.apiKey` 或 `FIRECRAWL_API_KEY`）时，才会运行 API 回退尝试。
- `maxAgeMs` 控制缓存结果的有效期（毫秒）。默认为 2 天。

`firecrawl_scrape` 重用相同的 `tools.web.fetch.firecrawl.*` 设置和环境变量。

## Firecrawl 插件工具

### `firecrawl_search`

当您需要 Firecrawl 特定的搜索控制而非通用的 `web_search` 时，请使用此工具。

核心参数：

- `query`
- `count`
- `sources`
- `categories`
- `scrapeResults`
- `timeoutSeconds`

### `firecrawl_scrape`

对于普通 `web_fetch` 效果不佳的 JS 沉重型或受机器人保护的页面，请使用此选项。

核心参数：

- `url`
- `extractMode`
- `maxChars`
- `onlyMainContent`
- `maxAgeMs`
- `proxy`
- `storeInCache`
- `timeoutSeconds`

## 隐身 / 机器人规避

Firecrawl 公开了一个用于机器人规避的 **proxy mode** 参数（`basic`、`stealth` 或 `auto`）。
OpenClaw 始终为 Firecrawl 请求使用 `proxy: "auto"` 加上 `storeInCache: true`。
如果省略代理，Firecrawl 默认为 `auto`。如果基本尝试失败，`auto` 会使用隐身代理重试，这可能会消耗比仅使用基本抓取更多的积分。

## `web_fetch` 如何使用 Firecrawl

`web_fetch` 提取顺序：

1. 可读性（本地）
2. Firecrawl（如果已配置）
3. 基本 HTML 清理（最后的后备方案）

有关完整的 Web 工具设置，请参阅 [Web tools](/zh/tools/web)。

import zh from "/components/footer/zh.mdx";

<zh />
