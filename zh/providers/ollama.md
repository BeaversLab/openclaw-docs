---
summary: "通过 OpenClaw 运行 Ollama（云端和本地模型）"
read_when:
  - You want to run OpenClaw with cloud or local models via Ollama
  - You need Ollama setup and configuration guidance
title: "Ollama"
---

# Ollama

Ollama 是一个本地 LLM 运行时，可让您轻松在机器上运行开源模型。OpenClaw 与 Ollama 的原生 API (`/api/chat`) 集成，支持流式传输和 Ollama 调用，并且当您选择加入 `OLLAMA_API_KEY`（或身份验证配置文件）且未定义显式 `models.providers.ollama` 条目时，可以自动发现本地 Ollama 模型。

<Warning>
  **远程 Ollama 用户**：请勿在 OpenAI 中使用 `/v1` OpenClaw 兼容 URL
  (`http://host:11434/v1`)。这会破坏 Ollama 调用，并且模型可能会将原始 API JSON
  作为纯文本输出。请改用 原生 API API URL：`baseUrl: "http://host:11434"`（无 `/v1`）。
</Warning>

## 快速入门

### 新手引导（推荐）

设置 Ollama 最快的方法是通过新手引导：

```bash
openclaw onboard
```

从提供商列表中选择 **Ollama**。新手引导将会：

1. 询问可访问您的实例的 Ollama 基础 URL（默认为 `http://127.0.0.1:11434`）。
2. 让您选择 **Cloud + Local**（云端模型和本地模型）或 **Local**（仅本地模型）。
3. 如果您选择 **Cloud + Local** 且尚未登录 ollama.com，则打开浏览器登录流程。
4. 发现可用模型并建议默认模型。
5. 如果所选模型在本地不可用，则自动拉取该模型。

也支持非交互模式：

```bash
openclaw onboard --non-interactive \
  --auth-choice ollama \
  --accept-risk
```

可以选择指定自定义基础 URL 或模型：

```bash
openclaw onboard --non-interactive \
  --auth-choice ollama \
  --custom-base-url "http://ollama-host:11434" \
  --custom-model-id "qwen3.5:27b" \
  --accept-risk
```

### 手动设置

