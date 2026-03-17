---
summary: "模型提供商概述，包含示例配置和 CLI 流程"
read_when:
  - You need a provider-by-provider model setup reference
  - You want example configs or CLI onboarding commands for model providers
title: "模型提供商"
---

# 模型提供商

本页面涵盖 **LLM/模型提供商**（不包括 WhatsApp/Telegram 等聊天频道）。
有关模型选择规则，请参阅 [/concepts/models](/zh/concepts/models)。

## 快速规则

- 模型引用使用 `provider/model`（例如：`opencode/claude-opus-4-6`）。
- 如果您设置 `agents.defaults.models`，它将成为允许列表。
- CLI 辅助工具：`openclaw onboard`、`openclaw models list`、`openclaw models set <provider/model>`。
- 提供商插件可以通过 `registerProvider({ catalog })` 注入模型目录；
  OpenClaw 在写入 `models.json` 之前将该输出合并到 `models.providers` 中。
- 提供商清单可以声明 `providerAuthEnvVars`，因此基于通用环境的身份验证探针不需要加载插件运行时。剩余的核心环境变量映射现在仅用于非插件/核心提供商以及少数通用优先级的情况，例如 Anthropic API 密钥优先的新手引导。
- 提供商插件还可以通过
  `resolveDynamicModel`、`prepareDynamicModel`、`normalizeResolvedModel`、
  `capabilities`、`prepareExtraParams`、`wrapStreamFn`、`formatApiKey`、
  `refreshOAuth`、`buildAuthDoctorHint`、
  `isCacheTtlEligible`、`buildMissingAuthMessage`、
  `suppressBuiltInModel`、`augmentModelCatalog`、`isBinaryThinking`、
  `supportsXHighThinking`、`resolveDefaultThinkingLevel`、
  `isModernModelRef`、`prepareRuntimeAuth`、`resolveUsageAuth` 和
  `fetchUsageSnapshot` 拥有提供商运行时行为。

## 插件拥有的提供商行为

提供商插件现在可以拥有大多数特定于提供商的逻辑，而 OpenClaw 保持通用推理循环。

典型分工：

- `auth[].run` / `auth[].runNonInteractive`：提供商拥有 `openclaw onboard`、`openclaw models auth` 和无头设置的新手引导/登录流程
- `wizard.setup` / `wizard.modelPicker`：提供商拥有身份验证选择标签、传统别名、新手引导允许列表提示以及新手引导/模型选择器中的设置条目
- `catalog`：提供商出现在 `models.providers` 中
- `resolveDynamicModel`：提供商接受本地静态目录中尚不存在的模型 ID
- `prepareDynamicModel`: 提供商需要在重试之前刷新元数据
  动态解析
- `normalizeResolvedModel`: 提供商需要传输或基本 URL 重写
- `capabilities`: 提供商发布脚本/工具/提供商系列的特性
- `prepareExtraParams`: 提供商设置默认值或规范化按模型请求参数
- `wrapStreamFn`: 提供商应用请求头/请求体/模型兼容性封装器
- `formatApiKey`: 提供商将存储的身份验证配置文件格式化为运行时期望的
  `apiKey` 字符串
- `refreshOAuth`: 当共享的 `pi-ai`
  刷新器不足时，提供商拥有 OAuth 刷新权限
- `buildAuthDoctorHint`: 当 OAuth 刷新失败时，
  提供商会附加修复指南
- `isCacheTtlEligible`: 提供商决定哪些上游模型 ID 支持 prompt-cache TTL
- `buildMissingAuthMessage`: 提供商将通用的身份验证存储错误
  替换为特定于提供商的恢复提示
- `suppressBuiltInModel`: 提供商隐藏过时的上游行，并且可以针对直接解析失败返回
  供应商拥有的错误
- `augmentModelCatalog`: 提供商在发现和配置合并之后附加合成/最终目录行
- `isBinaryThinking`: 提供商拥有二进制开/关思考 UX
- `supportsXHighThinking`: 提供商选择加入 `xhigh` 的选定模型
- `resolveDefaultThinkingLevel`: 提供商拥有模型系列的默认
  `/think` 策略
- `isModernModelRef`: 提供商拥有实时/冒烟首选项模型匹配
- `prepareRuntimeAuth`: 提供商将配置的凭据转换为短期
  运行时令牌
- `resolveUsageAuth`: 提供商解析 `/usage`
  的使用/配额凭据以及相关状态/报告表面
- `fetchUsageSnapshot`: 提供商拥有使用端点获取/解析，
  而核心仍然拥有摘要外壳和格式化

