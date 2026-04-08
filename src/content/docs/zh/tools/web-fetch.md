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

对于重度依赖 JS 的站点或受登录保护的页面，请改用
[Web Browser](/en/tools/browser)。

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
  <Step title="Fetch">使用类似 Chrome 的 User-Agent 和 `Accept-Language` 标头发送 HTTP GET 请求。 阻止私有/内部主机名并重新检查重定向。</Step>
  <Step title="Extract">在 HTML 响应上运行 Readability（主要内容提取）。</Step>
  <Step title="Fallback (optional)">如果 Readability 失败且配置了 Firecrawl，则通过 Firecrawl API 使用反机器人模式重试。</Step>
  <Step title="Cache">结果会被缓存 15 分钟（可配置），以减少对同一 URL 的重复 获取。</Step>
</Steps>

## 配置

```json5
{
  tools: {
    web: {
      fetch: {
        enabled: true, // default: true
        provider: "firecrawl", // optional; omit for auto-detect
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
[Firecrawl](/en/tools/firecrawl) 以绕过机器人检测并实现更好的提取效果：

```json5
{
  tools: {
    web: {
      fetch: {
        provider: "firecrawl", // optional; omit for auto-detect from available credentials
      },
    },
  },
  plugins: {
    entries: {
      firecrawl: {
        enabled: true,
        config: {
          webFetch: {
            apiKey: "fc-...", // optional if FIRECRAWL_API_KEY is set
            baseUrl: "https://api.firecrawl.dev",
            onlyMainContent: true,
            maxAgeMs: 86400000, // cache duration (1 day)
            timeoutSeconds: 60,
          },
        },
      },
    },
  },
}
```

`plugins.entries.firecrawl.config.webFetch.apiKey` 支持 SecretRef 对象。
旧的 `tools.web.fetch.firecrawl.*` 配置会被 `openclaw doctor --fix` 自动迁移。

<Note>如果启用了 Firecrawl 且其 SecretRef 未解析且没有 `FIRECRAWL_API_KEY` 环境变量回退，网关启动将快速失败。</Note>

<Note>Firecrawl `baseUrl` 覆盖项已被锁定：它们必须使用 `https://` 和 官方 Firecrawl 主机 (`api.firecrawl.dev`)。</Note>

当前运行时行为：

- `tools.web.fetch.provider` 显式选择抓取回退提供商。
- 如果省略了 `provider`，OpenClaw 会自动从可用凭据中检测第一个就绪的 web-fetch
  提供商。目前的内置提供商是 Firecrawl。
- 如果禁用了 Readability，`web_fetch` 将直接跳转到所选的
  提供商回退。如果没有可用的提供商，它将以失败关闭。

## 限制与安全

- `maxChars` 被限制为 `tools.web.fetch.maxCharsCap`
- 响应正文在解析前被限制为 `maxResponseBytes`；超大的
  响应将被截断并发出警告
- 私有/内部主机名会被阻止
- 重定向会受到 `maxRedirects` 的检查和限制
- `web_fetch` 是尽力而为的——某些站点需要使用 [Web Browser](/en/tools/browser)

## 工具配置文件

如果您使用工具配置文件或允许列表，请添加 `web_fetch` 或 `group:web`：

```json5
{
  tools: {
    allow: ["web_fetch"],
    // or: allow: ["group:web"]  (includes web_fetch, web_search, and x_search)
  },
}
```

## 相关

- [Web Search](/en/tools/web) -- 使用多个提供商搜索网络
- [Web Browser](/en/tools/browser) -- 针对重度 JS 站点的完整浏览器自动化
- [Firecrawl](/en/tools/firecrawl) -- Firecrawl 搜索和抓取工具
