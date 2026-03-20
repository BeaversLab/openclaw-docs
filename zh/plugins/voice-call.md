---
summary: "Voice Call 插件：通过 Twilio/Telnyx/Plivo 进行呼出 + 呼入通话（插件安装 + 配置 + CLI）"
read_when:
  - 您想从 OpenClaw 拨打语音电话
  - 您正在配置或开发 voice-call 插件
title: "Voice Call Plugin"
---

# Voice Call (插件)

通过插件为 OpenClaw 提供语音通话功能。支持呼出通知和
基于呼入策略的多轮对话。

当前的提供商：

- `twilio` (Programmable Voice + Media Streams)
- `telnyx` (Call Control v2)
- `plivo` (Voice API + XML transfer + GetInput speech)
- `mock` (dev/no network)

快速思维模型：

- 安装插件
- 重启 Gateway(网关)
- 在 `plugins.entries.voice-call.config` 下进行配置
- 使用 `openclaw voicecall ...` 或 `voice_call` 工具

## 运行位置（本地 vs 远程）

Voice Call 插件在 **Gateway(网关)进程内部** 运行。

如果您使用远程 Gateway(网关)，请在 **运行 Gateway(网关) 的机器上** 安装/配置插件，然后重启 Gateway(网关) 以加载它。

## 安装

### 选项 A：从 npm 安装（推荐）

```bash
openclaw plugins install @openclaw/voice-call
```

之后重启 Gateway(网关)。

### 选项 B：从本地文件夹安装（开发版，不复制）

```bash
openclaw plugins install ./extensions/voice-call
cd ./extensions/voice-call && pnpm install
```

之后重启 Gateway(网关)。

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

备注：

- Twilio/Telnyx 需要一个**可公开访问的** Webhook URL。
- Plivo 需要一个**可公开访问的** Webhook URL。
- `mock` 是一个本地开发提供商（无网络调用）。
- 除非 `skipSignatureVerification` 为 true，否则 Telnyx 需要 `telnyx.publicKey` (或 `TELNYX_PUBLIC_KEY`)。
- `skipSignatureVerification` 仅用于本地测试。
- 如果您使用 ngrok 免费版，请将 `publicUrl` 设置为确切的 ngrok URL；始终强制执行签名验证。
- `tunnel.allowNgrokFreeTierLoopbackBypass: true` 仅在 `tunnel.provider="ngrok"` 且 `serve.bind` 为环回（ngrok 本地代理）时才允许具有无效签名的 Twilio Webhook。仅用于本地开发。
- Ngrok 免费版 URL 可能会变更或添加插页行为；如果 `publicUrl` 发生偏移，Twilio 签名将验证失败。在生产环境中，建议使用稳定的域名或 Tailscale funnel。
- 流式传输安全默认值：
  - `streaming.preStartTimeoutMs` 会关闭从未发送有效 `start` 帧的 socket。
  - `streaming.maxPendingConnections` 限制未通过身份验证的启动前 socket 总数。
  - `streaming.maxPendingConnectionsPerIp` 限制每个源 IP 的未通过身份验证的启动前 socket 数量。
  - `streaming.maxConnections` 限制打开的媒体流 socket 总数（包括待处理和活动状态）。

## 过期通话清理器

使用 `staleCallReaperSeconds` 结束从未收到最终 webho​​ok 的通话
（例如，从未完成的通知模式通话）。默认值为 `0`
（已禁用）。

推荐范围：

- **生产环境：** 通知类流程建议 `120`–`300` 秒。
- 保持此值 **高于 `maxDurationSeconds`**，以便正常通话能够
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

当代理或隧道位于 Gateway(网关) 前面时，插件会重建用于签名验证的公共 URL。这些选项控制信任哪些转发的标头。

`webhookSecurity.allowedHosts` 将转发标头中的主机列入白名单。

`webhookSecurity.trustForwardingHeaders` 在没有白名单的情况下信任转发标头。

`webhookSecurity.trustedProxyIPs` 仅在请求的远程 IP 与列表匹配时才信任转发标头。

已为 Twilio 和 Plivo 启用 Webhook 重放保护。重放的有效 webhook 请求将被确认，但会跳过副作用处理。

Twilio 对话轮次在 `<Gather>` 回调中包含每轮令牌，因此过时/重放的语音回调无法满足较新的待处理转录轮次。

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

## 通话 TTS

Voice Call 使用核心 `messages.tts` 配置进行通话的流式语音传输。您可以在插件配置下使用
**相同的结构** 覆盖它 —— 它会与 `messages.tts` 进行深度合并。

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

- **语音通话会忽略 Microsoft 语音**（电话音频需要 PCM；当前的 Microsoft 传输不公开电话 PCM 输出）。
- 当启用 Twilio 媒体流时使用核心 TTS；否则通话回退到提供商的原生语音。

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

仅针对通话覆盖 OpenAI 模型（深度合并示例）：

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

`inboundPolicy: "allowlist"` 是一种低保证的来电者 ID 筛选。插件会对提供商提供的 `From` 值进行规范化，并将其与 `allowFrom` 进行比较。Webhook 验证可以验证提供商的交付和载荷完整性，但不能证明 PSTN/VoIP 来电者号码的所有权。请将 `allowFrom` 视为来电者 ID 筛选，而不是强有力的来电者身份。

自动响应使用 agent 系统。使用以下参数进行调整：

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

## Agent 工具

工具名称：`voice_call`

操作：

- `initiate_call` (message, to?, mode?)
- `continue_call` (callId, message)
- `speak_to_user` (callId, message)
- `end_call` (callId)
- `get_status` (callId)

此仓库在 `skills/voice-call/SKILL.md` 处附带了一个匹配的技能文档。

## 网关 RPC

- `voicecall.initiate` (`to?`, `message`, `mode?`)
- `voicecall.continue` (`callId`, `message`)
- `voicecall.speak` (`callId`, `message`)
- `voicecall.end` (`callId`)
- `voicecall.status` (`callId`)

import en from "/components/footer/en.mdx";

<en />
