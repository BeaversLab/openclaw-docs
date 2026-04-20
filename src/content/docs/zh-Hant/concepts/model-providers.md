---
summary: "模型供應商概覽，包含範例配置 + CLI 流程"
read_when:
  - You need a provider-by-provider model setup reference
  - You want example configs or CLI onboarding commands for model providers
title: "模型供應商"
---

# 模型提供者

本頁涵蓋 **LLM/模型供應商**（而非 WhatsApp/Telegram 等聊天頻道）。
關於模型選擇規則，請參閱 [/concepts/models](/zh-Hant/concepts/models)。

## 快速規則

- 模型參照使用 `provider/model`（例如：`opencode/claude-opus-4-6`）。
- 如果您設定 `agents.defaults.models`，它將成為允許清單。
- CLI 輔助工具：`openclaw onboard`、`openclaw models list`、`openclaw models set <provider/model>`。
- 後援執行時規則、冷卻探測和會話覆寫持續性記錄於
  [/concepts/model-failover](/zh-Hant/concepts/model-failover)。
- `models.providers.*.models[].contextWindow` 是原生模型元資料；
  `models.providers.*.models[].contextTokens` 是有效的執行時上限。
- 供應商外掛可以透過 `registerProvider({ catalog })` 注入模型目錄；
  OpenClaw 會將該輸出合併到 `models.providers` 中，然後寫入
  `models.json`。
- 供應商清單可以宣告 `providerAuthEnvVars` 和
  `providerAuthAliases`，因此通用環境變數驗證探測和供應商變體
  不需要載入外掛執行時。其餘的核心環境變數映射現在
  僅供非外掛/核心供應商以及少數通用優先順序案例使用，例如
  Anthropic API 金鑰優先的入門流程。
- 提供者外掛程式也可以透過
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
  `onModelSelected` 來擁有提供者執行時期行為。
