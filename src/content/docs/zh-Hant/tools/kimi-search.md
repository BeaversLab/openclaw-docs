---
summary: "透過 Moonshot 網路搜尋進行 Kimi 網路搜尋"
read_when:
  - You want to use Kimi for web_search
  - You need a KIMI_API_KEY or MOONSHOT_API_KEY
title: "Kimi 搜尋"
---

OpenClaw 支援將 Kimi 作為 `web_search` 提供者，使用 Moonshot 網頁搜尋
來產生具有引用來源的 AI 綜合回答。

## 取得 API 金鑰

<Steps>
  <Step title="Create a key">
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

當您在 `openclaw onboard` 或
`openclaw configure --section web` 期間選擇 **Kimi** 時，OpenClaw 也可能會詢問：

- Moonshot API 區域：
  - `https://api.moonshot.ai/v1`
  - `https://api.moonshot.cn/v1`
- 預設的 Kimi 網頁搜尋模型 (預設為 `kimi-k2.6`)

## 設定

```json5
{
  plugins: {
    entries: {
      moonshot: {
        config: {
          webSearch: {
            apiKey: "sk-...", // optional if KIMI_API_KEY or MOONSHOT_API_KEY is set
            baseUrl: "https://api.moonshot.ai/v1",
            model: "kimi-k2.6",
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

如果您在聊天時使用中國 API 主機 (`models.providers.moonshot.baseUrl`:
`https://api.moonshot.cn/v1`)，當省略 `tools.web.search.kimi.baseUrl` 時，OpenClaw 會為 Kimi
`web_search` 重複使用該主機，因此來自
[platform.moonshot.cn](https://platform.moonshot.cn/) 的金鑰不會錯誤地存取
國際端點（該端點通常會傳回 HTTP 401）。當您需要不同的搜尋基礎 URL 時，請使用
`tools.web.search.kimi.baseUrl` 進行覆蓋。

**環境變數替代方案：** 在 Gateway 環境中設定 `KIMI_API_KEY` 或 `MOONSHOT_API_KEY`。
對於 gateway 安裝，請將其放在 `~/.openclaw/.env` 中。

如果您省略 `baseUrl`，OpenClaw 預設為 `https://api.moonshot.ai/v1`。
如果您省略 `model`，OpenClaw 預設為 `kimi-k2.6`。

## 運作原理

Kimi 使用 Moonshot 網頁搜尋來綜合具有行內引用的回答，
類似於 Gemini 和 Grok 的落地回應方法。

OpenClaw 僅在 Moonshot 傳回原生網頁搜尋引用證據（例如可重播的 `$web_search` 工具
payload、`search_results` 或引用 URL）後，才將 Kimi `web_search` 視為成功。如果 Kimi 立即停止並傳回
純聊天回答（例如「我無法瀏覽網際網路」）且沒有引用證據，
OpenClaw 會傳回結構化的 `kimi_web_search_ungrounded` 錯誤，而不是
將該文字包裝為搜尋結果。請重試查詢、切換至結構化
提供者（例如 Brave），或者當您已經
有目標 URL 時，使用 `web_fetch` / 瀏覽器工具。

## 支援的參數

Kimi 搜尋支援 `query`。

為了共享 `web_search` 相容性，接受 `count`，但 Kimi 仍然
會傳回一個帶有引用的綜合回答，而不是 N 個結果的列表。

目前不支援供應商特定的過濾器。

## 相關

- [Web Search overview](/zh-Hant/tools/web) -- 所有提供者與自動偵測
- [Moonshot AI](/zh-Hant/providers/moonshot) -- Moonshot 模型 + Kimi Coding 提供者文件
- [Gemini Search](/zh-Hant/tools/gemini-search) -- 透過 Google 引用傳回的 AI 綜合回答
- [Grok Search](/zh-Hant/tools/grok-search) -- 透過 xAI 引用傳回的 AI 綜合回答
