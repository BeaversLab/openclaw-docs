---
summary: "MiniMaxOpenRouter通过 ComfyUI、fal、Google Lyria、MiniMax 和 OpenRouter 工作流使用 music_generate 生成音乐"
read_when:
  - Generating music or audio via the agent
  - Configuring music-generation providers and models
  - Understanding the music_generate tool parameters
title: "音乐生成"
sidebarTitle: "音乐生成"
---

`music_generate`MiniMaxOpenRouter 工具允许代理通过共享的音乐生成功能并使用已配置的提供商（目前包括 ComfyUI、fal、Google、MiniMax 和 OpenRouter）来创建音乐或音频。

对于基于会话的代理运行，OpenClaw 将音乐生成为后台任务，在任务账本中跟踪它，然后在音轨准备好时再次唤醒代理，以便代理可以告知用户并附上完成的音频。生成的媒体完成项由代理通过消息工具传递。如果请求者会话处于非活动状态，并且某些生成的音频仍然缺少通过消息工具传递的内容，OpenClaw 将仅使用缺失的音频发送幂等的直接回退。完成唤醒明确警告代理，此路由的正常最终回复是私有的。

<Note>内置共享工具仅在至少有一个音乐生成提供商可用时才会出现。如果您在代理的工具中看不到 `music_generate`，请配置 `agents.defaults.musicGenerationModel`API 或设置提供商 API 密钥。</Note>

## 快速开始

<Tabs>
  <Tab title="共享提供商支持">
    <Steps>
      <Step title="配置身份验证"API>
        为至少一个提供商设置 API 密钥，例如
        `GEMINI_API_KEY` 或 `MINIMAX_API_KEY`。
      </Step>
      <Step title="选择默认模型（可选）">
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
      <Step title="请求代理">
        _“生成一首关于霓虹城市夜间驾驶的欢快合成流行音轨。”_

        代理会自动调用 `music_generate`。无需工具允许列表。
      </Step>
    </Steps>

    对于没有基于会话的代理运行的直接同步上下文，
    内置工具仍然回退到内联生成，并在工具结果中返回
    最终媒体路径。

  </Tab>
  <Tab title="ComfyUI workflow">
    <Steps>
      <Step title="Configure the workflow">
        使用工作流 JSON 和提示/输出节点配置 `plugins.entries.comfy.config.music`。
      </Step>
      <Step title="Cloud auth (optional)">
        对于 Comfy Cloud，请设置 `COMFY_API_KEY` 或 `COMFY_CLOUD_API_KEY`。
      </Step>
      <Step title="Call the 工具">
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

| 提供商     | 默认模型                     | 参考输入       | 支持的控件                                            | 身份验证                                       |
| ---------- | ---------------------------- | -------------- | ----------------------------------------------------- | ---------------------------------------------- |
| ComfyUI    | `workflow`                   | 最多 1 张图片  | 工作流定义的音乐或音频                                | `COMFY_API_KEY`, `COMFY_CLOUD_API_KEY`         |
| fal        | `fal-ai/minimax-music/v2.6`  | 无             | `lyrics`, `instrumental`, `durationSeconds`, `format` | `FAL_KEY` 或 `FAL_API_KEY`                     |
| Google     | `lyria-3-clip-preview`       | 最多 10 张图片 | `lyrics`, `instrumental`, `format`                    | `GEMINI_API_KEY`, `GOOGLE_API_KEY`             |
| MiniMax    | `music-2.6`                  | 无             | `lyrics`, `instrumental`, `format=mp3`                | `MINIMAX_API_KEY`MiniMaxOAuth 或 MiniMax OAuth |
| OpenRouter | `google/lyria-3-pro-preview` | 最多 1 张图片  | `lyrics`, `instrumental`, `durationSeconds`, `format` | `OPENROUTER_API_KEY`                           |

### 功能矩阵

由 `music_generate`、合约测试和共享实时扫描使用的显式模式合约：

| 提供商     | `generate` | `edit` | 编辑限制  | 共享实时通道                                                  |
| ---------- | :--------: | :----: | --------- | ------------------------------------------------------------- |
| ComfyUI    |     ✓      |   ✓    | 1 张图片  | 不在共享扫描中；由 `extensions/comfy/comfy.live.test.ts` 覆盖 |
| fal        |     ✓      |   —    | 无        | `generate`                                                    |
| Google     |     ✓      |   ✓    | 10 张图片 | `generate`, `edit`                                            |
| MiniMax    |     ✓      |   —    | 无        | `generate`                                                    |
| OpenRouter |     ✓      |   ✓    | 1 张图片  | `generate`, `edit`                                            |

