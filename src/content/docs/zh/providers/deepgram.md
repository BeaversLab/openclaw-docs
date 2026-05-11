---
summary: "Deepgram入站语音备忘录转录"
read_when:
  - You want Deepgram speech-to-text for audio attachments
  - You want Deepgram streaming transcription for Voice Call
  - You need a quick Deepgram config example
title: "Deepgram"
---

Deepgram 是一个语音转文本 API。在 OpenClaw 中，它用于通过 `tools.media.audio` 进行入站音频/语音笔记转录，以及通过 `plugins.entries.voice-call.config.streaming` 进行语音通话流式 STT。

对于批量转录，OpenClaw 会将完整的音频文件上传到 Deepgram，并将转录文本注入到回复管道中（`{{Transcript}}` +
`[Audio]` 块）。对于语音通话流式传输，OpenClaw 通过 Deepgram 的 WebSocket `listen` 端点转发实时 G.711 u-law 帧，并在 Deepgram 返回时发出部分或最终转录文本。

| 详情     | 值                                                         |
| -------- | ---------------------------------------------------------- |
| 网站     | [deepgram.com](https://deepgram.com)                       |
| 文档     | [developers.deepgram.com](https://developers.deepgram.com) |
| 认证     | `DEEPGRAM_API_KEY`                                         |
| 默认模型 | `nova-3`                                                   |

## 入门指南

<Steps>
  <Step title="设置您的 API 密钥">
    将您的 Deepgram API 密钥添加到环境中：

    ```
    DEEPGRAM_API_KEY=dg_...
    ```

  </Step>
  <Step title="启用音频提供商">
    ```json5
    {
      tools: {
        media: {
          audio: {
            enabled: true,
            models: [{ provider: "deepgram", model: "nova-3" }],
          },
        },
      },
    }
    ```
  </Step>
  <Step title="发送语音笔记">
    通过任何连接的渠道发送音频消息。OpenClaw 会通过 Deepgram 将其转录，并将转录文本注入到回复管道中。
  </Step>
</Steps>

## 配置选项

| 选项              | 路径                                                         | 描述                               |
| ----------------- | ------------------------------------------------------------ | ---------------------------------- |
| `model`           | `tools.media.audio.models[].model`                           | Deepgram 模型 ID（默认：`nova-3`） |
| `language`        | `tools.media.audio.models[].language`                        | 语言提示（可选）                   |
| `detect_language` | `tools.media.audio.providerOptions.deepgram.detect_language` | 启用语言检测（可选）               |
| `punctuate`       | `tools.media.audio.providerOptions.deepgram.punctuate`       | 启用标点符号（可选）               |
| `smart_format`    | `tools.media.audio.providerOptions.deepgram.smart_format`    | 启用智能格式（可选）               |

<Tabs>
  <Tab title="带语言提示">
    ```json5
    {
      tools: {
        media: {
          audio: {
            enabled: true,
            models: [{ provider: "deepgram", model: "nova-3", language: "en" }],
          },
        },
      },
    }
    ```
  </Tab>
  <Tab title="使用 Deepgram 选项">
    ```json5
    {
      tools: {
        media: {
          audio: {
            enabled: true,
            providerOptions: {
              deepgram: {
                detect_language: true,
                punctuate: true,
                smart_format: true,
              },
            },
            models: [{ provider: "deepgram", model: "nova-3" }],
          },
        },
      },
    }
    ```
  </Tab>
</Tabs>

## 语音通话流式 STT

捆绑的 `deepgram` 插件还为语音通话插件注册了一个实时转录提供商。

| 设置     | 配置路径                                                                | 默认值                    |
| -------- | ----------------------------------------------------------------------- | ------------------------- |
| API 密钥 | `plugins.entries.voice-call.config.streaming.providers.deepgram.apiKey` | 回退到 `DEEPGRAM_API_KEY` |
| 模型     | `...deepgram.model`                                                     | `nova-3`                  |
| 语言     | `...deepgram.language`                                                  | (未设置)                  |
| 编码     | `...deepgram.encoding`                                                  | `mulaw`                   |
| 采样率   | `...deepgram.sampleRate`                                                | `8000`                    |
| 端点检测 | `...deepgram.endpointingMs`                                             | `800`                     |
| 临时结果 | `...deepgram.interimResults`                                            | `true`                    |

```json5
{
  plugins: {
    entries: {
      "voice-call": {
        config: {
          streaming: {
            enabled: true,
            provider: "deepgram",
            providers: {
              deepgram: {
                apiKey: "${DEEPGRAM_API_KEY}",
                model: "nova-3",
                endpointingMs: 800,
                language: "en-US",
              },
            },
          },
        },
      },
    },
  },
}
```

<Note>语音通话以 8 kHz G.711 u-law 格式接收电话音频。Deepgram 流式提供商默认为 `encoding: "mulaw"` 和 `sampleRate: 8000`，因此 Twilio 媒体帧可以直接转发。</Note>

## 注意事项

<AccordionGroup>
  <Accordion title="身份验证">身份验证遵循标准提供商身份验证顺序。`DEEPGRAM_API_KEY` 是 最简单的路径。</Accordion>
  <Accordion title="代理和自定义端点">使用代理时，可以通过 `tools.media.audio.baseUrl` 和 `tools.media.audio.headers` 覆盖端点或标头。</Accordion>
  <Accordion title="输出行为">输出遵循与其他提供商相同的音频规则（大小上限、超时、 转录注入）。</Accordion>
</AccordionGroup>

## 相关

<CardGroup cols={2}>
  <Card title="媒体工具" href="/zh/tools/media-overview" icon="photo-film">
    音频、图像和视频处理管道概述。
  </Card>
  <Card title="配置" href="/zh/gateway/configuration" icon="gear">
    包括媒体工具设置的完整配置参考。
  </Card>
  <Card title="故障排除" href="/zh/help/troubleshooting" icon="wrench">
    常见问题和调试步骤。
  </Card>
  <Card title="常见问题" href="/zh/help/faq" icon="circle-question">
    关于 OpenClaw 设置的常见问题。
  </Card>
</CardGroup>
