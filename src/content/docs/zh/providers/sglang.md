---
summary: "使用 SGLang 运行 OpenClaw（OpenAI 兼容的自托管服务器）"
read_when:
  - You want to run OpenClaw against a local SGLang server
  - You want OpenAI-compatible /v1 endpoints with your own models
title: "SGLang"
---

SGLang 通过兼容 OpenAI 的 HTTP API 提供开源权重模型。OpenClaw 使用 OpenAIAPIOpenClaw`openai-completions` 提供商系列连接到 SGLang，并可自动发现可用模型。

| 属性           | 值                                                      |
| -------------- | ------------------------------------------------------- |
| 提供商 ID      | `sglang`                                                |
| 插件           | 内置，`enabledByDefault: true`                          |
| 认证环境变量   | `SGLANG_API_KEY` （如果服务器没有认证，则为任何非空值） |
| 新手引导标志   | `--auth-choice sglang`                                  |
| API            | 兼容 OpenAI (OpenAI`openai-completions`)                |
| 默认基础 URL   | `http://127.0.0.1:30000/v1`                             |
| 默认模型占位符 | `sglang/Qwen/Qwen3-8B`                                  |
| 流式使用       | 是 (`supportsStreamingUsage: true`)                     |
| 定价           | 标记为无外部费用 (`modelPricing.external: false`)       |

当您使用 OpenClaw`SGLANG_API_KEY` 选择加入且未定义显式的 `models.providers.sglang` 条目时，OpenClaw 还会从 SGLang **自动发现**可用模型 — 请参阅下方的 [模型发现（隐式提供商）](#model-discovery-implicit-provider)。

## 入门指南

<Steps>
  <Step title="启动 SGLang"OpenAI>
    启动兼容 OpenAI 的 SGLang 服务器。您的基础 URL 应暴露
    `/v1` 端点（例如 `/v1/models`、`/v1/chat/completions`）。SGLang
    通常运行在：

    - `http://127.0.0.1:30000/v1`

  </Step>
  <Step title="API设置 API 密钥">
    如果服务器未配置认证，任何值均可：

    ```bash
    export SGLANG_API_KEY="sglang-local"
    ```

  </Step>
  <Step title="运行新手引导或直接设置模型">
    ```bash
    openclaw onboard
    ```

    或手动配置模型：

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

当设置了 `SGLANG_API_KEY`（或存在认证配置文件）且您**未**
定义 `models.providers.sglang`OpenClaw 时，OpenClaw 将查询：

- `GET http://127.0.0.1:30000/v1/models`

并将返回的 ID 转换为模型条目。

<Note>如果您显式设置了 `models.providers.sglang`，将跳过自动发现， 并且您必须手动定义模型。</Note>

## 显式配置（手动模型）

在以下情况下使用显式配置：

- SGLang 运行在不同的主机/端口上。
- 您想要固定 `contextWindow`/`maxTokens` 的值。
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
  <Accordion title="代理风格行为">
    SGLang 被视为代理风格的 OpenAI 兼容 `/v1` 后端，而非
    原生 OpenAI 端点。

    | 行为 | SGLang |
    |----------|--------|
    | 仅限 OpenAI 的请求整形 | 不适用 |
    | `service_tier`、响应 `store`、提示词缓存提示 | 不发送 |
    | 推理兼容负载整形 | 不适用 |
    | 隐藏的归因标头（`originator`、`version`、`User-Agent`） | 不在自定义 SGLang 基础 URL 上注入 |

  </Accordion>

  <Accordion title="故障排除">
    **服务器无法访问**

    验证服务器是否正在运行并响应：

    ```bash
    curl http://127.0.0.1:30000/v1/models
    ```

    **认证错误**

    如果请求因认证错误而失败，请设置一个与
    您的服务器配置相匹配的真实 `SGLANG_API_KEY`，或在
    `models.providers.sglang` 下显式配置提供商。

    <Tip>
    如果您运行没有认证的 SGLang，
    `SGLANG_API_KEY` 的任何非空值都足以选择加入模型发现。
    </Tip>

  </Accordion>
</AccordionGroup>

## 相关

<CardGroup cols={2}>
  <Card title="模型选择" href="/zh/concepts/model-providers" icon="layers">
    选择提供商、模型引用和故障转移行为。
  </Card>
  <Card title="配置参考" href="/zh/gateway/configuration-reference" icon="gear">
    包含提供商条目的完整配置架构。
  </Card>
</CardGroup>
