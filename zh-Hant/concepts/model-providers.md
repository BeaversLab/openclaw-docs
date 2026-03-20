---
summary: "模型提供者概述，包含範例組態與 CLI 流程"
read_when:
  - 您需要逐個提供者的模型設定參考
  - 您想要模型提供者的範例組態或 CLI 上線指令
title: "模型提供者"
---

# 模型提供者

本頁涵蓋 **LLM/模型提供者**（而非如 WhatsApp/Telegram 等聊天頻道）。
若要查看模型選擇規則，請參閱 [/concepts/models](/zh-Hant/concepts/models)。

## 快速規則

- 模型參照使用 `provider/model`（範例：`opencode/claude-opus-4-6`）。
- 如果您設定 `agents.defaults.models`，它將成為允許清單。
- CLI 輔助工具：`openclaw onboard`、`openclaw models list`、`openclaw models set <provider/model>`。
- 提供者外掛程式可以透過 `registerProvider({ catalog })` 注入模型型錄；
  OpenClaw 會在寫入 `models.json` 之前，將該輸出合併到 `models.providers` 中。
- 提供者宣告可以宣告 `providerAuthEnvVars`，這樣通用基於環境變數的
  驗證探測就不需要載入外掛程式執行時。其餘的核心環境變數
  對映現在僅用於非外掛程式/核心提供者以及少數通用優先順序
  情境，例如 Anthropic 的 API 金鑰優先上線。
- 提供者外掛程式也可以透過
  `resolveDynamicModel`、`prepareDynamicModel`、`normalizeResolvedModel`、
  `capabilities`、`prepareExtraParams`、`wrapStreamFn`、`formatApiKey`、
  `refreshOAuth`、`buildAuthDoctorHint`、
  `isCacheTtlEligible`、`buildMissingAuthMessage`、
  `suppressBuiltInModel`、`augmentModelCatalog`、`isBinaryThinking`、
  `supportsXHighThinking`、`resolveDefaultThinkingLevel`、
  `isModernModelRef`、`prepareRuntimeAuth`、`resolveUsageAuth` 以及
  `fetchUsageSnapshot` 來擁有提供者執行時行為。
