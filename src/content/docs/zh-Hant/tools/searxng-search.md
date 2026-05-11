---
summary: "SearXNG 網頁搜尋 —— 自架、無金鑰的元搜尋提供者"
read_when:
  - You want a self-hosted web search provider
  - You want to use SearXNG for web_search
  - You need a privacy-focused or air-gapped search option
title: "SearXNG 搜尋"
---

OpenClaw 支援將 [SearXNG](https://docs.searxng.org/) 作為一個**自託管、
免金鑰**的 `web_search` 提供者。SearXNG 是一個開源元搜尋引擎，
能夠聚合來自 Google、Bing、DuckDuckGo 和其他來源的結果。

優點：

- **免費且無限制** -- 不需要 API 金鑰或商業訂閱
- **隱私 / 隔離網路** -- 查詢絕不會離開您的網路
- **隨處可用** -- 商業搜尋 API 沒有區域限制

## 設定

<Steps>
  <Step title="執行 SearXNG 執行個體">
    ```bash
    docker run -d -p 8888:8080 searxng/searxng
    ```

    或者使用您有權存取的任何現有 SearXNG 部署。請參閱
    [SearXNG 文件](https://docs.searxng.org/) 以了解生產環境設定。

  </Step>
  <Step title="設定">
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

## 設定

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

SearXNG 執行個體的外掛層級設定：

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

傳輸規則：

- `https://` 適用於公開或私有的 SearXNG 主機
- `http://` 僅接受來自信任的私人網路或 loopback 主機
- 公開的 SearXNG 主機必須使用 `https://`

## 環境變數

設定 `SEARXNG_BASE_URL` 作為設定的替代方案：

```bash
export SEARXNG_BASE_URL="http://localhost:8888"
```

當設定了 `SEARXNG_BASE_URL` 且未設定明確的提供者時，自動偵測
會自動選擇 SearXNG（優先順序最低 -- 任何具有金鑰的 API 支援提供者
會優先中選）。

## 外掛設定參考

| 欄位         | 說明                                                  |
| ------------ | ----------------------------------------------------- |
| `baseUrl`    | 您 SearXNG 執行個體的基礎 URL（必填）                 |
| `categories` | 以逗號分隔的類別，例如 `general`、`news` 或 `science` |
| `language`   | 結果的語言代碼，例如 `en`、`de` 或 `fr`               |

## 注意事項

- **JSON API** -- 使用 SearXNG 原生的 `format=json` 端點，而非 HTML 抓取
- **無需 API 金鑰** -- 可直接與任何 SearXNG 實例搭配使用
- **基礎 URL 驗證** -- `baseUrl` 必須是有效的 `http://` 或 `https://`
  URL；公開主機必須使用 `https://`
- **自動檢測順序** -- SearXNG 在自動檢測中排於最後（順序 200）。
  具有已設定金鑰的 API 支援供應商會優先執行，接著是
  DuckDuckGo（順序 100），然後是 Ollama Web Search（順序 110）
- **自託管** -- 您控制實例、查詢和上游搜尋引擎
- **類別** 在未設定時預設為 `general`

<Tip>若要讓 SearXNG JSON API 運作，請確保您的 SearXNG 實例已在其 `settings.yml` 中的 `search.formats` 下啟用 `json` 格式。</Tip>

## 相關

- [Web Search 概觀](/zh-Hant/tools/web) -- 所有供應商與自動檢測
- [DuckDuckGo 搜尋](/zh-Hant/tools/duckduckgo-search) -- 另一個免金鑰的備選方案
- [Brave 搜尋](/zh-Hant/tools/brave-search) -- 具有免費層級的結構化結果
