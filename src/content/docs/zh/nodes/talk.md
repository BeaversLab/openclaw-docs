---
summary: "Talk mode：跨本地 STT/TTS 和实时语音的连续语音对话"
read_when:
  - Implementing Talk mode on macOS/iOS/Android
  - Changing voice/TTS/interrupt behavior
title: "Talk mode"
---

Talk mode 有两种运行时形态：

- 原生 macOS/iOS/Android Talk 使用本地语音识别、Gateway(网关) 聊天和 macOSiOSAndroidGateway(网关)`talk.speak` TTS。节点会宣告 `talk` 能力并声明它们支持的 `talk.*` 命令。
- 浏览器 Talk 使用 `talk.client.create` 来处理客户端拥有的 `webrtc` 和 `provider-websocket` 会话，或者使用 `talk.session.create`Gateway(网关) 来处理 Gateway(网关) 拥有的 `gateway-relay` 会话。`managed-room`Gateway(网关) 保留用于 Gateway(网关) 交接和对讲机房间。
- Android Talk 可以选择加入 Gateway(网关) 拥有的实时中继会话，方法是使用 AndroidGateway(网关)`talk.realtime.mode: "realtime"` 和 `talk.realtime.transport: "gateway-relay"`Gateway(网关)。否则它将保持使用本地语音识别、Gateway(网关) 聊天和 `talk.speak`。
- 仅转录的客户端使用 `talk.session.create({ mode: "transcription", transport: "gateway-relay", brain: "none" })`，然后是 `talk.session.appendAudio`、`talk.session.cancelTurn` 和 `talk.session.close`，当它们需要字幕或听写而不需要助手语音响应时。

原生 Talk 是一个连续的语音对话循环：

1. 监听语音
2. 通过活动会话将转录内容发送到模型
3. 等待响应
4. 通过配置的 Talk 提供商 (`talk.speak`) 进行语音播放

浏览器实时 Talk 通过 `talk.client.toolCall` 转发提供商工具调用；浏览器客户端不会直接调用 `chat.send` 进行实时咨询。
当实时咨询处于活动状态时，Talk 客户端可以使用 `talk.client.steer` 或
`talk.session.steer` 将语音输入分类为 `status`、`steer`、`cancel` 或
`followup`。接受的引导会被排队到活动的嵌入式运行中；被拒绝的引导会返回结构化原因，例如 `no_active_run`、`not_streaming`
或 `compacting`。

仅转录 Talk 发出的通用 Talk 事件信封与实时和 STT/TTS 会话相同，但使用 `mode: "transcription"` 和 `brain: "none"`。它适用于字幕、听写和仅观察的语音捕获；一次性上传的语音笔记仍然使用 media/audio 路径。

## 行为 (macOS)

- 启用 Talk 模式时**始终显示覆盖层**。
- **倾听 → 思考 → 说话** 阶段转换。
- 在**短暂停**（静音窗口）时，发送当前的转录内容。
- 回复被**写入 WebChat**（与输入相同）。
- **语音中断**（默认开启）：如果用户在助手说话时开始说话，我们会停止播放并记录中断时间戳以供下一次提示使用。

## 回复中的语音指令

助手可以在其回复前加上**单行 JSON** 来控制语音：

```json
{ "voice": "<voice-id>", "once": true }
```

规则：

- 仅限第一行非空行。
- 未知的键将被忽略。
- `once: true` 仅适用于当前回复。
- 如果没有 `once`，该语音将成为 Talk 模式的新默认值。
- JSON 行会在 TTS 播放之前被剥离。

支持的键：

- `voice` / `voice_id` / `voiceId`
- `model` / `model_id` / `modelId`
- `speed`、`rate` (WPM)、`stability`、`similarity`、`style`、`speakerBoost`
- `seed`、`normalize`、`lang`、`output_format`、`latency_tier`
- `once`

## Config (`~/.openclaw/openclaw.json`)

```json5
{
  talk: {
    provider: "elevenlabs",
    providers: {
      elevenlabs: {
        voiceId: "elevenlabs_voice_id",
        modelId: "eleven_v3",
        outputFormat: "mp3_44100_128",
        apiKey: "elevenlabs_api_key",
      },
      mlx: {
        modelId: "mlx-community/Soprano-80M-bf16",
      },
      system: {},
    },
    speechLocale: "ru-RU",
    silenceTimeoutMs: 1500,
    interruptOnSpeech: true,
    realtime: {
      provider: "openai",
      providers: {
        openai: {
          apiKey: "openai_api_key",
          model: "gpt-realtime-2",
          voice: "cedar",
        },
      },
      instructions: "Speak warmly and keep answers brief.",
      mode: "realtime",
      transport: "webrtc",
      brain: "agent-consult",
    },
  },
}
```

默认值：

