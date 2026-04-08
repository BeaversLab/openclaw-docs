---
summary: "透過 Google 搜尋接採進行 Gemini 網頁搜尋"
read_when:
  - You want to use Gemini for web_search
  - You need a GEMINI_API_KEY
  - You want Google Search grounding
title: "Gemini 搜尋"
---

# Gemini 搜尋

OpenClaw 支援內建 Google Search 搜尋基礎
[Google Search grounding](https://ai.google.dev/gemini-api/docs/grounding)
的 Gemini 模型，這會根據即時 Google 搜尋結果傳回附上引用的 AI 綜合回答。

## 取得 API 金鑰

<Steps>
  <Step title="建立金鑰">
    前往 [Google AI Studio](https://aistudio.google.com/apikey) 並建立一個
    API 金鑰。
  </Step>
  <Step title="儲存金鑰">
    在 Gateway 環境中設定 `GEMINI_API_KEY`，或透過以下方式進行設定：

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
      google: {
        config: {
          webSearch: {
            apiKey: "AIza...", // optional if GEMINI_API_KEY is set
            model: "gemini-2.5-flash", // default
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
若為 gateway 安裝，請將其置於 `~/.openclaw/.env` 中。

## 運作方式

不同於傳統搜尋供應商傳回連結列表和摘要片段，
Gemini 使用 Google 搜尋接採來產生包含內嵌引用的 AI 綜合回答。結果同時包含綜合回答和來源
URL。

- 來自 Gemini 接採的引用 URL 會自動從 Google
  重新導向 URL 解析為直接 URL。
- 在傳回最終引用 URL 之前，重新導向解析會使用 SSRF 防護路徑（HEAD + 重新導向檢查 +
  http/https 驗證）。
- 重新導向解析使用嚴格的 SSRF 預設值，因此對
  私有/內部目標的重新導向會被封鎖。

## 支援的參數

Gemini 搜尋支援 `query`。

為了相容共用的 `web_search`，接受使用 `count`，但 Gemini grounding
仍然會傳回一個附上引用的綜合回答，而非 N 個結果的清單。

不支援供應商專屬的篩選器，例如 `country`、`language`、`freshness` 和
`domain_filter`。

## 模型選擇

預設模型為 `gemini-2.5-flash` (快速且具成本效益)。任何支援 grounding 的
Gemini 模型皆可透過 `plugins.entries.google.config.webSearch.model` 使用。

## 相關

- [Web Search 概覽](/en/tools/web) -- 所有供應商與自動偵測
- [Brave Search](/en/tools/brave-search) -- 附摘要的結構化結果
- [Perplexity Search](/en/tools/perplexity-search) -- 結構化結果 + 內容擷取
