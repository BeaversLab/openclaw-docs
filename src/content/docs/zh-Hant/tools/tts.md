---
summary: "Text-to-speech for outbound replies — providers, personas, slash commands, and per-channel output"
read_when:
  - Enabling text-to-speech for replies
  - Configuring a TTS provider, fallback chain, or persona
  - Using /tts commands or directives
title: "Text-to-speech"
sidebarTitle: "Text to speech (TTS)"
---

OpenClaw 可以透過 **14 個語音提供商** 將外發回覆轉換為音訊，
並在飛書、Matrix、Telegram 和 WhatsApp 上發送原生語音訊息，
其他地方則發送音訊附件，並為電話和 Talk 提供 PCM/Ulaw 串流。

TTS 是 Talk 的 `stt-tts` 模式的語音輸出部分。供應商原生
`realtime` Talk 會話會在即時供應商內合成語音，而不是
呼叫此 TTS 路徑，而 `transcription` 會話則不會合成
助理語音回覆。

## 快速開始

<Steps>
  <Step title="選擇提供商">
    OpenAI 和 ElevenLabs 是最可靠的託管選項。Microsoft 和
    Local CLI 不需要 API 金鑰。請參閱 [提供商矩陣](#supported-providers)
    以取得完整清單。
  </Step>
  <Step title="設定 API 金鑰">
    為您的提供商匯出環境變數（例如 `OPENAI_API_KEY`、
    `ELEVENLABS_API_KEY`）。Microsoft 和 Local CLI 不需要金鑰。
  </Step>
  <Step title="在設定中啟用">
    設定 `messages.tts.auto: "always"` 和 `messages.tts.provider`：

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
  <Step title="在聊天中試用">
    `/tts status` 顯示當前狀態。`/tts audio Hello from OpenClaw`
    發送一次性音訊回覆。
  </Step>
</Steps>

<Note>Auto-TTS 預設為**關閉**。當未設定 `messages.tts.provider` 時， OpenClaw 會依照註冊表自動選擇順序挑選第一個已設定的提供商。 內建的 `tts` 代理工具僅用於明確意圖：普通聊天保持文字狀態， 除非使用者要求音訊、使用 `/tts`，或啟用 Auto-TTS/指令語音。</Note>

## 支援的提供商

| 提供商            | 驗證                                                                                                           | 備註                                                                          |
| ----------------- | -------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------- |
| **Azure 語音**    | `AZURE_SPEECH_KEY` + `AZURE_SPEECH_REGION`（也有 `AZURE_SPEECH_API_KEY`、`SPEECH_KEY`、`SPEECH_REGION`）       | 原生 Ogg/Opus 語音備忘錄輸出和電話功能。                                      |
| **DeepInfra**     | `DEEPINFRA_API_KEY`                                                                                            | OpenAI 相容的 TTS。預設為 `hexgrad/Kokoro-82M`。                              |
| **ElevenLabs**    | `ELEVENLABS_API_KEY` 或 `XI_API_KEY`                                                                           | 語音複製、多語言、透過 `seed` 確定性；串流用於 Discord 語音播放。             |
| **Google Gemini** | `GEMINI_API_KEY` 或 `GOOGLE_API_KEY`                                                                           | Gemini API 批次 TTS；透過 `promptTemplate: "audio-profile-v1"` 支援 persona。 |
| **Gradium**       | `GRADIUM_API_KEY`                                                                                              | 語音備忘錄和電話輸出。                                                        |
| **Inworld**       | `INWORLD_API_KEY`                                                                                              | 串流 TTS API。原生 Opus 語音備忘錄和 PCM 電話。                               |
| **Local CLI**     | 無                                                                                                             | 執行已設定的本地 TTS 指令。                                                   |
| **Microsoft**     | 無                                                                                                             | 透過 `node-edge-tts` 提供的公開 Edge 神經網路 TTS。盡力而為，無 SLA。         |
| **MiniMax**       | `MINIMAX_API_KEY` (或 Token 方案：`MINIMAX_OAUTH_TOKEN`、`MINIMAX_CODE_PLAN_KEY`、`MINIMAX_CODING_API_KEY`)    | T2A v2 API。預設為 `speech-2.8-hd`。                                          |
| **OpenAI**        | `OPENAI_API_KEY`                                                                                               | 也用於自動摘要；支援 persona `instructions`。                                 |
| **OpenRouter**    | `OPENROUTER_API_KEY` (可重複使用 `models.providers.openrouter.apiKey`)                                         | 預設模型 `hexgrad/kokoro-82m`。                                               |
| **Volcengine**    | `VOLCENGINE_TTS_API_KEY` 或 `BYTEPLUS_SEED_SPEECH_API_KEY` (舊版 AppID/token：`VOLCENGINE_TTS_APPID`/`_TOKEN`) | BytePlus Seed Speech HTTP API。                                               |
| **Vydra**         | `VYDRA_API_KEY`                                                                                                | 共用圖片、影片和語音提供商。                                                  |
| **xAI**           | `XAI_API_KEY`                                                                                                  | xAI 批次 TTS。不支援原生 Opus 語音備忘錄。                                    |
| **Xiaomi MiMo**   | `XIAOMI_API_KEY`                                                                                               | 透過 Xiaomi 聊天補全使用 MiMo TTS。                                           |

如果設定了多個提供商，會優先使用選定的提供商，其他的則作為備選。自動摘要使用 `summaryModel` (或
`agents.defaults.model.primary`)，因此如果您啟用摘要功能，該提供商也必須已通過驗證。

<Warning>內建的 **Microsoft** 提供者透過 `node-edge-tts` 使用 Microsoft Edge 的線上神經網路 TTS 服務。這是一項沒有發布 SLA 或配額的公開網路服務 — 請將其視為盡力而為的服務。舊版提供者 ID `edge` 會被正規化為 `microsoft`，且 `openclaw doctor --fix` 會重寫已持久化的設定；新設定應始終使用 `microsoft`。</Warning>

## 設定

TTS 設定位於 `~/.openclaw/openclaw.json` 中的 `messages.tts` 下。選擇一個預設集並調整提供者區塊：

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

### 各代理的語音覆寫

當某個代理應使用不同的提供商、聲音、模型、角色或自動 TTS 模式時，請使用 `agents.list[].tts`。代理區塊會對 `messages.tts` 進行深度合併（deep-merge），因此提供商憑證可以保留在全域提供商設定中：

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

若要釘選每個代理的角色，請在提供商設定旁設定 `agents.list[].tts.persona` —— 它僅會覆寫該代理的全域 `messages.tts.persona`。

自動回覆、`/tts audio`、`/tts status` 以及 `tts` 代理工具的優先順序如下：

1. `messages.tts`
2. 啟用的 `agents.list[].tts`
3. 通道覆寫，當通道支援 `channels.<channel>.tts` 時
4. 帳號覆寫，當通道傳遞 `channels.<channel>.accounts.<id>.tts` 時
5. 此主機的本地 `/tts` 偏好設定
6. 啟用 [模型覆寫](#model-driven-directives) 時的行內 `[[tts:...]]` 指令

通道和帳號覆寫使用與 `messages.tts` 相同的結構，並對先前的層級進行深度合併，因此共享的提供商憑證可以保留在 `messages.tts` 中，而通道或機器人帳號僅變更聲音、模型、角色或自動模式：

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

**角色** 是一個穩定的口語身分，可跨提供商確定性地套用。它可以偏好某個提供商，定義與提供商無關的提示意圖，並攜帶針對特定提供商的聲音、模型、提示範本、種子和聲音設定綁定。

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

### 完整角色（與提供商無關的提示）

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

啟用的角色是確定性地選取的：

1. `/tts persona <id>` 本地偏好設定（若有設定）。
2. `messages.tts.persona`（若有設定）。
3. 無角色。

提供商選擇以明確指定為優先：

1. 直接覆寫（CLI、閘道、Talk、允許的 TTS 指令）。
2. `/tts provider <id>` 本地偏好設定。
3. 啟用角色的 `provider`。
4. `messages.tts.provider`。
5. 註冊表自動選擇。

對於每次提供商嘗試，OpenClaw 會按以下順序合併設定：

1. `messages.tts.providers.<id>`
2. `messages.tts.personas.<persona>.providers.<id>`
3. 受信任請求覆寫
4. 允許模型發出的 TTS 指令覆寫

### 提供者如何使用 Persona 提示

Persona 提示欄位（`profile`、`scene`、`sampleContext`、`style`、`accent`、
`pacing`、`constraints`）是**提供者中立**（provider-neutral）的。每個提供者會自行決定如何使用它們：

<AccordionGroup>
  <Accordion title="Google Gemini">
    僅在有效的 Google 提供者設定設定了 `promptTemplate: "audio-profile-v1"`
    或 `personaPrompt` 時，將 Persona 提示欄位包裝在 Gemini TTS 提示結構中。較舊的 `audioProfile` 和 `speakerName` 欄位仍會
    作為 Google 特定的提示文字附加在開頭。`[[tts:text]]` 區塊內的內嵌音訊標籤，
    例如 `[whispers]` 或 `[laughs]`，會保留在
    Gemini 轉錄內；OpenClaw 不會產生這些標籤。
  </Accordion>
  <Accordion title="OpenAI">
    僅在未設定明確的 OpenAI `instructions` 時，將 Persona 提示欄位對應至請求的 `instructions` 欄位。明確的 `instructions`
    始終優先採用。
  </Accordion>
  <Accordion title="其他提供者">
    僅使用 `personas.<id>.providers.<provider>` 下的提供者特定 Persona 綁定。
    除非提供者實作了自己的 persona-prompt 對應，否則會忽略 Persona 提示欄位。
  </Accordion>
</AccordionGroup>

### 後備政策

當 Persona 對嘗試使用的提供者**沒有綁定**時，`fallbackPolicy` 控制其行為：

| 政策                | 行為                                                                                                      |
| ------------------- | --------------------------------------------------------------------------------------------------------- |
| `preserve-persona`  | **預設值。** 提供者中立的提示欄位保持可用；提供者可以選擇使用或忽略它們。                                 |
| `provider-defaults` | 在該次嘗試的提示準備中會省略 Persona；提供者使用其中立的預設值，同時繼續向其他提供者進行後備。            |
| `fail`              | 使用 `reasonCode: "not_configured"` 和 `personaBinding: "missing"` 跳過該供應商嘗試。仍會嘗試後備供應商。 |

只有當**每一個**嘗試過的供應商都被跳過或失敗時，整個 TTS 請求才會失敗。

Talk 會話供應商選擇的範圍僅限於該會話。Talk 客戶端應從 `talk.catalog` 中選擇供應商 ID、模型 ID、語音 ID 和語言環境，並將其透過 Talk 會話或轉接請求傳遞。開啟語音會話不應改變 `messages.tts` 或全域 Talk 供應商預設值。

## 模型驅動的指令

根據預設，助手**可以**發出 `[[tts:...]]` 指令來覆寫單一回覆的語音、模型或速度，以及一個可選的 `[[tts:text]]...[[/tts:text]]` 區塊，用於僅在音訊中呈現的表達提示：

```text
Here you go.

[[tts:voiceId=pMsXgVXv3BLzUgSXRplE model=eleven_v3 speed=1.1]]
[[tts:text]](laughs) Read the song once more.[[/tts:text]]
```

當 `messages.tts.auto` 為 `"tagged"` 時，**必須使用指令** 才能觸發音訊。串流區塊傳送會在通道看到指令之前將其從可見文字中移除，即使指令分散在相鄰的區塊中亦然。

`provider=...` 會被忽略，除非設定了 `modelOverrides.allowProvider: true`。當回覆聲明 `provider=...` 時，該指令中的其他鍵僅由該供應商解析；不支援的鍵將被移除並報告為 TTS 指令警告。

**可用的指令鍵：**

- `provider` (註冊的供應商 ID；需要 `allowProvider: true`)
- `voice` / `voiceName` / `voice_name` / `google_voice` / `voiceId`
- `model` / `google_model`
- `stability`, `similarityBoost`, `style`, `speed`, `useSpeakerBoost`
- `vol` / `volume` (MiniMax 音量，0–10)
- `pitch` (MiniMax 整數音高，−12 到 12；小數值會被截斷)
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

<Note>指令需要經過授權的發送者（適用白名單/擁有者規則），並且必須啟用 `commands.text` 或原生指令註冊。</Note>

行為註記：

- `/tts on` 會將本地 TTS 偏好設定寫入 `always`；`/tts off` 則將其寫入 `off`。
- `/tts chat on|off|default` 會為當前聊天寫入一個範圍限於會話的自動 TTS 覆寫設定。
- `/tts persona <id>` 寫入本地 persona 偏好設定；`/tts persona off` 則將其清除。
- `/tts latest` 會從當前會話記錄中讀取最新的助理回覆，並將其作為音訊發送一次。它僅在會話條目上儲存該回覆的雜湊值，以抑制重複的語音發送。
- `/tts audio` 產生一次性音訊回覆（**不**會開啟 TTS）。
- `limit` 和 `summary` 是儲存在 **本地偏好設定** 中，而非主設定檔。
- `/tts status` 包含最新嘗試的後備診斷資訊 —— `Fallback: <primary> -> <used>`、`Attempts: ...` 以及每次嘗試的詳細資料（`provider:outcome(reasonCode) latency`）。
- `/status` 會顯示啟用的 TTS 模式，以及已配置的供應商、模型、語音和經過清理的自訂端點中繼資料（當 TTS 已啟用時）。

## 個別使用者偏好設定

斜線指令會將本地覆寫寫入 `prefsPath`。預設為
`~/.openclaw/settings/tts.json`；可透過 `OPENCLAW_TTS_PREFS` 環境變數
或 `messages.tts.prefsPath` 進行覆寫。

| 已儲存欄位  | 效果                                   |
| ----------- | -------------------------------------- |
| `auto`      | 本機自動 TTS 覆寫 (`always`, `off`, …) |
| `provider`  | 本機主要供應商覆寫                     |
| `persona`   | 本機角色覆寫                           |
| `maxLength` | 摘要閾值（預設 `1500` 個字元）         |
| `summarize` | 摘要切換（預設 `true`）                |

這些設定會覆寫來自 `messages.tts` 的有效設定以及該主機的
啟用 `agents.list[].tts` 區塊。

## 輸出格式（固定）

TTS 語音傳送是由通道能力驅動的。通道外掛會宣告
語音風格的 TTS 應要求供應商提供原生 `voice-note` 目標，還是
保持正常的 `audio-file` 合成，並僅標記相容的輸出用於語音
傳送。

- **支援語音訊息的通道**：語音訊息回覆偏好 Opus（來自 ElevenLabs 的 `opus_48000_64`，來自 OpenAI 的 `opus`）。
  - 48kHz / 64kbps 是一個不錯的語音訊息取捨。
- **Feishu / WhatsApp**：當語音訊息回覆產生為 MP3/WebM/WAV/M4A
  或其他可能的音訊檔案時，通道外掛會在發送原生語音訊息之前使用 `ffmpeg` 將其轉碼為 48kHz
  Ogg/Opus。WhatsApp 會透過 Baileys 的 `audio` 載荷並搭配 `ptt: true` 和
  `audio/ogg; codecs=opus` 來發送結果。如果轉換失敗，Feishu 會收到原始
  檔案作為附件；WhatsApp 發送會失敗，而不是發布不相容的
  PTT 載荷。
- **其他通道**：MP3（來自 ElevenLabs 的 `mp3_44100_128`，來自 OpenAI 的 `mp3`）。
  - 44.1kHz / 128kbps 是語音清晰度的預設平衡值。
- **MiniMax**：用於正常音訊附件的 MP3（`speech-2.8-hd` 模型，32kHz 取樣率）。對於通道宣告的語音訊息目標，當通道宣告支援轉碼時，OpenClaw 會在傳送前使用 `ffmpeg` 將 MiniMax MP3 轉碼為 48kHz Opus。
- **Xiaomi MiMo**：預設為 MP3，或在配置時使用 WAV。對於頻道通告的語音訊息目標，當頻道通告支援轉碼時，OpenClaw 會在發送前使用 `ffmpeg` 將 Xiaomi 輸出轉碼為 48kHz Opus。
- **Local CLI**：使用配置的 `outputFormat`。語音訊息目標會轉換為 Ogg/Opus，而電話輸出則會使用 `ffmpeg` 轉換為原始 16 kHz 單聲道 PCM。
- **Google Gemini**：Gemini API TTS 會傳回原始 24kHz PCM。OpenClaw 會將其包裝為 WAV 以用於音訊附件，為語音訊息目標轉碼為 48kHz Opus，並直接為 Talk/電話傳回 PCM。
- **Gradium**：音訊附件為 WAV，語音訊息目標為 Opus，電話則為 8 kHz 的 `ulaw_8000`。
- **Inworld**：一般音訊附件為 MP3，語音訊息目標為原生 `OGG_OPUS`，而 Talk/電話則為 22050 Hz 的原始 `PCM`。
- **xAI**：預設為 MP3；`responseFormat` 可以是 `mp3`、`wav`、`pcm`、`mulaw` 或 `alaw`。OpenClaw 使用 xAI 的批次 REST TTS 端點並傳回完整的音訊附件；此提供者路徑不使用 xAI 的串流 TTS WebSocket。此路徑不支援原生 Opus 語音訊息格式。
- **Microsoft**：使用 `microsoft.outputFormat`（預設為 `audio-24khz-48kbitrate-mono-mp3`）。
  - 內建的傳輸接受 `outputFormat`，但並非所有格式都可從服務取得。
  - 輸出格式值遵循 Microsoft Speech 輸出格式（包括 Ogg/WebM Opus）。
  - Telegram `sendVoice` 接受 OGG/MP3/M4A；如果您需要保證的 Opus 語音訊息，請使用 OpenAI/ElevenLabs。
  - 如果設定的 Microsoft 輸出格式失敗，OpenClaw 會以 MP3 重試。

OpenAI/ElevenLabs 輸出格式根據頻道固定（見上文）。

## Auto-TTS 行為

當啟用 `messages.tts.auto` 時，OpenClaw 會：

- 如果回覆已經包含媒體或 `MEDIA:` 指令，則跳過 TTS。
- 跳過非常短的回覆（少於 10 個字元）。
- 當啟用摘要時，使用
  `summaryModel` (或 `agents.defaults.model.primary`) 對長回覆進行摘要。
- 將產生的音訊附加到回覆中。
- 在 `mode: "final"` 中，仍會在文字串流完成後針對串流的最終回覆
  僅發送 TTS 音訊；產生的媒體會像正常回覆附件一樣經過相同的
  頻道媒體正規化處理。

如果回覆超過 `maxLength` 且摘要已關閉 (或摘要模型沒有 API 金鑰)，
將跳過音訊並發送正常文字回覆。

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

| 目標                                | 格式                                                                                                                                 |
| ----------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------ |
| 飛書 / Matrix / Telegram / WhatsApp | 語音訊息回覆偏好 **Opus** (來自 ElevenLabs 的 `opus_48000_64`，來自 OpenAI 的 `opus`)。48 kHz / 64 kbps 在清晰度和大小之間取得平衡。 |
| 其他頻道                            | **MP3** (來自 ElevenLabs 的 `mp3_44100_128`，來自 OpenAI 的 `mp3`)。語音預設為 44.1 kHz / 128 kbps。                                 |
| Talk / 電話                         | 提供商原生的 **PCM** (Inworld 22050 Hz，Google 24 kHz)，或用於電話的來自 Gradium 的 `ulaw_8000`。                                    |

各提供商備註：

- **飛書 / WhatsApp 轉碼：** 當語音訊息回覆為 MP3/WebM/WAV/M4A 時，頻道外掛會使用 `ffmpeg` 轉碼為 48 kHz Ogg/Opus。WhatsApp 透過 Baileys 使用 `ptt: true` 和 `audio/ogg; codecs=opus` 發送。如果轉換失敗：飛書會回退為附加原始檔案；WhatsApp 發送會失敗，而不是發布不相容的 PTT 負載。
- **MiniMax / 小米 MiMo：** 預設 MP3 (MiniMax `speech-2.8-hd` 為 32 kHz)；透過 `ffmpeg` 為語音訊息目標轉碼為 48 kHz Opus。
- **本機 CLI：** 使用設定的 `outputFormat`。語音訊息目標會轉換為 Ogg/Opus，電話輸出會轉換為原始 16 kHz 單聲道 PCM。
- **Google Gemini：** 傳回原始 24 kHz PCM。OpenClaw 將附件封裝為 WAV，將語音訊息目標轉碼為 48 kHz Opus，並直接為 Talk/電話傳回 PCM。
- **Inworld：** MP3 附件，原生的 `OGG_OPUS` 語音訊息，用於 Talk/電話的原始 `PCM` 22050 Hz。
- **xAI：** 預設為 MP3；`responseFormat` 可能為 `mp3|wav|pcm|mulaw|alaw`。使用 xAI 的批次 REST 端點——不使用串流 WebSocket TTS。不支援原生的 Opus 語音訊息格式。
- **Microsoft：** 使用 `microsoft.outputFormat`（預設 `audio-24khz-48kbitrate-mono-mp3`）。Telegram `sendVoice` 接受 OGG/MP3/M4A；如果您需要保證的 Opus 語音訊息，請使用 OpenAI/ElevenLabs。如果設定的 Microsoft 格式失敗，OpenClaw 會以 MP3 重試。

OpenAI 和 ElevenLabs 的輸出格式根據每個頻道如上所述固定。

## 欄位參考

<AccordionGroup>
  <Accordion title="頂層 messages.tts.*">
    <ParamField path="auto" type='"off" | "always" | "inbound" | "tagged"'>
      自動 TTS 模式。`inbound` 僅在收到語音訊息後發送音訊；`tagged` 僅當回覆包含 `[[tts:...]]` 指令或 `[[tts:text]]` 區塊時才發送音訊。
    </ParamField>
    <ParamField path="enabled" type="boolean" deprecated>
      舊版切換開關。`openclaw doctor --fix` 會將此遷移至 `auto`。
    </ParamField>
    <ParamField path="mode" type='"final" | "all"' default="final">
      `"all"` 除了最終回覆外，還包含工具/區塊回覆。
    </ParamField>
    <ParamField path="provider" type="string">
      語音供應商 ID。若未設定，OpenClaw 將依照註冊表自動選取順序使用第一個已設定的供應商。舊版 `provider: "edge"` 會由 `openclaw doctor --fix` 重寫為 `"microsoft"`。
    </ParamField>
    <ParamField path="persona" type="string">
      來自 `personas` 的目前啟用 persona ID。會標準化為小寫。
    </ParamField>
    <ParamField path="personas.<id>" type="object">
      穩定的語音身分。欄位：`label`、`description`、`provider`、`fallbackPolicy`、`prompt`、`providers.<provider>`。請參閱 [Personas](#personas)。
    </ParamField>
    <ParamField path="summaryModel" type="string">
      用於自動摘要的平價模型；預設為 `agents.defaults.model.primary`。接受 `provider/model` 或已設定的模型別名。
    </ParamField>
    <ParamField path="modelOverrides" type="object">
      允許模型發出 TTS 指令。`enabled` 預設為 `true`；`allowProvider` 預設為 `false`。
    </ParamField>
    <ParamField path="providers.<id>" type="object">
      依語音供應商 ID 索引的供應商專屬設定。舊版直接區塊（`messages.tts.openai`、`.elevenlabs`、`.microsoft`、`.edge`）會由 `openclaw doctor --fix` 重寫；僅提交 `messages.tts.providers.<id>`。
    </ParamField>
    <ParamField path="maxTextLength" type="number">
      TTS 輸入字元的硬性上限。若超過則 `/tts audio` 失敗。
    </ParamField>
    <ParamField path="timeoutMs" type="number">
      要求逾時時間（毫秒）。
    </ParamField>
    <ParamField path="prefsPath" type="string">
      覆寫本機偏好設定 JSON 路徑（provider/limit/summary）。預設 `~/.openclaw/settings/tts.json`。
    </ParamField>
  </Accordion>

<Accordion title="Azure 語音">
  <ParamField path="apiKey" type="string">
    環境變數：`AZURE_SPEECH_KEY`、`AZURE_SPEECH_API_KEY` 或 `SPEECH_KEY`。
  </ParamField>
  <ParamField path="region" type="string">
    Azure 語音區域（例如 `eastus`）。環境變數：`AZURE_SPEECH_REGION` 或 `SPEECH_REGION`。
  </ParamField>
  <ParamField path="endpoint" type="string">
    選用的 Azure 語音端點覆寫（別名 `baseUrl`）。
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
    語音備忘錄輸出的 Azure `X-Microsoft-OutputFormat`。預設為 `ogg-24khz-16bit-mono-opus`。
  </ParamField>
</Accordion>

<Accordion title="ElevenLabs">
  <ParamField path="apiKey" type="string">
    如果失敗則回退至 `ELEVENLABS_API_KEY` 或 `XI_API_KEY`。
  </ParamField>
  <ParamField path="model" type="string">
    模型 ID（例如 `eleven_multilingual_v2`、`eleven_v3`）。
  </ParamField>
  <ParamField path="voiceId" type="string">
    ElevenLabs 語音 ID。
  </ParamField>
  <ParamField path="voiceSettings" type="object">
    `stability`、`similarityBoost`、`style`（每個 `0..1`）、`useSpeakerBoost`（`true|false`）、`speed`（`0.5..2.0`、`1.0` = 正常）。
  </ParamField>
  <ParamField path="applyTextNormalization" type='"auto" | "on" | "off"'>
    文字正規化模式。
  </ParamField>
  <ParamField path="languageCode" type="string">
    2 個字母的 ISO 639-1 代碼（例如 `en`、`de`）。
  </ParamField>
  <ParamField path="seed" type="number">
    用於盡力確定性結果的整數 `0..4294967295`。
  </ParamField>
  <ParamField path="baseUrl" type="string">
    覆寫 ElevenLabs API 基礎 URL。
  </ParamField>
</Accordion>

<Accordion title="Google Gemini">
  <ParamField path="apiKey" type="string">
    會回退至 `GEMINI_API_KEY` / `GOOGLE_API_KEY`。如果省略，TTS 可以在環境變數回退之前重用 `models.providers.google.apiKey`。
  </ParamField>
  <ParamField path="model" type="string">
    Gemini TTS 模型。預設為 `gemini-3.1-flash-tts-preview`。
  </ParamField>
  <ParamField path="voiceName" type="string">
    Gemini 預建語音名稱。預設為 `Kore`。別名：`voice`。
  </ParamField>
  <ParamField path="audioProfile" type="string">
    在口語文字前附加的自然語言風格提示詞。
  </ParamField>
  <ParamField path="speakerName" type="string">
    當您的提示詞使用具名說話者時，在口語文字前附加的可選說話者標籤。
  </ParamField>
  <ParamField path="promptTemplate" type='"audio-profile-v1"'>
    設定為 `audio-profile-v1`，將現用 persona 提示詞欄位包裝在確定性的 Gemini TTS 提示詞結構中。
  </ParamField>
  <ParamField path="personaPrompt" type="string">
    附加至模板 Director's Notes 的 Google 特定額外 persona 提示詞文字。
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
    預設為 `https://api.gradium.ai`。
  </ParamField>
  <ParamField path="voiceId" type="string">
    預設 Emma (`YTpq7expH9539ERJ`)。
  </ParamField>
</Accordion>

  <Accordion title="Inworld">
    ### Inworld 主要選項

    <ParamField path="apiKey" type="string">環境變數： `INWORLD_API_KEY`。</ParamField>
    <ParamField path="baseUrl" type="string">預設值 `https://api.inworld.ai`。</ParamField>
    <ParamField path="modelId" type="string">預設值 `inworld-tts-1.5-max`。也可用： `inworld-tts-1.5-mini`, `inworld-tts-1-max`, `inworld-tts-1`。</ParamField>
    <ParamField path="voiceId" type="string">預設值 `Sarah`。</ParamField>
    <ParamField path="temperature" type="number">取樣溫度 `0..2`。</ParamField>

  </Accordion>

<Accordion title="Local CLI (tts-local-cli)">
  <ParamField path="command" type="string">
    CLI TTS 的本機可執行檔或命令字串。
  </ParamField>
  <ParamField path="args" type="string[]">
    命令參數。支援 `{{ Text }}`, `{{ OutputPath }}`, `{{ OutputDir }}`, `{{ OutputBase }}` 佔位符。
  </ParamField>
  <ParamField path="outputFormat" type='"mp3" | "opus" | "wav"'>
    預期的 CLI 輸出格式。音訊附件的預設值為 `mp3`。
  </ParamField>
  <ParamField path="timeoutMs" type="number">
    命令逾時時間（毫秒）。預設值 `120000`。
  </ParamField>
  <ParamField path="cwd" type="string">
    選用的命令工作目錄。
  </ParamField>
  <ParamField path="env" type="Record<string, string>">
    選用的命令環境變數覆寫。
  </ParamField>
</Accordion>

<Accordion title="Microsoft (無 API 金鑰)">
  <ParamField path="enabled" type="boolean" default="true">
    允許使用 Microsoft 語音。
  </ParamField>
  <ParamField path="voice" type="string">
    Microsoft 神經語音名稱（例如 `en-US-MichelleNeural`）。
  </ParamField>
  <ParamField path="lang" type="string">
    語言代碼（例如 `en-US`）。
  </ParamField>
  <ParamField path="outputFormat" type="string">
    Microsoft 輸出格式。預設為 `audio-24khz-48kbitrate-mono-mp3`。並非所有格式都受到內建的 Edge 支援傳輸所支援。
  </ParamField>
  <ParamField path="rate / pitch / volume" type="string">
    百分比字串（例如 `+10%`、`-5%`）。
  </ParamField>
  <ParamField path="saveSubtitles" type="boolean">
    在音訊檔案旁寫入 JSON 字幕。
  </ParamField>
  <ParamField path="proxy" type="string">
    Microsoft 語音請求的 Proxy URL。
  </ParamField>
  <ParamField path="timeoutMs" type="number">
    請求逾時覆寫（毫秒）。
  </ParamField>
  <ParamField path="edge.*" type="object" deprecated>
    舊版別名。執行 `openclaw doctor --fix` 將持久化配置重寫為 `providers.microsoft`。
  </ParamField>
</Accordion>

<Accordion title="MiniMax">
  <ParamField path="apiKey" type="string">
    回退到 `MINIMAX_API_KEY`。透過 `MINIMAX_OAUTH_TOKEN`、`MINIMAX_CODE_PLAN_KEY` 或 `MINIMAX_CODING_API_KEY` 進行 Token Plan 驗證。
  </ParamField>
  <ParamField path="baseUrl" type="string">
    預設 `https://api.minimax.io`。環境變數：`MINIMAX_API_HOST`。
  </ParamField>
  <ParamField path="model" type="string">
    預設 `speech-2.8-hd`。環境變數：`MINIMAX_TTS_MODEL`。
  </ParamField>
  <ParamField path="voiceId" type="string">
    預設 `English_expressive_narrator`。環境變數：`MINIMAX_TTS_VOICE_ID`。
  </ParamField>
  <ParamField path="speed" type="number">
    `0.5..2.0`。預設 `1.0`。
  </ParamField>
  <ParamField path="vol" type="number">
    `(0, 10]`。預設 `1.0`。
  </ParamField>
  <ParamField path="pitch" type="number">
    整數 `-12..12`。預設 `0`。小數值將在請求前被截斷。
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
    明確的 OpenAI `instructions` 欄位。設定後，persona 提示欄位將**不會**自動對應。
  </ParamField>
  <ParamField path="extraBody / extra_body" type="Record<string, unknown>">
    在生成的 OpenAI TTS 欄位之後，額外合併到 `/audio/speech` 請求主體中的 JSON 欄位。將此用於 OpenAI 相容的端點（如 Kokoro），這些端點需要供應商特定的金鑰，例如 `lang`；不安全的原型金鑰會被忽略。
  </ParamField>
  <ParamField path="baseUrl" type="string">
    覆寫 OpenAI TTS 端點。解析順序：config → `OPENAI_TTS_BASE_URL` → `https://api.openai.com/v1`。非預設值會被視為 OpenAI 相容的 TTS 端點，因此會接受自訂模型和語音名稱。
  </ParamField>
</Accordion>

<Accordion title="OpenRouter">
  <ParamField path="apiKey" type="string">
    環境變數：`OPENROUTER_API_KEY`。可重複使用 `models.providers.openrouter.apiKey`。
  </ParamField>
  <ParamField path="baseUrl" type="string">
    預設 `https://openrouter.ai/api/v1`。舊版 `https://openrouter.ai/v1` 會進行正規化。
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
    供應商原生的速度覆寫。
  </ParamField>
</Accordion>

<Accordion title="Volcengine (BytePlus Seed Speech)">
  <ParamField path="apiKey" type="string">
    環境變數：`VOLCENGINE_TTS_API_KEY` 或 `BYTEPLUS_SEED_SPEECH_API_KEY`。
  </ParamField>
  <ParamField path="resourceId" type="string">
    預設值 `seed-tts-1.0`。環境變數：`VOLCENGINE_TTS_RESOURCE_ID`。當您的專案擁有 TTS 2.0 權限時使用 `seed-tts-2.0`。
  </ParamField>
  <ParamField path="appKey" type="string">
    App key 標頭。預設值 `aGjiRDfUWi`。環境變數：`VOLCENGINE_TTS_APP_KEY`。
  </ParamField>
  <ParamField path="baseUrl" type="string">
    覆寫 Seed Speech TTS HTTP 端點。環境變數：`VOLCENGINE_TTS_BASE_URL`。
  </ParamField>
  <ParamField path="voice" type="string">
    語音類型。預設值 `en_female_anna_mars_bigtts`。環境變數：`VOLCENGINE_TTS_VOICE`。
  </ParamField>
  <ParamField path="speedRatio" type="number">
    提供者原生的速度比率。
  </ParamField>
  <ParamField path="emotion" type="string">
    提供者原生的情緒標籤。
  </ParamField>
  <ParamField path="appId / token / cluster" type="string" deprecated>
    舊版 Volcengine 語音控制台欄位。環境變數：`VOLCENGINE_TTS_APPID`、`VOLCENGINE_TTS_TOKEN`、`VOLCENGINE_TTS_CLUSTER`（預設值 `volcano_tts`）。
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
    預設值 `eve`。即時語音：`ara`、`eve`、`leo`、`rex`、`sal`、`una`。
  </ParamField>
  <ParamField path="language" type="string">
    BCP-47 語言代碼或 `auto`。預設值 `en`。
  </ParamField>
  <ParamField path="responseFormat" type='"mp3" | "wav" | "pcm" | "mulaw" | "alaw"'>
    預設值 `mp3`。
  </ParamField>
  <ParamField path="speed" type="number">
    供應商原生的速度覆寫。
  </ParamField>
</Accordion>

  <Accordion title="小米 MiMo">
    <ParamField path="apiKey" type="string">環境變數：`XIAOMI_API_KEY`。</ParamField>
    <ParamField path="baseUrl" type="string">預設值 `https://api.xiaomimimo.com/v1`。環境變數：`XIAOMI_BASE_URL`。</ParamField>
    <ParamField path="model" type="string">預設值 `mimo-v2.5-tts`。環境變數：`XIAOMI_TTS_MODEL`。也支援 `mimo-v2-tts`。</ParamField>
    <ParamField path="voice" type="string">預設值 `mimo_default`。環境變數：`XIAOMI_TTS_VOICE`。</ParamField>
    <ParamField path="format" type='"mp3" | "wav"'>預設值 `mp3`。環境變數：`XIAOMI_TTS_FORMAT`。</ParamField>
    <ParamField path="style" type="string">作為使用者訊息傳送的可選自然語言風格指令；不會被朗讀。</ParamField>
  </Accordion>
</AccordionGroup>

## Agent 工具

`tts` 工具將文字轉換為語音並傳回音訊附件以供回覆傳送。在飛書、Matrix、Telegram 和 WhatsApp 上，音訊會以語音訊息而非檔案附件的形式傳送。當 `ffmpeg` 可用時，飛書和 WhatsApp 可以在此路徑上轉碼非 Opus 的 TTS 輸出。

WhatsApp 透過 Baileys 將音訊作為 PTT 語音備忘錄（具有 `ptt: true` 的 `audio`）發送，並**單獨**傳送可見文字，因為客戶端並未一致地在語音備忘錄上呈現標題。

該工具接受可選的 `channel` 和 `timeoutMs` 欄位；`timeoutMs` 是每次呼叫的提供者請求逾時時間（以毫秒為單位）。

## Gateway RPC

| 方法              | 用途                                |
| ----------------- | ----------------------------------- |
| `tts.status`      | 讀取目前的 TTS 狀態和最後一次嘗試。 |
| `tts.enable`      | 將本機自動偏好設定為 `always`。     |
| `tts.disable`     | 將本機自動偏好設定為 `off`。        |
| `tts.convert`     | 一次性文字轉音訊。                  |
| `tts.setProvider` | 設定本機供應商偏好。                |
| `tts.setPersona`  | 設定本機角色偏好。                  |
| `tts.providers`   | 列出已設定的供應商及其狀態。        |

## 服務連結

- [OpenAI 文字轉語音指南](https://platform.openai.com/docs/guides/text-to-speech)
- [OpenAI Audio API 參考資料](https://platform.openai.com/docs/api-reference/audio)
- [Azure Speech REST 文字轉語音](https://learn.microsoft.com/azure/ai-services/speech-service/rest-text-to-speech)
- [Azure Speech 供應商](/zh-Hant/providers/azure-speech)
- [ElevenLabs 文字轉語音](https://elevenlabs.io/docs/api-reference/text-to-speech)
- [ElevenLabs 驗證](https://elevenlabs.io/docs/api-reference/authentication)
- [Gradium](/zh-Hant/providers/gradium)
- [Inworld TTS API](https://docs.inworld.ai/tts/tts)
- [MiniMax T2A v2 API](https://platform.minimaxi.com/document/T2A%20V2)
- [Volcengine TTS HTTP API](/zh-Hant/providers/volcengine#text-to-speech)
- [Xiaomi MiMo 語音合成](/zh-Hant/providers/xiaomi#text-to-speech)
- [node-edge-tts](https://github.com/SchneeHertz/node-edge-tts)
- [Microsoft 語音輸出格式](https://learn.microsoft.com/azure/ai-services/speech-service/rest-text-to-speech#audio-outputs)
- [xAI 文字轉語音](https://docs.x.ai/developers/rest-api-reference/inference/voice#text-to-speech-rest)

## 相關

- [媒體總覽](/zh-Hant/tools/media-overview)
- [音樂生成](/zh-Hant/tools/music-generation)
- [影片生成](/zh-Hant/tools/video-generation)
- [斜線指令](/zh-Hant/tools/slash-commands)
- [語音通話外掛](/zh-Hant/plugins/voice-call)
