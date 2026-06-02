---
summary: "web_search、x_search 和 web_fetch -- 搜尋網路、搜尋 X 貼文或擷取頁面內容"
title: "網路搜尋"
sidebarTitle: "網路搜尋"
read_when:
  - You want to enable or configure web_search
  - You want to enable or configure x_search
  - You need to choose a search provider
  - You want to understand auto-detection and provider fallback
---

`web_search` 工具會使用您設定的提供者搜尋網路並
傳回結果。結果會依查詢快取 15 分鐘（可設定）。

OpenClaw 也包含用於 X（前 Twitter）貼文的 `x_search`，以及
用於輕量級 URL 擷取的 `web_fetch`。在此階段，`web_fetch` 保持在
本機，而 `web_search` 和 `x_search` 則可在底層使用 xAI Responses。

<Info>`web_search` 是一個輕量級 HTTP 工具，而非瀏覽器自動化工具。若為 JavaScript 重的網站或需登入，請使用 [Web Browser](/zh-Hant/tools/browser)。若 要取得特定 URL，請使用 [Web Fetch](/zh-Hant/tools/web-fetch)。</Info>

## 快速開始

<Steps>
  <Step title="選擇提供者">
    選擇一個提供者並完成任何必要的設定。某些提供者
    不需要金鑰，而其他的則使用 API 金鑰。請參閱下方的提供者頁面以
    瞭解詳細資訊。
  </Step>
  <Step title="設定">
    ```bash
    openclaw configure --section web
    ```
    這會儲存提供者和任何所需的認證資訊。您也可以設定環境
    變數（例如 `BRAVE_API_KEY`）並針對使用 API 的
    提供者跳過此步驟。
  </Step>
  <Step title="使用">
    Agent 現在可以呼叫 `web_search`：

    ```javascript
    await web_search({ query: "OpenClaw plugin SDK" });
    ```

    若要搜尋 X 貼文，請使用：

    ```javascript
    await x_search({ query: "dinner recipes" });
    ```

  </Step>
</Steps>

## 選擇提供者

<CardGroup cols={2}>
  <Card title="Brave Search" icon="shield" href="/zh-Hant/tools/brave-search">
    附有摘要的結構化結果。支援 `llm-context` 模式、國家/語言篩選。提供免費層級。
  </Card>
  <Card title="DuckDuckGo" icon="bird" href="/zh-Hant/tools/duckduckgo-search">
    無需金鑰的備選方案。不需要 API 金鑰。非官方的 HTML 整合方式。
  </Card>
  <Card title="Exa" icon="brain" href="/zh-Hant/tools/exa-search">
    神經網路 + 關鍵字搜尋，具備內容提取功能（亮點、文字、摘要）。
  </Card>
  <Card title="Firecrawl" icon="flame" href="/zh-Hant/tools/firecrawl">
    結構化結果。最適合與 `firecrawl_search` 和 `firecrawl_scrape` 搭配使用以進行深度提取。
  </Card>
  <Card title="Gemini" icon="sparkles" href="/zh-Hant/tools/gemini-search">
    透過 Google Search 搜尋 grounding 提供引用文獻的 AI 綜合回答。
  </Card>
  <Card title="Grok" icon="zap" href="/zh-Hant/tools/grok-search">
    透過 xAI web grounding 提供引用文獻的 AI 綜合回答。
  </Card>
  <Card title="Kimi" icon="moon" href="/zh-Hant/tools/kimi-search">
    透過 Moonshot 網頁搜尋提供附引用來源的 AI 綜合回答；未落地的聊天備援會明確失敗。
  </Card>
  <Card title="MiniMax Search" icon="globe" href="/zh-Hant/tools/minimax-search">
    透過 MiniMax Token Plan 搜尋 API 提供結構化結果。
  </Card>
  <Card title="Ollama Web Search" icon="globe" href="/zh-Hant/tools/ollama-search">
    透過已登入的本機 Ollama 主機或託管的 Ollama API 進行搜尋。
  </Card>
  <Card title="Perplexity" icon="search" href="/zh-Hant/tools/perplexity-search">
    具有內容提取控制和網域過濾功能的結構化結果。
  </Card>
  <Card title="SearXNG" icon="server" href="/zh-Hant/tools/searxng-search">
    自託管的元搜尋。不需要 API 金鑰。聚合 Google、Bing、DuckDuckGo 等。
  </Card>
  <Card title="Tavily" icon="globe" href="/zh-Hant/tools/tavily">
    具有搜尋深度、主題過濾和用於 URL 提取的 `tavily_extract` 的結構化結果。
  </Card>
