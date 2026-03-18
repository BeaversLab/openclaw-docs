---
summary: "模型供應商概覽，包含範例設定與 CLI 流程"
read_when:
  - You need a provider-by-provider model setup reference
  - You want example configs or CLI onboarding commands for model providers
title: "模型供應商"
---

# 模型供應商

本頁涵蓋 **LLM/模型供應商**（而非 WhatsApp/Telegram 等聊天頻道）。
如需模型選擇規則，請參閱 [/concepts/models](/zh-Hant/concepts/models)。

## 快速規則

- 模型參照使用 `provider/model`（例如：`opencode/claude-opus-4-6`）。
- 如果您設定了 `agents.defaults.models`，它將成為允許清單。
- CLI 輔助工具：`openclaw onboard`、`openclaw models list`、`openclaw models set <provider/model>`。
- 供應商插件可以透過 `registerProvider({ catalog })` 注入模型目錄；
  OpenClaw 會在寫入 `models.json` 之前，將該輸出合併到 `models.providers` 中。
- 供應商清單可以宣告 `providerAuthEnvVars`，因此通用基於環境變數的
  身份驗證探測不需要載入插件執行時。剩餘的核心環境變數對應
  現在僅用於非插件/核心供應商，以及少數通用優先權
  案例，例如 Anthropic 優先使用 API 金鑰的入門流程。
- 供應商插件也可以透過
  `resolveDynamicModel`、`prepareDynamicModel`、`normalizeResolvedModel`、
  `capabilities`、`prepareExtraParams`、`wrapStreamFn`、`formatApiKey`、
  `refreshOAuth`、`buildAuthDoctorHint`、
  `isCacheTtlEligible`、`buildMissingAuthMessage`、
  `suppressBuiltInModel`、`augmentModelCatalog`、`isBinaryThinking`、
  `supportsXHighThinking`、`resolveDefaultThinkingLevel`、
  `isModernModelRef`、`prepareRuntimeAuth`、`resolveUsageAuth` 和
  `fetchUsageSnapshot` 擁有供應商執行時行為。

## 插件擁有的供應商行為

供應商插件現在可以擁有大部分特定於供應商的邏輯，而 OpenClaw 則保持
通用推論迴圈。

典型分工：

- `auth[].run` / `auth[].runNonInteractive`: 提供者擁有 `openclaw onboard`、`openclaw models auth` 和無介面設定的上架/登入流程
- `wizard.setup` / `wizard.modelPicker`: 提供者擁有驗證選擇標籤、舊版別名、上架允許清單提示，以及上架/模型選擇器中的設定項目
- `catalog`: 提供者會出現在 `models.providers` 中
- `resolveDynamicModel`: 提供者接受本地靜態目錄中尚未存在的模型 ID
- `prepareDynamicModel`: 提供者在重試動態解析之前需要重新整理元資料
- `normalizeResolvedModel`: 提供者需要傳輸或基礎 URL 重寫
- `capabilities`: 提供者發佈文字記錄/工具/提供者家族的怪異行為
- `prepareExtraParams`: 提供者設定預設值或正規化各模型的請求參數
- `wrapStreamFn`: 提供者套用請求標頭/請求主體/模型相容性包裝器
- `formatApiKey`: 提供者將儲存的驗證設定檔格式化為傳輸所需的執行階段 `apiKey` 字串
- `refreshOAuth`: 當共用的 `pi-ai` 重新整理器不足時，提供者擁有 OAuth 重新整理
- `buildAuthDoctorHint`: 當 OAuth 重新整理失敗時，提供者附加修復指南
- `isCacheTtlEligible`: 提供者決定哪些上游模型 ID 支援 prompt-cache TTL
- `buildMissingAuthMessage`: 提供者將一般驗證儲存錯誤替換為提供者特定的恢復提示
- `suppressBuiltInModel`: 提供者隱藏過時的上游列，並可針對直接解析失敗返回供應商擁有的錯誤
- `augmentModelCatalog`: 提供者在探索和設定合併後附加合成/最終目錄列
- `isBinaryThinking`: 提供者擁有二元開/關思考 UX
- `supportsXHighThinking`: 提供者將選定的模型選入 `xhigh`
- `resolveDefaultThinkingLevel`: 提供者擁有模型系列預設的 `/think` 原則
- `isModernModelRef`：提供者擁有即時/煙霧首選模型匹配
- `prepareRuntimeAuth`：提供者將設定的憑證轉換為短期運行時 token
- `resolveUsageAuth`：提供者解析 `/usage` 的使用量/配額憑證以及相關的狀態/報告介面
- `fetchUsageSnapshot`：提供者擁有使用量端點的擷取/解析，而核心仍擁有摘要外殼和格式化

