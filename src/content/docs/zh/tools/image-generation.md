---
summary: "通过 OpenAI、Google、fal、MiniMax、ComfyUI、DeepInfra、OpenRouter、LiteLLM、xAI、Vydra 的 image_generate 生成和编辑图像"
read_when:
  - Generating or editing images via the agent
  - Configuring image-generation providers and models
  - Understanding the image_generate tool parameters
title: "图像生成"
sidebarTitle: "图像生成"
---

`image_generate` 工具允许代理使用您配置的提供商创建和编辑图像。在聊天会话中，图像生成是异步运行的：OpenClaw 记录后台任务，立即返回任务 ID，并在提供商完成时唤醒代理。完成代理必须通过 `message` 工具发送生成的图像；OpenClaw 不会自动发送私有最终回复作为后备。

<Note>该工具仅在至少有一个图像生成提供商可用时出现。如果您在代理的工具中看不到 `image_generate`，请配置 `agents.defaults.imageGenerationModel`，设置提供商 API 密钥，或使用 OpenAI Codex OAuth 登录。</Note>

## 快速开始

<Steps>
  <Step title="配置身份验证">
    为至少一个提供商设置 API 密钥（例如 `OPENAI_API_KEY`、
    `GEMINI_API_KEY`、`OPENROUTER_API_KEY`）或使用 OpenAI Codex OAuth 登录。
  </Step>
  <Step title="选择默认模型（可选）">
    ```json5
    {
      agents: {
        defaults: {
          imageGenerationModel: {
            primary: "openai/gpt-image-2",
            timeoutMs: 180_000,
          },
        },
      },
    }
    ```OAuth

    Codex OAuth 使用相同的 `openai/gpt-image-2` 模型引用。当配置了
    `openai-codex`OAuthOpenClawOAuth OAuth 配置文件时，OpenClaw 将图像请求通过该 OAuth 配置文件
    路由，而不是首先尝试 `OPENAI_API_KEY`。显式的 `models.providers.openai`APIOpenAIAPI 配置（API 密钥、
    自定义/Azure 基础 URL）会选择回退到直接使用 OpenAI Images API
    路由。

  </Step>
  <Step title="询问智能体">
    _“生成一个友好的机器人吉祥物图像。”_

    智能体会自动调用 `image_generate`。不需要工具允许列表——
    当有提供商可用时，该工具默认启用。该工具返回一个后台任务 ID，然后完成智能体
    会在准备好时通过 `message` 工具发送生成的附件。

  </Step>
</Steps>

<Warning>对于与 OpenAI 兼容的 LAN 端点（如 LocalAI），请保留自定义 OpenAI`models.providers.openai.baseUrl` 并使用 `browser.ssrfPolicy.dangerouslyAllowPrivateNetwork: true` 显式选择加入。私有和 内部图像端点默认仍被阻止。</Warning>

## 常用路由

| 目标                                         | 模型引用                                           | 身份验证                                          |
| -------------------------------------------- | -------------------------------------------------- | ------------------------------------------------- |
| 使用 OpenAI 计费的 API 图像生成              | `openai/gpt-image-2`                               | `OPENAI_API_KEY`                                  |
| 通过 OpenAI 订阅身份验证进行 OpenAI 图像生成 | `openai/gpt-image-2`                               | OpenAI Codex OAuth                                |
| OpenAI 透明背景 PNG/WebP                     | `openai/gpt-image-1.5`                             | `OPENAI_API_KEY`OpenAIOAuth 或 OpenAI Codex OAuth |
| DeepInfra 图像生成                           | `deepinfra/black-forest-labs/FLUX-1-schnell`       | `DEEPINFRA_API_KEY`                               |
| OpenRouter 图像生成                          | `openrouter/google/gemini-3.1-flash-image-preview` | `OPENROUTER_API_KEY`                              |
| LiteLLM 图像生成                             | `litellm/gpt-image-2`                              | `LITELLM_API_KEY`                                 |
| Google Gemini 图像生成                       | `google/gemini-3.1-flash-image-preview`            | `GEMINI_API_KEY` 或 `GOOGLE_API_KEY`              |

