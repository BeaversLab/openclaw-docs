---
summary: "使用 Ollama（本地 LLM 运行时）运行 OpenClaw"
read_when:
  - You want to run OpenClaw with local models via Ollama
  - You need Ollama setup and configuration guidance
title: "Ollama"
---

# Ollama

Ollama 是一个本地 LLM 运行时，可让您轻松在计算机上运行开源模型。OpenClaw 集成了 Ollama 的原生 API (`/api/chat`)，支持流式传输和工具调用，并且当您选择启用 `OLLAMA_API_KEY`（或身份验证配置文件）且未定义显式的 `models.providers.ollama` 条目时，可以自动发现本地 Ollama 模型。

<Warning>
**远程 Ollama 用户**：请勿在 OpenClaw 中使用 `/v1` OpenAI 兼容 URL (`http://host:11434/v1`)。这会破坏工具调用，模型可能会将原始工具 JSON 作为纯文本输出。请改用原生 Ollama API URL：`baseUrl: "http://host:11434"`（无 `/v1`）。
</Warning>

## 快速入门

1. 安装 Ollama：[https://ollama.com/download](https://ollama.com/download)

2. 如果您希望进行本地推理，请拉取一个本地模型：

```bash
ollama pull glm-4.7-flash
# or
ollama pull gpt-oss:20b
# or
ollama pull llama3.3
```

3. 如果您还需要 Ollama Cloud 模型，请登录：

```bash
ollama signin
```

4. 运行入门引导并选择 `Ollama`：

```bash
openclaw onboard
```

- `Local`：仅限本地模型
- `Cloud + Local`：本地模型以及 Ollama Cloud 模型
- 诸如 `kimi-k2.5:cloud`、`minimax-m2.5:cloud` 和 `glm-5:cloud` 等云模型**不**需要本地 `ollama pull`

OpenClaw 目前建议：

- 本地默认值：`glm-4.7-flash`
- 云默认值：`kimi-k2.5:cloud`、`minimax-m2.5:cloud`、`glm-5:cloud`

5. 如果您喜欢手动设置，请直接为 OpenClaw 启用 Ollama（任何值均可；Ollama 不需要真实的密钥）：

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

当您设置 `OLLAMA_API_KEY`（或身份验证配置文件）并且**未**定义 `models.providers.ollama` 时，OpenClaw 会从 `http://127.0.0.1:11434` 的本地 Ollama 实例中发现模型：

- 查询 `/api/tags`
- 在可用时使用尽力而为的 `/api/show` 查找来读取 `contextWindow`
- 使用模型名称启发式方法 (`r1`、`reasoning`、`think`) 标记 `reasoning`
- 将 `maxTokens` 设置为 OpenClaw 使用的默认 Ollama 最大 token 上限
- 将所有成本设置为 `0`

这样既避免了手动输入模型，又能确保目录与本地 Ollama 实例保持同步。

要查看有哪些可用模型：

```bash
ollama list
openclaw models list
```

要添加新模型，只需使用 Ollama 拉取：

```bash
ollama pull mistral
```

新模型将被自动发现并可供使用。

如果你显式设置了 `models.providers.ollama`，则会跳过自动发现，并且你必须手动定义模型（见下文）。

## 配置

### 基本设置（隐式发现）

启用 Ollama 最简单的方法是通过环境变量：

```bash
export OLLAMA_API_KEY="ollama-local"
```

### 显式设置（手动模型）

在以下情况使用显式配置：

- Ollama 运行在其他主机/端口上。
- 您希望强制使用特定的上下文窗口或模型列表。
- 您希望完全手动定义模型。

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

如果设置了 `OLLAMA_API_KEY`，你可以在 provider 条目中省略 `apiKey`，OpenClaw 将为可用性检查填充它。

### 自定义基础 URL（显式配置）

如果 Ollama 运行在不同的主机或端口上（显式配置会禁用自动发现，因此需手动定义模型）：

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
不要在 URL 中添加 `/v1`。`/v1` 路径使用 OpenAI 兼容模式，其中工具调用不可靠。请使用不带路径后缀的 Ollama 基础 URL。
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

## 高级

### 推理模型

默认情况下，OpenClaw 将名称如 `deepseek-r1`、`reasoning` 或 `think` 的模型视为具备推理能力：

```bash
ollama pull deepseek-r1:32b
```

### 模型成本

Ollama 是免费的且在本地运行，因此所有模型成本均设为 $0。

### 流式配置

OpenClaw 的 Ollama 集成默认使用 **原生 Ollama API** (`/api/chat`)，它完全支持同时进行流式传输和工具调用。无需特殊配置。

#### 旧版 OpenAI 兼容模式

<Warning>
**在 OpenAI 兼容模式下工具调用不可靠。** 仅当您需要代理的 OpenAI 格式且不依赖原生工具调用行为时才使用此模式。
</Warning>

如果你需要改用 OpenAI 兼容端点（例如，在仅支持 OpenAI 格式的代理后面），请显式设置 `api: "openai-completions"`：

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

此模式可能不支持同时进行流式传输和工具调用。你可能需要在模型配置中使用 `params: { streaming: false }` 禁用流式传输。

当将 `api: "openai-completions"` 与 Ollama 一起使用时，OpenClaw 默认会注入 `options.num_ctx`，以防 Ollama 无提示回退到 4096 上下文窗口。如果你的代理/上游拒绝未知的 `options` 字段，请禁用此行为：

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

对于自动发现的模型，OpenClaw 在可用时使用 Ollama 报告的上下文窗口，否则回退到 OpenClaw 使用的默认 Ollama 上下文窗口。你可以在显式 provider 配置中覆盖 `contextWindow` 和 `maxTokens`。

## 故障排除

### 未检测到 Ollama

请确保 Ollama 正在运行，并且您设置了 `OLLAMA_API_KEY`（或认证配置文件），并且您**没有**定义显式的 `models.providers.ollama` 条目：

```bash
ollama serve
```

并且 API 可访问：

```bash
curl http://localhost:11434/api/tags
```

### 没有可用的模型

如果未列出您的模型，请执行以下任一操作：

- 在本地拉取模型，或者
- 在 `models.providers.ollama` 中显式定义模型。

添加模型：

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

- [模型提供者](/en/concepts/model-providers) - 所有提供者概览
- [模型选择](/en/concepts/models) - 如何选择模型
- [配置](/en/gateway/configuration) - 完整配置参考

import zh from '/components/footer/zh.mdx';

<zh />
