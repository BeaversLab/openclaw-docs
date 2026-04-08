---
summary: "用于出站回复的文本转语音 (TTS)"
read_when:
  - Enabling text-to-speech for replies
  - Configuring TTS providers or limits
  - Using /tts commands
title: "文本转语音（旧路径）"
---

# 文本转语音 (TTS)

OpenClaw 可以使用 ElevenLabs、Microsoft、MiniMax 或 OpenAI 将出站回复转换为音频。
在 OpenClaw 可以发送音频的任何地方，它都能工作。

## 支持的服务

- **ElevenLabs**（主要或备用提供商）
- **Microsoft**（主要或备用提供商；当前捆绑的实现使用 `node-edge-tts`）
- **MiniMax**（主要或备用提供商；使用 T2A v2 API）
- **OpenAI**（主要或备用提供商；也用于生成摘要）

### Microsoft 语音说明

捆绑的 Microsoft 语音提供商目前通过 `node-edge-tts` 库使用 Microsoft Edge 的在线
神经 TTS 服务。它是一项托管服务（非本地），
使用 Microsoft 端点，并且不需要 API 密钥。
`node-edge-tts` 公开了语音配置选项和输出格式，但
并非所有选项都受该服务支持。使用 `edge` 的旧配置和指令输入
仍然有效，并被标准化为 `microsoft`。

由于此路径是公共 Web 服务，没有发布 SLA 或配额，
请将其视为尽力而为的服务。如果您需要保证的限制和支持，请使用 OpenAI
或 ElevenLabs。

## 可选密钥

如果您想要 OpenAI、ElevenLabs 或 MiniMax：

- `ELEVENLABS_API_KEY` (或 `XI_API_KEY`)
- `MINIMAX_API_KEY`
- `OPENAI_API_KEY`

Microsoft 语音**不**需要 API 密钥。

如果配置了多个提供商，则首先使用所选提供商，其他提供商作为备用选项。
自动摘要使用已配置的 `summaryModel` (或 `agents.defaults.model.primary`)，
因此如果您启用摘要，该提供商也必须经过身份验证。

## 服务链接