目前的內建範例：

- `anthropic`：Claude 4.6 前向相容性回退、驗證修復提示、使用量端點擷取以及快取 TTL/提供者系列元數據
- `openrouter`：透傳模型 ID、請求包裝器、提供者能力提示以及快取 TTL 策略
- `github-copilot`：入門/裝置登入、前向相容模型回退、Claude 思考文字紀錄提示、運行時 token 交換以及使用量端點擷取
- `openai`：GPT-5.4 前向相容性回退、直接 OpenAI 傳輸正規化、感知 Codex 的缺失驗證提示、Spark 抑制、合成 OpenAI/Codex 目錄列、思考/即時模型策略以及提供者系列元數據
- `google` 和 `google-gemini-cli`：Gemini 3.1 前向相容性回退和現代模型匹配；Gemini CLI OAuth 也擁有驗證設定檔 token 格式化、使用量 token 解析以及使用量介面的配額端點擷取
- `moonshot`：共用傳輸、外掛擁有的思考載荷正規化
- `kilocode`：共用傳輸、外掛擁有的請求標頭、推理載荷正規化、Gemini 文字紀錄提示以及快取 TTL 策略
- `zai`：GLM-5 前向相容性回退、`tool_stream` 預設值、快取 TTL 策略、二元思考/即時模型策略以及使用量驗證 + 配額擷取
- `mistral`、`opencode` 和 `opencode-go`：外掛擁有的能力元數據
- `byteplus`、`cloudflare-ai-gateway`、`huggingface`、`kimi-coding`、
  `modelstudio`、`nvidia`、`qianfan`、`synthetic`、`together`、`venice`、
  `vercel-ai-gateway` 和 `volcengine`：僅限外掛擁有的目錄
- `qwen-portal`：外掛擁有的目錄、OAuth 登入和 OAuth 更新
- `minimax` 和 `xiaomi`：外掛擁有的目錄加上使用量授權/快照邏輯

隨附的 `openai` 外掛現在擁有這兩個提供者 ID：`openai` 和
`openai-codex`。

這涵蓋了仍然適用 OpenClaw 正常傳輸的提供者。如果提供者需要完全自訂的請求執行器，則這是一個獨立、更深層的擴充介面。

## API 金鑰輪替

- 支援選定提供者的通用提供者輪替。
- 透過以下方式設定多個金鑰：
  - `OPENCLAW_LIVE_<PROVIDER>_KEY` (單一即時覆寫，最高優先順序)
  - `<PROVIDER>_API_KEYS` (逗號或分號清單)
  - `<PROVIDER>_API_KEY` (主要金鑰)
  - `<PROVIDER>_API_KEY_*` (編號清單，例如 `<PROVIDER>_API_KEY_1`)
- 對於 Google 提供者，也會將 `GOOGLE_API_KEY` 包含為備用。
- 金鑰選擇順序會保留優先順序並將值重複資料刪除。
- 請求僅在速率限制回應時才會使用下一個金鑰重試 (例如 `429`、`rate_limit`、`quota`、`resource exhausted`)。
- 非速率限制失敗會立即失敗；不會嘗試金鑰輪替。
- 當所有候選金鑰都失敗時，會從最後一次嘗試傳回最終錯誤。

## 內建提供者 (pi-ai 目錄)

OpenClaw 隨附 pi‑ai 目錄。這些提供者**不**需要
`models.providers` 設定；只要設定授權 + 選擇模型即可。

### OpenAI

