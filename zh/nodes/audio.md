---
summary: "入站音频/语音笔记如何下载、转录和注入到回复中"
read_when:
  - "更改音频转录或媒体处理"
title: "音频和语音笔记"
---

# 音频 / 语音笔记 — 2026-01-17

## 工作原理

- **媒体理解（音频）**：如果启用了音频理解（或自动检测），OpenClaw 会：
  1. 定位第一个音频附件（本地路径或 URL），并在需要时下载它。
  2. 在发送到每个模型条目之前强制执行 `maxBytes`。
  3. 按顺序运行第一个符合条件的模型条目（提供商或 CLI）。
  4. 如果失败或跳过（大小/超时），它会尝试下一个条目。
  5. 成功后，它会用 `[Audio]` 块替换 `Body` 并设置 `{{Transcript}}`。
- **命令解析**：转录成功时，`CommandBody`/`RawBody` 被设置为转录文本，因此斜杠命令仍然有效。
- **详细日志记录**：在 `--verbose` 中，我们会记录转录运行的时间以及它替换正文的时间。

## 自动检测（默认）

如果您**不配置模型**并且 `tools.media.audio.enabled` **未**设置为 `false`，
OpenClaw 会按此顺序自动检测并在第一个工作选项处停止：

1. **本地 CLI**（如果已安装）
   - `sherpa-onnx-offline`（需要 `SHERPA_ONNX_MODEL_DIR` 和编码器/解码器/连接器/令牌）
   - `whisper-cli`（来自 `whisper-cpp`；使用 `WHISPER_CPP_MODEL` 或捆绑的微型模型）
   - `whisper`（Python CLI；自动下载模型）
2. **Gemini CLI**（`gemini`）使用 `read_many_files`
3. **提供商密钥**（OpenAI → Groq → Deepgram → Google）

要禁用自动检测，设置 `tools.media.audio.enabled: false`。
要自定义，设置 `tools.media.audio.models`。
注意：二进制检测在 macOS/Linux/Windows 上是尽力而为的；确保 CLI 在 `PATH` 上（我们扩展 `~`），或使用完整命令路径设置显式 CLI 模型。

## 配置示例

### 提供商 + CLI 后备（OpenAI + Whisper CLI）

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

### 仅提供商，带范围门控

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

### 仅提供商（Deepgram）

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

## 备注和限制

- 提供商身份验证遵循标准模型身份验证顺序（身份验证配置文件、环境变量、`models.providers.*.apiKey`）。
- Deepgram 在使用 `provider: "deepgram"` 时会获取 `DEEPGRAM_API_KEY`。
- Deepgram 设置详情：[Deepgram (/en/providers/deepgram)](/zh/providers/deepgram)。
- 音频提供商可以通过 `tools.media.audio` 覆盖 `baseUrl`、`headers` 和 `providerOptions`。
- 默认大小上限为 20MB（`tools.media.audio.maxBytes`）。超大音频会被跳过该模型，并尝试下一个条目。
- 音频的默认 `maxChars` **未设置**（完整转录）。设置 `tools.media.audio.maxChars` 或每个条目的 `maxChars` 以修剪输出。
- OpenAI 自动默认为 `gpt-4o-mini-transcribe`；设置 `model: "gpt-4o-transcribe"` 以获得更高的准确性。
- 使用 `tools.media.audio.attachments` 处理多个语音笔记（`mode: "all"` + `maxAttachments`）。
- 转录文本可以作为 `{{Transcript}}` 供模板使用。
- CLI stdout 受到限制（5MB）；保持 CLI 输出简洁。

## 注意事项

- 范围规则使用首次匹配优先。`chatType` 被规范化为 `direct`、`group` 或 `room`。
- 确保您的 CLI 以 0 退出并打印纯文本；JSON 需要通过 `jq -r .text` 进行处理。
- 保持超时合理（`timeoutSeconds`，默认 60 秒）以避免阻塞回复队列。