- [OpenAI 文本转语音指南](https://platform.openai.com/docs/guides/text-to-speech)
- [OpenAI 音频 API 参考](https://platform.openai.com/docs/api-reference/audio)
- [ElevenLabs 文本转语音](https://elevenlabs.io/docs/api-reference/text-to-speech)
- [ElevenLabs 身份验证](https://elevenlabs.io/docs/api-reference/authentication)
- [MiniMax T2A v2 API](https://platform.minimaxi.com/document/T2A%20V2)
- [node-edge-tts](https://github.com/SchneeHertz/node-edge-tts)
- [Microsoft 语音输出格式](https://learn.microsoft.com/azure/ai-services/speech-service/rest-text-to-speech#audio-outputs)

## 默认情况下是否启用？

否。自动 TTS 默认为 **关闭**。可以在配置中通过
`messages.tts.auto` 启用，或每个会话通过 `/tts always`（别名：`/tts on`）启用。

当 `messages.tts.provider` 未设置时，OpenClaw 将按注册表自动选择顺序选择第一个配置的
语音提供商。

## 配置

TTS 配置位于 `openclaw.json` 中的 `messages.tts` 下。
完整架构位于 [Gateway(网关) 配置](/en/gateway/configuration)。

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
      providers: {
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
  },
}
```

### Microsoft 主用（无 API 密钥）

```json5
{
  messages: {
    tts: {
      auto: "always",
      provider: "microsoft",
      providers: {
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
  },
}
```

### MiniMax 主用

```json5
{
  messages: {
    tts: {
      auto: "always",
      provider: "minimax",
      providers: {
        minimax: {
          apiKey: "minimax_api_key",
          baseUrl: "https://api.minimax.io",
          model: "speech-2.8-hd",
          voiceId: "English_expressive_narrator",
          speed: 1.0,
          vol: 1.0,
          pitch: 0,
        },
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
      providers: {
        microsoft: {
          enabled: false,
        },
      },
    },
  },
}
```

### 自定义限制 + 首选项路径

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

### 仅在收到入站语音消息后以音频回复

```json5
{
  messages: {
    tts: {
      auto: "inbound",
    },
  },
}
```

### 针对长回复禁用自动摘要

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
  - `inbound` 仅在收到入站语音消息后发送音频。
  - `tagged` 仅在回复包含 `[[tts]]` 标签时发送音频。
- `enabled`：旧版切换开关（doctor 会将其迁移至 `auto`）。
- `mode`：`"final"`（默认）或 `"all"`（包括工具/区块回复）。
- `provider`：语音提供商 ID，例如 `"elevenlabs"`、`"microsoft"`、`"minimax"` 或 `"openai"`（备用是自动的）。
- 如果 `provider` **未设置**，OpenClaw 将使用注册表自动选择顺序中的第一个已配置语音提供商。
- 旧版 `provider: "edge"` 仍然有效，并且会被标准化为 `microsoft`。
- `summaryModel`：用于自动摘要的可选廉价模型；默认为 `agents.defaults.model.primary`。
  - 接受 `provider/model` 或已配置的模型别名。
- `modelOverrides`：允许模型发出 TTS 指令（默认开启）。
  - `allowProvider` 默认为 `false`（提供商切换为可选启用）。
- `providers.<id>`：由语音提供商 ID 键入的提供商拥有的设置。
- 旧版直接提供商块（`messages.tts.openai`、`messages.tts.elevenlabs`、`messages.tts.microsoft`、`messages.tts.edge`）会在加载时自动迁移到 `messages.tts.providers.<id>`。
- `maxTextLength`：TTS 输入的硬性上限（字符）。如果超出，`/tts audio` 将失败。
- `timeoutMs`：请求超时（毫秒）。
- `prefsPath`：覆盖本地首选项 JSON 路径（提供商/限制/摘要）。
- `apiKey` 值会回退到环境变量（`ELEVENLABS_API_KEY`/`XI_API_KEY`、`MINIMAX_API_KEY`、`OPENAI_API_KEY`）。
- `providers.elevenlabs.baseUrl`：覆盖 ElevenLabs API 基础 URL。
- `providers.openai.baseUrl`：覆盖 OpenAI TTS 端点。
  - 解析顺序：`messages.tts.providers.openai.baseUrl` -> `OPENAI_TTS_BASE_URL` -> `https://api.openai.com/v1`
  - 非默认值被视为 OpenAI 兼容的 TTS 端点，因此接受自定义模型和语音名称。
- `providers.elevenlabs.voiceSettings`：
  - `stability`、`similarityBoost`、`style`：`0..1`
  - `useSpeakerBoost`：`true|false`
  - `speed`：`0.5..2.0`（1.0 = 正常）
- `providers.elevenlabs.applyTextNormalization`：`auto|on|off`
- `providers.elevenlabs.languageCode`：2 字母 ISO 639-1 代码（例如 `en`、`de`）
- `providers.elevenlabs.seed`：整数 `0..4294967295`（尽力确定性）
- `providers.minimax.baseUrl`：覆盖 MiniMax API 基础 URL（默认 `https://api.minimax.io`，环境变量：`MINIMAX_API_HOST`）。
- `providers.minimax.model`：TTS 模型（默认 `speech-2.8-hd`，环境变量：`MINIMAX_TTS_MODEL`）。
- `providers.minimax.voiceId`：语音标识符（默认 `English_expressive_narrator`，环境变量：`MINIMAX_TTS_VOICE_ID`）。
- `providers.minimax.speed`：播放速度 `0.5..2.0`（默认 1.0）。
- `providers.minimax.vol`：音量 `(0, 10]`（默认 1.0；必须大于 0）。
- `providers.minimax.pitch`：音高偏移 `-12..12`（默认 0）。
- `providers.microsoft.enabled`：允许使用 Microsoft 语音（默认 `true`；无 API 密钥）。
- `providers.microsoft.voice`：Microsoft 神经语音名称（例如 `en-US-MichelleNeural`）。
- `providers.microsoft.lang`：语言代码（例如 `en-US`）。
- `providers.microsoft.outputFormat`：Microsoft 输出格式（例如 `audio-24khz-48kbitrate-mono-mp3`）。
  - 有关有效值，请参阅 Microsoft Speech 输出格式；并非所有格式都受捆绑的 Edge 后端传输支持。
- `providers.microsoft.rate` / `providers.microsoft.pitch` / `providers.microsoft.volume`：百分比字符串（例如 `+10%`，`-5%`）。
- `providers.microsoft.saveSubtitles`：在音频文件旁边写入 JSON 字幕。
- `providers.microsoft.proxy`：Microsoft 语音请求的代理 URL。
- `providers.microsoft.timeoutMs`：请求超时覆盖（毫秒）。
- `edge.*`：相同 Microsoft 设置的旧版别名。

## 模型驱动的覆盖（默认开启）

默认情况下，模型**可以**为单个回复发出 TTS 指令。
当 `messages.tts.auto` 为 `tagged` 时，必须通过这些指令来触发音频。

启用后，模型可以发出 `[[tts:...]]` 指令来覆盖单个回复的语音，
还可以添加可选的 `[[tts:text]]...[[/tts:text]]` 块，以提供
仅应出现在音频中的表达性标签（如笑声、歌唱提示等）。

除非 `modelOverrides.allowProvider: true`，否则 `provider=...` 指令将被忽略。

回复载荷示例：

```
Here you go.

[[tts:voiceId=pMsXgVXv3BLzUgSXRplE model=eleven_v3 speed=1.1]]
[[tts:text]](laughs) Read the song once more.[[/tts:text]]
```

可用的指令键（启用时）：

- `provider`（已注册的语音提供商 ID，例如 `openai`、`elevenlabs`、`minimax` 或 `microsoft`；需要 `allowProvider: true`）
- `voice`（OpenAI 语音）或 `voiceId`（ElevenLabs / MiniMax）
- `model`（OpenAI TTS 模型、ElevenLabs 模型 ID 或 MiniMax 模型）
- `stability`、`similarityBoost`、`style`、`speed`、`useSpeakerBoost`
- `vol` / `volume`（MiniMax 音量，0-10）
- `pitch`（MiniMax 音高，-12 到 12）
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
`~/.openclaw/settings/tts.json`，使用 `OPENCLAW_TTS_PREFS` 或
`messages.tts.prefsPath` 覆盖）。

存储字段：

- `enabled`
- `provider`
- `maxLength`（摘要阈值；默认 1500 个字符）
- `summarize`（默认 `true`）

这些将覆盖该主机的 `messages.tts.*`。

## 输出格式（固定）

- **Feishu / Matrix / Telegram / WhatsApp**：Opus 语音消息（来自 ElevenLabs 的 `opus_48000_64`，来自 OpenAI 的 `opus`）。
  - 48kHz / 64kbps 是语音消息的一个良好权衡。
- **其他渠道**：MP3（来自 ElevenLabs 的 `mp3_44100_128`，来自 OpenAI 的 `mp3`）。
  - 44.1kHz / 128kbps 是语音清晰度的默认平衡。
- **MiniMax**：MP3（`speech-2.8-hd` 模型，32kHz 采样率）。语音备注格式不受原生支持；请使用 OpenAI 或 ElevenLabs 以获得有保证的 Opus 语音消息。
- **Microsoft**：使用 `microsoft.outputFormat`（默认为 `audio-24khz-48kbitrate-mono-mp3`）。
  - 内置传输接受一个 `outputFormat`，但并非所有格式都可用。
  - 输出格式值遵循 Microsoft 语音输出格式（包括 Ogg/WebM Opus）。
  - Telegram `sendVoice` 接受 OGG/MP3/M4A；如果您需要
    有保证的 Opus 语音消息，请使用 OpenAI/ElevenLabs。
  - 如果配置的 Microsoft 输出格式失败，OpenClaw 将使用 MP3 重试。

OpenAI/ElevenLabs 输出格式是按渠道固定的（见上文）。

## 自动 TTS 行为

启用后，OpenClaw：

- 如果回复已包含媒体或 `MEDIA:` 指令，则跳过 TTS。
- 跳过非常短的回复（< 10 个字符）。
- 在使用 `agents.defaults.model.primary`（或 `summaryModel`）启用时，会对长回复进行总结。
- 将生成的音频附加到回复中。

如果回复超过 `maxLength` 且未启用总结（或没有总结模型的
API 密钥），则
跳过音频并发送普通文本回复。

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

Discord 注意：`/tts` 是 Discord 内置命令，因此 OpenClaw 在此处注册
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

注意事项：

- 命令需要经过授权的发件人（允许列表/所有者规则仍然适用）。
- 必须启用 `commands.text` 或本机命令注册。
- `off|always|inbound|tagged` 是按会话切换的开关（`/tts on` 是 `/tts always` 的别名）。
- `limit` 和 `summary` 存储在本地首选项中，而不是主配置中。
- `/tts audio` 生成一次性音频回复（不会开启 TTS）。
- `/tts status` 包括最新尝试的后备可见性：
  - 成功后备：`Fallback: <primary> -> <used>` 加上 `Attempts: ...`
  - failure: `Error: ...` plus `Attempts: ...`
  - detailed diagnostics: `Attempt details: provider:outcome(reasonCode) latency`
- OpenAI 和 ElevenLabs API 故障现在包含解析后的提供商错误详情和请求 ID（当提供商返回时），这些信息会显示在 TTS 错误/日志中。

## Agent 工具

`tts` 工具将文本转换为语音，并返回音频附件用于回复传递。当渠道是 Feishu、Matrix、Telegram 或 WhatsApp 时，音频将以语音消息而不是文件附件的形式发送。

## Gateway(网关) RPC

Gateway(网关) 方法：

- `tts.status`
- `tts.enable`
- `tts.disable`
- `tts.convert`
- `tts.setProvider`
- `tts.providers`
