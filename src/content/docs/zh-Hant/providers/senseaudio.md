---
summary: "適用於傳入語音訊息的 SenseAudio 批次語音轉文字"
read_when:
  - You want SenseAudio speech-to-text for audio attachments
  - You need the SenseAudio API key env var or audio config path
title: "SenseAudio"
---

SenseAudio 可以透過 OpenClaw 的共用 `tools.media.audio` 管道，將傳入的音訊和語音訊息附件轉錄為文字。OpenClaw 會將多部分音訊發佈至與 OpenAI 相容的轉錄端點，並將傳回的文字作為 `{{Transcript}}` 以及一個 `[Audio]` 區塊注入。

| 屬性         | 值                                               |
| ------------ | ------------------------------------------------ |
| 提供者 ID    | `senseaudio`                                     |
| 外掛程式     | 內建，`enabledByDefault: true`                   |
| 合約         | `mediaUnderstandingProviders` (音訊)             |
| 驗證環境變數 | `SENSEAUDIO_API_KEY`                             |
| 預設模型     | `senseaudio-asr-pro-1.5-260319`                  |
| 預設 URL     | `https://api.senseaudio.cn/v1`                   |
| 網站         | [senseaudio.cn](https://senseaudio.cn)           |
| 文件         | [senseaudio.cn/docs](https://senseaudio.cn/docs) |

## 開始使用

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
    透過任何連線的頻道傳送音訊訊息。OpenClaw 會將
    音訊上傳至 SenseAudio，並在回覆管道中使用轉錄內容。
  </Step>
</Steps>

## 選項

| 選項       | 路徑                                  | 描述                     |
| ---------- | ------------------------------------- | ------------------------ |
| `model`    | `tools.media.audio.models[].model`    | SenseAudio ASR 模型 ID   |
| `language` | `tools.media.audio.models[].language` | 選用語言提示             |
| `prompt`   | `tools.media.audio.prompt`            | 選用轉錄提示詞           |
| `baseUrl`  | `tools.media.audio.baseUrl` 或模型    | 覆寫與 OpenAI 相容的基礎 |
| `headers`  | `tools.media.audio.request.headers`   | 額外請求標頭             |

<Note>在 OpenClaw 中，SenseAudio 僅支援批次 STT。語音通話即時轉錄 將繼續使用支援串流 STT 的提供者。</Note>

## 相關

- [媒體理解 (音訊)](/zh-Hant/nodes/audio)
- [模型提供者](/zh-Hant/concepts/model-providers)
