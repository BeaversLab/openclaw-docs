---
summary: "Voice Call 插件：通过 Twilio/Telnyx/Plivo 进行拨出 + 拨入电话（插件安装 + 配置 + CLI）"
read_when:
  - You want to place an outbound voice call from OpenClaw
  - You are configuring or developing the voice-call plugin
title: "Voice Call 插件"
---

# 语音通话（插件）

通过插件为 OpenClaw 提供语音通话功能。支持通过 inbound 策略进行 outbound 通知和多轮对话。

当前提供商：

- `twilio` (可编程语音 + 媒体流)
- `telnyx` (Call Control v2)
- `plivo` (语音 API + XML 传输 + GetInput 语音)
- `mock` (开发/无网络)

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
- 如果旧配置仍使用 `provider: "log"`、`twilio.from` 或传统的 `streaming.*` OpenAI 密钥，请运行 `openclaw doctor --fix` 来重写它们。
- 除非 `skipSignatureVerification` 为 true，否则 Telnyx 需要 `telnyx.publicKey`（或 `TELNYX_PUBLIC_KEY`）。
- `skipSignatureVerification` 仅用于本地测试。
- 如果您使用 ngrok 免费版，请将 `publicUrl` 设置为确切的 ngrok URL；始终强制执行签名验证。
- 仅当 `tunnel.provider="ngrok"` 和 `serve.bind` 为环回（ngrok 本地代理）时，`tunnel.allowNgrokFreeTierLoopbackBypass: true` 才允许签名无效的 Twilio Webhook。仅用于本地开发。
- Ngrok 免费版 URL 可能会更改或添加插页行为；如果 `publicUrl` 偏离，Twilio 签名将失败。对于生产环境，首选稳定域或 Tailscale funnel。
- 流式传输安全默认值：
  - `streaming.preStartTimeoutMs` 会关闭从未发送有效 `start` 帧的套接字。
- `streaming.maxPendingConnections` 限制未认证的启动前套接字总数。
- `streaming.maxPendingConnectionsPerIp` 限制每个源 IP 的未认证启动前套接字数。
- `streaming.maxConnections` 限制打开的媒体流套接字（待处理 + 活动）总数。
- 运行时回退暂时仍接受那些旧的 voice-call 密钥，但重写路径是 `openclaw doctor --fix`，兼容垫片是临时的。

## 实时转录

`streaming` 为实时通话音频选择实时转录提供商。

当前的运行时行为：

- `streaming.provider` 是可选的。如果未设置，语音通话将使用第一个注册的实时转录提供商。
- 目前捆绑的提供商是 OpenAI，由捆绑的 `openai` 插件注册。
- 提供商拥有的原始配置位于 `streaming.providers.<providerId>` 之下。
- 如果 `streaming.provider` 指向未注册的提供商，或者根本没有注册实时转录提供商，语音通话将记录警告并跳过媒体流，而不是导致整个插件失败。

OpenAI 实时转录默认值：

- API 密钥：`streaming.providers.openai.apiKey` 或 `OPENAI_API_KEY`
- 模型：`gpt-4o-transcribe`
- `silenceDurationMs`：`800`
- `vadThreshold`：`0.5`

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

旧密钥仍由 `openclaw doctor --fix` 自动迁移：

- `streaming.sttProvider` → `streaming.provider`
- `streaming.openaiApiKey` → `streaming.providers.openai.apiKey`
- `streaming.sttModel` → `streaming.providers.openai.model`
- `streaming.silenceDurationMs` → `streaming.providers.openai.silenceDurationMs`
- `streaming.vadThreshold` → `streaming.providers.openai.vadThreshold`

## 过期呼叫清理器

使用 `staleCallReaperSeconds` 结束从未收到终止 Webhook 的呼叫（例如，从未完成的通知模式呼叫）。默认值为 `0`（已禁用）。

建议范围：

- **生产环境：** 通知式流程 `120`–`300` 秒。
- 将此值保持**高于 `maxDurationSeconds`**，以便正常呼叫能够完成。一个良好的起点是 `maxDurationSeconds + 30–60` 秒。

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

## Webhook 安全性

当代理或隧道位于 Gateway(网关) 前面时，该插件会重构用于签名验证的公共 URL。这些选项控制信任哪些转发的标头。

`webhookSecurity.allowedHosts` 将转发标头中的主机列入白名单。

`webhookSecurity.trustForwardingHeaders` 在没有允许列表的情况下信任转发的标头。

`webhookSecurity.trustedProxyIPs` 仅当请求的远程 IP 匹配列表时才信任转发的标头。

Twilio 和 Plivo 已启用 Webhook 重放保护。重播的有效 Webhook 请求将被确认，但会跳过副作用。

