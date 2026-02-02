---
summary: "入站图片/音频/视频理解（可选），支持 provider + CLI 回退"
read_when:
  - 设计或重构媒体理解
  - 调整入站音频/视频/图片的预处理
---
# Media Understanding（Inbound）— 2026-01-17

OpenClaw 可在回复管线运行前**总结入站媒体**（图片/音频/视频）。它会在本地工具或 provider keys 可用时自动检测，也可禁用或自定义。若理解关闭，模型仍照常接收原始文件/URL。

## 目标
- 可选：将入站媒体预先摘要为短文本，加快路由 + 提升命令解析。
- 始终保留原始媒体传递给模型。
- 支持 **provider APIs** 与 **CLI 回退**。
- 支持多模型按序回退（错误/大小/超时）。

## 高层行为
1) 收集入站附件（`MediaPaths`, `MediaUrls`, `MediaTypes`）。
2) 对每个启用能力（image/audio/video），按策略选择附件（默认 **first**）。
3) 选择第一个符合条件的模型条目（大小 + 能力 + 认证）。
4) 模型失败或媒体过大时，**回退到下一个条目**。
5) 成功后：
   - `Body` 变为 `[Image]` / `[Audio]` / `[Video]` 块。
   - 音频设置 `{{Transcript}}`；命令解析优先使用 caption，有则用 caption，否则用转写。
   - Caption 作为 `User text:` 保留在块内。

若理解失败或禁用，**回复流程继续**，仍使用原始正文 + 附件。

## 配置概览
`tools.media` 支持**共享模型** + 按能力覆盖：
- `tools.media.models`：共享模型列表（用 `capabilities` 控制）。
- `tools.media.image` / `tools.media.audio` / `tools.media.video`：
  - 默认项（`prompt`, `maxChars`, `maxBytes`, `timeoutSeconds`, `language`）
  - provider 覆盖（`baseUrl`, `headers`, `providerOptions`）
  - Deepgram 音频选项：`tools.media.audio.providerOptions.deepgram`
  - 可选**按能力 `models` 列表**（优先于共享模型）
  - `attachments` 策略（`mode`, `maxAttachments`, `prefer`）
  - `scope`（可选：按 channel/chatType/session key 控制）
- `tools.media.concurrency`：并发能力数上限（默认 **2**）。

```json5
{
  tools: {
    media: {
      models: [ /* shared list */ ],
      image: { /* optional overrides */ },
      audio: { /* optional overrides */ },
      video: { /* optional overrides */ }
    }
  }
}
```

### 模型条目

每个 `models[]` 条目可以是 **provider** 或 **CLI**：

```json5
{
  type: "provider",        // default if omitted
  provider: "openai",
  model: "gpt-5.2",
  prompt: "Describe the image in <= 500 chars.",
  maxChars: 500,
  maxBytes: 10485760,
  timeoutSeconds: 60,
  capabilities: ["image"], // optional, used for multi‑modal entries
  profile: "vision-profile",
  preferredProfile: "vision-fallback"
}
```

```json5
{
  type: "cli",
  command: "gemini",
  args: [
    "-m",
    "gemini-3-flash",
    "--allowed-tools",
    "read_file",
    "Read the media at {{MediaPath}} and describe it in <= {{MaxChars}} characters."
  ],
  maxChars: 500,
  maxBytes: 52428800,
  timeoutSeconds: 120,
  capabilities: ["video", "image"]
}
```

CLI 模板还可使用：
- `{{MediaDir}}`（媒体文件所在目录）
- `{{OutputDir}}`（本次运行创建的临时目录）
- `{{OutputBase}}`（临时文件基路径，无扩展名）

## 默认值与限制

推荐默认：
- `maxChars`：图片/视频 **500**（短、利于命令解析）
- `maxChars`：音频**不设置**（完整转写，除非你限制）
- `maxBytes`：
  - 图片：**10MB**
  - 音频：**20MB**
  - 视频：**50MB**

规则：
- 媒体超过 `maxBytes` 时，该模型跳过并尝试**下一个模型**。
- 模型返回超过 `maxChars` 时，输出会被裁剪。
- `prompt` 默认是简单的 “Describe the {media}.” + `maxChars` 指引（仅图片/视频）。
- 若 `<capability>.enabled: true` 但未配置模型，OpenClaw 会尝试
  **当前回复模型**（前提是 provider 支持该能力）。

### 自动检测媒体理解（默认）

若 `tools.media.<capability>.enabled` **未**设为 `false` 且你未配置模型，
OpenClaw 会按以下顺序自动检测并**在首个可用项停止**：

1) **本地 CLI**（仅音频；若已安装）
   - `sherpa-onnx-offline`（需要 `SHERPA_ONNX_MODEL_DIR`，含 encoder/decoder/joiner/tokens）
   - `whisper-cli`（`whisper-cpp`；使用 `WHISPER_CPP_MODEL` 或内置 tiny 模型）
   - `whisper`（Python CLI；自动下载模型）
