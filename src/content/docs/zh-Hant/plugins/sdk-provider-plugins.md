---
title: "建置 Provider 外掛程式"
sidebarTitle: "Provider 外掛程式"
summary: "為 OpenClaw 建模型 Provider 外掛程式的逐步指南"
read_when:
  - You are building a new model provider plugin
  - You want to add an OpenAI-compatible proxy or custom LLM to OpenClaw
  - You need to understand provider auth, catalogs, and runtime hooks
---

# 建置提供者外掛程式

本指南將逐步引導您建置一個提供者外掛程式，該外掛程式會將模型提供者
(LLM) 新增至 OpenClaw。最後，您將擁有一個包含模型目錄、
API 金鑰驗證以及動態模型解析的提供者。

<Info>如果您之前尚未建置任何 OpenClaw 外掛程式，請先閱讀 [入門指南](/en/plugins/building-plugins) 以了解基本的套件 結構與資訊清單設定。</Info>

## 逐步演练

<Steps>
  <a id="step-1-package-and-manifest"></a>
  <Step title="套件與 manifest">
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

    Manifest 宣告了 `providerAuthEnvVars`，讓 OpenClaw 能夠在
    不載入您的外掛程式執行時期的情況下偵測認證資訊。`modelSupport` 是選用的，
    讓 OpenClaw 能在執行時期 Hook 存在之前，透過如 `acme-large` 的簡寫模型 ID
    自動載入您的 Provider 外掛程式。如果您在 ClawHub 上發布此
    Provider，那些 `openclaw.compat` 和 `openclaw.build` 欄位
    在 `package.json` 中是必填的。

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

    這就是一個可用的提供者。使用者現在可以
    `openclaw onboard --acme-ai-api-key <key>` 並選擇
    `acme-ai/acme-large` 作為他們的模型。

    對於僅註冊一個使用 API 金鑰驗證的文本提供者以及單一目錄支援運行時的打包提供者，請優先使用更狹隘的
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
        },
      },
    });
    ```

    如果您的驗證流程還需要在入門期間修改 `models.providers.*`、別名和代理預設模型，請使用
    `openclaw/plugin-sdk/provider-onboard` 中的預設輔助函式。最狹隘的輔助函式是
    `createDefaultModelPresetAppliers(...)`、
    `createDefaultModelsPresetAppliers(...)` 和
    `createModelCatalogPresetAppliers(...)`。

    當提供者的原生端點支援在普通 `openai-completions` 傳輸上進行串流使用區塊時，請優先使用 `openclaw/plugin-sdk/provider-catalog-shared` 中的共享目錄輔助函式，而不是硬編碼提供者 ID 檢查。`supportsNativeStreamingUsageCompat(...)` 和
    `applyProviderNativeStreamingUsageCompat(...)` 會從端點功能映射中偵測支援情況，因此原生 Moonshot/DashScope 風格的端點即使在使用自訂提供者 ID 時仍會選擇加入。

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

    如果解析需要網路呼叫，請使用 `prepareDynamicModel` 進行非同步
    預熱 — `resolveDynamicModel` 會在完成後再次執行。

  </Step>

  <Step title="新增執行時鉤子（視需要）">
    大多數供應商僅需 `catalog` + `resolveDynamicModel`。請根據供應商需求逐步新增鉤子。

    共用的輔助建構器現在已涵蓋最常見的重新播放/工具相容家族，因此外掛程式通常不需要逐一手動連接每個鉤子：

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

    目前可用的重新播放家族：

    | 家族 | 內容 |
    | --- | --- |
    | `openai-compatible` | 適用於 OpenAI 相容傳輸的共用 OpenAI 風格重新播放原則，包括 tool-call-id 清理、assistant-first 排序修復，以及傳輸需要時的通用 Gemini-turn 驗證 |
    | `anthropic-by-model` | 由 `modelId` 選擇的 Claude 感知重新播放原則，因此 Anthropic-message 傳輸僅在解析出的模型實際上是 Claude id 時才會獲得 Claude 專用的思考區塊清理 |
    | `google-gemini` | 原生 Gemini 重新播放原則，加上啟動重新播放清理和標記的推理輸出模式 |
    | `passthrough-gemini` | 針對透過 OpenAI 相容代理傳輸執行的 Gemini 模型進行 Gemini 思考簽章清理；不啟用原生 Gemini 重新播放驗證或啟動重寫 |
    | `hybrid-anthropic-openai` | 針對在一個外掛程式中混合 Anthropic-message 和 OpenAI 相容模型介面的供應商的混合原則；選用的僅限 Claude 思考區塊捨棄保持範圍在 Anthropic 端 |

    真實的捆綁範例：

    - `google` 和 `google-gemini-cli`：`google-gemini`
    - `openrouter`、`kilocode`、`opencode` 和 `opencode-go`：`passthrough-gemini`
    - `amazon-bedrock` 和 `anthropic-vertex`：`anthropic-by-model`
    - `minimax`：`hybrid-anthropic-openai`
    - `moonshot`、`ollama`、`xai` 和 `zai`：`openai-compatible`

    目前可用的串流家族：

    | 家族 | 內容 |
    | --- | --- |
    | `google-thinking` | 在共用串流路徑上的 Gemini 思考承載正規化 |
    | `kilocode-thinking` | 在共用代理串流路徑上的 Kilo 推理包裝器，具有 `kilo/auto` 和不支援的代理推理 id 會跳過注入的思考 |
    | `moonshot-thinking` | 從設定 + `/think` 層級進行的 Moonshot 二進位原生思考承載對應 |
    | `minimax-fast-mode` | 在共用串流路徑上的 MiniMax 快速模式模型重寫 |
    | `openai-responses-defaults` | 共用的原生 OpenAI/Codex Responses 包裝器：歸因標頭、`/fast`/`serviceTier`、文字詳細程度、原生 Codex 網路搜尋、推理相容承載塑形以及 Responses 上下文管理 |
    | `openrouter-thinking` | 用於代理路由的 OpenRouter 推理包裝器，由中央處理不支援的模型/`auto` 跳過 |
    | `tool-stream-default-on` | 針對像 Z.AI 這類供應商的預設開啟 `tool_stream` 包裝器，除非明確停用否則它們需要工具串流 |

    真實的捆綁範例：

    - `google` 和 `google-gemini-cli`：`google-thinking`
    - `kilocode`：`kilocode-thinking`
    - `moonshot`：`moonshot-thinking`
    - `minimax` 和 `minimax-portal`：`minimax-fast-mode`
    - `openai` 和 `openai-codex`：`openai-responses-defaults`
    - `openrouter`：`openrouter-thinking`
    - `zai`：`tool-stream-default-on`

    `openclaw/plugin-sdk/provider-model-shared` 也會匯出重新播放家族列舉，以及建構這些家族所依據的共用輔助程式。常見的公開匯出包括：

    - `ProviderReplayFamily`
    - `buildProviderReplayFamilyHooks(...)`
    - 共用的重新播放建構器，例如 `buildOpenAICompatibleReplayPolicy(...)`、
      `buildAnthropicReplayPolicyForModel(...)`、
      `buildGoogleGeminiReplayPolicy(...)` 和
      `buildHybridAnthropicOrOpenAIReplayPolicy(...)`
    - Gemini 重新播放輔助程式，例如 `sanitizeGoogleGeminiReplayHistory(...)`
      和 `resolveTaggedReasoningOutputMode()`
    - 端點/模型輔助程式，例如 `resolveProviderEndpoint(...)`、
      `normalizeProviderId(...)`、`normalizeGooglePreviewModelId(...)` 和
      `normalizeNativeXaiModelId(...)`

    `openclaw/plugin-sdk/provider-stream` 會公開家族建構器，以及這些家族重複使用的公開包裝器輔助程式。常見的公開匯出包括：

    - `ProviderStreamFamily`
    - `buildProviderStreamFamilyHooks(...)`
    - `composeProviderStreamWrappers(...)`
    - 共用的 OpenAI/Codex 包裝器，例如
      `createOpenAIAttributionHeadersWrapper(...)`、
      `createOpenAIFastModeWrapper(...)`、
      `createOpenAIServiceTierWrapper(...)`、
      `createOpenAIResponsesContextManagementWrapper(...)` 和
      `createCodexNativeWebSearchWrapper(...)`
    - 共用的代理/供應商包裝器，例如 `createOpenRouterWrapper(...)`、
      `createToolStreamWrapper(...)` 和 `createMinimaxFastModeWrapper(...)`

    某些串流輔助程式會故意保持供應商本地化。目前的捆綁範例：`@openclaw/anthropic-provider` 會從其公開 `api.ts` /
    `contract-api.ts` 縫合匯出
    `wrapAnthropicProviderStream`、`resolveAnthropicBetas`、
    `resolveAnthropicFastMode`、`resolveAnthropicServiceTier` 以及較低層級的 Anthropic 包裝器建構器。由於這些輔助程式也編碼了 Claude OAuth 測試版處理和 `context1m` 閘控，因此它們仍然特定於 Anthropic。

    當行為無法在家族之間乾淨地共用時，其他捆綁的供應商也會將傳輸特定的包裝器保持為本地化。目前的範例：
    捆綁的 xAI 外掛程式會將原生 xAI Responses 塑形保留在其自己的
    `wrapStreamFn` 中，包括 `/fast` 別名重寫、預設 `tool_stream`、
    不支援的嚴格工具清理以及 xAI 特定的推理承載移除。

    `openclaw/plugin-sdk/provider-tools` 目前會公開一個共用的
    工具架構家族以及共用的架構/相容輔助程式：

    - `ProviderToolCompatFamily` 記載了目前的共用家族清單。
    - `buildProviderToolCompatFamilyHooks("gemini")` 會為需要 Gemini 安全工具架構的供應商連接 Gemini 架構
      清理 + 診斷。
    - `normalizeGeminiToolSchemas(...)` 和 `inspectGeminiToolSchemas(...)`
      是底層的公開 Gemini 架構輔助程式。
    - `resolveXaiModelCompatPatch()` 會傳回捆綁的 xAI 相容修補程式：
      `toolSchemaProfile: "xai"`、不支援的架構關鍵字、原生
      `web_search` 支援以及 HTML 實體工具呼叫引數解碼。
    - `applyXaiModelCompat(model)` 會在解析出的模型到達執行器之前，將相同的 xAI 相容修補程式套用到該模型。

    真實的捆綁範例：xAI 外掛程式使用 `normalizeResolvedModel` 加上
    `contributeResolvedModelCompat`，讓該相容中繼資料由
    供應商擁有，而不是在核心中硬編碼 xAI 規則。

    相同的套件根目錄模式也支援其他捆綁的供應商：

    - `@openclaw/openai-provider`：`api.ts` 匯出供應商建構器、
      預設模型輔助程式和即時供應商建構器
    - `@openclaw/openrouter-provider`：`api.ts` 匯出供應商建構器
      加上上架/設定輔助程式

    <Tabs>
      <Tab title="Token 交換">
        針對需要在每次推斷呼叫前進行 token 交換的供應商：

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
      <Tab title="原生傳輸身分識別">
        針對需要在通用 HTTP 或 WebSocket 傳輸上使用原生請求/工作階段標頭或中繼資料的供應商：

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
      <Tab title="用量與計費">
        針對公開用量/計費資料的供應商：

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
      OpenClaw 會依此順序呼叫鉤子。大多數供應商僅使用 2-3 個：

      | # | 鉤子 | 使用時機 |
      | --- | --- | --- |
      | 1 | `catalog` | 模型目錄或基底 URL 預設值 |
      | 2 | `applyConfigDefaults` | 在設定具象化期間供應商擁有的全域預設值 |
      | 3 | `normalizeModelId` | 查閱前的舊版/預覽模型 ID 別名清理 |
      | 4 | `normalizeTransport` | 在通用模型組裝前的供應商家族 `api` / `baseUrl` 清理 |
      | 5 | `normalizeConfig` | 正規化 `models.providers.<id>` 設定 |
      | 6 | `applyNativeStreamingUsageCompat` | 針對設定供應商的原生串流用量相容重寫 |
      | 7 | `resolveConfigApiKey` | 供應商擁有的環境標記驗證解析 |
      | 8 | `resolveSyntheticAuth` | 本地/自託管或設定支援的合成驗證 |
      | 9 | `shouldDeferSyntheticProfileAuth` | 將合成的已儲存設定檔預留位置降低至環境/設定驗證之後 |
      | 10 | `resolveDynamicModel` | 接受任意上游模型 ID |
      | 11 | `prepareDynamicModel` | 解析前的非同步中繼資料擷取 |
      | 12 | `normalizeResolvedModel` | 執行器前的傳輸重寫 |

    執行時回退備註：

    - `normalizeConfig` 會先檢查相符的供應商，然後檢查其他
      具備鉤子功能的供應商外掛程式，直到其中一個實際變更設定為止。
      如果沒有供應商鉤子重寫支援的 Google 家族設定項目，
      捆綁的 Google 設定正規化器仍會套用。
    - `resolveConfigApiKey` 會在公開時使用供應商鉤子。捆綁的
      `amazon-bedrock` 路徑在此處也有內建的 AWS 環境標標解析器，
      儘管 Bedrock 執行時驗證本身仍使用 AWS SDK 預設鏈。
      | 13 | `contributeResolvedModelCompat` | 位於另一個相容傳輸後方的供應商模型的相容旗標 |
      | 14 | `capabilities` | 舊版靜態功能包；僅供相容性使用 |
      | 15 | `normalizeToolSchemas` | 註冊前的供應商擁有工具架構清理 |
      | 16 | `inspectToolSchemas` | 供應商擁有的工具架構診斷 |
      | 17 | `resolveReasoningOutputMode` | 標記與原生推理輸出合約 |
      | 18 | `prepareExtraParams` | 預設請求參數 |
      | 19 | `createStreamFn` | 完全自訂的 StreamFn 傳輸 |
      | 20 | `wrapStreamFn` | 在一般串流路徑上的自訂標頭/主體包裝器 |
      | 21 | `resolveTransportTurnState` | 原生每個回合的標頭/中繼資料 |
      | 22 | `resolveWebSocketSessionPolicy` | 原生 WS 工作階段標頭/冷卻 |
      | 23 | `formatApiKey` | 自訂執行時 token 形狀 |
      | 24 | `refreshOAuth` | 自訂 OAuth 重新整理 |
      | 25 | `buildAuthDoctorHint` | 驗證修復指引 |
      | 26 | `matchesContextOverflowError` | 供應商擁有的溢出偵測 |
      | 27 | `classifyFailoverReason` | 供應商擁有的速率限制/超載分類 |
      | 28 | `isCacheTtlEligible` | 提示快取 TTL 閘控 |
      | 29 | `buildMissingAuthMessage` | 自訂缺少驗證提示 |
      | 30 | `suppressBuiltInModel` | 隱藏過時的上游資料列 |
      | 31 | `augmentModelCatalog` | 合成的向前相容資料列 |
      | 32 | `isBinaryThinking` | 二進位思考開啟/關閉 |
      | 33 | `supportsXHighThinking` | `xhigh` 推理支援 |
      | 34 | `resolveDefaultThinkingLevel` | 預設 `/think` 原則 |
      | 35 | `isModernModelRef` | 即時/冒煙模型比對 |
      | 36 | `prepareRuntimeAuth` | 推斷前的 token 交換 |
      | 37 | `resolveUsageAuth` | 自訂用量憑證剖析 |
      | 38 | `fetchUsageSnapshot` | 自訂用量端點 |
      | 39 | `createEmbeddingProvider` | 供應商擁有的記憶體/搜尋嵌入配接器 |
      | 40 | `buildReplayPolicy` | 自訂逐字稿重新播放/壓縮原則 |
      | 41 | `sanitizeReplayHistory` | 通用清理後的供應商特定重新播放重寫 |
      | 42 | `validateReplayTurns` | 內嵌執行器前的嚴格重新播放回合驗證 |
      | 43 | `onModelSelected` | 選取後回呼 (例如遙測) |

      提示微調備註：

      - `resolveSystemPromptContribution` 讓供應商可以為模型家族
        注入具快取感知能力的系統提示指引。當該行為屬於某個供應商/模型
        家族，且應保留穩定/動態快取分割時，請優先選用它，而不是
        `before_prompt_build`。

      如需詳細描述和真實範例，請參閱
      [內部：供應商執行時鉤子](/en/plugins/architecture#provider-runtime-hooks)。
    </Accordion>

  </Step>

  <Step title="新增額外功能（可選）">
    <a id="step-5-add-extra-capabilities"></a>
    提供者外掛程式除了文字推斷外，還可以註冊語音、即時轉錄、即時語音、媒體理解、影像生成、影片生成、網頁擷取和網頁搜尋：

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

    OpenClaw 將此歸類為 **混合功能 (hybrid-capability)** 外掛程式。這是公司外掛程式的建議模式（每個供應商一個外掛程式）。請參閱 [內部：功能擁有權](/en/plugins/architecture#capability-ownership-model)。

    對於影片生成，建議優先採用上述所示的模式感知功能形狀：
    `generate`、`imageToVideo` 和 `videoToVideo`。平面聚合欄位如
    `maxInputImages`、`maxInputVideos` 和 `maxDurationSeconds` 不足以清晰地宣傳轉換模式支援或已停用的模式。

    音樂生成提供者應遵循相同的模式：
    `generate` 用於僅提示詞生成，而 `edit` 用於基於參考影像的
    生成。平面聚合欄位如 `maxInputImages`、
    `supportsLyrics` 和 `supportsFormat` 不足以宣傳編輯
    支援；明確的 `generate` / `edit` 區塊才是預期的契約。

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

供應商外掛程式的發佈方式與任何其他外部程式碼外掛程式相同：

```bash
clawhub package publish your-org/your-plugin --dry-run
clawhub package publish your-org/your-plugin
```

請勿在此處使用舊版僅限技能的發布別名；外掛程式套件應使用
`clawhub package publish`。

## 檔案結構

```
<bundled-plugin-root>/acme-ai/
├── package.json              # openclaw.providers metadata
├── openclaw.plugin.json      # Manifest with providerAuthEnvVars
├── index.ts                  # definePluginEntry + registerProvider
└── src/
    ├── provider.test.ts      # Tests
    └── usage.ts              # Usage endpoint (optional)
```

## 目錄順序參考

`catalog.order` 控制您的目錄相對於內建提供者的合併時機：

| 順序      | 時機       | 使用案例                             |
| --------- | ---------- | ------------------------------------ |
| `simple`  | 第一階段   | 純 API 金鑰供應商                    |
| `profile` | 簡單之後   | 基於設定檔限制存取的供應商           |
| `paired`  | 設定檔之後 | 綜合多個相關項目                     |
| `late`    | 最後階段   | 覆寫現有供應商（衝突時以本設定為準） |

## 後續步驟

- [頻道外掛程式](/en/plugins/sdk-channel-plugins) — 如果您的外掛程式也提供頻道
- [SDK 執行時期](/en/plugins/sdk-runtime) — `api.runtime` 協助程式（TTS、搜尋、子代理程式）
- [SDK 概覽](/en/plugins/sdk-overview) — 完整的子路徑匯入參考
- [外掛程式內部](/en/plugins/architecture#provider-runtime-hooks) — Hook 詳細資訊與附帶範例
