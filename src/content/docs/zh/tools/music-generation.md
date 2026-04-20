---
summary: "使用共享提供商生成音乐，包括工作流支持的插件"
read_when:
  - Generating music or audio via the agent
  - Configuring music generation providers and models
  - Understanding the music_generate tool parameters
title: "音乐生成"
---

# 音乐生成

`music_generate` 工具允许代理通过共享音乐生成功能创建音乐或音频，该功能已配置了诸如 Google、MiniMax 和工作流配置的 ComfyUI 等提供商。

对于由共享提供商支持的代理会话，OpenClaw 会将音乐生成作为后台任务启动，在任务账本中跟踪它，然后在音轨准备好时再次唤醒代理，以便代理可以将完成的音频发布回原始渠道。

<Note>内置共享工具仅在至少有一个音乐生成提供商可用时才会显示。如果您在代理的工具中看不到 `music_generate`，请配置 `agents.defaults.musicGenerationModel` 或设置提供商 API 密钥。</Note>

## 快速开始

### 共享提供商支持的生成

1. 为至少一个提供商设置 API 密钥，例如 `GEMINI_API_KEY` 或
   `MINIMAX_API_KEY`。
2. 可选择设置您偏好的模型：

```json5
{
  agents: {
    defaults: {
      musicGenerationModel: {
        primary: "google/lyria-3-clip-preview",
      },
    },
  },
}
```

3. 询问代理：_“生成一首关于夜晚驾车穿过霓虹城市的欢快合成器流行曲目。”_

代理会自动调用 `music_generate`。无需工具允许列表。

对于没有会话支持的代理运行，在直接同步上下文中，内置工具仍然会回退到内联生成，并在工具结果中返回最终媒体路径。

提示词示例：

```text
Generate a cinematic piano track with soft strings and no vocals.
```

```text
Generate an energetic chiptune loop about launching a rocket at sunrise.
```

### 工作流驱动的 Comfy 生成

捆绑的 `comfy` 插件通过音乐生成提供商注册表插入到共享 `music_generate` 工具中。

1. 使用工作流 JSON 以及
   提示/输出节点配置 `models.providers.comfy.music`。
2. 如果您使用 Comfy Cloud，请设置 `COMFY_API_KEY` 或 `COMFY_CLOUD_API_KEY`。
3. 向代理请求音乐或直接调用该工具。

示例：

```text
/tool music_generate prompt="Warm ambient synth loop with soft tape texture"
```

## 共享捆绑提供商支持

| 提供商  | 默认模型               | 参考输入       | 支持的控件                                                | API 密钥                               |
| ------- | ---------------------- | -------------- | --------------------------------------------------------- | -------------------------------------- |
| ComfyUI | `workflow`             | 最多 1 张图片  | 工作流定义的音乐或音频                                    | `COMFY_API_KEY`, `COMFY_CLOUD_API_KEY` |
| Google  | `lyria-3-clip-preview` | 最多 10 张图片 | `lyrics`, `instrumental`, `format`                        | `GEMINI_API_KEY`, `GOOGLE_API_KEY`     |
| MiniMax | `music-2.5+`           | 无             | `lyrics`, `instrumental`, `durationSeconds`, `format=mp3` | `MINIMAX_API_KEY`                      |

### 声明的功能矩阵

这是 `music_generate`、合约测试和共享实时扫描所使用的显式模式合约。

| 提供商  | `generate` | `edit` | 编辑限制  | 共享实时通道                                                  |
| ------- | ---------- | ------ | --------- | ------------------------------------------------------------- |
| ComfyUI | 是         | 是     | 1 张图片  | 不在共享扫描中；由 `extensions/comfy/comfy.live.test.ts` 覆盖 |
| Google  | 是         | 是     | 10 张图片 | `generate`, `edit`                                            |
| MiniMax | 是         | 否     | 无        | `generate`                                                    |

使用 `action: "list"` 在运行时检查可用的共享提供商和模型：

```text
/tool music_generate action=list
```

使用 `action: "status"` 检查活动的会话支持音乐任务：

