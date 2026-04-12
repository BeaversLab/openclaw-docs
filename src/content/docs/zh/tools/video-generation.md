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

<Note>当至少有一个视频生成提供商可用时，`video_generate` 工具才会出现。如果您在代理工具中看不到它，请设置提供商 API 密钥或配置 `agents.defaults.videoGenerationModel`。</Note>

OpenClaw 将视频生成视为三种运行时模式：

- `generate` 用于没有参考媒体的文本生成视频请求
- 当请求包含一张或多张参考图像时，`imageToVideo`
- 当请求包含一个或多个参考视频时，`videoToVideo`

提供商可以支持这些模式的任何子集。该工具在提交之前验证活动
模式，并在 `action=list` 中报告支持的模式。

## 快速开始

1. 为任何支持的提供商设置 API 密钥：

```bash
export GEMINI_API_KEY="your-key"
```

2. （可选）固定一个默认模型：

```bash
openclaw config set agents.defaults.videoGenerationModel.primary "google/veo-3.1-fast-generate-preview"
```

3. 询问代理：

> 生成一段5秒长的电影视频，内容是一只友好的龙虾在日落时分冲浪。

代理会自动调用 `video_generate`。无需将工具列入允许列表。

## 生成视频时会发生什么

视频生成是异步的。当代理在会话中调用 `video_generate` 时：

1. OpenClaw 将请求提交给提供商，并立即返回一个任务 ID。
2. 提供商在后台处理作业（通常为 30 秒到 5 分钟，具体取决于提供商和分辨率）。
3. 当视频准备好后，OpenClaw 会通过内部完成事件唤醒同一会话。
4. 代理会将完成的视频发回到原始对话中。

当作业正在处理时，同一会话中重复的 `video_generate` 调用将返回当前任务状态，而不是开始另一个生成。使用 `openclaw tasks list` 或 `openclaw tasks show <taskId>` 从 CLI 检查进度。

在非会话支持的代理运行中（例如，直接工具调用），工具会回退到内联生成，并在同一轮次中返回最终媒体路径。

### 任务生命周期

每个 `video_generate` 请求都会经过四个状态：

1. **已排队** -- 任务已创建，等待提供商接受。
2. **运行中** -- 提供商正在处理（通常需要 30 秒到 5 分钟，具体取决于提供商和分辨率）。
3. **成功** -- 视频已就绪；代理唤醒并将其发布到对话中。
4. **失败** -- 提供商错误或超时；代理唤醒并显示错误详细信息。

从 CLI 检查状态：

```bash
openclaw tasks list
openclaw tasks show <taskId>
openclaw tasks cancel <taskId>
```

重复预防：如果当前会话的视频任务已经是 `queued` 或 `running`，`video_generate` 将返回现有任务状态，而不是开始新任务。使用 `action: "status"` 进行显式检查，而不会触发新生成。

## 支持的提供商

| 提供商   | 默认模型                        | 文本 | 图像参考           | 视频参考       | API 密钥                                 |
| -------- | ------------------------------- | ---- | ------------------ | -------------- | ---------------------------------------- |
| Alibaba  | `wan2.6-t2v`                    | 是   | 是（远程 URL）     | 是（远程 URL） | `MODELSTUDIO_API_KEY`                    |
| BytePlus | `seedance-1-0-lite-t2v-250428`  | 是   | 1 张图像           | 否             | `BYTEPLUS_API_KEY`                       |
| ComfyUI  | `workflow`                      | 是   | 1 张图像           | 否             | `COMFY_API_KEY` 或 `COMFY_CLOUD_API_KEY` |
| fal      | `fal-ai/minimax/video-01-live`  | 是   | 1 张图像           | 否             | `FAL_KEY`                                |
| Google   | `veo-3.1-fast-generate-preview` | 是   | 1 张图像           | 1 个视频       | `GEMINI_API_KEY`                         |
| MiniMax  | `MiniMax-Hailuo-2.3`            | 是   | 1 张图像           | 否             | `MINIMAX_API_KEY`                        |
| OpenAI   | `sora-2`                        | 是   | 1 张图像           | 1 个视频       | `OPENAI_API_KEY`                         |
| Qwen     | `wan2.6-t2v`                    | 是   | 是（远程 URL）     | 是（远程 URL） | `QWEN_API_KEY`                           |
| Runway   | `gen4.5`                        | 是   | 1 张图像           | 1 个视频       | `RUNWAYML_API_SECRET`                    |
| Together | `Wan-AI/Wan2.2-T2V-A14B`        | 是   | 1 张图像           | 否             | `TOGETHER_API_KEY`                       |
| Vydra    | `veo3`                          | 是   | 1 张图片 (`kling`) | 否             | `VYDRA_API_KEY`                          |
| xAI      | `grok-imagine-video`            | 是   | 1 张图像           | 1 个视频       | `XAI_API_KEY`                            |

