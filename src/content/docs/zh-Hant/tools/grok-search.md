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

## 取得 API 金鑰

<Steps>
  <Step title="建立金鑰">
    從 [xAI](https://console.x.ai/) 取得 API 金鑰。
  </Step>
  <Step title="儲存金鑰">
    在 Gateway 環境中設定 `XAI_API_KEY`，或透過以下方式進行配置：

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
若為 gateway 安裝，請將其置於 `~/.openclaw/.env` 中。

## 運作原理

Grok 使用 xAI 的網路基礎回應來綜合答案並包含內文引用，類似於 Gemini 的 Google Search 基礎方法。

## 支援的參數

Grok 搜尋支援標準的 `query` 和 `count` 參數。
目前不支援提供者專屬的篩選器。

## 相關

- [網頁搜尋概覽](/en/tools/web) -- 所有提供者與自動偵測
- [網頁搜尋中的 x_search](/en/tools/web#x_search) -- 透過 xAI 進行的一等 X 搜尋
- [Gemini 搜尋](/en/tools/gemini-search) -- 透過 Google 基礎產生的 AI 綜合答案
