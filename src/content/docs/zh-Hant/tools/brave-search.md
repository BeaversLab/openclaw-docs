---
summary: "用於 web_search 的 Brave Search API 設定"
read_when:
  - You want to use Brave Search for web_search
  - You need a BRAVE_API_KEY or plan details
title: "Brave Search"
---

# Brave Search API

OpenClaw 支援 Brave Search API 作為 `web_search` 提供者。

## 取得 API 金鑰

1. 在 [https://brave.com/search/api/](https://brave.com/search/api/) 建立 Brave Search API 帳號
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
            mode: "web", // or "llm-context"
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

特定提供者的 Brave 搜尋設定現已位於 `plugins.entries.brave.config.webSearch.*` 之下。
舊版的 `tools.web.search.apiKey` 仍透過相容性 shim 載入，但它不再是標準的設定路徑。

`webSearch.mode` 控制 Brave 傳輸方式：

- `web` (預設)：標準的 Brave 網頁搜尋，包含標題、URL 和摘要
- `llm-context`：Brave LLM Context API，提供預先提取的文字區塊和來源以供基礎參考

## 工具參數

| 參數          | 描述                                                  |
| ------------- | ----------------------------------------------------- |
| `query`       | 搜尋查詢 (必填)                                       |
| `count`       | 要傳回的結果數量 (1-10，預設：5)                      |
| `country`     | 兩字母 ISO 國家/地區代碼 (例如 "US"、"DE")            |
| `language`    | 搜尋結果的 ISO 639-1 語言代碼 (例如 "en"、"de"、"fr") |
| `search_lang` | Brave 搜尋語言代碼 (例如 `en`、`en-gb`、`zh-hans`)    |
| `ui_lang`     | UI 元素的 ISO 語言代碼                                |
| `freshness`   | 時間篩選器：`day` (24小時)、`week`、`month` 或 `year` |
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

## 備註

- OpenClaw 使用 Brave **Search** 方案。如果您擁有舊版訂閱 (例如原本每月 2,000 次查詢的 Free 方案)，該訂閱仍然有效，但不包含較新的功能，如 LLM Context 或更高的速率限制。
- 每個 Brave 方案都包含 **每月 $5 的免費額度** (會自動更新)。Search 方案每 1,000 次請求費用為 $5，因此該額度可涵蓋每月 1,000 次查詢。請在 Brave 儀表板中設定您的使用上限，以避免意外收費。請參閱 [Brave API 入口網站](https://brave.com/search/api/) 以了解目前方案。
- Search 方案包含 LLM Context 端點和 AI 推斷權限。儲存結果以訓練或微調模型需要具有明確儲存權限的方案。請參閱 Brave [服務條款](https://api-dashboard.search.brave.com/terms-of-service)。
- `llm-context` 模式會傳回基礎來源條目，而不是標準網頁搜尋摘要的格式。
- `llm-context` 模式不支援 `ui_lang`、`freshness`、`date_after` 或 `date_before`。
- `ui_lang` 必須包含區域子標籤，例如 `en-US`。
- 結果預設快取 15 分鐘（可透過 `cacheTtlMinutes` 設定）。

## 相關

- [網頁搜尋概覽](/zh-Hant/tools/web) -- 所有提供者和自動偵測
- [Perplexity 搜尋](/zh-Hant/tools/perplexity-search) -- 具備網域篩選功能的結構化結果
- [Exa 搜尋](/zh-Hant/tools/exa-search) -- 具備內容擷取功能的神經搜尋
