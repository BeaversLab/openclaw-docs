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
- `baseUrl` 預設使用位於 `https://api.firecrawl.dev` 的託管 Firecrawl。僅允許針對私有/內部端點進行自託管覆寫；僅針對這些私有目標接受 HTTP。
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
- Firecrawl 抓取/基礎 URL 覆寫遵循與搜尋相同的託管/私有規則：公開託管流量使用 `https://api.firecrawl.dev`；自託管覆寫必須解析為私有/內部端點。
- `firecrawl_scrape` 會在將明顯的私有、回環、中繼資料和非 HTTP(S) 目標 URL 轉發至 Firecrawl 之前將其拒絕，這與顯式 Firecrawl 抓取呼叫的 `web_fetch` 目標安全合約相符。

`firecrawl_scrape` 會重複使用相同的 `plugins.entries.firecrawl.config.webFetch.*` 設定和環境變數。

### 自託管 Firecrawl

當您自行執行 Firecrawl 時，請設定 `plugins.entries.firecrawl.config.webSearch.baseUrl`、
`plugins.entries.firecrawl.config.webFetch.baseUrl` 或 `FIRECRAWL_BASE_URL`。
OpenClaw 僅針對回環、
私有網路、`.local`、`.internal` 或 `.localhost` 目標接受 `http://`。會拒絕公開的自訂
主機，以免 Firecrawl API 金鑰被意外
傳送至任意端點。

## Firecrawl 外掛工具

### `firecrawl_search`

當您想要 Firecrawl 特定的搜尋控制項，而非通用的 `web_search` 時，請使用此項。

核心參數：

- `query`
- `count`
- `sources`
- `categories`
- `scrapeResults`
- `timeoutSeconds`

### `firecrawl_scrape`

當純粹的 `web_fetch` 效果不佳時，請針對重度依賴 JS 或受到機器人保護的頁面使用此項。

核心參數：

- `url`
- `extractMode`
- `maxChars`
- `onlyMainContent`
- `maxAgeMs`
- `proxy`
- `storeInCache`
- `timeoutSeconds`

## 隱身 / 規避機器人

Firecrawl 提供了一個用於繞過機器人的**代理模式**參數（`basic`、`stealth` 或 `auto`）。
OpenClaw 對 Firecrawl 請求始終使用 `proxy: "auto"` 加上 `storeInCache: true`。
如果省略 proxy，Firecrawl 預設為 `auto`。如果基礎嘗試失敗，`auto` 會使用隱蔽代理重試，這可能會比僅使用基礎抓取消耗更多額度。

## `web_fetch` 如何使用 Firecrawl

`web_fetch` 擷取順序：

1. Readability（本地）
2. Firecrawl（如果已選取或自動偵測為啟用的 web-fetch 備援）
3. 基本 HTML 清理（最後備援）

選擇控制項是 `tools.web.fetch.provider`。如果您省略它，OpenClaw 會從可用的憑證中自動偵測第一個就緒的 web-fetch 提供者。
目前內建的提供者是 Firecrawl。

## 相關

- [Web Search 概觀](/zh-Hant/tools/web) -- 所有提供者與自動偵測
- [Web Fetch](/zh-Hant/tools/web-fetch) -- 具有 Firecrawl 備援的 web_fetch 工具
- [Tavily](/zh-Hant/tools/tavily) -- 搜尋 + 擷取工具
