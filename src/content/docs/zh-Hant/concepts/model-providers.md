---
summary: "模型供應商概述及範例設定 + CLI 流程"
read_when:
  - You need a provider-by-provider model setup reference
  - You want example configs or CLI onboarding commands for model providers
title: "模型供應商"
---

# 模型提供者

本頁涵蓋 **LLM/模型提供商**（而非 WhatsApp/Telegram 等聊天頻道）。
關於模型選擇規則，請參閱 [/concepts/models](/en/concepts/models)。

## 快速規則

- 模型參考使用 `provider/model`（範例：`opencode/claude-opus-4-6`）。
- 如果您設定 `agents.defaults.models`，它將成為白名單。
- CLI 輔助工具：`openclaw onboard`、`openclaw models list`、`openclaw models set <provider/model>`。
- 後援執行時規則、冷卻探測和會話覆寫持續性已記錄於 [/concepts/model-failover](/en/concepts/model-failover)。
- `models.providers.*.models[].contextWindow` 是原生模型中繼資料；
  `models.providers.*.models[].contextTokens` 是有效的執行時期上限。
- 供應商外掛程式可以透過 `registerProvider({ catalog })` 注入模型目錄；
  OpenClaw 會在寫入 `models.json` 之前將該輸出合併到 `models.providers` 中。
- 提供商清單可以宣告 `providerAuthEnvVars` 和
  `providerAuthAliases`，因此通用基於環境變數的認證探測和提供商變體
  不需要載入外掛程式執行時。剩餘的核心環境變數對映現在僅用於非外掛程式/核心提供商以及一些通用優先情況，
  例如 Anthropic API 金鑰優先的入門引導。
- 提供商外掛程式也可以透過
  `normalizeModelId`、`normalizeTransport`、`normalizeConfig`、
  `applyNativeStreamingUsageCompat`、`resolveConfigApiKey`、
  `resolveSyntheticAuth`、`shouldDeferSyntheticProfileAuth`、
  `resolveDynamicModel`、`prepareDynamicModel`、
  `normalizeResolvedModel`、`contributeResolvedModelCompat`、
  `capabilities`、`normalizeToolSchemas`、
  `inspectToolSchemas`、`resolveReasoningOutputMode`、
  `prepareExtraParams`、`createStreamFn`、`wrapStreamFn`、
  `resolveTransportTurnState`、`resolveWebSocketSessionPolicy`、
  `createEmbeddingProvider`、`formatApiKey`、`refreshOAuth`、
  `buildAuthDoctorHint`、
  `matchesContextOverflowError`、`classifyFailoverReason`、
  `isCacheTtlEligible`、`buildMissingAuthMessage`、`suppressBuiltInModel`、
  `augmentModelCatalog`、`isBinaryThinking`、`supportsXHighThinking`、
  `resolveDefaultThinkingLevel`、`applyConfigDefaults`、`isModernModelRef`、
  `prepareRuntimeAuth`、`resolveUsageAuth`、`fetchUsageSnapshot` 和
  `onModelSelected` 來擁有提供商執行時行為。