</CardGroup>

### 供應商比較

| 供應商                                       | 結果樣式                                       | 過濾器                               | API 金鑰                                                                    |
| -------------------------------------------- | ---------------------------------------------- | ------------------------------------ | --------------------------------------------------------------------------- |
| [Brave](/zh-Hant/tools/brave-search)              | 結構化摘要                                     | 國家、語言、時間、`llm-context` 模式 | `BRAVE_API_KEY`                                                             |
| [DuckDuckGo](/zh-Hant/tools/duckduckgo-search)    | 結構化摘要                                     | --                                   | 無（免金鑰）                                                                |
| [Exa](/zh-Hant/tools/exa-search)                  | 結構化 + 已提取                                | 神經/關鍵字模式、日期、內容提取      | `EXA_API_KEY`                                                               |
| [Firecrawl](/zh-Hant/tools/firecrawl)             | 結構化摘要                                     | 透過 `firecrawl_search` 工具         | `FIRECRAWL_API_KEY`                                                         |
| [Gemini](/zh-Hant/tools/gemini-search)            | AI 合成 + 引文                                 | --                                   | `GEMINI_API_KEY`                                                            |
| [Grok](/zh-Hant/tools/grok-search)                | AI 合成 + 引文                                 | --                                   | xAI OAuth、`XAI_API_KEY` 或 `plugins.entries.xai.config.webSearch.apiKey`   |
| [Kimi](/zh-Hant/tools/kimi-search)                | AI 綜合回答 + 引用來源；未落地的聊天備援會失敗 | --                                   | `KIMI_API_KEY` / `MOONSHOT_API_KEY`                                         |
| [MiniMax Search](/zh-Hant/tools/minimax-search)   | 結構化摘要                                     | 區域 (`global` / `cn`)               | `MINIMAX_CODE_PLAN_KEY` / `MINIMAX_CODING_API_KEY` / `MINIMAX_OAUTH_TOKEN`  |
| [Ollama Web Search](/zh-Hant/tools/ollama-search) | 結構化摘要                                     | --                                   | 已登入的本機主機不需要；直接 `https://ollama.com` 搜尋則需 `OLLAMA_API_KEY` |
| [Perplexity](/zh-Hant/tools/perplexity-search)    | 結構化摘要                                     | 國家、語言、時間、網域、內容限制     | `PERPLEXITY_API_KEY` / `OPENROUTER_API_KEY`                                 |
| [SearXNG](/zh-Hant/tools/searxng-search)          | 結構化摘要                                     | 分類、語言                           | 無（自託管）                                                                |
| [Tavily](/zh-Hant/tools/tavily)                   | 結構化摘要                                     | 透過 `tavily_search` 工具            | `TAVILY_API_KEY`                                                            |

## 自動偵測

## 原生 OpenAI 網路搜尋

當 OpenClaw 網路搜尋已啟用且未固定任何受管理的供應商時，直接的 OpenAI Responses 模型會自動使用 OpenAI 託管的 `web_search` 工具。這是內建 OpenAI 外掛程式中供應商擁有的行為，僅適用於原生的 OpenAI API 流量，不適用於 OpenAI 相容的 Proxy 基礎 URL 或 Azure 路由。將 `tools.web.search.provider` 設定為其他供應商（例如 `brave`）以保留 OpenAI 模型的受管理 `web_search` 工具，或將 `tools.web.search.enabled: false` 設定為停用受管理搜尋和原生 OpenAI 搜尋。

## 原生 Codex 網路搜尋

支援 Codex 的模型可選擇使用供應商原生的 Responses `web_search` 工具，而非 OpenClaw 管理的 `web_search` 函式。

- 在 `tools.web.search.openaiCodex` 下進行設定
- 它僅適用於支援 Codex 的 OpenAI 模型（使用 `api: "openai-chatgpt-responses"` 的 `openai/*` 模型）
- 管理的 `web_search` 仍適用於非 Codex 模型
- `mode: "cached"` 是預設且建議的設定
- `tools.web.search.enabled: false` 會同時停用管理式和原生搜尋

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

