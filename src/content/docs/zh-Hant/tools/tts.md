---
summary: "針對外發回覆的文字轉語音 (TTS)"
read_when:
  - Enabling text-to-speech for replies
  - Configuring TTS providers or limits
  - Using /tts commands
title: "文字轉語音"
---

# 文字轉語音 (TTS)

OpenClaw 可以使用 ElevenLabs、Microsoft、MiniMax 或 OpenAI 將外發回覆轉換為音訊。
只要 OpenClaw 能發送音訊的地方，它都能運作。

## 支援的服務

- **ElevenLabs** (主要或備用供應商)
- **Microsoft**（主要或備用提供商；目前內建的實作使用 `node-edge-tts`）
- **MiniMax**（主要或備用提供商；使用 T2A v2 API）
- **OpenAI**（主要或備用提供商；也用於產生摘要）

### Microsoft 語音備註

內建的 Microsoft 語音提供商目前透過 `node-edge-tts` 函式庫使用 Microsoft Edge 的線上
神經 TTS 服務。這是一個託管服務（非本機），
使用 Microsoft 端點，且不需要 API 金鑰。
`node-edge-tts` 公開了語音設定選項和輸出格式，但
該服務並不支援所有選項。使用 `edge` 的舊版設定和指令輸入
仍然有效，並會正規化為 `microsoft`。

由於此途徑是一個沒有公布 SLA 或配額的公開網路服務，
請將其視為盡力而為。如果您需要保證的限額和支援，請使用 OpenAI
或 ElevenLabs。

## 選用金鑰

如果您想要使用 OpenAI、ElevenLabs 或 MiniMax：

- `ELEVENLABS_API_KEY` (或 `XI_API_KEY`)
- `MINIMAX_API_KEY`
- `OPENAI_API_KEY`

Microsoft 語音**不**需要 API 金鑰。

如果設定了多個提供商，會先使用選取的提供商，其他的則作為備用選項。
自動摘要使用設定的 `summaryModel` (或 `agents.defaults.model.primary`)，
因此如果您啟用摘要，該提供商也必須經過驗證。

## 服務連結

