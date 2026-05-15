---
summary: "DuckDuckGo 網路搜尋 -- 無需金鑰的備用提供者（實驗性、基於 HTML）"
read_when:
  - You want a web search provider that requires no API key
  - You want to use DuckDuckGo for web_search
  - You need a zero-config search fallback
title: "DuckDuckGo 搜尋"
---

OpenClaw 支援 DuckDuckGo 作為 **免金鑰** (key-free) 的 `web_search` 提供者。不需要 API
金鑰或帳戶。

<Warning>DuckDuckGo 是一個**實驗性、非官方**的整合，它從 DuckDuckGo 的非 JavaScript 搜尋頁面擷取結果——而非使用官方 API。請預期可能會因為機器人驗證頁面或 HTML 變更而偶發中斷。</Warning>

## 設定

無需 API 金鑰——只需將 DuckDuckGo 設定為您的提供者：

<Steps>
  <Step title="設定">```bash openclaw configure --section web # Select "duckduckgo" as the provider ```</Step>
</Steps>

## 設定

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

外掛層級的可選設定，用於區域和安全搜尋：

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

## 工具參數

<ParamField path="query" type="string" required>
  搜尋查詢。
</ParamField>

<ParamField path="count" type="number" default="5">
  要傳回的結果數量 (1-10)。
</ParamField>

<ParamField path="region" type="string">
  DuckDuckGo 區域代碼 (例如 `us-en`, `uk-en`, `de-de`)。
</ParamField>

<ParamField path="safeSearch" type="'strict' | 'moderate' | 'off'" default="moderate">
  安全搜尋等級。
</ParamField>

Region 和 SafeSearch 也可以在插件設定中設定（見上文）——工具參數會依據每次查詢覆蓋設定值。

## 備註

- **無需 API 金鑰**——開箱即用，零設定
- **實驗性質**——從 DuckDuckGo 的非 JavaScript HTML 搜尋頁面收集結果，並非使用官方 API 或 SDK
- **機器人驗證風險**——DuckDuckGo 可能會在頻繁或自動化使用時提供 CAPTCHA 驗證或封鎖請求
- **HTML 解析**——結果取決於頁面結構，該結構可能會在無預警的情況下變更
- **自動偵測順序**——DuckDuckGo 是自動偵測中第一個免金鑰的備選方案（順序 100）。已設定金鑰的 API 支援提供者會先執行，然後是 Ollama Web Search（順序 110），接著是 SearXNG（順序 200）
- **未設定時，安全搜尋預設為中等**

<Tip>若用於正式環境，建議考慮 [Brave Search](/zh-Hant/tools/brave-search) (提供免費層) 或其他支援 API 的提供者。</Tip>

## 相關

- [Web Search 概述](/zh-Hant/tools/web) -- 所有供應商與自動偵測
- [Brave Search](/zh-Hant/tools/brave-search) -- 具有免費層級的結構化結果
- [Exa Search](/zh-Hant/tools/exa-search) -- 具有內容提取功能的神經搜尋
