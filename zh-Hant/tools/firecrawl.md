---
summary: "Firecrawl 搜尋、抓取和 web_fetch 備援"
read_when:
  - 您想要 Firecrawl 支援的網頁提取
  - 您需要 Firecrawl API 金鑰
  - 您希望 Firecrawl 作為 web_search 提供者
  - 您想要針對 web_fetch 的反機器人提取
title: "Firecrawl"
---

# Firecrawl

OpenClaw 可以透過三種方式使用 **Firecrawl**：

- 作為 `web_search` 提供者
- 作為明確的外掛工具：`firecrawl_search` 和 `firecrawl_scrape`
- 作為 `web_fetch` 的備援提取器

這是一個支援規避機器人和快取的託管提取/搜尋服務，
這有助於處理大量使用 JS 的網站或阻擋純 HTTP 抓取的頁面。

## 取得 API 金鑰

1. 建立 Firecrawl 帳號並產生 API 金鑰。
2. 將其儲存在設定中，或在閘道環境中設定 `FIRECRAWL_API_KEY`。

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

- 在引導程序或 `openclaw configure --section web` 中選擇 Firecrawl 時，會自動啟用內建的 Firecrawl 外掛。
- 搭配 Firecrawl 的 `web_search` 支援 `query` 和 `count`。
- 若要使用 Firecrawl 專屬控制項，例如 `sources`、`categories` 或結果抓取，請使用 `firecrawl_search`。

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

- `firecrawl.enabled` 預設為 `true`，除非明確設定為 `false`。
- 僅在提供 API 金鑰時 (`tools.web.fetch.firecrawl.apiKey` 或 `FIRECRAWL_API_KEY`)，才會執行 Firecrawl 備援嘗試。
- `maxAgeMs` 控制快取結果的保留時間 (毫秒)。預設為 2 天。

`firecrawl_scrape` 重複使用相同的 `tools.web.fetch.firecrawl.*` 設定和環境變數。

## Firecrawl 外掛工具

### `firecrawl_search`

當您想要 Firecrawl 專屬的搜尋控制項，而非一般的 `web_search` 時使用此工具。

核心參數：

- `query`
- `count`
- `sources`
- `categories`
- `scrapeResults`
- `timeoutSeconds`

### `firecrawl_scrape`

如果純 `web_fetch` 效果不佳，請在 JS 含量高或有機器人防護的頁面上使用此選項。

核心參數：

- `url`
- `extractMode`
- `maxChars`
- `onlyMainContent`
- `maxAgeMs`
- `proxy`
- `storeInCache`
- `timeoutSeconds`

## 隱蔽模式 / 繞過機器人偵測

Firecrawl 提供了 **proxy mode** 參數以用於繞過機器人偵測（`basic`、`stealth` 或 `auto`）。
OpenClaw 對於 Firecrawl 請求，總是使用 `proxy: "auto"` 加上 `storeInCache: true`。
如果省略 proxy，Firecrawl 預設為 `auto`。 `auto` 會在基本嘗試失敗時使用隱蔽代理重試，這可能會比僅使用基本抓取消耗更多額度。

## `web_fetch` 如何使用 Firecrawl

`web_fetch` 提取順序：

1. Readability（本地）
2. Firecrawl（如果已設定）
3. 基本 HTML 清理（最終備案）

請參閱 [Web 工具](/zh-Hant/tools/web) 以取得完整的 Web 工具設定。

import footerZhHant from "/components/footer/zh-Hant.mdx";

<footerZhHant />
