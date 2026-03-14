---
summary: "Voice Call 插件：通过 Twilio/Telnyx/Plivo 进行呼出 + 呼入（插件安装 + 配置 + CLI）"
read_when:
  - You want to place an outbound voice call from OpenClaw
  - You are configuring or developing the voice-call plugin
title: "Voice Call 插件"
---

# 语音通话（插件）

通过插件为 OpenClaw 提供语音通话功能。支持通过 inbound 策略进行 outbound 通知和多轮对话。

当前提供商：

- `twilio` (可编程语音 + 媒体流)
- `telnyx` (呼叫控制 v2)
- `plivo` (语音 API + XML 转接 + GetInput 语音)
- `mock` (开发/无网络)

快速思维模型：

- 安装插件
- 重启 Gateway 网关
- 在 `plugins.entries.voice-call.config` 下进行配置
- 使用 `openclaw voicecall ...` 或 `voice_call` 工具

## 运行位置（本地与远程）

语音通话插件运行在**Gateway 网关 进程内部**。

如果您使用远程 Gateway 网关，请在**运行 Gateway 网关 的机器上**安装/配置该插件，然后重启 Gateway 网关 以加载它。

## 安装

### 选项 A：从 npm 安装（推荐）

```bash
openclaw plugins install @openclaw/voice-call
```

安装后重启 Gateway 网关。

### 选项 B：从本地文件夹安装（开发，不复制）

```bash
openclaw plugins install ./extensions/voice-call
cd ./extensions/voice-call && pnpm install
```

安装后重启 Gateway 网关。

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
- `mock` 是一个本地开发提供商（不进行网络调用）。
- 除非 `skipSignatureVerification` 为 true，否则 Telnyx 需要 `telnyx.publicKey` (或 `TELNYX_PUBLIC_KEY`)。
- `skipSignatureVerification` 仅用于本地测试。
- 如果您使用 ngrok 免费版，请将 `publicUrl` 设置为确切的 ngrok URL；始终强制执行签名验证。
- 仅当 `tunnel.provider="ngrok"` 和 `serve.bind` 为环回（ngrok 本地代理）时，`tunnel.allowNgrokFreeTierLoopbackBypass: true` 才允许具有无效签名的 Twilio Webhook。仅用于本地开发。
- Ngrok 免费版 URL 可能会更改或添加插页式行为；如果 `publicUrl` 发生偏移，Twilio 签名将失败。对于生产环境，建议使用稳定的域名或 Tailscale funnel。
- 流式传输安全默认值：
  - `streaming.preStartTimeoutMs` 关闭从未发送有效 `start` 帧的套接字。
  - `streaming.maxPendingConnections` 限制未通过身份验证的启动前套接字总数。
  - `streaming.maxPendingConnectionsPerIp` 限制每个源 IP 的未通过身份验证的启动前套接字数量。
  - `streaming.maxConnections` 限制打开的媒体流套接字（待处理 + 活动）总数。

## 过期呼叫清理器

使用 `staleCallReaperSeconds` 来结束从未收到终止性 Webhook 的呼叫
（例如，从未完成的通知模式呼叫）。默认值为 `0`
（已禁用）。

建议范围：

- **生产环境：** 通知风格流程为 `120`–`300` 秒。
- 将此值保持**高于 `maxDurationSeconds`**，以便正常呼叫能够
  完成。一个很好的起点是 `maxDurationSeconds + 30–60` 秒。

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

当代理或隧道位于 Gateway(网关) 前面时，插件会重构用于签名验证的公开 URL。这些选项控制信任哪些转发的标头。

`webhookSecurity.allowedHosts` 将转发标头中的主机列入允许列表。

`webhookSecurity.trustForwardingHeaders` 信任没有允许列表的转发标头。

`webhookSecurity.trustedProxyIPs` 仅在请求
远程 IP 与列表匹配时信任转发标头。

Twilio 和 Plivo 已启用 Webhook 重放保护。重播的有效 Webhook
请求将被确认，但会跳过副作用。

Twilio 对话轮次在 `<Gather>` 回调中包含每轮次令牌，因此
过期/重播的语音回调无法满足较新的待处理转录轮次。

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

## 呼叫的 TTS

语音通话使用核心 `messages.tts` 配置（OpenAI 或 ElevenLabs）在通话中流式传输语音。您可以在插件配置下使用**相同的结构**覆盖它——它会与 `messages.tts` 进行深度合并。

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

- **语音通话忽略 Edge TTS**（电话音频需要 PCM；Edge 输出不可靠）。
- 当启用 Twilio 媒体流时使用核心 TTS；否则通话回退到提供商原生语音。

### 更多示例

仅使用核心 TTS（无覆盖）：

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

仅针对通话覆盖为 ElevenLabs（其他地方保持核心默认值）：

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

仅覆盖通话的 OpenAI 模型（深度合并示例）：

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

自动响应使用代理系统。使用以下参数调整：

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

工具名称：`voice_call`

操作：

- `initiate_call` (message, to?, mode?)
- `continue_call` (callId, message)
- `speak_to_user` (callId, message)
- `end_call` (callId)
- `get_status` (callId)

此仓库在 `skills/voice-call/SKILL.md` 处附带一个匹配的技能文档。

## Gateway(网关) RPC

- `voicecall.initiate` (`to?`, `message`, `mode?`)
- `voicecall.continue` (`callId`, `message`)
- `voicecall.speak` (`callId`, `message`)
- `voicecall.end` (`callId`)
- `voicecall.status` (`callId`)

import zh from '/components/footer/zh.mdx';

<zh />
