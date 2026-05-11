---
summary: "入站图像/音频/视频理解（可选），支持提供商 + CLI 回退"
read_when:
  - Designing or refactoring media understanding
  - Tuning inbound audio/video/image preprocessing
title: "媒体理解"
sidebarTitle: "媒体理解"
---

OpenClaw 可以在回复管道运行之前**总结传入媒体**（图像/音频/视频）。它会自动检测本地工具或提供商密钥是否可用，并且可以被禁用或自定义。如果理解功能关闭，模型仍会照常接收原始文件/URL。

特定于提供商的媒体行为由供应商插件注册，而 OpenClaw 核心拥有共享的 `tools.media` 配置、回退顺序和回复管道集成。

## 目标

- 可选：将传入媒体预消化为简短文本，以加快路由速度 + 更好地解析命令。
- 保留向模型的原始媒体传递（始终）。
- 支持 **提供商 API** 和 **CLI 回退**。
- 允许多个具有有序回退（错误/大小/超时）的模型。

## 高级行为

<Steps>
  <Step title="Collect attachments">
    收集传入的附件 (`MediaPaths`, `MediaUrls`, `MediaTypes`)。
  </Step>
  <Step title="Select per-capability">
    对于每个启用的功能（图像/音频/视频），根据策略选择附件（默认：**第一个**）。
  </Step>
  <Step title="Choose 模型">
    选择第一个符合条件的模型条目（大小 + 功能 + 认证）。
  </Step>
  <Step title="Fallback on failure">
    如果模型失败或媒体过大，**回退到下一个条目**。
  </Step>
  <Step title="Apply success block">
    成功时：

    - `Body` 变为 `[Image]`、`[Audio]` 或 `[Video]` 块。
    - 音频设置 `{{Transcript}}`；命令解析在有字幕时使用字幕文本，否则使用转录文本。
    - 字幕作为 `User text:` 保留在块内。

  </Step>
</Steps>

如果理解失败或被禁用，**回复流将继续**使用原始正文和附件。

## 配置概述

`tools.media` 支持**共享模型**以及针对每个功能的覆盖：

<AccordionGroup>
  <Accordion title="Top-level keys">
    - `tools.media.models`: 共享模型列表（使用 `capabilities` 进行控制）。 - `tools.media.image` / `tools.media.audio` / `tools.media.video`: - 默认值（`prompt`、`maxChars`、`maxBytes`、`timeoutSeconds`、`language`） - 提供商覆盖（`baseUrl`、`headers`、`providerOptions`） - 通过 `tools.media.audio.providerOptions.deepgram` 配置的 Deepgram 音频选项 - 音频转录回显控制（`echoTranscript`，默认
    `false`；`echoFormat`） - 可选的**按功能的 `models` 列表**（优先于共享模型） - `attachments` 策略（`mode`、`maxAttachments`、`prefer`） - `scope`（通过渠道/chatType/会话键进行可选控制） - `tools.media.concurrency`: 最大并发功能运行次数（默认为 **2**）。
  </Accordion>
</AccordionGroup>

```json5
{
  tools: {
    media: {
      models: [
        /* shared list */
      ],
      image: {
        /* optional overrides */
      },
      audio: {
        /* optional overrides */
        echoTranscript: true,
        echoFormat: '📝 "{transcript}"',
      },
      video: {
        /* optional overrides */
      },
    },
  },
}
```

### 模型条目

每个 `models[]` 条目可以是 **提供商** 或 **CLI**：

<Tabs>
  <Tab title="Provider entry">
    ```json5
    {
      type: "provider", // default if omitted
      provider: "openai",
      model: "gpt-5.5",
      prompt: "Describe the image in <= 500 chars.",
      maxChars: 500,
      maxBytes: 10485760,
      timeoutSeconds: 60,
      capabilities: ["image"], // optional, used for multi-modal entries
      profile: "vision-profile",
      preferredProfile: "vision-fallback",
    }
    ```
  </Tab>
  <Tab title="CLI entry">
    ```json5
    {
      type: "cli",
      command: "gemini",
      args: [
        "-m",
        "gemini-3-flash",
        "--allowed-tools",
        "read_file",
        "Read the media at {{MediaPath}} and describe it in <= {{MaxChars}} characters.",
      ],
      maxChars: 500,
      maxBytes: 52428800,
      timeoutSeconds: 120,
      capabilities: ["video", "image"],
    }
    ```

    CLI 模板还可以使用：

    - `{{MediaDir}}`（包含媒体文件的目录）
    - `{{OutputDir}}`（为此运行创建的临时目录）
    - `{{OutputBase}}`（临时文件基路径，无扩展名）

  </Tab>
