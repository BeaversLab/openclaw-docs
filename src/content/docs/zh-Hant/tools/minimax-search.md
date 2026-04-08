---
summary: "透過 Coding Plan 搜尋 API 進行 MiniMax 搜尋"
read_when:
  - You want to use MiniMax for web_search
  - You need a MiniMax Coding Plan key
  - You want MiniMax CN/global search host guidance
title: "MiniMax 搜尋"
---

# MiniMax 搜尋

OpenClaw 支援透過 MiniMax Coding Plan 搜尋 API 將 MiniMax 作為 `web_search` 提供者。它會傳回包含標題、URL、摘要和相關查詢的結構化搜尋結果。

## 取得 Coding Plan 金鑰

<Steps>
  <Step title="建立金鑰">
    從 [MiniMax 平台](https://platform.minimax.io/user-center/basic-information/interface-key) 建立或複製 MiniMax Coding Plan 金鑰。
  </Step>
  <Step title="儲存金鑰">
    在 Gateway 環境中設定 `MINIMAX_CODE_PLAN_KEY`，或透過以下方式進行設定：

    ```bash
    openclaw configure --section web
    ```

  </Step>
</Steps>

OpenClaw 也接受 `MINIMAX_CODING_API_KEY` 作為環境變數別名。當 `MINIMAX_API_KEY` 已指向 coding-plan token 時，仍會作為相容性備選方案讀取。

## 設定

```json5
{
  plugins: {
    entries: {
      minimax: {
        config: {
          webSearch: {
            apiKey: "sk-cp-...", // optional if MINIMAX_CODE_PLAN_KEY is set
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

**環境變數替代方案：** 在 Gateway 環境中設定 `MINIMAX_CODE_PLAN_KEY`。
對於 gateway 安裝，請將其放在 `~/.openclaw/.env` 中。

## 區域選擇

MiniMax 搜尋使用以下端點：

- 全球：`https://api.minimax.io/v1/coding_plan/search`
- 中國：`https://api.minimaxi.com/v1/coding_plan/search`

如果未設定 `plugins.entries.minimax.config.webSearch.region`，OpenClaw 會依以下順序解析區域：

1. `tools.web.search.minimax.region` / 外掛擁有的 `webSearch.region`
2. `MINIMAX_API_HOST`
3. `models.providers.minimax.baseUrl`
4. `models.providers.minimax-portal.baseUrl`

這表示中國入帳或 `MINIMAX_API_HOST=https://api.minimaxi.com/...`
會自動將 MiniMax 搜尋也保留在中國主機上。

即使您是透過 OAuth `minimax-portal` 路徑驗證 MiniMax，
網頁搜尋仍會註冊為提供者 ID `minimax`；OAuth 提供者基礎 URL
僅用作選擇中國/全球主機的區域提示。

## 支援的參數

MiniMax 搜尋支援：

- `query`
- `count` (OpenClaw 會將傳回的結果清單修剪為要求的數量)

目前不支援提供者特定的篩選器。

## 相關

- [網路搜尋概覽](/en/tools/web) -- 所有供應商與自動偵測
- [MiniMax](/en/providers/minimax) -- 模型、圖片、語音與認證設定
