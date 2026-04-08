---
title: "ComfyUI"
summary: "在 OpenClaw 中设置 ComfyUI 工作流图像、视频和音乐生成"
read_when:
  - You want to use local ComfyUI workflows with OpenClaw
  - You want to use Comfy Cloud with image, video, or music workflows
  - You need the bundled comfy plugin config keys
---

# ComfyUI

OpenClaw 附带了一个捆绑的 `comfy` 插件，用于驱动工作流的 ComfyUI 运行。

- 提供商：`comfy`
- 模型：`comfy/workflow`
- 共享表面：`image_generate`，`video_generate`，`music_generate`
- 身份验证：本地 ComfyUI 无需身份验证；Comfy Cloud 需要 `COMFY_API_KEY` 或 `COMFY_CLOUD_API_KEY`
- API：ComfyUI `/prompt` / `/history` / `/view` 和 Comfy Cloud `/api/*`

## 支持内容

- 从工作流 JSON 生成图像
- 使用 1 张上传的参考图像编辑图像
- 从工作流 JSON 生成视频
- 使用 1 张上传的参考图像生成视频
- 通过共享的 `music_generate` 工具生成音乐或音频
- 从配置的节点或所有匹配的输出节点下载输出

捆绑的插件由工作流驱动，因此 OpenClaw 不会尝试将通用的
`size`、`aspectRatio`、`resolution`、`durationSeconds` 或 TTS 风格的控件
映射到您的图中。

## 配置布局

Comfy 支持共享的顶级连接设置以及针对每种能力的工作流
部分：

```json5
{
  models: {
    providers: {
      comfy: {
        mode: "local",
        baseUrl: "http://127.0.0.1:8188",
        image: {
          workflowPath: "./workflows/flux-api.json",
          promptNodeId: "6",
          outputNodeId: "9",
        },
        video: {
          workflowPath: "./workflows/video-api.json",
          promptNodeId: "12",
          outputNodeId: "21",
        },
        music: {
          workflowPath: "./workflows/music-api.json",
          promptNodeId: "3",
          outputNodeId: "18",
        },
      },
    },
  },
}
```

共享密钥：

- `mode`：`local` 或 `cloud`
- `baseUrl`：本地默认为 `http://127.0.0.1:8188`，云端默认为 `https://cloud.comfy.org`
- `apiKey`：环境变量的可选内联密钥替代方案
- `allowPrivateNetwork`：允许在云端模式下使用私有/LAN `baseUrl`

`image`、`video` 或 `music` 下的针对每种能力的密钥：

- `workflow` 或 `workflowPath`：必需
- `promptNodeId`：必需
- `promptInputName`：默认为 `text`
- `outputNodeId`：可选
- `pollIntervalMs`：可选
- `timeoutMs`：可选

图像和视频部分还支持：

- `inputImageNodeId`：当您传入参考图像时为必填
- `inputImageInputName`：默认为 `image`

## 向后兼容性

现有的顶层图像配置仍然有效：

```json5
{
  models: {
    providers: {
      comfy: {
        workflowPath: "./workflows/flux-api.json",
        promptNodeId: "6",
        outputNodeId: "9",
      },
    },
  },
}
```

OpenClaw 会将那种旧版格式视为图像工作流配置。

## 图像工作流

设置默认图像模型：

```json5
{
  agents: {
    defaults: {
      imageGenerationModel: {
        primary: "comfy/workflow",
      },
    },
  },
}
```

参考图像编辑示例：

```json5
{
  models: {
    providers: {
      comfy: {
        image: {
          workflowPath: "./workflows/edit-api.json",
          promptNodeId: "6",
          inputImageNodeId: "7",
          inputImageInputName: "image",
          outputNodeId: "9",
        },
      },
    },
  },
}
```

## 视频工作流

设置默认视频模型：

```json5
{
  agents: {
    defaults: {
      videoGenerationModel: {
        primary: "comfy/workflow",
      },
    },
  },
}
```

Comfy 视频工作流目前通过配置的图支持文本生成视频和图像生成视频。OpenClaw 不会将输入视频传递到 Comfy 工作流中。

## 音乐工作流

内置插件注册了一个音乐生成提供商，用于通过共享 `music_generate` 工具展示由工作流定义的音频或音乐输出：

```text
/tool music_generate prompt="Warm ambient synth loop with soft tape texture"
```

使用 `music` 配置部分指向您的音频工作流 JSON 和输出节点。

## Comfy Cloud

使用 `mode: "cloud"` 加上以下之一：

- `COMFY_API_KEY`
- `COMFY_CLOUD_API_KEY`
- `models.providers.comfy.apiKey`

云模式仍然使用相同的 `image`、`video` 和 `music` 工作流部分。

## 实时测试

内置插件提供可选择的实时覆盖：

```bash
OPENCLAW_LIVE_TEST=1 COMFY_LIVE_TEST=1 pnpm test:live -- extensions/comfy/comfy.live.test.ts
```

除非配置了匹配的 Comfy 工作流部分，否则实时测试会跳过单独的图像、视频或音乐用例。

## 相关

- [图像生成](/en/tools/image-generation)
- [视频生成](/en/tools/video-generation)
- [音乐生成](/en/tools/music-generation)
- [提供商目录](/en/providers/index)
- [配置参考](/en/gateway/configuration-reference#agent-defaults)
