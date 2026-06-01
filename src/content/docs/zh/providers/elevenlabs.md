---
summary: "使用 ElevenLabs 语音、Scribe STT 以及与 OpenClaw 一起进行实时转录"
read_when:
  - You want ElevenLabs text-to-speech in OpenClaw
  - You want ElevenLabs Scribe speech-to-text for audio attachments
  - You want ElevenLabs realtime transcription for Voice Call or Google Meet
title: "ElevenLabs"
---

OpenClaw 使用 ElevenLabs 进行文本转语音、使用 Scribe v2 进行批量语音转文本，以及使用 Scribe v2 Realtime 进行流式 STT。

| 功能           | OpenClaw 表面                                                      | 默认                     |
| -------------- | ------------------------------------------------------------------ | ------------------------ |
| 文本转语音     | `messages.tts` / `talk`                                            | `eleven_multilingual_v2` |
| 批量语音转文本 | `tools.media.audio`                                                | `scribe_v2`              |
| 流式语音转文本 | Voice Call 流式传输或 Google Meet `realtime.transcriptionProvider` | `scribe_v2_realtime`     |

## 身份验证

在环境中设置 `ELEVENLABS_API_KEY`。为了兼容现有的 ElevenLabs 工具，`XI_API_KEY` 也是可接受的。

```bash
export ELEVENLABS_API_KEY="..."
```

## 文本转语音

```json5
{
  messages: {
    tts: {
      providers: {
        elevenlabs: {
          apiKey: "${ELEVENLABS_API_KEY}",
          speakerVoiceId: "pMsXgVXv3BLzUgSXRplE",
          modelId: "eleven_multilingual_v2",
        },
      },
    },
  },
}
```

将 `modelId` 设置为 `eleven_v3` 以使用 ElevenLabs v3 TTS。OpenClaw 将 `eleven_multilingual_v2` 保持为现有安装的默认值。

当选择 ElevenLabs 作为 Discord`voice.tts`/`messages.tts`OpenClaw 提供商时，Discord 语音频道使用 ElevenLabs 的流式 TTS 端点。播放直接从返回的音频流开始，而不是等待 OpenClaw 下载并写入整个音频文件。`latencyTier` 映射到 ElevenLabs 的 `optimize_streaming_latency`OpenClaw 查询参数（适用于接受该参数的模型）；对于拒绝该参数的 `eleven_v3`，OpenClaw 会省略该参数。

## 语音转文本

使用 Scribe v2 处理入站音频附件和简短的录音语音片段：

```json5
{
  tools: {
    media: {
      audio: {
        enabled: true,
        models: [{ provider: "elevenlabs", model: "scribe_v2" }],
      },
    },
  },
}
```

OpenClaw 将多部分音频发送到带有 `model_id: "scribe_v2"` 的 ElevenLabs OpenClaw`/v1/speech-to-text`。如果存在语言提示，它们会映射到 `language_code`。

## 流式 STT

内置的 `elevenlabs` 插件为 Voice Call 和 Google Meet 的代理模式流式转录注册了 Scribe v2 Realtime。

| 设置     | 配置路径                                                                  | 默认值                                     |
| -------- | ------------------------------------------------------------------------- | ------------------------------------------ |
| API 密钥 | `plugins.entries.voice-call.config.streaming.providers.elevenlabs.apiKey` | 回退到 `ELEVENLABS_API_KEY` / `XI_API_KEY` |
| 模型     | `...elevenlabs.modelId`                                                   | `scribe_v2_realtime`                       |
| 音频格式 | `...elevenlabs.audioFormat`                                               | `ulaw_8000`                                |
| 采样率   | `...elevenlabs.sampleRate`                                                | `8000`                                     |
| 提交策略 | `...elevenlabs.commitStrategy`                                            | `vad`                                      |
| 语言     | `...elevenlabs.languageCode`                                              | (未设置)                                   |

```json5
{
  plugins: {
    entries: {
      "voice-call": {
        config: {
          streaming: {
            enabled: true,
            provider: "elevenlabs",
            providers: {
              elevenlabs: {
                apiKey: "${ELEVENLABS_API_KEY}",
                audioFormat: "ulaw_8000",
                commitStrategy: "vad",
                languageCode: "en",
              },
            },
          },
        },
      },
    },
  },
}
```

<Note>Voice Call 接收到的 Twilio 媒体为 8 kHz G.711 u-law。ElevenLabs realtime 提供商默认为 `ulaw_8000`，因此电话帧可以在无需转码的情况下直接转发。</Note>

对于 Google Meet 代理模式，请将
`plugins.entries.google-meet.config.realtime.transcriptionProvider` 设置为
`"elevenlabs"`，并在
`plugins.entries.google-meet.config.realtime.providers.elevenlabs` 下配置相同的提供商块。

## 相关

- [文本转语音](/zh/tools/tts)
- [Google Meet](/zh/plugins/google-meet)
- [模型选择](/zh/concepts/model-providers)
