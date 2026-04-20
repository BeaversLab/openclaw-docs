---
summary: "Deepgram 轉錄適用於語音留言"
read_when:
  - You want Deepgram speech-to-text for audio attachments
  - You need a quick Deepgram config example
title: "Deepgram"
---

# Deepgram (音訊轉錄)

Deepgram 是一個語音轉文字 API。在 OpenClaw 中，它用於透過 `tools.media.audio` 進行**傳入音訊/語音備忘錄轉錄**。

啟用後，OpenClaw 會將音訊檔案上傳至 Deepgram，並將轉錄內容注入到回覆管線中（`{{Transcript}}` + `[Audio]` 區塊）。這**不是串流傳輸**；
它使用的是預錄音轉錄端點。

| 詳細資訊 | 值                                                         |
| -------- | ---------------------------------------------------------- |
| 網站     | [deepgram.com](https://deepgram.com)                       |
| 文件     | [developers.deepgram.com](https://developers.deepgram.com) |
| 驗證     | `DEEPGRAM_API_KEY`                                         |
| 預設模型 | `nova-3`                                                   |

## 快速開始

<Steps>
  <Step title="設定您的 API 金鑰">
    將您的 Deepgram API 金鑰加入到環境變數中：

    ```
    DEEPGRAM_API_KEY=dg_...
    ```

  </Step>
  <Step title="啟用音訊提供者">
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
  </Step>
  <Step title="傳送語音備忘錄">
    透過任何已連接的頻道傳送音訊訊息。OpenClaw 會透過 Deepgram 進行轉錄，
    並將轉錄內容注入到回覆管線中。
  </Step>
</Steps>

## 組態選項

| 選項              | 路徑                                                         | 說明                                 |
| ----------------- | ------------------------------------------------------------ | ------------------------------------ |
| `model`           | `tools.media.audio.models[].model`                           | Deepgram 模型 ID（預設值：`nova-3`） |
| `language`        | `tools.media.audio.models[].language`                        | 語言提示（選用）                     |
| `detect_language` | `tools.media.audio.providerOptions.deepgram.detect_language` | 啟用語言偵測（選用）                 |
| `punctuate`       | `tools.media.audio.providerOptions.deepgram.punctuate`       | 啟用標點符號（選用）                 |
| `smart_format`    | `tools.media.audio.providerOptions.deepgram.smart_format`    | 啟用智慧格式設定（選用）             |

<Tabs>
  <Tab title="With language hint">
    ```json5
    {
      tools: {
        media: {
          audio: {
            enabled: true,
            models: [{ provider: "deepgram", model: "nova-3", language: "en" }],
          },
        },
      },
    }
    ```
  </Tab>
  <Tab title="With Deepgram options">
    ```json5
    {
      tools: {
        media: {
          audio: {
            enabled: true,
            providerOptions: {
              deepgram: {
                detect_language: true,
                punctuate: true,
                smart_format: true,
              },
            },
            models: [{ provider: "deepgram", model: "nova-3" }],
          },
        },
      },
    }
    ```
  </Tab>
</Tabs>

## Notes

<AccordionGroup>
  <Accordion title="Authentication">Authentication follows the standard provider auth order. `DEEPGRAM_API_KEY` is the simplest path.</Accordion>
  <Accordion title="Proxy and custom endpoints">Override endpoints or headers with `tools.media.audio.baseUrl` and `tools.media.audio.headers` when using a proxy.</Accordion>
  <Accordion title="Output behavior">Output follows the same audio rules as other providers (size caps, timeouts, transcript injection).</Accordion>
</AccordionGroup>

<Note>Deepgram transcription is **pre-recorded only** (not real-time streaming). OpenClaw uploads the complete audio file and waits for the full transcript before injecting it into the conversation.</Note>

## Related

<CardGroup cols={2}>
  <Card title="Media tools" href="/zh-Hant/tools/media" icon="photo-film">
    Audio, image, and video processing pipeline overview.
  </Card>
  <Card title="Configuration" href="/zh-Hant/configuration" icon="gear">
    Full config reference including media tool settings.
  </Card>
  <Card title="Troubleshooting" href="/zh-Hant/help/troubleshooting" icon="wrench">
    Common issues and debugging steps.
  </Card>
  <Card title="FAQ" href="/zh-Hant/help/faq" icon="circle-question">
    Frequently asked questions about OpenClaw setup.
  </Card>
</CardGroup>