</Tabs>

## 默认值与限制

推荐默认值：

- `maxChars`：图片/视频为 **500**（简短，便于命令行使用）
- `maxChars`：音频为 **未设置**（完整转录，除非您设置了限制）
- `maxBytes`：
  - 图片：**10MB**
  - 音频：**20MB**
  - 视频：**50MB**

<AccordionGroup>
  <Accordion title="规则">
    - 如果媒体超过 `maxBytes`，则跳过该模型并**尝试下一个模型**。
    - 小于 **1024 字节**的音频文件将被视为空/损坏，并在提供商/CLI 转录之前跳过；入站回复上下文将收到一个确定的占位符转录，以便代理知道该笔记太小。
    - 如果模型返回超过 `maxChars`，输出将被修剪。
    - `prompt` 默认为简单的“描述{media}。”加上 `maxChars` 指导（仅限图像/视频）。
    - 如果活动主图像模型本身已支持视觉功能，OpenClaw 将跳过 `[Image]` 摘要块，而是将原始图像传递给模型。
    - 如果 Gateway(网关)/WebChat 主模型仅支持文本，图像附件将保留为卸载的 `media://inbound/*` 引用，以便图像/PDF 工具或配置的图像模型仍然可以检查它们，而不会丢失附件。
    - 显式 `openclaw infer image describe --model <provider/model>` 请求则不同：它们直接运行该支持图像的提供商/模型，包括 Ollama 引用，例如 `ollama/qwen2.5vl:7b`。
    - 如果 `<capability>.enabled: true` 但未配置模型，当其提供商支持该功能时，OpenClaw 将尝试**活动回复模型**。
  </Accordion>
</AccordionGroup>

### 自动检测媒体理解（默认）

如果 `tools.media.<capability>.enabled` **未**设置为 `false` 且您尚未配置模型，OpenClaw 将按以下顺序自动检测，并在**第一个可用的选项处停止**：

<Steps>
  <Step title="活动回复模型">
    当其提供商支持该功能时的活动回复模型。
  </Step>
  <Step title="agents.defaults.imageModel">
    `agents.defaults.imageModel` 主/备用引用（仅限图像）。
  </Step>
  <Step title="本地 CLI（仅限音频）">
    本地 CLI（如果已安装）：

    - `sherpa-onnx-offline`（需要带有编码器/解码器/连接器/令牌的 `SHERPA_ONNX_MODEL_DIR`）
    - `whisper-cli`（`whisper-cpp`；使用 `WHISPER_CPP_MODEL` 或内置的微型模型）
    - `whisper`（Python CLI；自动下载模型）

  </Step>
  <Step title="Gemini CLI">
    使用 `read_many_files` 的 `gemini`。
  </Step>
  <Step title="提供商身份验证">
    - 支持该功能的已配置 `models.providers.*` 条目会在内置回退顺序之前尝试。
    - 即使不是内置的供应商插件，具有支持图像功能的模型的纯图像配置提供商也会自动注册以进行媒体理解。
    - 当明确选择时，Ollama 图像理解可用，例如通过 `agents.defaults.imageModel` 或 `openclaw infer image describe --model ollama/<vision-model>`。

    内置回退顺序：

    - 音频：OpenAI → Groq → xAI → Deepgram → Google → SenseAudio → ElevenLabs → Mistral
    - 图像：OpenAI → Anthropic → Google → MiniMax → MiniMax Portal → Z.AI
    - 视频：Google → Qwen → Moonshot

  </Step>
</Steps>

要禁用自动检测，请设置：

```json5
{
  tools: {
    media: {
      audio: {
        enabled: false,
      },
    },
  },
}
```

<Note>二进制检测在 macOS/Linux/Windows 上是尽力而为的；请确保 CLI 在 `PATH` 上（我们会展开 `~`），或者使用完整的命令路径设置显式的 CLI 模型。</Note>

### 代理环境支持（提供商模型）

