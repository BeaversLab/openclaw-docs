---
summary: "用于出站回复的文本转语音 (TTS)"
read_when:
  - Enabling text-to-speech for replies
  - Configuring TTS providers or limits
  - Using /tts commands
title: "文本转语音"
---

# 文本转语音 (TTS)

OpenClaw 可以使用 ElevenLabs、OpenAI 或 Edge TTS 将出站回复转换为音频。
只要 OpenClaw 能发送音频的地方，它都能工作；Telegram 上会显示为圆形的语音备注气泡。

## 支持的服务

- **ElevenLabs**（主要或备用提供商）
- **OpenAI**（主要或备用提供商；也用于摘要）
- **Edge TTS**（主要或备用提供商；使用 `node-edge-tts`，当没有 API 密钥时为默认选项）

### Edge TTS 说明

Edge TTS 通过 `node-edge-tts` 库使用 Microsoft Edge 的在线神经 TTS 服务。这是一项托管服务（非本地），使用 Microsoft 的端点，并且不需要 API 密钥。`node-edge-tts` 公开了语音配置选项和输出格式，但并非所有选项都受 Edge 服务支持。 citeturn2search0

由于 Edge TTS 是一项没有公布 SLA 或配额的公共 Web 服务，因此请将其视为尽力而为的服务。如果您需要保证的限制和支持，请使用 OpenAI 或 ElevenLabs。
Microsoft 的 Speech REST API 文档规定了每次请求 10 分钟的音频限制；Edge TTS 未公布限制，因此请假设限制类似或更低。citeturn0search3

## 可选密钥

如果您想使用 OpenAI 或 ElevenLabs：

- `ELEVENLABS_API_KEY` (或 `XI_API_KEY`)
- `OPENAI_API_KEY`

Edge TTS **不**需要 API 密钥。如果未找到 API 密钥，OpenClaw 默认使用 Edge TTS（除非通过 `messages.tts.edge.enabled=false` 禁用）。

如果配置了多个提供商，则首先使用选定的提供商，其他作为备用选项。
自动摘要使用配置的 `summaryModel`（或 `agents.defaults.model.primary`），
因此如果您启用了摘要，该提供商也必须经过身份验证。

## 服务链接

