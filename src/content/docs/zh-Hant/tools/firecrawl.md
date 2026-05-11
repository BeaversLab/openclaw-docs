---
summary: "Firecrawl 搜尋、抓取以及 web_fetch 備援"
read_when:
  - You want Firecrawl-backed web extraction
  - You need a Firecrawl API key
  - You want Firecrawl as a web_search provider
  - You want anti-bot extraction for web_fetch
title: "Firecrawl"
---

OpenClaw 可以透過三種方式使用 **Firecrawl**：

- 作為 `web_search` 提供者
- 作為明確的外掛工具：`firecrawl_search` 和 `firecrawl_scrape`
- 作為 `web_fetch` 的備用擷取器

這是一個託管的擷取/搜尋服務，支援規避機器人和快取功能，這有助於處理重度依賴 JS 的網站或阻擋純 HTTP 抓取的頁面。

## 取得 API 金鑰

1. 建立一個 Firecrawl 帳戶並產生 API 金鑰。
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

- 在入門流程或 `openclaw configure --section web` 中選擇 Firecrawl 時，會自動啟用捆綁的 Firecrawl 外掛。
- 搭配 Firecrawl 的 `web_search` 支援 `query` 和 `count`。
- 若要使用 Firecrawl 特定控制項，例如 `sources`、`categories` 或結果抓取，請使用 `firecrawl_search`。
- `baseUrl` 覆寫必須保持在 `https://api.firecrawl.dev` 上。
- `FIRECRAWL_BASE_URL` 是 Firecrawl 搜尋和抓取基礎 URL 的共用環境變數備用值。

## 設定 Firecrawl 抓取 + web_fetch 備用

```json5
{
  plugins: {
    entries: {
      firecrawl: {
        enabled: true,
        config: {
          webFetch: {
            apiKey: "FIRECRAWL_API_KEY_HERE",
            baseUrl: "https://api.firecrawl.dev",
            onlyMainContent: true,
            maxAgeMs: 172800000,
            timeoutSeconds: 60,
          },
        },
      },
    },
  },
}
```

備註：

- 僅在可使用 API 金鑰時（`plugins.entries.firecrawl.config.webFetch.apiKey` 或 `FIRECRAWL_API_KEY`），才會執行 Firecrawl 備用嘗試。
- `maxAgeMs` 控制快取結果的有效期限 (毫秒)。預設為 2 天。
- 舊版的 `tools.web.fetch.firecrawl.*` 設定會由 `openclaw doctor --fix` 自動遷移。
- Firecrawl 抓取/基礎 URL 覆寫僅限於 `https://api.firecrawl.dev`。

`firecrawl_scrape` 會重複使用相同的 `plugins.entries.firecrawl.config.webFetch.*` 設定和環境變數。

## Firecrawl 外掛工具

### `firecrawl_search`

當您想要使用 Firecrawl 特定的搜尋控制項，而非通用的 `web_search` 時，請使用此選項。

核心參數：

- `query`
- `count`
- `sources`
- `categories`
- `scrapeResults`
- `timeoutSeconds`

### `firecrawl_scrape`

使用此功能處理重度 JS 或有保護機制的網頁，此時純粹的 `web_fetch` 效果較弱。

核心參數：

- `url`
- `extractMode`
- `maxChars`
- `onlyMainContent`
- `maxAgeMs`
- `proxy`
- `storeInCache`
- `timeoutSeconds`

## 隱蔽 / 繞過機器人

Firecrawl 提供了一個用於繞過機器人的 **proxy mode** 參數 (`basic`、`stealth` 或 `auto`)。
OpenClaw 對 Firecrawl 請求始終使用 `proxy: "auto"` 加上 `storeInCache: true`。
如果省略 proxy，Firecrawl 預設為 `auto`。`auto` 會在基礎嘗試失敗後使用隱蔽代理重試，這可能比僅使用基礎抓取消耗更多額度。

## `web_fetch` 如何使用 Firecrawl

`web_fetch` 擷取順序：

1. Readability (本地)
2. Firecrawl (如果選取或自動偵測為啟用的 web-fetch 備援)
3. 基本 HTML 清理 (最後備援)

選擇控制項是 `tools.web.fetch.provider`。如果您省略它，OpenClaw
會從可用的憑證中自動偵測第一個就緒的 web-fetch 提供者。
目前內建的提供者是 Firecrawl。

## 相關

- [Web Search 概述](/zh-Hant/tools/web) -- 所有提供者與自動偵測
- [Web Fetch](/zh-Hant/tools/web-fetch) -- 具 Firecrawl 備援的 web_fetch 工具
- [Tavily](/zh-Hant/tools/tavily) -- 搜尋與擷取工具
