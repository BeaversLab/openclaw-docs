---
summary: "網頁搜尋 + 擷取工具（Brave、Firecrawl、Gemini、Grok、Kimi、Perplexity 和 Tavily 提供商）"
read_when:
  - You want to enable web_search or web_fetch
  - You need provider API key setup
  - You want to use Gemini with Google Search grounding
title: "網頁工具"
---

# 網頁工具

OpenClaw 內建兩個輕量級的網頁工具：

- `web_search` — 使用 Brave Search API、Firecrawl Search、搭載 Google Search grounding 的 Gemini、Grok、Kimi、Perplexity Search API 或 Tavily Search API 搜尋網頁。
- `web_fetch` — HTTP 抓取 + 可讀內容擷取（HTML → markdown/text）。

這些**不是**瀏覽器自動化工具。對於重度依賴 JS 的網站或需要登入的情況，請使用
[瀏覽器工具](/zh-Hant/tools/browser)。

## 運作方式

- `web_search` 會呼叫您設定的提供商並傳回結果。
- 結果會依據查詢快取 15 分鐘（可設定）。
- `web_fetch` 會執行純 HTTP GET 並擷取可讀內容
  （HTML → markdown/text）。它**不會**執行 JavaScript。
- `web_fetch` 預設為啟用（除非明確停用）。
- 內建的 Firecrawl 外掛程式在啟用時也會新增 `firecrawl_search` 和 `firecrawl_scrape`。
- 內建的 Tavily 外掛程式在啟用時也會新增 `tavily_search` 和 `tavily_extract`。

請參閱 [Brave Search 設定](/zh-Hant/tools/brave-search)、[Perplexity Search 設定](/zh-Hant/tools/perplexity-search) 和 [Tavily Search 設定](/zh-Hant/tools/tavily) 以瞭解特定提供商的細節。

## 選擇搜尋提供商

| 提供商                    | 結果結構             | 提供商專屬篩選器                                          | 備註                                                             | API 金鑰                                    |
| ------------------------- | -------------------- | --------------------------------------------------------- | ---------------------------------------------------------------- | ------------------------------------------- |
| **Brave Search API**      | 帶有摘要的結構化結果 | `country`、`language`、`ui_lang`、時間                    | 支援 Brave `llm-context` 模式                                    | `BRAVE_API_KEY`                             |
| **Firecrawl Search**      | 帶有摘要的結構化結果 | 使用 `firecrawl_search` 進行 Firecrawl 專屬的搜尋選項設定 | 最適合將搜尋與 Firecrawl 抓取/擷取搭配使用                       | `FIRECRAWL_API_KEY`                         |
| **Gemini**                | AI 合成的答案 + 引用 | —                                                         | 使用 Google Search grounding                                     | `GEMINI_API_KEY`                            |
| **Grok**                  | AI 綜合回答 + 引用   | —                                                         | 使用 xAI 網路回應                                                | `XAI_API_KEY`                               |
| **Kimi**                  | AI 綜合回答 + 引用   | —                                                         | 使用 Moonshot 網路搜尋                                           | `KIMI_API_KEY` / `MOONSHOT_API_KEY`         |
| **Perplexity Search API** | 帶有摘要的結構化結果 | `country`, `language`, 時間, `domain_filter`              | 支援內容提取控制；OpenRouter 使用 Sonar 相容路徑                 | `PERPLEXITY_API_KEY` / `OPENROUTER_API_KEY` |
| **Tavily Search API**     | 帶有摘要的結構化結果 | 使用 `tavily_search` 進行 Tavily 特定的搜尋選項設定       | 搜尋深度、主題過濾、AI 回答、透過 `tavily_extract` 進行 URL 提取 | `TAVILY_API_KEY`                            |

### 自動偵測

上表按字母順序排列。如果未明確設定 `provider`，執行時的自動偵測將按以下順序檢查提供者：

