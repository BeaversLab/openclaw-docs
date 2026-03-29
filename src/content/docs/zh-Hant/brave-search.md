---
summary: "Brave Search API 設定用於 web_search"
read_when:
  - You want to use Brave Search for web_search
  - You need a BRAVE_API_KEY or plan details
title: "Brave Search (舊版路徑)"
---

# Brave Search API

OpenClaw 支援將 Brave Search API 作為 `web_search` 提供者。

## 取得 API 金鑰

1. 在 [https://brave.com/search/api/](https://brave.com/search/api/ 建立 Brave Search API 帳戶
2. 在儀表板中，選擇 **Search** 方案並產生 API 金鑰。
3. 將金鑰儲存在設定中，或在 Gateway 環境中設定 `BRAVE_API_KEY`。

## 設定範例

```json5
{
  plugins: {
    entries: {
      brave: {
        config: {
          webSearch: {
            apiKey: "BRAVE_API_KEY_HERE",
          },
        },
      },
    },
  },
  tools: {
    web: {
      search: {
        provider: "brave",
        maxResults: 5,
        timeoutSeconds: 30,
      },
    },
  },
}
```

特定提供者的 Brave 搜尋設定現已位於 `plugins.entries.brave.config.webSearch.*` 下。
舊版 `tools.web.search.apiKey` 仍可透過相容性 shim 載入，但它不再是標準的設定路徑。

## 工具參數

| 參數          | 描述                                                  |
| ------------- | ----------------------------------------------------- |
| `query`       | 搜尋查詢 (必填)                                       |
| `count`       | 要傳回的結果數量 (1-10，預設值：5)                    |
| `country`     | 兩字母 ISO 國家/地區代碼 (例如 "US"、"DE")            |
| `language`    | 搜尋結果的 ISO 639-1 語言代碼 (例如 "en"、"de"、"fr") |
| `ui_lang`     | UI 元素的 ISO 語言代碼                                |
| `freshness`   | 時間篩選器：`day` (24h)、`week`、`month` 或 `year`    |
| `date_after`  | 僅限此日期之後發布的結果 (YYYY-MM-DD)                 |
| `date_before` | 僅限此日期之前發布的結果 (YYYY-MM-DD)                 |

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
```

## 注意事項

- OpenClaw 使用 Brave **Search** 方案。如果您擁有舊版訂閱 (例如每月 2,000 次查詢的原始 Free 方案)，它仍然有效，但不包括 LLM Context 或更高速率限制等較新的功能。
- 每個 Brave 方案都包含 **每月 5 美元的免費額度** (會更新)。Search 方案每 1,000 次請求花費 5 美元，因此免費額度涵蓋每月 1,000 次查詢。在 Brave 儀表板中設定您的使用量限制，以避免意外收費。請參閱 [Brave API 入口網站](https://brave.com/search/api/) 以了解目前方案。
- Search 方案包含 LLM Context 端點和 AI 推斷權限。若要儲存結果以訓練或調整模型，則需要具備明確儲存權限的方案。請參閱 Brave [服務條款](https://api-dashboard.search.brave.com/terms-of-service)。
- 結果預設會快取 15 分鐘（可透過 `cacheTtlMinutes` 進行設定）。

請參閱 [Web 工具](/en/tools/web) 以取得完整的 web_search 設定。