当启用基于提供商的**音频**和**视频**媒体理解时，OpenClaw 会遵守提供商 HTTP 调用的标准出站代理环境变量：

- `HTTPS_PROXY`
- `HTTP_PROXY`
- `ALL_PROXY`
- `https_proxy`
- `http_proxy`
- `all_proxy`

如果未设置代理环境变量，媒体理解将使用直接出口。如果代理值格式错误，OpenClaw 会记录警告并回退到直接获取。

## 功能（可选）

如果您设置了 `capabilities`，该条目将仅针对那些媒体类型运行。对于共享列表，OpenClaw 可以推断默认值：

- `openai`，`anthropic`，`minimax`：**图像**
- `minimax-portal`：**图像**
- `moonshot`：**图像 + 视频**
- `openrouter`：**图像**
- `google` (Gemini API)：**图像 + 音频 + 视频**
- `qwen`：**图像 + 视频**
- `mistral`：**音频**
- `zai`：**图像**
- `groq`：**音频**
- `xai`：**音频**
- `deepgram`：**音频**
- 任何具有图像处理能力的 `models.providers.<id>.models[]` 目录的模型：**图像**

对于 CLI 条目，**请显式设置 `capabilities`** 以避免意外匹配。如果您省略 `capabilities`，该条目将适用于其所在的列表。

## 提供商支持矩阵（OpenClaw 集成）

| 功能 | 提供商集成                                                                                                             | 说明                                                                                                                                                                                                    |
| ---- | ---------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 图像 | OpenAI，OpenAI Codex OAuth，Codex app-server，OpenRouter，Anthropic，Google，MiniMax，Moonshot，Qwen，Z.AI，配置提供商 | 供应商插件注册图像支持；`openai-codex/*` 使用 OAuth 提供商的管道；`codex/*` 使用有限的 Codex app-server 回合；MiniMax 和 MiniMax OAuth 都使用 `MiniMax-VL-01`；具有图像处理能力的配置提供商会自动注册。 |
| 音频 | OpenAI，Groq，xAI，Deepgram，Google，SenseAudio，ElevenLabs，Mistral                                                   | 提供商转录（Whisper/Groq/xAI/Deepgram/Gemini/SenseAudio/Scribe/Voxtral）。                                                                                                                              |
| 视频 | Google，Qwen，Moonshot                                                                                                 | 通过供应商插件实现的提供商视频理解；Qwen 视频理解使用标准 DashScope 端点。                                                                                                                              |

<Note>
**MiniMax 说明**

- `minimax` 和 `minimax-portal` 图像理解来自插件拥有的 `MiniMax-VL-01` 媒体提供商。
- 捆绑的 MiniMax 文本目录仍以纯文本模式启动；显式的 `models.providers.minimax` 条目将实例化具有图像处理能力的 M2.7 聊天引用。
  </Note>

## 模型选择指南

- 当质量和安全性至关重要时，针对每种媒体能力，请优先使用可用的最强最新一代模型。
- 对于处理不受信任输入的启用工具的代理，请避免使用较旧或较弱的媒体模型。
- 为了确保可用性，请为每种能力至少保留一个后备（高质量模型 + 更快/更便宜的模型）。
- CLI 后备选项（`whisper-cli`、`whisper`、`gemini`）在提供商 API 不可用时非常有用。
- `parakeet-mlx` 注意：使用 `--output-dir` 时，如果输出格式为 `txt`（或未指定），OpenClaw 会读取 `<output-dir>/<media-basename>.txt`；非 `txt` 格式将回退到 stdout。

## 附件策略

针对每种能力的 `attachments` 控制处理哪些附件：

<ParamField path="mode" type='"first" | "all"' default="first">
  是处理第一个选定的附件还是处理所有附件。
</ParamField>
<ParamField path="maxAttachments" type="number" default="1">
  限制处理数量。
</ParamField>
<ParamField path="prefer" type='"first" | "last" | "path" | "url"'>
  候选附件之间的选择偏好。
</ParamField>

当 `mode: "all"` 时，输出将标记为 `[Image 1/2]`、`[Audio 2/2]` 等。