1. 安装 Ollama：[https://ollama.com/download](https://ollama.com/download)

2. 如果需要进行本地推理，请拉取一个本地模型：

```bash
ollama pull glm-4.7-flash
# or
ollama pull gpt-oss:20b
# or
ollama pull llama3.3
```

3. 如果您还需要云端模型，请登录：

```bash
ollama signin
```

4. 运行新手引导并选择 `Ollama`：

```bash
openclaw onboard
```

- `Local`：仅本地模型
- `Cloud + Local`：本地模型以及云端模型
- Cloud models such as `kimi-k2.5:cloud`, `minimax-m2.5:cloud`, and `glm-5:cloud` do **not** require a local `ollama pull`

OpenClaw 目前建议：

- 本地默认值： `glm-4.7-flash`
- 云默认值： `kimi-k2.5:cloud`, `minimax-m2.5:cloud`, `glm-5:cloud`

5. 如果您更喜欢手动设置，请直接为 Ollama 启用 OpenClaw（任何值均可；Ollama 不需要真实的密钥）：

```bash
# Set environment variable
export OLLAMA_API_KEY="ollama-local"

# Or configure in your config file
openclaw config set models.providers.ollama.apiKey "ollama-local"
```

6. 检查或切换模型：

```bash
openclaw models list
openclaw models set ollama/glm-4.7-flash
```

7. 或在配置中设置默认值：

```json5
{
  agents: {
    defaults: {
      model: { primary: "ollama/glm-4.7-flash" },
    },
  },
}
```

## 模型发现（隐式提供商）

当您设置 `OLLAMA_API_KEY`（或身份验证配置文件）并且**不**定义 `models.providers.ollama` 时，OpenClaw 会从位于 `http://127.0.0.1:11434` 的本地 Ollama 实例中发现模型：

- 查询 `/api/tags`
- 尽力使用 `/api/show` 查找来读取 `contextWindow`（如果可用）
- 使用模型名称启发式方法（`r1`、`reasoning`、`think`）标记 `reasoning`
- 将 `maxTokens` 设置为 Ollama 使用的默认 OpenClaw 最大令牌上限
- 将所有成本设置为 `0`

这避免了手动输入模型，同时保持目录与本地 Ollama 实例同步。

要查看可用的模型：

```bash
ollama list
openclaw models list
```

要添加新模型，只需使用 Ollama 拉取它：

```bash
ollama pull mistral
```

新模型将被自动发现并可供使用。

如果您显式设置了 `models.providers.ollama`，则会跳过自动发现，您必须手动定义模型（见下文）。

## 配置

### 基本设置（隐式发现）

启用 Ollama 的最简单方法是通过环境变量：

```bash
export OLLAMA_API_KEY="ollama-local"
```

### 显式设置（手动模型）

在以下情况下使用显式配置：

- Ollama 运行在其他主机/端口上。
- 您想要强制特定的上下文窗口或模型列表。
- 您想要完全手动的模型定义。

```json5
{
  models: {
    providers: {
      ollama: {
        baseUrl: "http://ollama-host:11434",
        apiKey: "ollama-local",
        api: "ollama",
        models: [
          {
            id: "gpt-oss:20b",
            name: "GPT-OSS 20B",
            reasoning: false,
            input: ["text"],
            cost: { input: 0, output: 0, cacheRead: 0, cacheWrite: 0 },
            contextWindow: 8192,
            maxTokens: 8192 * 10
          }
        ]
      }
    }
  }
}
```

如果设置了 `OLLAMA_API_KEY`，则可以在提供商条目中省略 `apiKey`，OpenClaw 将自动填充它以进行可用性检查。

### 自定义基础 URL（显式配置）

如果 Ollama 在不同的主机或端口上运行（显式配置会禁用自动发现，因此请手动定义模型）：

```json5
{
  models: {
    providers: {
      ollama: {
        apiKey: "ollama-local",
        baseUrl: "http://ollama-host:11434", // No /v1 - use native Ollama API URL
        api: "ollama", // Set explicitly to guarantee native tool-calling behavior
      },
    },
  },
}
```

<Warning>
  不要在 URL 中添加 `/v1`。 `/v1` 路径使用 OpenAI 兼容模式，在该模式下工具调用并
  不可靠。请使用不带路径后缀的基础 Ollama URL。
</Warning>

### 模型选择

配置完成后，您的所有 Ollama 模型均可用：

```json5
{
  agents: {
    defaults: {
      model: {
        primary: "ollama/gpt-oss:20b",
        fallbacks: ["ollama/llama3.3", "ollama/qwen2.5-coder:32b"],
      },
    },
  },
}
```

## 云端模型

云端模型允许您在本地模型旁边运行云端托管的模型（例如 `kimi-k2.5:cloud`、`minimax-m2.5:cloud`、`glm-5:cloud`）。

要使用云模型，请在设置过程中选择 **Cloud + Local** 模式。向导会检查您是否已登录，并在需要时打开浏览器登录流程。如果无法验证身份，向导将回退到本地模型默认设置。

您也可以直接在 [ollama.com/signin](https://ollama.com/signin) 登录。

## 高级

### 推理模型

OpenClaw 默认将名称如 `deepseek-r1`、`reasoning` 或 `think` 的模型视为具备推理能力：

```bash
ollama pull deepseek-r1:32b
```

### 模型成本

Ollama 是免费的并且在本地运行，因此所有模型成本均设为 $0。

### 流式传输配置

OpenClaw 的 Ollama 集成默认使用 **原生 Ollama API** (`/api/chat`)，它完全支持同时进行流式传输和工具调用。无需特殊配置。

#### 旧版 OpenAI 兼容模式

<Warning>
  **在 OpenAI 兼容模式下工具调用并不可靠。** 仅当您需要代理的 OpenAI
  格式且不依赖原生工具调用行为时才使用此模式。
</Warning>

如果您需要改用 OpenAI 兼容的端点（例如，在仅支持 OpenAI 格式的代理后面），请显式设置 `api: "openai-completions"`：

```json5
{
  models: {
    providers: {
      ollama: {
        baseUrl: "http://ollama-host:11434/v1",
        api: "openai-completions",
        injectNumCtxForOpenAICompat: true, // default: true
        apiKey: "ollama-local",
        models: [...]
      }
    }
  }
}
```

此模式可能无法同时支持流式传输 + 工具调用。您可能需要在模型配置中禁用流式传输，使用 `params: { streaming: false }`。

当 `api: "openai-completions"` 与 Ollama 一起使用时，OpenClaw 默认会注入 `options.num_ctx`，以防止 Ollama 默默回退到 4096 的上下文窗口。如果您的代理/上游拒绝未知的 `options` 字段，请禁用此行为：

```json5
{
  models: {
    providers: {
      ollama: {
        baseUrl: "http://ollama-host:11434/v1",
        api: "openai-completions",
        injectNumCtxForOpenAICompat: false,
        apiKey: "ollama-local",
        models: [...]
      }
    }
  }
}
```

### 上下文窗口

对于自动发现的模型，OpenClaw 优先使用 Ollama 报告的上下文窗口（如果可用），否则回退到 OpenClaw 默认使用的 Ollama 上下文窗口。您可以在显式提供商配置中覆盖 `contextWindow` 和 `maxTokens`。

## 故障排除

### 未检测到 Ollama

请确保 Ollama 正在运行，并且您设置了 `OLLAMA_API_KEY`（或身份验证配置文件），并且您**没有**定义显式的 `models.providers.ollama` 条目：

```bash
ollama serve
```

并且 API 是可访问的：

```bash
curl http://localhost:11434/api/tags
```

### 没有可用的模型

如果未列出您的模型，请执行以下操作之一：

- 在本地拉取模型，或
- 在 `models.providers.ollama` 中显式定义模型。

要添加模型：

```bash
ollama list  # See what's installed
ollama pull glm-4.7-flash
ollama pull gpt-oss:20b
ollama pull llama3.3     # Or another model
```

### 连接被拒绝

检查 Ollama 是否在正确的端口上运行：

```bash
# Check if Ollama is running
ps aux | grep ollama

# Or restart Ollama
ollama serve
```

## 另请参阅

- [模型提供商](/zh/concepts/model-providers) - 所有提供商的概览
- [模型选择](/zh/concepts/models) - 如何选择模型
- [配置](/zh/gateway/configuration) - 完整配置参考

import zh from "/components/footer/zh.mdx";

<zh />
