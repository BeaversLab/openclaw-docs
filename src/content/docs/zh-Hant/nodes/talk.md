---
summary: "Talk mode：跨本機 STT/TTS 和即時語音的連續語音對話"
read_when:
  - Implementing Talk mode on macOS/iOS/Android
  - Changing voice/TTS/interrupt behavior
title: "Talk 模式"
---

Talk mode 有兩種執行時形態：

- 原生 macOS/iOS/Android Talk 使用本機語音辨識、Gateway 聊天和 `talk.speak` TTS。節點會廣播 `talk` 功能並宣告它們支援的 `talk.*` 指令。
- 瀏覽器 Talk 使用 `talk.client.create` 進行用戶端擁有的 `webrtc` 和 `provider-websocket` 工作階段，或是使用 `talk.session.create` 進行 Gateway 擁有的 `gateway-relay` 工作階段。`managed-room` 是保留給 Gateway 移交和對講機房間使用的。
- 僅轉錄的用戶端使用 `talk.session.create({ mode: "transcription", transport: "gateway-relay", brain: "none" })`，然後當它們需要字幕或聽寫而不需要助理語音回應時，使用 `talk.session.appendAudio`、`talk.session.cancelTurn` 和 `talk.session.close`。

原生 Talk 是一個連續的語音對話迴圈：

1. 聆聽語音
2. 透過現用工作階段將轉錄傳送給模型
3. 等待回應
4. 透過設定的 Talk 提供者 (`talk.speak`) 朗讀出來

瀏覽器即時 Talk 透過 `talk.client.toolCall` 轉發提供者工具呼叫；瀏覽器用戶端不會直接呼叫 `chat.send` 進行即時諮詢。

僅轉錄的 Talk 會發出與即時和 STT/TTS 工作階段相同的通用 Talk 事件封包，但使用 `mode: "transcription"` 和 `brain: "none"`。這是用於字幕、聽寫和僅觀察的語音擷取；一次性上傳的語音備忘錄仍使用 media/audio 路徑。

## 行為 (macOS)

- 啟用 Talk mode 時會顯示 **常駐覆蓋層**。
- **聆聽 → 思考 → 說話** 階段轉換。
- 在 **短暫暫停** (靜音視窗) 時，會發送當前的轉錄內容。
- 回覆會 **寫入 WebChat** (與輸入相同)。
- **說話時插話** (預設開啟)：如果使用者在助理說話時開始說話，我們會停止播放並記錄插話時間戳記以供下一個提示使用。

## 回覆中的語音指令

助理可以在其回覆前加上 **單行 JSON** 來控制語音：

```json
{ "voice": "<voice-id>", "once": true }
```

規則：

- 僅第一行非空行。
- 未知的鍵會被忽略。
- `once: true` 僅適用於當前回覆。
- 如果沒有 `once`，該語音將成為 Talk 模式的新預設值。
- 在 TTS 播放之前會移除 JSON 行。

支援的鍵：

- `voice` / `voice_id` / `voiceId`
- `model` / `model_id` / `modelId`
- `speed`、`rate` (WPM)、`stability`、`similarity`、`style`、`speakerBoost`
- `seed`、`normalize`、`lang`、`output_format`、`latency_tier`
- `once`

## 組態 (`~/.openclaw/openclaw.json`)

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

預設值：

