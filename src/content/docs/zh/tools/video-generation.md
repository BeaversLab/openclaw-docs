---
summary: "使用 14 个提供商后端从文本、图像或现有视频生成视频"
read_when:
  - Generating videos via the agent
  - Configuring video generation providers and models
  - Understanding the video_generate tool parameters
title: "视频生成"
---

# 视频生成

OpenClaw 代理可以从文本提示、参考图像或现有视频生成视频。支持 14 个提供商后端，每个后端具有不同的模型选项、输入模式和功能集。代理会根据您的配置和可用的 API 密钥自动选择合适的提供商。

<Note>`video_generate` 工具仅在至少有一个视频生成提供商可用时才会出现。如果您在代理工具中看不到它，请设置提供商 API 密钥或配置 `agents.defaults.videoGenerationModel`。</Note>

OpenClaw 将视频生成视为三种运行时模式：

- 用于没有参考媒体的文本生成视频请求的 `generate`
- 当请求包含一张或多张参考图像时的 `imageToVideo`
- 当请求包含一个或多个参考视频时的 `videoToVideo`

提供商可以支持这些模式的任何子集。该工具在提交前验证活动模式，并在 `action=list` 中报告支持的模式。

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

代理会自动调用 `video_generate`。不需要工具允许列表。

## 生成视频时会发生什么

视频生成是异步的。当代理在会话中调用 `video_generate` 时：

1. OpenClaw 将请求提交给提供商，并立即返回一个任务 ID。
2. 提供商在后台处理作业（通常为 30 秒到 5 分钟，具体取决于提供商和分辨率）。
3. 当视频准备好后，OpenClaw 会通过内部完成事件唤醒同一会话。
4. 代理会将完成的视频发回到原始对话中。

当作业正在进行时，同一会话中重复的 `video_generate` 调用将返回当前任务状态，而不是开始另一次生成。使用 `openclaw tasks list` 或 `openclaw tasks show <taskId>` 从 CLI 检查进度。

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

重复预防：如果当前会话的视频任务已经处于 `queued` 或 `running` 状态，`video_generate` 将返回现有任务状态，而不是开始新任务。使用 `action: "status"` 明确检查而不触发新生成。

## 支持的提供商

| 提供商                | 默认模型                        | 文本 | 图像参考                                          | 视频参考       | API 密钥                                 |
| --------------------- | ------------------------------- | ---- | ------------------------------------------------- | -------------- | ---------------------------------------- |
| Alibaba               | `wan2.6-t2v`                    | 是   | 是（远程 URL）                                    | 是（远程 URL） | `MODELSTUDIO_API_KEY`                    |
| BytePlus (1.0)        | `seedance-1-0-pro-250528`       | 是   | 最多 2 张图片（仅限 I2V 模型；第一帧 + 最后一帧） | 否             | `BYTEPLUS_API_KEY`                       |
| BytePlus Seedance 1.5 | `seedance-1-5-pro-251215`       | 是   | 最多 2 张图片（通过角色指定首帧 + 末帧）          | 否             | `BYTEPLUS_API_KEY`                       |
| BytePlus Seedance 2.0 | `dreamina-seedance-2-0-260128`  | 是   | 最多 9 张参考图片                                 | 最多 3 个视频  | `BYTEPLUS_API_KEY`                       |
| ComfyUI               | `workflow`                      | 是   | 1 张图像                                          | 否             | `COMFY_API_KEY` 或 `COMFY_CLOUD_API_KEY` |
| fal                   | `fal-ai/minimax/video-01-live`  | 是   | 1 张图像                                          | 否             | `FAL_KEY`                                |
| Google                | `veo-3.1-fast-generate-preview` | 是   | 1 张图像                                          | 1 个视频       | `GEMINI_API_KEY`                         |
| MiniMax               | `MiniMax-Hailuo-2.3`            | 是   | 1 张图片                                          | 否             | `MINIMAX_API_KEY`                        |
| OpenAI                | `sora-2`                        | 是   | 1 张图像                                          | 1 个视频       | `OPENAI_API_KEY`                         |
| Qwen                  | `wan2.6-t2v`                    | 是   | 是（远程 URL）                                    | 是（远程 URL） | `QWEN_API_KEY`                           |
| Runway                | `gen4.5`                        | 是   | 1 张图片                                          | 1 个视频       | `RUNWAYML_API_SECRET`                    |
| Together              | `Wan-AI/Wan2.2-T2V-A14B`        | 是   | 1 张图像                                          | 否             | `TOGETHER_API_KEY`                       |
| Vydra                 | `veo3`                          | 是   | 1 张图片 (`kling`)                                | 否             | `VYDRA_API_KEY`                          |
| xAI                   | `grok-imagine-video`            | 是   | 1 张图片                                          | 1 个视频       | `XAI_API_KEY`                            |

