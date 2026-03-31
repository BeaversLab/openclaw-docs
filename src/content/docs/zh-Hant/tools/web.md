---
title: "網路搜尋"
sidebarTitle: "網路搜尋"
summary: "web_search、x_search 和 web_fetch -- 搜尋網路、搜尋 X 帖子或擷取頁面內容"
read_when:
  - You want to enable or configure web_search
  - You want to enable or configure x_search
  - You need to choose a search provider
  - You want to understand auto-detection and provider fallback
---

# 網路搜尋

`web_search` 工具使用您設定的提供者搜尋網路並
傳回結果。結果會依查詢快取 15 分鐘（可設定）。

OpenClaw 也包含 `x_search` 用於 X（前稱 Twitter）貼文，以及
`web_fetch` 用於輕量級 URL 擷取。在此階段，`web_fetch` 保持在
本機，而 `web_search` 和 `x_search` 可在底層使用 xAI Responses。

<Info>`web_search` 是一個輕量級的 HTTP 工具，並非瀏覽器自動化工具。若 網站包含大量 JS 或需登入，請使用 [Web Browser](/en/tools/browser)。若要 擷取特定的 URL，請使用 [Web Fetch](/en/tools/web-fetch)。</Info>

## 快速入門

<Steps>
  <Step title="取得 API 金鑰">
    選擇一個供應商並取得 API 金鑰。請參閱下方的供應商頁面以
    取得註冊連結。
  </Step>
  <Step title="設定">
    ```bash
    openclaw configure --section web
    ```
    此指令會儲存金鑰並設定供應商。您也可以設定環境變數
    (例如 `BRAVE_API_KEY`) 並略過此步驟。
  </Step>
  <Step title="使用">
    Agent 現在可以呼叫 `web_search`：

    ```javascript
    await web_search({ query: "OpenClaw plugin SDK" });
    ```

    若要使用 X 帖子：

    ```javascript
    await x_search({ query: "dinner recipes" });
    ```

  </Step>
</Steps>

## 選擇供應商

<CardGroup cols={2}>
  <Card title="Brave Search" icon="shield" href="/en/tools/brave-search">
    包含摘要的結構化結果。支援 `llm-context` 模式、國家/語言篩選。提供免費層級。
  </Card>
  <Card title="DuckDuckGo" icon="bird" href="/en/tools/duckduckgo-search">
    無需金鑰的備選方案。不需要 API 金鑰。非官方的 HTML 整合。
  </Card>
  <Card title="Exa" icon="brain" href="/en/tools/exa-search">
    神經網路 + 關鍵字搜尋，具備內容擷取功能（亮點、文字、摘要）。
  </Card>
  <Card title="Firecrawl" icon="flame" href="/en/tools/firecrawl">
    結構化結果。最適合與 `firecrawl_search` 和 `firecrawl_scrape` 搭配使用以進行深度擷取。
  </Card>
  <Card title="Gemini" icon="sparkles" href="/en/tools/gemini-search">
    透過 Google Search 搜尋基礎提供附帶引用來源的 AI 綜合答案。
  </Card>
  <Card title="Grok" icon="zap" href="/en/tools/grok-search">
    透過 xAI web 搜尋基礎提供附帶引用來源的 AI 綜合答案。
  </Card>
  <Card title="Kimi" icon="moon" href="/en/tools/kimi-search">
    透過 Moonshot 網路搜尋提供附引用來源的 AI 綜合回答。
  </Card>
  <Card title="Perplexity" icon="search" href="/en/tools/perplexity-search">
    具有內容提取控制和網域過濾功能的結構化結果。
  </Card>
  <Card title="Tavily" icon="globe" href="/en/tools/tavily">
    具有搜尋深度、主題過濾和用於 URL 提取的 `tavily_extract` 的結構化結果。
  </Card>
</CardGroup>

### 供應商比較

