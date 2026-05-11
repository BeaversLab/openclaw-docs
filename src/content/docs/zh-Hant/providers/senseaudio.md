---
summary: "適用於傳入語音訊息的 SenseAudio 批次語音轉文字"
read_when:
  - You want SenseAudio speech-to-text for audio attachments
  - You need the SenseAudio API key env var or audio config path
title: "SenseAudio"
---

# SenseAudio

SenseAudio 可以透過 OpenClaw 的共享 `tools.media.audio` 管線轉錄傳入的音訊/語音訊息附件。OpenClaw 會將多部分音訊發佈到相容 OpenAI 的轉錄端點，並將傳回的文字作為 `{{Transcript}}` 加上 `[Audio]` 區塊注入。

| 詳情     | 值                                               |
| -------- | ------------------------------------------------ |
| 網站     | [senseaudio.cn](https://senseaudio.cn)           |
| 文件     | [senseaudio.cn/docs](https://senseaudio.cn/docs) |
| 驗證     | `SENSEAUDIO_API_KEY`                             |
| 預設模型 | `senseaudio-asr-pro-1.5-260319`                  |
| 預設網址 | `https://api.senseaudio.cn/v1`                   |

## 快速入門

<Steps>
  <Step title="設定您的 API 金鑰">
    ```bash
    export SENSEAUDIO_API_KEY="..."
    ```
  </Step>
  <Step title="啟用音訊提供者">
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
  <Step title="傳送語音訊息">
    透過任何連線的頻道傳送音訊訊息。OpenClaw 會將音訊上傳到 SenseAudio，並在回覆管線中使用轉錄結果。
  </Step>
</Steps>

## 選項

| 選項       | 路徑                                  | 說明                   |
| ---------- | ------------------------------------- | ---------------------- |
| `model`    | `tools.media.audio.models[].model`    | SenseAudio ASR 模型 ID |
| `language` | `tools.media.audio.models[].language` | 選用語言提示           |
| `prompt`   | `tools.media.audio.prompt`            | 選用轉錄提示           |
| `baseUrl`  | `tools.media.audio.baseUrl` 或模型    | 覆寫相容 OpenAI 的基礎 |
| `headers`  | `tools.media.audio.request.headers`   | 額外請求標頭           |

<Note>SenseAudio 在 OpenClaw 中僅支援批次 STT。通話即時轉錄繼續使用支援串流 STT 的提供者。</Note>
