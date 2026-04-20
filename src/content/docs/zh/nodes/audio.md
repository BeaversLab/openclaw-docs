---
summary: "传入的音频/语音笔记如何下载、转录并注入到回复中"
read_when:
  - Changing audio transcription or media handling
title: "音频和语音笔记"
---

# 音频 / 语音笔记 (2026-01-17)

## 工作原理

- **媒体理解（音频）**：如果启用了音频理解（或自动检测），OpenClaw：
  1. 定位第一个音频附件（本地路径或 URL），并在需要时下载它。
  2. 在发送到每个模型条目之前强制执行 `maxBytes`。
  3. 按顺序运行第一个符合条件的模型条目（提供商或 CLI）。
  4. 如果失败或跳过（大小/超时），它将尝试下一个条目。
  5. 成功后，它将 `Body` 替换为 `[Audio]` 块并设置 `{{Transcript}}`。
- **命令解析**：当转录成功时，`CommandBody`/`RawBody` 被设置为转录内容，以便斜杠命令仍然有效。
- **详细日志记录**：在 `--verbose` 中，我们会记录转录何时运行以及何时替换正文。

## 自动检测（默认）

如果您**未配置模型**且 `tools.media.audio.enabled` **未**设置为 `false`，
OpenClaw 将按此顺序自动检测，并在遇到第一个可用的选项时停止：

1. 当其提供商支持音频理解时，**主动回复模型**。
2. **本地 CLI**（如果已安装）
   - `sherpa-onnx-offline`（需要带有 encoder/decoder/joiner/tokens 的 `SHERPA_ONNX_MODEL_DIR`）
   - `whisper-cli`（来自 `whisper-cpp`；使用 `WHISPER_CPP_MODEL` 或内置的 tiny 模型）
   - `whisper`（Python CLI；自动下载模型）
3. **Gemini CLI** (CLI) (`gemini`)，使用 `read_many_files`
4. **Provider auth**
   - 已配置的支持音频的 `models.providers.*` 条目会首先被尝试
   - 内置的回退顺序：OpenAI → Groq → Deepgram → Google → Mistral

要禁用自动检测，请设置 `tools.media.audio.enabled: false`。
要进行自定义，请设置 `tools.media.audio.models`。
注意：在 macOS/Linux/Windows 上的二进制检测是尽力而为的；请确保 CLI 位于 `PATH` 上（我们会展开 `~`），或者使用完整命令路径设置显式的 CLI 模型。

## 配置示例

### Provider + CLI 回退 (OpenAI + Whisper CLI)

```json5
{
  tools: {
    media: {
      audio: {
        enabled: true,
        maxBytes: 20971520,
        models: [
          { provider: "openai", model: "gpt-4o-mini-transcribe" },
          {
            type: "cli",
            command: "whisper",
            args: ["--model", "base", "{{MediaPath}}"],
            timeoutSeconds: 45,
          },
        ],
      },
    },
  },
}
```

### Provider-only with scope gating

```json5
{
  tools: {
    media: {
      audio: {
        enabled: true,
        scope: {
          default: "allow",
          rules: [{ action: "deny", match: { chatType: "group" } }],
        },
        models: [{ provider: "openai", model: "gpt-4o-mini-transcribe" }],
      },
    },
  },
}
```

### Provider-only (Deepgram)

```json5
{
  tools: {
    media: {
      audio: {
        enabled: true,
        models: [{ provider: "deepgram", model: "nova-3" }],
      },
    },
  },
}
```

### Provider-only (Mistral Voxtral)

```json5
{
  tools: {
    media: {
      audio: {
        enabled: true,
        models: [{ provider: "mistral", model: "voxtral-mini-latest" }],
      },
    },
  },
}
```

### Echo transcript to chat (opt-in)

```json5
{
  tools: {
    media: {
      audio: {
        enabled: true,
        echoTranscript: true, // default is false
        echoFormat: '📝 "{transcript}"', // optional, supports {transcript}
        models: [{ provider: "openai", model: "gpt-4o-mini-transcribe" }],
      },
    },
  },
}
```

## Notes & limits

