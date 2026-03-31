---
summary: "Model provider overview with example configs + CLI flows"
read_when:
  - You need a provider-by-provider model setup reference
  - You want example configs or CLI onboarding commands for model providers
title: "模型提供者"
---

# 模型提供者

本頁涵蓋 **LLM/模型提供者**（而非 WhatsApp/Telegram 等聊天頻道）。
關於模型選擇規則，請參閱 [/concepts/models](/en/concepts/models)。

## 快速規則

- 模型引用使用 `provider/model`（例如：`opencode/claude-opus-4-6`）。
- 如果您設定 `agents.defaults.models`，它將成為允許清單。
- CLI 輔助工具：`openclaw onboard`、`openclaw models list`、`openclaw models set <provider/model>`。
- 提供者外掛程式可以透過 `registerProvider({ catalog })` 注入模型目錄；
  OpenClaw 會在寫入 `models.json` 之前將該輸出合併到 `models.providers` 中。
- Provider manifests 可以宣告 `providerAuthEnvVars`，這樣基於通用環境變數的
  auth probes 就不需要載入 plugin runtime。剩餘的 core env-var
  map 現在僅供 non-plugin/core providers 以及少數 generic-precedence
  案例使用，例如 Anthropic API-key-first onboarding。
- 供應商外掛程式也可以透過
  `resolveDynamicModel`、`prepareDynamicModel`、`normalizeResolvedModel`、
  `capabilities`、`prepareExtraParams`、`wrapStreamFn`、`formatApiKey`、
  `refreshOAuth`、`buildAuthDoctorHint`、
  `isCacheTtlEligible`、`buildMissingAuthMessage`、
  `suppressBuiltInModel`、`augmentModelCatalog`、`isBinaryThinking`、
  `supportsXHighThinking`、`resolveDefaultThinkingLevel`、
  `isModernModelRef`、`prepareRuntimeAuth`、`resolveUsageAuth` 和
  `fetchUsageSnapshot` 來擁有供應商執行時期行為。
