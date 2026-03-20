---
summary: "Perplexity Search API 與 Sonar/OpenRouter 的 web_search 相容性"
read_when:
  - 您想使用 Perplexity Search 進行網路搜尋
  - 您需要 PERPLEXITY_API_KEY 或 OPENROUTER_API_KEY 設定
title: "Perplexity Search"
---

# Perplexity Search API

OpenClaw 支援將 Perplexity Search API 作為 `web_search` 提供者。
它會傳回包含 `title`、`url` 和 `snippet` 欄位的結構化結果。

為了相容性，OpenClaw 也支援舊版的 Perplexity Sonar/OpenRouter 設定。
如果您使用 `OPENROUTER_API_KEY`、在 `plugins.entries.perplexity.config.webSearch.apiKey` 中使用 `sk-or-...` 金鑰，或設定 `plugins.entries.perplexity.config.webSearch.baseUrl` / `model`，提供者將切換至 chat-completions 路徑，並傳回帶有引用的 AI 綜合回答，而非結構化的 Search API 結果。

## 取得 Perplexity API 金鑰

1. 在 [perplexity.ai/settings/api](https://www.perplexity.ai/settings/api) 建立 Perplexity 帳戶
2. 在儀表板中產生 API 金鑰
3. 將金鑰儲存在設定中，或在 Gateway 環境中設定 `PERPLEXITY_API_KEY`。

## OpenRouter 相容性

如果您已經使用 OpenRouter 來存取 Perplexity Sonar，請保留 `provider: "perplexity"` 並在 Gateway 環境中設定 `OPENROUTER_API_KEY`，或者在 `plugins.entries.perplexity.config.webSearch.apiKey` 中儲存 `sk-or-...` 金鑰。

選用的相容性控制項：

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

## 金鑰設定位置

**透過設定：** 執行 `openclaw configure --section web`。它會將金鑰儲存在
`plugins.entries.perplexity.config.webSearch.apiKey` 下的
`~/.openclaw/openclaw.json` 中。
該欄位也接受 SecretRef 物件。

**透過環境變數：** 在 Gateway 程序環境中設定 `PERPLEXITY_API_KEY` 或 `OPENROUTER_API_KEY`
。若是 gateway 安裝，請將其放在
`~/.openclaw/.env` (或您的服務環境) 中。參閱 [Env vars](/zh-Hant/help/faq#how-does-openclaw-load-environment-variables)。

如果設定了 `provider: "perplexity"` 且 Perplexity 金鑰的 SecretRef 未解析且沒有環境變數備案，啟動/重新載入會快速失敗。

## 工具參數

這些參數適用於原生的 Perplexity Search API 路徑。

| 參數             | 描述                                          |
| --------------------- | ---------------------------------------------------- |
| `query`               | 搜尋查詢（必填）                              |
| `count`               | 要返回的結果數量（1-10，預設值：5）       |
| `country`             | 兩字母 ISO 國家代碼（例如 "US"、"DE"）         |
| `language`            | ISO 639-1 語言代碼（例如 "en"、"de"、"fr"）     |
| `freshness`           | 時間過濾器：`day` (24h)、`week`、`month` 或 `year` |
| `date_after`          | 僅包含此日期之後發布的結果 (YYYY-MM-DD)  |
| `date_before`         | 僅包含此日期之前發布的結果 (YYYY-MM-DD) |
| `domain_filter`       | 網域允許清單/拒絕清單陣列（最多 20 個）             |
| `max_tokens`          | 內容總預算（預設值：25000，最大值：1000000）  |
| `max_tokens_per_page` | 每頁 token 限制（預設值：2048）                 |

對於舊版 Sonar/OpenRouter 相容性路徑，僅支援 `query` 和 `freshness`。
僅限 Search API 的過濾器（例如 `country`、`language`、`date_after`、`date_before`、`domain_filter`、`max_tokens` 和 `max_tokens_per_page`）會傳回明確的錯誤。

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

### 網域過濾器規則

- 每個過濾器最多 20 個網域
- 無法在同一個請求中混合使用允許清單和拒絕清單
- 使用 `-` 前綴表示拒絕清單項目（例如 `["-reddit.com"]`）

## 注意事項

- Perplexity Search API 會傳回結構化的網路搜尋結果（`title`、`url`、`snippet`）
- OpenRouter 或明確指定 `plugins.entries.perplexity.config.webSearch.baseUrl` / `model` 會將 Perplexity 切換回 Sonar 聊天完成以保持相容性
- 結果預設會快取 15 分鐘（可透過 `cacheTtlMinutes` 進行設定）

參閱 [Web tools](/zh-Hant/tools/web) 以取得完整的 web_search 設定。
參閱 [Perplexity Search API docs](https://docs.perplexity.ai/docs/search/quickstart) 以取得更多詳細資訊。

import en from "/components/footer/en.mdx";

<en />
