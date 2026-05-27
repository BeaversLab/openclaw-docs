---
summary: "接收到的音频/语音笔记如何下载、转录并注入到回复中"
read_when:
  - Changing audio transcription or media handling
title: "音频和语音笔记"
---

## 有效内容

- **媒体理解（音频）**：如果启用了音频理解（或自动检测），OpenClaw 将执行以下操作：
  1. 定位第一个音频附件（本地路径或 URL），并在需要时下载它。
  2. 在发送到每个模型条目之前，强制执行 `maxBytes`。
  3. 按顺序运行第一个符合条件的模型条目（提供商或 CLI）。
  4. 如果失败或跳过（由于大小/超时），它将尝试下一个条目。
  5. 成功后，它会将 `Body` 替换为 `[Audio]` 代码块，并设置 `{{Transcript}}`。
- **命令解析**：转录成功后，`CommandBody`/`RawBody` 将被设置为转录文本，以便斜杠命令仍然可以正常工作。
- **详细日志记录**：在 `--verbose` 中，我们会记录转录运行的时间以及它替换正文的时间。

## 自动检测（默认）

如果您**未配置模型**且 `tools.media.audio.enabled` **未**设置为 `false`，
OpenClaw 将按以下顺序自动检测，并在找到第一个可用选项时停止：

1. **当前回复模型**，当其提供商支持音频理解时。
2. **本地 CLI**（如果已安装）
   - `sherpa-onnx-offline`（需要带有编码器/解码器/连接器/标记的 `SHERPA_ONNX_MODEL_DIR`）
   - `whisper-cli`（来自 `whisper-cpp`；使用 `WHISPER_CPP_MODEL` 或捆绑的微型模型）
   - `whisper`（Python CLI；自动下载模型）
3. **提供商身份验证**
   - 首先尝试支持音频的已配置 `models.providers.*` 条目
   - 内置回退顺序：OpenAI → Groq → xAI → Deepgram → Google → SenseAudio → ElevenLabs → Mistral

截至 2026-05-22，Gemini CLI 自动检测不再支持媒体理解。Google 正在将 Gemini CLI 用户迁移到 Antigravity CLI；音频应使用本地或提供商转录，而图像/视频 CLI 回退应迁移到 Antigravity CLI (`agy`)。

要禁用自动检测，请设置 `tools.media.audio.enabled: false`。
要自定义，请设置 `tools.media.audio.models`。
注意：二进制检测在 macOS/Linux/Windows 上是尽力而为的；确保 CLI 在 `PATH` 上（我们会展开 `~`），或使用完整命令路径设置显式 CLI 模型。

## 配置示例

### 提供商 + CLI 回退 (OpenAI + Whisper CLI)

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

### 仅使用提供商并进行范围限制

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

### 仅使用提供商 (Deepgram)

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

### 仅使用提供商 (Mistral Voxtral)

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

### 仅使用提供商 (SenseAudio)

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

### 将转录回显到聊天（可选加入）

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

## 注意事项和限制

- 提供商身份验证遵循标准模型身份验证顺序（身份验证配置文件、环境变量、`models.providers.*.apiKey`）。
- Groq 设置详情：[Groq](/zh/providers/groq)。
- 当使用 `provider: "deepgram"` 时，Deepgram 会选取 `DEEPGRAM_API_KEY`。
- Deepgram 设置详情：[Deepgram (audio transcription)](/zh/providers/deepgram)。
- Mistral 设置详情：[Mistral](/zh/providers/mistral)。
- 当使用 `provider: "senseaudio"` 时，SenseAudio 会选取 `SENSEAUDIO_API_KEY`。
- SenseAudio 设置详情：[SenseAudio](/zh/providers/senseaudio)。
- 音频提供商可以通过 `tools.media.audio` 覆盖 `baseUrl`、`headers` 和 `providerOptions`。
- 默认大小上限为 20MB (`tools.media.audio.maxBytes`)。超大音频将被跳过，并尝试下一个条目。
- 在提供商/CLI 转录之前，会跳过小于 1024 字节的微小/空音频文件。
- 音频的默认 `maxChars` 是 **未设置**（完整转录）。设置 `tools.media.audio.maxChars` 或逐条设置 `maxChars` 以修剪输出。
- OpenAI 自动默认值为 `gpt-4o-mini-transcribe`；设置 `model: "gpt-4o-transcribe"` 以获得更高的准确性。
- 使用 `tools.media.audio.attachments` 处理多个语音笔记（`mode: "all"` + `maxAttachments`）。
- 转录内容可作为 `{{Transcript}}` 供模板使用。
- `tools.media.audio.echoTranscript` 默认处于关闭状态；启用它可在代理处理之前将转录确认发回源聊天。
- `tools.media.audio.echoFormat` 自定义回显文本（占位符：`{transcript}`）。
- CLI stdout 被限制为 5MB；请保持 CLI 输出简洁。
- CLI `args` 应该使用 `{{MediaPath}}` 作为本地音频文件路径。运行 `openclaw doctor --fix` 以迁移旧 `audio.transcription.command` 配置中已弃用的 `{input}` 占位符。

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

当为群组聊天设置了 `requireMention: true` 时，OpenClaw 现在会在检查提及 **之前** 转录音频。这使得即使语音笔记包含提及也能被处理。

**工作原理：**

1. 如果语音消息没有文本正文且群组需要提及，OpenClaw 会执行“预检”转录。
2. 系统会检查转录文本中是否存在提及模式（例如 `@BotName`、表情符号触发器）。
3. 如果发现提及，该消息将通过完整的回复管道处理。
4. 转录文本用于提及检测，以便语音笔记能够通过提及关卡。

**回退行为：**

- 如果预检期间转录失败（超时、API 错误等），则基于仅文本的提及检测处理该消息。
- 这可确保混合消息（文本 + 音频）绝不会被错误地丢弃。

**按 Telegram 群组/主题选择退出：**

- 设置 `channels.telegram.groups.<chatId>.disableAudioPreflight: true` 以跳过该组的预检转录提及检查。
- 设置 `channels.telegram.groups.<chatId>.topics.<threadId>.disableAudioPreflight` 以按话题覆盖（`true` 表示跳过，`false` 表示强制启用）。
- 默认值为 `false`（当提及门控条件匹配时启用预检）。

**示例：** 用户在启用了 `requireMention: true` 的 Telegram 群组中发送了一条语音笔记，内容是“嘿 @Claude，天气怎么样？”。语音笔记被转录，检测到提及，代理随后做出回复。

## 注意事项

- 作用域规则采用首次匹配优先。`chatType` 会被规范化为 `direct`、`group` 或 `room`。
- 确保您的 CLI 退出代码为 0 并打印纯文本；JSON 需要通过 `jq -r .text` 进行处理。
- 对于 `parakeet-mlx`，如果您传递 `--output-dir`，当 `--output-format` 为 `txt`（或省略）时，OpenClaw 会读取 `<output-dir>/<media-basename>.txt`；非 `txt` 输出格式将回退到 stdout 解析。
- 保持合理的超时时间（`timeoutSeconds`，默认 60s），以避免阻塞回复队列。
- 预转录转录仅处理**第一个**音频附件以进行提及检测。额外的音频将在主媒体理解阶段处理。

## 相关内容

- [媒体理解](/zh/nodes/media-understanding)
- [对话模式](/zh/nodes/talk)
- [语音唤醒](/zh/nodes/voicewake)
