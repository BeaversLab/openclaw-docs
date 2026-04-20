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

可選的外掛層級設定用於地區和安全搜尋：

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

| 參數         | 描述                                                  |
| ------------ | ----------------------------------------------------- |
| `query`      | 搜尋查詢（必填）                                      |
| `count`      | 要返回的結果數（1-10，預設：5）                       |
| `region`     | DuckDuckGo 地區代碼（例如 `us-en`、`uk-en`、`de-de`） |
| `safeSearch` | 安全搜尋等級：`strict`、`moderate`（預設）或 `off`    |

地區和安全搜尋也可以在外掛設定中設定（見上文）——工具參數會在每次查詢時覆蓋設定值。

## 注意事項

- **無需 API 金鑰**——開箱即用，零設定
- **實驗性**——從 DuckDuckGo 的非 JavaScript HTML
  搜尋頁面收集結果，而非官方 API 或 SDK
- **機器人驗證風險**——DuckDuckGo 在大量或自動化使用下
  可能會提供驗證碼或阻擋請求
- **HTML 解析**——結果取決於頁面結構，可能會在無預警的情況下
  變更
- **自動檢測順序** — DuckDuckGo 是自動檢測中的第一個免金鑰備選方案
  (順序 100)。已設定金鑰的 API 支援提供者會優先執行，接著是 Ollama Web Search (順序 110)，然後是 SearXNG (順序 200)
- 未設定時，**SafeSearch 預設為中等**

<Tip>若用於生產環境，請考慮使用 [Brave Search](/zh-Hant/tools/brave-search) (提供免費層級) 或其他支援 API 的提供者。</Tip>

## 相關

- [網路搜尋概覽](/zh-Hant/tools/web) -- 所有提供者與自動偵測
- [Brave Search](/zh-Hant/tools/brave-search) -- 提供免費層的結構化結果
- [Exa Search](/zh-Hant/tools/exa-search) —— 具有內容提取功能的神經網絡搜索
