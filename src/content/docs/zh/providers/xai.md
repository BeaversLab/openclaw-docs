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
  <Step title="Choose auth">
    使用来自 [xAI 控制台](https://console.x.ai/) 的 API 密钥或
    具有符合条件的 xAI 账户的 xAI OAuth 浏览器登录。OAuth 不需要
    xAI API 密钥，并且 OpenClaw 不需要 Grok Build 应用。
    由于 OpenClaw 使用
    xAI 的共享 OAuth 客户端，xAI 可能仍会将许可应用标记为 Grok Build。
  </Step>
  <Step title="登录">
    设置 `XAI_API_KEY`，运行 API 密钥向导，或启动 OAuth 流程：

    ```bash
    openclaw onboard --auth-choice xai-api-key
    openclaw onboard --auth-choice xai-oauth
    openclaw models auth login --provider xai --method oauth
    ```

  </Step>
  <Step title="选择模型">
    ```json5
    {
      agents: { defaults: { model: { primary: "xai/grok-4.3" } } },
    }
    ```
  </Step>
</Steps>

<Note>
  OpenClaw 使用 xAI Responses API 作为捆绑的 xAI 传输层。来自 `openclaw onboard --auth-choice xai-api-key` 或 `openclaw onboard --auth-choice xai-oauth` 的相同凭据也可用于支持一流的 `x_search`、远程 `code_execution` 和 xAI 图像/视频生成。 语音和转录目前需要 `XAI_API_KEY` 或提供商配置。 `XAI_API_KEY` 或插件网络搜索配置也可以支持由 Grok 驱动的 `web_search`。 如果您将 xAI 密钥存储在
  `plugins.entries.xai.config.webSearch.apiKey` 下， 捆绑的 xAI 模型提供商也将重用该密钥作为后备。 设置 `plugins.entries.xai.config.webSearch.baseUrl` 以通过运营商 xAI Responses 代理路由 Grok `web_search` 并且，默认情况下，还会路由 `x_search`。 `code_execution` 微调位于 `plugins.entries.xai.config.codeExecution` 下。
</Note>

## 内置目录

OpenClaw 内置了当前的 xAI 聊天模型，在模型选择器中按
从新到旧的顺序排列：

| 系列           | 模型 ID                                                                  |
| -------------- | ------------------------------------------------------------------------ |
| Grok 4.3       | `grok-4.3`                                                               |
| Grok 4.20 Beta | `grok-4.20-beta-latest-reasoning`, `grok-4.20-beta-latest-non-reasoning` |

该插件仍会为现有配置正向解析较旧的 Grok 3、Grok 4、Grok 4 Fast、Grok 4.1
Fast 和 Grok Code 别名，但 OpenClaw 不再在可选目录中显示
那些已停用的上游别名。

<Tip>对于新的聊天和编码工作负载，请使用 `grok-4.3`，除非您明确需要 Grok 4.20 beta 别名。</Tip>

## OpenClaw 功能覆盖

内置插件将 xAI 当前的公共 API 表面映射到 OpenClaw 的共享提供商和工具合约。不符合共享合约的功能（例如流式 TTS 和实时语音）不会暴露——请参见下表。

| xAI 功能       | OpenClaw 表面                          | 状态                                             |
| -------------- | -------------------------------------- | ------------------------------------------------ |
| 聊天 / 响应    | `xai/<model>` 模型提供商               | 是                                               |
| 服务端网络搜索 | `web_search` 提供商 `grok`             | 是                                               |
| 服务端 X 搜索  | `x_search` 工具                        | 是                                               |
| 服务端代码执行 | `code_execution` 工具                  | 是                                               |
| 图像           | `image_generate`                       | 是                                               |
| 视频           | `video_generate`                       | 是                                               |
| 批量文本转语音 | `messages.tts.provider: "xai"` / `tts` | 是                                               |
| 流式 TTS       | -                                      | 未暴露；OpenClaw 的 TTS 合约返回完整的音频缓冲区 |
| 批量语音转文本 | `tools.media.audio` / 媒体理解         | 是                                               |
| 流式语音转文本 | 语音呼叫 `streaming.provider: "xai"`   | 是                                               |
| 实时语音       | -                                      | 尚未暴露；不同的会话/WebSocket 合约              |
| 文件 / 批处理  | 仅通用模型 API 兼容性                  | 并非一等 OpenClaw 工具                           |

<Note>OpenClaw 使用 xAI 的 REST 图像/视频/TTS/STT API 进行媒体生成、语音和批量转录，使用 xAI 的流式 STT WebSocket 进行实时语音呼叫转录，并使用响应 OpenClaw 进行模型、搜索和代码执行工具。需要不同 OpenClaw 合约的功能（例如实时语音会话）在此处作为上游功能记录，而不是隐藏的插件行为。</Note>

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

旧版别名仍规范化为捆绑的规范 id：

| 旧版别名                  | 规范 id                               |
| ------------------------- | ------------------------------------- |
| `grok-4-fast-reasoning`   | `grok-4-fast`                         |
| `grok-4-1-fast-reasoning` | `grok-4-1-fast`                       |
| `grok-4.20-reasoning`     | `grok-4.20-beta-latest-reasoning`     |
| `grok-4.20-non-reasoning` | `grok-4.20-beta-latest-non-reasoning` |

## 功能

<AccordionGroup>
  <Accordion title="Web search">
    捆绑的 `grok` web-search 提供商可以使用 `XAI_API_KEY` 或插件
    web-search 密钥：

    ```bash
    openclaw config set tools.web.search.provider grok
    ```

  </Accordion>

  <Accordion title="Video generation">
    捆绑的 `xai` 插件通过共享的 `video_generate` 工具注册视频生成。

    - 默认视频模型：`xai/grok-imagine-video`
    - 模式：text-to-video（文本生成视频）、image-to-video（图像生成视频）、reference-image generation（参考图像生成）、remote video edit（远程视频编辑）和 remote video extension（远程视频扩展）
    - 纵横比：`1:1`、`16:9`、`9:16`、`4:3`、`3:4`、`3:2`、`2:3`
    - 分辨率：`480P`、`720P`
    - 时长：生成/图生视频为 1-15 秒，使用 `reference_image` 角色时为 1-10 秒，扩展时为 2-10 秒
    - 参考图像生成：为每个提供的图像将 `imageRoles` 设置为 `reference_image`；xAI 接受最多 7 张此类图像

    <Warning>
    不接受本地视频缓冲区。请使用远程 `http(s)` URL 作为视频编辑/扩展输入。图生视频接受本地图像缓冲区，因为 OpenClaw 可以将它们编码为 xAI 的数据 URL。
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
    有关共享工具参数、提供商选择和故障转移行为，请参阅 [Video Generation](/zh/tools/video-generation)。
    </Note>

  </Accordion>

  <Accordion title="图像生成">
    捆绑的 `xai` 插件通过共享的 `image_generate` 工具注册了图像生成功能。

    - 默认图像模型：`xai/grok-imagine-image`
    - 附加模型：`xai/grok-imagine-image-quality`
    - 模式：文生图和参考图像编辑
    - 参考输入：一个 `image` 或最多五个 `images`
    - 纵横比：`1:1`、`16:9`、`9:16`、`4:3`、`3:4`、`2:3`、`3:2`
    - 分辨率：`1K`、`2K`
    - 数量：最多 4 张图像

    OpenClaw 向 xAI 请求 `b64_json` 图像响应，以便生成的媒体可以通过常规渠道附件路径进行存储和传递。本地参考图像被转换为数据 URL；远程 `http(s)` 引用则被透传。

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
    xAI 还记录了 `quality`、`mask`、`user` 以及额外的原生纵横比，例如 `1:2`、`2:1`、`9:20` 和 `20:9`。OpenClaw 目前仅转发共享的跨提供商图像控制；不支持的原生专用开关不会通过 `image_generate` 暴露。
    </Note>

  </Accordion>

  <Accordion title="Text-to-speech">
    附带的 `xai` 插件通过共享 `tts`
    提供商表面注册了文本转语音。

    - 语音：`eve`、`ara`、`rex`、`sal`、`leo`、`una`
    - 默认语音：`eve`
    - 格式：`mp3`、`wav`、`pcm`、`mulaw`、`alaw`
    - 语言：BCP-47 代码或 `auto`
    - 语速：提供商原生的语速覆盖
    - 不支持原生 Opus 语音备忘录格式

    要将 xAI 用作默认 TTS 提供商：

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
    ```OpenClaw

    <Note>
    OpenClaw 使用 xAI 的批量 `/v1/tts`OpenClaw 端点。xAI 还通过 WebSocket 提供流式 TTS，
    但 OpenClaw 语音提供商合约目前要求在回复交付前
    提供完整的音频缓冲区。
    </Note>

  </Accordion>

  <Accordion title="Speech-to-text">
    附带的 `xai`OpenClaw 插件通过 OpenClaw 的
    媒体理解转录表面注册了批量语音转文本。

    - 默认模型：`grok-stt`
    - 端点：xAI REST `/v1/stt`OpenClaw
    - 输入路径：多部分音频文件上传
    - OpenClaw 在任何使用 `tools.media.audio`Discord 的入站音频转录处
      均提供支持，包括 Discord 语音频道片段和
      渠道音频附件

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
    ```OpenClaw

    语言可以通过共享音频媒体配置或每次调用
    转录请求提供。共享 OpenClaw 表面接受提示提示，
    但 xAI REST STT 集成仅转发文件、模型和
    语言，因为这些可以清晰地映射到当前的公共 xAI 端点。

  </Accordion>

  <Accordion title="流式语音转文本">
    捆绑的 `xai` 插件还注册了一个实时转录提供商
    用于实时语音通话音频。

    - 端点：xAI WebSocket `wss://api.x.ai/v1/stt`
    - 默认编码：`mulaw`
    - 默认采样率：`8000`
    - 默认端点检测：`800ms`
    - 中间转录结果：默认启用

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
    Discord 语音目前录制短片段，并使用批量
    `tools.media.audio` 转录路径来代替。
    </Note>

  </Accordion>

  <Accordion title="x_search 配置">
    内置的 xAI 插件将 `x_search`OpenClaw 暴露为 OpenClaw 工具，用于通过 Grok 搜索
    X（前身为 Twitter）内容。

    配置路径：`plugins.entries.xai.config.xSearch`

    | Key                | Type    | Default            | Description                          |
    | ------------------ | ------- | ------------------ | ------------------------------------ |
    | `enabled`          | boolean | -                  | 启用或禁用 x_search           |
    | `model`            | string  | `grok-4-1-fast`    | 用于 x_search 请求的模型     |
    | `baseUrl`          | string  | -                  | xAI Responses 基础 URL 覆盖      |
    | `inlineCitations`  | boolean | -                  | 在结果中包含内联引用  |
    | `maxTurns`         | number  | -                  | 最大对话轮次           |
    | `timeoutSeconds`   | number  | -                  | 请求超时时间（秒）           |
    | `cacheTtlMinutes`  | number  | -                  | 缓存生存时间（分钟）        |

    ```json5
    {
      plugins: {
        entries: {
          xai: {
            config: {
              xSearch: {
                enabled: true,
                model: "grok-4-1-fast",
                baseUrl: "https://api.x.ai/v1",
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
    内置的 xAI 插件将 `code_execution`OpenClaw 暴露为 OpenClaw 工具，用于在
    xAI 的沙箱环境中执行远程代码。

    配置路径：`plugins.entries.xai.config.codeExecution`

    | Key               | Type    | Default            | Description                              |
    | ----------------- | ------- | ------------------ | ---------------------------------------- |
    | `enabled`         | boolean | `true` （如果有密钥） | 启用或禁用代码执行  |
    | `model`           | string  | `grok-4-1-fast`    | 用于代码执行请求的模型   |
    | `maxTurns`        | number  | -                  | 最大对话轮次               |
    | `timeoutSeconds`  | number  | -                  | 请求超时时间（秒）               |

    <Note>
    这是远程 xAI 沙箱执行，不是本地 [`exec`](/zh/tools/exec)。
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

<Accordion title="Known limits">
  - xAI 身份验证可以使用 API 密钥、环境变量、插件配置回退， 或具有符合条件的 xAI 账户的 xAI OAuth 浏览器登录。OAuth 在 `127.0.0.1:56121` 上使用 本地回调；对于远程主机，请在打开登录 URL 之前转发该端口。 xAI 决定哪些账户可以接收 OAuth API 令牌，并且即使 OpenClaw 不需要 Grok Build 应用，许可页面也可能显示 Grok Build。 - `grok-4.20-multi-agent-experimental-beta-0304` 在 标准的 xAI
  提供商路径上不受支持，因为它需要与标准 API xAI 传输不同的上游 OpenClaw 接口。 - xAI Realtime voice 尚未注册为 OpenClaw 提供商。它 需要与批量 STT 或 流式转录不同的双向语音会话契约。 - xAI 图像 `quality`、图像 `mask` 和额外的仅限原生宽高比 在共享 `image_generate` 工具具有相应的 跨提供商控制之前不会公开。
</Accordion>

  <Accordion title="Advanced notes">
    - OpenClaw 会在共享运行器路径上自动应用 xAI 特定的工具架构（工具-schema）和工具调用兼容性修复。
    - 原生 xAI 请求默认 `tool_stream: true`。将
      `agents.defaults.models["xai/<model>"].params.tool_stream` 设置为 `false` 即可
      禁用此功能。
    - 捆绑的 xAI 包装器会在发送原生 xAI 请求之前，去除不支持的工具架构严格标志和推理负载键。
    - `web_search`、`x_search` 和 `code_execution` 被公开为 OpenClaw
      工具。OpenClaw 会在每个工具请求内部启用其所需的特定 xAI 内置功能，而不是将所有原生工具附加到每次对话轮次中。
    - Grok `web_search` 读取 `plugins.entries.xai.config.webSearch.baseUrl`。
      `x_search` 读取 `plugins.entries.xai.config.xSearch.baseUrl`，然后
      回退到 Grok 网络搜索基础 URL。
    - `x_search` 和 `code_execution` 由捆绑的 xAI 插件拥有，而不是硬编码到核心模型运行时中。
    - `code_execution` 是远程 xAI 沙盒执行，而不是本地
      [`exec`](/zh/tools/exec)。
  </Accordion>
</AccordionGroup>

## Live testing

xAI 媒体路径由单元测试和可选的实时测试套件覆盖。在运行实时探针之前，请在进程环境中导出
`XAI_API_KEY`。

```bash
pnpm test extensions/xai
OPENCLAW_LIVE_TEST=1 OPENCLAW_LIVE_TEST_QUIET=1 pnpm test:live -- extensions/xai/xai.live.test.ts
OPENCLAW_LIVE_TEST=1 OPENCLAW_LIVE_TEST_QUIET=1 OPENCLAW_LIVE_IMAGE_GENERATION_PROVIDERS=xai pnpm test:live -- test/image-generation.runtime.live.test.ts
```

特定于提供商的实时文件会合成正常的 TTS、电话友好的 PCM
TTS，通过 xAI 批量 STT 转录音频，通过 xAI 实时 STT 流式传输相同的 PCM，生成文本到图像输出，并编辑参考图像。共享图像实时文件通过 OpenClaw 的
运行时选择、回退、规范化和媒体附件路径来验证同一个 xAI 提供商。

## Related

<CardGroup cols={2}>
  <Card title="Model selection" href="/zh/concepts/model-providers" icon="layers">
    选择提供商、模型引用和故障转移行为。
  </Card>
  <Card title="Video generation" href="/zh/tools/video-generation" icon="video">
    共享视频工具参数和提供商选择。
  </Card>
  <Card title="All providers" href="/zh/providers/index" icon="grid-2">
    更广泛的提供商概述。
  </Card>
  <Card title="Troubleshooting" href="/zh/help/troubleshooting" icon="wrench">
    常见问题和修复方法。
  </Card>
</CardGroup>
