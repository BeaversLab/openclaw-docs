---
summary: "透過 xAI 網路回應進行 Grok 網路搜尋"
read_when:
  - You want to use Grok for web_search
  - You need an XAI_API_KEY for web search
title: "Grok 搜尋"
---

# Grok 搜尋

OpenClaw 支援將 Grok 作為 `web_search` 提供者，使用 xAI 網路回應來產生由即時搜尋結果支援並附有引用的 AI 綜合答案。

同一個 `XAI_API_KEY` 也可以為內建的 `x_search` 工具提供動力，用於 X（前 Twitter）貼文搜尋。如果您將金鑰儲存在 `plugins.entries.xai.config.webSearch.apiKey` 下，OpenClaw 現在也會將其作為套件 xAI 模型提供者的備援來重複使用。

對於貼文層級的 X 指標，例如轉發、回覆、書籤或瀏覽量，請優先 `x_search` 搭配準確的貼文 URL 或貼文 ID，而不是廣泛的搜尋查詢。

## 入門與配置

如果您在此過程中選擇 **Grok**：

- `openclaw onboard`
- `openclaw configure --section web`

OpenClaw 可以顯示一個單獨的後續步驟，以使用相同的
`XAI_API_KEY` 啟用 `x_search`。該後續步驟：

- 僅在您選擇 Grok 作為 `web_search` 後出現
- 不是單獨的頂層網路搜尋供應商選擇
- 可以在同一流程中選擇性設定 `x_search` 模型

如果您跳過它，您可以稍後在配置中啟用或變更 `x_search`。

## 取得 API 金鑰

<Steps>
  <Step title="Create a key">
    從 [xAI](https://console.x.ai/) 取得 API 金鑰。
  </Step>
  <Step title="儲存金鑰">
    在 Gateway 環境中設定 `XAI_API_KEY`，或透過以下方式配置：

    ```bash
    openclaw configure --section web
    ```

  </Step>
</Steps>

## 配置

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
對於 gateway 安裝，將其放入 `~/.openclaw/.env` 中。

## 運作原理

Grok 使用 xAI 的網路落地回應來綜合帶有內聯引用的答案，
類似於 Gemini 的 Google Search 落地方法。

## 支援的參數

Grok 搜尋支援 `query`。

為了共用 `web_search` 的相容性，接受 `count`，但 Grok 仍然會傳回一個帶有引用的綜合答案，而不是 N 個結果的清單。

目前不支援供應商特定的篩選器。

## 相關

- [網路搜尋總覽](/en/tools/web) -- 所有供應商和自動偵測
- [網路搜尋中的 x_search](/en/tools/web#x_search) -- 透過 xAI 進行一流的 X 搜尋
- [Gemini 搜尋](/en/tools/gemini-search) -- 透過 Google grounding 產生的 AI 綜合答案