- 提供者：`openai`
- 授權：`OPENAI_API_KEY`
- 可選輪替：`OPENAI_API_KEYS`、`OPENAI_API_KEY_1`、`OPENAI_API_KEY_2`，加上 `OPENCLAW_LIVE_OPENAI_KEY`（單一覆寫）
- 範例模型：`openai/gpt-5.4`、`openai/gpt-5.4-pro`
- CLI：`openclaw onboard --auth-choice openai-api-key`
- 預設傳輸方式為 `auto`（優先使用 WebSocket，SSE 作為後備）
- 透過 `agents.defaults.models["openai/<model>"].params.transport` 針對各模型進行覆寫（`"sse"`、`"websocket"` 或 `"auto"`）
- OpenAI Responses WebSocket 預熱預設透過 `params.openaiWsWarmup` 啟用（`true`/`false`）
- 可透過 `agents.defaults.models["openai/<model>"].params.serviceTier` 啟用 OpenAI 優先處理
- 可透過 `agents.defaults.models["<provider>/<model>"].params.fastMode` 針對各模型啟用 OpenAI 快速模式
- `openai/gpt-5.3-codex-spark` 在 OpenClaw 中被刻意隱藏，因為即時 OpenAI API 會拒絕它；Spark 被視為僅限 Codex 使用

```json5
{
  agents: { defaults: { model: { primary: "openai/gpt-5.4" } } },
}
```

### Anthropic

- 提供者：`anthropic`
- 驗證：`ANTHROPIC_API_KEY` 或 `claude setup-token`
- 可選輪替：`ANTHROPIC_API_KEYS`、`ANTHROPIC_API_KEY_1`、`ANTHROPIC_API_KEY_2`，加上 `OPENCLAW_LIVE_ANTHROPIC_KEY`（單一覆寫）
- 範例模型：`anthropic/claude-opus-4-6`
- CLI：`openclaw onboard --auth-choice token`（貼上 setup-token）或 `openclaw models auth paste-token --provider anthropic`
- 直接 API 金鑰模型支援共用 `/fast` 切換開關與 `params.fastMode`；OpenClaw 將其對應到 Anthropic `service_tier`（`auto` 與 `standard_only`）
- 政策說明：支援 setup-token 是技術相容性；Anthropic 過去曾在 Claude Code 之外封鎖部分訂閱使用。請確認目前的 Anthropic 條款，並根據您的風險承受能力做出決定。
- 建議：Anthropic API 金鑰驗證是比訂閱 setup-token 驗證更安全、更推薦的途徑。

```json5
{
  agents: { defaults: { model: { primary: "anthropic/claude-opus-4-6" } } },
}
```

### OpenAI Code (Codex)

- 提供者：`openai-codex`
- 驗證：OAuth (ChatGPT)
- 範例模型：`openai-codex/gpt-5.4`
- CLI：`openclaw onboard --auth-choice openai-codex` 或 `openclaw models auth login --provider openai-codex`
- 預設傳輸方式為 `auto`（優先使用 WebSocket，失敗時回退至 SSE）
- 透過 `agents.defaults.models["openai-codex/<model>"].params.transport` 針對每個模型進行覆蓋（`"sse"`、`"websocket"` 或 `"auto"`）
- 與直接 `openai/*` 共用相同的 `/fast` 切換開關和 `params.fastMode` 設定
- 當 Codex OAuth 目錄公開 `openai-codex/gpt-5.3-codex-spark` 時，該模型仍保持可用；視授權情況而定
- 政策說明：明確支援將 OpenAI Codex OAuth 用於外部工具/工作流程（如 OpenClaw）。

```json5
{
  agents: { defaults: { model: { primary: "openai-codex/gpt-5.4" } } },
}
```

### OpenCode

- 驗證：`OPENCODE_API_KEY`（或 `OPENCODE_ZEN_API_KEY`）
- Zen 執行時期供應商：`opencode`
- Go 執行時期供應商：`opencode-go`
- 模型範例：`opencode/claude-opus-4-6`、`opencode-go/kimi-k2.5`
- CLI：`openclaw onboard --auth-choice opencode-zen` 或 `openclaw onboard --auth-choice opencode-go`