- 注意：提供者運行時 `capabilities` 是共享的 runner 元數據（提供者
家族、transcript/工具特性、傳輸/緩存提示）。它與描述外掛註冊內容（文字推理、語音等）的 [公開功能模型](/zh-Hant/tools/plugin#public-capability-model) 不同。

## 外掛擁有的提供者行為

提供者外掛現在可以擁有大部分特定於提供者的邏輯，而 OpenClaw 則保留
通用推理循環。

典型分工：

- `auth[].run` / `auth[].runNonInteractive`：提供者擁有針對 `openclaw onboard`、`openclaw models auth` 和無頭設置的入門/登入流程
- `wizard.setup` / `wizard.modelPicker`：提供者擁有認證選擇標籤、
舊版別名、入門允許清單提示，以及入門/模型選擇器中的設置項目
- `catalog`：提供者出現在 `models.providers` 中
- `resolveDynamicModel`：提供者接受本地靜態目錄中尚未存在的模型 ID
- `prepareDynamicModel`：提供者需要先重新整理元數據，然後再重試
動態解析
- `normalizeResolvedModel`：提供者需要傳輸或基礎 URL 重寫
- `capabilities`：提供者發布 transcript/工具/提供者家族的特性
- `prepareExtraParams`：提供者設定預設值或正規化各模型的請求參數
- `wrapStreamFn`：提供者套用請求標頭/內文/模型相容性包裝器
- `formatApiKey`：提供者將儲存的認證設定檔格式化為傳輸層
預期的運行時 `apiKey` 字串
- `refreshOAuth`：當共享的 `pi-ai`
重新整理器不足時，提供者擁有 OAuth 重新整理權限
- `buildAuthDoctorHint`：當 OAuth 重新整理失敗時，提供者附加修復指引
- `isCacheTtlEligible`：提供者決定哪些上游模型 ID 支援 prompt-cache TTL
- `buildMissingAuthMessage`：提供者將通用認證儲存錯誤
替換為特定於提供者的恢復提示
- `suppressBuiltInModel`: provider 會隱藏過時的上游行，並且針對直接解析失敗的情況返回供應商擁有的錯誤
- `augmentModelCatalog`: provider 會在探索和配置合併之後附加合成/最終的 catalog 行
- `isBinaryThinking`: provider 擁有二元開關思考 UX
- `supportsXHighThinking`: provider 將選定的模型選入 `xhigh`
- `resolveDefaultThinkingLevel`: provider 擁有模型系列的預設 `/think` 政策
- `isModernModelRef`: provider 擁有即時/冒煙首選模型匹配
- `prepareRuntimeAuth`: provider 將配置的憑證轉換為短期執行時期 token
- `resolveUsageAuth`: provider 解析 `/usage` 的使用量/配額憑證以及相關的狀態/報告介面
- `fetchUsageSnapshot`: provider 擁有使用量端點的擷取/解析，而核心仍然擁有摘要外殼和格式化

目前捆綁的範例：

- `anthropic`: Claude 4.6 向前相容回退、auth 修復提示、使用量端點擷取以及 cache-TTL/provider-family 元數據
- `openrouter`: 透傳模型 ID、請求包裝器、provider 能力提示以及 cache-TTL 政策
- `github-copilot`: 上線/裝置登入、向前相容模型回退、Claude-thinking 轉錄提示、執行時期 token 交換以及使用量端點擷取
- `openai`: GPT-5.4 向前相容回退、直接 OpenAI 傳輸正規化、Codex 感知的缺失 auth 提示、Spark 抑制、合成 OpenAI/Codex catalog 行、thinking/live-model 政策以及 provider-family 元數據
- `google` 和 `google-gemini-cli`: Gemini 3.1 向前相容回退和現代模型匹配；Gemini CLI OAuth 也擁有 auth-profile token 格式化、usage-token 解析以及針對使用量介面的配額端點擷取
- `moonshot`: 共享傳輸、plugin 擁有的 thinking payload 正規化
- `kilocode`: 共用傳輸、外掛擁有的請求標頭、推理承載
  正規化、Gemian 逐字稿提示以及快取 TTL 原則
- `zai`: GLM-5 前向相容回退、`tool_stream` 預設值、快取 TTL
  原則、二元思考/即時模型原則，以及使用量驗證 + 配額擷取
- `mistral`、`opencode` 和 `opencode-go`：外掛擁有的功能中繼資料
- `byteplus`、`cloudflare-ai-gateway`、`huggingface`、`kimi-coding`、
  `modelstudio`、`nvidia`、`qianfan`、`synthetic`、`together`、`venice`、
  `vercel-ai-gateway` 和 `volcengine`：僅限外掛擁有的目錄
- `qwen-portal`：外掛擁有的目錄、OAuth 登入和 OAuth 更新
- `minimax` 和 `xiaomi`：外掛擁有的目錄以及使用量驗證/快照邏輯

隨附的 `openai` 外掛現在擁有這兩個供應商 ID：`openai` 和
`openai-codex`。

這涵蓋了仍符合 OpenClaw 正常傳輸的供應商。需要完全自訂請求執行器的供應商則是一個獨立、更深入的擴充介面。

## API 金鑰輪替

- 支援所選供應商的通用供應商輪替。
- 透過以下方式設定多個金鑰：
  - `OPENCLAW_LIVE_<PROVIDER>_KEY` (單一即時覆寫，最高優先順序)
  - `<PROVIDER>_API_KEYS` (逗號或分號清單)
  - `<PROVIDER>_API_KEY` (主要金鑰)
  - `<PROVIDER>_API_KEY_*` (編號清單，例如 `<PROVIDER>_API_KEY_1`)
- 對於 Google 供應商，`GOOGLE_API_KEY` 也會包含作為備援。
- 金鑰選擇順序會保留優先順序並去除重複值。
- 請求僅在速率限制回應（例如 `429`、`rate_limit`、`quota`、`resource exhausted`）時使用下一個金鑰進行重試。
- 非速率限制失敗會立即回報錯誤；不會嘗試金鑰輪替。
- 當所有候選金鑰都失敗時，將傳回最後一次嘗試的最終錯誤。

## 內建供應商（pi-ai 目錄）

OpenClaw 隨附了 pi‑ai 目錄。這些供應商**不需要** `models.providers` 設定；只需設定驗證並選擇模型。

### OpenAI

- 供應商：`openai`
- 驗證：`OPENAI_API_KEY`
- 選用輪替：`OPENAI_API_KEYS`、`OPENAI_API_KEY_1`、`OPENAI_API_KEY_2`，以及 `OPENCLAW_LIVE_OPENAI_KEY`（單一覆寫）
- 範例模型：`openai/gpt-5.4`、`openai/gpt-5.4-pro`
- CLI：`openclaw onboard --auth-choice openai-api-key`
- 預設傳輸方式為 `auto`（優先使用 WebSocket，SSE 為後備）
- 透過 `agents.defaults.models["openai/<model>"].params.transport` 針對各個模型進行覆寫（`"sse"`、`"websocket"` 或 `"auto"`）
- OpenAI 回應 WebSocket 預熱預設透過 `params.openaiWsWarmup` 啟用（`true`/`false`）
- 可透過 `agents.defaults.models["openai/<model>"].params.serviceTier` 啟用 OpenAI 優先處理
- 可透過 `agents.defaults.models["<provider>/<model>"].params.fastMode` 針對各個模型啟用 OpenAI 快速模式
- `openai/gpt-5.3-codex-spark` 在 OpenClaw 中被刻意隱藏，因為正式的 OpenAI API 會拒絕它；Spark 僅被視為僅限 Codex 使用

```json5
{
  agents: { defaults: { model: { primary: "openai/gpt-5.4" } } },
}
```

### Anthropic

- 供應商：`anthropic`
- 驗證：`ANTHROPIC_API_KEY` 或 `claude setup-token`
- 選用輪替：`ANTHROPIC_API_KEYS`、`ANTHROPIC_API_KEY_1`、`ANTHROPIC_API_KEY_2`，以及 `OPENCLAW_LIVE_ANTHROPIC_KEY`（單一覆寫）
- 範例模型：`anthropic/claude-opus-4-6`
- CLI：`openclaw onboard --auth-choice token`（貼上 setup-token）或 `openclaw models auth paste-token --provider anthropic`
- 直接 API 金鑰模型支援共用的 `/fast` 切換開關和 `params.fastMode`；OpenClaw 將其對應至 Anthropic 的 `service_tier`（`auto` 對比 `standard_only`）
- 政策說明：對 setup-token 的支援屬於技術相容性；Anthropic 過去曾封鎖部分在 Claude Code 之外的訂閱使用情況。請確認目前的 Anthropic 條款，並根據您的風險承受能力做出決定。
- 建議：相較於訂閱 setup-token 驗證，Anthropic API 金鑰驗證是更安全且推薦的方式。

```json5
{
  agents: { defaults: { model: { primary: "anthropic/claude-opus-4-6" } } },
}
```

### OpenAI Code (Codex)

- 供應商：`openai-codex`
- 驗證：OAuth (ChatGPT)
- 範例模型：`openai-codex/gpt-5.4`
- CLI：`openclaw onboard --auth-choice openai-codex` 或 `openclaw models auth login --provider openai-codex`
- 預設傳輸方式為 `auto`（優先使用 WebSocket，SSE 為後備）
- 透過 `agents.defaults.models["openai-codex/<model>"].params.transport` 針對各個模型進行覆寫（`"sse"`、`"websocket"` 或 `"auto"`）
- 與直接 `openai/*` 共用相同的 `/fast` 切換開關和 `params.fastMode` 設定
- 當 Codex OAuth 目錄公開 `openai-codex/gpt-5.3-codex-spark` 時，該模型仍可使用；取決於授權權限
- 政策說明：OpenAI Codex OAuth 明確支援用於像 OpenClaw 這類的外部工具/工作流程。

```json5
{
  agents: { defaults: { model: { primary: "openai-codex/gpt-5.4" } } },
}
```

### OpenCode

- 驗證：`OPENCODE_API_KEY`（或 `OPENCODE_ZEN_API_KEY`）
- Zen 執行時期供應商：`opencode`
- Go 執行時期供應商：`opencode-go`
- 範例模型：`opencode/claude-opus-4-6`、`opencode-go/kimi-k2.5`
- CLI：`openclaw onboard --auth-choice opencode-zen` 或 `openclaw onboard --auth-choice opencode-go`

```json5
{
  agents: { defaults: { model: { primary: "opencode/claude-opus-4-6" } } },
}
```

### Google Gemini (API 金鑰)

- 供應商：`google`
- 驗證：`GEMINI_API_KEY`
- 選用輪替：`GEMINI_API_KEYS`、`GEMINI_API_KEY_1`、`GEMINI_API_KEY_2`、`GOOGLE_API_KEY` 後備，以及 `OPENCLAW_LIVE_GEMINI_KEY`（單一覆寫）
- 範例模型：`google/gemini-3.1-pro-preview`、`google/gemini-3-flash-preview`
- 相容性：使用 `google/gemini-3.1-flash-preview` 的舊版 OpenClaw 配置會被正規化為 `google/gemini-3-flash-preview`
- CLI：`openclaw onboard --auth-choice gemini-api-key`

### Google Vertex 和 Gemini CLI

- 提供者：`google-vertex`、`google-gemini-cli`
- 驗證：Vertex 使用 gcloud ADC；Gemini CLI 使用其 OAuth 流程
- 注意：OpenClaw 中的 Gemini CLI OAuth 是非官方整合。部分使用者回報在使用第三方客戶端後，其 Google 帳號受到限制。請審閱 Google 條款，如果您選擇繼續操作，請使用非關鍵帳號。
- Gemini CLI OAuth 隨附於捆綁的 `google` 外掛程式中。
  - 啟用：`openclaw plugins enable google`
  - 登入：`openclaw models auth login --provider google-gemini-cli --set-default`
  - 注意：您**不需要**將客戶端 ID 或金鑰貼入 `openclaw.json`。CLI 登入流程會將
    權杖儲存在閘道主機上的驗證設定檔中。

### Z.AI (GLM)

- 提供者：`zai`
- 驗證：`ZAI_API_KEY`
- 範例模型：`zai/glm-5`
- CLI：`openclaw onboard --auth-choice zai-api-key`
  - 別名：`z.ai/*` 和 `z-ai/*` 會正規化為 `zai/*`

### Vercel AI Gateway

- 提供者：`vercel-ai-gateway`
- 驗證：`AI_GATEWAY_API_KEY`
- 範例模型：`vercel-ai-gateway/anthropic/claude-opus-4.6`
- CLI：`openclaw onboard --auth-choice ai-gateway-api-key`

### Kilo Gateway

- 提供者：`kilocode`
- 驗證：`KILOCODE_API_KEY`
- 範例模型：`kilocode/anthropic/claude-opus-4.6`
- CLI：`openclaw onboard --kilocode-api-key <key>`
- 基礎 URL：`https://api.kilo.ai/api/gateway/`
- 擴充的內建目錄包括 GLM-5 Free、MiniMax M2.5 Free、GPT-5.2、Gemini 3 Pro Preview、Gemini 3 Flash Preview、Grok Code Fast 1 和 Kimi K2.5。

請參閱 [/providers/kilocode](/zh-Hant/providers/kilocode) 以了解設定詳細資訊。

### 其他捆綁的提供者外掛程式

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
- Vercel AI Gateway：`vercel-ai-gateway` (`AI_GATEWAY_API_KEY`)
- Hugging Face Inference：`huggingface` (`HUGGINGFACE_HUB_TOKEN` 或 `HF_TOKEN`)
- Cloudflare AI Gateway：`cloudflare-ai-gateway` (`CLOUDFLARE_AI_GATEWAY_API_KEY`)
- Volcengine：`volcengine` (`VOLCANO_ENGINE_API_KEY`)
- BytePlus：`byteplus` (`BYTEPLUS_API_KEY`)
- xAI：`xai` (`XAI_API_KEY`)
- Mistral：`mistral` (`MISTRAL_API_KEY`)
- 範例模型：`mistral/mistral-large-latest`
- CLI：`openclaw onboard --auth-choice mistral-api-key`
- Groq：`groq` (`GROQ_API_KEY`)
- Cerebras：`cerebras` (`CEREBRAS_API_KEY`)
  - Cerebras 上的 GLM 模型使用 id `zai-glm-4.7` 和 `zai-glm-4.6`。
  - OpenAI 相容基底 URL：`https://api.cerebras.ai/v1`。
- GitHub Copilot：`github-copilot` (`COPILOT_GITHUB_TOKEN` / `GH_TOKEN` / `GITHUB_TOKEN`)
- Hugging Face Inference 範例模型：`huggingface/deepseek-ai/DeepSeek-R1`；CLI：`openclaw onboard --auth-choice huggingface-api-key`。請參閱 [Hugging Face (Inference)](/zh-Hant/providers/huggingface)。

## 透過 `models.providers` 的提供者（自訂/基礎 URL）

使用 `models.providers`（或 `models.json`）新增**自訂**提供者或
OpenAI/Anthropic 相容的 Proxy。

以下許多內建的提供者外掛程式已發佈預設目錄。
僅在您想要覆寫預設基礎 URL、標頭或模型清單時，才使用明確的 `models.providers.<id>` 項目。

### Moonshot AI (Kimi)

Moonshot 使用 OpenAI 相容的端點，因此請將其設定為自訂提供者：

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

### Kimi 編碼

Kimi 編碼使用 Moonshot AI 的 Anthropic 相容端點：

- 提供者：`kimi-coding`
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

### Qwen OAuth (免費層)

Qwen 提透過裝置代碼流程提供 Qwen Coder + Vision 的 OAuth 存取權。
內建的提供者外掛程式預設為啟用狀態，因此只需登入即可：

```bash
openclaw models auth login --provider qwen-portal --set-default
```

模型參照：

- `qwen-portal/coder-model`
- `qwen-portal/vision-model`

請參閱 [/providers/qwen](/zh-Hant/providers/qwen) 以了解設定詳細資訊和註記。

### 火山引擎 (Doubao)

火山引擎 (火山引擎) 提供存取 Doubao 和中國境內其他模型的權限。

- 提供者：`volcengine` (編碼：`volcengine-plan`)
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

- `volcengine/doubao-seed-1-8-251228` (Doubao Seed 1.8)
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

### BytePlus (國際)

BytePlus ARK 為國際用戶提供與 Volcano Engine 相同的模型存取權。

- 提供者：`byteplus` (編碼：`byteplus-plan`)
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

- `byteplus/seed-1-8-251228` (Seed 1.8)
- `byteplus/kimi-k2-5-260127` (Kimi K2.5)
- `byteplus/glm-4-7-251222` (GLM 4.7)

編碼模型 (`byteplus-plan`)：

- `byteplus-plan/ark-code-latest`
- `byteplus-plan/doubao-seed-code`
- `byteplus-plan/kimi-k2.5`
- `byteplus-plan/kimi-k2-thinking`
- `byteplus-plan/glm-4.7`

### Synthetic

Synthetic 在 `synthetic` 提供者後面提供相容 Anthropic 的模型：

- 提供者：`synthetic`
- 驗證：`SYNTHETIC_API_KEY`
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

MiniMax 透過 `models.providers` 進行設定，因為它使用自訂端點：

- MiniMax (Anthropic‑相容)：`--auth-choice minimax-api`
- 驗證：`MINIMAX_API_KEY`

請參閱 [/providers/minimax](/zh-Hant/providers/minimax) 以了解設定細節、模型選項和設定片段。

### Ollama

Ollama 作為內建提供者外掛程式隨附，並使用 Ollama 的原生 API：

- 提供者：`ollama`
- 驗證：無需驗證 (本機伺服器)
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

當您使用 `OLLAMA_API_KEY` 加入時，Ollama 會在本機 `http://127.0.0.1:11434` 被偵測到，而內建的提供者外掛程式會直接將 Ollama 新增至 `openclaw onboard` 和模型選擇器。請參閱 [/providers/ollama](/zh-Hant/providers/ollama) 以了解入門、雲端/本機模式和自訂設定。

### vLLM

vLLM 作為內建提供者外掛程式隨附，適用於本機/自架的 OpenAI 相容伺服器：

- 提供者：`vllm`
- 驗證：選用 (取決於您的伺服器)
- 預設基礎 URL：`http://127.0.0.1:8000/v1`

若要在本地啟用自動探索（如果您的伺服器不強制執行身份驗證，則任何值均可）：

```bash
export VLLM_API_KEY="vllm-local"
```

然後設定一個模型（替換為 `/v1/models` 返回的其中一個 ID）：

```json5
{
  agents: {
    defaults: { model: { primary: "vllm/your-model-id" } },
  },
}
```

詳情請參閱 [/providers/vllm](/zh-Hant/providers/vllm)。

### SGLang

SGLang 作為一個內建的提供商插件提供，用於快速託管 OpenAI 相容伺服器：

- 提供商：`sglang`
- 身份驗證：可選（取決於您的伺服器）
- 預設基礎 URL：`http://127.0.0.1:30000/v1`

若要在本地啟用自動探索（如果您的伺服器不強制執行身份驗證，則任何值均可）：

```bash
export SGLANG_API_KEY="sglang-local"
```

然後設定一個模型（替換為 `/v1/models` 返回的其中一個 ID）：

```json5
{
  agents: {
    defaults: { model: { primary: "sglang/your-model-id" } },
  },
}
```

詳情請參閱 [/providers/sglang](/zh-Hant/providers/sglang)。

### 本機代理（LM Studio、vLLM、LiteLLM 等）

範例（OpenAI 相容）：

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

- 對於自訂提供商，`reasoning`、`input`、`cost`、`contextWindow` 和 `maxTokens` 為可選。
  省略時，OpenClaw 預設為：
  - `reasoning: false`
  - `input: ["text"]`
  - `cost: { input: 0, output: 0, cacheRead: 0, cacheWrite: 0 }`
  - `contextWindow: 200000`
  - `maxTokens: 8192`
- 建議：設定符合您的代理/模型限制的明確值。
- 對於非原生端點上的 `api: "openai-completions"`（任何主機不是 `api.openai.com` 的非空 `baseUrl`），OpenClaw 會強制執行 `compat.supportsDeveloperRole: false`，以避免提供商因不支援的 `developer` 角色而傳回 400 錯誤。
- 如果 `baseUrl` 為空或被省略，OpenClaw 會保留預設的 OpenAI 行為（解析為 `api.openai.com`）。
- 為安全起見，在非原生的 `openai-completions` 端點上，即使明確設定了 `compat.supportsDeveloperRole: true` 仍會被覆寫。

## CLI 範例

```bash
openclaw onboard --auth-choice opencode-zen
openclaw models set opencode/claude-opus-4-6
openclaw models list
```

另請參閱：[/gateway/configuration](/zh-Hant/gateway/configuration) 以取得完整的組態範例。

import en from "/components/footer/en.mdx";

<en />
