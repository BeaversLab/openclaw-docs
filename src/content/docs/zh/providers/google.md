---
summary: "APIOAuthGoogle Gemini 设置（API 密钥 + OAuth、图像生成、媒体理解、TTS、网络搜索）"
title: "Google (Gemini)"
read_when:
  - You want to use Google Gemini models with OpenClaw
  - You need the API key or OAuth auth flow
---

Google 插件通过 Google AI Studio 提供对 Gemini 模型的访问，此外还提供图像生成、媒体理解（图像/音频/视频）、文本转语音以及通过 Gemini Grounding 进行的网页搜索。

- 提供商：`google`
- 认证：`GEMINI_API_KEY` 或 `GOOGLE_API_KEY`
- API：Google Gemini API
- 运行时选项：提供商/模型 `agentRuntime.id: "google-gemini-cli"`CLIOAuth
  复用 Gemini CLI OAuth，同时保持模型引用为 `google/*` 规范形式。

## 入门指南

选择您首选的身份验证方法并按照设置步骤操作。

<Tabs>
  <Tab title="APIAPI 密钥"API>
    **最适用于：** 通过 Google AI Studio 进行标准 Gemini API 访问。

    <Steps>
      <Step title="运行新手引导">
        ```bash
        openclaw onboard --auth-choice gemini-api-key
        ```

        或者直接传入密钥：

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
      <Step title="验证模型可用">
        ```bash
        openclaw models list --provider google
        ```
      </Step>
    </Steps>

    <Tip>
    环境变量 `GEMINI_API_KEY` 和 `GOOGLE_API_KEY` 均被接受。使用您已配置的任意一个即可。
    </Tip>

  </Tab>

  <Tab title="CLIOAuthGemini CLI (OAuth)"CLIOAuthAPI>
    **最适用于：** 通过 PKCE OAuth 复用现有的 Gemini CLI 登录，而不是使用单独的 API 密钥。

    <Warning>
    `google-gemini-cli`OAuth 提供商是一个非官方集成。一些用户报告
    以这种方式使用 OAuth 时会遇到账户限制。使用风险自负。
    </Warning>

    <Steps>
      <Step title="CLI安装 Gemini CLI">
        本地 `gemini` 命令必须在 `PATH` 上可用。

        ```bash
        # Homebrew
        brew install gemini-cli

        # or npm
        npm install -g @google/gemini-cli
        ```OpenClawnpmWindowsnpm

        OpenClaw 支持 Homebrew 安装和全局 npm 安装，包括
        常见的 Windows/npm 布局。
      </Step>
      <Step title="OAuth通过 OAuth 登录">
        ```bash
        openclaw models auth login --provider google-gemini-cli --set-default
        ```
      </Step>
      <Step title="验证模型是否可用">
        ```bash
        openclaw models list --provider google
        ```
      </Step>
    </Steps>

    - 默认模型：`google/gemini-3.1-pro-preview`
    - 运行时：`google-gemini-cli`
    - 别名：`gemini-cli`API

    Gemini 3.1 Pro 的 Gemini API 模型 ID 是 `gemini-3.1-pro-preview`OpenClaw。OpenClaw 接受较短的 `google/gemini-3.1-pro` 作为便利别名，并在提供商调用之前对其进行规范化。

    **环境变量：**

    - `OPENCLAW_GEMINI_OAUTH_CLIENT_ID`
    - `OPENCLAW_GEMINI_OAUTH_CLIENT_SECRET`

    （或 `GEMINI_CLI_*`CLIOAuth 变体。）

    <Note>
    如果 Gemini CLI OAuth 请求在登录后失败，请在网关主机上设置 `GOOGLE_CLOUD_PROJECT` 或
    `GOOGLE_CLOUD_PROJECT_ID` 并重试。
    </Note>

    <Note>
    如果登录在浏览器流程开始之前失败，请确保本地 `gemini`
    命令已安装并在 `PATH` 上。
    </Note>

    `google-gemini-cli/*` 模型引用是旧版兼容性别名。当需要进行本地 Gemini CLI
    执行时，新配置应使用 `google/*` 模型引用加上 `google-gemini-cli`CLI
    运行时。

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

## 网络搜索

内置的 `gemini` 网络搜索提供商使用 Gemini Google Search 接地功能。
在 `plugins.entries.google.config.webSearch` 下配置专用搜索密钥，
或者在 `GEMINI_API_KEY` 后让其重用 `models.providers.google.apiKey`：

```json5
{
  plugins: {
    entries: {
      google: {
        config: {
          webSearch: {
            apiKey: "AIza...", // optional if GEMINI_API_KEY or models.providers.google.apiKey is set
            baseUrl: "https://generativelanguage.googleapis.com/v1beta", // falls back to models.providers.google.baseUrl
            model: "gemini-2.5-flash",
          },
        },
      },
    },
  },
}
```

