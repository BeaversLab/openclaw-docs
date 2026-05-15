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

<Info>如果您之前尚未建構任何 OpenClaw 外掛程式，請先閱讀 [入門指南](/zh-Hant/plugins/building-plugins) 以了解基本的套件 結構和清單設定。</Info>

<Tip>提供者外掛程式會將模型新增至 OpenClaw 的常態推論迴圈中。如果模型 必須透過擁有執行緒、壓縮或工具 事件的原生代理程式守護程式來執行，請將提供者與 [agent harness](/zh-Hant/plugins/sdk-agent-harness) 搭配使用，而不是將守護程式協定細節放在核心中。</Tip>

## 逐步指南

<Steps>
  <Step title="Package and manifest">
    ### 步驟 1：套件與清單

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

    清單宣告了 `providerAuthEnvVars`，因此 OpenClaw 可以在
    不載入您的外掛程式執行時期的情況下偵測憑證。當提供者變體
    應該重複使用另一個提供者 ID 的驗證時，請新增 `providerAuthAliases`。
    `modelSupport` 是選用的，它允許 OpenClaw 在執行時期
    Hook 存在之前，透過簡寫模型 ID（例如 `acme-large`）
    自動載入您的提供者外掛程式。如果您將提供者發佈到 ClawHub，那些
    `openclaw.compat` 和 `openclaw.build` 欄位
    在 `package.json` 中是必填的。

  </Step>

  <Step title="註冊供應商">
    一個最基本的文字供應商需要一個 `id`、`label`、`auth` 和 `catalog`。
    `catalog` 是供應商擁有的運行時/配置掛鉤；它可以調用實時
    供應商 API 並返回 `models.providers` 條目。

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

        api.registerModelCatalogProvider({
          provider: "acme-ai",
          kinds: ["text"],
          liveCatalog: async (ctx) => {
            const apiKey = ctx.resolveProviderApiKey("acme-ai").apiKey;
            if (!apiKey) return null;
            return [
              {
                kind: "text",
                provider: "acme-ai",
                model: "acme-large",
                label: "Acme Large",
                source: "live",
              },
            ];
          },
        });
      },
    });
    ```

    `registerModelCatalogProvider` 是較新的控制平面目錄表面
    用於清單/幫助/選擇器 UI。將其用於文字、圖像生成、
    影片生成和音樂生成行。將供應商端點調用和
    響應映射保留在插件中；OpenClaw 擁有共享的行形狀、來源
    標籤和幫助渲染。

    這是一個可用的供應商。用戶現在可以
    `openclaw onboard --acme-ai-api-key <key>` 並選擇
    `acme-ai/acme-large` 作為他們的模型。

    如果上游供應商使用的控制令牌與 OpenClaw 不同，請添加一個
    小型的雙向文字轉換，而不是替換流路徑：

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

    `input` 在傳輸之前重寫最終的系統提示詞和文字訊息內容。`output` 在 OpenClaw 解析自己的控制標記或通道交付之前重寫助手文字增量 和最終文字。

    對於僅使用 API 金鑰 註冊一個文字供應商加上單個基於目錄的運行時的打包供應商，請優先使用較狹窄的
    `defineSingleProviderPluginEntry(...)` 幫助程序：

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

    `buildProvider` 是當 OpenClaw 可以解析真實
    供應商身份驗證時使用的實時目錄路徑。它可以執行特定於供應商的發現。僅對在配置身份驗證之前顯示安全的離線行使用
    `buildStaticProvider`；它不得需要憑證或發出網絡請求。
    OpenClaw 的 `models list --all` 顯示目前僅對打包的供應商插件執行靜態目錄，
    具有空配置、空環境且沒有
    代理/工作區路徑。

    如果您的身份驗證流程還需要在導入期間修補 `models.providers.*`、別名和
    代理預設模型，請使用
    `openclaw/plugin-sdk/provider-onboard` 中的預設幫助程序。最狹窄的幫助程序是
    `createDefaultModelPresetAppliers(...)`、
    `createDefaultModelsPresetAppliers(...)` 和
    `createModelCatalogPresetAppliers(...)`。

    當供應商的原生端點支援正常 `openai-completions` 傳輸上的流式使用區塊 時，請優先使用 `openclaw/plugin-sdk/provider-catalog-shared` 中的共享目錄幫助程序，而不是硬編碼
    供應商 ID 檢查。`supportsNativeStreamingUsageCompat(...)` 和
    `applyProviderNativeStreamingUsageCompat(...)` 從
    端點功能映射中檢測支援，因此原生 Moonshot/DashScope 風格的端點
    即使插件使用自訂供應商 ID 仍然會選擇加入。

  </Step>

  <Step title="新增動態模型解析">
    如果您的提供者接受任意模型 ID（如代理或路由器），
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
    預熱 - `resolveDynamicModel` 將在其完成後再次執行。

  </Step>

  <Step title="新增執行時掛鉤（按需）">
    大多數供應商只需要 `catalog` + `resolveDynamicModel`。請根據供應商的需求逐步新增掛鉤。

    共享輔助建構器現在已涵蓋最常見的重播/工具相容性系列，因此外掛通常無需逐一手動連線每個掛鉤：

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

    目前可用的重播系列：

    | 系列 | 連線內容 | 內建範例 |
    | --- | --- | --- |
    | `openai-compatible` | 適用於 OpenAI 相容傳輸的共享 OpenAI 風格重播原則，包括工具呼叫 ID 清理、助理優先排序修復，以及傳輸需要的通用 Gemini 輪次驗證 | `moonshot`, `ollama`, `xai`, `zai` |
    | `anthropic-by-model` | 由 `modelId` 選擇的 Claude 感知重播原則，因此 Anthropic 訊息傳輸僅當解析的模型實際上是 Claude ID 時才會進行 Claude 特定的思考區塊清理 | `amazon-bedrock`, `anthropic-vertex` |
    | `google-gemini` | 原生 Gemini 重播原則，加上引導重播清理和標記的推理輸出模式 | `google`, `google-gemini-cli` |
    | `passthrough-gemini` | 針對透過 OpenAI 相容代理傳輸執行的 Gemini 模型的 Gemini 思考簽章清理；不啟用原生 Gemini 重播驗證或引導重寫 | `openrouter`, `kilocode`, `opencode`, `opencode-go` |
    | `hybrid-anthropic-openai` | 混合原則，適用於在一個外掛中混合 Anthropic 訊息和 OpenAI 相容模型介面的供應商；可選的僅 Claude 思考區塊刪除僅限於 Anthropic 端 | `minimax` |

    目前可用的串流系列：

    | 系列 | 連線內容 | 內建範例 |
    | --- | --- | --- |
    | `google-thinking` | 共享串流路徑上的 Gemini 思考負載正規化 | `google`, `google-gemini-cli` |
    | `kilocode-thinking` | 共用代理串流路徑上的 Kilo 推理包裝器，具有 `kilo/auto` 和不支援的代理推理 ID 跳過注入思考 | `kilocode` |
    | `moonshot-thinking` | 來自組態 + `/think` 層級的 Moonshot 二進位原生思考負載對應 | `moonshot` |
    | `minimax-fast-mode` | 共享串流路徑上的 MiniMax 快速模式模型重寫 | `minimax`, `minimax-portal` |
    | `openai-responses-defaults` | 共享原生 OpenAI/Codex Responses 包裝器：歸因標頭、`/fast`/`serviceTier`、文字詳細程度、原生 Codex 網路搜尋、推理相容負載塑形以及 Responses 環境管理 | `openai`, `openai-codex` |
    | `openrouter-thinking` | 用於代理路由的 OpenRouter 推理包裝器，不支援的模型/`auto` 跳過由中央處理 | `openrouter` |
    | `tool-stream-default-on` | 預設啟用的 `tool_stream` 包裝器，適用於像 Z.AI 這樣除非明確禁用否則希望工具串流的供應商 | `zai` |

    <Accordion title="支援系列建構器的 SDK 縫合">
      每個系列建構器都是由同一套件匯出的底層公開輔助函式組成，當供應商需要偏離常見模式時可以使用這些函式：

      - `openclaw/plugin-sdk/provider-model-shared` - `ProviderReplayFamily`、`buildProviderReplayFamilyHooks(...)` 和原始重播建構器 (`buildOpenAICompatibleReplayPolicy`, `buildAnthropicReplayPolicyForModel`, `buildGoogleGeminiReplayPolicy`, `buildHybridAnthropicOrOpenAIReplayPolicy`)。也匯出 Gemini 重播輔助函式 (`sanitizeGoogleGeminiReplayHistory`, `resolveTaggedReasoningOutputMode`) 和端點/模型輔助函式 (`resolveProviderEndpoint`, `normalizeProviderId`, `normalizeGooglePreviewModelId`, `normalizeNativeXaiModelId`)。
      - `openclaw/plugin-sdk/provider-stream` - `ProviderStreamFamily`、`buildProviderStreamFamilyHooks(...)`、`composeProviderStreamWrappers(...)`，加上共享的 OpenAI/Codex 包裝器 (`createOpenAIAttributionHeadersWrapper`, `createOpenAIFastModeWrapper`, `createOpenAIServiceTierWrapper`, `createOpenAIResponsesContextManagementWrapper`, `createCodexNativeWebSearchWrapper`)、DeepSeek V4 OpenAI 相容包裝器 (`createDeepSeekV4OpenAICompatibleThinkingWrapper`)、Anthropic Messages 思考預填充清理 (`createAnthropicThinkingPrefillPayloadWrapper`) 以及共享代理/供應商包裝器 (`createOpenRouterWrapper`, `createToolStreamWrapper`, `createMinimaxFastModeWrapper`)。
      - `openclaw/plugin-sdk/provider-tools` - `ProviderToolCompatFamily`、`buildProviderToolCompatFamilyHooks("gemini")`、底層 Gemini 結構輔助函式 (`normalizeGeminiToolSchemas`, `inspectGeminiToolSchemas`) 和 xAI 相容輔助函式 (`resolveXaiModelCompatPatch()`, `applyXaiModelCompat(model)`)。內建的 xAI 外掛使用 `normalizeResolvedModel` + `contributeResolvedModelCompat` 配合這些函式，以保持 xAI 規則由供應商擁有。

      某些串流輔助函式特意保留為供應商本地。`@openclaw/anthropic-provider` 將 `wrapAnthropicProviderStream`、`resolveAnthropicBetas`、`resolveAnthropicFastMode`、`resolveAnthropicServiceTier` 和底層 Anthropic 包裝建構器保留在其自己的公開 `api.ts` / `contract-api.ts` 縫合中，因為它們編碼了 Claude OAuth beta 處理和 `context1m` 閘控。xAI 外掛類似地在其自己的 `wrapStreamFn` 中保留原生 xAI Responses 塑形 (`/fast` 別名、預設 `tool_stream`、不支援的嚴格工具清理、xAI 特定推理負載移除)。

      相同的套件根目錄模式也支援 `@openclaw/openai-provider` (供應商建構器、預設模型輔助函式、即時供應商建構器) 和 `@openclaw/openrouter-provider` (供應商建構器加上上線/組態輔助函式)。
    </Accordion>

    <Tabs>
      <Tab title="權杖交換">
        針對在每次推理呼叫之前需要權杖交換的供應商：

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
      <Tab title="自訂標頭">
        針對需要自訂請求標頭或主體修改的供應商：

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
      <Tab title="原生傳輸身分">
        針對在通用 HTTP 或 WebSocket 傳輸上需要原生請求/工作階段標頭或元資料的供應商：

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
      <Tab title="使用量與計費">
        針對公開使用量/計費資料的供應商：

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

    <Accordion title="所有可用的供應商掛鉤">
      OpenClaw 按此順序呼叫掛鉤。大多數供應商僅使用 2-3 個：
      此處未列出 OpenClaw 不再呼叫的僅相容性供應商欄位，例如 `ProviderPlugin.capabilities` 和 `suppressBuiltInModel`。

      | # | 掛鉤 | 使用時機 |
      | --- | --- | --- |
      | 1 | `catalog` | 模型目錄或基礎 URL 預設值 |
      | 2 | `applyConfigDefaults` | 組態具體化期間供應商擁有的全域預設值 |
      | 3 | `normalizeModelId` | 查詢前的舊版/預覽模型 ID 別名清理 |
      | 4 | `normalizeTransport` | 通用模型組裝前的供應商系列 `api` / `baseUrl` 清理 |
      | 5 | `normalizeConfig` | 正規化 `models.providers.<id>` 組態 |
      | 6 | `applyNativeStreamingUsageCompat` | 組態提供者的原生串流使用量相容重寫 |
      | 7 | `resolveConfigApiKey` | 供應商擁有的環境標記驗證解析 |
      | 8 | `resolveSyntheticAuth` | 本地/自託管或基於組態的合成驗證 |
      | 9 | `shouldDeferSyntheticProfileAuth` | 將合成儲存的設定檔佔位符置於環境/組態驗證之後 |
      | 10 | `resolveDynamicModel` | 接受任意上游模型 ID |
      | 11 | `prepareDynamicModel` | 解析前的異步元資料擷取 |
      | 12 | `normalizeResolvedModel` | 執行器之前的傳輸重寫 |
      | 13 | `contributeResolvedModelCompat` | 位於另一個相容傳輸後的供應商模型的相容標誌 |
      | 14 | `normalizeToolSchemas` | 註冊前的供應商擁有工具結構描述清理 |
      | 15 | `inspectToolSchemas` | 供應商擁有工具結構描述診斷 |
      | 16 | `resolveReasoningOutputMode` | 標記與原生推理輸出合約 |
      | 17 | `prepareExtraParams` | 預設請求參數 |
      | 18 | `createStreamFn` | 完全自訂的 StreamFn 傳輸 |
      | 19 | `wrapStreamFn` | 正常串流路徑上的自訂標頭/主體包裝器 |
      | 20 | `resolveTransportTurnState` | 原生每輪次標頭/元資料 |
      | 21 | `resolveWebSocketSessionPolicy` | 原生 WS 工作階段標頭/冷卻 |
      | 22 | `formatApiKey` | 自訂執行時權杖形狀 |
      | 23 | `refreshOAuth` | 自訂 OAuth 重新整理 |
      | 24 | `buildAuthDoctorHint` | 驗證修復指引 |
      | 25 | `matchesContextOverflowError` | 供應商擁有的溢出偵測 |
      | 26 | `classifyFailoverReason` | 供應商擁有的速率限制/過載分類 |
      | 27 | `isCacheTtlEligible` | 提示快取 TTL 閘控 |
      | 28 | `buildMissingAuthMessage` | 自訂缺少驗證提示 |
      | 29 | `augmentModelCatalog` | 合成向前相容行 |
      | 30 | `resolveThinkingProfile` | 模型特定的 `/think` 選項集 |
      | 31 | `isBinaryThinking` | 二進位思考開啟/關閉相容性 |
      | 32 | `supportsXHighThinking` | `xhigh` 推理支援相容性 |
      | 33 | `resolveDefaultThinkingLevel` | 預設 `/think` 原則相容性 |
      | 34 | `isModernModelRef` | 即時/冒煙模型比對 |
      | 35 | `prepareRuntimeAuth` | 推理前的權杖交換 |
      | 36 | `resolveUsageAuth` | 自訂使用量憑證解析 |
      | 37 | `fetchUsageSnapshot` | 自訂使用量端點 |
      | 38 | `createEmbeddingProvider` | 用於記憶體/搜尋的供應商擁有嵌入介面卡 |
      | 39 | `buildReplayPolicy` | 自訂對話重播/壓縮原則 |
      | 40 | `sanitizeReplayHistory` | 通用清理後的供應商特定重播重寫 |
      | 41 | `validateReplayTurns` | 內嵌執行器之前的嚴格重播輪次驗證 |
      | 42 | `onModelSelected` | 選取後回呼 (例如遙測) |

      執行時回退注意事項：

      - `normalizeConfig` 首先檢查匹配的供應商，然後檢查其他具有掛鉤功能的供應商外掛，直到其中一個實際更改組態為止。如果沒有供應商掛鉤重寫支援的 Google 系列組態項目，則內建的 Google 組態正規化器仍然會套用。
      - `resolveConfigApiKey` 在公開時使用供應商掛鉤。內建的 `amazon-bedrock` 路徑在此處也有一個內建的 AWS 環境標記解析器，即使 Bedrock 執行時驗證本身仍然使用 AWS SDK 預設鏈。
      - `resolveSystemPromptContribution` 允許供應商為模型系列注入具有快取感知的系統提示指引。當該行為屬於某個供應商/模型系列並且應保留穩定/動態快取分割時，請優先選擇它而非 `before_prompt_build`。

      如需詳細描述和真實範例，請參閱 [內部：供應商執行時掛鉤](/zh-Hant/plugins/architecture-internals#provider-runtime-hooks)。
    </Accordion>

  </Step>

  <Step title="新增額外功能（可選）">
    ### 步驟 5：新增額外功能

    提供者外掛可以註冊語音、即時轉錄、即時語音、媒體理解、圖像生成、影片生成、網路擷取和網路搜尋，與文字推理並存。OpenClaw 將此歸類為 **混合功能** 外掛——這是公司外掛的建議模式（每個廠商一個外掛）。請參閱 [內部機制：功能擁有權](/zh-Hant/plugins/architecture#capability-ownership-model)。

    在 `register(api)` 內註冊每個功能，與您現有的 `api.registerProvider(...)` 呼叫並列。僅選取您需要的分頁：

    <Tabs>
      <Tab title="語音 (TTS)">
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

        針對提供者 HTTP 失敗使用 `assertOkOrThrowProviderError(...)`，以便外掛共用受限的錯誤主體讀取、JSON 錯誤解析和請求 ID 後綴。
      </Tab>
      <Tab title="即時轉錄">
        建議使用 `createRealtimeTranscriptionWebSocketSession(...)`——這個共享輔助程式會處理代理擷取、重連退避、關閉清除、就緒交握、音訊排隊和關閉事件診斷。您的外掛僅需對應上游事件。

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

        POST 多部分音訊的批次 STT 提供者應該使用 `buildAudioTranscriptionFormData(...)`（來自 `openclaw/plugin-sdk/provider-http`）。此輔助程式會正規化上傳檔名，包括需要 M4A 風格檔名以相容轉錄 API 的 AAC 上傳。
      </Tab>
      <Tab title="即時語音">
        ```typescript
        api.registerRealtimeVoiceProvider({
          id: "acme-ai",
          label: "Acme Realtime Voice",
          capabilities: {
            transports: ["gateway-relay"],
            inputAudioFormats: [{ encoding: "pcm16", sampleRateHz: 24000, channels: 1 }],
            outputAudioFormats: [{ encoding: "pcm16", sampleRateHz: 24000, channels: 1 }],
            supportsBargeIn: true,
            supportsToolCalls: true,
          },
          isConfigured: ({ providerConfig }) => Boolean(providerConfig.apiKey),
          createBridge: (req) => ({
            // Set this only if the provider accepts multiple tool responses for
            // one call, for example an immediate "working" response followed by
            // the final result.
            supportsToolResultContinuation: false,
            connect: async () => {},
            sendAudio: () => {},
            setMediaTimestamp: () => {},
            handleBargeIn: () => {},
            submitToolResult: () => {},
            acknowledgeMark: () => {},
            close: () => {},
            isConnected: () => true,
          }),
        });
        ```

        宣告 `capabilities`，以便 `talk.catalog` 能向瀏覽器和原生 Talk 用戶端公開有效的模式、傳輸、音訊格式和功能旗標。當傳輸可以偵測到人類正在打斷助理播放，且提供者支援截斷或清除作用中的音訊回應時，請實作 `handleBargeIn`。
      </Tab>
      <Tab title="媒體理解">
        ```typescript
        api.registerMediaUnderstandingProvider({
          id: "acme-ai",
          capabilities: ["image", "audio"],
          describeImage: async (req) => ({ text: "A photo of..." }),
          transcribeAudio: async (req) => ({ text: "Transcript..." }),
        });
        ```
      </Tab>
      <Tab title="圖像與影片生成">
        影片功能使用 **模式感知** 形狀：`generate`、`imageToVideo` 和 `videoToVideo`。像 `maxInputImages` / `maxInputVideos` / `maxDurationSeconds` 這類平面彙總欄位，不足以乾淨地宣傳轉換模式支援或已停用的模式。音樂生成遵循相同的模式，使用明確的 `generate` / `edit` 區塊。

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
      <Tab title="網路擷取與搜尋">
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
    ### 步驟 6：測試

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

請勿在此處使用舊版的僅限技能發布別名；外掛程式套件應使用
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

`catalog.order` 控制您的目錄相對於內建提供者合併的時機：

| 順序      | 時機       | 使用情境                         |
| --------- | ---------- | -------------------------------- |
| `simple`  | 第一輪     | 純 API 金鑰供應商                |
| `profile` | 簡單之後   | 基於設定檔的認證閘道的供應商     |
| `paired`  | 設定檔之後 | 綜合多個相關項目                 |
| `late`    | 最後一輪   | 覆寫現有供應商（衝突時優先採用） |

## 下一步

- [頻道外掛程式](/zh-Hant/plugins/sdk-channel-plugins) - 如果您的外掛程式也提供頻道
- [SDK 執行時](/zh-Hant/plugins/sdk-runtime) - `api.runtime` 助手 (TTS、搜尋、子代理程式)
- [SDK 概觀](/zh-Hant/plugins/sdk-overview) - 完整的子路徑匯入參考
- [外掛程式內部](/zh-Hant/plugins/architecture-internals#provider-runtime-hooks) - Hook 詳細資訊和內建範例

## 相關內容

- [外掛程式 SDK 設定](/zh-Hant/plugins/sdk-setup)
- [建置外掛程式](/zh-Hant/plugins/building-plugins)
- [建置頻道外掛程式](/zh-Hant/plugins/sdk-channel-plugins)
