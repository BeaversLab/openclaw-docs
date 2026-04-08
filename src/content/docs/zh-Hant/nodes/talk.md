---
summary: "Talk 模式：使用 ElevenLabs TTS 的連續語音對話"
read_when:
  - Implementing Talk mode on macOS/iOS/Android
  - Changing voice/TTS/interrupt behavior
title: "Talk 模式"
---

# Talk 模式

Talk 模式是一個連續的語音對話循環：

1. 聆聽語音
2. 將文字紀錄傳送給模型（主會話，chat.send）
3. 等待回應
4. 透過設定的 Talk 提供者 (`talk.speak`) 進行說話

## 行為（macOS）

- 啟用 Talk 模式時，**常駐覆蓋層**（Always-on overlay）。
- **聆聽 → 思考 → 講話** 的階段轉換。
- 在**短暫暫停**（靜音視窗）時，會傳送目前的文字紀錄。
- 回覆會**寫入 WebChat**（與輸入相同）。
- **語音中斷**（預設開啟）：如果使用者在助理說話時開始說話，我們會停止播放並記錄中斷時間戳記供下一次提示使用。

## 回覆中的語音指令

助理可能會在其回覆前加上**單行 JSON** 來控制語音：

```json
{ "voice": "<voice-id>", "once": true }
```

規則：

- 僅限第一行非空行。
- 未知的金鑰會被忽略。
- `once: true` 僅套用於目前的回覆。
- 如果沒有 `once`，該語音將成為 Talk 模式的新預設值。
- JSON 行會在 TTS 播放前被移除。

支援的金鑰：

- `voice` / `voice_id` / `voiceId`
- `model` / `model_id` / `modelId`
- `speed`, `rate` (WPM), `stability`, `similarity`, `style`, `speakerBoost`
- `seed`, `normalize`, `lang`, `output_format`, `latency_tier`
- `once`

## Config (`~/.openclaw/openclaw.json`)

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

- `interruptOnSpeech`: true
- `silenceTimeoutMs`: 當未設定時，Talk 在發送文字記錄前會保留平台預設的暫停視窗 (`700 ms on macOS and Android, 900 ms on iOS`)
- `voiceId`: 會回退到 `ELEVENLABS_VOICE_ID` / `SAG_VOICE_ID` (或在有可用的 API 金鑰時使用第一個 ElevenLabs 語音)
- `modelId`: 當未設定時預設為 `eleven_v3`
- `apiKey`: 會回退到 `ELEVENLABS_API_KEY` (或可用的 gateway shell profile)
- `outputFormat`: 在 macOS/iOS 上預設為 `pcm_44100`，在 Android 上預設為 `pcm_24000` (設定 `mp3_*` 以強制使用 MP3 串流)

## macOS 使用者介面

- 選單列切換：**Talk**
- Config 分頁：**Talk Mode** 群組（voice id + interrupt toggle）
- 覆蓋層：
  - **Listening**：雲端隨麥克風音量脈動
  - **Thinking**：下沉動畫
  - **Speaking**：向外擴散的環狀波紋
  - 點擊雲端：停止說話
  - 點擊 X：退出 Talk 模式

## 備註

- 需要語音 + 麥克風權限。
- 對會話金鑰 `main` 使用 `chat.send`。
- Gateway 會使用使用中的 Talk 提供者透過 `talk.speak` 來解析 Talk 播放。僅當該 RPC 不可用時，Android 才會回退到本地系統 TTS。
- `eleven_v3` 的 `stability` 會被驗證為 `0.0`、`0.5` 或 `1.0`；其他模型接受 `0..1`。
- 設定時，`latency_tier` 會驗證為 `0..4`。
- Android 支援 `pcm_16000`、`pcm_22050`、`pcm_24000` 和 `pcm_44100` 輸出格式，用於低延遲 AudioTrack 串流。
