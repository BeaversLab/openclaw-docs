---
summary: "SenseAudio 针对传入语音备注的批量语音转文字"
read_when:
  - You want SenseAudio speech-to-text for audio attachments
  - You need the SenseAudio API key env var or audio config path
title: "SenseAudio"
---

# SenseAudio

SenseAudio 可以通过 OpenClaw 的共享 `tools.media.audio` 管道转录传入的音频/语音备注附件。OpenClaw 将多部分音频发布到 OpenAI 兼容的转录端点，并将返回的文本作为 `{{Transcript}}` 加上一个 `[Audio]` 块注入。

| 详情     | 值                                               |
| -------- | ------------------------------------------------ |
| 网站     | [senseaudio.cn](https://senseaudio.cn)           |
| 文档     | [senseaudio.cn/docs](https://senseaudio.cn/docs) |
| 认证     | `SENSEAUDIO_API_KEY`                             |
| 默认模型 | `senseaudio-asr-pro-1.5-260319`                  |
| 默认 URL | `https://api.senseaudio.cn/v1`                   |

## 入门指南

<Steps>
  <Step title="设置您的 API 密钥">
    ```bash
    export SENSEAUDIO_API_KEY="..."
    ```
  </Step>
  <Step title="启用音频提供商">
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
  </Step>
  <Step title="发送语音备注">
    通过任何已连接的渠道发送音频消息。OpenClaw 会将音频上传到 SenseAudio，并在回复管道中使用转录文本。
  </Step>
</Steps>

## 选项

| 选项       | 路径                                  | 描述                   |
| ---------- | ------------------------------------- | ---------------------- |
| `model`    | `tools.media.audio.models[].model`    | SenseAudio ASR 模型 ID |
| `language` | `tools.media.audio.models[].language` | 可选语言提示           |
| `prompt`   | `tools.media.audio.prompt`            | 可选转录提示词         |
| `baseUrl`  | `tools.media.audio.baseUrl` 或模型    | 覆盖 OpenAI 兼容的基础 |
| `headers`  | `tools.media.audio.request.headers`   | 额外的请求头           |

<Note>在 OpenClaw 中，SenseAudio 仅支持批量 STT。语音通话实时转录将继续使用支持流式 STT 的提供商。</Note>
