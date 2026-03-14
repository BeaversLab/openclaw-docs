---
summary: "Firecrawl web_fetch 的后备提取器（反机器人 + 缓存提取）"
read_when:
  - You want Firecrawl-backed web extraction
  - You need a Firecrawl API key
  - You want anti-bot extraction for web_fetch
title: "Firecrawl"
---

# Firecrawl

OpenClaw 可以使用 **Firecrawl** 作为 `web_fetch` 的后备提取器。它是一项托管的内容提取服务，支持机器人规避和缓存，这有助于处理重度依赖 JS 的网站或阻止普通 HTTP 获取的页面。

## 获取 API 密钥

1. 创建一个 Firecrawl 账户并生成一个 API 密钥。
2. 将其存储在配置中，或在网关环境中设置 `FIRECRAWL_API_KEY`。

## 配置 Firecrawl

```json5
{
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

注意：

- 除非明确设置为 `false`，否则 `firecrawl.enabled` 默认为 `true`。
- 仅当有可用的 API 密钥（`tools.web.fetch.firecrawl.apiKey` 或 `FIRECRAWL_API_KEY`）时，才会运行 Firecrawl 后备尝试。
- `maxAgeMs` 控制缓存结果的最长保留时间（毫秒）。默认为 2 天。

## 隐身 / 机器人规避

Firecrawl 公开了一个用于机器人规避的 **代理模式** 参数（`basic`、`stealth` 或 `auto`）。
OpenClaw 在 Firecrawl 请求中始终使用 `proxy: "auto"` 加上 `storeInCache: true`。
如果省略代理，Firecrawl 默认为 `auto`。如果基本尝试失败，`auto` 将使用隐身代理重试，这可能会比仅使用基本抓取消耗更多积分。

## `web_fetch` 如何使用 Firecrawl

`web_fetch` 提取顺序：

1. Readability（本地）
2. Firecrawl（如果已配置）
3. 基本 HTML 清理（最后回退）

有关完整的 Web 工具设置，请参阅 [Web 工具](/zh/tools/web)。

import zh from '/components/footer/zh.mdx';

<zh />
