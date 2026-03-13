---
summary: "模型提供商概览，包含示例配置和 CLI 流程"
read_when:
  - You need a provider-by-provider model setup reference
  - You want example configs or CLI onboarding commands for model providers
title: "模型提供商"
---

# 模型提供商

本页面涵盖 **LLM/模型提供商**（不包括 WhatsApp/Telegram 等聊天频道）。
关于模型选择规则，请参阅 [/concepts/models](/zh/en/concepts/models)。

## 快速规则

- 模型引用使用 `provider/model` （例如：`opencode/claude-opus-4-6`）。
- 如果您设置了 `agents.defaults.models`，它将变为允许列表。
- CLI 辅助工具：`openclaw onboard`、`openclaw models list`、`openclaw models set <provider/model>`。

## API 密钥轮换

- 支持选定提供商的通用提供商轮换。
- 通过以下方式配置多个密钥：
  - `OPENCLAW_LIVE_<PROVIDER>_KEY` （单个实时覆盖，优先级最高）
  - `<PROVIDER>_API_KEYS` （逗号或分号列表）
  - `<PROVIDER>_API_KEY` （主密钥）
  - `<PROVIDER>_API_KEY_*` （编号列表，例如 `<PROVIDER>_API_KEY_1`）
- 对于 Google 提供商，`GOOGLE_API_KEY` 也作为后备选项包含在内。
- 密钥选择顺序保留优先级并对值进行去重。
- 请求仅在速率限制响应时才使用下一个密钥重试（例如 `429`、`rate_limit`、`quota`、`resource exhausted`）。
- 非速率限制导致的失败会立即报错；不会尝试密钥轮换。
- 当所有候选密钥均失败时，返回最后一次尝试的最终错误。

## 内置提供商（pi-ai 目录）

OpenClaw 内置了 pi‑ai 目录。这些提供商**不**需要
`models.providers` 配置；只需设置身份验证并选择一个模型。

### OpenAI

- 提供商：`openai`
- 身份验证：`OPENAI_API_KEY`
- 可选轮换：`OPENAI_API_KEYS`、`OPENAI_API_KEY_1`、`OPENAI_API_KEY_2`，以及 `OPENCLAW_LIVE_OPENAI_KEY` （单个覆盖）
- 示例模型：`openai/gpt-5.4`，`openai/gpt-5.4-pro`
- CLI：`openclaw onboard --auth-choice openai-api-key`
- 默认传输方式为 `auto`（优先使用 WebSocket，回退至 SSE）
- 通过 `agents.defaults.models["openai/<model>"].params.transport` 按模型覆盖（`"sse"`、`"websocket"` 或 `"auto"`）
- OpenAI Responses WebSocket 预热默认通过 `params.openaiWsWarmup` 启用（`true`/`false`）
- 可以通过 `agents.defaults.models["openai/<model>"].params.serviceTier` 启用 OpenAI 优先处理
- 可以通过 `agents.defaults.models["<provider>/<model>"].params.fastMode` 为每个模型启用 OpenAI 快速模式
- `openai/gpt-5.3-codex-spark` 在 OpenClaw 中被有意屏蔽，因为实时 OpenAI API 会拒绝它；Spark 被视为仅限 Codex

```json5
{
  agents: { defaults: { model: { primary: "openai/gpt-5.4" } } },
}
```

### Anthropic

- 提供商：`anthropic`
- 认证：`ANTHROPIC_API_KEY` 或 `claude setup-token`
- 可选轮换：`ANTHROPIC_API_KEYS`、`ANTHROPIC_API_KEY_1`、`ANTHROPIC_API_KEY_2`，以及 `OPENCLAW_LIVE_ANTHROPIC_KEY`（单个覆盖）
- 示例模型：`anthropic/claude-opus-4-6`
- CLI：`openclaw onboard --auth-choice token`（粘贴 setup-token）或 `openclaw models auth paste-token --provider anthropic`
- 直接 API 密钥模型支持共享的 `/fast` 开关和 `params.fastMode`；OpenClaw 将其映射到 Anthropic `service_tier`（`auto` 对比 `standard_only`）
- 策略说明：对 setup-token 的支持仅代表技术兼容性；Anthropic 过去曾阻止 Claude Code 之外的某些订阅使用。请核实当前的 Anthropic 条款，并根据您的风险承受能力做出决定。
- 建议：相比订阅 setup-token 认证，Anthropic API 密钥认证是更安全、更推荐的路径。

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
- 默认传输方式为 `auto`（优先使用 WebSocket，SSE 作为回退）
- 通过 `agents.defaults.models["openai-codex/<model>"].params.transport` 按模型覆盖（`"sse"`、`"websocket"` 或 `"auto"`）
- 与直接 `openai/*` 共享相同的 `/fast` 开关和 `params.fastMode` 配置
- 当 Codex OAuth 目录公开 `openai-codex/gpt-5.3-codex-spark` 时，其仍然可用；取决于授权
- 策略说明：明确支持将 OpenAI Codex OAuth 用于 OpenClaw 等外部工具/工作流。

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

### Google Gemini (API key)

