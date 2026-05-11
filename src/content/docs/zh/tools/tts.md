---
summary: "出站回复的文本转语音 — 提供商、角色、斜杠命令和每渠道输出"
read_when:
  - Enabling text-to-speech for replies
  - Configuring a TTS provider, fallback chain, or persona
  - Using /tts commands or directives
title: "文本转语音"
sidebarTitle: "文本转语音 (TTS)"
---

OpenClaw 可以将出站回复通过 **13 家语音提供商** 转换为音频，并在 Feishu、Matrix、Telegram 和 WhatsApp 上发送原生语音消息，在其他地方发送音频附件，并为电话和 Talk 发送 PCM/Ulaw 流。

## 快速开始

<Steps>
  <Step title="选择提供商">
    OpenAI 和 ElevenLabs 是最可靠的托管选项。Microsoft 和
    本地 CLI 不需要 API 密钥。有关完整列表，请参阅 [提供商矩阵](#supported-providers)
    。
  </Step>
  <Step title="设置 API 密钥">
    为您的提供商导出环境变量（例如 `OPENAI_API_KEY`，
    `ELEVENLABS_API_KEY`）。Microsoft 和本地 CLI 不需要密钥。
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
  <Step title="在聊天中尝试">
    `/tts status` 显示当前状态。`/tts audio Hello from OpenClaw`
    发送一次性音频回复。
  </Step>
</Steps>

<Note>自动 TTS 默认为 **关闭**。当 `messages.tts.provider` 未设置时， OpenClaw 会按照注册表自动选择顺序选择第一个已配置的提供商。</Note>

## 支持的提供商

| 提供商            | 认证                                                                                                            | 备注                                                                     |
| ----------------- | --------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------ |
| **Azure Speech**  | `AZURE_SPEECH_KEY` + `AZURE_SPEECH_REGION` (也包括 `AZURE_SPEECH_API_KEY`、`SPEECH_KEY`、`SPEECH_REGION`)       | 原生 Ogg/Opus 语音笔记输出和电话功能。                                   |
| **ElevenLabs**    | `ELEVENLABS_API_KEY` 或 `XI_API_KEY`                                                                            | 语音克隆、多语言、通过 `seed` 确定性输出。                               |
| **Google Gemini** | `GEMINI_API_KEY` 或 `GOOGLE_API_KEY`                                                                            | Gemini API TTS；通过 `promptTemplate: "audio-profile-v1"` 实现角色感知。 |
| **Gradium**       | `GRADIUM_API_KEY`                                                                                               | 语音笔记和电话输出。                                                     |
| **Inworld**       | `INWORLD_API_KEY`                                                                                               | 流式 TTS API。原生 Opus 语音笔记和 PCM 电话。                            |
| **本地 CLI**      | 无                                                                                                              | 运行已配置的本地 TTS 命令。                                              |
| **Microsoft**     | 无                                                                                                              | 通过 `node-edge-tts` 提供的公共 Edge 神经 TTS。尽力而为，无 SLA。        |
| **MiniMax**       | `MINIMAX_API_KEY`（或 Token 计划：`MINIMAX_OAUTH_TOKEN`、`MINIMAX_CODE_PLAN_KEY`、`MINIMAX_CODING_API_KEY`）    | T2A v2 API。默认为 `speech-2.8-hd`。                                     |
| **OpenAI**        | `OPENAI_API_KEY`                                                                                                | 也用于自动摘要；支持角色 `instructions`。                                |
| **OpenRouter**    | `OPENROUTER_API_KEY`（可以重用 `models.providers.openrouter.apiKey`）                                           | 默认模型 `hexgrad/kokoro-82m`。                                          |
| **Volcengine**    | `VOLCENGINE_TTS_API_KEY` 或 `BYTEPLUS_SEED_SPEECH_API_KEY`（旧版 AppID/token：`VOLCENGINE_TTS_APPID`/`_TOKEN`） | BytePlus Seed Speech HTTP API。                                          |
| **Vydra**         | `VYDRA_API_KEY`                                                                                                 | 共享图像、视频和语音提供商。                                             |
| **xAI**           | `XAI_API_KEY`                                                                                                   | xAI 批量 TTS。不支持原生 Opus 语音笔记。                                 |
| **Xiaomi MiMo**   | `XIAOMI_API_KEY`                                                                                                | 通过 Xiaomi 聊天补全实现的 MiMo TTS。                                    |

如果配置了多个提供商，首先使用选定的提供商，其他作为回退选项。自动摘要使用 `summaryModel`（或 `agents.defaults.model.primary`），因此如果您保持摘要启用，则该提供商也必须经过身份验证。

<Warning>内置的 **Microsoft** 提供商通过 `node-edge-tts` 使用 Microsoft Edge 的在线神经 TTS 服务。这是一项没有发布 SLA 或配额的公共网络服务 —— 请将其视为尽力而为的服务。旧版提供商 ID `edge` 会被 标准化为 `microsoft`，并且 `openclaw doctor --fix` 会重写持久化 配置；新配置应始终使用 `microsoft`。</Warning>

## 配置

TTS 配置位于 `messages.tts` 下的 `~/.openclaw/openclaw.json` 中。选择一个预设并调整提供商块：

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
  <Tab title="Local CLI">
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
  <Tab title="MiniMax">
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
  <Tab title="OpenAI + ElevenLabs">
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
  <Tab title="OpenRouter">
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
  <Tab title="Xiaomi MiMo">
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

### 针对每个代理的语音覆盖

当某个代理应使用不同的提供商、语音、模型、角色或自动 TTS 模式发声时，请使用 `agents.list[].tts`。代理块会对 `messages.tts` 进行深度合并，因此提供商凭据可以保留在全局提供商配置中：

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

要固定特定于代理的角色，请将 `agents.list[].tts.persona` 与提供商配置一起设置 — 它将仅覆盖该代理的全局 `messages.tts.persona`。

自动回复、`/tts audio`、`/tts status` 以及 `tts` agent 工具的优先级顺序：

1. `messages.tts`
2. 激活的 `agents.list[].tts`
3. 渠道覆盖，当渠道支持 `channels.<channel>.tts` 时
4. 账户覆盖，当渠道传递 `channels.<channel>.accounts.<id>.tts` 时
5. 此主机的本地 `/tts` 偏好设置
6. 启用 [模型覆盖](#model-driven-directives) 时的内联 `[[tts:...]]` 指令

渠道和账户覆盖使用与 `messages.tts` 相同的形状，并与早期层级深度合并，因此共享的提供商凭证可以保留在 `messages.tts` 中，而渠道或机器人账户仅更改语音、模型、角色或自动模式：

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

## 角色 (Personas)

**角色** 是一种稳定的语音身份，可以跨提供商确定性应用。它可以首选一个提供商，定义提供商中立的提示意图，并携带针对语音、模型、提示模板、种子和语音设置的特定于提供商的绑定。

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

1. `/tts persona <id>` 本地偏好（如果已设置）。
2. `messages.tts.persona`（如果已设置）。
3. 无角色。

提供商选择按显式优先运行：

1. 直接覆盖（CLI、网关、Talk、允许的 TTS 指令）。
2. `/tts provider <id>` 本地偏好。
3. 活动角色的 `provider`。
4. `messages.tts.provider`。
5. 注册表自动选择。

对于每次提供商尝试，OpenClaw 按以下顺序合并配置：

1. `messages.tts.providers.<id>`
2. `messages.tts.personas.<persona>.providers.<id>`
3. 受信任请求覆盖
4. 允许的模型发出的 TTS 指令覆盖

### 提供商如何使用角色提示

角色提示字段（`profile`、`scene`、`sampleContext`、`style`、`accent`、
`pacing`、`constraints`）是 **提供商中立** 的。每个提供商自行决定如何使用它们：

<AccordionGroup>
  <Accordion title="Google Gemini">
    仅当有效的 Google 提供商配置设置了 `promptTemplate: "audio-profile-v1"`
    或 `personaPrompt` 时，才将角色提示字段包装在 Gemini TTS 提示结构中。较旧的 `audioProfile` 和 `speakerName` 字段
    仍然作为 Google 特定的提示文本添加在前面。`[[tts:text]]` 块内的内联音频标签（例如
    `[whispers]` 或 `[laughs]`）会保留
    在 Gemini 转录中；OpenClaw 不会生成这些标签。
  </Accordion>
  <Accordion title="OpenAI">
    仅当未配置显式的 OpenAI `instructions` 时，才将角色提示字段映射到请求 `instructions` 字段。显式的 `instructions`
    始终优先。
  </Accordion>
  <Accordion title="其他提供商">
    仅使用 `personas.<id>.providers.<provider>` 下的特定于提供商的角色绑定。
    除非提供商实现了自己的角色提示映射，否则角色提示字段将被忽略。
  </Accordion>
</AccordionGroup>

### 回退策略

当角色对尝试使用的提供商**没有绑定**时，`fallbackPolicy` 控制其行为：

| 策略                | 行为                                                                                                           |
| ------------------- | -------------------------------------------------------------------------------------------------------------- |
| `preserve-persona`  | **默认。** 与提供商无关的提示字段保持可用；提供商可以使用它们，也可以忽略它们。                                |
| `provider-defaults` | 在该次尝试的提示准备中省略角色；提供商使用其中性默认值，同时继续回退到其他提供商。                             |
| `fail`              | 跳过该提供商尝试，并带有 `reasonCode: "not_configured"` 和 `personaBinding: "missing"`。仍然会尝试回退提供商。 |

只有当**所有**尝试的提供商都被跳过或失败时，整个 TTS 请求才会失败。

## 模型驱动的指令

默认情况下，助手**可以**发出 `[[tts:...]]` 指令以针对单次回复覆盖
声音、模型或速度，外加一个可选的
`[[tts:text]]...[[/tts:text]]` 块，用于仅应出现在音频中的表达提示：

```text
Here you go.

[[tts:voiceId=pMsXgVXv3BLzUgSXRplE model=eleven_v3 speed=1.1]]
[[tts:text]](laughs) Read the song once more.[[/tts:text]]
```

当 `messages.tts.auto` 为 `"tagged"` 时，**必须使用指令** 来触发
音频。流式块传输会在渠道看到之前从可见文本中剥离指令，
即使指令分散在相邻的块中也是如此。

除非存在 `modelOverrides.allowProvider: true`，否则 `provider=...` 会被忽略。当
回复声明 `provider=...` 时，该指令中的其他键
仅由该提供商解析；不支持的键将被剥离并作为 TTS
指令警告进行报告。

**可用的指令键：**

- `provider`（注册的提供商 ID；需要 `allowProvider: true`）
- `voice` / `voiceName` / `voice_name` / `google_voice` / `voiceId`
- `model` / `google_model`
- `stability`、`similarityBoost`、`style`、`speed`、`useSpeakerBoost`
- `vol` / `volume`（MiniMax 音量，0–10）
- `pitch`（MiniMax 整数音高，−12 到 12；小数值会被截断）
- `emotion`（Volcengine 情感标签）
- `applyTextNormalization`（`auto|on|off`）
- `languageCode`（ISO 639-1）
- `seed`

**完全禁用模型覆盖：**

```json5
{ messages: { tts: { modelOverrides: { enabled: false } } } }
```

**允许切换提供商同时保持其他旋钮可配置：**

```json5
{ messages: { tts: { modelOverrides: { enabled: true, allowProvider: true, allowSeed: false } } } }
```

## 斜杠命令

单一命令 `/tts`。在 Discord 上，OpenClaw 也会注册 `/voice`，因为
`/tts` 是 Discord 的内置命令 — 文本 `/tts ...` 仍然有效。

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

<Note>命令需要授权的发件人（适用白名单/所有者规则），并且必须启用 `commands.text` 或本机命令注册。</Note>

行为说明：

- `/tts on` 将本地 TTS 偏好写入 `always`；`/tts off` 将其写入 `off`。
- `/tts chat on|off|default` 为当前聊天写入会话范围的自动 TTS 覆盖设置。
- `/tts persona <id>` 写入本地角色偏好；`/tts persona off` 清除它。
- `/tts latest` 从当前会话记录中读取最新的助手回复，并作为音频发送一次。它仅在该会话条目上存储该回复的哈希值，以抑制重复的语音发送。
- `/tts audio` 生成一次性音频回复（**不会**开启 TTS）。
- `limit` 和 `summary` 存储在 **本地偏好** 中，而不是主配置中。
- `/tts status` 包含最新尝试的回退诊断信息 —— `Fallback: <primary> -> <used>`、`Attempts: ...` 以及每次尝试的详细信息（`provider:outcome(reasonCode) latency`）。
- 当启用 TTS 时，`/status` 显示活动的 TTS 模式以及配置的提供商、模型、声音和经过清理的自定义端点元数据。

## 每用户偏好

斜杠命令将本地覆盖设置写入 `prefsPath`。默认值为
`~/.openclaw/settings/tts.json`；可以通过 `OPENCLAW_TTS_PREFS` 环境变量
或 `messages.tts.prefsPath` 进行覆盖。

| 存储的字段  | 效果                                       |
| ----------- | ------------------------------------------ |
| `auto`      | 本地自动 TTS 覆盖设置 (`always`, `off`, …) |
| `provider`  | 本地主提供商覆盖设置                       |
| `persona`   | 本地角色覆盖设置                           |
| `maxLength` | 摘要阈值（默认 `1500` 个字符）             |
| `summarize` | 摘要开关（默认 `true`）                    |

这些覆盖设置将覆盖 `messages.tts` 的有效配置以及该主机的活动
`agents.list[].tts` 块。

## 输出格式（固定）

TTS 语音传送由渠道功能驱动。渠道插件会通知语音风格的 TTS 是应该向提供商请求原生 `voice-note` 目标，还是保持正常的 `audio-file` 合成，并仅标记兼容的输出用于语音传送。

- **支持语音消息的渠道**：语音消息回复首选 Opus（来自 ElevenLabs 的 `opus_48000_64`，来自 OpenAI 的 `opus`）。
  - 48kHz / 64kbps 是语音消息的一个良好权衡。
- **飞书 / WhatsApp**：当语音消息回复生成为 MP3/WebM/WAV/M4A 或其他可能的音频文件时，渠道插件会在发送原生语音消息之前，使用 `ffmpeg` 将其转码为 48kHz Ogg/Opus。WhatsApp 通过 Baileys `audio` 载荷发送结果，并包含 `ptt: true` 和 `audio/ogg; codecs=opus`。如果转换失败，飞书将收到原始文件作为附件；WhatsApp 发送将失败，而不是发布不兼容的 PTT 载荷。
- **BlueBubbles**：在正常音频文件路径上保留提供商合成；MP3 和 CAF 输出被标记为 iMessage 语音备忘录传送。
- **其他渠道**：MP3（来自 ElevenLabs 的 `mp3_44100_128`，来自 OpenAI 的 `mp3`）。
  - 44.1kHz / 128kbps 是语音清晰度的默认平衡值。
- **MiniMax**：MP3（`speech-2.8-hd` 模型，32kHz 采样率）用于普通音频附件。对于渠道通告的语音消息目标，当渠道通告支持转码时，OpenClaw 会在传送前使用 `ffmpeg` 将 MiniMax MP3 转码为 48kHz Opus。
- **Xiaomi MiMo**：默认为 MP3，配置后则使用 WAV。对于渠道通告的语音消息目标，当渠道通告支持转码时，OpenClaw 会在传送前使用 `ffmpeg` 将 Xiaomi 输出转码为 48kHz Opus。
- **Local CLI**：使用配置的 `outputFormat`。语音消息目标将被转换为 Ogg/Opus，电话输出将被转换为原始 16 kHz 单声道 PCM，使用 `ffmpeg`。
- **Google Gemini**: Gemini API TTS 返回原始 24kHz PCM。OpenClaw 将其封装为 WAV 格式用于音频附件，转码为 48kHz Opus 用于语音备注目标，并直接向 Talk/电话通话返回 PCM。
- **Gradium**: 音频附件使用 WAV，语音备注目标使用 Opus，电话通话使用 8 kHz 的 `ulaw_8000`。
- **Inworld**: 普通音频附件使用 MP3，语音备注目标使用原生 `OGG_OPUS`，Talk/电话通话使用 22050 Hz 的原始 `PCM`。
- **xAI**: 默认为 MP3；`responseFormat` 可以是 `mp3`、`wav`、`pcm`、`mulaw` 或 `alaw`。OpenClaw 使用 xAI 的批量 REST TTS 端点并返回完整的音频附件；此提供商路径不使用 xAI 的流式 TTS WebSocket。此路径不支持原生 Opus 语音备注格式。
- **Microsoft**: 使用 `microsoft.outputFormat`（默认 `audio-24khz-48kbitrate-mono-mp3`）。
  - 捆绑的传输接受 `outputFormat`，但并非所有格式都可在服务中使用。
  - 输出格式值遵循 Microsoft Speech 输出格式（包括 Ogg/WebM Opus）。
  - Telegram `sendVoice` 接受 OGG/MP3/M4A；如果您需要保证的 Opus 语音消息，请使用 OpenAI/ElevenLabs。
  - 如果配置的 Microsoft 输出格式失败，OpenClaw 将使用 MP3 重试。

OpenAI/ElevenLabs 输出格式是按渠道固定的（见上文）。

## Auto-TTS 行为

启用 `messages.tts.auto` 后，OpenClaw：

- 如果回复已包含媒体或 `MEDIA:` 指令，则跳过 TTS。
- 跳过非常短的回复（10 个字符以下）。
- 当启用摘要时，使用 `summaryModel`（或 `agents.defaults.model.primary`）对长回复进行摘要。
- 将生成的音频附加到回复中。
- 在 `mode: "final"` 中，文本流完成后仍为流式最终回复发送仅音频 TTS；生成的媒体会经过与普通回复附件相同的渠道媒体标准化处理。

如果回复超过 `maxLength` 且摘要已关闭（或者没有摘要模型的 API 密钥），将跳过音频并发送正常的文本回复。

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

## 按渠道划分的输出格式

| 目标                                  | 格式                                                                                                                              |
| ------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------- |
| Feishu / Matrix / Telegram / WhatsApp | 语音笔记回复首选 **Opus**（来自 ElevenLabs 的 `opus_48000_64`，来自 OpenAI 的 `opus`）。48 kHz / 64 kbps 平衡了清晰度和文件大小。 |
| 其他渠道                              | **MP3**（来自 ElevenLabs 的 `mp3_44100_128`，来自 OpenAI 的 `mp3`）。语音默认为 44.1 kHz / 128 kbps。                             |
| Talk / 电话                           | 提供商原生 **PCM**（Inworld 22050 Hz，Google 24 kHz），或来自 Gradium 的 `ulaw_8000` 用于电话。                                   |

各提供商说明：

- **Feishu / WhatsApp 转码：** 当语音笔记回复为 MP3/WebM/WAV/M4A 格式时，渠道插件会使用 `ffmpeg` 将其转码为 48 kHz Ogg/Opus。WhatsApp 通过 Baileys 并使用 `ptt: true` 和 `audio/ogg; codecs=opus` 发送。如果转换失败：Feishu 将回退以附加原始文件；WhatsApp 发送失败，而不是发布不兼容的 PTT 负载。
- **MiniMax / Xiaomi MiMo：** 默认 MP3（MiniMax `speech-2.8-hd` 为 32 kHz）；通过 `ffmpeg` 为语音笔记目标转码为 48 kHz Opus。
- **本地 CLI：** 使用配置的 `outputFormat`。语音笔记目标转换为 Ogg/Opus，电话输出转换为原始 16 kHz 单声道 PCM。
- **Google Gemini：** 返回原始 24 kHz PCM。OpenClaw 将其封装为 WAV 用于附件，为语音笔记目标转码为 48 kHz Opus，为 Talk/电话直接返回 PCM。
- **Inworld：** MP3 附件，原生 `OGG_OPUS` 语音笔记，Talk/电话的原始 `PCM` 22050 Hz。
- **xAI：** 默认为 MP3；`responseFormat` 可能 `mp3|wav|pcm|mulaw|alaw`。使用 xAI 的批量 REST 端点 —— 不使用流式 WebSocket TTS。不支持原生 Opus 语音笔记格式。
- **Microsoft：** 使用 `microsoft.outputFormat`（默认为 `audio-24khz-48kbitrate-mono-mp3`）。Telegram `sendVoice` 接受 OGG/MP3/M4A；如果您需要确保 Opus 语音消息，请使用 OpenAI/ElevenLabs。如果配置的 Microsoft 格式失败，OpenClaw 将使用 MP3 重试。

OpenAI 和 ElevenLabs 的输出格式按渠道固定，如上所列。

## 字段参考

<AccordionGroup>
  <Accordion title="Top-level messages.tts.*">
    <ParamField path="auto" type='"off" | "always" | "inbound" | "tagged"'>
      自动 TTS 模式。`inbound` 仅在接收到入站语音消息后发送音频；`tagged` 仅在回复包含 `[[tts:...]]` 指令或 `[[tts:text]]` 块时发送音频。
    </ParamField>
    <ParamField path="enabled" type="boolean" deprecated>
      旧版开关。`openclaw doctor --fix` 会将其迁移到 `auto`。
    </ParamField>
    <ParamField path="mode" type='"final" | "all"' default="final">
      `"all"` 除了最终回复外，还包含工具/块回复。
    </ParamField>
    <ParamField path="provider" type="string">
      语音提供商 ID。未设置时，OpenClaw 将按注册表自动选择顺序使用第一个配置的提供商。旧版 `provider: "edge"` 会被 `openclaw doctor --fix` 重写为 `"microsoft"`。
    </ParamField>
    <ParamField path="persona" type="string">
      来自 `personas` 的活跃角色 ID。已标准化为小写。
    </ParamField>
    <ParamField path="personas.<id>" type="object">
      稳定的语音标识。字段：`label`、`description`、`provider`、`fallbackPolicy`、`prompt`、`providers.<provider>`。参见 [Personas](#personas)。
    </ParamField>
    <ParamField path="summaryModel" type="string">
      用于自动摘要的廉价模型；默认为 `agents.defaults.model.primary`。接受 `provider/model` 或已配置的模型别名。
    </ParamField>
    <ParamField path="modelOverrides" type="object">
      允许模型发出 TTS 指令。`enabled` 默认为 `true`；`allowProvider` 默认为 `false`。
    </ParamField>
    <ParamField path="providers.<id>" type="object">
      按语音提供商 ID 键入的提供商自有设置。旧版直接块（`messages.tts.openai`、`.elevenlabs`、`.microsoft`、`.edge`）由 `openclaw doctor --fix` 重写；仅提交 `messages.tts.providers.<id>`。
    </ParamField>
    <ParamField path="maxTextLength" type="number">
      TTS 输入字符的硬上限。如果超出，`/tts audio` 将失败。
    </ParamField>
    <ParamField path="timeoutMs" type="number">
      请求超时（毫秒）。
    </ParamField>
    <ParamField path="prefsPath" type="string">
      覆盖本地首选项 JSON 路径 (提供商/limit/summary)。默认为 `~/.openclaw/settings/tts.json`。
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
    Azure 语音 ShortName。默认为 `en-US-JennyNeural`。
  </ParamField>
  <ParamField path="lang" type="string">
    SSML 语言代码。默认为 `en-US`。
  </ParamField>
  <ParamField path="outputFormat" type="string">
    标准音频的 Azure `X-Microsoft-OutputFormat`。默认为 `audio-24khz-48kbitrate-mono-mp3`。
  </ParamField>
  <ParamField path="voiceNoteOutputFormat" type="string">
    语音便条输出的 Azure `X-Microsoft-OutputFormat`。默认为 `ogg-24khz-16bit-mono-opus`。
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
    `stability`、`similarityBoost`、`style`（每个 `0..1`）、`useSpeakerBoost`（`true|false`）、`speed`（`0.5..2.0`、`1.0` = normal）。
  </ParamField>
  <ParamField path="applyTextNormalization" type='"auto" | "on" | "off"'>
    文本规范化模式。
  </ParamField>
  <ParamField path="languageCode" type="string">
    2 个字母的 ISO 639-1 代码（例如 `en`、`de`）。
  </ParamField>
  <ParamField path="seed" type="number">
    整数 `0..4294967295` 用于尽力确定性行为。
  </ParamField>
  <ParamField path="baseUrl" type="string">
    覆盖 ElevenLabs API 基础 URL。
  </ParamField>
</Accordion>

<Accordion title="Google Gemini">
  <ParamField path="apiKey" type="string">
    回退到 `GEMINI_API_KEY` / `GOOGLE_API_KEY`。如果省略，TTS 可以在环境变量回退之前重用 `models.providers.google.apiKey`。
  </ParamField>
  <ParamField path="model" type="string">
    Gemini TTS 模型。默认为 `gemini-3.1-flash-tts-preview`。
  </ParamField>
  <ParamField path="voiceName" type="string">
    Gemini 预构建语音名称。默认为 `Kore`。别名：`voice`。
  </ParamField>
  <ParamField path="audioProfile" type="string">
    在口语文本之前预置的自然语言风格提示。
  </ParamField>
  <ParamField path="speakerName" type="string">
    当您的提示使用命名说话人时，在口语文本之前预置的可选说话人标签。
  </ParamField>
  <ParamField path="promptTemplate" type='"audio-profile-v1"'>
    设置为 `audio-profile-v1` 以将活跃的 persona 提示字段包装在确定性的 Gemini TTS 提示结构中。
  </ParamField>
  <ParamField path="personaPrompt" type="string">
    附加到模板 Director's Notes 的特定于 Google 的额外 persona 提示文本。
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
  <ParamField path="apiKey" type="string">
    环境变量： `INWORLD_API_KEY`。
  </ParamField>
  <ParamField path="baseUrl" type="string">
    默认值 `https://api.inworld.ai`。
  </ParamField>
  <ParamField path="modelId" type="string">
    默认值 `inworld-tts-1.5-max`。可选： `inworld-tts-1.5-mini`， `inworld-tts-1-max`， `inworld-tts-1`。
  </ParamField>
  <ParamField path="voiceId" type="string">
    默认值 `Sarah`。
  </ParamField>
  <ParamField path="temperature" type="number">
    采样温度 `0..2`。
  </ParamField>
</Accordion>

<Accordion title="本地 CLI (tts-local-cli)">
  <ParamField path="command" type="string">
    CLI TTS 的本地可执行文件或命令字符串。
  </ParamField>
  <ParamField path="args" type="string[]">
    命令参数。支持 `{{ Text }}`， `{{ OutputPath }}`， `{{ OutputDir }}`， `{{ OutputBase }}` 占位符。
  </ParamField>
  <ParamField path="outputFormat" type='"mp3" | "opus" | "wav"'>
    预期的 CLI 输出格式。音频附件默认为 `mp3`。
  </ParamField>
  <ParamField path="timeoutMs" type="number">
    命令超时时间（毫秒）。默认值 `120000`。
  </ParamField>
  <ParamField path="cwd" type="string">
    可选的命令工作目录。
  </ParamField>
  <ParamField path="env" type="Record<string, string>">
    命令的可选环境变量覆盖。
  </ParamField>
</Accordion>

<Accordion title="Microsoft（无 API 密钥）">
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
    Microsoft 输出格式。默认为 `audio-24khz-48kbitrate-mono-mp3`。并非所有格式都受捆绑的 Edge 支持传输支持。
  </ParamField>
  <ParamField path="rate / pitch / volume" type="string">
    百分比字符串（例如 `+10%`、`-5%`）。
  </ParamField>
  <ParamField path="saveSubtitles" type="boolean">
    在音频文件旁边写入 JSON 字幕。
  </ParamField>
  <ParamField path="proxy" type="string">
    Microsoft 语音请求的代理 URL。
  </ParamField>
  <ParamField path="timeoutMs" type="number">
    请求请求超时覆盖（毫秒）。
  </ParamField>
  <ParamField path="edge.*" type="object" deprecated>
    旧版别名。运行 `openclaw doctor --fix` 以将持久化配置重写为 `providers.microsoft`。
  </ParamField>
</Accordion>

<Accordion title="MiniMax">
  <ParamField path="apiKey" type="string">
    回退到 `MINIMAX_API_KEY`。通过 `MINIMAX_OAUTH_TOKEN`、`MINIMAX_CODE_PLAN_KEY` 或 `MINIMAX_CODING_API_KEY` 进行 Token Plan 身份验证。
  </ParamField>
  <ParamField path="baseUrl" type="string">
    默认 `https://api.minimax.io`。环境变量：`MINIMAX_API_HOST`。
  </ParamField>
  <ParamField path="model" type="string">
    默认 `speech-2.8-hd`。环境变量：`MINIMAX_TTS_MODEL`。
  </ParamField>
  <ParamField path="voiceId" type="string">
    默认 `English_expressive_narrator`。环境变量：`MINIMAX_TTS_VOICE_ID`。
  </ParamField>
  <ParamField path="speed" type="number">
    `0.5..2.0`。默认 `1.0`。
  </ParamField>
  <ParamField path="vol" type="number">
    `(0, 10]`。默认 `1.0`。
  </ParamField>
  <ParamField path="pitch" type="number">
    整数 `-12..12`。默认 `0`。小数值将在请求前被截断。
  </ParamField>
</Accordion>

<Accordion title="OpenAI">
  <ParamField path="apiKey" type="string">
    回退到 `OPENAI_API_KEY`。
  </ParamField>
  <ParamField path="model" type="string">
    OpenAI TTS 模型 ID（例如 `gpt-4o-mini-tts`）。
  </ParamField>
  <ParamField path="voice" type="string">
    语音名称（例如 `alloy`、`cedar`）。
  </ParamField>
  <ParamField path="instructions" type="string">
    显式的 OpenAI `instructions` 字段。设置后，角色提示字段将**不会**自动映射。
  </ParamField>
  <ParamField path="baseUrl" type="string">
    覆盖 OpenAI TTS 端点。解析顺序：config → `OPENAI_TTS_BASE_URL` → `https://api.openai.com/v1`。非默认值将被视为与 OpenAI 兼容的 TTS 端点，因此接受自定义模型和语音名称。
  </ParamField>
</Accordion>

<Accordion title="OpenRouter">
  <ParamField path="apiKey" type="string">
    环境变量：`OPENROUTER_API_KEY`。可复用 `models.providers.openrouter.apiKey`。
  </ParamField>
  <ParamField path="baseUrl" type="string">
    默认值 `https://openrouter.ai/api/v1`。旧版 `https://openrouter.ai/v1` 会被规范化。
  </ParamField>
  <ParamField path="model" type="string">
    默认值 `hexgrad/kokoro-82m`。别名：`modelId`。
  </ParamField>
  <ParamField path="voice" type="string">
    默认值 `af_alloy`。别名：`voiceId`。
  </ParamField>
  <ParamField path="responseFormat" type='"mp3" | "pcm"'>
    默认值 `mp3`。
  </ParamField>
  <ParamField path="speed" type="number">
    提供商原生速度覆盖。
  </ParamField>
</Accordion>

<Accordion title="火山引擎（字节跳动 Seed Speech）">
  <ParamField path="apiKey" type="string">
    环境变量：`VOLCENGINE_TTS_API_KEY` 或 `BYTEPLUS_SEED_SPEECH_API_KEY`。
  </ParamField>
  <ParamField path="resourceId" type="string">
    默认值 `seed-tts-1.0`。环境变量：`VOLCENGINE_TTS_RESOURCE_ID`。当您的项目拥有 TTS 2.0 权限时使用 `seed-tts-2.0`。
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
    旧版火山引擎语音控制台字段。环境变量：`VOLCENGINE_TTS_APPID`，`VOLCENGINE_TTS_TOKEN`，`VOLCENGINE_TTS_CLUSTER`（默认值 `volcano_tts`）。
  </ParamField>
</Accordion>

<Accordion title="xAI">
  <ParamField path="apiKey" type="string">
    环境变量： `XAI_API_KEY`。
  </ParamField>
  <ParamField path="baseUrl" type="string">
    默认值 `https://api.x.ai/v1`。环境变量： `XAI_BASE_URL`。
  </ParamField>
  <ParamField path="voiceId" type="string">
    默认值 `eve`。可用音色： `ara`、 `eve`、 `leo`、 `rex`、 `sal`、 `una`。
  </ParamField>
  <ParamField path="language" type="string">
    BCP-47 语言代码或 `auto`。默认值 `en`。
  </ParamField>
  <ParamField path="responseFormat" type='"mp3" | "wav" | "pcm" | "mulaw" | "alaw"'>
    默认值 `mp3`。
  </ParamField>
  <ParamField path="speed" type="number">
    提供商原生速度覆盖。
  </ParamField>
</Accordion>

  <Accordion title="Xiaomi MiMo">
    <ParamField path="apiKey" type="string">Env: `XIAOMI_API_KEY`.</ParamField>
    <ParamField path="baseUrl" type="string">Default `https://api.xiaomimimo.com/v1`. Env: `XIAOMI_BASE_URL`.</ParamField>
    <ParamField path="model" type="string">Default `mimo-v2.5-tts`. Env: `XIAOMI_TTS_MODEL`. Also supports `mimo-v2-tts`.</ParamField>
    <ParamField path="voice" type="string">Default `mimo_default`. Env: `XIAOMI_TTS_VOICE`.</ParamField>
    <ParamField path="format" type='"mp3" | "wav"'>Default `mp3`. Env: `XIAOMI_TTS_FORMAT`.</ParamField>
    <ParamField path="style" type="string">可选的自然语言风格指令，作为用户消息发送；不会被朗读。</ParamField>
  </Accordion>
</AccordionGroup>

## 代理工具

`tts` 工具将文本转换为语音，并返回音频附件以
供回复传送。在飞书、Matrix、Telegram 和 WhatsApp 上，音频将
作为语音消息而非文件附件发送。当 `ffmpeg` 可用时，
飞书和 WhatsApp 可以在此路径上转码非 Opus 的 TTS 输出。

WhatsApp 通过 Baileys 将音频作为 PTT 语音笔记发送（带有
`ptt: true` 的 `audio`），并将可见文本与 PTT 音频**分开**发送，因为
客户端在语音笔记上渲染字幕的表现不一致。

该工具接受可选的 `channel` 和 `timeoutMs` 字段；`timeoutMs` 是
每次调用提供商请求的超时时间（毫秒）。

## Gateway(网关) RPC

| 方法              | 用途                              |
| ----------------- | --------------------------------- |
| `tts.status`      | 读取当前 TTS 状态和最后一次尝试。 |
| `tts.enable`      | 将本地自动偏好设置为 `always`。   |
| `tts.disable`     | 设置本地自动首选为 `off`。        |
| `tts.convert`     | 一次性文本转音频。                |
| `tts.setProvider` | 设置本地提供商首选。              |
| `tts.setPersona`  | 设置本地角色首选。                |
| `tts.providers`   | 列出已配置的提供商及其状态。      |

## 服务链接

- [OpenAI 文本转语音指南](https://platform.openai.com/docs/guides/text-to-speech)
- [OpenAI Audio API 参考](https://platform.openai.com/docs/api-reference/audio)
- [Azure Speech REST 文本转语音](https://learn.microsoft.com/azure/ai-services/speech-service/rest-text-to-speech)
- [Azure Speech 提供商](/zh/providers/azure-speech)
- [ElevenLabs Text to Speech](https://elevenlabs.io/docs/api-reference/text-to-speech)
- [ElevenLabs Authentication](https://elevenlabs.io/docs/api-reference/authentication)
- [Gradium](/zh/providers/gradium)
- [Inworld TTS API](https://docs.inworld.ai/tts/tts)
- [MiniMax T2A v2 API](https://platform.minimaxi.com/document/T2A%20V2)
- [Volcengine TTS HTTP API](/zh/providers/volcengine#text-to-speech)
- [Xiaomi MiMo speech synthesis](/zh/providers/xiaomi#text-to-speech)
- [node-edge-tts](https://github.com/SchneeHertz/node-edge-tts)
- [Microsoft Speech output formats](https://learn.microsoft.com/azure/ai-services/speech-service/rest-text-to-speech#audio-outputs)
- [xAI text to speech](https://docs.x.ai/developers/rest-api-reference/inference/voice#text-to-speech-rest)

## 相关

- [媒体概览](/zh/tools/media-overview)
- [音乐生成](/zh/tools/music-generation)
- [视频生成](/zh/tools/video-generation)
- [斜杠命令](/zh/tools/slash-commands)
- [语音通话插件](/zh/plugins/voice-call)
