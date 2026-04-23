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

<Info>如果您之前尚未建立任何 OpenClaw 外掛程式，請先閱讀 [Getting Started](/zh-Hant/plugins/building-plugins) 以了解基本的套件 結構和 manifest 設定。</Info>

<Tip>Provider 外掛程式會將模型新增至 OpenClaw 的正常推論迴圈中。如果模型 必須透過擁有執行緒、壓縮或工具 事件的原生代理程式守護程式執行，請將提供者與 [agent harness](/zh-Hant/plugins/sdk-agent-harness) 搭配使用，而不是將守護程式通訊協定詳細資訊放在核心中。</Tip>

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

    這就是一個可運作的提供者。使用者現在可以
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

    `input` 會在傳輸前重寫最終的系統提示詞和文字訊息內容。
    `output` 會在 OpenClaw 解析其自身的控制標記或通道傳遞之前，
    重寫助手文字增量 和最終文字。

    對於只註冊一個使用 API 金鑰驗證的單一文字提供者加上一個目錄支援執行時的
    捆綁提供者，建議使用範圍更窄的 `defineSingleProviderPluginEntry(...)` 輔助函式：

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
        },
      },
    });
    ```

    如果您的驗證流程還需要在入門流程 期間修補 `models.providers.*`、別名
    和代理程式預設模型，請使用來自
    `openclaw/plugin-sdk/provider-onboard` 的預設輔助函式。最窄的輔助函式是
    `createDefaultModelPresetAppliers(...)`、
    `createDefaultModelsPresetAppliers(...)` 和
    `createModelCatalogPresetAppliers(...)`。

    當提供者的原生端點支援在標準 `openai-completions` 傳輸上的串流使用區塊 時，
    請優先使用 `openclaw/plugin-sdk/provider-catalog-shared` 中的共享目錄輔助函式，而不是對
    提供者 ID 進行硬編碼檢查。`supportsNativeStreamingUsageCompat(...)` 和
    `applyProviderNativeStreamingUsageCompat(...)` 會從
    端點功能對應 中偵測支援情況，因此原生的 Moonshot/DashScope 風格端點即使
    外掛使用自訂提供者 ID，仍然能夠選擇加入。

  </Step>

  <Step title="新增動態模型解析">
    如果您的提供者接受任意的模型 ID (例如代理或路由器)，
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
    預熱 — `resolveDynamicModel` 會在完成後再次執行。

  </Step>

  <Step title="新增執行時掛鉤（視需要）">
    大多數供應商僅需要 `catalog` + `resolveDynamicModel`。請根據供應商的需求逐步新增掛鉤。

    共享輔助建構器現已涵蓋最常見的重新播放/工具相容性系列，因此外掛通常無需逐一手動連接每個掛鉤：

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

    目前可用的重新播放系列：

    | 系列 | 其連接內容 |
    | --- | --- |
    | `openai-compatible` | 適用於 OpenAI 相容傳輸的共享 OpenAI 風格重新播放策略，包括工具呼叫 ID 清理、助手優先排序修復，以及傳輸需要的通用 Gemini 輪次驗證 |
    | `anthropic-by-model` | 由 `modelId` 選擇的 Claude 感知重新播放策略，因此當解析的模型實際上是 Claude ID 時，Anthropic 訊息傳輸僅會獲得 Claude 特定的思考區塊清理 |
    | `google-gemini` | 原生 Gemini 重新播放策略，加上引導式重新播放清理和標記的推理輸出模式 |
    | `passthrough-gemini` | 針對透過 OpenAI 相容代理傳輸運行的 Gemini 模型進行 Gemini 思考簽章清理；不啟用原生 Gemini 重新播放驗證或引導式重寫 |
    | `hybrid-anthropic-openai` | 混合策略，適用於在一個外掛中混合 Anthropic 訊息和 OpenAI 相容模型表面的供應商；可選的僅限 Claude 思考區塊刪除保持在 Anthropic 側 |

    實際的套件範例：

    - `google` 和 `google-gemini-cli`：`google-gemini`
    - `openrouter`、`kilocode`、`opencode` 和 `opencode-go`：`passthrough-gemini`
    - `amazon-bedrock` 和 `anthropic-vertex`：`anthropic-by-model`
    - `minimax`：`hybrid-anthropic-openai`
    - `moonshot`、`ollama`、`xai` 和 `zai`：`openai-compatible`

    目前可用的串流系列：

    | 系列 | 其連接內容 |
    | --- | --- |
    | `google-thinking` | 共享串流路徑上的 Gemini 思考承載正規化 |
    | `kilocode-thinking` | 共享代理串流路徑上的 Kilo 推理包裝函式，對於 `kilo/auto` 和不支援的代理推理 ID 會跳過注入的思考 |
    | `moonshot-thinking` | 來自設定 + `/think` 層級的 Moonshot 二進位原生思考承載對應 |
    | `minimax-fast-mode` | 共享串流路徑上的 MiniMax 快速模式模型重寫 |
    | `openai-responses-defaults` | 共享原生 OpenAI/Codex Responses 包裝函式：歸因標頭、`/fast`/`serviceTier`、文字詳細程度、原生 Codex 網路搜尋、推理相容承載塑形以及 Responses 內容管理 |
    | `openrouter-thinking` | 適用於代理路由的 OpenRouter 推理包裝函式，其中不支援的模型/`auto` 跳過由中央處理 |
    | `tool-stream-default-on` | 針對像 Z.AI 這樣除非明確停用否則希望進行工具串流的供應商，預設開啟的 `tool_stream` 包裝函式 |

    實際的套件範例：

    - `google` 和 `google-gemini-cli`：`google-thinking`
    - `kilocode`：`kilocode-thinking`
    - `moonshot`：`moonshot-thinking`
    - `minimax` 和 `minimax-portal`：`minimax-fast-mode`
    - `openai` 和 `openai-codex`：`openai-responses-defaults`
    - `openrouter`：`openrouter-thinking`
    - `zai`：`tool-stream-default-on`

    `openclaw/plugin-sdk/provider-model-shared` 也會匯出重新播放系列列舉以及建構這些系列的共享輔助函式。常見的公開匯出包括：

    - `ProviderReplayFamily`
    - `buildProviderReplayFamilyHooks(...)`
    - 共享重新播放建構器，例如 `buildOpenAICompatibleReplayPolicy(...)`、
      `buildAnthropicReplayPolicyForModel(...)`、
      `buildGoogleGeminiReplayPolicy(...)` 和
      `buildHybridAnthropicOrOpenAIReplayPolicy(...)`
    - Gemini 重新播放輔助函式，例如 `sanitizeGoogleGeminiReplayHistory(...)`
      和 `resolveTaggedReasoningOutputMode()`
    - 端點/模型輔助函式，例如 `resolveProviderEndpoint(...)`、
      `normalizeProviderId(...)`、`normalizeGooglePreviewModelId(...)` 和
      `normalizeNativeXaiModelId(...)`

    `openclaw/plugin-sdk/provider-stream` 會公開系列建構器以及這些系列重複使用的公開包裝輔助函式。常見的公開匯出包括：

    - `ProviderStreamFamily`
    - `buildProviderStreamFamilyHooks(...)`
    - `composeProviderStreamWrappers(...)`
    - 共享 OpenAI/Codex 包裝函式，例如
      `createOpenAIAttributionHeadersWrapper(...)`、
      `createOpenAIFastModeWrapper(...)`、
      `createOpenAIServiceTierWrapper(...)`、
      `createOpenAIResponsesContextManagementWrapper(...)` 和
      `createCodexNativeWebSearchWrapper(...)`
    - 共享代理/供應商包裝函式，例如 `createOpenRouterWrapper(...)`、
      `createToolStreamWrapper(...)` 和 `createMinimaxFastModeWrapper(...)`

    某些串流輔助函式會刻意保持供應商本機化。目前的套件範例：`@openclaw/anthropic-provider` 會
    從其公開 `api.ts` /
    `contract-api.ts` 介面匯出 `wrapAnthropicProviderStream`、`resolveAnthropicBetas`、
    `resolveAnthropicFastMode`、`resolveAnthropicServiceTier` 以及底層的 Anthropic 包裝建構器。這些輔助函式仍保持 Anthropic 特有，因為它們還編碼了 Claude OAuth Beta 處理和 `context1m` 閘控。

    其他套件供應商也會在行為無法在系列間清晰共享時，保留傳輸特定的包裝函式為本機化。目前的範例：套件的 xAI 外掛會在其自己的
    `wrapStreamFn` 中保留原生 xAI Responses 塑形，包括 `/fast` 別名重寫、預設 `tool_stream`、不支援的嚴格工具清理，以及 xAI 特定的推理承載移除。

    `openclaw/plugin-sdk/provider-tools` 目前會公開一個共享工具架構系列以及共享架構/相容性輔助函式：

    - `ProviderToolCompatFamily` 說明了目前的共享系列清單。
    - `buildProviderToolCompatFamilyHooks("gemini")` 會為需要 Gemini 安全工具架構的供應商連接 Gemini 架構清理與診斷。
    - `normalizeGeminiToolSchemas(...)` 和 `inspectGeminiToolSchemas(...)`
      是底層的公開 Gemini 架構輔助函式。
    - `resolveXaiModelCompatPatch()` 會傳回套件的 xAI 相容性修補程式：
      `toolSchemaProfile: "xai"`、不支援的架構關鍵字、原生
      `web_search` 支援，以及 HTML 實體工具呼叫引數解碼。
    - `applyXaiModelCompat(model)` 會在解析的模型到達執行器之前，將相同的 xAI 相容性修補程式套用到該模型。

    實際的套件範例：xAI 外掛使用 `normalizeResolvedModel` 加上
    `contributeResolvedModelCompat`，讓該相容性中繼資料由供應商擁有，而不是在核心中硬編碼 xAI 規則。

    相同的套件根目錄模式也支援其他套件供應商：

    - `@openclaw/openai-provider`：`api.ts` 匯出供應商建構器、預設模型輔助函式和即時供應商建構器
    - `@openclaw/openrouter-provider`：`api.ts` 匯出供應商建構器加上上架/設定輔助函式

    <Tabs>
      <Tab title="權杖交換">
        對於需要在每次推斷呼叫前進行權杖交換的供應商：

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
        對於需要通用 HTTP 或 WebSocket 傳輸上的原生請求/工作階段標頭或中繼資料的供應商：

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
        對於公開使用量/計費資料的供應商：

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
      OpenClaw 會按此順序呼叫掛鉤。大多數供應商僅使用 2-3 個：

      | # | 掛鉤 | 使用時機 |
      | --- | --- | --- |
      | 1 | `catalog` | 模型目錄或基礎 URL 預設值 |
      | 2 | `applyConfigDefaults` | 設定具體化期間的供應商擁有全域預設值 |
      | 3 | `normalizeModelId` | 查閱前的舊版/預覽模型 ID 別名清理 |
      | 4 | `normalizeTransport` | 通用模型組裝前的供應商系列 `api` / `baseUrl` 清理 |
      | 5 | `normalizeConfig` | 正規化 `models.providers.<id>` 設定 |
      | 6 | `applyNativeStreamingUsageCompat` | 設定供應商的原生串流使用量相容性重寫 |
      | 7 | `resolveConfigApiKey` | 供應商擁有的環境標記驗證解析 |
      | 8 | `resolveSyntheticAuth` | 本機/自我託管或設定支援的合成驗證 |
      | 9 | `shouldDeferSyntheticProfileAuth` | 將合成儲存的設定檔預留位置置於環境/設定驗證之後 |
      | 10 | `resolveDynamicModel` | 接受任意的上游模型 ID |
      | 11 | `prepareDynamicModel` | 解析前的非同步中繼資料擷取 |
      | 12 | `normalizeResolvedModel` | 執行器前的傳輸重寫 |

    執行時回退備註：

    - `normalizeConfig` 會先檢查相符的供應商，然後檢查其他具有掛鉤功能的供應商外掛，直到其中一個實際變更設定為止。
      如果沒有供應商掛鉤重寫受支援的 Google 系列設定項目，套件的 Google 設定正規化器仍然會套用。
    - `resolveConfigApiKey` 會在公開時使用供應商掛鉤。套件的
      `amazon-bedrock` 路徑在這裡也有內建的 AWS 環境標標解析器，
      儘管 Bedrock 執行時驗證本身仍使用 AWS SDK 預設鏈。
      | 13 | `contributeResolvedModelCompat` | 位於另一個相容傳輸後的供應商模型相容性旗標 |
      | 14 | `capabilities` | 舊版靜態功能包；僅供相容性使用 |
      | 15 | `normalizeToolSchemas` | 註冊前的供應商擁有工具架構清理 |
      | 16 | `inspectToolSchemas` | 供應商擁有工具架構診斷 |
      | 17 | `resolveReasoningOutputMode` | 標記與原生推理輸出合約 |
      | 18 | `prepareExtraParams` | 預設請求參數 |
      | 19 | `createStreamFn` | 完全自訂的 StreamFn 傳輸 |
      | 20 | `wrapStreamFn` | 正常串流路徑上的自訂標頭/主體包裝函式 |
      | 21 | `resolveTransportTurnState` | 原生每輪標頭/中繼資料 |
      | 22 | `resolveWebSocketSessionPolicy` | 原生 WS 工作階段標頭/冷卻 |
      | 23 | `formatApiKey` | 自訂執行時權杖形狀 |
      | 24 | `refreshOAuth` | 自訂 OAuth 重新整理 |
      | 25 | `buildAuthDoctorHint` | 驗證修復指引 |
      | 26 | `matchesContextOverflowError` | 供應商擁有溢出偵測 |
      | 27 | `classifyFailoverReason` | 供應商擁有速率限制/超載分類 |
      | 28 | `isCacheTtlEligible` | 提示快取 TTL 閘控 |
      | 29 | `buildMissingAuthMessage` | 自訂缺少驗證提示 |
      | 30 | `suppressBuiltInModel` | 隱藏過時的上游資料列 |
      | 31 | `augmentModelCatalog` | 合成向前相容資料列 |
      | 32 | `isBinaryThinking` | 二進位思考開啟/關閉 |
      | 33 | `supportsXHighThinking` | `xhigh` 推理支援 |
      | 34 | `supportsAdaptiveThinking` | 自適應思考支援 |
      | 35 | `supportsMaxThinking` | `max` 推理支援 |
      | 36 | `resolveDefaultThinkingLevel` | 預設 `/think` 策略 |
      | 37 | `isModernModelRef` | 即時/冒煙模型比對 |
      | 38 | `prepareRuntimeAuth` | 推斷前的權杖交換 |
      | 39 | `resolveUsageAuth` | 自訂使用量憑證解析 |
      | 40 | `fetchUsageSnapshot` | 自訂使用量端點 |
      | 41 | `createEmbeddingProvider` | 供應商擁有記憶體/搜尋的嵌入介面卡 |
      | 42 | `buildReplayPolicy` | 自訂逐字稿重新播放/壓縮策略 |
      | 43 | `sanitizeReplayHistory` | 通用清理後的供應商特定重新播放重寫 |
      | 44 | `validateReplayTurns` | 嵌入式執行器前的嚴格重新播放輪次驗證 |
      | 45 | `onModelSelected` | 選取後回呼 (例如遙測) |

      提示微調備註：

    - `resolveSystemPromptContribution` 允許供應商為模型系列注入快取感知的系統提示指引。當行為屬於某個供應商/模型系列且應保留穩定/動態快取分割時，請優先使用它而非 `before_prompt_build`。

      如需詳細描述和實際範例，請參閱
      [內部：供應商執行時掛鉤](/zh-Hant/plugins/architecture#provider-runtime-hooks)。
    </Accordion>

  </Step>

  <Step title="Add extra capabilities (optional)">
    <a id="step-5-add-extra-capabilities"></a>
    提供者外掛程式可以註冊語音、即時轉錄、即時語音、媒體理解、影像生成、影片生成、網路擷取和網路搜尋，以及文字推論：

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
        createSession: (req) => ({
          connect: async () => {},
          sendAudio: () => {},
          close: () => {},
          isConnected: () => true,
        }),
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

    OpenClaw 將此分類為 **混合功能** 外掛程式。這是公司外掛程式的建議模式（每個供應商一個外掛程式）。請參閱 [Internals: Capability Ownership](/zh-Hant/plugins/architecture#capability-ownership-model)。

    對於影片生成，建議使用上述所示的模式感知功能形狀：`generate`、`imageToVideo` 和 `videoToVideo`。扁平聚合欄位（例如 `maxInputImages`、`maxInputVideos` 和 `maxDurationSeconds`) 不足以乾淨地宣傳轉換模式支援或已停用的模式。

    音樂生成提供者應遵循相同的模式：`generate` 用於僅提示詞生成，而 `edit` 用於基於參考影像的生成。扁平聚合欄位（例如 `maxInputImages`、`supportsLyrics` 和 `supportsFormat`) 不足以宣傳編輯支援；明確的 `generate` / `edit` 區塊才是預期的契約。

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

請勿在此使用僅限舊版技能的發布別名；外掛程式套件應使用 `clawhub package publish`。

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

- [頻道外掛程式](/zh-Hant/plugins/sdk-channel-plugins) — 如果您的外掛程式也提供頻道
- [SDK 執行時期](/zh-Hant/plugins/sdk-runtime) — `api.runtime` 協助程式 (TTS、搜尋、subagent)
- [SDK 概覽](/zh-Hant/plugins/sdk-overview) — 完整的子路徑匯入參考
- [外掛程式內部機制](/zh-Hant/plugins/architecture#provider-runtime-hooks) — Hook 詳細資訊和隨附範例