```json5
{
  agents: { defaults: { model: { primary: "opencode/claude-opus-4-6" } } },
}
```

### Google Gemini (API 金鑰)

- 供應商：`google`
- 驗證：`GEMINI_API_KEY`
- 選用輪替：`GEMINI_API_KEYS`、`GEMINI_API_KEY_1`、`GEMINI_API_KEY_2`、`GOOGLE_API_KEY` 回退機制，以及 `OPENCLAW_LIVE_GEMINI_KEY`（單一覆寫）
- 模型範例：`google/gemini-3.1-pro-preview`、`google/gemini-3-flash-preview`
- 相容性：使用 `google/gemini-3.1-flash-preview` 的舊版 OpenClaw 設定會被正規化為 `google/gemini-3-flash-preview`
- CLI：`openclaw onboard --auth-choice gemini-api-key`

### Google Vertex 和 Gemini CLI

- 供應商：`google-vertex`、`google-gemini-cli`
- 驗證：Vertex 使用 gcloud ADC；Gemini CLI 使用其 OAuth 流程
- 注意：OpenClaw 中的 Gemini CLI OAuth 是非官方整合。部分使用者回報在使用第三方用戶端後遭遇 Google 帳號限制。請審閱 Google 條款，若選擇繼續請使用非關鍵帳號。
- Gemini CLI OAuth 隨附於內建的 `google` 外掛程式中。
  - 啟用：`openclaw plugins enable google`
  - 登入：`openclaw models auth login --provider google-gemini-cli --set-default`
  - 注意：您**不**需要將客戶端 ID 或密鑰貼上到 `openclaw.json` 中。CLI 登入流程會將
    權杖儲存在閘道主機的驗證設定檔中。

### Z.AI (GLM)

- 提供商：`zai`
- 驗證：`ZAI_API_KEY`
- 範例模型：`zai/glm-5`
- CLI：`openclaw onboard --auth-choice zai-api-key`
  - 別名：`z.ai/*` 和 `z-ai/*` 會正規化為 `zai/*`

### Vercel AI Gateway

- 提供商：`vercel-ai-gateway`
- 驗證：`AI_GATEWAY_API_KEY`
- 範例模型：`vercel-ai-gateway/anthropic/claude-opus-4.6`
- CLI：`openclaw onboard --auth-choice ai-gateway-api-key`

### Kilo Gateway

- 提供商：`kilocode`
- 驗證：`KILOCODE_API_KEY`
- 範例模型：`kilocode/anthropic/claude-opus-4.6`
- CLI：`openclaw onboard --kilocode-api-key <key>`
- 基本 URL：`https://api.kilo.ai/api/gateway/`
- 擴充的內建目錄包含 GLM-5 Free、MiniMax M2.5 Free、GPT-5.2、Gemini 3 Pro Preview、Gemini 3 Flash Preview、Grok Code Fast 1 和 Kimi K2.5。

請參閱 [/providers/kilocode](/zh-Hant/providers/kilocode) 以了解設定細節。

### 其他捆綁的提供商外掛程式

