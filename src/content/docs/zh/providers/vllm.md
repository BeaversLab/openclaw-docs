---
summary: "使用 vLLM 运行 OpenClaw（OpenAI 兼容的本地服务器）"
read_when:
  - You want to run OpenClaw against a local vLLM server
  - You want OpenAI-compatible /v1 endpoints with your own models
title: "vLLM"
---

# vLLM

vLLM 可以通过 **OpenAI 兼容** 的 HTTP API 提供开源（以及某些自定义）模型。OpenClaw 使用 `openai-completions` API 连接到 vLLM。

当您选择加入 `VLLM_API_KEY`（如果您的服务器不强制执行身份验证，任何值都可以）并且未定义显式的 `models.providers.vllm` 条目时，OpenClaw 也可以从 vLLM **自动发现** 可用模型。

| 属性         | 值                                 |
| ------------ | ---------------------------------- |
| 提供商 ID    | `vllm`                             |
| API          | `openai-completions` (OpenAI 兼容) |
| 身份验证     | `VLLM_API_KEY` 环境变量            |
| 默认基础 URL | `http://127.0.0.1:8000/v1`         |

## 入门指南

<Steps>
  <Step title="使用 OpenAI 兼容的服务器启动 vLLM">
    您的基础 URL 应公开 `/v1` 端点（例如 `/v1/models`、`/v1/chat/completions`）。vLLM 通常运行于：

    ```
    http://127.0.0.1:8000/v1
    ```

  </Step>
  <Step title="设置 API 密钥环境变量">
    如果您的服务器不强制执行身份验证，任何值均可：

    ```bash
    export VLLM_API_KEY="vllm-local"
    ```

  </Step>
  <Step title="选择模型">
    替换为您的 vLLM 模型 ID 之一：

    ```json5
    {
      agents: {
        defaults: {
          model: { primary: "vllm/your-model-id" },
        },
      },
    }
    ```

  </Step>
  <Step title="验证模型是否可用">
    ```bash
    openclaw models list --provider vllm
    ```
  </Step>
</Steps>

## 模型发现（隐式提供商）

当设置了 `VLLM_API_KEY`（或存在身份验证配置文件）并且您 **不** 定义 `models.providers.vllm` 时，OpenClaw 将查询：

```
GET http://127.0.0.1:8000/v1/models
```

并将返回的 ID 转换为模型条目。

<Note>如果您显式设置了 `models.providers.vllm`，将跳过自动发现，并且您必须手动定义模型。</Note>

## 显式配置（手动模型）

在以下情况下使用显式配置：

- vLLM 运行在不同的主机或端口上
- 您想要固定 `contextWindow` 或 `maxTokens` 的值
- 您的服务器需要真实的 API 密钥（或者您想要控制请求头）

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

## 高级说明

<AccordionGroup>
  <Accordion title="代理样式行为">
    vLLM 被视为代理样式的 OpenAI 兼容 `/v1` 后端，而非原生
    OpenAI 端点。这意味着：

    | 行为 | 是否应用？ |
    |----------|----------|
    | 原生 OpenAI 请求塑形 | 否 |
    | `service_tier` | 不发送 |
    | 响应 `store` | 不发送 |
    | 提示词缓存提示 | 不发送 |
    | OpenAI 推理兼容载荷塑形 | 不应用 |
    | 隐藏的 OpenClaw 归属请求头 | 不在自定义基础 URL 上注入 |

  </Accordion>

  <Accordion title="自定义基础 URL">
    如果您的 vLLM 服务器运行在非默认主机或端口上，请在显式提供商配置中设置 `baseUrl`：

    ```json5
    {
      models: {
        providers: {
          vllm: {
            baseUrl: "http://192.168.1.50:9000/v1",
            apiKey: "${VLLM_API_KEY}",
            api: "openai-completions",
            models: [
              {
                id: "my-custom-model",
                name: "Remote vLLM Model",
                reasoning: false,
                input: ["text"],
                contextWindow: 64000,
                maxTokens: 4096,
              },
            ],
          },
        },
      },
    }
    ```

  </Accordion>
</AccordionGroup>

## 故障排除

<AccordionGroup>
  <Accordion title="无法访问服务器">
    检查 vLLM 服务器是否正在运行且可访问：

    ```bash
    curl http://127.0.0.1:8000/v1/models
    ```

    如果您看到连接错误，请验证主机、端口，以及 vLLM 是否以 OpenAI 兼容服务器模式启动。

  </Accordion>

  <Accordion title="请求上的身份验证错误">
    如果请求因身份验证错误而失败，请设置与您的服务器配置匹配的真实 `VLLM_API_KEY`，或者在 `models.providers.vllm` 下显式配置提供商。

    <Tip>
    如果您的 vLLM 服务器不强制执行身份验证，`VLLM_API_KEY` 的任何非空值都可作为 OpenClaw 的选择加入信号。
    </Tip>

  </Accordion>

  <Accordion title="未发现模型">
    自动发现需要设置 `VLLM_API_KEY` 并且没有显式的 `models.providers.vllm` 配置条目。如果您已手动定义提供商，OpenClaw 将跳过发现并仅使用您声明的模型。
  </Accordion>
</AccordionGroup>

<Warning>更多帮助：[故障排除](/zh/help/troubleshooting) 和 [常见问题](/zh/help/faq)。</Warning>

## 相关

<CardGroup cols={2}>
  <Card title="模型选择" href="/zh/concepts/model-providers" icon="layers">
    选择提供商、模型引用和故障转移行为。
  </Card>
  <Card title="OpenAI" href="/zh/providers/openai" icon="bolt">
    原生 OpenAI 提供商和 OpenAI 兼容的路由行为。
  </Card>
  <Card title="OAuth 和身份验证" href="/zh/gateway/authentication" icon="key">
    身份验证详情和凭据重用规则。
  </Card>
  <Card title="故障排除" href="/zh/help/troubleshooting" icon="wrench">
    常见问题及其解决方法。
  </Card>
</CardGroup>
