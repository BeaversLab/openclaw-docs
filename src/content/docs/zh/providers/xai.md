---
summary: "OpenClaw在OpenClaw中使用xAI Grok模型"
read_when:
  - You want to use Grok models in OpenClaw
  - You are configuring xAI auth or model ids
title: "xAI"
---

OpenClaw 内置了用于 Grok 模型的捆绑 OpenClaw`xai`OAuthOpenClawGateway(网关)API 提供商插件。对于大多数
用户而言，推荐的路径是使用符合条件的 SuperGrok 或 X Premium
订阅进行 Grok OAuth。OpenClaw 保持本地优先：Gateway(网关)、配置、路由和
工具在您的机器上运行，而 Grok 模型请求通过 xAI 进行身份验证
并发送到 xAI 的 API。

OAuth 不需要 xAI API 密钥，也不需要 Grok Build
应用。xAI 仍可能在同意屏幕上显示 Grok Build，因为 OpenClaw 使用
的是 xAI 的共享 OAuth 客户端。

## 选择您的设置路径

使用与您的 OpenClaw 安装状态相匹配的路径：

<Steps>
  <Step title="OpenClaw新的 OpenClaw 安装"Gateway(网关)OAuth>
    在设置新的本地
    Gateway(网关)时，运行带有守护进程安装的新手引导，然后在模型/身份验证步骤中选择 xAI/Grok OAuth 选项：

    ```bash
    openclaw onboard --install-daemon
    ```

    在 VPS 或通过 SSH 上，在引导过程中使用 device-code：

    ```bash
    openclaw onboard --install-daemon --auth-choice xai-device-code
    ```OAuthAPIOpenClawOpenClawOAuth

    OAuth 不需要 xAI API 密钥。OpenClaw 不需要 Grok
    Build 应用。xAI 可能仍会将同意应用标记为 Grok Build，因为
    OpenClaw 使用 xAI 的共享 OAuth 客户端。

  </Step>
  <Step title="Existing OpenClaw install">
    如果已配置 OpenClaw，请仅登录 xAI。不要为了连接 Grok 而重新运行完整的
    新手引导或重新安装守护程序：

    ```bash
    openclaw models auth login --provider xai --method oauth
    ```

    当 Gateway(网关) 通过 SSH、Docker 或
    VPS 运行，且本地主机浏览器回调不便时，请改用设备代码流程：

    ```bash
    openclaw models auth login --provider xai --device-code
    ```

    要在登录后将 Grok 设为默认模型，请单独应用：

    ```bash
    openclaw models set xai/grok-4.3
    ```

    仅当您有意更改 Gateway(网关)、
    守护程序、渠道、工作区或其他设置选项时，才重新运行完整的新手引导。

  </Step>
  <Step title="API-key path">
    API 密钥设置仍适用于 xAI Console 密钥以及需要
    密钥支持提供商配置的媒体表面：

    ```bash
    openclaw models auth login --provider xai --method api-key
    export XAI_API_KEY=xai-...
    ```

  </Step>
  <Step title="Pick a 模型">
    ```json5
    {
      agents: { defaults: { model: { primary: "xai/grok-4.3" } } },
    }
    ```
  </Step>
</Steps>

<Note>
  OpenClaw 使用 xAI Responses API 作为捆绑的 xAI 传输方式。来自 `openclaw models auth login --provider xai --method oauth`、 `openclaw models auth login --provider xai --device-code` 或 `openclaw models auth login --provider xai --method api-key` 的相同凭据也可为一流的 `x_search`、远程 `code_execution` 以及 xAI 图像/视频生成提供支持。 语音和转录目前需要 `XAI_API_KEY` 或提供商配置。 `XAI_API_KEY`
  或插件网络搜索配置也可以为 Grok 支持的 `web_search` 提供支持。 如果您在 `plugins.entries.xai.config.webSearch.apiKey` 下存储 xAI 密钥， 捆绑的 xAI 模型提供商也会将该密钥作为回退重用。 设置 `plugins.entries.xai.config.webSearch.baseUrl` 以通过运营商 xAI Responses 代理路由 Grok `web_search` 并且，默认情况下，也路由 `x_search`。 `code_execution` 调整位于 `plugins.entries.xai.config.codeExecution`
  下。
</Note>

## OAuth 故障排除

- 如果浏览器 OAuth 无法连接到 OAuth`127.0.0.1:56121`，请使用
  `openclaw models auth login --provider xai --device-code`。
- 如果登录成功但 Grok 不是默认模型，请运行
  `openclaw models set xai/grok-4.3`。
