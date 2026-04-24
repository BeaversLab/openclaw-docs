---
summary: "使用配置的提供商（OpenAI、Google Gemini、fal、MiniMax、ComfyUI、Vydra、xAI）生成和编辑图像"
read_when:
  - Generating images via the agent
  - Configuring image generation providers and models
  - Understanding the image_generate tool parameters
title: "图像生成"
---

# 图像生成

`image_generate` 工具允许代理使用您配置的提供商创建和编辑图像。生成的图像会作为媒体附件自动包含在代理的回复中。

<Note>该工具仅在至少有一个图像生成提供商可用时才会出现。如果您在代理的工具中看不到 `image_generate`，请配置 `agents.defaults.imageGenerationModel` 或设置提供商 API 密钥。</Note>

## 快速开始

1. 为至少一个提供商设置 API 密钥（例如 `OPENAI_API_KEY` 或 `GEMINI_API_KEY`）。
2. （可选）设置您的首选模型：

```json5
{
  agents: {
    defaults: {
      imageGenerationModel: {
        primary: "openai/gpt-image-2",
      },
    },
  },
}
```

3. 向代理提问：_“生成一张友好的龙虾吉祥物图片。”_

代理会自动调用 `image_generate`。无需工具白名单 — 当提供商可用时，默认已启用。

## 支持的提供商

| 提供商  | 默认模型                         | 编辑支持                     | API 密钥                                              |
| ------- | -------------------------------- | ---------------------------- | ----------------------------------------------------- |
| OpenAI  | `gpt-image-2`                    | 是（最多 5 张图像）          | `OPENAI_API_KEY`                                      |
| Google  | `gemini-3.1-flash-image-preview` | 是                           | `GEMINI_API_KEY` 或 `GOOGLE_API_KEY`                  |
| fal     | `fal-ai/flux/dev`                | 是                           | `FAL_KEY`                                             |
| MiniMax | `image-01`                       | 是（主体参考）               | `MINIMAX_API_KEY` 或 MiniMax OAuth (`minimax-portal`) |
| ComfyUI | `workflow`                       | 是（1 张图像，由工作流配置） | `COMFY_API_KEY` 或 `COMFY_CLOUD_API_KEY` 用于云端     |
| Vydra   | `grok-imagine`                   | 否                           | `VYDRA_API_KEY`                                       |
| xAI     | `grok-imagine-image`             | 是（最多 5 张图片）          | `XAI_API_KEY`                                         |

使用 `action: "list"` 在运行时检查可用的提供商和模型：

```
/tool image_generate action=list
```

## 工具参数

| 参数          | 类型     | 描述                                                                            |
| ------------- | -------- | ------------------------------------------------------------------------------- |
| `prompt`      | string   | 图像生成提示词（`action: "generate"` 必需）                                     |
| `action`      | string   | `"generate"`（默认）或 `"list"` 以检查提供商                                    |
| `model`       | string   | 提供商/模型覆盖，例如 `openai/gpt-image-2`                                      |
| `image`       | string   | 编辑模式下的单个参考图像路径或 URL                                              |
| `images`      | string[] | 编辑模式下的多个参考图像（最多 5 个）                                           |
| `size`        | string   | 尺寸提示：`1024x1024`、`1536x1024`、`1024x1536`、`2048x2048`、`3840x2160`       |
| `aspectRatio` | string   | 宽高比：`1:1`、`2:3`、`3:2`、`3:4`、`4:3`、`4:5`、`5:4`、`9:16`、`16:9`、`21:9` |
| `resolution`  | 字符串   | 分辨率提示：`1K`、`2K` 或 `4K`                                                  |
| `count`       | 数字     | 要生成的图像数量（1–4）                                                         |
| `filename`    | 字符串   | 输出文件名提示                                                                  |

并非所有提供商都支持所有参数。当备用提供商支持接近的几何选项而不是精确请求的选项时，OpenClaw 会在提交前重新映射到最接近的支持尺寸、长宽比或分辨率。真正不支持的覆盖仍会在工具结果中报告。

工具结果会报告应用的设置。当 OpenClaw 在提供商备用期间重新映射几何形状时，返回的 `size`、`aspectRatio` 和 `resolution` 值反映了实际发送的内容，而 `details.normalization` 捕获了从请求到应用的转换。

## 配置

### 模型选择

```json5
{
  agents: {
    defaults: {
      imageGenerationModel: {
        primary: "openai/gpt-image-2",
        fallbacks: ["google/gemini-3.1-flash-image-preview", "fal/fal-ai/flux/dev"],
      },
    },
  },
}
```

### 提供商选择顺序

生成图像时，OpenClaw 按以下顺序尝试提供商：

1. 工具调用中的 **`model` 参数**（如果代理指定了一个）
2. 配置中的 **`imageGenerationModel.primary`**
3. 按顺序排列的 **`imageGenerationModel.fallbacks`**
4. **自动检测** — 仅使用支持身份验证的提供商默认设置：
   - 首先使用当前默认提供商
   - 然后按提供商 ID 的顺序使用剩余的已注册图像生成提供商

如果提供商失败（身份验证错误、速率限制等），系统会自动尝试下一个候选提供商。如果全部失败，错误信息将包含每次尝试的详细信息。

注意事项：

