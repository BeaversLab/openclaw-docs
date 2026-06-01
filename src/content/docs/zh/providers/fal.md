---
summary: "OpenClaw在 OpenClaw 中设置 Fal 图像、视频和音乐生成"
title: "Fal"
read_when:
  - You want to use fal image generation in OpenClaw
  - You need the FAL_KEY auth flow
  - You want fal defaults for image_generate, video_generate, or music_generate
---

OpenClaw 附带了一个用于托管图像、视频和音乐生成的捆绑 OpenClaw`fal` 提供商。

| 属性   | 值                                                      |
| ------ | ------------------------------------------------------- |
| 提供商 | `fal`                                                   |
| 认证   | `FAL_KEY`（规范名称；`FAL_API_KEY` 也可以作为后备使用） |
| API    | fal 模型端点                                            |

## 入门指南

<Steps>
  <Step title="API设置 API 密钥">
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
| 最大图像数 | 每次请求 4 个；Krea 2：每次请求 1 个                         |
| 编辑模式   | Flux：1 张参考图片；GPT Image 2：10 张；Nano Banana 2：14 张 |
| 风格参考   | Krea 2：通过 `image` / `images` 支持最多 10 个风格参考       |
| 尺寸覆盖   | 支持                                                         |
| 宽高比     | 支持 generate、Krea 2 以及 GPT Image 2/Nano Banana 2 编辑    |
| 分辨率     | 已支持                                                       |
| 输出格式   | `png` 或 `jpeg`                                              |

<Warning>Flux 图像转图像请求**不**支持 `aspectRatio` 覆盖。GPT Image 2 和 Nano Banana 2 编辑请求使用 fal 的 `/edit` 端点并接受 宽高比提示。Nano Banana 2 还接受额外的原生宽/高比例， 例如 `4:1`、`1:4`、`8:1` 和 `1:8`；Krea 2 会验证自己较小的 宽高比子集。</Warning>

Krea 2 模型使用 fal 的原生 Krea 有效载荷架构。OpenClaw 发送
OpenClaw`aspect_ratio`、`creativity` 和 `image_style_references`，而不是由 Flux 使用的
通用 `image_size` / 编辑端点有效载荷。模型引用为：

- `fal/krea/v2/medium/text-to-image`
- `fal/krea/v2/large/text-to-image`

使用 Medium 可获得更快的具表现力插画、动漫、绘画和艺术风格。使用 Large 可获得较慢的照片级逼真、原始纹理、胶片颗粒和精细外观。Krea 默认为 `fal.creativity: "medium"`；支持的值为 `raw`、`low`、`medium` 和 `high`。

Krea 2 在 fal 的请求架构中公开的是宽高比，而不是 `image_size`。首选 `aspectRatio`；OpenClaw 会将 `size` 映射到最接近的受支持 Krea 宽高比，并会拒绝针对 Krea 的 `resolution`，而不是直接将其丢弃。

当您希望从公开 `output_format` 的 fal 模型获取 PNG 输出时，请使用 `outputFormat: "png"`。fal 未在 OpenClaw 中声明显式的透明背景控件，因此 `background: "transparent"` 被报告为针对 fal 模型的已忽略覆盖项。
Krea 2 端点未通过 fal 公开 `output_format` 请求字段，因此 OpenClaw 会拒绝针对 Krea 请求的 `outputFormat` 覆盖项。

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

## 视频生成

内置的 `fal` 视频生成提供商默认为 `fal/fal-ai/minimax/video-01-live`。

| 能力   | 值                                               |
| ------ | ------------------------------------------------ |
| 模式   | 文本生成视频、单图像参考、Seedance 参考生成视频  |
| 运行时 | 针对长时间运行任务的队列支持的提交/状态/结果流程 |

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

  <Accordion title="Seedance 2.0 参考视频配置示例">
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

    参考视频通过共享的 `video_generate`、`images`、`videos` 和 `audioRefs`
    参数，最多接受 9 张图片、3 个视频和 3 个音频参考，总共最多 12 个参考文件。

  </Accordion>

  <Accordion title="HeyGen 视频代理配置示例">
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

## 音乐生成

捆绑的 `fal` 插件还为共享的 `music_generate` 工具注册了一个音乐生成提供商。

| 能力     | 值                                                                                                     |
| -------- | ------------------------------------------------------------------------------------------------------ |
| 默认模型 | `fal/fal-ai/minimax-music/v2.6`                                                                        |
| 模型     | `fal-ai/minimax-music/v2.6`、`fal-ai/ace-step/prompt-to-audio`、`fal-ai/stable-audio-25/text-to-audio` |
| 运行时   | 同步请求加上生成的音频下载                                                                             |

将 fal 用作默认音乐提供商：

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

`fal-ai/minimax-music/v2.6` 支持显式歌词和器乐模式。
ACE-Step 和 Stable Audio 是提示词到音频的端点；当您想要这些模型系列时，请使用
`model` 覆盖来选择它们。

<Tip>使用 `openclaw models list --provider fal` 查看可用 fal 模型的完整列表， 包括任何最近添加的条目。</Tip>

## 相关

<CardGroup cols={2}>
  <Card title="图像生成" href="/zh/tools/image-generation" icon="image">
    共享图像工具参数和提供商选择。
  </Card>
  <Card title="视频生成" href="/zh/tools/video-generation" icon="video">
    共享视频工具参数和提供商选择。
  </Card>
  <Card title="音乐生成" href="/zh/tools/music-generation" icon="music">
    共享音乐工具参数和提供商选择。
  </Card>
  <Card title="配置参考" href="/zh/gateway/config-agents#agent-defaults" icon="gear">
    Agent 默认值，包括图像、视频和音乐模型的选择。
  </Card>
</CardGroup>
