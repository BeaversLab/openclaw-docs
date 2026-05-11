---
summary: "通过 Twilio、Telnyx 或 Plivo 拨打和接听语音电话，可选择实时语音和流式转录"
read_when:
  - You want to place an outbound voice call from OpenClaw
  - You are configuring or developing the voice-call plugin
  - You need realtime voice or streaming transcription on telephony
title: "语音通话插件"
sidebarTitle: "语音通话"
---

通过插件为 OpenClaw 提供语音通话功能。支持拨出通知、多轮对话、全双工实时语音、流式转录以及具有允许列表策略的呼入电话。

**当前提供商：** `twilio` (Programmable Voice + Media Streams)，
`telnyx` (Call Control v2)，`plivo` (Voice API + XML transfer + GetInput
speech)，`mock` (dev/no network)。

<Note>语音通话插件运行 **在 Gateway(网关) 进程内部**。如果您使用 远程 Gateway(网关)，请在运行 Gateway(网关) 的机器上安装并配置插件，然后重启 Gateway(网关) 以加载它。</Note>

## 快速开始

<Steps>
  <Step title="安装插件">
    <Tabs>
      <Tab title="从 npm 安装（推荐）">
        ```bash
        openclaw plugins install @openclaw/voice-call
        ```
      </Tab>
      <Tab title="从本地文件夹安装（开发）">
        ```bash
        PLUGIN_SRC=./path/to/local/voice-call-plugin
        openclaw plugins install "$PLUGIN_SRC"
        cd "$PLUGIN_SRC" && pnpm install
        ```
      </Tab>
    </Tabs>

    之后请重启 Gateway(网关) 以加载插件。

  </Step>
  <Step title="配置提供商和 Webhook">
    在 `plugins.entries.voice-call.config` 下设置配置（有关
    完整结构，请参阅下面的 [配置](#configuration)）。至少需要：
    `provider`、提供商凭证、`fromNumber` 以及一个公网
    可访问的 Webhook URL。
  </Step>
  <Step title="验证设置">
    ```bash
    openclaw voicecall setup
    ```

    默认输出在聊天日志和终端中可读。它会检查
    插件是否启用、提供商凭证、Webhook 暴露情况，以及
    是否只有一种音频模式（`streaming` 或 `realtime`）处于活动状态。请使用
    `--json` 用于脚本。

  </Step>
  <Step title="Smoke test">
    ```bash
    openclaw voicecall smoke
    openclaw voicecall smoke --to "+15555550123"
    ```

    两者默认都为试运行。添加 `--yes` 以实际拨打一个简短的
    外拨通知电话：

    ```bash
    openclaw voicecall smoke --to "+15555550123" --yes
    ```

  </Step>
</Steps>

<Warning>对于 Twilio、Telnyx 和 Plivo，设置必须解析为 **public webhook URL（公共 Webhook URL）**。 如果 `publicUrl`、tunnel URL、Tailscale URL 或 serve fallback 解析为 loopback 或专用网络空间，设置将失败，而不是 启动一个无法接收运营商 webhooks 的提供商。</Warning>

## 配置

如果 `enabled: true` 但所选提供商缺少凭据，
Gateway(网关) 启动时会记录一条设置不完整的警告，其中包含缺失的密钥，并
跳过启动运行时。命令、RPC 调用和代理工具在使用时
仍会返回确切的缺失提供商配置。

<Note>Voice call（语音通话）凭据接受 SecretRefs。`plugins.entries.voice-call.config.twilio.authToken` 和 `plugins.entries.voice-call.config.tts.providers.*.apiKey` 通过标准 SecretRef 表面进行解析；请参阅 [SecretRef credential surface](/zh/reference/secretref-credential-surface)。</Note>

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
    - Twilio、Telnyx 和 Plivo 都需要 **publicly reachable（可公开访问）** 的 webhook URL。
    - `mock` 是一个本地开发提供商（不进行网络调用）。
    - 除非 `skipSignatureVerification` 为 true，否则 Telnyx 需要 `telnyx.publicKey`（或 `TELNYX_PUBLIC_KEY`）。
    - `skipSignatureVerification` 仅用于本地测试。
    - 在 ngrok 免费版上，将 `publicUrl` 设置为确切的 ngrok URL；始终强制执行签名验证。
    - 仅当 `tunnel.provider="ngrok"` 且 `serve.bind` 为 loopback（ngrok 本地代理）时，`tunnel.allowNgrokFreeTierLoopbackBypass: true` 才允许签名无效的 Twilio webhooks。仅限本地开发。
    - Ngrok 免费版 URL 可能会更改或添加插页行为；如果 `publicUrl` 发生偏移，Twilio 签名将失败。生产环境：首选稳定域或 Tailscale funnel。
  </Accordion>
  <Accordion title="流式连接限制">
    - `streaming.preStartTimeoutMs` 会关闭从未发送有效 `start` 帧的套接字。
    - `streaming.maxPendingConnections` 限制未经身份验证的预启动套接字总数。
    - `streaming.maxPendingConnectionsPerIp` 限制每个源 IP 未经身份验证的预启动套接字数量。
    - `streaming.maxConnections` 限制打开的媒体流套接字总数（待处理 + 活跃）。
  </Accordion>
  <Accordion title="旧版配置迁移">
    使用 `provider: "log"`、`twilio.from` 或旧版 `streaming.*` OpenAI 密钥的旧配置会被 `openclaw doctor --fix` 重写。
    运行时回退目前仍接受旧的 voice-call 密钥，但重写路径是 `openclaw doctor --fix`，且兼容垫片（compat shim）是临时的。

    自动迁移的流式密钥：

    - `streaming.sttProvider` → `streaming.provider`
    - `streaming.openaiApiKey` → `streaming.providers.openai.apiKey`
    - `streaming.sttModel` → `streaming.providers.openai.model`
    - `streaming.silenceDurationMs` → `streaming.providers.openai.silenceDurationMs`
    - `streaming.vadThreshold` → `streaming.providers.openai.vadThreshold`

  </Accordion>
</AccordionGroup>

## 实时语音通话

`realtime` 为通话音频选择一个全双工实时语音提供商。它与 `streaming` 分开，后者仅将音频转发到实时转录提供商。

<Warning>`realtime.enabled` 不能与 `streaming.enabled` 结合使用。每次通话请选择一种音频模式。</Warning>

当前运行时行为：

- Twilio Media Streams 支持 `realtime.enabled`。
- `realtime.provider` 是可选的。如果未设置，Voice Call 将使用第一个注册的实时语音提供商。
- 内置的实时语音提供商：Google Gemini Live (`google`) 和 OpenAI (`openai`)，由其提供商插件注册。
- 提供商拥有的原始配置位于 `realtime.providers.<providerId>` 下。
- Voice Call 默认公开共享的 `openclaw_agent_consult` 实时工具。当呼叫者要求更深入的推理、当前信息或普通的 OpenClaw 工具时，实时模型可以调用它。
- 如果 `realtime.provider` 指向未注册的提供商，或者根本没有注册实时语音提供商，Voice Call 会记录警告并跳过实时媒体，而不是导致整个插件失败。
- Consult 会话 keys（咨询会话键）在可用时重用现有的语音会话，然后回退到呼叫者/被叫者电话号码，以便后续咨询呼叫在通话期间保持上下文。

### 工具策略

`realtime.toolPolicy` 控制咨询运行：

| 策略             | 行为                                                                                                            |
| ---------------- | --------------------------------------------------------------------------------------------------------------- |
| `safe-read-only` | 公开咨询工具并将普通代理限制为 `read`、`web_search`、`web_fetch`、`x_search`、`memory_search` 和 `memory_get`。 |
| `owner`          | 公开咨询工具并允许普通代理使用普通的代理工具策略。                                                              |
| `none`           | 不公开咨询工具。自定义 `realtime.tools` 仍会传递给实时提供商。                                                  |

### 实时提供商示例

<Tabs>
  <Tab title="Google Gemini Live">
    默认值：来自 `realtime.providers.google.apiKey`、
    `GEMINI_API_KEY` 或 `GOOGLE_GENERATIVE_AI_API_KEY` 的 API 密钥；模型
    `gemini-2.5-flash-native-audio-preview-12-2025`；语音 `Kore`。

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

有关提供商特定的实时语音
选项，请参阅 [Google 提供商](/zh/providers/google) 和
[OpenAI 提供商](/zh/providers/openai)。

## 流式转录

`streaming` 为实时通话音频选择实时转录提供商。

当前的运行时行为：

- `streaming.provider` 是可选的。如果未设置，Voice Call 将使用第一个注册的实时转录提供商。
- 捆绑的实时转录提供商：Deepgram (`deepgram`)、ElevenLabs (`elevenlabs`)、Mistral (`mistral`)、OpenAI (`openai`) 和 xAI (`xai`)，通过其提供商插件注册。
- 提供商拥有的原始配置位于 `streaming.providers.<providerId>` 下。
- 如果 `streaming.provider` 指向未注册的提供商，或者未注册任何提供商，Voice Call 会记录警告并跳过媒体流传输，而不是导致整个插件失败。

### 流式传输提供商示例

<Tabs>
  <Tab title="OpenAI">
    默认值：API 密钥 `streaming.providers.openai.apiKey` 或
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
    默认值：API 密钥 `streaming.providers.xai.apiKey` 或 `XAI_API_KEY`；
    端点 `wss://api.x.ai/v1/stt`；编码 `mulaw`；采样率 `8000`；
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

## 通话 TTS

Voice Call 使用核心 `messages.tts` 配置进行通话中的语音
流式传输。您可以在插件配置下使用
**相同的形状** 覆盖它 —— 它与 `messages.tts` 进行深度合并。

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

<Warning>**Microsoft 语音在语音通话中被忽略。** 电话音频需要 PCM； 当前的 Microsoft 传输不公开电话 PCM 输出。</Warning>

行为说明：

- 插件配置中的旧版 `tts.<provider>` 键 (`openai`、`elevenlabs`、`microsoft`、`edge`) 由 `openclaw doctor --fix` 修复；提交的配置应使用 `tts.providers.<provider>`。
- 启用 Twilio 媒体流传输时会使用核心 TTS；否则通话会回退到提供商原生语音。
- 如果 Twilio 媒体流已处于活动状态，Voice Call 不会回退到 TwiML `<Say>`。如果在该状态下电话 TTS 不可用，播放请求将失败，而不是混合两个播放路径。
- 当电话 TTS 回退到辅助提供商时，Voice Call 会记录一条警告，其中包含提供商链（`from`、`to`、`attempts`）以便进行调试。
- 当 Twilio 打断或流拆解清除待处理的 TTS 队列时，排队的播放请求会结算，而不是让呼叫者挂起等待播放完成。

### TTS 示例

<Tabs>
  <Tab title="仅核心 TTS">
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
  <Tab title="覆盖为 ElevenLabs（仅限通话）">
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
  <Tab title="OpenAI 模型覆盖（深度合并）">
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

## 呼入通话

呼入策略默认为 `disabled`。要启用呼入通话，请设置：

```json5
{
  inboundPolicy: "allowlist",
  allowFrom: ["+15550001234"],
  inboundGreeting: "Hello! How can I help?",
}
```

<Warning>`inboundPolicy: "allowlist"` 是一种低保证的来电者 ID 筛选。插件会规范化提供商提供的 `From` 值，并将其与 `allowFrom` 进行比较。Webhook 验证会对提供商传递和负载完整性进行身份验证，但它**不**证明 PSTN/VoIP 来电者号码的所有权。请将 `allowFrom` 视为来电者 ID 筛选，而不是强有力的来电者身份验证。</Warning>

自动响应使用代理系统。可以使用 `responseModel`、`responseSystemPrompt` 和 `responseTimeoutMs` 进行调整。

### 语音输出合约

对于自动响应，Voice Call 会在系统提示词中附加严格的语音输出合约：

```text
{"spoken":"..."}
```

Voice Call 会谨慎地提取语音文本：

- 忽略标记为推理/错误内容的负载。
- 解析直接 JSON、围栏 JSON 或内联 `"spoken"` 键。
- 回退到纯文本并删除可能的规划/元引导段落。

这确保语音播放专注于面向呼叫者的文本，并避免将规划文本泄露到音频中。

### 对话启动行为

对于 `conversation` 呼叫，首条消息的处理与实时播放状态有关：

- 只有在初始问候语正在主动播放时，才会抑制打断队列清除和自动响应。
- 如果初始播放失败，呼叫将返回到 `listening`，并且初始消息仍保留在队列中以进行重试。
- Twilio 流式传输的初始播放在流连接时立即开始，没有额外延迟。
- 打断会中止当前播放并清除已排队但尚未播放的 Twilio TTS 条目。已清除的条目将被解析为已跳过，因此后续响应逻辑可以继续，而无需等待永远不会播放的音频。
- 实时语音对话使用实时流自己的开场回合。对于该初始消息，Voice Call **不会**发布传统的 `<Say>` TwiML 更新，因此 `<Connect><Stream>` 会话保持连接状态。

### Twilio 流断开宽限期

当 Twilio 媒体流断开连接时，Voice Call 会等待 **2000 毫秒** 然后自动结束呼叫：

- 如果流在此期间重新连接，自动结束将被取消。
- 如果在宽限期后没有流重新注册，呼叫将被结束，以防止呼叫卡在活动状态。

## 过期呼叫清理器

使用 `staleCallReaperSeconds` 来结束从未收到终止 webhook 的呼叫（例如，从未完成的通知模式呼叫）。默认值为 `0`（已禁用）。

建议范围：

- **生产环境：** 通知风格流程为 `120` 到 `300` 秒。
- 将此值保持为 **高于 `maxDurationSeconds`**，以便正常呼叫可以完成。一个好的起点是 `maxDurationSeconds + 30–60` 秒。

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

当代理或隧道位于 Gateway(网关) 前面时，插件会重建用于签名验证的公共 URL。这些选项控制信任哪些转发的标头：

<ParamField path="webhookSecurity.allowedHosts" type="string[]">
  允许从转接头的主机列入白名单。
</ParamField>
<ParamField path="webhookSecurity.trustForwardingHeaders" type="boolean">
  在没有白名单的情况下信任转接头。
</ParamField>
<ParamField path="webhookSecurity.trustedProxyIPs" type="string[]">
  仅当请求远程 IP 与列表匹配时才信任转接头。
</ParamField>

附加保护：

- Twilio 和 Plivo 启用了 Webhook **重放保护**。重放的有效 Webhook 请求会被确认，但会跳过副作用。
- Twilio 对话轮次在 `<Gather>` 回调中包含每轮令牌，因此过时/重放的语音回调无法满足较新的待处理转录轮次。
- 当缺少提供商所需的签名头时，未经身份验证的 Webhook 请求会在读取正文之前被拒绝。
- 语音通话 Webhook 在签名验证之前使用共享的预认证正文配置（64 KB / 5 秒）加上每个 IP 的并发上限。

具有稳定公共主机的示例：

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

`latency` 从默认的语音通话存储路径读取 `calls.jsonl`。
使用 `--file <path>` 指向不同的日志，并使用 `--last <n>` 将分析限制
为最近的 N 条记录（默认为 200）。输出包括轮次延迟和监听等待时间的 p50/p90/p99。

## Agent 工具

工具名称：`voice_call`。

| 动作            | 参数                      |
| --------------- | ------------------------- |
| `initiate_call` | `message`、`to?`、`mode?` |
| `continue_call` | `callId`、`message`       |
| `speak_to_user` | `callId`、`message`       |
| `send_dtmf`     | `callId`、`digits`        |
| `end_call`      | `callId`                  |
| `get_status`    | `callId`                  |

此代码仓库在 `skills/voice-call/SKILL.md` 附带了匹配的技能文档。

## Gateway(网关) RPC

| 方法                 | 参数                      |
| -------------------- | ------------------------- |
| `voicecall.initiate` | `to?`, `message`, `mode?` |
| `voicecall.continue` | `callId`, `message`       |
| `voicecall.speak`    | `callId`, `message`       |
| `voicecall.dtmf`     | `callId`, `digits`        |
| `voicecall.end`      | `callId`                  |
| `voicecall.status`   | `callId`                  |

## 相关

- [Talk mode](/zh/nodes/talk)
- [Text-to-speech](/zh/tools/tts)
- [Voice wake](/zh/nodes/voicewake)