部分提供商接受其他或备用的 API 密钥环境变量。详情请参阅各个[提供商页面](#related)。

运行 `video_generate action=list` 以在运行时检查可用的提供商、模型和
运行模式。

### 已声明的功能矩阵

这是由 `video_generate`、合同测试
和共享实时扫描使用的显式模式合约。

| 提供商   | `generate` | `imageToVideo` | `videoToVideo` | 当前的共享实时通道                                                                                            |
| -------- | ---------- | -------------- | -------------- | ------------------------------------------------------------------------------------------------------------- |
| Alibaba  | 是         | 是             | 是             | `generate`，`imageToVideo`；跳过 `videoToVideo`，因为此提供商需要远程 `http(s)` 视频地址                      |
| BytePlus | 是         | 是             | 否             | `generate`，`imageToVideo`                                                                                    |
| ComfyUI  | 是         | 是             | 否             | 不在共享扫描中；特定于工作流的覆盖范围位于 Comfy 测试中                                                       |
| fal      | 是         | 是             | 否             | `generate`，`imageToVideo`                                                                                    |
| Google   | 是         | 是             | 是             | `generate`, `imageToVideo`; 跳过共享的 `videoToVideo`，因为当前基于缓冲的 Gemini/Veo 扫描不接受该输入         |
| MiniMax  | 是         | 是             | 否             | `generate`, `imageToVideo`                                                                                    |
| OpenAI   | 是         | 是             | 是             | `generate`, `imageToVideo`; 跳过共享的 `videoToVideo`，因为此组织/输入路径当前需要提供商端的重绘/混合访问权限 |
| Qwen     | 是         | 是             | 是             | `generate`, `imageToVideo`; 跳过 `videoToVideo`，因为此提供商需要远程 `http(s)` 视频链接                      |
| Runway   | 是         | 是             | 是             | `generate`, `imageToVideo`; `videoToVideo` 仅在选择 `runway/gen4_aleph` 模型时运行                            |
| Together | 是         | 是             | 否             | `generate`, `imageToVideo`                                                                                    |
| Vydra    | 是         | 是             | 否             | `generate`; 跳过共享的 `imageToVideo`，因为捆绑的 `veo3` 仅支持文本，且捆绑的 `kling` 需要远程图片链接        |
| xAI      | 是         | 是             | 是             | `generate`, `imageToVideo`; 跳过 `videoToVideo`，因为此提供商当前需要远程 MP4 链接                            |

## 工具参数

### 必需

| 参数     | 类型   | 描述                                              |
| -------- | ------ | ------------------------------------------------- |
| `prompt` | 字符串 | 待生成视频的文本描述（`action: "generate"` 必需） |

### 内容输入

| 参数         | 类型       | 描述                                                                                           |
| ------------ | ---------- | ---------------------------------------------------------------------------------------------- |
| `image`      | 字符串     | 单个参考图片（路径或链接）                                                                     |
| `images`     | 字符串数组 | 多个参考图片（最多 9 张）                                                                      |
| `imageRoles` | 字符串数组 | 与组合图片列表平行的可选每位置角色提示。标准值：`first_frame`、`last_frame`、`reference_image` |
| `video`      | 字符串     | 单个参考视频（路径或链接）                                                                     |
| `videos`     | 字符串数组 | 多个参考视频（最多 4 个）                                                                      |
| `videoRoles` | string[]   | 与合并视频列表平行的可选按位置角色提示。标准值：`reference_video`                              |
| `audioRef`   | string     | 单个参考音频（路径或 URL）。例如，当提供商支持音频输入时，用于背景音乐或语音参考               |
| `audioRefs`  | string[]   | 多个参考音频（最多 3 个）                                                                      |
| `audioRoles` | string[]   | 与合并音频列表平行的可选按位置角色提示。标准值：`reference_audio`                              |

角色提示将按原样转发给提供商。标准值来自
`VideoGenerationAssetRole` 联合类型，但提供商可能会接受额外的
角色字符串。`*Roles` 数组的条目数不得超过
相应的参考列表；差一错误会以明确的错误提示失败。
使用空字符串来保留槽位未设置。

### 样式控制

| 参数              | 类型    | 描述                                                                                  |
| ----------------- | ------- | ------------------------------------------------------------------------------------- |
| `aspectRatio`     | string  | `1:1`、`2:3`、`3:2`、`3:4`、`4:3`、`4:5`、`5:4`、`9:16`、`16:9`、`21:9` 或 `adaptive` |
| `resolution`      | string  | `480P`、`720P`、`768P` 或 `1080P`                                                     |
| `durationSeconds` | number  | 目标持续时间（以秒为单位，四舍五入到提供商支持的最近值）                              |
| `size`            | string  | 提供商支持时的尺寸提示                                                                |
| `audio`           | boolean | 在支持时启用输出中的生成音频。区别于 `audioRef*`（输入）                              |
| `watermark`       | boolean | 在支持时切换提供商水印                                                                |

`adaptive` 是一个特定于提供商的标记：它会原样转发给在其功能中声明了 `adaptive` 的提供商（例如，BytePlus Seedance 使用它从输入图像尺寸自动检测比例）。未声明该标记的提供商通过工具结果中的 `details.ignoredOverrides` 显示该值，因此丢弃操作是可见的。

### 高级

| 参数              | 类型   | 描述                                                                                                                                                                                                                                               |
| ----------------- | ------ | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `action`          | string | `"generate"`（默认）、`"status"` 或 `"list"`                                                                                                                                                                                                       |
| `model`           | string | 提供商/模型覆盖（例如 `runway/gen4.5`）                                                                                                                                                                                                            |
| `filename`        | string | 输出文件名提示                                                                                                                                                                                                                                     |
| `providerOptions` | object | 作为 JSON 对象的提供商特定选项（例如 `{"seed": 42, "draft": true}`）。声明了类型化架构的提供商会验证键和类型；未知键或不匹配项在回退期间跳过候选项。没有声明架构的提供商原样接收选项。运行 `video_generate action=list` 以查看每个提供商接受的内容 |

并非所有提供商都支持所有参数。OpenClaw 已经将持续时间标准化为最接近的提供商支持值，并且当回退提供商公开不同的控制面时，它还会重新映射转换后的几何提示（例如尺寸到宽高比）。真正不支持的覆盖会在尽力而为的基础上被忽略，并作为警告在工具结果中报告。硬性功能限制（例如参考输入过多）会在提交前失败。

工具结果报告应用的设置。当 OpenClaw 在提供商回退期间重新映射持续时间或几何形状时，返回的 `durationSeconds`、`size`、`aspectRatio` 和 `resolution` 值反映提交的内容，而 `details.normalization` 捕获从请求到应用的转换。

参考输入也会选择运行时模式：

- 无参考媒体：`generate`
- 任何图像参考：`imageToVideo`
- 任何视频参考：`videoToVideo`
- 参考音频输入不会改变解析的模式；它们应用在图像/视频参考选择的任何模式之上，并且仅适用于声明了 `maxInputAudios` 的提供商。

混合的图像和视频参考不是一个稳定的共享功能表面。
每个请求最好只使用一种参考类型。

#### 回退和类型化选项

某些功能检查是在回退层而不是工具边界应用的，以便超出主要提供商限制的请求仍能在能够处理的回退提供商上运行：

- 如果活动候选者未声明 `maxInputAudios`（或将其声明为 `0`），则在请求包含音频引用时将其跳过，并尝试下一个候选者。
- 如果活动候选者的 `maxDurationSeconds` 低于请求的 `durationSeconds` 且该候选者未声明 `supportedDurationSeconds` 列表，则将其跳过。
- 如果请求包含 `providerOptions` 且活动候选者显式声明了类型化的 `providerOptions` 架构，则当提供的键不在架构中或值类型不匹配时，该候选者将被跳过。尚未声明架构的提供商将按原样接收选项（向后兼容的透传）。提供商可以通过声明空架构（`capabilities.providerOptions: {}`）来显式选择退出所有提供商选项，这会导致与类型不匹配相同的跳过。

请求中的第一次跳过原因会记录在 `warn` 级别，以便操作员看到其主提供商何时被跳过；后续跳过记录在 `debug` 级别，以保持长回退链的安静。如果跳过了所有候选者，聚合错误将包含每个候选者的跳过原因。

## 操作

- **generate**（默认）—— 根据给定的提示和可选参考输入创建视频。
- **status**—— 检查当前会话中正在进行的视频任务的状态，而不启动另一个生成任务。
- **list**—— 显示可用的提供商、模型及其功能。

## 模型选择

生成视频时，OpenClaw 按以下顺序解析模型：

1. **`model` 工具参数**—— 如果代理在调用中指定了一个。
2. **`videoGenerationModel.primary`** -- 从配置获取。
3. **`videoGenerationModel.fallbacks`** -- 按顺序尝试。
4. **Auto-detection** -- 使用具有有效身份验证的提供商，从当前默认提供商开始，然后按字母顺序使用其余提供商。

如果某个提供商失败，系统会自动尝试下一个候选项。如果所有候选项都失败，错误信息将包含每次尝试的详细信息。

如果您希望视频生成仅使用显式的 `model`、`primary` 和 `fallbacks` 条目，请设置 `agents.defaults.mediaGenerationAutoProviderFallback: false`。

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

| 提供商                | 说明                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                      |
| --------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Alibaba               | 使用 DashScope/Model Studio 异步端点。参考图片和视频必须是远程 `http(s)` URL。                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                            |
| BytePlus (1.0)        | 提供商 ID `byteplus`。模型：`seedance-1-0-pro-250528`（默认）、`seedance-1-0-pro-t2v-250528`、`seedance-1-0-pro-fast-251015`、`seedance-1-0-lite-t2v-250428`、`seedance-1-0-lite-i2v-250428`。T2V 模型（`*-t2v-*`）不接受图片输入；I2V 模型和通用 `*-pro-*` 模型支持单张参考图片（第一帧）。按位置传递图片或设置 `role: "first_frame"`。当提供图片时，T2V 模型 ID 会自动切换到相应的 I2V 变体。支持的 `providerOptions` 键：`seed`（数字）、`draft`（布尔值，强制 480p）、`camera_fixed`（布尔值）。                                                                                                      |
| BytePlus Seedance 1.5 | 需要 [`@openclaw/byteplus-modelark`](https://www.npmjs.com/package/@openclaw/byteplus-modelark) 插件。提供商 ID `byteplus-seedance15`。模型：`seedance-1-5-pro-251215`。使用统一的 `content[]` API。最多支持 2 张输入图像（first_frame + last_frame）。所有输入必须是远程 `https://` URL。在每个图像上设置 `role: "first_frame"` / `"last_frame"`，或按位置传递图像。`aspectRatio: "adaptive"` 从输入图像自动检测比例。`audio: true` 映射到 `generate_audio`。`providerOptions.seed`（数字）会被转发。                                                                                                    |
| BytePlus Seedance 2.0 | 需要 [`@openclaw/byteplus-modelark`](https://www.npmjs.com/package/@openclaw/byteplus-modelark) 插件。提供商 ID `byteplus-seedance2`。模型：`dreamina-seedance-2-0-260128`, `dreamina-seedance-2-0-fast-260128`。使用统一的 `content[]` API。支持最多 9 张参考图像、3 个参考视频和 3 个参考音频。所有输入必须是远程 `https://` URL。在每个资源上设置 `role` — 支持的值：`"first_frame"`, `"last_frame"`, `"reference_image"`, `"reference_video"`, `"reference_audio"`。`aspectRatio: "adaptive"` 从输入图像自动检测比例。`audio: true` 映射到 `generate_audio`。`providerOptions.seed`（数字）会被转发。 |
| ComfyUI               | 通过工作流驱动的本地或云端执行。通过配置的图支持文本生成视频和图像生成视频。                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                              |
| fal                   | 对长时间运行的任务使用队列后备流。仅支持单张图像参考。                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                    |
| Google                | 使用 Gemini/Veo。支持一张图像或一个视频参考。                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                             |
| MiniMax               | 仅支持单张图像参考。                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                      |
| OpenAI                | 仅 `size` 覆盖项会被转发。其他样式覆盖项（`aspectRatio`, `resolution`, `audio`, `watermark`）将被忽略并显示警告。                                                                                                                                                                                                                                                                                                                                                                                                                                                                                         |
| Qwen                  | 与阿里巴巴相同的 DashScope 后端。参考输入必须是远程 `http(s)` URL；本地文件会被预先拒绝。                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                 |
| Runway                | 通过 data URIs 支持本地文件。视频转视频需要 `runway/gen4_aleph`。仅文本运行公开 `16:9` 和 `9:16` 宽高比。                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                 |
| Together              | 仅支持单张图片参考。                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                      |
| Vydra                 | 直接使用 `https://www.vydra.ai/api/v1` 以避免丢失身份验证的重定向。`veo3` 仅打包为文本生成视频；`kling` 需要远程图片 URL。                                                                                                                                                                                                                                                                                                                                                                                                                                                                                |
| xAI                   | 支持文本生成视频、图片生成视频以及远程视频编辑/扩展流程。                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                 |

## 提供商功能模式

共享视频生成协议现在允许提供商声明特定模式的功能，而不仅仅是平面的聚合限制。新的提供商实现应优先使用显式模式块：

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

平面聚合字段（如 `maxInputImages` 和 `maxInputVideos`）不足以通告转换模式支持。提供商应显式声明 `generate`、`imageToVideo` 和 `videoToVideo`，以便实时测试、合约测试和共享 `video_generate` 工具可以确定性地验证模式支持。

## 实时测试

针对共享打包提供商的实时可选覆盖：

```bash
OPENCLAW_LIVE_TEST=1 pnpm test:live -- extensions/video-generation-providers.live.test.ts
```

仓库包装器：

```bash
pnpm test:live:media video
```

此实时文件从 `~/.profile` 加载缺失的提供商环境变量，默认优先使用 live/env API API 而非存储的身份验证配置文件，并且默认运行发布安全的冒烟测试：

- 针对扫描中每个非 FAL 提供商的 `generate`
- 一秒龙虾提示
- 来自 `OPENCLAW_LIVE_VIDEO_GENERATION_TIMEOUT_MS` 的每个提供商操作上限
  （默认为 `180000`）

FAL 是可选的，因为提供商端的队列延迟可能会占据发布时间的大部分：

```bash
pnpm test:live:media video --video-providers fal
```

设置 `OPENCLAW_LIVE_VIDEO_GENERATION_FULL_MODES=1` 以同时运行共享扫描可以安全地通过本地媒体执行的声明转换模式：

- 当 `capabilities.imageToVideo.enabled` 时 `imageToVideo`
- `videoToVideo` 当 `capabilities.videoToVideo.enabled` 且 提供商/模型
  在共享扫描中接受缓冲区支持的本地视频输入时

如今共享的 `videoToVideo` 实时通道涵盖：

- `runway` 仅当您选择 `runway/gen4_aleph` 时

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

- [工具概览](/zh/tools)
- [后台任务](/zh/automation/tasks) -- 用于异步视频生成的任务跟踪
- [Alibaba Model Studio](/zh/providers/alibaba)
- [BytePlus](/zh/concepts/model-providers#byteplus-international)
- [ComfyUI](/zh/providers/comfy)
- [fal](/zh/providers/fal)
- [Google (Gemini)](/zh/providers/google)
- [MiniMax](/zh/providers/minimax)
- [OpenAI](/zh/providers/openai)
- [Qwen](/zh/providers/qwen)
- [Runway](/zh/providers/runway)
- [Together AI](/zh/providers/together)
- [Vydra](/zh/providers/vydra)
- [xAI](/zh/providers/xai)
- [配置参考](/zh/gateway/configuration-reference#agent-defaults)
- [模型](/zh/concepts/models)
