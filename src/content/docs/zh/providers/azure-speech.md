---
summary: "适用于 OpenClaw 回复的 Azure AI 语音转文字"
read_when:
  - You want Azure Speech synthesis for outbound replies
  - You need native Ogg Opus voice-note output from Azure Speech
title: "Azure Speech"
---

Azure Speech 是一个 Azure AI 语音转文字提供商。在 OpenClaw 中，它默认将出站回复音频合成为 MP3，为语音笔记合成为原生 Ogg/Opus，并为语音通话等电话渠道合成 8 kHz mulaw 音频。

OpenClaw 直接使用 Azure Speech REST API，并通过 SSML 发送提供商拥有的输出格式，通过 `X-Microsoft-OutputFormat`。

| 详细信息         | 值                                                                                                       |
| ---------------- | -------------------------------------------------------------------------------------------------------- |
| 网站             | [Azure AI 语音](https://azure.microsoft.com/products/ai-services/ai-speech)                              |
| 文档             | [语音 REST 文字转语音](https://learn.microsoft.com/azure/ai-services/speech-service/rest-text-to-speech) |
| 身份验证         | `AZURE_SPEECH_KEY` 加上 `AZURE_SPEECH_REGION`                                                            |
| 默认语音         | `en-US-JennyNeural`                                                                                      |
| 默认文件输出     | `audio-24khz-48kbitrate-mono-mp3`                                                                        |
| 默认语音备注文件 | `ogg-24khz-16bit-mono-opus`                                                                              |

## 入门指南

<Steps>
  <Step title="创建 Azure Speech 资源">
    在 Azure 门户中，创建一个 Speech 资源。从
    Resource Management > Keys and Endpoint 复制 **KEY 1**，并复制资源位置
    例如 `eastus`。

    ```
    AZURE_SPEECH_KEY=<speech-resource-key>
    AZURE_SPEECH_REGION=eastus
    ```

  </Step>
  <Step title="在 messages.tts 中选择 Azure Speech">
    ```json5
    {
      messages: {
        tts: {
          auto: "always",
          provider: "azure-speech",
          providers: {
            "azure-speech": {
              voice: "en-US-JennyNeural",
              lang: "en-US",
            },
          },
        },
      },
    }
    ```
  </Step>
  <Step title="发送消息">
    通过任何连接的渠道发送回复。OpenClaw 使用 Azure Speech 合成音频
    并为标准音频交付 MP3，或者当
    渠道期望语音备注时交付 Ogg/Opus。
  </Step>
</Steps>

## 配置选项

| 选项                    | 路径                                                        | 描述                                                                                       |
| ----------------------- | ----------------------------------------------------------- | ------------------------------------------------------------------------------------------ |
| `apiKey`                | `messages.tts.providers.azure-speech.apiKey`                | Azure Speech 资源密钥。回退到 `AZURE_SPEECH_KEY`、`AZURE_SPEECH_API_KEY` 或 `SPEECH_KEY`。 |
| `region`                | `messages.tts.providers.azure-speech.region`                | Azure Speech 资源区域。回退到 `AZURE_SPEECH_REGION` 或 `SPEECH_REGION`。                   |
| `endpoint`              | `messages.tts.providers.azure-speech.endpoint`              | 可选的 Azure Speech 终结点/基本 URL 覆盖。                                                 |
| `baseUrl`               | `messages.tts.providers.azure-speech.baseUrl`               | 可选的 Azure Speech 基础 URL 覆盖。                                                        |
| `voice`                 | `messages.tts.providers.azure-speech.voice`                 | Azure 语音 ShortName（默认 `en-US-JennyNeural`）。                                         |
| `lang`                  | `messages.tts.providers.azure-speech.lang`                  | SSML 语言代码（默认 `en-US`）。                                                            |
| `outputFormat`          | `messages.tts.providers.azure-speech.outputFormat`          | 音频文件输出格式（默认 `audio-24khz-48kbitrate-mono-mp3`）。                               |
| `voiceNoteOutputFormat` | `messages.tts.providers.azure-speech.voiceNoteOutputFormat` | 语音笔记输出格式（默认 `ogg-24khz-16bit-mono-opus`）。                                     |

## 备注

<AccordionGroup>
  <Accordion title="Authentication">
    Azure Speech 使用语音资源密钥，而不是 Azure OpenAI 密钥。该密钥
    作为 `Ocp-Apim-Subscription-Key` 发送；OpenClaw 会从
    `region` 推导 `https://<region>.tts.speech.microsoft.com`，除非您
    提供 `endpoint` 或 `baseUrl`。
  </Accordion>
  <Accordion title="Voice names">
    使用 Azure Speech 语音的 `ShortName` 值，例如
    `en-US-JennyNeural`。捆绑的提供商可以通过同一语音资源列出语音，并过滤掉标记为已弃用或已停用的语音。
  </Accordion>
  <Accordion title="Audio outputs">
    Azure 接受 `audio-24khz-48kbitrate-mono-mp3`、
    `ogg-24khz-16bit-mono-opus` 和 `riff-24khz-16bit-mono-pcm` 等输出格式。OpenClaw
    请求 `voice-note` 目标使用 Ogg/Opus，以便频道可以发送原生语音气泡而无需额外的 MP3 转换。
  </Accordion>
  <Accordion title="Alias">
    `azure` 被接受为现有 PR 和用户配置的提供商别名，但新配置应使用 `azure-speech` 以避免与 Azure
    OpenAI 模型提供商混淆。
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
