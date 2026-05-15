---
summary: "用於 web_search 的 Brave Search API 設定"
read_when:
  - You want to use Brave Search for web_search
  - You need a BRAVE_API_KEY or plan details
title: "Brave 搜尋"
---

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
            baseUrl: "https://api.search.brave.com", // optional proxy/base URL override
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

提供者專屬的 Brave 搜尋設定現在位於 `plugins.entries.brave.config.webSearch.*` 之下。
舊版的 `tools.web.search.apiKey` 仍然會透過相容性層載入，但它已不再是標準的設定路徑。

`webSearch.mode` 控制 Brave 的傳輸方式：

- `web` (預設)：正常的 Brave 網頁搜尋，包含標題、URL 和摘要
- `llm-context`：Brave LLM Context API，包含預先擷取的文字區塊和來源以進行基礎確認

`webSearch.baseUrl` 可以將 Brave 請求指向受信任的 Brave 相容代理伺服器
或閘道。OpenClaw 會將 `/res/v1/web/search` 或 `/res/v1/llm/context` 附加到
設定的基礎 URL，並將基礎 URL 保留在快取鍵中。公開
端點必須使用 `https://`；僅針對受信任的 loopback
或私人網路代理主機才接受 `http://`。

## 工具參數

<ParamField path="query" type="string" required>
  搜尋查詢。
</ParamField>

<ParamField path="count" type="number" default="5">
  要傳回的結果數量 (1–10)。
</ParamField>

<ParamField path="country" type="string">
  兩字母 ISO 國家/地區代碼 (例如 `US`、`DE`)。
</ParamField>

<ParamField path="language" type="string">
  搜尋結果的 ISO 639-1 語言代碼 (例如 `en`、`de`、`fr`)。
</ParamField>

<ParamField path="search_lang" type="string">
  Brave 搜尋語言代碼 (例如 `en`、`en-gb`、`zh-hans`)。
</ParamField>

<ParamField path="ui_lang" type="string">
  UI 元素的 ISO 語言代碼。
</ParamField>

<ParamField path="freshness" type="'day' | 'week' | 'month' | 'year'">
  時間篩選器 — `day` 為 24 小時。
</ParamField>

<ParamField path="date_after" type="string">
  僅限此日期之後發佈的結果 (`YYYY-MM-DD`)。
</ParamField>

<ParamField path="date_before" type="string">
  僅限此日期之前發布的結果 (`YYYY-MM-DD`)。
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
- 每個 Brave 方案都包含 **每月 $5 的免費額度**（可續期）。搜尋方案每 1,000 次請求費用為 $5，因此該額度可涵蓋每月 1,000 次查詢。請在 Brave 儀表板中設定您的使用上限，以避免意外收費。請參閱 [Brave API 入口網站](https://brave.com/search/api/) 以了解目前的方案。
- 搜尋方案包含 LLM Context 端點和 AI 推理權限。若要儲存結果以訓練或調整模型，則需要具有明確儲存權限的方案。請參閱 Brave [服務條款](https://api-dashboard.search.brave.com/terms-of-service)。
- `llm-context` 模式會傳回有根據的來源條目，而不是正常的網路搜尋摘要形狀。
- `llm-context` 模式支援 `freshness` 以及有邊界的 `date_after` + `date_before` 範圍。它不支援 `ui_lang`；沒有 `date_after` 的 `date_before` 將會被拒絕，因為 Brave 要求自訂新鮮度範圍必須包含開始和結束日期。
- `ui_lang` 必須包含區域子標籤，例如 `en-US`。
- 結果預設快取 15 分鐘（可透過 `cacheTtlMinutes` 設定）。
- 自訂 `webSearch.baseUrl` 值包含在 Brave 快取識別中，因此
  特定代理的回應不會衝突。
- 啟用 `brave.http` 診斷標誌，以便在進行故障排除時記錄 Brave 請求 URL/查詢參數、回應狀態/時間，以及搜尋快取命中/未命中/寫入事件。此標誌絕不會記錄 API 金鑰或回應內容，但搜尋查詢可能具有敏感性。

## 相關

- [網路搜尋概覽](/zh-Hant/tools/web) -- 所有提供者與自動偵測
- [Perplexity 搜尋](/zh-Hant/tools/perplexity-search) -- 具有網域篩選功能的結構化結果
- [Exa 搜尋](/zh-Hant/tools/exa-search) -- 內容萃取的神經搜尋
