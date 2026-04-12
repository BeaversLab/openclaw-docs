---
title: "fal"
summary: "在 OpenClaw 中设置 fal 图像和视频生成"
read_when:
  - You want to use fal image generation in OpenClaw
  - You need the FAL_KEY auth flow
  - You want fal defaults for image_generate or video_generate
---

# fal

OpenClaw 附带了一个用于托管图像和视频生成的捆绑 `fal` 提供商。

- 提供商：`fal`
- 认证：`FAL_KEY`（标准；`FAL_API_KEY` 也可作为备选方案）
- API： fal 模型端点

## 快速开始

1. 设置 API 密钥：

```bash
openclaw onboard --auth-choice fal-api-key
```

2. 设置默认图像模型：

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

## 图像生成

捆绑的 `fal` 图像生成提供商默认为
`fal/fal-ai/flux/dev`。

- 生成：每个请求最多 4 张图像
- 编辑模式：已启用，1 张参考图像
- 支持 `size`、`aspectRatio` 和 `resolution`
- 当前编辑注意事项：fal 图像编辑端点 **不** 支持
  `aspectRatio` 覆盖

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

- 模式：文本生成视频和单图像参考流
- 运行时：针对长时间运行作业的队列支持的提交/状态/结果流
- HeyGen 视频代理 模型参考：
  - `fal/fal-ai/heygen/v2/video-agent`
- Seedance 2.0 模型参考：
  - `fal/bytedance/seedance-2.0/fast/text-to-video`
  - `fal/bytedance/seedance-2.0/fast/image-to-video`
  - `fal/bytedance/seedance-2.0/text-to-video`
  - `fal/bytedance/seedance-2.0/image-to-video`

要将 Seedance 2.0 用作默认视频 模型：

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

要将 HeyGen 视频代理 用作默认视频 模型：

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

## 相关

- [图像生成](/en/tools/image-generation)
- [视频生成](/en/tools/video-generation)
- [配置参考](/en/gateway/configuration-reference#agent-defaults)
