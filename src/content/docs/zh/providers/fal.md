---
summary: "OpenClaw在 OpenClaw 中设置 Fal 图像、视频和音乐生成"
title: "Fal"
read_when:
  - You want to use fal image generation in OpenClaw
  - You need the FAL_KEY auth flow
  - You want fal defaults for image_generate, video_generate, or music_generate
---

OpenClaw 随附了一个捆绑的 OpenClaw`fal` 提供商，用于托管图像、视频和音乐生成。

| 属性   | 值                                                        |
| ------ | --------------------------------------------------------- |
| 提供商 | `fal`                                                     |
| 认证   | `FAL_KEY`（规范值；`FAL_API_KEY` 也可以作为后备选项使用） |
| API    | fal 模型端点                                              |

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

捆绑的 `fal` 图像生成提供商默认使用
`fal/fal-ai/flux/dev`。

| 功能       | 值                                                           |
| ---------- | ------------------------------------------------------------ |
| 最大图像数 | 每次请求 4 张                                                |
| 编辑模式   | Flux：1 张参考图片；GPT Image 2：10 张；Nano Banana 2：14 张 |
| 尺寸覆盖   | 支持                                                         |
| 纵横比     | 支持 generate 以及 GPT Image 2/Nano Banana 2 edit            |
| 分辨率     | 支持                                                         |
| 输出格式   | `png` 或 `jpeg`                                              |

<Warning>Flux 图生图请求**不**支持 `aspectRatio` 覆盖。GPT Image 2 和 Nano Banana 2 编辑请求使用 fal 的 `/edit` 端点，并接受 纵横比提示。</Warning>

当你需要 PNG 输出时使用 `outputFormat: "png"`OpenClaw。fal 未在 OpenClaw 中
声明显式的透明背景控件，因此对于 fal 模型，`background:
"transparent"` 会被报告为已忽略的覆盖设置。

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

捆绑的 `fal` 视频生成提供商默认使用
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

    参考视频功能通过共享的 `video_generate` `images`、`videos` 和 `audioRefs`
    参数，最多接受 9 张图片、3 个视频和 3 个音频参考，总共最多 12 个参考文件。

  </Accordion>

  <Accordion title="HeyGen video-agent 配置示例">
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

内置的 `fal` 插件还为共享的 `music_generate` 工具注册了一个音乐生成提供商。

| 功能     | 值                                                                                                     |
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
ACE-Step 和 Stable Audio 是提示词转音频端点；当您需要这些模型系列时，请使用
`model` 覆盖进行选择。

<Tip>使用 `openclaw models list --provider fal` 查看所有可用的 fal 模型列表，包括任何最近添加的条目。</Tip>

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
  <Card title="Configuration reference" href="/zh/gateway/config-agents#agent-defaults" icon="gear">
    代理默认值，包括图像、视频和音乐模型选择。
  </Card>
</CardGroup>
