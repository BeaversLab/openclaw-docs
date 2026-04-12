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

<Info>如果您以前未曾建置過任何 OpenClaw 外掛程式，請先閱讀 [入門指南](/en/plugins/building-plugins) 以了解基本套件 結構和清單設定。</Info>

<Tip>提供者外掛程式會將模型新增至 OpenClaw 的常態推論迴圈中。如果模型 必須透過擁有執行緒、壓縮或工具事件的原生代理程式常駐程式來執行，請將提供者與 [agent harness](/en/plugins/sdk-agent-harness) 配對，而不是將常駐程式通訊協定詳細資料放在核心中。</Tip>

## 逐步解說

<Steps>
  <a id="step-1-package-and-manifest"></a>
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

    清單會宣告 `providerAuthEnvVars`，因此 OpenClaw 可以在
    不載入您的外掛程式執行時間的情況下偵測認證。當提供者變體應該重複使用另一個提供者 ID 的認證時，請新增 `providerAuthAliases`
    。 `modelSupport`
    是選用的，它讓 OpenClaw 可以在執行時間掛鉤存在之前，從簡寫模型 ID (例如 `acme-large`) 自動載入您的提供者外掛程式。如果您將
    提供者發佈在 ClawHub 上，則 `package.json` 中的那些 `openclaw.compat` 和 `openclaw.build` 欄位
    是必要的。

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

    這就是一個可運作的提供者。使用者現在可以 `openclaw onboard --acme-ai-api-key <key>` 並選擇
    `acme-ai/acme-large` 作為他們的模型。

    如果上游提供者使用的控制權杖與 OpenClaw 不同，請新增一個
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

    `input` 會在傳輸前重寫最終的系統提示詞和文字訊息內容。`output` 會在 OpenClaw 解析自己的控制標記或通道傳遞之前，重寫助理文字增量和最終文字。

    對於僅註冊一個具有 API 金鑰驗證的文字提供者和單一目錄支援的執行時的打包提供者，請優先使用更狹隘的
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

    如果您的驗證流程還需要在入門期間修補 `models.providers.*`、別名和
    代理預設模型，請使用來自 `openclaw/plugin-sdk/provider-onboard` 的預設輔助函式。最狹隘的輔助函式是
    `createDefaultModelPresetAppliers(...)`、
    `createDefaultModelsPresetAppliers(...)` 和
    `createModelCatalogPresetAppliers(...)`。

    當提供者的原生端點在正常的 `openai-completions` 傳輸上支援串流使用區塊時，請優先使用 `openclaw/plugin-sdk/provider-catalog-shared` 中的共享目錄輔助函式，而不是硬編碼提供者 ID 檢查。`supportsNativeStreamingUsageCompat(...)` 和
    `applyProviderNativeStreamingUsageCompat(...)` 會從端點功能映射中檢測支援，因此原生 Moonshot/DashScope 風格的端點仍會選擇加入，即使外掛使用的是自訂提供者 ID。

  </Step>

  <Step title="新增動態模型解析">
    如果您的提供者接受任意的模型 ID（例如代理或路由器），
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
    預熱 —— `resolveDynamicModel` 會在完成後再次執行。

  </Step>

  <Step title="新增執行時鉤子（視需要）">
    大多數供應商僅需要 `catalog` + `resolveDynamicModel`。請根據供應商的需求逐步新增鉤子。

    共用輔助建構器現在涵蓋了最常見的 replay/tool-compat 系列，因此外掛通常不需要手動逐一連接每個鉤子：

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

    | 系列 | 其連接內容 |
    | --- | --- |
    | `openai-compatible` | 適用於 OpenAI 相容傳輸的共用 OpenAI 風格 replay 原則，包括 tool-call-id 清理、assistant-first 排序修正，以及在傳輸需要時進行通用 Gemini-turn 驗證 |
    | `anthropic-by-model` | 由 `modelId` 選擇的 Claude 感知 replay 原則，因此 Anthropic-message 傳輸僅在解析出的模型實際為 Claude ID 時才會獲得 Claude 特定的思考區塊清理 |
    | `google-gemini` | 原生 Gemini replay 原則加上 bootstrap replay 清理和標記 reasoning-output 模式 |
    | `passthrough-gemini` | 針對透過 OpenAI 相容代理傳輸執行的 Gemini 模型進行 Gemini thought-signature 清理；不啟用原生 Gemini replay 驗證或 bootstrap 重寫 |
    | `hybrid-anthropic-openai` | 針對在一個外掛中混合 Anthropic-message 和 OpenAI 相容模型介面的供應商的混合原則；可選的僅 Claude thinking-block 移除僅限於 Anthropic 端 |

    實際打包範例：

    - `google` 和 `google-gemini-cli`：`google-gemini`
    - `openrouter`、`kilocode`、`opencode` 和 `opencode-go`：`passthrough-gemini`
    - `amazon-bedrock` 和 `anthropic-vertex`：`anthropic-by-model`
    - `minimax`：`hybrid-anthropic-openai`
    - `moonshot`、`ollama`、`xai` 和 `zai`：`openai-compatible`

    目前可用的 stream 系列：

    | 系列 | 其連接內容 |
    | --- | --- |
    | `google-thinking` | 共用 stream 路徑上的 Gemini thinking payload 正規化 |
    | `kilocode-thinking` | 共用代理 stream 路徑上的 Kilo reasoning 包裝器，`kilo/auto` 和不支援的代理 reasoning ID 會跳過注入的 thinking |
    | `moonshot-thinking` | 來自設定 + `/think` 層級的 Moonshot 二進位原生 thinking payload 對應 |
    | `minimax-fast-mode` | 共用 stream 路徑上的 MiniMax 快速模式模型重寫 |
    | `openai-responses-defaults` | 共用原生 OpenAI/Codex Responses 包裝器：歸因標頭、`/fast`/`serviceTier`、文字詳細程度、原生 Codex 網路搜尋、reasoning-compat payload 塑形，以及 Responses 上下文管理 |
    | `openrouter-thinking` | 用於代理路由的 OpenRouter reasoning 包裝器，由中央處理不支援的模型/`auto` 跳過 |
    | `tool-stream-default-on` | 預設開啟的 `tool_stream` 包裝器，適用於像 Z.AI 這樣除非明確停用否則希望使用工具串流的供應商 |

    實際打包範例：

    - `google` 和 `google-gemini-cli`：`google-thinking`
    - `kilocode`：`kilocode-thinking`
    - `moonshot`：`moonshot-thinking`
    - `minimax` 和 `minimax-portal`：`minimax-fast-mode`
    - `openai` 和 `openai-codex`：`openai-responses-defaults`
    - `openrouter`：`openrouter-thinking`
    - `zai`：`tool-stream-default-on`

    `openclaw/plugin-sdk/provider-model-shared` 也會匯出 replay-family 列舉以及構建這些系列的共用輔助程式。常見的公開匯出包括：

    - `ProviderReplayFamily`
    - `buildProviderReplayFamilyHooks(...)`
    - 共用 replay 建構器，例如 `buildOpenAICompatibleReplayPolicy(...)`、
      `buildAnthropicReplayPolicyForModel(...)`、
      `buildGoogleGeminiReplayPolicy(...)` 和
      `buildHybridAnthropicOrOpenAIReplayPolicy(...)`
    - Gemini replay 輔助程式，例如 `sanitizeGoogleGeminiReplayHistory(...)`
      和 `resolveTaggedReasoningOutputMode()`
    - endpoint/model 輔助程式，例如 `resolveProviderEndpoint(...)`、
      `normalizeProviderId(...)`、`normalizeGooglePreviewModelId(...)` 和
      `normalizeNativeXaiModelId(...)`

    `openclaw/plugin-sdk/provider-stream` 公開系列建構器以及這些系列重複使用的公開包裝器輔助程式。常見的公開匯出包括：

    - `ProviderStreamFamily`
    - `buildProviderStreamFamilyHooks(...)`
    - `composeProviderStreamWrappers(...)`
    - 共用 OpenAI/Codex 包裝器，例如
      `createOpenAIAttributionHeadersWrapper(...)`、
      `createOpenAIFastModeWrapper(...)`、
      `createOpenAIServiceTierWrapper(...)`、
      `createOpenAIResponsesContextManagementWrapper(...)` 和
      `createCodexNativeWebSearchWrapper(...)`
    - 共用代理/供應商包裝器，例如 `createOpenRouterWrapper(...)`、
      `createToolStreamWrapper(...)` 和 `createMinimaxFastModeWrapper(...)`

    某些 stream 輔助程式刻意保持供應商本地化。目前的打包範例：`@openclaw/anthropic-provider` 匯出
    `wrapAnthropicProviderStream`、`resolveAnthropicBetas`、
    `resolveAnthropicFastMode`、`resolveAnthropicServiceTier`，以及來自其公開 `api.ts` /
    `contract-api.ts` 縫合處的低階 Anthropic 包裝器建構器。這些輔助程式保持 Anthropic 特有，因為它們也編碼了 Claude OAuth beta 處理和 `context1m` 閘控。

    其他打包供應商在行為未在各系列間乾淨共用時，也會保留傳輸特定的包裝器為本地。目前的範例：打包的 xAI 外掛在其自己的
    `wrapStreamFn` 中保留原生 xAI Responses 塑形，包括 `/fast` 別名重寫、預設 `tool_stream`、
    不支援的 strict-tool 清理，以及 xAI 特定的 reasoning-payload 移除。

    `openclaw/plugin-sdk/provider-tools` 目前公開一個共用 tool-schema 系列以及共用 schema/compat 輔助程式：

    - `ProviderToolCompatFamily` 記錄了目前的共用系列清單。
    - `buildProviderToolCompatFamilyHooks("gemini")` 為需要 Gemini-safe tool schemas 的供應商連接 Gemini schema 清理 + 診斷。
    - `normalizeGeminiToolSchemas(...)` 和 `inspectGeminiToolSchemas(...)`
      是底層的公開 Gemini schema 輔助程式。
    - `resolveXaiModelCompatPatch()` 傳回打包的 xAI compat 修補程式：
      `toolSchemaProfile: "xai"`、不支援的 schema 關鍵字、原生
      `web_search` 支援，以及 HTML 實體 tool-call 引數解碼。
    - `applyXaiModelCompat(model)` 在解析出的模型到達執行器之前套用相同的 xAI compat 修補程式。

    實際打包範例：xAI 外掛使用 `normalizeResolvedModel` 加上
    `contributeResolvedModelCompat`，將該 compat 中繼資料保留為供應商所有，而不是在核心中硬編碼 xAI 規則。

    相同的 package-root 模式也支援其他打包供應商：

    - `@openclaw/openai-provider`：`api.ts` 匯出供應商建構器、
      預設模型輔助程式和即時供應商建構器
    - `@openclaw/openrouter-provider`：`api.ts` 匯出供應商建構器
      以及 onboard/config 輔助程式

    <Tabs>
      <Tab title="Token 交換">
        對於在每次推論呼叫前需要 token 交換的供應商：

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
        對於需要自訂要求標頭或主體修改的供應商：

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
        對於在通用 HTTP 或 WebSocket 傳輸上需要原生要求/會話標頭或中繼資料的供應商：

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
        對於公開用量/計費資料的供應商：

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
      OpenClaw 依此順序呼叫鉤子。大多數供應商僅使用 2-3 個：

      | # | 鉤子 | 何時使用 |
      | --- | --- | --- |
      | 1 | `catalog` | 模型目錄或基礎 URL 預設值 |
      | 2 | `applyConfigDefaults` | 設定具象化期間的供應商擁有的全域預設值 |
      | 3 | `normalizeModelId` | 查閱前的舊版/預覽 model-id 別名清理 |
      | 4 | `normalizeTransport` | 通用模型組裝前的供應商系列 `api` / `baseUrl` 清理 |
      | 5 | `normalizeConfig` | 正規化 `models.providers.<id>` 設定 |
      | 6 | `applyNativeStreamingUsageCompat` | 設定供應商的原生串流用量相容重寫 |
      | 7 | `resolveConfigApiKey` | 供應商擁有的 env-marker auth 解析 |
      | 8 | `resolveSyntheticAuth` | 本地/自託管或設定支援的合成 auth |
      | 9 | `shouldDeferSyntheticProfileAuth` | 將合成 stored-profile 預留位置置於 env/config auth 之後 |
      | 10 | `resolveDynamicModel` | 接受任意上游模型 ID |
      | 11 | `prepareDynamicModel` | 解析前的非同步中繼資料擷取 |
      | 12 | `normalizeResolvedModel` | 執行器前的傳輸重寫 |

    執行時後備備註：

    - `normalizeConfig` 會先檢查相符的供應商，然後檢查其他具備鉤子能力的供應商外掛，直到其中一個實際變更設定為止。
      如果沒有供應商鉤子重寫支援的 Google 系列設定項目，打包的 Google 設定正規化器仍會套用。
    - `resolveConfigApiKey` 會在公開時使用供應商鉤子。打包的
      `amazon-bedrock` 路徑在此也有內建的 AWS env-marker 解析器，
      儘管 Bedrock 執行時 auth 本身仍使用 AWS SDK 預設鏈。
      | 13 | `contributeResolvedModelCompat` | 位於另一個相容傳輸後方的廠商模型相容旗標 |
      | 14 | `capabilities` | 舊版靜態功能包；僅供相容性使用 |
      | 15 | `normalizeToolSchemas` | 註冊前的供應商擁有 tool-schema 清理 |
      | 16 | `inspectToolSchemas` | 供應商擁有 tool-schema 診斷 |
      | 17 | `resolveReasoningOutputMode` | 標記與原生 reasoning-output 合約 |
      | 18 | `prepareExtraParams` | 預設要求參數 |
      | 19 | `createStreamFn` | 完全自訂的 StreamFn 傳輸 |
      | 20 | `wrapStreamFn` | 正常 stream 路徑上的自訂標頭/主體包裝器 |
      | 21 | `resolveTransportTurnState` | 原生 per-turn 標頭/中繼資料 |
      | 22 | `resolveWebSocketSessionPolicy` | 原生 WS 會話標頭/cool-down |
      | 23 | `formatApiKey` | 自訂執行時 token 形狀 |
      | 24 | `refreshOAuth` | 自訂 OAuth 重新整理 |
      | 25 | `buildAuthDoctorHint` | Auth 修復指引 |
      | 26 | `matchesContextOverflowError` | 供應商擁有的溢出偵測 |
      | 27 | `classifyFailoverReason` | 供應商擁有的速率限制/過載分類 |
      | 28 | `isCacheTtlEligible` | 提示快取 TTL 閘控 |
      | 29 | `buildMissingAuthMessage` | 自訂缺少 auth 提示 |
      | 30 | `suppressBuiltInModel` | 隱藏過時的上游資料列 |
      | 31 | `augmentModelCatalog` | 合成向前相容資料列 |
      | 32 | `isBinaryThinking` | 二進位思考 開啟/關閉 |
      | 33 | `supportsXHighThinking` | `xhigh` reasoning 支援 |
      | 34 | `resolveDefaultThinkingLevel` | 預設 `/think` 原則 |
      | 35 | `isModernModelRef` | 即時/測試 模型比對 |
      | 36 | `prepareRuntimeAuth` | 推論前的 token 交換 |
      | 37 | `resolveUsageAuth` | 自訂用量憑證解析 |
      | 38 | `fetchUsageSnapshot` | 自訂用量端點 |
      | 39 | `createEmbeddingProvider` | 供應商擁有的嵌入介面卡，用於記憶/搜尋 |
      | 40 | `buildReplayPolicy` | 自訂逐字稿 replay/壓縮原則 |
      | 41 | `sanitizeReplayHistory` | 通用清理後的供應商特定 replay 重寫 |
      | 42 | `validateReplayTurns` | 內嵌執行器前的嚴格 replay-turn 驗證 |
      | 43 | `onModelSelected` | 選取後回呼 (例如遙測) |

      提示調整備註：

      - `resolveSystemPromptContribution` 允許供應商為模型系列注入具備快取感知能力的
        系統提示指引。當行為屬於單一供應商/模型系列且應保留穩定/動態快取分割時，請優先使用它而非
        `before_prompt_build`。

      如需詳細描述和真實範例，請參閱
      [內部：供應商執行時鉤子](/en/plugins/architecture#provider-runtime-hooks)。
    </Accordion>

  </Step>

  <Step title="Add extra capabilities (optional)">
    <a id="step-5-add-extra-capabilities"></a>
    提供者外掛程式除了文字推論外，還可以註冊語音、即時轉錄、即時語音、媒體理解、影像生成、影片生成、網頁擷取和網頁搜尋功能：

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

    OpenClaw 將此歸類為 **hybrid-capability**（混合功能）外掛程式。這是公司外掛程式的建議模式（每個供應商一個外掛程式）。請參閱 [Internals: Capability Ownership](/en/plugins/architecture#capability-ownership-model)。

    對於影片生成，建議優先使用上面顯示的模式感知功能形狀：`generate`、`imageToVideo` 和 `videoToVideo`。扁平聚合欄位（如 `maxInputImages`、`maxInputVideos` 和 `maxDurationSeconds`）不足以乾淨地通告轉換模式支援或已停用的模式。

    音樂生成提供者應遵循相同的模式：`generate` 用於僅提示詞生成，而 `edit` 用於基於參考影像的生成。扁平聚合欄位（如 `maxInputImages`、`supportsLyrics` 和 `supportsFormat`）不足以通告編輯支援；顯式的 `generate` / `edit` 區塊才是預期的合約。

  </Step>

  <Step title="Test">
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

提供者外掛程式的發佈方式與任何其他外部程式碼外掛程式相同：

```bash
clawhub package publish your-org/your-plugin --dry-run
clawhub package publish your-org/your-plugin
```

請勿在此處使用舊版僅限技能的發佈別名；外掛程式套件應使用
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

`catalog.order` 控制您的目錄相對於內建提供者的合併時機：

| 順序      | 時機         | 使用案例                           |
| --------- | ------------ | ---------------------------------- |
| `simple`  | 初次通過     | 純 API 金鑰提供者                  |
| `profile` | 在簡單之後   | 基於設定檔的驗證提供者             |
| `paired`  | 在設定檔之後 | 綜合多個相關項目                   |
| `late`    | 最後一輪     | 覆蓋現有的提供商（發生衝突時優先） |

## 下一步

- [通道插件](/en/plugins/sdk-channel-plugins) — 如果您的插件還提供了一個通道
- [SDK 執行時](/en/plugins/sdk-runtime) — `api.runtime` 輔助工具（TTS、搜尋、子代理）
- [SDK 概覽](/en/plugins/sdk-overview) — 完整的子路徑匯入參考
- [插件內部機制](/en/plugins/architecture#provider-runtime-hooks) — 掛鉤詳細資訊和內建範例