当前捆绑的示例：

- `anthropic`：Claude 4.6 向前兼容回退、身份验证修复提示、使用情况端点获取以及缓存 TTL/提供商系列元数据
- `openrouter`：透传模型 ID、请求包装器、提供商能力提示以及缓存 TTL 策略
- `github-copilot`：新手引导/设备登录、向前兼容模型回退、Claude 思维记录提示、运行时令牌交换以及使用情况端点获取
- `openai`：GPT-5.4 向前兼容回退、直接 OpenAI 传输规范化、感知 Codex 的缺失身份验证提示、Spark 抑制、合成 OpenAI/Codex 目录行、思维/实时模型策略以及提供商系列元数据
- `google` 和 `google-gemini-cli`：Gemini 3.1 向前兼容回退和现代模型匹配；Gemini CLI OAuth 还负责身份配置文件令牌格式化、使用情况令牌解析以及针对使用情况展示层的配额端点获取
- `moonshot`：共享传输、插件拥有的思维负载规范化
- `kilocode`：共享传输、插件拥有的请求标头、推理负载规范化、Gemini 记录提示以及缓存 TTL 策略
- `zai`：GLM-5 向前兼容回退、`tool_stream` 默认值、缓存 TTL 策略、二元思维/实时模型策略以及使用情况身份验证 + 配额获取
- `mistral`、`opencode` 和 `opencode-go`：插件拥有的能力元数据
- `byteplus`、`cloudflare-ai-gateway`、`huggingface`、`kimi-coding`、
  `modelstudio`、`nvidia`、`qianfan`、`synthetic`、`together`、`venice`、
  `vercel-ai-gateway` 和 `volcengine`：仅限插件拥有的目录
- `qwen-portal`：插件拥有的目录、OAuth 登录以及 OAuth 刷新
- `minimax` 和 `xiaomi`：插件拥有的目录以及使用认证/快照逻辑

捆绑的 `openai` 插件现在拥有这两个提供商 ID：`openai` 和
`openai-codex`。

这涵盖了仍然适合 OpenClaw 普通传输的提供商。如果提供商需要完全自定义的请求执行器，则属于一个单独的、更深层的扩展表面。

## API 密钥轮换

- 支持选定提供商的通用提供商轮换。
- 通过以下方式配置多个密钥：
  - `OPENCLAW_LIVE_<PROVIDER>_KEY`（单个实时覆盖，优先级最高）
  - `<PROVIDER>_API_KEYS`（逗号或分号列表）
  - `<PROVIDER>_API_KEY`（主密钥）
  - `<PROVIDER>_API_KEY_*`（编号列表，例如 `<PROVIDER>_API_KEY_1`）
- 对于 Google 提供商，`GOOGLE_API_KEY` 也作为后备包含在内。
- 密钥选择顺序保持优先级并对值进行去重。
- 仅在速率限制响应时使用下一个密钥重试请求（例如 `429`、`rate_limit`、`quota`、`resource exhausted`）。
- 非速率限制失败会立即失败；不会尝试密钥轮换。
- 当所有候选密钥均失败时，返回最后一次尝试的最终错误。

## 内置提供商（pi-ai 目录）

OpenClaw 随附 pi-ai 目录。这些提供商**不**需要
`models.providers` 配置；只需设置认证 + 选择一个模型。

### OpenAI

- 提供商：`openai`
- 认证：`OPENAI_API_KEY`
- 可选轮换：`OPENAI_API_KEYS`、`OPENAI_API_KEY_1`、`OPENAI_API_KEY_2`，外加 `OPENCLAW_LIVE_OPENAI_KEY`（单个覆盖）
- 示例模型：`openai/gpt-5.4`、`openai/gpt-5.4-pro`
- CLI：`openclaw onboard --auth-choice openai-api-key`
- 默认传输为 `auto`（WebSocket 优先，SSE 后备）
- 通过 `agents.defaults.models["openai/<model>"].params.transport` 按模型覆盖（`"sse"`、`"websocket"` 或 `"auto"`）
- OpenAI Responses WebSocket 预热默认通过 `params.openaiWsWarmup` 启用（`true`/`false`）
- 可以通过 `agents.defaults.models["openai/<model>"].params.serviceTier` 启用 OpenAI 优先处理
- 可以通过 `agents.defaults.models["<provider>/<model>"].params.fastMode` 为每个模型启用 OpenAI 快速模式
- `openai/gpt-5.3-codex-spark` 在 OpenClaw 中被有意抑制，因为实时的 OpenAI API 会拒绝它；Spark 被视为仅限 Codex

