---
summary: "Google Gemini 设置（API 密钥 + OAuth，图像生成，媒体理解，TTS，网页搜索）"
title: "Google (Gemini)"
read_when:
  - You want to use Google Gemini models with OpenClaw
  - You need the API key or OAuth auth flow
---

Google 插件通过 Google AI Studio 提供对 Gemini 模型的访问，此外还提供图像生成、媒体理解（图像/音频/视频）、文本转语音以及通过 Gemini Grounding 进行的网页搜索。

- 提供商：`google`
- 身份验证：`GEMINI_API_KEY` 或 `GOOGLE_API_KEY`
- API：Google Gemini API
- 运行时选项：`agents.defaults.agentRuntime.id: "google-gemini-cli"`
  在保持模型引用规范为 `google/*` 的同时，重用 Gemini CLI OAuth。

## 入门指南

选择您首选的身份验证方法并按照设置步骤操作。

<Tabs>
  <Tab title="API 密钥">
    **最适用于：** 通过 Google AI Studio 进行标准 Gemini API 访问。

    <Steps>
      <Step title="运行新手引导">
        ```bash
        openclaw onboard --auth-choice gemini-api-key
        ```

        或直接传递密钥：

        ```bash
        openclaw onboard --non-interactive \
          --mode local \
          --auth-choice gemini-api-key \
          --gemini-api-key "$GEMINI_API_KEY"
        ```
      </Step>
      <Step title="设置默认模型">
        ```json5
        {
          agents: {
            defaults: {
              model: { primary: "google/gemini-3.1-pro-preview" },
            },
          },
        }
        ```
      </Step>
      <Step title="验证模型是否可用">
        ```bash
        openclaw models list --provider google
        ```
      </Step>
    </Steps>

    <Tip>
    环境变量 `GEMINI_API_KEY` 和 `GOOGLE_API_KEY` 均可接受。使用您已经配置好的那个即可。
    </Tip>

  </Tab>

  <Tab title="Gemini CLI (OAuth)">
    **Best for:** 重用现有的 Gemini CLI 登录（通过 PKCE OAuth），而不是使用单独的 API 密钥。

    <Warning>
    `google-gemini-cli` 提供商是非官方集成。一些用户报告通过这种方式使用 OAuth 时会遇到账户限制。使用风险自负。
    </Warning>

    <Steps>
      <Step title="Install the Gemini CLI">
        本地 `gemini` 命令必须在 `PATH` 上可用。

        ```bash
        # Homebrew
        brew install gemini-cli

        # or npm
        npm install -g @google/gemini-cli
        ```

        OpenClaw 支持通过 Homebrew 安装和全局 npm 安装，包括常见的 Windows/npm 布局。
      </Step>
      <Step title="Log in via OAuth">
        ```bash
        openclaw models auth login --provider google-gemini-cli --set-default
        ```
      </Step>
      <Step title="Verify the 模型 is available">
        ```bash
        openclaw models list --provider google
        ```
      </Step>
    </Steps>

    - Default 模型: `google/gemini-3.1-pro-preview`
    - Runtime: `google-gemini-cli`
    - Alias: `gemini-cli`

    **Environment variables:**

    - `OPENCLAW_GEMINI_OAUTH_CLIENT_ID`
    - `OPENCLAW_GEMINI_OAUTH_CLIENT_SECRET`

    (Or the `GEMINI_CLI_*` variants.)

    <Note>
    If Gemini CLI OAuth requests fail after login, set `GOOGLE_CLOUD_PROJECT` or
    `GOOGLE_CLOUD_PROJECT_ID` on the gateway host and retry.
    </Note>

    <Note>
    If login fails before the browser flow starts, make sure the local `gemini`
    command is installed and on `PATH`.
    </Note>

    `google-gemini-cli/*` 模型 refs are legacy compatibility aliases. New
    configs should use `google/*` 模型 refs plus the `google-gemini-cli`
    runtime when they want local Gemini CLI execution.

  </Tab>
</Tabs>

## 功能

| 功能                 | 支持                         |
| -------------------- | ---------------------------- |
| 聊天补全             | 是                           |
| 图像生成             | 是                           |
| 音乐生成             | 是                           |
| 文本转语音           | 是                           |
| 实时语音             | 是 (Google Live API)         |
| 图像理解             | 是                           |
| 音频转录             | 是                           |
| 视频理解             | 是                           |
| 网络搜索 (Grounding) | 是                           |
| 思考/推理            | 是 (Gemini 2.5+ / Gemini 3+) |
| Gemma 4 模型         | 是                           |

<Tip>
Gemini 3 模型使用 `thinkingLevel` 而不是 `thinkingBudget`。OpenClaw 将
Gemini 3、Gemini 3.1 和 `gemini-*-latest` 别名推理控制映射到
`thinkingLevel`，因此默认/低延迟运行不会发送已禁用的
`thinkingBudget` 值。