- 自动检测支持身份验证。仅当 OpenClaw 实际上可以对该提供商进行身份验证时，该提供商的默认设置才会进入候选列表。
- 默认情况下启用自动检测。如果您希望图像生成仅使用显式的 `model`、`primary` 和 `fallbacks` 条目，请设置 `agents.defaults.mediaGenerationAutoProviderFallback: false`。
- 使用 `action: "list"` 检查当前注册的提供商、它们的默认模型以及身份验证环境变量提示。

### 图像编辑

OpenAI、Google、fal、MiniMax、ComfyUI 和 xAI 支持编辑参考图像。传入参考图像路径或 URL：

```
"Generate a watercolor version of this photo" + image: "/path/to/photo.jpg"
```

OpenAI、Google 和 xAI 通过 `images` 参数支持最多 5 张参考图像。fal、MiniMax 和 ComfyUI 支持 1 张。

### OpenAI `gpt-image-2`

OpenAI 图像生成默认为 `openai/gpt-image-2`。较旧的
`openai/gpt-image-1` 模型仍然可以被显式选择，但新的 OpenAI
图像生成和图像编辑请求应该使用 `gpt-image-2`。

`gpt-image-2` 支持通过同一个 `image_generate` 工具进行文生图和参考图编辑。OpenClaw 将 `prompt`、`count`、`size` 和参考图转发给 OpenAI。OpenAI 不会直接接收 `aspectRatio` 或 `resolution`；在可能的情况下，OpenClaw 会将其映射为支持的 `size`，否则工具会将其报告为被忽略的覆盖参数。

生成一张 4K 横向图片：

```
/tool image_generate action=generate model=openai/gpt-image-2 prompt="A clean editorial poster for OpenClaw image generation" size=3840x2160 count=1
```

生成两张方形图片：

```
/tool image_generate action=generate model=openai/gpt-image-2 prompt="Two visual directions for a calm productivity app icon" size=1024x1024 count=2
```

编辑一张本地参考图片：

```
/tool image_generate action=generate model=openai/gpt-image-2 prompt="Keep the subject, replace the background with a bright studio setup" image=/path/to/reference.png size=1024x1536
```

使用多张参考图片进行编辑：

```
/tool image_generate action=generate model=openai/gpt-image-2 prompt="Combine the character identity from the first image with the color palette from the second" images='["/path/to/character.png","/path/to/palette.jpg"]' size=1536x1024
```

MiniMax 图像生成可通过两种捆绑的 MiniMax 身份验证路径使用：

- `minimax/image-01` 用于 API 密钥设置
- `minimax-portal/image-01` 用于 OAuth 设置

## 提供商功能

| 功能               | OpenAI              | Google              | fal             | MiniMax                  | ComfyUI                      | Vydra      | xAI                 |
| ------------------ | ------------------- | ------------------- | --------------- | ------------------------ | ---------------------------- | ---------- | ------------------- |
| 生成               | 是（最多 4 张）     | 是（最多 4 张）     | 是（最多 4 张） | 是（最多 9 张）          | 是（由工作流定义的输出）     | 是（1 张） | 是（最多 4 张）     |
| 编辑/参考          | 是（最多 5 张图片） | 是（最多 5 张图片） | 是（1 张图片）  | 是（1 张图片，主体参考） | 是（1 张图片，由工作流配置） | 否         | 是（最多 5 张图片） |
| 尺寸控制           | 是（最高 4K）       | 是                  | 是              | 否                       | 否                           | 否         | 否                  |
| 纵横比             | 否                  | 是                  | 是（仅生成）    | 是                       | 否                           | 否         | 是                  |
| 分辨率（1K/2K/4K） | 否                  | 是                  | 是              | 否                       | 否                           | 否         | 是（1K/2K）         |

### xAI `grok-imagine-image`

内置的 xAI 提供商对仅包含提示词的请求使用 `/v1/images/generations`，
当存在 `image` 或 `images` 时使用 `/v1/images/edits`。

- 模型：`xai/grok-imagine-image`、`xai/grok-imagine-image-pro`
- 数量：最多 4 张
- 参考：一个 `image` 或最多五个 `images`
- 宽高比：`1:1`，`16:9`，`9:16`，`4:3`，`3:4`，`2:3`，`3:2`
- 分辨率：`1K`，`2K`
- 输出：作为 OpenClaw 托管的图像附件返回

OpenClaw 故意不暴露 xAI 原生的 `quality`、`mask`、`user` 或额外的仅原生宽高比，直到这些控件存在于共享的跨提供商 `image_generate` 契约中。

## 相关

- [工具概述](/zh/tools) — 所有可用的代理工具
- [fal](/zh/providers/fal) — fal 图像和视频提供商设置
- [ComfyUI](/zh/providers/comfy) — 本地 ComfyUI 和 Comfy Cloud 工作流设置
- [Google (Gemini)](/zh/providers/google) — Gemini 图像提供商设置
- [MiniMax](/zh/providers/minimax) — MiniMax 图像提供商设置
- [OpenAI](/zh/providers/openai) — OpenAI Images 提供商设置
- [Vydra](/zh/providers/vydra) — Vydra 图像、视频和语音设置
- [xAI](/zh/providers/xai) — Grok 图像、视频、搜索、代码执行和 TTS 设置
- [Configuration Reference](/zh/gateway/configuration-reference#agent-defaults) — `imageGenerationModel` 配置
- [Models](/zh/concepts/models) — 模型配置和故障转移
