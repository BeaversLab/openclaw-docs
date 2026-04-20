---
summary: "DuckDuckGo 網路搜尋 -- 無需金鑰的備用提供者（實驗性、基於 HTML）"
read_when:
  - You want a web search provider that requires no API key
  - You want to use DuckDuckGo for web_search
  - You need a zero-config search fallback
title: "DuckDuckGo 搜尋"
---

# DuckDuckGo 搜尋

OpenClaw 支援 DuckDuckGo 作為 **免金鑰** 的 `web_search` 提供者。不需要 API
金鑰或帳戶。

<Warning>DuckDuckGo 是一個**實驗性、非官方**的整合，它從 DuckDuckGo 的非 JavaScript 搜尋頁面擷取結果——而非官方 API。請預期可能會因為機器人驗證頁面或 HTML 變更而偶爾無法運作。</Warning>

## 設定

不需要 API 金鑰——只需將 DuckDuckGo 設定為您的提供者：

<Steps>
  <Step title="Configure">```bash openclaw configure --section web # Select "duckduckgo" as the provider ```</Step>
</Steps>

## Config

```json5
{
  tools: {
    web: {
      search: {
        provider: "duckduckgo",
      },
    },
  },
}
```

Optional plugin-level settings for region and SafeSearch:

```json5
{
  plugins: {
    entries: {
      duckduckgo: {
        config: {
          webSearch: {
            region: "us-en", // DuckDuckGo region code
            safeSearch: "moderate", // "strict", "moderate", or "off"
          },
        },
      },
    },
  },
}
```

## Tool parameters

| Parameter    | Description                                                |
| ------------ | ---------------------------------------------------------- |
| `query`      | Search query (required)                                    |
| `count`      | Results to return (1-10, default: 5)                       |
| `region`     | DuckDuckGo region code (e.g. `us-en`, `uk-en`, `de-de`)    |
| `safeSearch` | SafeSearch level: `strict`, `moderate` (default), or `off` |

Region and SafeSearch can also be set in plugin config (see above) — tool
parameters override config values per-query.

## Notes

- **No API key** — works out of the box, zero configuration
- **Experimental** — gathers results from DuckDuckGo's non-JavaScript HTML
  search pages, not an official API or SDK
- **Bot-challenge risk** — DuckDuckGo may serve CAPTCHAs or block requests
  under heavy or automated use
- **HTML parsing** — results depend on page structure, which can change without
  notice
- **Auto-detection order** — DuckDuckGo is the first key-free fallback
  (order 100) in auto-detection. API-backed providers with configured keys run
  first, then Ollama Web Search (order 110), then SearXNG (order 200)
- **SafeSearch defaults to moderate** when not configured

<Tip>For production use, consider [Brave Search](/zh-Hant/tools/brave-search) (free tier available) or another API-backed provider.</Tip>

## Related

- [Web Search overview](/zh-Hant/tools/web) -- all providers and auto-detection
- [Brave Search](/zh-Hant/tools/brave-search) -- structured results with free tier
- [Exa Search](/zh-Hant/tools/exa-search) -- neural search with content extraction
