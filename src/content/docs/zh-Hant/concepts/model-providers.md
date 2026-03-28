---
summary: "模型供應商概覽，包含範例設定 + CLI 流程"
read_when:
  - You need a provider-by-provider model setup reference
  - You want example configs or CLI onboarding commands for model providers
title: "模型供應商"
---

# 模型供應商

本頁涵蓋 **LLM/模型供應商**（而非 WhatsApp/Telegram 等聊天頻道）。
關於模型選擇規則，請參閱 [/concepts/models](/zh-Hant/concepts/models)。

## 快速規則

- 模型參照使用 `provider/model`（例如：`opencode/claude-opus-4-6`）。
- 如果您設定了 `agents.defaults.models`，它將成為允許清單。
- CLI 輔助工具：`openclaw onboard`、`openclaw models list`、`openclaw models set <provider/model>`。
- 供應商外掛可以透過 `registerProvider({ catalog })` 注入模型型錄；
  OpenClaw 會在寫入 `models.json` 之前，將該輸出合併到 `models.providers` 中。
- 供應商清單可以宣告 `providerAuthEnvVars`，因此基於通用環境變數的身分驗證探測不需要載入外掛執行時。剩餘的核心環境變數映射現在僅用於非外掛/核心供應商，以及少數通用優先順序的案例，例如 Anthropic 以 API 金鑰為優先的入門導引。
- 提供者外掛程式也可以透過
  `resolveDynamicModel`、`prepareDynamicModel`、`normalizeResolvedModel`、
  `capabilities`、`prepareExtraParams`、`wrapStreamFn`、`formatApiKey`、
  `refreshOAuth`、`buildAuthDoctorHint`、
  `isCacheTtlEligible`、`buildMissingAuthMessage`、
  `suppressBuiltInModel`、`augmentModelCatalog`、`isBinaryThinking`、
  `supportsXHighThinking`、`resolveDefaultThinkingLevel`、
  `isModernModelRef`、`prepareRuntimeAuth`、`resolveUsageAuth` 和
  `fetchUsageSnapshot` 來擁有提供者執行時期的行為。
