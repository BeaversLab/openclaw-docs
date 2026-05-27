---
summary: "出站回复的文本转语音 — 提供商、角色、斜杠命令和每渠道输出"
read_when:
  - Enabling text-to-speech for replies
  - Configuring a TTS provider, fallback chain, or persona
  - Using /tts commands or directives
title: "文本转语音"
sidebarTitle: "文本转语音 (TTS)"
---

OpenClaw 可以通过 **14 家语音提供商** 将出站回复转换为音频，并在飞书、Matrix、Telegram 和 WhatsApp 上发送原生语音消息，在其他地方发送音频附件，并为电话和 Talk 提供 PCM/Ulaw 流。

TTS 是 Talk 的 `stt-tts` 模式的语音输出部分。提供商原生的 `realtime` Talk 会话会在实时提供商内部合成语音，而不是调用此 TTS 路径，而 `transcription` 会话则不会合成助手语音响应。

## 快速开始

<Steps>
  <Step title="Pick a 提供商"OpenAICLIAPI>
    OpenAI 和 ElevenLabs 是最可靠的托管选项。Microsoft 和
    Local CLI 不需要 API 密钥。有关完整列表，请参阅 [提供商 matrix](#supported-providers)。
  </Step>
  <Step title="设置 API 密钥">
    为您的提供商导出环境变量（例如 `OPENAI_API_KEY`
    、`ELEVENLABS_API_KEY`）。Microsoft 和 Local CLI 不需要密钥。
  </Step>
  <Step title="在配置中启用">
    设置 `messages.tts.auto: "always"` 和 `messages.tts.provider`：

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

  </Step>
  <Step title="在聊天中试用">
    `/tts status` 显示当前状态。`/tts audio Hello from OpenClaw`
    发送一次性音频回复。
  </Step>
</Steps>

<Note>自动 TTS 默认为 **关闭**。当未设置 `messages.tts.provider`OpenClaw 时， OpenClaw 会按照注册表自动选择顺序选择第一个配置的提供商。 内置的 `tts` 代理工具仅限显式意图：普通聊天保持文本状态， 除非用户要求音频、使用 `/tts` 或启用自动 TTS/指令 语音。</Note>

## 支持的提供商

| 提供商            | 认证                                                                                                           | 备注                                                                            |
| ----------------- | -------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------- |
| **Azure 语音**    | `AZURE_SPEECH_KEY` + `AZURE_SPEECH_REGION`（亦作 `AZURE_SPEECH_API_KEY`、`SPEECH_KEY`、`SPEECH_REGION`）       | 原生 Ogg/Opus 语音备注输出和电话功能。                                          |
| **DeepInfra**     | `DEEPINFRA_API_KEY`                                                                                            | 兼容 OpenAI 的 TTS。默认为 `hexgrad/Kokoro-82M`。                               |
| **ElevenLabs**    | `ELEVENLABS_API_KEY` 或 `XI_API_KEY`                                                                           | 语音克隆、多语言，通过 `seed` 确定性生成；为 Discord 语音播放流式传输。         |
| **Google Gemini** | `GEMINI_API_KEY` 或 `GOOGLE_API_KEY`                                                                           | Gemini API 批处理 TTS；通过 `promptTemplate: "audio-profile-v1"` 实现角色感知。 |
| **Gradium**       | `GRADIUM_API_KEY`                                                                                              | 语音备注和电话输出。                                                            |
| **Inworld**       | `INWORLD_API_KEY`                                                                                              | 流式传输 TTS API。原生 Opus 语音备注和 PCM 电话。                               |
| **本地 CLI**      | 无                                                                                                             | 运行配置的本地 TTS 命令。                                                       |
| **Microsoft**     | 无                                                                                                             | 通过 `node-edge-tts` 提供的公共 Edge 神经网络 TTS。尽力而为，无 SLA。           |
| **MiniMax**       | `MINIMAX_API_KEY`（或 Token 套餐：`MINIMAX_OAUTH_TOKEN`、`MINIMAX_CODE_PLAN_KEY`、`MINIMAX_CODING_API_KEY`）   | T2A v2 API。默认为 `speech-2.8-hd`。                                            |
| **OpenAI**        | `OPENAI_API_KEY`                                                                                               | 也用于自动摘要；支持角色 `instructions`。                                       |
| **OpenRouter**    | `OPENROUTER_API_KEY`（可复用 `models.providers.openrouter.apiKey`）                                            | 默认模型 `hexgrad/kokoro-82m`。                                                 |
| **Volcengine**    | `VOLCENGINE_TTS_API_KEY` 或 `BYTEPLUS_SEED_SPEECH_API_KEY`（旧版 AppID/令牌：`VOLCENGINE_TTS_APPID`/`_TOKEN`） | BytePlus Seed Speech HTTP API。                                                 |
| **Vydra**         | `VYDRA_API_KEY`                                                                                                | 共享的图像、视频和语音提供商。                                                  |
| **xAI**           | `XAI_API_KEY`                                                                                                  | xAI 批量 TTS。不支持原生 Opus 语音笔记。                                        |
| **Xiaomi MiMo**   | `XIAOMI_API_KEY`                                                                                               | 通过 Xiaomi 聊天补全实现的 MiMo TTS。                                           |

如果配置了多个提供商，则优先使用选中的提供商，其他作为备选。自动摘要使用 `summaryModel`（或
`agents.defaults.model.primary`），因此如果您启用了摘要功能，该提供商也必须经过身份验证。

<Warning>捆绑的 **Microsoft** 提供商通过 `node-edge-tts` 使用 Microsoft Edge 的在线神经 TTS 服务。这是一项公共 Web 服务，没有发布的 SLA 或配额 — 请将其视为尽力而为的服务。旧版提供商 id `edge` 已 标准化为 `microsoft`，且 `openclaw doctor --fix` 会重写已持久化的 配置；新配置应始终使用 `microsoft`。</Warning>

## 配置

TTS 配置位于 `~/.openclaw/openclaw.json` 中的 `messages.tts` 下。选择一个
预设并调整提供商块：

<Tabs>
  <Tab title="Azure Speech">
```json5
{
  messages: {
    tts: {
      auto: "always",
      provider: "azure-speech",
      providers: {
        "azure-speech": {
          apiKey: "${AZURE_SPEECH_KEY}",
          region: "eastus",
          voice: "en-US-JennyNeural",
          lang: "en-US",
          outputFormat: "audio-24khz-48kbitrate-mono-mp3",
          voiceNoteOutputFormat: "ogg-24khz-16bit-mono-opus",
        },
      },
    },
  },
}
```
  </Tab>
  <Tab title="ElevenLabs">
```json5
{
  messages: {
    tts: {
      auto: "always",
      provider: "elevenlabs",
      providers: {
        elevenlabs: {
          apiKey: "${ELEVENLABS_API_KEY}",
          model: "eleven_multilingual_v2",
          voiceId: "EXAVITQu4vr4xnSDxMaL",
        },
      },
    },
  },
}
```
  </Tab>
  <Tab title="Google Gemini">
```json5
{
  messages: {
    tts: {
      auto: "always",
      provider: "google",
      providers: {
        google: {
          apiKey: "${GEMINI_API_KEY}",
          model: "gemini-3.1-flash-tts-preview",
          voiceName: "Kore",
          // Optional natural-language style prompts:
          // audioProfile: "Speak in a calm, podcast-host tone.",
          // speakerName: "Alex",
        },
      },
    },
  },
}
```
  </Tab>
  <Tab title="Gradium">
```json5
{
  messages: {
    tts: {
      auto: "always",
      provider: "gradium",
      providers: {
        gradium: {
          apiKey: "${GRADIUM_API_KEY}",
          voiceId: "YTpq7expH9539ERJ",
        },
      },
    },
  },
}
```
  </Tab>
  <Tab title="Inworld">
```json5
{
  messages: {
    tts: {
      auto: "always",
      provider: "inworld",
      providers: {
        inworld: {
          apiKey: "${INWORLD_API_KEY}",
          modelId: "inworld-tts-1.5-max",
          voiceId: "Sarah",
          temperature: 0.7,
        },
      },
    },
  },
}
```
  </Tab>
  <Tab title="CLILocal CLI">
```json5
{
  messages: {
    tts: {
      auto: "always",
      provider: "tts-local-cli",
      providers: {
        "tts-local-cli": {
          command: "say",
          args: ["-o", "{{OutputPath}}", "{{Text}}"],
          outputFormat: "wav",
          timeoutMs: 120000,
        },
      },
    },
  },
}
```
  </Tab>
  <Tab title="Microsoft (no key)">
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
          rate: "+0%",
          pitch: "+0%",
        },
      },
    },
  },
}
```
  </Tab>
  <Tab title="MiniMaxMiniMax">
```json5
{
  messages: {
    tts: {
      auto: "always",
      provider: "minimax",
      providers: {
        minimax: {
          apiKey: "${MINIMAX_API_KEY}",
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
  </Tab>
  <Tab title="OpenAIOpenAI + ElevenLabs">
```json5
{
  messages: {
    tts: {
      auto: "always",
      provider: "openai",
      summaryModel: "openai/gpt-4.1-mini",
      modelOverrides: { enabled: true },
      providers: {
        openai: {
          apiKey: "${OPENAI_API_KEY}",
          model: "gpt-4o-mini-tts",
          voice: "alloy",
        },
        elevenlabs: {
          apiKey: "${ELEVENLABS_API_KEY}",
          model: "eleven_multilingual_v2",
          voiceId: "EXAVITQu4vr4xnSDxMaL",
          voiceSettings: { stability: 0.5, similarityBoost: 0.75, style: 0.0, useSpeakerBoost: true, speed: 1.0 },
          applyTextNormalization: "auto",
          languageCode: "en",
        },
      },
    },
  },
}
```
  </Tab>
  <Tab title="OpenRouterOpenRouter">
```json5
{
  messages: {
    tts: {
      auto: "always",
      provider: "openrouter",
      providers: {
        openrouter: {
          apiKey: "${OPENROUTER_API_KEY}",
          model: "hexgrad/kokoro-82m",
          voice: "af_alloy",
          responseFormat: "mp3",
        },
      },
    },
  },
}
```
  </Tab>
  <Tab title="Volcengine">
```json5
{
  messages: {
    tts: {
      auto: "always",
      provider: "volcengine",
      providers: {
        volcengine: {
          apiKey: "${VOLCENGINE_TTS_API_KEY}",
          resourceId: "seed-tts-1.0",
          voice: "en_female_anna_mars_bigtts",
        },
      },
    },
  },
}
```
  </Tab>
  <Tab title="xAI">
```json5
{
  messages: {
    tts: {
      auto: "always",
      provider: "xai",
      providers: {
        xai: {
          apiKey: "${XAI_API_KEY}",
          voiceId: "eve",
          language: "en",
          responseFormat: "mp3",
        },
      },
    },
  },
}
```
  </Tab>
  <Tab title="XiaomiXiaomi MiMo">
```json5
{
  messages: {
    tts: {
      auto: "always",
      provider: "xiaomi",
      providers: {
        xiaomi: {
          apiKey: "${XIAOMI_API_KEY}",
          model: "mimo-v2.5-tts",
          voice: "mimo_default",
          format: "mp3",
        },
      },
    },
  },
}
```
  </Tab>
</Tabs>

### Per-agent voice overrides

Use `agents.list[].tts` when one agent should speak with a different 提供商,
voice, 模型, persona, or auto-TTS mode. The agent block deep-merges over
`messages.tts`, so 提供商 credentials can stay in the global 提供商 config:

```json5
{
  messages: {
    tts: {
      auto: "always",
      provider: "elevenlabs",
      providers: {
        elevenlabs: { apiKey: "${ELEVENLABS_API_KEY}", model: "eleven_multilingual_v2" },
      },
    },
  },
  agents: {
    list: [
      {
        id: "reader",
        tts: {
          providers: {
            elevenlabs: { voiceId: "EXAVITQu4vr4xnSDxMaL" },
          },
        },
      },
    ],
  },
}
```

To pin a per-agent persona, set `agents.list[].tts.persona` alongside 提供商
config — it overrides the global `messages.tts.persona` for that agent only.

自动回复、`/tts audio`、`/tts status` 以及
`tts` agent 工具的优先级顺序：

1. `messages.tts`
2. 活动 `agents.list[].tts`
3. 渠道覆盖，当渠道支持 `channels.<channel>.tts` 时
4. 账户覆盖，当渠道传递 `channels.<channel>.accounts.<id>.tts` 时
5. 此主机的本地 `/tts` 偏好设置
6. inline `[[tts:...]]` 指令（当启用 [模型覆盖](#model-driven-directives) 时）

渠道和账户覆盖使用与 `messages.tts` 相同的形状，
并与较早的层级进行深度合并，因此共享的提供商凭据可以保留在
`messages.tts` 中，而渠道或机器人账户仅更改语音、模型、角色
或自动模式：

```json5
{
  messages: {
    tts: {
      provider: "openai",
      providers: {
        openai: { apiKey: "${OPENAI_API_KEY}", model: "gpt-4o-mini-tts" },
      },
    },
  },
  channels: {
    feishu: {
      accounts: {
        english: {
          tts: {
            providers: {
              openai: { voice: "shimmer" },
            },
          },
        },
      },
    },
  },
}
```

## 角色

**角色** 是一种稳定的语音身份，可以在各个提供商之间
确定性应用。它可以偏好某个提供商，定义提供商中立的提示意图，
并携带特定于提供商的语音、模型、提示模板、种子和语音设置绑定。

### 最小角色

```json5
{
  messages: {
    tts: {
      auto: "always",
      persona: "narrator",
      personas: {
        narrator: {
          label: "Narrator",
          provider: "elevenlabs",
          providers: {
            elevenlabs: { voiceId: "EXAVITQu4vr4xnSDxMaL", modelId: "eleven_multilingual_v2" },
          },
        },
      },
    },
  },
}
```

### 完整角色（提供商中立提示）

```json5
{
  messages: {
    tts: {
      auto: "always",
      persona: "alfred",
      personas: {
        alfred: {
          label: "Alfred",
          description: "Dry, warm British butler narrator.",
          provider: "google",
          fallbackPolicy: "preserve-persona",
          prompt: {
            profile: "A brilliant British butler. Dry, witty, warm, charming, emotionally expressive, never generic.",
            scene: "A quiet late-night study. Close-mic narration for a trusted operator.",
            sampleContext: "The speaker is answering a private technical request with concise confidence and dry warmth.",
            style: "Refined, understated, lightly amused.",
            accent: "British English.",
            pacing: "Measured, with short dramatic pauses.",
            constraints: ["Do not read configuration values aloud.", "Do not explain the persona."],
          },
          providers: {
            google: {
              model: "gemini-3.1-flash-tts-preview",
              voiceName: "Algieba",
              promptTemplate: "audio-profile-v1",
            },
            openai: { model: "gpt-4o-mini-tts", voice: "cedar" },
            elevenlabs: {
              voiceId: "voice_id",
              modelId: "eleven_multilingual_v2",
              seed: 42,
              voiceSettings: {
                stability: 0.65,
                similarityBoost: 0.8,
                style: 0.25,
                useSpeakerBoost: true,
                speed: 0.95,
              },
            },
          },
        },
      },
    },
  },
}
```

### 角色解析

活动角色是确定性选择的：

1. `/tts persona <id>` 本地偏好设置（如果已设置）。
2. `messages.tts.persona`（如果已设置）。
3. 无角色。

提供商选择按显式优先运行：

1. 直接覆盖（CLI、网关、Talk、允许的 TTS 指令）。
2. `/tts provider <id>` 本地偏好设置。
3. 活动角色的 `provider`。
4. `messages.tts.provider`。
5. 注册表自动选择。

对于每次提供商尝试，OpenClaw 按此顺序合并配置：

1. `messages.tts.providers.<id>`
2. `messages.tts.personas.<persona>.providers.<id>`
3. 可信请求覆盖
4. 允许的模型发出的 TTS 指令覆盖

### 提供商如何使用角色提示

Persona 提示字段（`profile`、`scene`、`sampleContext`、`style`、`accent`、
`pacing`、`constraints`）是**提供商无关**的。每个提供商自行决定如何使用它们：

<AccordionGroup>
  <Accordion title="Google Gemini">
    **仅当**有效的 Google 提供商配置设置了 `promptTemplate: "audio-profile-v1"`
    或 `personaPrompt` 时，才会将 Persona 提示字段包装在 Gemini TTS 提示结构中。较旧的 `audioProfile` 和 `speakerName` 字段
    仍会作为 Google 特定的提示文本添加在前面。`[[tts:text]]`OpenClaw 块内的内联音频标签（例如
    `[whispers]` 或 `[laughs]`）会保留
    在 Gemini 转录文本中；OpenClaw 不会生成这些标签。
  </Accordion>
  <Accordion title="OpenAIOpenAI">
    **仅当**未配置显式的 OpenAI `instructions` 时，才会将 Persona 提示字段映射到请求的 `instructions`OpenAI 字段。显式的 `instructions`
    始终优先。
  </Accordion>
  <Accordion title="其他提供商">
    仅使用 `personas.<id>.providers.<provider>` 下的提供商特定的 Persona 绑定。
    除非提供商实现了自己的 Persona 提示映射，否则将忽略 Persona 提示字段。
  </Accordion>
</AccordionGroup>

### 回退策略

当 Persona 对尝试使用的提供商**没有绑定**时，`fallbackPolicy` 控制其行为：

| 策略                | 行为                                                                                                          |
| ------------------- | ------------------------------------------------------------------------------------------------------------- |
| `preserve-persona`  | **默认值。** 提供商无关的提示字段保持可用；提供商可以使用它们，也可以忽略它们。                               |
| `provider-defaults` | 在该次尝试的提示准备中省略 Persona；提供商使用其中性默认值，同时继续回退到其他提供商。                        |
| `fail`              | 使用 `reasonCode: "not_configured"` 和 `personaBinding: "missing"` 跳过该提供商的尝试。仍然会尝试备用提供商。 |

只有当**所有**尝试的提供商都被跳过或失败时，整个 TTS 请求才会失败。

Talk 会话提供商选择是会话范围的。Talk 客户端应从 `talk.catalog` 中选择提供商 ID、模型 ID、语音 ID 和语言环境，并通过 Talk 会话或转移请求传递它们。开启语音会话不应改变 `messages.tts` 或全局 Talk 提供商默认值。

## 模型驱动的指令

默认情况下，助手**可以**发出 `[[tts:...]]` 指令，以覆盖单次回复的语音、模型或速度，外加一个可选的 `[[tts:text]]...[[/tts:text]]` 块，用于仅应在音频中出现的表达提示：

```text
Here you go.

[[tts:voiceId=pMsXgVXv3BLzUgSXRplE model=eleven_v3 speed=1.1]]
[[tts:text]](laughs) Read the song once more.[[/tts:text]]
```

当 `messages.tts.auto` 为 `"tagged"` 时，**必须使用指令**来触发音频。流式块传送会在渠道看到指令之前将其从可见文本中剥离，即使它们分散在相邻的块中。

除非存在 `modelOverrides.allowProvider: true`，否则 `provider=...` 会被忽略。当回复声明 `provider=...` 时，该指令中的其他键仅由该提供商解析；不支持的键将被剥离并作为 TTS 指令警告报告。

**可用的指令键：**

- `provider`（已注册的提供商 ID；需要 `allowProvider: true`）
- `voice` / `voiceName` / `voice_name` / `google_voice` / `voiceId`
- `model` / `google_model`
- `stability`, `similarityBoost`, `style`, `speed`, `useSpeakerBoost`
- `vol` / `volume` (MiniMax 音量，0–10)
- `pitch` (MiniMax 整数音高，−12 到 12；小数值将被截断)
- `emotion` (Volcengine 情感标签)
- `applyTextNormalization` (`auto|on|off`)
- `languageCode` (ISO 639-1)
- `seed`

**完全禁用模型覆盖：**

```json5
{ messages: { tts: { modelOverrides: { enabled: false } } } }
```

**允许在保持其他旋钮可配置的同时切换提供商：**

```json5
{ messages: { tts: { modelOverrides: { enabled: true, allowProvider: true, allowSeed: false } } } }
```

## 斜杠命令

单一命令 `/tts`。在 Discord 上，OpenClaw 还注册了 `/voice`，因为
`/tts` 是 Discord 的内置命令 —— 文本 `/tts ...` 仍然有效。

```text
/tts off | on | status
/tts chat on | off | default
/tts latest
/tts provider <id>
/tts persona <id> | off
/tts limit <chars>
/tts summary off
/tts audio <text>
```

<Note>命令需要授权发送者（适用白名单/所有者规则），并且必须启用 `commands.text` 或本机命令注册。</Note>

行为说明：

- `/tts on` 将本地 TTS 偏好写入 `always`；`/tts off` 将其写入 `off`。
- `/tts chat on|off|default` 为当前聊天写入会话范围的自动 TTS 覆盖。
- `/tts persona <id>` 写入本地角色偏好；`/tts persona off` 清除它。
- `/tts latest` 从当前会话记录中读取最新的助手回复，并作为音频发送一次。它在会话条目上仅存储该回复的哈希值，以抑制重复的语音发送。
- `/tts audio` 生成一次性音频回复（**不**打开 TTS）。
- `limit` 和 `summary` 存储在**本地偏好** 中，而不是主配置中。
- `/tts status` 包含最新尝试的回退诊断信息 —— `Fallback: <primary> -> <used>`、`Attempts: ...` 以及每次尝试的详细信息 (`provider:outcome(reasonCode) latency`)。
- 当启用 TTS 时，`/status` 显示活动 TTS 模式以及配置的提供商、模型、语音和经过清理的自定义端点元数据。

## 每个用户的偏好设置

斜杠命令将本地覆盖写入 `prefsPath`。默认值为
`~/.openclaw/settings/tts.json`；可通过 `OPENCLAW_TTS_PREFS` 环境变量
或 `messages.tts.prefsPath` 进行覆盖。

| 存储字段    | 效果                                    |
| ----------- | --------------------------------------- |
| `auto`      | 本地自动 TTS 覆盖（`always`，`off`，…） |
| `provider`  | 本地主提供商覆盖                        |
| `persona`   | 本地角色覆盖                            |
| `maxLength` | 摘要阈值（默认 `1500` 个字符）          |
| `summarize` | 摘要开关（默认 `true`）                 |

这些设置会覆盖来自 `messages.tts` 的有效配置以及该主机的活动
`agents.list[].tts` 块。

## 输出格式（固定）

TTS 语音传送由渠道能力驱动。渠道插件会通告
语音风格的 TTS 应该向提供商请求原生 `voice-note` 目标还是
保持常规 `audio-file` 合成，并仅标记兼容的输出用于语音
传送。

- **支持语音消息的渠道**：语音消息回复优先使用 Opus（来自 ElevenLabs 的 `opus_48000_64`，来自 OpenAI 的 `opus`）。
  - 48kHz / 64kbps 是语音消息的一个良好折衷方案。
- **飞书 / WhatsApp**：当语音消息回复生成为 MP3/WebM/WAV/M4A
  或其他可能的音频文件时，渠道插件会在发送原生语音消息之前使用 `ffmpeg` 将其转码为 48kHz
  Ogg/Opus 格式。WhatsApp 通过 Baileys `audio` 载荷发送结果，并附带 `ptt: true` 和
  `audio/ogg; codecs=opus`。如果转换失败，飞书会收到原始
  文件作为附件；WhatsApp 发送会失败，而不是发布不兼容的
  PTT 载荷。
- **其他渠道**：MP3（来自 ElevenLabs 的 `mp3_44100_128`，来自 OpenAI 的 `mp3`）。
  - 44.1kHz / 128kbps 是语音清晰度的默认平衡设置。
- **MiniMax**：MP3（MiniMax`speech-2.8-hd`OpenClawMiniMax 模型，32kHz 采样率），用于普通音频附件。对于渠道通告的语音笔记目标，当渠道通告支持转码时，OpenClaw 会在交付前使用 `ffmpeg` 将 MiniMax MP3 转码为 48kHz Opus。
- **Xiaomi MiMo**：默认为 MP3，配置后也可以是 WAV。对于渠道通告的语音笔记目标，当渠道通告支持转码时，OpenClaw 会在交付前使用 XiaomiOpenClawXiaomi`ffmpeg` 将 Xiaomi 输出转码为 48kHz Opus。
- **Local CLI**：使用配置的 CLI`outputFormat`。语音笔记目标会被转换为 Ogg/Opus，电话输出则使用 `ffmpeg` 转换为原始 16 kHz 单声道 PCM。
- **Google Gemini**：Gemini API TTS 返回原始 24kHz PCM。OpenClaw 将其封装为 WAV 用于音频附件，转码为 48kHz Opus 用于语音笔记目标，并为 Talk/电话直接返回 PCM。
- **Gradium**：音频附件为 WAV，语音笔记目标为 Opus，电话为 8 kHz 的 `ulaw_8000`。
- **Inworld**：普通音频附件为 MP3，语音笔记目标为原生 `OGG_OPUS`，Talk/电话为 22050 Hz 的原始 `PCM`。
- **xAI**：默认为 MP3；`responseFormat` 可以是 `mp3`、`wav`、`pcm`、`mulaw` 或 `alaw`OpenClaw。OpenClaw 使用 xAI 的批量 REST TTS 端点并返回完整的音频附件；此提供商路径不使用 xAI 的流式 TTS WebSocket。此路径不支持原生 Opus 语音笔记格式。
- **Microsoft**：使用 `microsoft.outputFormat`（默认为 `audio-24khz-48kbitrate-mono-mp3`）。
  - 捆绑的传输接受 `outputFormat`，但并非所有格式都可从该服务获得。
  - 输出格式值遵循 Microsoft 语音输出格式（包括 Ogg/WebM Opus）。
  - Telegram Telegram `sendVoice` 接受 OGG/MP3/M4A；如果您需要
    确保的 Opus 语音消息，请使用 OpenAI/ElevenLabs。
  - 如果配置的 Microsoft 输出格式失败，OpenClaw 将重试使用 MP3。

OpenAI/ElevenLabs 输出格式是按渠道固定的（见上文）。

## 自动 TTS 行为

当启用 `messages.tts.auto` 时，OpenClaw 将：

- 如果回复已包含媒体或 `MEDIA:` 指令，则跳过 TTS。
- 跳过非常短的回复（10 个字符以下）。
- 当启用摘要时，会对长回复进行摘要，使用
  `summaryModel` （或 `agents.defaults.model.primary`）。
- 将生成的音频附加到回复中。
- 在 `mode: "final"` 中，仍会在文本流完成后为流式最终回复
  发送仅音频的 TTS；生成的媒体会像普通回复附件一样
  经过相同的渠道媒体标准化处理。

如果回复超过 `maxLength` 且摘要已关闭（或没有摘要模型的 API 密钥），
则跳过音频并发送普通文本回复。

```text
Reply -> TTS enabled?
  no  -> send text
  yes -> has media / MEDIA: / short?
          yes -> send text
          no  -> length > limit?
                   no  -> TTS -> attach audio
                   yes -> summary enabled?
                            no  -> send text
                            yes -> summarize -> TTS -> attach audio
```

## 按渠道分类的输出格式

| 目标                                            | 格式                                                                                            |
| ----------------------------------------------- | ----------------------------------------------------------------------------------------------- |
| Feishu / Matrix / Telegram / WhatsApp           | 语音笔记回复首选 **Opus**（来自 ElevenLabs 的 `opus_48000_64`，来自 OpenAI 的 `opus`）。        |
| 48 kHz / 64 kbps 在清晰度和大小之间取得了平衡。 |
| 其他渠道                                        | **MP3**（来自 ElevenLabs 的 `mp3_44100_128`，来自 OpenAI 的 `mp3`）。                           |
| 语音默认使用 44.1 kHz / 128 kbps。              |
| Talk / 电话                                     | 提供商原生 **PCM**（Inworld 22050 Hz，Google 24 kHz），或来自 Gradium 的 `ulaw_8000` 用于电话。 |

各提供商说明：

- **飞书 / WhatsApp 转码：** 当语音笔记回复以 MP3/WebM/WAV/M4A 格式落地时，渠道插件会使用 `ffmpeg` 将其转码为 48 kHz Ogg/Opus 格式。WhatsApp 通过 Baileys 发送，使用 `ptt: true` 和 `audio/ogg; codecs=opus`。如果转换失败：飞书将回退以附加原始文件；WhatsApp 发送将失败，而不是发布不兼容的 PTT 载荷。
- **MiniMax / Xiaomi MiMo：** 默认为 MP3（MiniMax `speech-2.8-hd` 为 32 kHz）；通过 `ffmpeg` 为语音笔记目标转码为 48 kHz Opus 格式。
- **本地 CLI：** 使用配置的 `outputFormat`。语音笔记目标将转换为 Ogg/Opus 格式，电话输出将转换为原始 16 kHz 单声道 PCM 格式。
- **Google Gemini：** 返回原始 24 kHz PCM 格式。OpenClaw 将其封装为 WAV 格式用于附件，为语音笔记目标转码为 48 kHz Opus 格式，并为 Talk/电话直接返回 PCM。
- **Inworld：** MP3 附件，原生 `OGG_OPUS` 语音笔记，原始 `PCM` 22050 Hz 用于 Talk/电话。
- **xAI：** 默认为 MP3；`responseFormat` 可以是 `mp3|wav|pcm|mulaw|alaw`。使用 xAI 的批量 REST 端点——不使用流式 WebSocket TTS。不支持原生 Opus 语音笔记格式。
- **Microsoft：** 使用 `microsoft.outputFormat`（默认 `audio-24khz-48kbitrate-mono-mp3`）。Telegram `sendVoice` 接受 OGG/MP3/M4A；如果您需要保证的 Opus 语音消息，请使用 OpenAI/ElevenLabs。如果配置的 Microsoft 格式失败，OpenClaw 将使用 MP3 重试。

OpenAI 和 ElevenLabs 的输出格式如上所述，针对每个渠道是固定的。

## 字段参考

<AccordionGroup>
  <Accordion title="Top-level messages.tts.*">
    <ParamField path="auto" type='"off" | "always" | "inbound" | "tagged"'>
      自动 TTS 模式。`inbound` 仅在收到语音消息后发送音频；`tagged` 仅在回复包含 `[[tts:...]]` 指令或 `[[tts:text]]` 块时发送音频。
    </ParamField>
    <ParamField path="enabled" type="boolean" deprecated>
      旧版切换开关。`openclaw doctor --fix` 会将其迁移为 `auto`。
    </ParamField>
    <ParamField path="mode" type='"final" | "all"' default="final">
      `"all"` 除最终回复外，还包含工具/块回复。
    </ParamField>
    <ParamField path="provider" type="string"OpenClaw>
      语音提供商 ID。未设置时，OpenClaw 将按注册表自动选择顺序使用第一个配置的提供商。旧版 `provider: "edge"` 会被 `openclaw doctor --fix` 重写为 `"microsoft"`。
    </ParamField>
    <ParamField path="persona" type="string">
      来自 `personas` 的活跃角色 ID。会被规范化为小写。
    </ParamField>
    <ParamField path="personas.<id>" type="object">
      稳定的语音身份。字段包括：`label`、`description`、`provider`、`fallbackPolicy`、`prompt`、`providers.<provider>`。参见 [角色](#personas)。
    </ParamField>
    <ParamField path="summaryModel" type="string">
      用于自动摘要的廉价模型；默认为 `agents.defaults.model.primary`。接受 `provider/model` 或已配置的模型别名。
    </ParamField>
    <ParamField path="modelOverrides" type="object">
      允许模型发出 TTS 指令。`enabled` 默认为 `true`；`allowProvider` 默认为 `false`。
    </ParamField>
    <ParamField path="providers.<id>" type="object">
      提供商自有设置，以语音提供商 ID 为键。旧版直接块（`messages.tts.openai`、`.elevenlabs`、`.microsoft`、`.edge`）会被 `openclaw doctor --fix` 重写；仅提交 `messages.tts.providers.<id>`。
    </ParamField>
    <ParamField path="maxTextLength" type="number">
      TTS 输入字符的硬性上限。如果超出，`/tts audio` 将失败。
    </ParamField>
    <ParamField path="timeoutMs" type="number">
      请求超时时间（毫秒）。
    </ParamField>
    <ParamField path="prefsPath" type="string">
      覆盖本地首选项 JSON 路径（提供商/limit/summary）。默认为 `~/.openclaw/settings/tts.json`。
    </ParamField>
  </Accordion>

<Accordion title="Azure 语音">
  <ParamField path="apiKey" type="string">
    环境变量：`AZURE_SPEECH_KEY`、`AZURE_SPEECH_API_KEY` 或 `SPEECH_KEY`。
  </ParamField>
  <ParamField path="region" type="string">
    Azure 语音区域（例如 `eastus`）。环境变量：`AZURE_SPEECH_REGION` 或 `SPEECH_REGION`。
  </ParamField>
  <ParamField path="endpoint" type="string">
    可选的 Azure 语音端点覆盖（别名 `baseUrl`）。
  </ParamField>
  <ParamField path="voice" type="string">
    Azure 语音 ShortName。默认值 `en-US-JennyNeural`。
  </ParamField>
  <ParamField path="lang" type="string">
    SSML 语言代码。默认值 `en-US`。
  </ParamField>
  <ParamField path="outputFormat" type="string">
    用于标准音频的 Azure `X-Microsoft-OutputFormat`。默认值 `audio-24khz-48kbitrate-mono-mp3`。
  </ParamField>
  <ParamField path="voiceNoteOutputFormat" type="string">
    用于语音笔记输出的 Azure `X-Microsoft-OutputFormat`。默认值 `ogg-24khz-16bit-mono-opus`。
  </ParamField>
</Accordion>

<Accordion title="ElevenLabs">
  <ParamField path="apiKey" type="string">
    回退到 `ELEVENLABS_API_KEY` 或 `XI_API_KEY`。
  </ParamField>
  <ParamField path="model" type="string">
    模型 ID（例如 `eleven_multilingual_v2`、`eleven_v3`）。
  </ParamField>
  <ParamField path="voiceId" type="string">
    ElevenLabs 语音 ID。
  </ParamField>
  <ParamField path="voiceSettings" type="object">
    `stability`、`similarityBoost`、`style`（每个 `0..1`）、`useSpeakerBoost`（`true|false`）、`speed`（`0.5..2.0`、`1.0` = 普通）。
  </ParamField>
  <ParamField path="applyTextNormalization" type='"auto" | "on" | "off"'>
    文本标准化模式。
  </ParamField>
  <ParamField path="languageCode" type="string">
    2字母 ISO 639-1 语言代码（例如 `en`、`de`）。
  </ParamField>
  <ParamField path="seed" type="number">
    用于尽力确定性的整数 `0..4294967295`。
  </ParamField>
  <ParamField path="baseUrl" type="string">
    覆盖 ElevenLabs API 基础 URL。
  </ParamField>
</Accordion>

<Accordion title="Google Gemini">
  <ParamField path="apiKey" type="string">
    回退到 `GEMINI_API_KEY` / `GOOGLE_API_KEY`。如果省略，TTS 可以在环境回退之前重用 `models.providers.google.apiKey`。
  </ParamField>
  <ParamField path="model" type="string">
    Gemini TTS 模型。默认为 `gemini-3.1-flash-tts-preview`。
  </ParamField>
  <ParamField path="voiceName" type="string">
    Gemini 预构建语音名称。默认为 `Kore`。别名：`voice`。
  </ParamField>
  <ParamField path="audioProfile" type="string">
    附加在口语文本之前的自然语言风格提示。
  </ParamField>
  <ParamField path="speakerName" type="string">
    当您的提示使用命名说话者时，附加在口语文本之前的可选说话者标签。
  </ParamField>
  <ParamField path="promptTemplate" type='"audio-profile-v1"'>
    设置为 `audio-profile-v1`，以将活动角色提示字段包装在确定性的 Gemini TTS 提示结构中。
  </ParamField>
  <ParamField path="personaPrompt" type="string">
    附加到模板的“导演备注”的 Google 特定额外角色提示文本。
  </ParamField>
  <ParamField path="baseUrl" type="string">
    仅接受 `https://generativelanguage.googleapis.com`。
  </ParamField>
</Accordion>

<Accordion title="Gradium">
  <ParamField path="apiKey" type="string">
    环境变量：`GRADIUM_API_KEY`。
  </ParamField>
  <ParamField path="baseUrl" type="string">
    默认为 `https://api.gradium.ai`。
  </ParamField>
  <ParamField path="voiceId" type="string">
    默认为 Emma (`YTpq7expH9539ERJ`)。
  </ParamField>
</Accordion>

  <Accordion title="Inworld">
    ### Inworld 主要配置

    <ParamField path="apiKey" type="string">环境变量：`INWORLD_API_KEY`。</ParamField>
    <ParamField path="baseUrl" type="string">默认值 `https://api.inworld.ai`。</ParamField>
    <ParamField path="modelId" type="string">默认值 `inworld-tts-1.5-max`。此外：`inworld-tts-1.5-mini`、`inworld-tts-1-max`、`inworld-tts-1`。</ParamField>
    <ParamField path="voiceId" type="string">默认值 `Sarah`。</ParamField>
    <ParamField path="temperature" type="number">采样温度 `0..2`。</ParamField>

  </Accordion>

<Accordion title="本地 CLI (tts-local-cli)">
  <ParamField path="command" type="string">
    CLI TTS 的本地可执行文件或命令字符串。
  </ParamField>
  <ParamField path="args" type="string[]">
    命令参数。支持 `{{ Text }}`、`{{ OutputPath }}`、`{{ OutputDir }}`、`{{ OutputBase }}` 占位符。
  </ParamField>
  <ParamField path="outputFormat" type='"mp3" | "opus" | "wav"'>
    预期的 CLI 输出格式。默认值 `mp3` 用于音频附件。
  </ParamField>
  <ParamField path="timeoutMs" type="number">
    命令超时时间（毫秒）。默认值 `120000`。
  </ParamField>
  <ParamField path="cwd" type="string">
    可选的命令工作目录。
  </ParamField>
  <ParamField path="env" type="Record<string, string>">
    可选的命令环境变量覆盖。
  </ParamField>
</Accordion>

<Accordion title="APIMicrosoft（无需 API 密钥）">
  <ParamField path="enabled" type="boolean" default="true">
    允许使用 Microsoft 语音。
  </ParamField>
  <ParamField path="voice" type="string">
    Microsoft 神经语音名称（例如 `en-US-MichelleNeural`）。
  </ParamField>
  <ParamField path="lang" type="string">
    语言代码（例如 `en-US`）。
  </ParamField>
  <ParamField path="outputFormat" type="string">
    Microsoft 输出格式。默认为 `audio-24khz-48kbitrate-mono-mp3`。并非所有格式都受附带的 Edge 支持传输支持。
  </ParamField>
  <ParamField path="rate / pitch / volume" type="string">
    百分比字符串（例如 `+10%`，`-5%`）。
  </ParamField>
  <ParamField path="saveSubtitles" type="boolean">
    在音频文件旁边写入 JSON 字幕。
  </ParamField>
  <ParamField path="proxy" type="string">
    Microsoft 语音请求的代理 URL。
  </ParamField>
  <ParamField path="timeoutMs" type="number">
    请求超时覆盖（毫秒）。
  </ParamField>
  <ParamField path="edge.*" type="object" deprecated>
    旧别名。运行 `openclaw doctor --fix` 将持久化配置重写为 `providers.microsoft`。
  </ParamField>
</Accordion>

<Accordion title="MiniMaxMiniMax">
  <ParamField path="apiKey" type="string">
    回退到 `MINIMAX_API_KEY`。通过 `MINIMAX_OAUTH_TOKEN`、`MINIMAX_CODE_PLAN_KEY` 或 `MINIMAX_CODING_API_KEY` 进行 Token Plan 身份验证。
  </ParamField>
  <ParamField path="baseUrl" type="string">
    默认值 `https://api.minimax.io`。环境变量：`MINIMAX_API_HOST`。
  </ParamField>
  <ParamField path="model" type="string">
    默认值 `speech-2.8-hd`。环境变量：`MINIMAX_TTS_MODEL`。
  </ParamField>
  <ParamField path="voiceId" type="string">
    默认值 `English_expressive_narrator`。环境变量：`MINIMAX_TTS_VOICE_ID`。
  </ParamField>
  <ParamField path="speed" type="number">
    `0.5..2.0`。默认值 `1.0`。
  </ParamField>
  <ParamField path="vol" type="number">
    `(0, 10]`。默认值 `1.0`。
  </ParamField>
  <ParamField path="pitch" type="number">
    整数 `-12..12`。默认值 `0`。分数值会在请求前被截断。
  </ParamField>
</Accordion>

<Accordion title="OpenAIOpenAI">
  <ParamField path="apiKey" type="string">
    回退到 `OPENAI_API_KEY`。
  </ParamField>
  <ParamField path="model" type="string" OpenAI>
    OpenAI TTS 模型 ID（例如 `gpt-4o-mini-tts`）。
  </ParamField>
  <ParamField path="voice" type="string">
    语音名称（例如 `alloy`、`cedar`）。
  </ParamField>
  <ParamField path="instructions" type="string" OpenAI>
    显式的 OpenAI `instructions` 字段。设置后，角色提示字段将**不会**自动映射。
  </ParamField>
  <ParamField path="extraBody / extra_body" type="Record<string, unknown>">
    合并到 `/audio/speech`OpenAIOpenAI 请求体中的额外 JSON 字段，位于生成的 OpenAI TTS 字段之后。将其用于 OpenAI 兼容的端点（如 Kokoro），这些端点需要提供商特定的键（如 `lang`）；不安全的原型键将被忽略。
  </ParamField>
  <ParamField path="baseUrl" type="string" OpenAI>
    覆盖 OpenAI TTS 端点。解析顺序：config → `OPENAI_TTS_BASE_URL` → `https://api.openai.com/v1`OpenAI。非默认值将被视为 OpenAI 兼容的 TTS 端点，因此接受自定义模型和语音名称。
  </ParamField>
</Accordion>

<Accordion title="OpenRouterOpenRouter">
  <ParamField path="apiKey" type="string">
    环境变量： `OPENROUTER_API_KEY`。可复用 `models.providers.openrouter.apiKey`。
  </ParamField>
  <ParamField path="baseUrl" type="string">
    默认值 `https://openrouter.ai/api/v1`。旧版 `https://openrouter.ai/v1` 会被标准化。
  </ParamField>
  <ParamField path="model" type="string">
    默认值 `hexgrad/kokoro-82m`。别名： `modelId`。
  </ParamField>
  <ParamField path="voice" type="string">
    默认值 `af_alloy`。别名： `voiceId`。
  </ParamField>
  <ParamField path="responseFormat" type='"mp3" | "pcm"'>
    默认值 `mp3`。
  </ParamField>
  <ParamField path="speed" type="number">
    提供商原生速度覆盖。
  </ParamField>
</Accordion>

<Accordion title="火山引擎 (BytePlus Seed Speech)">
  <ParamField path="apiKey" type="string">
    环境变量：`VOLCENGINE_TTS_API_KEY` 或 `BYTEPLUS_SEED_SPEECH_API_KEY`。
  </ParamField>
  <ParamField path="resourceId" type="string">
    默认值 `seed-tts-1.0`。环境变量：`VOLCENGINE_TTS_RESOURCE_ID`。当您的项目拥有 TTS 2.0 权限时，请使用 `seed-tts-2.0`。
  </ParamField>
  <ParamField path="appKey" type="string">
    App key 请求头。默认值 `aGjiRDfUWi`。环境变量：`VOLCENGINE_TTS_APP_KEY`。
  </ParamField>
  <ParamField path="baseUrl" type="string">
    覆盖 Seed Speech TTS HTTP 端点。环境变量：`VOLCENGINE_TTS_BASE_URL`。
  </ParamField>
  <ParamField path="voice" type="string">
    语音类型。默认值 `en_female_anna_mars_bigtts`。环境变量：`VOLCENGINE_TTS_VOICE`。
  </ParamField>
  <ParamField path="speedRatio" type="number">
    提供商原生速度比率。
  </ParamField>
  <ParamField path="emotion" type="string">
    提供商原生情感标签。
  </ParamField>
  <ParamField path="appId / token / cluster" type="string" deprecated>
    旧版火山引擎语音控制台字段。环境变量：`VOLCENGINE_TTS_APPID`、`VOLCENGINE_TTS_TOKEN`、`VOLCENGINE_TTS_CLUSTER`（默认值 `volcano_tts`）。
  </ParamField>
</Accordion>

<Accordion title="xAI">
  <ParamField path="apiKey" type="string">
    环境变量：`XAI_API_KEY`。
  </ParamField>
  <ParamField path="baseUrl" type="string">
    默认值 `https://api.x.ai/v1`。环境变量：`XAI_BASE_URL`。
  </ParamField>
  <ParamField path="voiceId" type="string">
    默认值 `eve`。可用声音：`ara`、`eve`、`leo`、`rex`、`sal`、`una`。
  </ParamField>
  <ParamField path="language" type="string">
    BCP-47 语言代码或 `auto`。默认值 `en`。
  </ParamField>
  <ParamField path="responseFormat" type='"mp3" | "wav" | "pcm" | "mulaw" | "alaw"'>
    默认值 `mp3`。
  </ParamField>
  <ParamField path="speed" type="number">
    提供程序原生的速度覆盖。
  </ParamField>
</Accordion>

  <Accordion title="XiaomiXiaomi MiMo">
    <ParamField path="apiKey" type="string">环境变量：`XIAOMI_API_KEY`。</ParamField>
    <ParamField path="baseUrl" type="string">默认值 `https://api.xiaomimimo.com/v1`。环境变量：`XIAOMI_BASE_URL`。</ParamField>
    <ParamField path="model" type="string">默认值 `mimo-v2.5-tts`。环境变量：`XIAOMI_TTS_MODEL`。同时也支持 `mimo-v2-tts`。</ParamField>
    <ParamField path="voice" type="string">默认值 `mimo_default`。环境变量：`XIAOMI_TTS_VOICE`。</ParamField>
    <ParamField path="format" type='"mp3" | "wav"'>默认值 `mp3`。环境变量：`XIAOMI_TTS_FORMAT`。</ParamField>
    <ParamField path="style" type="string">作为用户消息发送的可选自然语言风格指令；不会被朗读。</ParamField>
  </Accordion>
</AccordionGroup>

## Agent 工具

`tts`MatrixTelegramWhatsAppWhatsApp 工具将文本转换为语音并返回音频附件用于
回复。在飞书、Matrix、Telegram 和 WhatsApp 上，音频会
以语音消息的形式而不是文件附件的形式发送。当 `ffmpeg` 可用时，
飞书和 WhatsApp 可以在此路径上转码非 Opus 格式的 TTS 输出。

WhatsApp 通过 Baileys 将音频作为 PTT 语音笔记（具有 WhatsAppBaileys`audio` 和
`ptt: true`）发送，并且**单独**发送可见文本，而不是作为 PTT 音频的一部分，因为
客户端在语音笔记上并不总是能一致地渲染字幕。

该工具接受可选的 `channel` 和 `timeoutMs` 字段；`timeoutMs` 是
每次调用的提供商请求超时时间（以毫秒为单位）。每次调用的值会覆盖
`messages.tts.timeoutMs`；配置的 TTS 超时会覆盖任何插件编写的
提供商默认值。

## Gateway RPC

| 方法              | 用途                              |
| ----------------- | --------------------------------- |
| `tts.status`      | 读取当前 TTS 状态和上次尝试。     |
| `tts.enable`      | 将本地自动首选项设置为 `always`。 |
| `tts.disable`     | 将本地自动首选项设置为 `off`。    |
| `tts.convert`     | 一次性文本转语音。                |
| `tts.setProvider` | 设置本地提供商偏好。              |
| `tts.setPersona`  | 设置本地角色偏好。                |
| `tts.providers`   | 列出已配置的提供商及其状态。      |

## 服务链接

- [OpenAI 文本转语音指南](OpenAIhttps://platform.openai.com/docs/guides/text-to-speech)
- [OpenAI Audio API 参考](OpenAIAPIhttps://platform.openai.com/docs/api-reference/audio)
- [Azure Speech REST 文本转语音](https://learn.microsoft.com/azure/ai-services/speech-service/rest-text-to-speech)
- [Azure Speech 提供商](/zh/providers/azure-speech)
- [ElevenLabs 文本转语音](https://elevenlabs.io/docs/api-reference/text-to-speech)
- [ElevenLabs 身份验证](https://elevenlabs.io/docs/api-reference/authentication)
- [Gradium](/zh/providers/gradium)
- [Inworld TTS API](APIhttps://docs.inworld.ai/tts/tts)
- [MiniMax T2A v2 API](MiniMaxAPIhttps://platform.minimaxi.com/document/T2A%20V2)
- [Volcengine TTS HTTP API](API/en/providers/volcengine#text-to-speech)
- [Xiaomi MiMo 语音合成](Xiaomi/en/providers/xiaomi#text-to-speech)
- [node-edge-tts](https://github.com/SchneeHertz/node-edge-tts)
- [Microsoft 语音输出格式](https://learn.microsoft.com/azure/ai-services/speech-service/rest-text-to-speech#audio-outputs)
- [xAI 文本转语音](https://docs.x.ai/developers/rest-api-reference/inference/voice#text-to-speech-rest)

## 相关

- [媒体概览](/zh/tools/media-overview)
- [音乐生成](/zh/tools/music-generation)
- [视频生成](/zh/tools/video-generation)
- [斜杠命令](/zh/tools/slash-commands)
- [语音通话插件](/zh/plugins/voice-call)
