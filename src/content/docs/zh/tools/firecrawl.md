---
summary: "Firecrawl 搜索、抓取和 web_fetch 回退"
read_when:
  - You want Firecrawl-backed web extraction
  - You need a Firecrawl API key
  - You want Firecrawl as a web_search provider
  - You want anti-bot extraction for web_fetch
title: "Firecrawl"
---

# Firecrawl

OpenClaw 可以通过三种方式使用 **Firecrawl**：

- 作为 `web_search` 提供商
- 作为显式插件工具：`firecrawl_search` 和 `firecrawl_scrape`
- 作为 `web_fetch` 的回退提取器

它是一项托管的提取/搜索服务，支持绕过机器人检测和缓存，
这有助于处理重度 JS 的站点或阻止普通 HTTP 获取的页面。

## 获取 API key

1. 创建一个 Firecrawl 帐户并生成一个 API key。
2. 将其存储在配置中或在网关环境中设置 `FIRECRAWL_API_KEY`。

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

- 在新手引导或 `openclaw configure --section web` 中选择 Firecrawl 会自动启用捆绑的 Firecrawl 插件。
- 结合 Firecrawl 的 `web_search` 支持 `query` 和 `count`。
- 若要使用 Firecrawl 特定的控制（如 `sources`、`categories` 或结果抓取），请使用 `firecrawl_search`。
- `baseUrl` 覆盖必须保留在 `https://api.firecrawl.dev` 上。
- `FIRECRAWL_BASE_URL` 是 Firecrawl 搜索和抓取基础 URL 的共享环境变量回退。

## 配置 Firecrawl 抓取 + web_fetch 回退

```json5
{
  plugins: {
    entries: {
      firecrawl: {
        enabled: true,
        config: {
          webFetch: {
            apiKey: "FIRECRAWL_API_KEY_HERE",
            baseUrl: "https://api.firecrawl.dev",
            onlyMainContent: true,
            maxAgeMs: 172800000,
            timeoutSeconds: 60,
          },
        },
      },
    },
  },
}
```

注意：

- Firecrawl 回退尝试仅在存在 API 密钥时运行（`plugins.entries.firecrawl.config.webFetch.apiKey` 或 `FIRECRAWL_API_KEY`）。
- `maxAgeMs` 控制缓存结果的最长有效期（毫秒）。默认为 2 天。
- 旧的 `tools.web.fetch.firecrawl.*` 配置会被 `openclaw doctor --fix` 自动迁移。
- Firecrawl 抓取/基础 URL 覆盖仅限于 `https://api.firecrawl.dev`。

`firecrawl_scrape` 重用相同的 `plugins.entries.firecrawl.config.webFetch.*` 设置和 环境变量（环境变量）。

## Firecrawl 插件工具

### `firecrawl_search`

当您需要 Firecrawl 专属的搜索控件而不是通用的 `web_search` 时，请使用此工具。

核心参数：

- `query`
- `count`
- `sources`
- `categories`
- `scrapeResults`
- `timeoutSeconds`

### `firecrawl_scrape`

对于 JS 沉重或有机器人保护的页面，当普通的 `web_fetch` 效果不佳时，请使用此工具。

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

Firecrawl 公开了一个用于规避机器人的“代理模式”参数（`basic`、`stealth` 或 `auto`）。
OpenClaw 在 Firecrawl 请求中始终使用 `proxy: "auto"` 加上 `storeInCache: true`。
如果省略代理，Firecrawl 默认为 `auto`。`auto` 如果基本尝试失败，将使用隐身代理重试，这可能会消耗比仅基本抓取更多的积分。

## `web_fetch` 如何使用 Firecrawl

`web_fetch` 提取顺序：

1. Readability（本地）
2. Firecrawl（如果被选中或自动检测为活动的 web-fetch 回退）
3. 基础 HTML 清理（最后的回退）

选择旋钮是 `tools.web.fetch.provider`。如果您省略它，OpenClaw
会根据可用的凭据自动检测第一个就绪的 web-fetch 提供商。
目前捆绑的提供商是 Firecrawl。

## 相关

- [Web Search 概述](/zh/tools/web) -- 所有提供商和自动检测
- [Web Fetch](/zh/tools/web-fetch) -- 带有 Firecrawl 回退的 web_fetch 工具
- [Tavily](/zh/tools/tavily) -- 搜索 + 提取工具
