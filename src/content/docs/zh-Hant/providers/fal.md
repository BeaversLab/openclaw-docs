---
title: "fal"
summary: "在 OpenClaw 中設定 fal 影像與影片生成"
read_when:
  - You want to use fal image generation in OpenClaw
  - You need the FAL_KEY auth flow
  - You want fal defaults for image_generate or video_generate
---

# fal

OpenClaw 內建了一個用於託管影像和影片生成的 `fal` 提供者。

- 提供者：`fal`
- 驗證：`FAL_KEY`（標準方式；`FAL_API_KEY` 也可作為備選）
- API：fal 模型端點

## 快速開始

1. 設定 API 金鑰：

```bash
openclaw onboard --auth-choice fal-api-key
```

2. 設定預設影像模型：

```json5
{
  agents: {
    defaults: {
      imageGenerationModel: {
        primary: "fal/fal-ai/flux/dev",
      },
    },
  },
}
```

## 影像生成

內建的 `fal` 影像生成提供者預設為
`fal/fal-ai/flux/dev`。

- 生成：每個請求最多 4 張影像
- 編輯模式：已啟用，1 張參考影像
- 支援 `size`、`aspectRatio` 和 `resolution`
- 目前編輯注意事項：fal 影像編輯端點**不**支援
  `aspectRatio` 覆寫

要將 fal 作為預設影像提供者：

```json5
{
  agents: {
    defaults: {
      imageGenerationModel: {
        primary: "fal/fal-ai/flux/dev",
      },
    },
  },
}
```

## 影片生成

內建的 `fal` 影片生成提供者預設為
`fal/fal-ai/minimax/video-01-live`。

- 模式：文字生成影片和單張影像參考流程
- 執行時間：針對長時間執行的工作，採用佇列備援的 submit/status/result 流程

要將 fal 作為預設影片提供者：

```json5
{
  agents: {
    defaults: {
      videoGenerationModel: {
        primary: "fal/fal-ai/minimax/video-01-live",
      },
    },
  },
}
```

## 相關

- [影像生成](/en/tools/image-generation)
- [影片生成](/en/tools/video-generation)
- [組態參考](/en/gateway/configuration-reference#agent-defaults)