`/think adaptive` 保持 Google 的动态思考语义，而不是选择
固定的 OpenClaw 级别。Gemini 3 和 Gemini 3.1 省略了固定的 `thinkingLevel`，以便
Google 可以选择级别；Gemini 2.5 发送 Google 的动态哨兵
`thinkingBudget: -1`。

Gemma 4 模型（例如 `gemma-4-26b-a4b-it`）支持思考模式。OpenClaw
将 `thinkingBudget` 重写为 Gemma 4 支持的 Google `thinkingLevel`。
将思考设置为 `off` 会保持思考禁用状态，而不是映射到
`MINIMAL`。

</Tip>

## 图像生成

捆绑的 `google` 图像生成提供商默认为
`google/gemini-3.1-flash-image-preview`。

- 还支持 `google/gemini-3-pro-image-preview`
- 生成：每个请求最多生成 4 张图像
- 编辑模式：已启用，最多 5 张输入图像
- 几何控制：`size`、`aspectRatio` 和 `resolution`

要将 Google 用作默认图像提供商：

```json5
{
  agents: {
    defaults: {
      imageGenerationModel: {
        primary: "google/gemini-3.1-flash-image-preview",
      },
    },
  },
}
```

<Note>有关共享工具参数、提供商选择和故障转移行为，请参阅 [图像生成](/zh/tools/image-generation)。</Note>

## 视频生成

捆绑的 `google` 插件还通过共享的
`video_generate` 工具注册视频生成。

- 默认视频模型：`google/veo-3.1-fast-generate-preview`
- 模式：文本生成视频、图像生成视频以及单视频参考流程
- 支持 `aspectRatio`、`resolution` 和 `audio`
- 当前时长限制：**4 到 8 秒**

要将 Google 用作默认视频提供商：

```json5
{
  agents: {
    defaults: {
      videoGenerationModel: {
        primary: "google/veo-3.1-fast-generate-preview",
      },
    },
  },
}
```

<Note>有关共享工具参数、提供商选择和故障转移行为，请参阅[视频生成](/zh/tools/video-generation)。</Note>

## 音乐生成

捆绑的 `google` 插件还通过共享 `music_generate` 工具注册音乐生成。

- 默认音乐模型：`google/lyria-3-clip-preview`
- 也支持 `google/lyria-3-pro-preview`
- 提示控制：`lyrics` 和 `instrumental`
- 输出格式：默认为 `mp3`，加上 `google/lyria-3-pro-preview` 上的 `wav`
- 参考输入：最多 10 张图片
- Session-backed runs detach through the shared task/status flow, including `action: "status"`

To use Google as the default music 提供商:

```json5
{
  agents: {
    defaults: {
      musicGenerationModel: {
        primary: "google/lyria-3-clip-preview",
      },
    },
  },
}
```

<Note>See [Music Generation](/zh/tools/music-generation) for shared 工具 parameters, 提供商 selection, and failover behavior.</Note>

## Text-to-speech

The bundled `google` speech 提供商 uses the Gemini API TTS path with
`gemini-3.1-flash-tts-preview`.

- Default voice: `Kore`
- Auth: `messages.tts.providers.google.apiKey`, `models.providers.google.apiKey`, `GEMINI_API_KEY`, or `GOOGLE_API_KEY`
- Output: WAV for regular TTS attachments, Opus for voice-note targets, PCM for Talk/telephony
- Voice-note output: Google PCM is wrapped as WAV and transcoded to 48 kHz Opus with `ffmpeg`

To use Google as the default TTS 提供商:

```json5
{
  messages: {
    tts: {
      auto: "always",
      provider: "google",
      providers: {
        google: {
          model: "gemini-3.1-flash-tts-preview",
          voiceName: "Kore",
          audioProfile: "Speak professionally with a calm tone.",
        },
      },
    },
  },
}
```

Gemini API TTS 使用自然语言提示来控制风格。设置
`audioProfile` 以在口语文本前附加可重用的风格提示。当您的提示文本涉及指定说话者时，请设置
`speakerName`。

Gemini API TTS 还接受文本中的富有表现力的方括号音频标签，
例如 `[whispers]` 或 `[laughs]`。为了将标签发送到 TTS 的同时使其不出现在可见的聊天回复中，请将它们放在 `[[tts:text]]...[[/tts:text]]`
块中：

```text
Here is the clean reply text.

[[tts:text]][whispers] Here is the spoken version.[[/tts:text]]
```

<Note>仅限于 Gemini API 的 Google Cloud Console API 密钥对此提供商有效。这并非单独的 Cloud Text-to-Speech API 路径。</Note>

## 实时语音

捆绑的 `google` 插件注册了一个由 Gemini Live API 支持的实时语音提供商，用于语音通话和 Google Meet 等后端音频桥接。

