---
summary: "用於外發回覆的文字轉語音 (TTS)"
read_when:
  - 啟用回覆的文字轉語音
  - 設定 TTS 提供者或限制
  - 使用 /tts 指令
title: "文字轉語音"
---

# 文字轉語音 (TTS)

OpenClaw 可以使用 ElevenLabs、Microsoft 或 OpenAI 將外發回覆轉換為音訊。
它適用於 OpenClaw 可以發送音訊的任何地方；Telegram 會收到一個圓形的語音訊息氣泡。

## 支援的服務

- **ElevenLabs**（主要或備援提供者）
- **Microsoft**（主要或備援提供者；目前的內建實作使用 `node-edge-tts`，當沒有 API 金鑰時為預設值）
- **OpenAI**（主要或備援提供者；也用於摘要）

### Microsoft 語音說明

內建的 Microsoft 語音提供者目前透過 `node-edge-tts` 函式庫使用 Microsoft Edge 的線上神經 TTS 服務。這是一個託管服務（非本機），使用 Microsoft 端點，並且不需要 API 金鑰。
`node-edge-tts` 公開了語音設定選項和輸出格式，但並非所有選項都受到服務支援。使用 `edge` 的舊版設定和指令輸入仍然有效，並且會被正規化為 `microsoft`。

由於此路徑是沒有公開 SLA 或配額的公開網路服務，請將其視為盡力而為的服務。如果您需要保證的限制和支援，請使用 OpenAI 或 ElevenLabs。

## 可選金鑰

如果您想要使用 OpenAI 或 ElevenLabs：

- `ELEVENLABS_API_KEY` (或 `XI_API_KEY`)
- `OPENAI_API_KEY`

Microsoft 語音**不需要** API 金鑰。如果找不到 API 金鑰，
OpenClaw 預設使用 Microsoft（除非透過
`messages.tts.microsoft.enabled=false` 或 `messages.tts.edge.enabled=false` 停用）。

如果設定了多個提供者，優先使用選定的提供者，其他則作為備援選項。
自動摘要使用設定的 `summaryModel` (或 `agents.defaults.model.primary`)，
因此如果您啟用摘要，該提供者也必須經過驗證。

## 服務連結

