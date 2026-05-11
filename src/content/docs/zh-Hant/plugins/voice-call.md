---
summary: "透過 Twilio、Telnyx 或 Plivo 撥打及接聽語音通話，並可選用即時語音與串流轉錄"
read_when:
  - You want to place an outbound voice call from OpenClaw
  - You are configuring or developing the voice-call plugin
  - You need realtime voice or streaming transcription on telephony
title: "語音通話外掛程式"
sidebarTitle: "語音通話"
---

透過外掛程式為 OpenClaw 提供語音通話功能。支援外撥通知、多輪對話、全雙工即時語音、串流轉錄，以及具許可清單政策的來電。

**目前供應商：** `twilio` (Programmable Voice + Media Streams)、
`telnyx` (Call Control v2)、 `plivo` (Voice API + XML transfer + GetInput
speech)、 `mock` (dev/no network)。

<Note>語音通話外掛程式執行於 **閘道程序內部**。如果您使用遠端閘道，請在執行閘道的機器上安裝並設定外掛程式，然後重新啟動閘道以載入它。</Note>

## 快速入門

<Steps>
  <Step title="安裝外掛程式">
    <Tabs>
      <Tab title="從 npm 安裝（推薦）">
        ```bash
        openclaw plugins install @openclaw/voice-call
        ```
      </Tab>
      <Tab title="從本機資料夾安裝（開發用）">
        ```bash
        PLUGIN_SRC=./path/to/local/voice-call-plugin
        openclaw plugins install "$PLUGIN_SRC"
        cd "$PLUGIN_SRC" && pnpm install
        ```
      </Tab>
    </Tabs>

    之後重新啟動閘道以載入外掛程式。

  </Step>
  <Step title="設定供應商與 Webhook">
    在 `plugins.entries.voice-call.config` 下設定選項（完整結構請參閱下方的
    [Configuration](#configuration))。最低需求：
    `provider`、供應商憑證、 `fromNumber`，以及一個公開可存取的 webhook URL。
  </Step>
  <Step title="驗證設定">
    ```bash
    openclaw voicecall setup
    ```

    預設輸出內容可在聊天紀錄與終端機中閱讀。它會檢查
    外掛程式是否已啟用、供應商憑證、webhook 是否已公開，以及
    是否只有一種音訊模式（`streaming` 或 `realtime`）正在作用。請使用
    `--json` 以供腳本使用。

  </Step>
  <Step title="Smoke test">
    ```bash
    openclaw voicecall smoke
    openclaw voicecall smoke --to "+15555550123"
    ```

    兩者預設都是試運行。新增 `--yes` 以實際進行簡短的
    外撥通知呼叫：

    ```bash
    openclaw voicecall smoke --to "+15555550123" --yes
    ```

  </Step>
</Steps>

<Warning>對於 Twilio、Telnyx 和 Plivo，設定必須解析為 **公開的 webhook URL**。 如果 `publicUrl`、tunnel URL、Tailscale URL 或服務備用解析為 loopback 或私人網路空間，設定將會失敗，而不是啟動一個無法接收電信商 webhook 的提供者。</Warning>

## 設定

如果 `enabled: true` 但選定的提供者缺少憑證，
Gateway 啟動時會記錄設定未完成的警告，其中包含缺失的金鑰，並跳過
啟動執行時。使用時，指令、RPC 呼叫和代理工具仍會回傳確切的
遺失提供者設定。

<Note>語音呼叫憑證接受 SecretRefs。`plugins.entries.voice-call.config.twilio.authToken` 和 `plugins.entries.voice-call.config.tts.providers.*.apiKey` 透過標準 SecretRef 介面解析；請參閱 [SecretRef credential surface](/zh-Hant/reference/secretref-credential-surface)。</Note>

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
    - Twilio、Telnyx 和 Plivo 都需要 **公開可存取** 的 webhook URL。
    - `mock` 是本機開發提供者（無網路呼叫）。
    - 除非 `skipSignatureVerification` 為 true，否則 Telnyx 需要 `telnyx.publicKey`（或 `TELNYX_PUBLIC_KEY`）。
    - `skipSignatureVerification` 僅供本機測試使用。
    - 在 ngrok 免費層上，將 `publicUrl` 設定為確切的 ngrok URL；簽章驗證始終會強制執行。
    - `tunnel.allowNgrokFreeTierLoopbackBypass: true` 僅在 `tunnel.provider="ngrok"` 且 `serve.bind` 為 loopback（ngrok local agent）時，允許具有無效簽章的 Twilio webhook **僅** 用於本機開發。
    - Ngrok 免費層 URL 可能會變更或加入插頁式行為；如果 `publicUrl` 偏移，Twilio 簽章將會失敗。正式環境：建議使用穩定的網域或 Tailscale funnel。
  </Accordion>
  <Accordion title="串流連線限制">
    - `streaming.preStartTimeoutMs` 會關閉從未發送有效 `start` 幀的 socket。
    - `streaming.maxPendingConnections` 限制未驗證的啟動前 socket 總數。
    - `streaming.maxPendingConnectionsPerIp` 限制每個來源 IP 的未驗證啟動前 socket 數量。
    - `streaming.maxConnections` 限制開放式媒體串流 socket 的總數（待處理 + 活躍）。
  </Accordion>
  <Accordion title="舊版配置遷移">
    使用 `provider: "log"`、`twilio.from` 或舊版
    `streaming.*` OpenAI 金鑰的舊配置會由 `openclaw doctor --fix` 重寫。
    執行階段回退目前仍接受舊的 voice-call 金鑰，但
    重寫路徑為 `openclaw doctor --fix`，且相容性層是
    暫時的。

    自動遷移的串流金鑰：

    - `streaming.sttProvider` → `streaming.provider`
    - `streaming.openaiApiKey` → `streaming.providers.openai.apiKey`
    - `streaming.sttModel` → `streaming.providers.openai.model`
    - `streaming.silenceDurationMs` → `streaming.providers.openai.silenceDurationMs`
    - `streaming.vadThreshold` → `streaming.providers.openai.vadThreshold`

  </Accordion>
</AccordionGroup>

## 即時語音通話

`realtime` 選擇一個全雙工即時語音提供商，用於即時通話
音訊。它與 `streaming` 是分開的，後者僅將音訊轉發至
即時轉錄提供商。

<Warning>`realtime.enabled` 不能與 `streaming.enabled` 結合使用。每次通話選擇一種 音訊模式。</Warning>

目前的執行階段行為：

- Twilio Media Streams 支援 `realtime.enabled`。
- `realtime.provider` 是選填的。若未設定，Voice Call 將使用第一個註冊的即時語音提供商。
- 內建的即時語音提供商：Google Gemini Live (`google`) 和 OpenAI (`openai`)，由其提供商插件註冊。
- 提供商擁有的原始配置位於 `realtime.providers.<providerId>` 之下。
- Voice Call 預設會公開共享的 `openclaw_agent_consult` 即時工具。當來電者要求更深層的推理、最新資訊或一般的 OpenClaw 工具時，即時模型可以呼叫此工具。
- 如果 `realtime.provider` 指向未註冊的供應商，或者根本未註冊任何即時語音供應商，Voice Call 會記錄警告並跳過即時媒體，而不是讓整個外掛失敗。
- 諮詢會話金鑰會在可用時重複使用現有的語音會話，然後回退到來電者/受話者的電話號碼，以便後續的諮詢電話在通話期間保持上下文。

### 工具政策

`realtime.toolPolicy` 控制諮詢執行：

| 政策             | 行為                                                                                                            |
| ---------------- | --------------------------------------------------------------------------------------------------------------- |
| `safe-read-only` | 公開諮詢工具並將一般代理限制為 `read`、`web_search`、`web_fetch`、`x_search`、`memory_search` 和 `memory_get`。 |
| `owner`          | 公開諮詢工具並讓一般代理使用正常的代理工具政策。                                                                |
| `none`           | 不要公開諮詢工具。自訂的 `realtime.tools` 仍會傳遞給即時供應商。                                                |

### 即時供應商範例

<Tabs>
  <Tab title="Google Gemini Live">
    預設值：來自 `realtime.providers.google.apiKey`、
    `GEMINI_API_KEY` 或 `GOOGLE_GENERATIVE_AI_API_KEY` 的 API 金鑰；
    模型 `gemini-2.5-flash-native-audio-preview-12-2025`；語音 `Kore`。

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
                providers: {
                  google: {
                    apiKey: "${GEMINI_API_KEY}",
                    model: "gemini-2.5-flash-native-audio-preview-12-2025",
                    voice: "Kore",
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

請參閱 [Google 供應商](/zh-Hant/providers/google) 和
[OpenAI 供應商](/zh-Hant/providers/openai) 以了解供應商特定的即時語音選項。

## 串流轉錄

`streaming` 選擇即時轉錄供應商以用於即時通話音訊。

目前的執行時行為：

- `streaming.provider` 是選用的。如果未設定，Voice Call 將使用第一個已註冊的即時轉錄供應商。
- 內建的即時轉錄提供者：Deepgram (`deepgram`)、ElevenLabs (`elevenlabs`)、Mistral (`mistral`)、OpenAI (`openai`) 和 xAI (`xai`)，由其提供者外掛註冊。
- 提供者擁有的原始設定位於 `streaming.providers.<providerId>` 之下。
- 如果 `streaming.provider` 指向未註冊的提供者，或者未註冊任何提供者，語音通話會記錄警告並跳過媒體串流，而不是導致整個外掛失敗。

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
    端點 `wss://api.x.ai/v1/stt`；編碼 `mulaw`；採樣率 `8000`；
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

## 通話的 TTS

語音通話使用核心 `messages.tts` 設定來進行通話中的語音串流。
您可以在外掛設定下使用**相同的結構**來覆寫它 — 它會與 `messages.tts` 進行深度合併。

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

<Warning>**語音通話會忽略 Microsoft 語音。** 電信語音需要 PCM； 目前的 Microsoft 傳輸不會公開電信 PCM 輸出。</Warning>

行為備註：

- 外掛設定內的舊版 `tts.<provider>` 金鑰 (`openai`、`elevenlabs`、`microsoft`、`edge`) 會由 `openclaw doctor --fix` 修復；提交的設定應使用 `tts.providers.<provider>`。
- 啟用 Twilio 媒體串流時會使用核心 TTS；否則通話會回退到提供者原生的語音。
- 如果 Twilio 媒體串流已處於活動狀態，Voice Call 不會回退到 TwiML `<Say>`。如果在該狀態下無法使用電話 TTS，播放請求將會失敗，而不是混合兩個播放路徑。
- 當電話 TTS 回退到次要提供者時，Voice Call 會記錄一條包含提供者鏈（`from`、`to`、`attempts`）的警告以供偵錯。
- 當 Twilio 插話或串流中斷清除待處理的 TTS 佇列時，排隊的播放請求會結算，而不是讓來電者懸空等待播放完成。

### TTS 範例

<Tabs>
  <Tab title="僅核心 TTS">
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
  <Tab title="覆寫為 ElevenLabs（僅限通話）">
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
  <Tab title="OpenAI 模型覆寫（深度合併）">
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

<Warning>`inboundPolicy: "allowlist"` 是低保驗的來電者識別碼篩選器。 此外掛程式會將提供者提供的 `From` 值正規化，並將其與 `allowFrom` 進行比較。Webhook 驗證會驗證提供者的遞送與 負載完整性，但它並**不**證明 PSTN/VoIP 來電者號碼 的所有權。請將 `allowFrom` 視為來電者 ID 篩選，而非強烈的來電者 身分識別。</Warning>

自動回應使用代理系統。請使用 `responseModel`、
`responseSystemPrompt` 和 `responseTimeoutMs` 進行調整。

### 口語輸出合約

對於自動回應，Voice Call 會將嚴格的口語輸出合約附加至
系統提示：

```text
{"spoken":"..."}
```

Voice Call 會謹慎地擷取語音文字：

- 忽略標記為推理/錯誤內容的負載。
- 解析直接 JSON、圍欄 JSON 或內聯 `"spoken"` 金鑰。
- 回退為純文字，並移除可能的規劃/元資料開頭段落。

這可讓口語播放專注於面對來電者的文字，並避免將
規劃文字洩漏到音訊中。

### 對話啟動行為

對於外撥 `conversation` 通話，首則訊息的處理與實時播放狀態綁定：

- 僅在初始問候語正在主動播放時，才會抑制插隊佇列清除和自動回應。
- 如果初始播放失敗，通話會返回 `listening`，並且初始訊息保持佇列狀態以進行重試。
- Twilio 串流的初始播放在串流連接時開始，沒有額外延遲。
- 插隊會中止主動播放並清除已排隊但尚未播放的 Twilio TTS 項目。清除的項目會解析為已跳過，因此後續回應邏輯可以繼續，而無需等待永遠不會播放的音訊。
- 實時語音通話使用實時串流自己的開場輪次。Voice Call **不**會為該初始訊息發布舊式 `<Say>` TwiML 更新，因此外撥 `<Connect><Stream>` 會話保持連接。

### Twilio 串流中斷寬限期

當 Twilio 媒體串流中斷時，Voice Call 會等待 **2000 毫秒** 然後自動結束通話：

- 如果在該時間視窗內串流重新連接，自動結束將被取消。
- 如果在寬限期後沒有串流重新註冊，通話將被結束以防止卡住的活動通話。

## 過期通話收割器

使用 `staleCallReaperSeconds` 結束從未收到終止 webhook 的通話（例如，從未完成的通知模式通話）。預設值為 `0`（已停用）。

建議範圍：

- **生產環境：** 針對通知樣式流程為 `120`–`300` 秒。
- 將此值保持 **高於 `maxDurationSeconds`**，以便正常通話可以完成。一個好的起點是 `maxDurationSeconds + 30–60` 秒。

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

當代理或隧道位於 Gateway 前面時，外掛程式會重建用於簽章驗證的公開 URL。這些選項控制信任哪些轉發標頭：

<ParamField path="webhookSecurity.allowedHosts" type="string[]">
  從轉發標頭中允許的主機清單。
</ParamField>
<ParamField path="webhookSecurity.trustForwardingHeaders" type="boolean">
  在沒有允許清單的情況下信任轉發標頭。
</ParamField>
<ParamField path="webhookSecurity.trustedProxyIPs" type="string[]">
  僅當請求的遠端 IP 符合清單時信任轉發標頭。
</ParamField>

額外保護措施：

- 針對 Twilio 和 Plivo 已啟用 Webhook **重放保護 (replay protection)**。重放的有效 Webhook 請求會被確認，但會跳過副作用。
- Twilio 對話輪次在 `<Gather>` 回調中包含每輪次專屬的 token，因此過時/重放的語音回調無法滿足較新的待處理轉錄輪次。
- 當缺少提供者所需的簽名標頭時，未經驗證的 Webhook 請求會在讀取主體前被拒絕。
- 語音通話 Webhook 使用共享的預先驗證主體設定檔 (64 KB / 5 秒)，並在簽章驗證前加上每個 IP 的進行中請求上限。

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

`latency` 從預設的語音通話儲存路徑讀取 `calls.jsonl`。
使用 `--file <path>` 指向不同的日誌，並使用 `--last <n>` 將
分析限制在最後 N 筆記錄 (預設為 200)。輸出包含輪次延遲和
聆聽等待時間的 p50/p90/p99 數值。

## Agent 工具

工具名稱：`voice_call`。

| 動作            | Args                      |
| --------------- | ------------------------- |
| `initiate_call` | `message`, `to?`, `mode?` |
| `continue_call` | `callId`, `message`       |
| `speak_to_user` | `callId`, `message`       |
| `send_dtmf`     | `callId`, `digits`        |
| `end_call`      | `callId`                  |
| `get_status`    | `callId`                  |

此 repo 附帶了一個匹配的技能文件於 `skills/voice-call/SKILL.md`。

## Gateway RPC

| 方法                 | Args                      |
| -------------------- | ------------------------- |
| `voicecall.initiate` | `to?`，`message`，`mode?` |
| `voicecall.continue` | `callId`，`message`       |
| `voicecall.speak`    | `callId`，`message`       |
| `voicecall.dtmf`     | `callId`，`digits`        |
| `voicecall.end`      | `callId`                  |
| `voicecall.status`   | `callId`                  |

## 相關

- [通話模式](/zh-Hant/nodes/talk)
- [文字轉語音](/zh-Hant/tools/tts)
- [語音喚醒](/zh-Hant/nodes/voicewake)
