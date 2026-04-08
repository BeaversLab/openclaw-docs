---
summary: "入站图像/音频/视频理解（可选），支持提供商 + CLI 回退"
read_when:
  - Designing or refactoring media understanding
  - Tuning inbound audio/video/image preprocessing
title: "媒体理解"
---

# 媒体理解 - 入站 (2026-01-17)

OpenClaw 可以在回复管道运行之前**总结入站媒体**（图像/音频/视频）。它会自动检测何时本地工具或提供商密钥可用，并且可以被禁用或自定义。如果关闭理解功能，模型仍将照常接收原始文件/URL。

特定于提供商的媒体行为由供应商插件注册，而 OpenClaw 核心拥有共享 `tools.media` 配置、回退顺序和回复管道集成。

## 目标

- 可选：将入站媒体预摘要为短文本，以便更快地路由 + 更好的命令解析。
- 保留向模型的原始媒体传递（始终）。
- 支持 **提供商 API** 和 **CLI 回退**。
- 允许多个具有有序回退（错误/大小/超时）的模型。

## 高级行为

1. 收集入站附件 (`MediaPaths`, `MediaUrls`, `MediaTypes`)。
2. 对于每个启用的功能（图像/音频/视频），根据策略选择附件（默认：**第一个**）。
3. 选择第一个符合条件的模型条目（大小 + 功能 + 身份验证）。
4. 如果模型失败或媒体太大，**回退到下一个条目**。
5. 成功时：
   - `Body` 变为 `[Image]`、`[Audio]` 或 `[Video]` 块。
   - 音频设置 `{{Transcript}}`；命令解析在存在时使用字幕文本，否则使用转录文本。
   - 字幕作为 `User text:` 保留在块内。

如果理解失败或被禁用，**回复流程将继续**，使用原始正文 + 附件。

## 配置概述

`tools.media` 支持 **共享模型** 以及按功能的覆盖设置：

- `tools.media.models`：共享模型列表（使用 `capabilities` 进行限制）。
- `tools.media.image` / `tools.media.audio` / `tools.media.video`：
  - 默认值 (`prompt`, `maxChars`, `maxBytes`, `timeoutSeconds`, `language`)
  - 提供商覆盖 (`baseUrl`, `headers`, `providerOptions`)
  - 通过 `tools.media.audio.providerOptions.deepgram` 设置 Deepgram 音频选项
  - 音频转录回显控制 (`echoTranscript`，默认 `false`；`echoFormat`)
  - 可选的 **按功能 `models` 列表**（优先于共享模型）
  - `attachments` 策略 (`mode`, `maxAttachments`, `prefer`)
  - `scope`（可选，按渠道/聊天类型/会话密钥限制）
- `tools.media.concurrency`：最大并发功能运行数（默认 **2**）。

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

```json5
{
  type: "provider", // default if omitted
  provider: "openai",
  model: "gpt-5.4-mini",
  prompt: "Describe the image in <= 500 chars.",
  maxChars: 500,
  maxBytes: 10485760,
  timeoutSeconds: 60,
  capabilities: ["image"], // optional, used for multi‑modal entries
  profile: "vision-profile",
  preferredProfile: "vision-fallback",
}
```

