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
  <Step title="选择一个提供商"OpenAICLIAPI>
    OpenAI 和 ElevenLabs 是最可靠的托管选项。Microsoft 和
    Local CLI 无需 API 密钥即可工作。有关完整列表，请参阅[提供商矩阵](#supported-providers)。
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
  <Tab title="Azure 语音">
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
          speakerVoice: "en-US-JennyNeural",
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
          speakerVoiceId: "EXAVITQu4vr4xnSDxMaL",
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
          speakerVoice: "Kore",
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
          speakerVoiceId: "YTpq7expH9539ERJ",
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
          speakerVoiceId: "Sarah",
          temperature: 0.7,
        },
      },
    },
  },
}
```
  </Tab>
  <Tab title="CLI本地 CLI">
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
  <Tab title="Microsoft (无密钥)">
```json5
{
  messages: {
    tts: {
      auto: "always",
      provider: "microsoft",
      providers: {
        microsoft: {
          enabled: true,
          speakerVoice: "en-US-MichelleNeural",
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
          speakerVoiceId: "English_expressive_narrator",
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
          speakerVoice: "alloy",
        },
        elevenlabs: {
          apiKey: "${ELEVENLABS_API_KEY}",
          model: "eleven_multilingual_v2",
          speakerVoiceId: "EXAVITQu4vr4xnSDxMaL",
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
          speakerVoice: "af_alloy",
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
          speakerVoice: "en_female_anna_mars_bigtts",
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
          speakerVoiceId: "eve",
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
          speakerVoice: "mimo_default",
          format: "mp3",
        },
      },
    },
  },
}
```
  </Tab>
</Tabs>

对于 Xiaomi Xiaomi`mimo-v2.5-tts-voicedesign`，请省略 `speakerVoice` 并将 `style`OpenClaw 设置为
语音设计提示词。OpenClaw 会将该提示词作为 TTS `user` 消息发送，
并且不会为 voicedesign 模型发送 `audio.voice`。

### 每个代理的声音覆盖

当一个代理应使用不同的提供商、
声音、模型、角色或自动 TTS 模式说话时，请使用 `agents.list[].tts`。代理块会与
`messages.tts` 进行深度合并，因此提供商凭据可以保留在全局提供商配置中：

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
            elevenlabs: { speakerVoiceId: "EXAVITQu4vr4xnSDxMaL" },
          },
        },
      },
    ],
  },
}
```

要固定每个代理的角色，请在提供商
配置旁边设置 `agents.list[].tts.persona` —— 它仅覆盖该代理的全局 `messages.tts.persona`。

自动回复、`/tts audio`、`/tts status` 以及
`tts` 代理工具的优先顺序：

1. `messages.tts`
2. 活动 `agents.list[].tts`
3. 渠道覆盖，当渠道支持 `channels.<channel>.tts` 时
4. 账号覆盖，当渠道传递 `channels.<channel>.accounts.<id>.tts` 时
5. 此主机的本地 `/tts` 偏好设置
6. 启用 [模型覆盖](#model-driven-directives) 时的内联 `[[tts:...]]` 指令

渠道和账号覆盖使用与 `messages.tts` 相同的形状，
并与之前的层级深度合并，因此共享的提供商凭据可以保留在
`messages.tts` 中，而渠道或机器人账号仅更改说话者声音、模型、角色
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
              openai: { speakerVoice: "shimmer" },
            },
          },
        },
      },
    },
  },
}
```

## 角色

**Persona** 是一种稳定的语音身份，可以确定性地应用于各个提供商。它可以偏好某个提供商，定义与提供商无关的提示意图，并携带针对特定提供商的语音、模型、提示模板、种子和语音设置绑定。

### 最小化 Persona

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
            elevenlabs: {
              speakerVoiceId: "EXAVITQu4vr4xnSDxMaL",
              modelId: "eleven_multilingual_v2",
            },
          },
        },
      },
    },
  },
}
```

