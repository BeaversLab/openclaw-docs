---
summary: "在 OpenClaw 中使用 xAI Grok 模型"
read_when:
  - You want to use Grok models in OpenClaw
  - You are configuring xAI auth or model ids
title: "xAI"
---

OpenClaw 附带了一个用于 Grok 模型的内置 `xai` 提供商插件。

## 入门指南

<Steps>
  <Step title="创建一个 API 密钥">
    在 [xAI 控制台](https://console.x.ai/) 中创建一个 API 密钥。
  </Step>
  <Step title="设置您的 API 密钥">
    设置 `XAI_API_KEY`，或运行：

    ```bash
    openclaw onboard --auth-choice xai-api-key
    ```

  </Step>
  <Step title="选择一个模型">
    ```json5
    {
      agents: { defaults: { model: { primary: "xai/grok-4" } } },
    }
    ```
  </Step>
</Steps>

<Note>OpenClaw 使用 xAI Responses API 作为内置的 xAI 传输。同一个 `XAI_API_KEY` 也可以驱动基于 Grok 的 `web_search`、一等 `x_search` 以及远程 `code_execution`。 如果您在 `plugins.entries.xai.config.webSearch.apiKey` 下存储了 xAI 密钥， 内置的 xAI 模型提供商也会重用该密钥作为后备。 `code_execution` 调优位于 `plugins.entries.xai.config.codeExecution` 下。</Note>

## 内置目录

OpenClaw 开箱即用地包含以下 xAI 模型系列：

| 系列           | 模型 ID                                                                  |
| -------------- | ------------------------------------------------------------------------ |
| Grok 3         | `grok-3`, `grok-3-fast`, `grok-3-mini`, `grok-3-mini-fast`               |
| Grok 4         | `grok-4`, `grok-4-0709`                                                  |
| Grok 4 Fast    | `grok-4-fast`, `grok-4-fast-non-reasoning`                               |
| Grok 4.1 Fast  | `grok-4-1-fast`, `grok-4-1-fast-non-reasoning`                           |
| Grok 4.20 Beta | `grok-4.20-beta-latest-reasoning`, `grok-4.20-beta-latest-non-reasoning` |
| Grok Code      | `grok-code-fast-1`                                                       |

当较新的 `grok-4*` 和 `grok-code-fast*` ID 遵循
相同的 API 形状时，该插件也会对其进行前向解析。

<Tip>`grok-4-fast`、`grok-4-1-fast` 和 `grok-4.20-beta-*` 变体是内置目录中 当前支持图像的 Grok 引用。</Tip>

## OpenClaw 功能覆盖范围

捆绑插件将 xAI 当前的公共 API 表面映射到 OpenClaw 共享的提供商和工具合约。不符合共享合约的功能（例如流式 TTS 和实时语音）未公开 — 请参阅下表。

| xAI 功能         | OpenClaw 表面                          | 状态                                             |
| ---------------- | -------------------------------------- | ------------------------------------------------ |
| 聊天 / 响应      | `xai/<model>` 模型提供商               | 是                                               |
| 服务器端网页搜索 | `web_search` 提供商 `grok`             | 是                                               |
| 服务器端 X 搜索  | `x_search` 工具                        | 是                                               |
| 服务器端代码执行 | `code_execution` 工具                  | 是                                               |
| 图像             | `image_generate`                       | 是                                               |
| 视频             | `video_generate`                       | 是                                               |
| 批量文本转语音   | `messages.tts.provider: "xai"` / `tts` | 是                                               |
| 流式 TTS         | —                                      | 未公开；OpenClaw 的 TTS 合约返回完整的音频缓冲区 |
| 批量语音转文本   | `tools.media.audio` / 媒体理解         | 是                                               |
| 流式语音转文本   | 语音通话 `streaming.provider: "xai"`   | 是                                               |
| 实时语音         | —                                      | 尚未公开；不同的会话/WebSocket 合约              |
| 文件 / 批次      | 仅通用模型 API 兼容性                  | 不是一流的 OpenClaw 工具                         |

<Note>OpenClaw 使用 xAI 的 REST 图像/视频/TTS/STT API 进行媒体生成、语音和批量转录，使用 xAI 的流式 STT WebSocket 进行实时语音通话转录，并使用响应 OpenClaw 进行模型、搜索和代码执行工具。需要不同 OpenClaw 合约的功能（如实时语音会话）在此处作为上游功能记录，而不是隐藏的插件行为。</Note>

### 快速模式映射

`/fast on` 或 `agents.defaults.models["xai/<model>"].params.fastMode: true`
按如下方式重写原生 xAI 请求：

| 源模型        | 快速模式目标       |
| ------------- | ------------------ |
| `grok-3`      | `grok-3-fast`      |
| `grok-3-mini` | `grok-3-mini-fast` |
| `grok-4`      | `grok-4-fast`      |
| `grok-4-0709` | `grok-4-fast`      |

### 旧版兼容别名

旧版别名仍然标准化为规范捆绑 ID：

| 旧版别名                  | 规范 ID                               |
| ------------------------- | ------------------------------------- |
| `grok-4-fast-reasoning`   | `grok-4-fast`                         |
| `grok-4-1-fast-reasoning` | `grok-4-1-fast`                       |
| `grok-4.20-reasoning`     | `grok-4.20-beta-latest-reasoning`     |
| `grok-4.20-non-reasoning` | `grok-4.20-beta-latest-non-reasoning` |

## 功能

<AccordionGroup>
  <Accordion title="网络搜索">
    捆绑的 `grok` 网络搜索提供商也使用 `XAI_API_KEY`：

    ```bash
    openclaw config set tools.web.search.provider grok
    ```

  </Accordion>

  <Accordion title="视频生成">
    捆绑的 `xai` 插件通过共享的 `video_generate` 工具注册视频生成。

    - 默认视频模型：`xai/grok-imagine-video`
    - 模式：text-to-video、image-to-video、reference-image generation、remote video edit 和 remote video extension
    - 纵横比：`1:1`、`16:9`、`9:16`、`4:3`、`3:4`、`3:2`、`2:3`
    - 分辨率：`480P`、`720P`
    - 持续时间：生成/图生视频为 1-15 秒，使用 `reference_image` 角色时为 1-10 秒，扩展为 2-10 秒
    - 参考图像生成：将每个提供的图像的 `imageRoles` 设置为 `reference_image`；xAI 最多接受 7 张此类图像

    <Warning>
    不接受本地视频缓冲区。请使用远程 `http(s)` URL 作为视频编辑/扩展输入。图生视频接受本地图像缓冲区，因为 OpenClaw 可以将其编码为 xAI 的数据 URL。
    </Warning>

    要将 xAI 用作默认视频提供商：

    ```json5
    {
      agents: {
        defaults: {
          videoGenerationModel: {
            primary: "xai/grok-imagine-video",
          },
        },
      },
    }
    ```

    <Note>
    请参阅 [视频生成](/zh/tools/video-generation) 了解共享工具参数、提供商选择和故障转移行为。
    </Note>

  </Accordion>

  <Accordion title="图像生成">
    捆绑的 `xai` 插件通过共享的 `image_generate` 工具注册图像生成功能。

    - 默认图像模型：`xai/grok-imagine-image`
    - 附加模型：`xai/grok-imagine-image-pro`
    - 模式：文生图和参考图像编辑
    - 参考输入：一个 `image` 或最多五个 `images`
    - 宽高比：`1:1`、`16:9`、`9:16`、`4:3`、`3:4`、`2:3`、`3:2`
    - 分辨率：`1K`、`2K`
    - 数量：最多 4 张图片

    OpenClaw 向 xAI 请求 `b64_json` 图像响应，以便生成的媒体可以通过常规渠道附件路径进行存储和传递。本地参考图像被转换为数据 URL；远程 `http(s)` 引用则被直接传递。

    要将 xAI 用作默认图像提供商：

    ```json5
    {
      agents: {
        defaults: {
          imageGenerationModel: {
            primary: "xai/grok-imagine-image",
          },
        },
      },
    }
    ```

    <Note>
    xAI 文档中还记录了 `quality`、`mask`、`user` 以及其他原生比例，例如 `1:2`、`2:1`、`9:20` 和 `20:9`。OpenClaw 目前仅转发跨提供商共享的图像控制；不支持的原生选项有意不通过 `image_generate` 暴露。
    </Note>

  </Accordion>

  <Accordion title="Text-to-speech">
    捆绑的 `xai` 插件通过共享的 `tts` 提供商表面注册了文本转语音功能。

    - 语音: `eve`, `ara`, `rex`, `sal`, `leo`, `una`
    - 默认语音: `eve`
    - 格式: `mp3`, `wav`, `pcm`, `mulaw`, `alaw`
    - 语言: BCP-47 代码或 `auto`
    - 速度: 提供商原生速度覆盖
    - 不支持原生 Opus 语音笔记格式

    要将 xAI 用作默认 TTS 提供商:

    ```json5
    {
      messages: {
        tts: {
          provider: "xai",
          providers: {
            xai: {
              voiceId: "eve",
            },
          },
        },
      },
    }
    ```

    <Note>
    OpenClaw 使用 xAI 的批处理 `/v1/tts` 端点。xAI 也通过 WebSocket 提供流式 TTS，
    但 OpenClaw 语音提供商合约目前要求在
    回复交付前提供完整的音频缓冲区。
    </Note>

  </Accordion>

  <Accordion title="Speech-to-text">
    捆绑的 `xai` 插件通过 OpenClaw 的
    媒体理解转录表面注册了批处理语音转文本功能。

    - 默认模型: `grok-stt`
    - 端点: xAI REST `/v1/stt`
    - 输入路径: 多部分音频文件上传
    - OpenClaw 支持此功能， wherever inbound audio transcription uses
      `tools.media.audio`，包括 Discord 语音频道片段和
      频道音频附件

    要强制对入站音频转录使用 xAI:

    ```json5
    {
      tools: {
        media: {
          audio: {
            models: [
              {
                type: "provider",
                provider: "xai",
                model: "grok-stt",
              },
            ],
          },
        },
      },
    }
    ```

    语言可以通过共享音频媒体配置或每次调用
    转录请求来提供。共享 OpenClaw 表面接受提示提示，
    但 xAI REST STT 集成仅转发文件、模型和
    语言，因为它们能清晰地映射到当前的公共 xAI 端点。

  </Accordion>

  <Accordion title="流式语音转文本">
    捆绑的 `xai` 插件还注册了一个实时转录提供商
    用于实时语音通话音频。

    - 端点：xAI WebSocket `wss://api.x.ai/v1/stt`
    - 默认编码：`mulaw`
    - 默认采样率：`8000`
    - 默认端点检测：`800ms`
    - 临时转录：默认启用

    语音通话的 Twilio 媒体流发送 G.711 µ-law 音频帧，因此
    xAI 提供商可以直接转发这些帧而无需转码：

    ```json5
    {
      plugins: {
        entries: {
          "voice-call": {
            config: {
              streaming: {
                enabled: true,
                provider: "xai",
                providers: {
                  xai: {
                    apiKey: "${XAI_API_KEY}",
                    endpointingMs: 800,
                    language: "en",
                  },
                },
              },
            },
          },
        },
      },
    }
    ```

    提供商拥有的配置位于
    `plugins.entries.voice-call.config.streaming.providers.xai` 之下。支持的
    键包括 `apiKey`、`baseUrl`、`sampleRate`、`encoding`（`pcm`、`mulaw` 或
    `alaw`）、`interimResults`、`endpointingMs` 和 `language`。

    <Note>
    此流式提供商用于语音通话的实时转录路径。
    Discord 语音目前录制短片段并改用批量
    `tools.media.audio` 转录路径。
    </Note>

  </Accordion>

  <Accordion title="x_search 配置">
    内置的 xAI 插件将 `x_search` 公开为 OpenClaw 工具，用于通过 Grok 搜索
    X（前身为 Twitter）的内容。

    配置路径：`plugins.entries.xai.config.xSearch`

    | Key                | Type    | Default            | Description                          |
    | ------------------ | ------- | ------------------ | ------------------------------------ |
    | `enabled`          | boolean | —                  | 启用或禁用 x_search           |
    | `model`            | string  | `grok-4-1-fast`    | 用于 x_search 请求的模型     |
    | `inlineCitations`  | boolean | —                  | 在结果中包含内联引用  |
    | `maxTurns`         | number  | —                  | 最大对话轮次           |
    | `timeoutSeconds`   | number  | —                  | 请求超时（秒）           |
    | `cacheTtlMinutes`  | number  | —                  | 缓存有效期（分钟）        |

    ```json5
    {
      plugins: {
        entries: {
          xai: {
            config: {
              xSearch: {
                enabled: true,
                model: "grok-4-1-fast",
                inlineCitations: true,
              },
            },
          },
        },
      },
    }
    ```

  </Accordion>

  <Accordion title="代码执行配置">
    内置的 xAI 插件将 `code_execution` 公开为 OpenClaw 工具，用于
    在 xAI 的沙盒环境中远程执行代码。

    配置路径：`plugins.entries.xai.config.codeExecution`

    | Key               | Type    | Default            | Description                              |
    | ----------------- | ------- | ------------------ | ---------------------------------------- |
    | `enabled`         | boolean | `true` (if key available) | 启用或禁用代码执行  |
    | `model`           | string  | `grok-4-1-fast`    | 用于代码执行请求的模型   |
    | `maxTurns`        | number  | —                  | 最大对话轮次               |
    | `timeoutSeconds`  | number  | —                  | 请求超时（秒）               |

    <Note>
    这是远程 xAI 沙盒执行，而非本地 [`exec`](/zh/tools/exec)。
    </Note>

    ```json5
    {
      plugins: {
        entries: {
          xai: {
            config: {
              codeExecution: {
                enabled: true,
                model: "grok-4-1-fast",
              },
            },
          },
        },
      },
    }
    ```

  </Accordion>

<Accordion title="已知限制">
  - 目前认证仅支持 API 密钥。OpenClaw 尚不支持 xAI OAuth 或设备码流程。 - 正常的 xAI 提供商路径不支持 `grok-4.20-multi-agent-experimental-beta-0304`，因为它需要与标准 OpenClaw xAI 传输不同的上游 OpenClaw 表面。 - xAI Realtime voice 尚未注册为 OpenClaw 提供商。它需要的双向语音会话契约与批量 STT 或流式转录不同。 - xAI 图像 `quality`、图像 `mask` 以及额外的仅限原生纵横比，在共享的 `image_generate`
  工具具备相应的跨提供商控制之前，不会暴露。
</Accordion>

  <Accordion title="高级说明">
    - OpenClaw 会在共享的运行器路径上自动应用特定于 xAI 的工具架构和工具调用兼容性修复。
    - 原生 xAI 请求默认 `tool_stream: true`。将 `agents.defaults.models["xai/<model>"].params.tool_stream` 设置为 `false` 即可禁用它。
    - 捆绑的 xAI 包装器会在发送原生 xAI 请求之前，剥离不支持的严格工具架构标志和推理负载键。
    - `web_search`、`x_search` 和 `code_execution` 作为 OpenClaw 工具暴露。OpenClaw 会在每个工具请求中启用它所需的特定 xAI 内置功能，而不是将所有原生工具附加到每次聊天轮次中。
    - `x_search` 和 `code_execution` 归捆绑的 xAI 插件所有，而不是硬编码到核心模型运行时中。
    - `code_execution` 是远程 xAI 沙盒执行，不是本地的 [`exec`](/zh/tools/exec)。
  </Accordion>
</AccordionGroup>

## 实时测试

xAI 媒体路径由单元测试和可选的实时套件覆盖。实时命令在探测 `XAI_API_KEY` 之前，会从您的登录 shell 加载密钥，包括 `~/.profile`。

```bash
pnpm test extensions/xai
OPENCLAW_LIVE_TEST=1 OPENCLAW_LIVE_TEST_QUIET=1 pnpm test:live -- extensions/xai/xai.live.test.ts
OPENCLAW_LIVE_TEST=1 OPENCLAW_LIVE_TEST_QUIET=1 OPENCLAW_LIVE_IMAGE_GENERATION_PROVIDERS=xai pnpm test:live -- test/image-generation.runtime.live.test.ts
```

提供商特定的实时文件合成常规 TTS、电话友好的 PCM TTS，通过 xAI 批量 STT 转录音频，通过 xAI 实时 STT 流式传输相同的 PCM，生成文本到图像输出，并编辑参考图像。共享图像实时文件通过 OpenClaw 的运行时选择、故障转移、规范化和媒体附加路径来验证同一个 xAI 提供商。

## 相关

<CardGroup cols={2}>
  <Card title="Model selection" href="/zh/concepts/model-providers" icon="layers">
    选择提供商、模型引用和故障转移行为。
  </Card>
  <Card title="Video generation" href="/zh/tools/video-generation" icon="video">
    共享视频工具参数和提供商选择。
  </Card>
  <Card title="All providers" href="/zh/providers/index" icon="grid-2">
    更广泛的提供商概览。
  </Card>
  <Card title="Troubleshooting" href="/zh/help/troubleshooting" icon="wrench">
    常见问题和修复方法。
  </Card>
</CardGroup>