- 要检查已保存的 xAI 身份验证配置文件，请运行：

  ```bash
  openclaw models auth list --provider xai
  openclaw models status
  ```

- xAI 决定哪些帐户可以接收 OAuth API 令牌。如果帐户不符合条件，
  请尝试使用 API 密钥路径或在 xAI 端检查订阅。

<Tip>从 SSH、Docker 或 VPS 登录时，请使用 `xai-device-code`DockerOpenClaw。OpenClaw 会打印一个 xAI URL 和短代码；在本地浏览器中完成登录，同时 远程进程轮询 xAI 以获取完成的令牌交换。</Tip>

## 内置目录

OpenClaw 默认包含当前的 xAI 聊天模型，在模型选择器中按从新到旧排序：

| 系列           | 模型 ID                                                                  |
| -------------- | ------------------------------------------------------------------------ |
| Grok 4.3       | `grok-4.3`                                                               |
| Grok 4.20 Beta | `grok-4.20-beta-latest-reasoning`, `grok-4.20-beta-latest-non-reasoning` |

该插件仍然为现有配置前向解析旧的 Grok 3、Grok 4、Grok 4 Fast、Grok 4.1
Fast 和 Grok Code 标识，但 OpenClaw 不再在可选目录中显示
那些已停用的上游标识。

<Tip>除非您明确需要 Grok 4.20 beta 别名，否则请在新聊天和编码工作负载中使用 `grok-4.3`。</Tip>

## OpenClaw 功能覆盖

捆绑插件将 xAI 当前的公共 API 表面映射到 OpenClaw 的共享
提供商和工具合约。不符合共享合约的功能
（例如流式 TTS 和实时语音）不会公开 - 请参阅下表。

| xAI 功能         | OpenClaw 表面                          | 状态                                             |
| ---------------- | -------------------------------------- | ------------------------------------------------ |
| 聊天 / 响应      | `xai/<model>` 模型提供商               | 是                                               |
| 服务器端网络搜索 | `web_search` 提供商 `grok`             | 是                                               |
| 服务器端 X 搜索  | `x_search` 工具                        | 是                                               |
| 服务器端代码执行 | `code_execution` 工具                  | 是                                               |
| 图片             | `image_generate`                       | 是                                               |
| 视频             | `video_generate`                       | 是                                               |
| 批量文本转语音   | `messages.tts.provider: "xai"` / `tts` | 是                                               |
| 流式 TTS         | -                                      | 未公开；OpenClaw 的 TTS 协议返回完整的音频缓冲区 |
| 批处理语音转文本 | `tools.media.audio` / 媒体理解         | 是                                               |
| 流式语音转文本   | 语音通话 `streaming.provider: "xai"`   | 是                                               |
| 实时语音         | -                                      | 尚未公开；不同的 会话/WebSocket 协议             |
| 文件 / 批次      | 仅兼容通用模型 API                     | 不是一等 OpenClaw 工具                           |

<Note>OpenClaw 使用 xAI 的 REST image/video/TTS/STT API 进行媒体生成、 语音和批处理转录，使用 xAI 的流式 STT WebSocket 进行实时 语音通话转录，以及使用 Responses API 处理模型、搜索和 代码执行工具。需要不同 OpenClaw 协议的功能，例如 实时语音会话，在此处记录为上游能力，而不是 隐藏的插件行为。</Note>

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

旧版别名仍会规范化为规范的捆绑 ID：

| 旧版别名                  | 规范 ID                               |
| ------------------------- | ------------------------------------- |
| `grok-4-fast-reasoning`   | `grok-4-fast`                         |
| `grok-4-1-fast-reasoning` | `grok-4-1-fast`                       |
| `grok-4.20-reasoning`     | `grok-4.20-beta-latest-reasoning`     |
| `grok-4.20-non-reasoning` | `grok-4.20-beta-latest-non-reasoning` |

## 功能