1. **Brave** — `BRAVE_API_KEY` 環境變數或 `plugins.entries.brave.config.webSearch.apiKey`
2. **Gemini** — `GEMINI_API_KEY` 環境變數或 `plugins.entries.google.config.webSearch.apiKey`
3. **Grok** — `XAI_API_KEY` 環境變數或 `plugins.entries.xai.config.webSearch.apiKey`
4. **Kimi** — `KIMI_API_KEY` / `MOONSHOT_API_KEY` 環境變數或 `plugins.entries.moonshot.config.webSearch.apiKey`
5. **Perplexity** — `PERPLEXITY_API_KEY`, `OPENROUTER_API_KEY`, 或 `plugins.entries.perplexity.config.webSearch.apiKey`
6. **Firecrawl** — `FIRECRAWL_API_KEY` 環境變數或 `plugins.entries.firecrawl.config.webSearch.apiKey`
7. **Tavily** — `TAVILY_API_KEY` 環境變數或 `plugins.entries.tavily.config.webSearch.apiKey`

如果未找到任何金鑰，將回退到 Brave（您會收到缺少金鑰的錯誤，提示您進行配置）。

執行時 SecretRef 行為：

- Web 工具 SecretRef 會在閘道啟動/重新載入時以原子方式解析。
- 在自動偵測模式下，OpenClaw 僅解析所選的提供者金鑰。未選擇的提供者 SecretRef 將保持非活動狀態，直到被選中。
- 如果所選的提供者 SecretRef 未解析且不存在提供者環境變數回退，啟動/重新載入將快速失敗。

## 設定網路搜尋

使用 `openclaw configure --section web` 來設定您的 API 金鑰並選擇供應商。

### Brave Search