- `interruptOnSpeech`：true
- `silenceTimeoutMs`：若未設定，Talk 會在發送文字紀錄前保留平台預設的暫停視窗 (`700 ms on macOS and Android, 900 ms on iOS`)
- `provider`：選取使用中的 Talk 提供者。對於 macOS 本地播放路徑，請使用 `elevenlabs`、`mlx` 或 `system`。
- `providers.<provider>.voiceId`：對於 ElevenLabs，會回退到 `ELEVENLABS_VOICE_ID` / `SAG_VOICE_ID` (或當有可用的 API 金鑰時，使用第一個 ElevenLabs 語音)。
- `providers.elevenlabs.modelId`：若未設定，預設為 `eleven_v3`。
- `providers.mlx.modelId`：若未設定，預設為 `mlx-community/Soprano-80M-bf16`。
- `providers.elevenlabs.apiKey`：會回退到 `ELEVENLABS_API_KEY` (或可用的 gateway shell profile)。
- `consultThinkingLevel`：針對即時 `openclaw_agent_consult` 呼叫後台執行的完整 OpenClaw 代理程式的選用思考層級覆蓋。
- `consultFastMode`：針對即時 `openclaw_agent_consult` 呼叫的選用快速模式覆蓋。
- `realtime.provider`：選取活躍的瀏覽器/伺服器即時語音供應商。使用 `openai` 進行 WebRTC，使用 `google` 進行供應商 WebSocket，或透過 Gateway 中繼使用僅橋接供應商。
- `realtime.providers.<provider>` 儲存供應商擁有的即時設定。瀏覽器僅接收臨時或受限的會話憑證，從不接收標準 API 金鑰。
- `realtime.providers.openai.voice`：內建 OpenAI Realtime 語音 ID。目前的 `gpt-realtime-2` 語音有 `alloy`、`ash`、`ballad`、`coral`、`echo`、`sage`、`shimmer`、`verse`、`marin` 和 `cedar`；建議使用 `marin` 和 `cedar` 以獲得最佳品質。
- `realtime.brain`：`agent-consult` 透過 Gateway 原則路由即時工具呼叫；`direct-tools` 是僅限擁有者的相容性行為；`none` 用於轉錄或外部協調。
- `realtime.instructions`：將面向供應商的系統指令附加至 OpenClaw 的內建即時提示。使用它來設定語音風格和語調；OpenClaw 會保留預設的 `openclaw_agent_consult` 指引。
- `talk.catalog` 會公開每個供應商的有效模式、傳輸、腦策略、即時音訊格式和功能標誌，以便官方 Talk 用戶端可以避免不支援的組合。
- 串流轉錄供應商是透過 `talk.catalog.transcription` 發現的。目前的 Gateway 中繼使用 Voice Call 串流供應商設定，直到新增專用的 Talk 轉錄設定介面為止。
- `speechLocale`：iOS/macOS 上裝置端 Talk 語音辨識的選用 BCP 47 地區設定 ID。保留未設定以使用裝置預設值。
- `outputFormat`: 在 macOS/iOS 上預設為 `pcm_44100`，在 Android 上則為 `pcm_24000`（設定 `mp3_*` 以強制進行 MP3 串流）

## macOS 介面

- 選單列切換：**Talk**
- 設定分頁：**Talk Mode** 群組（語音 ID + 中斷切換）
- 覆蓋層：
  - **Listening**：雲朵隨麥克風音量脈動
  - **Thinking**：下沉動畫
  - **Speaking**：向外輻射的圓環
  - 點擊雲朵：停止說話
  - 點擊 X：退出 Talk 模式

## Android 介面

- Voice 分頁切換：**Talk**
- 手動 **Mic** 和 **Talk** 是互斥的執行時擷取模式。
- 當應用程式離開前景或使用者離開 Voice 分頁時，手動 Mic 會停止。
- Talk 模式會持續執行，直到被切換關閉或 Android 節點斷線，並在啟用時使用 Android 的麥克風前景服務類型。

## 註記

- 需要語音 + 麥克風權限。
- 原生 Talk 使用作用中的 Gateway 會話，僅在回應事件無法取得時才回退至歷史記錄輪詢。
- 瀏覽器即時 Talk 對於 `openclaw_agent_consult` 使用 `talk.client.toolCall`，而不是將 `chat.send` 暴露給提供者擁有的瀏覽器會話。
- 僅轉錄的 Talk 使用 `talk.session.create`、`talk.session.appendAudio`、`talk.session.cancelTurn` 和 `talk.session.close`；客戶端會訂閱 `talk.event` 以取得部分/最終轉錄更新。
- 閘道使用作用中的 Talk 提供者，透過 `talk.speak` 解析 Talk 播放。僅當該 RPC 無法使用時，Android 才會回退到本機系統 TTS。
- macOS 本機 MLX 播放在存在時會使用捆綁的 `openclaw-mlx-tts` 輔助程式，或是 `PATH` 上的可執行檔。在開發期間設定 `OPENCLAW_MLX_TTS_BIN` 以指向自訂輔助程式二進位檔。
- `eleven_v3` 的 `stability` 會被驗證為 `0.0`、`0.5` 或 `1.0`；其他模型接受 `0..1`。
- 當設定時，`latency_tier` 會被驗證為 `0..4`。
- Android 支援 `pcm_16000`、`pcm_22050`、`pcm_24000` 和 `pcm_44100` 輸出格式，用於低延遲 AudioTrack 串流。

## 相關

- [語音喚醒](/zh-Hant/nodes/voicewake)
- [音訊與語音註記](/zh-Hant/nodes/audio)
- [媒體理解](/zh-Hant/nodes/media-understanding)
