---
title: "音视频笔记 — 2026-01-17"
summary: "入站音频/语音如何下载、转写并注入回复"
read_when:
  - 你在调整音频转写或媒体处理
---
# 音视频笔记 — 2026-01-17

## 支持内容
- **媒体理解（音频）**：当启用或自动检测到音频理解时，OpenClaw 会：
  1) 定位第一条音频附件（本地路径或 URL），必要时先下载。
  2) 在发送给每个模型条目前检查 `maxBytes`。
  3) 按顺序运行第一个可用模型条目（provider 或 CLI）。
  4) 失败或跳过（尺寸/超时）则尝试下一个条目。
  5) 成功后，用 `[Audio]` 块替换 `Body` 并设置 `{{Transcript}}`。
- **命令解析**：当转写成功时，`CommandBody`/`RawBody` 会被设置为转写结果，从而保证 slash commands 可用。
- **Verbose 日志**：在 `--verbose` 下，会记录转写何时运行以及何时替换正文。

## 自动检测（默认）
如果**未配置模型**且 `tools.media.audio.enabled` **未**设为 `false`，
OpenClaw 会按以下顺序自动检测并在第一个可用选项处停止：

1) **本地 CLI**（若已安装）
   - `sherpa-onnx-offline`（需要 `SHERPA_ONNX_MODEL_DIR`，含 encoder/decoder/joiner/tokens）
   - `whisper-cli`（来自 `whisper-cpp`；使用 `WHISPER_CPP_MODEL` 或自带 tiny 模型）
   - `whisper`（Python CLI；自动下载模型）
2) **Gemini CLI**（`gemini`），通过 `read_many_files`
3) **Provider keys**（OpenAI → Groq → Deepgram → Google）

要禁用自动检测，设置 `tools.media.audio.enabled: false`。
要自定义，设置 `tools.media.audio.models`。
注意：二进制检测在 macOS/Linux/Windows 上是 best-effort；确保 CLI 在 `PATH` 中（会展开 `~`），或设置带完整命令路径的 CLI 模型。

## 配置示例

### Provider + CLI 回退（OpenAI + Whisper CLI）
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
            timeoutSeconds: 45
          }
        ]
      }
    }
  }
}
```

### 仅 Provider + 作用域控制
```json5
{
  tools: {
    media: {
      audio: {
        enabled: true,
        scope: {
          default: "allow",
          rules: [
            { action: "deny", match: { chatType: "group" } }
          ]
        },
        models: [
          { provider: "openai", model: "gpt-4o-mini-transcribe" }
        ]
      }
    }
  }
}
```

### 仅 Provider（Deepgram）
```json5
{
  tools: {
    media: {
      audio: {
        enabled: true,
        models: [{ provider: "deepgram", model: "nova-3" }]
      }
    }
  }
}
```

## 备注与限制
- Provider 认证遵循标准模型认证顺序（auth profiles、env vars、`models.providers.*.apiKey`）。
- 使用 `provider: "deepgram"` 时会读取 `DEEPGRAM_API_KEY`。
- Deepgram 配置细节：[Deepgram（音频转写）](/zh/providers/deepgram)。
- 音频 provider 可通过 `tools.media.audio` 覆盖 `baseUrl`、`headers`、`providerOptions`。
- 默认大小上限 20MB（`tools.media.audio.maxBytes`）。超限音频会对当前模型跳过并尝试下一个条目。
- 音频默认 `maxChars` **未设置**（输出完整转写）。可设置 `tools.media.audio.maxChars` 或单条目 `maxChars` 来裁剪。
- OpenAI 自动默认是 `gpt-4o-mini-transcribe`；可设 `model: "gpt-4o-transcribe"` 以提高准确率。
- 使用 `tools.media.audio.attachments` 处理多条语音（`mode: "all"` + `maxAttachments`）。
- 转写内容可在模板中用 `{{Transcript}}`。
- CLI stdout 有上限（5MB）；保持输出简洁。

## 注意点
- 作用域规则是“首条匹配生效”。`chatType` 规范化为 `direct`、`group` 或 `room`。
- 确保你的 CLI 以 0 退出并输出纯文本；若是 JSON，需要用 `jq -r .text` 处理。
- 超时要合理（`timeoutSeconds`，默认 60s），避免阻塞回复队列。