如果啟用了原生 Codex 搜尋但目前模型不支援 Codex，OpenClaw 將保持一般的管理式 `web_search` 行為。

## 網路安全

管理的 `web_search` 供應商呼叫使用 OpenClaw 的防護擷取路徑。對於受信任的供應商 API 主機，OpenClaw 允許 Surge、Clash 和 sing-box 的假 IP DNS 回應於 `198.18.0.0/15` 和 `fc00::/7` 中，但僅限該供應商主機名稱。其他私人、loopback、連線本機和元資料目的地仍會被封鎖。

此自動許可不適用於任意的 `web_fetch` URL。對於 `web_fetch`，僅在您信任的 Proxy 擁有這些合成範圍時，才明確啟用 `tools.web.fetch.ssrfPolicy.allowRfc2544BenchmarkRange` 和 `tools.web.fetch.ssrfPolicy.allowIpv6UniqueLocalRange`。

## 設定網路搜尋

文件和設定流程中的提供者清單按字母順序排列。自動偵測則維持單獨的優先順序。

如果未設定 `provider`，OpenClaw 會依此順序檢查供應商，並使用第一個準備就緒的供應商：

優先檢查需要 API 金鑰的提供者：

1. **Brave** —— `BRAVE_API_KEY` 或 `plugins.entries.brave.config.webSearch.apiKey` （順序 10）
2. **MiniMax Search** —— `MINIMAX_CODE_PLAN_KEY` / `MINIMAX_CODING_API_KEY` / `MINIMAX_OAUTH_TOKEN` / `MINIMAX_API_KEY` 或 `plugins.entries.minimax.config.webSearch.apiKey` （順序 15）
3. **Gemini** —— `plugins.entries.google.config.webSearch.apiKey`、`GEMINI_API_KEY` 或 `models.providers.google.apiKey` （順序 20）
4. **Grok** —— xAI OAuth、`XAI_API_KEY` 或 `plugins.entries.xai.config.webSearch.apiKey` （順序 30）
5. **Kimi** —— `KIMI_API_KEY` / `MOONSHOT_API_KEY` 或 `plugins.entries.moonshot.config.webSearch.apiKey` （順序 40）
6. **Perplexity** -- `PERPLEXITY_API_KEY` / `OPENROUTER_API_KEY` 或 `plugins.entries.perplexity.config.webSearch.apiKey` （順序 50）
7. **Firecrawl** -- `FIRECRAWL_API_KEY` 或 `plugins.entries.firecrawl.config.webSearch.apiKey` （順序 60）
8. **Exa** -- `EXA_API_KEY` 或 `plugins.entries.exa.config.webSearch.apiKey`；可選的 `plugins.entries.exa.config.webSearch.baseUrl` 會覆寫 Exa 端點（順序 65）
9. **Tavily** -- `TAVILY_API_KEY` 或 `plugins.entries.tavily.config.webSearch.apiKey` （順序 70）

之後是不需要金鑰的後備選項：

10. **DuckDuckGo** -- 不需要金鑰的 HTML 後備選項，無需帳戶或 API 金鑰 (順序 100)
11. **Ollama Web Search** -- 當您設定的本地 Ollama 主機可達且使用 `ollama signin` 登入時，作為免金鑰的後備方案；當主機需要時，可以重複使用 Ollama 提供者的 bearer auth，且當使用 `OLLAMA_API_KEY` 設定時，可以呼叫直接 `https://ollama.com` 搜尋（順序 110）
12. **SearXNG** -- `SEARXNG_BASE_URL` 或 `plugins.entries.searxng.config.webSearch.baseUrl` （順序 200）

如果未偵測到任何提供者，它會後備至 Brave (您將會收到缺少金鑰的錯誤，提示您進行設定)。

<Note>
  所有提供者金鑰欄位都支援 SecretRef 物件。對於捆綁的 API 支援的網頁搜尋提供者（包括 Brave、Exa、Firecrawl、
  Gemini、Grok、Kimi、MiniMax、Perplexity 和 Tavily），
  無論是透過 `tools.web.search.provider` 明確選擇提供者，還是透過自動偵測選擇，
  都會解析 `plugins.entries.<plugin>.config.webSearch.apiKey` 下的外掛程式範圍 SecretRefs。
  在自動偵測模式下，OpenClaw 只會解析所選的提供者金鑰——未選擇的 SecretRefs 將保持非啟用狀態，因此您可以
  設定多個提供者，而無需為未使用的提供者支付解析成本。
