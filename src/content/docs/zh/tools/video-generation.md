---
summary: "通过 video_generate 从文本、图像或视频参考生成视频，支持 14 个提供商后端"
read_when:
  - Generating videos via the agent
  - Configuring video-generation providers and models
  - Understanding the video_generate tool parameters
title: "视频生成"
sidebarTitle: "视频生成"
---

OpenClaw 代理可以从文本提示、参考图像或现有视频生成视频。支持 14 个提供商后端，每个后端具有不同的模型选项、输入模式和功能集。代理会根据您的配置和可用的 API 密钥自动选择合适的提供商。

<Note>`video_generate` 工具仅在至少有一个视频生成提供商可用时才会出现。如果您在代理工具中看不到它，请设置提供商 API 密钥或配置 `agents.defaults.videoGenerationModel`。</Note>

OpenClaw 将视频生成视为三种运行时模式：

- `generate` — 不带参考媒体的文本生成视频请求。
- `imageToVideo` — 请求包含一张或多张参考图像。
- `videoToVideo` — 请求包含一个或多个参考视频。

提供商可以支持这些模式的任何子集。该工具会在提交前验证活动模式，并在 `action=list` 中报告支持的模式。

## 快速开始

<Steps>
  <Step title="Configure auth">
    为任何支持的提供商设置 API 密钥：

    ```bash
    export GEMINI_API_KEY="your-key"
    ```

  </Step>
  <Step title="Pick a default 模型 (optional)">
    ```bash
    openclaw config set agents.defaults.videoGenerationModel.primary "google/veo-3.1-fast-generate-preview"
    ```
  </Step>
  <Step title="Ask the agent">
    > Generate a 5-second cinematic video of a friendly lobster surfing at sunset.

    代理会自动调用 `video_generate`。不需要工具白名单。

  </Step>
</Steps>

## 异步生成如何工作

视频生成是异步的。当代理在会话中调用 `video_generate` 时：

1. OpenClaw 将请求提交给提供商并立即返回任务 ID。
2. 提供商在后台处理作业（通常需要 30 秒到 5 分钟，具体取决于提供商和分辨率）。
3. 当视频准备好后，OpenClaw 会通过内部完成事件唤醒同一会话。
4. Agent 会将完成的视频发布回原始对话。

当任务正在进行时，同一会话中重复的 `video_generate` 调用将返回当前任务状态，而不是启动另一个生成任务。请使用 `openclaw tasks list` 或 `openclaw tasks show <taskId>` 从 CLI 检查进度。

在非会话支持的 Agent 运行中（例如，直接工具调用），该工具将回退到内联生成，并在同一轮次中返回最终媒体路径。

当提供商返回字节流时，生成的视频文件将保存在 OpenClaw 管理的媒体存储中。默认的生成视频保存上限遵循视频媒体限制，而 `agents.defaults.mediaMaxMb` 会为更大的渲染提高此限制。当提供商还返回托管输出 URL 时，如果本地持久化拒绝超大文件，OpenClaw 可以传递该 URL 而不是使任务失败。

### 任务生命周期

| 状态        | 含义                                                                |
| ----------- | ------------------------------------------------------------------- |
| `queued`    | 任务已创建，等待提供商接受。                                        |
| `running`   | 提供商正在处理（通常为 30 秒到 5 分钟，具体取决于提供商和分辨率）。 |
| `succeeded` | 视频已就绪；Agent 唤醒并将其发布到对话中。                          |
| `failed`    | 提供商错误或超时；Agent 唤醒并显示错误详细信息。                    |

从 CLI 检查状态：

```bash
openclaw tasks list
openclaw tasks show <taskId>
openclaw tasks cancel <taskId>
```

如果当前会话的视频任务已经处于 `queued` 或 `running` 状态，`video_generate` 将返回现有任务状态，而不是启动新任务。使用 `action: "status"` 可以在不触发新生成的情况下明确检查状态。

## 支持的提供商

