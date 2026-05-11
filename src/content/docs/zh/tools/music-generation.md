---
summary: "通过 Google Lyria、MiniMax 和 ComfyUI 工作流使用 music_generate 生成音乐"
read_when:
  - Generating music or audio via the agent
  - Configuring music-generation providers and models
  - Understanding the music_generate tool parameters
title: "音乐生成"
sidebarTitle: "音乐生成"
---

`music_generate` 工具允许代理通过共享音乐生成功能及已配置的提供商（目前包括 Google、MiniMax 和工作流配置的 ComfyUI）来创建音乐或音频。

对于基于会话的代理运行，OpenClaw 会将音乐生成作为后台任务启动，在任务账本中跟踪它，然后在音轨准备就绪时再次唤醒代理，以便代理可以将完成的音频发布回原始渠道。

<Note>内置共享工具仅在至少有一个音乐生成提供商可用时才会出现。如果您在代理的工具中看不到 `music_generate`，请配置 `agents.defaults.musicGenerationModel` 或设置提供商 API 密钥。</Note>

## 快速开始

<Tabs>
  <Tab title="Shared 提供商-backed">
    <Steps>
      <Step title="Configure auth">
        为至少一个提供商设置 API 密钥——例如
        `GEMINI_API_KEY` 或 `MINIMAX_API_KEY`。
      </Step>
      <Step title="Pick a default 模型 (optional)">
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
      </Step>
      <Step title="Ask the agent">
        _“生成一首关于在霓虹城市中夜间驾驶的欢快合成器流行曲目。”_

        代理会自动调用 `music_generate`。无需工具允许列表。
      </Step>
    </Steps>

    对于没有基于会话的代理运行的直接同步上下文，
    内置工具仍然回退到内联生成，并在工具结果中返回
    最终媒体路径。

  </Tab>
  <Tab title="ComfyUI 工作流">
    <Steps>
      <Step title="配置工作流">
        使用工作流 JSON 和提示词/输出节点
        配置 `plugins.entries.comfy.config.music`。
      </Step>
      <Step title="Cloud 身份验证（可选）">
        对于 Comfy Cloud，请设置 `COMFY_API_KEY` 或 `COMFY_CLOUD_API_KEY`。
      </Step>
      <Step title="调用工具">
        ```text
        /tool music_generate prompt="Warm ambient synth loop with soft tape texture"
        ```
      </Step>
    </Steps>
  </Tab>
</Tabs>

提示词示例：

```text
Generate a cinematic piano track with soft strings and no vocals.
```

```text
Generate an energetic chiptune loop about launching a rocket at sunrise.
```

## 支持的提供商

| 提供商  | 默认模型               | 参考输入       | 支持的控件                                                | 身份验证                               |
| ------- | ---------------------- | -------------- | --------------------------------------------------------- | -------------------------------------- |
| ComfyUI | `workflow`             | 最多 1 张图片  | 工作流定义的音乐或音频                                    | `COMFY_API_KEY`, `COMFY_CLOUD_API_KEY` |
| Google  | `lyria-3-clip-preview` | 最多 10 张图片 | `lyrics`, `instrumental`, `format`                        | `GEMINI_API_KEY`, `GOOGLE_API_KEY`     |
| MiniMax | `music-2.6`            | 无             | `lyrics`, `instrumental`, `durationSeconds`, `format=mp3` | `MINIMAX_API_KEY` 或 MiniMax OAuth     |

### 功能矩阵

由 `music_generate`、合约测试和
共享实时扫描使用的显式模式合约：

| 提供商  | `generate` | `edit` | 编辑限制  | 共享实时通道                                                  |
| ------- | :--------: | :----: | --------- | ------------------------------------------------------------- |
| ComfyUI |     ✓      |   ✓    | 1 张图片  | 不在共享扫描中；由 `extensions/comfy/comfy.live.test.ts` 覆盖 |
| Google  |     ✓      |   ✓    | 10 张图片 | `generate`, `edit`                                            |
| MiniMax |     ✓      |   —    | 无        | `generate`                                                    |

使用 `action: "list"` 检查运行时可用的
共享提供商和模型：