- 提供商：`google`
- 认证：`GEMINI_API_KEY`
- 可选轮换：`GEMINI_API_KEYS`、`GEMINI_API_KEY_1`、`GEMINI_API_KEY_2`、`GOOGLE_API_KEY` 回退，以及 `OPENCLAW_LIVE_GEMINI_KEY`（单次覆盖）
- 模型示例：`google/gemini-3.1-pro-preview`、`google/gemini-3-flash-preview`
- 兼容性：使用 `google/gemini-3.1-flash-preview` 的旧版 OpenClaw 配置会被标准化为 `google/gemini-3-flash-preview`
- CLI：`openclaw onboard --auth-choice gemini-api-key`

### Google Vertex、Antigravity 和 Gemini CLI

- 提供商：`google-vertex`、`google-antigravity`、`google-gemini-cli`
- 认证：Vertex 使用 gcloud ADC；Antigravity/Gemini CLI 使用各自的认证流程
- 注意：OpenClaw 中的 Antigravity 和 Gemini CLI OAuth 是非官方集成。有用户报告在使用第三方客户端后 Google 账号受到限制。如果选择继续，请查阅 Google 条款并使用非关键账号。
- Antigravity OAuth 作为捆绑插件（`google-antigravity-auth`，默认禁用）随附提供。
  - 启用：`openclaw plugins enable google-antigravity-auth`
  - 登录：`openclaw models auth login --provider google-antigravity --set-default`
- Gemini CLI OAuth 作为捆绑插件（`google-gemini-cli-auth`，默认禁用）随附提供。
  - 启用：`openclaw plugins enable google-gemini-cli-auth`
  - 登录：`openclaw models auth login --provider google-gemini-cli --set-default`
  - 注意：您**不**要将客户端 ID 或密钥粘贴到 `openclaw.json` 中。CLI 登录流程将令牌存储在网关主机的身份验证配置文件中。

### Z.AI (GLM)

- 提供商：`zai`
- 身份验证：`ZAI_API_KEY`
- 模型示例：`zai/glm-5`
- CLI：`openclaw onboard --auth-choice zai-api-key`
  - 别名：`z.ai/*` 和 `z-ai/*` 会规范化为 `zai/*`

### Vercel AI Gateway

- 提供商：`vercel-ai-gateway`
- 身份验证：`AI_GATEWAY_API_KEY`
- 模型示例：`vercel-ai-gateway/anthropic/claude-opus-4.6`
- CLI：`openclaw onboard --auth-choice ai-gateway-api-key`

### Kilo Gateway

- 提供商：`kilocode`
- 身份验证：`KILOCODE_API_KEY`
- 模型示例：`kilocode/anthropic/claude-opus-4.6`
- CLI：`openclaw onboard --kilocode-api-key <key>`
- Base URL：`https://api.kilo.ai/api/gateway/`
- 扩展的内置目录包括 GLM-5 Free、MiniMax M2.5 Free、GPT-5.2、Gemini 3 Pro Preview、Gemini 3 Flash Preview、Grok Code Fast 1 和 Kimi K2.5。

有关设置详情，请参阅 [/providers/kilocode](/zh/en/providers/kilocode)。

### 其他内置提供商

- OpenRouter：`openrouter` (`OPENROUTER_API_KEY`)
- 模型示例：`openrouter/anthropic/claude-sonnet-4-5`
- Kilo Gateway：`kilocode` (`KILOCODE_API_KEY`)
- 示例模型：`kilocode/anthropic/claude-opus-4.6`
- xAI：`xai` (`XAI_API_KEY`)
- Mistral：`mistral` (`MISTRAL_API_KEY`)
- 示例模型：`mistral/mistral-large-latest`
- CLI：`openclaw onboard --auth-choice mistral-api-key`
- Groq：`groq` (`GROQ_API_KEY`)
- Cerebras：`cerebras` (`CEREBRAS_API_KEY`)
  - Cerebras 上的 GLM 模型使用 ID `zai-glm-4.7` 和 `zai-glm-4.6`。
  - OpenAI 兼容的基础 URL：`https://api.cerebras.ai/v1`。
- GitHub Copilot：`github-copilot` (`COPILOT_GITHUB_TOKEN` / `GH_TOKEN` / `GITHUB_TOKEN`)
- Hugging Face 推理：`huggingface` (`HUGGINGFACE_HUB_TOKEN` 或 `HF_TOKEN`) — OpenAI 兼容路由器；示例模型：`huggingface/deepseek-ai/DeepSeek-R1`；CLI：`openclaw onboard --auth-choice huggingface-api-key`。参见 [Hugging Face (Inference)](/zh/en/providers/huggingface)。

## 通过 `models.providers` 的提供商（自定义/基础 URL）

使用 `models.providers` (或 `models.json`) 添加**自定义**提供商或
OpenAI/Anthropic 兼容的代理。

### Moonshot AI (Kimi)

Moonshot 使用 OpenAI 兼容的端点，因此将其配置为自定义提供商：

- 提供商：`moonshot`
- 认证：`MOONSHOT_API_KEY`
- 示例模型：`moonshot/kimi-k2.5`

Kimi K2 模型 ID：

