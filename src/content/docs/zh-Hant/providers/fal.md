---
title: "fal"
summary: "在 OpenClaw 中設定 fal 影像與影片生成"
read_when:
  - You want to use fal image generation in OpenClaw
  - You need the FAL_KEY auth flow
  - You want fal defaults for image_generate or video_generate
---

# fal

OpenClaw 內建一個用於託管圖片和影片生成的 `fal` 提供者。

| 屬性   | 值                                           |
| ------ | -------------------------------------------- |
| 提供者 | `fal`                                        |
| 驗證   | `FAL_KEY` (標準；`FAL_API_KEY` 也可作為備用) |
| API    | fal 模型端點                                 |

## 開始使用

<Steps>
  <Step title="設定 API 金鑰">
    ```bash
    openclaw onboard --auth-choice fal-api-key
    ```
  </Step>
  <Step title="設定預設影像模型">
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
  </Step>
</Steps>

## 影像生成

隨附的 `fal` 影像生成提供者預設為
`fal/fal-ai/flux/dev`。

| 功能       | 值                   |
| ---------- | -------------------- |
| 最大影像數 | 每次請求 4 張        |
| 編輯模式   | 已啟用，1 張參考影像 |
| 尺寸覆寫   | 支援                 |
| 長寬比     | 支援                 |
| 解析度     | 支援                 |

<Warning>fal 影像編輯端點並**不**支援 `aspectRatio` 覆寫。</Warning>

若要使用 fal 作為預設影像提供者：

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

隨附的 `fal` 影片生成提供者預設為
`fal/fal-ai/minimax/video-01-live`。

| 功能     | 值                                                 |
| -------- | -------------------------------------------------- |
| 模式     | 文字生成影片、單一影像參考                         |
| 執行時間 | 長時間執行工作的佇列備援 submit/status/result 流程 |

<AccordionGroup>
  <Accordion title="可用的影片模型">
    **HeyGen video-agent:**

    - `fal/fal-ai/heygen/v2/video-agent`

    **Seedance 2.0:**

    - `fal/bytedance/seedance-2.0/fast/text-to-video`
    - `fal/bytedance/seedance-2.0/fast/image-to-video`
    - `fal/bytedance/seedance-2.0/text-to-video`
    - `fal/bytedance/seedance-2.0/image-to-video`

  </Accordion>

  <Accordion title="Seedance 2.0 設定範例">
    ```json5
    {
      agents: {
        defaults: {
          videoGenerationModel: {
            primary: "fal/bytedance/seedance-2.0/fast/text-to-video",
          },
        },
      },
    }
    ```
  </Accordion>

  <Accordion title="HeyGen video-agent 設定範例">
    ```json5
    {
      agents: {
        defaults: {
          videoGenerationModel: {
            primary: "fal/fal-ai/heygen/v2/video-agent",
          },
        },
      },
    }
    ```
  </Accordion>
</AccordionGroup>

<Tip>使用 `openclaw models list --provider fal` 查看所有可用的 fal 模型完整列表，包括最近新增的項目。</Tip>

## 相關

<CardGroup cols={2}>
  <Card title="影像生成" href="/zh-Hant/tools/image-generation" icon="image">
    共用的影像工具參數和提供者選擇。
  </Card>
  <Card title="視訊生成" href="/zh-Hant/tools/video-generation" icon="video">
    共用的視訊工具參數與提供者選擇。
  </Card>
  <Card title="組態參考" href="/zh-Hant/gateway/configuration-reference#agent-defaults" icon="gear">
    代理程式預設值，包括圖片和視訊模型選擇。
  </Card>
</CardGroup>
