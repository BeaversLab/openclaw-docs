---
summary: "语音通话插件：通过 Twilio/Telnyx/Plivo 进行 outbound + inbound 通话（插件安装 + 配置 + CLI）"
read_when:
  - "You want to place an outbound voice call from OpenClaw"
  - "You are configuring or developing the voice-call plugin"
title: "语音通话插件"
---

# 语音通话（插件）

通过插件为 OpenClaw 提供语音通话功能。支持 outbound 通知和具有 inbound 策略的多轮对话。

当前提供商：

- `twilio` (Programmable Voice + Media Streams)
- `telnyx` (Call Control v2)
- `plivo` (Voice API + XML transfer + GetInput speech)
- `mock` (dev/no network)

快速心理模型：

- Install plugin
- Restart Gateway
- Configure under `plugins.entries.voice-call.config`
- Use `openclaw voicecall ...` or the `voice_call` tool

## 运行位置（本地 vs 远程）

语音通话插件在 **Gateway 进程内部** 运行。

如果您使用远程 Gateway，请在 **运行 Gateway 的机器** 上安装/配置插件，然后重启 Gateway 以加载它。

## 安装

### 选项 A：从 npm 安装（推荐）

```bash
openclaw plugins install @openclaw/voice-call
```

之后重启 Gateway。

### 选项 B：从本地文件夹安装（开发，不复制）

```bash
openclaw plugins install ./extensions/voice-call
cd ./extensions/voice-call && pnpm install
```

之后重启 Gateway。

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
          },
        },
      },
    },
  },
}
```

注意事项：

- Twilio/Telnyx 需要 **可公开访问** 的 webhook URL。
- Plivo 需要 **可公开访问** 的 webhook URL。
- `mock` 是本地开发提供商（无网络调用）。
- `skipSignatureVerification` 仅用于本地测试。
- 如果您使用 ngrok 免费版，请将 `publicUrl` 设置为确切的 ngrok URL；始终强制执行签名验证。
- `tunnel.allowNgrokFreeTierLoopbackBypass: true` 仅在 `tunnel.provider="ngrok"` 和 `serve.bind` 为环回（ngrok 本地代理）时允许具有无效签名的 Twilio webhook。仅用于本地开发。
- Ngrok 免费版 URL 可能会更改或添加插页式行为；如果 `publicUrl` 漂移，Twilio 签名将失败。对于生产环境，首选稳定域或 Tailscale funnel。

## Webhook 安全性

当代理或隧道位于 Gateway 前面时，插件会重构用于签名验证的公开 URL。这些选项控制信任哪些转发的标头。

`webhookSecurity.allowedHosts` 从转发标头中允许列出主机。

`webhookSecurity.trustForwardingHeaders` 在没有允许列表的情况下信任转发的标头。

`webhookSecurity.trustedProxyIPs` 仅在请求远程 IP 与列表匹配时信任转发的标头。

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

语音通话使用核心 `messages.tts` 配置（OpenAI 或 ElevenLabs）进行通话的流式语音。您可以在插件配置下使用 **相同的形状** 覆盖它 — 它与 `messages.tts` 深度合并。

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

注意事项：

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

仅为通话覆盖为 ElevenLabs（在其他地方保持核心默认值）：

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

仅为通话覆盖 OpenAI 模型（深度合并示例）：

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

## Inbound 通话

Inbound 策略默认为 `disabled`。要启用 inbound 通话，请设置：

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

## Gateway RPC

- `voicecall.initiate` (`to?`, `message`, `mode?`)
- `voicecall.continue` (`callId`, `message`)
- `voicecall.speak` (`callId`, `message`)
- `voicecall.end` (`callId`)
- `voicecall.status` (`callId`)