| 供應商                                    | 結果樣式           | 篩選器                               | API 金鑰                                    |
| ----------------------------------------- | ------------------ | ------------------------------------ | ------------------------------------------- |
| [Brave](/en/tools/brave-search)           | 結構化片段         | 國家、語言、時間、`llm-context` 模式 | `BRAVE_API_KEY`                             |
| [DuckDuckGo](/en/tools/duckduckgo-search) | 結構化片段         | --                                   | 無（免密鑰）                                |
| [Exa](/en/tools/exa-search)               | 結構化 + 提取      | 神經網絡/關鍵詞模式、日期、內容提取  | `EXA_API_KEY`                               |
| [Firecrawl](/en/tools/firecrawl)          | 結構化片段         | 透過 `firecrawl_search` 工具         | `FIRECRAWL_API_KEY`                         |
| [Gemini](/en/tools/gemini-search)         | AI 綜合摘要 + 引用 | --                                   | `GEMINI_API_KEY`                            |
| [Grok](/en/tools/grok-search)             | AI 綜合摘要 + 引用 | --                                   | `XAI_API_KEY`                               |
| [Kimi](/en/tools/kimi-search)             | AI 綜合摘要 + 引用 | --                                   | `KIMI_API_KEY` / `MOONSHOT_API_KEY`         |
| [Perplexity](/en/tools/perplexity-search) | 結構化摘要         | 國家、語言、時間、網域、內容限制     | `PERPLEXITY_API_KEY` / `OPENROUTER_API_KEY` |
| [Tavily](/en/tools/tavily)                | 結構化摘要         | 透過 `tavily_search` 工具            | `TAVILY_API_KEY`                            |

## 自動偵測

文件和設定流程中的供應商列表按字母順序排列。自動偵測則維持一個
獨立的優先順序：

如果未設定 `provider`，OpenClaw 會依下列順序檢查 API 金鑰，並使用
找到的第一個：

1. **Brave** -- `BRAVE_API_KEY` 或 `plugins.entries.brave.config.webSearch.apiKey`
2. **Gemini** -- `GEMINI_API_KEY` 或 `plugins.entries.google.config.webSearch.apiKey`
3. **Grok** -- `XAI_API_KEY` 或 `plugins.entries.xai.config.webSearch.apiKey`
4. **Kimi** -- `KIMI_API_KEY` / `MOONSHOT_API_KEY` 或 `plugins.entries.moonshot.config.webSearch.apiKey`
5. **Perplexity** -- `PERPLEXITY_API_KEY` / `OPENROUTER_API_KEY` 或 `plugins.entries.perplexity.config.webSearch.apiKey`
6. **Firecrawl** -- `FIRECRAWL_API_KEY` 或 `plugins.entries.firecrawl.config.webSearch.apiKey`
7. **Tavily** -- `TAVILY_API_KEY` 或 `plugins.entries.tavily.config.webSearch.apiKey`

如果未找到金鑰，它會退回至 Brave（您將收到缺少金鑰的錯誤
提示，要求您進行設定）。

<Note>所有提供者金鑰欄位都支援 SecretRef 物件。在自動偵測模式下， OpenClaw 僅解析選定的提供者金鑰——未選定的 SecretRefs 將保持不活動狀態。</Note>

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

特定於提供者的配置（API 金鑰、基礎 URL、模式）位於
`plugins.entries.<plugin>.config.webSearch.*` 之下。請參閱提供者頁面以取得
範例。

對於 `x_search`，請直接設定 `tools.web.x_search.*`。它使用與
Grok 網路搜尋相同的 `XAI_API_KEY` 後援機制。

