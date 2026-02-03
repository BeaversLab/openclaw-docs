---
summary: "外发回复的文本转语音（TTS）"
read_when:
  - 启用回复 TTS
  - 配置 TTS provider 或限制
  - 使用 /tts 命令
title: "文本转语音"
---

# 文本转语音（TTS）

OpenClaw 可使用 ElevenLabs、OpenAI 或 Edge TTS 将外发回复转为音频。
它在 OpenClaw 可发送音频的任何地方生效；Telegram 会显示为语音便签气泡。

## 支持的服务

- **ElevenLabs**（主 provider 或回退）
- **OpenAI**（主 provider 或回退；也用于摘要）
- **Edge TTS**（主 provider 或回退；使用 `node-edge-tts`，无 API key 时默认）

### Edge TTS 说明

Edge TTS 通过 `node-edge-tts`
库使用 Microsoft Edge 的在线神经 TTS 服务。它是托管服务（非本地），使用微软端点，
不需要 API key。`node-edge-tts` 提供语音配置选项与输出格式，但 Edge 服务并非全部支持。citeturn2search0

由于 Edge TTS 是公开的 Web 服务，且没有发布 SLA/配额，应视为 best-effort。
如果你需要明确的额度与支持，请使用 OpenAI 或 ElevenLabs。
Microsoft Speech REST API 文档提到单次请求 10 分钟音频限制；Edge TTS
未公布限制，因此可按相同或更低假设。citeturn0search3

## 可选 key

如果使用 OpenAI 或 ElevenLabs：

- `ELEVENLABS_API_KEY`（或 `XI_API_KEY`）
- `OPENAI_API_KEY`

Edge TTS **不需要** API key。若未发现任何 API key，OpenClaw 默认
使用 Edge TTS（除非 `messages.tts.edge.enabled=false` 禁用）。

若配置多个 provider，会优先使用选中的 provider，其它作为回退。
自动摘要使用配置的 `summaryModel`（或 `agents.defaults.model.primary`），
因此若启用摘要，该 provider 也必须可认证。

## 服务链接

