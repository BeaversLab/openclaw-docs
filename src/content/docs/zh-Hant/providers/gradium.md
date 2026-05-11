---
summary: "在 OpenClaw 中使用 Gradium 文字轉語音"
read_when:
  - You want Gradium for text-to-speech
  - You need Gradium API key or voice configuration
title: "Gradium"
---

Gradium 是 OpenClaw 內建的文字轉語音提供者。它可以產生一般的音訊回覆、與語音訊息相容的 Opus 輸出，以及用於電話介面的 8 kHz u-law 音訊。

## 設定

建立一個 Gradium API 金鑰，然後將其提供給 OpenClaw：

```bash
export GRADIUM_API_KEY="gsk_..."
```

您也可以將金鑰儲存在 `messages.tts.providers.gradium.apiKey` 下的 config 中。

## 設定

```json5
{
  messages: {
    tts: {
      auto: "always",
      provider: "gradium",
      providers: {
        gradium: {
          voiceId: "YTpq7expH9539ERJ",
          // apiKey: "${GRADIUM_API_KEY}",
          // baseUrl: "https://api.gradium.ai",
        },
      },
    },
  },
}
```

## 語音

| 名稱      | 語音 ID            |
| --------- | ------------------ |
| Emma      | `YTpq7expH9539ERJ` |
| Kent      | `LFZvm12tW_z0xfGo` |
| Tiffany   | `Eu9iL_CYe8N-Gkx_` |
| Christina | `2H4HY2CBNyJHBCrP` |
| Sydney    | `jtEKaLYNn6iif5PR` |
| John      | `KWJiFWu2O9nMPYcR` |
| Arthur    | `3jUdJyOi9pgbxBTK` |

預設語音：Emma。

## 輸出

- 音訊檔案回覆使用 WAV。
- 語音訊息回覆使用 Opus 並標記為語音相容。
- 電話語音合成在 8 kHz 下使用 `ulaw_8000`。

## 相關

- [文字轉語音](/zh-Hant/tools/tts)
- [媒體概覽](/zh-Hant/tools/media-overview)
