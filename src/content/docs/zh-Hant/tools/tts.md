---
summary: "Text-to-speech for outbound replies — providers, personas, slash commands, and per-channel output"
read_when:
  - Enabling text-to-speech for replies
  - Configuring a TTS provider, fallback chain, or persona
  - Using /tts commands or directives
title: "Text-to-speech"
sidebarTitle: "Text to speech (TTS)"
---

OpenClaw 可以跨 **13 個語音提供商**將傳出回覆轉換為音頻，並在飛書、Matrix、Telegram 和 WhatsApp 上發送原生語音訊息，在其他地方發送音頻附件，並為電話和 Talk 提供 PCM/Ulaw 流。

## 快速開始

<Steps>
  <Step title="Pick a provider">
    OpenAI 和 ElevenLabs 是最可靠的託管選項。Microsoft 和
    Local CLI 無需 API 密鑰即可工作。請參閱 [提供商矩陣](#supported-providers)
    獲取完整列表。
  </Step>
  <Step title="Set the API key">
    為您的提供商導出環境變量（例如 `OPENAI_API_KEY`，
    `ELEVENLABS_API_KEY`）。Microsoft 和 Local CLI 不需要密鑰。
  </Step>
  <Step title="Enable in config">
    設置 `messages.tts.auto: "always"` 和 `messages.tts.provider`：

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
  <Step title="Try it in chat">
    `/tts status` 顯示當前狀態。`/tts audio Hello from OpenClaw`
    發送一次性音頻回覆。
  </Step>
</Steps>

<Note>自動 TTS 默認為 **關閉**。當未設置 `messages.tts.provider` 時， OpenClaw 會按照註冊表自動選擇順序選擇第一個已配置的提供商。</Note>

## 支援的提供商

| 提供商            | 身份驗證                                                                                                       | 備註                                                                     |
| ----------------- | -------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------ |
| **Azure Speech**  | `AZURE_SPEECH_KEY` + `AZURE_SPEECH_REGION`（以及 `AZURE_SPEECH_API_KEY`、`SPEECH_KEY`、`SPEECH_REGION`）       | 原生 Ogg/Opus 語音訊息輸出和電話功能。                                   |
| **ElevenLabs**    | `ELEVENLABS_API_KEY` 或 `XI_API_KEY`                                                                           | 語音克隆、多語言、通過 `seed` 確定性生成。                               |
| **Google Gemini** | `GEMINI_API_KEY` 或 `GOOGLE_API_KEY`                                                                           | Gemini API TTS；透過 `promptTemplate: "audio-profile-v1"` 支援人設感知。 |
| **Gradium**       | `GRADIUM_API_KEY`                                                                                              | 語音訊息與電話輸出。                                                     |
| **Inworld**       | `INWORLD_API_KEY`                                                                                              | 串流 TTS API。原生 Opus 語音訊息與 PCM 電話語音。                        |
| **Local CLI**     | 無                                                                                                             | 執行已設定的本地 TTS 指令。                                              |
| **Microsoft**     | 無                                                                                                             | 透過 `node-edge-tts` 使用公開 Edge 神經網路 TTS。盡力而為，無 SLA。      |
| **MiniMax**       | `MINIMAX_API_KEY` (或 Token 方案：`MINIMAX_OAUTH_TOKEN`、`MINIMAX_CODE_PLAN_KEY`、`MINIMAX_CODING_API_KEY`)    | T2A v2 API。預設為 `speech-2.8-hd`。                                     |
| **OpenAI**        | `OPENAI_API_KEY`                                                                                               | 亦用於自動摘要；支援人設 `instructions`。                                |
| **OpenRouter**    | `OPENROUTER_API_KEY` (可重複使用 `models.providers.openrouter.apiKey`)                                         | 預設模型 `hexgrad/kokoro-82m`。                                          |
| **Volcengine**    | `VOLCENGINE_TTS_API_KEY` 或 `BYTEPLUS_SEED_SPEECH_API_KEY` (舊版 AppID/token：`VOLCENGINE_TTS_APPID`/`_TOKEN`) | BytePlus Seed Speech HTTP API。                                          |
| **Vydra**         | `VYDRA_API_KEY`                                                                                                | 共享圖片、影片與語音供應商。                                             |
| **xAI**           | `XAI_API_KEY`                                                                                                  | xAI 批次 TTS。**不**支援原生 Opus 語音訊息。                             |
| **Xiaomi MiMo**   | `XIAOMI_API_KEY`                                                                                               | 透過 Xiaomi 聊天完成使用的 MiMo TTS。                                    |

若設定了多個供應商，會先使用選取的供應商，其餘則作為備選方案。自動摘要使用 `summaryModel` (或
`agents.defaults.model.primary`)，因此若您啟用摘要，該供應商也必須已通過驗證。

<Warning>隨附的 **Microsoft** 供應商透過 `node-edge-tts` 使用 Microsoft Edge 的線上神經網路 TTS 服務。這是一項不提供公開 SLA 或配額的公開網路服務 — 請將其視為盡力而為。舊版供應商 ID `edge` 會被正規化為 `microsoft`，且 `openclaw doctor --fix` 會重寫已保存的設定；新設定應一律使用 `microsoft`。</Warning>

## 設定

TTS 配置位於 `messages.tts` 中的 `~/.openclaw/openclaw.json` 下。選擇一個預設並調整供應商區塊：

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

### 個別代理語音覆寫

當其中一個代理應使用不同的供應商、語音、模型、Persona 或自動 TTS 模式說話時，請使用 `agents.list[].tts`。代理區塊會對 `messages.tts` 進行深度合併，因此供應商憑證可以保留在全域供應商配置中：

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

若要指定特定代理的 Persona，請在供應商配置旁設置 `agents.list[].tts.persona` —— 它僅會覆寫該代理的全域 `messages.tts.persona`。

自動回覆、`/tts audio`、`/tts status` 以及
`tts` 代理工具的優先順序：

1. `messages.tts`
2. 作用中的 `agents.list[].tts`
3. 頻道覆寫，當頻道支援 `channels.<channel>.tts` 時
4. 帳號覆寫，當頻道傳遞 `channels.<channel>.accounts.<id>.tts` 時
5. 此主機的本地 `/tts` 偏好設定
6. 當啟用 [模型覆寫](#model-driven-directives) 時的行內 `[[tts:...]]` 指令

頻道和帳號覆寫使用與 `messages.tts` 相同的結構，並與上層進行深度合併，因此共享的提供者憑證可以保留在
`messages.tts` 中，而頻道或機器人帳號僅需變更語音、模型、角色
或自動模式：

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

**角色** 是一個穩定的語音身份，可在不同提供者之間確定性套用。它可以偏好特定提供者、定義與提供者無關的提示意圖，並攜帶針對語音、模型、提示範本、種子和語音設定的特定提供者綁定。

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

### 完整角色（與提供者無關的提示）

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

作用中的角色是依據以下方式確定性地選取：

1. `/tts persona <id>` 本地偏好設定（若已設定）。
2. `messages.tts.persona`（若已設定）。
3. 無角色。

提供者選擇採用明確優先原則：

1. 直接覆寫（CLI、閘道、Talk、允許的 TTS 指令）。
2. `/tts provider <id>` 本地偏好設定。
3. 作用中角色的 `provider`。
4. `messages.tts.provider`。
5. 註冊表自動選擇。

對於每次提供者嘗試，OpenClaw 會依據以下順序合併設定：

1. `messages.tts.providers.<id>`
2. `messages.tts.personas.<persona>.providers.<id>`
3. 受信任請求覆寫
4. 允許的模型發出 TTS 指令覆寫

### 提供者如何使用角色提示

角色提示欄位（`profile`、`scene`、`sampleContext`、`style`、`accent`、
`pacing`、`constraints`）是 **與提供者無關** 的。每個提供者自行決定如何使用它們：

<AccordionGroup>
  <Accordion title="Google Gemini">
    僅當有效的 Google 提供者設定設定了 `promptTemplate: "audio-profile-v1"`
    或 `personaPrompt` 時，將 persona 提示欄位包裝在 Gemini TTS 提示結構中。較舊的 `audioProfile` 和 `speakerName` 欄位仍會作為 Google 特定的提示文字前綴。`[[tts:text]]` 區塊內的行內音訊標籤（如 `[whispers]` 或 `[laughs]`）會保留在 Gemini 轉錄中；OpenClaw 不會產生這些標籤。
  </Accordion>
  <Accordion title="OpenAI">
    僅當未設定明確的 OpenAI `instructions` 時，將 persona 提示欄位對應至請求的 `instructions` 欄位。明確的 `instructions` 總是優先。
  </Accordion>
  <Accordion title="Other providers">
    僅使用 `personas.<id>.providers.<provider>` 下的提供者特定 persona 綁定。除非提供者實作了自己的 persona 提示對應，否則會忽略 persona 提示欄位。
  </Accordion>
</AccordionGroup>

### 後備策略

當 persona 對嘗試的提供者**沒有綁定**時，`fallbackPolicy` 控制其行為：

| 策略                | 行為                                                                                                        |
| ------------------- | ----------------------------------------------------------------------------------------------------------- |
| `preserve-persona`  | **預設值。** 提供者中立的提示欄位保持可用；提供者可以使用它們或忽略它們。                                   |
| `provider-defaults` | 在該次嘗試的提示準備中省略 persona；提供者使用其中立的預設值，同時繼續後備至其他提供者。                    |
| `fail`              | 使用 `reasonCode: "not_configured"` 和 `personaBinding: "missing"` 跳過該次提供者嘗試。仍會嘗試後備提供者。 |

只有當**每個**嘗試的提供者都被跳過或失敗時，整個 TTS 請求才會失敗。

## 模型驅動的指令

根據預設，助理**可以**發出 `[[tts:...]]` 指令，以針對單一回覆覆寫語音、模型或速度，並加上一個可選的 `[[tts:text]]...[[/tts:text]]` 區塊，用於僅應出現在音訊中的表達線索：

```text
Here you go.

[[tts:voiceId=pMsXgVXv3BLzUgSXRplE model=eleven_v3 speed=1.1]]
[[tts:text]](laughs) Read the song once more.[[/tts:text]]
```

當 `messages.tts.auto` 為 `"tagged"` 時，**必須使用指令** 才能觸發
音訊。串流區塊傳遞會在通道看到指令之前，先將其從可見文字中移除，
即使指令分散在相鄰的區塊中也一樣。

`provider=...` 會被忽略，除非有 `modelOverrides.allowProvider: true`。當回覆
宣告了 `provider=...`，該指令中的其他金鑰僅會由該供應商解析；
不支援的金鑰會被移除並回報為 TTS 指令警告。

**可用的指令金鑰：**

- `provider` (註冊的供應商 ID；需要 `allowProvider: true`)
- `voice` / `voiceName` / `voice_name` / `google_voice` / `voiceId`
- `model` / `google_model`
- `stability`、`similarityBoost`、`style`、`speed`、`useSpeakerBoost`
- `vol` / `volume` (MiniMax 音量，0–10)
- `pitch` (MiniMax 整數音高，−12 至 12；小數值會被截斷)
- `emotion` (Volcengine 情感標籤)
- `applyTextNormalization` (`auto|on|off`)
- `languageCode` (ISO 639-1)
- `seed`

**完全停用模型覆寫：**

```json5
{ messages: { tts: { modelOverrides: { enabled: false } } } }
```

**允許切換供應商，同時保持其他設定可配置：**

```json5
{ messages: { tts: { modelOverrides: { enabled: true, allowProvider: true, allowSeed: false } } } }
```

## 斜線指令

單一指令 `/tts`。在 Discord 上，OpenClaw 也會註冊 `/voice`，因為
`/tts` 是 Discord 的內建指令 — 文字 `/tts ...` 仍然有效。

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

<Note>指令需要授權的發送者 (套用允許清單/擁有者規則)，且必須啟用 `commands.text` 或原生指令註冊。</Note>

行為備註：

- `/tts on` 將本機 TTS 偏好寫入 `always`；`/tts off` 將其寫入 `off`。
- `/tts chat on|off|default` 為目前聊天寫入一個範圍為 session 的 auto-TTS 覆寫值。
- `/tts persona <id>` 寫入本機 persona 偏好；`/tts persona off` 會將其清除。
- `/tts latest` 從目前 session 記錄中讀取最新的助理回覆並將其作為音訊傳送一次。它僅會在 session 項目上儲存該回覆的雜湊值，以避免重複傳送語音。
- `/tts audio` 產生一次性音訊回覆（並**不**會開啟 TTS）。
- `limit` 和 `summary` 儲存在 **local prefs** 中，而不是主要設定。
- `/tts status` 包含針對最新嘗試的備用診斷資訊 —— `Fallback: <primary> -> <used>`、`Attempts: ...`，以及每次嘗試的細節 (`provider:outcome(reasonCode) latency`)。
- 當 TTS 啟用時，`/status` 會顯示作用的 TTS 模式以及設定的 provider、模型、語音，以及經過清理的自訂端點中繼資料。

## 每個使用者的偏好設定

Slash 指令會將本機覆寫值寫入 `prefsPath`。預設值為
`~/.openclaw/settings/tts.json`；可透過 `OPENCLAW_TTS_PREFS` 環境變數
或 `messages.tts.prefsPath` 覆寫。

| 儲存的欄位  | 作用                                    |
| ----------- | --------------------------------------- |
| `auto`      | 本機 auto-TTS 覆寫 (`always`, `off`, …) |
| `provider`  | 本機主要 provider 覆寫                  |
| `persona`   | 本機 persona 覆寫                       |
| `maxLength` | 摘要閾值 (預設 `1500` 個字元)           |
| `summarize` | 摘要切換 (預設 `true`)                  |

這些設定會覆寫來自 `messages.tts` 的有效配置，以及針對該主機作用的
`agents.list[].tts` 區塊。

## 輸出格式（固定）

TTS 語音傳送是由通道能力驅動的。通道外掛程式會宣佈語音風格的 TTS 應該向提供者請求原生的 `voice-note` 目標，還是保持正常的 `audio-file` 合成，並僅標記相容的輸出以進行語音傳送。

- **支援語音訊息的通道**：語音訊息回覆偏好 Opus（來自 ElevenLabs 的 `opus_48000_64`，來自 OpenAI 的 `opus`）。
  - 48kHz / 64kbps 是語音訊息的良好取捨。
- **Feishu / WhatsApp**：當語音訊息回覆產生為 MP3/WebM/WAV/M4A 或其他可能的音訊檔案時，通道外掛程式會在發送原生的語音訊息之前，使用 `ffmpeg` 將其轉碼為 48kHz Ogg/Opus。WhatsApp 會透過 Baileys `audio` 載荷發送結果，並包含 `ptt: true` 和 `audio/ogg; codecs=opus`。如果轉換失敗，Feishu 會將原始檔案作為附件接收；WhatsApp 則會傳送失敗，而不是發布不相容的 PTT 載荷。
- **BlueBubbles**：將提供者合成保持在正常的音訊檔案路徑上；MP3 和 CAF 輸出會被標記為 iMessage 語音備忘錄傳送。
- **其他通道**：MP3（來自 ElevenLabs 的 `mp3_44100_128`，來自 OpenAI 的 `mp3`）。
  - 44.1kHz / 128kbps 是語音清晰度的預設平衡值。
- **MiniMax**：MP3（`speech-2.8-hd` 模型，32kHz 採樣率）用於正常的音訊附件。對於通道宣佈的語音訊息目標，當通道宣佈支援轉碼時，OpenClaw 會在傳送前將 MiniMax MP3 轉碼為帶有 `ffmpeg` 的 48kHz Opus。
- **Xiaomi MiMo**：預設為 MP3，或根據配置使用 WAV。對於通道宣佈的語音訊息目標，當通道宣佈支援轉碼時，OpenClaw 會在傳送前將小米輸出轉碼為帶有 `ffmpeg` 的 48kHz Opus。
- **Local CLI**：使用設定的 `outputFormat`。語音訊息目標會轉換為 Ogg/Opus，而電話輸出會使用 `ffmpeg` 轉換為原始的 16 kHz 單聲道 PCM。
- **Google Gemini**: Gemini API TTS 傳回原始的 24kHz PCM。OpenClaw 會將其包裝為 WAV 以用於音訊附件，轉碼為 48kHz Opus 以用於語音訊息目標，並直接傳回 PCM 以用於 Talk/電話。
- **Gradium**: 音訊附件使用 WAV，語音訊息目標使用 Opus，而電話則使用 8 kHz 的 `ulaw_8000`。
- **Inworld**: 一般音訊附件使用 MP3，語音訊息目標使用原生 `OGG_OPUS`，而 Talk/電話則使用 22050 Hz 的原始 `PCM`。
- **xAI**: 預設為 MP3；`responseFormat` 可以是 `mp3`、`wav`、`pcm`、`mulaw` 或 `alaw`。OpenClaw 使用 xAI 的批次 REST TTS 端點並傳回完整的音訊附件；此提供者路徑不使用 xAI 的串流 TTS WebSocket。此路徑不支援原生 Opus 語音訊息格式。
- **Microsoft**: 使用 `microsoft.outputFormat` (預設為 `audio-24khz-48kbitrate-mono-mp3`)。
  - 隨附的傳輸接受 `outputFormat`，但並非所有格式都可從服務取得。
  - 輸出格式值遵循 Microsoft Speech 輸出格式 (包括 Ogg/WebM Opus)。
  - Telegram `sendVoice` 接受 OGG/MP3/M4A；如果您需要
    保證的 Opus 語音訊息，請使用 OpenAI/ElevenLabs。
  - 如果設定的 Microsoft 輸出格式失敗，OpenClaw 會以 MP3 重試。

OpenAI/ElevenLabs 輸出格式是根據頻道固定的 (參見上文)。

## Auto-TTS 行為

啟用 `messages.tts.auto` 時，OpenClaw 會：

- 如果回覆已經包含媒體或 `MEDIA:` 指令，則跳過 TTS。
- 跳過非常短的回覆 (少於 10 個字元)。
- 當啟用摘要時，使用
  `summaryModel` (或 `agents.defaults.model.primary`) 對長回覆進行摘要。
- 將產生的音訊附加到回覆。
- 在 `mode: "final"` 中，仍會在文字串流完成後針對串流的最終回覆
  傳送僅含音訊的 TTS；產生的媒體會經過與一般回覆附件相同的
  頻道媒體正規化處理。

如果回覆超過 `maxLength` 且摘要關閉（或沒有摘要模型的 API 金鑰），將跳過音訊並發送正常的文字回覆。

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

## 各頻道的輸出格式

| 目標                                  | 格式                                                                                                                              |
| ------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------- |
| Feishu / Matrix / Telegram / WhatsApp | 語音訊息回覆偏好 **Opus**（來自 ElevenLabs 的 `opus_48000_64`，來自 OpenAI 的 `opus`）。48 kHz / 64 kbps 平衡了清晰度與檔案大小。 |
| 其他頻道                              | **MP3**（來自 ElevenLabs 的 `mp3_44100_128`，來自 OpenAI 的 `mp3`）。語音預設 44.1 kHz / 128 kbps。                               |
| Talk / 電話                           | 提供者原生的 **PCM**（Inworld 22050 Hz，Google 24 kHz），或來自 Gradium 的 `ulaw_8000` 用於電話。                                 |

各提供者說明：

- **Feishu / WhatsApp 轉碼：** 當語音訊息回覆為 MP3/WebM/WAV/M4A 格式時，頻道外掛會使用 `ffmpeg` 轉碼為 48 kHz Ogg/Opus。WhatsApp 透過 Baileys 發送，使用 `ptt: true` 和 `audio/ogg; codecs=opus`。如果轉換失敗：Feishu 會退回附加原始檔案；WhatsApp 發送會失敗，而不是發送不相容的 PTT 資料。
- **MiniMax / Xiaomi MiMo：** 預設 MP3（MiniMax `speech-2.8-hd` 為 32 kHz）；透過 `ffmpeg` 轉碼為 48 kHz Opus 用於語音訊息目標。
- **Local CLI：** 使用設定的 `outputFormat`。語音訊息目標會轉換為 Ogg/Opus，電話輸出則轉換為原始 16 kHz 單聲道 PCM。
- **Google Gemini：** 返回原始 24 kHz PCM。OpenClaw 將其包裝為 WAV 用於附件，轉碼為 48 kHz Opus 用於語音訊息目標，並直接返回 PCM 用於 Talk/電話。
- **Inworld：** MP3 附件，原生 `OGG_OPUS` 語音訊息，Talk/電話用原始 `PCM` 22050 Hz。
- **xAI：** 預設 MP3；`responseFormat` 可能為 `mp3|wav|pcm|mulaw|alaw`。使用 xAI 的批次 REST 端點 — 不使用串流 WebSocket TTS。不支援原生 Opus 語音訊息格式。
- **Microsoft：** 使用 `microsoft.outputFormat`（預設 `audio-24khz-48kbitrate-mono-mp3`）。Telegram `sendVoice` 接受 OGG/MP3/M4A；如果您需要保證獲得 Opus 語音訊息，請使用 OpenAI/ElevenLabs。如果設定的 Microsoft 格式失敗，OpenClaw 會使用 MP3 重試。

OpenAI 和 ElevenLabs 的輸出格式依各通道固定，如上所列。

## 欄位參考

<AccordionGroup>
  <Accordion title="Top-level messages.tts.*">
    <ParamField path="auto" type='"off" | "always" | "inbound" | "tagged"'>
      自動 TTS 模式。`inbound` 僅在收到語音訊息後發送音訊；`tagged` 僅在回覆包含 `[[tts:...]]` 指令或 `[[tts:text]]` 區塊時發送音訊。
    </ParamField>
    <ParamField path="enabled" type="boolean" deprecated>
      舊版切換開關。`openclaw doctor --fix` 會將此遷移至 `auto`。
    </ParamField>
    <ParamField path="mode" type='"final" | "all"' default="final">
      `"all"` 除了最終回覆外，還包含工具/區塊回覆。
    </ParamField>
    <ParamField path="provider" type="string">
      語音供應商 ID。若未設定，OpenClaw 將依註冊表自動選擇順序使用第一個設定的供應商。舊版 `provider: "edge"` 會由 `openclaw doctor --fix` 重寫為 `"microsoft"`。
    </ParamField>
    <ParamField path="persona" type="string">
      來自 `personas` 的現用 Persona ID。會正規化為小寫。
    </ParamField>
    <ParamField path="personas.<id>" type="object">
      穩定的語音身分。欄位：`label`、`description`、`provider`、`fallbackPolicy`、`prompt`、`providers.<provider>`。參閱 [Personas](#personas)。
    </ParamField>
    <ParamField path="summaryModel" type="string">
      用於自動摘要的便宜模型；預設為 `agents.defaults.model.primary`。接受 `provider/model` 或設定的模型別名。
    </ParamField>
    <ParamField path="modelOverrides" type="object">
      允許模型輸出 TTS 指令。`enabled` 預設為 `true`；`allowProvider` 預設為 `false`。
    </ParamField>
    <ParamField path="providers.<id>" type="object">
      由語音供應商 ID 索引的供應商專屬設定。舊版直接區塊 (`messages.tts.openai`、`.elevenlabs`、`.microsoft`、`.edge`) 會由 `openclaw doctor --fix` 重寫；僅提交 `messages.tts.providers.<id>`。
    </ParamField>
    <ParamField path="maxTextLength" type="number">
      TTS 輸入字元的硬上限。若超過則 `/tts audio` 失敗。
    </ParamField>
    <ParamField path="timeoutMs" type="number">
      要求逾時時間（毫秒）。
    </ParamField>
    <ParamField path="prefsPath" type="string">
      覆寫本機偏好設定 JSON 路徑 (provider/limit/summary)。預設為 `~/.openclaw/settings/tts.json`。
    </ParamField>
  </Accordion>

<Accordion title="Azure Speech">
  <ParamField path="apiKey" type="string">
    環境變數：`AZURE_SPEECH_KEY`、`AZURE_SPEECH_API_KEY` 或 `SPEECH_KEY`。
  </ParamField>
  <ParamField path="region" type="string">
    Azure Speech 區域（例如 `eastus`）。環境變數：`AZURE_SPEECH_REGION` 或 `SPEECH_REGION`。
  </ParamField>
  <ParamField path="endpoint" type="string">
    選用的 Azure Speech 端點覆寫（別名 `baseUrl`）。
  </ParamField>
  <ParamField path="voice" type="string">
    Azure 語音 ShortName。預設為 `en-US-JennyNeural`。
  </ParamField>
  <ParamField path="lang" type="string">
    SSML 語言代碼。預設為 `en-US`。
  </ParamField>
  <ParamField path="outputFormat" type="string">
    標準音訊的 Azure `X-Microsoft-OutputFormat`。預設為 `audio-24khz-48kbitrate-mono-mp3`。
  </ParamField>
  <ParamField path="voiceNoteOutputFormat" type="string">
    語音訊息輸出的 Azure `X-Microsoft-OutputFormat`。預設為 `ogg-24khz-16bit-mono-opus`。
  </ParamField>
</Accordion>

<Accordion title="ElevenLabs">
  <ParamField path="apiKey" type="string">
    後備為 `ELEVENLABS_API_KEY` 或 `XI_API_KEY`。
  </ParamField>
  <ParamField path="model" type="string">
    模型 ID（例如 `eleven_multilingual_v2`、`eleven_v3`）。
  </ParamField>
  <ParamField path="voiceId" type="string">
    ElevenLabs 語音 ID。
  </ParamField>
  <ParamField path="voiceSettings" type="object">
    `stability`、`similarityBoost`、`style`（各 `0..1`）、`useSpeakerBoost`（`true|false`）、`speed`（`0.5..2.0`、`1.0` = 正常）。
  </ParamField>
  <ParamField path="applyTextNormalization" type='"auto" | "on" | "off"'>
    文字正規化模式。
  </ParamField>
  <ParamField path="languageCode" type="string">
    2 個字母的 ISO 639-1 代碼（例如 `en`、`de`）。
  </ParamField>
  <ParamField path="seed" type="number">
    整數 `0..4294967295` 用於盡力確定性。
  </ParamField>
  <ParamField path="baseUrl" type="string">
    覆寫 ElevenLabs API 基礎 URL。
  </ParamField>
</Accordion>

<Accordion title="Google Gemini">
  <ParamField path="apiKey" type="string">
    會退回到 `GEMINI_API_KEY` / `GOOGLE_API_KEY`。如果省略，TTS 可以在環境變數退回之前重用 `models.providers.google.apiKey`。
  </ParamField>
  <ParamField path="model" type="string">
    Gemini TTS 模型。預設 `gemini-3.1-flash-tts-preview`。
  </ParamField>
  <ParamField path="voiceName" type="string">
    Gemini 預建語音名稱。預設 `Kore`。別名：`voice`。
  </ParamField>
  <ParamField path="audioProfile" type="string">
    附加在口語文本之前的自然語言風格提示。
  </ParamField>
  <ParamField path="speakerName" type="string">
    當您的提示使用具名說話者時，附加在口語文本之前的可選說話者標籤。
  </ParamField>
  <ParamField path="promptTemplate" type='"audio-profile-v1"'>
    設定為 `audio-profile-v1` 以將作用中的 persona 提示欄位包裝在確定性的 Gemini TTS 提示結構中。
  </ParamField>
  <ParamField path="personaPrompt" type="string">
    附加至模板 Director's Notes 的 Google 特定額外 persona 提示文字。
  </ParamField>
  <ParamField path="baseUrl" type="string">
    僅接受 `https://generativelanguage.googleapis.com`。
  </ParamField>
</Accordion>

<Accordion title="Gradium">
  <ParamField path="apiKey" type="string">
    環境變數：`GRADIUM_API_KEY`。
  </ParamField>
  <ParamField path="baseUrl" type="string">
    預設 `https://api.gradium.ai`。
  </ParamField>
  <ParamField path="voiceId" type="string">
    預設 Emma (`YTpq7expH9539ERJ`)。
  </ParamField>
</Accordion>

<Accordion title="Inworld">
  <ParamField path="apiKey" type="string">
    環境變數：`INWORLD_API_KEY`。
  </ParamField>
  <ParamField path="baseUrl" type="string">
    預設 `https://api.inworld.ai`。
  </ParamField>
  <ParamField path="modelId" type="string">
    預設 `inworld-tts-1.5-max`。亦可使用：`inworld-tts-1.5-mini`、`inworld-tts-1-max`、`inworld-tts-1`。
  </ParamField>
  <ParamField path="voiceId" type="string">
    預設 `Sarah`。
  </ParamField>
  <ParamField path="temperature" type="number">
    採樣溫度 `0..2`。
  </ParamField>
</Accordion>

<Accordion title="Local CLI (tts-local-cli)">
  <ParamField path="command" type="string">
    CLI TTS 的本機可執行檔或命令字串。
  </ParamField>
  <ParamField path="args" type="string[]">
    命令參數。支援 `{{ Text }}`、`{{ OutputPath }}`、`{{ OutputDir }}`、`{{ OutputBase }}` 佔位符。
  </ParamField>
  <ParamField path="outputFormat" type='"mp3" | "opus" | "wav"'>
    預期的 CLI 輸出格式。音訊附件預設為 `mp3`。
  </ParamField>
  <ParamField path="timeoutMs" type="number">
    命令逾時時間（毫秒）。預設 `120000`。
  </ParamField>
  <ParamField path="cwd" type="string">
    選用的命令工作目錄。
  </ParamField>
  <ParamField path="env" type="Record<string, string>">
    選用的命令環境變數覆蓋。
  </ParamField>
</Accordion>

<Accordion title="Microsoft (無需 API 金鑰)">
  <ParamField path="enabled" type="boolean" default="true">
    允許使用 Microsoft 語音。
  </ParamField>
  <ParamField path="voice" type="string">
    Microsoft 神經語音名稱 (例如 `en-US-MichelleNeural`)。
  </ParamField>
  <ParamField path="lang" type="string">
    語言代碼 (例如 `en-US`)。
  </ParamField>
  <ParamField path="outputFormat" type="string">
    Microsoft 輸出格式。預設為 `audio-24khz-48kbitrate-mono-mp3`。並非所有格式都受內建的 Edge 支援傳輸支援。
  </ParamField>
  <ParamField path="rate / pitch / volume" type="string">
    百分比字串 (例如 `+10%`、 `-5%`)。
  </ParamField>
  <ParamField path="saveSubtitles" type="boolean">
    在音訊檔案旁寫入 JSON 字幕。
  </ParamField>
  <ParamField path="proxy" type="string">
    Microsoft 語音請求的 Proxy URL。
  </ParamField>
  <ParamField path="timeoutMs" type="number">
    請求逾時覆寫 (毫秒)。
  </ParamField>
  <ParamField path="edge.*" type="object" deprecated>
    舊版別名。執行 `openclaw doctor --fix` 以將持久化的設定重寫為 `providers.microsoft`。
  </ParamField>
</Accordion>

<Accordion title="MiniMax">
  <ParamField path="apiKey" type="string">
    回退至 `MINIMAX_API_KEY`。通過 `MINIMAX_OAUTH_TOKEN`、`MINIMAX_CODE_PLAN_KEY` 或 `MINIMAX_CODING_API_KEY` 進行 Token Plan 身份驗證。
  </ParamField>
  <ParamField path="baseUrl" type="string">
    預設值 `https://api.minimax.io`。環境變數：`MINIMAX_API_HOST`。
  </ParamField>
  <ParamField path="model" type="string">
    預設值 `speech-2.8-hd`。環境變數：`MINIMAX_TTS_MODEL`。
  </ParamField>
  <ParamField path="voiceId" type="string">
    預設值 `English_expressive_narrator`。環境變數：`MINIMAX_TTS_VOICE_ID`。
  </ParamField>
  <ParamField path="speed" type="number">
    `0.5..2.0`。預設值 `1.0`。
  </ParamField>
  <ParamField path="vol" type="number">
    `(0, 10]`。預設值 `1.0`。
  </ParamField>
  <ParamField path="pitch" type="number">
    整數 `-12..12`。預設值 `0`。小數值會在請求前被截斷。
  </ParamField>
</Accordion>

<Accordion title="OpenAI">
  <ParamField path="apiKey" type="string">
    會回退到 `OPENAI_API_KEY`。
  </ParamField>
  <ParamField path="model" type="string">
    OpenAI TTS 模型 ID（例如 `gpt-4o-mini-tts`）。
  </ParamField>
  <ParamField path="voice" type="string">
    語音名稱（例如 `alloy`、`cedar`）。
  </ParamField>
  <ParamField path="instructions" type="string">
    明確的 OpenAI `instructions` 欄位。設定時，Persona 提示詞欄位將**不**會自動對應。
  </ParamField>
  <ParamField path="baseUrl" type="string">
    覆寫 OpenAI TTS 端點。解析順序：config → `OPENAI_TTS_BASE_URL` → `https://api.openai.com/v1`。非預設值將被視為 OpenAI 相容的 TTS 端點，因此接受自訂模型和語音名稱。
  </ParamField>
</Accordion>

<Accordion title="OpenRouter">
  <ParamField path="apiKey" type="string">
    環境變數：`OPENROUTER_API_KEY`。可重複使用 `models.providers.openrouter.apiKey`。
  </ParamField>
  <ParamField path="baseUrl" type="string">
    預設 `https://openrouter.ai/api/v1`。舊版 `https://openrouter.ai/v1` 會被正規化。
  </ParamField>
  <ParamField path="model" type="string">
    預設 `hexgrad/kokoro-82m`。別名：`modelId`。
  </ParamField>
  <ParamField path="voice" type="string">
    預設 `af_alloy`。別名：`voiceId`。
  </ParamField>
  <ParamField path="responseFormat" type='"mp3" | "pcm"'>
    預設 `mp3`。
  </ParamField>
  <ParamField path="speed" type="number">
    提供者原生的速度覆寫。
  </ParamField>
</Accordion>

<Accordion title="Volcengine (BytePlus Seed Speech)">
  <ParamField path="apiKey" type="string">
    環境變數：`VOLCENGINE_TTS_API_KEY` 或 `BYTEPLUS_SEED_SPEECH_API_KEY`。
  </ParamField>
  <ParamField path="resourceId" type="string">
    預設 `seed-tts-1.0`。環境變數：`VOLCENGINE_TTS_RESOURCE_ID`。當您的專案具有 TTS 2.0 權限時，請使用 `seed-tts-2.0`。
  </ParamField>
  <ParamField path="appKey" type="string">
    App key 標頭。預設 `aGjiRDfUWi`。環境變數：`VOLCENGINE_TTS_APP_KEY`。
  </ParamField>
  <ParamField path="baseUrl" type="string">
    覆寫 Seed Speech TTS HTTP 端點。環境變數：`VOLCENGINE_TTS_BASE_URL`。
  </ParamField>
  <ParamField path="voice" type="string">
    語音類型。預設 `en_female_anna_mars_bigtts`。環境變數：`VOLCENGINE_TTS_VOICE`。
  </ParamField>
  <ParamField path="speedRatio" type="number">
    提供者原生的速度比率。
  </ParamField>
  <ParamField path="emotion" type="string">
    提供者原生的情感標籤。
  </ParamField>
  <ParamField path="appId / token / cluster" type="string" deprecated>
    舊版 Volcengine Speech Console 欄位。環境變數：`VOLCENGINE_TTS_APPID`、`VOLCENGINE_TTS_TOKEN`、`VOLCENGINE_TTS_CLUSTER` (預設 `volcano_tts`)。
  </ParamField>
</Accordion>

<Accordion title="xAI">
  <ParamField path="apiKey" type="string">
    環境變數：`XAI_API_KEY`。
  </ParamField>
  <ParamField path="baseUrl" type="string">
    預設值 `https://api.x.ai/v1`。環境變數：`XAI_BASE_URL`。
  </ParamField>
  <ParamField path="voiceId" type="string">
    預設值 `eve`。可用語音：`ara`、`eve`、`leo`、`rex`、`sal`、`una`。
  </ParamField>
  <ParamField path="language" type="string">
    BCP-47 語言代碼或 `auto`。預設值 `en`。
  </ParamField>
  <ParamField path="responseFormat" type='"mp3" | "wav" | "pcm" | "mulaw" | "alaw"'>
    預設值 `mp3`。
  </ParamField>
  <ParamField path="speed" type="number">
    提供者原生的速度覆蓋。
  </ParamField>
</Accordion>

  <Accordion title="Xiaomi MiMo">
    <ParamField path="apiKey" type="string">環境變數： `XIAOMI_API_KEY`。</ParamField>
    <ParamField path="baseUrl" type="string">預設值 `https://api.xiaomimimo.com/v1`。環境變數： `XIAOMI_BASE_URL`。</ParamField>
    <ParamField path="model" type="string">預設值 `mimo-v2.5-tts`。環境變數： `XIAOMI_TTS_MODEL`。也支援 `mimo-v2-tts`。</ParamField>
    <ParamField path="voice" type="string">預設值 `mimo_default`。環境變數： `XIAOMI_TTS_VOICE`。</ParamField>
    <ParamField path="format" type='"mp3" | "wav"'>預設值 `mp3`。環境變數： `XIAOMI_TTS_FORMAT`。</ParamField>
    <ParamField path="style" type="string">作為使用者訊息傳送的可選自然語言風格指令；不會被朗讀。</ParamField>
  </Accordion>
</AccordionGroup>

## Agent 工具

`tts` 工具會將文字轉換為語音並傳回音訊附件以進行回覆傳送。在飛書、Matrix、Telegram 和 WhatsApp 上，音訊會以語音訊息的形式而非檔案附件的形式傳送。當 `ffmpeg` 可用時，飛書和 WhatsApp 可以在此路徑上轉碼非 Opus 的 TTS 輸出。

WhatsApp 透過 Baileys 將音訊作為 PTT 語音留言（`audio` 搭配 `ptt: true`）發送，並且會**單獨**發送可見文字，因為用戶端並不一致地在語音留言上呈現標題。

該工具接受可選的 `channel` 和 `timeoutMs` 欄位；`timeoutMs` 是每次呼叫的供應商請求逾時時間（毫秒）。

## Gateway RPC

| 方法              | 用途                                |
| ----------------- | ----------------------------------- |
| `tts.status`      | 讀取目前的 TTS 狀態和上次嘗試記錄。 |
| `tts.enable`      | 將本機自動偏好設定為 `always`。     |
| `tts.disable`     | 將本地自動偏好設定為 `off`。        |
| `tts.convert`     | 單次文字轉語音。                    |
| `tts.setProvider` | 設定本地提供商偏好。                |
| `tts.setPersona`  | 設定本地 Persona 偏好。             |
| `tts.providers`   | 列出已設定的提供商及狀態。          |

## 服務連結

- [OpenAI 文字轉語音指南](https://platform.openai.com/docs/guides/text-to-speech)
- [OpenAI Audio API 參考](https://platform.openai.com/docs/api-reference/audio)
- [Azure Speech REST 文字轉語音](https://learn.microsoft.com/azure/ai-services/speech-service/rest-text-to-speech)
- [Azure Speech 提供商](/zh-Hant/providers/azure-speech)
- [ElevenLabs 文字轉語音](https://elevenlabs.io/docs/api-reference/text-to-speech)
- [ElevenLabs 驗證](https://elevenlabs.io/docs/api-reference/authentication)
- [Gradium](/zh-Hant/providers/gradium)
- [Inworld TTS API](https://docs.inworld.ai/tts/tts)
- [MiniMax T2A v2 API](https://platform.minimaxi.com/document/T2A%20V2)
- [Volcengine TTS HTTP API](/zh-Hant/providers/volcengine#text-to-speech)
- [Xiaomi MiMo 語音合成](/zh-Hant/providers/xiaomi#text-to-speech)
- [node-edge-tts](https://github.com/SchneeHertz/node-edge-tts)
- [Microsoft Speech 輸出格式](https://learn.microsoft.com/azure/ai-services/speech-service/rest-text-to-speech#audio-outputs)
- [xAI 文字轉語音](https://docs.x.ai/developers/rest-api-reference/inference/voice#text-to-speech-rest)

## 相關

- [媒體總覽](/zh-Hant/tools/media-overview)
- [音樂生成](/zh-Hant/tools/music-generation)
- [影片生成](/zh-Hant/tools/video-generation)
- [斜線指令](/zh-Hant/tools/slash-commands)
- [語音通話外掛](/zh-Hant/plugins/voice-call)
