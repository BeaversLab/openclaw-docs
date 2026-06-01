---
summary: "web_fetch 工具 -- 使用可讀內容提取功能的 HTTP 取得"
read_when:
  - You want to fetch a URL and extract readable content
  - You need to configure web_fetch or its Firecrawl fallback
  - You want to understand web_fetch limits and caching
title: "網頁擷取"
sidebarTitle: "網頁擷取"
---

`web_fetch` 工具執行一般的 HTTP GET 並提取可讀內容
(HTML 轉 markdown 或文字)。它**不會**執行 JavaScript。

對於重度使用 JS 的網站或需要登入的頁面，請改用
[網頁瀏覽器](/zh-Hant/tools/browser)。

## 快速開始

`web_fetch` **預設為啟用** -- 無需設定。代理程式可以
立即呼叫它：

```javascript
await web_fetch({ url: "https://example.com/article" });
```

## 工具參數

<ParamField path="url" type="string" required>
  要擷取的 URL。僅限 `http(s)`。
</ParamField>

<ParamField path="extractMode" type="'markdown' | 'text'" default="markdown">
  主要內容提取後的輸出格式。
</ParamField>

<ParamField path="maxChars" type="number">
  將輸出截斷為這麼多字元。
</ParamField>

## 運作原理

<Steps>
  <Step title="擷取">使用類似 Chrome 的 User-Agent 和 `Accept-Language` 標頭傳送 HTTP GET。阻擋私有/內部主機名稱並重新檢查重新導向。</Step>
  <Step title="提取">對 HTML 回應執行 Readability (主要內容提取)。</Step>
  <Step title="後備 (可選)">如果 Readability 失敗且已設定 Firecrawl，則透過 具有規避機器人模式的 Firecrawl API 重試。</Step>
  <Step title="快取">結果會快取 15 分鐘 (可設定) 以減少對 相同 URL 的重複擷取。</Step>
</Steps>

## 進度更新

`web_fetch` 僅在擷取作業逾過五秒鐘仍處於擱置狀態時，
才會發出公開進度行：

```text
Fetching page content...
```

快速快取命中和快速網路回應會在計時器觸發前完成，因此
它們不會顯示進度列。如果呼叫被取消，計時器會被清除。
當擷取最終完成時，代理會收到正常的工具結果；
進度列僅僅是通道 UI 狀態，絕不包含已擷取的頁面
內容。

## Config

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

## Firecrawl fallback

如果 Readability 擷取失敗，`web_fetch` 可以回退至
[Firecrawl](/zh-Hant/tools/firecrawl) 以規避機器人偵測並進行更好的擷取：

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
舊版 `tools.web.fetch.firecrawl.*` 設定會由 `openclaw doctor --fix` 自動遷移。

<Note>如果啟用了 Firecrawl 且其 SecretRef 未解析，且沒有 `FIRECRAWL_API_KEY` 環境變數作為後備，gateway 啟動會快速失敗。</Note>

<Note>Firecrawl `baseUrl` 覆寫已鎖定：託管流量使用 `https://api.firecrawl.dev`；自託管的覆寫必須指向私有或 內部端點，且 `http://` 僅接受針對這些私有目標的設定。</Note>

當前執行時行為：

- `tools.web.fetch.provider` 會明確選擇擷取後備提供者。
- 如果省略 `provider`，OpenClaw 會從可用的憑證中自動偵測第一個就緒的 web-fetch
  提供者。非沙盒化的 `web_fetch` 可以使用
  宣告 `contracts.webFetchProviders` 並在執行時註冊
  匹配提供者的已安裝外掛。目前內建的提供者是 Firecrawl。
- 沙盒化的 `web_fetch` 呼叫僅限於使用內建的提供者。
- 如果停用 Readability，`web_fetch` 會直接跳至選定的
  提供者後備。如果沒有可用的提供者，它將以封閉模式失敗（失敗關閉）。

## Trusted env proxy

如果您的部署需要 `web_fetch` 透過受信任的出境
HTTP(S) 代理伺服器，請設定 `tools.web.fetch.useTrustedEnvProxy: true`。

在此模式下，OpenClaw 在發送請求前仍會套用基於主機名的 SSRF 檢查，
但它會讓代理伺服器解析 DNS，而不是進行本地 DNS
鎖定。僅在代理伺服器由操作員控制並在 DNS 解析後執行
出境政策時才啟用此功能。

<Note>如果未設定 HTTP(S) 代理環境變數，或目標主機被 `NO_PROXY` 排除，`web_fetch` 將回退至具有本機 DNS 鎖定的正常嚴格路徑。</Note>

## 限制與安全性

- `maxChars` 被限制為 `tools.web.fetch.maxCharsCap`
- 回應主體在解析前被限制為 `maxResponseBytes`；超出大小
  的回應會被截斷並顯示警告
- 私人/內部主機名稱被封鎖
- `tools.web.fetch.ssrfPolicy.allowRfc2544BenchmarkRange` 和
  `tools.web.fetch.ssrfPolicy.allowIpv6UniqueLocalRange` 是針對受信任的偽造 IP 代理堆疊
  的狹隘選用功能；除非您的代理擁有這些合成範圍並執行自己的目的地政策，否則請勿設定它們
- 重新導向會受到 `maxRedirects` 的檢查與限制
- `useTrustedEnvProxy` 是一個明確的選用功能，僅應針對
  在 DNS 解析後仍執行出站政策的操作員控制代理程式啟用
- `web_fetch` 是盡力而為的 —— 某些網站需要使用 [Web Browser](/zh-Hant/tools/browser)

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
- [Firecrawl](/zh-Hant/tools/firecrawl) -- Firecrawl 搜尋和爬取工具
