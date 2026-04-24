---
summary: "用于 outbound 回复的文本转语音 (TTS)"
read_when:
  - Enabling text-to-speech for replies
  - Configuring TTS providers or limits
  - Using /tts commands
title: "文本转语音"
---

# 文本转语音 (TTS)

OpenClaw 可以使用 ElevenLabs、Google Gemini、Microsoft、MiniMax、OpenAI 或 xAI 将 outbound 回复转换为音频。
在 OpenClaw 可以发送音频的任何地方，它都可以工作。

## 支持的服务

- **ElevenLabs**（主要或备用提供商）
- **Google Gemini**（主要或备用提供商；使用 Gemini API TTS）
- **Microsoft**（主要或备用 提供商；当前的捆绑实现使用 `node-edge-tts`）
- **MiniMax**（主要或备用提供商；使用 T2A v2 API）
- **OpenAI**（主要或备用提供商；也用于生成摘要）
- **xAI**（主要或备用 提供商；使用 xAI TTS API）

### Microsoft 语音说明

捆绑的 Microsoft 语音提供商目前通过 `node-edge-tts` 库使用 Microsoft Edge 的在线神经 TTS 服务。这是一项托管服务（非本地），使用 Microsoft 端点，并且不需要 API 密钥。
`node-edge-tts` 公开了语音配置选项和输出格式，但并非所有选项都受该服务支持。使用 `edge` 的旧版配置和指令输入仍然有效，并被规范化为 `microsoft`。

由于此路径是没有发布 SLA 或配额的公共 Web 服务，因此请将其视为尽力而为的服务。如果您需要保证的限制和支持，请使用 OpenAI
或 ElevenLabs。

## 可选键

如果您想要 OpenAI、ElevenLabs、Google Gemini、MiniMax 或 xAI：

- `ELEVENLABS_API_KEY` (或 `XI_API_KEY`)
- `GEMINI_API_KEY` (或 `GOOGLE_API_KEY`)
- `MINIMAX_API_KEY`
- `OPENAI_API_KEY`
- `XAI_API_KEY`

Microsoft 语音**不**需要 API 密钥。

如果配置了多个提供商，则优先使用选定的提供商，其他的作为备用选项。
自动摘要使用配置的 `summaryModel`（或 `agents.defaults.model.primary`），
因此如果您启用了摘要功能，则该提供商也必须通过身份验证。

## 服务链接

