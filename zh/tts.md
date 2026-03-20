---
summary: "用于出站回复的文本转语音 (TTS)"
read_when:
  - 启用回复的文本转语音
  - 配置 TTS 提供商或限制
  - 使用 /tts 命令
title: "文本转语音"
---

# 文本转语音 (TTS)

OpenClaw 可以使用 ElevenLabs、Microsoft 或 OpenAI 将出站回复转换为音频。
它适用于任何 OpenClaw 可以发送音频的地方；Telegram 会收到一个圆形的语音消息气泡。

## 支持的服务

- **ElevenLabs**（主要或备用提供商）
- **Microsoft**（主要或备用提供商；当前捆绑的实现使用 `node-edge-tts`，在没有 API 密钥时为默认值）
- **OpenAI**（主要或备用提供商；也用于摘要）

### Microsoft 语音说明

捆绑的 Microsoft 语音提供商目前通过 `node-edge-tts` 库使用 Microsoft Edge 的在线
神经 TTS 服务。它是一项托管服务（非
本地），使用 Microsoft 端点，并且不需要 API 密钥。
`node-edge-tts` 公开了语音配置选项和输出格式，但
并非所有选项都受该服务支持。使用 `edge` 的旧版配置和指令输入
仍然有效，并被标准化为 `microsoft`。

由于此路径是一项没有发布 SLA 或配额的公共网络服务，
请将其视为尽力而为的服务。如果您需要保证的限制和支持，请使用 OpenAI
或 ElevenLabs。

## 可选密钥

如果您想要 OpenAI 或 ElevenLabs：

- `ELEVENLABS_API_KEY`（或 `XI_API_KEY`）
- `OPENAI_API_KEY`

Microsoft 语音**不**需要 API 密钥。如果未找到 API 密钥，
OpenClaw 默认使用 Microsoft（除非通过
`messages.tts.microsoft.enabled=false` 或 `messages.tts.edge.enabled=false` 禁用）。

如果配置了多个提供商，则首先使用选定的提供商，其他作为备用选项。
自动摘要使用配置的 `summaryModel`（或 `agents.defaults.model.primary`），
因此如果您启用了摘要，该提供商也必须经过身份验证。

## 服务链接