- [OpenAI 文字轉語音指南](https://platform.openai.com/docs/guides/text-to-speech)
- [OpenAI 音訊 API 參考](https://platform.openai.com/docs/api-reference/audio)
- [ElevenLabs 文字轉語音](https://elevenlabs.io/docs/api-reference/text-to-speech)
- [ElevenLabs 驗證](https://elevenlabs.io/docs/api-reference/authentication)
- [node-edge-tts](https://github.com/SchneeHertz/node-edge-tts)
- [Microsoft Speech output formats](https://learn.microsoft.com/azure/ai-services/speech-service/rest-text-to-speech#audio-outputs)

## 是否預設啟用？

否。Auto‑TTS 預設為**關閉**。可在設定中透過 `messages.tts.auto` 啟用，或針對每個階段使用 `/tts always` (別名：`/tts on`) 啟用。

一旦 TTS 啟用，Microsoft 語音**預設**即會啟用，並且當沒有可用的 OpenAI 或 ElevenLabs API 金鑰時會自動使用。

## 設定

TTS 設定位於 `openclaw.json` 中的 `messages.tts` 之下。
完整架構請參閱 [Gateway configuration](/zh-Hant/gateway/configuration)。

### 最小設定 (啟用 + 提供者)

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

### 以 OpenAI 為主，ElevenLabs 為備援

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

### 以 Microsoft 為主 (無 API 金鑰)

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

### 停用 Microsoft 語音

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

### 僅在收到傳入語音訊息後以音訊回覆

```json5
{
  messages: {
    tts: {
      auto: "inbound",
    },
  },
}
```

### 針對長回覆停用自動摘要

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

### 欄位備註

- `auto`：auto‑TTS 模式 (`off`、`always`、`inbound`、`tagged`)。
  - `inbound` 僅在收到傳入語音訊息後傳送音訊。
  - `tagged` 僅在回覆包含 `[[tts]]` 標籤時傳送音訊。
- `enabled`：舊版切換開關 (doctor 會將此遷移至 `auto`)。
- `mode`：`"final"` (預設) 或 `"all"` (包含工具/區塊回覆)。
- `provider`：語音提供者 ID，例如 `"elevenlabs"`、`"microsoft"` 或 `"openai"` (會自動備援)。
- 如果未設定 `provider`，OpenClaw 會偏好 `openai` (如果有金鑰)，然後是 `elevenlabs` (如果有金鑰)，
  否則為 `microsoft`。
- 舊版的 `provider: "edge"` 仍然有效，並會正規化為 `microsoft`。
- `summaryModel`：用於自動摘要的可選低成本模型；預設為 `agents.defaults.model.primary`。
  - 接受 `provider/model` 或已配置的模型別名。
- `modelOverrides`：允許模型發出 TTS 指令（預設開啟）。
  - `allowProvider` 預設為 `false`（提供者切換為選擇加入）。
- `maxTextLength`：TTS 輸入的硬上限（字元數）。若超出則 `/tts audio` 失敗。
- `timeoutMs`：請求逾時（毫秒）。
- `prefsPath`：覆蓋本地設定 JSON 路徑（provider/limit/summary）。
- `apiKey` 值會回退到環境變數（`ELEVENLABS_API_KEY`/`XI_API_KEY`、`OPENAI_API_KEY`）。
- `elevenlabs.baseUrl`：覆蓋 ElevenLabs API 基礎 URL。
- `openai.baseUrl`：覆蓋 OpenAI TTS 端點。
  - 解析順序：`messages.tts.openai.baseUrl` -> `OPENAI_TTS_BASE_URL` -> `https://api.openai.com/v1`
  - 非預設值會被視為相容 OpenAI 的 TTS 端點，因此接受自訂模型與語音名稱。
- `elevenlabs.voiceSettings`：
  - `stability`、`similarityBoost`、`style`：`0..1`
  - `useSpeakerBoost`：`true|false`
  - `speed`：`0.5..2.0`（1.0 = 正常）
- `elevenlabs.applyTextNormalization`：`auto|on|off`
- `elevenlabs.languageCode`：2 字母 ISO 639-1（例如 `en`、`de`）
- `elevenlabs.seed`：整數 `0..4294967295`（盡力確定性）
- `microsoft.enabled`：允許使用 Microsoft 語音（預設 `true`；無 API 金鑰）。
- `microsoft.voice`：Microsoft 神經語音名稱（例如 `en-US-MichelleNeural`）。
- `microsoft.lang`：語言代碼（例如 `en-US`）。
- `microsoft.outputFormat`：Microsoft 輸出格式（例如 `audio-24khz-48kbitrate-mono-mp3`）。
  - 請參閱 Microsoft 語音輸出格式以了解有效值；並非所有格式都受內建的 Edge 傳輸支援。
- `microsoft.rate` / `microsoft.pitch` / `microsoft.volume`：百分比字串（例如 `+10%`、`-5%`）。
- `microsoft.saveSubtitles`：在音訊檔案旁寫入 JSON 字幕。
- `microsoft.proxy`：Microsoft 語音請求的 Proxy URL。
- `microsoft.timeoutMs`：請求逾時覆寫 (毫秒)。
- `edge.*`：相同 Microsoft 設定的舊版別名。

## 模型驅動的覆寫（預設開啟）

根據預設，模型**可以**針對單一回覆發出 TTS 指令。
當 `messages.tts.auto` 為 `tagged` 時，必須要有這些指令才能觸發音訊。

啟用後，模型可以發出 `[[tts:...]]` 指令來覆寫單一回覆的語音，以及一個選用的 `[[tts:text]]...[[/tts:text]]` 區塊，用來提供僅應出現在音訊中的表情標籤（笑聲、歌唱提示等）。

除非 `modelOverrides.allowProvider: true`，否則將忽略 `provider=...` 指令。

範例回覆內容：

```
Here you go.

[[tts:voiceId=pMsXgVXv3BLzUgSXRplE model=eleven_v3 speed=1.1]]
[[tts:text]](laughs) Read the song once more.[[/tts:text]]
```

可用的指令金鑰（啟用時）：

- `provider`（已註冊的語音提供者 ID，例如 `openai`、`elevenlabs` 或 `microsoft`；需要 `allowProvider: true`）
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

選用允許清單（啟用提供者切換，同時讓其他設定保持可設定狀態）：

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

斜線指令會將本機覆寫寫入 `prefsPath` (預設值：
`~/.openclaw/settings/tts.json`，使用 `OPENCLAW_TTS_PREFS` 或
`messages.tts.prefsPath` 覆寫)。

已儲存欄位：

- `enabled`
- `provider`
- `maxLength` (摘要閾值；預設為 1500 個字元)
- `summarize` (預設 `true`)

這些會覆寫該主機的 `messages.tts.*`。

## 輸出格式 (固定)

- **Telegram**: Opus 語音訊息 (來自 ElevenLabs 的 `opus_48000_64`，來自 OpenAI 的 `opus`)。
  - 48kHz / 64kbps 是一個不錯的語音訊息取捨，也是圓形氣泡所需的設定。
- **其他頻道**: MP3 (來自 ElevenLabs 的 `mp3_44100_128`，來自 OpenAI 的 `mp3`)。
  - 44.1kHz / 128kbps 是語音清晰度的預設平衡值。
- **Microsoft**: 使用 `microsoft.outputFormat` (預設 `audio-24khz-48kbitrate-mono-mp3`)。
  - 內建的傳輸接受 `outputFormat`，但並非所有格式都可從服務取得。
  - 輸出格式數值遵循 Microsoft Speech 的輸出格式 (包括 Ogg/WebM Opus)。
  - Telegram `sendVoice` 接受 OGG/MP3/M4A；如果您需要保證的 Opus 語音訊息，請使用 OpenAI/ElevenLabs。
  - 如果設定的 Microsoft 輸出格式失敗，OpenClaw 會以 MP3 重試。

OpenAI/ElevenLabs 的格式是固定的；Telegram 預期語音訊息使用 Opus。

## 自動 TTS 行為

啟用後，OpenClaw 會：

- 如果回覆已包含媒體或 `MEDIA:` 指令，則跳過 TTS。
- 跳過非常短的回覆 (< 10 個字元)。
- 當使用 `agents.defaults.model.primary` (或 `summaryModel`) 啟用時，會將長回覆進行摘要。
- 將產生的音訊附加至回覆。

如果回覆超過 `maxLength` 且摘要功能關閉 (或沒有摘要模型的 API 金鑰)，將會
跳過音訊並發送一般文字回覆。

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
請參閱 [斜線指令](/zh-Hant/tools/slash-commands) 以了解啟用詳細資訊。

Discord 註記：`/tts` 是 Discord 內建的指令，因此 OpenClaw 在該處將 `/voice` 註冊為原生指令。文字 `/tts ...` 仍然有效。

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

- 指令需要經過授權的發送者（允許清單/擁有者規則仍然適用）。
- 必須啟用 `commands.text` 或原生指令註冊。
- `off|always|inbound|tagged` 是每次會話的切換開關（`/tts on` 是 `/tts always` 的別名）。
- `limit` 和 `summary` 儲存在本機偏好設定中，而非主要設定檔。
- `/tts audio` 會產生一次性的音訊回覆（不會開啟 TTS）。

## Agent 工具

`tts` 工具會將文字轉換為語音並傳回 `MEDIA:` 路徑。當結果與 Telegram 相容時，該工具會包含 `[[audio_as_voice]]`，以便 Telegram 傳送語音訊息氣泡。

## Gateway RPC

Gateway 方法：

- `tts.status`
- `tts.enable`
- `tts.disable`
- `tts.convert`
- `tts.setProvider`
- `tts.providers`

import en from "/components/footer/en.mdx";

<en />
