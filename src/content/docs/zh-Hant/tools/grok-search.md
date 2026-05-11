---
summary: "透過 xAI 網路回應進行 Grok 網路搜尋"
read_when:
  - You want to use Grok for web_search
  - You need an XAI_API_KEY for web search
title: "Grok 搜尋"
---

OpenClaw 支援將 Grok 作為 `web_search` 提供者，使用 xAI 的網路基礎回應來產生 AI 合成的答案，並附上即時搜尋結果與引用。

同一個 `XAI_API_KEY` 也可以驅動內建的 X（前身為 Twitter）貼文搜尋 `x_search` 工具。如果您將金鑰儲存在 `plugins.entries.xai.config.webSearch.apiKey` 下，OpenClaw 現在也會將其作為內建 xAI 模型提供者的備援來重複使用。

對於貼文層級的 X 指標，例如轉發、回覆、書籤或瀏覽次數，請優先使用 `x_search` 並搭配精確的貼文 URL 或狀態 ID，而非廣泛的搜尋查詢。

## 上架與設定

如果您在以下期間選擇 **Grok**：

- `openclaw onboard`
- `openclaw configure --section web`

OpenClaw 可以顯示個別的後續步驟，以使用相同的 `XAI_API_KEY` 來啟用 `x_search`。該後續步驟：

- 僅在您為 `web_search` 選擇 Grok 後才會出現
- 並非獨立的頂層網路搜尋提供者選項
- 可以選擇在相同的流程中設定 `x_search` 模型

如果您略過此步驟，您稍後可以在設定中啟用或變更 `x_search`。

## 取得 API 金鑰

<Steps>
  <Step title="建立金鑰">
    從 [xAI](https://console.x.ai/) 取得 API 金鑰。
  </Step>
  <Step title="儲存金鑰">
    在 Gateway 環境中設定 `XAI_API_KEY`，或透過以下方式設定：

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
      xai: {
        config: {
          webSearch: {
            apiKey: "xai-...", // optional if XAI_API_KEY is set
          },
        },
      },
    },
  },
  tools: {
    web: {
      search: {
        provider: "grok",
      },
    },
  },
}
```

**環境變數替代方案：** 在 Gateway 環境中設定 `XAI_API_KEY`。
如果是 gateway 安裝，請將其放入 `~/.openclaw/.env`。

## 運作方式

Grok 使用 xAI 的網路基礎回應來綜合答案並包含內嵌引用，類似於 Gemini 的 Google Search 基礎方法。

## 支援的參數

Grok 搜尋支援 `query`。

為了相容共用的 `web_search`，系統接受 `count`，但 Grok 仍然會傳回一個附帶引用的綜合答案，而非包含 N 個結果的清單。

目前不支援供應商特定的篩選條件。

## 相關內容

- [網路搜尋總覽](/zh-Hant/tools/web) -- 所有供應商與自動偵測
- [網路搜尋中的 x_search](/zh-Hant/tools/web#x_search) -- 透過 xAI 進行的頂級 X 搜尋
- [Gemini 搜尋](/zh-Hant/tools/gemini-search) -- 透過 Google 接地提供的 AI 綜合答案
