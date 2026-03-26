---
summary: "Firecrawl 搜尋、抓取以及 web_fetch 後援"
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
- 作為 `web_fetch` 的後援擷取器

這是一個支援規避機器人與快取的託管擷取/搜尋服務，
這對於重度依賴 JS 的網站或阻擋純 HTTP 抓取的頁面很有幫助。

## 取得 API 金鑰

1. 建立 Firecrawl 帳號並產生 API 金鑰。
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

- 在入門引導或 `openclaw configure --section web` 中選擇 Firecrawl 會自動啟用內建的 Firecrawl 外掛。
- 使用 Firecrawl 的 `web_search` 支援 `query` 和 `count`。
- 若要使用 Firecrawl 特定的控制項，例如 `sources`、`categories` 或結果抓取，請使用 `firecrawl_search`。

## 設定 Firecrawl 抓取 + web_fetch 後援

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
- 只有在有可用的 API 金鑰時（`tools.web.fetch.firecrawl.apiKey` 或 `FIRECRAWL_API_KEY`），才會嘗試 Firecrawl 後援。
- `maxAgeMs` 控制快取結果的最長有效時間 (毫秒)。預設為 2 天。

`firecrawl_scrape` 會重複使用相同的 `tools.web.fetch.firecrawl.*` 設定和環境變數。

## Firecrawl 外掛工具

### `firecrawl_search`

當您想要使用 Firecrawl 特定的搜尋控制項，而不是通用的 `web_search` 時，請使用此工具。

核心參數：

- `query`
- `count`
- `sources`
- `categories`
- `scrapeResults`
- `timeoutSeconds`

### `firecrawl_scrape`

對於依賴大量 JS 或有 bot 防護的頁面，如果單純的 `web_fetch` 效果不佳，請使用此選項。

核心參數：

- `url`
- `extractMode`
- `maxChars`
- `onlyMainContent`
- `maxAgeMs`
- `proxy`
- `storeInCache`
- `timeoutSeconds`

## 隱身 / 繞過 bot 檢測

Firecrawl 提供了 **proxy mode** 參數用於繞過 bot 檢測（`basic`、`stealth` 或 `auto`）。
OpenClaw 在對 Firecrawl 的請求中始終使用 `proxy: "auto"` 加上 `storeInCache: true`。
如果省略 proxy，Firecrawl 預設為 `auto`。如果基本嘗試失敗，`auto` 會使用隱身代理重試，這可能比僅使用基本抓取消耗更多額度。

## `web_fetch` 如何使用 Firecrawl

`web_fetch` 提取順序：

1. Readability（本地）
2. Firecrawl（如果已設定）
3. 基本 HTML 清理（最後備選）

有關完整的網頁工具設定，請參閱 [網頁工具](/zh-Hant/tools/web)。

import footerZhHant from "/components/footer/zh-Hant.mdx";

<footerZhHant />
