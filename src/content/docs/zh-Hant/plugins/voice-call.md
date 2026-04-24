---
summary: "語音通話外掛程式：透過 Twilio/Telnyx/Plivo 撥打外撥與內撥電話（外掛程式安裝 + 設定 + CLI）"
read_when:
  - You want to place an outbound voice call from OpenClaw
  - You are configuring or developing the voice-call plugin
title: "語音通話外掛程式"
---

# Voice Call（外掛程式）

透過外掛程式為 OpenClaw 提供語音通話功能。支援外撥通知，以及透過內接政策進行的多輪對話。

目前支援的業者：

- `twilio` (可程式化語音 + 媒體串流)
- `telnyx` (通話控制 v2)
- `plivo` (語音 API + XML 轉接 + GetInput 語音)
- `mock` (開發/無網路)

快速概念模型：

- 安裝外掛程式
- 重新啟動 Gateway
- 在 `plugins.entries.voice-call.config` 下進行設定
- 使用 `openclaw voicecall ...` 或 `voice_call` 工具

## 執行位置（本機與遠端）

Voice Call 外掛程式執行於 **Gateway 程序內部**。

如果您使用遠端 Gateway，請在 **執行 Gateway 的機器** 上安裝/設定此外掛程式，然後重新啟動 Gateway 以載入它。

## 安裝

### 選項 A：從 npm 安裝（建議）

```bash
openclaw plugins install @openclaw/voice-call
```

之後重新啟動 Gateway。

### 選項 B：從本機資料夾安裝（開發用，不進行複製）

```bash
PLUGIN_SRC=./path/to/local/voice-call-plugin
openclaw plugins install "$PLUGIN_SRC"
cd "$PLUGIN_SRC" && pnpm install
```

之後重新啟動 Gateway。

## 設定

在 `plugins.entries.voice-call.config` 下設定組態：

```json5
{
  plugins: {
    entries: {
      "voice-call": {
        enabled: true,
        config: {
          provider: "twilio", // or "telnyx" | "plivo" | "mock"
          fromNumber: "+15550001234",
          toNumber: "+15550005678",

          twilio: {
            accountSid: "ACxxxxxxxx",
            authToken: "...",
          },

          telnyx: {
            apiKey: "...",
            connectionId: "...",
            // Telnyx webhook public key from the Telnyx Mission Control Portal
            // (Base64 string; can also be set via TELNYX_PUBLIC_KEY).
            publicKey: "...",
          },

          plivo: {
            authId: "MAxxxxxxxxxxxxxxxxxxxx",
            authToken: "...",
          },

          // Webhook server
          serve: {
            port: 3334,
            path: "/voice/webhook",
          },

          // Webhook security (recommended for tunnels/proxies)
          webhookSecurity: {
            allowedHosts: ["voice.example.com"],
            trustedProxyIPs: ["100.64.0.1"],
          },

          // Public exposure (pick one)
          // publicUrl: "https://example.ngrok.app/voice/webhook",
          // tunnel: { provider: "ngrok" },
          // tailscale: { mode: "funnel", path: "/voice/webhook" }

          outbound: {
            defaultMode: "notify", // notify | conversation
          },

          streaming: {
            enabled: true,
            provider: "openai", // optional; first registered realtime transcription provider when unset
            streamPath: "/voice/stream",
            providers: {
              openai: {
                apiKey: "sk-...", // optional if OPENAI_API_KEY is set
                model: "gpt-4o-transcribe",
                silenceDurationMs: 800,
                vadThreshold: 0.5,
              },
            },
            preStartTimeoutMs: 5000,
            maxPendingConnections: 32,
            maxPendingConnectionsPerIp: 4,
            maxConnections: 128,
          },
        },
      },
    },
  },
}
```

備註：

