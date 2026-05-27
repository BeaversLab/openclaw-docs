---
summary: "CLI支持提供商 + CLI 回退的入站图像/音频/视频理解（可选）"
read_when:
  - Designing or refactoring media understanding
  - Tuning inbound audio/video/image preprocessing
title: "媒体理解"
sidebarTitle: "媒体理解"
---

OpenClaw 可以在回复管道运行之前**总结传入媒体**（图像/音频/视频）。它会自动检测本地工具或提供商密钥是否可用，并且可以被禁用或自定义。如果理解功能关闭，模型仍会照常接收原始文件/URL。

特定于提供商的媒体行为由提供商插件注册，而 OpenClaw 核心拥有共享的 OpenClaw`tools.media` 配置、回退顺序和回复管道集成。

## 目标

- 可选：将传入媒体预消化为简短文本，以加快路由速度 + 更好地解析命令。
- 保留向模型的原始媒体传递（始终）。
- 支持 **提供商 API** 和 **CLI 回退**。
- 允许多个具有有序回退（错误/大小/超时）的模型。

## 高级行为

<Steps>
  <Step title="收集附件">
    收集入站附件 (`MediaPaths`, `MediaUrls`, `MediaTypes`)。
  </Step>
  <Step title="按能力选择">
    对于每个启用的能力（图像/音频/视频），根据策略选择附件（默认：**第一个**）。
  </Step>
  <Step title="选择模型">
    选择第一个符合条件的模型条目（大小 + 能力 + 认证）。
  </Step>
  <Step title="失败时回退">
    如果模型失败或媒体过大，**回退到下一个条目**。
  </Step>
  <Step title="应用成功块">
    成功时：

    - `Body` 变为 `[Image]`、`[Audio]` 或 `[Video]` 块。
    - 音频设置 `{{Transcript}}`；如果存在字幕文本，命令解析将使用字幕文本，否则使用转录文本。
    - 字幕作为 `User text:` 保留在块内。

  </Step>
</Steps>

如果理解失败或被禁用，**回复流将继续**使用原始正文和附件。

## 配置概述

`tools.media` 支持**共享模型**以及按能力的覆盖：

<AccordionGroup>
  <Accordion title="Top-level keys">
    - `tools.media.models`: 共享模型列表（使用 `capabilities` 进行控制）。
    - `tools.media.image` / `tools.media.audio` / `tools.media.video`:
      - 默认值（`prompt`、`maxChars`、`maxBytes`、`timeoutSeconds`、`language`）
      - 提供商覆盖（`baseUrl`、`headers`、`providerOptions`Deepgram）
      - 通过 `tools.media.audio.providerOptions.deepgram` 设置的 Deepgram 音频选项
      - 音频转录回显控制（`echoTranscript`，默认 `false`；`echoFormat`）
      - 可选的**针对功能的 `models` 列表**（优先于共享模型）
      - `attachments` 策略（`mode`、`maxAttachments`、`prefer`）
      - `scope`（可选的按渠道/chatType/会话键控制）
    - `tools.media.concurrency`: 最大并发功能运行数（默认为 **2**）。

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
    - `{{OutputBase}}`（临时文件基本路径，无扩展名）

  </Tab>
</Tabs>

### Provider credentials (`apiKey`)

提供商媒体理解使用与普通模型调用相同的提供商身份验证解析方式：身份验证配置文件、环境变量，然后是
`models.providers.<providerId>.apiKey`。

`tools.media.*.models[]` 条目不接受内联 `apiKey` 字段。媒体模型条目（例如 `openai` 或 `moonshot`）中的 `provider` 值必须通过其中一个标准提供商认证源拥有可用的凭据。

最小示例：

```json5
{
  models: {
    providers: {
      openai: { apiKey: "<OPENAI_API_KEY>" },
      moonshot: { apiKey: "<MOONSHOT_API_KEY>" },
    },
  },
}
```

有关完整的提供商认证参考信息，包括配置文件、环境变量和自定义基础 URL，请参阅 [工具和自定义提供商](/zh/gateway/config-tools)。

## 默认值和限制

推荐的默认值：

- `maxChars`：图像/视频为 **500**（简短、适合命令）
- `maxChars`：音频为 **未设置**（除非您设置了限制，否则为完整转录）
- `maxBytes`：
  - image：**10MB**
  - audio：**20MB**
  - video：**50MB**

