---
summary: "web_search 工具 -- 使用 Brave、Firecrawl、Gemini、Grok、Kimi、Perplexity 或 Tavily 搜索網路"
read_when:
  - You want to enable or configure web_search
  - You need to choose a search provider
  - You want to understand auto-detection and provider fallback
title: "網路搜尋"
sidebarTitle: "網路搜尋"
---

# 網路搜尋

`web_search` 工具會使用您設定的供應商搜尋網路並
傳回結果。結果會依查詢快取 15 分鐘（可設定）。

<Info>`web_search` 是一個輕量級 HTTP 工具，而非瀏覽器自動化工具。對於重度依賴 JS 的網站或登入，請使用 [Web Browser](/en/tools/browser)。若要擷取特定 URL，請使用 [Web Fetch](/en/tools/web-fetch)。</Info>

## 快速開始

<Steps>
  <Step title="取得 API 金鑰">
    選擇一個供應商並取得 API 金鑰。請參閱下方的供應商頁面
    以取得註冊連結。
  </Step>
  <Step title="設定">
    ```bash
    openclaw configure --section web
    ```
    這會儲存金鑰並設定供應商。您也可以設定環境變數
    (例如 `BRAVE_API_KEY`) 並跳過此步驟。
  </Step>
  <Step title="使用它">
    Agent 現在可以呼叫 `web_search`：

    ```javascript
    await web_search({ query: "OpenClaw plugin SDK" });
    ```

  </Step>
</Steps>

## 選擇供應商

<CardGroup cols={2}>
  <Card title="Brave Search" icon="shield" href="/en/tools/brave-search">
    提供包含摘要的結構化結果。支援 `llm-context` 模式、國家/語言篩選。提供免費層級。
  </Card>
  <Card title="DuckDuckGo" icon="bird" href="/en/tools/duckduckgo-search">
    無需金鑰的後備方案。不需要 API 金鑰。非官方的 HTML 整合方式。
  </Card>
  <Card title="Exa" icon="brain" href="/en/tools/exa-search">
    神經網路 + 關鍵字搜尋，並具備內容擷取功能（重點、文字、摘要）。
  </Card>
  <Card title="Firecrawl" icon="flame" href="/en/tools/firecrawl">
    結構化結果。最適合與 `firecrawl_search` 和 `firecrawl_scrape` 搭配進行深度提取。
  </Card>
  <Card title="Gemini" icon="sparkles" href="/en/tools/gemini-search">
    透過 Google Search grounding 提供帶有引用來源的 AI 合成答案。
  </Card>
  <Card title="Grok" icon="zap" href="/en/tools/grok-search">
    透過 xAI web grounding 提供帶有引用來源的 AI 合成答案。
  </Card>
  <Card title="Kimi" icon="moon" href="/en/tools/kimi-search">
    透過 Moonshot web search 提供帶有引用來源的 AI 合成答案。
  </Card>
  <Card title="Perplexity" icon="search" href="/en/tools/perplexity-search">
    帶有內容提取控制項和網域過濾的結構化結果。
  </Card>
  <Card title="Tavily" icon="globe" href="/en/tools/tavily">
    具有搜尋深度、主題過濾功能的結構化結果，以及用於 URL 提取的 `tavily_extract`。
  </Card>
</CardGroup>

### 供應商比較

| 供應商                                    | 結果樣式           | 篩選器                               | API 金鑰                                    |
| ----------------------------------------- | ------------------ | ------------------------------------ | ------------------------------------------- |
| [Brave](/en/tools/brave-search)           | 結構化片段         | 國家、語言、時間、`llm-context` 模式 | `BRAVE_API_KEY`                             |
| [DuckDuckGo](/en/tools/duckduckgo-search) | 結構化片段         | --                                   | 無 (免金鑰)                                 |
| [Exa](/en/tools/exa-search)               | 結構化 + 提取      | 神經/關鍵字模式、日期、內容提取      | `EXA_API_KEY`                               |
| [Firecrawl](/en/tools/firecrawl)          | 結構化片段         | 透過 `firecrawl_search` 工具         | `FIRECRAWL_API_KEY`                         |
| [Gemini](/en/tools/gemini-search)         | AI 合成 + 引用來源 | --                                   | `GEMINI_API_KEY`                            |
| [Grok](/en/tools/grok-search)             | AI 合成 + 引用來源 | --                                   | `XAI_API_KEY`                               |
| [Kimi](/en/tools/kimi-search)             | AI 合成 + 引用     | --                                   | `KIMI_API_KEY` / `MOONSHOT_API_KEY`         |
| [Perplexity](/en/tools/perplexity-search) | 結構化片段         | 國家、語言、時間、網域、內容限制     | `PERPLEXITY_API_KEY` / `OPENROUTER_API_KEY` |
| [Tavily](/en/tools/tavily)                | 結構化片段         | 透過 `tavily_search` 工具            | `TAVILY_API_KEY`                            |

## 自動偵測

文件和設定流程中的供應商列表依字母順序排列。自動偵測則維持一個
不同的優先順序：

