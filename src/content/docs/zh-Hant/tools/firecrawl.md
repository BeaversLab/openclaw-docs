---
summary: "Firecrawl 搜尋、抓取以及 web_fetch 備援"
read_when:
  - You want Firecrawl-backed web extraction
  - You need a Firecrawl API key
  - You want Firecrawl as a web_search provider
  - You want anti-bot extraction for web_fetch
title: "Firecrawl"
---

# Firecrawl

OpenClaw 可以透過三種方式使用 **Firecrawl**：

- 作為 `web_search` 提供者
- 作為明確的外掛工具：`firecrawl_search` 和 `firecrawl_scrape`
- 作為 `web_fetch` 的備援擷取器

這是一個支援規避機器人和快取的託管擷取/搜尋服務，
這有助於處理重度依賴 JS 的網站或阻擋純 HTTP 請求的頁面。

## 取得 API 金鑰

1. 建立一個 Firecrawl 帳號並產生 API 金鑰。
2. 將其儲存在設定中，或在 gateway 環境中設定 `FIRECRAWL_API_KEY`。

## 設定 Firecrawl 搜尋

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

備註：

- 在入門流程或 `openclaw configure --section web` 中選擇 Firecrawl 會自動啟用捆綁的 Firecrawl 外掛。
- 搭配 Firecrawl 的 `web_search` 支援 `query` 和 `count`。
- 若要使用 Firecrawl 特定的控制項，例如 `sources`、`categories` 或結果抓取，請使用 `firecrawl_search`。

## 設定 Firecrawl 抓取 + web_fetch 備援

```json5
{
  plugins: {
    entries: {
      firecrawl: {
        enabled: true,
      },
    },
  },
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

備註：

- 除非明確設定為 `false`，否則 `firecrawl.enabled` 預設為 `true`。
- 僅在 API 金鑰可用時 (`tools.web.fetch.firecrawl.apiKey` 或 `FIRECRAWL_API_KEY`)，才會執行 Firecrawl 備援嘗試。
- `maxAgeMs` 控制快取結果的有效期限 (毫秒)。預設為 2 天。

`firecrawl_scrape` 重用相同的 `tools.web.fetch.firecrawl.*` 設定和環境變數。

## Firecrawl 外掛工具

### `firecrawl_search`

當您想要使用 Firecrawl 特定的搜尋控制項，而不是通用的 `web_search` 時，請使用此選項。

核心參數：

- `query`
- `count`
- `sources`
- `categories`
- `scrapeResults`
- `timeoutSeconds`

### `firecrawl_scrape`

適用於純 `web_fetch` 較弱的 JS 沉重或有防護機制的頁面。

核心參數：

- `url`
- `extractMode`
- `maxChars`
- `onlyMainContent`
- `maxAgeMs`
- `proxy`
- `storeInCache`
- `timeoutSeconds`

## 隱蔽 / 繞過防爬

Firecrawl 提供了 **proxy mode** 參數用於繞過防爬 (`basic`、`stealth` 或 `auto`)。
OpenClaw 在請求 Firecrawl 時總是使用 `proxy: "auto"` 加上 `storeInCache: true`。
如果省略 proxy，Firecrawl 預設為 `auto`。`auto` 會在基礎嘗試失敗時使用隱蔽代理重試，這可能比僅使用基礎爬取消耗更多的額度。

## `web_fetch` 如何使用 Firecrawl

`web_fetch` 提取順序：

1. Readability (本機)
2. Firecrawl (若已設定)
3. 基礎 HTML 清理 (最後備案)

## 相關

- [Web Search 概覽](/en/tools/web) -- 所有供應商與自動偵測
- [Web Fetch](/en/tools/web-fetch) -- web_fetch 工具與 Firecrawl 備援
- [Tavily](/en/tools/tavily) -- 搜尋與提取工具
