---
summary: "在 OpenClaw 中設定 fal 影像、影片和音樂生成"
title: "Fal"
read_when:
  - You want to use fal image generation in OpenClaw
  - You need the FAL_KEY auth flow
  - You want fal defaults for image_generate, video_generate, or music_generate
---

OpenClaw 隨附了一個用於代管影像、影片和音樂生成的捆綁 `fal` 提供者。

| 屬性   | 值                                                       |
| ------ | -------------------------------------------------------- |
| 提供者 | `fal`                                                    |
| 驗證   | `FAL_KEY` (正式用法；`FAL_API_KEY` 也可作為備選方案使用) |
| API    | fal 模型端點                                             |

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

捆綁的 `fal` 影像生成提供者預設為
`fal/fal-ai/flux/dev`。

| 功能       | 值                                                           |
| ---------- | ------------------------------------------------------------ |
| 最大影像數 | 每個請求 4 個；Krea 2：每個請求 1 個                         |
| 編輯模式   | Flux：1 張參考圖片；GPT Image 2：10 張；Nano Banana 2：14 張 |
| 風格參考   | Krea 2：透過 `image` / `images` 最多支援 10 個風格參考       |
| 尺寸覆蓋   | 已支援                                                       |
| 長寬比     | 支援 generate、Krea 2 以及 GPT Image 2/Nano Banana 2 編輯    |
| 解析度     | 已支援                                                       |
| 輸出格式   | `png` 或 `jpeg`                                              |

<Warning>Flux 影像轉影像請求**不**支援 `aspectRatio` 覆蓋。GPT Image 2 和 Nano Banana 2 編輯請求使用 fal 的 `/edit` 端點並接受 長寬比提示。Nano Banana 2 也接受額外的原生寬/高比例 ，例如 `4:1`、`1:4`、`8:1` 和 `1:8`；Krea 2 會驗證其自身較小的 長寬比子集。</Warning>

Krea 2 模型使用 fal 原生的 Krea payload schema。OpenClaw 發送
`aspect_ratio`、`creativity` 和 `image_style_references`，而不是 Flux 使用的
一般 `image_size` / 編輯端點 payload。模型參考為：

- `fal/krea/v2/medium/text-to-image`
- `fal/krea/v2/large/text-to-image`

使用 Medium 以獲得更快的表現力強的插圖、動漫、繪畫和藝術風格。使用 Large 以獲得更慢的照片般真實、原始紋理、膠片顆粒和精細的外觀。Krea 預設為 `fal.creativity: "medium"`；支援的值為 `raw`、`low`、`medium` 和 `high`。

Krea 2 在 fal 的請求架構中公開了長寬比，而不是 `image_size`。優先使用 `aspectRatio`；OpenClaw 會將 `size` 對應到最接近的支援的 Krea 長寬比，並對於 Krea 拒絕 `resolution` 而不是將其捨棄。

當您想要從公開 `output_format` 的 fal 模型獲得 PNG 輸出時，請使用 `outputFormat: "png"`。 fal 未在 OpenClaw 中宣告明確的透明背景控制，因此 `background: "transparent"` 被報告為 fal 模型的被忽略的覆寫。
Krea 2 端點未透過 fal 公開 `output_format` 請求欄位，因此 OpenClaw 會拒絕 Krea 請求的 `outputFormat` 覆寫。

要將 fal 用作預設的影像提供者：

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

要使用 Krea 2 Medium：

```json5
{
  agents: {
    defaults: {
      imageGenerationModel: {
        primary: "fal/krea/v2/medium/text-to-image",
      },
    },
  },
}
```

## 影片生成

內建的 `fal` 影片生成提供者預設為 `fal/fal-ai/minimax/video-01-live`。

| 功能     | 值                                                |
| -------- | ------------------------------------------------- |
| 模式     | 文字生成影片、單一影像參考、Seedance 參考生成影片 |
| 執行時間 | 長時間執行工作的佇列支援提交/狀態/結果流程        |

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

  <Accordion title="Seedance 2.0 配置範例">
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

  <Accordion title="Seedance 2.0 參考影片設定範例">
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

    參考影片接受最多 9 張圖片、3 部影片和 3 個音訊參考，
    透過共用的 `video_generate` `images`、`videos` 和 `audioRefs`
    參數，最多 12 個參考檔案。

  </Accordion>

  <Accordion title="HeyGen 影片代理設定範例">
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

## 音樂生成

內建的 `fal` 外掛程式也會為共用的 `music_generate` 工具註冊一個音樂生成提供者。

| 功能     | 值                                                                                                     |
| -------- | ------------------------------------------------------------------------------------------------------ |
| 預設模型 | `fal/fal-ai/minimax-music/v2.6`                                                                        |
| 模型     | `fal-ai/minimax-music/v2.6`、`fal-ai/ace-step/prompt-to-audio`、`fal-ai/stable-audio-25/text-to-audio` |
| 執行階段 | 同步請求加上生成的音訊下載                                                                             |

使用 fal 作為預設的音樂提供者：

```json5
{
  agents: {
    defaults: {
      musicGenerationModel: {
        primary: "fal/fal-ai/minimax-music/v2.6",
      },
    },
  },
}
```

`fal-ai/minimax-music/v2.6` 支援明確歌詞和純音樂模式。
ACE-Step 和 Stable Audio 是提示詞轉音訊的端點；當您想要這些模型系列時，請使用
`model` 覆寫來選擇它們。

<Tip>使用 `openclaw models list --provider fal` 查看可用的 fal 模型完整列表， 包括任何最近新增的項目。</Tip>

## 相關

<CardGroup cols={2}>
  <Card title="圖像生成" href="/zh-Hant/tools/image-generation" icon="image">
    共用的圖像工具參數和提供者選擇。
  </Card>
  <Card title="影片生成" href="/zh-Hant/tools/video-generation" icon="video">
    共用的影片工具參數和提供者選擇。
  </Card>
  <Card title="音樂生成" href="/zh-Hant/tools/music-generation" icon="music">
    共用的音樂工具參數和提供者選擇。
  </Card>
  <Card title="Configuration reference" href="/zh-Hant/gateway/config-agents#agent-defaults" icon="gear">
    Agent 預設值，包括影像、視訊和音樂模型的選擇。
  </Card>
</CardGroup>
