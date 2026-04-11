---
summary: "模型供應商概述及範例設定 + CLI 流程"
read_when:
  - You need a provider-by-provider model setup reference
  - You want example configs or CLI onboarding commands for model providers
title: "模型供應商"
---

# 模型提供者

本頁涵蓋 **LLM/模型供應商**（而非 WhatsApp/Telegram 等聊天頻道）。
關於模型選擇規則，請參閱 [/concepts/models](/en/concepts/models)。

## 快速規則

- 模型參考使用 `provider/model`（範例：`opencode/claude-opus-4-6`）。
- 如果您設定 `agents.defaults.models`，它將成為白名單。
- CLI 輔助工具：`openclaw onboard`、`openclaw models list`、`openclaw models set <provider/model>`。
- Fallback 執行時期規則、冷卻探測和會話覆寫持久化記錄於 [/concepts/model-failover](/en/concepts/model-failover)。
- `models.providers.*.models[].contextWindow` 是原生模型中繼資料；
  `models.providers.*.models[].contextTokens` 是有效的執行時期上限。
- 供應商外掛程式可以透過 `registerProvider({ catalog })` 注入模型目錄；
  OpenClaw 會在寫入 `models.json` 之前將該輸出合併到 `models.providers` 中。
- 供應商清單可以宣告 `providerAuthEnvVars`，因此一般的環境變數驗證
  探針不需要載入外掛程式執行時期。剩餘的核心環境變數對應現在僅用於非外掛/核心供應商，以及少數通用優先順序的
  案例，例如 Anthropic API-key-first 入站。
- Provider plugins can also own provider runtime behavior via
  `normalizeModelId`, `normalizeTransport`, `normalizeConfig`,
  `applyNativeStreamingUsageCompat`, `resolveConfigApiKey`,
  `resolveSyntheticAuth`, `shouldDeferSyntheticProfileAuth`,
  `resolveDynamicModel`, `prepareDynamicModel`,
  `normalizeResolvedModel`, `contributeResolvedModelCompat`,
  `capabilities`, `normalizeToolSchemas`,
  `inspectToolSchemas`, `resolveReasoningOutputMode`,
  `prepareExtraParams`, `createStreamFn`, `wrapStreamFn`,
  `resolveTransportTurnState`, `resolveWebSocketSessionPolicy`,
  `createEmbeddingProvider`, `formatApiKey`, `refreshOAuth`,
  `buildAuthDoctorHint`,
  `matchesContextOverflowError`, `classifyFailoverReason`,
  `isCacheTtlEligible`, `buildMissingAuthMessage`, `suppressBuiltInModel`,
  `augmentModelCatalog`, `isBinaryThinking`, `supportsXHighThinking`,
  `resolveDefaultThinkingLevel`, `applyConfigDefaults`, `isModernModelRef`,
  `prepareRuntimeAuth`, `resolveUsageAuth`, `fetchUsageSnapshot`, and
  `onModelSelected`.
