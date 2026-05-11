---
summary: "在 OpenClaw 中設定 fal 影像與影片生成"
title: "Fal"
read_when:
  - You want to use fal image generation in OpenClaw
  - You need the FAL_KEY auth flow
  - You want fal defaults for image_generate or video_generate
---

OpenClaw 內建了一個用於託管影像和影片生成的 `fal` 提供者。

| 屬性   | 值                                           |
| ------ | -------------------------------------------- |
| 提供者 | `fal`                                        |
| 驗證   | `FAL_KEY` (正式；`FAL_API_KEY` 也可作為備用) |
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

內建的 `fal` 影像生成提供者預設為
`fal/fal-ai/flux/dev`。

| 功能       | 值                   |
| ---------- | -------------------- |
| 最大影像數 | 每次請求 4 張        |
| 編輯模式   | 已啟用，1 張參考影像 |
| 尺寸覆寫   | 支援                 |
| 長寬比     | 支援                 |
| 解析度     | 支援                 |
| 輸出格式   | `png` 或 `jpeg`      |

<Warning>fal 影像編輯端點**不**支援 `aspectRatio` 覆寫。</Warning>

當您想要 PNG 輸出時，請使用 `outputFormat: "png"`。fal 並未在 OpenClaw 中宣告明確的透明背景控制，因此對於 fal 模型來說，`background:
"transparent"` 會被回報為已忽略的覆寫設定。

若要將 fal 作為預設的影像提供者：

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

| 功能     | 值                                                       |
| -------- | -------------------------------------------------------- |
| 模式     | 文字生成影片、單一影像參考、Seedance 參考生成影片        |
| 執行時間 | 針對長時間執行的工作，採用由佇列支援的提交/狀態/結果流程 |

<AccordionGroup>
  <Accordion title="可用的影片模型">
    **HeyGen video-agent:**

    - `fal/fal-ai/heygen/v2/video-agent`

    **Seedance 2.0:**

    - `fal/bytedance/seedance-2.0/fast/text-to-video`
    - `fal/bytedance/seedance-2.0/fast/image-to-video`
    - `fal/bytedance/seedance-2.0/fast/reference-to-video`
    - `fal/bytedance/seedance-2.0/text-to-video`
    - `fal/bytedance/seedance-2.0/image-to-video`
    - `fal/bytedance/seedance-2.0/reference-to-video`

  </Accordion>

  <Accordion title="Seedance 2.0 組態範例">
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

  <Accordion title="Seedance 2.0 參考影片組態範例">
    ```json5
    {
      agents: {
        defaults: {
          videoGenerationModel: {
            primary: "fal/bytedance/seedance-2.0/fast/reference-to-video",
          },
        },
      },
    }
    ```

    參考影片（Reference-to-video）透過共用的 `video_generate` `images`、`videos` 和 `audioRefs`
    參數，最多接受 9 張圖片、3 部影片和 3 個音訊參考，
    且參考檔案總數最多為 12 個。

  </Accordion>

  <Accordion title="HeyGen video-agent 組態範例">
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

<Tip>使用 `openclaw models list --provider fal` 查看可用的 fal 模型完整清單， 包括最近新增的項目。</Tip>

## 相關

<CardGroup cols={2}>
  <Card title="圖片生成" href="/zh-Hant/tools/image-generation" icon="image">
    共用的圖片工具參數與提供者選擇。
  </Card>
  <Card title="影片生成" href="/zh-Hant/tools/video-generation" icon="video">
    共用的影片工具參數與提供者選擇。
  </Card>
  <Card title="組態參考" href="/zh-Hant/gateway/config-agents#agent-defaults" icon="gear">
    Agent 預設值，包括圖片和影片模型選擇。
  </Card>
</CardGroup>