- Twilio/Telnyx 需要一個 **公開可存取** 的 webhook URL。
- Plivo 需要一個 **公開可存取** 的 webhook URL。
- `mock` 是一個本地開發供應商（無網路呼叫）。
- 如果較舊的組態仍然使用 `provider: "log"`、`twilio.from` 或舊版 `streaming.*` OpenAI 金鑰，請執行 `openclaw doctor --fix` 來重寫它們。
- 除非 `skipSignatureVerification` 為 true，否則 Telnyx 需要 `telnyx.publicKey`（或 `TELNYX_PUBLIC_KEY`）。
- `skipSignatureVerification` 僅供本地測試使用。
- 如果您使用 ngrok 免費層級，請將 `publicUrl` 設定為確切的 ngrok URL；簽章驗證會始終強制執行。
- `tunnel.allowNgrokFreeTierLoopbackBypass: true` 僅在 `tunnel.provider="ngrok"` 且 `serve.bind` 為回送（ngrok 本地代理程式）時，才允許具有無效簽章的 Twilio webhook。僅供本地開發使用。
- Ngrok 免費層級的 URL 可能會變更或加入插入性行為；如果 `publicUrl` 漂移，Twilio 簽章將會失敗。對於生產環境，建議使用穩定的網域或 Tailscale funnel。
- 串流安全預設值：
  - `streaming.preStartTimeoutMs` 會關閉從未傳送有效 `start` 框架的 socket。
- `streaming.maxPendingConnections` 限制未經驗證的啟動前 socket 總數。
- `streaming.maxPendingConnectionsPerIp` 限制每個來源 IP 的未經驗證啟動前 socket 數量。
- `streaming.maxConnections` 限制開放式媒體串流 socket（擱置中 + 作用中）的總數。
- 執行時期後援目前仍接受那些舊的 voice-call 金鑰，但重寫路徑為 `openclaw doctor --fix`，且相容性 shim 是暫時性的。

## 串流轉錄

`streaming` 選擇一個即時轉錄提供者以進行通話即時音訊轉錄。

目前執行時行為：

- `streaming.provider` 是選用的。若未設定，Voice Call 將使用第一個已註冊的即時轉錄提供者。
- 內建的即時轉錄提供者包括 Deepgram (`deepgram`)、
  ElevenLabs (`elevenlabs`)、Mistral (`mistral`)、OpenAI (`openai`) 與 xAI
  (`xai`)，由其提供者外掛程式註冊。
- 提供者擁有的原始設定位於 `streaming.providers.<providerId>` 之下。
- 若 `streaming.provider` 指向未註冊的提供者，或完全未註冊任何即時
  轉錄提供者，Voice Call 將記錄警告並
  略過媒體串流，而不是讓整個外掛程式失敗。

OpenAI 串流轉錄預設值：

- API 金鑰： `streaming.providers.openai.apiKey` 或 `OPENAI_API_KEY`
- 模型： `gpt-4o-transcribe`
- `silenceDurationMs`: `800`
- `vadThreshold`: `0.5`

xAI 串流轉錄預設值：

- API 金鑰： `streaming.providers.xai.apiKey` 或 `XAI_API_KEY`
- 端點： `wss://api.x.ai/v1/stt`
- `encoding`: `mulaw`
- `sampleRate`: `8000`
- `endpointingMs`: `800`
- `interimResults`: `true`

範例：

```json5
{
  plugins: {
    entries: {
      "voice-call": {
        config: {
          streaming: {
            enabled: true,
            provider: "openai",
            streamPath: "/voice/stream",
            providers: {
              openai: {
                apiKey: "sk-...", // optional if OPENAI_API_KEY is set
                model: "gpt-4o-transcribe",
                silenceDurationMs: 800,
                vadThreshold: 0.5,
              },
            },
          },
        },
      },
    },
  },
}
```

改用 xAI：

```json5
{
  plugins: {
    entries: {
      "voice-call": {
        config: {
          streaming: {
            enabled: true,
            provider: "xai",
            streamPath: "/voice/stream",
            providers: {
              xai: {
                apiKey: "${XAI_API_KEY}", // optional if XAI_API_KEY is set
                endpointingMs: 800,
                language: "en",
              },
            },
          },
        },
      },
    },
  },
}
```

舊版金鑰仍會由 `openclaw doctor --fix` 自動遷移：

