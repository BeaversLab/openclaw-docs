---
summary: "使用 12 个提供商后端从文本、图像或现有视频生成视频"
read_when:
  - Generating videos via the agent
  - Configuring video generation providers and models
  - Understanding the video_generate tool parameters
title: "视频生成"
---

# 视频生成

OpenClaw 代理可以从文本提示、参考图像或现有视频生成视频。支持 12 个提供商后端，每个后端具有不同的模型选项、输入模式和功能集。代理会根据您的配置和可用的 API 密钥自动选择合适的提供商。

<Note>只有当至少有一个视频生成提供商可用时，`video_generate` 工具才会出现。如果您在代理工具中看不到它，请设置提供商 API 密钥或配置 `agents.defaults.videoGenerationModel`。</Note>

## 快速开始

1. 为任何支持的提供商设置 API 密钥：

```bash
export GEMINI_API_KEY="your-key"
```

2. 可选固定默认模型：

```bash
openclaw config set agents.defaults.videoGenerationModel.primary "google/veo-3.1-fast-generate-preview"
```

3. 询问代理：

> 生成一只友好的龙虾在日落时分冲浪的 5 秒电影质感视频。

代理会自动调用 `video_generate`。无需工具列入白名单。

## 生成视频时会发生什么

视频生成是异步的。当代理在会话中调用 `video_generate` 时：

1. OpenClaw 向提供商提交请求并立即返回任务 ID。
2. 提供商在后台处理作业（通常需要 30 秒到 5 分钟，具体取决于提供商和分辨率）。
3. 当视频准备好后，OpenClaw 通过内部完成事件唤醒同一会话。
4. 代理会将完成的视频发布回原始对话中。

当作业正在进行时，同一会话中重复的 `video_generate` 调用将返回当前任务状态，而不是开始另一次生成。使用 `openclaw tasks list` 或 `openclaw tasks show <taskId>` 从 CLI 检查进度。

在非会话支持的代理运行中（例如，直接工具调用），该工具将回退到内联生成，并在同一轮中返回最终媒体路径。

## 支持的提供商

| 提供商   | 默认模型                        | 文本 | 图像参考           | 视频参考       | API 密钥                                 |
| -------- | ------------------------------- | ---- | ------------------ | -------------- | ---------------------------------------- |
| Alibaba  | `wan2.6-t2v`                    | 是   | 是（远程 URL）     | 是（远程 URL） | `MODELSTUDIO_API_KEY`                    |
| BytePlus | `seedance-1-0-lite-t2v-250428`  | 是   | 1 张图像           | 否             | `BYTEPLUS_API_KEY`                       |
| ComfyUI  | `workflow`                      | 是   | 1 张图片           | 否             | `COMFY_API_KEY` 或 `COMFY_CLOUD_API_KEY` |
| fal      | `fal-ai/minimax/video-01-live`  | 是   | 1 张图片           | 否             | `FAL_KEY`                                |
| Google   | `veo-3.1-fast-generate-preview` | 是   | 1 张图片           | 1 个视频       | `GEMINI_API_KEY`                         |
| MiniMax  | `MiniMax-Hailuo-2.3`            | 是   | 1 张图片           | 否             | `MINIMAX_API_KEY`                        |
| OpenAI   | `sora-2`                        | 是   | 1 张图片           | 1 个视频       | `OPENAI_API_KEY`                         |
| Qwen     | `wan2.6-t2v`                    | 是   | 是（远程 URL）     | 是（远程 URL） | `QWEN_API_KEY`                           |
| Runway   | `gen4.5`                        | 是   | 1 张图片           | 1 个视频       | `RUNWAYML_API_SECRET`                    |
| Together | `Wan-AI/Wan2.2-T2V-A14B`        | 是   | 1 张图片           | 否             | `TOGETHER_API_KEY`                       |
| Vydra    | `veo3`                          | 是   | 1 张图片 (`kling`) | 否             | `VYDRA_API_KEY`                          |
| xAI      | `grok-imagine-video`            | 是   | 1 张图片           | 1 个视频       | `XAI_API_KEY`                            |

