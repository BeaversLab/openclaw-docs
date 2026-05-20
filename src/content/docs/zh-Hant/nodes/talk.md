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
- Android Talk 可以選擇使用 `talk.realtime.mode: "realtime"` 和 `talk.realtime.transport: "gateway-relay"` 來參與 Gateway 所有的即時轉發會話。否則，它會繼續使用原生語音辨識、Gateway 聊天和 `talk.speak`。
- 僅轉錄客戶端在需要字幕或聽寫而不需要助理語音回應時，會使用 `talk.session.create({ mode: "transcription", transport: "gateway-relay", brain: "none" })`，然後使用 `talk.session.appendAudio`、`talk.session.cancelTurn` 和 `talk.session.close`。

原生 Talk 是一個連續的語音對話迴圈：

1. 聆聽語音
2. 透過啟用的會話將文字記錄發送給模型
3. 等待回應
4. 透過設定的 Talk 提供者 (`talk.speak`) 播放語音

瀏覽器即時 Talk 透過 `talk.client.toolCall` 轉發提供者工具呼叫；瀏覽器客戶端不會為了即時諮詢直接呼叫 `chat.send`。

僅轉錄 Talk 會發出與即時和 STT/TTS 會話相同的通用 Talk 事件封套，但使用 `mode: "transcription"` 和 `brain: "none"`。這是用於字幕、聽寫和僅觀察的語音擷取；一次性上傳的語音備忘錄仍使用 media/audio 路徑。

## 行為

- 啟用 Talk 模式時**始終顯示覆蓋層**。
- **聆聽 → 思考 → 說話** 階段轉換。
- 在**短暫暫停**（靜音視窗）時，發送當前的文字記錄。
- 回覆會**寫入 WebChat**（與輸入相同）。
- **語音中斷**（預設開啟）：如果使用者在助理說話時開始說話，我們會停止播放並記錄中斷時間戳記以供下一個提示使用。

## 回覆中的語音指令

助理可以在其回覆前加上**單行 JSON** 來控制語音：

```json
{ "voice": "<voice-id>", "once": true }
```

規則：

- 僅限第一個非空行。
- 未知的金鑰會被忽略。
- `once: true` 僅適用於當前回覆。
- 如果沒有 `once`，語音將成為 Talk 模式的新預設值。
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

- `interruptOnSpeech`: true
- `silenceTimeoutMs`: 當未設定時，Talk 在發送轉錄文字之前會保留平台預設的暫停視窗 (`700 ms on macOS and Android, 900 ms on iOS`)
- `provider`: 選擇現用的 Talk 提供者。使用 `elevenlabs`、`mlx` 或 `system` 作為 macOS 本機播放路徑。
- `providers.<provider>.voiceId`: 退回至 `ELEVENLABS_VOICE_ID` / `SAG_VOICE_ID` 用於 ElevenLabs（或當有可用 API 金鑰時的第一個 ElevenLabs 語音）。
- `providers.elevenlabs.modelId`: 當未設定時，預設為 `eleven_v3`。
- `providers.mlx.modelId`: 當未設定時，預設為 `mlx-community/Soprano-80M-bf16`。
- `providers.elevenlabs.apiKey`: 退回至 `ELEVENLABS_API_KEY`（或若有可用的 Gateway shell 設定檔）。
- `consultThinkingLevel`: 針對即時 `openclaw_agent_consult` 呼叫後方的完整 OpenClaw 代理程式執行，可選擇性地覆寫思考層級。
- `consultFastMode`: 針對即時 `openclaw_agent_consult` 呼叫，可選擇性地覆寫快速模式。
- `realtime.provider`: 選擇現用的瀏覽器/伺服器即時語音提供者。使用 `openai` 作為 WebRTC，`google` 作為提供者 WebSocket，或透過 Gateway 中繼使用僅橋接提供者。
- `realtime.providers.<provider>` 儲存提供者擁有的即時設定。瀏覽器僅接收暫時或受限制的會話憑證，絕不會收到標準的 API 金鑰。
- `realtime.providers.openai.voice`：內建 OpenAI Realtime 語音 ID。目前的 `gpt-realtime-2` 語音有 `alloy`、`ash`、`ballad`、`coral`、`echo`、`sage`、`shimmer`、`verse`、`marin` 和 `cedar`；建議使用 `marin` 和 `cedar` 以獲得最佳品質。
- `realtime.transport`：`webrtc` 和 `provider-websocket` 是瀏覽器即時傳輸。僅當此項為 `gateway-relay` 時，Android 才會使用即時中繼；否則 Android Talk 使用其原生的 STT/TTS 迴圈。
- `realtime.brain`：`agent-consult` 透過 Gateway 原則路由即時工具呼叫；`direct-tools` 僅限擁有者的相容性行為；`none` 用於轉錄或外部協調。
- `realtime.instructions`：將提供者面向的系統指令附加至 OpenClaw 的內建即時提示。使用它來設定語音風格和語氣；OpenClaw 會保留預設的 `openclaw_agent_consult` 指引。
- `talk.catalog` 會公開每個提供者的有效模式、傳輸、大腦策略、即時音訊格式和功能標誌，以便第一方 Talk 用戶端可以避免不支援的組合。
- 串流轉錄提供者是透過 `talk.catalog.transcription` 發現的。目前的 Gateway 中繼使用 Voice Call 串流提供者設定，直到新增專用的 Talk 轉錄設定介面為止。
- `speechLocale`：iOS/macOS 上裝置端 Talk 語音辨識的可選 BCP 47 地區 ID。保持未設定以使用裝置預設值。
- `outputFormat`：在 macOS/iOS 上預設為 `pcm_44100`，在 Android 上預設為 `pcm_24000`（設定 `mp3_*` 以強制進行 MP3 串流）。

