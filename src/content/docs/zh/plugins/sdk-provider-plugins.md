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

<Info>如果您以前未构建过任何 OpenClaw 插件，请先阅读 [入门指南](/zh/plugins/building-plugins) 以了解基本包 结构和清单设置。</Info>

<Tip>提供商插件会将模型添加到 OpenClaw 的常规推理循环中。如果模型 必须通过拥有线程、压缩或工具 事件的原生代理守护进程运行，请将提供商与 [agent harness](/zh/plugins/sdk-agent-harness) 配对，而不是将守护进程协议详细信息放在核心中。</Tip>

## 演练

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

    清单声明了 `providerAuthEnvVars`，以便 OpenClaw 可以在未加载插件运行时的情况下检测凭据。当提供商变体应重用另一个提供商 ID 的身份验证时，请添加 `providerAuthAliases`。`modelSupport` 是可选的，它允许 OpenClaw 在运行时钩子存在之前，从像 `acme-large` 这样的简写模型 ID 自动加载您的提供商插件。如果您在 ClawHub 上发布该提供商，则 `package.json` 中的 `openclaw.compat` 和 `openclaw.build` 字段是必填的。

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

    这就是一个可用的提供商。用户现在可以
    `openclaw onboard --acme-ai-api-key <key>` 并选择
    `acme-ai/acme-large` 作为他们的模型。

    如果上游提供商使用的控制标记与 OpenClaw 不同，请添加一个
    小的双向文本转换，而不是替换流路径：

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

    `input` 在传输之前重写最终的系统提示词和文本消息内容。
    `output` 在 OpenClaw 解析其自己的控制标记或渠道交付之前，重写助手文本增量和最终文本。

    对于仅注册一个使用 API 密钥认证和单个支持目录的运行时的
    文本提供商的打包提供商，首选更窄的
    `defineSingleProviderPluginEntry(...)` 助手：

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

    `buildProvider` 是当 OpenClaw 可以解析真实的提供商认证时使用的实时目录路径。
    它可能会执行特定于提供商的发现。仅对在配置认证之前可以安全显示的离线行使用
    `buildStaticProvider`；它绝不能需要凭据或发出网络请求。
    OpenClaw 的 `models list --all` 显示目前仅对打包的提供商插件执行静态目录，
    配置为空、环境变量为空，且没有代理/工作区路径。

    如果您的认证流程还需要在 Moonshot 期间修补 `models.providers.*`、别名
    和代理默认模型，请使用来自 `openclaw/plugin-sdk/provider-onboard` 的预设助手。最窄的助手是
    `createDefaultModelPresetAppliers(...)`、
    `createDefaultModelsPresetAppliers(...)` 和
    `createModelCatalogPresetAppliers(...)`。

    当提供商的原生端点在普通的 `openai-completions` 传输上支持流式使用块时，
    请首选 `openclaw/plugin-sdk/provider-catalog-shared` 中的共享目录助手，
    而不是硬编码提供商 ID 检查。
    `supportsNativeStreamingUsageCompat(...)` 和
    `applyProviderNativeStreamingUsageCompat(...)` 从端点能力图中检测支持，
    因此即使插件使用自定义提供商 ID，原生 Moonshot/DashScope 风格的端点仍然会选择加入。

  </Step>

  <Step title="Add dynamic 模型 resolution">
    如果您的提供商接受任意模型ID（例如代理或路由器），
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
    预热 —— `resolveDynamicModel` 会在完成后再次运行。

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

    当前可用的重放系列：

    | 系列 | 它连接的内容 |
    | --- | --- |
    | `openai-compatible` | 针对 OpenAI 兼容传输的共享 OpenAI 风格重放策略，包括工具调用 ID 清理、助手优先排序修复，以及传输需要时的通用 Gemini 轮次验证 |
    | `anthropic-by-model` | 由 `modelId` 选择的 Claude 感知重放策略，因此 Anthropic 消息传输仅在解析的模型实际为 Claude ID 时才进行 Claude 特定的思考块清理 |
    | `google-gemini` | 原生 Gemini 重放策略加上引导重放清理和标记推理输出模式 |
    | `passthrough-gemini` | 针对通过 OpenAI 兼容代理传输运行的 Gemini 模型的 Gemini 思考签名清理；不启用原生 Gemini 重放验证或引导重写 |
    | `hybrid-anthropic-openai` | 针对在一个插件中混合 Anthropic 消息和 OpenAI 兼容模型表面的提供商的混合策略；可选的仅 Claude 思考块删除仍限于 Anthropic 一侧 |

    实际捆绑示例：

    - `google` 和 `google-gemini-cli`：`google-gemini`
    - `openrouter`、`kilocode`、`opencode` 和 `opencode-go`：`passthrough-gemini`
    - `amazon-bedrock` 和 `anthropic-vertex`：`anthropic-by-model`
    - `minimax`：`hybrid-anthropic-openai`
    - `moonshot`、`ollama`、`xai` 和 `zai`：`openai-compatible`

    当前可用的流式系列：

    | 系列 | 它连接的内容 |
    | --- | --- |
    | `google-thinking` | 共享流路径上的 Gemini 思考负载规范化 |
    | `kilocode-thinking` | 共享代理流路径上的 Kilo 推理包装器，具有 `kilo/auto` 和不支持的代理推理 ID 跳过注入思考 |
    | `moonshot-thinking` | 从配置 + `/think` 级别映射的 Moonshot 二进制原生思考负载 |
    | `minimax-fast-mode` | 共享流路径上的 MiniMax 快速模式模型重写 |
    | `openai-responses-defaults` | 共享原生 OpenAI/Codex Responses 包装器：归属标头、`/fast`/`serviceTier`、文本详细程度、原生 Codex Web 搜索、推理兼容负载塑形以及 Responses 上下文管理 |
    | `openrouter-thinking` | 用于代理路由的 OpenRouter 推理包装器，具有不支持的模型/`auto` 跳过中央处理 |
    | `tool-stream-default-on` | 针对 Z.AI 等提供商的默认开启 `tool_stream` 包装器，除非明确禁用，否则它们希望进行工具流式传输 |

    实际捆绑示例：

    - `google` 和 `google-gemini-cli`：`google-thinking`
    - `kilocode`：`kilocode-thinking`
    - `moonshot`：`moonshot-thinking`
    - `minimax` 和 `minimax-portal`：`minimax-fast-mode`
    - `openai` 和 `openai-codex`：`openai-responses-defaults`
    - `openrouter`：`openrouter-thinking`
    - `zai`：`tool-stream-default-on`

    `openclaw/plugin-sdk/provider-model-shared` 还导出了重放系列枚举以及构建这些系列所基于的共享辅助器。常见的公共导出包括：

    - `ProviderReplayFamily`
    - `buildProviderReplayFamilyHooks(...)`
    - 共享重放构建器，例如 `buildOpenAICompatibleReplayPolicy(...)`、
      `buildAnthropicReplayPolicyForModel(...)`、
      `buildGoogleGeminiReplayPolicy(...)` 和
      `buildHybridAnthropicOrOpenAIReplayPolicy(...)`
    - Gemini 重放辅助器，例如 `sanitizeGoogleGeminiReplayHistory(...)`
      和 `resolveTaggedReasoningOutputMode()`
    - 端点/模型辅助器，例如 `resolveProviderEndpoint(...)`、
      `normalizeProviderId(...)`、`normalizeGooglePreviewModelId(...)` 和
      `normalizeNativeXaiModelId(...)`

    `openclaw/plugin-sdk/provider-stream` 公开了系列构建器以及这些系列重用的公共包装器辅助器。常见的公共导出包括：

    - `ProviderStreamFamily`
    - `buildProviderStreamFamilyHooks(...)`
    - `composeProviderStreamWrappers(...)`
    - 共享 OpenAI/Codex 包装器，例如
      `createOpenAIAttributionHeadersWrapper(...)`、
      `createOpenAIFastModeWrapper(...)`、
      `createOpenAIServiceTierWrapper(...)`、
      `createOpenAIResponsesContextManagementWrapper(...)` 和
      `createCodexNativeWebSearchWrapper(...)`
    - 共享代理/提供商包装器，例如 `createOpenRouterWrapper(...)`、
      `createToolStreamWrapper(...)` 和 `createMinimaxFastModeWrapper(...)`

    一些流式辅助器特意保留在提供商本地。当前的捆绑示例：`@openclaw/anthropic-provider` 从其公共 `api.ts` / `contract-api.ts` 缝导出 `wrapAnthropicProviderStream`、`resolveAnthropicBetas`、`resolveAnthropicFastMode`、`resolveAnthropicServiceTier` 以及较低级别的 Anthropic 包装器构建器。这些辅助器保持 Anthropic 特有，因为它们还编码了 Claude OAuth beta 处理和 `context1m` 限制。

    其他捆绑提供商也将在各系列之间未干净共享的行为的传输特定包装器保留在本地。当前示例：捆绑的 xAI 插件在其自己的 `wrapStreamFn` 中保留原生 xAI Responses 塑形，包括 `/fast` 别名重写、默认 `tool_stream`、不支持的严格工具清理以及 xAI 特定的推理负载删除。

    `openclaw/plugin-sdk/provider-tools` 目前公开一个共享工具模式系列以及共享模式/兼容辅助器：

    - `ProviderToolCompatFamily` 记录了当前的共享系列清单。
    - `buildProviderToolCompatFamilyHooks("gemini")` 为需要 Gemini 安全工具模式的提供商连接 Gemini 模式清理 + 诊断。
    - `normalizeGeminiToolSchemas(...)` 和 `inspectGeminiToolSchemas(...)`
      是底层的公共 Gemini 模式辅助器。
    - `resolveXaiModelCompatPatch()` 返回捆绑的 xAI 兼容补丁：
      `toolSchemaProfile: "xai"`、不支持的模式关键字、原生
      `web_search` 支持以及 HTML 实体工具调用参数解码。
    - `applyXaiModelCompat(model)` 在解析的模型到达运行器之前对其应用相同的 xAI 兼容补丁。

    实际捆绑示例：xAI 插件使用 `normalizeResolvedModel` 加上 `contributeResolvedModelCompat` 来保持该兼容元数据由提供商拥有，而不是在核心中硬编码 xAI 规则。

    相同的包根模式也支持其他捆绑提供商：

    - `@openclaw/openai-provider`：`api.ts` 导出提供商构建器、
      默认模型辅助器和实时提供商构建器
    - `@openclaw/openrouter-provider`：`api.ts` 导出提供商构建器
      加上新手引导/配置辅助器

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
      <Tab title="原生传输身份">
        对于在通用 HTTP 或 WebSocket 传输上需要原生请求/会话标头或元数据的提供商：

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
        对于公开使用情况/计费数据的提供商：

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
      | 1 | `catalog` | 模型目录或基本 URL 默认值 |
      | 2 | `applyConfigDefaults` | 配置具体化期间提供商拥有的全局默认值 |
      | 3 | `normalizeModelId` | 查找前的旧版/预览模型 ID 别名清理 |
      | 4 | `normalizeTransport` | 通用模型组装前的提供商系列 `api` / `baseUrl` 清理 |
      | 5 | `normalizeConfig` | 规范化 `models.providers.<id>` 配置 |
      | 6 | `applyNativeStreamingUsageCompat` | 配置提供商的原生流式使用兼容重写 |
      | 7 | `resolveConfigApiKey` | 提供商拥有的环境标记身份验证解析 |
      | 8 | `resolveSyntheticAuth` | 本地/自托管或配置支持的合成身份验证 |
      | 9 | `shouldDeferSyntheticProfileAuth` | 在环境/配置身份验证后降低合成存储的配置文件占位符 |
      | 10 | `resolveDynamicModel` | 接受任意上游模型 ID |
      | 11 | `prepareDynamicModel` | 解析前的异步元数据获取 |
      | 12 | `normalizeResolvedModel` | 运行器前的传输重写 |

    运行时回退说明：

    - `normalizeConfig` 首先检查匹配的提供商，然后检查其他具有钩子能力的提供商插件，直到其中一个实际更改了配置。
      如果没有提供商钩子重写支持的 Google 系列配置条目，捆绑的 Google 配置规范化器仍然适用。
    - `resolveConfigApiKey` 在公开时使用提供商钩子。捆绑的
      `amazon-bedrock` 路径在这里也有一个内置的 AWS 环境标记解析器，
      尽管 Bedrock 运行时身份验证本身仍然使用 AWS SDK 默认链。
      | 13 | `contributeResolvedModelCompat` | 另一个兼容传输后面的供应商模型的兼容标志 |
      | 14 | `capabilities` | 旧版静态功能包；仅兼容性 |
      | 15 | `normalizeToolSchemas` | 注册前的提供商拥有的工具模式清理 |
      | 16 | `inspectToolSchemas` | 提供商拥有的工具模式诊断 |
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
      | 28 | `isCacheTtlEligible` | 提示缓存 TTL 限制 |
      | 29 | `buildMissingAuthMessage` | 自定义缺少身份验证提示 |
      | 30 | `suppressBuiltInModel` | 隐藏陈旧的上游行 |
      | 31 | `augmentModelCatalog` | 合成向前兼容行 |
      | 32 | `resolveThinkingProfile` | 特定模型的 `/think` 选项集 |
      | 33 | `isBinaryThinking` | 二进制思考开/关兼容性 |
      | 34 | `supportsXHighThinking` | `xhigh` 推理支持兼容性 |
      | 35 | `resolveDefaultThinkingLevel` | 默认 `/think` 策略兼容性 |
      | 36 | `isModernModelRef` | 实时/冒烟模型匹配 |
      | 37 | `prepareRuntimeAuth` | 推理前的令牌交换 |
      | 38 | `resolveUsageAuth` | 自定义使用情况凭据解析 |
      | 39 | `fetchUsageSnapshot` | 自定义使用情况端点 |
      | 40 | `createEmbeddingProvider` | 提供商拥有的用于内存/搜索的嵌入适配器 |
      | 41 | `buildReplayPolicy` | 自定义脚本重放/压缩策略 |
      | 42 | `sanitizeReplayHistory` | 通用清理后的提供商特定重放重写 |
      | 43 | `validateReplayTurns` | 嵌入式运行器前的严格重放轮次验证 |
      | 44 | `onModelSelected` | 选择后回调（例如遥测）|

      提示调整说明：

      - `resolveSystemPromptContribution` 允许提供商为模型系列注入缓存感知
        系统提示指导。当行为属于一个提供商/模型
        系列并且应该保留稳定/动态缓存拆分时，优先使用它而不是
        `before_prompt_build`。

      有关详细描述和实际示例，请参阅
      [内部结构：提供商运行时钩子](/zh/plugins/architecture#provider-runtime-hooks)。
    </Accordion>

  </Step>

  <Step title="添加额外功能（可选）">
    <a id="step-5-add-extra-capabilities"></a>
    提供商插件除了文本推理外，还可以注册语音、实时转录、实时语音、媒体理解、图像生成、视频生成、网络获取和网络搜索功能：

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

    OpenClaw 将其归类为 **混合功能 (hybrid-capability)** 插件。这是公司插件的推荐模式（每个供应商一个插件）。请参阅
    [Internals: Capability Ownership](/zh/plugins/architecture#capability-ownership-model)。

    对于视频生成，首选上述的模式感知功能形状：
    `generate`、`imageToVideo` 和 `videoToVideo`。平面聚合字段，例如
    `maxInputImages`、`maxInputVideos` 和 `maxDurationSeconds`，不足以清晰地通告转换模式支持或已禁用的模式。

    对于流式 STT 提供商，首选共享的 WebSocket 助手。它使代理捕获、重连退避、关闭刷新、就绪握手、音频排队和关闭事件诊断在各个提供商之间保持一致，同时让提供商代码仅负责上游事件映射。

    POST 多部分音频的批处理 STT 提供商应将
    `buildAudioTranscriptionFormData(...)` 与
    `openclaw/plugin-sdk/provider-http` 结合提供商 HTTP 请求
    助手一起使用。表单助手会规范化上传文件名，包括为了兼容转录 API 而需要 M4A 样式文件名的 AAC 上传。

    音乐生成提供商应遵循相同的模式：
    `generate` 用于仅提示词生成，`edit` 用于基于参考图像的
    生成。平面聚合字段，例如 `maxInputImages`、
    `supportsLyrics` 和 `supportsFormat`，不足以通告编辑
    支持；显式的 `generate` / `edit` 块才是预期的合约。

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

## 目录排序参考

`catalog.order` 控制您的目录相对于内置提供程序的合并时机：

| 顺序      | 时间         | 用例                             |
| --------- | ------------ | -------------------------------- |
| `simple`  | 第一遍       | 纯 API 密钥提供商                |
| `profile` | 简单之后     | 基于身份验证配置文件限制的提供商 |
| `paired`  | 配置文件之后 | 综合多个相关条目                 |
| `late`    | 最后遍历     | 覆盖现有提供商（冲突时胜出）     |

## 后续步骤

- [渠道插件](/zh/plugins/sdk-channel-plugins) — 如果您的插件还提供渠道
- [SDK Runtime](/zh/plugins/sdk-runtime) — `api.runtime` 助手（TTS、搜索、子代理）
- [SDK 概述](/zh/plugins/sdk-overview) — 完整的子路径导入参考
- [插件内部机制](/zh/plugins/architecture#provider-runtime-hooks) — 钩子详情和捆绑示例
