---
title: "Perplexity (提供者)"
summary: "Perplexity 網路搜尋提供者設定（API 金鑰、搜尋模式、過濾）"
read_when:
  - You want to configure Perplexity as a web search provider
  - You need the Perplexity API key or OpenRouter proxy setup
---

# Perplexity (網路搜尋提供者)

Perplexity 外掛程式透過 Perplexity Search API 或透過 OpenRouter 的 Perplexity Sonar 提供網路搜尋功能。

<Note>本頁面涵蓋 Perplexity **提供者** 的設定。若要了解 Perplexity **工具**（Agent 如何使用它），請參閱 [Perplexity tool](/zh-Hant/tools/perplexity-search)。</Note>

- 類型：網路搜尋提供者（非模型提供者）
- 驗證：`PERPLEXITY_API_KEY` (直接) 或 `OPENROUTER_API_KEY` (透過 OpenRouter)
- 設定路徑：`plugins.entries.perplexity.config.webSearch.apiKey`

## 快速開始

1. 設定 API 金鑰：

```exec
openclaw configure --section web
```

或直接設定：

```exec
openclaw config set plugins.entries.perplexity.config.webSearch.apiKey "pplx-xxxxxxxxxxxx"
```

2. 設定完成後，Agent 將自動使用 Perplexity 進行網路搜尋。

## 搜尋模式

此外掛程式會根據 API 金鑰前綴自動選擇傳輸方式：

| 金鑰前綴 | 傳輸方式                 | 功能                           |
| -------- | ------------------------ | ------------------------------ |
| `pplx-`  | 原生 Perplexity 搜尋 API | 結構化結果、網域/語言/日期篩選 |
| `sk-or-` | OpenRouter (Sonar)       | 帶引用來源的 AI 綜合回答       |

## 原生 API 篩選

使用原生 Perplexity API (`pplx-` 金鑰) 時，搜尋支援：

- **國家**：2 字母國家代碼
- **語言**：ISO 639-1 語言代碼
- **日期範圍**：天、週、月、年
- **網域篩選**：允許清單/封鎖清單 (最多 20 個網域)
- **內容預算**：`max_tokens`、`max_tokens_per_page`

## 環境注意事項

如果 Gateway 作為守護進程（launchd/systemd）運行，請確保 `PERPLEXITY_API_KEY` 對該進程可用（例如，在 `~/.openclaw/.env` 中或透過 `env.shellEnv`）。
