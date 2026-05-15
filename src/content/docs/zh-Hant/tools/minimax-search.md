---
summary: "透過 Token Plan 搜尋 API 進行 MiniMax 搜尋"
read_when:
  - You want to use MiniMax for web_search
  - You need a MiniMax Token Plan key or OAuth token
  - You want MiniMax CN/global search host guidance
title: "MiniMax 搜尋"
---

OpenClaw 透過 MiniMax Token Plan 搜尋 API 支援將 MiniMax 作為 `web_search` 提供者。它會傳回包含標題、URL、摘要和相關查詢的結構化搜尋結果。

## 取得 Token Plan 憑證

<Steps>
  <Step title="建立金鑰">
    從 [MiniMax Platform](https://platform.minimax.io/user-center/basic-information/interface-key) 建立或複製 MiniMax Token Plan 金鑰。
    OAuth 設定可以改用 `MINIMAX_OAUTH_TOKEN`。
  </Step>
  <Step title="儲存金鑰">
    在 Gateway 環境中設定 `MINIMAX_CODE_PLAN_KEY`，或透過以下方式進行設定：

    ```bash
    openclaw configure --section web
    ```

  </Step>
</Steps>

OpenClaw 也接受 `MINIMAX_CODING_API_KEY`、`MINIMAX_OAUTH_TOKEN` 和
`MINIMAX_API_KEY` 作為環境變數別名。`MINIMAX_API_KEY` 應指向已啟用搜尋功能的 Token Plan 憑證；一般的 MiniMax 模型 API 金鑰可能無法被 Token Plan 搜尋端點接受。

## 設定

```json5
{
  plugins: {
    entries: {
      minimax: {
        config: {
          webSearch: {
            apiKey: "sk-cp-...", // optional if a MiniMax Token Plan env var is set
            region: "global", // or "cn"
          },
        },
      },
    },
  },
  tools: {
    web: {
      search: {
        provider: "minimax",
      },
    },
  },
}
```

**環境變數替代方案：** 在 Gateway 環境中設定 `MINIMAX_CODE_PLAN_KEY`、`MINIMAX_CODING_API_KEY`、
`MINIMAX_OAUTH_TOKEN` 或 `MINIMAX_API_KEY`。
若為 gateway 安裝，請將其放在 `~/.openclaw/.env` 中。

## 區域選擇

MiniMax 搜尋使用這些端點：

- Global：`https://api.minimax.io/v1/coding_plan/search`
- CN：`https://api.minimaxi.com/v1/coding_plan/search`

如果未設定 `plugins.entries.minimax.config.webSearch.region`，OpenClaw 將依以下順序解析區域：

1. `tools.web.search.minimax.region` / 外掛擁有的 `webSearch.region`
2. `MINIMAX_API_HOST`
3. `models.providers.minimax.baseUrl`
4. `models.providers.minimax-portal.baseUrl`

這表示 CN 上架或 `MINIMAX_API_HOST=https://api.minimaxi.com/...`
會自動將 MiniMax Search 也保留在 CN 主機上。

即使您是透過 OAuth `minimax-portal` 路徑對 MiniMax 進行驗證，
網路搜尋仍會註冊為提供者 ID `minimax`；OAuth 提供者基本 URL
會被用作 CN/Global 主機選擇的區域提示，而 `MINIMAX_OAUTH_TOKEN`
可以滿足 MiniMax Search 的 bearer 憑證需求。

## 支援的參數

MiniMax 搜尋支援：

- `query`
- `count` (OpenClaw 會將傳回的結果列表修剪為要求的數量)

目前不支援提供者專屬的篩選器。

## 相關

- [Web Search 概覽](/zh-Hant/tools/web) -- 所有提供者與自動偵測
- [MiniMax](/zh-Hant/providers/minimax) -- 模型、影像、語音與驗證設定
