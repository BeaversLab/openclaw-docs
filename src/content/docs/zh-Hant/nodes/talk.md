---
summary: "對話模式：使用 ElevenLabs TTS 進行持續語音對話"
read_when:
  - Implementing Talk mode on macOS/iOS/Android
  - Changing voice/TTS/interrupt behavior
title: "對話模式"
---

# 對話模式

對話模式是一個持續的語音對話循環：

1. 聆聽語音
2. 將文字記錄發送給模型（主會話，chat.send）
3. 等待回應
4. 透過 ElevenLabs 說出來（串流播放）

## 行為 (macOS)

- 啟用對話模式時會有 **常駐覆蓋層 (Always-on overlay)**。
- **聆聽 → 思考 → 說話** 階段轉換。
- 在 **短暫停頓**（靜音視窗）時，會發送目前的文字記錄。
- 回應會 **寫入 WebChat**（與輸入相同）。
- **語音中斷**（預設開啟）：如果使用者在助理說話時開始說話，我們會停止播放並記錄中斷時間戳記以供下一次提示使用。

## 回應中的語音指令

助手可以在回覆前加上**單行 JSON** 來控制語音：

```json
{ "voice": "<voice-id>", "once": true }
```

規則：

- 僅限第一個非空行。
- 未知的鍵會被忽略。
- `once: true` 僅套用於當前回覆。
- 如果沒有 `once`，該語音將成為對話模式的新預設值。
- JSON 行會在 TTS 播放前被移除。

支援的鍵：

- `voice` / `voice_id` / `voiceId`
- `model` / `model_id` / `modelId`
- `speed`, `rate` (WPM), `stability`, `similarity`, `style`, `speakerBoost`
- `seed`, `normalize`, `lang`, `output_format`, `latency_tier`
- `once`

## 組態 (`~/.openclaw/openclaw.json`)

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

預設值：

- `interruptOnSpeech`：true
- `silenceTimeoutMs`：未設定時，Talk 會在發送文字記錄之前保留平台預設的暫停時間視窗 (`700 ms on macOS and Android, 900 ms on iOS`)
- `voiceId`：回退至 `ELEVENLABS_VOICE_ID` / `SAG_VOICE_ID` （或在 API 金鑰可用時使用第一個 ElevenLabs 語音）
- `modelId`：未設定時預設為 `eleven_v3`
- `apiKey`：回退至 `ELEVENLABS_API_KEY` （或在可用時使用 gateway shell profile）
- `outputFormat`：在 macOS/iOS 上預設為 `pcm_44100`，在 Android 上預設為 `pcm_24000`（設定 `mp3_*` 以強制 MP3 串流）

## macOS 使用者介面

- 選單列切換：**Talk**（對談）
- Config 分頁：**Talk Mode** 群組（語音 ID + 插話切換）
- 覆蓋層：
  - **Listening**（聆聽中）：雲朵隨麥克風音量脈動
  - **Thinking**（思考中）：下沉動畫
  - **Speaking**（說話中）：向外發散的圓環
  - 點擊雲朵：停止說話
  - 點擊 X：退出 Talk 模式

## 註記

- 需要語音與麥克風權限。
- 對於 Session key `main` 使用 `chat.send`。
- TTS 使用 ElevenLabs 串流 API 搭配 `ELEVENLABS_API_KEY`，並在 macOS/iOS/Android 上使用增量播放以降低延遲。
- `stability` 用於 `eleven_v3` 時驗證為 `0.0`、`0.5` 或 `1.0`；其他模型接受 `0..1`。
- `latency_tier` 在設定時會驗證為 `0..4`。
- Android 支援 `pcm_16000`、`pcm_22050`、`pcm_24000` 和 `pcm_44100` 輸出格式，用於低延遲 AudioTrack 串流。