- OpenRouter：`openrouter` (`OPENROUTER_API_KEY`)
- 範例模型：`openrouter/anthropic/claude-sonnet-4-5`
- Kilo Gateway：`kilocode` (`KILOCODE_API_KEY`)
- 範例模型：`kilocode/anthropic/claude-opus-4.6`
- MiniMax：`minimax` (`MINIMAX_API_KEY`)
- Moonshot：`moonshot` (`MOONSHOT_API_KEY`)
- Kimi Coding：`kimi-coding` (`KIMI_API_KEY` 或 `KIMICODE_API_KEY`)
- Qianfan：`qianfan` (`QIANFAN_API_KEY`)
- Model Studio：`modelstudio` (`MODELSTUDIO_API_KEY`)
- NVIDIA：`nvidia` (`NVIDIA_API_KEY`)
- Together：`together` (`TOGETHER_API_KEY`)
- Venice：`venice` (`VENICE_API_KEY`)
- Xiaomi：`xiaomi` (`XIAOMI_API_KEY`)
- Vercel AI Gateway: `vercel-ai-gateway` (`AI_GATEWAY_API_KEY`)
- Hugging Face Inference: `huggingface` (`HUGGINGFACE_HUB_TOKEN` 或 `HF_TOKEN`)
- Cloudflare AI Gateway: `cloudflare-ai-gateway` (`CLOUDFLARE_AI_GATEWAY_API_KEY`)
- Volcengine: `volcengine` (`VOLCANO_ENGINE_API_KEY`)
- BytePlus: `byteplus` (`BYTEPLUS_API_KEY`)
- xAI: `xai` (`XAI_API_KEY`)
- Mistral: `mistral` (`MISTRAL_API_KEY`)
- 範例模型：`mistral/mistral-large-latest`
- CLI：`openclaw onboard --auth-choice mistral-api-key`
- Groq: `groq` (`GROQ_API_KEY`)
- Cerebras: `cerebras` (`CEREBRAS_API_KEY`)
  - Cerebras 上的 GLM 模型使用 ID `zai-glm-4.7` 和 `zai-glm-4.6`。
  - OpenAI 相容的基礎 URL：`https://api.cerebras.ai/v1`。
- GitHub Copilot: `github-copilot` (`COPILOT_GITHUB_TOKEN` / `GH_TOKEN` / `GITHUB_TOKEN`)
- Hugging Face Inference 範例模型：`huggingface/deepseek-ai/DeepSeek-R1`；CLI：`openclaw onboard --auth-choice huggingface-api-key`。請參閱 [Hugging Face (Inference)](/zh-Hant/providers/huggingface)。

## 透過 `models.providers` 的提供者（自訂/基礎 URL）

使用 `models.providers`（或 `models.json`）來新增**自訂**提供者或
OpenAI/Anthropic 相容的 Proxy。

以下許多內建提供者外掛已經發布了預設目錄。
僅當您想要覆寫預設基礎 URL、標頭或模型清單時，才使用明確的 `models.providers.<id>` 項目。

### Moonshot AI (Kimi)

Moonshot 使用與 OpenAI 相容的端點，因此將其設定為自訂提供者：

- 提供者：`moonshot`
- 驗證：`MOONSHOT_API_KEY`
- 範例模型：`moonshot/kimi-k2.5`

Kimi K2 模型 ID：

