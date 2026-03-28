---
summary: "入站图像/音频/视频理解（可选），支持提供商 + CLI 回退"
read_when:
  - Designing or refactoring media understanding
  - Tuning inbound audio/video/image preprocessing
title: "媒体理解"
---

# 媒体理解 - 入站 (2026-01-17)

OpenClaw 可以在回复管道运行之前**总结入站媒体**（图像/音频/视频）。它会自动检测何时本地工具或提供商密钥可用，并且可以被禁用或自定义。如果关闭理解功能，模型仍将照常接收原始文件/URL。

特定于供应商的媒体行为由供应商插件注册，而 OpenClaw 核心拥有共享 `tools.media` 配置、回退顺序和回复管道集成。

## 目标

- 可选：将入站媒体预摘要为短文本，以便更快地路由 + 更好的命令解析。
- 保留向模型的原始媒体传递（始终）。
- 支持 **提供商 API** 和 **CLI 回退**。
- 允许多个具有有序回退（错误/大小/超时）的模型。

## 高级行为

1. 收集入站附件 (`MediaPaths`、`MediaUrls`、`MediaTypes`)。
2. 对于每个启用的功能（图像/音频/视频），根据策略选择附件（默认：**第一个**）。
3. 选择第一个符合条件的模型条目（大小 + 功能 + 身份验证）。
4. 如果模型失败或媒体太大，**回退到下一个条目**。
5. 成功时：
   - `Body` 变为 `[Image]`、`[Audio]` 或 `[Video]` 块。
   - 音频设置 `{{Transcript}}`；命令解析在存在字幕时使用字幕文本，否则使用转录文本。
   - 字幕在块内保留为 `User text:`。

如果理解失败或被禁用，**回复流程将继续**，使用原始正文 + 附件。

## 配置概述

`tools.media` 支持 **共享模型** 以及每种功能的覆盖：

- `tools.media.models`：共享模型列表（使用 `capabilities` 进行控制）。
- `tools.media.image` / `tools.media.audio` / `tools.media.video`：
  - 默认值 (`prompt`、`maxChars`、`maxBytes`、`timeoutSeconds`、`language`)
  - 提供商覆盖 (`baseUrl`、`headers`、`providerOptions`)
  - 通过 `tools.media.audio.providerOptions.deepgram` 设置 Deepgram 音频选项
  - 音频转录回显控制 (`echoTranscript`，默认 `false`；`echoFormat`)
  - 可选的**按功能 `models` 列表**（在共享模型之前首选）
  - `attachments` 策略（`mode`、`maxAttachments`、`prefer`）
  - `scope`（可选的按渠道/chatType/会话键控门）
- `tools.media.concurrency`：最大并发能力运行数（默认 **2**）。

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
  model: "gpt-5.2",
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

- `maxChars`：图片/视频为 **500**（简短，命令友好）
- `maxChars`：音频为 **unset**（完整转录，除非您设置了限制）
- `maxBytes`：
  - image: **10MB**
  - audio: **20MB**
  - video: **50MB**

规则：

- 如果媒体超过 `maxBytes`，则跳过该模型并**尝试下一个模型**。
- 小于 **1024 字节**的音频文件被视为空/损坏，并在提供商/CLI 转录之前被跳过。
- 如果模型返回超过 `maxChars` 的内容，输出将被修剪。
- `prompt` 默认为简单的“描述 {media}。”加上 `maxChars` 指导（仅限图片/视频）。
- 如果 `<capability>.enabled: true` 但未配置模型，当其提供商支持该功能时，OpenClaw 会尝试**使用当前回复模型**。

### 自动检测媒体理解（默认）

如果 `tools.media.<capability>.enabled` **未**设置为 `false` 且您未
配置模型，OpenClaw 将按以下顺序自动检测并在**第一个
可用选项处停止**：

1. **本地 CLI**（仅限音频；如果已安装）
   - `sherpa-onnx-offline`（需要具有编码器/解码器/连接器/令牌的 `SHERPA_ONNX_MODEL_DIR`）
   - `whisper-cli`（`whisper-cpp`；使用 `WHISPER_CPP_MODEL` 或捆绑的微型模型）
   - `whisper` (Python CLI; 自动下载模型)
