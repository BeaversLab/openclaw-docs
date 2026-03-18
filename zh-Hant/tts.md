---
summary: "針對外傳回覆的文字轉語音 (TTS)"
read_when:
  - Enabling text-to-speech for replies
  - Configuring TTS providers or limits
  - Using /tts commands
title: "文字轉語音"
---

# 文字轉語音 (TTS)

OpenClaw 可以使用 ElevenLabs、OpenAI 或 Edge TTS 將外傳回覆轉換為音訊。
只要 OpenClaw 可以發送音訊的地方就能運作；Telegram 會收到一個圓形的語音訊息氣泡。

## 支援的服務

- **ElevenLabs**（主要或備用提供商）
- **OpenAI**（主要或備用提供商；亦用於摘要）
- **Edge TTS**（主要或備用提供商；使用 `node-edge-tts`，當沒有 API 金鑰時為預設值）

### Edge TTS 注意事項

Edge TTS 透過 `node-edge-tts` 函式庫使用 Microsoft Edge 的線上神經 TTS 服務。這是一個託管服務（非本地），使用 Microsoft 的端點，並且不需要 API 金鑰。`node-edge-tts` 公開了語音組態選項和輸出格式，但並非所有選項都受到 Edge 服務支援。citeturn2search0

由於 Edge TTS 是沒有公開 SLA 或配額的公開網路服務，請將其視為盡力而為的服務。如果您需要保證的限制和支援，請使用 OpenAI 或 ElevenLabs。
Microsoft 的 Speech REST API 記載了每次請求 10 分鐘的音訊限制；Edge TTS 並未公開限制，因此假設有類似或更低的限制。citeturn0search3

## 可選金鑰

如果您想要使用 OpenAI 或 ElevenLabs：

- `ELEVENLABS_API_KEY`（或 `XI_API_KEY`）
- `OPENAI_API_KEY`

Edge TTS **不**需要 API 金鑰。如果找不到 API 金鑰，OpenClaw 預設會使用 Edge TTS（除非透過 `messages.tts.edge.enabled=false` 停用）。

如果設定了多個提供商，會優先使用選定的提供商，其他的則作為備用選項。
自動摘要使用設定的 `summaryModel`（或 `agents.defaults.model.primary`），因此如果您啟用摘要，該提供商也必須經過驗證。

## 服務連結