- 注意：provider runtime `capabilities` 是共享的 runner 元數據（provider 系列、transcript/tooling 特性、transport/cache 提示）。這與 [公開 capability 模型](/en/plugins/architecture#public-capability-model) 不同，後者描述的是 plugin 註冊的內容（文字推論、語音等）。

## 外掛擁有的供應商行為

供應商外掛現在可以擁有大部分供應商特定的邏輯，而 OpenClaw 則保留通用的推斷循環。

典型分工：

- `auth[].run` / `auth[].runNonInteractive`：provider 擁有 `openclaw onboard`、`openclaw models auth` 和 headless 設定的入門/登入流程
- `wizard.setup` / `wizard.modelPicker`：provider 擁有 auth-choice 標籤、舊版別名、入門 allowlist 提示，以及在入門/模型選擇器中的設定項目
- `catalog`：provider 出現在 `models.providers` 中
- `resolveDynamicModel`：provider 接受尚未出現在本地靜態目錄中的模型 ID
- `prepareDynamicModel`：提供商在重試之前需要重新整理元資料
  dynamic resolution
- `normalizeResolvedModel`：提供商需要傳輸或基礎 URL 重寫
- `capabilities`：提供商發佈文字記錄/工具/提供商系列特性
- `prepareExtraParams`：提供商設定預設值或正規化各模型的請求參數
- `wrapStreamFn`：提供商套用請求標頭/內文/模型相容性包裝器
- `formatApiKey`：提供商將儲存的設定檔格式化為執行階段
  傳輸所需的 `apiKey` 字串
- `refreshOAuth`：當共用的 `pi-ai`
  重新整理器不足時，提供商擁有 OAuth 重新整理權
- `buildAuthDoctorHint`：當 OAuth 重新整理失敗時，
  提供商會附加修復指引
- `isCacheTtlEligible`：提供者決定哪些上游模型 ID 支援 prompt-cache TTL
- `buildMissingAuthMessage`：提供者將通用的 auth-store 錯誤
  替換為提供者特定的恢復提示
- `suppressBuiltInModel`：提供者隱藏過時的上游行，並且可以針對直接解析失敗返回
  供應商擁有的錯誤
- `augmentModelCatalog`：提供者在
  發現和配置合併之後附加合成/最終目錄行
- `isBinaryThinking`：提供者擁有二進位開關思考 UX
- `supportsXHighThinking`：提供者將選定的模型選入 `xhigh`
- `resolveDefaultThinkingLevel`：提供者擁有模型系列的預設 `/think` 策略
- `isModernModelRef`：提供者擁有即時/冒煙首選模型匹配
- `prepareRuntimeAuth`：提供者將已設定的憑證轉換為短期執行時段權杖
- `resolveUsageAuth`：提供者解析 `/usage` 的使用/配額憑證以及相關狀態/報告介面
- `fetchUsageSnapshot`：提供者負責使用量端點的擷取/解析，而核心仍負責摘要外殼和格式化

目前附帶的範例：

- `anthropic`：Claude 4.6 向前相容回退、驗證修復提示、使用量端點擷取以及快取 TTL/提供者家族元資料
- `openrouter`：透傳模型 ID、請求包裝器、提供者功能提示以及快取 TTL 原則
- `github-copilot`：上架/裝置登入、向前相容模型回退、Claude 思考過程文字記錄提示、執行時段權杖交換以及使用量端點擷取
- `openai`：GPT-5.4 向前相容回退、直接 OpenAI 傳輸正規化、感知 Codex 的缺少認證提示、Spark 抑制、合成 OpenAI/Codex 目錄列、思考/即時模型策略，以及提供者系列元資料
- `google` 和 `google-gemini-cli`：Gemini 3.1 向前相容回退與現代模型匹配；Gemini CLI OAuth 也負責認證設定檔 token 格式化、使用量 token 解析，以及為使用量介面取得配額端點
- `moonshot`：共用傳輸、外掛擁有的思考載荷正規化
- `kilocode`：共用傳輸、外掛擁有的請求標頭、推理載荷正規化、Gemini 轉錄提示，以及快取 TTL 策略
- `zai`: GLM-5 向後相容回退、`tool_stream` 預設值、快取 TTL
  原則、二元思維/即時模型原則，以及使用授權與配額獲取
- `mistral`、`opencode` 和 `opencode-go`: 外掛擁有的能力元資料
- `byteplus`、`cloudflare-ai-gateway`、`huggingface`、`kimi-coding`、
  `modelstudio`、`nvidia`、`qianfan`、`synthetic`、`together`、`venice`、
  `vercel-ai-gateway` 和 `volcengine`: 僅限外掛擁有的目錄
- `minimax` 和 `xiaomi`：外掛擁有的目錄加上使用授權/快照邏輯

隨附的 `openai` 外掛現在擁有這兩個提供者 ID：`openai` 和 `openai-codex`。

這涵蓋了仍適用 OpenClaw 標準傳輸的提供者。如果需要完全自訂的請求執行器，則屬於另一個更深層的擴充介面。

## API 金鑰輪替

- 支援所選提供者的通用提供者輪替。
- 透過以下方式設定多個金鑰：
  - `OPENCLAW_LIVE_<PROVIDER>_KEY` (單一即時覆寫，優先級最高)
  - `<PROVIDER>_API_KEYS` (逗號或分號分隔清單)
  - `<PROVIDER>_API_KEY` (主要金鑰)
  - `<PROVIDER>_API_KEY_*` (編號清單，例如 `<PROVIDER>_API_KEY_1`)
- 對於 Google 提供商，`GOOGLE_API_KEY` 也會包含在內作為後備。
- 金鑰選擇順序會保留優先順序並對數值進行去重。
- 請求僅在收到速率限制回應（例如 `429`、`rate_limit`、`quota`、`resource exhausted`）時才會使用下一個金鑰重試。
- 非速率限制的失敗會立即失敗；不會嘗試金鑰輪替。
- 當所有候選金鑰都失敗時，會傳回最後一次嘗試的最終錯誤。

## 內建提供商（pi-ai catalog）

OpenClaw 隨附 pi‑ai catalog。這些提供商**不**需要
`models.providers` 設定；只需設定身份驗證並選擇模型即可。

### OpenAI

- 提供商：`openai`
- 驗證：`OPENAI_API_KEY`
- 可選輪替：`OPENAI_API_KEYS`、`OPENAI_API_KEY_1`、`OPENAI_API_KEY_2`，加上 `OPENCLAW_LIVE_OPENAI_KEY`（單次覆寫）
- 範例模型：`openai/gpt-5.4`、`openai/gpt-5.4-pro`
- CLI：`openclaw onboard --auth-choice openai-api-key`
- 預設傳輸方式為 `auto`（優先使用 WebSocket，SSE 為備用）
- 透過 `agents.defaults.models["openai/<model>"].params.transport` 逐個模型覆寫（`"sse"`、`"websocket"` 或 `"auto"`）
- OpenAI Responses WebSocket 預熱預設透過 `params.openaiWsWarmup` 啟用（`true`/`false`）
- OpenAI 優先處理可透過 `agents.defaults.models["openai/<model>"].params.serviceTier` 啟用
- OpenAI 快速模式可透過 `agents.defaults.models["<provider>/<model>"].params.fastMode` 針對各個模型啟用
- `openai/gpt-5.3-codex-spark` 在 OpenClaw 中被刻意隱藏，因為實際的 OpenAI API 會拒絕它；Spark 被視為僅適用於 Codex

```json5
{
  agents: { defaults: { model: { primary: "openai/gpt-5.4" } } },
}
```

### Anthropic

- 提供商：`anthropic`
- 驗證：`ANTHROPIC_API_KEY` 或 `claude setup-token`
- 可選輪替：`ANTHROPIC_API_KEYS`、`ANTHROPIC_API_KEY_1`、`ANTHROPIC_API_KEY_2`，以及 `OPENCLAW_LIVE_ANTHROPIC_KEY`（單一覆蓋）
- 範例模型：`anthropic/claude-opus-4-6`
- CLI：`openclaw onboard --auth-choice token`（貼上 setup-token）或 `openclaw models auth paste-token --provider anthropic`
- 直接 API 金鑰模型支援共用的 `/fast` 切換開關和 `params.fastMode`；OpenClaw 將其對應至 Anthropic 的 `service_tier`（`auto` 對比 `standard_only`）
- 政策說明：setup-token 支援屬於技術相容性；Anthropic 過去曾封鎖 Claude Code 以外的訂閱使用。請驗證目前的 Anthropic 條款，並根據您的風險承受能力做出決定。
- 建議：Anthropic API 金鑰驗證比訂閱 setup-token 驗證更安全，為建議的途徑。

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
- 預設傳輸為 `auto` (WebSocket 優先，SSE 備援)
- 透過 `agents.defaults.models["openai-codex/<model>"].params.transport` 針對各模型進行覆寫 (`"sse"`、`"websocket"` 或 `"auto"`)
- 與直接 `openai/*` 共用相同的 `/fast` 開關和 `params.fastMode` 設定
- 當 Codex OAuth 目錄揭露 `openai-codex/gpt-5.3-codex-spark` 時，其仍然可用；視授權而定
- 政策說明：明確支援將 OpenAI Codex OAuth 用於外部工具/工作流程，例如 OpenClaw。

```json5
{
  agents: { defaults: { model: { primary: "openai-codex/gpt-5.4" } } },
}
```

### OpenCode

- 驗證：`OPENCODE_API_KEY`（或 `OPENCODE_ZEN_API_KEY`）
- Zen 執行時提供者：`opencode`
- Go 執行時提供者：`opencode-go`
- 範例模型：`opencode/claude-opus-4-6`、`opencode-go/kimi-k2.5`
- CLI：`openclaw onboard --auth-choice opencode-zen` 或 `openclaw onboard --auth-choice opencode-go`

```json5
{
  agents: { defaults: { model: { primary: "opencode/claude-opus-4-6" } } },
}
```

### Google Gemini (API 金鑰)

- 提供者：`google`
- 驗證：`GEMINI_API_KEY`
- 選用性輪替：`GEMINI_API_KEYS`、`GEMINI_API_KEY_1`、`GEMINI_API_KEY_2`、`GOOGLE_API_KEY` 備援，以及 `OPENCLAW_LIVE_GEMINI_KEY`（單次覆寫）
- 範例模型：`google/gemini-3.1-pro-preview`、`google/gemini-3-flash-preview`
- 相容性：使用 `google/gemini-3.1-flash-preview` 的舊版 OpenClaw 配置會被正規化為 `google/gemini-3-flash-preview`
- CLI：`openclaw onboard --auth-choice gemini-api-key`

### Google Vertex 和 Gemini CLI

- 提供商：`google-vertex`、`google-gemini-cli`
- 驗證：Vertex 使用 gcloud ADC；Gemini CLI 使用其 OAuth 流程
- 注意：OpenClaw 中的 Gemini CLI OAuth 是非官方整合。部分使用者回報在使用第三方客戶端後遭 Google 限制帳戶。請審閱 Google 條款，若您選擇繼續操作，請使用非關鍵帳戶。
- Gemini CLI OAuth 隨附於捆綁的 `google` 外掛程式中。
  - 啟用：`openclaw plugins enable google`
  - 登入：`openclaw models auth login --provider google-gemini-cli --set-default`
  - 注意：您**不**要將用戶端 ID 或金鑰貼上到 `openclaw.json` 中。CLI 登入流程會將
    權杖儲存在閘道主機上的 auth profiles 中。

### Z.AI (GLM)

- 供應商：`zai`
- 驗證：`ZAI_API_KEY`
- 範例模型：`zai/glm-5`
- CLI：`openclaw onboard --auth-choice zai-api-key`
  - 別名：`z.ai/*` 和 `z-ai/*` 會正規化為 `zai/*`

### Vercel AI Gateway

- 供應商：`vercel-ai-gateway`
- 驗證：`AI_GATEWAY_API_KEY`
- 範例模型：`vercel-ai-gateway/anthropic/claude-opus-4.6`
- CLI：`openclaw onboard --auth-choice ai-gateway-api-key`

### Kilo Gateway

- 供應商：`kilocode`
- 驗證：`KILOCODE_API_KEY`
- 範例模型：`kilocode/anthropic/claude-opus-4.6`
- CLI：`openclaw onboard --kilocode-api-key <key>`
- 基礎 URL：`https://api.kilo.ai/api/gateway/`
- 擴展的內建目錄包括 GLM-5 Free、MiniMax M2.5 Free、GPT-5.2、Gemini 3 Pro Preview、Gemini 3 Flash Preview、Grok Code Fast 1 和 Kimi K2.5。

有關設定詳情，請參閱 [/providers/kilocode](/en/providers/kilocode)。

### 其他捆綁的供應商外掛

- OpenRouter：`openrouter` (`OPENROUTER_API_KEY`)
- 範例模型：`openrouter/anthropic/claude-sonnet-4-6`
- Kilo Gateway：`kilocode` (`KILOCODE_API_KEY`)
- 範例模型：`kilocode/anthropic/claude-opus-4.6`
- MiniMax：`minimax` (`MINIMAX_API_KEY`)
- Moonshot: `moonshot` (`MOONSHOT_API_KEY`)
- Kimi Coding: `kimi-coding` (`KIMI_API_KEY` 或 `KIMICODE_API_KEY`)
- Qianfan: `qianfan` (`QIANFAN_API_KEY`)
- Model Studio: `modelstudio` (`MODELSTUDIO_API_KEY`)
- NVIDIA: `nvidia` (`NVIDIA_API_KEY`)
- Together: `together` (`TOGETHER_API_KEY`)
- Venice: `venice` (`VENICE_API_KEY`)
- Xiaomi: `xiaomi` (`XIAOMI_API_KEY`)
- Vercel AI Gateway: `vercel-ai-gateway` (`AI_GATEWAY_API_KEY`)
- Hugging Face 推理：`huggingface` (`HUGGINGFACE_HUB_TOKEN` 或 `HF_TOKEN`)
- Cloudflare AI 閘道：`cloudflare-ai-gateway` (`CLOUDFLARE_AI_GATEWAY_API_KEY`)
- 火山引擎：`volcengine` (`VOLCANO_ENGINE_API_KEY`)
- BytePlus：`byteplus` (`BYTEPLUS_API_KEY`)
- xAI：`xai` (`XAI_API_KEY`)
- Mistral：`mistral` (`MISTRAL_API_KEY`)
- 範例模型：`mistral/mistral-large-latest`
- CLI：`openclaw onboard --auth-choice mistral-api-key`
- Groq：`groq` (`GROQ_API_KEY`)
- Cerebras：`cerebras` (`CEREBRAS_API_KEY`)
  - Cerebras 上的 GLM 模型使用 id `zai-glm-4.7` 和 `zai-glm-4.6`。
  - OpenAI 相容基礎 URL：`https://api.cerebras.ai/v1`。
- GitHub Copilot：`github-copilot` (`COPILOT_GITHUB_TOKEN` / `GH_TOKEN` / `GITHUB_TOKEN`)
- Hugging Face Inference 範例模型：`huggingface/deepseek-ai/DeepSeek-R1`；CLI：`openclaw onboard --auth-choice huggingface-api-key`。請參閱 [Hugging Face (Inference)](/en/providers/huggingface)。

## 透過 `models.providers` 提供的供應商 (custom/base URL)

使用 `models.providers` (或 `models.json`) 來新增**自訂**供應商或
OpenAI/Anthropic 相容的代理伺服器。

以下許多內建的提供者外掛已經發佈了預設目錄。
僅當您想要覆蓋預設的基礎 URL、標頭或模型列表時，才使用明確的 `models.providers.<id>` 項目。

### Moonshot AI (Kimi)

Moonshot 使用與 OpenAI 相容的端點，因此將其配置為自訂提供者：

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

Kimi Coding 使用 Moonshot AI 的 Anthropic 相容端點：

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

### 火山引擎 (Doubao)

Volcano Engine (火山引擎) 提供對中國境內豆包及其他模型的存取。

- 提供者：`volcengine` (程式設計：`volcengine-plan`)
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

程式設計模型 (`volcengine-plan`)：

- `volcengine-plan/ark-code-latest`
- `volcengine-plan/doubao-seed-code`
- `volcengine-plan/kimi-k2.5`
- `volcengine-plan/kimi-k2-thinking`
- `volcengine-plan/glm-4.7`

### BytePlus (國際版)

BytePlus ARK 為國際使用者提供與火山引擎相同的模型存取。

- 提供商：`byteplus` (編碼：`byteplus-plan`)
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

Synthetic 在 `synthetic` 提供商後方提供相容 Anthropic 的模型：

- 提供商：`synthetic`
- 驗證： `SYNTHETIC_API_KEY`
- 範例模型： `synthetic/hf:MiniMaxAI/MiniMax-M2.5`
- CLI： `openclaw onboard --auth-choice synthetic-api-key`

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

MiniMax 透過 `models.providers` 進行配置，因為它使用自訂端點：

- MiniMax (Anthropic 相容)： `--auth-choice minimax-api`
- 驗證： `MINIMAX_API_KEY`

請參閱 [/providers/minimax](/en/providers/minimax) 以了解設定詳細資訊、模型選項和設定片段。

### Ollama

Ollama 作為隨附的提供者外掛程式發布，並使用 Ollama 的原生 API：

- 提供者： `ollama`
- 驗證：無需 (本機伺服器)
- 範例模型： `ollama/llama3.3`
- 安裝： [https://ollama.com/download](https://ollama.com/download)

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

當您使用 `OLLAMA_API_KEY` 啟用時，系統會在 `http://127.0.0.1:11434` 本機偵測到 Ollama，且隨附的提供者外掛程式會將 Ollama 直接新增至 `openclaw onboard` 和模型選擇器。請參閱 [/providers/ollama](/en/providers/ollama) 以了解上架資訊、雲端/本機模式及自訂設定。

### vLLM

vLLM 作為隨附的提供者外掛程式提供，適用於本機/自託管的 OpenAI 相容伺服器：

- 提供者：`vllm`
- 驗證：選用 (視您的伺服器而定)
- 預設基底 URL：`http://127.0.0.1:8000/v1`

若要在本機啟用自動探索 (如果您的伺服器未強制執行驗證，則可以使用任何值)：

```bash
export VLLM_API_KEY="vllm-local"
```

然後設定一個模型 (替換為 `/v1/models` 傳回的其中一個 ID)：

```json5
{
  agents: {
    defaults: { model: { primary: "vllm/your-model-id" } },
  },
}
```

詳情請參閱 [/providers/vllm](/en/providers/vllm)。

### SGLang

SGLang 作為一個內附的提供者插件，用於快速自託管的
OpenAI 相容伺服器：

- 提供者：`sglang`
- 驗證：可選（取決於您的伺服器）
- 預設基礎 URL：`http://127.0.0.1:30000/v1`

若要在本地啟用自動探索（如果您的伺服器未強制執行驗證，則任何值均可）：

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

詳情請參閱 [/providers/sglang](/en/providers/sglang)。

### 本地代理（LM Studio、vLLM、LiteLLM 等）

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

- 對於自訂提供者，`reasoning`、`input`、`cost`、`contextWindow` 和 `maxTokens` 是可選的。
  省略時，OpenClaw 預設為：
  - `reasoning: false`
  - `input: ["text"]`
  - `cost: { input: 0, output: 0, cacheRead: 0, cacheWrite: 0 }`
  - `contextWindow: 200000`
  - `maxTokens: 8192`
- 建議：設定與您的代理/模型限制相符的明確數值。
- 對於非原生端點上的 `api: "openai-completions"`（任何主機不是 `api.openai.com` 的非空 `baseUrl`），OpenClaw 會強制使用 `compat.supportsDeveloperRole: false`，以避免因不支援的 `developer` 角色而導致提供商回傳 400 錯誤。
- 如果 `baseUrl` 為空或被省略，OpenClaw 將保留預設的 OpenAI 行為（該行為會解析為 `api.openai.com`）。
- 為了安全起見，在非原生的 `openai-completions` 端點上，明確的 `compat.supportsDeveloperRole: true` 仍會被覆蓋。

## CLI 範例

```bash
openclaw onboard --auth-choice opencode-zen
openclaw models set opencode/claude-opus-4-6
openclaw models list
```

另請參閱：[/gateway/configuration](/en/gateway/configuration) 以取得完整的設定範例。
