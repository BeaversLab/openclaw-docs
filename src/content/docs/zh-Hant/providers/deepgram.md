---
summary: "Deepgram 轉錄適用於語音留言"
read_when:
  - You want Deepgram speech-to-text for audio attachments
  - You need a quick Deepgram config example
title: "Deepgram"
---

# Deepgram (音訊轉錄)

Deepgram 是一個語音轉文字 API。在 OpenClaw 中，它透過 `tools.media.audio` 用於 **傳入音訊/語音留言轉錄**。

啟用後，OpenClaw 會將音訊檔案上傳至 Deepgram，並將逐字稿注入回應管線 (`{{Transcript}}` + `[Audio]` 區塊)。這**非串流**；
它使用的是預錄音轉錄端點。

網站： [https://deepgram.com](https://deepgram.com)  
文件： [https://developers.deepgram.com](https://developers.deepgram.com)

## 快速開始

1. 設定您的 API 金鑰：

```
DEEPGRAM_API_KEY=dg_...
```

2. 啟用提供者：

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

- `model`: Deepgram 模型 ID (預設：`nova-3`)
- `language`: 語言提示 (選用)
- `tools.media.audio.providerOptions.deepgram.detect_language`: 啟用語言偵測 (選用)
- `tools.media.audio.providerOptions.deepgram.punctuate`: 啟用標點符號 (選用)
- `tools.media.audio.providerOptions.deepgram.smart_format`: 啟用智慧格式化 (選用)

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

- 驗證遵循標準提供者驗證順序；`DEEPGRAM_API_KEY` 是最簡單的方式。
- 使用代理時，可以使用 `tools.media.audio.baseUrl` 和 `tools.media.audio.headers` 覆寫端點或標頭。
- 輸出遵循與其他提供者相同的音訊規則 (大小上限、逾時、逐字稿注入)。
