---
summary: "web_fetch 工具 -- 進行 HTTP 獲取並提取可讀內容"
read_when:
  - You want to fetch a URL and extract readable content
  - You need to configure web_fetch or its Firecrawl fallback
  - You want to understand web_fetch limits and caching
title: "網頁擷取"
sidebarTitle: "網頁擷取"
---

# 網頁擷取

`web_fetch` 工具會執行單純的 HTTP GET 請求並提取可讀內容
（HTML 轉 markdown 或純文字）。它**不會**執行 JavaScript。

對於重度依賴 JS 的網站或需登入保護的頁面，請改用
[Web Browser](/zh-Hant/tools/browser)。

## 快速開始

`web_fetch` **預設為啟用** -- 無需額外設定。代理程式可以
立即呼叫它：

```javascript
await web_fetch({ url: "https://example.com/article" });
```

## 工具參數

| 參數          | 類型     | 描述                                  |
| ------------- | -------- | ------------------------------------- |
| `url`         | `string` | 要擷取的 URL（必填，僅限 http/https） |
| `extractMode` | `string` | `"markdown"`（預設）或 `"text"`       |
| `maxChars`    | `number` | 將輸出截斷至此字符數                  |

## 運作原理

<Steps>
  <Step title="擷取">傳送帶有類似 Chrome User-Agent 和 `Accept-Language` 標頭的 HTTP GET。封鎖私人/內部主機名稱並重新檢查重新導向。</Step>
  <Step title="提取">在 HTML 回應上執行 Readability（主要內容提取）。</Step>
  <Step title="後備（可選）">如果 Readability 失敗且已設定 Firecrawl，則透過 Firecrawl API 以繞過機器人模式重試。</Step>
  <Step title="快取">結果會被快取 15 分鐘（可設定），以減少對 相同 URL 的重複擷取。</Step>
</Steps>

## 設定

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

## Firecrawl 後備

如果 Readability 提取失敗，`web_fetch` 可以回退到
[Firecrawl](/zh-Hant/tools/firecrawl) 以繞過機器人偵測並獲得更好的提取效果：

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

<Note>如果啟用 Firecrawl 且其 SecretRef 未解析，且沒有 `FIRECRAWL_API_KEY` 環境變數作為備案，閘道啟動時會快速失敗。</Note>

<Note>Firecrawl 的 `baseUrl` 覆寫已鎖定：必須使用 `https://` 和 官方 Firecrawl 主機 (`api.firecrawl.dev`)。</Note>

目前的執行時期行為：

- `tools.web.fetch.provider` 明確選擇提取回退提供者。
- 如果省略 `provider`，OpenClaw 會從可用的憑證中自動偵測第一個就緒的 web-fetch
  提供者。目前內建的提供者是 Firecrawl。
- 如果停用 Readability，`web_fetch` 會直接跳到選定的
  提供者回退。如果沒有可用的提供者，它會以封閉式失敗處理。

## 限制與安全性

- `maxChars` 限制為 `tools.web.fetch.maxCharsCap`
- 回應主體在解析前限制為 `maxResponseBytes`；超過大小
  的回應會被截斷並顯示警告
- 私人/內部主機名稱會被封鎖
- 重新導向會受到 `maxRedirects` 檢查與限制
- `web_fetch` 為盡力而為 -- 某些網站需要 [Web Browser](/zh-Hant/tools/browser)

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

- [Web Search](/zh-Hant/tools/web) -- 使用多個提供者搜尋網路
- [Web Browser](/zh-Hant/tools/browser) -- 針對重度 JS 網站的完整瀏覽器自動化
- [Firecrawl](/zh-Hant/tools/firecrawl) -- Firecrawl 搜尋與刮取工具