```text
/tool music_generate action=status
```

直接生成示例：

```text
/tool music_generate prompt="Dreamy lo-fi hip hop with vinyl texture and gentle rain" instrumental=true
```

## 内置工具参数

| 参数              | 类型     | 描述                                                                      |
| ----------------- | -------- | ------------------------------------------------------------------------- |
| `prompt`          | string   | 音乐生成提示词（`action: "generate"` 必需）                               |
| `action`          | string   | `"generate"`（默认），`"status"` 用于当前会话任务，或 `"list"` 检查提供商 |
| `model`           | string   | 提供商/模型覆盖，例如 `google/lyria-3-pro-preview` 或 `comfy/workflow`    |
| `lyrics`          | string   | 可选歌词，当提供商支持显式歌词输入时                                      |
| `instrumental`    | boolean  | 当提供商支持时请求纯器乐输出                                              |
| `image`           | string   | 单个参考图像路径或 URL                                                    |
| `images`          | string[] | 多个参考图像（最多 10 个）                                                |
| `durationSeconds` | number   | 当提供商支持时长提示时的目标时长（秒）                                    |
| `format`          | string   | 当提供商支持时的输出格式提示（`mp3` 或 `wav`）                            |
| `filename`        | string   | 输出文件名提示                                                            |

并非所有提供商都支持所有参数。OpenClaw 仍会在提交前验证硬性限制（如输入计数）。当提供商支持时长但使用的最大值小于请求的值时，OpenClaw 会自动将其钳位到最接近的支持时长。当所选提供商或模型无法满足时，将忽略真正不支持的可选提示并发出警告。

工具结果会报告应用的设置。当 OpenClaw 在提供商回退期间钳位时长时，返回的 `durationSeconds` 反映提交的值，而 `details.normalization.durationSeconds` 显示请求值到应用值的映射。

## 共享提供商支持路径的异步行为

- 基于会话的代理运行：`music_generate` 创建一个后台任务，立即返回已启动/任务响应，并在后续的代理消息中发布完成的曲目。
- 重复预防：当该后台任务仍处于 `queued` 或 `running` 状态时，同一会话中后续的 `music_generate` 调用将返回任务状态，而不是启动新的生成。
- 状态查询：使用 `action: "status"` 检查活动的基于会话的音乐任务，而无需启动新任务。
- 任务跟踪：使用 `openclaw tasks list` 或 `openclaw tasks show <taskId>` 检查生成的排队、运行和终止状态。
- 完成唤醒：OpenClaw 将内部完成事件注入回同一会话，以便模型可以自行编写面向用户的后续内容。
- 提示提示：当音乐任务已在进行中时，同一会话中稍后的用户/手动轮次会收到一个小的运行时提示，以免模型盲目地再次调用 `music_generate`。
- 无会话回退：没有真实代理会话的直接/本地上下文仍然内联运行，并在同一轮次中返回最终音频结果。

### 任务生命周期

每个 `music_generate` 请求都会经历四个状态：

1. **queued** -- 任务已创建，等待提供商接受。
2. **running** -- 提供商正在处理（通常为 30 秒到 3 分钟，具体取决于提供商和时长）。
3. **succeeded** -- 曲目就绪；代理唤醒并将其发布到对话中。
4. **failed** -- 提供商错误或超时；代理唤醒并显示错误详细信息。

从 CLI 检查状态：

```bash
openclaw tasks list
openclaw tasks show <taskId>
openclaw tasks cancel <taskId>
```

重复预防：如果当前会话的音乐任务已经是 `queued` 或 `running` 状态，`music_generate` 将返回现有任务状态，而不是启动新任务。使用 `action: "status"` 进行显式检查，而不会触发新生成。

## 配置

### 模型选择

```json5
{
  agents: {
    defaults: {
      musicGenerationModel: {
        primary: "google/lyria-3-clip-preview",
        fallbacks: ["minimax/music-2.5+"],
      },
    },
  },
}
```

### 提供商选择顺序

