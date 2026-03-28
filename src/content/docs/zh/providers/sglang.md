---
summary: "使用 SGLang 运行 OpenClaw（OpenAI 兼容的自托管服务器）"
read_when:
  - You want to run OpenClaw against a local SGLang server
  - You want OpenAI-compatible /v1 endpoints with your own models
title: "SGLang"
---

# SGLang

SGLang 可以通过 **OpenAI 兼容的** HTTP API 提供开源模型服务。
OpenClaw 可以使用 `openai-completions` API 连接到 SGLang。

当您选择使用 `SGLANG_API_KEY` 时（如果您的服务器不强制身份验证，则任何值均可），
并且未定义显式的 `models.providers.sglang` 条目，OpenClaw 还可以从 SGLang **自动发现** 可用模型。

## 快速开始

1. 使用 OpenAI 兼容服务器启动 SGLang。

您的基础 URL 应该公开 `/v1` 端点（例如 `/v1/models`、
`/v1/chat/completions`）。SGLang 通常运行在：

- `http://127.0.0.1:30000/v1`

2. 选择启用（如果未配置认证，则任何值均可）：

```bash
export SGLANG_API_KEY="sglang-local"
```

3. 运行入门引导并选择 `SGLang`，或直接设置模型：

```bash
openclaw onboard
```

```json5
{
  agents: {
    defaults: {
      model: { primary: "sglang/your-model-id" },
    },
  },
}
```

## 模型发现（隐式提供商）

当设置了 `SGLANG_API_KEY`（或存在身份验证配置文件）并且您**未**
定义 `models.providers.sglang` 时，OpenClaw 将查询：

- `GET http://127.0.0.1:30000/v1/models`

并将返回的 ID 转换为模型条目。

如果您显式设置了 `models.providers.sglang`，则会跳过自动发现，
并且您必须手动定义模型。

## 显式配置（手动模型）

在以下情况下使用显式配置：

- SGLang 运行在不同的主机/端口上。
- 您想要固定 `contextWindow`/`maxTokens` 的值。
- 您的服务器需要真实的 API 密钥（或者您想要控制请求头）。

```json5
{
  models: {
    providers: {
      sglang: {
        baseUrl: "http://127.0.0.1:30000/v1",
        apiKey: "${SGLANG_API_KEY}",
        api: "openai-completions",
        models: [
          {
            id: "your-model-id",
            name: "Local SGLang Model",
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
curl http://127.0.0.1:30000/v1/models
```

- 如果请求因身份验证错误而失败，请设置一个与您的服务器配置相匹配的真实 `SGLANG_API_KEY`，或者在 `models.providers.sglang` 下显式配置提供商。
