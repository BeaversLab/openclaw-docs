---
summary: "模型 provider 概览（含示例配置与 CLI 流程）"
read_when:
  - 需要按 provider 的模型设置参考
  - 想要示例配置或模型 provider 的 CLI onboarding 命令
title: "模型提供商"
---

# 模型供应商

本页涵盖 **LLM/model providers**（不是 WhatsApp/Telegram 这类聊天渠道）。
模型选择规则参见 [/concepts/models](/zh/concepts/models)。

## 快速规则

- 模型引用使用 `provider/model`（例如：`opencode/claude-opus-4-5`）。
- 若设置 `agents.defaults.models`，它会成为 allowlist。
- CLI 助手：`openclaw onboard`、`openclaw models list`、`openclaw models set <provider/model>`。

## 内置 providers（pi-ai catalog）

OpenClaw 自带 pi‑ai catalog。这些 providers **不需要** `models.providers` 配置；只需设置 auth + 选择模型。

### OpenAI

- Provider：`openai`
- Auth：`OPENAI_API_KEY`
- 示例模型：`openai/gpt-5.2`
- CLI：`openclaw onboard --auth-choice openai-api-key`

```json5
{
  agents: { defaults: { model: { primary: "openai/gpt-5.2" } } },
}
```

### Anthropic

- Provider：`anthropic`
- Auth：`ANTHROPIC_API_KEY` 或 `claude setup-token`
- 示例模型：`anthropic/claude-opus-4-5`
- CLI：`openclaw onboard --auth-choice token`（粘贴 setup-token）或 `openclaw models auth paste-token --provider anthropic`

```json5
{
  agents: { defaults: { model: { primary: "anthropic/claude-opus-4-5" } } },
}
```

### OpenAI Code (Codex)

- Provider：`openai-codex`
- Auth：OAuth（ChatGPT）
- 示例模型：`openai-codex/gpt-5.2`
- CLI：`openclaw onboard --auth-choice openai-codex` 或 `openclaw models auth login --provider openai-codex`

```json5
{
  agents: { defaults: { model: { primary: "openai-codex/gpt-5.2" } } },
}
```

### OpenCode Zen

- Provider：`opencode`
- Auth：`OPENCODE_API_KEY`（或 `OPENCODE_ZEN_API_KEY`）
- 示例模型：`opencode/claude-opus-4-5`
- CLI：`openclaw onboard --auth-choice opencode-zen`

```json5
{
  agents: { defaults: { model: { primary: "opencode/claude-opus-4-5" } } },
}
```

### Google Gemini（API key）

- Provider：`google`
- Auth：`GEMINI_API_KEY`
- 示例模型：`google/gemini-3-pro-preview`
- CLI：`openclaw onboard --auth-choice gemini-api-key`

### Google Vertex / Antigravity / Gemini CLI

- Providers：`google-vertex`、`google-antigravity`、`google-gemini-cli`
- Auth：Vertex 使用 gcloud ADC；Antigravity/Gemini CLI 使用各自的 auth 流程
- Antigravity OAuth 以 bundled plugin 形式提供（`google-antigravity-auth`，默认禁用）。
  - 启用：`openclaw plugins enable google-antigravity-auth`
  - 登录：`openclaw models auth login --provider google-antigravity --set-default`
- Gemini CLI OAuth 以 bundled plugin 形式提供（`google-gemini-cli-auth`，默认禁用）。
  - 启用：`openclaw plugins enable google-gemini-cli-auth`
  - 登录：`openclaw models auth login --provider google-gemini-cli --set-default`
  - 注：**不需要**把 client id 或 secret 粘贴到 `openclaw.json`。CLI 登录流程会将 tokens 存到 gateway 主机的 auth profiles 中。

### Z.AI（GLM）

- Provider：`zai`
- Auth：`ZAI_API_KEY`
- 示例模型：`zai/glm-4.7`
- CLI：`openclaw onboard --auth-choice zai-api-key`
  - 别名：`z.ai/*` 与 `z-ai/*` 规范化为 `zai/*`

### Vercel AI Gateway

- Provider：`vercel-ai-gateway`
- Auth：`AI_GATEWAY_API_KEY`
- 示例模型：`vercel-ai-gateway/anthropic/claude-opus-4.5`
- CLI：`openclaw onboard --auth-choice ai-gateway-api-key`

### 其他内置 providers

- OpenRouter：`openrouter`（`OPENROUTER_API_KEY`）
- 示例模型：`openrouter/anthropic/claude-sonnet-4-5`
- xAI：`xai`（`XAI_API_KEY`）
- Groq：`groq`（`GROQ_API_KEY`）
- Cerebras：`cerebras`（`CEREBRAS_API_KEY`）
  - Cerebras 上的 GLM 模型 id 为 `zai-glm-4.7` 与 `zai-glm-4.6`。
  - OpenAI 兼容 base URL：`https://api.cerebras.ai/v1`。
