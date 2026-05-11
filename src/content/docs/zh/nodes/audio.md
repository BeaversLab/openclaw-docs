---
summary: "接收到的音频/语音笔记如何下载、转录并注入到回复中"
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
  5. 成功时，它将 `Body` 替换为 `[Audio]` 块并设置 `{{Transcript}}`。
- **指令解析**：当转录成功时，`CommandBody`/`RawBody` 会被设置为转录文本，以便斜杠指令仍然可以工作。
- **详细日志记录**：在 `--verbose` 中，我们会记录转录运行的时间以及它替换正文的时间。

## 自动检测（默认）

如果您**不配置模型**且 `tools.media.audio.enabled` **未**设置为 `false`，
OpenClaw 将按以下顺序自动检测并在第一个可用的选项处停止：

1. 当其提供商支持音频理解时，**主动回复模型**。
2. **本地 CLI**（如果已安装）
   - `sherpa-onnx-offline`（需要包含编码器/解码器/连接器/令牌的 `SHERPA_ONNX_MODEL_DIR`）
   - `whisper-cli`（来自 `whisper-cpp`；使用 `WHISPER_CPP_MODEL` 或内置的 tiny 模型）
   - `whisper`（Python CLI；自动下载模型）
3. **Gemini CLI**（`gemini`）使用 `read_many_files`
4. **Provider auth**
   - 首先尝试支持音频的已配置 `models.providers.*` 条目
   - 内置的回退顺序：OpenAI → Groq → xAI → Deepgram → Google → SenseAudio → ElevenLabs → Mistral

要禁用自动检测，请设置 `tools.media.audio.enabled: false`。
要自定义，请设置 `tools.media.audio.models`。
注意：在 macOS/Linux/Windows 上的二进制检测是尽力而为的；确保 CLI 位于 `PATH` 上（我们会展开 `~`），或者使用完整命令路径设置显式的 CLI 模型。

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

### 仅提供商 (SenseAudio)

```json5
{
  tools: {
    media: {
      audio: {
        enabled: true,
        models: [{ provider: "senseaudio", model: "senseaudio-asr-pro-1.5-260319" }],
      },
    },
  },
}
```

### 将转录回显到聊天（可选择加入）

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

## 注意事项与限制

- 提供商认证遵循标准模型认证顺序（认证配置文件、环境变量、`models.providers.*.apiKey`）。
- Groq 设置详情：[Groq](/zh/providers/groq)。
- Deepgram 在使用 `provider: "deepgram"` 时会获取 `DEEPGRAM_API_KEY`。
- Deepgram 设置详细信息：[Deepgram（音频转录）](/zh/providers/deepgram)。
- Mistral 设置详细信息：[Mistral](/zh/providers/mistral)。
- 当使用 `provider: "senseaudio"` 时，SenseAudio 会拾取 `SENSEAUDIO_API_KEY`。
- SenseAudio 设置详细信息：[SenseAudio](/zh/providers/senseaudio)。
- 音频提供商可以通过 `tools.media.audio` 覆盖 `baseUrl`、`headers` 和 `providerOptions`。
- 默认大小上限为 20MB（`tools.media.audio.maxBytes`）。过大的音频将被该模型跳过，并尝试下一个条目。
- 小于 1024 字节的微小/空音频文件将在提供商/CLI 转录之前被跳过。
- 音频的默认 `maxChars` 为 **未设置**（完整转录）。设置 `tools.media.audio.maxChars` 或每个条目的 `maxChars` 以修剪输出。
- OpenAI 自动默认为 `gpt-4o-mini-transcribe`；设置 `model: "gpt-4o-transcribe"` 以获得更高的准确性。
- 使用 `tools.media.audio.attachments` 处理多个语音笔记（`mode: "all"` + `maxAttachments`）。
- 转录文稿作为 `{{Transcript}}` 提供给模板。
- `tools.media.audio.echoTranscript` 默认关闭；启用它可以在代理处理之前将转录确认发送回原始聊天。
- `tools.media.audio.echoFormat` 自定义回显文本（占位符：`{transcript}`）。
- CLI stdout 受限（5MB）；保持 CLI 输出简洁。
- CLI `args` 应该对本地音频文件路径使用 `{{MediaPath}}`。运行 `openclaw doctor --fix` 以迁移较旧的 `audio.transcription.command` 配置中已弃用的 `{input}` 占位符。

### 代理环境支持

基于提供商的音频转录遵循标准出站代理环境变量：

- `HTTPS_PROXY`
- `HTTP_PROXY`
- `ALL_PROXY`
- `https_proxy`
- `http_proxy`
- `all_proxy`

如果未设置代理环境变量，则使用直接出口。如果代理配置格式错误，OpenClaw 会记录警告并回退到直接获取。

## 群组中的提及检测

当为群组聊天设置了 `requireMention: true` 时，OpenClaw 现在会在检查提及**之前**转录音频。这使得语音消息即使包含提及也能被处理。

**工作原理：**

1. 如果语音消息没有文本正文且群组需要提及，OpenClaw 会执行“预检”转录。
2. 系统会检查转录内容中是否存在提及模式（例如 `@BotName`、表情符号触发器）。
3. 如果发现提及，该消息将继续通过完整的回复管道。
4. 转录内容用于提及检测，以便语音笔记可以通过提及筛选。

**回退行为：**

- 如果在预检期间转录失败（超时、API 错误等），则消息将基于仅文本提及检测进行处理。
- 这确保了混合消息（文本 + 音频）永远不会被错误地丢弃。

**按 Telegram 群组/主题选择退出：**

- 设置 `channels.telegram.groups.<chatId>.disableAudioPreflight: true` 以跳过该群组的预检转录提及检查。
- 设置 `channels.telegram.groups.<chatId>.topics.<threadId>.disableAudioPreflight` 以按主题覆盖（`true` 跳过，`false` 强制启用）。
- 默认值为 `false`（当满足提及筛选条件时启用预检）。

**示例：** 用户在设置了 `requireMention: true` 的 Telegram 群组中发送一条语音笔记，内容为“Hey @Claude, what's the weather?”。语音笔记被转录，检测到提及，代理进行回复。

## 注意事项

- 范围规则采用首次匹配优先。`chatType` 会被标准化为 `direct`、`group` 或 `room`。
- 确保您的 CLI 以退出码 0 退出并打印纯文本；JSON 需要通过 `jq -r .text` 进行处理。
- 对于 `parakeet-mlx`，如果您传递 `--output-dir`，当 `--output-format` 为 `txt`（或省略）时，OpenClaw 会读取 `<output-dir>/<media-basename>.txt`；非 `txt` 输出格式将回退到 stdout 解析。
- 保持超时时间合理（`timeoutSeconds`，默认 60s），以避免阻塞回复队列。
- 预转录仅处理用于提及检测的**第一个**音频附件。额外的音频将在主要媒体理解阶段处理。

## 相关

- [媒体理解](/zh/nodes/media-understanding)
- [对话模式](/zh/nodes/talk)
- [语音唤醒](/zh/nodes/voicewake)
