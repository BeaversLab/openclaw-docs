---
summary: "為 OpenClaw 建構模型提供者外掛的逐步指南"
title: "建構提供者外掛"
sidebarTitle: "提供者外掛"
read_when:
  - You are building a new model provider plugin
  - You want to add an OpenAI-compatible proxy or custom LLM to OpenClaw
  - You need to understand provider auth, catalogs, and runtime hooks
---

本指南將引導您建構一個提供者外掛，用於將模型提供者 (LLM) 新增至 OpenClaw。完成後，您將擁有一個包含模型目錄、API 金鑰驗證和動態模型解析的提供者。

<Info>如果您之前尚未建構任何 OpenClaw 外掛，請先閱讀 [入門指南](/zh-Hant/plugins/building-plugins) 以了解基本的套件 結構和清單設定。</Info>

<Tip>提供者外掛會將模型新增至 OpenClaw 的正常推論迴圈中。如果模型 必須透過擁有執行緒、壓縮或工具事件的原生代理程式守護程式來運作，請將提供者與 [agent harness](/zh-Hant/plugins/sdk-agent-harness) 搭配使用， 而不要將守護程式協定細節放在核心中。</Tip>

## 逐步指南

<Steps>
  <Step title="套件與清單">
    <CodeGroup>
    ```json package.json
    {
      "name": "@myorg/openclaw-acme-ai",
      "version": "1.0.0",
      "type": "module",
      "openclaw": {
        "extensions": ["./index.ts"],
        "providers": ["acme-ai"],
        "compat": {
          "pluginApi": ">=2026.3.24-beta.2",
          "minGatewayVersion": "2026.3.24-beta.2"
        },
        "build": {
          "openclawVersion": "2026.3.24-beta.2",
          "pluginSdkVersion": "2026.3.24-beta.2"
        }
      }
    }
    ```

    ```json openclaw.plugin.json
    {
      "id": "acme-ai",
      "name": "Acme AI",
      "description": "Acme AI model provider",
      "providers": ["acme-ai"],
      "modelSupport": {
        "modelPrefixes": ["acme-"]
      },
      "providerAuthEnvVars": {
        "acme-ai": ["ACME_AI_API_KEY"]
      },
      "providerAuthAliases": {
        "acme-ai-coding": "acme-ai"
      },
      "providerAuthChoices": [
        {
          "provider": "acme-ai",
          "method": "api-key",
          "choiceId": "acme-ai-api-key",
          "choiceLabel": "Acme AI API key",
          "groupId": "acme-ai",
          "groupLabel": "Acme AI",
          "cliFlag": "--acme-ai-api-key",
          "cliOption": "--acme-ai-api-key <key>",
          "cliDescription": "Acme AI API key"
        }
      ],
      "configSchema": {
        "type": "object",
        "additionalProperties": false
      }
    }
    ```
    </CodeGroup>

    清單會宣告 `providerAuthEnvVars`，以便 OpenClaw 可以在
    不載入您的外掛執行時期的情況下偵測憑證。當提供者變體應該重複使用另一個
    提供者 ID 的驗證時，請新增 `providerAuthAliases`。`modelSupport`
    是選用的，並允許 OpenClaw 在執行時期 Hook 存在之前，從簡寫的模型 ID（例如 `acme-large`）
    自動載入您的提供者外掛。如果您在 ClawHub 上發佈提供者，則 `package.json`
    中需要填入這些 `openclaw.compat` 和 `openclaw.build` 欄位。

  </Step>

  <Step title="註冊提供者">
    一個最基本的提供者需要一個 `id`、`label`、`auth` 和 `catalog`：

    ```typescript index.ts
    import { definePluginEntry } from "openclaw/plugin-sdk/plugin-entry";
    import { createProviderApiKeyAuthMethod } from "openclaw/plugin-sdk/provider-auth";

    export default definePluginEntry({
      id: "acme-ai",
      name: "Acme AI",
      description: "Acme AI model provider",
      register(api) {
        api.registerProvider({
          id: "acme-ai",
          label: "Acme AI",
          docsPath: "/providers/acme-ai",
          envVars: ["ACME_AI_API_KEY"],

          auth: [
            createProviderApiKeyAuthMethod({
              providerId: "acme-ai",
              methodId: "api-key",
              label: "Acme AI API key",
              hint: "API key from your Acme AI dashboard",
              optionKey: "acmeAiApiKey",
              flagName: "--acme-ai-api-key",
              envVar: "ACME_AI_API_KEY",
              promptMessage: "Enter your Acme AI API key",
              defaultModel: "acme-ai/acme-large",
            }),
          ],

          catalog: {
            order: "simple",
            run: async (ctx) => {
              const apiKey =
                ctx.resolveProviderApiKey("acme-ai").apiKey;
              if (!apiKey) return null;
              return {
                provider: {
                  baseUrl: "https://api.acme-ai.com/v1",
                  apiKey,
                  api: "openai-completions",
                  models: [
                    {
                      id: "acme-large",
                      name: "Acme Large",
                      reasoning: true,
                      input: ["text", "image"],
                      cost: { input: 3, output: 15, cacheRead: 0.3, cacheWrite: 3.75 },
                      contextWindow: 200000,
                      maxTokens: 32768,
                    },
                    {
                      id: "acme-small",
                      name: "Acme Small",
                      reasoning: false,
                      input: ["text"],
                      cost: { input: 1, output: 5, cacheRead: 0.1, cacheWrite: 1.25 },
                      contextWindow: 128000,
                      maxTokens: 8192,
                    },
                  ],
                },
              };
            },
          },
        });
      },
    });
    ```

    這就是一個可用的提供者。使用者現在可以
    `openclaw onboard --acme-ai-api-key <key>` 並選擇
    `acme-ai/acme-large` 作為他們的模型。

    如果上游提供者使用的控制標記與 OpenClaw 不同，請新增一個
    小型的雙向文字轉換，而不是替換串流路徑：

    ```typescript
    api.registerTextTransforms({
      input: [
        { from: /red basket/g, to: "blue basket" },
        { from: /paper ticket/g, to: "digital ticket" },
        { from: /left shelf/g, to: "right shelf" },
      ],
      output: [
        { from: /blue basket/g, to: "red basket" },
        { from: /digital ticket/g, to: "paper ticket" },
        { from: /right shelf/g, to: "left shelf" },
      ],
    });
    ```

    `input` 會在傳輸前重寫最終的系統提示和文字訊息內容。
    `output` 會在 OpenClaw 解析其自己的控制標記或通道交付之前，
    重寫助理文字增量 和最終文字。

    對於僅註冊一個使用 API 金鑰驗證的
    文字提供者以及單一目錄支援的執行環境的打包提供者，請優先使用
    範圍較窄的 `defineSingleProviderPluginEntry(...)` 輔助函式：

    ```typescript
    import { defineSingleProviderPluginEntry } from "openclaw/plugin-sdk/provider-entry";

    export default defineSingleProviderPluginEntry({
      id: "acme-ai",
      name: "Acme AI",
      description: "Acme AI model provider",
      provider: {
        label: "Acme AI",
        docsPath: "/providers/acme-ai",
        auth: [
          {
            methodId: "api-key",
            label: "Acme AI API key",
            hint: "API key from your Acme AI dashboard",
            optionKey: "acmeAiApiKey",
            flagName: "--acme-ai-api-key",
            envVar: "ACME_AI_API_KEY",
            promptMessage: "Enter your Acme AI API key",
            defaultModel: "acme-ai/acme-large",
          },
        ],
        catalog: {
          buildProvider: () => ({
            api: "openai-completions",
            baseUrl: "https://api.acme-ai.com/v1",
            models: [{ id: "acme-large", name: "Acme Large" }],
          }),
          buildStaticProvider: () => ({
            api: "openai-completions",
            baseUrl: "https://api.acme-ai.com/v1",
            models: [{ id: "acme-large", name: "Acme Large" }],
          }),
        },
      },
    });
    ```

    當 OpenClaw 可以解析真實的提供者驗證時，
    `buildProvider` 是使用的即時目錄路徑。它可以執行特定於提供者的探索。
    僅將 `buildStaticProvider` 用於在設定驗證之前顯示安全的
    離線項目；它不得要求憑證或發出網路請求。
    OpenClaw 的 `models list --all` 顯示目前僅針對打包的提供者外掛程式
    執行靜態目錄，並使用空配置、空環境變數以及
    無代理程式/工作區路徑。

    如果您的驗證流程還需要在設定過程中修補 `models.providers.*`、別名
    和代理程式預設模型，請使用
    `openclaw/plugin-sdk/provider-onboard` 中的預設輔助函式。最狹隘的輔助函式是
    `createDefaultModelPresetAppliers(...)`、
    `createDefaultModelsPresetAppliers(...)` 和
    `createModelCatalogPresetAppliers(...)`。

    當提供者的原生端點在正常的
    `openai-completions` 傳輸上支援串流使用區塊時，請優先使用
    `openclaw/plugin-sdk/provider-catalog-shared` 中的共享目錄輔助函式，而不是
    硬編碼提供者 ID 檢查。`supportsNativeStreamingUsageCompat(...)` 和
    `applyProviderNativeStreamingUsageCompat(...)` 會從
    端點功能圖檢測支援，因此原生的 Moonshot/DashScope 樣式端點
    即使在外掛程式使用自訂提供者 ID 時仍能選擇加入。

  </Step>

  <Step title="新增動態模型解析">
    如果您的提供者接受任意模型 ID（例如代理或路由器），
    請新增 `resolveDynamicModel`：

    ```typescript
    api.registerProvider({
      // ... id, label, auth, catalog from above

      resolveDynamicModel: (ctx) => ({
        id: ctx.modelId,
        name: ctx.modelId,
        provider: "acme-ai",
        api: "openai-completions",
        baseUrl: "https://api.acme-ai.com/v1",
        reasoning: false,
        input: ["text"],
        cost: { input: 0, output: 0, cacheRead: 0, cacheWrite: 0 },
        contextWindow: 128000,
        maxTokens: 8192,
      }),
    });
    ```

    如果解析需要網路請求，請使用 `prepareDynamicModel` 進行非同步
    預熱 — `resolveDynamicModel` 會在完成後再次執行。

  </Step>

  <Step title="Add runtime hooks (as needed)">
    大多數供應商只需要 `catalog` + `resolveDynamicModel`。根據您的供應商需求逐步添加 hooks。

    共享輔助建構器現在涵蓋了最常見的 replay/tool-compat 系列，因此外掛程式通常不需要逐一手動連線每個 hook：

    ```typescript
    import { buildProviderReplayFamilyHooks } from "openclaw/plugin-sdk/provider-model-shared";
    import { buildProviderStreamFamilyHooks } from "openclaw/plugin-sdk/provider-stream";
    import { buildProviderToolCompatFamilyHooks } from "openclaw/plugin-sdk/provider-tools";

    const GOOGLE_FAMILY_HOOKS = {
      ...buildProviderReplayFamilyHooks({ family: "google-gemini" }),
      ...buildProviderStreamFamilyHooks("google-thinking"),
      ...buildProviderToolCompatFamilyHooks("gemini"),
    };

    api.registerProvider({
      id: "acme-gemini-compatible",
      // ...
      ...GOOGLE_FAMILY_HOOKS,
    });
    ```

    目前可用的 replay 系列：

    | 系列 | 其連線內容 | 內建範例 |
    | --- | --- | --- |
    | `openai-compatible` | 適用於 OpenAI 相容傳輸的共享 OpenAI 風格 replay 策略，包括 tool-call-id 清理、assistant-first 排序修正，以及傳輸需要時的通用 Gemini-turn 驗證 | `moonshot`, `ollama`, `xai`, `zai` |
    | `anthropic-by-model` | 由 `modelId` 選擇的 Claude 感知 replay 策略，因此 Anthropic-message 傳輸僅當解析的模型實際上是 Claude id 時才會獲得特定於 Claude 的 thinking-block 清理 | `amazon-bedrock`, `anthropic-vertex` |
    | `google-gemini` | 原生 Gemini replay 策略加上 bootstrap replay 清理和標記的 reasoning-output 模式 | `google`, `google-gemini-cli` |
    | `passthrough-gemini` | 針對透過 OpenAI 相容代理傳輸執行的 Gemini 模型進行 Gemini thought-signature 清理；不啟用原生 Gemini replay 驗證或 bootstrap 重寫 | `openrouter`, `kilocode`, `opencode`, `opencode-go` |
    | `hybrid-anthropic-openai` | 混合策略，適用於在一個外掛程式中混合 Anthropic-message 和 OpenAI 相容模型介面的供應商；可選的僅限 Claude thinking-block 刪除保持在 Anthropic 端範圍內 | `minimax` |

    目前可用的 stream 系列：

    | 系列 | 其連線內容 | 內建範例 |
    | --- | --- | --- |
    | `google-thinking` | 共享 stream 路徑上的 Gemini thinking payload 正規化 | `google`, `google-gemini-cli` |
    | `kilocode-thinking` | 共用代理 stream 路徑上的 Kilo reasoning 包裝器，具有 `kilo/auto` 和不支援的代理 reasoning id 跳過注入的 thinking | `kilocode` |
    | `moonshot-thinking` | 從組態 + `/think` 層級進行的 Moonshot 二進位原生 thinking payload 對應 | `moonshot` |
    | `minimax-fast-mode` | 共享 stream 路徑上的 MiniMax 快速模式模型重寫 | `minimax`, `minimax-portal` |
    | `openai-responses-defaults` | 共享原生 OpenAI/Codex Responses 包裝器：歸因標頭、`/fast`/`serviceTier`、文字詳細程度、原生 Codex 網路搜尋、reasoning-compat payload 塑形以及 Responses 內容管理 | `openai`, `openai-codex` |
    | `openrouter-thinking` | 代理路由的 OpenRouter reasoning 包裝器，集中處理不支援的模型/`auto` 跳過 | `openrouter` |
    | `tool-stream-default-on` | 預設開啟的 `tool_stream` 包裝器，適用於像 Z.AI 這樣除非明確停用否則希望使用工具串流的供應商 | `zai` |

    <Accordion title="SDK seams powering the family builders">
      每個系列建構器都是由從同一個套件匯出的較低階公共輔助函式組成的，當供應商需要偏離常見模式時，您可以使用這些函式：

      - `openclaw/plugin-sdk/provider-model-shared` — `ProviderReplayFamily`、`buildProviderReplayFamilyHooks(...)` 和原始 replay 建構器 (`buildOpenAICompatibleReplayPolicy`、`buildAnthropicReplayPolicyForModel`、`buildGoogleGeminiReplayPolicy`、`buildHybridAnthropicOrOpenAIReplayPolicy`)。也匯出 Gemini replay 輔助函式 (`sanitizeGoogleGeminiReplayHistory`、`resolveTaggedReasoningOutputMode`) 和端點/模型輔助函式 (`resolveProviderEndpoint`、`normalizeProviderId`、`normalizeGooglePreviewModelId`、`normalizeNativeXaiModelId`)。
      - `openclaw/plugin-sdk/provider-stream` — `ProviderStreamFamily`、`buildProviderStreamFamilyHooks(...)`、`composeProviderStreamWrappers(...)`，加上共享的 OpenAI/Codex 包裝器 (`createOpenAIAttributionHeadersWrapper`、`createOpenAIFastModeWrapper`、`createOpenAIServiceTierWrapper`、`createOpenAIResponsesContextManagementWrapper`、`createCodexNativeWebSearchWrapper`)、DeepSeek V4 OpenAI 相容包裝器 (`createDeepSeekV4OpenAICompatibleThinkingWrapper`) 和共享代理/供應商包裝器 (`createOpenRouterWrapper`、`createToolStreamWrapper`、`createMinimaxFastModeWrapper`)。
      - `openclaw/plugin-sdk/provider-tools` — `ProviderToolCompatFamily`、`buildProviderToolCompatFamilyHooks("gemini")`、底層 Gemini schema 輔助函式 (`normalizeGeminiToolSchemas`、`inspectGeminiToolSchemas`) 和 xAI 相容輔助函式 (`resolveXaiModelCompatPatch()`、`applyXaiModelCompat(model)`)。內建的 xAI 外掛程式使用 `normalizeResolvedModel` + `contributeResolvedModelCompat` 與這些函式搭配，以保持 xAI 規則由供應商擁有。

      某些 stream 輔助函式有意保留為供應商本地的。`@openclaw/anthropic-provider` 將 `wrapAnthropicProviderStream`、`resolveAnthropicBetas`、`resolveAnthropicFastMode`、`resolveAnthropicServiceTier` 和較低階的 Anthropic 包裝器建構器保留在其自己的公共 `api.ts` / `contract-api.ts` 縫隙 中，因為它們編碼了 Claude OAuth beta 處理和 `context1m` 閘道。xAI 外掛程式類似地將原生 xAI Responses 塑形保留在其自己的 `wrapStreamFn` 中 (`/fast` 別名、預設 `tool_stream`、不支援的嚴格工具清理、特定於 xAI 的 reasoning-payload 移除)。

      相同的套件根模式也支援 `@openclaw/openai-provider` (供應商建構器、預設模型輔助函式、即時供應商建構器) 和 `@openclaw/openrouter-provider` (供應商建構器加上入門/組態輔助函式)。
    </Accordion>

    <Tabs>
      <Tab title="Token exchange">
        對於需要在此類推斷呼叫之前進行 token 交換的供應商：

        ```typescript
        prepareRuntimeAuth: async (ctx) => {
          const exchanged = await exchangeToken(ctx.apiKey);
          return {
            apiKey: exchanged.token,
            baseUrl: exchanged.baseUrl,
            expiresAt: exchanged.expiresAt,
          };
        },
        ```
      </Tab>
      <Tab title="Custom headers">
        對於需要自訂要求標頭或正文修改的供應商：

        ```typescript
        // wrapStreamFn returns a StreamFn derived from ctx.streamFn
        wrapStreamFn: (ctx) => {
          if (!ctx.streamFn) return undefined;
          const inner = ctx.streamFn;
          return async (params) => {
            params.headers = {
              ...params.headers,
              "X-Acme-Version": "2",
            };
            return inner(params);
          };
        },
        ```
      </Tab>
      <Tab title="Native transport identity">
        對於需要在通用 HTTP 或 WebSocket 傳輸上使用原生要求/工作階段標頭或中繼資料的供應商：

        ```typescript
        resolveTransportTurnState: (ctx) => ({
          headers: {
            "x-request-id": ctx.turnId,
          },
          metadata: {
            session_id: ctx.sessionId ?? "",
            turn_id: ctx.turnId,
          },
        }),
        resolveWebSocketSessionPolicy: (ctx) => ({
          headers: {
            "x-session-id": ctx.sessionId ?? "",
          },
          degradeCooldownMs: 60_000,
        }),
        ```
      </Tab>
      <Tab title="Usage and billing">
        對於公開使用/計費資料的供應商：

        ```typescript
        resolveUsageAuth: async (ctx) => {
          const auth = await ctx.resolveOAuthToken();
          return auth ? { token: auth.token } : null;
        },
        fetchUsageSnapshot: async (ctx) => {
          return await fetchAcmeUsage(ctx.token, ctx.timeoutMs);
        },
        ```
      </Tab>
    </Tabs>

    <Accordion title="All available provider hooks">
      OpenClaw 按此順序呼叫 hooks。大多數供應商僅使用 2-3 個：

      | # | Hook | 使用時機 |
      | --- | --- | --- |
      | 1 | `catalog` | 模型目錄或基本 URL 預設值 |
      | 2 | `applyConfigDefaults` | 組態具體化期間由供應商擁有的全域預設值 |
      | 3 | `normalizeModelId` | 查詢前的舊版/預覽 model-id 別名清理 |
      | 4 | `normalizeTransport` | 通用模型組裝前的供應商系列 `api` / `baseUrl` 清理 |
      | 5 | `normalizeConfig` | 正規化 `models.providers.<id>` 組態 |
      | 6 | `applyNativeStreamingUsageCompat` | 組態供應商的原生串流使用相容重寫 |
      | 7 | `resolveConfigApiKey` | 由供應商擁有的 env-marker auth 解析 |
      | 8 | `resolveSyntheticAuth` | 本地/自託管或組態支援的合成 auth |
      | 9 | `shouldDeferSyntheticProfileAuth` | 將合成 stored-profile 佔位符降低至 env/config auth 之後 |
      | 10 | `resolveDynamicModel` | 接受任意上游模型 ID |
      | 11 | `prepareDynamicModel` | 解析前的非同步中繼資料擷取 |
      | 12 | `normalizeResolvedModel` | 執行器前的傳輸重寫 |
      | 13 | `contributeResolvedModelCompat` | 位於另一個相容傳輸後面的供應商模型的相容標誌 |
      | 14 | `capabilities` | 舊版靜態功能包；僅用於相容性 |
      | 15 | `normalizeToolSchemas` | 註冊前由供應商擁有的工具 schema 清理 |
      | 16 | `inspectToolSchemas` | 由供應商擁有的工具 schema 診斷 |
      | 17 | `resolveReasoningOutputMode` | 標記與原生 reasoning-output 合約 |
      | 18 | `prepareExtraParams` | 預設要求參數 |
      | 19 | `createStreamFn` | 完全自訂的 StreamFn 傳輸 |
      | 20 | `wrapStreamFn` | 正常 stream 路徑上的自訂標頭/正文包裝器 |
      | 21 | `resolveTransportTurnState` | 原生 per-turn 標頭/中繼資料 |
      | 22 | `resolveWebSocketSessionPolicy` | 原生 WS 工作階段標頭/冷卻 |
      | 23 | `formatApiKey` | 自訂執行階段 token 形狀 |
      | 24 | `refreshOAuth` | 自訂 OAuth 重新整理 |
      | 25 | `buildAuthDoctorHint` | Auth 修復指引 |
      | 26 | `matchesContextOverflowError` | 由供應商擁有的溢出偵測 |
      | 27 | `classifyFailoverReason` | 由供應商擁有的速率限制/超載分類 |
      | 28 | `isCacheTtlEligible` | Prompt 快取 TTL 閘道 |
      | 29 | `buildMissingAuthMessage` | 自訂缺少 auth 提示 |
      | 30 | `suppressBuiltInModel` | 隱藏過時的上游資料列 |
      | 31 | `augmentModelCatalog` | 合成向前相容資料列 |
      | 32 | `resolveThinkingProfile` | 特定於模型的 `/think` 選項集 |
      | 33 | `isBinaryThinking` | 二進位 thinking 開啟/關閉相容性 |
      | 34 | `supportsXHighThinking` | `xhigh` reasoning 支援相容性 |
      | 35 | `resolveDefaultThinkingLevel` | 預設 `/think` 策略相容性 |
      | 36 | `isModernModelRef` | 即時/冒煙模型比對 |
      | 37 | `prepareRuntimeAuth` | 推斷前的 token 交換 |
      | 38 | `resolveUsageAuth` | 自訂使用憑證解析 |
      | 39 | `fetchUsageSnapshot` | 自訂使用端點 |
      | 40 | `createEmbeddingProvider` | 由供應商擁有的記憶體/搜尋嵌入介面卡 |
      | 41 | `buildReplayPolicy` | 自訂文字記錄 replay/壓縮策略 |
      | 42 | `sanitizeReplayHistory` | 通用清理後的特定於供應商的 replay 重寫 |
      | 43 | `validateReplayTurns` | 內嵌執行器前的嚴格 replay-turn 驗證 |
      | 44 | `onModelSelected` | 選取後回呼 (例如遙測) |

      執行階段回退備註：

      - `normalizeConfig` 會先檢查相符的供應商，然後檢查其他具備 hook 能力的供應商外掛程式，直到其中一個實際變更組態為止。如果沒有供應商 hook 重寫支援的 Google 系列組態項目，內建的 Google 組態正規化器仍然會套用。
      - `resolveConfigApiKey` 會在公開時使用供應商 hook。內建的 `amazon-bedrock` 路徑在此處也有一個內建的 AWS env-marker 解析器，即使 Bedrock 執行階段 auth 本身仍使用 AWS SDK 預設鏈。
      - `resolveSystemPromptContribution` 允許供應商為模型系列注入感知快取的系統提示詞指引。當行為屬於某個供應商/模型系列且應該保留穩定/動態快取分割時，請優先使用它而非 `before_prompt_build`。

      如需詳細描述和真實範例，請參閱 [Internals: Provider Runtime Hooks](/zh-Hant/plugins/architecture-internals#provider-runtime-hooks)。
    </Accordion>

  </Step>

  <Step title="Add extra capabilities (optional)">
    供應商插件可以註冊語音、即時轉錄、即時語音、媒體理解、圖像生成、視頻生成、網絡獲取和網絡搜索等功能，以及文本推斷。OpenClaw 將其歸類為**混合功能**插件——這是公司插件的推薦模式（每個供應商一個插件）。請參閱
    [Internals: Capability Ownership](/zh-Hant/plugins/architecture#capability-ownership-model)。

    在 `register(api)` 中註冊每個功能，與您現有的
    `api.registerProvider(...)` 調用一起。僅選擇您需要的選項卡：

    <Tabs>
      <Tab title="Speech (TTS)">
        ```typescript
        import {
          assertOkOrThrowProviderError,
          postJsonRequest,
        } from "openclaw/plugin-sdk/provider-http";

        api.registerSpeechProvider({
          id: "acme-ai",
          label: "Acme Speech",
          isConfigured: ({ config }) => Boolean(config.messages?.tts),
          synthesize: async (req) => {
            const { response, release } = await postJsonRequest({
              url: "https://api.example.com/v1/speech",
              headers: new Headers({ "Content-Type": "application/json" }),
              body: { text: req.text },
              timeoutMs: req.timeoutMs,
              fetchFn: fetch,
              auditContext: "acme speech",
            });
            try {
              await assertOkOrThrowProviderError(response, "Acme Speech API error");
              return {
                audioBuffer: Buffer.from(await response.arrayBuffer()),
                outputFormat: "mp3",
                fileExtension: ".mp3",
                voiceCompatible: false,
              };
            } finally {
              await release();
            }
          },
        });
        ```

        對於供應商 HTTP 失敗，請使用 `assertOkOrThrowProviderError(...)`，以便
        插件共享受限的錯誤主體讀取、JSON 錯誤解析和
        request-id 後綴。
      </Tab>
      <Tab title="Realtime transcription">
        建議使用 `createRealtimeTranscriptionWebSocketSession(...)` —— 該共享
        助手處理代理捕獲、重連退避、關閉刷新、就緒
        握手、音頻排隊和關閉事件診斷。您的插件
        僅需映射上游事件。

        ```typescript
        api.registerRealtimeTranscriptionProvider({
          id: "acme-ai",
          label: "Acme Realtime Transcription",
          isConfigured: () => true,
          createSession: (req) => {
            const apiKey = String(req.providerConfig.apiKey ?? "");
            return createRealtimeTranscriptionWebSocketSession({
              providerId: "acme-ai",
              callbacks: req,
              url: "wss://api.example.com/v1/realtime-transcription",
              headers: { Authorization: `Bearer ${apiKey}` },
              onMessage: (event, transport) => {
                if (event.type === "session.created") {
                  transport.sendJson({ type: "session.update" });
                  transport.markReady();
                  return;
                }
                if (event.type === "transcript.final") {
                  req.onTranscript?.(event.text);
                }
              },
              sendAudio: (audio, transport) => {
                transport.sendJson({
                  type: "audio.append",
                  audio: audio.toString("base64"),
                });
              },
              onClose: (transport) => {
                transport.sendJson({ type: "audio.end" });
              },
            });
          },
        });
        ```

        POST 多部分音頻的批量 STT 供應商應使用
        來自 `openclaw/plugin-sdk/provider-http` 的 `buildAudioTranscriptionFormData(...)`。該助手會規範化上傳
        文件名，包括需要 M4A 風格文件名以兼容轉錄 API 的 AAC 上傳。
      </Tab>
      <Tab title="Realtime voice">
        ```typescript
        api.registerRealtimeVoiceProvider({
          id: "acme-ai",
          label: "Acme Realtime Voice",
          isConfigured: ({ providerConfig }) => Boolean(providerConfig.apiKey),
          createBridge: (req) => ({
            // Set this only if the provider accepts multiple tool responses for
            // one call, for example an immediate "working" response followed by
            // the final result.
            supportsToolResultContinuation: false,
            connect: async () => {},
            sendAudio: () => {},
            setMediaTimestamp: () => {},
            submitToolResult: () => {},
            acknowledgeMark: () => {},
            close: () => {},
            isConnected: () => true,
          }),
        });
        ```
      </Tab>
      <Tab title="Media understanding">
        ```typescript
        api.registerMediaUnderstandingProvider({
          id: "acme-ai",
          capabilities: ["image", "audio"],
          describeImage: async (req) => ({ text: "A photo of..." }),
          transcribeAudio: async (req) => ({ text: "Transcript..." }),
        });
        ```
      </Tab>
      <Tab title="Image and video generation">
        視頻功能使用**模式感知**形狀：`generate`、
        `imageToVideo` 和 `videoToVideo`。諸如
        `maxInputImages` / `maxInputVideos` / `maxDurationSeconds` 之類的平面聚合字段
        不足以乾淨地宣佈轉換模式支持或已禁用的模式。
        音樂生成遵循相同的模式，具有顯式的 `generate` /
        `edit` 塊。

        ```typescript
        api.registerImageGenerationProvider({
          id: "acme-ai",
          label: "Acme Images",
          generate: async (req) => ({ /* image result */ }),
        });

        api.registerVideoGenerationProvider({
          id: "acme-ai",
          label: "Acme Video",
          capabilities: {
            generate: { maxVideos: 1, maxDurationSeconds: 10, supportsResolution: true },
            imageToVideo: {
              enabled: true,
              maxVideos: 1,
              maxInputImages: 1,
              maxInputImagesByModel: { "acme/reference-to-video": 9 },
              maxDurationSeconds: 5,
            },
            videoToVideo: { enabled: false },
          },
          generateVideo: async (req) => ({ videos: [] }),
        });
        ```
      </Tab>
      <Tab title="Web fetch and search">
        ```typescript
        api.registerWebFetchProvider({
          id: "acme-ai-fetch",
          label: "Acme Fetch",
          hint: "Fetch pages through Acme's rendering backend.",
          envVars: ["ACME_FETCH_API_KEY"],
          placeholder: "acme-...",
          signupUrl: "https://acme.example.com/fetch",
          credentialPath: "plugins.entries.acme.config.webFetch.apiKey",
          getCredentialValue: (fetchConfig) => fetchConfig?.acme?.apiKey,
          setCredentialValue: (fetchConfigTarget, value) => {
            const acme = (fetchConfigTarget.acme ??= {});
            acme.apiKey = value;
          },
          createTool: () => ({
            description: "Fetch a page through Acme Fetch.",
            parameters: {},
            execute: async (args) => ({ content: [] }),
          }),
        });

        api.registerWebSearchProvider({
          id: "acme-ai-search",
          label: "Acme Search",
          search: async (req) => ({ content: [] }),
        });
        ```
      </Tab>
    </Tabs>

  </Step>

  <Step title="Test">
    ```typescript src/provider.test.ts
    import { describe, it, expect } from "vitest";
    // Export your provider config object from index.ts or a dedicated file
    import { acmeProvider } from "./provider.js";

    describe("acme-ai provider", () => {
      it("resolves dynamic models", () => {
        const model = acmeProvider.resolveDynamicModel!({
          modelId: "acme-beta-v3",
        } as any);
        expect(model.id).toBe("acme-beta-v3");
        expect(model.provider).toBe("acme-ai");
      });

      it("returns catalog when key is available", async () => {
        const result = await acmeProvider.catalog!.run({
          resolveProviderApiKey: () => ({ apiKey: "test-key" }),
        } as any);
        expect(result?.provider?.models).toHaveLength(2);
      });

      it("returns null catalog when no key", async () => {
        const result = await acmeProvider.catalog!.run({
          resolveProviderApiKey: () => ({ apiKey: undefined }),
        } as any);
        expect(result).toBeNull();
      });
    });
    ```

  </Step>
</Steps>

## 發布至 ClawHub

供應商外掛程式的發布方式與任何其他外部程式碼外掛程式相同：

```bash
clawhub package publish your-org/your-plugin --dry-run
clawhub package publish your-org/your-plugin
```

請勿在此使用僅限舊版技能的發布別名；外掛程式套件應使用
`clawhub package publish`。

## 檔案結構

```
<bundled-plugin-root>/acme-ai/
├── package.json              # openclaw.providers metadata
├── openclaw.plugin.json      # Manifest with provider auth metadata
├── index.ts                  # definePluginEntry + registerProvider
└── src/
    ├── provider.test.ts      # Tests
    └── usage.ts              # Usage endpoint (optional)
```

## 目錄順序參考

`catalog.order` 控制您的目錄相對於內建供應商的合併時機：

| 順序      | 時機       | 使用情境                         |
| --------- | ---------- | -------------------------------- |
| `simple`  | 第一輪     | 純 API 金鑰供應商                |
| `profile` | 簡單之後   | 基於設定檔的認證閘道的供應商     |
| `paired`  | 設定檔之後 | 綜合多個相關項目                 |
| `late`    | 最後一輪   | 覆寫現有供應商（衝突時優先採用） |

## 下一步

- [通道外掛程式](/zh-Hant/plugins/sdk-channel-plugins) — 如果您的外掛程式也提供通道
- [SDK 執行時期](/zh-Hant/plugins/sdk-runtime) — `api.runtime` 助手（TTS、搜尋、子代理程式）
- [SDK 概覽](/zh-Hant/plugins/sdk-overview) — 完整的子路徑匯入參考
- [外掛程式內部機制](/zh-Hant/plugins/architecture-internals#provider-runtime-hooks) — Hook 詳細資訊與內建範例

## 相關內容

- [外掛程式 SDK 設定](/zh-Hant/plugins/sdk-setup)
- [建置外掛程式](/zh-Hant/plugins/building-plugins)
- [建置通道外掛程式](/zh-Hant/plugins/sdk-channel-plugins)
