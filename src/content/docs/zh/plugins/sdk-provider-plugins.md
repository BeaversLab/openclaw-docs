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

<Info>如果您之前尚未构建任何 OpenClaw 插件，请首先阅读 [入门指南](/en/plugins/building-plugins) 以了解基本的包 结构和清单设置。</Info>

<Tip>提供商插件会将模型添加到 OpenClaw 的常规推理循环中。如果该模型 必须通过拥有线程、压缩或工具事件的原生代理守护进程运行，请将提供商与 [代理工具带](/en/plugins/sdk-agent-harness) 配对，而不是将守护进程协议详细信息放在核心中。</Tip>

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

    清单声明了 `providerAuthEnvVars`，以便 OpenClaw 可以在不加载插件运行时的情况下
    检测凭据。当提供商变体应重用另一个提供商 ID 的身份验证时，请添加 `providerAuthAliases`。
    `modelSupport` 是可选的，它允许 OpenClaw 在运行时钩子存在之前，通过简写
    模型 ID（如 `acme-large`）自动加载您的提供商插件。如果您在 ClawHub 上
    发布该提供商，则 `package.json` 中的那些 `openclaw.compat` 和 `openclaw.build` 字段
    是必填项。

  </Step>

  <Step title="注册提供商">
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

    这是一个可工作的提供商。用户现在可以
    `openclaw onboard --acme-ai-api-key <key>` 并选择
    `acme-ai/acme-large` 作为他们的模型。

    如果上游提供商使用与 OpenClaw 不同的控制令牌，请添加一个小的双向文本转换，而不是替换流路径：

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

    `input` 在传输之前重写最终的系统提示和文本消息内容。`output` 在 OpenClaw 解析其自己的控制标记或渠道交付之前重写助手文本增量和最终文本。

    对于仅注册一个基于 API 密钥进行身份验证的文本提供商加上单个支持目录的运行时的打包提供商，首选更狭窄的
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

    如果您的身份验证流程还需要在 Moonshot 期间修补 `models.providers.*`、别名
    和代理默认模型，请使用 `openclaw/plugin-sdk/provider-onboard` 中的预设辅助函数。最狭窄的辅助函数是
    `createDefaultModelPresetAppliers(...)`、
    `createDefaultModelsPresetAppliers(...)` 和
    `createModelCatalogPresetAppliers(...)`。

    当提供商的原生端点在正常的 `openai-completions` 传输上支持流式使用块时，首选 `openclaw/plugin-sdk/provider-catalog-shared` 中的共享目录辅助函数，而不是硬编码
    提供商 ID 检查。`supportsNativeStreamingUsageCompat(...)` 和
    `applyProviderNativeStreamingUsageCompat(...)` 从
    端点功能图检测支持，因此即使是插件使用自定义提供商 ID，原生 Moonshot/DashScope 风格的端点仍然会选择加入。

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
    预热 — `resolveDynamicModel` 将在完成后再次运行。

  </Step>

  <Step title="添加运行时钩子（如需要）">
    大多数提供商只需要 `catalog` + `resolveDynamicModel`。请根据提供商的需要逐步添加钩子。

    共享的辅助构建器现在涵盖了最常见的重放/工具兼容性系列，因此插件通常不需要手动逐个连接每个钩子：

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

    | 系列 | 连接内容 |
    | --- | --- |
    | `openai-compatible` | 用于 OpenAI 兼容传输的共享 OpenAI 风格重放策略，包括工具调用 ID 清理、助手优先排序修复，以及传输需要时的通用 Gemini 轮次验证 |
    | `anthropic-by-model` | 由 `modelId` 选择的 Claude 感知重放策略，因此 Anthropic 消息传输仅在解析的模型实际为 Claude ID 时才进行特定于 Claude 的思维块清理 |
    | `google-gemini` | 原生 Gemini 重放策略加上引导重放清理和标记的推理输出模式 |
    | `passthrough-gemini` | 针对 OpenAI 兼容代理传输运行的 Gemini 模型的 Gemini 思维签名清理；不启用原生 Gemini 重放验证或引导重写 |
    | `hybrid-anthropic-openai` | 混合策略，适用于在一个插件中混合使用 Anthropic 消息和 OpenAI 兼容模型界面的提供商；可选的仅 Claude 思维块删除仍限于 Anthropic 端 |

    实际捆绑示例：

    - `google` 和 `google-gemini-cli`：`google-gemini`
    - `openrouter`、`kilocode`、`opencode` 和 `opencode-go`：`passthrough-gemini`
    - `amazon-bedrock` 和 `anthropic-vertex`：`anthropic-by-model`
    - `minimax`：`hybrid-anthropic-openai`
    - `moonshot`、`ollama`、`xai` 和 `zai`：`openai-compatible`

    目前可用的流系列：

    | 系列 | 连接内容 |
    | --- | --- |
    | `google-thinking` | 共享流路径上的 Gemini 思维负载规范化 |
    | `kilocode-thinking` | 共享代理流路径上的 Kilo 推理包装器，带有 `kilo/auto` 和不支持的代理推理 ID 跳过注入的思维 |
    | `moonshot-thinking` | 来自配置 + `/think` 级别的 Moonshot 二进制原生思维负载映射 |
    | `minimax-fast-mode` | 共享流路径上的 MiniMax 快速模式模型重写 |
    | `openai-responses-defaults` | 共享原生 OpenAI/Codex Responses 包装器：归属标头、`/fast`/`serviceTier`、文本冗长度、原生 Codex 网络搜索、推理兼容负载塑造以及 Responses 上下文管理 |
    | `openrouter-thinking` | 用于代理路由的 OpenRouter 推理包装器，其中不支持的模型/`auto` 跳过由中心处理 |
    | `tool-stream-default-on` | 对于像 Z.AI 这样除非明确禁用否则希望工具流的提供商，默认启用的 `tool_stream` 包装器 |

    实际捆绑示例：

    - `google` 和 `google-gemini-cli`：`google-thinking`
    - `kilocode`：`kilocode-thinking`
    - `moonshot`：`moonshot-thinking`
    - `minimax` 和 `minimax-portal`：`minimax-fast-mode`
    - `openai` 和 `openai-codex`：`openai-responses-defaults`
    - `openrouter`：`openrouter-thinking`
    - `zai`：`tool-stream-default-on`

    `openclaw/plugin-sdk/provider-model-shared` 还导出了重放系列枚举以及构建这些系列的共享辅助程序。常见的公共导出包括：

    - `ProviderReplayFamily`
    - `buildProviderReplayFamilyHooks(...)`
    - 共享重放构建器，如 `buildOpenAICompatibleReplayPolicy(...)`、
      `buildAnthropicReplayPolicyForModel(...)`、
      `buildGoogleGeminiReplayPolicy(...)` 和
      `buildHybridAnthropicOrOpenAIReplayPolicy(...)`
    - Gemini 重放辅助程序，如 `sanitizeGoogleGeminiReplayHistory(...)`
      和 `resolveTaggedReasoningOutputMode()`
    - 端点/模型辅助程序，如 `resolveProviderEndpoint(...)`、
      `normalizeProviderId(...)`、`normalizeGooglePreviewModelId(...)` 和
      `normalizeNativeXaiModelId(...)`

    `openclaw/plugin-sdk/provider-stream` 公开了系列构建器和这些系列重用的公共包装器辅助程序。常见的公共导出包括：

    - `ProviderStreamFamily`
    - `buildProviderStreamFamilyHooks(...)`
    - `composeProviderStreamWrappers(...)`
    - 共享 OpenAI/Codex 包装器，如
      `createOpenAIAttributionHeadersWrapper(...)`、
      `createOpenAIFastModeWrapper(...)`、
      `createOpenAIServiceTierWrapper(...)`、
      `createOpenAIResponsesContextManagementWrapper(...)` 和
      `createCodexNativeWebSearchWrapper(...)`
    - 共享代理/提供商包装器，如 `createOpenRouterWrapper(...)`、
      `createToolStreamWrapper(...)` 和 `createMinimaxFastModeWrapper(...)`

    某些流辅助程序故意保留在提供商本地。当前的捆绑示例：`@openclaw/anthropic-provider` 导出
    `wrapAnthropicProviderStream`、`resolveAnthropicBetas`、
    `resolveAnthropicFastMode`、`resolveAnthropicServiceTier` 以及来自其公共 `api.ts` /
    `contract-api.ts` 接口的较低级别的 Anthropic 包装器构建器。这些辅助程序保留为特定于 Anthropic，因为
    它们还编码了 Claude OAuth beta 处理和 `context1m` 门控。

    其他捆绑提供商也会在行为未在系列间清晰共享时，保留特定于传输的包装器为本地。当前示例：捆绑的 xAI 插件将原生 xAI Responses 塑形保留在其自己的
    `wrapStreamFn` 中，包括 `/fast` 别名重写、默认 `tool_stream`、
    不支持的严格工具清理以及特定于 xAI 的推理负载
    删除。

    `openclaw/plugin-sdk/provider-tools` 目前公开了一个共享的
    工具架构系列加上共享架构/兼容辅助程序：

    - `ProviderToolCompatFamily` 记录了当前共享的系列清单。
    - `buildProviderToolCompatFamilyHooks("gemini")` 为需要 Gemini 安全工具架构的提供商连接 Gemini 架构
      清理 + 诊断。
    - `normalizeGeminiToolSchemas(...)` 和 `inspectGeminiToolSchemas(...)`
      是底层的公共 Gemini 架构辅助程序。
    - `resolveXaiModelCompatPatch()` 返回捆绑的 xAI 兼容补丁：
      `toolSchemaProfile: "xai"`、不支持的架构关键字、原生
      `web_search` 支持以及 HTML 实体工具调用参数解码。
    - `applyXaiModelCompat(model)` 在解析的模型到达运行器之前对其应用相同的 xAI 兼容补丁。

    实际捆绑示例：xAI 插件使用 `normalizeResolvedModel` 加上
    `contributeResolvedModelCompat` 来保持该兼容元数据由
    提供商拥有，而不是在核心中硬编码 xAI 规则。

    相同的包根模式也支持其他捆绑提供商：

    - `@openclaw/openai-provider`：`api.ts` 导出提供商构建器、
      默认模型辅助程序和实时提供商构建器
    - `@openclaw/openrouter-provider`：`api.ts` 导出提供商构建器
      以及新手引导/配置辅助程序

    <Tabs>
      <Tab title="令牌交换">
        对于在每次推理调用之前需要令牌交换的提供商：

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
        对于需要通用 HTTP 或 WebSocket 传输上的原生请求/会话标头或元数据的提供商：

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
      <Tab title="使用和计费">
        对于公开使用/计费数据的提供商：

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
      | 2 | `applyConfigDefaults` | 配置具体化期间提供商拥有的全局默认值 |
      | 3 | `normalizeModelId` | 查找前的旧版/预览模型 ID 别名清理 |
      | 4 | `normalizeTransport` | 通用模型组装前的提供商系列 `api` / `baseUrl` 清理 |
      | 5 | `normalizeConfig` | 规范化 `models.providers.<id>` 配置 |
      | 6 | `applyNativeStreamingUsageCompat` | 配置提供商的原生流使用兼容重写 |
      | 7 | `resolveConfigApiKey` | 提供商拥有的环境标记身份验证解析 |
      | 8 | `resolveSyntheticAuth` | 本地/自托管或配置支持的综合身份验证 |
      | 9 | `shouldDeferSyntheticProfileAuth` | 在环境/配置身份验证后面降低综合存储配置文件占位符 |
      | 10 | `resolveDynamicModel` | 接受任意上游模型 ID |
      | 11 | `prepareDynamicModel` | 解析前的异步元数据获取 |
      | 12 | `normalizeResolvedModel` | 运行器前的传输重写 |

    运行时回退说明：

    - `normalizeConfig` 首先检查匹配的提供商，然后检查其他
      具有钩子能力的提供商插件，直到其中一个实际更改配置。
      如果没有提供商钩子重写支持的 Google 系列配置条目，捆绑的
      Google 配置规范化器仍然适用。
    - `resolveConfigApiKey` 在公开时使用提供商钩子。捆绑的
      `amazon-bedrock` 路径在这里也有一个内置的 AWS 环境标记解析器，
      尽管 Bedrock 运行时身份验证本身仍然使用 AWS SDK 默认链。
      | 13 | `contributeResolvedModelCompat` | 位于另一个兼容传输后面的供应商模型的兼容标志 |
      | 14 | `capabilities` | 旧版静态功能包；仅用于兼容性 |
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
      | 30 | `suppressBuiltInModel` | 隐藏陈旧的上游行 |
      | 31 | `augmentModelCatalog` | 综合向前兼容行 |
      | 32 | `isBinaryThinking` | 二进制思维开/关 |
      | 33 | `supportsXHighThinking` | `xhigh` 推理支持 |
      | 34 | `resolveDefaultThinkingLevel` | 默认 `/think` 策略 |
      | 35 | `isModernModelRef` | 实时/冒烟模型匹配 |
      | 36 | `prepareRuntimeAuth` | 推理前的令牌交换 |
      | 37 | `resolveUsageAuth` | 自定义使用凭据解析 |
      | 38 | `fetchUsageSnapshot` | 自定义使用端点 |
      | 39 | `createEmbeddingProvider` | 用于内存/搜索的提供商拥有的嵌入适配器 |
      | 40 | `buildReplayPolicy` | 自定义脚本重放/压缩策略 |
      | 41 | `sanitizeReplayHistory` | 通用清理后的提供商特定重放重写 |
      | 42 | `validateReplayTurns` | 嵌入式运行器前的严格重放轮验证 |
      | 43 | `onModelSelected` | 选择后回调（例如遥测） |

      提示调整说明：

      - `resolveSystemPromptContribution` 允许提供商为模型系列注入缓存感知
        系统提示指导。当行为属于一个提供商/模型
        系列并且应该保留稳定/动态缓存拆分时，请优先使用它而不是
        `before_prompt_build`。

      有关详细描述和实际示例，请参阅
      [内部结构：提供商运行时钩子](/en/plugins/architecture#provider-runtime-hooks)。
    </Accordion>

  </Step>

  <Step title="添加额外功能（可选）">
    <a id="step-5-add-extra-capabilities"></a>
    提供商插件可以与文本推理一起注册语音、实时转录、实时语音、媒体理解、图像生成、视频生成、网络获取和网络搜索功能：

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

    OpenClaw 将其归类为 **混合功能（hybrid-capability）** 插件。这是公司插件的推荐模式（每个供应商一个插件）。请参阅
    [内部原理：功能所有权](/en/plugins/architecture#capability-ownership-model)。

    对于视频生成，首选上面显示的模式感知功能形状：
    `generate`、`imageToVideo` 和 `videoToVideo`。平面聚合字段（例如
    `maxInputImages`、`maxInputVideos` 和 `maxDurationSeconds`）不足以清晰地宣传转换模式支持或已禁用的模式。

    音乐生成提供商应遵循相同的模式：
    `generate` 用于仅基于提示词的生成，而 `edit` 用于基于参考图像的
    生成。平面聚合字段（例如 `maxInputImages`、
    `supportsLyrics` 和 `supportsFormat`）不足以宣传编辑
    支持；显式的 `generate` / `edit` 块是预期的契约。

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

请勿在此处使用旧版的仅技能发布别名；插件包应使用
`clawhub package publish`。

## 文件结构

```
<bundled-plugin-root>/acme-ai/
├── package.json              # openclaw.providers metadata
├── openclaw.plugin.json      # Manifest with provider auth metadata
├── index.ts                  # definePluginEntry + registerProvider
└── src/
    ├── provider.test.ts      # Tests
    └── usage.ts              # Usage endpoint (optional)
```

## 目录顺序参考

`catalog.order` 控制您的目录相对于内置
提供商的合并时机：

| 顺序      | 时机         | 用例                           |
| --------- | ------------ | ------------------------------ |
| `simple`  | 第一轮       | 纯 API 密钥提供商              |
| `profile` | 简单之后     | 受身份验证配置文件限制的提供商 |
| `paired`  | 配置文件之后 | 综合多个相关条目               |
| `late`    | 最后一轮     | 覆盖现有提供商（冲突时优先）   |

## 后续步骤

- [渠道插件](/en/plugins/sdk-channel-plugins) — 如果您的插件还提供一个渠道
- [SDK 运行时](/en/plugins/sdk-runtime) — `api.runtime` 辅助工具（TTS、搜索、子代理）
- [SDK 概览](/en/plugins/sdk-overview) — 完整的子路径导入参考
- [插件内部机制](/en/plugins/architecture#provider-runtime-hooks) — 钩子详细信息和内置示例
