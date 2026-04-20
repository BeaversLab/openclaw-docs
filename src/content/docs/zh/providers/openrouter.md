---
summary: "使用 OpenRouter 的统一 API 在 OpenClaw 中访问许多模型"
read_when:
  - You want a single API key for many LLMs
  - You want to run models via OpenRouter in OpenClaw
title: "OpenRouter"
---

# OpenRouter

OpenRouter 提供了一个**统一 API**，它通过单个端点和 API 密钥将请求路由到许多模型。它与 OpenAI 兼容，因此大多数 OpenAI SDK 只需切换基础 URL 即可工作。

## 入门指南

<Steps>
  <Step title="获取你的 API 密钥">
    在 [openrouter.ai/keys](https://openrouter.ai/keys) 创建一个 API 密钥。
  </Step>
  <Step title="运行新手引导">
    ```bash
    openclaw onboard --auth-choice openrouter-api-key
    ```
  </Step>
  <Step title="（可选）切换到特定模型">
    新手引导默认为 `openrouter/auto`。稍后选择一个具体的模型：

    ```bash
    openclaw models set openrouter/<provider>/<model>
    ```

  </Step>
</Steps>

## 配置示例

```json5
{
  env: { OPENROUTER_API_KEY: "sk-or-..." },
  agents: {
    defaults: {
      model: { primary: "openrouter/auto" },
    },
  },
}
```

## 模型参考

<Note>
模型引用遵循模式 `openrouter/<provider>/<model>`。有关可用提供商和模型的完整列表，请参阅 [/concepts/模型-providers](/en/concepts/model-providers)。
</Note>

## 身份验证和请求头

OpenRouter 在底层使用带有你的 API 密钥的 Bearer 令牌。

在真实的 OpenRouter 请求（`https://openrouter.ai/api/v1`）上，OpenClaw 还会添加
OpenRouter 文档中记录的应用归因请求头：

| 请求头                    | 值                    |
| ------------------------- | --------------------- |
| `HTTP-Referer`            | `https://openclaw.ai` |
| `X-OpenRouter-Title`      | `OpenClaw`            |
| `X-OpenRouter-Categories` | `cli-agent`           |

<Warning>如果你将 OpenRouter 提供商重新指向其他代理或基础 URL，OpenClaw 将**不会**注入那些特定的 OpenRouter 请求头或 Anthropic 缓存标记。</Warning>

## 高级说明

<AccordionGroup>
  <Accordion title="Anthropic 缓存标记">
    在已验证的 OpenRouter 路由上，Anthropic 模型引用会保留
    OpenRouter 特有的 Anthropic `cache_control` 标记，OpenClaw 使用这些标记
    以便更好地在系统/开发者提示块上重用提示缓存。
  </Accordion>

<Accordion title="Thinking / reasoning injection">在支持的非 `auto` 路由上，OpenClaw 将选定的思考级别映射到 OpenRouter 代理推理负载。不支持的模型提示和 `openrouter/auto` 将跳过该推理注入。</Accordion>

<Accordion title="OpenAI-only request shaping">OpenRouter 仍然通过代理风格的 OpenAI 兼容路径运行，因此 原生 OpenAI 专用的请求塑形（如 `serviceTier`、Responses `store`、 OpenAI 推理兼容负载以及提示缓存提示）不会被转发。</Accordion>

<Accordion title="Gemini-backed routes">由 Gemini 提供支持的 OpenRouter 引用停留在代理 Gemini 路径上：OpenClaw 在那里保留 Gemini 思考签名清理，但不启用原生 Gemini 重放验证或引导重写。</Accordion>

  <Accordion title="Provider routing metadata">
    如果您在模型参数下传递 OpenRouter 提供商路由，OpenClaw 会将其
    作为 OpenRouter 路由元数据转发，然后再运行共享流包装器。
  </Accordion>
</AccordionGroup>

## 相关

<CardGroup cols={2}>
  <Card title="Model selection" href="/en/concepts/model-providers" icon="layers">
    选择提供商、模型引用和故障转移行为。
  </Card>
  <Card title="Configuration reference" href="/en/gateway/configuration-reference" icon="gear">
    代理、模型和提供商的完整配置参考。
  </Card>
</CardGroup>
