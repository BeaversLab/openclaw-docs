> [!NOTE]
> 本页正在翻译中。

---
summary: "Voice Call 插件：通过 Twilio/Telnyx/Plivo 进行呼入/呼出（安装 + 配置 + CLI）"
read_when:
  - 想从 OpenClaw 发起外呼
  - 正在配置或开发 voice-call 插件
---

# Voice Call（插件）

通过插件实现 OpenClaw 的语音通话。支持外呼通知以及带呼入策略的多轮对话。

当前提供商：
- `twilio`（Programmable Voice + Media Streams）
- `telnyx`（Call Control v2）
- `plivo`（Voice API + XML transfer + GetInput speech）
- `mock`（开发用/无网络）

快速心智模型：
- 安装插件
- 重启 Gateway
- 在 `plugins.entries.voice-call.config` 下配置
- 使用 `openclaw voicecall ...` 或 `voice_call` 工具

## 运行位置（本地 vs 远程）

Voice Call 插件 **在 Gateway 进程内**运行。

如果使用远程 Gateway，请在 **运行 Gateway 的机器** 上安装/配置插件，然后重启 Gateway 以加载。

## 安装

### 方案 A：从 npm 安装（推荐）

```bash
openclaw plugins install @openclaw/voice-call
```

随后重启 Gateway。

### 方案 B：从本地目录安装（开发，无需复制）

```bash
openclaw plugins install ./extensions/voice-call
cd ./extensions/voice-call && pnpm install
```

随后重启 Gateway。

## 配置

在 `plugins.entries.voice-call.config` 下配置：

```json5
{
  plugins: {
    entries: {
      "voice-call": {
        enabled: true,
        config: {
          provider: "twilio", // 或 "telnyx" | "plivo" | "mock"
          fromNumber: "+15550001234",
          toNumber: "+15550005678",

          twilio: {
            accountSid: "ACxxxxxxxx",
            authToken: "..."
          },

          plivo: {
            authId: "MAxxxxxxxxxxxxxxxxxxxx",
            authToken: "..."
          },

          // Webhook 服务器
          serve: {
            port: 3334,
            path: "/voice/webhook"
          },

          // 公网暴露（任选其一）
          // publicUrl: "https://example.ngrok.app/voice/webhook",
          // tunnel: { provider: "ngrok" },
          // tailscale: { mode: "funnel", path: "/voice/webhook" }

          outbound: {
            defaultMode: "notify" // notify | conversation
          },

          streaming: {
            enabled: true,
            streamPath: "/voice/stream"
          }
        }
      }
    }
  }
}
```

说明：
- Twilio/Telnyx 需要 **公网可达** 的 webhook URL。
- Plivo 需要 **公网可达** 的 webhook URL。
- `mock` 为本地开发 provider（无网络调用）。
- `skipSignatureVerification` 仅用于本地测试。
- 使用 ngrok 免费版时，将 `publicUrl` 设为准确的 ngrok URL；签名验证始终强制。
- `tunnel.allowNgrokFreeTierLoopbackBypass: true` 仅在 `tunnel.provider="ngrok"` 且 `serve.bind` 为 loopback 时允许无效签名的 Twilio webhook（ngrok 本地代理）。仅用于本地开发。
- Ngrok 免费版 URL 可能变化或添加中间页；若 `publicUrl` 漂移，Twilio 签名会失败。生产环境建议使用稳定域名或 Tailscale funnel。

## 通话 TTS

Voice Call 使用核心 `messages.tts` 配置（OpenAI 或 ElevenLabs）为通话提供流式语音。你也可以在插件配置中使用**相同形状**覆盖，它会与 `messages.tts` 深度合并。

```json5
{
  tts: {
    provider: "elevenlabs",
    elevenlabs: {
      voiceId: "pMsXgVXv3BLzUgSXRplE",
      modelId: "eleven_multilingual_v2"
    }
  }
}
```

说明：
- **Edge TTS 在语音通话中会被忽略**（电话音频需要 PCM；Edge 输出不可靠）。
- 启用 Twilio 媒体流时使用核心 TTS；否则通话回退到 provider 原生语音。

### 更多示例

只用核心 TTS（无覆盖）：

```json5
{
  messages: {
    tts: {
      provider: "openai",
      openai: { voice: "alloy" }
    }
  }
}
```

仅对通话覆盖为 ElevenLabs（其他保持核心默认）：

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
              modelId: "eleven_multilingual_v2"
            }
          }
        }
      }
    }
  }
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
              voice: "marin"
            }
          }
        }
      }
    }
  }
}
```

## 呼入通话

呼入策略默认 `disabled`。要启用呼入通话，设置：

```json5
{
  inboundPolicy: "allowlist",
  allowFrom: ["+15550001234"],
  inboundGreeting: "Hello! How can I help?"
}
```

自动回复使用代理系统，可通过以下项调整：
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

工具名：`voice_call`

动作：
- `initiate_call`（message, to?, mode?）
- `continue_call`（callId, message）
- `speak_to_user`（callId, message）
- `end_call`（callId）
- `get_status`（callId）

本仓库提供对应的 skill 文档：`skills/voice-call/SKILL.md`。

## Gateway RPC

- `voicecall.initiate`（`to?`, `message`, `mode?`）
- `voicecall.continue`（`callId`, `message`）
- `voicecall.speak`（`callId`, `message`）
- `voicecall.end`（`callId`）
- `voicecall.status`（`callId`）
