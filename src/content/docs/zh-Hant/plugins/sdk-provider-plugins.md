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

<Info>如果您之前沒有建置過任何 OpenClaw 外掛程式，請先閱讀 [入門指南](/en/plugins/building-plugins) 以了解基本套件 結構和 manifest 設定。</Info>

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

    Manifest 宣告了 `providerAuthEnvVars`，因此 OpenClaw 可以在
    不載入您的外掛程式執行時期的情況下偵測憑證。如果您將
    提供者發佈到 ClawHub，則需要在 `package.json` 中填寫
    這些 `openclaw.compat` 和 `openclaw.build` 欄位。

  </Step>

  <Step title="註冊提供者">
    最小的提供者需要一個 `id`、`label`、`auth` 和 `catalog`：

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

    對於僅註冊一個使用 API 金鑰驗證的
    文字提供者加上單一目錄支援執行時期的捆綁式提供者，建議使用
    較狹義的 `defineSingleProviderPluginEntry(...)` 輔助函式：

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

    如果您的驗證流程還需要在加入時修補 `models.providers.*`、別名
    和代理程式預設模型，請使用來自
    `openclaw/plugin-sdk/provider-onboard` 的預設輔助函式。最狹義的
    輔助函式是 `createDefaultModelPresetAppliers(...)`、
    `createDefaultModelsPresetAppliers(...)` 和
    `createModelCatalogPresetAppliers(...)`。

  </Step>

  <Step title="Add dynamic model resolution">
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
    預熱 —— `resolveDynamicModel` 會在完成後再次執行。

  </Step>

  <Step title="新增運行時 Hook（按需）">
    大多數供應商僅需 `catalog` + `resolveDynamicModel`。請根據您的供應商需求逐步添加 Hook。

    <Tabs>
      <Tab title="權杖交換">
        對於在每次推理呼叫前需要權杖交換的供應商：

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
        對於公開使用量/計費數據的供應商：

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

    <Accordion title="所有可用的供應商 Hook">
      OpenClaw 會依此順序呼叫 Hook。大多數供應商僅使用 2-3 個：

      | # | Hook | 使用時機 |
      | --- | --- | --- |
      | 1 | `catalog` | 模型型錄或基礎 URL 預設值 |
      | 2 | `resolveDynamicModel` | 接受任意上游模型 ID |
      | 3 | `prepareDynamicModel` | 解析前的非同步中繼資料擷取 |
      | 4 | `normalizeResolvedModel` | 執行器之前的傳輸重寫 |
      | 5 | `capabilities` | 逐字稿/工具中繼資料（資料，不可呼叫） |
      | 6 | `prepareExtraParams` | 預設請求參數 |
      | 7 | `wrapStreamFn` | 自訂標頭/主體包裝器 |
      | 8 | `formatApiKey` | 自訂運行時權杖形狀 |
      | 9 | `refreshOAuth` | 自訂 OAuth 更新 |
      | 10 | `buildAuthDoctorHint` | 驗證修復指引 |
      | 11 | `isCacheTtlEligible` | 提示詞快取 TTL 閘控 |
      | 12 | `buildMissingAuthMessage` | 自訂缺少驗證提示 |
      | 13 | `suppressBuiltInModel` | 隱藏過時的上游資料列 |
      | 14 | `augmentModelCatalog` | 合成向前相容資料列 |
      | 15 | `isBinaryThinking` | 二元思維開關 |
      | 16 | `supportsXHighThinking` | `xhigh` 推理支援 |
      | 17 | `resolveDefaultThinkingLevel` | 預設 `/think` 政策 |
      | 18 | `isModernModelRef` | 即時/冒煙模型匹配 |
      | 19 | `prepareRuntimeAuth` | 推理前的權杖交換 |
      | 20 | `resolveUsageAuth` | 自訂使用量憑證解析 |
      | 21 | `fetchUsageSnapshot` | 自訂使用量端點 |
      | 22 | `onModelSelected` | 選取後回呼（例如遙測） |

      如需詳細描述和真實範例，請參閱
      [Internals: Provider Runtime Hooks](/en/plugins/architecture#provider-runtime-hooks)。
    </Accordion>

  </Step>

  <Step title="新增額外功能（可選）">
    <a id="step-5-add-extra-capabilities"></a>
    供應商外掛程式可以註冊語音、媒體理解、影像生成和網路搜尋，以及文字推論：

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

    OpenClaw 將此歸類為 **混合功能 (hybrid-capability)** 外掛程式。這是公司外掛程式的推薦模式（每個供應商一個外掛程式）。請參閱
    [Internals: Capability Ownership](/en/plugins/architecture#capability-ownership-model)。

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

請勿在此處使用舊版僅限技能的發佈別名；外掛程式套件應使用
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

`catalog.order` 控制您的目錄相對於內建供應商的合併時間：

| 順序      | 時機       | 使用案例                             |
| --------- | ---------- | ------------------------------------ |
| `simple`  | 第一階段   | 純 API 金鑰供應商                    |
| `profile` | 簡單之後   | 基於設定檔限制存取的供應商           |
| `paired`  | 設定檔之後 | 綜合多個相關項目                     |
| `late`    | 最後階段   | 覆寫現有供應商（衝突時以本設定為準） |

## 後續步驟

- [頻道外掛程式](/en/plugins/sdk-channel-plugins) — 如果您的外掛程式也提供頻道
- [SDK 執行時期](/en/plugins/sdk-runtime) — `api.runtime` 協助程式（TTS、搜尋、次代理程式）
- [SDK 概覽](/en/plugins/sdk-overview) — 完整的子路徑匯入參考
- [外掛程式內部](/en/plugins/architecture#provider-runtime-hooks) — Hook 詳細資訊和內範例
