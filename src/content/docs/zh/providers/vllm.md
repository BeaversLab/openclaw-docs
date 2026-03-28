---
summary: "结合 vLLM 运行 OpenClaw（兼容 OpenAI 的本地服务器）"
read_when:
  - You want to run OpenClaw against a local vLLM server
  - You want OpenAI-compatible /v1 endpoints with your own models
title: "vLLM"
---

# vLLM

vLLM 可以通过 **兼容 OpenAI 的** HTTP API 来提供开源（以及某些自定义）模型服务。OpenClaw 可以使用 `openai-completions` API 连接到 vLLM。

当您选择使用 `VLLM_API_KEY` 加入（如果您的服务器不强制执行身份验证，任何值均可）且未定义显式的 `models.providers.vllm` 条目时，OpenClaw 还可以从 vLLM **自动发现**可用的模型。

## 快速开始

1. 使用 OpenAI 兼容的服务器启动 vLLM。

您的基本 URL 应暴露 `/v1` 端点（例如 `/v1/models`、`/v1/chat/completions`）。vLLM 通常运行在：

- `http://127.0.0.1:8000/v1`

2. 选择加入（如果未配置身份验证，则任何值均可）：

```bash
export VLLM_API_KEY="vllm-local"
```

3. 选择一个模型（替换为您的 vLLM 模型 ID 之一）：

```json5
{
  agents: {
    defaults: {
      model: { primary: "vllm/your-model-id" },
    },
  },
}
```

## 模型发现（隐式提供者）

当设置了 `VLLM_API_KEY`（或存在身份验证配置文件）并且您 **不** 定义 `models.providers.vllm` 时，OpenClaw 将查询：

- `GET http://127.0.0.1:8000/v1/models`

……并将返回的 ID 转换为模型条目。

如果您显式设置了 `models.providers.vllm`，则将跳过自动发现，并且您必须手动定义模型。

## 显式配置（手动模型）

在以下情况下使用显式配置：

- vLLM 运行在不同的主机/端口上。
- 您想要固定 `contextWindow`/`maxTokens` 值。
- 您的服务器需要真实的 API 密钥（或者您想要控制请求头）。

```json5
{
  models: {
    providers: {
      vllm: {
        baseUrl: "http://127.0.0.1:8000/v1",
        apiKey: "${VLLM_API_KEY}",
        api: "openai-completions",
        models: [
          {
            id: "your-model-id",
            name: "Local vLLM Model",
            reasoning: false,
            input: ["text"],
            cost: { input: 0, output: 0, cacheRead: 0, cacheWrite: 0 },
            contextWindow: 128000,
            maxTokens: 8192,
          },
        ],
      },
    },
  },
}
```

## 故障排除

- 检查服务器是否可访问：

```bash
curl http://127.0.0.1:8000/v1/models
```

- 如果请求因身份验证错误而失败，请设置一个与您的服务器配置匹配的真实 `VLLM_API_KEY`，或在 `models.providers.vllm` 下显式配置提供商。