生成音乐时，OpenClaw 按以下顺序尝试提供商：

1. 如果代理指定了工具调用中的 `model` 参数
2. 来自配置的 `musicGenerationModel.primary`
3. `musicGenerationModel.fallbacks` 顺序
4. 仅使用基于身份验证的提供商默认值进行自动检测：
   - 首先是当前的默认提供商
   - 按提供商 ID 顺序排列的其余已注册音乐生成提供商

如果提供商失败，将自动尝试下一个候选者。如果全部失败，错误信息将包含每次尝试的详细信息。

如果您希望音乐生成仅使用明确的 `model`、`primary` 和 `fallbacks` 条目，请设置 `agents.defaults.mediaGenerationAutoProviderFallback: false`。

## 提供商说明

- Google 使用 Lyria 3 批量生成。当前捆绑的流程支持提示词、可选歌词文本和可选参考图像。
- MiniMax 使用批量 `music_generation` 端点。当前捆绑的流程支持提示词、可选歌词、器乐模式、时长导向和 mp3 输出。
- ComfyUI 支持由工作流驱动，并取决于为提示词/输出字段配置的图加上节点映射。

## 提供商功能模式

共享音乐生成合约现在支持显式模式声明：

- `generate` 用于仅提示词生成
- `edit` 当请求包含一个或多个参考图像时

新的提供商实现应首选显式模式块：

```typescript
capabilities: {
  generate: {
    maxTracks: 1,
    supportsLyrics: true,
    supportsFormat: true,
  },
  edit: {
    enabled: true,
    maxTracks: 1,
    maxInputImages: 1,
    supportsFormat: true,
  },
}
```

传统的平面字段（如 `maxInputImages`、`supportsLyrics` 和 `supportsFormat`）不足以通告编辑支持。提供商应显式声明 `generate` 和 `edit`，以便实时测试、合约测试和共享 `music_generate` 工具可以确定性地验证模式支持。

## 选择正确的路径

- 当您需要模型选择、提供商故障转移以及内置的异步任务/状态流程时，请使用共享提供商支持路径。
- 当您需要自定义工作流图或不属于共享捆绑音乐功能一部分的提供商时，请使用 ComfyUI 等插件路径。
- 如果您正在调试 ComfyUI 特定的行为，请参阅 [ComfyUI](/zh/providers/comfy)。如果您正在调试共享提供商行为，请从 [Google (Gemini)](/zh/providers/google) 或 [MiniMax](/zh/providers/minimax) 开始。

## 实时测试

针对共享捆绑提供商的实时测试可选覆盖：

```bash
OPENCLAW_LIVE_TEST=1 pnpm test:live -- extensions/music-generation-providers.live.test.ts
```

仓库包装器：

```bash
pnpm test:live:media music
```

此实时文件从 `~/.profile` 加载缺失的提供商环境变量，默认优先使用 live/env API 密钥而非存储的身份验证配置文件，并且当提供商启用编辑模式时，同时运行 `generate` 和声明的 `edit` 覆盖测试。

目前这意味着：

- `google`： `generate` 加上 `edit`
- `minimax`： 仅限 `generate`
- `comfy`： 单独的 Comfy 实时覆盖，而非共享提供商扫描

针对捆绑 ComfyUI 音乐路径的实时测试可选覆盖：

```bash
OPENCLAW_LIVE_TEST=1 COMFY_LIVE_TEST=1 pnpm test:live -- extensions/comfy/comfy.live.test.ts
```

当配置了相应部分时，Comfy 实时文件也覆盖 Comfy 图像和视频工作流。

## 相关

- [后台任务](/zh/automation/tasks) - 针对分离式 `music_generate` 运行的任务跟踪
- [配置参考](/zh/gateway/configuration-reference#agent-defaults) - `musicGenerationModel` 配置
- [ComfyUI](/zh/providers/comfy)
- [Google (Gemini)](/zh/providers/google)
- [MiniMax](/zh/providers/minimax)
- [模型](/zh/concepts/models) - 模型配置和故障转移
- [工具概述](/zh/tools)