{/* markdownlint-disable MD037 */}

{/_ moonshot-kimi-k2-model-refs:start _/ && null}

{/* markdownlint-enable MD037 */}

- `moonshot/kimi-k2.5`
- `moonshot/kimi-k2-0905-preview`
- `moonshot/kimi-k2-turbo-preview`
- `moonshot/kimi-k2-thinking`
- `moonshot/kimi-k2-thinking-turbo`
  {/* markdownlint-disable MD037 */}
  {/_ moonshot-kimi-k2-model-refs:end _/ && null}
  {/* markdownlint-enable MD037 */}

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

### Qwen OAuth（免费层级）

Qwen 通过设备码流程提供对 Qwen Coder + Vision 的 OAuth 访问。
启用内置插件，然后登录：

```bash
openclaw plugins enable qwen-portal-auth
openclaw models auth login --provider qwen-portal --set-default
```

模型引用：

- `qwen-portal/coder-model`
- `qwen-portal/vision-model`

有关设置详情和说明，请参阅 [/providers/qwen](/zh/en/providers/qwen)。

### 火山引擎（豆包）

火山引擎（火山引擎）提供对豆包和国内其他模型的访问。

- 提供商：`volcengine`（编码：`volcengine-plan`）
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

编码模型（`volcengine-plan`）：

- `volcengine-plan/ark-code-latest`
- `volcengine-plan/doubao-seed-code`
- `volcengine-plan/kimi-k2.5`
- `volcengine-plan/kimi-k2-thinking`
- `volcengine-plan/glm-4.7`

### BytePlus（国际版）

BytePlus ARK 为国际用户提供与火山引擎相同的模型访问权限。

- 提供商：`byteplus`（编码：`byteplus-plan`）
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

编码模型（`byteplus-plan`）：

- `byteplus-plan/ark-code-latest`
- `byteplus-plan/doubao-seed-code`
- `byteplus-plan/kimi-k2.5`
- `byteplus-plan/kimi-k2-thinking`
- `byteplus-plan/glm-4.7`

### Synthetic

Synthetic 通过 `synthetic` 提供商提供 Anthropic 兼容模型：

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

- MiniMax (Anthropic 兼容)：`--auth-choice minimax-api`
- 认证：`MINIMAX_API_KEY`

有关设置详细信息、模型选项和配置片段，请参阅 [/providers/minimax](/zh/en/providers/minimax)。

### Ollama

Ollama 作为捆绑的提供商插件提供，并使用 Ollama 的原生 API：

- 提供商：`ollama`
- 认证：无需认证（本地服务器）
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

当您通过 `OLLAMA_API_KEY` 选择加入时，会在 `http://127.0.0.1:11434` 本地检测到 Ollama，并且捆绑的提供商插件会将 Ollama 直接添加到 `openclaw onboard` 和模型选择器中。有关入门、云/本地模式和自定义配置，请参阅 [/providers/ollama](/zh/en/providers/ollama)。

### vLLM

vLLM 作为捆绑的提供商插件提供，用于本地/自托管的 OpenAI 兼容服务器：

- 提供商：`vllm`
- 认证：可选（取决于您的服务器）
- 默认基础 URL：`http://127.0.0.1:8000/v1`

要在本地选择加入自动发现（如果您的服务器不强制执行身份验证，则任何值都有效）：

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

有关详细信息，请参阅 [/providers/vllm](/zh/en/providers/vllm)。

### SGLang

SGLang 作为捆绑的提供商插件提供，用于快速自托管的 OpenAI 兼容服务器：

- 提供商：`sglang`
- 认证：可选（取决于您的服务器）
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

有关详细信息，请参阅 [/providers/sglang](/zh/en/providers/sglang)。

### 本地代理（LM Studio、vLLM、LiteLLM 等）

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

备注：

- 对于自定义提供商，`reasoning`、`input`、`cost`、`contextWindow` 和 `maxTokens` 是可选的。
  如果省略，OpenClaw 默认为：
  - `reasoning: false`
  - `input: ["text"]`
  - `cost: { input: 0, output: 0, cacheRead: 0, cacheWrite: 0 }`
  - `contextWindow: 200000`
  - `maxTokens: 8192`
- 建议：设置与您的代理/模型限制匹配的显式值。
- 对于非原生端点上的 `api: "openai-completions"`（任何主机不是 `api.openai.com` 的非空 `baseUrl`），OpenClaw 会强制使用 `compat.supportsDeveloperRole: false`，以避免提供商因不支持的 `developer` 角色而报错 400。
- 如果 `baseUrl` 为空/省略，OpenClaw 将保持默认的 OpenAI 行为（解析为 `api.openai.com`）。
- 为了安全起见，在非原生 `openai-completions` 端点上，显式的 `compat.supportsDeveloperRole: true` 仍会被覆盖。

## CLI 示例

```bash
openclaw onboard --auth-choice opencode-zen
openclaw models set opencode/claude-opus-4-6
openclaw models list
```

另请参阅：[/gateway/configuration](/zh/en/gateway/configuration) 以获取完整的配置示例。

import zh from '/components/footer/zh.mdx';

<zh />
