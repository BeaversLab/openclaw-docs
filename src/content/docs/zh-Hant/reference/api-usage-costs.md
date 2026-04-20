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
- 如果即時工作階段中繼資料稀疏，`/status` 可以從最新的逐字稿使用記錄中復原 token/快取計數器和作用中的執行時期模型標籤。現有的非零即時值優先採用，當儲存的總數缺失或較小時，提示大小的逐字稿總數可能取勝。

**每則訊息成本頁尾**

- `/usage full` 會在每則回覆後附加使用頁尾，包含**預估成本**（僅限 API 金鑰）。
- `/usage tokens` 僅顯示 token；訂閱式的 OAuth/token 和 CLI 流程會隱藏金錢成本。
- Gemini CLI 註：當 CLI 回傳 JSON 輸出時，OpenClaw 會從 `stats` 讀取使用量，將 `stats.cached` 正規化為 `cacheRead`，並在需要時從 `stats.input_tokens - stats.cached` 推算輸入 token。

Anthropic 說明：Anthropic 人員告訴我們，OpenClaw 風格的 Claude CLI 使用再次被允許，因此除非 Anthropic 發布新政策，否則 OpenClaw 將 Claude CLI 重用和 `claude -p` 使用視為此整合的授權行為。Anthropic 仍未公開 OpenClaw 可在 `/usage full` 中顯示的每則訊息估計成本。

**CLI 使用視窗（供應商配額）**

- `openclaw status --usage` 和 `openclaw channels list` 顯示供應商的**使用量視窗**
  （配額快照，而非每則訊息成本）。
- 人類輸出在各供應商間已正規化為 `X% left`。
- 目前支援使用視窗的供應商：Anthropic、GitHub Copilot、Gemini CLI、OpenAI Codex、MiniMax、Xiaomi 與 z.ai。
- MiniMax 說明：其原始 `usage_percent` / `usagePercent` 欄位表示剩餘
  配額，因此 OpenClaw 在顯示前會將其反轉。當存在以計數為基礎的欄位時，它們仍然優先。如果供應商傳回 `model_remains`，OpenClaw 偏好選擇
  聊天模型項目，必要時從時間戳記推導視窗標籤，並在方案標籤中包含模型名稱。
- 那些配額視窗的使用權限驗證來自供應商特定的掛鉤（如果可用）；否則 OpenClaw 會退而求其次，從驗證設定檔、環境變數或設定中匹配 OAuth/API 金鑰憑證。

詳情和範例請參閱 [Token use & costs](/en/reference/token-use)。

## 如何探索金鑰

OpenClaw 可以從以下位置獲取憑證：

- **Auth profiles**（每個 Agent 一組，儲存於 `auth-profiles.json`）。
- **環境變數**（例如 `OPENAI_API_KEY`、`BRAVE_API_KEY`、`FIRECRAWL_API_KEY`）。
- **Config**（`models.providers.*.apiKey`、`plugins.entries.*.config.webSearch.apiKey`、
  `plugins.entries.firecrawl.config.webFetch.apiKey`、`memorySearch.*`、
  `talk.providers.*.apiKey`）。
- **Skills**（`skills.entries.<name>.apiKey`），可能會將金鑰匯出到 skill process env。

## 可能消耗金鑰的功能

### 1) 核心模型回應（聊天 + 工具）

每次回覆或工具呼叫都會使用 **目前模型供應商**（OpenAI、Anthropic 等）。這是使用量和成本的主要來源。

這也包含訂閱式的託管供應商，它們仍會在 OpenClaw 本地 UI 之外計費，例如 **OpenAI Codex**、**阿里雲 Model Studio
編碼方案**、**MiniMax 編碼方案**、**Z.AI / GLM 編碼方案**，以及
Anthropic 的 OpenClaw Claude 登入路徑且已啟用 **額外使用量**。

價格設定請參閱 [Models](/en/providers/models)，顯示相關資訊請參閱 [Token use & costs](/en/reference/token-use)。

### 2) 媒體理解（音訊/圖片/影片）

傳入的媒體可以在回覆執行前進行摘要/轉錄。這會使用模型/供應商 API。

- 音訊：OpenAI / Groq / Deepgram / Google / Mistral。
- 圖片：OpenAI / OpenRouter / Anthropic / Google / MiniMax / Moonshot / Qwen / Z.AI。
- 影片：Google / Qwen / Moonshot。

請參閱 [Media understanding](/en/nodes/media-understanding)。

### 3) 圖片和影片生成

共享的生成功能也可能消耗供應商金鑰：

- 圖片生成：OpenAI / Google / fal / MiniMax
- 影片生成：Qwen

當 `agents.defaults.imageGenerationModel` 未設定時，圖片生成可以推斷出支援驗證的預設供應商。影片生成目前
需要明確的 `agents.defaults.videoGenerationModel`，例如
`qwen/wan2.6-t2v`。

請參閱 [Image generation](/en/tools/image-generation)、[Qwen Cloud](/en/providers/qwen)
和 [Models](/en/concepts/models)。