- [OpenAI 文字转语音指南](https://platform.openai.com/docs/guides/text-to-speech)
- [OpenAI 音频 API 参考](https://platform.openai.com/docs/api-reference/audio)
- [ElevenLabs 文字转语音](https://elevenlabs.io/docs/api-reference/text-to-speech)
- [ElevenLabs 身份验证](https://elevenlabs.io/docs/api-reference/authentication)
- [MiniMax T2A v2 API](https://platform.minimaxi.com/document/T2A%20V2)
- [node-edge-tts](https://github.com/SchneeHertz/node-edge-tts)
- [Microsoft 语音输出格式](https://learn.microsoft.com/azure/ai-services/speech-service/rest-text-to-speech#audio-outputs)
- [xAI 文字转语音](https://docs.x.ai/developers/rest-api-reference/inference/voice#text-to-speech-rest)

## 默认情况下是否启用？

否。默认情况下，自动 TTS 处于**关闭**状态。可以在配置中通过
`messages.tts.auto` 启用，或本地通过 `/tts on` 启用。

当未设置 `messages.tts.provider` 时，OpenClaw 会按照注册表自动选择顺序
选择第一个配置的语音提供商。

## 配置

TTS 配置位于 `openclaw.json` 中的 `messages.tts` 下。
完整架构位于 [Gateway(网关) 配置](/zh/gateway/configuration)。

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

### OpenAI 为主，ElevenLabs 为备

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

### Microsoft 为主（无 API 密钥）

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

### MiniMax 为主

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

### Google Gemini 为主

```json5
{
  messages: {
    tts: {
      auto: "always",
      provider: "google",
      providers: {
        google: {
          apiKey: "gemini_api_key",
          model: "gemini-3.1-flash-tts-preview",
          voiceName: "Kore",
        },
      },
    },
  },
}
```

Google Gemini TTS 使用 Gemini API 密钥路径。此处可以使用限制为 Gemini API 的 Google Cloud Console API 密钥，该密钥与内置 Google 图像生成提供商使用的密钥类型相同。解析顺序为 `messages.tts.providers.google.apiKey` -> `models.providers.google.apiKey` -> `GEMINI_API_KEY` -> `GOOGLE_API_KEY`。

### xAI 主要

```json5
{
  messages: {
    tts: {
      auto: "always",
      provider: "xai",
      providers: {
        xai: {
          apiKey: "xai_api_key",
          voiceId: "eve",
          language: "en",
          responseFormat: "mp3",
          speed: 1.0,
        },
      },
    },
  },
}
```

xAI TTS 使用与内置 Grok 模型提供商相同的 `XAI_API_KEY` 路径。
解析顺序为 `messages.tts.providers.xai.apiKey` -> `XAI_API_KEY`。
当前可用的语音为 `ara`、`eve`、`leo`、`rex`、`sal` 和 `una`；`eve` 为
默认项。`language` 接受 BCP-47 标签或 `auto`。

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

### 禁用长回复的自动摘要

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
  - `inbound` 仅在接收到入站语音消息后发送音频。
  - `tagged` 仅在回复包含 `[[tts:key=value]]` 指令或 `[[tts:text]]...[[/tts:text]]` 块时发送音频。
- `enabled`：旧版切换开关（doctor 会将其迁移到 `auto`）。
- `mode`：`"final"`（默认）或 `"all"`（包括工具/块回复）。
- `provider`：语音提供商 ID，例如 `"elevenlabs"`、`"google"`、`"microsoft"`、`"minimax"` 或 `"openai"`（回退是自动的）。
- 如果未设置 `provider`，OpenClaw 将使用注册表中按自动选择顺序排列的第一个配置的语音提供商。
- 旧版的 `provider: "edge"` 仍然有效，并被规范化为 `microsoft`。
- `summaryModel`：用于自动摘要的可选低成本模型；默认为 `agents.defaults.model.primary`。
  - 接受 `provider/model` 或已配置的模型别名。
- `modelOverrides`：允许模型发出 TTS 指令（默认开启）。
  - `allowProvider` 默认为 `false`（提供商切换是可选项）。
- `providers.<id>`: 按语音提供商 ID 键入的提供商自有设置。
- 旧的直接提供商块（`messages.tts.openai`、`messages.tts.elevenlabs`、`messages.tts.microsoft`、`messages.tts.edge`）会在加载时自动迁移到 `messages.tts.providers.<id>`。
- `maxTextLength`: TTS 输入的硬性上限（字符）。如果超出，`/tts audio` 将失败。
- `timeoutMs`: 请求超时（毫秒）。
- `prefsPath`: 覆盖本地首选项 JSON 路径（提供商/limit/summary）。
- `apiKey` 的值会回退到环境变量（`ELEVENLABS_API_KEY`/`XI_API_KEY`、`GEMINI_API_KEY`/`GOOGLE_API_KEY`、`MINIMAX_API_KEY`、`OPENAI_API_KEY`）。
- `providers.elevenlabs.baseUrl`：覆盖 ElevenLabs API 基础 URL。
- `providers.openai.baseUrl`：覆盖 OpenAI TTS 端点。
  - 解析顺序：`messages.tts.providers.openai.baseUrl` -> `OPENAI_TTS_BASE_URL` -> `https://api.openai.com/v1`
  - 非默认值将被视为兼容 OpenAI 的 TTS 端点，因此接受自定义模型和语音名称。
- `providers.elevenlabs.voiceSettings`：
  - `stability`、`similarityBoost`、`style`：`0..1`
  - `useSpeakerBoost`：`true|false`
  - `speed`：`0.5..2.0`（1.0 = 正常）
- `providers.elevenlabs.applyTextNormalization`：`auto|on|off`
- `providers.elevenlabs.languageCode`：2 字母 ISO 639-1 代码（例如 `en`、`de`）
- `providers.elevenlabs.seed`：整数 `0..4294967295`（尽力保证确定性）
- `providers.minimax.baseUrl`：覆盖 MiniMax API 基础 URL（默认 `https://api.minimax.io`，环境变量：`MINIMAX_API_HOST`）。
- `providers.minimax.model`：TTS 模型（默认 `speech-2.8-hd`，环境变量：`MINIMAX_TTS_MODEL`）。
- `providers.minimax.voiceId`：语音标识符（默认 `English_expressive_narrator`，环境变量：`MINIMAX_TTS_VOICE_ID`）。
- `providers.minimax.speed`：播放速度 `0.5..2.0`（默认 1.0）。
- `providers.minimax.vol`：音量 `(0, 10]`（默认 1.0；必须大于 0）。
- `providers.minimax.pitch`：音高偏移 `-12..12`（默认为 0）。
- `providers.google.model`：Gemini TTS 模型（默认为 `gemini-3.1-flash-tts-preview`）。
- `providers.google.voiceName`：Gemini 预构建语音名称（默认为 `Kore`；`voice` 也可接受）。
- `providers.google.baseUrl`：覆盖 Gemini API 基础 URL。仅接受 `https://generativelanguage.googleapis.com`。
  - 如果省略 `messages.tts.providers.google.apiKey`，TTS 可以在环境变量回退之前重用 `models.providers.google.apiKey`。
- `providers.xai.apiKey`：xAI TTS API 密钥（环境变量：`XAI_API_KEY`）。
- `providers.xai.baseUrl`：覆盖 xAI TTS 基础 URL（默认为 `https://api.x.ai/v1`，环境变量：`XAI_BASE_URL`）。
- `providers.xai.voiceId`：xAI 语音 ID（默认 `eve`；当前可用语音：`ara`、`eve`、`leo`、`rex`、`sal`、`una`）。
- `providers.xai.language`：BCP-47 语言代码或 `auto`（默认 `en`）。
- `providers.xai.responseFormat`：`mp3`、`wav`、`pcm`、`mulaw` 或 `alaw`（默认 `mp3`）。
- `providers.xai.speed`：提供商原生的速度覆盖设置。
- `providers.microsoft.enabled`：允许使用 Microsoft 语音服务（默认为 `true`；无 API 密钥）。
- `providers.microsoft.voice`：Microsoft 神经语音名称（例如 `en-US-MichelleNeural`）。
- `providers.microsoft.lang`：语言代码（例如 `en-US`）。
- `providers.microsoft.outputFormat`：Microsoft 输出格式（例如 `audio-24khz-48kbitrate-mono-mp3`）。
  - 有关有效值，请参阅 Microsoft 语音输出格式；并非所有格式都受随附的 Edge 支持传输支持。
- `providers.microsoft.rate` / `providers.microsoft.pitch` / `providers.microsoft.volume`：百分比字符串（例如 `+10%`，`-5%`）。
- `providers.microsoft.saveSubtitles`：在音频文件旁边写入 JSON 字幕。
- `providers.microsoft.proxy`：Microsoft 语音请求的代理 URL。
- `providers.microsoft.timeoutMs`：请求超时覆盖（毫秒）。
- `edge.*`：相同 Microsoft 设置的旧别名。

## 模型驱动的覆盖（默认开启）

默认情况下，模型**可以**为单次回复发出 TTS 指令。
当 `messages.tts.auto` 为 `tagged` 时，这些指令是触发音频所必需的。

启用后，模型可以发出 `[[tts:...]]` 指令来覆盖单次回复的语音，还可以发出一个可选的 `[[tts:text]]...[[/tts:text]]` 块来提供表现力标签（笑声、歌唱提示等），这些标签应仅出现在音频中。

除非 `modelOverrides.allowProvider: true`，否则 `provider=...` 指令将被忽略。

回复负载示例：

```
Here you go.

[[tts:voiceId=pMsXgVXv3BLzUgSXRplE model=eleven_v3 speed=1.1]]
[[tts:text]](laughs) Read the song once more.[[/tts:text]]
```

可用的指令键（启用时）：

- `provider`（已注册的语音提供商 ID，例如 `openai`、`elevenlabs`、`google`、`minimax` 或 `microsoft`；需要 `allowProvider: true`）
- `voice`（OpenAI 语音）、`voiceName` / `voice_name` / `google_voice`（Google 语音）或 `voiceId`（ElevenLabs / MiniMax / xAI）
- `model`（OpenAI TTS 模型、ElevenLabs 模型 ID 或 MiniMax 模型）或 `google_model`（Google TTS 模型）
- `stability`、`similarityBoost`、`style`、`speed`、`useSpeakerBoost`
- `vol` / `volume` (MiniMax 音量，0-10)
- `pitch` (MiniMax 音调，-12 到 12)
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

可选允许列表（在保持其他旋钮可配置的同时启用提供商切换）：

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

## 用户首选项

斜杠命令将本地覆盖写入 `prefsPath` (默认：
`~/.openclaw/settings/tts.json`，使用 `OPENCLAW_TTS_PREFS` 或
`messages.tts.prefsPath` 覆盖)。

存储字段：

- `enabled`
- `provider`
- `maxLength` (摘要阈值；默认 1500 个字符)
- `summarize`（默认 `true`）

这些将覆盖该主机 `messages.tts.*` 的设置。

## 输出格式（固定）

- **Feishu / Matrix / Telegram / WhatsApp**：Opus 语音消息（来自 ElevenLabs 的 `opus_48000_64`，来自 OpenAI 的 `opus`）。
  - 48kHz / 64kbps 是语音消息的一个良好折衷方案。
- **其他渠道**：MP3（来自 ElevenLabs 的 `mp3_44100_128`，来自 OpenAI 的 `mp3`）。
  - 44.1kHz / 128kbps 是语音清晰度的默认平衡值。
- **MiniMax**：MP3（`speech-2.8-hd` 模型，32kHz 采样率）。不支持语音备注格式；请使用 OpenAI 或 ElevenLabs 以确保获得 Opus 语音消息。
- **Google Gemini**：Gemini API TTS 返回原始 24kHz PCM。OpenClaw 将其封装为 WAV 格式用于音频附件，并直接返回 PCM 用于 Talk/电话。此路径不支持原生 Opus 语音备忘录格式。
- **xAI**：默认为 MP3；`responseFormat` 可以是 `mp3`、`wav`、`pcm`、`mulaw` 或 `alaw`。OpenClaw 使用 xAI 的批量 REST TTS 端点并返回完整的音频附件；此提供商路径不使用 xAI 的流式 TTS WebSocket。此路径不支持原生 Opus 语音备忘录格式。
- **Microsoft**：使用 `microsoft.outputFormat`（默认为 `audio-24khz-48kbitrate-mono-mp3`）。
  - 捆绑的传输接受一个 `outputFormat`，但并非所有格式都适用于该服务。
  - 输出格式值遵循 Microsoft Speech 输出格式（包括 Ogg/WebM Opus）。
  - Telegram `sendVoice` 接受 OGG/MP3/M4A；如果您需要
    保证的 Opus 语音消息，请使用 OpenAI/ElevenLabs。
  - 如果配置的 Microsoft 输出格式失败，OpenClaw 将使用 MP3 重试。

OpenAI/ElevenLabs 输出格式是按渠道固定的（见上文）。

## 自动 TTS 行为

启用后，OpenClaw 将：

- 如果回复已包含媒体或 `MEDIA:` 指令，则跳过 TTS。
- 跳过非常短的回复（< 10 个字符）。
- 当使用 `agents.defaults.model.primary`（或 `summaryModel`）启用时，总结长回复。
- 将生成的音频附加到回复中。

如果回复超过 `maxLength` 且总结已关闭（或没有用于
总结 API 的 API 密钥），音频
将被跳过并发送正常的文本回复。

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
有关启用详情，请参阅 [斜杠命令](/zh/tools/slash-commands)。

Discord 注意：`/tts` 是 Discord 的内置命令，因此 OpenClaw 在那里将 `/voice` 注册为原生命令。文本 `/tts ...` 仍然有效。

```
/tts off
/tts on
/tts status
/tts provider openai
/tts limit 2000
/tts summary off
/tts audio Hello from OpenClaw
```

注意：

- 命令需要经过授权的发件人（允许列表/所有者规则仍然适用）。
- 必须启用 `commands.text` 或原生命令注册。
- 配置 `messages.tts.auto` 接受 `off|always|inbound|tagged`。
- `/tts on` 将本地 TTS 偏好设置写入 `always`；`/tts off` 将其写入 `off`。
- 当您需要 `inbound` 或 `tagged` 默认值时，请使用配置。
- `limit` 和 `summary` 存储在本地首选项中，而不是主配置中。
- `/tts audio` 生成一次性音频回复（不会开启 TTS）。
- `/tts status` 包含最新尝试的回退可见性：
  - 成功回退：`Fallback: <primary> -> <used>` 加上 `Attempts: ...`
  - 失败：`Error: ...` 加上 `Attempts: ...`
  - 详细诊断：`Attempt details: provider:outcome(reasonCode) latency`
- OpenAI 和 ElevenLabs API 失败现在包括解析后的提供商错误详情和请求 ID（当由提供商返回时），这些信息会显示在 TTS 错误/日志中。

## Agent 工具

`tts` 工具将文本转换为语音并返回音频附件，用于回复发送。当渠道是 Feishu、Matrix、Telegram 或 WhatsApp 时，音频将以语音消息而非文件附件的形式发送。

## Gateway(网关) RPC

Gateway(网关) 方法：

- `tts.status`
- `tts.enable`
- `tts.disable`
- `tts.convert`
- `tts.setProvider`
- `tts.providers`
