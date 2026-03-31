---
summary: "模型提供商概述，包含示例配置 + CLI 流程"
read_when:
  - You need a provider-by-provider model setup reference
  - You want example configs or CLI onboarding commands for model providers
title: "模型提供商"
---

# 模型提供商

本页面涵盖 **LLM/模型提供商**（而非 WhatsApp/Telegram 等聊天渠道）。
有关模型选择规则，请参阅 [/concepts/models](/en/concepts/models)。

## 快速规则

- 模型引用使用 `provider/model`（例如：`opencode/claude-opus-4-6`）。
- 如果您设置了 `agents.defaults.models`，它将成为允许列表。
- CLI 辅助工具：`openclaw onboard`、`openclaw models list`、`openclaw models set <provider/model>`。
- 提供商插件可以通过 `registerProvider({ catalog })` 注入模型目录；
  OpenClaw 在写入 `models.json` 之前将该输出合并到 `models.providers` 中。
- 提供商清单可以声明 `providerAuthEnvVars`，这样基于环境的通用
  身份验证探针就不需要加载插件运行时。剩余的核心环境变量映射现在仅用于
  非插件/核心提供商以及一些通用优先级的情况，例如 Anthropic API 密钥优先的新手引导。
- 提供商插件还可以通过
  `resolveDynamicModel`、`prepareDynamicModel`、`normalizeResolvedModel`、
  `capabilities`、`prepareExtraParams`、`wrapStreamFn`、`formatApiKey`、
  `refreshOAuth`、`buildAuthDoctorHint`、
  `isCacheTtlEligible`、`buildMissingAuthMessage`、
  `suppressBuiltInModel`、`augmentModelCatalog`、`isBinaryThinking`、
  `supportsXHighThinking`、`resolveDefaultThinkingLevel`、
  `isModernModelRef`、`prepareRuntimeAuth`、`resolveUsageAuth` 和
  `fetchUsageSnapshot` 拥有提供商运行时行为。
