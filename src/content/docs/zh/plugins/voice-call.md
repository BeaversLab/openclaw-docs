---
summary: "语音通话插件：通过 Twilio/Telnyx/Plivo 进行呼出和呼入（插件安装 + 配置 + CLI）"
read_when:
  - You want to place an outbound voice call from OpenClaw
  - You are configuring or developing the voice-call plugin
title: "语音通话插件"
---

# 语音通话（插件）

通过插件为 OpenClaw 提供语音通话功能。支持通过 inbound 策略进行 outbound 通知和多轮对话。

当前提供商：

- `twilio`（可编程语音 + 媒体流）
- `telnyx`（呼叫控制 v2）
- `plivo`（语音 API + XML 传输 + GetInput 语音）
- `mock`（开发/无网络）

快速思维模型：

- 安装插件
- 重启 Gateway(网关) 网关
- 在 `plugins.entries.voice-call.config` 下配置
- 使用 `openclaw voicecall ...` 或 `voice_call` 工具

## 运行位置（本地与远程）

语音通话插件运行在**Gateway(网关) 网关 进程内部**。

如果您使用远程 Gateway(网关) 网关，请在**运行 Gateway(网关) 网关 的机器上**安装/配置该插件，然后重启 Gateway(网关) 网关 以加载它。

## 安装

### 选项 A：从 npm 安装（推荐）

```bash
openclaw plugins install @openclaw/voice-call
```

安装后重启 Gateway(网关) 网关。

### 选项 B：从本地文件夹安装（开发，不复制）

```bash
PLUGIN_SRC=./path/to/local/voice-call-plugin
openclaw plugins install "$PLUGIN_SRC"
cd "$PLUGIN_SRC" && pnpm install
```

安装后重启 Gateway(网关) 网关。

## 配置

在 `plugins.entries.voice-call.config` 下设置配置：

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

注意：

- Twilio/Telnyx 需要一个**可公开访问**的 webhook URL。
- Plivo 需要一个**可公开访问**的 webhook URL。
- `mock` 是本地开发提供商（无网络调用）。
- 如果旧配置仍使用 `provider: "log"`、`twilio.from` 或旧版 `streaming.*` OpenAI 密钥，请运行 `openclaw doctor --fix` 来重写它们。
- 除非 `skipSignatureVerification` 为真，否则 Telnyx 需要 `telnyx.publicKey`（或 `TELNYX_PUBLIC_KEY`）。
- `skipSignatureVerification` 仅用于本地测试。
- 如果您使用的是 ngrok 免费版，请将 `publicUrl` 设置为确切的 ngrok URL；始终强制执行签名验证。
- 仅当 `tunnel.provider="ngrok"` 和 `serve.bind` 为环回（ngrok 本地代理）时，`tunnel.allowNgrokFreeTierLoopbackBypass: true` 才允许具有无效签名的 Twilio webhook。仅用于本地开发。
- Ngrok 免费版 URL 可能会更改或添加插页行为；如果 `publicUrl` 发生偏移，Twilio 签名将验证失败。对于生产环境，建议使用稳定的域名或 Tailscale funnel。
- 流式传输安全默认值：
  - `streaming.preStartTimeoutMs` 会关闭从未发送有效 `start` 帧的套接字。
- `streaming.maxPendingConnections` 限制未通过身份认证的启动前套接字总数。
- `streaming.maxPendingConnectionsPerIp` 限制每个源 IP 的未通过身份认证的启动前套接字数量。
- `streaming.maxConnections` 限制打开的媒体流套接字（待处理 + 活跃）总数。
- 运行时回退机制目前仍接受那些旧的 voice-call 密钥，但重写路径是 `openclaw doctor --fix`，且兼容性垫片是临时的。

## 实时转录

`streaming` 为实时通话音频选择实时转录提供商。

当前的运行时行为：

- `streaming.provider` 是可选的。如果未设置，Voice Call 将使用第一个注册的实时转录提供商。
- 捆绑的实时转录提供商包括 Deepgram (`deepgram`)、ElevenLabs (`elevenlabs`)、Mistral (`mistral`)、OpenAI (`openai`) 和 xAI (`xai`)，它们由各自的提供商插件注册。
- 提供商拥有的原始配置位于 `streaming.providers.<providerId>` 下。
- 如果 `streaming.provider` 指向未注册的提供商，或者根本没有注册实时转录提供商，Voice Call 将记录警告并跳过媒体流，而不是导致整个插件失败。

OpenAI 实时转录默认值：

- API key: `streaming.providers.openai.apiKey` 或 `OPENAI_API_KEY`
- 模型: `gpt-4o-transcribe`
- `silenceDurationMs`: `800`
- `vadThreshold`: `0.5`

xAI 流式转录默认值：

- API 密钥：`streaming.providers.xai.apiKey` 或 `XAI_API_KEY`
- endpoint：`wss://api.x.ai/v1/stt`
- `encoding`: `mulaw`
- `sampleRate`: `8000`
- `endpointingMs`: `800`
- `interimResults`: `true`

示例：

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

改为使用 xAI：

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

旧密钥仍由 `openclaw doctor --fix` 自动迁移：

- `streaming.sttProvider` → `streaming.provider`
- `streaming.openaiApiKey` → `streaming.providers.openai.apiKey`
- `streaming.sttModel` → `streaming.providers.openai.model`
- `streaming.silenceDurationMs` → `streaming.providers.openai.silenceDurationMs`
- `streaming.vadThreshold` → `streaming.providers.openai.vadThreshold`

## 陈旧呼叫收割器

使用 `staleCallReaperSeconds` 来结束从未收到终止 Webhook 的呼叫
（例如，永不完成的通知模式呼叫）。默认值为 `0`
（禁用）。

