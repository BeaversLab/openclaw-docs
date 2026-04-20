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

## 備註

<AccordionGroup>
  <Accordion title="驗證">驗證遵循標準的提供者驗證順序。`DEEPGRAM_API_KEY` 是 最簡單的方式。</Accordion>
  <Accordion title="Proxy 和自訂端點">使用 proxy 時，可以使用 `tools.media.audio.baseUrl` 和 `tools.media.audio.headers` 覆寫端點或標頭。</Accordion>
  <Accordion title="輸出行為">輸出遵循與其他提供者相同的音訊規則（大小上限、逾時、 轉錄內容插入）。</Accordion>
</AccordionGroup>

<Note>Deepgram 轉錄僅支援**預錄音訊**（非即時串流）。OpenClaw 會上傳完整的音訊檔案，並在將其插入對話之前等待完整轉錄內容。</Note>

## 相關內容

<CardGroup cols={2}>
  <Card title="媒體工具" href="/zh-Hant/tools/media" icon="photo-film">
    音訊、圖片和影片處理流程概述。
  </Card>
  <Card title="設定" href="/zh-Hant/configuration" icon="gear">
    完整設定參考，包含媒體工具設定。
  </Card>
  <Card title="疑難排解" href="/zh-Hant/help/troubleshooting" icon="wrench">
    常見問題與除錯步驟。
  </Card>
  <Card title="常見問題" href="/zh-Hant/help/faq" icon="circle-question">
    關於 OpenClaw 設定的常見問題。
  </Card>
</CardGroup>
