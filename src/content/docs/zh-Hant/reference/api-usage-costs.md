---
summary: "稽核可能花費金錢的項目、使用的金鑰以及如何查看使用情況"
read_when:
  - You want to understand which features may call paid APIs
  - You need to audit keys, costs, and usage visibility
  - You're explaining /status or /usage cost reporting
title: "API 使用與成本"
---

本文檔列出了**可調用 API 金鑰的功能**及其費用顯示位置。它專注於
可能產生供應商用量或付費 API 呼叫的 OpenClaw 功能。

## 費用顯示位置（聊天 + CLI）

**每個會話的成本快照**

- `/status` 顯示目前會話的模型、內容用量以及最後一次回應的 token 數。
- 如果模型使用 **API 金鑰驗證**，`/status` 也會顯示最後一次回應的 **預估成本**。
- 如果即時會話元資料稀疏，`/status` 可以從最新的
  對話紀錄用量項目中還原 token/快取計數器和啟用的執行時模型標籤。
  現有的非零即時值仍然優先，而當儲存的總數缺失或較小時，
  提示大小的對話紀錄總數可能會勝出。

**每則訊息的成本頁尾**

- `/usage full` 會在每則回應附加用量頁尾，包括 **預估成本**（僅限 API 金鑰）。
- `/usage tokens` 僅顯示 token；訂閱式的 OAuth/token 和 CLI 流程會隱藏金額成本。
- Gemini CLI 說明：當 CLI 返回 JSON 輸出時，OpenClaw 會從
  `stats` 讀取用量，將 `stats.cached` 正規化為 `cacheRead`，
  並在需要時從 `stats.input_tokens - stats.cached` 推導輸入 token。

Anthropic 說明：Anthropic 人員告訴我們，OpenClaw 風格的 Claude CLI 用量
再次被允許，因此除非 Anthropic 發布新政策，否則 OpenClaw 將 Claude CLI 重複使用和
`claude -p` 用量視為此整合的認可行為。
Anthropic 仍然不公開 OpenClaw 可以在 `/usage full` 中顯示的每則訊息金額預估值。

**CLI 用量視窗（供應商配額）**

- `openclaw status --usage` 和 `openclaw channels list` 顯示供應商的 **用量視窗**
  （配額快照，而非每則訊息的成本）。
- 人類可讀的輸出在各供應商之間被正規化為 `X% left`。
- 目前的用量視窗供應商：Anthropic、GitHub Copilot、Gemini CLI、
  OpenAI Codex、MiniMax、Xiaomi 和 z.ai。
- MiniMax 說明：其原始 `usage_percent` / `usagePercent` 欄位代表剩餘配額，因此 OpenClaw 會在顯示前將其反轉。當存在計數型欄位時，仍然優先使用它們。如果供應商傳回 `model_remains`，OpenClaw 會優先選擇聊天模型條目，並在需要時根據時間戳推匯出視窗標籤，同時在方案標籤中包含模型名稱。
- 這些配額視窗的使用權限授權來自供應商專屬的掛鉤（如有）；否則 OpenClaw 會退而求其次，從授權設定檔、環境變數或設定中匹配 OAuth/API 金鑰憑證。

詳情與範例請參閱 [Token use & costs](/zh-Hant/reference/token-use)。

## 如何探索金鑰

OpenClaw 可以從以下來源取得憑證：

- **授權設定檔**（每個 Agent，儲存在 `auth-profiles.json` 中）。
- **環境變數**（例如 `OPENAI_API_KEY`、`BRAVE_API_KEY`、`FIRECRAWL_API_KEY`）。
- **設定檔**（`models.providers.*.apiKey`、`plugins.entries.*.config.webSearch.apiKey`、
  `plugins.entries.firecrawl.config.webFetch.apiKey`、`memorySearch.*`、
  `talk.providers.*.apiKey`）。
- **技能**（`skills.entries.<name>.apiKey`）可以將金鑰匯出至技能處理序環境變數中。

## 會消耗金鑰的功能

### 1) 核心模型回應（聊天 + 工具）

每次回覆或工具呼叫都會使用 **目前的模型供應商**（OpenAI、Anthropic 等）。這是使用量和成本的主要來源。

這也包括訂閱式託管供應商，它們仍然在 OpenClaw 本地 UI 之外計費，例如 **OpenAI Codex**、**阿里雲模型工作室編程方案**、**MiniMax 編程方案**、**Z.AI / GLM 編程方案**，以及啟用 **額外使用量** 的 Anthropic OpenClaw Claude 登入路徑。

價格設定請參閱 [Models](/zh-Hant/providers/models)，顯示方式請參閱 [Token use & costs](/zh-Hant/reference/token-use)。

### 2) 媒體理解（音訊/影像/影片）

傳入的媒體可以在回覆執行前進行摘要/轉錄。這會使用模型/供應商 API。

- 音訊：OpenAI / Groq / Deepgram / DeepInfra / Google / Mistral。
- 影像：OpenAI / OpenRouter / Anthropic / DeepInfra / Google / MiniMax / Moonshot / Qwen / Z.AI。
- 影片：Google / Qwen / Moonshot。

請參閱 [媒體理解](/zh-Hant/nodes/media-understanding)。

### 3) 圖片與影片生成

共用的生成功能也會花費供應商金鑰：

- 圖片生成：OpenAI / Google / DeepInfra / fal / MiniMax
- 影片生成：DeepInfra / Qwen

當未設定 `agents.defaults.imageGenerationModel` 時，圖片生成可以推斷出基於驗證的供應商預設值。影片生成目前需要明確的 `agents.defaults.videoGenerationModel`，例如 `qwen/wan2.6-t2v`。

