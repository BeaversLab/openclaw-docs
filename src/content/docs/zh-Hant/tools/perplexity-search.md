---
summary: "Perplexity Search API 和 Sonar/OpenRouter 的 web_search 相容性"
read_when:
  - You want to use Perplexity Search for web search
  - You need PERPLEXITY_API_KEY or OPENROUTER_API_KEY setup
title: "Perplexity 搜尋"
---

# Perplexity Search API

OpenClaw 支援將 Perplexity Search API 作為 `web_search` 提供者。
它會傳回包含 `title`、`url` 和 `snippet` 欄位的結構化結果。

為了相容性，OpenClaw 也支援舊版的 Perplexity Sonar/OpenRouter 設定。
如果您使用 `OPENROUTER_API_KEY`、`sk-or-...` 金鑰於 `plugins.entries.perplexity.config.webSearch.apiKey` 中，或是設定 `plugins.entries.perplexity.config.webSearch.baseUrl` / `model`，提供者將會切換至 chat-completions 路徑，並傳回帶有引用的 AI 合成答案，而非結構化的 Search API 結果。

## 取得 Perplexity API 金鑰

1. 在 [perplexity.ai/settings/api](https://www.perplexity.ai/settings/api) 建立 Perplexity 帳戶
2. 在儀表板中建立 API 金鑰
3. 將金鑰儲存在設定中，或在 Gateway 環境中設定 `PERPLEXITY_API_KEY`。

## OpenRouter 相容性

如果您之前已經使用 OpenRouter 來進行 Perplexity Sonar，請保留 `provider: "perplexity"` 並在 Gateway 環境中設定 `OPENROUTER_API_KEY`，或者在 `plugins.entries.perplexity.config.webSearch.apiKey` 中儲存 `sk-or-...` 金鑰。

選用的相容性控制選項：

- `plugins.entries.perplexity.config.webSearch.baseUrl`
- `plugins.entries.perplexity.config.webSearch.model`

## 設定範例

### 原生 Perplexity Search API

```json5
{
  plugins: {
    entries: {
      perplexity: {
        config: {
          webSearch: {
            apiKey: "pplx-...",
          },
        },
      },
    },
  },
  tools: {
    web: {
      search: {
        provider: "perplexity",
      },
    },
  },
}
```

### OpenRouter / Sonar 相容性

```json5
{
  plugins: {
    entries: {
      perplexity: {
        config: {
          webSearch: {
            apiKey: "<openrouter-api-key>",
            baseUrl: "https://openrouter.ai/api/v1",
            model: "perplexity/sonar-pro",
          },
        },
      },
    },
  },
  tools: {
    web: {
      search: {
        provider: "perplexity",
      },
    },
  },
}
```

## 在哪裡設定金鑰

**透過設定：** 執行 `openclaw configure --section web`。它會將金鑰儲存在
`plugins.entries.perplexity.config.webSearch.apiKey` 下的 `~/.openclaw/openclaw.json` 中。
該欄位也接受 SecretRef 物件。

**透過環境變數：** 在 Gateway 程序環境中設定 `PERPLEXITY_API_KEY` 或 `OPENROUTER_API_KEY`。
若是安裝 Gateway，請將其置於
`~/.openclaw/.env` (或您的服務環境) 中。參閱 [環境變數](/en/help/faq#env-vars-and-env-loading)。

如果已設定 `provider: "perplexity"` 且 Perplexity 金鑰 SecretRef 未解析且沒有環境變數備案，啟動/重新載入會快速失敗。

## 工具參數

這些參數適用於原生的 Perplexity Search API 路徑。

| 參數                  | 描述                                                   |
| --------------------- | ------------------------------------------------------ |
| `query`               | 搜尋查詢（必填）                                       |
| `count`               | 要傳回的結果數量（1-10，預設值：5）                    |
| `country`             | 兩字母 ISO 國家代碼（例如 "US"、"DE"）                 |
| `language`            | ISO 639-1 語言代碼（例如 "en"、"de"、"fr"）            |
| `freshness`           | 時間篩選器：`day`（24小時）、`week`、`month` 或 `year` |
| `date_after`          | 僅此日期之後發布的結果（YYYY-MM-DD）                   |
| `date_before`         | 僅此日期之前發布的結果（YYYY-MM-DD）                   |
| `domain_filter`       | 網域允許清單/拒絕清單陣列（最多 20 個）                |
| `max_tokens`          | 總內容預算（預設值：25000，最大值：1000000）           |
| `max_tokens_per_page` | 每頁 Token 限制（預設值：2048）                        |

對於舊版 Sonar/OpenRouter 相容性路徑，僅支援 `query` 和 `freshness`。
僅限 Search API 的篩選器（例如 `country`、`language`、`date_after`、`date_before`、`domain_filter`、`max_tokens` 和 `max_tokens_per_page`）會傳回明確的錯誤。

**範例：**

```javascript
// Country and language-specific search
await web_search({
  query: "renewable energy",
  country: "DE",
  language: "de",
});

// Recent results (past week)
await web_search({
  query: "AI news",
  freshness: "week",
});

// Date range search
await web_search({
  query: "AI developments",
  date_after: "2024-01-01",
  date_before: "2024-06-30",
});

// Domain filtering (allowlist)
await web_search({
  query: "climate research",
  domain_filter: ["nature.com", "science.org", ".edu"],
});

// Domain filtering (denylist - prefix with -)
await web_search({
  query: "product reviews",
  domain_filter: ["-reddit.com", "-pinterest.com"],
});

// More content extraction
await web_search({
  query: "detailed AI research",
  max_tokens: 50000,
  max_tokens_per_page: 4096,
});
```

### 網域篩選規則

- 每個篩選器最多 20 個網域
- 無法在同一個請求中混合使用允許清單和拒絕清單
- 對拒絕清單項目使用 `-` 前綴（例如 `["-reddit.com"]`）

## 注意事項

- Perplexity Search API 會傳回結構化的網頁搜尋結果（`title`、`url`、`snippet`）
- OpenRouter 或明確指定 `plugins.entries.perplexity.config.webSearch.baseUrl` / `model` 會將 Perplexity 切換回 Sonar 聊天完成模式以保持相容性
- 結果預設快取 15 分鐘（可透過 `cacheTtlMinutes` 設定）

## 相關連結

- [Web Search 概觀](/en/tools/web) -- 所有供應商與自動偵測
- [Perplexity Search API 文件](https://docs.perplexity.ai/docs/search/quickstart) -- 官方 Perplexity 文件
- [Brave Search](/en/tools/brave-search) -- 具有國家/語言過濾器的結構化結果
- [Exa Search](/en/tools/exa-search) -- 具有內容提取功能的神經搜尋
