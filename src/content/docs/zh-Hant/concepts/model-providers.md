---
summary: "模型供應商概覽，包含範例配置 + CLI 流程"
read_when:
  - You need a provider-by-provider model setup reference
  - You want example configs or CLI onboarding commands for model providers
title: "模型供應商"
---

# 模型提供者

此頁面涵蓋 **LLM/模型提供者**（而非 WhatsApp/Telegram 等聊天頻道）。
關於模型選擇規則，請參閱 [/concepts/models](/zh-Hant/concepts/models)。

## 快速規則

- 模型參照使用 `provider/model`（例如：`opencode/claude-opus-4-6`）。
- 如果您設定 `agents.defaults.models`，它將成為允許清單。
- CLI 輔助工具：`openclaw onboard`、`openclaw models list`、`openclaw models set <provider/model>`。
- 後備執行時規則、冷卻探測和工作階段覆寫持久性已記載於
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
  `supportsAdaptiveThinking`、`supportsMaxThinking`、
  `resolveDefaultThinkingLevel`、`applyConfigDefaults`、`isModernModelRef`、
  `prepareRuntimeAuth`、`resolveUsageAuth`、`fetchUsageSnapshot` 和
  `onModelSelected` 來擁有提供者執行時行為。
- 注意：提供者執行時 `capabilities` 是共用的執行器中繼資料（提供者
  系列、文字記錄/工具特性、傳輸/快取提示）。它與[公開能力模型](/zh-Hant/plugins/architecture#public-capability-model)
  並不相同，後者描述外掛程式註冊的內容（文字推論、語音等）。
- 隨附的 `codex` 提供者與隨附的 Codex agent harness 配對。
  當您需要 Codex 管理的登入、模型探索、原生
  thread resume 以及應用程式伺服器執行時，請使用 `codex/gpt-*`。純 `openai/gpt-*` 引用會繼續
  使用 OpenAI 提供者與正常的 OpenClaw 提供者傳輸。
  僅使用 Codex 的部署可以透過
  `agents.defaults.embeddedHarness.fallback: "none"` 停用自動 PI 後援；請參閱
  [Codex Harness](/zh-Hant/plugins/codex-harness)。

## 外掛擁有的提供者行為

提供者外掛現在可以擁有大部分特定於提供者的邏輯，而 OpenClaw 則保留通用推理循環。

典型分工：

- `auth[].run` / `auth[].runNonInteractive`：提供者擁有 `openclaw onboard`、`openclaw models auth` 和無頭設定 的入門/登入
  流程
- `wizard.setup` / `wizard.modelPicker`：提供者擁有授權選擇標籤、
  舊版別名、入門允許清單提示，以及入門/模型選擇器中的設定項目
- `catalog`：提供者會出現在 `models.providers` 中
- `normalizeModelId`：提供者會在查詢
  或正規化之前正規化舊版/預覽模型 ID
- `normalizeTransport`：提供者會在通用模型組裝之前
  正規化傳輸系列 `api` / `baseUrl`；
  OpenClaw 會先檢查相符的提供者，
  然後檢查其他支援掛鉤的提供者外掛，直到其中一個實際變更了
  傳輸
- `normalizeConfig`：提供者會在執行階段使用之前
  正規化 `models.providers.<id>` 設定；
  OpenClaw 會先檢查相符的提供者，然後檢查其他
  支援掛鉤的提供者外掛，直到其中一個實際變更了設定。如果沒有
  提供者掛鉤重寫設定，隨附的 Google 系列協助程式仍然
  會正規化支援的 Google 提供者項目。
- `applyNativeStreamingUsageCompat`：提供者會針對設定提供者套用端點驅動的原生串流使用相容性重寫
- `resolveConfigApiKey`：提供者會解析設定提供者的環境標記授權，
  而無需強制載入完整的執行階段授權。`amazon-bedrock` 在此處也有一個
  內建的 AWS 環境標記解析器，即使 Bedrock 執行階段授權使用
  AWS SDK 預設鏈。
- `resolveSyntheticAuth`：提供者可以暴露本機/自託管或其他基於配置的身份驗證可用性，而無需持久化明文祕密
- `shouldDeferSyntheticProfileAuth`：提供者可以將儲存的合成設定檔佔位符標記為比環境變數/配置支援的身份驗證優先順序更低
- `resolveDynamicModel`：提供者接受本地靜態目錄中尚未存在的模型 ID
- `prepareDynamicModel`：提供者在重試動態解析之前需要元資料重新整理
- `normalizeResolvedModel`：提供者需要傳輸或基本 URL 重寫
- `contributeResolvedModelCompat`：即使廠商模型通過其他相容傳輸到達，提供者仍會為其提供相容性標誌
- `capabilities`：提供者發佈對話紀錄/工具/提供者系列的怪癖
- `normalizeToolSchemas`：提供者在嵌入式執行器看到工具架構之前會對其進行清理
- `inspectToolSchemas`：提供者在標準化之後顯示傳輸特定的架構警告
- `resolveReasoningOutputMode`：提供者選擇原生與標記的推理輸出合約
- `prepareExtraParams`：提供者設定預設值或標準化每個模型的請求參數
- `createStreamFn`：提供者使用完全自訂的傳輸替換正常的串流路徑
- `wrapStreamFn`：提供者套用請求標頭/請求主體/模型相容性封裝器
- `resolveTransportTurnState`：提供者提供每輪次的原生傳輸標頭或元資料
- `resolveWebSocketSessionPolicy`：提供者提供原生 WebSocket 會話標頭或會話冷卻策略
- `createEmbeddingProvider`：當記憶體嵌入行為屬於提供者外掛而不是核心嵌入交換機時，提供者擁有該行為
- `formatApiKey`：提供者將儲存的身份驗證設定檔格式化為傳輸所需的執行時期 `apiKey` 字串
- `refreshOAuth`：當共享的 `pi-ai` 重新整理器不足時，提供者擁有 OAuth 重新整理功能
- `buildAuthDoctorHint`：當 OAuth 重新整理失敗時，提供者會附加修復指導
- `matchesContextOverflowError`：提供者識別特定於提供者的上下文視窗溢出錯誤，這是通用啟發式方法會錯過的
- `classifyFailoverReason`：提供者將特定於提供者的原始傳輸/API 錯誤對映到故障轉移原因，例如速率限制或過載
- `isCacheTtlEligible`：提供者決定哪些上游模型 ID 支援 prompt-cache TTL
- `buildMissingAuthMessage`：提供者將通用認證儲存錯誤替換為特定於提供者的恢復提示
- `suppressBuiltInModel`：提供者隱藏陳舊的上游行，並可針對直接解析失敗返回供應商擁有的錯誤
- `augmentModelCatalog`：提供者在發現和配置合併之後附加合成/最終目錄行
- `isBinaryThinking`：提供者擁有二元開關式思考 UX
- `supportsXHighThinking`：提供者將選定的模型選入 `xhigh`
- `supportsAdaptiveThinking`：提供者將選定的模型選入 `adaptive`
- `supportsMaxThinking`：提供者將選定的模型選入 `max`
- `resolveDefaultThinkingLevel`：提供者擁有模型系列的預設 `/think` 政策
- `applyConfigDefaults`：提供者在配置具體化期間，根據認證模式、環境或模型系列套用特定於提供者的全域預設值
- `isModernModelRef`：提供者擁有即時/冒煙首選模型匹配
- `prepareRuntimeAuth`：提供者將設定的憑證轉換為短期執行時權杖
- `resolveUsageAuth`：提供者解析 `/usage` 的使用量/配額憑證以及相關的狀態/報告介面
- `fetchUsageSnapshot`：提供者擁有使用量端點的擷取/解析，而核心仍擁有摘要外殼和格式化
- `onModelSelected`：提供者執行選擇後的副作用，例如遙測或提供者擁有的會話簿記

目前捆綁的範例：

- `anthropic`：Claude 4.6 向後相容回退、驗證修復提示、使用端點獲取、快取 TTL/供應商系列元資料，以及感知驗證的全域組態預設值
- `amazon-bedrock`：供應商擁有的內容溢出比對，針對 Bedrock 特定的限流/未就緒錯誤進行故障轉移原因分類，加上共用 `anthropic-by-model` 重播系列，用於 Anthropic 流量上僅限 Claude 的重播原則防護
- `anthropic-vertex`：針對 Anthropic-message 流量實施僅限 Claude 的重播原則防護
- `openrouter`：傳遞模型 ID、請求包裝器、供應商能力提示、Proxy Gemini 流量上的 Gemini 思維特徵清理、透過 `openrouter-thinking` 資料流系列進行的 Proxy 推理注入、路由元資料轉發，以及快取 TTL 原則
- `github-copilot`：入門/裝置登入、向後相容模型回退、Claude 思維逐字稿提示、執行時權杖交換，以及使用端點獲取
- `openai`：GPT-5.4 向後相容回退、直接 OpenAI 傳輸正規化、感知 Codex 的缺少驗證提示、Spark 抑制、合成 OpenAI/Codex 目錄列、思考/即時模型原則、使用權杖別名正規化 (`input` / `output` 和 `prompt` / `completion` 系列)、原生 OpenAI/Codex 包裝器共用的 `openai-responses-defaults` 資料流系列、供應商系列元資料、`gpt-image-1` 的綑綁圖像生成供應商註冊，以及 `sora-2` 的綑綁影片生成供應商註冊
- `google` 和 `google-gemini-cli`：Gemini 3.1 向前相容性後備、
  原生 Gemini 重播驗證、啟動重播清理、標記
  推理輸出模式、現代模型匹配、針對 Gemini 圖片預覽模型
  的綑綁圖片生成供應商註冊，以及針對 Veo 模型
  的綑綁影片生成供應商註冊；Gemini CLI OAuth 同時
  處理 auth-profile token 格式化、usage-token 解析，以及
  針對使用量介面的配額端點取得
- `moonshot`：共享傳輸、外掛擁有的思考 payload 正規化
- `kilocode`：共享傳輸、外掛擁有的請求標頭、推理 payload
  正規化、代理 Gemini 思考簽章清理，以及快取 TTL
  政策
- `zai`：GLM-5 向前相容性後備、`tool_stream` 預設值、快取 TTL
  政策、二元思考/即時模型政策，以及使用量驗證 + 配額取得；
  未知的 `glm-5*` id 會從綑綁的 `glm-4.7` 樣板合成
- `xai`：原生 Responses 傳輸正規化、針對 Grok 快速變體
  的 `/fast` 別名重寫、預設 `tool_stream`、
  xAI 特定的工具結構描述 /推理 payload 清理，
  以及針對 `grok-imagine-video` 的綑綁影片生成供應商註冊
- `mistral`：外掛擁有的功能中繼資料
- `opencode` 和 `opencode-go`：外掛擁有的功能中繼資料，加上
  代理 Gemini 思考簽章清理
- `alibaba`：外掛擁有的影片生成目錄，用於直接的 Wan 模型參考，
  例如 `alibaba/wan2.6-t2v`
- `byteplus`：外掛擁有的目錄，加上針對 Seedance
  文字轉影片/圖片轉影片模型的綑綁影片生成供應商註冊
- `fal`：針對託管第三方圖片生成供應商註冊的綑綁影片生成
  供應商註冊（用於 FLUX 圖片模型），加上針對託管
  第三方影片模型的綑綁影片生成供應商註冊
- `cloudflare-ai-gateway`、`huggingface`、`kimi`、`nvidia`、`qianfan`、
  `stepfun`、`synthetic`、`venice`、`vercel-ai-gateway` 和 `volcengine`：
  僅限外掛擁有的目錄
- `qwen`：文字模型的外掛擁有目錄，加上針對其多模態介面的共享
  媒體理解與影片生成供應商註冊；Qwen 影片生成使用標準 DashScope 影片
  端點，搭配捆綁的 Wan 模型，例如 `wan2.6-t2v` 和 `wan2.7-r2v`
- `runway`：針對原生 Runway 基於任務的模型（例如 `gen4.5`）的外掛擁有影片生成供應商註冊
- `minimax`：外掛擁有目錄、針對 Hailuo 影片模型的捆綁影片生成供應商
  註冊、針對 `image-01` 的捆綁圖片生成供應商
  註冊、混合 Anthropic/OpenAI 重播策略選擇，以及使用授權/快照邏輯
- `together`：外掛擁有目錄，加上針對 Wan 影片模型的捆綁影片生成供應商註冊
- `xiaomi`：外掛擁有目錄加上使用授權/快照邏輯

隨附的 `openai` 外掛現在擁有這兩個供應商 ID：`openai` 和
`openai-codex`。

這涵蓋了仍符合 OpenClaw 正常傳輸機制的供應商。若供應商
需要完全自訂的請求執行器，則屬於一個獨立、更深入的擴充
介面。

## API 金鑰輪換

- 支援所選供應商的通用供應商輪換。
- 透過以下方式設定多個金鑰：
  - `OPENCLAW_LIVE_<PROVIDER>_KEY` (單一即時覆寫，最高優先級)
  - `<PROVIDER>_API_KEYS` (逗號或分號清單)
  - `<PROVIDER>_API_KEY` (主金鑰)
  - `<PROVIDER>_API_KEY_*` (編號清單，例如 `<PROVIDER>_API_KEY_1`)
- 對於 Google 供應商，`GOOGLE_API_KEY` 也包含作為備援。
- 金鑰選擇順序保留優先順序並對數值進行去重。
- 僅在速率限制回應時才使用下一個金鑰重試請求（例如
  `429`、`rate_limit`、`quota`、`resource exhausted`、`Too many
concurrent requests`, `ThrottlingException`, `concurrency limit reached`、
  `workers_ai ... quota limit exceeded` 或定期使用限制訊息）。
- 非速率限制失敗會立即失敗；不會嘗試金鑰輪替。
- 當所有候選金鑰都失敗時，會返回最後一次嘗試的最終錯誤。

## 內建供應商 (pi-ai catalog)

OpenClaw 隨附 pi‑ai catalog。這些供應商**不**
需要 `models.providers` 設定；只需設定驗證並選擇模型。

### OpenAI

- 供應商：`openai`
- 驗證：`OPENAI_API_KEY`
- 可選輪替：`OPENAI_API_KEYS`、`OPENAI_API_KEY_1`、`OPENAI_API_KEY_2`，以及 `OPENCLAW_LIVE_OPENAI_KEY`（單一覆寫）
- 範例模型：`openai/gpt-5.4`、`openai/gpt-5.4-pro`
- CLI：`openclaw onboard --auth-choice openai-api-key`
- 預設傳輸為 `auto`（優先使用 WebSocket，SSE 為後備）
- 透過 `agents.defaults.models["openai/<model>"].params.transport` 針對每個模型進行覆寫（`"sse"`、`"websocket"` 或 `"auto"`）
- OpenAI Responses WebSocket 預熱預設透過 `params.openaiWsWarmup` 啟用（`true`/`false`）
- 可以透過 `agents.defaults.models["openai/<model>"].params.serviceTier` 啟用 OpenAI 優先處理
- `/fast` 和 `params.fastMode` 會將直接 `openai/*` Responses 要求對應到 `service_tier=priority` 於 `api.openai.com` 上
- 當您想要明確的層級而非共用的 `/fast` 切換開關時，請使用 `params.serviceTier`
- 隱藏的 OpenClaw 歸因標頭 (`originator`, `version`,
  `User-Agent`) 僅適用於 `api.openai.com` 的原生 OpenAI 流量，不適用於
  通用 OpenAI 相容代理
- 原生 OpenAI 路由也會保留 Responses `store`、提示快取提示 以及
  OpenAI 推理相容負載塑形；代理路由則不會
- `openai/gpt-5.3-codex-spark` 在 OpenClaw 中被刻意隱藏，因為即時 OpenAI API 會拒絕它；Spark 被視為僅限 Codex

```json5
{
  agents: { defaults: { model: { primary: "openai/gpt-5.4" } } },
}
```

### Anthropic

- 提供商：`anthropic`
- 驗證：`ANTHROPIC_API_KEY`
- 選用輪換：`ANTHROPIC_API_KEYS`、`ANTHROPIC_API_KEY_1`、`ANTHROPIC_API_KEY_2`，以及 `OPENCLAW_LIVE_ANTHROPIC_KEY` (單次覆寫)
- 範例模型：`anthropic/claude-opus-4-6`
- CLI：`openclaw onboard --auth-choice apiKey`
- 直接公開的 Anthropic 請求支援共享的 `/fast` 切換開關和 `params.fastMode`，包括傳送到 `api.anthropic.com` 的 API 金鑰和 OAuth 驗證流量；OpenClaw 將其對應到 Anthropic `service_tier` (`auto` vs `standard_only`)
- Anthropic 註記：Anthropic 人員告訴我們，OpenClaw 風格的 Claude CLI 使用再次被允許，因此除非 Anthropic 發布新政策，OpenClaw 將 Claude CLI 重複使用和 `claude -p` 使用視為此整合的許可行為。
- Anthropic setup-token 仍可作為支援的 OpenClaw token 路徑使用，但 OpenClaw 現在在可用時偏好使用 Claude CLI 重複使用和 `claude -p`。

```json5
{
  agents: { defaults: { model: { primary: "anthropic/claude-opus-4-6" } } },
}
```

### OpenAI Code (Codex)

- 提供商：`openai-codex`
- 驗證：OAuth (ChatGPT)
- 範例模型：`openai-codex/gpt-5.4`
- CLI：`openclaw onboard --auth-choice openai-codex` 或 `openclaw models auth login --provider openai-codex`
- 預設傳輸為 `auto` (優先使用 WebSocket，SSE 為後備)
- 透過 `agents.defaults.models["openai-codex/<model>"].params.transport` 針對每個模型進行覆寫 (`"sse"`、`"websocket"` 或 `"auto"`)
- `params.serviceTier` 也會在原生 Codex Responses 請求（`chatgpt.com/backend-api`）中轉發
- 隱藏的 OpenClaw 歸因標頭（`originator`、`version`、
  `User-Agent`）僅附加於傳送到
  `chatgpt.com/backend-api` 的原生 Codex 流量，不適用於通用 OpenAI 相容代理
- 與直接 `openai/*` 共用相同的 `/fast` 切換開關和 `params.fastMode` 配置；OpenClaw 會將其對應到 `service_tier=priority`
- 當 Codex OAuth 目錄公開 `openai-codex/gpt-5.3-codex-spark` 時，該模型仍可使用；取決於權利
- `openai-codex/gpt-5.4` 保留原生 `contextWindow = 1050000` 和預設執行時間 `contextTokens = 272000`；使用 `models.providers.openai-codex.models[].contextTokens` 覆寫執行時間上限
- 政策說明：明確支援將 OpenAI Codex OAuth 用於 OpenClaw 等外部工具/工作流程。

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

- 驗證：`OPENCODE_API_KEY`（或 `OPENCODE_ZEN_API_KEY`）
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
- 可選輪替：`GEMINI_API_KEYS`、`GEMINI_API_KEY_1`、`GEMINI_API_KEY_2`、`GOOGLE_API_KEY` 備援，以及 `OPENCLAW_LIVE_GEMINI_KEY`（單次覆寫）
- 範例模型：`google/gemini-3.1-pro-preview`、`google/gemini-3-flash-preview`
- 相容性：使用 `google/gemini-3.1-flash-preview` 的舊版 OpenClaw 配置會被正規化為 `google/gemini-3-flash-preview`
- CLI：`openclaw onboard --auth-choice gemini-api-key`
- 直接的 Gemini 執行也接受 `agents.defaults.models["google/<model>"].params.cachedContent`（或舊版 `cached_content`）來轉發原生供應商的 `cachedContents/...` handle；Gemini 快取命中會顯示為 OpenClaw `cacheRead`

### Google Vertex 和 Gemini CLI

- 供應商：`google-vertex`、`google-gemini-cli`
- 驗證：Vertex 使用 gcloud ADC；Gemini CLI 使用其 OAuth 流程
- 注意：OpenClaw 中的 Gemini CLI OAuth 是非官方整合。部分使用者回報在使用第三方客戶端後遭遇 Google 帳號限制。請詳閱 Google 條款，若選擇繼續請使用非關鍵帳號。
- Gemini CLI OAuth 隨附於捆綁的 `google` 外掛中。
  - 請先安裝 Gemini CLI：
    - `brew install gemini-cli`
    - 或 `npm install -g @google/gemini-cli`
  - 啟用：`openclaw plugins enable google`
  - 登入：`openclaw models auth login --provider google-gemini-cli --set-default`
  - 預設模型：`google-gemini-cli/gemini-3-flash-preview`
  - 注意：您**不**需要將客戶端 ID 或金鑰貼到 `openclaw.json` 中。CLI 登入流程會將 token 儲存在閘道主機的驗證設定檔中。
  - 如果登入後請求失敗，請在閘道主機上設定 `GOOGLE_CLOUD_PROJECT` 或 `GOOGLE_CLOUD_PROJECT_ID`。
  - Gemini CLI JSON 回覆是從 `response` 解析的；使用量會回退到 `stats`，並將 `stats.cached` 正規化為 OpenClaw `cacheRead`。

### Z.AI (GLM)

- 供應商：`zai`
- 驗證：`ZAI_API_KEY`
- 範例模型：`zai/glm-5.1`
- CLI：`openclaw onboard --auth-choice zai-api-key`
  - 別名：`z.ai/*` 和 `z-ai/*` 會正規化為 `zai/*`
  - `zai-api-key` 會自動偵測對應的 Z.AI 端點；`zai-coding-global`、`zai-coding-cn`、`zai-global` 和 `zai-cn` 則會強制使用特定的 surface

### Vercel AI Gateway

- Provider: `vercel-ai-gateway`
- Auth: `AI_GATEWAY_API_KEY`
- Example model: `vercel-ai-gateway/anthropic/claude-opus-4.6`
- CLI: `openclaw onboard --auth-choice ai-gateway-api-key`

### Kilo Gateway

- Provider: `kilocode`
- Auth: `KILOCODE_API_KEY`
- Example model: `kilocode/kilo/auto`
- CLI: `openclaw onboard --auth-choice kilocode-api-key`
- Base URL: `https://api.kilo.ai/api/gateway/`
- Static fallback catalog ships `kilocode/kilo/auto`; live
  `https://api.kilo.ai/api/gateway/models` discovery can expand the runtime
  catalog further.
- Exact upstream routing behind `kilocode/kilo/auto` is owned by Kilo Gateway,
  not hard-coded in OpenClaw.

See [/providers/kilocode](/zh-Hant/providers/kilocode) for setup details.

### Other bundled provider plugins

- OpenRouter: `openrouter` (`OPENROUTER_API_KEY`)
- Example model: `openrouter/auto`
- OpenClaw applies OpenRouter's documented app-attribution headers only when
  the request actually targets `openrouter.ai`
- OpenRouter-specific Anthropic `cache_control` markers are likewise gated to
  verified OpenRouter routes, not arbitrary proxy URLs
- OpenRouter remains on the proxy-style OpenAI-compatible path, so native
  OpenAI-only request shaping (`serviceTier`, Responses `store`,
  prompt-cache hints, OpenAI reasoning-compat payloads) is not forwarded
- Gemini-backed OpenRouter refs keep proxy-Gemini thought-signature sanitation
  only; native Gemini replay validation and bootstrap rewrites stay off
- Kilo Gateway: `kilocode` (`KILOCODE_API_KEY`)
- Example model: `kilocode/kilo/auto`
- Gemini-backed Kilo refs keep the same proxy-Gemini thought-signature
  sanitation path; `kilocode/kilo/auto` and other proxy-reasoning-unsupported
  hints skip proxy reasoning injection
- MiniMax: `minimax` (API key) and `minimax-portal` (OAuth)
- Auth: `MINIMAX_API_KEY` for `minimax`; `MINIMAX_OAUTH_TOKEN` or `MINIMAX_API_KEY` for `minimax-portal`
- 模型範例：`minimax/MiniMax-M2.7` 或 `minimax-portal/MiniMax-M2.7`
- MiniMax 上手/API 金鑰設定會使用 `input: ["text", "image"]` 寫入明確的 M2.7 模型定義；隨附的提供商目錄會讓聊天參照維持純文字，直到該提供商設定被實例化
- Moonshot：`moonshot` (`MOONSHOT_API_KEY`)
- 模型範例：`moonshot/kimi-k2.6`
- Kimi Coding：`kimi` (`KIMI_API_KEY` 或 `KIMICODE_API_KEY`)
- 模型範例：`kimi/kimi-code`
- Qianfan：`qianfan` (`QIANFAN_API_KEY`)
- 模型範例：`qianfan/deepseek-v3.2`
- Qwen Cloud：`qwen` (`QWEN_API_KEY`、`MODELSTUDIO_API_KEY` 或 `DASHSCOPE_API_KEY`)
- 模型範例：`qwen/qwen3.5-plus`
- NVIDIA：`nvidia` (`NVIDIA_API_KEY`)
- 模型範例：`nvidia/nvidia/llama-3.1-nemotron-70b-instruct`
- StepFun：`stepfun` / `stepfun-plan` (`STEPFUN_API_KEY`)
- 模型範例：`stepfun/step-3.5-flash`、`stepfun-plan/step-3.5-flash-2603`
- Together：`together` (`TOGETHER_API_KEY`)
- 模型範例：`together/moonshotai/Kimi-K2.5`
- Venice：`venice` (`VENICE_API_KEY`)
- Xiaomi：`xiaomi` (`XIAOMI_API_KEY`)
- 模型範例：`xiaomi/mimo-v2-flash`
- Vercel AI Gateway：`vercel-ai-gateway` (`AI_GATEWAY_API_KEY`)
- Hugging Face Inference：`huggingface` (`HUGGINGFACE_HUB_TOKEN` 或 `HF_TOKEN`)
- Cloudflare AI Gateway：`cloudflare-ai-gateway` (`CLOUDFLARE_AI_GATEWAY_API_KEY`)
- Volcengine：`volcengine` (`VOLCANO_ENGINE_API_KEY`)
- 模型範例：`volcengine-plan/ark-code-latest`
- BytePlus：`byteplus` (`BYTEPLUS_API_KEY`)
- 模型範例：`byteplus-plan/ark-code-latest`
- xAI：`xai`（`XAI_API_KEY`）
  - 原生打包的 xAI 請求使用 xAI Responses 路徑
  - `/fast` 或 `params.fastMode: true` 將 `grok-3`、`grok-3-mini`、
    `grok-4` 和 `grok-4-0709` 重寫為其 `*-fast` 變體
  - `tool_stream` 預設開啟；設定
    `agents.defaults.models["xai/<model>"].params.tool_stream` 為 `false` 以
    停用它
- Mistral：`mistral`（`MISTRAL_API_KEY`）
- 範例模型：`mistral/mistral-large-latest`
- CLI：`openclaw onboard --auth-choice mistral-api-key`
- Groq：`groq`（`GROQ_API_KEY`）
- Cerebras：`cerebras`（`CEREBRAS_API_KEY`）
  - Cerebras 上的 GLM 模型使用 ID `zai-glm-4.7` 和 `zai-glm-4.6`。
  - OpenAI 相容基礎 URL：`https://api.cerebras.ai/v1`。
- GitHub Copilot：`github-copilot`（`COPILOT_GITHUB_TOKEN` / `GH_TOKEN` / `GITHUB_TOKEN`）
- Hugging Face Inference 範例模型：`huggingface/deepseek-ai/DeepSeek-R1`；CLI：`openclaw onboard --auth-choice huggingface-api-key`。參閱 [Hugging Face (Inference)](/zh-Hant/providers/huggingface)。

## 透過 `models.providers` 的提供者（自訂/基礎 URL）

使用 `models.providers`（或 `models.json`）新增 **自訂** 提供者或
OpenAI/Anthropic 相容的 Proxy。

以下許多打包的提供者外掛已經發布了預設目錄。
僅當您想要覆寫預設基礎 URL、標頭或模型列表時，才使用顯式 `models.providers.<id>` 項目。

### Moonshot AI (Kimi)

Moonshot 作為打包的提供者外掛隨附。預設情況下使用內建提供者，僅當您
需要覆寫基礎 URL 或模型元資料時，才新增顯式 `models.providers.moonshot` 項目：

- 提供者：`moonshot`
- 驗證：`MOONSHOT_API_KEY`
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

舊版 `kimi/k2p5` 作為相容模型 ID 仍然被接受。

### 火山引擎 (豆包)

火山引擎 提供對中國境內豆包及其他模型的存取。

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

入站 預設為編碼介面，但通用 `volcengine/*`
目錄會同時註冊。

在入站/配置模型選擇器中，Volcengine 驗證選項優先顯示
`volcengine/*` 和 `volcengine-plan/*` 列。如果這些模型尚未載入，
OpenClaw 將回退到未篩選的目錄，而不是顯示空的
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

### BytePlus (國際)

BytePlus ARK 為國際使用者提供與火山引擎相同的模型存取權限。

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

入站 預設為編碼介面，但通用 `byteplus/*`
目錄會同時註冊。

在入門/配置模型選擇器時，BytePlus 身份驗證選項會優先顯示
`byteplus/*` 和 `byteplus-plan/*` 列。如果這些模型尚未載入，
OpenClaw 將退回到未過濾的目錄，而不是顯示空的
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

Synthetic 在 `synthetic` 提供者後面提供與 Anthropic 相容的模型：

- 提供者： `synthetic`
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

由於 MiniMax 使用自訂端點，因此透過 `models.providers` 進行配置：

- MiniMax OAuth (全球)： `--auth-choice minimax-global-oauth`
- MiniMax OAuth (中國)： `--auth-choice minimax-cn-oauth`
- MiniMax API 金鑰 (全球)： `--auth-choice minimax-global-api`
- MiniMax API 金鑰 (中國)： `--auth-choice minimax-cn-api`
- 驗證： `MINIMAX_API_KEY` 用於 `minimax`；`MINIMAX_OAUTH_TOKEN` 或
  `MINIMAX_API_KEY` 用於 `minimax-portal`

有關設定詳細資訊、模型選項和配置片段，請參閱 [/providers/minimax](/zh-Hant/providers/minimax)。

在 MiniMax 的 Anthropic 相容串流路徑上，除非您明確設定，否則 OpenClaw 預設會停用思考功能，且 `/fast on` 會將
`MiniMax-M2.7` 重寫為 `MiniMax-M2.7-highspeed`。

外掛程式擁有的功能拆分：

- 文字/聊天預設值保留在 `minimax/MiniMax-M2.7`
- 影像生成是 `minimax/image-01` 或 `minimax-portal/image-01`
- 影像理解在兩條 MiniMax 驗證路徑上均由外掛程式擁有 `MiniMax-VL-01`
- 網路搜尋保留在提供者 id `minimax`

### LM Studio

LM Studio 作為內建的提供者插件隨附，使用原生 API：

- 提供者：`lmstudio`
- 驗證：`LM_API_TOKEN`
- 預設推論基礎 URL：`http://localhost:1234/v1`

然後設定模型（替換為 `http://localhost:1234/api/v1/models` 回傳的其中一個 ID）：

```json5
{
  agents: {
    defaults: { model: { primary: "lmstudio/openai/gpt-oss-20b" } },
  },
}
```

OpenClaw 使用 LM Studio 的原生 `/api/v1/models` 和 `/api/v1/models/load`
進行探索 + 自動載入，並預設使用 `/v1/chat/completions` 進行推論。
請參閱 [/providers/lmstudio](/zh-Hant/providers/lmstudio) 以進行設定和疑難排解。

### Ollama

Ollama 作為內建的提供者插件隨附，並使用 Ollama 的原生 API：

- 提供者：`ollama`
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

當您使用
`OLLAMA_API_KEY` 加入時，系統會在 `http://127.0.0.1:11434` 本機偵測到 Ollama，而內建的提供者插件會直接將 Ollama 新增至
`openclaw onboard` 和模型選擇器。請參閱 [/providers/ollama](/zh-Hant/providers/ollama)
以了解上手指南、雲端/本機模式和自訂設定。

### vLLM

vLLM 作為內建的提供者插件隨附，適用於本機/託管的 OpenAI 相容
伺服器：

- 提供者：`vllm`
- 驗證：選用（視您的伺服器而定）
- 預設基礎 URL：`http://127.0.0.1:8000/v1`

若要加入本機自動探索（如果您的伺服器不強制執行驗證，則任何值皆可）：

```bash
export VLLM_API_KEY="vllm-local"
```

然後設定模型（替換為 `/v1/models` 回傳的其中一個 ID）：

```json5
{
  agents: {
    defaults: { model: { primary: "vllm/your-model-id" } },
  },
}
```

詳情請參閱 [/providers/vllm](/zh-Hant/providers/vllm)。

### SGLang

SGLang 作為內建的提供者插件隨附，適用於快速託管的
OpenAI 相容伺服器：

- 提供者：`sglang`
- 驗證：選用（視您的伺服器而定）
- 預設基礎 URL：`http://127.0.0.1:30000/v1`

若要加入本機自動探索（如果您的伺服器不
強制執行驗證，則任何值皆可）：

```bash
export SGLANG_API_KEY="sglang-local"
```

然後設定模型（替換為 `/v1/models` 回傳的其中一個 ID）：

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

注意事項：

- 對於自訂供應商，`reasoning`、`input`、`cost`、`contextWindow` 和 `maxTokens` 為選填項目。
  若省略，OpenClaw 將預設為：
  - `reasoning: false`
  - `input: ["text"]`
  - `cost: { input: 0, output: 0, cacheRead: 0, cacheWrite: 0 }`
  - `contextWindow: 200000`
  - `maxTokens: 8192`
- 建議：設定與您的代理/模型限制相符的明確值。
- 對於非原生端點上的 `api: "openai-completions"`（任何主機非 `api.openai.com` 的非空 `baseUrl`），OpenClaw 會強制設定 `compat.supportsDeveloperRole: false`，以避免因不支援的 `developer` 角色而導致供應商回傳 400 錯誤。
- 代理樣式的 OpenAI 相容路由也會略過原生的 OpenAI 專屬請求
  調整：無 `service_tier`、無 Responses `store`、無提示快取提示、無
  OpenAI 推理相容負載調整，且無隱藏的 OpenClaw 歸屬
  標頭。
- 如果 `baseUrl` 為空或省略，OpenClaw 將保持預設的 OpenAI 行為（即解析為 `api.openai.com`）。
- 為確保安全，在非原生的 `openai-completions` 端點上，仍會覆寫明確指定的 `compat.supportsDeveloperRole: true`。

## CLI 範例

```bash
openclaw onboard --auth-choice opencode-zen
openclaw models set opencode/claude-opus-4-6
openclaw models list
```

另請參閱：[/gateway/configuration](/zh-Hant/gateway/configuration) 以取得完整的設定範例。

## 相關

- [模型](/zh-Hant/concepts/models) — 模型設定與別名
- [模型容錯移轉](/zh-Hant/concepts/model-failover) — 容錯移轉鏈與重試行為
- [設定參考](/zh-Hant/gateway/configuration-reference#agent-defaults) — 模型設定金鑰
- [供應商](/zh-Hant/providers) — 各供應商設定指南
