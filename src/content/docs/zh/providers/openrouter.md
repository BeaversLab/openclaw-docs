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
  <Step title="API获取你的 API 密钥"API>
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

OpenClaw 通过 OpenClawOpenRouterAPI`modalities: ["image", "text"]` 将图像请求发送到 OpenRouter 的聊天补全图像 API。Gemini 图像模型通过 OpenRouter 的 `image_config` 接收支持的 `aspectRatio` 和 `resolution`OpenRouter 提示。对于较慢的 OpenRouter 图像模型，请使用 `agents.defaults.imageGenerationModel.timeoutMs`OpenRouter；`image_generate` 工具的每次调用 `timeoutMs` 参数仍然优先。

## 视频生成

OpenRouter 也可以通过其异步 `/videos`OpenRouterAPI API 支持 OpenRouter`video_generate` 工具。在 `agents.defaults.videoGenerationModel` 下使用 OpenRouter 视频模型：

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

OpenClaw 向 OpenRouter 提交文本生成视频和图像生成视频的任务，轮询返回的 OpenClawOpenRouter`polling_url`OpenRouter，并从 OpenRouter 的 `unsigned_urls` 或记录的任务内容端点下载完成的视频。默认情况下，参考图像作为第一帧/最后一帧图像发送；标记有 `reference_image`OpenRouter 的图像作为 OpenRouter 输入参考发送。捆绑的 `google/veo-3.1-fast` 默认值通告了当前支持的 4/6/8 秒时长、`720P`/`1080P` 分辨率和 `16:9`/`9:16`OpenRouterAPI 纵横比。没有为 OpenRouter 注册视频生成视频功能，因为上游视频生成 API 目前仅接受文本和图像参考。

## 音乐生成

OpenRouter 也可以通过聊天补全音频输出支持 OpenRouter`music_generate`OpenRouter 工具。请在 `agents.defaults.musicGenerationModel` 下使用 OpenRouter 音频模型：

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

捆绑的 OpenRouter 音乐提供商默认使用 OpenRouter`google/lyria-3-pro-preview`，并且还公开 `google/lyria-3-clip-preview`OpenClaw。OpenClaw 发送 `modalities: ["text", "audio"]`，启用流式传输，收集流式音频块，并将结果保存为生成的媒体以供渠道传送。通过共享的 `music_generate image=...` 参数，Lyria 模型接受参考图像。

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

如果省略 `messages.tts.providers.openrouter.apiKey`，TTS 将重用 `models.providers.openrouter.apiKey`，然后重用 `OPENROUTER_API_KEY`。

## 语音转文本（入站音频）

OpenRouter 可以通过共享的 OpenRouter`tools.media.audio` 路径使用其 STT 端点（`/audio/transcriptions`）转录入站语音/音频附件。
这适用于任何将入站语音/音频转发到媒体理解预检的渠道插件。

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

OpenClaw 将 OpenRouter STT 请求作为 JSON 发送，其中 base64 音频位于 OpenClawOpenRouter`input_audio`OpenRouterOpenAI 下（OpenRouter STT 约定），而不是作为多部分 OpenAI 表单上传。

## 身份验证和标头

OpenRouter 在底层使用带有您的 API 密钥的 Bearer 令牌。

在真实的 OpenRouter 请求（OpenRouter`https://openrouter.ai/api/v1`OpenClawOpenRouter）上，OpenClaw 还会添加
OpenRouter 记录在案的应用归因标头：

| 标头                      | 值                                                                                                     |
| ------------------------- | ------------------------------------------------------------------------------------------------------ |
| `HTTP-Referer`            | `https://openclaw.ai`                                                                                  |
| `X-OpenRouter-Title`      | `OpenClaw`                                                                                             |
| `X-OpenRouter-Categories` | `cli-agent,cloud-agent,programming-app,creative-writing,writing-assistant,general-chat,personal-agent` |

<Warning>如果您将 OpenRouter 提供商重新指向其他代理或基本 URL，OpenClaw 将**不会**注入那些 OpenRouter 特定的标头或 Anthropic 缓存标记。</Warning>

## 高级配置

<AccordionGroup>
  <Accordion title="响应缓存">
    OpenRouter 响应缓存是可选加入的。使用模型参数针对每个 OpenRouter 模型启用它：

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

    OpenClaw 会发送 `X-OpenRouter-Cache: true`，并且在配置后，会发送 `X-OpenRouter-Cache-TTL`。`responseCacheClear: true` 会强制刷新当前请求并存储替换后的响应。Snake_case 别名（`response_cache`、`response_cache_ttl_seconds` 和 `response_cache_clear`）也是可接受的。

    这与提供商提示缓存以及 OpenRouter 的 Anthropic `cache_control` 标记是分开的。它仅应用于已验证的 `openrouter.ai` 路由，而不适用于自定义代理基础 URL。

  </Accordion>

<Accordion title="Anthropic 缓存标记">在已验证的 OpenRouter 路由上，Anthropic 模型引用会保留 OpenRouter 专用的 Anthropic `cache_control` 标记，OpenClaw 使用这些标记以便在系统/开发者提示块上更好地重用提示缓存。</Accordion>

<Accordion title="Anthropic 推理预填充">在已验证的 OpenRouter 路由上，启用了推理功能的 Anthropic 模型引用会在请求到达 OpenRouter 之前丢弃末尾的助手预填充轮次，以符合 Anthropic 关于推理对话必须以用户轮次结束的要求。</Accordion>

<Accordion title="Thinking / reasoning injection">在支持的非 `auto`OpenClawOpenRouter 路由上，OpenClaw 将选定的思考级别映射到 OpenRouter 代理推理负载。不支持的模型提示和 `openrouter/auto`OpenRouter 将跳过该推理注入。Hunter Alpha 还会跳过 过时的配置模型引用的代理推理，因为对于该已停用的路由，OpenRouter 可能 会在推理字段中返回最终答案文本。</Accordion>

<Accordion title="DeepSeek V4 reasoning replay" OpenRouter>
  在已验证的 OpenRouter 路由上，`openrouter/deepseek/deepseek-v4-flash` 和 `openrouter/deepseek/deepseek-v4-pro` 会填充重放助手轮次中缺失的 `reasoning_content`OpenClawOpenRouter，以便思考/工具对话保持 DeepSeek V4 所需的后续形状。OpenClaw 会为这些路由发送 OpenRouter 支持的 `reasoning_effort` 值；`xhigh` 是最高 advertised 级别，过时的 `max` 覆盖将被映射到 `xhigh`。
</Accordion>

<Accordion title="OpenAIOpenAI-only request shaping" OpenRouterOpenAIOpenAI>
  OpenRouter 仍然通过代理风格的 OpenAI 兼容路径运行，因此 原生的 OpenAI-only 请求塑造（例如 `serviceTier`、Responses `store`OpenAI、 OpenAI reasoning-compat 负载和提示缓存提示）不会被转发。
</Accordion>

<Accordion title="Gemini-backed routes" OpenRouterOpenClaw>
  Gemini 支持的 OpenRouter 引用保留在代理-Gemini 路径上：OpenClaw 在此处保留 Gemini 思维签名清理，但不启用原生 Gemini 重放验证或引导重写。
</Accordion>

  <Accordion title="Provider routing metadata"OpenRouterOpenClawOpenRouter>
    如果您在模型参数下传递了 OpenRouter 提供商路由，OpenClaw 会在共享流包装器运行之前将其作为 OpenRouter 路由元数据转发。
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
