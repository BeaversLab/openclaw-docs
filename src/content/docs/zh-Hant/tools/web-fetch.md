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

對於重度依賴 JS 的網站或需要登入的頁面，請改用
[網頁瀏覽器](/en/tools/browser)。

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
  <Step title="擷取">使用類似 Chrome 的 User-Agent 和 `Accept-Language` 標頭發送 HTTP GET 請求。阻擋私人/內部主機名稱並重新檢查重新導向。</Step>
  <Step title="提取">對 HTML 回應執行 Readability（主要內容提取）。</Step>
  <Step title="後備 (可選)">如果 Readability 失敗且已設定 Firecrawl，則透過 Firecrawl API 以繞過機器人模式重試。</Step>
  <Step title="快取">結果會快取 15 分鐘（可設定），以減少對相同 URL 的重複擷取。</Step>
</Steps>

## 設定

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

## Firecrawl 後備

如果 Readability 提取失敗，`web_fetch` 可以退而求其次使用
[Firecrawl](/en/tools/firecrawl) 來繞過機器人偵測並獲得更好的提取效果：

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

`tools.web.fetch.firecrawl.apiKey` 支援 SecretRef 物件。

<Note>如果啟用了 Firecrawl 且其 SecretRef 未解析並且沒有 `FIRECRAWL_API_KEY` env 後備，gateway 啟動會快速失敗。</Note>

## 限制與安全性

- `maxChars` 被限制為 `tools.web.fetch.maxCharsCap`
- 回應主體在解析前上限為 `maxResponseBytes`；超過大小
  的回應會被截斷並顯示警告
- 私有/內部主機名稱被封鎖
- 重新導向會被檢查並由 `maxRedirects` 限制
- `web_fetch` 為盡力而為 -- 某些網站需要 [Web Browser](/en/tools/browser)

## 工具設定檔

如果您使用工具設定檔或允許列表，請新增 `web_fetch` 或 `group:web`：

```json5
{
  tools: {
    allow: ["web_fetch"],
    // or: allow: ["group:web"]  (includes both web_fetch and web_search)
  },
}
```

## 相關

- [Web Search](/en/tools/web) -- 使用多種提供者搜尋網路
- [Web Browser](/en/tools/browser) -- 適用於重度 JS 網站的完整瀏覽器自動化
- [Firecrawl](/en/tools/firecrawl) -- Firecrawl 搜尋和擷取工具