凭据优先级为专用 `webSearch.apiKey`，然后是 `GEMINI_API_KEY`，
再是 `models.providers.google.apiKey`。`webSearch.baseUrl` 是可选的，
用于运营商代理或兼容的 Gemini API 端点；如果省略，
Gemini 网络搜索将重用 `models.providers.google.baseUrl`。有关提供商特定的
工具行为，请参阅 [Gemini search](/zh/tools/gemini-search)。

<Tip>
Gemini 3 模型使用 `thinkingLevel` 而不是 `thinkingBudget`。OpenClaw 会将
Gemini 3、Gemini 3.1 和 `gemini-*-latest` 别名推理控件映射到
`thinkingLevel`，因此默认/低延迟运行不会发送已禁用的
`thinkingBudget` 值。

`/think adaptive` 保持 Google 的动态思考语义，而不是选择
固定的 OpenClaw 级别。Gemini 3 和 Gemini 3.1 省略了固定的 `thinkingLevel`，以便
Google 可以选择级别；Gemini 2.5 发送 Google 的动态哨兵
`thinkingBudget: -1`。

Gemma 4 模型（例如 `gemma-4-26b-a4b-it`）支持思考模式。OpenClaw
会将 `thinkingBudget` 重写为 Gemma 4 支持的 Google `thinkingLevel`。
将 thinking 设置为 `off` 会保持思考禁用，而不是映射到
`MINIMAL`。

</Tip>

## 图像生成

内置的 `google` 图像生成提供商默认使用
`google/gemini-3.1-flash-image-preview`。

- 也支持 `google/gemini-3-pro-image-preview`
- 生成：每个请求最多生成 4 张图像
- 编辑模式：已启用，最多 5 张输入图像
- 几何控件：`size`、`aspectRatio` 和 `resolution`

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

<Note>请参阅 [图像生成](/zh/tools/image-generation) 了解共享工具参数、提供商选择和故障转移行为。</Note>

## 视频生成

捆绑的 `google` 插件还通过共享 `video_generate` 工具注册了视频生成功能。

- 默认视频模型：`google/veo-3.1-fast-generate-preview`
- 模式：文本生成视频、图像生成视频以及单视频参考流
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

<Note>请参阅 [视频生成](/zh/tools/video-generation) 了解共享工具参数、提供商选择和故障转移行为。</Note>

## 音乐生成

捆绑的 `google` 插件还通过共享 `music_generate` 工具注册了音乐生成功能。

- 默认音乐模型：`google/lyria-3-clip-preview`
- 也支持 `google/lyria-3-pro-preview`
- 提示词控制：`lyrics` 和 `instrumental`
- 输出格式：默认为 `mp3`，在 `google/lyria-3-pro-preview` 上还支持 `wav`
- 参考输入：最多 10 张图像
- 基于会话的运行通过共享任务/状态流分离，包括 `action: "status"`

要将 Google 用作默认音乐提供商：

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

<Note>请参阅 [音乐生成](/zh/tools/music-generation) 了解共享工具参数、提供商选择和故障转移行为。</Note>

## 文本转语音

捆绑的 `google` 语音提供商使用 Gemini API 的 API TTS 路径以及
`gemini-3.1-flash-tts-preview`。

- 默认语音：`Kore`
- 身份验证：`messages.tts.providers.google.apiKey`、`models.providers.google.apiKey`、`GEMINI_API_KEY` 或 `GOOGLE_API_KEY`
- 输出：常规 TTS 附件为 WAV，语音备忘录目标为 Opus，Talk/电话为 PCM
- 语音备忘录输出：Google PCM 被封装为 WAV，并使用 `ffmpeg` 转码为 48 kHz Opus

Google 的批处理 Gemini TTS 路径在已完成的 `generateContent` 响应中返回生成的音频。为了获得最低延迟的语音对话，请使用由 Gemini Live API 支持的 Google 实时语音提供商，而不是批处理 TTS。

要将 Google 用作默认 TTS 提供商：

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

Gemini API TTS 使用自然语言提示进行风格控制。设置 `audioProfile` 可在口语文本之前添加可重用的风格提示。当您的提示文本涉及到命名说话人时，请设置 `speakerName`。

Gemini API TTS 还接受文本中的富有表现力的方括号音频标签，例如 `[whispers]` 或 `[laughs]`。为了在将标签发送给 TTS 的同时将其从可见的聊天回复中排除，请将它们放在 `[[tts:text]]...[[/tts:text]]` 块中：

```text
Here is the clean reply text.

[[tts:text]][whispers] Here is the spoken version.[[/tts:text]]
```

<Note>限制为 Gemini API 的 Google Cloud Console API 密钥对此提供商有效。这不是单独的 Cloud Text-to-Speech API 路径。</Note>

