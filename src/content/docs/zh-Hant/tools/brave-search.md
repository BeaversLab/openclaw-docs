---
summary: "用於 web_search 的 Brave Search API 設定"
read_when:
  - You want to use Brave Search for web_search
  - You need a BRAVE_API_KEY or plan details
title: "Brave 搜尋"
---

# Brave Search API

OpenClaw 支援將 Brave Search API 作為 `web_search` 提供者。

## 取得 API 金鑰

1. 在 [https://brave.com/search/api/](https://brave.com/search/api/) 建立 Brave Search API 帳戶
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

提供者特定的 Brave 搜尋設定現位於 `plugins.entries.brave.config.webSearch.*` 下方。
舊版 `tools.web.search.apiKey` 仍可透過相容性 shim 載入，但這不再是標準的設定路徑。

`webSearch.mode` 控制 Brave 傳輸：

- `web` (預設)：標準的 Brave 網頁搜尋，包含標題、網址和片段
- `llm-context`：Brave LLM Context API，包含預先提取的文字區塊和用於基礎資訊的來源

## 工具參數

<ParamField path="query" type="string" required>
  搜尋查詢。
</ParamField>

<ParamField path="count" type="number" default="5">
  要傳回的結果數量 (1–10)。
</ParamField>

<ParamField path="country" type="string">
  兩字母 ISO 國家代碼 (例如 `US`, `DE`)。
</ParamField>

<ParamField path="language" type="string">
  搜尋結果的 ISO 639-1 語言代碼 (例如 `en`, `de`, `fr`)。
</ParamField>

<ParamField path="search_lang" type="string">
  Brave 搜尋語言代碼 (例如 `en`, `en-gb`, `zh-hans`)。
</ParamField>

<ParamField path="ui_lang" type="string">
  UI 元素的 ISO 語言代碼。
</ParamField>

<ParamField path="freshness" type="'day' | 'week' | 'month' | 'year'">
  時間篩選器 — `day` 為 24 小時。
</ParamField>

<ParamField path="date_after" type="string">
  僅此日期之後發布的結果 (`YYYY-MM-DD`)。
</ParamField>

<ParamField path="date_before" type="string">
  僅顯示此日期之前發布的結果 (`YYYY-MM-DD`)。
</ParamField>

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

- OpenClaw 使用 Brave 的 **Search** 方案。如果您擁有舊版訂閱（例如每月 2,000 次查詢的原始 Free 方案），該訂閱仍然有效，但不包含較新的功能，例如 LLM Context 或更高的速率限制。
- 每個 Brave 方案都包含 **每月 $5 的免費額度**（會更新）。Search 方案每 1,000 次請求費用為 $5，因此免費額度可涵蓋每月 1,000 次查詢。請在 Brave 儀表板中設定您的使用量上限，以避免意外收費。請參閱 [Brave API portal](https://brave.com/search/api/) 以了解最新方案。
- Search 方案包含 LLM Context 端點和 AI 推斷權限。儲存結果以訓練或調整模型需要具有明確儲存權限的方案。請參閱 Brave [服務條款](https://api-dashboard.search.brave.com/terms-of-service)。
- `llm-context` 模式會傳回來源基礎項目，而非一般的網頁搜尋摘要格式。
- `llm-context` 模式不支援 `ui_lang`、`freshness`、`date_after` 或 `date_before`。
- `ui_lang` 必須包含區域子標籤，例如 `en-US`。
- 結果預設會快取 15 分鐘（可透過 `cacheTtlMinutes` 設定）。

## 相關

- [Web Search overview](/zh-Hant/tools/web) -- 所有提供者及自動偵測
- [Perplexity Search](/zh-Hant/tools/perplexity-search) -- 具有網域過濾功能的結構化結果
- [Exa Search](/zh-Hant/tools/exa-search) -- 具有內容提取功能的神經搜尋