Twilio 对话轮次在 `<Gather>` 回调中包含每轮次令牌，因此过时/重播的语音回调无法满足较新的待处理转录轮次。

当缺少提供商所需的签名标头时，未经身份验证的 Webhook 请求会在读取正文之前被拒绝。

语音通话 Webhook 在签名验证之前使用共享的预认证正文配置（64 KB / 5 秒）加上每个 IP 的进行中上限。

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

Voice Call 使用核心 `messages.tts` 配置进行通话中的语音流式传输。您可以在插件配置下使用 **相同的形状** 覆盖它 —— 它与 `messages.tts` 进行深度合并。

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

说明：

- 插件配置中的旧版 `tts.<provider>` 键（`openai`、`elevenlabs`、`microsoft`、`edge`）会在加载时自动迁移到 `tts.providers.<provider>`。在提交的配置中，首选 `providers` 形状。
- **Microsoft 语音在语音通话中被忽略**（电话音频需要 PCM；当前的 Microsoft 传输不公开电话 PCM 输出）。
- 启用 Twilio 媒体流式传输时使用核心 TTS；否则通话会回退到提供商原生语音。
- 如果 Twilio 媒体流已处于活动状态，Voice Call 不会回退到 TwiML `<Say>`。如果在该状态下电话 TTS 不可用，播放请求将失败，而不是混合两个播放路径。
- 当电话 TTS 回退到辅助提供商时，Voice Call 会记录包含提供商链（`from`、`to`、`attempts`）的警告以便调试。

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

仅为通话覆盖到 ElevenLabs（在其他地方保留核心默认值）：

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

仅为通话覆盖 OpenAI 模型（深度合并示例）：

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

## 来电

入站策略默认为 `disabled`。要启用入站呼叫，请设置：

```json5
{
  inboundPolicy: "allowlist",
  allowFrom: ["+15550001234"],
  inboundGreeting: "Hello! How can I help?",
}
```

`inboundPolicy: "allowlist"` 是一种低保障的来电 ID 筛选机制。该插件对提供商提供的 `From` 值进行标准化，并将其与 `allowFrom` 进行比较。Webhook 验证用于验证提供商的传递和负载完整性，但它不能证明 PSTN/VoIP 呼叫号码的所有权。请将 `allowFrom` 视为来电 ID 过滤，而非强来电身份验证。

自动响应使用 Agent 系统。通过以下方式进行微调：

- `responseModel`
- `responseSystemPrompt`
- `responseTimeoutMs`

### 语音输出约定

对于自动响应，语音呼叫会将严格的语音输出约定附加到系统提示词：

- `{"spoken":"..."}`

然后，语音呼叫会以防御性方式提取语音文本：

- 忽略标记为推理/错误内容的负载。
- 解析直接 JSON、围栏 JSON 或内联 `"spoken"` 键。
- 回退到纯文本，并移除可能的规划/元引导段落。

这确保语音播放专注于面向呼叫者的文本，并避免将规划文本泄露到音频中。

### 对话启动行为

对于出站 `conversation` 呼叫，首条消息处理与实时播放状态相关联：

- 插话队列清除和自动响应仅在初始问候语正在播放时被抑制。
- 如果初始播放失败，呼叫将返回 `listening`，并且初始消息保持排队状态以进行重试。
- Twilio 流式传输的初始播放在流连接建立时立即开始，无需额外延迟。

### Twilio 流断开宽限期

当 Twilio 媒体流断开时，语音呼叫会等待 `2000ms` 然后自动结束呼叫：

- 如果在该期间流重新连接，则取消自动结束。
- 如果在宽限期后没有重新注册流，则结束呼叫以防止呼叫处于卡死活动状态。

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

`latency` 从默认的 voice-call 存储路径读取 `calls.jsonl`。使用
`--file <path>` 指向不同的日志，并使用 `--last <n>` 将分析
限制为最后 N 条记录（默认为 200）。输出包括轮次延迟
和监听等待时间的 p50/p90/p99。

## Agent 工具

工具名称：`voice_call`

操作：

- `initiate_call` (message, to?, mode?)
- `continue_call` (callId, message)
- `speak_to_user` (callId, message)
- `end_call` (callId)
- `get_status` (callId)

此仓库在 `skills/voice-call/SKILL.md` 提供了匹配的技能文档。

## Gateway(网关) RPC

- `voicecall.initiate` (`to?`, `message`, `mode?`)
- `voicecall.continue` (`callId`, `message`)
- `voicecall.speak` (`callId`, `message`)
- `voicecall.end` (`callId`)
- `voicecall.status` (`callId`)