| 提供商                | 默认模型                        | 文本 | 图像参考                                        | 视频参考                                  | 认证                                     |
| --------------------- | ------------------------------- | :--: | ----------------------------------------------- | ----------------------------------------- | ---------------------------------------- |
| Alibaba               | `wan2.6-t2v`                    |  ✓   | 是（远程 URL）                                  | 是（远程 URL）                            | `MODELSTUDIO_API_KEY`                    |
| BytePlus (1.0)        | `seedance-1-0-pro-250528`       |  ✓   | 最多 2 张图片（仅限 I2V 模型；首帧 + 末帧）     | —                                         | `BYTEPLUS_API_KEY`                       |
| BytePlus Seedance 1.5 | `seedance-1-5-pro-251215`       |  ✓   | 最多 2 张图片（通过角色指定首帧 + 末帧）        | —                                         | `BYTEPLUS_API_KEY`                       |
| BytePlus Seedance 2.0 | `dreamina-seedance-2-0-260128`  |  ✓   | 最多 9 张参考图片                               | 最多 3 个视频                             | `BYTEPLUS_API_KEY`                       |
| ComfyUI               | `workflow`                      |  ✓   | 1 张图片                                        | —                                         | `COMFY_API_KEY` 或 `COMFY_CLOUD_API_KEY` |
| fal                   | `fal-ai/minimax/video-01-live`  |  ✓   | 1 张图片；使用 Seedance 参考视频功能时最多 9 张 | 使用 Seedance 参考视频功能时最多 3 个视频 | `FAL_KEY`                                |
| Google                | `veo-3.1-fast-generate-preview` |  ✓   | 1 张图片                                        | 1 个视频                                  | `GEMINI_API_KEY`                         |
| MiniMax               | `MiniMax-Hailuo-2.3`            |  ✓   | 1 张图片                                        | —                                         | `MINIMAX_API_KEY` 或 MiniMax OAuth       |
| OpenAI                | `sora-2`                        |  ✓   | 1 张图片                                        | 1 个视频                                  | `OPENAI_API_KEY`                         |
| Qwen                  | `wan2.6-t2v`                    |  ✓   | 是（远程 URL）                                  | 是（远程 URL）                            | `QWEN_API_KEY`                           |
| Runway                | `gen4.5`                        |  ✓   | 1 张图片                                        | 1 个视频                                  | `RUNWAYML_API_SECRET`                    |
| Together              | `Wan-AI/Wan2.2-T2V-A14B`        |  ✓   | 1 张图片                                        | —                                         | `TOGETHER_API_KEY`                       |
| Vydra                 | `veo3`                          |  ✓   | 1 张图片（`kling`）                             | —                                         | `VYDRA_API_KEY`                          |
| xAI                   | `grok-imagine-video`            |  ✓   | 1 张首帧图片或最多 7 张 `reference_image`s      | 1 个视频                                  | `XAI_API_KEY`                            |

