---
summary: "使用共享提供商（包括工作流支持的插件）生成音乐"
read_when:
  - Generating music or audio via the agent
  - Configuring music generation providers and models
  - Understanding the music_generate tool parameters
title: "音乐生成"
---

# 音乐生成

`music_generate` 工具允许代理通过共享的音乐生成功能创建音乐或音频，该功能已配置了 Google、MiniMax 和工作流配置的 ComfyUI 等提供商。

对于由共享提供商支持的代理会话，OpenClaw 会将音乐生成作为后台任务启动，在任务账本中跟踪它，然后在音轨准备好时再次唤醒代理，以便代理可以将完成的音频发布回原始渠道。

<Note>内置的共享工具仅在至少有一个音乐生成提供商可用时才会出现。如果您在代理工具中看不到 `music_generate`，请配置 `agents.defaults.musicGenerationModel` 或设置提供商 API 密钥。</Note>

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

代理会自动调用 `music_generate`。无需工具白名单。

对于没有会话支持的代理运行，在直接同步上下文中，内置工具仍然会回退到内联生成，并在工具结果中返回最终媒体路径。

提示词示例：

```text
Generate a cinematic piano track with soft strings and no vocals.
```

```text
Generate an energetic chiptune loop about launching a rocket at sunrise.
```

### 工作流驱动的 Comfy 生成

捆绑的 `comfy` 插件通过音乐生成提供商注册表插入到共享的 `music_generate` 工具中。

1. 使用工作流 JSON 以及提示/输出节点配置 `models.providers.comfy.music`。
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

使用 `action: "list"` 在运行时检查可用的共享提供商和模型：

```text
/tool music_generate action=list
```

使用 `action: "status"` 检查当前会话支持的音乐任务：

```text
/tool music_generate action=status
```

直接生成示例：

```text
/tool music_generate prompt="Dreamy lo-fi hip hop with vinyl texture and gentle rain" instrumental=true
```

## 内置工具参数

| 参数              | 类型     | 描述                                                                        |
| ----------------- | -------- | --------------------------------------------------------------------------- |
| `prompt`          | 字符串   | 音乐生成提示词（`action: "generate"` 必需）                                 |
| `action`          | 字符串   | `"generate"`（默认），`"status"` 用于当前会话任务，或 `"list"` 以检查提供商 |
| `model`           | 字符串   | 提供商/模型覆盖，例如 `google/lyria-3-pro-preview` 或 `comfy/workflow`      |
| `lyrics`          | 字符串   | 当提供商支持显式歌词输入时的可选歌词                                        |
| `instrumental`    | 布尔值   | 当提供商支持时请求仅器乐输出                                                |
| `image`           | 字符串   | 单个参考图片路径或 URL                                                      |
| `images`          | 字符串[] | 多个参考图片（最多 10 张）                                                  |
| `durationSeconds` | 数字     | 当提供商支持时长提示时的目标持续时间（秒）                                  |
| `format`          | 字符串   | 当提供商支持时的输出格式提示（`mp3` 或 `wav`）                              |
| `filename`        | 字符串   | 输出文件名提示                                                              |

并非所有提供商都支持所有参数。OpenClaw 仍会在提交前验证输入计数等硬性限制，但如果所选提供商或模型无法满足不支持的的可选提示，则会忽略并发出警告。

## 共享提供商支持路径的异步行为

- 基于会话的代理运行：`music_generate` 创建一个后台任务，立即返回已启动/任务响应，并在后续的代理消息中发布完成的音轨。
- 重复预防：当该后台任务仍处于 `queued` 或 `running` 状态时，同一会话中后续的 `music_generate` 调用将返回任务状态，而不是开始另一次生成。
- 状态查询：使用 `action: "status"` 检查活动的基于会话的音乐任务，而无需启动新任务。
- 任务跟踪：使用 `openclaw tasks list` 或 `openclaw tasks show <taskId>` 检查生成的排队、运行和最终状态。
- 完成唤醒：OpenClaw 将内部完成事件注入回同一会话，以便模型可以自行编写面向用户的后续内容。
- 提示提示：当音乐任务已在运行时，同一会话中后续的用户/手动轮次会获得一个小的运行时提示，以防止模型盲目地再次调用 `music_generate`。
- 无会话回退：没有真实代理会话的直接/本地上下文仍将内联运行，并在同一轮次中返回最终音频结果。

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

1. 工具调用中的 `model` 参数（如果代理指定了一个）
2. 来自配置的 `musicGenerationModel.primary`
3. 按顺序排列的 `musicGenerationModel.fallbacks`
4. 仅使用支持身份验证的提供商默认值进行自动检测：
   - 首先是当前的默认提供商
   - 按提供商 ID 顺序排列的其余已注册音乐生成提供商

如果提供商失败，会自动尝试下一个候选者。如果全部失败，错误将包含每次尝试的详细信息。

## 提供商说明

- Google 使用 Lyria 3 批量生成。当前捆绑的流程支持提示、可选歌词文本和可选参考图像。
- MiniMax 使用批量 `music_generation` 端点。当前捆绑的流程支持提示、可选歌词、器乐模式、持续度控制和 mp3 输出。
- ComfyUI 支持由工作流驱动，并依赖于配置的图以及用于提示/输出字段的节点映射。

## 选择正确的路径

- 当您需要模型选择、提供商故障转移以及内置的异步任务/状态流程时，请使用共享提供商支持的路径。
- 当您需要自定义工作流图或不属于共享捆绑音乐功能的提供商（例如 ComfyUI）时，请使用插件路径。
- 如果您正在调试 ComfyUI 特定的行为，请参阅 [ComfyUI](/en/providers/comfy)。如果您正在调试共享提供商的行为，请从 [Google (Gemini)](/en/providers/google) 或 [MiniMax](/en/providers/minimax) 开始。

## 实时测试

针对共享捆绑提供商选择加入实时覆盖：

```bash
OPENCLAW_LIVE_TEST=1 pnpm test:live -- extensions/music-generation-providers.live.test.ts
```

针对捆绑的 ComfyUI 音乐路径选择加入实时覆盖：

```bash
OPENCLAW_LIVE_TEST=1 COMFY_LIVE_TEST=1 pnpm test:live -- extensions/comfy/comfy.live.test.ts
```

当配置了这些部分时，Comfy 实时文件也涵盖 Comfy 图像和视频工作流。

## 相关

- [后台任务](/en/automation/tasks) - 针对 `music_generate` 分离运行的任务跟踪
- [配置参考](/en/gateway/configuration-reference#agent-defaults) - `musicGenerationModel` 配置
- [ComfyUI](/en/providers/comfy)
- [Google (Gemini)](/en/providers/google)
- [MiniMax](/en/providers/minimax)
- [模型](/en/concepts/models) - 模型配置和故障转移
- [工具概述](/en/tools)