推荐范围：

- **生产环境：** 对于通知类流程，`120`–`300` 秒。
- 将此值保持为**高于 `maxDurationSeconds`**，以便正常呼叫能够
  完成。一个好的起点是 `maxDurationSeconds + 30–60` 秒。

示例：

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

## Webhook 安全

当代理或隧道位于 Gateway(网关) 前面时，插件会重建用于签名验证的公共 URL。这些选项控制信任哪些转发的标头。

`webhookSecurity.allowedHosts` 根据转发标头将主机加入白名单。

`webhookSecurity.trustForwardingHeaders` 信任转发的标头而无需白名单。

`webhookSecurity.trustedProxyIPs` 仅在请求远程 IP 与列表匹配时信任转发的标头。

已为 Twilio 和 Plivo 启用 Webhook 重放保护。重放的有效 Webhook 请求将得到确认，但会跳过副作用。

Twilio 对话轮次在 `<Gather>` 回调中包含每轮唯一的令牌，因此过时/重放的语音回调无法满足较新的待处理转录轮次。

当缺少提供商所需的签名标头时，未经验证的 Webhook 请求将在读取正文之前被拒绝。

voice-call webhook 使用共享的预认证主体配置文件（64 KB / 5 秒）以及在签名验证之前的每个 IP 进行中上限。

使用稳定公共主机的示例：

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

## 通话的 TTS

Voice Call 使用核心 `messages.tts` 配置在通话中进行流式语音传输。你可以在插件配置下使用**相同的结构**覆盖它 —— 它会与 `messages.tts` 进行深度合并。

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

注意：

- 插件配置内部的旧版 `tts.<provider>` 键（`openai`、`elevenlabs`、`microsoft`、`edge`）会在加载时自动迁移到 `tts.providers.<provider>`。在提交的配置中，首选 `providers` 结构。
- **语音通话会忽略 Microsoft speech**（电话音频需要 PCM；当前的 Microsoft 传输不暴露电话 PCM 输出）。
- 启用 Twilio 媒体流时会使用核心 TTS；否则呼叫会回退到提供商的原生语音。
- 如果 Twilio 媒体流已处于活动状态，Voice Call 不会回退到 TwiML `<Say>`。如果在该状态下电话 TTS 不可用，播放请求将失败，而不是混合两个播放路径。
- 当电话 TTS 回退到次要提供商时，Voice Call 会记录包含提供商链（`from`、`to`、`attempts`）的警告以供调试。

### 更多示例

仅使用核心 TTS（无覆盖）：

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

仅针对呼叫覆盖到 ElevenLabs（其他位置保持核心默认值）：

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

仅针对呼叫覆盖 OpenAI 模型（深度合并示例）：

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

## 呼入呼叫

呼入策略默认为 `disabled`。要启用呼入呼叫，请设置：

```json5
{
  inboundPolicy: "allowlist",
  allowFrom: ["+15550001234"],
  inboundGreeting: "Hello! How can I help?",
}
```

`inboundPolicy: "allowlist"` 是一个低可信度的来电 ID 屏蔽机制。该插件对提供商提供的 `From` 值进行规范化，并将其与 `allowFrom` 进行比较。Webhook 验证可以验证提供商的交付和负载的完整性，但它不能证明 PSTN/VoIP 来电号码的所有权。请将 `allowFrom` 视为来电 ID 过滤，而不是强有力的来电身份验证。

自动响应使用代理系统。可通过以下方式进行微调：

- `responseModel`
- `responseSystemPrompt`
- `responseTimeoutMs`

### 语音输出合约

对于自动响应，Voice Call 会在系统提示词中附加一个严格的语音输出合约：

- `{"spoken":"..."}`

然后，Voice Call 会以防御性方式提取语音文本：

- 忽略标记为推理/错误内容的负载。
- 解析直接的 JSON、围栏 JSON 或内联 `"spoken"` 键。
- 回退到纯文本并移除可能的规划/元引导段落。

这使语音播放专注于面向呼叫者的文本，并避免将规划文本泄露到音频中。

### 对话启动行为

对于呼出 `conversation` 通话，首条消息处理与实时播放状态绑定：

- 仅在初始问候语正在播放时，才抑制插队队列清除和自动响应。
- 如果初始播放失败，通话将返回 `listening`，并且初始消息保持排队等待重试。
- Twilio 流式传输的初始播放在流连接时立即开始，没有额外延迟。

### Twilio 流断开宽限

当 Twilio 媒体流断开连接时，语音呼叫会等待 `2000ms` 然后自动结束通话：

- 如果在此期间流重新连接，自动结束将被取消。
- 如果在宽限期后没有重新注册流，通话将结束以防止通话处于卡住的活动状态。

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

`latency` 从默认的语音通话存储路径读取 `calls.jsonl`。使用
`--file <path>` 指向不同的日志，并使用 `--last <n>` 将分析限制
为最后 N 条记录（默认为 200）。输出包括轮次延迟和监听等待时间的 p50/p90/p99。

## Agent 工具

工具名称：`voice_call`

操作：

- `initiate_call` (message, to?, mode?)
- `continue_call` (callId, message)
- `speak_to_user` (callId, message)
- `end_call` (callId)
- `get_status` (callId)

此代码库在 `skills/voice-call/SKILL.md` 处提供了一个匹配的技能文档。

## Gateway(网关) RPC

- `voicecall.initiate` (`to?`, `message`, `mode?`)
- `voicecall.continue` (`callId`, `message`)
- `voicecall.speak` (`callId`, `message`)
- `voicecall.end` (`callId`)
- `voicecall.status` (`callId`)
