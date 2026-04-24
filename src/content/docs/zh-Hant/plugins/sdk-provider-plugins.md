---
title: "建置提供者外掛程式"
sidebarTitle: "提供者外掛程式"
summary: "為 OpenClaw 建構模型提供者外掛程式的逐步指南"
read_when:
  - You are building a new model provider plugin
  - You want to add an OpenAI-compatible proxy or custom LLM to OpenClaw
  - You need to understand provider auth, catalogs, and runtime hooks
---

# 建置提供者外掛程式

本指南將逐步引導您建置一個提供者外掛程式，該外掛程式會將模型提供者
(LLM) 新增至 OpenClaw。最後，您將擁有一個包含模型目錄、
API 金鑰驗證以及動態模型解析的提供者。

<Info>如果您之前尚未建構任何 OpenClaw 外掛程式，請先閱讀 [入門指南](/zh-Hant/plugins/building-plugins) 以了解基本套件 結構與 manifest 設定。</Info>

<Tip>提供者外掛程式會將模型加入 OpenClaw 的正常推論迴圈中。如果模型 必須透過擁有執行緒、壓縮或工具 事件的原生代理程式常駐程式執行，請將提供者與 [agent harness](/zh-Hant/plugins/sdk-agent-harness) 搭配使用，而不要將常駐程式通訊協定詳細資訊放在核心中。</Tip>

## 逐步解說