- [OpenAI Text-to-Speech guide](https://platform.openai.com/docs/guides/text-to-speech)
- [OpenAI Audio API reference](https://platform.openai.com/docs/api-reference/audio)
- [ElevenLabs Text to Speech](https://elevenlabs.io/docs/api-reference/text-to-speech)
- [ElevenLabs Authentication](https://elevenlabs.io/docs/api-reference/authentication)
- [node-edge-tts](https://github.com/SchneeHertz/node-edge-tts)
- [Microsoft Speech output formats](https://learn.microsoft.com/azure/ai-services/speech-service/rest-text-to-speech#audio-outputs)

## 默认启用吗？

不是。自动 TTS 默认 **关闭**。可在配置中设置 `messages.tts.auto` 启用，或在会话中使用 `/tts always`（别名：`/tts on`）。

一旦启用 TTS，Edge TTS 默认 **开启**，在没有 OpenAI 或 ElevenLabs API key 时自动使用。

## 配置

TTS 配置在 `openclaw.json` 的 `messages.tts` 下。
完整 schema 见 [Gateway configuration](/zh/gateway/configuration)。

### 最小配置（启用 + provider）

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

### OpenAI 主 + ElevenLabs 回退

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

### Edge TTS 主（无 API key）

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

### 自定义限制 + prefs 路径

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

### 仅在入站语音后回复音频

```json5
{
  messages: {
    tts: {
      auto: "inbound",
    },
  },
}
```

### 禁用长回复自动摘要

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

- `auto`：自动 TTS 模式（`off`, `always`, `inbound`, `tagged`）。
  - `inbound` 仅在入站语音后发送音频。
  - `tagged` 仅在回复包含 `[[tts]]` 标签时发送音频。
- `enabled`：旧开关（doctor 会迁移到 `auto`）。
- `mode`：`"final"`（默认）或 `"all"`（包含工具/块回复）。
- `provider`：`"elevenlabs"`、`"openai"` 或 `"edge"`（回退自动）。
- 若 `provider` **未设置**，OpenClaw 优先 `openai`（有 key 时），其次 `elevenlabs`（有 key 时），否则 `edge`。
- `summaryModel`：可选的便宜模型用于自动摘要；默认 `agents.defaults.model.primary`。
  - 支持 `provider/model` 或已配置模型别名。
- `modelOverrides`：允许模型输出 TTS 指令（默认开启）。
- `maxTextLength`：TTS 输入硬上限（字符）。超过会导致 `/tts audio` 失败。
- `timeoutMs`：请求超时（毫秒）。
- `prefsPath`：覆盖本地偏好 JSON 路径（provider/limit/summary）。
- `apiKey` 值会回退到环境变量（`ELEVENLABS_API_KEY`/`XI_API_KEY`、`OPENAI_API_KEY`）。
- `elevenlabs.baseUrl`：覆盖 ElevenLabs API base URL。
- `elevenlabs.voiceSettings`：
  - `stability`、`similarityBoost`、`style`：`0..1`
  - `useSpeakerBoost`：`true|false`
  - `speed`：`0.5..2.0`（1.0 = 正常）
- `elevenlabs.applyTextNormalization`：`auto|on|off`
- `elevenlabs.languageCode`：2 字母 ISO 639-1（如 `en`, `de`）
- `elevenlabs.seed`：整数 `0..4294967295`（尽力确定性）
- `edge.enabled`：允许使用 Edge TTS（默认 `true`；无 API key）。
- `edge.voice`：Edge 神经声音名（如 `en-US-MichelleNeural`）。
- `edge.lang`：语言代码（如 `en-US`）。
- `edge.outputFormat`：Edge 输出格式（如 `audio-24khz-48kbitrate-mono-mp3`）。
  - 有效值见 Microsoft Speech output formats；Edge 不支持全部格式。
- `edge.rate` / `edge.pitch` / `edge.volume`：百分比字符串（如 `+10%`、`-5%`）。
- `edge.saveSubtitles`：在音频旁写出 JSON 字幕。
- `edge.proxy`：Edge TTS 请求的代理 URL。
- `edge.timeoutMs`：请求超时覆盖（毫秒）。

## 模型驱动覆盖（默认开启）

默认情况下，模型 **可以** 为单次回复输出 TTS 指令。
当 `messages.tts.auto` 为 `tagged` 时，需要这些指令才能触发音频。

启用后，模型可输出 `[[tts:...]]` 指令来覆盖单次回复的声音，
还可添加 `[[tts:text]]...[[/tts:text]]` 块，提供仅用于音频的表达标签（笑声、唱歌提示等）。

示例回复：

```
Here you go.

[[tts:provider=elevenlabs voiceId=pMsXgVXv3BLzUgSXRplE model=eleven_v3 speed=1.1]]
[[tts:text]](laughs) Read the song once more.[[/tts:text]]
```

可用指令键（启用时）：

- `provider`（`openai` | `elevenlabs` | `edge`）
- `voice`（OpenAI voice）或 `voiceId`（ElevenLabs）
- `model`（OpenAI TTS model 或 ElevenLabs model id）
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

可选 allowlist（保留标签但禁用特定覆盖）：

```json5
{
  messages: {
    tts: {
      modelOverrides: {
        enabled: true,
        allowProvider: false,
        allowSeed: false,
      },
    },
  },
}
```

## 用户偏好（每用户）

斜杠命令会将本地覆盖写入 `prefsPath`（默认：
`~/.openclaw/settings/tts.json`，可用 `OPENCLAW_TTS_PREFS` 或
`messages.tts.prefsPath` 覆盖）。

存储字段：

- `enabled`
- `provider`
- `maxLength`（摘要阈值；默认 1500 字符）
- `summarize`（默认 `true`）

这些会覆盖该主机上的 `messages.tts.*`。

## 输出格式（固定）

- **Telegram**：Opus 语音便签（ElevenLabs `opus_48000_64`，OpenAI `opus`）。
  - 48kHz / 64kbps 是语音便签较好的权衡，并且是圆形气泡所需。
- **其他频道**：MP3（ElevenLabs `mp3_44100_128`，OpenAI `mp3`）。
  - 44.1kHz / 128kbps 为语音清晰度的默认平衡。
- **Edge TTS**：使用 `edge.outputFormat`（默认 `audio-24khz-48kbitrate-mono-mp3`）。
  - `node-edge-tts` 接受 `outputFormat`，但 Edge 服务不一定支持全部格式。citeturn2search0
  - 输出格式值遵循 Microsoft Speech output formats（包括 Ogg/WebM Opus）。citeturn1search0
  - Telegram `sendVoice` 接受 OGG/MP3/M4A；若需要保证的 Opus 语音便签，请使用 OpenAI/ElevenLabs。citeturn1search1
  - 若配置的 Edge 输出格式失败，OpenClaw 会回退 MP3。

OpenAI/ElevenLabs 格式固定；Telegram 的语音便签 UX 期望 Opus。

## 自动 TTS 行为

启用后，OpenClaw：

- 若回复已包含媒体或 `MEDIA:` 指令，则跳过 TTS。
- 跳过非常短的回复（< 10 字符）。
- 在启用时使用 `agents.defaults.model.primary`（或 `summaryModel`）对长回复做摘要。
- 将生成的音频附加到回复。

若回复超过 `maxLength` 且摘要关闭（或摘要模型无 API key），
则跳过音频，仅发送文字。

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
启用细节见 [Slash commands](/zh/tools/slash-commands)。

Discord 说明：`/tts` 是 Discord 内置命令，因此 OpenClaw 在该处注册
`/voice` 作为原生命令。文本 `/tts ...` 仍可用。

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

- 命令需要授权的发送者（allowlist/owner 规则仍生效）。
- 必须启用 `commands.text` 或原生命令注册。
- `off|always|inbound|tagged` 为按会话开关（`/tts on` 为 `/tts always` 别名）。
- `limit` 与 `summary` 存在本地 prefs，而非主配置。
- `/tts audio` 生成一次性音频回复（不会开启 TTS）。

## 代理工具

`tts` 工具将文本转为语音并返回 `MEDIA:` 路径。当结果与 Telegram 兼容时，工具会包含 `[[audio_as_voice]]`，以便 Telegram 发送语音气泡。

## Gateway RPC

Gateway 方法：

- `tts.status`
- `tts.enable`
- `tts.disable`
- `tts.convert`
- `tts.setProvider`
- `tts.providers`