某些提供商接受其他或备用的 API 密钥环境变量。详情请参阅单独的 [提供商页面](#related)。

运行 `video_generate action=list` 以在运行时检查可用的提供商和模型。

## 工具参数

### 必需

| 参数     | 类型   | 描述                                                |
| -------- | ------ | --------------------------------------------------- |
| `prompt` | string | 要生成的视频的文本描述（`action: "generate"` 必需） |

### 内容输入

| 参数     | 类型     | 描述                       |
| -------- | -------- | -------------------------- |
| `image`  | string   | 单个参考图片（路径或 URL） |
| `images` | string[] | 多个参考图片（最多 5 张）  |
| `video`  | string   | 单个参考视频（路径或 URL） |
| `videos` | string[] | 多个参考视频（最多 4 个）  |

### 样式控制

| 参数              | 类型    | 描述                                                                    |
| ----------------- | ------- | ----------------------------------------------------------------------- |
| `aspectRatio`     | string  | `1:1`, `2:3`, `3:2`, `3:4`, `4:3`, `4:5`, `5:4`, `9:16`, `16:9`, `21:9` |
| `resolution`      | string  | `480P`, `720P`, 或 `1080P`                                              |
| `durationSeconds` | number  | 目标持续时间，以秒为单位（四舍五入到提供商支持的最近值）                |
| `size`            | string  | 当提供商支持时的大小提示                                                |
| `audio`           | boolean | 支持时启用生成的音频                                                    |
| `watermark`       | boolean | 支持时切换提供商水印                                                    |

### 高级

| 参数       | 类型   | 描述                                         |
| ---------- | ------ | -------------------------------------------- |
| `action`   | string | `"generate"`（默认）、`"status"` 或 `"list"` |
| `model`    | string | 提供商/模型覆盖（例如 `runway/gen4.5`）      |
| `filename` | string | 输出文件名提示                               |

并非所有提供商都支持所有参数。不支持的覆盖将被尽力忽略，并作为警告在工具结果中报告。硬性能力限制（例如参考输入过多）会在提交前失败。

## 操作

- **generate**（默认）—— 根据给定的提示和可选的参考输入创建视频。
- **status**—— 检查当前会话中正在进行的视频任务的状态，而不启动新的生成。
- **list**—— 显示可用的提供商、模型及其功能。

## 模型选择

生成视频时，OpenClaw 按以下顺序解析模型：

1. **`model` 工具参数**—— 如果代理在调用中指定了一个。
2. **`videoGenerationModel.primary`**—— 来自配置。
3. **`videoGenerationModel.fallbacks`**—— 按顺序尝试。
4. **自动检测**—— 使用具有有效身份验证的提供商，从当前默认提供商开始，然后按字母顺序尝试剩余提供商。

如果某个提供商失败，系统会自动尝试下一个候选者。如果所有候选者都失败，错误信息将包含每次尝试的详细信息。

```json5
{
  agents: {
    defaults: {
      videoGenerationModel: {
        primary: "google/veo-3.1-fast-generate-preview",
        fallbacks: ["runway/gen4.5", "qwen/wan2.6-t2v"],
      },
    },
  },
}
```

## 提供商说明

| 提供商   | 说明                                                                                                                   |
| -------- | ---------------------------------------------------------------------------------------------------------------------- |
| Alibaba  | 使用 DashScope/Model Studio 异步端点。参考图像和视频必须是远程 `http(s)` URL。                                         |
| BytePlus | 仅支持单张图片参考。                                                                                                   |
| ComfyUI  | 工作流驱动的本地或云端执行。通过配置的图表支持文生视频和图生视频。                                                     |
| fal      | 使用队列支持流程来处理长时间运行的任务。仅支持单张图片参考。                                                           |
| Google   | 使用 Gemini/Veo。支持一张图片或一个视频参考。                                                                          |
| MiniMax  | 仅支持单张图片参考。                                                                                                   |
| OpenAI   | 仅 `size` 覆盖会被转发。其他样式覆盖（`aspectRatio`、`resolution`、`audio`、`watermark`）将被忽略并发出警告。          |
| Qwen     | 与 Alibaba 使用相同的 DashScope 后端。参考输入必须是远程 `http(s)` URL；本地文件将被直接拒绝。                         |
| Runway   | 支持通过数据 URI 使用本地文件。视频生视频需要 `runway/gen4_aleph`。纯文本运行暴露 `16:9` 和 `9:16` 纵横比。            |
| Together | 仅支持单张图片参考。                                                                                                   |
| Vydra    | 直接使用 `https://www.vydra.ai/api/v1` 以避免丢失身份验证的重定向。`veo3` 仅捆绑为文生视频；`kling` 需要远程图片 URL。 |
| xAI      | 支持文生视频、图生视频以及远程视频编辑/扩展流程。                                                                      |

## 配置

在您的 OpenClaw 配置中设置默认视频生成模型：

```json5
{
  agents: {
    defaults: {
      videoGenerationModel: {
        primary: "qwen/wan2.6-t2v",
        fallbacks: ["qwen/wan2.6-r2v-flash"],
      },
    },
  },
}
```

或通过 CLI：

```bash
openclaw config set agents.defaults.videoGenerationModel.primary "qwen/wan2.6-t2v"
```

## 相关

- [工具概述](/en/tools)
- [后台任务](/en/automation/tasks) -- 异步视频生成的任务跟踪
- [Alibaba Model Studio](/en/providers/alibaba)
- [BytePlus](/en/providers/byteplus)
- [ComfyUI](/en/providers/comfy)
- [fal](/en/providers/fal)
- [Google (Gemini)](/en/providers/google)
- [MiniMax](/en/providers/minimax)
- [OpenAI](/en/providers/openai)
- [Qwen](/en/providers/qwen)
- [Runway](/en/providers/runway)
- [Together AI](/en/providers/together)
- [Vydra](/en/providers/vydra)
- [xAI](/en/providers/xai)
- [配置参考](/en/gateway/configuration-reference#agent-defaults)
- [模型](/en/concepts/models)
