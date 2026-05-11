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

對於重度依賴 JS 的網站或需要登入的頁面，請改用
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
        readability: true, // use Readability extraction
        userAgent: "Mozilla/5.0 ...", // override User-Agent
      },
    },
  },
}
```

## Firecrawl 後備機制

如果 Readability 提取失敗，`web_fetch` 可以後備使用
[Firecrawl](/zh-Hant/tools/firecrawl) 進行繞過機器人和更好的提取：

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

<Note>Firecrawl `baseUrl` 覆寫已被鎖定：它們必須使用 `https://` 和 官方的 Firecrawl 主機 (`api.firecrawl.dev`)。</Note>

目前的執行時期行為：

- `tools.web.fetch.provider` 會明確選取 fetch 後備提供者。
- 如果省略 `provider`，OpenClaw 會從可用的憑證中自動偵測
  第一個就緒的 web-fetch 提供者。目前的內建提供者是 Firecrawl。
- 如果停用 Readability，`web_fetch` 會直接跳至選定的
  提供者後備方案。如果沒有可用的提供者，它將會以封閉模式失敗。

## 限制與安全性

- `maxChars` 被限制為 `tools.web.fetch.maxCharsCap`
- 回應主體在解析前上限為 `maxResponseBytes`；超大的
  回應會被截斷並顯示警告
- 私人/內部主機名稱已被封鎖
- 重新導向會受到 `maxRedirects` 的檢查與限制
- `web_fetch` 是盡力而為的——部分網站需要 [Web Browser](/zh-Hant/tools/browser)

## 工具設定檔

如果您使用工具設定檔或允許清單，請加入 `web_fetch` 或 `group:web`：

```json5
{
  tools: {
    allow: ["web_fetch"],
    // or: allow: ["group:web"]  (includes web_fetch, web_search, and x_search)
  },
}
```

## 相關

- [Web Search](/zh-Hant/tools/web) -- 使用多種提供者搜尋網路
- [Web Browser](/zh-Hant/tools/browser) -- 適用於 JS 沉浸式網站的完整瀏覽器自動化
- [Firecrawl](/zh-Hant/tools/firecrawl) -- Firecrawl 搜尋和抓取工具
