---
title: "網路搜尋"
sidebarTitle: "網路搜尋"
summary: "web_search、x_search 和 web_fetch —— 搜尋網路、搜尋 X 貼文或擷取頁面內容"
read_when:
  - You want to enable or configure web_search
  - You want to enable or configure x_search
  - You need to choose a search provider
  - You want to understand auto-detection and provider fallback
---

# 網路搜尋

`web_search` 工具使用您設定的供應商搜尋網路並
傳回結果。結果會依查詢快取 15 分鐘（可設定）。

OpenClaw 也包含用於 X（前稱 Twitter）貼文的 `x_search` 和
用於輕量級 URL 擷取的 `web_fetch`。在此階段，`web_fetch` 保持
本機運作，而 `web_search` 和 `x_search` 則可以在底層使用 xAI Responses。

<Info>`web_search` 是一個輕量級 HTTP 工具，而非瀏覽器自動化工具。若為 重 JS 網站或需登入，請使用 [Web Browser](/zh-Hant/tools/browser)。若要 擷取特定 URL，請使用 [Web Fetch](/zh-Hant/tools/web-fetch)。</Info>

## 快速入門

<Steps>
  <Step title="選擇供應商">
    選擇一個供應商並完成任何必要的設定。某些供應商
    不需要金鑰，而其他則使用 API 金鑰。請參閱下方的供應商頁面以取得
    詳細資訊。
  </Step>
  <Step title="設定">
    ```bash
    openclaw configure --section web
    ```
    這會儲存供應商以及任何所需的憑證。您也可以設定環境變數
    （例如 `BRAVE_API_KEY`），並針對支援 API 的供應商
    跳過此步驟。
  </Step>
  <Step title="使用它">
    Agent 現在可以呼叫 `web_search`：

    ```javascript
    await web_search({ query: "OpenClaw plugin SDK" });
    ```

    若是 X 貼文，請使用：

    ```javascript
    await x_search({ query: "dinner recipes" });
    ```

  </Step>
</Steps>

## 選擇供應商

<CardGroup cols={2}>
  <Card title="Brave Search" icon="shield" href="/zh-Hant/tools/brave-search">
    提供摘要的結構化結果。支援 `llm-context` 模式、國家/語言篩選。提供免費層級。
  </Card>
  <Card title="DuckDuckGo" icon="bird" href="/zh-Hant/tools/duckduckgo-search">
    無需金鑰的備選方案。不需要 API 金鑰。非官方的 HTML 整合方式。
  </Card>
  <Card title="Exa" icon="brain" href="/zh-Hant/tools/exa-search">
    神經網路 + 關鍵字搜尋，並具備內容擷取功能（亮點、文字、摘要）。
  </Card>
  <Card title="Firecrawl" icon="flame" href="/zh-Hant/tools/firecrawl">
    結構化結果。最適合搭配 `firecrawl_search` 和 `firecrawl_scrape` 進行深度擷取。
  </Card>
  <Card title="Gemini" icon="sparkles" href="/zh-Hant/tools/gemini-search">
    透過 Google 搜尋提供引用的 AI 整合答案。
  </Card>
  <Card title="Grok" icon="zap" href="/zh-Hant/tools/grok-search">
    透過 xAI 網路提供引用的 AI 整合答案。
  </Card>
  <Card title="Kimi" icon="moon" href="/zh-Hant/tools/kimi-search">
    透過 Moonshot 網路搜尋提供引用的 AI 整合答案。
  </Card>
  <Card title="MiniMax Search" icon="globe" href="/zh-Hant/tools/minimax-search">
    透過 MiniMax Coding Plan 搜尋 API 取得結構化結果。
  </Card>
  <Card title="Ollama Web Search" icon="globe" href="/zh-Hant/tools/ollama-search">
    透過您設定的 Ollama 主機進行免金鑰搜尋。需要 `ollama signin`。
  </Card>
  <Card title="Perplexity" icon="search" href="/zh-Hant/tools/perplexity-search">
    具有內容擷取控制和網域過濾功能的結構化結果。
  </Card>
  <Card title="SearXNG" icon="server" href="/zh-Hant/tools/searxng-search">
    自託管的元搜尋。不需要 API 金鑰。彙總 Google、Bing、DuckDuckGo 等搜尋結果。
  </Card>
  <Card title="Tavily" icon="globe" href="/zh-Hant/tools/tavily">
    具有搜尋深度、主題過濾和用於 URL 擷取的 `tavily_extract` 的結構化結果。
  </Card>
</CardGroup>

### 供應商比較

