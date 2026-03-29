---
summary: "稽核可能花費金錢的項目、使用的金鑰以及如何查看使用情況"
read_when:
  - You want to understand which features may call paid APIs
  - You need to audit keys, costs, and usage visibility
  - You’re explaining /status or /usage cost reporting
title: "API 使用與成本"
---

# API 使用與成本

本文列出了**可以呼叫 API 金鑰的功能**及其成本的顯示位置。重點在於可能產生提供者使用量或付費 API 呼叫的 OpenClaw 功能。

## 成本顯示位置 (聊天 + CLI)

**每次工作階段成本快照**

- `/status` 顯示目前的工作階段模型、情境使用量以及上次回應的 Token 數。
- 如果模型使用 **API 金鑰驗證**，`/status` 也會顯示上次回應的**預估成本**。

**每次訊息成本頁尾**

- `/usage full` 會在每次回應附加使用量頁尾，包括**預估成本** (僅限 API 金鑰)。
- `/usage tokens` 僅顯示 Token；OAuth 流程會隱藏金額成本。

**CLI 使用量視窗 (提供者配額)**

- `openclaw status --usage` 和 `openclaw channels list` 顯示提供者的**使用量視窗**
  (配額快照，而非每次訊息的成本)。

詳見 [Token 使用與成本](/en/reference/token-use) 以了解詳細資訊與範例。

## 金鑰的探索方式

OpenClaw 可以從以下位置取得憑證：

- **驗證設定檔** (每個代理程式專屬，儲存於 `auth-profiles.json`)。
- **環境變數** (例如 `OPENAI_API_KEY`、`BRAVE_API_KEY`、`FIRECRAWL_API_KEY`)。
- **設定檔** (`models.providers.*.apiKey`、`tools.web.search.*`、`tools.web.fetch.firecrawl.*`、
  `memorySearch.*`、`talk.apiKey`)。
- **技能** (`skills.entries.<name>.apiKey`)，可能會將金鑰匯出到技能處理程序環境中。

## 可能消耗金鑰的功能

### 1) 核心模型回應 (聊天 + 工具)

每次回應或工具呼叫都會使用 **目前的模型提供者** (OpenAI、Anthropic 等)。這是使用量和成本的主要來源。

關於價格設定請參閱 [模型](/en/providers/models)，關於顯示方式請參閱 [Token 使用與成本](/en/reference/token-use)。

### 2) 媒體理解 (音訊/圖片/影片)

傳入的媒體可以在回應執行前進行摘要/轉錄。這會使用模型/提供者的 API。

- 音訊：OpenAI / Groq / Deepgram（當金鑰存在時現在會**自動啟用**）。
- 圖像：OpenAI / Anthropic / Google。
- 影片：Google。

請參閱[媒體理解](/en/nodes/media-understanding)。

### 3) 記憶嵌入 + 語義搜尋

語義記憶搜尋在配置為遠端提供者時會使用 **嵌入 API**：

- `memorySearch.provider = "openai"` → OpenAI 嵌入
- `memorySearch.provider = "gemini"` → Gemini 嵌入
- `memorySearch.provider = "voyage"` → Voyage 嵌入
- `memorySearch.provider = "mistral"` → Mistral 嵌入
- `memorySearch.provider = "ollama"` → Ollama 嵌入（本地/自託管；通常無託管 API 費用）
- 如果本地嵌入失敗，可選擇回退至遠端提供者

您可以使用 `memorySearch.provider = "local"` 將其保持在本地（無 API 使用量）。

請參閱[記憶](/en/concepts/memory)。

### 4) 網路搜尋工具

`web_search` 使用 API 金鑰，且可能會根據您的提供者產生使用費用：

- **Brave Search API**：`BRAVE_API_KEY` 或 `plugins.entries.brave.config.webSearch.apiKey`
- **Gemini (Google Search)**：`GEMINI_API_KEY` 或 `plugins.entries.google.config.webSearch.apiKey`
- **Grok (xAI)**：`XAI_API_KEY` 或 `plugins.entries.xai.config.webSearch.apiKey`
- **Kimi (Moonshot)**：`KIMI_API_KEY`、`MOONSHOT_API_KEY` 或 `plugins.entries.moonshot.config.webSearch.apiKey`
- **Perplexity Search API**：`PERPLEXITY_API_KEY`、`OPENROUTER_API_KEY` 或 `plugins.entries.perplexity.config.webSearch.apiKey`

舊版 `tools.web.search.*` 提供者路徑仍會透過暫時性相容性 shim 載入，但它們不再是推薦的配置介面。

**Brave Search 免費額度**：每個 Brave 方案都包含每月 $5 的續期免費額度。搜尋方案每 1,000 次請求收費 $5，因此該額度可免費涵蓋每月 1,000 次請求。請在 Brave 儀表板中設定您的使用量上限，以避免意外產生費用。

請參閱[網路工具](/en/tools/web)。

### 5) 網路擷取工具 (Firecrawl)

當存在 API 金鑰時，`web_fetch` 可以呼叫 **Firecrawl**：

- `FIRECRAWL_API_KEY` 或 `tools.web.fetch.firecrawl.apiKey`

如果未配置 Firecrawl，該工具會回退至直接擷取 + 可讀性處理（無付費 API）。

請參閱 [Web 工具](/en/tools/web)。

### 6) 提供者使用量快照 (狀態/健全狀況)

部分狀態指令會呼叫 **提供者使用量端點** 來顯示配額視窗或驗證健全狀況。
這些通常是低量呼叫，但仍會觸及提供者 API：

- `openclaw status --usage`
- `openclaw models status --json`

請參閱 [Models CLI](/en/cli/models)。

### 7) 壓縮防護摘要

壓縮防護機制可以使用 **目前模型** 來摘要工作階段歷史，當其執行時
會呼叫提供者 API。

請參閱 [工作階段管理 + 壓縮](/en/reference/session-management-compaction)。

### 8) 模型掃描 / 探測

`openclaw models scan` 可以探測 OpenRouter 模型，並在啟用探測時使用 `OPENROUTER_API_KEY`。

請參閱 [Models CLI](/en/cli/models)。

### 9) 語音對談 (語音)

在設定後，語音模式可以呼叫 **ElevenLabs**：

- `ELEVENLABS_API_KEY` 或 `talk.apiKey`

請參閱 [語音模式](/en/nodes/talk)。

### 10) 技能 (第三方 API)

技能可以在 `skills.entries.<name>.apiKey` 中儲存 `apiKey`。如果技能使用該金鑰來存取外部
API，則會根據該技能的提供者產生費用。

請參閱 [技能](/en/tools/skills)。