</Note>

## 設定

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

提供者特定設定（API 金鑰、基底 URL、模式）位於
`plugins.entries.<plugin>.config.webSearch.*` 之下。Gemini 也可以在專用的網頁搜尋設定和 `GEMINI_API_KEY` 之後，重複使用
`models.providers.google.apiKey` 和 `models.providers.google.baseUrl` 作為較低優先級的
後備方案。請參閱提供者頁面以取得範例。
Grok 也可以重複使用來自 `openclaw models auth login
--provider xai --method oauth` 的 xAI OAuth auth 設定檔；API 金鑰設定仍為後備方案。

`tools.web.search.provider` 會根據內建與已安裝外掛清單中宣告的網路搜尋提供者 ID 進行驗證。像是 `"brvae"` 這類拼字錯誤會導致設定驗證失敗，而不是無聲地回退到自動偵測。如果設定的提供者只剩下過期的外掛證據，例如解除安裝第三方外掛後殘留的 `plugins.entries.<plugin>` 區塊，OpenClaw 會保持啟動彈性並回報警告，以便您重新安裝外掛或執行 `openclaw doctor --fix` 來清理過期設定。

`web_fetch` 回退提供者的選擇是分開的：

- 使用 `tools.web.fetch.provider` 選擇
- 或省略該欄位並讓 OpenClaw 從可用的認證中自動偵測第一個準備就緒的網路擷取提供者
- 非沙箱化的 `web_fetch` 可以使用宣告了 `contracts.webFetchProviders` 的已安裝外掛提供者；沙箱化的擷取則僅限內建功能
- 目前內建的網頁擷取提供者是 Firecrawl，在 `plugins.entries.firecrawl.config.webFetch.*` 下設定

當您在 `openclaw onboard` 或 `openclaw configure --section web` 期間選擇 **Kimi** 時，OpenClaw 也可能會詢問：

- Moonshot API 的區域 (`https://api.moonshot.ai/v1` 或 `https://api.moonshot.cn/v1`)
- 預設的 Kimi 網路搜尋模型 (預設為 `kimi-k2.6`)

