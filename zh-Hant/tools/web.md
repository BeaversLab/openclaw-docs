---
summary: "Web search + fetch tools (Brave, Firecrawl, Gemini, Grok, Kimi, and Perplexity providers)"
read_when:
  - You want to enable web_search or web_fetch
  - You need provider API key setup
  - You want to use Gemini with Google Search grounding
title: "Web Tools"
---

# 網頁工具

OpenClaw 內建兩個輕量級網頁工具：

- `web_search` — 使用 Brave Search API、Firecrawl Search、搭載 Google Search grounding 的 Gemini、Grok、Kimi 或 Perplexity Search API 搜尋網頁。
- `web_fetch` — HTTP 抓取 + 可讀性提取 (HTML → markdown/text)。

這些**不是**瀏覽器自動化工具。若是重度依賴 JS 的網站或需要登入，請使用
[瀏覽器工具](/zh-Hant/tools/browser)。

## 運作方式

- `web_search` 會呼叫您設定的供應商並傳回結果。
- 結果會依查詢快取 15 分鐘 (可設定)。
- `web_fetch` 會執行一般的 HTTP GET 並擷取可讀內容
  (HTML → markdown/text)。它**不會**執行 JavaScript。
- `web_fetch` 預設為啟用 (除非明確停用)。
- 內建的 Firecrawl 外掛在啟用時也會新增 `firecrawl_search` 與 `firecrawl_scrape`。

請參閱 [Brave Search 設定](/zh-Hant/brave-search) 與 [Perplexity Search 設定](/zh-Hant/perplexity) 以了解各供應商的細節。

## 選擇搜尋供應商

| 供應商                  | 結果形式                       | 供應商專屬篩選器                                    | 備註                                                                          | API 金鑰                                     |
| ------------------------- | ---------------------------------- | ------------------------------------------------------------ | ------------------------------------------------------------------------------ | ------------------------------------------- |
| **Brave Search API**      | 帶有摘要的結構化結果   | `country`, `language`, `ui_lang`, 時間                       | 支援 Brave `llm-context` 模式                                              | `BRAVE_API_KEY`                             |
| **Firecrawl Search**      | 帶有摘要的結構化結果   | 使用 `firecrawl_search` 來設定 Firecrawl 專屬的搜尋選項 | 最適合將搜尋與 Firecrawl 抓取/提取搭配使用                     | `FIRECRAWL_API_KEY`                         |
| **Gemini**                | AI 整合的答案 + 引用 | —                                                            | 使用 Google Search grounding                                                   | `GEMINI_API_KEY`                            |
| **Grok**                  | AI 整合的答案 + 引用 | —                                                            | 使用 xAI 網頁導向的回應                                                | `XAI_API_KEY`                               |
| **Kimi**                  | AI 整合的答案 + 引用 | —                                                            | 使用 Moonshot 網路搜尋                                                       | `KIMI_API_KEY` / `MOONSHOT_API_KEY`         |
| **Perplexity 搜尋 API** | 帶有摘要的結構化結果   | `country`、`language`、時間、`domain_filter`                 | 支援內容擷取控制；OpenRouter 使用 Sonar 相容路徑 | `PERPLEXITY_API_KEY` / `OPENROUTER_API_KEY` |

### 自動偵測

上表依字母順序排列。如果未明確設定 `provider`，執行時自動偵測將依此順序檢查提供者：

1. **Brave** — `BRAVE_API_KEY` 環境變數或 `plugins.entries.brave.config.webSearch.apiKey`
2. **Gemini** — `GEMINI_API_KEY` 環境變數或 `plugins.entries.google.config.webSearch.apiKey`
3. **Grok** — `XAI_API_KEY` 環境變數或 `plugins.entries.xai.config.webSearch.apiKey`
4. **Kimi** — `KIMI_API_KEY` / `MOONSHOT_API_KEY` 環境變數或 `plugins.entries.moonshot.config.webSearch.apiKey`
5. **Perplexity** — `PERPLEXITY_API_KEY`、`OPENROUTER_API_KEY` 或 `plugins.entries.perplexity.config.webSearch.apiKey`
6. **Firecrawl** — `FIRECRAWL_API_KEY` 環境變數或 `plugins.entries.firecrawl.config.webSearch.apiKey`

如果找不到任何金鑰，系統會降級使用 Brave（您會收到遺失金鑰的錯誤提示，請您進行設定）。

執行時 SecretRef 行為：

- Web 工具的 SecretRef 會在閘道啟動/重新載入時以原子方式解析。
- 在自動偵測模式下，OpenClaw 僅會解析選取的提供者金鑰。未選取的提供者 SecretRef 將保持非活動狀態，直到被選取為止。
- 如果選取的提供者 SecretRef 未解析且沒有提供者環境變數作為備援，啟動/重新載入將會快速失敗。

## 設定網路搜尋

使用 `openclaw configure --section web` 來設定您的 API 金鑰並選擇提供者。

