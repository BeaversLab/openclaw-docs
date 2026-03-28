---
summary: "Deepgram 入門語音備忘錄的轉錄"
read_when:
  - You want Deepgram speech-to-text for audio attachments
  - You need a quick Deepgram config example
title: "Deepgram"
---

# Deepgram (音訊轉錄)

Deepgram 是一個語音轉文字 API。在 OpenClaw 中，它透過 `tools.media.audio` 用於**入門音訊/語音備忘錄轉錄**。

啟用後，OpenClaw 會將音訊檔案上傳至 Deepgram，並將轉錄內容注入回覆管線 (`{{Transcript}}` + `[Audio]` 區塊)。這**不是串流傳輸**；
它使用的是預錄音訊的轉錄端點。

網站: [https://deepgram.com](https://deepgram.com)  
文件: [https://developers.deepgram.com](https://developers.deepgram.com)

## 快速開始

1. 設定您的 API 金鑰:

```
DEEPGRAM_API_KEY=dg_...
```

2. 啟用供應商:

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

## 選項

- `model`: Deepgram 模型 ID (預設: `nova-3`)
- `language`: 語言提示（可選）
- `tools.media.audio.providerOptions.deepgram.detect_language`: 啟用語言檢測（可選）
- `tools.media.audio.providerOptions.deepgram.punctuate`: 啟用標點符號（可選）
- `tools.media.audio.providerOptions.deepgram.smart_format`: 啟用智慧格式化（可選）

語言範例：

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

Deepgram 選項範例：

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

## 注意事項

- 驗證遵循標準的提供者驗證順序；`DEEPGRAM_API_KEY` 是最簡單的路徑。
- 使用 Proxy 時，使用 `tools.media.audio.baseUrl` 和 `tools.media.audio.headers` 覆寫端點或標頭。
- 輸出遵循與其他提供者相同的音訊規則（大小上限、逾時、逐字稿注入）。
