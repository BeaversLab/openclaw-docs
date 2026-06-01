---
summary: "OpenClaw 回覆的 Azure AI Speech 文字轉語音"
read_when:
  - You want Azure Speech synthesis for outbound replies
  - You need native Ogg Opus voice-note output from Azure Speech
title: "Azure Speech"
---

Azure Speech 是一個 Azure AI Speech 文字轉語音提供商。在 OpenClaw 中，它預設將輸出回覆音訊合成為 MP3，語音訊息則為原生 Ogg/Opus 格式，而語音通訊等電信管道則使用 8 kHz mulaw 音訊。

OpenClaw 直接透過 SSML 使用 Azure Speech REST API，並透過 `X-Microsoft-OutputFormat` 傳送提供商擁有的輸出格式。

| 詳細資訊         | 數值                                                                                                       |
| ---------------- | ---------------------------------------------------------------------------------------------------------- |
| 網站             | [Azure AI 語音](https://azure.microsoft.com/products/ai-services/ai-speech)                                |
| 文件             | [Speech REST 文字轉語音](https://learn.microsoft.com/azure/ai-services/speech-service/rest-text-to-speech) |
| 驗證             | `AZURE_SPEECH_KEY` 加上 `AZURE_SPEECH_REGION`                                                              |
| 預設語音         | `en-US-JennyNeural`                                                                                        |
| 預設檔案輸出     | `audio-24khz-48kbitrate-mono-mp3`                                                                          |
| 預設語音訊息檔案 | `ogg-24khz-16bit-mono-opus`                                                                                |

## 開始使用

<Steps>
  <Step title="建立 Azure Speech 資源">
    在 Azure 入口網站中，建立 Speech 資源。從資源管理 > 金鑰和端點複製 **金鑰 1 (KEY 1)**，並複製資源位置，例如 `eastus`。

    ```
    AZURE_SPEECH_KEY=<speech-resource-key>
    AZURE_SPEECH_REGION=eastus
    ```

  </Step>
  <Step title="在 messages.tts 中選取 Azure Speech">
    ```json5
    {
      messages: {
        tts: {
          auto: "always",
          provider: "azure-speech",
          providers: {
            "azure-speech": {
              speakerVoice: "en-US-JennyNeural",
              lang: "en-US",
            },
          },
        },
      },
    }
    ```
  </Step>
  <Step title="傳送訊息">
    透過任何連接的管道傳送回覆。OpenClaw 會使用 Azure Speech 合成音訊，並針對標準音訊傳送 MP3，當管道預期為語音訊息時則傳送 Ogg/Opus。
  </Step>
</Steps>

## 組態選項

| 選項                    | 路徑                                                        | 描述                                                                                         |
| ----------------------- | ----------------------------------------------------------- | -------------------------------------------------------------------------------------------- |
| `apiKey`                | `messages.tts.providers.azure-speech.apiKey`                | Azure Speech 資源金鑰。會回退至 `AZURE_SPEECH_KEY`、`AZURE_SPEECH_API_KEY` 或 `SPEECH_KEY`。 |
| `region`                | `messages.tts.providers.azure-speech.region`                | Azure Speech 資源區域。會回退至 `AZURE_SPEECH_REGION` 或 `SPEECH_REGION`。                   |
| `endpoint`              | `messages.tts.providers.azure-speech.endpoint`              | 選用的 Azure Speech 端點/基底 URL 覆寫。                                                     |
| `baseUrl`               | `messages.tts.providers.azure-speech.baseUrl`               | 選用 Azure Speech 基礎 URL 覆寫。                                                            |
| `speakerVoice`          | `messages.tts.providers.azure-speech.speakerVoice`          | Azure 語音 ShortName（預設為 `en-US-JennyNeural`）。舊版別名：`voice`。                      |
| `lang`                  | `messages.tts.providers.azure-speech.lang`                  | SSML 語言代碼（預設為 `en-US`）。                                                            |
| `outputFormat`          | `messages.tts.providers.azure-speech.outputFormat`          | 音訊檔案輸出格式（預設為 `audio-24khz-48kbitrate-mono-mp3`）。                               |
| `voiceNoteOutputFormat` | `messages.tts.providers.azure-speech.voiceNoteOutputFormat` | 語音備忘錄輸出格式（預設為 `ogg-24khz-16bit-mono-opus`）。                                   |

## 注意事項

<AccordionGroup>
  <Accordion title="驗證">
    Azure Speech 使用 Speech 資源金鑰，而非 Azure OpenAI 金鑰。金鑰會以 `Ocp-Apim-Subscription-Key` 形式傳送；除非您提供 `endpoint` 或 `baseUrl`，否則 OpenClaw 會從 `region` 推導出 `https://<region>.tts.speech.microsoft.com`。
  </Accordion>
  <Accordion title="語音名稱">
    使用 Azure Speech 語音的 `ShortName` 值，例如 `en-US-JennyNeural`。隨附的提供者可以透過相同的 Speech 資源列出語音，並篩選掉標記為已棄用或已退休的語音。
  </Accordion>
  <Accordion title="音訊輸出">
    Azure 接受諸如 `audio-24khz-48kbitrate-mono-mp3`、`ogg-24khz-16bit-mono-opus` 和 `riff-24khz-16bit-mono-pcm` 等輸出格式。OpenClaw 會為 `voice-note` 目標請求 Ogg/Opus，以便頻道能夠傳送原生語音氣泡，而無需額外的 MP3 轉換。
  </Accordion>
  <Accordion title="Alias">
    現有的 PR 和使用者設定接受將 `azure` 作為供應商別名，
    但新設定應使用 `azure-speech` 以避免與 Azure
    OpenAI 模型供應商混淆。
  </Accordion>
</AccordionGroup>

## 相關

<CardGroup cols={2}>
  <Card title="Text-to-speech" href="/zh-Hant/tools/tts" icon="waveform-lines">
    TTS 概覽、供應商以及 `messages.tts` 設定。
  </Card>
  <Card title="Configuration" href="/zh-Hant/gateway/configuration" icon="gear">
    完整設定參考，包括 `messages.tts` 設定。
  </Card>
  <Card title="供應商" href="/zh-Hant/providers" icon="grid">
    所有內建的 OpenClaw 供應商。
  </Card>
  <Card title="疑難排解" href="/zh-Hant/help/troubleshooting" icon="wrench">
    常見問題與除錯步驟。
  </Card>
</CardGroup>