- [OpenAI 文字轉語音指南](https://platform.openai.com/docs/guides/text-to-speech)
- [OpenAI 音訊 API 參考資料](https://platform.openai.com/docs/api-reference/audio)
- [ElevenLabs 文字轉語音](https://elevenlabs.io/docs/api-reference/text-to-speech)
- [ElevenLabs 驗證](https://elevenlabs.io/docs/api-reference/authentication)
- [node-edge-tts](https://github.com/SchneeHertz/node-edge-tts)
- [Microsoft Speech 輸出格式](https://learn.microsoft.com/azure/ai-services/speech-service/rest-text-to-speech#audio-outputs)

## 預設是否啟用？

否。Auto‑TTS 預設為 **關閉**。可以在設定中透過
`messages.tts.auto` 啟用，或每個工作階段使用 `/tts always` (別名：`/tts on`) 啟用。

一旦 TTS 開啟，Edge TTS **會**預設啟用，並在沒有可用的 OpenAI 或 ElevenLabs API 金鑰時自動使用。

## 設定

TTS 設定位於 `openclaw.json` 中的 `messages.tts` 下。
完整架構請參閱 [Gateway configuration](/zh-Hant/gateway/configuration)。

### 最精簡設定 (啟用 + 提供者)

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

### OpenAI 優先搭配 ElevenLabs 備援

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

### Edge TTS 優先 (無 API 金鑰)

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

### 停用 Edge TTS

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

### 自訂限制 + 偏好路徑

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

### 僅在收到內送語音訊息後以音訊回覆

```json5
{
  messages: {
    tts: {
      auto: "inbound",
    },
  },
}
```

### 對長回覆停用自動摘要

```json5
{
  messages: {
    tts: {
      auto: "always",
    },
  },
}
```

然後執行：

```
/tts summary off
```

### 欄位說明

- `auto`：自動 TTS 模式 (`off`、`always`、`inbound`、`tagged`)。
  - `inbound` 僅在收到內送語音訊息後發送音訊。
  - `tagged` 僅在回覆包含 `[[tts]]` 標籤時發送音訊。
- `enabled`：舊版切換開關 (doctor 會將此遷移至 `auto`)。
- `mode`：`"final"` (預設) 或 `"all"` (包含工具/區塊回覆)。
- `provider`：`"elevenlabs"`、`"openai"` 或 `"edge"` (備援為自動)。
- 如果 `provider` **未設定**，OpenClaw 優先使用 `openai` (若有金鑰)，然後是 `elevenlabs` (若有金鑰)，
  否則使用 `edge`。
- `summaryModel`：用於自動摘要的選用低成本模型；預設為 `agents.defaults.model.primary`。
  - 接受 `provider/model` 或已設定的模型別名。
- `modelOverrides`：允許模型發出 TTS 指令 (預設為開啟)。
  - `allowProvider` 預設為 `false`（供應商切換為選用）。
- `maxTextLength`：TTS 輸入的硬性上限（字元數）。如果超過，`/tts audio` 將會失敗。
- `timeoutMs`：請求逾時（毫秒）。
- `prefsPath`：覆寫本地設定 JSON 路徑（provider/limit/summary）。
- `apiKey` 的值會回退至環境變數（`ELEVENLABS_API_KEY`/`XI_API_KEY`、`OPENAI_API_KEY`）。
- `elevenlabs.baseUrl`：覆寫 ElevenLabs API 基礎 URL。
- `openai.baseUrl`：覆寫 OpenAI TTS 端點。
  - 解析順序：`messages.tts.openai.baseUrl` -> `OPENAI_TTS_BASE_URL` -> `https://api.openai.com/v1`
  - 非預設值會被視為 OpenAI 相容的 TTS 端點，因此接受自訂的模型和語音名稱。
- `elevenlabs.voiceSettings`：
  - `stability`、`similarityBoost`、`style`：`0..1`
  - `useSpeakerBoost`：`true|false`
  - `speed`：`0.5..2.0`（1.0 = 正常）
- `elevenlabs.applyTextNormalization`：`auto|on|off`
- `elevenlabs.languageCode`：兩字母 ISO 639-1 代碼（例如 `en`、`de`）
- `elevenlabs.seed`：整數 `0..4294967295`（盡力確保確定性）
- `edge.enabled`：允許使用 Edge TTS（預設 `true`；無需 API 金鑰）。
- `edge.voice`：Edge 神經語音名稱（例如 `en-US-MichelleNeural`）。
- `edge.lang`：語言代碼（例如 `en-US`）。
- `edge.outputFormat`：Edge 輸出格式（例如 `audio-24khz-48kbitrate-mono-mp3`）。
  - 請參閱 Microsoft Speech 輸出格式以取得有效值；Edge 並不支援所有格式。
- `edge.rate` / `edge.pitch` / `edge.volume`：百分比字串（例如 `+10%`、`-5%`）。
- `edge.saveSubtitles`：在音訊檔案旁寫入 JSON 字幕。
- `edge.proxy`：Edge TTS 請求的代理 URL。
- `edge.timeoutMs`：請求逾時覆寫 (毫秒)。

## 模型驅動的覆寫（預設開啟）

預設情況下，模型**可以**針對單一回覆發出 TTS 指令。
當 `messages.tts.auto` 為 `tagged` 時，必須使用這些指令才能觸發音訊。

啟用後，模型可以發出 `[[tts:...]]` 指令來覆寫單一回覆的語音，以及選用的 `[[tts:text]]...[[/tts:text]]` 區塊，以提供僅應出現在音訊中的表現力標籤（笑聲、歌唱提示等）。

除非 `modelOverrides.allowProvider: true`，否則會忽略 `provider=...` 指令。

回覆範例：

```
Here you go.

[[tts:voiceId=pMsXgVXv3BLzUgSXRplE model=eleven_v3 speed=1.1]]
[[tts:text]](laughs) Read the song once more.[[/tts:text]]
```

可用的指令金鑰（啟用時）：

- `provider` (`openai` | `elevenlabs` | `edge`，需要 `allowProvider: true`)
- `voice` (OpenAI 語音) 或 `voiceId` (ElevenLabs)
- `model` (OpenAI TTS 模型或 ElevenLabs 模型 ID)
- `stability`、`similarityBoost`、`style`、`speed`、`useSpeakerBoost`
- `applyTextNormalization` (`auto|on|off`)
- `languageCode` (ISO 639-1)
- `seed`

停用所有模型覆寫：

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

選用允許清單（啟用提供者切換，同時保持其他設定可配置）：

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

## 個別使用者偏好設定

斜線指令會將本地覆寫寫入 `prefsPath` (預設為：
`~/.openclaw/settings/tts.json`，可透過 `OPENCLAW_TTS_PREFS` 或
`messages.tts.prefsPath` 覆寫)。

儲存的欄位：

- `enabled`
- `provider`
- `maxLength` (摘要閾值；預設 1500 個字元)
- `summarize` (預設 `true`)

這些會覆寫該主機的 `messages.tts.*`。

## 輸出格式（固定）

- **Telegram**：Opus 語音訊息（來自 ElevenLabs 的 `opus_48000_64`，來自 OpenAI 的 `opus`）。
  - 48kHz / 64kbps 是語音訊息的良好取捨，也是圓形氣泡所需的格式。
- **其他頻道**：MP3（來自 ElevenLabs 的 `mp3_44100_128`，來自 OpenAI 的 `mp3`）。
  - 44.1kHz / 128kbps 是語音清晰度的預設平衡設定。
- **Edge TTS**：使用 `edge.outputFormat`（預設為 `audio-24khz-48kbitrate-mono-mp3`）。
  - `node-edge-tts` 接受 `outputFormat`，但並非所有格式都
    可從 Edge 服務取得。
  - 輸出格式值遵循 Microsoft Speech 輸出格式（包括 Ogg/WebM Opus）。
  - Telegram `sendVoice` 接受 OGG/MP3/M4A；如果您需要
    有保證的 Opus 語音訊息，請使用 OpenAI/ElevenLabs。
  - 如果設定的 Edge 輸出格式失敗，OpenClaw 會以 MP3 重試。

OpenAI/ElevenLabs 的格式是固定的；Telegram 期望建議使用 Opus 格式以獲得語音訊息體驗。

## 自動 TTS 行為

啟用後，OpenClaw 會：

- 如果回覆已包含媒體或 `MEDIA:` 指令，則跳過 TTS。
- 跳過非常短的回應（< 10 個字元）。
- 如果啟用 `agents.defaults.model.primary`（或 `summaryModel`），則會總結長回應。
- 將產生的音訊附加至回覆中。

如果回覆超過 `maxLength` 且關閉了總結功能（或沒有
總結模型的 API 金鑰），將
跳過音訊並發送正常的文字回覆。

## 流程圖

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

## 斜線指令用法

只有一個指令：`/tts`。
有關啟用詳情，請參閱[斜線指令](/zh-Hant/tools/slash-commands)。

Discord 註記：`/tts` 是 Discord 的內建指令，因此 OpenClaw 在
該處註冊 `/voice` 為原生指令。文字 `/tts ...` 仍然有效。

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

註記：

- 指令需要經過授權的發送者（允許清單/所有者規則仍然適用）。
- 必須啟用 `commands.text` 或原生指令註冊。
- `off|always|inbound|tagged` 是每次連線的切換開關（`/tts on` 是 `/tts always` 的別名）。
- `limit` 和 `summary` 儲存在本地設定中，而非主設定檔。
- `/tts audio` 會產生一次性的音訊回覆（不會開啟 TTS）。

## Agent 工具

`tts` 工具會將文字轉換為語音並傳回 `MEDIA:` 路徑。當結果與 Telegram 相容時，該工具會包含 `[[audio_as_voice]]`，以便 Telegram 發送語音訊息。

## Gateway RPC

Gateway 方法：

- `tts.status`
- `tts.enable`
- `tts.disable`
- `tts.convert`
- `tts.setProvider`
- `tts.providers`

import footerZhHant from "/components/footer/zh-Hant.mdx";

<footerZhHant />