2) **Gemini CLI**（`gemini`），使用 `read_many_files`
3) **Provider keys**
   - Audio：OpenAI → Groq → Deepgram → Google
   - Image：OpenAI → Anthropic → Google → MiniMax
   - Video：Google

要禁用自动检测：
```json5
{
  tools: {
    media: {
      audio: {
        enabled: false
      }
    }
  }
}
```
注意：二进制检测在 macOS/Linux/Windows 上是 best‑effort；确保 CLI 在 `PATH` 中（会展开 `~`），或设置带完整命令路径的 CLI 模型。

## 能力（可选）

设置了 `capabilities` 时，条目仅对指定媒体类型生效。对共享列表，OpenClaw 会推断默认：
- `openai`, `anthropic`, `minimax`：**image**
- `google`（Gemini API）：**image + audio + video**
- `groq`：**audio**
- `deepgram`：**audio**

对 CLI 条目，**请显式设置 `capabilities`**，避免意外匹配。
若省略 `capabilities`，条目对所在列表默认可用。

## Provider 支持矩阵（OpenClaw 集成）
| Capability | Provider integration | Notes |
|------------|----------------------|-------|
| Image | OpenAI / Anthropic / Google / others via `pi-ai` | 注册表中任意支持图片的模型都可用。 |
| Audio | OpenAI, Groq, Deepgram, Google | Provider 转写（Whisper/Deepgram/Gemini）。 |
| Video | Google (Gemini API) | Provider 视频理解。 |

## 推荐 providers
**Image**
- 优先使用你当前的模型（如果支持图片）。
- 推荐默认：`openai/gpt-5.2`、`anthropic/claude-opus-4-5`、`google/gemini-3-pro-preview`。

**Audio**
- `openai/gpt-4o-mini-transcribe`、`groq/whisper-large-v3-turbo` 或 `deepgram/nova-3`。
- CLI 回退：`whisper-cli`（whisper-cpp）或 `whisper`。
- Deepgram 配置：[Deepgram（音频转写）](/zh/providers/deepgram)。

**Video**
- `google/gemini-3-flash-preview`（快）、`google/gemini-3-pro-preview`（更丰富）。
- CLI 回退：`gemini` CLI（支持对视频/音频 `read_file`）。

## 附件策略

按能力的 `attachments` 控制处理哪些附件：
- `mode`：`first`（默认）或 `all`
- `maxAttachments`：处理上限（默认 **1**）
- `prefer`：`first`, `last`, `path`, `url`

当 `mode: "all"` 时，输出会标记为 `[Image 1/2]`、`[Audio 2/2]` 等。

## 配置示例

### 1) 共享模型列表 + 覆盖
```json5
{
  tools: {
    media: {
      models: [
        { provider: "openai", model: "gpt-5.2", capabilities: ["image"] },
        { provider: "google", model: "gemini-3-flash-preview", capabilities: ["image", "audio", "video"] },
        {
          type: "cli",
          command: "gemini",
          args: [
            "-m",
            "gemini-3-flash",
            "--allowed-tools",
            "read_file",
            "Read the media at {{MediaPath}} and describe it in <= {{MaxChars}} characters."
          ],
          capabilities: ["image", "video"]
        }
      ],
      audio: {
        attachments: { mode: "all", maxAttachments: 2 }
      },
      video: {
        maxChars: 500
      }
    }
  }
}
```

### 2) 仅音频 + 视频（关闭图片）
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
            args: ["--model", "base", "{{MediaPath}}"]
          }
        ]
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
              "Read the media at {{MediaPath}} and describe it in <= {{MaxChars}} characters."
            ]
          }
        ]
      }
    }
  }
}
```

### 3) 可选图片理解
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
          { provider: "anthropic", model: "claude-opus-4-5" },
          {
            type: "cli",
            command: "gemini",
            args: [
              "-m",
              "gemini-3-flash",
              "--allowed-tools",
              "read_file",
              "Read the media at {{MediaPath}} and describe it in <= {{MaxChars}} characters."
            ]
          }
        ]
      }
    }
  }
}
```

### 4) 多模态单条目（显式 capabilities）
```json5
{
  tools: {
    media: {
      image: { models: [{ provider: "google", model: "gemini-3-pro-preview", capabilities: ["image", "video", "audio"] }] },
      audio: { models: [{ provider: "google", model: "gemini-3-pro-preview", capabilities: ["image", "video", "audio"] }] },
      video: { models: [{ provider: "google", model: "gemini-3-pro-preview", capabilities: ["image", "video", "audio"] }] }
    }
  }
}
```

## 状态输出

当媒体理解运行时，`/status` 会包含一行摘要：

```
📎 Media: image ok (openai/gpt-5.2) · audio skipped (maxBytes)
```

它显示每个能力的结果，以及选中的 provider/model。

## 备注

- 理解是 **best‑effort**。错误不会阻断回复。
- 即便理解被禁用，附件仍会传给模型。
- 用 `scope` 限制理解运行范围（例如仅 DMs）。

## 相关文档

- [Configuration](/zh/gateway/configuration)
- [Image & Media Support](/zh/nodes/images)
