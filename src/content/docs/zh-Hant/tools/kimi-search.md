---
summary: "透過 Moonshot 網路搜尋進行 Kimi 網路搜尋"
read_when:
  - You want to use Kimi for web_search
  - You need a KIMI_API_KEY or MOONSHOT_API_KEY
title: "Kimi 搜尋"
---

# Kimi 搜尋

OpenClaw 支援 Kimi 作為 `web_search` 提供者，使用 Moonshot 網路搜尋
來產生具有引用的 AI 綜合回答。

## 取得 API 金鑰

<Steps>
  <Step title="建立金鑰">
    從 [Moonshot AI](https://platform.moonshot.cn/) 取得 API 金鑰。
  </Step>
  <Step title="儲存金鑰">
    在 Gateway 環境中設定 `KIMI_API_KEY` 或 `MOONSHOT_API_KEY`，或
    透過以下方式設定：

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
      moonshot: {
        config: {
          webSearch: {
            apiKey: "sk-...", // optional if KIMI_API_KEY or MOONSHOT_API_KEY is set
          },
        },
      },
    },
  },
  tools: {
    web: {
      search: {
        provider: "kimi",
      },
    },
  },
}
```

**環境變數替代方案：** 在
Gateway 環境中設定 `KIMI_API_KEY` 或 `MOONSHOT_API_KEY`。對於 gateway 安裝，請將其放入 `~/.openclaw/.env` 中。

## 運作方式

Kimi 使用 Moonshot 網路搜尋來綜合具有內嵌引用的回答，
類似於 Gemini 和 Grok 的基於事實的回應方式。

## 支援的參數

Kimi 搜尋支援標準的 `query` 和 `count` 參數。
目前不支援提供者特定的過濾器。

## 相關

- [網路搜尋總覽](/en/tools/web) -- 所有提供者和自動偵測
- [Gemini 搜尋](/en/tools/gemini-search) -- 透過 Google grounding 產生的 AI 綜合回答
- [Grok 搜尋](/en/tools/grok-search) -- 透過 xAI grounding 產生的 AI 綜合回答