2. **Gemini CLI** (`gemini`) 使用 `read_many_files`
3. **提供商密钥**
   - 音频：OpenAI → Groq → Deepgram → Google
   - 图片：OpenAI → Anthropic → Google → MiniMax
   - 视频：Google

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

注意：二进制检测在 macOS/Linux/Windows 上是尽力而为的；确保 CLI 位于 `PATH`（我们会展开 `~`），或者使用完整命令路径设置显式的 CLI 模型。

### 代理环境支持（提供商模型）

当启用基于提供商的 **音频** 和 **视频** 媒体理解时，OpenClaw 遵守提供商 HTTP 调用的标准出站代理环境变量：

- `HTTPS_PROXY`
- `HTTP_PROXY`
- `https_proxy`
- `http_proxy`

如果未设置代理环境变量，媒体理解将使用直接出站。如果代理值格式错误，OpenClaw 会记录警告并回退到直接获取。

## 功能（可选）

如果您设置了 `capabilities`，该条目仅针对那些媒体类型运行。对于共享列表，OpenClaw 可以推断默认值：

- `openai`, `anthropic`, `minimax`: **图片**
- `moonshot`: **图片 + 视频**
- `google` (Gemini API): **图片 + 音频 + 视频**
- `mistral`: **音频**
- `zai`: **图片**
- `groq`: **音频**
- `deepgram`: **音频**

对于 CLI 条目，**请显式设置 `capabilities`** 以避免意外的匹配。如果您省略 `capabilities`，该条目将适用于其所在的列表。

## 提供商支持矩阵（OpenClaw 集成）

| 功能 | 提供商集成                                         | 注                                             |
| ---- | -------------------------------------------------- | ---------------------------------------------- |
| 图片 | OpenAI, Anthropic, Google, MiniMax, Moonshot, Z.AI | 供应商插件针对核心媒体理解注册图片支持。       |
| 音频 | OpenAI, Groq, Deepgram, Google, Mistral            | 提供商转录 (Whisper/Deepgram/Gemini/Voxtral)。 |
| 视频 | Google, Moonshot                                   | 通过供应商插件提供的提供商视频理解。           |

## 模型选择指南

- 当质量和安全至关重要时，请优先为每种媒体功能选择可用的最强最新一代模型。
- 对于处理不受信任输入的启用工具的代理，请避免使用较旧/较弱的媒体模型。
- 为每种功能保留至少一个备用方案以保证可用性（高质量模型 + 更快/更便宜的模型）。
- CLI 备用方案（`whisper-cli`、`whisper`、`gemini`）在提供商 API 不可用时非常有用。
- `parakeet-mlx` 注意：使用 `--output-dir` 时，当输出格式为 `txt`（或未指定）时，OpenClaw 会读取 `<output-dir>/<media-basename>.txt`；非 `txt` 格式将回退到 stdout。

## 附件策略

按功能划分的 `attachments` 控制处理哪些附件：

- `mode`：`first`（默认）或 `all`
- `maxAttachments`：限制处理的数量（默认为 **1**）
- `prefer`：`first`、`last`、`path`、`url`

当 `mode: "all"` 时，输出标记为 `[Image 1/2]`、`[Audio 2/2]` 等。

## 配置示例

### 1) 共享模型列表 + 覆盖

```json5
{
  tools: {
    media: {
      models: [
        { provider: "openai", model: "gpt-5.2", capabilities: ["image"] },
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

### 2) 仅音频 + 视频（关闭图像）

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

### 3) 可选图像理解

```json5
{
  tools: {
    media: {
      image: {
        enabled: true,
        maxBytes: 10485760,
        maxChars: 500,
        models: [
          { provider: "openai", model: "gpt-5.2" },
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

### 4) 多模态单个条目（显式功能）

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
📎 Media: image ok (openai/gpt-5.2) · audio skipped (maxBytes)
```

这显示了每种功能的结果以及适用的提供商/模型。

## 说明

- 理解是**尽力而为**的。错误不会阻止回复。
- 即使禁用了理解，附件仍会传递给模型。
- 使用 `scope` 限制运行理解的位置（例如仅限私信）。

## 相关文档

- [配置](/zh/gateway/configuration)
- [图像与媒体支持](/zh/nodes/images)