```json5
{
  agents: { defaults: { model: { primary: "openai/gpt-5.4" } } },
}
```

### Anthropic

- 提供商：`anthropic`
- 认证：`ANTHROPIC_API_KEY` 或 `claude setup-token`
- 可选轮换：`ANTHROPIC_API_KEYS`、`ANTHROPIC_API_KEY_1`、`ANTHROPIC_API_KEY_2`，加上 `OPENCLAW_LIVE_ANTHROPIC_KEY`（单次覆盖）
- 示例模型：`anthropic/claude-opus-4-6`
- CLI：`openclaw onboard --auth-choice token`（粘贴 setup-token）或 `openclaw models auth paste-token --provider anthropic`
- 直接 API 密钥模型支持共享的 `/fast` 开关和 `params.fastMode`；OpenClaw 将其映射到 Anthropic `service_tier`（`auto` vs `standard_only`）
- 策略说明：对 setup-token 的支持属于技术兼容性；Anthropic 过去曾阻止在 Claude Code 之外的一些订阅使用。请核实当前的 Anthropic 条款，并根据您的风险承受能力做出决定。
- 建议：Anthropic API 密钥认证比订阅 setup-token 认证更安全、更推荐。

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
- 默认传输方式为 `auto`（优先使用 WebSocket，SSE 作为后备）
- 通过 `agents.defaults.models["openai-codex/<model>"].params.transport`（`"sse"`、`"websocket"` 或 `"auto"`）为每个模型进行覆盖
- 与直接 `openai/*` 共享相同的 `/fast` 开关和 `params.fastMode` 配置
- 当 Codex OAuth 目录公开 `openai-codex/gpt-5.3-codex-spark` 时，该 `openai-codex/gpt-5.3-codex-spark` 保持可用；是否可用取决于授权
- 策略说明：明确支持将 OpenAI Codex OAuth 用于像 OpenAI 这样的外部工具/工作流。

```json5
{
  agents: { defaults: { model: { primary: "openai-codex/gpt-5.4" } } },
}
```

### OpenCode

- 身份验证：`OPENCODE_API_KEY`（或 `OPENCODE_ZEN_API_KEY`）
- Zen 运行时提供商：`opencode`
- Go 运行时提供商：`opencode-go`
- 示例模型：`opencode/claude-opus-4-6`、`opencode-go/kimi-k2.5`
- CLI：`openclaw onboard --auth-choice opencode-zen` 或 `openclaw onboard --auth-choice opencode-go`

```json5
{
  agents: { defaults: { model: { primary: "opencode/claude-opus-4-6" } } },
}
```

### Google Gemini（API 密钥）

- 提供商：`google`
- 身份验证：`GEMINI_API_KEY`
- 可选轮换：`GEMINI_API_KEYS`、`GEMINI_API_KEY_1`、`GEMINI_API_KEY_2`、`GOOGLE_API_KEY` 回退以及 `OPENCLAW_LIVE_GEMINI_KEY`（单次覆盖）
- 示例模型：`google/gemini-3.1-pro-preview`、`google/gemini-3-flash-preview`
- 兼容性：使用 `google/gemini-3.1-flash-preview` 的旧版 OpenClaw 配置会被标准化为 `google/gemini-3-flash-preview`
- CLI：`openclaw onboard --auth-choice gemini-api-key`

### Google Vertex 和 Gemini CLI

- 提供商：`google-vertex`、`google-gemini-cli`
- 身份验证：Vertex 使用 gcloud ADC；Gemini CLI 使用其 OAuth 流程
- 注意：CLI 中的 Gemini OAuth OpenClaw 是非官方集成。一些用户报告在使用第三方客户端后 Google 账户受到限制。请查阅 Google 条款，如果选择继续，请使用非关键账户。
- Gemini CLI OAuth 作为捆绑的 `google` 插件的一部分提供。
  - 启用：`openclaw plugins enable google`
  - 登录：`openclaw models auth login --provider google-gemini-cli --set-default`
  - 注意：您**不**要将客户端 ID 或密钥粘贴到 `openclaw.json` 中。CLI 登录流程会将令牌存储在网关主机的身份验证配置文件中。

### Z.AI（GLM）

- 提供商：`zai`
- 身份验证：`ZAI_API_KEY`
- 示例模型：`zai/glm-5`
- CLI：`openclaw onboard --auth-choice zai-api-key`
  - 别名：`z.ai/*` 和 `z-ai/*` 会标准化为 `zai/*`

