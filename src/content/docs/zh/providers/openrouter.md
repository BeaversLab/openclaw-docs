---
summary: "OpenRouterAPIOpenClaw使用 OpenRouter 的统一 API 在 OpenClaw 中访问多个模型"
read_when:
  - You want a single API key for many LLMs
  - You want to run models via OpenRouter in OpenClaw
  - You want to use OpenRouter for image generation
  - You want to use OpenRouter for music generation
  - You want to use OpenRouter for video generation
title: "OpenRouterOpenRouter"
---

OpenRouter 提供了一个**统一 API**，它将请求路由到单个端点和 API 密钥下的许多模型。它与 OpenAI 兼容，因此大多数 OpenAI SDK 只需切换基础 URL 即可工作。

## 入门指南

<Steps>
  <Step title="API获取您的 API 密钥"API>
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
模型引用遵循模式 `openrouter/<provider>/<model>`。有关可用提供商和模型的完整列表，请参阅 [/concepts/模型-providers](/zh/concepts/model-providers)。
</Note>

捆绑的回退示例：

| 模型引用                          | 说明                           |
| --------------------------------- | ------------------------------ |
| `openrouter/auto`                 | OpenRouter 自动路由            |
| `openrouter/moonshotai/kimi-k2.6` | 通过 MoonshotAI 的 Kimi K2.6   |
| `openrouter/moonshotai/kimi-k2.5` | 通过 MoonshotAI 使用 Kimi K2.5 |

## 图像生成

OpenRouter 还可以支持 OpenRouter`image_generate`OpenRouter 工具。在 `agents.defaults.imageGenerationModel` 下使用 OpenRouter 图像模型：

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

OpenClaw 使用 OpenClawOpenRouterAPI`modalities: ["image", "text"]` 将图像请求发送到 OpenRouter 的聊天补全图像 API。Gemini 图像模型通过 OpenRouter 的 `image_config` 接收支持的 `aspectRatio` 和 `resolution`OpenRouter 提示。对于较慢的 OpenRouter 图像模型，请使用 `agents.defaults.imageGenerationModel.timeoutMs`OpenRouter；`image_generate` 工具的每次调用 `timeoutMs` 参数仍然优先。

## 视频生成

OpenRouter 还可以通过其异步 `/videos`OpenRouterAPI API 支持 OpenRouter`video_generate` 工具。在 `agents.defaults.videoGenerationModel` 下使用 OpenRouter 视频模型：

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

OpenClaw 向 OpenRouter 提交文本生成视频和图像生成视频的任务，轮询返回的 OpenClawOpenRouter`polling_url`OpenRouter，并从 OpenRouter 的 `unsigned_urls` 或记录的任务内容端点下载已完成的视频。参考图像默认作为首帧/末帧图像发送；带有 `reference_image`OpenRouter 标签的图像作为 OpenRouter 输入参考发送。捆绑的 `google/veo-3.1-fast` 默认设置支持当前支持的 4/6/8 秒时长、`720P`/`1080P` 分辨率以及 `16:9`/`9:16`OpenRouterAPI 纵横比。OpenRouter 未注册视频生成视频功能，因为上游视频生成 API 目前仅接受文本和图像参考。

## 音乐生成

OpenRouter 还可以通过聊天完成音频输出支持 OpenRouter`music_generate`OpenRouter 工具。在 `agents.defaults.musicGenerationModel` 下使用 OpenRouter 音频模型：

```json5
{
  env: { OPENROUTER_API_KEY: "sk-or-..." },
  agents: {
    defaults: {
      musicGenerationModel: {
        primary: "openrouter/google/lyria-3-pro-preview",
        timeoutMs: 180_000,
      },
    },
  },
}
```

捆绑的 OpenRouter 音乐提供商默认为 OpenRouter`google/lyria-3-pro-preview`，同时也公开 `google/lyria-3-clip-preview`OpenClaw。OpenClaw 发送 `modalities: ["text",
"audio"]`，启用流式传输，收集流式音频块，并将结果保存为生成的媒体以供渠道传输。通过共享的 `music_generate image=...` 参数，Lyria 模型接受参考图像。

## 文本转语音

OpenRouter 也可以通过其与 OpenAI 兼容的 OpenRouterOpenAI`/audio/speech` 端点用作 TTS 提供商。

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

## 语音转文本（入站音频）

OpenRouter 可以使用其 STT 端点 (`/audio/transcriptions`)，通过共享的 OpenRouter`tools.media.audio` 路径转录入站语音/音频附件。这适用于任何将入站语音/音频转发到媒体理解预检的渠道插件。

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

OpenClaw 将 OpenRouter STT 请求作为 JSON 发送，其中音频以 base64 格式位于
OpenClawOpenRouter`input_audio`OpenRouterOpenAI（OpenRouter STT 协议）下，而不是作为多部分 OpenAI 表单上传。

## 身份验证和标头

OpenRouter 在底层使用带有您的 API 密钥的 Bearer 令牌。

在真实的 OpenRouter 请求（OpenRouter`https://openrouter.ai/api/v1`OpenClawOpenRouter）上，OpenClaw 还会添加
OpenRouter 文档中记录的应用归因标头：

| 标头                      | 值                                                                                                     |
| ------------------------- | ------------------------------------------------------------------------------------------------------ |
| `HTTP-Referer`            | `https://openclaw.ai`                                                                                  |
| `X-OpenRouter-Title`      | `OpenClaw`                                                                                             |
| `X-OpenRouter-Categories` | `cli-agent,cloud-agent,programming-app,creative-writing,writing-assistant,general-chat,personal-agent` |

