---
summary: "透過 xAI 網路回應進行 Grok 網路搜尋"
read_when:
  - You want to use Grok for web_search
  - You need an XAI_API_KEY for web search
title: "Grok 搜尋"
---

# Grok 搜尋

OpenClaw 支援將 Grok 作為 `web_search` 提供者，使用 xAI 網路回應來產生由即時搜尋結果支援並附有引用的 AI 綜合答案。

## 取得 API 金鑰

<Steps>
  <Step title="建立金鑰">
    從 [xAI](https://console.x.ai/) 取得 API 金鑰。
  </Step>
  <Step title="儲存金鑰">
    在 Gateway 環境中設定 `XAI_API_KEY`，或透過以下方式進行設定：

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
若為 gateway 安裝版本，請將其放在 `~/.openclaw/.env` 中。

## 運作方式

Grok 使用 xAI 網路回應來綜合包含內文引用的答案，類似於 Gemini 的 Google 搜尋接地方案。

## 支援的參數

Grok 搜尋支援標準 `query` 和 `count` 參數。
目前不支援提供者專屬的篩選器。

## 相關

- [網路搜尋總覽](/en/tools/web) -- 所有提供者與自動偵測
- [Gemini 搜尋](/en/tools/gemini-search) -- 透過 Google 接地產生的 AI 綜合答案