### Vercel AI Gateway(网关)

- 提供商：`vercel-ai-gateway`
- 身份验证：`AI_GATEWAY_API_KEY`
- 示例模型：`vercel-ai-gateway/anthropic/claude-opus-4.6`
- CLI：`openclaw onboard --auth-choice ai-gateway-api-key`

### Kilo Gateway(网关)

- 提供商：`kilocode`
- 身份验证：`KILOCODE_API_KEY`
- 示例模型：`kilocode/anthropic/claude-opus-4.6`
- CLI：`openclaw onboard --kilocode-api-key <key>`
- 基础 URL：`https://api.kilo.ai/api/gateway/`
- 扩展的内置目录包括 GLM-5 Free、MiniMax M2.5 Free、GPT-5.2、Gemini 3 Pro Preview、Gemini 3 Flash Preview、Grok Code Fast 1 和 Kimi K2.5。

有关设置详细信息，请参阅 [/providers/kilocode](/zh/providers/kilocode)。

### 其他捆绑的提供商插件

- OpenRouter：`openrouter` (`OPENROUTER_API_KEY`)
- 示例模型：`openrouter/anthropic/claude-sonnet-4-5`
- Kilo Gateway(网关)：`kilocode` (`KILOCODE_API_KEY`)
- 示例模型：`kilocode/anthropic/claude-opus-4.6`
- MiniMax：`minimax` (`MINIMAX_API_KEY`)
- Moonshot：`moonshot` (`MOONSHOT_API_KEY`)
- Kimi Coding：`kimi-coding` (`KIMI_API_KEY` 或 `KIMICODE_API_KEY`)
- Qianfan：`qianfan` (`QIANFAN_API_KEY`)
- Model Studio：`modelstudio` (`MODELSTUDIO_API_KEY`)
- NVIDIA：`nvidia` (`NVIDIA_API_KEY`)
- Together：`together` (`TOGETHER_API_KEY`)
- Venice：`venice` (`VENICE_API_KEY`)
- Xiaomi：`xiaomi` (`XIAOMI_API_KEY`)
- Vercel AI Gateway(网关)：`vercel-ai-gateway` (`AI_GATEWAY_API_KEY`)
- Hugging Face Inference：`huggingface` (`HUGGINGFACE_HUB_TOKEN` 或 `HF_TOKEN`)
- Cloudflare AI Gateway(网关)：`cloudflare-ai-gateway` (`CLOUDFLARE_AI_GATEWAY_API_KEY`)
- Volcengine：`volcengine` (`VOLCANO_ENGINE_API_KEY`)
- BytePlus：`byteplus` (`BYTEPLUS_API_KEY`)
- xAI: `xai` (`XAI_API_KEY`)
- Mistral: `mistral` (`MISTRAL_API_KEY`)
- 示例模型：`mistral/mistral-large-latest`
- CLI：`openclaw onboard --auth-choice mistral-api-key`
- Groq: `groq` (`GROQ_API_KEY`)
- Cerebras: `cerebras` (`CEREBRAS_API_KEY`)
  - Cerebras 上的 GLM 模型使用 ID `zai-glm-4.7` 和 `zai-glm-4.6`。
  - 兼容 OpenAI 的基础 URL：`https://api.cerebras.ai/v1`。
- GitHub Copilot: `github-copilot` (`COPILOT_GITHUB_TOKEN` / `GH_TOKEN` / `GITHUB_TOKEN`)
- Hugging Face 推理示例模型：`huggingface/deepseek-ai/DeepSeek-R1`；CLI：`openclaw onboard --auth-choice huggingface-api-key`。参见 [Hugging Face (推理)](/zh/providers/huggingface)。

## 通过 `models.providers` 的提供商（自定义/基础 URL）

使用 `models.providers`（或 `models.json`）来添加**自定义**提供商或
兼容 OpenAI/Anthropic 的代理。

下面的许多捆绑提供商插件已经发布了默认目录。
仅当您想要覆盖默认基础 URL、标头或模型列表时，才使用显式的 `models.providers.<id>` 条目。

### Moonshot AI (Kimi)

Moonshot 使用兼容 OpenAI 的端点，因此请将其配置为自定义提供商：

- 提供商：`moonshot`
- 认证：`MOONSHOT_API_KEY`
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

### Kimi Coding

Kimi Coding 使用 Moonshot AI 的兼容 Anthropic 的端点：

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

### Qwen OAuth（免费层级）

