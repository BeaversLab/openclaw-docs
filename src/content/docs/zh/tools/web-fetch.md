---
summary: "web_fetch 工具 -- HTTP 获取与可读内容提取"
read_when:
  - You want to fetch a URL and extract readable content
  - You need to configure web_fetch or its Firecrawl fallback
  - You want to understand web_fetch limits and caching
title: "Web Fetch"
sidebarTitle: "Web Fetch"
---

# Web Fetch

`web_fetch` 工具执行普通的 HTTP GET 请求并提取可读内容
（HTML 转 markdown 或文本）。它**不**执行 JavaScript。

对于重度依赖 JS 的网站或登录保护的页面，请改用
[Web Browser](/zh/tools/browser)。

## 快速开始

`web_fetch` **默认已启用** -- 无需配置。Agent 可以
立即调用它：

```javascript
await web_fetch({ url: "https://example.com/article" });
```

## 工具参数

| 参数          | 类型     | 描述                                  |
| ------------- | -------- | ------------------------------------- |
| `url`         | `string` | 要获取的 URL（必填，仅限 http/https） |
| `extractMode` | `string` | `"markdown"`（默认）或 `"text"`       |
| `maxChars`    | `number` | 将输出截断为指定字符数                |

## 工作原理

<Steps>
  <Step title="Fetch">发送带有类 Chrome User-Agent 和 `Accept-Language` 标头的 HTTP GET 请求。阻止 私有/内部主机名并重新检查重定向。</Step>
  <Step title="Extract">在 HTML 响应上运行 Readability（主要内容提取）。</Step>
  <Step title="Fallback (optional)">如果 Readability 失败且配置了 Firecrawl，则通过 Firecrawl API 重试，并使用 反爬虫模式。</Step>
  <Step title="Cache">结果会被缓存 15 分钟（可配置）以减少对同一 URL 的重复获取。</Step>
</Steps>

## 配置

```json5
{
  tools: {
    web: {
      fetch: {
        enabled: true, // default: true
        maxChars: 50000, // max output chars
        maxCharsCap: 50000, // hard cap for maxChars param
        maxResponseBytes: 2000000, // max download size before truncation
        timeoutSeconds: 30,
        cacheTtlMinutes: 15,
        maxRedirects: 3,
        readability: true, // use Readability extraction
        userAgent: "Mozilla/5.0 ...", // override User-Agent
      },
    },
  },
}
```

## Firecrawl fallback

如果 Readability 提取失败，`web_fetch` 可以回退到
[Firecrawl](/zh/tools/firecrawl) 以进行反爬虫并更好地提取内容：

```json5
{
  tools: {
    web: {
      fetch: {
        firecrawl: {
          enabled: true,
          apiKey: "fc-...", // optional if FIRECRAWL_API_KEY is set
          baseUrl: "https://api.firecrawl.dev",
          onlyMainContent: true,
          maxAgeMs: 86400000, // cache duration (1 day)
          timeoutSeconds: 60,
        },
      },
    },
  },
}
```

`tools.web.fetch.firecrawl.apiKey` 支持 SecretRef 对象。

<Note>如果启用了 Firecrawl 且其 SecretRef 未解析且没有 `FIRECRAWL_API_KEY` 环境变量备用方案， 网关启动将快速失败。</Note>

## 限制和安全

- `maxChars` 被限制为 `tools.web.fetch.maxCharsCap`
- 响应体在解析前被限制为 `maxResponseBytes`；超大的
  响应将被截断并显示警告
- 私有/内部主机名被阻止
- 重定向会受到 `maxRedirects` 的检查和限制
- `web_fetch` 是尽力而为的 —— 某些站点需要 [Web Browser](/zh/tools/browser)

## 工具配置文件

如果您使用工具配置文件或允许列表，请添加 `web_fetch` 或 `group:web`：

```json5
{
  tools: {
    allow: ["web_fetch"],
    // or: allow: ["group:web"]  (includes both web_fetch and web_search)
  },
}
```

## 相关

- [Web Search](/zh/tools/web) -- 使用多个提供商搜索网络
- [Web Browser](/zh/tools/browser) -- 针对 JavaScript 重型网站的完整浏览器自动化
- [Firecrawl](/zh/tools/firecrawl) -- Firecrawl 搜索和抓取工具
