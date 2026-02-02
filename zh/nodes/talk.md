> [!NOTE]
> 本页正在翻译中。

---
summary: "Talk 模式：与 ElevenLabs TTS 的连续语音对话"
read_when:
  - 在 macOS/iOS/Android 上实现 Talk 模式
  - 调整语音/TTS/打断行为
---
# Talk Mode

Talk 模式是一个连续语音对话循环：
1) 听取语音
2) 将转写发送给模型（主会话，chat.send）
3) 等待回复
4) 通过 ElevenLabs 朗读（流式播放）

## 行为（macOS）
- Talk 模式启用时显示**常驻 overlay**。
- **Listening → Thinking → Speaking** 三阶段切换。
- 在**短暂停顿**（静音窗口）时发送当前转写。
- 回复**会写入 WebChat**（等同于打字）。
- **说话打断**（默认开启）：用户在助手说话时开口，会停止播放，并记录打断时间戳用于下一次 prompt。

## 回复中的语音指令

助手可在回复顶部插入**单行 JSON** 来控制语音：

```json
{"voice":"<voice-id>","once":true}
```

规则：
- 只读取第一条非空行。
- 未知键会被忽略。
- `once: true` 仅对当前回复生效。
- 不带 `once` 时，该语音会成为 Talk 模式的新默认。
- JSON 行在 TTS 播放前会被剥离。

支持的键：
- `voice` / `voice_id` / `voiceId`
- `model` / `model_id` / `modelId`
- `speed`, `rate`（WPM）, `stability`, `similarity`, `style`, `speakerBoost`
- `seed`, `normalize`, `lang`, `output_format`, `latency_tier`
- `once`

## 配置（`~/.openclaw/openclaw.json`）
```json5
{
  "talk": {
    "voiceId": "elevenlabs_voice_id",
    "modelId": "eleven_v3",
    "outputFormat": "mp3_44100_128",
    "apiKey": "elevenlabs_api_key",
    "interruptOnSpeech": true
  }
}
```

默认值：
- `interruptOnSpeech`: true
- `voiceId`: 若未设置则回退到 `ELEVENLABS_VOICE_ID` / `SAG_VOICE_ID`（或在 API key 可用时使用第一个 ElevenLabs voice）
- `modelId`: 未设置时默认 `eleven_v3`
- `apiKey`: 回退到 `ELEVENLABS_API_KEY`（或 gateway 的 shell profile 若可用）
- `outputFormat`: macOS/iOS 默认 `pcm_44100`，Android 默认 `pcm_24000`（设置 `mp3_*` 可强制 MP3 流式）

## macOS UI
- 菜单栏开关：**Talk**
- 配置页：**Talk Mode** 组（voice id + interrupt 开关）
- Overlay：
  - **Listening**：云朵随麦克风电平脉动
  - **Thinking**：下沉动画
  - **Speaking**：放射环
  - 点击云朵：停止朗读
  - 点击 X：退出 Talk 模式

## 备注
- 需要 Speech + Microphone 权限。
- 使用 `chat.send`（会话 key `main`）。
- TTS 使用 ElevenLabs 流式 API，macOS/iOS/Android 采用增量播放以降低延迟。
- `eleven_v3` 的 `stability` 只能是 `0.0`、`0.5` 或 `1.0`；其他模型接受 `0..1`。
- 设置 `latency_tier` 时必须为 `0..4`。
- Android 支持 `pcm_16000`、`pcm_22050`、`pcm_24000`、`pcm_44100` 以便低延迟 AudioTrack 流式。