## 实时语音

捆绑的 `google` 插件注册了一个由 Gemini Live API 支持的实时语音提供商，适用于后端音频桥，例如 Voice Call 和 Google Meet。

| 设置           | 配置路径                                                            | 默认值                                                                        |
| -------------- | ------------------------------------------------------------------- | ----------------------------------------------------------------------------- |
| 模型           | `plugins.entries.voice-call.config.realtime.providers.google.model` | `gemini-2.5-flash-native-audio-preview-12-2025`                               |
| 语音           | `...google.voice`                                                   | `Kore`                                                                        |
| Temperature    | `...google.temperature`                                             | (未设置)                                                                      |
| VAD 起始灵敏度 | `...google.startSensitivity`                                        | (未设置)                                                                      |
| VAD 结束灵敏度 | `...google.endSensitivity`                                          | (未设置)                                                                      |
| 静音持续时间   | `...google.silenceDurationMs`                                       | (未设置)                                                                      |
| 活动处理       | `...google.activityHandling`                                        | Google 默认值，`start-of-activity-interrupts`                                 |
| 轮次覆盖       | `...google.turnCoverage`                                            | Google 默认值，`only-activity`                                                |
| 禁用自动 VAD   | `...google.automaticActivityDetectionDisabled`                      | `false`                                                                       |
| 会话恢复       | `...google.sessionResumption`                                       | `true`                                                                        |
| 上下文压缩     | `...google.contextWindowCompression`                                | `true`                                                                        |
| API key        | `...google.apiKey`                                                  | 回退到 `models.providers.google.apiKey`、`GEMINI_API_KEY` 或 `GOOGLE_API_KEY` |

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
  Google Live API 通过 WebSocket 使用双向音频和函数调用。 OpenClaw 将电话/会议桥接音频适配到 Gemini 的 PCM Live API 流， 并在共享的实时语音协议上保留工具调用。除非您需要更改采样，否则请保持 APIOpenClawAPI`temperature`OpenClaw 未设置； OpenClaw 会省略非正值，因为 Google Live 可以为 `temperature: 0`API 返回不带音频的转录内容。 Gemini API 转录无需 `languageCodes`API 即可启用；当前的 Google SDK
  会拒绝此 API 路径上的语言代码提示。
</Note>

<Note>Control UI Talk 支持使用受限的一次性令牌进行 Google Live 浏览器会话。 仅限后端的实时语音提供商也可以通过通用 Gateway(网关) 中继传输运行， 该传输将提供商凭据保留在 Gateway(网关) 上。</Note>

若要进行维护者实时验证，请运行
`OPENAI_API_KEY=... GEMINI_API_KEY=... node --import tsx scripts/dev/realtime-talk-live-smoke.ts`OpenAIAPI。
该测试还覆盖 OpenAI 后端/WebRTC 路径；Google 部分生成与 Control UI Talk 使用的相同的
受限 Live API 令牌形状，打开浏览器
WebSocket 端点，发送初始设置负载，并等待
`setupComplete`。

## 高级配置

<AccordionGroup>
  <Accordion title="Direct Gemini cache reuse"API>
    对于直接 Gemini API 调用（`api: "google-generative-ai"`OpenClaw），OpenClaw
    会将配置的 `cachedContent` 句柄传递给 Gemini 请求。

    - 使用 `cachedContent` 或传统的 `cached_content` 配置特定模型或全局参数
    - 如果两者同时存在，`cachedContent` 优先
    - 示例值：`cachedContents/prebuilt-context`OpenClaw
    - Gemini 缓存命中的使用情况会从上游 `cachedContentTokenCount` 规范化为 OpenClaw `cacheRead`

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

  <Accordion title="CLIGemini CLI JSON usage notes">
    使用 `google-gemini-cli`OAuthOpenClawCLICLI OAuth 提供商时，OpenClaw 会按如下方式规范化
    CLI JSON 输出：

    - 回复文本来自 CLI JSON 的 `response` 字段。
    - 当 CLI 将 `usage` 留空时，使用情况将回退到 `stats`CLI。
    - `stats.cached`OpenClaw 被规范化为 OpenClaw `cacheRead`。
    - 如果缺少 `stats.input`OpenClaw，OpenClaw 会根据 `stats.input_tokens - stats.cached` 推导输入 Token。

  </Accordion>

  <Accordion title="Environment and daemon setup"Gateway(网关)>
    如果 Gateway 作为守护进程（launchd/systemd）运行，请确保 `GEMINI_API_KEY`
    对该进程可用（例如，在 `~/.openclaw/.env` 中或通过
    `env.shellEnv`）。
  </Accordion>
</AccordionGroup>

## 相关

<CardGroup cols={2}>
  <Card title="Model selection" href="/zh/concepts/model-providers" icon="layers">
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