同一个 `image_generate` 工具处理文生图和参考图像编辑。使用 `image` 处理单个参考或使用 `images` 处理多个参考。提供商支持的输出提示（如 `quality`、`outputFormat` 和 `background`）在可用时会被转发，并在提供商不支持时报告为已忽略。捆绑的透明背景支持是 OpenAI 特有的；如果其他提供商的后端生成，它们可能仍然保留 PNG alpha 通道。

## 支持的提供商

| 提供商     | 默认模型                                | 编辑支持                   | 认证                                                  |
| ---------- | --------------------------------------- | -------------------------- | ----------------------------------------------------- |
| ComfyUI    | `workflow`                              | 是（1 张图像，工作流配置） | `COMFY_API_KEY` 或 `COMFY_CLOUD_API_KEY` 用于云端     |
| DeepInfra  | `black-forest-labs/FLUX-1-schnell`      | 是（1 张图像）             | `DEEPINFRA_API_KEY`                                   |
| fal        | `fal-ai/flux/dev`                       | 是（特定模型的限制）       | `FAL_KEY`                                             |
| Google     | `gemini-3.1-flash-image-preview`        | 是                         | `GEMINI_API_KEY` 或 `GOOGLE_API_KEY`                  |
| LiteLLM    | `gpt-image-2`                           | 是（最多 5 张输入图像）    | `LITELLM_API_KEY`                                     |
| MiniMax    | `image-01`                              | 是（主题参考）             | `MINIMAX_API_KEY` 或 MiniMax OAuth (`minimax-portal`) |
| OpenAI     | `gpt-image-2`                           | 是（最多 4 张图片）        | `OPENAI_API_KEY` 或 OpenAI Codex OAuth                |
| OpenRouter | `google/gemini-3.1-flash-image-preview` | 是（最多 5 张输入图片）    | `OPENROUTER_API_KEY`                                  |
| Vydra      | `grok-imagine`                          | 否                         | `VYDRA_API_KEY`                                       |
| xAI        | `grok-imagine-image`                    | 是（最多 5 张图片）        | `XAI_API_KEY`                                         |

使用 `action: "list"` 在运行时检查可用的提供商和模型：

```text
/tool image_generate action=list
```

使用 `action: "status"` 检查当前会话的活动图像生成任务：

```text
/tool image_generate action=status
```

## 提供商能力

| 能力              | ComfyUI            | DeepInfra | fal                       | Google        | MiniMax              | OpenAI        | Vydra | xAI           |
| ----------------- | ------------------ | --------- | ------------------------- | ------------- | -------------------- | ------------- | ----- | ------------- |
| 生成（最大数量）  | 工作流定义         | 4         | 4                         | 4             | 9                    | 4             | 1     | 4             |
| 编辑 / 参考       | 1 张图像（工作流） | 1 张图片  | Flux: 1; GPT: 10; NB2: 14 | 最多 5 张图像 | 1 张图像（主题参考） | 最多 5 张图像 | -     | 最多 5 张图像 |
| 尺寸控制          | -                  | ✓         | ✓                         | ✓             | -                    | 最高 4K       | -     | -             |
| 宽高比            | -                  | -         | ✓                         | ✓             | ✓                    | -             | -     | ✓             |
| 分辨率 (1K/2K/4K) | -                  | -         | ✓                         | ✓             | -                    | -             | -     | 1K, 2K        |

## 工具参数

<ParamField path="prompt" type="string" required>
  图像生成提示词。`action: "generate"` 必需。
</ParamField>
<ParamField path="action" type='"generate" | "status" | "list"' default="generate">
  使用 `"status"` 检查活动会话任务，或使用 `"list"` 在运行时检查 可用的提供商和模型。
</ParamField>
<ParamField path="model" type="string">
  提供商/模型覆盖（例如 `openai/gpt-image-2`）。请使用 `openai/gpt-image-1.5` 以实现透明的 OpenAI 背景。
</ParamField>
<ParamField path="image" type="string">
  编辑模式的单张参考图像路径或 URL。
</ParamField>
<ParamField path="images" type="string[]">
  编辑模式的多张参考图像（支持的提供商最多 5 张）。
</ParamField>
<ParamField path="size" type="string">
  尺寸提示：`1024x1024`、`1536x1024`、`1024x1536`、`2048x2048`、`3840x2160`。
</ParamField>
<ParamField path="aspectRatio" type="string">
  宽高比：`1:1`、`2:3`、`3:2`、`3:4`、`4:3`、`4:5`、`5:4`、`9:16`、`16:9`、`21:9`。
