---
summary: "在 OpenClaw 中使用 xAI Grok 模型"
read_when:
  - You want to use Grok models in OpenClaw
  - You are configuring xAI auth or model ids
title: "xAI"
---

# xAI

OpenClaw 附带了一个用于 Grok 模型的捆绑 `xai` 提供商插件。

## 入门指南

<Steps>
  <Step title="Create an API key">
    在 [xAI console](https://console.x.ai/) 中创建 API 密钥。
  </Step>
  <Step title="Set your API key">
    设置 `XAI_API_KEY`，或运行：

    ```bash
    openclaw onboard --auth-choice xai-api-key
    ```

  </Step>
  <Step title="Pick a 模型">
    ```json5
    {
      agents: { defaults: { model: { primary: "xai/grok-4" } } },
    }
    ```
  </Step>
</Steps>

<Note>OpenClaw 使用 xAI Responses API 作为捆绑的 xAI 传输。相同的 `XAI_API_KEY` 也可以支持由 Grok 支持的 `web_search`、一流的 `x_search` 和远程 `code_execution`。 如果您在 `plugins.entries.xai.config.webSearch.apiKey` 下存储了 xAI 密钥， 捆绑的 xAI 模型提供商也会将该密钥作为回退重用。 `code_execution` 调整位于 `plugins.entries.xai.config.codeExecution` 下。</Note>

## 捆绑模型目录

OpenClaw 默认包含以下 xAI 模型系列：

| 系列           | 模型 ID                                                                  |
| -------------- | ------------------------------------------------------------------------ |
| Grok 3         | `grok-3`, `grok-3-fast`, `grok-3-mini`, `grok-3-mini-fast`               |
| Grok 4         | `grok-4`, `grok-4-0709`                                                  |
| Grok 4 Fast    | `grok-4-fast`, `grok-4-fast-non-reasoning`                               |
| Grok 4.1 Fast  | `grok-4-1-fast`, `grok-4-1-fast-non-reasoning`                           |
| Grok 4.20 Beta | `grok-4.20-beta-latest-reasoning`, `grok-4.20-beta-latest-non-reasoning` |
| Grok Code      | `grok-code-fast-1`                                                       |

当较新的 `grok-4*` 和 `grok-code-fast*` ID 遵循相同的 API 形状时，该插件也会对其进行前向解析。

<Tip>`grok-4-fast`, `grok-4-1-fast` 和 `grok-4.20-beta-*` 变体是打包目录中当前支持图像的 Grok 引用。</Tip>

## OpenClaw 功能覆盖

该打包插件将 xAI 当前的公共 API 接口映射到 OpenClaw 的共享提供商和工具合约，只要行为能够完全匹配。

| xAI 能力       | OpenClaw 接口                          | 状态                                             |
| -------------- | -------------------------------------- | ------------------------------------------------ |
| 聊天 / 响应    | `xai/<model>` 模型提供商               | 是                                               |
| 服务端网络搜索 | `web_search` 提供商 `grok`             | 是                                               |
| 服务端 X 搜索  | `x_search` 工具                        | 是                                               |
| 服务端代码执行 | `code_execution` 工具                  | 支持                                             |
| 图片           | `image_generate`                       | 支持                                             |
| 视频           | `video_generate`                       | 支持                                             |
| 批量文本转语音 | `messages.tts.provider: "xai"` / `tts` | 支持                                             |
| 流式文本转语音 | —                                      | 未公开；OpenClaw 的 TTS 协议返回完整的音频缓冲区 |
| 批量语音转文本 | `tools.media.audio` / 媒体理解         | 支持                                             |
| 流式语音转文本 | 语音通话 `streaming.provider: "xai"`   | 支持                                             |
| 实时语音       | —                                      | 尚未公开；使用不同的会话/WebSocket 协议          |
| 文件 / 批处理  | 仅通用模型 API 兼容                    | 不是一等 OpenClaw 工具                           |

<Note>OpenClaw 使用 xAI 的 REST image/video/TTS/STT API 进行媒体生成、语音和批量转录，使用 xAI 的流式 STT WebSocket 进行实时语音通话转录，并使用 Responses API 进行模型、搜索和代码执行工具处理。需要不同 OpenClaw 协议的功能（例如 Realtime 语音会话）在此处被记录为上游能力，而不是隐藏的插件行为。</Note>

### Fast-mode 映射

`/fast on` 或 `agents.defaults.models["xai/<model>"].params.fastMode: true`
按如下方式重写原生 xAI 请求：

| 源模型        | Fast-mode 目标     |
| ------------- | ------------------ |
| `grok-3`      | `grok-3-fast`      |
| `grok-3-mini` | `grok-3-mini-fast` |
| `grok-4`      | `grok-4-fast`      |
| `grok-4-0709` | `grok-4-fast`      |

### 旧版兼容别名

旧版别名仍会规范化为标准的捆绑 ID：

| 旧版别名                  | 标准 ID                               |
| ------------------------- | ------------------------------------- |
| `grok-4-fast-reasoning`   | `grok-4-fast`                         |
| `grok-4-1-fast-reasoning` | `grok-4-1-fast`                       |
| `grok-4.20-reasoning`     | `grok-4.20-beta-latest-reasoning`     |
| `grok-4.20-non-reasoning` | `grok-4.20-beta-latest-non-reasoning` |

## 功能

<AccordionGroup>
  <Accordion title="Web search">
    捆绑的 `grok` 网络搜索提供商也使用 `XAI_API_KEY`：

    ```bash
    openclaw config set tools.web.search.provider grok
    ```

  </Accordion>

  <Accordion title="视频生成">
    附带的 `xai` 插件通过共享的 `video_generate` 工具注册了视频生成功能。

    - 默认视频模型：`xai/grok-imagine-video`
    - 模式：文本生成视频、图片生成视频、远程视频编辑以及远程视频扩展
    - 纵横比：`1:1`、`16:9`、`9:16`、`4:3`、`3:4`、`3:2`、`2:3`
    - 分辨率：`480P`、`720P`
    - 时长：生成/图片生成视频为 1-15 秒，扩展为 2-10 秒

    <Warning>
    不接受本地视频缓冲区。请使用远程 `http(s)` URL 作为视频编辑/扩展的输入。图片生成视频接受本地图片缓冲区，因为 OpenClaw 可以将其编码为 xAI 的数据 URL。
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
    捆绑的 `xai` 插件通过共享的
    `image_generate` 工具注册图像生成功能。

    - 默认图像模型：`xai/grok-imagine-image`
    - 附加模型：`xai/grok-imagine-image-pro`
    - 模式：文生图和参考图像编辑
    - 参考输入：一个 `image` 或最多五个 `images`
    - 纵横比：`1:1`、`16:9`、`9:16`、`4:3`、`3:4`、`2:3`、`3:2`
    - 分辨率：`1K`、`2K`
    - 数量：最多 4 张图像

    OpenClaw 向 xAI 请求 `b64_json` 图像响应，以便生成的媒体可以
    通过正常的渠道附件路径进行存储和交付。本地的
    参考图像将转换为数据 URL；远程 `http(s)` 引用将
    直接传递。

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
    xAI 也记录了 `quality`、`mask`、`user` 以及额外的原生纵横比，
    例如 `1:2`、`2:1`、`9:20` 和 `20:9`。OpenClaw 目前仅转发
    共享的跨提供商图像控制；不支持的仅原生控件
    故意未通过 `image_generate` 暴露。
    </Note>

  </Accordion>

  <Accordion title="文本转语音">
    捆绑的 `xai` 插件通过共享的 `tts` 提供商表面注册了文本转语音功能。

    - 语音：`eve`、`ara`、`rex`、`sal`、`leo`、`una`
    - 默认语音：`eve`
    - 格式：`mp3`、`wav`、`pcm`、`mulaw`、`alaw`
    - 语言：BCP-47 代码或 `auto`
    - 速度：提供商原生速度覆盖
    - 不支持原生 Opus 语音笔记格式

    要将 xAI 用作默认的 TTS 提供商：

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
    OpenClaw 使用 xAI 的批量 `/v1/tts` 端点。xAI 还通过 WebSocket 提供流式 TTS，但 OpenClaw 语音提供商合同目前要求在回复交付前提供完整的音频缓冲区。
    </Note>

  </Accordion>

  <Accordion title="Speech-to-text">
    内置的 `xai` 插件通过 OpenClaw 的
    媒体理解转录表面注册了批量语音转文字功能。

    - 默认模型：`grok-stt`
    - 端点：xAI REST `/v1/stt`
    - 输入路径：multipart 音频文件上传
    - OpenClaw 在任何入站音频转录使用
      `tools.media.audio` 的地方都提供支持，包括 Discord 语音频道片段和
      频道音频附件

    要强制对入站音频转录使用 xAI：

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

    语言可以通过共享音频媒体配置或单次调用转录请求提供。
    共享的 OpenClaw 表面接受提示提示，但 xAI REST STT 集成仅转发文件、模型和
    语言，因为这些可以干净地映射到当前的公共 xAI 端点。

  </Accordion>

  <Accordion title="Streaming speech-to-text">
    捆绑的 `xai` 插件还注册了一个实时转录提供商
    用于实时语音通话音频。

    - Endpoint: xAI WebSocket `wss://api.x.ai/v1/stt`
    - Default encoding: `mulaw`
    - Default sample rate: `8000`
    - Default endpointing: `800ms`
    - Interim transcripts: 默认启用

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
    Discord 语音目前录制短片段，并改用批量
    `tools.media.audio` 转录路径。
    </Note>

  </Accordion>

  <Accordion title="x_search configuration">
    捆绑的 xAI 插件将 `x_search` 暴露为 OpenClaw 工具，用于通过 Grok 搜索
    X（前身为 Twitter）内容。

    配置路径：`plugins.entries.xai.config.xSearch`

    | Key                | Type    | Default            | Description                          |
    | ------------------ | ------- | ------------------ | ------------------------------------ |
    | `enabled`          | boolean | —                  | 启用或禁用 x_search                  |
    | `model`            | string  | `grok-4-1-fast`    | 用于 x_search 请求的模型            |
    | `inlineCitations`  | boolean | —                  | 在结果中包含内联引用                |
    | `maxTurns`         | number  | —                  | 最大对话轮数                        |
    | `timeoutSeconds`   | number  | —                  | 请求超时（秒）                       |
    | `cacheTtlMinutes`  | number  | —                  | 缓存生存时间（分钟）                 |

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

  <Accordion title="Code execution configuration">
    The bundled xAI plugin exposes `code_execution` as an OpenClaw 工具 for
    remote code execution in xAI's sandbox environment.

    Config path: `plugins.entries.xai.config.codeExecution`

    | Key               | Type    | Default            | Description                              |
    | ----------------- | ------- | ------------------ | ---------------------------------------- |
    | `enabled`         | boolean | `true` (if key available) | Enable or disable code execution  |
    | `model`           | string  | `grok-4-1-fast`    | Model used for code execution requests   |
    | `maxTurns`        | number  | —                  | Maximum conversation turns               |
    | `timeoutSeconds`  | number  | —                  | Request timeout in seconds               |

    <Note>
    This is remote xAI sandbox execution, not local [`exec`](/zh/tools/exec).
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
  - 目前仅支持 API 密钥认证。OpenClaw 中尚不支持 xAI OAuth 或设备代码流程。 - 正常的 xAI 提供商路径不支持 `grok-4.20-multi-agent-experimental-beta-0304`，因为它需要与标准 OpenClaw xAI 传输不同的上游 API 表面。 - xAI Realtime voice 尚未注册为 OpenClaw 提供商。它需要与批量 STT 或流式转录不同的双向语音会话合约。 - 在共享的 `image_generate` 工具具有相应的跨提供商控制之前，xAI 图像 `quality`、图像
  `mask` 以及额外的仅限原生宽高比均不会公开。
</Accordion>

  <Accordion title="Advanced notes">
    - OpenClaw 会在共享运行路径上自动应用 xAI 特定的工具架构（工具-schema）和工具调用（工具-call）兼容性修复。
    - 原生 xAI 请求默认 `tool_stream: true`。设置
      `agents.defaults.models["xai/<model>"].params.tool_stream` 为 `false` 即可
      禁用它。
    - 捆绑的 xAI 包装器会在发送原生 xAI 请求之前，剥离不支持的工具架构严格模式标志和推理载荷键。
    - `web_search`、`x_search` 和 `code_execution` 被公开为 OpenClaw
      工具。OpenClaw 会在每个工具请求中启用其所需的特定 xAI 内置功能，而不是将所有原生工具附加到每一轮对话中。
    - `x_search` 和 `code_execution` 归捆绑的 xAI 插件所有，而不是硬编码到核心模型运行时中。
    - `code_execution` 是远程 xAI 沙箱执行，而非本地的
      [`exec`](/zh/tools/exec)。
  </Accordion>
</AccordionGroup>

## 实时测试

xAI 媒体路径由单元测试和可选的实时测试套件覆盖。实时命令在探测 `XAI_API_KEY` 之前，会从您的登录 shell 加载密钥，包括 `~/.profile`。

```bash
pnpm test extensions/xai
OPENCLAW_LIVE_TEST=1 OPENCLAW_LIVE_TEST_QUIET=1 pnpm test:live -- extensions/xai/xai.live.test.ts
OPENCLAW_LIVE_TEST=1 OPENCLAW_LIVE_TEST_QUIET=1 OPENCLAW_LIVE_IMAGE_GENERATION_PROVIDERS=xai pnpm test:live -- test/image-generation.runtime.live.test.ts
```

特定于提供商的实时文件会合成常规 TTS、电话友好的 PCM TTS，通过 xAI 批量 STT 转录音频，通过 xAI 实时 STT 流式传输相同的 PCM，生成文本到图像输出，并编辑参考图像。共享的图像实时文件通过 OpenClaw 的运行时选择、回退、归一化和媒体附件路径来验证相同的 xAI 提供商。

## 相关

<CardGroup cols={2}>
  <Card title="Model selection" href="/zh/concepts/model-providers" icon="layers">
    选择提供商、模型引用和故障转移行为。
  </Card>
  <Card title="视频生成" href="/zh/tools/video-generation" icon="video">
    共享视频工具参数和提供商选择。
  </Card>
  <Card title="所有提供商" href="/zh/providers/index" icon="grid-2">
    更广泛的提供商概述。
  </Card>
  <Card title="故障排除" href="/zh/help/troubleshooting" icon="wrench">
    常见问题和修复。
  </Card>
</CardGroup>