```json5
{
  type: "cli",
  command: "gemini",
  args: ["-m", "gemini-3-flash", "--allowed-tools", "read_file", "Read the media at {{MediaPath}} and describe it in <= {{MaxChars}} characters."],
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

## 默认值和限制

推荐的默认值：

- `maxChars`: 图像/视频为 **500**（简短，便于命令行使用）
- `maxChars`: 音频为 **unset**（完整转录，除非您设置了限制）
- `maxBytes`:
  - image: **10MB**
  - audio: **20MB**
  - video: **50MB**

规则：

- 如果媒体超过 `maxBytes`，则跳过该模型并**尝试下一个模型**。
- 小于 **1024 字节**的音频文件被视为空/损坏，并在提供商/CLI 转录之前被跳过。
- 如果模型返回超过 `maxChars`，输出将被截断。
- `prompt` 默认为简单的“描述{media}。”加上 `maxChars` 指导（仅限图像/视频）。
- 如果当前使用的主要图像模型原生支持视觉功能，OpenClaw 将跳过 `[Image]` 摘要块，并将原始图像直接传递给模型。
- 如果设置了 `<capability>.enabled: true` 但未配置模型，当其提供商支持该功能时，OpenClaw 将尝试**当前回复模型**。

### 自动检测媒体理解（默认）

如果未将 `tools.media.<capability>.enabled` 设置为 `false` 且您未配置模型，OpenClaw 将按以下顺序自动检测并**在第一个可用的选项处停止**：

1. **当前回复模型**，当其提供商支持该功能时。
2. **`agents.defaults.imageModel`** 主要/备用引用（仅限图像）。
3. **本地 CLI**（仅限音频；如果已安装）
   - `sherpa-onnx-offline`（需要带有 encoder/decoder/joiner/tokens 的 `SHERPA_ONNX_MODEL_DIR`）
   - `whisper-cli`（`whisper-cpp`；使用 `WHISPER_CPP_MODEL` 或捆绑的微型模型）
   - `whisper`（Python CLI；自动下载模型）
4. **Gemini CLI**（`gemini`），使用 `read_many_files`
5. **提供商身份验证**
   - 已配置的支持该功能的 `models.providers.*` 条目将在捆绑的备用顺序之前尝试。
   - 即使不是捆绑的供应商插件，具有图像处理能力的图像配置提供商也会自动注册媒体理解。
   - 捆绑的备用顺序：
     - 音频：OpenAI → Groq → Deepgram → Google → Mistral
     - 图像：OpenAI → Anthropic → Google → MiniMax → MiniMax Portal → Z.AI
     - 视频：Google → Qwen → Moonshot

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

注意：在 macOS/Linux/Windows 上，二进制检测是尽力而为的；确保 CLI 位于 `PATH` 上（我们会展开 `~`），或者使用完整命令路径设置显式的 CLI 模型。

### 代理环境支持（提供商模型）

当启用基于提供商的 **音频** 和 **视频** 媒体理解时，OpenClaw 遵守提供商 HTTP 调用的标准出站代理环境变量：

- `HTTPS_PROXY`
- `HTTP_PROXY`
- `https_proxy`
- `http_proxy`

如果未设置代理环境变量，媒体理解将使用直接出口。如果代理值格式错误，OpenClaw 会记录警告并回退到直接获取。

## 功能（可选）

如果您设置了 `capabilities`，该条目仅针对那些媒体类型运行。对于共享列表，OpenClaw 可以推断默认值：

- `openai`, `anthropic`, `minimax`: **image**
- `minimax-portal`: **image**
- `moonshot`: **image + video**
- `openrouter`: **image**
- `google` (Gemini API): **image + audio + video**
- `qwen`: **image + video**
- `mistral`: **audio**
- `zai`: **image**
- `groq`: **audio**
- `deepgram`: **audio**
- 任何具有支持图像的模型的 `models.providers.<id>.models[]` 目录：
  **image**

对于 CLI 条目，**显式设置 `capabilities`** 以避免意外的匹配。如果您省略 `capabilities`，该条目将适用于其所在的列表。

## 提供商支持矩阵（OpenClaw 集成）

| 功能 | 提供商集成                                                                       | 备注                                                                                                      |
| ---- | -------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------- |
| 图像 | OpenAI, OpenRouter, Anthropic, Google, MiniMax, Moonshot, Qwen, Z.AI, 配置提供商 | 供应商插件注册图像支持；MiniMax 和 MiniMax OAuth 都使用 `MiniMax-VL-01`；支持图像的配置提供商会自动注册。 |
| 音频 | OpenAI, Groq, Deepgram, Google, Mistral                                          | 提供商转录（Whisper/Deepgram/Gemini/Voxtral）。                                                           |
| 视频 | Google, Qwen, Moonshot                                                           | 提供商视频理解通过供应商插件实现；Qwen 视频理解使用标准 DashScope 端点。                                  |

MiniMax 说明：

- `minimax` 和 `minimax-portal` 图像理解来自插件拥有的
  `MiniMax-VL-01` 媒体提供商。
- 捆绑的 MiniMax 文本目录仍然以纯文本开始；显式
  `models.providers.minimax` 条目会实例化支持图像的 M2.7 聊天引用。

## 模型选择指南

- 当质量和安全性至关重要时，请优先为每种媒体功能选择可用的最强最新一代模型。
- 对于处理不受信任输入的工具启用型代理，请避免使用较旧/较弱的媒体模型。
- 为了确保可用性，请为每种功能保留至少一个后备（高质量模型 + 更快/更便宜的模型）。
- 当提供商 API 不可用时，CLI 后备（`whisper-cli`, `whisper`, `gemini`）非常有用。
- `parakeet-mlx` 说明：使用 `--output-dir` 时，当输出格式为 `txt`（或未指定）时，OpenClaw 会读取 `<output-dir>/<media-basename>.txt`；非 `txt` 格式将回退到 stdout。

## 附件策略

针对每种功能的 `attachments` 控制处理哪些附件：

- `mode`: `first`（默认）或 `all`
- `maxAttachments`: 限制处理数量（默认 **1**）
- `prefer`: `first`, `last`, `path`, `url`

当 `mode: "all"` 时，输出标记为 `[Image 1/2]`, `[Audio 2/2]` 等。

文件附件提取行为：

- 提取的文件文本在追加到媒体提示之前，会被包装为 **不受信任的外部内容**。
- 注入的块使用显式边界标记，如
  `<<<EXTERNAL_UNTRUSTED_CONTENT id="...">>>` /
  `<<<END_EXTERNAL_UNTRUSTED_CONTENT id="...">>>`，并包含一个
  `Source: External` 元数据行。
- 此附件提取路径有意省略了冗长的
  `SECURITY NOTICE:` 横幅，以避免充斥媒体提示；边界标记和元数据仍然保留。
- 如果文件没有可提取的文本，OpenClaw 会注入 `[No extractable text]`。
- 如果 PDF 在此路径中回退到渲染的页面图像，媒体提示将保留占位符 `[PDF content rendered to images; images not forwarded to model]`
  因为此附件提取步骤转发的是文本块，而不是渲染的 PDF 图像。

## 配置示例

### 1) 共享模型列表 + 覆盖设置

```json5
{
  tools: {
    media: {
      models: [
        { provider: "openai", model: "gpt-5.4-mini", capabilities: ["image"] },
        {
          provider: "google",
          model: "gemini-3-flash-preview",
          capabilities: ["image", "audio", "video"],
        },
        {
          type: "cli",
          command: "gemini",
          args: ["-m", "gemini-3-flash", "--allowed-tools", "read_file", "Read the media at {{MediaPath}} and describe it in <= {{MaxChars}} characters."],
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

### 2) 仅限音频 + 视频（图像关闭）

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
            args: ["-m", "gemini-3-flash", "--allowed-tools", "read_file", "Read the media at {{MediaPath}} and describe it in <= {{MaxChars}} characters."],
          },
        ],
      },
    },
  },
}
```

### 3) 可选的图像理解

```json5
{
  tools: {
    media: {
      image: {
        enabled: true,
        maxBytes: 10485760,
        maxChars: 500,
        models: [
          { provider: "openai", model: "gpt-5.4-mini" },
          { provider: "anthropic", model: "claude-opus-4-6" },
          {
            type: "cli",
            command: "gemini",
            args: ["-m", "gemini-3-flash", "--allowed-tools", "read_file", "Read the media at {{MediaPath}} and describe it in <= {{MaxChars}} characters."],
          },
        ],
      },
    },
  },
}
```

### 4) 多模态单一条目（显式能力）

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

## 状态输出

当媒体理解运行时，`/status` 包含一个简短的摘要行：

```
📎 Media: image ok (openai/gpt-5.4-mini) · audio skipped (maxBytes)
```

这显示了每种能力的具体结果以及适用的所选提供商/模型。

## 注意事项

- 理解采用 **尽力而为** 策略。错误不会阻止回复。
- 即使禁用了理解功能，附件仍会传递给模型。
- 使用 `scope` 来限制理解运行的位置（例如仅限私信）。

## 相关文档

- [配置](/en/gateway/configuration)
- [图像与媒体支持](/en/nodes/images)
