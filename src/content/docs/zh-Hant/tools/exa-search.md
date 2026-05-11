---
summary: "Exa AI 搜尋 -- 具有內容提取功能的神經和關鍵字搜尋"
read_when:
  - You want to use Exa for web_search
  - You need an EXA_API_KEY
  - You want neural search or content extraction
title: "Exa 搜尋"
---

OpenClaw 支援將 [Exa AI](https://exa.ai/) 作為 `web_search` 提供商。Exa
提供神經、關鍵字和混合搜尋模式，並內建內容
提取功能（亮點、文字、摘要）。

## 取得 API 金鑰

<Steps>
  <Step title="建立帳號">
    前往 [exa.ai](https://exa.ai/) 註冊，並從您的
儀表板生成 API 金鑰。
  </Step>
  <Step title="儲存金鑰">
    在 Gateway 環境中設定 `EXA_API_KEY`，或透過以下方式設定：

    ```bash
    openclaw configure --section web
    ```

  </Step>
</Steps>

## 設定

```json5
{
  plugins: {
    entries: {
      exa: {
        config: {
          webSearch: {
            apiKey: "exa-...", // optional if EXA_API_KEY is set
          },
        },
      },
    },
  },
  tools: {
    web: {
      search: {
        provider: "exa",
      },
    },
  },
}
```

**環境變數替代方案：** 在 Gateway 環境中設定 `EXA_API_KEY`。
若是安裝 Gateway，請將其置於 `~/.openclaw/.env` 中。

## 工具參數

<ParamField path="query" type="string" required>
  搜尋查詢。
</ParamField>

<ParamField path="count" type="number">
  要傳回的結果數量（1–100）。
</ParamField>

<ParamField path="type" type="'auto' | 'neural' | 'fast' | 'deep' | 'deep-reasoning' | 'instant'">
  搜尋模式。
</ParamField>

<ParamField path="freshness" type="'day' | 'week' | 'month' | 'year'">
  時間篩選器。
</ParamField>

<ParamField path="date_after" type="string">
  此日期之後的結果（`YYYY-MM-DD`）。
</ParamField>

<ParamField path="date_before" type="string">
  此日期之前的結果（`YYYY-MM-DD`）。
</ParamField>

<ParamField path="contents" type="object">
  內容提取選項（請見下文）。
</ParamField>

### 內容提取

Exa 可以傳回與搜尋結果一併顯示的擷取內容。傳遞一個 `contents`
物件以啟用：

```javascript
await web_search({
  query: "transformer architecture explained",
  type: "neural",
  contents: {
    text: true, // full page text
    highlights: { numSentences: 3 }, // key sentences
    summary: true, // AI summary
  },
});
```

| 內容選項     | 類型                                                                  | 說明             |
| ------------ | --------------------------------------------------------------------- | ---------------- |
| `text`       | `boolean \| { maxCharacters }`                                        | 擷取完整頁面文字 |
| `highlights` | `boolean \| { maxCharacters, query, numSentences, highlightsPerUrl }` | 擷取關鍵句子     |
| `summary`    | `boolean \| { query }`                                                | AI 生成的摘要    |

### 搜尋模式

| 模式             | 說明                     |
| ---------------- | ------------------------ |
| `auto`           | Exa 選擇最佳模式（預設） |
| `neural`         | 語義/基於意義的搜尋      |
| `fast`           | 快速關鍵字搜尋           |
| `deep`           | 徹底的深度搜尋           |
| `deep-reasoning` | 帶有推論的深度搜尋       |
| `instant`        | 最快的結果               |

## 註記

- 如果未提供 `contents` 選項，Exa 預設為 `{ highlights: true }`
  因此結果包含關鍵句子摘錄
- 結果會在可用時保留 Exa API 回應中的 `highlightScores` 和 `summary` 欄位
- 結果描述會依序從重點、摘要和全文解析——以可用的為準
- `freshness` 和 `date_after`/`date_before` 不能結合 — 請使用一種
  時間過濾模式
- 每次查詢最多可回傳 100 個結果（受 Exa 搜尋類型限制）
- 結果預設快取 15 分鐘（可透過 `cacheTtlMinutes` 設定）
- Exa 是提供結構化 JSON 回應的官方 API 整合

## 相關

- [網頁搜尋概覽](/zh-Hant/tools/web) -- 所有供應商與自動偵測
- [Brave 搜尋](/zh-Hant/tools/brave-search) -- 具有國家/語言過濾器的結構化結果
- [Perplexity 搜尋](/zh-Hant/tools/perplexity-search) -- 具有網域過濾器的結構化結果
