---
summary: "模型提供商概览，包含示例配置和 CLI 新手引导流程"
read_when:
  - You need a provider-by-provider model setup reference
  - You want example configs or CLI onboarding commands for model providers
title: "模型提供商"
---

# 模型提供商

本页面涵盖 **LLM/模型 providers**（而非 WhatsApp/Telegram 等聊天渠道）。
有关模型选择规则，请参阅 [/concepts/models](/en/concepts/models)。

## 快速规则

- 模型引用使用 `provider/model`（例如：`opencode/claude-opus-4-6`）。
- 如果您设置了 `agents.defaults.models`，它将成为允许列表。
- CLI 助手：`openclaw onboard`，`openclaw models list`，`openclaw models set <provider/model>`。
- 回退运行时规则、冷却探测和会话覆盖持久化记录在
  [/concepts/模型-failover](/en/concepts/model-failover) 中。
- `models.providers.*.models[].contextWindow` 是原生模型元数据；
  `models.providers.*.models[].contextTokens` 是有效的运行时上限。
- 提供商插件可以通过 `registerProvider({ catalog })` 注入模型目录；
  OpenClaw 在写入 `models.json` 之前将该输出合并到 `models.providers` 中。
- 提供商清单可以声明 `providerAuthEnvVars` 和
  `providerAuthAliases`，这样通用的基于环境的身份验证探测和提供商变体
  就不需要加载插件运行时。剩余的核心环境变量映射现在
  仅用于非插件/核心提供商以及少数通用优先级情况，
  例如 Anthropic API 密钥优先的新手引导。
- 提供商插件还可以通过
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
  `augmentModelCatalog`、`isBinaryThinking`、`supportsXHighThinking`、
  `resolveDefaultThinkingLevel`、`applyConfigDefaults`、`isModernModelRef`、
  `prepareRuntimeAuth`、`resolveUsageAuth`、`fetchUsageSnapshot` 和
  `onModelSelected` 拥有提供商运行时行为。