對於 `x_search`，請設定 `plugins.entries.xai.config.xSearch.*`。它使用與聊天相同的 xAI 設定檔，或是 Grok 網路搜尋所使用的 `XAI_API_KEY` / 外掛網路搜尋憑證。
舊版的 `tools.web.x_search.*` 設定會由 `openclaw doctor --fix` 自動遷移。
當您在 `openclaw onboard` 或 `openclaw configure --section web` 期間選擇 Grok 時，OpenClaw 也可以提供使用相同憑證的選用 `x_search` 設定。
這是 Grok 路徑內的一個獨立後續步驟，而非獨立的頂層網路搜尋提供者選擇。如果您選擇其他提供者，OpenClaw 將不會顯示 `x_search` 提示。

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
  <Tab title="環境變數">
    在 Gateway 程序環境中設定提供者環境變數：

    ```bash
    export BRAVE_API_KEY="YOUR_KEY"
    ```

    若為安裝的 gateway，請將其放入 `~/.openclaw/.env`。
    請參閱 [環境變數](/zh-Hant/help/faq#env-vars-and-env-loading)。

  </Tab>
</Tabs>

## 工具參數

| 參數                  | 描述                                            |
| --------------------- | ----------------------------------------------- |
| `query`               | 搜尋查詢（必填）                                |
| `count`               | 要傳回的結果數量（1-10，預設值：5）             |
| `country`             | 兩個字母的 ISO 國家/地區代碼（例如 "US"、"DE"） |
| `language`            | ISO 639-1 語言代碼（例如 "en"、"de"）           |
| `search_lang`         | 搜尋語言代碼（僅限 Brave）                      |
| `freshness`           | 時間篩選：`day`、`week`、`month` 或 `year`      |
| `date_after`          | 此日期之後的結果 (YYYY-MM-DD)                   |
| `date_before`         | 此日期之前的結果 (YYYY-MM-DD)                   |
| `ui_lang`             | UI 語言代碼（僅限 Brave）                       |
| `domain_filter`       | 網域允許列表/封鎖列表陣列（僅限 Perplexity）    |
| `max_tokens`          | 總內容預算，預設為 25000（僅限 Perplexity）     |
| `max_tokens_per_page` | 每頁 token 限制，預設為 2048（僅限 Perplexity） |

<Warning>
  並非所有參數都適用於所有提供者。Brave 的 `llm-context` 模式 會拒絕 `ui_lang`；`date_before` 也需要 `date_after`，因為 Brave 自訂 新鮮度範圍需要開始日期和結束日期。 Gemini、Grok 和 Kimi 會傳回一個附帶引用的綜合答案。它們 為了共用工具相容性而接受 `count`，但這不會改變 根據事實的答案形狀。Gemini 支援 `freshness`、`date_after` 和 `date_before`，方法是將它們轉換為 Google Search 根據事實的時間範圍。
  當您使用 Sonar/OpenRouter 相容性路徑 (`plugins.entries.perplexity.config.webSearch.baseUrl` / `model` 或 `OPENROUTER_API_KEY`) 時，Perplexity 的行為也相同。 SearXNG 僅針對受信任的私人網路或 loopback 主機接受 `http://`； 公用 SearXNG 端點必須使用 `https://`。 Firecrawl 和 Tavily 僅透過 `web_search` 支援 `query` 和 `count` -- 請使用其專用工具以取得進階選項。
</Warning>

## x_search

`x_search` 使用 xAI 查詢 X（前稱 Twitter）貼文，並傳回附有引用的 AI 綜合答案。它接受自然語言查詢和選用的結構化篩選器。OpenClaw 僅在服務此工具呼叫的請求上啟用內建的 xAI `x_search` 工具。

<Note>xAI 將 `x_search` 記錄為支援關鍵字搜尋、語意搜尋、使用者搜尋和串文擷取。對於每篇貼文的互動統計資料（例如轉發、回覆、書籤或瀏覽次數），建議針對確切的貼文 URL 或狀態 ID 進行精確查詢。廣泛的關鍵字搜尋雖然可能找到正確的貼文，但會傳回較不完整的貼文中繼資料。一個好的做法是：先定位貼文，然後執行第二次 `x_search` 查詢，專注於該特定貼文。</Note>

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
            baseUrl: "https://api.x.ai/v1", // optional, overrides webSearch.baseUrl
            inlineCitations: false,
            maxTurns: 2,
            timeoutSeconds: 30,
            cacheTtlMinutes: 15,
          },
          webSearch: {
            apiKey: "xai-...", // optional if an xAI auth profile or XAI_API_KEY is set
            baseUrl: "https://api.x.ai/v1", // optional shared xAI Responses base URL
          },
        },
      },
    },
  },
}
```

當設定了 `plugins.entries.xai.config.xSearch.baseUrl` 時，`x_search` 會發佈至 `<baseUrl>/responses`。如果省略該欄位，則會回退至 `plugins.entries.xai.config.webSearch.baseUrl`，然後是舊版 `tools.web.search.grok.baseUrl`，最後是公開的 xAI 端點。

### x_search 參數

| 參數                         | 說明                                  |
| ---------------------------- | ------------------------------------- |
| `query`                      | 搜尋查詢（必填）                      |
| `allowed_x_handles`          | 將結果限制為特定的 X 帳號             |
| `excluded_x_handles`         | 排除特定的 X 帳號                     |
| `from_date`                  | 僅包含此日期或之後的貼文 (YYYY-MM-DD) |
| `to_date`                    | 僅包含此日期或之前的貼文 (YYYY-MM-DD) |
| `enable_image_understanding` | 讓 xAI 檢查符合貼文中附加的圖片       |
| `enable_video_understanding` | 讓 xAI 檢查符合貼文中附加的影片       |

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

如果您使用工具設定檔或允許清單，請加入 `web_search`、`x_search` 或 `group:web`：

```json5
{
  tools: {
    allow: ["web_search", "x_search"],
    // or: allow: ["group:web"]  (includes web_search, x_search, and web_fetch)
  },
}
```

## 相關

- [Web Fetch](/zh-Hant/tools/web-fetch) -- 擷取 URL 並提取可讀內容
- [Web Browser](/zh-Hant/tools/browser) -- 針對 JS 密集型網站的完整瀏覽器自動化
- [Grok Search](/zh-Hant/tools/grok-search) -- 將 Grok 作為 `web_search` 提供者
- [Ollama Web Search](/zh-Hant/tools/ollama-search) -- 透過您的 Ollama 主機進行免金鑰的網路搜尋