- 注意：提供者執行時期 `capabilities` 是共享的執行器中繼資料（提供者系列、轉錄/工具怪癖、傳輸/快取提示）。它與 [公開能力模型](/zh-Hant/plugins/architecture#public-capability-model) 並不相同，後者描述的是外掛程式註冊的內容（文字推論、語音等）。
- 隨附的 `codex` 提供者與隨附的 Codex 代理程式駕驭程式搭配。當您需要 Codex 擁有的登入、模型探索、原生執行緒恢復和應用程式伺服器執行時，請使用 `codex/gpt-*`。單純的 `openai/gpt-*` 引用會繼續使用 OpenAI 提供者和正常的 OpenClaw 提供者傳輸。僅 Codex 的部署可以使用 `agents.defaults.embeddedHarness.fallback: "none"` 來停用自動 PI 備援；請參閱 [Codex 駕驭程式](/zh-Hant/plugins/codex-harness)。

## 外掛擁有的提供者行為

提供者外掛現在可以擁有大部分特定於提供者的邏輯，而 OpenClaw 則保留通用推理循環。

典型分工：

- `auth[].run` / `auth[].runNonInteractive`：提供者擁有 `openclaw onboard`、`openclaw models auth` 和無頭設定的上架/登入流程
- `wizard.setup` / `wizard.modelPicker`：提供者擁有驗證選擇標籤、舊版別名、上架允許清單提示，以及上架/模型選擇器中的設定項目
- `catalog`：提供者出現在 `models.providers` 中
- `normalizeModelId`：提供者會在查找或正規化之前，正規化舊版/預覽模型 ID
- `normalizeTransport`：提供者會在通用模型組裝之前，正規化傳輸系列 `api` / `baseUrl`；OpenClaw 會先檢查相符的提供者，然後檢查其他具備鉤子功能的提供者外掛程式，直到其中一個實際變更傳輸為止
- `normalizeConfig`：提供者會在執行階段使用 `models.providers.<id>` 設定之前先將其正規化；OpenClaw 會先檢查相符的提供者，然後檢查其他具備鉤子功能的提供者外掛程式，直到其中一個實際變更設定為止。如果沒有提供者鉤子重寫設定，內建的 Google 系列協助程式仍會正規化支援的 Google 提供者項目。
- `applyNativeStreamingUsageCompat`：提供者會針對設定提供者套用以端點為驅動的原生串流使用相容性重寫
- `resolveConfigApiKey`：提供者會解析設定提供者的環境標記驗證，而無需強制載入完整的執行階段驗證。`amazon-bedrock` 也有內建的 AWS 環境標記解析器，即使 Bedrock 執行階段驗證使用的是 AWS SDK 預設鏈。
- `resolveSyntheticAuth`：提供者可以公開本機/自行託管或其他設定支援的驗證可用性，而無需持久化純文字祕密
- `shouldDeferSyntheticProfileAuth`：提供者可以將儲存的綜合設定檔預留位置標記為低於環境/設定支援驗證的優先順序
- `resolveDynamicModel`：提供者接受尚未出現在本機靜態目錄中的模型 ID
- `prepareDynamicModel`：提供者需要在重試動態解析之前重新整理中繼資料
- `normalizeResolvedModel`：提供者需要傳輸或基底 URL 重寫
- `contributeResolvedModelCompat`: provider contributes compat flags for its
  vendor models even when they arrive through another compatible transport
- `capabilities`: provider publishes transcript/tooling/provider-family quirks
- `normalizeToolSchemas`: provider cleans tool schemas before the embedded
  runner sees them
- `inspectToolSchemas`: provider surfaces transport-specific schema warnings
  after normalization
- `resolveReasoningOutputMode`: provider chooses native vs tagged
  reasoning-output contracts
- `prepareExtraParams`: provider defaults or normalizes per-model request params
- `createStreamFn`: provider replaces the normal stream path with a fully
  custom transport
- `wrapStreamFn`: provider applies request headers/body/model compat wrappers
- `resolveTransportTurnState`: provider supplies per-turn native transport
  headers or metadata
- `resolveWebSocketSessionPolicy`: provider supplies native WebSocket session
  headers or session cool-down policy
- `createEmbeddingProvider`: provider owns memory embedding behavior when it
  belongs with the provider plugin instead of the core embedding switchboard
- `formatApiKey`: provider formats stored auth profiles into the runtime
  `apiKey` string expected by the transport
- `refreshOAuth`: provider owns OAuth refresh when the shared `pi-ai`
  refreshers are not enough
- `buildAuthDoctorHint`: provider appends repair guidance when OAuth refresh
  fails
- `matchesContextOverflowError`: provider recognizes provider-specific
  context-window overflow errors that generic heuristics would miss
- `classifyFailoverReason`: provider maps provider-specific raw transport/API
  errors to failover reasons such as rate limit or overload
- `isCacheTtlEligible`: provider decides which upstream model ids support prompt-cache TTL
- `buildMissingAuthMessage`: provider replaces the generic auth-store error
  with a provider-specific recovery hint
- `suppressBuiltInModel`：供應商隱藏過時的上游行，並可以針對直接解析失敗返回供應商擁有的錯誤
- `augmentModelCatalog`：供應商在探索和配置合併之後附加合成/最終目錄行
- `isBinaryThinking`：供應商擁有二元開/關思考 UX
- `supportsXHighThinking`：供應商將選定的模型加入 `xhigh`
- `resolveDefaultThinkingLevel`：供應商擁有模型系列預設的 `/think` 策略
- `applyConfigDefaults`：供應商在配置具體化期間，根據驗證模式、環境或模型系列套用供應商特定的全域預設值
- `isModernModelRef`：供應商擁有即時/冒煙測試的首選模型匹配
- `prepareRuntimeAuth`：供應商將配置的憑證轉換為短期執行時權杖
- `resolveUsageAuth`：供應商解析 `/usage` 的使用量/配額憑證以及相關的狀態/報告介面
- `fetchUsageSnapshot`：供應商擁有使用量端點的擷取/解析，而核心仍擁有摘要殼層和格式化
- `onModelSelected`：供應商執行選擇後的副作用，例如遙測或供應商擁有的會話記錄

目前附帶的範例：

- `anthropic`：Claude 4.6 向前相容回退、驗證修復提示、使用量端點擷取、快取 TTL/供應商系列元數據，以及具驗證感知的全域配置預設值
- `amazon-bedrock`：供應商擁有的內容溢出匹配和針對 Bedrock 特定限流/未就緒錯誤的故障遷移原因分類，以及用於 Anthropic 流量上僅限 Claude 重播策略防護的共享 `anthropic-by-model` 重播系列
- `anthropic-vertex`：Anthropic-message 流量上僅限 Claude 的重播策略防護
- `openrouter`：傳遞模型 ID、請求包裝器、供應商能力提示、代理 Gemini 流量上的 Gemini 思考簽章清理、透過 `openrouter-thinking` 串流系列進行的代理推理注入、路由元數據轉發，以及快取 TTL 策略
- `github-copilot`: 入門/裝置登入、向前相容模型回退、
  Claude 思考過程記錄提示、執行時權杖交換，以及使用端點擷取
- `openai`: GPT-5.4 向前相容回退、直接 OpenAI 傳輸
  正規化、感知 Codex 的遺失驗證提示、Spark 抑制、合成
  OpenAI/Codex 目錄列、思考/即時模型政策、使用權杖別名
  正規化（`input` / `output` 和 `prompt` / `completion` 系列）、
  原生 OpenAI/Codex 包裝器的共用 `openai-responses-defaults` 串流系列、
  提供者系列元資料、`gpt-image-1` 的配套圖像生成提供者
  註冊，以及 `sora-2` 的配套影片生成提供者註冊
- `google` 和 `google-gemini-cli`: Gemini 3.1 向前相容回退、
  原生 Gemini 重播驗證、啟動重播清理、標記
  推理輸出模式、現代模型匹配、Gemini 圖片預覽模型的配套圖像
  生成提供者註冊，以及 Veo 模型的配套影片生成提供者註冊；
  Gemini CLI OAuth 也負責使用介面的設定檔權杖格式化、
  使用權杖解析，以及配額端點擷取
- `moonshot`: 共用傳輸、外掛擁有的思考負載正規化
- `kilocode`: 共用傳輸、外掛擁有的請求標頭、推理負載
  正規化、代理 Gemini 思考簽章清理，以及快取 TTL
  政策
- `zai`: GLM-5 向前相容回退、`tool_stream` 預設值、快取 TTL
  政策、二元思考/即時模型政策，以及使用驗證 + 配額擷取；
  未知的 `glm-5*` id 會從配套的 `glm-4.7` 樣板合成
- `xai`：原生 Responses 傳輸正規化、用於 Grok 快速變體的 `/fast` 別名重寫、預設 `tool_stream`、xAI 特有的工具結構描述 / 推理內容清理，以及針對 `grok-imagine-video` 的捆綁視訊生成供應商註冊
- `mistral`：外掛程式擁有的能力元資料
- `opencode` 和 `opencode-go`：外掛程式擁有的能力元資料，外加代理 Gemini 思維簽章清理
- `alibaba`：外掛程式擁有的視訊生成目錄，用於直接參照 Wan 模型（例如 `alibaba/wan2.6-t2v`）
- `byteplus`：外掛程式擁有的目錄，外加針對 Seedance 文字轉視訊/圖片轉視訊模型的捆綁視訊生成供應商註冊
- `fal`：針對 FLUX 圖片模型的託管第三方圖片生成供應商註冊的捆綁視訊生成供應商註冊，外加針對託管第三方視訊模型的捆綁視訊生成供應商註冊
- `cloudflare-ai-gateway`、`huggingface`、`kimi`、`nvidia`、`qianfan`、
  `stepfun`、`synthetic`、`venice`、`vercel-ai-gateway` 和 `volcengine`：
  僅限外掛程式擁有的目錄
- `qwen`：文字模型的外掛程式擁有目錄，外加針對其多模態介面的共用媒體理解與視訊生成供應商註冊；Qwen 視訊生成使用標準 DashScope 視訊端點，並搭配捆綁的 Wan 模型，例如 `wan2.6-t2v` 和 `wan2.7-r2v`
- `runway`：針對原生 Runway 基於任務的模型（例如 `gen4.5`）的外掛程式擁有視訊生成供應商註冊
- `minimax`：外掛程式擁有的目錄，針對 Hailuo 影片模型的內建影片生成提供者註冊、針對 `image-01` 的內建影像生成提供者註冊、混合 Anthropic/OpenAI 重新播放策略選擇，以及使用授權/快照邏輯
- `together`：外掛程式擁有的目錄，加上針對 Wan 影片模型的內建影片生成提供者註冊
- `xiaomi`：外掛程式擁有的目錄加上使用授權/快照邏輯

內建的 `openai` 外掛程式現在擁有這兩個提供者 ID：`openai` 和 `openai-codex`。

這涵蓋了仍符合 OpenClaw 正常傳輸方式的供應商。需要完全自訂請求執行器的供應商則屬於單獨、更深層的擴充介面。

## API 金鑰輪替

- 支援所選供應商的通用供應商輪替。
- 透過以下方式設定多個金鑰：
  - `OPENCLAW_LIVE_<PROVIDER>_KEY` (單一即時覆蓋，最高優先級)
  - `<PROVIDER>_API_KEYS` (逗號或分號清單)
  - `<PROVIDER>_API_KEY` (主要金鑰)
  - `<PROVIDER>_API_KEY_*` (編號清單，例如 `<PROVIDER>_API_KEY_1`)
- 對於 Google 提供者，`GOOGLE_API_KEY` 也會包含在內作為後備。
- 金鑰選擇順序會保留優先順序並將數值重複去除。
- 請求僅在速率限制回應時才會使用下一個金鑰重試 (例如 `429`、`rate_limit`、`quota`、`resource exhausted`、`Too many
concurrent requests`, `ThrottlingException`, `concurrency limit reached`、`workers_ai ... quota limit exceeded`，或定期使用限制訊息)。
- 非速率限制的失敗會立即報錯；不會嘗試金鑰輪替。
- 當所有候選金鑰都失敗時，會傳回最後一次嘗試的最終錯誤。

## 內建提供者（pi-ai 目錄）

OpenClaw 隨附 pi‑ai 目錄。這些提供者**不需要** `models.providers` 設定；只需設定授權並選擇一個模型。

### OpenAI

- 提供者：`openai`
- 授權：`OPENAI_API_KEY`
- 選用輪替：`OPENAI_API_KEYS`、`OPENAI_API_KEY_1`、`OPENAI_API_KEY_2`，以及 `OPENCLAW_LIVE_OPENAI_KEY` (單一覆蓋)
- 範例模型：`openai/gpt-5.4`、`openai/gpt-5.4-pro`
- CLI：`openclaw onboard --auth-choice openai-api-key`
- 預設傳輸為 `auto` (WebSocket 優先，SSE 後備)
- 透過 `agents.defaults.models["openai/<model>"].params.transport` 針對每個模型進行覆寫（`"sse"`、`"websocket"` 或 `"auto"`）
- OpenAI Responses WebSocket 預熱預設透過 `params.openaiWsWarmup` 啟用（`true`/`false`）
- 可透過 `agents.defaults.models["openai/<model>"].params.serviceTier` 啟用 OpenAI 優先處理
- `/fast` 和 `params.fastMode` 將直接的 `openai/*` Responses 請求對應至 `service_tier=priority` 上的 `api.openai.com`
- 當您需要明確的層級而非共享的 `/fast` 開關時，請使用 `params.serviceTier`
- 隱藏的 OpenClaw 歸因標頭（`originator`、`version`、
  `User-Agent`）僅適用於傳送至 `api.openai.com` 的原生 OpenAI 流量，不適用於
  通用 OpenAI 相容代理
- 原生 OpenAI 路由也會保留 Responses `store`、提示快取提示，以及
  OpenAI 推理相容負載整形；代理路由則不會
- `openai/gpt-5.3-codex-spark` 在 OpenClaw 中被刻意隱藏，因為即時 OpenAI API 會拒絕它；Spark 被視為僅限 Codex

```json5
{
  agents: { defaults: { model: { primary: "openai/gpt-5.4" } } },
}
```

### Anthropic

- 提供者：`anthropic`
- 驗證：`ANTHROPIC_API_KEY`
- 選用輪換：`ANTHROPIC_API_KEYS`、`ANTHROPIC_API_KEY_1`、`ANTHROPIC_API_KEY_2`，加上 `OPENCLAW_LIVE_ANTHROPIC_KEY`（單一覆寫）
- 範例模型：`anthropic/claude-opus-4-6`
- CLI：`openclaw onboard --auth-choice apiKey`
- 直接公開 Anthropic 請求支援共享的 `/fast` 開關和 `params.fastMode`，包括傳送至 `api.anthropic.com` 的 API 金鑰和 OAuth 驗證流量；OpenClaw 將其對應至 Anthropic `service_tier`（`auto` 對比 `standard_only`）
- Anthropic 附註：Anthropic 人員告訴我們，OpenClaw 風格的 Claude CLI 使用再次被允許，因此除非 Anthropic 發布新政策，否則 OpenClaw 將 Claude CLI 重新使用和 `claude -p` 使用視為此整合的核准方式。
- Anthropic setup-token 仍然可用作支援的 OpenClaw token 路徑，但 OpenClaw 現在更傾向於在可用時使用 Claude CLI 重新使用和 `claude -p`。

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
- 預設傳輸方式為 `auto` (優先使用 WebSocket，SSE 作為後備)
- 透過 `agents.defaults.models["openai-codex/<model>"].params.transport` 針對每個模型進行覆寫 (`"sse"`、`"websocket"` 或 `"auto"`)
- `params.serviceTier` 也會在原生 Codex Responses 要求上轉送 (`chatgpt.com/backend-api`)
- 隱藏的 OpenClaw 歸因標頭 (`originator`、`version`、
  `User-Agent`) 僅附加在傳送到
  `chatgpt.com/backend-api` 的原生 Codex 流量上，而非通用 OpenAI 相容代理
- 與直接 `openai/*` 共用相同的 `/fast` 切換開關和 `params.fastMode` 設定；OpenClaw 會將其對應到 `service_tier=priority`
- 當 Codex OAuth 目錄公開 `openai-codex/gpt-5.3-codex-spark` 時，它仍然可用；取決於授權
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

- [Qwen Cloud](/zh-Hant/providers/qwen)：Qwen Cloud 供應商介面加上 Alibaba DashScope 和 Coding Plan 端點對應
- [MiniMax](/zh-Hant/providers/minimax)：MiniMax Coding Plan OAuth 或 API 金鑰存取
- [GLM Models](/zh-Hant/providers/glm)：Z.AI Coding Plan 或一般 API 端點

### OpenCode

- 驗證：`OPENCODE_API_KEY` (或 `OPENCODE_ZEN_API_KEY`)
- Zen 執行時間供應商：`opencode`
- Go 執行時期提供者：`opencode-go`
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
- 可選輪替：`GEMINI_API_KEYS`、`GEMINI_API_KEY_1`、`GEMINI_API_KEY_2`、`GOOGLE_API_KEY` 備援，以及 `OPENCLAW_LIVE_GEMINI_KEY`（單次覆寫）
- 範例模型：`google/gemini-3.1-pro-preview`、`google/gemini-3-flash-preview`
- 相容性：使用 `google/gemini-3.1-flash-preview` 的舊版 OpenClaw 設定會被正規化為 `google/gemini-3-flash-preview`
- CLI：`openclaw onboard --auth-choice gemini-api-key`
- 直接的 Gemini 執行也接受 `agents.defaults.models["google/<model>"].params.cachedContent`
  （或舊版 `cached_content`）來轉發提供者原生的
  `cachedContents/...` 句柄；Gemini 快取命中會顯示為 OpenClaw `cacheRead`

### Google Vertex 和 Gemini CLI

- 提供者：`google-vertex`、`google-gemini-cli`
- 驗證：Vertex 使用 gcloud ADC；Gemini CLI 使用其 OAuth 流程
- 注意：OpenClaw 中的 Gemini CLI OAuth 是非官方整合。部分使用者回報在使用第三方客戶端後其 Google 帳號受到限制。請檢閱 Google 條款，若您選擇繼續，請使用非關鍵帳號。
- Gemini CLI OAuth 隨附於內建的 `google` 外掛中。
  - 請先安裝 Gemini CLI：
    - `brew install gemini-cli`
    - 或 `npm install -g @google/gemini-cli`
  - 啟用：`openclaw plugins enable google`
  - 登入：`openclaw models auth login --provider google-gemini-cli --set-default`
  - 預設模型：`google-gemini-cli/gemini-3-flash-preview`
  - 注意：請**勿**將客戶端 ID 或金鑰貼入 `openclaw.json`。CLI 登入流程會將
    token 儲存在閘道主機的驗證設定檔中。
  - 如果登入後請求失敗，請在閘道主機上設定 `GOOGLE_CLOUD_PROJECT` 或 `GOOGLE_CLOUD_PROJECT_ID`。
  - Gemini CLI JSON 回覆會從 `response` 解析；使用量會備援至
    `stats`，其中 `stats.cached` 會被正規化為 OpenClaw `cacheRead`。

### Z.AI (GLM)

- 提供者：`zai`
- 驗證：`ZAI_API_KEY`
- 範例模型：`zai/glm-5.1`
- CLI：`openclaw onboard --auth-choice zai-api-key`
  - 別名：`z.ai/*` 和 `z-ai/*` 正規化為 `zai/*`
  - `zai-api-key` 會自動偵測對應的 Z.AI 端點；`zai-coding-global`、`zai-coding-cn`、`zai-global` 和 `zai-cn` 則強制使用特定的 surface

### Vercel AI Gateway

- 供應商：`vercel-ai-gateway`
- 驗證：`AI_GATEWAY_API_KEY`
- 範例模型：`vercel-ai-gateway/anthropic/claude-opus-4.6`
- CLI：`openclaw onboard --auth-choice ai-gateway-api-key`

### Kilo Gateway

- 供應商：`kilocode`
- 驗證：`KILOCODE_API_KEY`
- 範例模型：`kilocode/kilo/auto`
- CLI：`openclaw onboard --auth-choice kilocode-api-key`
- 基礎 URL：`https://api.kilo.ai/api/gateway/`
- 靜態備選目錄包含 `kilocode/kilo/auto`；即時 `https://api.kilo.ai/api/gateway/models` 探索可以進一步擴充執行時期目錄。
- `kilocode/kilo/auto` 背後的精確上游路由由 Kilo Gateway 擁有，而非硬編碼在 OpenClaw 中。

請參閱 [/providers/kilocode](/zh-Hant/providers/kilocode) 以取得設定詳細資訊。

### 其他內建提供者外掛

- OpenRouter：`openrouter` (`OPENROUTER_API_KEY`)
- 範例模型：`openrouter/auto`
- OpenClaw 僅在請求實際目標為 `openrouter.ai` 時，才會套用 OpenRouter 記錄的應用程式歸因標頭
- OpenRouter 專屬的 Anthropic `cache_control` 標記同樣受限於已驗證的 OpenRouter 路由，而非任意 Proxy URL
- OpenRouter 維持在 Proxy 樣式的 OpenAI 相容路徑上，因此原生的 OpenAI 專用請求塑形 (`serviceTier`、Responses `store`、提示快取提示、OpenAI 推理相容 Payload) 不會被轉發
- Gemini 支援的 OpenRouter 參考僅保留代理 Gemini 的思維簽名清理；
  原生 Gemini 重播驗證和啟動重寫保持關閉
- Kilo Gateway：`kilocode` (`KILOCODE_API_KEY`)
- 範例模型：`kilocode/kilo/auto`
- Gemini 支援的 Kilo 參照保持相同的 Proxy-Gemini 思考簽章清理路徑；`kilocode/kilo/auto` 和其他不支援 Proxy 推理的提示會略過 Proxy 推理注入
- MiniMax：`minimax` (API 金鑰) 和 `minimax-portal` (OAuth)
- 驗證：`MINIMAX_API_KEY` 用於 `minimax`；`MINIMAX_OAUTH_TOKEN` 或 `MINIMAX_API_KEY` 用於 `minimax-portal`
- 範例模型：`minimax/MiniMax-M2.7` 或 `minimax-portal/MiniMax-M2.7`
- MiniMax 入門/API 金鑰設定會使用 `input: ["text", "image"]` 撰寫明確的 M2.7 模型定義；隨附的提供商目錄會在該提供商設定具體化之前，將聊天參照保持為純文字
- Moonshot：`moonshot` (`MOONSHOT_API_KEY`)
- 範例模型：`moonshot/kimi-k2.5`
- Kimi Coding：`kimi` (`KIMI_API_KEY` 或 `KIMICODE_API_KEY`)
- 範例模型：`kimi/kimi-code`
- Qianfan：`qianfan` (`QIANFAN_API_KEY`)
- 範例模型：`qianfan/deepseek-v3.2`
- Qwen Cloud：`qwen` (`QWEN_API_KEY`、`MODELSTUDIO_API_KEY` 或 `DASHSCOPE_API_KEY`)
- 範例模型：`qwen/qwen3.5-plus`
- NVIDIA：`nvidia` (`NVIDIA_API_KEY`)
- 範例模型：`nvidia/nvidia/llama-3.1-nemotron-70b-instruct`
- StepFun：`stepfun` / `stepfun-plan` (`STEPFUN_API_KEY`)
- 範例模型：`stepfun/step-3.5-flash`、`stepfun-plan/step-3.5-flash-2603`
- Together：`together` (`TOGETHER_API_KEY`)
- 範例模型：`together/moonshotai/Kimi-K2.5`
- Venice：`venice` (`VENICE_API_KEY`)
- Xiaomi：`xiaomi` (`XIAOMI_API_KEY`)
- 範例模型：`xiaomi/mimo-v2-flash`
- Vercel AI Gateway：`vercel-ai-gateway` (`AI_GATEWAY_API_KEY`)
- Hugging Face Inference：`huggingface` (`HUGGINGFACE_HUB_TOKEN` 或 `HF_TOKEN`)
- Cloudflare AI Gateway：`cloudflare-ai-gateway` (`CLOUDFLARE_AI_GATEWAY_API_KEY`)
- Volcengine：`volcengine` (`VOLCANO_ENGINE_API_KEY`)
- 範例模型：`volcengine-plan/ark-code-latest`
- BytePlus：`byteplus` (`BYTEPLUS_API_KEY`)
- 範例模型：`byteplus-plan/ark-code-latest`
- xAI：`xai` (`XAI_API_KEY`)
  - 原生的捆綁 xAI 請求使用 xAI Responses 路徑
  - `/fast` 或 `params.fastMode: true` 會將 `grok-3`、`grok-3-mini`、
    `grok-4` 和 `grok-4-0709` 重寫為其 `*-fast` 變體
  - `tool_stream` 預設為開啟；將
    `agents.defaults.models["xai/<model>"].params.tool_stream` 設為 `false` 即可
    停用
- Mistral：`mistral` (`MISTRAL_API_KEY`)
- 範例模型：`mistral/mistral-large-latest`
- CLI：`openclaw onboard --auth-choice mistral-api-key`
- Groq：`groq` (`GROQ_API_KEY`)
- Cerebras：`cerebras` (`CEREBRAS_API_KEY`)
  - Cerebras 上的 GLM 模型使用 ID `zai-glm-4.7` 和 `zai-glm-4.6`。
  - 相容 OpenAI 的基礎 URL：`https://api.cerebras.ai/v1`。
- GitHub Copilot：`github-copilot` (`COPILOT_GITHUB_TOKEN` / `GH_TOKEN` / `GITHUB_TOKEN`)
- Hugging Face Inference 範例模型：`huggingface/deepseek-ai/DeepSeek-R1`；CLI：`openclaw onboard --auth-choice huggingface-api-key`。請參閱 [Hugging Face (Inference)](/zh-Hant/providers/huggingface)。

## 透過 `models.providers` 的供應商 (custom/base URL)

使用 `models.providers` (或 `models.json`) 來新增**自訂**供應商或
OpenAI/Anthropic 相容的代理伺服器。

下列許多內建的供應商外掛程式已經發佈了預設目錄。
僅在您想要覆寫預設基礎 URL、標頭或模型清單時，才使用明確的 `models.providers.<id>` 項目。

### Moonshot AI (Kimi)

Moonshot 以內建供應商外掛程式的形式提供。預設使用內建供應商，
並且僅在您需要覆寫基礎 URL 或模型元資料時，才新增明確的 `models.providers.moonshot` 項目：

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

舊版 `kimi/k2p5` 作為相容性模型 ID 仍可接受。

### Volcano Engine (Doubao)

Volcano Engine (火山引擎) 提供對中國境內 Doubao 及其他模型的存取。

- 供應商：`volcengine`（編程：`volcengine-plan`）
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

入門預設為編程介面，但同時也會註冊一般 `volcengine/*`
目錄。

在入門/配置模型選擇器中，Volcengine 驗證選項會優先顯示
`volcengine/*` 和 `volcengine-plan/*` 列。如果這些模型尚未加載，
OpenClaw 將回退到未過濾的目錄，而不是顯示空的
供應商範圍選擇器。

可用模型：

- `volcengine/doubao-seed-1-8-251228` (Doubao Seed 1.8)
- `volcengine/doubao-seed-code-preview-251028`
- `volcengine/kimi-k2-5-260127` (Kimi K2.5)
- `volcengine/glm-4-7-251222` (GLM 4.7)
- `volcengine/deepseek-v3-2-251201` (DeepSeek V3.2 128K)

編程模型（`volcengine-plan`）：

- `volcengine-plan/ark-code-latest`
- `volcengine-plan/doubao-seed-code`
- `volcengine-plan/kimi-k2.5`
- `volcengine-plan/kimi-k2-thinking`
- `volcengine-plan/glm-4.7`

### BytePlus (國際版)

BytePlus ARK 為國際使用者提供與 Volcano Engine 相同的模型存取。

- 供應商：`byteplus`（編程：`byteplus-plan`）
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

入門預設為編程介面，但同時也會註冊一般 `byteplus/*`
目錄。

在入門/配置模型選擇器中，BytePlus 驗證選項會優先顯示
`byteplus/*` 和 `byteplus-plan/*` 列。如果這些模型尚未加載，
OpenClaw 將回退到未過濾的目錄，而不是顯示空的
供應商範圍選擇器。

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

Synthetic 在 `synthetic` 提供者後面提供相容於 Anthropic 的模型：

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

請參閱 [/providers/minimax](/zh-Hant/providers/minimax) 以了解設定細節、模型選項和設定片段。

在 MiniMax 的 Anthropic 相容串流路徑上，除非您明確設定，否則 OpenClaw 預設會停用思考，並且 `/fast on` 會將
`MiniMax-M2.7` 重寫為 `MiniMax-M2.7-highspeed`。

外掛擁有的功能分拆：

- 文字/聊天預設值保持在 `minimax/MiniMax-M2.7`
- 圖片生成為 `minimax/image-01` 或 `minimax-portal/image-01`
- 圖片理解在兩個 MiniMax 驗證路徑上都是外掛擁有的 `MiniMax-VL-01`
- 網路搜尋保持在提供者 ID `minimax`

### LM Studio

LM Studio 作為使用原生 API 的套件提供者外掛隨附：

- 提供者：`lmstudio`
- 驗證：`LM_API_TOKEN`
- 預設推論基礎 URL：`http://localhost:1234/v1`

然後設定模型（替換為 `http://localhost:1234/api/v1/models` 傳回的其中一個 ID）：

```json5
{
  agents: {
    defaults: { model: { primary: "lmstudio/openai/gpt-oss-20b" } },
  },
}
```

OpenClaw 使用 LM Studio 原生的 `/api/v1/models` 和 `/api/v1/models/load`
進行探索 + 自動載入，並預設使用 `/v1/chat/completions` 進行推理。
請參閱 [/providers/lmstudio](/zh-Hant/providers/lmstudio) 以進行設定和疑難排解。

### Ollama

Ollama 作為內建的提供者插件提供，並使用 Ollama 的原生 API：

- 提供者： `ollama`
- 驗證： 不需要（本機伺服器）
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

當您使用 `OLLAMA_API_KEY` 選擇加入時，系統會在本機 `http://127.0.0.1:11434` 偵測到 Ollama，且內建的提供者插件會直接將 Ollama 新增至
`openclaw onboard` 和模型選擇器。請參閱 [/providers/ollama](/zh-Hant/providers/ollama)
以了解上手指南、雲端/本機模式及自訂設定。

### vLLM

vLLM 作為內建的提供者插件提供，適用於本機/自託管的 OpenAI 相容
伺服器：

- 提供者： `vllm`
- 身份驗證：可選（視您的伺服器而定）
- 預設基礎 URL： `http://127.0.0.1:8000/v1`

若要在本機選擇加入自動探索（如果您的伺服器不強制執行驗證，則任何值皆可）：

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

詳情請參閱 [/providers/vllm](/zh-Hant/providers/vllm)。

### SGLang

SGLang 作為內建的提供者插件提供，適用於高效能的自託管
OpenAI 相容伺服器：

- 提供者： `sglang`
- 驗證： 選用（取決於您的伺服器）
- 預設基礎 URL： `http://127.0.0.1:30000/v1`

若要在本機選擇加入自動探索（如果您的伺服器不
強制執行驗證，則任何值皆可）：

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

詳情請參閱 [/providers/sglang](/zh-Hant/providers/sglang)。

### 本機代理伺服器 (LM Studio, vLLM, LiteLLM 等)

範例 (OpenAI 相容)：

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
        apiKey: "${LM_API_TOKEN}",
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

注意：

- 對於自訂提供者，`reasoning`、`input`、`cost`、`contextWindow` 和 `maxTokens` 為選填項目。
  當省略時，OpenClaw 預設為：
  - `reasoning: false`
  - `input: ["text"]`
  - `cost: { input: 0, output: 0, cacheRead: 0, cacheWrite: 0 }`
  - `contextWindow: 200000`
  - `maxTokens: 8192`
- 建議：設定符合您的代理/模型限制的明確值。
- 對於非原生端點上的 `api: "openai-completions"`（任何主機不是 `api.openai.com` 的非空 `baseUrl`），OpenClaw 會強制使用 `compat.supportsDeveloperRole: false`，以避免提供者因不支援的 `developer` 角色而回傳 400 錯誤。
- 代理風格的 OpenAI 相容路由也會跳過僅適用於原生 OpenAI 的請求塑形：沒有 `service_tier`、沒有 Responses `store`、沒有 prompt-cache 提示、沒有 OpenAI 推理相容負載塑形，也沒有隱藏的 OpenClaw 歸因標頭。
- 如果 `baseUrl` 為空或省略，OpenClaw 會保留預設的 OpenAI 行為（這會解析為 `api.openai.com`）。
- 為了安全起見，在非原生的 `openai-completions` 端點上，即使明確指定 `compat.supportsDeveloperRole: true` 也會被覆寫。

## CLI 範例

```bash
openclaw onboard --auth-choice opencode-zen
openclaw models set opencode/claude-opus-4-6
openclaw models list
```

另請參閱：[/gateway/configuration](/zh-Hant/gateway/configuration) 以取得完整的配置範例。

## 相關

- [Models](/zh-Hant/concepts/models) — 模型配置與別名
- [Model Failover](/zh-Hant/concepts/model-failover) — 故障轉移鏈與重試行為
- [Configuration Reference](/zh-Hant/gateway/configuration-reference#agent-defaults) — 模型配置鍵
- [Providers](/zh-Hant/providers) — 各提供者設定指南
