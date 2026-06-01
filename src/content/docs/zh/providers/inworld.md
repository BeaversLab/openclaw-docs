---
summary: "用于 OpenClaw 回复的 Inworld 流式文本转语音"
read_when:
  - You want Inworld speech synthesis for outbound replies
  - You need PCM telephony or OGG_OPUS voice-note output from Inworld
title: "Inworld"
---

Inworld 是一个流式文本转语音 (TTS) 提供商。在 OpenClaw 中，它合成出站回复音频（默认为 MP3，语音笔记为 OGG_OPUS）以及用于电话渠道（如 Voice Call）的 PCM 音频。

OpenClaw 向 Inworld 的流式 TTS 端点发送请求，将返回的 base64 音频块连接到单个缓冲区中，并将结果交给标准回复音频管道。

| 属性         | 值                                                         |
| ------------ | ---------------------------------------------------------- |
| 提供商 ID    | `inworld`                                                  |
| 插件         | 内置, `enabledByDefault: true`                             |
| 合约         | `speechProviders` (仅 TTS)                                 |
| 认证环境变量 | `INWORLD_API_KEY` (HTTP Basic, Base64 仪表板凭证)          |
| 基础 URL     | `https://api.inworld.ai`                                   |
| 默认语音     | `Sarah`                                                    |
| 默认模型     | `inworld-tts-1.5-max`                                      |
| 输出         | MP3（默认）、OGG_OPUS（语音备注）、PCM 22050 Hz（电话）    |
| 网站         | [inworld.ai](https://inworld.ai)                           |
| 文档         | [docs.inworld.ai/tts/tts](https://docs.inworld.ai/tts/tts) |

## 入门指南

<Steps>
  <Step title="设置您的 API 密钥">
    从您的 Inworld 仪表板复制凭证（工作区 > API 密钥）
    并将其设置为环境变量。该值将原样作为 HTTP Basic
    凭证发送，因此请勿再次对其进行 Base64 编码或将其转换为不记名
    令牌。

    ```
    INWORLD_API_KEY=<base64-credential-from-dashboard>
    ```

  </Step>
  <Step title="Select Inworld in messages.tts">
    ```json5
    {
      messages: {
        tts: {
          auto: "always",
          provider: "inworld",
          providers: {
            inworld: {
              speakerVoiceId: "Sarah",
              modelId: "inworld-tts-1.5-max",
            },
          },
        },
      },
    }
    ```
  </Step>
  <Step title="发送消息">
    通过任何连接的渠道发送回复。OpenClaw 使用 Inworld
    合成音频并将其作为 MP3（或当渠道期望语音备注时作为 OGG_OPUS）
    传送。
  </Step>
</Steps>

## 配置选项

| 选项             | 路径                                            | 描述                                                         |
| ---------------- | ----------------------------------------------- | ------------------------------------------------------------ |
| `apiKey`         | `messages.tts.providers.inworld.apiKey`         | Base64 仪表板凭证。回退至 `INWORLD_API_KEY`。                |
| `baseUrl`        | `messages.tts.providers.inworld.baseUrl`        | 覆盖 Inworld API 基础 URL（默认 `https://api.inworld.ai`）。 |
| `speakerVoiceId` | `messages.tts.providers.inworld.speakerVoiceId` | 语音标识符（默认 `Sarah`）。                                 |
| `modelId`        | `messages.tts.providers.inworld.modelId`        | TTS 模型 ID（默认 `inworld-tts-1.5-max`）。                  |
| `temperature`    | `messages.tts.providers.inworld.temperature`    | 采样温度 `0..2`（可选）。                                    |

## 注意

<AccordionGroup>
  <Accordion title="身份验证">
    Inworld 使用 HTTP Basic 认证，包含一个 Base64 编码的凭证
    字符串。请从 Inworld 仪表板逐字复制。该提供商将其作为
    `Authorization: Basic <apiKey>` 发送，无需进一步编码，因此
    请勿自行进行 Base64 编码，也请勿传递 bearer 类型的令牌。
    请参阅 [TTS auth notes](/zh/tools/tts#inworld-primary) 了解相同的说明。
  </Accordion>
  <Accordion title="模型">
    支持的模型 ID：`inworld-tts-1.5-max`（默认）、
    `inworld-tts-1.5-mini`、`inworld-tts-1-max`、`inworld-tts-1`。
  </Accordion>
  <Accordion title="音频输出">
    回复默认使用 MP3。当渠道目标为 `voice-note`
    时，OpenClaw 会请求 Inworld 提供 `OGG_OPUS`，以便音频作为原生
    语音气泡播放。电话合成使用 22050 Hz 的原始 `PCM` 来馈送
    电话网桥。
  </Accordion>
  <Accordion title="自定义端点">
    使用 `messages.tts.providers.inworld.baseUrl` 覆盖 API 主机。
    在发送请求之前会去除末尾斜杠。
  </Accordion>
</AccordionGroup>

## 相关

<CardGroup cols={2}>
  <Card title="文本转语音" href="/zh/tools/tts" icon="waveform-lines">
    TTS 概述、提供商和 `messages.tts` 配置。
  </Card>
  <Card title="配置" href="/zh/gateway/configuration" icon="gear">
    完整配置参考，包括 `messages.tts` 设置。
  </Card>
  <Card title="提供商" href="/zh/providers" icon="grid">
    所有捆绑的 OpenClaw 提供商。
  </Card>
  <Card title="故障排除" href="/zh/help/troubleshooting" icon="wrench">
    常见问题和调试步骤。
  </Card>
</CardGroup>