- 注意：提供者運行時 `capabilities` 是共享的運行器元數據（提供者系列、轉錄/工具怪癖、傳輸/緩存提示）。它與描述插件註冊內容（文本推理、語音等）的[公開能力模型](/en/plugins/architecture#public-capability-model)不同。
- 附帶的 `codex` 提供者與附帶的 Codex 代理線束搭配使用。當您需要 Codex 管理的登入、模型發現、原生執行緒恢復以及應用程式伺服器執行時，請使用 `codex/gpt-*`。單純的 `openai/gpt-*` 引用繼續使用 OpenAI 提供者和正常的 OpenClaw 提供者傳輸。僅 Codex 的部署可以透過 `agents.defaults.embeddedHarness.fallback: "none"` 禁用自動 PI 備援；請參閱 [Codex Harness](/en/plugins/codex-harness)。

## 外掛擁有的提供者行為

提供者外掛現在可以擁有大部分特定於提供者的邏輯，而 OpenClaw 則保留通用推理循環。

典型分工：

- `auth[].run` / `auth[].runNonInteractive`：提供者擁有 `openclaw onboard`、`openclaw models auth` 和無頭設置的入門/登入流程
- `wizard.setup` / `wizard.modelPicker`：提供者擁有認證選擇標籤、舊版別名、入門允許列表提示，以及入門/模型選擇器中的設置項目
- `catalog`：提供者出現在 `models.providers` 中
- `normalizeModelId`：提供者在查找或規範化之前會將舊版/預覽模型 ID 進行標準化
- `normalizeTransport`：提供者在通用模型組裝之前將傳輸系列 `api` / `baseUrl` 進行標準化；OpenClaw 會先檢查匹配的提供者，然後檢查其他具有鉤子功能的提供者外掛，直到其中一個實際更改傳輸
- `normalizeConfig`：提供者在運行時使用之前將 `models.providers.<id>` 配置進行標準化；OpenClaw 會先檢查匹配的提供者，然後檢查其他具有鉤子功能的提供者外掛，直到其中一個實際更改配置。如果沒有提供者鉤子重寫配置，附帶的 Google 系列輔助工具仍會標準化支援的 Google 提供者項目。
- `applyNativeStreamingUsageCompat`: 提供者為設定提供者套用以端點為驅動的原生串流使用相容性重寫
- `resolveConfigApiKey`: 提供者為設定提供者解析環境標記認證
  而無需強制載入完整的執行時期認證。`amazon-bedrock` 也在此處具有
  內建的 AWS 環境標記解析器，儘管 Bedrock 執行時期認證使用
  AWS SDK 預設鏈。
- `resolveSyntheticAuth`: 提供者可以公開本機/託管或其他
  設定支援的認證可用性，而無需持久化純文字機密
- `shouldDeferSyntheticProfileAuth`: 提供者可以將儲存的合成設定檔
  預留位置標記為低於環境/設定支援認證的優先順序
- `resolveDynamicModel`: 提供者接受本機靜態目錄中尚未存在的模型 ID
- `prepareDynamicModel`: 提供者在重試動態解析之前需要重新整理中繼資料
- `normalizeResolvedModel`: 提供者需要傳輸或基礎 URL 重寫
- `contributeResolvedModelCompat`: 提供者為其
  供應商模型提供相容性標誌，即使它們是透過另一個相容傳輸到達的
- `capabilities`: 提供者發佈文字記錄/工具/提供者系列的特殊行為
- `normalizeToolSchemas`: 提供者在嵌入式執行程式
  看到工具架構之前進行清理
- `inspectToolSchemas`: 提供者在正規化後公開
  特定於傳輸的架構警告
- `resolveReasoningOutputMode`: 提供者選擇原生與標記的
  推理輸出合約
- `prepareExtraParams`: 提供者設定預設值或正規化每個模型的請求參數
- `createStreamFn`: 提供者以完全自訂的傳輸
  取代正常的串流路徑
- `wrapStreamFn`: 提供者套用請求標頭/主體/模型相容性包裝器
- `resolveTransportTurnState`: 提供者提供每輪次原生傳輸
  標頭或中繼資料
- `resolveWebSocketSessionPolicy`: 提供者提供原生 WebSocket 連線
  標頭或連線冷卻政策
- `createEmbeddingProvider`: 當記憶體嵌入行為屬於提供者外掛程式而非核心嵌入交換器時，
  提供者擁有該行為
- `formatApiKey`：提供者將儲存的驗證設定檔格式化為傳輸層預期的
  `apiKey` 字串
- `refreshOAuth`：當共用的 `pi-ai`
  更新器不足時，提供者擁有 OAuth 更新的權責
- `buildAuthDoctorHint`：當 OAuth 更新失敗時，
  提供者會附加修復指引
- `matchesContextOverflowError`：提供者能識別通用啟發式規則會遺漏的、
  特定於提供者的內容視窗溢位錯誤
- `classifyFailoverReason`：提供者將特定於提供者的原始傳輸/API
  錯誤映射至故障轉移原因，例如速率限制或過載
- `isCacheTtlEligible`：提供者決定哪些上游模型 ID 支援 prompt-cache TTL
- `buildMissingAuthMessage`：提供者將通用 auth-store 錯誤
  替換為特定於提供者的復原提示
- `suppressBuiltInModel`：提供者隱藏過期的上游資料列，並可針對直接解析失敗
  返回供應商擁有的錯誤
- `augmentModelCatalog`：提供者在探索與配置合併後，
  附加合成/最終目錄資料列
- `isBinaryThinking`：提供者擁有二元的開/關思考 UX
- `supportsXHighThinking`：提供者將選定的模型選入 `xhigh`
- `resolveDefaultThinkingLevel`：提供者擁有模型家族的預設
  `/think` 策略
- `applyConfigDefaults`：提供者根據驗證模式、環境或模型家族，
  在配置具體化期間套用特定於提供者的全域預設值
- `isModernModelRef`：提供者擁有即時/冒煙測試的首選模型匹配
- `prepareRuntimeAuth`：提供者將設定的憑證轉換為
  短期執行時權杖
- `resolveUsageAuth`：提供者解析 `/usage`
  的使用量/配額憑證及相關狀態/報告介面
- `fetchUsageSnapshot`：提供者擁有使用量端點的擷取/解析，
  而 Core 仍擁有摘要殼層與格式化
- `onModelSelected`：提供者執行選取後的副作用，例如
  遙測或提供者擁有的會話記帳

目前附帶的範例：

- `anthropic`：Claude 4.6 前向相容性後備、身份驗證修復提示、使用端點擷取、快取 TTL/提供者家族元數據，以及具有身分驗證感知的全域設定預設值
- `amazon-bedrock`：提供者擁有的上下文溢位比對和針對 Bedrock 特定節流/未就緒錯誤的故障遷移原因分類，加上針對 Anthropic 流量上僅限 Claude 重試原則防護的共用 `anthropic-by-model` 重試家族
- `anthropic-vertex`：針對 Anthropic-message 流量上僅限 Claude 重試原則的防護
- `openrouter`：傳遞式模型 ID、請求包裝器、提供者能力提示、代理 Gemini 流量上的 Gemini 思維簽章清理、透過 `openrouter-thinking` 串流家族進行的代理推理注入、路由元數據轉發，以及快取 TTL 原則
- `github-copilot`：入門/裝置登入、前向相容模型後備、Claude 思維文字記錄提示、執行時期 Token 交換，以及使用端點擷取
- `openai`：GPT-5.4 前向相容性後備、直接 OpenAI 傳輸正規化、感知 Codex 的缺失身分驗證提示、Spark 抑制、合成 OpenAI/Codex 目錄列、思維/即時模型原則、使用 Token 別名正規化（`input` / `output` 和 `prompt` / `completion` 家族）、用於原生 OpenAI/Codex 包裝器的共用 `openai-responses-defaults` 串流家族、提供者家族元數據、針對 `gpt-image-1` 的附帶圖像生成提供者註冊，以及針對 `sora-2` 的附帶影片生成提供者註冊
- `google` 和 `google-gemini-cli`：Gemini 3.1 向後相容性回退機制、原生 Gemini 重播驗證、引導重播清理、標記式推理輸出模式、現代模型匹配、針對 Gemini 圖片預覽模型的內建圖片生成提供者註冊，以及針對 Veo 模型的內建影片生成提供者註冊；Gemini CLI OAuth 也負責認證設定檔 Token 格式化、使用量 Token 解析，以及為使用介面提取配額端點
- `moonshot`：共用傳輸、外掛擁有的思考 Payload 正規化
- `kilocode`：共用傳輸、外掛擁有的請求標頭、推理 Payload 正規化、代理 Gemini 思考簽章清理，以及快取 TTL 原則
- `zai`：GLM-5 向後相容性回退、`tool_stream` 預設值、快取 TTL 原則、二進制思考/即時模型原則，以及使用量驗證與配額提取；未知的 `glm-5*` ID 根據內建的 `glm-4.7` 樣板合成
- `xai`：原生 Responses 傳輸正規化、針對 Grok 快速變體的 `/fast` 別名重寫、預設 `tool_stream`、xAI 特定的工具結構/推理 Payload 清理，以及針對 `grok-imagine-video` 的內建影片生成提供者註冊
- `mistral`：外掛擁有的功能中繼資料
- `opencode` 和 `opencode-go`：外掛擁有的功能中繼資料，加上代理 Gemini 思考簽章清理
- `alibaba`：外掛擁有的影片生成目錄，用於直接參照 Wan 模型（例如 `alibaba/wan2.6-t2v`）
- `byteplus`：外掛擁有的目錄，加上針對 Seedance 文字轉影片/圖片轉影片模型的內建影片生成提供者註冊
- `fal`：針對代管第三方 FLUX 圖片模型的圖片生成提供者註冊（包含於內建影片生成提供者註冊中），加上針對代管第三方影片模型的內建影片生成提供者註冊
- `cloudflare-ai-gateway`、`huggingface`、`kimi`、`nvidia`、`qianfan`、
  `stepfun`、`synthetic`、`venice`、`vercel-ai-gateway` 和 `volcengine`：
  僅限外掛程式擁有的目錄
- `qwen`：文字模型的外掛程式擁有目錄，加上用於其多模態介面的共用
  媒體理解和視訊生成供應商註冊；Qwen 視訊生成使用標準 DashScope 視訊
  端點，搭配捆綁的 Wan 模型，例如 `wan2.6-t2v` 和 `wan2.7-r2v`
- `runway`：用於原生 Runway 基於任務模型的外掛程式擁有視訊生成供應商註冊，例如 `gen4.5`
- `minimax`：外掛程式擁有目錄、用於 Hailuo 視訊模型的捆綁視訊生成供應商
  註冊、用於 `image-01` 的捆綁圖像生成供應商註冊、混合 Anthropic/OpenAI 重播策略
  選擇，以及用量授權/快照邏輯
- `together`：外掛程式擁有目錄加上用於 Wan 視訊模型的捆綁視訊生成供應商註冊
- `xiaomi`：外掛程式擁有目錄加上用量授權/快照邏輯

捆綁的 `openai` 外掛程式現同時擁有兩個供應商 ID：`openai` 和
`openai-codex`。

這涵蓋了仍符合 OpenClaw 正常傳輸方式的供應商。需要完全自訂請求執行器的供應商則屬於單獨、更深層的擴充介面。

## API 金鑰輪替

- 支援所選供應商的通用供應商輪替。
- 透過以下方式設定多個金鑰：
  - `OPENCLAW_LIVE_<PROVIDER>_KEY` (單一即時覆寫，最高優先級)
  - `<PROVIDER>_API_KEYS` (逗號或分號清單)
  - `<PROVIDER>_API_KEY` (主金鑰)
  - `<PROVIDER>_API_KEY_*` (編號清單，例如 `<PROVIDER>_API_KEY_1`)
- 對於 Google 供應商，`GOOGLE_API_KEY` 也會包含在內作為後備。
- 金鑰選擇順序會保留優先順序並將數值重複去除。
- 僅在收到速率限制回應時，才會使用下一個金鑰重試請求（例如
  `429`、`rate_limit`、`quota`、`resource exhausted`、`Too many
concurrent requests`, `ThrottlingException`, `concurrency limit reached`、
  `workers_ai ... quota limit exceeded`，或定期用量限制訊息）。
- 非速率限制的失敗會立即報錯；不會嘗試金鑰輪替。
- 當所有候選金鑰都失敗時，會傳回最後一次嘗試的最終錯誤。

## 內建提供者（pi-ai 目錄）

OpenClaw 隨附 pi-ai 目錄。這些提供者**不需要**
`models.providers` 設定；只需設定驗證並選擇一個模型。

### OpenAI

- 提供者：`openai`
- 驗證：`OPENAI_API_KEY`
- 選用輪替：`OPENAI_API_KEYS`、`OPENAI_API_KEY_1`、`OPENAI_API_KEY_2`，加上 `OPENCLAW_LIVE_OPENAI_KEY`（單一覆寫）
- 範例模型：`openai/gpt-5.4`、`openai/gpt-5.4-pro`
- CLI：`openclaw onboard --auth-choice openai-api-key`
- 預設傳輸方式為 `auto`（WebSocket 優先，SSE 備援）
- 透過 `agents.defaults.models["openai/<model>"].params.transport` 針對每個模型進行覆寫（`"sse"`、`"websocket"` 或 `"auto"`）
- OpenAI Responses WebSocket 預熱預設透過 `params.openaiWsWarmup` 啟用（`true`/`false`）
- 可透過 `agents.defaults.models["openai/<model>"].params.serviceTier` 啟用 OpenAI 優先處理
- `/fast` 和 `params.fastMode` 會將直接的 `openai/*` Responses 要求對應到 `service_tier=priority` 上的 `api.openai.com`
- 當您想要明確的層級，而非共用的 `/fast` 開關時，請使用 `params.serviceTier`
- 隱藏的 OpenClaw 屬性標頭 (`originator`, `version`,
  `User-Agent`) 僅適用於對 `api.openai.com` 的原生 OpenAI 流量，不適用於
  通用 OpenAI 相容代理
- 原生 OpenAI 路由也會保留 Responses `store`、提示快取提示以及
  OpenAI 推理相容負載塑形；代理路由則不會
- `openai/gpt-5.3-codex-spark` 在 OpenClaw 中被刻意隱藏，因為即時 OpenAI API 會拒絕它；Spark 被視為僅限 Codex 使用

```json5
{
  agents: { defaults: { model: { primary: "openai/gpt-5.4" } } },
}
```

### Anthropic

- 提供者：`anthropic`
- 驗證：`ANTHROPIC_API_KEY`
- 可選輪換：`ANTHROPIC_API_KEYS`, `ANTHROPIC_API_KEY_1`, `ANTHROPIC_API_KEY_2`，以及 `OPENCLAW_LIVE_ANTHROPIC_KEY` (單次覆寫)
- 範例模型：`anthropic/claude-opus-4-6`
- CLI：`openclaw onboard --auth-choice apiKey`
- 直接公開的 Anthropic 請求支援共享的 `/fast` 切換開關和 `params.fastMode`，包括傳送到 `api.anthropic.com` 的 API 金鑰和 OAuth 驗證流量；OpenClaw 將其對應到 Anthropic `service_tier` (`auto` vs `standard_only`)
- Anthropic 說明：Anthropic 人員告訴我們，OpenClaw 風格的 Claude CLI 使用再次被允許，因此除非 Anthropic 發布新政策，否則 OpenClaw 將 Claude CLI 重用和 `claude -p` 使用視為此整合的許可行為。
- Anthropic setup-token 仍作為支援的 OpenClaw 權杖路徑可用，但 OpenClaw 現在傾向於在可用時使用 Claude CLI 重用和 `claude -p`。

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
- 預設傳輸為 `auto` (WebSocket 優先，SSE 後備)
- 透過 `agents.defaults.models["openai-codex/<model>"].params.transport` 逐個模型覆寫 (`"sse"`, `"websocket"`, 或 `"auto"`)
- `params.serviceTier` 也會在原生 Codex Responses 請求 (`chatgpt.com/backend-api`) 上轉發
- 隱藏的 OpenClaw 歸因標頭 (`originator`, `version`,
  `User-Agent`) 僅附加於到
  `chatgpt.com/backend-api` 的原生 Codex 流量，而非通用的 OpenAI 相容代理
- 與直接 `openai/*` 共用相同的 `/fast` 切換開關和 `params.fastMode` 設定；OpenClaw 會將其對應到 `service_tier=priority`
- 當 Codex OAuth 目錄公開 `openai-codex/gpt-5.3-codex-spark` 時，其仍保持可用；取決於授權權利
- `openai-codex/gpt-5.4` 保留原生 `contextWindow = 1050000` 和預設執行時間 `contextTokens = 272000`；使用 `models.providers.openai-codex.models[].contextTokens` 覆寫執行時間上限
- 策略註記：明確支援將 OpenAI Codex OAuth 用於外部工具/工作流程，例如 OpenClaw。

```json5
{
  agents: { defaults: { model: { primary: "openai-codex/gpt-5.4" } } },
}
```

```json5
{
  models: {
    providers: {
      "openai-codex": {
        models: [{ id: "gpt-5.4", contextTokens: 160000 }],
      },
    },
  },
}
```

### 其他訂閱式託管選項

- [Qwen Cloud](/en/providers/qwen)：Qwen Cloud 供應商介面加上阿里雲 DashScope 和 Coding Plan 端點對應
- [MiniMax](/en/providers/minimax)：MiniMax Coding Plan OAuth 或 API 金鑰存取
- [GLM Models](/en/providers/glm)：Z.AI Coding Plan 或一般 API 端點

### OpenCode

- 驗證：`OPENCODE_API_KEY` (或 `OPENCODE_ZEN_API_KEY`)
- Zen 執行時間供應商：`opencode`
- Go 執行時間供應商：`opencode-go`
- 範例模型：`opencode/claude-opus-4-6`, `opencode-go/kimi-k2.5`
- CLI：`openclaw onboard --auth-choice opencode-zen` 或 `openclaw onboard --auth-choice opencode-go`

```json5
{
  agents: { defaults: { model: { primary: "opencode/claude-opus-4-6" } } },
}
```

### Google Gemini (API 金鑰)

- 供應商：`google`
- 驗證：`GEMINI_API_KEY`
- 可選輪替：`GEMINI_API_KEYS`、`GEMINI_API_KEY_1`、`GEMINI_API_KEY_2`、`GOOGLE_API_KEY` 備援，以及 `OPENCLAW_LIVE_GEMINI_KEY` (單一覆寫)
- 範例模型：`google/gemini-3.1-pro-preview`, `google/gemini-3-flash-preview`
- 相容性：使用 `google/gemini-3.1-flash-preview` 的舊版 OpenClaw 設定會被正規化為 `google/gemini-3-flash-preview`
- CLI：`openclaw onboard --auth-choice gemini-api-key`
- 直接 Gemini 執行也接受 `agents.defaults.models["google/<model>"].params.cachedContent`
  （或舊版 `cached_content`） 以轉發提供者原生的
  `cachedContents/...` 控制碼；Gemini 快取命中會顯示為 OpenClaw `cacheRead`

### Google Vertex 和 Gemini CLI

- 提供者：`google-vertex`、`google-gemini-cli`
- 驗證：Vertex 使用 gcloud ADC；Gemini CLI 使用其 OAuth 流程
- 注意：OpenClaw 中的 Gemini CLI OAuth 是非官方整合。部分使用者回報在使用第三方客戶端後其 Google 帳號受到限制。請檢閱 Google 條款，若您選擇繼續，請使用非關鍵帳號。
- Gemini CLI OAuth 作為隨附的 `google` 外掛程式的一部分提供。
  - 請先安裝 Gemini CLI：
    - `brew install gemini-cli`
    - 或 `npm install -g @google/gemini-cli`
  - 啟用：`openclaw plugins enable google`
  - 登入：`openclaw models auth login --provider google-gemini-cli --set-default`
  - 預設模型：`google-gemini-cli/gemini-3-flash-preview`
  - 注意：您**不**需要將客戶端 ID 或密鑰貼到 `openclaw.json` 中。CLI 登入流程會將
    權杖儲存在閘道主機上的驗證設定檔中。
  - 如果登入後請求失敗，請在閘道主機上設定 `GOOGLE_CLOUD_PROJECT` 或 `GOOGLE_CLOUD_PROJECT_ID`。
  - Gemini CLI JSON 回覆是從 `response` 解析的；使用量會回退至
    `stats`，其中 `stats.cached` 會被正規化為 OpenClaw `cacheRead`。

### Z.AI (GLM)

- 提供者：`zai`
- 驗證：`ZAI_API_KEY`
- 範例模型：`zai/glm-5.1`
- CLI：`openclaw onboard --auth-choice zai-api-key`
  - 別名：`z.ai/*` 和 `z-ai/*` 會正規化為 `zai/*`
  - `zai-api-key` 會自動偵測相符的 Z.AI 端點；`zai-coding-global`、`zai-coding-cn`、`zai-global` 和 `zai-cn` 會強制使用特定介面

### Vercel AI Gateway

- 提供者：`vercel-ai-gateway`
- 驗證：`AI_GATEWAY_API_KEY`
- 範例模型：`vercel-ai-gateway/anthropic/claude-opus-4.6`
- CLI：`openclaw onboard --auth-choice ai-gateway-api-key`

### Kilo Gateway

- 提供者：`kilocode`
- 驗證：`KILOCODE_API_KEY`
- 範例模型：`kilocode/kilo/auto`
- CLI：`openclaw onboard --auth-choice kilocode-api-key`
- 基礎 URL：`https://api.kilo.ai/api/gateway/`
- 靜態備份目錄附帶 `kilocode/kilo/auto`；即時
  `https://api.kilo.ai/api/gateway/models` 探索可進一步擴充運行時
  目錄。
- `kilocode/kilo/auto` 背後的精確上游路由由 Kilo Gateway 管理，
  而非硬編碼在 OpenClaw 中。

請參閱 [/providers/kilocode](/en/providers/kilocode) 了解設定詳情。

### 其他內建提供者外掛

- OpenRouter：`openrouter` (`OPENROUTER_API_KEY`)
- 範例模型：`openrouter/auto`
- OpenClaw 僅在請求實際目標為 `openrouter.ai` 時，才會套用 OpenRouter 記載的應用程式歸因標頭
- OpenRouter 專屬的 Anthropic `cache_control` 標記同樣僅限於已驗證的 OpenRouter 路由，而非任意的代理 URL
- OpenRouter 維持在代理風格的 OpenAI 相容路徑上，因此原生的
  僅限 OpenAI 的請求塑形 (`serviceTier`、Responses `store`、
  prompt-cache 提示、OpenAI reasoning-compat payload) 不會被轉發
- Gemini 支援的 OpenRouter 參考僅保留代理 Gemini 的思維簽名清理；
  原生 Gemini 重播驗證和啟動重寫保持關閉
- Kilo Gateway：`kilocode` (`KILOCODE_API_KEY`)
- 範例模型：`kilocode/kilo/auto`
- Gemini 支援的 Kilo 參考沿用相同的代理 Gemini 思維簽名
  清理路徑；`kilocode/kilo/auto` 及其他不支援代理推理的
  提示會略過代理推理注入
- MiniMax：`minimax` (API 金鑰) 和 `minimax-portal` (OAuth)
- 驗證：`MINIMAX_API_KEY` 用於 `minimax`；`MINIMAX_OAUTH_TOKEN` 或 `MINIMAX_API_KEY` 用於 `minimax-portal`
- 示例模型：`minimax/MiniMax-M2.7` 或 `minimax-portal/MiniMax-M2.7`
- MiniMax 入門/API 金鑰設定會使用 `input: ["text", "image"]` 寫入明確的 M2.7 模型定義；內建的提供者目錄會將聊天參照保持為純文字，直到該提供者設定被具體化
- Moonshot：`moonshot` (`MOONSHOT_API_KEY`)
- 示例模型：`moonshot/kimi-k2.5`
- Kimi Coding：`kimi` (`KIMI_API_KEY` 或 `KIMICODE_API_KEY`)
- 示例模型：`kimi/kimi-code`
- Qianfan：`qianfan` (`QIANFAN_API_KEY`)
- 示例模型：`qianfan/deepseek-v3.2`
- Qwen Cloud：`qwen` (`QWEN_API_KEY`、 `MODELSTUDIO_API_KEY` 或 `DASHSCOPE_API_KEY`)
- 示例模型：`qwen/qwen3.5-plus`
- NVIDIA：`nvidia` (`NVIDIA_API_KEY`)
- 示例模型：`nvidia/nvidia/llama-3.1-nemotron-70b-instruct`
- StepFun：`stepfun` / `stepfun-plan` (`STEPFUN_API_KEY`)
- 示例模型：`stepfun/step-3.5-flash`、 `stepfun-plan/step-3.5-flash-2603`
- Together：`together` (`TOGETHER_API_KEY`)
- 示例模型：`together/moonshotai/Kimi-K2.5`
- Venice：`venice` (`VENICE_API_KEY`)
- 小米：`xiaomi` (`XIAOMI_API_KEY`)
- 示例模型：`xiaomi/mimo-v2-flash`
- Vercel AI Gateway：`vercel-ai-gateway` (`AI_GATEWAY_API_KEY`)
- Hugging Face Inference：`huggingface` (`HUGGINGFACE_HUB_TOKEN` 或 `HF_TOKEN`)
- Cloudflare AI Gateway：`cloudflare-ai-gateway` (`CLOUDFLARE_AI_GATEWAY_API_KEY`)
- 火山引擎：`volcengine` (`VOLCANO_ENGINE_API_KEY`)
- 示例模型：`volcengine-plan/ark-code-latest`
- BytePlus：`byteplus` (`BYTEPLUS_API_KEY`)
- 示例模型：`byteplus-plan/ark-code-latest`
- xAI: `xai` (`XAI_API_KEY`)
  - 原生的捆綁 xAI 請求使用 xAI Responses 路徑
  - `/fast` 或 `params.fastMode: true` 會將 `grok-3`、`grok-3-mini`、
    `grok-4` 和 `grok-4-0709` 重寫為其 `*-fast` 變體
  - `tool_stream` 預設為開啟；將
    `agents.defaults.models["xai/<model>"].params.tool_stream` 設為 `false` 即可
    停用它
- Mistral: `mistral` (`MISTRAL_API_KEY`)
- 範例模型：`mistral/mistral-large-latest`
- CLI：`openclaw onboard --auth-choice mistral-api-key`
- Groq: `groq` (`GROQ_API_KEY`)
- Cerebras: `cerebras` (`CEREBRAS_API_KEY`)
  - Cerebras 上的 GLM 模型使用 ID `zai-glm-4.7` 和 `zai-glm-4.6`。
  - OpenAI 相容的基礎 URL：`https://api.cerebras.ai/v1`。
- GitHub Copilot: `github-copilot` (`COPILOT_GITHUB_TOKEN` / `GH_TOKEN` / `GITHUB_TOKEN`)
- Hugging Face Inference 範例模型：`huggingface/deepseek-ai/DeepSeek-R1`；CLI：`openclaw onboard --auth-choice huggingface-api-key`。請參閱 [Hugging Face (Inference)](/en/providers/huggingface)。

## 透過 `models.providers` 的供應商（自訂/基礎 URL）

使用 `models.providers`（或 `models.json`）來新增**自訂**供應商或
OpenAI/Anthropic 相容的代理伺服器。

下方許多捆綁的供應商外掛程式已經發布了預設目錄。
僅在您想要覆寫預設基礎 URL、標頭或模型列表時，才使用明確的 `models.providers.<id>` 項目。

### Moonshot AI (Kimi)

Moonshot 以捆綁的供應商外掛程式形式提供。預設情況下使用內建供應商，
只有在需要覆寫基礎 URL 或模型元資料時，才新增明確的 `models.providers.moonshot` 項目：

- 供應商：`moonshot`
- 驗證：`MOONSHOT_API_KEY`
- 範例模型：`moonshot/kimi-k2.5`
- CLI：`openclaw onboard --auth-choice moonshot-api-key` 或 `openclaw onboard --auth-choice moonshot-api-key-cn`

Kimi K2 模型 ID：

[//]: # "moonshot-kimi-k2-model-refs:start"

- `moonshot/kimi-k2.5`
- `moonshot/kimi-k2-thinking`
- `moonshot/kimi-k2-thinking-turbo`
- `moonshot/kimi-k2-turbo`

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

- 供應商：`kimi`
- 驗證：`KIMI_API_KEY`
- 範例模型：`kimi/kimi-code`

```json5
{
  env: { KIMI_API_KEY: "sk-..." },
  agents: {
    defaults: { model: { primary: "kimi/kimi-code" } },
  },
}
```

舊版 `kimi/k2p5` 仍被接受作為相容模型 ID。

### Volcano Engine (Doubao)

Volcano Engine (火山引擎) 提供對中國境內 Doubao 及其他模型的存取。

- 供應商：`volcengine` (編碼：`volcengine-plan`)
- 驗證：`VOLCANO_ENGINE_API_KEY`
- 範例模型：`volcengine-plan/ark-code-latest`
- CLI：`openclaw onboard --auth-choice volcengine-api-key`

```json5
{
  agents: {
    defaults: { model: { primary: "volcengine-plan/ark-code-latest" } },
  },
}
```

上架流程預設使用編碼介面，但通用 `volcengine/*`
目錄也會同時註冊。

在上架/設定模型選擇器中，Volcengine 驗證選項偏好
`volcengine/*` 和 `volcengine-plan/*` 項目。如果這些模型尚未載入，
OpenClaw 會退回到未過濾的目錄，而不是顯示空的
供應商範圍選擇器。

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

### BytePlus (國際版)

BytePlus ARK 為國際使用者提供與 Volcano Engine 相同的模型存取。

- 供應商：`byteplus` (編碼：`byteplus-plan`)
- 驗證：`BYTEPLUS_API_KEY`
- 範例模型：`byteplus-plan/ark-code-latest`
- CLI：`openclaw onboard --auth-choice byteplus-api-key`

```json5
{
  agents: {
    defaults: { model: { primary: "byteplus-plan/ark-code-latest" } },
  },
}
```

上架流程預設使用編碼介面，但通用 `byteplus/*`
目錄也會同時註冊。

在入門/設定模型選擇器中，BytePlus 身份驗證選項會優先顯示
`byteplus/*` 和 `byteplus-plan/*` 列。如果這些模型尚未載入，
OpenClaw 會改回退到未篩選的目錄，而不是顯示空的
提供者範圍選擇器。

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

Synthetic 在 `synthetic` 提供者後方提供 Anthropic 相容模型：

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

MiniMax 是透過 `models.providers` 設定的，因為它使用自訂端點：

- MiniMax OAuth (全球)：`--auth-choice minimax-global-oauth`
- MiniMax OAuth (中國)：`--auth-choice minimax-cn-oauth`
- MiniMax API 金鑰 (全球)：`--auth-choice minimax-global-api`
- MiniMax API 金鑰 (中國)：`--auth-choice minimax-cn-api`
- 驗證：`MINIMAX_API_KEY` 用於 `minimax`；`MINIMAX_OAUTH_TOKEN` 或
  `MINIMAX_API_KEY` 用於 `minimax-portal`

詳見 [/providers/minimax](/en/providers/minimax) 以了解設定細節、模型選項與設定片段。

在 MiniMax 的 Anthropic 相容串流路徑上，除非您明確設定，否則 OpenClaw 預設會停用思考，且 `/fast on` 會將
`MiniMax-M2.7` 重寫為 `MiniMax-M2.7-highspeed`。

外掛擁有的功能分拆：

- 文字/聊天預設值保持在 `minimax/MiniMax-M2.7`
- 圖像生成為 `minimax/image-01` 或 `minimax-portal/image-01`
- 圖像理解在兩條 MiniMax 驗證路徑上皆為外掛擁有的 `MiniMax-VL-01`
- 網路搜尋保持在提供者 ID `minimax`

### Ollama

Ollama 作為內建的提供者外掛程式隨附，並使用 Ollama 的原生 API：

- 提供者：`ollama`
- 驗證：無需驗證（本地伺服器）
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

當您選擇加入
`OLLAMA_API_KEY` 時，系統會在 `http://127.0.0.1:11434` 本機偵測到 Ollama，而內建的提供者外掛程式會將 Ollama 直接新增至
`openclaw onboard` 和模型選擇器。請參閱 [/providers/ollama](/en/providers/ollama)
以了解上線、雲端/本地模式和自訂配置。

### vLLM

vLLM 作為內建的提供者外掛程式隨附，用於本機/自託管的 OpenAI 相容
伺服器：

- 提供者：`vllm`
- 驗證：選用（視您的伺服器而定）
- 預設基礎 URL：`http://127.0.0.1:8000/v1`

若要在本地選擇加入自動探索（如果您的伺服器不強制執行驗證，則可以使用任何值）：

```bash
export VLLM_API_KEY="vllm-local"
```

然後設定一個模型（替換為 `/v1/models` 傳回的其中一個 ID）：

```json5
{
  agents: {
    defaults: { model: { primary: "vllm/your-model-id" } },
  },
}
```

詳情請參閱 [/providers/vllm](/en/providers/vllm)。

### SGLang

SGLang 作為內建的提供者外掛程式隨附，用於快速的自託管
OpenAI 相容伺服器：

- 提供者：`sglang`
- 驗證：選用（視您的伺服器而定）
- 預設基礎 URL：`http://127.0.0.1:30000/v1`

若要在本地選擇加入自動探索（如果您的伺服器不
強制執行驗證，則可以使用任何值）：

```bash
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

詳情請參閱 [/providers/sglang](/en/providers/sglang)。

### 本地代理伺服器（LM Studio、vLLM、LiteLLM 等）

範例（OpenAI 相容）：

```json5
{
  agents: {
    defaults: {
      model: { primary: "lmstudio/my-local-model" },
      models: { "lmstudio/my-local-model": { alias: "Local" } },
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
            id: "my-local-model",
            name: "Local Model",
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

- 對於自訂提供者，`reasoning`、`input`、`cost`、`contextWindow` 和 `maxTokens` 為選填項目。
  省略時，OpenClaw 預設為：
  - `reasoning: false`
  - `input: ["text"]`
  - `cost: { input: 0, output: 0, cacheRead: 0, cacheWrite: 0 }`
  - `contextWindow: 200000`
  - `maxTokens: 8192`
- 建議：設定符合您的代理伺服器/模型限制的明確值。
- 對於非原生端點上的 `api: "openai-completions"`（任何主機不是 `api.openai.com` 的非空 `baseUrl`），OpenClaw 會強制執行 `compat.supportsDeveloperRole: false`，以避免因提供者不支援 `developer` 角色而導致的 400 錯誤。
- 代理風格的 OpenAI 相容路由也會跳過原生 OpenAI 專有的請求
  塑形：不包含 `service_tier`、不包含 Responses `store`、不包含提示快取提示、不包含
  OpenAI 推理相容負載塑形，也不包含隱藏的 OpenClaw 歸因
  標頭。
- 如果 `baseUrl` 為空或被省略，OpenClaw 將保持預設的 OpenAI 行為（即解析為 `api.openai.com`）。
- 為了安全起見，明確指定的 `compat.supportsDeveloperRole: true` 在非原生的 `openai-completions` 端點上仍會被覆寫。

## CLI 範例

```bash
openclaw onboard --auth-choice opencode-zen
openclaw models set opencode/claude-opus-4-6
openclaw models list
```

另請參閱：[/gateway/configuration](/en/gateway/configuration) 以取得完整的配置範例。

## 相關

- [Models](/en/concepts/models) — 模型配置與別名
- [Model Failover](/en/concepts/model-failover) — 備援鏈與重試行為
- [Configuration Reference](/en/gateway/configuration-reference#agent-defaults) — 模型配置鍵
- [Providers](/en/providers) — 各供應者設定指南
