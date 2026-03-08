---
summary: "使用 Ollama 运行 OpenClaw（本地 LLM 运行时）"
read_when:
  - 想通过 Ollama 运行本地模型
  - 需要 Ollama 设置与配置指引
title: "Ollama"
---

# Ollama

Ollama 是本地 LLM 运行时，便于在机器上运行开源模型。OpenClaw 与 Ollama 的 OpenAI 兼容 API 集成，并在你使用 `OLLAMA_API_KEY`（或认证 profile）且未显式定义 `models.providers.ollama` 时，可 **自动发现支持工具的模型**。

## 快速开始

1. 安装 Ollama：https://ollama.ai

2. 拉取模型：

```bash
ollama pull llama3.3
# or
ollama pull qwen2.5-coder:32b
# or
ollama pull deepseek-r1:32b
```

3. 为 OpenClaw 启用 Ollama（任意值都可；Ollama 不要求真实 key）：

```bash
# Set environment variable
export OLLAMA_API_KEY="ollama-local"

# Or configure in your config file
openclaw config set models.providers.ollama.apiKey "ollama-local"
```

4. 使用 Ollama 模型：

```json5
{
  agents: {
    defaults: {
      model: { primary: "ollama/llama3.3" },
    },
  },
}
```

## 模型发现（隐式 provider）

当你设置 `OLLAMA_API_KEY`（或认证 profile）且 **未** 定义 `models.providers.ollama` 时，OpenClaw 会从本地 Ollama（`http://127.0.0.1:11434`）发现模型：

- 查询 `/api/tags` 和 `/api/show`
- 仅保留报告 `tools` 能力的模型
- 当模型报告 `thinking` 时标记 `reasoning`
- 可用时从 `model_info["<arch>.context_length"]` 读取 `contextWindow`
- 将 `maxTokens` 设为上下文窗口的 10×
- 所有成本设为 `0`

这可避免手动维护模型条目，同时与 Ollama 能力保持一致。

查看可用模型：

```bash
ollama list
openclaw models list
```

新增模型只需使用 Ollama 拉取：

```bash
ollama pull mistral
```

新模型将被自动发现并可用。

如果显式设置了 `models.providers.ollama`，自动发现会被跳过，你必须手动定义模型（见下）。

## 配置

### 基础配置（隐式发现）

最简单的启用方式是设置环境变量：

```bash
export OLLAMA_API_KEY="ollama-local"
```

### 显式配置（手动模型）

以下场景建议显式配置：

- Ollama 运行在其他主机/端口。
- 你希望强制指定上下文窗口或模型列表。
- 你想包含未声明工具能力的模型。

```json5
{
  models: {
    providers: {
      ollama: {
        // Use a host that includes /v1 for OpenAI-compatible APIs
        baseUrl: "http://ollama-host:11434/v1",
        apiKey: "ollama-local",
        api: "openai-completions",
        models: [
          {
            id: "llama3.3",
            name: "Llama 3.3",
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

若已设置 `OLLAMA_API_KEY`，可在 provider 条目中省略 `apiKey`，OpenClaw 会用于可用性检查。

### 自定义 base URL（显式配置）

如果 Ollama 运行在不同主机或端口（显式配置会禁用自动发现，因此需手动定义模型）：

```json5
{
  models: {
    providers: {
      ollama: {
        apiKey: "ollama-local",
        baseUrl: "http://ollama-host:11434/v1",
      },
    },
  },
}
```

### 模型选择

配置完成后，你的所有 Ollama 模型均可用：

```json5
{
  agents: {
    defaults: {
      model: {
        primary: "ollama/llama3.3",
        fallback: ["ollama/qwen2.5-coder:32b"],
      },
    },
  },
}
```

## 高级

### 推理模型

当 Ollama 在 `/api/show` 中报告 `thinking` 时，OpenClaw 会将模型标记为可推理：

```bash
ollama pull deepseek-r1:32b
```

### 模型成本

Ollama 本地运行且免费，因此所有模型成本都设为 $0。

### 上下文窗口

自动发现的模型会使用 Ollama 报告的上下文窗口（可用时），否则默认 `8192`。你可以在显式 provider 配置中覆盖 `contextWindow` 与 `maxTokens`。

## 故障排查

### 未检测到 Ollama

确认 Ollama 正在运行，并设置了 `OLLAMA_API_KEY`（或认证 profile），且 **未** 显式定义 `models.providers.ollama`：

```bash
ollama serve
```

并确认 API 可访问：

```bash
curl http://localhost:11434/api/tags
```

### 没有可用模型

OpenClaw 只会自动发现报告工具能力的模型。若你的模型未列出：

- 拉取支持工具的模型，或
- 在 `models.providers.ollama` 中显式定义模型。

添加模型：

```bash
ollama list  # See what's installed
ollama pull llama3.3  # Pull a model
```

### Connection refused

检查 Ollama 是否运行在正确端口：

```bash
# Check if Ollama is running
ps aux | grep ollama

# Or restart Ollama
ollama serve
```

## 参见

- [模型 提供商](/zh/concepts/model-providers) - 所有 provider 概览
- [模型 Selection](/zh/concepts/models) - 如何选择模型
- [配置](/zh/gateway/configuration) - 完整配置参考
