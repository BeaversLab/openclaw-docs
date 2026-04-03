---
summary: "SearXNG 網頁搜尋 —— 自架、無金鑰的元搜尋提供者"
read_when:
  - You want a self-hosted web search provider
  - You want to use SearXNG for web_search
  - You need a privacy-focused or air-gapped search option
title: "SearXNG 搜尋"
---

# SearXNG 搜尋

OpenClaw 支援 [SearXNG](https://docs.searxng.org/) 作為 **自託管、
無需金鑰** 的 `web_search` 提供者。SearXNG 是一個開源元搜尋引擎，
能聚合 Google、Bing、DuckDuckGo 及其他來源的結果。

優點：

- **免費且無限制** -- 不需要 API 金鑰或商業訂閱
- **隱私 / 隔離網路** -- 查詢永遠不會離開您的網路
- **隨處可用** -- 商業搜尋 API 沒有區域限制

## 設定

<Steps>
  <Step title="Run a SearXNG instance">
    ```bash
    docker run -d -p 8888:8080 searxng/searxng
    ```

    Or use any existing SearXNG deployment you have access to. See the
    [SearXNG documentation](https://docs.searxng.org/) for production setup.

  </Step>
  <Step title="Configure">
    ```bash
    openclaw configure --section web
    # Select "searxng" as the provider
    ```

    或者設定環境變數並讓自動偵測找到它：

    ```bash
    export SEARXNG_BASE_URL="http://localhost:8888"
    ```

  </Step>
</Steps>

## Config

```json5
{
  tools: {
    web: {
      search: {
        provider: "searxng",
      },
    },
  },
}
```

SearXNG 實例的插件級設定：

```json5
{
  plugins: {
    entries: {
      searxng: {
        config: {
          webSearch: {
            baseUrl: "http://localhost:8888",
            categories: "general,news", // optional
            language: "en", // optional
          },
        },
      },
    },
  },
}
```

`baseUrl` 欄位也接受 SecretRef 物件。

## 環境變數

將 `SEARXNG_BASE_URL` 設定為 config 的替代方案：

```bash
export SEARXNG_BASE_URL="http://localhost:8888"
```

當設定 `SEARXNG_BASE_URL` 且未設定明確的提供者時，自動偵測會自動選擇 SearXNG（優先順序最低——任何有金鑰的 API 支援提供者會優先獲選）。

## 外掛程式設定參考

| 欄位         | 描述                                                |
| ------------ | --------------------------------------------------- |
| `baseUrl`    | 您的 SearXNG 實例的基礎 URL (必填)                  |
| `categories` | 逗號分隔的類別，例如 `general`、`news` 或 `science` |
| `language`   | 結果的語言代碼，例如 `en`、`de` 或 `fr`             |

## 注意事項

- **JSON API** -- 使用 SearXNG 原生的 `format=json` 端點，而非 HTML 抓取
- **無需 API 金鑰** -- 可直接搭配任何 SearXNG 實例使用
- **自動偵測順序** -- SearXNG 在自動偵測中排在最後（順序 200），
  因此任何需要金鑰的 API 支援供應商都優先於 SearXNG，且 SearXNG 也位於 DuckDuckGo（順序 100）之後
- **自託管** -- 您控制實例、查詢和上游搜尋引擎
- **類別** 若未設定，預設為 `general`

<Tip>若要讓 SearXNG JSON API 運作，請確保您的 SearXNG 實例在其 `settings.yml` 中的 `search.formats` 下啟用了 `json` 格式。</Tip>

## 相關

- [Web Search 概觀](/en/tools/web) -- 所有供應商與自動偵測
- [DuckDuckGo Search](/en/tools/duckduckgo-search) -- 另一個無需金鑰的後備方案
- [Brave Search](/en/tools/brave-search) -- 具有免費層級的結構化結果