<Steps>
  <a id="step-1-package-and-manifest"></a>
  <Step title="Package and manifest">
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

    清單檔案聲明了 `providerAuthEnvVars`，以便 OpenClaw 可以在不加載您的插件運行時的情況下檢測憑證。當提供商變體應該重用另一個提供商 ID 的驗證時，請新增 `providerAuthAliases`。`modelSupport` 是可選的，它允許 OpenClaw 在運行時掛鉤存在之前，從像 `acme-large` 這樣的簡寫模型 ID 自動加載您的提供商插件。如果您在 ClawHub 上發布提供商，則 `package.json` 中需要這些 `openclaw.compat` 和 `openclaw.build` 欄位。

  </Step>

  <Step title="註冊提供者">
    一個最小化的提供者需要一個 `id`、`label`、`auth` 和 `catalog`：

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

    這就是一個可運作的提供者。用戶現在可以
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

    `input` 會在傳輸之前重寫最終的系統提示和文字訊息內容。`output` 會在 OpenClaw 解析自己的控制標記或通道傳遞之前重寫助手文字增量（deltas）和最終文字。

    對於僅註冊一個具備 API 金鑰驗證以及單一目錄支援執行時的文字提供者之打包提供者，建議優先使用更狹隘的
    `defineSingleProviderPluginEntry(...)` 輔助函式：

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

    `buildProvider` 是當 OpenClaw 可以解析真實提供者驗證時使用的即時目錄路徑。它可能會執行特定於提供者的探索。僅對在設定驗證之前顯示安全的離線資料列使用
    `buildStaticProvider`；它絕不能要求憑證或發出網路請求。
    OpenClaw 的 `models list --all` 顯示目前僅針對打包的提供者外掛程式執行靜態目錄，並搭配空設定、空環境以及無 agent/workspace 路徑。

    如果您的驗證流程還需要在引導（onboarding）期間修補 `models.providers.*`、別名和
    agent 預設模型，請使用
    `openclaw/plugin-sdk/provider-onboard` 中的預設輔助函式。最狹隘的輔助函式是
    `createDefaultModelPresetAppliers(...)`、
    `createDefaultModelsPresetAppliers(...)` 和
    `createModelCatalogPresetAppliers(...)`。

    當提供者的原生端點在一般
    `openai-completions` 傳輸上支援串流使用區塊時，請優先使用
    `openclaw/plugin-sdk/provider-catalog-shared` 中的共用目錄輔助函式，而不是硬編碼
    提供者 ID 檢查。`supportsNativeStreamingUsageCompat(...)` 和
    `applyProviderNativeStreamingUsageCompat(...)` 會從
    端點功能映射中偵測支援，因此原生的 Moonshot/DashScope 風格端點
    即使在外掛程式使用自訂提供者 ID 時仍會選擇加入。

  </Step>

  <Step title="Add dynamic model resolution">
    如果您的供應商接受任意模型 ID（例如代理或路由器），
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

    如果解析需要網路呼叫，請使用 `prepareDynamicModel` 進行非同步
    預熱—— `resolveDynamicModel` 會在完成後再次執行。

  </Step>

  <Step title="添加運行時鉤子（如需要）">
    大多數供應商只需要 `catalog` + `resolveDynamicModel`。根據供應商的需求逐步添加鉤子。

    共享輔助構建器現在涵蓋了最常見的重放/工具兼容系列，因此外掛通常無需逐一手動連接每個鉤子：

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

    目前可用的重放系列：

    | 系列 | 內容 |
    | --- | --- |
    | `openai-compatible` | 適用於 OpenAI 相容傳輸的共享 OpenAI 風格重放策略，包括工具呼叫 ID 清理、助手優先排序修正，以及傳輸需要的通用 Gemini 輪次驗證 |
    | `anthropic-by-model` | 由 `modelId` 選擇的 Claude 感知重放策略，因此 Anthropic-message 傳輸僅在解析的模型實際為 Claude ID 時才會執行 Claude 特定的思維區塊清理 |
    | `google-gemini` | 原生 Gemini 重放策略，加上引導重放清理和標記推理輸出模式 |
    | `passthrough-gemini` | 針對透過 OpenAI 相容代理傳輸運行的 Gemini 模型的 Gemini 思維簽名清理；不啟用原生 Gemini 重放驗證或引導重寫 |
    | `hybrid-anthropic-openai` | 混合策略，適用於在一個外掛中混合 Anthropic-message 和 OpenAI 相容模型表面的供應商；可選的僅 Claude 思維區塊刪除仍僅限於 Anthropic 端 |

    實際打包範例：

    - `google` 和 `google-gemini-cli`: `google-gemini`
    - `openrouter`、`kilocode`、`opencode` 和 `opencode-go`: `passthrough-gemini`
    - `amazon-bedrock` 和 `anthropic-vertex`: `anthropic-by-model`
    - `minimax`: `hybrid-anthropic-openai`
    - `moonshot`、`ollama`、`xai` 和 `zai`: `openai-compatible`

    目前可用的串流系列：

    | 系列 | 內容 |
    | --- | --- |
    | `google-thinking` | 共享串流路徑上的 Gemini 思維負載正規化 |
    | `kilocode-thinking` | 共享代理串流路徑上的 Kilo 推理包裝器，對於 `kilo/auto` 和不支援的代理推理 ID 跳過注入的思維 |
    | `moonshot-thinking` | 從設定 + `/think` 層級進行的 Moonshot 二進位原生思維負載映射 |
    | `minimax-fast-mode` | 共享串流路徑上的 MiniMax 快速模式模型重寫 |
    | `openai-responses-defaults` | 共享原生 OpenAI/Codex Responses 包裝器：歸屬標頭、`/fast`/`serviceTier`、文字詳細程度、原生 Codex 網頁搜尋、推理兼容負載塑形以及 Responses 內容管理 |
    | `openrouter-thinking` | 適用於代理路由的 OpenRouter 推理包裝器，不支援的模型/`auto` 跳過由中央處理 |
    | `tool-stream-default-on` | 預設開啟的 `tool_stream` 包裝器，適用於像 Z.AI 這樣除非明確停用否則希望工具串流的供應商 |

    實際打包範例：

    - `google` 和 `google-gemini-cli`: `google-thinking`
    - `kilocode`: `kilocode-thinking`
    - `moonshot`: `moonshot-thinking`
    - `minimax` 和 `minimax-portal`: `minimax-fast-mode`
    - `openai` 和 `openai-codex`: `openai-responses-defaults`
    - `openrouter`: `openrouter-thinking`
    - `zai`: `tool-stream-default-on`

    `openclaw/plugin-sdk/provider-model-shared` 也匯出重放系列枚舉以及構建這些系列的共享輔助函數。常見的公開匯出包括：

    - `ProviderReplayFamily`
    - `buildProviderReplayFamilyHooks(...)`
    - 共享重放構建器，例如 `buildOpenAICompatibleReplayPolicy(...)`、
      `buildAnthropicReplayPolicyForModel(...)`、
      `buildGoogleGeminiReplayPolicy(...)` 和
      `buildHybridAnthropicOrOpenAIReplayPolicy(...)`
    - Gemini 重放輔助函數，例如 `sanitizeGoogleGeminiReplayHistory(...)`
      和 `resolveTaggedReasoningOutputMode()`
    - 端點/模型輔助函數，例如 `resolveProviderEndpoint(...)`、
      `normalizeProviderId(...)`、`normalizeGooglePreviewModelId(...)` 和
      `normalizeNativeXaiModelId(...)`

    `openclaw/plugin-sdk/provider-stream` 暴露了系列構建器以及這些系列重複使用的公開包裝器輔助函數。常見的公開匯出包括：

    - `ProviderStreamFamily`
    - `buildProviderStreamFamilyHooks(...)`
    - `composeProviderStreamWrappers(...)`
    - 共享 OpenAI/Codex 包裝器，例如
      `createOpenAIAttributionHeadersWrapper(...)`、
      `createOpenAIFastModeWrapper(...)`、
      `createOpenAIServiceTierWrapper(...)`、
      `createOpenAIResponsesContextManagementWrapper(...)` 和
      `createCodexNativeWebSearchWrapper(...)`
    - 共享代理/供應商包裝器，例如 `createOpenRouterWrapper(...)`、
      `createToolStreamWrapper(...)` 和 `createMinimaxFastModeWrapper(...)`

    某些串流輔助函數是有意保留在供應商本地的。目前的打包範例：`@openclaw/anthropic-provider` 匯出
    `wrapAnthropicProviderStream`、`resolveAnthropicBetas`、
    `resolveAnthropicFastMode`、`resolveAnthropicServiceTier` 以及來自其公開 `api.ts` /
    `contract-api.ts` 縫隙的低階 Anthropic 包裝器構建器。這些輔助函數仍專屬於 Anthropic，因為它們還編碼了 Claude OAuth beta 處理和 `context1m` 閘控。

    其他打包供應商在行為未在系列之間清晰共享時，也會將特定於傳輸的包裝器保留在本地。目前的範例：打包的 xAI 外掛將原生 xAI Responses 塑形保留在其自己的
    `wrapStreamFn` 中，包括 `/fast` 別名重寫、預設 `tool_stream`、
    不支援的嚴格工具清理以及 xAI 特定的推理負載移除。

    `openclaw/plugin-sdk/provider-tools` 目前暴露一個共享工具架構系列以及共享架構/兼容輔助函數：

    - `ProviderToolCompatFamily` 記錄了目前的共享系列清單。
    - `buildProviderToolCompatFamilyHooks("gemini")` 連接 Gemini 架構清理和診斷，適用於需要 Gemini 安全工具架構的供應商。
    - `normalizeGeminiToolSchemas(...)` 和 `inspectGeminiToolSchemas(...)`
      是底層的公開 Gemini 架構輔助函數。
    - `resolveXaiModelCompatPatch()` 返回打包的 xAI 兼容修補程式：
      `toolSchemaProfile: "xai"`、不支援的架構關鍵字、原生
      `web_search` 支援以及 HTML 實體工具呼叫參數解碼。
    - `applyXaiModelCompat(model)` 在模型到達運行器之前，將相同的 xAI 兼容修補程式應用於已解析的模型。

    實際打包範例：xAI 外掛使用 `normalizeResolvedModel` 加上
    `contributeResolvedModelCompat` 來保持該兼容元數據由供應商擁有，而不是在核心中硬編碼 xAI 規則。

    相同的套件根模式也支援其他打包供應商：

    - `@openclaw/openai-provider`: `api.ts` 匯出供應商構建器、預設模型輔助函數即時供應商構建器
    - `@openclaw/openrouter-provider`: `api.ts` 匯出供應商構建器以及入門/設定輔助函數

    <Tabs>
      <Tab title="權杖交換">
        對於在每次推論呼叫前需要權杖交換的供應商：

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
        對於需要自訂請求標頭或主體修改的供應商：

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
      <Tab title="原生傳輸身分識別">
        對於需要在通用 HTTP 或 WebSocket 傳輸上使用原生請求/工作階段標頭或元數據的供應商：

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
        對於暴露使用量/計費數據的供應商：

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

    <Accordion title="所有可用的供應商鉤子">
      OpenClaw 按此順序呼叫鉤子。大多數供應商僅使用 2-3 個：

      | # | 鉤子 | 使用時機 |
      | --- | --- | --- |
      | 1 | `catalog` | 模型目錄或基礎 URL 預設值 |
      | 2 | `applyConfigDefaults` | 設定具體化期間供應商擁有的全域預設值 |
      | 3 | `normalizeModelId` | 查詢前的舊版/預覽模型 ID 別名清理 |
      | 4 | `normalizeTransport` | 通用模型組裝前的供應商系列 `api` / `baseUrl` 清理 |
      | 5 | `normalizeConfig` | 正規化 `models.providers.<id>` 設定 |
      | 6 | `applyNativeStreamingUsageCompat` | 設定供應商的原生串流使用量兼容重寫 |
      | 7 | `resolveConfigApiKey` | 供應商擁有的 env-marker 身份驗證解析 |
      | 8 | `resolveSyntheticAuth` | 本地/自託管或設定支援的合成身份驗證 |
      | 9 | `shouldDeferSyntheticProfileAuth` | 將合成儲存的設定檔預留位置降低到 env/config 身份驗證之後 |
      | 10 | `resolveDynamicModel` | 接受任意上游模型 ID |
      | 11 | `prepareDynamicModel` | 解析前的異步元數據獲取 |
      | 12 | `normalizeResolvedModel` | 運行器之前的傳輸重寫 |

    運行時備援註記：

    - `normalizeConfig` 首先檢查匹配的供應商，然後檢查其他具有鉤子能力的供應商外掛，直到其中一個實際更改設定為止。如果沒有供應商鉤子重寫受支援的 Google 系列設定條目，打包的 Google 設定正規化器仍然適用。
    - `resolveConfigApiKey` 在暴露時使用供應商鉤子。打包的 `amazon-bedrock` 路徑在此處也有內建的 AWS env-marker 解析器，即使 Bedrock 運行時身份驗證本身仍使用 AWS SDK 預設鏈。
      | 13 | `contributeResolvedModelCompat` | 位於另一個相容傳輸後的廠商模型的兼容標誌 |
      | 14 | `capabilities` | 舊版靜態功能包；僅限兼容性 |
      | 15 | `normalizeToolSchemas` | 註冊前的供應商擁有的工具架構清理 |
      | 16 | `inspectToolSchemas` | 供應商擁有的工具架構診斷 |
      | 17 | `resolveReasoningOutputMode` | 標記與原生推理輸出合約 |
      | 18 | `prepareExtraParams` | 預設請求參數 |
      | 19 | `createStreamFn` | 完全自訂的 StreamFn 傳輸 |
      | 20 | `wrapStreamFn` | 正常串流路徑上的自訂標頭/主體包裝器 |
      | 21 | `resolveTransportTurnState` | 原生每輪標頭/元數據 |
      | 22 | `resolveWebSocketSessionPolicy` | 原生 WS 工作階段標頭/冷卻 |
      | 23 | `formatApiKey` | 自訂運行時權杖形狀 |
      | 24 | `refreshOAuth` | 自訂 OAuth 重新整理 |
      | 25 | `buildAuthDoctorHint` | 身份驗證修復指引 |
      | 26 | `matchesContextOverflowError` | 供應商擁有的溢出偵測 |
      | 27 | `classifyFailoverReason` | 供應商擁有的速率限制/過載分類 |
      | 28 | `isCacheTtlEligible` | 提示快取 TTL 閘控 |
      | 29 | `buildMissingAuthMessage` | 自訂缺少身份驗證提示 |
      | 30 | `suppressBuiltInModel` | 隱藏過時的上游列 |
      | 31 | `augmentModelCatalog` | 合成向前兼容列 |
      | 32 | `resolveThinkingProfile` | 模型特定的 `/think` 選項集 |
      | 33 | `isBinaryThinking` | 二進位思維開啟/關閉兼容性 |
      | 34 | `supportsXHighThinking` | `xhigh` 推理支援兼容性 |
      | 35 | `resolveDefaultThinkingLevel` | 預設 `/think` 策略兼容性 |
      | 36 | `isModernModelRef` | 即時/冒煙模型匹配 |
      | 37 | `prepareRuntimeAuth` | 推論前的權杖交換 |
      | 38 | `resolveUsageAuth` | 自訂使用量憑證解析 |
      | 39 | `fetchUsageSnapshot` | 自訂使用量端點 |
      | 40 | `createEmbeddingProvider` | 供應商擁有的嵌入適配器，用於記憶體/搜尋 |
      | 41 | `buildReplayPolicy` | 自訂對話重放/壓縮策略 |
      | 42 | `sanitizeReplayHistory` | 通用清理後的供應商特定重寫重寫 |
      | 43 | `validateReplayTurns` | 內嵌運行器前的嚴格重放輪次驗證 |
      | 44 | `onModelSelected` | 選取後回調（例如遙測）|

      提示微調註記：

      - `resolveSystemPromptContribution` 允許供應商為模型系列注入具備快取感知的系統提示指引。當該行為屬於某個供應商/模型系列並且應保留穩定/動態快取分割時，優先於 `before_prompt_build` 使用。

      如需詳細描述和真實範例，請參閱
      [內部結構：供應商運行時鉤子](/zh-Hant/plugins/architecture#provider-runtime-hooks)。
    </Accordion>

  </Step>

  <Step title="Add extra capabilities (optional)">
    <a id="step-5-add-extra-capabilities"></a>
    提供者外掛程式可以註冊語音、即時轉錄、即時語音、媒體理解、影像生成、影片生成、網路擷取，以及網路搜尋，與文字推論並存：

    ```typescript
    register(api) {
      api.registerProvider({ id: "acme-ai", /* ... */ });

      api.registerSpeechProvider({
        id: "acme-ai",
        label: "Acme Speech",
        isConfigured: ({ config }) => Boolean(config.messages?.tts),
        synthesize: async (req) => ({
          audioBuffer: Buffer.from(/* PCM data */),
          outputFormat: "mp3",
          fileExtension: ".mp3",
          voiceCompatible: false,
        }),
      });

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

      api.registerRealtimeVoiceProvider({
        id: "acme-ai",
        label: "Acme Realtime Voice",
        isConfigured: ({ providerConfig }) => Boolean(providerConfig.apiKey),
        createBridge: (req) => ({
          connect: async () => {},
          sendAudio: () => {},
          setMediaTimestamp: () => {},
          submitToolResult: () => {},
          acknowledgeMark: () => {},
          close: () => {},
          isConnected: () => true,
        }),
      });

      api.registerMediaUnderstandingProvider({
        id: "acme-ai",
        capabilities: ["image", "audio"],
        describeImage: async (req) => ({ text: "A photo of..." }),
        transcribeAudio: async (req) => ({ text: "Transcript..." }),
      });

      api.registerImageGenerationProvider({
        id: "acme-ai",
        label: "Acme Images",
        generate: async (req) => ({ /* image result */ }),
      });

      api.registerVideoGenerationProvider({
        id: "acme-ai",
        label: "Acme Video",
        capabilities: {
          generate: {
            maxVideos: 1,
            maxDurationSeconds: 10,
            supportsResolution: true,
          },
          imageToVideo: {
            enabled: true,
            maxVideos: 1,
            maxInputImages: 1,
            maxDurationSeconds: 5,
          },
          videoToVideo: {
            enabled: false,
          },
        },
        generateVideo: async (req) => ({ videos: [] }),
      });

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
    }
    ```

    OpenClaw 將此歸類為 **混合功能 (hybrid-capability)** 外掛程式。這是公司外掛程式的建議模式（每個供應商一個外掛程式）。請參閱 [Internals: Capability Ownership](/zh-Hant/plugins/architecture#capability-ownership-model)。

    對於影片生成，建議優先使用上述具備模式感知的功能形狀：`generate`、`imageToVideo` 和 `videoToVideo`。平坦的聚合欄位（如 `maxInputImages`、`maxInputVideos` 和 `maxDurationSeconds`）不足以乾淨地公告轉換模式支援或已停用的模式。

    對於串流 STT 提供者，建議優先使用共用的 WebSocket 輔助程式。它能讓代理擷取、重連退避、關閉排清、就緒交握、音訊佇列以及關閉事件診斷在所有提供者之間保持一致，同時讓提供者程式碼僅需負責上游事件對應。

    發送多部分音訊 POST 請求的批次 STT 提供者，應將 `openclaw/plugin-sdk/provider-http` 中的 `buildAudioTranscriptionFormData(...)` 與提供者 HTTP 請求輔助程式搭配使用。表單輔助程式會正規化上傳檔名，包括需要 M4A 樣式檔名以相容於轉錄 API 的 AAC 上傳。

    音樂生成提供者應遵循相同的模式：`generate` 用於僅提示詞生成，而 `edit` 用於基於參考影像的生成。平坦的聚合欄位（如 `maxInputImages`、`supportsLyrics` 和 `supportsFormat`）不足以公告編輯支援；明確的 `generate` / `edit` 區塊才是預期的合約。

  </Step>

  <Step title="測試">
    <a id="step-6-test"></a>
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

## 發佈至 ClawHub

提供者外掛的發佈方式與任何其他外部程式碼外掛相同：

```bash
clawhub package publish your-org/your-plugin --dry-run
clawhub package publish your-org/your-plugin
```

請勿在此處使用僅限舊版技能的發行別名；外掛程式套件應使用 `clawhub package publish`。

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

`catalog.order` 控制您的目錄相對於內建提供者的合併時機：

| 順序      | 時機         | 使用情境                     |
| --------- | ------------ | ---------------------------- |
| `simple`  | 第一輪       | 純 API 金鑰提供者            |
| `profile` | 在簡單之後   | 受驗證設定檔限制的提供者     |
| `paired`  | 在設定檔之後 | 綜合多個相關條目             |
| `late`    | 最後一輪     | 覆寫現有提供者（衝突時優先） |

## 後續步驟

- [頻道外掛](/zh-Hant/plugins/sdk-channel-plugins) — 如果您的外掛也提供頻道
- [SDK 執行時](/zh-Hant/plugins/sdk-runtime) — `api.runtime` 助手（TTS、搜尋、子代理程式）
- [SDK 概覽](/zh-Hant/plugins/sdk-overview) — 完整的子路徑匯入參考
- [外掛內部機制](/zh-Hant/plugins/architecture#provider-runtime-hooks) — Hook 詳細資訊與隨附範例
