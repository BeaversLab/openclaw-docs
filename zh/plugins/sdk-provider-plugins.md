---
title: "构建提供商插件"
sidebarTitle: "提供商插件"
summary: "为 OpenClaw 构建模型提供商插件的分步指南"
read_when:
  - You are building a new model provider plugin
  - You want to add an OpenAI-compatible proxy or custom LLM to OpenClaw
  - You need to understand provider auth, catalogs, and runtime hooks
---

# 构建提供商插件

本指南介绍了如何构建一个提供商插件，用于向 LLM 添加模型提供商 (OpenClaw)。完成本指南后，你将拥有一个包含模型目录、API 密钥身份验证和动态模型解析的提供商。

<Info>
  如果你之前从未构建过 OpenClaw 插件，请先阅读 [入门指南](/zh/plugins/building-plugins)
  以了解基本包结构和清单设置。
</Info>

## 演练

<Steps>
  <Step title="Package and manifest">
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

    该清单声明了 `providerAuthEnvVars`，以便 OpenClaw 可以在不加载插件运行时的情况下检测凭据。

  </Step>

  <Step title="Register the 提供商">
    一个最小的提供商需要一个 `id`、`label`、`auth` 和 `catalog`：

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

    这就是一个可用的提供商。用户现在可以 `openclaw onboard --acme-ai-api-key <key>` 并选择 `acme-ai/acme-large` 作为其模型。

    对于仅注册一个带有 API 密钥身份验证和单个基于目录的运行时的文本提供商的捆绑提供商，首选更窄的 `defineSingleProviderPluginEntry(...)` 辅助函数：

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

    如果你的身份验证流程还需要在 `models.providers.*` 期间修补别名和代理默认模型，请使用来自 `openclaw/plugin-sdk/provider-onboard` 的预设辅助函数。最窄的辅助函数是 `createDefaultModelPresetAppliers(...)`、`createDefaultModelsPresetAppliers(...)` 和 `createModelCatalogPresetAppliers(...)`。

  </Step>

  <Step title="添加动态模型解析">
    如果您的提供商接受任意模型 ID（如代理或路由器），
    请添加 `resolveDynamicModel`：

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

    如果解析需要进行网络调用，请使用 `prepareDynamicModel` 进行异步
    预热 — `resolveDynamicModel` 会在其完成后再次运行。

  </Step>

  <Step title="添加运行时钩子（根据需要）">
    大多数提供商只需要 `catalog` + `resolveDynamicModel`。根据提供商的需要逐步添加钩子。

    <Tabs>
      <Tab title="令牌交换">
        对于需要在每次推理调用之前进行令牌交换的提供商：

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
      <Tab title="自定义标头">
        对于需要自定义请求标头或正文修改的提供商：

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
      <Tab title="使用和计费">
        对于暴露使用/计费数据的提供商：

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

    <Accordion title="所有可用的提供商钩子">
      OpenClaw 按此顺序调用钩子。大多数提供商仅使用 2-3 个：

      | # | Hook | 何时使用 |
      | --- | --- | --- |
      | 1 | `catalog` | 模型目录或基础 URL 默认值 |
      | 2 | `resolveDynamicModel` | 接受任意上游模型 ID |
      | 3 | `prepareDynamicModel` | 解析之前的异步元数据获取 |
      | 4 | `normalizeResolvedModel` | 运行程序之前的传输重写 |
      | 5 | `capabilities` | 副本/工具元数据（数据，不可调用） |
      | 6 | `prepareExtraParams` | 默认请求参数 |
      | 7 | `wrapStreamFn` | 自定义标头/正文包装器 |
      | 8 | `formatApiKey` | 自定义运行时令牌形状 |
      | 9 | `refreshOAuth` | 自定义 OAuth 刷新 |
      | 10 | `buildAuthDoctorHint` | 认证修复指南 |
      | 11 | `isCacheTtlEligible` | 提示缓存 TTL 门控 |
      | 12 | `buildMissingAuthMessage` | 自定义缺失认证提示 |
      | 13 | `suppressBuiltInModel` | 隐藏陈旧的上游行 |
      | 14 | `augmentModelCatalog` | 合成向前兼容行 |
      | 15 | `isBinaryThinking` | 二元思维开/关 |
      | 16 | `supportsXHighThinking` | `xhigh` 推理支持 |
      | 17 | `resolveDefaultThinkingLevel` | 默认 `/think` 策略 |
      | 18 | `isModernModelRef` | 实时/冒烟模型匹配 |
      | 19 | `prepareRuntimeAuth` | 推理前的令牌交换 |
      | 20 | `resolveUsageAuth` | 自定义使用凭证解析 |
      | 21 | `fetchUsageSnapshot` | 自定义使用端点 |
      | 22 | `onModelSelected` | 选择后回调（例如遥测） |

      有关详细描述和真实示例，请参阅
      [内部原理：提供商运行时钩子](/zh/plugins/architecture#provider-runtime-hooks)。
    </Accordion>

  </Step>

  <Step title="添加额外功能（可选）">
    提供商插件可以注册语音、媒体理解、图像生成和 Web 搜索，以及文本推理：

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

    OpenClaw 将其归类为 **混合功能** 插件。这是公司插件的推荐模式（每个供应商一个插件）。请参阅
    [内部机制：功能所有权](/zh/plugins/architecture#capability-ownership-model)。

  </Step>

  <Step title="测试">
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

## 文件结构

```
extensions/acme-ai/
├── package.json              # openclaw.providers metadata
├── openclaw.plugin.json      # Manifest with providerAuthEnvVars
├── index.ts                  # definePluginEntry + registerProvider
└── src/
    ├── provider.test.ts      # Tests
    └── usage.ts              # Usage endpoint (optional)
```

## 目录顺序参考

`catalog.order` 控制您的目录相对于内置提供商的合并时机：

| 顺序      | 时间           | 用例                             |
| --------- | -------------- | -------------------------------- |
| `simple`  | 第一轮         | 纯 API 密钥提供商                |
| `profile` | 在简单之后     | 基于身份验证配置文件限制的提供商 |
| `paired`  | 在配置文件之后 | 综合多个相关条目                 |
| `late`    | 最后一轮       | 覆盖现有提供商（发生冲突时生效） |

## 后续步骤

- [渠道插件](/zh/plugins/sdk-channel-plugins) — 如果您的插件还提供渠道
- [SDK 运行时](/zh/plugins/sdk-runtime) — `api.runtime` 辅助工具 (TTS, search, subagent)
- [SDK 概览](/zh/plugins/sdk-overview) — 完整的子路径导入参考
- [插件内部机制](/zh/plugins/architecture#provider-runtime-hooks) — 钩子详情和捆绑示例

import zh from "/components/footer/zh.mdx";

<zh />
