---
summary: "Voice Call 外掛程式：透過 Twilio/Telnyx/Plivo 撥打外撥與內接電話（外掛程式安裝 + 設定 + CLI）"
read_when:
  - You want to place an outbound voice call from OpenClaw
  - You are configuring or developing the voice-call plugin
title: "Voice Call 外掛程式"
---

# Voice Call（外掛程式）

透過外掛程式為 OpenClaw 提供語音通話功能。支援外撥通知，以及透過內接政策進行的多輪對話。

目前支援的業者：

- `twilio` (Programmable Voice + Media Streams)
- `telnyx` (Call Control v2)
- `plivo` (Voice API + XML 轉接 + GetInput 語音)
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
openclaw plugins install ./extensions/voice-call
cd ./extensions/voice-call && pnpm install
```

之後重新啟動 Gateway。

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

備註：

- Twilio/Telnyx 需要一個 **公開可存取** 的 webhook URL。
- Plivo 需要一個 **公開可存取** 的 webhook URL。
- `mock` 是一個本機開發用業者（不進行網路呼叫）。
- 除非 `skipSignatureVerification` 為 true，否則 Telnyx 需要 `telnyx.publicKey`（或 `TELNYX_PUBLIC_KEY`）。
- `skipSignatureVerification` 僅供本機測試使用。
- 如果您使用 ngrok 免費版，請將 `publicUrl` 設定為確切的 ngrok URL；簽章驗證始終會強制執行。
- `tunnel.allowNgrokFreeTierLoopbackBypass: true` 僅在 `tunnel.provider="ngrok"` 且 `serve.bind` 為 loopback（ngrok 本機代理程式）時，才允許簽章無效的 Twilio webhook。僅供本機開發使用。
- Ngrok 免費版網址可能會變更或加入插入式行為；如果 `publicUrl` 偏移，Twilio 簽章將會驗證失敗。正式環境建議使用穩定的網域或 Tailscale funnel。
- 串流安全預設值：
  - `streaming.preStartTimeoutMs` 會關閉從未傳送有效 `start` frame 的 socket。
  - `streaming.maxPendingConnections` 限制未經驗證的啟動前 socket 總數。
  - `streaming.maxPendingConnectionsPerIp` 限制每個來源 IP 的未經驗證的啟動前 socket 數量。
  - `streaming.maxConnections` 限制總共開啟的媒體串流 socket 數量（處理中 + 作用中）。

## 過期通話收割器

使用 `staleCallReaperSeconds` 來結束從未收到終結 webhook 的通話
（例如，從未完成的通知模式通話）。預設值為 `0`
（已停用）。

建議範圍：

- **正式環境：** 通知流程為 `120`–`300` 秒。
- 將此數值保持在 **高於 `maxDurationSeconds`**，以便正常通話能夠
  完成一個不錯的起始點是 `maxDurationSeconds + 30–60` 秒。

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

當 Proxy 或通道位於 Gateway 前端時，外掛程式會重建用於簽章驗證的
公開 URL。這些選項控制信任哪些轉發標頭。

`webhookSecurity.allowedHosts` 將轉發標頭中的主機加入允許清單。

`webhookSecurity.trustForwardingHeaders` 在沒有允許清單的情況下信任轉發標頭。

`webhookSecurity.trustedProxyIPs` 僅在請求遠端 IP 符合清單時才信任轉發標頭。

Twilio 和 Plivo 已啟用 Webhook 重放保護。重放的有效 Webhook
請求將會被確認，但會跳過副作用。

Twilio 對話回合在 `<Gather>` 回呼中包含每個回合的權杖，因此
過期/重放的語音回呼無法滿足較新的待處理文字記錄回合。

當提供者所需的簽章標頭缺失時，未經驗證的 webhook 請求會在讀取內文之前被拒絕。

Voice-call webhook 使用共享的預先驗證內文設定檔（64 KB / 5 秒），
以及在簽章驗證之前的每個 IP 進行中請求上限。

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

Voice Call 使用核心 `messages.tts` 設定在通話上進行
語音串流。您可以使用 **相同的結構** 在外掛設定下覆寫它 — 它會與 `messages.tts` 深度合併。

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

- **Microsoft 語音在語音通話中會被忽略**（電話音訊需要 PCM；目前的 Microsoft 傳輸層未公開電話 PCM 輸出）。
- 當啟用 Twilio 媒體串流時會使用核心 TTS；否則通話會回退到提供商的原生語音。
- 如果 Twilio 媒體串流已經啟用，Voice Call 不會回退到 TwiML `<Say>`。如果在該狀態下電話 TTS 不可用，播放請求將會失敗，而不會混合兩個播放路徑。

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

`inboundPolicy: "allowlist"` 是低保真度來電者 ID 篩選。此外掛程式會將提供商提供的 `From` 值正規化，並將其與 `allowFrom` 比較。
Webhook 驗證會驗證提供商的傳送與載酬完整性，但
這並不能證明 PSTN/VoIP 來電號碼的持有權。請將 `allowFrom` 視為
來電者 ID 篩選，而非強來電者身份驗證。

自動回應使用代理系統。使用以下方式進行調整：

- `responseModel`
- `responseSystemPrompt`
- `responseTimeoutMs`

### 語音輸出合約

針對自動回應，Voice Call 會將嚴格的語音輸出合約附加到系統提示中：

- `{"spoken":"..."}`

Voice Call 接著會防禦性地提取語音文字：

- 忽略標記為推理/錯誤內容的載酬。
- 解析直接 JSON、圍籬 JSON 或內聯 `"spoken"` 鍵值。
- 回退到純文字並移除可能的規劃/元資料導言段落。

這能讓語音播放專注於面向來電者的文字，並避免將規劃文字洩漏到音訊中。

### 對話啟動行為

針對撥出 `conversation` 通話，首則訊息處理與即時播放狀態相關聯：

- 插隊佇列清除與自動回應僅在初始問候語主動播放時被抑制。
- 如果初始播放失敗，通話會返回 `listening`，且初始訊息保持排隊等待重試。
- Twilio 串流的初始播放在串流連線時開始，沒有額外延遲。

### Twilio 串流中斷寬限期

當 Twilio 媒體串流中斷時，Voice Call 會在自動結束通話前等待 `2000ms`：

- 如果在該時間視窗內串流重新連線，自動結束將被取消。
- 如果在寬限期後沒有重新註冊串流，通話將被結束以防止卡在進行中的通話。

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

`latency` 從預設的 voice-call 儲存路徑讀取 `calls.jsonl`。使用
`--file <path>` 指向不同的日誌，並使用 `--last <n>` 將分析限制
在最後 N 筆記錄（預設 200）。輸出包含輪替延遲和聆聽等待時間的 p50/p90/p99。

## Agent 工具

工具名稱：`voice_call`

動作：

- `initiate_call` (message, to?, mode?)
- `continue_call` (callId, message)
- `speak_to_user` (callId, message)
- `end_call` (callId)
- `get_status` (callId)

此 repo 附帶一個匹配的技能文件，位於 `skills/voice-call/SKILL.md`。

## Gateway RPC

- `voicecall.initiate` (`to?`, `message`, `mode?`)
- `voicecall.continue` (`callId`, `message`)
- `voicecall.speak` (`callId`, `message`)
- `voicecall.end` (`callId`)
- `voicecall.status` (`callId`)