- 注意：提供商运行时 `capabilities` 是共享的运行器元数据（提供商系列、转录/工具特性、传输/缓存提示）。这与 [公共能力模型](/en/plugins/architecture#public-capability-model) 不同，后者描述了插件注册的内容（文本推理、语音等）。
- 捆绑的 `codex` 提供商与捆绑的 Codex 代理 harness 配对。当您需要 Codex 拥有的登录、模型发现、本机线程恢复和应用服务器执行时，请使用 `codex/gpt-*`。普通的 `openai/gpt-*` 引用继续使用 OpenAI 提供商和正常的 OpenClaw 提供商传输。仅 Codex 的部署可以使用 `agents.defaults.embeddedHarness.fallback: "none"` 禁用自动 PI 回退；请参阅 [Codex Harness](/en/plugins/codex-harness)。

## 插件拥有的提供商行为

提供商插件现在可以拥有大多数特定于提供商的逻辑，而 OpenClaw 保持通用推理循环。

典型划分：

- `auth[].run` / `auth[].runNonInteractive`：提供商拥有 `openclaw onboard`、`openclaw models auth` 和无头设置的新手引导/登录流程
- `wizard.setup` / `wizard.modelPicker`：提供商拥有身份验证选择标签、旧版别名、新手引导允许列表提示以及新手引导/模型选择器中的设置条目
- `catalog`：提供商出现在 `models.providers` 中
- `normalizeModelId`：提供商在查找或规范化之前规范化旧版/预览模型 ID
- `normalizeTransport`：提供商在通用模型组装之前规范化传输族 `api` / `baseUrl`；OpenClaw 首先检查匹配的提供商，然后检查其他支持挂钩的提供商插件，直到其中一个实际更改了传输
- `normalizeConfig`：提供商在运行时使用它之前规范化 `models.providers.<id>` 配置；OpenClaw 首先检查匹配的提供商，然后检查其他支持挂钩的提供商插件，直到其中一个实际更改了配置。如果没有提供商挂钩重写配置，捆绑的 Google 系列助手仍然会规范化支持的 Google 提供商条目。
- `applyNativeStreamingUsageCompat`：提供商应用由端点驱动的原生流式使用兼容性重写，针对配置提供商
- `resolveConfigApiKey`：提供商解析配置提供商的环境标记认证，
  而无需强制完整的运行时认证加载。`amazon-bedrock` 在此处也有
  一个内置的 AWS 环境标记解析器，即使 Bedrock 运行时认证使用
  的 AWS SDK 默认链。
- `resolveSyntheticAuth`：提供商可以公开本地/自托管或其他
  支持配置的身份验证可用性，而无需持久化明文机密
- `shouldDeferSyntheticProfileAuth`：提供商可以将存储的合成配置文件
  占位符标记为比环境/配置支持的身份验证优先级更低
- `resolveDynamicModel`：提供商接受本地静态目录中不存在的模型 ID
- `prepareDynamicModel`：提供商在重试动态解析之前
  需要元数据刷新
- `normalizeResolvedModel`：提供商需要传输或基本 URL 重写
- `contributeResolvedModelCompat`：提供商为其供应商模型提供兼容性标志，
  即使它们是通过其他兼容传输到达的
- `capabilities`：提供商发布转录/工具/提供商系列的特性
- `normalizeToolSchemas`：提供商在嵌入式运行程序看到
  工具架构之前对其进行清理
- `inspectToolSchemas`：提供商在规范化之后
  公开特定于传输的架构警告
- `resolveReasoningOutputMode`：提供商选择原生与标记
  推理输出契约
- `prepareExtraParams`：提供商默认或规范化每个模型的请求参数
- `createStreamFn`：提供商用完全自定义的传输
  替换正常的流路径
- `wrapStreamFn`：提供商应用请求头/正文/模型兼容性包装器
- `resolveTransportTurnState`：提供商提供每轮次的原生传输
  头或元数据
- `resolveWebSocketSessionPolicy`：提供商提供原生 WebSocket 会话
  头或会话冷却策略
- `createEmbeddingProvider`：当内存嵌入行为属于提供商插件
  而不是核心嵌入交换机时，提供商拥有该行为的所有权
- `formatApiKey`：提供商将存储的身份验证配置文件格式化为传输所需的运行时 `apiKey` 字符串
- `refreshOAuth`：当共享的 `pi-ai` 刷新程序不足时，提供商拥有 OAuth 刷新权
- `buildAuthDoctorHint`：当 OAuth 刷新失败时，提供商会附加修复指南
- `matchesContextOverflowError`：提供商识别通用启发式方法会遗漏的特定于提供商的上下文窗口溢出错误
- `classifyFailoverReason`：提供商将特定于提供商的原始传输/API 错误映射到速率限制或过载等故障转移原因
- `isCacheTtlEligible`：提供商决定哪些上游模型 ID 支持 prompt-cache TTL
- `buildMissingAuthMessage`：提供商用特定于提供商的恢复提示替换通用的身份验证存储错误
- `suppressBuiltInModel`：提供商隐藏过时的上游行，并且可以返回供应商拥有的错误以用于直接解决故障
- `augmentModelCatalog`：提供商在发现和配置合并后附加合成/最终目录行
- `isBinaryThinking`：提供商拥有二进制开/关思考 UX
- `supportsXHighThinking`：提供商选择选定的模型加入 `xhigh`
- `resolveDefaultThinkingLevel`：提供商拥有模型系列的默认 `/think` 策略
- `applyConfigDefaults`：提供商根据身份验证模式、环境或模型系列，在配置具体化期间应用特定于提供商的全局默认值
- `isModernModelRef`：提供商拥有实时/冒烟测试首选模型匹配
- `prepareRuntimeAuth`：提供商将配置的凭据转换为短期运行时令牌
- `resolveUsageAuth`：提供商解析 `/usage` 的使用/配额凭据以及相关状态/报告表面
- `fetchUsageSnapshot`：提供商拥有使用端点的获取/解析，而核心仍然拥有摘要外壳和格式化
- `onModelSelected`：提供商运行选择后副作用，例如遥测或提供商拥有的会话簿记

当前捆绑的示例：

- `anthropic`：Claude 4.6 向前兼容回退、身份验证修复提示、使用情况
  端点获取、cache-TTL/提供商系列元数据以及支持身份验证的全局
  配置默认值
- `amazon-bedrock`：提供商拥有的上下文溢出匹配和故障转移
  原因分类，针对 Bedrock 特定的限流/未就绪错误，加上
  共享的 `anthropic-by-model` 重放系列，用于 Anthropic 流量上仅限 Claude 的重放策略
  保护
- `anthropic-vertex`：Anthropic 消息流量上仅限 Claude 的重放策略保护
- `openrouter`：透传模型 ID、请求包装器、提供商功能
  提示、代理 Gemini 流量上的 Gemini 思维签名清理、通过 `openrouter-thinking` 流系列进行代理推理注入、路由
  元数据转发以及 cache-TTL 策略
- `github-copilot`：新手引导/设备登录、向前兼容模型回退、
  Claude 思维记录提示、运行时令牌交换以及使用情况端点
  获取
- `openai`：GPT-5.4 向前兼容回退、直接 OpenAI 传输
  标准化、支持 Codex 的缺失身份验证提示、Spark 抑制、合成
  OpenAI/Codex 目录行、思维/实时模型策略、使用令牌别名
  标准化（`input` / `output` 和 `prompt` / `completion` 系列）、
  用于原生 OpenAI/Codex 包装器的共享 `openai-responses-defaults` 流系列、提供商系列元数据、
  `gpt-image-1` 的捆绑图像生成提供商注册，以及
  `sora-2` 的捆绑视频生成提供商注册
- `google` 和 `google-gemini-cli`：Gemini 3.1 前向兼容回退、
  原生 Gemini 重放验证、启动重放清理、标记化
  推理输出模式、现代模型匹配、Gemini 图像预览模型的
  捆绑图像生成提供商注册，以及 Veo 模型的
  捆绑视频生成提供商注册；Gemini CLI OAuth 还
  负责身份配置文件令牌格式化、使用令牌解析和使用端点的
  获取以用于使用情况展示
- `moonshot`：共享传输、插件拥有的思考负载归一化
- `kilocode`：共享传输、插件拥有的请求头、推理负载
  归一化、代理 Gemini 签名清理以及缓存 TTL
  策略
- `zai`：GLM-5 前向兼容回退、`tool_stream` 默认值、缓存 TTL
  策略、二元思考/实时模型策略以及使用身份验证 + 配额获取；
  未知的 `glm-5*` ID 从捆绑的 `glm-4.7` 模板合成
- `xai`：原生 Responses 传输归一化、Grok 快速变体的
  `/fast` 别名重写、默认 `tool_stream`、xAI 特定的工具架构 /
  推理负载清理，以及 `grok-imagine-video` 的
  捆绑视频生成提供商注册
- `mistral`：插件拥有的功能元数据
- `opencode` 和 `opencode-go`：插件拥有的功能元数据加上
  代理 Gemini 签名清理
- `alibaba`：插件拥有的视频生成目录，用于直接引用 Wan 模型
  （例如 `alibaba/wan2.6-t2v`）
- `byteplus`：插件拥有的目录加上 Seedance 文本生成视频/图像生成视频模型的
  捆绑视频生成提供商注册
- `fal`：FLUX 图像模型的托管第三方图像生成提供商的
  捆绑视频生成提供商注册，加上托管第三方视频模型的
  捆绑视频生成提供商注册
- `cloudflare-ai-gateway`、`huggingface`、`kimi`、`nvidia`、`qianfan`、
  `stepfun`、`synthetic`、`venice`、`vercel-ai-gateway` 和 `volcengine`：
  仅限插件拥有的目录
- `qwen`：用于文本模型的插件拥有的目录，以及为其多模态表面共享的
  媒体理解和视频生成提供商注册；Qwen 视频生成使用标准 DashScope 视频
  端点，并捆绑了 `wan2.6-t2v` 和 `wan2.7-r2v` 等 Wan 模型
- `runway`：用于原生 Runway 基于任务的模型（例如 `gen4.5`）的
  插件拥有的视频生成提供商注册
- `minimax`：插件拥有的目录，用于 Hailuo 视频模型的捆绑视频生成提供商
  注册，用于 `image-01` 的捆绑图像生成提供商注册，
  混合 Anthropic/OpenAI 重放策略选择，以及使用授权/快照逻辑
- `together`：插件拥有的目录，以及用于 Wan 视频模型的
  捆绑视频生成提供商注册
- `xiaomi`：插件拥有的目录以及使用授权/快照逻辑

捆绑的 `openai` 插件现在拥有这两个提供商 ID：`openai` 和
`openai-codex`。

这涵盖了仍然符合 OpenClaw 标准传输的提供商。如果提供商需要
完全自定义的请求执行器，则是一个独立的、更深层的扩展表面。

## API 密钥轮换

- 支持选定提供商的通用提供商轮换。
- 通过以下方式配置多个密钥：
  - `OPENCLAW_LIVE_<PROVIDER>_KEY`（单个实时覆盖，优先级最高）
  - `<PROVIDER>_API_KEYS`（逗号或分号分隔列表）
  - `<PROVIDER>_API_KEY`（主密钥）
  - `<PROVIDER>_API_KEY_*`（编号列表，例如 `<PROVIDER>_API_KEY_1`）
- 对于 Google 提供商，`GOOGLE_API_KEY` 也作为后备包含在内。
- 密钥选择顺序保留优先级并对值进行去重。
- 请求仅在遇到速率限制响应时才会使用下一个密钥重试（例如 `429`、`rate_limit`、`quota`、`resource exhausted`、`Too many
concurrent requests`, `ThrottlingException`, `concurrency limit reached`、
  `workers_ai ... quota limit exceeded` 或定期使用限制消息）。
- 非速率限制的失败会立即失败；不会尝试密钥轮换。
- 当所有候选密钥都失败时，将返回最后一次尝试的最终错误。

## 内置提供商（pi-ai 目录）

OpenClaw 附带 pi-ai 目录。这些提供商**不**需要 `models.providers` 配置；只需设置身份验证并选择一个模型。

### OpenAI

- 提供商：`openai`
- 身份验证：`OPENAI_API_KEY`
- 可选轮换：`OPENAI_API_KEYS`、`OPENAI_API_KEY_1`、`OPENAI_API_KEY_2`，以及 `OPENCLAW_LIVE_OPENAI_KEY`（单项覆盖）
- 示例模型：`openai/gpt-5.4`、`openai/gpt-5.4-pro`
- CLI：`openclaw onboard --auth-choice openai-api-key`
- 默认传输方式为 `auto`（WebSocket 优先，SSE 回退）
- 通过 `agents.defaults.models["openai/<model>"].params.transport` 针对每个模型进行覆盖（`"sse"`、`"websocket"` 或 `"auto"`）
- OpenAI Responses WebSocket 预热默认通过 `params.openaiWsWarmup`（`true`/`false`）启用
- 可以通过 `agents.defaults.models["openai/<model>"].params.serviceTier` 启用 OpenAI 优先处理
- `/fast` 和 `params.fastMode` 将直接的 `openai/*` Responses 请求映射到 `api.openai.com` 上的 `service_tier=priority`
- 当您需要显式层级而不是共享的 `/fast` 切换时，请使用 `params.serviceTier`
- 隐藏的 OpenClaw 归因标头（`originator`、`version`、
  `User-Agent`）仅适用于流向 `api.openai.com` 的原生 OpenAI 流量，而不适用于
  通用的 OpenAI 兼容代理
- 原生 OpenAI 路由还会保留 Responses `store`、提示缓存提示以及
  OpenAI 推理兼容负载格式；代理路由则不会
- `openai/gpt-5.3-codex-spark` 在 OpenClaw 中被有意屏蔽，因为实时 OpenAI API 会拒绝它；Spark 被视为仅限 Codex 使用

```json5
{
  agents: { defaults: { model: { primary: "openai/gpt-5.4" } } },
}
```

### Anthropic

- 提供商：`anthropic`
- 身份验证：`ANTHROPIC_API_KEY`
- 可选轮换：`ANTHROPIC_API_KEYS`、`ANTHROPIC_API_KEY_1`、`ANTHROPIC_API_KEY_2`，加上 `OPENCLAW_LIVE_ANTHROPIC_KEY`（单次覆盖）
- 示例模型：`anthropic/claude-opus-4-6`
- CLI：`openclaw onboard --auth-choice apiKey`
- 直接面向公网的 Anthropic 请求支持共享的 `/fast` 开关和 `params.fastMode`，包括发送到 `api.anthropic.com` 的 API 密钥和 OAuth 认证流量；OpenClaw 会将其映射到 Anthropic `service_tier`（`auto` 对比 `standard_only`）
- Anthropic 说明：Anthropic 员工告知我们，类似 OpenClaw 的 Claude CLI 使用再次被允许，因此 OpenClaw 将 Claude CLI 复用和 `claude -p` 使用视为此集成的合规行为，除非 Anthropic 发布新政策。
- Anthropic setup-token 仍作为受支持的 OpenClaw 令牌路径可用，但 OpenClaw 现在优先使用 Claude CLI 复用和 `claude -p`（如果可用）。

```json5
{
  agents: { defaults: { model: { primary: "anthropic/claude-opus-4-6" } } },
}
```

### OpenAI Code (Codex)

- 提供商：`openai-codex`
- 身份验证：OAuth (ChatGPT)
- 示例模型：`openai-codex/gpt-5.4`
- CLI：`openclaw onboard --auth-choice openai-codex` 或 `openclaw models auth login --provider openai-codex`
- 默认传输方式为 `auto`（WebSocket 优先，SSE 备用）
- 通过 `agents.defaults.models["openai-codex/<model>"].params.transport` 逐个模型覆盖（`"sse"`、`"websocket"` 或 `"auto"`）
- `params.serviceTier` 也会在本机 Codex Responses 请求 (`chatgpt.com/backend-api`) 上被转发
- 隐藏的 OpenClaw 归属标头 (`originator`, `version`,
  `User-Agent`) 仅附加到 `chatgpt.com/backend-api` 的本机 Codex 流量上，
  而不附加到通用的 OpenAI 兼容代理
- 与直接 `openai/*` 共享相同的 `/fast` 切换开关和 `params.fastMode` 配置；OpenClaw 将其映射为 `service_tier=priority`
- 当 Codex OAuth 目录公开 `openai-codex/gpt-5.3-codex-spark` 时，其仍然可用；取决于权限
- `openai-codex/gpt-5.4` 保留本机 `contextWindow = 1050000` 和默认运行时 `contextTokens = 272000`；使用 `models.providers.openai-codex.models[].contextTokens` 覆盖运行时上限
- 策略说明：明确支持外部工具/工作流（如 OpenAI）使用 OAuth Codex OpenClaw。

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

- [Qwen Cloud](/en/providers/qwen)：Qwen Cloud 提供商界面加上 Alibaba DashScope 和 Coding Plan 端点映射
- [MiniMax](/en/providers/minimax)：MiniMax Coding Plan OAuth 或 API 密钥访问
- [GLM Models](/en/providers/glm)：Z.AI Coding Plan 或通用 API 端点

### OpenCode

- 身份验证：`OPENCODE_API_KEY` (或 `OPENCODE_ZEN_API_KEY`)
- Zen 运行时提供商：`opencode`
- Go 运行时提供商：`opencode-go`
- 模型示例：`opencode/claude-opus-4-6`, `opencode-go/kimi-k2.5`
- CLI：`openclaw onboard --auth-choice opencode-zen` 或 `openclaw onboard --auth-choice opencode-go`

```json5
{
  agents: { defaults: { model: { primary: "opencode/claude-opus-4-6" } } },
}
```

### Google Gemini (API 密钥)

- 提供商：`google`
- 身份验证：`GEMINI_API_KEY`
- 可选轮换：`GEMINI_API_KEYS`、`GEMINI_API_KEY_1`、`GEMINI_API_KEY_2`、`GOOGLE_API_KEY` 回退以及 `OPENCLAW_LIVE_GEMINI_KEY` (单项覆盖)
- 模型示例：`google/gemini-3.1-pro-preview`, `google/gemini-3-flash-preview`
- 兼容性：使用 `google/gemini-3.1-flash-preview` 的旧版 OpenClaw 配置会被规范化为 `google/gemini-3-flash-preview`
- CLI：`openclaw onboard --auth-choice gemini-api-key`
- 直接运行 Gemini 也接受 `agents.defaults.models["google/<model>"].params.cachedContent`（或旧版 `cached_content`）以转发提供商原生的 `cachedContents/...` 句柄；Gemini 缓存命中显示为 OpenClaw `cacheRead`

### Google Vertex 和 Gemini CLI

- 提供商：`google-vertex`，`google-gemini-cli`
- 认证：Vertex 使用 gcloud ADC；Gemini CLI 使用其 OAuth 流程
- 注意：CLI 中的 Gemini OAuth OpenClaw 是非官方集成。有用户报告在使用第三方客户端后 Google 账号受到限制。请查看 Google 条款，如果选择继续，请使用非关键账号。
- Gemini CLI OAuth 作为捆绑 `google` 插件的一部分提供。
  - 首先安装 Gemini CLI：
    - `brew install gemini-cli`
    - 或 `npm install -g @google/gemini-cli`
  - 启用：`openclaw plugins enable google`
  - 登录：`openclaw models auth login --provider google-gemini-cli --set-default`
  - 默认模型：`google-gemini-cli/gemini-3-flash-preview`
  - 注意：您**不**需要将客户端 ID 或密钥粘贴到 `openclaw.json` 中。CLI 登录流程会将令牌存储在网关主机的认证配置文件中。
  - 如果登录后请求失败，请在网关主机上设置 `GOOGLE_CLOUD_PROJECT` 或 `GOOGLE_CLOUD_PROJECT_ID`。
  - Gemini CLI JSON 回复从 `response` 解析；使用情况回退到 `stats`，其中 `stats.cached` 被规范化为 OpenClaw `cacheRead`。

### Z.AI (GLM)

- 提供商：`zai`
- 认证：`ZAI_API_KEY`
- 示例模型：`zai/glm-5.1`
- CLI：`openclaw onboard --auth-choice zai-api-key`
  - 别名：`z.ai/*` 和 `z-ai/*` 规范化为 `zai/*`
  - `zai-api-key` 会自动检测匹配的 Z.AI 端点；`zai-coding-global`、`zai-coding-cn`、`zai-global` 和 `zai-cn` 会强制特定的接口

### Vercel AI Gateway(网关)

- 提供商：`vercel-ai-gateway`
- 认证：`AI_GATEWAY_API_KEY`
- 示例模型：`vercel-ai-gateway/anthropic/claude-opus-4.6`
- CLI：`openclaw onboard --auth-choice ai-gateway-api-key`

### Kilo Gateway(网关)

- 提供商：`kilocode`
- 认证：`KILOCODE_API_KEY`
- 示例模型：`kilocode/kilo/auto`
- CLI：`openclaw onboard --auth-choice kilocode-api-key`
- Base URL：`https://api.kilo.ai/api/gateway/`
- 静态后备目录包含 `kilocode/kilo/auto`；
  实时 `https://api.kilo.ai/api/gateway/models` 发现可以进一步扩展
  运行时目录。
- `kilocode/kilo/auto` 背后的精确上游路由由 Kilo Gateway(网关) 所有，
  而非硬编码在 OpenClaw 中。

有关设置详细信息，请参阅 [/providers/kilocode](/en/providers/kilocode)。

### 其他捆绑的提供商插件

- OpenRouter：`openrouter` (`OPENROUTER_API_KEY`)
- 示例模型：`openrouter/auto`
- OpenClaw 仅当请求实际针对 `openrouter.ai` 时，
  才会应用 OpenRouter 记录的应用归因标头
- OpenRouter 专用的 Anthropic `cache_control` 标记同样仅限于
  已验证的 OpenRouter 路由，而非任意代理 URL
- OpenRouter 仍保留在代理风格的 OpenAI 兼容路径上，因此
  原生 OpenAI 专用请求整形（`serviceTier`、Responses `store`、
  prompt-cache 提示、OpenAI reasoning-compat 有效载荷）不会被转发
- Gemini 支持的 OpenRouter 引用仅保留代理 Gemini 的思维签名清理；
  原生 Gemini 重放验证和引导重写保持关闭状态
- Kilo Gateway(网关)：`kilocode` (`KILOCODE_API_KEY`)
- 示例模型：`kilocode/kilo/auto`
- Gemini 支持的 Kilo 引用保持相同的代理 Gemini 思维签名
  清理路径；`kilocode/kilo/auto` 和其他不支持的代理推理
  提示将跳过代理推理注入
- MiniMax：`minimax` (API 密钥) 和 `minimax-portal` (OAuth)
- 认证：`MINIMAX_API_KEY` 用于 `minimax`；`MINIMAX_OAUTH_TOKEN` 或 `MINIMAX_API_KEY` 用于 `minimax-portal`
- 示例模型：`minimax/MiniMax-M2.7` 或 `minimax-portal/MiniMax-M2.7`
- MiniMax 新手引导/API 密钥设置会使用 `input: ["text", "image"]` 编写明确的 M2.7 模型定义；内置提供商目录会将聊天引用保持为纯文本，直到该提供商配置被实例化
- Moonshot：`moonshot` (`MOONSHOT_API_KEY`)
- 示例模型：`moonshot/kimi-k2.5`
- Kimi Coding：`kimi` (`KIMI_API_KEY` 或 `KIMICODE_API_KEY`)
- 示例模型：`kimi/kimi-code`
- Qianfan：`qianfan` (`QIANFAN_API_KEY`)
- 示例模型：`qianfan/deepseek-v3.2`
- Qwen Cloud：`qwen` (`QWEN_API_KEY`、`MODELSTUDIO_API_KEY` 或 `DASHSCOPE_API_KEY`)
- 示例模型：`qwen/qwen3.5-plus`
- NVIDIA：`nvidia` (`NVIDIA_API_KEY`)
- 示例模型：`nvidia/nvidia/llama-3.1-nemotron-70b-instruct`
- StepFun：`stepfun` / `stepfun-plan` (`STEPFUN_API_KEY`)
- 示例模型：`stepfun/step-3.5-flash`、`stepfun-plan/step-3.5-flash-2603`
- Together：`together` (`TOGETHER_API_KEY`)
- 示例模型：`together/moonshotai/Kimi-K2.5`
- Venice：`venice` (`VENICE_API_KEY`)
- Xiaomi：`xiaomi` (`XIAOMI_API_KEY`)
- 示例模型：`xiaomi/mimo-v2-flash`
- Vercel AI Gateway：`vercel-ai-gateway` (`AI_GATEWAY_API_KEY`)
- Hugging Face Inference：`huggingface` (`HUGGINGFACE_HUB_TOKEN` 或 `HF_TOKEN`)
- Cloudflare AI Gateway：`cloudflare-ai-gateway` (`CLOUDFLARE_AI_GATEWAY_API_KEY`)
- Volcengine：`volcengine` (`VOLCANO_ENGINE_API_KEY`)
- 示例模型：`volcengine-plan/ark-code-latest`
- BytePlus：`byteplus` (`BYTEPLUS_API_KEY`)
- 示例模型：`byteplus-plan/ark-code-latest`
- xAI: `xai` (`XAI_API_KEY`)
  - 原生捆绑的 xAI 请求使用 xAI Responses 路径
  - `/fast` 或 `params.fastMode: true` 会将 `grok-3`、`grok-3-mini`、
    `grok-4` 和 `grok-4-0709` 重写为其 `*-fast` 变体
  - `tool_stream` 默认开启；设置
    `agents.defaults.models["xai/<model>"].params.tool_stream` 为 `false` 以
    禁用它
- Mistral: `mistral` (`MISTRAL_API_KEY`)
- 示例模型：`mistral/mistral-large-latest`
- CLI: `openclaw onboard --auth-choice mistral-api-key`
- Groq: `groq` (`GROQ_API_KEY`)
- Cerebras: `cerebras` (`CEREBRAS_API_KEY`)
  - Cerebras 上的 GLM 模型使用 ID `zai-glm-4.7` 和 `zai-glm-4.6`。
  - OpenAI 兼容的基础 URL：`https://api.cerebras.ai/v1`。
- GitHub Copilot: `github-copilot` (`COPILOT_GITHUB_TOKEN` / `GH_TOKEN` / `GITHUB_TOKEN`)
- Hugging Face 推理示例模型：`huggingface/deepseek-ai/DeepSeek-R1`；CLI：`openclaw onboard --auth-choice huggingface-api-key`。请参阅 [Hugging Face (Inference)](/en/providers/huggingface)。

## 通过 `models.providers` 的提供商（自定义/基础 URL）

使用 `models.providers`（或 `models.json`）添加 **自定义** 提供商或
OpenAI/Anthropic 兼容的代理。

下面许多捆绑的提供商插件已经发布了默认目录。仅当您想要覆盖
默认的基础 URL、请求头或模型列表时，才使用显式的 `models.providers.<id>` 条目。

### Moonshot AI (Kimi)

Moonshot 作为一个捆绑的提供商插件提供。默认情况下使用内置提供商，
并且仅当您需要覆盖基础 URL 或模型元数据时才添加显式的 `models.providers.moonshot` 条目：

- 提供商：`moonshot`
- 认证：`MOONSHOT_API_KEY`
- 示例模型：`moonshot/kimi-k2.5`
- CLI：`openclaw onboard --auth-choice moonshot-api-key` 或 `openclaw onboard --auth-choice moonshot-api-key-cn`

Kimi K2 模型 ID：

[//]: # "moonshot-kimi-k2-model-refs:start"

- `moonshot/kimi-k2.5`
- `moonshot/kimi-k2-thinking`
- `moonshot/kimi-k2-thinking-turbo`
- `moonshot/kimi-k2-turbo`

[//]: # "moonshot-kimi-k2-model-refs:end"

```json5
{
  agents: {
    defaults: { model: { primary: "moonshot/kimi-k2.5" } },
  },
  models: {
    mode: "merge",
    providers: {
      moonshot: {
        baseUrl: "https://api.moonshot.ai/v1",
        apiKey: "${MOONSHOT_API_KEY}",
        api: "openai-completions",
        models: [{ id: "kimi-k2.5", name: "Kimi K2.5" }],
      },
    },
  },
}
```

### Kimi Coding

Kimi Coding 使用 Moonshot AI 的 Anthropic 兼容端点：

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

旧版 `kimi/k2p5` 仍作为兼容模型 ID 被接受。

### 火山引擎 (Doubao)

火山引擎 (Volcano Engine) 提供对中国境内的 Doubao 及其他模型的访问权限。

- 提供商：`volcengine`（编码：`volcengine-plan`）
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

新手引导默认使用编码界面，但同时也会注册通用 `volcengine/*` 目录。

在“新手引导/配置模型”选择器中，火山引擎认证选项优先显示 `volcengine/*` 和 `volcengine-plan/*` 行。如果这些模型尚未加载，OpenClaw 将回退到未过滤的目录，而不是显示空的提供商范围选择器。

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

### BytePlus (国际)

BytePlus ARK 为国际用户提供与火山引擎相同的模型访问权限。

- 提供商：`byteplus`（编码：`byteplus-plan`）
- 认证：`BYTEPLUS_API_KEY`
- 示例模型：`byteplus-plan/ark-code-latest`
- CLI：`openclaw onboard --auth-choice byteplus-api-key`

```json5
{
  agents: {
    defaults: { model: { primary: "byteplus-plan/ark-code-latest" } },
  },
}
```

新手引导默认使用编码界面，但同时也会注册通用 `byteplus/*` 目录。

在OpenClaw/配置OpenClaw选择器时，BytePlus 身份验证选项优先选择
`byteplus/*` 和 `byteplus-plan/*` 行。如果这些OpenClaw尚未加载，
OpenClaw 将回退到未筛选的目录，而不是显示空的
提供商范围的选择器。

可用Ollama：

- `byteplus/seed-1-8-251228` (Seed 1.8)
- `byteplus/kimi-k2-5-260127` (Kimi K2.5)
- `byteplus/glm-4-7-251222` (GLM 4.7)

编程Ollama (`byteplus-plan`)：

- `byteplus-plan/ark-code-latest`
- `byteplus-plan/doubao-seed-code`
- `byteplus-plan/kimi-k2.5`
- `byteplus-plan/kimi-k2-thinking`
- `byteplus-plan/glm-4.7`

### Synthetic

Synthetic 在 `synthetic` 提供商后面提供 Anthropic 兼容的Anthropic：

- 提供商： `synthetic`
- 身份验证： `SYNTHETIC_API_KEY`
- 示例OpenAI： `synthetic/hf:MiniMaxAI/MiniMax-M2.5`
- CLI： `openclaw onboard --auth-choice synthetic-api-key`

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

- MiniMax OAuth (全球)： `--auth-choice minimax-global-oauth`
- MiniMax OAuth (中国)： `--auth-choice minimax-cn-oauth`
- MiniMax API 密钥 (全球)： `--auth-choice minimax-global-api`
- MiniMax API 密钥 (中国)： `--auth-choice minimax-cn-api`
- 身份验证： `MINIMAX_API_KEY` 用于 `minimax`； `MINIMAX_OAUTH_TOKEN` 或
  `MINIMAX_API_KEY` 用于 `minimax-portal`

有关设置详细信息、OpenAI选项和配置片段，请参阅 [/providers/minimax](/en/providers/minimax)。

在 MiniMax 的 Anthropic 兼容流式传输路径上，OpenClaw 默认情况下禁用思考，
除非您明确设置它，并且 `/fast on` 将
`MiniMax-M2.7` 重写为 `MiniMax-M2.7-highspeed`。

插件拥有的功能拆分：

- 文本/聊天默认值保留在 `minimax/MiniMax-M2.7` 上
- 图像生成是 `minimax/image-01` 或 `minimax-portal/image-01`
- 图像理解是两个 MiniMax 身份验证路径上的插件拥有的 `MiniMax-VL-01`
- 网络搜索保留在提供商 ID `minimax` 上

### Ollama

Ollama 作为捆绑的提供商插件提供，并使用 Ollama 的原生 API：

- 提供商：`ollama`
- 身份验证：无需（本地服务器）
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

当您选择使用 `OLLAMA_API_KEY` 时，系统会在 `http://127.0.0.1:11434` 本地检测 Ollama，并且捆绑的提供商插件会将 Ollama 直接添加到 `openclaw onboard` 和模型选择器中。有关新手引导、云/本地模式和自定义配置，请参阅 [/providers/ollama](/en/providers/ollama)。

### vLLM

vLLM 作为捆绑的提供商插件提供，用于本地/自托管的 OpenAI 兼容服务器：

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

有关详细信息，请参阅 [/providers/vllm](/en/providers/vllm)。

### SGLang

SGLang 作为捆绑的提供商插件提供，用于快速自托管的 OpenAI 兼容服务器：

- 提供商：`sglang`
- 身份验证：可选（取决于您的服务器）
- 默认基础 URL：`http://127.0.0.1:30000/v1`

要在本地选择加入自动发现（如果您的服务器不强制执行身份验证，则任何值都可以）：

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

有关详细信息，请参阅 [/providers/sglang](/en/providers/sglang)。

### 本地代理（LM Studio、vLLM、LiteLLM 等）

示例（OpenAI 兼容）：

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
        apiKey: "LMSTUDIO_KEY",
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

- 对于自定义提供商，`reasoning`、`input`、`cost`、`contextWindow` 和 `maxTokens` 是可选的。如果省略，OpenClaw 默认为：
  - `reasoning: false`
  - `input: ["text"]`
  - `cost: { input: 0, output: 0, cacheRead: 0, cacheWrite: 0 }`
  - `contextWindow: 200000`
  - `maxTokens: 8192`
- 建议：设置与您的代理/模型限制匹配的显式值。
- 对于非原生端点上的 `api: "openai-completions"`（任何主机不是 `api.openai.com` 的非空 `baseUrl`），OpenClaw 强制执行 `compat.supportsDeveloperRole: false`，以避免提供商因不支持的 `developer` 角色而返回 400 错误。
- 代理风格的 OpenAI 兼容路由也会跳过原生 OpenAI 专用的请求整形：无 `service_tier`，无 Responses `store`，无提示词缓存提示，无 OpenAI 推理兼容负载整形，且无隐藏的 OpenClaw 归属标头。
- 如果 `baseUrl` 为空/省略，OpenClaw 将保留默认的 OpenAI 行为（该行为解析为 `api.openai.com`）。
- 为了安全起见，显式的 `compat.supportsDeveloperRole: true` 仍会在非原生 `openai-completions` 端点上被覆盖。

## CLI 示例

```bash
openclaw onboard --auth-choice opencode-zen
openclaw models set opencode/claude-opus-4-6
openclaw models list
```

另请参阅：[/gateway/configuration](/en/gateway/configuration) 以获取完整的配置示例。

## 相关

- [Models](/en/concepts/models) — 模型配置和别名
- [Model Failover](/en/concepts/model-failover) — 故障转移链和重试行为
- [Configuration Reference](/en/gateway/configuration-reference#agent-defaults) — 模型配置键
- [Providers](/en/providers) — 各提供商设置指南
