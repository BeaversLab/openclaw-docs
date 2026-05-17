---
summary: "Tavily 搜尋和擷取工具"
read_when:
  - You want Tavily-backed web search
  - You need a Tavily API key
  - You want Tavily as a web_search provider
  - You want content extraction from URLs
title: "Tavily"
---

[Tavily](https://tavily.com) 是一個專為 AI 應用程式設計的搜尋 API。OpenClaw 以兩種方式提供它：

- 作為通用搜尋工具的 `web_search` 提供者
- 作為明確的外掛工具：`tavily_search` 和 `tavily_extract`

Tavily 傳回針對 LLM 使用優化的結構化結果，具備可設定的搜尋深度、主題過濾、網域過濾、AI 生成的答案摘要，以及從 URL 提取內容（包括 JavaScript 呈現的頁面）等功能。

| 屬性     | 值                                |
| -------- | --------------------------------- |
| 外掛 ID  | `tavily`                          |
| 驗證     | `TAVILY_API_KEY` 或設定 `apiKey`  |
| 基礎 URL | `https://api.tavily.com` (預設)   |
| 內建工具 | `tavily_search`, `tavily_extract` |

## 開始使用

<Steps>
  <Step title="取得 API 金鑰">
    在 [tavily.com](https://tavily.com) 建立 Tavily 帳戶，然後在儀表板中生成 API 金鑰。
  </Step>
  <Step title="設定外掛與提供者">
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
  </Step>
  <Step title="驗證搜尋執行">
    從任何代理程式觸發 `web_search`，或直接呼叫 `tavily_search`。
  </Step>
</Steps>

<Tip>在引導流程或 `openclaw configure --section web` 中選擇 Tavily 會自動啟用內建的 Tavily 外掛。</Tip>

## 工具參考

### `tavily_search`

當您想要 Tavily 專屬的搜尋控制而非通用 `web_search` 時使用此工具。

| 參數              | 類型     | 限制 / 預設值                       | 說明                                    |
| ----------------- | -------- | ----------------------------------- | --------------------------------------- |
| `query`           | 字串     | 必要                                | 搜尋查詢字串。請保持在 400 個字元以內。 |
| `search_depth`    | 列舉     | `basic` (預設), `advanced`          | `advanced` 較慢但相關性較高。           |
| `topic`           | 列舉     | `general` (預設), `news`, `finance` | 依主題類別過濾。                        |
| `max_results`     | 整數     | 1-20                                | 結果數量。                              |
| `include_answer`  | 布林值   | 預設值 `false`                      | 包含 Tavily AI 生成的答案摘要。         |
| `time_range`      | 列舉     | `day`, `week`, `month`, `year`      | 根據新近程度篩選結果。                  |
| `include_domains` | 字串陣列 | (無)                                | 僅包含來自這些網域的結果。              |
| `exclude_domains` | 字串陣列 | (無)                                | 排除來自這些網域的結果。                |

搜尋深度取捨：

| 深度       | 速度 | 相關性 | 最適用於               |
| ---------- | ---- | ------ | ---------------------- |
| `basic`    | 較快 | 高     | 一般用途查詢（預設）。 |
| `advanced` | 較慢 | 最高   | 精準研究與事實查核。   |

### `tavily_extract`

使用此項從一或多個 URL 提取乾淨內容。處理 JavaScript 渲染的頁面，並支援針對查詢的分塊以進行目標提取。

| 參數                | 類型     | 限制 / 預設值                | 描述                                                               |
| ------------------- | -------- | ---------------------------- | ------------------------------------------------------------------ |
| `urls`              | 字串陣列 | 必填，1-20                   | 要擷取內容的 URL。                                                 |
| `query`             | 字串     | （選用）                     | 根據與此查詢的相關性重新排列提取的區塊。                           |
| `extract_depth`     | 列舉     | `basic` (預設值), `advanced` | 針對重度 JS 頁面、SPA 或動態表格使用 `advanced`。                  |
| `chunks_per_source` | 整數     | 1-5; **需要 `query`**        | 每個 URL 傳回的區塊數。若在未設定 `query` 的情況下設定會發生錯誤。 |
| `include_images`    | 布林值   | 預設值 `false`               | 在結果中包含圖片 URL。                                             |

提取深度取捨：

| 深度       | 使用時機                        |
| ---------- | ------------------------------- |
| `basic`    | 簡單頁面。請先嘗試此選項。      |
| `advanced` | JS 渲染的 SPA、動態內容、表格。 |

<Tip>將較大的 URL 清單批次處理為多個 `tavily_extract` 呼叫（每個請求最多 20 個）。使用 `query` 加上 `chunks_per_source` 來取得僅相關的內容，而非完整頁面。</Tip>

## 選擇正確的工具

| 需求                               | 工具             |
| ---------------------------------- | ---------------- |
| 快速網路搜尋，無特殊選項           | `web_search`     |
| 進行具備深度、主題和 AI 回答的搜尋 | `tavily_search`  |
| 從特定 URL 提取內容                | `tavily_extract` |

<Note>以 Tavily 作為提供者的通用 `web_search` 工具支援 `query` 和 `count`（最多 20 個結果）。若要使用 Tavily 專屬的控制項（`search_depth`、`topic`、`include_answer`、網域過濾器、時間範圍），請改用 `tavily_search`。</Note>

## 進階設定

<AccordionGroup>
  <Accordion title="API 金鑰解析順序">
    Tavily 用戶端會依照以下順序查閱其 API 金鑰：

    1. `plugins.entries.tavily.config.webSearch.apiKey`（透過 SecretRefs 解析）。
    2. 從 gateway 環境取得的 `TAVILY_API_KEY`。

    如果兩者都不存在，`tavily_extract` 會引發設定錯誤。

  </Accordion>

<Accordion title="自訂基礎 URL">如果您透過代理存取 Tavily，請覆寫 `plugins.entries.tavily.config.webSearch.baseUrl`。預設值為 `https://api.tavily.com`。</Accordion>

  <Accordion title="`chunks_per_source` 需要 `query`">
    如果沒有 `query`，`tavily_extract` 會拒絕傳遞了 `chunks_per_source` 的呼叫。Tavily 會根據查詢相關性對區塊進行排名，因此如果沒有查詢，該參數就毫無意義。
  </Accordion>
</AccordionGroup>

## 相關

<CardGroup cols={2}>
  <Card title="Web Search 概覽" href="/zh-Hant/tools/web" icon="magnifying-glass">
    所有提供者和自動偵測規則。
  </Card>
  <Card title="Firecrawl" href="/zh-Hant/tools/firecrawl" icon="fire">
    結合搜尋與爬蟲的內容提取。
  </Card>
  <Card title="Exa Search" href="/zh-Hant/tools/exa-search" icon="binoculars">
    具有內容提取功能的神經搜尋。
  </Card>
  <Card title="Configuration" href="/zh-Hant/gateway/configuration" icon="gear">
    外掛條目和工具路由的完整配置架構。
  </Card>
</CardGroup>
