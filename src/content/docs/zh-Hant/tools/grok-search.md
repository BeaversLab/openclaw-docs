---
summary: "透過 xAI 網頁接地的回應進行 Grok 網頁搜尋"
read_when:
  - You want to use Grok for web_search
  - You want to use xAI OAuth or an XAI_API_KEY for web search
title: "Grok 搜尋"
---

OpenClaw 支援將 Grok 作為 `web_search` 提供者，使用 xAI 網頁接地
回應來產生由即時搜尋結果支援並附帶引用的
AI 綜合答案。

Grok 網頁搜尋偏好使用您現有的 xAI OAuth 登入（如果有的話）。
如果不存在 OAuth 設定檔，同一個 xAI API 金鑰也可以為內建的
`x_search` 工具（用於 X（前身為 Twitter）貼文搜尋）和 `code_execution`
工具提供動力。如果您將金鑰儲存在 `plugins.entries.xai.config.webSearch.apiKey` 下，
OpenClaw 也會將其作為套件隨附的 xAI 模型提供者的後備方案重複使用。

對於貼文層級的 X 指標（如轉發、回覆、書籤或檢視次數），請
偏好使用 `x_search` 並搭配確切的貼文 URL 或狀態 ID，而不是廣泛的搜尋
查詢。

## 上架與設定

如果您在以下期間選擇 **Grok**：

- `openclaw onboard`
- `openclaw configure --section web`

OpenClaw 可以使用現有的 xAI OAuth 設定檔，而無需提示輸入單獨的
網頁搜尋金鑰。如果 OAuth 不可用，它將會退回到 xAI API 金鑰設定。
OpenClaw 也可以顯示一個單獨的後續步驟，以使用
相同的 xAI 憑證來啟用 `x_search`。該後續步驟：

- 僅在您選擇將 Grok 用於 `web_search` 後才會出現
- 並非獨立的頂層網路搜尋提供者選項
- 可以在同一流程中選擇性地設定 `x_search` 模型

如果您跳過此步驟，您可以在稍後的設定中啟用或變更 `x_search`。

## 登入或取得 API 金鑰

<Steps>
  <Step title="使用 xAI OAuth">
    如果您在上架或模型驗證期間已經登入 xAI，請選擇
    Grok 作為 `web_search` 提供者。不需要單獨的 API 金鑰：

    ```bash
    openclaw onboard --auth-choice xai-oauth
    openclaw config set tools.web.search.provider grok
    ```

  </Step>
  <Step title="使用 API 金鑰後備方案">
    當 OAuth 不可用
    或您刻意想要使用金鑰支援的網頁搜尋設定時，請從 [xAI](https://console.x.ai/) 取得 API 金鑰。
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
            apiKey: "xai-...", // optional if xAI OAuth or XAI_API_KEY is available
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

**認證替代方案：** 在 Gateway 環境中使用 `openclaw models auth login
--provider xai --method oauth`, set `XAI_API_KEY` 登入，或儲存 `plugins.entries.xai.config.webSearch.apiKey`。對於 gateway 安裝，請將環境變數放在 `~/.openclaw/.env` 中。

## 運作原理

Grok 使用 xAI 網頁回應來綜合帶有內嵌引用的答案，類似於 Gemini 的 Google 搜尋加強方法。

## 支援的參數

Grok 搜尋支援 `query`。

為了與共享的 `web_search` 相容，接受 `count`，但 Grok 仍然會傳回一個帶有引用的綜合答案，而不是 N 個結果的清單。

目前不支援提供者特定的篩選器。

Grok 使用提供者特定的 60 秒預設逾時，因為 xAI 回應的網頁加強搜尋執行時間可能比共享的 `web_search` 預設值更長。請設定 `tools.web.search.timeoutSeconds` 來覆寫它。

## 基底 URL 覆寫

當 Grok 網頁搜尋應透過操作員 Proxy 或相容 xAI 的回應端點路由時，請設定 `plugins.entries.xai.config.webSearch.baseUrl`。OpenClaw 會在移除結尾斜線後發佈至 `<baseUrl>/responses`。`x_search` 使用相同的 `webSearch.baseUrl` 後備，除非設定了 `plugins.entries.xai.config.xSearch.baseUrl`。

## 相關

- [網頁搜尋概覽](/zh-Hant/tools/web) -- 所有提供者和自動偵測
- [網頁搜尋中的 x_search](/zh-Hant/tools/web#x_search) -- 透過 xAI 進行的原生 X 搜尋
- [Gemini 搜尋](/zh-Hant/tools/gemini-search) -- 透過 Google 加強的 AI 綜合答案