某些提供商接受额外的或备用的 API 密钥环境变量。详情请参阅单独的 [提供商页面](#related)。

运行 `video_generate action=list` 以在运行时检查可用的提供商、模型和运行时模式。

### 功能矩阵

`video_generate` 使用的显式模式契约、契约测试以及共享实时扫描：

| 提供商   | `generate` | `imageToVideo` | `videoToVideo` | 当前的共享实时通道                                                                                                               |
| -------- | :--------: | :------------: | :------------: | -------------------------------------------------------------------------------------------------------------------------------- |
| Alibaba  |     ✓      |       ✓        |       ✓        | `generate`，`imageToVideo`；跳过 `videoToVideo`，因为此提供商需要远程 `http(s)` 视频地址                                         |
| BytePlus |     ✓      |       ✓        |       —        | `generate`，`imageToVideo`                                                                                                       |
| ComfyUI  |     ✓      |       ✓        |       —        | 不在共享扫描中；特定于工作流的覆盖率取决于 Comfy 测试                                                                            |
| fal      |     ✓      |       ✓        |       ✓        | `generate`，`imageToVideo`；仅在使用 Seedance 参考视频生成时 `videoToVideo`                                                      |
| Google   |     ✓      |       ✓        |       ✓        | `generate`，`imageToVideo`；由于当前基于缓冲的 Gemini/Veo 扫描不接受该输入，跳过了共享的 `videoToVideo`                          |
| MiniMax  |     ✓      |       ✓        |       —        | `generate`，`imageToVideo`                                                                                                       |
| OpenAI   |     ✓      |       ✓        |       ✓        | `generate`，`imageToVideo`；由于此组织/输入路径目前需要提供商端的修复/混合（inpaint/remix）访问权限，跳过了共享的 `videoToVideo` |
| Qwen     |     ✓      |       ✓        |       ✓        | `generate`，`imageToVideo`；由于此提供商需要远程 `http(s)` 视频 URL，跳过了 `videoToVideo`                                       |
| Runway   |     ✓      |       ✓        |       ✓        | `generate`，`imageToVideo`；仅当所选模型为 `runway/gen4_aleph` 时，`videoToVideo` 才会运行                                       |
| Together |     ✓      |       ✓        |       —        | `generate`，`imageToVideo`                                                                                                       |
| Vydra    |     ✓      |       ✓        |       —        | `generate`；由于捆绑的 `veo3` 仅支持文本，且捆绑的 `kling` 需要远程图片 URL，跳过了共享的 `imageToVideo`                         |
| xAI      |     ✓      |       ✓        |       ✓        | `generate`，`imageToVideo`；由于此提供商目前需要远程 MP4 URL，跳过了 `videoToVideo`                                              |

## 工具参数

### 必需

<ParamField path="prompt" type="string" required>
  要生成的视频的文本描述。对于 `action: "generate"` 是必需的。
</ParamField>

### 内容输入

<ParamField path="image" type="string">
  单张参考图片（路径或 URL）。
</ParamField>
<ParamField path="images" type="string[]">
  多张参考图片（最多 9 张）。
</ParamField>
<ParamField path="imageRoles" type="string[]">
  与合并后的图片列表平行的可选逐位角色提示。 规范值：`first_frame`、`last_frame`、`reference_image`。
</ParamField>
<ParamField path="video" type="string">
  单个参考视频（路径或 URL）。
</ParamField>
<ParamField path="videos" type="string[]">
  多个参考视频（最多 4 个）。
</ParamField>
<ParamField path="videoRoles" type="string[]">
  与合并后的视频列表平行的可选逐位角色提示。 规范值：`reference_video`。
</ParamField>
<ParamField path="audioRef" type="string">
  单个参考音频（路径或 URL）。当提供商支持音频输入时，用于背景音乐或语音参考。
</ParamField>
<ParamField path="audioRefs" type="string[]">
  多个参考音频（最多 3 个）。
</ParamField>
<ParamField path="audioRoles" type="string[]">
  与合并后的音频列表平行的可选逐位角色提示。 规范值：`reference_audio`。
</ParamField>

<Note>角色提示会按原样转发给提供商。规范值来自 `VideoGenerationAssetRole` 联合类型，但提供商可能接受其他 角色字符串。`*Roles` 数组的条目数不得多于 相应的参考列表；差一错误会导致失败并显示清晰的错误信息。 使用空字符串来留空位置。对于 xAI，将每个图片角色设置为 `reference_image` 以使用其 `reference_images` 生成模式；对于单张图片的图生视频，请省略角色或使用 `first_frame`。</Note>

### 样式控制

<ParamField path="aspectRatio" type="string">
  `1:1`, `2:3`, `3:2`, `3:4`, `4:3`, `4:5`, `5:4`, `9:16`, `16:9`, `21:9`, 或 `adaptive`。
</ParamField>
<ParamField path="resolution" type="string">
  `480P`, `720P`, `768P`, 或 `1080P`。
</ParamField>
<ParamField path="durationSeconds" type="number">
  目标时长，以秒为单位（四舍五入到提供商支持的最接近的值）。
</ParamField>
<ParamField path="size" type="string">
  当提供商支持时的尺寸提示。
</ParamField>
<ParamField path="audio" type="boolean">
  在支持时启用输出中的生成音频。与 `audioRef*`（输入）不同。
</ParamField>
<ParamField path="watermark" type="boolean">
  在支持时切换提供商水印。
</ParamField>

`adaptive` 是一个提供商特定的标记值：它会原样转发给在其功能中声明 `adaptive` 的提供商（例如，BytePlus Seedance 使用它根据输入图像尺寸自动检测宽高比）。未声明它的提供商通过工具结果中的 `details.ignoredOverrides` 显示该值，因此丢弃操作是可见的。

### 高级

<ParamField path="action" type='"generate" | "status" | "list"' default="generate">
  `"status"` 返回当前会话任务；`"list"` 检查提供商。
</ParamField>
<ParamField path="model" type="string">提供商/模型覆盖（例如 `runway/gen4.5`）。</ParamField>
<ParamField path="filename" type="string">输出文件名提示。</ParamField>
<ParamField path="timeoutMs" type="number">可选的提供商请求超时（以毫秒为单位）。</ParamField>
<ParamField path="providerOptions" type="object">
  提供商特定选项，以 JSON 对象形式提供（例如 `{"seed": 42, "draft": true}`）。
  声明了类型化架构的提供商会验证键和类型；未知的键或类型不匹配会在回退期间跳过候选者。没有声明架构的提供商按原样接收选项。运行 `video_generate action=list` 以查看每个提供商接受的内容。
</ParamField>

<Note>并非所有提供商都支持所有参数。OpenClaw 会将持续时间规范化为最接近的提供商支持的值，并在回退提供商公开不同的控制界面时重新映射转换后的几何提示（例如尺寸到纵横比）。真正不支持的覆盖项会被尽力忽略，并在工具结果中作为警告报告。硬性能力限制（例如参考输入过多）会在提交前失败。工具结果会报告应用的设置；`details.normalization` 捕获任何从请求到应用的转换。</Note>

参考输入选择运行时模式：

- 无参考媒体 → `generate`
- 任何图像参考 → `imageToVideo`
- 任何视频参考 → `videoToVideo`
- 参考音频输入**不会**更改解析后的模式；它们应用在图像/视频参考所选的任何模式之上，并且仅适用于声明了 `maxInputAudios` 的提供商。

混合图像和视频参考不是一个稳定的共享能力界面。每次请求请优先使用一种参考类型。

#### 回退和类型化选项

某些能力检查是在回退层而不是在工具边界应用的，因此超出主要提供商限制的请求仍然可以在有能力的回退提供商上运行：

- 当请求包含音频引用时，未声明 `maxInputAudios`（或 `0`）的活动候选者将被跳过；尝试下一个候选者。
- 活动候选者的 `maxDurationSeconds` 低于请求的 `durationSeconds`
  且未声明 `supportedDurationSeconds` 列表 → 跳过。
- 请求包含 `providerOptions` 且活动候选者明确
  声明了类型化 `providerOptions` 架构 → 如果提供的键
  不在架构中或值类型不匹配，则跳过。没有
  声明架构的提供商将按原样接收选项（向后兼容
  透传）。提供商可以通过声明空架构（`capabilities.providerOptions: {}`）来选择退出所有提供商选项，这
  会导致与类型不匹配相同的跳过。

请求中的第一个跳过原因记录在 `warn`，以便操作员查看
其主要提供商何时被跳过；后续跳过记录在 `debug`，以
保持长回退链安静。如果跳过所有候选者，则
聚合错误包括每个候选者的跳过原因。

## 操作

| 操作       | 功能                                                             |
| ---------- | ---------------------------------------------------------------- |
| `generate` | 默认值。根据给定的提示词和可选参考输入创建视频。                 |
| `status`   | 检查当前会话中正在进行的视频任务的状态，而不启动另一个生成任务。 |
| `list`     | 显示可用的提供商、模型及其功能。                                 |

## 模型选择

OpenClaw 按以下顺序解析模型：

1. **`model` 工具参数** —— 如果代理在调用中指定了一个。
2. 配置中的 **`videoGenerationModel.primary`**。
3. 按顺序的 **`videoGenerationModel.fallbacks`**。
4. **自动检测** —— 拥有有效身份验证的提供商，从
   当前默认提供商开始，然后按字母顺序
   依次选择剩余的提供商。

如果提供商失败，系统会自动尝试下一个候选者。如果所有
候选者都失败，错误将包含每次尝试的详细信息。

设置 `agents.defaults.mediaGenerationAutoProviderFallback: false` 以仅使用显式的 `model`、`primary` 和 `fallbacks` 条目。

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

<AccordionGroup>
  <Accordion title="Alibaba">
    使用 DashScope / Model Studio 异步端点。参考图像和
    视频必须是远程 `http(s)` URL。
  </Accordion>
  <Accordion title="BytePlus (1.0)">
    提供商 ID：`byteplus`。

    模型：`seedance-1-0-pro-250528`（默认），
    `seedance-1-0-pro-t2v-250528`，`seedance-1-0-pro-fast-251015`，
    `seedance-1-0-lite-t2v-250428`，`seedance-1-0-lite-i2v-250428`。

    T2V 模型（`*-t2v-*`）不接受图像输入；I2V 模型和
    通用 `*-pro-*` 模型支持单张参考图像（第一
    帧）。按位置传递图像或设置 `role: "first_frame"`。
    当提供图像时，T2V 模型 ID 会自动切换到对应的 I2V
    变体。

    支持的 `providerOptions` 键：`seed`（数字），`draft`（布尔值 —
    强制 480p），`camera_fixed`（布尔值）。

  </Accordion>
  <Accordion title="BytePlus Seedance 1.5">
    需要 [`@openclaw/byteplus-modelark`](https://www.npmjs.com/package/@openclaw/byteplus-modelark)
    插件。提供商 ID：`byteplus-seedance15`。模型：
    `seedance-1-5-pro-251215`。

    使用统一的 `content[]` API。最多支持 2 个输入图像
    （`first_frame` + `last_frame`）。所有输入必须是远程 `https://`
    URL。在每个图像上设置 `role: "first_frame"` / `"last_frame"`，或
    按位置传递图像。

    `aspectRatio: "adaptive"` 会根据输入图像自动检测比例。
    `audio: true` 映射到 `generate_audio`。`providerOptions.seed`
    （数字）会被转发。

  </Accordion>
  <Accordion title="BytePlus Seedance 2.0">
    需要 [`@openclaw/byteplus-modelark`](https://www.npmjs.com/package/@openclaw/byteplus-modelark)
    插件。提供商 ID：`byteplus-seedance2`。模型：
    `dreamina-seedance-2-0-260128`,
    `dreamina-seedance-2-0-fast-260128`。

    使用统一的 `content[]` API。支持最多 9 张参考图片、
    3 个参考视频和 3 个参考音频。所有输入必须是远程
    `https://` URL。在每个资源上设置 `role` — 支持的值：
    `"first_frame"`, `"last_frame"`, `"reference_image"`,
    `"reference_video"`, `"reference_audio"`。

    `aspectRatio: "adaptive"` 会从输入图片自动检测比例。
    `audio: true` 映射为 `generate_audio`。`providerOptions.seed`
    (数字) 会被转发。

  </Accordion>
  <Accordion title="ComfyUI">
    通过配置的图表支持本地或云端工作流驱动执行。支持文本生成视频和
    图片生成视频。
  </Accordion>
  <Accordion title="fal">
    使用队列支持的后端流程来处理长时间运行的任务。大多数 fal 视频模型
    接受单张图片参考。Seedance 2.0 参考生成视频
    模型最多接受 9 张图片、3 个视频和 3 个音频参考，
    总共最多 12 个参考文件。
  </Accordion>
  <Accordion title="Google (Gemini / Veo)">
    支持一张图片或一个视频参考。
  </Accordion>
  <Accordion title="MiniMax">
    仅支持单张图片参考。
  </Accordion>
  <Accordion title="OpenAI">
    仅 `size` 覆盖参数会被转发。其他样式覆盖参数
    (`aspectRatio`, `resolution`, `audio`, `watermark`) 将被忽略并
    生成警告。
  </Accordion>
  <Accordion title="Qwen">
    与阿里巴巴使用相同的 DashScope 后端。参考输入必须是远程
    `http(s)` URL；本地文件会被预先拒绝。
  </Accordion>
  <Accordion title="Runway">
    支持通过 data URI 使用本地文件。视频生视频需要
    `runway/gen4_aleph`。纯文本运行公开 `16:9` 和 `9:16` 宽高
    比。
  </Accordion>
  <Accordion title="Together">
    仅支持单张图片参考。
  </Accordion>
  <Accordion title="Vydra">
    直接使用 `https://www.vydra.ai/api/v1` 以避免丢失认证的
    重定向。`veo3` 仅捆绑为文本生视频；`kling` 需要
    远程图片 URL。
  </Accordion>
  <Accordion title="xAI">
    支持文本生视频、单帧首帧图片生视频，通过 xAI `reference_images` 最多支持 7 个
    `reference_image` 输入，以及远程
    视频编辑/扩展流程。
  </Accordion>
</AccordionGroup>

## 提供商能力模式

共享视频生成合约支持特定模式的功能，
而不仅仅是平面聚合限制。新的提供商实现
应首选显式模式块：

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
    maxInputImagesByModel: { "provider/reference-to-video": 9 },
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

诸如 `maxInputImages` 和 `maxInputVideos` 之类的平面聚合字段
**不**足以宣传转换模式支持。提供商应
显式声明 `generate`、`imageToVideo` 和 `videoToVideo`，以便实时
测试、合约测试和共享 `video_generate` 工具可以
确定性地验证模式支持。

当提供商中的一个模型比其他模型
具有更广泛的参考输入支持时，请使用 `maxInputImagesByModel`、`maxInputVideosByModel` 或
`maxInputAudiosByModel`，而不是提高模式范围的限制。

## 实时测试

选择加入共享捆绑提供商的实时覆盖率：

```bash
OPENCLAW_LIVE_TEST=1 pnpm test:live -- extensions/video-generation-providers.live.test.ts
```

仓库包装器：

```bash
pnpm test:live:media video
```

此实时文件从 `~/.profile` 加载缺失的提供商环境变量，默认优先使用 live/env API 密钥而非存储的配置文件，并且默认运行一个发布安全的冒烟测试：

- 对扫描中的每个非 FAL 提供商执行 `generate`。
- 一秒钟龙虾提示词。
- 来自
  `OPENCLAW_LIVE_VIDEO_GENERATION_TIMEOUT_MS` 的每个提供商操作上限（默认为 `180000`）。

FAL 是可选加入的，因为提供商端的队列延迟可能会占据发布时间的主要部分：

```bash
pnpm test:live:media video --video-providers fal
```

设置 `OPENCLAW_LIVE_VIDEO_GENERATION_FULL_MODES=1` 也可以运行声明的转换模式，这些模式可以通过本地媒体在共享扫描中安全地执行：

- 当 `capabilities.imageToVideo.enabled` 时，执行 `imageToVideo`。
- 当 `capabilities.videoToVideo.enabled` 且提供商/API 在共享扫描中接受缓冲区支持的本地视频输入时，执行
  `videoToVideo`。

目前，共享的 `videoToVideo` 实时通道仅在您选择 `runway/gen4_aleph` 时涵盖 `runway`。

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

- [Alibaba Model Studio](/zh/providers/alibaba)
- [后台任务](/zh/automation/tasks) — 异步视频生成的任务跟踪
- [BytePlus](/zh/concepts/model-providers#byteplus-international)
- [ComfyUI](/zh/providers/comfy)
- [配置参考](/zh/gateway/config-agents#agent-defaults)
- [fal](/zh/providers/fal)
- [Google (Gemini)](/zh/providers/google)
- [MiniMax](/zh/providers/minimax)
- [模型](/zh/concepts/models)
- [OpenAI](/zh/providers/openai)
- [Qwen](/zh/providers/qwen)
- [Runway](/zh/providers/runway)
- [Together AI](/zh/providers/together)
- [工具概览](/zh/tools)
- [Vydra](/zh/providers/vydra)
- [xAI](/zh/providers/xai)
