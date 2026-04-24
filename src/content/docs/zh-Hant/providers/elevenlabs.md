---
summary: "在 OpenClaw 中使用 ElevenLabs 語音、Scribe STT 與即時轉錄"
read_when:
  - You want ElevenLabs text-to-speech in OpenClaw
  - You want ElevenLabs Scribe speech-to-text for audio attachments
  - You want ElevenLabs realtime transcription for Voice Call
title: "ElevenLabs"
---

# ElevenLabs

OpenClaw 使用 ElevenLabs 進行文字轉語音、使用 Scribe v2 進行批次語音轉文字，以及使用 Scribe v2 Realtime 進行語音通話串流 STT。

| 功能           | OpenClaw 介面                               | 預設                     |
| -------------- | ------------------------------------------- | ------------------------ |
| 文字轉語音     | `messages.tts` / `talk`                     | `eleven_multilingual_v2` |
| 批次語音轉文字 | `tools.media.audio`                         | `scribe_v2`              |
| 串流語音轉文字 | 語音通話 `streaming.provider: "elevenlabs"` | `scribe_v2_realtime`     |

## 驗證

在環境中設定 `ELEVENLABS_API_KEY`。為了與現有的 ElevenLabs 工具相容，也接受 `XI_API_KEY`。

```bash
export ELEVENLABS_API_KEY="..."
```

## 文字轉語音

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

## 語音轉文字

對於傳入的音訊附件和簡短的錄製語音片段，請使用 Scribe v2：

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

OpenClaw 將多部分音訊傳送到 ElevenLabs `/v1/speech-to-text` 並帶有
`model_id: "scribe_v2"`。當存在語言提示時，其會對應到 `language_code`。

## 語音通話串流 STT

內建的 `elevenlabs` 外掛註冊了 Scribe v2 Realtime 用於語音通話
串流轉錄。

| 設定     | 設定路徑                                                                  | 預設                                         |
| -------- | ------------------------------------------------------------------------- | -------------------------------------------- |
| API 金鑰 | `plugins.entries.voice-call.config.streaming.providers.elevenlabs.apiKey` | 會退回到 `ELEVENLABS_API_KEY` / `XI_API_KEY` |
| 模型     | `...elevenlabs.modelId`                                                   | `scribe_v2_realtime`                         |
| 音訊格式 | `...elevenlabs.audioFormat`                                               | `ulaw_8000`                                  |
| 取樣率   | `...elevenlabs.sampleRate`                                                | `8000`                                       |
| 提交策略 | `...elevenlabs.commitStrategy`                                            | `vad`                                        |
| 語言     | `...elevenlabs.languageCode`                                              | (未設定)                                     |

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

<Note>語音通話接收 Twilio 媒體為 8 kHz G.711 u-law。ElevenLabs 即時 提供者預設為 `ulaw_8000`，因此電訊框架可以在無需 轉碼的情況下轉發。</Note>
