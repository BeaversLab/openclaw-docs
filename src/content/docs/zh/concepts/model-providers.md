---
summary: "模型提供商概述，包含示例配置 + CLI 流程"
read_when:
  - You need a provider-by-provider model setup reference
  - You want example configs or CLI onboarding commands for model providers
title: "模型提供商"
---

# 模型提供商

本页面涵盖 **LLM/模型 providers**（而非像 WhatsApp/LLM 这样的聊天渠道）。
有关模型选择规则，请参阅 [/concepts/models](/zh/concepts/models)。

## 快速规则

- 模型引用使用 `provider/model`（例如：`opencode/claude-opus-4-6`）。
- 如果您设置了 `agents.defaults.models`，它将变为允许列表。
- CLI 助手：`openclaw onboard`、`openclaw models list`、`openclaw models set <provider/model>`。
- Fallback 运行时规则、冷却探测和会话覆盖持久化记录在 [/concepts/模型-failover](/zh/concepts/model-failover) 中。
- `models.providers.*.models[].contextWindow` 是原生模型元数据；
  `models.providers.*.models[].contextTokens` 是有效的运行时上限。
- 提供商插件可以通过 `registerProvider({ catalog })` 注入模型目录；
  OpenClaw 会将该输出合并到 `models.providers` 中，然后再写入
  `models.json`。
- 提供商清单可以声明 `providerAuthEnvVars` 和
  `providerAuthAliases`，这样通用的基于环境的身份验证探测和提供商变体
  就不需要加载插件运行时。剩余的核心环境变量映射现在
  仅用于非插件/核心提供商以及少数通用优先级情况，例如
  Anthropic API 密钥优先的新手引导。
- Provider 插件还可以通过
  `normalizeModelId`、`normalizeTransport`、`normalizeConfig`、
  `applyNativeStreamingUsageCompat`、`resolveConfigApiKey`、
  `resolveSyntheticAuth`、`shouldDeferSyntheticProfileAuth`、
  `resolveDynamicModel`、`prepareDynamicModel`、
  `normalizeResolvedModel`、`contributeResolvedModelCompat`、
  `capabilities`、`normalizeToolSchemas`、
  `inspectToolSchemas`、`resolveReasoningOutputMode`、
  `prepareExtraParams`、`createStreamFn`、`wrapStreamFn`、
  `resolveTransportTurnState`、`resolveWebSocketSessionPolicy`、
  `createEmbeddingProvider`、`formatApiKey`、`refreshOAuth`、
  `buildAuthDoctorHint`、
  `matchesContextOverflowError`、`classifyFailoverReason`、
  `isCacheTtlEligible`、`buildMissingAuthMessage`、`suppressBuiltInModel`、
  `augmentModelCatalog`、`resolveThinkingProfile`、`isBinaryThinking`、
  `supportsXHighThinking`、`resolveDefaultThinkingLevel`、
  `applyConfigDefaults`、`isModernModelRef`、
  `prepareRuntimeAuth`、`resolveUsageAuth`、`fetchUsageSnapshot` 和
  `onModelSelected` 来拥有 Provider 运行时行为。
