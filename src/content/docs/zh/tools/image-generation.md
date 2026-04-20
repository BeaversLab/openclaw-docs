---
summary: "使用配置的提供商（OpenAI、Google Gemini、fal、MiniMax、ComfyUI、Vydra）生成和编辑图像"
read_when:
  - Generating images via the agent
  - Configuring image generation providers and models
  - Understanding the image_generate tool parameters
title: "图像生成"
---

# 图像生成

`image_generate` 工具允许代理使用您配置的提供商创建和编辑图像。生成的图像会作为媒体附件自动在代理的回复中发送。

<Note>该工具仅在至少有一个图像生成提供商可用时才会出现。如果您在代理的工具中看不到 `image_generate`，请配置 `agents.defaults.imageGenerationModel` 或设置提供商 API 密钥。</Note>

## 快速开始

1. 为至少一个提供商设置 API 密钥（例如 `OPENAI_API_KEY` 或 `GEMINI_API_KEY`）。
2. （可选）设置您的首选模型：

```json5
{
  agents: {
    defaults: {
      imageGenerationModel: {
        primary: "openai/gpt-image-1",
      },
    },
  },
}
```

3. 向代理提问：_“生成一张友好的龙虾吉祥物图片。”_

代理会自动调用 `image_generate`。无需将工具加入允许列表 —— 当提供商可用时，它默认处于启用状态。

## 支持的提供商

| 提供商  | 默认模型                         | 编辑支持                     | API 密钥                                              |
| ------- | -------------------------------- | ---------------------------- | ----------------------------------------------------- |
| OpenAI  | `gpt-image-1`                    | 是（最多 5 张图像）          | `OPENAI_API_KEY`                                      |
| Google  | `gemini-3.1-flash-image-preview` | 是                           | `GEMINI_API_KEY` 或 `GOOGLE_API_KEY`                  |
| fal     | `fal-ai/flux/dev`                | 是                           | `FAL_KEY`                                             |
| MiniMax | `image-01`                       | 是（主体参考）               | `MINIMAX_API_KEY` 或 MiniMax OAuth (`minimax-portal`) |
| ComfyUI | `workflow`                       | 是（1 张图像，由工作流配置） | `COMFY_API_KEY` 或 `COMFY_CLOUD_API_KEY` 用于云端     |
| Vydra   | `grok-imagine`                   | 否                           | `VYDRA_API_KEY`                                       |

使用 `action: "list"` 在运行时检查可用的提供商和模型：

```
/tool image_generate action=list
```

## 工具参数

| 参数          | 类型       | 描述                                                                            |
| ------------- | ---------- | ------------------------------------------------------------------------------- |
| `prompt`      | 字符串     | 图像生成提示词（`action: "generate"` 必需）                                     |
| `action`      | 字符串     | `"generate"`（默认）或 `"list"` 以检查提供商                                    |
| `model`       | 字符串     | 提供商/模型覆盖，例如 `openai/gpt-image-1`                                      |
| `image`       | 字符串     | 用于编辑模式的单个参考图像路径或 URL                                            |
| `images`      | 字符串数组 | 用于编辑模式的多个参考图像（最多 5 个）                                         |
| `size`        | 字符串     | 尺寸提示：`1024x1024`、`1536x1024`、`1024x1536`、`1024x1792`、`1792x1024`       |
| `aspectRatio` | 字符串     | 长宽比：`1:1`、`2:3`、`3:2`、`3:4`、`4:3`、`4:5`、`5:4`、`9:16`、`16:9`、`21:9` |
| `resolution`  | 字符串     | 分辨率提示：`1K`、`2K` 或 `4K`                                                  |
| `count`       | 数字       | 要生成的图像数量（1–4）                                                         |
| `filename`    | 字符串     | 输出文件名提示                                                                  |

并非所有提供商都支持所有参数。当回退提供商支持邻近的几何选项而非请求的确切选项时，OpenClaw 会在提交前重新映射到最接近的受支持大小、纵横比或分辨率。真正不支持的覆盖仍会在工具结果中报告。