- `interruptOnSpeech`: true
- `silenceTimeoutMs`: 如果未设置，Talk 将在发送转录之前保留平台默认的暂停窗口 (`700 ms on macOS and Android, 900 ms on iOS`)
- `provider`：选择活跃的 Talk 提供商。使用 `elevenlabs`、`mlx` 或 `system`macOS 进行 macOS 本地播放路径操作。
- `providers.<provider>.voiceId`：针对 ElevenLabs 回退到 `ELEVENLABS_VOICE_ID` / `SAG_VOICE_ID`API（或当 API 密钥可用时的第一个 ElevenLabs 语音）。
- `providers.elevenlabs.modelId`：未设置时默认为 `eleven_v3`。
- `providers.mlx.modelId`：未设置时默认为 `mlx-community/Soprano-80M-bf16`。
- `providers.elevenlabs.apiKey`：回退到 `ELEVENLABS_API_KEY`（或可用的 gateway shell 配置文件）。
- `consultThinkingLevel`OpenClaw：可选的思维级别覆盖，用于实时 `openclaw_agent_consult` 调用背后的完整 OpenClaw 代理运行。
- `consultFastMode`：可选的快速模式覆盖，用于实时 `openclaw_agent_consult` 调用。
- `realtime.provider`：选择活跃的浏览器/服务器实时语音提供商。使用 `openai` 进行 WebRTC，使用 `google`Gateway(网关) 进行提供商 WebSocket，或通过 Gateway 中继使用仅桥接提供商。
- `realtime.providers.<provider>`API 存储提供商拥有的实时配置。浏览器仅接收临时或受限的会话凭据，绝不会接收标准 API 密钥。
- `realtime.providers.openai.voice`OpenAI：内置 OpenAI Realtime 语音 ID。当前的 `gpt-realtime-2` 语音包括 `alloy`、`ash`、`ballad`、`coral`、`echo`、`sage`、`shimmer`、`verse`、`marin` 和 `cedar`；推荐使用 `marin` 和 `cedar` 以获得最佳质量。
- `realtime.transport`: `webrtc` 和 `provider-websocket`Android 是浏览器实时传输。Android 仅当此值为 `gateway-relay`Android 时才使用实时中继；否则 Android Talk 使用其原生的 STT/TTS 循环。
- `realtime.brain`: `agent-consult`Gateway(网关) 通过 Gateway(网关) 策略路由实时工具调用；`direct-tools` 是遗留的直接工具兼容性行为；`none` 用于转录或外部编排。
- `realtime.consultRouting`: `provider-direct` 在跳过 `openclaw_agent_consult` 时保留提供商的直接回复；`force-agent-consult`Gateway(网关)OpenClaw 使 Gateway(网关) 中继路由通过 OpenClaw 传递已完成的用户转录。
- `realtime.instructions`OpenClawOpenClaw: 将面向提供商的系统指令附加到 OpenClaw 的内置实时提示。用它来设置语音风格和语调；OpenClaw 会保留默认的 `openclaw_agent_consult` 指导。
- `talk.catalog` 会暴露每个提供商的有效模式、传输、大脑策略、实时音频格式和能力标志，以便第一方 Talk 客户端可以避免不支持的组合。
- 流式转录提供商是通过 `talk.catalog.transcription`Gateway(网关) 发现的。当前的 Gateway(网关) 中继使用语音通话流式提供商配置，直到添加专用的 Talk 转录配置界面。
- `speechLocale`iOSmacOS: iOS/macOS 上设备端 Talk 语音识别的可选 BCP 47 语言环境 ID。留空以使用设备默认值。
- `outputFormat`: 在 macOS/iOS 上默认为 `pcm_44100`macOSiOS，在 Android 上默认为 `pcm_24000`Android（设置 `mp3_*` 以强制 MP3 流式传输）

## macOS UI

- 菜单栏切换：**Talk**
- 配置选项卡：**Talk 模式**组（语音 ID + 中断切换）
- 覆盖层：
  - **聆听中**：云朵随麦克风级别脉动
  - **思考中**：下沉动画
  - **说话中**：辐射环
  - 点击云朵：停止说话
  - 点击 X：退出 Talk 模式

## Android 界面

- 语音选项卡切换：**Talk**
- 手动**麦克风**和 **Talk** 是互斥的运行时捕获模式。
- 当应用离开前台或用户离开语音选项卡时，手动麦克风会停止。
- Talk 模式会一直运行，直到切换关闭或 Android 节点断开连接，并且在活动时使用 Android 的麦克风前台服务类型。

## 注意事项

- 需要语音 + 麦克风权限。
- 原生 Talk 使用活动的 Gateway(网关) 会话，并且仅在响应事件不可用时回退到历史轮询。
- 浏览器实时 Talk 为 `openclaw_agent_consult` 使用 `talk.client.toolCall`，而不是向提供商拥有的浏览器会话公开 `chat.send`。
- 仅转录 Talk 使用 `talk.session.create`、`talk.session.appendAudio`、`talk.session.cancelTurn` 和 `talk.session.close`；客户端订阅 `talk.event` 以获取部分/最终转录更新。
- 网关使用活动的 Talk 提供商通过 `talk.speak` 解析 Talk 播放。仅当该 Android 不可用时，RPC 才会回退到本地系统 TTS。
- macOS 本地 MLX 播放使用捆绑的 `openclaw-mlx-tts` 辅助程序（如果存在），或 `PATH` 上的可执行文件。在开发期间设置 `OPENCLAW_MLX_TTS_BIN` 指向自定义辅助程序二进制文件。
- `eleven_v3` 的 `stability` 被验证为 `0.0`、`0.5` 或 `1.0`；其他模型接受 `0..1`。
- `latency_tier` 在设置时被验证为 `0..4`。
- Android 支持 Android`pcm_16000`、`pcm_22050`、`pcm_24000` 和 `pcm_44100` 输出格式，用于低延迟 AudioTrack 流式传输。

## 相关

- [语音唤醒](/zh/nodes/voicewake)
- [音频和语音笔记](/zh/nodes/audio)
- [媒体理解](/zh/nodes/media-understanding)
