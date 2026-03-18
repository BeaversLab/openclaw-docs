---
summary: "Voice Call 外掛程式：透過 Twilio/Telnyx/Plivo 進行外撥與內通（外掛程式安裝 + 設定 + CLI）"
read_when:
  - You want to place an outbound voice call from OpenClaw
  - You are configuring or developing the voice-call plugin
title: "Voice Call 外掛程式"
---

# Voice Call (外掛程式)

透過外掛程式為 OpenClaw 提供語音通話功能。支援外撥通知以及透過內通政策進行多輪對話。

目前支援的供應商：

- `twilio` (可程式化語音 + 媒體串流)
- `telnyx` (Call Control v2)
- `plivo` (Voice API + XML 轉接 + GetInput 語音)
- `mock` (開發/無網路)

快速概念模型：

- 安裝外掛程式
- 重新啟動 Gateway
- 在 `plugins.entries.voice-call.config` 下進行設定
- 使用 `openclaw voicecall ...` 或 `voice_call` 工具

## 執行位置 (本地 vs 遠端)

Voice Call 外掛程式執行於 **Gateway 程序內部**。

如果您使用遠端 Gateway，請在 **執行 Gateway 的機器** 上安裝/設定外掛程式，然後重新啟動 Gateway 以載入它。

## 安裝

### 選項 A：從 npm 安裝 (建議)

```bash
openclaw plugins install @openclaw/voice-call
```

之後請重新啟動 Gateway。

### 選項 B：從本地資料夾安裝 (開發用，不複製檔案)

```bash
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

注意事項：

- Twilio/Telnyx 需要 **可公開存取** 的 webhook URL。
- Plivo 需要 **可公開存取** 的 webhook URL。
- `mock` 是一個本地開發供應商 (不會進行網路呼叫)。
- 除非 `skipSignatureVerification` 為 true，否則 Telnyx 需要 `telnyx.publicKey` (或 `TELNYX_PUBLIC_KEY`)。
- `skipSignatureVerification` 僅供本地測試使用。
- 如果您使用 ngrok 免費層，請將 `publicUrl` 設定為確切的 ngrok URL；簽章驗證始終會被強制執行。
- `tunnel.allowNgrokFreeTierLoopbackBypass: true` 僅允許在 `tunnel.provider="ngrok"` 且 `serve.bind` 為回送位址 (ngrok 本地代理程式) 時，接受具有無效簽章的 Twilio webhook。僅供本地開發使用。
- Ngrok 免費層 URL 可能會變更或加入插頁式行為；如果 `publicUrl` 偏移，Twilio 簽章將會失敗。對於正式環境，建議使用穩定的網域或 Tailscale funnel。
- 串流安全預設值：
  - `streaming.preStartTimeoutMs` 會關閉從未發送有效 `start` 框架的 socket。
  - `streaming.maxPendingConnections` 限制未經驗證的啟動前 socket 總數。
  - `streaming.maxPendingConnectionsPerIp` 限制來自單一來源 IP 的未經驗證的啟動前 socket 數量。
  - `streaming.maxConnections` 限制開啟的媒體串流 socket 總數（待處理 + 作用中）。

## 過期呼叫收割器

使用 `staleCallReaperSeconds` 來終結從未收到終止 webhook 的呼叫
（例如，從未完成的通知模式呼叫）。預設值為 `0`
（已停用）。

建議範圍：

- **正式環境：** 通知式流程為 `120`–`300` 秒。
- 請將此值保持在 **高於 `maxDurationSeconds`**，以便正常呼叫能夠
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
公開 URL 以進行簽章驗證。這些選項控制信任哪些
轉發標頭。

`webhookSecurity.allowedHosts` 將轉發標頭中的主機加入允許清單。

`webhookSecurity.trustForwardingHeaders` 在沒有允許清單的情況下信任轉發標頭。

`webhookSecurity.trustedProxyIPs` 僅在請求的遠端 IP 符合清單時信任轉發標頭。

Twilio 和 Plivo 已啟用 Webhook 重放防護。重放的有效 Webhook
請求將會被確認，但會跳過副作用。

Twilio 對話回合在 `<Gather>` 回呼中包含每回合的 Token，因此
過期/重放的語音回呼無法滿足較新的待處理文字記錄回合。

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

## 呼叫的 TTS

Voice Call 使用核心 `messages.tts` 設定（OpenAI 或 ElevenLabs）進行
通話中的語音串流。您可以使用外掛程式設定中的
**相同結構** 來覆寫它 — 它會與 `messages.tts` 進行深度合併。

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

- **語音通話會忽略 Edge TTS**（電話語音需要 PCM；Edge 輸出不可靠）。
- 當啟用 Twilio 媒體串流時會使用核心 TTS；否則通話會回退至供應商的原生語音。

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

來電原則預設為 `disabled`。若要啟用來電，請設定：

```json5
{
  inboundPolicy: "allowlist",
  allowFrom: ["+15550001234"],
  inboundGreeting: "Hello! How can I help?",
}
```

`inboundPolicy: "allowlist"` 是一種低保真度的來電者 ID 篩選機制。此外掛程式會將供應商提供的 `From` 值標準化，並與 `allowFrom` 進行比對。
Webhook 驗證會驗證供應商的傳遞與載波完整性，但它並不會證明 PSTN/VoIP 來電號碼的擁有權。請將 `allowFrom` 視為來電者 ID 篩選，而非強效的來電者身分驗證。

自動回應使用代理系統。可透過以下方式微調：

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

## 代理工具

工具名稱：`voice_call`

動作：

- `initiate_call` (message, to?, mode?)
- `continue_call` (callId, message)
- `speak_to_user` (callId, message)
- `end_call` (callId)
- `get_status` (callId)

此程式庫隨附於 `skills/voice-call/SKILL.md` 的對應技術文件。

## Gateway RPC

- `voicecall.initiate` (`to?`, `message`, `mode?`)
- `voicecall.continue` (`callId`, `message`)
- `voicecall.speak` (`callId`, `message`)
- `voicecall.end` (`callId`)
- `voicecall.status` (`callId`)

import footerZhHant from "/components/footer/zh-Hant.mdx";

<footerZhHant />
