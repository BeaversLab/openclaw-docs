---
summary: "為 OpenClaw 建構模型供應器外掛程式的逐步指南"
title: "建構供應器外掛程式"
sidebarTitle: "供應器外掛程式"
read_when:
  - You are building a new model provider plugin
  - You want to add an OpenAI-compatible proxy or custom LLM to OpenClaw
  - You need to understand provider auth, catalogs, and runtime hooks
---

本指南將引導您建構一個提供者外掛，用於將模型提供者 (LLM) 新增至 OpenClaw。完成後，您將擁有一個包含模型目錄、API 金鑰驗證和動態模型解析的提供者。

<Info>如果您之前尚未建構過任何 OpenClaw 外掛程式，請先閱讀 [Getting Started](/zh-Hant/plugins/building-plugins) 以了解基本的套件 結構和 manifest 設定。</Info>

<Tip>供應器外掛程式會將模型新增至 OpenClaw 的正常推論迴圈中。如果模型 必須透過擁有執行緒、壓縮或工具事件的原生代理程式守護程序來執行，請將供應器與 [agent harness](/zh-Hant/plugins/sdk-agent-harness) 搭配使用，而不要將守護程序協定詳細資訊放在核心中。</Tip>

## 逐步指南

<Steps>
  <Step title="Package and manifest">
    ### 步驟 1：套件與 manifest

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
      "setup": {
        "providers": [
          {
            "id": "acme-ai",
            "envVars": ["ACME_AI_API_KEY"]
          }
        ]
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

    Manifest 會宣告 `setup.providers[].envVars`，以便 OpenClaw 可以在不載入外掛程式執行時間的情況下偵測認證。當供應器變體應該重複使用另一個供應器 ID 的認證時，請新增 `providerAuthAliases`。
    `modelSupport` 是選用的，它允許 OpenClaw 在執行時間掛鉤存在之前，從簡寫模型 ID（例如 `acme-large`）自動載入您的供應器外掛程式。如果您在 ClawHub 上發佈供應器，則 `package.json` 中需要這些 `openclaw.compat` 和 `openclaw.build` 欄位。

  </Step>

  <Step title="註冊提供者">
    一個最小化的文字提供者需要一個 `id`、`label`、`auth` 和 `catalog`。
    `catalog` 是提供者擁有的執行時/配置鉤子；它可以調用即時
    供應商 API 並傳回 `models.providers` 項目。

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

    `registerModelCatalogProvider` 是較新的控制平面目錄介面，
    用於清單/說明/選擇器 UI。將其用於文字、圖像生成、
    視頻生成和音樂生成行。將供應商端點調用和
    回應映射保留在插件中；OpenClaw 擁有共享的行形狀、來源
    標籤和說明渲染。

    這就是一個可運作的提供者。用戶現在可以
    `openclaw onboard --acme-ai-api-key <key>` 並選擇
    `acme-ai/acme-large` 作為他們的模型。

    如果上游提供者使用與 OpenClaw 不同的控制權杖，請加入一個
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

    `input` 會在傳輸之前重寫最終的系統提示和文字訊息內容。`output` 會在 OpenClaw
    解析其自己的控制標記或通道傳遞之前，重寫助手文字增量（deltas）和最終文字。

    對於僅註冊一個使用 API 金鑰
    驗證的文字提供者加上單一目錄支援執行時的打包提供者，請使用較狹窄的
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

    `buildProvider` 是當 OpenClaw 可以解析真實
    提供者驗證時使用的即時目錄路徑。它可能執行提供者特定的探索。僅將
    `buildStaticProvider` 用於在配置驗證之前顯示安全的離線行；
    它不得要求憑證或發出網路請求。
    OpenClaw 的 `models list --all` 顯示目前僅對打包提供者插件執行靜態目錄，
    配合空配置、空環境和無代理/工作區路徑。

    如果您的驗證流程還需要在引導期間修補 `models.providers.*`、別名和
    代理預設模型，請使用來自
    `openclaw/plugin-sdk/provider-onboard` 的預設輔助函式。最狹窄的輔助函式是
    `createDefaultModelPresetAppliers(...)`、
    `createDefaultModelsPresetAppliers(...)` 和
    `createModelCatalogPresetAppliers(...)`。

    當提供者的原生端點支援在正常
    `openai-completions` 傳輸上的串流使用區塊時，請偏好使用
    `openclaw/plugin-sdk/provider-catalog-shared` 中的共享目錄輔助函式，
    而不是對提供者 ID 檢查進行硬編碼。`supportsNativeStreamingUsageCompat(...)` 和
    `applyProviderNativeStreamingUsageCompat(...)` 會從端點功能映射中偵測支援，
    因此原生 Moonshot/DashScope 風格的端點即使插件使用自訂提供者 ID 仍會
    選擇加入。

  </Step>

  <Step title="Add dynamic model resolution">
    如果您的供應商接受任意模型 ID（如代理或路由器），
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
    預熱 - `resolveDynamicModel` 會在完成後再次執行。

  </Step>

  <Step title="新增執行時 hooks（視需要）">
    大多數供應商僅需 `catalog` + `resolveDynamicModel`。根據供應商需求逐步新增 hooks。

    共用輔助構建器現在涵蓋了最常見的 replay/tool-compat 系列，因此外掛通常無需手動逐一連接每個 hook：

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
    | `openai-compatible` | 適用於 OpenAI 相容傳輸的共用 OpenAI 風格 replay 策略，包括 tool-call-id 清理、assistant-first 排序修正，以及傳輸需要的通用 Gemini-turn 驗證 | `moonshot`, `ollama`, `xai`, `zai` |
    | `anthropic-by-model` | 由 `modelId` 選擇的 Claude 感知 replay 策略，因此 Anthropic-message 傳輸僅在解析出的模型實際為 Claude ID 時才會獲得 Claude 特定的思考區塊清理 | `amazon-bedrock`, `anthropic-vertex` |
    | `google-gemini` | 原生 Gemini replay 策略加上啟動 replay 清理。共用系列使文字輸出的 Gemini CLI 保持標籤化推論；直接的 `google` 供應商將 `resolveReasoningOutputMode` 覆寫為 `native`，因為 Gemini API 推論以原生思考部分的形式到達。 | `google`, `google-gemini-cli` |
    | `passthrough-gemini` | 透過 OpenAI 相容代理傳輸執行的 Gemini 模型的 Gemini 推論簽章清理；不啟用原生 Gemini replay 驗證或啟動重寫 | `openrouter`, `kilocode`, `opencode`, `opencode-go` |
    | `hybrid-anthropic-openai` | 混合策略，適用於在一個外掛中混合 Anthropic-message 和 OpenAI 相容模型介面的供應商；可選的僅 Claude 思考區塊刪除保持在 Anthropic 端的範圍內 | `minimax` |

    目前可用的 stream 系列：

    | 系列 | 連接內容 | 內建範例 |
    | --- | --- | --- |
    | `google-thinking` | 共用串流路徑上的 Gemini 推論 payload 正規化 | `google`, `google-gemini-cli` |
    | `kilocode-thinking` | 共用代理串流路徑上的 Kilo 推論包裝器，具有 `kilo/auto` 和不支援的代理推論 ID 會跳過注入的推論 | `kilocode` |
    | `moonshot-thinking` | 來自配置 + `/think` 層級的 Moonshot 二進位原生推論 payload 對應 | `moonshot` |
    | `minimax-fast-mode` | 共用串流路徑上的 MiniMax 快速模式模型重寫 | `minimax`, `minimax-portal` |
    | `openai-responses-defaults` | 共用原生 OpenAI/Codex Responses 包裝器：歸因標頭、`/fast`/`serviceTier`、文字詳細程度、原生 Codex 網路搜尋、推論相容 payload 塑形以及 Responses 內容管理 | `openai` |
    | `openrouter-thinking` | 代理路由的 OpenRouter 推論包裝器，不支援的模型/`auto` 跳過由中央處理 | `openrouter` |
    | `tool-stream-default-on` | 預設開啟的 `tool_stream` 包裝器，適用於像 Z.AI 這樣除非明確停用否則想要工具串流的供應商 | `zai` |

    <Accordion title="支援系列構建器的 SDK 接縫">
      每個系列構建器都是由同一個套件匯出的較低層級公開輔助函式所組成，當供應商需要偏離常見模式時，您可以使用這些函式：

      - `openclaw/plugin-sdk/provider-model-shared` - `ProviderReplayFamily`、`buildProviderReplayFamilyHooks(...)` 和原始 replay 構建器（`buildOpenAICompatibleReplayPolicy`、`buildAnthropicReplayPolicyForModel`、`buildGoogleGeminiReplayPolicy`、`buildHybridAnthropicOrOpenAIReplayPolicy`）。也匯出 Gemini replay 輔助函式（`sanitizeGoogleGeminiReplayHistory`、`resolveTaggedReasoningOutputMode`）和端點/模型輔助函式（`resolveProviderEndpoint`、`normalizeProviderId`、`normalizeGooglePreviewModelId`）。
      - `openclaw/plugin-sdk/provider-stream` - `ProviderStreamFamily`、`buildProviderStreamFamilyHooks(...)`、`composeProviderStreamWrappers(...)`，加上共用 OpenAI/Codex 包裝器（`createOpenAIAttributionHeadersWrapper`、`createOpenAIFastModeWrapper`、`createOpenAIServiceTierWrapper`、`createOpenAIResponsesContextManagementWrapper`、`createCodexNativeWebSearchWrapper`）、DeepSeek V4 OpenAI 相容包裝器（`createDeepSeekV4OpenAICompatibleThinkingWrapper`）、Anthropic Messages 思考預填清理（`createAnthropicThinkingPrefillPayloadWrapper`）、純文字工具呼叫相容性（`createPlainTextToolCallCompatWrapper`）以及共用代理/供應商包裝器（`createOpenRouterWrapper`、`createToolStreamWrapper`、`createMinimaxFastModeWrapper`）。
      - `openclaw/plugin-sdk/provider-tools` - `ProviderToolCompatFamily`、`buildProviderToolCompatFamilyHooks("deepseek" | "gemini" | "openai")` 和底層供應商架構輔助函式。

      對於 Gemini 系列供應商，請將推論輸出模式與傳輸保持一致。直接 Google Gemini API 供應商應使用 `native` 推論輸出，以便 OpenClaw 消耗原生思考部分而不新增 `<think>` / `<final>` 提示指令。僅解析最終 JSON/文字回應的純文字 Gemini CLI 風格後端可以保持共用的 `google-gemini` 標籤合約。

      某些串流輔助函式故意保持供應商本地化。`@openclaw/anthropic-provider` 將 `wrapAnthropicProviderStream`、`resolveAnthropicBetas`、`resolveAnthropicFastMode`、`resolveAnthropicServiceTier` 和較低層級的 Anthropic 包裝構建器保留在其自己的公開 `api.ts` / `contract-api.ts` 接縫中，因為它們編碼了 Claude OAuth beta 處理和 `context1m` 閘控。xAI 外掛類似地將原生 xAI Responses 塑形保留在其自己的 `wrapStreamFn` 中（`/fast` 別名、預設 `tool_stream`、不支援的嚴格工具清理、xAI 特定推論 payload 移除）。

      相同的套件根模式也支援 `@openclaw/openai-provider`（供應商構建器、預設模型輔助函式、即時供應商構建器）和 `@openclaw/openrouter-provider`（供應商構建器加上上架/配置輔助函式）。
    </Accordion>

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
        對於在通用 HTTP 或 WebSocket 傳輸上需要原生請求/會話標頭或中繼資料的供應商：

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
      <Tab title="使用量和計費">
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

        `resolveUsageAuth` 有三種結果。當供應商具有使用量/計費憑證時，傳回 `{ token, accountId? }`。僅當供應商已明確處理使用量驗證但沒有可用的使用量 token，且 OpenClaw 必須跳過通用 API 金鑰/OAuth 後援時，才傳回 `{ handled: true }`。當供應商未處理請求且 OpenClaw 應繼續使用通用後援時，傳回 `null` 或 `undefined`。
      </Tab>
    </Tabs>

    <Accordion title="所有可用的供應商 hooks">
      OpenClaw 會依此順序呼叫 hooks。大多數供應商僅使用 2-3 個：
      OpenClaw 不再呼叫的僅相容性供應商欄位（例如 `ProviderPlugin.capabilities` 和 `suppressBuiltInModel`）未列在此處。

      | # | Hook | 使用時機 |
      | --- | --- | --- |
      | 1 | `catalog` | 模型目錄或基礎 URL 預設值 |
      | 2 | `applyConfigDefaults` | 配置具體化期間的供應商擁有的全域預設值 |
      | 3 | `normalizeModelId` | 查閱前的舊版/預覽 model-id 別名清理 |
      | 4 | `normalizeTransport` | 通用模型組裝前的供應商系列 `api` / `baseUrl` 清理 |
      | 5 | `normalizeConfig` | 正規化 `models.providers.<id>` 配置 |
      | 6 | `applyNativeStreamingUsageCompat` | 配置供應商的原生串流使用量相容性重寫 |
      | 7 | `resolveConfigApiKey` | 供應商擁有的 env-marker 驗證解析 |
      | 8 | `resolveSyntheticAuth` | 本地/自我託管或配置支援的合成驗證 |
      | 9 | `shouldDeferSyntheticProfileAuth` | 將合成儲存的設定檔預留位置置於 env/config 驗證之後 |
      | 10 | `resolveDynamicModel` | 接受任意的上游模型 ID |
      | 11 | `prepareDynamicModel` | 解析前的非同步中繼資料擷取 |
      | 12 | `normalizeResolvedModel` | 執行器之前的傳輸重寫 |
      | 13 | `normalizeToolSchemas` | 註冊前的供應商擁有的工具架構清理 |
      | 14 | `inspectToolSchemas` | 供應商擁有的工具架構診斷 |
      | 15 | `resolveReasoningOutputMode` | 標籤與原生推論輸出合約 |
      | 16 | `prepareExtraParams` | 預設請求參數 |
      | 17 | `createStreamFn` | 完全自訂的 StreamFn 傳輸 |
      | 19 | `wrapStreamFn` | 正常串流路徑上的自訂標頭/主體包裝器 |
      | 20 | `resolveTransportTurnState` | 原生每個回合的標頭/中繼資料 |
      | 21 | `resolveWebSocketSessionPolicy` | 原生 WS 會話標頭/冷卻 |
      | 22 | `formatApiKey` | 自訂執行時 token 形狀 |
      | 23 | `refreshOAuth` | 自訂 OAuth 重新整理 |
      | 24 | `buildAuthDoctorHint` | 驗證修復指引 |
      | 25 | `matchesContextOverflowError` | 供應商擁有的溢位偵測 |
      | 26 | `classifyFailoverReason` | 供應商擁有的速率限制/過載分類 |
      | 27 | `isCacheTtlEligible` | 提示快取 TTL 閘控 |
      | 28 | `buildMissingAuthMessage` | 自訂缺少驗證的提示 |
      | 29 | `augmentModelCatalog` | 合成向前相容行 |
      | 30 | `resolveThinkingProfile` | 模型特定的 `/think` 選項集 |
      | 31 | `isBinaryThinking` | 二進位推論開啟/關閉相容性 |
      | 32 | `supportsXHighThinking` | `xhigh` 推論支援相容性 |
      | 33 | `resolveDefaultThinkingLevel` | 預設 `/think` 策略相容性 |
      | 34 | `isModernModelRef` | 即時/冒煙測試模型比對 |
      | 35 | `prepareRuntimeAuth` | 推論前的 token 交換 |
      | 36 | `resolveUsageAuth` | 自訂使用量憑證解析 |
      | 37 | `fetchUsageSnapshot` | 自訂使用量端點 |
      | 38 | `createEmbeddingProvider` | 供應商擁有的記憶體/搜尋嵌入介面卡 |
      | 39 | `buildReplayPolicy` | 自訂逐字稿 replay/壓縮策略 |
      | 40 | `sanitizeReplayHistory` | 通用清理後的供應商特定 replay 重寫 |
      | 41 | `validateReplayTurns` | 內嵌執行器之前的嚴格 replay 回合驗證 |
      | 42 | `onModelSelected` | 選擇後回呼（例如遙測） |

      執行時後援說明：

      - `normalizeConfig` 會先檢查相符的供應商，然後檢查其他具備 hook 能力的供應商外掛，直到其中一個實際變更了配置。如果沒有供應商 hook 重寫支援的 Google 系列配置項目，內建的 Google 配置正規化器仍會套用。
      - `resolveConfigApiKey` 在公開時使用供應商 hook。Amazon Bedrock 將 AWS env-marker 解析保留在其供應商外掛中；當配置為 `auth: "aws-sdk"` 時，執行時驗證本身仍使用 AWS SDK 預設鏈。
      - `resolveThinkingProfile(ctx)` 會接收已選取的 `provider`、`modelId`、選擇性的合併 `reasoning` 目錄提示，以及選擇性的合併模型 `compat` 事實。僅使用 `compat` 來選取供應商的思考 UI/設定檔。
      - `resolveSystemPromptContribution` 讓供應商為模型系列注入具備快取感知能力的系統提示指引。當行為屬於單一供應商/模型系列且應保留穩定/動態快取分割時，請優先使用它而不是 `before_prompt_build`。

      如需詳細描述和真實範例，請參閱 [Internals: Provider Runtime Hooks](/zh-Hant/plugins/architecture-internals#provider-runtime-hooks)。
    </Accordion>

  </Step>

  <Step title="新增額外功能（選用）">
    ### 步驟 5：新增額外功能

    提供者外掛可以註冊嵌入、語音、即時轉錄、即時語音、媒體理解、影像生成、影片生成、
    Web 擷取和 Web 搜尋，以及文字推論。OpenClaw 將此歸類為
    **混合功能** 外掛 —— 這是公司外掛的建議模式
    （每個供應商一個外掛）。請參閱
    [Internals: Capability Ownership](/zh-Hant/plugins/architecture#capability-ownership-model)。

    請在 `register(api)` 中註冊每項功能，與您現有的
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
          defaultTimeoutMs: 120_000,
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

        使用 `assertOkOrThrowProviderError(...)` 處理提供者 HTTP 失敗，如此一來
        外掛即可共用受限制的錯誤主體讀取、JSON 錯誤解析和
    request-id 後綴。
      </Tab>
      <Tab title="即時轉錄">
        建議優先使用 `createRealtimeTranscriptionWebSocketSession(...)` —— 這個共用
        協助程式會處理代理擷取、重新連線退避、關閉排清、就緒
        交握、音訊佇列和關閉事件診斷。您的外掛
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

        POST 多重部分音訊的批次 STT 提供者應使用
        來自
        `openclaw/plugin-sdk/provider-http` 的 `buildAudioTranscriptionFormData(...)`。此協助程式會將上傳
        檔案名稱標準化，包括需要 M4A 風格檔案名稱的 AAC 上傳，以便
        與相容的轉錄 API 搭配使用。
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
        人類正在中斷助理播放，且提供者支援
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

        故意不需要認證的本機或自託管媒體提供者可以公開 `resolveAuth` 並傳回 `kind: "none"`。
        OpenClaw 仍會為未
        明確選擇加入的提供者保留一般認證閘道。現有提供者可以繼續讀取 `req.apiKey`；
        新提供者應優先使用 `req.auth`。

        ```typescript
        api.registerMediaUnderstandingProvider({
          id: "local-audio",
          capabilities: ["audio"],
          resolveAuth: () => ({
            kind: "none",
            source: "local-audio plugin no-auth",
          }),
          transcribeAudio: async (req) => ({ text: "Transcript..." }),
        });
        ```
      </Tab>
      <Tab title="嵌入">
        ```typescript
        api.registerEmbeddingProvider({
          id: "acme-ai",
          defaultModel: "acme-embed",
          transport: "remote",
          authProviderId: "acme-ai",
          create: async ({ model }) => ({
            provider: {
              id: "acme-ai",
              model,
              dimensions: 1536,
              embed: async (input) => {
                const text = typeof input === "string" ? input : input.text;
                return fetchAcmeEmbedding(text);
              },
              embedBatch: async (inputs) =>
                Promise.all(
                  inputs.map((input) =>
                    fetchAcmeEmbedding(typeof input === "string" ? input : input.text),
                  ),
                ),
            },
          }),
        });
        ```

        在 `contracts.embeddingProviders` 中宣告相同的 id。這是
        用於可重複使用的向量生成（包括
        記憶體搜尋）的一般嵌入合約。`registerMemoryEmbeddingProvider(...)` 已遭棄用，
        僅供現有的記憶體特定配接器相容使用。
      </Tab>
      <Tab title="影像與影片生成">
        影片功能使用 **模式感知** 形狀：`generate`、
        `imageToVideo` 和 `videoToVideo`。像
        `maxInputImages` / `maxInputVideos` / `maxDurationSeconds` 這類扁平彙總欄位並不
        足以乾淨地公告轉換模式支援或已停用的模式。
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
          defaultTimeoutMs: 600_000,
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
      <Tab title="Web 擷取與搜尋">
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

  <Step title="測試">
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

請勿在此處使用舊版僅限技能的發布別名；外掛程式套件應使用
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

| 順序      | 時機       | 使用情境                         |
| --------- | ---------- | -------------------------------- |
| `simple`  | 第一輪     | 純 API 金鑰供應商                |
| `profile` | 簡單之後   | 基於設定檔的認證閘道的供應商     |
| `paired`  | 設定檔之後 | 綜合多個相關項目                 |
| `late`    | 最後一輪   | 覆寫現有供應商（衝突時優先採用） |

## 下一步

- [頻道外掛程式](/zh-Hant/plugins/sdk-channel-plugins) - 如果您的外掛程式也提供頻道
- [SDK 執行時期](/zh-Hant/plugins/sdk-runtime) - `api.runtime` 輔助工具 (TTS、搜尋、subagent)
- [SDK 概觀](/zh-Hant/plugins/sdk-overview) - 完整的子路徑匯入參考
- [外掛程式內部機制](/zh-Hant/plugins/architecture-internals#provider-runtime-hooks) - 掛鉤詳細資訊與隨附範例

## 相關內容

- [外掛程式 SDK 設定](/zh-Hant/plugins/sdk-setup)
- [建置外掛程式](/zh-Hant/plugins/building-plugins)
- [建置頻道外掛程式](/zh-Hant/plugins/sdk-channel-plugins)
