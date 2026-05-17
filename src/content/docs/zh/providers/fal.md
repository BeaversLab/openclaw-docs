---
summary: "在 OpenClaw 中设置 fal 图像和视频生成"
title: "Fal"
read_when:
  - You want to use fal image generation in OpenClaw
  - You need the FAL_KEY auth flow
  - You want fal defaults for image_generate or video_generate
---

OpenClaw 附带了一个捆绑的 `fal` 提供商，用于托管图像和视频生成。

| 属性   | 值                                                      |
| ------ | ------------------------------------------------------- |
| 提供商 | `fal`                                                   |
| 认证   | `FAL_KEY`（规范方式；`FAL_API_KEY` 也作为备选方案有效） |
| API    | fal 模型端点                                            |

## 入门指南

<Steps>
  <Step title="设置 API 密钥">
    ```bash
    openclaw onboard --auth-choice fal-api-key
    ```
  </Step>
  <Step title="设置默认图像模型">
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

## 图像生成

捆绑的 `fal` 图像生成提供商默认为
`fal/fal-ai/flux/dev`。

| 功能       | 值                                                           |
| ---------- | ------------------------------------------------------------ |
| 最大图像数 | 每次请求 4 张                                                |
| 编辑模式   | Flux：1 张参考图片；GPT Image 2：10 张；Nano Banana 2：14 张 |
| 尺寸覆盖   | 支持                                                         |
| 纵横比     | 支持 generate 以及 GPT Image 2/Nano Banana 2 edit            |
| 分辨率     | 支持                                                         |
| 输出格式   | `png` 或 `jpeg`                                              |

<Warning>Flux 图生图请求**不**支持 `aspectRatio` 覆盖。GPT Image 2 和 Nano Banana 2 编辑请求使用 fal 的 `/edit` 端点并接受 宽高比提示。</Warning>

当您需要 PNG 输出时，请使用 `outputFormat: "png"`。fal 未在 OpenClaw 中声明明确的透明背景控制，因此对于 fal 模型，`background:
"transparent"` 被报告为被忽略的覆盖选项。

要将 fal 用作默认图像提供商：

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

## 视频生成

捆绑的 `fal` 视频生成提供商默认为
`fal/fal-ai/minimax/video-01-live`。

| 能力   | 值                                           |
| ------ | -------------------------------------------- |
| 模式   | Text-to-video、单图参考、Seedance 参考生视频 |
| 运行时 | 长时间运行任务的队列支持提交/状态/结果流程   |

<AccordionGroup>
  <Accordion title="可用的视频模型">
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

  <Accordion title="Seedance 2.0 配置示例">
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

  <Accordion title="Seedance 2.0 参考视频生成配置示例">
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

    参考视频生成最多可通过共享的 `video_generate` `images`、`videos` 和 `audioRefs`
    参数接受 9 张图片、3 个视频和 3 个音频参考，总计最多 12 个参考文件。

  </Accordion>

  <Accordion title="HeyGen video-agent config example">
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

<Tip>使用 `openclaw models list --provider fal` 查看可用 fal 模型的完整列表，包括任何最近添加的条目。</Tip>

## 相关

<CardGroup cols={2}>
  <Card title="Image generation" href="/zh/tools/image-generation" icon="image">
    共享的图片工具参数和提供商选择。
  </Card>
  <Card title="Video generation" href="/zh/tools/video-generation" icon="video">
    共享的视频工具参数和提供商选择。
  </Card>
  <Card title="Configuration reference" href="/zh/gateway/config-agents#agent-defaults" icon="gear">
    代理默认设置，包括图片和视频模型选择。
  </Card>
</CardGroup>