- `streaming.sttProvider` → `streaming.provider`
- `streaming.openaiApiKey` → `streaming.providers.openai.apiKey`
- `streaming.sttModel` → `streaming.providers.openai.model`
- `streaming.silenceDurationMs` → `streaming.providers.openai.silenceDurationMs`
- `streaming.vadThreshold` → `streaming.providers.openai.vadThreshold`

## 過期通話清理器

使用 `staleCallReaperSeconds` 來結束從未收到終止 webhook 的通話
（例如，從未完成的通知模式通話）。預設值為 `0`
（已停用）。

建議範圍：

- **正式環境：** 針對通知類流程為 `120`–`300` 秒。
- 將此數值保持為**高於 `maxDurationSeconds`**，以便正常通話可以
  完成。一個好的起始點是 `maxDurationSeconds + 30–60` 秒。

範例：

```json5
{
  plugins: {
    entries: {
      "voice-call": {
        config: {
          maxDurationSeconds: 300,
          staleCallReaperSeconds: 360,
        },
      },
    },
  },
}
```

## Webhook 安全性

當 Proxy 或隧道位於 Gateway 前方時，外掛程式會重建公開 URL 以進行簽章驗證。這些選項控制信任哪些轉送標頭。

`webhookSecurity.allowedHosts` 將轉送標頭中的主機列入允許清單。

`webhookSecurity.trustForwardingHeaders` 在沒有允許清單的情況下信任轉送標頭。

`webhookSecurity.trustedProxyIPs` 僅在請求的遠端 IP 符合清單時信任轉送標頭。

已針對 Twilio 和 Plivo 啟用 Webhook 重放保護。重放的有效 webhook
請求將會被確認，但會跳過副作用。

Twilio 對話輪次在 `<Gather>` 回呼中包含每輪專屬的權杖，因此
過期/重放的語音回呼無法滿足較新的待處理轉錄輪次。

當供應商所需的簽章標頭缺失時，未經驗證的 webhook 請求將在讀取內文之前被拒絕。

語音通話 webhook 使用共用的預先驗證內文設定檔（64 KB / 5 秒）
加上每個 IP 的進行中上限，然後才進行簽章驗證。

具有穩定公開主機的範例：

```json5
{
  plugins: {
    entries: {
      "voice-call": {
        config: {
          publicUrl: "https://voice.example.com/voice/webhook",
          webhookSecurity: {
            allowedHosts: ["voice.example.com"],
          },
        },
      },
    },
  },
}
```

## 通話的 TTS

Voice Call 使用核心 `messages.tts` 設定檔來
進行通話的串流語音。您可以使用**相同的結構**在外掛程式設定中覆寫它
— 它會與 `messages.tts` 深度合併。

```json5
{
  tts: {
    provider: "elevenlabs",
    providers: {
      elevenlabs: {
        voiceId: "pMsXgVXv3BLzUgSXRplE",
        modelId: "eleven_multilingual_v2",
      },
    },
  },
}
```

備註：

- 外掛程式設定內的舊版 `tts.<provider>` 金鑰（`openai`、`elevenlabs`、`microsoft`、`edge`）會在載入時自動遷移至 `tts.providers.<provider>`。在提交的設定中，建議優先使用 `providers` 結構。
- **語音通話會忽略 Microsoft 語音**（電話語音需要 PCM；目前的 Microsoft 傳輸方式未公開電話 PCM 輸出）。
- 當啟用 Twilio 媒體串流時，會使用核心 TTS；否則通話會回退至供應商的原生語音。
- 如果 Twilio 媒體流已啟用，Voice Call 將不會回退至 TwiML `<Say>`。如果在此狀態下無法使用電話 TTS，播放請求將會失敗，而不是混合兩條播放路徑。
- 當電話 TTS 回退至次要提供者時，Voice Call 會記錄包含提供者鏈 (`from`, `to`, `attempts`) 的警告以便除錯。

### 更多範例

僅使用核心 TTS (無覆寫)：

```json5
{
  messages: {
    tts: {
      provider: "openai",
      providers: {
        openai: { voice: "alloy" },
      },
    },
  },
}
```

僅針對通話覆寫為 ElevenLabs (其餘地方保持核心預設值)：

