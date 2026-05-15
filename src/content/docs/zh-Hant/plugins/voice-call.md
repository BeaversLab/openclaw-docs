---
summary: "透過 Twilio、Telnyx 或 Plivo 撥打及接聽語音通話，可選擇啟用即時語音與串流轉文字"
read_when:
  - You want to place an outbound voice call from OpenClaw
  - You are configuring or developing the voice-call plugin
  - You need realtime voice or streaming transcription on telephony
title: "語音通話外掛"
sidebarTitle: "語音通話"
---

透過外掛程式為 OpenClaw 提供語音通話功能。支援外撥通知、多輪對話、全雙工即時語音、串流轉錄，以及具許可清單政策的來電。

**目前供應商：** `twilio` (Programmable Voice + Media Streams)、
`telnyx` (Call Control v2)、`plivo` (Voice API + XML transfer + GetInput
speech)、`mock` (dev/no network)。

<Note>語音通話外掛程式執行於 **閘道程序內部**。如果您使用遠端閘道，請在執行閘道的機器上安裝並設定外掛程式，然後重新啟動閘道以載入它。</Note>

## 快速入門

<Steps>
  <Step title="安裝外掛">
    <Tabs>
      <Tab title="從 npm 安裝">
        ```bash
        openclaw plugins install @openclaw/voice-call
        ```
      </Tab>
      <Tab title="從本機資料夾安裝 (開發用)">
        ```bash
        PLUGIN_SRC=./path/to/local/voice-call-plugin
        openclaw plugins install "$PLUGIN_SRC"
        cd "$PLUGIN_SRC" && pnpm install
        ```
      </Tab>
    </Tabs>

    使用基本套件名稱以追蹤目前的正式發行標籤。僅在需要可重現的安裝時才鎖定特定版本。

    之後請重新啟動 Gateway 以載入外掛。

  </Step>
  <Step title="設定供應商與 webhook">
    在 `plugins.entries.voice-call.config` 下設定設定值 (請參閱下方的
    [Configuration](#configuration) 以了解完整結構)。最低需求為：
    `provider`、供應商憑證、`fromNumber`，以及一個公開可存取的 webhook URL。
  </Step>
  <Step title="驗證設定">
    ```bash
    openclaw voicecall setup
    ```

    預設輸出內容可在聊天記錄與終端機中閱讀。它會檢查
    外掛是否已啟用、供應商憑證、webhook 是否公開，以及
    是否僅啟用了一種音訊模式 (`streaming` 或 `realtime`)。請使用
    `--json` 供腳本使用。

  </Step>
  <Step title="冒煙測試">
    ```bash
    openclaw voicecall smoke
    openclaw voicecall smoke --to "+15555550123"
    ```

    兩者預設皆為試執行。請加入 `--yes` 以實際撥打一通簡短的
    外撥通知通話：

    ```bash
    openclaw voicecall smoke --to "+15555550123" --yes
    ```

  </Step>
</Steps>

<Warning>對於 Twilio、Telnyx 和 Plivo，設定必須解析為 **公開的 webhook URL**。 如果 `publicUrl`、tunnel URL、Tailscale URL 或服務回退 解析為 loopback 或私人網路空間，設定將會失敗，而不是 啟動一個無法接收 carrier webhook 的提供者。</Warning>

## 設定

如果 `enabled: true` 但選定的提供者缺少憑證，
Gateway 啟動時會記錄一個設定不完整的警告，包含遺失的鍵並
跳過啟動執行時期。當使用時，指令、RPC 呼叫和代理工具仍然
會回傳確切遺失的提供者設定。

<Note>語音通話憑證接受 SecretRefs。`plugins.entries.voice-call.config.twilio.authToken`、`plugins.entries.voice-call.config.realtime.providers.*.apiKey`、`plugins.entries.voice-call.config.streaming.providers.*.apiKey` 和 `plugins.entries.voice-call.config.tts.providers.*.apiKey` 透過標準 SecretRef 介面解析；請參閱 [SecretRef credential surface](/zh-Hant/reference/secretref-credential-surface)。</Note>

```json5
{
  plugins: {
    entries: {
      "voice-call": {
        enabled: true,
        config: {
          provider: "twilio", // or "telnyx" | "plivo" | "mock"
          fromNumber: "+15550001234", // or TWILIO_FROM_NUMBER for Twilio
          toNumber: "+15550005678",
          sessionScope: "per-phone", // per-phone | per-call
          numbers: {
            "+15550009999": {
              inboundGreeting: "Silver Fox Cards, how can I help?",
              responseSystemPrompt: "You are a concise baseball card specialist.",
              tts: {
                providers: {
                  openai: { voice: "alloy" },
                },
              },
            },
          },

          twilio: {
            accountSid: "ACxxxxxxxx",
            authToken: "...",
          },
          telnyx: {
            apiKey: "...",
            connectionId: "...",
            // Telnyx webhook public key from the Mission Control Portal
            // (Base64; can also be set via TELNYX_PUBLIC_KEY).
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
          // tailscale: { mode: "funnel", path: "/voice/webhook" },

          outbound: {
            defaultMode: "notify", // notify | conversation
          },

          streaming: { enabled: true /* see Streaming transcription */ },
          realtime: { enabled: false /* see Realtime voice */ },
        },
      },
    },
  },
}
```

<AccordionGroup>
  <Accordion title="Provider exposure and security notes">
    - Twilio、Telnyx 和 Plivo 都需要一個 **公開可達** 的 webhook URL。
    - `mock` 是一個本地開發提供者（無網路呼叫）。
    - 除非 `skipSignatureVerification` 為真，否則 Telnyx 需要 `telnyx.publicKey`（或 `TELNYX_PUBLIC_KEY`）。
    - `skipSignatureVerification` 僅供本地測試使用。
    - 在 ngrok 免費層上，將 `publicUrl` 設定為確切的 ngrok URL；簽章驗證總是會被強制執行。
    - `tunnel.allowNgrokFreeTierLoopbackBypass: true` 僅在 `tunnel.provider="ngrok"` 且 `serve.bind` 為 loopback（ngrok 本地代理）時，才允許具有無效簽章的 Twilio webhook。僅限本地開發。
    - Ngrok 免費層 URL 可能會變更或加入插頁式行為；如果 `publicUrl` 偏離，Twilio 簽章將會失敗。正式環境：建議使用穩定的網域或 Tailscale funnel。

  </Accordion>
  <Accordion title="串流連線限制">
    - `streaming.preStartTimeoutMs` 會關閉從未傳送有效 `start` frame 的 socket。
    - `streaming.maxPendingConnections` 限制未認證的啟動前 socket 總數。
    - `streaming.maxPendingConnectionsPerIp` 限制每個來源 IP 的未認證啟動前 socket 數量。
    - `streaming.maxConnections` 限制開放的媒體串流 socket 總數（處理中 + 作用中）。

  </Accordion>
  <Accordion title="舊版設定遷移">
    使用 `provider: "log"`、`twilio.from` 或舊版
    `streaming.*` OpenAI 金鑰的舊設定會由 `openclaw doctor --fix` 重寫。
    執行時期回退目前仍接受舊的 voice-call 金鑰，但
    重寫路徑為 `openclaw doctor --fix` 且相容性 shim 是
    暫時的。

    自動遷移的串流金鑰：

    - `streaming.sttProvider` → `streaming.provider`
    - `streaming.openaiApiKey` → `streaming.providers.openai.apiKey`
    - `streaming.sttModel` → `streaming.providers.openai.model`
    - `streaming.silenceDurationMs` → `streaming.providers.openai.silenceDurationMs`
    - `streaming.vadThreshold` → `streaming.providers.openai.vadThreshold`

  </Accordion>
</AccordionGroup>

## Session 範圍

預設情況下，語音通話使用 `sessionScope: "per-phone"`，因此來自同一呼叫者的重複通話會保留對話記憶。當
每次電信通話應以全新語境開始時，請設定 `sessionScope: "per-call"`，例如前台、
預約、IVR，或 Google Meet 橋接流程，其中相同的電話號碼可能
代表不同的會議。

## 即時語音對話

`realtime` 選擇一個全雙工即時語音提供者用於即時通話
音訊。它與 `streaming` 分開，後者僅將音訊轉發至
即時轉錄提供者。

<Warning>`realtime.enabled` 不能與 `streaming.enabled` 結合使用。每次通話請選擇一種 音訊模式。</Warning>

目前的執行時期行為：

- Twilio Media Streams 支援 `realtime.enabled`。
- `realtime.provider` 是可選的。如果未設定，Voice Call 將使用第一個已註冊的即時語音提供商。
- 內建的即時語音提供商：Google Gemini Live (`google`) 和 OpenAI (`openai`)，由其提供商外掛程式註冊。
- 提供商擁有的原始設定位於 `realtime.providers.<providerId>` 之下。
- Voice Call 預設會公開共用的 `openclaw_agent_consult` 即時工具。當來電者要求更深入的推理、目前資訊或一般 OpenClaw 工具時，即時模型可以呼叫它。
- `realtime.consultPolicy` 可選地針對即時模型何時應該呼叫 `openclaw_agent_consult` 新增指引。
- `realtime.agentContext.enabled` 預設為關閉。啟用後，Voice Call 會在設定階段將受限的代理程式身分、系統提示詞覆寫和選定的工作區檔案膠囊注入即時提供商的指示中。
- `realtime.fastContext.enabled` 預設為關閉。啟用後，Voice Call 會先搜尋索引記憶體/會話內容中的諮詢問題，並將這些摘要傳回給 `realtime.fastContext.timeoutMs` 內的即時模型，然後僅當 `realtime.fastContext.fallbackToConsult` 為 true 時才回退到完整的諮詢代理程式。
- 如果 `realtime.provider` 指向未註冊的提供商，或者根本沒有註冊任何即時語音提供商，Voice Call 會記錄警告並跳過即時媒體，而不是讓整個外掛程式失敗。
- 諮詢會話金鑰會在可用時重複使用儲存的通話會話，然後回退到設定的 `sessionScope` (預設為 `per-phone`，或對於隔離通話則為 `per-call`)。

### 工具政策

`realtime.toolPolicy` 控制諮詢執行：

| 政策             | 行為                                                                                                                |
| ---------------- | ------------------------------------------------------------------------------------------------------------------- |
| `safe-read-only` | 公開諮詢工具並將一般代理程式限制為 `read`、`web_search`、`web_fetch`、`x_search`、`memory_search` 和 `memory_get`。 |
| `owner`          | 公開諮詢工具並讓一般代理程式使用一般代理程式工具政策。                                                              |
| `none`           | 不要公開 consult 工具。自訂的 `realtime.tools` 仍然會傳遞給即時提供者。                                             |

`realtime.consultPolicy` 僅控制即時模型指令：

| 原則          | 指引                                                             |
| ------------- | ---------------------------------------------------------------- |
| `auto`        | 保留預設提示，讓提供者決定何時呼叫 consult 工具。                |
| `substantive` | 直接回答簡單的對話內容，並在事實、記憶、工具或語境之前進行諮詢。 |
| `always`      | 在每個實質性回答之前進行諮詢。                                   |

### Agent 語音語境

當語音橋接器應該聽起來像已配置的 OpenClaw agent，而不希望在普通輪次中付出完整的 agent-consult 來回行程時，請啟用 `realtime.agentContext`。語境膠囊會在建立即時工作階段時加入一次，因此不會增加每輪次的延遲。對於 `openclaw_agent_consult` 的呼叫仍然會執行完整的 OpenClaw agent，並應用於工具工作、目前資訊、記憶查詢或工作區狀態。

```json5
{
  plugins: {
    entries: {
      "voice-call": {
        config: {
          agentId: "main",
          realtime: {
            enabled: true,
            provider: "google",
            toolPolicy: "safe-read-only",
            consultPolicy: "substantive",
            agentContext: {
              enabled: true,
              maxChars: 6000,
              includeIdentity: true,
              includeSystemPrompt: true,
              includeWorkspaceFiles: true,
              files: ["SOUL.md", "IDENTITY.md", "USER.md"],
            },
          },
        },
      },
    },
  },
}
```

### 即時提供者範例

<Tabs>
  <Tab title="Google Gemini Live">
    預設值：來自 `realtime.providers.google.apiKey`、
    `GEMINI_API_KEY` 或 `GOOGLE_GENERATIVE_AI_API_KEY` 的 API 金鑰；
    模型 `gemini-2.5-flash-native-audio-preview-12-2025`；語音 `Kore`。
    `sessionResumption` 和 `contextWindowCompression` 預設為開啟，以支援更長、
    可重新連線的通話。使用 `silenceDurationMs`、`startSensitivity` 和
    `endSensitivity` 來調整電話音訊上的更快速輪替。

    ```json5
    {
      plugins: {
        entries: {
          "voice-call": {
            config: {
              provider: "twilio",
              inboundPolicy: "allowlist",
              allowFrom: ["+15550005678"],
              realtime: {
                enabled: true,
                provider: "google",
                instructions: "Speak briefly. Call openclaw_agent_consult before using deeper tools.",
                toolPolicy: "safe-read-only",
                consultPolicy: "substantive",
                consultThinkingLevel: "low",
                consultFastMode: true,
                agentContext: { enabled: true },
                providers: {
                  google: {
                    apiKey: "${GEMINI_API_KEY}",
                    model: "gemini-2.5-flash-native-audio-preview-12-2025",
                    voice: "Kore",
                    silenceDurationMs: 500,
                    startSensitivity: "high",
                  },
                },
              },
            },
          },
        },
      },
    }
    ```

  </Tab>
  <Tab title="OpenAI">
    ```json5
    {
      plugins: {
        entries: {
          "voice-call": {
            config: {
              realtime: {
                enabled: true,
                provider: "openai",
                providers: {
                  openai: { apiKey: "${OPENAI_API_KEY}" },
                },
              },
            },
          },
        },
      },
    }
    ```
  </Tab>
</Tabs>

請參閱 [Google 提供者](/zh-Hant/providers/google) 和
[OpenAI 提供者](/zh-Hant/providers/openai) 以了解提供者特定的即時語音選項。

## 串流轉錄

`streaming` 選擇即時轉錄提供者以處理即時通話音訊。

目前的執行時期行為：

- `streaming.provider` 為選用。若未設定，語音通話將使用第一個已註冊的即時轉錄提供者。
- 內建的即時語音轉文字提供者：Deepgram (`deepgram`)、ElevenLabs (`elevenlabs`)、Mistral (`mistral`)、OpenAI (`openai`) 與 xAI (`xai`)，由其提供者外掛註冊。
- 提供者擁有的原始設定位於 `streaming.providers.<providerId>` 之下。
- 在 Twilio 發送接受的串流 `start` 訊息後，語音通話會立即註冊該串流，在提供者連線時透過語音轉文字提供者將傳入媒體加入佇列，並且僅在即時語音轉文字準備就緒後才開始初始問候。
- 如果 `streaming.provider` 指向未註冊的提供者，或未註冊任何提供者，語音通話會記錄警告並跳過媒體串流，而不是讓整個外掛失敗。

### 串流提供者範例

<Tabs>
  <Tab title="OpenAI">
    預設值：API 金鑰 `streaming.providers.openai.apiKey` 或
    `OPENAI_API_KEY`；模型 `gpt-4o-transcribe`；`silenceDurationMs: 800`；
    `vadThreshold: 0.5`。

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

  </Tab>
  <Tab title="xAI">
    預設值：API 金鑰 `streaming.providers.xai.apiKey` 或 `XAI_API_KEY`；
    端點 `wss://api.x.ai/v1/stt`；編碼 `mulaw`；取樣率 `8000`；
    `endpointingMs: 800`；`interimResults: true`。

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

  </Tab>
</Tabs>

## 通話的語音合成

語音通話使用核心 `messages.tts` 設定來進行通話上的串流語音。
您可以在外掛設定下使用**相同的結構**來覆寫它 —
它會與 `messages.tts` 進行深度合併。

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

<Warning>**語音通話會忽略 Microsoft 語音。** 電信音訊需要 PCM； 目前的 Microsoft 傳輸並未公開電信 PCM 輸出。</Warning>

行為說明：

- 外掛程式組態中的舊版 `tts.<provider>` 金鑰 (`openai`, `elevenlabs`, `microsoft`, `edge`) 會由 `openclaw doctor --fix` 修復；已提交的組態應使用 `tts.providers.<provider>`。
- 啟用 Twilio 媒體串流時會使用 Core TTS；否則通話會回退到提供者原生的語音。
- 如果 Twilio 媒體串流已處於啟用狀態，Voice Call 將不會回退到 TwiML `<Say>`。如果在該狀態下無法使用電話語音 TTS，播放請求將會失敗，而不會混合兩個播放路徑。
- 當電話語音 TTS 回退到次要提供者時，Voice Call 會記錄包含提供者鏈 (`from`, `to`, `attempts`) 的警告以便除錯。
- 當 Twilio 插話或串流中斷清除待處理的 TTS 佇列時，佇列中的播放請求會被結算，而不是讓來電者等待播放完成而掛斷。

### TTS 範例

<Tabs>
  <Tab title="僅限 Core TTS">
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
  </Tab>
  <Tab title="覆寫為 ElevenLabs (僅限通話)">
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
  </Tab>
  <Tab title="OpenAI 模型覆寫 (深度合併)">
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
  </Tab>
</Tabs>

## 來電

來電原則預設為 `disabled`。若要啟用來電，請設定：

```json5
{
  inboundPolicy: "allowlist",
  allowFrom: ["+15550001234"],
  inboundGreeting: "Hello! How can I help?",
}
```

<Warning>`inboundPolicy: "allowlist"` 是低保驗的來電顯示篩選器。 外掛程式會將提供者提供的 `From` 值標準化，並與 `allowFrom` 進行比較。Webhook 驗證會驗證提供者的傳送和 負載完整性，但它**不**能證明 PSTN/VoIP 來電號碼 的所有權。請將 `allowFrom` 視為來電顯示過濾，而非強有力的來電者 身份驗證。</Warning>

自動回應使用代理程式系統。可使用 `responseModel`、
`responseSystemPrompt` 和 `responseTimeoutMs` 進行調整。

### 逐號路由

當一個通話外掛接收多個電話號碼的來電，且每個號碼應表現得像不同的線路時，請使用 `numbers`。例如，一個號碼可以使用休閒的個人助理，而另一個則使用商務角色、不同的回應代理以及不同的 TTS 語音。

路由是根據提供商提供的撥號 `To` 號碼進行選擇的。金鑰必須是 E.164 號碼。當來電到達時，Voice Call 會解析一次匹配的路由，將匹配的路由存儲在通話記錄上，並對問候語、經典自動回應路徑、即時諮詢路徑和 TTS 播放重用該有效配置。如果沒有路由匹配，則使用全域 Voice Call 配置。撥出電話不使用 `numbers`；發起通話時請明確傳遞撥出目標、訊息和會話。

路由覆寫目前支援：

- `inboundGreeting`
- `tts`
- `agentId`
- `responseModel`
- `responseSystemPrompt`
- `responseTimeoutMs`

`tts` 路由值會與全域 Voice Call `tts` 配置進行深度合併，因此您通常只需要覆寫提供商語音：

```json5
{
  inboundGreeting: "Hello from the main line.",
  responseSystemPrompt: "You are the default voice assistant.",
  tts: {
    provider: "openai",
    providers: {
      openai: { voice: "coral" },
    },
  },
  numbers: {
    "+15550001111": {
      inboundGreeting: "Silver Fox Cards, how can I help?",
      responseSystemPrompt: "You are a concise baseball card specialist.",
      tts: {
        providers: {
          openai: { voice: "alloy" },
        },
      },
    },
  },
}
```

### 口語輸出合約

對於自動回應，Voice Call 會在系統提示詞中附加一個嚴格的口語輸出合約：

```text
{"spoken":"..."}
```

Voice Call 會謹慎地提取語音文本：

- 忽略標記為推理/錯誤內容的 payloads。
- 解析直接 JSON、圍籬 JSON 或內聯 `"spoken"` 鍵。
- 回退到純文本，並移除可能的規劃/元數據引導段落。

這確保口語播放專注於面向來電者的文本，並避免將規劃文本洩漏到音訊中。

### 對話啟動行為

對於撥出 `conversation` 通話，首則訊息處理與即時播放狀態綁定：

- 僅在初始問候語正在主動播放時，才會抑制插隊佇列清除和自動回應。
- 如果初始播放失敗，通話將返回 `listening`，並且初始訊息保持排隊狀態以進行重試。
- Twilio 串流的初始播放會在串流連接時立即開始，沒有額外延遲。
- 插話會中止當前的播放並清除已排隊但尚未播放的 Twilio TTS 項目。被清除的項目會被解析為已跳過，因此後續的回應邏輯可以繼續執行，而無需等待永遠不會播放的音訊。
- 即時語音對話使用即時串流自己的開啟輪次。Voice Call **不會**針對該初始訊息發送舊版 `<Say>` TwiML 更新，因此輸出 `<Connect><Stream>` 會話會保持連接。

### Twilio 串流中斷寬限期

當 Twilio 媒體串流中斷時，Voice Call 會等待 **2000 毫秒** 然後
自動結束通話：

- 如果在該時間範圍內串流重新連線，則會取消自動結束。
- 如果在寬限期後沒有串流重新註冊，通話將會被結束以防止卡住的活躍通話。

## 過期通話清理器

使用 `staleCallReaperSeconds` 來結束從未收到終止 webhook
的通話（例如，從未完成的通知模式通話）。預設值為
`0`（已停用）。

建議範圍：

- **正式環境：** 通知類型流程為 `120`–`300` 秒。
- 請將此數值保持在 **高於 `maxDurationSeconds`**，以便正常通話能夠完成。一個不錯的起始點是 `maxDurationSeconds + 30–60` 秒。

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

當 Proxy 或通道位於 Gateway 前方時，外掛程式
會重建用於簽章驗證的公開 URL。這些選項
控制信任哪些轉發標頭：

<ParamField path="webhookSecurity.allowedHosts" type="string[]">
  從轉發標頭中將主機加入允許清單。
</ParamField>
<ParamField path="webhookSecurity.trustForwardingHeaders" type="boolean">
  在沒有允許清單的情況下信任轉發標頭。
</ParamField>
<ParamField path="webhookSecurity.trustedProxyIPs" type="string[]">
  僅在請求的遠端 IP 符合清單時信任轉發標頭。
</ParamField>

額外保護措施：

- 已針對 Twilio 和 Plivo 啟用 Webhook **重放保護**。重放的有效 webhook 請求會被確認，但會跳過其副作用。
- Twilio 對話輪次在 `<Gather>` 回呼中包含一個每輪次專屬的權杖，因此過期/重放的語音回呼無法滿足較新的待處理轉錄輪次。
- 當缺少提供者所需的標頭時，未經驗證的 webhook 請求會在讀取主體之前被拒絕。
- 語音通話 webhook 使用共享的預先驗證主體設定檔（64 KB / 5 秒），以及在簽章驗證之前的每個 IP 進行中請求上限。

穩定公開主機的範例：

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

## CLI

```bash
openclaw voicecall call --to "+15555550123" --message "Hello from OpenClaw"
openclaw voicecall start --to "+15555550123"   # alias for call
openclaw voicecall continue --call-id <id> --message "Any questions?"
openclaw voicecall speak --call-id <id> --message "One moment"
openclaw voicecall dtmf --call-id <id> --digits "ww123456#"
openclaw voicecall end --call-id <id>
openclaw voicecall status --call-id <id>
openclaw voicecall tail
openclaw voicecall latency                      # summarize turn latency from logs
openclaw voicecall expose --mode funnel
```

當 Gateway 已在執行時，操作 `voicecall` 指令會委派給 Gateway 擁有的 voice-call 執行時期，因此 CLI 不會綁定第二個 webhook 伺服器。如果無法連線到 Gateway，這些指令會回退到獨立的 CLI 執行時期。

`latency` 從預設的 voice-call 儲存路徑讀取 `calls.jsonl`。使用 `--file <path>` 指向不同的日誌，並使用 `--last <n>` 將分析限制在最後 N 筆記錄（預設為 200）。輸出包含輪詢延遲和聆聽等待時間的 p50/p90/p99。

## Agent 工具

工具名稱：`voice_call`。

| Action          | Args                                       |
| --------------- | ------------------------------------------ |
| `initiate_call` | `message`, `to?`, `mode?`, `dtmfSequence?` |
| `continue_call` | `callId`, `message`                        |
| `speak_to_user` | `callId`, `message`                        |
| `send_dtmf`     | `callId`, `digits`                         |
| `end_call`      | `callId`                                   |
| `get_status`    | `callId`                                   |

此儲存庫在 `skills/voice-call/SKILL.md` 提供了相應的技能文件。

## Gateway RPC

| Method               | Args                                       |
| -------------------- | ------------------------------------------ |
| `voicecall.initiate` | `to?`, `message`, `mode?`, `dtmfSequence?` |
| `voicecall.continue` | `callId`, `message`                        |
| `voicecall.speak`    | `callId`, `message`                        |
| `voicecall.dtmf`     | `callId`, `digits`                         |
| `voicecall.end`      | `callId`                                   |
| `voicecall.status`   | `callId`                                   |

`dtmfSequence` 僅對 `mode: "conversation"` 有效。如果通知模式呼叫需要在通話建立後獲得連線後的數位，應該在通話存在後使用 `voicecall.dtmf`。

## 疑難排解

### 設置失敗：Webhook 暴露問題

請從執行 Gateway 的相同環境執行設置：

```bash
openclaw voicecall setup
openclaw voicecall setup --json
```

對於 `twilio`、`telnyx` 和 `plivo`，`webhook-exposure` 必須顯示為綠色。即使已配置 `publicUrl`，如果它指向本地或私有網路空間，仍然會失敗，因為電信運營商無法回撥到這些位址。請勿將 `localhost`、`127.0.0.1`、`0.0.0.0`、`10.x`、`172.16.x`-`172.31.x`、`192.168.x`、`169.254.x`、`fc00::/7` 或 `fd00::/8` 作為 `publicUrl`。

Twilio 通知模式的撥出電話會直接在建立呼叫請求中發送其初始的 `<Say>` TwiML，因此第一句口語訊息不依賴於 Twilio 獲取 webhook TwiML。但對於狀態回調、對話呼叫、連線前 DTMF、即時串流和連線後通話控制，仍然需要公開的 webhook。

使用一個公開暴露路徑：

```json5
{
  plugins: {
    entries: {
      "voice-call": {
        config: {
          publicUrl: "https://voice.example.com/voice/webhook",
          // or
          tunnel: { provider: "ngrok" },
          // or
          tailscale: { mode: "funnel", path: "/voice/webhook" },
        },
      },
    },
  },
}
```

變更配置後，請重新啟動或重新載入 Gateway，然後執行：

```bash
openclaw voicecall setup
openclaw voicecall smoke
```

除非您傳遞 `--yes`，否則 `voicecall smoke` 只是試運行。

### 提供者憑證失敗

請檢查選定的提供者和所需的憑證欄位：

- Twilio：`twilio.accountSid`、`twilio.authToken` 和 `fromNumber`，或者
  `TWILIO_ACCOUNT_SID`、`TWILIO_AUTH_TOKEN` 和 `TWILIO_FROM_NUMBER`。
- Telnyx：`telnyx.apiKey`、`telnyx.connectionId`、`telnyx.publicKey` 和
  `fromNumber`。
- Plivo：`plivo.authId`、`plivo.authToken` 和 `fromNumber`。

認證資訊必須存在於 Gateway 主機上。編輯本機 shell 設定檔不會影響已經在執行的 Gateway，直到它重新啟動或重新載入其環境。

### 通話已開始，但提供者的 webhook 未到達

請確認提供者控制台指向確切的公開 webhook URL：

```text
https://voice.example.com/voice/webhook
```

然後檢查執行時狀態：

```bash
openclaw voicecall status --call-id <id>
openclaw voicecall tail
openclaw logs --follow
```

常見原因：

- `publicUrl` 指向的路徑與 `serve.path` 不同。
- Gateway 啟動後，通道 URL 發生了變更。
- 代理轉發了請求，但剝除或重寫了 host/proto 標頭。
- 防火牆或 DNS 將公開主機名路由到 Gateway 以外的位置。
- Gateway 重新啟動時未啟用 Voice Call 外掛。

當反向代理或通道位於 Gateway 前方時，請將 `webhookSecurity.allowedHosts` 設定為公開主機名，或者對已知的代理位址使用 `webhookSecurity.trustedProxyIPs`。僅當代理邊界在您的控制之下時才使用 `webhookSecurity.trustForwardingHeaders`。

### 簽章驗證失敗

提供者簽章是根據 OpenClaw 從傳入請求重建的公開 URL 進行檢查的。如果簽章失敗：

- 請確認提供者 webhook URL 與 `publicUrl` 完全匹配，包括協定、主機和路徑。
- 對於 ngrok 免費層級 URL，當通道主機名變更時請更新 `publicUrl`。
- 請確保代理保留了原始的 host 和 proto 標頭，或配置 `webhookSecurity.allowedHosts`。
- 請勿在本地測試之外啟用 `skipSignatureVerification`。

### Google Meet Twilio 加入失敗

Google Meet 使用此外掛進行 Twilio 撥入加入。首先驗證 Voice Call：

```bash
openclaw voicecall setup
openclaw voicecall smoke --to "+15555550123"
```

然後明確驗證 Google Meet 傳輸：

```bash
openclaw googlemeet setup --transport twilio
```

如果 Voice Call 顯示正常但 Meet 參與者從未加入，請檢查 Meet 撥入號碼、PIN 和 `--dtmf-sequence`。即使電話通話正常，會議也可能拒絕或忽略錯誤的 DTMF 序列。

Google Meet 透過 `voicecall.start` 與預先連接的 DTMF 序列啟動 Twilio 通話分支。源自 PIN 的序列包含 Google Meet 外掛程式的 `voiceCall.dtmfDelayMs`，作為前導的 Twilio 等待數字。預設值為 12 秒，因為 Meet 撥入提示可能會晚到。在請求介紹問候語之前，Voice Call 會重新導向回到即時處理。

使用 `openclaw logs --follow` 查看即時階段的追蹤記錄。正常的 Twilio Meet 加入會依照此順序記錄：

- Google Meet 將 Twilio 加入委派給 Voice Call。
- Voice Call 儲存預先連接的 DTMF TwiML。
- Twilio 初始 TwiML 在即時處理之前被消耗並提供服務。
- Voice Call 為 Twilio 通話提供即時 TwiML。
- Google Meet 在 DTMF 後的延遲之後，使用 `voicecall.speak` 請求介紹語音。

`openclaw voicecall tail` 仍顯示持續存在的通話記錄；它對於通話狀態和文字記錄很有用，但並非每個 webhook/即時轉換都會出現在那裡。

### 即時通話沒有語音

請確認只啟用了一種音訊模式。`realtime.enabled` 和 `streaming.enabled` 不能同時為 true。

對於即時 Twilio 通話，還要驗證：

- 即時提供者外掛程式已載入並註冊。
- `realtime.provider` 未設定，或指定了已註冊的提供者。
- 提供者 API 金鑰可供 Gateway 處理程序使用。
- `openclaw logs --follow` 顯示已提供即時 TwiML、已啟動即時橋接器，以及已將初始問候語加入佇列。

## 相關

- [通話模式](/zh-Hant/nodes/talk)
- [文字轉語音](/zh-Hant/tools/tts)
- [語音喚醒](/zh-Hant/nodes/voicewake)