### Brave 搜尋

1. 在 [brave.com/search/api](https://brave.com/search/api/) 建立 Brave 搜尋 API 帳號
2. 在儀表板中，選擇 **Search** 方案並產生 API 金鑰。
3. 執行 `openclaw configure --section web` 將金鑰儲存在設定中，或在您的環境中設定 `BRAVE_API_KEY`。

每個 Brave 方案都包含 **每月 \$5 的免費額度**（會更新）。搜尋方案每 1,000 次請求收費 \$5，因此該額度涵蓋每月 1,000 次查詢。請在 Brave 儀表板中設定您的使用上限以避免意外收費。請參閱 [Brave API portal](https://brave.com/search/api/) 以了解目前的方案和價格。

### Perplexity Search

1. 在 [perplexity.ai/settings/api](https://www.perplexity.ai/settings/api) 建立 Perplexity 帳戶
2. 在儀表板中產生 API 金鑰
3. 執行 `openclaw configure --section web` 以將金鑰儲存在設定中，或在您的環境中設定 `PERPLEXITY_API_KEY`。

為了與舊版 Sonar/OpenRouter 相容，請改為設定 `OPENROUTER_API_KEY`，或使用 `sk-or-...` 金鑰來設定 `plugins.entries.perplexity.config.webSearch.apiKey`。設定 `plugins.entries.perplexity.config.webSearch.baseUrl` 或 `model` 也會讓 Perplexity 回到 chat-completions 相容路徑。

特定供應商的網頁搜尋設定現在位於 `plugins.entries.<plugin>.config.webSearch.*` 之下。
舊版 `tools.web.search.*` 供應商路徑仍會透過相容性 shim 載入一個版本，但不應在新設定中使用。

詳情請參閱 [Perplexity Search API Docs](https://docs.perplexity.ai/guides/search-quickstart)。

### 金鑰儲存位置

**透過設定：** 執行 `openclaw configure --section web`。它會將金鑰儲存在特定供應商的設定路徑下：

- Brave: `plugins.entries.brave.config.webSearch.apiKey`
- Firecrawl: `plugins.entries.firecrawl.config.webSearch.apiKey`
- Gemini: `plugins.entries.google.config.webSearch.apiKey`
- Grok: `plugins.entries.xai.config.webSearch.apiKey`
- Kimi: `plugins.entries.moonshot.config.webSearch.apiKey`
- Perplexity: `plugins.entries.perplexity.config.webSearch.apiKey`

所有這些欄位也都支援 SecretRef 物件。

**透過環境變數：** 在 Gateway 程序環境中設定供應商環境變數：

- Brave: `BRAVE_API_KEY`
- Firecrawl: `FIRECRAWL_API_KEY`
- Gemini: `GEMINI_API_KEY`
- Grok: `XAI_API_KEY`
- Kimi: `KIMI_API_KEY` 或 `MOONSHOT_API_KEY`
- Perplexity: `PERPLEXITY_API_KEY` 或 `OPENROUTER_API_KEY`

對於 gateway 安裝，將這些放在 `~/.openclaw/.env` 中（或您的服務環境中）。請參閱 [Env vars](/zh-Hant/help/faq#how-does-openclaw-load-environment-variables)。

### 設定範例

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

當您在入門引導或 `openclaw configure --section web` 中選擇 Firecrawl 時，OpenClaw 會自動啟用內建的 Firecrawl 外掛程式，因此 `web_search`、`firecrawl_search` 和 `firecrawl_scrape` 全部皆可供使用。

**Brave LLM Context mode:**

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

`llm-context` 會傳回擷取的頁面區塊用於基礎判斷，而非標準的 Brave 摘要。
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

**Perplexity via OpenRouter / Sonar compatibility:**

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

## 使用 Gemini (Google Search grounding)

Gemini 模型支援內建的 [Google Search grounding](https://ai.google.dev/gemini-api/docs/grounding)，
可傳回由即時 Google 搜尋結果支援並附有引用來源的 AI 綜合解答。

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
若為 gateway 安裝，請將其放在 `~/.openclaw/.env` 中。

### 備註

- 來自 Gemini grounding 的引用網址會自動從 Google 的
 重新導向網址解析為直接網址。
- 重新導向解析在傳回最終引用網址之前，會使用 SSRF 防護路徑 (HEAD + 重新導向檢查 + http/https 驗證)。
- 重新導向解析使用嚴格的 SSRF 預設值，因此會封鎖對私人/內部目標的重新導向。
- 預設模型 (`gemini-2.5-flash`) 快速且具成本效益。
  可以使用任何支援 grounding 的 Gemini 模型。

## web_search

使用您設定的供應商搜尋網路。

### 需求

- `tools.web.search.enabled` 不得為 `false` (預設值：啟用)
- 您所選供應商的 API 金鑰：
  - **Brave**：`BRAVE_API_KEY` 或 `plugins.entries.brave.config.webSearch.apiKey`
  - **Firecrawl**: `FIRECRAWL_API_KEY` 或 `plugins.entries.firecrawl.config.webSearch.apiKey`
  - **Gemini**: `GEMINI_API_KEY` 或 `plugins.entries.google.config.webSearch.apiKey`
  - **Grok**: `XAI_API_KEY` 或 `plugins.entries.xai.config.webSearch.apiKey`
  - **Kimi**: `KIMI_API_KEY`、`MOONSHOT_API_KEY` 或 `plugins.entries.moonshot.config.webSearch.apiKey`
  - **Perplexity**: `PERPLEXITY_API_KEY`、`OPENROUTER_API_KEY` 或 `plugins.entries.perplexity.config.webSearch.apiKey`
- 上述所有提供者金鑰欄位均支援 SecretRef 物件。

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

Perplexity 的 OpenRouter / Sonar 相容路徑僅支援 `query` 和 `freshness`。
如果您設定 `plugins.entries.perplexity.config.webSearch.baseUrl` / `model`，使用 `OPENROUTER_API_KEY`，或在 `plugins.entries.perplexity.config.webSearch.apiKey` 下設定 `sk-or-...` 金鑰，僅限搜尋 API 的篩選器將傳回明確錯誤。

| 參數             | 描述                                           |
| --------------------- | ----------------------------------------------------- |
| `query`               | 搜尋查詢（必填）                               |
| `count`               | 傳回結果數 (1-10，預設：5)                  |
| `country`             | 兩字母 ISO 國家代碼（例如 "US"、"DE"）          |
| `language`            | ISO 639-1 語言代碼（例如 "en"、"de"）            |
| `freshness`           | 時間篩選：`day`、`week`、`month` 或 `year`        |
| `date_after`          | 此日期之後的結果 (YYYY-MM-DD)                  |
| `date_before`         | 此日期之前的結果 (YYYY-MM-DD)                 |
| `ui_lang`             | UI 語言代碼（僅限 Brave）                         |
| `domain_filter`       | 網域允許/封鎖清單陣列（僅限 Perplexity）     |
| `max_tokens`          | 總內容預算，預設 25000（僅限 Perplexity） |
| `max_tokens_per_page` | 每頁 token 限制，預設 2048（僅限 Perplexity）  |

Firecrawl `web_search` 支援 `query` 和 `count`。若要使用 Firecrawl 專屬控制項，例如 `sources`、`categories`、結果抓取或抓取逾時，請使用隨附 Firecrawl 外掛程式中的 `firecrawl_search`。

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

啟用 Brave `llm-context` 模式時，不支援 `ui_lang`、`freshness`、`date_after` 和
`date_before`。請使用 Brave `web` 模式來使用這些篩選器。

## web_fetch

擷取 URL 並提取可讀取的內容。

### web_fetch 需求

- `tools.web.fetch.enabled` 不得為 `false` (預設值：已啟用)
- 選用的 Firecrawl 後援：設定 `tools.web.fetch.firecrawl.apiKey` 或 `FIRECRAWL_API_KEY`。
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

- `url` (必填，僅限 http/https)
- `extractMode` (`markdown` | `text`)
- `maxChars` (截斷長頁面)

備註：

- `web_fetch` 會優先使用 Readability (主要內容擷取)，然後使用 Firecrawl (如有設定)。如果兩者都失敗，工具會傳回錯誤。
- Firecrawl 要求預設使用規避機器人模式並快取結果。
- 只有在啟用 Firecrawl 時 (`tools.web.fetch.enabled !== false` 和 `tools.web.fetch.firecrawl.enabled !== false`)，才會解析 Firecrawl SecretRefs。
- 如果啟用 Firecrawl 且其 SecretRef 未解析，且沒有 `FIRECRAWL_API_KEY` 後援，啟動/重新載入會快速失敗。
- `web_fetch` 預設會傳送類似 Chrome 的 User-Agent 和 `Accept-Language`；如有需要，請覆寫 `userAgent`。
- `web_fetch` 會封鎖私人/內部主機名稱並重新檢查重新導向 (使用 `maxRedirects` 限制)。
- `maxChars` 會限制在 `tools.web.fetch.maxCharsCap`。
- `web_fetch` 在解析之前將下載的回應主體大小限制為 `tools.web.fetch.maxResponseBytes`；過大的回應會被截斷並包含警告。
- `web_fetch` 是盡力而為的提取；某些網站將需要瀏覽器工具。
- 請參閱 [Firecrawl](/zh-Hant/tools/firecrawl) 以了解金鑰設定和服務詳細資訊。
- 回應會被快取（預設 15 分鐘）以減少重複擷取。
- 如果您使用工具設定檔/允許清單，請新增 `web_search`/`web_fetch` 或 `group:web`。
- 如果缺少 API 金鑰，`web_search` 會傳回簡短的設定提示和文件連結。

import en from "/components/footer/en.mdx";

<en />
