---
summary: "Exa AI 搜尋 -- 具有內容提取功能的神經和關鍵字搜尋"
read_when:
  - You want to use Exa for web_search
  - You need an EXA_API_KEY
  - You want neural search or content extraction
title: "Exa 搜尋"
---

# Exa 搜尋

OpenClaw 支援將 [Exa AI](https://exa.ai/) 作為 `web_search` 提供商。Exa
提供神經、關鍵字和混合搜尋模式，並具有內建內容
提取功能（亮點、文字、摘要）。

## 取得 API 金鑰

<Steps>
  <Step title="建立帳號">
    在 [exa.ai](https://exa.ai/) 註冊，並從您的
    儀表板生成 API 金鑰。
  </Step>
  <Step title="儲存金鑰">
    在 Gateway 環境中設定 `EXA_API_KEY`，或透過以下方式進行設定：

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
對於 gateway 安裝，將其放入 `~/.openclaw/.env` 中。

## 工具參數

| 參數          | 描述                                                                      |
| ------------- | ------------------------------------------------------------------------- |
| `query`       | 搜尋查詢（必填）                                                          |
| `count`       | 要傳回的結果數 (1-100)                                                    |
| `type`        | 搜尋模式：`auto`、`neural`、`fast`、`deep`、`deep-reasoning` 或 `instant` |
| `freshness`   | 時間過濾器：`day`、`week`、`month` 或 `year`                              |
| `date_after`  | 此日期之後的結果 (YYYY-MM-DD)                                             |
| `date_before` | 此日期之前的結果 (YYYY-MM-DD)                                             |
| `contents`    | 內容提取選項（見下文）                                                    |

### 內容提取

Exa 可以連同搜尋結果一起傳回提取的內容。傳遞一個 `contents`
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

| 內容選項     | 類型                                                                  | 描述             |
| ------------ | --------------------------------------------------------------------- | ---------------- |
| `text`       | `boolean \| { maxCharacters }`                                        | 提取完整頁面文字 |
| `highlights` | `boolean \| { maxCharacters, query, numSentences, highlightsPerUrl }` | 提取關鍵句子     |
| `summary`    | `boolean \| { query }`                                                | AI 生成的摘要    |

### 搜尋模式

| 模式             | 描述                     |
| ---------------- | ------------------------ |
| `auto`           | Exa 選擇最佳模式（預設） |
| `neural`         | 語義/意義為基礎的搜尋    |
| `fast`           | 快速關鍵字搜尋           |
| `deep`           | 徹底的深度搜尋           |
| `deep-reasoning` | 帶有推理的深度搜尋       |
| `instant`        | 最快結果                 |

## 備註

- 如果未提供 `contents` 選項，Exa 預設為 `{ highlights: true }`
  因此結果包含關鍵句子摘錄
- 結果會在可用時保留 Exa API 回應中的 `highlightScores` 和 `summary` 欄位
- 結果描述優先從 highlights 解析，然後是 summary，接著是
  full text — 取決於何者可用
- `freshness` 和 `date_after`/`date_before` 不能組合使用 — 請使用一種
  時間篩選模式
- 每次查詢最多可傳回 100 個結果（受限於 Exa 搜尋類型
  限制）
- 結果預設快取 15 分鐘（可透過
  `cacheTtlMinutes` 設定）
- Exa 是官方 API 整合，提供結構化 JSON 回應

## 相關

- [Web Search 概述](/zh-Hant/tools/web) -- 所有提供者與自動偵測
- [Brave Search](/zh-Hant/tools/brave-search) -- 具有國家/語言篩選的結構化結果
- [Perplexity Search](/zh-Hant/tools/perplexity-search) -- 具有網域篩選的結構化結果
