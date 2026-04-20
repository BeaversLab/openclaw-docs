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
- `baseUrl` 覆蓋設定必須保留在 `https://api.firecrawl.dev` 上。
- `FIRECRAWL_BASE_URL` 是 Firecrawl 搜尋和抓取基礎 URL 的共用環境變數後備。

## 設定 Firecrawl 抓取 + web_fetch 後備

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

- 只有在提供 API 金鑰時（`plugins.entries.firecrawl.config.webFetch.apiKey` 或 `FIRECRAWL_API_KEY`），才會執行 Firecrawl 後備嘗試。
- `maxAgeMs` 控制快取結果的有效期限（毫秒）。預設為 2 天。
- 舊版 `tools.web.fetch.firecrawl.*` 設定會由 `openclaw doctor --fix` 自動遷移。
- Firecrawl 抓取/基礎 URL 覆蓋設定僅限於 `https://api.firecrawl.dev`。

`firecrawl_scrape` 會重用相同的 `plugins.entries.firecrawl.config.webFetch.*` 設定與環境變數。

## Firecrawl 外掛工具

### `firecrawl_search`

當您想要 Firecrawl 專屬的搜尋控制項，而不是通用的 `web_search` 時使用此選項。

核心參數：

- `query`
- `count`
- `sources`
- `categories`
- `scrapeResults`
- `timeoutSeconds`

### `firecrawl_scrape`

對於一般 `web_fetch` 無法有效處理的 JS 過重或有防機器人保護的頁面，請使用此工具。

核心參數：

- `url`
- `extractMode`
- `maxChars`
- `onlyMainContent`
- `maxAgeMs`
- `proxy`
- `storeInCache`
- `timeoutSeconds`

## 隱蔽模式 / 機器人規避

Firecrawl 提供了一個用於規避機器人的 **代理模式** 參數（`basic`、`stealth` 或 `auto`）。
OpenClaw 在對 Firecrawl 發出請求時，一律使用 `proxy: "auto"` 加上 `storeInCache: true`。
如果省略代理參數，Firecrawl 預設為 `auto`。 `auto` 會在基礎嘗試失敗後使用隱蔽代理重試，這可能會比僅使用基礎抓取消耗更多額度。

## `web_fetch` 如何使用 Firecrawl

`web_fetch` 提取順序：

1. 可讀性處理（本地）
2. Firecrawl（如果已選取或自動偵測為作用中的網頁抓取後援）
3. 基本 HTML 清理（最後後援）

選擇旋鈕是 `tools.web.fetch.provider`。如果您省略它，OpenClaw
會從可用的憑證中自動偵測第一個就緒的網頁抓取提供者。
目前內建的提供者是 Firecrawl。

## 相關

- [網頁搜尋概覽](/zh-Hant/tools/web) -- 所有提供者與自動偵測
- [網頁抓取](/zh-Hant/tools/web-fetch) -- 具備 Firecrawl 後援的 web_fetch 工具
- [Tavily](/zh-Hant/tools/tavily) -- 搜尋 + 提取工具
