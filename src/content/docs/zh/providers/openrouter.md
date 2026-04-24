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
    在 [openrouter.ai/keys](https://openrouter.ai/keys) 创建 API 密钥。
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
模型引用遵循 `openrouter/<provider>/<model>` 模式。有关可用提供商和模型的完整列表，请参阅 [/concepts/模型-providers](/zh/concepts/model-providers)。
</Note>

打包的回退示例：

| 模型引用                             | 说明                           |
| ------------------------------------ | ------------------------------ |
| `openrouter/auto`                    | OpenRouter 自动路由            |
| `openrouter/moonshotai/kimi-k2.6`    | 通过 MoonshotAI 访问 Kimi K2.6 |
| `openrouter/openrouter/healer-alpha` | OpenRouter Healer Alpha 路由   |
| `openrouter/openrouter/hunter-alpha` | OpenRouter Hunter Alpha 路由   |

## 身份验证和标头

OpenRouter 在底层使用带有你的 API 密钥的 Bearer 令牌。

在真实的 OpenRouter 请求 (`https://openrouter.ai/api/v1`) 上，OpenClaw 还会添加
OpenRouter 文档中记录的应用归因标头：

| 标头                      | 值                    |
| ------------------------- | --------------------- |
| `HTTP-Referer`            | `https://openclaw.ai` |
| `X-OpenRouter-Title`      | `OpenClaw`            |
| `X-OpenRouter-Categories` | `cli-agent`           |

<Warning>如果您将 OpenRouter 提供商重新指向其他代理或基础 URL，OpenClaw 将**不会**注入那些 OpenRouter 专用的标头或 Anthropic 缓存标记。</Warning>

## 高级说明

<AccordionGroup>
  <Accordion title="Anthropic 缓存标记">
    在经过验证的 OpenRouter 路由上，Anthropic 模型引用会保留
    OpenRouter 专用的 Anthropic `cache_control` 标记，OpenClaw 使用这些标记是为了
    更好地在系统/开发者提示块上重用提示缓存。
  </Accordion>

<Accordion title="思考 / 推理注入">在支持的非 `auto` 路由上，OpenClaw 将所选的思考级别映射到 OpenRouter 代理推理负载。不支持的模型提示和 `openrouter/auto` 会跳过该推理注入。</Accordion>

<Accordion title="OpenAI 专用请求塑形">OpenRouter 仍通过代理风格的 OpenAI 兼容路径运行，因此 原生 OpenAI 专用的请求塑形（例如 `serviceTier`、Responses `store`、 OpenAI 推理兼容负载和提示缓存提示）不会被转发。</Accordion>

<Accordion title="Gemini-supported routes">OpenRouter 上 Gemini 支持的 refs 保持在 proxy-Gemini 路径上：OpenClaw 在那里保持 Gemini thought-signature 清理，但不启用原生 Gemini 重放验证或 bootstrap 重写。</Accordion>

  <Accordion title="Provider routing metadata">
    如果您在模型参数下传递 OpenRouter 提供商 路由，OpenClaw 会在共享流包装器运行之前将其作为 OpenRouter 路由元数据转发。
  </Accordion>
</AccordionGroup>

## 相关

<CardGroup cols={2}>
  <Card title="Model selection" href="/zh/concepts/model-providers" icon="layers">
    选择 providers、模型 refs 和故障转移行为。
  </Card>
  <Card title="配置参考" href="/zh/gateway/configuration-reference" icon="gear">
    代理、模型和提供商的完整配置参考。
  </Card>
</CardGroup>
