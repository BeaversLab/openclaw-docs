---
summary: "透過 Google 搜尋接採進行 Gemini 網頁搜尋"
read_when:
  - You want to use Gemini for web_search
  - You need a GEMINI_API_KEY
  - You want Google Search grounding
title: "Gemini 搜尋"
---

OpenClaw 支援內建
[Google Search grounding](https://ai.google.dev/gemini-api/docs/grounding) 的 Gemini 模型，
這會傳回由即時 Google 搜尋結果與引用來源所支援的 AI 綜合答案。

## 取得 API 金鑰

<Steps>
  <Step title="建立金鑰">
    前往 [Google AI Studio](https://aistudio.google.com/apikey) 並建立一個
    API 金鑰。
  </Step>
  <Step title="儲存金鑰">
    在 Gateway 環境中設定 `GEMINI_API_KEY`，或透過以下方式設定：

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

**環境替代方案：** 在 Gateway 環境中設定 `GEMINI_API_KEY`。
若是 gateway 安裝，請將其置於 `~/.openclaw/.env` 中。

## 運作方式

不同於傳統搜尋提供者傳回連結和摘要列表，
Gemini 使用 Google Search grounding 產生具有
內文引用的 AI 綜合答案。結果同時包含綜合答案與來源
URL。

- 來自 Gemini grounding 的引用 URL 會從 Google
  重新導向 URL 自動解析為直接 URL。
- 在傳回最終引用 URL 之前，重新導向解析會使用 SSRF 防護路徑 (HEAD + 重新導向檢查 +
  http/https 驗證)。
- 重新導向解析使用嚴格的 SSRF 預設值，因此會封鎖
  對私人/內部目標的重新導向。

## 支援的參數

Gemini 搜尋支援 `query`。

接受 `count` 以相容共用 `web_search`，但 Gemini grounding
仍會傳回一個帶有引用的綜合答案，而非 N 個結果的
列表。

不支援特定提供者的過濾器，如 `country`、`language`、`freshness` 和
`domain_filter`。

## 模型選擇

預設模型為 `gemini-2.5-flash` (快速且具成本效益)。任何支援 grounding 的 Gemini
模型皆可透過
`plugins.entries.google.config.webSearch.model` 使用。

## 相關

- [Web Search 概覽](/zh-Hant/tools/web) -- 所有提供者與自動偵測
- [Brave Search](/zh-Hant/tools/brave-search) -- 附帶摘要的結構化結果
- [Perplexity Search](/zh-Hant/tools/perplexity-search) -- 結構化結果 + 內容擷取
