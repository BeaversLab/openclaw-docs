---
summary: "通过 Twilio、Telnyx 或 Plivo 拨打和接听语音电话，支持可选的实时语音和流式转录"
read_when:
  - You want to place an outbound voice call from OpenClaw
  - You are configuring or developing the voice-call plugin
  - You need realtime voice or streaming transcription on telephony
title: "语音通话插件"
sidebarTitle: "语音通话"
---

通过插件为 OpenClaw 提供语音通话功能。支持拨出通知、多轮对话、全双工实时语音、流式转录以及具有允许列表策略的呼入电话。

**当前提供商：** `twilio` (Programmable Voice + Media Streams)、
`telnyx` (Call Control v2)、`plivo` (Voice API + XML transfer + GetInput
speech)、`mock` (dev/no network)。

<Note>语音通话插件运行 **在 Gateway(网关) 进程内部**。如果您使用 远程 Gateway(网关)，请在运行 Gateway(网关) 的机器上安装并配置插件，然后重启 Gateway(网关) 以加载它。</Note>

## 快速开始

<Steps>
  <Step title="安装插件">
    <Tabs>
      <Tab title="从 npm 安装">
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

    使用基础包以遵循当前的官方发布标签。仅当您需要可重现的安装时才锁定精确版本。

    之后重启 Gateway(网关) 以便加载插件。

  </Step>
  <Step title="配置提供商和 Webhook">
    在 `plugins.entries.voice-call.config` 下设置配置（完整结构请参阅下方的
    [Configuration](#configuration)）。至少需要：
    `provider`、提供商凭证、`fromNumber` 和一个可公开访问的 Webhook URL。
  </Step>
  <Step title="验证设置">
    ```bash
    openclaw voicecall setup
    ```

    默认输出在聊天日志和终端中可读。它会检查
    插件是否已启用、提供商凭证、Webhook 暴露情况，以及
    仅有一种音频模式（`streaming` 或 `realtime`）处于活动状态。请
    在脚本中使用 `--json`。

  </Step>
  <Step title="冒烟测试">
    ```bash
    openclaw voicecall smoke
    openclaw voicecall smoke --to "+15555550123"
    ```

    两者默认均为空运行。添加 `--yes` 以实际拨打简短的
    外呼通知电话：

    ```bash
    openclaw voicecall smoke --to "+15555550123" --yes
    ```

  </Step>
</Steps>

<Warning>对于 Twilio、Telnyx 和 Plivo，设置必须解析为**公共 webhook URL**。 如果 `publicUrl`、隧道 URL、Tailscale URL 或服务回退地址 解析为环回或专用网络空间，设置将失败，而不是 启动一个无法接收运营商 webhook 的提供商。</Warning>

## 配置

如果 `enabled: true` 但所选提供商缺少凭据，
Gateway(网关) 启动时会记录一条设置不完整的警告，其中包含缺失的密钥，并
跳过启动运行时。命令、RPC 调用和代理工具在使用时仍
会返回确切的缺失提供商配置。

<Note>
  语音呼叫凭据接受 SecretRefs。`plugins.entries.voice-call.config.twilio.authToken`、`plugins.entries.voice-call.config.realtime.providers.*.apiKey`、`plugins.entries.voice-call.config.streaming.providers.*.apiKey` 和 `plugins.entries.voice-call.config.tts.providers.*.apiKey` 通过标准 SecretRef 表面进行解析；请参阅 [SecretRef credential surface](/zh/reference/secretref-credential-surface)。
</Note>

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
  <Accordion title="提供商暴露和安全说明">
    - Twilio、Telnyx 和 Plivo 都需要一个**可公开访问**的 webhook URL。
    - `mock` 是一个本地开发提供商（不进行网络调用）。
    - 除非 `skipSignatureVerification` 为 true，否则 Telnyx 需要 `telnyx.publicKey`（或 `TELNYX_PUBLIC_KEY`）。
    - `skipSignatureVerification` 仅用于本地测试。
    - 在 ngrok 免费版上，将 `publicUrl` 设置为确切的 ngrok URL；始终强制执行签名验证。
    - 仅当 `tunnel.provider="ngrok"` 和 `serve.bind` 是环回地址（ngrok 本地代理）时，`tunnel.allowNgrokFreeTierLoopbackBypass: true` 才允许具有无效签名的 Twilio webhook。仅限本地开发。
    - Ngrok 免费版 URL 可能会更改或添加插页式行为；如果 `publicUrl`Tailscale 发生偏移，Twilio 签名将失败。生产环境：首选稳定的域名或 Tailscale funnel。

  </Accordion>
  <Accordion title="流式连接限制">
    - `streaming.preStartTimeoutMs` 会关闭从未发送有效 `start` 帧的套接字。
    - `streaming.maxPendingConnections` 限制未通过身份验证的启动前套接字总数。
    - `streaming.maxPendingConnectionsPerIp` 限制每个源 IP 的未通过身份验证的启动前套接字数。
    - `streaming.maxConnections` 限制打开的媒体流套接字总数（待处理 + 活跃）。

  </Accordion>
  <Accordion title="Legacy config migrations">
    使用 `provider: "log"`、`twilio.from` 或旧版
    `streaming.*` OpenAI 密钥的旧配置会被 `openclaw doctor --fix` 重写。
    运行时回退目前仍接受旧的 voice-call 密钥，但
    重写路径为 `openclaw doctor --fix`，且兼容性填充是
    临时的。

    自动迁移的流式密钥：

    - `streaming.sttProvider` → `streaming.provider`
    - `streaming.openaiApiKey` → `streaming.providers.openai.apiKey`
    - `streaming.sttModel` → `streaming.providers.openai.model`
    - `streaming.silenceDurationMs` → `streaming.providers.openai.silenceDurationMs`
    - `streaming.vadThreshold` → `streaming.providers.openai.vadThreshold`

  </Accordion>
</AccordionGroup>

## Session scope

默认情况下，Voice Call 使用 `sessionScope: "per-phone"`，以便同一呼叫者的重复呼叫保留对话记忆。当
每次运营商呼叫都应使用全新上下文时，请设置 `sessionScope: "per-call"`，例如前台、
预订、IVR 或 Google Meet 桥接流程，其中同一电话号码可能
代表不同的会议。

## Realtime voice conversations

`realtime` 为实时通话
音频选择一个全双工实时语音提供商。它与 `streaming` 分开，后者仅将音频转发给
实时转录提供商。

<Warning>`realtime.enabled` 不能与 `streaming.enabled` 结合使用。每次通话 选择一种音频模式。</Warning>

Current runtime behaviour:

- `realtime.enabled` 支持 Twilio Media Streams。
- `realtime.provider` 是可选的。如果未设置，Voice Call 将使用第一个注册的实时语音提供商。
- 内置实时语音提供商：Google Gemini Live (`google`) 和 OpenAI (`openai`)，由其提供商插件注册。
- 提供商拥有的原始配置位于 `realtime.providers.<providerId>` 下。
- Voice Call 默认暴露共享的 `openclaw_agent_consult`OpenClaw 实时工具。当呼叫者要求更深层次的推理、当前信息或常规的 OpenClaw 工具时，实时模型可以调用它。
- `realtime.consultPolicy` 可选地添加关于实时模型何时应调用 `openclaw_agent_consult` 的指导。
- `realtime.agentContext.enabled` 默认为关闭。启用后，Voice Call 会在会话设置时将有界的代理身份、系统提示覆盖和选定的工作区文件胶囊注入到实时提供商指令中。
- `realtime.fastContext.enabled` 默认为关闭。启用后，Voice Call 首先在索引的内存/会话上下文中搜索咨询问题，并在 `realtime.fastContext.timeoutMs` 内将这些片段返回给实时模型，仅在 `realtime.fastContext.fallbackToConsult` 为 true 时才回退到完整的咨询代理。
- 如果 `realtime.provider` 指向未注册的提供商，或者根本没有注册实时语音提供商，Voice Call 会记录警告并跳过实时媒体，而不是使整个插件失败。
- 咨询会话键在可用时重用存储的调用会话，然后回退到配置的 `sessionScope`（默认为 `per-phone`，对于隔离调用则为 `per-call`）。

### 工具策略

`realtime.toolPolicy` 控制咨询运行：

| 策略             | 行为                                                                                                            |
| ---------------- | --------------------------------------------------------------------------------------------------------------- |
| `safe-read-only` | 暴露咨询工具并将常规代理限制为 `read`、`web_search`、`web_fetch`、`x_search`、`memory_search` 和 `memory_get`。 |
| `owner`          | 暴露咨询工具并允许常规代理使用常规代理工具策略。                                                                |
| `none`           | 不暴露咨询工具。自定义 `realtime.tools` 仍会传递给实时提供商。                                                  |

`realtime.consultPolicy` 仅控制实时模型指令：

| 策略          | 指导                                                                   |
| ------------- | ---------------------------------------------------------------------- |
| `auto`        | 保留默认提示并让提供商决定何时调用咨询工具。                           |
| `substantive` | 直接回答简单的对话粘合内容，并在事实、记忆、工具或上下文之前进行咨询。 |
| `always`      | 在每个实质性回答之前进行咨询。                                         |

### 代理语音上下文

当语音桥接听起来应该像已配置的 OpenClaw 代理，且在普通轮次中不产生完整的代理咨询往返时，启用 `realtime.agentContext`。上下文胶囊在创建实时会话时仅添加一次，因此不会增加每轮的延迟。对 `openclaw_agent_consult` 的调用仍然运行完整的 OpenClaw 代理，应用于工具工作、当前信息、内存查找或工作区状态。

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

### 实时提供商示例

<Tabs>
  <Tab title="Google Gemini Live">
    默认值：来自 `realtime.providers.google.apiKey`、
    `GEMINI_API_KEY` 或 `GOOGLE_GENERATIVE_AI_API_KEY` 的 API 密钥；
    模型 `gemini-2.5-flash-native-audio-preview-12-2025`；语音 `Kore`。
    `sessionResumption` 和 `contextWindowCompression` 默认开启，以便进行更长的、
    可重新连接的通话。使用 `silenceDurationMs`、
    `startSensitivity` 和
    `endSensitivity` 来调整电话语音上更快的轮次切换。

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

有关提供商特定的实时语音选项，请参阅 [Google 提供商](/zh/providers/google) 和
[OpenAI 提供商](/zh/providers/openai)。

## 流式转录

`streaming` 为实时通话音频选择一个实时转录提供商。

当前的运行时行为：

- `streaming.provider` 是可选的。如果未设置，语音呼叫将使用第一个注册的实时转录提供商。
- 捆绑的实时转录提供商：Deepgram (Deepgram`deepgram`)、ElevenLabs (`elevenlabs`)、Mistral (`mistral`)、OpenAI (`openai`) 和 xAI (`xai`)，由其各自的提供商插件注册。
- 提供商拥有的原始配置位于 `streaming.providers.<providerId>` 之下。
- 在 Twilio 发送已接受的流 `start` 消息后，Voice Call 会立即注册该流，在提供商连接期间通过转录提供商对入站媒体进行排队，并仅在实时转录准备就绪后才开始初始问候。
- 如果 `streaming.provider` 指向未注册的提供商，或者未注册任何提供商，Voice Call 将记录警告并跳过媒体流传输，而不是导致整个插件失败。

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

## 通话的 TTS

Voice Call 使用核心 `messages.tts` 配置进行通话中的流式语音传输。
您可以在插件配置下使用**相同的结构**覆盖它 — 它会与 `messages.tts` 进行深度合并。

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

<Warning>**语音通话会忽略 Microsoft 语音。** 电话音频需要 PCM； 当前的 Microsoft 传输不公开电话 PCM 输出。</Warning>

行为说明：

- 插件配置（`openai`、`elevenlabs`、`microsoft`、`edge`）中的旧版 `tts.<provider>` 键由 `openclaw doctor --fix` 修复；提交的配置应使用 `tts.providers.<provider>`。
- 当启用 Twilio 媒体流时会使用 Core TTS；否则通话将回退到提供商原生语音。
- 如果 Twilio 媒体流已处于活动状态，Voice Call 不会回退到 TwiML `<Say>`。如果在该状态下电话 TTS 不可用，播放请求将失败，而不是混合两条播放路径。
- 当电话 TTS 回退到辅助提供商时，Voice Call 会记录带有提供商链（`from`、`to`、`attempts`）的警告以供调试。
- 当 Twilio 插话或流断开清除待处理的 TTS 队列时，排队的播放请求会结束，而不是让呼叫者挂起等待播放完成。

### TTS 示例

<Tabs>
  <Tab title="仅 Core TTS">
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
  <Tab title="覆盖为 ElevenLabs（仅通话）">
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
  <Tab title="OpenAIOpenAI 模型覆盖（深度合并）">
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

<Warning>`inboundPolicy: "allowlist"` 是一种低保证的来电 ID 筛选。该 插件将提供商提供的 `From` 值进行规范化，并与 `allowFrom` 进行比较。Webhook 验证可以验证提供商的投递和 负载完整性，但它**不**证明 PSTN/VoIP 呼叫者号码 的所有权。请将 `allowFrom` 视为来电 ID 筛选，而非强有力的呼叫者 身份验证。</Warning>

自动响应使用代理系统。使用 `responseModel`、
`responseSystemPrompt` 和 `responseTimeoutMs` 进行调整。

### 按号码路由

当一个语音通话插件接收多个电话号码的来电，并且每个号码应表现为不同的线路时，请使用 `numbers`。例如，一个号码可以使用随意的个人助理，而另一个号码则使用商务角色、不同的响应代理以及不同的 TTS 语音。

路由是根据提供商提供的被拨 `To` 号码选择的。键必须是 E.164 号码。当来电到达时，语音通话会解析一次匹配的路由，将匹配的路由存储在通话记录上，并针对问候语、经典自动响应路径、实时咨询路径和 TTS 播放重用该有效配置。如果没有匹配的路由，则使用全局语音通话配置。拨出电话不使用 `numbers`；发起呼叫时，请显式传递拨出目标、消息和会话。

路由覆盖当前支持：

- `inboundGreeting`
- `tts`
- `agentId`
- `responseModel`
- `responseSystemPrompt`
- `responseTimeoutMs`

`tts` 路由值会与全局语音通话 `tts` 配置进行深度合并，因此通常只需覆盖提供商语音：

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

### 语音输出协议

对于自动响应，语音通话会在系统提示中附加严格的语音输出协议：

```text
{"spoken":"..."}
```

语音通话会谨慎提取语音文本：

- 忽略标记为推理/错误内容的负载。
- 解析直接 JSON、围栏 JSON 或内联 `"spoken"` 键。
- 回退到纯文本，并移除可能是规划/元数据的引导段落。

这使语音播放专注于面向呼叫者的文本，并避免将规划文本泄露到音频中。

### 对话启动行为

对于拨出 `conversation` 呼叫，首条消息的处理与实时播放状态相关联：

- 仅在初始问候语正在主动播放时，才抑制插队队列清除和自动响应。
- 如果初始播放失败，呼叫将返回 `listening`，并且初始消息保持排队状态以供重试。
- Twilio 流式传输的初始播放在流连接时开始，没有额外延迟。
- Barge-in 会中止当前的播放并清除已排队但尚未播放的 Twilio TTS 条目。已清除的条目将被解析为跳过（skipped），因此后续的响应逻辑可以继续，而无需等待永远不会播放的音频。
- 实时语音对话使用实时流自己的开场轮次。Voice Call **不会**为该初始消息发布旧的 `<Say>` TwiML 更新，因此出站 `<Connect><Stream>` 会话保持附加状态。

### Twilio 流断开连接宽限期

当 Twilio 媒体流断开连接时，Voice Call 会等待 **2000 毫秒** 然后再自动结束通话：

- 如果流在该窗口内重新连接，则取消自动结束。
- 如果在宽限期后没有流重新注册，则结束通话以防止通话卡在活动状态。

## 陈旧通话清理器（Stale call reaper）

使用 `staleCallReaperSeconds` 来结束从未收到终止 Webhook 的通话（例如，从未完成的通知模式通话）。默认值为 `0`（已禁用）。

推荐范围：

- **生产环境：** 对于通知类流程，为 `120`–`300` 秒。
- 保持此值 **高于 `maxDurationSeconds`**，以便正常通话可以完成。一个好的起点是 `maxDurationSeconds + 30–60` 秒。

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

当代理或隧道位于 Gateway(网关) 前面时，插件会重构用于签名验证的公共 URL。这些选项控制信任哪些转发的标头：

<ParamField path="webhookSecurity.allowedHosts" type="string[]">
  从转发标头中允许列出的主机。
</ParamField>
<ParamField path="webhookSecurity.trustForwardingHeaders" type="boolean">
  在没有允许列表的情况下信任转发标头。
</ParamField>
<ParamField path="webhookSecurity.trustedProxyIPs" type="string[]">
  仅当请求的远程 IP 与列表匹配时才信任转发标头。
</ParamField>

附加保护措施：

- 已为 Twilio 和 Plivo 启用 Webhook **重放保护（replay protection）**。重放的有效 Webhook 请求将被确认，但会跳过其副作用。
- Twilio 对话轮次在 `<Gather>` 回调中包含每轮次令牌，因此过时/重放的语音回调无法满足较新的待处理转录轮次。
- 当缺少提供商所需的签名头时，未经验证的 Webhook 请求会在读取正文之前被拒绝。
- 语音通话 Webhook 在签名验证之前使用共享的预认证正文配置（64 KB / 5 秒）以及每个 IP 的进行中请求数上限。

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

当 Gateway(网关) 已经在运行时，操作性的 `voicecall` 命令会委托给 Gateway(网关) 拥有的语音通话运行时，因此 CLI 不会绑定第二个 Webhook 服务器。如果无法连接到任何 Gateway(网关)，这些命令将回退到独立的 CLI 运行时。

`latency` 从默认的语音通话存储路径读取 `calls.jsonl`。
使用 `--file <path>` 指向不同的日志，并使用 `--last <n>` 将分析限制为最近的 N 条记录（默认为 200）。输出包括轮次延迟和监听等待时间的 p50/p90/p99。

## 代理工具

工具名称：`voice_call`。

| 操作            | 参数                                       |
| --------------- | ------------------------------------------ |
| `initiate_call` | `message`，`to?`，`mode?`，`dtmfSequence?` |
| `continue_call` | `callId`，`message`                        |
| `speak_to_user` | `callId`，`message`                        |
| `send_dtmf`     | `callId`，`digits`                         |
| `end_call`      | `callId`                                   |
| `get_status`    | `callId`                                   |

此代码仓库在 `skills/voice-call/SKILL.md` 处附带了一个匹配的技能文档。

## Gateway(网关) RPC

| 方法                 | 参数                                       |
| -------------------- | ------------------------------------------ |
| `voicecall.initiate` | `to?`，`message`，`mode?`，`dtmfSequence?` |
| `voicecall.continue` | `callId`，`message`                        |
| `voicecall.speak`    | `callId`, `message`                        |
| `voicecall.dtmf`     | `callId`, `digits`                         |
| `voicecall.end`      | `callId`                                   |
| `voicecall.status`   | `callId`                                   |

`dtmfSequence` 仅在与 `mode: "conversation"` 一起使用时才有效。如果通知模式（Notify-mode）的呼叫在连接后需要输入数字，应在呼叫建立后使用 `voicecall.dtmf`。

## 故障排除

### 设置失败：Webhook 暴露问题

请从运行 Gateway(网关) 的同一环境中运行设置：

```bash
openclaw voicecall setup
openclaw voicecall setup --json
```

对于 `twilio`、`telnyx` 和 `plivo`，`webhook-exposure` 必须显示为绿色。即使配置了 `publicUrl`，如果它指向本地或私有网络空间，仍然会失败，因为运营商无法回调这些地址。请勿将 `localhost`、`127.0.0.1`、`0.0.0.0`、`10.x`、`172.16.x`-`172.31.x`、`192.168.x`、`169.254.x`、`fc00::/7` 或 `fd00::/8` 用作 `publicUrl`。

Twilio 通知模式（Notify-mode）的出站呼叫会直接在创建呼叫请求中发送其初始 `<Say>` TwiML，因此第一条语音消息不依赖于 Twilio 获取 Webhook TwiML。但是，状态回调、对话呼叫、连接前 DTMF、实时流以及连接后呼叫控制仍然需要公开的 Webhook。

使用一种公开暴露路径：

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

更改配置后，重启或重新加载 Gateway(网关)，然后运行：

```bash
openclaw voicecall setup
openclaw voicecall smoke
```

除非传递了 `--yes`，否则 `voicecall smoke` 只是试运行（dry run）。

### 提供商凭证失败

检查所选提供商以及所需的凭证字段：

- Twilio：`twilio.accountSid`、`twilio.authToken` 和 `fromNumber`，或者
  `TWILIO_ACCOUNT_SID`、`TWILIO_AUTH_TOKEN` 和 `TWILIO_FROM_NUMBER`。
- Telnyx：`telnyx.apiKey`、`telnyx.connectionId`、`telnyx.publicKey` 和
  `fromNumber`。
- Plivo：`plivo.authId`、`plivo.authToken` 和 `fromNumber`。

凭证必须存在于 Gateway(网关) 主机上。编辑本地 shell 配置文件不会
影响正在运行的 Gateway(网关)，直到它重启或重新加载其
环境。

### 呼叫已开始，但提供商 Webhook 未到达

请确认提供商控制台指向确切的公共 Webhook URL：

```text
https://voice.example.com/voice/webhook
```

然后检查运行时状态：

```bash
openclaw voicecall status --call-id <id>
openclaw voicecall tail
openclaw logs --follow
```

常见原因：

- `publicUrl` 指向的路径与 `serve.path` 不同。
- 在 Gateway(网关) 启动后，隧道 URL 发生了变化。
- 代理转发请求，但剥离或重写了主机/协议标头。
- 防火墙或 DNS 将公共主机名路由到 Gateway(网关) 以外的其他位置。
- Gateway(网关) 在未启用语音呼叫插件的情况下重新启动了。

当 Gateway(网关) 前面有反向代理或隧道时，请将
`webhookSecurity.allowedHosts` 设置为公共主机名，或者对已知的代理地址
使用 `webhookSecurity.trustedProxyIPs`。仅当代理边界在您的
控制之下时，才使用 `webhookSecurity.trustForwardingHeaders`。

### 签名验证失败

提供商签名会根据 OpenClaw 从传入请求重建的公共 URL
进行检查。如果签名失败：

- 请确认提供商 Webhook URL 与 `publicUrl` 完全匹配，包括
  协议、主机和路径。
- 对于 ngrok 免费版 URL，当隧道主机名更改时，请更新 `publicUrl`。
- 确保代理保留了原始的主机和协议标头，或者配置
  `webhookSecurity.allowedHosts`。
- 切勿在本地测试之外启用 `skipSignatureVerification`。

### Google Meet Twilio 加入失败

Google Meet 使用此插件进行 Twilio 拨入加入。首先验证语音通话：

```bash
openclaw voicecall setup
openclaw voicecall smoke --to "+15555550123"
```

然后明确验证 Google Meet 传输：

```bash
openclaw googlemeet setup --transport twilio
```

如果语音通话显示为绿色（正常）但 Meet 参与者从未加入，请检查 Meet
拨入号码、PIN 和 `--dtmf-sequence`。即使电话通话状态良好，
会议也可能会拒绝或忽略错误的 DTMF 序列。

Google Meet 通过 `voicecall.start` 并使用预连接 DTMF 序列
启动 Twilio 电话端。PIN 派生的序列包含 Google Meet 插件的
`voiceCall.dtmfDelayMs` 作为前导 Twilio 等待数字。默认值为 12 秒，
因为 Meet 拨入提示可能会延迟到达。语音通话随后会在请求介绍问候之前
重定向回实时处理。

使用 `openclaw logs --follow` 查看实时阶段跟踪。正常的 Twilio Meet
加入会按以下顺序记录：

- Google Meet 将 Twilio 加入委托给语音通话。
- 语音通话存储预连接 DTMF TwiML。
- Twilio 初始 TwiML 在实时处理之前被消耗并提供服务。
- 语音通话为 Twilio 通话提供实时 TwiML。
- Google Meet 在 DTMF 后的延迟之后，使用 `voicecall.speak` 请求介绍语音。

`openclaw voicecall tail` 仍显示持久化的通话记录；它对于
通话状态和转录很有用，但并非所有的 webhook/实时转换都会
出现在那里。

### 实时通话没有语音

确认只启用了一种音频模式。`realtime.enabled` 和
`streaming.enabled` 不能同时为 true。

对于实时 Twilio 通话，还要验证：

- 实时提供商插件已加载并注册。
- `realtime.provider` 未设置或命名了已注册的提供商。
- 提供商 API 密钥对 Gateway(网关) 进程可用。
- `openclaw logs --follow` 显示已提供实时 TwiML、实时桥接
  已启动以及初始问候已排队。

## 相关

- [Talk mode](/zh/nodes/talk)
- [Text-to-speech](/zh/tools/tts)
- [Voice wake](/zh/nodes/voicewake)