- [OpenAI 语音合成指南](https://platform.openai.com/docs/guides/text-to-speech)
- [OpenAI 音频 API 参考](https://platform.openai.com/docs/api-reference/audio)
- [ElevenLabs 文本转语音](https://elevenlabs.io/docs/api-reference/text-to-speech)
- [ElevenLabs 身份验证](https://elevenlabs.io/docs/api-reference/authentication)
- [node-edge-tts](https://github.com/SchneeHertz/node-edge-tts)
- [Microsoft 语音输出格式](https://learn.microsoft.com/azure/ai-services/speech-service/rest-text-to-speech#audio-outputs)

## 默认情况下是否启用？

不。自动 TTS 默认是**关闭**的。在配置中使用 `messages.tts.auto` 启用它，或每次会话使用 `/tts always`（别名：`/tts on`）启用。

一旦开启 TTS，Edge TTS **默认**是启用的，并且在没有可用的 OpenAI 或 ElevenLabs API 密钥时会自动使用。

## 配置

TTS 配置位于 `openclaw.json` 中的 `messages.tts` 下。
完整架构位于 [Gateway 网关 配置](/en/gateway/configuration)。

### 最小配置（启用 + 提供商）

```json5
{
  messages: {
    tts: {
      auto: "always",
      provider: "elevenlabs",
    },
  },
}
```

### OpenAI 主用，ElevenLabs 备用

```json5
{
  messages: {
    tts: {
      auto: "always",
      provider: "openai",
      summaryModel: "openai/gpt-4.1-mini",
      modelOverrides: {
        enabled: true,
      },
      openai: {
        apiKey: "openai_api_key",
        baseUrl: "https://api.openai.com/v1",
        model: "gpt-4o-mini-tts",
        voice: "alloy",
      },
      elevenlabs: {
        apiKey: "elevenlabs_api_key",
        baseUrl: "https://api.elevenlabs.io",
        voiceId: "voice_id",
        modelId: "eleven_multilingual_v2",
        seed: 42,
        applyTextNormalization: "auto",
        languageCode: "en",
        voiceSettings: {
          stability: 0.5,
          similarityBoost: 0.75,
          style: 0.0,
          useSpeakerBoost: true,
          speed: 1.0,
        },
      },
    },
  },
}
```

### Edge TTS 主用（无 API 密钥）

```json5
{
  messages: {
    tts: {
      auto: "always",
      provider: "edge",
      edge: {
        enabled: true,
        voice: "en-US-MichelleNeural",
        lang: "en-US",
        outputFormat: "audio-24khz-48kbitrate-mono-mp3",
        rate: "+10%",
        pitch: "-5%",
      },
    },
  },
}
```

### 禁用 Edge TTS

```json5
{
  messages: {
    tts: {
      edge: {
        enabled: false,
      },
    },
  },
}
```

### 自定义限制 + 偏好路径

```json5
{
  messages: {
    tts: {
      auto: "always",
      maxTextLength: 4000,
      timeoutMs: 30000,
      prefsPath: "~/.openclaw/settings/tts.json",
    },
  },
}
```

### 仅在收到语音消息后以音频回复

```json5
{
  messages: {
    tts: {
      auto: "inbound",
    },
  },
}
```

### 对长回复禁用自动摘要

```json5
{
  messages: {
    tts: {
      auto: "always",
    },
  },
}
```

然后运行：

```
/tts summary off
```

### 字段说明

- `auto`：自动 TTS 模式（`off`、`always`、`inbound`、`tagged`）。
  - `inbound` 仅在收到传入语音笔记后发送音频。
  - `tagged` 仅在回复包含 `[[tts]]` 标签时发送音频。
- `enabled`：旧版切换开关（doctor 会将其迁移到 `auto`）。
- `mode`：`"final"`（默认）或 `"all"`（包括工具/块回复）。
- `provider`：`"elevenlabs"`、`"openai"` 或 `"edge"`（回退是自动的）。
- 如果 `provider` **未设置**，OpenClaw 优先选择 `openai`（如果有密钥），然后是 `elevenlabs`（如果有密钥），
  否则选择 `edge`。
- `summaryModel`：用于自动摘要的可选低成本模型；默认为 `agents.defaults.model.primary`。
  - 接受 `provider/model` 或配置的模型别名。
- `modelOverrides`：允许模型发出 TTS 指令（默认开启）。
  - `allowProvider` 默认为 `false`（提供商切换是可选加入的）。
- `maxTextLength`：TTS 输入的硬性上限（字符数）。如果超出，`/tts audio` 将失败。
- `timeoutMs`：请求超时（毫秒）。
- `prefsPath`：覆盖本地首选项 JSON 路径（提供商/limit/summary）。
- `apiKey` 值会回退到环境变量（`ELEVENLABS_API_KEY`/`XI_API_KEY`、`OPENAI_API_KEY`）。
- `elevenlabs.baseUrl`：覆盖 ElevenLabs API 基础 URL。
- `openai.baseUrl`：覆盖 OpenAI TTS 端点。
  - 解析顺序：`messages.tts.openai.baseUrl` -> `OPENAI_TTS_BASE_URL` -> `https://api.openai.com/v1`
  - 非默认值被视为 OpenAI 兼容的 TTS 端点，因此接受自定义模型和语音名称。
- `elevenlabs.voiceSettings`：
  - `stability`、`similarityBoost`、`style`：`0..1`
  - `useSpeakerBoost`：`true|false`
  - `speed`: `0.5..2.0` (1.0 = 正常)
- `elevenlabs.applyTextNormalization`: `auto|on|off`
- `elevenlabs.languageCode`: 2字母 ISO 639-1 代码 (例如 `en`, `de`)
- `elevenlabs.seed`: 整数 `0..4294967295` (尽力确定性)
- `edge.enabled`: 允许使用 Edge TTS (默认 `true`; 无 API 密钥)。
- `edge.voice`: Edge 神经语音名称 (例如 `en-US-MichelleNeural`)。
- `edge.lang`: 语言代码 (例如 `en-US`)。
- `edge.outputFormat`: Edge 输出格式 (例如 `audio-24khz-48kbitrate-mono-mp3`)。
  - 有关有效值，请参阅 Microsoft 语音输出格式；并非所有格式都受 Edge 支持。
- `edge.rate` / `edge.pitch` / `edge.volume`: 百分比字符串 (例如 `+10%`, `-5%`)。
- `edge.saveSubtitles`: 在音频文件旁边写入 JSON 字幕。
- `edge.proxy`: Edge TTS 请求的代理 URL。
- `edge.timeoutMs`: 请求超时覆盖 (毫秒)。

## 模型驱动的覆盖 (默认开启)

默认情况下，模型**可以**为单次回复发出 TTS 指令。
当 `messages.tts.auto` 为 `tagged` 时，这些指令是触发音频所必需的。

启用后，模型可以发出 `[[tts:...]]` 指令来覆盖单次回复的语音，
还可以添加一个可选的 `[[tts:text]]...[[/tts:text]]` 块来
提供仅应出现在音频中的表现力标签 (笑声、歌唱提示等)。

除非 `modelOverrides.allowProvider: true`，否则 `provider=...` 指令将被忽略。

回复负载示例：

```
Here you go.

[[tts:voiceId=pMsXgVXv3BLzUgSXRplE model=eleven_v3 speed=1.1]]
[[tts:text]](laughs) Read the song once more.[[/tts:text]]
```

可用的指令键 (启用时)：

- `provider` (`openai` | `elevenlabs` | `edge`，需要 `allowProvider: true`)
- `voice` (OpenAI 语音) 或 `voiceId` (ElevenLabs)
- `model` (OpenAI TTS 模型或 ElevenLabs 模型 ID)
- `stability`，`similarityBoost`，`style`，`speed`，`useSpeakerBoost`
- `applyTextNormalization` (`auto|on|off`)
- `languageCode` (ISO 639-1)
- `seed`

禁用所有模型覆盖：

```json5
{
  messages: {
    tts: {
      modelOverrides: {
        enabled: false,
      },
    },
  },
}
```

可选允许列表（启用提供商切换，同时保持其他旋钮可配置）：

```json5
{
  messages: {
    tts: {
      modelOverrides: {
        enabled: true,
        allowProvider: true,
        allowSeed: false,
      },
    },
  },
}
```

## 用户偏好设置

斜杠命令将本地覆盖写入 `prefsPath`（默认：
`~/.openclaw/settings/tts.json`，使用 `OPENCLAW_TTS_PREFS` 或
`messages.tts.prefsPath` 覆盖）。

存储字段：

- `enabled`
- `provider`
- `maxLength` (摘要阈值；默认 1500 字符)
- `summarize` (默认 `true`)

这些将覆盖该主机的 `messages.tts.*`。

## 输出格式（固定）

- **Telegram**：Opus 语音笔记（来自 ElevenLabs 的 `opus_48000_64`，来自 OpenAI 的 `opus`）。
  - 48kHz / 64kbps 是语音笔记的一个良好折衷方案，并且是圆形气泡所必需的。
- **其他渠道**：MP3（来自 ElevenLabs 的 `mp3_44100_128`，来自 OpenAI 的 `mp3`）。
  - 44.1kHz / 128kbps 是语音清晰度的默认平衡值。
- **Edge TTS**：使用 `edge.outputFormat`（默认 `audio-24khz-48kbitrate-mono-mp3`）。
  - `node-edge-tts` 接受 `outputFormat`，但并非所有格式都
    在 Edge 服务中可用。citeturn2search0
  - 输出格式值遵循 Microsoft 语音输出格式（包括 Ogg/WebM Opus）。citeturn1search0
  - Telegram `sendVoice` 接受 OGG/MP3/M4A；如果您需要
    确定的 Opus 语音笔记，请使用 OpenAI/ElevenLabs。citeturn1search1
  - 如果配置的 Edge 输出格式失败，OpenClaw 将使用 MP3 重试。

OpenAI/ElevenLabs 格式是固定的；Telegram 期望语音笔记 UX 使用 Opus。

## 自动 TTS 行为

启用后，OpenClaw：

- 如果回复已包含媒体或 `MEDIA:` 指令，则跳过 TTS。
- 跳过非常短的回复（< 10 个字符）。
- 当使用 `agents.defaults.model.primary`（或 `summaryModel`）启用时，会对长回复进行摘要。
- 将生成的音频附加到回复中。

如果回复超过 `maxLength` 且摘要已关闭（或没有用于
摘要模型的 API 密钥），则跳过
音频并发送正常的文本回复。

## 流程图

```
Reply -> TTS enabled?
  no  -> send text
  yes -> has media / MEDIA: / short?
          yes -> send text
          no  -> length > limit?
                   no  -> TTS -> attach audio
                   yes -> summary enabled?
                            no  -> send text
                            yes -> summarize (summaryModel or agents.defaults.model.primary)
                                      -> TTS -> attach audio
```

## 斜杠命令用法

只有一个命令：`/tts`。
有关启用详细信息，请参阅 [斜杠命令](/en/tools/slash-commands)。

Discord 说明：`/tts` 是 Discord 的内置命令，因此 OpenClaw 在那里注册
`/voice` 作为本机命令。文本 `/tts ...` 仍然有效。

```
/tts off
/tts always
/tts inbound
/tts tagged
/tts status
/tts provider openai
/tts limit 2000
/tts summary off
/tts audio Hello from OpenClaw
```

说明：

- 命令需要授权的发送者（允许列表/所有者规则仍然适用）。
- 必须启用 `commands.text` 或本机命令注册。
- `off|always|inbound|tagged` 是每个会话的切换开关（`/tts on` 是 `/tts always` 的别名）。
- `limit` 和 `summary` 存储在本地首选项中，而不是主配置中。
- `/tts audio` 生成一次性音频回复（不会开启 TTS）。

## Agent 工具

`tts` 工具将文本转换为语音并返回 `MEDIA:` 路径。当
结果与 Telegram 兼容时，该工具包含 `[[audio_as_voice]]` 以便
Telegram 发送语音气泡。

## Gateway 网关 RPC

Gateway(网关) 网关方法：

- `tts.status`
- `tts.enable`
- `tts.disable`
- `tts.convert`
- `tts.setProvider`
- `tts.providers`

import zh from '/components/footer/zh.mdx';

<zh />