- Provider 遵循标准模型认证顺序（auth profiles、环境变量、`models.providers.*.apiKey`）。
- Groq 设置详情：[Groq](/zh/providers/groq)。
- Deepgram 在使用 `provider: "deepgram"` 时会获取 `DEEPGRAM_API_KEY`。
- Deepgram 设置详情：[Deepgram (audio transcription)](/zh/providers/deepgram)。
- Mistral 设置详情：[Mistral](/zh/providers/mistral)。
- Audio 提供商可以通过 `tools.media.audio` 覆盖 `baseUrl`、`headers` 和 `providerOptions`。
- 默认大小上限为 20MB (`tools.media.audio.maxBytes`)。对于该模型，过大的音频会被跳过，并尝试下一个条目。
- 小于 1024 字节的微小/空音频文件会在提供商/CLI 转录之前被跳过。
- 音频的默认 `maxChars` 为 **未设置**（完整转录）。设置 `tools.media.audio.maxChars` 或每个条目的 `maxChars` 以修剪输出。
- OpenAI 自动默认为 `gpt-4o-mini-transcribe`；设置 `model: "gpt-4o-transcribe"` 以获得更高的准确度。
- 使用 `tools.media.audio.attachments` 来处理多个语音笔记（`mode: "all"` + `maxAttachments`）。
- 转录内容可作为 `{{Transcript}}` 供模板使用。
- `tools.media.audio.echoTranscript` 默认为关闭；启用它可在代理处理之前将转录确认发送回原始聊天。
- `tools.media.audio.echoFormat` 可自定义回显文本（占位符：`{transcript}`）。
- CLI 标准输出有限制（5MB）；请保持 CLI 输出简洁。

### 代理环境支持

基于提供商的音频转录支持标准出站代理环境变量：

- `HTTPS_PROXY`
- `HTTP_PROXY`
- `https_proxy`
- `http_proxy`

如果未设置代理环境变量，则使用直连出站。如果代理配置格式错误，OpenClaw 会记录警告并回退到直接获取。

## 群组中的提及检测

当为群组聊天设置了 `requireMention: true` 时，OpenClaw 现在会在检查提及**之前**转录音频。这使得即使语音笔记包含提及也能被处理。

**工作原理：**

1. 如果语音消息没有文本正文且群组需要提及，OpenClaw 会执行“预检”转录。
2. 会检查转录内容中是否存在提及模式（例如 `@BotName`，表情符号触发器）。
3. 如果发现提及，该消息将继续通过完整的回复流水线。
4. 转录内容用于提及检测，以便语音笔记能够通过提及检查。

**回退行为：**

- 如果预检期间转录失败（超时、API 错误等），该消息将基于仅文本提及检测进行处理。
- 这确保了混合消息（文本 + 音频）永远不会被错误地丢弃。

**针对 Telegram 群组/主题的退出选项：**

- 设置 `channels.telegram.groups.<chatId>.disableAudioPreflight: true` 以跳过该群组的预检转录提及检查。
- 设置 `channels.telegram.groups.<chatId>.topics.<threadId>.disableAudioPreflight` 以覆盖每个主题的设置（`true` 跳过，`false` 强制启用）。
- 默认为 `false`（当提及限制条件匹配时启用预检）。

**示例：** 用户在 Telegram 群组中启用了 `requireMention: true` 并发送了一条语音消息“Hey @Claude, what's the weather?”。语音消息将被转录，提及内容会被检测到，然后智能体将回复。

## 注意事项

- 作用域规则采用首匹配原则。`chatType` 会被标准化为 `direct`、`group` 或 `room`。
- 请确保您的 CLI 退出码为 0 并打印纯文本；JSON 需要通过 `jq -r .text` 进行处理。
- 对于 `parakeet-mlx`，如果您传递了 `--output-dir`，当 `--output-format` 为 `txt`（或省略）时，OpenClaw 会读取 `<output-dir>/<media-basename>.txt`；非 `txt` 的输出格式将回退到 stdout 解析。
- 保持合理的超时时间（`timeoutSeconds`，默认为 60 秒），以避免阻塞回复队列。
- 预检转录仅处理用于提及检测的 **第一个** 音频附件。其他音频将在主要媒体理解阶段处理。