- [OpenAI 文字轉語音指南](https://platform.openai.com/docs/guides/text-to-speech)
- [OpenAI 音訊 API 參考](https://platform.openai.com/docs/api-reference/audio)
- [ElevenLabs 文字轉語音](https://elevenlabs.io/docs/api-reference/text-to-speech)
- [ElevenLabs 驗證](https://elevenlabs.io/docs/api-reference/authentication)
- [MiniMax T2A v2 API](https://platform.minimaxi.com/document/T2A%20V2)
- [node-edge-tts](https://github.com/SchneeHertz/node-edge-tts)
- [Microsoft 語音輸出格式](https://learn.microsoft.com/azure/ai-services/speech-service/rest-text-to-speech#audio-outputs)

## 預設是否啟用？

否。自動 TTS 預設為**關閉**。在設定中
啟用 `messages.tts.auto` 或在本地使用 `/tts on`。

當未設定 `messages.tts.provider` 時，OpenClaw 會依照註冊表自動選擇順序
選擇第一個已設定的語音提供商。

## 設定

TTS 設定位於 `openclaw.json` 中的 `messages.tts` 下。
完整架構請參閱 [Gateway configuration](/en/gateway/configuration)。

### 最小設定（啟用 + 提供商）

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

### 以 OpenAI 為主要並以 ElevenLabs 為備援

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

### 以 Microsoft 為主要（無 API 金鑰）

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

### 以 MiniMax 為主要

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

### 僅在收到傳入語音訊息後以音頻回覆

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
  - `inbound` 僅在收到傳入的語音訊息後發送音訊。
  - `tagged` 僅在回覆包含 `[[tts:key=value]]` 指令或 `[[tts:text]]...[[/tts:text]]` 區塊時才傳送音訊。
- `enabled`：舊版切換開關（doctor 會將其遷移至 `auto`）。
- `mode`：`"final"`（預設）或 `"all"`（包含工具/區塊回覆）。
- `provider`：語音提供商 ID，例如 `"elevenlabs"`、`"microsoft"`、`"minimax"` 或 `"openai"`（備援為自動）。
- 如果**未設定** `provider`，OpenClaw 會使用註冊表自動選擇順序中的第一個已設定語音提供商。
- 舊版 `provider: "edge"` 仍然有效，並會正規化為 `microsoft`。
- `summaryModel`：用於自動摘要的選用低成本模型；預設為 `agents.defaults.model.primary`。
  - 接受 `provider/model` 或已設定的模型別名。
- `modelOverrides`：允許模型發出 TTS 指令（預設為開啟）。
  - `allowProvider` 預設為 `false`（提供者切換為選用）。
- `providers.<id>`：由語音提供者 ID 鍵結的提供者自有設定。
- 舊版直接提供者區塊（`messages.tts.openai`、`messages.tts.elevenlabs`、`messages.tts.microsoft`、`messages.tts.edge`）會在載入時自動遷移至 `messages.tts.providers.<id>`。
- `maxTextLength`：TTS 輸入的硬性上限（字元數）。若超過上限，`/tts audio` 將會失敗。
- `timeoutMs`：請求逾時（毫秒）。
- `prefsPath`：覆寫本機偏好設定 JSON 路徑（provider/limit/summary）。
- `apiKey` 數值會回退至環境變數（`ELEVENLABS_API_KEY`/`XI_API_KEY`、`MINIMAX_API_KEY`、`OPENAI_API_KEY`）。
- `providers.elevenlabs.baseUrl`：覆寫 ElevenLabs API 基礎 URL。
- `providers.openai.baseUrl`：覆寫 OpenAI TTS 端點。
  - 解析順序：`messages.tts.providers.openai.baseUrl` -> `OPENAI_TTS_BASE_URL` -> `https://api.openai.com/v1`
  - 非預設值將被視為相容 OpenAI 的 TTS 端點，因此會接受自訂模型與語音名稱。
- `providers.elevenlabs.voiceSettings`：
  - `stability`、`similarityBoost`、`style`：`0..1`
  - `useSpeakerBoost`：`true|false`
  - `speed`：`0.5..2.0`（1.0 = 正常）
- `providers.elevenlabs.applyTextNormalization`：`auto|on|off`
- `providers.elevenlabs.languageCode`：兩字母 ISO 639-1 代碼（例如 `en`、`de`）
- `providers.elevenlabs.seed`：整數 `0..4294967295`（盡力確保確定性）
- `providers.minimax.baseUrl`：覆寫 MiniMax API 基礎 URL（預設為 `https://api.minimax.io`，環境變數：`MINIMAX_API_HOST`）。
- `providers.minimax.model`：TTS 模型（預設為 `speech-2.8-hd`，環境變數：`MINIMAX_TTS_MODEL`）。
- `providers.minimax.voiceId`：語音識別碼（預設 `English_expressive_narrator`，環境變數：`MINIMAX_TTS_VOICE_ID`）。
- `providers.minimax.speed`：播放速度 `0.5..2.0`（預設 1.0）。
- `providers.minimax.vol`：音量 `(0, 10]`（預設 1.0；必須大於 0）。
- `providers.minimax.pitch`：音調偏移 `-12..12`（預設 0）。
- `providers.microsoft.enabled`：允許使用 Microsoft 語音（預設 `true`；不需要 API 金鑰）。
- `providers.microsoft.voice`：Microsoft 神經語音名稱（例如 `en-US-MichelleNeural`）。
- `providers.microsoft.lang`：語言代碼（例如 `en-US`）。
- `providers.microsoft.outputFormat`：Microsoft 輸出格式（例如 `audio-24khz-48kbitrate-mono-mp3`）。
  - 請參閱 Microsoft 語音輸出格式以取得有效值；並非所有格式都受內建的 Edge 傳輸支援。
- `providers.microsoft.rate` / `providers.microsoft.pitch` / `providers.microsoft.volume`：百分比字串（例如 `+10%`、`-5%`）。
- `providers.microsoft.saveSubtitles`：在音訊檔案旁寫入 JSON 字幕。
- `providers.microsoft.proxy`：Microsoft 語音請求的代理 URL。
- `providers.microsoft.timeoutMs`：請求逾時覆寫（毫秒）。
- `edge.*`：相同 Microsoft 設定的舊版別名。

## 模型驅動的覆寫（預設開啟）

預設情況下，模型**可以**針對單一回覆發出 TTS 指令。
當 `messages.tts.auto` 為 `tagged` 時，這些指令是觸發音訊的必要條件。

啟用時，模型可以發出 `[[tts:...]]` 指令以覆寫單一回傳的語音，
以及選用的 `[[tts:text]]...[[/tts:text]]` 區塊，
用來提供僅應出現在音訊中的表達標籤（笑聲、歌唱提示等）。

除非 `modelOverrides.allowProvider: true`，否則將忽略 `provider=...` 指令。

範例回傳負載：

```
Here you go.

[[tts:voiceId=pMsXgVXv3BLzUgSXRplE model=eleven_v3 speed=1.1]]
[[tts:text]](laughs) Read the song once more.[[/tts:text]]
```

可用的指令金鑰（啟用時）：

- `provider`（已註冊的語音提供商 ID，例如 `openai`、`elevenlabs`、`minimax` 或 `microsoft`；需要 `allowProvider: true`）
- `voice`（OpenAI 語音）或 `voiceId`（ElevenLabs / MiniMax）
- `model`（OpenAI TTS 模型、ElevenLabs 模型 ID 或 MiniMax 模型）
- `stability`、`similarityBoost`、`style`、`speed`、`useSpeakerBoost`
- `vol` / `volume`（MiniMax 音量，0-10）
- `pitch`（MiniMax 音調，-12 到 12）
- `applyTextNormalization`（`auto|on|off`）
- `languageCode`（ISO 639-1）
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

選用性允許清單（啟用提供商切換，同時保持其他設定可配置）：

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

斜線指令會將本機覆寫寫入 `prefsPath`（預設值：
`~/.openclaw/settings/tts.json`，使用 `OPENCLAW_TTS_PREFS` 或
`messages.tts.prefsPath` 覆寫）。

已儲存欄位：

- `enabled`
- `provider`
- `maxLength`（摘要門檻；預設 1500 個字元）
- `summarize`（預設 `true`）

這些會覆寫該主機的 `messages.tts.*`。

## 輸出格式（固定）

- **Feishu / Matrix / Telegram / WhatsApp**：Opus 語音訊息（來自 ElevenLabs 的 `opus_48000_64`，來自 OpenAI 的 `opus`）。
  - 48kHz / 64kbps 是一個不錯的語音訊息取捨。
- **其他頻道**：MP3（來自 ElevenLabs 的 `mp3_44100_128`，來自 OpenAI 的 `mp3`）。
  - 44.1kHz / 128kbps 是語音清晰度的預設平衡值。
- **MiniMax**：MP3（`speech-2.8-hd` 模型，32kHz 採樣率）。語音備忘錄格式不支援原生；使用 OpenAI 或 ElevenLabs 以保證 Opus 語音訊息。
- **Microsoft**：使用 `microsoft.outputFormat`（預設 `audio-24khz-48kbitrate-mono-mp3`）。
  - 隨附的傳輸接受 `outputFormat`，但並非所有格式都可從該服務取得。
  - 輸出格式值遵循 Microsoft Speech 輸出格式（包括 Ogg/WebM Opus）。
  - Telegram `sendVoice` 接受 OGG/MP3/M4A；如果您需要保證的 Opus 語音訊息，請使用 OpenAI/ElevenLabs。
  - 如果設定的 Microsoft 輸出格式失敗，OpenClaw 會使用 MP3 重試。

OpenAI/ElevenLabs 輸出格式是依頻道固定的（見上文）。

## Auto-TTS 行為

啟用後，OpenClaw：

- 如果回覆已包含媒體或 `MEDIA:` 指令，則跳過 TTS。
- 跳過非常短的回覆（少於 10 個字元）。
- 當使用 `agents.defaults.model.primary`（或 `summaryModel`）啟用時，會摘要長回覆。
- 將產生的音訊附加到回覆。

如果回覆超過 `maxLength` 且摘要功能關閉（或摘要模型沒有 API 金鑰），則會跳過音訊並發送正常的文字回覆。

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
請參閱 [Slash commands](/en/tools/slash-commands) 以了解啟用詳情。

Discord 註記：`/tts` 是 Discord 的內建指令，因此 OpenClaw 在那裡註冊
`/voice` 作為原生指令。文字 `/tts ...` 仍然有效。

```
/tts off
/tts on
/tts status
/tts provider openai
/tts limit 2000
/tts summary off
/tts audio Hello from OpenClaw
```

註記：

- 指令需要授權的發送者（允許清單/擁有者規則仍然適用）。
- 必須啟用 `commands.text` 或原生指令註冊。
- 設定 `messages.tts.auto` 接受 `off|always|inbound|tagged`。
- `/tts on` 會將本機 TTS 偏好設定寫入 `always`；`/tts off` 則將其寫入 `off`。
- 當您想要 `inbound` 或 `tagged` 預設值時，請使用設定。
- `limit` 和 `summary` 儲存在本機偏好設定中，而非主設定。
- `/tts audio` 會產生一次性的音訊回覆（不會開啟 TTS）。
- `/tts status` 包含最新嘗試的後援可見性：
  - 成功後援：`Fallback: <primary> -> <used>` 加上 `Attempts: ...`
  - 失敗：`Error: ...` 加上 `Attempts: ...`
  - 詳細診斷：`Attempt details: provider:outcome(reasonCode) latency`
- OpenAI 和 ElevenLabs API 失敗現在包含已解析的提供者錯誤詳情和請求 ID（當由提供者返回時），這會顯示在 TTS 錯誤/日誌中。

## Agent 工具

`tts` 工具會將文字轉換為語音，並傳回音訊附件以供
回覆傳遞。當頻道是飛書、Matrix、Telegram 或 WhatsApp 時，
音訊會以語音訊息而非檔案附件的方式傳遞。

## Gateway RPC

Gateway 方法：

- `tts.status`
- `tts.enable`
- `tts.disable`
- `tts.convert`
- `tts.setProvider`
- `tts.providers`