### 儲存 API 金鑰

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
  <Tab title="Environment variable">
    在 Gateway 程序環境中設定提供者環境變數：

    ```bash
    export BRAVE_API_KEY="YOUR_KEY"
    ```

    若為 gateway 安裝，請將其置於 `~/.openclaw/.env` 中。
    請參閱 [Env vars](/en/help/faq#env-vars-and-env-loading)。

  </Tab>
</Tabs>

## 工具參數

| 參數                  | 描述                                           |
| --------------------- | ---------------------------------------------- |
| `query`               | 搜尋查詢（必填）                               |
| `count`               | 傳回結果數 (1-10，預設：5)                     |
| `country`             | 兩字母 ISO 國家/地區代碼（例如 "US"、"DE"）    |
| `language`            | ISO 639-1 語言代碼（例如 "en"、"de"）          |
| `freshness`           | 時間篩選：`day`、`week`、`month` 或 `year`     |
| `date_after`          | 此日期之後的結果 (YYYY-MM-DD)                  |
| `date_before`         | 此日期之前的結果 (YYYY-MM-DD)                  |
| `ui_lang`             | UI 語言代碼（僅限 Brave）                      |
| `domain_filter`       | 網域允許清單/封鎖清單陣列（僅限 Perplexity）   |
| `max_tokens`          | 總內容預算，預設為 25000（僅限 Perplexity）    |
| `max_tokens_per_page` | 每頁 token 限制，預設為 2048 (僅限 Perplexity) |

<Warning>並非所有參數都適用於所有提供者。Brave `llm-context` 模式 會拒絕 `ui_lang`、`freshness`、`date_after` 和 `date_before`。 Firecrawl 和 Tavily 僅透過 `web_search` 支援 `query` 和 `count` -- 請使用其專屬工具以取得進階選項。</Warning>

## x_search

`x_search` 使用 xAI 查詢 X (前稱 Twitter) 貼文並傳回
帶有引用來源的 AI 綜合答案。它接受自然語言查詢和
選用結構化篩選器。OpenClaw 僅在服務此工具呼叫的請求上
啟用內建 xAI `x_search` 工具。

<Note>xAI 文件記載 `x_search` 支援關鍵字搜尋、語意搜尋、使用者 搜尋以及串文擷取。針對單篇貼文的互動數據（如轉發、 回覆、書籤或瀏覽次數），建議針對確切的貼文 URL 或狀態 ID 進行精確查詢。廣泛的關鍵字搜尋雖然能找到正確的貼文，但傳回的 單篇貼文詮釋資料可能較不完整。一個良好的模式是：先找出貼文，然後 執行第二個 `x_search` 查詢，專注於該確切貼文。</Note>

### x_search 設定

```json5
{
  tools: {
    web: {
      x_search: {
        enabled: true,
        apiKey: "xai-...", // optional if XAI_API_KEY is set
        model: "grok-4-1-fast-non-reasoning",
        inlineCitations: false,
        maxTurns: 2,
        timeoutSeconds: 30,
        cacheTtlMinutes: 15,
      },
    },
  },
}
```

### x_search 參數

| 參數                         | 描述                                       |
| ---------------------------- | ------------------------------------------ |
| `query`                      | 搜尋查詢（必填）                           |
| `allowed_x_handles`          | 將結果限制為特定的 X 帳號代碼              |
| `excluded_x_handles`         | 排除特定的 X 帳號代碼                      |
| `from_date`                  | 僅包含此日期或之後的貼文 (YYYY-MM-DD)      |
| `to_date`                    | 僅包含此日期（YYYY-MM-DD）當天或之前的貼文 |
| `enable_image_understanding` | 讓 xAI 檢查附加到匹配貼文的圖片            |
| `enable_video_understanding` | 讓 xAI 檢查附加到匹配貼文的影片            |

### x_search 範例

```javascript
await x_search({
  query: "dinner recipes",
  allowed_x_handles: ["nytfood"],
  from_date: "2026-03-01",
});
```

```javascript
// Per-post stats: use the exact status URL or status ID when possible
await x_search({
  query: "https://x.com/huntharo/status/1905678901234567890",
});
```

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

如果您使用工具設定檔或允許清單，請新增 `web_search`、`x_search` 或 `group:web`：

```json5
{
  tools: {
    allow: ["web_search", "x_search"],
    // or: allow: ["group:web"]  (includes web_search, x_search, and web_fetch)
  },
}
```

## 相關

- [Web Fetch](/en/tools/web-fetch) -- 取得 URL 並擷取可讀內容
- [Web Browser](/en/tools/browser) -- 針對重度 JS 網站的完整瀏覽器自動化
- [Grok Search](/en/tools/grok-search) -- Grok 作為 `web_search` 提供者
