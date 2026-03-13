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
4. 通过 ElevenLabs 播放（流式播放）

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
- 如果没有 `once`，该语音将成为 Talk Mode 的新默认语音。
- 在 TTS 播放之前，JSON 行将被移除。

支持的键：

- `voice` / `voice_id` / `voiceId`
- `model` / `model_id` / `modelId`
- `speed`, `rate` (WPM), `stability`, `similarity`, `style`, `speakerBoost`
- `seed`, `normalize`, `lang`, `output_format`, `latency_tier`
- `once`

## 配置 (`~/.openclaw/openclaw.json`)

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
- `silenceTimeoutMs`: 未设置时，Talk 将在发送转录内容之前保持平台默认的暂停窗口 (`700 ms on macOS and Android, 900 ms on iOS`)
- `voiceId`: 回退到 `ELEVENLABS_VOICE_ID` / `SAG_VOICE_ID`（或者在 API 密钥可用时的第一个 ElevenLabs 语音）
- `modelId`: 未设置时默认为 `eleven_v3`
- `apiKey`: 回退到 `ELEVENLABS_API_KEY`（或者在可用时的 gateway shell profile）
- `outputFormat`: 在 macOS/iOS 上默认为 `pcm_44100`，在 Android 上默认为 `pcm_24000`（设置 `mp3_*` 以强制 MP3 流式传输）

## macOS 界面

- 菜单栏开关：**Talk**
- 配置选项卡：**Talk Mode** 组（语音 ID + 中断开关）
- 覆盖层：
  - **Listening（监听）**：云朵随麦克风音量脉动
  - **Thinking（思考）**：下沉动画
  - **Speaking（说话）**：扩散的圆环
  - 点击云朵：停止说话
  - 点击 X：退出 Talk 模式

## 注意事项

- 需要语音和麦克风权限。
- 针对会话密钥 `main` 使用 `chat.send`。
- TTS 使用 ElevenLabs 流式 API，配合 `ELEVENLABS_API_KEY` 并在 macOS/iOS/Android 上进行增量播放以降低延迟。
- `stability` 用于 `eleven_v3` 时，会验证为 `0.0`、`0.5` 或 `1.0`；其他模型接受 `0..1`。
- 设置时，`latency_tier` 会验证为 `0..4`。
- Android 支持用于低延迟 AudioTrack 流式传输的 `pcm_16000`、`pcm_22050`、`pcm_24000` 和 `pcm_44100` 输出格式。

import zh from '/components/footer/zh.mdx';

<zh />
