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

对于基于会话的代理运行，OpenClaw 会将音乐生成为后台任务，在任务分类账中对其进行跟踪，然后在音轨准备好时再次唤醒代理，以便代理可以告知用户并附加完成的音频。在使用仅消息工具可见传递的群组/渠道聊天中，代理会通过消息工具中继结果。如果完成代理仅编写私密最终回复，OpenClaw 将回退到通过直接渠道发送生成的媒体。完成唤醒会明确警告代理，在这些路由中，正常的最终回复是私密的。

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
  音乐生成提示词。`action: "generate"` 必需。
</ParamField>
<ParamField path="action" type='"generate" | "status" | "list"' default="generate">
  `"status"` 返回当前会话任务；`"list"` 检查提供商。
</ParamField>
<ParamField path="model" type="string">
  提供商/模型覆盖（例如 `google/lyria-3-pro-preview`、 `comfy/workflow`）。
</ParamField>
<ParamField path="lyrics" type="string">
  当提供商支持显式歌词输入时的可选歌词。
</ParamField>
<ParamField path="instrumental" type="boolean">
  当提供商支持时请求仅器乐输出。
</ParamField>
<ParamField path="image" type="string">
  单个参考图像路径或 URL。
</ParamField>
<ParamField path="images" type="string[]">
  多个参考图像（支持提供商上最多 10 个）。
</ParamField>
<ParamField path="durationSeconds" type="number">
  当提供商支持时长提示时，以秒为单位的目标时长。
</ParamField>
<ParamField path="format" type='"mp3" | "wav"'>
  当提供商支持时的输出格式提示。
</ParamField>
<ParamField path="filename" type="string">
  输出文件名提示。
</ParamField>
<ParamField path="timeoutMs" type="number">
  可选提供商请求超时（毫秒）。如果省略，OpenClaw 将在配置时使用 `agents.defaults.musicGenerationModel.timeoutMs`。低于 10000ms 的值将提升至 10000ms 并在工具结果中报告。
</ParamField>

<Note>并非所有提供商都支持所有参数。OpenClaw 仍会在提交前验证输入计数等硬性限制。当提供商支持持续时间但使用的最大值小于请求值时，OpenClaw 会将其钳位到最接近的支持持续时间。如果选定的提供商或模型无法兑现真正不支持的可选提示，则会在发出警告的情况下忽略这些提示。工具结果会报告应用的设置；`details.normalization` 捕获任何从请求到应用的映射。</Note>

## 异步行为

基于会话的音乐生成作为后台任务运行：

- **后台任务：** `music_generate` 创建一个后台任务，立即返回
  一个 started/task 响应，并在随后的代理消息中稍后发布完成的音轨。
- **防止重复：** 当任务为 `queued` 或 `running` 时，同一
  会话中后续的 `music_generate` 调用将返回任务状态，而不会
  启动另一次生成。请使用 `action: "status"` 进行明确检查。
- **状态查询：** `openclaw tasks list` 或 `openclaw tasks show <taskId>`
  用于检查已排队、运行中和终止状态。
- **完成唤醒：** OpenClaw 将内部完成事件注入
  回同一会话，以便模型可以自行编写面向用户的
  后续消息。
- **提示词提示：** 当同一会话中后续的用户/手动轮次在音乐任务已运行时会收到一个小型的运行时提示，因此模型不会盲目地再次调用 `music_generate`。
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

1. 工具调用中的 `model` 参数（如果代理指定了一个）。
2. 从配置中获取 `musicGenerationModel.primary`。
3. 按顺序使用 `musicGenerationModel.fallbacks`。
4. 仅使用支持身份验证的提供商默认值进行自动检测：
   - 首先是当前的默认提供商；
   - 其余注册的音乐生成提供商按提供商 ID 顺序排列。

如果提供商失败，将自动尝试下一个候选者。如果全部
失败，错误信息将包含每次尝试的详细信息。

设置 `agents.defaults.mediaGenerationAutoProviderFallback: false` 以仅使用
显式的 `model`、`primary` 和 `fallbacks` 条目。

## 提供商说明

<AccordionGroup>
  <Accordion title="ComfyUI">由工作流驱动，取决于为提示词/输出字段配置的图和节点映射。 捆绑的 `comfy` 插件通过音乐生成提供商注册表 插入到共享的 `music_generate` 工具中。</Accordion>
  <Accordion title="Google (Lyria 3)">使用 Lyria 3 批量生成。当前捆绑的流程支持 提示词、可选歌词文本和可选参考图像。</Accordion>
  <Accordion title="MiniMaxMiniMax">使用批量 `music_generation` 端点。支持提示词、可选 歌词、器乐模式、时长控制以及通过 `minimax`API API 密钥身份验证或 `minimax-portal`OAuth OAuth 进行 mp3 输出。</Accordion>
</AccordionGroup>

## 选择合适的路径

- **共享提供商支持**，当您需要模型选择、提供商
  故障转移以及内置的异步任务/状态流程时。
- **插件路径**，当您需要自定义工作流图谱或
  不属于共享捆绑音乐功能的提供商时。

如果您正在调试 ComfyUI 特有的行为，请参阅
[ComfyUI](/zh/providers/comfy)。如果您正在调试共享提供商
行为，请从 [Google (Gemini)](/zh/providers/googleMiniMax) 或
[MiniMax](/zh/providers/minimax) 开始。

## 提供商能力模式

共享音乐生成合约支持显式模式声明：

- `generate` 用于仅基于提示词的生成。
- 当请求包含一个或多个参考图像时，请使用 `edit`。

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
`supportsFormat`）**不**足以表明支持编辑。提供商
应显式声明 `generate` 和 `edit`，以便实时测试、
合同测试和共享的 `music_generate` 工具能够确定性地验证模式支持。

## 实时测试

针对共享捆绑提供商的可选实时覆盖：

```bash
OPENCLAW_LIVE_TEST=1 pnpm test:live -- extensions/music-generation-providers.live.test.ts
```

仓库封装器：

```bash
pnpm test:live:media music
```

此实时文件从 `~/.profile` 加载缺失的提供商环境变量，默认优先使用 live/env API 密钥而非存储的身份验证配置文件，并且当提供商启用编辑模式时，同时运行 `generate` 和声明的 `edit` 覆盖。目前的覆盖范围：

- `google`: `generate` 加上 `edit`
- `minimax`：仅限 `generate`
- `comfy`：独立的 Comfy 实时覆盖，而非共享提供商扫描

针对捆绑 ComfyUI 音乐路径的可选实时覆盖：

```bash
OPENCLAW_LIVE_TEST=1 COMFY_LIVE_TEST=1 pnpm test:live -- extensions/comfy/comfy.live.test.ts
```

当配置了相应部分时，Comfy 实时文件也会涵盖 Comfy 图像和视频工作流。

## 相关

- [Background tasks](/zh/automation/tasks) — 针对 `music_generate` 的任务跟踪
- [ComfyUI](/zh/providers/comfy)
- [配置参考](/zh/gateway/config-agents#agent-defaults) — `musicGenerationModel` config
- [Google (Gemini)](/zh/providers/google)
- [MiniMax](MiniMax/en/providers/minimax)
- [模型](/zh/concepts/models) — 模型配置和故障转移
- [工具概述](/zh/tools)
