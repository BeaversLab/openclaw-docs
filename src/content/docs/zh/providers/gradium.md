---
summary: "在 OpenClaw 中使用 Gradium 文本转语音"
read_when:
  - You want Gradium for text-to-speech
  - You need Gradium API key or voice configuration
title: "Gradium"
---

Gradium 是 OpenClaw 的内置文本转语音提供商。它可以生成普通音频回复、与语音笔记兼容的 Opus 输出，以及用于电话界面的 8 kHz u-law 音频。

## 设置

创建一个 Gradium API 密钥，然后将其暴露给 OpenClaw：

```bash
export GRADIUM_API_KEY="gsk_..."
```

您也可以将密钥存储在配置中的 `messages.tts.providers.gradium.apiKey` 下。

## 配置

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

## 语音

| 名称      | 语音 ID            |
| --------- | ------------------ |
| Emma      | `YTpq7expH9539ERJ` |
| Kent      | `LFZvm12tW_z0xfGo` |
| Tiffany   | `Eu9iL_CYe8N-Gkx_` |
| Christina | `2H4HY2CBNyJHBCrP` |
| Sydney    | `jtEKaLYNn6iif5PR` |
| John      | `KWJiFWu2O9nMPYcR` |
| Arthur    | `3jUdJyOi9pgbxBTK` |

默认语音：Emma。

## 输出

- 音频文件回复使用 WAV。
- 语音笔记回复使用 Opus 并被标记为语音兼容。
- 电话合成使用 8 kHz 的 `ulaw_8000`。

## 相关

- [文本转语音](/zh/tools/tts)
- [媒体概述](/zh/tools/media-overview)
