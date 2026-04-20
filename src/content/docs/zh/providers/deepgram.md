---
summary: "入站语音备注的 Deepgram 转录"
read_when:
  - You want Deepgram speech-to-text for audio attachments
  - You need a quick Deepgram config example
title: "Deepgram"
---

# Deepgram（音频转录）

Deepgram 是一个语音转文本 API。在 OpenClaw 中，它通过 `tools.media.audio` 用于 **传入音频/语音备忘录转录**。

启用后，OpenClaw 会将音频文件上传到 Deepgram，并将转录内容注入到回复管道中（`{{Transcript}}` + `[Audio]` 块）。这 **不是流式传输**；它使用的是预录制转录端点。

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
  <Step title="发送语音备忘录">
    通过任何已连接的渠道发送音频消息。OpenClaw 会通过 Deepgram 对其进行转录，并将转录内容注入到回复管道中。
  </Step>
</Steps>

## 配置选项

| 选项              | 路径                                                         | 描述                               |
| ----------------- | ------------------------------------------------------------ | ---------------------------------- |
| `model`           | `tools.media.audio.models[].model`                           | Deepgram 模型 ID（默认：`nova-3`） |
| `language`        | `tools.media.audio.models[].language`                        | 语言提示（可选）                   |
| `detect_language` | `tools.media.audio.providerOptions.deepgram.detect_language` | 启用语言检测（可选）               |
| `punctuate`       | `tools.media.audio.providerOptions.deepgram.punctuate`       | 启用标点符号（可选）               |
| `smart_format`    | `tools.media.audio.providerOptions.deepgram.smart_format`    | 启用智能格式化（可选）             |

<Tabs>
  <Tab title="With language hint">
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
  <Tab title="With Deepgram options">
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

## 备注

<AccordionGroup>
  <Accordion title="认证">认证遵循标准提供商认证顺序。`DEEPGRAM_API_KEY` 是最简单的方式。</Accordion>
  <Accordion title="代理和自定义端点">使用代理时，可以使用 `tools.media.audio.baseUrl` 和 `tools.media.audio.headers` 覆盖端点或标头。</Accordion>
  <Accordion title="Output behavior">输出遵循与其他提供商相同的音频规则（大小限制、超时、 转录注入）。</Accordion>
</AccordionGroup>

<Note>Deepgram 转录**仅限预录制音频**（非实时流式传输）。OpenClaw 会上传完整的音频文件并等待完整转录，然后再将其注入 对话中。</Note>

## 相关

<CardGroup cols={2}>
  <Card title="Media tools" href="/zh/tools/media" icon="photo-film">
    音频、图像和视频处理管道概述。
  </Card>
  <Card title="Configuration" href="/zh/configuration" icon="gear">
    完整的配置参考，包括媒体工具设置。
  </Card>
  <Card title="Troubleshooting" href="/zh/help/troubleshooting" icon="wrench">
    常见问题和调试步骤。
  </Card>
  <Card title="常见问题" href="/zh/help/faq" icon="circle-question">
    关于 OpenClaw 设置的常见问题。
  </Card>
</CardGroup>
