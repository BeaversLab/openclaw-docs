---
summary: "Talk mode：使用 ElevenLabs TTS 進行連續語音對話"
read_when:
  - 在 macOS/iOS/Android 上實作 Talk 模式
  - 變更聲音/TTS/插斷行為
title: "Talk Mode"
---

# Talk Mode

Talk 模式是一個連續的語音對話迴圈：

1. 聆聽語音
2. 將文字紀錄發送至模型（主工作階段，chat.send）
3. 等待回應
4. 透過 ElevenLabs 播放（串流播放）

## 行為

- 啟用 Talk 模式時**常駐覆蓋層**。
- **聆聽 → 思考 → 說話**階段轉換。
- 在**短暫暫停**（靜音視窗）時，發送目前的文字紀錄。
- 回覆會**寫入 WebChat**（與輸入相同）。
- **語音插斷**（預設開啟）：如果使用者在助理說話時開始說話，我們會停止播放並記錄插斷時間戳記以供下一次提示使用。

## 回覆中的語音指令

助理可能會在其回覆前加上**單行 JSON** 來控制語音：

```json
{ "voice": "<voice-id>", "once": true }
```

規則：

- 僅限第一個非空行。
- 未知鍵會被忽略。
- `once: true` 僅適用於目前的回覆。
- 如果沒有 `once`，該語音將成為 Talk 模式的新預設值。
- JSON 行會在 TTS 播放前被移除。

支援的鍵：

- `voice` / `voice_id` / `voiceId`
- `model` / `model_id` / `modelId`
- `speed`、`rate` (WPM)、`stability`、`similarity`、`style`、`speakerBoost`
- `seed`、`normalize`、`lang`、`output_format`、`latency_tier`
- `once`

## 設定 (`~/.openclaw/openclaw.json`)

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
- `silenceTimeoutMs`：未設定時，Talk 會在發送文字紀錄前保留平台預設的暫停視窗 (`700 ms on macOS and Android, 900 ms on iOS`)
- `voiceId`：會回退至 `ELEVENLABS_VOICE_ID` / `SAG_VOICE_ID`（或當有 API 金鑰可用的第一個 ElevenLabs 語音）
- `modelId`: 若未設定，預設為 `eleven_v3`
- `apiKey`: 回退至 `ELEVENLABS_API_KEY` (若可用則使用 gateway shell profile)
- `outputFormat`: 在 macOS/iOS 上預設為 `pcm_44100`，在 Android 上預設為 `pcm_24000` (設定 `mp3_*` 以強制 MP3 串流)

## macOS UI

- 選單列切換：**Talk**
- 設定頁籤：**Talk Mode** 群組 (語音 ID + 中斷切換開關)
- 覆蓋層：
  - **Listening**：雲朵隨麥克風音量脈動
  - **Thinking**：下沉動畫
  - **Speaking**：向外發散的波紋
  - 點擊雲朵：停止說話
  - 點擊 X：退出 Talk 模式

## 備註

- 需要語音 + 麥克風權限。
- 針對會話金鑰 `main` 使用 `chat.send`。
- TTS 使用 ElevenLabs 串流 API，搭配 `ELEVENLABS_API_KEY`，並在 macOS/iOS/Android 上進行增量播放以降低延遲。
- `eleven_v3` 的 `stability` 會被驗證為 `0.0`、`0.5` 或 `1.0`；其他模型接受 `0..1`。
- 設定 `latency_tier` 時會驗證為 `0..4`。
- Android 支援 `pcm_16000`、`pcm_22050`、`pcm_24000` 和 `pcm_44100` 輸出格式，用於低延遲 AudioTrack 串流。

import en from "/components/footer/en.mdx";

<en />
