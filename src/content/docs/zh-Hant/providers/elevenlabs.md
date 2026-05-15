---
summary: "在 OpenClaw 中使用 ElevenLabs 語音、Scribe STT 與即時轉錄"
read_when:
  - You want ElevenLabs text-to-speech in OpenClaw
  - You want ElevenLabs Scribe speech-to-text for audio attachments
  - You want ElevenLabs realtime transcription for Voice Call or Google Meet
title: "ElevenLabs"
---

OpenClaw 使用 ElevenLabs 進行文字轉語音、使用 Scribe v2 進行批次語音轉文字，以及使用 Scribe v2 Realtime 進行串流 STT。

| 功能           | OpenClaw 介面                                               | 預設                     |
| -------------- | ----------------------------------------------------------- | ------------------------ |
| 文字轉語音     | `messages.tts` / `talk`                                     | `eleven_multilingual_v2` |
| 批次語音轉文字 | `tools.media.audio`                                         | `scribe_v2`              |
| 串流語音轉文字 | 語音通話串流或 Google Meet `realtime.transcriptionProvider` | `scribe_v2_realtime`     |

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

將 `modelId` 設定為 `eleven_v3` 以使用 ElevenLabs v3 TTS。OpenClaw 將 `eleven_multilingual_v2` 保持為現有安裝的預設值。

當 ElevenLabs 是選定的 `voice.tts`/`messages.tts` 提供者時，Discord 語音頻道會使用 ElevenLabs 的串流 TTS 端點。播放會從傳回的音訊串流開始，而不是等待 OpenClaw 下載並寫入整個音訊檔案。`latencyTier` 對應到 ElevenLabs 的 `optimize_streaming_latency` 查詢參數（針對接受該參數的模型）；對於拒絕該參數的 `eleven_v3`，OpenClaw 會省略該參數。

## 語音轉文字

對於傳入的音訊附件和短錄製語音片段，使用 Scribe v2：

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

OpenClaw 會將多部分音頻發送到 ElevenLabs `/v1/speech-to-text`，並帶有
`model_id: "scribe_v2"`。當存在語言提示時，它們會對應到 `language_code`。

## 串流 STT

內建的 `elevenlabs` 外掛註冊了 Scribe v2 Realtime，用於通話和
Google Meet 的代理模式串流轉錄。

| 設定     | Config 路徑                                                               | 預設值                                     |
| -------- | ------------------------------------------------------------------------- | ------------------------------------------ |
| API 金鑰 | `plugins.entries.voice-call.config.streaming.providers.elevenlabs.apiKey` | 退回到 `ELEVENLABS_API_KEY` / `XI_API_KEY` |
| 模型     | `...elevenlabs.modelId`                                                   | `scribe_v2_realtime`                       |
| 音訊格式 | `...elevenlabs.audioFormat`                                               | `ulaw_8000`                                |
| 取樣率   | `...elevenlabs.sampleRate`                                                | `8000`                                     |
| 提交策略 | `...elevenlabs.commitStrategy`                                            | `vad`                                      |
| 語言     | `...elevenlabs.languageCode`                                              | (未設定)                                   |

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

<Note>Voice Call 以 8 kHz G.711 u-law 格式接收 Twilio 媒體。ElevenLabs 即時 提供者預設為 `ulaw_8000`，因此可以在不進行 轉碼的情況下轉發電話框架。</Note>

對於 Google Meet 代理模式，請將
`plugins.entries.google-meet.config.realtime.transcriptionProvider` 設定為
`"elevenlabs"`，並在
`plugins.entries.google-meet.config.realtime.providers.elevenlabs` 下設定相同的提供者區塊。

## 相關

- [文字轉語音](/zh-Hant/tools/tts)
- [Google Meet](/zh-Hant/plugins/google-meet)
- [模型選擇](/zh-Hant/concepts/model-providers)
