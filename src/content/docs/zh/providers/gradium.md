---
summary: "OpenClaw在 OpenClaw 中使用 Gradium 文本转语音"
read_when:
  - You want Gradium for text-to-speech
  - You need Gradium API key, voice, or directive token configuration
title: "Gradium"
---

[Gradium](https://gradium.ai) 是 OpenClaw 的内置文本转语音提供商。该插件可以渲染常规音频回复（WAV）、语音便签兼容的 Opus 输出，以及用于电话表面的 8 kHz u-law 音频。

| 属性      | 值                                |
| --------- | --------------------------------- |
| 提供者 ID | `gradium`                         |
| 身份验证  | `GRADIUM_API_KEY` 或配置 `apiKey` |
| 基础 URL  | `https://api.gradium.ai` （默认） |
| 默认语音  | `Emma` (`YTpq7expH9539ERJ`)       |

## 设置

创建 Gradium API 密钥，然后使用环境变量或配置密钥将其暴露给 OpenClaw OpenClaw。

<Tabs>
  <Tab title="环境变量">
    ```bash
    export GRADIUM_API_KEY="gsk_..."
    ```
  </Tab>

  <Tab title="配置键">
    ```json5
    {
      messages: {
        tts: {
          auto: "always",
          provider: "gradium",
          providers: {
            gradium: {
              apiKey: "${GRADIUM_API_KEY}",
            },
          },
        },
      },
    }
    ```
  </Tab>
</Tabs>

该插件首先检查已解析的 `apiKey`，然后回退到 `GRADIUM_API_KEY` 环境变量。

## 配置

```json5
{
  messages: {
    tts: {
      auto: "always",
      provider: "gradium",
      providers: {
        gradium: {
          speakerVoiceId: "YTpq7expH9539ERJ",
          // apiKey: "${GRADIUM_API_KEY}",
          // baseUrl: "https://api.gradium.ai",
        },
      },
    },
  },
}
```

| 密钥                                            | 类型   | 描述                                                         |
| ----------------------------------------------- | ------ | ------------------------------------------------------------ |
| `messages.tts.providers.gradium.apiKey`         | 字符串 | 解析后的 API 密钥。支持 `${ENV}` 和 secret 引用。            |
| `messages.tts.providers.gradium.baseUrl`        | 字符串 | 覆盖 API 源。移除尾部斜杠。默认为 `https://api.gradium.ai`。 |
| `messages.tts.providers.gradium.speakerVoiceId` | string | 当不存在指令覆盖时使用的默认语音 ID。                        |

输出音频格式由运行时根据目标表面自动选择，无法通过 `openclaw.json` 进行配置。请参阅下面的 [Output](#output)。

## 语音

| 名称      | 语音 ID            |
| --------- | ------------------ |
| Emma      | `YTpq7expH9539ERJ` |
| Kent      | `LFZvm12tW_z0xfGo` |
| 蒂芙尼    | `Eu9iL_CYe8N-Gkx_` |
| Christina | `2H4HY2CBNyJHBCrP` |
| 悉尼      | `jtEKaLYNn6iif5PR` |
| John      | `KWJiFWu2O9nMPYcR` |
| Arthur    | `3jUdJyOi9pgbxBTK` |

默认语音：Emma。

### 每条消息的声音覆盖

当启用的语音策略允许覆盖语音时，您可以使用指令令牌在线切换语音。使用 `speakerVoiceId` 表示提供商原生的语音 ID。

```text
/voice:LFZvm12tW_z0xfGo
/voice_id:LFZvm12tW_z0xfGo
/voiceid:LFZvm12tW_z0xfGo
/gradium_voice:LFZvm12tW_z0xfGo
/gradiumvoice:LFZvm12tW_z0xfGo
```

如果语音策略禁用了语音覆盖，该指令将被消耗但会被忽略。

## 输出

运行时根据目标表面选择输出格式。该提供商目前不合成其他格式。

| 目标     | 格式        | 文件扩展名 | 采样率 | 语音兼容标志 |
| -------- | ----------- | ---------- | ------ | ------------ |
| 标准音频 | `wav`       | `.wav`     | 提供商 | 不           |
| 语音备注 | `opus`      | `.opus`    | 提供商 | 是           |
| 电话     | `ulaw_8000` | 不适用     | 8 kHz  | 不适用       |

## 自动选择顺序

在已配置的 TTS 提供商中，Gradium 的自动选择顺序为 `30`。请参阅[文本转语音](/zh/tools/tts)以了解当 OpenClaw`messages.tts.provider` 未固定时，OpenClaw 如何选择活动提供商。

## 相关

- [文本转语音](/zh/tools/tts)
- [媒体概览](/zh/tools/media-overview)