### 4) 記憶嵌入 + 語意搜尋

當設定為遠端供應商時，語意記憶搜尋會使用 **嵌入 API**：

- `memorySearch.provider = "openai"` → OpenAI embeddings
- `memorySearch.provider = "gemini"` → Gemini 嵌入
- `memorySearch.provider = "voyage"` → Voyage 嵌入
- `memorySearch.provider = "mistral"` → Mistral 嵌入
- `memorySearch.provider = "lmstudio"` → LM Studio embeddings (本機/自託管)
- `memorySearch.provider = "ollama"` → Ollama embeddings (本機/自託管；通常無託管 API 計費)
- 如果本機 embeddings 失敗，可選擇回退至遠端提供者

您可以使用 `memorySearch.provider = "local"` 將其保持在本地 (不使用 API)。

請參閱 [Memory](/en/concepts/memory)。

### 5) Web search tool

`web_search` 可能會根據您的提供者產生使用費用：

- **Brave Search API**: `BRAVE_API_KEY` 或 `plugins.entries.brave.config.webSearch.apiKey`
- **Exa**: `EXA_API_KEY` 或 `plugins.entries.exa.config.webSearch.apiKey`
- **Firecrawl**: `FIRECRAWL_API_KEY` 或 `plugins.entries.firecrawl.config.webSearch.apiKey`
- **Gemini (Google Search)**: `GEMINI_API_KEY` 或 `plugins.entries.google.config.webSearch.apiKey`
- **Grok (xAI)**: `XAI_API_KEY` 或 `plugins.entries.xai.config.webSearch.apiKey`
- **Kimi (Moonshot)**: `KIMI_API_KEY`、`MOONSHOT_API_KEY` 或 `plugins.entries.moonshot.config.webSearch.apiKey`
- **MiniMax Search**: `MINIMAX_CODE_PLAN_KEY`、`MINIMAX_CODING_API_KEY`、`MINIMAX_API_KEY` 或 `plugins.entries.minimax.config.webSearch.apiKey`
- **Ollama Web Search**: 預設無需金鑰，但需要可連線的 Ollama 主機以及 `ollama signin`；當主機有要求時，也可以重複使用一般的 Ollama 提供者 bearer auth
- **Perplexity Search API**: `PERPLEXITY_API_KEY`、`OPENROUTER_API_KEY` 或 `plugins.entries.perplexity.config.webSearch.apiKey`
- **Tavily**: `TAVILY_API_KEY` 或 `plugins.entries.tavily.config.webSearch.apiKey`
- **DuckDuckGo**: 無金鑰的備選方案 (無 API 計費，但為非官方且基於 HTML)
- **SearXNG**: `SEARXNG_BASE_URL` 或 `plugins.entries.searxng.config.webSearch.baseUrl` （免鑰匙/自託管；無託管 API 計費）

舊版 `tools.web.search.*` 提供者路徑仍透過暫時性相容性墊片載入，但這些路徑不再是建議的設定介面。

**Brave Search 免費額度：** 每個 Brave 方案包含每月 5 美元的續期免費額度。Search 方案每 1,000 次請求收費 5 美元，因此該額度可覆蓋每月 1,000 次免費請求。請在 Brave 儀表板中設定使用量上限，以避免意外費用。

請參閱 [Web 工具](/en/tools/web)。

### 5) Web 取用工具 (Firecrawl)

當存在 API 金鑰時，`web_fetch` 可以呼叫 **Firecrawl**：

- `FIRECRAWL_API_KEY` 或 `plugins.entries.firecrawl.config.webFetch.apiKey`

如果未設定 Firecrawl，該工具會退回至直接取用 + 可讀性處理（無付費 API）。

請參閱 [Web 工具](/en/tools/web)。

### 6) 提供者使用量快照 (狀態/健康狀況)

部分狀態指令會呼叫 **提供者使用量端點** 以顯示配額視窗或驗證健康狀況。
這些通常是低量呼叫，但仍會存取提供者 API：

- `openclaw status --usage`
- `openclaw models status --json`

請參閱 [Models CLI](/en/cli/models)。

### 7) 壓縮防護摘要

壓縮防護功能可以使用 **目前模型** 摘要工作階段歷史記錄，這會在執行時呼叫提供者 API。

請參閱 [工作階段管理 + 壓縮](/en/reference/session-management-compaction)。

### 8) 模型掃描 / 探測

`openclaw models scan` 可以探測 OpenRouter 模型，並在啟用探測時使用 `OPENROUTER_API_KEY`。

請參閱 [Models CLI](/en/cli/models)。

### 9) 語音交談

語音模式在設定後可以叫用 **ElevenLabs**：

- `ELEVENLABS_API_KEY` 或 `talk.providers.elevenlabs.apiKey`

請參閱 [語音模式](/en/nodes/talk)。

### 10) 技能 (第三方 API)

技能可以在 `skills.entries.<name>.apiKey` 中儲存 `apiKey`。如果技能使用該金鑰存取外部 API，可能會根據該技能的提供者產生費用。

請參閱 [技能](/en/tools/skills)。