使用 `action: "list"` 在运行时检查可用的共享提供商和模型：

```text
/tool music_generate action=list
```

使用 `action: "status"` 检查活动的基于会话的音乐任务：

```text
/tool music_generate action=status
```

直接生成示例：

```text
/tool music_generate prompt="Dreamy lo-fi hip hop with vinyl texture and gentle rain" instrumental=true
```

## 工具参数

<ParamField path="prompt" type="string" required>
  音乐生成提示词。对于 `action: "generate"` 是必需的。
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
  当提供商支持时，请求仅器乐输出。
</ParamField>
<ParamField path="image" type="string">
  单个参考图像路径或 URL。
</ParamField>
<ParamField path="images" type="string[]">
  多个参考图像（在支持的提供商上最多 10 个）。
</ParamField>
<ParamField path="durationSeconds" type="number">
  当提供商支持持续时间提示时的目标持续时间（秒）。
</ParamField>
<ParamField path="format" type='"mp3" | "wav"'>
  当提供商支持时的输出格式提示。
</ParamField>
<ParamField path="filename" type="string">
  输出文件名提示。
</ParamField>

<Note>并非所有提供商都支持所有参数。OpenClaw 仍会在提交前验证输入计数等硬性限制。当提供商支持持续时间但使用的最大值小于请求的值时，OpenClaw 会将值限制为最接近的支持的持续时间。当所选提供商或模型无法遵守真正不支持的可选提示时，这些提示将被忽略并发出警告。工具结果报告应用的设置；OpenClawOpenClaw`details.normalization` 捕获任何从请求到应用的映射。</Note>

提供商请求超时仅限于操作员配置。OpenClaw 使用已配置的 `agents.defaults.musicGenerationModel.timeoutMs`，将低于 120000ms 的值提升至 120000ms，否则提供商请求默认为 300000ms。

## 异步行为

基于会话的音乐生成作为后台任务运行：

- **后台任务：** `music_generate` 创建一个后台任务，立即返回已启动/任务响应，并在随后的代理消息中发布完成的曲目。
- **重复预防：** 当任务为 `queued` 或 `running` 时，同一会话中后续的 `music_generate` 调用将返回任务状态，而不是开始另一次生成。请使用 `action: "status"` 进行显式检查。
- **状态查询：** `openclaw tasks list` 或 `openclaw tasks show <taskId>` 检查已排队、正在运行和最终状态。
- **完成唤醒：** OpenClaw 将一个内部完成事件注入回同一会话，以便模型可以自行编写面向用户的后续内容。
- **提示提示：** 当音乐任务已在进行中时，同一会话中后续的用户/手动轮次会收到一个小的运行时提示，以便模型不会盲目地再次调用 `music_generate`。
- **无会话回退：** 没有真实代理会话的直接/本地上下文以内联方式运行，并在同一轮次中返回最终音频结果。

### 任务生命周期

