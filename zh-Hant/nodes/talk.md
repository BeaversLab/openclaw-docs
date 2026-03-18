---
summary: "對話模式：使用 ElevenLabs TTS 進行連續語音對話"
read_when:
  - Implementing Talk mode on macOS/iOS/Android
  - Changing voice/TTS/interrupt behavior
title: "對話模式"
---

# 對話模式

對話模式是一個連續的語音對話循環：

1. 聆聽語音
2. 將逐字稿發送給模型（主會話，chat.send）
3. 等待回應
4. 透過 ElevenLabs 播放（串流播放）

## 行為

- 啟用對話模式時**始終顯示疊加層**。
- **聆聽 → 思考 → 說話**階段轉換。
- 在**短暫暫停**（靜音視窗）時，發送當前的逐字稿。
- 回覆會**寫入 WebChat**（與輸入相同）。
- **語音插話**（預設開啟）：如果使用者在說話者說話時開始說話，我們會停止播放並記錄插話時間戳記供下一個提示使用。

## 回覆中的語音指令

助手可能會在其回覆前加上**單行 JSON** 來控制語音：

```json
{ "voice": "<voice-id>", "once": true }
```

規則：

- 僅限第一個非空行。
- 未知的鍵將被忽略。
- `once: true` 僅適用於當前回覆。
- 如果沒有 `once`，該語音將成為對話模式的新預設值。
- JSON 行會在 TTS 播放前被移除。

支援的鍵：

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
- `silenceTimeoutMs`: 未設定時，Talk 會在發送逐字稿之前保留平台預設的暫停視窗（`700 ms on macOS and Android, 900 ms on iOS`）
- `voiceId`: 如果可用，會回退至 `ELEVENLABS_VOICE_ID` / `SAG_VOICE_ID`（或第一個 ElevenLabs 語音）
- `modelId`: 未設定時預設為 `eleven_v3`
- `apiKey`: 後備使用 `ELEVENLABS_API_KEY`（或可用的 gateway shell profile）
- `outputFormat`: 在 macOS/iOS 上預設為 `pcm_44100`，在 Android 上預設為 `pcm_24000`（設定 `mp3_*` 以強制使用 MP3 串流）

## macOS 介面

- 功能表列切換：**對談**
- 設定分頁：**對談模式** 群組（語音 ID + 中斷切換）
- 覆蓋層：
  - **聆聽中**：雲端隨麥克風音量脈動
  - **思考中**：下沉動畫
  - **說話中**：向外擴散的圓環
  - 點擊雲端：停止說話
  - 點擊 X：退出對談模式

## 註記

- 需要語音 + 麥克風權限。
- 針對工作階段金鑰 `main` 使用 `chat.send`。
- TTS 在 macOS/iOS/Android 上使用 ElevenLabs 串流 API 搭配 `ELEVENLABS_API_KEY` 並進行漸進式播放以降低延遲。
- `eleven_v3` 的 `stability` 會驗證為 `0.0`、`0.5` 或 `1.0`；其他模型接受 `0..1`。
- 設定時，`latency_tier` 會驗證為 `0..4`。
- Android 支援 `pcm_16000`、`pcm_22050`、`pcm_24000` 和 `pcm_44100` 輸出格式，用於低延遲 AudioTrack 串流。

import footerZhHant from "/components/footer/zh-Hant.mdx";

<footerZhHant />
