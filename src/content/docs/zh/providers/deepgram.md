---
summary: "Deepgram入站语音备忘录转录"
read_when:
  - You want Deepgram speech-to-text for audio attachments
  - You want Deepgram streaming transcription for Voice Call
  - You need a quick Deepgram config example
title: "Deepgram"
---

# Deepgram（音频转录）

Deepgram 是一个语音转文本 API。在 OpenClaw 中，它用于通过 `tools.media.audio` 进行入站音频/语音备忘录转录，并通过 `plugins.entries.voice-call.config.streaming` 进行语音通话流式 STT。

对于批量转录，OpenClaw 将完整的音频文件上传到 Deepgram，并将转录内容注入到回复管道中（`{{Transcript}}` + `[Audio]` 块）。对于语音通话流式传输，OpenClaw 通过 Deepgram 的 WebSocket `listen` 端点转发实时 G.711 u-law 帧，并在 Deepgram 返回时发出部分或最终转录内容。

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
  <Step title="发送语音消息">
    通过任意已连接的渠道发送音频消息。OpenClaw 将通过 Deepgram 进行转录，并将转录内容注入到回复管道中。
  </Step>
</Steps>

## 配置选项

| 选项              | 路径                                                         | 描述                                 |
| ----------------- | ------------------------------------------------------------ | ------------------------------------ |
| `model`           | `tools.media.audio.models[].model`                           | Deepgram 模型 ID（默认值：`nova-3`） |
| `language`        | `tools.media.audio.models[].language`                        | 语言提示（可选）                     |
| `detect_language` | `tools.media.audio.providerOptions.deepgram.detect_language` | 启用语言检测（可选）                 |
| `punctuate`       | `tools.media.audio.providerOptions.deepgram.punctuate`       | 启用标点符号（可选）                 |
| `smart_format`    | `tools.media.audio.providerOptions.deepgram.smart_format`    | 启用智能格式化（可选）               |

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
  <Tab title="带 Deepgram 选项">
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

<Note>Voice Call 接收的电话音频为 8 kHz G.711 u-law。Deepgram 流式提供商默认为 `encoding: "mulaw"` 和 `sampleRate: 8000`，因此 可以直接转发 Twilio 媒体帧。</Note>

## 说明

<AccordionGroup>
  <Accordion title="认证">认证遵循标准提供商认证顺序。`DEEPGRAM_API_KEY` 是 最简单的路径。</Accordion>
  <Accordion title="Proxy and custom endpoints">使用代理时，使用 `tools.media.audio.baseUrl` 和 `tools.media.audio.headers` 覆盖终端节点或请求头。</Accordion>
  <Accordion title="Output behavior">输出遵循与其他提供商相同的音频规则（大小上限、超时、 转录注入）。</Accordion>
</AccordionGroup>

## 相关

<CardGroup cols={2}>
  <Card title="Media tools" href="/zh/tools/media-overview" icon="photo-film">
    音频、图像和视频处理流程概述。
  </Card>
  <Card title="配置" href="/zh/gateway/configuration" icon="gear">
    完整的配置参考，包括媒体工具设置。
  </Card>
  <Card title="故障排除" href="/zh/help/troubleshooting" icon="wrench">
    常见问题和调试步骤。
  </Card>
  <Card title="常见问题" href="/zh/help/faq" icon="circle-question">
    关于 OpenClaw 设置的常见问题。
  </Card>
</CardGroup>