| 状态        | 含义                                                              |
| ----------- | ----------------------------------------------------------------- |
| `queued`    | 任务已创建，正在等待提供商接受。                                  |
| `running`   | 提供商正在处理（通常为 30 秒到 3 分钟，具体取决于提供商和时长）。 |
| `succeeded` | 音轨准备就绪；代理唤醒并将其发布到对话中。                        |
| `failed`    | 提供商错误或超时；代理唤醒并附带错误详细信息。                    |

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
        fallbacks: ["fal/fal-ai/minimax-music/v2.6", "minimax/music-2.6"],
      },
    },
  },
}
```

### 提供商选择顺序

OpenClaw 按以下顺序尝试提供商：

1. 工具调用中的 `model` 参数（如果代理指定了一个）。
2. 来自配置的 `musicGenerationModel.primary`。
3. 按顺序的 `musicGenerationModel.fallbacks`。
4. 仅使用支持身份验证的提供商默认值进行自动检测：
   - 首先是当前的默认提供商；
   - 按提供商 ID 顺序排列的其余已注册音乐生成提供商。

如果提供商失败，将自动尝试下一个候选者。如果全部
失败，错误信息将包含每次尝试的详细信息。

设置 `agents.defaults.mediaGenerationAutoProviderFallback: false` 以仅使用显式的 `model`、`primary` 和 `fallbacks` 条目。

## 提供商说明

<AccordionGroup>
  <Accordion title="ComfyUI">由工作流驱动，取决于为提示/输出字段配置的图和节点映射。 捆绑的 `comfy` 插件通过音乐生成提供商注册表接入共享的 `music_generate` 工具。</Accordion>
  <Accordion title="fal">通过共享提供商身份验证路径使用 fal 模型端点。打包的提供商默认为 `fal-ai/minimax-music/v2.6`，并为提示词到音频请求也公开了 `fal-ai/ace-step/prompt-to-audio` 和 `fal-ai/stable-audio-25/text-to-audio`。</Accordion>
  <Accordion title="Google (Lyria 3)">使用 Lyria 3 批量生成。当前捆绑的流程支持 提示、可选歌词文本和可选参考图像。</Accordion>
  <Accordion title="MiniMaxMiniMax">使用批量 `music_generation` 端点。支持提示词、可选歌词、器乐模式和 mp3 输出，可通过 `minimax`API API 密钥身份验证或 `minimax-portal`OAuth OAuth 实现。</Accordion>
  <Accordion title="OpenRouterOpenRouter" OpenRouter>
    使用启用了流式传输的 OpenRouter 聊天补全音频输出。打包的提供商默认为 `google/lyria-3-pro-preview`，并且也公开了 `openrouter/google/lyria-3-clip-preview`。
  </Accordion>
</AccordionGroup>

## 选择正确的路径

- **共享提供商支持**，当您需要模型选择、提供商故障转移以及内置的异步任务/状态流程时。
- **插件路径**，当您需要自定义工作流图或不属于共享捆绑音乐功能的提供商时。

如果您正在调试 ComfyUI 特有的行为，请参阅 [ComfyUI](/zh/providers/comfy)。如果您正在调试共享提供商行为，请从 [fal](/zh/providers/fal)、[Google (Gemini)](/zh/providers/googleMiniMax)、[MiniMax](/zh/providers/minimaxOpenRouter) 或 [OpenRouter](/zh/providers/openrouter) 开始。

## 提供商能力模式

共享音乐生成合约支持显式模式声明：

- `generate` 用于仅提示词生成。
- `edit` 当请求包含一个或多个参考图像时。

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

传统的平面字段（如 `maxInputImages`、`supportsLyrics` 和 `supportsFormat`）**不足以**通告编辑支持。提供商应显式声明 `generate` 和 `edit`，以便实时测试、契约测试和共享 `music_generate` 工具可以确定性验证模式支持。

## 实时测试

选择加入共享捆绑提供商的实时覆盖：

```bash
OPENCLAW_LIVE_TEST=1 pnpm test:live -- extensions/music-generation-providers.live.test.ts
```

Repo 包装器：

```bash
pnpm test:live:media music
```

默认情况下，此实时文件优先使用已导出的提供商环境变量而非存储的身份验证配置文件，并且当提供商启用编辑模式时，会同时运行 `generate` 和声明的 `edit` 覆盖范围。目前的覆盖范围包括：

- `google`：`generate` 加上 `edit`
- `fal`：仅 `generate`
- `minimax`：仅 `generate`
- `openrouter`：`generate` 加上 `edit`
- `comfy`：独立的 Comfy 实时覆盖范围，而非共享提供商扫描

针对捆绑的 ComfyUI 音乐路径的可选实时覆盖范围：

```bash
OPENCLAW_LIVE_TEST=1 COMFY_LIVE_TEST=1 pnpm test:live -- extensions/comfy/comfy.live.test.ts
```

当配置了相关部分时，Comfy 实时文件还会涵盖 Comfy 的图像和视频工作流程。

## 相关内容

- [后台任务](/zh/automation/tasks) — 针对分离的 `music_generate` 运行的任务跟踪
- [ComfyUI](/zh/providers/comfy)
- [配置参考](/zh/gateway/config-agents#agent-defaults) — `musicGenerationModel` 配置
- [Google (Gemini)](/zh/providers/google)
- [MiniMax](MiniMax/en/providers/minimax)
- [模型](/zh/concepts/models) — 模型配置和故障转移
- [工具概述](/zh/tools)