1. 在 [brave.com/search/api](https://brave.com/search/api/) 建立 Brave Search API 帳號
2. 在儀表板中，選擇 **Search** 方案並產生 API 金鑰。
3. 執行 `openclaw configure --section web` 將金鑰儲存在設定中，或在您的環境中設定 `BRAVE_API_KEY`。

每個 Brave 方案都包含 **每月 5 美元的免費額度**（會更新）。Search
方案每 1,000 次請求花費 5 美元，因此額度涵蓋每月 1,000 次查詢。在 Brave
儀表板中設定您的使用限制以避免意外收費。請參閱 [Brave API portal](https://brave.com/search/api/)
以了解目前的方案和定價。

### Perplexity Search

1. 在 [perplexity.ai/settings/api](https://www.perplexity.ai/settings/api) 建立 Perplexity 帳號
2. 在儀表板中產生 API 金鑰
3. 執行 `openclaw configure --section web` 將金鑰儲存在設定中，或在您的環境中設定 `PERPLEXITY_API_KEY`。

為了與舊版 Sonar/OpenRouter 相容，請改為設定 `OPENROUTER_API_KEY`，或使用 `sk-or-...` 金鑰來設定 `plugins.entries.perplexity.config.webSearch.apiKey`。設定 `plugins.entries.perplexity.config.webSearch.baseUrl` 或 `model` 也會讓 Perplexity 選擇回到 chat-completions 相容路徑。

供應商專屬的網頁搜尋設定現在位於 `plugins.entries.<plugin>.config.webSearch.*` 之下。
舊版 `tools.web.search.*` 供應商路徑在這一個版本中仍透過相容性 shim 載入，但不應在新的設定中使用它們。

有關更多詳情，請參閱 [Perplexity Search API Docs](https://docs.perplexity.ai/guides/search-quickstart)。

### 金鑰儲存位置

**透過設定：** 執行 `openclaw configure --section web`。它會將金鑰儲存在供應商專屬的設定路徑下：

- Brave： `plugins.entries.brave.config.webSearch.apiKey`
- Firecrawl： `plugins.entries.firecrawl.config.webSearch.apiKey`
- Gemini： `plugins.entries.google.config.webSearch.apiKey`
- Grok： `plugins.entries.xai.config.webSearch.apiKey`
- Kimi： `plugins.entries.moonshot.config.webSearch.apiKey`
- Perplexity： `plugins.entries.perplexity.config.webSearch.apiKey`
- Tavily： `plugins.entries.tavily.config.webSearch.apiKey`

所有這些欄位也都支援 SecretRef 物件。

**透過環境：** 在 Gateway 程序環境中設定供應商環境變數：

- Brave： `BRAVE_API_KEY`
- Firecrawl: `FIRECRAWL_API_KEY`
- Gemini: `GEMINI_API_KEY`
- Grok: `XAI_API_KEY`
- Kimi: `KIMI_API_KEY` 或 `MOONSHOT_API_KEY`
- Perplexity: `PERPLEXITY_API_KEY` 或 `OPENROUTER_API_KEY`
- Tavily: `TAVILY_API_KEY`

如果是安裝 Gateway，請將這些設定放在 `~/.openclaw/.env` （或您的服務環境）中。請參閱 [Env vars](/zh-Hant/help/faq#how-does-openclaw-load-environment-variables)。

### 配置範例

**Brave Search:**

```json5
{
  plugins: {
    entries: {
      brave: {
        config: {
          webSearch: {
            apiKey: "YOUR_BRAVE_API_KEY", // optional if BRAVE_API_KEY is set // pragma: allowlist secret
          },
        },
      },
    },
  },
  tools: {
    web: {
      search: {
        enabled: true,
        provider: "brave",
      },
    },
  },
}
```

**Firecrawl Search:**

```json5
{
  plugins: {
    entries: {
      firecrawl: {
        enabled: true,
      },
    },
  },
  tools: {
    web: {
      search: {
        enabled: true,
        provider: "firecrawl",
      },
    },
  },
  plugins: {
    entries: {
      firecrawl: {
        enabled: true,
        config: {
          webSearch: {
            apiKey: "fc-...", // optional if FIRECRAWL_API_KEY is set
            baseUrl: "https://api.firecrawl.dev",
          },
        },
      },
    },
  },
}
```

當您在設定流程或 `openclaw configure --section web` 中選擇 Firecrawl 時，OpenClaw 會自動啟用內建的 Firecrawl 外掛，因此 `web_search`、`firecrawl_search` 和 `firecrawl_scrape` 都可使用。

**Tavily Search:**

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
        enabled: true,
        provider: "tavily",
      },
    },
  },
}
```

當您在設定流程或 `openclaw configure --section web` 中選擇 Tavily 時，OpenClaw 會自動啟用內建的 Tavily 外掛，因此 `web_search`、`tavily_search` 和 `tavily_extract` 都可使用。

**Brave LLM Context 模式：**

```json5
{
  plugins: {
    entries: {
      brave: {
        config: {
          webSearch: {
            apiKey: "YOUR_BRAVE_API_KEY", // optional if BRAVE_API_KEY is set // pragma: allowlist secret
            mode: "llm-context",
          },
        },
      },
    },
  },
  tools: {
    web: {
      search: {
        enabled: true,
        provider: "brave",
      },
    },
  },
}
```

`llm-context` 會傳回提取的網頁區塊用於輔助，而不是標準的 Brave 摘要。
在此模式下，`country` 和 `language` / `search_lang` 仍然有效，但 `ui_lang`、
`freshness`、`date_after` 和 `date_before` 會被拒絕。

**Perplexity Search:**

```json5
{
  plugins: {
    entries: {
      perplexity: {
        config: {
          webSearch: {
            apiKey: "pplx-...", // optional if PERPLEXITY_API_KEY is set
          },
        },
      },
    },
  },
  tools: {
    web: {
      search: {
        enabled: true,
        provider: "perplexity",
      },
    },
  },
}
```

**透過 OpenRouter / Sonar 相容性使用 Perplexity：**

```json5
{
  plugins: {
    entries: {
      perplexity: {
        config: {
          webSearch: {
            apiKey: "<openrouter-api-key>", // optional if OPENROUTER_API_KEY is set
            baseUrl: "https://openrouter.ai/api/v1",
            model: "perplexity/sonar-pro",
          },
        },
      },
    },
  },
  tools: {
    web: {
      search: {
        enabled: true,
        provider: "perplexity",
      },
    },
  },
}
```

## 使用 Gemini (Google Search 輔助)

Gemini 模型支援內建的 [Google Search grounding](https://ai.google.dev/gemini-api/docs/grounding)，
該功能會傳回由即時 Google Search 搜尋結果支援並附帶引用來源的 AI 綜合回答。

### 取得 Gemini API 金鑰

1. 前往 [Google AI Studio](https://aistudio.google.com/apikey)
2. 建立 API 金鑰
3. 在 Gateway 環境中設定 `GEMINI_API_KEY`，或設定 `plugins.entries.google.config.webSearch.apiKey`

### 設定 Gemini 搜尋

```json5
{
  plugins: {
    entries: {
      google: {
        config: {
          webSearch: {
            // API key (optional if GEMINI_API_KEY is set)
            apiKey: "AIza...",
            // Model (defaults to "gemini-2.5-flash")
            model: "gemini-2.5-flash",
          },
        },
      },
    },
  },
  tools: {
    web: {
      search: {
        provider: "gemini",
      },
    },
  },
}
```

**環境變數替代方案：** 在 Gateway 環境中設定 `GEMINI_API_KEY`。
如果是安裝 Gateway，請將其放在 `~/.openclaw/.env` 中。

### 備註

- 來自 Gemini 接地（grounding）的引用網址會自動從 Google 的重新導向網址解析為直接網址。
- 重新導向解析在返回最終引用網址之前，會使用 SSRF 防護路徑（HEAD + 重新導向檢查 + http/https 驗證）。
- 重新導向解析使用嚴格的 SSRF 預設值，因此對私人/內部目標的重新導向會被封鎖。
- 預設模型（`gemini-2.5-flash`）快速且具成本效益。
  任何支援接地功能的 Gemini 模型均可使用。

## web_search

使用您設定的提供者搜尋網路。

### 需求

- `tools.web.search.enabled` 不得為 `false`（預設值：已啟用）
- 您選擇的提供者之 API 金鑰：
  - **Brave**：`BRAVE_API_KEY` 或 `plugins.entries.brave.config.webSearch.apiKey`
  - **Firecrawl**：`FIRECRAWL_API_KEY` 或 `plugins.entries.firecrawl.config.webSearch.apiKey`
  - **Gemini**：`GEMINI_API_KEY` 或 `plugins.entries.google.config.webSearch.apiKey`
  - **Grok**：`XAI_API_KEY` 或 `plugins.entries.xai.config.webSearch.apiKey`
  - **Kimi**：`KIMI_API_KEY`、`MOONSHOT_API_KEY` 或 `plugins.entries.moonshot.config.webSearch.apiKey`
  - **Perplexity**：`PERPLEXITY_API_KEY`、`OPENROUTER_API_KEY` 或 `plugins.entries.perplexity.config.webSearch.apiKey`
  - **Tavily**：`TAVILY_API_KEY` 或 `plugins.entries.tavily.config.webSearch.apiKey`
- 上述所有提供者金鑰欄位皆支援 SecretRef 物件。

### 設定

```json5
{
  tools: {
    web: {
      search: {
        enabled: true,
        apiKey: "BRAVE_API_KEY_HERE", // optional if BRAVE_API_KEY is set
        maxResults: 5,
        timeoutSeconds: 30,
        cacheTtlMinutes: 15,
      },
    },
  },
}
```

### 工具參數

參數取決於選擇的提供者。

Perplexity 的 OpenRouter / Sonar 相容性路徑僅支援 `query` 和 `freshness`。
如果您設定了 `plugins.entries.perplexity.config.webSearch.baseUrl` / `model`、使用了 `OPENROUTER_API_KEY`，或在 `plugins.entries.perplexity.config.webSearch.apiKey` 下設定了 `sk-or-...` 金鑰，僅限搜尋 API 的篩選器會傳回明確的錯誤。

| 參數                  | 說明                                             |
| --------------------- | ------------------------------------------------ |
| `query`               | 搜尋查詢（必填）                                 |
| `count`               | 要傳回的結果數（1-10，預設值：5）                |
| `country`             | 兩字母 ISO 國家代碼（例如 "US"、"DE"）           |
| `language`            | ISO 639-1 語言代碼（例如 "en"、"de"）            |
| `freshness`           | 時間過濾器：`day`、`week`、`month` 或 `year`     |
| `date_after`          | 此日期之後的結果 (YYYY-MM-DD)                    |
| `date_before`         | 此日期之前的結果 (YYYY-MM-DD)                    |
| `ui_lang`             | UI 語言代碼 (僅限 Brave)                         |
| `domain_filter`       | 域名允許列表/拒絕列表陣列 (僅限 Perplexity)      |
| `max_tokens`          | 總內容預算，預設值為 25000 (僅限 Perplexity)     |
| `max_tokens_per_page` | 每頁 Token 限制，預設值為 2048 (僅限 Perplexity) |

Firecrawl `web_search` 支援 `query` 和 `count`。對於 Firecrawl 特定控制項，如 `sources`、`categories`、結果抓取或抓取逾時，請使用隨附 Firecrawl 外掛程式中的 `firecrawl_search`。

Tavily `web_search` 支援 `query` 和 `count` (最多 20 個結果)。對於 Tavily 特定控制項，如 `search_depth`、`topic`、`include_answer` 或域名過濾器，請使用隨附 Tavily 外掛程式中的 `tavily_search`。如需 URL 內容提取，請使用 `tavily_extract`。詳情請參閱 [Tavily](/zh-Hant/tools/tavily)。

**範例：**

```javascript
// German-specific search
await web_search({
  query: "TV online schauen",
  country: "DE",
  language: "de",
});

// Recent results (past week)
await web_search({
  query: "TMBG interview",
  freshness: "week",
});

// Date range search
await web_search({
  query: "AI developments",
  date_after: "2024-01-01",
  date_before: "2024-06-30",
});

// Domain filtering (Perplexity only)
await web_search({
  query: "climate research",
  domain_filter: ["nature.com", "science.org", ".edu"],
});

// Exclude domains (Perplexity only)
await web_search({
  query: "product reviews",
  domain_filter: ["-reddit.com", "-pinterest.com"],
});

// More content extraction (Perplexity only)
await web_search({
  query: "detailed AI research",
  max_tokens: 50000,
  max_tokens_per_page: 4096,
});
```

當啟用 Brave `llm-context` 模式時，不支援 `ui_lang`、`freshness`、`date_after` 和
`date_before`。請使用 Brave `web` 模式來套用這些過濾器。

## web_fetch

獲取 URL 並提取可讀內容。

### web_fetch 需求

- `tools.web.fetch.enabled` 不得為 `false` (預設值：已啟用)
- 可選的 Firecrawl 後備機制：設定 `tools.web.fetch.firecrawl.apiKey` 或 `FIRECRAWL_API_KEY`。
- `tools.web.fetch.firecrawl.apiKey` 支援 SecretRef 物件。

### web_fetch 設定

```json5
{
  tools: {
    web: {
      fetch: {
        enabled: true,
        maxChars: 50000,
        maxCharsCap: 50000,
        maxResponseBytes: 2000000,
        timeoutSeconds: 30,
        cacheTtlMinutes: 15,
        maxRedirects: 3,
        userAgent: "Mozilla/5.0 (Macintosh; Intel Mac OS X 14_7_2) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36",
        readability: true,
        firecrawl: {
          enabled: true,
          apiKey: "FIRECRAWL_API_KEY_HERE", // optional if FIRECRAWL_API_KEY is set
          baseUrl: "https://api.firecrawl.dev",
          onlyMainContent: true,
          maxAgeMs: 86400000, // ms (1 day)
          timeoutSeconds: 60,
        },
      },
    },
  },
}
```

### web_fetch 工具參數

- `url` （必填，僅限 http/https）
- `extractMode` (`markdown` | `text`)
- `maxChars` （截斷長頁面）

備註：

- `web_fetch` 首先使用 Readability（主要內容提取），然後使用 Firecrawl（如果已配置）。如果兩者都失敗，該工具會傳回錯誤。
- Firecrawl 請求預設使用繞過機器人模式並快取結果。
- Firecrawl SecretRefs 僅在 Firecrawl 啟用時解析（`tools.web.fetch.enabled !== false` 和 `tools.web.fetch.firecrawl.enabled !== false`）。
- 如果 Firecrawl 已啟用且其 SecretRef 未解析且沒有 `FIRECRAWL_API_KEY` 後備選項，啟動/重新載入會快速失敗。
- `web_fetch` 預設傳送類似 Chrome 的 User-Agent 和 `Accept-Language`；如有需要，請覆寫 `userAgent`。
- `web_fetch` 會封鎖私有/內部主機名稱並重新檢查重新導向（使用 `maxRedirects` 限制）。
- `maxChars` 會被限制在 `tools.web.fetch.maxCharsCap`。
- `web_fetch` 在解析前會將下載的回應主體大小上限設定為 `tools.web.fetch.maxResponseBytes`；過大的回應會被截斷並包含警告。
- `web_fetch` 是盡力而為的提取；某些網站將需要瀏覽器工具。
- 請參閱 [Firecrawl](/zh-Hant/tools/firecrawl) 以了解金鑰設定和服務詳情。
- 回應會被快取（預設 15 分鐘）以減少重複擷取。
- 如果您使用工具設定檔/允許清單，請新增 `web_search`/`web_fetch` 或 `group:web`。
- 如果缺少 API 金鑰，`web_search` 會傳回一個包含文件連結的簡短設定提示。

import footerZhHant from "/components/footer/zh-Hant.mdx";

<footerZhHant />