[//]: # "moonshot-kimi-k2-model-refs:start"

- `moonshot/kimi-k2.5`
- `moonshot/kimi-k2-0905-preview`
- `moonshot/kimi-k2-turbo-preview`
- `moonshot/kimi-k2-thinking`
- `moonshot/kimi-k2-thinking-turbo`

[//]: # "moonshot-kimi-k2-model-refs:end"

```json5
{
  agents: {
    defaults: { model: { primary: "moonshot/kimi-k2.5" } },
  },
  models: {
    mode: "merge",
    providers: {
      moonshot: {
        baseUrl: "https://api.moonshot.ai/v1",
        apiKey: "${MOONSHOT_API_KEY}",
        api: "openai-completions",
        models: [{ id: "kimi-k2.5", name: "Kimi K2.5" }],
      },
    },
  },
}
```

### Kimi Coding

Kimi Coding 使用 Moonshot AI 的相容 Anthropic 端點：

- 供應商：`kimi-coding`
- 驗證：`KIMI_API_KEY`
- 範例模型：`kimi-coding/k2p5`

```json5
{
  env: { KIMI_API_KEY: "sk-..." },
  agents: {
    defaults: { model: { primary: "kimi-coding/k2p5" } },
  },
}
```

### Qwen OAuth (免費層級)

Qwen 提供透過裝置代碼流程存取 Qwen Coder + Vision 的 OAuth。
內建的供應商外掛預設為啟用，因此只需登入：

```bash
openclaw models auth login --provider qwen-portal --set-default
```

模型參考：

- `qwen-portal/coder-model`
- `qwen-portal/vision-model`

請參閱 [/providers/qwen](/zh-Hant/providers/qwen) 以了解設定詳細資訊與注意事項。

### 火山引擎

火山引擎提供對中國境內豆包和其他模型的存取。

- 供應商：`volcengine` (編碼：`volcengine-plan`)
- 驗證：`VOLCANO_ENGINE_API_KEY`
- 範例模型：`volcengine/doubao-seed-1-8-251228`
- CLI：`openclaw onboard --auth-choice volcengine-api-key`

```json5
{
  agents: {
    defaults: { model: { primary: "volcengine/doubao-seed-1-8-251228" } },
  },
}
```

可用模型：

- `volcengine/doubao-seed-1-8-251228` (豆包種子 1.8)
- `volcengine/doubao-seed-code-preview-251028`
- `volcengine/kimi-k2-5-260127` (Kimi K2.5)
- `volcengine/glm-4-7-251222` (GLM 4.7)
- `volcengine/deepseek-v3-2-251201` (DeepSeek V3.2 128K)

編碼模型 (`volcengine-plan`)：

- `volcengine-plan/ark-code-latest`
- `volcengine-plan/doubao-seed-code`
- `volcengine-plan/kimi-k2.5`
- `volcengine-plan/kimi-k2-thinking`
- `volcengine-plan/glm-4.7`

### BytePlus (國際版)

BytePlus ARK 為國際用戶提供與火山引擎相同的模型存取權。

- 供應商：`byteplus` (編碼：`byteplus-plan`)
- 驗證：`BYTEPLUS_API_KEY`
- 範例模型：`byteplus/seed-1-8-251228`
- CLI：`openclaw onboard --auth-choice byteplus-api-key`

```json5
{
  agents: {
    defaults: { model: { primary: "byteplus/seed-1-8-251228" } },
  },
}
```

可用模型：

- `byteplus/seed-1-8-251228` (種子 1.8)
- `byteplus/kimi-k2-5-260127` (Kimi K2.5)
- `byteplus/glm-4-7-251222` (GLM 4.7)

編碼模型 (`byteplus-plan`)：

- `byteplus-plan/ark-code-latest`
- `byteplus-plan/doubao-seed-code`
- `byteplus-plan/kimi-k2.5`
- `byteplus-plan/kimi-k2-thinking`
- `byteplus-plan/glm-4.7`

### Synthetic

Synthetic 提供位於 `synthetic` 供應商後方的相容 Anthropic 模型：

- 提供商：`synthetic`
- 身份驗證：`SYNTHETIC_API_KEY`
- 範例模型：`synthetic/hf:MiniMaxAI/MiniMax-M2.5`
- CLI：`openclaw onboard --auth-choice synthetic-api-key`

```json5
{
  agents: {
    defaults: { model: { primary: "synthetic/hf:MiniMaxAI/MiniMax-M2.5" } },
  },
  models: {
    mode: "merge",
    providers: {
      synthetic: {
        baseUrl: "https://api.synthetic.new/anthropic",
        apiKey: "${SYNTHETIC_API_KEY}",
        api: "anthropic-messages",
        models: [{ id: "hf:MiniMaxAI/MiniMax-M2.5", name: "MiniMax M2.5" }],
      },
    },
  },
}
```

### MiniMax

由於 MiniMax 使用自訂端點，因此透過 `models.providers` 進行設定：

- MiniMax（相容 Anthropic）：`--auth-choice minimax-api`
- 身份驗證：`MINIMAX_API_KEY`

請參閱 [/providers/minimax](/zh-Hant/providers/minimax) 以了解設定細節、模型選項和設定片段。

### Ollama

Ollama 作為捆綁的提供商插件出貨，並使用 Ollama 的原生 API：

- 提供商：`ollama`
- 身份驗證：不需要（本機伺服器）
- 範例模型：`ollama/llama3.3`
- 安裝：[https://ollama.com/download](https://ollama.com/download)

```bash
# Install Ollama, then pull a model:
ollama pull llama3.3
```

```json5
{
  agents: {
    defaults: { model: { primary: "ollama/llama3.3" } },
  },
}
```

當您使用 `OLLAMA_API_KEY` 選擇加入時，會在 `http://127.0.0.1:11434` 本機偵測到 Ollama，且捆綁的提供商插件會直接將 Ollama 新增至 `openclaw onboard` 和模型選擇器。請參閱 [/providers/ollama](/zh-Hant/providers/ollama) 以了解入門、雲端/本機模式和自訂設定。

### vLLM

vLLM 作為本機/託管的 OpenAI 相容伺服器之捆綁提供商插件出貨：

- 提供商：`vllm`
- 身份驗證：選用（視您的伺服器而定）
- 預設基礎 URL：`http://127.0.0.1:8000/v1`

若要在本機選擇加入自動探索（如果您的伺服器不強制執行身份驗證，則任何值皆可）：

```bash
export VLLM_API_KEY="vllm-local"
```

然後設定模型（替換為 `/v1/models` 傳回的其中一個 ID）：

```json5
{
  agents: {
    defaults: { model: { primary: "vllm/your-model-id" } },
  },
}
```

請參閱 [/providers/vllm](/zh-Hant/providers/vllm) 以了解詳細資訊。

### SGLang

SGLang 作為快速託管的 OpenAI 相容伺服器之捆綁提供商插件出貨：

- 提供商：`sglang`
- 身份驗證：選用（視您的伺服器而定）
- 預設基礎 URL：`http://127.0.0.1:30000/v1`

若要在本機選擇加入自動探索（如果您的伺服器不強制執行身份驗證，則任何值皆可）：

```bash
export SGLANG_API_KEY="sglang-local"
```

然後設定模型（替換為 `/v1/models` 傳回的其中一個 ID）：

```json5
{
  agents: {
    defaults: { model: { primary: "sglang/your-model-id" } },
  },
}
```

請參閱 [/providers/sglang](/zh-Hant/providers/sglang) 以了解詳細資訊。

### 本機代理（LM Studio、vLLM、LiteLLM 等）

範例（相容 OpenAI）：

```json5
{
  agents: {
    defaults: {
      model: { primary: "lmstudio/minimax-m2.5-gs32" },
      models: { "lmstudio/minimax-m2.5-gs32": { alias: "Minimax" } },
    },
  },
  models: {
    providers: {
      lmstudio: {
        baseUrl: "http://localhost:1234/v1",
        apiKey: "LMSTUDIO_KEY",
        api: "openai-completions",
        models: [
          {
            id: "minimax-m2.5-gs32",
            name: "MiniMax M2.5",
            reasoning: false,
            input: ["text"],
            cost: { input: 0, output: 0, cacheRead: 0, cacheWrite: 0 },
            contextWindow: 200000,
            maxTokens: 8192,
          },
        ],
      },
    },
  },
}
```

備註：

- 對於自訂提供者，`reasoning`、`input`、`cost`、`contextWindow` 和 `maxTokens` 為選用項目。
  若省略，OpenClaw 預設為：
  - `reasoning: false`
  - `input: ["text"]`
  - `cost: { input: 0, output: 0, cacheRead: 0, cacheWrite: 0 }`
  - `contextWindow: 200000`
  - `maxTokens: 8192`
- 建議：設定符合您代理/模型限制的明確數值。
- 對於非原生端點上的 `api: "openai-completions"`（任何主機非 `api.openai.com` 的非空 `baseUrl`），OpenClaw 會強制執行 `compat.supportsDeveloperRole: false`，以避免提供者因不支援的 `developer` 角色而回傳 400 錯誤。
- 如果 `baseUrl` 為空或省略，OpenClaw 將保持預設的 OpenAI 行為（其解析為 `api.openai.com`）。
- 為了安全起見，明確的 `compat.supportsDeveloperRole: true` 在非原生 `openai-completions` 端點上仍會被覆寫。

## CLI 範例

```bash
openclaw onboard --auth-choice opencode-zen
openclaw models set opencode/claude-opus-4-6
openclaw models list
```

另請參閱：[/gateway/configuration](/zh-Hant/gateway/configuration) 以取得完整的組態範例。

import footerZhHant from "/components/footer/zh-Hant.mdx";

<footerZhHant />