<AccordionGroup>
  <Accordion title="规则">
    - 如果媒体超过 `maxBytes`CLI，则跳过该模型并**尝试下一个模型**。
    - 小于 **1024 字节**的音频文件将被视为空/损坏，并在提供商/CLI 转录之前跳过；入站回复上下文会收到一个确定的占位符转录，以便智能体知道该记录太小。
    - 如果模型返回的内容超过 `maxChars`，输出将被截断。
    - `prompt` 默认为简单的“描述 {media}。”加上 `maxChars`OpenClaw 指引（仅限图像/视频）。
    - 如果当前的主要图像模型本身支持视觉功能，OpenClaw 将跳过 `[Image]`Gateway(网关)WebChat 摘要块，而是将原始图像传递给模型。
    - 如果 Gateway/WebChat 主要模型仅支持文本，图像附件将作为卸载的 `media://inbound/*` 引用保留，以便图像/PDF 工具或配置的图像模型仍然可以检查它们，而不会丢失附件。
    - 显式 `openclaw infer image describe --model <provider/model>`Ollama 请求则不同：它们直接运行支持图像的提供商/模型，包括 Ollama 引用，例如 `ollama/qwen2.5vl:7b`。
    - 如果 `<capability>.enabled: true`OpenClaw 但未配置模型，当其提供商支持该功能时，OpenClaw 将尝试**当前回复模型**。

  </Accordion>
</AccordionGroup>

### 自动检测媒体理解（默认）

如果 `tools.media.<capability>.enabled` **未**设置为 `false`OpenClaw 且您尚未配置模型，OpenClaw 将按此顺序自动检测并在**找到第一个可用选项时停止**：

<Steps>
  <Step title="当前回复模型">
    当其提供商支持该功能时的当前回复模型。
  </Step>
  <Step title="agents.defaults.imageModel">
    `agents.defaults.imageModel` 主用/备用引用（仅限图像）。
    优先使用 `provider/model` 引用。仅当匹配项唯一时，才会从已配置的具有图像功能的提供商模型条目中限定裸引用。
  </Step>
  <Step title="Local CLIs (audio only)">
    本地 CLI（如果已安装）：

    - `sherpa-onnx-offline` （需要带有编码器/解码器/连接器/令牌的 `SHERPA_ONNX_MODEL_DIR`）
    - `whisper-cli` （`whisper-cpp`；使用 `WHISPER_CPP_MODEL` 或捆绑的微型模型）
    - `whisper` （Python CLI；自动下载模型）

  </Step>
  <Step title="CLIGemini CLI">
    使用 `read_many_files` 的 `gemini`。
  </Step>
  <Step title="Provider auth">
    - 支持该功能的已配置 `models.providers.*` 条目将在捆绑的备用顺序之前进行尝试。
    - 即使未捆绑为供应商插件，具有图像功能模型的仅图像配置提供商也会自动注册以进行媒体理解。
    - Ollama 图像理解在显式选择时可用，例如通过 `agents.defaults.imageModel` 或 `openclaw infer image describe --model ollama/<vision-model>`。

    捆绑的备用顺序：

    - 音频：OpenAI → Groq → xAI → Deepgram → OpenRouter → Google → SenseAudio → ElevenLabs → Mistral
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

<Note>Binary detection is best-effort across macOS/Linux/Windows; ensure the CLI is on macOSLinuxWindowsCLI`PATH` (we expand `~`CLI), or set an explicit CLI 模型 with a full command path.</Note>

### Proxy environment support (提供商 models)

When 提供商-based **audio** and **video** media understanding is enabled, OpenClaw honors standard outbound proxy 环境变量 for 提供商 HTTP calls:

- `HTTPS_PROXY`
- `HTTP_PROXY`
- `ALL_PROXY`
- `https_proxy`
- `http_proxy`
- `all_proxy`

If no proxy 环境变量 are set, media understanding uses direct egress. If the proxy value is malformed, OpenClaw logs a warning and falls back to direct fetch.

## Capabilities (optional)

If you set `capabilities`OpenClaw, the entry only runs for those media types. For shared lists, OpenClaw can infer defaults:

- `openai`, `anthropic`, `minimax`: **image**
- `minimax-portal`: **image**
- `moonshot`: **image + video**
- `openrouter`: **image + audio**
- `google`API (Gemini API): **image + audio + video**
- `qwen`: **image + video**
- `mistral`: **audio**
- `zai`: **image**
- `groq`: **audio**
- `xai`: **audio**
- `deepgram`: **audio**
- Any `models.providers.<id>.models[]` catalog with an image-capable 模型: **image**