```json5
{
  plugins: {
    entries: {
      "voice-call": {
        config: {
          tts: {
            provider: "elevenlabs",
            providers: {
              elevenlabs: {
                apiKey: "elevenlabs_key",
                voiceId: "pMsXgVXv3BLzUgSXRplE",
                modelId: "eleven_multilingual_v2",
              },
            },
          },
        },
      },
    },
  },
}
```

僅針對通話覆寫 OpenAI 模型 (深度合併範例)：

```json5
{
  plugins: {
    entries: {
      "voice-call": {
        config: {
          tts: {
            providers: {
              openai: {
                model: "gpt-4o-mini-tts",
                voice: "marin",
              },
            },
          },
        },
      },
    },
  },
}
```

## 來電

來電原則預設為 `disabled`。若要啟用來電，請設定：

```json5
{
  inboundPolicy: "allowlist",
  allowFrom: ["+15550001234"],
  inboundGreeting: "Hello! How can I help?",
}
```

`inboundPolicy: "allowlist"` 是一個低保障的來電顯示篩選器。此外掛程式會將提供者提供的 `From` 值正規化，並與 `allowFrom` 進行比較。
Webhook 驗證會驗證提供者傳送與載荷完整性，但它
無法證明 PSTN/VoIP 來電號碼的所有權。請將 `allowFrom` 視為
來電顯示篩選，而非強大的來電者身分驗證。

自動回應使用代理程式系統。可透過以下方式調整：

- `responseModel`
- `responseSystemPrompt`
- `responseTimeoutMs`

### 語音輸出合約

對於自動回應，Voice Call 會將嚴格的語音輸出合約附加至系統提示詞：

- `{"spoken":"..."}`

然後 Voice Call 會謹慎地擷取語音文字：

- 忽略標記為推理/錯誤內容的載荷。
- 解析直接 JSON、圍籬 JSON 或內聯 `"spoken"` 鍵。
- 回退至純文字並移除可能的規劃/元資訊引導段落。

這能讓語音播放集中於面向來電者的文字，並避免將規劃文字洩漏至音訊中。

### 對話啟動行為

對於 `conversation` 去電，首則訊息處理與即時播放狀態相關：

- 插隊清除佇列和自動回應僅在初始問候語正在播放時受到抑制。
- 如果初始播放失敗，通話會返回至 `listening`，且初始訊息會保持佇列狀態以供重試。
- Twilio 串流的初始播放在串流連線時開始，沒有額外延遲。

### Twilio 串流斷線寬限期

當 Twilio 媒體串流中斷連線時，Voice Call 會等待 `2000ms` 後自動結束通話：

- 如果在該期間內串流重新連線，則會取消自動結束。
- 如果在寬限期後沒有重新註冊串流，通話將會結束以防止通話卡在活躍狀態。

## CLI

```bash
openclaw voicecall call --to "+15555550123" --message "Hello from OpenClaw"
openclaw voicecall start --to "+15555550123"   # alias for call
openclaw voicecall continue --call-id <id> --message "Any questions?"
openclaw voicecall speak --call-id <id> --message "One moment"
openclaw voicecall end --call-id <id>
openclaw voicecall status --call-id <id>
openclaw voicecall tail
openclaw voicecall latency                     # summarize turn latency from logs
openclaw voicecall expose --mode funnel
```

`latency` 從預設的 voice-call 儲存路徑讀取 `calls.jsonl`。請使用
`--file <path>` 指向不同的日誌，並使用 `--last <n>` 將分析限制
在最後 N 筆記錄（預設為 200）。輸出包含輪替延遲和聆聽等待時間的 p50/p90/p99。

## Agent 工具

工具名稱：`voice_call`

動作：

- `initiate_call` (message, to?, mode?)
- `continue_call` (callId, message)
- `speak_to_user` (callId, message)
- `end_call` (callId)
- `get_status` (callId)

此 repo 在 `skills/voice-call/SKILL.md` 提供了相應的 skill doc。

## Gateway RPC

- `voicecall.initiate` (`to?`, `message`, `mode?`)
- `voicecall.continue` (`callId`, `message`)
- `voicecall.speak` (`callId`, `message`)
- `voicecall.end` (`callId`)
- `voicecall.status` (`callId`)