如果未設定 `provider`，OpenClaw 會依照下列順序檢查 API 金鑰，並使用
找到的第一個：

1. **Brave** -- `BRAVE_API_KEY` 或 `plugins.entries.brave.config.webSearch.apiKey`
2. **Gemini** -- `GEMINI_API_KEY` 或 `plugins.entries.google.config.webSearch.apiKey`
3. **Grok** -- `XAI_API_KEY` 或 `plugins.entries.xai.config.webSearch.apiKey`
4. **Kimi** -- `KIMI_API_KEY` / `MOONSHOT_API_KEY` 或 `plugins.entries.moonshot.config.webSearch.apiKey`
5. **Perplexity** -- `PERPLEXITY_API_KEY` / `OPENROUTER_API_KEY` 或 `plugins.entries.perplexity.config.webSearch.apiKey`
6. **Firecrawl** -- `FIRECRAWL_API_KEY` 或 `plugins.entries.firecrawl.config.webSearch.apiKey`
7. **Tavily** -- `TAVILY_API_KEY` 或 `plugins.entries.tavily.config.webSearch.apiKey`

如果找不到金鑰，它會退回到 Brave（您會收到缺少金鑰的錯誤
提示您進行設定）。

<Note>所有供應商金鑰欄位都支援 SecretRef 物件。在自動偵測模式下，OpenClaw 只會解析所選供應商的金鑰 -- 未選取的 SecretRefs 將保持非作用狀態。</Note>

## Config

```json5
{
  tools: {
    web: {
      search: {
        enabled: true, // default: true
        provider: "brave", // or omit for auto-detection
        maxResults: 5,
        timeoutSeconds: 30,
        cacheTtlMinutes: 15,
      },
    },
  },
}
```

供應商特定設定（API 金鑰、基礎 URL、模式）位於
`plugins.entries.<plugin>.config.webSearch.*` 之下。請參閱供應商頁面取得
範例。

### Storing API keys

<Tabs>
  <Tab title="Config file">
    執行 `openclaw configure --section web` 或直接設定金鑰：

    ```json5
    {
      plugins: {
        entries: {
          brave: {
            config: {
              webSearch: {
                apiKey: "YOUR_KEY", // pragma: allowlist secret
              },
            },
          },
        },
      },
    }
    ```

  </Tab>
  <Tab title="環境變數">
    在 Gateway 處理程序環境中設定提供者環境變數：

    ```bash
    export BRAVE_API_KEY="YOUR_KEY"
    ```

    對於 gateway 安裝，請將其放在 `~/.openclaw/.env` 中。
    參閱 [環境變數](/en/help/faq#env-vars-and-env-loading)。

  </Tab>
</Tabs>

## 工具參數

| 參數                  | 描述                                            |
| --------------------- | ----------------------------------------------- |
| `query`               | 搜尋查詢（必填）                                |
| `count`               | 要返回的結果數 (1-10，預設值: 5)                |
| `country`             | 兩字母 ISO 國家/地區代碼（例如 "US"、"DE"）     |
| `language`            | ISO 639-1 語言代碼（例如 "en"、"de"）           |
| `freshness`           | 時間過濾器：`day`、`week`、`month` 或 `year`    |
| `date_after`          | 此日期之後的結果 (YYYY-MM-DD)                   |
| `date_before`         | 此日期之前的結果 (YYYY-MM-DD)                   |
| `ui_lang`             | UI 語言代碼（僅限 Brave）                       |
| `domain_filter`       | 網域允許列表/阻止列表陣列（僅限 Perplexity）    |
| `max_tokens`          | 總內容預算，預設值 25000（僅限 Perplexity）     |
| `max_tokens_per_page` | 每頁 token 限制，預設值 2048（僅限 Perplexity） |

<Warning>並非所有參數都適用於所有提供者。Brave `llm-context` 模式拒絕 `ui_lang`、`freshness`、`date_after` 和 `date_before`。Firecrawl 和 Tavily 僅透過 `web_search` 支援 `query` 和 `count` -- 請使用其專屬工具以取得進階選項。</Warning>

## 範例

```javascript
// Basic search
await web_search({ query: "OpenClaw plugin SDK" });

// German-specific search
await web_search({ query: "TV online schauen", country: "DE", language: "de" });

// Recent results (past week)
await web_search({ query: "AI developments", freshness: "week" });

// Date range
await web_search({
  query: "climate research",
  date_after: "2024-01-01",
  date_before: "2024-06-30",
});

// Domain filtering (Perplexity only)
await web_search({
  query: "product reviews",
  domain_filter: ["-reddit.com", "-pinterest.com"],
});
```

## 工具設定檔

如果您使用工具設定檔或允許列表，請新增 `web_search` 或 `group:web`：

```json5
{
  tools: {
    allow: ["web_search"],
    // or: allow: ["group:web"]  (includes both web_search and web_fetch)
  },
}
```

## 相關

- [Web Fetch](/en/tools/web-fetch) -- 擷取 URL 並提取可讀內容
- [Web Browser](/en/tools/browser) -- 針對 JS 繁重網站的完整瀏覽器自動化
