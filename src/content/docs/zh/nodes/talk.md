---
summary: "Talk mode: continuous speech conversations with configured TTS providers"
read_when:
  - Implementing Talk mode on macOS/iOS/Android
  - Changing voice/TTS/interrupt behavior
title: "Talk mode"
---

Talk mode 是一个持续的语音对话循环：

1. 监听语音
2. 将转录内容发送给模型（主会话，chat.send）
3. 等待响应
4. 通过已配置的 Talk 提供商（`talk.speak`）进行播放

## 行为 (macOS)

- **常驻覆盖层**，当 Talk mode 激活时显示。
- **聆听 → 思考 → 讲话** 阶段转换。
- 在**短暂停顿**（静音窗口）时，发送当前的转录内容。
- 回复会被**写入 WebChat**（与输入相同）。
- **语音中断**（默认开启）：如果用户在助手讲话时开始说话，我们将停止播放并记录中断时间戳用于下一次提示。

## 回复中的语音指令

助手可能会在其回复前加上**一行 JSON**来控制语音：

```json
{ "voice": "<voice-id>", "once": true }
```

规则：

- 仅限第一个非空行。
- 未知的键将被忽略。
- `once: true` 仅适用于当前回复。
- 如果没有 `once`，该语音将成为 Talk mode 的新默认值。
- JSON 行将在 TTS 播放前被移除。

支持的键：

- `voice` / `voice_id` / `voiceId`
- `model` / `model_id` / `modelId`
- `speed`, `rate` (WPM), `stability`, `similarity`, `style`, `speakerBoost`
- `seed`, `normalize`, `lang`, `output_format`, `latency_tier`
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
  },
}
```

默认值：

- `interruptOnSpeech`: true
- `silenceTimeoutMs`: 如果未设置，Talk 将保持平台默认的暂停窗口，然后再发送转录内容（`700 ms on macOS and Android, 900 ms on iOS`）
- `provider`：选择活动的 Talk 提供商。使用 `elevenlabs`、`mlx` 或 `system` 用于 macOS 本地播放路径。
- `providers.<provider>.voiceId`：对于 ElevenLabs，回退到 `ELEVENLABS_VOICE_ID` / `SAG_VOICE_ID`（或在 API 密钥可用时使用第一个 ElevenLabs 语音）。
- `providers.elevenlabs.modelId`：未设置时默认为 `eleven_v3`。
- `providers.mlx.modelId`：未设置时默认为 `mlx-community/Soprano-80M-bf16`。
- `providers.elevenlabs.apiKey`：回退到 `ELEVENLABS_API_KEY`（或可用的网关 shell 配置文件）。
- `speechLocale`：iOS/macOS 上设备端 Talk 语音识别的可选 BCP 47 区域设置 ID。留空以使用设备默认值。
- `outputFormat`：在 macOS/iOS 上默认为 `pcm_44100`，在 Android 上默认为 `pcm_24000`（设置 `mp3_*` 以强制 MP3 流式传输）

## macOS UI

- 菜单栏切换：**Talk**
- 配置选项卡：**Talk Mode** 组（voice id + interrupt toggle）
- 覆盖层：
  - **Listening**：云朵随麦克风水平脉动
  - **Thinking**：下沉动画
  - **Speaking**：辐射环
  - 点击云朵：停止说话
  - 点击 X：退出 Talk 模式

## Android UI

- 语音选项卡切换：**Talk**
- 手动 **Mic** 和 **Talk** 是互斥的运行时捕获模式。
- 当应用离开前台或用户离开语音选项卡时，手动麦克风停止。
- Talk 模式持续运行，直到切换关闭或 Android 节点断开连接，并在活动时使用 Android 的麦克风前台服务类型。

## Notes

- 需要语音 + 麦克风权限。
- 对会话密钥 `main` 使用 `chat.send`。
- 网关使用活动的 Talk 提供商通过 `talk.speak` 解析 Talk 播放。仅当该 RPC 不可用时，Android 才会回退到本地系统 TTS。
- macOS 本地 MLX 播放在存在时使用捆绑的 `openclaw-mlx-tts` 助手，或使用 `PATH` 上的可执行文件。设置 `OPENCLAW_MLX_TTS_BIN` 以在开发期间指向自定义助手二进制文件。
- `stability` for `eleven_v3` 被验证为 `0.0`、`0.5` 或 `1.0`；其他模型接受 `0..1`。
- `latency_tier` 在设置时被验证为 `0..4`。
- Android 支持低延迟 AudioTrack 流式传输的 `pcm_16000`、`pcm_22050`、`pcm_24000` 和 `pcm_44100` 输出格式。

## 相关

- [Voice wake](/zh/nodes/voicewake)
- [Audio and voice notes](/zh/nodes/audio)
- [Media understanding](/zh/nodes/media-understanding)