工具结果会报告已应用的设置。当 OpenClaw 在提供商回退期间重新映射几何形状时，返回的 `size`、`aspectRatio` 和 `resolution` 值反映了实际发送的内容，而 `details.normalization` 捕获了从请求到应用的转换。

## 配置

### 模型选择

```json5
{
  agents: {
    defaults: {
      imageGenerationModel: {
        primary: "openai/gpt-image-1",
        fallbacks: ["google/gemini-3.1-flash-image-preview", "fal/fal-ai/flux/dev"],
      },
    },
  },
}
```

### 提供商选择顺序

生成图像时，OpenClaw 按以下顺序尝试提供商：

1. 来自工具调用的 **`model` 参数**（如果智能体指定了一个）
2. 配置中的 **`imageGenerationModel.primary`**
3. 按顺序排列的 **`imageGenerationModel.fallbacks`**
4. **自动检测** — 仅使用支持身份验证的提供商默认值：
   - 首先是当前默认提供商
   - 按提供商 ID 顺序排列的其余已注册图像生成提供商

如果提供商失败（身份验证错误、速率限制等），将自动尝试下一个候选者。如果全部失败，错误信息将包含每次尝试的详细信息。

注意：

- 自动检测具有身份验证感知功能。只有当 OpenClaw 能够实际对该提供商进行身份验证时，该提供商的默认值才会进入候选列表。
- 默认情况下启用自动检测。如果您希望图像生成仅使用显式的 `model`、`primary` 和 `fallbacks` 条目，请设置 `agents.defaults.mediaGenerationAutoProviderFallback: false`。
- 使用 `action: "list"` 检查当前注册的提供商、其默认模型以及身份验证环境变量提示。

### 图像编辑

OpenAI、Google、fal、MiniMax 和 ComfyUI 支持编辑参考图像。传递参考图像路径或 URL：

```
"Generate a watercolor version of this photo" + image: "/path/to/photo.jpg"
```

OpenAI 和 Google 通过 `images` 参数支持最多 5 张参考图像。fal、MiniMax 和 ComfyUI 支持 1 张。

MiniMax 图像生成可通过捆绑的 MiniMax 身份验证路径获得：

- `minimax/image-01` 用于 API 密钥设置
- `minimax-portal/image-01` 用于 OAuth 设置

## 提供商能力

| 能力              | OpenAI              | Google              | fal             | MiniMax                  | ComfyUI                    | Vydra      |
| ----------------- | ------------------- | ------------------- | --------------- | ------------------------ | -------------------------- | ---------- |
| 生成              | 是（最多 4 张）     | 是（最多 4 张）     | 是（最多 4 张） | 是（最多 9 张）          | 是（由工作流定义的输出）   | 是（1 张） |
| 编辑/参考         | 是（最多 5 张图片） | 是（最多 5 张图片） | 是（1 张图片）  | 是（1 张图片，主体参考） | 是（1 张图片，工作流配置） | 否         |
| 尺寸控制          | 是                  | 是                  | 是              | 否                       | 否                         | 否         |
| 纵横比            | 否                  | 是                  | 是（仅生成）    | 是                       | 否                         | 否         |
| 分辨率 (1K/2K/4K) | 否                  | 是                  | 是              | 否                       | 否                         | 否         |

## 相关

- [工具概述](/zh/tools) — 所有可用的代理工具
- [fal](/zh/providers/fal) — fal 图片和视频提供商设置
- [ComfyUI](/zh/providers/comfy) — 本地 ComfyUI 和 Comfy Cloud 工作流设置
- [Google (Gemini)](/zh/providers/google) — Gemini 图片提供商设置
- [MiniMax](/zh/providers/minimax) — MiniMax 图片提供商设置
- [OpenAI](/zh/providers/openai) — OpenAI Images 提供商设置
- [Vydra](/zh/providers/vydra) — Vydra 图片、视频和语音设置
- [配置参考](/zh/gateway/configuration-reference#agent-defaults) — `imageGenerationModel` 配置
- [模型](/zh/concepts/models) — 模型配置和故障转移