<AccordionGroup>
  <Accordion title="Web 搜索">
    捆绑的 `grok` 网络搜索提供商可以使用 `XAI_API_KEY` 或插件
    网络搜索密钥：

    ```bash
    openclaw config set tools.web.search.provider grok
    ```

  </Accordion>

  <Accordion title="视频生成">
    捆绑的 `xai` 插件通过共享的 `video_generate` 工具注册视频生成功能。

    - 默认视频模型：`xai/grok-imagine-video`
    - 模式：text-to-video、image-to-video、参考图像生成、远程视频编辑和远程视频扩展
    - 纵横比：`1:1`、`16:9`、`9:16`、`4:3`、`3:4`、`3:2`、`2:3`
    - 分辨率：`480P`、`720P`
    - 时长：生成/图像转视频为 1-15 秒，使用 `reference_image` 角色时为 1-10 秒，扩展为 2-10 秒
    - 参考图像生成：为每个提供的图像将 `imageRoles` 设置为 `reference_image`；xAI 接受最多 7 张此类图像

    <Warning>
    不接受本地视频缓冲区。请使用远程 `http(s)` URL 作为视频编辑/扩展输入。图像转视频接受本地图像缓冲区，因为 OpenClaw 可以将其编码为 xAI 的数据 URL。
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
    - 附加模型：`xai/grok-imagine-image-quality`
    - 模式：文生图和参考图像编辑
    - 参考输入：一个 `image` 或最多五个 `images`
    - 纵横比：`1:1`、`16:9`、`9:16`、`4:3`、`3:4`、`2:3`、`3:2`
    - 分辨率：`1K`、`2K`
    - 数量：最多 4 张图片

    OpenClaw 向 xAI 请求 `b64_json` 图像响应，以便生成的媒体可以通过正常的渠道附件路径进行存储和传递。本地参考图像会被转换为数据 URL；远程 `http(s)` 引用则会被直接传递。

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
    xAI 文档中还记录了 `quality`、`mask`、`user` 以及其他原生比例，例如 `1:2`、`2:1`、`9:20` 和 `20:9`。OpenClaw 目前仅转发跨提供商共享的图像控制选项；不支持的原生专属选项故意未通过 `image_generate` 暴露。
    </Note>

  </Accordion>

  <Accordion title="Text-to-speech">
    捆绑的 `xai` 插件通过共享的 `tts` 提供商表面注册文本转语音功能。

    - Voices: `eve`, `ara`, `rex`, `sal`, `leo`, `una`
    - Default voice: `eve`
    - Formats: `mp3`, `wav`, `pcm`, `mulaw`, `alaw`
    - Language: BCP-47 code or `auto`
    - Speed: 提供商原生速度覆盖
    - 不支持原生 Opus 语音笔记格式

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
    ```

    <Note>
    OpenClaw 使用 xAI 的批处理 `/v1/tts` 端点。xAI 还通过 WebSocket 提供流式 TTS，但 OpenClaw 语音提供商合约目前要求在回复传递之前提供完整的音频缓冲区。
    </Note>

  </Accordion>

  <Accordion title="Speech-to-text">
    捆绑的 `xai` 插件通过 OpenClaw 的媒体理解转录表面注册批处理语音转文本功能。

    - Default 模型: `grok-stt`
    - Endpoint: xAI REST `/v1/stt`
    - Input path: 多部分音频文件上传
    - 支持由 OpenClaw 在任何使用 `tools.media.audio` 的传入音频转录场景中使用，包括 Discord 语音频道片段和频道音频附件

    要强制对传入音频转录使用 xAI：

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

    可以通过共享的音频媒体配置或每次调用的转录请求提供语言。共享的 OpenClaw 表面接受提示词提示，但 xAI REST STT 集成仅转发文件、模型和语言，因为它们能干净地映射到当前的公共 xAI 端点。

  </Accordion>

  <Accordion title="流式语音转文字">
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
    Discord 语音目前录制短片段，并改用批量
    `tools.media.audio` 转录路径。
    </Note>

  </Accordion>

  <Accordion title="x_search configuration">
    内置的 xAI 插件将 `x_search`OpenClaw 暴露为 OpenClaw 工具，用于通过 Grok 搜索
    X（前身为 Twitter）内容。

    配置路径：`plugins.entries.xai.config.xSearch`

    | Key                | Type    | Default            | Description                          |
    | ------------------ | ------- | ------------------ | ------------------------------------ |
    | `enabled`          | boolean | -                  | 启用或禁用 x_search           |
    | `model`            | string  | `grok-4-1-fast`    | 用于 x_search 请求的模型     |
    | `baseUrl`          | string  | -                  | xAI Responses 基础 URL 覆盖      |
    | `inlineCitations`  | boolean | -                  | 在结果中包含内联引用  |
    | `maxTurns`         | number  | -                  | 最大对话轮数           |
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

  <Accordion title="Code execution configuration">
    内置的 xAI 插件将 `code_execution`OpenClaw 暴露为 OpenClaw 工具，用于在 xAI 的沙盒环境中
    执行远程代码。

    配置路径：`plugins.entries.xai.config.codeExecution`

    | Key               | Type    | Default            | Description                              |
    | ----------------- | ------- | ------------------ | ---------------------------------------- |
    | `enabled`         | boolean | `true` (if key available) | 启用或禁用代码执行  |
    | `model`           | string  | `grok-4-1-fast`    | 用于代码执行请求的模型   |
    | `maxTurns`        | number  | -                  | 最大对话轮数               |
    | `timeoutSeconds`  | number  | -                  | 请求超时时间（秒）               |

    <Note>
    这是远程 xAI 沙盒执行，而不是本地 [`exec`](/zh/tools/exec)。
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

<Accordion title="已知限制" APIOAuthOAuthOAuth>
  - xAI 身份验证可以使用 API 密钥、环境变量、插件配置回退、 浏览器 OAuth，或使用符合条件的 xAI 账户进行设备代码 OAuth。浏览器 OAuth 使用 `127.0.0.1:56121` 上的本地回调；对于远程主机，请使用 `xai-device-code`OAuthAPIOpenClaw，除非您想在打开登录 URL 之前转发该端口。xAI 决定哪些账户可以接收 OAuth API 令牌，并且 即使 OpenClaw 不需要 Grok Build 应用程序，同意页面也可能会显示 Grok Build。 -
  `grok-4.20-multi-agent-experimental-beta-0304`APIOpenClawOpenClaw 在 标准 xAI 提供商路径上不受支持，因为它需要与标准 OpenClaw xAI 传输 不同的上游 API 表面。 - xAI Realtime 语音尚未注册为 OpenClaw 提供商。它 需要不同于批量 STT 或 流式转录的双向语音会话合约。 - xAI 图像 `quality`、图像 `mask` 和额外的仅限本机纵横比在 共享 `image_generate` 工具具有相应的 跨提供商控制之前，不会公开。
</Accordion>

  <Accordion title="高级说明"OpenClaw>
    - OpenClaw 会在共享运行路径上自动应用针对 xAI 的工具架构和工具调用兼容性修复。
    - 原生 xAI 请求默认为 `tool_stream: true`。设置
      `agents.defaults.models["xai/<model>"].params.tool_stream` 为 `false` 即可
      禁用它。
    - 捆绑的 xAI 包装器在发送原生 xAI 请求之前会剥离不支持的工具架构严格标志和推理负载键。
    - `web_search`、`x_search` 和 `code_execution`OpenClawOpenClaw 作为 OpenClaw
      工具被公开。OpenClaw 会在每个工具请求中启用其所需的特定 xAI 内置功能，而不是将所有原生工具附加到每个对话轮次中。
    - Grok `web_search` 读取 `plugins.entries.xai.config.webSearch.baseUrl`。
      `x_search` 读取 `plugins.entries.xai.config.xSearch.baseUrl`，然后
      回退到 Grok 网络搜索基础 URL。
    - `x_search` 和 `code_execution` 由捆绑的 xAI 插件拥有，而不是硬编码到核心模型运行时中。
    - `code_execution` 是远程 xAI 沙箱执行，而非本地
      [`exec`](/zh/tools/exec)。
  </Accordion>
</AccordionGroup>

## 实时测试

xAI 媒体路径由单元测试和可选的实时测试套件覆盖。在运行实时探测之前，在进程环境中导出
`XAI_API_KEY`。

```bash
pnpm test extensions/xai
OPENCLAW_LIVE_TEST=1 OPENCLAW_LIVE_TEST_QUIET=1 pnpm test:live -- extensions/xai/xai.live.test.ts
OPENCLAW_LIVE_TEST=1 OPENCLAW_LIVE_TEST_QUIET=1 OPENCLAW_LIVE_IMAGE_GENERATION_PROVIDERS=xai pnpm test:live -- test/image-generation.runtime.live.test.ts
```

特定于提供商的实时文件会合成正常的 TTS、电话友好的 PCM
TTS，通过 xAI 批量 STT 转录音频，通过 xAI
实时 STT 流式传输相同的 PCM，生成文本到图像输出，并编辑参考图像。共享图像实时文件通过 OpenClaw 的
运行时选择、回退、规范化和媒体附件路径来验证同一个 xAI 提供商。

## 相关

<CardGroup cols={2}>
  <Card title="模型选择" href="/zh/concepts/model-providers" icon="layers">
    选择提供商、模型引用和故障转移行为。
  </Card>
  <Card title="视频生成" href="/zh/tools/video-generation" icon="video">
    共享视频工具参数和提供商选择。
  </Card>
  <Card title="所有提供商" href="/zh/providers/index" icon="grid-2">
    更广泛的提供商概述。
  </Card>
  <Card title="故障排除" href="/zh/help/troubleshooting" icon="wrench">
    常见问题和修复方法。
  </Card>
</CardGroup>