</ParamField>
<ParamField path="resolution" type='"1K" | "2K" | "4K"'>
  分辨率提示。
</ParamField>
<ParamField path="quality" type='"low" | "medium" | "high" | "auto"'>
  当提供商支持时的质量提示。
</ParamField>
<ParamField path="outputFormat" type='"png" | "jpeg" | "webp"'>
  当提供商支持时的输出格式提示。
</ParamField>
<ParamField path="background" type='"transparent" | "opaque" | "auto"'>
  当提供商支持时的背景提示。对于支持透明度的提供商，请使用 `transparent` 配合 `outputFormat: "png"` 或 `"webp"`。
</ParamField>
<ParamField path="count" type="number">
  要生成的图像数量 (1-4)。
</ParamField>
<ParamField path="timeoutMs" type="number">
  可选的提供商请求超时时间（以毫秒为单位）。当 Codex 通过动态工具调用 `image_generate` 时，此每次调用的值仍会覆盖 配置的默认值，且上限为 600000 毫秒。
</ParamField>
<ParamField path="filename" type="string">
  输出文件名提示。
</ParamField>
<ParamField path="openai" type="object">
  OpenAI 专用提示：`background`、`moderation`、`outputCompression` 和 `user`。
</ParamField>

<Note>并非所有提供商都支持所有参数。当备用提供商支持的是接近的几何选项而不是确切请求的选项时，OpenClaw 会在提交前重新映射到最接近的支持尺寸、纵横比或分辨率。 对于未声明支持的提供商，不支持的输出提示将被丢弃，并在工具结果中报告。工具结果报告应用的设置；OpenClaw`details.normalization` 捕获任何请求到应用的转换。</Note>

## 配置

### 模型选择

```json5
{
  agents: {
    defaults: {
      imageGenerationModel: {
        primary: "openai/gpt-image-2",
        timeoutMs: 180_000,
        fallbacks: ["openrouter/google/gemini-3.1-flash-image-preview", "google/gemini-3.1-flash-image-preview", "fal/fal-ai/flux/dev"],
      },
    },
  },
}
```

### 提供商选择顺序

OpenClaw 按以下顺序尝试提供商：

1. **`model` 参数**（如果代理指定了一个）。
2. **`imageGenerationModel.primary`**（来自配置）。
3. **`imageGenerationModel.fallbacks`**（按顺序）。
4. **自动检测** - 仅限基于身份验证的提供商默认值：
   - 首先是当前默认提供商；
   - 其余已注册的图像生成提供商按提供商 ID 顺序排列。

如果提供商失败（身份验证错误、速率限制等），系统将自动尝试下一个配置的候选项。如果全部失败，错误信息将包含每次尝试的详细信息。

<AccordionGroup>
  <Accordion title="每次调用的模型覆盖是精确的">每次调用 `model` 的覆盖仅尝试该提供商/模型，并且不会继续尝试配置的主要/备用或自动检测的提供商。</Accordion>
  <Accordion title="自动检测具有身份验证感知能力" OpenClaw>
    只有当 OpenClaw 实际上可以对该提供商进行身份验证时，该提供商的默认值才会进入候选列表。设置 `agents.defaults.mediaGenerationAutoProviderFallback: false` 以仅使用显式的 `model`、`primary` 和 `fallbacks` 条目。
  </Accordion>
  <Accordion title="Timeouts">
    为缓慢的图像后端设置 `agents.defaults.imageGenerationModel.timeoutMs`。每次调用的 `timeoutMs` 工具参数会覆盖配置的默认值。Google、OpenRouter 和 xAI 托管的图像提供商使用 180 秒的默认值；Azure OpenAI 图像生成使用 600 秒。Codex 动态工具调用使用 120 秒的 `image_generate` 网桥默认值，并在配置时遵守相同的超时预算，受 OpenClaw 的 600000 毫秒动态工具网桥最大值限制。
  </Accordion>
  <Accordion title="Inspect at runtime">使用 `action: "list"` 检查当前注册的提供商、其默认模型和身份验证环境变量提示。</Accordion>
</AccordionGroup>

### 图像编辑

OpenAI、OpenRouter、Google、DeepInfra、fal、MiniMax、ComfyUI 和 xAI 支持编辑参考图像。传递参考图像路径或 URL：

