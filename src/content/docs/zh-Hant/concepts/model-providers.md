---
summary: "模型供應商概覽，包含範例配置 + CLI 流程"
read_when:
  - You need a provider-by-provider model setup reference
  - You want example configs or CLI onboarding commands for model providers
title: "模型供應商"
---

# 模型提供者

本頁涵蓋 **LLM/模型提供商**（而非 WhatsApp/Telegram 等聊天頻道）。
關於模型選擇規則，請參閱 [/concepts/models](/zh-Hant/concepts/models)。

## 快速規則

- 模型參照使用 `provider/model`（例如：`opencode/claude-opus-4-6`）。
- 如果您設定 `agents.defaults.models`，它將成為允許清單。
- CLI 輔助工具：`openclaw onboard`、`openclaw models list`、`openclaw models set <provider/model>`。
- 後援執行時期規則、冷卻探測和會話覆蓋持續性記錄於
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
  `augmentModelCatalog`、`resolveThinkingProfile`、`isBinaryThinking`、
  `supportsXHighThinking`、`resolveDefaultThinkingLevel`、
  `applyConfigDefaults`、`isModernModelRef`、
  `prepareRuntimeAuth`、`resolveUsageAuth`、`fetchUsageSnapshot` 和
  `onModelSelected` 擁有提供商執行時期行為。
