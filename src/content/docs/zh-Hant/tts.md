---
summary: "針對外發回覆的文字轉語音 (TTS)"
read_when:
  - Enabling text-to-speech for replies
  - Configuring TTS providers or limits
  - Using /tts commands
title: "文字轉語音（舊版路徑）"
---

# 文字轉語音 (TTS)

OpenClaw 可以使用 ElevenLabs、Microsoft 或 OpenAI 將外發回覆轉換為音訊。
只要 OpenClaw 能發送音訊的地方，它都能運作。

## 支援的服務

- **ElevenLabs**（主要或備用提供商）
- **Microsoft**（主要或備用提供商；目前的內建實作使用 `node-edge-tts`）
- **OpenAI**（主要或備用提供商；亦用於摘要）

### Microsoft 語音說明

內建的 Microsoft 語音提供商目前透過 `node-edge-tts` 函式庫使用 Microsoft Edge 的線上
神經 TTS 服務。這是一個託管服務（非
本機），使用 Microsoft 端點，且不需要 API 金鑰。
`node-edge-tts` 公開了語音配置選項和輸出格式，但
並非所有選項都受到此服務支援。使用 `edge` 的舊版配置和指令輸入
仍然有效，並會正規化為 `microsoft`。

由於此路徑是沒有發布 SLA 或配額的公開網路服務，
請將其視為盡力而為。如果您需要保證的限額和支援，請使用 OpenAI
或 ElevenLabs。

## 選用金鑰

如果您想要使用 OpenAI 或 ElevenLabs：

- `ELEVENLABS_API_KEY` (或 `XI_API_KEY`)
- `OPENAI_API_KEY`

Microsoft 語音**不**需要 API 金鑰。

如果設定了多個提供商，會先使用選取的提供商，其他的則作為備用選項。
自動摘要使用設定的 `summaryModel`（或 `agents.defaults.model.primary`），
因此如果您啟用摘要，該提供商也必須經過驗證。

## 服務連結

