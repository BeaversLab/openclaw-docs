---
summary: "Talk 模式：與設定的 TTS 提供者進行連續語音對話"
read_when:
  - Implementing Talk mode on macOS/iOS/Android
  - Changing voice/TTS/interrupt behavior
title: "Talk 模式"
---

Talk 模式是一個連續的語音對話迴圈：

1. 聆聽語音
2. 將逐字稿發送至模型（主會話，chat.send）
3. 等待回應
4. 透過設定的 Talk 提供者（`talk.speak`）進行語音播放

## 行為 (macOS)

- 啟用 Talk 模式時**顯示持續的覆蓋層**。
- **聆聽 → 思考 → 說話**階段轉換。
- 在**短暫暫停**（靜音視窗）時，發送當前的逐字稿。
- 回應會**寫入 WebChat**（與輸入相同）。
- **語音中斷**（預設開啟）：如果使用者在助理說話時開始說話，我們會停止播放並記錄中斷時間戳記供下一次提示使用。

## 回應中的語音指令

助理可以在其回應前加上**單行 JSON** 來控制語音：

```json
{ "voice": "<voice-id>", "once": true }
```

規則：

- 僅限第一個非空行。
- 未知的鍵會被忽略。
- `once: true` 僅套用於當前回應。
- 若無 `once`，該語音將成為 Talk 模式的新預設值。
- JSON 行會在 TTS 播放前被移除。

支援的鍵：

- `voice` / `voice_id` / `voiceId`
- `model` / `model_id` / `modelId`
- `speed`, `rate` (WPM), `stability`, `similarity`, `style`, `speakerBoost`
- `seed`, `normalize`, `lang`, `output_format`, `latency_tier`
- `once`

## 設定 (`~/.openclaw/openclaw.json`)

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

預設值：

- `interruptOnSpeech`: true
- `silenceTimeoutMs`: 未設定時，Talk 會保持平台預設的暫停視窗再發送逐字稿 (`700 ms on macOS and Android, 900 ms on iOS`)
- `provider`：選擇現用的 Talk 提供者。請使用 `elevenlabs`、`mlx` 或 `system` 進行 macOS 本地播放路徑。
- `providers.<provider>.voiceId`：針對 ElevenLabs 回退至 `ELEVENLABS_VOICE_ID` / `SAG_VOICE_ID`（或是當有 API 金鑰時的第一個 ElevenLabs 語音）。
- `providers.elevenlabs.modelId`：若未設定則預設為 `eleven_v3`。
- `providers.mlx.modelId`：若未設定則預設為 `mlx-community/Soprano-80M-bf16`。
- `providers.elevenlabs.apiKey`：回退至 `ELEVENLABS_API_KEY`（或是可用的 gateway shell profile）。
- `speechLocale`：iOS/macOS 上裝置端 Talk 語音辨識的選用 BCP 47 地區 ID。留空以使用裝置預設值。
- `outputFormat`：在 macOS/iOS 上預設為 `pcm_44100`，在 Android 上預設為 `pcm_24000`（設定 `mp3_*` 以強制 MP3 串流）

## macOS UI

- 選單列切換：**Talk**
- Config 分頁：**Talk Mode** 群組（語音 ID + 中斷切換）
- 覆蓋層：
  - **Listening**：雲朵隨麥克風音量脈動
  - **Thinking**：下沉動畫
  - **Speaking**：擴散圓環
  - 點擊雲朵：停止說話
  - 點擊 X：離開 Talk 模式

## Android UI

- Voice 分頁切換：**Talk**
- 手動 **Mic** 與 **Talk** 是互斥的執行時擷取模式。
- 當 App 離開前景或使用者離開 Voice 分頁時，手動 Mic 會停止。
- Talk 模式會持續執行，直到被切換關閉或 Android 節點斷線，並在啟用時使用 Android 的麥克風前景服務類型。

## 備註

- 需要語音 + 麥克風權限。
- 針對 session key `main` 使用 `chat.send`。
- Gateway 使用現用的 Talk 提供者透過 `talk.speak` 解析 Talk 播放。僅當該 RPC 不可用時，Android 才會回退至本機系統 TTS。
- macOS 本機 MLX 播放使用內建的 `openclaw-mlx-tts` helper（如果存在），或是 `PATH` 上的可執行檔。在開發期間設定 `OPENCLAW_MLX_TTS_BIN` 以指向自訂 helper 二進位檔。
- `stability` 用於 `eleven_v3` 時，會驗證是否為 `0.0`、`0.5` 或 `1.0`；其他模型接受 `0..1`。
- 當設定 `latency_tier` 時，會驗證其為 `0..4`。
- Android 支援 `pcm_16000`、`pcm_22050`、`pcm_24000` 和 `pcm_44100` 輸出格式，用於低延遲 AudioTrack 串流。

## 相關

- [語音喚醒](/zh-Hant/nodes/voicewake)
- [音訊與語音備註](/zh-Hant/nodes/audio)
- [媒體理解](/zh-Hant/nodes/media-understanding)
