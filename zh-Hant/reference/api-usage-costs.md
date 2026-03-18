---
summary: "稽核可能產生費用的項目、使用的金鑰，以及如何檢視使用情況"
read_when:
  - You want to understand which features may call paid APIs
  - You need to audit keys, costs, and usage visibility
  - You’re explaining /status or /usage cost reporting
title: "API 使用與成本"
---

# API 使用與成本

本文件列出**可呼叫 API 金鑰的功能**及其成本顯示位置。主要聚焦於可能產生提供者使用量或付費 API 呼叫的 OpenClaw 功能。

## 成本顯示位置（聊天 + CLI）

**每個階段成本快照**

- `/status` 會顯示目前階段的模型、內容使用量，以及上次回應的 token 數。
- 如果模型使用 **API 金鑰驗證**，`/status` 也會顯示上次回應的**估計成本**。

**每則訊息成本頁尾**

- `/usage full` 會在每則回應後附加使用量頁尾，包含**估計成本**（僅限 API 金鑰）。
- `/usage tokens` 僅顯示 token 數；OAuth 流程會隱藏金額成本。

**CLI 使用量視窗（提供者配額）**

- `openclaw status --usage` 和 `openclaw channels list` 會顯示提供者的**使用量視窗**
  （配額快照，而非單則訊息成本）。

詳情與範例請參閱 [Token 使用與成本](/zh-Hant/reference/token-use)。

## 如何探索金鑰

OpenClaw 可以從以下位置取得憑證：

- **驗證設定檔**（每個代理程式，儲存於 `auth-profiles.json`）。
- **環境變數**（例如 `OPENAI_API_KEY`、`BRAVE_API_KEY`、`FIRECRAWL_API_KEY`）。
- **設定**（`models.providers.*.apiKey`、`tools.web.search.*`、`tools.web.fetch.firecrawl.*`、
  `memorySearch.*`、`talk.apiKey`）。
- **技能**（`skills.entries.<name>.apiKey`），可能會將金鑰匯出至技能處理程序的環境變數中。

## 會消耗金鑰的功能

### 1) 核心模型回應（聊天 + 工具）

每則回應或工具呼叫都會使用**目前的模型提供者**（OpenAI、Anthropic 等）。這是使用量和成本的主要來源。

價格設定請參閱 [模型](/zh-Hant/providers/models)，顯示方式請參閱 [Token 使用與成本](/zh-Hant/reference/token-use)。

### 2) 媒體理解（音訊/圖片/影片）

傳入的媒體可以在回應執行前進行摘要/轉錄。這會使用模型/提供者 API。

- 音訊：OpenAI / Groq / Deepgram（當金鑰存在時現在**自動啟用**）。
- 圖像：OpenAI / Anthropic / Google。
- 影片：Google。

參閱 [媒體理解](/zh-Hant/nodes/media-understanding)。

### 3) 記憶嵌入 + 語意搜尋

當設定為遠端提供者時，語意記憶搜尋會使用 **嵌入 API**：

- `memorySearch.provider = "openai"` → OpenAI 嵌入
- `memorySearch.provider = "gemini"` → Gemini 嵌入
- `memorySearch.provider = "voyage"` → Voyage 嵌入
- `memorySearch.provider = "mistral"` → Mistral 嵌入
- `memorySearch.provider = "ollama"` → Ollama 嵌入（本機/自託管；通常沒有託管 API 計費）
- 如果本機嵌入失敗，可選擇回退至遠端提供者

您可以使用 `memorySearch.provider = "local"` 將其保持在本地（無 API 使用量）。

參閱 [記憶](/zh-Hant/concepts/memory)。

### 4) 網路搜尋工具

`web_search` 使用 API 金鑰，並且可能會根據您的提供者產生使用費用：

- **Brave Search API**：`BRAVE_API_KEY` 或 `tools.web.search.apiKey`
- **Gemini (Google Search)**：`GEMINI_API_KEY` 或 `tools.web.search.gemini.apiKey`
- **Grok (xAI)**：`XAI_API_KEY` 或 `tools.web.search.grok.apiKey`
- **Kimi (Moonshot)**：`KIMI_API_KEY`、`MOONSHOT_API_KEY` 或 `tools.web.search.kimi.apiKey`
- **Perplexity Search API**：`PERPLEXITY_API_KEY`、`OPENROUTER_API_KEY` 或 `tools.web.search.perplexity.apiKey`

**Brave Search 免費額度**：每個 Brave 方案都包含每月 5 美元的續期免費額度。搜尋方案每 1,000 次請求費用為 5 美元，因此該額度每月可免費覆蓋 1,000 次請求。請在 Brave 儀表板中設定您的使用量限製，以避免意外收費。

參閱 [網路工具](/zh-Hant/tools/web)。

### 5) 網路擷取工具 (Firecrawl)

當 API 金鑰存在時，`web_fetch` 可以呼叫 **Firecrawl**：

- `FIRECRAWL_API_KEY` 或 `tools.web.fetch.firecrawl.apiKey`

如果未設定 Firecrawl，該工具將回退至直接擷取 + 可讀性處理（無付費 API）。

參閱 [網路工具](/zh-Hant/tools/web)。

### 6) 提供者使用量快照 (狀態/健康狀況)

部分狀態指令會呼叫 **提供者使用量端點**，以顯示配額視窗或驗證健康狀態。這些通常是低量呼叫，但仍會存取提供者 API：

- `openclaw status --usage`
- `openclaw models status --json`

參閱 [Models CLI](/zh-Hant/cli/models)。

### 7) 壓縮防護摘要

壓縮防護機制可使用 **當前模型** 對對話歷史進行摘要，執行時會叫用提供者 API。

參閱 [Session management + compaction](/zh-Hant/reference/session-management-compaction)。

### 8) 模型掃描 / 探測

`openclaw models scan` 可以探測 OpenRouter 模型，並在啟用探測時使用 `OPENROUTER_API_KEY`。

參閱 [Models CLI](/zh-Hant/cli/models)。

### 9) 語音交談 (speech)

語音交談模式在設定後可以叫用 **ElevenLabs**：

- `ELEVENLABS_API_KEY` 或 `talk.apiKey`

參閱 [Talk mode](/zh-Hant/nodes/talk)。

### 10) 技能 (第三方 API)

技能可以在 `skills.entries.<name>.apiKey` 中儲存 `apiKey`。如果技能使用該金鑰來存取外部 API，則可能會根據該技能的提供者產生費用。

參閱 [Skills](/zh-Hant/tools/skills)。

import footerZhHant from "/components/footer/zh-Hant.mdx";

<footerZhHant />
