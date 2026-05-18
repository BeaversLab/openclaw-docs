---
summary: "在 OpenClaw 中設定 fal 影像、影片和音樂生成"
title: "Fal"
read_when:
  - You want to use fal image generation in OpenClaw
  - You need the FAL_KEY auth flow
  - You want fal defaults for image_generate, video_generate, or music_generate
---

OpenClaw 隨附了一個用於託管影像、影片和音樂生成的內建 `fal` 提供者。

| 屬性   | 值                                                       |
| ------ | -------------------------------------------------------- |
| 提供者 | `fal`                                                    |
| 驗證   | `FAL_KEY` (標準寫法；`FAL_API_KEY` 也可作為後備方案使用) |
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

內建的 `fal` 影像生成提供者預設為
`fal/fal-ai/flux/dev`。

| 功能       | 值                                                           |
| ---------- | ------------------------------------------------------------ |
| 最大影像數 | 每次請求 4 張                                                |
| 編輯模式   | Flux：1 張參考圖片；GPT Image 2：10 張；Nano Banana 2：14 張 |
| 尺寸覆寫   | 支援                                                         |
| 長寬比     | 支援 generate 以及 GPT Image 2/Nano Banana 2 編輯            |
| 解析度     | 支援                                                         |
| 輸出格式   | `png` 或 `jpeg`                                              |

<Warning>Flux 影像轉影像請求**不**支援 `aspectRatio` 覆寫。GPT Image 2 和 Nano Banana 2 編輯請求使用 fal 的 `/edit` 端點並接受 長寬比提示。</Warning>

當您需要 PNG 輸出時，請使用 `outputFormat: "png"`。fal 並未在 OpenClaw 中宣告明確的
透明背景控制項，因此對於 fal 模型，`background:
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

    參考影片透過共用的 `video_generate` `images`、`videos` 和 `audioRefs`
    參數，最多接受 9 張圖片、3 個影片和 3 個音訊參考，參考檔案總數最多 12 個。

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

內建的 `fal` 外掛程式也會為共用的
`music_generate` 工具註冊音樂生成供應商。

| 功能     | 數值                                                                                                   |
| -------- | ------------------------------------------------------------------------------------------------------ |
| 預設模型 | `fal/fal-ai/minimax-music/v2.6`                                                                        |
| 模型     | `fal-ai/minimax-music/v2.6`、`fal-ai/ace-step/prompt-to-audio`、`fal-ai/stable-audio-25/text-to-audio` |
| 執行時間 | 同步請求加上生成的音訊下載                                                                             |

使用 fal 作為預設的音樂供應商：

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

`fal-ai/minimax-music/v2.6` 支援明確歌詞和器樂模式。
ACE-Step 和 Stable Audio 是提示詞轉音訊的端點；當您需要這些模型系列時，請使用
`model` 覆寫來選擇它們。

<Tip>使用 `openclaw models list --provider fal` 查看可用 fal 模型的完整清單， 包括任何最近新增的項目。</Tip>

## 相關

<CardGroup cols={2}>
  <Card title="圖片生成" href="/zh-Hant/tools/image-generation" icon="image">
    共用的圖片工具參數和供應商選擇。
  </Card>
  <Card title="影片生成" href="/zh-Hant/tools/video-generation" icon="video">
    共用的影片工具參數和供應商選擇。
  </Card>
  <Card title="音樂生成" href="/zh-Hant/tools/music-generation" icon="music">
    共用的音樂工具參數和供應商選擇。
  </Card>
  <Card title="設定參考" href="/zh-Hant/gateway/config-agents#agent-defaults" icon="gear">
    Agent 預設值，包括影像、影片和音樂模型選擇。
  </Card>
</CardGroup>
