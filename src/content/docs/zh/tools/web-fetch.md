---
summary: "web_fetch 工具 -- HTTP 获取与可读内容提取"
read_when:
  - You want to fetch a URL and extract readable content
  - You need to configure web_fetch or its Firecrawl fallback
  - You want to understand web_fetch limits and caching
title: "Web fetch"
sidebarTitle: "Web Fetch"
---

`web_fetch` 工具执行普通的 HTTP GET 请求并提取可读内容（HTML 转换为 markdown 或文本）。它**不**执行 JavaScript。

对于重度依赖 JS 的网站或受登录保护的页面，请改为使用
[Web Browser](/zh/tools/browser)。

## 快速开始

`web_fetch` **默认启用** -- 无需配置。代理可以立即调用它：

```javascript
await web_fetch({ url: "https://example.com/article" });
```

## 工具参数

<ParamField path="url" type="string" required>
  要获取的 URL。仅限 `http(s)`。
</ParamField>

<ParamField path="extractMode" type="'markdown' | 'text'" default="markdown">
  提取主要内容后的输出格式。
</ParamField>

<ParamField path="maxChars" type="number">
  将输出截断为指定字符数。
</ParamField>

## 工作原理

<Steps>
  <Step title="Fetch">使用类似 Chrome 的 User-Agent 和 `Accept-Language` 标头发送 HTTP GET 请求。阻止私有/内部主机名并重新检查重定向。</Step>
  <Step title="Extract">在 HTML 响应上运行 Readability（主要内容提取）。</Step>
  <Step title="Fallback (optional)">如果 Readability 失败并配置了 Firecrawl，则通过启用反机器人模式的 Firecrawl API 进行重试。</Step>
  <Step title="Cache">结果会被缓存 15 分钟（可配置），以减少对同一 URL 的重复获取。</Step>
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
        useTrustedEnvProxy: false, // let a trusted HTTP(S) env proxy resolve DNS
        readability: true, // use Readability extraction
        userAgent: "Mozilla/5.0 ...", // override User-Agent
        ssrfPolicy: {
          allowRfc2544BenchmarkRange: true, // opt-in for trusted fake-IP proxies using 198.18.0.0/15
          allowIpv6UniqueLocalRange: true, // opt-in for trusted fake-IP proxies using fc00::/7
        },
      },
    },
  },
}
```

## Firecrawl 回退

如果 Readability 提取失败，`web_fetch` 可以回退到
[Firecrawl](/zh/tools/firecrawl) 以绕过机器人检测并获得更好的提取效果：

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

<Note>Firecrawl `baseUrl` 覆盖配置已锁定：托管流量使用 `https://api.firecrawl.dev`；自托管覆盖必须指向私有或 内部端点，且仅对这些私有目标接受 `http://`。</Note>

当前运行时行为：

- `tools.web.fetch.provider` 显式选择获取后备提供商。
- 如果省略了 `provider`，OpenClaw 会根据可用凭据自动检测第一个就绪的 web-fetch
  提供商。非沙箱隔离的 `web_fetch` 可以使用
  声明了 `contracts.webFetchProviders` 并在运行时注册
  匹配提供商的已安装插件。目前捆绑的提供商是 Firecrawl。
- 沙箱隔离的 `web_fetch` 调用仅限于捆绑的提供商。
- 如果禁用了 Readability，`web_fetch` 将直接跳转到所选
  提供商的回退选项。如果没有可用的提供商，它将安全地失败。

## 可信环境变量代理

如果您的部署需要 `web_fetch` 通过可信的出站
HTTP(S) 代理，请设置 `tools.web.fetch.useTrustedEnvProxy: true`。

在此模式下，OpenClaw 在发送请求之前仍会应用基于主机名的 SSRF 检查，但它允许代理解析 DNS，而不是进行本地 DNS
锁定。仅当代理由操作员控制并在 DNS 解析后强制执行
出站策略时，才启用此功能。

<Note>如果未配置 HTTP(S) 代理环境变量，或目标主机被 `NO_PROXY` 排除，`web_fetch` 将回退到带有本地 DNS 锁定的正常严格路径。</Note>

## 限制和安全

- `maxChars` 被限制为 `tools.web.fetch.maxCharsCap`
- 响应正文在解析前被限制为 `maxResponseBytes`；超大小
  的响应将被截断并发出警告
- 私有/内部主机名被阻止
- `tools.web.fetch.ssrfPolicy.allowRfc2544BenchmarkRange` 和
  `tools.web.fetch.ssrfPolicy.allowIpv6UniqueLocalRange` 是针对可信的虚拟 IP 代理栈的特定选择加入项；除非您的代理拥有这些合成 IP 范围并在解析后强制执行其自己的目标策略，否则请保持它们未设置
- 重定向会受到 `maxRedirects` 的检查和限制
- `useTrustedEnvProxy` 是一个明确的选择加入项，仅应针对操作员控制的代理启用，这些代理在 DNS 解析后仍强制执行出站策略
- `web_fetch` 是尽力而为的——某些站点需要使用 [Web Browser](/zh/tools/browser)

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

- [Web Search](/zh/tools/web) —— 使用多个提供商搜索网络
- [Web Browser](/zh/tools/browser) —— 针对重度 JS 站点的完整浏览器自动化
- [Firecrawl](/zh/tools/firecrawl) —— Firecrawl 搜索和抓取工具