- 注意：提供商运行时 `capabilities` 是共享的运行器元数据（提供商系列、转录/工具特性、传输/缓存提示）。它与描述插件注册内容的 [public capability 模型](/zh/plugins/architecture#public-capability-model)（如文本推理、语音等）不同。
- 捆绑的 `codex` 提供商与捆绑的 Codex 代理工具包搭配使用。当您需要 Codex 拥有的登录、模型发现、原生线程恢复和应用服务器执行时，请使用 `codex/gpt-*`。普通的 `openai/gpt-*` 引用继续使用 OpenAI 提供商和正常的 OpenClaw 提供商传输。仅 Codex 的部署可以使用 `agents.defaults.embeddedHarness.fallback: "none"` 禁用自动 PI 回退；参见 [Codex Harness](/zh/plugins/codex-harness)。

## 插件拥有的提供商行为

提供商插件现在可以拥有大多数特定于提供商的逻辑，而 OpenClaw 保持通用推理循环。

典型划分：

- `auth[].run` / `auth[].runNonInteractive`：提供商拥有 `openclaw onboard`、`openclaw models auth` 和无头设置的新手引导/登录流程
- `wizard.setup` / `wizard.modelPicker`：提供商拥有身份验证选择标签、遗留别名、新手引导允许列表提示以及新手引导/模型选择器中的设置条目
- `catalog`：提供商出现在 `models.providers` 中
- `normalizeModelId`：提供商在查找或规范化之前规范化遗留/预览模型 ID
- `normalizeTransport`：提供商在通用模型组装之前规范化传输系列 `api` / `baseUrl`；OpenClaw 首先检查匹配的提供商，然后检查其他具有挂钩能力的提供商插件，直到其中一个真正改变了传输
- `normalizeConfig`: 提供商在运行时使用 `models.providers.<id>` 配置之前会对其进行标准化；OpenClaw 首先检查匹配的提供商，然后检查其他具有挂钩功能的提供商插件，直到其中一个实际更改配置为止。如果没有提供商挂钩重写配置，捆绑的 Google 系列助手仍然会标准化受支持的 Google 提供商条目。
- `applyNativeStreamingUsageCompat`: 提供商为配置提供商应用端点驱动的原生流式使用兼容性重写
- `resolveConfigApiKey`: 提供商为配置提供商解析环境标记身份验证，而无需强制加载完整的运行时身份验证。`amazon-bedrock` 此处还有一个内置的 AWS 环境标记解析器，即使 Bedrock 运行时身份验证使用 AWS SDK 默认链。
- `resolveSyntheticAuth`: 提供商可以公开本地/自托管或其他基于配置的身份验证可用性，而无需持久化纯文本机密
- `shouldDeferSyntheticProfileAuth`: 提供商可以将存储的合成配置文件占位符标记为比基于环境变量/配置的身份验证优先级更低
- `resolveDynamicModel`: 提供商接受本地静态目录中尚未存在的模型 ID
- `prepareDynamicModel`: 提供商在重试动态解析之前需要元数据刷新
- `normalizeResolvedModel`: 提供商需要传输或基础 URL 重写
- `contributeResolvedModelCompat`: 即使供应商模型通过另一种兼容传输到达，提供商也会为其提供兼容性标志
- `capabilities`: 提供商发布转录/工具/提供商系列的怪癖
- `normalizeToolSchemas`: 提供商在嵌入式运行器看到工具模式之前对其进行清理
- `inspectToolSchemas`: 提供商在规范化之后显示特定于传输的模式警告
- `resolveReasoningOutputMode`: 提供商选择原生还是标记式的推理输出契约
- `prepareExtraParams`: 提供商设置默认值或规范化每个模型的请求参数
- `createStreamFn`: 提供商使用完全自定义的传输方式替换正常的流路径
- `wrapStreamFn`: 提供商应用请求头/请求体/模型兼容性包装器
- `resolveTransportTurnState`: 提供商提供每次轮次的原生传输头或元数据
- `resolveWebSocketSessionPolicy`: 提供商提供原生 WebSocket 会话头或会话冷却策略
- `createEmbeddingProvider`：提供商拥有内存嵌入行为，当它属于提供商插件而不是核心嵌入交换板时
- `formatApiKey`：提供商将存储的身份验证配置文件格式化为传输层所需的运行时 `apiKey` 字符串
- `refreshOAuth`：提供商拥有 OAuth 刷新权限，当共享 `pi-ai` 刷新程序不足时
- `buildAuthDoctorHint`：提供商在 OAuth 刷新失败时附加修复指南
- `matchesContextOverflowError`：提供商识别通用启发式方法会遗漏的提供商特定的上下文窗口溢出错误
- `classifyFailoverReason`：提供商将提供商特定的原始传输/API 错误映射到速率限制或过载等故障转移原因
- `isCacheTtlEligible`：提供商决定哪些上游模型 ID 支持 prompt-cache TTL
- `buildMissingAuthMessage`：提供商将通用的 auth-store 错误
  替换为提供商特定的恢复提示
- `suppressBuiltInModel`：提供商隐藏陈旧的上游行，并可以针对直接解析失败
  返回供应商拥有的错误
- `augmentModelCatalog`：提供商在发现和配置合并后
  追加合成/最终目录行
- `resolveThinkingProfile`：提供商拥有确切的 `/think` 级别集、
  可选的显示标签以及所选模型的默认级别
- `isBinaryThinking`：二进制开/关思考用户体验的兼容性钩子
- `supportsXHighThinking`：所选 `xhigh` 模型的兼容性钩子
- `resolveDefaultThinkingLevel`：用于默认 `/think` 策略的兼容性挂钩
- `applyConfigDefaults`：提供商在配置具体化期间根据身份验证模式、环境或模型系列应用提供商特定的全局默认值
- `isModernModelRef`：提供商拥有实时/冒烟首选模型匹配
- `prepareRuntimeAuth`：提供商将配置的凭据转换为短期运行时令牌
- `resolveUsageAuth`：提供商解析 `/usage` 的使用/配额凭据以及相关的状态/报告界面
- `fetchUsageSnapshot`：提供商拥有使用端点的获取/解析，而核心仍然拥有摘要外壳和格式化
- `onModelSelected`：提供商运行选择后副作用，例如遥测或提供商拥有的会话簿记

当前捆绑的示例：

- `anthropic`：Claude 4.6 向前兼容回退、身份验证修复提示、使用
  端点获取、缓存 TTL/提供商系列元数据，以及具有身份验证感知的全局
  配置默认值
- `amazon-bedrock`：提供商拥有的上下文溢出匹配和故障转移
  原因分类，针对 Bedrock 特定的限流/未就绪错误，加上
  共享的 `anthropic-by-model` 重放系列，用于仅限 Claude 的重放策略
  针对Anthropic流量的保护
- `anthropic-vertex`：仅限 Claude 的重放策略保护，针对Anthropic消息
  流量
- `openrouter`：透传模型ID、请求包装器、提供商能力提示、代理Gemini流量上的Gemini思维签名清理、通过 `openrouter-thinking` 流族进行的代理推理注入、路由元数据转发以及缓存TTL策略
- `github-copilot`：新手引导/设备登录、向前兼容模型回退、Claude思维记录提示、运行时令牌交换以及使用端点获取
- `openai`: GPT-5.4 前向兼容回退，直接 OpenAI 传输
  规范化，Codex 感知的缺失身份验证提示，Spark 抑制，合成
  OpenAI/Codex 目录行，thinking/live-模型 策略，usage-token 别名
  规范化（`input` / `output` 和 `prompt` / `completion` 系列），
  用于原生 OpenAI/Codex
  包装器的共享 `openai-responses-defaults` 流系列，提供商系列元数据，为 `gpt-image-2` 捆绑的
  图像生成提供商注册，以及为 `sora-2` 捆绑的视频生成提供商注册
- `google` 和 `google-gemini-cli`：Gemini 3.1 前向兼容回退、原生 Gemini 重放验证、引导重放清理、标记式推理输出模式、现代模型匹配、针对 Gemini 图像预览模型的捆绑图像生成提供商注册，以及针对 Veo 模型的捆绑视频生成提供商注册；Gemini CLI OAuth 还负责使用界面 auth-profile 令牌格式化、使用令牌解析和使用量端点获取
- `moonshot`：共享传输、插件拥有的思考负载标准化
- `kilocode`：共享传输、插件拥有的请求头、推理负载标准化、代理 Gemini 思维签名清理以及缓存 TTL 策略
- `zai`: GLM-5 前向兼容回退, `tool_stream` 默认值, 缓存-TTL 策略, binary-thinking/live-模型 策略, 以及使用身份验证 + 配额获取; 未知的 `glm-5*` id 根据捆绑的 `glm-4.7` 模板合成
- `xai`: 原生 Responses 传输标准化, 针对 Grok 快速变体的 `/fast` 别名重写, 默认 `tool_stream`, xAI 特定的工具架构 / 推理负载清理, 以及为 `grok-imagine-video` 捆绑的视频生成提供商注册
- `mistral`: 插件拥有的能力元数据
- `opencode` 和 `opencode-go`: 插件拥有的能力元数据以及 代理 Gemini 思维签名清理
- `alibaba`：插件拥有的视频生成目录，用于直接引用 Wan 模型
  例如 `alibaba/wan2.6-t2v`
- `byteplus`：插件拥有的目录，以及为 Seedance 文本生成视频/图像生成视频模型
  捆绑的视频生成提供商注册
- `fal`：为托管第三方视频模型捆绑的视频生成提供商注册，
  为 FLUX 图像模型注册的图像生成提供商，以及为托管第三方视频模型
  捆绑的视频生成提供商注册
- `cloudflare-ai-gateway`、`huggingface`、`kimi`、`nvidia`、`qianfan`、
  `stepfun`、`synthetic`、`venice`、`vercel-ai-gateway` 和 `volcengine`：
  仅限插件拥有的目录
- `qwen`：用于文本模型的插件拥有的目录，以及为其多模态界面共享的
  媒体理解和视频生成提供商注册；Qwen 视频生成使用捆绑了 `wan2.6-t2v` 和 `wan2.7-r2v` 等 Wan 模型的标准 DashScope 视频
  端点
- `runway`：用于原生 Runway 基于任务模型的插件自有视频生成提供商注册，例如 `gen4.5`
- `minimax`：插件自有目录、针对 Hailuo 视频模型的捆绑视频生成提供商注册、针对 `image-01` 的捆绑图像生成提供商注册、混合 Anthropic/OpenAI 重放策略选择，以及使用授权/快照逻辑
- `together`：插件自有目录以及针对 Wan 视频模型的捆绑视频生成提供商注册
- `xiaomi`：插件自有目录以及使用授权/快照逻辑

捆绑的 `openai` 插件现在拥有这两个提供商 ID：`openai` 和 `openai-codex`。

这涵盖了仍然适合 OpenClaw 普通传输的提供商。需要完全自定义请求执行器的提供商是一个单独的、更深层的扩展面。

## API 密钥轮换

- 支持所选提供商的通用提供商轮换。
- 通过以下方式配置多个密钥：
  - `OPENCLAW_LIVE_<PROVIDER>_KEY`（单次实时覆盖，最高优先级）
  - `<PROVIDER>_API_KEYS`（逗号或分号列表）
  - `<PROVIDER>_API_KEY`（主密钥）
  - `<PROVIDER>_API_KEY_*`（编号列表，例如 `<PROVIDER>_API_KEY_1`）
- 对于 Google 提供商，`GOOGLE_API_KEY` 也作为后备包含在内。
- 密钥选择顺序保留优先级并去除重复值。
- 仅当收到速率限制响应（例如
  `429`、`rate_limit`、`quota`、`resource exhausted`、`Too many
concurrent requests`, `ThrottlingException`, `concurrency limit reached`、
  `workers_ai ... quota limit exceeded` 或定期使用限制消息）时，才会使用下一个密钥重试请求。
- 非速率限制的失败会立即失败；不会尝试轮换密钥。
- 当所有候选密钥均失败时，将返回最后一次尝试的最终错误。

## 内置提供商（pi-ai 目录）

OpenClaw 随附 pi‑ai 目录。这些提供商**不需要**
`models.providers` 配置；只需设置身份验证并选择一个模型。

### OpenAI

- 提供商：`openai`
- 身份验证：`OPENAI_API_KEY`
- 可选轮换：`OPENAI_API_KEYS`、`OPENAI_API_KEY_1`、`OPENAI_API_KEY_2`，外加 `OPENCLAW_LIVE_OPENAI_KEY`（单次覆盖）
- 示例模型：`openai/gpt-5.4`、`openai/gpt-5.4-pro`
- CLI：`openclaw onboard --auth-choice openai-api-key`
- 默认传输方式为 `auto`（WebSocket 优先，SSE 回退）
- 通过 `agents.defaults.models["openai/<model>"].params.transport` 针对每个模型进行覆盖（`"sse"`、`"websocket"` 或 `"auto"`）
- OpenAI Responses WebSocket 预热默认通过 `params.openaiWsWarmup` 启用（`true`/`false`）
- OpenAI 优先处理可以通过 `agents.defaults.models["openai/<model>"].params.serviceTier` 启用
- `/fast` 和 `params.fastMode` 将直接的 `openai/*` Responses 请求映射到 `service_tier=priority` 上的 `api.openai.com`
- 当您需要显式的层级而不是共享的 `/fast` 切换开关时，请使用 `params.serviceTier`
- 隐藏的 OpenClaw 归属标头（`originator`、`version`、
  `User-Agent`）仅适用于到 `api.openai.com` 的原生 OpenAI 流量，不适用于
  通用的 OpenAI 兼容代理
- 原生 OpenAI 路由还会保留 Responses `store`、提示词缓存提示以及
  OpenAI 推理兼容负载整形；代理路由则不会
- 由于实时 OpenAI API 会拒绝它，`openai/gpt-5.3-codex-spark` 在 OpenClaw 中被有意抑制；Spark 被视为仅限 Codex

```json5
{
  agents: { defaults: { model: { primary: "openai/gpt-5.4" } } },
}
```

### Anthropic

- 提供商：`anthropic`
- 身份验证：`ANTHROPIC_API_KEY`
- 可选轮换：`ANTHROPIC_API_KEYS`、`ANTHROPIC_API_KEY_1`、`ANTHROPIC_API_KEY_2`，以及 `OPENCLAW_LIVE_ANTHROPIC_KEY`（单次覆盖）
- 示例模型：`anthropic/claude-opus-4-6`
- CLI：`openclaw onboard --auth-choice apiKey`
- 直接的公共 Anthropic 请求支持共享的 `/fast` 切换开关和 `params.fastMode`，包括发送到 `api.anthropic.com` 的 API 密钥和 OAuth 身份验证流量；OpenClaw 将其映射到 Anthropic `service_tier`（`auto` 对比 `standard_only`）
- Anthropic 注意：Anthropic 员工告知我们，OpenClaw 风格的 Claude CLI 使用再次被允许，因此除非 OpenClaw 发布新政策，否则 CLI 将 Claude Anthropic 重用和 `claude -p` 使用视为经授权的集成方式。
- Anthropic setup-token 仍然作为支持的 OpenClaw token 路径可用，但如果可用，OpenClaw 现在优先使用 Claude CLI 重用和 `claude -p`。

```json5
{
  agents: { defaults: { model: { primary: "anthropic/claude-opus-4-6" } } },
}
```

### OpenAI Code (Codex)

- 提供商：`openai-codex`
- 认证：OAuth (ChatGPT)
- 示例模型：`openai-codex/gpt-5.4`
- CLI：`openclaw onboard --auth-choice openai-codex` 或 `openclaw models auth login --provider openai-codex`
- 默认传输方式为 `auto`（优先 WebSocket，SSE 回退）
- 通过 `agents.defaults.models["openai-codex/<model>"].params.transport` 按模型覆盖（`"sse"`、`"websocket"` 或 `"auto"`）
- `params.serviceTier` 也会在本机 Codex Responses 请求 (`chatgpt.com/backend-api`) 上被转发
- 隐藏的 OpenClaw 归属标头 (`originator`, `version`,
  `User-Agent`) 仅附加到发往
  `chatgpt.com/backend-api` 的本机 Codex 流量上，而非通用的 OpenAI 兼容代理
- 与直接 `openai/*` 共享相同的 `/fast` 开关和 `params.fastMode` 配置；OpenClaw 会将其映射为 `service_tier=priority`
- 当 Codex OAuth 目录公开 `openai-codex/gpt-5.3-codex-spark` 时，它仍然可用；取决于权限
- `openai-codex/gpt-5.4` 保留原生 `contextWindow = 1050000` 和默认运行时 `contextTokens = 272000`；使用 `models.providers.openai-codex.models[].contextTokens` 覆盖运行时上限
- 策略说明：明确支持 OpenAI Codex OAuth 用于外部工具/工作流，例如 OpenClaw。

```json5
{
  agents: { defaults: { model: { primary: "openai-codex/gpt-5.4" } } },
}
```

```json5
{
  models: {
    providers: {
      "openai-codex": {
        models: [{ id: "gpt-5.4", contextTokens: 160000 }],
      },
    },
  },
}
```

### 其他订阅式托管选项

- [Qwen Cloud](/zh/providers/qwen)：Qwen Cloud 提供商界面以及阿里云 DashScope 和 Coding Plan 端点映射
- [MiniMax](/zh/providers/minimax)：MiniMax Coding Plan OAuth 或 API 密钥访问
- [GLM Models](/zh/providers/glm)：Z.AI Coding Plan 或通用 API 端点

### OpenCode

- 身份验证：`OPENCODE_API_KEY`（或 `OPENCODE_ZEN_API_KEY`）
- Zen 运行时提供商：`opencode`
- Go 运行时提供商：`opencode-go`
- 示例模型：`opencode/claude-opus-4-6`, `opencode-go/kimi-k2.5`
- CLI：`openclaw onboard --auth-choice opencode-zen` 或 `openclaw onboard --auth-choice opencode-go`

```json5
{
  agents: { defaults: { model: { primary: "opencode/claude-opus-4-6" } } },
}
```

### Google Gemini（API 密钥）

- 提供商：`google`
- 身份验证：`GEMINI_API_KEY`
- 可选轮换：`GEMINI_API_KEYS`，`GEMINI_API_KEY_1`，`GEMINI_API_KEY_2`，`GOOGLE_API_KEY` 回退，以及 `OPENCLAW_LIVE_GEMINI_KEY`（单项覆盖）
- 示例模型：`google/gemini-3.1-pro-preview`, `google/gemini-3-flash-preview`
- 兼容性：使用 `google/gemini-3.1-flash-preview` 的旧版 OpenClaw 配置将被标准化为 `google/gemini-3-flash-preview`
- CLI：`openclaw onboard --auth-choice gemini-api-key`
- Direct Gemini 运行也接受 `agents.defaults.models["google/<model>"].params.cachedContent`
  （或旧版的 `cached_content`）来转发提供商原生
  的 `cachedContents/...` 句柄；Gemini 缓存命中显示为 OpenClaw `cacheRead`

### Google Vertex 和 Gemini CLI

- 提供商：`google-vertex`、`google-gemini-cli`
- 身份验证：Vertex 使用 gcloud ADC；Gemini CLI 使用其 OAuth 流程
- 注意：CLI 中的 Gemini OAuth OpenClaw 是非官方集成。一些用户报告称在使用第三方客户端后 Google 账户受到了限制。请查看 Google 条款，如果您选择继续，请使用非关键账户。
- Gemini CLI OAuth 作为捆绑的 `google` 插件的一部分提供。
  - 首先安装 Gemini CLI：
    - `brew install gemini-cli`
    - 或 `npm install -g @google/gemini-cli`
  - 启用：`openclaw plugins enable google`
  - 登录： `openclaw models auth login --provider google-gemini-cli --set-default`
  - 默认模型： `google-gemini-cli/gemini-3-flash-preview`
  - 注意：您**不要**将客户端 ID 或密钥粘贴到 `openclaw.json` 中。 CLI 登录流程会将令牌存储在网关主机上的身份验证配置文件中。
  - 如果登录后请求失败，请在网关主机上设置 `GOOGLE_CLOUD_PROJECT` 或 `GOOGLE_CLOUD_PROJECT_ID`。
  - Gemini CLI JSON 回复从 `response` 解析；使用情况回退到 `stats`，其中 `stats.cached` 被标准化为 OpenClaw `cacheRead`。

### Z.AI (GLM)

- 提供商： `zai`
- 身份验证： `ZAI_API_KEY`
- 示例模型： `zai/glm-5.1`
- CLI： `openclaw onboard --auth-choice zai-api-key`
  - 别名：`z.ai/*` 和 `z-ai/*` 规范化为 `zai/*`
  - `zai-api-key` 自动检测匹配的 Z.AI 端点；`zai-coding-global`、`zai-coding-cn`、`zai-global` 和 `zai-cn` 强制使用特定界面

### Vercel AI Gateway(网关)

- 提供商：`vercel-ai-gateway`
- 认证：`AI_GATEWAY_API_KEY`
- 示例模型：`vercel-ai-gateway/anthropic/claude-opus-4.6`,
  `vercel-ai-gateway/moonshotai/kimi-k2.6`
- CLI：`openclaw onboard --auth-choice ai-gateway-api-key`

### Kilo Gateway(网关)

- 提供商：`kilocode`
- 认证：`KILOCODE_API_KEY`
- 示例模型：`kilocode/kilo/auto`
- CLI：`openclaw onboard --auth-choice kilocode-api-key`
- 基础 URL：`https://api.kilo.ai/api/gateway/`
- 静态回退目录附带 `kilocode/kilo/auto`；实时
  `https://api.kilo.ai/api/gateway/models` 发现可以进一步扩展运行时
  目录。
- `kilocode/kilo/auto` 后的确切上游路由由 Kilo Gateway(网关) 管理，
  而非硬编码在 OpenClaw 中。

有关设置详细信息，请参阅 [/providers/kilocode](/zh/providers/kilocode)。

### 其他捆绑的提供商插件

- OpenRouter：`openrouter` (`OPENROUTER_API_KEY`)
- 示例模型：`openrouter/auto`，`openrouter/moonshotai/kimi-k2.6`
- OpenClaw 仅当请求实际上目标是 `openrouter.ai` 时，才应用 OpenRouter 文档中记录的应用归因标头
- OpenRouter 特定的 Anthropic `cache_control` 标记同样仅限于
  已验证的 OpenRouter 路由，而不是任意的代理 URL
- OpenRouter 保留在代理风格的 OpenAI 兼容路径上，因此原生的 OpenAI 专用请求整形（`serviceTier`、Responses `store`、prompt-cache 提示、OpenAI reasoning-compat 载荷）不会被转发
- Gemini 支持的 OpenRouter 引用仅保留代理 Gemini 的思维签名清理；原生 Gemini 重放验证和引导重写保持关闭状态
- Kilo Gateway(网关)：`kilocode` (`KILOCODE_API_KEY`)
- 示例模型：`kilocode/kilo/auto`
- Gemini 支持的 Kilo 引用保持相同的代理 Gemini 思维签名清理路径；`kilocode/kilo/auto` 和其他不支持代理推理的提示将跳过代理推理注入
- MiniMax：`minimax` (API 密钥) 和 `minimax-portal` (OAuth)
- Auth: `MINIMAX_API_KEY` 用于 `minimax`；`MINIMAX_OAUTH_TOKEN` 或 `MINIMAX_API_KEY` 用于 `minimax-portal`
- 示例模型：`minimax/MiniMax-M2.7` 或 `minimax-portal/MiniMax-M2.7`
- MiniMax 新手引导/API 密钥设置会使用 `input: ["text", "image"]` 编写显式的 M2.7 模型定义；捆绑提供商目录将聊天引用保持为纯文本，直到该提供商配置被实例化
- Moonshot：`moonshot` (`MOONSHOT_API_KEY`)
- 示例模型：`moonshot/kimi-k2.6`
- Kimi Coding：`kimi` (`KIMI_API_KEY` 或 `KIMICODE_API_KEY`)
- 示例模型：`kimi/kimi-code`
- Qianfan：`qianfan` (`QIANFAN_API_KEY`)
- 示例模型：`qianfan/deepseek-v3.2`
- Qwen Cloud：`qwen`（`QWEN_API_KEY`、`MODELSTUDIO_API_KEY` 或 `DASHSCOPE_API_KEY`）
- 示例模型：`qwen/qwen3.5-plus`
- NVIDIA：`nvidia`（`NVIDIA_API_KEY`）
- 示例模型：`nvidia/nvidia/llama-3.1-nemotron-70b-instruct`
- StepFun：`stepfun` / `stepfun-plan`（`STEPFUN_API_KEY`）
- 示例模型：`stepfun/step-3.5-flash`、`stepfun-plan/step-3.5-flash-2603`
- Together：`together`（`TOGETHER_API_KEY`）
- 示例模型：`together/moonshotai/Kimi-K2.5`
- Venice：`venice`（`VENICE_API_KEY`）
- Xiaomi：`xiaomi`（`XIAOMI_API_KEY`）
- 示例模型：`xiaomi/mimo-v2-flash`
- Vercel AI Gateway(网关)：`vercel-ai-gateway` (`AI_GATEWAY_API_KEY`)
- Hugging Face 推理：`huggingface` (`HUGGINGFACE_HUB_TOKEN` 或 `HF_TOKEN`)
- Cloudflare AI Gateway(网关)：`cloudflare-ai-gateway` (`CLOUDFLARE_AI_GATEWAY_API_KEY`)
- 火山引擎：`volcengine` (`VOLCANO_ENGINE_API_KEY`)
- 示例模型：`volcengine-plan/ark-code-latest`
- BytePlus：`byteplus` (`BYTEPLUS_API_KEY`)
- 示例模型：`byteplus-plan/ark-code-latest`
- xAI：`xai` (`XAI_API_KEY`)
  - 原生打包的 xAI 请求使用 xAI 响应路径
  - `/fast` 或 `params.fastMode: true` 将 `grok-3`、`grok-3-mini`、
    `grok-4` 和 `grok-4-0709` 重写为其 `*-fast` 变体
  - `tool_stream` 默认开启；设置
    `agents.defaults.models["xai/<model>"].params.tool_stream` 为 `false` 以
    禁用它
- Mistral：`mistral` (`MISTRAL_API_KEY`)
- 示例模型：`mistral/mistral-large-latest`
- CLI：`openclaw onboard --auth-choice mistral-api-key`
- Groq：`groq` (`GROQ_API_KEY`)
- Cerebras：`cerebras` (`CEREBRAS_API_KEY`)
  - Cerebras 上的 GLM 模型使用 ID `zai-glm-4.7` 和 `zai-glm-4.6`。
  - OpenAI 兼容的基础 URL：`https://api.cerebras.ai/v1`。
- GitHub Copilot：`github-copilot` (`COPILOT_GITHUB_TOKEN` / `GH_TOKEN` / `GITHUB_TOKEN`)
- Hugging Face Inference 示例模型：`huggingface/deepseek-ai/DeepSeek-R1`；CLI：`openclaw onboard --auth-choice huggingface-api-key`。请参阅 [Hugging Face (Inference)](/zh/providers/huggingface)。

## 通过 `models.providers` 的提供商（自定义/基础 URL）

使用 `models.providers`（或 `models.json`）来添加 **自定义** 提供商或
OpenAI/Anthropic 兼容的代理。

下面的许多捆绑提供商插件已经发布了默认目录。
仅当您想要覆盖默认基础 URL、标头或模型列表时，才使用显式的 `models.providers.<id>` 条目。

### Moonshot AI (Kimi)

Moonshot 作为捆绑的提供商插件提供。默认使用内置提供商，仅当您需要覆盖基础 URL 或模型元数据时才添加显式的 `models.providers.moonshot` 条目：

- 提供商：`moonshot`
- 认证：`MOONSHOT_API_KEY`
- 示例模型：`moonshot/kimi-k2.6`
- CLI：`openclaw onboard --auth-choice moonshot-api-key` 或 `openclaw onboard --auth-choice moonshot-api-key-cn`

Kimi K2 模型 ID：

[//]: # "moonshot-kimi-k2-model-refs:start"

- `moonshot/kimi-k2.6`
- `moonshot/kimi-k2.5`
- `moonshot/kimi-k2-thinking`
- `moonshot/kimi-k2-thinking-turbo`
- `moonshot/kimi-k2-turbo`

[//]: # "moonshot-kimi-k2-model-refs:end"

```json5
{
  agents: {
    defaults: { model: { primary: "moonshot/kimi-k2.6" } },
  },
  models: {
    mode: "merge",
    providers: {
      moonshot: {
        baseUrl: "https://api.moonshot.ai/v1",
        apiKey: "${MOONSHOT_API_KEY}",
        api: "openai-completions",
        models: [{ id: "kimi-k2.6", name: "Kimi K2.6" }],
      },
    },
  },
}
```

### Kimi Coding

Kimi Coding 使用 Moonshot AI 的兼容 Anthropic 的端点：

- 提供商：`kimi`
- 认证：`KIMI_API_KEY`
- 示例模型：`kimi/kimi-code`

```json5
{
  env: { KIMI_API_KEY: "sk-..." },
  agents: {
    defaults: { model: { primary: "kimi/kimi-code" } },
  },
}
```

传统 `kimi/k2p5` 作为兼容的模型 ID 仍然被接受。

### 火山引擎 (Doubao)

Volcano Engine (火山引擎) 提供对 Doubao 和中国其他模型的访问。

- 提供商：`volcengine` (编程：`volcengine-plan`)
- 认证：`VOLCANO_ENGINE_API_KEY`
- 示例模型：`volcengine-plan/ark-code-latest`
- CLI：`openclaw onboard --auth-choice volcengine-api-key`

```json5
{
  agents: {
    defaults: { model: { primary: "volcengine-plan/ark-code-latest" } },
  },
}
```

新手引导默认为编程界面，但同时也注册了通用的 `volcengine/*` 目录。

在新手引导/配置模型选择器中，火山引擎认证选项优先显示 `volcengine/*` 和 `volcengine-plan/*` 行。如果这些模型尚未加载，OpenClaw 将回退到未过滤的目录，而不是显示空的提供商范围选择器。

可用模型：

- `volcengine/doubao-seed-1-8-251228` (Doubao Seed 1.8)
- `volcengine/doubao-seed-code-preview-251028`
- `volcengine/kimi-k2-5-260127` (Kimi K2.5)
- `volcengine/glm-4-7-251222` (GLM 4.7)
- `volcengine/deepseek-v3-2-251201` (DeepSeek V3.2 128K)

编码模型 (`volcengine-plan`)：

- `volcengine-plan/ark-code-latest`
- `volcengine-plan/doubao-seed-code`
- `volcengine-plan/kimi-k2.5`
- `volcengine-plan/kimi-k2-thinking`
- `volcengine-plan/glm-4.7`

### BytePlus (国际版)

BytePlus ARK 为国际用户提供与火山引擎相同的模型。

- 提供商：`byteplus` (编码：`byteplus-plan`)
- 认证：`BYTEPLUS_API_KEY`
- 模型示例：`byteplus-plan/ark-code-latest`
- CLI：`openclaw onboard --auth-choice byteplus-api-key`

```json5
{
  agents: {
    defaults: { model: { primary: "byteplus-plan/ark-code-latest" } },
  },
}
```

新手引导默认使用代码界面，但同时也会注册常规的 `byteplus/*` 目录。

在新手引导/配置模型选择器中，BytePlus 身份验证选项优先包含 `byteplus/*` 和 `byteplus-plan/*` 行。如果这些模型尚未加载，OpenClaw 将回退到未过滤的目录，而不是显示空的提供商范围选择器。

可用模型：

- `byteplus/seed-1-8-251228` (Seed 1.8)
- `byteplus/kimi-k2-5-260127` (Kimi K2.5)
- `byteplus/glm-4-7-251222` (GLM 4.7)

代码模型 (`byteplus-plan`)：

- `byteplus-plan/ark-code-latest`
- `byteplus-plan/doubao-seed-code`
- `byteplus-plan/kimi-k2.5`
- `byteplus-plan/kimi-k2-thinking`
- `byteplus-plan/glm-4.7`

### 合成

Synthetic 在 `synthetic` 提供商后面提供兼容 Anthropic 的模型：

- 提供商：`synthetic`
- 身份验证：`SYNTHETIC_API_KEY`
- 示例模型：`synthetic/hf:MiniMaxAI/MiniMax-M2.5`
- CLI：`openclaw onboard --auth-choice synthetic-api-key`

```json5
{
  agents: {
    defaults: { model: { primary: "synthetic/hf:MiniMaxAI/MiniMax-M2.5" } },
  },
  models: {
    mode: "merge",
    providers: {
      synthetic: {
        baseUrl: "https://api.synthetic.new/anthropic",
        apiKey: "${SYNTHETIC_API_KEY}",
        api: "anthropic-messages",
        models: [{ id: "hf:MiniMaxAI/MiniMax-M2.5", name: "MiniMax M2.5" }],
      },
    },
  },
}
```

### MiniMax

MiniMax 通过 `models.providers` 进行配置，因为它使用自定义端点：

- MiniMax OAuth（全球）：`--auth-choice minimax-global-oauth`
- MiniMax OAuth（中国）：`--auth-choice minimax-cn-oauth`
- MiniMax API 密钥（全球）：`--auth-choice minimax-global-api`
- MiniMax API 密钥（中国）：`--auth-choice minimax-cn-api`
- 身份验证：`MINIMAX_API_KEY` 用于 `minimax`；`MINIMAX_OAUTH_TOKEN` 或
  `MINIMAX_API_KEY` 用于 `minimax-portal`

有关设置详情、模型选项和配置片段，请参阅 [/providers/minimax](/zh/providers/minimax)。

在 MiniMax 的兼容 Anthropic 的流式路径上，OpenClaw 默认禁用思考，除非您显式设置它，并且 `/fast on` 会将
`MiniMax-M2.7` 重写为 `MiniMax-M2.7-highspeed`。

插件拥有的功能拆分：

- 文本/聊天默认保留在 `minimax/MiniMax-M2.7` 上
- 图像生成是 `minimax/image-01` 或 `minimax-portal/image-01`
- 图像理解是 MiniMax 两种认证路径上插件拥有的 `MiniMax-VL-01`
- 网络搜索保留在提供商 id `minimax` 上

### LM Studio

LM Studio 作为打包的提供商插件提供，使用原生 API：

- 提供商：`lmstudio`
- 认证：`LM_API_TOKEN`
- 默认推理基础 URL：`http://localhost:1234/v1`

然后设置一个模型（替换为 `http://localhost:1234/api/v1/models` 返回的 ID 之一）：

```json5
{
  agents: {
    defaults: { model: { primary: "lmstudio/openai/gpt-oss-20b" } },
  },
}
```

OpenClaw 使用 LM Studio 的原生 `/api/v1/models` 和 `/api/v1/models/load` 进行发现和自动加载，默认情况下使用 `/v1/chat/completions` 进行推理。
有关设置和故障排除，请参阅 [/providers/lmstudio](/zh/providers/lmstudio)。

### Ollama

Ollama 作为捆绑的提供商插件提供，并使用 Ollama 的原生 API：

- 提供商：`ollama`
- 身份验证：无需身份验证（本地服务器）
- 示例模型：`ollama/llama3.3`
- 安装：[https://ollama.com/download](https://ollama.com/download)

```bash
# Install Ollama, then pull a model:
ollama pull llama3.3
```

```json5
{
  agents: {
    defaults: { model: { primary: "ollama/llama3.3" } },
  },
}
```

当您使用 `OLLAMA_API_KEY` 选择加入时，系统会在 `http://127.0.0.1:11434` 本地检测到 Ollama，并且捆绑的提供商插件会将 Ollama 直接添加到 `openclaw onboard` 和模型选择器中。有关新手引导、云/本地模式和自定义配置的信息，请参阅 [/providers/ollama](/zh/providers/ollama)。

### vLLM

vLLM 作为本地/自托管 OpenAI 兼容服务器的捆绑提供商插件提供：

- 提供商：`vllm`
- 身份验证：可选（取决于您的服务器）
- 默认基础 URL：`http://127.0.0.1:8000/v1`

要在本地选择加入自动发现（如果您的服务器不强制执行身份验证，则任何值都可以）：

```bash
export VLLM_API_KEY="vllm-local"
```

然后设置一个模型（替换为 `/v1/models` 返回的 ID 之一）：

```json5
{
  agents: {
    defaults: { model: { primary: "vllm/your-model-id" } },
  },
}
```

有关详细信息，请参阅 [/providers/vllm](/zh/providers/vllm)。

### SGLang

SGLang 作为捆绑的提供商插件提供，用于快速自托管
与 OpenAI 兼容的服务器：

- 提供商：`sglang`
- 身份验证：可选（取决于您的服务器）
- 默认基础 URL：`http://127.0.0.1:30000/v1`

要在本地选择加入自动发现（如果您的服务器不强制执行身份验证，则任何值都有效）：

```bash
export SGLANG_API_KEY="sglang-local"
```

然后设置一个模型（替换为 `/v1/models` 返回的 ID 之一）：

```json5
{
  agents: {
    defaults: { model: { primary: "sglang/your-model-id" } },
  },
}
```

有关详细信息，请参阅 [/providers/sglang](/zh/providers/sglang)。

### 本地代理（LM Studio、vLLM、LiteLLM 等）

示例（与 OpenAI 兼容）：

```json5
{
  agents: {
    defaults: {
      model: { primary: "lmstudio/my-local-model" },
      models: { "lmstudio/my-local-model": { alias: "Local" } },
    },
  },
  models: {
    providers: {
      lmstudio: {
        baseUrl: "http://localhost:1234/v1",
        apiKey: "${LM_API_TOKEN}",
        api: "openai-completions",
        models: [
          {
            id: "my-local-model",
            name: "Local Model",
            reasoning: false,
            input: ["text"],
            cost: { input: 0, output: 0, cacheRead: 0, cacheWrite: 0 },
            contextWindow: 200000,
            maxTokens: 8192,
          },
        ],
      },
    },
  },
}
```

注意：

- 对于自定义提供商，`reasoning`、`input`、`cost`、`contextWindow` 和 `maxTokens` 是可选的。
  当省略时，OpenClaw 默认为：
  - `reasoning: false`
  - `input: ["text"]`
  - `cost: { input: 0, output: 0, cacheRead: 0, cacheWrite: 0 }`
  - `contextWindow: 200000`
  - `maxTokens: 8192`
- 推荐：设置与您的代理/模型限制相匹配的显式值。
- 对于非原生端点上的 `api: "openai-completions"`（任何主机不是 `api.openai.com` 的非空 `baseUrl`），OpenClaw 强制执行 `compat.supportsDeveloperRole: false`，以避免因不受支持的 `developer` 角色而导致提供商返回 400 错误。
- 代理风格的 OpenAI 兼容路由也会跳过仅限原生 OpenAI 的请求整形：没有 `service_tier`，没有 Responses `store`，没有提示缓存提示，没有 OpenAI 推理兼容负载整形，也没有隐藏的 OpenClaw 归属标头。
- 如果 `baseUrl` 为空/省略，OpenClaw 将保留默认的 OpenAI 行为（即解析为 `api.openai.com`）。
- 出于安全考虑，显式的 `compat.supportsDeveloperRole: true` 仍会在非原生的 `openai-completions` 端点上被覆盖。

## CLI 示例

```bash
openclaw onboard --auth-choice opencode-zen
openclaw models set opencode/claude-opus-4-6
openclaw models list
```

另请参阅：[/gateway/configuration](/zh/gateway/configuration) 获取完整配置示例。

## 相关

- [模型](/zh/concepts/models) — 模型配置和别名
- [模型故障转移](/zh/concepts/model-failover) — 回退链和重试行为
- [配置参考](/zh/gateway/configuration-reference#agent-defaults) — 模型配置键
- [提供商](/zh/providers) — 各提供商设置指南
