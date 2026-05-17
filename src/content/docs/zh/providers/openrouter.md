---
summary: "OpenRouterAPIOpenClaw使用 OpenRouter 的统一 API 在 OpenClaw 中访问多个模型"
read_when:
  - You want a single API key for many LLMs
  - You want to run models via OpenRouter in OpenClaw
  - You want to use OpenRouter for image generation
  - You want to use OpenRouter for video generation
title: "OpenRouterOpenRouter"
---

OpenRouter 提供了一个**统一 API**，它将请求路由到单个端点和 API 密钥下的许多模型。它与 OpenAI 兼容，因此大多数 OpenAI SDK 只需切换基础 URL 即可工作。

## 入门指南

<Steps>
  <Step title="获取您的 API 密钥">
    在 [openrouter.ai/keys](https://openrouter.ai/keys) 创建一个 API 密钥。
  </Step>
  <Step title="运行新手引导">
    ```bash
    openclaw onboard --auth-choice openrouter-api-key
    ```
  </Step>
  <Step title="（可选）切换到特定模型">
    新手引导默认使用 `openrouter/auto`。稍后选择一个具体的模型：

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

| 模型引用                          | 说明                           |
| --------------------------------- | ------------------------------ |
| `openrouter/auto`                 | OpenRouter 自动路由            |
| `openrouter/moonshotai/kimi-k2.6` | 通过 MoonshotAI 的 Kimi K2.6   |
| `openrouter/moonshotai/kimi-k2.5` | 通过 MoonshotAI 使用 Kimi K2.5 |

## 图像生成

OpenRouter 也可以支持 OpenRouter`image_generate`OpenRouter 工具。在 `agents.defaults.imageGenerationModel` 下使用 OpenRouter 图像模型：

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

OpenClaw 将图像请求发送到 OpenRouter 的聊天补全图像 API，并附带 `modalities: ["image", "text"]`。Gemini 图像模型通过 OpenRouter 的 `image_config` 接收受支持的 `aspectRatio` 和 `resolution` 提示。对于较慢的 OpenRouter 图像模型，请使用 `agents.defaults.imageGenerationModel.timeoutMs`；`image_generate` 工具的每次调用 `timeoutMs` 参数仍然优先。

## 视频生成

OpenRouter 也可以通过其异步 `/videos` API 支持 `video_generate` 工具。在 `agents.defaults.videoGenerationModel` 下使用 OpenRouter 视频模型：

```json5
{
  env: { OPENROUTER_API_KEY: "sk-or-..." },
  agents: {
    defaults: {
      videoGenerationModel: {
        primary: "openrouter/google/veo-3.1-fast",
      },
    },
  },
}
```

OpenClaw 向 OpenRouter 提交文本生成视频和图像生成视频的任务，轮询返回的 OpenClawOpenRouter`polling_url`OpenRouter，并从 OpenRouter 的 `unsigned_urls` 或文档记录的任务内容端点下载已完成的视频。参考图像默认作为第一帧/最后一帧图像发送；带有 `reference_image`OpenRouter 标签的图像作为 OpenRouter 输入参考发送。捆绑的 `google/veo-3.1-fast` 默认设置支持目前支持的 4/6/8 秒时长、`720P`/`1080P` 分辨率以及 `16:9`/`9:16`OpenRouter 纵横比。视频生成视频未为 OpenRouter 注册，因为上游视频生成 API 目前仅接受文本和图像参考。

## 文本转语音

OpenRouter 也可以通过其兼容 OpenAI 的
`/audio/speech` 端点用作 TTS 提供商。

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

如果省略 `messages.tts.providers.openrouter.apiKey`，TTS 将重用
`models.providers.openrouter.apiKey`，然后是 `OPENROUTER_API_KEY`。

## 语音转文本（入站音频）

OpenRouter 可以通过共享的 `tools.media.audio` 路径，使用其 STT 端点（`/audio/transcriptions`）转录传入的语音/音频附件。这适用于任何将传入的语音/音频转发到媒体理解预检的渠道插件。

```json5
{
  tools: {
    media: {
      audio: {
        enabled: true,
        models: [{ provider: "openrouter", model: "openai/whisper-large-v3-turbo" }],
      },
    },
  },
}
```

OpenClaw 将 OpenRouter STT 请求作为 JSON 发送，其中包含 `input_audio` 下的 base64 音频（OpenRouter STT 协定），而不是作为多部分的 OpenAI 表单上传。

## 认证和标头

OpenRouter 在底层使用带有您的 API 密钥的 Bearer 令牌。

在实际的 OpenRouter 请求 (`https://openrouter.ai/api/v1`) 中，OpenClaw 也会添加
OpenRouter 文档中记录的应用归因标头：

| Header                    | Value                                                                                                  |
| ------------------------- | ------------------------------------------------------------------------------------------------------ |
| `HTTP-Referer`            | `https://openclaw.ai`                                                                                  |
| `X-OpenRouter-Title`      | `OpenClaw`                                                                                             |
| `X-OpenRouter-Categories` | `cli-agent,cloud-agent,programming-app,creative-writing,writing-assistant,general-chat,personal-agent` |

<Warning>如果您将 OpenRouter 提供商重新指向其他代理或基础 URL，OpenClaw 将**不会**注入那些 OpenRouter 特定的标头或 Anthropic 缓存标记。</Warning>

## 高级配置

<AccordionGroup>
  <Accordion title="Response caching">
    OpenRouter 响应缓存是可选的。可以通过OpenRouter 模型参数在每个模型上启用它：

    ```json5
    {
      agents: {
        defaults: {
          models: {
            "openrouter/auto": {
              params: {
                responseCache: true,
                responseCacheTtlSeconds: 300,
              },
            },
          },
        },
      },
    }
    ```

    OpenClaw 会发送 `X-OpenRouter-Cache: true` 并且在配置后发送 `X-OpenRouter-Cache-TTL`。`responseCacheClear: true` 会强制刷新当前请求并存储替换后的响应。Snake_case 别名（`response_cache`、`response_cache_ttl_seconds` 和 `response_cache_clear`）也是可接受的。

    这与提供商提示缓存以及 OpenRouter 的 Anthropic `cache_control` 标记是分开的。它仅应用于已验证的 `openrouter.ai` 路由，不应用于自定义代理基础 URL。

  </Accordion>

<Accordion title="AnthropicAnthropic 缓存标记">在经过验证的 OpenRouter 路由上，Anthropic 模型引用会保留 OpenRouterAnthropic 特有的 Anthropic `cache_control` 标记，OpenClaw 使用这些标记来 更好地在系统/开发者提示块上重用提示缓存。</Accordion>

<Accordion title="AnthropicAnthropic reasoning prefill" OpenRouterAnthropicOpenRouterAnthropic>
  在已验证的 OpenRouter 路由上，启用了推理功能的 Anthropic 模型引用会在请求到达 OpenRouter 之前丢弃末尾的助手预填充轮次，以符合 Anthropic 关于推理对话必须以用户轮次结束的要求。
</Accordion>

<Accordion title="Thinking / reasoning injection">在受支持的非 `auto`OpenClawOpenRouter 路由上，OpenClaw 会将选定的思考级别映射到 OpenRouter 代理推理负载。不支持的模型提示和 `openrouter/auto`OpenRouter 将跳过该推理注入。Hunter Alpha 也会为过时的配置模型引用跳过 代理推理，因为对于该已停用的路由，OpenRouter 可能 会在推理字段中返回最终答案文本。</Accordion>

<Accordion title="DeepSeek V4 推理重放">在已验证的 OpenRouter 路由上，`openrouter/deepseek/deepseek-v4-flash` 和 `openrouter/deepseek/deepseek-v4-pro` 会填充重放助手轮次中缺失的 `reasoning_content`，从而使思考/工具 对话保持 DeepSeek V4 所需的后续形状。OpenClaw 会为这些路由发送 OpenRouter 支持的 `reasoning_effort` 值；`xhigh` 是最高 广告级别，而陈旧的 `max` 覆盖将被映射到 `xhigh`。</Accordion>

<Accordion title="OpenAIOpenAI-only request shaping" OpenRouterOpenAIOpenAI>
  OpenRouter 仍然运行通过代理风格的 OpenAI 兼容路径，因此 原生 OpenAI-only 请求塑造（如 `serviceTier`、Responses `store`OpenAI、 OpenAI reasoning-compat 载荷和 prompt-cache 提示）不会被转发。
</Accordion>

<Accordion title="Gemini-backed routes">由 Gemini 支持的 OpenRouter 引用保留在 proxy-Gemini 路径上：OpenClaw 在那里保留 Gemini 的思维签名清理，但不启用原生 Gemini 的重放验证或引导重写。</Accordion>

  <Accordion title="Provider routing metadata">
    如果您在模型参数下传递 OpenRouter 提供商路由，OpenClaw 会在共享流包装器运行之前将其作为 OpenRouter 路由元数据进行转发。
  </Accordion>
</AccordionGroup>

## 相关

<CardGroup cols={2}>
  <Card title="模型选择" href="/zh/concepts/model-providers" icon="layers">
    选择提供商、模型引用和故障转移行为。
  </Card>
  <Card title="Configuration reference" href="/zh/gateway/configuration-reference" icon="gear">
    代理、模型和提供商的完整配置参考。
  </Card>
</CardGroup>
