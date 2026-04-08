---
summary: "在 OpenClaw 中使用 Vydra 影像、影片和語音"
read_when:
  - You want Vydra media generation in OpenClaw
  - You need Vydra API key setup guidance
title: "Vydra"
---

# Vydra

內建的 Vydra 外掛程式新增了：

- 透過 `vydra/grok-imagine` 進行影像生成
- 透過 `vydra/veo3` 和 `vydra/kling` 進行影片生成
- 透過 Vydra 的 ElevenLabs 支援的 TTS 路由進行語音合成

OpenClaw 對於這三項功能都使用相同的 `VYDRA_API_KEY`。

## 重要基礎 URL

使用 `https://www.vydra.ai/api/v1`。

Vydra 的 apex 主機 (`https://vydra.ai/api/v1`) 目前會重新導向至 `www`。某些 HTTP 用戶端會在該跨主機重新導向時捨棄 `Authorization`，這會導致有效的 API 金鑰變成令人誤解的認證失敗。內建的外掛程式直接使用 `www` 基礎 URL 以避免這種情況。

## 設定

互動式引導：

```bash
openclaw onboard --auth-choice vydra-api-key
```

或直接設定環境變數：

```bash
export VYDRA_API_KEY="vydra_live_..."
```

## 影像生成

預設影像模型：

- `vydra/grok-imagine`

將其設為預設影像提供者：

```json5
{
  agents: {
    defaults: {
      imageGenerationModel: {
        primary: "vydra/grok-imagine",
      },
    },
  },
}
```

目前的內建支援僅限文字轉影像。Vydra 的託管編輯路由需要遠端影像 URL，而 OpenClaw 尚未在內建外掛程式中新增 Vydra 專用的上傳橋接器。

請參閱 [影像生成](/en/tools/image-generation) 以了解共用工具行為。

## 影片生成

已註冊的影片模型：

- `vydra/veo3` 用於文字轉影片
- `vydra/kling` 用於影像轉影片

將 Vydra 設為預設影片提供者：

```json5
{
  agents: {
    defaults: {
      videoGenerationModel: {
        primary: "vydra/veo3",
      },
    },
  },
}
```

備註：

- `vydra/veo3` 內建僅支援文字轉影片。
- `vydra/kling` 目前需要遠端影像 URL 參照。本機檔案上傳會在一開始就被拒絕。
- 內建的外掛程式保持保守，不會轉送未紀錄的樣式控制項，例如長寬比、解析度、浮水印或產生的音訊。

請參閱 [影片生成](/en/tools/video-generation) 以了解共用工具行為。

## 語音合成

將 Vydra 設為語音提供者：

```json5
{
  messages: {
    tts: {
      provider: "vydra",
      providers: {
        vydra: {
          apiKey: "${VYDRA_API_KEY}",
          voiceId: "21m00Tcm4TlvDq8ikWAM",
        },
      },
    },
  },
}
```

預設值：

- 模型： `elevenlabs/tts`
- 語音 ID： `21m00Tcm4TlvDq8ikWAM`

內建的外掛程式目前公開一個已知良好的預設語音，並傳回 MP3 音訊檔案。

## 相關

- [提供者目錄](/en/providers/index)
- [圖像生成](/en/tools/image-generation)
- [影片生成](/en/tools/video-generation)
