---
summary: "適用於 OpenClaw 回覆的 Inworld 串流文字轉語音"
read_when:
  - You want Inworld speech synthesis for outbound replies
  - You need PCM telephony or OGG_OPUS voice-note output from Inworld
title: "Inworld"
---

Inworld 是一個串流文字轉語音 (TTS) 提供商。在 OpenClaw 中，它合成輸出回覆音訊（預設為 MP3，語音留言則為 OGG_OPUS）以及語音頻道（例如 Voice Call）的 PCM 音訊。

OpenClaw 發佈請求至 Inworld 的串流 TTS 端點，將傳回的 base64 音訊區塊串接成單一緩衝區，並將結果傳遞給標準回覆音訊管線。

| 詳細資料 | 數值                                                       |
| -------- | ---------------------------------------------------------- |
| 網站     | [inworld.ai](https://inworld.ai)                           |
| 文件     | [docs.inworld.ai/tts/tts](https://docs.inworld.ai/tts/tts) |
| 驗證     | `INWORLD_API_KEY` (HTTP Basic，Base64 儀表板憑證)          |
| 預設語音 | `Sarah`                                                    |
| 預設模型 | `inworld-tts-1.5-max`                                      |

## 開始使用

<Steps>
  <Step title="設定您的 API 金鑰">
    從您的 Inworld 儀表板 (Workspace > API Keys) 複製憑證，並將其設為環境變數。該數值將照原樣作為 HTTP Basic 憑證發送，因此請勿再次進行 Base64 編碼或將其轉換為 bearer token。

    ```
    INWORLD_API_KEY=<base64-credential-from-dashboard>
    ```

  </Step>
  <Step title="在 messages.tts 中選擇 Inworld">
    ```json5
    {
      messages: {
        tts: {
          auto: "always",
          provider: "inworld",
          providers: {
            inworld: {
              voiceId: "Sarah",
              modelId: "inworld-tts-1.5-max",
            },
          },
        },
      },
    }
    ```
  </Step>
  <Step title="傳送訊息">
    透過任何連線的頻道傳送回覆。OpenClaw 會使用 Inworld 合成音訊，並以 MP3 格式傳送（當頻道預期為語音留言時則為 OGG_OPUS）。
  </Step>
</Steps>

## 設定選項

| 選項          | 路徑                                         | 描述                                                          |
| ------------- | -------------------------------------------- | ------------------------------------------------------------- |
| `apiKey`      | `messages.tts.providers.inworld.apiKey`      | Base64 儀表板憑證。若未設定則回退至 `INWORLD_API_KEY`。       |
| `baseUrl`     | `messages.tts.providers.inworld.baseUrl`     | 覆寫 Inworld API 基礎 URL (預設為 `https://api.inworld.ai`)。 |
| `voiceId`     | `messages.tts.providers.inworld.voiceId`     | 語音識別碼 (預設為 `Sarah`)。                                 |
| `modelId`     | `messages.tts.providers.inworld.modelId`     | TTS 模型 ID (預設為 `inworld-tts-1.5-max`)。                  |
| `temperature` | `messages.tts.providers.inworld.temperature` | 取樣溫度 `0..2` (選用)。                                      |

## 備註

<AccordionGroup>
  <Accordion title="Authentication">
    Inworld 使用 HTTP Basic 認證搭配單一 Base64 編碼的憑證字串。請從 Inworld 儀表板逐字複製。提供者會將其以 `Authorization: Basic <apiKey>` 發送，不做任何進一步編碼，因此請勿自行進行 Base64 編碼，也不要傳遞 bearer 風格的 token。
    請參閱 [TTS auth notes](/zh-Hant/tools/tts#inworld-primary) 了解相同的注意事項。
  </Accordion>
  <Accordion title="Models">
    支援的模型 ID：`inworld-tts-1.5-max` (預設)、
    `inworld-tts-1.5-mini`、`inworld-tts-1-max`、`inworld-tts-1`。
  </Accordion>
  <Accordion title="Audio outputs">
    回覆預設使用 MP3。當頻道目標是 `voice-note` 時，
    OpenClaw 會要求 Inworld 提供 `OGG_OPUS`，以便音訊作為原生語音泡泡播放。電話語音合成使用原始的 `PCM` (22050 Hz) 以饋送電話語音橋接器。
  </Accordion>
  <Accordion title="Custom endpoints">
    使用 `messages.tts.providers.inworld.baseUrl` 覆寫 API 主機。
    在發送請求之前會移除末尾斜線。
  </Accordion>
</AccordionGroup>

## 相關

<CardGroup cols={2}>
  <Card title="Text-to-speech" href="/zh-Hant/tools/tts" icon="waveform-lines">
    TTS 概覽、提供者和 `messages.tts` 設定。
  </Card>
  <Card title="Configuration" href="/zh-Hant/gateway/configuration" icon="gear">
    完整設定參考，包括 `messages.tts` 設定。
  </Card>
  <Card title="Providers" href="/zh-Hant/providers" icon="grid">
    所有內建的 OpenClaw 提供者。
  </Card>
  <Card title="疑難排解" href="/zh-Hant/help/troubleshooting" icon="wrench">
    常見問題與除錯步驟。
  </Card>
</CardGroup>
