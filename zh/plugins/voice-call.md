---
summary: "语音通话插件：通过 Twilio/Telnyx/Plivo 进行 outbound + inbound 通话（插件安装 + 配置 + CLI）"
read_when:
  - You want to place an outbound voice call from OpenClaw
  - You are configuring or developing the voice-call plugin
title: "语音通话插件"
---

# 语音通话（插件）

通过插件为 OpenClaw 提供语音通话功能。支持通过 inbound 策略进行 outbound 通知和多轮对话。

当前提供商：

- `twilio` (可编程语音 + 媒体流)
- `telnyx` (通话控制 v2)
- `plivo` (语音 API + XML 转接 + GetInput 语音)
- `mock` (开发/无网络)

快速思维模型：

- 安装插件
- 重启网关
- 在 `plugins.entries.voice-call.config` 下配置
- 使用 `openclaw voicecall ...` 或 `voice_call` 工具

## 运行位置（本地与远程）

语音通话插件运行在**网关进程内部**。

如果您使用远程网关，请在**运行网关的机器上**安装/配置该插件，然后重启网关以加载它。

## 安装

### 选项 A：从 npm 安装（推荐）

```bash
openclaw plugins install @openclaw/voice-call
```

安装后重启网关。

### 选项 B：从本地文件夹安装（开发，不复制）

```bash
openclaw plugins install ./extensions/voice-call
cd ./extensions/voice-call && pnpm install
```

安装后重启网关。

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

- Twilio/Telnyx 需要一个**可公开访问**的 webhook URL。
- Plivo 需要一个**可公开访问**的 webhook URL。
- `mock` 是一个本地开发提供商（无网络调用）。
- 除非 `skipSignatureVerification` 为 true，否则 Telnyx 需要 `telnyx.publicKey`（或 `TELNYX_PUBLIC_KEY`）。
- `skipSignatureVerification` 仅用于本地测试。
- 如果您使用 ngrok 免费版，请将 `publicUrl` 设置为确切的 ngrok URL；始终强制执行签名验证。
- `tunnel.allowNgrokFreeTierLoopbackBypass: true` 仅当 `tunnel.provider="ngrok"` 且 `serve.bind` 为环回（ngrok 本地代理）时，才允许带有无效签名的 Twilio webhook。仅用于本地开发。
- Ngrok 免费版 URL 可能会更改或添加插页行为；如果 `publicUrl` 偏离，Twilio 签名将失败。对于生产环境，建议使用稳定的域或 Tailscale funnel。
- 流式传输安全默认值：
  - `streaming.preStartTimeoutMs` 会关闭从未发送有效 `start` 帧的套接字。
  - `streaming.maxPendingConnections` 限制未通过身份验证的预启动套接字总数。
  - `streaming.maxPendingConnectionsPerIp` 限制每个源 IP 的未通过身份验证的预启动套接字数。
  - `streaming.maxConnections` 限制打开的媒体流套接字总数（待处理 + 活跃）。

## 过期呼叫清理器

使用 `staleCallReaperSeconds` 来结束从未收到终止 webhook 的呼叫（例如，从未完成的通知模式呼叫）。默认值为 `0`（已禁用）。

建议范围：

- **生产环境：** 通知式流程为 `120`–`300` 秒。
- 将此值保持在 **高于 `maxDurationSeconds`**，以便正常呼叫可以
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

## Webhook 安全性

当代理或隧道位于网关之前时，插件会重构用于签名验证的公共 URL。这些选项控制信任哪些转发头。

`webhookSecurity.allowedHosts` 将转发头中的主机加入白名单。

`webhookSecurity.trustForwardingHeaders` 信任转发头而不需要白名单。

`webhookSecurity.trustedProxyIPs` 仅当请求远程 IP 与列表匹配时才信任转发头。

已为 Twilio 和 Plivo 启用 Webhook 重放保护。重放的有效 webhook 请求将得到确认，但会跳过副作用处理。

Twilio 对话轮次在 `<Gather>` 回调中包含每轮次令牌，因此过期/重放的语音回调无法满足较新的待处理转录轮次。

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

## 呼叫 TTS

语音呼叫使用核心 `messages.tts` 配置（OpenAI 或 ElevenLabs）在呼叫上进行流式语音传输。您可以在插件配置下使用**相同的结构**覆盖它 — 它与 `messages.tts` 进行深度合并。

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

注：

- **语音呼叫忽略 Edge TTS**（电话音频需要 PCM；Edge 输出不可靠）。
- 启用 Twilio 媒体流式传输时使用核心 TTS；否则呼叫将回退到提供商的原生语音。

### 更多示例

仅使用核心 TTS（不覆盖）：

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

仅针对呼叫覆盖为 ElevenLabs（其他地方保留核心默认设置）：

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

仅覆盖呼叫的 OpenAI 模型（深度合并示例）：

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

## 呼入通话

呼入策略默认为 `disabled`。要启用呼入通话，请设置：

```json5
{
  inboundPolicy: "allowlist",
  allowFrom: ["+15550001234"],
  inboundGreeting: "Hello! How can I help?",
}
```

自动响应使用代理系统。使用以下参数进行微调：

- `responseModel`
- `responseSystemPrompt`
- `responseTimeoutMs`

## 命令行界面 (CLI)

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

工具名称：`voice_call`

操作：

- `initiate_call` (message, to?, mode?)
- `continue_call` (callId, message)
- `speak_to_user` (callId, message)
- `end_call` (callId)
- `get_status` (callId)

此仓库在 `skills/voice-call/SKILL.md` 提供了一个匹配的技能文档。

## 网关 RPC

- `voicecall.initiate` (`to?`, `message`, `mode?`)
- `voicecall.continue` (`callId`, `message`)
- `voicecall.speak` (`callId`, `message`)
- `voicecall.end` (`callId`)
- `voicecall.status` (`callId`)