### 完整 Persona（与提供商无关的提示）

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
              speakerVoice: "Algieba",
              promptTemplate: "audio-profile-v1",
            },
            openai: { model: "gpt-4o-mini-tts", speakerVoice: "cedar" },
            elevenlabs: {
              speakerVoiceId: "voice_id",
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

### Persona 解析

活动 Persona 按以下方式确定性地选择：

1. `/tts persona <id>` 本地偏好（如果已设置）。
2. `messages.tts.persona`（如果已设置）。
3. 无 Persona。

提供商选择优先遵循显式设置：

1. 直接覆盖（CLI、网关、Talk、允许的 TTS 指令）。
2. `/tts provider <id>` 本地偏好。
3. 活动 Persona 的 `provider`。
4. `messages.tts.provider`。
5. 注册表自动选择。

对于每次提供商尝试，OpenClaw 按以下顺序合并配置：

1. `messages.tts.providers.<id>`
2. `messages.tts.personas.<persona>.providers.<id>`
3. 受信任的请求覆盖
4. 允许的模型发出的 TTS 指令覆盖

### 提供商如何使用 Persona 提示

Persona 提示字段（`profile`、`scene`、`sampleContext`、`style`、`accent`、
`pacing`、`constraints`）是**与提供商无关的**。每个提供商自行决定如何使用它们：

<AccordionGroup>
  <Accordion title="Google Gemini">
    **仅当**有效的 Google 提供商配置设置了 `promptTemplate: "audio-profile-v1"`
    或 `personaPrompt` 时，才会将 Persona 提示字段封装在 Gemini TTS 提示结构中。较旧的 `audioProfile` 和 `speakerName` 字段仍会作为 Google 特定的提示文本前置。`[[tts:text]]`OpenClaw 块内的内联音频标签（如
    `[whispers]` 或 `[laughs]`）将保留在 Gemini 转录内容内；OpenClaw 不会生成这些标签。
  </Accordion>
  <Accordion title="OpenAIOpenAI">
    仅在未配置显式 OpenAI `instructions` 时，才将 persona 提示字段映射到请求 `instructions`OpenAI 字段。显式 `instructions` 始终优先。
  </Accordion>
  <Accordion title="Other providers">
    仅使用 `personas.<id>.providers.<provider>` 下的提供商特定的 persona 绑定。
    除非提供商实现了自己的 persona-prompt 映射，否则 persona 提示字段将被忽略。
  </Accordion>
</AccordionGroup>

### 回退策略

当 persona 对尝试的提供商**没有绑定**时，`fallbackPolicy` 控制其行为：

| 策略                | 行为                                                                                                      |
| ------------------- | --------------------------------------------------------------------------------------------------------- |
| `preserve-persona`  | **默认。** 与提供商无关的提示字段保持可用；提供商可以使用它们，也可以忽略它们。                           |
| `provider-defaults` | 在该次尝试的提示准备中省略 persona；提供商使用其中性默认值，同时继续回退到其他提供商。                    |
| `fail`              | 使用 `reasonCode: "not_configured"` 和 `personaBinding: "missing"` 跳过该提供商尝试。仍会尝试回退提供商。 |

只有当**每个**尝试的提供商都被跳过或失败时，整个 TTS 请求才会失败。

Talk 会话提供商选择是会话范围的。Talk 客户端应从 `talk.catalog` 中选择提供商 ID、模型 ID、语音 ID 和区域设置，并通过 Talk 会话或转移请求传递它们。打开语音会话不应改变 `messages.tts` 或全局 Talk 提供商默认值。

## 模型驱动的指令

默认情况下，助手**可以**发出 `[[tts:...]]` 指令以覆盖单个回复的语音、模型或速度，以及一个可选的
`[[tts:text]]...[[/tts:text]]` 块，用于应仅出现在音频中的表达提示：

```text
Here you go.

[[tts:speakerVoiceId=pMsXgVXv3BLzUgSXRplE model=eleven_v3 speed=1.1]]
[[tts:text]](laughs) Read the song once more.[[/tts:text]]
```

当 `messages.tts.auto` 为 `"tagged"` 时，**必须使用指令**来触发
音频。流式块传输会在渠道看到指令之前将其从可见文本中剥离，即使它们分散在相邻的块中。

`provider=...` 会被忽略，除非 `modelOverrides.allowProvider: true`。当回复声明 `provider=...` 时，该指令中的其他键仅由该提供商解析；不支持的键将被剔除，并报告为 TTS 指令警告。

**可用的指令键：**

- `provider`（注册的提供商 ID；需要 `allowProvider: true`）
- `speakerVoice` / `speakerVoiceId`（旧版别名：`voice`、`voiceName`、`voice_name`、`google_voice`、`voiceId`）
- `model` / `google_model`
- `stability`、`similarityBoost`、`style`、`speed`、`useSpeakerBoost`
- `vol` / `volume`（MiniMax 音量，0–10）
- `pitch`（MiniMax 整数音高，−12 至 12；小数值将被截断）
- `emotion`（Volcengine 情感标签）
- `applyTextNormalization`（`auto|on|off`）
- `languageCode`（ISO 639-1）
- `seed`

**完全禁用模型覆盖：**

```json5
{ messages: { tts: { modelOverrides: { enabled: false } } } }
```

**允许切换提供商，同时保持其他旋钮可配置：**

```json5
{ messages: { tts: { modelOverrides: { enabled: true, allowProvider: true, allowSeed: false } } } }
```

## 斜杠命令

单一命令 `/tts`。在 Discord 上，OpenClaw 也注册了 `/voice`，因为 `/tts` 是 Discord 的内置命令 —— 文本 `/tts ...` 仍然有效。

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

- `/tts on` 将本地 TTS 首选项写入 `always`；`/tts off` 将其写入 `off`。
- `/tts chat on|off|default` 会为当前聊天写入一个会话作用域的自动 TTS 覆盖设置。
- `/tts persona <id>` 会写入本地角色偏好；`/tts persona off` 会清除它。
- `/tts latest` 会从当前会话记录中读取最新的助手回复，并将其作为音频发送一次。它只会在会话条目中存储该回复的哈希值，以抑制重复的语音发送。
- `/tts audio` 会生成一次性的音频回复（**不会**开启 TTS）。
- `limit` 和 `summary` 存储在**本地偏好设置**中，而不是主配置中。
- `/tts status` 包含针对最新尝试的回退诊断信息 —— `Fallback: <primary> -> <used>`、`Attempts: ...` 以及每次尝试的详细信息（`provider:outcome(reasonCode) latency`）。
- 当启用 TTS 时，`/status` 会显示活动的 TTS 模式以及已配置的提供商、模型、语音和经过清理的自定义端点元数据。

## 用户偏好设置

斜杠命令会将本地覆盖设置写入 `prefsPath`。默认值为
`~/.openclaw/settings/tts.json`；可以通过 `OPENCLAW_TTS_PREFS` 环境变量
或 `messages.tts.prefsPath` 进行覆盖。

| 存储字段    | 作用                                    |
| ----------- | --------------------------------------- |
| `auto`      | 本地自动 TTS 覆盖（`always`、`off` 等） |
| `provider`  | 本地主提供商覆盖                        |
| `persona`   | 本地角色覆盖                            |
| `maxLength` | 摘要阈值（默认 `1500` 个字符）          |
| `summarize` | 摘要开关（默认 `true`）                 |

这些设置会覆盖来自 `messages.tts` 的有效配置以及针对该主机的活动
`agents.list[].tts` 块。

## 输出格式（固定）

TTS 语音投递是由渠道能力驱动的。渠道插件会通告语音风格的 TTS 应该请求提供商提供原生 `voice-note` 目标，还是保持正常的 `audio-file` 合成并仅标记兼容的输出用于语音投递。

- **支持语音笔记的渠道**：语音笔记回复优先使用 Opus（来自 ElevenLabs 的 `opus_48000_64`，来自 OpenAI 的 `opus`OpenAI）。
  - 48kHz / 64kbps 是语音消息的良好平衡折衷方案。
- **飞书 / WhatsApp**：当语音笔记回复生成为 MP3/WebM/WAV/M4A 或其他可能的音频文件时，渠道插件会在发送原生语音消息之前使用 WhatsApp`ffmpeg`WhatsAppBaileys 将其转码为 48kHz Ogg/Opus 格式。WhatsApp 通过 Baileys `audio` 载荷并附带 `ptt: true` 和 `audio/ogg; codecs=opus`WhatsApp 发送结果。如果转换失败，飞书将收到原始文件作为附件；WhatsApp 发送会失败，而不是发布不兼容的 PTT 载荷。
- **其他渠道**：MP3（来自 ElevenLabs 的 `mp3_44100_128`，来自 OpenAI 的 `mp3`OpenAI）。
  - 44.1kHz / 128kbps 是语音清晰度的默认平衡设置。
- **MiniMax**：MP3（MiniMax`speech-2.8-hd`OpenClawMiniMax 模型，32kHz 采样率）用于普通音频附件。对于渠道通告的语音笔记目标，当渠道通告支持转码时，OpenClaw 会在交付前使用 `ffmpeg` 将 MiniMax MP3 转码为 48kHz Opus。
- **Xiaomi MiMo**：默认为 MP3，或在配置时使用 WAV。对于渠道通告的语音笔记目标，当渠道通告支持转码时，OpenClaw 会在交付前使用 XiaomiOpenClawXiaomi`ffmpeg` 将 Xiaomi 输出转码为 48kHz Opus。
- **本地 CLI**：使用配置的 CLI`outputFormat`。语音笔记目标会转换为 Ogg/Opus，电话输出会使用 `ffmpeg` 转换为原始 16 kHz 单声道 PCM。
- **Google Gemini**：Gemini API TTS 返回原始 24kHz PCM。OpenClaw 将其封装为 WAV 用于音频附件，为语音笔记目标将其转码为 48kHz Opus，并为 Talk/电话直接返回 PCM。
- **Gradium**：用于音频附件的 WAV，用于语音备注目标的 Opus，以及用于电话的 8 kHz `ulaw_8000`。
- **Inworld**：用于常规音频附件的 MP3，用于语音备注目标的本地 `OGG_OPUS`，以及用于 Talk/电话的 22050 Hz 原始 `PCM`。
- **xAI**：默认为 MP3；`responseFormat` 可以是 `mp3`、`wav`、`pcm`、`mulaw` 或 `alaw`OpenClaw。OpenClaw 使用 xAI 的批量 REST TTS 端点并返回完整的音频附件；此提供商路径不使用 xAI 的流式 TTS WebSocket。此路径不支持本地 Opus 语音备注格式。
- **Microsoft**：使用 `microsoft.outputFormat`（默认为 `audio-24khz-48kbitrate-mono-mp3`）。
  - 捆绑传输接受 `outputFormat`，但并非所有格式都可从该服务获得。
  - 输出格式值遵循 Microsoft 语音输出格式（包括 Ogg/WebM Opus）。
  - Telegram Telegram`sendVoice`OpenAI 接受 OGG/MP3/M4A；如果您需要保证的 Opus 语音消息，请使用 OpenAI/ElevenLabs。
  - 如果配置的 Microsoft 输出格式失败，OpenClaw 将使用 MP3 重试。

OpenAI/ElevenLabs 输出格式是按渠道固定的（见上文）。

## 自动 TTS 行为

当启用 `messages.tts.auto`OpenClaw 时，OpenClaw：

- 如果回复已包含结构化媒体，则跳过 TTS。
- 跳过非常短的回复（10 个字符以下）。
- 当启用摘要时，使用 `summaryModel`（或 `agents.defaults.model.primary`）对长回复进行摘要。
- 将生成的音频附加到回复中。
- 在 `mode: "final"` 中，在文本流完成后仍会为流式最终回复发送纯音频 TTS；生成的媒体会像普通回复附件一样经过相同的渠道媒体规范化。

如果回复超过 `maxLength`API 且摘要已关闭（或者没有用于摘要模型的 API 密钥），则跳过音频并发送普通文本回复。

```text
Reply -> TTS enabled?
  no  -> send text
  yes -> has media / short?
          yes -> send text
          no  -> length > limit?
                   no  -> TTS -> attach audio
                   yes -> summary enabled?
                            no  -> send text
                            yes -> summarize -> TTS -> attach audio
```

## 各渠道的输出格式

| 目标                                  | 格式                                                                                                                                        |
| ------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------- |
| Feishu / Matrix / Telegram / WhatsApp | 语音消息回复首选 **Opus**（来自 ElevenLabs 的 `opus_48000_64`，来自 OpenAI 的 `opus`）。48 kHz / 64 kbps 在清晰度和文件大小之间取得了平衡。 |
| 其他渠道                              | **MP3**（来自 ElevenLabs 的 `mp3_44100_128`，来自 OpenAI 的 `mp3`）。44.1 kHz / 128 kbps 为语音的默认设置。                                 |
| Talk / 电话                           | 提供商原生 **PCM**（Inworld 22050 Hz，Google 24 kHz），或来自 Gradium 用于电话的 `ulaw_8000`。                                              |

按提供商划分的说明：

- **Feishu / WhatsApp 转码：** 当语音消息回复以 MP3/WebM/WAV/M4A 格式送达时，渠道插件会使用 `ffmpeg` 将其转码为 48 kHz Ogg/Opus。WhatsApp 通过 Baileys 发送，使用 `ptt: true` 和 `audio/ogg; codecs=opus`。如果转换失败：Feishu 将回退到附加原始文件；WhatsApp 发送将失败，而不是发布不兼容的 PTT 负载。
- **MiniMax / Xiaomi MiMo：** 默认 MP3（MiniMax `speech-2.8-hd` 为 32 kHz）；通过 `ffmpeg` 为语音消息目标转码为 48 kHz Opus。
- **本地 CLI：** 使用配置的 `outputFormat`。语音消息目标转换为 Ogg/Opus，电话输出转换为原始 16 kHz 单声道 PCM。
- **Google Gemini：** 返回原始 24 kHz PCM。OpenClaw 将其封装为 WAV 用于附件，为语音消息目标转码为 48 kHz Opus，为 Talk/电话直接返回 PCM。
- **Inworld：** MP3 附件，原生 `OGG_OPUS` 语音消息，原始 `PCM` 22050 Hz 用于 Talk/电话。
- **xAI：** 默认为 MP3；`responseFormat` 可能是 `mp3|wav|pcm|mulaw|alaw`。使用 xAI 的批处理 REST 端点 —— 不使用流式 WebSocket TTS。不支持原生 Opus 语音消息格式。
- **Microsoft:** 使用 `microsoft.outputFormat`（默认 `audio-24khz-48kbitrate-mono-mp3`Telegram）。Telegram `sendVoice`OpenAIOpenClaw 接受 OGG/MP3/M4A；如果需要保证 Opus 语音消息，请使用 OpenAI/ElevenLabs。如果配置的 Microsoft 格式失败，OpenClaw 将使用 MP3 重试。

OpenAI 和 ElevenLabs 的输出格式按渠道固定，如上所列。

## 字段参考

<AccordionGroup>
  <Accordion title="Top-level messages.tts.*">
    <ParamField path="auto" type='"off" | "always" | "inbound" | "tagged"'>
      自动 TTS 模式。`inbound` 仅在收到语音消息后发送音频；`tagged` 仅在回复包含 `[[tts:...]]` 指令或 `[[tts:text]]` 块时发送音频。
    </ParamField>
    <ParamField path="enabled" type="boolean" deprecated>
      旧版开关。`openclaw doctor --fix` 会将其迁移到 `auto`。
    </ParamField>
    <ParamField path="mode" type='"final" | "all"' default="final">
      `"all"` 除了最终回复外，还包括工具/块回复。
    </ParamField>
    <ParamField path="provider" type="string"OpenClaw>
      语音提供商 ID。未设置时，OpenClaw 将使用注册表自动选择顺序中的第一个已配置提供商。旧版 `provider: "edge"` 会被 `openclaw doctor --fix` 重写为 `"microsoft"`。
    </ParamField>
    <ParamField path="persona" type="string">
      来自 `personas` 的活跃 persona ID。已标准化为小写。
    </ParamField>
    <ParamField path="personas.<id>" type="object">
      稳定的语音身份。字段：`label`、`description`、`provider`、`fallbackPolicy`、`prompt`、`providers.<provider>`。参见 [Personas](#personas)。
    </ParamField>
    <ParamField path="summaryModel" type="string">
      用于自动摘要的廉价模型；默认为 `agents.defaults.model.primary`。接受 `provider/model` 或已配置的模型别名。
    </ParamField>
    <ParamField path="modelOverrides" type="object">
      允许模型发出 TTS 指令。`enabled` 默认为 `true`；`allowProvider` 默认为 `false`。
    </ParamField>
    <ParamField path="providers.<id>" type="object">
      提供商拥有的设置，按键为语音提供商 ID。旧版直接块（`messages.tts.openai`、`.elevenlabs`、`.microsoft`、`.edge`）由 `openclaw doctor --fix` 重写；仅提交 `messages.tts.providers.<id>`。
    </ParamField>
    <ParamField path="maxTextLength" type="number">
      TTS 输入字符数的硬上限。如果超出，`/tts audio` 将失败。
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
    可选的 Azure 语音终结点覆盖（别名 `baseUrl`）。
  </ParamField>
  <ParamField path="speakerVoice" type="string">
    Azure 语音 ShortName。默认 `en-US-JennyNeural`。旧别名：`voice`。
  </ParamField>
  <ParamField path="lang" type="string">
    SSML 语言代码。默认 `en-US`。
  </ParamField>
  <ParamField path="outputFormat" type="string">
    标准音频的 Azure `X-Microsoft-OutputFormat`。默认 `audio-24khz-48kbitrate-mono-mp3`。
  </ParamField>
  <ParamField path="voiceNoteOutputFormat" type="string">
    语音备注输出的 Azure `X-Microsoft-OutputFormat`。默认 `ogg-24khz-16bit-mono-opus`。
  </ParamField>
</Accordion>

<Accordion title="ElevenLabs">
  <ParamField path="apiKey" type="string">
    回退到 `ELEVENLABS_API_KEY` 或 `XI_API_KEY`。
  </ParamField>
  <ParamField path="model" type="string">
    模型 ID（例如 `eleven_multilingual_v2`、`eleven_v3`）。
  </ParamField>
  <ParamField path="speakerVoiceId" type="string">
    ElevenLabs 语音 ID。旧别名：`voiceId`。
  </ParamField>
  <ParamField path="voiceSettings" type="object">
    `stability`、`similarityBoost`、`style`（每个 `0..1`）、`useSpeakerBoost`（`true|false`）、`speed`（`0.5..2.0`、`1.0` = 正常）。
  </ParamField>
  <ParamField path="applyTextNormalization" type='"auto" | "on" | "off"'>
    文本规范化模式。
  </ParamField>
  <ParamField path="languageCode" type="string">
    2 字母 ISO 639-1 代码（例如 `en`、`de`）。
  </ParamField>
  <ParamField path="seed" type="number">
    整数 `0..4294967295` 以尽力实现确定性。
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
  <ParamField path="speakerVoice" type="string">
    Gemini 预构建语音名称。默认为 `Kore`。旧别名：`voiceName`、`voice`。
  </ParamField>
  <ParamField path="audioProfile" type="string">
    附加在口语文本之前的自然语言风格提示词。
  </ParamField>
  <ParamField path="speakerName" type="string">
    当您的提示词使用命名说话人时，附加在口语文本之前的可选说话人标签。
  </ParamField>
  <ParamField path="promptTemplate" type='"audio-profile-v1"'>
    设置为 `audio-profile-v1` 以将活跃的 persona 提示词字段包裹在确定性的 Gemini TTS 提示词结构中。
  </ParamField>
  <ParamField path="personaPrompt" type="string">
    附加到模板的 Director's Notes 的特定于 Google 的额外 persona 提示词文本。
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
  <ParamField path="speakerVoiceId" type="string">
    默认为 Emma (`YTpq7expH9539ERJ`)。旧别名：`voiceId`。
  </ParamField>
</Accordion>

  <Accordion title="Inworld">
    ### Inworld 主配置

    <ParamField path="apiKey" type="string">环境变量：`INWORLD_API_KEY`。</ParamField>
    <ParamField path="baseUrl" type="string">默认值 `https://api.inworld.ai`。</ParamField>
    <ParamField path="modelId" type="string">默认值 `inworld-tts-1.5-max`。别名：`inworld-tts-1.5-mini`、`inworld-tts-1-max`、`inworld-tts-1`。</ParamField>
    <ParamField path="speakerVoiceId" type="string">默认值 `Sarah`。旧式别名：`voiceId`。</ParamField>
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
    预期的 CLI 输出格式。默认为 `mp3`，用于音频附件。
  </ParamField>
  <ParamField path="timeoutMs" type="number">
    命令超时时间（毫秒）。默认为 `120000`。
  </ParamField>
  <ParamField path="cwd" type="string">
    可选的命令工作目录。
  </ParamField>
  <ParamField path="env" type="Record<string, string>">
    命令的可选环境变量覆盖。
  </ParamField>
</Accordion>

<Accordion title="APIMicrosoft（无 API 密钥）">
  <ParamField path="enabled" type="boolean" default="true">
    允许使用 Microsoft 语音。
  </ParamField>
  <ParamField path="speakerVoice" type="string">
    Microsoft 神经语音名称（例如 `en-US-MichelleNeural`）。旧版别名：`voice`。
  </ParamField>
  <ParamField path="lang" type="string">
    语言代码（例如 `en-US`）。
  </ParamField>
  <ParamField path="outputFormat" type="string">
    Microsoft 输出格式。默认为 `audio-24khz-48kbitrate-mono-mp3`。并非所有格式都受内置 Edge 传输支持。
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
    请求超时覆盖（毫秒）。
  </ParamField>
  <ParamField path="edge.*" type="object" deprecated>
    旧版别名。运行 `openclaw doctor --fix` 以将持久化配置重写为 `providers.microsoft`。
  </ParamField>
</Accordion>

<Accordion title="MiniMaxMiniMax">
  <ParamField path="apiKey" type="string">
    回退到 `MINIMAX_API_KEY`。通过 `MINIMAX_OAUTH_TOKEN`、`MINIMAX_CODE_PLAN_KEY` 或 `MINIMAX_CODING_API_KEY` 进行 Token Plan 认证。
  </ParamField>
  <ParamField path="baseUrl" type="string">
    默认值 `https://api.minimax.io`。环境变量：`MINIMAX_API_HOST`。
  </ParamField>
  <ParamField path="model" type="string">
    默认值 `speech-2.8-hd`。环境变量：`MINIMAX_TTS_MODEL`。
  </ParamField>
  <ParamField path="speakerVoiceId" type="string">
    默认值 `English_expressive_narrator`。环境变量：`MINIMAX_TTS_VOICE_ID`。旧别名：`voiceId`。
  </ParamField>
  <ParamField path="speed" type="number">
    `0.5..2.0`。默认值 `1.0`。
  </ParamField>
  <ParamField path="vol" type="number">
    `(0, 10]`。默认值 `1.0`。
  </ParamField>
  <ParamField path="pitch" type="number">
    整数 `-12..12`。默认值 `0`。小数值在请求前会被截断。
  </ParamField>
</Accordion>

<Accordion title="OpenAIOpenAI">
  <ParamField path="apiKey" type="string">
    回退到 `OPENAI_API_KEY`。
  </ParamField>
  <ParamField path="model" type="string" OpenAI>
    OpenAI TTS 模型 ID（例如 `gpt-4o-mini-tts`）。
  </ParamField>
  <ParamField path="speakerVoice" type="string">
    语音名称（例如 `alloy`、`cedar`）。旧版别名：`voice`。
  </ParamField>
  <ParamField path="instructions" type="string" OpenAI>
    显式的 OpenAI `instructions` 字段。设置后，persona 提示字段将**不会**自动映射。
  </ParamField>
  <ParamField path="extraBody / extra_body" type="Record<string, unknown>">
    在生成的 OpenAI TTS 字段之后，合并到 `/audio/speech`OpenAIOpenAI 请求正文中的额外 JSON 字段。将此用于 OpenAI 兼容的端点（例如 Kokoro），这些端点需要提供商特定的键，如 `lang`；不安全的原型键将被忽略。
  </ParamField>
  <ParamField path="baseUrl" type="string" OpenAI>
    覆盖 OpenAI TTS 端点。解析顺序：config → `OPENAI_TTS_BASE_URL` → `https://api.openai.com/v1`OpenAI。非默认值被视为 OpenAI 兼容的 TTS 端点，因此接受自定义模型和语音名称。
  </ParamField>
</Accordion>

<Accordion title="OpenRouterOpenRouter">
  <ParamField path="apiKey" type="string">
    环境变量：`OPENROUTER_API_KEY`。可重用 `models.providers.openrouter.apiKey`。
  </ParamField>
  <ParamField path="baseUrl" type="string">
    默认为 `https://openrouter.ai/api/v1`。旧版 `https://openrouter.ai/v1` 会被标准化。
  </ParamField>
  <ParamField path="model" type="string">
    默认为 `hexgrad/kokoro-82m`。别名：`modelId`。
  </ParamField>
  <ParamField path="speakerVoice" type="string">
    默认为 `af_alloy`。旧版别名：`voice`，`voiceId`。
  </ParamField>
  <ParamField path="responseFormat" type='"mp3" | "pcm"'>
    默认为 `mp3`。
  </ParamField>
  <ParamField path="speed" type="number">
    提供商原生速度覆盖。
  </ParamField>
</Accordion>

<Accordion title="火山引擎 (字节跳动 Seed Speech)">
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
  <ParamField path="speakerVoice" type="string">
    音色类型。默认值 `en_female_anna_mars_bigtts`。环境变量：`VOLCENGINE_TTS_VOICE`。旧版别名：`voice`。
  </ParamField>
  <ParamField path="speedRatio" type="number">
    提供商原生语速比率。
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
    环境变量： `XAI_API_KEY`。
  </ParamField>
  <ParamField path="baseUrl" type="string">
    默认值 `https://api.x.ai/v1`。环境变量： `XAI_BASE_URL`。
  </ParamField>
  <ParamField path="speakerVoiceId" type="string">
    默认值 `eve`。实时语音： `ara`、 `eve`、 `leo`、 `rex`、 `sal`、 `una`。旧版别名： `voiceId`。
  </ParamField>
  <ParamField path="language" type="string">
    BCP-47 语言代码或 `auto`。默认值 `en`。
  </ParamField>
  <ParamField path="responseFormat" type='"mp3" | "wav" | "pcm" | "mulaw" | "alaw"'>
    默认值 `mp3`。
  </ParamField>
  <ParamField path="speed" type="number">
    提供商原生的速度覆盖。
  </ParamField>
</Accordion>

  <Accordion title="XiaomiXiaomi MiMo">
    <ParamField path="apiKey" type="string">环境变量： `XIAOMI_API_KEY`。</ParamField>
    <ParamField path="baseUrl" type="string">默认值 `https://api.xiaomimimo.com/v1`。环境变量： `XIAOMI_BASE_URL`。</ParamField>
    <ParamField path="model" type="string">默认值 `mimo-v2.5-tts`。环境变量： `XIAOMI_TTS_MODEL`。也支持 `mimo-v2-tts` 和 `mimo-v2.5-tts-voicedesign`。</ParamField>
    <ParamField path="speakerVoice" type="string">预设语音模型的默认值 `mimo_default`。环境变量： `XIAOMI_TTS_VOICE`。旧别名： `voice`。对于 `mimo-v2.5-tts-voicedesign` 不发送。</ParamField>
    <ParamField path="format" type='"mp3" | "wav"'>默认值 `mp3`。环境变量： `XIAOMI_TTS_FORMAT`。</ParamField>
    <ParamField path="style" type="string">作为用户消息发送的可选自然语言风格指令；不会朗读。对于 `mimo-v2.5-tts-voicedesign`OpenClaw，这是语音设计提示；如果省略，OpenClaw 会提供默认值。</ParamField>
  </Accordion>
</AccordionGroup>

## Agent 工具

`tts`MatrixTelegramWhatsAppWhatsApp 工具将文本转换为语音，并返回音频附件以供回复发送。在飞书、Matrix、Telegram 和 WhatsApp 上，音频作为语音消息而不是文件附件发送。当 `ffmpeg` 可用时，飞书和 WhatsApp 可以在此路径上转码非 Opus 的 TTS 输出。

WhatsApp 通过 Baileys 将音频作为 PTT 语音笔记（带有 `ptt: true` 的 WhatsAppBaileys`audio`）发送，并将可见文本与 PTT 音频**分开**发送，因为客户端在语音笔记上渲染字幕的表现不一致。

该工具接受可选的 `channel` 和 `timeoutMs` 字段；`timeoutMs` 是以毫秒为单位的单次提供商请求超时时间。单次调用值会覆盖 `messages.tts.timeoutMs`；配置的 TTS 超时会覆盖任何插件编写的提供商默认值。

## Gateway(网关) RPC

| 方法              | 用途                              |
| ----------------- | --------------------------------- |
| `tts.status`      | 读取当前的 TTS 状态和上次尝试。   |
| `tts.enable`      | 将本地自动首选项设置为 `always`。 |
| `tts.disable`     | 将本地自动首选项设置为 `off`。    |
| `tts.convert`     | 一次性文本转语音。                |
| `tts.setProvider` | 设置本地提供商首选项。            |
| `tts.setPersona`  | 设置本地角色首选项。              |
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
