---
summary: "Tavily 搜尋和擷取工具"
read_when:
  - You want Tavily-backed web search
  - You need a Tavily API key
  - You want Tavily as a web_search provider
  - You want content extraction from URLs
title: "Tavily"
---

OpenClaw 可以透過兩種方式使用 **Tavily**：

- 作為 `web_search` 提供者
- 作為明確的外掛工具：`tavily_search` 和 `tavily_extract`

Tavily 是專為 AI 應用程式設計的搜尋 API，能回傳針對 LLM 消費優化的結構化結果。它支援可配置的搜尋深度、主題過濾、網域過濾、AI 生成的答案摘要，以及從 URL 提取內容（包括 JavaScript 渲染的頁面）。

## 取得 API 金鑰

1. 在 [tavily.com](https://tavily.com/) 建立 Tavily 帳號。
2. 在儀表板中生成 API 金鑰。
3. 將其儲存在設定中，或在 Gateway 環境中設定 `TAVILY_API_KEY`。

## 配置 Tavily 搜尋

```json5
{
  plugins: {
    entries: {
      tavily: {
        enabled: true,
        config: {
          webSearch: {
            apiKey: "tvly-...", // optional if TAVILY_API_KEY is set
            baseUrl: "https://api.tavily.com",
          },
        },
      },
    },
  },
  tools: {
    web: {
      search: {
        provider: "tavily",
      },
    },
  },
}
```

備註：

- 在入門流程或 `openclaw configure --section web` 中選擇 Tavily 會
  自動啟用內建的 Tavily 外掛。
- 將 Tavily 設定儲存在 `plugins.entries.tavily.config.webSearch.*` 下。
- 使用 Tavily 的 `web_search` 支援 `query` 和 `count`（最多 20 個結果）。
- 若要使用 Tavily 特定的控制項，例如 `search_depth`、`topic`、`include_answer`
  或網域過濾器，請使用 `tavily_search`。

## Tavily 外掛工具

### `tavily_search`

當您想要使用 Tavily 特定的搜尋控制項，而非通用的
`web_search` 時，請使用此工具。

| 參數              | 描述                                                   |
| ----------------- | ------------------------------------------------------ |
| `query`           | 搜尋查詢字串（保持在 400 個字元以內）                  |
| `search_depth`    | `basic`（預設，平衡）或 `advanced`（最高相關性，較慢） |
| `topic`           | `general`（預設）、`news`（即時更新）或 `finance`      |
| `max_results`     | 結果數量，1-20（預設值：5）                            |
| `include_answer`  | 包含 AI 生成的答案摘要（預設值：false）                |
| `time_range`      | 依新近程度過濾：`day`、`week`、`month` 或 `year`       |
| `include_domains` | 限制結果的網域陣列                                     |
| `exclude_domains` | 從結果中排除的網域陣列                                 |

**搜尋深度：**

| 深度       | 速度 | 相關性 | 最適用於               |
| ---------- | ---- | ------ | ---------------------- |
| `basic`    | 較快 | 高     | 一般用途查詢（預設）   |
| `advanced` | 較慢 | 最高   | 精確度、特定事實、研究 |

### `tavily_extract`

使用此工具從一或多個 URL 提取乾淨的內容。處理 JavaScript 渲染的頁面，並支援針對性提取的查詢導向分塊。

| 參數                | 說明                                                   |
| ------------------- | ------------------------------------------------------ |
| `urls`              | 要提取的 URL 陣列（每個請求 1-20 個）                  |
| `query`             | 根據與此查詢的相關性重新排序提取的分塊                 |
| `extract_depth`     | `basic`（預設，快速）或 `advanced`（針對重度 JS 頁面） |
| `chunks_per_source` | 每個 URL 的分塊數，1-5（需要 `query`）                 |
| `include_images`    | 在結果中包含圖片 URL（預設：false）                    |

**提取深度：**

| 深度       | 使用時機                      |
| ---------- | ----------------------------- |
| `basic`    | 簡單頁面 - 先嘗試此選項       |
| `advanced` | JS 渲染的 SPA、動態內容、表格 |

提示：

- 每個請求最多 20 個 URL。將較大的清單分批處理為多次呼叫。
- 使用 `query` + `chunks_per_source` 僅獲取相關內容，而非完整頁面。
- 先嘗試 `basic`；如果內容遺失或不完整，則改用 `advanced`。

## 選擇正確的工具

| 需求                     | 工具             |
| ------------------------ | ---------------- |
| 快速網路搜尋，無特殊選項 | `web_search`     |
| 深度搜尋、主題、AI 回答  | `tavily_search`  |
| 從特定 URL 提取內容      | `tavily_extract` |

## 相關

- [網路搜尋概覽](/zh-Hant/tools/web) -- 所有提供者與自動偵測
- [Firecrawl](/zh-Hant/tools/firecrawl) -- 搜尋 + 抓取與內容提取
- [Exa Search](/zh-Hant/tools/exa-search) -- 具有內容提取的神經搜尋
