---
summary: "使用 ElevenLabs 语音、Scribe STT 以及与 OpenClaw 一起进行实时转录"
read_when:
  - You want ElevenLabs text-to-speech in OpenClaw
  - You want ElevenLabs Scribe speech-to-text for audio attachments
  - You want ElevenLabs realtime transcription for Voice Call
title: "ElevenLabs"
---

OpenClaw 使用 ElevenLabs 进行文本转语音、使用 Scribe v2 进行批量语音转文本，以及使用 Scribe v2 Realtime 进行语音通话流式 STT。

| 功能           | OpenClaw 表面                               | 默认                     |
| -------------- | ------------------------------------------- | ------------------------ |
| 文本转语音     | `messages.tts` / `talk`                     | `eleven_multilingual_v2` |
| 批量语音转文本 | `tools.media.audio`                         | `scribe_v2`              |
| 流式语音转文本 | 语音通话 `streaming.provider: "elevenlabs"` | `scribe_v2_realtime`     |

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
          voiceId: "pMsXgVXv3BLzUgSXRplE",
          modelId: "eleven_multilingual_v2",
        },
      },
    },
  },
}
```

将 `modelId` 设置为 `eleven_v3` 以使用 ElevenLabs v3 TTS。OpenClaw 将 `eleven_multilingual_v2` 保持为现有安装的默认值。

## 语音转文本

使用 Scribe v2 处理入站音频附件和短录音语音片段：

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

OpenClaw 使用 `model_id: "scribe_v2"` 将多部分音频发送到 ElevenLabs `/v1/speech-to-text`。如果存在语言提示，它们会映射到 `language_code`。

## 语音通话流式 STT

捆绑的 `elevenlabs` 插件注册了 Scribe v2 Realtime，用于语音通话流式转录。

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

<Note>Voice Call 接收 Twilio 媒体为 8 kHz G.711 u-law。ElevenLabs 实时提供商默认为 `ulaw_8000`，因此电话帧可以在无需转码的情况下转发。</Note>

## 相关

- [文本转语音](/zh/tools/tts)
- [模型选择](/zh/concepts/model-providers)
