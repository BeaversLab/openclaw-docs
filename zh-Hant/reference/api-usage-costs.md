---
summary: "稽核可能花費金錢的項目、使用的金鑰，以及如何檢視使用量"
read_when:
  - 您想了解哪些功能可能呼叫付費 API
  - 您需要稽核金鑰、成本與使用量可見性
  - 您正在說明 /status 或 /usage 成本回報
title: "API 使用量與成本"
---

# API 使用量與成本

本文件列出**可呼叫 API 金鑰的功能**及其成本顯示位置。重點在於
OpenClaw 中可能產生供應商使用量或付費 API 呼叫的功能。

## 成本顯示位置 (聊天 + CLI)

**每階段成本快照**

- `/status` 會顯示目前階段的模型、內容使用量，以及上次回應的 token 數。
- 若模型使用 **API 金鑰驗證**，`/status` 也會顯示上次回覆的**預估成本**。

**每則訊息成本頁尾**

- `/usage full` 會在每則回覆附加使用量頁尾，包含**預估成本** (僅限 API 金鑰)。
- `/usage tokens` 僅顯示 token；OAuth 流程會隱藏金錢成本。

**CLI 使用量視窗 (供應商配額)**

- `openclaw status --usage` 和 `openclaw channels list` 會顯示供應商**使用量視窗**
  (配額快照，而非每則訊息成本)。

詳見 [Token 使用量與成本](/zh-Hant/reference/token-use) 以了解細節與範例。

## 金鑰探索方式

OpenClaw 可從以下來源取得認證：

- **驗證設定檔** (每個代理程式，儲存於 `auth-profiles.json`)。
- **環境變數** (例如 `OPENAI_API_KEY`、`BRAVE_API_KEY`、`FIRECRAWL_API_KEY`)。
- **設定檔** (`models.providers.*.apiKey`、`tools.web.search.*`、`tools.web.fetch.firecrawl.*`、
  `memorySearch.*`、`talk.apiKey`)。
- **技能** (`skills.entries.<name>.apiKey`)，這些技能可能會將金鑰匯出至技能流程環境變數。

## 會消耗金鑰的功能

### 1) 核心模型回應 (聊天 + 工具)

每則回覆或工具呼叫都會使用**目前的模型供應商** (OpenAI、Anthropic 等)。這是
使用量與成本的主要來源。

關於價格設定請參閱 [模型](/zh-Hant/providers/models)；關於顯示方式請參閱 [Token 使用量與成本](/zh-Hant/reference/token-use)。

### 2) 媒體理解 (音訊/影像/影片)

傳入的媒體可以在回覆執行前進行摘要/轉錄。這會使用模型/提供者的 API。

- 音訊：OpenAI / Groq / Deepgram（當金鑰存在時現在**自動啟用**）。
- 圖像：OpenAI / Anthropic / Google。
- 影片：Google。

請參閱[媒體理解](/zh-Hant/nodes/media-understanding)。

### 3) 記憶嵌入 + 語意搜尋

當為遠端提供者設定時，語意記憶搜尋會使用**嵌入 API**：

- `memorySearch.provider = "openai"` → OpenAI 嵌入
- `memorySearch.provider = "gemini"` → Gemini 嵌入
- `memorySearch.provider = "voyage"` → Voyage 嵌入
- `memorySearch.provider = "mistral"` → Mistral 嵌入
- `memorySearch.provider = "ollama"` → Ollama 嵌入（本機/自託管；通常不產生託管 API 費用）
- 如果本機嵌入失敗，可選擇自動切換至遠端提供者

您可以使用 `memorySearch.provider = "local"` 將其保持在本地（不使用 API）。

請參閱[記憶](/zh-Hant/concepts/memory)。

### 4) 網頁搜尋工具

`web_search` 使用 API 金鑰，並且可能根據您的提供者產生使用費用：

- **Brave Search API**：`BRAVE_API_KEY` 或 `plugins.entries.brave.config.webSearch.apiKey`
- **Gemini (Google Search)**：`GEMINI_API_KEY` 或 `plugins.entries.google.config.webSearch.apiKey`
- **Grok (xAI)**：`XAI_API_KEY` 或 `plugins.entries.xai.config.webSearch.apiKey`
- **Kimi (Moonshot)**：`KIMI_API_KEY`、`MOONSHOT_API_KEY` 或 `plugins.entries.moonshot.config.webSearch.apiKey`
- **Perplexity Search API**：`PERPLEXITY_API_KEY`、`OPENROUTER_API_KEY` 或 `plugins.entries.perplexity.config.webSearch.apiKey`

舊版的 `tools.web.search.*` 提供者路徑仍透過暫時性相容性 shim 載入，但它們不再是建議的設定介面。

**Brave Search 免費額度**：每個 Brave 方案都包含每月 5 美元的續期免費額度。搜尋方案每 1,000 次請求收費 5 美元，因此該額度可覆蓋每月 1,000 次免費請求。請在 Brave 儀表板中設定您的使用限制，以避免意外收費。

請參閱[網頁工具](/zh-Hant/tools/web)。

### 5) 網頁擷取工具 (Firecrawl)

當存在 API 金鑰時，`web_fetch` 可以呼叫 **Firecrawl**：

- `FIRECRAWL_API_KEY` 或 `tools.web.fetch.firecrawl.apiKey`

如果未設定 Firecrawl，該工具會退回至直接取得 + 可讀性（無付費 API）。

請參閱 [Web 工具](/zh-Hant/tools/web)。

### 6) 提供者使用量快照（狀態/健康）

某些狀態指令會呼叫 **提供者使用量端點** 以顯示配額視窗或驗證健康狀況。
這些通常是低量呼叫，但仍會存取提供者 API：

- `openclaw status --usage`
- `openclaw models status --json`

請參閱 [Models CLI](/zh-Hant/cli/models)。

### 7) 壓縮安全措施摘要

壓縮安全措施可以使用 **目前模型** 對交談歷史進行摘要，執行時會叫用提供者 API。

請參閱 [Session management + compaction](/zh-Hant/reference/session-management-compaction)。

### 8) 模型掃描 / 探測

`openclaw models scan` 可以探測 OpenRouter 模型，並在啟用探測時使用 `OPENROUTER_API_KEY`。

請參閱 [Models CLI](/zh-Hant/cli/models)。

### 9) Talk（語音）

Talk 模式在設定後可以叫用 **ElevenLabs**：

- `ELEVENLABS_API_KEY` 或 `talk.apiKey`

請參閱 [Talk mode](/zh-Hant/nodes/talk)。

### 10) 技能（第三方 API）

技能可以將 `apiKey` 儲存在 `skills.entries.<name>.apiKey` 中。如果技能使用該金鑰來呼叫外部 API，則可能會根據技能的提供者產生費用。

請參閱 [Skills](/zh-Hant/tools/skills)。

import footerZhHant from "/components/footer/zh-Hant.mdx";

<footerZhHant />