| 供應商                                       | 結果樣式       | 過濾器                               | API 金鑰                                                               |
| -------------------------------------------- | -------------- | ------------------------------------ | ---------------------------------------------------------------------- |
| [Brave](/zh-Hant/tools/brave-search)              | 結構化摘要     | 國家、語言、時間、`llm-context` 模式 | `BRAVE_API_KEY`                                                        |
| [DuckDuckGo](/zh-Hant/tools/duckduckgo-search)    | 結構化摘要     | --                                   | 無（免金鑰）                                                           |
| [Exa](/zh-Hant/tools/exa-search)                  | 結構化 + 擷取  | 神經/關鍵字模式、日期、內容擷取      | `EXA_API_KEY`                                                          |
| [Firecrawl](/zh-Hant/tools/firecrawl)             | 結構化摘要     | 透過 `firecrawl_search` 工具         | `FIRECRAWL_API_KEY`                                                    |
| [Gemini](/zh-Hant/tools/gemini-search)            | AI 綜合 + 引用 | --                                   | `GEMINI_API_KEY`                                                       |
| [Grok](/zh-Hant/tools/grok-search)                | AI 綜合 + 引用 | --                                   | `XAI_API_KEY`                                                          |
| [Kimi](/zh-Hant/tools/kimi-search)                | AI 綜合 + 引用 | --                                   | `KIMI_API_KEY` / `MOONSHOT_API_KEY`                                    |
| [MiniMax Search](/zh-Hant/tools/minimax-search)   | 結構化片段     | 地區 (`global` / `cn`)               | `MINIMAX_CODE_PLAN_KEY` / `MINIMAX_CODING_API_KEY`                     |
| [Ollama Web Search](/zh-Hant/tools/ollama-search) | 結構化片段     | --                                   | 預設為無；需要 `ollama signin`，可重複使用 Ollama 提供者的 bearer auth |
| [Perplexity](/zh-Hant/tools/perplexity-search)    | 結構化片段     | 國家、語言、時間、網域、內容限制     | `PERPLEXITY_API_KEY` / `OPENROUTER_API_KEY`                            |
| [SearXNG](/zh-Hant/tools/searxng-search)          | 結構化片段     | 類別、語言                           | 無（自託管）                                                           |
| [Tavily](/zh-Hant/tools/tavily)                   | 結構化片段     | 透過 `tavily_search` 工具            | `TAVILY_API_KEY`                                                       |

## 自動偵測

## 原生 OpenAI 網路搜尋

當啟用 OpenClaw 網路搜尋且未鎖定任何受控提供者時，Direct OpenAI Responses 模型會自動使用 OpenAI 託管的 `web_search` 工具。這是內建 OpenAI 外掛程式中的提供者自有行為，僅適用於原生 OpenAI API 流量，不適用於 OpenAI 相容的 Proxy 基礎 URL 或 Azure 路由。將 `tools.web.search.provider` 設為其他提供者（例如 `brave`）以為 OpenAI 模型保留受控的 `web_search` 工具，或者將 `tools.web.search.enabled: false` 設為 disable 以停用受控搜尋和原生 OpenAI 搜尋。

## 原生 Codex 網路搜尋

具備 Codex 能力的模型可以選擇使用提供者原生的 Responses `web_search` 工具，以取代 OpenClaw 的受控 `web_search` 函數。

- 在 `tools.web.search.openaiCodex` 下進行設定
- 它僅對具備 Codex 能力的模型啟用（`openai-codex/*` 或使用 `api: "openai-codex-responses"` 的提供者）
- 受控的 `web_search` 仍適用於非 Codex 模型
- `mode: "cached"` 是預設且推薦的設定
- `tools.web.search.enabled: false` 會停用受控和原生搜尋

```json5
{
  tools: {
    web: {
      search: {
        enabled: true,
        openaiCodex: {
          enabled: true,
          mode: "cached",
          allowedDomains: ["example.com"],
          contextSize: "high",
          userLocation: {
            country: "US",
            city: "New York",
            timezone: "America/New_York",
          },
        },
      },
    },
  },
}
```

如果啟用了原生 Codex 搜尋，但目前的模型不支援 Codex，OpenClaw 會保持正常的受控 `web_search` 行為。

## 設定網路搜尋

文件和設定流程中的供應商清單按字母順序排列。自動偵測則保持單獨的優先順序。

如果未設定 `provider`，OpenClaw 會依照以下順序檢查供應商，並使用第一個準備就緒的：

優先檢查 API 支援的供應商：