<Warning>如果您将 OpenRouter 提供商重新指向其他代理或基本 URL，OpenClaw 将**不会**注入那些 OpenRouter 特定的标头或 Anthropic 缓存标记。</Warning>

## 高级配置

<AccordionGroup>
  <Accordion title="Response caching"OpenRouterOpenRouter>
    OpenRouter 响应缓存是可选加入的。可以通过模型参数针对每个 OpenRouter 模型启用它：

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
    ```OpenClaw

    OpenClaw 发送 `X-OpenRouter-Cache: true` 并且，在配置后，
    发送 `X-OpenRouter-Cache-TTL`。`responseCacheClear: true` 强制刷新
    当前请求并存储替换响应。Snake_case 别名
    （`response_cache`、`response_cache_ttl_seconds` 和
    `response_cache_clear`OpenRouterAnthropic）也被接受。

    这与提供商提示缓存以及 OpenRouter 的
    Anthropic `cache_control` 标记是分开的。它仅应用于已验证的
    `openrouter.ai` 路由，而不适用于自定义代理基础 URL。

  </Accordion>

<Accordion title="AnthropicAnthropic cache markers" OpenRouterAnthropicOpenRouterAnthropic>
  在已验证的 OpenRouter 路由上，Anthropic 模型引用保留 OpenClaw 用于更好地在系统/开发者提示块上重用提示缓存的 OpenRouter 特定的 Anthropic `cache_control`OpenClaw 标记。
</Accordion>

<Accordion title="AnthropicAnthropic 推理预填充">在经过验证的 OpenRouter 路由上，启用了推理的 Anthropic 模型引用 会在请求到达 OpenRouter 之前丢弃末尾的助手预填充轮次， 以符合 Anthropic 关于推理对话必须以用户轮次结束的要求。</Accordion>

<Accordion title="思考 / 推理注入">在支持的非 `auto` 路由上，OpenClaw 将选定的思考级别映射到 OpenRouter 代理推理负载。不支持的模型提示和 `openrouter/auto` 会跳过该推理注入。Hunter Alpha 也会跳过 针对过时配置模型引用的代理推理，因为对于该已弃用的路由，OpenRouter 可能 会返回最终回答文本在推理字段中。</Accordion>

<Accordion title="DeepSeek V4 推理重放">在经过验证的 OpenRouter 路由上，`openrouter/deepseek/deepseek-v4-flash` 和 `openrouter/deepseek/deepseek-v4-pro` 会填充重放的助手轮次上缺失的 `reasoning_content`，以便思考/工具对话保持 DeepSeek V4 所需的后续格式。OpenClaw 会发送 OpenRouter 支持的 `reasoning_effort` 值用于这些路由；`xhigh` 是最高 公布的级别，过时的 `max` 覆盖将被映射到 `xhigh`。</Accordion>

<Accordion title="OpenAI仅 OpenAI 请求塑形">OpenRouter 仍然通过代理风格的 OpenAI 兼容路径运行，因此 原生仅 OpenAI 的请求塑形（例如 `serviceTier`、Responses `store`、 OpenAI 推理兼容负载以及提示缓存提示）不会被转发。</Accordion>

<Accordion title="Gemini 路由" OpenRouterOpenClaw>
  Gemini 支持的 OpenRouter 引用保留在代理 Gemini 路径上：OpenClaw 在那里保留 Gemini 思维签名清理功能，但不启用原生的 Gemini 重放验证或启动重写。
</Accordion>

  <Accordion title="提供商路由元数据"OpenRouter>
    OpenRouter 支持一个 `provider`OpenRouter 请求对象用于底层提供商路由。使用 `models.providers.openrouter.params.provider` 为所有 OpenRouter 文本模型请求配置默认策略：

    ```json5
    {
      models: {
        providers: {
          openrouter: {
            params: {
              provider: {
                sort: "latency",
                require_parameters: true,
                data_collection: "deny",
              },
            },
          },
        },
      },
    }
    ```OpenClawOpenRouter

    OpenClaw 会将该对象作为请求 `provider`OpenRouter 负载转发给 OpenRouter。使用 OpenRouter 文档中记录的 snake_case 字段，包括 `sort`、
    `only`、`ignore`、`order`、`allow_fallbacks`、`require_parameters`、
    `data_collection`、`quantizations`、`max_price`、`preferred_max_latency`、
    `preferred_min_throughput`、`zdr` 和 `enforce_distillable_text`。

    特定于模型的参数仍然会覆盖提供商范围的路由对象：

    ```json5
    {
      agents: {
        defaults: {
          models: {
            "openrouter/anthropic/claude-sonnet-4-6": {
              params: {
                provider: {
                  order: ["anthropic"],
                  allow_fallbacks: false,
                },
              },
            },
          },
        },
      },
    }
    ```OpenRouterAnthropicOpenAIOpenRouter

    这仅适用于 OpenRouter 聊天补全路由。直接的 Anthropic、Google、OpenAI 或自定义提供商路由会忽略 OpenRouter 路由参数。

  </Accordion>
</AccordionGroup>

## 相关

<CardGroup cols={2}>
  <Card title="模型选择" href="/en/concepts/model-providers" icon="layers">
    选择提供商、模型引用和故障转移行为。
  </Card>
  <Card title="Configuration reference" href="/en/gateway/configuration-reference" icon="gear">
    代理、模型和提供商的完整配置参考。
  </Card>
</CardGroup>