請參閱[圖片生成](/zh-Hant/tools/image-generation)、[Qwen Cloud](/zh-Hant/providers/qwen)和[模型](/zh-Hant/concepts/models)。

### 4) 記憶嵌入 (embeddings) + 語意搜尋

當為遠端供應商設定時，語意記憶搜尋會使用 **嵌入 API**：

- `memorySearch.provider = "openai"` → OpenAI embeddings
- `memorySearch.provider = "gemini"` → Gemini embeddings
- `memorySearch.provider = "voyage"` → Voyage embeddings
- `memorySearch.provider = "mistral"` → Mistral embeddings
- `memorySearch.provider = "deepinfra"` → DeepInfra embeddings
- `memorySearch.provider = "lmstudio"` → LM Studio embeddings (本地/自託管)
- `memorySearch.provider = "ollama"` → Ollama embeddings (本地/自託管；通常無託管 API 費用)
- 如果本機 embeddings 失敗，可選擇回退至遠端提供者

您可以使用 `memorySearch.provider = "local"` 將其保持在本地 (不使用 API)。

請參閱[記憶](/zh-Hant/concepts/memory)。

### 5) Web search tool

根據您的供應商，`web_search` 可能會產生使用費用：

- **Brave Search API**：`BRAVE_API_KEY` 或 `plugins.entries.brave.config.webSearch.apiKey`
- **Exa**：`EXA_API_KEY` 或 `plugins.entries.exa.config.webSearch.apiKey`
- **Firecrawl**：`FIRECRAWL_API_KEY` 或 `plugins.entries.firecrawl.config.webSearch.apiKey`
- **Gemini (Google Search)**：`GEMINI_API_KEY` 或 `plugins.entries.google.config.webSearch.apiKey`
- **Grok (xAI)**：`XAI_API_KEY` 或 `plugins.entries.xai.config.webSearch.apiKey`
- **Kimi (Moonshot)**：`KIMI_API_KEY`、`MOONSHOT_API_KEY` 或 `plugins.entries.moonshot.config.webSearch.apiKey`
- **MiniMax Search**：`MINIMAX_CODE_PLAN_KEY`、`MINIMAX_CODING_API_KEY`、`MINIMAX_API_KEY` 或 `plugins.entries.minimax.config.webSearch.apiKey`
- **Ollama 網路搜尋**：對於可連線且已登入的本機 Ollama 主機免金鑰；直接 `https://ollama.com` 搜尋使用 `OLLAMA_API_KEY`，且受保護的主機可以重用正常的 Ollama 提供者 bearer auth
- **Perplexity Search API**：`PERPLEXITY_API_KEY`、`OPENROUTER_API_KEY` 或 `plugins.entries.perplexity.config.webSearch.apiKey`
- **Tavily**：`TAVILY_API_KEY` 或 `plugins.entries.tavily.config.webSearch.apiKey`
- **DuckDuckGo**: 無金鑰的備選方案 (無 API 計費，但為非官方且基於 HTML)
- **SearXNG**：`SEARXNG_BASE_URL` 或 `plugins.entries.searxng.config.webSearch.baseUrl`（免金鑰/自託管；無託管 API 計費）

舊版 `tools.web.search.*` 提供者路徑仍會透過暫時性相容性 shim 載入，但它們不再是建議的設定介面。

**Brave Search 免費額度：** 每個 Brave 方案包含每月 5 美元的續期免費額度。Search 方案每 1,000 次請求收費 5 美元，因此該額度可覆蓋每月 1,000 次免費請求。請在 Brave 儀表板中設定使用量上限，以避免意外費用。

參閱 [Web tools](/zh-Hant/tools/web)。

### 5) Web 取用工具 (Firecrawl)

當存在 API 金鑰時，`web_fetch` 可以呼叫 **Firecrawl**：

- `FIRECRAWL_API_KEY` 或 `plugins.entries.firecrawl.config.webFetch.apiKey`

如果未設定 Firecrawl，該工具會退回到直接擷取加上隨附的 `web-readability` 外掛程式（無付費 API）。停用 `plugins.entries.web-readability.enabled` 以跳過本機 Readability 擷取。

參閱 [Web tools](/zh-Hant/tools/web)。

### 6) 提供者使用量快照 (狀態/健康狀況)

部分狀態指令會呼叫 **提供者使用量端點** 以顯示配額視窗或驗證健康狀況。
這些通常是低量呼叫，但仍會存取提供者 API：

- `openclaw status --usage`
- `openclaw models status --json`

參閱 [Models CLI](/zh-Hant/cli/models)。

### 7) 壓縮防護摘要

壓縮防護功能可以使用 **目前模型** 摘要工作階段歷史記錄，這會在執行時呼叫提供者 API。

參閱 [Session management + compaction](/zh-Hant/reference/session-management-compaction)。

### 8) 模型掃描 / 探測

`openclaw models scan` 可以探測 OpenRouter 模型，並在啟用探測時使用 `OPENROUTER_API_KEY`。

參閱 [Models CLI](/zh-Hant/cli/models)。

### 9) 語音交談

語音模式在設定後可以叫用 **ElevenLabs**：

- `ELEVENLABS_API_KEY` 或 `talk.providers.elevenlabs.apiKey`

參閱 [Talk mode](/zh-Hant/nodes/talk)。

### 10) 技能 (第三方 API)

Skills 可以將 `apiKey` 儲存在 `skills.entries.<name>.apiKey` 中。如果 skill 使用該金鑰存取外部 API，則可能會根據該 skill 的提供者產生費用。

參閱 [Skills](/zh-Hant/tools/skills)。

## 相關

- [Token use and costs](/zh-Hant/reference/token-use)
- [Prompt caching](/zh-Hant/reference/prompt-caching)
- [Usage tracking](/zh-Hant/concepts/usage-tracking)