<AccordionGroup>
  <Accordion title="文件附件提取行为">
    - 提取的文件文本在被附加到媒体提示之前，会被包装为 **不受信任的外部内容**。
    - 注入的块使用显式的边界标记，如 `<<<EXTERNAL_UNTRUSTED_CONTENT id="...">>>` / `<<<END_EXTERNAL_UNTRUSTED_CONTENT id="...">>>`，并包含一个 `Source: External` 元数据行。
    - 此附件提取路径有意省略了冗长的 `SECURITY NOTICE:` 横幅，以避免使媒体提示膨胀；边界标记和元数据仍然保留。
    - 如果文件没有可提取的文本，OpenClaw 会注入 `[No extractable text]`。
    - 如果 PDF 在此路径中回退到渲染页面图像，媒体提示将保留占位符 `[PDF content rendered to images; images not forwarded to model]`，因为此附件提取步骤转发的是文本块，而不是渲染的 PDF 图像。
  </Accordion>
</AccordionGroup>

## 配置示例

<Tabs>
  <Tab title="共享模型 + 覆盖">
    ```json5
    {
      tools: {
        media: {
          models: [
            { provider: "openai", model: "gpt-5.5", capabilities: ["image"] },
            {
              provider: "google",
              model: "gemini-3-flash-preview",
              capabilities: ["image", "audio", "video"],
            },
            {
              type: "cli",
              command: "gemini",
              args: [
                "-m",
                "gemini-3-flash",
                "--allowed-tools",
                "read_file",
                "Read the media at {{MediaPath}} and describe it in <= {{MaxChars}} characters.",
              ],
              capabilities: ["image", "video"],
            },
          ],
          audio: {
            attachments: { mode: "all", maxAttachments: 2 },
          },
          video: {
            maxChars: 500,
          },
        },
      },
    }
    ```
  </Tab>
  <Tab title="仅音频 + 视频">
    ```json5
    {
      tools: {
        media: {
          audio: {
            enabled: true,
            models: [
              { provider: "openai", model: "gpt-4o-mini-transcribe" },
              {
                type: "cli",
                command: "whisper",
                args: ["--model", "base", "{{MediaPath}}"],
              },
            ],
          },
          video: {
            enabled: true,
            maxChars: 500,
            models: [
              { provider: "google", model: "gemini-3-flash-preview" },
              {
                type: "cli",
                command: "gemini",
                args: [
                  "-m",
                  "gemini-3-flash",
                  "--allowed-tools",
                  "read_file",
                  "Read the media at {{MediaPath}} and describe it in <= {{MaxChars}} characters.",
                ],
              },
            ],
          },
        },
      },
    }
    ```
  </Tab>
  <Tab title="仅图像">
    ```json5
    {
      tools: {
        media: {
          image: {
            enabled: true,
            maxBytes: 10485760,
            maxChars: 500,
            models: [
              { provider: "openai", model: "gpt-5.5" },
              { provider: "anthropic", model: "claude-opus-4-6" },
              {
                type: "cli",
                command: "gemini",
                args: [
                  "-m",
                  "gemini-3-flash",
                  "--allowed-tools",
                  "read_file",
                  "Read the media at {{MediaPath}} and describe it in <= {{MaxChars}} characters.",
                ],
              },
            ],
          },
        },
      },
    }
    ```
  </Tab>
  <Tab title="多模态单一条目">
    ```json5
    {
      tools: {
        media: {
          image: {
            models: [
              {
                provider: "google",
                model: "gemini-3.1-pro-preview",
                capabilities: ["image", "video", "audio"],
              },
            ],
          },
          audio: {
            models: [
              {
                provider: "google",
                model: "gemini-3.1-pro-preview",
                capabilities: ["image", "video", "audio"],
              },
            ],
          },
          video: {
            models: [
              {
                provider: "google",
                model: "gemini-3.1-pro-preview",
                capabilities: ["image", "video", "audio"],
              },
            ],
          },
        },
      },
    }
    ```
  </Tab>
</Tabs>

## 状态输出

当媒体理解运行时，`/status` 包含一个简短的摘要行：

```
📎 Media: image ok (openai/gpt-5.4) · audio skipped (maxBytes)
```

这显示了各项能力的结果以及适用的所选提供商/模型。

## 注意事项

- 理解是 **尽力而为** 的。错误不会阻止回复。
- 即使禁用了理解功能，附件仍会传递给模型。
- 使用 `scope` 来限制理解功能的运行位置（例如，仅限私信）。

## 相关内容

- [配置](/zh/gateway/configuration)
- [图像和媒体支持](/zh/nodes/images)