- 注意：供應商執行時期 `capabilities` 是共享的 runner 元數據（供應商系列、記錄/工具特性、傳輸/快取提示）。它與 [公共功能模型](/en/plugins/architecture#public-capability-model) 不同，後者描述插件註冊的內容（文字推論、語音等）。

## Plugin-owned provider behavior

Provider plugins can now own most provider-specific logic while OpenClaw keeps
the generic inference loop.

Typical split:

- `auth[].run` / `auth[].runNonInteractive`: provider owns onboarding/login
  flows for `openclaw onboard`, `openclaw models auth`, and headless setup
- `wizard.setup` / `wizard.modelPicker`: 提供者擁有認證選擇標籤、
  舊版別名、入門允許清單提示，以及入門/模型選擇器中的設定項目
- `catalog`: 提供者會出現在 `models.providers` 中
- `normalizeModelId`: 提供者在查詢或正規化之前
  會正規化舊版/預覽模型 ID
- `normalizeTransport`: 提供者在通用模型組裝之前
  會正規化傳輸系列 `api` / `baseUrl`；
  OpenClaw 會先檢查匹配的提供者，然後檢查其他支援掛鉤的提供者外掛程式，
  直到其中一個實際變更了傳輸
- `normalizeConfig`: 提供者在執行時段使用設定之前
  會正規化 `models.providers.<id>` 設定；OpenClaw 會先檢查匹配的提供者，
  然後檢查其他支援掛鉤的提供者外掛程式，直到其中一個實際變更了設定。
  如果沒有提供者掛鉤重寫該設定，隨附的 Google 系列輔助程式仍然會
  正規化支援的 Google 提供者項目。
- `applyNativeStreamingUsageCompat`: 提供者對設定提供者套用以端點為驅動的原生串流使用相容性重寫
- `resolveConfigApiKey`: 提供者解析設定提供者的環境標記認證，
  而無需強制載入完整的執行時段認證。`amazon-bedrock` 此處也有
  內建的 AWS 環境標記解析器，即使 Bedrock 執行時段認證使用
  AWS SDK 預設鏈。
- `resolveSyntheticAuth`: 提供者可以公開本機/自託管或其他
  由設定支援的認證可用性，而無需持久化純文字祕密
- `shouldDeferSyntheticProfileAuth`: 提供者可以將儲存的合成設定檔
  預留位置標記為低於 env/config-backed 認證的優先順序
- `resolveDynamicModel`: 提供者接受本地靜態目錄中
  尚不存在的模型 ID
- `prepareDynamicModel`: 提供者在重試動態解析之前
  需要重新整理元數據
- `normalizeResolvedModel`: 提供者需要傳輸或基礎 URL 重寫
- `contributeResolvedModelCompat`: 即使供應商模型透過其他相容傳輸到達，
  提供者仍會為其供應商模型提供相容性旗標
- `capabilities`：提供者發布文字記錄/工具/提供者系列特性
- `normalizeToolSchemas`：提供者在嵌入式執行器看到之前清理工具架構
- `inspectToolSchemas`：提供者在正規化後提示傳輸特定的架構警告
- `resolveReasoningOutputMode`：提供者選擇原生與標記推理輸出合約
- `prepareExtraParams`：提供者設定預設值或正規化各模型的請求參數
- `createStreamFn`：提供者以完全自訂的傳輸取代正常的串流路徑
- `wrapStreamFn`：提供者套用請求標頭/主體/模型相容性包裝器
- `resolveTransportTurnState`：提供者提供各輪次原生傳輸標頭或中繼資料
- `resolveWebSocketSessionPolicy`：提供者提供原生 WebSocket 會話標頭或會話冷卻策略
- `createEmbeddingProvider`：提供者負責記憶體嵌入行為，當其屬於提供者外掛程式而非核心嵌入交換板時
- `formatApiKey`：提供者將儲存的認證設定檔格式化為傳輸所需的執行階段 `apiKey` 字串
- `refreshOAuth`：當共享的 `pi-ai` 更新器不足時，提供者負責 OAuth 更新
- `buildAuthDoctorHint`：當 OAuth 更新失敗時，提供者附加修復指引
- `matchesContextOverflowError`：提供者可識別通用啟發法錯過的提供者特定內容視窗溢位錯誤
- `classifyFailoverReason`：提供者將提供者特定的原始傳輸/API 錯誤對應至速率限制或過載等容錯移轉原因
- `isCacheTtlEligible`：提供者決定哪些上游模型 ID 支援提示快取 TTL
- `buildMissingAuthMessage`：提供者以提供者特定的復原提示取代通用認證儲存錯誤
- `suppressBuiltInModel`：提供者隱藏陳舊的上游資料列，並可針對直接解析失敗傳回供應商擁有的錯誤
- `augmentModelCatalog`：提供者在探索與設定合併後附加合成/最終目錄資料列
- `isBinaryThinking`: 提供者擁有二元開/關思考 UX
- `supportsXHighThinking`: 提供者將選定的模型加入 `xhigh`
- `resolveDefaultThinkingLevel`: 提供者擁有模型系列的預設
  `/think` 政策
- `applyConfigDefaults`: 提供者在設定具體化期間，根據驗證模式、環境或
  模型系列套用提供者特定的全域預設值
- `isModernModelRef`: 提供者擁有即時/冒煙首選模型匹配
- `prepareRuntimeAuth`: 提供者將設定的憑證轉換為短期
  運行時權杖
- `resolveUsageAuth`: 提供者為 `/usage`
  解析使用量/配額憑證以及相關狀態/報告介面
- `fetchUsageSnapshot`: 提供者擁有使用量端點的擷取/解析，
  而核心仍然擁有摘要外殼和格式設定
- `onModelSelected`: 提供者執行選擇後的副作用，例如遙測
  或提供者擁有的會計簿記

目前的內建範例：

- `anthropic`: Claude 4.6 向前相容後備、驗證修復提示、使用量
  端點擷取、快取 TTL/提供者系列元數據，以及感知驗證的
  全域設定預設值
- `amazon-bedrock`: 提供者擁有的上下文溢出匹配和失效轉移
  原因分類，針對 Bedrock 特定的節流/未就緒錯誤，加上
  共享的 `anthropic-by-model` 重播系列，用於 Anthropic 流量上
  僅限 Claude 的重播策略防護
- `anthropic-vertex`: Anthropic 訊息流量上僅限 Claude 的重播策略防護
- `openrouter`: 透通模型 ID、請求包裝器、提供者能力提示、
  代理 Gemini 流量上的 Gemini 思考簽章清理、透過 `openrouter-thinking` 串流
  系列注入代理推理、路由元數據轉發，以及快取 TTL 策略
- `github-copilot`: 上線/裝置登入、向前相容模型後備、
  Claude 思考逐字稿提示、運行時權杖交換以及使用量端點
  擷取
- `openai`：GPT-5.4 向前相容後援、直接 OpenAI 傳輸正規化、感知 Codex 的遺失驗證提示、Spark 抑制、合成 OpenAI/Codex 目錄列、思考/即時模型原則、用量 Token 別名正規化（`input` / `output` 和 `prompt` / `completion` 系列）、原生 OpenAI/Codex 包裝器的共用 `openai-responses-defaults` 串流系列、供應商系列中繼資料、用於 `gpt-image-1` 的捆綁圖像生成供應商註冊，以及用於 `sora-2` 的捆綁影片生成供應商註冊
- `google` 和 `google-gemini-cli`：Gemini 3.1 向前相容 Fallback、
  原生 Gemini 重播驗證、引導重播清理、標記
  推理輸出模式、現代模型匹配、針對 Gemini 影像預覽模型的
  內建影像生成供應商註冊，以及針對 Veo 模型的
  內建視訊生成供應商註冊；Gemini CLI OAuth 也負責
  使用量介面的 auth-profile token 格式化、使用量 token 解析和
  配額端點獲取
- `moonshot`：共享傳輸、插件擁有的思考 payload 正規化
- `kilocode`：共享傳輸、插件擁有的請求標頭、推理 payload
  正規化、代理 Gemini 思考簽章清理，以及快取 TTL
  政策
- `zai`：GLM-5 向前相容 Fallback、`tool_stream` 預設值、快取 TTL
  政策、二元思考/即時模型政策，以及使用量驗證 + 配額獲取；
  未知的 `glm-5*` id 從內建的 `glm-4.7` 模板合成
- `xai`：原生 Responses 傳輸正規化、Grok 快速變體的 `/fast` 別名重寫、
  預設 `tool_stream`、xAI 特定的工具結構描述 /
  推理 payload 清理，以及針對 `grok-imagine-video` 的
  內建視訊生成供應商註冊
- `mistral`：插件擁有的功能元數據
- `opencode` 和 `opencode-go`：外掛程式擁有的功能元資料加上
  proxy-Gemini 思維簽章清理
- `alibaba`：外掛程式擁有的視訊生成目錄，用於直接參照 Wan 模型
  例如 `alibaba/wan2.6-t2v`
- `byteplus`：外掛程式擁有的目錄加上捆綁的視訊生成提供者
  註冊，用於 Seedance 文字轉視訊/圖片轉視訊模型
- `fal`：針對託管第三方影像生成提供者的捆綁視訊生成提供者註冊，用於 FLUX 影像模型，加上針對託管第三方視訊模型的捆綁視訊生成提供者註冊
- `cloudflare-ai-gateway`、`huggingface`、`kimi`、`nvidia`、`qianfan`、
  `stepfun`、`synthetic`、`venice`、`vercel-ai-gateway` 和 `volcengine`：
  僅限外掛程式擁有的目錄
- `qwen`：外掛程式擁有的文字模型目錄，加上共用
  的媒體理解和視訊生成提供者註冊，用於其
  多模態介面；Qwen 視訊生成使用標準 DashScope 視訊
  端點，並搭配捆綁的 Wan 模型，例如 `wan2.6-t2v` 和 `wan2.7-r2v`
- `runway`：外掛程式擁有的視訊生成提供者註冊，用於原生
  Runway 基於任務的模型，例如 `gen4.5`
- `minimax`：外掛程式擁有的目錄、針對 Hailuo 視訊模型的捆綁視訊生成提供者
  註冊、針對 `image-01` 的捆綁影像生成提供者
  註冊、混合 Anthropic/OpenAI 重播策略
  選擇，以及使用授權/快照邏輯
- `together`：外掛程式擁有的目錄加上針對 Wan 視訊模型的捆綁視訊生成提供者
  註冊
- `xiaomi`：外掛程式擁有的目錄加上使用授權/快照邏輯

隨附的 `openai` 外掛現在擁有這兩個供應商 ID：`openai` 和
`openai-codex`。

這涵蓋了仍符合 OpenClaw 正常傳輸方式的提供者。需要完全自訂請求執行器的提供者屬於另一個更深層的擴充介面。

## API 金鑰輪替

- 支援針對所選提供者的通用提供者輪替。
- 透過以下方式設定多個金鑰：
  - `OPENCLAW_LIVE_<PROVIDER>_KEY` (單一即時覆寫，最高優先級)
  - `<PROVIDER>_API_KEYS` (逗號或分號清單)
  - `<PROVIDER>_API_KEY` (主金鑰)
  - `<PROVIDER>_API_KEY_*` (編號清單，例如 `<PROVIDER>_API_KEY_1`)
- 對於 Google 供應商，`GOOGLE_API_KEY` 也會作為備選包含在內。
- 金鑰選擇順序會保留優先順序並對數值進行去重。
- 請求僅在速率限制回應時才會使用下一個金鑰重試 (例如
  `429`、`rate_limit`、`quota`、`resource exhausted`、`Too many
concurrent requests`, `ThrottlingException`, `concurrency limit reached`、
  `workers_ai ... quota limit exceeded`，或週期性使用限制訊息)。
- 非速率限制的失敗會立即回報錯誤；不會嘗試金鑰輪替。
- 當所有候選金鑰都失敗時，會傳回最後一次嘗試的最終錯誤。

## 內建提供者 (pi-ai 目錄)

OpenClaw 隨附 pi‑ai 目錄。這些供應商**不需要**
`models.providers` 設定；只需設定驗證並選擇模型。

### OpenAI

- 供應商：`openai`
- 驗證：`OPENAI_API_KEY`
- 選用輪替：`OPENAI_API_KEYS`、`OPENAI_API_KEY_1`、`OPENAI_API_KEY_2`，以及 `OPENCLAW_LIVE_OPENAI_KEY` (單一覆寫)
- 範例模型：`openai/gpt-5.4`、`openai/gpt-5.4-pro`
- CLI：`openclaw onboard --auth-choice openai-api-key`
- 預設傳輸方式為 `auto` (WebSocket 優先，SSE 備選)
- 透過 `agents.defaults.models["openai/<model>"].params.transport` 針對每個模型進行覆寫 (`"sse"`、`"websocket"` 或 `"auto"`)
- OpenAI Responses WebSocket 預熱預設透過 `params.openaiWsWarmup` 啟用 (`true`/`false`)
- OpenAI 優先處理可以透過 `agents.defaults.models["openai/<model>"].params.serviceTier` 啟用
- `/fast` 和 `params.fastMode` 將直接的 `openai/*` Responses 要求對應到 `api.openai.com` 上的 `service_tier=priority`
- 當您想要明確的層級而不是共用的 `/fast` 開關時，請使用 `params.serviceTier`
- 隱藏的 OpenClaw 歸因標頭（`originator`、`version`、
  `User-Agent`）僅適用於傳送至 `api.openai.com` 的原生 OpenAI 流量，不適用於
  通用的 OpenAI 相容代理
- 原生 OpenAI 路由也會保留 Responses `store`、prompt-cache 提示，以及
  OpenAI reasoning-compat 載荷塑形；代理路由則不會
- `openai/gpt-5.3-codex-spark` 在 OpenClaw 中被故意隱藏，因為即時 OpenAI API 會拒絕它；Spark 被視為僅限 Codex 使用

```json5
{
  agents: { defaults: { model: { primary: "openai/gpt-5.4" } } },
}
```

### Anthropic

- 提供者：`anthropic`
- 認證：`ANTHROPIC_API_KEY`
- 選用輪替：`ANTHROPIC_API_KEYS`、`ANTHROPIC_API_KEY_1`、`ANTHROPIC_API_KEY_2`，以及 `OPENCLAW_LIVE_ANTHROPIC_KEY`（單次覆蓋）
- 範例模型：`anthropic/claude-opus-4-6`
- CLI：`openclaw onboard --auth-choice apiKey`
- 直接的公開 Anthropic 請求支援共用的 `/fast` 開關和 `params.fastMode`，包括傳送至 `api.anthropic.com` 的 API 金鑰和 OAuth 認證流量；OpenClaw 將其對應至 Anthropic `service_tier`（`auto` 對比 `standard_only`）
- Anthropic 說明：Anthropic 人員告訴我們，OpenClaw 風格的 Claude CLI 使用再次被允許，因此除非 Anthropic 發布新政策，否則 OpenClaw 將 Claude CLI 重複使用和 `claude -p` 使用視為此整合的核准用法。
- Anthropic setup-token 仍可作為支援的 OpenClaw token 路徑使用，但 OpenClaw 現在優先使用 Claude CLI 重複使用和 `claude -p`（如果有的話）。

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
- 預設傳輸為 `auto`（WebSocket 優先，SSE 備援）
- 透過 `agents.defaults.models["openai-codex/<model>"].params.transport` 逐模型覆寫 (`"sse"`、`"websocket"` 或 `"auto"`)
- `params.serviceTier` 也會在原生 Codex Responses 請求上轉發 (`chatgpt.com/backend-api`)
- 隱藏的 OpenClaw 歸因標頭 (`originator`、`version`、
  `User-Agent`) 僅附加於至 `chatgpt.com/backend-api` 的原生 Codex 流量，
  而非通用 OpenAI 相容代理
- 共用與直接 `openai/*` 相同的 `/fast` 切換開關與 `params.fastMode` 設定；OpenClaw 會將其對應至 `service_tier=priority`
- 當 Codex OAuth catalog 揭露 `openai-codex/gpt-5.3-codex-spark` 時，其持續可用；視權利而定
- `openai-codex/gpt-5.4` 保留原生 `contextWindow = 1050000` 與預設執行時期 `contextTokens = 272000`；使用 `models.providers.openai-codex.models[].contextTokens` 覆寫執行時期上限
- 政策說明：OpenAI Codex OAuth 明確支援外部工具/工作流程，如 OpenClaw。

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

- [Qwen Cloud](/en/providers/qwen)：Qwen Cloud 提供者介面，加上 Alibaba DashScope 與 Coding Plan 端點對應
- [MiniMax](/en/providers/minimax)：MiniMax Coding Plan OAuth 或 API 金鑰存取
- [GLM Models](/en/providers/glm)：Z.AI Coding Plan 或一般 API 端點

### OpenCode

- 驗證：`OPENCODE_API_KEY` (或 `OPENCODE_ZEN_API_KEY`)
- Zen 執行時期提供者：`opencode`
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
- 選用輪替：`GEMINI_API_KEYS`、`GEMINI_API_KEY_1`、`GEMINI_API_KEY_2`、`GOOGLE_API_KEY` 備援，以及 `OPENCLAW_LIVE_GEMINI_KEY` (單一覆寫)
- 範例模型：`google/gemini-3.1-pro-preview`、`google/gemini-3-flash-preview`
- 相容性：使用 `google/gemini-3.1-flash-preview` 的舊版 OpenClaw 設定會被正規化為 `google/gemini-3-flash-preview`
- CLI：`openclaw onboard --auth-choice gemini-api-key`
- 直接 Gemini 執行也接受 `agents.defaults.models["google/<model>"].params.cachedContent`
  （或舊版 `cached_content`）來轉發提供者原生的
  `cachedContents/...` 處理程式；Gemini 快取命中會顯示為 OpenClaw `cacheRead`

### Google Vertex 和 Gemini CLI

- 提供者：`google-vertex`、`google-gemini-cli`
- 驗證：Vertex 使用 gcloud ADC；Gemini CLI 使用其 OAuth 流程
- 注意：OpenClaw 中的 Gemini CLI OAuth 是非官方整合。部分使用者回報在使用第三方客戶端後 Google 帳號受到限制。請詳閱 Google 條款，若您選擇繼續，請使用非關鍵帳號。
- Gemini CLI OAuth 隨附於內建的 `google` 外掛中。
  - 請先安裝 Gemini CLI：
    - `brew install gemini-cli`
    - 或 `npm install -g @google/gemini-cli`
  - 啟用：`openclaw plugins enable google`
  - 登入：`openclaw models auth login --provider google-gemini-cli --set-default`
  - 預設模型：`google-gemini-cli/gemini-3-flash-preview`
  - 注意：請**勿**將用戶端 ID 或密碼貼入 `openclaw.json`。CLI 登入流程會將
    權杖儲存在閘道主機的驗證設定檔中。
  - 若登入後請求失敗，請在閘道主機上設定 `GOOGLE_CLOUD_PROJECT` 或 `GOOGLE_CLOUD_PROJECT_ID`。
  - Gemini CLI JSON 回覆從 `response` 解析；使用量會退回至
    `stats`，其中 `stats.cached` 會正規化為 OpenClaw `cacheRead`。

### Z.AI (GLM)

- 提供者：`zai`
- 驗證：`ZAI_API_KEY`
- 範例模型：`zai/glm-5.1`
- CLI：`openclaw onboard --auth-choice zai-api-key`
  - 別名：`z.ai/*` 和 `z-ai/*` 會正規化為 `zai/*`
  - `zai-api-key` 會自動偵測相符的 Z.AI 端點；`zai-coding-global`、`zai-coding-cn`、`zai-global` 和 `zai-cn` 則會強制指定特定介面

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
- 靜態備用目錄包含 `kilocode/kilo/auto`；動態
  `https://api.kilo.ai/api/gateway/models` 探索可以進一步擴充執行時
  目錄。
- `kilocode/kilo/auto` 後方的精確上游路由由 Kilo Gateway 掌控，
  並非在 OpenClaw 中硬式編碼。

請參閱 [/providers/kilocode](/en/providers/kilocode) 以了解設定詳細資訊。

### 其他內建提供者外掛

- OpenRouter：`openrouter` (`OPENROUTER_API_KEY`)
- 範例模型：`openrouter/auto`
- 只有當請求實際上目標為 `openrouter.ai` 時，
  OpenClaw 才會套用 OpenRouter 記錄文件中的應用程式歸屬標頭
- OpenRouter 專屬的 Anthropic `cache_control` 標記也僅限於
  已驗證的 OpenRouter 路由，而非任意代理 URL
- OpenRouter 維持在代理樣式的 OpenAI 相容路徑上，因此原生
  OpenAI 專屬請求塑形 (`serviceTier`、Responses `store`、
  提示快取提示、OpenAI 推理相容負載) 不會被轉送
- Gemini 支援的 OpenRouter 參照僅保留代理 Gemini 思維簽章清理；
  原生 Gemini 重播驗證和引導重寫則保持關閉
- Kilo Gateway：`kilocode` (`KILOCODE_API_KEY`)
- 範例模型：`kilocode/kilo/auto`
- Gemini 支援的 Kilo 參照維持相同的代理 Gemini 思維簽章
  清理路徑；`kilocode/kilo/auto` 和其他不支援代理推理的
  提示會略過代理推理注入
- MiniMax：`minimax` (API 金鑰) 和 `minimax-portal` (OAuth)
- 驗證：`MINIMAX_API_KEY` 用於 `minimax`；`MINIMAX_OAUTH_TOKEN` 或 `MINIMAX_API_KEY` 用於 `minimax-portal`
- 範例模型：`minimax/MiniMax-M2.7` 或 `minimax-portal/MiniMax-M2.7`
- MiniMax 入門/API 金鑰設定會使用 `input: ["text", "image"]` 寫入明確的 M2.7 模型定義；
  捆綁的提供商目錄會保持聊天參照為純文字，直到該提供商設定被具體化
- Moonshot：`moonshot` (`MOONSHOT_API_KEY`)
- 範例模型：`moonshot/kimi-k2.5`
- Kimi Coding：`kimi` (`KIMI_API_KEY` 或 `KIMICODE_API_KEY`)
- 範例模型：`kimi/kimi-code`
- Qianfan：`qianfan` (`QIANFAN_API_KEY`)
- 範例模型：`qianfan/deepseek-v3.2`
- Qwen Cloud：`qwen` (`QWEN_API_KEY`、 `MODELSTUDIO_API_KEY` 或 `DASHSCOPE_API_KEY`)
- 範例模型：`qwen/qwen3.5-plus`
- NVIDIA：`nvidia` (`NVIDIA_API_KEY`)
- 範例模型：`nvidia/nvidia/llama-3.1-nemotron-70b-instruct`
- StepFun：`stepfun` / `stepfun-plan` (`STEPFUN_API_KEY`)
- 範例模型：`stepfun/step-3.5-flash`、 `stepfun-plan/step-3.5-flash-2603`
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
- xAI: `xai` (`XAI_API_KEY`)
  - 原生內建的 xAI 請求使用 xAI Responses 路徑
  - `/fast` 或 `params.fastMode: true` 會將 `grok-3`、`grok-3-mini`、
    `grok-4` 和 `grok-4-0709` 重寫為其 `*-fast` 變體
  - `tool_stream` 預設為開啟；設定
    `agents.defaults.models["xai/<model>"].params.tool_stream` 為 `false` 即可
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

## 透過 `models.providers` 提供的提供者（自訂/基礎 URL）

使用 `models.providers`（或 `models.json`）來新增**自訂**提供者或
OpenAI/Anthropic 相容的代理伺服器。

以下許多內建的提供者外掛程式已發佈預設目錄。
僅在您想要覆寫預設基礎 URL、標頭或模型列表時，
才使用明確的 `models.providers.<id>` 項目。

### Moonshot AI (Kimi)

Moonshot 以內建的提供者外掛程式形式提供。預設使用內建提供者，
並且僅在您需要覆寫基礎 URL 或模型元資料時，
才新增明確的 `models.providers.moonshot` 項目：

- 提供者：`moonshot`
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

Kimi Coding 使用月之暗面 AI 的 Anthropic 相容端點：

- 供應商：`kimi`
- 認證：`KIMI_API_KEY`
- 範例模型：`kimi/kimi-code`

```json5
{
  env: { KIMI_API_KEY: "sk-..." },
  agents: {
    defaults: { model: { primary: "kimi/kimi-code" } },
  },
}
```

舊版 `kimi/k2p5` 仍被接受為相容模型 ID。

### 火山引擎 (豆包)

火山引擎 提供對中國境內豆包及其他模型的存取權。

- 供應商：`volcengine` (編程：`volcengine-plan`)
- 認證：`VOLCANO_ENGINE_API_KEY`
- 範例模型：`volcengine-plan/ark-code-latest`
- CLI：`openclaw onboard --auth-choice volcengine-api-key`

```json5
{
  agents: {
    defaults: { model: { primary: "volcengine-plan/ark-code-latest" } },
  },
}
```

入導預設為編程介面，但一般的 `volcengine/*`
目錄也會同時註冊。

在入導/設定模型選擇器中，Volcengine 認證選項偏好顯示
`volcengine/*` 和 `volcengine-plan/*` 項目。如果這些模型尚未載入，
OpenClaw 將回退到未經篩選的目錄，而不是顯示空的
供應商範圍選擇器。

可用模型：

- `volcengine/doubao-seed-1-8-251228` (豆包 Seed 1.8)
- `volcengine/doubao-seed-code-preview-251028`
- `volcengine/kimi-k2-5-260127` (Kimi K2.5)
- `volcengine/glm-4-7-251222` (GLM 4.7)
- `volcengine/deepseek-v3-2-251201` (DeepSeek V3.2 128K)

編程模型 (`volcengine-plan`)：

- `volcengine-plan/ark-code-latest`
- `volcengine-plan/doubao-seed-code`
- `volcengine-plan/kimi-k2.5`
- `volcengine-plan/kimi-k2-thinking`
- `volcengine-plan/glm-4.7`

### BytePlus (國際版)

BytePlus ARK 為國際用戶提供與火山引擎相同的模型存取權。

- 供應商：`byteplus` (編程：`byteplus-plan`)
- 認證：`BYTEPLUS_API_KEY`
- 範例模型：`byteplus-plan/ark-code-latest`
- CLI：`openclaw onboard --auth-choice byteplus-api-key`

```json5
{
  agents: {
    defaults: { model: { primary: "byteplus-plan/ark-code-latest" } },
  },
}
```

入導預設為編程介面，但一般的 `byteplus/*`
目錄也會同時註冊。

在 onboarding/configure model pickers 中，BytePlus 身份驗證選擇偏好
`byteplus/*` 和 `byteplus-plan/*` 列。如果這些模型尚未加載，
OpenClaw 將回退到未過濾的目錄，而不是顯示空的
provider-scoped picker。

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

Synthetic 在 `synthetic` 提供者後面提供與 Anthropic 兼容的模型：

- 提供者：`synthetic`
- 身份驗證：`SYNTHETIC_API_KEY`
- 示例模型：`synthetic/hf:MiniMaxAI/MiniMax-M2.5`
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

MiniMax 通過 `models.providers` 進行配置，因為它使用自定義端點：

- MiniMax OAuth (全球)：`--auth-choice minimax-global-oauth`
- MiniMax OAuth (中國)：`--auth-choice minimax-cn-oauth`
- MiniMax API 金鑰 (全球)：`--auth-choice minimax-global-api`
- MiniMax API 金鑰 (中國)：`--auth-choice minimax-cn-api`
- 身份驗證：`MINIMAX_API_KEY` 用於 `minimax`；`MINIMAX_OAUTH_TOKEN` 或
  `MINIMAX_API_KEY` 用於 `minimax-portal`

有關設置詳情、模型選項和配置片段，請參閱 [/providers/minimax](/en/providers/minimax)。

在 MiniMax 的 Anthropic 兼容流式路徑上，除非您明確設置，否則 OpenClaw 默認會停用思考，並且 `/fast on` 會將
`MiniMax-M2.7` 重寫為 `MiniMax-M2.7-highspeed`。

外掛擁有的能力拆分：

- 文本/聊天默認設置保留在 `minimax/MiniMax-M2.7` 上
- 圖像生成是 `minimax/image-01` 或 `minimax-portal/image-01`
- 圖像理解在兩條 MiniMax 身份驗證路徑上都是由外掛擁有的 `MiniMax-VL-01`
- 網路搜索保留在提供者 id `minimax` 上

### Ollama

Ollama 作為內置的提供者外掛隨附，並使用 Ollama 的原生 API：

- 提供者：`ollama`
- 身份驗證：無需驗證（本地伺服器）
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
`OLLAMA_API_KEY` 時，Ollama 會在 `http://127.0.0.1:11434` 被本地檢測到，且內置的提供者外掛會直接將 Ollama 新增至
`openclaw onboard` 和模型選擇器。請參閱 [/providers/ollama](/en/providers/ollama)
以了解入門指南、雲端/本地模式和自訂配置。

### vLLM

vLLM 作為內置的提供者外掛隨附，適用於本地/自行託管的 OpenAI 相容
伺服器：

- 提供者：`vllm`
- 身份驗證：可選（視您的伺服器而定）
- 預設基底 URL：`http://127.0.0.1:8000/v1`

若要在本地選擇加入自動探索（如果您的伺服器不強制執行驗證，則任何值皆可）：

```bash
export VLLM_API_KEY="vllm-local"
```

然後設定一個模型（請替換為 `/v1/models` 傳回的其中一個 ID）：

```json5
{
  agents: {
    defaults: { model: { primary: "vllm/your-model-id" } },
  },
}
```

詳情請參閱 [/providers/vllm](/en/providers/vllm)。

### SGLang

SGLang 作為內置的提供者外掛隨附，適用於快速的自行託管
OpenAI 相容伺服器：

- 提供者：`sglang`
- 身份驗證：可選（視您的伺服器而定）
- 預設基底 URL：`http://127.0.0.1:30000/v1`

若要在本地選擇加入自動探索（如果您的伺服器不強制執行驗證，則任何值皆可）：

```bash
export SGLANG_API_KEY="sglang-local"
```

然後設定一個模型（請替換為 `/v1/models` 傳回的其中一個 ID）：

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

- 對於自訂提供者，`reasoning`、`input`、`cost`、`contextWindow` 和 `maxTokens` 是可選的。
  若省略，OpenClaw 預設為：
  - `reasoning: false`
  - `input: ["text"]`
  - `cost: { input: 0, output: 0, cacheRead: 0, cacheWrite: 0 }`
  - `contextWindow: 200000`
  - `maxTokens: 8192`
- 建議：設定符合您的代理伺服器/模型限制的明確數值。
- 對於非原生端點上的 `api: "openai-completions"`（任何主機不是 `api.openai.com` 的非空 `baseUrl`），OpenClaw 會強制設定 `compat.supportsDeveloperRole: false`，以避免提供商針對不支援的 `developer` 角色傳回 400 錯誤。
- Proxy 樣式的 OpenAI 相容路由也會跳過原生 OpenAI 專用的請求塑形：不包含 `service_tier`、不包含 Responses `store`、不包含 prompt-cache 提示、不包含 OpenAI reasoning-compat payload 塑形，以及不包含隱藏的 OpenClaw 歸屬標頭。
- 如果 `baseUrl` 為空或省略，OpenClaw 會保持預設的 OpenAI 行為（其解析為 `api.openai.com`）。
- 為了安全起見，明確指定的 `compat.supportsDeveloperRole: true` 在非原生 `openai-completions` 端點上仍會被覆蓋。

## CLI 範例

```bash
openclaw onboard --auth-choice opencode-zen
openclaw models set opencode/claude-opus-4-6
openclaw models list
```

另請參閱：[/gateway/configuration](/en/gateway/configuration) 以取得完整的設定範例。

## 相關

- [模型](/en/concepts/models) — 模型設定與別名
- [模型故障轉移](/en/concepts/model-failover) — 容錯移轉鏈與重試行為
- [設定參考](/en/gateway/configuration-reference#agent-defaults) — 模型設定鍵
- [提供者](/en/providers) — 各提供者設定指南
