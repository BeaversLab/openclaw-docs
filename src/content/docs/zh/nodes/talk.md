---
summary: "Talk mode：使用 ElevenLabs TTS 进行连续语音对话"
read_when:
  - Implementing Talk mode on macOS/iOS/Android
  - Changing voice/TTS/interrupt behavior
title: "Talk Mode"
---

# 对话模式

对话模式是一个连续的语音对话循环：

1. 监听语音
2. 将转录文本发送给模型（主会话，chat.send）
3. 等待响应
4. 通过配置的 Talk 提供商（`talk.speak`）朗读它

## 行为 (macOS)

- 启用对话模式时显示**常驻覆盖层**。
- **聆听 → 思考 → 讲话** 阶段转换。
- 在**短暂停顿**（静音窗口）时，发送当前的转录文本。
- 回复会**写入 WebChat**（与手动输入相同）。
- **语音打断**（默认开启）：如果用户在助手讲话时开始说话，我们将停止播放并记录中断时间戳用于下一次提示。

## 回复中的语音指令

助手可以在其回复前加上**单行 JSON** 来控制语音：

```json
{ "voice": "<voice-id>", "once": true }
```

规则：

- 仅限第一行非空行。
- 忽略未知的键。
- `once: true` 仅适用于当前回复。
- 如果没有 `once`，该声音将成为 Talk 模式的新默认值。
- 在 TTS 播放之前，JSON 行将被移除。

支持的键：

- `voice` / `voice_id` / `voiceId`
- `model` / `model_id` / `modelId`
- `speed`, `rate` (WPM), `stability`, `similarity`, `style`, `speakerBoost`
- `seed`, `normalize`, `lang`, `output_format`, `latency_tier`
- `once`

## 配置（`~/.openclaw/openclaw.json`）

```json5
{
  talk: {
    voiceId: "elevenlabs_voice_id",
    modelId: "eleven_v3",
    outputFormat: "mp3_44100_128",
    apiKey: "elevenlabs_api_key",
    silenceTimeoutMs: 1500,
    interruptOnSpeech: true,
  },
}
```

默认值：

- `interruptOnSpeech`: true
- `silenceTimeoutMs`: 未设置时，Talk 将在发送转录文本之前保持平台默认的暂停窗口（`700 ms on macOS and Android, 900 ms on iOS`）
- `voiceId`: 回退到 `ELEVENLABS_VOICE_ID` / `SAG_VOICE_ID`（或者当 API 密钥可用时的第一个 ElevenLabs 声音）
- `modelId`: 未设置时默认为 `eleven_v3`
- `apiKey`: 回退到 `ELEVENLABS_API_KEY`（如果可用，则为网关 Shell 配置文件）
- `outputFormat`: 在 macOS/iOS 上默认为 `pcm_44100`，在 Android 上默认为 `pcm_24000`（设置 `mp3_*` 以强制 MP3 流式传输）

## macOS 界面

- 菜单栏开关：**Talk**
- 配置选项卡：**Talk Mode** 组（语音 ID + 中断开关）
- 覆盖层：
  - **Listening**: 云随麦克风音量律动
  - **Thinking**: 下沉动画
  - **Speaking**: 扩散的环状波纹
  - 点击云朵：停止说话
  - 点击 X：退出 Talk 模式

## 注意事项

- 需要语音和麦克风权限。
- 使用 `chat.send` 针对会话密钥 `main`。
- 网关使用活动的 Talk 提供商通过 `talk.speak` 解析 Talk 回放。仅当该 RPC 不可用时，Android 才会回退到本地系统 TTS。
- `stability` 针对 `eleven_v3` 被验证为 `0.0`、`0.5` 或 `1.0`；其他模型接受 `0..1`。
- 设置时，`latency_tier` 会验证为 `0..4`。
- Android 支持 `pcm_16000`、`pcm_22050`、`pcm_24000` 和 `pcm_44100` 输出格式，用于低延迟 AudioTrack 流式传输。