| 设置           | 配置路径                                                            | 默认值                                                                         |
| -------------- | ------------------------------------------------------------------- | ------------------------------------------------------------------------------ |
| 模型           | `plugins.entries.voice-call.config.realtime.providers.google.model` | `gemini-2.5-flash-native-audio-preview-12-2025`                                |
| 语音           | `...google.voice`                                                   | `Kore`                                                                         |
| Temperature    | `...google.temperature`                                             | (未设置)                                                                       |
| VAD 开始灵敏度 | `...google.startSensitivity`                                        | (未设置)                                                                       |
| VAD 结束灵敏度 | `...google.endSensitivity`                                          | (未设置)                                                                       |
| 静音持续时间   | `...google.silenceDurationMs`                                       | (未设置)                                                                       |
| 活动处理       | `...google.activityHandling`                                        | Google 默认， `start-of-activity-interrupts`                                   |
| 轮次覆盖率     | `...google.turnCoverage`                                            | Google 默认， `only-activity`                                                  |
| 禁用自动 VAD   | `...google.automaticActivityDetectionDisabled`                      | `false`                                                                        |
| API 密钥       | `...google.apiKey`                                                  | 回退到 `models.providers.google.apiKey`、 `GEMINI_API_KEY` 或 `GOOGLE_API_KEY` |

语音通话实时配置示例：

```json5
{
  plugins: {
    entries: {
      "voice-call": {
        enabled: true,
        config: {
          realtime: {
            enabled: true,
            provider: "google",
            providers: {
              google: {
                model: "gemini-2.5-flash-native-audio-preview-12-2025",
                voice: "Kore",
                activityHandling: "start-of-activity-interrupts",
                turnCoverage: "only-activity",
              },
            },
          },
        },
      },
    },
  },
}
```

<Note>
  Google Live API 通过 WebSocket 使用双向音频和函数调用。 OpenClaw 将电话/Meet 桥接音频适配到 Gemini 的 PCM Live API 流，并 在共享的实时语音协议上保留工具调用。除非您需要采样更改，否则请保持 `temperature` 未设置；OpenClaw 会省略非正值， 因为 Google Live 可以在 `temperature: 0` 的情况下返回不带音频的转录文本。 Gemini API 转录功能在不需要 `languageCodes` 的情况下已启用；当前的 Google SDK 会拒绝此
  API 路径上的语言代码提示。
</Note>

<Note>Control UI Talk 支持使用受限的一次性令牌进行 Google Live 浏览器会话。 仅后端的实时语音提供商也可以通过通用的 Gateway(网关) 中继传输运行， 该传输将提供商凭据保留在 Gateway(网关) 上。</Note>

要进行维护者实时验证，请运行
`OPENAI_API_KEY=... GEMINI_API_KEY=... node --import tsx scripts/dev/realtime-talk-live-smoke.ts`。
Google 端会生成与 Control UI Talk 使用的相同的受限 Live API 令牌形状，
打开浏览器 WebSocket 端点，发送初始设置负载，
并等待 `setupComplete`。

## 高级配置

<AccordionGroup>
  <Accordion title="直接复用 Gemini 缓存">
    对于直接的 Gemini API 运行 (`api: "google-generative-ai"`)，OpenClaw 会将配置的 `cachedContent` 句柄传递给 Gemini 请求。

    - 使用 `cachedContent` 或传统的 `cached_content` 配置特定模型或全局参数
    - 如果两者都存在，则以 `cachedContent` 为准
    - 示例值：`cachedContents/prebuilt-context`
    - Gemini 缓存命中的使用量已从上游 `cachedContentTokenCount` 规范化为 OpenClaw `cacheRead`

    ```json5
    {
      agents: {
        defaults: {
          models: {
            "google/gemini-2.5-pro": {
              params: {
                cachedContent: "cachedContents/prebuilt-context",
              },
            },
          },
        },
      },
    }
    ```

  </Accordion>

  <Accordion title="Gemini CLI JSON 使用说明">
    当使用 `google-gemini-cli` OAuth 提供商时，OpenClaw 会按以下方式规范 CLI JSON 输出：

    - 回复文本来自 CLI JSON `response` 字段。
    - 当 CLI 将 `usage` 留空时，使用量将回退到 `stats`。
    - `stats.cached` 被规范为 OpenClaw `cacheRead`。
    - 如果缺少 `stats.input`，OpenClaw 会从 `stats.input_tokens - stats.cached` 推导输入 token。

  </Accordion>

  <Accordion title="Environment and daemon setup">
    如果 Gateway(网关) 作为守护进程 运行，请确保 `GEMINI_API_KEY` 对该进程可用（例如，在 `~/.openclaw/.env` 中或通过 `env.shellEnv`）。
  </Accordion>
</AccordionGroup>

## 相关

<CardGroup cols={2}>
  <Card title="模型选择" href="/zh/concepts/model-providers" icon="layers">
    选择提供商、模型引用和故障转移行为。
  </Card>
  <Card title="图像生成" href="/zh/tools/image-generation" icon="image">
    共享图像工具参数和提供商选择。
  </Card>
  <Card title="视频生成" href="/zh/tools/video-generation" icon="video">
    共享视频工具参数和提供商选择。
  </Card>
  <Card title="音乐生成" href="/zh/tools/music-generation" icon="music">
    共享音乐工具参数和提供商选择。
  </Card>
</CardGroup>
