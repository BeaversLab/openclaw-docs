---
summary: "Firecrawl 搜尋、爬取及 web_fetch 後備"
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
- 作為明確的 plugin 工具：`firecrawl_search` 和 `firecrawl_scrape`
- 作為 `web_fetch` 的後備擷取器

這是一個託管的擷取/搜尋服務，支援繞過 bot 和快取功能，
這有助於處理重度依賴 JS 的網站或阻擋一般 HTTP 抓取的頁面。

## 取得 API 金鑰

1. 建立 Firecrawl 帳戶並產生 API 金鑰。
2. 將其儲存在設定中，或在 gateway 環境中設定 `FIRECRAWL_API_KEY`。

## 設定 Firecrawl 搜尋

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
      search: {
        provider: "firecrawl",
        firecrawl: {
          apiKey: "FIRECRAWL_API_KEY_HERE",
          baseUrl: "https://api.firecrawl.dev",
        },
      },
    },
  },
}
```

備註：

- 在入門流程或 `openclaw configure --section web` 中選擇 Firecrawl，會自動啟用隨附的 Firecrawl plugin。
- 搭配 Firecrawl 的 `web_search` 支援 `query` 和 `count`。
- 若要使用 Firecrawl 專用控制項，例如 `sources`、`categories` 或結果抓取，請使用 `firecrawl_search`。

## 設定 Firecrawl 爬取 + web_fetch 後備

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
- 僅在提供 API 金鑰時（`tools.web.fetch.firecrawl.apiKey` 或 `FIRECRAWL_API_KEY`），才會執行 Firecrawl 後備嘗試。
- `maxAgeMs` 控制快取結果的保留時間（毫秒）。預設為 2 天。

`firecrawl_scrape` 重複使用相同的 `tools.web.fetch.firecrawl.*` 設定和環境變數。

## Firecrawl plugin 工具

### `firecrawl_search`

當您需要 Firecrawl 專用的搜尋控制項而非一般 `web_search` 時，請使用此功能。

核心參數：

- `query`
- `count`
- `sources`
- `categories`
- `scrapeResults`
- `timeoutSeconds`

### `firecrawl_scrape`

這適用於重度 JS 或受機器人保護的頁面，其中普通的 `web_fetch` 效果不佳。

核心參數：

- `url`
- `extractMode`
- `maxChars`
- `onlyMainContent`
- `maxAgeMs`
- `proxy`
- `storeInCache`
- `timeoutSeconds`

## 隱身 / 繞過機器人

Firecrawl 公開了一個 **proxy mode** 參數用於繞過機器人 (`basic`、`stealth` 或 `auto`)。
OpenClaw 對 Firecrawl 請求總是使用 `proxy: "auto"` 加上 `storeInCache: true`。
如果省略 proxy，Firecrawl 預設為 `auto`。`auto` 會在基礎嘗試失敗時使用隱身代理重試，這可能會比僅進行基礎爬取消耗更多的額度。

## `web_fetch` 如何使用 Firecrawl

`web_fetch` 提取順序：

1. Readability (本地)
2. Firecrawl (如果已設定)
3. 基本 HTML 清理 (最後備案)

參閱 [Web 工具](/zh-Hant/tools/web) 以取得完整的 Web 工具設定。

import footerZhHant from "/components/footer/zh-Hant.mdx";

<footerZhHant />
