---
summary: "稽核可能產生花費的功能、使用的金鑰，以及如何檢視使用情況"
read_when:
  - You want to understand which features may call paid APIs
  - You need to audit keys, costs, and usage visibility
  - You’re explaining /status or /usage cost reporting
title: "API 使用與成本"
---

# API 使用與成本

本文列出**可叫用 API 金鑰的功能**及其成本顯示位置。重點關注 OpenClaw 中會產生提供者使用量或付費 API 呼叫的功能。

## 成本顯示位置（聊天 + CLI）

**每階段成本快照**

- `/status` 顯示目前階段模型、內容使用量與最近一次回應的 Token。
- 若模型使用 **API 金鑰驗證**，`/status` 也會顯示最近一次回應的**預估成本**。

**每則訊息成本頁尾**

- `/usage full` 會在每則回應後附加使用量頁尾，包含**預估成本**（僅 API 金鑰）。
- `/usage tokens` 僅顯示 Token；OAuth 流程會隱藏金額成本。

**CLI 使用視窗（提供者配額）**

- `openclaw status --usage` 和 `openclaw channels list` 顯示提供者 **使用視窗**
  （配額快照，而非每條訊息的成本）。

詳情與範例請參閱 [Token 使用量與成本](/zh-Hant/reference/token-use)。

## 如何探索金鑰

OpenClaw 可以從以下來源獲取憑證：

- **Auth 設定檔**（每個代理程式專用，儲存在 `auth-profiles.json` 中）。
- **環境變數**（例如 `OPENAI_API_KEY`、`BRAVE_API_KEY`、`FIRECRAWL_API_KEY`）。
- **Config**（`models.providers.*.apiKey`、`tools.web.search.*`、`tools.web.fetch.firecrawl.*`、
  `memorySearch.*`、`talk.apiKey`）。
- **Skills**（`skills.entries.<name>.apiKey`），其可能會將金鑰匯出至 skill 程序環境。

## 可能消耗金鑰的功能

### 1) 核心模型回應（聊天 + 工具）

每個回覆或工具呼叫都會使用 **目前的模型提供商**（OpenAI、Anthropic 等）。這是使用量和成本的主要來源。

請參閱 [Models](/zh-Hant/providers/models) 以了解價格配置，以及 [Token use & costs](/zh-Hant/reference/token-use) 以了解顯示方式。

### 2) 媒體理解（音訊/圖像/影片）

傳入的媒體可以在回覆執行前進行摘要/轉錄。這會使用模型/提供商 API。

- 音訊：OpenAI / Groq / Deepgram（當金鑰存在時現在 **自動啟用**）。
- 圖像：OpenAI / Anthropic / Google。
- 影片：Google。

請參閱 [Media understanding](/zh-Hant/nodes/media-understanding)。

### 3) 記憶嵌入 + 語意搜尋

當配置為遠端提供商時，語意記憶搜尋會使用 **嵌入 API**：

- `memorySearch.provider = "openai"` → OpenAI 嵌入
- `memorySearch.provider = "gemini"` → Gemini 嵌入
- `memorySearch.provider = "voyage"` → Voyage 嵌入
- `memorySearch.provider = "mistral"` → Mistral 嵌入
- `memorySearch.provider = "ollama"` → Ollama 嵌入（本地/自託管；通常無託管 API 費用）
- 如果本地嵌入失敗，可選擇回退到遠端提供商

您可以使用 `memorySearch.provider = "local"` 將其保持在本地（無 API 使用量）。

參見 [Memory](/zh-Hant/concepts/memory)。

### 4) 網路搜尋工具

`web_search` 使用 API 金鑰，並且根據您的提供商可能會產生使用費用：

- **Brave Search API**：`BRAVE_API_KEY` 或 `plugins.entries.brave.config.webSearch.apiKey`
- **Gemini (Google Search)**：`GEMINI_API_KEY` 或 `plugins.entries.google.config.webSearch.apiKey`
- **Grok (xAI)**：`XAI_API_KEY` 或 `plugins.entries.xai.config.webSearch.apiKey`
- **Kimi (Moonshot)**：`KIMI_API_KEY`、`MOONSHOT_API_KEY` 或 `plugins.entries.moonshot.config.webSearch.apiKey`
- **Perplexity Search API**：`PERPLEXITY_API_KEY`、`OPENROUTER_API_KEY` 或 `plugins.entries.perplexity.config.webSearch.apiKey`

舊版 `tools.web.search.*` 提供者路徑仍會透過暫時性相容性層載入，但它們不再是建議的設定介面。

**Brave Search 免費額度**：每個 Brave 方案包含每月 \$5 的續期免費額度。搜尋方案費用為每 1,000 次請求 \$5，因此該額度每月可覆蓋 1,000 次免費請求。請在 Brave 控制台中設定您的使用上限，以避免意外收費。

請參閱 [Web 工具](/zh-Hant/tools/web)。

### 5) Web 擷取工具

當存在 API 金鑰時，`web_fetch` 可以呼叫 **Firecrawl**：

- `FIRECRAWL_API_KEY` 或 `tools.web.fetch.firecrawl.apiKey`

若未設定 Firecrawl，該工具將會回退至直接擷取 + 可讀性處理（無付費 API）。

請參閱 [Web 工具](/zh-Hant/tools/web)。

### 6) 提供商使用量快照 (status/health)

部分狀態指令會呼叫 **提供商使用量端點** 以顯示配額視窗或驗證健康狀態。
這通常屬於低量呼叫，但仍會存取提供商 API：

- `openclaw status --usage`
- `openclaw models status --json`

請參閱 [Models CLI](/zh-Hant/cli/models)。

### 7) 壓縮保護摘要

壓縮保護機制可以使用 **目前模型** 對工作階段歷史進行摘要，這在執行時
會呼叫提供商 API。

請參閱 [Session management + compaction](/zh-Hant/reference/session-management-compaction)。

### 8) 模型掃描 / 探測

`openclaw models scan` 可以探測 OpenRouter 模型，並在啟用探測時使用 `OPENROUTER_API_KEY`。

請參閱 [Models CLI](/zh-Hant/cli/models)。

### 9) 語音對話

語音模式在設定後可以呼叫 **ElevenLabs**：

- `ELEVENLABS_API_KEY` 或 `talk.apiKey`

請參閱 [交談模式](/zh-Hant/nodes/talk)。

### 10) 技能 (第三方 API)

技能可以將 `apiKey` 儲存在 `skills.entries.<name>.apiKey` 中。如果技能使用該金鑰呼叫外部
API，可能會根據技能的供應商產生費用。

請參閱 [技能](/zh-Hant/tools/skills)。

import footerZhHant from "/components/footer/zh-Hant.mdx";

<footerZhHant />