```text
/tool music_generate action=list
```

使用 `action: "status"` 检查活动的会话支持的音乐任务：

```text
/tool music_generate action=status
```

直接生成示例：

```text
/tool music_generate prompt="Dreamy lo-fi hip hop with vinyl texture and gentle rain" instrumental=true
```

## 工具参数

<ParamField path="prompt" type="string" required>
  音乐生成提示词。`action: "generate"` 所必需的。
</ParamField>
<ParamField path="action" type='"generate" | "status" | "list"' default="generate">
  `"status"` 返回当前会话任务；`"list"` 检查提供商。
</ParamField>
<ParamField path="model" type="string">
  提供商/模型覆盖（例如 `google/lyria-3-pro-preview`， `comfy/workflow`）。
</ParamField>
<ParamField path="lyrics" type="string">
  当提供商支持显式歌词输入时的可选歌词。
</ParamField>
<ParamField path="instrumental" type="boolean">
  当提供商支持时请求纯器乐输出。
</ParamField>
<ParamField path="image" type="string">
  单个参考图像路径或 URL。
</ParamField>
<ParamField path="images" type="string[]">
  多个参考图像（支持的提供商上最多 10 个）。
</ParamField>
<ParamField path="durationSeconds" type="number">
  当提供商支持持续时间提示时的目标持续时间（以秒为单位）。
</ParamField>
<ParamField path="format" type='"mp3" | "wav"'>
  当提供商支持时的输出格式提示。
</ParamField>
<ParamField path="filename" type="string">
  输出文件名提示。
</ParamField>
<ParamField path="timeoutMs" type="number">
  可选的提供商请求超时（以毫秒为单位）。
</ParamField>

<Note>并非所有提供商都支持所有参数。OpenClaw 仍会在提交前验证硬性限制，例如输入计数。当提供商支持持续时间但使用的最大值小于请求的值时，OpenClaw 会将其限制为最接近的支持的持续时间。当所选提供商或模型无法遵守真正不支持的可选提示时，这些提示将被忽略并发出警告。工具结果报告已应用的设置；`details.normalization` 捕获任何从请求到应用的映射。</Note>

## 异步行为

基于会话的音乐生成作为后台任务运行：

- **后台任务：** `music_generate` 创建一个后台任务，立即返回一个
  已启动/任务响应，并在随后的代理消息中发布完成的音轨。
- **重复预防：** 当任务处于 `queued` 或 `running` 状态时，同一会话中随后的
  `music_generate` 调用将返回任务状态，而不是
  启动新的生成。请使用 `action: "status"` 进行显式检查。
- **状态查询：** `openclaw tasks list` 或 `openclaw tasks show <taskId>`
  检查已排队、正在运行和终止状态。
- **完成唤醒：** OpenClaw 将内部完成事件注入
  回同一会话，以便模型可以自行编写面向用户的
  后续消息。
- **提示提示：** 当音乐任务已在运行时，同一会话中后续的用户/手动轮次会收到一个
  小的运行时提示，以免模型
  盲目再次调用 `music_generate`。
- **无会话回退：** 没有真实代理会话的直接/本地上下文内联运行，并在同一轮中返回最终音频结果。

### 任务生命周期

| 状态        | 含义                                                              |
| ----------- | ----------------------------------------------------------------- |
| `queued`    | 任务已创建，等待提供商接受。                                      |
| `running`   | 提供商正在处理（通常为 30 秒到 3 分钟，具体取决于提供商和时长）。 |
| `succeeded` | 音轨就绪；代理唤醒并将其发布到对话中。                            |
| `failed`    | 提供商错误或超时；代理唤醒并附带错误详情。                        |

从 CLI 检查状态：

```bash
openclaw tasks list
openclaw tasks show <taskId>
openclaw tasks cancel <taskId>
```

## 配置

### 模型选择

```json5
{
  agents: {
    defaults: {
      musicGenerationModel: {
        primary: "google/lyria-3-clip-preview",
        fallbacks: ["minimax/music-2.6"],
      },
    },
  },
}
```

### 提供商选择顺序