- 注意：提供商运行时 `capabilities` 是共享的运行器元数据（提供商
  系列、转录/工具怪癖、传输/缓存提示）。它与 [公共能力模型](/en/plugins/architecture#public-capability-model)
  不同，后者描述插件注册的内容（文本推理、语音等）。

## 插件拥有的提供商行为

提供商插件现在可以拥有大多数特定于提供商的逻辑，而 OpenClaw 保留
通用推理循环。

典型分工：

- `auth[].run` / `auth[].runNonInteractive`: 提供商拥有 `openclaw onboard`、`openclaw models auth` 和无头设置的新手引导/登录流程
- `wizard.setup` / `wizard.modelPicker`: 提供商拥有身份验证选项标签、旧别名、新手引导允许列表提示，以及新手引导/模型选择器中的设置条目
- `catalog`: 提供商出现在 `models.providers` 中
- `resolveDynamicModel`: 提供商接受本地静态目录中尚不存在的模型 ID
- `prepareDynamicModel`: 提供商在重试动态解析之前需要刷新元数据
- `normalizeResolvedModel`: 提供商需要传输层或基础 URL 重写
- `capabilities`: 提供商发布转录/工具/提供商系列的怪癖（quirks）
- `prepareExtraParams`: 提供商设置默认值或规范化每个模型的请求参数
- `wrapStreamFn`: 提供商应用请求标头/正文/模型兼容性封装器
- `formatApiKey`: 提供商将存储的身份验证配置文件格式化为传输层所需的运行时 `apiKey` 字符串
- `refreshOAuth`: 当共享 `pi-ai` 刷新程序不足时，提供商拥有 OAuth 刷新功能
- `buildAuthDoctorHint`: 当 OAuth 刷新失败时，提供商附加修复指南
- `isCacheTtlEligible`: 提供商决定哪些上游模型 ID 支持 prompt-cache TTL
- `buildMissingAuthMessage`: 提供商用特定于提供商的恢复提示替换通用的身份验证存储错误
- `suppressBuiltInModel`: 提供商隐藏过时的上游行，并且可以为直接解析失败返回供应商拥有的错误
- `augmentModelCatalog`: 提供商在发现和配置合并之后附加合成/最终目录行
- `isBinaryThinking`: 提供商拥有二元开启/关闭思考的 UX
- `supportsXHighThinking`: 提供商将选定的模型选择加入 `xhigh`
- `resolveDefaultThinkingLevel`: 提供商拥有模型系列的默认 `/think` 策略
- `isModernModelRef`：提供商拥有 live/smoke 首选模型匹配
- `prepareRuntimeAuth`：提供商将配置的凭证转换为短期运行时令牌
- `resolveUsageAuth`：提供商为 `/usage` 解析使用/配额凭证以及相关状态/报告界面
- `fetchUsageSnapshot`：提供商拥有使用端点的获取/解析，而核心仍拥有摘要框架和格式化

当前捆绑的示例：

- `anthropic`：Claude 4.6 前向兼容回退、身份验证修复提示、使用端点获取以及缓存 TTL/提供商系列元数据
- `openrouter`：透传模型 ID、请求包装器、提供商能力提示和缓存 TTL 策略
- `github-copilot`：新手引导/设备登录、前向兼容模型回退、Claude 思维记录提示、运行时令牌交换以及使用端点获取
- `openai`：GPT-5.4 前向兼容回退、直接 OpenAI 传输标准化、Codex 感知缺失身份验证提示、Spark 抑制、合成 OpenAI/Codex 目录行、思维/live 模型策略以及提供商系列元数据
- `google` 和 `google-gemini-cli`：Gemini 3.1 前向兼容回退和现代模型匹配；Gemini CLI OAuth 还拥有使用界面的身份验证配置文件令牌格式化、使用令牌解析和配额端点获取
- `moonshot`：共享传输、插件拥有的思维负载标准化
- `kilocode`：共享传输、插件拥有的请求标头、推理负载标准化、Gemini 记录提示和缓存 TTL 策略
- `zai`：GLM-5 前向兼容回退、`tool_stream` 默认值、缓存 TTL 策略、二元思维/live 模型策略以及使用身份验证 + 配额获取
- `mistral`、`opencode` 和 `opencode-go`：插件拥有的能力元数据
- `byteplus`、`cloudflare-ai-gateway`、`huggingface`、`kimi-coding`、
  `modelstudio`、`nvidia`、`qianfan`、`synthetic`、`together`、`venice`、
  `vercel-ai-gateway` 和 `volcengine`：仅限插件拥有的目录
- `minimax` 和 `xiaomi`：插件拥有的目录以及使用授权/快照逻辑

捆绑的 `openai` 插件现在拥有两个提供商 ID：`openai` 和
`openai-codex`。

这涵盖了仍然符合 OpenClaw 普通传输的提供商。如果提供商需要完全自定义的请求执行器，则属于一个单独的、更深层次的扩展表面。

## API 密钥轮换

- 支持所选提供商的通用提供商轮换。
- 通过以下方式配置多个密钥：
  - `OPENCLAW_LIVE_<PROVIDER>_KEY`（单个实时覆盖，优先级最高）
  - `<PROVIDER>_API_KEYS`（逗号或分号列表）
  - `<PROVIDER>_API_KEY`（主密钥）
  - `<PROVIDER>_API_KEY_*`（编号列表，例如 `<PROVIDER>_API_KEY_1`）
- 对于 Google 提供商，`GOOGLE_API_KEY` 也作为后备包含在内。
- 密钥选择顺序保留优先级并对值进行去重。
- 仅在速率限制响应上使用下一个密钥重试请求（例如 `429`、`rate_limit`、`quota`、`resource exhausted`）。
- 非速率限制故障立即失败；不尝试密钥轮换。
- 当所有候选密钥都失败时，返回最后一次尝试的最终错误。

## 内置提供商（pi-ai 目录）

OpenClaw 随附 pi‑ai 目录。这些提供商**不**需要
`models.providers` 配置；只需设置授权 + 选择一个模型。

### OpenAI

- 提供商：`openai`
- 授权：`OPENAI_API_KEY`
- 可选轮换：`OPENAI_API_KEYS`、`OPENAI_API_KEY_1`、`OPENAI_API_KEY_2`，加上 `OPENCLAW_LIVE_OPENAI_KEY`（单项覆盖）
- 示例模型：`openai/gpt-5.4`、`openai/gpt-5.4-pro`
- CLI：`openclaw onboard --auth-choice openai-api-key`
- 默认传输为 `auto`（WebSocket 优先，SSE 回退）
- 通过 `agents.defaults.models["openai/<model>"].params.transport` 按模型覆盖（`"sse"`、`"websocket"` 或 `"auto"`）
- OpenAI Responses WebSocket 预热默认通过 `params.openaiWsWarmup` 启用（`true`/`false`）
- OpenAI 优先处理可以通过 `agents.defaults.models["openai/<model>"].params.serviceTier` 启用
- OpenAI 快速模式可以通过 `agents.defaults.models["<provider>/<model>"].params.fastMode` 按模型启用
- `openai/gpt-5.3-codex-spark` 在 OpenClaw 中被有意抑制，因为实时的 OpenAI API 会拒绝它；Spark 被视为仅限 Codex

```json5
{
  agents: { defaults: { model: { primary: "openai/gpt-5.4" } } },
}
```

### Anthropic

- 提供商：`anthropic`
- 认证：`ANTHROPIC_API_KEY` 或 `claude setup-token`
- 可选轮换：`ANTHROPIC_API_KEYS`、`ANTHROPIC_API_KEY_1`、`ANTHROPIC_API_KEY_2`，加上 `OPENCLAW_LIVE_ANTHROPIC_KEY`（单项覆盖）
- 示例模型：`anthropic/claude-opus-4-6`
- CLI：`openclaw onboard --auth-choice token`（粘贴 setup-token）或 `openclaw models auth paste-token --provider anthropic`
- 直接 API 密钥模型支持共享的 `/fast` 开关和 `params.fastMode`；OpenClaw 将其映射到 Anthropic `service_tier`（`auto` vs `standard_only`）
- 政策说明：setup-token 支持属于技术兼容性；过去 Anthropic 曾阻止 Claude Code 之外的某些订阅使用。请确认当前的 Anthropic 条款并根据您的风险承受能力做出决定。
- 建议：Anthropic API 密钥认证是比订阅 setup-token 认证更安全、更推荐的路径。

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
- 默认传输方式为 `auto`（优先使用 WebSocket，回退至 SSE）
- 通过 `agents.defaults.models["openai-codex/<model>"].params.transport` 按模型覆盖（`"sse"`、`"websocket"` 或 `"auto"`）
- 与直接 `openai/*` 共享相同的 `/fast` 开关和 `params.fastMode` 配置
- 当 Codex OAuth 目录公开 `openai-codex/gpt-5.3-codex-spark` 时，它仍然可用；取决于授权
- 策略说明：明确支持在外部工具/工作流（如 OpenAI）中使用 OAuth Codex OpenClaw。

```json5
{
  agents: { defaults: { model: { primary: "openai-codex/gpt-5.4" } } },
}
```

### OpenCode

- 认证：`OPENCODE_API_KEY`（或 `OPENCODE_ZEN_API_KEY`）
- Zen 运行时提供商：`opencode`
- Go 运行时提供商：`opencode-go`
- 模型示例：`opencode/claude-opus-4-6`、`opencode-go/kimi-k2.5`
- CLI：`openclaw onboard --auth-choice opencode-zen` 或 `openclaw onboard --auth-choice opencode-go`

```json5
{
  agents: { defaults: { model: { primary: "opencode/claude-opus-4-6" } } },
}
```

### Google Gemini (API 密钥)

- 提供商：`google`
- 认证：`GEMINI_API_KEY`
- 可选轮换：`GEMINI_API_KEYS`、`GEMINI_API_KEY_1`、`GEMINI_API_KEY_2`、`GOOGLE_API_KEY` 回退以及 `OPENCLAW_LIVE_GEMINI_KEY`（单次覆盖）
- 模型示例：`google/gemini-3.1-pro-preview`、`google/gemini-3-flash-preview`
- 兼容性：使用 `google/gemini-3.1-flash-preview` 的旧版 OpenClaw 配置会被标准化为 `google/gemini-3-flash-preview`
- CLI：`openclaw onboard --auth-choice gemini-api-key`

### Google Vertex 和 Gemini CLI

- 提供商：`google-vertex`、`google-gemini-cli`
- 认证：Vertex 使用 gcloud ADC；Gemini CLI 使用其 CLI 流程
- 注意：CLI 中的 Gemini CLI OAuth 是非官方集成。一些用户报告在使用第三方客户端后 Google 账户受到限制。如果您选择继续，请查阅 Google 条款并使用非关键账户。
- Gemini CLI CLI 作为捆绑的 `google` 插件的一部分提供。
  - 启用：`openclaw plugins enable google`
  - 登录：`openclaw models auth login --provider google-gemini-cli --set-default`
  - 注意：您**不**要将客户端 ID 或密钥粘贴到 `openclaw.json` 中。CLI 登录流程将令牌存储在 Gateway 主机的身份验证配置文件中。

### Z.AI (GLM)

- 提供商: `zai`
- 认证: `ZAI_API_KEY`
- 示例模型: `zai/glm-5`
- CLI: `openclaw onboard --auth-choice zai-api-key`
  - 别名: `z.ai/*` 和 `z-ai/*` 会标准化为 `zai/*`

### Vercel AI Gateway(网关)

- 提供商: `vercel-ai-gateway`
- 认证: `AI_GATEWAY_API_KEY`
- 示例模型: `vercel-ai-gateway/anthropic/claude-opus-4.6`
- CLI: `openclaw onboard --auth-choice ai-gateway-api-key`

### Kilo Gateway(网关)

- 提供商: `kilocode`
- 认证: `KILOCODE_API_KEY`
- 示例模型: `kilocode/anthropic/claude-opus-4.6`
- CLI: `openclaw onboard --kilocode-api-key <key>`
- Base URL: `https://api.kilo.ai/api/gateway/`
- 扩展的内置目录包括 GLM-5 Free、MiniMax M2.5 Free、GPT-5.2、Gemini 3 Pro Preview、Gemini 3 Flash Preview、Grok Code Fast 1 和 Kimi K2.5。

有关设置详情，请参阅 [/providers/kilocode](/en/providers/kilocode)。

### 其他捆绑的提供商插件

- OpenRouter: `openrouter` (`OPENROUTER_API_KEY`)
- 示例模型: `openrouter/anthropic/claude-sonnet-4-6`
- Kilo Gateway(网关): `kilocode` (`KILOCODE_API_KEY`)
- 示例模型: `kilocode/anthropic/claude-opus-4.6`
- MiniMax: `minimax` (`MINIMAX_API_KEY`)
- Moonshot: `moonshot` (`MOONSHOT_API_KEY`)
- Kimi Coding: `kimi-coding` (`KIMI_API_KEY` 或 `KIMICODE_API_KEY`)
- Qianfan: `qianfan` (`QIANFAN_API_KEY`)
- Model Studio: `modelstudio` (`MODELSTUDIO_API_KEY`)
- NVIDIA: `nvidia` (`NVIDIA_API_KEY`)
- Together: `together` (`TOGETHER_API_KEY`)
- Venice: `venice` (`VENICE_API_KEY`)
- Xiaomi: `xiaomi` (`XIAOMI_API_KEY`)
- Vercel AI Gateway(网关): `vercel-ai-gateway` (`AI_GATEWAY_API_KEY`)
- Hugging Face Inference: `huggingface` (`HUGGINGFACE_HUB_TOKEN` 或 `HF_TOKEN`)
- Cloudflare AI Gateway(网关): `cloudflare-ai-gateway` (`CLOUDFLARE_AI_GATEWAY_API_KEY`)
- Volcengine: `volcengine` (`VOLCANO_ENGINE_API_KEY`)
- BytePlus: `byteplus` (`BYTEPLUS_API_KEY`)
- xAI: `xai` (`XAI_API_KEY`)
- Mistral: `mistral` (`MISTRAL_API_KEY`)
- 示例模型：`mistral/mistral-large-latest`
- CLI: `openclaw onboard --auth-choice mistral-api-key`
- Groq: `groq` (`GROQ_API_KEY`)
- Cerebras: `cerebras` (`CEREBRAS_API_KEY`)
  - Cerebras 上的 GLM 模型使用 ID `zai-glm-4.7` 和 `zai-glm-4.6`。
  - OpenAI 兼容的基础 URL：`https://api.cerebras.ai/v1`。
- GitHub Copilot: `github-copilot` (`COPILOT_GITHUB_TOKEN` / `GH_TOKEN` / `GITHUB_TOKEN`)
- Hugging Face Inference 示例模型：`huggingface/deepseek-ai/DeepSeek-R1`；CLI：`openclaw onboard --auth-choice huggingface-api-key`。参见 [Hugging Face (Inference)](/en/providers/huggingface)。

## 通过 `models.providers` 的提供商（自定义/基础 URL）

使用 `models.providers`（或 `models.json`）来添加**自定义**提供商或 OpenAI/Anthropic 兼容的代理。

下面许多捆绑的提供商插件已经发布了默认目录。仅当您想要覆盖默认基础 URL、标头或模型列表时，才使用显式的 `models.providers.<id>` 条目。

### Moonshot AI (Kimi)

Moonshot 使用 OpenAI 兼容的端点，因此请将其配置为自定义提供商：

- 提供商：`moonshot`
- 身份验证：`MOONSHOT_API_KEY`
- 示例模型：`moonshot/kimi-k2.5`

Kimi K2 模型 ID：

[//]: # "moonshot-kimi-k2-model-refs:start"

- `moonshot/kimi-k2.5`
- `moonshot/kimi-k2-0905-preview`
- `moonshot/kimi-k2-turbo-preview`
- `moonshot/kimi-k2-thinking`
- `moonshot/kimi-k2-thinking-turbo`

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

### Kimi 编程

Kimi 编程使用 Moonshot AI 的 Anthropic 兼容端点：

- 提供商：`kimi-coding`
- 认证：`KIMI_API_KEY`
- 示例模型：`kimi-coding/k2p5`

```json5
{
  env: { KIMI_API_KEY: "sk-..." },
  agents: {
    defaults: { model: { primary: "kimi-coding/k2p5" } },
  },
}
```

### 火山引擎 (Doubao)

火山引擎提供对中国境内的 Doubao 及其他模型的访问权限。

- 提供商：`volcengine`（编程：`volcengine-plan`）
- 认证：`VOLCANO_ENGINE_API_KEY`
- 示例模型：`volcengine/doubao-seed-1-8-251228`
- CLI：`openclaw onboard --auth-choice volcengine-api-key`

```json5
{
  agents: {
    defaults: { model: { primary: "volcengine/doubao-seed-1-8-251228" } },
  },
}
```

可用模型：

- `volcengine/doubao-seed-1-8-251228` (Doubao Seed 1.8)
- `volcengine/doubao-seed-code-preview-251028`
- `volcengine/kimi-k2-5-260127` (Kimi K2.5)
- `volcengine/glm-4-7-251222` (GLM 4.7)
- `volcengine/deepseek-v3-2-251201` (DeepSeek V3.2 128K)

编程模型 (`volcengine-plan`)：

- `volcengine-plan/ark-code-latest`
- `volcengine-plan/doubao-seed-code`
- `volcengine-plan/kimi-k2.5`
- `volcengine-plan/kimi-k2-thinking`
- `volcengine-plan/glm-4.7`

### BytePlus (国际版)

BytePlus ARK 为国际用户提供与火山引擎相同的模型访问权限。

- 提供商：`byteplus`（编程：`byteplus-plan`）
- 认证：`BYTEPLUS_API_KEY`
- 示例模型：`byteplus/seed-1-8-251228`
- CLI：`openclaw onboard --auth-choice byteplus-api-key`

```json5
{
  agents: {
    defaults: { model: { primary: "byteplus/seed-1-8-251228" } },
  },
}
```

可用模型：

- `byteplus/seed-1-8-251228` (Seed 1.8)
- `byteplus/kimi-k2-5-260127` (Kimi K2.5)
- `byteplus/glm-4-7-251222` (GLM 4.7)

编程模型 (`byteplus-plan`)：

- `byteplus-plan/ark-code-latest`
- `byteplus-plan/doubao-seed-code`
- `byteplus-plan/kimi-k2.5`
- `byteplus-plan/kimi-k2-thinking`
- `byteplus-plan/glm-4.7`

### 合成

合成在 `synthetic` 提供商后面提供 Anthropic 兼容模型：

- 提供商：`synthetic`
- 认证：`SYNTHETIC_API_KEY`
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

- MiniMax (Anthropic‑兼容): `--auth-choice minimax-api`
- 身份验证: `MINIMAX_API_KEY`

有关设置详细信息、模型选项和配置片段，请参阅 [/providers/minimax](/en/providers/minimax)。

### Ollama

Ollama 作为捆绑的提供商插件提供，并使用 Ollama 的原生 API：

- 提供商: `ollama`
- 身份验证: 不需要（本地服务器）
- 示例模型: `ollama/llama3.3`
- 安装: [https://ollama.com/download](https://ollama.com/download)

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

当您通过 `OLLAMA_API_KEY` 选择加入时，会在 `http://127.0.0.1:11434` 本地检测到 Ollama，并且捆绑的提供商插件会将 Ollama 直接添加到 `openclaw onboard` 和模型选择器中。请参阅 [/providers/ollama](/en/providers/ollama) 了解新手引导、云端/本地模式和自定义配置。

### vLLM

vLLM 作为捆绑的提供商插件提供，用于本地/自托管的 OpenAI‑兼容服务器：

- 提供商: `vllm`
- 身份验证: 可选（取决于您的服务器）
- 默认基础 URL: `http://127.0.0.1:8000/v1`

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

SGLang 作为捆绑的提供商插件提供，用于快速自托管的 OpenAI‑兼容服务器：

- 提供商: `sglang`
- 身份验证: 可选（取决于您的服务器）
- 默认基础 URL: `http://127.0.0.1:30000/v1`

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

### 本地代理 (LM Studio, vLLM, LiteLLM 等)

示例 (OpenAI‑兼容):

```json5
{
  agents: {
    defaults: {
      model: { primary: "lmstudio/minimax-m2.5-gs32" },
      models: { "lmstudio/minimax-m2.5-gs32": { alias: "Minimax" } },
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
            id: "minimax-m2.5-gs32",
            name: "MiniMax M2.5",
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

备注:

- 对于自定义提供商，`reasoning`、`input`、`cost`、`contextWindow` 和 `maxTokens` 是可选的。
  如果省略，OpenClaw 默认为：
  - `reasoning: false`
  - `input: ["text"]`
  - `cost: { input: 0, output: 0, cacheRead: 0, cacheWrite: 0 }`
  - `contextWindow: 200000`
  - `maxTokens: 8192`
- 建议：设置与您的代理/模型限制相匹配的显式值。
- 对于非原生端点上的 `api: "openai-completions"`（任何主机不是 `api.openai.com` 的非空 `baseUrl`），OpenClaw 强制执行 `compat.supportsDeveloperRole: false`，以避免因不支持的 `developer` 角色而导致提供商返回 400 错误。
- 如果 `baseUrl` 为空或被省略，OpenClaw 将保留默认的 OpenAI 行为（该行为解析为 `api.openai.com`）。
- 为了安全起见，显式的 `compat.supportsDeveloperRole: true` 在非原生 `openai-completions` 端点上仍会被覆盖。

## CLI 示例

```bash
openclaw onboard --auth-choice opencode-zen
openclaw models set opencode/claude-opus-4-6
openclaw models list
```

另请参阅：[/gateway/configuration](/en/gateway/configuration) 以获取完整的配置示例。