- Mistral：`mistral`（`MISTRAL_API_KEY`）
- GitHub Copilot：`github-copilot`（`COPILOT_GITHUB_TOKEN` / `GH_TOKEN` / `GITHUB_TOKEN`）

## 通过 `models.providers`（自定义/base URL）

使用 `models.providers`（或 `models.json`）来添加**自定义** providers 或 OpenAI/Anthropic 兼容代理。

### Moonshot AI（Kimi）

Moonshot 使用 OpenAI 兼容端点，因此作为自定义 provider 配置：

- Provider：`moonshot`
- Auth：`MOONSHOT_API_KEY`
- 示例模型：`moonshot/kimi-k2.5`
- Kimi K2 模型 ID：
  {/_ moonshot-kimi-k2-model-refs:start _/}
  - `moonshot/kimi-k2.5`
  - `moonshot/kimi-k2-0905-preview`
  - `moonshot/kimi-k2-turbo-preview`
  - `moonshot/kimi-k2-thinking`
  - `moonshot/kimi-k2-thinking-turbo`
    {/_ moonshot-kimi-k2-model-refs:end _/}

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

### Kimi Code

Kimi Code 使用专用端点与 key（与 Moonshot 分离）：

- Provider：`kimi-code`
- Auth：`KIMICODE_API_KEY`
- 示例模型：`kimi-code/kimi-for-coding`

```json5
{
  env: { KIMICODE_API_KEY: "sk-..." },
  agents: {
    defaults: { model: { primary: "kimi-code/kimi-for-coding" } },
  },
  models: {
    mode: "merge",
    providers: {
      "kimi-code": {
        baseUrl: "https://api.kimi.com/coding/v1",
        apiKey: "${KIMICODE_API_KEY}",
        api: "openai-completions",
        models: [{ id: "kimi-for-coding", name: "Kimi For Coding" }],
      },
    },
  },
}
```

### Qwen OAuth（免费层）

Qwen 通过 device-code flow 提供 OAuth 访问 Qwen Coder + Vision。
启用 bundled plugin 后登录：

```bash
openclaw plugins enable qwen-portal-auth
openclaw models auth login --provider qwen-portal --set-default
```

模型引用：

- `qwen-portal/coder-model`
- `qwen-portal/vision-model`

参见 [/providers/qwen](/zh/providers/qwen) 了解配置细节与注意事项。

### Synthetic

Synthetic 在 `synthetic` provider 下提供 Anthropic 兼容模型：

- Provider：`synthetic`
- Auth：`SYNTHETIC_API_KEY`
- 示例模型：`synthetic/hf:MiniMaxAI/MiniMax-M2.1`
- CLI：`openclaw onboard --auth-choice synthetic-api-key`

```json5
{
  agents: {
    defaults: { model: { primary: "synthetic/hf:MiniMaxAI/MiniMax-M2.1" } },
  },
  models: {
    mode: "merge",
    providers: {
      synthetic: {
        baseUrl: "https://api.synthetic.new/anthropic",
        apiKey: "${SYNTHETIC_API_KEY}",
        api: "anthropic-messages",
        models: [{ id: "hf:MiniMaxAI/MiniMax-M2.1", name: "MiniMax M2.1" }],
      },
    },
  },
}
```

### MiniMax

MiniMax 使用自定义端点，因此通过 `models.providers` 配置：

- MiniMax（Anthropic 兼容）：`--auth-choice minimax-api`
- Auth：`MINIMAX_API_KEY`

参见 [/providers/minimax](/zh/providers/minimax) 了解配置细节、模型选项与配置片段。

### Ollama

Ollama 是本地 LLM 运行时，提供 OpenAI 兼容 API：

- Provider：`ollama`
- Auth：无需（本地服务）
- 示例模型：`ollama/llama3.3`
- 安装：https://ollama.ai

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

Ollama 在本地 `http://127.0.0.1:11434/v1` 运行时会被自动检测。
参见 [/providers/ollama](/zh/providers/ollama) 了解模型推荐与自定义配置。

### 本地代理（LM Studio、vLLM、LiteLLM 等）

示例（OpenAI 兼容）：

```json5
{
  agents: {
    defaults: {
      model: { primary: "lmstudio/minimax-m2.1-gs32" },
      models: { "lmstudio/minimax-m2.1-gs32": { alias: "Minimax" } },
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
            id: "minimax-m2.1-gs32",
            name: "MiniMax M2.1",
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

注：

- 对自定义 providers，`reasoning`、`input`、`cost`、`contextWindow`、`maxTokens` 可选。
  若省略，OpenClaw 默认：
  - `reasoning: false`
  - `input: ["text"]`
  - `cost: { input: 0, output: 0, cacheRead: 0, cacheWrite: 0 }`
  - `contextWindow: 200000`
  - `maxTokens: 8192`
- 建议：显式设置与代理/模型上限一致的值。

## CLI 示例

```bash
openclaw onboard --auth-choice opencode-zen
openclaw models set opencode/claude-opus-4-5
openclaw models list
```

另见：[/gateway/configuration](/zh/gateway/configuration) 获取完整配置示例。
