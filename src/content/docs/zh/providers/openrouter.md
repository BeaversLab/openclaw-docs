---
summary: "使用 OpenRouter 的统一 API 在 OpenClaw 中访问多个模型"
read_when:
  - You want a single API key for many LLMs
  - You want to run models via OpenRouter in OpenClaw
  - You want to use OpenRouter for image generation
title: "OpenRouter"
---

OpenRouter 提供了一个**统一 API**，它将请求路由到单个端点和 API 密钥下的许多模型。它与 OpenAI 兼容，因此大多数 OpenAI SDK 只需切换基础 URL 即可工作。

## 入门指南

<Steps>
  <Step title="获取您的 API 密钥">
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

## 模型引用

<Note>
模型引用遵循 `openrouter/<provider>/<model>` 模式。有关可用提供商和模型的完整列表，请参阅 [/concepts/模型-providers](/zh/concepts/model-providers)。
</Note>

捆绑的回退示例：

| 模型引用                          | 说明                         |
| --------------------------------- | ---------------------------- |
| `openrouter/auto`                 | OpenRouter 自动路由          |
| `openrouter/moonshotai/kimi-k2.6` | 通过 MoonshotAI 的 Kimi K2.6 |

## 图像生成

OpenRouter 也可以支持 `image_generate` 工具。在 `agents.defaults.imageGenerationModel` 下使用 OpenRouter 图像模型：

```json5
{
  env: { OPENROUTER_API_KEY: "sk-or-..." },
  agents: {
    defaults: {
      imageGenerationModel: {
        primary: "openrouter/google/gemini-3.1-flash-image-preview",
        timeoutMs: 180_000,
      },
    },
  },
}
```

OpenClaw 使用 `modalities: ["image", "text"]` 将图像请求发送到 OpenRouter 的聊天补全图像 API。Gemini 图像模型通过 OpenRouter 的 `image_config` 接收支持的 `aspectRatio` 和 `resolution` 提示。对于较慢的 OpenRouter 图像模型，请使用 `agents.defaults.imageGenerationModel.timeoutMs`；`image_generate` 工具的每次调用 `timeoutMs` 参数仍然优先。

## 文本转语音

OpenRouter 也可以通过其与 OpenAI 兼容的 `/audio/speech` 端点用作 TTS 提供商。

```json5
{
  messages: {
    tts: {
      auto: "always",
      provider: "openrouter",
      providers: {
        openrouter: {
          model: "hexgrad/kokoro-82m",
          voice: "af_alloy",
          responseFormat: "mp3",
        },
      },
    },
  },
}
```

如果省略 `messages.tts.providers.openrouter.apiKey`，TTS 将重用 `models.providers.openrouter.apiKey`，然后是 `OPENROUTER_API_KEY`。

## 身份验证和标头

OpenRouter 在底层使用带有您的 API 密钥的 Bearer 令牌。

在真正的 OpenRouter 请求 (`https://openrouter.ai/api/v1`) 中，OpenClaw 还会添加
OpenRouter 文档中记录的应用归属标头：

| 标头                      | 值                    |
| ------------------------- | --------------------- |
| `HTTP-Referer`            | `https://openclaw.ai` |
| `X-OpenRouter-Title`      | `OpenClaw`            |
| `X-OpenRouter-Categories` | `cli-agent`           |

<Warning>如果您将 OpenRouter 提供商重新指向其他代理或基本 URL，OpenClaw 将**不会**注入那些特定于 OpenRouter 的标头或 Anthropic 缓存标记。</Warning>

## 高级配置

<AccordionGroup>
  <Accordion title="Anthropic 缓存标记">
    在经过验证的 OpenRouter 路由上，Anthropic 模型引用会保留
    OpenClaw 用于更好地在系统/开发者提示块上重用提示缓存的特定于 OpenRouter 的 Anthropic `cache_control` 标记。
  </Accordion>

<Accordion title="思维 / 推理注入">在受支持的非 `auto` 路由上，OpenClaw 会将选定的思维级别映射到 OpenRouter 代理推理负载。不支持的模型提示和 `openrouter/auto` 将跳过该推理注入。Hunter Alpha 还会跳过 针对过时配置模型引用的代理推理，因为对于该已停用的路由，OpenRouter 可能 会在推理字段中返回最终答案文本。</Accordion>

<Accordion title="仅 OpenAI 请求整形">OpenRouter 仍通过代理风格的 OpenAI 兼容路径运行，因此 原生的仅 OpenAI 请求整形（如 `serviceTier`、Responses `store`、 OpenAI 推理兼容负载和提示缓存提示）不会被转发。</Accordion>

<Accordion title="Gemini 支持的路由">由 Gemini 支持的 OpenRouter 引用保留在代理-Gemini 路径上：OpenClaw 在那里 保留 Gemini 思维签名清理，但不启用原生 Gemini 重放验证或引导重写。</Accordion>

  <Accordion title="Provider routing metadata">
    如果您在模型参数下传递 OpenRouter 提供商路由，OpenClaw 会在共享流包装器运行之前将其作为 OpenRouter 路由元数据进行转发。
  </Accordion>
</AccordionGroup>

## 相关

<CardGroup cols={2}>
  <Card title="Model selection" href="/zh/concepts/model-providers" icon="layers">
    选择提供商、模型引用和故障转移行为。
  </Card>
  <Card title="Configuration reference" href="/zh/gateway/configuration-reference" icon="gear">
    代理、模型和提供商的完整配置参考。
  </Card>
</CardGroup>
