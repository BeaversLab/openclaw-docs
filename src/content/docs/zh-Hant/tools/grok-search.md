---
summary: "透過 xAI 網路回應進行 Grok 網路搜尋"
read_when:
  - You want to use Grok for web_search
  - You need an XAI_API_KEY for web search
title: "Grok 搜尋"
---

OpenClaw 支援將 Grok 作為 `web_search` 提供者，使用 xAI 的網路基礎回應來產生 AI 合成的答案，並附上即時搜尋結果與引用。

同一個 xAI API 金鑰也可以為內建的 `x_search` 工具提供動力，用於 X（前 Twitter）貼文搜尋，以及 `code_execution` 工具。如果您將金鑰儲存在 `plugins.entries.xai.config.webSearch.apiKey` 下，OpenClaw 現在也會將其作為內建 xAI 模型供應商的後備方案重複使用。

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
            baseUrl: "https://api.x.ai/v1", // optional Responses API proxy/base URL override
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

Grok 使用供應商特定的 60 秒預設逾時，因為 xAI Responses 網路基礎搜尋的執行時間可能比共用的 `web_search` 預設值更長。設定 `tools.web.search.timeoutSeconds` 以覆寫它。

## 基底 URL 覆寫

當 Grok 網路搜尋應透過操作員代理或 xAI 相容的 Responses 端點路由時，設定 `plugins.entries.xai.config.webSearch.baseUrl`。OpenClaw 會在移除結尾斜線後發佈至 `<baseUrl>/responses`。`x_search` 使用相同的 `webSearch.baseUrl` 後備，除非設定了 `plugins.entries.xai.config.xSearch.baseUrl`。

## 相關

- [網路搜尋概覽](/zh-Hant/tools/web) -- 所有供應商與自動偵測
- [網路搜尋中的 x_search](/zh-Hant/tools/web#x_search) -- 透過 xAI 進行一級 X 搜尋
- [Gemini Search](/zh-Hant/tools/gemini-search) -- 透過 Google grounding 進行 AI 合成回答
