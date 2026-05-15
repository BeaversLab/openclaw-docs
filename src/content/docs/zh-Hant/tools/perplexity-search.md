---
summary: "Perplexity Search API 和 Sonar/OpenRouter 的 web_search 相容性"
read_when:
  - You want to use Perplexity Search for web search
  - You need PERPLEXITY_API_KEY or OPENROUTER_API_KEY setup
title: "Perplexity 搜尋"
---

OpenClaw 支援將 Perplexity Search API 作為 `web_search` 提供者。
它會傳回包含 `title`、`url` 和 `snippet` 欄位的結構化結果。

為了相容性，OpenClaw 也支援舊版的 Perplexity Sonar/OpenRouter 設定。
如果您使用 `OPENROUTER_API_KEY`、在 `plugins.entries.perplexity.config.webSearch.apiKey` 中設定 `sk-or-...` 金鑰，或設定 `plugins.entries.perplexity.config.webSearch.baseUrl` / `model`，提供者會切換至 chat-completions 路徑，並傳回附帶引用文獻的 AI 綜合答案，而非結構化的 Search API 結果。

## 取得 Perplexity API 金鑰

1. 在 [perplexity.ai/settings/api](https://www.perplexity.ai/settings/api) 建立 Perplexity 帳戶
2. 在儀表板中產生 API 金鑰
3. 將金鑰儲存在設定中，或在 Gateway 環境中設定 `PERPLEXITY_API_KEY`。

## OpenRouter 相容性

如果您之前已經使用 OpenRouter 來存取 Perplexity Sonar，請保留 `provider: "perplexity"` 並在 Gateway 環境中設定 `OPENROUTER_API_KEY`，或者將 `sk-or-...` 金鑰儲存在 `plugins.entries.perplexity.config.webSearch.apiKey` 中。

選用的相容性控制項：

- `plugins.entries.perplexity.config.webSearch.baseUrl`
- `plugins.entries.perplexity.config.webSearch.model`

## 設定範例

### 原生 Perplexity Search API

```json5
{
  plugins: {
    entries: {
      perplexity: {
        config: {
          webSearch: {
            apiKey: "pplx-...",
          },
        },
      },
    },
  },
  tools: {
    web: {
      search: {
        provider: "perplexity",
      },
    },
  },
}
```

### OpenRouter / Sonar 相容性

```json5
{
  plugins: {
    entries: {
      perplexity: {
        config: {
          webSearch: {
            apiKey: "<openrouter-api-key>",
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
        provider: "perplexity",
      },
    },
  },
}
```

## 在哪裡設定金鑰

**透過設定：** 執行 `openclaw configure --section web`。它會將金鑰儲存在
`~/.openclaw/openclaw.json` 下的 `plugins.entries.perplexity.config.webSearch.apiKey` 中。
該欄位也接受 SecretRef 物件。

**透過環境變數：** 在 Gateway 程序環境中設定 `PERPLEXITY_API_KEY` 或 `OPENROUTER_API_KEY`。
如果是安裝的 gateway，請將其放入
`~/.openclaw/.env` (或您的服務環境) 中。請參閱 [Env vars](/zh-Hant/help/faq#env-vars-and-env-loading)。

如果設定了 `provider: "perplexity"` 且 Perplexity 金鑰 SecretRef 未解析且沒有環境變數後援，啟動/重新載入將會快速失敗。

## 工具參數

這些參數適用於原生 Perplexity Search API 路徑。

<ParamField path="query" type="string" required>
  搜尋查詢。
</ParamField>

<ParamField path="count" type="number" default="5">
  要返回的結果數量 (1-10)。
</ParamField>

<ParamField path="country" type="string">
  兩字母 ISO 國家代碼（例如 `US`、`DE`）。
</ParamField>

<ParamField path="language" type="string">
  ISO 639-1 語言代碼（例如 `en`、`de`、`fr`）。
</ParamField>

<ParamField path="freshness" type="'day' | 'week' | 'month' | 'year'">
  時間過濾器 - `day` 為 24 小時。
</ParamField>

<ParamField path="date_after" type="string">
  僅限此日期之後發布的結果 (`YYYY-MM-DD`)。
</ParamField>

<ParamField path="date_before" type="string">
  僅限此日期之前發布的結果 (`YYYY-MM-DD`)。
</ParamField>

<ParamField path="domain_filter" type="string[]">
  網域允許清單/拒絕清單陣列（最多 20 個）。
</ParamField>

<ParamField path="max_tokens" type="number" default="25000">
  總內容預算（最多 1000000）。
</ParamField>

<ParamField path="max_tokens_per_page" type="number" default="2048">
  每頁 token 限制。
</ParamField>

對於舊版 Sonar/OpenRouter 相容性路徑：

- 接受 `query`、`count` 和 `freshness`
- `count` 在此僅作相容性用途；回應仍是帶有引用文獻的單一綜合
  答案，而非 N 個結果的清單
- 僅限搜尋 API 的過濾器（例如 `country`、`language`、`date_after`、
  `date_before`、`domain_filter`、`max_tokens` 和 `max_tokens_per_page`）
  會傳回明確的錯誤

**範例：**

```javascript
// Country and language-specific search
await web_search({
  query: "renewable energy",
  country: "DE",
  language: "de",
});

// Recent results (past week)
await web_search({
  query: "AI news",
  freshness: "week",
});

// Date range search
await web_search({
  query: "AI developments",
  date_after: "2024-01-01",
  date_before: "2024-06-30",
});

// Domain filtering (allowlist)
await web_search({
  query: "climate research",
  domain_filter: ["nature.com", "science.org", ".edu"],
});

// Domain filtering (denylist - prefix with -)
await web_search({
  query: "product reviews",
  domain_filter: ["-reddit.com", "-pinterest.com"],
});

// More content extraction
await web_search({
  query: "detailed AI research",
  max_tokens: 50000,
  max_tokens_per_page: 4096,
});
```

### 網域過濾規則

- 每個過濾器最多 20 個網域
- 無法在同一個請求中混合使用允許清單和拒絕清單
- 使用 `-` 前綴表示拒絕清單條目（例如，`["-reddit.com"]`）

## 注意事項

- Perplexity Search API 會傳回結構化的網頁搜尋結果（`title`、`url`、`snippet`）
- 使用 OpenRouter 或明確設定 `plugins.entries.perplexity.config.webSearch.baseUrl` / `model` 會為了相容性將 Perplexity 切換回 Sonar 聊天完成模式
- Sonar/OpenRouter 相容模式會傳回一個帶有引用文獻的綜合答案，而不是結構化的結果列
- 結果預設會快取 15 分鐘（可透過 `cacheTtlMinutes` 設定）

## 相關內容

<CardGroup cols={2}>
  <Card title="網路搜尋概覽" href="/zh-Hant/tools/web" icon="globe">
    所有提供者及自動偵測規則。
  </Card>
  <Card title="Brave 搜尋" href="/zh-Hant/tools/brave-search" icon="shield">
    具有國家和語言篩選的結構化結果。
  </Card>
  <Card title="Exa 搜尋" href="/zh-Hant/tools/exa-search" icon="magnifying-glass">
    具有內容提取功能的神經搜尋。
  </Card>
  <Card title="Perplexity Search API 文件" href="https://docs.perplexity.ai/docs/search/quickstart" icon="arrow-up-right-from-square">
    官方 Perplexity Search API 快速入門與參考資料。
  </Card>
</CardGroup>