1. **Brave** -- `BRAVE_API_KEY` 或 `plugins.entries.brave.config.webSearch.apiKey` (順序 10)
2. **MiniMax Search** -- `MINIMAX_CODE_PLAN_KEY` / `MINIMAX_CODING_API_KEY` 或 `plugins.entries.minimax.config.webSearch.apiKey` (順序 15)
3. **Gemini** -- `GEMINI_API_KEY` 或 `plugins.entries.google.config.webSearch.apiKey` (順序 20)
4. **Grok** -- `XAI_API_KEY` 或 `plugins.entries.xai.config.webSearch.apiKey` (順序 30)
5. **Kimi** -- `KIMI_API_KEY` / `MOONSHOT_API_KEY` 或 `plugins.entries.moonshot.config.webSearch.apiKey` (順序 40)
6. **Perplexity** -- `PERPLEXITY_API_KEY` / `OPENROUTER_API_KEY` 或 `plugins.entries.perplexity.config.webSearch.apiKey` (順序 50)
7. **Firecrawl** -- `FIRECRAWL_API_KEY` 或 `plugins.entries.firecrawl.config.webSearch.apiKey` (順序 60)
8. **Exa** -- `EXA_API_KEY` 或 `plugins.entries.exa.config.webSearch.apiKey` (順序 65)
9. **Tavily** -- `TAVILY_API_KEY` 或 `plugins.entries.tavily.config.webSearch.apiKey` (順序 70)

之後是不需要金鑰的備選方案：

10. **DuckDuckGo** -- 不需要帳號或 API 金鑰的免金鑰 HTML 備選方案 (順序 100)
11. **Ollama Web Search** -- 透過您設定的 Ollama 主機進行的免金鑰備選方案；需要 Ollama 可存取並已使用 `ollama signin` 登入，且如果主機需要，可以重複使用 Ollama 供應商的 bearer auth (順序 110)
12. **SearXNG** -- `SEARXNG_BASE_URL` 或 `plugins.entries.searxng.config.webSearch.baseUrl` (順序 200)

如果偵測不到任何供應商，它會回退到 Brave (您會收到缺少金鑰的錯誤提示，要求您進行設定)。

<Note>
  所有供應商金鑰欄位都支援 SecretRef 物件。無論是透過 `tools.web.search.provider` 明確選擇供應商還是透過自動偵測選擇，`plugins.entries.<plugin>.config.webSearch.apiKey` 下的外掛程式範圍 SecretRef 都會針對內建的 Exa、Firecrawl、Gemini、Grok、Kimi、Perplexity 和 Tavily 供應商進行解析。在自動偵測模式下，OpenClaw 只會解析選定的供應商金鑰——未選定的 SecretRefs 將保持非活動狀態，因此您可以保持多個供應商的配置，而無需為未使用的供應商付出解析成本。
</Note>

## 配置

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

供應商特定的配置（API 金鑰、基礎 URL、模式）位於
`plugins.entries.<plugin>.config.webSearch.*` 之下。請參閱供應商頁面以取得範例。

`web_fetch` 後援供應商的選擇是分開的：

- 使用 `tools.web.fetch.provider` 選擇它
- 或省略該欄位，讓 OpenClaw 從可用的憑證中自動偵測第一個就緒的網頁擷取
  供應商
- 目前內建的網頁擷取供應商是 Firecrawl，在
  `plugins.entries.firecrawl.config.webFetch.*` 下進行配置

當您在 `openclaw onboard` 或
`openclaw configure --section web` 期間選擇 **Kimi** 時，OpenClaw 也可以要求：

- Moonshot API 區域（`https://api.moonshot.ai/v1` 或 `https://api.moonshot.cn/v1`）
- 預設的 Kimi 網頁搜尋模型（預設為 `kimi-k2.6`）

對於 `x_search`，請配置 `plugins.entries.xai.config.xSearch.*`。它使用與 Grok 網頁搜尋相同的
`XAI_API_KEY` 後援。
舊版 `tools.web.x_search.*` 配置會由 `openclaw doctor --fix` 自動遷移。
當您在 `openclaw onboard` 或 `openclaw configure --section web` 期間選擇 Grok 時，
OpenClaw 也可以使用相同的金鑰提供可選的 `x_search` 設定。
這是 Grok 路徑內的一個單獨的後續步驟，而不是一個單獨的頂層
網頁搜尋供應商選擇。如果您選擇其他供應商，OpenClaw 將不會
顯示 `x_search` 提示。

### 儲存 API 金鑰