## macOS UI

- 選單列切換：**Talk**
- 設定標籤頁：**Talk Mode** 群組（語音 ID + 插斷切換）
- 覆蓋層：
  - **聆聽**：雲端根據麥克風音量脈動
  - **思考**：下沉動畫
  - **說話**：向外擴散的環狀波紋
  - 點擊雲端：停止說話
  - 點擊 X：退出交談模式

## Android 介面

- 語音分頁切換：**交談**
- 手動 **麥克風** 與 **交談** 是互斥的執行時擷取模式。
- 當應用程式離開前景或使用者離開語音分頁時，手動麥克風會停止。
- 交談模式會持續執行，直到切換關閉或 Android 節點斷線，並在啟用期間使用 Android 的麥克風前景服務類型。

## 備註

- 需要語音 + 麥克風權限。
- 原生交談使用作用中的 Gateway 工作階段，並僅在無回應事件時回退至輪詢歷史記錄。
- 瀏覽器即時交談對 `openclaw_agent_consult` 使用 `talk.client.toolCall`，而不是向提供者擁有的瀏覽器工作階段公開 `chat.send`。
- 僅轉錄的交談使用 `talk.session.create`、`talk.session.appendAudio`、`talk.session.cancelTurn` 和 `talk.session.close`；用戶端訂閱 `talk.event` 以取得部分/最終轉錄更新。
- 閘道會透過使用作用中交談提供者的 `talk.speak` 解析交談播放。Android 僅在該 RPC 不可用時回退至本機系統 TTS。
- macOS 本機 MLX 播放會在可用時使用隨附的 `openclaw-mlx-tts` 助手程式，或是 `PATH` 上的可執行檔。在開發期間設定 `OPENCLAW_MLX_TTS_BIN` 以指向自訂助手程式二進位檔。
- `eleven_v3` 的 `stability` 會驗證為 `0.0`、`0.5` 或 `1.0`；其他模型則接受 `0..1`。
- 設定時，`latency_tier` 會驗證為 `0..4`。
- Android 支援 `pcm_16000`、`pcm_22050`、`pcm_24000` 和 `pcm_44100` 輸出格式，用於低延遲 AudioTrack 串流。

## 相關

- [語音喚醒](/zh-Hant/nodes/voicewake)
- [音訊與語音備註](/zh-Hant/nodes/audio)
- [媒體理解](/zh-Hant/nodes/media-understanding)
