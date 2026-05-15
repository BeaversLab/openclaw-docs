---
summary: "web_fetch 工具 -- 進行 HTTP 獲取並提取可讀內容"
read_when:
  - You want to fetch a URL and extract readable content
  - You need to configure web_fetch or its Firecrawl fallback
  - You want to understand web_fetch limits and caching
title: "Web fetch"
sidebarTitle: "網頁擷取"
---

`web_fetch` 工具執行標準的 HTTP GET 請求並提取可讀內容
（HTML 轉 markdown 或 text）。它**不**會執行 JavaScript。

若為重度依賴 JavaScript 的網站或需要登入的頁面，請改用
[Web Browser](/zh-Hant/tools/browser)。

## 快速開始

`web_fetch` **預設已啟用** -- 無需任何配置。代理程式可以
立即呼叫它：

```javascript
await web_fetch({ url: "https://example.com/article" });
```

## 工具參數

<ParamField path="url" type="string" required>
  要獲取的 URL。僅限 `http(s)`。
</ParamField>

<ParamField path="extractMode" type="'markdown' | 'text'" default="markdown">
  主要內容提取後的輸出格式。
</ParamField>

<ParamField path="maxChars" type="number">
  將輸出截斷為指定字元數。
</ParamField>

## 運作原理

<Steps>
  <Step title="擷取">使用類似 Chrome 的 User-Agent 和 `Accept-Language` 標頭發送 HTTP GET 請求。阻擋私人/內部主機名稱並重新檢查重新導向。</Step>
  <Step title="提取">在 HTML 回應上執行 Readability（主要內容提取）。</Step>
  <Step title="後備機制（選用）">如果 Readability 失敗且已配置 Firecrawl，則透過 Firecrawl API 使用繞過機器人模式重試。</Step>
  <Step title="快取">結果會快取 15 分鐘（可配置）以減少重複 獲取同一 URL。</Step>
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

## Firecrawl 後備機制

如果 Readability 提取失敗，`web_fetch` 可以回退到
[Firecrawl](/zh-Hant/tools/firecrawl) 以規避機器人偵測並獲得更好的提取效果：

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

`plugins.entries.firecrawl.config.webFetch.apiKey` 支援 SecretRef 物件。
舊版 `tools.web.fetch.firecrawl.*` 配置會由 `openclaw doctor --fix` 自動遷移。

<Note>如果啟用了 Firecrawl 且其 SecretRef 未解析且沒有 `FIRECRAWL_API_KEY` env 後備，gateway 啟動會快速失敗。</Note>

<Note>Firecrawl `baseUrl` 覆寫設定已鎖定：託管流量使用 `https://api.firecrawl.dev`；自託管的覆寫必須指向私有或 內部端點，且僅針對這些私有目標才接受 `http://`。</Note>

目前的執行時期行為：

- `tools.web.fetch.provider` 會明確選取 fetch 後備提供者。
- 如果省略 `provider`，OpenClaw 會從可用的憑證中自動偵測第一個就緒的 web-fetch
  提供者。非沙盒化的 `web_fetch` 可以使用
  已安裝的外掛程式，這些外掛程式宣告 `contracts.webFetchProviders` 並在執行時註冊
  相符的提供者。目前內建的提供者為 Firecrawl。
- 沙盒化的 `web_fetch` 呼叫僅限於使用內建的提供者。
- 如果停用 Readability，`web_fetch` 會直接跳至選定的
  提供者回退機制。如果沒有可用的提供者，它將會失敗並封閉連線。

## Trusted env proxy

如果您的部署需要 `web_fetch` 透過受信任的出站
HTTP(S) 代理伺服器，請設定 `tools.web.fetch.useTrustedEnvProxy: true`。

在此模式下，OpenClaw 在發送請求前仍會套用基於主機名的 SSRF 檢查，但它允許代理伺服器解析 DNS，而不是進行本機 DNS
鎖定。僅在代理伺服器由操作員控制並在 DNS 解析後執行出站原則時才啟用此功能。

<Note>如果未設定 HTTP(S) 代理伺服器環境變數，或目標主機被 `NO_PROXY` 排除，`web_fetch` 將回退到具有本機 DNS 鎖定的正常嚴格路徑。</Note>

## Limits and safety

- `maxChars` 被限制在 `tools.web.fetch.maxCharsCap`
- 回應主體在解析前會限制為 `maxResponseBytes`；超過大小
  的回應會被截斷並顯示警告
- 私人/內部主機名稱會被阻擋
- `tools.web.fetch.ssrfPolicy.allowRfc2544BenchmarkRange` 和
  `tools.web.fetch.ssrfPolicy.allowIpv6UniqueLocalRange` 是針對受信任的偽 IP 代理堆疊的精細選項；除非您的代理擁有這些合成範圍並強制執行自己的目標策略，否則請勿設定它們
- 重新導向會受到 `maxRedirects` 的檢查與限制
- `useTrustedEnvProxy` 是一個明確的選用功能，僅應針對在 DNS 解析後仍強制執行傳出策略的操作員控制的代理程式啟用
- `web_fetch` 為盡力而為——某些網站需要 [Web Browser](/zh-Hant/tools/browser)

## 工具設定檔

如果您使用工具設定檔或允許清單，請新增 `web_fetch` 或 `group:web`：

```json5
{
  tools: {
    allow: ["web_fetch"],
    // or: allow: ["group:web"]  (includes web_fetch, web_search, and x_search)
  },
}
```

## 相關

- [Web Search](/zh-Hant/tools/web) -- 使用多個供應商搜尋網路
- [Web Browser](/zh-Hant/tools/browser) -- 針對重度 JS 網站的完整瀏覽器自動化
- [Firecrawl](/zh-Hant/tools/firecrawl) -- Firecrawl 搜尋與擷取工具