- [OpenAI Text-to-Speech 指南](https://platform.openai.com/docs/guides/text-to-speech)
- [OpenAI Audio API 參考資料](https://platform.openai.com/docs/api-reference/audio)
- [ElevenLabs Text to Speech](https://elevenlabs.io/docs/api-reference/text-to-speech)
- [ElevenLabs Authentication](https://elevenlabs.io/docs/api-reference/authentication)
- [node-edge-tts](https://github.com/SchneeHertz/node-edge-tts)
- [Microsoft Speech output formats](https://learn.microsoft.com/azure/ai-services/speech-service/rest-text-to-speech#audio-outputs)

## 預設是否啟用？

否。自動 TTS 預設為**關閉**。請在設定中透過 `messages.tts.auto` 啟用，或針對每個階段使用 `/tts always`（別名：`/tts on`）啟用。

當未設定 `messages.tts.provider` 時，OpenClaw 會依照登錄自動選擇順序，挑選第一個設定的語音提供者。

## 配置

TTS 設定位於 `openclaw.json` 的 `messages.tts` 下。
完整架構請參閱 [Gateway configuration](/en/gateway/configuration)。

### 最小配置（啟用 + 提供者）

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

### OpenAI 優先，ElevenLabs 備援

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

### Microsoft 優先（無 API 金鑰）

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

### 停用 Microsoft 語音

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

### 僅在收到語音訊息後以音頻回覆

```json5
{
  messages: {
    tts: {
      auto: "inbound",
    },
  },
}
```

### 停用長回覆的自動摘要

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

- `auto`：自動 TTS 模式（`off`、`always`、`inbound`、`tagged`）。
  - `inbound` 僅在收到傳入語音訊息後傳送音訊。
  - `tagged` 僅在回覆包含 `[[tts]]` 標籤時傳送音訊。
- `enabled`：舊版切換開關（doctor 會將其遷移至 `auto`）。
- `mode`：`"final"`（預設值）或 `"all"`（包含工具/區塊回覆）。
- `provider`：語音提供者 ID，例如 `"elevenlabs"`、`"microsoft"` 或 `"openai"`（自動回退）。
- 如果未設定 `provider`，OpenClaw 將使用註冊表中自動選擇順序的第一個已配置語音提供者。
- 舊版 `provider: "edge"` 仍然有效，並會正規化為 `microsoft`。
- `summaryModel`：用於自動摘要的可選低成本模型；預設為 `agents.defaults.model.primary`。
  - 接受 `provider/model` 或已配置的模型別名。
- `modelOverrides`：允許模型發出 TTS 指令（預設開啟）。
  - `allowProvider` 預設為 `false`（提供商切換為選用）。
- `providers.<id>`：由語音提供商 ID 鍵入的提供商自有設定。
- `maxTextLength`：TTS 輸入的硬上限（字元）。若超過則 `/tts audio` 失敗。
- `timeoutMs`：請求逾時（毫秒）。
- `prefsPath`：覆寫本機偏好設定 JSON 路徑（provider/limit/summary）。
- `apiKey` 值會回退至環境變數（`ELEVENLABS_API_KEY`/`XI_API_KEY`，`OPENAI_API_KEY`）。
- `providers.elevenlabs.baseUrl`：覆寫 ElevenLabs API 基礎 URL。
- `providers.openai.baseUrl`：覆寫 OpenAI TTS 端點。
  - 解析順序：`messages.tts.providers.openai.baseUrl` -> `OPENAI_TTS_BASE_URL` -> `https://api.openai.com/v1`
  - 非預設值會被視為與 OpenAI 相容的 TTS 端點，因此接受自訂模型和聲音名稱。
- `providers.elevenlabs.voiceSettings`：
  - `stability`、`similarityBoost`、`style`：`0..1`
  - `useSpeakerBoost`：`true|false`
  - `speed`：`0.5..2.0`（1.0 = 一般）
- `providers.elevenlabs.applyTextNormalization`：`auto|on|off`
- `providers.elevenlabs.languageCode`：2 個字母的 ISO 639-1 代碼（例如 `en`、`de`）
- `providers.elevenlabs.seed`：整數 `0..4294967295`（盡力確保確定性）
- `providers.microsoft.enabled`: 允許使用 Microsoft 語音（預設 `true`；無 API 金鑰）。
- `providers.microsoft.voice`: Microsoft 神經語音名稱（例如 `en-US-MichelleNeural`）。
- `providers.microsoft.lang`: 語言代碼（例如 `en-US`）。
- `providers.microsoft.outputFormat`: Microsoft 輸出格式（例如 `audio-24khz-48kbitrate-mono-mp3`）。
  - 請參閱 Microsoft Speech 輸出格式以取得有效值；並非所有格式都受隨附的 Edge 支援傳輸支援。
- `providers.microsoft.rate` / `providers.microsoft.pitch` / `providers.microsoft.volume`: 百分比字串（例如 `+10%`、`-5%`）。
- `providers.microsoft.saveSubtitles`: 在音訊檔案旁寫入 JSON 字幕。
- `providers.microsoft.proxy`: Microsoft 語音請求的 Proxy URL。
- `providers.microsoft.timeoutMs`：請求逾時覆寫（毫秒）。
- `edge.*`：相同 Microsoft 設定的舊版別名。

## 模型驅動的覆寫（預設開啟）

預設情況下，模型**可以**針對單一回覆發出 TTS 指令。
當 `messages.tts.auto` 為 `tagged` 時，這些指令是用於觸發音訊的必要條件。

啟用後，模型可以發出 `[[tts:...]]` 指令來覆寫單一回覆的語音，並可選地包含 `[[tts:text]]...[[/tts:text]]` 區塊，以提供僅應出現在音訊中的表達式標籤（例如笑聲、歌唱提示等）。

除非 `modelOverrides.allowProvider: true`，否則會忽略 `provider=...` 指令。

回覆範例：

```
Here you go.

[[tts:voiceId=pMsXgVXv3BLzUgSXRplE model=eleven_v3 speed=1.1]]
[[tts:text]](laughs) Read the song once more.[[/tts:text]]
```

可用的指令索引鍵（啟用時）：

- `provider`（已註冊的語音提供者 ID，例如 `openai`、`elevenlabs` 或 `microsoft`；需要 `allowProvider: true`）
- `voice`（OpenAI 語音）或 `voiceId`（ElevenLabs）
- `model`（OpenAI TTS 模型或 ElevenLabs 模型 ID）
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

可選允許清單（啟用提供者切換同時保持其他設定可控）：

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

## 每個使用者的偏好設定

斜線指令會將本地覆寫寫入 `prefsPath`（預設值：
`~/.openclaw/settings/tts.json`，可使用 `OPENCLAW_TTS_PREFS` 或
`messages.tts.prefsPath` 覆寫）。

已儲存的欄位：

- `enabled`
- `provider`
- `maxLength`（摘要閾值；預設 1500 個字元）
- `summarize`（預設 `true`）

這些會覆寫該主機的 `messages.tts.*`。

## 輸出格式（固定）

- **Feishu / Matrix / Telegram / WhatsApp**：Opus 語音訊息（來自 ElevenLabs 的 `opus_48000_64`，來自 OpenAI 的 `opus`）。
  - 48kHz / 64kbps 是語音訊息的良好取捨。
- **其他頻道**：MP3（來自 ElevenLabs 的 `mp3_44100_128`，來自 OpenAI 的 `mp3`）。
  - 44.1kHz / 128kbps 是語音清晰度的預設平衡。
- **Microsoft**：使用 `microsoft.outputFormat`（預設為 `audio-24khz-48kbitrate-mono-mp3`）。
  - 內建的傳輸層接受 `outputFormat`，但並非所有格式都可在該服務中取得。
  - 輸出格式值遵循 Microsoft Speech 輸出格式（包括 Ogg/WebM Opus）。
  - Telegram `sendVoice` 接受 OGG/MP3/M4A；如果您需要
    確定的 Opus 語音訊息，請使用 OpenAI/ElevenLabs。
  - 如果設定的 Microsoft 輸出格式失敗，OpenClaw 會以 MP3 重試。

OpenAI/ElevenLabs 的輸出格式是依頻道固定的（見上文）。

## Auto-TTS 行為

啟用後，OpenClaw：

- 如果回覆已包含媒體或 `MEDIA:` 指令，則跳過 TTS。
- 跳過非常短的回覆（< 10 個字元）。
- 當使用 `agents.defaults.model.primary`（或 `summaryModel`）啟用時，會總結長篇回覆。
- 將產生的音訊附加到回覆中。

如果回覆超過 `maxLength` 且總結功能關閉（或摘要模型沒有 API 金鑰），將跳過音訊並發送正常的文字回覆。

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
有關啟用的詳細資訊，請參閱 [斜線指令](/en/tools/slash-commands)。

Discord 注意事項：`/tts` 是 Discord 的內建指令，因此 OpenClaw 在此將 `/voice` 註冊為原生指令。文字 `/tts ...` 仍然有效。

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

備註：

- 指令需要經過授權的發送者（允許清單/所有者規則仍然適用）。
- 必須啟用 `commands.text` 或原生指令註冊。
- `off|always|inbound|tagged` 是每個會話的切換開關（`/tts on` 是 `/tts always` 的別名）。
- `limit` 和 `summary` 儲存在本地偏好設定中，而不是主要配置中。
- `/tts audio` 會產生一次性音訊回覆（不會開啟 TTS）。

## Agent 工具

`tts` 工具將文字轉換為語音並返回音訊附件以供回覆傳送。當頻道是飛書、Matrix、Telegram 或 WhatsApp 時，音訊會作為語音訊息而非檔案附件傳送。

## Gateway RPC

Gateway 方法：

- `tts.status`
- `tts.enable`
- `tts.disable`
- `tts.convert`
- `tts.setProvider`
- `tts.providers`