- [OpenAI 文本转语音指南](https://platform.openai.com/docs/guides/text-to-speech)
- [OpenAI 音频 API 参考](https://platform.openai.com/docs/api-reference/audio)
- [ElevenLabs 文本转语音](https://elevenlabs.io/docs/api-reference/text-to-speech)
- [ElevenLabs 身份验证](https://elevenlabs.io/docs/api-reference/authentication)
- [node-edge-tts](https://github.com/SchneeHertz/node-edge-tts)
- [Microsoft Speech 输出格式](https://learn.microsoft.com/azure/ai-services/speech-service/rest-text-to-speech#audio-outputs)

## 默认情况下是否启用？

否。默认情况下，自动TTS是**关闭**的。可以在配置中使用
`messages.tts.auto` 或每个会话使用 `/tts always`（别名：`/tts on`）启用它。

一旦开启TTS，Microsoft语音**默认**启用，并在没有可用的 OpenAI 或 ElevenLabs API 密钥时自动使用。

## 配置

TTS 配置位于 `openclaw.json` 的 `messages.tts` 下。
完整架构请参见 [Gateway(网关) configuration](/zh/gateway/configuration)。

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

### OpenAI 优先，ElevenLabs 作为后备

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

### Microsoft 优先（无 API 密钥）

```json5
{
  messages: {
    tts: {
      auto: "always",
      provider: "microsoft",
      microsoft: {
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

### 禁用 Microsoft 语音

```json5
{
  messages: {
    tts: {
      microsoft: {
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

### 仅在收到传入语音备注后以音频回复

```json5
{
  messages: {
    tts: {
      auto: "inbound",
    },
  },
}
```

### 对于长回复禁用自动摘要

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

- `auto`：自动TTS模式（`off`、`always`、`inbound`、`tagged`）。
  - `inbound` 仅在传入语音备注后发送音频。
  - `tagged` 仅在回复包含 `[[tts]]` 标签时发送音频。
- `enabled`：旧版切换开关（doctor 会将其迁移到 `auto`）。
- `mode`：`"final"`（默认）或 `"all"`（包括工具/块回复）。
- `provider`：语音提供商ID，例如 `"elevenlabs"`、`"microsoft"` 或 `"openai"`（后备是自动的）。
- 如果 `provider` **未设置**，OpenClaw 优先选择 `openai`（如果有密钥），然后是 `elevenlabs`（如果有密钥），
  否则为 `microsoft`。
- 旧版 `provider: "edge"` 仍然有效，并被规范化为 `microsoft`。
- `summaryModel`：用于自动摘要的可选廉价模型；默认为 `agents.defaults.model.primary`。
  - 接受 `provider/model` 或配置的模型别名。
- `modelOverrides`：允许模型发出 TTS 指令（默认开启）。
  - `allowProvider` 默认为 `false`（提供商切换为可选加入）。
- `maxTextLength`：TTS 输入（字符）的硬性上限。如果超过，`/tts audio` 将失败。
- `timeoutMs`：请求超时（毫秒）。
- `prefsPath`：覆盖本地偏好 JSON 路径（提供商/限制/摘要）。
- `apiKey` 值回退到环境变量（`ELEVENLABS_API_KEY`/`XI_API_KEY`, `OPENAI_API_KEY`）。
- `elevenlabs.baseUrl`：覆盖 ElevenLabs API 基础 URL。
- `openai.baseUrl`：覆盖 OpenAI TTS 端点。
  - 解析顺序：`messages.tts.openai.baseUrl` -> `OPENAI_TTS_BASE_URL` -> `https://api.openai.com/v1`
  - 非默认值被视为与 OpenAI 兼容的 TTS 端点，因此接受自定义模型和语音名称。
- `elevenlabs.voiceSettings`：
  - `stability`, `similarityBoost`, `style`: `0..1`
  - `useSpeakerBoost`: `true|false`
  - `speed`: `0.5..2.0` (1.0 = 正常)
- `elevenlabs.applyTextNormalization`: `auto|on|off`
- `elevenlabs.languageCode`：2 个字母的 ISO 639-1 代码（例如 `en`, `de`）
- `elevenlabs.seed`：整数 `0..4294967295`（尽力确定性）
- `microsoft.enabled`：允许使用 Microsoft 语音（默认 `true`；无 API 密钥）。
- `microsoft.voice`：Microsoft 神经语音名称（例如 `en-US-MichelleNeural`）。
- `microsoft.lang`：语言代码（例如 `en-US`）。
- `microsoft.outputFormat`：Microsoft 输出格式（例如 `audio-24khz-48kbitrate-mono-mp3`）。
  - 有关有效值，请参阅 Microsoft Speech 输出格式；并非所有格式都受捆绑的 Edge 支持传输支持。
- `microsoft.rate` / `microsoft.pitch` / `microsoft.volume`：百分比字符串（例如 `+10%`、`-5%`）。
- `microsoft.saveSubtitles`：在音频文件旁边写入 JSON 字幕。
- `microsoft.proxy`：Microsoft 语音请求的代理 URL。
- `microsoft.timeoutMs`：请求超时覆盖（毫秒）。
- `edge.*`：相同 Microsoft 设置的旧别名。

## 模型驱动的覆盖（默认开启）

默认情况下，模型**可以**为单次回复发出 TTS 指令。
当 `messages.tts.auto` 为 `tagged` 时，必须使用这些指令来触发音频。

启用后，模型可以发出 `[[tts:...]]` 指令以覆盖单次回复的语音，以及一个可选的 `[[tts:text]]...[[/tts:text]]` 块，用于提供表现力标签（笑声、歌唱提示等），这些标签应仅出现在音频中。

`provider=...` 指令将被忽略，除非 `modelOverrides.allowProvider: true`。

回复负载示例：

```
Here you go.

[[tts:voiceId=pMsXgVXv3BLzUgSXRplE model=eleven_v3 speed=1.1]]
[[tts:text]](laughs) Read the song once more.[[/tts:text]]
```

可用的指令键（启用时）：

- `provider`（已注册的语音提供商 ID，例如 `openai`、`elevenlabs` 或 `microsoft`；需要 `allowProvider: true`）
- `voice`（OpenAI 语音）或 `voiceId`（ElevenLabs）
- `model`（OpenAI TTS 模型或 ElevenLabs 模型 ID）
- `stability`、`similarityBoost`、`style`、`speed`、`useSpeakerBoost`
- `applyTextNormalization`（`auto|on|off`）
- `languageCode`（ISO 639-1）
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

## 每用户首选项

斜杠命令将本地覆盖写入 `prefsPath`（默认：
`~/.openclaw/settings/tts.json`，通过 `OPENCLAW_TTS_PREFS` 或
`messages.tts.prefsPath` 覆盖）。

存储字段：

- `enabled`
- `provider`
- `maxLength`（摘要阈值；默认 1500 个字符）
- `summarize`（默认 `true`）

这些将覆盖该主机的 `messages.tts.*`。

## 输出格式（固定）

- **Telegram**：Opus 语音留言（来自 ElevenLabs 的 `opus_48000_64`，来自 OpenAI 的 `opus`）。
  - 48kHz / 64kbps 是一个不错的语音留言折衷方案，并且是圆形气泡所需的。
- **其他渠道**：MP3（来自 ElevenLabs 的 `mp3_44100_128`，来自 OpenAI 的 `mp3`）。
  - 44.1kHz / 128kbps 是语音清晰度的默认平衡。
- **Microsoft**：使用 `microsoft.outputFormat`（默认 `audio-24khz-48kbitrate-mono-mp3`）。
  - 捆绑的传输接受 `outputFormat`，但并非所有格式都可用于该服务。
  - 输出格式值遵循 Microsoft Speech 输出格式（包括 Ogg/WebM Opus）。
  - Telegram `sendVoice` 接受 OGG/MP3/M4A；如果您需要
    保证的 Opus 语音留言，请使用 OpenAI/ElevenLabs。 citeturn1search1
  - 如果配置的 Microsoft 输出格式失败，OpenClaw 会重试 MP3。

OpenAI/ElevenLabs 格式是固定的；Telegram 期望语音留言 UX 为 Opus。

## 自动 TTS 行为

启用后，OpenClaw：

- 如果回复已包含媒体或 `MEDIA:` 指令，则跳过 TTS。
- 跳过非常短的回复（< 10 个字符）。
- 使用 `agents.defaults.model.primary`（或 `summaryModel`）启用时，汇总长回复。
- 将生成的音频附加到回复。

如果回复超过 `maxLength` 且摘要处于关闭状态（或摘要模型没有 API 密钥），
将跳过音频并发送正常的文本回复。

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
有关启用详细信息，请参阅 [斜杠命令](/zh/tools/slash-commands)。

Discord 说明：`/tts` 是 Discord 的内置命令，因此 OpenClaw 在那里将 `/voice` 注册为本机命令。文本 `/tts ...` 仍然有效。

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

- 命令需要经过授权的发件人（允许列表/所有者规则仍然适用）。
- 必须启用 `commands.text` 或本机命令注册。
- `off|always|inbound|tagged` 是每次会话的开关（`/tts on` 是 `/tts always` 的别名）。
- `limit` 和 `summary` 存储在本地首选项中，而不是主配置中。
- `/tts audio` 生成一次性音频回复（不会开启 TTS）。

## Agent 工具

`tts` 工具将文本转换为语音并返回 `MEDIA:` 路径。当结果与 Telegram 兼容时，该工具包含 `[[audio_as_voice]]`，以便 Telegram 发送语音气泡。

## Gateway(网关) RPC

Gateway(网关) 方法：

- `tts.status`
- `tts.enable`
- `tts.disable`
- `tts.convert`
- `tts.setProvider`
- `tts.providers`

import zh from "/components/footer/zh.mdx";

<zh />
