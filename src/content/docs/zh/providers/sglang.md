---
summary: "使用 SGLang 运行 OpenClaw（OpenAI 兼容的自托管服务器）"
read_when:
  - You want to run OpenClaw against a local SGLang server
  - You want OpenAI-compatible /v1 endpoints with your own models
title: "SGLang"
---

# SGLang

SGLang 可以通过 **OpenAI 兼容**的 HTTP API 为开源模型提供服务。
OpenClaw 可以使用 `openai-completions` API 连接到 SGLang。

当您通过 `SGLANG_API_KEY` 选择加入时（如果您的服务器不强制执行身份验证，则任何值均可），
并且您没有定义显式的 `models.providers.sglang` 条目，OpenClaw 还可以 **自动发现** SGLang 中可用的模型。

## 入门指南

<Steps>
  <Step title="启动 SGLang">
    使用 OpenAI 兼容服务器启动 SGLang。您的基础 URL 应暴露
    `/v1` 端点（例如 `/v1/models`，`/v1/chat/completions`）。SGLang
    通常运行于：

    - `http://127.0.0.1:30000/v1`

  </Step>
  <Step title="设置 API 密钥">
    如果您的服务器未配置身份验证，则任何值均可：

    ```bash
    export SGLANG_API_KEY="sglang-local"
    ```

  </Step>
  <Step title="运行新手引导或直接设置模型">
    ```bash
    openclaw onboard
    ```

    或者手动配置模型：

    ```json5
    {
      agents: {
        defaults: {
          model: { primary: "sglang/your-model-id" },
        },
      },
    }
    ```

  </Step>
</Steps>

## 模型发现（隐式提供商）

当设置了 `SGLANG_API_KEY`（或存在身份验证配置文件）并且您 **没有**
定义 `models.providers.sglang` 时，OpenClaw 将查询：

- `GET http://127.0.0.1:30000/v1/models`

并将返回的 ID 转换为模型条目。

<Note>如果您显式设置了 `models.providers.sglang`，则会跳过自动发现，并且 您必须手动定义模型。</Note>

## 显式配置（手动模型）

在以下情况下使用显式配置：

- SGLang 运行在不同的主机/端口上。
- 您想要固定 `contextWindow`/`maxTokens` 值。
- 您的服务器需要真实的 API 密钥（或者您想要控制标头）。

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

## 高级配置

<AccordionGroup>
  <Accordion title="代理风格的行为">
    SGLang 被视为一种代理风格的 OpenAI 兼容 `/v1` 后端，而不是
    原生的 OpenAI 端点。

    | 行为 | SGLang |
    |----------|--------|
    | 仅限 OpenAI 的请求塑形 | 未应用 |
    | `service_tier`、响应 `store`、提示缓存提示 | 未发送 |
    | 推理兼容负载塑形 | 未应用 |
    | 隐藏的归因标头 (`originator`、`version`、`User-Agent`) | 未在自定义 SGLang 基础 URL 上注入 |

  </Accordion>

  <Accordion title="故障排除">
    **服务器不可达**

    验证服务器是否正在运行并响应：

    ```bash
    curl http://127.0.0.1:30000/v1/models
    ```

    **身份验证错误**

    如果请求因身份验证错误而失败，请设置一个与您的服务器配置匹配的真实 `SGLANG_API_KEY`，或者在 `models.providers.sglang` 下显式配置提供商。

    <Tip>
    如果您运行 SGLang 时未启用身份验证，任何非空的 `SGLANG_API_KEY` 值都足以选择加入模型发现。
    </Tip>

  </Accordion>
</AccordionGroup>

## 相关

<CardGroup cols={2}>
  <Card title="模型选择" href="/zh/concepts/model-providers" icon="layers">
    选择提供商、模型引用和故障转移行为。
  </Card>
  <Card title="配置参考" href="/zh/gateway/configuration-reference" icon="gear">
    包括提供商条目的完整配置架构。
  </Card>
</CardGroup>
