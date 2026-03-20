---
summary: "Voice Call plugin：透過 Twilio/Telnyx/Plivo 撥打及接聽語音通話 (plugin install + config + CLI)"
read_when:
  - 您想要從 OpenClaw 撥打外撥語音通話
  - 您正在設定或開發 voice-call plugin
title: "Voice Call Plugin"
---

# Voice Call (plugin)

透過 plugin 為 OpenClaw 提供語音通話功能。支援外撥通知以及使用 inbound rules 進行的多輪對話。

目前的提供者：

- `twilio` (Programmable Voice + Media Streams)
- `telnyx` (Call Control v2)
- `plivo` (Voice API + XML transfer + GetInput speech)
- `mock` (dev/no network)

快速心智模型：

- 安裝外掛
- 重新啟動 Gateway
- 在 `plugins.entries.voice-call.config` 下進行設定
- 使用 `openclaw voicecall ...` 或 `voice_call` 工具

## 運行位置 (本地 vs 遠端)

Voice Call plugin 運行於 **Gateway 進程內部**。

如果您使用遠端 Gateway，請在 **運行 Gateway 的機器** 上安裝/設定外掛，然後重新啟動 Gateway 以載入它。

## 安裝

### 選項 A：從 npm 安裝 (推薦)

```bash
openclaw plugins install @openclaw/voice-call
```

之後請重新啟動 Gateway。

### 選項 B：從本地資料夾安裝 (開發用，不複製)

```bash
openclaw plugins install ./extensions/voice-call
cd ./extensions/voice-call && pnpm install
```

之後請重新啟動 Gateway。

## 設定

在 `plugins.entries.voice-call.config` 下設定設定值：

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

備註：

- Twilio/Telnyx 需要 **可公開存取** 的 webhook URL。
- Plivo 需要 **可公開存取** 的 webhook URL。
- `mock` 是本地開發提供者 (不進行網路呼叫)。
- 除非 `skipSignatureVerification` 為 true，否則 Telnyx 需要 `telnyx.publicKey` (或 `TELNYX_PUBLIC_KEY`)。
- `skipSignatureVerification` 僅用於本地測試。
- 如果您使用 ngrok 免費層，請將 `publicUrl` 設定為確切的 ngrok URL；簽章驗證總是會被強制執行。
- `tunnel.allowNgrokFreeTierLoopbackBypass: true` 僅在 `tunnel.provider="ngrok"` 且 `serve.bind` 為 loopback (ngrok local agent) 時，才允許具有無效簽章的 Twilio webhook。僅供本地開發使用。
- Ngrok 免費層級的 URL 可能會變更或增加插頁行為；如果 `publicUrl` 漂移，Twilio 簽章將會失敗。對於生產環境，建議使用穩定的網域或 Tailscale funnel。
- 串流安全性預設值：
  - `streaming.preStartTimeoutMs` 會關閉從未傳送有效 `start` 幀的 socket。
  - `streaming.maxPendingConnections` 限制未驗證的啟動前 socket 總數。
  - `streaming.maxPendingConnectionsPerIp` 限制每個來源 IP 的未驗證啟動前 socket 數量。
  - `streaming.maxConnections` 限制已開啟的媒體串流 socket 總數（包括等待中和進行中）。

## 過期通話收割器

使用 `staleCallReaperSeconds` 來結束從未收到終止 webhook 的通話
（例如，從未完成的通知模式通話）。預設值為 `0`
（已停用）。

建議範圍：

- **生產環境：** 通知風格流程建議 `120` 到 `300` 秒。
- 請將此值設定為 **高於 `maxDurationSeconds`**，以便一般通話能夠
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

當 Proxy 或隧道位於 Gateway 前端時，外掛程式會重建
用於簽章驗證的公開 URL。這些選項控制信任哪些轉發
標頭。

`webhookSecurity.allowedHosts` 將轉發標頭中的主機列入允許清單。

`webhookSecurity.trustForwardingHeaders` 在沒有允許清單的情況下信任轉發標頭。

`webhookSecurity.trustedProxyIPs` 僅在請求遠端 IP 符合清單時信任轉發標頭。

Twilio 和 Plivo 已啟用 Webhook 重播保護。重播的有效 webhook
請求會被確認，但會跳過副作用處理。

Twilio 對話輪次在 `<Gather>` 回調中包含每輪次 token，因此
過期/重播的語音回調無法滿足較新的待處理文字記錄輪次。

使用穩定公開主機的範例：

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

Voice Call 使用核心 `messages.tts` 組態進行
通話上的語音串流。您可以在外掛程式組態下使用
**相同結構** 覆寫它 —— 它會與 `messages.tts` 深度合併。

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

注意：

- **語音通話會忽略 Microsoft 語音**（電話語音需要 PCM；目前的 Microsoft 傳輸不提供電話 PCM 輸出）。
- 當啟用 Twilio 媒體串流時會使用核心 TTS；否則通話會回退到提供商的原生語音。

### 更多範例

僅使用核心 TTS（無覆寫）：

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

僅針對通話覆寫為 ElevenLabs（其他地方保持核心預設）：

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

來電政策預設為 `disabled`。若要啟用來電，請設定：

```json5
{
  inboundPolicy: "allowlist",
  allowFrom: ["+15550001234"],
  inboundGreeting: "Hello! How can I help?",
}
```

`inboundPolicy: "allowlist"` 是低保驗的來電者 ID 篩選器。此外掛程式
會將提供商提供的 `From` 值標準化，並與 `allowFrom` 進行比較。
Webhook 驗證可驗證提供商的傳送與 payload 完整性，但
它無法證明 PSTN/VoIP 來電者號碼的擁有權。請將 `allowFrom` 視為
來電者 ID 篩選，而非強烈來電者身份驗證。

自動回應使用代理程式系統。請透過以下方式調整：

- `responseModel`
- `responseSystemPrompt`
- `responseTimeoutMs`

## CLI

```bash
openclaw voicecall call --to "+15555550123" --message "Hello from OpenClaw"
openclaw voicecall continue --call-id <id> --message "Any questions?"
openclaw voicecall speak --call-id <id> --message "One moment"
openclaw voicecall end --call-id <id>
openclaw voicecall status --call-id <id>
openclaw voicecall tail
openclaw voicecall expose --mode funnel
```

## 代理程式工具

工具名稱：`voice_call`

動作：

- `initiate_call` (message, to?, mode?)
- `continue_call` (callId, message)
- `speak_to_user` (callId, message)
- `end_call` (callId)
- `get_status` (callId)

此 repo 在 `skills/voice-call/SKILL.md` 提供了對應的技術文件。

## 閘道 RPC

- `voicecall.initiate` (`to?`, `message`, `mode?`)
- `voicecall.continue` (`callId`, `message`)
- `voicecall.speak` (`callId`, `message`)
- `voicecall.end` (`callId`)
- `voicecall.status` (`callId`)

import en from "/components/footer/en.mdx";

<en />
