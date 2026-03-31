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

<Info>如果您之前尚未建立過任何 OpenClaw 外掛程式，請先閱讀 [Getting Started](/en/plugins/building-plugins) 以了解基本的套件 結構與 manifest 設定。</Info>

## 逐步演练

<Steps>
  <Step title="套件與資訊清單">
    <CodeGroup>
    ```json package.json
    {
      "name": "@myorg/openclaw-acme-ai",
      "version": "1.0.0",
      "type": "module",
      "openclaw": {
        "extensions": ["./index.ts"],
        "providers": ["acme-ai"]
      }
    }
    ```

    ```json openclaw.plugin.json
    {
      "id": "acme-ai",
      "name": "Acme AI",
      "description": "Acme AI model provider",
      "providers": ["acme-ai"],
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

    資訊清單宣告了 `providerAuthEnvVars`，因此 OpenClaw 可以在不載入您的外掛程式執行時期的情況下偵測憑證。

  </Step>

  <Step title="註冊提供者">
    最小化的提供者需要一個 `id`、`label`、`auth` 和 `catalog`：

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
    `acme-ai/acme-large` 作為其模型。

    對於僅註冊一個使用 API 金鑰驗證的文字提供者以及單一目錄支援執行時期的套件提供者，建議使用更精簡的
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

    如果您的驗證流程還需要在入職期間修補 `models.providers.*`、別名
    和代理程式預設模型，請使用
    `openclaw/plugin-sdk/provider-onboard` 中的預設輔助函式。最精簡的輔助函式是
    `createDefaultModelPresetAppliers(...)`、
    `createDefaultModelsPresetAppliers(...)` 和
    `createModelCatalogPresetAppliers(...)`。

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

    如果解析需要網路調用，請使用 `prepareDynamicModel` 進行非同步
    預熱 —— `resolveDynamicModel` 會在完成後再次執行。

  </Step>

  <Step title="新增執行時鉤子（視需要）">
    大多數供應商僅需要 `catalog` + `resolveDynamicModel`。請根據供應商的需求逐步新增鉤子。

    <Tabs>
      <Tab title="Token 交換">
        對於需要在每次推斷呼叫前進行 token 交換的供應商：

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

    <Accordion title="所有可用的供應商鉤子">
      OpenClaw 會依下列順序呼叫鉤子。大多數供應商僅使用 2-3 個：

      | # | Hook | 使用時機 |
      | --- | --- | --- |
      | 1 | `catalog` | 模型型錄或基礎 URL 預設值 |
      | 2 | `resolveDynamicModel` | 接受任意上游模型 ID |
      | 3 | `prepareDynamicModel` | 解析前的非同步元資料擷取 |
      | 4 | `normalizeResolvedModel` | 執行器前的傳輸重寫 |
      | 5 | `capabilities` | 逐字稿/工具元資料（資料，非可呼叫） |
      | 6 | `prepareExtraParams` | 預設請求參數 |
      | 7 | `wrapStreamFn` | 自訂標頭/主體包裝器 |
      | 8 | `formatApiKey` | 自訂執行時 token 形狀 |
      | 9 | `refreshOAuth` | 自訂 OAuth 更新 |
      | 10 | `buildAuthDoctorHint` | 驗證修復指引 |
      | 11 | `isCacheTtlEligible` | 提示快取 TTL 閘控 |
      | 12 | `buildMissingAuthMessage` | 自訂缺少驗證提示 |
      | 13 | `suppressBuiltInModel` | 隱藏過時的上游列 |
      | 14 | `augmentModelCatalog` | 合成向前相容列 |
      | 15 | `isBinaryThinking` | 二元思考開啟/關閉 |
      | 16 | `supportsXHighThinking` | `xhigh` 推理支援 |
      | 17 | `resolveDefaultThinkingLevel` | 預設 `/think` 政策 |
      | 18 | `isModernModelRef` | 即時/冒煙模型匹配 |
      | 19 | `prepareRuntimeAuth` | 推斷前的 token 交換 |
      | 20 | `resolveUsageAuth` | 自訂使用量憑證解析 |
      | 21 | `fetchUsageSnapshot` | 自訂使用量端點 |
      | 22 | `onModelSelected` | 選取後回呼（例如遙測） |

      如需詳細描述與真實範例，請參閱
      [Internals: Provider Runtime Hooks](/en/plugins/architecture#provider-runtime-hooks)。
    </Accordion>

  </Step>

  <Step title="新增額外功能（可選）">
    提供者外掛可以在文字推論之外，註冊語音、媒體理解、影像生成和網路搜尋功能：

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
    }
    ```

    OpenClaw 將此歸類為 **混合功能** 外掛。這是公司外掛的建議模式（每個供應商一個外掛）。請參閱
    [Internals: Capability Ownership](/en/plugins/architecture#capability-ownership-model)。

  </Step>

  <Step title="測試">
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

## 檔案結構

```
extensions/acme-ai/
├── package.json              # openclaw.providers metadata
├── openclaw.plugin.json      # Manifest with providerAuthEnvVars
├── index.ts                  # definePluginEntry + registerProvider
└── src/
    ├── provider.test.ts      # Tests
    └── usage.ts              # Usage endpoint (optional)
```

## 目錄順序參考

`catalog.order` 控制您的目錄相對於內建提供者的合併時機：

| 順序      | 時機         | 使用情境                     |
| --------- | ------------ | ---------------------------- |
| `simple`  | 第一階段     | 純 API 金鑰提供者            |
| `profile` | 簡單設定之後 | 依據驗證設定檔限制的提供者   |
| `paired`  | 設定檔之後   | 綜合多個相關項目             |
| `late`    | 最後階段     | 覆寫現有提供者（衝突時優先） |

## 後續步驟

- [Channel Plugins](/en/plugins/sdk-channel-plugins) — 如果您的外掛也提供頻道
- [SDK Runtime](/en/plugins/sdk-runtime) — `api.runtime` 協助程式（TTS、搜尋、子代理程式）
- [SDK Overview](/en/plugins/sdk-overview) — 完整子路徑匯入參考
- [Plugin Internals](/en/plugins/architecture#provider-runtime-hooks) — Hook 詳細資訊與隨附範例