For CLI entries, **set CLI`capabilities` explicitly** to avoid surprising matches. If you omit `capabilities`, the entry is eligible for the list it appears in.

## Provider support matrix (OpenClaw integrations)

| Capability | 提供商集成                                                                                                             | 说明                                                                                                                                                                                                    |
| ---------- | ---------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 图像       | OpenAI，OpenAI Codex OAuth，Codex app-server，OpenRouter，Anthropic，Google，MiniMax，Moonshot，Qwen，Z.AI，配置提供商 | 供应商插件注册图像支持；`openai-codex/*` 使用 OAuth 提供商的基础设施；`codex/*` 使用受限的 Codex app-server 轮次；MiniMax 和 MiniMax OAuth 均使用 `MiniMax-VL-01`；具备图像功能的配置提供商会自动注册。 |
| 音频       | OpenAI，Groq，xAI，Deepgram，OpenRouter，Google，SenseAudio，ElevenLabs，Mistral                                       | 提供商转录 (Whisper/Groq/xAI/Deepgram/OpenRouter STT/Gemini/SenseAudio/Scribe/Voxtral)。                                                                                                                |
| 视频       | Google，Qwen，Moonshot                                                                                                 | 通过供应商插件实现提供商视频理解；Qwen 视频理解使用标准 DashScope 端点。                                                                                                                                |

<Note>
**MiniMax 说明**

- `minimax`、`minimax-cn`、`minimax-portal` 和 `minimax-portal-cn` 图像理解来自于插件拥有的 `MiniMax-VL-01` 媒体提供商。
- 即使旧版 MiniMax M2.x 聊天元数据声称包含图像输入，自动图像路由仍将继续使用 `MiniMax-VL-01`。

</Note>

## 模型选择指南

- 当质量和安全性至关重要时，针对每种媒体能力，首选可用的最强最新一代模型。
- 对于处理不受信任输入的启用了工具的代理，请避免使用旧版/较弱的媒体模型。
- 为确保可用性，每种能力至少保留一个回退方案（质量模型 + 更快/更便宜的模型）。
- 当提供商 API 不可用时，CLI 回退机制（CLI`whisper-cli`、`whisper`、`gemini`）非常有用。
- `parakeet-mlx` 注意：使用 `--output-dir`OpenClaw 时，当输出格式为 `txt`（或未指定）时，OpenClaw 会读取 `<output-dir>/<media-basename>.txt`；非 `txt` 格式会回退到 stdout。

## 附件策略

针对每个功能的 `attachments` 控制处理哪些附件：

<ParamField path="mode" type='"first" | "all"' default="first">
  是处理第一个选定的附件还是全部。
</ParamField>
<ParamField path="maxAttachments" type="number" default="1">
  限制处理数量。
</ParamField>
<ParamField path="prefer" type='"first" | "last" | "path" | "url"'>
  在候选附件中的选择偏好。
</ParamField>

当 `mode: "all"` 时，输出会标记为 `[Image 1/2]`、`[Audio 2/2]` 等。

<AccordionGroup>
  <Accordion title="File-attachment extraction behavior">
    - 提取的文件文本在附加到媒体提示之前会被包装为**不受信任的外部内容**。
    - 注入的块使用显式的边界标记，如 `<<<EXTERNAL_UNTRUSTED_CONTENT id="...">>>` / `<<<END_EXTERNAL_UNTRUSTED_CONTENT id="...">>>`，并包含 `Source: External` 元数据行。
    - 此附件提取路径有意省略了长的 `SECURITY NOTICE:`OpenClaw 横幅，以避免膨胀媒体提示；边界标记和元数据仍然保留。
    - 如果文件没有可提取的文本，OpenClaw 会注入 `[No extractable text]`。
    - 如果 PDF 在此路径中回退到渲染的页面图像，媒体提示将保留占位符 `[PDF content rendered to images; images not forwarded to model]`，因为此附件提取步骤转发的是文本块，而不是渲染的 PDF 图像。

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
  <Tab title="仅音频和视频">
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
  <Tab title="多模态单个条目">
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

这显示了按功能划分的结果以及适用的提供商/模型。

## 注意

- 理解是 **尽力而为** 的。错误不会阻止回复。
- 即使禁用了理解功能，附件仍会传递给模型。
- 使用 `scope` 限制运行理解的地点（例如，仅限私信）。

## 相关

- [配置](/zh/gateway/configuration)
- [图像和媒体支持](/zh/nodes/images)