```text
"Generate a watercolor version of this photo" + image: "/path/to/photo.jpg"
```

OpenAI、OpenRouter、Google 和 xAI 通过 `images` 参数支持最多 5 张参考图像。fal 支持一张参考图像用于 Flux 图生图，GPT Image 2 编辑最多支持 10 张，Nano Banana 2 编辑最多支持 14 张。MiniMax 和 ComfyUI 支持 1 张。

## 提供程序深入探究

<AccordionGroup>
  <Accordion title="OpenAIOpenAI gpt-image-2（以及 gpt-image-1.5）"OpenAI>
    OpenAI 图像生成默认为 `openai/gpt-image-2`。如果配置了
    `openai-codex`OAuthOpenClawOAuth OAuth 配置文件，OpenClaw 将重用 Codex 订阅聊天模型使用的相同
    OAuth 配置文件，并通过 Codex Responses 后端发送
    图像请求。传统的 Codex 基本 URL（例如 `https://chatgpt.com/backend-api`）会被规范化为
    `https://chatgpt.com/backend-api/codex`OpenClaw 用于图像请求。OpenClaw
    不会针对该请求自动静默回退到 `OPENAI_API_KEY`OpenAIAPI ——
    要强制直接使用 OpenAI Images API 路由，请使用 API 密钥、自定义基本 URL
    或 Azure 端点显式配置 `models.providers.openai`API。

    仍然可以显式选择 `openai/gpt-image-1.5`、`openai/gpt-image-1` 和
    `openai/gpt-image-1-mini` 模型。使用
    `gpt-image-1.5` 生成透明背景的 PNG/WebP 输出；当前的
    `gpt-image-2`API API 会拒绝 `background: "transparent"`。

    `gpt-image-2` 通过同一个 `image_generate`OpenClaw 工具支持文生图生成
    和参考图像编辑。
    OpenClaw 会将 `prompt`、`count`、`size`、`quality`、`outputFormat`OpenAIOpenAI
    和参考图像转发给 OpenAI。OpenAI 不会直接
    接收 `aspectRatio` 或 `resolution`OpenClaw；如果可能，OpenClaw 会将
    其映射到支持的 `size`OpenAI，否则该工具会将其报告为
    已忽略的覆盖参数。

    OpenAI 特定选项位于 `openai` 对象下：

    ```json
    {
      "quality": "low",
      "outputFormat": "jpeg",
      "openai": {
        "background": "opaque",
        "moderation": "low",
        "outputCompression": 60,
        "user": "end-user-42"
      }
    }
    ```

    `openai.background` 接受 `transparent`、`opaque` 或 `auto`；
    透明输出需要 `outputFormat` `png` 或 `webp`OpenAIOpenClaw 以及
    支持透明的 OpenAI 图像模型。OpenClaw 将默认的
    `gpt-image-2` 透明背景请求路由到 `gpt-image-1.5`。
    `openai.outputCompression` 适用于 JPEG/WebP 输出。

    顶层 `background`OpenAI 提示是提供商中立的，当选择
    OpenAI 提供商时，当前映射到相同的 OpenAI
    `background`OpenAI 请求字段。未声明背景支持的提供商
    会将其在 `ignoredOverrides`OpenAIOpenAI 中返回，而不是接收不支持的参数。

    要通过 Azure OpenAI 部署路由 OpenAI 图像生成
    而不是 `api.openai.com`OpenAI，请参阅
    [Azure OpenAI 端点](/zh/providers/openai#azure-openai-endpoints)。

  </Accordion>
  <Accordion title="OpenRouterOpenRouter 图像模型"OpenRouter>
    OpenRouter 图像生成使用相同的 `OPENROUTER_API_KEY`OpenRouter 并通过 OpenRouter 的聊天补全图像 APIOpenRouter 进行路由。使用 `openrouter/` 前缀选择 OpenRouter 图像模型：

    ```json5
    {
      agents: {
        defaults: {
          imageGenerationModel: {
            primary: "openrouter/google/gemini-3.1-flash-image-preview",
          },
        },
      },
    }
    ```OpenClaw

    OpenClaw 会将 `prompt`、`count`、参考图像以及 Gemini 兼容的 `aspectRatio` / `resolution`OpenRouterOpenRouter 提示转发给 OpenRouter。当前内置的 OpenRouter 图像模型快捷方式包括 `google/gemini-3.1-flash-image-preview`、`google/gemini-3-pro-image-preview` 和 `openai/gpt-5.4-image-2`。使用 `action: "list"` 查看您配置的插件所暴露的内容。

  </Accordion>
  <Accordion title="MiniMaxMiniMax 双重认证"MiniMaxMiniMax>
    MiniMax 图像生成可通过两种捆绑的 MiniMax 认证路径使用：

    - `minimax/image-01`API 用于 API 密钥设置
    - `minimax-portal/image-01`OAuth 用于 OAuth 设置

  </Accordion>
  <Accordion title="xAI grok-imagine-image">
    内置的 xAI 提供商对仅提示词请求使用 `/v1/images/generations`，当存在 `image` 或 `images` 时使用 `/v1/images/edits`。

    - 模型：`xai/grok-imagine-image`、`xai/grok-imagine-image-quality`
    - 数量：最多 4 个
    - 参考：一个 `image` 或最多五个 `images`
    - 纵横比：`1:1`、`16:9`、`9:16`、`4:3`、`3:4`、`2:3`、`3:2`
    - 分辨率：`1K`、`2K`
    - 输出：作为 OpenClaw 托管的图像附件返回

    OpenClaw 故意不公开 xAI 原生的 `quality`、`mask`、
    `user` 或额外的仅原生纵横比，直到这些控件存在于共享的跨提供商 `image_generate` 协定中。

  </Accordion>
</AccordionGroup>

## 示例

<Tabs>
  <Tab title="生成（4K 横屏）">
```text
/tool image_generate action=generate model=openai/gpt-image-2 prompt="A clean editorial poster for OpenClaw image generation" size=3840x2160 count=1
```
  </Tab>
  <Tab title="生成（透明 PNG）">
```text
/tool image_generate action=generate model=openai/gpt-image-1.5 prompt="A simple red circle sticker on a transparent background" outputFormat=png background=transparent
```

等效 CLI：

```bash
openclaw infer image generate \
  --model openai/gpt-image-1.5 \
  --output-format png \
  --background transparent \
  --prompt "A simple red circle sticker on a transparent background" \
  --json
```

  </Tab>
  <Tab title="生成（两张正方形）">
```text
/tool image_generate action=generate model=openai/gpt-image-2 prompt="Two visual directions for a calm productivity app icon" size=1024x1024 count=2
```
  </Tab>
  <Tab title="编辑（一个参考）">
```text
/tool image_generate action=generate model=openai/gpt-image-2 prompt="Keep the subject, replace the background with a bright studio setup" image=/path/to/reference.png size=1024x1536
```
  </Tab>
  <Tab title="编辑（多个参考）">
```text
/tool image_generate action=generate model=openai/gpt-image-2 prompt="Combine the character identity from the first image with the color palette from the second" images='["/path/to/character.png","/path/to/palette.jpg"]' size=1536x1024
```
  </Tab>
</Tabs>

`openclaw infer image edit` 上也提供相同的 `--output-format` 和 `--background` 标志；`--openai-background` 仍作为 OpenAI 特定的别名。除 OpenAI 以外的内置提供商目前不声明显式的背景控制，因此对于它们，`background: "transparent"` 被报告为已忽略。

## 相关

- [工具概述](/zh/tools) - 所有可用的代理工具
- [ComfyUI](/zh/providers/comfy) - 本地 ComfyUI 和 Comfy Cloud 工作流设置
- [fal](/zh/providers/fal) - fal 图像和视频提供商设置
- [Google (Gemini)](/zh/providers/google) - Gemini 图像提供商设置
- [MiniMax](/zh/providers/minimax) - MiniMax 图像提供商设置
- [OpenAI](OpenAI/en/providers/openaiOpenAI) - OpenAI 图像提供商设置
- [Vydra](/zh/providers/vydra) - Vydra 图像、视频和语音设置
- [xAI](/zh/providers/xai) - Grok 图像、视频、搜索、代码执行和 TTS 设置
- [配置参考](/zh/gateway/config-agents#agent-defaults) - `imageGenerationModel` 配置
- [模型](/zh/concepts/models) - 模型配置和故障转移
