---
summary: "Voice Call 外掛程式：透過 Twilio/Telnyx/Plivo 進行外撥與內通電話（外掛程式安裝 + 設定 + CLI）"
read_when:
  - You want to place an outbound voice call from OpenClaw
  - You are configuring or developing the voice-call plugin
title: "Voice Call 外掛程式"
---

# Voice Call（外掛程式）

透過外掛程式為 OpenClaw 提供語音通話功能。支援外撥通知以及使用內部政策的多輪對話。

目前供應商：

- `twilio` (可程式化語音 + 媒體串流)
- `telnyx` (通話控制 v2)
- `plivo` (語音 API + XML 轉接 + GetInput 語音)
- `mock` (開發/無網路)

快速心智模型：

- 安裝外掛程式
- 重新啟動 Gateway
- 在 `plugins.entries.voice-call.config` 下進行設定
- 使用 `openclaw voicecall ...` 或 `voice_call` 工具

## 執行位置（本機 vs 遠端）

語音通話外掛程式會在 **Gateway 程序內部** 執行。

如果您使用遠端 Gateway，請在 **執行 Gateway 的機器** 上安裝/設定此外掛程式，然後重新啟動 Gateway 以載入它。

## 安裝

### 選項 A：從 npm 安裝（建議）

```exec
openclaw plugins install @openclaw/voice-call
```

之後請重新啟動 Gateway。

### 選項 B：從本機資料夾安裝（開發用，無複製）

```exec
openclaw plugins install ./extensions/voice-call
cd ./extensions/voice-call && pnpm install
```

之後請重新啟動 Gateway。

## 設定

在 `plugins.entries.voice-call.config` 下設定：

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
            streamPath: "/voice/stream",
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

注意：

- Twilio/Telnyx 需要 **可公開存取** 的 webhook URL。
- Plivo 需要 **可公開存取** 的 webhook URL。
- `mock` 是本機開發用的供應商（無網路呼叫）。
- 除非 `skipSignatureVerification` 為 true，否則 Telnyx 需要 `telnyx.publicKey`（或 `TELNYX_PUBLIC_KEY`）。
- `skipSignatureVerification` 僅供本機測試使用。
- 如果您使用 ngrok 免費版，請將 `publicUrl` 設定為確切的 ngrok URL；始終會強制執行簽名驗證。
- `tunnel.allowNgrokFreeTierLoopbackBypass: true` 允許具有無效簽名的 Twilio webhook **僅**在 `tunnel.provider="ngrok"` 和 `serve.bind` 為 loopback（ngrok 本地代理程式）時使用。僅用於本地開發。
- Ngrok 免費版 URL 可能會變更或加入插頁式行為；如果 `publicUrl` 偏移，Twilio 簽名將會失敗。對於生產環境，建議使用穩定的網域或 Tailscale funnel。
- 串流安全性預設值：
  - `streaming.preStartTimeoutMs` 會關閉從未傳送有效 `start` 框架的 socket。
  - `streaming.maxPendingConnections` 限制未經驗證的啟動前 socket 總數。
  - `streaming.maxPendingConnectionsPerIp` 限制每個來源 IP 的未經驗證啟動前 socket 數量。
  - `streaming.maxConnections` 限制開放媒體串流 socket 的總數（待處理 + 作用中）。

## 過期通話收割者

使用 `staleCallReaperSeconds` 結束從未收到終止 webhook 的通話
（例如，從未完成的通知模式通話）。預設值為 `0`
（停用）。

建議範圍：

- **生產環境：** 通知風格流程為 `120`–`300` 秒。
- 將此值保持**高於 `maxDurationSeconds`**，以便正常通話可以
  完成。一個好的起點是 `maxDurationSeconds + 30–60` 秒。

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

當 Proxy 或隧道位於 Gateway 前方時，外掛程式會重建
用於簽章驗證的公開 URL。這些選項控制信任哪些轉發
標頭。

`webhookSecurity.allowedHosts` 從轉發標頭中將主機加入允許清單。

`webhookSecurity.trustForwardingHeaders` 在沒有白名單的情況下信任轉發的標頭。

`webhookSecurity.trustedProxyIPs` 只有在請求的遠端 IP 符合列表時才信任轉發的標頭。

已針對 Twilio 和 Plivo 啟用 Webhook 重放保護。重播的有效 Webhook 請求會被確認，但會跳過副作用。

Twilio 對話輪次在 `<Gather>` 回調中包含每輪 token，因此過時/重播的語音回調無法滿足較新的待處理文字記錄輪次。

使用穩定公共主機的範例：

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

Voice Call 使用核心 `messages.tts` 配置來進行通話的串流語音。您可以使用 **相同的結構** 在插件配置下覆寫它 — 它會與 `messages.tts` 深度合併。

```json5
{
  tts: {
    provider: "elevenlabs",
    elevenlabs: {
      voiceId: "pMsXgVXv3BLzUgSXRplE",
      modelId: "eleven_multilingual_v2",
    },
  },
}
```

備註：

- **語音通話會忽略 Microsoft speech**（語音訊號需要 PCM；目前的 Microsoft 傳輸方式不支援輸出語音訊號 PCM）。
- 當啟用 Twilio 媒體串流時會使用核心 TTS；否則通話會回退到提供者的原生語音。

### 更多範例

僅使用核心 TTS（不覆寫）：

```json5
{
  messages: {
    tts: {
      provider: "openai",
      openai: { voice: "alloy" },
    },
  },
}
```

僅針對通話覆寫為 ElevenLabs（其他地方保持核心預設值）：

```json5
{
  plugins: {
    entries: {
      "voice-call": {
        config: {
          tts: {
            provider: "elevenlabs",
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
}
```

僅針對通話覆寫 OpenAI 模型（深度合併範例）：

```json5
{
  plugins: {
    entries: {
      "voice-call": {
        config: {
          tts: {
            openai: {
              model: "gpt-4o-mini-tts",
              voice: "marin",
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

`inboundPolicy: "allowlist"` 是一個低保真的來電 ID 篩選機制。該外掛程式會將供應商提供的 `From` 值進行正規化，並將其與 `allowFrom` 進行比較。Webhook 驗證會驗證供應商的傳送與載體完整性，但並不能證明 PSTN/VoIP 來電號碼的所有權。請將 `allowFrom` 視為來電 ID 篩選，而非強烈的來電身份識別。

自動回應使用代理程式系統。透過以下方式進行調整：

- `responseModel`
- `responseSystemPrompt`
- `responseTimeoutMs`

## CLI

```exec
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

`latency` 從預設的 voice-call 儲存路徑讀取 `calls.jsonl`。使用
`--file <path>` 指向不同的日誌，並使用 `--last <n>` 將分析
限制在最後 N 筆記錄（預設為 200）。輸出包含輪次延遲和監聽等待時間的
p50/p90/p99。

## Agent 工具

工具名稱：`voice_call`

動作：

- `initiate_call` (message, to?, mode?)
- `continue_call` (callId, message)
- `speak_to_user` (callId, message)
- `end_call` (callId)
- `get_status` (callId)

此 repo 隨附一個匹配的技能文檔，位於 `skills/voice-call/SKILL.md`。

## Gateway RPC

- `voicecall.initiate` (`to?`, `message`, `mode?`)
- `voicecall.continue` (`callId`, `message`)
- `voicecall.speak` (`callId`, `message`)
- `voicecall.end` (`callId`)
- `voicecall.status` (`callId`)