- 注意：提供者運行時 `capabilities` 是共享的 runner 元數據（提供者系列、逐字稿/工具怪癖、傳輸/緩存提示）。這與 [public capability model](/zh-Hant/plugins/architecture#public-capability-model) 不同，後者描述插件註冊的內容（文字推理、語音等）。

## 插件擁有的提供者行為

提供者插件現在可以擁有大部分特定於提供者的邏輯，而 OpenClaw 則保留通用推理循環。

典型分工：

- `auth[].run` / `auth[].runNonInteractive`：提供者擁有 `openclaw onboard`、`openclaw models auth` 和無頭設置的入門/登入流程
- `wizard.setup` / `wizard.modelPicker`：提供者擁有驗證選擇標籤、舊版別名、入門允許清單提示，以及在入門/模型選擇器中的設置項目
- `catalog`：供應商顯示於 `models.providers`
- `resolveDynamicModel`：供應商接受本地靜態目錄中尚未存在的模型 ID
- `prepareDynamicModel`：供應商在重試動態解析之前需要重新整理元資料
- `normalizeResolvedModel`：供應商需要傳輸層或基礎 URL 重寫
- `capabilities`：供應商發佈對話紀錄/工具/供應商系列的特殊行為
- `prepareExtraParams`：供應商設定預設值或標準化各模型的請求參數
- `wrapStreamFn`：供應商套用請求標頭/內文/模型相容性包裝器
- `formatApiKey`：供應商將儲存的設定檔格式化為傳輸層所需的執行時期 `apiKey` 字串
- `refreshOAuth`: 當共享的 `pi-ai` 刷新器不足時，提供者擁有 OAuth 刷新的控制權
- `buildAuthDoctorHint`: 當 OAuth 刷新失敗時，提供者會附加修復指南
- `isCacheTtlEligible`: 提供者決定哪些上游模型 ID 支援 prompt-cache TTL
- `buildMissingAuthMessage`: 提供者將通用的 auth-store 錯誤替換為提供者特定的恢復提示
- `suppressBuiltInModel`: 提供者隱藏過時的上游行，並可以針對直接解析失敗返回供應商擁有的錯誤
- `augmentModelCatalog`: 提供者在發現和配置合併後附加合成/最終目錄行
- `isBinaryThinking`: 提供者擁有二進位開/關思考 UX
- `supportsXHighThinking`: 提供者將選定的模型加入 `xhigh`
- `resolveDefaultThinkingLevel`：提供者擁有模型家族的預設 `/think` 政策
- `isModernModelRef`：提供者擁有 live/smoke 首選模型匹配
- `prepareRuntimeAuth`：提供者將配置的憑證轉換為短期執行時 token
- `resolveUsageAuth`：提供者解析 `/usage` 的使用量/配額憑證以及相關狀態/報告介面
- `fetchUsageSnapshot`：提供者擁有使用量端點的擷取/解析，而核心仍然擁有摘要外殼和格式化

當前打包的範例：

- `anthropic`：Claude 4.6 向前相容後備、驗證修復提示、使用量端點擷取以及 cache-TTL/提供者家族元資料
- `openrouter`：傳遞模型 ID、請求包裝器、提供者功能提示以及快取 TTL 原則
- `github-copilot`：入門/裝置登入、向前相容模型回退、Claude 思考過程記錄提示、執行時權杖交換，以及用量端點擷取
- `openai`：GPT-5.4 向前相容回退、直接 OpenAI 傳輸正規化、具 Codex 感知能力的遺失認證提示、Spark 抑制、合成 OpenAI/Codex 目錄列、思考/即時模型原則，以及提供者系列元資料
- `google` 和 `google-gemini-cli`：Gemini 3.1 向前相容回退和現代模型匹配；Gemini CLI OAuth 也負責用量介面的認證設定檔權杖格式化、用量權杖解析，以及配額端點擷取
- `moonshot`：共享傳輸、外掛擁有的思維負載正規化
- `kilocode`：共享傳輸、外掛擁有的請求標頭、推理負載
  正規化、Gemian 逐字稿提示以及快取 TTL 政策
- `zai`：GLM-5 向前相容後備、`tool_stream` 預設值、快取 TTL
  政策、二元思維/即時模型政策以及使用量驗證 + 配額獲取
- `mistral`、`opencode` 和 `opencode-go`：外掛擁有的功能中繼資料
- `byteplus`, `cloudflare-ai-gateway`, `huggingface`, `kimi-coding`,
  `modelstudio`, `nvidia`, `qianfan`, `synthetic`, `together`, `venice`,
  `vercel-ai-gateway`, 和 `volcengine`：僅限外掛程式擁有的目錄
- `qwen-portal`：外掛程式擁有的目錄、OAuth 登入和 OAuth 更新
- `minimax` 和 `xiaomi`：外掛程式擁有的目錄加上使用授權/快照邏輯

內建的 `openai` 外掛程式現在同時擁有這兩個提供者 ID：`openai` 和
`openai-codex`。

這涵蓋了仍然適合 OpenClaw 正常傳輸的提供商。需要完全自訂請求執行器的提供商則是一個獨立、更深層的擴充介面。

## API 金鑰輪替

- 支援選定提供商的通用提供商輪替。
- 透過以下方式設定多個金鑰：
  - `OPENCLAW_LIVE_<PROVIDER>_KEY`（單一即時覆寫，最高優先級）
  - `<PROVIDER>_API_KEYS`（逗號或分號列表）
  - `<PROVIDER>_API_KEY`（主要金鑰）
  - `<PROVIDER>_API_KEY_*`（編號列表，例如 `<PROVIDER>_API_KEY_1`）
- 對於 Google 提供商，`GOOGLE_API_KEY` 也會被包含作為備援。
- 金鑰選擇順序會保留優先級並去除重複的值。
- 請求僅在速率限制回應（例如 `429`、`rate_limit`、`quota`、`resource exhausted`）上使用下一個金鑰重試。
- 非速率限制失敗會立即失敗；不會嘗試金鑰輪換。
- 當所有候選金鑰都失敗時，將返回最後一次嘗試的最終錯誤。

## 內建提供商（pi-ai 目錄）

OpenClaw 隨附 pi-ai 目錄。這些提供商**不**需要
`models.providers` 設定；只需設定驗證並選擇一個模型。

### OpenAI

- 提供商：`openai`
- 驗證：`OPENAI_API_KEY`
- 可選輪換：`OPENAI_API_KEYS`、`OPENAI_API_KEY_1`、`OPENAI_API_KEY_2`，加上 `OPENCLAW_LIVE_OPENAI_KEY`（單一覆寫）
- 範例模型：`openai/gpt-5.4`, `openai/gpt-5.4-pro`
- CLI：`openclaw onboard --auth-choice openai-api-key`
- 預設傳輸方式為 `auto` (優先使用 WebSocket，SSE 備援)
- 透過 `agents.defaults.models["openai/<model>"].params.transport` 針對各個模型進行覆寫 (`"sse"`, `"websocket"`, 或 `"auto"`)
- OpenAI Responses WebSocket 預熱預設透過 `params.openaiWsWarmup` 啟用 (`true`/`false`)
- 可以透過 `agents.defaults.models["openai/<model>"].params.serviceTier` 啟用 OpenAI 優先處理
- 可透過 `agents.defaults.models["<provider>/<model>"].params.fastMode` 針對各個模型啟用 OpenAI 快速模式
- `openai/gpt-5.3-codex-spark` 在 OpenClaw 中被刻意隱藏，因為即時的 OpenAI API 會拒絕它；Spark 被視為僅限 Codex

```json5
{
  agents: { defaults: { model: { primary: "openai/gpt-5.4" } } },
}
```

### Anthropic

- 提供者：`anthropic`
- 身份驗證：`ANTHROPIC_API_KEY` 或 `claude setup-token`
- 選用輪換：`ANTHROPIC_API_KEYS`、`ANTHROPIC_API_KEY_1`、`ANTHROPIC_API_KEY_2`，加上 `OPENCLAW_LIVE_ANTHROPIC_KEY`（單次覆寫）
- 模型範例：`anthropic/claude-opus-4-6`
- CLI：`openclaw onboard --auth-choice token`（貼上 setup-token）或 `openclaw models auth paste-token --provider anthropic`
- 直接 API 金鑰模型支援共用 `/fast` 開關和 `params.fastMode`；OpenClaw 將其對應到 Anthropic `service_tier`（`auto` 對比 `standard_only`）
- 政策說明：setup-token 支援屬於技術相容性；Anthropic 過去曾封鎖部分在 Claude Code 以外的訂閱使用。請確認目前的 Anthropic 條款並根據您的風險承受能力做出決定。
- 建議：Anthropic API 金鑰驗證是比訂閱 setup-token 驗證更安全、更推薦的方式。

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
- 預設傳輸方式為 `auto` (優先使用 WebSocket，SSE 備援)
- 透過 `agents.defaults.models["openai-codex/<model>"].params.transport` 針對每個模型進行覆寫 (`"sse"`、`"websocket"` 或 `"auto"`)
- 與直接 `openai/*` 共用相同的 `/fast` 開關和 `params.fastMode` 設定
- 當 Codex OAuth 目錄公開 `openai-codex/gpt-5.3-codex-spark` 時，其仍保持可用；取決於權利
- 政策備註：明確支援 OpenAI Codex OAuth 用於外部工具/工作流程，例如 OpenClaw。

```json5
{
  agents: { defaults: { model: { primary: "openai-codex/gpt-5.4" } } },
}
```

### OpenCode

- 驗證：`OPENCODE_API_KEY` (或 `OPENCODE_ZEN_API_KEY`)
- Zen 執行時間提供者：`opencode`
- Go 執行時間提供者：`opencode-go`
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

- 提供者：`google-vertex`、`google-gemini-cli`
- 驗證：Vertex 使用 gcloud ADC；Gemini CLI 使用其 OAuth 流程
- 注意：OpenClaw 中的 Gemini CLI OAuth 是非官方整合功能。部分使用者回報在使用第三方用戶端後，其 Google 帳戶受到限制。請詳閱 Google 條款，若選擇繼續操作，請使用非關鍵性的帳戶。
- Gemini CLI OAuth 隨附於內建的 `google` 外掛程式中。
  - 啟用：`openclaw plugins enable google`
  - 登入：`openclaw models auth login --provider google-gemini-cli --set-default`
  - 注意：請**勿**將用戶端 ID 或金鑰貼入 `openclaw.json`。CLI 登入流程會將
    權杖儲存在閘道主機的設定檔中。

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
- Base URL：`https://api.kilo.ai/api/gateway/`
- 擴展的內建目錄包含 GLM-5 Free、MiniMax M2.5 Free、GPT-5.2、Gemini 3 Pro Preview、Gemini 3 Flash Preview、Grok Code Fast 1 以及 Kimi K2.5。

請參閱 [/providers/kilocode](/zh-Hant/providers/kilocode) 以了解設定詳情。

### 其他內建的供應商外掛程式

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
  - OpenAI 相容的基礎 URL：`https://api.cerebras.ai/v1`。
- GitHub Copilot：`github-copilot` (`COPILOT_GITHUB_TOKEN` / `GH_TOKEN` / `GITHUB_TOKEN`)
- Hugging Face Inference 範例模型：`huggingface/deepseek-ai/DeepSeek-R1`；CLI：`openclaw onboard --auth-choice huggingface-api-key`。請參閱 [Hugging Face (Inference)](/zh-Hant/providers/huggingface)。

## 透過 `models.providers` 提供的供應商（自訂/基礎 URL）

使用 `models.providers` (或 `models.json`) 新增**自訂**供應商或
OpenAI/Anthropic 相容的 Proxy。

下列許多打包的提供者外掛已經發佈了預設目錄。
僅當您想要覆蓋預設基礎 URL、標頭或模型清單時，才使用明確的 `models.providers.<id>` 項目。

### Moonshot AI (Kimi)

Moonshot 使用相容 OpenAI 的端點，因此將其設定為自訂提供者：

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

Kimi Coding 使用 Moonshot AI 的相容 Anthropic 的端點：

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

### Qwen OAuth (免費層級)

Qwen 透過裝置碼流程提供 Qwen Coder + Vision 的 OAuth 存取權。隨附的提供者外掛程式預設為啟用狀態，因此只需登入即可：

```exec
openclaw models auth login --provider qwen-portal --set-default
```

模型參照：

- `qwen-portal/coder-model`
- `qwen-portal/vision-model`

請參閱 [/providers/qwen](/zh-Hant/providers/qwen) 以了解設定詳細資訊與註記。

### 火山引擎 (Doubao)

Volcano Engine (火山引擎) 提供對中國境內 Doubao 及其他模型的存取權。

- 提供者：`volcengine` (程式碼撰寫：`volcengine-plan`)
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

### BytePlus（國際版）

BytePlus ARK 為國際用戶提供與火山引擎相同的模型存取權。

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

Synthetic 在 `synthetic` 提供者後面提供 Anthropic 相容的模型：

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

由於 MiniMax 使用自訂端點，因此透過 `models.providers` 進行設定：

- MiniMax (Anthropic 相容)：`--auth-choice minimax-api`
- 驗證：`MINIMAX_API_KEY`

請參閱 [/providers/minimax](/zh-Hant/providers/minimax) 以了解設定詳情、模型選項和設定片段。

### Ollama

Ollama 作為捆綁的提供者外掛程式隨附，並使用 Ollama 的原生 API：

- 提供者：`ollama`
- 驗證：不需要 (本地伺服器)
- 範例模型：`ollama/llama3.3`
- 安裝：[https://ollama.com/download](https://ollama.com/download)

```exec
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

當您使用 `OLLAMA_API_KEY` 選擇加入時，會在本機 `http://127.0.0.1:11434` 偵測到 Ollama，且隨附的提供者外掛會將 Ollama 直接新增到
`openclaw onboard` 和模型選擇器中。請參閱 [/providers/ollama](/zh-Hant/providers/ollama)
以了解入門、雲端/本機模式和自訂設定。

### vLLM

vLLM 作為隨附的提供者外掛，用於本機/自託管的 OpenAI 相容伺服器：

- 提供者：`vllm`
- 驗證：選用 (取決於您的伺服器)
- 預設基礎 URL：`http://127.0.0.1:8000/v1`

若要在本機選擇加入自動探索 (如果您的伺服器不強制執行驗證，則任何值皆可運作)：

```exec
export VLLM_API_KEY="vllm-local"
```

然後設定模型 (替換為 `/v1/models` 傳回的其中一個 ID)：

```json5
{
  agents: {
    defaults: { model: { primary: "vllm/your-model-id" } },
  },
}
```

詳情請參閱 [/providers/vllm](/zh-Hant/providers/vllm)。

### SGLang

SGLang 作為附帶的提供者插件，可用於快速自託管的
OpenAI 相容伺服器：

- 提供者：`sglang`
- 驗證：選用（取決於您的伺服器）
- 預設基礎 URL：`http://127.0.0.1:30000/v1`

若要在本機選擇加入自動探索（如果您的伺服器未強制執行驗證，則任何值皆可）：

```exec
export SGLANG_API_KEY="sglang-local"
```

然後設定一個模型（替換為 `/v1/models` 傳回的其中一個 ID）：

```json5
{
  agents: {
    defaults: { model: { primary: "sglang/your-model-id" } },
  },
}
```

詳情請參閱 [/providers/sglang](/zh-Hant/providers/sglang)。

### 本機代理伺服器（LM Studio、vLLM、LiteLLM 等）

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

- 對於自訂提供者，`reasoning`、`input`、`cost`、`contextWindow` 和 `maxTokens` 為選用。
  省略時，OpenClaw 預設為：
  - `reasoning: false`
  - `input: ["text"]`
  - `cost: { input: 0, output: 0, cacheRead: 0, cacheWrite: 0 }`
  - `contextWindow: 200000`
  - `maxTokens: 8192`
- 建議：設定與您的代理/模型限制相符的明確值。
- 對於非原生端點上的 `api: "openai-completions"`（任何主機不是 `api.openai.com` 的非空 `baseUrl`），OpenClaw 會強制執行 `compat.supportsDeveloperRole: false`，以避免因不支援的 `developer` 角色而導致提供商傳回 400 錯誤。
- 如果 `baseUrl` 為空或省略，OpenClaw 將保持預設的 OpenAI 行為（解析為 `api.openai.com`）。
- 為了安全起見，明確指定的 `compat.supportsDeveloperRole: true` 在非原生 `openai-completions` 端點上仍會被覆蓋。

## CLI 範例

```exec
openclaw onboard --auth-choice opencode-zen
openclaw models set opencode/claude-opus-4-6
openclaw models list
```

另請參閱：[/gateway/configuration](/zh-Hant/gateway/configuration) 以取得完整的組態範例。
