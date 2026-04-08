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

<Info>如果您以前从未构建过 OpenClaw 插件，请先阅读 [入门指南](/en/plugins/building-plugins) 以了解基本的包 结构和清单设置。</Info>

## 演练

<Steps>
  <a id="step-1-package-and-manifest"></a>
  <Step title="包和清单">
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

    清单声明了 `providerAuthEnvVars`，以便 OpenClaw 可以在未加载插件运行时的情况下
    检测凭据。`modelSupport` 是可选的，
    允许 OpenClaw 在运行时钩子存在之前，通过简写模型 ID

（如 `acme-large`）自动加载您的提供商插件。如果您将
提供商发布到 ClawHub 上，则 `openclaw.compat` 和 `openclaw.build` 字段
在 `package.json` 中是必需的。

  </Step>

  <Step title="注册提供商">
    一个最简提供商需要一个 `id`、`label`、`auth` 和 `catalog`：

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

    这就是一个可用的提供商。用户现在可以
    `openclaw onboard --acme-ai-api-key <key>` 并选择
    `acme-ai/acme-large` 作为他们的模型。

    对于仅注册一个使用 API 密钥认证且带有单一目录支持的运行时的打包提供商，首选使用更窄的
    `defineSingleProviderPluginEntry(...)` 辅助函数：

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

    如果您的认证流程还需要在新手引导期间修补 `models.providers.*`、别名
    和代理默认模型，请使用 `openclaw/plugin-sdk/provider-onboard` 中的预设辅助函数。最窄的辅助函数是
    `createDefaultModelPresetAppliers(...)`、
    `createDefaultModelsPresetAppliers(...)` 和
    `createModelCatalogPresetAppliers(...)`。

    当提供商的原生端点在常规 `openai-completions` 传输上支持流式使用块时，请首选 `openclaw/plugin-sdk/provider-catalog-shared` 中的共享目录辅助函数，而不是硬编码
    提供商 ID 检查。`supportsNativeStreamingUsageCompat(...)` 和
    `applyProviderNativeStreamingUsageCompat(...)` 会从端点功能图中检测支持，因此即使插件使用的是自定义提供商 ID，原生的 Moonshot/DashScope 风格的端点仍然会选择加入。

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

    如果解析需要网络调用，请使用 `prepareDynamicModel` 进行异步
    预热 —— `resolveDynamicModel` 会在其完成后再次运行。

  </Step>

  <Step title="添加运行时钩子（根据需要）">
    大多数提供商只需要 `catalog` + `resolveDynamicModel`。根据提供商的需要逐步添加钩子。

    共享辅助构建器现在涵盖了最常见的重放/工具兼容系列，因此插件通常不需要逐个手动连接每个钩子：

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

    | 系列 | 它连接的内容 |
    | --- | --- |
    | `openai-compatible` | 适用于 OpenAI 兼容传输的共享 OpenAI 风格重放策略，包括工具调用 ID 清理、助手优先排序修复，以及传输需要时的通用 Gemini 轮次验证 |
    | `anthropic-by-model` | 由 `modelId` 选择的 Claude 感知重放策略，因此 Anthropic 消息传输仅在解析的模型实际为 Claude ID 时才进行特定于 Claude 的思维块清理 |
    | `google-gemini` | 原生 Gemini 重放策略加上引导重放清理和标记的推理输出模式 |
    | `passthrough-gemini` | 适用于通过 OpenAI 兼容代理传输运行的 Gemini 模型的 Gemini 思维签名清理；不启用原生 Gemini 重放验证或引导重写 |
    | `hybrid-anthropic-openai` | 适用于在一个插件中混合 Anthropic 消息和 OpenAI 兼容模型表面的提供商的混合策略；可选的仅限 Claude 思维块删除仍限于 Anthropic 端 |

    真实的捆绑示例：

    - `google`: `google-gemini`
    - `openrouter`, `kilocode`, `opencode`, 和 `opencode-go`: `passthrough-gemini`
    - `amazon-bedrock` 和 `anthropic-vertex`: `anthropic-by-model`
    - `minimax`: `hybrid-anthropic-openai`
    - `moonshot`, `ollama`, `xai`, 和 `zai`: `openai-compatible`

    目前可用的流式系列：

    | 系列 | 它连接的内容 |
    | --- | --- |
    | `google-thinking` | 共享流路径上的 Gemini 思维负载规范化 |
    | `kilocode-thinking` | 共享代理流路径上的 Kilo 推理包装器，带有 `kilo/auto` 和不支持的代理推理 ID 跳过注入思维 |
    | `moonshot-thinking` | 来自配置 + `/think` 级别的 Moonshot 二进制原生思维负载映射 |
    | `minimax-fast-mode` | 共享流路径上的 MiniMax 快速模式模型重写 |
    | `openai-responses-defaults` | 共享原生 OpenAI/Codex Responses 包装器：归属标头、`/fast`/`serviceTier`、文本详细程度、原生 Codex 网络搜索、推理兼容负载塑形和 Responses 上下文管理 |
    | `openrouter-thinking` | 适用于代理路由的 OpenRouter 推理包装器，不支持的模型/`auto` 跳过由中央处理 |
    | `tool-stream-default-on` | 默认启用的 `tool_stream` 包装器，适用于像 Z.AI 这样除非明确禁用否则希望工具流式传输的提供商 |

    真实的捆绑示例：

    - `google`: `google-thinking`
    - `kilocode`: `kilocode-thinking`
    - `moonshot`: `moonshot-thinking`
    - `minimax` 和 `minimax-portal`: `minimax-fast-mode`
    - `openai` 和 `openai-codex`: `openai-responses-defaults`
    - `openrouter`: `openrouter-thinking`
    - `zai`: `tool-stream-default-on`

    `openclaw/plugin-sdk/provider-model-shared` 还导出重放系列枚举以及构建这些系列的共享辅助器。常见的公共导出包括：

    - `ProviderReplayFamily`
    - `buildProviderReplayFamilyHooks(...)`
    - 共享重放构建器，例如 `buildOpenAICompatibleReplayPolicy(...)`,
      `buildAnthropicReplayPolicyForModel(...)`,
      `buildGoogleGeminiReplayPolicy(...)`, 和
      `buildHybridAnthropicOrOpenAIReplayPolicy(...)`
    - Gemini 重放辅助器，例如 `sanitizeGoogleGeminiReplayHistory(...)`
      和 `resolveTaggedReasoningOutputMode()`
    - 端点/模型辅助器，例如 `resolveProviderEndpoint(...)`,
      `normalizeProviderId(...)`, `normalizeGooglePreviewModelId(...)`, 和
      `normalizeNativeXaiModelId(...)`

    `openclaw/plugin-sdk/provider-stream` 暴露了系列构建器以及这些系列重用的公共包装器辅助器。常见的公共导出包括：

    - `ProviderStreamFamily`
    - `buildProviderStreamFamilyHooks(...)`
    - `composeProviderStreamWrappers(...)`
    - 共享 OpenAI/Codex 包装器，例如
      `createOpenAIAttributionHeadersWrapper(...)`,
      `createOpenAIFastModeWrapper(...)`,
      `createOpenAIServiceTierWrapper(...)`,
      `createOpenAIResponsesContextManagementWrapper(...)`, 和
      `createCodexNativeWebSearchWrapper(...)`
    - 共享代理/提供商包装器，例如 `createOpenRouterWrapper(...)`,
      `createToolStreamWrapper(...)`, 和 `createMinimaxFastModeWrapper(...)`

    一些流辅助器是有意保留在提供商本地的。当前捆绑示例：`@openclaw/anthropic-provider` 从其公共 `api.ts` /
    `contract-api.ts` 接缝导出 `wrapAnthropicProviderStream`, `resolveAnthropicBetas`,
    `resolveAnthropicFastMode`, `resolveAnthropicServiceTier` 和低层级的 Anthropic 包装器构建器。这些辅助器仍特定于 Anthropic，因为它们还编码了 Claude OAuth beta 处理和 `context1m` 门控。

    其他捆绑提供商也在行为未在各系列之间清晰共享时，将特定于传输的包装器保留在本地。当前示例：捆绑的 xAI 插件在其自己的 `wrapStreamFn` 中保留原生 xAI Responses 塑形，包括 `/fast` 别名重写、默认 `tool_stream`、不支持的严格工具清理以及特定于 xAI 的推理负载移除。

    `openclaw/plugin-sdk/provider-tools` 目前暴露一个共享工具架构系列加上共享架构/兼容辅助器：

    - `ProviderToolCompatFamily` 记录了当前的共享系列清单。
    - `buildProviderToolCompatFamilyHooks("gemini")` 为需要 Gemini 安全工具架构的提供商连接 Gemini 架构清理 + 诊断。
    - `normalizeGeminiToolSchemas(...)` 和 `inspectGeminiToolSchemas(...)`
      是底层的公共 Gemini 架构辅助器。
    - `resolveXaiModelCompatPatch()` 返回捆绑的 xAI 兼容补丁：
      `toolSchemaProfile: "xai"`、不支持的架构关键字、原生
      `web_search` 支持以及 HTML 实体工具调用参数解码。
    - `applyXaiModelCompat(model)` 在解析的模型到达运行程序之前对其应用相同的 xAI 兼容补丁。

    真实的捆绑示例：xAI 插件使用 `normalizeResolvedModel` 加上
    `contributeResolvedModelCompat`，以保持该兼容元数据归提供商所有，而不是在核心中硬编码 xAI 规则。

    相同的包根模式也支持其他捆绑提供商：

    - `@openclaw/openai-provider`: `api.ts` 导出提供商构建器、默认模型辅助器和实时提供商构建器
    - `@openclaw/openrouter-provider`: `api.ts` 导出提供商构建器加上新手引导/配置辅助器

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
      <Tab title="原生传输标识">
        对于需要在通用 HTTP 或 WebSocket 传输上使用原生请求/会话标头或元数据的提供商：

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
      <Tab title="使用情况和计费">
        对于暴露使用情况/计费数据的提供商：

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

      | # | 钩子 | 何时使用 |
      | --- | --- | --- |
      | 1 | `catalog` | 模型目录或基础 URL 默认值 |
      | 2 | `applyConfigDefaults` | 配置具体化期间的提供商拥有的全局默认值 |
      | 3 | `normalizeModelId` | 查找前的旧版/预览模型 ID 别名清理 |
      | 4 | `normalizeTransport` | 通用模型组装前的提供商系列 `api` / `baseUrl` 清理 |
      | 5 | `normalizeConfig` | 规范化 `models.providers.<id>` 配置 |
      | 6 | `applyNativeStreamingUsageCompat` | 配置提供商的原生流式使用兼容重写 |
      | 7 | `resolveConfigApiKey` | 提供商拥有的环境标记身份验证解析 |
      | 8 | `resolveSyntheticAuth` | 本地/自托管或配置支持的合成身份验证 |
      | 9 | `shouldDeferSyntheticProfileAuth` | 将合成存储配置文件占位符置于环境/配置身份验证之后 |
      | 10 | `resolveDynamicModel` | 接受任意上游模型 ID |
      | 11 | `prepareDynamicModel` | 解析前的异步元数据获取 |
      | 12 | `normalizeResolvedModel` | 运行程序之前的传输重写 |

    运行时回退说明：

    - `normalizeConfig` 首先检查匹配的提供商，然后检查其他具有钩子功能的提供商插件，直到其中一个实际更改配置为止。
      如果没有提供商钩子重写支持的 Google 系列配置条目，捆绑的 Google 配置规范化器仍然适用。
    - `resolveConfigApiKey` 在暴露时使用提供商钩子。捆绑的
      `amazon-bedrock` 路径在此处也有一个内置的 AWS 环境标记解析器，
      尽管 Bedrock 运行时身份验证本身仍然使用 AWS SDK 默认链。
      | 13 | `contributeResolvedModelCompat` | 适用于位于另一个兼容传输之后的供应商模型的兼容标志 |
      | 14 | `capabilities` | 旧版静态功能包；仅兼容性 |
      | 15 | `normalizeToolSchemas` | 注册前的提供商拥有的工具架构清理 |
      | 16 | `inspectToolSchemas` | 提供商拥有的工具架构诊断 |
      | 17 | `resolveReasoningOutputMode` | 标记与原生推理输出契约 |
      | 18 | `prepareExtraParams` | 默认请求参数 |
      | 19 | `createStreamFn` | 完全自定义的 StreamFn 传输 |
      | 20 | `wrapStreamFn` | 正常流路径上的自定义标头/正文包装器 |
      | 21 | `resolveTransportTurnState` | 原生每轮标头/元数据 |
      | 22 | `resolveWebSocketSessionPolicy` | 原生 WS 会话标头/冷却 |
      | 23 | `formatApiKey` | 自定义运行时令牌形状 |
      | 24 | `refreshOAuth` | 自定义 OAuth 刷新 |
      | 25 | `buildAuthDoctorHint` | 身份验证修复指导 |
      | 26 | `matchesContextOverflowError` | 提供商拥有的溢出检测 |
      | 27 | `classifyFailoverReason` | 提供商拥有的速率限制/过载分类 |
      | 28 | `isCacheTtlEligible` | 提示缓存 TTL 门控 |
      | 29 | `buildMissingAuthMessage` | 自定义缺少身份验证提示 |
      | 30 | `suppressBuiltInModel` | 隐藏过时的上游行 |
      | 31 | `augmentModelCatalog` | 合成向前兼容行 |
      | 32 | `isBinaryThinking` | 二进制思维开/关 |
      | 33 | `supportsXHighThinking` | `xhigh` 推理支持 |
      | 34 | `resolveDefaultThinkingLevel` | 默认 `/think` 策略 |
      | 35 | `isModernModelRef` | 实时/冒烟模型匹配 |
      | 36 | `prepareRuntimeAuth` | 推理前的令牌交换 |
      | 37 | `resolveUsageAuth` | 自定义使用凭据解析 |
      | 38 | `fetchUsageSnapshot` | 自定义使用端点 |
      | 39 | `createEmbeddingProvider` | 提供商拥有的用于内存/搜索的嵌入适配器 |
      | 40 | `buildReplayPolicy` | 自定义转录重放/压缩策略 |
      | 41 | `sanitizeReplayHistory` | 通用清理后的特定于提供商的重放重写 |
      | 42 | `validateReplayTurns` | 嵌入式运行程序之前的严格重放轮验证 |
      | 43 | `onModelSelected` | 选择后回调（例如遥测） |

      提示调整说明：

      - `resolveSystemPromptContribution` 允许提供商为模型系列注入缓存感知的系统提示指导。
        当行为属于一个提供商/模型系列并且应保留稳定/动态缓存拆分时，优先使用它而不是
        `before_prompt_build`。

      有关详细描述和真实示例，请参阅
      [Internals: Provider Runtime Hooks](/en/plugins/architecture#provider-runtime-hooks)。
    </Accordion>

  </Step>

  <Step title="添加额外功能（可选）">
    <a id="step-5-add-extra-capabilities"></a>
    提供商插件可以注册语音、实时转录、实时语音、媒体理解、图像生成、视频生成、网页抓取和网页搜索，与文本推理并列：

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
          maxVideos: 1,
          maxDurationSeconds: 10,
          supportsResolution: true,
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

    OpenClaw 将其归类为 **混合功能（hybrid-capability）** 插件。这是公司插件的推荐模式（每个供应商一个插件）。请参阅
    [内部原理：功能所有权](/en/plugins/architecture#capability-ownership-model)。

  </Step>

  <Step title="测试">
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

## 发布到 ClawHub

提供商插件的发布方式与任何其他外部代码插件相同：

```bash
clawhub package publish your-org/your-plugin --dry-run
clawhub package publish your-org/your-plugin
```

不要在此处使用传统的仅限技能的发布别名；插件包应使用
`clawhub package publish`。

## 文件结构

```
<bundled-plugin-root>/acme-ai/
├── package.json              # openclaw.providers metadata
├── openclaw.plugin.json      # Manifest with providerAuthEnvVars
├── index.ts                  # definePluginEntry + registerProvider
└── src/
    ├── provider.test.ts      # Tests
    └── usage.ts              # Usage endpoint (optional)
```

## 目录合并顺序参考

`catalog.order` 控制您的目录相对于内置提供商合并的时间：

| 顺序      | 时机           | 用例                         |
| --------- | -------------- | ---------------------------- |
| `simple`  | 首轮           | 纯 API 密钥提供商            |
| `profile` | 在简单类型之后 | 基于认证配置文件的提供商     |
| `paired`  | 在配置文件之后 | 合成多个相关条目             |
| `late`    | 末轮           | 覆盖现有提供商（冲突时胜出） |

## 后续步骤

- [渠道插件](/en/plugins/sdk-channel-plugins) — 如果您的插件也提供渠道
- [SDK 运行时](/en/plugins/sdk-runtime) — `api.runtime` 辅助工具（TTS、搜索、子代理）
- [SDK 概述](/en/plugins/sdk-overview) — 完整的子路径导入参考
- [插件内部原理](/en/plugins/architecture#provider-runtime-hooks) — 钩子详细信息和捆绑示例
