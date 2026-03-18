---
summary: "web_search 的 Brave Search API 設定"
read_when:
  - You want to use Brave Search for web_search
  - You need a BRAVE_API_KEY or plan details
title: "Brave Search"
---

# Brave Search API

OpenClaw 支援將 Brave Search API 作為 `web_search` 提供者。

## 取得 API 金鑰

1. 在 [https://brave.com/search/api/](https://brave.com/search/api/) 建立 Brave Search API 帳戶
2. 在儀表板中，選擇 **Search** 方案並產生 API 金鑰。
3. 將金鑰儲存在 config 中或在 Gateway 環境中設定 `BRAVE_API_KEY`。

## 設定範例

```json5
{
  tools: {
    web: {
      search: {
        provider: "brave",
        apiKey: "BRAVE_API_KEY_HERE",
        maxResults: 5,
        timeoutSeconds: 30,
      },
    },
  },
}
```

## 工具參數

| 參數          | 說明                                                   |
| ------------- | ------------------------------------------------------ |
| `query`       | 搜尋查詢（必填）                                       |
| `count`       | 要傳回的結果數量（1-10，預設值：5）                    |
| `country`     | 兩字母 ISO 國家/地區代碼（例如 "US"、"DE"）            |
| `language`    | 搜尋結果的 ISO 639-1 語言代碼（例如 "en"、"de"、"fr"） |
| `ui_lang`     | UI 元素的 ISO 語言代碼                                 |
| `freshness`   | 時間篩選：`day` (24h)、`week`、`month` 或 `year`       |
| `date_after`  | 僅包含此日期之後發佈的結果 (YYYY-MM-DD)                |
| `date_before` | 僅包含此日期之前發佈的結果 (YYYY-MM-DD)                |

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

- OpenClaw 使用 Brave 的 **Search** 方案。如果您擁有舊版訂閱（例如每月 2,000 次查詢的原始 Free 方案），該訂閱仍然有效，但不包含較新的功能，例如 LLM Context 或更高的速率限制。
- 每個 Brave 方案都包含 **每月 $5 的免費額度**（自動續期）。Search 方案每 1,000 次請求花費 $5，因此該額度可覆蓋每月 1,000 次查詢。請在 Brave 儀表板中設定您的使用量限制，以避免意外產生費用。請參閱 [Brave API portal](https://brave.com/search/api/) 以了解最新方案。
- Search 方案包含 LLM Context 端點和 AI 推理權限。儲存結果以訓練或調整模型需要具有明確儲存權限的方案。請參閱 Brave [服務條款](https://api-dashboard.search.brave.com/terms-of-service)。
- 結果預設會快取 15 分鐘（可透過 `cacheTtlMinutes` 設定）。

請參閱 [Web tools](/zh-Hant/tools/web) 以了解完整的 web_search 配置。

import footerZhHant from "/components/footer/zh-Hant.mdx";

<footerZhHant />
