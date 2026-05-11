---
summary: "在 OpenClaw 中使用 Vydra 的图像、视频和语音功能"
read_when:
  - You want Vydra media generation in OpenClaw
  - You need Vydra API key setup guidance
title: "Vydra"
---

内置的 Vydra 插件添加了：

- 通过 `vydra/grok-imagine` 进行图像生成
- 通过 `vydra/veo3` 和 `vydra/kling` 进行视频生成
- 通过 Vydra 的 ElevenLabs 支持的 TTS 路由进行语音合成

OpenClaw 对所有这三项功能使用相同的 `VYDRA_API_KEY`。

<Warning>
使用 `https://www.vydra.ai/api/v1` 作为基础 URL。

Vydra 的 apex 主机 (`https://vydra.ai/api/v1`) 目前重定向到 `www`。一些 HTTP 客户端会在该跨主机重定向时丢弃 `Authorization`，这会将有效的 API 密钥变成误导性的身份验证失败。内置插件直接使用 `www` 基础 URL 来避免这种情况。

</Warning>

## 设置

<Steps>
  <Step title="运行交互式新手引导">
    ```bash
    openclaw onboard --auth-choice vydra-api-key
    ```

    或直接设置环境变量：

    ```bash
    export VYDRA_API_KEY="vydra_live_..."
    ```

  </Step>
  <Step title="选择默认功能">
    从以下功能（图像、视频或语音）中选择一个或多个，并应用匹配的配置。
  </Step>
</Steps>

## 功能

<AccordionGroup>
  <Accordion title="图像生成">
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

    当前内置支持仅限文生图。Vydra 的托管编辑路由需要远程图像 URL，而 OpenClaw 尚未在内置插件中添加 Vydra 专用的上传桥。

    <Note>
    有关共享工具参数、提供商选择和故障转移行为，请参阅[图像生成](/zh/tools/image-generation)。
    </Note>

  </Accordion>

  <Accordion title="视频生成">
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

    - `vydra/veo3` 仅作为文本生成视频模型捆绑。
    - `vydra/kling` 目前需要远程图像 URL 引用。本地文件上传会被预先拒绝。
    - Vydra 当前的 `kling` HTTP 路由在需要 `image_url` 还是 `video_url` 方面表现不一致；捆绑的提供商将相同的远程图像 URL 映射到这两个字段中。
    - 捆绑的插件保持保守，不转发未记录的风格控件，如宽高比、分辨率、水印或生成的音频。

    <Note>
    请参阅 [视频生成](/zh/tools/video-generation) 了解共享工具参数、提供商选择和故障转移行为。
    </Note>

  </Accordion>

  <Accordion title="视频实时测试">
    特定于提供商的实时覆盖：

    ```bash
    OPENCLAW_LIVE_TEST=1 \
    OPENCLAW_LIVE_VYDRA_VIDEO=1 \
    pnpm test:live -- extensions/vydra/vydra.live.test.ts
    ```

    捆绑的 Vydra 实时文件现在覆盖：

    - `vydra/veo3` 文本生成视频
    - `vydra/kling` 使用远程图像 URL 进行图像生成视频

    需要时覆盖远程图像装置：

    ```bash
    export OPENCLAW_LIVE_VYDRA_KLING_IMAGE_URL="https://example.com/reference.png"
    ```

  </Accordion>

  <Accordion title="语音合成">
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

    - 模型：`elevenlabs/tts`
    - 语音 ID：`21m00Tcm4TlvDq8ikWAM`

    捆绑的插件目前公开了一个已知良好的默认语音，并返回 MP3 音频文件。

  </Accordion>
</AccordionGroup>

## 相关

<CardGroup cols={2}>
  <Card title="提供商目录" href="/zh/providers/index" icon="list">
    浏览所有可用的提供商。
  </Card>
  <Card title="图像生成" href="/zh/tools/image-generation" icon="image">
    共享的图像工具参数和提供商选择。
  </Card>
  <Card title="视频生成" href="/zh/tools/video-generation" icon="video">
    共享的视频工具参数和提供商选择。
  </Card>
  <Card title="配置参考" href="/zh/gateway/config-agents#agent-defaults" icon="gear">
    代理默认值和模型配置。
  </Card>
</CardGroup>