部分提供商接受其他或备用的 API 密钥环境变量。详情请参阅各个[提供商页面](#related)。

运行 `video_generate action=list` 以在运行时检查可用的提供商、模型和运行模式。

### 声明的功能矩阵

这是 `video_generate`、合约测试和共享实时扫描所使用的显式模式合约。

| 提供商   | `generate` | `imageToVideo` | `videoToVideo` | 当前的共享实时通道                                                                                             |
| -------- | ---------- | -------------- | -------------- | -------------------------------------------------------------------------------------------------------------- |
| Alibaba  | 是         | 是             | 是             | `generate`，`imageToVideo`；`videoToVideo` 被跳过，因为此提供商需要远程 `http(s)` 视频 URL                     |
| BytePlus | 是         | 是             | 否             | `generate`，`imageToVideo`                                                                                     |
| ComfyUI  | 是         | 是             | 否             | 不在共享扫描中；特定于工作流的覆盖范围包含在 Comfy 测试中                                                      |
| fal      | 是         | 是             | 否             | `generate`，`imageToVideo`                                                                                     |
| Google   | 是         | 是             | 是             | `generate`，`imageToVideo`；共享 `videoToVideo` 被跳过，因为当前缓冲区支持的 Gemini/Veo 扫描不接受该输入       |
| MiniMax  | 是         | 是             | 否             | `generate`，`imageToVideo`                                                                                     |
| OpenAI   | 是         | 是             | 是             | `generate`，`imageToVideo`；共享 `videoToVideo` 被跳过，因为此组织/输入路径目前需要提供商端的修复/混合访问权限 |
| Qwen     | 是         | 是             | 是             | `generate`，`imageToVideo`；`videoToVideo` 被跳过，因为此提供商需要远程 `http(s)` 视频 URL                     |
| Runway   | 是         | 是             | 是             | `generate`，`imageToVideo`；`videoToVideo` 仅当选定的模型为 `runway/gen4_aleph` 时运行                         |
| Together | 是         | 是             | 否             | `generate`，`imageToVideo`                                                                                     |
| Vydra    | 是         | 是             | 否             | `generate`; 共享的 `imageToVideo` 已跳过，因为捆绑的 `veo3` 仅支持文本，而捆绑的 `kling` 需要远程图像 URL      |
| xAI      | 是         | 是             | 是             | `generate`, `imageToVideo`; `videoToVideo` 已跳过，因为此提供商目前需要远程 MP4 URL                            |

## 工具参数

### 必需

| 参数     | 类型   | 描述                                                  |
| -------- | ------ | ----------------------------------------------------- |
| `prompt` | string | 要生成的视频的文本描述（`action: "generate"` 所必需） |

### 内容输入

| 参数     | 类型     | 描述                       |
| -------- | -------- | -------------------------- |
| `image`  | string   | 单个参考图像（路径或 URL） |
| `images` | string[] | 多个参考图像（最多 5 个）  |
| `video`  | string   | 单个参考视频（路径或 URL） |
| `videos` | string[] | 多个参考视频（最多 4 个）  |

### 样式控制

| 参数              | 类型    | 描述                                                                    |
| ----------------- | ------- | ----------------------------------------------------------------------- |
| `aspectRatio`     | string  | `1:1`, `2:3`, `3:2`, `3:4`, `4:3`, `4:5`, `5:4`, `9:16`, `16:9`, `21:9` |
| `resolution`      | string  | `480P`, `720P`, `768P`, 或 `1080P`                                      |
| `durationSeconds` | number  | 目标持续时间（秒）（四舍五入到提供商支持的最近值）                      |
| `size`            | string  | 当提供商支持时的尺寸提示                                                |
| `audio`           | boolean | 支持时启用生成的音频                                                    |
| `watermark`       | boolean | 支持时切换提供商水印                                                    |

### 高级

| 参数       | 类型   | 描述                                         |
| ---------- | ------ | -------------------------------------------- |
| `action`   | string | `"generate"`（默认）、`"status"` 或 `"list"` |
| `model`    | string | 提供商/模型覆盖（例如 `runway/gen4.5`）      |
| `filename` | string | 输出文件名提示                               |

并非所有提供商都支持所有参数。OpenClaw 已经将持续时间标准化为提供商支持的最接近值，并且当备用提供商暴露不同的控制界面时，它还会重新映射转换后的几何提示（例如从尺寸到宽高比）。真正不支持的覆盖项将尽最大努力被忽略，并在工具结果中报告为警告。硬性能力限制（例如参考输入过多）会在提交前失败。

工具结果报告应用了哪些设置。当 OpenClaw 在提供商回退期间重新映射时长或几何形状时，返回的 `durationSeconds`、`size`、`aspectRatio` 和 `resolution` 值反映了提交的内容，而 `details.normalization` 捕获了从请求到应用的转换。

参考输入也会选择运行时模式：

- 无参考媒体：`generate`
- 任何图像参考：`imageToVideo`
- 任何视频参考：`videoToVideo`

混合图片和视频参考不是稳定的共享能力表面。
每次请求请优先使用一种参考类型。

## 操作

- **generate**（默认）—— 根据给定的提示和可选参考输入创建视频。
- **status**—— 检查当前会话中正在进行的视频任务的状态，而无需启动新的生成。
- **list**—— 显示可用的提供商、模型及其功能。

## 模型选择

生成视频时，OpenClaw 按以下顺序解析模型：

1. **`model` 工具参数** —— 如果代理在调用中指定了一个。
2. **`videoGenerationModel.primary`** —— 来自配置。
3. **`videoGenerationModel.fallbacks`** —— 按顺序尝试。
4. **自动检测**—— 使用具有有效身份验证的提供商，从当前默认提供商开始，然后按字母顺序尝试其余提供商。

如果提供商失败，会自动尝试下一个候选者。如果所有候选者都失败，错误信息将包含每次尝试的详细信息。

如果希望视频生成仅使用显式的 `model`、`primary` 和 `fallbacks`
条目，请设置 `agents.defaults.mediaGenerationAutoProviderFallback: false`。

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

fal 上的 HeyGen video-agent 可以通过以下方式固定：

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

fal 上的 Seedance 2.0 可以通过以下方式固定：

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

## 提供商说明

| 提供商   | 说明                                                                                                                       |
| -------- | -------------------------------------------------------------------------------------------------------------------------- |
| Alibaba  | 使用 DashScope/Model Studio 异步端点。参考图片和视频必须是远程 `http(s)` URL。                                             |
| BytePlus | 仅支持单张图片参考。                                                                                                       |
| ComfyUI  | 工作流驱动的本地或云端执行。通过配置的图支持文生视频和图生视频。                                                           |
| fal      | 长时间运行的任务使用队列后备流。仅支持单张图片参考。包括 HeyGen video-agent 以及 Seedance 2.0 文生视频和图生视频模型引用。 |
| Google   | 使用 Gemini/Veo。支持一张图片或一个视频参考。                                                                              |
| MiniMax  | 仅支持单张图片参考。                                                                                                       |
| OpenAI   | 仅转发 `size` 覆盖。其他样式覆盖（`aspectRatio`、`resolution`、`audio`、`watermark`）将被忽略并显示警告。                  |
| Qwen     | 使用与 Alibaba 相同的 DashScope 后端。参考输入必须是远程 `http(s)` URL；本地文件会被直接拒绝。                             |
| Runway   | 通过数据 URI 支持本地文件。视频转视频需要 `runway/gen4_aleph`。纯文本运行暴露 `16:9` 和 `9:16` 纵横比。                    |
| Together | 仅支持单张图片参考。                                                                                                       |
| Vydra    | 直接使用 `https://www.vydra.ai/api/v1` 以避免丢弃身份信息的重定向。`veo3` 捆绑为仅文生视频；`kling` 需要远程图片 URL。     |
| xAI      | 支持文生视频、图生视频以及远程视频编辑/扩展流程。                                                                          |

## 提供商能力模式

共享的视频生成协议现在允许提供商声明特定模式的功能，而不仅仅是单一的聚合限制。新的提供商实现应该优先使用显式的模式块：

```typescript
capabilities: {
  generate: {
    maxVideos: 1,
    maxDurationSeconds: 10,
    supportsResolution: true,
  },
  imageToVideo: {
    enabled: true,
    maxVideos: 1,
    maxInputImages: 1,
    maxDurationSeconds: 5,
  },
  videoToVideo: {
    enabled: true,
    maxVideos: 1,
    maxInputVideos: 1,
    maxDurationSeconds: 5,
  },
}
```

诸如 `maxInputImages` 和 `maxInputVideos` 之类的单一聚合字段不足以宣传转换模式的支持。提供商应该显式声明 `generate`、`imageToVideo` 和 `videoToVideo`，以便实时测试、合约测试和共享 `video_generate` 工具能够确定性地验证模式支持。

## 实时测试

针对共享打包提供商的可选实时覆盖范围：

```bash
OPENCLAW_LIVE_TEST=1 pnpm test:live -- extensions/video-generation-providers.live.test.ts
```

仓库包装器：

```bash
pnpm test:live:media video
```

此实时文件从 `~/.profile` 加载缺失的提供商环境变量，默认优先使用 live/env API 而非存储的身份验证配置文件，并运行其可以使用本地媒体安全执行的声明模式：

- 针对扫描中的每个提供商进行 `generate`
- 当 `capabilities.imageToVideo.enabled` 时进行 `imageToVideo`
- 当 `capabilities.videoToVideo.enabled` 且提供商/模型在共享扫描中接受缓冲区支持的本地视频输入时进行 `videoToVideo`

目前，共享 `videoToVideo` 实时通道覆盖：

- 仅当您选择 `runway/gen4_aleph` 时才 `runway`

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
- [BytePlus](/en/concepts/model-providers#byteplus-international)
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
