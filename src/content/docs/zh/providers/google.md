---
title: "Google (Gemini)"
summary: "Google Gemini 设置（API 密钥、图像生成、媒体理解、网络搜索）"
read_when:
  - You want to use Google Gemini models with OpenClaw
  - You need the API key auth flow
---

# Google (Gemini)

Google 插件通过 Google AI Studio 提供对 Gemini 模型的访问，此外还提供图像生成、媒体理解（图像/音频/视频）以及通过 Gemini Grounding 进行的网络搜索。

- 提供商：`google`
- 认证：`GEMINI_API_KEY` 或 `GOOGLE_API_KEY`
- API: Google Gemini API

## 快速开始

1. 设置 API 密钥：

```bash
openclaw onboard --auth-choice gemini-api-key
```

2. 设置默认模型：

```json5
{
  agents: {
    defaults: {
      model: { primary: "google/gemini-3.1-pro-preview" },
    },
  },
}
```

## 非交互式示例

```bash
openclaw onboard --non-interactive \
  --mode local \
  --auth-choice gemini-api-key \
  --gemini-api-key "$GEMINI_API_KEY"
```

## 功能

| 功能                  | 支持              |
| --------------------- | ----------------- |
| 聊天补全              | 是                |
| 图像生成              | 是                |
| 音乐生成              | 是                |
| 图像理解              | 是                |
| 音频转录              | 是                |
| 视频理解              | 是                |
| 网络搜索（Grounding） | 是                |
| 思考/推理             | 是（Gemini 3.1+） |

## 直接 Gemini 缓存重用

对于直接的 Gemini API 调用（`api: "google-generative-ai"`），OpenClaw 现在
会将已配置的 `cachedContent` 句柄传递给 Gemini 请求。

- 使用
  `cachedContent` 或旧版 `cached_content` 配置每个模型或全局参数
- 如果两者都存在，`cachedContent` 优先
- 示例值：`cachedContents/prebuilt-context`
- Gemini 缓存命中使用情况已从
  上游 `cachedContentTokenCount` 归一化为 OpenClaw `cacheRead`

示例：

```json5
{
  agents: {
    defaults: {
      models: {
        "google/gemini-2.5-pro": {
          params: {
            cachedContent: "cachedContents/prebuilt-context",
          },
        },
      },
    },
  },
}
```

## 图像生成

内置的 `google` 图像生成提供商默认为
`google/gemini-3.1-flash-image-preview`。

- 还支持 `google/gemini-3-pro-image-preview`
- 生成：每次请求最多生成 4 张图像
- 编辑模式：已启用，最多 5 张输入图像
- 几何控制：`size`、`aspectRatio` 和 `resolution`

图像生成、媒体理解和 Gemini Grounding 均保留在
`google` 提供商 ID 上。

要将 Google 用作默认图像提供商：

```json5
{
  agents: {
    defaults: {
      imageGenerationModel: {
        primary: "google/gemini-3.1-flash-image-preview",
      },
    },
  },
}
```

有关共享工具参数、提供商选择和故障转移行为，请参阅 [图像生成](/en/tools/image-generation)。

## 视频生成

内置的 `google` 插件还通过共享的
`video_generate` 工具注册视频生成。

- 默认视频模型：`google/veo-3.1-fast-generate-preview`
- 模式：文本生成视频、图像生成视频和单视频参考流程
- 支持 `aspectRatio`、`resolution` 和 `audio`
- 当前时长限制：**4 到 8 秒**

要将 Google 用作默认视频提供商：

```json5
{
  agents: {
    defaults: {
      videoGenerationModel: {
        primary: "google/veo-3.1-fast-generate-preview",
      },
    },
  },
}
```

有关共享工具参数、提供商选择和故障转移行为，请参阅[视频生成](/en/tools/video-generation)。

## 音乐生成

捆绑的 `google` 插件还通过共享 `music_generate` 工具注册音乐生成。

- 默认音乐模型：`google/lyria-3-clip-preview`
- 还支持 `google/lyria-3-pro-preview`
- 提示控制：`lyrics` 和 `instrumental`
- 输出格式：默认为 `mp3`，加上 `wav`（在 `google/lyria-3-pro-preview` 上）
- 参考输入：最多 10 张图片
- 基于会话的运行通过共享任务/状态流分离，包括 `action: "status"`

要将 Google 用作默认音乐提供商：

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

有关共享工具参数、提供商选择和故障转移行为，请参阅[音乐生成](/en/tools/music-generation)。

## 环境说明

如果 Gateway(网关) 作为守护进程（launchd/systemd）运行，请确保 `GEMINI_API_KEY` 对该进程可用（例如，在 `~/.openclaw/.env` 中或通过 `env.shellEnv`）。
