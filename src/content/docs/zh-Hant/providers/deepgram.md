---
summary: "Deepgram 入站語音訊息轉錄"
read_when:
  - You want Deepgram speech-to-text for audio attachments
  - You want Deepgram streaming transcription for Voice Call
  - You need a quick Deepgram config example
title: "Deepgram"
---

# Deepgram (音訊轉錄)

Deepgram 是一個語音轉文字 API。在 OpenClaw 中，它用於透過 `tools.media.audio` 進行入站
音訊/語音訊息的轉錄，以及透過 `plugins.entries.voice-call.config.streaming` 進行語音通話串流 STT。

對於批次轉錄，OpenClaw 會將完整的音訊檔案上傳至 Deepgram，
並將轉錄內容注入回覆管線 (`{{Transcript}}` +
`[Audio]` 區塊)。對於語音通話串流，OpenClaw 會透過 Deepgram 的 WebSocket `listen` 端點轉發即時 G.711
u-law 音框，並在 Deepgram 返回時發出部分或最終轉錄內容。

| 詳細資訊 | 值                                                         |
| -------- | ---------------------------------------------------------- |
| 網站     | [deepgram.com](https://deepgram.com)                       |
| 文件     | [developers.deepgram.com](https://developers.deepgram.com) |
| 驗證     | `DEEPGRAM_API_KEY`                                         |
| 預設模型 | `nova-3`                                                   |

## 快速開始

<Steps>
  <Step title="設定您的 API 金鑰">
    將您的 Deepgram API 金鑰新增至環境變數中：

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
  <Step title="發送語音訊息">
    透過任何連線的管道發送音訊訊息。OpenClaw 會透過 Deepgram 將其
    轉錄，並將轉錄內容注入回覆管線。
  </Step>
</Steps>

## 組態選項

| 選項              | 路徑                                                         | 說明                                |
| ----------------- | ------------------------------------------------------------ | ----------------------------------- |
| `model`           | `tools.media.audio.models[].model`                           | Deepgram 模型 ID (預設值：`nova-3`) |
| `language`        | `tools.media.audio.models[].language`                        | 語言提示（選用）                    |
| `detect_language` | `tools.media.audio.providerOptions.deepgram.detect_language` | 啟用語言偵測（選用）                |
| `punctuate`       | `tools.media.audio.providerOptions.deepgram.punctuate`       | 啟用標點符號（選用）                |
| `smart_format`    | `tools.media.audio.providerOptions.deepgram.smart_format`    | 啟用智慧格式設定（選用）            |

<Tabs>
  <Tab title="搭配語言提示">
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
  <Tab title="搭配 Deepgram 選項">
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

## 語音通話串流 STT

隨附的 `deepgram` 外掛程式也會為 Voice Call 外掛程式註冊一個即時轉錄提供者。

| 設定     | 配置路徑                                                                | 預設值                    |
| -------- | ----------------------------------------------------------------------- | ------------------------- |
| API 金鑰 | `plugins.entries.voice-call.config.streaming.providers.deepgram.apiKey` | 回退至 `DEEPGRAM_API_KEY` |
| 模型     | `...deepgram.model`                                                     | `nova-3`                  |
| 語言     | `...deepgram.language`                                                  | (未設定)                  |
| 編碼     | `...deepgram.encoding`                                                  | `mulaw`                   |
| 採樣率   | `...deepgram.sampleRate`                                                | `8000`                    |
| 端點檢測 | `...deepgram.endpointingMs`                                             | `800`                     |
| 暫時結果 | `...deepgram.interimResults`                                            | `true`                    |

```json5
{
  plugins: {
    entries: {
      "voice-call": {
        config: {
          streaming: {
            enabled: true,
            provider: "deepgram",
            providers: {
              deepgram: {
                apiKey: "${DEEPGRAM_API_KEY}",
                model: "nova-3",
                endpointingMs: 800,
                language: "en-US",
              },
            },
          },
        },
      },
    },
  },
}
```

<Note>Voice Call 以 8 kHz G.711 u-law 接收電話音訊。Deepgram 串流提供者預設為 `encoding: "mulaw"` 和 `sampleRate: 8000`，因此 Twilio 媒體幀可以直接轉發。</Note>

## 備註

<AccordionGroup>
  <Accordion title="驗證">驗證遵循標準提供者驗證順序。`DEEPGRAM_API_KEY` 是 最簡單的路徑。</Accordion>
  <Accordion title="Proxy 和自訂端點">使用 Proxy 時，使用 `tools.media.audio.baseUrl` 和 `tools.media.audio.headers` 覆寫端點或標頭。</Accordion>
  <Accordion title="輸出行為">輸出遵循與其他提供者相同的音訊規則（大小上限、逾時、 轉錄注入）。</Accordion>
</AccordionGroup>

## 相關

<CardGroup cols={2}>
  <Card title="媒體工具" href="/zh-Hant/tools/media-overview" icon="photo-film">
    音訊、圖片和影片處理管線概覽。
  </Card>
  <Card title="配置" href="/zh-Hant/gateway/configuration" icon="gear">
    完整配置參考，包括媒體工具設定。
  </Card>
  <Card title="疑難排解" href="/zh-Hant/help/troubleshooting" icon="wrench">
    常見問題與除錯步驟。
  </Card>
  <Card title="常見問題" href="/zh-Hant/help/faq" icon="circle-question">
    關於 OpenClaw 設定的常見問題。
  </Card>
</CardGroup>
