---
title: "Perplexity (提供者)"
summary: "Perplexity 網路搜尋提供者設定 (API 金鑰、搜尋模式、篩選)"
read_when:
  - You want to configure Perplexity as a web search provider
  - You need the Perplexity API key or OpenRouter proxy setup
---

# Perplexity (網路搜尋提供者)

Perplexity 外掛程式透過 Perplexity
Search API 或透過 OpenRouter 的 Perplexity Sonar 提供網路搜尋功能。

<Note>此頁面涵蓋 Perplexity **provider** 的設定。若要了解 Perplexity **tool**（代理如何使用它），請參閱 [Perplexity tool](/en/tools/perplexity-search)。</Note>

- 類型：網路搜尋提供者 (非模型提供者)
- 驗證：`PERPLEXITY_API_KEY` (直接) 或 `OPENROUTER_API_KEY` (透過 OpenRouter)
- 設定路徑：`plugins.entries.perplexity.config.webSearch.apiKey`

## 快速入門

1. 設定 API 金鑰：

```bash
openclaw configure --section web
```

或直接設定：

```bash
openclaw config set plugins.entries.perplexity.config.webSearch.apiKey "pplx-xxxxxxxxxxxx"
```

2. 設定完成後，Agent 將自動使用 Perplexity 進行網路搜尋。

## 搜尋模式

此外掛程式會根據 API 金鑰前綴自動選擇傳輸方式：

| 金鑰前綴 | 傳輸方式                   | 功能                           |
| -------- | -------------------------- | ------------------------------ |
| `pplx-`  | 原生 Perplexity Search API | 結構化結果、網域/語言/日期篩選 |
| `sk-or-` | OpenRouter (Sonar)         | 具有引用的 AI 合成答案         |

## 原生 API 篩選

使用原生 Perplexity API (`pplx-` 金鑰) 時，搜尋支援：

- **國家**：2 位字母國家代碼
- **語言**：ISO 639-1 語言代碼
- **日期範圍**：天、週、月、年
- **網域篩選**：允許清單/拒絕清單 (最多 20 個網域)
- **內容預算**：`max_tokens`、`max_tokens_per_page`

## 環境注意事項

如果 Gateway 以守護程式 方式執行，請確認
`PERPLEXITY_API_KEY` 對該程式可用 (例如，在
`~/.openclaw/.env` 中或透過 `env.shellEnv`)。