<Tabs>
  <Tab title="配置檔案">
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
    在 Gateway 程序環境中設定 provider 環境變數：

    ```bash
    export BRAVE_API_KEY="YOUR_KEY"
    ```

    若為 gateway 安裝，請將其置於 `~/.openclaw/.env` 中。
    請參閱 [環境變數](/zh-Hant/help/faq#env-vars-and-env-loading)。

  </Tab>
</Tabs>

## 工具參數

| 參數                  | 描述                                            |
| --------------------- | ----------------------------------------------- |
| `query`               | 搜尋查詢（必填）                                |
| `count`               | 傳回結果數（1-10，預設值：5）                   |
| `country`             | 兩字母 ISO 國家/地區代碼（例如 "US"、"DE"）     |
| `language`            | ISO 639-1 語言代碼（例如 "en"、"de"）           |
| `search_lang`         | 搜尋語言代碼（僅限 Brave）                      |
| `freshness`           | 時間篩選：`day`、`week`、`month` 或 `year`      |
| `date_after`          | 此日期之後的結果（YYYY-MM-DD）                  |
| `date_before`         | 此日期之前的結果（YYYY-MM-DD）                  |
| `ui_lang`             | UI 語言代碼（僅限 Brave）                       |
| `domain_filter`       | 網域允許清單/拒絕清單陣列（僅限 Perplexity）    |
| `max_tokens`          | 總內容預算，預設值 25000（僅限 Perplexity）     |
| `max_tokens_per_page` | 每頁 token 限制，預設值 2048（僅限 Perplexity） |

<Warning>
  並非所有參數都適用於所有提供者。Brave `llm-context` 模式 會拒絕 `ui_lang`、`freshness`、`date_after` 和 `date_before`。 Gemini、Grok 和 Kimi 會傳回一個帶有引用的綜合答案。它們 為了共用工具相容性而接受 `count`，但這不會改變 依據事實的答案形狀。 當您使用 Sonar/OpenRouter 相容性路徑 (`plugins.entries.perplexity.config.webSearch.baseUrl` / `model` 或 `OPENROUTER_API_KEY`) 時，Perplexity
  的運作方式相同。 SearXNG 僅針對受信任的私人網路或 loopback 主機接受 `http://`； 公共 SearXNG 端點必須使用 `https://`。 Firecrawl 和 Tavily 僅透過 `web_search` 支援 `query` 和 `count` -- 如需進階選項，請使用其專屬工具。
</Warning>

## x_search

`x_search` 使用 xAI 查詢 X (前稱 Twitter) 貼文並傳回
帶有引用的 AI 綜合答案。它接受自然語言查詢和
可選的結構化篩選器。OpenClaw 僅在服務於此工具呼叫的請求上
啟用內建的 xAI `x_search` 工具。

<Note>xAI 將 `x_search` 記錄為支援關鍵字搜尋、語意搜尋、使用者 搜尋和串擷取。對於每篇貼文的互動統計數據，例如轉發、 回覆、書籤或觀看次數，建議針對確切貼文 URL 或狀態 ID 進行目標查詢。廣泛的關鍵字搜尋可能會找到正確的貼文，但傳回的 每篇貼文中繼資料較不完整。一個好的模式是：先找到貼文，然後 執行第二個針對該確切貼文的 `x_search` 查詢。</Note>

### x_search config

```json5
{
  plugins: {
    entries: {
      xai: {
        config: {
          xSearch: {
            enabled: true,
            model: "grok-4-1-fast-non-reasoning",
            inlineCitations: false,
            maxTurns: 2,
            timeoutSeconds: 30,
            cacheTtlMinutes: 15,
          },
          webSearch: {
            apiKey: "xai-...", // optional if XAI_API_KEY is set
          },
        },
      },
    },
  },
}
```

### x_search 參數

| 參數                         | 描述                                  |
| ---------------------------- | ------------------------------------- |
| `query`                      | 搜尋查詢 (必填)                       |
| `allowed_x_handles`          | 將結果限制為特定的 X 帳號代碼         |
| `excluded_x_handles`         | 排除特定的 X 帳號代碼                 |
| `from_date`                  | 僅包含此日期或之後的貼文 (YYYY-MM-DD) |
| `to_date`                    | 僅包含此日期或之前的貼文 (YYYY-MM-DD) |
| `enable_image_understanding` | 讓 xAI 檢查附加到符合貼文的圖片       |
| `enable_video_understanding` | 讓 xAI 檢查附加到符合貼文的影片       |

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

- [Web Fetch](/zh-Hant/tools/web-fetch) -- 取得 URL 並擷取可讀內容
- [Web Browser](/zh-Hant/tools/browser) -- 適用於重度 JS 網站的全瀏覽器自動化
- [Grok Search](/zh-Hant/tools/grok-search) -- Grok 作為 `web_search` 提供者
- [Ollama Web Search](/zh-Hant/tools/ollama-search) -- 透過您的 Ollama 主機進行免金鑰網路搜尋
