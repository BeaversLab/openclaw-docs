---
summary: "在 OpenClaw 中使用 Vydra 的图像、视频和语音功能"
read_when:
  - You want Vydra media generation in OpenClaw
  - You need Vydra API key setup guidance
title: "Vydra"
---

# Vydra

随附的 Vydra 插件增加了：

- 通过 `vydra/grok-imagine` 生成图像
- 通过 `vydra/veo3` 和 `vydra/kling` 生成视频
- 通过 Vydra 基于 ElevenLabs 的 TTS 路由进行语音合成

OpenClaw 对所有这三项功能使用相同的 `VYDRA_API_KEY`。

## 重要基础 URL

使用 `https://www.vydra.ai/api/v1`。

Vydra 的 apex 主机 (`https://vydra.ai/api/v1`) 目前重定向到 `www`。某些 HTTP 客户端在跨主机重定向时会丢弃 `Authorization`，这将导致有效的 API 密钥变成误导性的身份验证失败。捆绑插件直接使用 `www` 基础 URL 以避免该问题。

## 设置

交互式新手引导：

```bash
openclaw onboard --auth-choice vydra-api-key
```

或直接设置环境变量：

```bash
export VYDRA_API_KEY="vydra_live_..."
```

## 图像生成

默认图像模型：

- `vydra/grok-imagine`

将其设置为默认图像提供商：

```json5
{
  agents: {
    defaults: {
      imageGenerationModel: {
        primary: "vydra/grok-imagine",
      },
    },
  },
}
```

当前的随附支持仅限文本生成图像。Vydra 的托管编辑路由需要远程图像 URL，而 OpenClaw 尚未在随附插件中添加 Vydra 专用的上传桥接器。

有关共享工具行为，请参阅[图像生成](/en/tools/image-generation)。

## 视频生成

注册的视频模型：

- `vydra/veo3` 用于文本生成视频
- `vydra/kling` 用于图像生成视频

将 Vydra 设置为默认视频提供商：

```json5
{
  agents: {
    defaults: {
      videoGenerationModel: {
        primary: "vydra/veo3",
      },
    },
  },
}
```

注意：

- `vydra/veo3` 捆绑为仅文本生成视频。
- `vydra/kling` 目前需要远程图像 URL 引用。本地文件上传会被预先拒绝。
- Vydra 当前的 `kling` HTTP 路由在要求 `image_url` 还是 `video_url` 方面一直不一致；捆绑提供商将同一个远程图像 URL 映射到这两个字段中。
- 捆绑插件保持保守，不转发未记录的风格选项，例如纵横比、分辨率、水印或生成的音频。

特定于提供商的实时覆盖范围：

```bash
OPENCLAW_LIVE_TEST=1 \
OPENCLAW_LIVE_VYDRA_VIDEO=1 \
pnpm test:live -- extensions/vydra/vydra.live.test.ts
```

捆绑的 Vydra 实时文件目前涵盖：

- `vydra/veo3` 文本生成视频
- `vydra/kling` 使用远程图像 URL 进行图像生成视频

需要时覆盖远程图像固定装置：

```bash
export OPENCLAW_LIVE_VYDRA_KLING_IMAGE_URL="https://example.com/reference.png"
```

有关共享工具行为，请参阅[视频生成](/en/tools/video-generation)。

## 语音合成

将 Vydra 设置为语音提供商：

```json5
{
  messages: {
    tts: {
      provider: "vydra",
      providers: {
        vydra: {
          apiKey: "${VYDRA_API_KEY}",
          voiceId: "21m00Tcm4TlvDq8ikWAM",
        },
      },
    },
  },
}
```

默认值：

- 模型： `elevenlabs/tts`
- 语音 ID： `21m00Tcm4TlvDq8ikWAM`

捆绑插件目前提供一个已知的默认语音，并返回 MP3 音频文件。

## 相关

- [提供商目录](/en/providers/index)
- [图像生成](/en/tools/image-generation)
- [视频生成](/en/tools/video-generation)