OpenClaw 按以下顺序尝试提供商：

1. 来自工具调用的 `model` 参数（如果代理指定了一个）。
2. 来自配置的 `musicGenerationModel.primary`。
3. 按顺序排列的 `musicGenerationModel.fallbacks`。
4. 仅使用支持身份验证的提供商默认值进行自动检测：
   - 首先是当前的默认提供商；
   - 其余注册的音乐生成提供商按提供商 ID 顺序排列。

如果提供商失败，将自动尝试下一个候选者。如果全部
失败，错误信息将包含每次尝试的详细信息。

设置 `agents.defaults.mediaGenerationAutoProviderFallback: false` 以仅使用
显式的 `model`、`primary` 和 `fallbacks` 条目。

## 提供商说明

<AccordionGroup>
  <Accordion title="ComfyUI">由工作流驱动，并依赖于为提示词/输出字段配置的图谱和节点映射。 捆绑的 `comfy` 插件通过音乐生成提供商注册表 插入到共享的 `music_generate` 工具中。</Accordion>
  <Accordion title="Google (Lyria 3)">使用 Lyria 3 批量生成。当前捆绑的流程支持 提示词、可选歌词文本和可选参考图像。</Accordion>
  <Accordion title="MiniMax">使用批量 `music_generation` 端点。支持提示词、可选 歌词、器乐模式、时长控制，并通过 `minimax` API 密钥身份验证或 `minimax-portal` OAuth 支持 mp3 输出。</Accordion>
</AccordionGroup>

## 选择合适的路径

- **共享提供商支持**，当您需要模型选择、提供商
  故障转移以及内置的异步任务/状态流程时。
- **插件路径**，当您需要自定义工作流图谱或
  不属于共享捆绑音乐功能的提供商时。

如果您正在调试 ComfyUI 特定的行为，请参阅
[ComfyUI](/zh/providers/comfy)。如果您正在调试共享提供商
的行为，请从 [Google (Gemini)](/zh/providers/google) 或
[MiniMax](/zh/providers/minimax) 开始。

## 提供商能力模式

共享音乐生成合约支持显式模式声明：

- `generate` 用于仅提示词的生成。
- `edit` 当请求包含一张或多张参考图像时。

新的提供商实现应优先使用显式模式块：

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

传统的扁平字段（如 `maxInputImages`、`supportsLyrics` 和
`supportsFormat`）**不足以**声明编辑支持。提供商应明确声明
`generate` 和 `edit`，以便实时测试、契约测试
和共享 `music_generate` 工具能够确定性地验证模式支持。

## 实时测试

针对共享捆绑提供商的可选实时覆盖：

```bash
OPENCLAW_LIVE_TEST=1 pnpm test:live -- extensions/music-generation-providers.live.test.ts
```

仓库封装器：

```bash
pnpm test:live:media music
```

此实时文件从 `~/.profile` 加载缺失的提供商环境变量，默认优先使用
live/env API 密钥而非存储的身份验证配置文件，并且当提供商启用编辑
模式时，同时运行 `generate` 和已声明的 `edit` 覆盖。当前的覆盖范围：

- `google`：`generate` 加上 `edit`
- `minimax`：仅 `generate`
- `comfy`：独立的 Comfy 实时覆盖，而非共享提供商扫描

针对捆绑 ComfyUI 音乐路径的可选实时覆盖：

```bash
OPENCLAW_LIVE_TEST=1 COMFY_LIVE_TEST=1 pnpm test:live -- extensions/comfy/comfy.live.test.ts
```

当配置了相应部分时，Comfy 实时文件也会涵盖 Comfy 图像和视频工作流。

## 相关

- [后台任务](/zh/automation/tasks) — 针对分离式 `music_generate` 运行的任务跟踪
- [ComfyUI](/zh/providers/comfy)
- [配置参考](/zh/gateway/config-agents#agent-defaults) — `musicGenerationModel` 配置
- [Google (Gemini)](/zh/providers/google)
- [MiniMax](/zh/providers/minimax)
- [模型](/zh/concepts/models) — 模型配置和故障转移
- [工具概述](/zh/tools)
