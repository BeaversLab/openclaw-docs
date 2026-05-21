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

<Info>如果您之前尚未建構過任何 OpenClaw 外掛程式，請先閱讀 [Getting Started](/zh-Hant/plugins/building-plugins) 以了解基本的套件 結構和清單設定。</Info>

<Tip>提供者外掛程式會將模型加入 OpenClaw 的正常推論迴圈中。如果模型 必須透過擁有執行緒、壓縮或工具 事件的原生代理程式守護程序來執行，請將提供者與 [agent harness](/zh-Hant/plugins/sdk-agent-harness) 搭配使用，而不是將守護程序通訊協定詳細資訊放在核心中。</Tip>

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

  <Step title="Add runtime hooks (as needed)">
    大多數提供商僅需要 `catalog` + `resolveDynamicModel`。請根據您的提供商需求逐步加入 hooks。

    共用輔助建構器現在已涵蓋最常見的 replay/tool-compat 系列，因此外掛通常不需要手動逐一連接每個 hook：

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

    | 系列 | 連接內容 | 內建範例 |
    | --- | --- | --- |
    | `openai-compatible` | 適用於 OpenAI 相容傳輸的共用 OpenAI 風格 replay 原則，包括 tool-call-id 清理、assistant-first 排序修正，以及傳輸所需的通用 Gemini-turn 驗證 | `moonshot`, `ollama`, `xai`, `zai` |
    | `anthropic-by-model` | 由 `modelId` 選擇的 Claude 感知 replay 原則，因此 Anthropic-message 傳輸僅在解析出的模型確實為 Claude ID 時才會執行 Claude 特定的思考區塊清理 | `amazon-bedrock`, `anthropic-vertex` |
    | `google-gemini` | 原生 Gemini replay 原則加上 bootstrap replay 清理和標記的推理輸出模式 | `google`, `google-gemini-cli` |
    | `passthrough-gemini` | 針對透過 OpenAI 相容代理傳輸執行的 Gemini 模型進行 Gemini 思考簽章清理；不啟用原生 Gemini replay 驗證或 bootstrap 重寫 | `openrouter`, `kilocode`, `opencode`, `opencode-go` |
    | `hybrid-anthropic-openai` | 混合原則，適用於在一個外掛中混合 Anthropic-message 和 OpenAI 相容模型介面的提供商；選用的僅限 Claude 思考區塊移除功能仍僅限於 Anthropic 端 | `minimax` |

    目前可用的 stream 系列：

    | 系列 | 連接內容 | 內建範例 |
    | --- | --- | --- |
    | `google-thinking` | 在共用串流路徑上進行 Gemini 思考承載正規化 | `google`, `google-gemini-cli` |
    | `kilocode-thinking` | 在共用代理串流路徑上的 Kilo 推理包裝器，並配合 `kilo/auto` 和不支援的代理推理 ID 以略過注入的思考 | `kilocode` |
    | `moonshot-thinking` | 從設定 + `/think` 層級進行 Moonshot 二進位原生思考承載對應 | `moonshot` |
    | `minimax-fast-mode` | 在共用串流路徑上進行 MiniMax 快速模式模型重寫 | `minimax`, `minimax-portal` |
    | `openai-responses-defaults` | 共用原生 OpenAI/Codex Responses 包裝器：歸因標頭、`/fast`/`serviceTier`、文字詳細程度、原生 Codex 網路搜尋、推理相容承載塑形，以及 Responses 環境管理 | `openai`, `openai-codex` |
    | `openrouter-thinking` | 適用於代理路由的 OpenRouter 推理包裝器，並集中處理不支援模型/`auto` 的略過邏輯 | `openrouter` |
    | `tool-stream-default-on` | 預設啟用的 `tool_stream` 包裝器，適用於像 Z.AI 這樣除非明確停用否則希望使用工具串流的提供商 | `zai` |

    <Accordion title="SDK seams powering the family builders">
      每個系列建構器都是由來自同一個套件的較低層級公用輔助函式所組成，當提供商需要偏離常見模式時，您可以使用這些函式：

      - `openclaw/plugin-sdk/provider-model-shared` - `ProviderReplayFamily`、`buildProviderReplayFamilyHooks(...)` 以及原始 replay 建構器 (`buildOpenAICompatibleReplayPolicy`、`buildAnthropicReplayPolicyForModel`、`buildGoogleGeminiReplayPolicy`、`buildHybridAnthropicOrOpenAIReplayPolicy`)。同時也匯出 Gemini replay 輔助函式 (`sanitizeGoogleGeminiReplayHistory`、`resolveTaggedReasoningOutputMode`) 和端點/模型輔助函式 (`resolveProviderEndpoint`、`normalizeProviderId`、`normalizeGooglePreviewModelId`)。
      - `openclaw/plugin-sdk/provider-stream` - `ProviderStreamFamily`、`buildProviderStreamFamilyHooks(...)`、`composeProviderStreamWrappers(...)`，加上共用的 OpenAI/Codex 包裝器 (`createOpenAIAttributionHeadersWrapper`、`createOpenAIFastModeWrapper`、`createOpenAIServiceTierWrapper`、`createOpenAIResponsesContextManagementWrapper`、`createCodexNativeWebSearchWrapper`)、DeepSeek V4 OpenAI 相容包裝器 (`createDeepSeekV4OpenAICompatibleThinkingWrapper`)、Anthropic Messages 思考預填清理 (`createAnthropicThinkingPrefillPayloadWrapper`)，以及共用代理/提供商包裝器 (`createOpenRouterWrapper`、`createToolStreamWrapper`、`createMinimaxFastModeWrapper`)。
      - `openclaw/plugin-sdk/provider-tools` - `ProviderToolCompatFamily`、`buildProviderToolCompatFamilyHooks("deepseek" | "gemini" | "openai")` 以及底層提供商架構輔助函式。

      部分串流輔助函式刻意保持為提供商本機。`@openclaw/anthropic-provider` 將 `wrapAnthropicProviderStream`、`resolveAnthropicBetas`、`resolveAnthropicFastMode`、`resolveAnthropicServiceTier` 以及較低層級的 Anthropic 包裝建構器保留在其自己的公用 `api.ts` / `contract-api.ts` 縫隙中，因為它們編碼了 Claude OAuth beta 處理和 `context1m` 閘控。xAI 外掛同樣將原生 xAI Responses 塑形保留在其自己的 `wrapStreamFn` 中 (`/fast` 別名、預設 `tool_stream`、不支援的嚴格工具清理、xAI 特定的推理承載移除)。

      同樣的套件根層級模式也支援 `@openclaw/openai-provider` (提供商建構器、預設模型輔助函式、即時提供商建構器) 和 `@openclaw/openrouter-provider` (提供商建構器加上上架/設定輔助函式)。
    </Accordion>

    <Tabs>
      <Tab title="Token exchange">
        對於需要在每次推論呼叫前進行 token 交換的提供商：

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
        對於需要自訂請求標頭或主體修改的提供商：

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
        對於需要在通用 HTTP 或 WebSocket 傳輸上使用原生請求/工作階段標頭或中繼資料的提供商：

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
        對於公開使用量/計費資料的提供商：

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
      OpenClaw 會依此順序呼叫 hooks。大多數提供商僅使用 2-3 個：
      僅用於相容性的提供商欄位 (OpenClaw 不再呼叫，例如
      `ProviderPlugin.capabilities` 和 `suppressBuiltInModel`) 未列於
      此處。

      | # | Hook | 使用時機 |
      | --- | --- | --- |
      | 1 | `catalog` | 模型型錄或基礎 URL 預設值 |
      | 2 | `applyConfigDefaults` | 設定具體化期間的提供商擁有全域預設值 |
      | 3 | `normalizeModelId` | 查詢前的舊版/預覽版模型 ID 別名清理 |
      | 4 | `normalizeTransport` | 通用模型組裝前的提供商系列 `api` / `baseUrl` 清理 |
      | 5 | `normalizeConfig` | 正規化 `models.providers.<id>` 設定 |
      | 6 | `applyNativeStreamingUsageCompat` | 設定提供商的原生串流使用量相容重寫 |
      | 7 | `resolveConfigApiKey` | 提供商擁有的 env-marker 驗證解析 |
      | 8 | `resolveSyntheticAuth` | 本機/自託管或由設定支援的合成驗證 |
      | 9 | `shouldDeferSyntheticProfileAuth` | 將合成儲存的設定檔預留位置降級至 env/config 驗證之後 |
      | 10 | `resolveDynamicModel` | 接受任意上游模型 ID |
      | 11 | `prepareDynamicModel` | 解析前的非同步中繼資料擷取 |
      | 12 | `normalizeResolvedModel` | 執行器前的傳輸重寫 |
      | 13 | `contributeResolvedModelCompat` | 位於另一個相容傳輸後的供應商模型相容旗標 |
      | 14 | `normalizeToolSchemas` | 註冊前的提供商擁有工具架構清理 |
      | 15 | `inspectToolSchemas` | 提供商擁有工具架構診斷 |
      | 16 | `resolveReasoningOutputMode` | 標記式與原生推理輸出合約 |
      | 17 | `prepareExtraParams` | 預設請求參數 |
      | 18 | `createStreamFn` | 完全自訂的 StreamFn 傳輸 |
      | 19 | `wrapStreamFn` | 正常串流路徑上的自訂標頭/主體包裝器 |
      | 20 | `resolveTransportTurnState` | 原生逐輪標頭/中繼資料 |
      | 21 | `resolveWebSocketSessionPolicy` | 原生 WS 工作階段標頭/冷卻 |
      | 22 | `formatApiKey` | 自訂執行階段 token 形狀 |
      | 23 | `refreshOAuth` | 自訂 OAuth 更新 |
      | 24 | `buildAuthDoctorHint` | 驗證修復指引 |
      | 25 | `matchesContextOverflowError` | 提供商擁有的溢位偵測 |
      | 26 | `classifyFailoverReason` | 提供商擁有的速率限制/過載分類 |
      | 27 | `isCacheTtlEligible` | 提示快取 TTL 閘控 |
      | 28 | `buildMissingAuthMessage` | 自訂缺少驗證提示 |
      | 29 | `augmentModelCatalog` | 合成向前相容資料列 |
      | 30 | `resolveThinkingProfile` | 模型特定的 `/think` 選項集 |
      | 31 | `isBinaryThinking` | 二進位思考開啟/關閉相容性 |
      | 32 | `supportsXHighThinking` | `xhigh` 推理支援相容性 |
      | 33 | `resolveDefaultThinkingLevel` | 預設 `/think` 原則相容性 |
      | 34 | `isModernModelRef` | 即時/冒煙測試模型比對 |
      | 35 | `prepareRuntimeAuth` | 推論前的 token 交換 |
      | 36 | `resolveUsageAuth` | 自訂使用量憑證解析 |
      | 37 | `fetchUsageSnapshot` | 自訂使用量端點 |
      | 38 | `createEmbeddingProvider` | 用於記憶體/搜尋的提供商擁有嵌入配接器 |
      | 39 | `buildReplayPolicy` | 自訂逐字稿 replay/壓縮原則 |
      | 40 | `sanitizeReplayHistory` | 通用清理後的提供商特定 replay 重寫 |
      | 41 | `validateReplayTurns` | 內嵌執行器前的嚴格 replay 輪次驗證 |
      | 42 | `onModelSelected` | 選取後回呼 (例如遙測) |

      執行時期備援註記：

      - `normalizeConfig` 會先檢查相符的提供商，然後檢查其他具備 hook 能力的提供商外掛，直到其中一個實際變更設定為止。如果沒有提供商 hook 重寫支援的 Google 系列設定項目，內建的 Google 設定正規化器仍然會套用。
      - `resolveConfigApiKey` 會在公開時使用提供商 hook。內建的 `amazon-bedrock` 路徑在此也有內建的 AWS env-marker 解析器，即使 Bedrock 執行時期驗證本身仍使用 AWS SDK 預設鏈。
      - `resolveSystemPromptContribution` 允許提供商為模型系列注入具快取感知的系統提示指引。當該行為屬於單一提供商/模型系列且應保留穩定/動態快取分割時，請優先使用它而非 `before_prompt_build`。

      如需詳細描述和真實範例，請參閱 [內部機制：提供商執行時期 Hooks](/zh-Hant/plugins/architecture-internals#provider-runtime-hooks)。
    </Accordion>

  </Step>

  <Step title="新增額外功能（可選）">
    ### 步驟 5：新增額外功能

    提供者外掛可以註冊語音、即時轉錄、即時語音、媒體理解、影像生成、影片生成、網頁擷取，以及網頁搜尋，以及文字推理。OpenClaw 將此分類為 **混合功能** 外掛——這是公司外掛的推薦模式（每個供應商一個外掛）。請參閱
    [Internals: Capability Ownership](/zh-Hant/plugins/architecture#capability-ownership-model)。

    在 `register(api)` 內註冊每個功能，與您現有的
    `api.registerProvider(...)` 呼叫並列。僅選取您需要的分頁：

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

        使用 `assertOkOrThrowProviderError(...)` 處理提供者 HTTP 失敗，以便
        外掛共享受限的錯誤主體讀取、JSON 錯誤解析，以及
        request-id 後綴。
      </Tab>
      <Tab title="即時轉錄">
        建議使用 `createRealtimeTranscriptionWebSocketSession(...)`——這個共享
        輔助程式會處理代理程式擷取、重新連線退避、關閉排清、就緒交握、
        音訊佇列，以及關閉事件診斷。您的外掛
        僅需對應上游事件。

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

        POST 多部分音訊的批次 STT 提供者應使用
        來自
        `openclaw/plugin-sdk/provider-http` 的 `buildAudioTranscriptionFormData(...)`。該輔助程式會正規化上傳
        檔名，包括需要 M4A 風格檔名以相容於轉錄 API 的 AAC 上傳。
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

        宣告 `capabilities`，以便 `talk.catalog` 能向瀏覽器和原生 Talk
        用戶端公開有效的模式、傳輸、音訊格式和功能旗標。當傳輸可以偵測到
        人類正在打斷助手播放，且提供者支援
        截斷或清除作用中的音訊回應時，請實作 `handleBargeIn`。
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
      <Tab title="影像與影片生成">
        影片功能使用 **模式感知** 的結構：`generate`、
        `imageToVideo` 和 `videoToVideo`。像
        `maxInputImages` / `maxInputVideos` / `maxDurationSeconds` 這樣的平面聚合欄位並不足以
        乾淨地宣佈轉換模式支援或已停用的模式。
        音樂生成遵循相同的模式，並具有明確的 `generate` /
        `edit` 區塊。

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
      <Tab title="網頁擷取與搜尋">
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

請勿在此處使用舊版僅限技能的發布別名；插件套件應該使用
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

`catalog.order` 控制您的型錄相對於內建提供者的合併時機：

| 順序      | 時機       | 使用情境                         |
| --------- | ---------- | -------------------------------- |
| `simple`  | 第一輪     | 純 API 金鑰供應商                |
| `profile` | 簡單之後   | 基於設定檔的認證閘道的供應商     |
| `paired`  | 設定檔之後 | 綜合多個相關項目                 |
| `late`    | 最後一輪   | 覆寫現有供應商（衝突時優先採用） |

## 下一步

- [頻道插件](/zh-Hant/plugins/sdk-channel-plugins) - 如果您的插件也提供頻道
- [SDK Runtime](/zh-Hant/plugins/sdk-runtime) - `api.runtime` 輔助工具 (TTS、搜尋、子代理程式)
- [SDK 概覽](/zh-Hant/plugins/sdk-overview) - 完整的子路徑匯入參考
- [Plugin Internals](/zh-Hant/plugins/architecture-internals#provider-runtime-hooks) - Hook 詳細資訊與隨附範例

## 相關內容

- [Plugin SDK 設定](/zh-Hant/plugins/sdk-setup)
- [建置插件](/zh-Hant/plugins/building-plugins)
- [建置頻道插件](/zh-Hant/plugins/sdk-channel-plugins)