Qwen 通过设备码流程提供对 OAuth Coder + Vision 的 Qwen 访问权限。
捆绑的提供商插件默认已启用，因此只需登录：

```bash
openclaw models auth login --provider qwen-portal --set-default
```

模型引用：

- `qwen-portal/coder-model`
- `qwen-portal/vision-model`

有关设置详细信息和说明，请参阅 [/providers/qwen](/zh/providers/qwen)。

### 火山引擎 (Doubao)

Volcano Engine (火山引擎) 提供了对 Doubao 和中国其他模型的访问。

- 提供商：`volcengine` (编程：`volcengine-plan`)
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

- 提供商：`byteplus` (编程：`byteplus-plan`)
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

### Synthetic

Synthetic 在 `synthetic` 提供商后面提供与 Anthropic 兼容的模型：

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

MiniMax 通过 `models.providers` 配置，因为它使用自定义端点：

- MiniMax (与 Anthropic 兼容)：`--auth-choice minimax-api`
- 认证：`MINIMAX_API_KEY`

有关设置详细信息、模型选项和配置片段，请参阅 [/providers/minimax](/zh/providers/minimax)。

### Ollama

Ollama 作为捆绑提供商插件提供，并使用 Ollama 的原生 API：

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

当您选择加入 `OLLAMA_API_KEY` 时，会在 `http://127.0.0.1:11434` 本地检测到 Ollama，并且捆绑的提供商插件会将 Ollama 直接添加到 `openclaw onboard` 和模型选择器中。有关新手引导、云端/本地模式和自定义配置，请参阅 [/providers/ollama](/zh/providers/ollama)。

### vLLM

vLLM 作为捆绑的提供商插件提供，适用于本地/自托管的 OpenAI 兼容服务器：

- 提供商：`vllm`
- 身份验证：可选（取决于您的服务器）
- 默认基础 URL：`http://127.0.0.1:8000/v1`

要在本地选择加入自动发现（如果您的服务器不强制执行身份验证，则任何值均可）：

```bash
export VLLM_API_KEY="vllm-local"
```

然后设置模型（替换为 `/v1/models` 返回的 ID 之一）：

```json5
{
  agents: {
    defaults: { model: { primary: "vllm/your-model-id" } },
  },
}
```

有关详细信息，请参阅 [/providers/vllm](/zh/providers/vllm)。

### SGLang

SGLang 作为捆绑的提供商插件提供，适用于快速自托管的 OpenAI 兼容服务器：

- 提供商：`sglang`
- 身份验证：可选（取决于您的服务器）
- 默认基础 URL：`http://127.0.0.1:30000/v1`

要在本地选择加入自动发现（如果您的服务器不强制执行身份验证，则任何值均可）：

```bash
export SGLANG_API_KEY="sglang-local"
```

然后设置模型（替换为 `/v1/models` 返回的 ID 之一）：

```json5
{
  agents: {
    defaults: { model: { primary: "sglang/your-model-id" } },
  },
}
```

有关详细信息，请参阅 [/providers/sglang](/zh/providers/sglang)。

### 本地代理（LM Studio, vLLM, LiteLLM 等）

示例（OpenAI 兼容）：

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

注意：

- 对于自定义提供商，`reasoning`、`input`、`cost`、`contextWindow` 和 `maxTokens` 是可选的。当省略时，OpenClaw 默认为：
  - `reasoning: false`
  - `input: ["text"]`
  - `cost: { input: 0, output: 0, cacheRead: 0, cacheWrite: 0 }`
  - `contextWindow: 200000`
  - `maxTokens: 8192`
- 建议：设置与您的代理/模型限制相匹配的显式值。
- 对于非原生端点上的 `api: "openai-completions"`（任何主机不是 `api.openai.com` 的非空 `baseUrl`），OpenClaw 强制执行 `compat.supportsDeveloperRole: false` 以避免因不支持的 `developer` 角色导致的提供商 400 错误。
- 如果 `baseUrl` 为空或被省略，OpenClaw 将保持默认的 OpenAI 行为（该行为解析为 `api.openai.com`）。
- 为了安全起见，显式的 `compat.supportsDeveloperRole: true` 仍会在非原生的 `openai-completions` 端点上被覆盖。

## CLI 示例

```bash
openclaw onboard --auth-choice opencode-zen
openclaw models set opencode/claude-opus-4-6
openclaw models list
```

另请参阅：[/gateway/configuration](/zh/gateway/configuration) 以获取完整的配置示例。

import zh from "/components/footer/zh.mdx";

<zh />