- 注意：提供商執行時期 `capabilities` 是共享的執行器中繼資料（提供商
  系列、逐字稿/工具特性、傳輸/快取提示）。這與 [公開功能模型](/zh-Hant/plugins/architecture#public-capability-model)
  不同，後者描述外掛程式註冊的內容（文字推論、語音等）。
- 隨附的 `codex` 提供者與隨附的 Codex agent harness 配對。
  當您需要 Codex 擁有的登入、模型探索、原生
  thread resume 和 app-server 執行時，請使用 `codex/gpt-*`。純 `openai/gpt-*` 參照繼續
  使用 OpenAI 提供者和正常的 OpenClaw 提供者傳輸。
  僅 Codex 的部署可以使用
  `agents.defaults.embeddedHarness.fallback: "none"` 停用自動 PI 備援；請參閱
  [Codex Harness](/zh-Hant/plugins/codex-harness)。

## 外掛擁有的提供者行為

提供者外掛現在可以擁有大部分特定於提供者的邏輯，而 OpenClaw 則保留通用推理循環。

典型分工：

- `auth[].run` / `auth[].runNonInteractive`：提供者擁有
  `openclaw onboard`、`openclaw models auth` 和無頭設定的登入流程
- `wizard.setup` / `wizard.modelPicker`：提供者擁有認證選擇標籤、
  舊版別名、入門允許清單提示，以及入門/模型選擇器中的設定項目
- `catalog`：提供者出現在 `models.providers` 中
- `normalizeModelId`：提供者在
  查詢或正規化之前會先正規化舊版/預覽模型 ID
- `normalizeTransport`：提供者在通用模型組合之前正規化傳輸系列 `api` / `baseUrl`；
  OpenClaw 會先檢查匹配的提供者，
  然後是其他具有掛鉤功能的提供者外掛程式，直到其中一個實際變更了
  傳輸
- `normalizeConfig`：提供者在
  執行時段使用之前正規化 `models.providers.<id>` 設定；
  OpenClaw 會先檢查匹配的提供者，然後是其他
  具有掛鉤功能的提供者外掛程式，直到其中一個實際變更了設定。如果沒有
  提供者掛鉤重寫該設定，隨附的 Google 系列協助程式仍然
  會正規化受支援的 Google 提供者項目。
- `applyNativeStreamingUsageCompat`：提供者對設定提供者套用端點驅動的原生串流使用相容性重寫
- `resolveConfigApiKey`：提供者解析設定提供者的 env-marker 認證，
  而無需強制完整執行時段認證載入。`amazon-bedrock` 在此處也有一個
  內建的 AWS env-marker 解析器，即使 Bedrock 執行時段認證使用
  AWS SDK 預設鏈。
- `resolveSyntheticAuth`：供應商可以暴露本機/自託管或其他基於設定的驗證可用性，而無需持久化純文字機密
- `shouldDeferSyntheticProfileAuth`：供應商可以將儲存的綜合設定檔預留位置標記為優先順序低於環境變數/設計支援的驗證
- `resolveDynamicModel`：供應商接受本機靜態目錄中尚未存在的模型 ID
- `prepareDynamicModel`：供應商在重試動態解析之前需要重新整理元資料
- `normalizeResolvedModel`：供應商需要傳輸層或基礎 URL 重寫
- `contributeResolvedModelCompat`：即使廠商模型透過其他相容傳輸層到達，供應商仍會為其提供相容性標誌
- `capabilities`：供應商發佈對話紀錄/工具/供應商系列的怪癖
- `normalizeToolSchemas`：供應商在嵌入式執行器看到工具架構之前會將其清理
- `inspectToolSchemas`：供應商在正規化後會顯示特定於傳輸層的架構警告
- `resolveReasoningOutputMode`：供應商選擇原生或標記的推理輸出合約
- `prepareExtraParams`：供應商設定預設值或正規化每個模型的請求參數
- `createStreamFn`：供應商使用完全自訂的傳輸層替換正常串流路徑
- `wrapStreamFn`：供應商套用請求標頭/內文/模型相容性包裝器
- `resolveTransportTurnState`：供應商提供每輪次原生傳輸層標頭或元資料
- `resolveWebSocketSessionPolicy`：供應商提供原生 WebSocket 會話標頭或會話冷卻策略
- `createEmbeddingProvider`：當記憶體嵌入行為屬於供應商外掛而非核心嵌入交換器時，供應商擁有該行為
- `formatApiKey`：供應商將儲存的驗證設定檔格式化為傳輸層所需的執行階段 `apiKey` 字串
- `refreshOAuth`：當共用的 `pi-ai` 重新整理器不足時，供應商擁有 OAuth 重新整理
- `buildAuthDoctorHint`：當 OAuth 重新整理失敗時，供應商會附加修復指引
- `matchesContextOverflowError`：供應商能夠識別供應商特定的上下文視窗溢出錯誤，這些錯誤是通用啟發式方法可能會遺漏的
- `classifyFailoverReason`：供應商將供應商特定的原始傳輸/API 錯誤映射到速率限制或過載等故障轉移原因
- `isCacheTtlEligible`：供應商決定哪些上游模型 ID 支援提示快取 TTL
- `buildMissingAuthMessage`：供應商使用供應商特定的恢復提示替換通用認證存儲錯誤
- `suppressBuiltInModel`：供應商隱藏過時的上游行，並可以針對直接解析失敗返回供應商擁有的錯誤
- `augmentModelCatalog`：供應商在發現和配置合併後附加合成/最終目錄行
- `resolveThinkingProfile`：供應商擁有精確的 `/think` 級別集合、可選顯示標籤以及所選模型的預設級別
- `isBinaryThinking`：二進制開/關思考 UX 的相容性掛鉤
- `supportsXHighThinking`：所選 `xhigh` 模型的相容性掛鉤
- `resolveDefaultThinkingLevel`：預設 `/think` 策略的相容性掛鉤
- `applyConfigDefaults`：供應商在配置具體化期間根據認證模式、環境或模型系列應用供應商特定的全域預設值
- `isModernModelRef`：供應商擁有即時/冒煙首選模型匹配
- `prepareRuntimeAuth`：供應商將配置的憑證轉換為短期執行時權杖
- `resolveUsageAuth`：供應商解析 `/usage` 的使用/配額憑證以及相關狀態/報告介面
- `fetchUsageSnapshot`：供應商擁有使用端點的獲取/解析，而核心仍然擁有摘要外殼和格式化
- `onModelSelected`：供應商執行選擇後的副作用，例如遙測或供應商擁有的會計帳務

當前捆綁的範例：

- `anthropic`：Claude 4.6 向前相容回退、認證修復提示、使用端點獲取、快取 TTL/供應商系列元數據以及認證感知的全域配置預設值
- `amazon-bedrock`：供應商擁有的上下文溢出匹配和故障轉移，針對 Bedrock 特定的節流/未就緒錯誤的原因分類，以及用於僅限 Claude 重試策略防護的共享 `anthropic-by-model` 重試系列，適用於 Anthropic 流量
- `anthropic-vertex`：僅限 Claude 的重試策略防護，適用於 Anthropic-message 流量
- `openrouter`：傳遞模型 ID、請求包裝器、供應商能力提示、代理 Gemini 流量上的 Gemini 思維特徵清理、通過 `openrouter-thinking` 流系列注入代理推理、路由元數據轉發以及快取 TTL 策略
- `github-copilot`：入門/設備登入、前向相容模型故障轉移、Claude 思維逐字稿提示、執行時令牌交換以及使用端點獲取
- `openai`：GPT-5.4 前向相容故障轉移、直接 OpenAI 傳輸正規化、感知 Codex 的缺失身份驗證提示、Spark 抑制、合成 OpenAI/Codex 目錄行、思考/即時模型策略、使用令牌別名正規化（`input` / `output` 和 `prompt` / `completion` 系列）、用於原生 OpenAI/Codex 包裝器的共享 `openai-responses-defaults` 流系列、供應商系列元數據、用於 `gpt-image-2` 的捆綁圖像生成供應商註冊，以及用於 `sora-2` 的捆綁影片生成供應商註冊
- `google` 和 `google-gemini-cli`：Gemini 3.1 前向相容故障轉移、原生 Gemini 重試驗證、啟動重試清理、標記推理輸出模式、現代模型匹配、用於 Gemini 圖像預覽模型的捆綁圖像生成供應商註冊，以及用於 Veo 模型的捆綁影片生成供應商註冊；Gemini CLI OAuth 還擁有用於使用表面的身份驗證配置檔案令牌格式化、使用令牌解析和配額端點獲取
- `moonshot`：共享傳輸、外掛程式擁有的思維負載正規化
- `kilocode`：共享傳輸、外掛程式擁有的請求標頭、推論酬載正規化、代理 Gemini 思維簽章清理，以及快取 TTL 策略
- `zai`：GLM-5 向前相容後援、`tool_stream` 預設值、快取 TTL 策略、二元思維/即時模型策略，以及使用量驗證 + 配額擷取；未知的 `glm-5*` id 會從捆綁的 `glm-4.7` 樣板合成
- `xai`：原生 Responses 傳輸正規化、針對 Grok 快速變體的 `/fast` 別名重寫、預設 `tool_stream`、xAI 特定的工具結構定義/推論酬載清理，以及針對 `grok-imagine-video` 的捆綁影片生成供應商註冊
- `mistral`：外掛程式擁有的功能元資料
- `opencode` 和 `opencode-go`：外掛程式擁有的功能元資料，以及代理 Gemini 思維簽章清理
- `alibaba`：用於直接 Wan 模型參照（例如 `alibaba/wan2.6-t2v`）的外掛程式擁有影片生成目錄
- `byteplus`：外掛程式擁有的目錄，以及針對 Seedance 文字轉影片/圖片轉影片模型的捆綁影片生成供應商註冊
- `fal`：針對 FLUX 圖片模型的託管第三方圖片生成供應商註冊，以及針對託管第三方影片模型的捆綁影片生成供應商註冊
- `cloudflare-ai-gateway`、`huggingface`、`kimi`、`nvidia`、`qianfan`、
  `stepfun`、`synthetic`、`venice`、`vercel-ai-gateway` 和 `volcengine`：
  僅限外掛程式擁有的目錄
- `qwen`：外掛程式擁有的文字模型目錄，加上針對其多模態介面的共用媒體理解與視訊生成提供者註冊；Qwen 視訊生成使用標準 DashScope 視訊端點，並搭配捆綁的 Wan 模型，例如 `wan2.6-t2v` 和 `wan2.7-r2v`
- `runway`：針對原生 Runway 基於任務的模型（例如 `gen4.5`）的外掛程式擁有視訊生成提供者註冊
- `minimax`：外掛程式擁有的目錄，針對 Hailuo 視訊模型的捆綁視訊生成提供者註冊，針對 `image-01` 的捆綁圖像生成提供者註冊，混合 Anthropic/OpenAI 重新播放策略選擇，以及使用授權/快照邏輯
- `together`：外掛程式擁有的目錄，加上針對 Wan 視訊模型的捆綁視訊生成提供者註冊
- `xiaomi`：外掛程式擁有的目錄加上使用授權/快照邏輯

捆綁的 `openai` 外掛程式現同時擁有這兩個提供者 ID：`openai` 和 `openai-codex`。

這涵蓋了仍然符合 OpenClaw 正常傳輸機制的提供者。需要完全自訂請求執行器的提供者則是另一個更深層的擴充介面。

## API 金鑰輪換

- 支援所選提供者的通用提供者輪換。
- 透過以下方式設定多個金鑰：
  - `OPENCLAW_LIVE_<PROVIDER>_KEY` (單一即時覆寫，最高優先級)
  - `<PROVIDER>_API_KEYS` (逗號或分號分隔清單)
  - `<PROVIDER>_API_KEY` (主金鑰)
  - `<PROVIDER>_API_KEY_*` (編號清單，例如 `<PROVIDER>_API_KEY_1`)
- 對於 Google 提供者，`GOOGLE_API_KEY` 也會作為後備包含在內。
- 金鑰選擇順序會保留優先級並對數值進行去重。
- 僅在遇到速率限制回應時（例如 `429`、`rate_limit`、`quota`、`resource exhausted`、`Too many
concurrent requests`, `ThrottlingException`, `concurrency limit reached`、
  `workers_ai ... quota limit exceeded` 或週期性用量限制訊息），才會使用下一個金鑰重試請求。
- 非速率限制失敗會立即回報錯誤；不會嘗試輪換金鑰。
- 當所有候選金鑰都失敗時，將返回最後一次嘗試的最終錯誤。

## 內建供應商（pi-ai catalog）

OpenClaw 內建 pi‑ai catalog。這些供應商**不需要**
`models.providers` 設定；只需設定驗證並選擇模型。

### OpenAI

- 供應商：`openai`
- 驗證：`OPENAI_API_KEY`
- 可選輪換：`OPENAI_API_KEYS`、`OPENAI_API_KEY_1`、`OPENAI_API_KEY_2`，以及 `OPENCLAW_LIVE_OPENAI_KEY`（單一覆蓋）
- 範例模型：`openai/gpt-5.4`、`openai/gpt-5.4-pro`
- CLI：`openclaw onboard --auth-choice openai-api-key`
- 預設傳輸方式為 `auto`（優先使用 WebSocket，SSE 為後備）
- 透過 `agents.defaults.models["openai/<model>"].params.transport` 針對各模型進行覆蓋（`"sse"`、`"websocket"` 或 `"auto"`）
- OpenAI Responses WebSocket 預熱預設透過 `params.openaiWsWarmup` 啟用（`true`/`false`）
- 可透過 `agents.defaults.models["openai/<model>"].params.serviceTier` 啟用 OpenAI 優先處理
- `/fast` 和 `params.fastMode` 會將對 `openai/*` Responses 的直接請求映射到 `service_tier=priority` 上的 `api.openai.com`
- 當您需要明確的層級而非共用的 `/fast` 開關時，請使用 `params.serviceTier`
- 隱藏的 OpenClaw 歸因標頭 (`originator`, `version`,
  `User-Agent`) 僅適用於傳送至 `api.openai.com` 的原生 OpenAI 流量，不適用於
  通用 OpenAI 相容代理伺服器
- 原生 OpenAI 路由也會保留 Responses `store`、提示詞快取提示，以及
  OpenAI 推理相容負載塑形；代理路由則不會
- `openai/gpt-5.3-codex-spark` 在 OpenClaw 中被刻意隱藏，因為實時 OpenAI API 會拒絕它；Spark 被視為僅限 Codex 使用

```json5
{
  agents: { defaults: { model: { primary: "openai/gpt-5.4" } } },
}
```

### Anthropic

- 提供者： `anthropic`
- 認證： `ANTHROPIC_API_KEY`
- 選用輪替： `ANTHROPIC_API_KEYS`, `ANTHROPIC_API_KEY_1`, `ANTHROPIC_API_KEY_2`，加上 `OPENCLAW_LIVE_ANTHROPIC_KEY` (單一覆寫)
- 範例模型： `anthropic/claude-opus-4-6`
- CLI： `openclaw onboard --auth-choice apiKey`
- 直接的公開 Anthropic 請求支援共享的 `/fast` 切換開關和 `params.fastMode`，包括傳送至 `api.anthropic.com` 的 API 金鑰和 OAuth 認證流量；OpenClaw 會將其對應至 Anthropic `service_tier` (`auto` vs `standard_only`)
- Anthropic 註記：Anthropic 人員告訴我們，OpenClaw 風格的 Claude CLI 使用再次被允許，因此除非 Anthropic 發布新政策，否則 OpenClaw 將 Claude CLI 重用和 `claude -p` 使用視為此整合的許可行為。
- Anthropic setup-token 仍作為支援的 OpenClaw 權杖路徑提供，但若有可用，OpenClaw 現在傾向於使用 Claude CLI 重用和 `claude -p`。

```json5
{
  agents: { defaults: { model: { primary: "anthropic/claude-opus-4-6" } } },
}
```

### OpenAI Code (Codex)

- 提供者： `openai-codex`
- 認證： OAuth (ChatGPT)
- 範例模型： `openai-codex/gpt-5.4`
- CLI： `openclaw onboard --auth-choice openai-codex` 或 `openclaw models auth login --provider openai-codex`
- 預設傳輸為 `auto` (優先使用 WebSocket，SSE 為後備)
- 透過 `agents.defaults.models["openai-codex/<model>"].params.transport` 依模型覆寫 (`"sse"`, `"websocket"`, 或 `"auto"`)
- `params.serviceTier` 也會在原生 Codex Responses 請求（`chatgpt.com/backend-api`）上被轉發
- 隱藏的 OpenClaw 歸因標頭（`originator`、`version`、
  `User-Agent`）僅附加於到 `chatgpt.com/backend-api` 的原生 Codex 流量，
  而非通用的 OpenAI 相容代理
- 與直接 `openai/*` 共用相同的 `/fast` 切換開關和 `params.fastMode` 配置；OpenClaw 將其對應至 `service_tier=priority`
- 當 Codex OAuth 目錄公開 `openai-codex/gpt-5.3-codex-spark` 時，其仍保持可用；取決於權利
- `openai-codex/gpt-5.4` 保留原生 `contextWindow = 1050000` 和預設執行時間 `contextTokens = 272000`；使用 `models.providers.openai-codex.models[].contextTokens` 覆蓋執行時間上限
- 策略說明：明確支援 OpenAI Codex OAuth 用於外部工具/工作流程，如 OpenClaw。

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

- [Qwen Cloud](/zh-Hant/providers/qwen)：Qwen Cloud 提供者介面加上 Alibaba DashScope 和 Coding Plan 端點對應
- [MiniMax](/zh-Hant/providers/minimax)：MiniMax Coding Plan OAuth 或 API 金鑰存取
- [GLM Models](/zh-Hant/providers/glm)：Z.AI Coding Plan 或一般 API 端點

### OpenCode

- Auth：`OPENCODE_API_KEY`（或 `OPENCODE_ZEN_API_KEY`）
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
- Auth：`GEMINI_API_KEY`
- 可選輪替：`GEMINI_API_KEYS`、`GEMINI_API_KEY_1`、`GEMINI_API_KEY_2`、`GOOGLE_API_KEY` 備援，以及 `OPENCLAW_LIVE_GEMINI_KEY`（單一覆蓋）
- 範例模型：`google/gemini-3.1-pro-preview`、`google/gemini-3-flash-preview`
- 相容性：使用 `google/gemini-3.1-flash-preview` 的舊版 OpenClaw 配置會被正規化為 `google/gemini-3-flash-preview`
- CLI：`openclaw onboard --auth-choice gemini-api-key`
- 直接執行 Gemini 也接受 `agents.defaults.models["google/<model>"].params.cachedContent`
  （或舊版 `cached_content`）來轉送提供者原生的
  `cachedContents/...` 控制代碼；Gemini 快取命中會顯示為 OpenClaw `cacheRead`

### Google Vertex 和 Gemini CLI

- 提供者：`google-vertex`、`google-gemini-cli`
- 驗證：Vertex 使用 gcloud ADC；Gemini CLI 使用其 OAuth 流程
- 注意：OpenClaw 中的 Gemini CLI OAuth 是非官方整合。部分使用者回報在使用第三方客戶端後其 Google 帳號受到限制。請審閱 Google 條款，若您選擇繼續操作，請使用非關鍵帳號。
- Gemini CLI OAuth 隨附於內建的 `google` 外掛程式中。
  - 請先安裝 Gemini CLI：
    - `brew install gemini-cli`
    - 或 `npm install -g @google/gemini-cli`
  - 啟用：`openclaw plugins enable google`
  - 登入：`openclaw models auth login --provider google-gemini-cli --set-default`
  - 預設模型：`google-gemini-cli/gemini-3-flash-preview`
  - 注意：您**不**應將用戶端 ID 或金鑰貼入 `openclaw.json`。CLI 登入流程會將
    權杖儲存在閘道主機上的驗證設定檔中。
  - 如果登入後請求失敗，請在閘道主機上設定 `GOOGLE_CLOUD_PROJECT` 或 `GOOGLE_CLOUD_PROJECT_ID`。
  - Gemini CLI JSON 回覆是從 `response` 解析而來；使用量會退回到
    `stats`，並將 `stats.cached` 正規化為 OpenClaw `cacheRead`。

### Z.AI (GLM)

- 提供者：`zai`
- 驗證：`ZAI_API_KEY`
- 範例模型：`zai/glm-5.1`
- CLI：`openclaw onboard --auth-choice zai-api-key`
  - 別名：`z.ai/*` 和 `z-ai/*` 會正規化為 `zai/*`
  - `zai-api-key` 會自動偵測相符的 Z.AI 端點；`zai-coding-global`、`zai-coding-cn`、`zai-global` 和 `zai-cn` 會強制使用特定介面

### Vercel AI Gateway

- 供應商：`vercel-ai-gateway`
- 驗證：`AI_GATEWAY_API_KEY`
- 範例模型：`vercel-ai-gateway/anthropic/claude-opus-4.6`,
  `vercel-ai-gateway/moonshotai/kimi-k2.6`
- CLI：`openclaw onboard --auth-choice ai-gateway-api-key`

### Kilo Gateway

- 供應商：`kilocode`
- 驗證：`KILOCODE_API_KEY`
- 範例模型：`kilocode/kilo/auto`
- CLI：`openclaw onboard --auth-choice kilocode-api-key`
- 基礎 URL：`https://api.kilo.ai/api/gateway/`
- 靜態回退目錄包含 `kilocode/kilo/auto`；即時
  `https://api.kilo.ai/api/gateway/models` 探索可以進一步擴展執行時
  目錄。
- `kilocode/kilo/auto` 背後的精確上游路由由 Kilo Gateway 管理，
  而非在 OpenClaw 中硬編碼。

設定細節請參閱 [/providers/kilocode](/zh-Hant/providers/kilocode)。

### 其他捆綁的供應商插件

- OpenRouter：`openrouter` (`OPENROUTER_API_KEY`)
- 範例模型：`openrouter/auto`, `openrouter/moonshotai/kimi-k2.6`
- OpenClaw 僅在請求實際針對 `openrouter.ai` 時，才會套用 OpenRouter 記錄的應用程式歸屬標頭
- OpenRouter 專屬的 Anthropic `cache_control` 標記同樣限制於
  已驗證的 OpenRouter 路由，而非任意的代理 URL
- OpenRouter 維持在代理樣式的 OpenAI 相容路徑上，因此原生的
  僅限 OpenAI 的請求整形 (`serviceTier`, Responses `store`,
  prompt-cache hints, OpenAI reasoning-compat payloads) 不會被轉發
- 支援 Gemini 的 OpenRouter 參照僅保留代理 Gemini 的思維簽章清理；
  原生 Gemini 重播驗證和引導重寫則保持關閉
- Kilo Gateway：`kilocode` (`KILOCODE_API_KEY`)
- 範例模型：`kilocode/kilo/auto`
- 支援 Gemini 的 Kilo 參照保持相同的代理 Gemini 思維簽章
  清理路徑；`kilocode/kilo/auto` 和其他不支援代理推理的
  提示會跳過代理推理注入
- MiniMax：`minimax` (API 金鑰) 和 `minimax-portal` (OAuth)
- 驗證：`MINIMAX_API_KEY` 用於 `minimax`；`MINIMAX_OAUTH_TOKEN` 或 `MINIMAX_API_KEY` 用於 `minimax-portal`
- 範例模型：`minimax/MiniMax-M2.7` 或 `minimax-portal/MiniMax-M2.7`
- MiniMax 入門/API 金鑰設定會使用 `input: ["text", "image"]` 寫入明確的 M2.7 模型定義；
  捆綁的提供者目錄會保留聊天參考為純文字，直到該提供者設定被具體化為止
- Moonshot：`moonshot` (`MOONSHOT_API_KEY`)
- 範例模型：`moonshot/kimi-k2.6`
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
- 示例模型：`volcengine-plan/ark-code-latest`
- BytePlus：`byteplus` (`BYTEPLUS_API_KEY`)
- 示例模型：`byteplus-plan/ark-code-latest`
- xAI：`xai` (`XAI_API_KEY`)
  - 原生內建的 xAI 請求使用 xAI Responses 路徑
  - `/fast` 或 `params.fastMode: true` 會將 `grok-3`、`grok-3-mini`、
    `grok-4` 和 `grok-4-0709` 重寫為其 `*-fast` 變體
  - `tool_stream` 預設為開啟；將
    `agents.defaults.models["xai/<model>"].params.tool_stream` 設為 `false` 即可
    停用
- Mistral：`mistral` (`MISTRAL_API_KEY`)
- 示例模型：`mistral/mistral-large-latest`
- CLI：`openclaw onboard --auth-choice mistral-api-key`
- Groq：`groq` (`GROQ_API_KEY`)
- Cerebras：`cerebras` (`CEREBRAS_API_KEY`)
  - Cerebras 上的 GLM 模型使用 ID `zai-glm-4.7` 和 `zai-glm-4.6`。
  - OpenAI 相容的基礎 URL：`https://api.cerebras.ai/v1`。
- GitHub Copilot：`github-copilot` (`COPILOT_GITHUB_TOKEN` / `GH_TOKEN` / `GITHUB_TOKEN`)
- Hugging Face Inference 示例模型：`huggingface/deepseek-ai/DeepSeek-R1`；CLI：`openclaw onboard --auth-choice huggingface-api-key`。請參閱 [Hugging Face (Inference)](/zh-Hant/providers/huggingface)。

## 透過 `models.providers` 的提供者 (自訂/基礎 URL)

使用 `models.providers` (或 `models.json`) 來新增**自訂**提供者或
OpenAI/Anthropic 相容的代理伺服器。

下列許多內建的提供者外掛程式已經發布了預設目錄。
僅當您想要覆寫預設基礎 URL、標頭或模型清單時，才使用明確的 `models.providers.<id>` 項目。

### Moonshot AI (Kimi)

Moonshot 作為內建的提供者外掛程式發布。預設使用內建提供者，並且僅當您
需要覆寫基礎 URL 或模型元資料時，才新增明確的 `models.providers.moonshot` 項目：

- 提供商：`moonshot`
- 身份驗證：`MOONSHOT_API_KEY`
- 範例模型：`moonshot/kimi-k2.6`
- CLI：`openclaw onboard --auth-choice moonshot-api-key` 或 `openclaw onboard --auth-choice moonshot-api-key-cn`

Kimi K2 模型 ID：

[//]: # "moonshot-kimi-k2-model-refs:start"

- `moonshot/kimi-k2.6`
- `moonshot/kimi-k2.5`
- `moonshot/kimi-k2-thinking`
- `moonshot/kimi-k2-thinking-turbo`
- `moonshot/kimi-k2-turbo`

[//]: # "moonshot-kimi-k2-model-refs:end"

```json5
{
  agents: {
    defaults: { model: { primary: "moonshot/kimi-k2.6" } },
  },
  models: {
    mode: "merge",
    providers: {
      moonshot: {
        baseUrl: "https://api.moonshot.ai/v1",
        apiKey: "${MOONSHOT_API_KEY}",
        api: "openai-completions",
        models: [{ id: "kimi-k2.6", name: "Kimi K2.6" }],
      },
    },
  },
}
```

### Kimi 程式設計

Kimi 程式設計使用 Moonshot AI 的 Anthropic 相容端點：

- 提供商：`kimi`
- 身份驗證：`KIMI_API_KEY`
- 範例模型：`kimi/kimi-code`

```json5
{
  env: { KIMI_API_KEY: "sk-..." },
  agents: {
    defaults: { model: { primary: "kimi/kimi-code" } },
  },
}
```

舊版 `kimi/k2p5` 作為相容模型 ID 仍被接受。

### 火山引擎 (Doubao)

火山引擎 提供對豆包 和中國其他模型的存取。

- 提供商：`volcengine` (程式設計：`volcengine-plan`)
- 身份驗證：`VOLCANO_ENGINE_API_KEY`
- 範例模型：`volcengine-plan/ark-code-latest`
- CLI：`openclaw onboard --auth-choice volcengine-api-key`

```json5
{
  agents: {
    defaults: { model: { primary: "volcengine-plan/ark-code-latest" } },
  },
}
```

入門預設為程式設計介面，但同時也會註冊一般 `volcengine/*`
目錄。

在入門/設定模型選擇器中，Volcengine 身份驗證選擇會優先顯示
`volcengine/*` 和 `volcengine-plan/*` 列。如果這些模型尚未載入，
OpenClaw 會退回到未經篩選的目錄，而不是顯示空的
提供者範圍選擇器。

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

BytePlus ARK 為國際用戶提供與火山引擎相同的模型存取權限。

- 提供商：`byteplus` (程式設計：`byteplus-plan`)
- 身份驗證：`BYTEPLUS_API_KEY`
- 範例模型：`byteplus-plan/ark-code-latest`
- CLI：`openclaw onboard --auth-choice byteplus-api-key`

```json5
{
  agents: {
    defaults: { model: { primary: "byteplus-plan/ark-code-latest" } },
  },
}
```

入門設定預設為程式編寫介面，但通用 `byteplus/*`
目錄也會同時註冊。

在入門/配置模型選擇器中，BytePlus 身份驗證選項會優先顯示
`byteplus/*` 和 `byteplus-plan/*` 列。如果這些模型尚未載入，
OpenClaw 會退回至未經過濾的目錄，而不是顯示空的
供應商範圍選擇器。

可用模型：

- `byteplus/seed-1-8-251228` (Seed 1.8)
- `byteplus/kimi-k2-5-260127` (Kimi K2.5)
- `byteplus/glm-4-7-251222` (GLM 4.7)

程式編寫模型 (`byteplus-plan`)：

- `byteplus-plan/ark-code-latest`
- `byteplus-plan/doubao-seed-code`
- `byteplus-plan/kimi-k2.5`
- `byteplus-plan/kimi-k2-thinking`
- `byteplus-plan/glm-4.7`

### Synthetic

Synthetic 在 `synthetic` 供應商後端提供相容 Anthropic 的模型：

- 供應商：`synthetic`
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

MiniMax 透過 `models.providers` 進行配置，因為它使用自訂端點：

- MiniMax OAuth (全球)：`--auth-choice minimax-global-oauth`
- MiniMax OAuth (中國)：`--auth-choice minimax-cn-oauth`
- MiniMax API 金鑰 (全球)：`--auth-choice minimax-global-api`
- MiniMax API 金鑰 (中國)：`--auth-choice minimax-cn-api`
- 驗證：`minimax` 使用 `MINIMAX_API_KEY`；`minimax-portal` 使用
  `MINIMAX_OAUTH_TOKEN` 或 `MINIMAX_API_KEY`

請參閱 [/providers/minimax](/zh-Hant/providers/minimax) 以了解設定詳細資訊、模型選項和設定片段。

在 MiniMax 相容 Anthropic 的串流路徑上，除非您明確設定，否則 OpenClaw 預設會停用思考功能，並且 `/fast on` 會將
`MiniMax-M2.7` 重寫為 `MiniMax-M2.7-highspeed`。

外掛擁有的功能分割：

- 文字/聊天預設值保持在 `minimax/MiniMax-M2.7`
- 圖像生成為 `minimax/image-01` 或 `minimax-portal/image-01`
- 圖片理解在兩種 MiniMax 驗證路徑上均為外掛擁有的 `MiniMax-VL-01`
- 網路搜尋保留在供應商 ID `minimax` 上

### LM Studio

LM Studio 作為內建的供應商外掛程式隨附，使用原生 API：

- 供應商：`lmstudio`
- 驗證：`LM_API_TOKEN`
- 預設推斷基礎 URL：`http://localhost:1234/v1`

然後設定一個模型（替換為 `http://localhost:1234/api/v1/models` 傳回的其中一個 ID）：

```json5
{
  agents: {
    defaults: { model: { primary: "lmstudio/openai/gpt-oss-20b" } },
  },
}
```

OpenClaw 使用 LM Studio 的原生 `/api/v1/models` 和 `/api/v1/models/load`
進行探索 + 自動載入，預設使用 `/v1/chat/completions` 進行推斷。
請參閱 [/providers/lmstudio](/zh-Hant/providers/lmstudio) 以取得設定和疑難排解資訊。

### Ollama

Ollama 作為內建的供應商外掛程式隨附，並使用 Ollama 的原生 API：

- 供應商：`ollama`
- 驗證：無需驗證（本機伺服器）
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

當您使用 `OLLAMA_API_KEY` 選擇加入時，會在 `http://127.0.0.1:11434` 本機偵測到 Ollama，
且內建的供應商外掛程式會將 Ollama 直接新增到
`openclaw onboard` 和模型選擇器中。請參閱 [/providers/ollama](/zh-Hant/providers/ollama)
以瞭解上線、雲端/本機模式和自訂設定。

### vLLM

vLLM 作為內建的供應商外掛程式隨附，適用於本機/自我託管的 OpenAI 相容
伺服器：

- 供應商：`vllm`
- 驗證：選用（取決於您的伺服器）
- 預設基礎 URL：`http://127.0.0.1:8000/v1`

若要在本機選擇加入自動探索（如果您的伺服器未強制執行驗證，則任何值皆可）：

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

詳情請參閱 [/providers/vllm](/zh-Hant/providers/vllm)。

### SGLang

SGLang 作為內建的供應商外掛程式隨附，適用於快速自我託管的
OpenAI 相容伺服器：

- 供應商：`sglang`
- 驗證：選用（取決於您的伺服器）
- 預設基礎 URL：`http://127.0.0.1:30000/v1`

若要在本機選擇加入自動探索（如果您的伺服器未
強制執行驗證，則任何值皆可）：

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

詳情請參閱 [/providers/sglang](/zh-Hant/providers/sglang)。

### 本機代理（LM Studio、vLLM、LiteLLM 等）

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

備註：

- 對於自訂供應商，`reasoning`、`input`、`cost`、`contextWindow` 和 `maxTokens` 是可選的。
  當省略時，OpenClaw 預設為：
  - `reasoning: false`
  - `input: ["text"]`
  - `cost: { input: 0, output: 0, cacheRead: 0, cacheWrite: 0 }`
  - `contextWindow: 200000`
  - `maxTokens: 8192`
- 建議：設定與您的代理/模型限制相符的明確值。
- 對於非原生端點上的 `api: "openai-completions"`（任何主機不是 `api.openai.com` 的非空 `baseUrl`），OpenClaw 會強制 `compat.supportsDeveloperRole: false`，以避免因不支援的 `developer` 角色而導致供應商回傳 400 錯誤。
- 代理式 OpenAI 相容路由也會跳過僅限原生 OpenAI 的請求
  整形：無 `service_tier`、無 Responses `store`、無提示快取提示、無
  OpenAI 推理相容負載整形，且無隱藏的 OpenClaw 歸因
  標頭。
- 如果 `baseUrl` 為空或省略，OpenClaw 將保留預設的 OpenAI 行為（其解析為 `api.openai.com`）。
- 為安全起見，非原生 `openai-completions` 端點上的明確 `compat.supportsDeveloperRole: true` 仍會被覆寫。

## CLI 範例

```bash
openclaw onboard --auth-choice opencode-zen
openclaw models set opencode/claude-opus-4-6
openclaw models list
```

另請參閱：[/gateway/configuration](/zh-Hant/gateway/configuration) 以取得完整設定範例。

## 相關

- [模型](/zh-Hant/concepts/models) — 模型設定與別名
- [模型故障轉移](/zh-Hant/concepts/model-failover) — 故障轉移鏈與重試行為
- [設定參考](/zh-Hant/gateway/configuration-reference#agent-defaults) — 模型設定鍵
- [供應商](/zh-Hant/providers) — 各供應商設定指南
